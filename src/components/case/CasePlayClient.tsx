"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";

type SceneId = "s1" | "s2" | "s3";

type KnowledgeRefs = [string] | [string, string];

type StoryTask = { index: number; label: string };

type StoryMeta = {
  storyId: string;
  caseId: string;
  sceneId: SceneId;
  sceneTitle: string;
  briefing?: {
    chief: { name: string; title: string };
    partner: { name: string; title: string };
    introLines: string[];
    successLine: string;
  };
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

type Growth = {
  level: number;
  title: string;
  xp: number;
};

type GrowthUpdate = {
  xp: number;
  level: number;
  title: string;
  leveledUp: boolean;
  xpGained: number;
};

type CheckResponse =
  | {
      isCorrect: boolean;
      explanation: string;
      knowledgeRefs: KnowledgeRefs;
      correct: { kind: "mcq"; choice: string };
      growth?: GrowthUpdate | null;
    }
  | {
      isCorrect: boolean;
      explanation: string;
      knowledgeRefs: KnowledgeRefs;
      correct: { kind: "sentence_pattern_fill"; payload: Record<string, string>; preview: string };
      growth?: GrowthUpdate | null;
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
  const [kidName, setKidName] = useState<string>("新手探员");
  const [growth, setGrowth] = useState<Growth | null>(null);
  const [showBriefing, setShowBriefing] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "xp" | "levelup" } | null>(null);

  const [sceneIndex, setSceneIndex] = useState(0);
  const [run, setRun] = useState<StoryRun | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [feedbackByQuestionId, setFeedbackByQuestionId] = useState<Record<string, FeedbackState>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [checking, setChecking] = useState(false);
  const [advanceTick, setAdvanceTick] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [clues, setClues] = useState<Array<{ id: string; name: string }>>([]);
  const [pendingClue, setPendingClue] = useState<{ id: string; name: string } | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'scene'>('map');

  const sceneId = SCENE_ORDER[sceneIndex] ?? "s1";

  const currentQuestion = run?.questions[currentIndex] ?? null;
  const currentAnswer = currentQuestion ? answers[currentQuestion.questionId] : undefined;
  const currentFeedback = currentQuestion ? feedbackByQuestionId[currentQuestion.questionId] : undefined;
  const briefing = run?.story.briefing;


  useEffect(() => {
    // Case clue progress is local per playthrough.
    setClues([]);
    setPendingClue(null);
    setSceneIndex(0);
    setCurrentIndex(0);
    setViewMode('map');

    fetch("/api/progress")
      .then((res) => res.json())
      .then((json) => {
        if (json.ok && json.data) {
          if (json.data.user?.nickname) setKidName(json.data.user.nickname);
          if (json.data.growth) setGrowth(json.data.growth);
        }
      })
      .catch(() => {
        /* ignore */
      });
  }, [props.unitId]);

  async function startScene(nextSceneId: SceneId) {
    setError(null);
    setRun(null);
    setAnswers({});
    setFeedbackByQuestionId({});
    setCurrentIndex(0);
    setShowBriefing(true);

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
    if (viewMode === 'scene') {
      void startScene(sceneId).catch((e) => setError(e instanceof Error ? e.message : "STORY_RUN_START_FAILED"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.unitId, sceneIndex, viewMode]);

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

      const g = data.growth ?? null;
      if (g) setGrowth(g);

      if (g?.leveledUp) {
        setToast({ message: `升级！${g.title}（Lv.${g.level}）`, type: "levelup" });
        setTimeout(() => setToast(null), 4000);
      } else if (g?.xpGained) {
        setToast({
          message: data.isCorrect ? `证据成立 +${g.xpGained}XP` : `继续努力 +${g.xpGained}XP`,
          type: "xp",
        });
        setTimeout(() => setToast(null), 2500);
      }

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

    // Clear feedback for current question so the next step is interactive.
    if (currentQuestion) {
      setFeedbackByQuestionId((prev) => {
        if (!(currentQuestion.questionId in prev)) return prev;
        const next = { ...prev };
        delete next[currentQuestion.questionId];
        return next;
      });
    }

    const isLast = currentIndex >= run.questions.length - 1;
    if (isLast) {
      // Clear scene: award clue and advance.
      const clue = run.story.clue;
      setClues((prev) => {
        if (prev.some((c) => c.id === clue.id)) return prev;
        return [...prev, clue];
      });
      setPendingClue(clue);
      return;
    }

    setCurrentIndex((i) => Math.min(i + 1, run.questions.length - 1));
    setAdvanceTick((t) => t + 1);
  }

  function handleClueDismiss() {
    setPendingClue(null);
    const nextSceneIndex = sceneIndex + 1;
    // Don't auto-advance to boss or scene, just unlock locally and return to map
    if (nextSceneIndex < SCENE_ORDER.length) {
       setSceneIndex(nextSceneIndex);
    }
    setViewMode('map');
  }

  if (error) {
    return (
      <div className="w-full max-w-2xl space-y-3">
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
        <Button type="button" onClick={() => void startScene(sceneId)}>
          重新开始本场景
        </Button>
        <Button type="button" variant="ghost" onClick={() => setViewMode('map')}>
          返回地图
        </Button>
      </div>
    );
  }

  // --- MAP MODE ---
  if (viewMode === 'map') {
    const totalClues = 3;
    const collectedCount = clues.length;
    
    // Nodes configuration
    // S1, S2, S3, Boss
    const nodes = [
      { id: 's1', label: '现场', x: 20, y: 80 },
      { id: 's2', label: '证人', x: 80, y: 50 },
      { id: 's3', label: '密室', x: 20, y: 20 },
      { id: 'boss', label: '指证', x: 50, y: 5, isBoss: true }
    ];

    return (
      <div className="w-full max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
         {/* Header / HUD */}
         <div className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm border border-zinc-100">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xl ring-4 ring-blue-50">
                 {Math.round((collectedCount / totalClues) * 100)}%
              </div>
              <div>
                 <div className="text-sm font-bold text-zinc-900">案情进度</div>
                 <div className="text-xs text-zinc-500 font-mono">CASE PROGRESS</div>
              </div>
            </div>
            <div className="flex gap-6 text-right">
               <div>
                  <div className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Locations</div>
                  <div className="font-mono font-bold text-zinc-700">{Math.min(collectedCount + 1, 3)}/3</div>
               </div>
               <div>
                  <div className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Clues</div>
                  <div className={`font-mono font-bold ${collectedCount >= 3 ? 'text-green-600' : 'text-amber-500'}`}>
                    {collectedCount}/3
                  </div>
               </div>
            </div>
         </div>

         {/* Map Container */}
         <div className="relative aspect-[4/3] w-full rounded-2xl bg-zinc-50 border border-zinc-200 shadow-inner overflow-hidden">
            {/* Grid Pattern Background */}
            <div className="absolute inset-0 opacity-[0.03]" 
                 style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }} 
            />

            {/* SVG Path */}
            <svg className="absolute inset-0 h-full w-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
               {/* Connecting path */}
               <path 
                 d="M 20 80 C 50 80, 50 50, 80 50 C 110 50, 50 50, 20 20 C -10 -10, 50 20, 50 15" 
                 fill="none" 
                 stroke="#e4e4e7" 
                 strokeWidth="2" 
                 strokeDasharray="4 4"
               />
               <path 
                 d="M 20 80 C 50 80, 50 50, 80 50 C 110 50, 50 50, 20 20 C -10 -10, 50 20, 50 15" 
                 fill="none" 
                 stroke={collectedCount >= 3 ? "#10b981" : "#3b82f6"} 
                 strokeWidth="2"
                 strokeDasharray="1000"
                 strokeDashoffset={1000 - (collectedCount * 333)} 
                 className="transition-all duration-1000 ease-out"
               />
            </svg>

            {/* Nodes */}
            {nodes.map((node, index) => {
               // Determine state
               // Map nodes to scene indices: 0, 1, 2. Boss is separate.
               let status: 'locked' | 'current' | 'completed' = 'locked';
               
               if (node.isBoss) {
                  status = collectedCount >= 3 ? 'current' : 'locked';
               } else {
                  if (collectedCount > index) status = 'completed';
                  else if (collectedCount === index) status = 'current';
                  else status = 'locked';
               }

               const isBoss = node.isBoss;

               return (
                 <button
                   key={node.id}
                   disabled={status === 'locked'}
                   onClick={() => {
                      if (isBoss) {
                         props.onBoss();
                      } else {
                         setSceneIndex(index);
                         setViewMode('scene');
                      }
                   }}
                   className={`absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-300 group
                     ${status === 'locked' ? 'cursor-not-allowed opacity-60 grayscale' : 'cursor-pointer hover:scale-110'}
                   `}
                   style={{ left: `${node.x}%`, top: `${node.y}%` }}
                 >
                    {/* Node Circle */}
                    <div className={`
                       relative flex h-14 w-14 items-center justify-center rounded-full shadow-lg border-4 z-10 bg-white
                       ${status === 'completed' ? 'border-green-500 text-green-600' : ''}
                       ${status === 'current' ? 'border-blue-500 text-blue-600 animate-pulse ring-4 ring-blue-500/20' : ''}
                       ${status === 'locked' ? 'border-zinc-300 text-zinc-300 bg-zinc-50' : ''}
                       ${isBoss && status === 'current' ? 'border-amber-500 text-amber-600 ring-amber-500/30' : ''}
                    `}>
                       {status === 'completed' ? (
                          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                       ) : status === 'locked' ? (
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                       ) : isBoss ? (
                          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                       ) : (
                          <span className="text-xl font-bold">{index + 1}</span>
                       )}
                       
                       {/* Label */}
                       <div className={`absolute -bottom-8 whitespace-nowrap text-xs font-bold px-2 py-1 rounded-full bg-white/80 backdrop-blur-sm border shadow-sm
                          ${status === 'current' ? 'text-blue-700 border-blue-200' : 'text-zinc-500 border-zinc-200'}
                       `}>
                          {node.label}
                       </div>
                    </div>
                 </button>
               );
            })}
         </div>

         <div className="flex justify-center">
            <Button variant="ghost" className="text-zinc-400 hover:text-zinc-600" onClick={props.onExit}>
               返回首页
            </Button>
         </div>
      </div>
    );
  }

  // --- SCENE MODE (Existing Logic) ---

  if (!run || !currentQuestion) {
    return <div className="text-sm text-zinc-600 animate-pulse">案件加载中…</div>;
  }

  const hasAnswered = isAnswered(currentQuestion, currentAnswer);
  const hasFeedback = Boolean(currentFeedback);

  return (
    <div className="w-full max-w-2xl">
       {/* Toast */}
      {toast && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 rounded-full px-6 py-2 shadow-xl animate-in fade-in zoom-in slide-in-from-top-4 duration-300 font-bold tracking-wide ${
          toast.type === 'levelup' ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white border-2 border-white' : 'bg-zinc-900 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Briefing Modal */}
      {showBriefing && briefing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/95 p-4 animate-in fade-in duration-300 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
            <div className="bg-zinc-950 px-6 py-4 border-b border-zinc-800 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse"/>
                    <h2 className="text-sm font-mono tracking-widest text-zinc-400">MISSION BRIEFING // TOP SECRET</h2>
                </div>
                <div className="text-xs font-mono text-zinc-600">{new Date().toLocaleDateString()}</div>
            </div>
            
            <div className="p-8 space-y-6">
               {briefing.introLines.map((line, i) => (
                 <div key={i} className="flex gap-4">
                    <div className={`shrink-0 text-sm font-bold uppercase tracking-wider w-16 text-right pt-1 ${i % 2 === 0 ? 'text-blue-400' : 'text-amber-400'}`}>
                        {i % 2 === 0 ? briefing.chief.name : briefing.partner.name}
                    </div>
                    <div className="text-lg leading-relaxed text-zinc-200 font-medium">{line}</div>
                 </div>
               ))}
            </div>

            <div className="bg-zinc-950 p-6 border-t border-zinc-800">
                <Button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-6 text-lg tracking-widest uppercase" onClick={() => setShowBriefing(false)}>
                    开始行动 (Accept Mission)
                </Button>
            </div>
          </div>
        </div>
      )}

      {/* Clue Acquired Overlay */}
      {pendingClue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/95 p-4 animate-in fade-in duration-300 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-xl border border-amber-500/50 bg-zinc-900 shadow-2xl ring-1 ring-amber-500/20">
            <div className="bg-amber-950/30 px-6 py-4 border-b border-amber-500/30 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                <h2 className="text-sm font-mono tracking-widest text-amber-500">EVIDENCE ACQUIRED</h2>
              </div>
              <div className="text-xs font-mono text-amber-700/50">CASE FILE UPDATE</div>
            </div>

            <div className="p-8 text-center space-y-6">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/10 ring-1 ring-amber-500/50 shadow-[0_0_30px_-5px_rgba(245,158,11,0.3)]">
                <svg className="h-10 w-10 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-widest text-zinc-500">New Clue Obtained</div>
                <h3 className="text-2xl font-bold text-white tracking-tight">{pendingClue.name}</h3>
              </div>

              <div className="inline-flex items-center gap-3 rounded-full bg-zinc-800/50 px-4 py-1.5 ring-1 ring-white/10">
                <span className="text-xs font-medium text-zinc-400">Total Clues:</span>
                <span className="font-mono text-lg font-bold text-amber-500">{Math.min(clues.length, 3)}/3</span>
              </div>
            </div>

            <div className="bg-zinc-950 p-6 border-t border-zinc-800">
              <Button 
                className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-6 text-lg tracking-widest uppercase shadow-[0_0_20px_-5px_rgba(217,119,6,0.5)] transition-all hover:shadow-[0_0_30px_-5px_rgba(217,119,6,0.7)]" 
                onClick={handleClueDismiss}
              >
                {clues.length >= 3 ? "进入审讯 (Interrogate)" : "前往下一地点 (Next)"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main UI */}
      <div className="space-y-4">
          {/* Header Card */}
          <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
              <div className="flex items-center justify-between bg-zinc-50 px-4 py-3 border-b border-zinc-100">
                  <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white shadow-sm ring-2 ring-white ring-offset-2 ring-offset-zinc-50">
                           {growth?.level ?? 1}
                      </div>
                      <div>
                          <div className="flex items-center gap-2">
                             <div className="text-base font-bold text-zinc-900">{kidName} 探员</div>
                             {growth?.title && <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">{growth.title}</span>}
                          </div>
                          {growth ? (
                              <div className="mt-1 h-1.5 w-24 rounded-full bg-zinc-200 overflow-hidden">
                                  <div className="h-full bg-blue-500" style={{ width: `${Math.min(((growth.xp % 120) / 120) * 100, 100)}%` }} />
                              </div>
                          ) : (
                              <div className="text-xs text-zinc-400">身份验证中...</div>
                          )}
                      </div>
                  </div>
                  <div className="text-right">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">Case File</div>
                      <div className="font-bold text-zinc-700">{props.unitId.toUpperCase()}</div>
                  </div>
              </div>
              <div className="px-4 py-2 bg-white flex justify-between items-center text-xs">
                    <span className="font-medium text-zinc-500">
                      {run.story.sceneTitle}
                    </span>
                     <div className="flex items-center gap-3">
                        <span className="font-mono text-zinc-400">
                        TASK {currentIndex + 1}/{run.questions.length}
                        </span>
                        <span className={`font-bold ${clues.length >= 3 ? 'text-green-600' : 'text-amber-600'}`}>
                        CLUES {clues.length}/3
                        </span>
                    </div>
              </div>
          </div>
        
        {/* Question Card */}
        <div key={`q-${currentQuestion.questionId}-${advanceTick}`} className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <div className="h-24 w-24 rounded-full border-4 border-black"/>
          </div>
          
          <div className="relative">
            <div className="mb-4 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded bg-zinc-900 text-xs font-bold text-white">Q</span>
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">{currentQuestion.taskLabel}</span>
            </div>
            
            <div className="text-lg font-medium leading-relaxed text-zinc-900">{currentQuestion.prompt}</div>

            {currentQuestion.type === "sentence_pattern_fill" ? (
            (() => {
                const payload = (currentAnswer?.payload ?? {}) as Record<string, string>;
                const preview = currentQuestion.template.replace(/\{(.*?)\}/g, (_, key) => payload[key] || "____");

                return (
                <div className="mt-6 space-y-6">
                    <div className="rounded-lg bg-zinc-50 p-4 text-base font-medium border border-zinc-100 shadow-inner">{preview}</div>
                    {currentQuestion.slots.map((slot) => {
                    const selected = payload[slot.key] ?? "";
                    const options = currentQuestion.wordBank[slot.key] ?? [];

                    return (
                        <div key={slot.key} className="space-y-3">
                        <div className="text-sm text-zinc-600 flex items-center gap-2">
                             <span className="w-1.5 h-1.5 rounded-full bg-blue-500"/>
                            {slot.label}：<span className="font-bold text-zinc-900 border-b-2 border-blue-100 px-1">{selected || "（点击下方选项）"}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {options.map((opt) => {
                            const isSelected = selected === opt;
                            return (
                                <button
                                key={opt}
                                type="button"
                                disabled={hasFeedback}
                                className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
                                    isSelected 
                                    ? "border-blue-600 bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-600" 
                                    : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
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
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentQuestion.choices.map((c) => {
                const selected = currentAnswer?.choice === c;
                return (
                    <button
                    key={c}
                    type="button"
                    disabled={hasFeedback}
                    className={`rounded-lg border px-4 py-3 text-left text-sm font-medium transition-all ${
                        selected 
                        ? "border-blue-600 bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-600" 
                        : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
                    } ${hasFeedback ? "cursor-not-allowed opacity-60" : ""}`}
                    onClick={() =>
                        setAnswers((prev) => ({
                        ...prev,
                        [currentQuestion.questionId]: { choice: c },
                        }))
                    }
                    >
                    <div className="flex items-center gap-3">
                        <div className={`h-4 w-4 rounded-full border ${selected ? 'border-blue-600 bg-blue-600' : 'border-zinc-300'}`}/>
                        {c}
                    </div>
                    </button>
                );
                })}
            </div>
            )}

            {hasFeedback ? (
            <div className={`mt-6 rounded-lg p-4 text-sm ${
                currentFeedback?.isCorrect 
                ? 'bg-green-50 text-green-800 border border-green-100' 
                : 'bg-amber-50 text-amber-900 border border-amber-100'
            }`}>
                <div className="flex items-center gap-2 mb-1 font-bold">
                    {currentFeedback?.isCorrect ? (
                        <>
                            <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            回答正确
                        </>
                    ) : (
                        <>
                            <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            案情分析
                        </>
                    )}
                </div>
                {currentFeedback?.explanation}
            </div>
            ) : null}

            <div className="mt-8 flex items-center justify-between border-t border-zinc-100 pt-6">
                <Button type="button" variant="ghost" onClick={() => setViewMode('map')} className="text-zinc-400 hover:text-zinc-600">
                    暂时撤退
                </Button>
            {hasFeedback ? (
                <Button type="button" onClick={next} className="bg-zinc-900 text-white hover:bg-zinc-800 px-8">
                {currentIndex >= run.questions.length - 1 ? "领取线索 >>" : "继续调查 >>"}
                </Button>
            ) : (
                <Button type="button" onClick={() => void checkCurrent()} disabled={checking || !hasAnswered} className="bg-blue-600 text-white hover:bg-blue-500 px-8 shadow-md shadow-blue-200">
                {checking ? "核对中…" : "提交证据"}
                </Button>
            )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
