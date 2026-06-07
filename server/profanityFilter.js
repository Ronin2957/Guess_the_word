// A standard blacklist of inappropriate words for moderation purposes
const BLACKLIST = [
  'fuck', 'shit', 'asshole', 'bitch', 'crap', 'bastard', 'cunt', 'dick', 'pussy', 'slut',
  'nigger', 'faggot', 'retard', 'whore', 'fck', 'sh1t', 'b1tch'
];

// Generate regex patterns once
const patterns = BLACKLIST.map(word => {
  // Use word boundaries or specific variations
  return new RegExp(`\\b${word}\\b|${word}`, 'gi');
});

/**
 * Checks if a string contains profanity.
 * @param {string} text 
 * @returns {boolean}
 */
export function hasProfanity(text) {
  if (!text) return false;
  const cleanText = text.toLowerCase().trim();
  return patterns.some(regex => regex.test(cleanText));
}

/**
 * Replaces blacklisted words in a message with asterisks.
 * @param {string} text 
 * @returns {string} Cleaned text
 */
export function filterProfanity(text) {
  if (!text) return '';
  let filteredText = text;
  
  for (const word of BLACKLIST) {
    // Search for the word, matching case-insensitively and replacing it with asterisks of equivalent length
    const regex = new RegExp(word, 'gi');
    filteredText = filteredText.replace(regex, (match) => {
      return '*'.repeat(match.length);
    });
  }
  
  return filteredText;
}
