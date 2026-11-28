import Link from "next/link";
import WorkForm from "@/components/admin/WorkForm";
import Notice from "@/components/admin/Notice";
import { IconChevron } from "@/components/Icons";

export const metadata = { title: "Admin — Yangi ish" };

const ERR: Record<string, string> = { title: "Nomini kiriting.", author: "Hamkor ishi uchun muallif nomini kiriting." };

export default async function NewWork({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <>
      <nav className="crumbs" aria-label="Yoʻl" style={{ paddingTop: 0, marginBottom: 14 }}>
        <Link href="/admin/works">Dizaynerlar</Link><IconChevron /><span>Yangi ish</span>
      </nav>
      <div className="adm-head"><h1>Yangi ish</h1></div>
      {error && <Notice tone="error">{ERR[error] ?? "Xatolik yuz berdi."}</Notice>}
      <WorkForm />
    </>
  );
}
