import { useState } from 'react';
import { APP_URL, href } from '../router';

type Platform = 'android' | 'iphone' | 'pc';

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1)) return 'iphone';
  if (/Android/i.test(ua)) return 'android';
  return 'pc';
}

const STEPS: Record<Platform, { title: string; steps: string[] }> = {
  android: {
    title: 'Android',
    steps: [
      'Pulsa «Abrir la app» (mejor en Chrome).',
      'Toca el menú ⋮ de arriba a la derecha.',
      'Elige «Instalar aplicación» o «Añadir a pantalla de inicio».',
      'Ya tienes el icono del marcador junto a tus apps.',
    ],
  },
  iphone: {
    title: 'iPhone y iPad',
    steps: [
      'Pulsa «Abrir la app» en Safari.',
      'Toca el botón Compartir (el cuadrado con la flecha hacia arriba).',
      'Elige «Añadir a pantalla de inicio» y confirma con «Añadir».',
      'Ábrela desde su icono: se ve a pantalla completa.',
    ],
  },
  pc: {
    title: 'Ordenador',
    steps: [
      'Pulsa «Abrir la app» en Chrome o Edge.',
      'En la barra de direcciones aparece el icono de instalar (una pantalla con una flecha).',
      'Pulsa «Instalar»: se abre en su propia ventana, como un programa.',
      'También funciona sin instalar, directamente en el navegador.',
    ],
  },
};

export function Usar() {
  const [platform, setPlatform] = useState<Platform>(detectPlatform);
  return (
    <div className="wrap page">
      <h1>Usar en el móvil</h1>
      <p className="lead">
        No hay que descargar nada de ninguna tienda: la app se abre en el navegador y, si quieres, se instala con su icono
        como cualquier otra.
      </p>
      <a className="btn btn-primary btn-lg" href={APP_URL}>
        Abrir la app
      </a>

      <h2>Instalarla con su icono</h2>
      <div className="seg" role="group" aria-label="Tu dispositivo">
        {(Object.keys(STEPS) as Platform[]).map((p) => (
          <button key={p} aria-pressed={platform === p} onClick={() => setPlatform(p)}>
            {STEPS[p].title}
          </button>
        ))}
      </div>
      <ol className="big-steps">
        {STEPS[platform].steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>

      <h2>Bueno saber</h2>
      <div className="grid2">
        <div className="card">
          <h3>📶 Sin Internet</h3>
          <p>Después de abrirla una vez, funciona aunque no tengas conexión: en un bar, en el garaje o en el sótano.</p>
        </div>
        <div className="card">
          <h3>🔒 Tus datos son tuyos</h3>
          <p>Jugadores, partidos y torneos se guardan en tu dispositivo. Sin cuentas. Haz copias en Ajustes → Sistema.</p>
        </div>
        <div className="card">
          <h3>🔄 Gira el móvil</h3>
          <p>El marcador está pensado en horizontal: así los dos equipos se ven grandes a cada lado.</p>
        </div>
        <div className="card">
          <h3>🔆 Pantalla siempre encendida</h3>
          <p>Durante el partido la pantalla no se apaga (en los navegadores que lo permiten).</p>
        </div>
      </div>

      <div className="card next">
        <div>
          <h3>¿Y si quiero pulsadores o sensores en la mesa?</h3>
          <p className="muted">Con una placa desde unos 5 € los goles se marcan sin tocar el móvil.</p>
        </div>
        <a className="btn" href={href({ page: 'monta' })}>
          Monta tu marcador →
        </a>
      </div>
    </div>
  );
}
