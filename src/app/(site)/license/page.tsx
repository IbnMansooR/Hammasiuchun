export const metadata = {
  title: "Litsenziya",
  description: "Feekr shrift litsenziyalari — desktop va web foydalanish shartlari.",
};

export default function LicensePage() {
  return (
    <div className="container section" style={{ paddingTop: 40 }}>
      <div style={{ maxWidth: 760 }}>
        <div className="eyebrow">Litsenziya</div>
        <h1 style={{ fontSize: "clamp(32px,5vw,60px)" }}>Foydalanish shartlari</h1>
        <div className="prose" style={{ marginTop: 20 }}>
          <p>
            Feekr katalogidagi har bir shrift oilasi quyidagi shartlar asosida taqdim etiladi.
            Savol tugʻilsa <a href="/support">yordam boʻlimi</a> orqali bogʻlaning.
          </p>

          <h3>Bepul (Free) shriftlar</h3>
          <p>
            Butun oila shaxsiy va tijorat loyihalarida bepul ishlatiladi. Shriftni qayta sotish
            yoki oʻzgartirmasdan tarqatish taqiqlanadi.
          </p>

          <h3>Demo shriftlar</h3>
          <p>
            Demo versiya (Regular kesim) sinash uchun bepul yuklab olinadi. Loyihada toʻliq
            foydalanish uchun oilaning toʻliq litsenziyasini xarid qiling.
          </p>

          <h3>Toʻliq (Paid) litsenziya</h3>
          <p>
            Toʻliq oila litsenziyasi desktop va web (WOFF2) foydalanish uchun umrbod huquq beradi.
            Litsenziya bitta brend/tashkilot doirasida amal qiladi va uchinchi shaxsga oʻtkazilmaydi.
          </p>

          <h3>Nima taqiqlanadi</h3>
          <ul>
            <li>Shrift fayllarini oʻzgartirmasdan yoki oʻzgartirib qayta sotish.</li>
            <li>Litsenziyani boshqa shaxs/tashkilotga oʻtkazish.</li>
            <li>Demo kesimlarini tijorat mahsulotida ishlatish.</li>
          </ul>

          <p className="muted" style={{ fontSize: 13.5, marginTop: 24 }}>
            Toʻlov tizimi tez orada ulanadi. Hozircha litsenziya xaridi uchun{" "}
            <a href="/support">biz bilan bogʻlaning</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
