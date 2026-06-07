import { config } from './config.js';

// In-memory store for active rooms
// Room Code -> Room State Object
const rooms = new Map();

/**
 * Generates a unique 6-character alphanumeric room code
 * @returns {string}
 */
function generateRoomCode() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let attempts = 0;
  while (attempts < 1000) {
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    if (!rooms.has(code)) {
      return code;
    }
    attempts++;
  }
  throw new Error('Failed to generate a unique room code.');
}

/**
 * Creates a new game room
 * @param {string} hostSocketId 
 * @param {object} hostPlayer 
 * @returns {object} The created room object
 */
export function createRoom(hostSocketId, hostPlayer) {
  const code = generateRoomCode();
  
  const room = {
    code,
    hostId: hostSocketId,
    settings: {
      maxPlayers: config.DEFAULT_SETTINGS.maxPlayers,
      rounds: config.DEFAULT_SETTINGS.rounds,
      drawTime: config.DEFAULT_SETTINGS.drawTime,
      maxHints: config.DEFAULT_SETTINGS.maxHints,
      wordMode: config.DEFAULT_SETTINGS.wordMode,
      customWords: []
    },
    players: new Map(), // SocketId -> PlayerObj
    gameState: 'lobby', // 'lobby', 'selecting', 'drawing', 'reveal', 'scoreboard'
    currentRound: 0,
    drawerOrder: [],
    drawerIndex: -1,
    currentDrawerId: null,
    currentWord: '',
    revealedWord: '',
    hintsShown: 0,
    hintTimers: [],
    turnTimer: null,
    selectionTimer: null,
    timeRemaining: 0,
    wordsToSelect: [],
    hasGuessedCount: 0,
    drawHistory: [] // Array of paint strokes to synchronize late joiners
  };

  // Set host player ready status to false by default or true? Let's keep ready status
  hostPlayer.isReady = false;
  hostPlayer.score = 0;
  hostPlayer.roundScore = 0;
  hostPlayer.hasGuessed = false;
  hostPlayer.isMuted = false;
  
  room.players.set(hostSocketId, hostPlayer);
  rooms.set(code, room);

  return room;
}

/**
 * Gets a room by code
 * @param {string} code 
 * @returns {object|null}
 */
export function getRoom(code) {
  if (!code) return null;
  return rooms.get(code.toUpperCase().trim()) || null;
}

/**
 * Find room a player belongs to
 * @param {string} playerId 
 * @returns {object|null}
 */
export function findRoomByPlayerId(playerId) {
  for (const room of rooms.values()) {
    if (room.players.has(playerId)) {
      return room;
    }
  }
  return null;
}

/**
 * Adds a player to a room
 * @param {string} code 
 * @param {string} playerId 
 * @param {object} player 
 * @returns {object} The room
 */
export function joinRoom(code, playerId, player) {
  const room = getRoom(code);
  if (!room) {
    throw new Error('Room not found');
  }

  if (room.players.size >= room.settings.maxPlayers) {
    throw new Error('Room is full');
  }

  // If game is already active, late-joiner score is 0 and they must wait for next turn/round
  player.isReady = false;
  player.score = 0;
  player.roundScore = 0;
  player.hasGuessed = false;
  player.isMuted = false;

  room.players.set(playerId, player);
  
  // If the game is in progress, make sure they are added to the drawerOrder at the end
  if (room.gameState !== 'lobby') {
    room.drawerOrder.push(playerId);
  }

  return room;
}

/**
 * Removes a player from their room and handles cleanup/host migration
 * @param {string} playerId 
 * @returns {object|null} { room, code, hostMigrated, deleted } or null if not found
 */
export function leaveRoom(playerId) {
  const room = findRoomByPlayerId(playerId);
  if (!room) return null;

  const code = room.code;
  room.players.delete(playerId);

  // Remove player from rotation list if they leave mid-game
  const orderIndex = room.drawerOrder.indexOf(playerId);
  if (orderIndex !== -1) {
    room.drawerOrder.splice(orderIndex, 1);
    // Adjust drawerIndex if the deleted player was before the current drawer
    if (orderIndex <= room.drawerIndex && room.drawerIndex > 0) {
      room.drawerIndex--;
    }
  }

  // If room is empty, destroy it
  if (room.players.size === 0) {
    // Clear any timers to prevent memory leaks
    clearRoomTimers(room);
    rooms.delete(code);
    return { room: null, code, hostMigrated: false, deleted: true };
  }

  let hostMigrated = false;
  // If the host left, migrate host status to the next available player
  if (room.hostId === playerId) {
    const nextHostId = room.players.keys().next().value;
    room.hostId = nextHostId;
    hostMigrated = true;
  }

  return { room, code, hostMigrated, deleted: false };
}

/**
 * Clears all timers active inside a room
 * @param {object} room 
 */
export function clearRoomTimers(room) {
  if (room.turnTimer) {
    clearInterval(room.turnTimer);
    room.turnTimer = null;
  }
  if (room.selectionTimer) {
    clearInterval(room.selectionTimer);
    room.selectionTimer = null;
  }
  if (room.hintTimers && room.hintTimers.length > 0) {
    room.hintTimers.forEach(t => clearTimeout(t));
    room.hintTimers = [];
  }
}

/**
 * Deletes a room explicitly
 * @param {string} code 
 */
export function deleteRoom(code) {
  const room = getRoom(code);
  if (room) {
    clearRoomTimers(room);
    rooms.delete(room.code);
  }
}

/**
 * Debugging / testing utility to list active room codes
 * @returns {string[]}
 */
export function getActiveRoomCodes() {
  return Array.from(rooms.keys());
}
