// One-off script: dry-run pdfjs-dist Node build.
// Run from the project root: `node scripts/pdfjs-dryrun.mjs`
import { createRequire } from "node:module";
import path from "node:path";
import url from "node:url";

const here = path.dirname(url.fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, "..", "package.json"));

let pdfjsOk = false;
let pdfjsErr = null;
try {
  const pdfjs = require("pdfjs-dist/legacy/build/pdf.mjs");
  if (typeof pdfjs.getDocument !== "function") {
    throw new Error("getDocument is not a function on the legacy build");
  }
  if (!("GlobalWorkerOptions" in pdfjs)) {
    throw new Error("GlobalWorkerOptions is missing on the legacy build");
  }
  pdfjsOk = true;
} catch (e) {
  pdfjsErr = e instanceof Error ? e.message : String(e);
}

let sharpOk = false;
let sharpErr = null;
try {
  const sharpMod = require("sharp");
  const sharp = sharpMod.default ?? sharpMod;
  const meta = sharp({ create: { width: 1, height: 1, channels: 3, background: "#fff" } });
  if (typeof meta.png !== "function") {
    throw new Error("sharp().png() missing");
  }
  sharpOk = true;
} catch (e) {
  sharpErr = e instanceof Error ? e.message : String(e);
}

console.log(JSON.stringify({ pdfjs: { ok: pdfjsOk, err: pdfjsErr }, sharp: { ok: sharpOk, err: sharpErr } }, null, 2));
process.exit(pdfjsOk && sharpOk ? 0 : 1);
