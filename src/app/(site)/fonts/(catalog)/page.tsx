import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { fetchCards, cardsFaceCSS } from "@/lib/queries";
import { CATEGORIES, CATEGORY_LABEL } from "@/lib/fonts";
import { formatNumber } from "@/lib/format";
import FontCard from "@/components/FontCard";
import { PUBLIC_FAMILY } from "@/lib/license";
import { CatalogShell, CatalogGrid } from "@/components/CatalogToolbar";

export const metadata = {
  title: "Shriftlar",
  description: "Bepul shriftlar katalogi: oʻz matningizni yozing, solishtiring va bir bosishda yuklab oling.",
  alternates: { canonical: "/fonts" },
};

const PAGE_SIZE = 24;

type SP = Promise<{ q?: string; cat?: string; sort?: string; page?: string; cyr?: string }>;

function orderFor(sort: string): Prisma.FamilyOrderByWithRelationInput[] {
  switch (sort) {
    case "az": return [{ name: "asc" }];
    case "za": return [{ name: "desc" }];
    case "styles": return [{ styleCount: "desc" }, { name: "asc" }];
    case "new": return [{ isNew: "desc" }, { createdAt: "desc" }];
    default: return [{ popularity: "desc" }, { name: "asc" }];
  }
}

const CAT_INTRO: Record<string, string> = {
  Sans: "Toza, zamonaviy va har qanday oʻlchamda oʻqiladigan shriftlar.",
  Serif: "Klassik, ishonchli va kitobiy ohangdagi shriftlar.",
  Slab: "Toʻrtburchak serifli, mustahkam va baquvvat shriftlar.",
  Display: "Sarlavha va brending uchun yorqin, xarakterli shriftlar.",
  Script: "Qoʻlyozma va kalligrafik ruhdagi shriftlar.",
  Monospace: "Har bir belgi bir xil kenglikda — kod va texnik matn uchun.",
  Dingbat: "Belgi, piktogramma va bezak shriftlari.",
};

export default async function FontsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  // Only accept known categories; drop arbitrary/junk cat values from the query.
  const cat = CATEGORIES.includes((sp.cat ?? "") as (typeof CATEGORIES)[number]) ? sp.cat! : "";
  const cyr = sp.cyr === "1";
  const sort = sp.sort ?? "popular";
  const reqPage = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  // Strip LIKE wildcards so "100%" / "a_b" don't match unexpectedly.
  const searchQ = q.replace(/[%_]/g, "");

  const where: Prisma.FamilyWhereInput = {
    ...PUBLIC_FAMILY,
    ...(cat ? { category: cat } : {}),
    ...(cyr ? { hasCyrillic: true } : {}),
    // Postgres LIKE is case-sensitive; without this "mont" misses "Montserrat".
    ...(searchQ ? { name: { contains: searchQ, mode: "insensitive" } } : {}),
  };

  const total = await db.family.count({ where });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(reqPage, pages); // clamp so ?page=999 shows the last page
  const cards = await fetchCards({ where, orderBy: orderFor(sort), take: PAGE_SIZE, skip: (page - 1) * PAGE_SIZE });
  const faceCSS = cardsFaceCSS(cards);

  const qs = (p: number) => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (cat) u.set("cat", cat);
    if (cyr) u.set("cyr", "1");
    if (sort !== "popular") u.set("sort", sort);
    if (p > 1) u.set("page", String(p));
    const s = u.toString();
    return s ? `/fonts?${s}` : "/fonts";
  };

  const title = q ? `“${q}”` : cat ? (CATEGORY_LABEL[cat] ?? cat) : cyr ? "Kirill yozuvli" : "Shriftlar";
  const intro = q
    ? "Nomi boʻyicha qidiruv natijalari."
    : cat ? CAT_INTRO[cat]
    : cyr ? "Oʻzbek va rus kirill yozuvini qoʻllab-quvvatlaydigan oilalar."
    : "Oʻz matningizni yozing, hajmni tanlang va oilalarni yonma-yon solishtiring.";

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: faceCSS }} />
      <div className="container">
        <header className="cat-head">
          <h1>{title}<sup>{formatNumber(total)}</sup></h1>
          <p>{intro}</p>
        </header>
      </div>

      <CatalogShell total={total}>
        <div className="container">
          {cards.length === 0 ? (
            <div className="empty">
              <div className="display">Hech narsa topilmadi</div>
              <p>Boshqa nom yoki kategoriyani sinab koʻring — yoki barcha shriftlarni koʻring.</p>
              <Link href="/fonts" className="btn btn-primary">Filtrlarni tozalash</Link>
            </div>
          ) : (
            <CatalogGrid>
              {cards.map((f) => <FontCard key={f.slug} f={f} headingLevel={2} />)}
            </CatalogGrid>
          )}

          {pages > 1 && (
            <nav className="pager" aria-label="Sahifalar">
              {page > 1 && <Link href={qs(page - 1)} rel="prev">← Oldingi</Link>}
              {pageWindow(page, pages).map((p, i) =>
                p === 0
                  ? <span key={`e${i}`} aria-hidden="true">…</span>
                  : p === page
                    ? <span key={p} className="cur" aria-current="page">{p}</span>
                    : <Link key={p} href={qs(p)}>{p}</Link>,
              )}
              {page < pages && <Link href={qs(page + 1)} rel="next">Keyingi →</Link>}
            </nav>
          )}
        </div>
      </CatalogShell>
    </>
  );
}

function pageWindow(cur: number, total: number): number[] {
  const out = new Set<number>([1, total, cur, cur - 1, cur + 1]);
  const arr = [...out].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const res: number[] = [];
  let prev = 0;
  for (const p of arr) {
    if (prev && p - prev > 1) res.push(0);
    res.push(p);
    prev = p;
  }
  return res;
}
