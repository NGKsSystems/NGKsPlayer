// src/themes/chromatic-chaos/chromatic-chaos-effects.js

export function applyChromaticChaos(canvas, ctx, beatStrength, isSuperPeak) {
  const width = canvas.width;
  const height = canvas.height;

  // 1. RGB Split Storm – intensify on beats
  if (beatStrength > 1.0) {
    const intensity = Math.min(beatStrength * 3, 8);
    document.querySelector('#rgb-split-filter feOffset[result="red"]').setAttribute('dx', intensity);
    document.querySelector('#rgb-split-filter feOffset[result="green"]').setAttribute('dx', -intensity);
    document.querySelector('#rgb-split-filter feOffset[result="blue"]').setAttribute('dy', intensity / 2);
  }

  // 2. Color Channel Tearing – only on super peaks
  if (isSuperPeak) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const tearAmount = 5 + Math.random() * 15;
    const direction = Math.random() > 0.5 ? 'horizontal' : 'vertical';

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        if (Math.random() < 0.4) { // 40% chance per pixel for tear
          if (direction === 'horizontal') {
            const shift = Math.floor(tearAmount);
            data[index] = data[(index + shift * 4) % (width * 4)] || data[index]; // Red shift
          } else {
            const shift = Math.floor(tearAmount * width * 4);
            data[index + 1] = data[(index + shift) % data.length] || data[index + 1]; // Green vertical shift
          }
        }
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }

  // 3. Chromatic Feedback Loop – tunnel on high energy
  if (beatStrength > 1.5) {
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
  }
}

// Call this in your draw loop or beat handler:
// applyChromaticChaos(canvasRef.current, ctx, beatStrength, peakRotation);