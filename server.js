// Stickman Motion Studio — yerel sunucu (bağımlılık yok, sadece Node ≥ 18)
// Yapay zeka çağrıları senin bilgisayarındaki CLI üzerinden gider → Antigravity (Google Gemini) hesabın kullanılır.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import {
  ROOT,
  DATA_DIR,
  OUTPUT_DIR,
  WORK_DIR,
  readJSON,
  writeJSON,
  hasCommand,
  run,
  safeName,
  clearCommandCache,
} from "./lib/util.js";
import { PROVIDERS, providerHealth, completeJSON } from "./lib/llm.js";
import { ttsHealth, listVoices, synthesize } from "./lib/tts.js";
import {
  catalog,
  skillStatus,
  skillContext,
  installSkill,
} from "./lib/skills.js";
import {
  planPrompt,
  topicsPrompt,
  channelPrompt,
  clipsPrompt,
  scoreSegmentsPrompt,
} from "./lib/prompt.js";
import {
  listChannels,
  saveChannel,
  removeChannel,
  library,
  removeVideo,
  videoDir,
  suggestOffline,
} from "./lib/channels.js";
import {
  sourcePath,
  clipHealth,
  fetchVideo,
  saveUpload,
  getMeta,
  autoSegments,
  transcriptForLLM,
  snapSegments,
  renderClip,
  transcribe,
} from "./lib/clipper.js";
import { normalizePlan, offlinePlan } from "./lib/director.js";
import { COSTUME_NAMES } from "./public/costumes.js";
import {
  GENRES,
  genreOf,
  outlinePrompt,
  chapterPrompt,
  toonChapterPrompt,
  applySpeakers,
  MOVE_NAMES,
  cleanScenes,
  fullImagePrompt,
} from "./lib/film.js";
import * as muapi from "./lib/muapi.js";
import { trackSubject } from "./lib/track.js";
import {
  describeEffects,
  applyEffects,
  listAssets,
  ASSET_DIR,
  loadEffects,
} from "./lib/fx/index.js";
import { RECIPES, buildRecipe } from "./lib/fx/recipes.js";
import { SOURCES, makeImage, extOf } from "./lib/imagegen.js";

const PORT = Number(process.env.PORT) || 5178;
const HOST = process.env.HOST || "127.0.0.1";
const CONFIG_FILE = path.join(ROOT, "config.local.json");
const PUBLIC = path.join(ROOT, "public");

const getConfig = () => readJSON(CONFIG_FILE, {});

const MIME = {
  ".mov": "video/quicktime",
  ".m4v": "video/mp4",
  ".mkv": "video/x-matroska",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".m4a": "audio/mp4",
  ".ogg": "audio/ogg",
  ".opus": "audio/ogg",
  ".wav": "audio/wav",
  ".aac": "audio/aac",
  ".flac": "audio/flac",
  ".srt": "text/plain; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

const SCRUB = [
  [/yt-dlp|ytdlp/gi, "video modülü"],
  [/ffmpeg|ffprobe/gi, "video modülü"],
  [/whisper/gi, "konuşma modülü"],
  [/libass/gi, "altyazı modülü"],
  [/edge-tts/gi, "seslendirme modülü"],
  [/claude code/gi, "yapay zekâ"],
  [/antigravity( cli)?/gi, "Google bağlantısı"],
  [/\bagy\b/g, "bağlantı"],
];
function scrub(v) {
  if (typeof v === "string")
    return SCRUB.reduce((t, [re, to]) => t.replace(re, to), v);
  if (Array.isArray(v)) return v.map(scrub);
  if (v && typeof v === "object") {
    const o = {};
    for (const k of Object.keys(v)) o[k] = scrub(v[k]);
    return o;
  }
  return v;
}
function send(res, code, body, type = "application/json; charset=utf-8") {
  if (
    type.startsWith("application/json") &&
    body &&
    typeof body === "object" &&
    !Buffer.isBuffer(body)
  )
    body = scrub(body);
  res.writeHead(code, { "content-type": type, "cache-control": "no-store" });
  res.end(
    typeof body === "string" || Buffer.isBuffer(body)
      ? body
      : JSON.stringify(body),
  );
}

async function readBody(req, limit = 5 * 1024 * 1024, raw = false) {
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > limit) throw new Error("İstek çok büyük");
    chunks.push(c);
  }
  const txt = Buffer.concat(chunks).toString("utf8");
  if (raw) return txt;
  return txt ? JSON.parse(txt) : {};
}

function serveStatic(req, res, base, rel) {
  const file = path.normalize(path.join(base, rel));
  if (!file.startsWith(base)) return send(res, 403, "yasak", "text/plain");
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return send(res, 404, "bulunamadı", "text/plain");
    const type =
      MIME[path.extname(file).toLowerCase()] || "application/octet-stream";
    const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || "");
    if (m && (m[1] || m[2])) {
      // video oynatıcının ileri-geri sarması için
      let start = m[1] ? Number(m[1]) : Math.max(0, st.size - Number(m[2]));
      let end =
        m[1] && m[2] ? Math.min(Number(m[2]), st.size - 1) : st.size - 1;
      if (start >= st.size || start > end) {
        res.writeHead(416, { "content-range": `bytes */${st.size}` });
        return res.end();
      }
      res.writeHead(206, {
        "content-type": type,
        "content-length": end - start + 1,
        "content-range": `bytes ${start}-${end}/${st.size}`,
        "accept-ranges": "bytes",
      });
      return fs.createReadStream(file, { start, end }).pipe(res);
    }
    res.writeHead(200, {
      "content-type": type,
      "content-length": st.size,
      "accept-ranges": "bytes",
      "cache-control": "no-store",
    });
    fs.createReadStream(file).pipe(res);
  });
}

async function fxApply(channel, vid, effectsIn, label) {
  const dir = videoDir(channel, vid);
  const input = path.join(dir, "video.mp4");
  if (!fs.existsSync(input)) throw new Error("Klip dosyası bulunamadı");
  if (!Array.isArray(effectsIn) || !effectsIn.length)
    throw new Error("En az bir efekt seç");
  const effects = effectsIn.map((e) => ({
    id: String(e.id),
    params: e.params || {},
  }));
  const id = "fx_" + Date.now().toString(36);
  const outFile = path.join(dir, id + ".mp4");
  const r = await applyEffects({
    input,
    outFile,
    effects: effects,
    workDir: path.join(WORK_DIR, "fx_" + id),
  });
  try {
    fs.rmSync(path.join(WORK_DIR, "fx_" + id), {
      recursive: true,
      force: true,
    });
  } catch {}
  await run(
    "ffmpeg",
    [
      "-y",
      "-ss",
      "1",
      "-i",
      outFile,
      "-frames:v",
      "1",
      "-vf",
      "scale=640:-2",
      path.join(dir, id + ".jpg"),
    ],
    { timeout: 60000 },
  ).catch(() => {});
  const metaFile = path.join(dir, "meta.json");
  const meta = readJSON(metaFile, {});
  const rep = { ...(r.report || {}), before: undefined };
  try {
    const dur0 =
      Number(
        (
          await run(
            "ffprobe",
            [
              "-v",
              "error",
              "-show_entries",
              "format=duration",
              "-of",
              "csv=p=0",
              input,
            ],
            { timeout: 30000 },
          )
        ).stdout,
      ) || 0;
    rep.durBefore = +dur0.toFixed(1);
    rep.durAfter = +Number(r.duration).toFixed(1);
    if (rep.audio) {
      const vol = async (f) => {
        const o =
          (
            await run(
              "ffmpeg",
              [
                "-hide_banner",
                "-nostats",
                "-i",
                f,
                "-vn",
                "-af",
                "volumedetect",
                "-f",
                "null",
                "-",
              ],
              { timeout: 120000 },
            ).catch((e) => e)
          ).stderr || "";
        const m = /mean_volume: (-?[\d.]+) dB/.exec(o);
        return m ? Number(m[1]) : null;
      };
      const a = await vol(input),
        b = await vol(outFile);
      if (a != null && b != null) {
        rep.loudBefore = a;
        rep.loudAfter = b;
      }
    }
  } catch {}
  const variant = {
    id,
    file: id + ".mp4",
    thumb: id + ".jpg",
    label: label || "",
    effects: effects.map((e) => e.id),
    duration: r.duration,
    report: rep,
    createdAt: new Date().toISOString(),
  };
  meta.variants = [...(meta.variants || []), variant];
  writeJSON(metaFile, meta);
  return { ...variant, base: `/output/${channel}/${vid}/` };
}

const routes = {
  "GET /api/health": async () => {
    clearCommandCache();
    const config = getConfig();
    const [llm, tts, ffmpeg, git] = await Promise.all([
      providerHealth(config),
      ttsHealth(config),
      hasCommand("ffmpeg", ["-version"]),
      hasCommand("git"),
    ]);
    const c = await clipHealth();
    const clean = (o) =>
      Object.fromEntries(
        Object.entries(o).map(([k, v]) => [
          k,
          {
            ok: !!v?.ok,
            version: v?.ok
              ? "hazır"
              : /anahtar|şablon|tanımsız/.test(v?.version || "")
                ? v.version
                : "kurulu değil",
          },
        ]),
      );
    return {
      llm: clean(llm),
      tts: clean(tts),
      media: clean({ m: ffmpeg }).m,
      git: clean({ g: git }).g,
      providers: PROVIDERS.map(({ id, name, kind }) => ({ id, name, kind })),
      clip: { fetch: c.ytdlp, stt: c.whisper, burn: c.burn },
    };
  },

  "GET /api/skills": async () =>
    catalog().map((s) => ({ ...s, ...skillStatus(s) })),

  "POST /api/skills/install": async (req) => {
    const { id } = await readBody(req);
    const s = catalog().find((x) => x.id === id);
    if (!s) throw new Error("Skill bulunamadı");
    return installSkill(s);
  },

  "GET /api/voices": async (req, url) =>
    listVoices(url.searchParams.get("provider") || "edge", getConfig()),

  "POST /api/tts": async (req, url, res) => {
    const body = await readBody(req);
    const buf = await synthesize({ ...body, config: getConfig() });
    send(res, 200, buf, "audio/mpeg");
    return undefined;
  },

  "POST /api/topics": async (req) => {
    const b = await readBody(req);
    if (b.provider === "offline") {
      // Yapay zeka yoksa: ana konuyu numaralı alt başlıklara böl
      return Array.from({ length: b.count }, (_, i) => ({
        title: `${b.theme} #${i + 1}`,
        angle: b.theme,
      }));
    }
    const arr = await completeJSON(b.provider, topicsPrompt(b), {
      model: b.model,
      config: getConfig(),
    });
    return (Array.isArray(arr) ? arr : arr.topics || []).slice(0, b.count);
  },

  "POST /api/plan": async (req) => {
    const b = await readBody(req);
    const {
      input,
      settings,
      provider,
      model,
      skillId,
      useSkillContext = true,
      channel,
      variety,
    } = b;
    const skill = catalog().find((s) => s.id === skillId);
    if (provider === "offline") {
      if (input.type === "topic")
        throw new Error(
          "Yapay zekasız modda konu → script yazılamaz. Script gir veya bir AI sağlayıcısı seç.",
        );
      return normalizePlan(
        offlinePlan(input.text, {
          language: settings.language,
          pace: skill?.profile?.pace,
          style: skill?.look?.toon ? "toon" : skill?.style,
          seed: Number(variety) || 0,
        }),
        { language: settings.language, defaultCast: skill?.cast?.slice(0, 2) },
      );
    }
    const skillText = useSkillContext && skill ? skillContext(skill) : "";
    const prompt = planPrompt({
      input,
      settings,
      skill,
      skillText,
      useInstalledSkill: provider === "anthropic-sub" && !!skill?.repo,
      channel,
      variety,
    });
    const raw = await completeJSON(provider, prompt, {
      model,
      config: getConfig(),
    });
    return normalizePlan(raw, {
      language: settings.language,
      defaultCast: skill?.cast?.slice(0, 2),
    });
  },

  // ---------- Kanallar ----------
  "GET /api/channels": async () =>
    listChannels().map((c) => ({ ...c, videoCount: library(c.id).length })),
  "POST /api/channels": async (req) => saveChannel(await readBody(req)),
  "POST /api/channels/delete": async (req) => {
    removeChannel((await readBody(req)).id);
    return { ok: true };
  },
  "POST /api/channels/suggest": async (req) => {
    const b = await readBody(req);
    const skills = catalog();
    let out = suggestOffline(`${b.name} ${b.concept}`);
    if (b.provider && b.provider !== "offline") {
      const j = await completeJSON(
        b.provider,
        channelPrompt({ ...b, skills, themes: b.themes || [] }),
        { model: b.model, config: getConfig() },
      );
      out = {
        skillId: skills.some((s) => s.id === j.skillId)
          ? j.skillId
          : out.skillId,
        themeId: (b.themes || []).includes(j.themeId) ? j.themeId : undefined,
        direction: String(j.direction || "").slice(0, 400),
        voiceGender: ["Male", "Female"].includes(j.voiceGender)
          ? j.voiceGender
          : undefined,
        music: [
          "none",
          "ambient",
          "upbeat",
          "lofi",
          "dramatic",
          "mystery",
        ].includes(j.music)
          ? j.music
          : undefined,
        ideas: (Array.isArray(j.ideas) ? j.ideas : [])
          .slice(0, 8)
          .map((x) => String(x).slice(0, 140)),
      };
    }
    return out;
  },
  "GET /api/library": async (req, url) =>
    library(url.searchParams.get("channel")),
  "POST /api/library/delete": async (req) => {
    const b = await readBody(req);
    removeVideo(b.channel, b.id);
    return { ok: true };
  },

  // ---------- Klip stüdyosu ----------
  "POST /api/clip/fetch": async (req) => {
    const b = await readBody(req);
    return fetchVideo(String(b.url || "").trim(), b.language || "tr");
  },
  "POST /api/clip/upload": async (req, url) =>
    saveUpload(req, url.searchParams.get("name") || "video.mp4"),
  "POST /api/clip/segments": async (req) => {
    const b = await readBody(req);
    const meta = getMeta(b.id);
    if (!meta) throw new Error("Kaynak bulunamadı");
    const length = Math.min(180, Math.max(8, Number(b.length) || 45)),
      count = Math.min(20, Math.max(1, Number(b.count) || 5));
    const hasAI = b.provider && b.provider !== "offline";

    if (b.mode === "ai" && hasAI && meta.words?.length) {
      const j = await completeJSON(
        b.provider,
        clipsPrompt({
          transcript: transcriptForLLM(meta),
          count,
          length,
          language: b.language || "tr",
          duration: meta.duration,
        }),
        { model: b.model, config: getConfig() },
      );
      return snapSegments(meta, j, length);
    }

    // Transkript yoksa veya eşit böl seçildiyse:
    let segs = autoSegments(meta, { length, count });

    // Seçili yapay zeka varsa (Antigravity Google Gemini veya Kesit AI): bölümleri analiz ettir ve viral skorlarını al
    if (hasAI && segs.length > 0) {
      try {
        const scored = await completeJSON(
          b.provider,
          scoreSegmentsPrompt({
            title: meta.title,
            segments: segs,
            language: b.language || "tr",
            duration: meta.duration,
          }),
          { model: b.model, config: getConfig() },
        );
        if (Array.isArray(scored)) {
          const n = (v) =>
            Math.max(0, Math.min(100, Math.round(Number(v) || 0)));
          segs = segs.map((s, idx) => {
            const scObj = scored[idx]?.scores;
            const sc =
              scObj && typeof scObj === "object"
                ? {
                    hook: n(scObj.hook),
                    engagement: n(scObj.engagement),
                    value: n(scObj.value),
                    shareability: n(scObj.shareability),
                  }
                : null;
            return {
              ...s,
              title: scored[idx]?.title || s.title,
              hook: scored[idx]?.hook || "",
              reason: scored[idx]?.reason || undefined,
              scores: sc,
              score: sc
                ? Math.round(
                    (sc.hook + sc.engagement + sc.value + sc.shareability) / 4,
                  )
                : null,
            };
          });
        }
      } catch (e) {
        console.warn("AI skorlama atlandı:", e.message);
      }
    }

    return segs;
  },
  "POST /api/clip/transcribe": async (req) => {
    const b = await readBody(req);
    return transcribe(b.id, b.language || "tr", getConfig().whisperModel || "");
  },
  "GET /api/clip/source": async (req, url) => {
    const m = getMeta(url.searchParams.get("id"));
    if (!m)
      throw new Error(
        "Kaynak video artık diskte yok; bağlantıyı yeniden getir",
      );
    return m;
  },
  // Takip analizi: editörde yolu önizlemek için (render aynı yolu kullanır)
  "POST /api/clip/track": async (req) => {
    const b = await readBody(req);
    const meta = getMeta(b.id);
    if (!meta) throw new Error("Kaynak bulunamadı");
    const start = Math.max(0, Number(b.start) || 0),
      end = Number(b.end);
    if (!(end > start))
      throw new Error("Kesit bitişi başlangıçtan büyük olmalı");
    return trackSubject({
      src: sourcePath(b.id),
      meta,
      start,
      end,
      mode: String(b.mode || ""),
      seed: b.seed,
    });
  },

  "POST /api/clip/render": async (req) => {
    const b = await readBody(req);
    const vid = /^[A-Za-z0-9_-]{1,80}$/.test(b.vid || "")
      ? b.vid
      : `${new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "")}-klip-${Math.random().toString(36).slice(2, 6)}`;
    const outDir = videoDir(b.channel, vid);
    const r = await renderClip({
      id: b.id,
      clip: b.clip,
      style: b.style,
      outDir,
    });
    const src = getMeta(b.id);
    const c = b.clip;
    const meta = {
      kind: "clip",
      title: c.title || "Kesit",
      createdAt: b.createdAt || new Date().toISOString(),
      duration: r.duration,
      video: "video.mp4",
      thumb: "thumbnail.jpg",
      aspect: b.style?.aspect || "source",
      source: src?.source,
      sourceTitle: src?.title,
      gen: b.gen || vid,
      src: b.id,
      score: c.score ?? null,
      scores: c.scores || null,
      hook: c.hook || "",
      reason: c.reason || "",
      clip: {
        start: c.start,
        end: c.end,
        focus: c.focus ?? 0.5,
        hook: c.hook || "",
        cues: c.cues || [],
        track: c.track?.path
          ? {
              mode: c.track.mode,
              zoom: c.track.zoom,
              seed: c.track.seed,
              path: c.track.path,
            }
          : undefined,
      },
      style: b.style,
      v: Date.now(),
    };
    writeJSON(path.join(outDir, "meta.json"), meta);
    return {
      ...meta,
      ...r,
      id: vid,
      base: `/output/${b.channel}/${vid}/`,
      files: fs.readdirSync(outDir),
    };
  },

  // ---- YouTube giriş çerezi (yaş sınırlı / giriş isteyen videolar için) ----
  "GET /api/cookies/status": async () => {
    const f = path.join(ROOT, "cookies.txt");
    if (!fs.existsSync(f)) return { saved: false };
    const lines = fs
      .readFileSync(f, "utf8")
      .split("\n")
      .filter((l) => l && !l.startsWith("#"));
    return {
      saved: true,
      count: lines.length,
      savedAt: fs.statSync(f).mtime.toISOString(),
    };
  },

  "POST /api/cookies": async (req) => {
    const text = (await readBody(req, 4 * 1024 * 1024, true)).replace(
      /\r\n/g,
      "\n",
    );
    const rows = text
      .split("\n")
      .filter((l) => l && !l.startsWith("#") && l.split("\t").length >= 7);
    if (!rows.length)
      throw new Error(
        'Bu dosya cookies.txt biçiminde görünmüyor. Eklentide "Export" ile indirdiğin dosyayı seç.',
      );
    if (!rows.some((l) => /(youtube|google)\.com/i.test(l.split("\t")[0])))
      throw new Error(
        "Dosyada youtube.com çerezi yok. youtube.com sayfası açıkken eklentiden tekrar dışa aktar.",
      );
    const f = path.join(ROOT, "cookies.txt");
    fs.writeFileSync(
      f,
      (text.startsWith("# Netscape") ? "" : "# Netscape HTTP Cookie File\n") +
        text,
      { mode: 0o600 },
    );
    return { saved: true, count: rows.length };
  },

  "POST /api/cookies/delete": async () => {
    fs.rmSync(path.join(ROOT, "cookies.txt"), { force: true });
    return { saved: false };
  },

  // ---- Efekt skill'leri (klibin üstüne ayrı dosya olarak uygulanır; orijinale dokunmaz) ----
  "GET /api/fx/list": async () => ({
    effects: await describeEffects(),
    recipes: RECIPES,
    assets: {
      music: listAssets("music"),
      voice: listAssets("voice"),
      logo: listAssets("logo"),
    },
  }),

  "POST /api/fx/reload": async () => {
    await loadEffects(true);
    return { effects: await describeEffects() };
  },

  "POST /api/fx/upload": async (req, url) => {
    const kind = url.searchParams.get("kind");
    const ok = {
      music: /\.(mp3|wav|m4a|aac|ogg|flac)$/i,
      voice: /\.(mp3|wav|m4a|aac|ogg|opus|flac|webm|mp4)$/i,
      logo: /\.(png|jpg|jpeg|webp)$/i,
    }[kind];
    const raw = path.basename(url.searchParams.get("name") || "dosya");
    const name =
      safeName(path.basename(raw, path.extname(raw)), 40) +
      path.extname(raw).toLowerCase();
    if (!ok || !ok.test(name))
      throw new Error(
        kind === "music"
          ? "Müzik: mp3, wav, m4a, aac, ogg ya da flac yükle"
          : kind === "voice"
            ? "Ses: mp3, wav, m4a, aac, ogg, opus ya da webm yükle"
            : "Logo: png, jpg ya da webp yükle",
      );
    const dir = path.join(ASSET_DIR, kind);
    fs.mkdirSync(dir, { recursive: true });
    const id = `${Date.now()}-${name}`;
    let size = 0;
    await new Promise((resolve, reject) => {
      const ws = fs.createWriteStream(path.join(dir, id));
      req.on("data", (c) => {
        size += c.length;
        if (size > 300 * 1024 * 1024) {
          req.destroy();
          ws.destroy();
          reject(new Error("Dosya çok büyük (en fazla 300 MB)"));
        }
      });
      req.pipe(ws);
      ws.on("finish", resolve);
      ws.on("error", reject);
      req.on("error", reject);
    });
    return { id, name, kind };
  },

  "POST /api/fx/asset-delete": async (req) => {
    const b = await readBody(req);
    if (
      !["music", "voice", "logo"].includes(b.kind) ||
      !/^[\w .()\-]+$/.test(b.id || "")
    )
      throw new Error("Geçersiz dosya");
    fs.rmSync(path.join(ASSET_DIR, b.kind, b.id), { force: true });
    return { ok: true };
  },

  "POST /api/fx/apply": async (req) => {
    const b = await readBody(req);
    return fxApply(b.channel, b.vid, b.effects, b.label);
  },

  // Tek tık tarif: klibin kendi bilgisine göre efektleri doldurur ve işler. vids verilirse hepsine sırayla uygular.
  "POST /api/fx/recipe": async (req) => {
    const b = await readBody(req);
    const ids =
      Array.isArray(b.vids) && b.vids.length ? b.vids.slice(0, 40) : [b.vid];
    const ch = listChannels().find((c) => c.id === b.channel) || {};
    const out = [];
    for (const vid of ids) {
      const meta = readJSON(
        path.join(videoDir(b.channel, vid), "meta.json"),
        {},
      );
      const voices = listAssets("voice"),
        logos = listAssets("logo");
      const ctx = {
        lang: meta.language || ch.language || "tr",
        duration: Number(meta.duration) || 20,
        aspect: meta.aspect || ch.aspect || "9:16",
        kind: meta.kind || "clip",
        title: meta.title || "",
        hook: meta.hook || "",
        channel: ch.name || "",
        handle: ch.watermark || "",
        logo: logos.length ? logos[logos.length - 1].id : "",
        voice: voices.length ? voices[voices.length - 1].id : "",
      };
      const effects = buildRecipe(b.recipe, ctx);
      out.push({ vid, ...(await fxApply(b.channel, vid, effects, b.recipe)) });
    }
    return { results: out };
  },

  "POST /api/fx/variant-delete": async (req) => {
    const b = await readBody(req);
    const dir = videoDir(b.channel, b.vid);
    if (!/^fx_[a-z0-9]+$/.test(b.id || "")) throw new Error("Geçersiz sürüm");
    for (const ext of [".mp4", ".jpg"])
      fs.rmSync(path.join(dir, b.id + ext), { force: true });
    const metaFile = path.join(dir, "meta.json");
    const meta = readJSON(metaFile, {});
    meta.variants = (meta.variants || []).filter((v) => v.id !== b.id);
    writeJSON(metaFile, meta);
    return { ok: true };
  },

  "GET /api/config": async () => {
    const c = getConfig();
    // Anahtarları maskeleyerek döndür
    const masked = {};
    for (const [k, v] of Object.entries(c))
      masked[k] = /key/i.test(k) && v ? "••••" + String(v).slice(-4) : v;
    return masked;
  },

  "POST /api/config": async (req) => {
    const b = await readBody(req);
    const c = getConfig();
    for (const [k, v] of Object.entries(b)) {
      if (typeof v === "string" && v.startsWith("••••")) continue; // maskeli değer değişmedi
      if (v === "" || v == null) delete c[k];
      else c[k] = v;
    }
    writeJSON(CONFIG_FILE, c);
    return { ok: true };
  },

  // Tarayıcıda render edilen dosyaları (mp4/webm/png/srt/json) output/ klasörüne yazar
  "POST /api/save": async (req, url) => {
    const channel = url.searchParams.get("channel"),
      video = url.searchParams.get("video");
    const job = channel
      ? null
      : safeName(url.searchParams.get("job") || "job", 80);
    const name = path.basename(url.searchParams.get("name") || "file.bin");
    const dir = channel ? videoDir(channel, video) : path.join(OUTPUT_DIR, job);
    const rel = channel ? `${channel}/${video}` : job;
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, name);
    await new Promise((resolve, reject) => {
      const ws = fs.createWriteStream(file);
      req.pipe(ws);
      ws.on("finish", resolve);
      ws.on("error", reject);
      req.on("error", reject);
    });
    let finalName = name;
    // MediaRecorder yedeği webm üretir → ffmpeg varsa mp4'e çevir
    if (
      name.endsWith(".webm") &&
      (await hasCommand("ffmpeg", ["-version"])).ok
    ) {
      const mp4 = file.replace(/\.webm$/, ".mp4");
      try {
        await run(
          "ffmpeg",
          [
            "-y",
            "-i",
            file,
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "20",
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "aac",
            "-b:a",
            "160k",
            "-movflags",
            "+faststart",
            mp4,
          ],
          { timeout: 60 * 60 * 1000 },
        );
        finalName = path.basename(mp4);
      } catch {}
    }
    return {
      ok: true,
      name: finalName,
      url: `/output/${rel}/${finalName}`,
      path: path.join(dir, finalName),
    };
  },

  // ---------------- FİLM STÜDYOSU (yatay uzun anlatımlı filmler) ----------------
  "GET /api/film/info": async () => ({
    genres: GENRES.map(({ id, name, emoji, desc, char }) => ({
      id,
      name,
      emoji,
      desc,
      hasChar: !!char,
    })),
    models: muapi.IMAGE_MODELS,
    sources: SOURCES.map((x) => ({
      ...x,
      ok: !x.needs || !!getConfig()[x.needs],
    })),
    hasKey: !!getConfig().muapiKey,
  }),

  "POST /api/film/outline": async (req) => {
    const b = await readBody(req);
    if (!b.provider || b.provider === "offline")
      throw new Error(
        "Film için soldan bir yapay zeka kaynağı seç (Anthropic, Google…)",
      );
    const o = await completeJSON(b.provider, outlinePrompt(b), {
      model: b.model,
      config: getConfig(),
    });
    if (!Array.isArray(o.chapters) || !o.chapters.length)
      throw new Error("Yapay zeka bölüm planı döndürmedi, tekrar dene");
    const sum = o.chapters.reduce((a, c) => a + (Number(c.share) || 0), 0) || 0;
    o.chapters.forEach(
      (c) =>
        (c.share =
          sum > 0.5 ? (Number(c.share) || 0) / sum : 1 / o.chapters.length),
    );
    if (b.character) o.character = b.character;
    if (b.moody) o.cast = ["blob", "casual"];
    if (b.dayone) {
      // Day One Films tarzı: soluk, kel, yuvarlak kafalı çizgi film adam; kalın yumuşak hatlar, dramatik karanlık ışık
      if (!b.character)
        o.character =
          "a pale beige bald round-headed cartoon man with a heavy angry brow, tired eyes, simple small dot eyes, wearing a plain dark hoodie, soft shaded 3D-like cartoon rendering";
      o.look =
        "dark moody cinematic cartoon illustration, thick soft outlines, smooth airbrushed shading and volumetric rim lighting, deep navy and black shadows with a single warm or neon glow accent, expressive exaggerated emotions, high-contrast composition, YouTube motivational animated short style";
    }
    if (b.toon) {
      let list = Array.isArray(o.characters) ? o.characters : [];
      if (b.cast?.length)
        list = b.cast.map((c, i) => ({
          ...(list.find((x) => x.id === c.id) || {}),
          id: c.id,
          name: c.name,
          costume: c.costume,
          gender: c.gender || list.find((x) => x.id === c.id)?.gender,
        }));
      list = list.slice(0, 4).map((c, i) => ({
        id: String(c.id || "c" + (i + 1)),
        name: String(c.name || "Karakter " + (i + 1)).slice(0, 20),
        costume: COSTUME_NAMES.includes(c.costume)
          ? c.costume
          : ["casual", "suit", "hoodie", "doctor"][i % 4],
        gender: ["male", "female", "child"].includes(c.gender)
          ? c.gender
          : i % 2
            ? "female"
            : "male",
        personality: String(c.personality || "").slice(0, 60),
      }));
      if (!list.length)
        list = [
          {
            id: "c1",
            name: "Ana",
            costume: "casual",
            gender: "male",
            personality: "",
          },
        ];
      if (b.moody) list[0].costume = "blob";
      o.characters = list;
    }
    return o;
  },

  "POST /api/film/chapter": async (req) => {
    const b = await readBody(req);
    if (b.toon) {
      const arr = await completeJSON(b.provider, toonChapterPrompt(b), {
        model: b.model,
        config: getConfig(),
      });
      const raw = (Array.isArray(arr) ? arr : arr?.scenes || []).filter(
        (x) => x && String(x.narration || "").trim(),
      );
      const norm = normalizePlan(
        { scenes: raw, cast: b.outline?.cast },
        {
          language: b.language,
          defaultCast: b.moody ? ["blob", "casual"] : b.outline?.cast,
        },
      ).scenes;
      if (b.moody) {
        const dark = {
          nature: "night",
          desert: "night",
          ocean: "night",
          classroom: "home",
          stage: "plain",
        };
        for (const sc of norm) {
          sc.cast = [
            sc.cast[0] === "blobgrey" ? "blobgrey" : "blob",
            ...(sc.characters === 2
              ? [
                  sc.cast[1] && !/^blob/.test(sc.cast[1])
                    ? sc.cast[1]
                    : "casual",
                ]
              : []),
          ];
          sc.bg = dark[sc.bg] || sc.bg;
        }
      }
      const sp = applySpeakers(norm, raw, b.outline || {});
      return sp.map((sc, i) => ({
        ...sc,
        move: MOVE_NAMES.includes(raw[i]?.move) ? raw[i].move : undefined,
        backdrop: b.backdrops
          ? String(raw[i]?.backdrop || "").slice(0, 300)
          : "",
      }));
    }
    const arr = await completeJSON(b.provider, chapterPrompt(b), {
      model: b.model,
      config: getConfig(),
    });
    const scenes = cleanScenes(arr, b.offset || 0);
    if (!scenes.length) throw new Error("Bölüm sahne üretmedi");
    return scenes.map((s) => ({
      ...s,
      prompt: fullImagePrompt(s, b.outline, b.genre),
    }));
  },

  "POST /api/film/image": async (req) => {
    const b = await readBody(req);
    const config = getConfig();
    const source = b.source || "pollinations";
    const src = SOURCES.find((x) => x.id === source);
    if (src?.needs && !config[src.needs])
      throw new Error(
        `${src.name} için Ayarlar'da ${src.needs === "geminiKey" ? "Gemini API key" : "Muapi anahtarı"} gerekli`,
      );
    const dir = path.join(videoDir(b.channel, b.video), "img");
    const ext = extOf(source);
    const name = safeName(String(b.name || "img")) + ext;
    const file = path.join(dir, name);
    let refUrl = null,
      refFile = null;
    if (b.ref) {
      refFile = path.join(dir, safeName(String(b.ref)) + ext);
      if (!fs.existsSync(refFile)) refFile = null;
      if (refFile && source === "muapi") {
        const cache = path.join(dir, ".ref.json");
        const c = readJSON(cache, {});
        if (!c[b.ref]) {
          try {
            c[b.ref] = await muapi.uploadFile(config.muapiKey, refFile);
            writeJSON(cache, c);
          } catch {}
        }
        refUrl = c[b.ref] || null;
      }
      if (source !== "gemini" && source !== "muapi") refFile = null;
    }
    let lastErr;
    for (let k = 0; k < 3; k++) {
      try {
        await makeImage(
          {
            source,
            prompt: b.prompt,
            aspect: b.aspect || "16:9",
            seed: b.seed,
            model: source === "svg" ? b.llmModel : b.model,
            refFile: k === 2 ? null : refFile,
            refUrl: k === 2 ? null : refUrl,
            provider: b.provider,
            config,
            character: b.character,
          },
          file,
        );
        return { ok: true, url: `/output/${b.channel}/${b.video}/img/${name}` };
      } catch (e) {
        lastErr = e;
        if (/anahtar|kredi|key|geçersiz/i.test(e.message)) break;
        await new Promise((r) => setTimeout(r, 2500 * (k + 1)));
      }
    }
    throw lastErr;
  },

  "GET /api/outputs": async () => {
    if (!fs.existsSync(OUTPUT_DIR)) return [];
    return fs
      .readdirSync(OUTPUT_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => ({
        job: d.name,
        files: fs.readdirSync(path.join(OUTPUT_DIR, d.name)),
      }))
      .sort((a, b) => b.job.localeCompare(a.job));
  },
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const key = `${req.method} ${url.pathname}`;
  try {
    if (routes[key]) {
      const out = await routes[key](req, url, res);
      if (out !== undefined) send(res, 200, out);
      return;
    }
    if (req.method === "GET" && url.pathname.startsWith("/my-voice/"))
      return serveStatic(
        req,
        res,
        path.join(ASSET_DIR, "voice"),
        decodeURIComponent(url.pathname.slice(10)),
      );
    if (req.method === "GET" && url.pathname.startsWith("/output/"))
      return serveStatic(
        req,
        res,
        OUTPUT_DIR,
        decodeURIComponent(url.pathname.slice(8)),
      );
    if (req.method === "GET" && url.pathname.startsWith("/work/"))
      return serveStatic(
        req,
        res,
        WORK_DIR,
        decodeURIComponent(url.pathname.slice(6)),
      );
    if (req.method === "GET") {
      // Tanıtım sitesi: "/" ana sayfa, "/app" stüdyo (eski index.html)
      const PAGES = {
        "/": "landing.html",
        "/app": "index.html",
        "/login": "login.html",
        "/signup": "signup.html",
        "/forgot": "forgot.html",
        "/reset": "reset.html",
        "/legal/terms": "legal/terms.html",
        "/legal/privacy": "legal/privacy.html",
        "/legal/kvkk": "legal/kvkk.html",
        "/legal/cookies": "legal/cookies.html",
        "/legal/copyright": "legal/copyright.html",
      };
      return serveStatic(
        req,
        res,
        PUBLIC,
        PAGES[url.pathname] || decodeURIComponent(url.pathname),
      );
    }
    send(res, 404, { error: "yok" });
  } catch (e) {
    console.error(`[${key}]`, e.message);
    try {
      fs.appendFileSync(
        path.join(DATA_DIR, "hata-gunlugu.log"),
        `${new Date().toISOString()} ${key}\n${String(e.stack || e.message).slice(0, 1800)}\n\n`,
      );
    } catch {}
    if (!res.headersSent)
      send(res, 500, {
        error: e.message,
        ...(e.code && /^[A-Z_]+$/.test(String(e.code)) ? { code: e.code } : {}),
      });
  }
});

server.requestTimeout = 0;
server.listen(PORT, HOST, () => {
  console.log(
    `\n  🎬 Stickman Motion Studio hazır →  http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}\n`,
  );
  console.log(
    "  Yapay zeka: Antigravity (Google Gemini) / agy CLI hesabın kullanılır.",
  );
  console.log("  Ses: pip install edge-tts  (400+ ücretsiz neural ses)\n");
});
