export type LevelId = `u${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`;

export type LevelMeta = {
  unitId: LevelId;
  order: number;
  regionName: string;
  theme: string;
  regularTitle: string;
  bossTitle: string;
  bossCharacters: string[];
};

export const LEVELS: LevelMeta[] = [
  {
    unitId: "u1",
    order: 1,
    regionName: "水滴镇",
    theme: "小蝌蚪找妈妈",
    regularTitle: "普通关：识字与拼句",
    bossTitle: "Boss：诗词大会 × 推理破案",
    bossCharacters: ["羊副市长", "豹警官"],
  },
  {
    unitId: "u2",
    order: 2,
    regionName: "森林区",
    theme: "树之歌、田家四季",
    regularTitle: "普通关",
    bossTitle: "Boss",
    bossCharacters: ["守关Boss"],
  },
  {
    unitId: "u3",
    order: 3,
    regionName: "彩虹桥",
    theme: "星空、彩虹",
    regularTitle: "普通关",
    bossTitle: "Boss",
    bossCharacters: ["守关Boss"],
  },
  {
    unitId: "u4",
    order: 4,
    regionName: "高山区",
    theme: "黄山、日月潭",
    regularTitle: "普通关",
    bossTitle: "Boss",
    bossCharacters: ["守关Boss"],
  },
  {
    unitId: "u5",
    order: 5,
    regionName: "寓言街",
    theme: "坐井观天、寓言故事",
    regularTitle: "普通关",
    bossTitle: "Boss",
    bossCharacters: ["守关Boss"],
  },
  {
    unitId: "u6",
    order: 6,
    regionName: "英雄广场",
    theme: "革命故事",
    regularTitle: "普通关",
    bossTitle: "Boss",
    bossCharacters: ["守关Boss"],
  },
  {
    unitId: "u7",
    order: 7,
    regionName: "云雾谷",
    theme: "江雪、雾的世界",
    regularTitle: "普通关",
    bossTitle: "Boss",
    bossCharacters: ["守关Boss"],
  },
  {
    unitId: "u8",
    order: 8,
    regionName: "欢乐园",
    theme: "称赞、快乐",
    regularTitle: "普通关",
    bossTitle: "Boss",
    bossCharacters: ["守关Boss"],
  },
];
