export type ContentSchemaV1 = {
  schemaVersion: 1;
  subject: "chinese";
  grade: 2;
  term: "up";
  units: Unit[];
};

export type Unit = {
  unitId: string;
  title: string;
  sections: Section[];
};

export type Section =
  | CharTableSection
  | WordDisambiguationSection
  | SentencePatternSection
  | PoemSection
  | ReadingComprehensionSection;

export type CharTableSection = {
  sectionId: string;
  type: "char_table";
  title: string;
  items: CharItem[];
};

export type CharItem = {
  itemId: string;
  hanzi: string;
  pinyin: string;
  words: string[];
  source?: {
    doc: string;
    hint?: string;
  };
};

// T2 字词辨析（多音字 / 近反义词 / 易混词）
export type WordDisambiguationSection = {
  sectionId: string;
  type: "word_disambiguation";
  title: string;
  items: Array<PolyphoneItem | SynAntItem | ConfusingWordsItem>;
};

export type PolyphoneItem = {
  itemId: string;
  kind: "polyphone";
  hanzi: string; // e.g. 教
  options: Array<{ pinyin: string; example: string }>; // e.g. 教书 / 教室
};

export type SynAntItem = {
  itemId: string;
  kind: "syn_ant";
  word: string;
  synonym?: string;
  antonym?: string;
};

export type ConfusingWordsItem = {
  itemId: string;
  kind: "confusing";
  prompt: string;
  correct: string;
  distractors: string[];
};

// T3 句子仿写（模板 + 词库）
export type SentencePatternSection = {
  sectionId: string;
  type: "sentence_pattern";
  title: string;
  patterns: SentencePattern[];
};

export type SentencePattern = {
  patternId: string;
  name: string; // e.g. 一边…一边…
  template: string; // e.g. "{a}一边{v1}，一边{v2}。"
  slots: Array<{ key: string; label: string }>; // e.g. a/v1/v2
  wordBank: Record<string, string[]>; // per slot key
};

// T4 古诗背诵
export type PoemSection = {
  sectionId: string;
  type: "poem";
  title: string;
  poems: Poem[];
};

export type Poem = {
  poemId: string;
  title: string;
  author: string;
  lines: string[];
};

// T5 课文理解（选择/判断）
export type ReadingComprehensionSection = {
  sectionId: string;
  type: "reading_comprehension";
  title: string;
  passages: Passage[];
};

export type Passage = {
  passageId: string;
  title: string;
  text: string;
  questions: Array<ReadingMcq | ReadingTrueFalse>;
};

export type ReadingMcq = {
  questionId: string;
  kind: "mcq";
  prompt: string;
  choices: string[];
  correctChoice: string;
};

export type ReadingTrueFalse = {
  questionId: string;
  kind: "true_false";
  prompt: string;
  answer: boolean;
};
