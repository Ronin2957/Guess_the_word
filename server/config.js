export const config = {
  PORT: process.env.PORT || 3000,
  DEFAULT_SETTINGS: {
    maxPlayers: 10,
    rounds: 3,
    drawTime: 80, // seconds
    maxHints: 3,
    wordMode: 'mixed' // 'default', 'custom', 'mixed'
  },
  LIMITS: {
    minPlayers: 2,
    maxPlayers: 20,
    minRounds: 1,
    maxRounds: 10,
    minDrawTime: 30, // seconds
    maxDrawTime: 180, // seconds
    minHints: 0,
    maxHints: 5,
    maxUsernameLength: 16,
    maxCustomWords: 1000,
    maxChatMessageLength: 100
  },
  TIMING: {
    wordSelectionTime: 15, // seconds for drawer to pick a word
    turnEndDelay: 5,       // seconds to show answer before next turn
    roundEndDelay: 8,      // seconds to show round summary before next round
    gameOverDelay: 15      // seconds to show final scoreboard before lobby reset
  }
};
