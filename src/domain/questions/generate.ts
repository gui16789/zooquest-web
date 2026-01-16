import { createRng } from "@/domain/rng";
import type {
  ContentSchema,
  CharItem,
  PolyphoneItem,
  SynAntItem,
  SentencePattern,
  ConfusingWordsItem,
  ConfusingWordsItemV2,
  WordListSection,
  WordPatternsSection,
} from "@/domain/content/types";
import type {
  McqHanziByPinyinQuestion,
  McqPinyinQuestion,
  McqPolyphoneQuestion,
  McqSynonymAntonymQuestion,
  McqConfusingWordsQuestion,
  McqWordSpellingQuestion,
  McqWordPatternMatchQuestion,
  QuizRun,
  SentencePatternFillQuestion,
  Question,
} from "@/domain/questions/types";

export type GenerateRunOptions = {
  unitId: string;
  seed: number;
  runId: string;
  questionCount: number;
  choiceCount: number;
  // T1/T2/T3 mix for regular.
  mix?: {
    t1: number;
    t2: number;
    t3: number;
  };
  // For stage-based runs, keep order stable.
  shuffleQuestions?: boolean;
};

export function generateRun(content: ContentSchema, options: GenerateRunOptions): QuizRun {
  const unit = content.units.find((u) => u.unitId === options.unitId);
  if (!unit) throw new Error(`Unknown unitId: ${options.unitId}`);

  const rng = createRng(options.seed);



  const charItems: CharItem[] = unit.sections.flatMap((s) => {
    if (s.type !== "char_table") return [];
    return s.items;
  });

  const polyphones: PolyphoneItem[] = unit.sections.flatMap((s) => {
    if (s.type !== "word_disambiguation") return [];
    return s.items.flatMap((it) => (it.kind === "polyphone" ? [it] : []));
  });

  const synAnt: SynAntItem[] = unit.sections.flatMap((s) => {
    if (s.type !== "word_disambiguation") return [];
    return s.items.flatMap((it) => (it.kind === "syn_ant" ? [it] : []));
  });

  const confusing: Array<ConfusingWordsItem | ConfusingWordsItemV2> = unit.sections.flatMap((s) => {
    if (s.type !== "word_disambiguation") return [];
    return s.items.flatMap((it) => (it.kind === "confusing" ? [it] : []));
  });

  const wordList = unit.sections.flatMap((s) => {
    if (s.type !== "word_list") return [];
    return (s as WordListSection).items;
  });

  const wordPatterns = unit.sections.flatMap((s) => {
    if (s.type !== "word_patterns") return [];
    return (s as WordPatternsSection).patterns;
  });

  const patterns: SentencePattern[] = unit.sections.flatMap((s) => {
    if (s.type !== "sentence_pattern") return [];
    return s.patterns;
  });

  const mix = options.mix ?? { t1: 5, t2: 2, t3: 3 };
  const total = mix.t1 + mix.t2 + mix.t3;
  if (total !== options.questionCount) {
    throw new Error(`mix total ${total} must equal questionCount ${options.questionCount}`);
  }

  if (charItems.length < mix.t1) {
    throw new Error(`Not enough char items: have ${charItems.length}, need ${mix.t1}`);
  }
  if (patterns.length === 0 && mix.t3 > 0) {
    throw new Error("No sentence patterns available for T3");
  }

  const questions: Question[] = [];

  // T1: half "hanzi->pinyin" and half "pinyin->hanzi".
  const t1Items = rng.shuffle(charItems).slice(0, mix.t1);
  for (let i = 0; i < t1Items.length; i += 1) {
    const item = t1Items[i]!;

    if (i % 2 === 0) {
      questions.push(buildMcqPinyin(item, options, rng, charItems, questions.length));
    } else {
      questions.push(buildMcqHanziByPinyin(item, options, rng, charItems, questions.length));
    }
  }

  // T2: disambiguation + spelling + word patterns.
  const t2Pool = rng.shuffle([
    ...polyphones.map((p) => ({ kind: "poly" as const, item: p })),
    ...synAnt.map((s) => ({ kind: "syn" as const, item: s })),
    ...confusing.map((c) => ({ kind: "confusing" as const, item: c })),
    ...wordList.map((w) => ({ kind: "word_list" as const, item: w })),
    ...wordPatterns.map((p) => ({ kind: "word_patterns" as const, item: p })),
  ]);

  if (mix.t2 > 0 && t2Pool.length === 0) {
    throw new Error("No T2 items available for disambiguation/spelling/patterns");
  }

  const wordCandidates = buildWordCandidates(charItems, synAnt);

  for (let i = 0; i < mix.t2; i += 1) {
    const picked = t2Pool[i % t2Pool.length];
    if (!picked) break;

    switch (picked.kind) {
      case "poly":
        questions.push(buildMcqPolyphone(picked.item, options, rng, questions.length));
        break;
      case "syn":
        questions.push(buildMcqSynAnt(picked.item, wordCandidates, rng, questions.length));
        break;
      case "confusing":
        questions.push(
          buildMcqConfusing(
            picked.item,
            wordList.map((w) => w.word).filter((w) => w !== picked.item.correct),
            options.choiceCount,
            rng,
            questions.length,
          ),
        );
        break;
      case "word_list":
        questions.push(buildMcqWordSpelling(picked.item, wordList, options.choiceCount, rng, questions.length));
        break;
      case "word_patterns":
        questions.push(
          buildMcqWordPatternMatch(picked.item, wordPatterns, options.choiceCount, rng, questions.length),
        );
        break;
    }
  }

  // T3: sentence patterns.
  for (let i = 0; i < mix.t3; i += 1) {
    const pattern = patterns[rng.nextInt(patterns.length)]!;
    questions.push(buildSentencePatternFill(pattern, rng, questions.length));
  }

  const ordered = options.shuffleQuestions === false ? questions : rng.shuffle(questions);

  // Reassign questionIds to match final order.
  const normalized = ordered.map((q, index) => ({
    ...q,
    questionId: `${options.runId}:${index + 1}`,
  }));

  return {
    runId: options.runId,
    unitId: options.unitId,
    seed: options.seed,
    questions: normalized,
  };
}

function buildMcqPinyin(
  item: CharItem,
  options: GenerateRunOptions,
  rng: ReturnType<typeof createRng>,
  allChars: CharItem[],
  index: number,
): McqPinyinQuestion {
  const correct = item.pinyin;
  const distractors = pickPinyinDistractors(allChars, item, options.choiceCount - 1, rng);
  const choices = rng.shuffle([correct, ...distractors]);

  return {
    questionId: `${options.runId}:${index + 1}`,
    type: "mcq_pinyin",
    prompt: `“${item.hanzi}”的拼音是？`,
    knowledgeRefs: [`kp_char:${item.hanzi}`],
    hanzi: item.hanzi,
    choices,
    correctChoice: correct,
  };
}

function buildMcqHanziByPinyin(
  item: CharItem,
  options: GenerateRunOptions,
  rng: ReturnType<typeof createRng>,
  allChars: CharItem[],
  index: number,
): McqHanziByPinyinQuestion {
  const correct = item.hanzi;
  const distractors = pickHanziDistractors(allChars, item, options.choiceCount - 1, rng);
  const choices = rng.shuffle([correct, ...distractors]);

  return {
    questionId: `${options.runId}:${index + 1}`,
    type: "mcq_hanzi_by_pinyin",
    prompt: `拼音“${item.pinyin}”对应的汉字是？`,
    knowledgeRefs: [`kp_char:${item.hanzi}`],
    pinyin: item.pinyin,
    choices,
    correctChoice: correct,
  };
}

function stripParenHints(input: string): string {
  return input.replace(/\([^)]*\)/g, "").replace(/（[^）]*）/g, "");
}

function buildMcqPolyphone(
  item: PolyphoneItem,
  options: GenerateRunOptions,
  rng: ReturnType<typeof createRng>,
  index: number,
): McqPolyphoneQuestion {
  if (item.options.length < 2) throw new Error("Invalid polyphone item");

  const picked = item.options[rng.nextInt(item.options.length)]!;
  const correct = picked.pinyin;
  const example = picked.example;
  const choices = rng.shuffle(item.options.map((o) => o.pinyin));

  const sentence = (picked as { sentence?: string }).sentence;
  const context = sentence ? stripParenHints(sentence).trim() : null;

  const prompt = context
    ? `在句子“${context}”里，“${item.hanzi}”读音是？`
    : `“${example}”里的“${item.hanzi}”读音是？`;

  return {
    questionId: `${options.runId}:${index + 1}`,
    type: "mcq_polyphone",
    prompt,
    knowledgeRefs: [`kp_poly:${item.hanzi}:${correct}:${example}`],
    hanzi: item.hanzi,
    example,
    choices,
    correctChoice: correct,
  };
}

function buildMcqSynAnt(
  item: SynAntItem,
  wordCandidates: string[],
  rng: ReturnType<typeof createRng>,
  index: number,
): McqSynonymAntonymQuestion {
  const correct = item.synonym ?? item.antonym;
  if (!correct) throw new Error("Invalid syn_ant item");

  const prompt = item.synonym
    ? `“${item.word}”的近义词是？`
    : `“${item.word}”的反义词是？`;

  const picked = new Set<string>();
  picked.add(correct);

  // Prefer the paired antonym/synonym as a distractor when available.
  const paired = item.synonym ? item.antonym : item.synonym;
  if (paired && paired !== correct) picked.add(paired);

  while (picked.size < 4 && wordCandidates.length > 0) {
    const c = wordCandidates[rng.nextInt(wordCandidates.length)]!;
    if (c !== correct && c !== item.word) picked.add(c);
  }

  const choices = rng.shuffle(Array.from(picked));

  const knowledgeRefs: McqSynonymAntonymQuestion["knowledgeRefs"] = item.synonym
    ? [`kp_syn:${item.word}~${item.synonym}`, `kp_word:${item.word}`]
    : [`kp_ant:${item.word}!${item.antonym ?? correct}`, `kp_word:${item.word}`];

  return {
    questionId: `syn:${index + 1}`,
    type: "mcq_syn_ant",
    prompt,
    knowledgeRefs,
    choices,
    correctChoice: correct,
  };
}

function buildWordCandidates(chars: CharItem[], synAnt: SynAntItem[]): string[] {
  const words = new Set<string>();

  for (const s of synAnt) {
    words.add(s.word);
    if (s.synonym) words.add(s.synonym);
    if (s.antonym) words.add(s.antonym);
  }

  for (const c of chars) {
    for (const w of c.words) words.add(w);
  }

  return Array.from(words).filter((w) => w.length > 0);
}

function buildMcqConfusing(
  item: ConfusingWordsItem | ConfusingWordsItemV2,
  distractorPool: string[],
  choiceCount: number,
  rng: ReturnType<typeof createRng>,
  index: number,
): McqConfusingWordsQuestion {
  const picked = new Set<string>();
  picked.add(item.correct);
  for (const d of item.distractors) picked.add(d);

  while (picked.size < Math.min(choiceCount, distractorPool.length + 1) && distractorPool.length > 0) {
    picked.add(distractorPool[rng.nextInt(distractorPool.length)]!);
  }

  const choices = rng.shuffle(Array.from(picked));
  const rule = "rule" in item ? item.rule : undefined;
  const examples = "examples" in item ? item.examples : undefined;

  return {
    questionId: `conf:${index + 1}`,
    type: "mcq_confusing",
    prompt: item.prompt,
    knowledgeRefs: [`kp_confusing:${item.itemId}`],
    choices,
    correctChoice: item.correct,
    rule,
    examples,
  };
}

function buildMcqWordSpelling(
  item: WordListSection["items"][number],
  allWordList: WordListSection["items"],
  choiceCount: number,
  rng: ReturnType<typeof createRng>,
  index: number,
): McqWordSpellingQuestion {
  const correct = item.word;

  const pool = allWordList.map((w) => w.word).filter((w) => w !== correct);
  const uniqPool = Array.from(new Set(pool));

  const picked = new Set<string>();
  picked.add(correct);

  while (picked.size < Math.min(choiceCount, uniqPool.length + 1) && uniqPool.length > 0) {
    picked.add(uniqPool[rng.nextInt(uniqPool.length)]!);
  }

  const choices = rng.shuffle(Array.from(picked));

  return {
    questionId: `spell:${index + 1}`,
    type: "mcq_word_spelling",
    prompt: item.pinyin ? `拼音“${item.pinyin}”对应的词语是？` : "选出正确的词语：",
    knowledgeRefs: [`kp_word:${item.word}`],
    choices,
    correctChoice: correct,
    pinyin: item.pinyin,
  };
}

function buildMcqWordPatternMatch(
  pattern: WordPatternsSection["patterns"][number],
  allPatterns: WordPatternsSection["patterns"],
  choiceCount: number,
  rng: ReturnType<typeof createRng>,
  index: number,
): McqWordPatternMatchQuestion {
  const correct = pattern.examples[rng.nextInt(pattern.examples.length)]!;

  const distractorPool = allPatterns
    .flatMap((p) => p.examples)
    .filter((w) => w.trim().length > 0 && w !== correct);
  const uniq = Array.from(new Set(distractorPool));

  const picked = new Set<string>();
  picked.add(correct);

  while (picked.size < Math.min(choiceCount, uniq.length + 1) && uniq.length > 0) {
    picked.add(uniq[rng.nextInt(uniq.length)]!);
  }

  const choices = rng.shuffle(Array.from(picked));

  return {
    questionId: `wp:${index + 1}`,
    type: "mcq_word_pattern_match",
    prompt: `下面哪个词语属于“${pattern.patternType}”结构？`,
    knowledgeRefs: [`kp_word_pattern:${pattern.patternId}`, `kp_word_pattern_type:${pattern.patternType}`],
    patternType: pattern.patternType,
    choices,
    correctChoice: correct,
  };
}

function buildSentencePatternFill(
  pattern: SentencePattern,
  rng: ReturnType<typeof createRng>,
  index: number,
): SentencePatternFillQuestion {
  const correct: Record<string, string> = {};
  const wordBank: Record<string, string[]> = {};

  for (const slot of pattern.slots) {
    const bank = pattern.wordBank[slot.key] ?? [];
    if (bank.length === 0) throw new Error(`Empty wordBank for slot ${slot.key}`);

    const picked = bank[rng.nextInt(bank.length)]!;
    correct[slot.key] = picked;

    // Word bank shown to user: include correct + a few distractors from same bank.
    const candidates = new Set<string>();
    candidates.add(picked);
    while (candidates.size < Math.min(4, bank.length)) {
      candidates.add(bank[rng.nextInt(bank.length)]!);
    }
    wordBank[slot.key] = rng.shuffle(Array.from(candidates));
  }

  return {
    questionId: `pattern:${index + 1}`,
    type: "sentence_pattern_fill",
    prompt: `用句型“${pattern.name}”完成句子：`,
    knowledgeRefs: [`kp_sentence_pattern:${pattern.patternId}`, `kp_pattern_name:${pattern.name}`],
    template: pattern.template,
    slots: pattern.slots,
    wordBank,
    correct,
  };
}

function pickPinyinDistractors(
  all: CharItem[],
  target: CharItem,
  count: number,
  rng: { nextInt(maxExclusive: number): number },
): string[] {
  const pool = all.map((i) => i.pinyin).filter((p) => p !== target.pinyin);

  const uniq = Array.from(new Set(pool));
  if (uniq.length < count) {
    return uniq.slice(0, count);
  }

  const picked = new Set<string>();
  while (picked.size < count) {
    picked.add(uniq[rng.nextInt(uniq.length)]!);
  }
  return Array.from(picked);
}

function pickHanziDistractors(
  all: CharItem[],
  target: CharItem,
  count: number,
  rng: { nextInt(maxExclusive: number): number },
): string[] {
  const pool = all.map((i) => i.hanzi).filter((h) => h !== target.hanzi);

  const uniq = Array.from(new Set(pool));
  if (uniq.length < count) {
    return uniq.slice(0, count);
  }

  const picked = new Set<string>();
  while (picked.size < count) {
    picked.add(uniq[rng.nextInt(uniq.length)]!);
  }
  return Array.from(picked);
}

