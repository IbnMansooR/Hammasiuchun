import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { PUBLIC_FAMILY } from "@/lib/license";
import { getCurrentUser } from "@/lib/userAuth";
import SubmitWorkForm from "@/components/SubmitWorkForm";
import { IconArrow, IconChevron } from "@/components/Icons";

export const metadata: Metadata = {
  title: "Ishingizni yuborish",
  description: "Feekr aʼzolari oʻz dizayn ishlarini “Dizaynerlar” boʻlimiga yuborishi mumkin. Har bir ish chop etishdan oldin koʻrib chiqiladi.",
  robots: { index: false },
};

export default async function SubmitWorkPage({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const [user, sp] = await Promise.all([getCurrentUser(), searchParams]);

  return (
    <div className="container">
      <nav className="crumbs" aria-label="Yoʻl">
        <Link href="/dizaynerlar">Dizaynerlar</Link>
        <IconChevron />
        <span>Ishingizni yuborish</span>
      </nav>
      <header className="page-head narrow" style={{ paddingTop: 28 }}>
        <h1>Ishingizni yuboring</h1>
        <p className="lead">Brending, logotip, qadoq, tipografiya: har qanday dizayn ishi. Biz koʻrib chiqamiz va maʼqul boʻlsa “Dizaynerlar” boʻlimida chop etamiz.</p>
      </header>

      {!user ? (
        <section className="submit-gate">
          <h2>Ish yuborish uchun hisob kerak</h2>
          <ul className="perks">
            <li><span>Ishingiz Feekr auditoriyasiga koʻrsatiladi, muallif sifatida havolangiz bilan.</span></li>
            <li><span>Qaysi shriftlar ishlatilganini belgilaysiz. Ish shu shriftlarning sahifasida ham chiqadi.</span></li>
            <li><span>Chop etilgach yoki rad etilsa, qoʻngʻiroqchada xabar olasiz.</span></li>
          </ul>
          <div className="submit-gate-actions">
            <Link href="/register" className="btn btn-primary btn-lg">Roʻyxatdan oʻtish <IconArrow className="ico" /></Link>
            <Link href="/login" className="btn btn-lg">Kirish</Link>
          </div>
        </section>
      ) : sp.sent ? (
        <section className="submit-gate" role="status">
          <h2>Qabul qilindi ✓</h2>
          <p className="lead">Ishingiz koʻrib chiqiladi. Natija haqida qoʻngʻiroqchada xabar beramiz. Holatini <Link href="/account/ishlarim" className="link">“Mening ishlarim”</Link> sahifasida koʻrishingiz mumkin.</p>
          <div className="submit-gate-actions">
            <Link href="/dizaynerlar/yuborish" className="btn">Yana bitta yuborish</Link>
            <Link href="/dizaynerlar" className="btn btn-ghost">Dizaynerlar</Link>
          </div>
        </section>
      ) : (
        <SubmitForm userName={user.name ?? ""} />
      )}
    </div>
  );
}

async function SubmitForm({ userName }: { userName: string }) {
  const fonts = await db.family.findMany({ where: PUBLIC_FAMILY, select: { slug: true, name: true }, orderBy: { name: "asc" } });
  return <SubmitWorkForm userName={userName} fonts={fonts} />;
}
