// src/themes/chromatic-chaos/particles-config.js

// Simple particle config for chaos sparks/glitches
// Can be used with particles.js or your custom canvas particle system

export const chromaticChaosParticles = {
  // Particles on every beat
  beatParticles: {
    count: 15,
    color: ['#ff00ff', '#00ff00', '#ff0000'],
    size: { min: 2, max: 6 },
    speed: { min: 1, max: 4 },
    direction: 'random',
    lifetime: 800, // ms
    spawnOn: 'beat', // 'beat' or 'superPeak'
    blendMode: 'screen' // makes them glow
  },

  // Extra chaos on super peaks
  superPeakBurst: {
    count: 40,
    color: '#ffffff',
    size: { min: 1, max: 4 },
    speed: { min: 5, max: 12 },
    direction: 'outward',
    lifetime: 1200,
    spawnOn: 'superPeak',
    blendMode: 'lighter',
    gravity: 0.05 // slight downward pull for glitch feel
  },

  // Background subtle glitch particles
  backgroundGlitch: {
    count: 30,
    color: ['#ff00ff44', '#00ff0044', '#ff000044'],
    size: { min: 1, max: 3 },
    speed: { min: 0.2, max: 0.8 },
    direction: 'random',
    lifetime: 3000,
    spawnOn: 'always',
    opacity: 0.3
  }
};

// Example usage in your draw loop (if you have a particle system):
// if (beatPulse) createParticles(chromaticChaosParticles.beatParticles);
// if (isSuperPeak) createParticles(chromaticChaosParticles.superPeakBurst);