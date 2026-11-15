import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { run, hasCommand, extractJSON } from "./util.js";

/**
 * Sağlayıcılar:
 *  - claude-code : `claude -p` → Claude Code aboneliğin / login token'ın (API anahtarı gerekmez)
 *  - gemini-cli  : `gemini -p` → Google hesabın (Antigravity ile aynı Google AI kotası)
 *  - codex-cli   : `codex exec` → ChatGPT/Codex aboneliğin
 *  - custom-cli  : Kendi komut şablonun (ör. başka bir agent CLI). {prompt_file} yer tutucusu.
 *  - anthropic-api / gemini-api / openai-compatible : İstersen kendi API anahtarın
 *  - offline     : Yapay zeka yok, kural tabanlı yönetmen (her zaman çalışır)
 */
export const PROVIDERS = [
  { id: "kesit-ai", name: "Kesit AI (Bulut — Üyelikli)", kind: "cloud" },
  {
    id: "google-sub",
    name: "Antigravity (Google Gemini)",
    kind: "cli",
    cmd: "agy",
  },
  {
    id: "anthropic-sub",
    name: "Claude Code (Anthropic)",
    kind: "cli",
    cmd: "claude",
  },
  {
    id: "openai-sub",
    name: "Codex / ChatGPT (OpenAI)",
    kind: "cli",
    cmd: "codex",
  },
  { id: "custom-cli", name: "Özel entegrasyon", kind: "cli", cmd: null },
  { id: "anthropic-api", name: "Anthropic API anahtarı", kind: "api" },
  { id: "gemini-api", name: "Gemini API anahtarı", kind: "api" },
  { id: "openai-compatible", name: "OpenAI uyumlu API", kind: "api" },
  { id: "offline", name: "Yapay zekasız (kural tabanlı)", kind: "local" },
];

export async function providerHealth(config) {
  const out = {};
  const [c, x, a] = await Promise.all([
    hasCommand("claude"),
    hasCommand("codex"),
    hasCommand("agy", ["--version"]),
  ]);
  out["kesit-ai"] = { ok: true, version: "Kesit Cloud AI" };
  out["google-sub"] = a;
  out["anthropic-sub"] = c;
  out["openai-sub"] = x;
  out["custom-cli"] = {
    ok: !!config.customCli,
    version: config.customCli ? "şablon tanımlı" : "şablon yok",
  };
  out["anthropic-api"] = {
    ok: !!config.anthropicKey,
    version: config.anthropicKey ? "anahtar var" : "anahtar yok",
  };
  out["gemini-api"] = {
    ok: !!config.geminiKey,
    version: config.geminiKey ? "anahtar var" : "anahtar yok",
  };
  out["openai-compatible"] = {
    ok: !!config.openaiBase,
    version: config.openaiBase || "tanımsız",
  };
  out.offline = { ok: true, version: "her zaman" };
  return out;
}

function tmpFile(content) {
  const f = path.join(
    os.tmpdir(),
    `ms-prompt-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`,
  );
  fs.writeFileSync(f, content);
  return f;
}

export async function complete(provider, prompt, { model, config = {} } = {}) {
  switch (provider) {
    case "anthropic-sub": {
      const args = ["-p", "--output-format", "json"];
      if (model) args.push("--model", model);
      const r = await run("claude", args, { input: prompt }).catch((e) => {
        let j = null;
        try {
          j = JSON.parse(e.stdout || "");
        } catch {}
        const m = j?.result || e.message;
        if (/not logged in|login/i.test(m))
          throw new Error(
            "Anthropic hesabı bağlı değil. Ayarlar → Yapay zekâ bölümünden hesabını bağla, sonra tekrar dene.",
          );
        throw new Error(
          "Yapay zekâ isteği tamamlanamadı: " + String(m).slice(0, 200),
        );
      });
      try {
        const j = JSON.parse(r.stdout);
        if (j.is_error)
          throw new Error(j.result || "Yapay zekâ bir hata döndürdü");
        return j.result ?? r.stdout;
      } catch (e) {
        if (e instanceof SyntaxError) return r.stdout;
        throw e;
      }
    }
    case "google-sub": {
      // Antigravity CLI (agy): tek seferlik, etkileşimsiz mod. Önce Terminal'de bir kez `agy` ile giriş yapılmış olmalı.
      const args = ["-p", prompt];
      if (model) args.push("--model", model);
      const r = await run("agy", args, {
        timeout: 8 * 60 * 1000,
        cwd: os.tmpdir(),
      }).catch((e) => {
        const m = String(e.message || "");
        if (/ENOENT|not found/i.test(m))
          throw new Error(
            "Google bağlantısı kurulu değil. Ayarlar bölümünden bağla.",
          );
        if (/zaman aşımı/i.test(m))
          throw new Error(
            "Google bağlantısı yanıt vermedi (8 dk). Hesabını yeniden bağla; sorun sürerse başka bir yapay zekâ kaynağı seç.",
          );
        if (/auth|login|sign.?in|credential/i.test(m))
          throw new Error(
            "Google hesabı bağlı değil. Ayarlar bölümünden bağla, sonra tekrar dene.",
          );
        throw new Error("Yapay zekâ isteği tamamlanamadı: " + m.slice(0, 200));
      });
      return r.stdout;
    }
    case "google-legacy": {
      const args = [
        "-p",
        "Follow the full instructions given on stdin exactly. Output only what they ask for.",
        "--skip-trust",
      ];
      if (model) args.push("-m", model);
      const r = await run("gemini", args, {
        input: prompt,
        env: { GEMINI_CLI_TRUST_WORKSPACE: "true" },
      }).catch((e) => {
        if (
          /IneligibleTier|no longer supported|Antigravity/i.test(
            String(e.message),
          )
        )
          throw new Error(
            "Bu bağlantı artık desteklenmiyor. Soldan başka bir yapay zekâ kaynağı seç.",
          );
        throw e;
      });
      return r.stdout;
    }
    case "openai-sub": {
      const outFile = path.join(os.tmpdir(), `ms-codex-${Date.now()}.txt`);
      const args = [
        "exec",
        "--skip-git-repo-check",
        "--output-last-message",
        outFile,
      ];
      if (model) args.push("-m", model);
      args.push("-");
      const r = await run("codex", args, { input: prompt });
      try {
        return fs.readFileSync(outFile, "utf8");
      } catch {
        return r.stdout;
      }
    }
    case "custom-cli": {
      if (!config.customCli) throw new Error("Ayarlar > Özel CLI komutu boş");
      const pf = tmpFile(prompt);
      const cmdline = config.customCli.replaceAll(
        "{prompt_file}",
        JSON.stringify(pf),
      );
      const usesFile = config.customCli.includes("{prompt_file}");
      const r = await run(cmdline, [], {
        input: usesFile ? undefined : prompt,
        env: { MS_PROMPT_FILE: pf },
      }).catch(async (e) => {
        // shell olmayan platformlarda komut satırını sh ile çalıştır
        if (process.platform !== "win32")
          return run("sh", ["-c", cmdline], {
            input: usesFile ? undefined : prompt,
          });
        throw e;
      });
      return r.stdout;
    }
    case "anthropic-api": {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": config.anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: model || config.anthropicModel || "claude-sonnet-5-5",
          max_tokens: 16000,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error?.message || JSON.stringify(j));
      return j.content.map((c) => c.text || "").join("");
    }
    case "gemini-api": {
      const m = model || config.geminiModel || "gemini-2.5-flash";
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${encodeURIComponent(config.geminiKey)}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" },
          }),
        },
      );
      const j = await res.json();
      if (!res.ok) throw new Error(j.error?.message || JSON.stringify(j));
      return (
        j.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || ""
      );
    }
    case "openai-compatible": {
      const base = (config.openaiBase || "https://api.openai.com/v1").replace(
        /\/$/,
        "",
      );
      const res = await fetch(base + "/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(config.openaiKey
            ? { authorization: `Bearer ${config.openaiKey}` }
            : {}),
        },
        body: JSON.stringify({
          model: model || config.openaiModel || "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error?.message || JSON.stringify(j));
      return j.choices?.[0]?.message?.content || "";
    }
    case "kesit-ai": {
      const openRouterKey = process.env.OPENROUTER_API_KEY;
      if (!openRouterKey)
        throw new Error(
          "Kesit AI anahtarı sunucuda yapılandırılmamış (OPENROUTER_API_KEY).",
        );
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${openRouterKey}`,
          "HTTP-Referer": "https://kesit.app",
          "X-Title": "Kesit Studio",
        },
        body: JSON.stringify({
          model: model || "google/gemini-2.0-flash-001",
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error?.message || JSON.stringify(j));
      return j.choices?.[0]?.message?.content || "";
    }
    default:
      throw new Error("Bilinmeyen sağlayıcı: " + provider);
  }
}

/** JSON bekleyen çağrı; bozuk JSON gelirse bir kez düzelttirir */
export async function completeJSON(provider, prompt, opts) {
  const text = await complete(provider, prompt, opts);
  try {
    return extractJSON(text);
  } catch (e) {
    const fix = await complete(
      provider,
      `The following text was supposed to be a single valid JSON value but failed to parse (${e.message}). Return ONLY the corrected valid JSON, nothing else.\n\n${text.slice(0, 60000)}`,
      opts,
    );
    return extractJSON(fix);
  }
}
