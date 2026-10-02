import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../app/AppContext';
import { persistFinishedMatch, toStoredMatch } from '../../app/matchFinalizer';
import {
  countdownRemaining,
  getClock,
  getPenaltyScore,
  getPeriodScore,
  getScore,
  goalLockRemaining,
  isSuddenDeath,
  nextPenaltyTeam,
  GOAL_LOCK_MS,
  type MatchConfig,
  type MatchState,
  type ParticipantRef,
  type Period,
  type Team,
} from '../../match-engine';
import { sound } from '../../services/sound/sound';
import { formatDuration } from '../../services/statistics';
import { Avatar, MODE_LABEL, Modal, TestModeBadge } from '../components/common';
import { GoalEffect } from '../components/GoalEffect';
import { SevenSegment } from '../components/SevenSegment';
import { useMatchController, type MatchController } from './useMatchController';

export const PERIOD_LABEL: Record<Period, string> = {
  first: '1ª PARTE',
  second: '2ª PARTE',
  overtime: 'PRÓRROGA',
  shootout: 'PENALTIS',
};

const TEAM_LABEL: Record<Team, string> = { white: 'BLANCO', blue: 'AZUL' };

function conditionText(config: MatchConfig): string {
  if (config.endCondition === 'goals') return `${config.goalsPerPeriod} goles por parte`;
  if (config.endCondition === 'time') return `${config.minutesPerPeriod} min por parte`;
  return `${config.goalsPerPeriod} goles o ${config.minutesPerPeriod} min`;
}

export function MatchScreen({
  config,
  participants,
  resume,
}: {
  config: MatchConfig;
  participants: ParticipantRef[];
  resume?: MatchState;
}) {
  const ctl = useMatchController(config, participants, resume);
  const { state } = ctl;
  const { repos, navigate, refresh, prefs, players } = useApp();
  const [confirmExit, setConfirmExit] = useState(false);
  const finishing = useRef(false);

  // Final: aplicación → resultado completo → repositorio local → resumen.
  useEffect(() => {
    if (state.phase !== 'finished' || finishing.current) return;
    finishing.current = true;
    void (async () => {
      const save = await persistFinishedMatch(state, repos);
      if (save.kind === 'saved') await refresh();
      window.setTimeout(() => navigate({ name: 'summary', match: toStoredMatch(state), save, live: state }), 1400);
    })();
  }, [state, repos, refresh, navigate]);

  const abandon = async () => {
    await repos.activeMatch.clear();
    navigate({ name: 'home' });
  };

  const photos = new Map(players.map((p) => [p.id, p.photo]));

  return (
    <section className={`screen match mode-${state.config.mode}`} onPointerDown={() => sound.unlock()}>
      {state.phase === 'penalties' || (state.phase === 'finished' && state.period === 'shootout') ? (
        <PenaltiesView ctl={ctl} />
      ) : (
        <ScoreboardView ctl={ctl} photos={photos} />
      )}

      {ctl.lastGoal && state.phase !== 'penalties' && (
        <GoalEffect key={ctl.lastGoal.id} team={ctl.lastGoal.team!} level={prefs.effects} seed={ctl.lastGoal.id} />
      )}

      {state.phase === 'countdown' && <CountdownOverlay ctl={ctl} />}
      {state.phase === 'paused' && (
        <div className="overlay overlay-pause">
          <div className="overlay-title">PAUSA</div>
          <div className="muted">El reloj está detenido · no se admiten goles</div>
          <button className="btn btn-primary btn-lg overlay-cta" onClick={() => ctl.send({ type: 'RESUME' })} autoFocus>
            ▶ CONTINUAR
          </button>
          <button className="btn btn-danger btn-sm" onClick={() => setConfirmExit(true)}>
            Abandonar partido
          </button>
        </div>
      )}
      {state.phase === 'periodEnd' && <PeriodEndOverlay ctl={ctl} />}
      {state.phase === 'finished' && (
        <div className="overlay overlay-final" aria-live="assertive">
          <div className="overlay-title">FINAL</div>
          <div className={`final-winner team-${state.result!.winner}`}>GANA {TEAM_LABEL[state.result!.winner]}</div>
        </div>
      )}

      {confirmExit && (
        <Modal
          title="¿Abandonar el partido?"
          onClose={() => setConfirmExit(false)}
          actions={
            <>
              <button className="btn btn-ghost" onClick={() => setConfirmExit(false)}>
                Seguir jugando
              </button>
              <button className="btn btn-danger" onClick={abandon}>
                Abandonar
              </button>
            </>
          }
        >
          <p className="muted" style={{ margin: 0 }}>
            El partido se descarta: no se guarda en el historial ni cuenta para estadísticas.
          </p>
        </Modal>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------

function ScoreboardView({ ctl, photos }: { ctl: MatchController; photos: Map<string, string | undefined> }) {
  const { state, now, send } = ctl;
  const score = getScore(state);
  const clock = getClock(state, now);
  const lock = goalLockRemaining(state, now);
  const playing = state.phase === 'playing';
  const flash = now - ctl.lockFlashAt < 700;
  const periodScore = getPeriodScore(state);
  const canCorrect = state.phase === 'playing' || state.phase === 'paused';

  const team = (t: Team) => {
    const people = state.participants.filter((p) => p.team === t).sort((a, b) => a.slot - b.slot);
    return (
      <div className={`team-side side-${t}`}>
        <button
          className={`score-btn score-${t} ${lock > 0 ? 'locked' : ''}`}
          onClick={() => send({ type: 'GOAL', team: t, source: 'touch' })}
          disabled={!playing}
          aria-label={`Gol ${TEAM_LABEL[t]}. Marcador ${score[t]}`}
        >
          <span className="score-team">{TEAM_LABEL[t]}</span>
          <span className={`score-num ${score[t] >= 10 ? 'two' : ''}`}>{score[t]}</span>
          {lock > 0 && (
            <span className="lock-bar" aria-hidden="true">
              <span style={{ width: `${(lock / GOAL_LOCK_MS) * 100}%` }} />
            </span>
          )}
        </button>
        <div className="team-bottom">
          {t === 'white' && (
            <button
              className="minus-btn"
              onClick={() => send({ type: 'MINUS_ONE', team: t })}
              disabled={!canCorrect || periodScore[t] === 0}
              aria-label={`Restar un gol a ${TEAM_LABEL[t]}`}
            >
              −1
            </button>
          )}
          <div className="team-people">
            {people.map((p) => (
              <span key={p.playerId} className="person">
                <Avatar name={p.nameSnapshot} photo={photos.get(p.playerId)} size={26} />
                <span>{p.nameSnapshot}</span>
              </span>
            ))}
          </div>
          {t === 'blue' && (
            <button
              className="minus-btn"
              onClick={() => send({ type: 'MINUS_ONE', team: t })}
              disabled={!canCorrect || periodScore[t] === 0}
              aria-label={`Restar un gol a ${TEAM_LABEL[t]}`}
            >
              −1
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <header className="match-top">
        <span className="period-chip">{PERIOD_LABEL[state.period]}</span>
        {state.period === 'overtime' && <span className="badge badge-ranked">GOL DE ORO</span>}
        <span className="dim match-cond">{conditionText(state.config)}</span>
        <span style={{ flex: 1 }} />
        {state.config.testMode && <TestModeBadge />}
        <span className={`badge ${state.config.mode === 'chaos' ? 'badge-chaos' : state.config.mode === 'ranked' ? 'badge-ranked' : 'badge-accent'}`}>
          {MODE_LABEL[state.config.mode]}
        </span>
      </header>
      <div className="match-main">
        {team('white')}
        <div className="center-col">
          <div className="label">{clock.remainingMs !== null ? 'Restante' : 'Tiempo'}</div>
          <SevenSegment
            className="clock"
            text={formatDuration(clock.remainingMs ?? clock.periodElapsedMs)}
            height={58}
            color={clock.remainingMs !== null && clock.remainingMs <= 10_000 && playing ? '#FF5A6E' : '#62D6FF'}
            label={`Reloj ${formatDuration(clock.remainingMs ?? clock.periodElapsedMs)}`}
          />
          {state.config.endCondition !== 'time' && state.period !== 'overtime' && (
            <div className="period-goals">
              Parte: {periodScore.white + periodScore.blue}/{state.config.goalsPerPeriod}
            </div>
          )}
          <div className={`lock-msg ${lock > 0 ? 'on' : ''} ${flash ? 'flash' : ''}`} role="status">
            {lock > 0 ? `Bloqueo ${(lock / 1000).toFixed(1)} s` : ' '}
          </div>
          <div className="center-actions">
            <button
              className="btn btn-sm"
              onClick={() => send({ type: 'UNDO' })}
              disabled={!canCorrect || state.undoStack.length === 0}
            >
              ↶ Deshacer
            </button>
            <button
              className="btn btn-sm"
              onClick={() => send({ type: state.phase === 'paused' ? 'RESUME' : 'PAUSE' })}
              disabled={!canCorrect}
              aria-label={state.phase === 'paused' ? 'Continuar' : 'Pausa'}
            >
              {state.phase === 'paused' ? '▶ Continuar' : '❚❚ Pausa'}
            </button>
          </div>
        </div>
        {team('blue')}
      </div>
    </>
  );
}

function CountdownOverlay({ ctl }: { ctl: MatchController }) {
  const { state, now, send } = ctl;
  const remaining = countdownRemaining(state, now);
  const n = Math.max(1, Math.ceil(remaining / 1000));
  const lastN = useRef(0);
  useEffect(() => {
    if (n !== lastN.current) {
      lastN.current = n;
      sound.play('countdown');
    }
  }, [n]);
  return (
    <button className="overlay overlay-countdown" onClick={() => send({ type: 'SKIP_COUNTDOWN' })} autoFocus>
      <span className="overlay-sub">
        {PERIOD_LABEL[state.period]}
        {state.period === 'overtime' ? ' · GOL DE ORO · 60 s' : ''}
      </span>
      <span key={n} className="countdown-num">
        <SevenSegment text={String(n)} height={190} color="#62D6FF" />
      </span>
      <span className="overlay-hint">Toca para saltar</span>
    </button>
  );
}

function PeriodEndOverlay({ ctl }: { ctl: MatchController }) {
  const { state, send } = ctl;
  const score = getScore(state);
  const last = state.periods[state.periods.length - 1];
  let title = 'FINAL 1ª PARTE';
  let cta = 'CONTINUAR 2ª PARTE';
  let note = '';
  if (state.period === 'second') {
    title = 'FINAL 2ª PARTE';
    cta = 'IR A PRÓRROGA';
    note = 'Empate: prórroga de 60 segundos con gol de oro.';
  } else if (state.period === 'overtime') {
    title = 'FIN DE LA PRÓRROGA';
    cta = 'IR A PENALTIS';
    note = 'Sin gol en la prórroga: tanda de penaltis.';
  }
  const reason = last?.endReason === 'time' ? 'por tiempo' : last?.endReason === 'goals' ? 'por goles' : '';
  return (
    <div className="overlay overlay-period">
      <div className="overlay-sub">{title} {reason && <span className="dim">· {reason}</span>}</div>
      <div className="period-score">
        <span className="ps-white">{score.white}</span>
        <span className="ps-sep">–</span>
        <span className="ps-blue">{score.blue}</span>
      </div>
      {last && (
        <div className="muted">
          Parcial {PERIOD_LABEL[last.period].toLowerCase()}: {last.score.white}–{last.score.blue} · {formatDuration(last.durationMs)}
        </div>
      )}
      {note && <div className="muted">{note}</div>}
      <button className="btn btn-primary btn-lg overlay-cta" onClick={() => send({ type: 'CONTINUE' })} autoFocus>
        {cta}
      </button>
    </div>
  );
}

function PenaltiesView({ ctl }: { ctl: MatchController }) {
  const { state, send } = ctl;
  const pen = getPenaltyScore(state);
  const score = getScore(state);
  const turn = nextPenaltyTeam(state);
  const sudden = isSuddenDeath(state);
  const active = state.phase === 'penalties';

  const column = (t: Team) => {
    const kicks = state.penalties.filter((k) => k.team === t);
    const slots = Math.max(state.config.penaltyRounds, kicks.length + (active && turn === t ? 1 : 0));
    const isTurn = active && turn === t;
    return (
      <div className={`pen-col pen-${t} ${isTurn ? 'is-turn' : ''}`}>
        <div className="pen-team">{TEAM_LABEL[t]}</div>
        <div className="pen-score">{pen[t]}</div>
        <div className="pen-dots" aria-label={`Lanzamientos ${TEAM_LABEL[t]}: ${kicks.map((k) => (k.scored ? 'gol' : 'fallo')).join(', ') || 'ninguno'}`}>
          {Array.from({ length: slots }, (_, i) => {
            const k = kicks[i];
            return (
              <span key={i} className={`pen-dot ${k ? (k.scored ? 'hit' : 'miss') : ''} ${i >= state.config.penaltyRounds ? 'sd' : ''}`}>
                {k ? (k.scored ? '✓' : '✕') : ''}
              </span>
            );
          })}
        </div>
        <div className="pen-actions">
          <button
            className="btn btn-lg pen-goal"
            disabled={!isTurn}
            onClick={() => send({ type: 'PENALTY', team: t, scored: true, source: 'touch' })}
          >
            GOL
          </button>
          <button
            className="btn btn-lg pen-miss"
            disabled={!isTurn}
            onClick={() => send({ type: 'PENALTY', team: t, scored: false, source: 'touch' })}
          >
            FALLO
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="penalties">
      <header className="match-top">
        <span className="period-chip">TANDA DE PENALTIS</span>
        {sudden && <span className="badge badge-danger">MUERTE SÚBITA</span>}
        <span style={{ flex: 1 }} />
        <span className="muted" style={{ fontSize: 13 }}>
          Marcador ordinario {score.white}–{score.blue}
        </span>
        {state.config.testMode && <TestModeBadge />}
      </header>
      <div className="pen-main">
        {column('white')}
        <div className="pen-center">
          {active ? (
            <>
              <div className="label">Lanza</div>
              <div className={`pen-turn team-${turn}`}>{TEAM_LABEL[turn]}</div>
              <div className="dim" style={{ fontSize: 12, textAlign: 'center' }}>
                Intento {state.penalties.filter((k) => k.team === turn).length + 1}
                {sudden ? ' · se decide por parejas' : ` de ${state.config.penaltyRounds}`}
              </div>
              <button
                className="btn btn-sm"
                style={{ marginTop: 'auto' }}
                disabled={state.penalties.length === 0}
                onClick={() => send({ type: 'UNDO_PENALTY' })}
              >
                ↶ Deshacer lanzamiento
              </button>
            </>
          ) : (
            <div className="pen-turn">DECIDIDA</div>
          )}
        </div>
        {column('blue')}
      </div>
    </div>
  );
}
