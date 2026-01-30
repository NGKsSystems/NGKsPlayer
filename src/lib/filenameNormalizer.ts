// NGKsPlayer — Filename Normalizer (Artist - Title.ext)
// Hybrid approach: regex first, optional tag read, OpenRouter fallback.
// Node/Electron main-process safe. Requires Node 18+ (fetch) or polyfill.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as mm from "music-metadata"; // npm i music-metadata

const AUDIO_EXTS = new Set([
  ".mp3",".flac",".m4a",".aac",".ogg",".wav",".wma",".opus",".mp4"
]);

const DASH_RE = /\s+[\-–—]\s+/;
const TRACKNUM_RE = /^\s*(?:disc\s*\d+\s*[-_. ]*)?(?:cd\s*\d+\s*[-_. ]*)?(?:\d{1,2}|[A-Za-z]\d)\s*[-_. ]+/i;
const NOISE_RE = new RegExp([
  String.raw`\[(?:[^\]]+)\]`,
  String.raw`\((?:[^)]+)\)`,
  String.raw`\{(?:[^}]+)\}`,
  String.raw`\b(?:official|lyrics?|audio|video|mv|hd|uhd|remaster(?:ed)?|visualizer|live|cover|clean|dirty|explicit|radio edit|320kbps|128kbps|hq|4k|prod\.?.*|mix|rip)\b`,
  String.raw`https?://\S+`,
].join("|"), "i");

export type NormalizePlan =
  | { status: "plan"; from: string; to: string; srcPath: string; dstPath: string }
  | { status: "skip"; reason: string; file: string; srcPath: string }
  | { status: "error"; file: string; srcPath: string; error: string };

export type ApplyResult =
  | { status: "renamed"; from: string; to: string; srcPath: string; dstPath: string }
  | { status: "error"; file: string; srcPath: string; error: string };

export interface NormalizerOptions {
  useTags?: boolean;                 // read ID3/FLAC/etc
  useLLM?: boolean;                  // ask OpenRouter on ambiguous
  llmModel?: string;                 // e.g., "openrouter/anthropic/claude-3.5-sonnet"
  openRouterKey?: string;            // defaults to process.env.OPENROUTER_API_KEY
  dryRun?: boolean;                  // only plan, don't rename
  recurse?: boolean;                 // process subfolders
  flipIfTitleDashArtist?: boolean;   // try flipping when detection says reversed
}

function cleanNoise(s: string): string {
  const s1 = s.replaceAll("_", " ").replace(NOISE_RE, " ");
  return s1.replace(/\s+/g, " ").replace(/[.\s-_]+$/g, "").trim();
}

function alreadyNormalized(stem: string): boolean {
  // MAXIMUM DETECTION MODE - Flag absolutely everything for processing
  console.log(`🔍 CHECKING: "${stem}"`);
  console.log(`❌ FLAGGED: Maximum detection mode - flagging all files`);
  return false; // Flag every single file
}

function sanitize(s: string): string {
  return s
    .replaceAll("/", "-").replaceAll("\\", "-")
    .replaceAll(":", " -")
    .replace(/[<>|?*"^]/g, "")
    .replace(/\s+/g, " ")
    .replace(/^[.\s]+|[.\s]+$/g, "");
}

function tidyFeat(s: string): string {
  let out = s.replace(/\b(feat|ft|featuring)\.?(\s+)/ig, "feat. ");
  out = out.replace(/ ?\((feat\.[^)]+)\)/ig, " $1");
  return out.trim();
}

function normalizeParts(artist: string, title: string) {
  return {
    artist: tidyFeat(sanitize(artist)),
    title: tidyFeat(sanitize(title)),
  };
}

function trySplitLocal(stem: string): { artist?: string; title?: string } {
  let base = cleanNoise(stem);
  base = base.replace(TRACKNUM_RE, "");

  // A) Artist - Title (with spaced dash variants)
  if (DASH_RE.test(base)) {
    const [a, t] = base.split(DASH_RE, 2);
    return { artist: a?.trim(), title: t?.trim() };
  }
  // B) Title by Artist
  const bym = base.match(/(.+?)\s+by\s+(.+)$/i);
  if (bym) return { artist: bym[2].trim(), title: bym[1].trim() };

  // C) Loose dash: Artist-Title
  const dm = base.match(/^(.+?)[\-–—](.+)$/);
  if (dm) return { artist: dm[1].trim(), title: dm[2].trim() };

  return {};
}

async function readTags(filePath: string): Promise<{ artist?: string; title?: string }> {
  try {
    const meta = await mm.parseFile(filePath, { duration: false });
    const artist = meta.common.artist?.trim();
    const title = meta.common.title?.trim();
    return { artist: artist || undefined, title: title || undefined };
  } catch {
    return {};
  }
}

async function askOpenRouter(model: string, stem: string, key?: string): Promise<{artist?: string; title?: string}> {
  const apiKey = key || process.env.OPENROUTER_API_KEY;
  if (!apiKey) return {};

  const sys = [
    "You convert messy music filenames into structured parts.",
    "Return ONLY JSON: {\"artist\":\"...\",\"title\":\"...\"}.",
    "Ignore track numbers, bracketed tags, URLs, bitrate tokens, '(Official Video)', etc.",
    "If it's 'Title - Artist', flip to Artist/Title.",
    "If uncertain, return {\"artist\":null,\"title\":null}.",
  ].join("\n");

  const payload = {
    model,
    temperature: 0,
    max_tokens: 64,
    messages: [
      { role: "system", content: sys },
      { role: "user", content: `Filename (no extension): "${stem}"` },
    ],
  };

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://ngkssystems.com/ngksplayer",
      "X-Title": "NGKsPlayer Normalizer",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) return {};
  const data: any = await res.json();
  const content: string = data?.choices?.[0]?.message?.content ?? "";
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start === -1 || end === -1) return {};
  try {
    const obj = JSON.parse(content.slice(start, end + 1));
    const artist = (obj.artist ?? "").trim();
    const title = (obj.title ?? "").trim();
    if (artist && title) return { artist, title };
  } catch {}
  return {};
}

async function nextAvailable(targetPath: string): Promise<string> {
  try { await fs.access(targetPath); } catch { return targetPath; }
  const dir = path.dirname(targetPath);
  const ext = path.extname(targetPath);
  const stem = path.basename(targetPath, ext);
  let i = 2;
  while (true) {
    const cand = path.join(dir, `${stem} (${i})${ext}`);
    try { await fs.access(cand); i++; }
    catch { return cand; }
  }
}

export async function planForFile(
  filePath: string,
  opts: NormalizerOptions
): Promise<NormalizePlan> {
  const ext = path.extname(filePath).toLowerCase();
  const base = path.basename(filePath);
  const stem = path.basename(filePath, ext);

  console.log(`📋 PLANNING FILE: "${base}"`);

  if (!AUDIO_EXTS.has(ext)) {
    console.log(`⚠️ SKIP: Not audio file`);
    return { status: "skip", reason: "not_audio", file: base, srcPath: filePath };
  }
  if (alreadyNormalized(stem)) {
    console.log(`⚠️ SKIP: Already normalized`);
    return { status: "skip", reason: "already_normal", file: base, srcPath: filePath };
  }

  // 1) Local split
  let { artist, title } = trySplitLocal(stem);
  console.log(`🔍 After local split: artist="${artist}", title="${title}"`);

  // 2) Tags to fill gaps
  if (opts.useTags && (!artist || !title)) {
    const t = await readTags(filePath);
    artist = artist || t.artist;
    title  = title  || t.title;
    console.log(`🏷️ After tags: artist="${artist}", title="${title}"`);
  }

  // 3) LLM fallback
  if (opts.useLLM && (!artist || !title)) {
    const r = await askOpenRouter(opts.llmModel ?? "openrouter/anthropic/claude-3.5-sonnet", stem, opts.openRouterKey);
    artist = artist || r.artist;
    title  = title  || r.title;
    console.log(`🤖 After AI: artist="${artist}", title="${title}"`);
  }

  if (!artist || !title) {
    console.log(`❌ SKIP: Can't parse - missing artist or title`);
    return { status: "skip", reason: "cant_parse", file: base, srcPath: filePath };
  }

  // Flip if looks reversed (common case: Title - Artist)
  if (opts.flipIfTitleDashArtist && DASH_RE.test(cleanNoise(stem))) {
    // crude heuristic: if local looked like Title - Artist (often Title shorter than Artist with commas)
    const [left, right] = cleanNoise(stem).split(DASH_RE, 2);
    const looksTitleArtist = left && right && left.split(" ").length <= 4 && right.split(" ").length >= 2;
    if (looksTitleArtist) {
      [artist, title] = [title, artist];
      console.log(`🔄 Flipped to: artist="${artist}", title="${title}"`);
    }
  }

  const parts = normalizeParts(artist, title);
  const toName = `${parts.artist} - ${parts.title}${ext}`;
  const dstPath = path.join(path.dirname(filePath), toName);

  console.log(`📝 Final result: "${base}" → "${toName}"`);

  if (path.basename(dstPath) === base) {
    console.log(`❌ SKIP: Unchanged after normalization`);
    return { status: "skip", reason: "unchanged", file: base, srcPath: filePath };
  }

  return { status: "plan", from: base, to: toName, srcPath: filePath, dstPath };
}

export async function planForFolder(root: string, opts: NormalizerOptions): Promise<NormalizePlan[]> {
  const entries: string[] = [];
  async function walk(dir: string) {
    const ls = await fs.readdir(dir, { withFileTypes: true });
    for (const d of ls) {
      const p = path.join(dir, d.name);
      if (d.isDirectory()) {
        if (opts.recurse) await walk(p);
      } else {
        entries.push(p);
      }
    }
  }
  const stat = await fs.stat(root);
  if (stat.isDirectory()) await walk(root); else entries.push(root);
  const plans: NormalizePlan[] = [];
  for (const p of entries) plans.push(await planForFile(p, opts));
  return plans;
}

export async function applyPlans(plans: NormalizePlan[]): Promise<ApplyResult[]> {
  const out: ApplyResult[] = [];
  for (const p of plans) {
    if (p.status !== "plan") continue;
    try {
      const safeDst = await nextAvailable(p.dstPath);
      await fs.rename(p.srcPath, safeDst);
      out.push({ status: "renamed", from: p.from, to: path.basename(safeDst), srcPath: p.srcPath, dstPath: safeDst });
    } catch (e: any) {
      out.push({ status: "error", file: p.from, srcPath: p.srcPath, error: String(e?.message || e) });
    }
  }
  return out;
}

// Optional: write undo map alongside changes
export async function writeUndoMap(results: ApplyResult[], destJsonPath: string) {
  const map = results
    .filter(r => r.status === "renamed")
    .map(r => ({ from: r.srcPath, to: (r as any).dstPath }));
  await fs.writeFile(destJsonPath, JSON.stringify({ createdAt: new Date().toISOString(), map }, null, 2), "utf8");
}

// Calculate statistics for normalization plans
export function calculateStats(plans: NormalizePlan[]) {
  const stats = {
    total: plans.length,
    toRename: 0,
    skipped: 0,
    errors: 0,
    skipReasons: {} as Record<string, number>
  };

  for (const plan of plans) {
    if (plan.status === 'plan') {
      stats.toRename++;
    } else if (plan.status === 'skip') {
      stats.skipped++;
      const reason = plan.reason || 'unknown';
      stats.skipReasons[reason] = (stats.skipReasons[reason] || 0) + 1;
    } else if (plan.status === 'error') {
      stats.errors++;
    }
  }

  return stats;
}
