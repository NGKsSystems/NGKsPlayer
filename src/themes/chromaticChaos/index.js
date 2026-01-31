// src/themes/chromatic-chaos/index.js

/**
 * Chromatic Chaos theme entry point
 * - Loads CSS when theme is selected
 * - Exports all dynamic effects
 */

// Lazy-load CSS only when this theme is active
import('./chromatic-chaos.css').catch(err => {
  console.warn('[Chromatic Chaos] Failed to load CSS:', err);
});

// Re-export the effects functions
export {
  applyChromaticChaos,
  intensifyRGBSplit,
  applyChannelTear,
  applyFeedbackTunnel
} from './effects';

// Optional metadata export (useful for theme switcher or debug panel)
export const metadata = {
  id: 'chromaticChaos',
  name: 'Chromatic Chaos',
  description: 'Chaotic digital distortion with RGB tearing and feedback tunnels',
  // Add preview image path if you have one
  // previewImage: './chromatic-chaos-preview.png'
};