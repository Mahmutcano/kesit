// npm run dev → yerel API (5179) + Next.js arayüzü (3000) birlikte. Çıkış: Ctrl+C.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const prod = process.argv.includes('--prod');
const nextBin = path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next');
const apiPort = process.env.API_PORT || '5179';
const webPort = process.env.PORT || '3000';

if (!existsSync(nextBin)) {
  console.error('\n  Next.js kurulu değil. Önce şunu çalıştır:\n\n    npm install\n');
  process.exit(1);
}
if (prod && !existsSync(path.join(root, '.next', 'BUILD_ID'))) {
  console.error('\n  Önce derleme gerekli:  npm run build\n');
  process.exit(1);
}

const children = [];
const run = (name, cmd, args, env) => {
  const p = spawn(cmd, args, { cwd: root, stdio: 'inherit', env: { ...process.env, ...env } });
  p.on('exit', (code) => { if (!stopping) { console.error(`\n  ${name} kapandı (kod ${code}).`); stop(code || 1); } });
  children.push(p);
};
let stopping = false;
const stop = (code = 0) => { stopping = true; children.forEach((c) => { try { c.kill('SIGTERM'); } catch {} }); setTimeout(() => process.exit(code), 300); };
process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));

run('API', process.execPath, ['server.js'], { PORT: apiPort, HOST: '127.0.0.1', KESIT_QUIET_BANNER: '1' });
run('Next.js', process.execPath, [nextBin, prod ? 'start' : 'dev', '-p', webPort, '-H', '127.0.0.1'], { KESIT_API: `http://127.0.0.1:${apiPort}` });
setTimeout(() => console.log(`\n  Kesit hazır →  http://localhost:${webPort}\n`), 2500);
