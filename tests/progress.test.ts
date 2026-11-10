import test from "node:test";
import assert from "node:assert/strict";
import {
  emptyProgress,
  loadProgress,
  saveProgress,
  mergeProgress,
  type Progress,
} from "../src/lib/progress";

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
  stageIndex: 0,
  solved: [],
  drafts: {},
  completed: false,
  updatedAt: 100,
  ...changes,
});

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
    solved: ["javascript-greeting", "javascript-battery"],
    drafts: { "javascript-sum": "function totalEnergy(values) { return 0; }" },
    updatedAt: 500,
  });
  saveProgress("javascript", saved);
  assert.deepEqual(loadProgress("javascript"), saved);
});

test("languages and accounts have independent save slots", () => {
  storage.clear();
  const js = progress({ stageIndex: 1, solved: ["javascript-greeting"] });
  const py = progress({ stageIndex: 2, solved: ["python-greeting"] });
  const signedIn = progress({ stageIndex: 3, completed: true });
  saveProgress("javascript", js);
  saveProgress("python", py);
  saveProgress("javascript", signedIn, "google-user");
  assert.deepEqual(loadProgress("javascript"), js);
  assert.deepEqual(loadProgress("python"), py);
  assert.deepEqual(loadProgress("javascript", "google-user"), signedIn);
  assert.deepEqual(loadProgress("python", "another-user").solved, []);
});

test("merging guest and account records keeps the furthest chapter and all repairs", () => {
  const local = progress({
    stageIndex: 1,
    solved: ["a", "b"],
    drafts: { a: "old a", local: "local draft" },
    updatedAt: 10,
  });
  const cloud = progress({
    stageIndex: 3,
    solved: ["b", "c"],
    drafts: { a: "new a", cloud: "cloud draft" },
    completed: true,
    updatedAt: 20,
  });
  const merged = mergeProgress(local, cloud);
  assert.equal(merged.stageIndex, 3);
  assert.deepEqual(merged.solved, ["a", "b", "c"]);
  assert.deepEqual(merged.drafts, {
    a: "new a",
    local: "local draft",
    cloud: "cloud draft",
  });
  assert.equal(merged.completed, true);
  assert.equal(merged.updatedAt, 20);
  // Merging must not mutate the record the caller may still be displaying.
  assert.deepEqual(local.solved, ["a", "b"]);
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
  assert.equal(actual.stageIndex, 1);
  assert.deepEqual(actual.solved, ["a"]);
  assert.equal(actual.completed, false);
  assert.ok(Number.isFinite(actual.updatedAt));
  assert.deepEqual(
    Object.keys(actual).sort(),
    ["stageIndex", "solved", "drafts", "completed", "updatedAt"].sort(),
  );
});
