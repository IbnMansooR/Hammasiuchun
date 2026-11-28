"use client";
import { useRouter } from "next/navigation";
import { usePreview } from "../PreviewProvider";
import { IconArrow } from "../Icons";
import { useLhref, useT } from "@/i18n/client";

/** Type once, see it everywhere: the text feeds every specimen on the site. */
export default function HeroTypebar() {
  const { text, setText } = usePreview();
  const router = useRouter();
  const lhref = useLhref();
  const t = useT().typebar;
  return (
    <form className="typebar" onSubmit={(e) => { e.preventDefault(); router.push(lhref("/fonts")); }}>
      <span className="aa" aria-hidden="true">Aa</span>
      <label htmlFor="hero-type" className="sr-only">{t.label}</label>
      <input
        id="hero-type"
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t.placeholder}
        autoComplete="off"
        spellCheck={false}
      />
      <button type="submit" className="btn btn-primary" aria-label={t.go}>
        <span className="t" aria-hidden="true">{t.go}</span> <IconArrow className="ico" />
      </button>
    </form>
  );
}
