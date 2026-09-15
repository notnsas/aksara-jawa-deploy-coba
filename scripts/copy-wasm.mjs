// Copies onnxruntime-web runtime files into public/ort/ so the
// browser can load them locally (no CDN needed).
//
// The WASM loader in ORT-web dynamically imports .mjs glue files for
// each backend variant (wasm, jsep, jspi, asyncify). We copy all the
// small .mjs glue files (~24-52 KB each) but only the main .wasm binary
// (14 MB). The large backend-specific .wasm files (jsep 28 MB, jspi 16 MB,
// asyncify 26 MB) are NOT copied — they would only be used if the
// corresponding backend is actually selected.
import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "node_modules", "onnxruntime-web", "dist");
const DEST = join(ROOT, "public", "ort");

if (!existsSync(SRC)) {
  console.error("onnxruntime-web not installed. Run `npm install` first.");
  process.exit(0);
}

mkdirSync(DEST, { recursive: true });

let copied = 0;
for (const file of readdirSync(SRC)) {
  const isWasm = file.endsWith(".wasm");
  const isMjs = file.endsWith(".mjs");

  if (!isWasm && !isMjs) continue;

  // Skip the large backend-specific WASM binaries (> 15 MB).
  // Only keep the core threaded SIMD WASM (14 MB).
  if (isWasm && file !== "ort-wasm-simd-threaded.wasm") continue;

  // Skip the giant ORT bundles (ort.all.*, ort.min.*, ort.webgl.*, etc.)
  if (isMjs && !file.startsWith("ort-wasm-simd-threaded.")) continue;

  copyFileSync(join(SRC, file), join(DEST, file));
  copied++;
  console.log(`  ${file}`);
}

console.log(`\nCopied ${copied} ORT runtime files to public/ort/`);
