import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import WorkForm from "@/components/admin/WorkForm";
import Notice from "@/components/admin/Notice";
import { IconArrowUR, IconChevron } from "@/components/Icons";

export const metadata = { title: "Admin — Ishni tahrirlash" };

const ERR: Record<string, string> = { title: "Nomini kiriting.", author: "Hamkor ishi uchun muallif nomini kiriting." };

export default async function EditWork({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const { error } = await searchParams;
  const n = Number(id);
  const work = Number.isInteger(n) && n > 0 ? await db.work.findUnique({ where: { id: n } }) : null;
  if (!work) notFound();
  return (
    <>
      <nav className="crumbs" aria-label="Yoʻl" style={{ paddingTop: 0, marginBottom: 14 }}>
        <Link href="/admin/works">Dizaynerlar</Link><IconChevron /><span>{work.title}</span>
      </nav>
      <div className="adm-head">
        <h1>{work.title}</h1>
        {work.isPublished && (
          <Link href={`/dizaynerlar/${work.slug}`} target="_blank" className="btn btn-sm">Saytda koʻrish <IconArrowUR className="ico" /></Link>
        )}
      </div>
      {error && <Notice tone="error">{ERR[error] ?? "Xatolik yuz berdi."}</Notice>}
      <WorkForm work={work} />
    </>
  );
}
