"use client";

import { useState } from "react";
import { CLASS_NAMES, CHAR_INFO, type AksaraClass } from "@/lib/models";

export default function CharacterChart() {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
            Aksara Jawa Reference
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            The 20 characters this model recognizes
          </p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 px-4 py-1.5 text-xs font-medium bg-white"
        >
          {expanded ? "Show fewer" : "Show all 20"}
          <svg
            className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 lg:grid-cols-5">
        {CLASS_NAMES.slice(0, expanded ? 20 : 10).map((name) => {
          const info = CHAR_INFO[name as AksaraClass];
          return (
            <div
              key={name}
              className="group flex flex-col items-center gap-1 rounded-xl border border-zinc-100 bg-zinc-50/50 px-2 py-3 transition hover:border-amber-300 hover:bg-amber-50/50 dark:border-zinc-800 dark:bg-zinc-800/50 dark:hover:border-amber-500/40 dark:hover:bg-zinc-800"
            >
              <span className="text-2xl leading-none text-white">{info.aksara}</span>
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                {name}
              </span>
              <span className="text-[10px] text-zinc-400">{info.name}</span>
            </div>
          );
        })}
      </div>

      {!expanded && (
        <p className="mt-3 text-center text-xs text-zinc-400">
          Click &ldquo;Show all 20&rdquo; to see the full character set
        </p>
      )}
    </section>
  );
}