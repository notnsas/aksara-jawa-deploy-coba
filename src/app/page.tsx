"use client";

import { useCallback, useRef, useState } from "react";
import DrawingCanvas, {
  type DrawingCanvasHandle,
} from "@/components/DrawingCanvas";
import ModelSelector from "@/components/ModelSelector";
import PredictionResults from "@/components/PredictionResults";
import CharacterChart from "@/components/CharacterChart";
import { getSession, runInference, type Prediction } from "@/lib/inference";
import {
  DEFAULT_MODEL,
  MODEL_VERSIONS,
  MODEL_FILE,
} from "@/lib/models";

export default function Home() {
  const canvasRef = useRef<DrawingCanvasHandle>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [modelVersion, setModelVersion] = useState(DEFAULT_MODEL);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingVersions, setLoadingVersions] = useState<string[]>([]);

  const activeModel = MODEL_VERSIONS.find((v) => v.id === modelVersion);

  const warmupModel = useCallback((version: string) => {
    setLoadingVersions((prev) => [...prev, version]);
    getSession(version, MODEL_FILE(version))
      .catch(() => {})
      .then(() => {
        setLoadingVersions((prev) => prev.filter((v) => v !== version));
      });
  }, []);

  const performInference = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || canvas.isEmpty()) {
      setPrediction(null);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const imageData = canvas.getImageData();
      const result = await runInference(
        imageData,
        modelVersion,
        MODEL_FILE(modelVersion)
      );
      setPrediction(result);
    } catch (err) {
      console.error(err);
      setError(
        "Failed to run inference. The model may still be loading — try again in a moment."
      );
    } finally {
      setSubmitting(false);
    }
  }, [modelVersion]);

  const handleDraw = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => performInference(), 250);
  }, [performInference]);

  const handleModelChange = useCallback(
    (v: string) => {
      if (v === modelVersion) return;
      setPrediction(null);
      setModelVersion(v);
      warmupModel(v);
    },
    [modelVersion, warmupModel]
  );

  return (
    <div className="bg-[#18120c]">
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold text-[#eee0d5] p-2">
            Aksara Jawa{" "}
            <span className="bg-gradient-to-r from-amber-500">
              Recognizer
            </span>
          </h1>
          <hr className="border-zinc-800" />
          <p className="mx-auto mt-2 max-w-3xl text-sm text-[#eee0d5] sm:text-base">
            Handwrite an Aksara Jawa character and the AI will recognize it.
            Powered by MobileNetV2 fine-tuned on the Chinese handwritten character
            backbone — running entirely in your browser.
          </p>
        </div>

        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#eee0d5]">
              Choose model version
            </h2>
            <span className="text-xs text-[#eee0d5]">
              V3.2 is the most accurate
            </span>
          </div>
          <ModelSelector
            value={modelVersion}
            onChange={handleModelChange}
            loadingVersions={loadingVersions}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900 sm:p-6">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
              <svg
                className="h-5 w-5 text-amber-600"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <path d="M12 8v8M8 12h8" />
              </svg>
              Drawing pad
            </h2>
            <div className="flex justify-center">
              <DrawingCanvas ref={canvasRef} onDraw={handleDraw} />
            </div>
            <p className="mt-3 text-center text-xs text-zinc-400">
              Tip: draw with your mouse or finger. Inference runs automatically
              when you finish.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900 sm:p-6">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
              <svg
                className="h-5 w-5 text-amber-600"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 12a9 9 0 1 0 9-9" />
                <path d="M3 12h9M3 12v3M3 12v-3" />
                <path d="M6 15v2M9 14v3" />
              </svg>
              Prediction
            </h2>
            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300">
                {error}
              </div>
            ) : (
              <PredictionResults
                prediction={prediction}
                submitting={submitting}
                modelLabel={activeModel?.label ?? modelVersion}
              />
            )}
          </div>
        </div>

        <div className="mt-6">
          <CharacterChart />
        </div>

        <footer className="mt-10 border-t border-zinc-800 pt-6 text-center text-xs text-[#eee0d5]">
          Runs 100% client-side with ONNX Runtime Web · Models: MobileNetV2 (HCCR
          backbone) fine-tuned on 20 Aksara Jawa characters · V1 → V3.2
        </footer>
      </main>
    </div>
  );
}