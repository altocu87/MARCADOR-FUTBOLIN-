import { useEffect, useState } from 'react';
import { useApp } from '../../app/AppContext';
import { restoreSnapshot } from '../../app/recovery';
import { getScore, type MatchMode } from '../../match-engine';
import type { ActiveMatchSnapshot } from '../../services/persistence';
import { sound } from '../../services/sound/sound';
import { fullscreenAvailable, toggleFullscreen } from '../../services/system/device';
import { useHardware } from '../../inputs/hardware/useHardware';
import { AssetImage } from '../components/assets';
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
  const hub = useHardware();

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
    navigate({ name: 'match', config: state.config, participants: state.participants, resume: state, extras: snapshot.extras });
  };

  const discard = async () => {
    await repos.activeMatch.clear();
    setSnapshot(null);
  };

  return (
    <section className="screen home">
      <div className="home-bg" aria-hidden="true">
        <AssetImage name="fondo-inicio" className="home-bg-img" fallback={<div className="tron-grid" />} />
      </div>
      <header className="home-top">
        <div className="brand">
          <AssetImage name="logo" alt="" className="brand-logo" fallback={<span className="brand-mark" aria-hidden="true" />} />
          <div className="brand-name">MARCADOR FUTBOLÍN</div>
        </div>
        <nav className="home-menu" aria-label="Menú principal">
          <button className="menu-btn" onClick={() => navigate({ name: 'tournament' })}>
            <span aria-hidden="true">🏆</span> TORNEO
          </button>
          <button className="menu-btn" onClick={() => navigate({ name: 'ranking' })}>
            <span aria-hidden="true">📊</span> RANKING
          </button>
          <button className="menu-btn" onClick={() => navigate({ name: 'challenges' })}>
            <span aria-hidden="true">🎯</span> RETOS
          </button>
        </nav>
        <div className="home-status">
          {hub.connectedCount > 0 && (
            <button className="status-pill" style={{ color: 'var(--ok)', cursor: 'pointer', background: 'none' }} onClick={() => navigate({ name: 'settings', tab: 'connections' })}>
              🔌 {hub.connectedCount === 1 ? 'PLACA CONECTADA' : `${hub.connectedCount} PLACAS`}
            </button>
          )}
          <span className="status-pill" title="Sin backend: todos los datos se guardan en este dispositivo">
            <span className="dot" style={{ color: persistent ? 'var(--accent)' : 'var(--ranked)' }} />
            {persistent ? 'SISTEMA LOCAL' : 'SIN ALMACENAMIENTO'}
          </span>
          <button className="home-icon-btn" onClick={() => navigate({ name: 'settings' })} aria-label="Ajustes" title="Ajustes">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="3.2" />
              <path d="M12 2.5v2.6M12 18.9v2.6M4.6 4.6l1.9 1.9M17.5 17.5l1.9 1.9M2.5 12h2.6M18.9 12h2.6M4.6 19.4l1.9-1.9M17.5 6.5l1.9-1.9" />
              <circle cx="12" cy="12" r="6.6" />
            </svg>
          </button>
          {fullscreenAvailable() && (
            <button className="home-icon-btn" onClick={() => void toggleFullscreen()} aria-label="Pantalla completa" title="Pantalla completa">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3.5 8.5v-5h5M15.5 3.5h5v5M20.5 15.5v5h-5M8.5 20.5h-5v-5" />
              </svg>
            </button>
          )}
          <span className="home-clock">
            <span className="clock-h">{String(clock.getHours()).padStart(2, '0')}</span>
            <span className="clock-sep">:</span>
            <span className="clock-m">{String(clock.getMinutes()).padStart(2, '0')}</span>
          </span>
        </div>
      </header>

      <div className="home-label label">Nuevo partido</div>
      <div className="mode-cards">
        {MODES.map((m) => (
          <button key={m.mode} className={`mode-card mode-${m.mode}`} onClick={() => start(m.mode)}>
            <AssetImage
              name={`modo-${m.mode === 'quick' ? 'rapido' : m.mode === 'chaos' ? 'caos' : 'clasificatorio'}`}
              className="mode-art"
              fallback={
                <span className="mode-icon" aria-hidden="true">
                  {m.mode === 'quick' ? '⚡' : m.mode === 'chaos' ? '✦' : '♛'}
                </span>
              }
            />
            <span className="mode-title">{m.title}</span>
            <span className="mode-text">{m.text}</span>
            <span className="mode-tag">{m.tag}</span>
          </button>
        ))}
      </div>

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
