import Link from "next/link";
import { FREEWARE_WARNING } from "@/lib/license";

export const metadata = {
  title: "Litsenziya",
  description: "Feekr’dagi barcha shriftlar bepul. Har bir oila oʻz muallifining litsenziyasi bilan tarqatiladi.",
  alternates: { canonical: "/license" },
};

const TOC = [
  { id: "umumiy", t: "Umumiy qoida" },
  { id: "ochiq", t: "Ochiq litsenziyalar" },
  { id: "freeware", t: "Freeware" },
  { id: "ruxsat", t: "Muallif ruxsati bilan" },
  { id: "mumkin-emas", t: "Nima mumkin emas" },
];

export default function LicensePage() {
  return (
    <div className="container">
      <header className="page-head narrow">
        <div className="eyebrow">Litsenziya</div>
        <h1>Foydalanish shartlari</h1>
        <p className="lead">Qisqasi: hamma shriftlar bepul. Har bir oila oʻz muallifining litsenziyasi bilan keladi — u shrift sahifasida va ZIP ichida yozilgan.</p>
      </header>
      <div className="split">
        <nav className="toc" aria-label="Mundarija">
          {TOC.map((x) => <a key={x.id} href={`#${x.id}`}>{x.t}</a>)}
        </nav>
        <div className="prose">
          <h2 id="umumiy">Umumiy qoida</h2>
          <p>
            Feekr’dagi barcha shriftlar <strong>bepul</strong>. Har bir oila oʻz muallifining litsenziyasi
            asosida tarqatiladi — u shrift sahifasida va yuklab olingan ZIP ichidagi <code>LITSENZIYA.txt</code> faylida
            koʻrsatilgan. Savol tugʻilsa <Link href="/support">yordam boʻlimi</Link> orqali bogʻlaning.
          </p>
          <h2 id="ochiq">Ochiq litsenziyalar — OFL, Apache, Public Domain</h2>
          <p>
            Shaxsiy va tijoriy loyihalarda, saytlarda, ilovalarda va bosma mahsulotlarda bepul ishlatish mumkin.
            OFL shriftlarni alohida (shrift sifatida) sotish mumkin emas.
          </p>
          <h2 id="freeware">Freeware</h2>
          <p>{FREEWARE_WARNING}</p>
          <h2 id="ruxsat">Muallif ruxsati bilan</h2>
          <p>Ayrim oilalar muallifning oʻzi yoki uning yozma ruxsati bilan bepul joylangan. Shartlar shrift sahifasida yozilgan.</p>
          <h2 id="mumkin-emas">Nima mumkin emas</h2>
          <ul>
            <li>Shrift fayllarini sotish yoki pullik toʻplamga qoʻshish.</li>
            <li>Mualliflik huquqi haqidagi yozuvlarni fayldan oʻchirish.</li>
          </ul>
          <blockquote>Agar sizga tegishli shrift bu yerda ruxsatsiz joylangan boʻlsa, biz bilan bogʻlaning — darhol olib tashlaymiz.</blockquote>
          <p><Link href="/support">Bogʻlanish →</Link></p>
        </div>
      </div>
    </div>
  );
}
