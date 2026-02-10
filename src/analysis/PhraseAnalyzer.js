/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: PhraseAnalyzer.js
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
// PhraseAnalyzer.js
// Lightweight phrase detection for deep analysis

export function detectPhrases(channelData, sampleRate, bpm) {
  // Simple heuristic: look for energy troughs representing phrase boundaries
  const window = Math.max(1024, Math.floor(sampleRate * 0.5));
  const hop = Math.floor(window / 2);
  const energy = [];
  for (let i = 0; i + window < channelData.length; i += hop) {
    let sum = 0;
    for (let j = 0; j < window; j++) sum += Math.abs(channelData[i + j]);
    energy.push(sum / window);
  }

  const avg = energy.reduce((a, b) => a + b, 0) / Math.max(1, energy.length);
  const troughs = [];
  energy.forEach((v, idx) => {
    if (v < avg * 0.6) troughs.push({ idx, value: v });
  });

  const phrases = [];
  let last = 0;
  for (let i = 0; i < troughs.length; i++) {
    const pos = Math.floor((troughs[i].idx * hop) / sampleRate);
    if (pos - last > Math.max(8, Math.round(60 / (bpm || 120)))) {
      phrases.push(pos);
      last = pos;
    }
  }

  return { phrases: phrases.map((p) => ({ time: p })), phraseLength: phrases.length };
}

