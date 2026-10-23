declare module "subset-font" {
  /** Subset a font (TTF/OTF/WOFF/WOFF2) to the glyphs needed for `text` (HarfBuzz). */
  export default function subsetFont(
    font: Buffer | Uint8Array,
    text: string,
    options?: { targetFormat?: "sfnt" | "woff" | "woff2" | "truetype"; preserveNameIds?: number[]; variationAxes?: Record<string, number | { min: number; max: number; default?: number }> },
  ): Promise<Buffer>;
}
