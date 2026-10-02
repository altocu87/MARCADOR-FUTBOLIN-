/**
 * Reposo: tras inactividad fuera de una partida activa muestra fondo casi negro,
 * reloj y fecha. El toque que despierta se consume y no activa lo que hay debajo.
 */
import { useEffect, useRef, useState } from 'react';
import { SevenSegment } from './SevenSegment';

export function SleepOverlay({ minutes, enabled }: { minutes: number; enabled: boolean }) {
  const [asleep, setAsleep] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const lastActivity = useRef(Date.now());

  useEffect(() => {
    const mark = () => {
      lastActivity.current = Date.now();
    };
    window.addEventListener('pointerdown', mark, true);
    window.addEventListener('keydown', mark, true);
    return () => {
      window.removeEventListener('pointerdown', mark, true);
      window.removeEventListener('keydown', mark, true);
    };
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(new Date());
      if (!enabled || minutes <= 0) {
        lastActivity.current = Date.now();
        return;
      }
      if (Date.now() - lastActivity.current >= minutes * 60_000) setAsleep(true);
    }, 1000);
    return () => window.clearInterval(id);
  }, [enabled, minutes]);

  useEffect(() => {
    if (!asleep) return;
    const wake = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      lastActivity.current = Date.now();
      setAsleep(false);
    };
    window.addEventListener('keydown', wake, true);
    return () => window.removeEventListener('keydown', wake, true);
  }, [asleep]);

  if (!asleep) return null;
  const wakeUp = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    lastActivity.current = Date.now();
    setAsleep(false);
  };
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return (
    <div
      className="sleep"
      role="button"
      aria-label="Reposo. Toca para despertar"
      tabIndex={0}
      onPointerDown={wakeUp}
      onClick={wakeUp}
    >
      <SevenSegment text={`${hh}:${mm}`} height={130} color="#3A6E8C" />
      <div className="sleep-date">
        {now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
      </div>
      <div className="sleep-hint">Toca para despertar</div>
    </div>
  );
}
