import Link from "next/link";
import { db } from "@/lib/db";
import ChannelAdForm from "@/components/admin/ChannelAdForm";
import Notice from "@/components/admin/Notice";
import { IconChevron } from "@/components/Icons";
import { CHANNEL_AD_ERRORS } from "../errors";

export const metadata = { title: "Admin — Kanal reklama posti" };

export default async function NewChannelAd({ searchParams }: { searchParams: Promise<{ error?: string; request?: string }> }) {
  const { error, request } = await searchParams;
  const req = Number(request) > 0 ? await db.adRequest.findUnique({ where: { id: Number(request) } }) : null;
  return (
    <>
      <nav className="crumbs" aria-label="Yoʻl" style={{ paddingTop: 0, marginBottom: 14 }}>
        <Link href="/admin/ads/channel">Kanal postlari</Link><IconChevron /><span>Yangi post</span>
      </nav>
      <div className="adm-head"><h1>Kanal reklama posti</h1></div>
      {error && <Notice tone="error">{CHANNEL_AD_ERRORS[error] ?? "Xatolik yuz berdi."}</Notice>}
      {req && <Notice tone="warn">{`Ariza #${req.id} (${req.name}) asosida. Matnni reklama beruvchi bilan kelishib, tahrirlang.`}</Notice>}
      <ChannelAdForm preset={req ? { advertiser: req.name, text: req.what, href: req.link && /^https:\/\//.test(req.link) ? req.link : null, requestId: req.id } : undefined} />
    </>
  );
}
