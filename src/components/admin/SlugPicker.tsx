"use client";
import { useId, useState } from "react";

/** Chip input for font slugs, suggesting from the catalogue. */
export default function SlugPicker({ name, initial, options }: { name: string; initial: string[]; options: { slug: string; name: string }[] }) {
  const [list, setList] = useState<string[]>(initial);
  const [q, setQ] = useState("");
  const id = useId();
  const byName = new Map(options.map((o) => [o.slug, o.name]));

  const add = (raw: string) => {
    const v = raw.trim();
    if (!v) return;
    const hit = options.find((o) => o.slug === v || o.name.toLowerCase() === v.toLowerCase());
    const slug = hit ? hit.slug : v.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");
    if (slug && !list.includes(slug)) setList([...list, slug]);
    setQ("");
  };

  return (
    <div className="slug-picker">
      <input type="hidden" name={name} value={list.join(",")} />
      {list.length > 0 && (
        <ul className="adm-tags" style={{ marginBottom: 8 }}>
          {list.map((s) => (
            <li key={s} className="chip">
              {byName.get(s) ?? s}
              <button type="button" onClick={() => setList(list.filter((x) => x !== s))} aria-label={`${byName.get(s) ?? s} ni olib tashlash`}>✕</button>
            </li>
          ))}
        </ul>
      )}
      <input
        type="text"
        list={id}
        value={q}
        onChange={(e) => {
          const v = e.target.value;
          // Picking from the datalist fires a change with the exact option value.
          if (options.some((o) => o.name === v)) add(v); else setQ(v);
        }}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(q); } }}
        placeholder="Shrift nomini yozing…"
        aria-label="Ishlatilgan shrift qoʻshish"
      />
      <datalist id={id}>
        {options.filter((o) => !list.includes(o.slug)).map((o) => <option key={o.slug} value={o.name} />)}
      </datalist>
    </div>
  );
}
