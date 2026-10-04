export default function Notice({ tone = "ok", children }: { tone?: "ok" | "error" | "warn"; children: React.ReactNode }) {
  return (
    <div className={`adm-notice adm-notice-${tone}`} role={tone === "error" ? "alert" : "status"}>
      {children}
    </div>
  );
}
