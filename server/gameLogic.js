import { config } from './config.js';
import { getRandomWords } from './words.js';
import { clearRoomTimers } from './roomManager.js';

/**
 * Shuffles an array in place
 * @param {Array} array 
 */
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

/**
 * Initializes and starts a new game session
 * @param {object} room 
 * @param {object} io Socket.IO server instance
 */
export function startGame(room, io) {
  clearRoomTimers(room);
  
  room.gameState = 'selecting';
  room.currentRound = 1;
  room.drawerOrder = Array.from(room.players.keys());
  shuffle(room.drawerOrder);
  room.drawerIndex = 0;
  room.currentDrawerId = room.drawerOrder[0];
  
  // Reset player scores
  for (const player of room.players.values()) {
    player.score = 0;
    player.roundScore = 0;
    player.hasGuessed = false;
  }

  io.to(room.code).emit('game_starting', {
    rounds: room.settings.rounds,
    drawerOrder: room.drawerOrder.map(id => room.players.get(id).username)
  });

  // Small delay before starting the first selection phase
  setTimeout(() => {
    startSelectionPhase(room, io);
  }, 2000);
}

/**
 * Starts the word selection phase for the current drawer
 * @param {object} room 
 * @param {object} io 
 */
export function startSelectionPhase(room, io) {
  clearRoomTimers(room);
  
  room.gameState = 'selecting';
  room.currentDrawerId = room.drawerOrder[room.drawerIndex];
  room.drawHistory = [];
  room.hasGuessedCount = 0;
  
  // Reset round status for players
  for (const [id, player] of room.players.entries()) {
    player.roundScore = 0;
    player.hasGuessed = false;
    player.guessTime = 0;
  }

  // Get drawer info
  const drawer = room.players.get(room.currentDrawerId);
  if (!drawer) {
    // Fallback if drawer disconnected
    nextTurn(room, io);
    return;
  }

  // Pick 3 random words for choice
  room.wordsToSelect = getRandomWords(3, room.settings.wordMode, room.settings.customWords);
  room.timeRemaining = config.TIMING.wordSelectionTime;

  // Broadcast selecting state
  io.to(room.code).emit('turn_selecting', {
    drawerId: room.currentDrawerId,
    drawerName: drawer.username,
    timeLimit: room.timeRemaining,
    // Send words choices to the drawer socket only
    words: [] 
  });

  // Emit word choice to the drawer specifically
  io.to(room.currentDrawerId).emit('word_choices', room.wordsToSelect);

  // Selection Timer loop
  room.selectionTimer = setInterval(() => {
    room.timeRemaining--;
    
    // Broadcast countdown to the lobby
    io.to(room.code).emit('selection_countdown', room.timeRemaining);

    if (room.timeRemaining <= 0) {
      clearInterval(room.selectionTimer);
      room.selectionTimer = null;
      // Auto-pick a word
      const autoWord = room.wordsToSelect[Math.floor(Math.random() * room.wordsToSelect.length)];
      startTurn(room, autoWord, io);
    }
  }, 1000);
}

/**
 * Starts the active drawing turn with the chosen word
 * @param {object} room 
 * @param {string} word 
 * @param {object} io 
 */
export function startTurn(room, word, io) {
  clearRoomTimers(room);

  room.gameState = 'drawing';
  room.currentWord = word.trim().toLowerCase();
  
  // Build initial revealed word pattern (reveal spaces, mask letters)
  room.revealedWord = Array.from(room.currentWord)
    .map(char => (char === ' ' || char === '-') ? char : '_')
    .join('');
    
  room.hintsShown = 0;
  room.timeRemaining = room.settings.drawTime;

  // Schedule hints
  scheduleHints(room, io);

  const drawer = room.players.get(room.currentDrawerId);
  const drawerName = drawer ? drawer.username : 'Someone';

  // Inform all players of turn start
  io.to(room.code).emit('turn_start', {
    drawerId: room.currentDrawerId,
    drawerName,
    timeLimit: room.timeRemaining,
    revealedWord: room.revealedWord,
    wordLength: room.currentWord.length,
    hintsCount: room.settings.maxHints
  });

  // Send the actual word to the drawer only
  if (room.currentDrawerId) {
    io.to(room.currentDrawerId).emit('secret_word', room.currentWord);
  }

  // Main turn countdown loop
  room.turnTimer = setInterval(() => {
    room.timeRemaining--;
    
    io.to(room.code).emit('turn_countdown', room.timeRemaining);

    if (room.timeRemaining <= 0) {
      endTurn(room, io, 'time');
    }
  }, 1000);
}

/**
 * Schedules dynamic and automatic hint reveals over the turn duration
 * @param {object} room 
 * @param {object} io 
 */
function scheduleHints(room, io) {
  const maxHints = room.settings.maxHints;
  if (maxHints <= 0) return;

  const totalTime = room.settings.drawTime;
  const hintInterval = totalTime / (maxHints + 1);

  room.hintTimers = [];

  for (let i = 1; i <= maxHints; i++) {
    const triggerOffsetSeconds = Math.round(hintInterval * i);
    const delayMs = (totalTime - (totalTime - triggerOffsetSeconds)) * 1000;

    const timer = setTimeout(() => {
      // Execute hint reveal
      revealNextLetter(room);
      room.hintsShown++;
      io.to(room.code).emit('hint_update', {
        revealedWord: room.revealedWord,
        hintsRemaining: maxHints - room.hintsShown
      });
    }, delayMs);

    room.hintTimers.push(timer);
  }
}

/**
 * Selects a random unrevealed index of the secret word and updates the visual pattern
 * @param {object} room 
 */
function revealNextLetter(room) {
  const word = room.currentWord;
  const indices = [];

  // Find all unrevealed letters indices
  for (let i = 0; i < word.length; i++) {
    if (room.revealedWord[i] === '_' && word[i] !== ' ' && word[i] !== '-') {
      indices.push(i);
    }
  }

  if (indices.length > 0) {
    const randomIndex = indices[Math.floor(Math.random() * indices.length)];
    const chars = Array.from(room.revealedWord);
    chars[randomIndex] = word[randomIndex];
    room.revealedWord = chars.join('');
  }
}

/**
 * Handles the logic when a player submits a guess
 * @param {object} room 
 * @param {string} playerId 
 * @param {string} text 
 * @param {object} io 
 * @returns {boolean} True if correct guess, false otherwise
 */
export function handleGuess(room, playerId, text, io) {
  // Can only guess during drawing phase
  if (room.gameState !== 'drawing') return false;

  // Drawer cannot guess their own word
  if (room.currentDrawerId === playerId) return false;

  const player = room.players.get(playerId);
  if (!player || player.hasGuessed) return false;

  const cleanedGuess = text.trim().toLowerCase();
  
  if (cleanedGuess === room.currentWord) {
    player.hasGuessed = true;
    player.guessTime = Date.now();
    room.hasGuessedCount++;

    // Calculate score
    const totalDrawTime = room.settings.drawTime;
    const timeRatio = room.timeRemaining / totalDrawTime;
    
    // Guess Speed Points (Base 100 + up to 200 based on speed)
    let points = Math.round(100 + timeRatio * 200);

    // First correct guess gets a bonus
    if (room.hasGuessedCount === 1) {
      points += 50; 
      io.to(room.code).emit('chat_message', {
        sender: 'System',
        text: `${player.username} is the first to guess the word! 🎉`,
        type: 'system'
      });
    }

    player.roundScore = points;
    player.score += points;

    // Send individual confirmation and update lobby scoreboards
    io.to(playerId).emit('correct_guess_feedback', { points, word: room.currentWord });
    io.to(room.code).emit('correct_guess', {
      playerId,
      username: player.username,
      score: player.score
    });

    // Check if everyone has guessed
    const totalGuessers = room.players.size - 1;
    if (room.hasGuessedCount >= totalGuessers) {
      endTurn(room, io, 'all_guessed');
    }
    return true;
  }

  return false;
}

/**
 * Ends the current drawing turn
 * @param {object} room 
 * @param {object} io 
 * @param {string} reason 'time' | 'all_guessed' | 'skip'
 */
export function endTurn(room, io, reason = 'time') {
  clearRoomTimers(room);
  
  room.gameState = 'reveal';

  const totalGuessers = room.players.size - 1;
  const drawer = room.players.get(room.currentDrawerId);
  
  let drawerPoints = 0;
  // Award drawer points if anyone guessed it
  if (drawer && totalGuessers > 0 && room.hasGuessedCount > 0) {
    // Drawer points proportional to guessers who guessed correctly
    const ratio = room.hasGuessedCount / totalGuessers;
    drawerPoints = Math.round(ratio * 150 + 50); // Min 50, Max 200 points
    drawer.roundScore = drawerPoints;
    drawer.score += drawerPoints;
  }

  // Compile round score additions
  const roundScores = Array.from(room.players.entries()).map(([id, p]) => ({
    id,
    username: p.username,
    roundScore: p.roundScore,
    score: p.score
  }));

  io.to(room.code).emit('turn_end', {
    word: room.currentWord,
    reason,
    roundScores,
    drawerId: room.currentDrawerId,
    drawerPoints
  });

  // Wait 5 seconds to show the revealed word and scores, then transition to next turn
  setTimeout(() => {
    nextTurn(room, io);
  }, config.TIMING.turnEndDelay * 1000);
}

/**
 * Transitions the room state to the next turn or round
 * @param {object} room 
 * @param {object} io 
 */
export function nextTurn(room, io) {
  room.drawerIndex++;

  // Check if round is complete
  if (room.drawerIndex >= room.drawerOrder.length) {
    room.currentRound++;
    
    // Check if game is over
    if (room.currentRound > room.settings.rounds) {
      endGame(room, io);
    } else {
      // Show round end leaderboard, then start new round rotation
      room.gameState = 'scoreboard';
      room.drawerIndex = 0;
      shuffle(room.drawerOrder); // Reshuffle order for the next round
      
      const scoreboard = Array.from(room.players.values())
        .map(p => ({ username: p.username, score: p.score, avatar: p.avatar }))
        .sort((a, b) => b.score - a.score);

      io.to(room.code).emit('round_end', {
        round: room.currentRound - 1,
        scoreboard
      });

      setTimeout(() => {
        startSelectionPhase(room, io);
      }, config.TIMING.roundEndDelay * 1000);
    }
  } else {
    // Continue next turn in the current round
    startSelectionPhase(room, io);
  }
}

/**
 * Concludes the game, announces the final scores, and resets room to lobby
 * @param {object} room 
 * @param {object} io 
 */
export function endGame(room, io) {
  clearRoomTimers(room);
  room.gameState = 'scoreboard';

  const finalScoreboard = Array.from(room.players.entries()).map(([id, p]) => ({
    id,
    username: p.username,
    score: p.score,
    avatar: p.avatar
  })).sort((a, b) => b.score - a.score);

  io.to(room.code).emit('game_over', { scoreboard: finalScoreboard });

  // Wait for 15 seconds, then return all players to lobby state
  setTimeout(() => {
    room.gameState = 'lobby';
    room.currentRound = 0;
    room.drawerOrder = [];
    room.drawerIndex = -1;
    room.currentDrawerId = null;
    room.currentWord = '';
    room.revealedWord = '';
    room.drawHistory = [];
    
    // Clear ready states
    for (const player of room.players.values()) {
      player.isReady = false;
      player.score = 0;
      player.roundScore = 0;
      player.hasGuessed = false;
    }

    io.to(room.code).emit('lobby_reset', {
      players: Array.from(room.players.entries()).map(([id, p]) => ({
        id,
        username: p.username,
        avatar: p.avatar,
        isReady: p.isReady,
        score: p.score
      }))
    });
  }, config.TIMING.gameOverDelay * 1000);
}
