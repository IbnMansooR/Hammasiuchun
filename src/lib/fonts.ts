// Helpers for rendering the type library on the web.

export type StyleLite = { style: string; weight: number; italic: boolean };

export const CATEGORIES = [
  "Sans", "Serif", "Slab", "Display", "Script", "Monospace", "Dingbat",
] as const;

export const CATEGORY_LABEL: Record<string, string> = {
  Sans: "Sans-serif",
  Serif: "Serif",
  Slab: "Slab-serif",
  Display: "Display",
  Script: "Qo'lyozma",
  Monospace: "Monospace",
  Dingbat: "Belgilar",
};

export const SORTS: Record<string, string> = {
  popular: "Ommabop",
  az: "A–Z",
  za: "Z–A",
  styles: "Ko'p uslub",
  new: "Yangi",
};

/** CSS font-family token for a family (weight/style-resolved). */
export function cssFamily(slug: string): string {
  return `ff-${slug}`;
}

/** Unique CSS font-family token for ONE specific cut — avoids width-variant
 * collisions (e.g. "Bold" vs "Condensed Bold" both weight 700 upright). */
export function styleFamily(slug: string, style: string): string {
  return `ff-${slug}-${style.replace(/[^A-Za-z0-9]/g, "")}`;
}

/** On-demand webfont URL served by /api/webfont. */
export function webfontUrl(slug: string, style: string): string {
  return `/api/webfont/${encodeURIComponent(slug)}/${encodeURIComponent(style)}`;
}

/** Build @font-face declarations for a family's styles (shared family name). */
export function fontFaceCSS(slug: string, styles: StyleLite[]): string {
  return styles
    .map(
      (s) =>
        `@font-face{font-family:"${cssFamily(slug)}";` +
        `src:url("${webfontUrl(slug, s.style)}") format("woff2");` +
        `font-weight:${s.weight};font-style:${s.italic ? "italic" : "normal"};font-display:swap;}`,
    )
    .join("");
}

/** Build @font-face declarations where EACH cut gets a unique family, so cuts
 * that share weight+style (e.g. width variants) render distinctly. */
export function fontFaceCSSPerStyle(slug: string, styles: StyleLite[]): string {
  return styles
    .map(
      (s) =>
        `@font-face{font-family:"${styleFamily(slug, s.style)}";` +
        `src:url("${webfontUrl(slug, s.style)}") format("woff2");` +
        `font-weight:${s.weight};font-style:${s.italic ? "italic" : "normal"};font-display:swap;}`,
    )
    .join("");
}

/** Pick the most "regular" style for previews. Returns undefined for no styles. */
export function previewStyle(styles: StyleLite[]): StyleLite | undefined {
  const upright = styles.filter((s) => !s.italic);
  const pool = upright.length ? upright : styles;
  return (
    pool.find((s) => s.weight === 400) ??
    pool.slice().sort((a, b) => Math.abs(a.weight - 400) - Math.abs(b.weight - 400))[0] ??
    styles[0]
  );
}

export const WEIGHT_LABEL: Record<number, string> = {
  100: "Thin", 200: "ExtraLight", 300: "Light", 350: "SemiLight", 400: "Regular",
  500: "Medium", 600: "SemiBold", 700: "Bold", 800: "ExtraBold", 900: "Black", 950: "ExtraBlack",
};

export const PANGRAM = "The quick brown fox jumps over the lazy dog";
export const ALPHABET = "AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz";
