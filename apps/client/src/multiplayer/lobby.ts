import type { PlayerOrders } from "@ph/engine";
import type { MpStore } from "./store.ts";

/**
 * An online game in the shared store. Nothing lists every game: a player
 * reaches one by its code, so the table holds any number of them.
 *   mp/<code>                  the game (host, seed, realms once started)
 *   mp/<code>/players/<realm>  one realm's seat and every week's orders
 * A game is 1 + up to 4 documents, whatever its length: the store's cap is in
 * documents, so the orders are packed into the player's one document.
 */
export interface OnlineGame {
  code: string;
  seed: number;
  /** The realm of the device that made the game: it starts it. */
  host: string;
  created: number;
  /** The realms in play, fixed when the host starts the game; empty before. */
  humans: string[];
  started: boolean;
}

export interface Seat {
  realm: string;
  device: string;
  at: number;
}

/** A realm's document: its seat and its orders, week by week. */
interface PlayerDoc extends Seat {
  weeks: Record<string, { orders: PlayerOrders; hash: string }>;
}

export interface TurnDoc {
  turn: number;
  realm: string;
  orders: PlayerOrders;
  /** The world's hash at the start of the week, on the device that wrote it: every device's must agree. */
  hash: string;
  device: string;
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

/** What a player typed, as a code: letters only, upper case; null when it cannot be one. */
export function cleanCode(typed: string): string | null {
  const c = typed.toUpperCase().replace(/[^A-Z]/g, "");
  return c.length >= 4 && c.length <= 5 && [...c].every((x) => LETTERS.includes(x)) ? c : null;
}

export async function hostGame(store: MpStore, realm: string): Promise<OnlineGame> {
  let code = newCode();
  for (let tries = 0; tries < 5 && (await store.get(`mp/${code}`)); tries++) code = newCode();
  const game: OnlineGame = { code, seed: Math.floor(Math.random() * 2 ** 31), host: realm, created: Date.now(), humans: [], started: false };
  await store.set(`mp/${game.code}`, { ...game });
  await takeSeat(store, game.code, realm);
  return game;
}

export async function findGame(store: MpStore, code: string): Promise<OnlineGame | null> {
  return (await store.get(`mp/${code}`)) as OnlineGame | null;
}

export async function seatOf(store: MpStore, code: string, realm: string): Promise<Seat | null> {
  return (await store.get(`mp/${code}/players/${realm}`)) as Seat | null;
}

export async function takeSeat(store: MpStore, code: string, realm: string): Promise<void> {
  const doc: PlayerDoc = { realm, device: deviceId(), at: Date.now(), weeks: {} };
  await store.set(`mp/${code}/players/${realm}`, { ...doc });
}

/** The host starts the game with the realms seated now. */
export async function startOnline(store: MpStore, game: OnlineGame, seats: Seat[]): Promise<void> {
  await store.set(`mp/${game.code}`, { ...game, humans: seats.map((s) => s.realm).sort(), started: true });
}

/** Adds a week's orders to the realm's document (only that realm's device writes it). */
export async function sendTurn(store: MpStore, code: string, doc: TurnDoc): Promise<void> {
  const path = `mp/${code}/players/${doc.realm}`;
  const was = ((await store.get(path)) as PlayerDoc | null) ?? { realm: doc.realm, device: doc.device, at: Date.now(), weeks: {} };
  await store.set(path, { ...was, device: doc.device, weeks: { ...was.weeks, [doc.turn]: { orders: doc.orders, hash: doc.hash } } });
}

export function watchGame(store: MpStore, code: string, cb: (game: OnlineGame | null) => void): () => void {
  return store.watchDoc(`mp/${code}`, (d) => cb(d as OnlineGame | null));
}

export function watchSeats(store: MpStore, code: string, cb: (seats: Seat[]) => void): () => void {
  return store.watch(`mp/${code}/players`, (docs) =>
    cb(
      docs
        .map((d) => d.data as unknown as PlayerDoc)
        .map(({ realm, device, at }) => ({ realm, device, at }))
        .sort((a, b) => a.at - b.at),
    ),
  );
}

export function watchTurns(store: MpStore, code: string, cb: (turns: TurnDoc[]) => void): () => void {
  return store.watch(`mp/${code}/players`, (docs) =>
    cb(
      docs.flatMap((d) => {
        const p = d.data as unknown as PlayerDoc;
        return Object.entries(p.weeks ?? {}).map(([turn, w]) => ({ turn: Number(turn), realm: p.realm, orders: w.orders, hash: w.hash, device: p.device }));
      }),
    ),
  );
}

/** The online games this browser sat down in, newest first, to come back to. */
export interface Remembered {
  code: string;
  realm: string;
  at: number;
}

const KEY = "ph-mp-games";

export function rememberedGames(): Remembered[] {
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

export function remember(code: string, realm: string): void {
  keep([{ code, realm, at: Date.now() }, ...rememberedGames().filter((g) => g.code !== code)]);
}

export function forget(code: string): void {
  keep(rememberedGames().filter((g) => g.code !== code));
}
