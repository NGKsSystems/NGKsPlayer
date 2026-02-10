/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: simplified-codecs.test.js
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
/**
 * Simplified Audio Codecs Tests
 * Memory-efficient tests with minimal data
 */

import { AdvancedAudioCodecs, AIFFCodec, BWFCodec } from '../../audio/AdvancedAudioCodecs';

describe('Audio Codecs - Memory Efficient Tests', () => {
  let smallAudioBuffer;

  beforeEach(() => {
    // Very small buffer to prevent memory issues
    smallAudioBuffer = {
      numberOfChannels: 1,
      length: 10,
      sampleRate: 44100,
      getChannelData: jest.fn((channel) => {
        const data = new Float32Array(10);
        for (let i = 0; i < 10; i++) {
          data[i] = Math.sin(2 * Math.PI * 440 * i / 44100) * 0.1; // Small values
        }
        return data;
      })
    };
  });

  describe('AIFF Codec', () => {
    test('should generate AIFF file without errors', () => {
      expect(() => {
        const result = AIFFCodec.generateAIFF(smallAudioBuffer, { bitDepth: 16 });
        expect(result).toBeDefined();
        expect(result instanceof Blob).toBe(true);
      }).not.toThrow();
    });

    test('should handle different bit depths', () => {
      expect(() => {
        AIFFCodec.generateAIFF(smallAudioBuffer, { bitDepth: 16 });
        AIFFCodec.generateAIFF(smallAudioBuffer, { bitDepth: 24 });
      }).not.toThrow();
    });
  });

  describe('BWF Codec', () => {
    test('should generate BWF file without errors', () => {
      expect(() => {
        const metadata = {
          description: 'Test recording',
          originator: 'NGKsPlayer Pro'
        };
        const result = BWFCodec.generateBWF(smallAudioBuffer, metadata, { bitDepth: 16 });
        expect(result).toBeDefined();
        expect(result instanceof Blob).toBe(true);
      }).not.toThrow();
    });

    test('should handle empty metadata', () => {
      expect(() => {
        const result = BWFCodec.generateBWF(smallAudioBuffer, {}, { bitDepth: 16 });
        expect(result).toBeDefined();
      }).not.toThrow();
    });
  });

  describe('Format Detection', () => {
    test('should detect format by extension', () => {
      expect(AdvancedAudioCodecs.detectFormat('test.aiff')).toBe('AIFF');
      expect(AdvancedAudioCodecs.detectFormat('test.wav')).toBe('WAV');
      expect(AdvancedAudioCodecs.detectFormat('test.mp3')).toBe('MP3');
    });

    test('should return unknown for unsupported formats', () => {
      expect(AdvancedAudioCodecs.detectFormat('test.xyz')).toBe('UNKNOWN');
    });
  });

  describe('Export Functionality', () => {
    test('should export audio in different formats', () => {
      expect(() => {
        AdvancedAudioCodecs.exportAudio(smallAudioBuffer, 'AIFF', { bitDepth: 16 });
        AdvancedAudioCodecs.exportAudio(smallAudioBuffer, 'BWF', { bitDepth: 16 });
      }).not.toThrow();
    });
  });
});
