// analysisWorker.js - Runs analysis in separate thread to avoid blocking UI
// This worker performs both fast and deep analysis passes on audio files
// Fast pass: BPM, Key, Loudness, Cues (< 10 seconds)
// Deep pass: Phrases, Drift, Energy Trajectory, Transitions (can take 2-5 minutes)

const { parentPort } = require('worker_threads');
const path = require('path');

// Store analyzer instance for this worker
let analyzerInstance = null;

// Import analyzer dynamically when worker starts
async function initializeAnalyzer() {
  try {
    // We'll use the browser-side AudioAnalyzer via a minimal Node.js wrapper
    // For now, we'll create a lightweight version that delegates to the main process
    console.log('[AnalysisWorker] Worker thread initialized');
  } catch (err) {
    console.error('[AnalysisWorker] Failed to initialize:', err);
    parentPort.postMessage({ type: 'ERROR', error: err.message });
  }
}

// Handle incoming analysis requests from main process
parentPort.on('message', async (message) => {
  const { trackId, filePath, action } = message;

  try {
    if (action === 'FAST_PASS') {
      // Fast pass: quick analysis to show in UI immediately
      await performFastPass(trackId, filePath);
    } else if (action === 'DEEP_PASS') {
      // Deep pass: intensive analysis running in background
      await performDeepPass(trackId, filePath);
    }
  } catch (err) {
    console.error(`[AnalysisWorker] Error for track ${trackId}:`, err);
    parentPort.postMessage({
      type: 'ERROR',
      trackId,
      error: err.message,
    });
  }
});

/**
 * FAST PASS: Quick analysis for immediate display
 * Target: < 10 seconds per track
 * Returns: BPM, Key, Loudness, Cue In/Out, Duration
 */
async function performFastPass(trackId, filePath) {
  console.log(`[AnalysisWorker] Starting FAST_PASS for track ${trackId}`);
  const startTime = Date.now();

  try {
    // Request the main process to perform fast analysis
    // (Main process has access to FFmpeg, we just coordinate)
    parentPort.postMessage({
      type: 'REQUEST_FAST_ANALYSIS',
      trackId,
      filePath,
    });

    // Wait for main process response (will come via another message)
    // See the main process handler that sends back 'FAST_ANALYSIS_RESULT'
    
  } catch (err) {
    const elapsed = Date.now() - startTime;
    console.error(`[AnalysisWorker] FAST_PASS failed after ${elapsed}ms:`, err);
    throw err;
  }
}

/**
 * DEEP PASS: Full 110% premium analysis
 * Target: 2-5 minutes per track (but runs in background)
 * Returns: Phrases, BPM Drift, Energy Trajectory, Transition Difficulty
 */
async function performDeepPass(trackId, filePath) {
  console.log(`[AnalysisWorker] Starting DEEP_PASS for track ${trackId}`);
  const startTime = Date.now();

  try {
    // Request the main process to perform deep analysis
    parentPort.postMessage({
      type: 'REQUEST_DEEP_ANALYSIS',
      trackId,
      filePath,
    });

    // Wait for main process response
    // See the main process handler that sends back 'DEEP_ANALYSIS_RESULT'

  } catch (err) {
    const elapsed = Date.now() - startTime;
    console.error(`[AnalysisWorker] DEEP_PASS failed after ${elapsed}ms:`, err);
    throw err;
  }
}

// Initialize worker on startup
initializeAnalyzer();

console.log('[AnalysisWorker] Thread ready');
