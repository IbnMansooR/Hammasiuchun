// "Which font is this?": a picture of a line of text plus the text itself → the closest fonts of ours.
// No AI: the picture is turned into black and white, cut into letters (connected components), and
// every candidate font draws the same letters; the shapes are compared (how the letter looks, how
// wide it is, where its top and bottom sit in the line, how heavy the ink is). When the picture can't
// be cut into exactly the typed letters (touching or broken letters), the whole line is compared.
// A font we don't have simply gets low scores everywhere: the best of what we have are the lookalikes.
import sharp from "sharp";
import type * as fontkit from "fontkit";
import { db } from "./db";
import { PUBLIC_FAMILY } from "./license";
import { readFont } from "./storage";
import { staticFont } from "./fontSamples";

export const FIND_TEXT_MAX = 40;
const LW = 32; // a letter is compared as a 32×32 bitmap
const LINE_H = 40; // a line as 40 px high

/* ---------------- rasterizing a glyph outline ---------------- */

type Pt = [number, number];
type Box = { x0: number; y0: number; x1: number; y1: number };

function flatten(g: fontkit.Glyph, ox: number, oy: number, out: Pt[][]) {
  let cur: Pt[] = [];
  let px = 0, py = 0;
  const push = (x: number, y: number) => cur.push([ox + x, oy + y]);
  for (const c of g.path.commands) {
    const a = c.args as number[];
    if (c.command === "moveTo") { if (cur.length > 1) out.push(cur); cur = []; push(a[0], a[1]); px = a[0]; py = a[1]; }
    else if (c.command === "lineTo") { push(a[0], a[1]); px = a[0]; py = a[1]; }
    else if (c.command === "quadraticCurveTo") {
      for (let i = 1; i <= 8; i++) { const t = i / 8, u = 1 - t; push(u * u * px + 2 * u * t * a[0] + t * t * a[2], u * u * py + 2 * u * t * a[1] + t * t * a[3]); }
      px = a[2]; py = a[3];
    } else if (c.command === "bezierCurveTo") {
      for (let i = 1; i <= 10; i++) { const t = i / 10, u = 1 - t; push(u * u * u * px + 3 * u * u * t * a[0] + 3 * u * t * t * a[2] + t * t * t * a[4], u * u * u * py + 3 * u * u * t * a[1] + 3 * u * t * t * a[3] + t * t * t * a[5]); }
      px = a[4]; py = a[5];
    } else if (c.command === "closePath") { if (cur.length > 1) out.push(cur); cur = []; }
  }
  if (cur.length > 1) out.push(cur);
}

function addSpan(out: Float32Array, base: number, xa: number, xb: number, W: number, w: number) {
  xa = Math.max(0, xa); xb = Math.min(W, xb);
  if (xb <= xa) return;
  const i = Math.floor(xa), j = Math.floor(xb);
  if (i === j) { out[base + i] += (xb - xa) * w; return; }
  out[base + i] += (i + 1 - xa) * w;
  for (let k = i + 1; k < j; k++) out[base + k] += w;
  if (j < W) out[base + j] += (xb - j) * w;
}

/** Fill the outlines (non-zero winding) into W×H, stretching `box` over the whole bitmap. */
function rasterize(polys: Pt[][], box: Box, W: number, H: number): Float32Array {
  const out = new Float32Array(W * H);
  const sx = W / (box.x1 - box.x0 || 1), sy = H / (box.y1 - box.y0 || 1);
  const edges: number[][] = [];
  for (const p of polys) for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p[(i + 1) % p.length];
    const X0 = (a[0] - box.x0) * sx, Y0 = H - (a[1] - box.y0) * sy, X1 = (b[0] - box.x0) * sx, Y1 = H - (b[1] - box.y0) * sy;
    if (Y0 !== Y1) edges.push([X0, Y0, X1, Y1]);
  }
  const S = 4;
  for (let row = 0; row < H * S; row++) {
    const y = (row + 0.5) / S;
    const xs: number[][] = [];
    for (const [X0, Y0, X1, Y1] of edges) {
      if (y < Math.min(Y0, Y1) || y >= Math.max(Y0, Y1)) continue;
      xs.push([X0 + ((y - Y0) * (X1 - X0)) / (Y1 - Y0), Y1 > Y0 ? 1 : -1]);
    }
    xs.sort((p, q) => p[0] - q[0]);
    let wind = 0;
    const base = Math.floor(row / S) * W;
    for (let i = 0; i < xs.length - 1; i++) { wind += xs[i][1]; if (wind !== 0) addSpan(out, base, xs[i][0], xs[i + 1][0], W, 1 / S); }
  }
  for (let i = 0; i < out.length; i++) if (out[i] > 1) out[i] = 1;
  return out;
}

/* ---------------- a font's letters and line ---------------- */

type Letter = { bm: Float32Array; aspect: number; top: number; bottom: number };
type Candidate = { slug: string; name: string; category: string; font: fontkit.Font };

const letterCache = new Map<string, Letter | null>();
function letterOf(c: Candidate, key: string, ch: string): Letter | null {
  const k = `${key}|${ch}`;
  if (letterCache.has(k)) return letterCache.get(k)!;
  if (letterCache.size > 20_000) letterCache.clear();
  let res: Letter | null = null;
  const g = c.font.glyphForCodePoint(ch.codePointAt(0)!);
  if (g && g.path.commands.length) {
    const b = g.bbox;
    const w = b.maxX - b.minX, h = b.maxY - b.minY;
    if (w > 0 && h > 0) {
      const polys: Pt[][] = [];
      flatten(g, 0, 0, polys);
      res = { bm: rasterize(polys, { x0: b.minX, y0: b.minY, x1: b.maxX, y1: b.maxY }, LW, LW), aspect: w / h, top: b.maxY, bottom: b.minY };
    }
  }
  letterCache.set(k, res);
  return res;
}

function lineOf(font: fontkit.Font, text: string): { bm: Float32Array; w: number; aspect: number } | null {
  const run = font.layout(text);
  const polys: Pt[][] = [];
  let x = 0;
  run.glyphs.forEach((g, i) => {
    const p = run.positions[i];
    flatten(g, x + (p.xOffset || 0), p.yOffset || 0, polys);
    x += p.xAdvance;
  });
  if (!polys.length) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of polys) for (const [a, b] of p) { x0 = Math.min(x0, a); x1 = Math.max(x1, a); y0 = Math.min(y0, b); y1 = Math.max(y1, b); }
  const aspect = (x1 - x0) / (y1 - y0 || 1);
  const w = Math.max(16, Math.min(480, Math.round(LINE_H * aspect)));
  return { bm: rasterize(polys, { x0, y0, x1, y1 }, w, LINE_H), w, aspect };
}

/* ---------------- the picture ---------------- */

type Comp = { id: number; minX: number; maxX: number; minY: number; maxY: number; area: number; ids: number[] };
type Ink = { labels: Int32Array; w: number; h: number; comps: Comp[] };

/** Black-and-white: ink is whatever differs from the background (the border's median), by Otsu's threshold. */
export async function readInk(buf: Buffer): Promise<Ink | null> {
  let raw: { data: Buffer; info: { width: number; height: number } };
  try {
    raw = await sharp(buf, { failOn: "none", limitInputPixels: 50e6 }).rotate().flatten({ background: "#ffffff" }).resize({ width: 1200, height: 1200, fit: "inside" }).greyscale().raw().toBuffer({ resolveWithObject: true });
  } catch {
    return null;
  }
  const { data, info } = raw;
  const w = info.width, h = info.height;
  if (w < 24 || h < 12) return null;
  const border: number[] = [];
  for (let x = 0; x < w; x += 3) { border.push(data[x], data[(h - 1) * w + x]); }
  for (let y = 0; y < h; y += 3) { border.push(data[y * w], data[y * w + w - 1]); }
  border.sort((a, b) => a - b);
  const bg = border[border.length >> 1];
  const hist = new Array<number>(256).fill(0);
  for (let i = 0; i < data.length; i++) hist[Math.abs(data[i] - bg)]++;
  // Otsu on the difference histogram
  const total = data.length;
  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * hist[t];
  let wB = 0, sumB = 0, best = 0, thr = 40;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (!wB) continue;
    const wF = total - wB;
    if (!wF) break;
    sumB += t * hist[t];
    const v = wB * wF * (sumB / wB - (sum - sumB) / wF) ** 2;
    if (v > best) { best = v; thr = t; }
  }
  thr = Math.max(thr, 36);
  const ink = new Uint8Array(total);
  for (let i = 0; i < total; i++) ink[i] = Math.abs(data[i] - bg) > thr ? 1 : 0;
  // connected components (8 neighbours)
  const labels = new Int32Array(total);
  const comps: Comp[] = [];
  const stack: number[] = [];
  for (let s = 0; s < total; s++) {
    if (!ink[s] || labels[s]) continue;
    const id = comps.length + 1;
    const c: Comp = { id, minX: w, maxX: 0, minY: h, maxY: 0, area: 0, ids: [id] };
    stack.push(s); labels[s] = id;
    while (stack.length) {
      const p = stack.pop()!;
      const x = p % w, y = (p / w) | 0;
      c.area++; if (x < c.minX) c.minX = x; if (x > c.maxX) c.maxX = x; if (y < c.minY) c.minY = y; if (y > c.maxY) c.maxY = y;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const q = ny * w + nx;
        if (ink[q] && !labels[q]) { labels[q] = id; stack.push(q); }
      }
    }
    comps.push(c);
    if (comps.length > 4000) return null; // a photograph, not a line of text
  }
  return { labels, w, h, comps };
}

const median = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return s[s.length >> 1] ?? 0; };
const unite = (a: Comp, b: Comp): Comp => ({ id: a.id, minX: Math.min(a.minX, b.minX), maxX: Math.max(a.maxX, b.maxX), minY: Math.min(a.minY, b.minY), maxY: Math.max(a.maxY, b.maxY), area: a.area + b.area, ids: [...a.ids, ...b.ids] });

/** The main line of text as letters left to right (dots, accents and ʻ marks joined to their letter). */
export function cutLine(ink: Ink, want = 0): Comp[] | null {
  let comps = ink.comps.filter((c) => c.area >= 8);
  if (comps.length < 2) return null;
  const maxH = Math.max(...comps.map((c) => c.maxY - c.minY + 1));
  const medH = median(comps.filter((c) => c.maxY - c.minY + 1 > maxH * 0.3).map((c) => c.maxY - c.minY + 1));
  // the line: components whose centres lie near each other vertically; the heaviest group wins
  const sorted = [...comps].sort((a, b) => a.minY + a.maxY - (b.minY + b.maxY));
  const groups: Comp[][] = [];
  for (const c of sorted) {
    const g = groups[groups.length - 1];
    const yc = (c.minY + c.maxY) / 2;
    if (g && yc - (g[0].minY + g[0].maxY) / 2 < medH * 0.7) g.push(c); else groups.push([c]); // measured from the line's first piece, so stacked small lines don't chain into one
  }
  // a picture can hold several lines: take the one that has as many letters as the typed text (else the heaviest)
  const weight = (g: Comp[]) => g.reduce((s, c) => s + c.area, 0);
  // side-by-side columns share a band, so each stretch cut off by a wide gap is a candidate too
  const pieces: Comp[][] = [];
  for (const g of groups.filter((g) => g.length >= 2).sort((a, b) => weight(b) - weight(a)).slice(0, 8)) {
    pieces.push(g);
    const byX = [...g].sort((a, b) => a.minX - b.minX);
    let seg: Comp[] = [byX[0]], reach = byX[0].maxX;
    const segs: Comp[][] = [];
    for (const c of byX.slice(1)) {
      if (c.minX - reach > medH * 1.0) { segs.push(seg); seg = [c]; } else seg.push(c);
      reach = Math.max(reach, c.maxX);
    }
    segs.push(seg);
    if (segs.length > 1) for (const sg of segs) if (sg.length >= 2) pieces.push(sg);
  }
  const lines = pieces.map((g) => lettersOf(g, medH)).filter((l): l is Comp[] => !!l);
  if (!lines.length) return null;
  if (!want) return lines[0];
  // touching letters make a line look shorter than it is, so a line with a few too few letters stays in the running;
  // among near-equal ones the bigger type wins (the text people ask about is rarely the small print)
  const dist = (l: Comp[]) => (l.length < want ? want - l.length + 0.5 : l.length - want);
  const hOf = (l: Comp[]) => median(l.map((c) => c.maxY - c.minY + 1));
  const bestD = Math.min(...lines.map(dist));
  return lines.filter((l) => dist(l) <= bestD + 0.6).reduce((best, l) => (hOf(l) > hOf(best) ? l : best));
}

/** One line's pieces as letters, left to right (dots, accents and ʻ marks joined to their letter). */
function lettersOf(group: Comp[], medH: number): Comp[] | null {
  const comps = [...group].sort((a, b) => a.minX - b.minX);
  const out: Comp[] = [];
  for (const c of comps) {
    const last = out[out.length - 1];
    if (last) {
      const overlap = Math.min(last.maxX, c.maxX) - Math.max(last.minX, c.minX) + 1;
      if (overlap > 0.4 * Math.min(last.maxX - last.minX + 1, c.maxX - c.minX + 1)) { out[out.length - 1] = unite(last, c); continue; }
    }
    out.push(c);
  }
  const kept = out.filter((c) => c.maxY - c.minY + 1 >= medH * 0.4); // punctuation is not a letter
  return kept.length >= 2 ? kept : null;
}

/** A set of components as an area-averaged W×H bitmap of their bounding box. */
function bitmapOf(ink: Ink, set: Comp[], box: Comp, W: number, H: number): Float32Array {
  const member = new Uint8Array(ink.comps.length + 1);
  for (const c of set) for (const id of c.ids) member[id] = 1;
  const out = new Float32Array(W * H);
  const bw = box.maxX - box.minX + 1, bh = box.maxY - box.minY + 1;
  for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) {
    const xa = box.minX + Math.floor((tx * bw) / W), xb = box.minX + Math.max(Math.floor(((tx + 1) * bw) / W), Math.floor((tx * bw) / W) + 1);
    const ya = box.minY + Math.floor((ty * bh) / H), yb = box.minY + Math.max(Math.floor(((ty + 1) * bh) / H), Math.floor((ty * bh) / H) + 1);
    let n = 0, s = 0;
    for (let y = ya; y < yb && y < ink.h; y++) for (let x = xa; x < xb && x < ink.w; x++) { n++; if (member[ink.labels[y * ink.w + x]]) s++; }
    out[ty * W + tx] = n ? s / n : 0;
  }
  return out;
}

/* ---------------- comparing ---------------- */

function blur(a: Float32Array, W: number, H: number): Float32Array {
  const tmp = new Float32Array(a.length), out = new Float32Array(a.length);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let s = 0, n = 0;
    for (let d = -1; d <= 1; d++) { const xx = x + d; if (xx >= 0 && xx < W) { s += a[y * W + xx]; n++; } }
    tmp[y * W + x] = s / n;
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let s = 0, n = 0;
    for (let d = -1; d <= 1; d++) { const yy = y + d; if (yy >= 0 && yy < H) { s += tmp[yy * W + x]; n++; } }
    out[y * W + x] = s / n;
  }
  return out;
}
const mad = (a: Float32Array, b: Float32Array) => { let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / a.length; };
const mean = (a: Float32Array) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i]; return s / a.length; };

/* ---------------- the candidates ---------------- */

const fontCache = new Map<string, fontkit.Font | null>();
async function loadFont(folder: string, file: string): Promise<fontkit.Font | null> {
  const k = `${folder}/${file}`;
  if (fontCache.has(k)) return fontCache.get(k)!;
  if (fontCache.size > 300) fontCache.clear();
  const data = await readFont(folder, file).catch(() => null);
  const f = data && data.length < 8_000_000 ? staticFont(data) : null;
  fontCache.set(k, f);
  return f;
}

type Styled = { style: string; weight: number; italic: boolean; file: string };
function pickStyles(styles: Styled[]): Styled[] {
  const nearest = (list: Styled[], w: number) => [...list].sort((a, b) => Math.abs(a.weight - w) - Math.abs(b.weight - w))[0];
  const up = styles.filter((s) => !s.italic), it = styles.filter((s) => s.italic);
  const out: Styled[] = [];
  // light, regular, medium and bold, each only when the family really has a weight close to it
  for (const w of [400, 300, 500, 700]) {
    const b = up.length ? nearest(up, w) : null;
    if (b && Math.abs(b.weight - w) <= (w === 400 ? 1000 : 100) && !out.includes(b)) out.push(b);
  }
  if (it.length) out.push(nearest(it, 400));
  return out.length ? out : styles.slice(0, 1);
}

async function candidates(): Promise<{ key: string; c: Candidate }[]> {
  const fams = await db.family.findMany({ where: PUBLIC_FAMILY, select: { slug: true, name: true, category: true, folder: true, styles: { select: { style: true, weight: true, italic: true, file: true, ext: true } } } });
  const jobs = fams.flatMap((f) => pickStyles(f.styles.filter((s) => s.ext !== "woff2" || f.styles.every((x) => x.ext === "woff2"))).map((s) => ({ f, s })));
  const out: { key: string; c: Candidate }[] = [];
  let i = 0;
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (i < jobs.length) {
      const { f, s } = jobs[i++];
      const font = await loadFont(f.folder, s.file);
      if (font) out.push({ key: `${f.folder}/${s.file}`, c: { slug: f.slug, name: f.name, category: f.category, font } });
    }
  }));
  return out;
}

/* ---------------- the search ---------------- */

export type FoundFont = { slug: string; name: string; category: string; score: number; pct: number };
export type FindResult = { ok: true; mode: "letters" | "line"; fonts: FoundFont[] } | { ok: false; reason: "image" | "text" | "letters" };

export async function findFonts(image: Buffer, textRaw: string): Promise<FindResult> {
  const text = textRaw.replace(/\s+/g, " ").trim();
  const chars = [...text].filter((c) => /[\p{L}\p{N}]/u.test(c) && c !== "ʻ" && c !== "ʼ");
  if (chars.length < 2 || text.length > FIND_TEXT_MAX) return { ok: false, reason: "text" };
  const ink = await readInk(image);
  if (!ink) return { ok: false, reason: "image" };
  let letters = cutLine(ink, chars.length);
  if (!letters) return { ok: false, reason: "letters" };
  const box = letters.reduce((a, c) => unite(a, c));
  // the picture's letters: exactly the typed ones, or else the whole line is compared
  while (letters.length > chars.length && letters.length > 1) {
    let k = 0, gap = Infinity;
    for (let i = 0; i + 1 < letters.length; i++) { const g = letters[i + 1].minX - letters[i].maxX; if (g < gap) { gap = g; k = i; } }
    letters.splice(k, 2, unite(letters[k], letters[k + 1]));
  }
  const byLetter = letters.length === chars.length;
  const lineW = Math.max(16, Math.min(480, Math.round((LINE_H * (box.maxX - box.minX + 1)) / (box.maxY - box.minY + 1))));
  const imgLine = blur(bitmapOf(ink, letters, box, lineW, LINE_H), lineW, LINE_H);
  const lineH = box.maxY - box.minY + 1;
  const imgLetters = byLetter
    ? letters.map((c) => ({ bm: blur(bitmapOf(ink, [c], c, LW, LW), LW, LW), aspect: (c.maxX - c.minX + 1) / (c.maxY - c.minY + 1), top: (box.maxY - c.minY) / lineH, bottom: (box.maxY - c.maxY) / lineH }))
    : [];

  const scored: { c: Candidate; score: number }[] = [];
  for (const { key, c } of await candidates()) {
    let lineScore = 1;
    const line = (() => { try { return lineOf(c.font, text); } catch { return null; } })();
    if (line) {
      const bm = line.w === lineW ? imgLine : blur(bitmapOf(ink, letters, box, line.w, LINE_H), line.w, LINE_H);
      lineScore = mad(blur(line.bm, line.w, LINE_H), bm) * 2 + 0.3 * Math.abs(Math.log(line.aspect / ((box.maxX - box.minX + 1) / lineH)));
    }
    let score = lineScore;
    if (byLetter) {
      const fl = chars.map((ch) => letterOf(c, key, ch));
      if (fl.every((l) => l)) {
        const hi = Math.max(...fl.map((l) => l!.top)), lo = Math.min(...fl.map((l) => l!.bottom)), span = hi - lo || 1;
        let sum = 0;
        fl.forEach((l, i) => {
          const im = imgLetters[i];
          const shape = mad(blur(l!.bm, LW, LW), im.bm) * 2;
          const aspect = Math.abs(Math.log(l!.aspect / im.aspect));
          const vert = Math.abs((l!.top - lo) / span - im.top) + Math.abs((l!.bottom - lo) / span - im.bottom);
          const inkd = Math.abs(mean(l!.bm) - mean(im.bm));
          sum += shape + 0.25 * aspect + 0.4 * vert + 0.6 * inkd;
        });
        score = 0.7 * (sum / fl.length) + 0.3 * lineScore;
      } else score = lineScore + 0.5; // the font lacks a letter of the text
    }
    scored.push({ c, score });
  }
  // a family's best style counts
  const best = new Map<string, { c: Candidate; score: number }>();
  for (const s of scored) { const b = best.get(s.c.slug); if (!b || s.score < b.score) best.set(s.c.slug, s); }
  const fonts = [...best.values()].sort((a, b) => a.score - b.score).slice(0, 8).map(({ c, score }) => ({
    slug: c.slug, name: c.name, category: c.category, score, pct: Math.max(1, Math.min(99, Math.round(100 * Math.exp(-score * 2.2)))),
  }));
  return { ok: true, mode: byLetter ? "letters" : "line", fonts };
}

