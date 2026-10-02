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
