// src/themes/chromatic-chaos/index.js

import './chromatic-chaos.css';

export function applyEffect(canvas, ctx, beatStrength, isSuperPeak) {
  // Call your effects
  intensifyRGBSplit(beatStrength);
  applyChannelTear(canvas, ctx, isSuperPeak);
  applyFeedbackTunnel(canvas, ctx, beatStrength);
}

// Export metadata if needed
export const metadata = {
  id: 'chromaticChaos',
  name: 'Chromatic Chaos',
  description: 'Chaotic digital distortion'
};