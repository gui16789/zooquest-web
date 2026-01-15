import { LEVELS } from "@/domain/levels/levels";

export type BadgeMeta = {
  badgeId: string;
  name: string;
  description: string;
  assetPath: string;
  fallbackAssetPath: string;
};

const FALLBACK_ASSET = "/badges/badge-placeholder.svg";

export function getBadgeMeta(badgeId: string): BadgeMeta {
  const assetPath = `/badges/badge-${badgeId}.png`;

  if (badgeId === "persistence_fails_5") {
    return {
      badgeId,
      name: "坚持不懈（5次）",
      description: "累计失败 5 次，仍然继续挑战。",
      assetPath,
      fallbackAssetPath: FALLBACK_ASSET,
    };
  }

  if (badgeId === "persistence_fails_10") {
    return {
      badgeId,
      name: "越挫越勇（10次）",
      description: "累计失败 10 次，依然不放弃。",
      assetPath,
      fallbackAssetPath: FALLBACK_ASSET,
    };
  }

  const mClear = badgeId.match(/^clear_(u[1-8])$/);
  if (mClear) {
    const unitId = mClear[1]!;
    const level = LEVELS.find((l) => l.unitId === unitId);
    return {
      badgeId,
      name: `${level?.regionName ?? unitId}通关`,
      description: "普通关达到 ⭐⭐。",
      assetPath,
      fallbackAssetPath: FALLBACK_ASSET,
    };
  }

  const mStar3 = badgeId.match(/^star3_(u[1-8])$/);
  if (mStar3) {
    const unitId = mStar3[1]!;
    const level = LEVELS.find((l) => l.unitId === unitId);
    return {
      badgeId,
      name: `${level?.regionName ?? unitId}完美通关`,
      description: "普通关达到 ⭐⭐⭐。",
      assetPath,
      fallbackAssetPath: FALLBACK_ASSET,
    };
  }

  const mBossClear = badgeId.match(/^boss_(u[1-8])_clear$/);
  if (mBossClear) {
    const unitId = mBossClear[1]!;
    const level = LEVELS.find((l) => l.unitId === unitId);
    return {
      badgeId,
      name: `${level?.regionName ?? unitId}Boss通过`,
      description: "Boss 关达到 ⭐⭐。",
      assetPath,
      fallbackAssetPath: FALLBACK_ASSET,
    };
  }

  const mBossStar3 = badgeId.match(/^boss_(u[1-8])_star3$/);
  if (mBossStar3) {
    const unitId = mBossStar3[1]!;
    const level = LEVELS.find((l) => l.unitId === unitId);
    return {
      badgeId,
      name: `${level?.regionName ?? unitId}Boss完美`,
      description: "Boss 关达到 ⭐⭐⭐。",
      assetPath,
      fallbackAssetPath: FALLBACK_ASSET,
    };
  }

  return {
    badgeId,
    name: badgeId,
    description: "",
    assetPath,
    fallbackAssetPath: FALLBACK_ASSET,
  };
}
