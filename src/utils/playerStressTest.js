/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: playerStressTest.js
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
/**
 * Player Stress Test Utility
 * Tests audio players under extreme conditions to find breaking points
 */

export class PlayerStressTest {
  constructor(audioRef, tracks = []) {
    this.audioRef = audioRef;
    this.tracks = tracks;
    this.errors = [];
    this.warnings = [];
    this.stats = {
      tracksLoaded: 0,
      playPauseCycles: 0,
      seekOperations: 0,
      errors: 0,
      warnings: 0,
      startTime: null,
      endTime: null
    };
    this.isRunning = false;
    this.shouldStop = false;
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    console.log(logEntry);
    
    if (level === 'error') {
      this.errors.push(logEntry);
      this.stats.errors++;
    } else if (level === 'warn') {
      this.warnings.push(logEntry);
      this.stats.warnings++;
    }
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  stop() {
    this.shouldStop = true;
    this.log('Stop requested');
  }

  /**
   * Test 1: Rapid track switching (simulates frantic browsing)
   */
  async testRapidTrackSwitching(duration = 30000) {
    this.log('=== Test 1: Rapid Track Switching ===');
    const startTime = Date.now();
    let count = 0;

    while (Date.now() - startTime < duration && !this.shouldStop) {
      try {
        const track = this.tracks[count % this.tracks.length];
        if (!track) break;

        const src = track.filePath.startsWith('local://') 
          ? track.filePath 
          : `local://${track.filePath}`;
        
        this.audioRef.src = src;
        await this.audioRef.play().catch(e => {
          this.log(`Play failed: ${e.message}`, 'warn');
        });
        
        // Switch tracks every 100-500ms
        await this.sleep(100 + Math.random() * 400);
        this.audioRef.pause();
        
        count++;
        this.stats.tracksLoaded++;
      } catch (err) {
        this.log(`Rapid switching error: ${err.message}`, 'error');
      }
    }

    this.log(`Rapid switching complete: ${count} track switches in ${duration}ms`);
  }

  /**
   * Test 2: Aggressive seek operations
   */
  async testAggressiveSeek(iterations = 100) {
    this.log('=== Test 2: Aggressive Seek Operations ===');
    
    if (!this.audioRef.src || this.audioRef.duration === 0) {
      // Load first track
      const track = this.tracks[0];
      if (!track) {
        this.log('No tracks available for seek test', 'warn');
        return;
      }
      
      const src = track.filePath.startsWith('local://') 
        ? track.filePath 
        : `local://${track.filePath}`;
      this.audioRef.src = src;
      
      await new Promise((resolve) => {
        this.audioRef.addEventListener('loadedmetadata', resolve, { once: true });
      });
    }

    for (let i = 0; i < iterations && !this.shouldStop; i++) {
      try {
        const duration = this.audioRef.duration;
        if (!duration || duration === Infinity) {
          this.log('Invalid duration, skipping seek test', 'warn');
          break;
        }

        // Random seek
        const seekPos = Math.random() * duration;
        this.audioRef.currentTime = seekPos;
        this.stats.seekOperations++;

        // Very short delay between seeks
        await this.sleep(10 + Math.random() * 40);
      } catch (err) {
        this.log(`Seek error: ${err.message}`, 'error');
      }
    }

    this.log(`Aggressive seek complete: ${iterations} seek operations`);
  }

  /**
   * Test 3: Rapid play/pause cycles
   */
  async testPlayPauseCycles(cycles = 200) {
    this.log('=== Test 3: Rapid Play/Pause Cycles ===');

    if (!this.audioRef.src) {
      const track = this.tracks[0];
      if (!track) {
        this.log('No tracks available for play/pause test', 'warn');
        return;
      }
      
      const src = track.filePath.startsWith('local://') 
        ? track.filePath 
        : `local://${track.filePath}`;
      this.audioRef.src = src;
      await this.audioRef.load();
    }

    for (let i = 0; i < cycles && !this.shouldStop; i++) {
      try {
        await this.audioRef.play().catch(e => {
          this.log(`Play failed in cycle ${i}: ${e.message}`, 'warn');
        });
        await this.sleep(20 + Math.random() * 30);
        
        this.audioRef.pause();
        await this.sleep(20 + Math.random() * 30);
        
        this.stats.playPauseCycles++;
      } catch (err) {
        this.log(`Play/pause cycle error: ${err.message}`, 'error');
      }
    }

    this.log(`Play/pause cycles complete: ${cycles} cycles`);
  }

  /**
   * Test 4: Volume/playback rate changes
   */
  async testVolumeAndRateChanges(iterations = 100) {
    this.log('=== Test 4: Volume and Playback Rate Changes ===');

    for (let i = 0; i < iterations && !this.shouldStop; i++) {
      try {
        this.audioRef.volume = Math.random();
        this.audioRef.playbackRate = 0.5 + Math.random() * 1.5; // 0.5x to 2.0x
        await this.sleep(50);
      } catch (err) {
        this.log(`Volume/rate change error: ${err.message}`, 'error');
      }
    }

    // Reset to defaults
    this.audioRef.volume = 1.0;
    this.audioRef.playbackRate = 1.0;

    this.log('Volume and rate changes complete');
  }

  /**
   * Test 5: Memory leak detection (load many tracks without cleanup)
   */
  async testMemoryLeak(trackCount = 50) {
    this.log('=== Test 5: Memory Leak Detection ===');
    const initialMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;

    for (let i = 0; i < trackCount && !this.shouldStop; i++) {
      try {
        const track = this.tracks[i % this.tracks.length];
        if (!track) break;

        const src = track.filePath.startsWith('local://') 
          ? track.filePath 
          : `local://${track.filePath}`;
        
        this.audioRef.src = src;
        await this.audioRef.load();
        await this.sleep(100);
        
        if (performance.memory && i % 10 === 0) {
          const currentMemory = performance.memory.usedJSHeapSize;
          const delta = currentMemory - initialMemory;
          this.log(`Memory usage after ${i} loads: ${(delta / 1024 / 1024).toFixed(2)}MB increase`);
        }
      } catch (err) {
        this.log(`Memory test error: ${err.message}`, 'error');
      }
    }

    const finalMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
    const memoryIncrease = finalMemory - initialMemory;
    this.log(`Memory leak test complete. Total increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
  }

  /**
   * Test 6: Edge cases (corrupted paths, missing files, etc.)
   */
  async testEdgeCases() {
    this.log('=== Test 6: Edge Cases ===');
    this.log('Note: Console errors below are EXPECTED - testing error handling');

    const edgeCases = [
      { path: '', description: 'Empty path' },
      { path: 'local://nonexistent/file.mp3', description: 'Non-existent file' },
      { path: 'invalid://protocol/file.mp3', description: 'Invalid protocol' },
      { path: 'local://../../../etc/passwd', description: 'Path traversal attempt' },
      { path: 'local://' + 'x'.repeat(5000), description: 'Extremely long path' },
    ];

    // Temporarily suppress console errors during edge case testing
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    const suppressedErrors = [];
    
    console.error = (...args) => {
      suppressedErrors.push(['error', args]);
    };
    console.warn = (...args) => {
      suppressedErrors.push(['warn', args]);
    };

    let handledCount = 0;
    for (const testCase of edgeCases) {
      if (this.shouldStop) break;

      try {
        this.audioRef.src = testCase.path;
        
        // Wait for error or timeout
        await Promise.race([
          new Promise((resolve) => {
            this.audioRef.addEventListener('error', resolve, { once: true });
          }),
          this.sleep(300)
        ]);

        handledCount++;
      } catch (err) {
        this.log(`Edge case error (${testCase.description}): ${err.message}`, 'warn');
      }
    }

    // Restore console
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;

    this.log(`Edge case testing complete: ${handledCount}/${edgeCases.length} cases handled without crashes`);
    this.log(`(Suppressed ${suppressedErrors.length} expected console errors)`);
  }

  /**
   * Test 7: Concurrent operations
   */
  async testConcurrentOperations() {
    this.log('=== Test 7: Concurrent Operations ===');

    if (!this.audioRef.src || !this.tracks[0]) {
      this.log('No tracks available for concurrent test', 'warn');
      return;
    }

    // Try to do multiple things simultaneously
    const operations = [];

    for (let i = 0; i < 10 && !this.shouldStop; i++) {
      operations.push(
        this.audioRef.play().catch(e => this.log(`Concurrent play failed: ${e.message}`, 'warn')),
        new Promise(resolve => {
          this.audioRef.currentTime = Math.random() * (this.audioRef.duration || 100);
          resolve();
        }),
        new Promise(resolve => {
          this.audioRef.volume = Math.random();
          resolve();
        })
      );
    }

    await Promise.allSettled(operations);
    this.log('Concurrent operations test complete');
  }

  /**
   * Run all stress tests
   */
  async runAllTests(options = {}) {
    const {
      rapidSwitchDuration = 10000,
      seekIterations = 50,
      playPauseCycles = 100,
      volumeIterations = 50,
      memoryLeakTracks = 30,
      includeEdgeCases = true,
      includeConcurrent = true
    } = options;

    this.isRunning = true;
    this.shouldStop = false;
    this.stats.startTime = Date.now();
    this.errors = [];
    this.warnings = [];

    this.log('╔════════════════════════════════════════════════╗');
    this.log('║     PLAYER STRESS TEST - STARTING             ║');
    this.log('╚════════════════════════════════════════════════╝');

    try {
      // Test 1: Rapid track switching
      await this.testRapidTrackSwitching(rapidSwitchDuration);
      await this.sleep(500);

      // Test 2: Aggressive seek
      await this.testAggressiveSeek(seekIterations);
      await this.sleep(500);

      // Test 3: Play/pause cycles
      await this.testPlayPauseCycles(playPauseCycles);
      await this.sleep(500);

      // Test 4: Volume and rate changes
      await this.testVolumeAndRateChanges(volumeIterations);
      await this.sleep(500);

      // Test 5: Memory leak detection
      await this.testMemoryLeak(memoryLeakTracks);
      await this.sleep(500);

      // Test 6: Edge cases
      if (includeEdgeCases) {
        await this.testEdgeCases();
        await this.sleep(500);
      }

      // Test 7: Concurrent operations
      if (includeConcurrent) {
        await this.testConcurrentOperations();
      }

    } catch (err) {
      this.log(`Fatal error during stress test: ${err.message}`, 'error');
    }

    this.stats.endTime = Date.now();
    this.isRunning = false;

    return this.printReport();
  }

  /**
   * Print test report
   */
  printReport() {
    const duration = ((this.stats.endTime - this.stats.startTime) / 1000).toFixed(2);

    console.log('\n');
    this.log('╔════════════════════════════════════════════════╗');
    this.log('║     STRESS TEST REPORT                         ║');
    this.log('╚════════════════════════════════════════════════╝');
    this.log('');
    this.log(`Duration: ${duration} seconds`);
    this.log(`Tracks Loaded: ${this.stats.tracksLoaded}`);
    this.log(`Play/Pause Cycles: ${this.stats.playPauseCycles}`);
    this.log(`Seek Operations: ${this.stats.seekOperations}`);
    this.log(`Errors: ${this.stats.errors}`);
    this.log(`Warnings: ${this.stats.warnings}`);
    this.log('');

    if (this.errors.length > 0) {
      this.log('=== ERRORS ===');
      this.errors.forEach(err => console.error(err));
      this.log('');
    }

    if (this.warnings.length > 0) {
      this.log('=== WARNINGS ===');
      this.warnings.forEach(warn => console.warn(warn));
      this.log('');
    }

    this.log('Test completed!');
    
    return {
      duration,
      stats: this.stats,
      errors: this.errors,
      warnings: this.warnings
    };
  }
}

/**
 * Create a stress test button component
 */
export function createStressTestButton(audioRef, tracks, onComplete) {
  const button = document.createElement('button');
  button.textContent = '⚡ Run Stress Test';
  button.className = 'px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-bold';
  
  let test = null;

  button.onclick = async () => {
    if (test && test.isRunning) {
      test.stop();
      button.textContent = '⚡ Run Stress Test';
      return;
    }

    button.textContent = '⏸ Stop Stress Test';
    test = new PlayerStressTest(audioRef, tracks);
    
    const result = await test.runAllTests({
      rapidSwitchDuration: 10000,
      seekIterations: 100,
      playPauseCycles: 150,
      volumeIterations: 100,
      memoryLeakTracks: 50,
      includeEdgeCases: true,
      includeConcurrent: true
    });

    button.textContent = '⚡ Run Stress Test';
    
    if (onComplete) {
      onComplete(result);
    }
  };

  return button;
}

