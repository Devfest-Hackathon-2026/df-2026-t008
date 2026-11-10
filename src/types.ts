export type Language = "javascript" | "python";
export type TestCase = { input: unknown[]; expected: unknown; label: string };
export type Problem = {
  id: string;
  title: string;
  concept: string;
  briefing: string;
  objective: string;
  functionName: string;
  starter: string;
  solution: string;
  tests: TestCase[];
  hints: string[];
  explanation: string;
};
export type Stage = {
  id: string;
  title: string;
  subtitle: string;
  location: string;
  intro: string;
  outro: string;
  kind: "tutorial" | "repair" | "boss";
  problems: Problem[];
};
export type Course = { language: Language; label: string; stages: Stage[] };
export type RunResult = {
  passed: boolean;
  tests: {
    label: string;
    passed: boolean;
    actual?: unknown;
    expected?: unknown;
    error?: string;
  }[];
  error?: string;
  duration: number;
};
export type Player = {
  id: string;
  name: string;
  color: string;
  x: number;
  z: number;
};
export type RoomState = {
  code: string;
  language: Language;
  stageIndex: number;
  solved: string[];
  locks: Record<string, string>;
  players: Player[];
  drafts: Record<string, string>;
  completed: boolean;
};
export type WorldProps = {
  phase: "overview" | "entering" | "playing";
  onEntered: () => void;
  depthProgress: number;
  completed: boolean;
  onSelectStage: (index: number) => void;
  unlockedStageIndices: number[];
  clearedStageIndices: number[];
  stageProgress: number;
  solved: string[];
  problems: { id: string; title: string }[];
  activeProblemId: string | null;
  onSelect: (id: string) => void;
  stageIndex: number;
  gateOpen: boolean;
  players?: Player[];
  playerId?: string;
  onMove?: (x: number, z: number) => void;
  reducedMotion?: boolean;
};
