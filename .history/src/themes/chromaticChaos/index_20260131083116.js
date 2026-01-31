// src/themes/chromatic-chaos/index.js

// Import CSS – this will apply the styles when theme is active
import './chromatic-chaos.css';

// Import and re-export the dynamic effects
export { 
  applyChromaticChaos,
  intensifyRGBSplit,
  applyChannelTear,
  applyFeedbackTunnel 
} from './effects';

// Optional: Export metadata if your theme loader needs it
export const metadata = {
  id: 'chromaticChaos',
  name: 'Chromatic Chaos',
  description: 'Chaotic digital distortion with RGB tearing and feedback tunnels'
};

// If you ever add particles, export them here too
// export { createChaosParticles } from './particles-config';