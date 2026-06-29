// ─────────────────────────────────────────────
// pdfWatermark
// Server-side image compositing using sharp. The overlay is the static
// string "Copyright Fix ASN Property", tiled across the page at 30°
// rotation, ~10% opacity. Because the overlay is identical for every
// request, the output can be aggressively cached.
// ─────────────────────────────────────────────
import sharp from "sharp";

export const WATERMARK_TEXT = "Copyright Fix ASN Property";

/**
 * Build a transparent SVG with tiled, rotated text. The SVG is sized
 * to match the input image so the tiles cover the entire page.
 */
function buildOverlaySvg(width: number, height: number): Buffer {
  // Pick a tile size proportional to the shorter edge so we get
  // a reasonable number of tiles on any aspect ratio.
  const short = Math.max(120, Math.min(width, height));
  const tile = Math.round(short / 3);
  const fontSize = Math.max(14, Math.round(short / 28));

  // Build one tile as a group with the text at the center, rotated 30°,
  // semi-transparent dark gray. We repeat it across an SVG sized to the
  // input page so sharp's tile composite covers everything. Sharp's
  // composite requires the overlay dimensions to be <= the base
  // dimensions, so we size the SVG to the input width/height exactly
  // and let tiles overflow visually via the rotation transform.
  const cell = tile;
  const cols = Math.ceil(width / cell) + 1;
  const rows = Math.ceil(height / cell) + 1;

  const tiles: string[] = [];
  for (let r = -1; r < rows; r++) {
    for (let c = -1; c < cols; c++) {
      const cx = c * cell + cell / 2;
      const cy = r * cell + cell / 2;
      tiles.push(
        `<g transform="translate(${cx} ${cy}) rotate(-30)">` +
          `<text x="0" y="0" text-anchor="middle" ` +
          `dominant-baseline="middle" ` +
          `font-family="Arial, Helvetica, sans-serif" ` +
          `font-size="${fontSize}" font-weight="700" ` +
          `fill="rgba(15,23,42,0.10)">${WATERMARK_TEXT}</text>` +
        `</g>`
      );
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${tiles.join("")}</svg>`;
  return Buffer.from(svg, "utf8");
}

export interface CompositeOptions {
  /** JPEG/PNG quality 1-100; ignored for PNG output. */
  quality?: number;
  /** Output format. Default png. */
  format?: "png" | "jpeg" | "webp";
}

/**
 * Composite the static watermark over `inputPng` and return the
 * composited buffer. Output dimensions match the input.
 */
export async function compositeWatermark(
  inputPng: Buffer,
  options: CompositeOptions = {}
): Promise<Buffer> {
  const meta = await sharp(inputPng).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (width <= 0 || height <= 0) {
    throw new Error("Input image has zero or unknown dimensions");
  }

  const overlay = buildOverlaySvg(width, height);
  const format = options.format ?? "png";

  let pipeline = sharp(inputPng).composite([
    { input: overlay, gravity: "northwest" },
  ]);

  if (format === "png") {
    pipeline = pipeline.png();
  } else if (format === "jpeg") {
    pipeline = pipeline.jpeg({ quality: options.quality ?? 85 });
  } else {
    pipeline = pipeline.webp({ quality: options.quality ?? 85 });
  }

  return pipeline.toBuffer();
}
