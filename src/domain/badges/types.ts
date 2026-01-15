export type UnitId = `u${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`;

export type BadgeId =
  | `clear_${UnitId}`
  | `star3_${UnitId}`
  | `boss_${UnitId}_clear`
  | `boss_${UnitId}_star3`
  | "persistence_fails_5"
  | "persistence_fails_10";

export type BadgeAward = {
  badgeId: BadgeId;
  reasonEvent: string;
};

export type BadgeContext = {
  unitId: UnitId;
  mode: "regular" | "boss";
  stars: 0 | 1 | 2 | 3;
  totalFailsAllUnits: number;
};

export function isUnitId(value: string): value is UnitId {
  return /^u[1-8]$/.test(value);
}
