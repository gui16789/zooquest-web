import type { BadgeAward, BadgeContext, BadgeId, UnitId } from "@/domain/badges/types";

function clearBadgeId(unitId: UnitId): BadgeId {
  return `clear_${unitId}`;
}

function star3BadgeId(unitId: UnitId): BadgeId {
  return `star3_${unitId}`;
}

function bossClearBadgeId(unitId: UnitId): BadgeId {
  return `boss_${unitId}_clear`;
}

function bossStar3BadgeId(unitId: UnitId): BadgeId {
  return `boss_${unitId}_star3`;
}

export function computeBadgeAwards(ctx: BadgeContext): BadgeAward[] {
  const awards: BadgeAward[] = [];

  if (ctx.mode === "regular") {
    if (ctx.stars >= 2) awards.push({ badgeId: clearBadgeId(ctx.unitId), reasonEvent: "REGULAR_CLEAR" });
    if (ctx.stars === 3) awards.push({ badgeId: star3BadgeId(ctx.unitId), reasonEvent: "REGULAR_STAR3" });
  } else {
    if (ctx.stars >= 2) awards.push({ badgeId: bossClearBadgeId(ctx.unitId), reasonEvent: "BOSS_CLEAR" });
    if (ctx.stars === 3) awards.push({ badgeId: bossStar3BadgeId(ctx.unitId), reasonEvent: "BOSS_STAR3" });
  }

  if (ctx.totalFailsAllUnits >= 10) {
    awards.push({ badgeId: "persistence_fails_10", reasonEvent: "FAILS_TOTAL_10" });
  } else if (ctx.totalFailsAllUnits >= 5) {
    awards.push({ badgeId: "persistence_fails_5", reasonEvent: "FAILS_TOTAL_5" });
  }

  return awards;
}
