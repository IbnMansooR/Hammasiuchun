// The picture of the bot's weekly advertisement in the channel: what the bot does in three lines on
// Feekr green. No user text, so it is the same for everyone and cached.
import { ImageResponse } from "next/og";
import { ogFonts } from "@/lib/og";
import { MARK, WORD } from "@/components/Logo";
import { botUsername } from "@/lib/telegram";
import { overLimit, tooManyRequests } from "@/lib/softLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const line = { fill: "none", stroke: "#0b7a55", strokeWidth: 2.4, strokeLinecap: "round", strokeLinejoin: "round" } as const;
type Icon = { text: string } | { svg: React.ReactNode };
const ROWS: [Icon, string][] = [
  [{ text: "Aa" }, "Matn yozing: shriftlarda koʻring"],
  [{ svg: [<circle key="0" cx="10.5" cy="10.5" r="6.5" {...line} />, <line key="1" x1="15.5" y1="15.5" x2="21" y2="21" {...line} />] }, "Rasmdan shriftni topib beradi"],
  [{ svg: <polygon points="12,3 14.6,9 21,9.6 16.2,13.8 17.6,20.2 12,16.9 6.4,20.2 7.8,13.8 3,9.6 9.4,9" {...line} /> }, "Har kuni viktorina va reyting"],
];

export async function GET(req: Request) {
  if (overLimit("botpromo-img", req.headers, 60, 10 * 60_000)) return tooManyRequests(300);
  const img = new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#0b7a55", color: "#ffffff", padding: "72px 80px 68px", fontFamily: "Feekr Sans" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <svg width="210" height="54" viewBox="0 0 3877 1001">
            <path fill="#ffffff" fillRule="evenodd" d={MARK} />
            <path fill="#ffffff" fillRule="evenodd" d={WORD} />
          </svg>
          <span style={{ display: "flex", fontSize: 26, fontWeight: 600, letterSpacing: 3, padding: "9px 24px", border: "3px solid #ffffff", borderRadius: 999 }}>BEPUL BOT</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontFamily: "Feekr Display", fontSize: 150, lineHeight: 0.95, letterSpacing: -4 }}>Feekr</span>
          <span style={{ fontFamily: "Feekr Display", fontSize: 150, lineHeight: 0.95, letterSpacing: -4, color: "#bff0d9" }}>boti</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {ROWS.map(([icon, text]) => (
            <div key={text} style={{ display: "flex", alignItems: "center", gap: 22 }}>
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 58, height: 58, borderRadius: 16, background: "#ffffff", color: "#0b7a55", fontFamily: "Feekr Display", fontSize: 30 }}>{"text" in icon ? icon.text : <svg width="34" height="34" viewBox="0 0 24 24">{icon.svg}</svg>}</span>
              <span style={{ display: "flex", fontSize: 38 }}>{text}</span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "3px solid #ffffff", paddingTop: 26, fontSize: 32 }}>
          <span style={{ fontWeight: 600 }}>{`@${botUsername()}`}</span>
          <span style={{ color: "#bff0d9" }}>feekrfont.uz</span>
        </div>
      </div>
    ),
    { width: 1080, height: 1080, fonts: await ogFonts() },
  );
  try {
    const png = await img.arrayBuffer();
    return new Response(png, { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400, s-maxage=86400" } });
  } catch {
    return new Response(null, { status: 500 });
  }
}
