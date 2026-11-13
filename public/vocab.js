// Sunucu (prompt) ve render motoru tarafından ortak kullanılan sözlük.
export const ACTIONS = {
  idle: 'stands calmly, breathing',
  talk: 'explains with hand gestures (default for narration)',
  walk: 'walks across the scene',
  run: 'runs fast, urgency',
  point: 'points at the prop / idea',
  present: 'presents a board or chart',
  think: 'hand on chin, thinking',
  idea: 'sudden realization, lightbulb moment',
  celebrate: 'arms up, jumping with joy',
  sad: 'slumped, head down',
  cry: 'crying, wiping tears',
  angry: 'fists clenched, stomping',
  scared: 'arms up, shaking in fear',
  surprised: 'jumps back in shock',
  shrug: 'shrugs, unsure',
  wave: 'waves hello / goodbye',
  jump: 'jumps up',
  sit: 'sits on a chair / box',
  sleep: 'sleeping, zzz',
  facepalm: 'facepalm, frustration',
  push: 'pushes a heavy block, struggle',
  climb: 'climbs stairs, progress',
  fall: 'trips and falls, failure',
  dance: 'dances happily',
  meditate: 'meditates calmly, floating',
  write: 'writes on a board',
  phone: 'looks at a phone',
  type: 'types on a laptop',
  lift: 'lifts a trophy / weight overhead',
  fight: 'fighting stance, punching',
  hug: 'hugs (best with characters: 2)',
  argue: 'two people arguing (characters: 2)',
  handshake: 'two people agreeing (characters: 2)',
};

export const PROPS = [
  'lightbulb', 'question', 'exclamation', 'money', 'coin', 'heart', 'broken-heart', 'clock', 'hourglass',
  'phone', 'laptop', 'book', 'globe', 'chart-up', 'chart-down', 'pie-chart', 'rocket', 'tree', 'house',
  'sun', 'moon', 'cloud', 'rain', 'lightning', 'fire', 'star', 'warning', 'check', 'cross', 'brain',
  'gear', 'trophy', 'magnifier', 'lock', 'key', 'gift', 'coffee', 'car', 'mountain', 'flag', 'target',
  'battery-low', 'battery-full', 'calendar', 'mail', 'camera', 'music', 'crown', 'shield', 'plant',
  'arrow-up', 'arrow-down', 'thumbs-up', 'thumbs-down', 'speech', 'people', 'dna', 'atom', 'pill',
  'apple', 'bomb', 'skull', 'zzz', 'stairs', 'door', 'map', 'pen', 'wifi', 'bell', 'eye', 'hand-coins',
  'pig', 'dog', 'cat', 'cow', 'sheep', 'chicken', 'campfire', 'chest', 'rock', 'sword',
];

export const EMOTIONS = ['neutral', 'happy', 'sad', 'angry', 'surprised', 'thinking', 'scared', 'excited', 'tired', 'love'];

export const CAMERAS = ['static', 'zoom-in', 'zoom-out', 'pan-left', 'pan-right', 'shake', 'push', 'tilt', 'drift', 'rise', 'whip'];

export const BACKGROUNDS = ['plain', 'city', 'nature', 'office', 'space', 'home', 'classroom', 'lab', 'night', 'desert', 'ocean', 'road', 'stage'];

export const LANGUAGES = [
  { code: 'tr', name: 'Türkçe', locale: 'tr-TR', wpm: 130 },
  { code: 'en', name: 'English', locale: 'en-US', wpm: 150 },
  { code: 'de', name: 'Deutsch', locale: 'de-DE', wpm: 130 },
  { code: 'fr', name: 'Français', locale: 'fr-FR', wpm: 145 },
  { code: 'es', name: 'Español', locale: 'es-ES', wpm: 155 },
  { code: 'it', name: 'Italiano', locale: 'it-IT', wpm: 150 },
  { code: 'pt', name: 'Português', locale: 'pt-BR', wpm: 150 },
  { code: 'ru', name: 'Русский', locale: 'ru-RU', wpm: 125 },
  { code: 'ar', name: 'العربية', locale: 'ar-SA', wpm: 120 },
  { code: 'az', name: 'Azərbaycanca', locale: 'az-AZ', wpm: 130 },
  { code: 'nl', name: 'Nederlands', locale: 'nl-NL', wpm: 145 },
  { code: 'pl', name: 'Polski', locale: 'pl-PL', wpm: 130 },
  { code: 'uk', name: 'Українська', locale: 'uk-UA', wpm: 125 },
  { code: 'ja', name: '日本語', locale: 'ja-JP', wpm: 0, cpm: 330 },
  { code: 'ko', name: '한국어', locale: 'ko-KR', wpm: 0, cpm: 300 },
  { code: 'zh', name: '中文', locale: 'zh-CN', wpm: 0, cpm: 260 },
  { code: 'hi', name: 'हिन्दी', locale: 'hi-IN', wpm: 140 },
  { code: 'id', name: 'Bahasa Indonesia', locale: 'id-ID', wpm: 140 },
  { code: 'fa', name: 'فارسی', locale: 'fa-IR', wpm: 125 },
  { code: 'el', name: 'Ελληνικά', locale: 'el-GR', wpm: 130 },
  { code: 'sv', name: 'Svenska', locale: 'sv-SE', wpm: 140 },
  { code: 'ro', name: 'Română', locale: 'ro-RO', wpm: 140 },
  { code: 'vi', name: 'Tiếng Việt', locale: 'vi-VN', wpm: 140 },
  { code: 'th', name: 'ไทย', locale: 'th-TH', wpm: 0, cpm: 280 },
];

export function langInfo(code) {
  return LANGUAGES.find((l) => l.code === code) || LANGUAGES[0];
}

/** Hedef dakikaya göre anlatım uzunluğu */
export function targetLength(code, minutes) {
  const l = langInfo(code);
  if (l.cpm) return { unit: 'characters', count: Math.round(l.cpm * minutes) };
  return { unit: 'words', count: Math.round(l.wpm * minutes) };
}
