// Shared bits for the 1200×630 Open Graph images (next/og / Satori). Satori
// can't read WOFF2, so the brand fonts ship as static WOFF next to the OG routes.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { MARK, WORD } from "@/components/Logo";

export const OG_SIZE = { width: 1200, height: 630 };

export type OgFont = { name: string; data: Buffer | ArrayBuffer; weight: 400 | 500 | 600 | 700; style: "normal" };

export async function ogFonts(): Promise<OgFont[]> {
  const dir = join(process.cwd(), "src/app/_og");
  const [display, regular, semibold] = await Promise.all([
    readFile(join(dir, "display-500.woff")),
    readFile(join(dir, "sans-400.woff")),
    readFile(join(dir, "sans-600.woff")),
  ]);
  return [
    { name: "Feekr Display", data: display, weight: 500, style: "normal" },
    { name: "Feekr Sans", data: regular, weight: 400, style: "normal" },
    { name: "Feekr Sans", data: semibold, weight: 600, style: "normal" },
  ];
}

export function OgFrame({ children, footer }: { children: React.ReactNode; footer: string }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#ffffff", padding: "60px 72px", fontFamily: "Feekr Sans" }}>
      <svg width="194" height="50" viewBox="0 0 3877 1001">
        <path fill="#009A76" fillRule="evenodd" d={MARK} />
        <path fill="#0e0e0d" fillRule="evenodd" d={WORD} />
      </svg>
      {children}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 26, color: "#6b6a65", borderTop: "2px solid #e7e6e2", paddingTop: 26 }}>
        <span>{footer}</span>
        <span style={{ fontWeight: 600, color: "#0e0e0d" }}>feekrfont.uz</span>
      </div>
    </div>
  );
}
