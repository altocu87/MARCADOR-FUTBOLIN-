import { useEffect, useState, type ReactNode } from 'react';

export const STAGE_W = 800;
export const STAGE_H = 480;

/**
 * Lienzo lógico 800 × 480: se centra en pantallas grandes y se escala
 * proporcionalmente en pequeñas, sin recortar controles ni generar scroll.
 */
export function Stage({ children }: { children: ReactNode }) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const update = () => {
      const s = Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H);
      setScale(s > 0 ? s : 1);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return (
    <div className="viewport">
      <div className="stage" style={{ transform: `translate(-50%, -50%) scale(${scale})` }}>
        {children}
      </div>
    </div>
  );
}
