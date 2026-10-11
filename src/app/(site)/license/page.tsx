import Link from "@/components/LLink";
import type { Metadata } from "next";
import { FREEWARE_WARNING, FREEWARE_WARNING_RU } from "@/lib/license";
import { alternates, getLocale } from "@/i18n/server";

const META = {
  uz: { title: "Litsenziya", description: "Feekr’dagi barcha shriftlar bepul. Har bir oila oʻz muallifining litsenziyasi bilan tarqatiladi." },
  ru: { title: "Лицензия", description: "Все шрифты на Feekr бесплатны. Каждое семейство распространяется по лицензии своего автора." },
};

export async function generateMetadata(): Promise<Metadata> {
  return { ...META[await getLocale()], alternates: await alternates("/license") };
}

const TOC = {
  uz: [
    { id: "umumiy", t: "Umumiy qoida" },
    { id: "ochiq", t: "Ochiq litsenziyalar" },
    { id: "freeware", t: "Freeware" },
    { id: "ruxsat", t: "Muallif ruxsati bilan" },
    { id: "mumkin-emas", t: "Nima mumkin emas" },
  ],
  ru: [
    { id: "umumiy", t: "Общее правило" },
    { id: "ochiq", t: "Открытые лицензии" },
    { id: "freeware", t: "Freeware" },
    { id: "ruxsat", t: "С разрешения автора" },
    { id: "mumkin-emas", t: "Что нельзя" },
  ],
};

export default async function LicensePage() {
  const locale = await getLocale();
  const ru = locale === "ru";
  return (
    <div className="container">
      <header className="page-head narrow">
        <div className="eyebrow">{ru ? "Лицензия" : "Litsenziya"}</div>
        <h1>{ru ? "Условия использования" : "Foydalanish shartlari"}</h1>
        <p className="lead">
          {ru
            ? "Коротко: все шрифты бесплатны. Каждое семейство идёт с лицензией своего автора — она указана на странице шрифта и в ZIP-архиве."
            : "Qisqasi: hamma shriftlar bepul. Har bir oila oʻz muallifining litsenziyasi bilan keladi — u shrift sahifasida va ZIP ichida yozilgan."}
        </p>
      </header>
      <div className="split">
        <nav className="toc" aria-label={ru ? "Содержание" : "Mundarija"}>
          {TOC[locale].map((x) => <a key={x.id} href={`#${x.id}`}>{x.t}</a>)}
        </nav>
        {ru ? <BodyRu /> : <BodyUz />}
      </div>
    </div>
  );
}

function BodyUz() {
  return (
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
  );
}

function BodyRu() {
  return (
    <div className="prose">
      <h2 id="umumiy">Общее правило</h2>
      <p>
        Все шрифты на Feekr <strong>бесплатны</strong>. Каждое семейство распространяется по лицензии своего
        автора — она указана на странице шрифта и в файле <code>LITSENZIYA.txt</code> внутри скачанного ZIP-архива.
        Если появились вопросы, напишите нам через <Link href="/support">раздел помощи</Link>.
      </p>
      <h2 id="ochiq">Открытые лицензии — OFL, Apache, Public Domain</h2>
      <p>
        Можно бесплатно использовать в личных и коммерческих проектах, на сайтах, в приложениях и в печати.
        Продавать OFL-шрифты отдельно (как шрифты) нельзя.
      </p>
      <h2 id="freeware">Freeware</h2>
      <p>{FREEWARE_WARNING_RU}</p>
      <h2 id="ruxsat">С разрешения автора</h2>
      <p>Некоторые семейства размещены бесплатно самим автором или с его письменного разрешения. Условия указаны на странице шрифта.</p>
      <h2 id="mumkin-emas">Что нельзя</h2>
      <ul>
        <li>Продавать файлы шрифтов или включать их в платные наборы.</li>
        <li>Удалять из файлов сведения об авторских правах.</li>
      </ul>
      <blockquote>Если здесь без разрешения размещён ваш шрифт, свяжитесь с нами — мы сразу его уберём.</blockquote>
      <p><Link href="/support">Связаться →</Link></p>
    </div>
  );
}
