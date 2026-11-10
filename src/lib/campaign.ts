import type { Course } from "../types";

export const CAMPAIGN_LAYERS = [
  { name: "外縁層", count: 20, radius: 10.8, scale: 0.22, start: 0, end: 20 },
  { name: "中層", count: 16, radius: 8.1, scale: 0.18, start: 20, end: 36 },
  { name: "内層", count: 12, radius: 5.4, scale: 0.15, start: 36, end: 48 },
  { name: "中心核", count: 6, radius: 2.7, scale: 0.11, start: 48, end: 54 },
] as const;

export const STAGE_COUNT = 54;
export const CAMPAIGN_CENTER = { x: 0, y: 2, z: -1 };

export function layerForStage(index: number): number {
  const stage = Number.isFinite(index)
    ? Math.max(0, Math.min(STAGE_COUNT - 1, Math.floor(index)))
    : 0;
  return CAMPAIGN_LAYERS.findIndex((layer) => stage < layer.end);
}

function positionAt(index: number) {
  const stage = Math.max(0, Math.min(STAGE_COUNT - 1, Math.floor(index)));
  const layerIndex = layerForStage(stage);
  const layer = CAMPAIGN_LAYERS[layerIndex];
  const slot = stage - layer.start;
  const angle =
    ((slot + (layerIndex % 2 ? 0.5 : 0)) / layer.count) * Math.PI * 2;
  return {
    x: CAMPAIGN_CENTER.x + Math.sin(angle) * layer.radius,
    y: CAMPAIGN_CENTER.y + (slot % 2 ? 0.1 : -0.1),
    z: CAMPAIGN_CENTER.z + Math.cos(angle) * layer.radius,
  };
}

/** World coordinates share the ring layout. The last cleared stage ends at core. */
export function getStagePosition(index: number, solvedFraction = 0) {
  const stage = Number.isFinite(index)
    ? Math.max(0, Math.min(STAGE_COUNT - 1, Math.floor(index)))
    : 0;
  const fraction = Number.isFinite(solvedFraction)
    ? Math.max(0, Math.min(1, solvedFraction))
    : 0;
  const a = positionAt(stage);
  const b = stage === STAGE_COUNT - 1 ? CAMPAIGN_CENTER : positionAt(stage + 1);
  return {
    x: a.x + (b.x - a.x) * fraction,
    y: a.y + (b.y - a.y) * fraction,
    z: a.z + (b.z - a.z) * fraction,
  };
}

function completeAt(
  index: number,
  course: Course,
  solved: ReadonlySet<string>,
) {
  const stage = course.stages[index];
  return (
    !!stage &&
    stage.problems.length > 0 &&
    stage.problems.every((p) => solved.has(p.id))
  );
}

export function stageIsComplete(
  index: number,
  course: Course,
  solved: readonly string[],
): boolean {
  if (!Number.isInteger(index) || index < 0 || index >= course.stages.length)
    return false;
  return completeAt(index, course, new Set(solved));
}

/** Unlocks derive from actual repairs, never a saved selected stage number. */
export function isStageUnlocked(
  index: number,
  course: Course,
  solved: readonly string[],
): boolean {
  if (!Number.isInteger(index) || index < 0 || index >= course.stages.length)
    return false;
  const repaired = new Set(solved);
  for (let previous = 0; previous < index; previous++) {
    if (!completeAt(previous, course, repaired)) return false;
  }
  return true;
}

export function stageProgress(solved: readonly string[], course: Course) {
  const repaired = new Set(solved);
  const validProblemIds = new Set(
    course.stages.flatMap((stage) => stage.problems.map((p) => p.id)),
  );
  const firstIncomplete = course.stages.findIndex(
    (_, index) => !completeAt(index, course, repaired),
  );
  const firstIncompleteStage = firstIncomplete < 0 ? null : firstIncomplete;
  const stage =
    firstIncompleteStage === null ? null : course.stages[firstIncompleteStage];
  const partial =
    stage && stage.problems.length
      ? stage.problems.filter((p) => repaired.has(p.id)).length /
        stage.problems.length
      : 0;
  return {
    solvedProblems: [...validProblemIds].filter((id) => repaired.has(id))
      .length,
    totalProblems: validProblemIds.size,
    completedStages: course.stages.filter((_, index) =>
      completeAt(index, course, repaired),
    ).length,
    totalStages: course.stages.length,
    firstIncompleteStage,
    unlockedThrough:
      firstIncompleteStage ?? Math.max(0, course.stages.length - 1),
    allComplete: firstIncompleteStage === null,
    depth:
      firstIncompleteStage === null
        ? 1
        : (firstIncompleteStage + partial) / Math.max(1, course.stages.length),
  };
}
