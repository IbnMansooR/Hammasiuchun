import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const ROOT = path.resolve(url.fileURLToPath(new URL("..", import.meta.url)));
const db = new PrismaClient();

const FEATURED = ["montserrat", "poppins", "gilroy", "tt-commons", "muller", "geometria",
  "sf-pro-display", "fonseca", "zuume", "aileron", "creato-display", "zona-pro", "tt-norms"];
const NEW = ["muller", "zuume", "fonseca", "creato-display", "geometria"];

// Licence classes an admin sets by hand after confirming the rights — a re-seed
// must never overwrite them with the class derived from the font file.
const CONFIRMED = ["Own", "Licensed"];

const TAGLINES = {
  montserrat: "Buenos-Ayres ko'chalaridan ilhomlangan geometrik grotesk.",
  poppins: "Toza, geometrik va universal — har qanday interfeys uchun.",
  gilroy: "Zamonaviy geometrik sans-serif, kuchli sarlavhalar uchun.",
  "tt-commons": "Ko'p qirrali korporativ oila — brending uchun ideal.",
  muller: "Aniq va ishonchli — 16 uslubli mustahkam grotesk.",
  geometria: "Sof geometriya asosidagi minimalist sans.",
};

async function seedFonts() {
  const catPath = path.join(ROOT, "data", "catalog.json");
  const cat = JSON.parse(fs.readFileSync(catPath, "utf8"));
  console.log(`[seed] ${cat.families.length} families from catalog`);
  let n = 0;
  const catalogSlugs = [];
  for (const f of cat.families) {
    catalogSlugs.push(f.slug);
    // Font-derived technical fields — always refreshed from the catalog.
    const technical = {
      name: f.family, folder: f.folder, manufacturer: f.manufacturer,
      copyright: f.copyright, license: f.license, licenseUrl: f.licenseUrl,
      version: f.version, glyphs: f.glyphs || 0,
      hasLatin: !!f.hasLatin, hasCyrillic: !!f.hasCyrillic, hasItalic: !!f.hasItalic,
      styleCount: f.styleCount,
    };
    // Commerce / editorial defaults — only applied on CREATE so a re-seed never
    // clobbers admin edits made through the panel.
    const defaults = {
      category: f.category, designer: f.designer, designerUrl: f.designerUrl,
      tier: "free", isFree: true, priceCents: 0, // every font is free
      isFeatured: FEATURED.includes(f.slug), isNew: NEW.includes(f.slug),
      tagline: TAGLINES[f.slug] || null,
      popularity: FEATURED.includes(f.slug) ? 100 : f.styleCount,
    };
    const fam = await db.family.upsert({
      where: { slug: f.slug },
      update: technical,
      create: { slug: f.slug, ...technical, ...defaults, licenseClass: f.licenseClass },
    });
    await db.family.updateMany({
      where: { id: fam.id, licenseClass: { notIn: CONFIRMED } },
      data: { licenseClass: f.licenseClass },
    });
    const styleData = Array.isArray(f.styles) ? f.styles : [];
    await db.$transaction([
      db.style.deleteMany({ where: { familyId: fam.id } }),
      db.style.createMany({
        data: styleData.map((s) => ({
          familyId: fam.id, style: s.style, subfamily: s.subfamily,
          weight: s.weight, italic: !!s.italic, ext: s.ext, file: s.file, size: s.size || 0,
        })),
      }),
    ]);
    if (++n % 400 === 0) console.log(`[seed] ${n}/${cat.families.length}`);
  }
  console.log(`[seed] fonts done: ${n}`);

  // Report (or optionally prune) families no longer present in the catalog.
  const orphans = await db.family.findMany({
    where: { slug: { notIn: catalogSlugs }, isPublished: true },
    select: { slug: true },
  });
  if (orphans.length) {
    if (process.env.SEED_PRUNE === "1") {
      await db.family.updateMany({
        where: { slug: { in: orphans.map((o) => o.slug) } },
        data: { isPublished: false },
      });
      console.log(`[seed] unpublished ${orphans.length} orphan families (not in catalog)`);
    } else {
      console.warn(`[seed] WARNING: ${orphans.length} published families are not in catalog.json ` +
        `(their files may be gone). Re-run with SEED_PRUNE=1 to unpublish them.`);
    }
  }
}

async function seedAdmin() {
  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    console.warn("[seed] ADMIN_PASSWORD not set — skipping admin user creation. " +
      "Set ADMIN_PASSWORD (and optionally ADMIN_USERNAME) to seed the admin account.");
    return;
  }
  const passwordHash = bcrypt.hashSync(password, 10);
  await db.admin.upsert({
    where: { username }, update: { passwordHash }, create: { username, passwordHash },
  });
  console.log(`[seed] admin user '${username}' ready`);
}

async function seedArticles() {
  // Fixed publish dates so re-seeding doesn't shuffle the blog order.
  const posts = [
    {
      slug: "feekrga-xush-kelibsiz", type: "blog", title: "Feekr'ga xush kelibsiz",
      excerpt: "Yangi mustaqil shrift ombori — 2000 dan ortiq oila bir joyda.",
      body: "## Feekr nima?\n\nFeekr — dizaynerlar va brendlar uchun mustaqil shrift ombori. Bizning to'plamimizda 2000 dan ortiq shrift oilasi mavjud: geometrik grotesklardan tortib, ekspressiv display shriftlargacha.\n\nHar bir shriftni bepul sinab ko'ring, keyin loyihangiz uchun litsenziya oling.",
      author: "Feekr", tags: "e'lon,foundry", isPublished: true, publishedAt: new Date("2026-06-01T09:00:00Z"),
    },
    {
      slug: "shrift-tanlash-boyicha-qollanma", type: "article", title: "Shrift tanlash bo'yicha qo'llanma",
      excerpt: "Brendingiz uchun to'g'ri shriftni qanday tanlash kerak — amaliy maslahatlar.",
      body: "## Shrift shaxsiyatdir\n\nShrift — brendingizning ovozi. To'g'ri tanlangan shrift xabaringizni kuchaytiradi.\n\n### Sarlavhalar uchun\nKuchli, xarakterli display yoki qalin grotesk shriftlar.\n\n### Matn uchun\nO'qilishi oson, neytral sans yoki serif shriftlar.",
      author: "Feekr", tags: "qo'llanma,dizayn", isPublished: true,
      publishedAt: new Date("2026-05-30T09:00:00Z"),
    },
    {
      slug: "yangi-shriftlar-2026", type: "news", title: "2026 yil yangi shriftlar to'plami",
      excerpt: "Omborga yuzlab yangi oila qo'shildi. Eng so'nggilarini ko'ring.",
      body: "Ushbu oyda Feekr omboriga ko'plab yangi shrift oilalari qo'shildi. Montserrat, Poppins, Muller va boshqa mashhur oilalar endi platformada mavjud.",
      author: "Feekr", tags: "yangilik", isPublished: true,
      publishedAt: new Date("2026-05-27T09:00:00Z"),
    },
  ];
  let created = 0;
  for (const p of posts) {
    // Create-only: never overwrite admin edits to the seed articles.
    const existing = await db.article.findUnique({ where: { slug: p.slug } });
    if (!existing) { await db.article.create({ data: p }); created++; }
  }
  console.log(`[seed] articles: ${created} created, ${posts.length - created} left untouched`);
}

async function main() {
  await seedFonts();
  await seedAdmin();
  await seedArticles();
  const counts = {
    families: await db.family.count(), styles: await db.style.count(),
    articles: await db.article.count(), admins: await db.admin.count(),
    featured: await db.family.count({ where: { isFeatured: true } }),
  };
  console.log("[seed] counts:", counts);
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exitCode = 1;
  });
