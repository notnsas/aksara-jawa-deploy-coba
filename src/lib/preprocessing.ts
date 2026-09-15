const SIZE = 64;
const TARGET_LONG_EDGE = 56;
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

/** Bilinear resize matching PIL pixel-center alignment. */
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

export function preprocessImage(imageData: ImageData): Float32Array {
  const { width: w, height: h } = imageData;
  const gray = toGray(imageData.data, w, h);

  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;
  let hasForeground = false;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (gray[y * w + x] < FOREGROUND_THRESHOLD) {
        hasForeground = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // Pre-fill with +1.0 (white background in [-1, 1] range)
  const canvas = new Float32Array(SIZE * SIZE).fill(1.0);
  if (!hasForeground) {
    return canvas;
  }

  const boxW = maxX - minX + 1;
  const boxH = maxY - minY + 1;

  const scale = TARGET_LONG_EDGE / Math.max(boxW, boxH);
  const newW = Math.max(1, Math.round(boxW * scale));
  const newH = Math.max(1, Math.round(boxH * scale));

  const cropped = new Uint8Array(boxW * boxH);
  for (let y = 0; y < boxH; y++) {
    for (let x = 0; x < boxW; x++) {
      cropped[y * boxW + x] = gray[(minY + y) * w + (minX + x)];
    }
  }

  const resized = resizeBilinear(cropped, boxW, boxH, newW, newH);

  const offX = Math.floor((SIZE - newW) / 2);
  const offY = Math.floor((SIZE - newH) / 2);

  for (let y = 0; y < newH; y++) {
    for (let x = 0; x < newW; x++) {
      const v = resized[y * newW + x] / 127.5 - 1.0;
      canvas[(offY + y) * SIZE + (offX + x)] = v;
    }
  }

  return canvas;
}

export function toModelInput(preprocessed: Float32Array): Float32Array {
  const out = new Float32Array(1 * 1 * 64 * 64);
  out.set(preprocessed);
  return out;
}