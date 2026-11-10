import type { Language } from "../types";

export type Progress = {
  stageIndex: number;
  solved: string[];
  drafts: Record<string, string>;
  completed: boolean;
  updatedAt: number;
};
export const emptyProgress = (): Progress => ({
  stageIndex: 0,
  solved: [],
  drafts: {},
  completed: false,
  updatedAt: Date.now(),
});

/** Validate persisted data before it reaches game state. Unknown keys are dropped. */
export function parseProgress(value: unknown): Progress | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const p = value as Record<string, unknown>;
  if (
    !Number.isInteger(p.stageIndex) ||
    (p.stageIndex as number) < 0 ||
    (p.stageIndex as number) >= 4
  )
    return null;
  if (
    !Array.isArray(p.solved) ||
    p.solved.length > 1000 ||
    !p.solved.every(
      (id) => typeof id === "string" && id.length > 0 && id.length <= 128,
    )
  )
    return null;
  if (!p.drafts || typeof p.drafts !== "object" || Array.isArray(p.drafts))
    return null;
  const drafts = Object.entries(p.drafts);
  if (
    drafts.length > 1000 ||
    !drafts.every(
      ([id, code]) =>
        id.length > 0 &&
        id.length <= 128 &&
        typeof code === "string" &&
        code.length <= 20_000,
    )
  )
    return null;
  if (p.completed !== undefined && typeof p.completed !== "boolean")
    return null;
  if (
    p.updatedAt !== undefined &&
    (typeof p.updatedAt !== "number" ||
      !Number.isFinite(p.updatedAt) ||
      p.updatedAt < 0)
  )
    return null;
  return {
    stageIndex: p.stageIndex as number,
    solved: [...new Set(p.solved as string[])],
    drafts: Object.fromEntries(drafts) as Record<string, string>,
    completed: p.completed === true,
    updatedAt: typeof p.updatedAt === "number" ? p.updatedAt : Date.now(),
  };
}
export function loadProgress(language: Language, uid = "guest"): Progress {
  try {
    return (
      parseProgress(
        JSON.parse(
          localStorage.getItem(`knot.v1.${uid}.${language}`) || "null",
        ),
      ) ?? emptyProgress()
    );
  } catch {
    return emptyProgress();
  }
}
export function saveProgress(language: Language, p: Progress, uid = "guest") {
  localStorage.setItem(`knot.v1.${uid}.${language}`, JSON.stringify(p));
}
export function mergeProgress(a: Progress, b: Progress): Progress {
  return {
    stageIndex: Math.max(a.stageIndex, b.stageIndex),
    solved: [...new Set([...a.solved, ...b.solved])],
    drafts: {
      ...(a.updatedAt > b.updatedAt ? b.drafts : a.drafts),
      ...(a.updatedAt > b.updatedAt ? a.drafts : b.drafts),
    },
    completed: a.completed || b.completed,
    updatedAt: Math.max(a.updatedAt, b.updatedAt),
  };
}
