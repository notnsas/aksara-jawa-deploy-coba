/**
 * Browser-side preprocessing replicating the training pipeline
 * (`handwritten_normalize` + `test_transform` from train.ipynb).
 *
 * Steps:
 *  1. Convert image to grayscale (single channel)
 *  2. Find foreground (pixels < 220, black strokes on white)
 *  3. Crop to bounding box of foreground
 *  4. Scale long edge to 56 px, keep aspect ratio (bilinear)
 *  5. Center-paste onto a 64x64 white canvas
 *  6. Normalize to [-1.0, 1.0]
 *
 * Returns a Float32Array of length 64*64 in [-1, 1].
 */

const SIZE = 64;
const TARGET_LONG_EDGE = 56;
const FOREGROUND_THRESHOLD = 220;

/** Extract grayscale value for a pixel via Rec.709 luminance. */
function toGray(data: Uint8ClampedArray, w: number, h: number): Uint8Array {
  const gray = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    gray[i] = Math.round(
      0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2]
    );
  }
  return gray;
}

/** Bilinear resize of a grayscale image. */
function resizeBilinear(
  src: Uint8Array,
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number
): Uint8Array {
  const dst = new Uint8Array(dstW * dstH);
  const xRatio = srcW / dstW;
  const yRatio = srcH / dstH;
  for (let y = 0; y < dstH; y++) {
    for (let x = 0; x < dstW; x++) {
      const gx = x * xRatio;
      const gy = y * yRatio;
      const x0 = Math.floor(gx);
      const y0 = Math.floor(gy);
      const x1 = Math.min(x0 + 1, srcW - 1);
      const y1 = Math.min(y0 + 1, srcH - 1);
      const wx = gx - x0;
      const wy = gy - y0;

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

/**
 * Preprocess source pixel data (RGBA) into the model input tensor.
 * Returns a Float32Array of length 1*1*64*64 with values in [-1, 1].
 */
export function preprocessImage(
  imageData: ImageData
): Float32Array {
  const { width: w, height: h } = imageData;
  const gray = toGray(imageData.data, w, h);

  // Find foreground bounding box
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
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

  // Blank canvas -> return all-white (after normalize => +1.0)
  const canvas = new Float32Array(SIZE * SIZE);
  if (!hasForeground) {
    return canvas.fill(1.0);
  }

  const boxW = maxX - minX + 1;
  const boxH = maxY - minY + 1;

  // Scale long edge to 56, keep aspect ratio (matches PIL round-then-scale)
  const scale = TARGET_LONG_EDGE / Math.max(boxW, boxH);
  const newW = Math.max(1, Math.round(boxW * scale));
  const newH = Math.max(1, Math.round(boxH * scale));

  // Crop
  const cropped = new Uint8Array(boxW * boxH);
  for (let y = 0; y < boxH; y++) {
    for (let x = 0; x < boxW; x++) {
      cropped[y * boxW + x] = gray[(minY + y) * w + (minX + x)];
    }
  }

  // Resize to (newW, newH)
  const resized = resizeBilinear(cropped, boxW, boxH, newW, newH);

  // Center-paste onto 64x64, then normalize (v/255 - 0.5) / 0.5 = v/127.5 - 1
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

/** Build a Float32Array in the [1,1,64,64] layout the ONNX model expects. */
export function toModelInput(preprocessed: Float32Array): Float32Array {
  const out = new Float32Array(1 * 1 * 64 * 64);
  out.set(preprocessed);
  return out;
}