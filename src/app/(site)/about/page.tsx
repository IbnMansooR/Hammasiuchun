import { db } from "@/lib/db";
import { formatNumber } from "@/lib/format";
import { PUBLIC_FAMILY } from "@/lib/license";

export const metadata = { title: "Biz haqimizda" };
// Refresh periodically so the counts don't stay frozen at build time.
export const revalidate = 3600;

async function counts(): Promise<[number, number]> {
  // Never let a build-time DB hiccup fail prerender; revalidate fills real values.
  try {
    return await Promise.all([
      db.family.count({ where: PUBLIC_FAMILY }),
      db.style.count({ where: { family: PUBLIC_FAMILY } }),
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
          Feekr shrift — brendning ovozi, degan gʻoyaga tayanadi.
        </h1>
        <div className="prose" style={{ marginTop: 24 }}>
          <p>
            Feekr — dizaynerlar, brendlar va ijodkorlar uchun mustaqil shriftlar kutubxonasi. Bizning
            maqsadimiz — har bir loyihaga mos, sifatli va xarakterli shriftlarni bir joyda, bepul taqdim etish.
          </p>
          <p>
            Katalogimizda {formatNumber(families)} ta shrift oilasi va {formatNumber(styles)} ta uslub bor.
            Hammasi bepul: sinab koʻring va yuklab oling.
          </p>
          <h2>Litsenziya</h2>
          <p>
            Har bir oila oʻz muallifining litsenziyasi bilan tarqatiladi. Litsenziya shrift sahifasida va
            ZIP ichidagi LITSENZIYA.txt faylida yozilgan. Batafsil: <a href="/license">foydalanish shartlari</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
