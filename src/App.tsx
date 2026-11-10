import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { javascript } from "@codemirror/lang-javascript";
import { indentUnit } from "@codemirror/language";
import { EditorState, Prec } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { useEffect, useRef, useState } from "react";
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
import { courses } from "./content/courses";
import { runCode, cancelRun } from "./lib/runner";
import { buildBossProblem } from "./lib/boss";
import { requestAiHint } from "./lib/ai";
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
  type Progress,
} from "./lib/progress";
import type { Language, RunResult, RoomState } from "./types";

type View = "welcome" | "entering" | "game";
const languageNames = { javascript: "JavaScript", python: "Python" };
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
  const [showSolution, setShowSolution] = useState(false);
  const [modal, setModal] = useState<
    | "story"
    | "reference"
    | "help"
    | "ending"
    | "transition"
    | "integration"
    | "reset"
    | null
  >(null);
  const [integration, setIntegration] = useState<RunResult | null>(null);
  const [integrating, setIntegrating] = useState(false);
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
            if (p) setProgress((current) => mergeProgress(current, p));
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
    setActiveId(null);
    setResult(null);
    setHintCount(0);
    setShowSolution(false);
    generation.current++;
    setRunning(false);
  }, [stageIndex, language, mode]);
  useEffect(() => {
    if (!problem) return;
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
    setRunning(true);
    setResult(null);
    setTab("results");
    try {
      const res = await runCode(language, p, submitted);
      if (current !== generation.current) return;
      setResult(res);
      if (res.passed) {
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
        notify("接続を復旧しました。あなたのコードが世界を動かした！");
      }
    } catch (e) {
      if (current === generation.current)
        setResult({
          passed: false,
          tests: [],
          duration: 0,
          error:
            e instanceof Error
              ? e.message
              : "実行できませんでした。もう一度お試しください。",
        });
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
            ? mergeProgress(loadProgress(l, u.uid), cloud)
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
    setCode(value);
    codeRef.current = value;
    setResult(null);
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
            <p>球の向こうへ。コモンズが待っている。</p>
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
              コードを直せ。
              <br />
              この世界を取り戻せ。
            </h1>
            <p className="welcome-lead">
              仮想世界《コモンズ》で接続障害が発生！
              <br />
              バグった端末を修復して仲間とゲートを突破しよう。
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
            <span className="live-dot" /> THE COMMONS / SECTOR 01 <i /> SYSTEM
            ERROR : 03 NODES
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
                WORLD MAP
                <span className="hud-world-name">仮想世界 コモンズ</span>
              </h1>
              <p className="sidebar-intro">
                {stage.kind === "boss"
                  ? "最終防衛ライン：世界サーバー"
                  : `エリア ${String(stageIndex + 1).padStart(2, "0")} の接続を取り戻せ。`}
              </p>
              <div className="course-pill">
                <span className={`lang-icon small ${language}`}>
                  {language === "javascript" ? "JS" : "Py"}
                </span>
                {course.label}
                <span>{mode === "solo" ? "SOLO" : "CO-OP"}</span>
              </div>
              <nav className="stage-list" aria-label="冒険のステージ">
                {course.stages.map((s, i) => (
                  <div
                    key={s.id}
                    className={`stage-item ${i === stageIndex ? "current" : ""} ${i < stageIndex ? "done" : ""}`}
                  >
                    <span className="stage-number">
                      {i < stageIndex ? (
                        <Check size={14} />
                      ) : i > stageIndex ? (
                        <LockKeyhole size={13} />
                      ) : (
                        String(i + 1).padStart(2, "0")
                      )}
                    </span>
                    <div>
                      <small>
                        {i === course.stages.length - 1
                          ? "FINAL CHAPTER"
                          : `CHAPTER ${String(i + 1).padStart(2, "0")}`}
                      </small>
                      <b>{s.title}</b>
                    </div>
                    {i === stageIndex && <span className="live-dot" />}
                  </div>
                ))}
              </nav>
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
                      : "RESTORE THE NETWORK"}
                  </span>
                  <h2>{stage.location}</h2>
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
                  {stage.kind === "boss" ? "THE WORLD CORE" : "THE COMMONS"}
                </b>
                <small>端末をクリックしてミッションを開始</small>
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
                        : "ゲートが開いた。次の世界が待っている。"}
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
                    {stage.kind === "boss" ? "世界をつなぐ" : "次のエリアへ"}
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
                                {result.tests.filter((t) => t.passed).length} /{" "}
                                {result.tests.length} テスト成功
                              </small>
                            </div>
                          </div>
                          {result.error && (
                            <pre className="error-message">{result.error}</pre>
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
                                        {t.error ||
                                          JSON.stringify(t.actual) ||
                                          "値が返されていません"}
                                      </code>
                                    </small>
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
                      {import.meta.env.VITE_ENABLE_AI === "true" && (
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
                      {integration.error && (
                        <pre className="error-message">{integration.error}</pre>
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
                <div className="eyebrow">CHAPTER COMPLETE</div>
                <h2>またひとつ世界が動き出す。</h2>
                <p className="story-text">{stage.outro}</p>
                <button className="primary" onClick={advance}>
                  次のエリアへ進む
                  <ArrowRight size={16} />
                </button>
              </>
            ) : modal === "story" ? (
              <>
                <span className="modal-symbol">
                  <PixelSprite />
                </span>
                <div className="eyebrow">
                  CHAPTER {String(stageIndex + 1).padStart(2, "0")} /{" "}
                  {stage.location}
                </div>
                <h2>{stage.title}</h2>
                <p className="modal-subtitle">{stage.subtitle}</p>
                <p className="story-text">{stage.intro}</p>
                <div className="story-goal">
                  <Flag size={17} />
                  {stage.kind === "boss"
                    ? "3つの関数を一から実装し世界の接続を取り戻そう。"
                    : "すべての端末を修復して次のエリアへのゲートを開こう。"}
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
                    <b>{course.stages.length}</b> CHAPTERS
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
            ) : modal === "reference" ? (
              <>
                <div className="eyebrow">
                  FIELD GUIDE / {languageNames[language].toUpperCase()}
                </div>
                <h2>コードの手引き</h2>
                <p>覚えていなくても大丈夫。使いながら少しずつ。</p>
                <div className="reference-grid">
                  {(language === "javascript"
                    ? [
                        ["値を名前に入れる", "const energy = 80;"],
                        [
                          "条件によって分ける",
                          "if (energy >= 50) {\n  return true;\n}\nreturn false;",
                        ],
                        [
                          "順番に繰り返す",
                          "for (const value of values) {\n  total += value;\n}",
                        ],
                        [
                          "関数から結果を返す",
                          "function double(value) {\n  return value * 2;\n}",
                        ],
                        [
                          "配列と比較",
                          "const list = [10, 20, 30];\n// 等しい: ===  異なる: !==\n// かつ: &&  または: ||",
                        ],
                      ]
                    : [
                        ["値を名前に入れる", "energy = 80"],
                        [
                          "条件によって分ける",
                          "if energy >= 50:\n    return True\nreturn False",
                        ],
                        [
                          "順番に繰り返す",
                          "for value in values:\n    total += value",
                        ],
                        [
                          "関数から結果を返す",
                          "def double(value):\n    return value * 2",
                        ],
                        [
                          "配列と比較",
                          "values = [10, 20, 30]\n# 等しい: ==  異なる: !=\n# かつ: and  または: or",
                        ],
                      ]
                  ).map(([label, example]) => (
                    <div key={label}>
                      <b>{label}</b>
                      <pre>{example}</pre>
                    </div>
                  ))}
                </div>
                <p className="reference-foot">
                  {language === "python"
                    ? "Pythonは字下げも文法の一部。Tabキーで空白4つを入れられます。"
                    : "JavaScriptは大文字・小文字を区別します。かっこや引用符の閉じ忘れにも注目。"}
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
