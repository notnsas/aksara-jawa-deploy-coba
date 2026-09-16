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

// @/lib/preprocessing.ts
// const SIZE = 64;

export function preprocessImage(imageData: ImageData): Float32Array {
  const { width: w, height: h, data } = imageData;
  const canvas = new Float32Array(SIZE * SIZE);

  const scaleX = w / SIZE;
  const scaleY = h / SIZE;

  for (let y = 0; y < SIZE; y++) {
    const srcY = Math.min(Math.floor((y + 0.5) * scaleY), h - 1);
    for (let x = 0; x < SIZE; x++) {
      const srcX = Math.min(Math.floor((x + 0.5) * scaleX), w - 1);
      const o = (srcY * w + srcX) * 4;

      const alpha = data[o + 3] / 255;
      const r = data[o] * alpha + 255 * (1 - alpha);
      const g = data[o + 1] * alpha + 255 * (1 - alpha);
      const b = data[o + 2] * alpha + 255 * (1 - alpha);

      // Rec.709 Luminance
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      
      // Normalize [0, 255] to [-1.0, 1.0] (matching PyTorch Normalize(0.5, 0.5))
      canvas[y * SIZE + x] = gray / 127.5 - 1.0;
    }
  }

  return canvas;
}

export function toModelInput(preprocessed: Float32Array): Float32Array {
  return preprocessed;
}