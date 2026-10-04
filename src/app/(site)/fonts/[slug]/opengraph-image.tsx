import { ImageResponse } from "next/og";
import * as fontkit from "fontkit";
import { db } from "@/lib/db";
import { isPublicFamily } from "@/lib/license";
import { previewStyle, CATEGORY_LABEL } from "@/lib/fonts";
import { readFont } from "@/lib/storage";
import { OG_SIZE, OgFrame, ogFonts, type OgFont } from "@/lib/og";

export const runtime = "nodejs";
export const alt = "Feekr shrift oilasi";
export const size = OG_SIZE;
export const contentType = "image/png";

/** Satori (opentype.js) can't render variable/CFF2 fonts; skip those up front. */
function satoriCanUse(data: Buffer): boolean {
  try {
    const f = fontkit.create(data) as fontkit.Font;
    return Object.keys(f.variationAxes ?? {}).length === 0 && !("CFF2" in (f as unknown as Record<string, unknown>));
  } catch {
    return false;
  }
}

// The family's name, set in the family itself (its TTF/OTF preview cut).
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const base = await ogFonts();
  const f = await db.family.findUnique({
    where: { slug },
    select: { name: true, category: true, styleCount: true, isPublished: true, licenseClass: true, folder: true,
      styles: { select: { style: true, weight: true, italic: true, file: true, ext: true } } },
  }).catch(() => null);
  const pub = !!f && isPublicFamily(f);

  let specimen: OgFont | null = null;
  if (f && pub) {
    const pv = previewStyle(f.styles);
    const cut = pv && f.styles.find((s) => s.style === pv.style);
    if (cut && cut.ext !== "woff2") {
      const data = await readFont(f.folder, cut.file).catch(() => null);
      if (data && satoriCanUse(data)) specimen = { name: "Specimen", data, weight: 400, style: "normal" };
    }
  }
  const name = f && pub ? f.name : "Feekr";
  const meta = f && pub ? `${CATEGORY_LABEL[f.category] ?? f.category} · ${f.styleCount} uslub · bepul yuklab olish` : "Bepul shriftlar kutubxonasi";

  const render = (useSpecimen: boolean) =>
    new ImageResponse(
      (
        <OgFrame footer={meta}>
          <div style={{ display: "flex", fontFamily: useSpecimen ? "Specimen" : "Feekr Display", fontWeight: useSpecimen ? 400 : 500, fontSize: name.length > 16 ? 104 : 156, color: "#0e0e0d", lineHeight: 1.05, letterSpacing: useSpecimen ? -2 : -4 }}>
            {name}
          </div>
        </OgFrame>
      ),
      { ...OG_SIZE, fonts: useSpecimen && specimen ? [...base, specimen] : base },
    );

  // ImageResponse renders lazily while streaming, so a font Satori chokes on
  // would surface as a broken response. Render to a buffer first and fall back
  // to the UI font if the specimen font fails.
  let png: ArrayBuffer;
  try {
    png = await render(!!specimen).arrayBuffer();
  } catch {
    png = await render(false).arrayBuffer();
  }
  return new Response(png, {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400, s-maxage=86400" },
  });
}
