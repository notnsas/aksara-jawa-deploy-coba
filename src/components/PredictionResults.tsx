"use client";

import type { Prediction } from "@/lib/inference";
import { CHAR_INFO, type AksaraClass } from "@/lib/models";

interface PredictionResultsProps {
  prediction: Prediction | null;
  submitting: boolean;
  modelLabel: string;
}

function ConfidenceBar({
  className,
  probability,
  rank,
}: {
  className: string;
  probability: number;
  rank: number;
}) {
  const info = CHAR_INFO[className as AksaraClass];
  const pct = (probability * 100).toFixed(1);
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="flex w-24 shrink-0 items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-base shadow-sm ring-1 ring-black/5 dark:bg-zinc-800 dark:ring-white/10">
          {info.aksara}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {className}
          </div>
        </div>
      </div>
      <div className="h-3 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            rank === 0
              ? "bg-gradient-to-r from-amber-500 to-amber-400"
              : "bg-gradient-to-r from-zinc-400 to-zinc-300 dark:from-zinc-600 dark:to-zinc-500"
          }`}
          style={{ width: `${Math.max(2, probability * 100)}%` }}
        />
      </div>
      <span className="w-12 shrink-0 text-right text-sm font-mono tabular-nums text-zinc-600 dark:text-zinc-400">
        {pct}%
      </span>
    </div>
  );
}

export default function PredictionResults({
  prediction,
  submitting,
  modelLabel,
}: PredictionResultsProps) {
  if (submitting) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-amber-500 dark:border-zinc-700 dark:border-t-amber-400" />
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Analyzing drawing...
        </p>
      </div>
    );
  }

  if (!prediction) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
        <span className="text-4xl">✍️</span>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Draw a character and release to see the prediction.
        </p>
      </div>
    );
  }

  const info = CHAR_INFO[prediction.className as AksaraClass];

  return (
    <div className="space-y-4 pt-2">
      <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 p-[1px]">
        <div className="flex items-center justify-between rounded-[calc(1rem-1px)] bg-white/95 px-5 py-4 dark:bg-zinc-900/95">
          <div>
            <p className="text-xs font-medium tracking-wide text-amber-600 uppercase dark:text-amber-400">
              Predicted character
            </p>
            <div className="mt-1 flex items-center gap-3">
              <span className="text-4xl leading-none">{info.aksara}</span>
              <div>
                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  {prediction.className}
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {info.name}
                </p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">
              {(prediction.confidence * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              confidence
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-700">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Top predictions
          </h3>
          <div className="flex items-center gap-3 text-[11px] text-zinc-400">
            <span>Model {modelLabel}</span>
            <span>·</span>
            <span>{prediction.latencyMs.toFixed(0)} ms</span>
          </div>
        </div>
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {prediction.probabilities.map((p, i) => (
            <ConfidenceBar
              key={p.className}
              className={p.className}
              probability={p.probability}
              rank={i}
            />
          ))}
        </div>
      </div>
    </div>
  );
}