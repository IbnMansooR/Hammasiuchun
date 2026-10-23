"use client";
import { useStore } from "./StoreProvider";
import { IconHeart } from "./Icons";
import { useT } from "@/i18n/client";

export default function WishButton({ slug, name, className = "wish" }: { slug: string; name: string; className?: string }) {
  const { toggleWish, inWish, ready } = useStore();
  const on = ready && inWish(slug);
  const t = useT().wishlist;
  return (
    <button
      type="button"
      className={className}
      aria-pressed={on}
      aria-label={on ? t.remove(name) : t.add(name)}
      title={on ? t.inWish : t.addShort}
      onClick={() => toggleWish({ slug, name })}
    >
      <IconHeart />
    </button>
  );
}
