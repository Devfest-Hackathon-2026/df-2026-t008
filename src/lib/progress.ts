import type { Language } from "../types";
import type { Course } from "../types";
import { courses } from "../content/courses";
import { isStageUnlocked, stageProgress, STAGE_COUNT } from "./campaign";

export type Progress = {
  version?: 2;
  stageIndex: number;
  solved: string[];
  drafts: Record<string, string>;
  completed: boolean;
  updatedAt: number;
};
export const emptyProgress = (): Progress => ({
  version: 2,
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
  if (p.version !== undefined && p.version !== 1 && p.version !== 2)
    return null;
  const versionTwo = p.version === 2;
  if (
    !Number.isInteger(p.stageIndex) ||
    (p.stageIndex as number) < 0 ||
    (p.stageIndex as number) >= (versionTwo ? STAGE_COUNT : 4)
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
    ...(versionTwo ? { version: 2 as const } : {}),
    stageIndex: p.stageIndex as number,
    solved: [...new Set(p.solved as string[])],
    drafts: Object.fromEntries(drafts) as Record<string, string>,
    completed: p.completed === true,
    updatedAt: typeof p.updatedAt === "number" ? p.updatedAt : Date.now(),
  };
}

/** Legacy chapter numbers cannot identify the new ring stages. Keep the actual
 * repairs/drafts and resume at their first unfinished prerequisite instead. */
export function migrateProgress(
  language: Language,
  progress: Progress,
  course: Course = courses[language],
): Progress {
  const legacyBossIds = new Set(
    course.stages
      .filter((stage) => stage.kind === "boss")
      .flatMap((stage) => stage.problems.map((problem) => problem.id)),
  );
  // The final challenges reuse IDs but now have different advanced contracts.
  // Retain their drafts for editing while requiring the new tests to be passed.
  const solved =
    progress.version === 2
      ? [...new Set(progress.solved)]
      : [...new Set(progress.solved)].filter((id) => !legacyBossIds.has(id));
  const state = stageProgress(solved, course);
  const selected =
    Number.isInteger(progress.stageIndex) &&
    isStageUnlocked(progress.stageIndex, course, solved)
      ? progress.stageIndex
      : state.unlockedThrough;
  return {
    version: 2,
    stageIndex: progress.version === 2 ? selected : state.unlockedThrough,
    solved,
    drafts: { ...progress.drafts },
    // An old cleared four-chapter campaign does not clear its new problems.
    completed:
      progress.version === 2 && progress.completed && state.allComplete,
    updatedAt: progress.updatedAt,
  };
}
export function loadProgress(language: Language, uid = "guest"): Progress {
  try {
    const parsed = parseProgress(
      JSON.parse(localStorage.getItem(`knot.v1.${uid}.${language}`) || "null"),
    );
    return parsed ? migrateProgress(language, parsed) : emptyProgress();
  } catch {
    return emptyProgress();
  }
}
export function saveProgress(language: Language, p: Progress, uid = "guest") {
  localStorage.setItem(
    `knot.v1.${uid}.${language}`,
    JSON.stringify(migrateProgress(language, p)),
  );
}
export function mergeProgress(
  a: Progress,
  b: Progress,
  language?: Language,
): Progress {
  if (language) {
    // Normalize the records independently before one version marker can mask
    // the other's obsolete boss-completion flags.
    a = migrateProgress(language, a);
    b = migrateProgress(language, b);
  }
  const hasVersionTwo = a.version === 2 || b.version === 2;
  const merged: Progress = {
    ...(hasVersionTwo ? { version: 2 as const } : {}),
    stageIndex: Math.max(a.stageIndex, b.stageIndex),
    solved: [...new Set([...a.solved, ...b.solved])],
    drafts: {
      ...(a.updatedAt > b.updatedAt ? b.drafts : a.drafts),
      ...(a.updatedAt > b.updatedAt ? a.drafts : b.drafts),
    },
    completed: hasVersionTwo
      ? (a.version === 2 && a.completed) || (b.version === 2 && b.completed)
      : a.completed || b.completed,
    updatedAt: Math.max(a.updatedAt, b.updatedAt),
  };
  return language ? migrateProgress(language, merged) : merged;
}
