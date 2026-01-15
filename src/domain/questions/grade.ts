import type { Answer, GradeResult, Question } from "@/domain/questions/types";

export function gradeRun(questions: Question[], answers: Answer[]): GradeResult {
  const answerById = new Map(answers.map((a) => [a.questionId, a.choice]));
  const details = questions.map((q) => {
    const choice = answerById.get(q.questionId);
    const isCorrect = choice != null && choice === q.correctChoice;
    return { questionId: q.questionId, isCorrect };
  });

  const correct = details.filter((d) => d.isCorrect).length;
  const total = questions.length;
  const score = total === 0 ? 0 : Math.round((correct / total) * 100);

  return { total, correct, score, details };
}
