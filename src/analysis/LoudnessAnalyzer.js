// LoudnessAnalyzer.js
// Lightweight loudness & LUFS calculations (moved copy)

export function calculateLUFS(channelData, sampleRate) {
  // Very small estimator: RMS-based approximation mapping to LUFS-like scale
  if (!channelData || channelData.length === 0) return -23;
  let sum = 0;
  for (let i = 0; i < channelData.length; i++) sum += channelData[i] ** 2;
  const rms = Math.sqrt(sum / channelData.length);
  // map rms [0..1] to LUFS [-30..-6]
  const lufs = -30 + Math.min(24, Math.max(0, rms * 30));
  return Math.round(lufs * 10) / 10;
}

export function calculateLoudnessRange(energyEnvelope) {
  if (!energyEnvelope || energyEnvelope.length === 0) return 0;
  const max = Math.max(...energyEnvelope);
  const min = Math.min(...energyEnvelope);
  return Math.round((max - min) * 10) / 10;
}
