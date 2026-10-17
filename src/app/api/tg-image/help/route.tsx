// The picture the bot's /help sends: what the bot does, set in Feekr's own type. It holds no user
// text, so it is the same for everyone and cached.
import { ImageResponse } from "next/og";
import { ogFonts } from "@/lib/og";
import { MARK, WORD } from "@/components/Logo";
import { botUsername } from "@/lib/telegram";
import { overLimit, tooManyRequests } from "@/lib/softLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROWS: [string, string, string][] = [
  ["Aa", "Matn namunasi", "Istalgan matn yozing: shriftlarimizda koʻrasiz"],
  ["Oʻ", "Oʻzbek harflari", "oʻ gʻ va ў қ ғ ҳ bor shriftlar · /harflar"],
  ["@", "Inline qidiruv", "Istalgan chatda shrift nomini yozing"],
  ["N", "Yangi shriftlar", "Kabinetdan Telegramni ulang"],
  ["Ad", "Reklama", "Kanal yoki saytda reklama · /reklama"],
];

export async function GET(req: Request) {
  if (overLimit("help-img", req.headers, 60, 10 * 60_000)) return tooManyRequests(300);
  const img = new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#ffffff", padding: "76px 80px", fontFamily: "Feekr Sans", color: "#0e0e0d" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <svg width="250" height="65" viewBox="0 0 3877 1001">
            <path fill="#009A76" fillRule="evenodd" d={MARK} />
            <path fill="#0e0e0d" fillRule="evenodd" d={WORD} />
          </svg>
          <span style={{ fontSize: 30, padding: "8px 22px", borderRadius: 999, background: "#e5f3ec", color: "#00664e" }}>bot</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={{ fontFamily: "Feekr Display", fontSize: 150, lineHeight: 0.95, letterSpacing: -5 }}>Matningiz</span>
          <span style={{ fontFamily: "Feekr Display", fontSize: 150, lineHeight: 0.95, letterSpacing: -5, color: "#009A76" }}>shriftda.</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {ROWS.map(([ico, title, sub], i) => (
            <div key={title} style={{ display: "flex", alignItems: "center", gap: 28, padding: "20px 28px", borderRadius: 26, background: i % 2 ? "#f6f5f1" : "#eef7f2" }}>
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 92, height: 92, borderRadius: 24, background: "#0e0e0d", color: "#ffffff", fontFamily: "Feekr Display", fontSize: 50 }}>{ico}</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontFamily: "Feekr Display", fontSize: 48, lineHeight: 1.05 }}>{title}</span>
                <span style={{ fontSize: 29, color: "#4a4943" }}>{sub}</span>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "3px solid #0e0e0d", paddingTop: 26 }}>
          <span style={{ fontSize: 42, fontWeight: 600 }}>{`@${botUsername()}`}</span>
          <span style={{ fontSize: 34, color: "#6b6a65" }}>feekrfont.uz · hammasi bepul</span>
        </div>
      </div>
    ),
    { width: 1080, height: 1350, fonts: await ogFonts() },
  );
  const png = await img.arrayBuffer();
  return new Response(png, { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600, s-maxage=86400" } });
}
