/**
 * EXTREME VISUAL EFFECTS ENGINE
 * For NGKs Player "Cyber Bloodbath" Theme
 * Creates particle effects, screen shake, and beat-reactive visuals
 */

class ExtremeVisualEffects {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.particles = [];
    this.isActive = false;
    this.beatThreshold = 0.7;
    this.superPeakThreshold = 0.9;
    this.audioContext = null;
    this.analyser = null;
    
    this.init();
  }

  init() {
    this.createCanvas();
    this.setupEventListeners();
    console.log('🩸 Extreme Visual Effects Engine Initialized');
  }

  createCanvas() {
    // Create fullscreen canvas for particle effects
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'extreme-effects-canvas';
    this.canvas.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: 999999;
      mix-blend-mode: screen;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;
    document.body.appendChild(this.canvas);
    
    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();
    
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  setupEventListeners() {
    // Listen for theme changes
    window.addEventListener('themeChange', (e) => {
      console.log('🩸 Theme change event received:', e.detail);
      if (e.detail && e.detail.particles) {
        console.log('🩸 Activating blood particles');
        this.activate();
      } else {
        console.log('🩸 Deactivating blood particles');
        this.deactivate();
      }
    });

    // Listen for audio analysis data
    window.addEventListener('audioAnalysis', (e) => {
      if (this.isActive && e.detail) {
        this.processAudioData(e.detail);
      }
    });

    // Listen for beat detection
    window.addEventListener('beatDetected', (e) => {
      if (this.isActive) {
        this.triggerBeatEffect(e.detail.intensity);
      }
    });
  }

  activate() {
    this.isActive = true;
    this.canvas.style.opacity = '1';
    this.startAnimation();
    this.startRandomDripping();
    console.log('🩸 Blood particles ACTIVATED');
  }

  deactivate() {
    this.isActive = false;
    this.canvas.style.opacity = '0';
    this.particles = [];
    this.stopRandomDripping();
    console.log('🩸 Blood particles deactivated');
  }

  startRandomDripping() {
    // Continuous blood dripping every 500-2000ms
    this.drippingInterval = setInterval(() => {
      if (this.isActive) {
        // Random chance for drips
        if (Math.random() < 0.7) {
          this.spawnDripParticles(Math.floor(Math.random() * 3) + 1);
        }
      }
    }, Math.random() * 1500 + 500);
  }

  stopRandomDripping() {
    if (this.drippingInterval) {
      clearInterval(this.drippingInterval);
      this.drippingInterval = null;
    }
  }

  spawnDripParticles(count) {
    for (let i = 0; i < count; i++) {
      const particle = {
        x: Math.random() * this.canvas.width,
        y: -20 - Math.random() * 50, // Start above screen
        vx: (Math.random() - 0.5) * 1, // Slight horizontal drift
        vy: Math.random() * 2 + 1, // Downward velocity
        size: Math.random() * 4 + 2,
        life: 1.0,
        decay: Math.random() * 0.01 + 0.003,
        color: this.getBloodColor(),
        trail: [],
        type: 'drip'
      };
      this.particles.push(particle);
    }
  }

  processAudioData(audioData) {
    const { frequencyData, volume, beat } = audioData;
    
    if (beat && volume > this.beatThreshold) {
      this.spawnParticles(Math.floor(volume * 20));
    }

    if (volume > this.superPeakThreshold) {
      this.triggerScreenShake();
      this.triggerBloodExplosion();
    }

    // Continuous low-level particles
    if (Math.random() < volume * 0.3) {
      this.spawnParticles(1);
    }
  }

  spawnParticles(count) {
    for (let i = 0; i < count; i++) {
      const particle = {
        x: Math.random() * this.canvas.width,
        y: -10,
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 3 + 2,
        size: Math.random() * 8 + 2,
        life: 1.0,
        decay: Math.random() * 0.02 + 0.005,
        color: this.getBloodColor(),
        trail: [],
        type: Math.random() > 0.8 ? 'spark' : 'drop'
      };
      this.particles.push(particle);
    }
  }

  getBloodColor() {
    const colors = [
      'rgba(255, 0, 102, ',    // Cyber pink
      'rgba(255, 20, 80, ',   // Hot pink
      'rgba(255, 40, 120, ',  // Deep pink
      'rgba(200, 0, 100, ',   // Dark red
      'rgba(255, 60, 140, '   // Bright pink
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  updateParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      
      // Update position
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.2; // Gravity
      
      // Add to trail
      p.trail.push({ x: p.x, y: p.y, life: p.life });
      if (p.trail.length > 5) p.trail.shift();
      
      // Update life
      p.life -= p.decay;
      
      // Remove dead particles
      if (p.life <= 0 || p.y > this.canvas.height + 50) {
        this.particles.splice(i, 1);
      }
    }
  }

  renderParticles() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    for (const p of this.particles) {
      if (p.type === 'spark') {
        this.renderSpark(p);
      } else {
        this.renderDrop(p);
      }
    }
  }

  renderDrop(p) {
    const { x, y, size, life, color, trail, type } = p;
    
    // Render trail
    for (let i = 0; i < trail.length - 1; i++) {
      const t1 = trail[i];
      const t2 = trail[i + 1];
      const alpha = (t1.life * life * 0.5).toFixed(2);
      
      this.ctx.strokeStyle = `${color}${alpha})`;
      this.ctx.lineWidth = size * 0.5;
      this.ctx.lineCap = 'round';
      this.ctx.beginPath();
      this.ctx.moveTo(t1.x, t1.y);
      this.ctx.lineTo(t2.x, t2.y);
      this.ctx.stroke();
    }
    
    // Enhanced drip rendering for continuous drips
    if (type === 'drip') {
      const alpha = life.toFixed(2);
      
      // Main drip body (elongated)
      const gradient = this.ctx.createLinearGradient(x, y - size, x, y + size * 2);
      gradient.addColorStop(0, `${color}${(alpha * 0.3).toFixed(2)})`);
      gradient.addColorStop(0.5, `${color}${alpha})`);
      gradient.addColorStop(1, `${color}${(alpha * 0.8).toFixed(2)})`);
      
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.ellipse(x, y, size * 0.8, size * 2, 0, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Add glow effect for drips
      this.ctx.shadowColor = `${color}0.6)`;
      this.ctx.shadowBlur = size * 2;
      this.ctx.fillStyle = `${color}${alpha})`;
      this.ctx.beginPath();
      this.ctx.arc(x, y, size * 0.4, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Reset shadow
      this.ctx.shadowColor = 'transparent';
      this.ctx.shadowBlur = 0;
    } else {
      // Original drop rendering for beat-triggered particles
      const alpha = life.toFixed(2);
      const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, size);
      gradient.addColorStop(0, `${color}${alpha})`);
      gradient.addColorStop(0.7, `${color}${(alpha * 0.7).toFixed(2)})`);
      gradient.addColorStop(1, `${color}0)`);
      
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.ellipse(x, y, size, size * 1.5, 0, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  renderSpark(p) {
    const { x, y, size, life, color } = p;
    const alpha = life.toFixed(2);
    
    // Spark with glow
    this.ctx.shadowColor = `${color}1)`;
    this.ctx.shadowBlur = size * 3;
    this.ctx.fillStyle = `${color}${alpha})`;
    
    this.ctx.beginPath();
    this.ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Reset shadow
    this.ctx.shadowColor = 'transparent';
    this.ctx.shadowBlur = 0;
  }

  triggerBeatEffect(intensity) {
    // Add beat-reactive elements to the page
    const appContainer = document.querySelector('.app-container');
    if (appContainer) {
      appContainer.classList.add('beat-explosion');
      setTimeout(() => {
        appContainer.classList.remove('beat-explosion');
      }, 300);
    }

    // Trigger chromatic aberration on track title
    const trackTitle = document.querySelector('.np-track-title');
    if (trackTitle && intensity > 0.8) {
      trackTitle.classList.add('chromatic');
      setTimeout(() => {
        trackTitle.classList.remove('chromatic');
      }, 800);
    }
  }

  triggerScreenShake() {
    const appContainer = document.querySelector('.app-container');
    if (appContainer) {
      appContainer.classList.add('super-peak');
      setTimeout(() => {
        appContainer.classList.remove('super-peak');
      }, 600);
    }
  }

  triggerBloodExplosion() {
    // Create massive particle burst
    for (let i = 0; i < 30; i++) {
      const angle = (Math.PI * 2 * i) / 30;
      const speed = Math.random() * 10 + 5;
      
      const particle = {
        x: this.canvas.width / 2,
        y: this.canvas.height / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 12 + 4,
        life: 1.0,
        decay: Math.random() * 0.01 + 0.003,
        color: this.getBloodColor(),
        trail: [],
        type: Math.random() > 0.5 ? 'spark' : 'drop'
      };
      this.particles.push(particle);
    }
  }

  startAnimation() {
    const animate = () => {
      if (this.isActive) {
        this.updateParticles();
        this.renderParticles();
        requestAnimationFrame(animate);
      }
    };
    animate();
  }
}

// Initialize the extreme effects engine
let extremeEffects;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    extremeEffects = new ExtremeVisualEffects();
  });
} else {
  extremeEffects = new ExtremeVisualEffects();
}

// Export for potential external use
window.ExtremeVisualEffects = ExtremeVisualEffects;
window.extremeEffects = extremeEffects;