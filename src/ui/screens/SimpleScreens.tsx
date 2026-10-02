import { useApp } from '../../app/AppContext';
import { MatchReport } from '../components/MatchReport';
import { ScreenFrame } from '../components/common';

export function MatchDetailScreen({ matchId }: { matchId: string }) {
  const { matches, navigate } = useApp();
  const match = matches.find((m) => m.id === matchId);
  return (
    <ScreenFrame title="Detalle del partido" onBack={() => navigate({ name: 'ranking', tab: 'history' })}>
      {match ? <MatchReport match={match} /> : <div className="empty">Partido no encontrado.</div>}
    </ScreenFrame>
  );
}

/** Torneo: pantalla informativa honesta hasta aprobar su formato. */
export function TournamentScreen() {
  const { navigate } = useApp();
  return (
    <ScreenFrame title="Torneo" onBack={() => navigate({ name: 'home' })}>
      <div className="empty">
        <div style={{ maxWidth: 520 }}>
          <div style={{ fontSize: 46 }} aria-hidden="true">🏆</div>
          <strong>Pendiente de definición</strong>
          <p style={{ margin: '6px 0' }}>
            El formato de torneo todavía no está aprobado. No se asume eliminación directa, liga, grupos,
            emparejamientos automáticos ni premios.
          </p>
          <p className="dim" style={{ fontSize: 12, margin: 0 }}>
            Antes de desarrollarlo hay que cerrar: participantes (individual o parejas), mínimo/máximo, formato,
            siembra, sorteos, desempates, ausencias, duración, reglas de cada partido y relación con XP/ELO.
          </p>
        </div>
      </div>
    </ScreenFrame>
  );
}
