import { db } from "@/lib/db";
import { FREEWARE_WARNING, LICENSE_NOTE, isRedistributable } from "@/lib/license";
import { readFont } from "@/lib/storage";
import JSZip from "jszip";

export const runtime = "nodejs";

// Download an entire family as one ZIP containing every cut (all fonts are free).
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug: rawSlug } = await params;
  const slug = rawSlug.replace(/[^a-z0-9-]/gi, "").toLowerCase();
  if (!slug) return new Response("Bad request", { status: 400 });

  try {
    const fam = await db.family.findUnique({
      where: { slug },
      select: {
        name: true, folder: true, isPublished: true, licenseClass: true, copyright: true, license: true,
        designer: true, licenseUrl: true,
        styles: { select: { style: true, ext: true, file: true }, orderBy: [{ italic: "asc" }, { weight: "asc" }] },
      },
    });
    if (!fam || !fam.isPublished || !isRedistributable(fam.licenseClass)) {
      return new Response("Not found", { status: 404 });
    }

    const base = fam.name.replace(/[^A-Za-z0-9]+/g, "") || slug;
    const zip = new JSZip();
    const dir = zip.folder(base) ?? zip;

    // Read every cut from storage in parallel, then add the ones that exist.
    const parts = await Promise.all(
      fam.styles.map(async (s) => ({ s, buf: await readFont(fam.folder, s.file) })),
    );
    let added = 0;
    for (const { s, buf } of parts) {
      if (!buf) continue;
      dir.file(`${base}-${s.style}.${s.ext}`, buf);
      added++;
    }
    if (!added) return new Response("Missing source", { status: 404 });

    // Ship the licence terms with the files so they travel with the font.
    dir.file("LITSENZIYA.txt", [
      `${fam.name}`,
      fam.designer ? `Dizayner: ${fam.designer}` : "",
      `Litsenziya: ${fam.licenseClass}${LICENSE_NOTE[fam.licenseClass] ? ` — ${LICENSE_NOTE[fam.licenseClass]}` : ""}`,
      fam.licenseClass === "Freeware" ? FREEWARE_WARNING : "",
      fam.copyright ? `\n${fam.copyright}` : "",
      fam.license ? `\n${fam.license}` : "",
      fam.licenseUrl ? `\n${fam.licenseUrl}` : "",
      "\nYuklab olingan manba: Feekr (https://feekrfont.uz)",
    ].filter(Boolean).join("\n"));

    const content = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    const dlName = `${base}.zip`;
    return new Response(new Uint8Array(content), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition":
          `attachment; filename="${dlName}"; filename*=UTF-8''${encodeURIComponent(dlName)}`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new Response("Download error", { status: 500 });
  }
}
