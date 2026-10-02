import { useMemo, useState } from 'react';
import { useApp } from '../../app/AppContext';
import { validateParticipants, type MatchConfig, type ParticipantRef, type Team } from '../../match-engine';
import type { Player } from '../../services/persistence';
import { balancedTeams, randomTeams, sortPlayers } from '../../services/players';
import { displayTitle } from '../../services/progression';
import { Avatar, MODE_LABEL, ScreenFrame, TestModeBadge } from '../components/common';
import { PlayerEditor } from '../components/PlayerEditor';

type SlotKey = 'white1' | 'blue1' | 'white2' | 'blue2';
const ORDER: SlotKey[] = ['white1', 'blue1', 'white2', 'blue2'];
const SLOT_INFO: Record<SlotKey, { team: Team; slot: 1 | 2; label: string }> = {
  white1: { team: 'white', slot: 1, label: 'BLANCO 1' },
  white2: { team: 'white', slot: 2, label: 'BLANCO 2' },
  blue1: { team: 'blue', slot: 1, label: 'AZUL 1' },
  blue2: { team: 'blue', slot: 2, label: 'AZUL 2' },
};

function fromParticipants(parts?: ParticipantRef[]): Partial<Record<SlotKey, string>> {
  const out: Partial<Record<SlotKey, string>> = {};
  for (const p of parts ?? []) out[`${p.team}${p.slot}` as SlotKey] = p.playerId;
  return out;
}

export function SelectPlayersScreen({ config, initial }: { config: MatchConfig; initial?: ParticipantRef[] }) {
  const { players, navigate, progression } = useApp();
  const [slots, setSlots] = useState<Partial<Record<SlotKey, string>>>(() => fromParticipants(initial));
  const [active, setActive] = useState<SlotKey>(() => ORDER.find((k) => !fromParticipants(initial)[k]) ?? 'white1');
  const [creating, setCreating] = useState(false);

  const available = useMemo(() => sortPlayers(players.filter((p) => p.active)), [players]);
  const byId = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  const assign = (playerId: string) => {
    const next = { ...slots };
    for (const k of ORDER) if (next[k] === playerId) delete next[k];
    next[active] = playerId;
    setSlots(next);
    const following = ORDER.find((k) => !next[k]);
    if (following) setActive(following);
  };

  const clear = (k: SlotKey) => {
    setSlots((prev) => {
      const next = { ...prev };
      delete next[k];
      return next;
    });
    setActive(k);
  };

  // Construir participantes normalizando las plazas.
  const participants: ParticipantRef[] = [];
  for (const team of ['white', 'blue'] as Team[]) {
    const ids = [slots[`${team}1` as SlotKey], slots[`${team}2` as SlotKey]].filter(Boolean) as string[];
    ids.forEach((id, i) =>
      participants.push({ playerId: id, team, slot: (i + 1) as 1 | 2, nameSnapshot: byId.get(id)?.name ?? '?' }),
    );
  }
  const count = participants.length;
  const errors = validateParticipants(participants);
  const valid = errors.length === 0;
  const status =
    count === 0
      ? 'Toca una plaza y después un jugador.'
      : valid
        ? count === 2
          ? '1 contra 1 listo'
          : '2 contra 2 listo'
        : count === 3
          ? 'Selección incompleta: faltan jugadores para 2 contra 2 o sobra uno para 1 contra 1.'
          : 'Selección incompleta: cada equipo necesita el mismo número de jugadores.';

  // Sorteo de equipos con los 4 jugadores elegidos (en cualquier plaza).
  const chosen = ORDER.map((k) => slots[k]).filter(Boolean) as string[];
  const applySplit = (kind: 'balanced' | 'random') => {
    const split =
      kind === 'balanced'
        ? balancedTeams(chosen, (id) => progression?.players.get(id)?.elo ?? 1200)
        : randomTeams(chosen);
    setSlots({ white1: split.white[0], white2: split.white[1], blue1: split.blue[0], blue2: split.blue[1] });
  };

  const go = () => {
    if (!valid) return;
    if (config.mode === 'ranked') navigate({ name: 'prematch', config, participants });
    else navigate({ name: 'match', config, participants });
  };

  const renderSlot = (k: SlotKey) => {
    const info = SLOT_INFO[k];
    const p = slots[k] ? byId.get(slots[k]!) : undefined;
    return (
      <div key={k} className={`slot slot-${info.team} ${active === k ? 'is-active' : ''}`}>
        <button className="slot-main" onClick={() => setActive(k)} aria-pressed={active === k} aria-label={`Plaza ${info.label}`}>
          <span className="slot-label">{info.label}</span>
          {p ? (
            <span className="slot-player">
              <Avatar name={p.name} photo={p.photo} size={34} />
              <span className="slot-name">{p.name}</span>
            </span>
          ) : (
            <span className="slot-empty">{info.slot === 2 ? 'Opcional (2v2)' : 'Vacía'}</span>
          )}
        </button>
        {p && (
          <button className="slot-clear" onClick={() => clear(k)} aria-label={`Vaciar ${info.label}`}>
            ×
          </button>
        )}
      </div>
    );
  };

  const playerCard = (p: Player) => {
    const assignedTo = ORDER.find((k) => slots[k] === p.id);
    const prog = progression?.players.get(p.id);
    return (
      <button
        key={p.id}
        className={`pcard ${assignedTo ? `assigned assigned-${SLOT_INFO[assignedTo].team}` : ''}`}
        onClick={() => assign(p.id)}
      >
        <Avatar name={p.name} photo={p.photo} size={44} />
        <span className="pcard-name">{p.name}</span>
        <span className="pcard-meta">
          {assignedTo ? SLOT_INFO[assignedTo].label : prog ? `Nv ${prog.level}${prog.rankedPlayed ? ` · ${prog.elo}` : ''}` : ' '}
        </span>
        {displayTitle(prog, p.titleId) && <span className="pcard-title">{displayTitle(prog, p.titleId)}</span>}
      </button>
    );
  };

  return (
    <ScreenFrame
      title="Jugadores"
      subtitle={MODE_LABEL[config.mode]}
      onBack={() => navigate({ name: 'setup', mode: config.mode, config })}
      right={
        <>
          {config.testMode && <TestModeBadge />}
          <button className="btn btn-sm" onClick={() => setCreating(true)}>
            + Nuevo
          </button>
        </>
      }
      footer={
        <>
          <span className={`notice ${valid ? '' : count > 0 ? 'warn' : ''}`} style={{ marginRight: 'auto' }} role="status">
            {status}
          </span>
          {chosen.length === 4 && (
            <>
              <button className="btn btn-sm" onClick={() => applySplit('balanced')} title="Reparte por ELO para que los equipos estén igualados">
                ⚖ Equilibrar
              </button>
              <button className="btn btn-sm" onClick={() => applySplit('random')}>
                🎲 Aleatorio
              </button>
            </>
          )}
          <button className="btn btn-primary btn-lg" disabled={!valid} onClick={go}>
            Continuar
          </button>
        </>
      }
    >
      <div className="select-layout">
        <div className="slot-col">{(['white1', 'white2'] as SlotKey[]).map(renderSlot)}</div>
        <div className="pgrid scroll">
          {available.length === 0 ? (
            <div className="empty" style={{ gridColumn: '1 / -1' }}>
              <div>
                <strong>Sin jugadores</strong>
                Crea al menos dos jugadores para empezar.
                <div style={{ marginTop: 10 }}>
                  <button className="btn btn-primary" onClick={() => setCreating(true)}>
                    Crear jugador
                  </button>
                </div>
              </div>
            </div>
          ) : (
            available.map(playerCard)
          )}
        </div>
        <div className="slot-col">{(['blue1', 'blue2'] as SlotKey[]).map(renderSlot)}</div>
      </div>
      {creating && <PlayerEditor onClose={() => setCreating(false)} onSaved={(p) => assign(p.id)} />}
    </ScreenFrame>
  );
}
