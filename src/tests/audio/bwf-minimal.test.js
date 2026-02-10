/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: bwf-minimal.test.js
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
// Minimal BWF codec test to identify the exact buffer issue
import { BWFCodec } from '../../audio/AdvancedAudioCodecs.js';

describe('BWF Minimal Debug', () => {
  test('should create minimal BWF with debug output', () => {
    const mockAudioBuffer = {
      sampleRate: 48000,
      numberOfChannels: 1,
      length: 2, // Absolutely minimal
      getChannelData: (channel) => new Float32Array([0.1, 0.1])
    };

    // Manually calculate expected buffer size
    const bitDepth = 16;
    const numberOfChannels = 1;
    const numberOfSamples = 2;
    const bytesPerSample = bitDepth / 8; // 2
    const blockAlign = numberOfChannels * bytesPerSample; // 2
    const dataLength = numberOfSamples * numberOfChannels * bytesPerSample; // 4 bytes
    
    // Expected offsets through BWF structure:
    let expectedOffset = 0;
    
    // RIFF header: 'RIFF' (4) + size (4) + 'WAVE' (4) = 12 bytes
    expectedOffset += 12;
    console.log('After RIFF header:', expectedOffset);
    
    // bext chunk header: 'bext' (4) + size (4) = 8 bytes
    expectedOffset += 8;
    console.log('After bext header:', expectedOffset);
    
    // bext data should be 602 bytes:
    // - description: 256 bytes
    // - originator: 32 bytes  
    // - originatorReference: 32 bytes
    // - originationDate: 10 bytes
    // - originationTime: 8 bytes
    // - timeReference: 8 bytes (64-bit)
    // - BWF version: 2 bytes
    // - UMID: 64 bytes
    // - Loudness: 10 bytes (5 * 2-byte values)
    // - Reserved: 180 bytes
    // - Coding history: 256 bytes
    // Total: 256+32+32+10+8+8+2+64+10+180+256 = 858 bytes... that's wrong!
    
    console.log('Calculated bext fields:');
    console.log('Description: 256, Originator: 32, OriginatorRef: 32');
    console.log('Date: 10, Time: 8, TimeRef: 8, Version: 2');
    console.log('UMID: 64, Loudness: 10, Reserved: 180, CodingHistory: 256');
    console.log('Total bext data:', 256+32+32+10+8+8+2+64+10+180+256, 'bytes');
    
    // This is the problem! The bext data size is 858, not 602
    const actualBextSize = 256+32+32+10+8+8+2+64+10+180+256;
    expectedOffset += actualBextSize;
    console.log('After bext data:', expectedOffset);
    
    // fmt chunk: header (8) + data (16) = 24 bytes
    expectedOffset += 24;
    console.log('After fmt chunk:', expectedOffset);
    
    // data chunk header: 'data' (4) + size (4) = 8 bytes
    expectedOffset += 8;
    console.log('After data header:', expectedOffset);
    
    // audio data
    expectedOffset += dataLength;
    console.log('After audio data (total):', expectedOffset);

    try {
      const result = BWFCodec.generateBWF(mockAudioBuffer, {}, { bitDepth: 16 });
      expect(result).toBeDefined();
    } catch (error) {
      console.error('Error at offset calculation mismatch');
      throw error;
    }
  });
});
