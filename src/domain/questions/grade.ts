import type { Answer, GradeResult, Question } from "@/domain/questions/types";

type StructuredAnswer = Answer & {
  // For non-MCQ questions, `payload` carries structured data.
  payload?: unknown;
};

export function gradeRun(questions: Question[], answers: Answer[]): GradeResult {
  const answerById = new Map((answers as StructuredAnswer[]).map((a) => [a.questionId, a]));

  const details = questions.map((q) => {
    const answer = answerById.get(q.questionId);

    if (!answer) return { questionId: q.questionId, isCorrect: false };

    switch (q.type) {
      case "mcq_pinyin":
      case "mcq_hanzi_by_pinyin":
      case "mcq_polyphone":
      case "mcq_syn_ant": {
        const isCorrect = answer.choice === q.correctChoice;
        return { questionId: q.questionId, isCorrect };
      }

      case "sentence_pattern_fill": {
        const payload = (answer as StructuredAnswer).payload;
        if (typeof payload !== "object" || payload === null) {
          return { questionId: q.questionId, isCorrect: false };
        }

        const filled = payload as Record<string, unknown>;
        const ok = q.slots.every((s) => filled[s.key] === q.correct[s.key]);
        return { questionId: q.questionId, isCorrect: ok };
      }
    }
  });

  const correct = details.filter((d) => d.isCorrect).length;
  const total = questions.length;
  const score = total === 0 ? 0 : Math.round((correct / total) * 100);

  return { total, correct, score, details };
}
