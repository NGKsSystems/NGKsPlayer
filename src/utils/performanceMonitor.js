// Simple performance monitoring utility
export class PerformanceMonitor {
  constructor(componentName) {
    this.componentName = componentName;
    this.renderCount = 0;
    this.effectCount = {};
    this.lastLogTime = Date.now();
  }

  logRender() {
    this.renderCount++;
    this.logIfNeeded();
  }

  logEffect(effectName) {
    if (!this.effectCount[effectName]) {
      this.effectCount[effectName] = 0;
    }
    this.effectCount[effectName]++;
    this.logIfNeeded();
  }

  logIfNeeded() {
    const now = Date.now();
    if (now - this.lastLogTime > 5000) {
      // Log every 5 seconds
      console.log(`[${this.componentName}] Renders: ${this.renderCount}, Effects:`, this.effectCount);
      this.renderCount = 0;
      this.effectCount = {};
      this.lastLogTime = now;
    }
  }

  reset() {
    this.renderCount = 0;
    this.effectCount = {};
  }
}

// Create monitors for key components
export const clipperMonitor = new PerformanceMonitor('Clipper');
export const waveformMonitor = new PerformanceMonitor('WaveformEditor');
