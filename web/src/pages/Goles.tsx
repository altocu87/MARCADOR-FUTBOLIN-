import { DETECTION } from '../../../src/inputs/hardware/catalog';
import { href } from '../router';

export function Goles() {
  return (
    <div className="wrap page">
      <h1>Cómo detectar los goles</h1>
      <p className="lead">
        Hay dos formas, y se pueden combinar: <strong>pulsadores</strong> (alguien pulsa tras el gol) o <strong>sensores</strong>{' '}
        (detectan la bola solos). Cualquier sensor con salida tipo «contacto» vale: la placa aprende al encender cómo está «sin
        balón» y cuenta gol cuando cambia.
      </p>
      <div className="notice">
        El mejor sitio para un sensor es el <strong>canal interior por el que cae la bola</strong> después del gol: siempre
        pasa por ahí, y más despacio que por la boca de la portería. Y pase lo que pase, el marcador ignora un segundo gol
        durante 3 segundos.
      </div>
      <div className="detect-list">
        {DETECTION.map((d) => (
          <article key={d.id} className={`card detect ${d.supported ? '' : 'off'}`}>
            <header>
              <h2>{d.name}</h2>
              {d.recommended && <span className="tag ok">Recomendado</span>}
              {!d.supported && <span className="tag danger">No recomendado</span>}
              <span className="tag">{d.cost}</span>
              <span className="diff" aria-label={`Dificultad ${d.difficulty} de 3`}>
                {'●'.repeat(d.difficulty)}
                {'○'.repeat(3 - d.difficulty)}
              </span>
            </header>
            <p>{d.how}</p>
            <div className="grid2">
              <div>
                <h3>Dónde</h3>
                <p className="muted">{d.where}</p>
                <h3>Conexión</h3>
                <p className="muted">{d.wiring}</p>
              </div>
              <div>
                <ul className="pros">
                  {d.pros.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
                <ul className="cons">
                  {d.cons.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </div>
            </div>
          </article>
        ))}
      </div>
      <div className="card next">
        <div>
          <h3>¿Ya lo tienes claro?</h3>
          <p className="muted">Elige tu placa y te decimos en qué pin va cada sensor.</p>
        </div>
        <a className="btn btn-primary" href={href({ page: 'monta' })}>
          Monta tu marcador →
        </a>
      </div>
    </div>
  );
}
