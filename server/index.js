import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

import { config } from './config.js';
import { 
  createRoom, 
  getRoom, 
  joinRoom, 
  leaveRoom, 
  findRoomByPlayerId 
} from './roomManager.js';
import { 
  startGame, 
  handleGuess, 
  startTurn, 
  endTurn 
} from './gameLogic.js';
import { filterProfanity } from './profanityFilter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, '../public')));

// Simple API for checking room existence
app.get('/api/room/:code', (req, res) => {
  const room = getRoom(req.params.code);
  res.json({ exists: !!room, isFull: room ? room.players.size >= room.settings.maxPlayers : false });
});

// Levenshtein distance helper for checking "close" guesses
function getEditDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1  // deletion
          )
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

// Store rate limit data (socketId -> timestamp[])
const messageTimestamps = new Map();

io.on('connection', (socket) => {
  // Initialize rate limiting list
  messageTimestamps.set(socket.id, []);

  // Utility to get current room
  const getSocketRoom = () => {
    const code = socket.roomCode;
    return getRoom(code);
  };

  // 1. Create Room
  socket.on('create_room', ({ username, avatar }) => {
    try {
      const cleanUsername = username?.trim().substring(0, config.LIMITS.maxUsernameLength) || 'Player';
      const player = {
        id: socket.id,
        username: cleanUsername,
        avatar: avatar || { skin: '#ffdbac', eyes: 'eyes1', mouth: 'mouth1', clothes: '#4f46e5', bg: '#1e1b4b' },
        score: 0,
        roundScore: 0,
        isReady: false,
        hasGuessed: false,
        isMuted: false
      };

      const room = createRoom(socket.id, player);
      socket.roomCode = room.code;
      socket.join(room.code);

      // Return room state to the creator
      socket.emit('room_state', {
        code: room.code,
        hostId: room.hostId,
        settings: room.settings,
        players: Array.from(room.players.values()),
        gameState: room.gameState,
        currentRound: room.currentRound,
        currentDrawerId: room.currentDrawerId
      });
    } catch (err) {
      socket.emit('error_message', err.message);
    }
  });

  // 2. Join Room
  socket.on('join_room', ({ roomCode, username, avatar }) => {
    try {
      const room = getRoom(roomCode);
      if (!room) {
        return socket.emit('error_message', 'Room not found.');
      }

      if (room.players.size >= room.settings.maxPlayers) {
        return socket.emit('error_message', 'Room is full.');
      }

      const cleanUsername = username?.trim().substring(0, config.LIMITS.maxUsernameLength) || 'Player';
      const player = {
        id: socket.id,
        username: cleanUsername,
        avatar: avatar || { skin: '#ffdbac', eyes: 'eyes1', mouth: 'mouth1', clothes: '#4f46e5', bg: '#1e1b4b' },
        score: 0,
        roundScore: 0,
        isReady: false,
        hasGuessed: false,
        isMuted: false
      };

      joinRoom(room.code, socket.id, player);
      socket.roomCode = room.code;
      socket.join(room.code);

      // Broadcast join event
      socket.to(room.code).emit('player_joined', player);
      io.to(room.code).emit('players_update', Array.from(room.players.values()));

      // Send current state to joining player
      socket.emit('room_state', {
        code: room.code,
        hostId: room.hostId,
        settings: room.settings,
        players: Array.from(room.players.values()),
        gameState: room.gameState,
        currentRound: room.currentRound,
        currentDrawerId: room.currentDrawerId,
        revealedWord: room.revealedWord,
        timeRemaining: room.timeRemaining,
        drawHistory: room.drawHistory // Sync canvas strokes
      });
      
      // Let the joining player see system message in chat
      socket.to(room.code).emit('chat_message', {
        sender: 'System',
        text: `${cleanUsername} joined the room.`,
        type: 'system'
      });
    } catch (err) {
      socket.emit('error_message', err.message);
    }
  });

  // 3. Toggle Ready
  socket.on('toggle_ready', () => {
    const room = getSocketRoom();
    if (!room) return;

    const player = room.players.get(socket.id);
    if (player) {
      player.isReady = !player.isReady;
      io.to(room.code).emit('players_update', Array.from(room.players.values()));
    }
  });

  // 4. Update Settings (Host Only)
  socket.on('update_settings', (newSettings) => {
    const room = getSocketRoom();
    if (!room || room.hostId !== socket.id) return;

    // Validate inputs
    const s = room.settings;
    if (newSettings.maxPlayers !== undefined) {
      s.maxPlayers = Math.max(config.LIMITS.minPlayers, Math.min(config.LIMITS.maxPlayers, Number(newSettings.maxPlayers)));
    }
    if (newSettings.rounds !== undefined) {
      s.rounds = Math.max(config.LIMITS.minRounds, Math.min(config.LIMITS.maxRounds, Number(newSettings.rounds)));
    }
    if (newSettings.drawTime !== undefined) {
      s.drawTime = Math.max(config.LIMITS.minDrawTime, Math.min(config.LIMITS.maxDrawTime, Number(newSettings.drawTime)));
    }
    if (newSettings.maxHints !== undefined) {
      s.maxHints = Math.max(config.LIMITS.minHints, Math.min(config.LIMITS.maxHints, Number(newSettings.maxHints)));
    }
    if (newSettings.wordMode !== undefined && ['default', 'custom', 'mixed'].includes(newSettings.wordMode)) {
      s.wordMode = newSettings.wordMode;
    }
    if (newSettings.customWords !== undefined) {
      // Parse custom words list
      const words = Array.isArray(newSettings.customWords) 
        ? newSettings.customWords 
        : String(newSettings.customWords).split('\n');
      
      s.customWords = words
        .map(w => w.trim().replace(/[^a-zA-Z\s-]/g, '')) // Allow letters, spaces, hyphens
        .filter(w => w.length > 1 && w.length < 25)
        .slice(0, config.LIMITS.maxCustomWords);
    }

    io.to(room.code).emit('settings_updated', s);
  });

  // 5. Start Game (Host Only)
  socket.on('start_game', () => {
    const room = getSocketRoom();
    if (!room || room.hostId !== socket.id) return;
    if (room.gameState !== 'lobby') return;

    if (room.players.size < 2) {
      return socket.emit('error_message', 'Need at least 2 players to start.');
    }

    startGame(room, io);
  });

  // 6. Drawer Word Selection
  socket.on('select_word', (word) => {
    const room = getSocketRoom();
    if (!room || room.gameState !== 'selecting' || room.currentDrawerId !== socket.id) return;

    if (room.wordsToSelect.includes(word)) {
      startTurn(room, word, io);
    }
  });

  // 7. Drawing events
  socket.on('draw_stroke', (stroke) => {
    const room = getSocketRoom();
    if (!room || room.gameState !== 'drawing' || room.currentDrawerId !== socket.id) return;

    room.drawHistory.push(stroke);
    socket.to(room.code).emit('draw_stroke', stroke);
  });

  socket.on('draw_fill', (fillData) => {
    const room = getSocketRoom();
    if (!room || room.gameState !== 'drawing' || room.currentDrawerId !== socket.id) return;

    room.drawHistory.push(fillData);
    socket.to(room.code).emit('draw_fill', fillData);
  });

  socket.on('clear_canvas', () => {
    const room = getSocketRoom();
    if (!room || room.gameState !== 'drawing' || room.currentDrawerId !== socket.id) return;

    room.drawHistory = [];
    io.to(room.code).emit('clear_canvas');
  });

  socket.on('undo_stroke', () => {
    const room = getSocketRoom();
    if (!room || room.gameState !== 'drawing' || room.currentDrawerId !== socket.id) return;

    if (room.drawHistory.length > 0) {
      room.drawHistory.pop();
      io.to(room.code).emit('undo_stroke');
    }
  });

  // 8. Chat messaging
  socket.on('send_message', (text) => {
    const room = getSocketRoom();
    if (!room) return;

    const player = room.players.get(socket.id);
    if (!player || player.isMuted) return;

    // Rate Limiting (max 4 messages per 2 seconds)
    const now = Date.now();
    const timestamps = messageTimestamps.get(socket.id) || [];
    const recent = timestamps.filter(t => now - t < 2000);
    recent.push(now);
    messageTimestamps.set(socket.id, recent);

    if (recent.length > 4) {
      socket.emit('chat_message', {
        sender: 'System',
        text: 'Spam prevention: sending messages too fast.',
        type: 'system'
      });
      return;
    }

    // Sanitize length
    const cleanText = text?.trim().substring(0, config.LIMITS.maxChatMessageLength);
    if (!cleanText) return;

    // Filter profanity
    const filteredText = filterProfanity(cleanText);

    // If game is in progress and player is the drawer or has already guessed
    if (room.gameState === 'drawing') {
      if (socket.id === room.currentDrawerId) {
        // Drawer cannot talk in general chat to avoid spoiling, or their words are only shown to correct guessers
        // Let's make drawer messages go to correct guessers only
        emitToCorrectGuessers(room, {
          sender: player.username,
          text: filteredText,
          type: 'correct'
        });
        return;
      }
      
      if (player.hasGuessed) {
        // Already guessed: send message only to other correct guessers (+ drawer)
        emitToCorrectGuessers(room, {
          sender: player.username,
          text: filteredText,
          type: 'correct'
        });
        return;
      }

      // Active guess validation
      const guessedCorrectly = handleGuess(room, socket.id, cleanText, io);
      if (guessedCorrectly) {
        return; // handleGuess already emits success feedbacks
      }

      // Check if edit distance is "close" to secret word (1 char off)
      if (room.currentWord) {
        const dist = getEditDistance(cleanText.toLowerCase(), room.currentWord);
        if (dist === 1) {
          socket.emit('chat_message', {
            sender: 'System',
            text: `"${cleanText}" is very close!`,
            type: 'system'
          });
        }
      }
    }

    // Normal chat broadcast (visible to everyone who has not guessed, and correct guessers also see general chat)
    io.to(room.code).emit('chat_message', {
      sender: player.username,
      text: filteredText,
      type: 'normal'
    });
  });

  // Helper to send messages to guessers who have already figured it out
  function emitToCorrectGuessers(room, msgObj) {
    for (const [id, p] of room.players.entries()) {
      if (p.hasGuessed || id === room.currentDrawerId) {
        io.to(id).emit('chat_message', msgObj);
      }
    }
  }

  // 9. Host moderation tools
  socket.on('kick_player', (targetId) => {
    const room = getSocketRoom();
    if (!room || room.hostId !== socket.id || socket.id === targetId) return;

    const targetPlayer = room.players.get(targetId);
    if (targetPlayer) {
      io.to(targetId).emit('kicked');
      io.to(room.code).emit('chat_message', {
        sender: 'System',
        text: `${targetPlayer.username} was kicked by the host.`,
        type: 'system'
      });
      
      // Force disconnect from room
      const targetSocket = io.sockets.sockets.get(targetId);
      if (targetSocket) {
        targetSocket.leave(room.code);
        delete targetSocket.roomCode;
      }

      // Clean up in roomManager
      const leaveResult = leaveRoom(targetId);
      handleLeaveResult(leaveResult);
    }
  });

  socket.on('mute_player', (targetId) => {
    const room = getSocketRoom();
    if (!room || room.hostId !== socket.id) return;

    const targetPlayer = room.players.get(targetId);
    if (targetPlayer) {
      targetPlayer.isMuted = !targetPlayer.isMuted;
      
      io.to(room.code).emit('players_update', Array.from(room.players.values()));
      io.to(room.code).emit('chat_message', {
        sender: 'System',
        text: `${targetPlayer.username} has been ${targetPlayer.isMuted ? 'muted' : 'unmuted'} by the host.`,
        type: 'system'
      });
    }
  });

  socket.on('transfer_host', (targetId) => {
    const room = getSocketRoom();
    if (!room || room.hostId !== socket.id || !room.players.has(targetId)) return;

    room.hostId = targetId;
    io.to(room.code).emit('room_state', {
      code: room.code,
      hostId: room.hostId,
      settings: room.settings,
      players: Array.from(room.players.values()),
      gameState: room.gameState,
      currentRound: room.currentRound,
      currentDrawerId: room.currentDrawerId
    });

    const targetPlayer = room.players.get(targetId);
    io.to(room.code).emit('chat_message', {
      sender: 'System',
      text: `${targetPlayer.username} is now the host.`,
      type: 'system'
    });
  });

  socket.on('close_room', () => {
    const room = getSocketRoom();
    if (!room || room.hostId !== socket.id) return;

    io.to(room.code).emit('room_closed');
    
    // Kick everyone out of room channel
    io.in(room.code).socketsLeave(room.code);
    
    // Cleanup in memory
    for (const [id, p] of room.players.entries()) {
      const s = io.sockets.sockets.get(id);
      if (s) delete s.roomCode;
    }
    
    leaveRoom(socket.id); // Triggers destruction as players size will be 0
  });

  // 10. Disconnect handler
  socket.on('disconnect', () => {
    messageTimestamps.delete(socket.id);
    
    const leaveResult = leaveRoom(socket.id);
    handleLeaveResult(leaveResult);
  });

  function handleLeaveResult(result) {
    if (!result) return;

    const { room, code, hostMigrated, deleted } = result;

    if (deleted) {
      console.log(`Room ${code} destroyed: no players remaining.`);
      return;
    }

    if (room) {
      // If the player disconnected while they were the active drawer, end their turn
      if (room.gameState === 'drawing' && room.currentDrawerId === socket.id) {
        io.to(room.code).emit('chat_message', {
          sender: 'System',
          text: `The drawer disconnected. Ending turn.`,
          type: 'system'
        });
        endTurn(room, io, 'skip');
      } else if (room.gameState === 'selecting' && room.currentDrawerId === socket.id) {
        io.to(room.code).emit('chat_message', {
          sender: 'System',
          text: `The drawer disconnected during word selection.`,
          type: 'system'
        });
        nextTurn(room, io);
      }

      // Update room state for remaining players
      io.to(room.code).emit('players_update', Array.from(room.players.values()));

      if (hostMigrated) {
        const newHost = room.players.get(room.hostId);
        io.to(room.code).emit('room_state', {
          code: room.code,
          hostId: room.hostId,
          settings: room.settings,
          players: Array.from(room.players.values()),
          gameState: room.gameState,
          currentRound: room.currentRound,
          currentDrawerId: room.currentDrawerId
        });
        io.to(room.code).emit('chat_message', {
          sender: 'System',
          text: `Host disconnected. ${newHost.username} is now the host.`,
          type: 'system'
        });
      }
    }
  }
});

server.listen(config.PORT, () => {
  console.log(`Game server running on http://localhost:${config.PORT}`);
});
export default server; // Export for testing
