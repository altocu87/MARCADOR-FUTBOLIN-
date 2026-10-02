import { BOARDS, DIY_LEVELS, LINK_LABEL, ROLE_LABEL, webInstallable, type BoardInfo } from '../../../src/inputs/hardware/catalog';
import { APP_URL, href } from '../router';

/** Placa que recomendamos a quien todavía no tiene ninguna. */
export const RECOMMENDED: Record<number, string> = { 1: 'arduino-uno', 2: 'esp32c3', 3: 'waveshare-7c' };

function boardsForLevel(level: number): BoardInfo[] {
  return BOARDS.filter((b) => b.level === level || (level === 3 && b.role === 'mando'));
}

export function BoardCard({ b, recommended }: { b: BoardInfo; recommended?: boolean }) {
  return (
    <a className={`card board ${recommended ? 'recommended' : ''}`} href={href({ page: 'placa', id: b.id })}>
      {recommended && <span className="ribbon">Recomendada</span>}
      <h3>{b.name}</h3>
      <p className="muted small">{b.aka}</p>
      <div className="tags">
        <span className="tag accent">{ROLE_LABEL[b.role]}</span>
        {b.links.map((l) => (
          <span key={l} className="tag">{LINK_LABEL[l]}</span>
        ))}
        <span className="tag">{b.price}</span>
      </div>
      <p className="small">{webInstallable(b) ? 'Se instala desde el navegador' : 'Se instala con el IDE de Arduino'}</p>
    </a>
  );
}

export function Monta({ level }: { level?: number }) {
  const current = DIY_LEVELS.find((l) => l.id === level && l.id > 0);
  return (
    <div className="wrap page">
      <nav className="crumbs" aria-label="Pasos">
        <a href={href({ page: 'monta' })} aria-current={!current ? 'step' : undefined}>
          1 · Qué quieres montar
        </a>
        <span aria-current={current ? 'step' : undefined}>2 · Elige tu placa</span>
        <span>3 · Conecta e instala</span>
      </nav>

      {!current ? (
        <>
          <h1>Monta tu marcador</h1>
          <p className="lead">
            Elige hasta dónde quieres llegar. Puedes empezar por lo sencillo y ampliar después: todo funciona con la misma app.
          </p>
          <div className="levels big">
            {DIY_LEVELS.filter((l) => l.id > 0).map((l) => (
              <a key={l.id} className="card level" href={href({ page: 'monta', level: l.id })}>
                <span className="num">{l.id}</span>
                <h3>{l.title}</h3>
                <p>{l.summary}</p>
                <ul className="small">
                  {l.needs.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
                <div className="level-foot">
                  <span className="tag">{l.cost}</span>
                  <span className="diff" aria-label={`Dificultad ${l.difficulty} de 3`}>
                    {'●'.repeat(l.difficulty)}
                    {'○'.repeat(3 - l.difficulty)}
                  </span>
                </div>
              </a>
            ))}
          </div>
          <div className="card next">
            <div>
              <h3>¿Solo quieres jugar?</h3>
              <p className="muted">No necesitas montar nada: abre la app y marca tocando la pantalla.</p>
            </div>
            <a className="btn btn-primary" href={APP_URL}>
              Abrir la app
            </a>
          </div>
        </>
      ) : (
        <>
          <h1>
            Nivel {current.id} · {current.title}
          </h1>
          <p className="lead">{current.summary}</p>
          <h2>¿No tienes placa todavía?</h2>
          <p className="muted">Te recomendamos esta: es la más sencilla para este nivel.</p>
          <div className="boards">
            {BOARDS.filter((b) => b.id === RECOMMENDED[current.id]).map((b) => (
              <BoardCard key={b.id} b={b} recommended />
            ))}
            {current.id === 3 && BOARDS.filter((b) => b.id === 'mando-c3').map((b) => <BoardCard key={b.id} b={b} recommended />)}
          </div>
          <h2>¿Ya tienes una? Elígela</h2>
          <div className="boards">
            {boardsForLevel(current.id)
              .filter((b) => b.id !== RECOMMENDED[current.id] && !(current.id === 3 && b.id === 'mando-c3'))
              .map((b) => (
                <BoardCard key={b.id} b={b} />
              ))}
          </div>
          {current.id < 3 && (
            <p className="muted small">
              Las placas de los otros niveles también valen: {current.id === 1 ? 'un ESP32 también funciona por cable USB.' : 'un Arduino funciona por cable USB.'}{' '}
              <a href={href({ page: 'monta', level: current.id === 1 ? 2 : 1 })}>Ver nivel {current.id === 1 ? 2 : 1}</a>
            </p>
          )}
          <div className="card next">
            <div>
              <h3>¿Cómo vas a detectar los goles?</h3>
              <p className="muted">Pulsadores, barrera de infrarrojos, láser, microinterruptor… compara las opciones.</p>
            </div>
            <a className="btn" href={href({ page: 'goles' })}>
              Detectar goles →
            </a>
          </div>
        </>
      )}
    </div>
  );
}
