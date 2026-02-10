/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: TransitionAnalyzer.js
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
// TransitionAnalyzer.js
// Analyze transitions / difficulty between song segments

export function analyzeTransitionDifficulty(channelData, audioBuffer, sampleRate, opts = {}) {
  // crude heuristic: measure variance over windowed sections
  const window = Math.max(1024, Math.floor(sampleRate * 1.0));
  const hop = Math.floor(window / 2);
  const energies = [];
  for (let i = 0; i + window < channelData.length; i += hop) {
    let sum = 0;
    for (let j = 0; j < window; j++) sum += Math.abs(channelData[i + j]);
    energies.push(sum / window);
  }

  const mean = energies.reduce((a, b) => a + b, 0) / Math.max(1, energies.length);
  const variance = energies.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, energies.length);

  const difficulty = Math.min(100, Math.round(Math.sqrt(variance) * 100));
  const description = difficulty > 30 ? 'complex' : 'smooth';

  return { difficulty, description };
}

