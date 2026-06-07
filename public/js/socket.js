import { 
  elements, 
  showScreen, 
  showToast, 
  renderLobbyPlayers, 
  updateLobbySettingsUI, 
  renderGameLeaderboard, 
  appendChatMessage, 
  updateTimerUI, 
  showWordPicker, 
  clearAllOverlays,
  showTurnEndReveal,
  showRoundEndSummary,
  showGameOverPodium
} from './ui.js';
import { playSound } from './utils.js'; // We'll add playSound to utils or app

export function initSocketListeners(socket, app) {
  
  // 1. Connection events
  socket.on('connect', () => {
    app.myId = socket.id;
    console.log('Connected to game server. Client ID:', app.myId);
  });

  socket.on('error_message', (message) => {
    showToast(message, 'error');
  });

  socket.on('kicked', () => {
    showToast('You have been kicked from the room by the host.', 'error');
    app.resetToHome();
  });

  socket.on('room_closed', () => {
    showToast('The room has been closed by the host.', 'error');
    app.resetToHome();
  });

  // 2. Room state initialization / Sync
  socket.on('room_state', (data) => {
    app.roomCode = data.code;
    app.hostId = data.hostId;
    app.settings = data.settings;
    app.players = data.players;
    app.gameState = data.gameState;
    app.currentDrawerId = data.currentDrawerId;
    
    const isHost = (app.myId === app.hostId);

    if (app.gameState === 'lobby') {
      showScreen('lobby');
      elements.lobbyRoomCode.innerText = app.roomCode;
      renderLobbyPlayers(
        app.players, 
        app.myId, 
        app.hostId, 
        (id) => socket.emit('kick_player', id),
        (id) => socket.emit('mute_player', id),
        (id) => socket.emit('transfer_host', id)
      );
      updateLobbySettingsUI(app.settings, isHost);

      // Show/Hide Host start game block vs Player ready block
      if (isHost) {
        elements.hostControlsBlock.classList.remove('hidden');
        elements.playerControlsBlock.classList.add('hidden');
      } else {
        elements.hostControlsBlock.classList.add('hidden');
        elements.playerControlsBlock.classList.remove('hidden');
      }
    } else {
      // Game in progress - switch to game view
      showScreen('game');
      elements.gameRoundInfo.innerText = `Round ${data.currentRound || 1}/${app.settings.rounds}`;
      renderGameLeaderboard(app.players, app.currentDrawerId, app.myId);
      
      // Update canvas tool states
      app.updateCanvasRoleState();

      if (data.revealedWord) {
        elements.gameWordLetters.innerText = data.revealedWord;
      }
      if (data.timeRemaining) {
        updateTimerUI(data.timeRemaining, app.settings.drawTime);
      }
      if (data.drawHistory && app.canvas) {
        app.canvas.syncHistory(data.drawHistory);
      }
    }
  });

  // 3. Player Updates
  socket.on('player_joined', (player) => {
    showToast(`${player.username} joined the room!`, 'success');
  });

  socket.on('player_left', (playerId) => {
    const player = app.players.find(p => p.id === playerId);
    if (player) {
      showToast(`${player.username} left the room.`, 'normal');
    }
  });

  socket.on('players_update', (playersList) => {
    app.players = playersList;
    
    // Check if my own mute status updated
    const me = playersList.find(p => p.id === app.myId);
    if (me) {
      elements.chatInput.disabled = me.isMuted;
      elements.chatInput.placeholder = me.isMuted 
        ? "You have been muted by the host." 
        : "Type your guess or message...";
    }

    if (app.gameState === 'lobby') {
      renderLobbyPlayers(
        app.players, 
        app.myId, 
        app.hostId,
        (id) => socket.emit('kick_player', id),
        (id) => socket.emit('mute_player', id),
        (id) => socket.emit('transfer_host', id)
      );
    } else {
      renderGameLeaderboard(app.players, app.currentDrawerId, app.myId);
    }
  });

  socket.on('settings_updated', (settings) => {
    app.settings = settings;
    const isHost = (app.myId === app.hostId);
    updateLobbySettingsUI(settings, isHost);
    showToast('Room settings updated.', 'normal');
  });

  // 4. Game Cycle Events
  socket.on('game_starting', (data) => {
    clearAllOverlays();
    playSound('start'); // Play start chime
    showToast('The game is starting! Get ready!', 'success');
    
    // Reset local state variables
    app.gameState = 'game';
    showScreen('game');
  });

  socket.on('turn_selecting', (data) => {
    clearAllOverlays();
    
    app.currentDrawerId = data.drawerId;
    app.gameState = 'selecting';
    app.updateCanvasRoleState();
    
    // Clear canvas for everyone
    if (app.canvas) app.canvas.clear();

    // Enable/disable guess input for this turn selecting phase
    elements.chatInput.disabled = true;
    elements.chatInput.placeholder = "Waiting for word selection...";

    const isMeDrawer = (app.myId === data.drawerId);
    
    if (!isMeDrawer) {
      elements.waitOverlayTitle.innerText = `${data.drawerName} is choosing a word...`;
      elements.overlayChoosingWait.classList.add('active');
    }

    renderGameLeaderboard(app.players, app.currentDrawerId, app.myId);
    
    // Start countdown countdown logic locally
    app.startLocalTimer(data.timeLimit, (rem) => {
      if (isMeDrawer) {
        elements.wordPickerCountdown.innerText = rem;
      }
    });
  });

  socket.on('word_choices', (choices) => {
    // Only drawer receives this
    showWordPicker(choices, (selectedWord) => {
      socket.emit('select_word', selectedWord);
    });
  });

  socket.on('turn_start', (data) => {
    clearAllOverlays();
    app.gameState = 'drawing';
    
    app.currentDrawerId = data.drawerId;
    app.secretWord = null; // Reset secret word tracking
    app.updateCanvasRoleState();
    
    const isMeDrawer = (app.myId === data.drawerId);

    // Setup input state
    if (isMeDrawer) {
      elements.chatInput.disabled = true;
      elements.chatInput.placeholder = "You are drawing! Check the word above.";
    } else {
      elements.chatInput.disabled = false;
      elements.chatInput.placeholder = "Type your guess here...";
      elements.chatInput.focus();
    }

    // Update blank letters layout (guessers see blanks)
    elements.gameWordLetters.innerText = data.revealedWord;
    elements.gameWordLetters.classList.remove('drawer-word-display');
    elements.gameWordHintMeta.innerText = `(${data.wordLength} letters, ${data.hintsCount} hints remaining)`;

    renderGameLeaderboard(app.players, app.currentDrawerId, app.myId);

    // Turn countdown
    app.startLocalTimer(data.timeLimit, (rem) => {
      updateTimerUI(rem, app.settings.drawTime);
      
      // Gentle tick on last 5 seconds
      if (rem <= 5 && rem > 0) {
        playSound('tick');
      }
    });
  });

  socket.on('secret_word', (word) => {
    // Only drawer receives this: show the full word prominently
    app.secretWord = word;
    elements.gameWordLetters.innerText = word.toUpperCase();
    elements.gameWordLetters.classList.add('drawer-word-display');
    elements.gameWordHintMeta.innerText = `✏️ DRAW THIS WORD!`;
  });

  socket.on('hint_update', (data) => {
    // If I'm the drawer, keep showing the full secret word — don't overwrite with blanks
    if (app.secretWord && app.myId === app.currentDrawerId) {
      elements.gameWordHintMeta.innerText = `✏️ DRAW THIS WORD! (${data.hintsRemaining} hints remaining)`;
    } else {
      elements.gameWordLetters.innerText = data.revealedWord;
      elements.gameWordHintMeta.innerText = `(${data.revealedWord.replace(/\s/g, '').length} letters, ${data.hintsRemaining} hints remaining)`;
    }
    playSound('hint');
  });

  socket.on('correct_guess_feedback', (data) => {
    playSound('correct');
    showToast(`You guessed the word! (+${data.points} pts)`, 'success');
    
    // Style lock guess input
    elements.chatInput.disabled = true;
    elements.chatInput.value = '';
    elements.chatInput.placeholder = `Guessed correctly: ${data.word.toUpperCase()}! 🎉`;
    elements.chatInput.style.border = '2px solid var(--success)';
  });

  socket.on('correct_guess', (data) => {
    // Update local players array score
    const p = app.players.find(pl => pl.id === data.playerId);
    if (p) {
      p.score = data.score;
      p.hasGuessed = true;
    }
    
    renderGameLeaderboard(app.players, app.currentDrawerId, app.myId);
  });

  socket.on('turn_end', (data) => {
    app.stopLocalTimer();
    app.secretWord = null;
    playSound('reveal');
    
    // Clear canvas drawing tools and reset styles
    elements.chatInput.style.border = '1px solid var(--border-color)';
    elements.gameWordLetters.classList.remove('drawer-word-display');

    // Show reveal dialog overlay
    showTurnEndReveal(data.word, data.roundScores);

    // Apply scores changes to local model
    data.roundScores.forEach(rs => {
      const p = app.players.find(pl => pl.id === rs.id);
      if (p) {
        p.score = rs.score;
        p.roundScore = rs.roundScore;
        p.hasGuessed = true; // highlights scores positively
      }
    });
    
    renderGameLeaderboard(app.players, app.currentDrawerId, app.myId);
  });

  socket.on('round_end', (data) => {
    app.stopLocalTimer();
    showRoundEndSummary(data.round, data.scoreboard);
    
    // Increment rounds locally
    elements.gameRoundInfo.innerText = `Round ${data.round + 1}/${app.settings.rounds}`;
  });

  socket.on('game_over', (data) => {
    app.stopLocalTimer();
    playSound('win');
    showGameOverPodium(data.scoreboard);

    // Run game over countdown
    let count = 15;
    elements.gameOverCountdown.innerText = count;
    const interval = setInterval(() => {
      count--;
      elements.gameOverCountdown.innerText = count;
      if (count <= 0) clearInterval(interval);
    }, 1000);
  });

  socket.on('game_ended_solo', (data) => {
    app.stopLocalTimer();
    showToast(data.message || 'Game ended — not enough players.', 'error');
  });

  socket.on('lobby_reset', (data) => {
    clearAllOverlays();
    app.gameState = 'lobby';
    app.players = data.players;
    
    showScreen('lobby');
    
    const isHost = (app.myId === app.hostId);
    renderLobbyPlayers(
      app.players, 
      app.myId, 
      app.hostId,
      (id) => socket.emit('kick_player', id),
      (id) => socket.emit('mute_player', id),
      (id) => socket.emit('transfer_host', id)
    );
  });

  // 5. Drawing Sync Events
  socket.on('draw_stroke', (stroke) => {
    if (app.canvas) app.canvas.addRemoteStroke(stroke);
  });

  socket.on('draw_fill', (fillData) => {
    if (app.canvas) app.canvas.addRemoteFill(fillData);
  });

  socket.on('clear_canvas', () => {
    if (app.canvas) app.canvas.clear();
  });

  socket.on('undo_stroke', () => {
    if (app.canvas) app.canvas.undo();
  });

  // 6. Chat Messages
  socket.on('chat_message', (msg) => {
    appendChatMessage(msg.sender, msg.text, msg.type);
  });
}
