/**
 * Performance Optimization React Hooks
 * 
 * Advanced React hooks for audio performance optimization,
 * memory management, and real-time monitoring
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { globalMemoryPool, globalProfiler } from './MemoryOptimization.js';
import { globalCanvasRenderer } from './CanvasOptimization.js';
import { AudioWorkletManager } from './AudioWorkletOptimization.js';

/**
 * Hook for optimized audio buffer management
 */
export function useAudioBufferPool() {
  const poolRef = useRef(globalMemoryPool);
  const [stats, setStats] = useState(null);
  
  const getBuffer = useCallback((channels, length, sampleRate) => {
    return poolRef.current.getAudioBuffer(channels, length, sampleRate);
  }, []);
  
  const returnBuffer = useCallback((buffer) => {
    poolRef.current.returnAudioBuffer(buffer);
  }, []);
  
  const getFloat32Array = useCallback((length) => {
    return poolRef.current.getFloat32Array(length);
  }, []);
  
  const returnFloat32Array = useCallback((array) => {
    poolRef.current.returnFloat32Array(array);
  }, []);
  
  const updateStats = useCallback(() => {
    setStats(poolRef.current.getStats());
  }, []);
  
  useEffect(() => {
    const interval = setInterval(updateStats, 5000);
    return () => clearInterval(interval);
  }, [updateStats]);
  
  return {
    getBuffer,
    returnBuffer,
    getFloat32Array,
    returnFloat32Array,
    stats,
    refreshStats: updateStats
  };
}

/**
 * Hook for performance profiling
 */
export function usePerformanceProfiler() {
  const profilerRef = useRef(globalProfiler);
  const [metrics, setMetrics] = useState(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  
  const startProfile = useCallback((name) => {
    profilerRef.current.startProfile(name);
  }, []);
  
  const endProfile = useCallback((name) => {
    return profilerRef.current.endProfile(name);
  }, []);
  
  const profile = useCallback((name, fn) => {
    return profilerRef.current.profile(name, fn);
  }, []);
  
  const startMonitoring = useCallback(() => {
    profilerRef.current.startFrameRateMonitoring();
    setIsMonitoring(true);
  }, []);
  
  const stopMonitoring = useCallback(() => {
    profilerRef.current.stopFrameRateMonitoring();
    setIsMonitoring(false);
  }, []);
  
  const generateReport = useCallback(() => {
    return profilerRef.current.generateReport();
  }, []);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(profilerRef.current.getMetrics());
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  return {
    startProfile,
    endProfile,
    profile,
    startMonitoring,
    stopMonitoring,
    generateReport,
    metrics,
    isMonitoring
  };
}

/**
 * Hook for optimized canvas rendering
 */
export function useOptimizedCanvas() {
  const rendererRef = useRef(globalCanvasRenderer);
  const [renderTasks, setRenderTasks] = useState(new Map());
  
  const renderWaveform = useCallback((canvasId, audioData, options = {}) => {
    const taskId = rendererRef.current.renderWaveform(canvasId, audioData, {
      ...options,
      onComplete: (id) => {
        setRenderTasks(prev => {
          const next = new Map(prev);
          next.delete(id);
          return next;
        });
        options.onComplete?.(id);
      }
    });
    
    setRenderTasks(prev => new Map(prev).set(taskId, 'waveform'));
    return taskId;
  }, []);
  
  const renderSpectrum = useCallback((canvasId, frequencyData, options = {}) => {
    const taskId = rendererRef.current.renderSpectrum(canvasId, frequencyData, {
      ...options,
      onComplete: (id) => {
        setRenderTasks(prev => {
          const next = new Map(prev);
          next.delete(id);
          return next;
        });
        options.onComplete?.(id);
      }
    });
    
    setRenderTasks(prev => new Map(prev).set(taskId, 'spectrum'));
    return taskId;
  }, []);
  
  const createOffscreenCanvas = useCallback((width, height, id) => {
    return rendererRef.current.createOffscreenCanvas(width, height, id);
  }, []);
  
  const transferToCanvas = useCallback((offscreenCanvasId, targetCanvas) => {
    rendererRef.current.transferToCanvas(offscreenCanvasId, targetCanvas);
  }, []);
  
  return {
    renderWaveform,
    renderSpectrum,
    createOffscreenCanvas,
    transferToCanvas,
    activeRenderTasks: renderTasks
  };
}

/**
 * Hook for audio worklet management
 */
export function useAudioWorklet(audioContext) {
  const [workletManager] = useState(() => new AudioWorkletManager());
  const [isInitialized, setIsInitialized] = useState(false);
  const [performanceStats, setPerformanceStats] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  
  const initialize = useCallback(async (options = {}) => {
    if (!audioContext || isInitialized) return;
    
    try {
      await workletManager.initialize(audioContext, options);
      
      workletManager.setCallbacks({
        onRecordingComplete: (audioBuffer, duration) => {
          setIsRecording(false);
          // Handle recording completion
        },
        onPerformanceWarning: (processingTime, maxTime) => {
          console.warn('Audio worklet performance warning:', { processingTime, maxTime });
        },
        onPerformanceStats: (stats) => {
          setPerformanceStats(stats);
        }
      });
      
      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to initialize audio worklet:', error);
    }
  }, [audioContext, workletManager, isInitialized]);
  
  const startRecording = useCallback(() => {
    if (!isInitialized) return;
    workletManager.startRecording();
    setIsRecording(true);
  }, [isInitialized, workletManager]);
  
  const stopRecording = useCallback(() => {
    if (!isInitialized) return;
    workletManager.stopRecording();
    setIsRecording(false);
  }, [isInitialized, workletManager]);
  
  const addEffect = useCallback((id, type, params = {}) => {
    if (!isInitialized) return;
    workletManager.addEffect(id, type, params);
  }, [isInitialized, workletManager]);
  
  const removeEffect = useCallback((id) => {
    if (!isInitialized) return;
    workletManager.removeEffect(id);
  }, [isInitialized, workletManager]);
  
  const updateEffect = useCallback((id, params) => {
    if (!isInitialized) return;
    workletManager.updateEffect(id, params);
  }, [isInitialized, workletManager]);
  
  const connect = useCallback((destination) => {
    if (!isInitialized) return;
    return workletManager.connect(destination);
  }, [isInitialized, workletManager]);
  
  const disconnect = useCallback(() => {
    if (!isInitialized) return;
    workletManager.disconnect();
  }, [isInitialized, workletManager]);
  
  useEffect(() => {
    return () => {
      if (isInitialized) {
        workletManager.cleanup();
      }
    };
  }, [isInitialized, workletManager]);
  
  return {
    initialize,
    isInitialized,
    startRecording,
    stopRecording,
    isRecording,
    addEffect,
    removeEffect,
    updateEffect,
    connect,
    disconnect,
    performanceStats,
    workletNode: workletManager.workletNode
  };
}

/**
 * Hook for optimized waveform rendering with virtualization
 */
export function useVirtualizedWaveform(audioData, containerWidth, containerHeight) {
  const canvasRef = useRef(null);
  const offscreenCanvasRef = useRef(null);
  const { renderWaveform } = useOptimizedCanvas();
  const { getFloat32Array, returnFloat32Array } = useAudioBufferPool();
  
  const [viewportStart, setViewportStart] = useState(0);
  const [viewportEnd, setViewportEnd] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(1);
  
  // Calculate visible sample range
  const visibleSamples = useMemo(() => {
    if (!audioData) return null;
    
    const totalSamples = audioData.length;
    const startSample = Math.floor(viewportStart * totalSamples);
    const endSample = Math.floor(viewportEnd * totalSamples);
    const sampleCount = endSample - startSample;
    
    // Get subset of audio data for rendering
    const visibleData = getFloat32Array(sampleCount);
    
    for (let i = 0; i < sampleCount; i++) {
      visibleData[i] = audioData[startSample + i] || 0;
    }
    
    return {
      data: visibleData,
      startSample,
      endSample,
      cleanup: () => returnFloat32Array(visibleData)
    };
  }, [audioData, viewportStart, viewportEnd, getFloat32Array, returnFloat32Array]);
  
  // Render waveform when visible data changes
  useEffect(() => {
    if (!visibleSamples || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    canvas.width = containerWidth;
    canvas.height = containerHeight;
    
    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = `waveform_${Date.now()}`;
    }
    
    renderWaveform(offscreenCanvasRef.current, visibleSamples.data, {
      width: containerWidth,
      height: containerHeight,
      style: 'filled',
      color: '#4A90E2',
      onComplete: () => {
        // Transfer rendered content to visible canvas
        // This would be handled by the canvas optimization system
      }
    });
    
    return () => {
      if (visibleSamples.cleanup) {
        visibleSamples.cleanup();
      }
    };
  }, [visibleSamples, containerWidth, containerHeight, renderWaveform]);
  
  const zoom = useCallback((factor, centerPoint = 0.5) => {
    const currentRange = viewportEnd - viewportStart;
    const newRange = currentRange / factor;
    
    // Clamp new range
    const clampedRange = Math.max(0.001, Math.min(1, newRange));
    
    // Calculate new viewport centered on the center point
    const center = viewportStart + currentRange * centerPoint;
    const newStart = Math.max(0, center - clampedRange / 2);
    const newEnd = Math.min(1, newStart + clampedRange);
    
    setViewportStart(newStart);
    setViewportEnd(newEnd);
    setZoomLevel(prev => prev * factor);
  }, [viewportStart, viewportEnd]);
  
  const pan = useCallback((delta) => {
    const currentRange = viewportEnd - viewportStart;
    const newStart = Math.max(0, Math.min(1 - currentRange, viewportStart + delta));
    const newEnd = newStart + currentRange;
    
    setViewportStart(newStart);
    setViewportEnd(newEnd);
  }, [viewportStart, viewportEnd]);
  
  const resetView = useCallback(() => {
    setViewportStart(0);
    setViewportEnd(1);
    setZoomLevel(1);
  }, []);
  
  return {
    canvasRef,
    zoom,
    pan,
    resetView,
    viewportStart,
    viewportEnd,
    zoomLevel,
    setViewport: (start, end) => {
      setViewportStart(Math.max(0, start));
      setViewportEnd(Math.min(1, end));
    }
  };
}

/**
 * Hook for debounced callbacks with cleanup
 */
export function useOptimizedCallback(callback, delay, deps) {
  const timeoutRef = useRef(null);
  const callbackRef = useRef(callback);
  
  // Update callback ref when dependencies change
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback, ...deps]);
  
  const debouncedCallback = useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      callbackRef.current(...args);
    }, delay);
  }, [delay]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  return debouncedCallback;
}

/**
 * Hook for throttled callbacks
 */
export function useThrottledCallback(callback, delay, deps) {
  const lastCallRef = useRef(0);
  const callbackRef = useRef(callback);
  
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback, ...deps]);
  
  return useCallback((...args) => {
    const now = Date.now();
    if (now - lastCallRef.current >= delay) {
      lastCallRef.current = now;
      callbackRef.current(...args);
    }
  }, [delay]);
}

/**
 * Hook for optimized animation frames
 */
export function useAnimationFrame(callback, isActive = true) {
  const requestRef = useRef();
  const callbackRef = useRef(callback);
  
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  const animate = useCallback(() => {
    callbackRef.current();
    if (isActive) {
      requestRef.current = requestAnimationFrame(animate);
    }
  }, [isActive]);
  
  useEffect(() => {
    if (isActive) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    }
    
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isActive, animate]);
}

/**
 * Hook for memory usage monitoring
 */
export function useMemoryMonitor() {
  const [memoryInfo, setMemoryInfo] = useState(null);
  const [isSupported, setIsSupported] = useState(false);
  
  useEffect(() => {
    const hasPerformance = typeof performance !== "undefined";
    const supportsMemory = hasPerformance && "memory" in performance;
    setIsSupported(supportsMemory);
    
    if (!supportsMemory) return;
    
    const updateMemoryInfo = () => {
      if ("memory" in performance) {
        const mem = performance.memory;
        setMemoryInfo({
          used: mem.usedJSHeapSize,
          total: mem.totalJSHeapSize,
          limit: mem.jsHeapSizeLimit,
          usedMB: mem.usedJSHeapSize / 1024 / 1024,
          totalMB: mem.totalJSHeapSize / 1024 / 1024,
          limitMB: mem.jsHeapSizeLimit / 1024 / 1024,
          usage: (mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100
        });
      }
    };
    
    updateMemoryInfo();
    const interval = setInterval(updateMemoryInfo, 2000);
    
    return () => clearInterval(interval);
  }, [isSupported]);
  
  return {
    memoryInfo,
    isSupported
  };
}