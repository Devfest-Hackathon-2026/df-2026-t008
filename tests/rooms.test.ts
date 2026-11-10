import { test } from "node:test";
import assert from "node:assert/strict";
import { RoomRegistry } from "../server/rooms";
import { courses } from "../src/content/courses";

test("rooms isolate languages, enforce 4 players, and preserve separate runs", () => {
  const rooms = new RoomRegistry();
  const room = rooms.create("a", "javascript", " A ");
  assert.equal(room.players[0].name, "A");
  assert.throws(() => rooms.join("b", room.code, "python", "B"), /別の言語/);
  for (const id of ["b", "c", "d"]) rooms.join(id, room.code, "javascript", id);
  assert.throws(() => rooms.join("e", room.code, "javascript", "E"), /満員/);
  const python = rooms.create("e", "python", "E");
  assert.notEqual(room.code, python.code);
  assert.equal(python.players.length, 1);
});
test("terminal ownership prevents concurrent edits, transfers on disconnect, keeps draft", () => {
  const rooms = new RoomRegistry();
  const room = rooms.create("a", "javascript", "A");
  rooms.join("b", room.code, "javascript", "B");
  const problemId = courses.javascript.stages[0].problems[0].id;
  rooms.handle("a", { type: "lock", problemId });
  rooms.handle("a", { type: "draft", problemId, code: "draft" });
  assert.throws(() => rooms.handle("b", { type: "lock", problemId }), /仲間/);
  assert.throws(
    () => rooms.handle("b", { type: "draft", problemId, code: "overwritten" }),
    /担当者/,
  );
  assert.throws(() => rooms.handle("b", { type: "solve", problemId }), /選択/);
  rooms.leave("a");
  assert.equal(room.locks[problemId], undefined);
  assert.equal(room.drafts[problemId], "draft");
  rooms.handle("b", { type: "lock", problemId });
  rooms.handle("b", { type: "solve", problemId });
  assert.deepEqual(room.solved, [problemId]);
  assert.equal(room.locks[problemId], undefined);
});
test("progression is server gated, validates stage IDs, and ends at the final boss", () => {
  const rooms = new RoomRegistry();
  const room = rooms.create("a", "python", "A");
  assert.throws(() => rooms.handle("a", { type: "advance" }), /全て/);
  assert.throws(
    () => rooms.handle("a", { type: "lock", problemId: "made-up" }),
    /現在のステージ/,
  );
  for (const stage of courses.python.stages) {
    for (const problem of stage.problems) {
      rooms.handle("a", { type: "lock", problemId: problem.id });
      rooms.handle("a", { type: "solve", problemId: problem.id });
    }
    rooms.handle("a", { type: "advance" });
  }
  assert.equal(room.completed, true);
  assert.equal(room.stageIndex, courses.python.stages.length - 1);
  assert.throws(
    () =>
      rooms.handle("a", {
        type: "lock",
        problemId: courses.python.stages.at(-1)!.problems[0].id,
      }),
    /クリア済み/,
  );
});
test("leaving empty rooms removes room and releasing own terminal never releases another player", () => {
  const rooms = new RoomRegistry();
  const room = rooms.create("a", "javascript", "A");
  rooms.join("b", room.code, "javascript", "B");
  const [first, second] = courses.javascript.stages[0].problems;
  rooms.handle("a", { type: "lock", problemId: first.id });
  rooms.handle("b", { type: "lock", problemId: second.id });
  rooms.handle("a", { type: "release", problemId: second.id });
  assert.equal(room.locks[second.id], "b");
  rooms.leave("a");
  assert.equal(room.locks[first.id], undefined);
  rooms.leave("b");
  assert.equal(rooms.rooms.size, 0);
  assert.equal(rooms.membership.size, 0);
  assert.throws(
    () => rooms.join("c", room.code, "javascript", "C"),
    /見つかりません/,
  );
});
test("moves clamp coordinates and ignore nonfinite input, drafts have a size limit", () => {
  const rooms = new RoomRegistry();
  const room = rooms.create("a", "javascript", "A");
  rooms.handle("a", { type: "move", x: 999, z: -999 });
  assert.equal(room.players[0].x, 8);
  assert.equal(room.players[0].z, -8);
  rooms.handle("a", { type: "move", x: NaN, z: 3 });
  assert.equal(room.players[0].x, 8);
  const problemId = courses.javascript.stages[0].problems[0].id;
  rooms.handle("a", { type: "lock", problemId });
  assert.throws(
    () =>
      rooms.handle("a", { type: "draft", problemId, code: "a".repeat(20001) }),
    /20,000/,
  );
});
test("solved boss functions can be reclaimed and corrected after integration failure", () => {
  const rooms = new RoomRegistry();
  const room = rooms.create("a", "javascript", "A");
  rooms.join("b", room.code, "javascript", "B");
  for (const stage of courses.javascript.stages.filter(
    (stage) => stage.kind !== "boss",
  )) {
    for (const problem of stage.problems) {
      rooms.handle("a", { type: "lock", problemId: problem.id });
      rooms.handle("a", { type: "solve", problemId: problem.id });
    }
    // Ordinary repaired terminals stay read-only.
    rooms.handle("a", { type: "lock", problemId: stage.problems[0].id });
    assert.equal(room.locks[stage.problems[0].id], undefined);
    rooms.handle("a", { type: "advance" });
  }
  const boss = courses.javascript.stages[room.stageIndex];
  assert.equal(boss.kind, "boss");
  for (const problem of boss.problems) {
    rooms.handle("a", { type: "lock", problemId: problem.id });
    rooms.handle("a", {
      type: "draft",
      problemId: problem.id,
      code: problem.solution,
    });
    rooms.handle("a", { type: "solve", problemId: problem.id });
  }
  const target = boss.problems[0];
  rooms.handle("b", { type: "lock", problemId: target.id });
  assert.equal(room.locks[target.id], "b");
  rooms.handle("b", {
    type: "draft",
    problemId: target.id,
    code: target.solution,
  });
  assert.ok(
    room.solved.includes(target.id),
    "same-code autosave keeps passing grade",
  );
  assert.throws(
    () => rooms.handle("a", { type: "lock", problemId: target.id }),
    /仲間/,
  );
  rooms.handle("b", {
    type: "draft",
    problemId: target.id,
    code: target.solution + "\n// corrected",
  });
  assert.ok(
    !room.solved.includes(target.id),
    "editing invalidates the previous passing grade",
  );
  assert.throws(() => rooms.handle("a", { type: "advance" }), /全て/);
  rooms.handle("b", { type: "solve", problemId: target.id });
  rooms.handle("a", { type: "advance" });
  assert.equal(room.completed, true);
});
