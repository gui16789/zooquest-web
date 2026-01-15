import type { BossAnswer, BossGradeResult, BossMcqQuestion } from "@/domain/boss/types";

export function gradeBossRun(questions: BossMcqQuestion[], answers: BossAnswer[]): BossGradeResult {
  const byId = new Map(answers.map((a) => [a.questionId, a.choice]));
  let correct = 0;

  for (const q of questions) {
    const choice = byId.get(q.questionId);
    if (choice != null && choice === q.correctChoice) correct += 1;
  }

  const total = questions.length;
  const score = total === 0 ? 0 : Math.round((correct / total) * 100);
  return { total, correct, score };
}
