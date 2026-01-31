// src/themes/chromatic-chaos/index.js

// Import CSS (lazy when theme selected)
import('./chromatic-chaos.css').catch(err => console.warn('Chromatic Chaos CSS failed to load:', err));

// Export effects
export { applyChromaticChaos } from './effects';

// Metadata (optional)
export const metadata = {
  id: 'chromaticChaos',
  name: 'Chromatic Chaos',
  description: 'Chaotic digital distortion with RGB tearing and feedback tunnels'
};