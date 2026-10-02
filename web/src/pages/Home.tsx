import rapido from '../../../src/assets/images/modo-rapido.webp';
import caos from '../../../src/assets/images/modo-caos.webp';
import clasif from '../../../src/assets/images/modo-clasificatorio.webp';
import { DIY_LEVELS } from '../../../src/inputs/hardware/catalog';
import { DownloadButton } from '../DownloadButton';
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
          Descarga el marcador <span className="nowrap-lg">de tu futbolín.</span>
        </h1>
        <p className="lead">Partidos, torneos, ranking y logros en tu móvil, tablet u ordenador. En un toque y sin tiendas.</p>
        <div className="hero-cta">
          <DownloadButton />
          <p className="hero-note">Android · iPhone · Ordenador</p>
          <div className="hero-links">
            <a href={APP_URL}>Usar en el navegador</a>
            <span aria-hidden="true">·</span>
            <a href={href({ page: 'monta' })}>Montar en mi mesa</a>
          </div>
        </div>
        <ScorePreview />
      </section>

      <section className="wrap section" id="como">
        <p className="kicker">Cómo funciona</p>
        <h2>Tres pasos. Cero complicaciones.</h2>
        <ol className="steps">
          <li>
            <h3>Descarga la app</h3>
            <p>Desde esta web, en el móvil, la tablet o el ordenador. Sin tiendas.</p>
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
        <DownloadButton />
      </section>
    </>
  );
}
