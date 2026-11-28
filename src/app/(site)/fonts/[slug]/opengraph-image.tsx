import { ImageResponse } from "next/og";
import * as fontkit from "fontkit";
import { db } from "@/lib/db";
import { isPublicFamily } from "@/lib/license";
import { previewStyle, CATEGORY_LABEL } from "@/lib/fonts";
import { readFontStrict, StorageUnavailable } from "@/lib/storage";
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
  } catch (e) {
    console.error("og: fontkit could not read the specimen", e instanceof Error ? e.message : e);
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
  let storageDown = false; // then the plain card below is a stopgap, not the final picture
  if (f && pub) {
    const pv = previewStyle(f.styles);
    const cut = pv && f.styles.find((s) => s.style === pv.style);
    if (cut && cut.ext !== "woff2") {
      const data = await readFontStrict(f.folder, cut.file).catch((e) => {
        if (e instanceof StorageUnavailable) storageDown = true;
        console.error("og: font read failed", slug, e instanceof Error ? e.message : e);
        return null;
      });
      if (!data) console.error("og: font file missing", slug, f.folder, cut.file);
      else if (satoriCanUse(data)) specimen = { name: "Specimen", data, weight: 400, style: "normal" };
      else console.error("og: specimen not usable by Satori", slug, cut.file);
    } else {
      console.error("og: no preview cut", slug, !!cut);
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
  } catch (e) {
    console.error("og: Satori failed on the specimen, using the UI font", slug, e instanceof Error ? e.message : e);
    png = await render(false).arrayBuffer();
  }
  return new Response(png, {
    headers: {
      "Content-Type": "image/png",
      // The real picture is stable: keep it at the edge for a week, so storage is read once per font. A stopgap card
      // made while storage was down must not stick: Telegram and crawlers would keep the wrong picture.
      "Cache-Control": storageDown ? "public, max-age=60, s-maxage=60" : "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000",
    },
  });
}
