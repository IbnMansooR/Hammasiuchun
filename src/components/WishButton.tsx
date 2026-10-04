"use client";
import { useStore } from "./StoreProvider";
import { IconHeart } from "./Icons";

export default function WishButton({ slug, name, className = "wish" }: { slug: string; name: string; className?: string }) {
  const { toggleWish, inWish, ready } = useStore();
  const on = ready && inWish(slug);
  return (
    <button
      type="button"
      className={className}
      aria-pressed={on}
      aria-label={on ? `${name} — sevimlilardan olib tashlash` : `${name} — sevimlilarga qoʻshish`}
      title={on ? "Sevimlilarda" : "Sevimlilarga qoʻshish"}
      onClick={() => toggleWish({ slug, name })}
    >
      <IconHeart />
    </button>
  );
}
