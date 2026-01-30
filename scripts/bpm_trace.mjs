import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const trackPath = process.argv[2];
const genreArg = process.argv[3] || '';
if (!trackPath) {
  console.error('Usage: node scripts/bpm_trace.mjs <absolute-path-to-mp3>');
  process.exit(2);
}

async function resolveFfmpeg() {
  try {
    const mod = await import('@ffmpeg-installer/ffmpeg');
    return mod.path || mod.default?.path || 'ffmpeg';
  } catch (e) {
    return 'ffmpeg';
  }
}

(async () => {
  const ffmpeg = await resolveFfmpeg();
  console.log('[bpm_trace] Using ffmpeg:', ffmpeg);

  const args = ['-i', trackPath, '-ac', '1', '-ar', '22050', '-f', 'f32le', '-acodec', 'pcm_f32le', 'pipe:1'];
  console.log('[bpm_trace] Spawning ffmpeg with args:', args.join(' '));
  const res = spawnSync(ffmpeg, args, { encoding: 'buffer', maxBuffer: 1024 * 1024 * 200 });
  if (res.error) {
    console.error('[bpm_trace] ffmpeg spawn error', res.error);
    process.exit(3);
  }
  if (res.status !== 0) {
    console.error('[bpm_trace] ffmpeg exited non-zero, code=', res.status, 'stderr=');
    console.error(res.stderr.toString('utf8'));
    process.exit(4);
  }

  const out = res.stdout;
  if (!out || out.length < 4) {
    console.error('[bpm_trace] No audio data from ffmpeg');
    process.exit(5);
  }

  const floatArray = new Float32Array(out.buffer, out.byteOffset, Math.floor(out.length / 4));
  const audioBuffer = {
    sampleRate: 22050,
    numberOfChannels: 1,
    length: floatArray.length,
    getChannelData: (ch) => floatArray,
  };

  // Import the analyzers dynamically
  const bpmMod = await import(pathToFileURL(path.join(process.cwd(), 'src', 'audio', 'BpmAnalyzer.js')).href);
  const AudioAnalyzerMod = await import(pathToFileURL(path.join(process.cwd(), 'src', 'audio', 'AudioAnalyzer_refactored.js')).href);
  const analyzerConfigMod = await import(pathToFileURL(path.join(process.cwd(), 'src', 'utils', 'analyzerConfig.js')).href);

  const detectBPMWithCandidates = bpmMod.detectBPMWithCandidates;
  const AudioAnalyzerRefactored = AudioAnalyzerMod.default;

  console.log('[bpm_trace] Running detectBPMWithCandidates...');
  const r = await detectBPMWithCandidates(audioBuffer, {});
  console.log('[bpm_trace] detectBPMWithCandidates result:');
  console.log(JSON.stringify(r, null, 2));

  const analyzer = new AudioAnalyzerRefactored();
  // prepare candidates format for finalizer
  const candidates = r.candidates || [];
  // Determine cfg (use analyzerConfig if available and genreArg provided)
  let cfg = {};
  try {
    const ac = analyzerConfigMod.default || analyzerConfigMod;
    cfg = (typeof ac.getConfigForGenre === 'function' && genreArg)
      ? ac.getConfigForGenre(genreArg) || ac.global || {}
      : ac.global || {};
  } catch (e) {
    cfg = {};
  }

  // Call finalizeBpmWithGroove with resolved cfg
  const finalized = analyzer.finalizeBpmWithGroove(r.primary || r.primary, genreArg || '', 1, { candidates, cfg });
  console.log('[bpm_trace] finalizeBpmWithGroove result:');
  console.log(JSON.stringify(finalized, null, 2));

  // Recompute internal scoring here to inspect candidate scores (mirror finalizeBpmWithGroove)
  const prune = cfg.bpmCandidatePruneThreshold || 0.6;
  let kept = candidates.filter((c) => (c.confidence || 0) >= prune);
  if (kept.length === 0) kept = candidates.slice(0, 1);
  const multipliers = [0.25, 0.5, 1, 1.5, 2, 3, 4];
  const scoreMap = new Map();
  kept.forEach((c) => {
    multipliers.forEach((mult) => {
      const v = Math.round(c.value * mult);
      if (v < 20 || v > 300) return;
      const bias = v >= 100 && v <= 180 ? 1.05 : 1.0;
      scoreMap.set(v, (scoreMap.get(v) || 0) + c.confidence * bias);
    });
  });
  const displayCandidates = Array.from(scoreMap)
    .map(([val, score]) => ({ val, score }))
    .sort((a, b) => b.score - a.score);
  console.log('[bpm_trace] recomputed displayCandidates:');
  console.log(JSON.stringify(displayCandidates, null, 2));

  process.exit(0);
})();
