/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: VoiceRecognition.js
 * Purpose: TODO â€“ describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
/**
 * Voice Recognition Service for NGKsPlayer
 * Supports commands like:
 * - "play [song name]"
 * - "play [artist] [song]"
 * - "pause" / "stop" / "resume"
 * - "next" / "previous"
 * - "volume up" / "volume down" / "volume [0-100]"
 * - "search [query]"
 */

class VoiceRecognition {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.continuous = false;
    this.onCommandCallback = null;
    this.onErrorCallback = null;
    this.onStartCallback = null;
    this.onEndCallback = null;
    this.language = 'en-US';
    
    this.initRecognition();
  }

  initRecognition() {
    // Check if browser supports Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('Web Speech API not supported in this browser');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false; // Single command mode by default
    this.recognition.interimResults = false;
    this.recognition.maxAlternatives = 1;
    this.recognition.lang = this.language;

    // Event handlers
    this.recognition.onstart = () => {
      this.isListening = true;
      console.log('ðŸŽ¤ Voice recognition started');
      if (this.onStartCallback) this.onStartCallback();
    };

    this.recognition.onend = () => {
      this.isListening = false;
      console.log('ðŸŽ¤ Voice recognition ended');
      if (this.onEndCallback) this.onEndCallback();
      
      // Auto-restart if in continuous mode
      if (this.continuous && this.recognition) {
        setTimeout(() => {
          if (this.continuous) this.start();
        }, 100);
      }
    };

    this.recognition.onerror = (event) => {
      console.error('Voice recognition error:', event.error);
      
      if (event.error === 'no-speech') {
        console.log('No speech detected');
        // Don't show error for no-speech, just restart if continuous
        if (this.onEndCallback) this.onEndCallback();
        return;
      } else if (event.error === 'network') {
        console.warn('Network error - Speech API may need internet connection');
        // Continue silently for network errors in Electron
        if (this.onErrorCallback) {
          this.onErrorCallback('Speech recognition requires internet connection');
        }
      } else if (event.error === 'audio-capture') {
        console.error('Microphone access denied or not available');
        if (this.onErrorCallback) this.onErrorCallback(event.error);
      } else if (event.error === 'not-allowed') {
        console.error('Microphone permission denied');
        if (this.onErrorCallback) this.onErrorCallback(event.error);
      } else {
        if (this.onErrorCallback) this.onErrorCallback(event.error);
      }
    };

    this.recognition.onresult = (event) => {
      const result = event.results[0][0];
      const transcript = result.transcript.toLowerCase().trim();
      const confidence = result.confidence;

      console.log(`ðŸŽ¤ Heard: "${transcript}" (confidence: ${(confidence * 100).toFixed(1)}%)`);

      if (confidence > 0.5) {
        this.parseCommand(transcript);
      } else {
        console.log('Low confidence, ignoring command');
      }
    };
  }

  parseCommand(transcript) {
    const command = {
      raw: transcript,
      type: null,
      params: {}
    };

    // Play commands
    if (transcript.startsWith('play ')) {
      command.type = 'play';
      command.params.query = transcript.replace(/^play\s+/, '');
    }
    // Pause/Stop/Resume
    else if (transcript === 'pause' || transcript === 'stop') {
      command.type = 'pause';
    }
    else if (transcript === 'resume' || transcript === 'play') {
      command.type = 'resume';
    }
    // Next/Previous
    else if (transcript === 'next' || transcript === 'next track' || transcript === 'skip') {
      command.type = 'next';
    }
    else if (transcript === 'previous' || transcript === 'previous track' || transcript === 'back') {
      command.type = 'previous';
    }
    // Volume control
    else if (transcript === 'volume up' || transcript === 'louder') {
      command.type = 'volume';
      command.params.change = 10;
    }
    else if (transcript === 'volume down' || transcript === 'quieter') {
      command.type = 'volume';
      command.params.change = -10;
    }
    else if (transcript.startsWith('volume ')) {
      const match = transcript.match(/volume\s+(\d+)/);
      if (match) {
        command.type = 'volume';
        command.params.value = parseInt(match[1]);
      }
    }
    else if (transcript === 'mute') {
      command.type = 'mute';
    }
    else if (transcript === 'unmute') {
      command.type = 'unmute';
    }
    // Search
    else if (transcript.startsWith('search ') || transcript.startsWith('find ')) {
      command.type = 'search';
      command.params.query = transcript.replace(/^(search|find)\s+/, '');
    }
    // Show/navigate commands
    else if (transcript.includes('library')) {
      command.type = 'navigate';
      command.params.view = 'library';
    }
    else if (transcript.includes('dj') || transcript.includes('mixer')) {
      command.type = 'navigate';
      command.params.view = 'dj';
    }
    else if (transcript.includes('settings')) {
      command.type = 'navigate';
      command.params.view = 'settings';
    }
    // Shuffle
    else if (transcript.includes('shuffle on')) {
      command.type = 'shuffle';
      command.params.enabled = true;
    }
    else if (transcript.includes('shuffle off')) {
      command.type = 'shuffle';
      command.params.enabled = false;
    }
    // Repeat
    else if (transcript.includes('repeat on')) {
      command.type = 'repeat';
      command.params.enabled = true;
    }
    else if (transcript.includes('repeat off')) {
      command.type = 'repeat';
      command.params.enabled = false;
    }
    else {
      // Unknown command
      command.type = 'unknown';
      console.log('Unknown voice command:', transcript);
    }

    // Execute the command
    if (this.onCommandCallback) {
      this.onCommandCallback(command);
    }
  }

  start() {
    if (!this.recognition) {
      console.error('Voice recognition not initialized');
      return false;
    }

    if (this.isListening) {
      console.log('Already listening');
      return false;
    }

    try {
      this.recognition.start();
      return true;
    } catch (error) {
      console.error('Failed to start voice recognition:', error);
      return false;
    }
  }

  stop() {
    if (!this.recognition) return;
    
    this.continuous = false;
    if (this.isListening) {
      this.recognition.stop();
    }
  }

  startContinuous() {
    this.continuous = true;
    this.start();
  }

  stopContinuous() {
    this.continuous = false;
    this.stop();
  }

  // Set callback for when a command is recognized
  onCommand(callback) {
    this.onCommandCallback = callback;
  }

  // Set callback for errors
  onError(callback) {
    this.onErrorCallback = callback;
  }

  // Set callback for when listening starts
  onStart(callback) {
    this.onStartCallback = callback;
  }

  // Set callback for when listening ends
  onEnd(callback) {
    this.onEndCallback = callback;
  }

  isSupported() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  setLanguage(lang) {
    this.language = lang;
    if (this.recognition) {
      this.recognition.lang = lang;
    }
  }
}

// Create singleton instance
const voiceRecognition = new VoiceRecognition();

export default voiceRecognition;

