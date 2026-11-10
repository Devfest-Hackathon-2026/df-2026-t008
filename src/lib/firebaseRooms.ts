import {
  getDatabase,
  get,
  remove,
  onValue,
  onDisconnect,
  ref,
  runTransaction,
  type Database,
  type DataSnapshot,
  type Unsubscribe,
} from "firebase/database";
import { auth } from "./firebase";
import { courses } from "../content/courses";
import type { Language, Player, RoomState } from "../types";
import type { RoomOptions } from "./rooms";

type CloudRoom = {
  language: Language;
  stageIndex: number;
  solved?: Record<string, boolean>;
  locks?: Record<string, string>;
  players?: Record<string, Player>;
  drafts?: Record<string, string>;
  completed: boolean;
  createdAt: number;
  updatedAt: number;
};
const colors = ["#168b7c", "#ed775e", "#c39b37", "#7a82c5"];
const TTL = 24 * 60 * 60 * 1000;
const cleanLocks = (room: CloudRoom) => {
  room.locks ??= {};
  for (const id of Object.keys(room.locks))
    if (!room.players?.[room.locks[id]]) delete room.locks[id];
};
function toState(code: string, room: CloudRoom): RoomState {
  const locks = { ...room.locks };
  for (const id of Object.keys(locks))
    if (!room.players?.[locks[id]]) delete locks[id];
  return {
    code,
    language: room.language,
    stageIndex: room.stageIndex,
    solved: Object.keys(room.solved ?? {}).filter((id) => room.solved?.[id]),
    locks,
    players: Object.values(room.players ?? {}),
    drafts: room.drafts ?? {},
    completed: room.completed,
  };
}

/** A cooperative, authenticated Firebase adapter. Grading still runs in the
 * isolated browser runner; this is not a competitive or tamper-proof judge. */
export class FirebaseRoomClient {
  playerId = "";
  private db: Database;
  private code = "";
  private stops: Unsubscribe[] = [];
  private disconnectAction: ReturnType<typeof onDisconnect> | null = null;
  private active = false;
  private lastMove = 0;
  private language: Language = "javascript";
  private name = "旅人";
  constructor(private options: RoomOptions) {
    if (!auth) throw new Error("Firebaseの認証設定が必要です。");
    this.db = getDatabase(auth.app, import.meta.env.VITE_FIREBASE_DATABASE_URL);
  }
  async create(language: Language, name: string) {
    this.options.onStatus?.("connecting");
    await this.disconnect();
    this.requireUser();
    for (let attempt = 0; attempt < 8; attempt++) {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const roomRef = ref(this.db, `rooms/${code}`);
      let collision = false;
      const result = await runTransaction(
        roomRef,
        (room: CloudRoom | null) => {
          if (room) {
            collision = true;
            return;
          }
          const now = Date.now();
          return {
            language,
            stageIndex: 0,
            completed: false,
            createdAt: now,
            updatedAt: now,
            players: { [this.playerId]: this.player(name, colors[0]) },
          } satisfies CloudRoom;
        },
        { applyLocally: false },
      );
      if (result.committed) {
        await this.subscribe(code, language, name);
        return;
      }
      if (!collision)
        throw new Error(
          "ルームを作れませんでした。Firebaseのルールを確認してください。",
        );
    }
    throw new Error("ルームを作れませんでした。もう一度試してください。");
  }
  async join(code: string, language: Language, name: string) {
    this.options.onStatus?.("connecting");
    await this.disconnect();
    this.requireUser();
    if (!/^\d{6}$/.test(code)) throw new Error("ルームコードは6桁の数字です。");
    let reason = "ルームが見つかりません。コードを確認してください。";
    // Keep a listener alive through the transaction. A one-shot get does not
    // seed the transaction cache, so its first callback can otherwise see null.
    const roomRef = ref(this.db, `rooms/${code}`);
    let stop: Unsubscribe = () => {};
    const initial = await new Promise<DataSnapshot>((resolve, reject) => {
      stop = onValue(roomRef, resolve, reject);
    });
    try {
      const initialRoom = initial.val() as CloudRoom | null;
      if (!initialRoom?.players || Date.now() - initialRoom.updatedAt > TTL) {
        if (initialRoom && !initialRoom.players)
          await remove(ref(this.db, `rooms/${code}`));
        throw new Error(reason);
      }
      const result = await runTransaction(
        ref(this.db, `rooms/${code}`),
        (room: CloudRoom | null) => {
          if (!room || !room.players || Date.now() - room.updatedAt > TTL) return;
          if (room.language !== language) {
            reason =
              "このルームは別の言語のコースです。コースを切り替えてください。";
            return;
          }
          if (
            !room.players[this.playerId] &&
            Object.keys(room.players).length >= 4
          ) {
            reason = "ルームが満員です（最大4人）。";
            return;
          }
          cleanLocks(room);
          const used = Object.values(room.players)
            .filter((p) => p.id !== this.playerId)
            .map((p) => p.color);
          room.players[this.playerId] = this.player(
            name,
            colors.find((c) => !used.includes(c)) ?? colors[0],
          );
          room.updatedAt = Date.now();
          return room;
        },
        { applyLocally: false },
      );
      if (!result.committed) throw new Error(reason);
      await this.subscribe(code, language, name);
    } finally {
      stop();
    }
  }
  private requireUser() {
    if (!auth?.currentUser)
      throw new Error(
        "ゲスト参加またはGoogleログインをしてからルームに参加してください。",
      );
    this.playerId = auth.currentUser.uid;
  }
  private player(name: string, color: string): Player {
    return {
      id: this.playerId,
      name:
        name
          .replace(/[\u0000-\u001f\u007f]/g, "")
          .trim()
          .slice(0, 16) || "旅人",
      color,
      x: 0,
      z: 3,
    };
  }
  private async subscribe(code: string, language: Language, name: string) {
    this.code = code;
    this.language = language;
    this.name = name;
    this.active = true;
    this.disconnectAction = onDisconnect(
      ref(this.db, `rooms/${code}/players/${this.playerId}`),
    );
    await this.disconnectAction.remove();
    this.stops.push(
      onValue(
        ref(this.db, `rooms/${code}`),
        (snapshot) => {
          const room = snapshot.val() as CloudRoom | null;
          if (!this.active) return;
          if (room?.players?.[this.playerId])
            this.options.onState(toState(code, room));
          else if (room && !room.players) {
            this.options.onStatus?.("disconnected");
            this.options.onError(
              "全員が退出したため冒険が終了しました。新しいルームを作ってください。",
            );
          }
        },
        (error) =>
          this.options.onError(
            `ルームを読み込めませんでした。${error.message}`,
          ),
      ),
    );
    let wasConnected = true;
    this.stops.push(
      onValue(ref(this.db, ".info/connected"), (snapshot) => {
        const connected = Boolean(snapshot.val());
        this.options.onStatus?.(connected ? "connected" : "disconnected");
        if (connected && !wasConnected && this.active) {
          // onDisconnect registrations fire once. Register again and rejoin only
          // while another participant keeps the room alive.
          this.restorePresence().catch((error) =>
            this.options.onError(
              error instanceof Error ? error.message : String(error),
            ),
          );
        }
        wasConnected = connected;
      }),
    );
    this.options.onStatus?.("connected");
  }
  private async restorePresence() {
    if (!this.code || !this.active) return;
    this.disconnectAction = onDisconnect(
      ref(this.db, `rooms/${this.code}/players/${this.playerId}`),
    );
    await this.disconnectAction.remove();
    await get(ref(this.db, `rooms/${this.code}`));
    const result = await runTransaction(
      ref(this.db, `rooms/${this.code}`),
      (room: CloudRoom | null) => {
        if (
          !room?.players ||
          room.language !== this.language ||
          Date.now() - room.updatedAt > TTL
        )
          return;
        if (
          !room.players[this.playerId] &&
          Object.keys(room.players).length >= 4
        )
          return;
        cleanLocks(room);
        if (!room.players[this.playerId])
          room.players[this.playerId] = this.player(
            this.name,
            colors.find(
              (c) => !Object.values(room.players!).some((p) => p.color === c),
            ) ?? colors[0],
          );
        room.updatedAt = Date.now();
        return room;
      },
      { applyLocally: false },
    );
    if (!result.committed)
      throw new Error(
        "元のルームに戻れませんでした。コードを確認して再参加してください。",
      );
  }
  private update(change: (room: CloudRoom) => void) {
    if (!this.active || !this.code) {
      this.options.onError("ルームに参加してください。");
      return;
    }
    let reason = "ルームが終了しました。もう一度参加してください。";
    void runTransaction(
      ref(this.db, `rooms/${this.code}`),
      (room: CloudRoom | null) => {
        if (!room?.players?.[this.playerId]) return;
        try {
          cleanLocks(room);
          change(room);
          room.updatedAt = Date.now();
          return room;
        } catch (error) {
          reason = error instanceof Error ? error.message : String(error);
          return;
        }
      },
      { applyLocally: false },
    )
      .then((result) => {
        if (!result.committed) this.options.onError(reason);
      })
      .catch((error) =>
        this.options.onError(`ルームを更新できませんでした。${error.message}`),
      );
  }
  private check(room: CloudRoom, id: string) {
    const problem = courses[room.language].stages[
      room.stageIndex
    ]?.problems.find((p) => p.id === id);
    if (!problem) throw new Error("現在のステージにない端末です。");
    return problem;
  }
  lock(id: string) {
    this.update((room) => {
      this.check(room, id);
      if (room.completed) throw new Error("この冒険はクリア済みです。");
      if (
        room.solved?.[id] &&
        courses[room.language].stages[room.stageIndex].kind !== "boss"
      )
        return;
      if (room.locks?.[id] && room.locks[id] !== this.playerId)
        throw new Error(
          "仲間がこの端末を修復しています。別の端末を選んでください。",
        );
      for (const key of Object.keys(room.locks ?? {}))
        if (room.locks?.[key] === this.playerId) delete room.locks[key];
      (room.locks ??= {})[id] = this.playerId;
    });
  }
  release(id: string) {
    this.update((room) => {
      this.check(room, id);
      if (room.locks?.[id] === this.playerId) delete room.locks[id];
    });
  }
  draft(id: string, code: string) {
    this.update((room) => {
      this.check(room, id);
      if (room.locks?.[id] !== this.playerId)
        throw new Error("この端末の担当者だけが編集できます。");
      if (code.length > 20000)
        throw new Error("コードは20,000文字以内にしてください。");
      const boss =
        courses[room.language].stages[room.stageIndex].kind === "boss";
      if (room.solved?.[id] && !boss)
        throw new Error("修復済みの端末は編集できません。");
      if (boss && room.drafts?.[id] !== code && room.solved?.[id])
        delete room.solved[id];
      (room.drafts ??= {})[id] = code;
    });
  }
  solve(id: string) {
    this.update((room) => {
      this.check(room, id);
      if (room.locks?.[id] !== this.playerId)
        throw new Error("端末を選択してから提出してください。");
      (room.solved ??= {})[id] = true;
      delete room.locks[id];
    });
  }
  advance() {
    this.update((room) => {
      const stage = courses[room.language].stages[room.stageIndex];
      if (!stage.problems.every((p) => room.solved?.[p.id]))
        throw new Error("全ての端末を修復してから先へ進みましょう。");
      if (room.stageIndex === courses[room.language].stages.length - 1)
        room.completed = true;
      else {
        room.stageIndex++;
        room.locks = {};
        Object.values(room.players ?? {}).forEach((p) => {
          p.x = 0;
          p.z = 3;
        });
      }
    });
  }
  move(x: number, z: number) {
    if (
      !Number.isFinite(x) ||
      !Number.isFinite(z) ||
      Date.now() - this.lastMove < 250
    )
      return;
    this.lastMove = Date.now();
    this.update((room) => {
      const p = room.players![this.playerId];
      p.x = Math.max(-8, Math.min(8, x));
      p.z = Math.max(-8, Math.min(8, z));
    });
  }
  async disconnect() {
    this.active = false;
    this.stops.forEach((stop) => stop());
    this.stops = [];
    const code = this.code,
      id = this.playerId;
    this.code = "";
    this.playerId = "";
    if (this.disconnectAction) {
      await this.disconnectAction.cancel().catch(() => {});
      this.disconnectAction = null;
    }
    if (code && id)
      await runTransaction(
        ref(this.db, `rooms/${code}`),
        (room: CloudRoom | null) => {
          if (!room) return;
          delete room.players?.[id];
          cleanLocks(room);
          if (!Object.keys(room.players ?? {}).length) return null;
          room.updatedAt = Date.now();
          return room;
        },
        { applyLocally: false },
      ).catch(() => {});
  }
}
