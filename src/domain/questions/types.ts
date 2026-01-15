export type Question = McqPinyinQuestion;

export type McqPinyinQuestion = {
  questionId: string;
  type: "mcq_pinyin";
  prompt: string;
  hanzi: string;
  choices: string[];
  correctChoice: string;
};

export type QuizRun = {
  runId: string;
  unitId: string;
  seed: number;
  questions: Question[];
};

export type Answer = {
  questionId: string;
  choice: string;
};

export type GradeResult = {
  total: number;
  correct: number;
  score: number; // 0..100
  details: Array<{ questionId: string; isCorrect: boolean }>;
};
