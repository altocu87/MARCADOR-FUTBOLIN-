/** Aviso en móviles en vertical: el marcador está pensado en horizontal. */
import { useState } from 'react';
import { fullscreenAvailable, toggleFullscreen } from '../../services/system/device';

export function PortraitHint({ onRotate }: { onRotate: () => void }) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem('mfv3:portraitOk') === '1';
    } catch {
      return false;
    }
  });
  if (dismissed) return null;
  const keep = () => {
    try {
      sessionStorage.setItem('mfv3:portraitOk', '1');
    } catch {
      // Sin almacenamiento de sesión: solo se oculta ahora.
    }
    setDismissed(true);
  };
  return (
    <div className="portrait-hint" role="dialog" aria-label="Gira el dispositivo">
      <div className="rotate-icon" aria-hidden="true">📱</div>
      <strong>Gira el dispositivo</strong>
      <span>El marcador está diseñado en horizontal para que los números se vean enormes. «Girar el marcador» lo muestra de lado aunque tengas bloqueada la rotación.</span>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        {fullscreenAvailable() && (
          <button className="btn" onClick={() => void toggleFullscreen()}>
            Pantalla completa
          </button>
        )}
        <button className="btn btn-primary" onClick={onRotate}>
          ⟳ Girar el marcador
        </button>
        <button className="btn" onClick={keep}>
          Seguir en vertical
        </button>
      </div>
    </div>
  );
}
