/**
 * Controlador del partido en la interfaz: mantiene el estado del motor, avanza
 * el reloj con tiempo real, traduce entradas a comandos y dispara sonido/efectos
 * SOLO tras la validación del motor. Guarda snapshots de recuperación.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '../../app/AppContext';
import { makeSnapshot } from '../../app/recovery';
import { teamFromCommand, inputBus } from '../../inputs/inputBus';
import {
  advance,
  createMatch,
  dispatch,
  type CommandOutcome,
  type EngineCommand,
  type MatchConfig,
  type MatchEvent,
  type MatchState,
  type ParticipantRef,
} from '../../match-engine';
import { newId } from '../../services/ids';
import { sound } from '../../services/sound/sound';

const SNAPSHOT_EVERY_MS = 5000;

export interface MatchController {
  state: MatchState;
  now: number;
  send(command: EngineCommand): CommandOutcome;
  /** Último gol aceptado (para efectos). */
  lastGoal: MatchEvent | null;
  /** Marca de tiempo del último rechazo por bloqueo (feedback visual). */
  lockFlashAt: number;
}

export function useMatchController(
  config: MatchConfig,
  participants: ParticipantRef[],
  resume?: MatchState,
): MatchController {
  const { repos } = useApp();
  const [state, setState] = useState<MatchState>(
    () => resume ?? createMatch(newId('m'), config, participants, Date.now()),
  );
  const [now, setNow] = useState(() => Date.now());
  const [lastGoal, setLastGoal] = useState<MatchEvent | null>(null);
  const [lockFlashAt, setLockFlashAt] = useState(0);
  const stateRef = useRef(state);
  const lastSnapshotAt = useRef(0);

  const saveSnapshot = useCallback(
    (s: MatchState, t: number) => {
      if (s.config.testMode || s.phase === 'finished') return;
      lastSnapshotAt.current = t;
      // Un fallo de snapshot no detiene el partido.
      void repos.activeMatch.save(makeSnapshot(s, t)).catch(() => undefined);
    },
    [repos],
  );

  const commit = useCallback(
    (next: MatchState, events: MatchEvent[], t: number) => {
      if (next === stateRef.current) return;
      stateRef.current = next;
      setState(next);
      for (const e of events) {
        if (e.type === 'GOAL') {
          setLastGoal(e);
          sound.play('goal');
        } else if (e.type === 'MATCH_END') sound.play('matchEnd');
        else if (e.type === 'PERIOD_END' && next.phase !== 'finished') sound.play('periodEnd');
        else if (e.type === 'PERIOD_START') sound.play('countdownGo');
        else if (e.type === 'PENALTY') sound.play(e.scored ? 'goal' : 'error');
      }
      saveSnapshot(next, t);
    },
    [saveSnapshot],
  );

  const send = useCallback(
    (command: EngineCommand): CommandOutcome => {
      const t = Date.now();
      const out = dispatch(stateRef.current, command, t);
      commit(out.state, out.events, t);
      if (!out.accepted && out.reason === 'goal_lock') {
        setLockFlashAt(t);
        sound.play('error');
      }
      setNow(t);
      return out;
    },
    [commit],
  );

  // Reloj: avanza con tiempo real (no cuenta renderizados).
  useEffect(() => {
    const id = window.setInterval(() => {
      const t = Date.now();
      const r = advance(stateRef.current, t);
      if (r.events.length) commit(r.state, r.events, t);
      else if (stateRef.current.runningSince !== undefined && t - lastSnapshotAt.current > SNAPSHOT_EVERY_MS) {
        saveSnapshot(stateRef.current, t);
      }
      setNow(t);
    }, 100);
    return () => window.clearInterval(id);
  }, [commit, saveSnapshot]);

  // Guardar al ocultar/cerrar la pestaña.
  useEffect(() => {
    const onHide = () => saveSnapshot(stateRef.current, Date.now());
    window.addEventListener('pagehide', onHide);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('pagehide', onHide);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [saveSnapshot]);

  // Entradas comunes (teclado, simulador, futuros pulsadores/sensores).
  useEffect(
    () =>
      inputBus.subscribe(({ command, source }) => {
        const s = stateRef.current;
        const team = teamFromCommand(command);
        if (s.phase === 'countdown' && (team || command === 'SALTAR')) {
          // La pulsación se consume como salto y no registra además un gol.
          send({ type: 'SKIP_COUNTDOWN' });
          return;
        }
        if (team && s.phase === 'penalties') {
          send({ type: 'PENALTY', team, scored: true, source });
          return;
        }
        if (team) {
          send({ type: 'GOAL', team, source });
          return;
        }
        if (command === 'PAUSA') {
          if (s.phase === 'playing') send({ type: 'PAUSE' });
          else if (s.phase === 'paused') send({ type: 'RESUME' });
        }
      }),
    [send],
  );

  return { state, now, send, lastGoal, lockFlashAt };
}
