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

  if (badgeId === "growth_lv2") {
    return {
      badgeId,
      name: "见习探员",
      description: "成长到 Lv.2。",
      assetPath,
      fallbackAssetPath: FALLBACK_ASSET,
    };
  }

  if (badgeId === "growth_lv3") {
    return {
      badgeId,
      name: "正式探员",
      description: "成长到 Lv.3。",
      assetPath,
      fallbackAssetPath: FALLBACK_ASSET,
    };
  }

  if (badgeId === "growth_lv4") {
    return {
      badgeId,
      name: "高级探员",
      description: "成长到 Lv.4。",
      assetPath,
      fallbackAssetPath: FALLBACK_ASSET,
    };
  }

  if (badgeId === "growth_lv5") {
    return {
      badgeId,
      name: "王牌探员",
      description: "成长到 Lv.5。",
      assetPath,
      fallbackAssetPath: FALLBACK_ASSET,
    };
  }

  if (badgeId === "kp_coverage_60") {
    return {
      badgeId,
      name: "线索收集者",
      description: "知识点覆盖率达到 60%（需要 KP 统计表）。",
      assetPath,
      fallbackAssetPath: FALLBACK_ASSET,
    };
  }

  if (badgeId === "kp_coverage_85") {
    return {
      badgeId,
      name: "案卷完整",
      description: "知识点覆盖率达到 85%（需要 KP 统计表）。",
      assetPath,
      fallbackAssetPath: FALLBACK_ASSET,
    };
  }

  if (badgeId === "kp_coverage_100") {
    return {
      badgeId,
      name: "证据链闭环",
      description: "知识点覆盖率达到 100%（需要 KP 统计表）。",
      assetPath,
      fallbackAssetPath: FALLBACK_ASSET,
    };
  }

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
