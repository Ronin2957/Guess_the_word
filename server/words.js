// A rich collection of default drawing words categorized by complexity
export const EASY_WORDS = [
  'apple', 'banana', 'cat', 'dog', 'sun', 'moon', 'star', 'house', 'tree', 'flower',
  'car', 'boat', 'hat', 'shoe', 'ball', 'book', 'pen', 'cup', 'spoon', 'fork',
  'fish', 'bird', 'milk', 'cake', 'egg', 'door', 'ring', 'key', 'clock', 'bed',
  'chair', 'table', 'snow', 'rain', 'fire', 'wind', 'leaf', 'grass', 'hill', 'hand',
  'foot', 'nose', 'eyes', 'ears', 'mouth', 'baby', 'king', 'cow', 'pig', 'duck'
];

export const MEDIUM_WORDS = [
  'airplane', 'bicycle', 'computer', 'keyboard', 'telephone', 'television', 'guitar', 'piano', 'violin', 'trumpet',
  'dinosaur', 'elephant', 'giraffe', 'octopus', 'penguin', 'dolphin', 'kangaroo', 'butterfly', 'spider', 'scorpion',
  'castle', 'pyramid', 'bridge', 'rainbow', 'volcano', 'waterfall', 'island', 'desert', 'forest', 'jungle',
  'doctor', 'nurse', 'police', 'fireman', 'chef', 'artist', 'astronaut', 'pirate', 'wizard', 'monster',
  'hamburger', 'pizza', 'sandwich', 'ice cream', 'chocolate', 'popcorn', 'spaghetti', 'cookie', 'strawberry', 'pineapple'
];

export const HARD_WORDS = [
  'backbone', 'brainstorm', 'lighthouse', 'skyscraper', 'rollercoaster', 'spaceship', 'submarine', 'helicopter', 'microscope', 'telescope',
  'earthquake', 'avalanche', 'hurricane', 'tornado', 'thunderstorm', 'eclipse', 'constellation', 'gravity', 'magnet', 'electricity',
  'archeologist', 'detective', 'blacksmith', 'scuba diver', 'gymnast', 'puppeteer', 'referee', 'librarian', 'optometrist', 'meteorologist',
  'spaghetti', 'marshmallow', 'croissant', 'avocado', 'pomegranate', 'artichoke', 'caterpillar', 'chameleon', 'jellyfish', 'platypus'
];

// Combines all default lists
export const DEFAULT_WORDS = [...EASY_WORDS, ...MEDIUM_WORDS, ...HARD_WORDS];

/**
 * Returns list of random words based on settings
 * @param {number} count Number of words to select
 * @param {string} wordMode 'default', 'custom', or 'mixed'
 * @param {string[]} customWords Array of custom words provided by room
 */
export function getRandomWords(count, wordMode, customWords = []) {
  const cleanCustomWords = (customWords || [])
    .map(w => w.trim().toLowerCase())
    .filter(w => w.length > 0);

  // Remove duplicates from custom words
  const uniqueCustom = Array.from(new Set(cleanCustomWords));

  let selected = [];

  if (wordMode === 'custom') {
    selected = [...uniqueCustom];
  } else if (wordMode === 'mixed') {
    // For mixed, combine both sets uniquely and shuffle
    const pool = Array.from(new Set([...uniqueCustom, ...DEFAULT_WORDS]));
    const shuffled = pool.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  } else {
    // Default mode
    const shuffled = [...DEFAULT_WORDS].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  // For custom mode, if we have enough custom words, shuffle and slice
  if (selected.length >= count) {
    const shuffled = selected.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  // If we have fewer custom words than count, keep all of them and pad with default words
  const remainingCount = count - selected.length;
  const defaultPool = DEFAULT_WORDS.filter(w => !selected.includes(w));
  const shuffledDefaults = defaultPool.sort(() => 0.5 - Math.random());
  
  selected = [...selected, ...shuffledDefaults.slice(0, remainingCount)];
  
  // Shuffle final selection so custom words aren't always in the first positions
  return selected.sort(() => 0.5 - Math.random());
}
