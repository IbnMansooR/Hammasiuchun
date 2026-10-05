import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import AdForm from "@/components/admin/AdForm";
import Notice from "@/components/admin/Notice";
import { IconChevron } from "@/components/Icons";

export const metadata = { title: "Admin — Bannerni tahrirlash" };

const ERRORS: Record<string, string> = {
  title: "Nomini kiriting.",
  href: "Havola https:// bilan boshlanishi kerak.",
  placement: "Joyni tanlang.",
  image: "Banner rasmini yuklang.",
  dates: "Sanalar notoʻgʻri: tugash vaqti boshlanishdan keyin boʻlsin.",
};

export default async function EditAd({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const { error } = await searchParams;
  const n = Number(id);
  const ad = Number.isInteger(n) && n > 0 ? await db.ad.findUnique({ where: { id: n } }) : null;
  if (!ad) notFound();
  return (
    <>
      <nav className="crumbs" aria-label="Yoʻl" style={{ paddingTop: 0, marginBottom: 14 }}>
        <Link href="/admin/ads">Reklama</Link><IconChevron /><span>{ad.title}</span>
      </nav>
      <div className="adm-head"><h1>{ad.title}</h1></div>
      {error && <Notice tone="error">{ERRORS[error] ?? "Xatolik yuz berdi."}</Notice>}
      <AdForm ad={ad} />
    </>
  );
}
