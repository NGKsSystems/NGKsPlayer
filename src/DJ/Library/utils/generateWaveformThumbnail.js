/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: generateWaveformThumbnail.js
 * Purpose: Draw smooth pro-style mini waveform from energyTrajectory onto a canvas
 *
 * Tracks already have energyTrajectory stored in the DB from deep analysis —
 * an array of ~2000 normalized (0–1) energy values. This module draws that
 * data as a smooth filled envelope (not rectangles) onto a provided canvas.
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */

// ── Gradient colors ──────────────────────────────────────────────────────
const GRAD_TOP    = 'rgba(59, 180, 255, 0.9)';  // bright blue
const GRAD_BOTTOM = 'rgba(120, 60, 220, 0.3)';  // faded purple
const STROKE_CLR  = 'rgba(100, 200, 255, 0.6)'; // peak trace line

/**
 * 5-tap moving average to smooth jagged data into a pro waveform.
 */
function smooth(arr, taps = 5) {
  const half = Math.floor(taps / 2);
  const out = new Float32Array(arr.length);
  for (let i = 0; i < arr.length; i++) {
    let sum = 0, count = 0;
    for (let j = i - half; j <= i + half; j++) {
      if (j >= 0 && j < arr.length) { sum += arr[j]; count++; }
    }
    out[i] = sum / count;
  }
  return out;
}

/**
 * Downsample an array to exactly `targetLen` points by averaging bins.
 */
function downsample(arr, targetLen) {
  if (arr.length <= targetLen) return arr;
  const out = new Float32Array(targetLen);
  const step = arr.length / targetLen;
  for (let i = 0; i < targetLen; i++) {
    const s = Math.floor(i * step);
    const e = Math.min(Math.floor((i + 1) * step), arr.length);
    let sum = 0;
    for (let j = s; j < e; j++) sum += arr[j];
    out[i] = sum / (e - s || 1);
  }
  return out;
}

/**
 * Parse energyTrajectory from track object.
 * Returns Float32Array of 0-1 values, or null.
 */
export function parseTrajectory(track) {
  if (!track) return null;
  let traj = track.energyTrajectory;
  if (!traj) return null;
  if (typeof traj === 'string') {
    try { traj = JSON.parse(traj); } catch { return null; }
  }
  if (!Array.isArray(traj) || traj.length === 0) return null;

  const vals = new Float32Array(traj.length);
  let max = 0;
  for (let i = 0; i < traj.length; i++) {
    const v = typeof traj[i] === 'number' ? traj[i] : Number(traj[i]) || 0;
    vals[i] = v;
    if (v > max) max = v;
  }
  // Normalize if values are >1 (e.g. 0-100 scale)
  if (max > 1.5) for (let i = 0; i < vals.length; i++) vals[i] /= max;
  return vals;
}

/**
 * Draw a smooth filled waveform envelope onto a canvas element.
 * Uses the energyTrajectory data from the track.
 *
 * @param {HTMLCanvasElement} canvas  – canvas element to draw on
 * @param {Float32Array}      data   – normalized 0-1 energy values
 */
export function drawWaveform(canvas, data) {
  if (!canvas || !data || data.length === 0) return;

  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);

  // Downsample to pixel width, then smooth
  const ds = downsample(data, w);
  const vals = smooth(ds, 5);

  const mid = h / 2;

  // Create vertical gradient
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, GRAD_TOP);
  grad.addColorStop(1, GRAD_BOTTOM);

  // ── Draw filled mirrored envelope ──────────────────────────────────
  ctx.beginPath();
  // Top half (from center upward)
  for (let x = 0; x < w; x++) {
    const v = Math.max(0, Math.min(1, vals[x]));
    const y = mid - v * mid * 0.95;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  // Bottom half (from center downward, reversed)
  for (let x = w - 1; x >= 0; x--) {
    const v = Math.max(0, Math.min(1, vals[x]));
    const y = mid + v * mid * 0.95;
    ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // ── Thin peak trace line along the top edge ────────────────────────
  ctx.beginPath();
  for (let x = 0; x < w; x++) {
    const v = Math.max(0, Math.min(1, vals[x]));
    const y = mid - v * mid * 0.95;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = STROKE_CLR;
  ctx.lineWidth = 0.8;
  ctx.stroke();
}

/**
 * Check if a track has trajectory data we can render.
 */
export function hasWaveformData(track) {
  return parseTrajectory(track) !== null;
}

/**
 * Reset any caches (reserved for future use).
 */
export function resetWaveformCache() {
  // no-op — rendering is now direct to canvas, no data URL cache needed
}
