/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: CanvasOptimization.js
 * Purpose: TODO â€“ describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
/**
 * High-Performance Canvas Renderer
 * 
 * Optimized canvas rendering system using OffscreenCanvas and Web Workers
 * for improved waveform visualization performance
 */

class OffscreenCanvasRenderer {
  constructor() {
    this.workers = new Map();
    this.offscreenCanvases = new Map();
    this.renderQueue = [];
    this.isProcessing = false;
    this.maxWorkers = (typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : null) || 4;
    this.workerPool = [];
    
    this.initializeWorkerPool();
  }

  /**
   * Initialize web worker pool for parallel rendering
   */
  initializeWorkerPool() {
    for (let i = 0; i < this.maxWorkers; i++) {
      this.createRenderWorker();
    }
  }

  /**
   * Create a dedicated render worker
   */
  createRenderWorker() {
    const workerCode = `
      let offscreenCanvas = null;
      let ctx = null;

      self.onmessage = function(e) {
        const { type, data } = e.data;
        
        switch(type) {
          case 'init':
            offscreenCanvas = data.canvas;
            ctx = offscreenCanvas.getContext('2d');
            self.postMessage({ type: 'ready' });
            break;
            
          case 'renderWaveform':
            renderWaveform(data);
            break;
            
          case 'renderSpectrum':
            renderSpectrum(data);
            break;
        }
      };

      function renderWaveform({ audioData, width, height, color, style }) {
        if (!ctx) return;
        
        ctx.clearRect(0, 0, width, height);
        
        const samplesPerPixel = audioData.length / width;
        const centerY = height / 2;
        
        ctx.strokeStyle = color || '#4A90E2';
        ctx.lineWidth = 1;
        ctx.beginPath();
        
        if (style === 'filled') {
          // Filled waveform rendering
          ctx.fillStyle = color || '#4A90E2';
          
          for (let x = 0; x < width; x++) {
            const start = Math.floor(x * samplesPerPixel);
            const end = Math.floor((x + 1) * samplesPerPixel);
            
            let min = 1, max = -1;
            for (let i = start; i < end && i < audioData.length; i++) {
              const sample = audioData[i];
              if (sample < min) min = sample;
              if (sample > max) max = sample;
            }
            
            const minY = centerY + (min * centerY);
            const maxY = centerY + (max * centerY);
            
            ctx.fillRect(x, Math.min(minY, maxY), 1, Math.abs(maxY - minY) || 1);
          }
        } else {
          // Line waveform rendering
          for (let x = 0; x < width; x++) {
            const sampleIndex = Math.floor(x * samplesPerPixel);
            const sample = audioData[sampleIndex] || 0;
            const y = centerY + (sample * centerY);
            
            if (x === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
          ctx.stroke();
        }
        
        self.postMessage({ 
          type: 'renderComplete',
          taskId: arguments[0].taskId
        });
      }

      function renderSpectrum({ frequencyData, width, height, colorGradient }) {
        if (!ctx) return;
        
        ctx.clearRect(0, 0, width, height);
        
        const barWidth = width / frequencyData.length;
        
        for (let i = 0; i < frequencyData.length; i++) {
          const magnitude = frequencyData[i] / 255;
          const barHeight = magnitude * height;
          
          // Create gradient based on frequency
          const hue = (i / frequencyData.length) * 240; // Blue to red
          ctx.fillStyle = \`hsl(\${hue}, 70%, \${magnitude * 70 + 30}%)\`;
          
          ctx.fillRect(i * barWidth, height - barHeight, barWidth, barHeight);
        }
        
        self.postMessage({ 
          type: 'renderComplete',
          taskId: arguments[0].taskId
        });
      }
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const worker = new Worker(URL.createObjectURL(blob));
    
    worker.isReady = false;
    worker.isBusy = false;
    
    worker.onmessage = (e) => {
      const { type, taskId } = e.data;
      
      if (type === 'ready') {
        worker.isReady = true;
      } else if (type === 'renderComplete') {
        worker.isBusy = false;
        this.onRenderComplete(taskId);
      }
    };
    
    this.workerPool.push(worker);
    return worker;
  }

  /**
   * Get available worker from pool
   */
  getAvailableWorker() {
    return this.workerPool.find(worker => worker.isReady && !worker.isBusy);
  }

  /**
   * Create optimized offscreen canvas
   */
  createOffscreenCanvas(width, height, id) {
    let offscreenCanvas;
    
    if (typeof OffscreenCanvas !== 'undefined') {
      offscreenCanvas = new OffscreenCanvas(width, height);
    } else if (typeof document !== 'undefined') {
      // Fallback for browsers without OffscreenCanvas
      offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = width;
      offscreenCanvas.height = height;
    } else {
      return null;
    }
    
    this.offscreenCanvases.set(id, offscreenCanvas);
    
    // Initialize worker with canvas
    const worker = this.getAvailableWorker();
    if (worker && typeof OffscreenCanvas !== 'undefined') {
      const transferable = offscreenCanvas.transferControlToOffscreen 
        ? offscreenCanvas.transferControlToOffscreen()
        : offscreenCanvas;
        
      worker.postMessage({
        type: 'init',
        data: { canvas: transferable }
      }, typeof OffscreenCanvas !== 'undefined' ? [transferable] : []);
    }
    
    return offscreenCanvas;
  }

  /**
   * Render waveform with high performance
   */
  renderWaveform(canvasId, audioData, options = {}) {
    const taskId = `waveform_${Date.now()}_${Math.random()}`;
    
    const renderTask = {
      id: taskId,
      type: 'renderWaveform',
      canvasId,
      data: {
        taskId,
        audioData,
        width: options.width || 800,
        height: options.height || 200,
        color: options.color || '#4A90E2',
        style: options.style || 'line'
      },
      callback: options.onComplete
    };
    
    this.addToRenderQueue(renderTask);
    return taskId;
  }

  /**
   * Render spectrum analyzer
   */
  renderSpectrum(canvasId, frequencyData, options = {}) {
    const taskId = `spectrum_${Date.now()}_${Math.random()}`;
    
    const renderTask = {
      id: taskId,
      type: 'renderSpectrum',
      canvasId,
      data: {
        taskId,
        frequencyData,
        width: options.width || 800,
        height: options.height || 200,
        colorGradient: options.colorGradient || true
      },
      callback: options.onComplete
    };
    
    this.addToRenderQueue(renderTask);
    return taskId;
  }

  /**
   * Add task to render queue
   */
  addToRenderQueue(task) {
    this.renderQueue.push(task);
    this.processRenderQueue();
  }

  /**
   * Process render queue with available workers
   */
  processRenderQueue() {
    if (this.isProcessing || this.renderQueue.length === 0) return;
    
    this.isProcessing = true;
    
    while (this.renderQueue.length > 0) {
      const worker = this.getAvailableWorker();
      if (!worker) break;
      
      const task = this.renderQueue.shift();
      worker.isBusy = true;
      
      // Store task for completion callback
      worker.currentTask = task;
      
      worker.postMessage({
        type: task.type,
        data: task.data
      });
    }
    
    this.isProcessing = false;
  }

  /**
   * Handle render completion
   */
  onRenderComplete(taskId) {
    const worker = this.workerPool.find(w => w.currentTask?.id === taskId);
    if (worker?.currentTask?.callback) {
      worker.currentTask.callback(taskId);
    }
    
    // Continue processing queue
    setTimeout(() => this.processRenderQueue(), 0);
  }

  /**
   * Transfer rendered content to visible canvas
   */
  transferToCanvas(offscreenCanvasId, targetCanvas) {
    const offscreenCanvas = this.offscreenCanvases.get(offscreenCanvasId);
    if (!offscreenCanvas || !targetCanvas) return;
    
    const ctx = targetCanvas.getContext('2d');
    ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
    
    if (typeof OffscreenCanvas !== 'undefined' && offscreenCanvas instanceof OffscreenCanvas) {
      // Use ImageBitmap for efficient transfer
      createImageBitmap(offscreenCanvas).then(bitmap => {
        ctx.drawImage(bitmap, 0, 0);
        bitmap.close();
      });
    } else {
      // Direct canvas copy
      ctx.drawImage(offscreenCanvas, 0, 0);
    }
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.workerPool.forEach(worker => {
      worker.terminate();
    });
    this.workerPool = [];
    this.offscreenCanvases.clear();
    this.renderQueue = [];
  }
}

/**
 * Memory Pool for audio buffers
 */
class AudioBufferPool {
  constructor() {
    this.pools = new Map(); // channelCount -> Map(length -> Buffer[])
    this.maxPoolSize = 10;
    this.totalAllocated = 0;
    this.maxMemory = 100 * 1024 * 1024; // 100MB limit
  }

  /**
   * Get buffer from pool or create new one
   */
  getBuffer(channels, length, sampleRate) {
    const key = `${channels}_${length}`;
    
    if (!this.pools.has(channels)) {
      this.pools.set(channels, new Map());
    }
    
    const channelPool = this.pools.get(channels);
    
    if (!channelPool.has(length)) {
      channelPool.set(length, []);
    }
    
    const bufferPool = channelPool.get(length);
    
    if (bufferPool.length > 0) {
      return bufferPool.pop();
    }
    
    // Check memory limit
    const bufferSize = channels * length * 4; // 4 bytes per float32
    if (this.totalAllocated + bufferSize > this.maxMemory) {
      this.cleanup();
    }
    
    // Create new buffer
    const buffer = new AudioBuffer({
      numberOfChannels: channels,
      length: length,
      sampleRate: sampleRate
    });
    
    this.totalAllocated += bufferSize;
    return buffer;
  }

  /**
   * Return buffer to pool
   */
  returnBuffer(buffer) {
    const channels = buffer.numberOfChannels;
    const length = buffer.length;
    
    if (!this.pools.has(channels)) {
      this.pools.set(channels, new Map());
    }
    
    const channelPool = this.pools.get(channels);
    
    if (!channelPool.has(length)) {
      channelPool.set(length, []);
    }
    
    const bufferPool = channelPool.get(length);
    
    if (bufferPool.length < this.maxPoolSize) {
      // Clear buffer data
      for (let i = 0; i < channels; i++) {
        buffer.getChannelData(i).fill(0);
      }
      
      bufferPool.push(buffer);
    }
  }

  /**
   * Cleanup least recently used buffers
   */
  cleanup() {
    let freed = 0;
    
    for (const [channels, channelPool] of this.pools) {
      for (const [length, bufferPool] of channelPool) {
        const toRemove = Math.ceil(bufferPool.length / 2);
        const removed = bufferPool.splice(0, toRemove);
        freed += removed.length * channels * length * 4;
      }
    }
    
    this.totalAllocated -= freed;
    console.log(`AudioBufferPool: Freed ${(freed / 1024 / 1024).toFixed(2)}MB`);
  }

  /**
   * Get memory usage stats
   */
  getStats() {
    let totalBuffers = 0;
    
    for (const [channels, channelPool] of this.pools) {
      for (const [length, bufferPool] of channelPool) {
        totalBuffers += bufferPool.length;
      }
    }
    
    return {
      totalBuffers,
      totalMemory: this.totalAllocated,
      utilization: this.totalAllocated / this.maxMemory
    };
  }
}

// Create global instances
const globalCanvasRenderer = new OffscreenCanvasRenderer();
const globalBufferPool = new AudioBufferPool();

export { 
  OffscreenCanvasRenderer, 
  AudioBufferPool, 
  globalCanvasRenderer, 
  globalBufferPool 
};
