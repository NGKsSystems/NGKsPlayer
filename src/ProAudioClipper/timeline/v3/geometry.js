/**
 * NGKsSystems – NGKsPlayer
 *
 * Module: geometry.js (V3)
 * Purpose: Thin wrappers around timelineMath for V3 timeline.
 *          Re-uses existing math; does NOT fork or duplicate logic.
 *
 * Owner: NGKsSystems
 */
import {
  timeToPixels,
  calculateTimelineWidth as calcWidth,
  generateTicks,
} from '../timelineMath.js';
import { BASE_PPS } from './layoutConstants.js';

/**
 * Convert time (seconds) to pixel position at the given zoom level.
 * One-arg convenience that bakes in BASE_PPS.
 */
export const timeToPx = (timeSec, zoomLevel) =>
  timeToPixels(timeSec, BASE_PPS, zoomLevel);

/**
 * Convert pixel position back to time (seconds) at the given zoom level.
 */
export const pxToTime = (px, zoomLevel) =>
  px / (BASE_PPS * zoomLevel);

/**
 * Clamp a number between min and max.
 */
export const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

/**
 * Calculate the full timeline content width for a given duration + zoom.
 */
export const timelineWidth = (duration, zoomLevel) =>
  calcWidth(duration, BASE_PPS, zoomLevel);

/* Re-export generateTicks for ruler usage */
export { generateTicks };
