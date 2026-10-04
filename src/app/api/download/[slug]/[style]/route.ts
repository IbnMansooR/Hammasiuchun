import { after } from "next/server";
import { db } from "@/lib/db";
import { isRedistributable } from "@/lib/license";
import { readFont } from "@/lib/storage";

export const runtime = "nodejs";

const MIME: Record<string, string> = {
  ttf: "font/ttf",
  otf: "font/otf",
  woff2: "font/woff2",
};

// Every published family is free: any single cut can be downloaded, as long as
// the family's licence allows Feekr to redistribute it.
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
        name: true, folder: true, isPublished: true, licenseClass: true,
        styles: { where: { style }, select: { style: true, ext: true, file: true }, take: 1 },
      },
    });
    const st = fam?.styles[0];
    if (!fam || !st || !fam.isPublished || !isRedistributable(fam.licenseClass)) {
      return new Response("Not found", { status: 404 });
    }

    const buf = await readFont(fam.folder, st.file);
    if (!buf) return new Response("Missing source", { status: 404 });

    const base = fam.name.replace(/[^A-Za-z0-9]+/g, "") || slug;
    const dlName = `${base}-${st.style}.${st.ext}`;
    // Count it once the file is on its way; a failed counter never blocks a download.
    after(() => db.family.update({ where: { slug }, data: { downloads: { increment: 1 } } }).catch(() => {}));
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
