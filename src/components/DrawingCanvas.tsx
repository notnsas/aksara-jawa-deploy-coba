"use client";

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  forwardRef,
} from "react";

export interface DrawingCanvasHandle {
  clear: () => void;
  getImageData: () => ImageData;
  isEmpty: () => boolean;
}

interface DrawingCanvasProps {
  onDraw?: () => void;
}

const CANVAS_PIXELS = 256;

const DrawingCanvas = forwardRef<DrawingCanvasHandle, DrawingCanvasProps>(
  function DrawingCanvas({ onDraw }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawingRef = useRef(false);
    const lastPointRef = useRef<{ x: number; y: number } | null>(null);
    const [isEmptyCanvas, setIsEmptyCanvas] = useState(true);

    const getContext = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      return canvas.getContext("2d", { willReadFrequently: true });
    }, []);

    useEffect(() => {
      const ctx = getContext();
      if (!ctx) return;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, CANVAS_PIXELS, CANVAS_PIXELS);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 8;
    }, [getContext]);

    const getPos = (e: React.PointerEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((e.clientX - rect.left) / rect.width) * CANVAS_PIXELS,
        y: ((e.clientY - rect.top) / rect.height) * CANVAS_PIXELS,
      };
    };

    const startDraw = (e: React.PointerEvent) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.setPointerCapture(e.pointerId);
      drawingRef.current = true;
      const pos = getPos(e);
      lastPointRef.current = pos;
      setIsEmptyCanvas(false);
      if (onDraw) onDraw();
    };

    const moveDraw = (e: React.PointerEvent) => {
      if (!drawingRef.current) return;
      e.preventDefault();
      const ctx = getContext();
      const pos = getPos(e);
      const last = lastPointRef.current;
      if (!ctx || !pos || !last) return;
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      lastPointRef.current = pos;
      if (onDraw) onDraw();
    };

    const endDraw = () => {
      drawingRef.current = false;
      lastPointRef.current = null;
      if (onDraw) onDraw();
    };

    const clear = useCallback(() => {
      const ctx = getContext();
      if (!ctx) return;
      ctx.save();
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, CANVAS_PIXELS, CANVAS_PIXELS);
      ctx.restore();
      setIsEmptyCanvas(true);
    }, [getContext]);

    const getImageData = useCallback((): ImageData => {
      const canvas = canvasRef.current;
      if (!canvas) return new ImageData(1, 1);
      return canvas
        .getContext("2d", { willReadFrequently: true })!
        .getImageData(0, 0, CANVAS_PIXELS, CANVAS_PIXELS);
    }, []);

    const isEmpty = useCallback(() => {
      const ctx = getContext();
      if (!ctx) return true;
      const data = ctx.getImageData(0, 0, CANVAS_PIXELS, CANVAS_PIXELS).data;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] < 220) return false;
      }
      return true;
    }, [getContext]);

    useImperativeHandle(
      ref,
      () => ({ clear, getImageData, isEmpty }),
      [clear, getImageData, isEmpty]
    );

    return (
      <div className="flex flex-col items-center gap-3">
        <div className="relative rounded-2xl p-1 shadow-[0_8px_40px_-8px_rgba(0,0,0,0.25)] ring-1 ring-black/5 dark:ring-white/10">
          <canvas
            ref={canvasRef}
            width={CANVAS_PIXELS}
            height={CANVAS_PIXELS}
            onPointerDown={startDraw}
            onPointerMove={moveDraw}
            onPointerUp={endDraw}
            onPointerLeave={endDraw}
            className="h-[340px] w-[320px] cursor-crosshair touch-none rounded-xl bg-white sm:h-[400px] sm:w-[400px]"
          />
          {isEmptyCanvas && (
            <div className="pointer-events-none absolute inset-2 flex items-center justify-center rounded-xl">
              <div className="rounded-full bg-zinc-900/5 px-4 py-2 text-center text-sm text-zinc-500 dark:bg-white/5 dark:text-zinc-400">
                Draw an Aksara Jawa character here
              </div>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={clear}
          className="inline-flex items-center gap-2 rounded-full border border-zinc-200 px-5 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 active:scale-[0.98] dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          Clear (or erase with right-click)
        </button>
      </div>
    );
  }
);

export default DrawingCanvas;