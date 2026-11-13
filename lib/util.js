import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const IS_WIN = process.platform === 'win32';
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DATA_DIR = path.join(ROOT, 'data');
export const OUTPUT_DIR = path.join(ROOT, 'output');
export const CACHE_DIR = path.join(ROOT, 'cache');
export const WORK_DIR = path.join(ROOT, 'work');
export const HOME = os.homedir();

for (const d of [OUTPUT_DIR, CACHE_DIR, WORK_DIR]) fs.mkdirSync(d, { recursive: true });

// Finder/çift tıkla açılan oturumlarda PATH kısıtlıdır → CLI'ların yaygın kurulum yerlerini ekle
(() => {
  const sep = IS_WIN ? ';' : ':';
  const extra = [
    path.join(HOME, '.local', 'bin'), path.join(HOME, '.claude', 'local'), path.join(HOME, '.claude', 'bin'),
    '/opt/homebrew/bin', '/usr/local/bin', path.join(HOME, '.npm-global', 'bin'), path.join(HOME, '.bun', 'bin'),
    path.join(HOME, '.volta', 'bin'), path.join(HOME, '.yarn', 'bin'), path.join(HOME, 'Library', 'pnpm'),
  ];
  try { const nvm = path.join(HOME, '.nvm', 'versions', 'node'); for (const v of fs.readdirSync(nvm)) extra.push(path.join(nvm, v, 'bin')); } catch {}
  try { const py = path.join(HOME, 'Library', 'Python'); for (const v of fs.readdirSync(py)) extra.push(path.join(py, v, 'bin')); } catch {}
  if (IS_WIN && process.env.APPDATA) extra.push(path.join(process.env.APPDATA, 'npm'));
  const cur = (process.env.PATH || '').split(sep);
  process.env.PATH = [...cur, ...extra.filter((d) => !cur.includes(d) && fs.existsSync(d))].join(sep);
})();

/**
 * Bir komutu çalıştırır. stdin'e metin yazılabilir. Windows'ta .cmd shim'leri için shell kullanılır.
 */
export function run(cmd, args = [], { input, timeout = 15 * 60 * 1000, cwd, env } = {}) {
  return new Promise((resolve, reject) => {
    let child;
    // Windows'ta shell:true argümanları tırnaklamaz → boşluklu yollar için elle tırnakla
    if (IS_WIN) args = args.map((a) => (/[\s"&|<>^]/.test(a) ? `"${String(a).replace(/"/g, '""')}"` : a));
    try {
      child = spawn(cmd, args, {
        cwd: cwd || os.tmpdir(),
        env: { ...process.env, ...(env || {}) },
        shell: IS_WIN,
        windowsHide: true,
      });
    } catch (e) {
      return reject(e);
    }
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`${cmd} zaman aşımına uğradı (${Math.round(timeout / 1000)} sn)`));
    }, timeout);
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('error', (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve({ stdout, stderr, code });
      else {
        const err = new Error(`${cmd} çıkış kodu ${code}: ${(stderr || stdout).slice(-1500)}`);
        err.stdout = stdout;
        err.stderr = stderr;
        err.code = code;
        reject(err);
      }
    });
    if (input != null) {
      child.stdin.on('error', () => {});
      child.stdin.write(input);
    }
    child.stdin.end();
  });
}

const whichCache = new Map();
export async function hasCommand(cmd, versionArgs = ['--version']) {
  const key = cmd + ' ' + versionArgs.join(' ');
  if (whichCache.has(key)) return whichCache.get(key);
  let ok = false;
  let version = '';
  try {
    const r = await run(cmd, versionArgs, { timeout: 20000 });
    ok = true;
    version = (r.stdout || r.stderr).trim().split('\n')[0].slice(0, 80);
  } catch {
    ok = false;
  }
  const res = { ok, version };
  whichCache.set(key, res);
  return res;
}
export function clearCommandCache() {
  whichCache.clear();
}

export function hash(s) {
  return crypto.createHash('sha1').update(s).digest('hex').slice(0, 16);
}

export function readJSON(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

export function writeJSON(file, obj) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(obj, null, 2));
}

/** LLM çıktısından JSON nesnesini/dizisini çıkarır. */
export function extractJSON(text) {
  if (!text) throw new Error('Boş yanıt');
  let t = String(text).trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const firstObj = t.indexOf('{');
  const firstArr = t.indexOf('[');
  let start = -1;
  let endCh = '}';
  if (firstObj === -1 && firstArr === -1) throw new Error('Yanıtta JSON bulunamadı');
  if (firstArr !== -1 && (firstObj === -1 || firstArr < firstObj)) {
    start = firstArr;
    endCh = ']';
  } else start = firstObj;
  const end = t.lastIndexOf(endCh);
  const slice = t.slice(start, end + 1);
  try {
    return JSON.parse(slice);
  } catch (e) {
    // Sık görülen hatalar: sondaki virgüller
    const cleaned = slice.replace(/,\s*([}\]])/g, '$1');
    return JSON.parse(cleaned);
  }
}

export function safeName(s, max = 60) {
  return (
    String(s || 'video')
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/ı/g, 'i')
      .replace(/[^a-zA-Z0-9-_ ]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, max) || 'video'
  );
}
