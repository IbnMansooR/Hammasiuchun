// A cover picture for an article or a news item: our own typographic card (the title on one of a few
// brand palettes), so every post has a picture without copying anyone's photographs. Only published
// articles; ?l=ru uses the Russian title when there is one.
import { ImageResponse } from "next/og";
import { db } from "@/lib/db";
import { ogFonts } from "@/lib/og";
import { MARK, WORD } from "@/components/Logo";
import { overLimit, tooManyRequests } from "@/lib/softLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// background, text, accent
const PALETTES: [string, string, string][] = [
  ["#0b7a55", "#ffffff", "#bff0d9"],
  ["#0e0e0d", "#ffffff", "#2fd3a2"],
  ["#f4efe6", "#0e0e0d", "#c0392b"],
  ["#1d3557", "#ffffff", "#a8dadc"],
  ["#ffd23f", "#0e0e0d", "#c8102e"],
  ["#e8ecef", "#0e0e0d", "#0b7a55"],
];
const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const LABEL: Record<string, Record<string, string>> = {
  uz: { news: "YANGILIK", article: "MAQOLA", blog: "BLOG" },
  ru: { news: "НОВОСТИ", article: "СТАТЬЯ", blog: "БЛОГ" },
};

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (overLimit("cover-img", req.headers, 120, 10 * 60_000)) return tooManyRequests(300);
  const { slug } = await params;
  const ru = new URL(req.url).searchParams.get("l") === "ru";
  const a = await db.article.findFirst({ where: { slug, isPublished: true }, select: { title: true, titleRu: true, type: true, sourceName: true, author: true } });
  if (!a) return new Response(null, { status: 404 });
  const title = (ru && a.titleRu) || a.title;
  const [bg, fg, accent] = PALETTES[hash(slug) % PALETTES.length];
  const size = title.length <= 40 ? 100 : title.length <= 70 ? 84 : title.length <= 100 ? 70 : 58;
  const label = LABEL[ru ? "ru" : "uz"][a.type] ?? LABEL.uz.blog;
  const img = new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: bg, color: fg, padding: "60px 72px", fontFamily: "Feekr Sans", position: "relative" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <svg width="194" height="50" viewBox="0 0 3877 1001">
            <path fill={fg} fillRule="evenodd" d={MARK} />
            <path fill={fg} fillRule="evenodd" d={WORD} />
          </svg>
          <span style={{ display: "flex", fontSize: 24, fontWeight: 600, letterSpacing: 3, padding: "8px 22px", border: `3px solid ${fg}`, borderRadius: 999 }}>{label}</span>
        </div>
        <div style={{ display: "flex", fontFamily: "Feekr Display", fontSize: size, lineHeight: 1.04, letterSpacing: -2, maxWidth: 1000 }}>{title}</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `3px solid ${fg}`, paddingTop: 24, fontSize: 28 }}>
          <span style={{ display: "flex", color: accent, fontWeight: 600 }}>{a.sourceName ?? a.author}</span>
          <span style={{ display: "flex" }}>feekrfont.uz</span>
        </div>
      </div>
    ),
    { width: 1200, height: 675, fonts: await ogFonts() },
  );
  try {
    const png = await img.arrayBuffer();
    return new Response(png, { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" } });
  } catch {
    return new Response(null, { status: 500 });
  }
}
