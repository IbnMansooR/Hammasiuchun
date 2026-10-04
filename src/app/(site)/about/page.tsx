import { formatNumber } from "@/lib/format";
import { getPublicCounts } from "@/lib/stats";

export const metadata = { title: "Biz haqimizda" };

export default async function AboutPage() {
  const { families, styles } = await getPublicCounts();
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
