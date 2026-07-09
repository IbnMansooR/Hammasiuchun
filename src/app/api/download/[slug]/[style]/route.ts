import { db } from "@/lib/db";
import { previewStyle } from "@/lib/fonts";
import { readFont } from "@/lib/storage";

export const runtime = "nodejs";

const MIME: Record<string, string> = {
  ttf: "font/ttf",
  otf: "font/otf",
  woff2: "font/woff2",
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string; style: string }> },
) {
  const { slug: rawSlug, style: rawStyle } = await params;
  const slug = rawSlug.replace(/[^a-z0-9-]/gi, "").toLowerCase();
  const style = rawStyle.replace(/[^A-Za-z0-9]/g, "");
  if (!slug || !style) return new Response("Bad request", { status: 400 });

  try {
    const fam = await db.family.findUnique({
      where: { slug },
      select: {
        name: true, folder: true, tier: true,
        styles: { select: { style: true, weight: true, italic: true, ext: true, file: true } },
      },
    });
    if (!fam) return new Response("Not found", { status: 404 });

    let st = fam.styles.find((s) => s.style === style);
    // Free families: fall back to the closest cut when the exact style is absent.
    if (!st && fam.tier === "free") {
      st = previewStyle(fam.styles) as (typeof fam.styles)[number] | undefined;
    }
    if (!st) return new Response("Not found", { status: 404 });

    // free → any cut; demo → Regular/Italic only; paid → nothing.
    const allowed =
      fam.tier === "free" ||
      (fam.tier === "demo" && (st.style === "Regular" || st.style === "Italic"));
    if (!allowed) {
      return new Response("Bu shrift litsenziya bilan yuklanadi. Iltimos, savatga qo'shing.", { status: 403 });
    }

    const buf = await readFont(fam.folder, st.file);
    if (!buf) return new Response("Missing source", { status: 404 });

    const suffix = fam.tier === "free" ? "" : "-DEMO";
    const base = fam.name.replace(/[^A-Za-z0-9]+/g, "") || slug;
    const dlName = `${base}-${st.style}${suffix}.${st.ext}`;
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": MIME[st.ext] ?? "application/octet-stream",
        "Content-Disposition":
          `attachment; filename="${dlName}"; filename*=UTF-8''${encodeURIComponent(dlName)}`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new Response("Download error", { status: 500 });
  }
}
