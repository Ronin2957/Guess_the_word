import { 
  elements, 
  showScreen, 
  showToast, 
  buildColorPalette,
  clearAllOverlays
} from './ui.js';
import { 
  getSavedOrRandomAvatar, 
  saveAvatarToStorage, 
  getRandomAvatarOptions, 
  SKIN_COLORS, 
  BG_COLORS, 
  STYLE_OPTIONS,
  EYES_OPTIONS, 
  MOUTH_OPTIONS, 
  ACCESSORY_OPTIONS,
  generateAvatarSVG
} from './avatar.js';
import { GameCanvas } from './canvas.js';
import { initSocketListeners } from './socket.js';
import { copyToClipboard } from './utils.js';

class GameApp {
  constructor() {
    this.socket = null;
    this.canvas = null;
    
    // Client State Variables
    this.myId = '';
    this.roomCode = '';
    this.hostId = '';
    this.players = [];
    this.settings = {};
    this.gameState = 'home'; // 'home' | 'lobby' | 'game' (or turn phases)
    this.currentDrawerId = null;
    
    // Avatar customization tracking
    this.myAvatar = getSavedOrRandomAvatar();
    
    // Local countdown timers
    this.timeRemaining = 0;
    this.timerInterval = null;

    this.init();
  }

  init() {
    // 1. Preload local user profile settings
    const savedName = localStorage.getItem('gamedraw_username') || '';
    elements.inputUsername.value = savedName;
    this.renderAvatarPreview();

    // 2. Setup Canvas instance
    const canvasEl = document.getElementById('game-canvas');
    this.canvas = new GameCanvas(canvasEl);

    // 3. Connect to socket server
    this.socket = io();
    
    // Inject socket to canvas with role resolver callback
    this.canvas.setSocket(this.socket, () => {
      return (this.myId === this.currentDrawerId) ? 'drawer' : 'guesser';
    });

    // 4. Initialize socket event listeners
    initSocketListeners(this.socket, this);

    // 5. Build canvas color selectors
    buildColorPalette((color) => {
      this.canvas.setColor(color);
    });

    // 6. Bind interactive listeners
    this.bindEvents();
  }

  renderAvatarPreview() {
    elements.avatarPreview.innerHTML = generateAvatarSVG(this.myAvatar);
    
    // Update labels in option row selectors
    this.updateCustomizerLabel('skin', SKIN_COLORS.indexOf(this.myAvatar.skin) + 1);
    this.updateCustomizerLabel('bg', BG_COLORS.indexOf(this.myAvatar.bg) + 1);
    
    const eyeIndex = EYES_OPTIONS.findIndex(e => e.id === this.myAvatar.eyes);
    this.updateCustomizerLabel('eyes', EYES_OPTIONS[eyeIndex >= 0 ? eyeIndex : 0].name);

    const mouthIndex = MOUTH_OPTIONS.findIndex(m => m.id === this.myAvatar.mouth);
    this.updateCustomizerLabel('mouth', MOUTH_OPTIONS[mouthIndex >= 0 ? mouthIndex : 0].name);

    const styleIndex = STYLE_OPTIONS.findIndex(s => s.id === this.myAvatar.style);
    this.updateCustomizerLabel('style', STYLE_OPTIONS[styleIndex >= 0 ? styleIndex : 0].name);

    const accessoryIndex = ACCESSORY_OPTIONS.findIndex(a => a.id === this.myAvatar.accessory);
    this.updateCustomizerLabel('accessory', ACCESSORY_OPTIONS[accessoryIndex >= 0 ? accessoryIndex : 0].name);
  }

  updateCustomizerLabel(optionKey, labelText) {
    const selector = document.querySelector(`.arrow-select[data-option="${optionKey}"]`);
    if (selector) {
      const label = selector.querySelector('.option-label');
      label.innerText = typeof labelText === 'number' ? `Color ${labelText}` : labelText;
    }
  }

  bindEvents() {
    // A. Avatar Customizer prev/next buttons
    document.querySelectorAll('.arrow-select').forEach(selector => {
      const optionKey = selector.getAttribute('data-option');
      const prevBtn = selector.querySelector('.prev-btn');
      const nextBtn = selector.querySelector('.next-btn');

      prevBtn.addEventListener('click', () => this.shiftAvatarOption(optionKey, -1));
      nextBtn.addEventListener('click', () => this.shiftAvatarOption(optionKey, 1));
    });

    // B. Randomize Avatar
    elements.btnRandomizeAvatar.addEventListener('click', () => {
      this.myAvatar = getRandomAvatarOptions();
      saveAvatarToStorage(this.myAvatar);
      this.renderAvatarPreview();
    });

    // C. Create Room
    elements.btnCreateRoom.addEventListener('click', () => {
      const username = elements.inputUsername.value.trim();
      if (!username) return showToast('Please enter a username.', 'error');
      
      localStorage.setItem('gamedraw_username', username);
      saveAvatarToStorage(this.myAvatar);

      this.socket.emit('create_room', { username, avatar: this.myAvatar });
    });

    // D. Join Room
    elements.btnJoinRoom.addEventListener('click', () => {
      const username = elements.inputUsername.value.trim();
      const roomCode = elements.inputRoomCode.value.trim().toUpperCase();
      
      if (!username) return showToast('Please enter a username.', 'error');
      if (roomCode.length !== 6) return showToast('Room code must be exactly 6 letters.', 'error');
      
      localStorage.setItem('gamedraw_username', username);
      saveAvatarToStorage(this.myAvatar);

      this.socket.emit('join_room', { roomCode, username, avatar: this.myAvatar });
    });

    // E. Lobby actions
    elements.btnCopyCode.addEventListener('click', () => {
      copyToClipboard(this.roomCode, 
        () => showToast('Room code copied to clipboard!', 'success'),
        () => showToast('Failed to copy room code.', 'error')
      );
    });

    elements.btnLeaveLobby.addEventListener('click', () => {
      this.resetToHome();
    });

    elements.btnToggleReady.addEventListener('click', () => {
      const me = this.players.find(p => p.id === this.myId);
      const isReady = me ? me.isReady : false;
      elements.btnToggleReady.innerText = isReady ? 'Ready Up Check ⬜' : 'Ready Up Check ✅';
      this.socket.emit('toggle_ready');
    });

    elements.btnStartGame.addEventListener('click', () => {
      if (this.players.length < 2) {
        return showToast('You need at least 2 players to start.', 'error');
      }
      this.socket.emit('start_game');
    });

    // F. Listen for settings updates dynamically (Host only)
    const handleSettingsInput = () => {
      if (this.myId !== this.hostId) return;

      const maxPlayers = parseInt(elements.setMaxPlayers.value);
      const rounds = parseInt(elements.setRounds.value);
      const drawTime = parseInt(elements.setDrawTime.value);
      const maxHints = parseInt(elements.setMaxHints.value);
      const wordMode = elements.setWordMode.value;
      const customWordsText = elements.setCustomWords.value;

      // Sync WordMode text visibility locally first
      if (wordMode === 'default') {
        elements.customWordsSection.classList.add('hidden');
      } else {
        elements.customWordsSection.classList.remove('hidden');
      }

      this.socket.emit('update_settings', {
        maxPlayers,
        rounds,
        drawTime,
        maxHints,
        wordMode,
        customWords: customWordsText
      });
    };

    elements.settingsForm.querySelectorAll('.setting-input').forEach(input => {
      input.addEventListener('change', handleSettingsInput);
    });
    // For custom words textarea, update on change focus/edit complete
    elements.setCustomWords.addEventListener('change', handleSettingsInput);

    // G. Canvas Controls (Drawing tools)
    elements.toolFill.addEventListener('click', () => {
      const isFill = !this.canvas.isFillMode;
      this.canvas.setFillMode(isFill);
      elements.toolFill.classList.toggle('active', isFill);
      // Deactivate eraser when enabling fill
      if (isFill) {
        elements.toolEraser.classList.remove('active');
      }
    });

    elements.toolEraser.addEventListener('click', () => {
      const isEraser = !this.canvas.isEraser;
      this.canvas.setEraserMode(isEraser);
      elements.toolEraser.classList.toggle('active', isEraser);
      // Deactivate fill when enabling eraser
      if (isEraser) {
        elements.toolFill.classList.remove('active');
      }
    });

    elements.toolUndo.addEventListener('click', () => {
      this.socket.emit('undo_stroke');
    });

    elements.toolClear.addEventListener('click', () => {
      this.socket.emit('clear_canvas');
    });

    // Canvas brush size buttons
    document.querySelectorAll('.size-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const sizeVal = parseInt(btn.getAttribute('data-size'));
        this.canvas.setBrushSize(sizeVal);
      });
    });

    // H. Chat Messaging Form Submissions
    elements.chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const msg = elements.chatInput.value.trim();
      if (!msg) return;

      this.socket.emit('send_message', msg);
      elements.chatInput.value = '';
      
      // Auto focus back to input unless they just guessed correctly
      const me = this.players.find(p => p.id === this.myId);
      if (me && !me.hasGuessed && this.myId !== this.currentDrawerId) {
        elements.chatInput.focus();
      }
    });
  }

  shiftAvatarOption(optionKey, step) {
    let list;
    if (optionKey === 'skin') list = SKIN_COLORS;
    else if (optionKey === 'bg') list = BG_COLORS;
    else if (optionKey === 'style') list = STYLE_OPTIONS;
    else if (optionKey === 'eyes') list = EYES_OPTIONS;
    else if (optionKey === 'mouth') list = MOUTH_OPTIONS;
    else if (optionKey === 'accessory') list = ACCESSORY_OPTIONS;

    let currentVal = this.myAvatar[optionKey];
    let index = list.findIndex(item => (typeof item === 'string' ? item === currentVal : item.id === currentVal));
    
    // Apply shift with rollover
    index = (index + step + list.length) % list.length;
    
    const chosen = list[index];
    this.myAvatar[optionKey] = (typeof chosen === 'string' ? chosen : chosen.id);
    
    saveAvatarToStorage(this.myAvatar);
    this.renderAvatarPreview();
  }

  updateCanvasRoleState() {
    const isMeDrawer = (this.myId === this.currentDrawerId);
    
    if (isMeDrawer && this.gameState === 'drawing') {
      elements.canvasToolbar.classList.remove('hidden');
      elements.canvasToolbar.style.pointerEvents = 'auto';
    } else {
      elements.canvasToolbar.classList.add('hidden');
      elements.canvasToolbar.style.pointerEvents = 'none';
      
      // Disable drawing eraser/fill overlay states
      this.canvas.setEraserMode(false);
      this.canvas.setFillMode(false);
      elements.toolEraser.classList.remove('active');
      elements.toolFill.classList.remove('active');
    }
    
    // Refresh visual boundaries on role shifts
    if (this.canvas) {
      setTimeout(() => this.canvas.resizeCanvas(), 50);
    }
  }

  startLocalTimer(durationSeconds, onTickCallback) {
    this.stopLocalTimer();
    this.timeRemaining = durationSeconds;
    
    if (onTickCallback) onTickCallback(this.timeRemaining);

    this.timerInterval = setInterval(() => {
      this.timeRemaining--;
      if (onTickCallback) onTickCallback(this.timeRemaining);

      if (this.timeRemaining <= 0) {
        this.stopLocalTimer();
      }
    }, 1000);
  }

  stopLocalTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  resetToHome() {
    this.stopLocalTimer();
    clearAllOverlays();
    
    // Disconnect and reconnect socket to clean channel states
    this.socket.disconnect();
    this.socket.connect();
    
    this.roomCode = '';
    this.hostId = '';
    this.players = [];
    this.currentDrawerId = null;
    this.gameState = 'home';
    
    elements.btnToggleReady.innerText = 'Ready Up Check ⬜';
    elements.inputRoomCode.value = '';
    elements.chatMessagesLog.innerHTML = '';
    
    if (this.canvas) this.canvas.clear();
    
    showScreen('home');
  }
}

// Instantiate App
window.addEventListener('DOMContentLoaded', () => {
  window.app = new GameApp();
});
