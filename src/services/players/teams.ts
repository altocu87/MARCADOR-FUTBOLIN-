/** Sorteo de equipos: equilibrado por ELO o aleatorio, para 4 jugadores (2v2). */

export interface TeamSplit {
  white: [string, string];
  blue: [string, string];
  /** Diferencia absoluta entre las medias de ELO. */
  diff: number;
}

/** Las 3 formas de repartir 4 jugadores; devuelve la de menor diferencia de ELO. */
export function balancedTeams(ids: string[], elo: (id: string) => number): TeamSplit {
  if (ids.length !== 4) throw new Error('Se necesitan exactamente 4 jugadores.');
  const [a, b, c, d] = ids;
  const options: [[string, string], [string, string]][] = [
    [[a, b], [c, d]],
    [[a, c], [b, d]],
    [[a, d], [b, c]],
  ];
  let best: TeamSplit | null = null;
  for (const [w, bl] of options) {
    const diff = Math.abs((elo(w[0]) + elo(w[1])) / 2 - (elo(bl[0]) + elo(bl[1])) / 2);
    if (!best || diff < best.diff) best = { white: w, blue: bl, diff };
  }
  return best!;
}

export function randomTeams(ids: string[], rnd: () => number = Math.random): TeamSplit {
  if (ids.length !== 4) throw new Error('Se necesitan exactamente 4 jugadores.');
  const shuffled = [...ids];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return { white: [shuffled[0], shuffled[1]], blue: [shuffled[2], shuffled[3]], diff: 0 };
}
