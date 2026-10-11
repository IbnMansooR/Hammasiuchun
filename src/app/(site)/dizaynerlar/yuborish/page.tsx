import Link from "@/components/LLink";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { PUBLIC_FAMILY } from "@/lib/license";
import { getCurrentUser } from "@/lib/userAuth";
import SubmitWorkForm from "@/components/SubmitWorkForm";
import { IconArrow, IconChevron } from "@/components/Icons";
import { getLocale } from "@/i18n/server";
import { DICTS } from "@/i18n/dict";

export async function generateMetadata(): Promise<Metadata> {
  const t = DICTS[await getLocale()].works;
  return { title: t.submitMetaTitle, description: t.submitMetaDescription, robots: { index: false } };
}

export default async function SubmitWorkPage({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const [user, sp, locale] = await Promise.all([getCurrentUser(), searchParams, getLocale()]);
  const t = DICTS[locale].works;

  return (
    <div className="container">
      <nav className="crumbs" aria-label={t.crumbs}>
        <Link href="/dizaynerlar">{t.title}</Link>
        <IconChevron />
        <span>{t.submitCrumb}</span>
      </nav>
      <header className="page-head narrow" style={{ paddingTop: 28 }}>
        <h1>{t.submitTitle}</h1>
        <p className="lead">{t.submitLead}</p>
      </header>

      {!user ? (
        <section className="submit-gate">
          <h2>{t.gateTitle}</h2>
          <ul className="perks">
            {t.gatePerks.map((p) => <li key={p}><span>{p}</span></li>)}
          </ul>
          <div className="submit-gate-actions">
            <Link href="/register" className="btn btn-primary btn-lg">{t.register} <IconArrow className="ico" /></Link>
            <Link href="/login" className="btn btn-lg">{t.login}</Link>
          </div>
        </section>
      ) : sp.sent ? (
        <section className="submit-gate" role="status">
          <h2>{t.sentTitle}</h2>
          <p className="lead">{t.sentA}<Link href="/account/ishlarim" className="link">{t.sentLink}</Link>{t.sentB}</p>
          <div className="submit-gate-actions">
            <Link href="/dizaynerlar/yuborish" className="btn">{t.another}</Link>
            <Link href="/dizaynerlar" className="btn btn-ghost">{t.title}</Link>
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
