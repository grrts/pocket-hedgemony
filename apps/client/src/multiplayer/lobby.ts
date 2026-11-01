import type { PlayerOrders } from "@ph/engine";
import type { MpStore } from "./store.ts";

/**
 * Where an online game lives (domain/multiplayer MP-020 … MP-051): our
 * server's game table when the build has one (`serverTable`, server.ts), else
 * the Artifact's shared database or this browser's storage (`storeTable`, the
 * prototype's table). Nothing lists every game: a player reaches one by its
 * code, so a table holds any number of them.
 */
export interface Table {
  /** "online" reaches other devices; "this browser" only other tabs. */
  reach: "online" | "this browser";
  /** Whether this viewer may write: false for someone the page is shared with only to view, null when not told. */
  canWrite: boolean | null;
  host(realm: string): Promise<OnlineGame>;
  /** The game by its code, or null when there is none (or it ended). */
  find(code: string): Promise<OnlineGame | null>;
  seatOf(code: string, realm: string): Promise<Seat | null>;
  /** Sits down on a realm before the start, or comes back to one's own realm after it. */
  sit(code: string, realm: string): Promise<void>;
  /** Before the start the realm is free again; after it the game leaves Your games. */
  leave(code: string): Promise<void>;
  /** `turnLimit`: seconds each week stays open, 0 for none; only where `turnLimits` is offered (MP-080). */
  start(game: OnlineGame, seats: Seat[], turnLimit?: number): Promise<void>;
  /** The turn limits the host may pick from, in seconds (0: none); absent where the table keeps no time. */
  turnLimits?: readonly number[];
  /** Hands a realm to the AI from the week the table is on (MP-081); absent where the table cannot. */
  drop?(code: string, realm: string): Promise<void>;
  send(code: string, doc: TurnDoc): Promise<void>;
  watchGame(code: string, cb: (game: OnlineGame | null) => void): () => void;
  watchSeats(code: string, cb: (seats: Seat[]) => void): () => void;
  /** Every week's orders, now and as more arrive; a call may bring only the new ones. */
  watchTurns(code: string, cb: (turns: TurnDoc[]) => void): () => void;
  /** Your games: this account's (server) or this browser's (store). */
  mine(): Promise<MyGame[]>;
}

export interface OnlineGame {
  code: string;
  seed: number;
  /** The realm of the player who made the game: they start it. */
  host: string;
  created: number;
  /** The realms in play, fixed when the host starts the game; empty before. */
  humans: string[];
  started: boolean;
  /** The first week two devices disagreed on, as the server saw it. */
  outOfStep?: number | null;
  /** Seconds a week stays open for orders; null or absent: no limit (MP-080). */
  turnLimit?: number | null;
  /** When the week the table is on opened, by this device's clock (ms). */
  weekOpened?: number | null;
  /** The realms handed to the AI, and the week from which they play as computer realms (MP-081). */
  dropped?: Record<string, number>;
}

/** The realms people still play in week `week`: the others were handed to the AI by then (MP-081). */
export function activeIn(game: Pick<OnlineGame, "humans" | "dropped">, week: number): string[] {
  return game.humans.filter((h) => !(game.dropped && h in game.dropped && game.dropped[h]! <= week));
}

/** When the week the table is on closes (ms, this device's clock), or null with no limit. */
export function weekDue(game: Pick<OnlineGame, "turnLimit" | "weekOpened">): number | null {
  return game.turnLimit && game.weekOpened ? game.weekOpened + game.turnLimit * 1000 : null;
}

/** Time left, as a clock reads it: "4:05", "2 h 10", "1 d 3 h"; "0:00" once it ran out. */
export function timeLeft(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  if (s < 3600) return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}`;
  return `${Math.floor(s / 86400)} d ${Math.floor((s % 86400) / 3600)} h`;
}

/** A turn limit in the host's picker. */
export function limitName(seconds: number): string {
  if (!seconds) return "No limit";
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} hour${seconds === 3600 ? "" : "s"}`;
  return `${Math.round(seconds / 86400)} day${seconds === 86400 ? "" : "s"}`;
}

export interface Seat {
  realm: string;
  at: number;
  /** This player's own seat (this account's, or this tab's). */
  mine: boolean;
  /** The player's name, where the table knows it. */
  player?: string;
}

export interface TurnDoc {
  turn: number;
  realm: string;
  orders: PlayerOrders;
  /** The world's hash at the start of the week, on the device that wrote it: every device's must agree. */
  hash: string;
  /** The realm sent nothing before the week's time ran out: it does nothing that week (MP-080). */
  skipped?: boolean;
}

/** A game in Your games. */
export interface MyGame {
  code: string;
  realm: string;
  started?: boolean;
  /** The game waits on this player's orders (MP-074). */
  yourMove?: boolean;
}

/** This tab's own id: a second tab in the same browser is another device. */
export function deviceId(): string {
  try {
    let id = sessionStorage.getItem("ph-mp-device");
    if (!id) sessionStorage.setItem("ph-mp-device", (id = Math.random().toString(36).slice(2, 10)));
    return id;
  } catch {
    return (deviceId.fallback ||= Math.random().toString(36).slice(2, 10));
  }
}
deviceId.fallback = "" as string;

/** Letters for codes, without those that read alike (I, O). */
const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";

/** A game's code: five letters, about eight million of them. */
function newCode(): string {
  return Array.from({ length: 5 }, () => LETTERS[Math.floor(Math.random() * LETTERS.length)]).join("");
}

/** What a player typed, as a code: letters only, upper case; null when it cannot be one (MP-024). */
export function cleanCode(typed: string): string | null {
  const c = typed.toUpperCase().replace(/[^A-Z]/g, "");
  return c.length >= 4 && c.length <= 5 && [...c].every((x) => LETTERS.includes(x)) ? c : null;
}

// ------------------------------------------------------------------ the prototype's table

/**
 * The table in a shared store (the Artifact's database, or the browser's):
 *   mp/<code>                  the game (host, seed, realms once started)
 *   mp/<code>/players/<realm>  one realm's seat and every week's orders
 * A game is 1 + up to 4 documents, whatever its length: the store's cap is in
 * documents, so the orders are packed into the player's one document.
 */
interface StoredSeat {
  realm: string;
  device: string;
  at: number;
}

/** A realm's document: its seat and its orders, week by week. */
interface PlayerDoc extends StoredSeat {
  weeks: Record<string, { orders: PlayerOrders; hash: string }>;
}

const seatFrom = ({ realm, device, at }: StoredSeat): Seat => ({ realm, at, mine: device === deviceId() });

export function storeTable(store: MpStore): Table {
  const takeSeat = async (code: string, realm: string) => {
    const doc: PlayerDoc = { realm, device: deviceId(), at: Date.now(), weeks: {} };
    await store.set(`mp/${code}/players/${realm}`, { ...doc });
    remember(code, realm);
  };
  return {
    reach: store.reach,
    canWrite: store.canWrite,
    async host(realm) {
      let code = newCode();
      for (let tries = 0; tries < 5 && (await store.get(`mp/${code}`)); tries++) code = newCode();
      const game: OnlineGame = { code, seed: Math.floor(Math.random() * 2 ** 31), host: realm, created: Date.now(), humans: [], started: false };
      await store.set(`mp/${game.code}`, { ...game });
      await takeSeat(game.code, realm);
      return game;
    },
    async find(code) {
      return (await store.get(`mp/${code}`)) as OnlineGame | null;
    },
    async seatOf(code, realm) {
      const s = (await store.get(`mp/${code}/players/${realm}`)) as StoredSeat | null;
      return s && seatFrom(s);
    },
    async sit(code, realm) {
      const game = (await store.get(`mp/${code}`)) as OnlineGame | null;
      if (game?.started) return remember(code, realm);
      await takeSeat(code, realm);
    },
    async leave(code) {
      forget(code);
    },
    async start(game, seats) {
      await store.set(`mp/${game.code}`, { ...game, humans: seats.map((s) => s.realm).sort(), started: true });
    },
    /** Adds a week's orders to the realm's document (only that realm's device writes it). */
    async send(code, doc) {
      const path = `mp/${code}/players/${doc.realm}`;
      const was = ((await store.get(path)) as PlayerDoc | null) ?? { realm: doc.realm, device: deviceId(), at: Date.now(), weeks: {} };
      await store.set(path, { ...was, device: deviceId(), weeks: { ...was.weeks, [doc.turn]: { orders: doc.orders, hash: doc.hash } } });
    },
    watchGame(code, cb) {
      return store.watchDoc(`mp/${code}`, (d) => cb(d as OnlineGame | null));
    },
    watchSeats(code, cb) {
      return store.watch(`mp/${code}/players`, (docs) => cb(docs.map((d) => seatFrom(d.data as unknown as StoredSeat)).sort((a, b) => a.at - b.at)));
    },
    watchTurns(code, cb) {
      return store.watch(`mp/${code}/players`, (docs) =>
        cb(
          docs.flatMap((d) => {
            const p = d.data as unknown as PlayerDoc;
            return Object.entries(p.weeks ?? {}).map(([turn, w]) => ({ turn: Number(turn), realm: p.realm, orders: w.orders, hash: w.hash }));
          }),
        ),
      );
    },
    async mine() {
      return rememberedGames();
    },
  };
}

/** The online games this browser sat down in, newest first, to come back to. */
interface Remembered {
  code: string;
  realm: string;
  at: number;
}

const KEY = "ph-mp-games";

function rememberedGames(): Remembered[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]") as Remembered[];
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function keep(list: Remembered[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 8)));
  } catch {
    /* private mode: nothing kept */
  }
}

function remember(code: string, realm: string): void {
  keep([{ code, realm, at: Date.now() }, ...rememberedGames().filter((g) => g.code !== code)]);
}

function forget(code: string): void {
  keep(rememberedGames().filter((g) => g.code !== code));
}
