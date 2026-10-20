import type { Metadata } from "next";
import Link from "@/components/LLink";
import { db } from "@/lib/db";
import { PUBLIC_FAMILY } from "@/lib/license";
import { cardFontStyle, cardInclude, cardsFaceCSS, toCard, type CardFont } from "@/lib/cards";
import { INDUSTRIES, MOODS, ROLES, ROLE_LABEL, industryLabel, isHex, isIndustry, isMood, kitsFor, moodLabel, pickFonts, readableOn, ruleKit, type Kit } from "@/lib/brandKit";
import { kitCardUrl } from "@/lib/brandKitCard";
import Swatch from "@/components/Swatch";
import { getLocale } from "@/i18n/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const ru = (await getLocale()) === "ru";
  return {
    title: "Brend palitrasi va shriftlar",
    description: "Biznesingiz uchun tayyor rang palitrasi va mos shriftlar juftligi: bepul, hex kodlari bilan, rasm qilib yuklab olinadi.",
    alternates: { canonical: "/brend" },
    ...(ru ? { robots: { index: false, follow: true } } : {}),
  };
}

type Card = { key: string; id: number | null; name: string; note: string; kit: Kit; head: CardFont; body: CardFont; industry: string; mood: string };

const cssOf = (k: Kit, h: string, b: string) =>
  `:root {\n  --bg: ${k.bg};\n  --text: ${k.text};\n  --primary: ${k.primary};\n  --accent: ${k.accent};\n  --soft: ${k.soft};\n  --font-heading: "${h}", serif;\n  --font-body: "${b}", sans-serif;\n}`;

export default async function BrendPage({ searchParams }: { searchParams: Promise<{ soha?: string; kayfiyat?: string; rang?: string; nom?: string }> }) {
  const sp = await searchParams;
  const industry = sp.soha && isIndustry(sp.soha) ? sp.soha : "";
  const mood = sp.kayfiyat && isMood(sp.kayfiyat) ? sp.kayfiyat : "";
  const base = sp.rang && isHex(`#${sp.rang.replace(/^#/, "")}`) ? `#${sp.rang.replace(/^#/, "").toLowerCase()}` : "";
  const brand = (sp.nom ?? "").replace(/[<>]/g, "").slice(0, 24).trim() || "Brendingiz";

  // 1) a colour of your own: the rule-based generator (no AI); 2) the ready library; 3) the generator again when the library has nothing.
  const wantIndustry = industry || "it", wantMood = mood || "zamonaviy";
  type Raw = { id: number | null; name: string; note: string; kit: Kit; headingSlug: string; bodySlug: string; industry: string; mood: string };
  let raws: Raw[] = [];
  if (!base) {
    const stored = await kitsFor(industry || null, mood || null, 12);
    raws = stored.map((s) => ({ id: s.id, name: s.name, note: s.note, kit: s.kit, headingSlug: s.headingSlug, bodySlug: s.bodySlug, industry: s.industry, mood: s.mood }));
  }
  if (raws.length === 0) {
    for (let v = 0; v < 6; v++) {
      const kit = ruleKit(wantIndustry, wantMood, v, base || undefined);
      const f = await pickFonts(wantMood, `${wantIndustry}${wantMood}${base}${v}`);
      if (f) raws.push({ id: null, name: base ? `Sizning rangingiz, ${v + 1}` : `${moodLabel(wantMood)}, ${v + 1}`, note: base ? "Siz tanlagan rang atrofida avtomatik tuzilgan palitra." : "Qoidalar asosida tuzilgan palitra.", kit, headingSlug: f.headingSlug, bodySlug: f.bodySlug, industry: wantIndustry, mood: wantMood });
    }
  }
  const slugs = [...new Set(raws.flatMap((r) => [r.headingSlug, r.bodySlug]))];
  const fams = slugs.length ? await db.family.findMany({ where: { ...PUBLIC_FAMILY, slug: { in: slugs } }, include: cardInclude }) : [];
  const bySlug = new Map(fams.map((f) => [f.slug, toCard(f)]));
  const cards: Card[] = raws.flatMap((r) => {
    const head = bySlug.get(r.headingSlug), body = bySlug.get(r.bodySlug);
    return head && body ? [{ key: `${r.id ?? "r"}-${r.name}`, id: r.id, name: r.name, note: r.note, kit: r.kit, head, body, industry: r.industry, mood: r.mood }] : [];
  });
  const faceCSS = cardsFaceCSS(cards.flatMap((c) => [c.head, c.body]));

  return (
    <div className="container">
      <style dangerouslySetInnerHTML={{ __html: faceCSS }} />
      <header className="page-head narrow">
        <div className="eyebrow">Brend</div>
        <h1>Brend palitrasi va shriftlar</h1>
        <p className="lead">Biznesingiz turi va kayfiyatini tanlang: besh rangli palitra va unga mos ikkita shrift chiqadi. Hammasi bepul, hex kodi bilan, rasm qilib yuklab olinadi.</p>
      </header>

      <form method="get" className="kit-form" aria-label="Palitra tanlash">
        <label>Soha
          <select name="soha" defaultValue={industry}>
            <option value="">Hammasi</option>
            {INDUSTRIES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label>Kayfiyat
          <select name="kayfiyat" defaultValue={mood}>
            <option value="">Hammasi</option>
            {MOODS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label>Oʻz rangingiz (ixtiyoriy)
          <input type="color" name="rang" defaultValue={base || "#009a76"} aria-label="Asosiy rang" />
        </label>
        <label>Brend nomi
          <input type="text" name="nom" maxLength={24} defaultValue={sp.nom ?? ""} placeholder="Brendingiz" />
        </label>
        <button className="btn btn-primary" type="submit">Koʻrsatish</button>
        {base && <Link href="/brend" className="btn">Oʻz rangimni olib tashlash</Link>}
      </form>
      <p className="muted" style={{ marginTop: 10 }}>
        {base ? `Rangingiz ${base.toUpperCase()} atrofida palitralar tuzildi.` : (industry || mood) ? `${industry ? industryLabel(industry) : "Hamma soha"} · ${mood ? moodLabel(mood) : "hamma kayfiyat"}` : "Barcha tayyor shablonlardan tanlab koʻrsatilmoqda: soha va kayfiyatni tanlang."}
      </p>

      {cards.length === 0 ? (
        <div className="empty"><div className="display">Hozircha shablon yoʻq</div><p>Boshqa soha yoki kayfiyatni tanlang.</p></div>
      ) : (
        <div className="kit-grid">
          {cards.map((c) => {
            const k = c.kit;
            const hs = cardFontStyle(c.head), bs = cardFontStyle(c.body);
            const css = cssOf(k, c.head.name, c.body.name);
            return (
              <article key={c.key} className="kit-card" aria-label={c.name}>
                <div className="kit-preview" style={{ background: k.bg, color: k.text }}>
                  <div className="kit-brand" style={{ ...hs, color: k.primary }}>{brand}</div>
                  <div className="kit-rule" style={{ background: k.accent }} />
                  <p style={{ ...bs, margin: 0 }}>Har bir harf brendingizning ovozi. Toʻgʻri tanlangan juftlik yodda qoladi.</p>
                  <span className="kit-btn" style={{ background: k.primary, color: readableOn(k.primary) }}>Buyurtma berish</span>
                  <span className="kit-chip" style={{ background: k.soft, color: k.text }}>{c.name}</span>
                </div>
                <div className="kit-swatches">
                  {ROLES.map((r) => <Swatch key={r} hex={k[r]} label={ROLE_LABEL[r]} fg={readableOn(k[r])} />)}
                </div>
                <div className="kit-meta">
                  <h2>{c.name}</h2>
                  {c.note && <p className="muted">{c.note}</p>}
                  <p className="kit-fonts">
                    <Link href={`/fonts/${c.head.slug}`}>{c.head.name}</Link> <span className="muted">(sarlavha)</span> + <Link href={`/fonts/${c.body.slug}`}>{c.body.name}</Link> <span className="muted">(matn)</span>
                  </p>
                  <div className="kit-actions">
                    <Swatch hex={k.primary} label="CSS" fg={readableOn(k.primary)} copy={css} shown="CSS nusxalash" />
                    {c.id && <a className="btn btn-sm" href={kitCardUrl(c.id, brand)} target="_blank" rel="noopener">Rasm sifatida</a>}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
