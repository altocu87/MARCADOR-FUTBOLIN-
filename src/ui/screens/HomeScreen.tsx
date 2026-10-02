import { useEffect, useState } from 'react';
import { useApp } from '../../app/AppContext';
import { restoreSnapshot } from '../../app/recovery';
import { getScore, type MatchMode } from '../../match-engine';
import type { ActiveMatchSnapshot } from '../../services/persistence';
import { sound } from '../../services/sound/sound';
import { MODE_LABEL, Modal, formatDate } from '../components/common';

const MODES: { mode: MatchMode; title: string; text: string; tag: string }[] = [
  { mode: 'quick', title: 'RÁPIDO', text: 'Partida directa con la configuración elegida.', tag: 'XP' },
  { mode: 'chaos', title: 'CAOS', text: 'Motor normal · reglas especiales pendientes.', tag: 'XP' },
  { mode: 'ranked', title: 'CLASIFICATORIO', text: 'Competición con previsión, ELO y XP.', tag: 'ELO + XP' },
];

export function HomeScreen() {
  const { navigate, repos, persistent, players } = useApp();
  const [snapshot, setSnapshot] = useState<ActiveMatchSnapshot | null>(null);
  const [clock, setClock] = useState(() => new Date());

  useEffect(() => {
    void repos.activeMatch.load().then(setSnapshot);
  }, [repos]);

  useEffect(() => {
    const id = window.setInterval(() => setClock(new Date()), 10_000);
    return () => window.clearInterval(id);
  }, []);

  const start = (mode: MatchMode) => {
    sound.unlock();
    sound.play('ui');
    navigate({ name: 'setup', mode });
  };

  const resume = () => {
    if (!snapshot) return;
    const state = restoreSnapshot(snapshot, Date.now());
    navigate({ name: 'match', config: state.config, participants: state.participants, resume: state });
  };

  const discard = async () => {
    await repos.activeMatch.clear();
    setSnapshot(null);
  };

  return (
    <section className="screen home">
      <header className="home-top">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <div>
            <div className="brand-name">MARCADOR FUTBOLÍN <span>V3</span></div>
            <div className="brand-sub">Marcador inteligente de mesa</div>
          </div>
        </div>
        <div className="home-status">
          <span className="status-pill" title="Sin backend: todos los datos se guardan en este dispositivo">
            <span className="dot" style={{ color: persistent ? 'var(--accent)' : 'var(--ranked)' }} />
            {persistent ? 'SISTEMA LOCAL' : 'SIN ALMACENAMIENTO'}
          </span>
          <span className="home-clock">
            {clock.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </header>

      <div className="home-label label">Nuevo partido</div>
      <div className="mode-cards">
        {MODES.map((m) => (
          <button key={m.mode} className={`mode-card mode-${m.mode}`} onClick={() => start(m.mode)}>
            <span className="mode-icon" aria-hidden="true">
              {m.mode === 'quick' ? '⚡' : m.mode === 'chaos' ? '✦' : '♛'}
            </span>
            <span className="mode-title">{m.title}</span>
            <span className="mode-text">{m.text}</span>
            <span className="mode-tag">{m.tag}</span>
          </button>
        ))}
      </div>

      <nav className="home-menu" aria-label="Menú principal">
        <button className="menu-btn" onClick={() => navigate({ name: 'tournament' })}>
          <span aria-hidden="true">🏆</span> TORNEO
        </button>
        <button className="menu-btn" onClick={() => navigate({ name: 'ranking' })}>
          <span aria-hidden="true">📊</span> RANKING
        </button>
        <button className="menu-btn" onClick={() => navigate({ name: 'settings' })}>
          <span aria-hidden="true">⚙</span> AJUSTES
        </button>
      </nav>

      {players.length === 0 && (
        <div className="home-hint">Primero crea jugadores en AJUSTES → JUGADORES o desde la selección de jugadores.</div>
      )}

      {snapshot && (
        <Modal
          title="Partida sin terminar"
          actions={
            <>
              <button className="btn btn-danger" onClick={discard}>
                Descartar
              </button>
              <button className="btn btn-primary" onClick={resume}>
                Reanudar en pausa
              </button>
            </>
          }
        >
          <p className="muted" style={{ margin: 0 }}>
            {MODE_LABEL[snapshot.state.config.mode]} guardado el {formatDate(snapshot.savedAt)}.
          </p>
          <p style={{ fontSize: 22, fontWeight: 800, margin: '10px 0' }}>
            {snapshot.state.participants.filter((p) => p.team === 'white').map((p) => p.nameSnapshot).join(' + ')}{' '}
            {getScore(snapshot.state).white} – {getScore(snapshot.state).blue}{' '}
            {snapshot.state.participants.filter((p) => p.team === 'blue').map((p) => p.nameSnapshot).join(' + ')}
          </p>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            Se reanuda en pausa con el tiempo que tenía al guardarse. El tiempo con la aplicación cerrada no cuenta.
          </p>
        </Modal>
      )}
    </section>
  );
}
