import { ImageResponse } from "next/og";
import { OG_SIZE, OgFrame, ogFonts } from "@/lib/og";

export const runtime = "nodejs";
export const alt = "Feekr — bepul shriftlar kutubxonasi";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <OgFrame footer="Sinab koʻring va bir bosishda yuklab oling">
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 92, fontWeight: 700, color: "#0b0b0c", lineHeight: 1.02, letterSpacing: -3 }}>Bepul shriftlar</div>
          <div style={{ fontSize: 92, fontWeight: 700, color: "#0b7a55", lineHeight: 1.02, letterSpacing: -3 }}>kutubxonasi</div>
        </div>
      </OgFrame>
    ),
    { ...OG_SIZE, fonts: await ogFonts() },
  );
}
