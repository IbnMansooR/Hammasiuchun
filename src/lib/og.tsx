// Shared bits for the 1200×630 Open Graph images (next/og / Satori). Satori
// can't read WOFF2, so the UI font ships as WOFF next to the OG routes.
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const OG_SIZE = { width: 1200, height: 630 };

export type OgFont = { name: string; data: Buffer | ArrayBuffer; weight: 400 | 700; style: "normal" };

export async function ogFonts(): Promise<OgFont[]> {
  const dir = join(process.cwd(), "src/app/_og");
  const [regular, bold] = await Promise.all([
    readFile(join(dir, "montserrat-400.woff")),
    readFile(join(dir, "montserrat-700.woff")),
  ]);
  return [
    { name: "Feekr", data: regular, weight: 400, style: "normal" },
    { name: "Feekr", data: bold, weight: 700, style: "normal" },
  ];
}

export function OgFrame({ children, footer }: { children: React.ReactNode; footer: string }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#ffffff", padding: "64px 72px", fontFamily: "Feekr" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 44, height: 16, background: "#0b7a55", borderRadius: 4 }} />
        <div style={{ fontSize: 34, fontWeight: 700, color: "#0b0b0c" }}>Feekr</div>
      </div>
      {children}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, color: "#64646b" }}>
        <span>{footer}</span>
        <span>feekrfont.uz</span>
      </div>
    </div>
  );
}
