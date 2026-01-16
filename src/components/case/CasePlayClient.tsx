"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";

type SceneId = "s1" | "s2" | "s3";

type KnowledgeRefs = [string] | [string, string];

type StoryTask = { index: number; label: string };

type StoryMeta = {
  storyId: string;
  caseId: string;
  sceneId: SceneId;
  sceneTitle: string;
  clue: { id: string; name: string };
  tasks: StoryTask[];
};

type QuestionBase = {
  questionId: string;
  prompt: string;
  choices: string[];
  knowledgeRefs: KnowledgeRefs;
  taskLabel: string;
};

type StoryQuestion =
  | (QuestionBase & { type: "mcq_pinyin"; hanzi: string })
  | (QuestionBase & { type: "mcq_hanzi_by_pinyin"; pinyin: string })
  | (QuestionBase & { type: "mcq_polyphone"; hanzi: string; example: string })
  | (QuestionBase & { type: "mcq_syn_ant" })
  | (QuestionBase & { type: "mcq_confusing"; rule?: string; examples?: string[] })
  | (QuestionBase & { type: "mcq_word_spelling"; pinyin?: string })
  | (QuestionBase & { type: "mcq_word_pattern_match"; patternType: string })
  | {
      questionId: string;
      type: "sentence_pattern_fill";
      prompt: string;
      knowledgeRefs: KnowledgeRefs;
      taskLabel: string;
      template: string;
      slots: Array<{ key: string; label: string }>;
      wordBank: Record<string, string[]>;
    };

type StoryRun = {
  story: StoryMeta;
  runId: string;
  unitId: string;
  seed: number;
  questions: StoryQuestion[];
};

type AnswerState = { choice: string; payload?: unknown };

type CheckResponse =
  | {
      isCorrect: boolean;
      explanation: string;
      knowledgeRefs: KnowledgeRefs;
      correct: { kind: "mcq"; choice: string };
    }
  | {
      isCorrect: boolean;
      explanation: string;
      knowledgeRefs: KnowledgeRefs;
      correct: { kind: "sentence_pattern_fill"; payload: Record<string, string>; preview: string };
    };

type FeedbackState = {
  isCorrect: boolean;
  explanation: string;
  correctText?: string;
};

function isAnswered(q: StoryQuestion, a: AnswerState | undefined): boolean {
  if (!a) return false;

  if (q.type === "sentence_pattern_fill") {
    const payload = a.payload;
    if (typeof payload !== "object" || payload === null) return false;
    const filled = payload as Record<string, unknown>;
    return q.slots.every((s) => typeof filled[s.key] === "string" && (filled[s.key] as string).length > 0);
  }

  return typeof a.choice === "string" && a.choice.length > 0;
}

const SCENE_ORDER: SceneId[] = ["s1", "s2", "s3"];

export function CasePlayClient(props: { unitId: string; onExit: () => void; onBoss: () => void }) {
  const [sceneIndex, setSceneIndex] = useState(0);
  const [run, setRun] = useState<StoryRun | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [feedbackByQuestionId, setFeedbackByQuestionId] = useState<Record<string, FeedbackState>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clues, setClues] = useState<Array<{ id: string; name: string }>>([]);

  const sceneId = SCENE_ORDER[sceneIndex] ?? "s1";

  const currentQuestion = run?.questions[currentIndex] ?? null;
  const currentAnswer = currentQuestion ? answers[currentQuestion.questionId] : undefined;
  const currentFeedback = currentQuestion ? feedbackByQuestionId[currentQuestion.questionId] : undefined;

  const unansweredCount = useMemo(() => {
    if (!run) return 0;
    return run.questions.filter((q) => !isAnswered(q, answers[q.questionId])).length;
  }, [run, answers]);

  async function startScene(nextSceneId: SceneId) {
    setError(null);
    setRun(null);
    setAnswers({});
    setFeedbackByQuestionId({});
    setCurrentIndex(0);

    const res = await fetch("/api/story/run/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ unitId: props.unitId, sceneId: nextSceneId }),
    });

    const json = await res.json();
    if (!json.ok) throw new Error(json.error?.message ?? "STORY_RUN_START_FAILED");
    setRun(json.data as StoryRun);
  }

  useEffect(() => {
    void startScene(sceneId).catch((e) => setError(e instanceof Error ? e.message : "STORY_RUN_START_FAILED"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.unitId, sceneIndex]);

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
      const correctText = data.correct.kind === "mcq" ? data.correct.choice : `参考：${data.correct.preview}`;

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

  function next() {
    if (!run) return;

    const isLast = currentIndex >= run.questions.length - 1;
    if (isLast) {
      // Clear scene: award clue and advance.
      setClues((prev) => {
        const clue = run.story.clue;
        if (prev.some((c) => c.id === clue.id)) return prev;
        return [...prev, clue];
      });

      const nextSceneIndex = sceneIndex + 1;
       if (nextSceneIndex >= SCENE_ORDER.length) {
         // MVP: once 3 clues collected, go to boss.
         props.onBoss();
         return;
       }

      setSceneIndex(nextSceneIndex);
      return;
    }

    setCurrentIndex((i) => Math.min(i + 1, run.questions.length - 1));
  }

  if (error) {
    return (
      <div className="w-full max-w-2xl space-y-3">
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
        <Button type="button" onClick={() => void startScene(sceneId)}>
          重新开始本场景
        </Button>
        <Button type="button" variant="ghost" onClick={props.onExit}>
          返回地图
        </Button>
      </div>
    );
  }

  if (!run || !currentQuestion) {
    return <div className="text-sm text-zinc-600">案件加载中…</div>;
  }

  const hasAnswered = isAnswered(currentQuestion, currentAnswer);
  const hasFeedback = Boolean(currentFeedback);

  return (
    <div className="w-full max-w-2xl space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs text-zinc-600">ZPD 档案：Case {props.unitId.toUpperCase()}</div>
          <div className="mt-1 text-xl font-semibold">{run.story.sceneTitle}</div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600">
              任务 {currentIndex + 1}/{run.questions.length}
            </span>
            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
              已收集线索：{clues.length}/3
            </span>
          </div>
        </div>
        <Button type="button" variant="ghost" onClick={props.onExit}>
          返回地图
        </Button>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <div className="text-xs font-semibold text-zinc-500">{currentQuestion.taskLabel}</div>
        <div className="mt-2 text-sm font-medium">{currentQuestion.prompt}</div>

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
                        {slot.label}：<span className="font-medium text-black">{selected || "（点击选择）"}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {options.map((opt) => {
                          const isSelected = selected === opt;
                          return (
                            <button
                              key={opt}
                              type="button"
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
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {currentQuestion.choices.map((c) => {
              const selected = currentAnswer?.choice === c;
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
        )}

        {hasFeedback ? (
          <div className="mt-4 rounded-md bg-zinc-50 p-3 text-sm text-zinc-700">
            <span className="mr-2 font-medium text-black">解析</span>
            {currentFeedback?.explanation}
          </div>
        ) : null}

        <div className="mt-6 flex items-center justify-between">
          <div className="text-xs text-zinc-500">未完成：{unansweredCount}</div>
          {hasFeedback ? (
            <Button type="button" onClick={next}>
              {currentIndex >= run.questions.length - 1 ? "领取线索" : "下一步"}
            </Button>
          ) : (
            <Button type="button" onClick={() => void checkCurrent()} disabled={checking || !hasAnswered}>
              {checking ? "核对中…" : "核对"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
