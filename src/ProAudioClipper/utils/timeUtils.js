/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: timeUtils.js
 * Purpose: TODO â€“ describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
/**
 * Time Utilities for Audio Processing
 */

/**
 * Format time in seconds to MM:SS.mmm format
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string
 */
export const formatTime = (seconds) => {
  if (typeof seconds !== 'number' || isNaN(seconds)) {
    return '00:00.000';
  }
  
  const totalSeconds = Math.abs(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  const milliseconds = Math.floor((totalSeconds % 1) * 1000);
  
  const sign = seconds < 0 ? '-' : '';
  
  return `${sign}${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
};

/**
 * Parse time string to seconds
 * @param {string} timeString - Time string in MM:SS.mmm format
 * @returns {number} Time in seconds
 */
export const parseTime = (timeString) => {
  if (typeof timeString !== 'string') {
    return 0;
  }
  
  const isNegative = timeString.startsWith('-');
  const cleanTime = timeString.replace('-', '');
  
  const parts = cleanTime.split(':');
  if (parts.length !== 2) {
    return 0;
  }
  
  const minutes = parseInt(parts[0], 10) || 0;
  const secondsParts = parts[1].split('.');
  const seconds = parseInt(secondsParts[0], 10) || 0;
  const milliseconds = parseInt(secondsParts[1], 10) || 0;
  
  const totalSeconds = minutes * 60 + seconds + milliseconds / 1000;
  
  return isNegative ? -totalSeconds : totalSeconds;
};

/**
 * Format time in seconds to a shorter format (MM:SS)
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string
 */
export const formatTimeShort = (seconds) => {
  if (typeof seconds !== 'number' || isNaN(seconds)) {
    return '00:00';
  }
  
  const totalSeconds = Math.abs(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  
  const sign = seconds < 0 ? '-' : '';
  
  return `${sign}${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Convert time to samples
 * @param {number} timeInSeconds - Time in seconds
 * @param {number} sampleRate - Sample rate in Hz
 * @returns {number} Sample index
 */
export const timeToSamples = (timeInSeconds, sampleRate) => {
  return Math.floor(timeInSeconds * sampleRate);
};

/**
 * Convert samples to time
 * @param {number} samples - Sample index
 * @param {number} sampleRate - Sample rate in Hz
 * @returns {number} Time in seconds
 */
export const samplesToTime = (samples, sampleRate) => {
  return samples / sampleRate;
};

/**
 * Round time to nearest frame (for frame-accurate editing)
 * @param {number} timeInSeconds - Time in seconds
 * @param {number} frameRate - Frame rate (fps)
 * @returns {number} Frame-rounded time in seconds
 */
export const roundToFrame = (timeInSeconds, frameRate = 60) => {
  const frameTime = 1 / frameRate;
  return Math.round(timeInSeconds / frameTime) * frameTime;
};

/**
 * Calculate time difference between two time points
 * @param {number} startTime - Start time in seconds
 * @param {number} endTime - End time in seconds
 * @returns {number} Duration in seconds
 */
export const calculateDuration = (startTime, endTime) => {
  return Math.abs(endTime - startTime);
};

/**
 * Clamp time value within bounds
 * @param {number} time - Time to clamp
 * @param {number} min - Minimum time
 * @param {number} max - Maximum time
 * @returns {number} Clamped time
 */
export const clampTime = (time, min = 0, max = Infinity) => {
  return Math.max(min, Math.min(max, time));
};

/**
 * Format duration as human readable string
 * @param {number} seconds - Duration in seconds
 * @returns {string} Human readable duration
 */
export const formatDuration = (seconds) => {
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  } else if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  }
};
