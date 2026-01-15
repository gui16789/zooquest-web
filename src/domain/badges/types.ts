export type BadgeId =
  | "clear_u1"
  | "clear_u2"
  | "clear_u3"
  | "clear_u4"
  | "clear_u5"
  | "clear_u6"
  | "clear_u7"
  | "clear_u8"
  | "persistence_5fails"
  | "persistence_10fails";

export type BadgeAward = {
  badgeId: BadgeId;
  reasonEvent: string;
};

export type BadgeContext = {
  unitId: string;
  passed: boolean;
  totalFailsAllUnits: number;
};
