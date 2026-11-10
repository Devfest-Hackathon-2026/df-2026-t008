import type { Language, RoomState } from "../types";
import { FirebaseRoomClient } from "./firebaseRooms";
export type RoomOptions = {
  onState: (state: RoomState) => void;
  onError: (message: string) => void;
  onStatus?: (status: "connecting" | "connected" | "disconnected") => void;
};
class LocalRoomClient {
  playerId = "";
  private socket: WebSocket | null = null;
  private settled = false;
  constructor(private options: RoomOptions) {}
  private connect(payload: Record<string, unknown>): Promise<void> {
    this.disconnect();
    this.settled = false;
    this.options.onStatus?.("connecting");
    return new Promise((resolve, reject) => {
      const protocol = location.protocol === "https:" ? "wss:" : "ws:";
      const socket = new WebSocket(`${protocol}//${location.host}/ws`);
      this.socket = socket;
      const timeout = window.setTimeout(() => {
        reject(
          new Error(
            "協力サーバーに接続できませんでした。npm run dev で起動しているか確認してください。",
          ),
        );
        socket.close();
      }, 10000);
      socket.onopen = () => socket.send(JSON.stringify(payload));
      socket.onmessage = (event) => {
        let data;
        try {
          data = JSON.parse(event.data);
        } catch {
          return;
        }
        if (data.type === "joined") {
          clearTimeout(timeout);
          this.settled = true;
          this.playerId = data.playerId;
          this.options.onStatus?.("connected");
          this.options.onState(data.state);
          resolve();
        } else if (data.type === "state") this.options.onState(data.state);
        else if (data.type === "error") {
          this.options.onError(data.message);
          if (!this.settled) {
            clearTimeout(timeout);
            reject(new Error(data.message));
            socket.close();
          }
        }
      };
      socket.onerror = () => {
        if (!this.settled) {
          clearTimeout(timeout);
          reject(
            new Error(
              "協力サーバーに接続できませんでした。サーバーの起動と接続を確認してください。",
            ),
          );
        }
      };
      socket.onclose = () => {
        clearTimeout(timeout);
        this.options.onStatus?.("disconnected");
        if (!this.settled)
          reject(new Error("接続が切れました。もう一度参加してください。"));
      };
    });
  }
  create(language: Language, name: string) {
    return this.connect({ type: "create", language, name });
  }
  join(code: string, language: Language, name: string) {
    return this.connect({ type: "join", code, language, name });
  }
  private send(data: Record<string, unknown>) {
    if (this.socket?.readyState === WebSocket.OPEN)
      this.socket.send(JSON.stringify(data));
    else
      this.options.onError(
        "ルームとの接続が切れています。もう一度参加してください。",
      );
  }
  lock(problemId: string) {
    this.send({ type: "lock", problemId });
  }
  release(problemId: string) {
    this.send({ type: "release", problemId });
  }
  draft(problemId: string, code: string) {
    this.send({ type: "draft", problemId, code });
  }
  solve(problemId: string) {
    this.send({ type: "solve", problemId });
  }
  advance() {
    this.send({ type: "advance" });
  }
  selectStage(stageIndex: number) {
    this.send({ type: "selectStage", stageIndex });
  }
  move(x: number, z: number) {
    if (this.socket?.readyState === WebSocket.OPEN)
      this.socket.send(JSON.stringify({ type: "move", x, z }));
  }
  disconnect() {
    if (this.socket) {
      this.socket.onclose = null;
      this.socket.onmessage = null;
      this.socket.onerror = null;
      this.socket.close();
      this.socket = null;
    }
    this.playerId = "";
  }
}

/** Uses Google Realtime Database when configured, otherwise the local WS server. */
export class RoomClient {
  private backend: LocalRoomClient | FirebaseRoomClient;
  constructor(options: RoomOptions) {
    this.backend = import.meta.env.VITE_FIREBASE_DATABASE_URL
      ? new FirebaseRoomClient(options)
      : new LocalRoomClient(options);
  }
  get playerId() {
    return this.backend.playerId;
  }
  create(language: Language, name: string) {
    return this.backend.create(language, name);
  }
  join(code: string, language: Language, name: string) {
    return this.backend.join(code, language, name);
  }
  lock(id: string) {
    this.backend.lock(id);
  }
  release(id: string) {
    this.backend.release(id);
  }
  draft(id: string, code: string) {
    this.backend.draft(id, code);
  }
  solve(id: string) {
    this.backend.solve(id);
  }
  advance() {
    this.backend.advance();
  }
  selectStage(stageIndex: number) {
    this.backend.selectStage(stageIndex);
  }
  move(x: number, z: number) {
    this.backend.move(x, z);
  }
  disconnect() {
    void this.backend.disconnect();
  }
}
