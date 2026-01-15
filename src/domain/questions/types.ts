export type Question =
  | McqPinyinQuestion
  | McqHanziByPinyinQuestion
  | McqPolyphoneQuestion
  | McqSynonymAntonymQuestion
  | SentencePatternFillQuestion;

export type McqPinyinQuestion = {
  questionId: string;
  type: "mcq_pinyin";
  prompt: string;
  hanzi: string;
  choices: string[];
  correctChoice: string;
};

export type McqHanziByPinyinQuestion = {
  questionId: string;
  type: "mcq_hanzi_by_pinyin";
  prompt: string;
  pinyin: string;
  choices: string[];
  correctChoice: string; // hanzi
};

export type McqPolyphoneQuestion = {
  questionId: string;
  type: "mcq_polyphone";
  prompt: string;
  hanzi: string;
  example: string;
  choices: string[];
  correctChoice: string; // pinyin
};

export type McqSynonymAntonymQuestion = {
  questionId: string;
  type: "mcq_syn_ant";
  prompt: string;
  choices: string[];
  correctChoice: string;
};

export type SentencePatternFillQuestion = {
  questionId: string;
  type: "sentence_pattern_fill";
  prompt: string;
  template: string;
  slots: Array<{ key: string; label: string }>;
  // For MVP, each slot is filled by selecting a phrase from the word bank.
  wordBank: Record<string, string[]>;
  correct: Record<string, string>;
};

export type QuizRun = {
  runId: string;
  unitId: string;
  seed: number;
  questions: Question[];
};

export type Answer = {
  questionId: string;
  // For MCQ, `choice` is the selected choice.
  // For structured questions, still set `choice` to a stable summary.
  choice: string;
  payload?: unknown;
};

export type GradeResult = {
  total: number;
  correct: number;
  score: number; // 0..100
  details: Array<{ questionId: string; isCorrect: boolean }>;
};
