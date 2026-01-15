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

export function PlayClient(props: { unitId: string; onDone: () => void }) {
  const [run, setRun] = useState<Run | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  function isAnswered(q: RunQuestion): boolean {
    const a = answers[q.questionId];
    if (!a) return false;

    if (q.type === "sentence_pattern_fill") {
      const payload = a.payload;
      if (typeof payload !== "object" || payload === null) return false;
      const filled = payload as Record<string, unknown>;
      return q.slots.every((s) => typeof filled[s.key] === "string" && (filled[s.key] as string).length > 0);
    }

    return typeof a.choice === "string" && a.choice.length > 0;
  }

  const unansweredCount = useMemo(() => {
    if (!run) return 0;
    return run.questions.filter((q) => !isAnswered(q)).length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, answers]);

  async function start() {
    setError(null);
    setResult(null);
    setAnswers({});

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

  async function submit() {
    if (!run) return;

    setError(null);
    setSubmitting(true);

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
      setSubmitting(false);
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

  return (
    <div className="w-full max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-zinc-600">关卡：{props.unitId.toUpperCase()}</div>
          <div className="text-xl font-semibold">普通关卡（T1/T2/T3）</div>
        </div>
        <Button type="button" variant="ghost" onClick={() => void start()}>
          换一套题
        </Button>
      </div>

      <div className="space-y-3">
        {run.questions.map((q, idx) => {
          const answer = answers[q.questionId];

          if (q.type === "sentence_pattern_fill") {
            const payload = (answer?.payload ?? {}) as Record<string, string>;
            const preview = q.template.replace(/\{(.*?)\}/g, (_, key) => payload[key] || "____");

            return (
              <div key={q.questionId} className="rounded-lg border border-zinc-200 bg-white p-4">
                <div className="text-sm font-medium">
                  {idx + 1}. {q.prompt}
                </div>
                <div className="mt-2 rounded-md bg-zinc-50 p-3 text-sm">{preview}</div>

                <div className="mt-3 space-y-3">
                  {q.slots.map((slot) => {
                    const selected = payload[slot.key] ?? "";
                    const options = q.wordBank[slot.key] ?? [];

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
                                className={`rounded-md border px-3 py-2 text-sm ${
                                  isSelected ? "border-black bg-zinc-100" : "border-zinc-200"
                                }`}
                                onClick={() => {
                                  const next = { ...payload, [slot.key]: opt };
                                  setAnswers((prev) => ({
                                    ...prev,
                                    [q.questionId]: { choice: JSON.stringify(next), payload: next },
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
                      try {
                        const raw = e.dataTransfer.getData("application/json");
                        const parsed = JSON.parse(raw) as { slotKey: string; value: string };
                        if (!parsed.slotKey || !parsed.value) return;
                        const next = { ...payload, [parsed.slotKey]: parsed.value };
                        setAnswers((prev) => ({
                          ...prev,
                          [q.questionId]: { choice: JSON.stringify(next), payload: next },
                        }));
                      } catch {
                        // ignore
                      }
                    }}
                  >
                    拖到这里也可以（MVP）
                  </div>
                </div>
              </div>
            );
          }

          const selectedChoice = answer?.choice ?? "";

          return (
            <div key={q.questionId} className="rounded-lg border border-zinc-200 bg-white p-4">
              <div className="text-sm font-medium">
                {idx + 1}. {q.prompt}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {q.choices.map((c) => {
                  const selected = selectedChoice === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      className={`rounded-md border px-3 py-2 text-sm ${
                        selected ? "border-black bg-zinc-100" : "border-zinc-200"
                      }`}
                      onClick={() =>
                        setAnswers((prev) => ({
                          ...prev,
                          [q.questionId]: { choice: c },
                        }))
                      }
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between rounded-md bg-zinc-50 p-3">
        <div className="text-sm text-zinc-600">未作答：{unansweredCount}</div>
        <Button type="button" onClick={() => void submit()} disabled={submitting || unansweredCount > 0}>
          提交
        </Button>
      </div>
    </div>
  );
}
