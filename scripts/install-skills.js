// Kataloktaki skill'leri toplu kurar:  npm run install-skills            → hepsi
//                                     npm run install-skills -- stickman-director whiteboard
import { catalog, installSkill } from '../lib/skills.js';

const ids = process.argv.slice(2);
const list = catalog().filter((s) => !ids.length || ids.includes(s.id));
for (const s of list) {
  process.stdout.write(`⬇ ${s.repo} … `);
  try {
    const r = await installSkill(s);
    console.log(`✅ ${r.linked.length ? r.linked.join(', ') : '(SKILL.md yok, profil kullanılacak)'}`);
  } catch (e) {
    console.log('❌ ' + e.message.split('\n')[0]);
  }
}
console.log('\nSkill\'ler ~/.claude/skills altına bağlandı — Claude Code bunları otomatik görür.');
