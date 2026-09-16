
/** Bilinear resize matching PIL pixel-center alignment. */
const SIZE = 64;
const TARGET_LONG_EDGE = 46;
const FOREGROUND_THRESHOLD = 220;

/** Extract grayscale value for a pixel via Rec.709 luminance with alpha composite over white. */
function toGray(data: Uint8ClampedArray, w: number, h: number): Uint8Array {
  const gray = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    const alpha = data[o + 3] / 255;
    
    // Composite RGBA over white background
    const r = data[o] * alpha + 255 * (1 - alpha);
    const g = data[o + 1] * alpha + 255 * (1 - alpha);
    const b = data[o + 2] * alpha + 255 * (1 - alpha);

    gray[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  }
  return gray;
}

export function preprocessImage(imageData: ImageData): Float32Array {
  const { width: w, height: h, data } = imageData;

  // Step 1: Convert RGBA to grayscale
  const gray = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    const alpha = data[o + 3] / 255;
    const r = data[o] * alpha + 255 * (1 - alpha);
    const g = data[o + 1] * alpha + 255 * (1 - alpha);
    const b = data[o + 2] * alpha + 255 * (1 - alpha);
    gray[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  }

  // Step 2: Find foreground bounding box
  let minY = h, maxY = -1, minX = w, maxX = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (gray[y * w + x] < FOREGROUND_THRESHOLD) {
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
      }
    }
  }

  if (maxY < 0) {
    console.log(`[BLANK] No foreground found`);
    const canvas = new Float32Array(SIZE * SIZE);
    canvas.fill(1.0);
    return canvas;
  }

  const cropH = maxY - minY + 1;
  const cropW = maxX - minX + 1;

  // Extract cropped region
  const cropped = new Uint8Array(cropH * cropW);
  let croppedMin = 255, croppedMax = 0;
  for (let y = 0; y < cropH; y++) {
    for (let x = 0; x < cropW; x++) {
      const val = gray[(minY + y) * w + (minX + x)];
      cropped[y * cropW + x] = val;
      croppedMin = Math.min(croppedMin, val);
      croppedMax = Math.max(croppedMax, val);
    }
  }
  console.log(`[CROPPED] size=${cropW}×${cropH}, min=${croppedMin}, max=${croppedMax}`);

  // Scale long edge to 56
  const scale = TARGET_LONG_EDGE / Math.max(cropH, cropW);
  const newH = Math.max(1, Math.round(cropH * scale));
  const newW = Math.max(1, Math.round(cropW * scale));

  const resized = resizeBilinear(cropped, cropW, cropH, newW, newH);
  
  // Check resized values
  let resizedMin = 255, resizedMax = 0;
  for (let i = 0; i < resized.length; i++) {
    resizedMin = Math.min(resizedMin, resized[i]);
    resizedMax = Math.max(resizedMax, resized[i]);
  }
  console.log(`[RESIZED] size=${newW}×${newH}, min=${resizedMin}, max=${resizedMax}`);

  // Paste into center of 64x64 canvas
  const canvas = new Float32Array(SIZE * SIZE);
  canvas.fill(1.0);

  const offY = Math.floor((SIZE - newH) / 2);
  const offX = Math.floor((SIZE - newW) / 2);

  for (let y = 0; y < newH; y++) {
    for (let x = 0; x < newW; x++) {
      const grayVal = resized[y * newW + x];
      canvas[(offY + y) * SIZE + (offX + x)] = grayVal / 127.5 - 1.0;
    }
  }

  // Check final canvas
  let canvasMin = 1.0, canvasMax = -1.0;
  for (let i = 0; i < canvas.length; i++) {
    canvasMin = Math.min(canvasMin, canvas[i]);
    canvasMax = Math.max(canvasMax, canvas[i]);
  }
  console.log(`[CANVAS] min=${canvasMin.toFixed(4)}, max=${canvasMax.toFixed(4)}, center=${canvas[32*SIZE+32].toFixed(4)}`);
  // visualizePreprocessed(canvas);
  return canvas;
}

export function visualizePreprocessed(canvas: Float32Array, SIZE: number = 64): void {
  const imageCanvas = new OffscreenCanvas(SIZE, SIZE);
  const ctx = imageCanvas.getContext('2d')!;
  const imageData = ctx.createImageData(SIZE, SIZE);
  const data = imageData.data;

  // Convert [-1, 1] to [0, 255]
  for (let i = 0; i < SIZE * SIZE; i++) {
    const normalized = canvas[i];
    const byte = Math.round(((normalized + 1) / 2) * 255);
    data[i * 4] = byte;
    data[i * 4 + 1] = byte;
    data[i * 4 + 2] = byte;
    data[i * 4 + 3] = 255;
  }

  ctx.putImageData(imageData, 0, 0);

  // Draw crosshair at center
  ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
  ctx.lineWidth = 1;
  const center = SIZE / 2;
  ctx.beginPath();
  ctx.moveTo(center - 5, center);
  ctx.lineTo(center + 5, center);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(center, center - 5);
  ctx.lineTo(center, center + 5);
  ctx.stroke();

  // Dump tensor values in 8x8 grid around center
  console.log('[TENSOR VALUES] 8x8 grid centered at (32, 32):');
  for (let y = 28; y < 36; y++) {
    let row = '';
    for (let x = 28; x < 36; x++) {
      const val = canvas[y * SIZE + x].toFixed(3);
      row += `${val.padStart(7)} `;
    }
    console.log(row);
  }

  // Download
  imageCanvas.convertToBlob().then(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `preprocessed-${Date.now()}.png`;
    a.click();
    URL.revokeObjectURL(url);
    console.log(`[SAVED] Image downloaded with red crosshair at center`);
  });

  // Display scaled up
  const displayCanvas = document.createElement('canvas');
  displayCanvas.width = SIZE * 8;
  displayCanvas.height = SIZE * 8;
  displayCanvas.style.cssText = `
    border: 3px solid red;
    position: fixed;
    bottom: 10px;
    right: 10px;
    z-index: 9999;
    image-rendering: pixelated;
  `;
  const displayCtx = displayCanvas.getContext('2d')!;
  displayCtx.imageSmoothingEnabled = false;
  displayCtx.scale(8, 8);
  displayCtx.putImageData(imageData, 0, 0);
  document.body.appendChild(displayCanvas);
}

// Copy your bilinear resize function as-is
function resizeBilinear(
  src: Uint8Array,
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number
): Uint8Array {
  const dst = new Uint8Array(dstW * dstH);
  const scaleX = srcW / dstW;
  const scaleY = srcH / dstH;

  for (let y = 0; y < dstH; y++) {
    const gy = (y + 0.5) * scaleY - 0.5;
    const y0 = Math.max(0, Math.floor(gy));
    const y1 = Math.min(y0 + 1, srcH - 1);
    const wy = gy - Math.floor(gy);

    for (let x = 0; x < dstW; x++) {
      const gx = (x + 0.5) * scaleX - 0.5;
      const x0 = Math.max(0, Math.floor(gx));
      const x1 = Math.min(x0 + 1, srcW - 1);
      const wx = gx - Math.floor(gx);

      const a = src[y0 * srcW + x0];
      const b = src[y0 * srcW + x1];
      const c = src[y1 * srcW + x0];
      const d = src[y1 * srcW + x1];

      const v =
        a * (1 - wx) * (1 - wy) +
        b * wx * (1 - wy) +
        c * (1 - wx) * wy +
        d * wx * wy;

      dst[y * dstW + x] = Math.round(v);
    }
  }
  return dst;
}

export function toModelInput(preprocessed: Float32Array): Float32Array {
  return preprocessed;
}