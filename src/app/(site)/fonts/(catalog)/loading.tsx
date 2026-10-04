export default function Loading() {
  return (
    <div className="container section" style={{ paddingTop: 30 }}>
      <div style={{ height: 48, width: "100%", maxWidth: 280, background: "var(--soft)", borderRadius: 12, marginBottom: 22 }} />
      <div className="grid" aria-hidden="true">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{ height: 220, background: "var(--soft)", borderRadius: "var(--radius)" }} />
        ))}
      </div>
    </div>
  );
}
