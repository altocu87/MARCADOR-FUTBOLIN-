import { useMemo, useState } from 'react';
import { useApp } from '../../app/AppContext';
import { ACHIEVEMENTS, RARITY_LABEL, levelProgress, xpForLevel } from '../../services/progression';
import { RIVAL_MIN_MATCHES, computePlayerStats, formatDuration, sortMatches, type RivalStat, type StatBlock } from '../../services/statistics';
import { Avatar, FormChips, MODE_LABEL, ScreenFrame, StatTile, Tabs, formatDate, pct } from '../components/common';
import { resultLine } from '../components/MatchReport';

type ProfileTab = 'general' | 'ranked' | 'tournaments' | 'rivals' | 'achievements' | 'history';

function Block({ b }: { b: StatBlock }) {
  return (
    <div className="grid-4">
      <StatTile k="Partidos" v={b.played} />
      <StatTile k="Victorias" v={b.wins} />
      <StatTile k="Derrotas" v={b.losses} />
      <StatTile k="% victorias" v={pct(b.winPct)} />
      <StatTile k="Goles equipo a favor" v={b.goalsFor} />
      <StatTile k="Goles equipo en contra" v={b.goalsAgainst} />
      <StatTile k="Diferencia" v={b.goalDiff > 0 ? `+${b.goalDiff}` : b.goalDiff} />
      <StatTile k="Penaltis a favor/contra" v={`${b.penaltyGoalsFor}/${b.penaltyGoalsAgainst}`} />
    </div>
  );
}

export function ProfileScreen({ playerId }: { playerId: string }) {
  const { players, matches, progression, navigate, prefs } = useApp();
  const [tab, setTab] = useState<ProfileTab>('general');
  const player = players.find((p) => p.id === playerId);
  const stats = useMemo(() => computePlayerStats(playerId, matches), [playerId, matches]);
  const prog = progression?.players.get(playerId);
  const myMatches = useMemo(
    () => sortMatches(matches.filter((m) => m.participants.some((p) => p.playerId === playerId))).reverse(),
    [matches, playerId],
  );

  if (!player) {
    return (
      <ScreenFrame title="Perfil" onBack={() => navigate({ name: 'ranking', tab: 'players' })}>
        <div className="empty">Jugador no encontrado.</div>
      </ScreenFrame>
    );
  }

  const rivalRow = (r: RivalStat) => (
    <div key={r.playerId} className="row">
      <span style={{ flex: 1 }}>{r.name}</span>
      <span className="muted">{r.played} PJ</span>
      <span>{r.wins}G · {r.losses}P</span>
      <strong style={{ width: 60, textAlign: 'right' }}>{r.winPct.toFixed(0)} %</strong>
    </div>
  );

  return (
    <ScreenFrame title="Perfil" onBack={() => navigate({ name: 'ranking', tab: 'players' })}>
      <div className="profile-head">
        <Avatar name={player.name} photo={player.photo} size={64} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 800 }}>
            {player.name} {player.alias && <span className="muted" style={{ fontSize: 15 }}>«{player.alias}»</span>}
            {!player.active && <span className="badge" style={{ marginLeft: 8 }}>Inactivo</span>}
          </div>
          {prog ? (
            <>
              <div className="muted" style={{ fontSize: 13 }}>
                Nivel {prog.level} · {prog.xp} XP · siguiente nivel a {xpForLevel(prog.level + 1)} XP
              </div>
              <div className="xpbar" style={{ marginTop: 4, maxWidth: 320 }}>
                <span style={{ width: `${levelProgress(prog.xp) * 100}%` }} />
              </div>
            </>
          ) : (
            <div className="muted" style={{ fontSize: 13 }}>Progresión pendiente (desactivada en Ajustes)</div>
          )}
        </div>
        {prog && (
          <div className="profile-elo">
            <div style={{ color: prog.category.color, fontWeight: 800 }}>{prog.category.name}</div>
            <div style={{ fontSize: 26, fontWeight: 800 }}>{prog.elo}</div>
            <div className="dim" style={{ fontSize: 11 }}>ELO · máx {prog.maxElo}</div>
          </div>
        )}
      </div>
      <Tabs
        label="Secciones del perfil"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'general', label: 'General' },
          { id: 'ranked', label: 'Clasificatorio' },
          { id: 'tournaments', label: 'Torneos' },
          { id: 'rivals', label: 'Rivales' },
          { id: 'achievements', label: 'Logros' },
          { id: 'history', label: 'Historial' },
        ]}
      />
      <div className="scroll" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {tab === 'general' && (
          <>
            <Block b={stats.general} />
            <div className="grid-3">
              <StatTile
                k="Racha actual"
                v={
                  stats.currentStreak.type
                    ? `${stats.currentStreak.count} ${stats.currentStreak.type === 'G' ? 'victoria' : 'derrota'}${stats.currentStreak.count === 1 ? '' : 's'}`
                    : '—'
                }
              />
              <StatTile k="Mejor racha" v={stats.bestWinStreak} />
              <StatTile k="Tiempo jugado" v={formatDuration(stats.totalPlayTimeMs)} />
            </div>
            <div className="muted" style={{ fontSize: 12 }}>
              Últimos partidos: <FormChips form={stats.recent} /> · Los goles son del equipo mientras participaba (no se registra goleador).
            </div>
          </>
        )}
        {tab === 'ranked' && (
          <>
            <Block b={stats.ranked} />
            <div className="muted" style={{ fontSize: 13 }}>
              Forma (últimas 5 clasificatorias): <FormChips form={stats.form} empty="Sin clasificatorios" />
            </div>
            {prog && prog.eloHistory.length > 0 && (
              <div className="dim" style={{ fontSize: 12 }}>
                Evolución ELO: {[prefs.progression.eloInitial, ...prog.eloHistory.map((h) => h.elo)].slice(-12).join(' → ')}
              </div>
            )}
          </>
        )}
        {tab === 'tournaments' && (
          <div className="empty">
            <div>
              <strong>Torneos pendientes de definición</strong>
              Las estadísticas de torneo aparecerán cuando se apruebe su formato.
            </div>
          </div>
        )}
        {tab === 'rivals' && (
          <>
            <div className="grid-2">
              <div className="card">
                <div className="label">Rival favorito</div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>
                  {stats.favoriteRival ? `${stats.favoriteRival.name} · ${stats.favoriteRival.winPct.toFixed(0)} %` : 'Datos insuficientes'}
                </div>
              </div>
              <div className="card">
                <div className="label">Némesis</div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>
                  {stats.nemesis ? `${stats.nemesis.name} · ${stats.nemesis.winPct.toFixed(0)} %` : 'Datos insuficientes'}
                </div>
              </div>
            </div>
            <div className="dim" style={{ fontSize: 11 }}>
              Requiere al menos {RIVAL_MIN_MATCHES} enfrentamientos. Algoritmo propuesto pendiente de aprobación.
            </div>
            <div className="label">Enfrentamientos directos</div>
            {stats.rivals.length === 0 ? <div className="muted">Sin enfrentamientos.</div> : <div className="list">{stats.rivals.map(rivalRow)}</div>}
            {stats.teammates.length > 0 && (
              <>
                <div className="label">Compañeros (2v2)</div>
                <div className="list">{stats.teammates.map(rivalRow)}</div>
              </>
            )}
          </>
        )}
        {tab === 'achievements' && (
          <>
            <div className="dim" style={{ fontSize: 11 }}>Catálogo propuesto pendiente de aprobación.</div>
            <div className="ach-grid">
              {ACHIEVEMENTS.map((a) => {
                const got = prog?.achievements.find((x) => x.id === a.id);
                const hidden = a.secret && !got;
                return (
                  <div key={a.id} className={`ach ${got ? 'got' : ''} rarity-${a.rarity}`}>
                    <span className="ach-icon" aria-hidden="true">{hidden ? '?' : a.icon}</span>
                    <span style={{ minWidth: 0 }}>
                      <strong>{hidden ? 'Logro secreto' : a.name}</strong>
                      <div className="muted" style={{ fontSize: 11 }}>
                        {hidden ? '???' : a.description} · {RARITY_LABEL[a.rarity]}
                        {got && ` · ${formatDate(got.at)}`}
                      </div>
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
        {tab === 'history' &&
          (myMatches.length === 0 ? (
            <div className="muted">Sin partidos guardados.</div>
          ) : (
            <div className="list">
              {myMatches.slice(0, 50).map((m) => {
                const team = m.participants.find((p) => p.playerId === playerId)!.team;
                const won = m.result.winner === team;
                return (
                  <button key={m.id} className="row" onClick={() => navigate({ name: 'matchDetail', matchId: m.id })}>
                    <span className={`form-chip ${won ? 'G' : 'P'}`}>{won ? 'G' : 'P'}</span>
                    <span className="dim" style={{ width: 120, fontSize: 12 }}>{formatDate(m.finishedAt)}</span>
                    <span className="muted" style={{ width: 110, fontSize: 12 }}>{MODE_LABEL[m.config.mode]}</span>
                    <span style={{ flex: 1 }}>{resultLine(m)}</span>
                  </button>
                );
              })}
            </div>
          ))}
      </div>
    </ScreenFrame>
  );
}
