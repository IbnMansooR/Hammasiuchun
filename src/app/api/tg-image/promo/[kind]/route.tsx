// A ready picture for promoting Feekr itself (Admin → Reklama → Narxlar va promo): square for
// posts, tall for stories. The numbers are the site's real ones.
import { ImageResponse } from "next/og";
import { db } from "@/lib/db";
import { PUBLIC_FAMILY } from "@/lib/license";
import { ogFonts } from "@/lib/og";
import { MARK, WORD } from "@/components/Logo";
import { overLimit, tooManyRequests } from "@/lib/softLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SIZES = { square: [1080, 1080], story: [1080, 1920] } as const;

export async function GET(req: Request, { params }: { params: Promise<{ kind: string }> }) {
  if (overLimit("promo", req.headers, 60, 10 * 60_000)) return tooManyRequests(300);
  const { kind } = await params;
  if (!(kind in SIZES)) return new Response("Bad request", { status: 400 });
  const [w, h] = SIZES[kind as keyof typeof SIZES];
  const tall = kind === "story";
  const [fonts, cyr] = await Promise.all([db.family.count({ where: PUBLIC_FAMILY }), db.family.count({ where: { ...PUBLIC_FAMILY, hasCyrillic: true } })]);
  const img = new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#ffffff", padding: tall ? "120px 90px" : "80px 84px", fontFamily: "Feekr Sans", color: "#0e0e0d" }}>
        <svg width="270" height="70" viewBox="0 0 3877 1001">
          <path fill="#009A76" fillRule="evenodd" d={MARK} />
          <path fill="#0e0e0d" fillRule="evenodd" d={WORD} />
        </svg>
        <div style={{ display: "flex", flexDirection: "column", gap: tall ? 40 : 26 }}>
          <span style={{ fontFamily: "Feekr Display", fontSize: tall ? 190 : 150, lineHeight: 0.95, letterSpacing: -6 }}>{`${fonts} ta`}</span>
          <span style={{ fontFamily: "Feekr Display", fontSize: tall ? 120 : 92, lineHeight: 1, letterSpacing: -3 }}>bepul shrift</span>
          <span style={{ fontSize: tall ? 44 : 36, lineHeight: 1.35, color: "#3d3c38", maxWidth: 880 }}>
            {`Oʻzbek lotin${cyr ? ` va kirill (${cyr} ta)` : ""} harflari bilan. Sinab koʻring va bir bosishda yuklab oling.`}
          </span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 6 }}>
            {["Oʻ oʻ", "Gʻ gʻ", "Ў ў", "Қ қ", "Ғ ғ", "Ҳ ҳ"].map((l) => (
              <span key={l} style={{ fontSize: tall ? 46 : 38, padding: "10px 22px", borderRadius: 999, background: "#e5f3ec", color: "#00664e" }}>{l}</span>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "3px solid #0e0e0d", paddingTop: 30 }}>
          <span style={{ fontSize: tall ? 58 : 50, fontWeight: 600 }}>feekrfont.uz</span>
          <span style={{ fontSize: tall ? 34 : 30, color: "#6b6a65" }}>Hammasi bepul</span>
        </div>
      </div>
    ),
    { width: w, height: h, fonts: await ogFonts() },
  );
  const png = await img.arrayBuffer();
  return new Response(png, { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600, s-maxage=86400" } });
}
