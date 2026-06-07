import { escapeHtml } from './utils.js';
import { generateAvatarSVG } from './avatar.js';

// Caching DOM Elements
export const elements = {
  // Screens
  screens: {
    home: document.getElementById('screen-home'),
    lobby: document.getElementById('screen-lobby'),
    game: document.getElementById('screen-game')
  },
  
  // Home Screen
  inputUsername: document.getElementById('input-username'),
  inputRoomCode: document.getElementById('input-room-code'),
  btnCreateRoom: document.getElementById('btn-create-room'),
  btnJoinRoom: document.getElementById('btn-join-room'),
  btnRandomizeAvatar: document.getElementById('btn-randomize-avatar'),
  avatarPreview: document.getElementById('home-avatar-preview'),
  
  // Lobby Screen
  lobbyRoomCode: document.getElementById('lobby-room-code'),
  btnCopyCode: document.getElementById('btn-copy-code'),
  btnCopyLink: document.getElementById('btn-copy-link'),
  lobbyPlayerCount: document.getElementById('lobby-player-count'),
  lobbyPlayersGrid: document.getElementById('lobby-players-grid'),
  btnLeaveLobby: document.getElementById('btn-leave-lobby'),
  btnStartGame: document.getElementById('btn-start-game'),
  btnToggleReady: document.getElementById('btn-toggle-ready'),
  hostControlsBlock: document.getElementById('host-start-block'),
  playerControlsBlock: document.getElementById('player-ready-block'),
  settingsForm: document.getElementById('settings-form'),
  settingsReadOnlyMsg: document.getElementById('settings-read-only-msg'),
  
  // Settings Inputs
  setMaxPlayers: document.getElementById('set-max-players'),
  setRounds: document.getElementById('set-rounds'),
  setDrawTime: document.getElementById('set-draw-time'),
  setMaxHints: document.getElementById('set-max-hints'),
  setWordMode: document.getElementById('set-word-mode'),
  setCustomWords: document.getElementById('set-custom-words'),
  customWordsSection: document.getElementById('custom-words-section'),
  
  // Game Screen Header
  gameRoundInfo: document.getElementById('game-round-info'),
  gameWordLetters: document.getElementById('game-word-letters'),
  gameWordHintMeta: document.getElementById('game-word-hint-meta'),
  timerRingProgress: document.getElementById('timer-ring-progress'),
  timerText: document.getElementById('timer-text'),
  
  // Game Screen Panels
  gameLeaderboardList: document.getElementById('game-leaderboard-list'),
  canvasToolbar: document.getElementById('canvas-toolbar'),
  canvasColorPalette: document.getElementById('canvas-color-palette'),
  toolFill: document.getElementById('tool-fill'),
  toolEraser: document.getElementById('tool-eraser'),
  toolUndo: document.getElementById('tool-undo'),
  toolClear: document.getElementById('tool-clear'),
  chatMessagesLog: document.getElementById('chat-messages-log'),
  chatForm: document.getElementById('chat-form'),
  chatInput: document.getElementById('chat-input'),
  btnChatSend: document.getElementById('btn-chat-send'),
  
  // Overlays
  overlayWordPicker: document.getElementById('overlay-word-picker'),
  wordPickerCountdown: document.getElementById('word-picker-countdown'),
  wordChoicesGrid: document.getElementById('word-choices-grid'),
  
  overlayChoosingWait: document.getElementById('overlay-choosing-wait'),
  waitOverlayTitle: document.getElementById('wait-overlay-title'),
  
  overlayTurnReveal: document.getElementById('overlay-turn-reveal'),
  revealTitleStatus: document.getElementById('reveal-title-status'),
  revealSecretWord: document.getElementById('reveal-secret-word'),
  revealScoresList: document.getElementById('reveal-scores-list'),
  
  overlayRoundEnd: document.getElementById('overlay-round-end'),
  roundScoreboardDisplay: document.getElementById('round-scoreboard-display'),
  
  overlayGameOver: document.getElementById('overlay-game-over'),
  gameOverCountdown: document.getElementById('game-over-countdown'),
  gameOverRanksList: document.getElementById('game-over-ranks-list'),
  podiumName1: document.getElementById('podium-name-1'),
  podiumScore1: document.getElementById('podium-score-1'),
  podiumAvatar1: document.getElementById('podium-avatar-1'),
  podiumName2: document.getElementById('podium-name-2'),
  podiumScore2: document.getElementById('podium-score-2'),
  podiumAvatar2: document.getElementById('podium-avatar-2'),
  podiumName3: document.getElementById('podium-name-3'),
  podiumScore3: document.getElementById('podium-score-3'),
  podiumAvatar3: document.getElementById('podium-avatar-3'),

  // Notifications
  toastContainer: document.getElementById('toast-container')
};

// Available color options for Canvas brush
export const PALETTE_COLORS = [
  '#000000', '#ffffff', '#64748b', '#cbd5e1', 
  '#ef4444', '#f87171', '#f97316', '#ffedd5',
  '#f59e0b', '#fef08a', '#10b981', '#a7f3d0',
  '#06b6d4', '#afefee', '#3b82f6', '#bfdbfe',
  '#6366f1', '#c7d2fe', '#8b5cf6', '#ddd6fe',
  '#d946ef', '#f5d0fe', '#ec4899', '#fbcfe8'
];

/**
 * Transitions view between Screens
 * @param {string} targetScreen 'home' | 'lobby' | 'game'
 */
export function showScreen(targetScreen) {
  Object.keys(elements.screens).forEach(key => {
    const screen = elements.screens[key];
    // Remove any inline display overrides so CSS classes control layout
    screen.style.removeProperty('display');
    if (key === targetScreen) {
      screen.classList.add('active');
    } else {
      screen.classList.remove('active');
    }
  });
}

/**
 * Shows a temporary floating toast notification alert
 * @param {string} message 
 * @param {string} type 'normal' | 'error' | 'success'
 */
export function showToast(message, type = 'normal') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerText = message;
  
  elements.toastContainer.appendChild(toast);
  
  // Animate out and destroy
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(120%)';
    toast.style.transition = 'all 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/**
 * Renders the Home Screen customizable avatar preview
 * @param {object} avatarOptions 
 */
export function renderHomeAvatar(avatarOptions) {
  elements.avatarPreview.innerHTML = generateAvatarSVG(avatarOptions);
}

/**
 * Closes all active modal dialog overlays
 */
export function clearAllOverlays() {
  elements.overlayWordPicker.classList.remove('active');
  elements.overlayChoosingWait.classList.remove('active');
  elements.overlayTurnReveal.classList.remove('active');
  elements.overlayRoundEnd.classList.remove('active');
  elements.overlayGameOver.classList.remove('active');
}

/**
 * Renders the lobby player cards and enables host moderation buttons
 * @param {Array} players 
 * @param {string} myId 
 * @param {string} hostId 
 * @param {function} onKick 
 * @param {function} onMute 
 * @param {function} onTransferHost 
 */
export function renderLobbyPlayers(players, myId, hostId, onKick, onMute, onTransferHost) {
  elements.lobbyPlayerCount.innerText = players.length;
  elements.lobbyPlayersGrid.innerHTML = '';
  
  const isMeHost = (myId === hostId);

  players.forEach(player => {
    const isMe = (player.id === myId);
    const isHost = (player.id === hostId);

    const card = document.createElement('div');
    card.className = `player-card ${isMe ? 'is-me' : ''}`;
    
    // Create inner DOM
    let cardContent = `
      <div class="avatar-box">${generateAvatarSVG(player.avatar)}</div>
      <div class="username">${escapeHtml(player.username)}</div>
    `;

    // Role tags
    if (isHost) {
      cardContent += `<span class="badge-role">👑 HOST</span>`;
    }
    
    // Ready light indicator
    cardContent += `<span class="badge-ready ${player.isReady ? 'ready' : 'not-ready'}"></span>`;

    // Host moderation menu overlay (only show for others if I am host)
    if (isMeHost && !isMe) {
      cardContent += `
        <div class="moderation-overlay">
          <button class="btn-mod btn-mod-kick" data-action="kick" data-id="${player.id}">Kick 🚫</button>
          <button class="btn-mod btn-mod-mute" data-action="mute" data-id="${player.id}">
            ${player.isMuted ? 'Unmute 🔊' : 'Mute 🔇'}
          </button>
          <button class="btn-mod btn-mod-host" data-action="host" data-id="${player.id}">Make Host 👑</button>
        </div>
      `;
    }

    card.innerHTML = cardContent;
    elements.lobbyPlayersGrid.appendChild(card);
  });

  // Bind actions
  if (isMeHost) {
    elements.lobbyPlayersGrid.querySelectorAll('.btn-mod').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.target.getAttribute('data-action');
        const targetId = e.target.getAttribute('data-id');
        if (action === 'kick') onKick(targetId);
        else if (action === 'mute') onMute(targetId);
        else if (action === 'host') onTransferHost(targetId);
      });
    });
  }
}

/**
 * Configure Settings inputs based on user role (host vs guest)
 * @param {object} settings 
 * @param {boolean} isHost 
 */
export function updateLobbySettingsUI(settings, isHost) {
  // Update setting field values
  elements.setMaxPlayers.value = settings.maxPlayers;
  elements.setRounds.value = settings.rounds;
  elements.setDrawTime.value = settings.drawTime;
  elements.setMaxHints.value = settings.maxHints;
  elements.setWordMode.value = settings.wordMode;
  elements.setCustomWords.value = (settings.customWords || []).join('\n');

  // Toggle word text area visibility
  if (settings.wordMode === 'default') {
    elements.customWordsSection.classList.add('hidden');
  } else {
    elements.customWordsSection.classList.remove('hidden');
  }

  // Toggle disable flags
  const inputs = elements.settingsForm.querySelectorAll('.setting-input');
  inputs.forEach(input => {
    input.disabled = !isHost;
  });

  if (isHost) {
    elements.settingsReadOnlyMsg.classList.add('hidden');
  } else {
    elements.settingsReadOnlyMsg.classList.remove('hidden');
  }
}

/**
 * Renders the live gameplay leaderboard
 * @param {Array} players 
 * @param {string} drawerId 
 * @param {string} myId 
 */
export function renderGameLeaderboard(players, drawerId, myId) {
  elements.gameLeaderboardList.innerHTML = '';

  // Sort players by score
  const sorted = [...players].sort((a, b) => b.score - a.score);

  sorted.forEach((player) => {
    const isMe = (player.id === myId);
    const isDrawer = (player.id === drawerId);

    const item = document.createElement('div');
    item.className = `leader-item ${player.hasGuessed ? 'guessed-correct' : ''} ${isDrawer ? 'is-drawer' : ''}`;

    let details = `
      <div class="leader-avatar">${generateAvatarSVG(player.avatar)}</div>
      <div class="leader-details">
        <div class="leader-name">${escapeHtml(player.username)} ${isMe ? '(You)' : ''}</div>
        <div class="leader-score">${player.score} pts</div>
      </div>
    `;

    // Action icon badges (Pencil drawing or checkmark)
    let indicator = '';
    if (isDrawer) {
      indicator = '<span class="status-indicator">✏️</span>';
    } else if (player.hasGuessed) {
      indicator = '<span class="status-indicator">✅</span>';
    }
    
    // Add point updates popup bubble if they just scored
    if (player.roundScore > 0 && player.hasGuessed) {
      details += `<span class="delta-badge">+${player.roundScore}</span>`;
    }

    item.innerHTML = details + indicator;
    elements.gameLeaderboardList.appendChild(item);
  });
}

/**
 * Appends a message to the chat list log box
 * @param {string} sender 
 * @param {string} text 
 * @param {string} type 'normal' | 'correct' | 'system'
 */
export function appendChatMessage(sender, text, type = 'normal') {
  const container = elements.chatMessagesLog;
  const messageEl = document.createElement('div');
  
  if (type === 'system') {
    messageEl.className = 'chat-msg msg-system';
    messageEl.innerHTML = `📢 ${escapeHtml(text)}`;
  } else if (type === 'correct') {
    messageEl.className = 'chat-msg msg-correct';
    messageEl.innerHTML = `🎉 <strong>${escapeHtml(sender)}</strong>: ${escapeHtml(text)}`;
  } else {
    messageEl.className = 'chat-msg';
    messageEl.innerHTML = `<strong>${escapeHtml(sender)}</strong>: ${escapeHtml(text)}`;
  }

  container.appendChild(messageEl);
  
  // Auto scroll to bottom
  container.scrollTop = container.scrollHeight;
}

/**
 * Set up the color palette grids for drawing
 * @param {function} onColorSelect 
 */
export function buildColorPalette(onColorSelect) {
  elements.canvasColorPalette.innerHTML = '';
  PALETTE_COLORS.forEach(color => {
    const dot = document.createElement('div');
    dot.className = 'color-dot';
    dot.style.backgroundColor = color;
    dot.setAttribute('data-color', color);
    
    dot.addEventListener('click', (e) => {
      elements.canvasColorPalette.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
      onColorSelect(color);
    });
    
    elements.canvasColorPalette.appendChild(dot);
  });
  
  // Make first color active by default
  const first = elements.canvasColorPalette.querySelector('.color-dot');
  if (first) first.classList.add('active');
}

/**
 * Updates the timer visual UI rings and numbers
 * @param {number} remaining 
 * @param {number} totalTime 
 */
export function updateTimerUI(remaining, totalTime) {
  elements.timerText.innerText = remaining;
  
  // Calculate stroke offset for circular visual indicator
  const progressCircle = elements.timerRingProgress;
  const radius = progressCircle.r.baseVal.value;
  const circumference = 2 * Math.PI * radius;
  
  const ratio = remaining / totalTime;
  const offset = circumference - (ratio * circumference);
  
  progressCircle.style.strokeDasharray = `${circumference}`;
  progressCircle.style.strokeDashoffset = offset;

  // Change color based on remaining percentages
  if (ratio > 0.5) {
    progressCircle.style.stroke = 'var(--success)';
  } else if (ratio > 0.25) {
    progressCircle.style.stroke = 'var(--warning)';
  } else {
    progressCircle.style.stroke = 'var(--danger)';
  }
}

/**
 * Displays the choices of words for the drawing player
 * @param {Array} words 
 * @param {function} onWordSelect 
 */
export function showWordPicker(words, onWordSelect) {
  clearAllOverlays();
  elements.wordChoicesGrid.innerHTML = '';
  
  words.forEach(word => {
    const btn = document.createElement('button');
    btn.className = 'btn-choice';
    btn.innerText = word;
    btn.addEventListener('click', () => {
      onWordSelect(word);
      clearAllOverlays();
    });
    elements.wordChoicesGrid.appendChild(btn);
  });
  
  elements.overlayWordPicker.classList.add('active');
}

/**
 * Display scoreboard listing after a turn ends
 * @param {string} word 
 * @param {Array} scoresUpdate 
 */
export function showTurnEndReveal(word, scoresUpdate) {
  clearAllOverlays();
  
  elements.revealSecretWord.innerText = word;
  elements.revealScoresList.innerHTML = '';

  // Sort by round scores earned
  const sorted = [...scoresUpdate].sort((a, b) => b.roundScore - a.roundScore);

  sorted.forEach(p => {
    if (p.roundScore > 0) {
      const li = document.createElement('li');
      li.innerHTML = `
        <span>${escapeHtml(p.username)}</span>
        <span class="score-delta-plus">+${p.roundScore} pts</span>
      `;
      elements.revealScoresList.appendChild(li);
    }
  });

  if (elements.revealScoresList.children.length === 0) {
    const li = document.createElement('li');
    li.innerText = 'Nobody guessed the word this turn. 😢';
    li.style.justifyContent = 'center';
    elements.revealScoresList.appendChild(li);
  }

  elements.overlayTurnReveal.classList.add('active');
}

/**
 * Displays the Round Summary scoring cards
 * @param {number} round 
 * @param {Array} scoreboard 
 */
export function showRoundEndSummary(round, scoreboard) {
  clearAllOverlays();
  elements.roundScoreboardDisplay.innerHTML = '';

  scoreboard.forEach((player, index) => {
    const item = document.createElement('div');
    item.className = 'round-score-item';
    
    item.innerHTML = `
      <span class="rank-num">#${index + 1}</span>
      <div class="summary-avatar" style="width: 36px; height: 36px;">
        ${generateAvatarSVG(player.avatar)}
      </div>
      <span class="summary-name">${escapeHtml(player.username)}</span>
      <span class="summary-pts">${player.score} pts</span>
    `;
    elements.roundScoreboardDisplay.appendChild(item);
  });

  elements.overlayRoundEnd.classList.add('active');
}

/**
 * Displays the game over podium with the final standings
 * @param {Array} scoreboard 
 */
export function showGameOverPodium(scoreboard) {
  clearAllOverlays();

  // Reset Podium Slots
  elements.podiumName1.innerText = '-';
  elements.podiumScore1.innerText = '0 pts';
  elements.podiumAvatar1.innerHTML = '🏆';
  
  elements.podiumName2.innerText = '-';
  elements.podiumScore2.innerText = '0 pts';
  elements.podiumAvatar2.innerHTML = '';

  elements.podiumName3.innerText = '-';
  elements.podiumScore3.innerText = '0 pts';
  elements.podiumAvatar3.innerHTML = '';

  elements.gameOverRanksList.innerHTML = '';

  // 1st Place
  if (scoreboard[0]) {
    elements.podiumName1.innerText = scoreboard[0].username;
    elements.podiumScore1.innerText = `${scoreboard[0].score} pts`;
    elements.podiumAvatar1.innerHTML = generateAvatarSVG(scoreboard[0].avatar);
  }

  // 2nd Place
  if (scoreboard[1]) {
    elements.podiumName2.innerText = scoreboard[1].username;
    elements.podiumScore2.innerText = `${scoreboard[1].score} pts`;
    elements.podiumAvatar2.innerHTML = generateAvatarSVG(scoreboard[1].avatar);
  }

  // 3rd Place
  if (scoreboard[2]) {
    elements.podiumName3.innerText = scoreboard[2].username;
    elements.podiumScore3.innerText = `${scoreboard[2].score} pts`;
    elements.podiumAvatar3.innerHTML = generateAvatarSVG(scoreboard[2].avatar);
  }

  // Remaining Ranks (4+)
  if (scoreboard.length > 3) {
    for (let i = 3; i < scoreboard.length; i++) {
      const p = scoreboard[i];
      const li = document.createElement('li');
      li.innerHTML = `
        <span><strong>#${i + 1}</strong> ${escapeHtml(p.username)}</span>
        <span>${p.score} pts</span>
      `;
      elements.gameOverRanksList.appendChild(li);
    }
  }

  elements.overlayGameOver.classList.add('active');
}
