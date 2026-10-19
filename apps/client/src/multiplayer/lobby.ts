import type { PlayerOrders } from "@ph/engine";
import type { MpStore } from "./store.ts";

/**
 * An online game in the shared store: `mp/<code>` holds the game, its seats
 * are `mp/<code>/seats/<realm>`, and each player's orders for a week are
 * `mp/<code>/turns/<week>-<realm>`, written once when they press Ready.
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
    return (deviceId.fallback ??= Math.random().toString(36).slice(2, 10));
  }
}
deviceId.fallback = "" as string;

/** A game's four-letter code, without letters that read alike (I, O). */
function newCode(): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  return Array.from({ length: 4 }, () => letters[Math.floor(Math.random() * letters.length)]).join("");
}

export async function hostGame(store: MpStore, realm: string): Promise<OnlineGame> {
  const game: OnlineGame = { code: newCode(), seed: Math.floor(Math.random() * 2 ** 31), host: realm, created: Date.now(), humans: [], started: false };
  await store.set(`mp/${game.code}`, { ...game });
  await takeSeat(store, game.code, realm);
  return game;
}

export async function takeSeat(store: MpStore, code: string, realm: string): Promise<void> {
  const seat: Seat = { realm, device: deviceId(), at: Date.now() };
  await store.set(`mp/${code}/seats/${realm}`, { ...seat });
}

/** The host starts the game with the realms seated now. */
export async function startOnline(store: MpStore, game: OnlineGame, seats: Seat[]): Promise<void> {
  await store.set(`mp/${game.code}`, { ...game, humans: seats.map((s) => s.realm).sort(), started: true });
}

export async function sendTurn(store: MpStore, code: string, doc: TurnDoc): Promise<void> {
  await store.set(`mp/${code}/turns/${doc.turn}-${doc.realm}`, { ...doc } as unknown as Record<string, unknown>);
}

/** Games open to join, newest first; games older than two days are left out. */
export function watchGames(store: MpStore, cb: (games: OnlineGame[]) => void): () => void {
  return store.watch("mp", (docs) =>
    cb(
      docs
        .map((d) => d.data as unknown as OnlineGame)
        .filter((g) => typeof g.code === "string" && Date.now() - g.created < 2 * 86400_000)
        .sort((a, b) => b.created - a.created),
    ),
  );
}

export function watchGame(store: MpStore, code: string, cb: (game: OnlineGame | null) => void): () => void {
  return store.watch("mp", (docs) => cb((docs.find((d) => d.id === code)?.data as unknown as OnlineGame) ?? null));
}

export function watchSeats(store: MpStore, code: string, cb: (seats: Seat[]) => void): () => void {
  return store.watch(`mp/${code}/seats`, (docs) => cb(docs.map((d) => d.data as unknown as Seat).sort((a, b) => a.at - b.at)));
}

export function watchTurns(store: MpStore, code: string, cb: (turns: TurnDoc[]) => void): () => void {
  return store.watch(`mp/${code}/turns`, (docs) => cb(docs.map((d) => d.data as unknown as TurnDoc)));
}

/** The online game this browser last sat down in, to come back to after a reload. */
export interface Remembered {
  code: string;
  realm: string;
}

export function remember(r: Remembered | null): void {
  try {
    if (r) localStorage.setItem("ph-mp-last", JSON.stringify(r));
    else localStorage.removeItem("ph-mp-last");
  } catch {
    /* private mode: nothing kept */
  }
}

export function remembered(): Remembered | null {
  try {
    const v = localStorage.getItem("ph-mp-last");
    return v ? (JSON.parse(v) as Remembered) : null;
  } catch {
    return null;
  }
}
