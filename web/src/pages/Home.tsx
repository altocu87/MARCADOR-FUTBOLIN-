import fondo from '../../../src/assets/images/fondo-inicio.webp';
import gold from '../../../src/assets/images/categoria-gold.webp';
import elite from '../../../src/assets/images/categoria-elite.webp';
import trofeo from '../../../src/assets/images/trofeo.webp';
import rapido from '../../../src/assets/images/modo-rapido.webp';
import caos from '../../../src/assets/images/modo-caos.webp';
import clasif from '../../../src/assets/images/modo-clasificatorio.webp';
import l1 from '../../../src/assets/images/logro-golden_goal.webp';
import l2 from '../../../src/assets/images/logro-comeback.webp';
import l3 from '../../../src/assets/images/logro-streak5.webp';
import l4 from '../../../src/assets/images/logro-chaos_win.webp';
import { DIY_LEVELS } from '../../../src/inputs/hardware/catalog';
import { APP_URL, href } from '../router';

const MODES = [
  { img: rapido, title: 'Rápido', text: 'Elige jugadores y a jugar. Por goles, por tiempo o ambas cosas.' },
  { img: caos, title: 'Caos', text: 'Comodines, goles dobles y sorpresas para las partidas con amigos.' },
  { img: clasif, title: 'Clasificatorio', text: 'Partidos que cuentan: ranking ELO, categorías y récords.' },
];

export function Home() {
  return (
    <>
      <section className="hero" style={{ backgroundImage: `linear-gradient(180deg, rgba(7,11,18,.55), var(--bg) 92%), url(${fondo})` }}>
        <div className="wrap hero-inner">
          <p className="eyebrow">Gratis · sin registro · funciona sin Internet</p>
          <h1>
            Tu futbolín, con <span className="glow">marcador de verdad</span>
          </h1>
          <p className="lead">
            Marcador, torneos, ranking y logros para tu mesa. Úsalo en el móvil en un segundo, o móntalo en la mesa con
            pulsadores, sensores de gol o una pantalla propia.
          </p>
          <div className="cta-row">
            <a className="btn btn-primary btn-lg" href={href({ page: 'usar' })}>
              📱 Usar ahora en el móvil
            </a>
            <a className="btn btn-lg" href={href({ page: 'monta' })}>
              🛠️ Montar mi marcador de mesa
            </a>
          </div>
        </div>
      </section>

      <section className="wrap section" id="como">
        <h2>Cómo funciona</h2>
        <div className="steps3">
          <div className="card step">
            <span className="num">1</span>
            <h3>Abre la app</h3>
            <p>En el móvil, la tablet o el PC. Sin tiendas ni descargas: se abre en el navegador y se puede instalar como una app.</p>
          </div>
          <div className="card step">
            <span className="num">2</span>
            <h3>Elige modo y jugadores</h3>
            <p>Partido rápido, modo Caos o clasificatorio. 1 contra 1 o 2 contra 2, con fotos y apodos.</p>
          </div>
          <div className="card step">
            <span className="num">3</span>
            <h3>Marca los goles</h3>
            <p>Tocando la pantalla, con pulsadores arcade o con sensores en la portería. El marcador pone las reglas.</p>
          </div>
        </div>
        <div className="rules">
          <span>⏱️ Por goles o por tiempo</span>
          <span>🔒 Bloqueo de 3 s contra goles dobles</span>
          <span>🥇 Prórroga con gol de oro</span>
          <span>🎯 Penaltis con muerte súbita</span>
          <span>↩️ Deshacer y anular goles</span>
        </div>
      </section>

      <section className="wrap section">
        <h2>Tres formas de jugar</h2>
        <div className="modes">
          {MODES.map((m) => (
            <div key={m.title} className="card mode">
              <img src={m.img} alt="" loading="lazy" />
              <h3>{m.title}</h3>
              <p>{m.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="wrap section">
        <h2>Más que un marcador</h2>
        <div className="features">
          <div className="card feature">
            <img src={trofeo} alt="" loading="lazy" />
            <div>
              <h3>Torneos</h3>
              <p>Liguilla o cuadro eliminatorio, con el campeón en lo más alto.</p>
            </div>
          </div>
          <div className="card feature">
            <div className="imgs">
              <img src={gold} alt="" loading="lazy" />
              <img src={elite} alt="" loading="lazy" />
            </div>
            <div>
              <h3>Ranking y categorías</h3>
              <p>ELO de cada jugador, de Bronce a Élite, rivales favoritos y rachas.</p>
            </div>
          </div>
          <div className="card feature">
            <div className="imgs">
              {[l1, l2, l3, l4].map((l) => (
                <img key={l} src={l} alt="" loading="lazy" />
              ))}
            </div>
            <div>
              <h3>54 logros</h3>
              <p>Remontadas, goles de oro, rachas, modo Caos… y algunos secretos.</p>
            </div>
          </div>
          <div className="card feature">
            <div className="emoji">📶</div>
            <div>
              <h3>Sin Internet y sin cuentas</h3>
              <p>Todo se guarda en tu dispositivo. Puedes hacer copias de seguridad cuando quieras.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="wrap section">
        <h2>¿Te animas a montarlo en la mesa?</h2>
        <p className="muted">Empieza por lo sencillo y sube de nivel cuando quieras. No hace falta saber programar.</p>
        <div className="levels">
          {DIY_LEVELS.map((l) => (
            <a key={l.id} className="card level" href={l.id === 0 ? href({ page: 'usar' }) : href({ page: 'monta', level: l.id })}>
              <span className="num">{l.id}</span>
              <h3>{l.title}</h3>
              <p>{l.summary}</p>
              <span className="tag">{l.cost}</span>
            </a>
          ))}
        </div>
      </section>

      <section className="wrap section final-cta card">
        <h2>¿Listo para el primer partido?</h2>
        <div className="cta-row">
          <a className="btn btn-primary btn-lg" href={APP_URL}>
            Abrir la app
          </a>
          <a className="btn btn-lg" href={href({ page: 'ayuda' })}>
            Preguntas frecuentes
          </a>
        </div>
      </section>
    </>
  );
}
