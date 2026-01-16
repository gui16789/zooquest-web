export type Question =
  | McqPinyinQuestion
  | McqHanziByPinyinQuestion
  | McqPolyphoneQuestion
  | McqSynonymAntonymQuestion
  | McqConfusingWordsQuestion
  | McqWordSpellingQuestion
  | McqWordPatternMatchQuestion
  | SentencePatternFillQuestion;

export type KnowledgeRef = string;

export type McqPinyinQuestion = {
  questionId: string;
  type: "mcq_pinyin";
  prompt: string;
  // Up to 2 knowledge points this question covers.
  knowledgeRefs: [KnowledgeRef] | [KnowledgeRef, KnowledgeRef];
  hanzi: string;
  choices: string[];
  correctChoice: string;
};

export type McqHanziByPinyinQuestion = {
  questionId: string;
  type: "mcq_hanzi_by_pinyin";
  prompt: string;
  knowledgeRefs: [KnowledgeRef] | [KnowledgeRef, KnowledgeRef];
  pinyin: string;
  choices: string[];
  correctChoice: string; // hanzi
};

export type McqPolyphoneQuestion = {
  questionId: string;
  type: "mcq_polyphone";
  prompt: string;
  knowledgeRefs: [KnowledgeRef] | [KnowledgeRef, KnowledgeRef];
  hanzi: string;
  example: string;
  choices: string[];
  correctChoice: string; // pinyin
};

export type McqSynonymAntonymQuestion = {
  questionId: string;
  type: "mcq_syn_ant";
  prompt: string;
  knowledgeRefs: [KnowledgeRef] | [KnowledgeRef, KnowledgeRef];
  choices: string[];
  correctChoice: string;
};

export type McqConfusingWordsQuestion = {
  questionId: string;
  type: "mcq_confusing";
  prompt: string;
  knowledgeRefs: [KnowledgeRef] | [KnowledgeRef, KnowledgeRef];
  choices: string[];
  correctChoice: string;
  rule?: string;
  examples?: string[];
};

export type McqWordSpellingQuestion = {
  questionId: string;
  type: "mcq_word_spelling";
  prompt: string;
  knowledgeRefs: [KnowledgeRef] | [KnowledgeRef, KnowledgeRef];
  choices: string[];
  correctChoice: string;
  pinyin?: string;
};

export type McqWordPatternMatchQuestion = {
  questionId: string;
  type: "mcq_word_pattern_match";
  prompt: string;
  knowledgeRefs: [KnowledgeRef] | [KnowledgeRef, KnowledgeRef];
  patternType: string;
  choices: string[];
  correctChoice: string;
};

export type SentencePatternFillQuestion = {
  questionId: string;
  type: "sentence_pattern_fill";
  prompt: string;
  knowledgeRefs: [KnowledgeRef] | [KnowledgeRef, KnowledgeRef];
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
