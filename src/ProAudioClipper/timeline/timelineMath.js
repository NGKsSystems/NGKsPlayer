/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: timelineMath.js
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
/**
 * Pure timeline math helpers - no React/DOM dependencies
 * Used by timeline components for consistent time/pixel conversions
 */

/**
 * Clamp a value between min and max bounds
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum bound
 * @param {number} max - Maximum bound
 * @returns {number} Clamped value
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Convert time to pixel position (absolute timeline position)
 * @param {number} time - Time in seconds
 * @param {number} pixelsPerSecond - Pixels per second scaling
 * @param {number} zoom - Zoom level multiplier
 * @returns {number} Pixel position
 */
export function timeToPixels(time, pixelsPerSecond, zoom = 1) {
  return time * pixelsPerSecond * zoom;
}

/**
 * Convert pixel position to time with viewport offset
 * @param {number} pixelX - Pixel X coordinate
 * @param {number} rectLeft - Container left offset
 * @param {number} viewportStart - Current viewport start time
 * @param {number} pixelsPerSecond - Pixels per second scaling 
 * @param {number} zoom - Zoom level multiplier
 * @param {number} duration - Maximum duration for clamping
 * @returns {number} Time in seconds
 */
export function pixelsToTime(pixelX, rectLeft, viewportStart, pixelsPerSecond, zoom = 1, duration = Infinity) {
  const relativeX = pixelX - rectLeft;
  const timeAtPixel = viewportStart + (relativeX / (pixelsPerSecond * zoom));
  return clamp(timeAtPixel, 0, duration);
}

/**
 * Snap time value to nearest grid interval
 * @param {number} time - Time to snap
 * @param {number} gridInterval - Grid interval in seconds
 * @param {number} snapThreshold - Maximum snap distance in pixels
 * @param {number} pixelsPerSecond - Pixels per second for threshold calculation
 * @returns {number} Snapped time
 */
export function snapTime(time, gridInterval, snapThreshold = 8, pixelsPerSecond = 50) {
  if (!gridInterval || gridInterval <= 0) return time;
  
  const snappedTime = Math.round(time / gridInterval) * gridInterval;
  const pixelDistance = Math.abs((snappedTime - time) * pixelsPerSecond);
  
  return pixelDistance <= snapThreshold ? snappedTime : time;
}

/**
 * Calculate timeline width based on duration, pixels per second, and zoom
 * @param {number} duration - Timeline duration in seconds
 * @param {number} pixelsPerSecond - Pixels per second scaling
 * @param {number} zoom - Zoom level multiplier
 * @returns {number} Timeline width in pixels
 */
export function calculateTimelineWidth(duration, pixelsPerSecond, zoom = 1) {
  return duration * pixelsPerSecond * zoom;
}

/**
 * Generate tick marks for timeline ruler
 * @param {number} duration - Timeline duration  
 * @param {number} majorInterval - Major tick interval in seconds
 * @param {number} minorInterval - Minor tick interval in seconds
 * @param {Function} timeToPixelFn - Time to pixel conversion function
 * @param {Function} formatTimeFn - Time formatting function
 * @returns {Array} Array of tick objects with position, isMajor, label
 */
export function generateTicks(duration, majorInterval, minorInterval, timeToPixelFn, formatTimeFn) {
  const ticks = [];
  
  for (let time = 0; time <= duration; time += minorInterval) {
    const position = timeToPixelFn(time);
    const isMajor = Math.abs(time % majorInterval) < 0.001; // Float precision handling
    
    ticks.push({
      position,
      isMajor,
      label: isMajor ? formatTimeFn(time) : null,
      time
    });
  }
  
  return ticks;
}
