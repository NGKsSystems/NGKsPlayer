/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: effects.js
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
// src/themes/chromaticChaos/effects.js

/**
 * Chromatic Chaos dynamic canvas effects
 * Safe against NaN/Infinity values
 */

/**
 * Intensify RGB split filter on beats
 * @param {number} beatStrength - From your detection (0–2+)
 */
export function intensifyRGBSplit(beatStrength) {
  if (typeof beatStrength !== 'number' || !Number.isFinite(beatStrength) || beatStrength <= 1.0) {
    return;
  }

  const intensity = Math.min(beatStrength * 3, 8);
  const filter = document.querySelector('#rgb-split-filter');
  if (!filter) return;

  const redOffset = filter.querySelector('feOffset[result="red"]');
  const greenOffset = filter.querySelector('feOffset[result="green"]');
  const blueOffset = filter.querySelector('feOffset[result="blue"]');

  if (redOffset) redOffset.setAttribute('dx', intensity);
  if (greenOffset) greenOffset.setAttribute('dx', -intensity);
  if (blueOffset) blueOffset.setAttribute('dy', intensity / 2);
}

/**
 * Apply color channel tearing on super peaks
 * @param {HTMLCanvasElement} canvas
 * @param {CanvasRenderingContext2D} ctx
 * @param {boolean} isSuperPeak
 */
export function applyChannelTear(canvas, ctx, isSuperPeak) {
  if (!isSuperPeak || !canvas || !ctx) return;

  const width = canvas.width;
  const height = canvas.height;

  try {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    const tearAmount = 5 + Math.random() * 15;
    const direction = Math.random() > 0.5 ? 'horizontal' : 'vertical';

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        if (Math.random() < 0.4) {
          if (direction === 'horizontal') {
            const shift = Math.floor(tearAmount);
            const safeIndex = (index + shift * 4) % (width * 4);
            data[index] = data[safeIndex] || data[index];
          } else {
            const shift = Math.floor(tearAmount * width * 4);
            const safeIndex = (index + shift) % data.length;
            data[index + 1] = data[safeIndex] || data[index + 1];
          }
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
  } catch (err) {
    console.warn('[Chromatic Chaos] Tearing failed:', err);
  }
}

/**
 * Chromatic feedback tunnel on high energy
 * @param {HTMLCanvasElement} canvas
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} beatStrength
 */
export function applyFeedbackTunnel(canvas, ctx, beatStrength) {
  if (beatStrength <= 1.5 || !canvas || !ctx) return;

  const width = canvas.width;
  const height = canvas.height;

  try {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width * 0.7;
    tempCanvas.height = height * 0.7;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(canvas, 0, 0, width, height, 0, 0, tempCanvas.width, tempCanvas.height);

    ctx.globalAlpha = 0.75;
    ctx.filter = 'hue-rotate(20deg) brightness(1.3)';
    ctx.drawImage(tempCanvas, width * 0.15, height * 0.15, tempCanvas.width, tempCanvas.height);
    ctx.globalAlpha = 1.0;
    ctx.filter = 'none';
  } catch (err) {
    console.warn('[Chromatic Chaos] Feedback tunnel failed:', err);
  }
}

/**
 * Main function – call this in your draw loop or on beat
 * @param {HTMLCanvasElement} canvas
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} beatStrength
 * @param {boolean} isSuperPeak
 */
export function applyChromaticChaos(canvas, ctx, beatStrength, isSuperPeak) {
  if (!canvas || !ctx || typeof beatStrength !== 'number' || !Number.isFinite(beatStrength)) {
    return;
  }

  intensifyRGBSplit(beatStrength);
  applyChannelTear(canvas, ctx, isSuperPeak);
  applyFeedbackTunnel(canvas, ctx, beatStrength);
}
