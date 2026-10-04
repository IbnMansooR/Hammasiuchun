import Link from "next/link";
import { formatNumber } from "@/lib/format";
import { getPublicCounts, DOWNLOADS_SHOWN_FROM } from "@/lib/stats";
import Facts from "@/components/Facts";
import { IconArrow } from "@/components/Icons";

export const metadata = { title: "Biz haqimizda", description: "Feekr — oʻzbek tili uchun bepul shriftlar kutubxonasi.", alternates: { canonical: "/about" } };

const PRINCIPLES = [
  { n: "01", t: "Hammasi bepul", d: "Katalogdagi har bir oila bepul yuklab olinadi — roʻyxatdan oʻtmasdan, toʻlovsiz." },
  { n: "02", t: "Oʻzbekcha birinchi", d: "Har bir shrift oʻ, gʻ va Ў, Қ, Ғ, Ҳ belgilari boʻyicha tekshiriladi; natija sahifasida ochiq yoziladi." },
  { n: "03", t: "Halol litsenziya", d: "Faqat tarqatishga ruxsat berilgan shriftlar joylanadi. Har bir ZIP ichida litsenziya matni bor." },
];

export default async function AboutPage() {
  const { families, styles, downloads } = await getPublicCounts();
  return (
    <div className="container">
      <header className="page-head narrow">
        <div className="eyebrow">Biz haqimizda</div>
        <h1>Shrift — brendning ovozi.</h1>
        <p className="lead">
          Feekr — dizaynerlar, brendlar va ijodkorlar uchun mustaqil shriftlar kutubxonasi. Maqsadimiz — oʻzbek
          tilida chiroyli yozish uchun kerak boʻlgan sifatli shriftlarni bir joyda, bepul taqdim etish.
        </p>
      </header>

      <Facts style={{ marginTop: 8 }} items={[
        [formatNumber(families), "shrift oilasi"],
        [formatNumber(styles), "uslub va kesim"],
        ...(downloads >= DOWNLOADS_SHOWN_FROM ? [[formatNumber(downloads), "marta yuklab olingan"] as [string, string]] : []),
        ["Toshkent", "Oʻzbekiston"],
      ]} />

      <section className="section" aria-labelledby="p-h">
        <div className="section-head"><h2 id="p-h">Tamoyillarimiz</h2></div>
        <ol className="principles">
          {PRINCIPLES.map((p) => (
            <li key={p.n}>
              <span className="idx" aria-hidden="true">{p.n}</span>
              <div>
                <h3>{p.t}</h3>
                <p>{p.d}</p>
              </div>
            </li>
          ))}
        </ol>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 32 }}>
          <Link href="/fonts" className="btn btn-accent btn-lg">Shriftlarni koʻrish <IconArrow className="ico" /></Link>
          <Link href="/license" className="btn btn-lg">Litsenziya shartlari</Link>
        </div>
      </section>
    </div>
  );
}
