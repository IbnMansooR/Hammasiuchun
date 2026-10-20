// The picture of a brand starter: the brand name in the heading font, a line of text in the body font and the
// five colours. Drawn from a signed address (like the bot's other pictures), so nobody can make the server
// draw arbitrary text; the name is cut short and must be drawable by the heading font.
import crypto from "node:crypto";
import { ImageResponse } from "next/og";
import { ogFonts } from "./og";
import { readFont } from "./storage";
import { SITE_URL } from "./site";
import { staticFont, sampleFonts } from "./fontSamples";
import { MARK, WORD } from "@/components/Logo";
import { ROLES, ROLE_LABEL, industryLabel, kitById, moodLabel, readableOn } from "./brandKit";

export const KIT_NAME_MAX = 24;
const sign = (id: number, t: string) => crypto.createHmac("sha256", process.env.SESSION_SECRET ?? "feekr").update(`kit\n${id}\n${t}`).digest("base64url").slice(0, 22);

export function kitCardUrl(id: number, name: string): string {
  const t = name.trim().slice(0, KIT_NAME_MAX) || "Feekr";
  return `${SITE_URL}/api/tg-image/kit?${new URLSearchParams({ id: String(id), t, s: sign(id, t) })}`;
}
export function verifyKitCard(id: number, t: string, s: string): boolean {
  const want = Buffer.from(sign(id, t)), got = Buffer.from(s);
  return got.length === want.length && crypto.timingSafeEqual(got, want);
}

function fit(data: Buffer, text: string, max: number, min: number, width: number): number {
  try {
    const f = staticFont(data);
    if (!f) return min;
    const w = f.layout(text).advanceWidth / f.unitsPerEm;
    return Math.max(min, Math.min(max, Math.floor((width * 0.96) / Math.max(w, 0.01))));
  } catch { return min; }
}

export async function renderKitCard(id: number, name: string): Promise<Response | null> {
  const kit = await kitById(id);
  if (!kit) return null;
  const fonts = await sampleFonts();
  const head = fonts.find((f) => f.slug === kit.headingSlug), body = fonts.find((f) => f.slug === kit.bodySlug);
  if (!head) return null;
  const draws = (chars: string, s: string) => [...s].every((c) => /\s/.test(c) || chars.includes(c));
  const text = name.trim().slice(0, KIT_NAME_MAX) || "Feekr";
  if (!draws(head.chars, text)) return null;
  const [base, hData, bData] = await Promise.all([ogFonts(), readFont(head.folder, head.file), body ? readFont(body.folder, body.file) : Promise.resolve(null)]);
  if (!hData) return null;
  const k = kit.kit;
  const sampleLine = "Har bir harf brendingizning ovozi.";
  const bodyOk = !!(body && bData && draws(body.chars, sampleLine));
  const tree = (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: k.bg, color: k.text, padding: "76px 80px 70px", fontFamily: "Feekr Sans" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ display: "flex", fontSize: 26, fontWeight: 600, letterSpacing: 3, color: k.primary }}>{`BREND PALITRASI · ${industryLabel(kit.industry).toUpperCase()}`}</span>
        <span style={{ display: "flex", width: 24, height: 24, borderRadius: 12, background: k.accent }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
        <span style={{ display: "flex", fontFamily: "KitHead", fontSize: fit(hData, text, 230, 56, 900), lineHeight: 1.02, color: k.primary }}>{text}</span>
        <span style={{ display: "flex", height: 8, width: 190, background: k.accent, borderRadius: 4 }} />
        <span style={{ display: "flex", fontFamily: bodyOk ? "KitBody" : "Feekr Sans", fontSize: 44, lineHeight: 1.3, maxWidth: 880 }}>{sampleLine}</span>
        <span style={{ display: "flex", fontSize: 30, color: k.text, opacity: 0.7 }}>{`${kit.name} · ${moodLabel(kit.mood)}`}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <div style={{ display: "flex", gap: 14 }}>
          {ROLES.map((r) => (
            <div key={r} style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", flex: 1, height: 190, borderRadius: 22, background: k[r], border: r === "bg" || r === "soft" ? `3px solid ${k.text}33` : "none", padding: "0 0 16px 18px", color: readableOn(k[r]) }}>
              <span style={{ display: "flex", fontSize: 21, fontWeight: 600 }}>{ROLE_LABEL[r]}</span>
              <span style={{ display: "flex", fontSize: 24 }}>{k[r].toUpperCase()}</span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `3px solid ${k.text}`, paddingTop: 24, fontSize: 28 }}>
          <span style={{ display: "flex" }}>{`Sarlavha: ${head.name}${body ? ` · Matn: ${body.name}` : ""}`}</span>
          <svg width="150" height="39" viewBox="0 0 3877 1001"><path fill={k.primary} fillRule="evenodd" d={MARK} /><path fill={k.text} fillRule="evenodd" d={WORD} /></svg>
        </div>
      </div>
    </div>
  );
  const img = new ImageResponse(tree, { width: 1080, height: 1080, fonts: [...base, { name: "KitHead", data: hData, weight: 400 as const, style: "normal" as const }, ...(bodyOk && bData ? [{ name: "KitBody", data: bData, weight: 400 as const, style: "normal" as const }] : [])] });
  try {
    return new Response(await img.arrayBuffer(), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400, s-maxage=86400" } });
  } catch { return null; }
}
