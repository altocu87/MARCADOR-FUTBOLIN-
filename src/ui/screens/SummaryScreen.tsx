import { useState } from 'react';
import { useApp } from '../../app/AppContext';
import { persistFinishedMatch, type SaveStatus } from '../../app/matchFinalizer';
import type { MatchState } from '../../match-engine';
import type { StoredMatch } from '../../services/persistence';
import { buildBackup } from '../../services/persistence';
import { MatchReport } from '../components/MatchReport';
import { ScreenFrame, TestModeBadge } from '../components/common';
import { downloadJson } from '../components/download';

export function SummaryScreen({ match, save, live }: { match: StoredMatch; save: SaveStatus; live: MatchState }) {
  const { navigate, repos, refresh, matches } = useApp();
  const [status, setStatus] = useState<SaveStatus>(save);

  const retry = async () => {
    const s = await persistFinishedMatch(live, repos);
    setStatus(s);
    if (s.kind === 'saved') await refresh();
  };

  const exportUnsaved = async () => {
    const backup = await buildBackup(repos);
    downloadJson(`marcador-partido-${match.id}.json`, { ...backup, matches: [...matches, match] });
  };

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
              El resultado aún no está guardado.
              <button className="btn btn-sm" onClick={retry}>Reintentar</button>
              <button className="btn btn-sm" onClick={exportUnsaved}>Exportar</button>
            </span>
          )}
          {status.kind === 'test' && (
            <span className="notice" style={{ marginRight: 'auto' }}>
              Modo prueba: no se ha guardado ni cuenta para estadísticas.
            </span>
          )}
          <button className="btn" onClick={() => navigate({ name: 'home' })}>
            Inicio
          </button>
          <button
            className="btn"
            onClick={() => navigate({ name: 'match', config: match.config, participants: match.participants })}
          >
            Revancha
          </button>
          <button className="btn btn-primary" onClick={() => navigate({ name: 'setup', mode: match.config.mode })}>
            Nuevo partido
          </button>
        </>
      }
    >
      <MatchReport match={match} />
    </ScreenFrame>
  );
}
