/**
 * Previsión prepartido (solo Clasificatorio). Es una estimación, nunca una certeza.
 * Propuesta: ELO 60 %, enfrentamientos directos 25 %, forma 15 %.
 * Con pocos enfrentamientos directos su peso se reduce en proporción (n/5)
 * y los pesos se reajustan explícitamente para sumar 100 %.
 * El cálculo es local y no depende de la red.
 */
import type { StoredMatch } from '../persistence';
import { computePlayerStats, headToHead, type ResultLetter } from '../statistics/statistics';
import { eloExpected } from './rules';
import type { ProgressionSnapshot } from './progression';

export type Confidence = 'baja' | 'media' | 'alta';

export interface Prediction {
  available: boolean;
  whitePct: number;
  bluePct: number;
  confidence: Confidence;
  directMatches: number;
  weights: { elo: number; h2h: number; form: number };
  whiteForm: ResultLetter[];
  blueForm: ResultLetter[];
  reason?: string;
}

const FORM_POINTS = { G: 1, E: 0.5, P: 0 } as const;

function formScore(letters: ResultLetter[]): number | null {
  if (letters.length === 0) return null;
  return letters.reduce((s, l) => s + (FORM_POINTS[l]), 0) / letters.length;
}

export function confidenceFor(direct: number): Confidence {
  if (direct < 5) return 'baja';
  if (direct < 15) return 'media';
  return 'alta';
}

export function predict(
  whiteIds: string[],
  blueIds: string[],
  matches: StoredMatch[],
  progression: ProgressionSnapshot,
): Prediction {
  const rankedMatches = matches.filter((m) => m.config.mode === 'ranked');
  const anyHistory = [...whiteIds, ...blueIds].some(
    (id) => (progression.players.get(id)?.rankedPlayed ?? 0) > 0,
  );
  // Forma del equipo: últimas 5 clasificatorias de cada uno de sus jugadores, combinadas.
  const teamForm = (ids: string[]) => ids.flatMap((id) => computePlayerStats(id, rankedMatches).form);
  const whiteForm = teamForm(whiteIds);
  const blueForm = teamForm(blueIds);
  const h2h = headToHead(rankedMatches, whiteIds, blueIds, true);

  const base: Prediction = {
    available: false,
    whitePct: 50,
    bluePct: 50,
    confidence: confidenceFor(h2h.played),
    directMatches: h2h.played,
    weights: { elo: 0, h2h: 0, form: 0 },
    whiteForm,
    blueForm,
  };
  if (!anyHistory) return { ...base, reason: 'Datos insuficientes: ningún participante tiene partidos clasificatorios.' };

  const avgElo = (ids: string[]) =>
    ids.reduce((s, id) => s + (progression.players.get(id)?.elo ?? 1200), 0) / ids.length;
  const pElo = eloExpected(avgElo(whiteIds), avgElo(blueIds));

  let wElo = 0.6;
  let wH2h = 0.25 * Math.min(h2h.played, 5) / 5;
  const pH2h = h2h.played > 0 ? h2h.whiteWins / h2h.played : 0.5;

  const fw = formScore(whiteForm);
  const fb = formScore(blueForm);
  let wForm = fw !== null && fb !== null ? 0.15 : 0;
  const pForm = fw !== null && fb !== null && fw + fb > 0 ? fw / (fw + fb) : 0.5;

  const total = wElo + wH2h + wForm;
  wElo /= total;
  wH2h /= total;
  wForm /= total;

  const p = wElo * pElo + wH2h * pH2h + wForm * pForm;
  const whitePct = Math.round(p * 100);
  return {
    ...base,
    available: true,
    whitePct,
    bluePct: 100 - whitePct,
    weights: { elo: wElo, h2h: wH2h, form: wForm },
  };
}
