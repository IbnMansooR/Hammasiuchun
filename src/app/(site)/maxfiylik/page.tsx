import Link from "@/components/LLink";
import type { Metadata } from "next";
import { alternates, getLocale } from "@/i18n/server";

const META = {
  uz: { title: "Maxfiylik", description: "Feekr qanday maʼlumot yigʻadi va nima uchun: anonim statistika, hisob maʼlumotlari va ularni oʻchirish." },
  ru: { title: "Конфиденциальность", description: "Какие данные собирает Feekr и зачем: анонимная статистика, данные аккаунта и их удаление." },
};

export async function generateMetadata(): Promise<Metadata> {
  return { ...META[await getLocale()], alternates: await alternates("/maxfiylik") };
}

export default async function PrivacyPage() {
  const ru = (await getLocale()) === "ru";
  return (
    <div className="container">
      <header className="page-head narrow">
        <div className="eyebrow">{ru ? "Конфиденциальность" : "Maxfiylik"}</div>
        <h1>{ru ? "Ваши данные" : "Maʼlumotlaringiz"}</h1>
        <p className="lead">
          {ru
            ? "Коротко: рекламных трекеров нет, статистика анонимна, данные аккаунта нужны только для работы сервиса."
            : "Qisqasi: reklama kuzatuvchilari yoʻq, statistika anonim, hisob maʼlumotlari faqat xizmat uchun."}
        </p>
      </header>
      {ru ? <BodyRu /> : <BodyUz />}
    </div>
  );
}

function BodyUz() {
  return (
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
      <h2>Telegram bot</h2>
      <p>
        Botdan foydalansangiz, faqat suhbat raqamingiz, birinchi va oxirgi marta yozgan vaqtingiz, necha marta yozganingiz va botga qayerdan kelganingiz (masalan “reklama”) saqlanadi.
        Ismingiz, username va yozgan matningiz <strong>saqlanmaydi</strong>; botni bloklasangiz, buni bilamiz va xabar yuborishni toʻxtatamiz.
        Faqat kunlik viktorinada oʻynasangiz, haftalik reyting uchun ismingiz, ballaringiz va ketma-ket kunlar soningiz saqlanadi (reytingda ismni yashirish mumkin). Kanaldagi viktorinada ham shunday: tugmani bossangiz, javobingiz (qaysi variant) shu hisob uchun saqlanadi, boshqa hech narsa emas.
      </p>

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
  );
}

function BodyRu() {
  return (
    <div className="prose" style={{ marginBottom: 80 }}>
      <h2>Анонимная статистика</h2>
      <p>
        Чтобы понимать, какие страницы смотрят чаще, сайт ведёт простую статистику: адрес страницы, откуда пришёл посетитель
        (например, из Instagram или Google), тип устройства (телефон или компьютер), страна и время на странице.
        Ещё мы считаем нажатия «Скачать» и «В избранное».
      </p>
      <ul>
        <li>IP-адрес <strong>не сохраняется</strong>. Посетитель учитывается по случайной метке, которая создаётся ключом, меняющимся каждый день, поэтому отследить одного человека изо дня в день нельзя.</li>
        <li>Рекламных и сторонних трекеров нет; данные третьим лицам не передаются.</li>
        <li>Если в браузере включены «Do Not Track» или «Global Privacy Control», статистика не записывается.</li>
        <li>Есть только одна короткая cookie: она 7 дней помнит, откуда вы пришли на сайт (например, «instagram»). Она вас не идентифицирует.</li>
      </ul>
      <h2>Telegram-бот</h2>
      <p>
        Если вы пользуетесь ботом, сохраняются только номер вашего чата, время первого и последнего обращения, их число и то, откуда вы пришли к боту (например, «reklama»).
        Имя, username и написанный вами текст <strong>не сохраняются</strong>; если вы заблокируете бота, мы это узнаем и перестанем писать.
        Только если вы играете в ежедневной викторине, для недельного рейтинга сохраняются имя, баллы и число дней подряд (имя в рейтинге можно скрыть). То же в викторине в канале: нажав кнопку, вы сохраняете только свой ответ (какой вариант) для этого подсчёта, ничего больше.
      </p>

      <h2>Аккаунт</h2>
      <p>
        При регистрации сохраняются email или номер телефона (или ваш аккаунт Google) и, по желанию, имя.
        Пароль хранится только в зашифрованном виде. Эти данные нужны для входа, уведомлений и защиты аккаунта.
      </p>
      <h2>Удаление</h2>
      <p>
        Если хотите удалить аккаунт и связанные с ним данные, напишите через <Link href="/support">раздел помощи</Link> — мы скоро всё удалим.
      </p>
    </div>
  );
}
