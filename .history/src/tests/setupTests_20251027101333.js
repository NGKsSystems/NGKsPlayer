import '@testing-library/jest-dom';

// Mock Web Audio API
global.AudioContext = class {
  constructor() {
    this.currentTime = 0;
    this.sampleRate = 44100;
    this.destination = {};
  }
  
  createBuffer(channels, length, sampleRate) {
    return {
      numberOfChannels: channels,
      length: length,
      sampleRate: sampleRate,
      getChannelData: (channel) => new Float32Array(length)
    };
  }
  
  createGain() {
    return {
      gain: { value: 1 },
      connect: jest.fn(),
      disconnect: jest.fn()
    };
  }
  
  createBufferSource() {
    return {
      buffer: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn()
    };
  }
  
  createAnalyser() {
    return {
      fftSize: 2048,
      frequencyBinCount: 1024,
      getFloatFrequencyData: jest.fn(),
      getByteTimeDomainData: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn()
    };
  }
  
  decodeAudioData() {
    return Promise.resolve({
      numberOfChannels: 2,
      length: 44100,
      sampleRate: 44100,
      getChannelData: () => new Float32Array(44100)
    });
  }
};

global.webkitAudioContext = global.AudioContext;

// Mock File API
global.File = class {
  constructor(parts, filename, properties = {}) {
    this.name = filename;
    this.size = parts.join('').length;
    this.type = properties.type || '';
  }
};

global.FileReader = class {
  readAsArrayBuffer() {
    setTimeout(() => {
      this.result = new ArrayBuffer(1024);
      if (this.onload) this.onload();
    }, 0);
  }
  
  readAsDataURL() {
    setTimeout(() => {
      this.result = 'data:audio/wav;base64,UklGRiQAAABXQVZF';
      if (this.onload) this.onload();
    }, 0);
  }
};

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = jest.fn();

// Mock Canvas API
HTMLCanvasElement.prototype.getContext = jest.fn((type) => {
  if (type === '2d') {
    return {
      fillRect: jest.fn(),
      clearRect: jest.fn(),
      getImageData: jest.fn(),
      putImageData: jest.fn(),
      createImageData: jest.fn(),
      setTransform: jest.fn(),
      drawImage: jest.fn(),
      save: jest.fn(),
      fillText: jest.fn(),
      restore: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      closePath: jest.fn(),
      stroke: jest.fn(),
      translate: jest.fn(),
      scale: jest.fn(),
      rotate: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn(),
      measureText: jest.fn(() => ({ width: 100 })),
      transform: jest.fn(),
      rect: jest.fn(),
      clip: jest.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      font: '10px Arial',
      textAlign: 'left',
      textBaseline: 'top',
      globalAlpha: 1,
      globalCompositeOperation: 'source-over'
    };
  }
  return null;
});

// Mock MIDI API
global.navigator.requestMIDIAccess = jest.fn(() => 
  Promise.resolve({
    inputs: new Map(),
    outputs: new Map(),
    onstatechange: null
  })
);

// Mock Intersection Observer
global.IntersectionObserver = class {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock ResizeObserver
global.ResizeObserver = class {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
};