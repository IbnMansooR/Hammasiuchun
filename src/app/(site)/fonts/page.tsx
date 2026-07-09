import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { fetchCards, cardsFaceCSS } from "@/lib/queries";
import { CATEGORIES, CATEGORY_LABEL } from "@/lib/fonts";
import FontCard from "@/components/FontCard";
import CatalogToolbar from "@/components/CatalogToolbar";

export const metadata = { title: "Barcha shriftlar" };

const PAGE_SIZE = 24;

type SP = Promise<{ q?: string; cat?: string; filter?: string; sort?: string; page?: string; cyr?: string }>;

function orderFor(sort: string): Prisma.FamilyOrderByWithRelationInput[] {
  switch (sort) {
    case "az": return [{ name: "asc" }];
    case "za": return [{ name: "desc" }];
    case "styles": return [{ styleCount: "desc" }, { name: "asc" }];
    case "new": return [{ isNew: "desc" }, { createdAt: "desc" }];
    default: return [{ popularity: "desc" }, { name: "asc" }];
  }
}

export default async function FontsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  // Only accept known categories; drop arbitrary/junk cat values from the query.
  const cat = CATEGORIES.includes((sp.cat ?? "") as (typeof CATEGORIES)[number]) ? sp.cat! : "";
  const free = sp.filter === "free";
  const cyr = sp.cyr === "1";
  const sort = sp.sort ?? "popular";
  const reqPage = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  // Strip LIKE wildcards so "100%" / "a_b" don't match unexpectedly.
  const searchQ = q.replace(/[%_]/g, "");

  const where: Prisma.FamilyWhereInput = {
    isPublished: true,
    ...(cat ? { category: cat } : {}),
    ...(free ? { isFree: true } : {}),
    ...(cyr ? { hasCyrillic: true } : {}),
    ...(searchQ ? { name: { contains: searchQ } } : {}),
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
    if (free) u.set("filter", "free");
    if (cyr) u.set("cyr", "1");
    if (sort !== "popular") u.set("sort", sort);
    if (p > 1) u.set("page", String(p));
    const s = u.toString();
    return s ? `/fonts?${s}` : "/fonts";
  };

  return (
    <div className="container section" style={{ paddingTop: 30 }}>
      <style dangerouslySetInnerHTML={{ __html: faceCSS }} />
      <h1 style={{ fontSize: "clamp(30px,4vw,52px)", marginBottom: 22 }}>
        {q ? `“${q}” boʻyicha` : cat ? (CATEGORY_LABEL[cat] ?? cat) : "Barcha shriftlar"}
      </h1>

      <CatalogToolbar total={total} />

      {cards.length === 0 ? (
        <p className="muted" style={{ padding: "40px 0" }}>Hech narsa topilmadi. Boshqa so‘rovni sinab ko‘ring.</p>
      ) : (
        <div className="grid">
          {cards.map((f) => <FontCard key={f.slug} f={f} />)}
        </div>
      )}

      {pages > 1 && (
        <div className="pager">
          {page > 1 && <Link href={qs(page - 1)}>← Oldingi</Link>}
          {pageWindow(page, pages).map((p, i) =>
            p === 0
              ? <span key={`e${i}`}>…</span>
              : p === page
                ? <span key={p} className="cur">{p}</span>
                : <Link key={p} href={qs(p)}>{p}</Link>,
          )}
          {page < pages && <Link href={qs(page + 1)}>Keyingi →</Link>}
        </div>
      )}
    </div>
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
