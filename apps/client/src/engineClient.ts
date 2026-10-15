import { createEngineHost, type EngineRequest, type EngineResponse, type Snapshot } from "@ph/engine";
import { loadDefaultRuleset } from "@ph/rules";

type WithoutId<T> = T extends unknown ? Omit<T, "id"> : never;
type Request = WithoutId<EngineRequest>;

export type EngineMode = "worker" | "main-thread";

/**
 * UI-thread handle on the engine. The simulation normally runs in a module
 * Web Worker so long turns never freeze scrolling or zooming the map. If the
 * worker can't start (an old Android WebView, a webview that refuses workers
 * from its local scheme), the same engine runs on the main thread instead so
 * the game still works, just with pauses on heavy turns.
 */
export class EngineClient {
  mode: EngineMode = "worker";
  private worker: Worker | null = null;
  private inline: ReturnType<typeof createEngineHost> | null = null;
  private workerAnswered = false;
  private nextId = 1;
  private sent: EngineRequest[] = [];
  private pending = new Map<number, { resolve: (s: Snapshot) => void; reject: (e: Error) => void }>();

  constructor(opts: { forceMainThread?: boolean } = {}) {
    if (opts.forceMainThread) {
      this.fallBackToMainThread();
      return;
    }
    try {
      this.worker = new Worker(new URL("./engine.worker.ts", import.meta.url), { type: "module" });
    } catch {
      this.fallBackToMainThread();
      return;
    }
    this.worker.onmessage = (event: MessageEvent<EngineResponse>) => {
      this.workerAnswered = true;
      this.sent = [];
      this.settle(event.data);
    };
    this.worker.onerror = (event) => {
      if (!this.workerAnswered) {
        // The worker never ran; replay what it was sent on the main thread.
        event.preventDefault();
        this.fallBackToMainThread();
        return;
      }
      const err = new Error(`engine worker crashed: ${event.message}`);
      for (const p of this.pending.values()) p.reject(err);
      this.pending.clear();
    };
  }

  send(req: Request): Promise<Snapshot> {
    const full = { ...req, id: this.nextId++ } as EngineRequest;
    return new Promise((resolve, reject) => {
      this.pending.set(full.id, { resolve, reject });
      if (this.inline) {
        this.runInline(full);
      } else {
        if (!this.workerAnswered) this.sent.push(full);
        this.worker!.postMessage(full);
      }
    });
  }

  terminate(): void {
    this.worker?.terminate();
  }

  private fallBackToMainThread(): void {
    this.worker?.terminate();
    this.worker = null;
    this.mode = "main-thread";
    this.inline = createEngineHost(loadDefaultRuleset);
    for (const req of this.sent) this.runInline(req);
    this.sent = [];
  }

  private runInline(req: EngineRequest): void {
    // Yield first so the UI can paint "calculating" before a heavy turn.
    setTimeout(() => this.settle(this.inline!(req).response), 0);
  }

  private settle(msg: EngineResponse): void {
    const p = this.pending.get(msg.id);
    if (!p) return;
    this.pending.delete(msg.id);
    if (msg.type === "snapshot") p.resolve(msg.snapshot);
    else p.reject(new Error(msg.message));
  }
}
