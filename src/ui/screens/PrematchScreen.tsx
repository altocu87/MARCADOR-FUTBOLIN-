import { useMemo, useState } from 'react';
import { useApp } from '../../app/AppContext';
import type { MatchExtras } from '../../app/routes';
import type { MatchPick } from '../../services/persistence';
import { sortPlayers } from '../../services/players';
import { headToHead } from '../../services/statistics';
import type { MatchConfig, ParticipantRef, Team } from '../../match-engine';
import { predict } from '../../services/progression';
import { Avatar, FormChips, ScreenFrame, TestModeBadge } from '../components/common';

export function PrematchScreen({
  config,
  participants,
  extras,
}: {
  config: MatchConfig;
  participants: ParticipantRef[];
  extras?: MatchExtras;
}) {
  const { navigate, matches, progression, players } = useApp();
  // Pronósticos amistosos (sin dinero) de quien no juega: toque = Blanco → Azul → nada.
  const [picks, setPicks] = useState<MatchPick[]>([]);
  const spectators = sortPlayers(players.filter((p) => p.active && !participants.some((x) => x.playerId === p.id)));
  const cyclePick = (playerId: string) =>
    setPicks((prev) => {
      const cur = prev.find((p) => p.playerId === playerId);
      const rest = prev.filter((p) => p.playerId !== playerId);
      if (!cur) return [...rest, { playerId, team: 'white' }];
      if (cur.team === 'white') return [...rest, { playerId, team: 'blue' }];
      return rest;
    });
  const rivalry = useMemo(() => {
    const ids = (team: Team) => participants.filter((p) => p.team === team).map((p) => p.playerId);
    const h = headToHead(matches, ids('white'), ids('blue'), false);
    return h.played >= 5 ? h : null;
  }, [participants, matches]);
  const prediction = useMemo(() => {
    if (!progression) return null;
    const ids = (team: Team) => participants.filter((p) => p.team === team).map((p) => p.playerId);
    return predict(ids('white'), ids('blue'), matches, progression);
  }, [participants, matches, progression]);
  const byId = new Map(players.map((p) => [p.id, p]));

  const teamCard = (team: Team) => (
    <div className={`pre-team pre-${team}`}>
      <div className="label">{team === 'white' ? 'BLANCO' : 'AZUL'}</div>
      {participants
        .filter((p) => p.team === team)
        .sort((a, b) => a.slot - b.slot)
        .map((p) => {
          const prog = progression?.players.get(p.playerId);
          return (
            <div key={p.playerId} className="pre-player">
              <Avatar name={p.nameSnapshot} photo={byId.get(p.playerId)?.photo} size={42} />
              <div>
                <div style={{ fontWeight: 800, fontSize: 17 }}>{p.nameSnapshot}</div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {prog ? `ELO ${prog.elo} · ${prog.category.name} · Nv ${prog.level}` : 'Progresión pendiente'}
                </div>
              </div>
            </div>
          );
        })}
      <div style={{ marginTop: 'auto' }}>
        <div className="label" style={{ marginBottom: 4 }}>Forma reciente</div>
        <FormChips
          form={(team === 'white' ? prediction?.whiteForm : prediction?.blueForm) ?? []}
          empty="Sin clasificatorios"
        />
      </div>
    </div>
  );

  return (
    <ScreenFrame
      title="Previsión"
      subtitle="Clasificatorio"
      onBack={() => (extras?.tournament ? navigate({ name: 'tournamentDetail', id: extras.tournament.id }) : navigate({ name: 'select', config, participants }))}
      right={config.testMode ? <TestModeBadge /> : undefined}
      footer={
        <button className="btn btn-primary btn-lg" onClick={() => navigate({ name: 'match', config, participants, extras: { ...extras, picks } })}>
          Empezar partido
        </button>
      }
    >
      <div className="pre-layout">
        {teamCard('white')}
        <div className="pre-center">
          {!prediction ? (
            <div className="notice warn">Clasificación pendiente: la progresión está desactivada en Ajustes.</div>
          ) : !prediction.available ? (
            <div className="notice">{prediction.reason ?? 'Datos insuficientes.'} Puedes jugar igualmente.</div>
          ) : (
            <>
              <div className="label">Previsión estadística</div>
              <div className="pre-pcts">
                <span>{prediction.whitePct} %</span>
                <span>{prediction.bluePct} %</span>
              </div>
              <div className="pre-bar" aria-hidden="true">
                <span style={{ width: `${prediction.whitePct}%` }} />
              </div>
              <div className="muted" style={{ fontSize: 13 }}>
                Blanco {prediction.whitePct} % · Azul {prediction.bluePct} % · Confianza {prediction.confidence}
              </div>
              <div className="dim" style={{ fontSize: 11 }}>
                {prediction.directMatches} enfrentamientos directos · pesos ELO {(prediction.weights.elo * 100).toFixed(0)} % ·
                directos {(prediction.weights.h2h * 100).toFixed(0)} % · forma {(prediction.weights.form * 100).toFixed(0)} %
              </div>
            </>
          )}
          {rivalry && (
            <div className="rivalry" style={{ fontSize: 12, alignSelf: 'center' }}>
              ⚔ CLÁSICO · {rivalry.whiteWins}–{rivalry.blueWins}
            </div>
          )}
          {spectators.length > 0 && (
            <div style={{ marginTop: 'auto' }}>
              <div className="label" style={{ marginBottom: 4 }}>Pronósticos (toca: Blanco → Azul → nada)</div>
              <div className="pick-list">
                {spectators.map((s) => {
                  const pick = picks.find((p) => p.playerId === s.id);
                  return (
                    <button key={s.id} className={`pick-chip ${pick ? `pick-${pick.team}` : ''}`} onClick={() => cyclePick(s.id)}>
                      {s.name}
                      {pick && <strong> · {pick.team === 'white' ? 'B' : 'A'}</strong>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div className="dim" style={{ fontSize: 10, marginTop: spectators.length ? 0 : 'auto' }}>
            Estimación, nunca una certeza. Fórmula propuesta pendiente de aprobación.
          </div>
        </div>
        {teamCard('blue')}
      </div>
    </ScreenFrame>
  );
}
