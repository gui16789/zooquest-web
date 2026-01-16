import crypto from "node:crypto";

import { z } from "zod";

import { jsonError, jsonOk } from "@/lib/api";
import { getAuthedUser } from "@/infra/auth/session";
import { getSupabaseAdmin } from "@/infra/supabaseAdmin";
import { getContent } from "@/infra/content/localContent";
import { generateRun } from "@/domain/questions/generate";

type SceneId = "s1" | "s2" | "s3";

const bodySchema = z.object({
  unitId: z.string().regex(/^u[1-8]$/),
  sceneId: z.enum(["s1", "s2", "s3"]),
});

const SCENE_META: Record<SceneId, { title: string; clueId: string; clueName: string; tasks: string[] }> = {
  s1: {
    title: "案发现场·泥地脚印",
    clueId: "clue_1_mud_footprints",
    clueName: "泥地脚印卡",
    tasks: ["识别脚印标签", "找出对应证物", "修复证物袋标签", "证物分类", "写进案件记录"],
  },
  s2: {
    title: "雨林区·排水管追踪",
    clueId: "clue_2_drain_route",
    clueName: "水迹路线图",
    tasks: ["读懂监控词条", "追踪路线标牌", "修复对讲机拼写", "选择正确搭配", "路线合成"],
  },
  s3: {
    title: "闪电窗口·证词核对",
    clueId: "clue_3_testimony",
    clueName: "证词对照表",
    tasks: ["证词关键词识别", "关键词拼写校验", "证词用词更准确", "证词前后是否一致", "结案陈词"],
  },
};

function sceneAccepts(sceneId: SceneId, run: { questions: Array<{ type: string }> }): boolean {
  // Our regular run generator outputs: [T1, T1, T2, T2, T3] with shuffleQuestions=false.
  const q2 = run.questions[2];
  const q3 = run.questions[3];
  const q4 = run.questions[4];

  if (!q2 || !q3 || !q4) return false;

  // Always require the last task to be sentence assembly.
  if (q4.type !== "sentence_pattern_fill") return false;

  switch (sceneId) {
    case "s1":
      // Prefer spelling as the first T2 task.
      return q2.type === "mcq_word_spelling";
    case "s2":
      // Ensure polyphone-context appears in this scene.
      return q2.type === "mcq_polyphone" || q3.type === "mcq_polyphone";
    case "s3":
      // Ensure confusing/syn-ant appears in this scene.
      return (
        q2.type === "mcq_confusing" ||
        q3.type === "mcq_confusing" ||
        q2.type === "mcq_syn_ant" ||
        q3.type === "mcq_syn_ant"
      );
  }
}

export async function POST(req: Request) {
  const user = await getAuthedUser();
  if (!user) return jsonError("UNAUTHORIZED", 401);

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("INVALID_INPUT", 400);

  const { unitId, sceneId } = parsed.data;
  const meta = SCENE_META[sceneId];

  const runId = crypto.randomUUID();
  const content = getContent();

  // Try multiple seeds to get the desired T2 shape per scene.
  let seed = crypto.randomInt(1, 2 ** 31 - 1);
  let run = generateRun(content, {
    unitId,
    seed,
    runId,
    questionCount: 5,
    choiceCount: 4,
    mix: { t1: 2, t2: 2, t3: 1 },
    shuffleQuestions: false,
  });

  for (let i = 0; i < 50; i += 1) {
    if (sceneAccepts(sceneId, run)) break;

    seed = crypto.randomInt(1, 2 ** 31 - 1);
    run = generateRun(content, {
      unitId,
      seed,
      runId,
      questionCount: 5,
      choiceCount: 4,
      mix: { t1: 2, t2: 2, t3: 1 },
      shuffleQuestions: false,
    });
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("quiz_runs").insert({
    id: runId,
    kid_user_id: user.kidUserId,
    unit_id: unitId,
    seed,
    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  });

  if (error) return jsonError(`DB_ERROR:${error.message}`, 500);

  return jsonOk({
    story: {
      storyId: `case_${unitId}`,
      caseId: `case_${unitId}:${runId}`,
      sceneId,
      sceneTitle: meta.title,
      clue: { id: meta.clueId, name: meta.clueName },
      tasks: meta.tasks.map((label, index) => ({ index, label })),
    },
    runId: run.runId,
    unitId: run.unitId,
    seed: run.seed,
    questions: run.questions.map((q, index) => {
      const taskLabel = meta.tasks[index] ?? "任务";
      switch (q.type) {
        case "mcq_pinyin":
          return {
            questionId: q.questionId,
            type: q.type,
            taskLabel,
            prompt: q.prompt,
            knowledgeRefs: q.knowledgeRefs,
            hanzi: q.hanzi,
            choices: q.choices,
          };
        case "mcq_hanzi_by_pinyin":
          return {
            questionId: q.questionId,
            type: q.type,
            taskLabel,
            prompt: q.prompt,
            knowledgeRefs: q.knowledgeRefs,
            pinyin: q.pinyin,
            choices: q.choices,
          };
        case "mcq_polyphone":
          return {
            questionId: q.questionId,
            type: q.type,
            taskLabel,
            prompt: q.prompt,
            knowledgeRefs: q.knowledgeRefs,
            hanzi: q.hanzi,
            example: q.example,
            choices: q.choices,
          };
        case "mcq_syn_ant":
          return {
            questionId: q.questionId,
            type: q.type,
            taskLabel,
            prompt: q.prompt,
            knowledgeRefs: q.knowledgeRefs,
            choices: q.choices,
          };
        case "mcq_confusing":
          return {
            questionId: q.questionId,
            type: q.type,
            taskLabel,
            prompt: q.prompt,
            knowledgeRefs: q.knowledgeRefs,
            choices: q.choices,
            rule: q.rule,
            examples: q.examples,
          };
        case "mcq_word_spelling":
          return {
            questionId: q.questionId,
            type: q.type,
            taskLabel,
            prompt: q.prompt,
            knowledgeRefs: q.knowledgeRefs,
            choices: q.choices,
            pinyin: q.pinyin,
          };
        case "mcq_word_pattern_match":
          return {
            questionId: q.questionId,
            type: q.type,
            taskLabel,
            prompt: q.prompt,
            knowledgeRefs: q.knowledgeRefs,
            patternType: q.patternType,
            choices: q.choices,
          };
        case "sentence_pattern_fill":
          return {
            questionId: q.questionId,
            type: q.type,
            taskLabel,
            prompt: q.prompt,
            knowledgeRefs: q.knowledgeRefs,
            template: q.template,
            slots: q.slots,
            wordBank: q.wordBank,
          };
      }
    }),
  });
}
