// Kurulum kontrolü: npm run setup
import { run, hasCommand, IS_WIN } from '../lib/util.js';

const ok = (b) => (b ? '✅' : '❌');
console.log('\n🎬 Stickman Motion Studio — kurulum kontrolü\n');

const node = process.versions.node.split('.')[0];
console.log(`${ok(node >= 18)} Node.js ${process.versions.node} (18+ gerekli)`);

const claude = await hasCommand('claude');
const gemini = await hasCommand("agy", ["--version"]);
const codex = await hasCommand('codex');
console.log(`${ok(claude.ok)} Claude Code CLI ${claude.version || '→ npm i -g @anthropic-ai/claude-code  ve sonra: claude (giriş yap)'}`);
console.log(`${ok(gemini.ok)} Antigravity CLI (Google hesabı) ${gemini.version || "→ Antigravity-Kur.command dosyasına çift tıkla"}`);
console.log(`${ok(codex.ok)} Codex CLI ${codex.version || '(isteğe bağlı) → npm i -g @openai/codex'}`);

let edge = await hasCommand('edge-tts', ['--help']);
if (!edge.ok) {
  const py = IS_WIN ? 'python' : 'python3';
  const pyOk = await hasCommand(py);
  if (pyOk.ok) {
    console.log('… edge-tts kuruluyor (pip install edge-tts)');
    try {
      await run(py, ['-m', 'pip', 'install', '--user', '--upgrade', 'edge-tts'], { timeout: 300000 });
      edge = { ok: true };
    } catch (e) {
      try {
        await run(py, ['-m', 'pip', 'install', '--user', '--break-system-packages', 'edge-tts'], { timeout: 300000 });
        edge = { ok: true };
      } catch {
        console.log('   pip kurulumu başarısız: ' + e.message.slice(0, 200));
      }
    }
  } else console.log('❌ Python bulunamadı → https://www.python.org/downloads/ (edge-tts için)');
}
console.log(`${ok(edge.ok)} edge-tts (400+ ücretsiz neural ses)`);

let yt = await hasCommand('yt-dlp', ['--version']);
if (!yt.ok) {
  const py = IS_WIN ? 'python' : 'python3';
  yt = await hasCommand(py, ['-m', 'yt_dlp', '--version']);
  if (!yt.ok && (await hasCommand(py)).ok) {
    console.log('… yt-dlp kuruluyor (klip stüdyosu için)');
    for (const extra of [[], ['--break-system-packages']]) {
      try {
        await run(py, ['-m', 'pip', 'install', '--user', '--upgrade', ...extra, 'yt-dlp'], { timeout: 300000 });
        yt = { ok: true };
        break;
      } catch {}
    }
  }
}
// YouTube sık değişiyor: yt-dlp'yi (JS çözücü paketiyle) her açılışta güncellemeyi dene — hata verirse sessizce geç
if ((await hasCommand(IS_WIN ? 'python' : 'python3')).ok) {
  const py = IS_WIN ? 'python' : 'python3';
  for (const extra of [[], ['--break-system-packages']]) {
    try {
      await run(py, ['-m', 'pip', 'install', '--user', '--upgrade', '--quiet', ...extra, 'yt-dlp[default]'], { timeout: 180000 });
      yt = { ok: true };
      break;
    } catch {}
  }
}
console.log(`${ok(yt.ok)} yt-dlp (YouTube klip stüdyosu) ${yt.ok ? '' : '→ pip install yt-dlp'}`);

let wh = false;
for (const c of ['mlx_whisper', 'whisper', 'whisper-ctranslate2']) if ((await hasCommand(c, ['--help'])).ok) wh = c;
console.log(`${ok(!!wh)} Whisper (altyazısı olmayan videoları yazıya döker) ${wh || '(isteğe bağlı) → pip install openai-whisper   ·  Apple Silicon: pip install mlx-whisper'}`);
const ff = await hasCommand('ffmpeg', ['-version']);
console.log(`${ok(ff.ok)} ffmpeg ${ff.ok ? '' : '(isteğe bağlı; yalnızca WebCodecs olmayan tarayıcılarda webm→mp4 için)'}`);
const git = await hasCommand('git');
console.log(`${ok(git.ok)} git ${git.ok ? '' : '(skill kurmak için gerekli)'}`);

console.log('\nBaşlatmak için:  npm start   →  http://127.0.0.1:5178  (Chrome/Edge önerilir)\n');
