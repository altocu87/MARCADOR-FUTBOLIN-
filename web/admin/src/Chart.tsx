/**
 * Gráficos del panel (SVG propio, sin bibliotecas): una sola serie, así que el título dice qué se ve y no hay leyenda.
 * Barras finas (≤ 24 px) con la punta redondeada, rejilla fina y discreta, valor solo en la última barra,
 * detalle al pasar el ratón (zona sensible = toda la columna) y alternativa en tabla.
 */
import { useState } from 'react';

export interface Point {
  key: string;
  label: string;
  value: number;
}

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

export function ColumnChart({ title, points, format, formatAxis }: { title: string; points: Point[]; format: (v: number) => string; formatAxis: (v: number) => string }) {
  const [hover, setHover] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);
  const W = 640;
  const H = 240;
  const pad = { l: 56, r: 12, t: 26, b: 28 };
  const max = niceMax(Math.max(...points.map((p) => p.value)));
  const band = (W - pad.l - pad.r) / points.length;
  const barW = Math.min(24, band * 0.55);
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / max);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const last = points.length - 1;

  return (
    <div className="a-card a-chart">
      <div className="a-chart-head">
        <h2>{title}</h2>
        <button className="a-btn ghost sm" onClick={() => setAsTable(!asTable)} aria-pressed={asTable}>
          {asTable ? 'Ver gráfico' : 'Ver tabla'}
        </button>
      </div>
      {asTable ? (
        <table className="a-table compact">
          <thead>
            <tr>
              <th>Mes</th>
              <th style={{ textAlign: 'right' }}>Importe</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.key}>
                <td>{p.label}</td>
                <td style={{ textAlign: 'right' }}>{format(p.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="a-chart-box">
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title}: gráfico de columnas por mes`} onMouseLeave={() => setHover(null)}>
            {ticks.map((t) => (
              <g key={t}>
                <line className="c-grid" x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} />
                <text className="c-axis" x={pad.l - 8} y={y(t) + 4} textAnchor="end">
                  {formatAxis(t)}
                </text>
              </g>
            ))}
            {points.map((p, i) => {
              const cx = pad.l + band * i + band / 2;
              const top = y(p.value);
              const h = Math.max(0, H - pad.b - top);
              const r = Math.min(4, h);
              const x0 = cx - barW / 2;
              const x1 = cx + barW / 2;
              const base = H - pad.b;
              // Punta redondeada de 4 px, base recta sobre el eje.
              const d = h > 0 ? `M${x0},${base} V${top + r} Q${x0},${top} ${x0 + r},${top} H${x1 - r} Q${x1},${top} ${x1},${top + r} V${base} Z` : '';
              return (
                <g key={p.key} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={0} aria-label={`${p.label}: ${format(p.value)}`}>
                  <rect x={pad.l + band * i} y={pad.t} width={band} height={H - pad.t - pad.b} fill="transparent" />
                  {d && <path className={`c-bar ${hover === i ? 'on' : ''}`} d={d} />}
                  <text className="c-axis" x={cx} y={H - 8} textAnchor="middle">
                    {p.label}
                  </text>
                  {i === last && hover === null && (
                    <text className="c-value" x={cx} y={top - 8} textAnchor="middle">
                      {format(p.value)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
          {hover !== null && (
            <div className="c-tip" style={{ left: `${((pad.l + band * hover + band / 2) / W) * 100}%`, top: `${(y(points[hover].value) / H) * 100}%` }}>
              <span>{points[hover].label}</span>
              <strong>{format(points[hover].value)}</strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Reparto en barras horizontales (una serie, magnitud): etiqueta a la izquierda, valor al final de la barra. */
export function BarList({ title, rows, format }: { title: string; rows: { label: string; value: number }[]; format: (v: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="a-card">
      <h2>{title}</h2>
      <ul className="a-barlist">
        {rows.map((r) => (
          <li key={r.label} title={`${r.label}: ${format(r.value)}`}>
            <span className="bl-label">{r.label}</span>
            <span className="bl-track">
              <span className="bl-bar" style={{ width: `${(r.value / max) * 100}%` }} />
            </span>
            <span className="bl-value">{format(r.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
