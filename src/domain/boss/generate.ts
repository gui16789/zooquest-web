import { createRng } from "@/domain/rng";
import type {
  CharItem,
  ConfusingWordsItem,
  ConfusingWordsItemV2,
  ContentSchema,
  Passage,
  Poem,
  PolyphoneItem,
  SentencePattern,
  WordListSection,
} from "@/domain/content/types";
import type { BossMcqQuestion, BossQuestion, BossRun, BossSentencePatternFillQuestion } from "@/domain/boss/types";

export type GenerateBossRunOptions = {
  unitId: string;
  seed: number;
  runId: string;
  questionCount: number; // Boss固定 6
};

export function generateBossRun(content: ContentSchema, options: GenerateBossRunOptions): BossRun {
  const unit = content.units.find((u) => u.unitId === options.unitId);
  if (!unit) throw new Error(`Unknown unitId: ${options.unitId}`);

  const rng = createRng(options.seed);

  const chars: CharItem[] = unit.sections.flatMap((s) => {
    if (s.type !== "char_table") return [];
    return s.items;
  });

  const wordList = unit.sections.flatMap((s) => {
    if (s.type !== "word_list") return [];
    return (s as WordListSection).items;
  });

  const polyphones: PolyphoneItem[] = unit.sections.flatMap((s) => {
    if (s.type !== "word_disambiguation") return [];
    return s.items.flatMap((it) => (it.kind === "polyphone" ? [it] : []));
  });

  const confusing: Array<ConfusingWordsItem | ConfusingWordsItemV2> = unit.sections.flatMap((s) => {
    if (s.type !== "word_disambiguation") return [];
    return s.items.flatMap((it) => (it.kind === "confusing" ? [it] : []));
  });

  const patterns: SentencePattern[] = unit.sections.flatMap((s) => {
    if (s.type !== "sentence_pattern") return [];
    return s.patterns;
  });

  const poems: Poem[] = unit.sections.flatMap((s) => {
    if (s.type !== "poem") return [];
    return s.poems;
  });

  const passages: Passage[] = unit.sections.flatMap((s) => {
    if (s.type !== "reading_comprehension") return [];
    return s.passages;
  });

  const questions: BossQuestion[] = [];

  // MVP: 3-phase battle (2 questions each)
  // minion1: quick (pinyin + spelling)
  // minion2: hard (polyphone + confusing)
  // boss: reading + synthesis (sentence pattern fill)

  if (options.unitId === "u1") {
    const pinyin = pickOne(chars, rng);
    questions.push(buildBossPinyin(pinyin, chars, rng, `${options.runId}:minion1:1`));

    const word = pickOne(wordList, rng);
    questions.push(buildBossWordSpelling(word, wordList, rng, `${options.runId}:minion1:2`));

    const poly = pickOne(polyphones, rng);
    questions.push(buildBossPolyphone(poly, rng, `${options.runId}:minion2:1`));

    const conf = pickOne(confusing, rng);
    questions.push(buildBossConfusing(conf, rng, `${options.runId}:minion2:2`));

    const reading = pickBossReading(passages, rng, `${options.runId}:boss:1`);
    if (reading) questions.push(reading);

    const pattern = pickOne(patterns, rng);
    questions.push(buildBossSentencePatternFill(pattern, rng, `${options.runId}:boss:2`));

    const finalQuestions = questions.slice(0, options.questionCount).map((q, index) => ({
      ...q,
      questionId: `${options.runId}:${index + 1}`,
    }));

    return {
      runId: options.runId,
      unitId: options.unitId,
      seed: options.seed,
      questions: finalQuestions,
    };
  }

  // Fallback for other units: 2 poem + 4 reading if possible.
  const fallback: BossMcqQuestion[] = [];

  for (let i = 0; i < Math.min(2, poems.length); i += 1) {
    const poem = poems[rng.nextInt(poems.length)]!;
    fallback.push(buildPoemBlank(poem, rng, `${options.runId}:poem:${i + 1}`, i < 1 ? "minion1" : "minion2"));
  }

  const readingQuestions = passages.flatMap((p) => p.questions.map((q) => ({ passage: p, question: q })));
  for (let i = 0; i < Math.min(4, readingQuestions.length); i += 1) {
    const item = rng.shuffle(readingQuestions)[i]!;
    fallback.push(buildBossReadingFromPassage(item.passage, item.question, rng, `${options.runId}:read:${i + 1}`));
  }

  const finalQuestions = rng.shuffle(fallback)
    .slice(0, options.questionCount)
    .map((q, index) => ({ ...q, questionId: `${options.runId}:${index + 1}` }));

  return {
    runId: options.runId,
    unitId: options.unitId,
    seed: options.seed,
    questions: finalQuestions,
  };
}

function pickOne<T>(items: T[], rng: ReturnType<typeof createRng>): T {
  if (items.length === 0) throw new Error("Empty pool");
  return items[rng.nextInt(items.length)]!;
}

function stripParenHints(input: string): string {
  return input.replace(/\([^)]*\)/g, "").replace(/（[^）]*）/g, "");
}

function buildBossPinyin(
  item: CharItem,
  allChars: CharItem[],
  rng: ReturnType<typeof createRng>,
  id: string,
): BossMcqQuestion {
  const correct = item.pinyin;
  const distractors = rng
    .shuffle(allChars.map((c) => c.pinyin).filter((p) => p !== correct))
    .slice(0, 3);

  return {
    questionId: id,
    phaseId: "minion1",
    type: "boss_pinyin",
    prompt: `证物搬运工：标签“${item.hanzi}”读音是？`,
    knowledgeRefs: [`kp_char:${item.hanzi}`],
    choices: rng.shuffle([correct, ...distractors]),
    correctChoice: correct,
    meta: { source: "minion", hanzi: item.hanzi },
  };
}

function buildBossWordSpelling(
  item: WordListSection["items"][number],
  allWords: WordListSection["items"],
  rng: ReturnType<typeof createRng>,
  id: string,
): BossMcqQuestion {
  const correct = item.word;
  const distractors = rng
    .shuffle(allWords.map((w) => w.word).filter((w) => w !== correct))
    .slice(0, 3);

  return {
    questionId: id,
    phaseId: "minion1",
    type: "boss_word_spelling",
    prompt: item.pinyin ? `证物搬运工：拼音“${item.pinyin}”对应的词语是？` : "证物搬运工：选出正确的词语：",
    knowledgeRefs: [`kp_word:${item.word}`],
    choices: rng.shuffle([correct, ...distractors]),
    correctChoice: correct,
    meta: { source: "minion", pinyin: item.pinyin },
  };
}

function buildBossPolyphone(item: PolyphoneItem, rng: ReturnType<typeof createRng>, id: string): BossMcqQuestion {
  if (item.options.length < 2) throw new Error("Invalid polyphone item");

  const picked = item.options[rng.nextInt(item.options.length)] as { pinyin: string; example: string; sentence?: string };
  const correct = picked.pinyin;
  const example = picked.example;
  const sentence = picked.sentence;

  const context = sentence ? stripParenHints(sentence).trim() : null;
  const prompt = context
    ? `伪证专家：在句子“${context}”里，“${item.hanzi}”读音是？`
    : `伪证专家：“${example}”里的“${item.hanzi}”读音是？`;

  return {
    questionId: id,
    phaseId: "minion2",
    type: "boss_polyphone",
    prompt,
    knowledgeRefs: [`kp_poly:${item.hanzi}:${correct}:${example}`],
    choices: rng.shuffle(item.options.map((o) => o.pinyin)),
    correctChoice: correct,
    meta: { source: "minion", hanzi: item.hanzi, example },
  };
}

function buildBossConfusing(
  item: ConfusingWordsItem | ConfusingWordsItemV2,
  rng: ReturnType<typeof createRng>,
  id: string,
): BossMcqQuestion {
  const choices = rng.shuffle([item.correct, ...item.distractors]);
  const rule = "rule" in item ? item.rule : undefined;
  const examples = "examples" in item ? item.examples : undefined;

  return {
    questionId: id,
    phaseId: "minion2",
    type: "boss_confusing",
    prompt: `伪证专家：${item.prompt}`,
    knowledgeRefs: [`kp_confusing:${item.itemId}`],
    choices,
    correctChoice: item.correct,
    meta: { source: "minion", rule, examples },
  };
}

function pickBossReading(passages: Passage[], rng: ReturnType<typeof createRng>, id: string): BossMcqQuestion | null {
  const readingQuestions = passages.flatMap((p) => p.questions.map((q) => ({ passage: p, question: q })));
  if (readingQuestions.length === 0) return null;

  const item = rng.shuffle(readingQuestions)[0]!;
  return buildBossReadingFromPassage(item.passage, item.question, rng, id, "boss");
}

function buildBossReadingFromPassage(
  passage: Passage,
  question: Passage["questions"][number],
  rng: ReturnType<typeof createRng>,
  id: string,
  phaseId: "minion1" | "minion2" | "boss" = "boss",
): BossMcqQuestion {
  if (question.kind === "mcq") {
    return {
      questionId: id,
      phaseId,
      type: "boss_reading_mcq",
      prompt: `幕后主使：${question.prompt}`,
      knowledgeRefs: [`kp_reading:${passage.passageId}:${question.questionId}`],
      choices: rng.shuffle([...question.choices]),
      correctChoice: question.correctChoice,
      meta: { title: passage.title, source: "reading", passageId: passage.passageId },
    };
  }

  return {
    questionId: id,
    phaseId,
    type: "boss_reading_tf",
    prompt: `幕后主使：${question.prompt}`,
    knowledgeRefs: [`kp_reading:${passage.passageId}:${question.questionId}`],
    choices: ["对", "错"],
    correctChoice: question.answer ? "对" : "错",
    meta: { title: passage.title, source: "reading", passageId: passage.passageId },
  };
}

function buildBossSentencePatternFill(
  pattern: SentencePattern,
  rng: ReturnType<typeof createRng>,
  id: string,
): BossSentencePatternFillQuestion {
  const correct: Record<string, string> = {};

  for (const slot of pattern.slots) {
    const options = pattern.wordBank[slot.key] ?? [];
    if (options.length === 0) throw new Error("Sentence pattern slot has no options");
    correct[slot.key] = options[rng.nextInt(options.length)]!;
  }

  return {
    questionId: id,
    phaseId: "boss",
    type: "boss_sentence_pattern_fill",
    prompt: `幕后主使：用句型“${pattern.name}”写出结案陈词：`,
    knowledgeRefs: [`kp_sentence_pattern:${pattern.patternId}`, `kp_pattern_name:${pattern.name}`],
    template: pattern.template,
    slots: pattern.slots,
    wordBank: pattern.wordBank,
    correct,
  };
}

function buildPoemBlank(
  poem: Poem,
  rng: ReturnType<typeof createRng>,
  id: string,
  phaseId: "minion1" | "minion2" | "boss" = "boss",
): BossMcqQuestion {
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

  const distractorPool = Array.from(
    new Set(lines.flatMap((l) => Array.from(l)).filter((c) => c.trim().length > 0 && !isPunctuation(c))),
  ).filter((c) => c !== correctChar);

  const choices = new Set<string>();
  choices.add(correctChar);
  while (choices.size < Math.min(4, distractorPool.length + 1)) {
    choices.add(distractorPool[rng.nextInt(distractorPool.length)]!);
  }

  return {
    questionId: id,
    phaseId,
    type: "boss_poem_blank",
    prompt: `古诗填空：${poem.title}（${poem.author}）\n${blanked}`,
    knowledgeRefs: [`kp_poem:${poem.poemId}`, `kp_poem_title:${poem.title}`],
    choices: rng.shuffle(Array.from(choices)),
    correctChoice: correctChar,
    meta: { title: poem.title, author: poem.author, source: "poem", poemId: poem.poemId },
  };
}

function isPunctuation(c: string): boolean {
  return /[，。！？、；：,.!?;:]/.test(c);
}
