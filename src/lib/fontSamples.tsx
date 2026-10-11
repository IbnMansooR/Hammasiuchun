// "Send me a text, I'll show it in our fonts": which public families can draw a given text, and the
// picture itself. The picture is rendered by /api/tg-image/sample from a signed URL, so Telegram
// fetches it like any photo and nobody else can make the server render arbitrary text.
import crypto from "node:crypto";
import * as fontkit from "fontkit";
import { ImageResponse } from "next/og";
import { unstable_cache } from "next/cache";
import { db } from "./db";
import { PUBLIC_FAMILY } from "./license";
import { previewStyle } from "./fonts";
import { readFont } from "./storage";
import { ogFonts } from "./og";
import { SITE_URL } from "./site";
import { MARK, WORD } from "@/components/Logo";

const MAX_BYTES = 6_000_000; // Satori parses the whole file; skip the CJK-size ones
export const MAX_TEXT = 60;
export const PER_PAGE = 4;

export type SampleFont = { slug: string; name: string; folder: string; file: string; chars: string };

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
// Everything a sample may contain: Latin with Latin-1, Uzbek signs, punctuation, Cyrillic incl. Ўў Ққ Ғғ Ҳҳ.
const CANDIDATES = [
  ...range(0x21, 0x7e), ...range(0xa1, 0xff), ...range(0x100, 0x17f), 0x2bb, 0x2bc,
  0x2013, 0x2014, 0x2018, 0x2019, 0x201c, 0x201d, 0x201e, 0x2026, 0x20ac, 0x2116, ...range(0x400, 0x45f), ...range(0x490, 0x4ff),
];

function staticFont(data: Buffer): fontkit.Font | null {
  try {
    const f = fontkit.create(data) as fontkit.Font;
    if ("fonts" in (f as object)) return null; // a collection (.ttc)
    if (Object.keys(f.variationAxes ?? {}).length > 0 || "CFF2" in (f as unknown as Record<string, unknown>)) return null;
    return f;
  } catch {
    return null;
  }
}

/** Satori is stricter than browsers; try a tiny render once per family. */
async function satoriDraws(data: Buffer): Promise<boolean> {
  try {
    await new ImageResponse(<div style={{ display: "flex", fontFamily: "T", fontSize: 40 }}>Aa Ğğ Ўў</div>, {
      width: 240, height: 80, fonts: [{ name: "T", data, weight: 400, style: "normal" }],
    }).arrayBuffer();
    return true;
  } catch {
    return false;
  }
}

/** Public families that can draw samples, most downloaded first, with the characters each covers.
 * Built once a day (it reads every family's file), then served from the cache. */
export const sampleFonts = unstable_cache(
  async (): Promise<SampleFont[]> => {
    const fams = await db.family.findMany({
      where: PUBLIC_FAMILY,
      orderBy: [{ downloads: "desc" }, { name: "asc" }],
      select: { slug: true, name: true, folder: true, styles: { select: { style: true, weight: true, italic: true, file: true, ext: true, size: true } } },
    });
    const out: SampleFont[] = [];
    for (const f of fams) {
      const cuts = f.styles.filter((s) => s.ext !== "woff2" && s.size <= MAX_BYTES);
      const pv = previewStyle(cuts);
      const cut = pv && cuts.find((s) => s.style === pv.style);
      if (!cut) continue;
      const data = await readFont(f.folder, cut.file).catch(() => null);
      const font = data && data.length <= MAX_BYTES ? staticFont(data) : null;
      if (!data || !font || !(await satoriDraws(data))) continue;
      const chars = CANDIDATES.filter((cp) => font.hasGlyphForCodePoint(cp)).map((cp) => String.fromCodePoint(cp)).join("");
      out.push({ slug: f.slug, name: f.name, folder: f.folder, file: cut.file, chars });
    }
    return out;
  },
  ["tg-sample-fonts-v1"],
  { revalidate: 60 * 60 * 24, tags: ["sample-fonts"] },
);

/** Official Uzbek Latin signs: oʻ gʻ use ʻ (U+02BB), the tutuq belgisi inside a word is ʼ (U+02BC).
 * People type ' ` ‘ ’ instead; the sample shows the correct ones. */
export function uzbekize(s: string): string {
  return s
    .replace(/([oOgG])['`‘’´ʼ]/g, "$1ʻ")
    .replace(/(\p{L})['`’´](?=\p{L})/gu, "$1ʼ");
}

/** User text → one clean line for a sample (no «» so the caption can carry it back). */
export function cleanSampleText(raw: string): string {
  return raw.replace(/[«»<>]/g, "").replace(/\s+/g, " ").trim().slice(0, MAX_TEXT).trim();
}

export type Match = { fonts: SampleFont[]; total: number; missing: string[] };

/** Families that have every character of the text (spaces don't count), page by page. */
export async function matchFonts(text: string, offset = 0, perPage = PER_PAGE): Promise<Match> {
  const all = await sampleFonts();
  const needed = [...new Set([...text].filter((c) => !/\s/.test(c)))];
  const fits = all.filter((f) => needed.every((c) => f.chars.includes(c)));
  // Characters no font of ours can draw (emoji, other scripts): worth telling the person.
  const missing = needed.filter((c) => !all.some((f) => f.chars.includes(c)));
  return { fonts: fits.slice(offset, offset + perPage), total: fits.length, missing };
}

/* ---------------- signed image URL ---------------- */

export type SampleMode = "text" | "names";

const sign = (m: string, t: string, f: string) =>
  crypto.createHmac("sha256", process.env.SESSION_SECRET ?? "feekr").update(`sample\n${m}\n${t}\n${f}`).digest("base64url").slice(0, 22);

export function sampleImageUrl(mode: SampleMode, text: string, slugs: string[]): string {
  const f = slugs.join(",");
  const q = new URLSearchParams({ m: mode, t: text, f, s: sign(mode, text, f) });
  return `${SITE_URL}/api/tg-image/sample?${q}`;
}

export function verifySample(m: string, t: string, f: string, s: string): boolean {
  const want = Buffer.from(sign(m, t, f));
  const got = Buffer.from(s);
  return got.length === want.length && crypto.timingSafeEqual(got, want);
}

/* ---------------- the picture ---------------- */

const sizeFor = (len: number) => (len <= 10 ? 104 : len <= 18 ? 84 : len <= 28 ? 64 : len <= 40 ? 48 : len <= 50 ? 40 : 34);

export async function renderSample(mode: SampleMode, text: string, slugs: string[]): Promise<Response | null> {
  const all = await sampleFonts();
  const picked = slugs.map((s) => all.find((f) => f.slug === s)).filter((f): f is SampleFont => !!f).slice(0, PER_PAGE);
  if (picked.length === 0) return null;
  const [base, ...datas] = await Promise.all([ogFonts(), ...picked.map((f) => readFont(f.folder, f.file))]);
  const rows = picked.map((f, i) => ({ ...f, data: datas[i], family: `S${i}`, sample: mode === "names" ? f.name : text })).filter((r) => r.data);
  if (rows.length === 0) return null;

  const rowH = 230;
  const height = 150 + rows.length * rowH + 90;
  const title = mode === "names" ? "Haftaning shriftlari" : "Matningiz Feekr shriftlarida";
  const img = new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#ffffff", padding: "52px 64px 40px", fontFamily: "Feekr Sans" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 26 }}>
          <svg width="156" height="40" viewBox="0 0 3877 1001">
            <path fill="#009A76" fillRule="evenodd" d={MARK} />
            <path fill="#0e0e0d" fillRule="evenodd" d={WORD} />
          </svg>
          <span style={{ fontSize: 24, color: "#6b6a65" }}>{title}</span>
        </div>
        {rows.map((r, i) => (
          <div key={r.slug} style={{ display: "flex", flexDirection: "column", justifyContent: "center", height: rowH, borderTop: "2px solid #e7e6e2" }}>
            <span style={{ fontSize: 22, color: "#6b6a65", marginBottom: 6 }}>{`${i + 1}. ${r.name}`}</span>
            <span style={{ fontFamily: r.family, fontSize: sizeFor(r.sample.length), color: "#0e0e0d", lineHeight: 1.15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 1072 }}>
              {r.sample}
            </span>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "auto", paddingTop: 20, borderTop: "2px solid #e7e6e2", fontSize: 22, color: "#6b6a65" }}>
          <span>Bepul yuklab olish</span>
          <span style={{ fontWeight: 600, color: "#0e0e0d" }}>feekrfont.uz</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height,
      fonts: [...base, ...rows.map((r) => ({ name: r.family, data: r.data as Buffer, weight: 400 as const, style: "normal" as const }))],
    },
  );
  try {
    const png = await img.arrayBuffer();
    return new Response(png, { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400, s-maxage=86400" } });
  } catch {
    return null;
  }
}
