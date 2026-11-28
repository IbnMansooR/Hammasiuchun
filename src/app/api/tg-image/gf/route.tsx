// The picture on a font scout offer (lib/fontScout): a Google Fonts family the site doesn't have
// yet, drawn from Google's own regular file. Only URLs the bot signed are rendered.
import type * as fontkit from "fontkit";
import { ImageResponse } from "next/og";
import { NextRequest, NextResponse } from "next/server";
import { verifyPreview } from "@/lib/fontScout";
import { coverage, gfDownload, gfFamily, gfFiles, licenceOf } from "@/lib/googleFonts";
import { staticFont } from "@/lib/fontSamples";
import { ogFonts } from "@/lib/og";
import { CATEGORY_LABEL } from "@/lib/fonts";
import { MARK, WORD } from "@/components/Logo";
import { overLimit, tooManyRequests } from "@/lib/softLimit";

export const runtime = "nodejs";
export const maxDuration = 60;

const WIDTH = 1072;

/** A line of text as one SVG path, laid out by fontkit (Satori can't read some fonts' tables),
 * made smaller when it wouldn't fit. */
function Ink({ font, text, size }: { font: fontkit.Font; text: string; size: number }) {
  const run = font.layout(text);
  const advance = run.positions.reduce((a, p) => a + p.xAdvance, 0);
  const k = Math.min(size / font.unitsPerEm, WIDTH / Math.max(1, advance));
  const top = font.ascent * k;
  let x = 0;
  const d = run.glyphs.map((g, i) => {
    const p = run.positions[i];
    const path = g.path.scale(k, -k).translate(x + p.xOffset * k, top - p.yOffset * k).toSVG();
    x += p.xAdvance * k;
    return path;
  });
  const w = Math.max(1, Math.ceil(x));
  const h = Math.ceil((font.ascent - font.descent) * k);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <path d={d.join(" ")} fill="#0e0e0d" />
    </svg>
  );
}

export async function GET(req: NextRequest) {
  if (overLimit("gf-preview", req.headers, 60, 10 * 60_000)) return tooManyRequests(300);
  const family = req.nextUrl.searchParams.get("f") ?? "";
  const s = req.nextUrl.searchParams.get("s") ?? "";
  if (!family || family.length > 80 || !verifyPreview(family, s)) return new NextResponse(null, { status: 403 });
  const f = await gfFamily(family).catch(() => null);
  if (!f) return new NextResponse(null, { status: 404 });
  const [first] = await gfFiles(f, 1).catch(() => []);
  const data = first ? await gfDownload(first.url) : null;
  const cov = data ? coverage(data) : null;
  const font = data ? staticFont(data) : null;
  if (!data || !cov || !font) return new NextResponse(null, { status: 404 });

  const has = (s: string) => [...s].every((c) => font.hasGlyphForCodePoint(c.codePointAt(0)!));
  // Only what the font draws: a missing letter would fall back to the label font and mislead.
  const lines = [
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    "abcdefghijklmnopqrstuvwxyz 0123456789",
    cov.cyrillic ? "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЪЭЮЯ" : null,
    [cov.uzLatin && "Oʻ oʻ Gʻ gʻ", cov.uzCyrillic && "Ў ў Қ қ Ғ ғ Ҳ ҳ"].filter(Boolean).join("   ") || null,
  ].filter((l): l is string => !!l && has(l.replace(/\s/g, "")));
  const sample = cov.uzLatin ? "Oʻzbekiston" : cov.uzCyrillic ? "Ўзбекистон" : "Feekr Font";
  const licence = licenceOf(data) === "Apache" ? "Apache 2.0" : "OFL";

  const img = new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#ffffff", padding: "52px 64px 40px", fontFamily: "Feekr Sans" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <svg width="156" height="40" viewBox="0 0 3877 1001">
            <path fill="#009A76" fillRule="evenodd" d={MARK} />
            <path fill="#0e0e0d" fillRule="evenodd" d={WORD} />
          </svg>
          <span style={{ fontSize: 24, color: "#6b6a65" }}>Yangi shrift taklifi</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 46 }}>
          <span style={{ fontSize: 26, color: "#6b6a65" }}>{`${f.family} · ${CATEGORY_LABEL[f.category] ?? f.category} · ${f.variants.length} uslub`}</span>
          <div style={{ display: "flex", marginTop: 14 }}>
            <Ink font={font} text={has(sample) ? sample : "Aa Bb Cc"} size={128} />
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 26, gap: 12 }}>
          {lines.map((l) => (
            <div key={l} style={{ display: "flex" }}>
              <Ink font={font} text={l} size={38} />
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "auto", paddingTop: 20, borderTop: "2px solid #e7e6e2", fontSize: 22, color: "#6b6a65" }}>
          <span>{`Google Fonts · ${licence} · bepul`}</span>
          <span style={{ fontWeight: 600, color: "#0e0e0d" }}>feekrfont.uz</span>
        </div>
      </div>
    ),
    { width: 1200, height: 760, fonts: await ogFonts() },
  );
  try {
    const png = await img.arrayBuffer();
    return new Response(png, { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400, s-maxage=604800" } });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
