// utils.js
// Lightweight shared audio utilities (moved copy)

export function getBasename(filePath) {
  return (filePath || "").split(/[/\\]/).pop() || filePath || "";
}

export function getMonoData(audioBuffer) {
  if (!audioBuffer || !audioBuffer.getChannelData) return new Float32Array(0);

  const channels = audioBuffer.numberOfChannels || 1;
  const length = audioBuffer.length || 0;
  const mono = new Float32Array(length);

  if (channels === 1) {
    mono.set(audioBuffer.getChannelData(0));
    return mono;
  }

  const left = audioBuffer.getChannelData(0);
  const right = channels > 1 ? audioBuffer.getChannelData(1) : left;

  for (let i = 0; i < length; i++) {
    mono[i] = (left[i] + right[i]) * 0.5;
  }

  return mono;
}

export function calculateEnergyEnvelope(
  channelData,
  sampleRate,
  windowMs = 100,
  hopRatio = 0.25
) {
  if (!channelData || channelData.length === 0) return [];

  const windowSize = Math.max(1, Math.floor((sampleRate * windowMs) / 1000));
  const hop = Math.max(1, Math.floor(windowSize * hopRatio));
  const env = [];

  for (let i = 0; i + windowSize <= channelData.length; i += hop) {
    let sum = 0;
    for (let j = 0; j < windowSize; j++) {
      const s = channelData[i + j] || 0;
      sum += s * s;
    }
    env.push(Math.sqrt(sum / windowSize));
  }

  return env;
}

export function findPeaks(
  energyData,
  sampleRate,
  windowMs = 100,
  minDistanceMs = 200,
  onsetSensitivity = 0.3
) {
  if (!energyData || energyData.length < 3) return [];

  const minDist = Math.max(1, Math.floor(minDistanceMs / windowMs));
  const len = energyData.length;
  const peaks = [];

  const mean = energyData.reduce((a, b) => a + b, 0) / len;
  const threshold = mean * (1 + onsetSensitivity);

  let i = 1;
  while (i < len - 1) {
    if (
      energyData[i] > threshold &&
      energyData[i] > energyData[i - 1] &&
      energyData[i] >= energyData[i + 1]
    ) {
      const last = peaks.length ? peaks[peaks.length - 1] : -minDist;
      if (i - last >= minDist) {
        peaks.push(i);
        i += minDist;
        continue;
      }
    }
    i++;
  }

  return peaks;
}

export function intervalsToTempo(intervals, sampleRate, windowMs = 100) {
  if (!intervals || intervals.length === 0) return 120;

  const windowSize = (sampleRate * windowMs) / 1000;
  const bpms = intervals
    .map((iv) => {
      const seconds = (iv * windowSize) / sampleRate;
      return seconds > 0 ? 60 / seconds : null;
    })
    .filter(Boolean);

  if (bpms.length === 0) return 120;

  return Math.round(findMostCommon(bpms, 3));
}

export function findMostCommon(values, tolerance = 3) {
  if (!values || values.length === 0) return 120;

  const map = new Map();
  values.forEach((v) => {
    const key = Math.round(v / tolerance) * tolerance;
    map.set(key, (map.get(key) || 0) + 1);
  });

  let best = values[0];
  let bestCount = 0;
  for (const [k, c] of map) {
    if (
      c > bestCount ||
      (c === bestCount && Math.abs(k - 120) < Math.abs(best - 120))
    ) {
      bestCount = c;
      best = k;
    }
  }

  return Math.round(best);
}

export function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  const m = Math.floor(seconds / 60);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return h > 0 ? `${h}:${mm.toString().padStart(2, "0")}:${s}` : `${m}:${s}`;
}

/**
 * Format time with tenths of a second (for cue points in DJ software)
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted as M:SS.T or H:MM:SS.T
 */
export function formatCueTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00.0";
  
  const totalSeconds = Math.floor(seconds);
  const tenths = Math.floor((seconds - totalSeconds) * 10);
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  const m = Math.floor(totalSeconds / 60);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  
  if (h > 0) {
    return `${h}:${mm.toString().padStart(2, "0")}:${s}.${tenths}`;
  }
  return `${m}:${s}.${tenths}`;
}

// --- Spectral helpers ---
function hannWindow(n) {
  const w = new Float32Array(n);
  for (let i = 0; i < n; i++) w[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)));
  return w;
}

function bitReverseIndices(n) {
  const bits = Math.log2(n) | 0;
  const rev = new Uint32Array(n);
  for (let i = 0; i < n; i++) {
    let x = i;
    let y = 0;
    for (let b = 0; b < bits; b++) {
      y = (y << 1) | (x & 1);
      x >>= 1;
    }
    rev[i] = y;
  }
  return rev;
}

function fftReal(input) {
  // In-place radix-2 Cooley-Tukey FFT for real input. Returns {re, im}
  const n = input.length;
  if ((n & (n - 1)) !== 0) throw new Error('FFT size must be power of two');
  const re = new Float32Array(n);
  const im = new Float32Array(n);
  const rev = bitReverseIndices(n);
  for (let i = 0; i < n; i++) re[i] = input[rev[i]] * 1.0;

  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1;
    const theta = (-2 * Math.PI) / len;
    const wpr = Math.cos(theta);
    const wpi = Math.sin(theta);
    for (let i = 0; i < n; i += len) {
      let wr = 1.0;
      let wi = 0.0;
      for (let j = 0; j < half; j++) {
        const idx = i + j;
        const idy = idx + half;
        const tre = wr * re[idy] - wi * im[idy];
        const tim = wr * im[idy] + wi * re[idy];
        re[idy] = re[idx] - tre;
        im[idy] = im[idx] - tim;
        re[idx] = re[idx] + tre;
        im[idx] = im[idx] + tim;
        const tmp = wr;
        wr = wr * wpr - wi * wpi;
        wi = tmp * wpi + wi * wpr;
      }
    }
  }

  return { re, im };
}

export function computeSpectralFeatures(channelData, sampleRate, opts = {}) {
  // Cheap spectral extractor: per-frame flatness and vocal-band energy (300-3000Hz)
  if (!channelData || channelData.length === 0) return { flatness: [], vocalEnergy: [], avgFlatness: 0, avgVocal: 0 };
  const frameSize = opts.frameSize || 1024; // power of two
  const hop = opts.hop || frameSize >> 1;
  const window = hannWindow(frameSize);

  const frames = [];
  for (let i = 0; i + frameSize <= channelData.length; i += hop) {
    const frame = new Float32Array(frameSize);
    for (let j = 0; j < frameSize; j++) frame[j] = (channelData[i + j] || 0) * window[j];
    frames.push(frame);
  }

  if (frames.length === 0) {
    // pad a single frame if audio is shorter
    const frame = new Float32Array(frameSize);
    for (let i = 0; i < Math.min(frameSize, channelData.length); i++) frame[i] = (channelData[i] || 0) * window[i];
    frames.push(frame);
  }

  const flatnessArr = [];
  const vocalArr = [];
  const nyquist = sampleRate / 2;
  const lowFreq = 300;
  const highFreq = 3000;
  const eps = 1e-12;

  for (const f of frames) {
    let spec;
    try { spec = fftReal(f); } catch (e) { spec = null; }
    if (!spec) {
      flatnessArr.push(0);
      vocalArr.push(0);
      continue;
    }
    const n = spec.re.length;
    const half = n >> 1;
    let geo = 0;
    let arith = 0;
    let vocalEnergy = 0;
    let totalEnergy = 0;
    for (let k = 0; k < half; k++) {
      const mag = Math.hypot(spec.re[k], spec.im[k]) + eps;
      const energy = mag * mag;
      totalEnergy += energy;
      arith += mag;
      geo += Math.log(mag);
      const freq = (k * sampleRate) / n;
      if (freq >= lowFreq && freq <= highFreq) vocalEnergy += energy;
    }
    arith = arith / half;
    geo = Math.exp(geo / half);
    const flatness = geo / (arith + eps); // 0..1
    const vocalRatio = totalEnergy > 0 ? vocalEnergy / totalEnergy : 0;
    flatnessArr.push(Math.max(0, Math.min(1, flatness)));
    vocalArr.push(Math.max(0, Math.min(1, vocalRatio)));
  }

  const avgFlat = flatnessArr.length ? flatnessArr.reduce((s,v)=>s+v,0)/flatnessArr.length : 0;
  const avgVocal = vocalArr.length ? vocalArr.reduce((s,v)=>s+v,0)/vocalArr.length : 0;
  return { flatness: flatnessArr, vocalEnergy: vocalArr, avgFlatness: avgFlat, avgVocal: avgVocal };
}

/**
 * Detect cue points (intro/outro silence) in audio buffer
 * Returns cue in/out times in seconds
 * @param {AudioBuffer} audioBuffer - The audio buffer to analyze
 * @param {Object} options - Detection options
 * @returns {Object} { cueIn: number, cueOut: number } in seconds
 */
export function detectCuePoints(audioBuffer, options = {}) {
  const {
    silenceThreshold = -40, // dB threshold for silence
    minSilenceDuration = 0.3, // minimum silence duration in seconds
    maxIntroScan = 10, // max seconds to scan for intro
    maxOutroScan = 10, // max seconds to scan for outro
  } = options;

  if (!audioBuffer || audioBuffer.length === 0) {
    return { cueIn: 0, cueOut: audioBuffer?.duration || 0 };
  }

  const mono = getMonoData(audioBuffer);
  const sampleRate = audioBuffer.sampleRate;
  const duration = audioBuffer.duration;
  
  // Convert threshold from dB to linear amplitude
  const threshold = Math.pow(10, silenceThreshold / 20);
  const minSilenceSamples = Math.floor(minSilenceDuration * sampleRate);
  
  // Find cue in (first non-silent point)
  let cueIn = 0;
  const introScanSamples = Math.min(Math.floor(maxIntroScan * sampleRate), mono.length);
  let silenceCount = 0;
  
  for (let i = 0; i < introScanSamples; i++) {
    const amp = Math.abs(mono[i]);
    if (amp < threshold) {
      silenceCount++;
    } else {
      if (silenceCount >= minSilenceSamples) {
        // Found end of intro silence
        cueIn = i / sampleRate;
        break;
      }
      silenceCount = 0;
    }
  }
  
  // Find cue out (last non-silent point before outro silence)
  let cueOut = duration;
  const outroStartSample = Math.max(0, mono.length - Math.floor(maxOutroScan * sampleRate));
  silenceCount = 0;
  let lastSoundPosition = mono.length;
  
  // Scan backwards from end
  for (let i = mono.length - 1; i >= outroStartSample; i--) {
    const amp = Math.abs(mono[i]);
    if (amp < threshold) {
      silenceCount++;
    } else {
      if (silenceCount >= minSilenceSamples) {
        // Found start of outro silence
        lastSoundPosition = i + silenceCount;
        cueOut = lastSoundPosition / sampleRate;
        break;
      }
      silenceCount = 0;
      lastSoundPosition = i;
    }
  }
  
  // If we didn't find significant silence, use conservative defaults
  // Leave a small margin (0.1s at start, 1s before end)
  if (cueIn === 0 && introScanSamples > 0) {
    // Check if the very start is silent
    let startSilent = true;
    for (let i = 0; i < Math.min(1000, mono.length); i++) {
      if (Math.abs(mono[i]) > threshold) {
        startSilent = false;
        break;
      }
    }
    if (!startSilent) {
      cueIn = 0.1; // Small safety margin if not silent at start
    }
  }
  
  if (cueOut === duration) {
    cueOut = Math.max(0, duration - 1); // Leave 1s before track end
  }
  
  // Round to 2 decimal places
  cueIn = Math.round(cueIn * 100) / 100;
  cueOut = Math.round(cueOut * 100) / 100;
  
  // Ensure cueOut is after cueIn and before end
  cueOut = Math.max(cueIn + 1, Math.min(cueOut, duration - 0.1));
  
  return { cueIn, cueOut };
}

/**
 * Generate a text description of the track's intro/outro characteristics
 * @param {Object} cuePoints - { cueIn, cueOut } in seconds
 * @param {number} duration - Total track duration in seconds
 * @param {AudioBuffer} audioBuffer - The audio buffer for fade detection
 * @returns {string} Human-readable description
 */
export function generateCueDescription(cuePoints, duration, audioBuffer) {
  const { cueIn, cueOut } = cuePoints;
  const parts = [];
  
  // Intro description
  if (cueIn < 0.5) {
    parts.push("immediate entry");
  } else if (cueIn < 2) {
    parts.push(`brief intro, full entry at ${formatCueTime(cueIn)}`);
  } else if (cueIn < 5) {
    parts.push(`full entry at ${formatCueTime(cueIn)} but mixable`);
  } else {
    parts.push(`extended intro, full entry at ${formatCueTime(cueIn)}`);
  }
  
  // Check for fade out by analyzing the last few seconds
  const fadeStart = detectFadeStart(audioBuffer, cueOut);
  const timeBeforeEnd = duration - cueOut;
  
  // Outro description
  if (fadeStart !== null && fadeStart < cueOut) {
    const fadeStartFormatted = formatCueTime(fadeStart);
    parts.push(`song begins fade out at ${fadeStartFormatted}`);
    parts.push(`ends at ${formatCueTime(cueOut)}`);
    
    if (timeBeforeEnd > 5) {
      parts.push("easy mix on fade out");
    } else if (timeBeforeEnd > 2) {
      parts.push("mixable fade out");
    } else {
      parts.push("quick fade");
    }
  } else {
    if (timeBeforeEnd < 1) {
      parts.push("plays to end");
    } else if (timeBeforeEnd < 3) {
      parts.push(`ends at ${formatCueTime(cueOut)}, brief outro`);
    } else {
      parts.push(`ends at ${formatCueTime(cueOut)}, extended outro`);
    }
  }
  
  return parts.join(", ");
}

/**
 * Detect where a fade out begins by analyzing energy decay
 * @param {AudioBuffer} audioBuffer - The audio buffer
 * @param {number} cueOut - Cue out point in seconds
 * @returns {number|null} Fade start time in seconds, or null if no fade detected
 */
function detectFadeStart(audioBuffer, cueOut) {
  const mono = getMonoData(audioBuffer);
  const sampleRate = audioBuffer.sampleRate;
  const duration = audioBuffer.duration;
  
  // Scan the last 15 seconds before cueOut
  const scanDuration = Math.min(15, cueOut);
  const scanStart = Math.max(0, cueOut - scanDuration);
  const scanStartSample = Math.floor(scanStart * sampleRate);
  const cueOutSample = Math.floor(cueOut * sampleRate);
  
  // Calculate energy in 0.5 second windows
  const windowSize = Math.floor(0.5 * sampleRate);
  const energies = [];
  const times = [];
  
  for (let i = scanStartSample; i < cueOutSample; i += windowSize / 2) {
    const endIdx = Math.min(i + windowSize, mono.length);
    let sum = 0;
    for (let j = i; j < endIdx; j++) {
      sum += mono[j] * mono[j];
    }
    energies.push(Math.sqrt(sum / (endIdx - i)));
    times.push(i / sampleRate);
  }
  
  if (energies.length < 4) return null;
  
  // Find sustained energy decrease (fade)
  const maxEnergy = Math.max(...energies);
  let fadeStartIdx = null;
  
  for (let i = 0; i < energies.length - 3; i++) {
    // Check if energy is decreasing over next 3 windows
    if (energies[i] > maxEnergy * 0.5 && 
        energies[i] > energies[i + 1] &&
        energies[i + 1] > energies[i + 2] &&
        energies[i + 2] > energies[i + 3]) {
      fadeStartIdx = i;
      break;
    }
  }
  
  if (fadeStartIdx !== null && fadeStartIdx < times.length) {
    return times[fadeStartIdx];
  }
  
  return null;
}