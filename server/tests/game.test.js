import test from 'node:test';
import assert from 'node:assert';

import { 
  createRoom, 
  joinRoom, 
  leaveRoom, 
  getRoom 
} from '../roomManager.js';
import { 
  handleGuess 
} from '../gameLogic.js';
import { 
  filterProfanity, 
  hasProfanity 
} from '../profanityFilter.js';
import { 
  getRandomWords 
} from '../words.js';

test('Profanity Filter Tests', () => {
  // Test detection
  assert.strictEqual(hasProfanity('hello world'), false);
  assert.strictEqual(hasProfanity('you are a shit head'), true);

  // Test cleaning
  assert.strictEqual(filterProfanity('hello world'), 'hello world');
  assert.strictEqual(filterProfanity('fuck that shit'), '**** that ****');
});

test('Word Generator Tests', () => {
  const defaults = getRandomWords(5, 'default');
  assert.strictEqual(defaults.length, 5);
  
  // Custom mode
  const customs = getRandomWords(3, 'custom', ['pizza', 'burger']);
  // Should fallback or use custom words if count is larger
  assert.ok(customs.includes('pizza') || customs.includes('burger'));
});

test('Room Manager Lifecycle Tests', () => {
  const hostId = 'socket-host-123';
  const hostPlayer = { username: 'HostGuy', avatar: {} };

  // Create room
  const room = createRoom(hostId, hostPlayer);
  assert.ok(room.code);
  assert.strictEqual(room.hostId, hostId);
  assert.strictEqual(room.players.size, 1);
  assert.strictEqual(getRoom(room.code), room);

  // Join room
  const joinerId = 'socket-joiner-456';
  const joinerPlayer = { username: 'JoinerGuy', avatar: {} };
  joinRoom(room.code, joinerId, joinerPlayer);

  assert.strictEqual(room.players.size, 2);
  assert.strictEqual(room.players.get(joinerId).username, 'JoinerGuy');

  // Verify room is full prevention
  room.settings.maxPlayers = 2;
  const extraPlayer = { username: 'ExtraGuy', avatar: {} };
  assert.throws(() => {
    joinRoom(room.code, 'socket-extra-789', extraPlayer);
  }, /Room is full/);

  // Leave room: host leaves, verify migration
  const leaveResult = leaveRoom(hostId);
  assert.strictEqual(leaveResult.deleted, false);
  assert.strictEqual(leaveResult.hostMigrated, true);
  assert.strictEqual(room.hostId, joinerId); // Joiner guy is now the host!

  // Final player leaves, verify destruction
  const finalLeave = leaveRoom(joinerId);
  assert.strictEqual(finalLeave.deleted, true);
  assert.strictEqual(getRoom(room.code), null); // destroyed
});

test('Game Scoring and Guess Validation', () => {
  const room = createRoom('host', { username: 'Host' });
  joinRoom(room.code, 'player1', { username: 'Player1' });

  // Mock game state for drawing active
  room.gameState = 'drawing';
  room.currentWord = 'airplane';
  room.settings.drawTime = 80;
  room.timeRemaining = 60; // 75% of drawing time remaining
  room.currentDrawerId = 'host';

  const mockIo = {
    to: () => ({
      emit: () => {}
    })
  };

  // Drawer guesses (should be ignored)
  const drawerGuessResult = handleGuess(room, 'host', 'airplane', mockIo);
  assert.strictEqual(drawerGuessResult, false);

  // Incorrect guess
  const wrongGuessResult = handleGuess(room, 'player1', 'boat', mockIo);
  assert.strictEqual(wrongGuessResult, false);
  assert.strictEqual(room.players.get('player1').hasGuessed, false);

  // Correct guess
  const correctGuessResult = handleGuess(room, 'player1', 'airplane', mockIo);
  assert.strictEqual(correctGuessResult, true);
  
  const player = room.players.get('player1');
  assert.strictEqual(player.hasGuessed, true);
  // Points = base 100 + (60/80 * 200) = 100 + 150 = 250.
  // Plus +50 first guesser bonus = 300.
  assert.strictEqual(player.roundScore, 300);
});
