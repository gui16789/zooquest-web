export type BossPhaseId = "minion1" | "minion2" | "boss";

export type BossKnowledgeRefs = [string] | [string, string];

export type BossRun = {
  runId: string;
  unitId: string;
  seed: number;
  questions: BossQuestion[];
};

export type BossQuestion = BossMcqQuestion | BossSentencePatternFillQuestion;

export type BossMcqQuestion = {
  questionId: string;
  phaseId: BossPhaseId;
  type: "boss_poem_blank" | "boss_reading_mcq" | "boss_reading_tf" | "boss_pinyin" | "boss_word_spelling" | "boss_polyphone" | "boss_confusing";
  prompt: string;
  choices: string[];
  correctChoice: string;
  knowledgeRefs: BossKnowledgeRefs;
  meta?: {
    title?: string;
    author?: string;
    source?: string;
    poemId?: string;
    passageId?: string;
    hanzi?: string;
    pinyin?: string;
    example?: string;
    rule?: string;
    examples?: string[];
  };
};

export type BossSentencePatternFillQuestion = {
  questionId: string;
  phaseId: BossPhaseId;
  type: "boss_sentence_pattern_fill";
  prompt: string;
  knowledgeRefs: BossKnowledgeRefs;
  template: string;
  slots: Array<{ key: string; label: string }>;
  wordBank: Record<string, string[]>;
  correct: Record<string, string>;
};

export type BossAnswer = {
  questionId: string;
  choice: string;
  payload?: unknown;
};

export type BossGradeResult = {
  total: number;
  correct: number;
  score: number; // 0..100
};
