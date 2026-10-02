import { useState } from 'react';
import { DownloadButton } from '../DownloadButton';
import { detectPlatform, type Platform } from '../install';
import { APP_URL, href } from '../router';

const STEPS: Record<Platform, { title: string; steps: string[] }> = {
  android: {
    title: 'Android',
    steps: [
      'Pulsa «Descargar la app» y confirma con «Instalar».',
      'Si no sale el aviso: en Chrome, menú ⋮ → «Instalar aplicación» o «Añadir a pantalla de inicio».',
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
      'Pulsa «Descargar la app» en Chrome o Edge y confirma con «Instalar».',
      'Si no sale el aviso: pulsa el icono de instalar de la barra de direcciones.',
      'Se abre en su propia ventana, como un programa, y queda en el menú de inicio.',
    ],
  },
};

export function Usar() {
  const [platform, setPlatform] = useState<Platform>(detectPlatform);
  const showSteps = () => document.getElementById('pasos')?.scrollIntoView({ behavior: 'smooth' });
  return (
    <div className="wrap page">
      <p className="kicker">Gratis · Sin registro · Sin Internet</p>
      <h1>Descarga la app</h1>
      <p className="lead">
        Se instala desde esta web en unos segundos, sin tiendas de aplicaciones. Ocupa muy poco y funciona sin conexión.
      </p>
      <div className="cta-row">
        <DownloadButton onSteps={showSteps} />
        <a className="btn btn-ghost btn-lg" href={APP_URL}>
          Usar en el navegador
        </a>
      </div>

      <h2 id="pasos">Paso a paso</h2>
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
          <h3>Sin Internet</h3>
          <p>Después de abrirla una vez, funciona aunque no tengas conexión: en un bar, en el garaje o en el sótano.</p>
        </div>
        <div className="card">
          <h3>Tus datos son tuyos</h3>
          <p>Jugadores, partidos y torneos se guardan en tu dispositivo. Sin cuentas. Haz copias en Ajustes → Sistema.</p>
        </div>
        <div className="card">
          <h3>En horizontal</h3>
          <p>El marcador está pensado en horizontal: así los dos equipos se ven grandes a cada lado.</p>
        </div>
        <div className="card">
          <h3>Pantalla encendida</h3>
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
