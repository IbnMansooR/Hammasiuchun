import { after } from "next/server";
import { db } from "@/lib/db";
import { familyZip } from "@/lib/familyZip";
import { overLimit, tooManyRequests } from "@/lib/softLimit";

export const runtime = "nodejs";

// Download an entire family as one ZIP containing every cut (all fonts are free).
export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  // Building a ZIP costs CPU: 30 families per 10 minutes per address is far above real use.
  if (overLimit("zip", req.headers, 30, 10 * 60_000)) return tooManyRequests(600);
  const { slug: rawSlug } = await params;
  const slug = rawSlug.replace(/[^a-z0-9-]/gi, "").toLowerCase();
  if (!slug) return new Response("Bad request", { status: 400 });

  try {
    const zip = await familyZip(slug);
    if (!zip) return new Response("Not found", { status: 404 });

    // Count it once the file is on its way; a failed counter never blocks a download.
    after(() => db.family.update({ where: { slug }, data: { downloads: { increment: 1 } } }).catch(() => {}));
    return new Response(new Uint8Array(zip.data), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition":
          `attachment; filename="${zip.name}"; filename*=UTF-8''${encodeURIComponent(zip.name)}`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new Response("Download error", { status: 500 });
  }
}
