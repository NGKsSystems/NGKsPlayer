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
      this.currentTheme = e.detail.theme;
      
      if (e.detail && (e.detail.particles || e.detail.effects.particles || e.detail.effects.bloodRain)) {
        console.log('🩸 Activating extreme effects for theme:', this.currentTheme);
        this.activate();
      } else {
        console.log('🩸 Deactivating extreme effects');
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
    // Only blood themes get dripping
    if (this.currentTheme === 'cyberBloodbath') {
      this.drippingInterval = setInterval(() => {
        if (this.isActive) {
          if (Math.random() < 0.7) {
            this.spawnDripParticles(Math.floor(Math.random() * 3) + 1);
          }
        }
      }, Math.random() * 1500 + 500);
    } else {
      this.startThemeSpecificEffects();
    }
  }

  startThemeSpecificEffects() {
    switch(this.currentTheme) {
      case 'hyperAurora':
        this.startNorthernLights();
        break;
      case 'diamondRain':
        this.startDiamondShower();
        break;
      case 'neonNightmare':
        this.startStrobeFlashes();
        break;
      case 'galacticStorm':
        this.startNebulaFlow();
        break;
      case 'chromaticChaos':
        this.startColorShift();
        break;
      case 'quantumDrift':
        this.startQuantumField();
        break;
    }
  }

  startNorthernLights() {
    // Create aurora bands across the screen more frequently
    this.auroraInterval = setInterval(() => {
      if (this.isActive) {
        this.spawnAuroraWave();
      }
    }, 500 + Math.random() * 1000);
    
    // Also spawn continuous flowing particles
    this.auroraFlowInterval = setInterval(() => {
      if (this.isActive) {
        this.spawnContinuousAurora();
      }
    }, 150);
  }

  spawnAuroraWave() {
    // Create a wave of aurora particles across screen
    const waveCount = 20 + Math.floor(Math.random() * 15);
    const startY = Math.random() * this.canvas.height * 0.8;
    const wavePhase = Math.random() * Math.PI * 4;
    const waveHeight = 30 + Math.random() * 80;
    
    for (let i = 0; i < waveCount; i++) {
      const progress = i / waveCount;
      const particle = {
        x: progress * this.canvas.width + (Math.random() - 0.5) * 100,
        y: startY + Math.sin(progress * Math.PI * 4 + wavePhase) * waveHeight,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 1,
        size: 15 + Math.random() * 40,
        life: 1.0,
        decay: 0.002 + Math.random() * 0.003,
        color: this.getAuroraColor(),
        type: 'aurora',
        waveOffset: progress * Math.PI * 2 + wavePhase,
        intensity: 0.3 + Math.random() * 0.7,
        colorShift: Math.random() * Math.PI * 2,
        trail: []
      };
      this.particles.push(particle);
    }
  }
  
  spawnContinuousAurora() {
    // Spawn individual flowing aurora particles
    for (let i = 0; i < 2 + Math.floor(Math.random() * 4); i++) {
      const particle = {
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 2,
        size: 25 + Math.random() * 50,
        life: 1.0,
        decay: 0.001 + Math.random() * 0.002,
        color: this.getAuroraColor(),
        type: 'aurora',
        waveOffset: Math.random() * Math.PI * 2,
        intensity: 0.2 + Math.random() * 0.5,
        colorShift: Math.random() * Math.PI * 2,
        trail: []
      };
      this.particles.push(particle);
    }
  }

  stopRandomDripping() {
    if (this.drippingInterval) {
      clearInterval(this.drippingInterval);
      this.drippingInterval = null;
    }
    if (this.auroraInterval) {
      clearInterval(this.auroraInterval);
      this.auroraInterval = null;
    }
    if (this.diamondInterval) {
      clearInterval(this.diamondInterval);
      this.diamondInterval = null;
    }
    if (this.strobeInterval) {
      clearInterval(this.strobeInterval);
      this.strobeInterval = null;
    }
    if (this.nebulaInterval) {
      clearInterval(this.nebulaInterval);
      this.nebulaInterval = null;
    }
    if (this.colorInterval) {
      clearInterval(this.colorInterval);
      this.colorInterval = null;
    }
    if (this.quantumInterval) {
      clearInterval(this.quantumInterval);
      this.quantumInterval = null;
    }
  }

  startDiamondShower() {
    this.diamondInterval = setInterval(() => {
      if (this.isActive) {
        this.spawnParticles(Math.floor(Math.random() * 5) + 2);
      }
    }, 800 + Math.random() * 1200);
  }

  startStrobeFlashes() {
    this.strobeInterval = setInterval(() => {
      if (this.isActive) {
        // Sudden burst of strobe particles
        this.spawnParticles(Math.floor(Math.random() * 8) + 3);
      }
    }, 300 + Math.random() * 700);
  }

  startNebulaFlow() {
    this.nebulaInterval = setInterval(() => {
      if (this.isActive) {
        this.spawnParticles(Math.floor(Math.random() * 4) + 1);
      }
    }, 1000 + Math.random() * 2000);
  }

  startColorShift() {
    this.colorInterval = setInterval(() => {
      if (this.isActive) {
        this.spawnParticles(Math.floor(Math.random() * 6) + 2);
      }
    }, 600 + Math.random() * 900);
  }

  startQuantumField() {
    this.quantumInterval = setInterval(() => {
      if (this.isActive) {
        this.spawnParticles(Math.floor(Math.random() * 3) + 1);
      }
    }, 1200 + Math.random() * 1800);
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
      const particle = this.createThemeParticle();
      this.particles.push(particle);
    }
  }

  createThemeParticle() {
    const baseParticle = {
      x: Math.random() * this.canvas.width,
      y: -10,
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 3 + 2,
      size: Math.random() * 8 + 2,
      life: 1.0,
      decay: Math.random() * 0.02 + 0.005,
      trail: []
    };

    switch(this.currentTheme) {
      case 'cyberBloodbath':
        return {
          ...baseParticle,
          color: this.getBloodColor(),
          type: Math.random() > 0.8 ? 'spark' : 'drop'
        };
        
      case 'hyperAurora':
        return {
          ...baseParticle,
          y: Math.random() * this.canvas.height,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          color: this.getAuroraColor(),
          type: 'aurora',
          waveOffset: Math.random() * Math.PI * 2
        };
        
      case 'diamondRain':
        return {
          ...baseParticle,
          color: this.getDiamondColor(),
          type: 'diamond',
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.2
        };
        
      case 'neonNightmare':
        return {
          ...baseParticle,
          color: this.getNeonColor(),
          type: 'strobe',
          strobeTimer: Math.random() * 60
        };
        
      case 'galacticStorm':
        return {
          ...baseParticle,
          y: Math.random() * this.canvas.height,
          color: this.getGalaxyColor(),
          type: 'nebula',
          swirl: Math.random() * Math.PI * 2
        };
        
      case 'chromaticChaos':
        return {
          ...baseParticle,
          color: this.getChromaticColor(),
          type: 'chromatic',
          colorPhase: Math.random() * Math.PI * 2
        };
        
      case 'quantumDrift':
        return {
          ...baseParticle,
          color: this.getQuantumColor(),
          type: 'quantum',
          phaseShift: Math.random() * 10,
          drift: (Math.random() - 0.5) * 3
        };
        
      default:
        return {
          ...baseParticle,
          color: 'rgba(255, 255, 255, ',
          type: 'basic'
        };
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

  getAuroraColor() {
    const colors = [
      'rgba(0, 255, 150, ',   // Bright green (classic aurora)
      'rgba(50, 255, 100, ',  // Green-yellow
      'rgba(0, 200, 255, ',   // Electric blue
      'rgba(150, 100, 255, ', // Purple
      'rgba(255, 100, 200, ', // Pink
      'rgba(100, 255, 255, ', // Cyan
      'rgba(200, 255, 100, ', // Lime green
      'rgba(100, 200, 255, ', // Sky blue
      'rgba(255, 150, 100, '  // Warm orange
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  getDiamondColor() {
    const colors = [
      'rgba(255, 255, 255, ', // Pure white
      'rgba(240, 240, 255, ', // Cool white
      'rgba(255, 250, 240, ', // Warm white
      'rgba(200, 255, 255, ', // Diamond blue
      'rgba(255, 240, 255, '  // Diamond pink
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  getNeonColor() {
    const colors = [
      'rgba(255, 0, 255, ',   // Hot magenta
      'rgba(255, 100, 255, ', // Bright pink
      'rgba(200, 0, 255, ',   // Deep purple
      'rgba(255, 0, 150, ',   // Hot pink
      'rgba(255, 50, 200, '   // Neon pink
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  getGalaxyColor() {
    const colors = [
      'rgba(138, 43, 226, ',  // Blue violet
      'rgba(100, 20, 200, ',  // Deep purple
      'rgba(180, 50, 255, ',  // Bright purple
      'rgba(120, 0, 180, ',   // Dark violet
      'rgba(160, 80, 240, '   // Light purple
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  getChromaticColor() {
    const colors = [
      'rgba(255, 51, 102, ',  // Hot pink
      'rgba(51, 255, 102, ',  // Bright green
      'rgba(51, 102, 255, ',  // Bright blue
      'rgba(255, 255, 51, ',  // Bright yellow
      'rgba(255, 102, 51, '   // Orange
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  getQuantumColor() {
    const colors = [
      'rgba(0, 204, 255, ',   // Electric blue
      'rgba(0, 150, 200, ',   // Deep blue
      'rgba(50, 220, 255, ',  // Light blue
      'rgba(0, 180, 220, ',   // Cyan blue
      'rgba(20, 200, 240, '   // Bright cyan
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  updateParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      
      // Update position based on particle type
      if (p.type === 'aurora') {
        // Aurora particles move in complex flowing patterns
        const time = Date.now() * 0.001;
        p.x += p.vx * 0.7 + Math.sin(time + p.waveOffset) * 0.5;
        p.y += p.vy * 0.4 + Math.cos(time * 0.8 + p.waveOffset) * 0.3;
        p.waveOffset += 0.01;
        p.colorShift += 0.02;
      } else if (p.type === 'quantum') {
        // Quantum particles drift randomly
        p.x += p.vx + (Math.random() - 0.5) * 2;
        p.y += p.vy;
      } else if (p.type === 'nebula') {
        // Nebula particles swirl
        p.x += p.vx * 0.7;
        p.y += p.vy * 0.7;
        p.swirl += 0.02;
      } else {
        // Standard movement
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2; // Gravity
      }
      
      // Update rotation for diamonds
      if (p.type === 'diamond' && p.rotationSpeed) {
        p.rotation += p.rotationSpeed;
      }
      
      // Add to trail
      p.trail.push({ x: p.x, y: p.y, life: p.life });
      if (p.trail.length > 5) p.trail.shift();
      
      // Update life
      p.life -= p.decay;
      
      // Remove dead particles or those that went off screen
      if (p.life <= 0 || 
          p.y > this.canvas.height + 50 || 
          p.x < -50 || 
          p.x > this.canvas.width + 50) {
        this.particles.splice(i, 1);
      }
    }
  }

  renderParticles() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    for (const p of this.particles) {
      switch(p.type) {
        case 'spark':
        case 'drop':
        case 'drip':
          this.renderDrop(p);
          break;
        case 'aurora':
          this.renderAurora(p);
          break;
        case 'diamond':
          this.renderDiamond(p);
          break;
        case 'strobe':
          this.renderStrobe(p);
          break;
        case 'nebula':
          this.renderNebula(p);
          break;
        case 'chromatic':
          this.renderChromatic(p);
          break;
        case 'quantum':
          this.renderQuantum(p);
          break;
        default:
          this.renderDrop(p);
      }
    }
  }

  renderAurora(p) {
    const { x, y, size, life, color, waveOffset, intensity, colorShift } = p;
    const alpha = (life * (intensity || 0.5)).toFixed(2);
    
    // Dynamic flowing aurora with color shifting
    const time = Date.now() * 0.001;
    const flow1 = Math.sin(time * 0.5 + waveOffset) * 60;
    const flow2 = Math.cos(time * 0.3 + waveOffset + 1) * 40;
    const flow3 = Math.sin(time * 0.8 + waveOffset + 2) * 30;
    
    // Multiple flowing bands with different colors
    for (let layer = 0; layer < 3; layer++) {
      const layerOffset = layer * 0.7;
      const layerAlpha = (alpha * (0.8 - layer * 0.2)).toFixed(2);
      const flowX = x + (layer === 0 ? flow1 : layer === 1 ? flow2 : flow3);
      const flowY = y + Math.sin(time * (0.4 + layer * 0.1) + waveOffset + layer) * (20 + layer * 10);
      
      // Color shifting effect
      let layerColor = color;
      if (layer === 1) {
        // Shift to complementary color
        const colors = ['rgba(255, 100, 200, ', 'rgba(100, 255, 150, ', 'rgba(150, 100, 255, '];
        layerColor = colors[Math.floor((colorShift + layer) * 3) % 3];
      } else if (layer === 2) {
        const colors = ['rgba(100, 200, 255, ', 'rgba(255, 200, 100, ', 'rgba(200, 100, 255, '];
        layerColor = colors[Math.floor((colorShift + layer + 1) * 3) % 3];
      }
      
      // Flowing aurora curtain
      const gradient = this.ctx.createRadialGradient(
        flowX, flowY, 0,
        flowX, flowY, size * (1 + layer * 0.3)
      );
      gradient.addColorStop(0, `${layerColor}${layerAlpha})`);
      gradient.addColorStop(0.3, `${layerColor}${(layerAlpha * 0.7).toFixed(2)})`);
      gradient.addColorStop(0.7, `${layerColor}${(layerAlpha * 0.3).toFixed(2)})`);
      gradient.addColorStop(1, `${layerColor}0)`);
      
      this.ctx.fillStyle = gradient;
      
      // Flowing organic shapes
      this.ctx.beginPath();
      const points = 8 + layer * 2;
      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2;
        const radius = size * (0.5 + Math.sin(time * 2 + angle + waveOffset + layer) * 0.3);
        const px = flowX + Math.cos(angle) * radius;
        const py = flowY + Math.sin(angle) * radius * 0.6;
        
        if (i === 0) {
          this.ctx.moveTo(px, py);
        } else {
          this.ctx.lineTo(px, py);
        }
      }
      this.ctx.closePath();
      this.ctx.fill();
    }
    
    // Add sparkle effects
    if (Math.random() < 0.3) {
      this.ctx.fillStyle = `${color}${(alpha * 1.5).toFixed(2)})`;
      this.ctx.beginPath();
      this.ctx.arc(
        x + (Math.random() - 0.5) * size,
        y + (Math.random() - 0.5) * size,
        2 + Math.random() * 4,
        0, Math.PI * 2
      );
      this.ctx.fill();
    }
  }

  renderDiamond(p) {
    const { x, y, size, life, color, rotation } = p;
    const alpha = life.toFixed(2);
    
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(rotation);
    
    // Diamond sparkle
    this.ctx.shadowColor = `${color}1)`;
    this.ctx.shadowBlur = size * 3;
    this.ctx.fillStyle = `${color}${alpha})`;
    
    this.ctx.beginPath();
    this.ctx.moveTo(0, -size);
    this.ctx.lineTo(size, 0);
    this.ctx.lineTo(0, size);
    this.ctx.lineTo(-size, 0);
    this.ctx.closePath();
    this.ctx.fill();
    
    // Inner sparkle
    this.ctx.fillStyle = `${color}1)`;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, size * 0.3, 0, Math.PI * 2);
    this.ctx.fill();
    
    this.ctx.restore();
    this.ctx.shadowColor = 'transparent';
    this.ctx.shadowBlur = 0;
  }

  renderStrobe(p) {
    const { x, y, size, life, color, strobeTimer } = p;
    
    // Strobe effect
    const strobeIntensity = Math.sin(strobeTimer * 0.3) > 0.5 ? 1 : 0.2;
    const alpha = (life * strobeIntensity).toFixed(2);
    
    if (strobeIntensity > 0.5) {
      this.ctx.shadowColor = `${color}1)`;
      this.ctx.shadowBlur = size * 6;
    }
    
    this.ctx.fillStyle = `${color}${alpha})`;
    this.ctx.beginPath();
    this.ctx.arc(x, y, size * strobeIntensity, 0, Math.PI * 2);
    this.ctx.fill();
    
    p.strobeTimer += 2;
    this.ctx.shadowColor = 'transparent';
    this.ctx.shadowBlur = 0;
  }

  renderNebula(p) {
    const { x, y, size, life, color, swirl } = p;
    const alpha = (life * 0.6).toFixed(2);
    
    // Swirling nebula cloud
    const swirlX = x + Math.cos(swirl + Date.now() * 0.001) * size * 2;
    const swirlY = y + Math.sin(swirl + Date.now() * 0.001) * size;
    
    const gradient = this.ctx.createRadialGradient(swirlX, swirlY, 0, swirlX, swirlY, size * 3);
    gradient.addColorStop(0, `${color}${alpha})`);
    gradient.addColorStop(0.5, `${color}${(alpha * 0.4).toFixed(2)})`);
    gradient.addColorStop(1, `${color}0)`);
    
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(swirlX, swirlY, size * 3, 0, Math.PI * 2);
    this.ctx.fill();
  }

  renderChromatic(p) {
    const { x, y, size, life, colorPhase } = p;
    const alpha = life.toFixed(2);
    
    // RGB color separation effect
    const offset = 2;
    
    // Red channel
    this.ctx.fillStyle = `rgba(255, 0, 0, ${(alpha * 0.8).toFixed(2)})`;
    this.ctx.beginPath();
    this.ctx.arc(x - offset, y, size, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Green channel
    this.ctx.fillStyle = `rgba(0, 255, 0, ${(alpha * 0.8).toFixed(2)})`;
    this.ctx.beginPath();
    this.ctx.arc(x, y - offset, size, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Blue channel
    this.ctx.fillStyle = `rgba(0, 0, 255, ${(alpha * 0.8).toFixed(2)})`;
    this.ctx.beginPath();
    this.ctx.arc(x + offset, y, size, 0, Math.PI * 2);
    this.ctx.fill();
    
    p.colorPhase += 0.1;
  }

  renderQuantum(p) {
    const { x, y, size, life, color, phaseShift, drift } = p;
    const alpha = life.toFixed(2);
    
    // Quantum phase effect - particle exists in multiple positions
    for (let i = 0; i < 3; i++) {
      const phaseX = x + Math.sin(phaseShift + i * 2) * drift;
      const phaseY = y + Math.cos(phaseShift + i * 1.5) * drift * 0.5;
      const phaseAlpha = (alpha * (0.3 + i * 0.2)).toFixed(2);
      
      this.ctx.fillStyle = `${color}${phaseAlpha})`;
      this.ctx.beginPath();
      this.ctx.arc(phaseX, phaseY, size * (0.5 + i * 0.2), 0, Math.PI * 2);
      this.ctx.fill();
    }
    
    p.phaseShift += 0.05;
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