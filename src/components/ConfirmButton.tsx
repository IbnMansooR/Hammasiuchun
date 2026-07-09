"use client";

// A submit button that asks for confirmation before letting the form submit.
// Use inside a <form> for destructive (delete) actions.
export default function ConfirmButton({
  children,
  message,
  className = "chip",
  style,
  ariaLabel,
}: {
  children: React.ReactNode;
  message: string;
  className?: string;
  style?: React.CSSProperties;
  ariaLabel?: string;
}) {
  return (
    <button
      type="submit"
      className={className}
      style={style}
      aria-label={ariaLabel}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
