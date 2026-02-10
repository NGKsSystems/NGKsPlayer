/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: EnergyAnalyzer.js
 * Purpose: TODO â€“ describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
// EnergyAnalyzer.js
// Optimized multi-factor energy + trajectory (moved copy)

export function calculateEnergyFromBuffer(
  audioBufferOrData,
  genre = "",
  opts = {}
) {
  let data;
  let sampleRate = 44100;

  if (audioBufferOrData.getChannelData) {
    data = audioBufferOrData.getChannelData(0);
    sampleRate = audioBufferOrData.sampleRate || sampleRate;
  } else {
    data = audioBufferOrData;
  }

  if (data.length === 0) return 50;

  const len = data.length;
  const step = Math.max(1, Math.floor(len / 5000)); // heavy subsampling for speed (5k points max)

  // 1. RMS (loudness)
  let sumSquares = 0;
  for (let i = 0; i < len; i += step) {
    sumSquares += data[i] ** 2;
  }
  const rms = Math.sqrt(sumSquares / (len / step));

  // 2. Onset density (spectral flux proxy)
  let flux = 0;
  let prevAbs = 0;
  for (let i = step; i < len; i += step) {
    const currAbs = Math.abs(data[i]);
    flux += Math.max(0, currAbs - prevAbs);
    prevAbs = currAbs;
  }
  const onsetDensity = flux / (len / step) / 0.1; // normalize

  // 3. Brightness (high vs total energy)
  let highEnergy = 0;
  let totalEnergy = 0;
  for (let i = 0; i < len; i += step) {
    const val = data[i] ** 2;
    totalEnergy += val;
    if (i % 4 === 0) highEnergy += val; // crude high-freq proxy
  }
  const brightness = totalEnergy > 0 ? highEnergy / totalEnergy : 0;

  // 4. Bass weight (low samples dominate)
  let lowEnergy = 0;
  for (let i = 0; i < len; i += step * 2) {
    lowEnergy += Math.abs(data[i]);
  }
  const lowRatio = lowEnergy / Math.max(1, len / (step * 2));

  // 5. Dynamic range
  let peak = 0;
  for (let i = 0; i < len; i += step) {
    const abs = Math.abs(data[i]);
    if (abs > peak) peak = abs;
  }
  const dynamicRange = peak > 0 ? 20 * Math.log10(peak / rms) : 0;

  // Combine
  let energy = 0;
  energy += rms * 85; // Loudness
  energy += onsetDensity * 20; // Rhythm
  energy += brightness * 35; // Brightness
  energy += lowRatio * 25; // Bass
  energy -= Math.max(0, (dynamicRange - 10) * 1.8); // Dynamic = chill

  energy = Math.max(0, Math.min(100, energy));

  // Apply config
  const scale = opts.energyScalingFactor ?? 1.0;
  const cap = opts.energyMaxCap ?? 100;
  energy *= scale;
  energy = Math.min(cap, energy);

  return Math.round(energy);
}

export function analyzeEnergyTrajectory(
  channelData,
  sampleRate,
  audioBuffer,
  opts = {}
) {
  const windowMs = 200;
  const windowSize = Math.max(1, Math.floor((sampleRate * windowMs) / 1000));
  const hop = Math.floor(windowSize / 2);
  const step = Math.max(1, Math.floor(channelData.length / 2000)); // max 2000 points

  const env = [];
  for (let i = 0; i + windowSize < channelData.length; i += hop * step) {
    let sum = 0;
    for (let j = 0; j < windowSize && i + j < channelData.length; j += step) {
      sum += channelData[i + j] ** 2;
    }
    env.push(Math.sqrt(sum / (windowSize / step || 1)));
  }

  const max = Math.max(...env, 1e-9);
  const norm = env.map((v) => v / max);

  const startThresh = opts.reverbTailThreshold ?? 0.6;
  const endThresh = startThresh / 1.5;
  const desc =
    norm[0] > startThresh && norm[norm.length - 1] < endThresh
      ? "fade-out"
      : "steady";

  return { trajectory: norm, description: desc };
}

