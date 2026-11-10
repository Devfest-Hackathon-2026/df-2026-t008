import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { javascript } from "@codemirror/lang-javascript";
import { indentUnit } from "@codemirror/language";
import { EditorState, Prec } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleHelp,
  Code2,
  Flag,
  Lightbulb,
  LockKeyhole,
  LogOut,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Terminal,
  Users,
  Volume2,
  VolumeX,
  X,
  BookOpen,
  Copy,
  Radio,
  CheckCircle2,
} from "lucide-react";
import { onAuthStateChanged, type User } from "firebase/auth";
import World from "./components/World";
import PixelSprite from "./components/PixelSprite";
import StageMap from "./components/StageMap";
import {
  CAMPAIGN_LAYERS,
  isStageUnlocked,
  layerForStage,
  stageIsComplete,
  stageProgress as getCampaignProgress,
} from "./lib/campaign";
import { courses } from "./content/courses";
import { javascriptWordGuide, pythonWordGuide } from "./content/campaign";
import { runCode, cancelRun } from "./lib/runner";
import { buildBossProblem } from "./lib/boss";
import { requestAiFeedback, requestAiHint } from "./lib/ai";
import { getRunFeedback } from "./lib/runFeedback";
import { RoomClient } from "./lib/rooms";
import {
  auth,
  googleLogin,
  guestLogin,
  logout,
  readCloudProgress,
  writeCloudProgress,
} from "./lib/firebase";
import {
  emptyProgress,
  loadProgress,
  saveProgress,
  mergeProgress,
  migrateProgress,
  type Progress,
} from "./lib/progress";
import type { Language, RunResult, RoomState } from "./types";

type View = "welcome" | "entering" | "game";
const languageNames = { javascript: "JavaScript", python: "Python" };
const aiEnabled = import.meta.env.VITE_ENABLE_AI === "true";
function GuideEntries({
  entries,
  kind,
}: {
  entries: string[][];
  kind: "reference" | "glossary";
}) {
  const [query, setQuery] = useState("");
  const normalize = (value: string) => value.normalize("NFKC").toLowerCase();
  const keyword = normalize(query.trim());
  const visible = entries.filter((entry) =>
    normalize(entry.join("\n")).includes(keyword),
  );
  const searchId = `guide-search-${kind}`;
  return (
    <>
      <div className="guide-search">
        <label htmlFor={searchId}>手引きを検索</label>
        <div className="guide-search-controls">
          <input
            id={searchId}
            type="search"
            placeholder="例：繰り返す、return"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query && (
            <button type="button" onClick={() => setQuery("")}>
              クリア
            </button>
          )}
        </div>
        <p role="status">
          {visible.length === 0
            ? "見つかりませんでした。別のことばで検索してみよう。"
            : `${visible.length} / ${entries.length} 件`}
        </p>
      </div>
      {visible.length > 0 &&
        (kind === "glossary" ? (
          <dl>
            {visible.map(([term, meaning]) => (
              <div key={term}>
                <dt>{term}</dt>
                <dd>{meaning}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <div className="reference-grid">
            {visible.map(([label, example, description, result]) => (
              <div key={label}>
                <b>{label}</b>
                {description && <p>{description}</p>}
                <pre>{example}</pre>
                {result?.split("\n").map((step, index) => (
                  <p key={index}>{step}</p>
                ))}
              </div>
            ))}
          </div>
        ))}
    </>
  );
}
function WordGuide({ language }: { language: Language }) {
  const words = language === "python" ? pythonWordGuide : javascriptWordGuide;
  return (
    <section className="word-guide" aria-labelledby="word-guide-title">
      <h2 id="word-guide-title">ことばの手引き</h2>
      <p>詳しくは自分でも調べてみよう！</p>
      <GuideEntries key={language} entries={words} kind="glossary" />
    </section>
  );
}
function tone(enabled: boolean, win = false) {
  if (!enabled) return;
  try {
    const c = new AudioContext();
    [0, 1, 2].slice(0, win ? 3 : 2).forEach((n) => {
      const o = c.createOscillator(),
        g = c.createGain();
      o.type = "square";
      o.frequency.value = [523.25, 659.25, 783.99][n];
      g.gain.setValueAtTime(0, c.currentTime + n * 0.11);
      g.gain.linearRampToValueAtTime(0.045, c.currentTime + n * 0.11 + 0.02);
      g.gain.exponentialRampToValueAtTime(
        0.001,
        c.currentTime + n * 0.11 + 0.45,
      );
      o.connect(g);
      g.connect(c.destination);
      o.start(c.currentTime + n * 0.11);
      o.stop(c.currentTime + n * 0.11 + 0.5);
    });
    setTimeout(() => c.close(), 1200);
  } catch {}
}
function App() {
  const [view, setView] = useState<View>("welcome");
  const viewRef = useRef<View>(view);
  viewRef.current = view;
  const [language, setLanguage] = useState<Language>("javascript");
  const [mode, setMode] = useState<"solo" | "coop">("solo");
  const [progress, setProgress] = useState<Progress>(() =>
    loadProgress("javascript"),
  );
  const [room, setRoom] = useState<RoomState | null>(null);
  const [connection, setConnection] = useState("disconnected");
  const [name, setName] = useState(
    () => localStorage.getItem("knot.name") || "旅するエンジニア",
  );
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [cloudReady, setCloudReady] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [result, setResult] = useState<RunResult | null>(null);
  const [running, setRunning] = useState(false);
  const [hintCount, setHintCount] = useState(0);
  const [aiHint, setAiHint] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [runFeedback, setRunFeedback] = useState("");
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackUnavailable, setFeedbackUnavailable] = useState(false);
  const feedbackRequest = useRef<AbortController | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const [modal, setModal] = useState<
    | "story"
    | "reference"
    | "glossary"
    | "help"
    | "ending"
    | "transition"
    | "integration"
    | "reset"
    | null
  >(null);
  const [integration, setIntegration] = useState<RunResult | null>(null);
  const [integrating, setIntegrating] = useState(false);
  const [justCompletedStage, setJustCompletedStage] = useState<number | null>(
    null,
  );
  const [sound, setSound] = useState(
    () => localStorage.getItem("knot.sound") === "true",
  );
  const [toast, setToast] = useState("");
  const [tab, setTab] = useState<"mission" | "results">("mission");
  const client = useRef<RoomClient | null>(null);
  const codeRef = useRef("");
  const generation = useRef(0);
  const uid = user && !user.isAnonymous ? user.uid : "guest";
  const uidRef = useRef(uid);
  uidRef.current = uid;
  const languageRef = useRef(language);
  languageRef.current = language;
  const course = courses[language];
  const stageIndex =
    mode === "coop" && room ? room.stageIndex : progress.stageIndex;
  const stage = course.stages[Math.min(stageIndex, course.stages.length - 1)];
  const solved = mode === "coop" && room ? room.solved : progress.solved;
  const problem = stage.problems.find((p) => p.id === activeId) || null;
  const allSolved = stage.problems.every((p) => solved.includes(p.id));
  const solvedCount = stage.problems.filter((p) =>
    solved.includes(p.id),
  ).length;
  const completed =
    mode === "coop" ? room?.completed === true : progress.completed;
  const campaignProgress = useMemo(
    () => getCampaignProgress(solved, course),
    [solved, course],
  );
  const depthProgress = campaignProgress.depth * 12;
  const layerIndex = layerForStage(stageIndex);
  const layerNames = CAMPAIGN_LAYERS.map((layer) => layer.name);
  const difficultyNames = ["入門", "応用", "上級", "最難関"];
  const stageStates = useMemo(
    () => ({
      unlocked: course.stages.flatMap((_, index) =>
        isStageUnlocked(index, course, solved) ? [index] : [],
      ),
      cleared: course.stages.flatMap((_, index) =>
        stageIsComplete(index, course, solved) ? [index] : [],
      ),
    }),
    [course, solved],
  );
  const stageTravelProgress =
    stage.kind === "boss"
      ? solvedCount / stage.problems.length
      : justCompletedStage === stageIndex
        ? 1
        : 0;
  const lockOwner = problem && room ? room.locks[problem.id] : null;
  const mine = !lockOwner || lockOwner === client.current?.playerId;
  const playerName = room?.players.find((p) => p.id === lockOwner)?.name;
  const editable =
    mode === "solo" ||
    (connection === "connected" &&
      mine &&
      !!problem &&
      lockOwner === client.current?.playerId);
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function notify(message: string) {
    setToast(message);
  }
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, (u) => setUser(u));
  }, []);
  useEffect(() => {
    let alive = true;
    const local = loadProgress(language, uid);
    setCloudReady("");
    setProgress(local);
    if (user && !user.isAnonymous) {
      readCloudProgress(uid, language)
        .then((p) => {
          if (alive) {
            if (p)
              setProgress((current) =>
                mergeProgress(current, migrateProgress(language, p), language),
              );
            setCloudReady(`${uid}:${language}`);
          }
        })
        .catch(() =>
          notify(
            "クラウド保存を読み込めませんでした。この端末の記録で続けられます。",
          ),
        );
    }
    return () => {
      alive = false;
    };
  }, [language, uid]);
  useEffect(() => {
    if (mode !== "solo") return;
    const t = setTimeout(() => {
      try {
        saveProgress(language, progress, uid);
      } catch {
        notify(
          "端末への保存に失敗しました。ブラウザの空き容量を確認してください。",
        );
      }
      if (user && !user.isAnonymous && cloudReady === `${uid}:${language}`)
        writeCloudProgress(uid, language, progress).catch(() =>
          notify("クラウドに接続できません。進捗はこの端末に保存しています。"),
        );
    }, 500);
    return () => clearTimeout(t);
  }, [progress, language, uid, user, mode, cloudReady]);
  useEffect(
    () => () => {
      client.current?.disconnect();
      cancelRun();
      feedbackRequest.current?.abort();
    },
    [],
  );
  useEffect(() => {
    if (mode === "coop" && room?.completed && view === "game")
      setModal("ending");
  }, [room?.completed, mode, view]);
  useEffect(() => {
    if (view === "game" && stageIndex > 0) setModal("story");
  }, [stageIndex]);
  useEffect(() => {
    const handler = () => {
      if (mode === "solo") {
        try {
          saveProgress(
            language,
            problem && editable
              ? {
                  ...progress,
                  drafts: { ...progress.drafts, [problem.id]: codeRef.current },
                  updatedAt: Date.now(),
                }
              : progress,
            uid,
          );
        } catch {}
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [progress, mode, language, uid, activeId, editable]);
  useEffect(() => {
    clearFeedback();
    setActiveId(null);
    setResult(null);
    setHintCount(0);
    setShowSolution(false);
    generation.current++;
    setRunning(false);
    setJustCompletedStage(null);
  }, [stageIndex, language, mode]);
  useEffect(() => {
    if (!problem) return;
    clearFeedback();
    const draft =
      mode === "coop" ? room?.drafts[problem.id] : progress.drafts[problem.id];
    setCode(draft ?? problem.starter);
    codeRef.current = draft ?? problem.starter;
    setResult(null);
    setHintCount(0);
    setShowSolution(false);
    setAiHint("");
    setAiLoading(false);
    setTab("mission");
    generation.current++;
    setRunning(false);
  }, [activeId]);
  useEffect(() => {
    if (mode === "coop" && problem && !editable) {
      const draft = room?.drafts[problem.id] ?? problem.starter;
      if (draft !== codeRef.current) {
        clearFeedback();
        setResult(null);
      }
      setCode(draft);
      codeRef.current = draft;
    }
  }, [room?.drafts, editable]);
  useEffect(() => {
    if (!problem || !editable) return;
    const t = setTimeout(() => {
      if (mode === "coop") client.current?.draft(problem.id, code);
      else
        setProgress((p) => ({
          ...p,
          drafts: { ...p.drafts, [problem.id]: code },
          updatedAt: Date.now(),
        }));
    }, 350);
    return () => clearTimeout(t);
  }, [code, activeId, editable]);

  function flushDraft() {
    if (!problem || !editable) return;
    const text = codeRef.current;
    if (mode === "solo") {
      try {
        saveProgress(
          language,
          {
            ...progress,
            drafts: { ...progress.drafts, [problem.id]: text },
            updatedAt: Date.now(),
          },
          uid,
        );
      } catch {}
    }
    if (mode === "coop") client.current?.draft(problem.id, text);
    else
      setProgress((p) => ({
        ...p,
        drafts: { ...p.drafts, [problem.id]: text },
        updatedAt: Date.now(),
      }));
  }
  function select(id: string) {
    if (id === activeId) return;
    if (running) cancelRun();
    flushDraft();
    if (mode === "coop") {
      if (activeId) client.current?.release(activeId);
      client.current?.lock(id);
    }
    setActiveId(id);
  }
  function closeProblem() {
    clearFeedback();
    if (running) cancelRun();
    flushDraft();
    if (mode === "coop" && activeId) client.current?.release(activeId);
    setActiveId(null);
    generation.current++;
    setRunning(false);
  }
  function enterWorld() {
    if (viewRef.current !== "welcome") return;
    viewRef.current = "entering";
    setModal(null);
    setView("entering");
  }
  function finishEntry() {
    if (viewRef.current !== "entering") return;
    viewRef.current = "game";
    setView("game");
    setModal(
      (mode === "solo" ? progress.completed : room?.completed)
        ? "ending"
        : "story",
    );
  }
  function visitStage(index: number) {
    if (
      viewRef.current === "entering" ||
      !isStageUnlocked(index, course, solved)
    )
      return;
    if (index === stageIndex && viewRef.current === "game") return;
    closeProblem();
    setJustCompletedStage(null);
    if (mode === "coop") {
      if (!client.current || connection !== "connected") return;
      client.current.selectStage(index);
    } else {
      setProgress((current) => ({
        ...current,
        version: 2,
        stageIndex: index,
        updatedAt: Date.now(),
      }));
    }
    if (viewRef.current === "welcome") enterWorld();
  }
  async function startSolo() {
    if (viewRef.current !== "welcome") return;
    setError("");
    client.current?.disconnect();
    client.current = null;
    setRoom(null);
    setMode("solo");
    localStorage.setItem("knot.name", name.trim() || "旅するエンジニア");
    if (auth)
      guestLogin().catch(() =>
        notify("ゲスト認証に接続できません。この端末で遊べます。"),
      );
    enterWorld();
  }
  async function connectRoom(join: boolean) {
    if (joining || viewRef.current !== "welcome") return;
    setJoining(true);
    setError("");
    const next = new RoomClient({
      onState: (s) => setRoom(s),
      onError: (m) => {
        setError(m);
        notify(m);
      },
      onStatus: (s) => setConnection(s),
    });
    try {
      client.current?.disconnect();
      client.current = next;
      if (auth) await guestLogin();
      if (join)
        await next.join(
          joinCode.trim().toUpperCase(),
          language,
          name.trim() || "旅するエンジニア",
        );
      else await next.create(language, name.trim() || "旅するエンジニア");
      localStorage.setItem("knot.name", name);
      setMode("coop");
      enterWorld();
    } catch (e) {
      next.disconnect();
      client.current = null;
      setError(
        e instanceof Error
          ? e.message
          : "ルームに接続できません。サーバーの起動を確認してください。",
      );
    } finally {
      setJoining(false);
    }
  }
  async function execute() {
    if (!problem || !editable || running) return;
    const p = problem;
    const submitted = codeRef.current;
    const current = generation.current;
    clearFeedback();
    setRunning(true);
    setResult(null);
    setTab("results");
    try {
      const res = await runCode(language, p, submitted);
      if (current !== generation.current) return;
      setResult(res);
      if (!res.passed) explainFailure(p.id, submitted, res, current);
      if (res.passed) {
        if (!solved.includes(p.id) && solvedCount === stage.problems.length - 1)
          setJustCompletedStage(stageIndex);
        if (mode === "coop") {
          client.current?.draft(p.id, submitted);
          client.current?.solve(p.id);
        } else
          setProgress((prev) => ({
            ...prev,
            solved: [...new Set([...prev.solved, p.id])],
            drafts: { ...prev.drafts, [p.id]: submitted },
            updatedAt: Date.now(),
          }));
        tone(sound, solvedCount === stage.problems.length - 1);
        notify("拠点のロックを解除。次のステージが開いた！");
      }
    } catch (e) {
      if (current === generation.current) {
        const failure: RunResult = {
          passed: false,
          tests: [],
          duration: 0,
          error:
            e instanceof Error
              ? e.message
              : "実行できませんでした。もう一度お試しください。",
        };
        setResult(failure);
        explainFailure(p.id, submitted, failure, current);
      }
    } finally {
      if (current === generation.current) setRunning(false);
    }
  }
  function dismissModal() {
    if (integrating) {
      generation.current++;
      cancelRun();
      setIntegrating(false);
    }
    setModal(null);
  }
  async function integrate() {
    const current = ++generation.current;
    setIntegration(null);
    setIntegrating(true);
    setModal("integration");
    try {
      const b = buildBossProblem(
        language,
        mode === "coop" ? (room?.drafts ?? {}) : progress.drafts,
      );
      const res = await runCode(language, b.problem, b.code);
      if (current !== generation.current) return;
      setIntegration(res);
      if (res.passed) tone(sound, true);
    } finally {
      if (current === generation.current) setIntegrating(false);
    }
  }
  function advance() {
    closeProblem();
    if (stageIndex === course.stages.length - 1) {
      if (mode === "coop") client.current?.advance();
      else
        setProgress((p) => ({ ...p, completed: true, updatedAt: Date.now() }));
      setModal("ending");
      tone(sound, true);
      return;
    }
    if (mode === "coop") client.current?.advance();
    else
      setProgress((p) => ({
        ...p,
        stageIndex: p.stageIndex + 1,
        updatedAt: Date.now(),
      }));
    setModal("story");
  }
  function leave() {
    window.scrollTo({ top: 0 });
    closeProblem();
    client.current?.disconnect();
    client.current = null;
    setRoom(null);
    viewRef.current = "welcome";
    setView("welcome");
    setModal(null);
    setError("");
  }
  async function login() {
    setError("");
    try {
      const previousUid = uidRef.current;
      const u = await googleLogin();
      const languages: Language[] = ["javascript", "python"];
      for (const l of languages) {
        const localMerged = mergeProgress(
          loadProgress(l, previousUid),
          loadProgress(l, u.uid),
          l,
        );
        saveProgress(l, localMerged, u.uid);
        if (l === languageRef.current && uidRef.current === u.uid)
          setProgress(localMerged);
      }
      let synced = true;
      for (const l of languages) {
        try {
          const cloud = await readCloudProgress(u.uid, l);
          const merged = cloud
            ? mergeProgress(
                loadProgress(l, u.uid),
                migrateProgress(l, cloud),
                l,
              )
            : loadProgress(l, u.uid);
          saveProgress(l, merged, u.uid);
          if (l === languageRef.current && uidRef.current === u.uid)
            setProgress(merged);
          await writeCloudProgress(u.uid, l, merged);
        } catch {
          synced = false;
        }
      }
      notify(
        synced
          ? "両コースの進捗をGoogleアカウントに引き継ぎました。"
          : "両コースの進捗はこの端末に引き継ぎました。クラウドとの接続は確認できていません。",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "ログインできませんでした。");
    }
  }
  function setDraft(value: string) {
    clearFeedback();
    setCode(value);
    codeRef.current = value;
    setResult(null);
  }
  function clearFeedback() {
    feedbackRequest.current?.abort();
    feedbackRequest.current = null;
    setRunFeedback("");
    setFeedbackLoading(false);
    setFeedbackUnavailable(false);
  }
  function explainFailure(
    problemId: string,
    submitted: string,
    failure: RunResult,
    current: number,
  ) {
    if (!aiEnabled) return;
    const controller = new AbortController();
    feedbackRequest.current = controller;
    setFeedbackLoading(true);
    const isCurrent = () =>
      !controller.signal.aborted &&
      feedbackRequest.current === controller &&
      current === generation.current;
    void requestAiFeedback(
      language,
      problemId,
      submitted,
      failure,
      controller.signal,
    )
      .then((text) => {
        if (isCurrent()) setRunFeedback(text);
      })
      .catch(() => {
        if (isCurrent()) setFeedbackUnavailable(true);
      })
      .finally(() => {
        if (isCurrent()) {
          setFeedbackLoading(false);
          feedbackRequest.current = null;
        }
      });
  }
  async function askAi() {
    if (!problem || aiLoading) return;
    const current = generation.current;
    setAiLoading(true);
    try {
      const text = await requestAiHint(
        language,
        problem.id,
        codeRef.current,
        Math.min(hintCount, 3),
      );
      if (current === generation.current) setAiHint(text);
    } catch (e) {
      notify(
        e instanceof Error
          ? e.message
          : "AIに接続できません。用意されたヒントを使えます。",
      );
    } finally {
      if (current === generation.current) setAiLoading(false);
    }
  }
  const percent = Math.round((solvedCount / stage.problems.length) * 100);
  const world = (
    <World
      phase={
        view === "welcome"
          ? "overview"
          : view === "entering"
            ? "entering"
            : "playing"
      }
      onEntered={finishEntry}
      depthProgress={depthProgress}
      completed={completed}
      onSelectStage={visitStage}
      unlockedStageIndices={stageStates.unlocked}
      clearedStageIndices={stageStates.cleared}
      stageProgress={stageTravelProgress}
      solved={solved}
      problems={stage.problems}
      activeProblemId={activeId}
      onSelect={view === "game" ? select : () => {}}
      stageIndex={stageIndex}
      gateOpen={view === "game" && allSolved}
      players={mode === "coop" ? room?.players : undefined}
      playerId={client.current?.playerId}
      onMove={
        mode === "coop" ? (x, z) => client.current?.move(x, z) : undefined
      }
      reducedMotion={reduced}
    />
  );
  return (
    <div
      className={`app ${view === "welcome" ? "is-welcome" : ""} ${view === "entering" ? "is-entering" : ""} ${problem ? "has-editor" : ""}`}
    >
      <header className="topbar">
        <button
          className="brand"
          onClick={() => {
            if (view !== "welcome") leave();
          }}
          aria-label="Please ホーム"
        >
          <span className="brand-icon">▦</span>Please
          <span className="brand-period">.</span>
        </button>
        <span className="brand-tagline">コードで世界をつなぐ。</span>
        <div className="topbar-right">
          <span className="prototype">NETWORK RPG // v0.1</span>
          <button
            className="icon-button"
            title={sound ? "音をオフ" : "音をオン"}
            aria-label={sound ? "音をオフ" : "音をオン"}
            onClick={() =>
              setSound((v) => {
                localStorage.setItem("knot.sound", String(!v));
                return !v;
              })
            }
          >
            {sound ? <Volume2 size={17} /> : <VolumeX size={17} />}
          </button>
          <button
            className="icon-button"
            onClick={() => setModal("help")}
            disabled={view === "entering"}
            aria-label="操作ガイド"
          >
            <CircleHelp size={18} />
          </button>
          {view !== "welcome" && (
            <button className="exit-button" onClick={leave}>
              <LogOut size={15} /> 冒険を中断
            </button>
          )}
        </div>
      </header>
      <div
        className={`world-viewport ${view === "welcome" ? "welcome-world" : "game-world"}`}
      >
        {world}
      </div>
      {view === "entering" && (
        <section
          className="world-entry"
          aria-label="ワールドへの参戦"
          aria-busy="true"
        >
          <div className="entry-reticle" aria-hidden="true">
            <span />
            <i />
          </div>
          <div className="entry-message">
            <span className="eyebrow">ENTER THE COMMONS</span>
            <h1 role="status">ワールドに参戦中</h1>
            <p>
              {stageIndex === 0
                ? "拠点01へ接続。ここから中心を目指そう。"
                : `${layerNames[layerIndex]}から探索を再開しよう。`}
            </p>
            <div className="entry-progress" aria-hidden="true">
              <i />
            </div>
            <button className="text-button" onClick={finishEntry}>
              演出をスキップ <ArrowRight size={14} />
            </button>
          </div>
        </section>
      )}
      {view === "welcome" ? (
        <>
          <main className="welcome-content">
            <div className="eyebrow">
              <span className="live-dot" /> ENTER THE CODE NETWORK_
            </div>
            <div className="welcome-game-title" aria-hidden="true">
              Please<span>CONNECT THE WORLD</span>
            </div>
            <h1>
              コードで道を開け。
              <br />
              球の中心を目指せ。
            </h1>
            <p className="welcome-lead">
              問題を解くほど球の奥深くへ。
              <br />
              外縁から層を突破し中心のコアを復旧しよう。
            </p>
            <section className="launch-card">
              <div className="console-window-bar">
                <span>PLAYER ENTRY</span>
                <span>■ ■ ×</span>
              </div>
              <div className="launch-label">
                <span>01</span> 冒険するコースを選ぼう
              </div>
              <div className="course-options">
                {(["javascript", "python"] as Language[]).map((l) => (
                  <button
                    key={l}
                    className={`course-option ${language === l ? "selected" : ""}`}
                    onClick={() => setLanguage(l)}
                  >
                    <span className={`lang-icon ${l}`}>
                      {l === "javascript" ? "JS" : "Py"}
                    </span>
                    <div>
                      <b>{languageNames[l]}</b>
                      <small>
                        {l === "javascript"
                          ? "Webを動かす言葉"
                          : "読みやすくはじめやすい言葉"}
                      </small>
                    </div>
                    {language === l && <Check size={17} />}
                  </button>
                ))}
              </div>
              <div className="launch-label second">
                <span>02</span> どうやって冒険する？
              </div>
              <div className="mode-options">
                <button
                  className={mode === "solo" ? "selected" : ""}
                  onClick={() => setMode("solo")}
                >
                  <Flag size={16} />
                  ひとりで冒険<small>自分のペースで</small>
                </button>
                <button
                  className={mode === "coop" ? "selected" : ""}
                  onClick={() => setMode("coop")}
                >
                  <Users size={17} />
                  仲間と協力<small>2〜4人で分担</small>
                </button>
              </div>
              {mode === "coop" && (
                <div className="coop-setup">
                  <label>
                    冒険者の名前
                    <input
                      maxLength={20}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </label>
                  <div className="join-row">
                    <input
                      aria-label="ルームコード"
                      placeholder="ルームコード"
                      maxLength={8}
                      value={joinCode}
                      onChange={(e) =>
                        setJoinCode(e.target.value.toUpperCase())
                      }
                    />
                    <button
                      disabled={joining || !joinCode.trim()}
                      onClick={() => connectRoom(true)}
                    >
                      参加 <ArrowUpRight size={15} />
                    </button>
                  </div>
                  <p>同じコースの仲間と接続。ソロの進捗には影響しません。</p>
                </div>
              )}
              {error && (
                <p className="inline-error" role="alert">
                  {error}
                </p>
              )}
              <button
                className="primary launch-button"
                disabled={joining}
                onClick={() =>
                  mode === "solo" ? startSolo() : connectRoom(false)
                }
              >
                {joining
                  ? "接続しています…"
                  : mode === "coop"
                    ? "新しいルームをつくる"
                    : "ワールドに参戦する"}
                <ArrowRight size={18} />
              </button>
              {progress.solved.length > 0 && mode === "solo" && (
                <button
                  className="restart-link"
                  onClick={() => setModal("reset")}
                >
                  このコースを最初から遊ぶ
                </button>
              )}
              <div className="login-line">
                {user && !user.isAnonymous ? (
                  <>
                    <CheckCircle2 size={13} />
                    {user.displayName || "Google"} として保存中
                    <button onClick={() => logout()}>ログアウト</button>
                  </>
                ) : (
                  <>
                    <span>ゲストで開始・この端末に自動保存</span>
                    <button onClick={login}>
                      Googleで保存 <ArrowUpRight size={12} />
                    </button>
                  </>
                )}
              </div>
            </section>
            <div className="welcome-footer">
              <span>
                <Code2 size={14} /> 知識ゼロからはじめられる。
              </span>
              <span>PC / KEYBOARD + MOUSE</span>
            </div>
          </main>
          <div className="welcome-world-caption">
            <span className="live-dot" /> OUTER → MIDDLE → INNER → CORE <i /> 54
            STAGES
          </div>
        </>
      ) : view === "game" ? (
        <>
          <main className="game-layout">
            <aside className="sidebar">
              <div className="eyebrow">
                MISSION CONTROL <span className="small-line" />
              </div>
              <h1>
                CORE ROUTE
                <span className="hud-world-name">仮想世界 コモンズ</span>
              </h1>
              <p className="sidebar-intro">
                {stage.kind === "boss"
                  ? "中心核の復旧処理を完成させよう。"
                  : `${layerNames[layerIndex]}のロックを解いて中心へ。`}
              </p>
              <div className="course-pill">
                <span className={`lang-icon small ${language}`}>
                  {language === "javascript" ? "JS" : "Py"}
                </span>
                {course.label}
                <span>{mode === "solo" ? "SOLO" : "CO-OP"}</span>
              </div>
              <StageMap
                course={course}
                selectedIndex={stageIndex}
                solved={solved}
                completed={completed}
                onSelect={visitStage}
                disabled={mode === "coop" && connection !== "connected"}
              />
              <button
                className="reference-link"
                onClick={() => setModal("reference")}
              >
                <BookOpen size={17} />
                <span>
                  コードの手引き<small>いつでもここでおさらい。</small>
                </span>
                <ArrowUpRight size={16} />
              </button>
              <button
                className="reference-link"
                aria-label="ことばの手引き"
                onClick={() => setModal("glossary")}
              >
                <BookOpen size={17} />
                <span>
                  ことばの手引き<small>ことばの意味を調べる。</small>
                </span>
                <ArrowUpRight size={16} />
              </button>
              <div className="save-indicator">
                <span className="live-dot" />
                {mode === "coop"
                  ? "ルームの進行を共有中"
                  : user && !user.isAnonymous
                    ? "端末とクラウドに自動保存"
                    : "この端末に自動保存"}
              </div>
            </aside>
            <section className="world-section" aria-label="3Dの冒険空間">
              <div className="chapter-bar">
                <div>
                  <span className="eyebrow">
                    {stage.kind === "boss"
                      ? "FINAL OPERATION"
                      : "DESCEND TO THE CORE"}
                  </span>
                  <h2>
                    {layerNames[layerIndex]}・{difficultyNames[layerIndex]} /{" "}
                    {String(stageIndex + 1).padStart(2, "0")}
                  </h2>
                </div>
                <button
                  className="story-button"
                  onClick={() => setModal("story")}
                >
                  <BookOpen size={14} /> 物語
                </button>
              </div>
              <div className="world-label">
                <span>
                  {allSolved ? "CONNECTION RESTORED" : "SYSTEM CORRUPTED"}
                </span>
                <b>
                  {stage.kind === "boss"
                    ? "THE WORLD CORE"
                    : `${layerNames[layerIndex]} → CORE`}
                </b>
                <small>
                  {campaignProgress.allComplete
                    ? "中心に到達。最後の接続を実行しよう。"
                    : `拠点 ${stageIndex + 1} / ${course.stages.length} ・ ${stage.problems[0]?.concept}`}
                </small>
              </div>
              {allSolved && (
                <div className="gate-banner">
                  <ShieldCheck size={23} />
                  <div>
                    <b>
                      {stage.kind === "boss"
                        ? "すべての復旧処理が完成！"
                        : "すべてのロックを解除しました"}
                    </b>
                    <small>
                      {stage.kind === "boss"
                        ? "最後の接続を実行しよう。"
                        : "次の拠点が解放された。中心へ進もう。"}
                    </small>
                  </div>
                  <button
                    className="primary"
                    onClick={() =>
                      stage.kind === "boss"
                        ? integrate()
                        : setModal("transition")
                    }
                  >
                    {stage.kind === "boss" ? "世界をつなぐ" : "次の拠点へ"}
                    <ArrowRight size={16} />
                  </button>
                </div>
              )}
              <div className="world-bottom">
                <span>
                  <kbd>W A S D</kbd> 移動 <i>·</i> ドラッグで視点を回す
                </span>
                <span className="sector">
                  SECTOR {String(stageIndex + 1).padStart(2, "0")}
                </span>
              </div>
              {mode === "coop" && room ? (
                <div className="crew-card">
                  <div className="crew-header">
                    <span>
                      <Radio size={13} />
                      {connection === "connected"
                        ? "LIVE CO-OP"
                        : "接続が切れました"}
                    </span>
                    <button
                      title="コードをコピー"
                      onClick={() =>
                        navigator.clipboard
                          .writeText(room.code)
                          .then(() => notify("ルームコードをコピーしました。"))
                          .catch(() => notify(`ルームコード: ${room.code}`))
                      }
                    >
                      {room.code}
                      <Copy size={12} />
                    </button>
                  </div>
                  <div className="crew-members">
                    {room.players.map((p) => (
                      <span
                        key={p.id}
                        title={p.name}
                        style={
                          { "--avatar-color": p.color } as React.CSSProperties
                        }
                      >
                        <i>{p.name.slice(0, 1)}</i>
                        {p.name}
                        {p.id === client.current?.playerId && (
                          <small>YOU</small>
                        )}
                      </span>
                    ))}
                  </div>
                  <small>
                    同じコースの仲間を招待 · {room.players.length} / 4
                  </small>
                  {connection === "disconnected" && (
                    <button className="text-button" onClick={leave}>
                      ホームに戻って再接続
                    </button>
                  )}
                </div>
              ) : (
                <div className="solo-note">
                  <span className="avatar-self">
                    <PixelSprite kind="player" />
                  </span>
                  <div>
                    <b>今日はどこまでつなごう。</b>
                    <small>失敗しても大丈夫。何度でも挑戦できる。</small>
                  </div>
                  <span>SOLO JOURNEY</span>
                </div>
              )}
            </section>
            <aside className="mission-sidebar">
              <div className="mission-heading">
                <div className="eyebrow">NETWORK RECOVERY</div>
                <div className="percent">
                  {percent}
                  <span>%</span>
                  <small>
                    {solvedCount} / {stage.problems.length} 接続を復旧
                  </small>
                </div>
                <div className="progress-track">
                  <i style={{ width: `${percent}%` }} />
                </div>
              </div>
              <div className="mission-list-title">
                {stage.kind === "boss"
                  ? "BUILD THE RECOVERY SYSTEM"
                  : "RESTORE THE TERMINALS"}
                <span>
                  {String(stage.problems.length).padStart(2, "0")} NODES
                </span>
              </div>
              <div className="mission-list">
                {stage.problems.map((p, i) => (
                  <button
                    key={p.id}
                    className={`mission ${solved.includes(p.id) ? "done" : ""} ${activeId === p.id ? "selected" : ""}`}
                    onClick={() => select(p.id)}
                  >
                    <span className="mission-icon">
                      {solved.includes(p.id) ? (
                        <Check size={17} />
                      ) : (
                        String(i + 1).padStart(2, "0")
                      )}
                    </span>
                    <span>
                      <b>{p.title}</b>
                      <small>{p.concept}</small>
                    </span>
                    <span className="mission-arrow">
                      {solved.includes(p.id) ? "✓" : <ArrowUpRight size={16} />}
                    </span>
                  </button>
                ))}
              </div>
              <div className="navi-card">
                <div className="navi-header">
                  <PixelSprite />
                  <b>
                    NAVI<small>SUPPORT UNIT / ONLINE</small>
                  </b>
                </div>
                <p>
                  {allSolved
                    ? "全部つながった！ あなたのコードでこの世界がまた少し元気になったよ。"
                    : stage.kind === "boss"
                      ? "いよいよ君がコードを書く番。手引きもヒントも使っていい。一緒に世界をつなごう。"
                      : "まずは端末を選んでみよう。何を直せばいいか一緒に考えていこう。"}
                </p>
                <button onClick={() => setModal("reference")}>
                  コードの手引きを見る
                  <ArrowUpRight size={13} />
                </button>
              </div>
              <div className="no-pressure">
                <ShieldCheck size={15} />
                時間制限なし・何度でも挑戦できる
              </div>
            </aside>
          </main>
          {problem && (
            <>
              <button
                className="drawer-scrim"
                aria-label="端末を閉じる"
                onClick={closeProblem}
              />
              <section
                className="editor-drawer"
                aria-label={`${problem.title}の問題`}
              >
                <div className="editor-header">
                  <span>
                    <Terminal size={15} /> MISSION TERMINAL
                  </span>
                  <button
                    className="icon-button"
                    aria-label="端末を閉じる"
                    onClick={closeProblem}
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="editor-body">
                  <div className="editor-kicker">
                    {stage.kind === "boss"
                      ? "WRITE YOUR OWN CODE"
                      : "REPAIR THE CONNECTION"}
                    <span>{problem.concept}</span>
                  </div>
                  <h2>
                    {problem.title}
                    {solved.includes(problem.id) && <CheckCircle2 size={22} />}
                  </h2>
                  <p className="briefing">{problem.briefing}</p>
                  <div className="objective">
                    <Flag size={15} />
                    <p>{problem.objective}</p>
                  </div>
                  {!editable && (
                    <div className="lock-notice">
                      <LockKeyhole size={14} />
                      {connection !== "connected" && mode === "coop"
                        ? "再接続するまで編集できません。"
                        : solved.includes(problem.id)
                          ? "この端末は修復済みです。仲間のコードを振り返ってみよう。"
                          : `${playerName || "仲間"} が修復中。コードを見ながら応援しよう。`}
                      {mine &&
                        !solved.includes(problem.id) &&
                        connection === "connected" && (
                          <button
                            onClick={() => client.current?.lock(problem.id)}
                          >
                            担当する
                          </button>
                        )}
                    </div>
                  )}
                  <div className="file-bar">
                    <span>
                      <Code2 size={14} />
                      {problem.functionName}.
                      {language === "python" ? "py" : "js"}
                    </span>
                    <button
                      title="初期コードに戻す"
                      disabled={!editable || running}
                      onClick={() => {
                        if (confirm("編集中のコードを初期状態に戻しますか？"))
                          setDraft(problem.starter);
                      }}
                    >
                      <RotateCcw size={13} />
                      リセット
                    </button>
                  </div>
                  <CodeMirror
                    key={`${language}:${problem.id}`}
                    className="game-code-editor"
                    value={code}
                    height="280px"
                    readOnly={!editable || running}
                    indentWithTab={true}
                    basicSetup={{
                      lineNumbers: true,
                      foldGutter: false,
                      autocompletion: false,
                      completionKeymap: false,
                      bracketMatching: true,
                      closeBrackets: true,
                      highlightActiveLine: true,
                      indentOnInput: true,
                    }}
                    extensions={[
                      // 選択した言語の色分け・インデントに対応
                      language === "python" ? python() : javascript(),

                      // インデント1段を空白4つにする
                      indentUnit.of("    "),
                      EditorState.tabSize.of(4),

                      EditorView.contentAttributes.of({
                        "aria-label": "コードエディタ",
                      }),

                      // CodeMirror標準のキー操作より優先して実行する
                      Prec.highest(
                        keymap.of([
                          {
                            key: "Mod-Enter",
                            run: () => {
                              void execute();
                              return true;
                            },
                          },
                        ]),
                      ),
                    ]}
                    onChange={(value) => setDraft(value)}
                  />
                  <div className="editor-caption">
                    <span>
                      {stage.kind === "boss"
                        ? "↳ 学んだことを組み合わせて書いてみよう"
                        : "↳ コードを直して実行してみよう"}
                    </span>
                    <span>UTF-8</span>
                  </div>
                  <button
                    className="primary run-button"
                    disabled={running || !editable}
                    onClick={execute}
                  >
                    <Play size={15} fill="currentColor" />
                    {running
                      ? language === "python"
                        ? "Pythonを準備・実行しています…"
                        : "コードを実行しています…"
                      : "コードを実行"}
                    <kbd>⌘ / Ctrl ↵</kbd>
                  </button>
                  {aiEnabled && (
                    <p className="runtime-note ai-feedback-note">
                      つまずいたときは問題・コード・実行結果をGeminiに送り、NAVIが見直すヒントを伝えます。
                    </p>
                  )}
                  {language === "python" && (
                    <p className="runtime-note">
                      初回はPython実行環境をダウンロードします（ネット接続が必要）。
                    </p>
                  )}
                  <div className="panel-tabs">
                    <button
                      className={tab === "mission" ? "active" : ""}
                      onClick={() => setTab("mission")}
                    >
                      <Lightbulb size={14} />
                      ヒントと解説
                    </button>
                    <button
                      className={tab === "results" ? "active" : ""}
                      onClick={() => setTab("results")}
                    >
                      <Terminal size={14} />
                      実行結果
                      {result && (
                        <span
                          className={result.passed ? "ok-dot" : "bad-dot"}
                        />
                      )}
                    </button>
                  </div>
                  {tab === "results" ? (
                    <div className="result-panel" aria-live="polite">
                      {running ? (
                        <div className="running-state">
                          <span className="spinner" />
                          <b>コードの接続を確認中…</b>
                          <p>
                            無限ループなどで止まった場合は自動で実行を終了します。
                          </p>
                        </div>
                      ) : result ? (
                        <>
                          <div
                            className={`result-status ${result.passed ? "success" : "failure"}`}
                          >
                            {result.passed ? (
                              <ShieldCheck size={20} />
                            ) : (
                              <Code2 size={20} />
                            )}
                            <div>
                              <b>
                                {result.passed
                                  ? "接続を復旧しました！"
                                  : "あと少し。コードを見直してみよう。"}
                              </b>
                              <small>
                                {result.tests.length
                                  ? `${result.tests.filter((t) => t.passed).length} / ${result.tests.length} テスト成功`
                                  : "コードの実行を完了できませんでした"}
                              </small>
                            </div>
                          </div>
                          {!result.passed && (
                            <section
                              className="run-feedback"
                              aria-label="NAVIからのアドバイス"
                              aria-busy={feedbackLoading}
                            >
                              <div className="run-feedback-heading">
                                <PixelSprite />
                                <b>NAVIと見直そう</b>
                              </div>
                              <p>
                                {runFeedback || getRunFeedback(result, language)}
                              </p>
                              {feedbackLoading && (
                                <small role="status">
                                  Geminiがコードと結果を見ながら説明を考えています…
                                </small>
                              )}
                              {runFeedback && (
                                <small>
                                  Geminiからのヒントです。直したらもう一度実行して確かめよう。
                                </small>
                              )}
                              {feedbackUnavailable && (
                                <small>
                                  Geminiにつながらないため通常のガイドを表示しています。ヒントと解説も使えます。
                                </small>
                              )}
                            </section>
                          )}
                          {result.error && (
                            <details className="error-details">
                              <summary>エラーの詳細を見る</summary>
                              <pre className="error-message">{result.error}</pre>
                            </details>
                          )}
                          {result.tests.map((t, i) => (
                            <div
                              className={`test-result ${t.passed ? "passed" : ""}`}
                              key={i}
                            >
                              <span>
                                {t.passed ? (
                                  <Check size={15} />
                                ) : (
                                  <X size={15} />
                                )}
                              </span>
                              <div>
                                <b>{t.label}</b>
                                {!t.passed && (
                                  <>
                                    <small>
                                      期待する結果:{" "}
                                      <code>{JSON.stringify(t.expected)}</code>
                                    </small>
                                    <small>
                                      実際の結果:{" "}
                                      <code>
                                        {t.error
                                          ? "この入力の処理中に止まりました"
                                          : JSON.stringify(t.actual) ||
                                            "値が返されていません"}
                                      </code>
                                    </small>
                                    {t.error && (
                                      <details className="error-details">
                                        <summary>エラーの詳細を見る</summary>
                                        <pre className="error-message">{t.error}</pre>
                                      </details>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                          {result.passed && (
                            <>
                              <p className="explanation">
                                {problem.explanation}
                              </p>
                              <button
                                className="secondary"
                                onClick={() => {
                                  const next = stage.problems.find(
                                    (p) =>
                                      !solved.includes(p.id) &&
                                      p.id !== problem.id,
                                  );
                                  if (next) select(next.id);
                                  else closeProblem();
                                }}
                              >
                                {stage.problems.some(
                                  (p) =>
                                    !solved.includes(p.id) &&
                                    p.id !== problem.id,
                                )
                                  ? "次の端末へ"
                                  : "広場に戻る"}
                                <ArrowRight size={15} />
                              </button>
                            </>
                          )}
                        </>
                      ) : (
                        <p className="empty-result">
                          「コードを実行」を押すとここに結果が表示されます。
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="hints-panel">
                      <div className="hint-intro">
                        <PixelSprite />
                        <p>
                          すぐに答えが分からなくても大丈夫。
                          <br />
                          少しずつ一緒に考えよう。
                        </p>
                      </div>
                      {problem.hints.slice(0, hintCount).map((h, i) => (
                        <div className="hint" key={i}>
                          <span>HINT {String(i + 1).padStart(2, "0")}</span>
                          <p>{h}</p>
                        </div>
                      ))}
                      {hintCount < problem.hints.length ? (
                        <button
                          className="secondary"
                          onClick={() => setHintCount((c) => c + 1)}
                        >
                          <Lightbulb size={15} />
                          {hintCount ? "次のヒントを見る" : "ヒントをもらう"}
                          <ChevronDown size={15} />
                        </button>
                      ) : (
                        <button
                          className="text-button"
                          onClick={() => setShowSolution((s) => !s)}
                        >
                          {showSolution
                            ? "修正例を閉じる"
                            : "考え方と修正例を見る"}
                          <ChevronDown size={14} />
                        </button>
                      )}
                      {showSolution && (
                        <div className="solution">
                          <p>{problem.explanation}</p>
                          <pre>{problem.solution}</pre>
                          <button
                            className="secondary"
                            disabled={!editable}
                            onClick={() => {
                              setDraft(problem.solution);
                              notify(
                                "修正例を入れました。実行して動きを確かめよう。",
                              );
                            }}
                          >
                            修正例をエディタに入れる
                          </button>
                        </div>
                      )}
                      {aiEnabled && (
                        <div className="ai-live">
                          <button
                            className="secondary"
                            disabled={aiLoading || running}
                            onClick={askAi}
                          >
                            <Sparkles size={14} />
                            {aiLoading
                              ? "NAVIが考えています…"
                              : "Geminiに相談する"}
                          </button>
                          {aiHint && <p>{aiHint}</p>}
                          <small>
                            問題と今のコードをGoogle Geminiへ送って相談します。
                          </small>
                        </div>
                      )}
                      <p className="curated-note">
                        この問題に合わせた段階式の学習ガイドです。
                      </p>
                    </div>
                  )}
                </div>
              </section>
            </>
          )}
        </>
      ) : null}
      {modal && (
        <div className="modal-backdrop" onClick={dismissModal}>
          <section
            className={`modal ${modal === "ending" ? "ending" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-label={
              modal === "reference"
                ? "コードの手引き"
                : modal === "glossary"
                  ? "ことばの手引き"
                  : modal === "help"
                    ? "操作ガイド"
                    : "物語"
            }
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close icon-button"
              aria-label="閉じる"
              onClick={dismissModal}
            >
              <X size={20} />
            </button>
            {modal === "reset" ? (
              <>
                <div className="eyebrow">NEW JOURNEY</div>
                <h2>最初から冒険しますか？</h2>
                <p className="story-text">
                  {languageNames[language]}
                  コースのソロの進捗と編集中のコードをリセットします。もう一方のコースや協力ルームには影響しません。
                </p>
                <button
                  className="primary"
                  onClick={() => {
                    const fresh = emptyProgress();
                    saveProgress(language, fresh, uid);
                    setProgress(fresh);
                    setModal(null);
                    notify("新しい冒険の準備ができました。");
                  }}
                >
                  このコースの冒険をリセット
                  <RotateCcw size={16} />
                </button>
              </>
            ) : modal === "integration" ? (
              <>
                <span className="modal-symbol">
                  <PixelSprite />
                </span>
                <div className="eyebrow">FINAL SYSTEM CHECK</div>
                <h2>3つのコードをひとつに。</h2>
                <p className="story-text">
                  電力配分 → 復旧信号の集計 →
                  接続の認証。あなたたちが書いた関数をつないで世界全体の接続を確認します。
                </p>
                {integrating ? (
                  <div className="running-state">
                    <span className="spinner" />
                    <b>世界の接続を確認しています…</b>
                  </div>
                ) : (
                  integration && (
                    <>
                      <div
                        className={`result-status ${integration.passed ? "success" : "failure"}`}
                      >
                        <ShieldCheck size={19} />
                        <b>
                          {integration.passed
                            ? "世界のすべての接続が正常に戻った！"
                            : "接続が不安定です。関数を見直してみよう。"}
                        </b>
                      </div>
                      {!integration.passed && (
                        <p className="explanation">
                          {getRunFeedback(integration, language)}
                        </p>
                      )}
                      {integration.error && (
                        <details className="error-details">
                          <summary>エラーの詳細を見る</summary>
                          <pre className="error-message">{integration.error}</pre>
                        </details>
                      )}
                      {integration.tests.map((t, i) => (
                        <div
                          className={`test-result ${t.passed ? "passed" : ""}`}
                          key={i}
                        >
                          {t.passed ? <Check size={14} /> : <X size={14} />}
                          <b>{t.label}</b>
                        </div>
                      ))}
                      <button
                        className="primary"
                        style={{ marginTop: 20 }}
                        onClick={() =>
                          integration.passed ? advance() : setModal(null)
                        }
                      >
                        {integration.passed ? "世界を取り戻す" : "端末を見直す"}
                        <ArrowRight size={16} />
                      </button>
                    </>
                  )
                )}
              </>
            ) : modal === "transition" ? (
              <>
                <span className="modal-symbol">
                  <PixelSprite />
                </span>
                <div className="eyebrow">STAGE COMPLETE</div>
                <h2>拠点{String(stageIndex + 1).padStart(2, "0")}を修復。</h2>
                <p className="layer-briefing">
                  次は拠点
                  {String(
                    Math.min(stageIndex + 2, course.stages.length),
                  ).padStart(2, "0")}
                  。
                  {
                    layerNames[
                      layerForStage(
                        Math.min(stageIndex + 1, course.stages.length - 1),
                      )
                    ]
                  }
                  へ進もう。
                </p>
                <p className="story-text">{stage.outro}</p>
                <button className="primary" onClick={advance}>
                  次の拠点へ進む
                  <ArrowRight size={16} />
                </button>
              </>
            ) : modal === "story" ? (
              <>
                <span className="modal-symbol">
                  <PixelSprite />
                </span>
                <div className="eyebrow">
                  STAGE {String(stageIndex + 1).padStart(2, "0")} /{" "}
                  {course.stages.length} / {stage.location}
                </div>
                <h2>{stage.title}</h2>
                <p className="modal-subtitle">{stage.subtitle}</p>
                <p className="layer-briefing">
                  {layerNames[layerIndex]} /{" "}
                  {stage.kind === "boss"
                    ? "球の最奥。3つの関数を完成させ中心核へ到達しよう。"
                    : "この拠点の問題を解いて次のステージを解放しよう。"}
                </p>
                <p className="story-text">{stage.intro}</p>
                <div className="story-goal">
                  <Flag size={17} />
                  {stage.kind === "boss"
                    ? "3つの関数を一から実装し世界の接続を取り戻そう。"
                    : "問題を修復して次の拠点へのゲートを開こう。"}
                </div>
                <button className="primary" onClick={() => setModal(null)}>
                  この世界をつなぎにいこう
                  <ArrowRight size={17} />
                </button>
              </>
            ) : modal === "ending" ? (
              <>
                <span className="ending-symbol">
                  <PixelSprite kind="player" />
                </span>
                <div className="eyebrow">ALL CONNECTIONS RESTORED</div>
                <h2>
                  世界は
                  <br />
                  君のコードでつながった。
                </h2>
                <p className="story-text">
                  {course.stages[course.stages.length - 1].outro}
                </p>
                <div className="ending-stats">
                  <span>
                    <b>{course.stages.length}</b> STAGES
                  </span>
                  <span>
                    <b>
                      {course.stages.reduce((n, s) => n + s.problems.length, 0)}
                    </b>{" "}
                    CONNECTIONS
                  </span>
                  <span>
                    <b>{language === "python" ? "Py" : "JS"}</b> YOUR FIRST CODE
                  </span>
                </div>
                <p className="ending-note">
                  最初はたった一行だった。
                  <br />
                  次にどんな世界をつくるかはあなた次第。
                </p>
                <button
                  className="primary"
                  onClick={() => {
                    setModal(null);
                    leave();
                  }}
                >
                  冒険の記録を持って帰る
                  <ArrowRight size={17} />
                </button>
              </>
            ) : modal === "glossary" ? (
              <>
                <div className="eyebrow">
                  WORD GUIDE / {languageNames[language].toUpperCase()}
                </div>
                <WordGuide language={language} />
              </>
            ) : modal === "reference" ? (
              <>
                <div className="eyebrow">
                  FIELD GUIDE / {languageNames[language].toUpperCase()}
                </div>
                <h2>コードの手引き</h2>
                <p>
                  {language === "python"
                    ? "例を見ながら、必要なところだけ使ってみよう。# より右は説明で、実行されません。"
                    : "例を見ながら、必要なところだけ使ってみよう。// より右は説明で、実行されません。"}
                </p>
                <GuideEntries
                  key={language}
                  kind="reference"
                  entries={language === "javascript"
                    ? [
                        [
                          "値を保存する",
                          "let energy = 10;\nenergy = energy + 3;",
                          "let はあとで値を変えられる名前、const は代入し直さない名前を作ります。= は右側の値を左側の名前に保存します。",
                          "energy は最初に10になり、次の行で10 + 3を計算して13に変わります。",
                        ],
                        [
                          "文字を扱う",
                          'const name = "navi";\nconst message = "接続先: " + name;\nconst sign = name.toUpperCase();',
                          '文字や言葉は半角の " で囲みます。+ で文字同士をつなぎ、toUpperCase() で英字を大文字にします。',
                          "message は「接続先: navi」、sign は「NAVI」になります。",
                        ],
                        [
                          "計算する",
                          "const total = 3 + 2; // 5\nconst left = 3 - 2;  // 1\nconst power = 3 * 2; // 6\nconst share = 3 / 2; // 1.5\nconst rest = 3 % 2;  // 1",
                          "+ は足し算、- は引き算、* は掛け算、/ は割り算です。% は割った余りを求めます。",
                          "3を2で割ると1余るので、3 % 2 の結果は1です。計算結果はそれぞれ左側の名前に保存されます。",
                        ],
                        [
                          "結果を返す",
                          "function double(value) {\n  return value * 2;\n}",
                          "function で処理に名前を付けます。value は受け取る値の名前、return は答えを返す命令です。",
                          "double(3) を使うと、value に3が入り、3 × 2の答えである6を返します。このサイトでは返した答えで採点します。",
                        ],
                        [
                          "条件を調べる",
                          "const energy = 20;\nconst safe = true;\nconst same = energy === 20;\nconst ready = energy >= 10 && safe;",
                          "=== は「等しい」、>= は「以上」を調べます。&& は両方、|| は片方でも条件が成り立てばOKです。",
                          "20は20と等しいので same は true。20は10以上で safe も true なので、ready も true です。成り立たない場合は false になります。",
                        ],
                        [
                          "条件で分ける",
                          'function label(energy) {\n  if (energy >= 10) {\n    return "OK";\n  } else {\n    return "充電";\n  }\n}',
                          "if の条件が成り立つときは、その後の { } の中を実行します。成り立たないときは else の { } の中を実行します。",
                          "label(20) は「OK」、label(5) は「充電」を返します。どちらか一方の処理だけを実行します。",
                        ],
                        [
                          "配列を使う",
                          "const values = [2, 4];\nconst first = values[0];\nconst count = values.length;\nvalues.push(6);",
                          "[ ] で複数の値をまとめます。[0] は先頭の値、length は個数を調べます。push() は最後に値を足します。",
                          "first は2、追加前の個数を調べた count は2です。6を足した後の values は [2, 4, 6] になります。const で作った配列にも値を追加できます。",
                        ],
                        [
                          "二次元配列を使う",
                          "const grid = [\n  [1, 2, 3],\n  [4, 5, 6],\n];\nconst firstRow = grid[0];\nconst value = grid[0][1];\nconst rows = grid.length;\nconst columns = grid[0].length;",
                          "二次元配列は、値を行と列で並べたものです。行は横の並び、列は縦の並びです。1行ずつ配列にして、さらに1つの配列にまとめて表せます。この例は2行3列です。",
                          "grid[行の番号][列の番号] で値を取り出します。番号はどちらも0から数えます。\ngrid[0] は最初の行なので、firstRow は [1, 2, 3] です。grid[0][1] はその行の2番目の値なので、value は2です。\ngrid.length は行の数なので rows は2、grid[0].length は最初の行にある値の数なので columns は3です。",
                        ],
                        [
                          "配列の一部分を取り出す",
                          "const values = [10, 20, 30, 40];\nconst middle = values.slice(1, 3);\nconst tail = values.slice(2);\nconst head = values.slice(0, 2);",
                          "slice(開始位置, 終了位置) で一部分を取り出します。位置は0から数え、開始位置は含み、終了位置は含みません。終了位置を省略すると、最後まで取り出します。",
                          "values.slice(1, 3) は位置1と2の値なので、middle は [20, 30] です。\nvalues.slice(2) は位置2から最後までの [30, 40]、values.slice(0, 2) は先頭から位置2の手前までの [10, 20] です。元の values は変わりません。",
                        ],
                        [
                          "取り出した配列をつなぐ",
                          "const values = [10, 20, 30, 40];\nconst offset = 2;\nconst back = values.slice(offset);\nconst front = values.slice(0, offset);\nconst rotated = back.concat(front);",
                          "offset は、区切る位置を入れた変数です。この例は2なので、values.slice(offset) は values.slice(2) と同じです。concat() は、後ろに別の配列をつないだ新しい配列を作ります。",
                          "後半の back は [30, 40]、前半の front は [10, 20] です。\nback.concat(front) の結果は [30, 40, 10, 20]。元の values は変わりません。",
                        ],
                        [
                          "繰り返す",
                          "const values = [2, 4, 6];\nlet total = 0;\nfor (const value of values) {\n  total = total + value;\n}",
                          "for は、配列の値を先頭から1つずつ取り出します。そのたびに、{ } の中の処理を実行します。",
                          "value に2、4、6が順に入り、total は0 → 2 → 6 → 12と変わります。最後の合計は12です。",
                        ],
                        [
                          "条件が成り立つ間は繰り返す",
                          "let remaining = 3;\nwhile (remaining > 0) {\n  remaining = remaining - 1;\n}",
                          "while は、条件が成り立つ間、{ } の中の処理を繰り返します。> は「より大きい」なので、この例では remaining が0より大きい間、1ずつ減らします。",
                          "remaining は3 → 2 → 1 → 0と変わります。毎回、処理の前に条件を調べ、0になると条件が成り立たなくなって止まります。初めから0なら、一度も繰り返しません。\nこの例で1を引く行がないと、条件がずっと成り立ち、繰り返しが終わりません。",
                        ],
                        [
                          "入れ子で繰り返す",
                          "const grid = [[1, 2], [3, 4]];\nconst values = [];\nfor (const row of grid) {\n  for (const value of row) {\n    values.push(value);\n  }\n}",
                          "for の内側に、もう1つ for を書くこともできます。このように内側へ構造を重ねることを「入れ子」と呼びます。grid は配列の中に配列を入れたもので、[1, 2] と [3, 4] の2行を表しています。",
                          "外側の for は1行ずつ row に入れ、内側の for はその行の値を1つずつ取り出します。1行目の1 → 2を終えてから、2行目の3 → 4に進むので、values は [1, 2, 3, 4] になります。\nそれぞれの { } が処理のまとまりです。内側の行をさらに字下げすると、どの処理の内側かが見やすくなります。",
                        ],
                        [
                          "番号を使って繰り返す",
                          "const positions = [];\nfor (let index = 0; index < 3; index = index + 1) {\n  positions.push(index);\n}",
                          "for の丸かっこの中には、開始時の準備・続ける条件・1回終わるごとの処理を ; で区切って書きます。index は番号を入れるために付けた変数名です。",
                          "最初に index を0にし、index < 3 の間、{ } の中を実行します。1回終わるごとに1を足すので、index は0 → 1 → 2と進み、positions は [0, 1, 2] になります。3になると条件が成り立たず止まります。",
                        ],
                        [
                          "後ろから1文字ずつ読む",
                          'const text = "ABC";\nlet result = "";\nfor (let index = text.length - 1; index >= 0; index = index - 1) {\n  result = result + text[index];\n}',
                          "文字の位置は0から数えるので、最後の位置は text.length - 1 です。そこから1ずつ番号を減らすと、最後の文字から先頭へ読めます。",
                          "text.length は3なので、開始位置は3 - 1 = 2です。index >= 0 の間、番号を2 → 1 → 0と減らします。\n読む文字は text[2] → text[1] → text[0]、つまり C → B → Aです。result は「CBA」になります。index が -1 になると止まります。",
                        ],
                        [
                          "見た値を集合に覚えておく",
                          "const seen = new Set();\nseen.add(4);\nseen.add(4);\nseen.add(7);\nconst count = seen.size;",
                          "new Set() は同じ値を重ねて持たない「集合」を作ります。add() は値を登録し、size は登録した値の個数を調べます。seen は「すでに見た値」に付けた名前です。",
                          "4を2回登録しても、覚えるのは4と7の2種類だけなので count は2です。seen.has(value) で、すでに見た値かを調べられます。\nこのコースの参考解答では、集合で「見たかどうか」を調べ、別の配列に結果を追加して返す形を使います。",
                        ],
                        [
                          "入っているかを調べる",
                          "const destinations = [4, 7];\nconst already = destinations.includes(4);\nconst missing = !destinations.includes(2);",
                          "includes() は、配列に値が入っているかを調べます。結果は true か false です。! はその結果を反対にするので、「入っていないか」を調べられます。集合では includes() の代わりに has() を使います。",
                          "4は中にあるので already は true。2は中にないので missing も true です。\nif (!result.includes(value)) のときだけ result.push(value) を実行すれば、まだない値だけを追加できます。[4, 7, 4] を先頭から見ると、結果は [] → [4] → [4, 7] となり、2回目の4は追加しません。",
                        ],
                        [
                          "辞書としてオブジェクトを使う",
                          'const counts = Object.create(null);\ncounts["blue"] = 2;\nconst blueCount = counts["blue"];\ncounts["red"] = 1;',
                          '辞書は、目印と値を組にして覚える仕組みです。JavaScriptではオブジェクトを使って表せます。Object.create(null) で空の辞書を作り、counts["blue"] = 2 でキー "blue" に値2を保存します。キーは値を取り出すための目印です。',
                          'counts["blue"] で保存した値を取り出せるので、blueCount は2です。最後の counts には "blue" に2、"red" に1が入ります。同じキーに代入すると、値を上書きします。',
                        ],
                        [
                          "辞書で出現回数を数える",
                          'const tags = ["blue", "red", "blue"];\nconst counts = Object.create(null);\nfor (const tag of tags) {\n  counts[tag] = (counts[tag] ?? 0) + 1;\n}',
                          "counts[tag] は、tag に入っている名前をキーとして値を取り出します。まだそのキーがなければ undefined になります。?? 0 は値が undefined や null のときに0を使う書き方です。その値に1を足して保存すると、出てきた回数を数えられます。",
                          '最初の blue は0 + 1で1回、red も0 + 1で1回、次の blue は1 + 1で2回になります。\n最後の counts には "blue" に2、"red" に1が入ります。',
                        ],
                      ]
                    : [
                        [
                          "値を保存する",
                          "energy = 10\nenergy = energy + 3",
                          "変数は、値に付ける名前です。= の右側を計算して、左側の名前に保存します。",
                          "energy は最初に10になり、次の行で10 + 3を計算して13に変わります。",
                        ],
                        [
                          "文字を扱う",
                          'name = "navi"\nmessage = "接続先: " + name\nsign = name.upper()',
                          '文字や言葉は半角の " で囲みます。+ で文字同士をつなぎ、upper() で英字を大文字にします。',
                          "message は「接続先: navi」、sign は「NAVI」になります。",
                        ],
                        [
                          "計算する",
                          "total = 3 + 2   # 5\nleft = 3 - 2    # 1\npower = 3 * 2   # 6\nshare = 3 / 2   # 1.5\nrest = 3 % 2    # 1",
                          "+ は足し算、- は引き算、* は掛け算、/ は割り算です。% は割った余りを求めます。",
                          "3を2で割ると1余るので、3 % 2 の結果は1です。計算結果はそれぞれ左側の名前に保存されます。",
                        ],
                        [
                          "結果を返す",
                          "def double(value):\n    return value * 2",
                          "def で処理に名前を付けます。value は受け取る値の名前、return は答えを返す命令です。",
                          "double(3) を使うと、value に3が入り、3 × 2の答えである6を返します。このサイトでは返した答えで採点します。",
                        ],
                        [
                          "条件を調べる",
                          "energy = 20\nsafe = True\nsame = energy == 20\nready = energy >= 10 and safe",
                          "== は「等しい」、>= は「以上」を調べます。and は両方、or は片方でも条件が成り立てばOKです。",
                          "20は20と等しいので same は True。20は10以上で safe も True なので、ready も True です。成り立たない場合は False になります。",
                        ],
                        [
                          "条件で分ける",
                          'def label(energy):\n    if energy >= 10:\n        return "OK"\n    else:\n        return "充電"',
                          "if の条件が成り立つときは、その下の処理をします。成り立たないときは else の下の処理をします。",
                          "label(20) は「OK」、label(5) は「充電」を返します。どちらか一方の処理だけを実行します。",
                        ],
                        [
                          "リストを使う",
                          "values = [2, 4]\nfirst = values[0]\ncount = len(values)\nvalues.append(6)",
                          "[ ] で複数の値をまとめます。[0] は先頭の値、len() は個数を調べます。append() は最後に値を足します。",
                          "first は2、追加前の個数を調べた count は2です。6を足した後の values は [2, 4, 6] になります。",
                        ],
                        [
                          "二次元配列を使う",
                          "grid = [\n    [1, 2, 3],\n    [4, 5, 6],\n]\nfirst_row = grid[0]\nvalue = grid[0][1]\nrows = len(grid)\ncolumns = len(grid[0])",
                          "二次元配列は、値を行と列で並べたものです。行は横の並び、列は縦の並びです。Pythonでは、1行ずつリストにして、さらに1つのリストにまとめて表せます。この例は2行3列です。",
                          "grid[行の番号][列の番号] で値を取り出します。番号はどちらも0から数えます。\ngrid[0] は最初の行なので、first_row は [1, 2, 3] です。grid[0][1] はその行の2番目の値なので、value は2です。\nlen(grid) は行の数なので rows は2、len(grid[0]) は最初の行にある値の数なので columns は3です。",
                        ],
                        [
                          "リストの一部分を取り出す",
                          "values = [10, 20, 30, 40]\nmiddle = values[1:3]\ntail = values[2:]\nhead = values[:2]",
                          "[開始位置:終了位置] で一部分を取り出します。位置は0から数え、開始位置は含み、終了位置は含みません。この書き方をスライスと呼びます。",
                          "values[1:3] は位置1と2の値なので、middle は [20, 30] です。\nvalues[2:] は終了位置を省略しているので、位置2から最後までの [30, 40] です。\nvalues[:2] は開始位置を省略しているので、先頭から位置2の手前までの [10, 20] です。元の values は変わりません。",
                        ],
                        [
                          "取り出したリストをつなぐ",
                          "values = [10, 20, 30, 40]\noffset = 2\nback = values[offset:]\nfront = values[:offset]\nrotated = back + front",
                          "offset は、区切る位置を入れた変数です。この例は2なので、values[offset:] は values[2:] と同じです。リスト同士の + は、左のリストの後ろに右のリストをつなぎます。",
                          "後半の back は [30, 40]、前半の front は [10, 20] です。\nback + front の結果は [30, 40, 10, 20]。values[offset:] + values[:offset] も同じ結果になります。",
                        ],
                        [
                          "繰り返す",
                          "values = [2, 4, 6]\ntotal = 0\nfor value in values:\n    total = total + value",
                          "for は、リストの値を先頭から1つずつ取り出します。そのたびに、字下げした行の処理を実行します。",
                          "value に2、4、6が順に入り、total は0 → 2 → 6 → 12と変わります。最後の合計は12です。",
                        ],
                        [
                          "条件が成り立つ間は繰り返す",
                          "remaining = 3\nwhile remaining > 0:\n    remaining = remaining - 1",
                          "while は、条件が成り立つ間、字下げした行の処理を繰り返します。> は「より大きい」なので、この例では remaining が0より大きい間、1ずつ減らします。",
                          "remaining は3 → 2 → 1 → 0と変わります。毎回、処理の前に条件を調べ、0になると条件が成り立たなくなって止まります。初めから0なら、一度も繰り返しません。\nこの例で1を引く行がないと、条件がずっと成り立ち、繰り返しが終わりません。",
                        ],
                        [
                          "入れ子で繰り返す",
                          "grid = [[1, 2], [3, 4]]\nvalues = []\nfor row in grid:\n    for value in row:\n        values.append(value)",
                          "for の内側に、もう1つ for を書くこともできます。このように内側へ構造を重ねることを「入れ子」と呼びます。grid はリストの中にリストを入れたもので、[1, 2] と [3, 4] の2行を表しています。",
                          "外側の for は1行ずつ row に入れ、内側の for はその行の値を1つずつ取り出します。1行目の1 → 2を終えてから、2行目の3 → 4に進むので、values は [1, 2, 3, 4] になります。\n内側の for の行は空白4つ、その中の append() の行は空白8つにします。字下げで、どの処理の内側かを表します。",
                        ],
                        [
                          "番号を使って繰り返す",
                          "positions = []\nfor index in range(3):\n    positions.append(index)",
                          "range(3) は0、1、2の順に番号を用意します。for はその番号を1つずつ index に入れて、内側の処理をします。index は番号を受け取るために付けた名前です。",
                          "positions は [0, 1, 2] になります。range(1, 4) なら1、2、3の順です。range(3) では3、range(1, 4) では4が終了の境目で、その番号は含みません。",
                        ],
                        [
                          "後ろから1文字ずつ読む",
                          'text = "ABC"\nresult = ""\n# range(2, -1, -1) と同じ\nfor index in range(len(text) - 1, -1, -1):\n    result = result + text[index]',
                          "range(開始する番号, 含めない終了番号, 1回ごとに足す数) で番号の進み方を決めます。この例は最後の文字から先頭へ読みます。",
                          "① 開始する番号：len(text) は文字数の3です。位置は0から数えるので、最後の位置は3 - 1 = 2です。\n② 含めない終了番号：真ん中の -1 です。-1になる前で止まるので、位置0まで使えます。\n③ 1回ごとに足す数：最後の -1 です。1ずつ減らすので、index は2 → 1 → 0と変わります。\n読む文字は text[2] → text[1] → text[0]、つまり C → B → Aです。result は「CBA」になります。",
                        ],
                        [
                          "見た値を集合に覚えておく",
                          "seen = set()\nseen.add(4)\nseen.add(4)\nseen.add(7)\ncount = len(seen)",
                          "set() は同じ値を重ねて持たない「集合」を作ります。add() は値を登録します。seen は「すでに見た値」に付けた名前です。",
                          "4を2回登録しても、覚えるのは4と7の2種類だけなので count は2です。value not in seen で、まだ見ていない値かを調べられます。\n最初に出てきた順番を残すには、結果を別のリストに追加します。集合には「見たかどうか」、リストには「返す順番」を覚えさせます。",
                        ],
                        [
                          "入っているかを調べる",
                          "destinations = [4, 7]\nalready = 4 in destinations\nmissing = 2 not in destinations",
                          "in は「中にあるか」、not in は「中にないか」を調べます。結果は True か False です。リストにも集合にも使えます。",
                          "4は中にあるので already は True。2は中にないので missing も True です。\nif value not in result: と書くと、結果のリストにまだない値だけを追加できます。例えば [4, 7, 4] を先頭から見ると、結果は [] → [4] → [4, 7] となり、2回目の4は追加しません。",
                        ],
                        [
                          "辞書を使う",
                          'counts = {}\ncounts["blue"] = 2\nblue_count = counts["blue"]\ncounts["red"] = 1',
                          '辞書は、目印と値を組にして覚える仕組みです。目印を「キー」と呼びます。{} で空の辞書を作り、counts["blue"] = 2 でキー "blue" に値2を保存します。',
                          'counts["blue"] で保存した値を取り出せるので、blue_count は2です。最後の counts は {"blue": 2, "red": 1} になります。同じキーに代入すると、値を上書きします。',
                        ],
                        [
                          "辞書で出現回数を数える",
                          'tags = ["blue", "red", "blue"]\ncounts = {}\nfor tag in tags:\n    counts[tag] = counts.get(tag, 0) + 1',
                          "counts.get(tag, 0) は、tag に入っている名前をキーとして値を取り出します。まだそのキーがなければ0を使います。その値に1を足して保存すると、出てきた回数を数えられます。",
                          '最初の blue は0 + 1で1回、red も0 + 1で1回、次の blue は1 + 1で2回になります。\n最後の counts は {"blue": 2, "red": 1} です。',
                        ],
                      ]}
                />
                <p className="reference-foot">
                  {language === "python"
                    ? "def・if・for・while などの内側は、行頭に空白を4つ足します。Tabキーでも入力できます。"
                    : "{ } は処理のまとまり、; は文の区切りです。記号は半角で入力します。大文字・小文字も区別します。"}
                </p>
              </>
            ) : (
              <>
                <div className="eyebrow">HOW TO PLAY</div>
                <h2>冒険の手引き</h2>
                <div className="help-steps">
                  <p>
                    <b>01　端末を選ぶ</b>
                    3D空間の端末か右側のミッションをクリック。
                  </p>
                  <p>
                    <b>02　コードを修復する</b>
                    問題文を読みエディタのコードを直して実行。困ったらヒントと手引きを使おう。
                  </p>
                  <p>
                    <b>03　世界をつなぐ</b>
                    全端末を修復するとゲートが開く。最終章では自分で関数を書いて世界を守ろう。
                  </p>
                  <p>
                    <b>協力モード</b>
                    2〜4人で端末を分担。修復は全員に反映されます。仲間が退出した端末は引き継げます。
                  </p>
                </div>
                <div className="help-shortcuts">
                  <kbd>W A S D / ↑ ↓ ← →</kbd> 移動
                  <br />
                  <kbd>ドラッグ</kbd> 視点を回す
                  <br />
                  <kbd>⌘ / Ctrl + Enter</kbd> コードを実行
                  <br />
                  <kbd>Tab</kbd> コードの字下げ
                </div>
                <p className="reference-foot">
                  進捗は自動保存。ソロと協力JavaScriptとPythonの冒険はそれぞれ独立しています。
                </p>
              </>
            )}
          </section>
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          <Sparkles size={17} />
          {toast}
          <button aria-label="通知を閉じる" onClick={() => setToast("")}>
            <X size={15} />
          </button>
        </div>
      )}
      <div className="mobile-notice">
        <Code2 size={28} />
        <h2>この冒険は大きな画面で。</h2>
        <p>PCブラウザとキーボード・マウスで遊んでください。</p>
      </div>
    </div>
  );
}
export default App;
