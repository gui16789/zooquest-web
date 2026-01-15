import type { BadgeAward, BadgeContext, BadgeId } from "@/domain/badges/types";

const UNIT_CLEAR_BADGES: Record<string, BadgeId> = {
  u1: "clear_u1",
  u2: "clear_u2",
  u3: "clear_u3",
  u4: "clear_u4",
  u5: "clear_u5",
  u6: "clear_u6",
  u7: "clear_u7",
  u8: "clear_u8",
};

export function computeBadgeAwards(ctx: BadgeContext): BadgeAward[] {
  const awards: BadgeAward[] = [];

  if (ctx.passed) {
    const clearBadge = UNIT_CLEAR_BADGES[ctx.unitId];
    if (clearBadge) awards.push({ badgeId: clearBadge, reasonEvent: "RUN_PASSED" });
  }

  if (ctx.totalFailsAllUnits >= 10) {
    awards.push({ badgeId: "persistence_10fails", reasonEvent: "FAILS_TOTAL_10" });
  } else if (ctx.totalFailsAllUnits >= 5) {
    awards.push({ badgeId: "persistence_5fails", reasonEvent: "FAILS_TOTAL_5" });
  }

  return awards;
}
