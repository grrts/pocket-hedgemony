import type { PlayerOrders } from "@ph/engine";
import type { CloudApi, GameTable } from "../cloud/api.ts";
import type { OnlineGame, Seat, Table, TurnDoc } from "./lobby.ts";

/** How often an open game asks the server for changes (MP-037; provisional). */
export const POLL_MS = 2_000;
export const POLL_HIDDEN_MS = 15_000;

const gameOf = (t: GameTable): OnlineGame | null =>
  t.game.ended ? null : { code: t.game.code, seed: t.game.seed, host: t.game.host, created: t.game.created, humans: t.game.humans, started: t.game.started, outOfStep: t.game.outOfStep };
const seatsOf = (t: GameTable): Seat[] => t.seats.map((s) => ({ realm: s.realm, at: s.at, mine: s.mine, player: s.player }));
const turnsOf = (t: GameTable): TurnDoc[] => t.weeks.map((w) => ({ turn: w.week, realm: w.realm, orders: w.orders as PlayerOrders, hash: w.hash }));

/**
 * One open game, asked for every few seconds while anything watches it. The
 * server answers "not changed" for the version the device has (MP-036), and
 * sends only the weeks from the first one this device does not have whole.
 */
class Poll {
  readonly code: string;
  private readonly api: CloudApi;
  private etag: string | undefined;
  private since = 0;
  /** The realms whose orders are here, by week. */
  private readonly have = new Map<number, Set<string>>();
  private last: GameTable | undefined;
  /** The game is gone (404) or ended. */
  private gone = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private running: Promise<void> | undefined;
  readonly games = new Set<(g: OnlineGame | null) => void>();
  readonly seats = new Set<(s: Seat[]) => void>();
  readonly turns = new Set<(t: TurnDoc[]) => void>();
  onIdle: () => void = () => {};

  constructor(api: CloudApi, code: string) {
    this.api = api;
    this.code = code;
  }

  get watched(): boolean {
    return this.games.size + this.seats.size + this.turns.size > 0;
  }

  /** What is known now goes to a new watcher at once; then an ask, soon. */
  added(): void {
    if (this.last) this.deliver(this.last, true);
    else if (this.gone) this.games.forEach((cb) => cb(null));
    this.kick();
  }

  /** Ask now (after this device wrote, or a watcher joined). */
  kick(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
    this.running ??= this.ask().finally(() => {
      this.running = undefined;
      this.schedule();
    });
  }

  stop(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
  }

  private schedule(): void {
    if (!this.watched) return this.onIdle();
    if (this.timer) return;
    const hidden = typeof document !== "undefined" && document.visibilityState === "hidden";
    this.timer = setTimeout(() => {
      this.timer = undefined;
      this.kick();
    }, hidden ? POLL_HIDDEN_MS : POLL_MS);
  }

  private async ask(): Promise<void> {
    if (this.gone) return;
    try {
      const r = await this.api.getGame(this.code, this.since, this.etag);
      if (!r) return;
      this.etag = r.etag;
      this.last = r.table;
      this.deliver(r.table, false);
    } catch (e) {
      if ((e as { status?: number }).status === 404) {
        this.gone = true;
        this.games.forEach((cb) => cb(null));
      }
      // Offline or limited: the next ask tries again.
    }
  }

  private deliver(t: GameTable, all: boolean): void {
    const game = gameOf(t);
    if (!game) this.gone = true;
    this.games.forEach((cb) => cb(game));
    const seats = seatsOf(t);
    this.seats.forEach((cb) => cb(seats));
    const turns = turnsOf(t);
    if (turns.length || all) this.turns.forEach((cb) => cb(turns));
    for (const d of turns) {
      let s = this.have.get(d.turn);
      if (!s) this.have.set(d.turn, (s = new Set()));
      s.add(d.realm);
    }
    // The weeks every realm has sent are not asked for again.
    const humans = t.game.humans;
    if (humans.length) while (humans.every((h) => this.have.get(this.since)?.has(h))) this.since++;
  }
}

/** The game table on our server, as the signed-in account (MP-020). */
export function serverTable(api: CloudApi): Table {
  const polls = new Map<string, Poll>();
  const poll = (code: string) => {
    let p = polls.get(code);
    if (!p) {
      p = new Poll(api, code);
      const q = p;
      q.onIdle = () => {
        if (!q.watched) polls.delete(code);
      };
      polls.set(code, p);
    }
    return p;
  };
  function watch<T>(code: string, pick: (p: Poll) => Set<T>, cb: T): () => void {
    const p = poll(code);
    pick(p).add(cb);
    p.added();
    return () => {
      pick(p).delete(cb);
      if (!p.watched) {
        p.stop();
        polls.delete(code);
      }
    };
  }
  const kick = (code: string) => polls.get(code)?.kick();
  return {
    reach: "online",
    canWrite: true,
    async host(realm) {
      return gameOf(await api.hostGame(realm))!;
    },
    async find(code) {
      try {
        const r = await api.getGame(code, 0);
        return r ? gameOf(r.table) : null;
      } catch (e) {
        if ((e as { status?: number }).status === 404) return null;
        throw e;
      }
    },
    async seatOf(code, realm) {
      const r = await api.getGame(code, Number.MAX_SAFE_INTEGER);
      return r ? (seatsOf(r.table).find((s) => s.realm === realm) ?? null) : null;
    },
    async sit(code, realm) {
      await api.sitGame(code, realm);
      kick(code);
    },
    async leave(code) {
      await api.leaveGame(code);
    },
    async start(game) {
      await api.startGame(game.code);
      kick(game.code);
    },
    async send(code, doc) {
      await api.sendWeek(code, doc.turn, { realm: doc.realm, orders: doc.orders, hash: doc.hash });
      kick(code);
    },
    watchGame: (code, cb) => watch(code, (p) => p.games, cb),
    watchSeats: (code, cb) => watch(code, (p) => p.seats, cb),
    watchTurns: (code, cb) => watch(code, (p) => p.turns, cb),
    async mine() {
      return (await api.myGames()).map((g) => ({ code: g.code, realm: g.realm, started: g.started, yourMove: g.yourMove }));
    },
  };
}
