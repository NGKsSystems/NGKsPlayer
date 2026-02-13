/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: generateWaveformThumbnail.js
 * Purpose: Render mini waveform from existing energyTrajectory data (no IPC needed)
 *
 * Tracks already have energyTrajectory stored in the DB from deep analysis —
 * an array of ~2000 normalized (0–1) energy values. This module renders that
 * data directly to a canvas, producing unique per-track waveforms instantly.
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */

// ── Cache ────────────────────────────────────────────────────────────────
const cache = new Map();   // trackId → data URL string

// ── Configuration ────────────────────────────────────────────────────────
const CANVAS_W = 280;
const CANVAS_H = 24;

// Color gradient stops (low energy → high energy)
const COLOR_LOW  = [59, 130, 246];   // blue
const COLOR_MID  = [168, 85, 247];   // purple
const COLOR_HIGH = [239, 68, 68];    // red

function lerpColor(a, b, t) {
  return `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)},${Math.round(a[1] + (b[1] - a[1]) * t)},${Math.round(a[2] + (b[2] - a[2]) * t)})`;
}

/**
 * Render energyTrajectory data to a canvas data URL.
 * Each pixel column draws a vertical bar whose height = energy value.
 * Color varies from blue (low) → purple (mid) → red (high).
 */
function renderTrajectory(trajectory, width = CANVAS_W, height = CANVAS_H) {
  if (!trajectory || trajectory.length === 0) return null;

  const canvas  = document.createElement('canvas');
  canvas.width  = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Normalize values — handle both 0-1 and 0-100 ranges
  let vals = trajectory.map(v => (typeof v === 'number' ? v : Number(v) || 0));
  const maxVal = Math.max(...vals, 0.001);
  if (maxVal > 1.5) vals = vals.map(v => v / maxVal); // normalize 0-100 → 0-1

  const samplesPerPx = vals.length / width;

  for (let x = 0; x < width; x++) {
    const start = Math.floor(x * samplesPerPx);
    const end   = Math.min(Math.floor((x + 1) * samplesPerPx), vals.length);

    // Average energy for this pixel column
    let sum = 0;
    let count = 0;
    for (let i = start; i < end; i++) {
      sum += vals[i];
      count++;
    }
    const energy = count > 0 ? sum / count : 0;
    const clamped = Math.max(0, Math.min(1, energy));

    // Bar height from bottom
    const barH = Math.max(1, Math.round(clamped * height));

    // Color based on energy level
    const color = clamped < 0.5
      ? lerpColor(COLOR_LOW, COLOR_MID, clamped * 2)
      : lerpColor(COLOR_MID, COLOR_HIGH, (clamped - 0.5) * 2);

    ctx.fillStyle = color;
    ctx.globalAlpha = 0.7 + clamped * 0.3; // brighter at higher energy
    ctx.fillRect(x, height - barH, 1, barH);
  }

  return canvas.toDataURL('image/png');
}

/**
 * Get a waveform data URL for a track using its existing energyTrajectory.
 * Returns instantly from cache, or renders synchronously from trajectory data.
 * No IPC calls, no ffmpeg, no async — just canvas drawing.
 *
 * @param {object} track  – must have `id` and `energyTrajectory` (array of 0-1 floats)
 * @returns {string|null}  data URL, or null if no trajectory data
 */
export function getWaveformDataUrl(track) {
  if (!track?.id) return null;

  // Return from cache
  if (cache.has(track.id)) return cache.get(track.id);

  // Parse trajectory if needed (may come as JSON string from DB)
  let trajectory = track.energyTrajectory;
  if (typeof trajectory === 'string') {
    try { trajectory = JSON.parse(trajectory); } catch { return null; }
  }
  if (!Array.isArray(trajectory) || trajectory.length === 0) return null;

  // Render synchronously
  const dataUrl = renderTrajectory(trajectory);
  if (dataUrl) cache.set(track.id, dataUrl);
  return dataUrl;
}

/**
 * Check if a track has trajectory data we can render.
 */
export function hasWaveformData(track) {
  if (!track) return false;
  if (cache.has(track.id)) return true;
  const traj = track.energyTrajectory;
  if (typeof traj === 'string') {
    try { return JSON.parse(traj).length > 0; } catch { return false; }
  }
  return Array.isArray(traj) && traj.length > 0;
}

/**
 * Reset the cache (e.g. on library reload).
 */
export function resetWaveformCache() {
  cache.clear();
}
