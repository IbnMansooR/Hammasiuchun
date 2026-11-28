// The picture the bot's /help sends: every command in a short list with a drawn icon, set in Feekr's
// own type. It holds no user text, so it is the same for everyone and cached. Compact on purpose:
// eight rows have to fit a phone (4:5).
import { ImageResponse } from "next/og";
import { ogFonts } from "@/lib/og";
import { MARK, WORD } from "@/components/Logo";
import { botUsername } from "@/lib/telegram";
import { overLimit, tooManyRequests } from "@/lib/softLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Icon = { text: string } | { svg: React.ReactNode };
const line = { fill: "none", stroke: "#ffffff", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

// [icon, title, what it does] in the order people use them
const ROWS: [Icon, string, string][] = [
  [{ text: "Aa" }, "Matn yozing", "uni shriftlarimizda koʻring"],
  [{ svg: [<circle key="0" cx="12" cy="12" r="9" {...line} />, <circle key="1" cx="12" cy="12" r="4.5" {...line} />, <circle key="2" cx="12" cy="12" r="1" fill="#ffffff" stroke="#ffffff" strokeWidth="1" />] }, "/viktorina", "bu qaysi shrift? · /reyting"],
  [{ svg: <polygon points="12,3 14.6,9 21,9.6 16.2,13.8 17.6,20.2 12,16.9 6.4,20.2 7.8,13.8 3,9.6 9.4,9" {...line} /> }, "/test", "qaysi shrift sen?"],
  [{ svg: [<circle key="0" cx="10.5" cy="10.5" r="6.5" {...line} />, <line key="1" x1="15.5" y1="15.5" x2="21" y2="21" {...line} />] }, "/topish", "rasmdan oʻxshash shrift topish"],
  [{ svg: [<rect key="0" x="7" y="2.5" width="10" height="19" rx="2.5" {...line} />, <line key="1" x1="10.5" y1="18" x2="13.5" y2="18" {...line} />] }, "/fon", "telefon uchun fon rasmi"],
  [{ svg: [<path key="0" d="M3 12V4h8l10 10-8 8L3 12z" {...line} />, <circle key="1" cx="7.5" cy="8.5" r="1.3" fill="#ffffff" stroke="#ffffff" strokeWidth="1" />] }, "/brend", "brend nomi, 4 xil shriftda"],
  [{ text: "Oʻ" }, "/harflar", "oʻ gʻ ў қ ғ ҳ bor shriftlar"],
  [{ svg: [<path key="0" d="M3 10v4h3l7 4V6L6 10H3z" {...line} />, <path key="1" d="M16.5 9a4 4 0 010 6" {...line} />] }, "/reklama", "kanal va saytda reklama"],
];

export async function GET(req: Request) {
  if (overLimit("help-img", req.headers, 60, 10 * 60_000)) return tooManyRequests(300);
  const img = new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#ffffff", padding: "64px 72px 56px", fontFamily: "Feekr Sans", color: "#0e0e0d" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <svg width="220" height="57" viewBox="0 0 3877 1001">
            <path fill="#009A76" fillRule="evenodd" d={MARK} />
            <path fill="#0e0e0d" fillRule="evenodd" d={WORD} />
          </svg>
          <span style={{ display: "flex", fontSize: 26, padding: "7px 20px", borderRadius: 999, background: "#e5f3ec", color: "#00664e" }}>bot</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 36, marginBottom: 36 }}>
          <span style={{ fontFamily: "Feekr Display", fontSize: 104, lineHeight: 0.98, letterSpacing: -3 }}>Matningiz</span>
          <span style={{ fontFamily: "Feekr Display", fontSize: 104, lineHeight: 0.98, letterSpacing: -3, color: "#009A76" }}>shriftda.</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {ROWS.map(([icon, title, sub], i) => (
            <div key={title} style={{ display: "flex", alignItems: "center", gap: 24, height: 98, padding: "0 22px", borderRadius: 24, background: i % 2 ? "#f4f3ee" : "#eef7f2" }}>
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 62, height: 62, borderRadius: 18, background: "#0e0e0d", color: "#ffffff", fontFamily: "Feekr Display", fontSize: 30 }}>
                {"text" in icon ? icon.text : <svg width="32" height="32" viewBox="0 0 24 24">{icon.svg}</svg>}
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontFamily: "Feekr Display", fontSize: 40, lineHeight: 1.05 }}>{title}</span>
                <span style={{ fontSize: 25, color: "#5d5c56" }}>{sub}</span>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 30, paddingTop: 22, borderTop: "3px solid #0e0e0d", fontSize: 28 }}>
          <span style={{ fontWeight: 600 }}>{`@${botUsername()}`}</span>
          <span style={{ color: "#6b6a65" }}>feekrfont.uz · hammasi bepul</span>
        </div>
      </div>
    ),
    { width: 1080, height: 1350, fonts: await ogFonts() },
  );
  const png = await img.arrayBuffer();
  return new Response(png, { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600, s-maxage=86400" } });
}
