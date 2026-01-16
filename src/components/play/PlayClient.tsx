"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";

type McqQuestionBase = {
  questionId: string;
  prompt: string;
  choices: string[];
};

type RunQuestion =
  | (McqQuestionBase & { type: "mcq_pinyin"; hanzi: string })
  | (McqQuestionBase & { type: "mcq_hanzi_by_pinyin"; pinyin: string })
  | (McqQuestionBase & { type: "mcq_polyphone"; hanzi: string; example: string })
  | (McqQuestionBase & { type: "mcq_syn_ant" })
  | {
      questionId: string;
      type: "sentence_pattern_fill";
      prompt: string;
      template: string;
      slots: Array<{ key: string; label: string }>;
      wordBank: Record<string, string[]>;
    };

type Run = {
  runId: string;
  unitId: string;
  seed: number;
  questions: RunQuestion[];
};

type AnswerState = {
  choice: string;
  payload?: unknown;
};

type Result = {
  score: number;
  stars: 0 | 1 | 2 | 3;
  passed: boolean;
  correct: number;
  total: number;
  newBadges: string[];
};

type CheckResponse =
  | {
      isCorrect: boolean;
      explanation: string;
      correct: { kind: "mcq"; choice: string };
    }
  | {
      isCorrect: boolean;
      explanation: string;
      correct: { kind: "sentence_pattern_fill"; payload: Record<string, string>; preview: string };
    };

type FeedbackState = {
  isCorrect: boolean;
  explanation: string;
  correctText?: string;
};

type ReviewItem = {
  questionId: string;
  prompt: string;
  yourAnswer: string;
  correctAnswer: string;
  explanation: string;
};

type StageCode = "A" | "B" | "C";

const STAGES: Array<{ code: StageCode; label: string; mission: string }> = [
  { code: "A", label: "投喂小蝌蚪", mission: "选对读音/汉字，帮小蝌蚪找线索。" },
  { code: "A", label: "投喂小蝌蚪", mission: "继续投喂！连对更快通关。" },
  { code: "B", label: "闪电抉择", mission: "看清语境，选出最合适的词/读音。" },
  { code: "B", label: "闪电抉择", mission: "再来一次抉择，稳住就赢。" },
  { code: "C", label: "尼克拼句", mission: "把词语拼成通顺句子。" },
];

function isAnswered(q: RunQuestion, a: AnswerState | undefined): boolean {
  if (!a) return false;

  if (q.type === "sentence_pattern_fill") {
    const payload = a.payload;
    if (typeof payload !== "object" || payload === null) return false;
    const filled = payload as Record<string, unknown>;
    return q.slots.every((s) => typeof filled[s.key] === "string" && (filled[s.key] as string).length > 0);
  }

  return typeof a.choice === "string" && a.choice.length > 0;
}

export function PlayClient(props: { unitId: string; onDone: () => void }) {
  const [run, setRun] = useState<Run | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [feedbackByQuestionId, setFeedbackByQuestionId] = useState<Record<string, FeedbackState>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [introIndex, setIntroIndex] = useState<number | null>(0);
  const [skipStageIntro, setSkipStageIntro] = useState(false);
  const [checking, setChecking] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const currentQuestion = run?.questions[currentIndex] ?? null;
  const currentAnswer = currentQuestion ? answers[currentQuestion.questionId] : undefined;
  const currentFeedback = currentQuestion ? feedbackByQuestionId[currentQuestion.questionId] : undefined;

  const stage = useMemo(() => {
    return STAGES[currentIndex] ?? STAGES[STAGES.length - 1];
  }, [currentIndex]);

  async function start() {
    setError(null);
    setResult(null);
    setAnswers({});
    setFeedbackByQuestionId({});
    setCurrentIndex(0);
    setIntroIndex(skipStageIntro ? null : 0);

    const res = await fetch("/api/run/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ unitId: props.unitId }),
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error?.message ?? "RUN_START_FAILED");
    setRun(json.data as Run);
  }

  useEffect(() => {
    void start().catch((e) => setError(e instanceof Error ? e.message : "RUN_START_FAILED"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.unitId]);

  async function checkCurrent() {
    if (!run || !currentQuestion) return;

    const a = answers[currentQuestion.questionId];
    if (!isAnswered(currentQuestion, a)) return;

    setChecking(true);
    setError(null);

    try {
      const res = await fetch("/api/run/check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          runId: run.runId,
          questionId: currentQuestion.questionId,
          choice: a.choice,
          payload: a.payload,
        }),
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message ?? "RUN_CHECK_FAILED");

      const data = json.data as CheckResponse;
      const correctText =
        data.correct.kind === "mcq" ? data.correct.choice : `参考：${data.correct.preview}`;

      setFeedbackByQuestionId((prev) => ({
        ...prev,
        [currentQuestion.questionId]: {
          isCorrect: data.isCorrect,
          explanation: data.explanation,
          correctText: data.isCorrect ? undefined : correctText,
        },
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "RUN_CHECK_FAILED");
    } finally {
      setChecking(false);
    }
  }

  async function finishRun() {
    if (!run) return;

    setFinishing(true);
    setError(null);

    try {
      const payload = {
        runId: run.runId,
        answers: Object.entries(answers).map(([questionId, a]) => ({
          questionId,
          choice: a.choice,
          payload: a.payload,
        })),
      };

      const res = await fetch("/api/run/finish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message ?? "RUN_FINISH_FAILED");
      setResult(json.data as Result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "RUN_FINISH_FAILED");
    } finally {
      setFinishing(false);
    }
  }

  function next() {
    if (!run) return;

    const isLast = currentIndex >= run.questions.length - 1;
    if (isLast) {
      void finishRun();
      return;
    }

    const nextIndex = Math.min(currentIndex + 1, run.questions.length - 1);
    setCurrentIndex(nextIndex);

    if (!skipStageIntro && (nextIndex === 2 || nextIndex === 4)) {
      setIntroIndex(nextIndex);
    }
  }

  if (error) {
    return (
      <div className="w-full max-w-2xl space-y-3">
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
        <Button type="button" onClick={() => void start()}>
          重新开始
        </Button>
      </div>
    );
  }

  if (!run) {
    return <div className="text-sm text-zinc-600">加载题目中…</div>;
  }

  if (result) {
    const wrongQuestions: ReviewItem[] = run.questions.flatMap((q) => {
      const fb = feedbackByQuestionId[q.questionId];
      if (!fb || fb.isCorrect) return [];

      const a = answers[q.questionId];
      const yourAnswer =
        q.type === "sentence_pattern_fill"
          ? (() => {
              const payload = (a?.payload ?? {}) as Record<string, string>;
              return q.template.replace(/\{(.*?)\}/g, (_, key) => payload[key] || "____");
            })()
          : (a?.choice ?? "");

      const correctAnswer = (fb.correctText ?? "").replace(/^参考：/, "");

      return [
        {
          questionId: q.questionId,
          prompt: q.prompt,
          yourAnswer,
          correctAnswer,
          explanation: fb.explanation,
        },
      ];
    });

    return (
      <div className="w-full max-w-2xl space-y-4">
        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <div className="text-xl font-semibold">结算</div>
          <div className="mt-2 text-sm text-zinc-600">
            得分：<span className="font-semibold text-black">{result.score}</span>（{result.correct}/
            {result.total}）
          </div>
          <div className="mt-2 text-sm">星级：{"⭐".repeat(result.stars)}</div>
          <div className="mt-2 text-sm">{result.passed ? "通关成功！" : "差一点，再试一次！"}</div>
          {result.newBadges.length > 0 && (
            <div className="mt-3 text-sm">新获得勋章：{result.newBadges.join(", ")}</div>
          )}
        </div>

        {wrongQuestions.length > 0 ? (
          <div className="rounded-lg border border-zinc-200 bg-white p-6">
            <div className="text-sm font-semibold">错题回看（{wrongQuestions.length}）</div>
            <div className="mt-4 space-y-6">
              {wrongQuestions.map((item) => (
                <div key={item.questionId} className="rounded-md border border-zinc-200 bg-white p-4">
                  <div className="text-sm font-medium text-black">{item.prompt}</div>

                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-md border border-red-100 bg-red-50 p-3">
                      <div className="text-[10px] font-semibold text-red-500">你的回答</div>
                      <div className="mt-1 text-sm text-red-700">{item.yourAnswer}</div>
                    </div>
                    <div className="rounded-md border border-green-100 bg-green-50 p-3">
                      <div className="text-[10px] font-semibold text-green-600">正确答案</div>
                      <div className="mt-1 text-sm text-green-700">{item.correctAnswer}</div>
                    </div>
                  </div>

                  <div className="mt-3 rounded-md bg-zinc-50 p-3 text-sm text-zinc-700">
                    <span className="mr-2 font-medium text-black">解析</span>
                    {item.explanation}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex gap-2">
          <Button type="button" onClick={() => void start()}>
            再来一局（换题）
          </Button>
          <Button type="button" variant="ghost" onClick={props.onDone}>
            返回地图
          </Button>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return <div className="text-sm text-zinc-600">题目为空</div>;
  }

  if (introIndex !== null) {
    const introStage = STAGES[introIndex] ?? stage;
    return (
      <div className="w-full max-w-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-zinc-600">关卡：{props.unitId.toUpperCase()}</div>
            <div className="mt-1 flex items-center gap-2">
              <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600">
                阶段 {introStage.code}：{introStage.label}
              </span>
              <span className="text-xs text-zinc-400">
                {currentIndex + 1}/{run.questions.length}
              </span>
            </div>
          </div>
          <Button type="button" variant="ghost" onClick={() => void start()}>
            换一套题
          </Button>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
            Stage {introStage.code}
          </div>
          <div className="mt-2 text-xl font-semibold text-black">{introStage.label}</div>
          <div className="mt-3 text-sm text-zinc-600">{introStage.mission}</div>

          <div className="mt-6 flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-xs text-zinc-500">
              <input
                type="checkbox"
                checked={skipStageIntro}
                onChange={(e) => setSkipStageIntro(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300"
              />
              跳过后续开场
            </label>

            <Button type="button" onClick={() => setIntroIndex(null)}>
              开始
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const hasAnswered = isAnswered(currentQuestion, currentAnswer);
  const hasFeedback = Boolean(currentFeedback);

  return (
    <div className="w-full max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-zinc-600">关卡：{props.unitId.toUpperCase()}</div>
          <div className="mt-1 flex items-center gap-2">
            <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600">
              阶段 {stage.code}：{stage.label}
            </span>
            <span className="text-xs text-zinc-400">
              {currentIndex + 1}/{run.questions.length}
            </span>
          </div>
        </div>
        <Button type="button" variant="ghost" onClick={() => void start()}>
          换一套题
        </Button>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <div className="text-sm font-medium">{currentQuestion.prompt}</div>

        {currentQuestion.type === "sentence_pattern_fill" ? (
          (() => {
            const payload = (currentAnswer?.payload ?? {}) as Record<string, string>;
            const preview = currentQuestion.template.replace(/\{(.*?)\}/g, (_, key) => payload[key] || "____");

            return (
              <div className="mt-3 space-y-3">
                <div className="rounded-md bg-zinc-50 p-3 text-sm">{preview}</div>

                {currentQuestion.slots.map((slot) => {
                  const selected = payload[slot.key] ?? "";
                  const options = currentQuestion.wordBank[slot.key] ?? [];

                  return (
                    <div key={slot.key} className="space-y-2">
                      <div className="text-xs text-zinc-600">
                        {slot.label}：<span className="font-medium text-black">{selected || "（拖拽/点击选择）"}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {options.map((opt) => {
                          const isSelected = selected === opt;
                          return (
                            <button
                              key={opt}
                              type="button"
                              draggable
                              disabled={hasFeedback}
                              className={`rounded-md border px-3 py-2 text-sm ${
                                isSelected ? "border-black bg-zinc-100" : "border-zinc-200"
                              } ${hasFeedback ? "cursor-not-allowed opacity-60" : ""}`}
                              onClick={() => {
                                const nextPayload = { ...payload, [slot.key]: opt };
                                setAnswers((prev) => ({
                                  ...prev,
                                  [currentQuestion.questionId]: {
                                    choice: JSON.stringify(nextPayload),
                                    payload: nextPayload,
                                  },
                                }));
                              }}
                              onDragStart={(e) => {
                                e.dataTransfer.setData(
                                  "application/json",
                                  JSON.stringify({ slotKey: slot.key, value: opt }),
                                );
                              }}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                <div
                  className="rounded-md border border-dashed border-zinc-300 bg-white p-3 text-xs text-zinc-600"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (hasFeedback) return;

                    try {
                      const raw = e.dataTransfer.getData("application/json");
                      const parsed = JSON.parse(raw) as { slotKey: string; value: string };
                      if (!parsed.slotKey || !parsed.value) return;
                      const nextPayload = { ...payload, [parsed.slotKey]: parsed.value };
                      setAnswers((prev) => ({
                        ...prev,
                        [currentQuestion.questionId]: {
                          choice: JSON.stringify(nextPayload),
                          payload: nextPayload,
                        },
                      }));
                    } catch {
                      // ignore
                    }
                  }}
                >
                  拖到这里也可以（MVP）
                </div>
              </div>
            );
          })()
        ) : (
          (() => {
            const selectedChoice = currentAnswer?.choice ?? "";
            return (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {currentQuestion.choices.map((c) => {
                  const selected = selectedChoice === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      disabled={hasFeedback}
                      className={`rounded-md border px-3 py-2 text-sm ${
                        selected ? "border-black bg-zinc-100" : "border-zinc-200"
                      } ${hasFeedback ? "cursor-not-allowed opacity-60" : ""}`}
                      onClick={() =>
                        setAnswers((prev) => ({
                          ...prev,
                          [currentQuestion.questionId]: { choice: c },
                        }))
                      }
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            );
          })()
        )}

        <div className="mt-4 flex justify-end">
          <Button
            type="button"
            onClick={() => void checkCurrent()}
            disabled={!hasAnswered || hasFeedback || checking || finishing}
          >
            {checking ? "判定中…" : "确认提交"}
          </Button>
        </div>
      </div>

      {currentFeedback && (
        <div
          className={`rounded-lg border p-5 ${
            currentFeedback.isCorrect ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div
                className={`text-sm font-semibold ${
                  currentFeedback.isCorrect ? "text-green-800" : "text-red-800"
                }`}
              >
                {currentFeedback.isCorrect ? "✅ 回答正确" : "❌ 回答错误"}
              </div>
              <div className="mt-2 text-sm text-zinc-700">{currentFeedback.explanation}</div>
              {currentFeedback.correctText ? (
                <div className="mt-2 text-xs font-medium text-zinc-500">
                  正确答案：{currentFeedback.correctText}
                </div>
              ) : null}
            </div>

            <Button type="button" onClick={next} disabled={finishing}>
              {currentIndex >= run.questions.length - 1 ? (finishing ? "结算中…" : "查看结果") : "下一题"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
