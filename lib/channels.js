import fs from 'node:fs';
import path from 'node:path';
import { ROOT, OUTPUT_DIR, readJSON, writeJSON } from './util.js';

const FILE = path.join(ROOT, 'channels.json');
const okId = (s) => /^[A-Za-z0-9_-]{1,80}$/.test(String(s || ''));

export const listChannels = () => readJSON(FILE, []);

export function saveChannel(ch) {
  const all = listChannels();
  if (!ch.id) {
    ch.id = 'ch_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    ch.createdAt = new Date().toISOString();
    ch.seed = Math.floor(Math.random() * 1e6);
  }
  if (!okId(ch.id)) throw new Error('Geçersiz kanal kimliği');
  const i = all.findIndex((c) => c.id === ch.id);
  if (i >= 0) all[i] = { ...all[i], ...ch };
  else all.push(ch);
  writeJSON(FILE, all);
  return i >= 0 ? all[i] : ch;
}

/** Yalnızca kanal kaydını siler; output/ altındaki videolar diskte kalır. */
export function removeChannel(id) {
  writeJSON(FILE, listChannels().filter((c) => c.id !== id));
}

export function videoDir(channelId, videoId) {
  if (!okId(channelId) || !okId(videoId)) throw new Error('Geçersiz yol');
  return path.join(OUTPUT_DIR, channelId, videoId);
}

export function library(channelId) {
  if (!okId(channelId)) return [];
  const dir = path.join(OUTPUT_DIR, channelId);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const meta = readJSON(path.join(dir, d.name, 'meta.json'), null);
      if (!meta) return null;
      return { ...meta, id: d.name, base: `/output/${channelId}/${d.name}/`, files: fs.readdirSync(path.join(dir, d.name)) };
    })
    .filter(Boolean)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export function removeVideo(channelId, videoId) {
  fs.rmSync(videoDir(channelId, videoId), { recursive: true, force: true });
}

/** Yapay zekasız kanal önerisi: konsept metnindeki anahtar kelimelere göre */
export function suggestOffline(concept = '') {
  const t = concept.toLowerCase();
  const rules = [
    [/hikaye|masal|story|çocuk|kids|drama/, 'story-telling'],
    [/short|reels|tiktok|hızlı|viral/, 'faceless-shorts'],
    [/finans|para|borsa|ekonomi|istatistik|veri|data|finance|iş dünyası/, 'iart-motion'],
    [/tarih|history|belgesel|documentary|siyaset|coğrafya/, 'vox-collage'],
    [/matematik|fizik|ders|okul|sınav|math|lesson/, 'khan-explainer'],
    [/eğitim|öğren|nasıl|how to|explainer|bilim|science/, 'whiteboard'],
    [/oyun|game|retro|kod|yazılım|coding/, 'pixel-studio'],
    [/motivasyon|alıntı|söz|quote|motivation|kişisel gelişim/, 'kinetic-typography'],
    [/komik|mizah|ya olsaydı|what if|funny/, 'what-if'],
  ];
  const hit = rules.find(([re]) => re.test(t));
  return { skillId: hit ? hit[1] : 'stickman-director', direction: '', ideas: [] };
}
