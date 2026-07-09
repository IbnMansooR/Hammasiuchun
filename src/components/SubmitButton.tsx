"use client";
import { useFormStatus } from "react-dom";

export default function SubmitButton({
  children,
  pendingLabel = "Saqlanmoqda…",
  className = "btn btn-accent",
  style,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { pending } = useFormStatus();
  return (
    <button className={className} style={style} disabled={pending} aria-busy={pending}>
      {pending ? pendingLabel : children}
    </button>
  );
}
