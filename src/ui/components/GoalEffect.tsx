/**
 * Celebración de gol: flash, explosión, ondas, partículas y líneas de velocidad.
 * Solo se dispara tras un gol aceptado; dura ~1 s, no captura toques y no
 * modifica el bloqueo del motor. Nivel «reducido» evita destellos repetidos.
 */
import { useMemo, type CSSProperties } from 'react';
import type { Team } from '../../match-engine';
import type { EffectsLevel } from '../../services/persistence';

export function GoalEffect({ team, level, seed, label }: { team: Team; level: EffectsLevel; seed: string; label?: string | null }) {
  const particles = useMemo(() => {
    let x = 0;
    for (const ch of seed) x = (x * 31 + ch.charCodeAt(0)) % 9973;
    const rnd = () => {
      x = (x * 9301 + 49297) % 233280;
      return x / 233280;
    };
    return Array.from({ length: 22 }, () => ({
      angle: rnd() * 360,
      dist: 90 + rnd() * 140,
      size: 4 + rnd() * 7,
      delay: rnd() * 0.12,
    }));
  }, [seed]);

  if (level === 'off') return null;
  const color = team === 'white' ? '#EEF6FF' : '#62D6FF';
  return (
    <div className={`goal-fx goal-fx-${team} ${level === 'reduced' ? 'reduced' : ''}`} aria-hidden="true">
      {level === 'full' && <div className="fx-flash" />}
      <div className="fx-ring" style={{ borderColor: color }} />
      {level === 'full' && <div className="fx-ring fx-ring-2" style={{ borderColor: color }} />}
      {level === 'full' && (
        <div className="fx-lines">
          {Array.from({ length: 8 }, (_, i) => (
            <span key={i} style={{ top: `${10 + i * 11}%`, animationDelay: `${i * 0.03}s`, background: color }} />
          ))}
        </div>
      )}
      <div className="fx-burst">
        {particles.slice(0, level === 'full' ? 22 : 8).map((p, i) => (
          <span
            key={i}
            style={
              {
                '--a': `${p.angle}deg`,
                '--d': `${p.dist}px`,
                width: p.size,
                height: p.size,
                background: color,
                animationDelay: `${p.delay}s`,
              } as CSSProperties
            }
          />
        ))}
      </div>
      <div className="fx-text" style={{ color: team === 'white' ? '#176DBC' : '#FFFFFF' }}>
        ¡GOL!
      </div>
      {label && <div className="fx-moment">{label}</div>}
    </div>
  );
}
