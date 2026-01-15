import type { Stars } from "@/domain/scoring/stars";
import { scoreToStars } from "@/domain/scoring/stars";
import type { LevelId } from "@/domain/levels/levels";

export type ProgressRow = {
  level_id: string;
  best_score: number;
  attempts: number;
  fails: number;
  updated_at: string;
};

export type LevelState = {
  unitId: LevelId;
  regular: {
    bestScore: number;
    stars: Stars;
    attempts: number;
    fails: number;
  } | null;
  boss: {
    bestScore: number;
    stars: Stars;
    attempts: number;
    fails: number;
  } | null;
  bossUnlocked: boolean;
};

export function bossLevelId(unitId: LevelId): string {
  return `${unitId}_boss`;
}

export function computeLevelState(unitId: LevelId, progress: ProgressRow[]): LevelState {
  const regularRow = progress.find((p) => p.level_id === unitId) ?? null;
  const bossRow = progress.find((p) => p.level_id === bossLevelId(unitId)) ?? null;

  const regular =
    regularRow == null
      ? null
      : {
          bestScore: regularRow.best_score,
          stars: scoreToStars(regularRow.best_score),
          attempts: regularRow.attempts,
          fails: regularRow.fails,
        };

  const boss =
    bossRow == null
      ? null
      : {
          bestScore: bossRow.best_score,
          stars: scoreToStars(bossRow.best_score),
          attempts: bossRow.attempts,
          fails: bossRow.fails,
        };

  return {
    unitId,
    regular,
    boss,
    bossUnlocked: (regular?.stars ?? 0) >= 2,
  };
}
