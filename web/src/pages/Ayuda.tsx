import { SAFETY } from '../../../src/inputs/hardware/catalog';
import { APP_URL, href } from '../router';

const FAQ: { q: string; a: string }[] = [
  { q: '¿Es gratis?', a: 'Sí. Sin registro, sin cuentas y sin publicidad.' },
  { q: '¿Necesito Internet?', a: 'Solo la primera vez que abres la app. Después funciona sin conexión, también instalada en el móvil.' },
  {
    q: '¿Dónde se guardan mis partidos?',
    a: 'En tu propio dispositivo (el navegador). Si borras los datos del navegador se pierden, así que haz copias de seguridad en Ajustes → Sistema.',
  },
  { q: '¿Funciona en iPhone?', a: 'Sí, en Safari, y se puede añadir a la pantalla de inicio. Lo único que el iPhone no permite es conectar placas por USB o Bluetooth: para eso, usa una placa ESP32 por Wi-Fi.' },
  { q: '¿Qué placa compro?', a: 'Para pulsadores por cable, un Arduino Uno. Sin cables, un ESP32-C3 Super Mini. Para un marcador de mesa sin móvil, la pantalla Waveshare ESP32-S3-Touch-LCD-7C con un mando ESP32-C3.' },
  { q: 'Se ha marcado un gol de más, ¿cómo lo quito?', a: 'En la app, con −1 o DESHACER. Con los pulsadores, manteniendo pulsado el del equipo 0,8 segundos.' },
  { q: '¿Necesito saber programar?', a: 'No. Las placas ESP32 se instalan desde esta web con un botón. Los Arduino clásicos se instalan con el IDE de Arduino siguiendo 5 pasos.' },
  { q: 'Tengo dos mesas cerca, ¿se mezclan los mandos?', a: 'Cambia el número GRUPO_MESA en el programa del mando y de la pantalla de una de las mesas (el mismo número en los dos).' },
  { q: '¿Puedo usar mi propia placa o mis propios sensores?', a: 'Sí. Cualquier placa que envíe una orden por línea (GB, GA, AB, AA, PAUSA) por USB, Wi-Fi o Bluetooth funciona con la app. Los detalles están en el manual del proyecto.' },
];

const PROBLEMS: [string, string][] = [
  ['La app no encuentra la placa por USB', 'Usa Chrome o Edge (no Safari ni Firefox), un cable de datos y cierra el monitor serie del IDE de Arduino.'],
  ['Un gol cuenta solo al encender', 'Había algo delante del sensor al arrancar: apágala y enciéndela sin bola delante.'],
  ['El sensor no detecta la bola', 'Revisa la alineación (barrera o láser) o la distancia con el tornillo del módulo (reflexión).'],
  ['Al anular se marca un gol', 'Mantén el pulsador hasta notar el aviso (0,8 s).'],
  ['La pantalla de 7" se queda negra o con colores raros', 'Comprueba que has instalado el programa de tu modelo exacto de pantalla.'],
  ['El mando no conecta', 'En la pantalla debe poner «MANDO CONECTADO» (tarda hasta 20 s). Comprueba que el mando tiene alimentación y que el número de grupo es el mismo.'],
];

export function Ayuda() {
  return (
    <div className="wrap page">
      <h1>Ayuda</h1>
      <h2>Preguntas frecuentes</h2>
      <div className="faq">
        {FAQ.map((f) => (
          <details key={f.q} className="card">
            <summary>{f.q}</summary>
            <p>{f.a}</p>
          </details>
        ))}
      </div>
      <h2>Problemas frecuentes</h2>
      <div className="table-scroll">
        <table className="pins">
          <thead>
            <tr>
              <th>Problema</th>
              <th>Solución</th>
            </tr>
          </thead>
          <tbody>
            {PROBLEMS.map(([p, s]) => (
              <tr key={p}>
                <td>
                  <strong>{p}</strong>
                </td>
                <td className="muted">{s}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2>Seguridad al montar</h2>
      <ul className="safety">
        {SAFETY.map((s) => (
          <li key={s}>⚠️ {s}</li>
        ))}
      </ul>
      <div className="card next">
        <div>
          <h3>¿Todo listo?</h3>
          <p className="muted">Abre la app o vuelve al asistente de montaje.</p>
        </div>
        <div className="cta-row">
          <a className="btn" href={href({ page: 'monta' })}>
            Monta tu marcador
          </a>
          <a className="btn btn-primary" href={APP_URL}>
            Abrir la app
          </a>
        </div>
      </div>
    </div>
  );
}
