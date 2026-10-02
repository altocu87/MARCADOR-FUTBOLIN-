/** Torneos: lista, creación (liguilla o cuadro) y detalle con clasificación/cuadro y partidos. */
import { useState } from 'react';
import { useApp } from '../../app/AppContext';
import { DEFAULT_CONFIG, type EndCondition, type MatchConfig } from '../../match-engine';
import type { Fixture, Tournament, TournamentFormat } from '../../services/persistence';
import { sortPlayers } from '../../services/players';
import {
  MAX_TEAMS,
  MIN_TEAMS,
  TOURNAMENT_RULES_VERSION,
  createTournament,
  fixtureParticipants,
  leagueStandings,
  playableFixtures,
  roundLabel,
  validateDraft,
  type TournamentDraft,
} from '../../services/tournaments';
import { AssetImage } from '../components/assets';
import { Avatar, Modal, ScreenFrame, Toggle, formatDate } from '../components/common';
import { Confetti } from '../components/graphics';

const FORMAT_LABEL: Record<TournamentFormat, string> = { league: 'Liguilla', bracket: 'Cuadro eliminatorio' };

function Trophy({ size = 64 }: { size?: number }) {
  return (
    <AssetImage
      name="trofeo"
      alt="Trofeo"
      style={{ width: size, height: size, objectFit: 'contain' }}
      fallback={<span className="trophy-glyph" style={{ fontSize: size * 0.8 }} aria-hidden="true">🏆</span>}
    />
  );
}

export function TournamentListScreen() {
  const { navigate, tournaments } = useApp();
  const list = [...tournaments].sort((a, b) => b.createdAt - a.createdAt);
  return (
    <ScreenFrame
      title="Torneos"
      onBack={() => navigate({ name: 'home' })}
      right={
        <button className="btn btn-primary btn-sm" onClick={() => navigate({ name: 'tournamentNew' })}>
          + Nuevo torneo
        </button>
      }
    >
      {list.length === 0 ? (
        <div className="empty">
          <div style={{ maxWidth: 520 }}>
            <Trophy size={80} />
            <strong>Aún no hay torneos</strong>
            Crea una liguilla (todos contra todos) o un cuadro eliminatorio de 3 a 8 equipos, individuales o por parejas.
            <div style={{ marginTop: 12 }}>
              <button className="btn btn-primary" onClick={() => navigate({ name: 'tournamentNew' })}>
                Crear torneo
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="list scroll" style={{ flex: 1, minHeight: 0 }}>
          {list.map((t) => {
            const done = t.fixtures.filter((f) => f.matchId).length;
            const total = t.fixtures.filter((f) => !f.bye).length;
            const winner = t.teams.find((x) => x.id === t.winnerTeamId);
            return (
              <button key={t.id} className="row" onClick={() => navigate({ name: 'tournamentDetail', id: t.id })}>
                <span style={{ fontSize: 26 }} aria-hidden="true">{t.status === 'finished' ? '🏆' : t.status === 'cancelled' ? '✕' : '⚔'}</span>
                <span style={{ flex: 1 }}>
                  <strong>{t.name}</strong>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {FORMAT_LABEL[t.format]} · {t.teams.length} equipos · {t.teamSize === 1 ? '1v1' : '2v2'} · {t.ranked ? 'cuenta para ELO' : 'sin ELO'} · {formatDate(t.createdAt)}
                  </div>
                </span>
                {t.status === 'finished' && winner ? (
                  <span className="badge badge-ranked">Campeón: {winner.name}</span>
                ) : t.status === 'cancelled' ? (
                  <span className="badge">Cancelado</span>
                ) : (
                  <span className="badge badge-accent">{done}/{total} partidos</span>
                )}
              </button>
            );
          })}
        </div>
      )}
      <div className="dim" style={{ fontSize: 11 }}>
        Formato propuesto «{TOURNAMENT_RULES_VERSION}»: victoria = 3 puntos; desempate por diferencia de goles, goles a favor y enfrentamiento directo. Ganar un torneo da +300 XP.
      </div>
    </ScreenFrame>
  );
}

export function TournamentNewScreen() {
  const { navigate, players, progression, prefs, saveTournament, toast } = useApp();
  const [name, setName] = useState(`Torneo ${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`);
  const [format, setFormat] = useState<TournamentFormat>('league');
  const [teamSize, setTeamSize] = useState<1 | 2>(1);
  const [ranked, setRanked] = useState(false);
  const [seeding, setSeeding] = useState<'elo' | 'random'>('elo');
  const [endCondition, setEndCondition] = useState<EndCondition>(prefs.defaultEndCondition);
  const [goals, setGoals] = useState(prefs.defaultGoalsPerPeriod);
  const [minutes, setMinutes] = useState(prefs.defaultMinutesPerPeriod);
  const [selected, setSelected] = useState<string[]>([]);
  const elo = (id: string) => progression?.players.get(id)?.elo ?? prefs.progression.eloInitial;

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  // Parejas equilibradas: el mejor ELO con el peor, el segundo con el penúltimo…
  const teams: { playerIds: string[] }[] = [];
  if (teamSize === 1) selected.forEach((id) => teams.push({ playerIds: [id] }));
  else {
    const sorted = [...selected].sort((a, b) => elo(b) - elo(a));
    while (sorted.length >= 2) teams.push({ playerIds: [sorted.shift()!, sorted.pop()!] });
    if (sorted.length) teams.push({ playerIds: [sorted[0]] });
  }

  const config: MatchConfig = {
    ...DEFAULT_CONFIG,
    endCondition,
    goalsPerPeriod: goals,
    minutesPerPeriod: minutes,
    penaltyFirstTeam: prefs.penaltyFirstTeam,
  };
  const draft: TournamentDraft = { name, format, teamSize, ranked, config, teams, seeding };
  const errors = validateDraft(draft);
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? '?';

  const create = async () => {
    try {
      const t = createTournament(draft, players, elo, Date.now());
      await saveTournament(t);
      navigate({ name: 'tournamentDetail', id: t.id });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No se pudo crear');
    }
  };

  const seg = <T,>(value: T, options: [T, string][], onChange: (v: T) => void) => (
    <div className="segmented">
      {options.map(([v, label]) => (
        <button key={String(v)} className="seg seg-compact" aria-pressed={value === v} onClick={() => onChange(v)}>
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <ScreenFrame
      title="Nuevo torneo"
      onBack={() => navigate({ name: 'tournament' })}
      footer={
        <>
          <span className={`notice ${errors.length ? 'warn' : ''}`} style={{ marginRight: 'auto' }}>
            {errors[0] ?? `${teams.length} equipos listos`}
          </span>
          <button className="btn btn-primary btn-lg" disabled={errors.length > 0} onClick={create}>
            Crear torneo
          </button>
        </>
      }
    >
      <div className="tn-layout">
        <div className="tn-col scroll">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} aria-label="Nombre del torneo" maxLength={30} />
          <div className="label">Formato</div>
          {seg(format, [['league', 'LIGUILLA'], ['bracket', 'CUADRO']], setFormat)}
          <div className="label">Equipos</div>
          {seg<1 | 2>(teamSize, [[1, '1 JUGADOR'], [2, 'PAREJAS']], setTeamSize)}
          {format === 'bracket' && (
            <>
              <div className="label">Siembra</div>
              {seg(seeding, [['elo', 'POR ELO'], ['random', 'SORTEO']], setSeeding)}
            </>
          )}
          <div className="label">Partidos</div>
          {seg(endCondition, [['goals', 'GOLES'], ['time', 'TIEMPO'], ['both', 'AMBAS']], setEndCondition)}
          {endCondition !== 'time' && seg(goals, [[3, '3'], [5, '5'], [7, '7'], [10, '10']], setGoals)}
          {endCondition !== 'goals' && seg(minutes, [[3, '3 min'], [5, '5 min'], [8, '8 min']], setMinutes)}
          <Toggle checked={ranked} onChange={setRanked} label="Cuenta para ELO" description="Los partidos se juegan como Clasificatorio." />
        </div>
        <div className="tn-col">
          <div className="label">
            Jugadores ({selected.length}) · {teamSize === 1 ? `${MIN_TEAMS}–${MAX_TEAMS}` : `${MIN_TEAMS * 2}–${MAX_TEAMS * 2}, número par`}
          </div>
          <div className="chip-wrap scroll" style={{ maxHeight: 120 }}>
            {sortPlayers(players.filter((p) => p.active)).map((p) => (
              <button key={p.id} className={`pick-chip ${selected.includes(p.id) ? 'pick-blue' : ''}`} onClick={() => toggle(p.id)}>
                {p.name}
              </button>
            ))}
          </div>
          <div className="label">Equipos {teamSize === 2 && '(parejas equilibradas por ELO)'}</div>
          <div className="tn-teams scroll">
            {teams.map((t, i) => (
              <span key={i} className="tn-team">
                {t.playerIds.map(nameOf).join(' + ')}
              </span>
            ))}
            {teams.length === 0 && <span className="dim">Selecciona jugadores.</span>}
          </div>
        </div>
      </div>
    </ScreenFrame>
  );
}

export function TournamentDetailScreen({ id }: { id: string }) {
  const { navigate, tournaments, matches, players, saveTournament, prefs } = useApp();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const t = tournaments.find((x) => x.id === id);
  if (!t) {
    return (
      <ScreenFrame title="Torneo" onBack={() => navigate({ name: 'tournament' })}>
        <div className="empty">Torneo no encontrado.</div>
      </ScreenFrame>
    );
  }
  const teamName = (tid: string | null) => (tid ? t.teams.find((x) => x.id === tid)?.name ?? '?' : '—');
  const byId = new Map(matches.map((m) => [m.id, m]));
  const playable = playableFixtures(t);
  const winner = t.teams.find((x) => x.id === t.winnerTeamId);

  const play = (f: Fixture) => {
    const participants = fixtureParticipants(t, f, players);
    const config: MatchConfig = { ...t.config, testMode: false, penaltyFirstTeam: prefs.penaltyFirstTeam };
    const extras = { tournament: { id: t.id, fixtureId: f.id } };
    if (config.mode === 'ranked') navigate({ name: 'prematch', config, participants, extras });
    else navigate({ name: 'match', config, participants, extras });
  };

  const score = (f: Fixture) => {
    const m = f.matchId ? byId.get(f.matchId) : undefined;
    if (!m) return null;
    return `${m.result.score.white}–${m.result.score.blue}${m.result.penaltyScore ? ` (p ${m.result.penaltyScore.white}–${m.result.penaltyScore.blue})` : ''}`;
  };

  const fixtureRow = (f: Fixture) => (
    <div key={f.id} className={`fixture ${f.winnerTeamId ? 'done' : ''}`}>
      <span className={`fx-team ${f.winnerTeamId === f.whiteTeamId ? 'win' : ''}`}>{teamName(f.whiteTeamId)}</span>
      <span className="fx-score">{f.bye ? 'pase' : score(f) ?? 'vs'}</span>
      <span className={`fx-team right ${f.winnerTeamId === f.blueTeamId ? 'win' : ''}`}>{teamName(f.blueTeamId)}</span>
      {playable.includes(f) && (
        <button className="btn btn-primary btn-sm" onClick={() => play(f)}>
          ▶ Jugar
        </button>
      )}
    </div>
  );

  const rounds = [...new Set(t.fixtures.map((f) => f.round))].sort((a, b) => a - b);

  return (
    <ScreenFrame
      title={t.name}
      subtitle={`${FORMAT_LABEL[t.format]} · ${t.teamSize === 1 ? '1v1' : '2v2'}${t.ranked ? ' · ELO' : ''}`}
      onBack={() => navigate({ name: 'tournament' })}
      right={
        t.status === 'active' && (
          <button className="btn btn-danger btn-sm" onClick={() => setConfirmCancel(true)}>
            Cancelar torneo
          </button>
        )
      }
    >
      {t.status === 'finished' && winner && (
        <div className="champion-banner">
          {prefs.effects !== 'off' && <Confetti count={30} />}
          <Trophy size={56} />
          <div>
            <div className="label" style={{ color: 'var(--ranked)' }}>Campeón</div>
            <div className="champion-name">{winner.name}</div>
          </div>
          <div className="champion-avatars">
            {winner.playerIds.map((pid) => {
              const p = players.find((x) => x.id === pid);
              return <Avatar key={pid} name={p?.name ?? '?'} photo={p?.photo} size={48} />;
            })}
          </div>
        </div>
      )}
      <div className="td-layout">
        {t.format === 'league' ? (
          <div className="td-panel scroll">
            <div className="label">Clasificación</div>
            <table className="rep-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Equipo</th>
                  <th>PJ</th>
                  <th>G</th>
                  <th>P</th>
                  <th>Dif</th>
                  <th>Pts</th>
                </tr>
              </thead>
              <tbody>
                {leagueStandings(t, matches).map((r, i) => (
                  <tr key={r.team.id} className={i === 0 ? 'leader' : ''}>
                    <td>{i + 1}</td>
                    <td>{r.team.name}</td>
                    <td>{r.played}</td>
                    <td>{r.wins}</td>
                    <td>{r.losses}</td>
                    <td>{r.diff > 0 ? `+${r.diff}` : r.diff}</td>
                    <td><strong>{r.points}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="td-panel bracket scroll">
            {rounds.map((r) => (
              <div key={r} className="bracket-round">
                <div className="label">{roundLabel(t, r)}</div>
                {t.fixtures
                  .filter((f) => f.round === r)
                  .map((f) => (
                    <div key={f.id} className={`bracket-match ${f.winnerTeamId ? 'done' : ''}`}>
                      <span className={f.winnerTeamId && f.winnerTeamId === f.whiteTeamId ? 'win' : ''}>{teamName(f.whiteTeamId)}</span>
                      <span className={f.winnerTeamId && f.winnerTeamId === f.blueTeamId ? 'win' : ''}>{f.bye && !f.blueTeamId ? 'pase directo' : teamName(f.blueTeamId)}</span>
                    </div>
                  ))}
              </div>
            ))}
          </div>
        )}
        <div className="td-panel scroll">
          <div className="label">Partidos</div>
          {rounds.map((r) => (
            <div key={r}>
              <div className="dim" style={{ fontSize: 11, margin: '6px 0 3px' }}>{roundLabel(t, r)}</div>
              {t.fixtures.filter((f) => f.round === r && (f.whiteTeamId || f.blueTeamId)).map(fixtureRow)}
            </div>
          ))}
        </div>
      </div>
      {confirmCancel && (
        <Modal
          title="¿Cancelar el torneo?"
          onClose={() => setConfirmCancel(false)}
          actions={
            <>
              <button className="btn btn-ghost" onClick={() => setConfirmCancel(false)}>Seguir</button>
              <button
                className="btn btn-danger"
                onClick={async () => {
                  const cancelled: Tournament = { ...t, status: 'cancelled' };
                  await saveTournament(cancelled);
                  setConfirmCancel(false);
                }}
              >
                Cancelar torneo
              </button>
            </>
          }
        >
          <p style={{ margin: 0 }}>Los partidos ya jugados se conservan en el historial; el torneo queda sin campeón.</p>
        </Modal>
      )}
    </ScreenFrame>
  );
}
