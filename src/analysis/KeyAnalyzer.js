// KeyAnalyzer.js
// Optimized key detection with fast/deep support

const KK_MAJOR = [
  6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88,
];
const KK_MINOR = [
  6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17,
];

const noteNames = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

function hann(n, N) {
  return 0.5 - 0.5 * Math.cos((2 * Math.PI * n) / (N - 1));
}

// Fast magnitude DFT (O(N²) but small N — fine for key)
function getMagnitude(frame) {
  const N = frame.length;
  const mag = new Float32Array(N / 2);
  for (let k = 0; k < N / 2; k++) {
    let re = 0,
      im = 0;
    for (let n = 0; n < N; n++) {
      const angle = (2 * Math.PI * k * n) / N;
      const sample = frame[n];
      re += sample * Math.cos(angle);
      im -= sample * Math.sin(angle);
    }
    mag[k] = Math.sqrt(re * re + im * im);
  }
  return mag;
}

function freqToPitchClass(freq) {
  const A4 = 440;
  const semis = Math.round(12 * Math.log2(freq / A4));
  return ((semis % 12) + 12) % 12;
}

function buildChromaProfile(channelData, sampleRate, opts = {}) {
  const frameSize = opts.frameSize || 2048;
  const hop = opts.hop || 1024;
  const maxFrames = opts.maxFrames || Infinity; // for fast scan limit

  const chroma = new Array(12).fill(0);
  let framesProcessed = 0;

  for (
    let i = 0;
    i + frameSize <= channelData.length && framesProcessed < maxFrames;
    i += hop
  ) {
    const frame = new Float32Array(frameSize);
    for (let j = 0; j < frameSize; j++) {
      frame[j] = channelData[i + j] * hann(j, frameSize);
    }

    const mag = getMagnitude(frame);
    const binWidth = sampleRate / frameSize;

    for (let k = 1; k < mag.length; k++) {
      const freq = k * binWidth;
      if (freq < 80 || freq > 5000) continue;
      const pc = freqToPitchClass(freq);
      chroma[pc] += mag[k];
    }
    framesProcessed++;
  }

  const max = Math.max(...chroma, 1e-9);
  return chroma.map((v) => v / max);
}

function correlate(profile, template) {
  return profile.reduce((sum, v, i) => sum + v * template[i], 0);
}

function matchKeyProfile(profile, opts = {}) {
  const scores = [];
  for (let root = 0; root < 12; root++) {
    const maj = KK_MAJOR.map((_, i) => KK_MAJOR[(i - root + 12) % 12]);
    const min = KK_MINOR.map((_, i) => KK_MINOR[(i - root + 12) % 12]);
    scores.push({
      root,
      maj: correlate(profile, maj),
      min: correlate(profile, min),
    });
  }

  const candidates = [];
  scores.forEach((s) => {
    candidates.push({ value: noteNames[s.root], confidence: s.maj });
    candidates.push({ value: noteNames[s.root] + "m", confidence: s.min });
  });

  // Apply bias and boost
  const relBias = opts.relativeMinorBias ?? 0;
  const commonBoost = opts.commonKeyPreferenceBoost ?? 0;
  const preferred = ["G", "D", "A", "E"];

  candidates.forEach((c) => {
    if (c.value.endsWith("m")) {
      c.confidence *= 1 - Math.max(0, relBias);
    } else {
      c.confidence *= 1 + Math.max(0, relBias);
    }
    if (preferred.includes(c.value.replace("m", "")) && commonBoost > 0) {
      c.confidence *= 1 + commonBoost;
    }
  });

  candidates.sort((a, b) => b.confidence - a.confidence);
  return {
    primary: candidates[0]?.value || "C",
    candidates: candidates.slice(0, 6),
  };
}

function applyCapoCheck(profile, opts = {}) {
  if (!opts.capoTranspositionCheck) return matchKeyProfile(profile, opts);

  let bestScore = -Infinity;
  let bestResult = null;

  for (let shift = 0; shift <= 2; shift++) {
    const shifted = new Array(12);
    for (let i = 0; i < 12; i++) shifted[(i + shift) % 12] = profile[i];
    const result = matchKeyProfile(shifted, opts);
    const topScore = result.candidates[0]?.confidence || 0;
    if (topScore > bestScore) {
      bestScore = topScore;
      bestResult = { ...result, shift };
    }
  }

  if (bestResult && bestResult.shift > 0) {
    // Adjust key names back by shift
    bestResult.candidates = bestResult.candidates.map((c) => {
      const isMinor = c.value.endsWith("m");
      const name = c.value.replace("m", "");
      const idx = noteNames.indexOf(name);
      const newIdx = (idx - bestResult.shift + 12) % 12;
      return { ...c, value: noteNames[newIdx] + (isMinor ? "m" : "") };
    });
    bestResult.primary = bestResult.candidates[0]?.value || "C";
  }

  return bestResult || { primary: "C", candidates: [] };
}

export async function detectKeyWithCandidates(audioBuffer, opts = {}) {
  const data = audioBuffer.getChannelData
    ? audioBuffer.getChannelData(0)
    : audioBuffer;
  const sr = audioBuffer.sampleRate || 44100;

  const isFast = opts.isFast || false;
  const frameSize = isFast ? 1024 : 2048;
  const hop = isFast ? 512 : 1024;
  const maxFrames = isFast ? 50 : Infinity; // fast: ~10s of frames

  const profile = buildChromaProfile(data, sr, { frameSize, hop, maxFrames });

  const smoothWindow = Math.max(1, opts.chromaSmoothWindow || (isFast ? 4 : 8));
  if (smoothWindow > 1) {
    const half = Math.floor(smoothWindow / 2);
    const smoothed = new Array(12).fill(0);
    for (let i = 0; i < 12; i++) {
      let sum = 0;
      let count = 0;
      for (let j = -half; j <= half; j++) {
        const idx = (i + j + 12) % 12;
        sum += profile[idx];
        count++;
      }
      smoothed[i] = sum / count;
    }
    const max = Math.max(...smoothed, 1e-9);
    profile.splice(0, 12, ...smoothed.map((v) => v / max));
  }

  return applyCapoCheck(profile, opts);
}

export async function detectKey(audioBuffer, opts = {}) {
  const result = await detectKeyWithCandidates(audioBuffer, opts);
  return result.primary;
}
