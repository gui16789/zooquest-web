export type Stars = 0 | 1 | 2 | 3;

export function scoreToStars(score: number): Stars {
  if (score >= 95) return 3;
  if (score >= 80) return 2;
  if (score >= 60) return 1;
  return 0;
}
