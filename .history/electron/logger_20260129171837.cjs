// electron/logger.cjs - Centralized logging utility with environment-based control

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
  VERBOSE: 4
};

class Logger {
  constructor() {
    // Read log level from environment variable, default to WARN in production
    const envLevel = process.env.LOG_LEVEL?.toUpperCase() || 
                    (process.env.NODE_ENV === 'development' ? 'INFO' : 'WARN');
    this.level = LOG_LEVELS[envLevel] ?? LOG_LEVELS.WARN;
    
    // Specific module controls
    this.moduleFilters = {
      // Set to false to completely silence specific modules
      'AppIsolation': true,
      'Analysis': false,       // Usually very verbose
      'BPM': false,           // Very verbose during analysis
      'KEY': false,           // Very verbose during analysis
      'ENERGY': false,        // Very verbose during analysis
      'LOUDNESS': false,      // Very verbose during analysis
      'CUES': false,          // Very verbose during analysis
      'Waveform': false,      // Very verbose during playback
      'BLOB': false,          // Usually not needed
      'DB': false,            // Database operations can be noisy
      'BackgroundScan': true,
      'REAL AUDIO': false     // FFmpeg operations are very verbose
    };
  }

  _shouldLog(level, prefix = '') {
    // Check log level first
    if (level > this.level) return false;
    
    // Check module-specific filters
    for (const [module, enabled] of Object.entries(this.moduleFilters)) {
      if (prefix.includes(module) && !enabled) {
        return false;
      }
    }
    
    return true;
  }

  error(prefix, ...args) {
    if (this._shouldLog(LOG_LEVELS.ERROR, prefix)) {
      console.error(`[${prefix}]`, ...args);
    }
  }

  warn(prefix, ...args) {
    if (this._shouldLog(LOG_LEVELS.WARN, prefix)) {
      console.warn(`[${prefix}]`, ...args);
    }
  }

  info(prefix, ...args) {
    if (this._shouldLog(LOG_LEVELS.INFO, prefix)) {
      console.log(`[${prefix}]`, ...args);
    }
  }

  debug(prefix, ...args) {
    if (this._shouldLog(LOG_LEVELS.DEBUG, prefix)) {
      console.log(`[${prefix}]`, ...args);
    }
  }

  verbose(prefix, ...args) {
    if (this._shouldLog(LOG_LEVELS.VERBOSE, prefix)) {
      console.log(`[${prefix}]`, ...args);
    }
  }

  // Legacy support - simple console.log replacement
  log(...args) {
    if (this.level >= LOG_LEVELS.INFO) {
      console.log(...args);
    }
  }
}

// Create singleton instance
const logger = new Logger();

module.exports = logger;
