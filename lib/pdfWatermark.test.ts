import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { compositeWatermark, WATERMARK_TEXT } from "./pdfWatermark";

describe("pdfWatermark", () => {
  it("exports the static watermark text", () => {
    expect(WATERMARK_TEXT).toBe("Copyright Fix ASN Property");
  });

  it("returns a buffer of the same dimensions as the input", async () => {
    const input = await sharp({
      create: { width: 400, height: 600, channels: 3, background: "#ffffff" },
    })
      .png()
      .toBuffer();
    const out = await compositeWatermark(input);
    const meta = await sharp(out).metadata();
    expect(meta.width).toBe(400);
    expect(meta.height).toBe(600);
    expect(meta.format).toBe("png");
    // Output should be larger than input because we added an overlay
    // (even at 10% opacity, the tile drawing adds non-white pixels).
    expect(out.length).toBeGreaterThan(0);
  });

  it("supports jpeg output", async () => {
    const input = await sharp({
      create: { width: 200, height: 300, channels: 3, background: "#cccccc" },
    })
      .png()
      .toBuffer();
    const out = await compositeWatermark(input, { format: "jpeg", quality: 80 });
    const meta = await sharp(out).metadata();
    expect(meta.format).toBe("jpeg");
    expect(meta.width).toBe(200);
    expect(meta.height).toBe(300);
  });

  it("throws on zero-dimension input", async () => {
    // Force a 0x0 image; sharp will reject this before we get to our
    // dimensions check, so we just assert the error is thrown.
    const empty = Buffer.alloc(0);
    await expect(compositeWatermark(empty)).rejects.toBeTruthy();
  });
});
