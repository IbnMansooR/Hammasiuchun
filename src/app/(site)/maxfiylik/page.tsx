import Link from "next/link";

export const metadata = {
  title: "Maxfiylik",
  description: "Feekr qanday maʼlumot yigʻadi va nima uchun: anonim statistika, hisob maʼlumotlari va ularni oʻchirish.",
  alternates: { canonical: "/maxfiylik" },
};

export default function PrivacyPage() {
  return (
    <div className="container">
      <header className="page-head narrow">
        <div className="eyebrow">Maxfiylik</div>
        <h1>Maʼlumotlaringiz</h1>
        <p className="lead">Qisqasi: reklama kuzatuvchilari yoʻq, statistika anonim, hisob maʼlumotlari faqat xizmat uchun.</p>
      </header>
      <div className="prose" style={{ marginBottom: 80 }}>
        <h2>Anonim statistika</h2>
        <p>
          Sayt qaysi sahifalar koʻproq koʻrilishini bilish uchun oddiy statistika yuritadi: sahifa manzili, qayerdan kelgani
          (masalan Instagram yoki Google), qurilma turi (telefon yoki kompyuter), mamlakat va sahifada qancha turgani.
          Shuningdek “yuklab olish” va “sevimlilarga qoʻshish” bosilganini sanaymiz.
        </p>
        <ul>
          <li>IP-manzil <strong>saqlanmaydi</strong>. Mehmon har kuni oʻzgaradigan kalit bilan hosil qilingan tasodifiy belgi bilan sanaladi, shuning uchun bir kishini kundan kunga kuzatib boʻlmaydi.</li>
          <li>Reklama yoki uchinchi tomon kuzatuvchilari yoʻq; maʼlumot uchinchi tomonga berilmaydi.</li>
          <li>Brauzeringizda “Do Not Track” yoki “Global Privacy Control” yoqilgan boʻlsa, statistika yozilmaydi.</li>
          <li>Faqat bitta qisqa cookie bor: u saytga qayerdan kelganingizni (masalan “instagram”) 7 kun eslab turadi. U sizni aniqlamaydi.</li>
        </ul>
        <h2>Hisob</h2>
        <p>
          Roʻyxatdan oʻtsangiz, sizdan email yoki telefon raqami (yoki Google hisobingiz) va ixtiyoriy ism saqlanadi.
          Parol faqat shifrlangan koʻrinishda turadi. Bu maʼlumotlar kirish, bildirishnomalar va hisobingizni himoya qilish uchun kerak.
        </p>
        <h2>Oʻchirish</h2>
        <p>
          Hisobingizni va unga bogʻliq maʼlumotlarni oʻchirishni xohlasangiz, <Link href="/support">yordam boʻlimi</Link> orqali yozing: tez orada oʻchiramiz.
        </p>
      </div>
    </div>
  );
}
