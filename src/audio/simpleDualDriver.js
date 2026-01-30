// Simple dual channel audio driver - just routes audio to left/right channels
export class SimpleDualDriver {
  constructor() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    
    // Create a stereo merger (left/right channels)
    this.merger = this.ctx.createChannelMerger(2);
    
    // Connect merger to destination
    this.merger.connect(this.ctx.destination);
    
    // Track which deck goes to which channel
    this.deckSources = new Map();
    this.cueStates = { A: false, B: false };
  }
  
  async resume() {
    if (this.ctx.state !== 'running') {
      await this.ctx.resume();
    }
  }
  
  attachDeck(audioElement, deckId) {
    // Create media source from audio element
    const source = this.ctx.createMediaElementSource(audioElement);
    this.deckSources.set(deckId, source);
    
    // Initially route to main (left channel)
    this.routeDeck(deckId, false);
  }
  
  routeDeck(deckId, toCue) {
    const source = this.deckSources.get(deckId);
    if (!source) return;
    
    // Disconnect from current routing
    source.disconnect();
    
    if (toCue) {
      // Route to right channel (cue)
      source.connect(this.merger, 0, 1);
    } else {
      // Route to left channel (main)
      source.connect(this.merger, 0, 0);
    }
    
    this.cueStates[deckId] = toCue;
  }
  
  setCue(deckId, enabled) {
    this.routeDeck(deckId, enabled);
  }
}
