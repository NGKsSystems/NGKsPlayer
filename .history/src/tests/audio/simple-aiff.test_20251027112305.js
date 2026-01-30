/**
 * Simple AIFF Codec Test
 * Minimal test to verify the AIFF codec fixes work
 */

import { AIFFCodec } from '../../audio/AdvancedAudioCodecs';

describe('AIFF Codec Simple Test', () => {
  test('should generate AIFF without errors', () => {
    // Create minimal test audio buffer
    const testAudioBuffer = {
      numberOfChannels: 1,
      length: 10, // Very small for testing
      sampleRate: 44100,
      getChannelData: (channel) => {
        const data = new Float32Array(10);
        for (let i = 0; i < 10; i++) {
          data[i] = Math.sin(2 * Math.PI * 440 * i / 44100) * 0.5;
        }
        return data;
      }
    };

    // This should not throw an error
    expect(() => {
      const result = AIFFCodec.generateAIFF(testAudioBuffer, { bitDepth: 16 });
      expect(result).toBeDefined();
      expect(result instanceof Blob).toBe(true);
    }).not.toThrow();
  });
});