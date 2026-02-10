/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: AudioAnalyzer_refactored.js
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
// src/audio/AudioAnalyzer_refactored.js
import { FastScanAnalyzer } from "./FastScanAnalyzer.js";
import { DeepScanAnalyzer } from "./DeepScanAnalyzer.js";
import analyzerConfig from "../utils/analyzerConfig.js";

class AudioAnalyzerRefactored {
  constructor() {
    this.listeners = new Map();
    this.ongoingAnalyses = new Set();
    this.deepAnalysisQueue = [];
    this.isProcessingDeepQueue = false;
  }

  onAnalysisUpdate(filePath, callback) {
    if (!this.listeners.has(filePath)) this.listeners.set(filePath, []);
    this.listeners.get(filePath).push(callback);
  }

  notify(filePath, type, data) {
    const callbacks = this.listeners.get(filePath);
    if (callbacks) {
      callbacks.forEach((cb) => cb({ type, data, filePath }));
    }
  }

  async safeInvoke(channel, payload = {}, timeoutMs = 5000) {
    if (!window.api?.invoke) return null;
    try {
      const p = window.api.invoke(channel, payload);
      const t = new Promise((_, rej) =>
        setTimeout(() => rej(new Error("IPC timeout")), timeoutMs)
      );
      return await Promise.race([p, t]);
    } catch (e) {
      console.warn("[AudioAnalyzer] safeInvoke failed", channel, e?.message);
      return null;
    }
  }

  async loadAudioFile(filePath) {
    console.log('[AudioAnalyzer] Loading audio via IPC:', filePath);
    if (!window.api || !window.api.invoke) throw new Error('IPC bridge not available - cannot decode audio file');
    try {
      // Give the event loop a tick
      await new Promise((r) => setTimeout(r, 0));
      const res = await this.safeInvoke('load-audio-file', { filePath }, 20000);
      if (!res) throw new Error('Failed to load audio file - got null response');
      console.log('[AudioAnalyzer] Received serialized audio data:', { duration: res.duration, sampleRate: res.sampleRate, length: res.length, channels: res.numberOfChannels });
      // Reconstruct a lightweight AudioBuffer-like object used by analyzers
      const audioLike = {
        duration: res.duration,
        sampleRate: res.sampleRate,
        length: res.length,
        numberOfChannels: res.numberOfChannels,
        getChannelData: function (i) {
          if (i < 0 || i >= this.numberOfChannels) throw new Error('Invalid channel index: ' + i);
          return new Float32Array(res.channelData[i] || []);
        },
      };
      return audioLike;
    } catch (e) {
      console.warn('[AudioAnalyzer] loadAudioFile failed:', e?.message || e);
      return null;
    }
  }

  getFastScanWindow(genre = "") {
    // Your existing code
  }

  async analyzeTrackBatch(filePath, genre = null) {
    analyzerConfig.loadConfig();

    if (this.ongoingAnalyses.has(filePath))
      return { status: "already_running", filePath };
    this.ongoingAnalyses.add(filePath);

    try {
      // Load buffers via IPC (main process will decode and serialize)
      const fullBuffer = await this.loadAudioFile(filePath);
      // For fast pass we may only need a shorter window; use fullBuffer as window if no windowing implemented
      const windowBuffer = fullBuffer;
      if (!windowBuffer) throw new Error('Failed to load audio for fast analysis');

      const cfg =
        analyzerConfig?.getConfigForGenre?.(genre || "") ||
        analyzerConfig?.global ||
        {};

      console.log("[Orchestrator] Calling FastScanAnalyzer...");
      const fastResult = await FastScanAnalyzer.analyze(
        windowBuffer,
        genre,
        cfg
      );
      console.log(
        "[Orchestrator] FastScanAnalyzer returned BPM:",
        fastResult.bpm,
        "Key:",
        fastResult.key
      );

      this.notify(filePath, "FAST_DONE", fastResult);
      this.queueDeepAnalysis(filePath, fullBuffer || null, fastResult, genre);
      this.ongoingAnalyses.delete(filePath);
      return fastResult;
    } catch (err) {
      this.ongoingAnalyses.delete(filePath);
      this.notify(filePath, "ERROR", { error: err.message, filePath });
      return { error: err.message, filePath };
    }
  }

  queueDeepAnalysis = (filePath, fullBuffer, fastResult, genre) => {
    if (this.deepAnalysisQueue.some((t) => t.filePath === filePath)) return;
    this.deepAnalysisQueue.push({ filePath, fullBuffer, fastResult, genre });
    if (!this.isProcessingDeepQueue) this.processDeepAnalysisQueue();
  };

  processDeepAnalysisQueue = async () => {
    if (this.isProcessingDeepQueue || this.deepAnalysisQueue.length === 0)
      return;
    this.isProcessingDeepQueue = true;

    while (this.deepAnalysisQueue.length > 0) {
      const task = this.deepAnalysisQueue.shift();
      try {
        console.log(
          "[Orchestrator] Running DeepScanAnalyzer for:",
          task.filePath
        );
        
        // Load audio buffer if not provided
        let audioBuffer = task.fullBuffer;
        if (!audioBuffer) {
          console.log("[Orchestrator] Loading audio for deep analysis:", task.filePath);
          audioBuffer = await this.loadAudioFile(task.filePath);
        }
        
        if (!audioBuffer) {
          console.warn("[Orchestrator] Failed to load audio for deep analysis:", task.filePath);
          continue;
        }
        
        const result = await DeepScanAnalyzer.analyze(
          audioBuffer,
          task.genre,
          {},
          task.fastResult
        );
        console.log("[Orchestrator] DeepScanAnalyzer returned:", result);
        this.notify(task.filePath, "DEEP_DONE", result);
      } catch (e) {
        console.error("[AudioAnalyzer] deep error", e);
      }
      await new Promise((r) => setTimeout(r, 100));
    }

    this.isProcessingDeepQueue = false;
  };
}

AudioAnalyzerRefactored.isAnalyzingGlobally = false;

export default AudioAnalyzerRefactored;

