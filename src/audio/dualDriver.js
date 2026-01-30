// src/audio/dualDriver.js
// Simple dual audio driver system for DJ mode

export class DualAudioDriver {
  constructor() {
    // Single audio context for DJ mode
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    
    // Create final stereo output
    this.finalOutput = this.ctx.createChannelMerger(2);
    this.finalOutput.connect(this.ctx.destination);
    
    // Main mix chain (goes to LEFT channel only)
    this.mainMixA = this.ctx.createGain();
    this.mainMixB = this.ctx.createGain();
    this.mainMaster = this.ctx.createGain();
    
    // Connect main chain to LEFT channel only
    this.mainMixA.connect(this.mainMaster);
    this.mainMixB.connect(this.mainMaster);
    this.mainMaster.connect(this.finalOutput, 0, 0); // LEFT channel only
    
    // Cue chain (goes to RIGHT channel only) 
    this.cueGainA = this.ctx.createGain();
    this.cueGainB = this.ctx.createGain();
    this.cueMaster = this.ctx.createGain();
    
    // Connect cue chain to RIGHT channel only
    this.cueGainA.connect(this.cueMaster);
    this.cueGainB.connect(this.cueMaster);
    this.cueMaster.connect(this.finalOutput, 0, 1); // RIGHT channel only
    
    // Connect the final output to the speakers
    this.finalOutput.connect(this.ctx.destination);
    
    // Initialize - no cue active, crossfader center
    this.cueGainA.gain.value = 0;
    this.cueGainB.gain.value = 0;
    this.setCrossfader(0.5);
  }
  
  async resume() {
    if (this.ctx.state !== 'running') await this.ctx.resume();
  }
  
  attachDecks(audioA, audioB) {
    // Store audio sources for switching
    this.sourceA = this.ctx.createMediaElementSource(audioA);
    this.sourceB = this.ctx.createMediaElementSource(audioB);
    
    // Create EQ insertion points (these will be used by DJEqualizer component)
    this.eqInputA = this.ctx.createGain();
    this.eqInputB = this.ctx.createGain();
    this.eqOutputA = this.ctx.createGain();
    this.eqOutputB = this.ctx.createGain();
    
    // Initially connect: source -> EQ input -> EQ output -> main mix
    this.sourceA.connect(this.eqInputA);
    this.eqInputA.connect(this.eqOutputA);
    this.eqOutputA.connect(this.mainMixA);
    
    this.sourceB.connect(this.eqInputB);
    this.eqInputB.connect(this.eqOutputB);
    this.eqOutputB.connect(this.mainMixB);
  }
  
  setCrossfader(value) {
    // Equal power crossfade for main mix (LEFT channel)
    const a = Math.cos(value * Math.PI * 0.5);
    const b = Math.cos((1 - value) * Math.PI * 0.5);
    this.mainMixA.gain.value = a;
    this.mainMixB.gain.value = b;
  }
  
  setCue(deck, enabled) {
    if (deck === 'A') {
      // Disconnect from current routing
      this.eqOutputA.disconnect();
      
      if (enabled) {
        // Switch to cue driver (RIGHT channel)
        this.eqOutputA.connect(this.cueGainA);
        this.cueGainA.gain.value = 1.0;
      } else {
        // Switch back to main driver (LEFT channel)
        this.eqOutputA.connect(this.mainMixA);
      }
    } else if (deck === 'B') {
      // Disconnect from current routing
      this.eqOutputB.disconnect();
      
      if (enabled) {
        // Switch to cue driver (RIGHT channel)
        this.eqOutputB.connect(this.cueGainB);
        this.cueGainB.gain.value = 1.0;
      } else {
        // Switch back to main driver (LEFT channel)
        this.eqOutputB.connect(this.mainMixB);
      }
    }
  }
}
