import { ImageResponse } from "next/og";
import { OG_SIZE, OgFrame, ogFonts } from "@/lib/og";

export const runtime = "nodejs";
export const alt = "Feekr — bepul shriftlar kutubxonasi";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <OgFrame footer="Oʻzbek lotin va kirill yozuvi uchun · hammasi bepul">
        <div style={{ display: "flex", flexDirection: "column", fontFamily: "Feekr Display", fontSize: 112, lineHeight: 1, letterSpacing: -4, color: "#0e0e0d" }}>
          <div>Brendingizga ovoz</div>
          <div style={{ display: "flex" }}>beradigan<span style={{ color: "#0b7a55", marginLeft: 28 }}>shriftlar.</span></div>
        </div>
      </OgFrame>
    ),
    { ...OG_SIZE, fonts: await ogFonts() },
  );
}
