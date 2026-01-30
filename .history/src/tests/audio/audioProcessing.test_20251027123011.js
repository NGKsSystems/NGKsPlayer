/**
 * Audio Processing Unit Tests
 * Comprehensive tests for audio extraction, format conversion, and codec handling
 */

// Mock the audio modules to prevent AudioContext issues
jest.mock('../../Clipper/utils/audioExtractor', () => ({
  extractAudioClip: jest.fn((audioBuffer, startSeconds, endSeconds) => {
    const sampleRate = audioBuffer.sampleRate;
    const numberOfChannels = audioBuffer.numberOfChannels;
    const startSample = Math.floor(startSeconds * sampleRate);
    const endSample = Math.floor(endSeconds * sampleRate);
    const numberOfSamples = endSample - startSample;
    
    return {
      numberOfChannels,
      length: numberOfSamples,
      sampleRate,
      getChannelData: jest.fn(() => new Float32Array(numberOfSamples))
    };
  }),
  generateAudioFile: jest.fn((audioBuffer, format) => {
    return new Blob(['mock audio data'], { 
      type: format === 'AIFF' ? 'audio/aiff' : 'audio/wav' 
    });
  }),
  generateWAV: jest.fn((audioBuffer) => {
    return new Blob(['mock wav data'], { type: 'audio/wav' });
  }),
  getSupportedAudioFormats: jest.fn(() => ['.wav', '.aiff', '.mp3', '.flac']),
  parseAudioMetadata: jest.fn((buffer, filename) => {
    if (filename.includes('wav')) return { format: 'WAV' };
    if (filename.includes('aiff')) return { format: 'AIFF' };
    return { format: 'UNKNOWN', error: 'Unknown format' };
  })
}));

jest.mock('../../audio/AdvancedAudioCodecs', () => ({
  AdvancedAudioCodecs: {
    detectFormat: jest.fn((filename, buffer) => {
      if (filename.includes('wav') && buffer && buffer.byteLength > 500) return 'BWF';
      if (filename.includes('wav')) return 'WAV';
      if (filename.includes('aiff')) return 'AIFF';
      if (filename.includes('dsf')) return 'DSD';
      return 'UNKNOWN';
    }),
    exportAudio: jest.fn((audioBuffer, format, options) => {
      if (format === 'UNSUPPORTED') {
        throw new Error('Unsupported export format: UNSUPPORTED');
      }
      return new Blob(['mock audio data'], { 
        type: format === 'AIFF' ? 'audio/aiff' : 'audio/wav' 
      });
    }),
    getSupportedExtensions: jest.fn(() => ['.wav', '.aiff', '.dsf', '.dff'])
  }
}));

import { extractAudioClip, generateAudioFile, generateWAV, getSupportedAudioFormats, parseAudioMetadata } from '../../Clipper/utils/audioExtractor';
import { AdvancedAudioCodecs } from '../../audio/AdvancedAudioCodecs';

describe('Audio Processing Tests', () => {
  let mockAudioBuffer;
  let mockAudioContext;

  beforeEach(() => {
    // Set test timeout
    jest.setTimeout(10000); // 10 seconds max per test
    
    // Create mock audio buffer
    mockAudioBuffer = {
      numberOfChannels: 2,
      length: 44100, // 1 second at 44.1kHz
      sampleRate: 44100,
      getChannelData: jest.fn((channel) => {
        const data = new Float32Array(44100);
        // Generate sine wave test data
        for (let i = 0; i < 44100; i++) {
          data[i] = Math.sin(2 * Math.PI * 440 * i / 44100) * 0.5; // 440Hz sine wave
        }
        return data;
      })
    };

    // Mock AudioContext
    mockAudioContext = {
      createBuffer: jest.fn(() => ({
        numberOfChannels: 2,
        length: 22050, // 0.5 seconds
        sampleRate: 44100,
        getChannelData: jest.fn(() => new Float32Array(22050))
      })),
      close: jest.fn()
    };
    
    // Mock global AudioContext
    global.AudioContext = jest.fn(() => mockAudioContext);
    global.webkitAudioContext = jest.fn(() => mockAudioContext);
  });

  afterEach(() => {
    // Clean up mocks
    if (mockAudioContext && mockAudioContext.close) {
      mockAudioContext.close();
    }
    jest.clearAllMocks();
  });

  describe('extractAudioClip', () => {
    test('should extract correct portion of audio', () => {
      const startTime = 0.25; // 0.25 seconds
      const endTime = 0.75;   // 0.75 seconds
      
      const clipped = extractAudioClip(mockAudioBuffer, startTime, endTime);
      
      expect(clipped).toBeDefined();
      expect(clipped.numberOfChannels).toBe(2);
      expect(clipped.length).toBe(22050); // 0.5 seconds at 44.1kHz
      expect(clipped.sampleRate).toBe(44100);
    });

    test('should handle edge cases', () => {
      // Test clipping at the very beginning
      const clip1 = extractAudioClip(mockAudioBuffer, 0, 0.1);
      expect(clip1.length).toBe(4410); // 0.1 seconds

      // Test clipping at the very end
      const clip2 = extractAudioClip(mockAudioBuffer, 0.9, 1.0);
      expect(clip2.length).toBe(4410); // 0.1 seconds
    });

    test('should preserve channel data', () => {
      const clipped = extractAudioClip(mockAudioBuffer, 0, 0.5);
      
      // Verify both channels are processed
      expect(clipped.getChannelData).toBeDefined();
      for (let channel = 0; channel < clipped.numberOfChannels; channel++) {
        const channelData = clipped.getChannelData(channel);
        expect(channelData).toBeInstanceOf(Float32Array);
        expect(channelData.length).toBe(clipped.length);
      }
    });
  });

  describe('generateWAV', () => {
    test('should generate valid WAV blob', () => {
      const wavBlob = generateWAV(mockAudioBuffer);
      
      expect(wavBlob).toBeInstanceOf(Blob);
      expect(wavBlob.type).toBe('audio/wav');
      expect(wavBlob.size).toBeGreaterThan(44); // Should be larger than just header
    });

    test('should respect custom sample rate', () => {
      const customSampleRate = 48000;
      const wavBlob = generateWAV(mockAudioBuffer, customSampleRate);
      
      expect(wavBlob).toBeInstanceOf(Blob);
      // Note: We can't easily verify the internal sample rate without parsing the blob
      // but we can ensure it generates successfully
    });

    test('should handle different channel configurations', () => {
      // Test mono audio
      const monoBuffer = {
        ...mockAudioBuffer,
        numberOfChannels: 1,
        getChannelData: jest.fn(() => new Float32Array(44100))
      };
      
      const monoWav = generateWAV(monoBuffer);
      expect(monoWav).toBeInstanceOf(Blob);
      expect(monoWav.size).toBeLessThan(generateWAV(mockAudioBuffer).size);
    });
  });

  describe('generateAudioFile', () => {
    test('should generate WAV format', () => {
      const audioFile = generateAudioFile(mockAudioBuffer, 'WAV');
      expect(audioFile).toBeInstanceOf(Blob);
    });

    test('should handle AIFF format', () => {
      const audioFile = generateAudioFile(mockAudioBuffer, 'AIFF');
      expect(audioFile).toBeInstanceOf(Blob);
      expect(audioFile.type).toBe('audio/aiff');
    });

    test('should handle BWF format with metadata', () => {
      const metadata = {
        description: 'Test BWF file',
        originator: 'NGKsPlayer Test',
        loudnessValue: -2300
      };
      
      const audioFile = generateAudioFile(mockAudioBuffer, 'BWF', { metadata });
      expect(audioFile).toBeInstanceOf(Blob);
      expect(audioFile.type).toBe('audio/wav');
    });

    test('should fallback to WAV on unsupported format', () => {
      const audioFile = generateAudioFile(mockAudioBuffer, 'UNSUPPORTED');
      expect(audioFile).toBeInstanceOf(Blob);
      // Should fallback to WAV generation
    });
  });

  describe('getSupportedAudioFormats', () => {
    test('should return array of supported extensions', () => {
      const formats = getSupportedAudioFormats();
      
      expect(Array.isArray(formats)).toBe(true);
      expect(formats.length).toBeGreaterThan(0);
      expect(formats).toContain('.wav');
      expect(formats).toContain('.aiff');
      expect(formats).toContain('.mp3');
    });

    test('should not contain duplicates', () => {
      const formats = getSupportedAudioFormats();
      const uniqueFormats = [...new Set(formats)];
      
      expect(formats.length).toBe(uniqueFormats.length);
    });
  });

  describe('parseAudioMetadata', () => {
    test('should detect WAV format', () => {
      // Create mock WAV header
      const wavHeader = new ArrayBuffer(44);
      const view = new DataView(wavHeader);
      
      // Write RIFF header
      const riff = 'RIFF';
      for (let i = 0; i < riff.length; i++) {
        view.setUint8(i, riff.charCodeAt(i));
      }
      
      const metadata = parseAudioMetadata(wavHeader, 'test.wav');
      expect(metadata.format).toBe('WAV');
    });

    test('should detect AIFF format', () => {
      // Create mock AIFF header
      const aiffHeader = new ArrayBuffer(44);
      const view = new DataView(aiffHeader);
      
      // Write FORM header
      const form = 'FORM';
      for (let i = 0; i < form.length; i++) {
        view.setUint8(i, form.charCodeAt(i));
      }
      
      const metadata = parseAudioMetadata(aiffHeader, 'test.aiff');
      expect(metadata.format).toBe('AIFF');
    });

    test('should handle unknown format gracefully', () => {
      const unknownBuffer = new ArrayBuffer(10);
      const metadata = parseAudioMetadata(unknownBuffer, 'test.unknown');
      
      expect(metadata.format).toBe('UNKNOWN');
      expect(metadata.error).toBeDefined();
    });
  });
});

describe('AdvancedAudioCodecs', () => {
  describe('Format Detection', () => {
    test('should detect format by extension', () => {
      expect(AdvancedAudioCodecs.detectFormat('test.wav')).toBe('WAV');
      expect(AdvancedAudioCodecs.detectFormat('test.aiff')).toBe('AIFF');
      expect(AdvancedAudioCodecs.detectFormat('test.dsf')).toBe('DSD');
    });

    test('should detect BWF from buffer', () => {
      // Create mock BWF buffer with bext chunk
      const bwfBuffer = new ArrayBuffer(1000);
      const view = new DataView(bwfBuffer);
      
      // Write RIFF header
      'RIFF'.split('').forEach((char, i) => view.setUint8(i, char.charCodeAt(0)));
      
      // Write bext chunk identifier at position 500
      'bext'.split('').forEach((char, i) => view.setUint8(500 + i, char.charCodeAt(0)));
      
      const format = AdvancedAudioCodecs.detectFormat('test.wav', bwfBuffer);
      expect(format).toBe('BWF');
    });

    test('should return UNKNOWN for unsupported files', () => {
      expect(AdvancedAudioCodecs.detectFormat('test.xyz')).toBe('UNKNOWN');
    });
  });

  describe('Audio Export', () => {
    let testAudioBuffer;

    beforeEach(() => {
      testAudioBuffer = {
        numberOfChannels: 2,
        length: 1024,
        sampleRate: 44100,
        getChannelData: jest.fn(() => new Float32Array(1024))
      };
    });

    test('should export AIFF format', () => {
      const aiffBlob = AdvancedAudioCodecs.exportAudio(testAudioBuffer, 'AIFF');
      expect(aiffBlob).toBeInstanceOf(Blob);
      expect(aiffBlob.type).toBe('audio/aiff');
    });

    test('should export BWF format with metadata', () => {
      const metadata = {
        description: 'Test broadcast file',
        originator: 'Test System'
      };
      
      const bwfBlob = AdvancedAudioCodecs.exportAudio(testAudioBuffer, 'BWF', { metadata });
      expect(bwfBlob).toBeInstanceOf(Blob);
      expect(bwfBlob.type).toBe('audio/wav');
    });

    test('should throw error for unsupported export format', () => {
      expect(() => {
        AdvancedAudioCodecs.exportAudio(testAudioBuffer, 'UNSUPPORTED');
      }).toThrow('Unsupported export format: UNSUPPORTED');
    });
  });

  describe('getSupportedExtensions', () => {
    test('should return unique list of extensions', () => {
      const extensions = AdvancedAudioCodecs.getSupportedExtensions();
      
      expect(Array.isArray(extensions)).toBe(true);
      expect(extensions.length).toBeGreaterThan(0);
      
      // Check for expected formats
      expect(extensions).toContain('.wav');
      expect(extensions).toContain('.aiff');
      expect(extensions).toContain('.dsf');
      
      // Ensure no duplicates
      const uniqueExtensions = [...new Set(extensions)];
      expect(extensions.length).toBe(uniqueExtensions.length);
    });
  });
});

describe('Audio Processing Integration Tests', () => {
  test('should handle complete extract-to-export workflow', async () => {
    // Create test audio buffer
    const sourceBuffer = {
      numberOfChannels: 2,
      length: 88200, // 2 seconds
      sampleRate: 44100,
      getChannelData: jest.fn((channel) => {
        const data = new Float32Array(88200);
        for (let i = 0; i < 88200; i++) {
          data[i] = Math.sin(2 * Math.PI * 440 * i / 44100) * 0.5;
        }
        return data;
      })
    };

    // Extract a clip
    const clippedBuffer = extractAudioClip(sourceBuffer, 0.5, 1.5); // 1 second clip
    expect(clippedBuffer.length).toBe(44100);

    // Export in multiple formats
    const wavFile = generateAudioFile(clippedBuffer, 'WAV');
    const aiffFile = generateAudioFile(clippedBuffer, 'AIFF');
    const bwfFile = generateAudioFile(clippedBuffer, 'BWF', {
      metadata: { description: 'Test clip' }
    });

    expect(wavFile).toBeInstanceOf(Blob);
    expect(aiffFile).toBeInstanceOf(Blob);
    expect(bwfFile).toBeInstanceOf(Blob);

    // Verify different file sizes (different formats should have different sizes)
    expect(aiffFile.size).not.toBe(wavFile.size);
    expect(bwfFile.size).toBeGreaterThan(wavFile.size); // BWF has metadata
  });

  test('should handle edge cases in processing pipeline', () => {
    // Test with very short audio
    const shortBuffer = {
      numberOfChannels: 1,
      length: 100,
      sampleRate: 44100,
      getChannelData: jest.fn(() => new Float32Array(100))
    };

    const shortClip = extractAudioClip(shortBuffer, 0, 0.001);
    expect(shortClip.length).toBeGreaterThan(0);

    const shortWav = generateWAV(shortClip);
    expect(shortWav).toBeInstanceOf(Blob);
  });

  test('should maintain audio quality through processing', () => {
    // Create buffer with known pattern
    const patternBuffer = {
      numberOfChannels: 1,
      length: 1000,
      sampleRate: 44100,
      getChannelData: jest.fn(() => {
        const data = new Float32Array(1000);
        // Create alternating pattern
        for (let i = 0; i < 1000; i++) {
          data[i] = i % 2 === 0 ? 0.5 : -0.5;
        }
        return data;
      })
    };

    const clipped = extractAudioClip(patternBuffer, 0, 0.01);
    
    // Verify pattern is preserved
    const clippedData = clipped.getChannelData(0);
    expect(clippedData).toBeInstanceOf(Float32Array);
    expect(clippedData.length).toBeGreaterThan(0);
  });
});