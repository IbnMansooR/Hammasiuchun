import { db } from "@/lib/db";
import { formatNumber } from "@/lib/format";

export const metadata = { title: "Biz haqimizda" };
// Refresh periodically so the counts don't stay frozen at build time.
export const revalidate = 3600;

async function counts(): Promise<[number, number]> {
  // Never let a build-time DB hiccup fail prerender; revalidate fills real values.
  try {
    return await Promise.all([
      db.family.count({ where: { isPublished: true } }),
      db.style.count({ where: { family: { isPublished: true } } }),
    ]);
  } catch {
    return [2000, 10000];
  }
}

export default async function AboutPage() {
  const [families, styles] = await counts();
  return (
    <div className="container section" style={{ paddingTop: 40 }}>
      <div style={{ maxWidth: 820 }}>
        <div className="eyebrow">Biz haqimizda</div>
        <h1 style={{ fontSize: "clamp(34px,6vw,72px)", letterSpacing: "-.03em" }}>
          Feekr — shrift bu ovoz degan ishonchda.
        </h1>
        <div className="prose" style={{ marginTop: 24 }}>
          <p>
            Feekr — dizaynerlar, brendlar va ijodkorlar uchun mustaqil shrift ombori. Bizning
            maqsadimiz — har bir loyihaga mos, sifatli va xarakterli shriftlarni bir joyda taqdim etish.
          </p>
          <p>
            Katalogimizda {formatNumber(families)} dan ortiq shrift oilasi va{" "}
            {formatNumber(styles)} uslub mavjud — geometrik grotesklardan tortib
            ekspressiv display shriftlargacha. Har birini bepul sinab ko&apos;ring.
          </p>
          <h3>Litsenziya</h3>
          <p>
            Har bir shrift desktop va web (WOFF2) foydalanish uchun litsenziyalanadi. Demo
            versiyalar bepul sinash uchun. To&apos;liq oila litsenziyasi loyihangizda cheksiz
            foydalanish huquqini beradi.
          </p>
        </div>
      </div>
    </div>
  );
}
