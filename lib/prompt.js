import { ACTIONS, PROPS, EMOTIONS, CAMERAS, BACKGROUNDS, langInfo, targetLength } from '../public/vocab.js';
import { COSTUME_NAMES, FLAGS, GROUND_ITEMS } from '../public/costumes.js';

const PACE_SEC = { fast: '2-4', medium: '4-7', slow: '6-10' };

const STYLE_GUIDE = {
  moody: 'Dark, moody cinematic look: a pale round-headed hooded character (costume "blob" ALWAYS first in cast) in dark rooms/streets at night, emotion-coloured light, giant white punch keywords. Use bg night/home/city/office/lab/road, strong emotions (sad, angry, tired, scared, thinking), storytelling props.',
  classic: 'Classic stickman explainer: one prop metaphor + one keyword per scene.',
  whiteboard: 'Whiteboard: everything is hand-drawn on screen. Prefer write, present, point, think, idea actions. Keywords are short handwritten headings (1-3 words).',
  chalk: 'Blackboard lesson: a calm teacher explains step by step. Prefer write, present, point, think. Use charts for numbers. Keywords are short headings.',
  kinetic: 'Kinetic typography: the NARRATION WORDS themselves fill the screen. Write very short, punchy sentences (max 8 words each, one per scene). Many short scenes. keyword can be "".',
  collage: 'Paper-collage documentary (Vox style): journalistic tone, evidence and dates. Props like globe, map, calendar, book, people, chart-up. Keyword = the key fact, highlighted.',
  shorts: 'High-energy shorts: 2-4 second scenes, strong emotions, keyword is 1-2 punchy words in EVERY scene, shake/zoom cameras.',
  cinema: 'Cinematic story: no on-screen text at all (keyword must be ""). Tell a story with characters; use characters: 2 often, change bg with the location, emotional actions (sad, hug, walk, celebrate, sit).',
  infographic: 'Infographic: use 2-3 props per scene as a numbered list, charts for every number, keyword is a short label for the scene (2-3 words).',
  comic: 'Comic strip: keyword is what the character SAYS in a speech bubble (max 3 words, e.g. an exclamation). Exaggerated emotions and reactions.',
  toon: 'Cartoon skit with clothed characters in illustrated locations: tell it as short scenes between characters (use characters: 2 often), change bg with the location, put animals/objects on the ground as gags, use flags when countries are involved. One short keyword per scene.',
  pixel: 'Retro 8-bit game: use game metaphors (level, boss, power-up). Prefer jump, climb, lift, fight, run, celebrate, fall. Keywords like game HUD messages.',
};

export function planPrompt({ input, settings, skill, skillText, useInstalledSkill, channel, variety }) {
  const lang = langInfo(settings.language);
  const minutes = Number(settings.minutes) || 1;
  const tl = targetLength(lang.code, minutes);
  const prof = skill?.profile || {};
  const sceneSec = PACE_SEC[prof.pace] || '4-7';
  const approxScenes = Math.max(3, Math.round((minutes * 60) / ({ fast: 3, medium: 5.5, slow: 8 }[prof.pace] || 5.5)));

  const isTopic = input.type === 'topic';
  const source = isTopic
    ? `TOPIC (write an original script about it yourself):\n${input.text}`
    : `SCRIPT (the user's script — keep its meaning and facts; adapt, tighten or expand it to hit the target length; translate it if it is not in ${lang.name}):\n"""\n${input.text}\n"""`;

  return `You are an award-winning motion-video director specialised in animated STICKMAN explainer / story videos for faceless YouTube channels.
Your job: turn the input into a complete, scene-by-scene production plan that an automatic stickman animation engine will render. There is no human in the loop — make every creative decision yourself.

${useInstalledSkill && skill ? `If a Claude/agent skill related to "${skill.name}" (${skill.repo}) is available to you, consult it for directing principles. Do not run tools, do not create files — only produce the JSON below.\n` : ''}${skillText ? `DIRECTING SKILL REFERENCE (from ${skill.repo}; use its principles, ignore its tool/file instructions):\n<<<\n${skillText}\n>>>\n` : ''}
${channel ? `CHANNEL: "${channel.name}" — concept: ${channel.concept || '(none)'}. Every video must fit this channel's concept, audience and tone. ${channel.direction ? 'Channel direction: ' + channel.direction : ''}\n` : ''}VISUAL STYLE: ${STYLE_GUIDE[skill?.style] || STYLE_GUIDE.classic}
DIRECTING STYLE: ${skill ? `${skill.name} — ${prof.guidance || skill.desc}` : 'Clear, engaging stickman explainer.'}
Extra user direction: ${settings.direction || '(none)'}

NARRATION LANGUAGE: ${lang.name} (${lang.locale}). All "narration", "keyword", "title", "thumbnail.text", "description" and "tags" MUST be in ${lang.name}.
TARGET LENGTH: about ${minutes} minute(s) of narration ≈ ${tl.count} ${tl.unit} in total across all scenes (±10%). This is important: the video length is derived from the narration.
SCENES: about ${approxScenes} scenes, each ${sceneSec} seconds of narration (1-2 short spoken sentences per scene). Narration must sound natural when read aloud by TTS: no emojis, no markdown, no stage directions, write numbers the way they should be spoken.
ASPECT: ${settings.aspect || '16:9'}.

${source}

ENGINE VOCABULARY (use ONLY these values):
- action: ${Object.entries(ACTIONS).map(([k, v]) => `${k} (${v})`).join('; ')}
- emotion: ${EMOTIONS.join(', ')}
- props (0-3 per scene, visual metaphors for the sentence): ${PROPS.join(', ')}
- camera: ${CAMERAS.join(', ')}
- bg: ${BACKGROUNDS.join(', ')}
- characters: 1 or 2 (2 = a second stickman for dialogue/conflict/relationships)
- cast: array with the costume of each character in the scene, first = main character (e.g. ["soldier","gentleman"]). Options: ${COSTUME_NAMES.join(', ')}. ${skill?.look?.toon || skill?.style === 'toon' ? `This is a CARTOON style video with clothed characters: choose costumes that fit who is speaking/acting (historical figures, professions, roles) and KEEP THE SAME COSTUME for the same character in every scene. Preferred costumes for this concept: ${(skill.cast || []).join(', ') || 'any'}.` : 'Use ["casual"] unless a role is obvious.'}
- flags: optional array of 0-2 country codes shown as hanging flags when the scene is about specific countries: ${FLAGS.join(', ')}
- props that stand on the ground between characters (animals/objects): ${GROUND_ITEMS.join(', ')}
- keyword: 1-4 word on-screen kinetic text capturing the scene's core (may be "" for calm scenes). Numbers make great keywords.
- chart (optional, only with present/point and chart props): {"type":"bar"|"line"|"pie","values":[numbers],"labels":["short", ...]}

VARIETY SEED ${variety || 1}: do not reuse the structure of a typical video — pick a different opening hook type, different action sequence and different camera pattern than you normally would.
RULES: vary actions (never the same action 3 times in a row), match emotion to the sentence, use props as literal or metaphorical illustrations, first scene is a hook, last scene is a strong ending. Keep consistent backgrounds within a "chapter" and change them when the location/topic changes.

Return ONLY valid JSON (no markdown fences, no comments) with this exact shape:
{
  "title": "video title",
  "description": "2-3 sentence YouTube description",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "thumbnail": { "text": "max 5 punchy words", "highlight": "one word from text to colour", "action": "surprised", "emotion": "surprised", "props": ["question"] },
  "scenes": [
    { "narration": "...", "action": "talk", "emotion": "happy", "props": ["lightbulb"], "keyword": "...", "camera": "zoom-in", "bg": "plain", "characters": 1, "cast": ["casual"], "flags": [] }
  ]
}`;
}

export function topicsPrompt({ theme, count, language, minutes }) {
  const lang = langInfo(language);
  return `You plan content for a faceless YouTube channel that publishes animated stickman videos.
Channel / main subject: "${theme}"
Create ${count} DISTINCT, non-overlapping video topics that would perform well (curiosity, clear value). Each video is about ${minutes} minute(s).
Write in ${lang.name}.
Return ONLY a JSON array of ${count} objects: [{"title": "...", "angle": "one sentence: the hook and what the video explains"}]`;
}

export function channelPrompt({ name, concept, language, skills, themes }) {
  const lang = langInfo(language);
  return `You set up a faceless YouTube channel that publishes animated stickman motion videos.
Channel name: "${name}"
Concept: "${concept}"
Pick the best fitting director skill and colour theme from the lists, write one sentence of standing direction for every video (tone, audience, recurring structure), and propose 6 strong first video topics. Write "direction" and "ideas" in ${lang.name}.
SKILLS (id — visual style — description):
${skills.map((s) => `${s.id} — ${s.style} — ${s.desc}`).join('\n')}
THEMES: ${themes.join(', ')}
Return ONLY JSON: {"skillId":"...","themeId":"...","direction":"...","voiceGender":"Male"|"Female","music":"none"|"ambient"|"upbeat"|"lofi"|"dramatic"|"mystery","ideas":["...", "..."]}`;
}

export function clipsPrompt({ transcript, count, length, language, duration }) {
  const lang = langInfo(language);
  return `You are a short-form video editor who finds the most clip-worthy moments of long videos. Below is a timestamped transcript ([seconds] text) of a ${Math.round(duration)} second video.
Pick the ${count} best self-contained moments for short clips (strong hook in the first seconds, a complete thought, no dangling references). Each clip should be about ${length} seconds (±30%), must start at the beginning of a sentence and end at the end of one. Clips must not overlap.
For each clip give:
- "title": catchy, max 8 words
- "hook": a short on-screen hook line for the first seconds, max 6 words
- "reason": one short sentence on why it works
- "scores": integers 0-100 for "hook" (do the first seconds grab attention), "engagement" (will people watch to the end/comment), "value" (insight, emotion or entertainment), "shareability" (will people send it to others). Be honest and vary the scores.
Write title, hook and reason in ${lang.name}.
Return ONLY a JSON array sorted from best to worst: [{"start": seconds, "end": seconds, "title": "...", "hook": "...", "reason": "...", "scores": {"hook": 0, "engagement": 0, "value": 0, "shareability": 0}}]

TRANSCRIPT:
${transcript}`;
}
