"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";

type BossQuestion = {
  questionId: string;
  type: "boss_poem_blank" | "boss_reading_mcq" | "boss_reading_tf";
  prompt: string;
  choices: string[];
  meta?: { title?: string; author?: string; source?: string };
};

type BossRun = {
  runId: string;
  unitId: string;
  seed: number;
  questions: BossQuestion[];
};

type Result = {
  unitId: string;
  mode: "boss";
  score: number;
  stars: 0 | 1 | 2 | 3;
  passed: boolean;
  correct: number;
  total: number;
  newBadges: string[];
  review: Array<{
    questionId: string;
    prompt: string;
    yourAnswer: string;
    correctAnswer: string;
    explanation: string;
    isCorrect: boolean;
    meta?: { title?: string; author?: string; source?: string };
  }>;
};

export function BossPlayClient(props: { unitId: string; onDone: () => void }) {
  const [run, setRun] = useState<BossRun | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const unansweredCount = useMemo(() => {
    if (!run) return 0;
    return run.questions.filter((q) => !answers[q.questionId]).length;
  }, [run, answers]);

  async function start() {
    setError(null);
    setResult(null);
    setAnswers({});

    const res = await fetch("/api/boss/run/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ unitId: props.unitId }),
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error?.message ?? "RUN_START_FAILED");
    setRun(json.data as BossRun);
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

      const res = await fetch("/api/boss/run/finish", {
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
        <Button type="button" variant="ghost" onClick={props.onDone}>
          返回
        </Button>
      </div>
    );
  }

  if (!run) {
    return <div className="text-sm text-zinc-600">Boss 关加载中…</div>;
  }

  if (result) {
    return (
      <div className="w-full max-w-2xl space-y-4">
        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <div className="text-xl font-semibold">Boss 结算</div>
          <div className="mt-2 text-sm text-zinc-600">
            得分：<span className="font-semibold text-black">{result.score}</span>（{result.correct}/
            {result.total}）
          </div>
          <div className="mt-2 text-sm">星级：{"⭐".repeat(result.stars)}</div>
          <div className="mt-2 text-sm">{result.passed ? "Boss 通过！" : "再挑战一次！"}</div>
        </div>

        <div className="space-y-3">
          <div className="text-sm font-medium text-zinc-500">题目回顾</div>
          {result.review.map((item, idx) => (
            <div
              key={item.questionId}
              className={`rounded-lg border p-4 text-sm ${
                item.isCorrect ? "border-green-200 bg-green-50/30" : "border-red-200 bg-red-50/30"
              }`}
            >
              <div className="mb-2 flex items-start justify-between gap-4">
                <div className="font-medium text-zinc-900 whitespace-pre-line">
                  <span className="mr-1 opacity-50">{idx + 1}.</span>
                  {item.meta?.title && <span className="mr-2 text-xs text-zinc-500">[{item.meta.title}]</span>}
                  {item.prompt}
                </div>
                <div className={`shrink-0 font-bold ${item.isCorrect ? "text-green-600" : "text-red-600"}`}>
                  {item.isCorrect ? "正确" : "错误"}
                </div>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded bg-white/50 p-2">
                  <div className="text-xs text-zinc-500">你的答案</div>
                  <div className={`mt-0.5 font-medium ${item.isCorrect ? "text-green-700" : "text-red-700"}`}>
                    {item.yourAnswer}
                  </div>
                </div>
                <div className="rounded bg-white/50 p-2">
                  <div className="text-xs text-zinc-500">正确答案</div>
                  <div className="mt-0.5 font-medium text-zinc-900">{item.correctAnswer}</div>
                </div>
              </div>

              <div className="mt-3 rounded bg-zinc-50/80 p-3 text-zinc-600">
                <span className="mr-1 font-medium text-zinc-900">解析：</span>
                {item.explanation}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button type="button" onClick={() => void start()}>
            再战一次（换题）
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
          <div className="text-sm text-zinc-600">关卡：{props.unitId.toUpperCase()}（Boss 关）</div>
          <div className="text-xl font-semibold">守关 Boss：羊副市长 × 豹警官</div>
          <div className="text-xs text-zinc-600">6 题速战：古诗 + 理解</div>
        </div>
        <Button type="button" variant="ghost" onClick={() => void start()}>
          换一套题
        </Button>
      </div>

      <div className="space-y-3">
        {run.questions.map((q, idx) => (
          <div key={q.questionId} className="rounded-lg border border-zinc-200 bg-white p-4">
            <div className="text-xs text-zinc-600">
              {q.type === "boss_poem_blank" ? "古诗" : "理解"}
              {q.meta?.title ? `｜${q.meta.title}` : ""}
            </div>
            <div className="mt-1 whitespace-pre-line text-sm font-medium">
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
