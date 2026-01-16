import crypto from "node:crypto";

import { z } from "zod";

import { jsonError, jsonOk } from "@/lib/api";
import { getAuthedUser } from "@/infra/auth/session";
import { getSupabaseAdmin } from "@/infra/supabaseAdmin";
import { getContent } from "@/infra/content/localContent";
import { generateRun } from "@/domain/questions/generate";

const bodySchema = z.object({
  unitId: z.string().regex(/^u[1-8]$/),
});

export async function POST(req: Request) {
  const user = await getAuthedUser();
  if (!user) return jsonError("UNAUTHORIZED", 401);

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("INVALID_INPUT", 400);

  const runId = crypto.randomUUID();
  const seed = crypto.randomInt(1, 2 ** 31 - 1);

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("quiz_runs").insert({
    id: runId,
    kid_user_id: user.kidUserId,
    unit_id: parsed.data.unitId,
    seed,
    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  });

  if (error) return jsonError(`DB_ERROR:${error.message}`, 500);

  const run = generateRun(getContent(), {
    unitId: parsed.data.unitId,
    seed,
    runId,
    questionCount: 5,
    choiceCount: 4,
    mix: { t1: 2, t2: 2, t3: 1 },
    shuffleQuestions: false,
  });

  return jsonOk({
    runId: run.runId,
    unitId: run.unitId,
    seed: run.seed,
    questions: run.questions.map((q) => {
      switch (q.type) {
        case "mcq_pinyin":
          return {
            questionId: q.questionId,
            type: q.type,
            prompt: q.prompt,
            knowledgeRefs: q.knowledgeRefs,
            hanzi: q.hanzi,
            choices: q.choices,
          };
        case "mcq_hanzi_by_pinyin":
          return {
            questionId: q.questionId,
            type: q.type,
            prompt: q.prompt,
            knowledgeRefs: q.knowledgeRefs,
            pinyin: q.pinyin,
            choices: q.choices,
          };
        case "mcq_polyphone":
          return {
            questionId: q.questionId,
            type: q.type,
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
            prompt: q.prompt,
            knowledgeRefs: q.knowledgeRefs,
            choices: q.choices,
          };
        case "sentence_pattern_fill":
          return {
            questionId: q.questionId,
            type: q.type,
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
