import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import ChannelAdForm from "@/components/admin/ChannelAdForm";
import Notice from "@/components/admin/Notice";
import { IconChevron } from "@/components/Icons";
import { CHANNEL_AD_ERRORS } from "../errors";

export const metadata = { title: "Admin — Kanal reklama posti" };

export default async function EditChannelAd({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const ad = await db.channelAd.findUnique({ where: { id: Number(id) || 0 } });
  if (!ad) notFound();
  return (
    <>
      <nav className="crumbs" aria-label="Yoʻl" style={{ paddingTop: 0, marginBottom: 14 }}>
        <Link href="/admin/ads/channel">Kanal postlari</Link><IconChevron /><span>#{ad.id}</span>
      </nav>
      <div className="adm-head"><h1>Kanal reklama posti #{ad.id}</h1></div>
      {error && <Notice tone="error">{CHANNEL_AD_ERRORS[error] ?? "Xatolik yuz berdi."}</Notice>}
      {ad.status === "posted" || ad.status === "deleted" ? (
        <Notice tone="warn">Bu post kanalga chiqib boʻlgan, uni oʻzgartirib boʻlmaydi.</Notice>
      ) : (
        <ChannelAdForm ad={ad} />
      )}
    </>
  );
}
