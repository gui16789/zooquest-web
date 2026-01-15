"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";

type RunQuestion = {
  questionId: string;
  type: "mcq_pinyin";
  prompt: string;
  hanzi: string;
  choices: string[];
};

type Run = {
  runId: string;
  unitId: string;
  seed: number;
  questions: RunQuestion[];
};

export function PlayClient(props: { unitId: string; onDone: () => void }) {
  const [run, setRun] = useState<Run | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<null | {
    score: number;
    passed: boolean;
    correct: number;
    total: number;
    newBadges: string[];
  }>(null);

  const unansweredCount = useMemo(() => {
    if (!run) return 0;
    return run.questions.filter((q) => !answers[q.questionId]).length;
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
        answers: Object.entries(answers).map(([questionId, choice]) => ({ questionId, choice })),
      };

      const res = await fetch("/api/run/finish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message ?? "RUN_FINISH_FAILED");
      setResult(json.data);
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
          <div className="mt-2 text-sm">{result.passed ? "通关成功！" : "差一点，再试一次！"}</div>
          {result.newBadges.length > 0 && (
            <div className="mt-3 text-sm">
              新获得勋章：{result.newBadges.join(", ")}
            </div>
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
          <div className="text-xl font-semibold">答题闯关（MVP）</div>
        </div>
        <Button type="button" variant="ghost" onClick={() => void start()}>
          换一套题
        </Button>
      </div>

      <div className="space-y-3">
        {run.questions.map((q, idx) => (
          <div key={q.questionId} className="rounded-lg border border-zinc-200 bg-white p-4">
            <div className="text-sm font-medium">
              {idx + 1}. {q.prompt}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {q.choices.map((c) => {
                const selected = answers[q.questionId] === c;
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
                        [q.questionId]: c,
                      }))
                    }
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
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
