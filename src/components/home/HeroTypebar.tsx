"use client";
import { useRouter } from "next/navigation";
import { usePreview } from "../PreviewProvider";
import { IconArrow } from "../Icons";

/** Type once, see it everywhere: the text feeds every specimen on the site. */
export default function HeroTypebar() {
  const { text, setText } = usePreview();
  const router = useRouter();
  return (
    <form className="typebar" onSubmit={(e) => { e.preventDefault(); router.push("/fonts"); }}>
      <span className="aa" aria-hidden="true">Aa</span>
      <label htmlFor="hero-type" className="sr-only">Namuna matni — barcha shriftlarda koʻrsatiladi</label>
      <input
        id="hero-type"
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Matn yozing — u barcha shriftlarda koʻrinadi"
        autoComplete="off"
        spellCheck={false}
      />
      <button type="submit" className="btn btn-primary" aria-label="Katalogda koʻrish">
        <span className="t" aria-hidden="true">Katalogda koʻrish</span> <IconArrow className="ico" />
      </button>
    </form>
  );
}
