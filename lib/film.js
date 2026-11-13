// Film stüdyosu: yatay (YouTube) uzun anlatımlı kısa filmler. Yapay zeka senaryoyu bölümlere böler,
// her sahne için görsel istemi yazar; görseller Muapi ile üretilir, hareket (Ken Burns) tarayıcıda eklenir.
import { langInfo, targetLength, ACTIONS, PROPS, EMOTIONS, CAMERAS, BACKGROUNDS } from '../public/vocab.js';
import { COSTUME_NAMES, FLAGS, GROUND_ITEMS } from '../public/costumes.js';

const CHAR = 'a stylized 3D clay-render character with a large round pale bald head, tiny dot eyes, expressive eyebrows, simple soft body, wearing a plain dark hoodie';
const NOCHAR = '';

/** Video türleri: sanat stili (görsel istem eki), anlatım yönü, kamera eğilimi */
export const GENRES = [
  { id: 'discipline', name: 'Disiplin & Kendini Aş', emoji: '🔥', desc: 'Sert, sinematik motivasyon kısa filmi', char: CHAR,
    style: 'dark cinematic stylized 3D render, moody low-key lighting, strong rim light, deep shadows, subtle film grain, shallow depth of field, high contrast, 16:9 widescreen frame',
    voice: 'second person ("you"), short punchy sentences, brutal honesty, rising emotion, ends with a call to action', moods: ['dramatic','tense','hopeful'] },
  { id: 'psychology', name: 'Psikoloji & Zihin', emoji: '🧠', desc: 'Beyin, alışkanlık, davranış açıklamaları', char: CHAR,
    style: 'surreal minimal 3D illustration, symbolic scenes (brain, mazes, mirrors, strings), soft dramatic lighting, muted palette with one neon accent, film grain, 16:9',
    voice: 'curious explainer, concrete everyday examples, one insight per scene, conversational', moods: ['curious','calm','tense'] },
  { id: 'horror', name: 'Korku & Gerilim', emoji: '👻', desc: 'Karanlık, gizemli anlatı', char: NOCHAR,
    style: 'dark atmospheric digital painting, fog, single light source, desaturated teal and black palette, cinematic horror concept art, film grain, 16:9',
    voice: 'slow suspenseful narration, sensory details, short ominous sentences, twist near the end', moods: ['tense','dark'] },
  { id: 'history', name: 'Tarih Belgeseli', emoji: '🏛️', desc: 'Savaşlar, imparatorluklar, olaylar', char: NOCHAR,
    style: 'epic oil painting style, dramatic chiaroscuro, historically plausible costumes and architecture, rich earthy palette, cinematic composition, 16:9',
    voice: 'documentary narrator, vivid storytelling with dates and causes, dramatic pacing', moods: ['epic','dramatic'] },
  { id: 'war', name: 'Savaş & Askeri Tarih', emoji: '⚔️', desc: 'Muharebeler, stratejiler', char: NOCHAR,
    style: 'gritty painted concept art, smoke, dust, golden hour backlight, desaturated palette, cinematic wide shots, 16:9',
    voice: 'gripping narration, clear timeline, human stakes, respectful tone', moods: ['epic','tense'] },
  { id: 'science', name: 'Bilim & Evren', emoji: '🔭', desc: 'Uzay, fizik, doğa olayları', char: NOCHAR,
    style: 'cinematic sci-fi concept art, glowing nebulae, volumetric light, deep blues and oranges, ultra detailed, 16:9',
    voice: 'awe-filled explainer, simple analogies, build wonder, accurate facts', moods: ['wonder','calm'] },
  { id: 'explainer', name: 'Açıklayıcı Animasyon', emoji: '📊', desc: 'Temiz, renkli, öğretici', char: 'a friendly flat-vector character with round head and simple expressive face',
    style: 'clean modern flat vector illustration, bold shapes, vibrant limited palette, subtle gradients, infographic feel, 16:9',
    voice: 'clear step-by-step explainer, friendly, concrete examples', moods: ['upbeat','calm'] },
  { id: 'finance', name: 'Para & İş', emoji: '💰', desc: 'Finans, girişim, zenginlik', char: CHAR,
    style: 'polished 3D isometric render, golden accents, dark navy background, glossy materials, cinematic lighting, 16:9',
    voice: 'confident, numbers-driven, myth-busting, practical takeaways', moods: ['upbeat','dramatic'] },
  { id: 'story', name: 'Hikaye & Masal', emoji: '📖', desc: 'Çocuklara, masalsı anlatı', char: 'a charming storybook hero character with big eyes and a simple outfit',
    style: 'soft watercolor storybook illustration, warm light, gentle textures, whimsical details, 16:9',
    voice: 'warm storyteller, simple words, gentle humor, a clear moral at the end', moods: ['calm','hopeful'] },
  { id: 'fantasy', name: 'Fantastik Destan', emoji: '🐉', desc: 'Ejderhalar, krallıklar, kahramanlar', char: NOCHAR,
    style: 'epic fantasy matte painting, dramatic skies, volumetric god rays, rich saturated colors, ultra detailed, 16:9',
    voice: 'mythic storyteller, grand imagery, emotional stakes', moods: ['epic','hopeful'] },
  { id: 'anime', name: 'Anime Hikayesi', emoji: '🌸', desc: 'Anime kare tarzı', char: 'an anime protagonist with expressive eyes and windswept hair',
    style: 'anime key visual style, cel shading, dramatic sky, detailed backgrounds, vivid colors, cinematic framing, 16:9',
    voice: 'emotional first-person or close third-person narration, introspective', moods: ['hopeful','dramatic'] },
  { id: 'noir', name: 'Gizem & Gerçek Suç', emoji: '🕵️', desc: 'Dedektif, belgesel, noir', char: NOCHAR,
    style: 'noir graphic novel style, heavy ink shadows, limited red and black palette, rain and neon, cinematic angles, 16:9',
    voice: 'hard-boiled documentary narration, clues revealed gradually, suspense', moods: ['tense','dark'] },
  { id: 'tech', name: 'Teknoloji & Yapay Zeka', emoji: '🤖', desc: 'Gelecek, robotlar, siber', char: CHAR,
    style: 'neon cyberpunk 3D render, holographic interfaces, teal and magenta glow, reflective surfaces, cinematic, 16:9',
    voice: 'sharp, futuristic explainer, balanced hype and risk', moods: ['upbeat','tense'] },
  { id: 'comedy', name: 'Komedi Skeç', emoji: '😂', desc: 'Abartılı, eğlenceli çizgi', char: 'a goofy cartoon character with a big expressive face and exaggerated proportions',
    style: 'bright 2D cartoon style, thick outlines, saturated colors, exaggerated expressions, playful backgrounds, 16:9',
    voice: 'witty comedic narration, absurd escalation, punchlines', moods: ['upbeat'] },
  { id: 'nature', name: 'Doğa Belgeseli', emoji: '🌿', desc: 'Hayvanlar, ekosistemler', char: NOCHAR,
    style: 'photorealistic nature documentary frame, golden hour, shallow depth of field, ultra detailed, cinematic color grading, 16:9',
    voice: 'calm wise narrator, wonder, fascinating facts', moods: ['calm','wonder'] },
];

export const genreOf = (id) => GENRES.find((g) => g.id === id) || GENRES[0];
export const CAMS = ['zoom-in', 'zoom-out', 'pan-left', 'pan-right', 'rise', 'drift', 'push', 'tilt'];

/** 1) Ana plan: başlık, bölümler, karakter/stil kimliği, kapak */
export function outlinePrompt({ topic, genre, minutes, language, character, extra, toon, cast }) {
  const g = genreOf(genre);
  const lang = langInfo(language);
  const len = targetLength(language, minutes);
  const chars = Math.max(3, Math.min(14, Math.round(minutes / 1.5)));
  return `You are the head writer of a faceless YouTube channel that publishes cinematic illustrated narrated short films (landscape 16:9).
Genre: ${g.name} — ${g.desc}
Narration style: ${g.voice}
Topic / script seed:
"""
${topic}
"""
${extra ? `Extra direction: ${extra}\n` : ''}Total narration length: about ${minutes} minute(s) = about ${len.count} ${len.unit} in ${lang.name}.
Plan the film in ${chars} chapters that build a strong story arc: hook in the first 15 seconds, escalating middle, memorable ending.

Return ONLY JSON:
{
 "title": "click-worthy YouTube title in ${lang.name}",
 "description": "YouTube description in ${lang.name}, 3-4 sentences",
 "tags": ["8-12 tags"],
 "hook": "the exact opening line (in ${lang.name})",
 "character": ${character ? JSON.stringify(character) : `"${g.char ? 'one-sentence visual description in English of the recurring main character (keep: ' + g.char + ')' : 'empty string — no recurring character'}"`},
 "cast": ["1-2 costume names for the recurring main characters, from: ${COSTUME_NAMES.join(", ")}"],
 "look": "one sentence in English: the visual style bible (palette, lighting, medium) shared by EVERY image — build on: ${g.style}",
 "thumbnail": { "text": "1-3 BIG words for the cover in ${lang.name}", "prompt": "English image prompt for a striking cover image (no text in the image)" },${toon ? `
 "characters": ${cast?.length ? 'EXACTLY these fixed characters (keep id/name/costume; add "gender" and "personality"): ' + JSON.stringify(cast.map((c) => ({ id: c.id, name: c.name, costume: c.costume }))) : `[ { "id": "c1", "name": "a short first name fitting the story", "costume": "one of: ${COSTUME_NAMES.join(', ')}", "gender": "male|female|child", "personality": "5 words" } ]  (1-4 recurring characters; the FIRST is the main character)`},` : ''}
 "chapters": [ { "title": "...", "summary": "2 sentences: what happens / what is explained", "share": 0.0 } ]
}
"share" values are each chapter's fraction of the total runtime and must sum to 1.`;
}

/** 2) Bölüm: sahneler (anlatım + görsel istemi) */
export function chapterPrompt({ outline, index, minutes, language, genre, prevTail, done }) {
  const g = genreOf(genre);
  const lang = langInfo(language);
  const ch = outline.chapters[index];
  const total = targetLength(language, minutes);
  const share = Math.max(0.04, Number(ch.share) || 1 / outline.chapters.length);
  const count = Math.round(total.count * share);
  const perScene = lang.cpm ? 30 : 18;
  const n = Math.max(3, Math.round(count / perScene));
  if (ch.text) return verbatimPrompt({ outline, ch, lang, g, n });
  return `You are writing chapter ${index + 1} of ${outline.chapters.length} of a narrated cinematic illustrated film.
Title: "${outline.title}"
Genre: ${g.name}. Narration style: ${g.voice}
Whole film outline:
${outline.chapters.map((c, i) => `${i + 1}. ${c.title} — ${c.summary}`).join('\n')}
${prevTail ? `The previous chapter ended with: "${prevTail}" — continue smoothly, never repeat.\n` : ''}${index === 0 ? `Open with this hook: "${outline.hook}"\n` : ''}${index === outline.chapters.length - 1 ? 'This is the FINAL chapter: land the ending and a short call to action (like / subscribe) in the last scene.\n' : ''}
Write THIS chapter ("${ch.title}: ${ch.summary}") as ${n} scenes (about ${count} ${total.unit} of narration in ${lang.name} in total, ~${perScene} ${total.unit} per scene).
Each scene = one narrated beat with ONE image.
Rules for "image": English, one vivid shot description (subject, action, setting, camera angle/shot size, lighting, mood). ${outline.character ? 'When the main character appears write "the main character" (do not re-describe them). ' : ''}Vary shot sizes and locations scene to scene. NO text, letters, logos or watermarks in the image. Do not include style words (style is added automatically).
"camera" is one of: ${CAMS.join(', ')}.
Return ONLY a JSON array: [{"narration": "...", "image": "...", "camera": "zoom-in"}]`;
}

/** Güvenli sahne normalizasyonu */
export function cleanScenes(arr, offset = 0) {
  const list = Array.isArray(arr) ? arr : arr?.scenes || [];
  return list
    .map((s, i) => ({
      narration: String(s.narration || '').replace(/\s+/g, ' ').trim(),
      image: String(s.image || s.prompt || '').trim(),
      camera: CAMS.includes(s.camera) ? s.camera : CAMS[(offset + i) % CAMS.length],
    }))
    .filter((s) => s.narration && s.image);
}

/** Tam görsel istemi: sahne + karakter + stil kimliği */
export function fullImagePrompt(scene, outline, genre) {
  const g = genreOf(genre);
  const ch = outline.character || '';
  let p = scene.image;
  if (ch) p = p.replace(/\bthe main character\b/gi, ch.length < 140 ? ch : 'the main character');
  return `${p}. ${outline.look || g.style}. No text, no letters, no watermark.`;
}

/** Hazır script: anlatım AYNEN korunur, yalnızca sahnelere bölünür ve görsel istemleri yazılır */
function verbatimPrompt({ outline, ch, lang, g, n }) {
  return `You are the visual director of a narrated cinematic illustrated film titled "${outline.title}" (genre: ${g.name}).
Below is the EXACT narration for one chapter in ${lang.name}. Split it into about ${n} consecutive scenes at natural sentence boundaries. Keep every word of the narration exactly as written — do NOT rewrite, translate, shorten or reorder it. Each scene gets ONE image.
NARRATION:
"""
${ch.text}
"""
Rules for "image": English, one vivid shot description (subject, action, setting, camera angle/shot size, lighting, mood). ${outline.character ? 'When the main character appears write "the main character" (do not re-describe them). ' : ''}Vary shot sizes and locations. NO text, letters, logos or watermarks. No style words (added automatically).
"camera" is one of: ${CAMS.join(', ')}.
Return ONLY a JSON array: [{"narration": "exact words", "image": "...", "camera": "zoom-in"}]`;
}

export const MOVE_NAMES = ['stay', 'walk-in', 'pace', 'slide-in', 'hop-in', 'walk-out', 'bounce', 'spin-in', 'meet', 'approach', 'bounce-alt', 'lean-in'];

/** Hareketli çizgi film modu: görsel yok, motor karakterleri canlandırır; sahne tasarımını yapay zeka yapar */
export function toonChapterPrompt({ outline, index, minutes, language, genre, prevTail, backdrops, moody, dialogue }) {
  const g = genreOf(genre);
  const lang = langInfo(language);
  const ch = outline.chapters[index];
  const total = targetLength(language, minutes);
  const share = Math.max(0.04, Number(ch.share) || 1 / outline.chapters.length);
  const count = Math.round(total.count * share);
  const perScene = lang.cpm ? 30 : 17;
  const n = Math.max(3, Math.round(count / perScene));
  const verbatim = ch.text ? `Use EXACTLY this narration (do not rewrite or reorder; split at sentence boundaries into about ${n} scenes):\n"""\n${ch.text}\n"""\n` : `Write the narration yourself: about ${count} ${total.unit} in ${lang.name} in total, about ${n} scenes, ~${perScene} ${total.unit} per scene, 1-2 short spoken sentences each.`;
  return `You are the director of a narrated ANIMATED CARTOON film for YouTube (landscape 16:9). Clothed cartoon characters act out the story with full body animation; an engine renders them from your plan. No human in the loop.
Title: "${outline.title}"   Genre: ${g.name}. Narration style: ${g.voice}
Film outline:
${outline.chapters.map((c, i) => `${i + 1}. ${c.title} — ${c.summary}`).join('\n')}
${outline.cast?.length ? `Recurring cast (costumes): ${outline.cast.join(', ')} — keep them consistent, add others only when the story needs them.\n` : ''}${prevTail ? `The previous chapter ended with: "${prevTail}" — continue smoothly.\n` : ''}${index === 0 ? `Open with this hook: "${outline.hook}"\n` : ''}${index === outline.chapters.length - 1 ? 'FINAL chapter: land the ending and a short call to action in the last scene.\n' : ''}
THIS chapter: "${ch.title}: ${ch.summary}"
${verbatim}
Narration must sound natural when read aloud (no emojis, no stage directions).
${castBlock(outline, dialogue)}${moody ? `VISUAL STYLE: dark, moody, cinematic short-film look (like a serious motivational animated short). The MAIN character is the pale round-headed hooded character: cast[0] is ALWAYS "blob" ("blobgrey" for variety). Supporting characters only when needed, from: casual, hoodie, suit, businesswoman, doctor, police, teacher, grandpa, kid, athlete. Use dark/indoor/night backgrounds (night, home, city, office, lab, road, space, plain), strong emotions (sad, angry, tired, scared, thinking, surprised), props that tell the story (phone, laptop, clock, brain, chain, money...), and 1-3 word ALL-CAPS punchy keywords on key beats.\n` : ''}
ENGINE VOCABULARY (use ONLY these values):
- action: ${Object.keys(ACTIONS).join(', ')}
- emotion: ${EMOTIONS.join(', ')}
- props (0-3): ${PROPS.join(', ')}
- camera: ${CAMERAS.join(', ')}
- bg: ${BACKGROUNDS.join(', ')}
- characters: 1 or 2 (2 for dialogue / conflict / relationships; hug, argue, handshake need 2)
- cast: costume per character, first = main: ${COSTUME_NAMES.join(', ')}
- flags: 0-2 country codes when about countries: ${FLAGS.join(', ')}
- ground items: ${GROUND_ITEMS.join(', ')} (put them in props)
- move (how characters enter / move; optional): ${MOVE_NAMES.join(', ')}  (1 char: walk-in, pace, slide-in, hop-in, walk-out, bounce, spin-in; 2 chars: meet, approach, lean-in, bounce-alt, walk-out)
- keyword: 1-4 word on-screen text (may be "")
- speaker: "narrator" or a character id (see CHARACTERS) — who SPEAKS this scene's narration text
${backdrops ? '- backdrop: ONLY on the first scene of each NEW location (about one per 60 seconds of film; leave "" on all other scenes): English one-sentence description of the empty background place, no people, e.g. "rainy neon city street at night"\n' : ''}RULES: vary actions (never the same action 3 times in a row), vary move and camera scene to scene, match emotion to the sentence, use props as literal or metaphorical illustrations, change location when the story does.
Return ONLY a JSON array: [{"narration":"...","action":"talk","emotion":"happy","props":["lightbulb"],"keyword":"","camera":"zoom-in","bg":"city","characters":1,"cast":["casual"],"flags":[],"speaker":"narrator","move":"walk-in"${backdrops ? ',"backdrop":"..."' : ''}}]`;
}

function castBlock(outline, dialogue) {
  const chars = outline.characters || [];
  if (!chars.length) return '';
  return `CHARACTERS (fixed — same look and same VOICE every time they appear):
${chars.map((c, i) => `- ${c.id}: ${c.name} — costume "${c.costume}", ${c.gender || 'male'}${c.personality ? ', ' + c.personality : ''}${i === 0 ? ' (MAIN character)' : ''}`).join('\n')}
Each scene has ONE speaker. "narrator" = off-screen voice-over (shown with the main character acting). A character id = that character says the line out loud (write it in FIRST person, natural spoken dialogue, no quotation marks, no "he said"). ${dialogue === false ? 'Use mostly the narrator.' : chars.length > 1 ? 'Mix narrator scenes with real back-and-forth dialogue scenes (about 30-45% of scenes are dialogue; keep the same characters talking to each other over consecutive scenes).' : 'The main character may also speak some lines himself (about 25% of scenes).'}
The speaker is always shown on screen: for a character speaker put THEIR costume first in "cast".
`;
}

/** Konuşmacı → kadro/kostüm; narrator ise ana karakter oynar */
export function applySpeakers(norm, raw, outline) {
  const chars = outline.characters || [];
  if (!chars.length) return norm;
  const byId = Object.fromEntries(chars.map((c) => [c.id, c]));
  let other = chars[1] || null;
  return norm.map((sc, i) => {
    const sp = byId[String(raw[i]?.speaker || '')] ? String(raw[i].speaker) : 'narrator';
    if (sp === 'narrator') return { ...sc, speaker: 'narrator', cast: [chars[0].costume, ...(sc.characters === 2 ? [sc.cast[1] && sc.cast[1] !== chars[0].costume ? sc.cast[1] : other?.costume || 'casual'] : [])] };
    const me = byId[sp];
    const partner = chars.find((c) => c.id !== sp && c.id === (norm[i - 1] && raw[i - 1]?.speaker)) || chars.find((c) => c.id !== sp) || null;
    const two = !!partner;
    if (partner) other = partner;
    return { ...sc, speaker: sp, speakerName: me.name, characters: two ? 2 : 1, cast: two ? [me.costume, partner.costume] : [me.costume] };
  });
}
