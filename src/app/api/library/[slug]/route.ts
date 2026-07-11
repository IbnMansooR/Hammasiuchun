import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { readFont } from "@/lib/storage";
import { verifyUserToken } from "@/lib/userSession";
import { USER_COOKIE } from "@/lib/userSession";
import JSZip from "jszip";

export const runtime = "nodejs";

// Re-download for an account that already owns this family's full license —
// serves every cut regardless of tier, so a lost local copy never means
// paying again. Ownership is Purchase, not Order (an Order is just an
// unconfirmed lead until an admin/payment provider marks it paid).
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug: rawSlug } = await params;
  const slug = rawSlug.replace(/[^a-z0-9-]/gi, "").toLowerCase();
  if (!slug) return new Response("Bad request", { status: 400 });

  const store = await cookies();
  const session = await verifyUserToken(store.get(USER_COOKIE)?.value);
  if (!session) return new Response("Kirish talab qilinadi", { status: 401 });

  const owned = await db.purchase.findUnique({
    where: { userId_familySlug: { userId: session.uid, familySlug: slug } },
  });
  if (!owned) return new Response("Bu shrift sizga tegishli emas", { status: 403 });

  const fam = await db.family.findUnique({
    where: { slug },
    select: {
      name: true, folder: true,
      styles: { select: { style: true, ext: true, file: true }, orderBy: [{ italic: "asc" }, { weight: "asc" }] },
    },
  });
  if (!fam) return new Response("Not found", { status: 404 });

  const base = fam.name.replace(/[^A-Za-z0-9]+/g, "") || slug;
  const zip = new JSZip();
  const dir = zip.folder(base) ?? zip;
  const parts = await Promise.all(fam.styles.map(async (s) => ({ s, buf: await readFont(fam.folder, s.file) })));
  let added = 0;
  for (const { s, buf } of parts) {
    if (!buf) continue;
    dir.file(`${base}-${s.style}.${s.ext}`, buf);
    added++;
  }
  if (!added) return new Response("Missing source", { status: 404 });

  const content = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });
  const dlName = `${base}.zip`;
  return new Response(new Uint8Array(content), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${dlName}"; filename*=UTF-8''${encodeURIComponent(dlName)}`,
    },
  });
}
