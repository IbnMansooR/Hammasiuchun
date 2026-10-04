import { FREEWARE_WARNING } from "@/lib/license";

export const metadata = {
  title: "Litsenziya",
  description: "Feekr’dagi barcha shriftlar bepul. Har bir oila oʻz muallifining litsenziyasi bilan tarqatiladi.",
};

export default function LicensePage() {
  return (
    <div className="container section" style={{ paddingTop: 40 }}>
      <div style={{ maxWidth: 760 }}>
        <div className="eyebrow">Litsenziya</div>
        <h1 style={{ fontSize: "clamp(32px,5vw,60px)" }}>Foydalanish shartlari</h1>
        <div className="prose" style={{ marginTop: 20 }}>
          <p>
            Feekr’dagi barcha shriftlar <strong>bepul</strong>. Har bir oila oʻz muallifining litsenziyasi
            asosida tarqatiladi — u shrift sahifasida va yuklab olingan ZIP ichidagi <code>LITSENZIYA.txt</code> faylida
            koʻrsatilgan. Savol tugʻilsa <a href="/support">yordam boʻlimi</a> orqali bogʻlaning.
          </p>

          <h2>Ochiq litsenziyalar (OFL, Apache, Public Domain)</h2>
          <p>
            Shaxsiy va tijoriy loyihalarda, saytlarda, ilovalarda va bosma mahsulotlarda bepul ishlatish mumkin.
            OFL shriftlarni alohida (shrift sifatida) sotish mumkin emas.
          </p>

          <h2>Freeware</h2>
          <p>{FREEWARE_WARNING}</p>

          <h2>Muallif ruxsati bilan</h2>
          <p>
            Ayrim oilalar muallifning oʻzi yoki uning yozma ruxsati bilan bepul joylangan. Shartlar shrift sahifasida yozilgan.
          </p>

          <h2>Nima mumkin emas</h2>
          <ul>
            <li>Shrift fayllarini sotish yoki pullik toʻplamga qoʻshish.</li>
            <li>Mualliflik huquqi haqidagi yozuvlarni fayldan oʻchirish.</li>
          </ul>

          <p className="muted" style={{ fontSize: 13.5, marginTop: 24 }}>
            Agar sizga tegishli shrift bu yerda ruxsatsiz joylangan boʻlsa, <a href="/support">biz bilan bogʻlaning</a> — darhol olib tashlaymiz.
          </p>
        </div>
      </div>
    </div>
  );
}
