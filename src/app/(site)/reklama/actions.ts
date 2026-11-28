"use server";
import { redirect } from "next/navigation";
import { AD_PLACES, createAdRequest, firstLink, type AdPlace } from "@/lib/adSales";
import { clientIp, hit, isLocked } from "@/lib/rateLimit";
import { lhref } from "@/i18n/server";

const str = (fd: FormData, k: string, max: number) => String(fd.get(k) ?? "").replace(/\s+/g, " ").trim().slice(0, max);

/** The /reklama form: saved and sent to the admins' Telegram (lib/adSales). 3 a day per address. */
export async function sendAdRequestAction(fd: FormData) {
  const back = async (q: string) => redirect(`${await lhref("/reklama")}?${q}#ariza`);
  // A field people never see: filled in only by bots.
  if (str(fd, "website", 200)) return back("sent=0");
  const name = str(fd, "name", 80);
  const contact = str(fd, "contact", 120);
  const what = str(fd, "what", 1000);
  const place = str(fd, "place", 10);
  if (!name) return back("error=name");
  if (contact.replace(/[^\dA-Za-z@]/g, "").length < 5) return back("error=contact");
  if (what.length < 3) return back("error=what");
  const key = `adreq:${await clientIp()}`;
  if (await isLocked(key)) return back("error=limit");
  await hit(key, 3, 24 * 60 * 60 * 1000);
  const id = await createAdRequest({
    source: "site", name, contact, what,
    placements: (AD_PLACES as readonly string[]).includes(place) ? (place as AdPlace) : "unsure",
    timing: str(fd, "timing", 300) || null,
    link: str(fd, "link", 300) || firstLink(what),
  });
  return back(`sent=${id}`);
}
