/**
 * What the desktop shell (apps/desktop/src/preload.cjs) offers the game as
 * `window.phDesktop`: the save folder (SAVE-144), the device token in
 * safeStorage (SAVE-143) and, in the Steam build with Steam running, the Web
 * API ticket (SAVE-140, SAVE-141). A browser or a phone has none of it.
 */

/** One save in the folder: its path and the bytes of its header. */
export interface FolderEntry {
  path: string;
  head: Uint8Array;
}

export interface SaveFolderBridge {
  list(): Promise<FolderEntry[]>;
  read(path: string): Promise<Uint8Array | undefined>;
  commit(path: string, bytes: Uint8Array, removed: readonly string[]): Promise<void>;
  remove(path: string): Promise<void>;
}

export interface SteamBridge {
  /** The player's Steam name, for the account's first display name. */
  name: string;
  /** `GetAuthTicketForWebApi(identity)` as hex. */
  webTicket(identity: string): Promise<string>;
}

export interface DesktopBridge {
  version: number;
  steamDeck: boolean;
  saves: SaveFolderBridge;
  secret: { usable: boolean; get(): string | undefined; set(value: string | undefined): boolean };
  steam?: SteamBridge;
}

export function desktopBridge(): DesktopBridge | undefined {
  const b = (globalThis as { phDesktop?: DesktopBridge }).phDesktop;
  return b && typeof b.saves?.list === "function" ? b : undefined;
}
