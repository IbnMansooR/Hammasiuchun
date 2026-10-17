/** A row of big numbers with labels (home hero, about page). Columns follow the
 * number of facts, so leaving one out never leaves a hole. */
export default function Facts({ items, style }: { items: [string, string][]; style?: React.CSSProperties }) {
  return (
    <dl className="hero-facts" style={{ ...style, "--n": items.length } as React.CSSProperties}>
      {items.map(([value, label]) => (
        <div key={label}>
          <dt className="sr-only">{label}</dt>
          <dd style={{ margin: 0 }}><b>{value}</b><span aria-hidden="true">{label}</span></dd>
        </div>
      ))}
    </dl>
  );
}
