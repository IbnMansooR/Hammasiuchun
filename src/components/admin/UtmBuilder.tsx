"use client";
import { useState } from "react";
import CopyField from "./CopyField";

const SOURCES = ["instagram", "telegram", "facebook", "tiktok", "youtube", "hamkor"];

/** A link to the site that the statistics page credits to the right source. */
export default function UtmBuilder({ site }: { site: string }) {
  const [source, setSource] = useState("instagram");
  const [page, setPage] = useState("/");
  const [campaign, setCampaign] = useState("");
  const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  const u = new URL(page, site);
  u.searchParams.set("utm_source", clean(source) || "other");
  if (clean(campaign)) u.searchParams.set("utm_campaign", clean(campaign));
  const url = u.toString();
  return (
    <div className="adm-utm">
      <div className="field-row">
        <div className="field">
          <label htmlFor="utm-src">Qayerda joylaysiz?</label>
          <select id="utm-src" className="sel" value={source} onChange={(e) => setSource(e.target.value)}>
            {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="utm-page">Sahifa</label>
          <select id="utm-page" className="sel" value={page} onChange={(e) => setPage(e.target.value)}>
            <option value="/">Bosh sahifa</option>
            <option value="/fonts">Shriftlar</option>
            <option value="/fonts?cyr=1">Kirill shriftlar</option>
            <option value="/dizaynerlar">Dizaynerlar</option>
            <option value="/reklama">Reklama berish</option>
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor="utm-camp">Kampaniya nomi (ixtiyoriy, masalan “bio” yoki “oktabr”)</label>
        <input id="utm-camp" value={campaign} onChange={(e) => setCampaign(e.target.value)} maxLength={40} />
      </div>
      <CopyField value={url} label="Tayyor havola" />
    </div>
  );
}
