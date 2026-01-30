// Debug BWF buffer allocation
import { BWFCodec } from '../../audio/AdvancedAudioCodecs.js';

describe('BWF Debug', () => {
  test('should debug BWF buffer allocation', () => {
    // Create minimal audio buffer - even smaller
    const mockAudioBuffer = {
      sampleRate: 48000,
      numberOfChannels: 1,
      length: 5, // Extremely small
      getChannelData: (channel) => new Float32Array(5).fill(0.1)
    };

    console.log('Audio buffer:', {
      sampleRate: mockAudioBuffer.sampleRate,
      channels: mockAudioBuffer.numberOfChannels,
      length: mockAudioBuffer.length,
      channelData: mockAudioBuffer.getChannelData(0)
    });

    // Calculate expected sizes manually
    const bitDepth = 16;
    const numberOfChannels = 1;
    const numberOfSamples = 5;
    const bytesPerSample = bitDepth / 8; // 2
    const dataLength = numberOfSamples * numberOfChannels * bytesPerSample; // 5 * 1 * 2 = 10

    console.log('Data calculations:', {
      bitDepth,
      numberOfChannels,
      numberOfSamples,
      bytesPerSample,
      dataLength
    });

    // BWF structure sizes
    const bextDataSize = 602;
    const riffHeaderSize = 12;
    const bextChunkHeaderSize = 8;
    const fmtChunkSize = 24;
    const dataChunkHeaderSize = 8;
    
    const totalSize = riffHeaderSize + bextChunkHeaderSize + bextDataSize + fmtChunkSize + dataChunkHeaderSize + dataLength;
    
    console.log('Buffer size calculation:', {
      riffHeaderSize,
      bextChunkHeaderSize,
      bextDataSize,
      fmtChunkSize,
      dataChunkHeaderSize,
      dataLength,
      totalSize
    });

    // Try to generate BWF
    try {
      const result = BWFCodec.generateBWF(mockAudioBuffer, {}, { bitDepth: 16 });
      console.log('BWF generation successful:', result);
      expect(result).toBeDefined();
    } catch (error) {
      console.error('BWF generation failed:', error);
      throw error;
    }
  });
});