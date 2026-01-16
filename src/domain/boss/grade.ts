import type { BossAnswer, BossGradeResult, BossQuestion } from "@/domain/boss/types";

export function gradeBossRun(questions: BossQuestion[], answers: BossAnswer[]): BossGradeResult {
  const byId = new Map(answers.map((a) => [a.questionId, a]));
  let correct = 0;

  for (const q of questions) {
    const answer = byId.get(q.questionId);
    if (!answer) continue;

    if (q.type === "boss_sentence_pattern_fill") {
      const payload = answer.payload;
      if (typeof payload !== "object" || payload === null) continue;

      const filled = payload as Record<string, unknown>;
      const isCorrect = Object.entries(q.correct).every(([k, v]) => filled[k] === v);
      if (isCorrect) correct += 1;
      continue;
    }

    if (answer.choice === q.correctChoice) correct += 1;
  }

  const total = questions.length;
  const score = total === 0 ? 0 : Math.round((correct / total) * 100);
  return { total, correct, score };
}
