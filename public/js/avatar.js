export const SKIN_COLORS = ['#ffdbac', '#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffad60', '#ffd1a9', '#47240c'];
export const BG_COLORS = ['#312e81', '#1e1b4b', '#0369a1', '#0f766e', '#1e3a8a', '#581c87', '#701a75', '#451a03', '#064e3b', '#0f172a'];

export const EYES_OPTIONS = [
  { id: 'normal', name: 'Normal', render: () => `
    <circle cx="40" cy="45" r="3" fill="#000" />
    <circle cx="60" cy="45" r="3" fill="#000" />
  ` },
  { id: 'happy', name: 'Happy', render: () => `
    <path d="M 35 48 Q 40 40 45 48" stroke="#000" stroke-width="2.5" stroke-linecap="round" fill="none" />
    <path d="M 55 48 Q 60 40 65 48" stroke="#000" stroke-width="2.5" stroke-linecap="round" fill="none" />
  ` },
  { id: 'glasses', name: 'Cool Glasses', render: () => `
    <rect x="32" y="40" width="14" height="10" rx="3" fill="#000" />
    <rect x="54" y="40" width="14" height="10" rx="3" fill="#000" />
    <line x1="46" y1="45" x2="54" y2="45" stroke="#000" stroke-width="3.5" />
    <line x1="30" y1="43" x2="33" y2="43" stroke="#000" stroke-width="2" />
    <line x1="67" y1="43" x2="70" y2="43" stroke="#000" stroke-width="2" />
  ` },
  { id: 'cute', name: 'Cute Anime', render: () => `
    <circle cx="39" cy="45" r="4.5" fill="#111" />
    <circle cx="61" cy="45" r="4.5" fill="#111" />
    <circle cx="37.5" cy="43.5" r="1.5" fill="#fff" />
    <circle cx="59.5" cy="43.5" r="1.5" fill="#fff" />
    <circle cx="40.5" cy="46.5" r="0.8" fill="#fff" />
    <circle cx="62.5" cy="46.5" r="0.8" fill="#fff" />
  ` },
  { id: 'sleepy', name: 'Sleepy', render: () => `
    <line x1="34" y1="45" x2="44" y2="45" stroke="#000" stroke-width="2.5" stroke-linecap="round" />
    <line x1="56" y1="45" x2="66" y2="45" stroke="#000" stroke-width="2.5" stroke-linecap="round" />
    <path d="M 39 48 L 41 50 L 43 48" stroke="#000" stroke-width="1.5" stroke-linecap="round" fill="none" />
    <path d="M 61 48 L 63 50 L 65 48" stroke="#000" stroke-width="1.5" stroke-linecap="round" fill="none" />
  ` },
  { id: 'wink', name: 'Wink', render: () => `
    <circle cx="39" cy="45" r="3" fill="#000" />
    <path d="M 55 46 Q 60 40 65 46" stroke="#000" stroke-width="2.5" stroke-linecap="round" fill="none" />
  ` }
];

export const MOUTH_OPTIONS = [
  { id: 'smile', name: 'Smile', render: () => `
    <path d="M 40 58 Q 50 68 60 58" stroke="#000" stroke-width="2.5" stroke-linecap="round" fill="none" />
  ` },
  { id: 'teeth', name: 'Big Smile', render: () => `
    <path d="M 38 56 C 38 68, 62 68, 62 56 Z" fill="#000" />
    <path d="M 40 57 C 43 60, 57 60, 60 57" fill="#fff" />
    <path d="M 44 63 Q 50 66 56 63" fill="#ff7f7f" />
  ` },
  { id: 'neutral', name: 'Neutral', render: () => `
    <line x1="42" y1="60" x2="58" y2="60" stroke="#000" stroke-width="2.5" stroke-linecap="round" />
  ` },
  { id: 'sad', name: 'Frown', render: () => `
    <path d="M 40 64 Q 50 56 60 64" stroke="#000" stroke-width="2.5" stroke-linecap="round" fill="none" />
  ` },
  { id: 'surprised', name: 'Surprised', render: () => `
    <ellipse cx="50" cy="61" rx="4" ry="6" fill="#000" />
  ` },
  { id: 'silly', name: 'Silly Tongue', render: () => `
    <line x1="42" y1="58" x2="58" y2="58" stroke="#000" stroke-width="2.5" stroke-linecap="round" />
    <path d="M 46 58 C 46 64, 52 64, 52 58 Z" fill="#ef4444" />
  ` }
];

// ============ AVATAR STYLE (Boy / Girl) ============
export const STYLE_OPTIONS = [
  { id: 'boy', name: 'Boy', render: (skin) => `
    <!-- Short spiky hair -->
    <path d="M 29 42 Q 29 22, 50 20 Q 71 22, 71 42" fill="#3b2f1f" />
    <path d="M 32 30 Q 34 22, 40 24" fill="#3b2f1f" />
    <path d="M 42 26 Q 46 18, 50 22" fill="#3b2f1f" />
    <path d="M 54 22 Q 58 16, 62 24" fill="#3b2f1f" />
    <path d="M 64 26 Q 68 22, 68 30" fill="#3b2f1f" />
    <!-- Simple body -->
    <path d="M 18 82 Q 50 68 82 82 L 84 100 L 16 100 Z" fill="#6366f1" />
    <path d="M 42 72 Q 50 76 58 72" stroke="#4338ca" stroke-width="2" fill="none" />
  ` },
  { id: 'girl', name: 'Girl', render: (skin) => `
    <!-- Long wavy hair -->
    <path d="M 28 42 Q 26 20, 50 18 Q 74 20, 72 42" fill="#5c3317" />
    <!-- Side hair strands -->
    <path d="M 28 42 Q 24 55, 26 68 Q 28 72, 30 68 Q 28 55, 30 42" fill="#5c3317" />
    <path d="M 72 42 Q 76 55, 74 68 Q 72 72, 70 68 Q 72 55, 70 42" fill="#5c3317" />
    <!-- Top hair bump -->
    <path d="M 32 28 Q 40 16, 50 18 Q 60 16, 68 28" fill="#5c3317" />
    <!-- Eyelashes -->
    <line x1="36" y1="41" x2="34" y2="39" stroke="#000" stroke-width="1" stroke-linecap="round" />
    <line x1="44" y1="41" x2="46" y2="39" stroke="#000" stroke-width="1" stroke-linecap="round" />
    <line x1="56" y1="41" x2="54" y2="39" stroke="#000" stroke-width="1" stroke-linecap="round" />
    <line x1="64" y1="41" x2="66" y2="39" stroke="#000" stroke-width="1" stroke-linecap="round" />
    <!-- Simple top with collar -->
    <path d="M 18 82 Q 50 68 82 82 L 84 100 L 16 100 Z" fill="#ec4899" />
    <path d="M 40 72 Q 50 78 60 72" stroke="#db2777" stroke-width="2" fill="none" />
  ` }
];

// ============ ACCESSORIES ============
export const ACCESSORY_OPTIONS = [
  { id: 'none', name: 'None', render: () => `` },
  { id: 'beanie', name: 'Beanie', render: () => `
    <ellipse cx="50" cy="28" rx="22" ry="8" fill="#333" />
    <path d="M 28 28 Q 28 18, 50 16 Q 72 18, 72 28" fill="#333" />
    <line x1="28" y1="28" x2="72" y2="28" stroke="#ef4444" stroke-width="3" />
    <circle cx="50" cy="14" r="3" fill="#333" />
  ` },
  { id: 'cap', name: 'Baseball Cap', render: () => `
    <path d="M 28 32 Q 28 18, 50 16 Q 72 18, 72 32" fill="#3b82f6" />
    <rect x="22" y="30" width="36" height="5" rx="2" fill="#2563eb" />
    <line x1="28" y1="30" x2="72" y2="30" stroke="#1d4ed8" stroke-width="1.5" />
  ` },
  { id: 'crown', name: 'Crown', render: () => `
    <path d="M 32 30 L 36 18 L 43 26 L 50 14 L 57 26 L 64 18 L 68 30 Z" fill="#fbbf24" stroke="#f59e0b" stroke-width="1" />
    <circle cx="36" cy="18" r="2" fill="#ef4444" />
    <circle cx="50" cy="14" r="2" fill="#3b82f6" />
    <circle cx="64" cy="18" r="2" fill="#10b981" />
  ` },
  { id: 'bow', name: 'Hair Bow', render: () => `
    <circle cx="35" cy="28" r="2.5" fill="#ec4899" />
    <path d="M 35 28 C 26 20, 22 28, 30 30 Z" fill="#ec4899" />
    <path d="M 35 28 C 26 36, 22 28, 30 26 Z" fill="#ec4899" />
    <path d="M 35 28 C 44 20, 48 28, 40 30 Z" fill="#f472b6" />
    <path d="M 35 28 C 44 36, 48 28, 40 26 Z" fill="#f472b6" />
  ` },
  { id: 'headband', name: 'Headband', render: () => `
    <path d="M 29 34 Q 29 24, 50 22 Q 71 24, 71 34" fill="none" stroke="#8b5cf6" stroke-width="4" stroke-linecap="round" />
    <circle cx="50" cy="22" r="3" fill="#a78bfa" />
  ` },
  { id: 'tophat', name: 'Top Hat', render: () => `
    <rect x="36" y="8" width="28" height="22" rx="3" fill="#1e293b" />
    <rect x="30" y="28" width="40" height="5" rx="2" fill="#1e293b" />
    <rect x="30" y="28" width="40" height="2" rx="1" fill="#6366f1" />
  ` },
  { id: 'partyhat', name: 'Party Hat', render: () => `
    <path d="M 50 6 L 34 30 L 66 30 Z" fill="#f59e0b" />
    <circle cx="50" cy="6" r="3" fill="#ef4444" />
    <line x1="38" y1="24" x2="62" y2="24" stroke="#ec4899" stroke-width="1.5" stroke-dasharray="3,2" />
    <line x1="42" y1="18" x2="58" y2="18" stroke="#3b82f6" stroke-width="1.5" stroke-dasharray="3,2" />
    <line x1="46" y1="12" x2="54" y2="12" stroke="#10b981" stroke-width="1.5" stroke-dasharray="3,2" />
  ` },
  { id: 'horns', name: 'Devil Horns', render: () => `
    <path d="M 32 32 L 26 14 Q 30 18, 34 24" fill="#ef4444" />
    <path d="M 68 32 L 74 14 Q 70 18, 66 24" fill="#ef4444" />
  ` },
  { id: 'halo', name: 'Angel Halo', render: () => `
    <ellipse cx="50" cy="18" rx="18" ry="5" fill="none" stroke="#fbbf24" stroke-width="3" opacity="0.85" />
    <ellipse cx="50" cy="18" rx="18" ry="5" fill="none" stroke="#fef08a" stroke-width="1" opacity="0.5" />
  ` },
  { id: 'earrings', name: 'Earrings', render: () => `
    <circle cx="28" cy="50" r="3" fill="#fbbf24" stroke="#f59e0b" stroke-width="1" />
    <circle cx="72" cy="50" r="3" fill="#fbbf24" stroke="#f59e0b" stroke-width="1" />
    <circle cx="28" cy="54" r="1.5" fill="#ef4444" />
    <circle cx="72" cy="54" r="1.5" fill="#ef4444" />
  ` }
];

/**
 * Returns a set of random options matching the available choices.
 * @returns {object}
 */
export function getRandomAvatarOptions() {
  return {
    skin: SKIN_COLORS[Math.floor(Math.random() * SKIN_COLORS.length)],
    bg: BG_COLORS[Math.floor(Math.random() * BG_COLORS.length)],
    style: STYLE_OPTIONS[Math.floor(Math.random() * STYLE_OPTIONS.length)].id,
    eyes: EYES_OPTIONS[Math.floor(Math.random() * EYES_OPTIONS.length)].id,
    mouth: MOUTH_OPTIONS[Math.floor(Math.random() * MOUTH_OPTIONS.length)].id,
    accessory: ACCESSORY_OPTIONS[Math.floor(Math.random() * ACCESSORY_OPTIONS.length)].id
  };
}

/**
 * Returns the SVG string for the specified options.
 * @param {object} options 
 * @returns {string}
 */
export function generateAvatarSVG(options) {
  const { skin, bg, style, eyes, mouth, accessory } = options;
  
  const styleObj = STYLE_OPTIONS.find(s => s.id === style) || STYLE_OPTIONS[0];
  const eyesObj = EYES_OPTIONS.find(e => e.id === eyes) || EYES_OPTIONS[0];
  const mouthObj = MOUTH_OPTIONS.find(m => m.id === mouth) || MOUTH_OPTIONS[0];
  const accessoryObj = ACCESSORY_OPTIONS.find(a => a.id === accessory) || ACCESSORY_OPTIONS[0];

  // Compose complete SVG layers: Bg -> Neck -> Body/Clothes+Hair -> Face -> Eyes + Mouth -> Accessory
  // Viewbox: 0 0 100 100
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%" class="avatar-svg" style="border-radius: 50%;">
      <!-- Background -->
      <circle cx="50" cy="50" r="50" fill="${bg}" />
      
      <!-- Neck -->
      <rect x="42" y="60" width="16" height="22" fill="${skin}" rx="5" />
      
      <!-- Face -->
      <circle cx="50" cy="45" r="21" fill="${skin}" />

      <!-- Style: Hair + Body -->
      ${styleObj.render(skin)}
      
      <!-- Cheeks/Blush -->
      <circle cx="33" cy="49" r="2" fill="#ff7f7f" opacity="0.3" />
      <circle cx="67" cy="49" r="2" fill="#ff7f7f" opacity="0.3" />

      <!-- Eyes -->
      ${eyesObj.render()}
      
      <!-- Mouth -->
      ${mouthObj.render()}

      <!-- Accessory -->
      ${accessoryObj.render()}
    </svg>
  `.replace(/[\r\n\t]/g, '').trim();
}

/**
 * Saves avatar state in browser localStorage
 * @param {object} options 
 */
export function saveAvatarToStorage(options) {
  localStorage.setItem('gamedraw_avatar', JSON.stringify(options));
}

/**
 * Recovers avatar state from local storage or returns a random one
 * @returns {object}
 */
export function getSavedOrRandomAvatar() {
  const saved = localStorage.getItem('gamedraw_avatar');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // Double check validity of properties
      if (parsed.skin && parsed.bg && parsed.eyes) {
        // Migrate old avatars
        if (!parsed.accessory) parsed.accessory = 'none';
        if (!parsed.style) parsed.style = 'boy';
        // Remove old fields
        delete parsed.clothes;
        delete parsed.clothesColor;
        return parsed;
      }
    } catch (e) {
      // Ignore parse errors
    }
  }
  const random = getRandomAvatarOptions();
  saveAvatarToStorage(random);
  return random;
}
