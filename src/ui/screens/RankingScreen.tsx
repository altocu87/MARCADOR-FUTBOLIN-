import { useMemo, useState } from 'react';
import { useApp } from '../../app/AppContext';
import type { RankingTab } from '../../app/routes';
import type { MatchMode } from '../../match-engine';
import { computeHallOfFame, computeRecords } from '../../services/progression';
import { sortPlayers } from '../../services/players';
import { computePlayerStats, sortMatches } from '../../services/statistics';
import { Avatar, FormChips, MODE_LABEL, ScreenFrame, Tabs, formatDate } from '../components/common';

const PAGE = 20;

export function RankingScreen({ tab: initialTab }: { tab?: RankingTab }) {
  const { navigate } = useApp();
  const [tab, setTab] = useState<RankingTab>(initialTab ?? 'standings');
  return (
    <ScreenFrame title="Ranking" onBack={() => navigate({ name: 'home' })}>
      <Tabs
        label="Secciones de ranking"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'standings', label: 'Clasificación' },
          { id: 'history', label: 'Historial' },
          { id: 'players', label: 'Jugadores' },
          { id: 'fame', label: 'Hall of Fame' },
          { id: 'records', label: 'Récords' },
        ]}
      />
      {tab === 'standings' && <Standings />}
      {tab === 'history' && <History />}
      {tab === 'players' && <PlayersGrid />}
      {tab === 'fame' && <HallOfFame />}
      {tab === 'records' && <Records />}
    </ScreenFrame>
  );
}

function Standings() {
  const { players, matches, progression, navigate } = useApp();
  const rows = useMemo(() => {
    if (!progression) return [];
    const ranked = matches.filter((m) => m.config.mode === 'ranked');
    return players
      .map((p) => ({ p, prog: progression.players.get(p.id)!, form: computePlayerStats(p.id, ranked).form }))
      .filter((r) => r.prog && r.prog.rankedPlayed > 0)
      // Desempate propuesto: ELO, luego partidos clasificatorios, luego nombre.
      .sort((a, b) => b.prog.elo - a.prog.elo || b.prog.rankedPlayed - a.prog.rankedPlayed || a.p.name.localeCompare(b.p.name, 'es'));
  }, [players, matches, progression]);

  if (!progression) {
    return (
      <div className="empty">
        <div>
          <strong>Clasificación pendiente</strong>
          La progresión (ELO/XP) está desactivada en Ajustes → Progresión.
        </div>
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <div className="empty">
        <div>
          <strong>Sin partidos clasificatorios</strong>
          Juega un Clasificatorio (sin modo prueba) para aparecer en la clasificación.
        </div>
      </div>
    );
  }
  return (
    <>
      <div className="std-head">
        <span>#</span>
        <span>Jugador</span>
        <span>ELO</span>
        <span>Categoría</span>
        <span>PJ</span>
        <span>Forma</span>
      </div>
      <div className="list scroll" style={{ flex: 1, minHeight: 0 }}>
        {rows.map((r, i) => (
          <button key={r.p.id} className="row std-row" onClick={() => navigate({ name: 'profile', playerId: r.p.id })}>
            <span className={`std-pos pos-${i + 1}`}>{i + 1}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <Avatar name={r.p.name} photo={r.p.photo} size={32} />
              <span className="ellipsis">{r.p.name}</span>
            </span>
            <span style={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{r.prog.elo}</span>
            <span style={{ color: r.prog.category.color, fontWeight: 700 }}>{r.prog.category.name}</span>
            <span className="muted">{r.prog.rankedPlayed}</span>
            <FormChips form={r.form} />
          </button>
        ))}
      </div>
      <div className="dim" style={{ fontSize: 11 }}>
        ELO inicial 1200 · K 40/20 · reglas propuestas pendientes de aprobación · desempates y muestra mínima pendientes.
      </div>
    </>
  );
}

function History() {
  const { matches, players, navigate } = useApp();
  const [mode, setMode] = useState<MatchMode | 'all'>('all');
  const [playerId, setPlayerId] = useState<string>('all');
  const [page, setPage] = useState(0);
  const list = useMemo(
    () =>
      sortMatches(matches)
        .reverse()
        .filter((m) => mode === 'all' || m.config.mode === mode)
        .filter((m) => playerId === 'all' || m.participants.some((p) => p.playerId === playerId)),
    [matches, mode, playerId],
  );
  const pages = Math.max(1, Math.ceil(list.length / PAGE));
  const current = list.slice(page * PAGE, page * PAGE + PAGE);
  const names = (m: (typeof matches)[number], t: 'white' | 'blue') =>
    m.participants.filter((p) => p.team === t).sort((a, b) => a.slot - b.slot).map((p) => p.nameSnapshot).join(' + ');

  return (
    <>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <select className="input" style={{ minHeight: 44, fontSize: 14 }} value={mode} onChange={(e) => { setMode(e.target.value as MatchMode | 'all'); setPage(0); }} aria-label="Filtrar por modalidad">
          <option value="all">Todas las modalidades</option>
          <option value="quick">{MODE_LABEL.quick}</option>
          <option value="chaos">{MODE_LABEL.chaos}</option>
          <option value="ranked">{MODE_LABEL.ranked}</option>
        </select>
        <select className="input" style={{ minHeight: 44, fontSize: 14 }} value={playerId} onChange={(e) => { setPlayerId(e.target.value); setPage(0); }} aria-label="Filtrar por jugador">
          <option value="all">Todos los jugadores</option>
          {sortPlayers(players).map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <span style={{ flex: 1 }} />
        <button className="btn btn-sm" disabled={page === 0} onClick={() => setPage(page - 1)} aria-label="Página anterior">‹</button>
        <span className="muted" style={{ fontSize: 13 }}>{page + 1}/{pages}</span>
        <button className="btn btn-sm" disabled={page >= pages - 1} onClick={() => setPage(page + 1)} aria-label="Página siguiente">›</button>
      </div>
      {list.length === 0 ? (
        <div className="empty">
          <div>
            <strong>Historial vacío</strong>
            Los partidos jugados sin modo prueba aparecerán aquí.
          </div>
        </div>
      ) : (
        <div className="list scroll" style={{ flex: 1, minHeight: 0 }}>
          {current.map((m) => (
            <button key={m.id} className="row hist-row" onClick={() => navigate({ name: 'matchDetail', matchId: m.id })}>
              <span className="dim hist-date">{formatDate(m.finishedAt)}</span>
              <span className={`hist-mode mode-${m.config.mode}`}>{MODE_LABEL[m.config.mode]}</span>
              <span className={`hist-name ${m.result.winner === 'white' ? 'win' : ''}`}>{names(m, 'white')}</span>
              <span className="hist-score">
                {m.result.score.white}–{m.result.score.blue}
              </span>
              <span className={`hist-name right ${m.result.winner === 'blue' ? 'win' : ''}`}>{names(m, 'blue')}</span>
              <span className="hist-tags">
                {m.result.reason === 'golden_goal' && <span className="badge">Prórroga</span>}
                {m.result.penaltyScore && (
                  <span className="badge">P {m.result.penaltyScore.white}–{m.result.penaltyScore.blue}</span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

function PlayersGrid() {
  const { players, progression, navigate } = useApp();
  const list = sortPlayers(players);
  if (list.length === 0) {
    return (
      <div className="empty">
        <div>
          <strong>Sin jugadores</strong>
          Créalos en Ajustes → Jugadores.
        </div>
      </div>
    );
  }
  return (
    <div className="pgrid pgrid-wide scroll" style={{ flex: 1, minHeight: 0 }}>
      {list.map((p) => {
        const prog = progression?.players.get(p.id);
        return (
          <button key={p.id} className={`pcard ${p.active ? '' : 'inactive'}`} onClick={() => navigate({ name: 'profile', playerId: p.id })}>
            <Avatar name={p.name} photo={p.photo} size={44} />
            <span className="pcard-name">{p.name}</span>
            <span className="pcard-meta">
              {!p.active ? 'Inactivo' : prog ? `Nv ${prog.level}${prog.rankedPlayed ? ` · ${prog.elo}` : ''}` : ' '}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function HallOfFame() {
  const { players, matches, progression, navigate } = useApp();
  const rows = useMemo(() => computeHallOfFame(players, matches, progression), [players, matches, progression]);
  const nonEmpty = rows.filter((r) => r.leaders.length > 0);
  if (nonEmpty.length === 0) {
    return (
      <div className="empty">
        <div>
          <strong>Hall of Fame vacío</strong>
          Los líderes aparecerán al guardar partidos.
        </div>
      </div>
    );
  }
  return (
    <div className="fame-grid scroll" style={{ flex: 1, minHeight: 0 }}>
      {nonEmpty.map((row) => (
        <div key={row.id} className="card fame-card">
          <div className="label">{row.title}</div>
          {row.leaders.map((l, i) => (
            <button key={l.playerId} className={`fame-leader place-${i + 1}`} onClick={() => navigate({ name: 'profile', playerId: l.playerId })}>
              <span className="fame-place">{i + 1}</span>
              <Avatar name={l.name} photo={l.photo} size={i === 0 ? 34 : 26} />
              <span className="ellipsis" style={{ flex: 1, textAlign: 'left' }}>{l.name}</span>
              <strong>{l.value}</strong>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

function Records() {
  const { players, matches, progression, navigate } = useApp();
  const records = useMemo(() => computeRecords(players, matches, progression), [players, matches, progression]);
  if (records.length === 0) {
    return (
      <div className="empty">
        <div>
          <strong>Sin récords</strong>
          Se calculan automáticamente a partir del historial.
        </div>
      </div>
    );
  }
  return (
    <div className="list scroll" style={{ flex: 1, minHeight: 0 }}>
      {records.map((r) => (
        <button
          key={r.id}
          className="row"
          onClick={() =>
            r.matchId
              ? navigate({ name: 'matchDetail', matchId: r.matchId })
              : r.playerId && navigate({ name: 'profile', playerId: r.playerId })
          }
        >
          <span style={{ flex: 1 }}>
            <strong>{r.title}</strong>
            <div className="muted" style={{ fontSize: 12 }}>
              {r.holder}
              {r.at ? ` · ${formatDate(r.at)}` : ''}
            </div>
          </span>
          <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--ranked)' }}>{r.value}</span>
        </button>
      ))}
    </div>
  );
}
