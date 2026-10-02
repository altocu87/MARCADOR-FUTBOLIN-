/**
 * Evolución del resultado: dos líneas escalonadas (Blanco / Azul) sobre el tiempo
 * de juego acumulado. Leyenda + etiqueta directa al final; la cronología es la vista en tabla.
 */
import { useState } from 'react';
import { validGoalsFromEvents, type MatchEvent } from '../../match-engine';
import { formatDuration } from '../../services/statistics';

const W = 720;
const H = 230;
const PAD = { l: 34, r: 40, t: 14, b: 26 };
const COLORS = { white: '#EEF6FF', blue: '#4FA3F0' };

export function ScoreChart({ events, totalTimeMs }: { events: MatchEvent[]; totalTimeMs: number }) {
  const goals = validGoalsFromEvents(events);
  const [hover, setHover] = useState<number | null>(null);
  const maxT = Math.max(totalTimeMs, ...goals.map((g) => g.totalTimeMs), 1);
  const final = goals.length ? goals[goals.length - 1].scoreAfter : { white: 0, blue: 0 };
  const maxY = Math.max(1, final.white, final.blue);
  const x = (t: number) => PAD.l + (t / maxT) * (W - PAD.l - PAD.r);
  const y = (v: number) => H - PAD.b - (v / maxY) * (H - PAD.t - PAD.b);

  const path = (team: 'white' | 'blue') => {
    let d = `M${x(0)},${y(0)}`;
    let prev = 0;
    for (const g of goals) {
      const v = g.scoreAfter[team];
      d += ` H${x(g.totalTimeMs)}`;
      if (v !== prev) d += ` V${y(v)}`;
      prev = v;
    }
    return d + ` H${x(maxT)}`;
  };

  const yTicks = Array.from({ length: maxY + 1 }, (_, i) => i).filter((v) => maxY <= 8 || v % 2 === 0);
  const hovered = hover !== null ? goals[hover] : null;

  return (
    <div className="chart-wrap">
      <div className="chart-legend">
        <span><i style={{ background: COLORS.white }} /> Blanco</span>
        <span><i style={{ background: COLORS.blue }} /> Azul</span>
        <span className="dim">Tiempo de juego acumulado</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Evolución del resultado">
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke="#22385A" strokeWidth={1} />
            <text x={PAD.l - 8} y={y(v) + 4} textAnchor="end" fontSize={11} fill="#A6B7CF">{v}</text>
          </g>
        ))}
        <text x={PAD.l} y={H - 6} fontSize={11} fill="#A6B7CF">00:00</text>
        <text x={W - PAD.r} y={H - 6} fontSize={11} fill="#A6B7CF" textAnchor="end">{formatDuration(maxT)}</text>
        <path d={path('white')} fill="none" stroke={COLORS.white} strokeWidth={2} />
        <path d={path('blue')} fill="none" stroke={COLORS.blue} strokeWidth={2} />
        <text x={W - PAD.r + 6} y={y(final.white) + 4} fontSize={12} fill="#F3F7FF" fontWeight={700}>{final.white}</text>
        <text x={W - PAD.r + 6} y={y(final.blue) + (final.blue === final.white ? 18 : 4)} fontSize={12} fill="#A6B7CF" fontWeight={700}>{final.blue}</text>
        {goals.map((g, i) => (
          <g key={g.id} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}>
            <circle cx={x(g.totalTimeMs)} cy={y(g.scoreAfter[g.team!])} r={14} fill="transparent" />
            <circle
              cx={x(g.totalTimeMs)}
              cy={y(g.scoreAfter[g.team!])}
              r={hover === i ? 6 : 4.5}
              fill={COLORS[g.team!]}
              stroke="#091324"
              strokeWidth={2}
            />
          </g>
        ))}
      </svg>
      <div className="chart-tip" aria-live="polite">
        {hovered
          ? `Gol ${hovered.team === 'white' ? 'Blanco' : 'Azul'} · ${formatDuration(hovered.totalTimeMs)} · ${hovered.scoreAfter.white}–${hovered.scoreAfter.blue}`
          : goals.length
            ? 'Pasa el dedo o el ratón por un gol para ver el detalle.'
            : 'Sin goles ordinarios.'}
      </div>
    </div>
  );
}
