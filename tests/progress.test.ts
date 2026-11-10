import test from "node:test";
import assert from "node:assert/strict";
import {
  emptyProgress,
  loadProgress,
  saveProgress,
  mergeProgress,
  parseProgress,
  migrateProgress,
  type Progress,
} from "../src/lib/progress";
import { courses } from "../src/content/courses";
import type { Language } from "../src/types";
import {
  CAMPAIGN_CENTER,
  CAMPAIGN_LAYERS,
  STAGE_COUNT,
  getStagePosition,
  isStageUnlocked,
  layerForStage,
  stageIsComplete,
  stageProgress,
} from "../src/lib/campaign";

const values = new Map<string, string>();
const storage = {
  get length() {
    return values.size;
  },
  clear: () => values.clear(),
  getItem: (key: string) => values.get(key) ?? null,
  key: (index: number) => [...values.keys()][index] ?? null,
  removeItem: (key: string) => {
    values.delete(key);
  },
  setItem: (key: string, value: string) => {
    values.set(key, String(value));
  },
};
Object.defineProperty(globalThis, "localStorage", {
  value: storage,
  configurable: true,
});
const progress = (changes: Partial<Progress> = {}): Progress => ({
  version: 2,
  stageIndex: 0,
  solved: [],
  drafts: {},
  completed: false,
  updatedAt: 100,
  ...changes,
});
const solvedBefore = (language: Language, index: number) =>
  courses[language].stages
    .slice(0, index)
    .flatMap((stage) => stage.problems.map((problem) => problem.id));

test("missing or corrupt saves start a new adventure without crashing", () => {
  storage.clear();
  const initial = loadProgress("javascript");
  assert.equal(initial.stageIndex, 0);
  assert.deepEqual(initial.solved, []);
  assert.deepEqual(initial.drafts, {});
  assert.equal(initial.completed, false);
  storage.setItem("knot.v1.guest.javascript", "{broken");
  assert.equal(loadProgress("javascript").stageIndex, 0);
  storage.setItem(
    "knot.v1.guest.javascript",
    JSON.stringify({ stageIndex: 99, solved: [], drafts: {} }),
  );
  assert.equal(loadProgress("javascript").stageIndex, 0);
});

test("saved stage, repairs and unfinished code survive a reload", () => {
  storage.clear();
  const saved = progress({
    stageIndex: 2,
    solved: solvedBefore("javascript", 2),
    drafts: { "javascript-sum": "function totalEnergy(values) { return 0; }" },
    updatedAt: 500,
  });
  saveProgress("javascript", saved);
  assert.deepEqual(loadProgress("javascript"), saved);
});

test("languages and accounts have independent save slots", () => {
  storage.clear();
  const js = progress({ stageIndex: 1, solved: solvedBefore("javascript", 1) });
  const py = progress({ stageIndex: 2, solved: solvedBefore("python", 2) });
  const signedIn = progress({
    stageIndex: 1,
    solved: solvedBefore("javascript", 3),
  });
  saveProgress("javascript", js);
  saveProgress("python", py);
  saveProgress("javascript", signedIn, "google-user");
  assert.deepEqual(loadProgress("javascript"), js);
  assert.deepEqual(loadProgress("python"), py);
  assert.deepEqual(loadProgress("javascript", "google-user"), signedIn);
  assert.deepEqual(loadProgress("python", "another-user").solved, []);
});

test("merging guest and account records preserves repairs and newest drafts", () => {
  const local = progress({
    stageIndex: 1,
    solved: solvedBefore("javascript", 1),
    drafts: { a: "old a", local: "local draft" },
    updatedAt: 10,
  });
  const cloud = progress({
    stageIndex: 3,
    solved: solvedBefore("javascript", 3),
    drafts: { a: "new a", cloud: "cloud draft" },
    updatedAt: 20,
  });
  const merged = mergeProgress(local, cloud, "javascript");
  assert.equal(merged.stageIndex, 3);
  assert.deepEqual(merged.solved, [
    ...new Set([...local.solved, ...cloud.solved]),
  ]);
  assert.deepEqual(merged.drafts, {
    a: "new a",
    local: "local draft",
    cloud: "cloud draft",
  });
  assert.equal(merged.completed, false);
  assert.equal(merged.updatedAt, 20);
  // Merging must not mutate the record the caller may still be displaying.
  assert.deepEqual(local.solved, solvedBefore("javascript", 1));
  assert.equal(local.drafts.a, "old a");
});

test("draft conflicts choose the newest record regardless of merge order", () => {
  const older = progress({
    drafts: { common: "older", onlyOld: "kept" },
    updatedAt: 10,
  });
  const newer = progress({
    drafts: { common: "newer", onlyNew: "kept" },
    updatedAt: 20,
  });
  assert.deepEqual(
    mergeProgress(older, newer).drafts,
    mergeProgress(newer, older).drafts,
  );
  assert.equal(mergeProgress(newer, older).drafts.common, "newer");
});

test("fresh records do not share mutable arrays or draft objects", () => {
  const first = emptyProgress();
  const second = emptyProgress();
  first.solved.push("one");
  first.drafts.one = "code";
  assert.deepEqual(second.solved, []);
  assert.deepEqual(second.drafts, {});
});

test("nested corrupt values never enter game progress", () => {
  storage.clear();
  const invalid = [
    { solved: [null] },
    { solved: [42] },
    { solved: [""] },
    { drafts: [] },
    { drafts: { one: { source: "not a string" } } },
    { drafts: { one: null } },
    { completed: "yes" },
    { updatedAt: "yesterday" },
    { updatedAt: -1 },
    { stageIndex: 1.5 },
    { drafts: { one: "x".repeat(20_001) } },
  ];
  for (const change of invalid) {
    storage.setItem(
      "knot.v1.guest.javascript",
      JSON.stringify({ ...progress({ stageIndex: 2 }), ...change }),
    );
    const actual = loadProgress("javascript");
    assert.equal(
      actual.stageIndex,
      0,
      `invalid input accepted: ${JSON.stringify(change).slice(0, 120)}`,
    );
    assert.deepEqual(actual.solved, []);
    assert.deepEqual(actual.drafts, {});
  }
});

test("optional legacy fields default safely and duplicate solved IDs are normalized", () => {
  storage.clear();
  storage.setItem(
    "knot.v1.guest.javascript",
    JSON.stringify({
      stageIndex: 1,
      solved: ["a", "a"],
      drafts: { a: "code" },
      extra: { unsafe: "ignored" },
    }),
  );
  const actual = loadProgress("javascript");
  assert.equal(actual.stageIndex, 0);
  assert.equal(actual.version, 2);
  assert.deepEqual(actual.solved, ["a"]);
  assert.equal(actual.completed, false);
  assert.ok(Number.isFinite(actual.updatedAt));
  assert.deepEqual(
    Object.keys(actual).sort(),
    [
      "version",
      "stageIndex",
      "solved",
      "drafts",
      "completed",
      "updatedAt",
    ].sort(),
  );
});

test("modern stage indices include the final ring but reject out-of-range and unknown versions", () => {
  assert.equal(parseProgress(progress({ stageIndex: 53 }))?.stageIndex, 53);
  assert.equal(parseProgress(progress({ stageIndex: 54 })), null);
  assert.equal(parseProgress({ ...progress(), version: 3 }), null);
  assert.equal(
    parseProgress({ ...progress({ stageIndex: 4 }), version: undefined }),
    null,
  );
});

test("legacy chapter completion migrates actual repairs without clearing new content", () => {
  const old: Progress = {
    stageIndex: 3,
    solved: solvedBefore("javascript", 3),
    drafts: {
      "javascript-greeting": 'function greet() { return "おかえり"; }',
    },
    completed: true,
    updatedAt: 321,
  };
  const migrated = migrateProgress("javascript", old);
  assert.equal(migrated.version, 2);
  assert.equal(migrated.stageIndex, 3);
  assert.equal(migrated.completed, false);
  assert.deepEqual(migrated.solved, old.solved);
  assert.deepEqual(migrated.drafts, old.drafts);
  assert.equal(migrated.updatedAt, old.updatedAt);
  assert.notEqual(migrated.drafts, old.drafts);
});

test("legacy final challenge IDs retain drafts but require the new contracts to be passed", () => {
  const bossIds = courses.javascript.stages
    .filter((stage) => stage.kind === "boss")
    .flatMap((stage) => stage.problems.map((problem) => problem.id));
  assert.ok(bossIds.length > 0);
  const draft = "old completed implementation";
  const legacy: Progress = {
    stageIndex: 3,
    solved: [...solvedBefore("javascript", 3), ...bossIds],
    drafts: Object.fromEntries(bossIds.map((id) => [id, draft])),
    completed: true,
    updatedAt: 55,
  };
  const migrated = migrateProgress("javascript", legacy);
  assert.equal(migrated.completed, false);
  for (const id of bossIds) {
    assert.equal(migrated.solved.includes(id), false);
    assert.equal(migrated.drafts[id], draft);
  }
  // A v2 local record must not hide the legacy nature of the cloud record.
  for (const merged of [
    mergeProgress(progress(), legacy, "javascript"),
    mergeProgress(legacy, progress(), "javascript"),
  ]) {
    assert.equal(merged.version, 2);
    assert.equal(merged.completed, false);
    assert.ok(bossIds.every((id) => !merged.solved.includes(id)));
    assert.deepEqual(merged.drafts, legacy.drafts);
  }
  assert.ok(bossIds.every((id) => legacy.solved.includes(id)));
});

test("a saved late selection cannot bypass unfinished prerequisites", () => {
  const forged = progress({
    stageIndex: 53,
    solved: solvedBefore("javascript", 1),
    completed: true,
  });
  const migrated = migrateProgress("javascript", forged);
  assert.equal(migrated.stageIndex, 1);
  assert.equal(migrated.completed, false);
  const merged = mergeProgress(progress(), forged, "javascript");
  assert.equal(merged.stageIndex, 1);
  assert.equal(merged.completed, false);
});

test("all repairs and explicit final completion are both required to restore the core", () => {
  const solved = solvedBefore("javascript", courses.javascript.stages.length);
  const last = courses.javascript.stages.length - 1;
  assert.equal(
    migrateProgress("javascript", progress({ stageIndex: last, solved }))
      .completed,
    false,
  );
  assert.equal(
    migrateProgress(
      "javascript",
      progress({ stageIndex: last, solved, completed: true }),
    ).completed,
    true,
  );
  const legacy = {
    ...progress({ stageIndex: 3, completed: true }),
    version: undefined,
  };
  assert.equal(
    mergeProgress(legacy, progress(), "javascript").completed,
    false,
  );
});

test("sequential unlocks ignore unknown and out-of-order repairs while allowing revisits", () => {
  const course = courses.javascript;
  const first = course.stages[0].problems.map((problem) => problem.id);
  const later = course.stages.at(-1)!.problems.map((problem) => problem.id);
  const solved = [...first, ...later, "unknown"];
  assert.equal(stageIsComplete(0, course, solved), true);
  assert.equal(isStageUnlocked(0, course, solved), true);
  assert.equal(isStageUnlocked(1, course, solved), true);
  assert.equal(isStageUnlocked(2, course, solved), false);
  assert.equal(isStageUnlocked(-1, course, solved), false);
  assert.equal(isStageUnlocked(course.stages.length, course, solved), false);
  const state = stageProgress(solved, course);
  assert.equal(state.firstIncompleteStage, 1);
  assert.equal(state.unlockedThrough, 1);
  assert.equal(state.completedStages, 2);
  assert.equal(state.solvedProblems, first.length + later.length);
  assert.equal(state.allComplete, false);
  assert.deepEqual(
    migrateProgress("javascript", progress({ stageIndex: 0, solved }))
      .stageIndex,
    0,
  );
});

test("ring topology provides 54 finite positions and ends at the fixed center", () => {
  assert.equal(
    CAMPAIGN_LAYERS.reduce((sum, layer) => sum + layer.count, 0),
    STAGE_COUNT,
  );
  for (const [layerIndex, layer] of CAMPAIGN_LAYERS.entries()) {
    for (let index = layer.start; index < layer.end; index++) {
      assert.equal(layerForStage(index), layerIndex);
      const position = getStagePosition(index);
      assert.ok(Object.values(position).every(Number.isFinite));
      assert.ok(
        Math.abs(
          Math.hypot(
            position.x - CAMPAIGN_CENTER.x,
            position.z - CAMPAIGN_CENTER.z,
          ) - layer.radius,
        ) < 1e-9,
      );
      const between = getStagePosition(index, 0.5);
      assert.ok(Object.values(between).every(Number.isFinite));
    }
  }
  assert.deepEqual(getStagePosition(STAGE_COUNT - 1, 1), CAMPAIGN_CENTER);
  assert.deepEqual(getStagePosition(Number.NaN), getStagePosition(0));
});
