"use client";

import * as ort from "onnxruntime-web/wasm";
import { toModelInput, preprocessImage } from "@/lib/preprocessing";
import { CLASS_NAMES } from "@/lib/models";

export interface Prediction {
  className: string;
  confidence: number;
  probabilities: Array<{ className: string; probability: number }>;
  latencyMs: number;
}

let sessionCache: Record<string, ort.InferenceSession> = {};

async function ensureRuntime() {
  ort.env.wasm.wasmPaths = "/ort/";
  ort.env.wasm.numThreads = Math.min(navigator.hardwareConcurrency || 2, 4);
}

/** Load (or grab from cache) an ONNX inference session for a model version. */
export async function getSession(
  version: string,
  modelUrl: string
): Promise<ort.InferenceSession> {
  await ensureRuntime();
  if (sessionCache[version]) return sessionCache[version];

  const session = await ort.InferenceSession.create(modelUrl, {
    executionProviders: ["wasm"],
    graphOptimizationLevel: "all",
    intraOpNumThreads: 1,
  });
  sessionCache[version] = session;
  return session;
}

export async function warmupModels(versions: Array<{ id: string; url: string }>) {
  await ensureRuntime();
  await Promise.all(
    versions.map(async ({ id, url }) => {
      try {
        if (!sessionCache[id]) {
          sessionCache[id] = await ort.InferenceSession.create(url, {
            executionProviders: ["wasm"],
            graphOptimizationLevel: "all",
            intraOpNumThreads: 1,
          });
        }
      } catch {
        // Non-fatal: the model is fetched lazily on demand
      }
    })
  );
}

/** Run inference on a drawn ImageData and return the top-N predictions. */
export async function runInference(
  imageData: ImageData,
  version: string,
  modelUrl: string,
  topK = 5
): Promise<Prediction> {
  const start = performance.now();
  const session = await getSession(version, modelUrl);

  const inputTensor = new ort.Tensor(
    "float32",
    toModelInput(preprocessImage(imageData)),
    [1, 1, 64, 64]
  );

  const feeds: Record<string, ort.Tensor> = { input: inputTensor };
  const results = await session.run(feeds);
  const outputData = results.logits.data as Float32Array;

  // Softmax
  const logits = Array.from(outputData);
  const maxLogit = Math.max(...logits);
  const exp = logits.map((v) => Math.exp(v - maxLogit));
  const sumExp = exp.reduce((a, b) => a + b, 0);
  const probs = exp.map((v) => v / sumExp);

  const ranked = probs
    .map((p, idx) => ({ className: CLASS_NAMES[idx], probability: p }))
    .sort((a, b) => b.probability - a.probability);

  const top = ranked.slice(0, topK);
  const latencyMs = performance.now() - start;

  return {
    className: top[0].className,
    confidence: top[0].probability,
    probabilities: top,
    latencyMs,
  };
}

export function clearModelCache() {
  sessionCache = {};
}