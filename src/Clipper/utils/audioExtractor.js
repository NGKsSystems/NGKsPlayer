/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: audioExtractor.js
 * Purpose: TODO â€“ describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import { AdvancedAudioCodecs } from '../../audio/AdvancedAudioCodecs.js';

// Extract a specific section of audio from AudioBuffer
export const extractAudioClip = (audioBuffer, startSeconds, endSeconds) => {
  const sampleRate = audioBuffer.sampleRate;
  const numberOfChannels = audioBuffer.numberOfChannels;
  const startSample = Math.floor(startSeconds * sampleRate);
  const endSample = Math.floor(endSeconds * sampleRate);
  const numberOfSamples = endSample - startSample;

  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const clipped = audioContext.createBuffer(numberOfChannels, numberOfSamples, sampleRate);

  for (let channel = 0; channel < numberOfChannels; channel++) {
    const sourceData = audioBuffer.getChannelData(channel);
    const clippedData = clipped.getChannelData(channel);
    clippedData.set(sourceData.slice(startSample, endSample));
  }

  return clipped;
};

// Generate audio file in specified format using Advanced Audio Codecs
export const generateAudioFile = (audioBuffer, format = 'WAV', options = {}) => {
  const formatUpper = format.toUpperCase();
  
  try {
    return AdvancedAudioCodecs.exportAudio(audioBuffer, formatUpper, options);
  } catch (error) {
    console.warn(`Advanced codec export failed for ${format}, falling back to WAV:`, error);
    return generateWAV(audioBuffer, options.sampleRate);
  }
};

// Legacy WAV generator (kept for compatibility)
export const generateWAV = (audioBuffer, sampleRate) => {
  const numberOfChannels = audioBuffer.numberOfChannels;
  const sampleRateValue = sampleRate || audioBuffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numberOfChannels * bytesPerSample;

  let channelData = [];
  for (let channel = 0; channel < numberOfChannels; channel++) {
    channelData.push(audioBuffer.getChannelData(channel));
  }

  const numberOfSamples = audioBuffer.length;
  const dataLength = numberOfSamples * numberOfChannels * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  // WAV header
  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size
  view.setUint16(20, format, true);
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRateValue, true);
  view.setUint32(28, sampleRateValue * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);

  // Write audio data
  let offset = 44;
  let index = 0;
  for (let sample = 0; sample < numberOfSamples; sample++) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      let sample_value = channelData[channel][sample];
      sample_value = Math.max(-1, Math.min(1, sample_value)); // Clamp
      view.setInt16(offset, sample_value * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([buffer], { type: 'audio/wav' });
};

// Get supported audio formats
export const getSupportedAudioFormats = () => {
  return AdvancedAudioCodecs.getSupportedExtensions();
};

// Parse audio file metadata
export const parseAudioMetadata = (buffer, filename) => {
  try {
    return AdvancedAudioCodecs.parseAudioFile(buffer, filename);
  } catch (error) {
    console.warn('Failed to parse audio metadata:', error);
    return { format: 'UNKNOWN', error: error.message };
  }
};

