import Link from "next/link";
import AdForm from "@/components/admin/AdForm";
import Notice from "@/components/admin/Notice";
import { IconChevron } from "@/components/Icons";

export const metadata = { title: "Admin — Yangi banner" };

const ERRORS: Record<string, string> = {
  title: "Nomini kiriting.",
  href: "Havola https:// bilan boshlanishi kerak.",
  placement: "Joyni tanlang.",
  image: "Banner rasmini yuklang.",
  dates: "Sanalar notoʻgʻri: tugash vaqti boshlanishdan keyin boʻlsin.",
};

export default async function NewAd({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <>
      <nav className="crumbs" aria-label="Yoʻl" style={{ paddingTop: 0, marginBottom: 14 }}>
        <Link href="/admin/ads">Reklama</Link><IconChevron /><span>Yangi banner</span>
      </nav>
      <div className="adm-head"><h1>Yangi banner</h1></div>
      {error && <Notice tone="error">{ERRORS[error] ?? "Xatolik yuz berdi."}</Notice>}
      <AdForm />
    </>
  );
}
