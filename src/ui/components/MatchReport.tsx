/** Informe de un partido terminado: resumen, cronología, evolución y progresión. */
import { useState } from 'react';
import { useApp } from '../../app/AppContext';
import { annulledGoalIdsFromEvents, type MatchEvent, type Period, type Team } from '../../match-engine';
import type { StoredMatch } from '../../services/persistence';
import { ACHIEVEMENTS } from '../../services/progression';
import { formatDuration } from '../../services/statistics';
import { Avatar, MODE_LABEL, ModeBadge, Tabs, formatDate } from './common';
import { ScoreChart } from './ScoreChart';

const TEAM: Record<Team, string> = { white: 'Blanco', blue: 'Azul' };
const PERIOD: Record<Period, string> = { first: '1ª parte', second: '2ª parte', overtime: 'Prórroga', shootout: 'Penaltis' };
const REASON = { regulation: 'Tiempo reglamentario', golden_goal: 'Gol de oro en la prórroga', penalties: 'Tanda de penaltis' };

export function resultLine(m: StoredMatch): string {
  const r = m.result;
  const base = `${r.score.white}–${r.score.blue}`;
  if (r.penaltyScore) return `${base} · Penaltis ${r.penaltyScore.white}–${r.penaltyScore.blue} · Gana ${TEAM[r.winner]}`;
  if (r.reason === 'golden_goal') return `${base} · Gol de oro · Gana ${TEAM[r.winner]}`;
  return `${base} · Gana ${TEAM[r.winner]}`;
}

function describeEvent(e: MatchEvent, byId: Map<string, MatchEvent>): { text: string; kind: string } | null {
  const t = `${PERIOD[e.period]} · ${formatDuration(e.periodTimeMs)}`;
  const sc = `${e.scoreAfter.white}–${e.scoreAfter.blue}`;
  switch (e.type) {
    case 'GOAL':
      return { text: `Gol ${TEAM[e.team!]} · ${t} · ${sc}`, kind: 'goal' };
    case 'CORRECTION': {
      const g = byId.get(e.refEventId ?? '');
      return { text: `−1 ${TEAM[e.team!]}: anula gol de ${g ? formatDuration(g.periodTimeMs) : '?'} · ${t} · ${sc}`, kind: 'corr' };
    }
    case 'UNDO': {
      const g = byId.get(e.refEventId ?? '');
      const what = g?.type === 'GOAL' ? `anula gol ${TEAM[g.team!]}` : 'restaura gol corregido';
      return { text: `Deshacer: ${what} · ${t} · ${sc}`, kind: 'corr' };
    }
    case 'PERIOD_START':
      return { text: `Inicio ${PERIOD[e.period].toLowerCase()}`, kind: 'info' };
    case 'PERIOD_END':
      return { text: `Final ${PERIOD[e.period].toLowerCase()} (${e.reason === 'time' ? 'tiempo' : e.reason === 'golden_goal' ? 'gol de oro' : 'goles'}) · ${sc}`, kind: 'info' };
    case 'PAUSE':
      return { text: `Pausa · ${t}`, kind: 'minor' };
    case 'RESUME':
      return { text: `Continuar · ${t}`, kind: 'minor' };
    case 'PENALTY':
      return { text: `Penalti ${TEAM[e.team!]}: ${e.scored ? 'GOL' : 'FALLO'}`, kind: e.scored ? 'goal' : 'miss' };
    case 'PENALTY_UNDO':
      return { text: `Lanzamiento de ${TEAM[e.team!]} corregido`, kind: 'corr' };
    case 'MATCH_END':
      return { text: `Final del partido · gana ${TEAM[e.team!]}`, kind: 'info' };
    default:
      return null;
  }
}

type ReportTab = 'summary' | 'timeline' | 'chart' | 'progress';

export function MatchReport({ match }: { match: StoredMatch }) {
  const { progression, players } = useApp();
  const [tab, setTab] = useState<ReportTab>('summary');
  const photos = new Map(players.map((p) => [p.id, p.photo]));
  const r = match.result;
  const progressEntries = progression?.byMatch.get(match.id);

  const team = (t: Team) => (
    <div className={`rep-team rep-${t} ${r.winner === t ? 'is-winner' : ''}`}>
      <div className="label">{TEAM[t].toUpperCase()} {r.winner === t && <span className="win-tag">GANADOR</span>}</div>
      <div className="rep-score">{r.score[t]}</div>
      {match.participants
        .filter((p) => p.team === t)
        .sort((a, b) => a.slot - b.slot)
        .map((p) => (
          <div key={p.playerId} className="rep-person">
            <Avatar name={p.nameSnapshot} photo={photos.get(p.playerId)} size={26} />
            {p.nameSnapshot}
          </div>
        ))}
    </div>
  );

  const byId = new Map(match.events.map((e) => [e.id, e]));
  const annulled = annulledGoalIdsFromEvents(match.events);

  return (
    <div className="report">
      <Tabs
        label="Secciones del resumen"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'summary', label: 'Resumen' },
          { id: 'timeline', label: 'Cronología' },
          { id: 'chart', label: 'Evolución' },
          { id: 'progress', label: 'Progresión' },
        ]}
      />
      {tab === 'summary' && (
        <div className="rep-summary">
          {team('white')}
          <div className="rep-center">
            <div className="rep-line">{resultLine(match)}</div>
            <div className="muted" style={{ fontSize: 13 }}>{REASON[r.reason]}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
              <ModeBadge mode={match.config.mode} />
            </div>
            <table className="rep-table">
              <thead>
                <tr>
                  <th>Periodo</th>
                  <th>Blanco</th>
                  <th>Azul</th>
                  <th>Duración</th>
                </tr>
              </thead>
              <tbody>
                {match.periods.map((p) => (
                  <tr key={p.period}>
                    <td>{PERIOD[p.period]}</td>
                    <td>{p.score.white}</td>
                    <td>{p.score.blue}</td>
                    <td>{formatDuration(p.durationMs)}</td>
                  </tr>
                ))}
                {r.penaltyScore && (
                  <tr>
                    <td>Penaltis</td>
                    <td>{r.penaltyScore.white}</td>
                    <td>{r.penaltyScore.blue}</td>
                    <td>{match.penalties.length} lanz.</td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="dim" style={{ fontSize: 12 }}>
              {formatDate(match.finishedAt)} · Duración {formatDuration(r.totalTimeMs)} · {MODE_LABEL[match.config.mode]}
            </div>
          </div>
          {team('blue')}
        </div>
      )}
      {tab === 'timeline' && (
        <ol className="timeline scroll">
          {match.events.map((e) => {
            const d = describeEvent(e, byId);
            if (!d) return null;
            const isAnnulled = e.type === 'GOAL' && annulled.has(e.id);
            return (
              <li key={e.id} className={`tl-${d.kind} ${isAnnulled ? 'annulled' : ''}`}>
                <span className="tl-seq">#{e.seq}</span>
                <span className="tl-text">{d.text}</span>
                {isAnnulled && <span className="badge badge-danger">Anulado</span>}
              </li>
            );
          })}
        </ol>
      )}
      {tab === 'chart' && <ScoreChart events={match.events} totalTimeMs={r.totalTimeMs} />}
      {tab === 'progress' && (
        <div className="scroll" style={{ flex: 1, minHeight: 0 }}>
          {!progression ? (
            <div className="notice warn">Clasificación pendiente: la progresión está desactivada.</div>
          ) : !progressEntries ? (
            <div className="notice">Sin progresión: el partido no está guardado (modo prueba o error de guardado).</div>
          ) : (
            <div className="list">
              {match.participants.map((p) => {
                const e = progressEntries.get(p.playerId);
                if (!e) return null;
                return (
                  <div key={p.playerId} className="row" style={{ alignItems: 'flex-start' }}>
                    <Avatar name={p.nameSnapshot} photo={photos.get(p.playerId)} size={34} />
                    <div style={{ flex: 1 }}>
                      <strong>{p.nameSnapshot}</strong>{' '}
                      <span className="muted" style={{ fontSize: 12 }}>
                        Nivel {e.levelBefore}
                        {e.levelAfter !== e.levelBefore && ` → ${e.levelAfter}`}
                      </span>
                      <div className="dim" style={{ fontSize: 12 }}>
                        {e.xpBreakdown.map((l) => `${l.label} +${l.xp}`).join(' · ')}
                      </div>
                      {e.unlocked.length > 0 && (
                        <div style={{ fontSize: 12, color: 'var(--ranked)' }}>
                          Logros: {e.unlocked.map((id) => ACHIEVEMENTS.find((a) => a.id === id)?.name ?? id).join(', ')}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, color: 'var(--accent)' }}>+{e.xpGained} XP</div>
                      {e.eloDelta !== undefined && (
                        <div style={{ fontWeight: 800, color: e.eloDelta >= 0 ? 'var(--ok)' : 'var(--danger)' }}>
                          ELO {e.eloDelta >= 0 ? '+' : ''}
                          {e.eloDelta} ({e.eloAfter})
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div className="dim" style={{ fontSize: 11 }}>
                Reglas propuestas ({progression.rulesVersion}) pendientes de aprobación.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
