export type BossRun = {
  runId: string;
  unitId: string;
  seed: number;
  questions: BossQuestion[];
};

export type BossQuestion = BossMcqQuestion;

export type BossMcqQuestion = {
  questionId: string;
  type: "boss_poem_blank" | "boss_reading_mcq" | "boss_reading_tf";
  prompt: string;
  choices: string[];
  correctChoice: string;
  meta?: {
    title?: string;
    author?: string;
    source?: string;
  };
};

export type BossAnswer = {
  questionId: string;
  choice: string;
};

export type BossGradeResult = {
  total: number;
  correct: number;
  score: number; // 0..100
};
