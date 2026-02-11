/* ───────────────────────────────────────────────────────
   ProAudioClipperV2 · Timeline Math
   Pure functions – zero side-effects, zero React deps.
   Every time ↔ pixel conversion lives here.
   ─────────────────────────────────────────────────────── */

import {
  DEFAULT_ZOOM,
  MIN_ZOOM,
  MAX_ZOOM,
  DEFAULT_SNAP_MS,
} from './layoutConstants.js';

// ── Time ↔ Pixel ─────────────────────────────────────

/** Convert seconds → CSS pixels at the given zoom level. */
export function timeToPx(seconds, zoom = DEFAULT_ZOOM) {
  return seconds * zoom;
}

/** Convert CSS pixels → seconds at the given zoom level. */
export function pxToTime(px, zoom = DEFAULT_ZOOM) {
  return zoom === 0 ? 0 : px / zoom;
}

// ── Zoom helpers ──────────────────────────────────────

/** Clamp zoom to allowed range. */
export function clampZoom(z) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
}

/** Zoom in by multiplying by factor (default 1.2). */
export function zoomIn(current, factor = 1.2) {
  return clampZoom(current * factor);
}

/** Zoom out by dividing by factor (default 1.2). */
export function zoomOut(current, factor = 1.2) {
  return clampZoom(current / factor);
}

// ── Snap ──────────────────────────────────────────────

/**
 * Snap a time value (seconds) to the nearest grid line.
 * @param {number} time  – seconds
 * @param {number} snapMs – grid size in milliseconds
 * @returns {number} snapped time in seconds
 */
export function snapTime(time, snapMs = DEFAULT_SNAP_MS) {
  if (snapMs <= 0) return time;
  const gridSec = snapMs / 1000;
  return Math.round(time / gridSec) * gridSec;
}

// ── Ruler ticks ───────────────────────────────────────

/**
 * Generate ruler tick marks for the visible viewport.
 * Returns an array of { time, px, label, major }.
 */
export function generateRulerTicks(viewportStart, viewportWidth, zoom) {
  const startTime = pxToTime(viewportStart, zoom);
  const endTime   = pxToTime(viewportStart + viewportWidth, zoom);

  // Choose interval based on zoom
  let interval;
  if (zoom >= 500)      interval = 0.1;
  else if (zoom >= 200) interval = 0.5;
  else if (zoom >= 80)  interval = 1;
  else if (zoom >= 30)  interval = 5;
  else                   interval = 10;

  const majorEvery = interval >= 1 ? 5 : (interval >= 0.5 ? 2 : 10);

  const ticks = [];
  const first = Math.floor(startTime / interval) * interval;
  for (let t = first; t <= endTime + interval; t += interval) {
    const rounded = Math.round(t * 1000) / 1000;       // avoid FP noise
    const index   = Math.round(rounded / interval);
    ticks.push({
      time:  rounded,
      px:    timeToPx(rounded, zoom) - viewportStart,
      label: formatTimeShort(rounded),
      major: index % majorEvery === 0,
    });
  }
  return ticks;
}

// ── Formatting ────────────────────────────────────────

/** mm:ss.mmm */
export function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00.000';
  const m = Math.floor(seconds / 60);
  const s = seconds - m * 60;
  return `${String(m).padStart(2, '0')}:${s.toFixed(3).padStart(6, '0')}`;
}

/** Short label for ruler ticks – omit millis when whole second. */
export function formatTimeShort(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = seconds - m * 60;
  const whole = Math.round(s * 10) / 10;
  if (whole === Math.floor(whole)) {
    return `${m}:${String(Math.floor(whole)).padStart(2, '0')}`;
  }
  return `${m}:${whole.toFixed(1).padStart(4, '0')}`;
}
