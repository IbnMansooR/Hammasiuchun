import type { Point } from "@/lib/statsQueries";
import { formatNumber } from "@/lib/format";

/** Visitors (accent, front) over views (neutral, behind), one column per day or hour.
 * Pure CSS/HTML: no client JS. A table view carries the same numbers for screen readers. */
export default function BarChart({ points, unit }: { points: Point[]; unit: "kun" | "soat" }) {
  const max = Math.max(1, ...points.map((p) => p.views));
  const h = (v: number) => (v > 0 ? `${Math.max(1.5, (v / max) * 100)}%` : "0");
  const mid = points[Math.floor(points.length / 2)];
  return (
    <figure className="chart">
      <div className="chart-legend">
        <span><i className="sw sw-a" aria-hidden="true" />Mehmonlar</span>
        <span><i className="sw sw-b" aria-hidden="true" />Koʻrishlar</span>
        <span className="chart-max">eng baland: {formatNumber(max)}</span>
      </div>
      <div className="chart-plot" role="img" aria-label={`${unit === "kun" ? "Kunlik" : "Soatlik"} mehmonlar va koʻrishlar grafigi. Raqamlar pastdagi jadvalda.`}>
        {points.map((p) => (
          <div className="chart-col" key={p.title} title={`${p.title}: ${formatNumber(p.visitors)} mehmon, ${formatNumber(p.views)} koʻrish`}>
            <span className="bar-b" style={{ height: h(p.views) }} />
            <span className="bar-a" style={{ height: h(p.visitors) }} />
          </div>
        ))}
      </div>
      <div className="chart-axis" aria-hidden="true">
        <span>{points[0]?.label}</span><span>{mid?.label}</span><span>{points[points.length - 1]?.label}</span>
      </div>
      <details className="chart-table">
        <summary>Jadval koʻrinishi</summary>
        <table className="adm-table">
          <thead><tr><th>{unit === "kun" ? "Sana" : "Soat"}</th><th>Mehmonlar</th><th>Koʻrishlar</th></tr></thead>
          <tbody>
            {points.map((p) => <tr key={p.title}><td>{p.title}</td><td>{formatNumber(p.visitors)}</td><td>{formatNumber(p.views)}</td></tr>)}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
