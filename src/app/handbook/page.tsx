import { redirect } from "next/navigation";

import { HandbookView } from "@/components/handbook/HandbookView";
import type {
  CharTableSection,
  ConfusingWordsItem,
  ConfusingWordsItemV2,
  ContentSchema,
  PolyphoneItem,
  PolyphoneItemV2,
  SynAntItem,
  WordDisambiguationSection,
  WordDisambiguationSectionV2,
} from "@/domain/content/types";
import { scoreToStars } from "@/domain/scoring/stars";
import { getAuthedUser } from "@/infra/auth/session";
import { getContent } from "@/infra/content/localContent";
import { getSupabaseAdmin } from "@/infra/supabaseAdmin";

type ProgressRow = {
  level_id: string;
  best_score: number;
  attempts: number;
};

type ClueCard = {
  id: string;
  unitId: string;
  title: string;
  subtitle: string;
  hint: string;
  found: boolean;
};

type ArchiveCard = {
  id: string;
  title: string;
  subtitle: string;
  meaning: string;
  example: string;
  learned: boolean;
  accent: "blue" | "orange" | "purple";
};

function buildClueCards(content: ContentSchema, progress: ProgressRow[]): ClueCard[] {
  const attemptedUnits = new Set(progress.filter((p) => p.attempts > 0).map((p) => p.level_id));
  const cards: ClueCard[] = [];

  for (const unit of content.units) {
    const charSection = unit.sections.find((s): s is CharTableSection => s.type === "char_table");
    if (!charSection) continue;

    for (const item of charSection.items.slice(0, 3)) {
      cards.push({
        id: item.itemId,
        unitId: unit.unitId,
        title: item.hanzi,
        subtitle: item.pinyin,
        hint: item.words.length > 0 ? `词例：${item.words.slice(0, 2).join("、")}` : "词例待补充",
        found: attemptedUnits.has(unit.unitId),
      });
    }
  }

  return cards.slice(0, 6);
}

function formatArchiveCard(
  unitId: string,
  item: PolyphoneItem | PolyphoneItemV2 | SynAntItem | ConfusingWordsItem | ConfusingWordsItemV2,
  learned: boolean,
  index: number,
): ArchiveCard {
  if (item.kind === "syn_ant") {
    const meaning = item.synonym
      ? `近义关系：${item.word} ≈ ${item.synonym}`
      : `反义关系：${item.word} <> ${item.antonym ?? "待补充"}`;
    return {
      id: item.itemId,
      title: item.word,
      subtitle: `Unit ${unitId.toUpperCase()} · Syn/Ant`,
      meaning,
      example: "掌握词义关系，便于语境判断。",
      learned,
      accent: "blue",
    };
  }

  if (item.kind === "confusing") {
    return {
      id: item.itemId,
      title: item.correct,
      subtitle: `Unit ${unitId.toUpperCase()} · Confusing`,
      meaning: item.prompt,
      example:
        "rule" in item && item.rule
          ? item.rule
          : "先看句意，再选择最符合语境的词语。",
      learned,
      accent: "orange",
    };
  }

  const options = item.options.slice(0, 2).map((o) => `${o.example}(${o.pinyin})`).join("、");
  return {
    id: item.itemId,
    title: item.hanzi,
    subtitle: `Unit ${unitId.toUpperCase()} · Polyphone`,
    meaning: `多音字辨析：${options || "待补充"}`,
    example: "结合上下文判断读音，避免机械记忆。",
    learned,
    accent: index % 2 === 0 ? "purple" : "blue",
  };
}

function buildArchiveCards(content: ContentSchema, progress: ProgressRow[]): ArchiveCard[] {
  const attemptedUnits = new Set(progress.filter((p) => p.attempts > 0).map((p) => p.level_id));
  const cards: ArchiveCard[] = [];

  for (const unit of content.units) {
    const sec = unit.sections.find(
      (s): s is WordDisambiguationSection | WordDisambiguationSectionV2 =>
        s.type === "word_disambiguation",
    );
    if (!sec) continue;

    for (let i = 0; i < sec.items.length; i += 1) {
      const item = sec.items[i]!;
      cards.push(formatArchiveCard(unit.unitId, item, attemptedUnits.has(unit.unitId), i));
    }
  }

  if (cards.length === 0) {
    return [
      {
        id: "fallback-1",
        title: "词语档案待建立",
        subtitle: "Unit U1 · Pending",
        meaning: "当前内容库未找到可展示的辨析条目。",
        example: "后续补充 word_disambiguation 后将自动展示。",
        learned: false,
        accent: "purple",
      },
    ];
  }

  return cards.slice(0, 4);
}

export const dynamic = "force-dynamic";

export default async function HandbookPage() {
  const user = await getAuthedUser();
  if (!user) redirect("/");

  const supabase = getSupabaseAdmin();
  const { data: progressRows, error } = await supabase
    .from("level_progress")
    .select("level_id, best_score, attempts")
    .eq("kid_user_id", user.kidUserId);

  if (error) throw new Error(`HANDBOOK_PROGRESS_ERROR:${error.message}`);

  const progress: ProgressRow[] = (progressRows ?? []).map((row) => ({
    level_id: (row.level_id as string) ?? "",
    best_score: (row.best_score as number) ?? 0,
    attempts: (row.attempts as number) ?? 0,
  }));

  const content = getContent();
  const clueCards = buildClueCards(content, progress);
  const archiveCards = buildArchiveCards(content, progress);

  const highScore = progress.reduce((best, p) => Math.max(best, p.best_score), 0);
  const growthTitle =
    scoreToStars(highScore) >= 3
      ? "王牌探员"
      : scoreToStars(highScore) >= 2
        ? "正式探员"
        : "见习探员";

  return (
    <HandbookView
      nickname={user.nickname}
      growthTitle={growthTitle}
      clueCards={clueCards}
      archiveCards={archiveCards}
    />
  );
}
