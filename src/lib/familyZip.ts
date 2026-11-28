// A whole family as one ZIP: every cut plus the licence terms. The site's download button and the
// copy the bot keeps in the Telegram file channel (lib/tgFiles) are the same file.
import JSZip from "jszip";
import { db } from "./db";
import { FREEWARE_WARNING, LICENSE_NOTE, isRedistributable } from "./license";
import { readFont } from "./storage";

export type FamilyZip = { name: string; data: Buffer };

/** null when the family isn't public or none of its files could be read. */
export async function familyZip(slug: string): Promise<FamilyZip | null> {
  const fam = await db.family.findUnique({
    where: { slug },
    select: {
      name: true, folder: true, isPublished: true, licenseClass: true, copyright: true, license: true,
      designer: true, licenseUrl: true,
      styles: { select: { style: true, ext: true, file: true }, orderBy: [{ italic: "asc" }, { weight: "asc" }] },
    },
  });
  if (!fam || !fam.isPublished || !isRedistributable(fam.licenseClass)) return null;

  const base = fam.name.replace(/[^A-Za-z0-9]+/g, "") || slug;
  const zip = new JSZip();
  const dir = zip.folder(base) ?? zip;

  // Read every cut from storage in parallel, then add the ones that exist.
  const parts = await Promise.all(fam.styles.map(async (s) => ({ s, buf: await readFont(fam.folder, s.file) })));
  let added = 0;
  for (const { s, buf } of parts) {
    if (!buf) continue;
    dir.file(`${base}-${s.style}.${s.ext}`, buf);
    added++;
  }
  if (!added) return null;

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

  const data = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });
  return { name: `${base}.zip`, data };
}
