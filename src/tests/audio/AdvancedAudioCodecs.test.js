/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: AdvancedAudioCodecs.test.js
 * Purpose: TODO â€“ describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
/**
 * Advanced Audio Codecs Tests
 * Comprehensive tests for AIFF, BWF, and DSD format support
 */

import { AdvancedAudioCodecs, AIFFCodec, BWFCodec, DSDCodec } from '../../audio/AdvancedAudioCodecs';

describe('Advanced Audio Codecs', () => {
  let testAudioBuffer;

  beforeEach(() => {
    testAudioBuffer = {
      numberOfChannels: 2,
      length: 256, // Reduced from 1024 for memory efficiency
      sampleRate: 44100,
      getChannelData: jest.fn((channel) => {
        const data = new Float32Array(256); // Reduced size
        // Generate test pattern
        for (let i = 0; i < 256; i++) {
          data[i] = Math.sin(2 * Math.PI * 440 * i / 44100) * 0.5;
        }
        return data;
      })
    };
  });

  describe('Format Detection', () => {
    test('should detect format by file extension', () => {
      expect(AdvancedAudioCodecs.detectFormat('test.wav')).toBe('WAV');
      expect(AdvancedAudioCodecs.detectFormat('test.aiff')).toBe('AIFF');
      expect(AdvancedAudioCodecs.detectFormat('test.aif')).toBe('AIFF');
      expect(AdvancedAudioCodecs.detectFormat('test.dsf')).toBe('DSD');
      expect(AdvancedAudioCodecs.detectFormat('test.dff')).toBe('DSD');
      expect(AdvancedAudioCodecs.detectFormat('test.mp3')).toBe('MP3');
      expect(AdvancedAudioCodecs.detectFormat('test.flac')).toBe('FLAC');
    });

    test('should detect BWF from buffer content', () => {
      const bwfBuffer = new ArrayBuffer(1000);
      const view = new DataView(bwfBuffer);
      
      // Write RIFF header
      'RIFF'.split('').forEach((char, i) => view.setUint8(i, char.charCodeAt(0)));
      
      // Write bext chunk at position 100
      'bext'.split('').forEach((char, i) => view.setUint8(100 + i, char.charCodeAt(0)));
      
      const format = AdvancedAudioCodecs.detectFormat('test.wav', bwfBuffer);
      expect(format).toBe('BWF');
    });

    test('should detect DSD by header', () => {
      const dsdiffBuffer = new ArrayBuffer(12);
      const view = new DataView(dsdiffBuffer);
      'FRM8'.split('').forEach((char, i) => view.setUint8(i, char.charCodeAt(0)));
      
      expect(AdvancedAudioCodecs.detectFormat('unknown', dsdiffBuffer)).toBe('DSD');
      
      const dsfBuffer = new ArrayBuffer(12);
      const dsfView = new DataView(dsfBuffer);
      'DSD '.split('').forEach((char, i) => dsfView.setUint8(i, char.charCodeAt(0)));
      
      expect(AdvancedAudioCodecs.detectFormat('unknown', dsfBuffer)).toBe('DSD');
    });

    test('should return UNKNOWN for unsupported formats', () => {
      expect(AdvancedAudioCodecs.detectFormat('test.xyz')).toBe('UNKNOWN');
      
      const unknownBuffer = new ArrayBuffer(12);
      expect(AdvancedAudioCodecs.detectFormat('unknown', unknownBuffer)).toBe('UNKNOWN');
    });
  });

  describe('Supported Extensions', () => {
    test('should return all supported extensions', () => {
      const extensions = AdvancedAudioCodecs.getSupportedExtensions();
      
      expect(Array.isArray(extensions)).toBe(true);
      expect(extensions).toContain('.wav');
      expect(extensions).toContain('.aiff');
      expect(extensions).toContain('.aif');
      expect(extensions).toContain('.dsf');
      expect(extensions).toContain('.dff');
      expect(extensions).toContain('.mp3');
      expect(extensions).toContain('.flac');
      expect(extensions).toContain('.ogg');
    });

    test('should not contain duplicates', () => {
      const extensions = AdvancedAudioCodecs.getSupportedExtensions();
      const unique = [...new Set(extensions)];
      expect(extensions.length).toBe(unique.length);
    });
  });

  describe('Audio Export', () => {
    test('should export WAV format', () => {
      const wavBlob = AdvancedAudioCodecs.exportAudio(testAudioBuffer, 'WAV');
      expect(wavBlob).toBeInstanceOf(Blob);
      expect(wavBlob.type).toBe('audio/wav');
    });

    test('should export AIFF format', () => {
      const aiffBlob = AdvancedAudioCodecs.exportAudio(testAudioBuffer, 'AIFF');
      expect(aiffBlob).toBeInstanceOf(Blob);
      expect(aiffBlob.type).toBe('audio/aiff');
    });

    test('should export BWF format with metadata', () => {
      const metadata = {
        description: 'Test BWF export',
        originator: 'Test Suite',
        loudnessValue: -2300
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
});

describe('AIFF Codec', () => {
  let testAudioBuffer;

  beforeEach(() => {
    testAudioBuffer = {
      numberOfChannels: 2,
      length: 1000,
      sampleRate: 44100,
      getChannelData: jest.fn(() => new Float32Array(1000).fill(0.5))
    };
  });

  describe('AIFF Generation', () => {
    test('should generate valid AIFF file', () => {
      const aiffBlob = AIFFCodec.generateAIFF(testAudioBuffer);
      
      expect(aiffBlob).toBeInstanceOf(Blob);
      expect(aiffBlob.type).toBe('audio/aiff');
      expect(aiffBlob.size).toBeGreaterThan(100); // Should contain header + data
    });

    test('should support different bit depths', () => {
      const aiff16 = AIFFCodec.generateAIFF(testAudioBuffer, { bitDepth: 16 });
      const aiff24 = AIFFCodec.generateAIFF(testAudioBuffer, { bitDepth: 24 });
      const aiff32 = AIFFCodec.generateAIFF(testAudioBuffer, { bitDepth: 32 });
      
      expect(aiff16.size).toBeLessThan(aiff24.size);
      expect(aiff24.size).toBeLessThan(aiff32.size);
    });

    test('should handle custom sample rate', () => {
      const customRate = AIFFCodec.generateAIFF(testAudioBuffer, { sampleRate: 48000 });
      expect(customRate).toBeInstanceOf(Blob);
    });

    test('should handle mono audio', () => {
      const monoBuffer = {
        ...testAudioBuffer,
        numberOfChannels: 1
      };
      
      const monoAiff = AIFFCodec.generateAIFF(monoBuffer);
      expect(monoAiff).toBeInstanceOf(Blob);
      expect(monoAiff.size).toBeLessThan(AIFFCodec.generateAIFF(testAudioBuffer).size);
    });
  });

  describe('AIFF Parsing', () => {
    test('should parse AIFF metadata', () => {
      // Create mock AIFF header
      const aiffBuffer = new ArrayBuffer(100);
      const view = new DataView(aiffBuffer);
      
      // FORM header
      'FORM'.split('').forEach((char, i) => view.setUint8(i, char.charCodeAt(0)));
      view.setUint32(4, 92, false); // Size
      'AIFF'.split('').forEach((char, i) => view.setUint8(8 + i, char.charCodeAt(0)));
      
      // COMM chunk
      'COMM'.split('').forEach((char, i) => view.setUint8(12 + i, char.charCodeAt(0)));
      view.setUint32(16, 18, false); // Chunk size
      view.setUint16(20, 2, false); // Channels
      view.setUint32(22, 1000, false); // Frames
      view.setUint16(26, 16, false); // Bit depth
      
      const metadata = AIFFCodec.parseAIFF(aiffBuffer);
      expect(metadata.channels).toBe(2);
      expect(metadata.frames).toBe(1000);
      expect(metadata.bitDepth).toBe(16);
    });

    test('should throw error for invalid AIFF', () => {
      const invalidBuffer = new ArrayBuffer(100);
      const view = new DataView(invalidBuffer);
      'NOTF'.split('').forEach((char, i) => view.setUint8(i, char.charCodeAt(0)));
      
      expect(() => AIFFCodec.parseAIFF(invalidBuffer)).toThrow('Not a valid AIFF file');
    });
  });
});

describe('BWF Codec', () => {
  let testAudioBuffer;
  let testMetadata;

  beforeEach(() => {
    testAudioBuffer = {
      numberOfChannels: 2,
      length: 1000,
      sampleRate: 44100,
      getChannelData: jest.fn(() => new Float32Array(1000).fill(0.5))
    };

    testMetadata = {
      description: 'Test BWF file',
      originator: 'Test System',
      originatorReference: 'TEST001',
      loudnessValue: -2300,
      loudnessRange: 500,
      maxTruePeakLevel: -100
    };
  });

  describe('BWF Generation', () => {
    test('should generate BWF with broadcast metadata', () => {
      const bwfBlob = BWFCodec.generateBWF(testAudioBuffer, testMetadata);
      
      expect(bwfBlob).toBeInstanceOf(Blob);
      expect(bwfBlob.type).toBe('audio/wav');
      expect(bwfBlob.size).toBeGreaterThan(1000); // Should be larger due to metadata
    });

    test('should handle empty metadata', () => {
      const bwfBlob = BWFCodec.generateBWF(testAudioBuffer, {});
      expect(bwfBlob).toBeInstanceOf(Blob);
    });

    test('should support different bit depths', () => {
      const bwf16 = BWFCodec.generateBWF(testAudioBuffer, testMetadata, { bitDepth: 16 });
      const bwf24 = BWFCodec.generateBWF(testAudioBuffer, testMetadata, { bitDepth: 24 });
      const bwf32 = BWFCodec.generateBWF(testAudioBuffer, testMetadata, { bitDepth: 32 });
      
      expect(bwf16.size).toBeLessThan(bwf24.size);
      expect(bwf24.size).toBeLessThan(bwf32.size);
    });

    test('should include time reference', () => {
      const metadataWithTime = {
        ...testMetadata,
        timeReference: 123456789
      };
      
      const bwfBlob = BWFCodec.generateBWF(testAudioBuffer, metadataWithTime);
      expect(bwfBlob).toBeInstanceOf(Blob);
    });
  });

  describe('Date/Time Functions', () => {
    test('should generate current date', () => {
      const date = BWFCodec.getCurrentDate();
      expect(date).toMatch(/^\d{8}$/); // YYYYMMDD format
    });

    test('should generate current time', () => {
      const time = BWFCodec.getCurrentTime();
      expect(time).toMatch(/^\d{6}$/); // HHMMSS format
    });
  });
});

describe('DSD Codec', () => {
  describe('Format Detection', () => {
    test('should detect DSDIFF format', () => {
      const dsdiffBuffer = new ArrayBuffer(100);
      const view = new DataView(dsdiffBuffer);
      
      'FRM8'.split('').forEach((char, i) => view.setUint8(i, char.charCodeAt(0)));
      view.setBigUint64(4, BigInt(92), false);
      'DSD '.split('').forEach((char, i) => view.setUint8(12 + i, char.charCodeAt(0)));
      
      const metadata = DSDCodec.parseDSDIFF(dsdiffBuffer);
      expect(metadata.format).toBe('DSDIFF');
      expect(metadata.sampleRate).toBe(2822400);
      expect(metadata.channels).toBe(2);
      expect(metadata.bitDepth).toBe(1);
    });

    test('should detect DSF format', () => {
      const dsfBuffer = new ArrayBuffer(100);
      const view = new DataView(dsfBuffer);
      
      'DSD '.split('').forEach((char, i) => view.setUint8(i, char.charCodeAt(0)));
      view.setUint32(4, 28, true); // Header size
      view.setBigUint64(8, BigInt(1000), true); // Total size
      view.setBigUint64(16, BigInt(0), true); // Metadata offset
      
      'fmt '.split('').forEach((char, i) => view.setUint8(24 + i, char.charCodeAt(0)));
      view.setUint32(28, 52, true); // fmt size
      view.setUint32(32, 1, true); // Format version
      view.setUint32(36, 0, true); // Format ID
      view.setUint32(40, 2, true); // Channel type
      view.setUint32(44, 2, true); // Channel count
      view.setUint32(48, 2822400, true); // Sampling frequency
      view.setUint32(52, 1, true); // Bits per sample
      view.setBigUint64(56, BigInt(1000000), true); // Sample count
      view.setUint32(64, 4096, true); // Block size
      
      const metadata = DSDCodec.parseDSF(dsfBuffer);
      expect(metadata.format).toBe('DSF');
      expect(metadata.sampleRate).toBe(2822400);
      expect(metadata.channels).toBe(2);
      expect(metadata.bitDepth).toBe(1);
    });

    test('should handle invalid DSD format', () => {
      const invalidBuffer = new ArrayBuffer(100);
      const view = new DataView(invalidBuffer);
      'NOTD'.split('').forEach((char, i) => view.setUint8(i, char.charCodeAt(0)));
      
      expect(() => DSDCodec.parseDSD(invalidBuffer)).toThrow('Unsupported DSD format');
    });
  });

  describe('DSD to PCM Conversion', () => {
    test('should convert DSD to PCM format', async () => {
      const dsdMetadata = {
        sampleRate: 2822400,
        channels: 2,
        sampleCount: 2822400, // 1 second
        bitDepth: 1
      };
      
      const dsdData = new ArrayBuffer(dsdMetadata.sampleCount * dsdMetadata.channels / 8);
      const audioBuffer = await DSDCodec.convertDSDToPCM(dsdData, dsdMetadata);
      
      expect(audioBuffer.numberOfChannels).toBe(2);
      expect(audioBuffer.sampleRate).toBe(44100); // Downsampled
      expect(audioBuffer.length).toBeGreaterThan(0);
    });

    test('should handle different channel configurations', async () => {
      const monoMetadata = {
        sampleRate: 2822400,
        channels: 1,
        sampleCount: 1000000,
        bitDepth: 1
      };
      
      const dsdData = new ArrayBuffer(1000000 / 8);
      const audioBuffer = await DSDCodec.convertDSDToPCM(dsdData, monoMetadata);
      
      expect(audioBuffer.numberOfChannels).toBe(1);
    });
  });
});

describe('Integration Tests', () => {
  test('should handle complete workflow for all formats', () => {
    const testBuffer = {
      numberOfChannels: 2,
      length: 1000,
      sampleRate: 44100,
      getChannelData: jest.fn(() => new Float32Array(1000).fill(0.5))
    };

    // Test WAV export
    const wavBlob = AdvancedAudioCodecs.exportAudio(testBuffer, 'WAV');
    expect(wavBlob).toBeInstanceOf(Blob);

    // Test AIFF export
    const aiffBlob = AdvancedAudioCodecs.exportAudio(testBuffer, 'AIFF');
    expect(aiffBlob).toBeInstanceOf(Blob);

    // Test BWF export with metadata
    const bwfBlob = AdvancedAudioCodecs.exportAudio(testBuffer, 'BWF', {
      metadata: { description: 'Integration test' }
    });
    expect(bwfBlob).toBeInstanceOf(Blob);

    // Verify different file sizes
    expect(aiffBlob.size).not.toBe(wavBlob.size);
    expect(bwfBlob.size).toBeGreaterThan(wavBlob.size);
  });

  test('should parse metadata for supported formats', () => {
    // Test WAV detection
    const wavBuffer = new ArrayBuffer(100);
    const wavView = new DataView(wavBuffer);
    'RIFF'.split('').forEach((char, i) => wavView.setUint8(i, char.charCodeAt(0)));
    
    const wavMetadata = AdvancedAudioCodecs.parseAudioFile(wavBuffer, 'test.wav');
    expect(wavMetadata.format).toBe('WAV');

    // Test AIFF detection
    const aiffBuffer = new ArrayBuffer(100);
    const aiffView = new DataView(aiffBuffer);
    'FORM'.split('').forEach((char, i) => aiffView.setUint8(i, char.charCodeAt(0)));
    aiffView.setUint32(4, 92, false);
    'AIFF'.split('').forEach((char, i) => aiffView.setUint8(8 + i, char.charCodeAt(0)));
    
    const aiffMetadata = AdvancedAudioCodecs.parseAudioFile(aiffBuffer, 'test.aiff');
    expect(aiffMetadata.format).toBe('AIFF');
  });

  test('should handle errors gracefully', () => {
    const corruptBuffer = new ArrayBuffer(10);
    
    expect(() => {
      AdvancedAudioCodecs.parseAudioFile(corruptBuffer, 'test.unknown');
    }).not.toThrow();
    
    const result = AdvancedAudioCodecs.parseAudioFile(corruptBuffer, 'test.unknown');
    expect(result.format).toBe('UNKNOWN');
    expect(result.error).toBeDefined();
  });
});
