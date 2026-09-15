"use client";

import { MODEL_VERSIONS } from "@/lib/models";

interface ModelSelectorProps {
  value: string;
  onChange: (version: string) => void;
  loadingVersions: string[];
}

export default function ModelSelector({
  value,
  onChange,
  loadingVersions,
}: ModelSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {MODEL_VERSIONS.map((v) => {
        const active = value === v.id;
        const loading = loadingVersions.includes(v.id);
        return (
          <button
            key={v.id}
            type="button"
            onClick={() => onChange(v.id)}
            className={`group relative flex flex-col items-start gap-1 rounded-xl border px-3 py-2.5 text-left transition ${
              active
                ? "border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/30"
                : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            }`}
          >
            <span
              className={`text-sm font-bold ${
                active
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-zinc-900 dark:text-zinc-100"
              }`}
            >
              Model {v.label}
            </span>
            <span className="text-[11px] leading-tight text-zinc-500 dark:text-zinc-400">
              {v.description}
            </span>
            {v.recommended && (
              <span className="absolute right-2 top-2 inline-flex items-center rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                BEST
              </span>
            )}
            {loading && (
              <span className="absolute right-2 top-2 h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            )}
          </button>
        );
      })}
    </div>
  );
}