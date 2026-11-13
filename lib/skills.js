import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR, HOME, readJSON, run } from './util.js';

export const SKILLS_SRC = path.join(HOME, '.motion-studio', 'skills-src');
export const CLAUDE_SKILLS = path.join(HOME, '.claude', 'skills');

export function catalog() {
  return readJSON(path.join(DATA_DIR, 'skills.json'), []);
}

function repoDir(repo) {
  return path.join(SKILLS_SRC, repo.replace('/', '__'));
}

/** Bir klasördeki SKILL.md dosyalarını (derinlik ≤ 5) bulur */
function findSkillFiles(dir, depth = 0, out = []) {
  if (depth > 5 || !fs.existsSync(dir)) return out;
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === '.git') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) findSkillFiles(p, depth + 1, out);
    else if (e.name.toLowerCase() === 'skill.md') out.push(p);
  }
  return out;
}

export function skillStatus(skill) {
  if (!skill.repo) return { installed: false, skillFiles: 0, skillNames: [], builtin: true };
  const dir = repoDir(skill.repo);
  const installed = fs.existsSync(dir);
  const files = installed ? findSkillFiles(dir) : [];
  const names = files.map((f) => {
    const txt = safeRead(f, 4000);
    const m = txt.match(/^name:\s*["']?([^"'\n]+)/m);
    return m ? m[1].trim() : path.basename(path.dirname(f));
  });
  return { installed, skillFiles: files.length, skillNames: names };
}

function safeRead(f, max) {
  try {
    return fs.readFileSync(f, 'utf8').slice(0, max);
  } catch {
    return '';
  }
}

/** Kurulu bir skill'in SKILL.md içeriğini (kısaltılmış) döndürür — prompt'a eklenir */
export function skillContext(skill, maxChars = 9000) {
  if (!skill.repo) return '';
  const dir = repoDir(skill.repo);
  const files = findSkillFiles(dir);
  if (!files.length) return '';
  // En kısa yollu (ana) SKILL.md önce
  files.sort((a, b) => a.length - b.length);
  let out = '';
  for (const f of files) {
    if (out.length >= maxChars) break;
    out += `\n--- ${path.relative(dir, f)} ---\n` + safeRead(f, maxChars - out.length);
  }
  return out.slice(0, maxChars);
}

/** git clone + SKILL.md klasörlerini ~/.claude/skills altına bağlar (Claude Code otomatik görür) */
export async function installSkill(skill) {
  if (!skill.repo) throw new Error('Bu hazır bir konsept; kurulacak bir repo yok');
  fs.mkdirSync(SKILLS_SRC, { recursive: true });
  const dir = repoDir(skill.repo);
  if (fs.existsSync(path.join(dir, '.git'))) {
    await run('git', ['-C', dir, 'pull', '--ff-only'], { timeout: 120000 }).catch(() => {});
  } else {
    await run('git', ['clone', '--depth', '1', `https://github.com/${skill.repo}.git`, dir], { timeout: 300000 });
  }
  const files = findSkillFiles(dir);
  fs.mkdirSync(CLAUDE_SKILLS, { recursive: true });
  const linked = [];
  for (const f of files) {
    const sdir = path.dirname(f);
    const txt = safeRead(f, 3000);
    const m = txt.match(/^name:\s*["']?([^"'\n]+)/m);
    const name = (m ? m[1].trim() : path.basename(sdir)).replace(/[^a-zA-Z0-9-_]/g, '-');
    const target = path.join(CLAUDE_SKILLS, name);
    if (fs.existsSync(target)) {
      linked.push(name);
      continue;
    }
    try {
      fs.symlinkSync(sdir, target, process.platform === 'win32' ? 'junction' : 'dir');
      linked.push(name);
    } catch {
      try {
        fs.cpSync(sdir, target, { recursive: true });
        linked.push(name);
      } catch {}
    }
  }
  return { ok: true, dir, linked };
}
