/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: index.js
 * Purpose: TODO â€“ describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
// src/themes/chromaticChaos/index.js

import './chromaticChaos.css';
import { intensifyRGBSplit, applyChannelTear, applyFeedbackTunnel, applyChromaticChaos } from './effects.js';
// import { updateParticles, initParticles, cleanupParticles } from './particles-config.js';  // â† uncomment when you have particle draw logic

// Optional: export theme colors if waveform draws via ctx (fallback to CSS vars)
export const colors = {
  accentRed: '#ff2d00',
  accentOrange: '#ff8c00',
  accentYellow: '#ffd700',
  accentCyan: '#00f5ff',
  accentPurple: '#d500f9',
};

// Called once on theme select (add to your theme loader if not already)
export function initTheme() {
  // initParticles();  // if you add particle system
  const filter = document.getElementById('rgb-split-filter');
  if (!filter) {
    console.warn('[Chromatic Chaos] RGB split SVG filter not found in DOM');
  }
}

// Main per-frame effect â€” replace your current applyEffect
export function applyEffect(canvas, ctx, beatStrength, isSuperPeak) {
  // Use the wrapper from effects.js (it calls the three effects safely)
  applyChromaticChaos(canvas, ctx, beatStrength, isSuperPeak);

  // Particles (add when you implement the system)
  // updateParticles(canvas, ctx, beatStrength, isSuperPeak);
}

// Cleanup on theme change
export function cleanupTheme() {
  // cleanupParticles();
  // Reset SVG filter offsets to zero if needed
  const filter = document.getElementById('rgb-split-filter');
  if (filter) {
    ['red', 'green', 'blue'].forEach(color => {
      const offset = filter.querySelector(`feOffset[result="${color}"]`);
      if (offset) {
        offset.setAttribute('dx', '0');
        if (color === 'blue') offset.setAttribute('dy', '0');
        else if (color === 'green') offset.setAttribute('dx', '0');
      }
    });
  }
}

export const metadata = {
  id: 'chromaticChaos',
  name: 'Chromatic Chaos',
  description: 'Chaotic digital distortion'
};
