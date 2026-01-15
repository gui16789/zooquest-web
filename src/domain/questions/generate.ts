import { createRng } from "@/domain/rng";
import type { ContentSchemaV1, CharItem } from "@/domain/content/types";
import type { McqPinyinQuestion, QuizRun } from "@/domain/questions/types";

export type GenerateRunOptions = {
  unitId: string;
  seed: number;
  runId: string;
  questionCount: number;
  choiceCount: number;
};

export function generateRun(
  content: ContentSchemaV1,
  options: GenerateRunOptions,
): QuizRun {
  const unit = content.units.find((u) => u.unitId === options.unitId);
  if (!unit) throw new Error(`Unknown unitId: ${options.unitId}`);

  const items: CharItem[] = unit.sections
    .filter((s) => s.type === "char_table")
    .flatMap((s) => s.items);

  if (items.length < options.questionCount) {
    throw new Error(
      `Not enough items for unit ${options.unitId}: have ${items.length}, need ${options.questionCount}`,
    );
  }

  const rng = createRng(options.seed);
  const sampled = rng.shuffle(items).slice(0, options.questionCount);

  const questions: McqPinyinQuestion[] = sampled.map((item, index) => {
    const correct = item.pinyin;
    const distractors = pickDistractors(items, item, options.choiceCount - 1, rng);
    const choices = rng.shuffle([correct, ...distractors]);

    return {
      questionId: `${options.runId}:${index + 1}`,
      type: "mcq_pinyin",
      prompt: `“${item.hanzi}”的拼音是？`,
      hanzi: item.hanzi,
      choices,
      correctChoice: correct,
    };
  });

  return {
    runId: options.runId,
    unitId: options.unitId,
    seed: options.seed,
    questions,
  };
}

function pickDistractors(
  all: CharItem[],
  target: CharItem,
  count: number,
  rng: { nextInt(maxExclusive: number): number },
): string[] {
  const pool = all
    .map((i) => i.pinyin)
    .filter((p) => p !== target.pinyin);

  const uniq = Array.from(new Set(pool));
  if (uniq.length < count) {
    return uniq.slice(0, count);
  }

  const picked = new Set<string>();
  while (picked.size < count) {
    picked.add(uniq[rng.nextInt(uniq.length)]);
  }
  return Array.from(picked);
}
