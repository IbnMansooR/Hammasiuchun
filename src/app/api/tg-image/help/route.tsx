// The picture the bot's /help sends: every command at a glance, set in Feekr's own type. It holds
// no user text, so it is the same for everyone and cached. Minimal on purpose: it must fit a phone.
import { ImageResponse } from "next/og";
import { ogFonts } from "@/lib/og";
import { MARK, WORD } from "@/components/Logo";
import { botUsername } from "@/lib/telegram";
import { overLimit, tooManyRequests } from "@/lib/softLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// [command, what it does] — two columns, four rows.
const CELLS: [string, string][] = [
  ["Matn yozing", "shriftlarda koʻring"],
  ["/viktorina", "bu qaysi shrift?"],
  ["/test", "qaysi shrift sen?"],
  ["/reyting", "haftalik top"],
  ["/fon", "telefon fon rasmi"],
  ["/brend", "brend nomi"],
  ["/harflar", "oʻ gʻ ў қ ғ ҳ"],
  ["/reklama", "reklama berish"],
];

export async function GET(req: Request) {
  if (overLimit("help-img", req.headers, 60, 10 * 60_000)) return tooManyRequests(300);
  const img = new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#ffffff", padding: "72px 72px 64px", fontFamily: "Feekr Sans", color: "#0e0e0d" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <svg width="230" height="60" viewBox="0 0 3877 1001">
            <path fill="#009A76" fillRule="evenodd" d={MARK} />
            <path fill="#0e0e0d" fillRule="evenodd" d={WORD} />
          </svg>
          <span style={{ display: "flex", fontSize: 28, padding: "8px 22px", borderRadius: 999, background: "#e5f3ec", color: "#00664e" }}>bot</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontFamily: "Feekr Display", fontSize: 128, lineHeight: 0.96, letterSpacing: -4 }}>Matningiz</span>
          <span style={{ fontFamily: "Feekr Display", fontSize: 128, lineHeight: 0.96, letterSpacing: -4, color: "#009A76" }}>shriftda.</span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
          {CELLS.map(([cmd, sub], i) => (
            <div key={cmd} style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 4, width: 456, height: 124, padding: "0 30px", borderRadius: 24, background: i === 0 ? "#0e0e0d" : "#f4f3ee", color: i === 0 ? "#ffffff" : "#0e0e0d" }}>
              <span style={{ fontFamily: "Feekr Display", fontSize: 44, lineHeight: 1.05 }}>{cmd}</span>
              <span style={{ fontSize: 26, color: i === 0 ? "#bfe6d6" : "#6b6a65" }}>{sub}</span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 30 }}>
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
