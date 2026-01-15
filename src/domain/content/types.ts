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

export type Section = CharTableSection;

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
