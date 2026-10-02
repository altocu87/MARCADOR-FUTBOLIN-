import rapido from '../../../src/assets/images/modo-rapido.webp';
import caos from '../../../src/assets/images/modo-caos.webp';
import clasif from '../../../src/assets/images/modo-clasificatorio.webp';
import { DIY_LEVELS } from '../../../src/inputs/hardware/catalog';
import { APP_URL, href } from '../router';

const MODES = [
  { img: rapido, title: 'Rápido', text: 'Por goles, por tiempo o ambos.' },
  { img: caos, title: 'Caos', text: 'Comodines y goles dobles.' },
  { img: clasif, title: 'Clasificatorio', text: 'Ranking ELO y récords.' },
];

const FEATURES = [
  { title: 'Torneos', text: 'Liguilla o eliminatoria.' },
  { title: 'Ranking', text: 'ELO y categorías de Bronce a Élite.' },
  { title: '54 logros', text: 'Remontadas, rachas, goles de oro.' },
  { title: 'Sin Internet', text: 'Sin cuentas. Todo en tu dispositivo.' },
];

/** Vista del marcador (sin imágenes): lo primero que se ve de la app. */
function ScorePreview() {
  return (
    <div className="preview" aria-hidden="true">
      <div className="preview-top">
        <span>1ª PARTE</span>
        <span className="preview-clock">03:42</span>
        <span>5 GOLES</span>
      </div>
      <div className="preview-score">
        <div className="team white">
          <small>BLANCO</small>
          <b>3</b>
        </div>
        <div className="team blue">
          <small>AZUL</small>
          <b>2</b>
        </div>
      </div>
    </div>
  );
}

export function Home() {
  return (
    <>
      <section className="hero wrap">
        <p className="eyebrow">Gratis · Sin registro · Sin Internet</p>
        <h1>
          El marcador
          <br />
          para tu futbolín.
        </h1>
        <p className="lead">Partidos, torneos y ranking. En el móvil al instante, o en tu mesa con pulsadores y pantalla propia.</p>
        <div className="cta-row center">
          <a className="btn btn-primary btn-lg" href={APP_URL}>
            Abrir la app
          </a>
          <a className="btn btn-ghost btn-lg" href={href({ page: 'monta' })}>
            Montar en mi mesa →
          </a>
        </div>
        <ScorePreview />
      </section>

      <section className="wrap section" id="como">
        <p className="kicker">Cómo funciona</p>
        <h2>Tres pasos. Cero complicaciones.</h2>
        <ol className="steps">
          <li>
            <h3>Abre la app</h3>
            <p>En el navegador del móvil, la tablet o el PC. Sin tiendas.</p>
          </li>
          <li>
            <h3>Elige jugadores</h3>
            <p>1 contra 1 o 2 contra 2, con fotos y apodos.</p>
          </li>
          <li>
            <h3>Marca goles</h3>
            <p>Tocando la pantalla, con pulsadores o con sensores.</p>
          </li>
        </ol>
      </section>

      <section className="wrap section">
        <p className="kicker">Modos</p>
        <h2>Juega como quieras.</h2>
        <div className="modes">
          {MODES.map((m) => (
            <figure key={m.title} className="mode">
              <img src={m.img} alt="" loading="lazy" />
              <figcaption>
                <strong>{m.title}</strong>
                <span>{m.text}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="wrap section">
        <div className="features">
          {FEATURES.map((f) => (
            <div key={f.title} className="feature">
              <strong>{f.title}</strong>
              <span>{f.text}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="wrap section">
        <p className="kicker">Hazlo tú mismo</p>
        <h2>Llévalo a tu mesa.</h2>
        <p className="lead">Sin saber programar. Elige hasta dónde quieres llegar.</p>
        <div className="rows">
          {DIY_LEVELS.map((l) => (
            <a key={l.id} className="row" href={l.id === 0 ? href({ page: 'usar' }) : href({ page: 'monta', level: l.id })}>
              <span className="row-n">0{l.id}</span>
              <span className="row-title">{l.title}</span>
              <span className="row-meta">{l.cost}</span>
              <span className="row-arrow">→</span>
            </a>
          ))}
        </div>
      </section>

      <section className="wrap section closing">
        <h2>¿Primer partido?</h2>
        <a className="btn btn-primary btn-lg" href={APP_URL}>
          Abrir la app
        </a>
      </section>
    </>
  );
}
