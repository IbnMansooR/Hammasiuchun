import { getAdOffer, getAudience } from "@/lib/adSales";
import { saveAdOfferAction } from "@/app/admin/adActions";
import { SITE_URL } from "@/lib/site";
import { botUsername } from "@/lib/telegram";
import { formatNumber } from "@/lib/format";
import AdsTabs from "@/components/admin/AdsTabs";
import CopyField from "@/components/admin/CopyField";
import UtmBuilder from "@/components/admin/UtmBuilder";
import Notice from "@/components/admin/Notice";
import SubmitButton from "@/components/SubmitButton";

export const metadata = { title: "Admin — Reklama narxlari va promo" };

export default async function AdOfferAdmin({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const [{ ok }, offer, aud] = await Promise.all([searchParams, getAdOffer(), getAudience().catch(() => null)]);
  const bot = botUsername();
  const fonts = aud?.fonts ?? 0;
  const link = (src: string) => `${SITE_URL}/?utm_source=${src}`;
  // Ready texts with the site's real numbers; the admin copies and adjusts them.
  const texts = [
    {
      title: "Instagram post / bio",
      body: `${fonts} ta bepul shrift — oʻzbek lotin va kirill harflari bilan 🇺🇿\nOʻ, Gʻ, Ў, Қ, Ғ, Ҳ toʻgʻri chiqadigan shriftlarni bir joyda sinab koʻring va bir bosishda yuklab oling.\nRoʻyxatdan oʻtish shart emas.\n\n👉 ${link("instagram")}`,
    },
    {
      title: "Telegram kanal yoki guruh uchun",
      body: `Dizaynerlar uchun foydali sayt: feekrfont.uz\n\n• ${fonts} ta bepul shrift, hammasi tijorat loyihalarida ham ishlatsa boʻladigan litsenziya bilan\n• Oʻzbek lotin va kirill harflarini qoʻllaydiganlari belgilangan\n• Matningizni yozib, shriftlarni darhol solishtirasiz\n\n${link("telegram")}${aud?.channel ? `\nKanal: @${aud.channel}` : ""}`,
    },
    {
      title: "Hamkor sahifa yoki blogerga xabar",
      body: `Assalomu alaykum! Biz feekrfont.uz — oʻzbek tilidagi bepul shriftlar kutubxonasini yuritamiz (${fonts} ta oila, lotin va kirill). Auditoriyangiz uchun foydali boʻlsa, bir post yoki storisda eslatib oʻtsangiz, xursand boʻlardik. Tayyor rasm va matn yuborishimiz mumkin. Havola: ${link("hamkor")}`,
    },
  ];
  return (
    <>
      <div className="adm-head">
        <div>
          <h1>Reklama</h1>
          <p className="adm-sub">“Reklama berish” sahifasidagi narxlar va Feekr’ni oʻzimiz reklama qilish uchun tayyor materiallar.</p>
        </div>
        <a href="/reklama" target="_blank" rel="noopener" className="btn btn-sm">Sahifani koʻrish ↗</a>
      </div>
      <AdsTabs current="/admin/ads/offer" />
      {ok === "saved" && <Notice>Narxlar saqlandi: “Reklama berish” sahifasida koʻrinadi.</Notice>}

      <section className="adm-card adm-pad">
        <h2 className="adm-h2">Narxlar</h2>
        <p className="adm-text">Boʻsh qoldirilsa, sahifada “Narx kelishiladi” deb chiqadi. Masalan: “250 000 soʻm / post”.</p>
        <form action={saveAdOfferAction} className="adm-ad-form">
          <div className="field-row">
            <div className="field"><label htmlFor="of-ch">Telegram kanal posti</label><input id="of-ch" name="channelPrice" maxLength={80} defaultValue={offer.channelPrice} /></div>
            <div className="field"><label htmlFor="of-site">Saytda banner</label><input id="of-site" name="sitePrice" maxLength={80} defaultValue={offer.sitePrice} /></div>
          </div>
          <div className="field"><label htmlFor="of-pack">Paket: kanal + sayt</label><input id="of-pack" name="packagePrice" maxLength={80} defaultValue={offer.packagePrice} /></div>
          <div className="field"><label htmlFor="of-note">Qoʻshimcha izoh (ixtiyoriy)</label><textarea id="of-note" name="note" rows={2} maxLength={600} defaultValue={offer.note} /></div>
          <SubmitButton className="btn btn-sm" pendingLabel="…">Saqlash</SubmitButton>
        </form>
        <p className="adm-meta">
          Sahifadagi auditoriya raqamlari avtomatik: {aud ? `${formatNumber(aud.visits)} tashrif / 30 kun, ${aud.subscribers !== null ? `${formatNumber(aud.subscribers)} obunachi` : "kanal obunachilari olinmadi"}` : "—"}.
          {bot ? ` Botda ariza: t.me/${bot}?start=reklama yoki /reklama.` : ""}
        </p>
      </section>

      <section className="adm-card adm-pad">
        <h2 className="adm-h2">Feekr’ni reklama qilish</h2>
        <h3 className="adm-h3">Havola yasash</h3>
        <p className="adm-text">Havolani qayerga qoʻysangiz, Statistika sahifasida tashriflar va roʻyxatdan oʻtishlar shu manbaga yoziladi.</p>
        <UtmBuilder site={SITE_URL} />
        <h3 className="adm-h3">Tayyor matnlar</h3>
        <div className="adm-promo-grid">
          {texts.map((t) => (
            <div key={t.title}>
              <p className="adm-text"><b>{t.title}</b></p>
              <CopyField value={t.body} label={t.title} multiline />
            </div>
          ))}
        </div>
        <h3 className="adm-h3">Tayyor rasmlar</h3>
        <p className="adm-text">Raqamlar saytdan olinadi. Rasmni ochib, saqlab oling.</p>
        <div className="adm-promo-img">
          <a href="/api/tg-image/promo/square" target="_blank" rel="noopener"><img src="/api/tg-image/promo/square" alt="Post uchun rasm (1080×1080)" loading="lazy" width={1080} height={1080} /></a>
          <a href="/api/tg-image/promo/story" target="_blank" rel="noopener"><img src="/api/tg-image/promo/story" alt="Storis uchun rasm (1080×1920)" loading="lazy" width={1080} height={1920} /></a>
        </div>
      </section>
    </>
  );
}
