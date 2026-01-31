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
      z-index: 1;
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
    // Create vertical aurora curtains like real northern lights
    const curtainCount = 3 + Math.floor(Math.random() * 5);
    
    for (let curtain = 0; curtain < curtainCount; curtain++) {
      const curtainX = Math.random() * this.canvas.width;
      const curtainWidth = 40 + Math.random() * 80;
      const curtainHeight = this.canvas.height * (0.3 + Math.random() * 0.4);
      const wavePhase = Math.random() * Math.PI * 2;
      
      // Create vertical bands within each curtain
      const bandCount = 8 + Math.floor(Math.random() * 12);
      for (let band = 0; band < bandCount; band++) {
        const bandProgress = band / bandCount;
        const particle = {
          x: curtainX + (bandProgress - 0.5) * curtainWidth,
          y: 0, // Start from top like real aurora
          vx: 0,
          vy: 0,
          width: curtainWidth / bandCount * 2,
          height: curtainHeight + Math.random() * 100,
          size: curtainWidth / bandCount,
          life: 1.0,
          decay: 0.001 + Math.random() * 0.002,
          color: this.getAuroraColor(),
          type: 'aurora',
          wavePhase: wavePhase + bandProgress * Math.PI,
          curtainIndex: curtain,
          bandIndex: band,
          intensity: 0.4 + Math.random() * 0.6,
          trail: []
        };
        this.particles.push(particle);
      }
    }
  }
  
  spawnContinuousAurora() {
    // Add gentle flowing movement to existing curtains
    if (Math.random() < 0.3) {
      const curtainX = Math.random() * this.canvas.width;
      const particle = {
        x: curtainX,
        y: 0,
        vx: 0,
        vy: 0,
        width: 30 + Math.random() * 40,
        height: this.canvas.height * (0.2 + Math.random() * 0.3),
        size: 20,
        life: 1.0,
        decay: 0.002,
        color: this.getAuroraColor(),
        type: 'aurora',
        wavePhase: Math.random() * Math.PI * 2,
        curtainIndex: 0,
        bandIndex: 0,
        intensity: 0.3 + Math.random() * 0.4,
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
    if (this.auroraFlowInterval) {
      clearInterval(this.auroraFlowInterval);
      this.auroraFlowInterval = null;
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
      'rgba(0, 255, 100, ',   // Bright green (most common)
      'rgba(50, 255, 150, ',  // Green-yellow  
      'rgba(0, 255, 150, ',   // Pure green
      'rgba(100, 255, 100, ', // Light green
      'rgba(150, 100, 255, ', // Purple (higher altitude)
      'rgba(255, 100, 200, ', // Pink (higher altitude)
      'rgba(200, 150, 255, ', // Light purple
      'rgba(0, 200, 100, '    // Forest green
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
      if (p.type === 'arterial') {
        // Arterial sprays have gravity and arc downward
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity || 0.3; // Apply gravity
        p.vx *= 0.99; // Air resistance
      } else if (p.type === 'aurora') {
        // Aurora particles move in complex flowing patterns
        const time = Date.now() * 0.001;
        p.x += p.vx * 0.7 + Math.sin(time + p.wavePhase) * 0.5;
        p.y += p.vy * 0.4 + Math.cos(time * 0.8 + p.wavePhase) * 0.3;
        p.wavePhase += 0.01;
        p.colorShift += 0.02;
      } else if (p.type === 'quantum') {
        // Quantum particles drift randomly
        p.x += p.vx + (Math.random() - 0.5) * 2;
        p.y += p.vy;
      } else if (p.type === 'star') {
        // Star particles expand outward
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.98; // Gradual slowdown
        p.vy *= 0.98;
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
      
      // Add to trail (only for certain types)
      if (p.type === 'arterial' || p.type === 'star' || p.type === 'drop' || p.type === 'drip') {
        p.trail.push({ x: p.x, y: p.y, life: p.life });
        if (p.trail.length > (p.type === 'arterial' ? 8 : 5)) p.trail.shift();
      }
      
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
        case 'arterial':
          this.renderArterial(p);
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
        case 'star':
          this.renderStar(p);
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
    const { x, y, width, height, life, color, wavePhase, intensity } = p;
    const alpha = (life * intensity).toFixed(2);
    
    // Create vertical aurora curtain effect
    const time = Date.now() * 0.001;
    
    // Aurora curtain flowing motion
    const waveAmplitude = 20 + Math.sin(time * 0.5 + wavePhase) * 15;
    const waveFrequency = 3;
    
    // Create the vertical curtain gradient (green at bottom, purple at top)
    const gradient = this.ctx.createLinearGradient(x, y, x, y + height);
    
    // Determine base color and create altitude-based gradient
    const isGreen = color.includes('0, 255') || color.includes('50, 255') || color.includes('100, 255');
    
    if (isGreen) {
      // Green aurora (lower altitude)
      gradient.addColorStop(0, `rgba(150, 100, 255, 0)`); // Purple fade at top
      gradient.addColorStop(0.2, `rgba(150, 100, 255, ${(alpha * 0.3).toFixed(2)})`); // Purple
      gradient.addColorStop(0.4, `${color}${(alpha * 0.7).toFixed(2)})`); // Transition
      gradient.addColorStop(0.7, `${color}${alpha})`); // Peak green
      gradient.addColorStop(1, `${color}${(alpha * 0.8).toFixed(2)})`); // Green base
    } else {
      // Purple/pink aurora (higher altitude)
      gradient.addColorStop(0, `${color}${alpha})`); // Strong at top
      gradient.addColorStop(0.5, `${color}${(alpha * 0.7).toFixed(2)})`);
      gradient.addColorStop(0.8, `rgba(0, 255, 100, ${(alpha * 0.4).toFixed(2)})`); // Green tinge
      gradient.addColorStop(1, `rgba(0, 255, 100, 0)`); // Fade to transparent
    }
    
    // Draw the main curtain
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    
    // Create wavy curtain path
    const segments = 20;
    for (let i = 0; i <= segments; i++) {
      const segmentY = y + (i / segments) * height;
      const waveX = x + Math.sin(segmentY * waveFrequency * 0.01 + time + wavePhase) * waveAmplitude;
      const curtainWidth = width * (0.8 + Math.sin(segmentY * 0.005 + time * 0.3) * 0.3);
      
      if (i === 0) {
        this.ctx.moveTo(waveX - curtainWidth/2, segmentY);
      } else {
        this.ctx.lineTo(waveX - curtainWidth/2, segmentY);
      }
    }
    
    // Complete the curtain shape
    for (let i = segments; i >= 0; i--) {
      const segmentY = y + (i / segments) * height;
      const waveX = x + Math.sin(segmentY * waveFrequency * 0.01 + time + wavePhase) * waveAmplitude;
      const curtainWidth = width * (0.8 + Math.sin(segmentY * 0.005 + time * 0.3) * 0.3);
      this.ctx.lineTo(waveX + curtainWidth/2, segmentY);
    }
    
    this.ctx.closePath();
    this.ctx.fill();
    
    // Add soft glow around the curtain
    this.ctx.shadowColor = `${color}0.4)`;
    this.ctx.shadowBlur = 15;
    this.ctx.fill();
    
    // Add wispy tendrils for more realism
    if (Math.random() < 0.1) {
      const tendrilX = x + (Math.random() - 0.5) * width;
      const tendrilY = y + Math.random() * height * 0.7;
      
      this.ctx.shadowBlur = 8;
      this.ctx.fillStyle = `${color}${(alpha * 0.4).toFixed(2)})`;
      this.ctx.beginPath();
      this.ctx.ellipse(tendrilX, tendrilY, 3, 15 + Math.random() * 20, 0, 0, Math.PI * 2);
      this.ctx.fill();
    }
    
    this.ctx.shadowColor = 'transparent';
    this.ctx.shadowBlur = 0;
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
    if (!this.isActive) return;
    
    const isSuperPeak = intensity > 0.9;
    
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
    
    // Theme-specific beat reactions
    if (intensity > 0.7) {
      switch(this.currentTheme) {
        case 'cyberBloodbath':
          this.spawnBloodSplatter(3 + Math.floor(intensity * 5));
          if (isSuperPeak) {
            this.arterialSpray();
            this.heartbeatVeinPulse();
          }
          break;
          
        case 'hyperAurora':
          this.spawnAuroraWave();
          if (isSuperPeak) {
            this.auroraPillarExplosion();
            this.coronaBorealisHalo();
          }
          this.magneticFieldRipple(intensity);
          break;
          
        case 'diamondRain':
          this.spawnDiamonds(2 + Math.floor(intensity * 3));
          if (isSuperPeak) {
            this.diamondBurstShockwave();
          }
          break;
          
        case 'neonNightmare':
          this.spawnStrobeFlash();
          if (isSuperPeak) {
            this.nightmareFaceFlicker();
            this.infiniteMirrorGlitch();
          }
          this.meltingNeonDrip();
          break;
          
        case 'galacticStorm':
          this.spawnNebulaParticles(5 + Math.floor(intensity * 7));
          if (isSuperPeak) {
            this.lightningStormArcs();
            this.starExplosionSupernova();
          }
          this.nebulaSwirlAcceleration(intensity);
          break;
          
        case 'chromaticChaos':
          this.spawnColorShift(4 + Math.floor(intensity * 6));
          this.rgbSplitStorm(intensity);
          if (isSuperPeak) {
            this.colorChannelTearing();
          }
          break;
          
        case 'quantumDrift':
          this.spawnQuantumParticles(3 + Math.floor(intensity * 4));
          this.probabilityWaveInterference();
          if (isSuperPeak) {
            this.teleportGlitchJump();
          }
          this.entanglementParticlePairs();
          break;
      }
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

  // =================================
  // NEW PARTICLE RENDER METHODS
  // =================================
  
  renderArterial(p) {
    const { x, y, size, life, color, trail } = p;
    const alpha = life.toFixed(2);
    
    // Draw thin high-velocity blood spray
    this.ctx.strokeStyle = `${color}${alpha})`;
    this.ctx.lineWidth = size * 0.5;
    this.ctx.shadowColor = `${color}0.8)`;
    this.ctx.shadowBlur = 8;
    
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    
    // Draw trail
    if (trail.length > 0) {
      for (let i = 0; i < trail.length; i++) {
        const point = trail[i];
        const trailAlpha = (alpha * (i / trail.length)).toFixed(2);
        this.ctx.strokeStyle = `${color}${trailAlpha})`;
        this.ctx.lineTo(point.x, point.y);
      }
    }
    
    this.ctx.stroke();
    this.ctx.shadowColor = 'transparent';
    this.ctx.shadowBlur = 0;
  }
  
  renderStar(p) {
    const { x, y, size, life, color } = p;
    const alpha = life.toFixed(2);
    
    // Bright star with radiating light
    this.ctx.fillStyle = `${color}${alpha})`;
    this.ctx.shadowColor = `${color}1)`;
    this.ctx.shadowBlur = size * 4;
    
    this.ctx.beginPath();
    this.ctx.arc(x, y, size, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Add star spikes
    this.ctx.strokeStyle = `${color}${alpha})`;
    this.ctx.lineWidth = 2;
    
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const length = size * 3;
      this.ctx.beginPath();
      this.ctx.moveTo(x, y);
      this.ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
      this.ctx.stroke();
    }
    
    this.ctx.shadowColor = 'transparent';
    this.ctx.shadowBlur = 0;
  }

  // =================================
  // SPECIAL EFFECTS FOR EACH THEME
  // =================================
  
  // CYBER BLOODBATH SPECIAL EFFECTS
  arterialSpray() {
    // High-velocity red lines shooting outward on super peaks
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.5;
      const speed = 15 + Math.random() * 10;
      const centerX = this.canvas.width / 2;
      const centerY = this.canvas.height / 2;
      
      const particle = {
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity: 0.3,
        size: 2 + Math.random() * 3,
        life: 1.0,
        decay: 0.015,
        color: this.getBloodColor(),
        type: 'arterial',
        trail: []
      };
      this.particles.push(particle);
    }
  }
  
  heartbeatVeinPulse() {
    // Create pulsing vein overlay
    const overlay = document.createElement('div');
    overlay.className = 'heartbeat-veins';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: radial-gradient(circle at 50% 50%, transparent 30%, rgba(150, 0, 0, 0.1) 70%);
      pointer-events: none;
      z-index: 999998;
      animation: heartbeatPulse 0.6s ease-out;
    `;
    
    document.body.appendChild(overlay);
    setTimeout(() => overlay.remove(), 600);
  }
  
  // HYPER AURORA SPECIAL EFFECTS
  auroraPillarExplosion() {
    // Vertical pillars erupting upward
    for (let i = 0; i < 5; i++) {
      const x = (this.canvas.width / 6) * (i + 1);
      const baseY = this.canvas.height - 50;
      
      for (let j = 0; j < 15; j++) {
        const particle = {
          x: x + (Math.random() - 0.5) * 100,
          y: baseY,
          vx: (Math.random() - 0.5) * 2,
          vy: -8 - Math.random() * 6,
          width: 40 + Math.random() * 30,
          height: 100 + Math.random() * 150,
          life: 1.0,
          decay: 0.008,
          color: this.getAuroraColor(),
          wavePhase: Math.random() * Math.PI * 2,
          intensity: 0.8 + Math.random() * 0.2,
          type: 'aurora'
        };
        this.particles.push(particle);
      }
    }
  }
  
  coronaBorealisHalo() {
    // Rainbow halo around waveform/title
    const titleEl = document.querySelector('.np-track-title');
    if (titleEl) {
      titleEl.style.textShadow = `
        0 0 20px #ff0080,
        0 0 40px #0080ff,
        0 0 60px #80ff00,
        0 0 80px #ff8000
      `;
      
      setTimeout(() => {
        titleEl.style.textShadow = '';
      }, 1000);
    }
  }
  
  magneticFieldRipple(intensity) {
    // Horizontal wave distortion
    const overlay = document.createElement('div');
    overlay.className = 'magnetic-ripple';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent 45%, rgba(0, 255, 150, ${intensity * 0.1}) 50%, transparent 55%);
      pointer-events: none;
      z-index: 999997;
      animation: magneticWave ${2 - intensity}s ease-in-out;
    `;
    
    document.body.appendChild(overlay);
    setTimeout(() => overlay.remove(), 2000);
  }
  
  // DIAMOND RAIN SPECIAL EFFECTS
  diamondBurstShockwave() {
    // Radial shockwave of diamond shards
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20;
      const speed = 8 + Math.random() * 5;
      
      const particle = {
        x: this.canvas.width / 2,
        y: this.canvas.height / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 8 + Math.random() * 12,
        life: 1.0,
        decay: 0.012,
        color: 'rgba(255, 255, 255, ',
        rotation: Math.random() * Math.PI,
        rotationSpeed: (Math.random() - 0.5) * 0.3,
        type: 'diamond',
        shockwave: true
      };
      this.particles.push(particle);
    }
  }
  
  // NEON NIGHTMARE SPECIAL EFFECTS
  nightmareFaceFlicker() {
    // Subliminal demonic face flash
    const face = document.createElement('div');
    face.innerHTML = '👹';
    face.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 200px;
      opacity: 0.7;
      pointer-events: none;
      z-index: 999999;
      filter: invert(1) contrast(2);
      mix-blend-mode: difference;
    `;
    
    document.body.appendChild(face);
    setTimeout(() => face.remove(), 100); // Only visible for 100ms
  }
  
  infiniteMirrorGlitch() {
    // Screen duplication effect
    const appContainer = document.querySelector('.app-container');
    if (appContainer) {
      appContainer.style.transform = 'scale(0.8)';
      appContainer.style.filter = 'drop-shadow(20px 20px 0 rgba(255, 0, 255, 0.3))';
      
      setTimeout(() => {
        appContainer.style.transform = '';
        appContainer.style.filter = '';
      }, 800);
    }
  }
  
  meltingNeonDrip() {
    // Text melting effect
    const buttons = document.querySelectorAll('.control-button, .np-track-title');
    buttons.forEach(btn => {
      btn.style.transform = 'scaleY(1.2) translateY(5px)';
      btn.style.filter = 'blur(1px)';
      
      setTimeout(() => {
        btn.style.transform = '';
        btn.style.filter = '';
      }, 500);
    });
  }
  
  // GALACTIC STORM SPECIAL EFFECTS
  lightningStormArcs() {
    // Lightning bolts across screen
    for (let i = 0; i < 3; i++) {
      const startX = Math.random() * this.canvas.width;
      const endX = Math.random() * this.canvas.width;
      const startY = Math.random() * this.canvas.height * 0.3;
      const endY = this.canvas.height - Math.random() * this.canvas.height * 0.3;
      
      // Create lightning path
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      this.ctx.lineWidth = 3 + Math.random() * 5;
      this.ctx.shadowColor = '#80ff80';
      this.ctx.shadowBlur = 15;
      
      this.ctx.beginPath();
      this.ctx.moveTo(startX, startY);
      
      // Jagged lightning path
      const segments = 8;
      for (let j = 1; j <= segments; j++) {
        const progress = j / segments;
        const x = startX + (endX - startX) * progress + (Math.random() - 0.5) * 40;
        const y = startY + (endY - startY) * progress;
        this.ctx.lineTo(x, y);
      }
      
      this.ctx.stroke();
    }
    
    setTimeout(() => {
      this.ctx.shadowColor = 'transparent';
      this.ctx.shadowBlur = 0;
    }, 200);
  }
  
  starExplosionSupernova() {
    // Bright star explosion
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    // Bright flash
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Expanding ring particles
    for (let i = 0; i < 50; i++) {
      const angle = (Math.PI * 2 * i) / 50;
      const speed = 5 + Math.random() * 8;
      
      const particle = {
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 6,
        life: 1.0,
        decay: 0.008,
        color: 'rgba(255, 255, 0, ',
        type: 'star'
      };
      this.particles.push(particle);
    }
  }
  
  nebulaSwirlAcceleration(intensity) {
    // Background swirl effect
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: conic-gradient(from ${intensity * 360}deg, transparent, rgba(128, 0, 255, ${intensity * 0.1}), transparent);
      pointer-events: none;
      z-index: 999995;
      animation: nebulaSwirl ${3 - intensity * 2}s linear;
    `;
    
    document.body.appendChild(overlay);
    setTimeout(() => overlay.remove(), 3000);
  }
  
  // CHROMATIC CHAOS SPECIAL EFFECTS
  rgbSplitStorm(intensity) {
    // RGB channel separation
    const appContainer = document.querySelector('.app-container');
    if (appContainer) {
      const offset = intensity * 5;
      appContainer.style.filter = `
        drop-shadow(${offset}px 0 0 red)
        drop-shadow(${-offset}px 0 0 cyan)
        drop-shadow(0 ${offset}px 0 magenta)
      `;
      
      setTimeout(() => {
        appContainer.style.filter = '';
      }, 300);
    }
  }
  
  colorChannelTearing() {
    // Channel displacement glitch
    const elements = document.querySelectorAll('.control-button, .np-track-title, .waveform-container');
    elements.forEach((el, i) => {
      const direction = i % 2 === 0 ? 'left' : 'right';
      const distance = 10 + Math.random() * 20;
      
      el.style.transform = `translateX(${direction === 'left' ? -distance : distance}px)`;
      el.style.filter = 'hue-rotate(180deg)';
      
      setTimeout(() => {
        el.style.transform = '';
        el.style.filter = '';
      }, 200);
    });
  }
  
  // QUANTUM DRIFT SPECIAL EFFECTS
  probabilityWaveInterference() {
    // Multiple overlapping waveforms
    const waveform = document.querySelector('.waveform-container');
    if (waveform) {
      waveform.style.filter = `
        drop-shadow(5px 0 0 rgba(0, 255, 255, 0.5))
        drop-shadow(-5px 0 0 rgba(255, 0, 255, 0.5))
        drop-shadow(0 5px 0 rgba(255, 255, 0, 0.3))
      `;
      
      setTimeout(() => {
        waveform.style.filter = '';
      }, 800);
    }
  }
  
  teleportGlitchJump() {
    // Random UI displacement
    const appContainer = document.querySelector('.app-container');
    if (appContainer) {
      const jumpX = (Math.random() - 0.5) * 30;
      const jumpY = (Math.random() - 0.5) * 30;
      
      appContainer.style.transform = `translate(${jumpX}px, ${jumpY}px)`;
      
      setTimeout(() => {
        appContainer.style.transform = '';
      }, 50); // Very brief quantum tunnel effect
    }
  }
  
  entanglementParticlePairs() {
    // Paired particles that mirror each other
    for (let i = 0; i < 3; i++) {
      const centerX = this.canvas.width / 2;
      const centerY = this.canvas.height / 2;
      
      // Create entangled pair
      const angle1 = Math.random() * Math.PI * 2;
      const angle2 = angle1 + Math.PI; // Opposite direction
      const speed = 2 + Math.random() * 3;
      
      const particle1 = {
        x: centerX,
        y: centerY,
        vx: Math.cos(angle1) * speed,
        vy: Math.sin(angle1) * speed,
        size: 4,
        life: 1.0,
        decay: 0.005,
        color: 'rgba(0, 255, 255, ',
        type: 'quantum',
        entangled: true,
        pairId: i
      };
      
      const particle2 = {
        x: centerX,
        y: centerY,
        vx: Math.cos(angle2) * speed,
        vy: Math.sin(angle2) * speed,
        size: 4,
        life: 1.0,
        decay: 0.005,
        color: 'rgba(255, 255, 0, ',
        type: 'quantum',
        entangled: true,
        pairId: i
      };
      
      this.particles.push(particle1);
      this.particles.push(particle2);
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