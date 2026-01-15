import { createRng } from "@/domain/rng";
import type { ContentSchemaV1, Poem, Passage } from "@/domain/content/types";
import type { BossMcqQuestion, BossRun } from "@/domain/boss/types";

export type GenerateBossRunOptions = {
  unitId: string;
  seed: number;
  runId: string;
  questionCount: number; // Boss固定 6
};

export function generateBossRun(content: ContentSchemaV1, options: GenerateBossRunOptions): BossRun {
  const unit = content.units.find((u) => u.unitId === options.unitId);
  if (!unit) throw new Error(`Unknown unitId: ${options.unitId}`);

  const rng = createRng(options.seed);

  const poems: Poem[] = unit.sections.flatMap((s) => {
    if (s.type !== "poem") return [];
    return s.poems;
  });

  const passages: Passage[] = unit.sections.flatMap((s) => {
    if (s.type !== "reading_comprehension") return [];
    return s.passages;
  });

  const questions: BossMcqQuestion[] = [];

  // Prefer a split: 3 poem + 3 reading. Fall back if insufficient.
  const poemCount = Math.min(3, options.questionCount);
  const readingCount = Math.min(3, options.questionCount - poemCount);

  for (let i = 0; i < poemCount; i += 1) {
    if (poems.length === 0) break;
    const poem = poems[rng.nextInt(poems.length)]!;
    questions.push(buildPoemBlank(poem, rng, `${options.runId}:poem:${i + 1}`));
  }

  const readingQuestions = passages.flatMap((p) =>
    p.questions.map((q) => ({ passage: p, question: q })),
  );

  const shuffledReading = rng.shuffle(readingQuestions);

  for (let i = 0; i < readingCount; i += 1) {
    const item = shuffledReading[i];
    if (!item) break;

    if (item.question.kind === "mcq") {
      questions.push({
        questionId: `${options.runId}:read:${i + 1}`,
        type: "boss_reading_mcq",
        prompt: item.question.prompt,
        choices: rng.shuffle([...item.question.choices]),
        correctChoice: item.question.correctChoice,
        meta: { title: item.passage.title, source: "reading" },
      });
    } else {
      questions.push({
        questionId: `${options.runId}:read:${i + 1}`,
        type: "boss_reading_tf",
        prompt: item.question.prompt,
        choices: ["对", "错"],
        correctChoice: item.question.answer ? "对" : "错",
        meta: { title: item.passage.title, source: "reading" },
      });
    }
  }

  // Fill remaining with poems if needed.
  while (questions.length < options.questionCount && poems.length > 0) {
    const poem = poems[rng.nextInt(poems.length)]!;
    questions.push(
      buildPoemBlank(poem, rng, `${options.runId}:poem:${questions.length + 1}`),
    );
  }

  const finalQuestions = rng.shuffle(questions)
    .slice(0, options.questionCount)
    .map((q, index) => ({ ...q, questionId: `${options.runId}:${index + 1}` }));

  return {
    runId: options.runId,
    unitId: options.unitId,
    seed: options.seed,
    questions: finalQuestions,
  };
}

function buildPoemBlank(poem: Poem, rng: ReturnType<typeof createRng>, id: string): BossMcqQuestion {
  const lines = poem.lines.filter((l) => l.trim().length > 0);
  if (lines.length === 0) throw new Error("Poem has no lines");

  const line = lines[rng.nextInt(lines.length)]!;
  const chars = Array.from(line);

  const candidateIndexes = chars
    .map((c, idx) => ({ c, idx }))
    .filter(({ c }) => c.trim().length > 0 && !isPunctuation(c));

  if (candidateIndexes.length === 0) throw new Error("Poem line has no blankable chars");

  const picked = candidateIndexes[rng.nextInt(candidateIndexes.length)]!;
  const correctChar = picked.c;

  const blanked = chars.map((c, idx) => (idx === picked.idx ? "__" : c)).join("");

  const distractorPool = Array.from(new Set(
    lines.flatMap((l) => Array.from(l)).filter((c) => c.trim().length > 0 && !isPunctuation(c)),
  )).filter((c) => c !== correctChar);

  const choices = new Set<string>();
  choices.add(correctChar);
  while (choices.size < Math.min(4, distractorPool.length + 1)) {
    choices.add(distractorPool[rng.nextInt(distractorPool.length)]!);
  }

  return {
    questionId: id,
    type: "boss_poem_blank",
    prompt: `古诗填空：${poem.title}（${poem.author}）\n${blanked}`,
    choices: rng.shuffle(Array.from(choices)),
    correctChoice: correctChar,
    meta: { title: poem.title, author: poem.author, source: "poem" },
  };
}

function isPunctuation(c: string): boolean {
  return /[，。！？、；：,.!?;:]/.test(c);
}
