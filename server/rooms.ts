import type { Language, RoomState } from "../src/types";
import { courses } from "../src/content/courses";
import { randomInt } from "node:crypto";
const colors = ["#168b7c", "#ed775e", "#c39b37", "#7a82c5"];
export class RoomError extends Error {}
export class RoomRegistry {
  rooms = new Map<string, RoomState>();
  membership = new Map<string, string>();
  create(id: string, language: Language, name: string) {
    if (this.membership.has(id))
      throw new RoomError("既にルームに参加しています。");
    let code: string;
    do {
      code = String(randomInt(100000, 1000000));
    } while (this.rooms.has(code));
    const state: RoomState = {
      code,
      language,
      stageIndex: 0,
      solved: [],
      locks: {},
      players: [],
      drafts: {},
      completed: false,
    };
    this.rooms.set(code, state);
    return this.join(id, code, language, name);
  }
  join(id: string, code: string, language: Language, name: string) {
    if (this.membership.has(id))
      throw new RoomError("既にルームに参加しています。");
    const room = this.rooms.get(code);
    if (!room)
      throw new RoomError(
        "ルームが見つかりません。6桁のコードを確認してください。",
      );
    if (room.language !== language)
      throw new RoomError(
        "このルームは別の言語のコースです。コースを切り替えてください。",
      );
    if (room.players.length >= 4)
      throw new RoomError("ルームが満員です（最大4人）。");
    const clean =
      name
        .replace(/[\u0000-\u001f\u007f]/g, "")
        .trim()
        .slice(0, 16) || "旅人";
    room.players.push({
      id,
      name: clean,
      color:
        colors.find((c) => !room.players.some((p) => p.color === c)) ??
        colors[0],
      x: 0,
      z: 3,
    });
    this.membership.set(id, code);
    return room;
  }
  get(id: string) {
    const room = this.rooms.get(this.membership.get(id) ?? "");
    if (!room) throw new RoomError("先にルームに参加してください。");
    return room;
  }
  leave(id: string) {
    const code = this.membership.get(id);
    this.membership.delete(id);
    if (!code) return;
    const room = this.rooms.get(code);
    if (!room) return;
    room.players = room.players.filter((p) => p.id !== id);
    for (const key of Object.keys(room.locks))
      if (room.locks[key] === id) delete room.locks[key];
    if (!room.players.length) this.rooms.delete(code);
    return room;
  }
  handle(id: string, event: Record<string, unknown>) {
    const room = this.get(id),
      stage = courses[room.language].stages[room.stageIndex];
    const problem =
      typeof event.problemId === "string"
        ? stage.problems.find((p) => p.id === event.problemId)
        : undefined;
    const needsProblem = ["lock", "release", "draft", "solve"].includes(
      String(event.type),
    );
    if (needsProblem && !problem)
      throw new RoomError("現在のステージにない端末です。");
    switch (event.type) {
      case "lock":
        if (room.completed) throw new RoomError("この冒険はクリア済みです。");
        if (room.solved.includes(problem!.id) && stage.kind !== "boss")
          return room;
        if (room.locks[problem!.id] && room.locks[problem!.id] !== id)
          throw new RoomError(
            "仲間がこの端末を修復しています。別の端末を選んでください。",
          );
        for (const key of Object.keys(room.locks))
          if (room.locks[key] === id) delete room.locks[key];
        room.locks[problem!.id] = id;
        break;
      case "release":
        if (room.locks[problem!.id] === id) delete room.locks[problem!.id];
        break;
      case "draft":
        if (room.locks[problem!.id] !== id)
          throw new RoomError("この端末の担当者だけが編集できます。");
        if (typeof event.code !== "string" || event.code.length > 20000)
          throw new RoomError("コードは20,000文字以内にしてください。");
        if (room.solved.includes(problem!.id) && stage.kind !== "boss")
          throw new RoomError("修復済みの端末は編集できません。");
        if (stage.kind === "boss" && room.drafts[problem!.id] !== event.code)
          room.solved = room.solved.filter((key) => key !== problem!.id);
        room.drafts[problem!.id] = event.code;
        break;
      case "solve":
        if (room.locks[problem!.id] !== id)
          throw new RoomError("端末を選択してから提出してください。");
        // Browser-side sandbox executes tests. This cooperative prototype is not
        // an adversarial judge; production needs server-side isolated regrading.
        if (!room.solved.includes(problem!.id)) room.solved.push(problem!.id);
        delete room.locks[problem!.id];
        break;
      case "advance":
        if (!stage.problems.every((p) => room.solved.includes(p.id)))
          throw new RoomError("全ての端末を修復してから先へ進みましょう。");
        if (room.stageIndex === courses[room.language].stages.length - 1)
          room.completed = true;
        else {
          room.stageIndex++;
          room.locks = {};
          room.players.forEach((p) => {
            p.x = 0;
            p.z = 3;
          });
        }
        break;
      case "move": {
        if (
          typeof event.x !== "number" ||
          typeof event.z !== "number" ||
          !Number.isFinite(event.x) ||
          !Number.isFinite(event.z)
        )
          return room;
        const player = room.players.find((p) => p.id === id)!;
        player.x = Math.max(-8, Math.min(8, event.x));
        player.z = Math.max(-8, Math.min(8, event.z));
        break;
      }
      default:
        throw new RoomError("不明な操作です。");
    }
    return room;
  }
}
