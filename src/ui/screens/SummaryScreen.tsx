import { useEffect, useState } from 'react';
import { useApp } from '../../app/AppContext';
import { persistFinishedMatch, type SaveStatus } from '../../app/matchFinalizer';
import type { MatchExtras } from '../../app/routes';
import type { MatchState, ParticipantRef } from '../../match-engine';
import { buildBackup, type StoredMatch } from '../../services/persistence';
import { ACHIEVEMENTS, type MatchProgressEntry } from '../../services/progression';
import { sound } from '../../services/sound/sound';
import { Avatar, ScreenFrame, TestModeBadge } from '../components/common';
import { downloadJson } from '../components/download';
import { AchievementIcon, CategoryBadge, Confetti } from '../components/graphics';
import { MatchReport } from '../components/MatchReport';

/** Cambio de lado para la revancha: Blanco ↔ Azul. */
const swapSides = (parts: ParticipantRef[]): ParticipantRef[] =>
  parts.map((p) => ({ ...p, team: p.team === 'white' ? 'blue' : 'white' }));

export function SummaryScreen({
  match,
  save,
  live,
  extras,
}: {
  match: StoredMatch;
  save: SaveStatus;
  live: MatchState;
  extras?: MatchExtras;
}) {
  const { navigate, repos, refresh, matches, progression, players, prefs } = useApp();
  const [status, setStatus] = useState<SaveStatus>(save);
  const [showCelebration, setShowCelebration] = useState(true);

  const retry = async () => {
    const s = await persistFinishedMatch(live, repos, extras);
    setStatus(s);
    if (s.kind === 'saved') await refresh();
  };

  const exportUnsaved = async () => {
    const backup = await buildBackup(repos);
    downloadJson(`marcador-partido-${match.id}.json`, { ...backup, matches: [...matches, match] });
  };

  // Subidas de nivel, ascensos de categoría y logros nuevos de este partido.
  const entries = progression?.byMatch.get(match.id);
  const highlights = entries
    ? [...entries.values()].filter(
        (e) => e.levelAfter > e.levelBefore || e.categoryAfter.id !== e.categoryBefore.id || e.unlocked.length > 0 || e.challenges.length > 0,
      )
    : [];

  const statusNode =
    status.kind === 'test' ? (
      <TestModeBadge />
    ) : status.kind === 'saved' ? (
      <span className="badge badge-ok">✓ Guardado</span>
    ) : (
      <span className="badge badge-danger">No guardado</span>
    );

  return (
    <ScreenFrame
      title="Resumen"
      right={statusNode}
      footer={
        <>
          {status.kind === 'error' && (
            <span className="notice error" style={{ marginRight: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
              No guardado.
              <button className="btn btn-sm" onClick={retry}>Reintentar</button>
              <button className="btn btn-sm" onClick={exportUnsaved}>Exportar</button>
            </span>
          )}
          {status.kind === 'test' && (
            <span className="notice" style={{ marginRight: 'auto' }}>
              Modo prueba: no se ha guardado.
            </span>
          )}
          <button className="btn" onClick={() => navigate({ name: 'home' })}>
            Inicio
          </button>
          {extras?.tournament ? (
            <button className="btn btn-primary" onClick={() => navigate({ name: 'tournamentDetail', id: extras.tournament!.id })}>
              Volver al torneo
            </button>
          ) : (
            <>
              <button
                className="btn"
                title="Mismos jugadores cambiando de lado"
                onClick={() => navigate({ name: 'match', config: match.config, participants: swapSides(match.participants) })}
              >
                ⇄ Revancha
              </button>
              <button className="btn btn-primary" onClick={() => navigate({ name: 'setup', mode: match.config.mode })}>
                Nuevo partido
              </button>
            </>
          )}
        </>
      }
    >
      <MatchReport match={match} />
      {showCelebration && highlights.length > 0 && (
        <Celebration
          highlights={highlights}
          names={new Map(match.participants.map((p) => [p.playerId, p.nameSnapshot]))}
          photos={new Map(players.map((p) => [p.id, p.photo]))}
          effects={prefs.effects}
          onClose={() => setShowCelebration(false)}
        />
      )}
    </ScreenFrame>
  );
}

function Celebration({
  highlights,
  names,
  photos,
  effects,
  onClose,
}: {
  highlights: MatchProgressEntry[];
  names: Map<string, string>;
  photos: Map<string, string | undefined>;
  effects: string;
  onClose: () => void;
}) {
  useEffect(() => {
    sound.play('levelUp');
  }, []);
  return (
    <div className="modal-backdrop celebration" onClick={onClose} role="dialog" aria-label="Progresos del partido">
      {effects !== 'off' && <Confetti count={effects === 'full' ? 60 : 20} />}
      <div className="celebration-card">
        <div className="celebration-title">¡PROGRESO!</div>
        <div className="celebration-list scroll">
          {highlights.map((e) => {
            const rankUp = e.categoryAfter.id !== e.categoryBefore.id && (e.eloDelta ?? 0) > 0;
            return (
              <div key={e.playerId} className="celebration-row">
                <Avatar name={names.get(e.playerId) ?? '?'} photo={photos.get(e.playerId)} size={44} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong>{names.get(e.playerId)}</strong>
                  <div className="celebration-items">
                    {e.levelAfter > e.levelBefore && <span className="cel-level">⬆ NIVEL {e.levelAfter}</span>}
                    {rankUp && (
                      <span className="cel-rank">
                        <CategoryBadge category={e.categoryAfter} size={40} /> ¡ASCENSO A {e.categoryAfter.name.toUpperCase()}!
                      </span>
                    )}
                    {e.unlocked.map((id) => {
                      const a = ACHIEVEMENTS.find((x) => x.id === id);
                      return (
                        a && (
                          <span key={id} className="cel-ach">
                            <AchievementIcon id={a.id} glyph={a.icon} rarity={a.rarity} size={24} /> {a.name}
                          </span>
                        )
                      );
                    })}
                    {e.challenges.length > 0 && <span className="cel-level">🎯 {e.challenges.length} reto(s) completado(s)</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="dim" style={{ fontSize: 12, textAlign: 'center' }}>Toca para continuar</div>
      </div>
    </div>
  );
}
