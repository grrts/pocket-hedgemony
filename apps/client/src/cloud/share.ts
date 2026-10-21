import { readHeader, savesConfig, shareCode, sharedCopy, type Platform, type SaveHeader } from "@ph/engine/domain/saves";
import type { Rng } from "@ph/engine";
import { CloudError, errorText, type CloudApi, type Shared, type SharePurpose } from "./api.ts";

/**
 * Sharing saves with the community (domain/saves SAVE-124 … SAVE-136,
 * accounts-design §7): the Share sheet, one card for the subject, and opening
 * a shared save as a new campaign of the player's own. The server makes the
 * topic; this file only gathers what the player chose and shows the answer.
 */

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const SM = savesConfig.messages;

/** The three choices, which pick the board, and sharing back into the original topic (SAVE-125, SAVE-130). */
export const PURPOSES: { id: SharePurpose; label: string; line: string }[] = [
  { id: "reply", label: "Reply in the original topic", line: "Show how you played on from the save you took over." },
  { id: "show", label: "Show my campaign", line: "Posts to Strategy and campaign stories." },
  { id: "help", label: "Help me with this", line: "Posts to Saves to try, where others take over a stuck campaign." },
  { id: "broke", label: "Something broke", line: "Posts to Bug reports, with the save to look at." },
];

export interface ShareView {
  /** The save being shared, as the SaveStore names it. */
  path: string;
  header: SaveHeader;
  title: string;
  note: string;
  purpose: SharePurpose | undefined;
  busy: boolean;
  error: string;
  /** The server's answer once it is posted. */
  done: Shared | undefined;
  /** "Link copied." after Copy link. */
  copied: boolean;
}

/** The sheet for one save: the title is the save's name, and a copy of a shared save replies in its topic by default. */
export function shareView(path: string, header: SaveHeader): ShareView {
  return { path, header, title: header.name, note: "", purpose: header.sharedFrom ? "reply" : undefined, busy: false, error: "", done: undefined, copied: false };
}

/** The Share sheet's body (SAVE-133). `signedIn` false gives the sign-in offer instead of the form. */
export function shareSheetHtml(v: ShareView, opts: { signedIn: boolean; systemShare: boolean }): string {
  if (!opts.signedIn) {
    return `<div class="share-sheet">
      <p class="hint">Sharing posts the save to the community as you, so it needs your account. Everyone can then play it as a campaign of their own.</p>
      <button class="wax" data-shell="settings" data-settings-section="account">Sign in</button>
    </div>`;
  }
  if (v.done) {
    return `<div class="share-sheet">
      <p class="note share-done" role="status">${esc(SM.shared)}</p>
      <p class="hint">Others can play it with the link, or by typing the code <b>${esc(v.done.shownCode)}</b> under Load, Open a shared save.</p>
      <div class="share-links">
        <button class="wax" data-share-copy>${v.copied ? "Link copied" : "Copy link"}</button>
        ${opts.systemShare ? `<button class="paper" data-share-system>Share link</button>` : ""}
        <button class="paper" data-share-topic>Open the topic</button>
      </div>
    </div>`;
  }
  const choices = PURPOSES.filter((p) => p.id !== "reply" || v.header.sharedFrom);
  return `<form class="share-sheet" data-share-form>
    ${v.error ? `<p class="note" role="alert">${esc(v.error)}</p>` : ""}
    <label><span>Title</span><input name="title" maxlength="120" value="${esc(v.title)}" autocomplete="off"></label>
    <label><span>A short note <small>(optional)</small></span><textarea name="note" rows="2" maxlength="2000" placeholder="What happened, or what you would like others to try">${esc(v.note)}</textarea></label>
    <fieldset class="share-choices"><legend>What is it for?</legend>
      ${choices
        .map(
          (p) => `<button type="button" class="share-choice${v.purpose === p.id ? " on" : ""}" data-share-purpose="${p.id}" aria-pressed="${v.purpose === p.id}">
        <b>${esc(p.label)}</b><small>${esc(p.id === "reply" && v.header.sharedFrom ? `Replies in the topic of ${v.header.sharedFrom.author}'s save.` : p.line)}</small></button>`,
        )
        .join("")}
    </fieldset>
    <button class="wax share-post" type="submit"${v.busy || !v.purpose ? " disabled" : ""}>${v.busy ? "Posting…" : "Post to the community"}</button>
  </form>`;
}

export interface ShareDeps {
  api: CloudApi;
  /** The save's bytes; a save in the cloud only comes down first. */
  read: (path: string) => Promise<Uint8Array | undefined>;
  /** The realm's name for the card ("Castile"). */
  realm: (nation: string) => string;
  redraw: () => void;
}

/** Binds the Share sheet's buttons. */
export function bindShareSheet(root: HTMLElement, v: ShareView, deps: ShareDeps): void {
  const form = root.querySelector<HTMLFormElement>("[data-share-form]");
  const title = form?.querySelector<HTMLInputElement>("input[name=title]");
  const note = form?.querySelector<HTMLTextAreaElement>("textarea[name=note]");
  title?.addEventListener("input", () => (v.title = title.value));
  note?.addEventListener("input", () => (v.note = note.value));
  root.querySelectorAll<HTMLButtonElement>("[data-share-purpose]").forEach((b) =>
    b.addEventListener("click", () => {
      v.purpose = b.dataset.sharePurpose as SharePurpose;
      deps.redraw();
    }),
  );
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    void postShare(v, deps);
  });
  root.querySelector("[data-share-copy]")?.addEventListener("click", () => {
    if (!v.done) return;
    void navigator.clipboard?.writeText(v.done.link).then(
      () => {
        v.copied = true;
        deps.redraw();
      },
      () => {},
    );
  });
  root.querySelector("[data-share-topic]")?.addEventListener("click", () => {
    if (v.done) window.open(v.done.topicUrl, "_blank", "noopener");
  });
  root.querySelector("[data-share-system]")?.addEventListener("click", () => {
    if (v.done) void navigator.share?.({ title: v.title, text: `${v.title}: a Pocket Hegemony campaign to play`, url: v.done.link }).catch(() => {});
  });
}

/** Posts the share (SAVE-125); the sheet then shows the result, or why it failed. */
export async function postShare(v: ShareView, deps: Pick<ShareDeps, "api" | "read" | "realm" | "redraw">): Promise<void> {
  if (!v.purpose || v.busy) return;
  v.busy = true;
  v.error = "";
  deps.redraw();
  try {
    const bytes = await deps.read(v.path);
    if (!bytes) throw new CloudError(422, "damaged", "This save is damaged.");
    const title = v.title.trim() || v.header.name;
    v.done = await deps.api.shareSave({ bytes, title, note: v.note.trim(), realm: deps.realm(v.header.playerNation), purpose: v.purpose });
  } catch (e) {
    v.error = e instanceof CloudError && e.offline ? "Connect to share a save." : errorText(e);
  }
  v.busy = false;
  deps.redraw();
}

/** Why a shared save could not be opened, in the player's words. */
export function openError(e: unknown): string {
  if (e instanceof CloudError && e.offline) return "Connect to open a shared save.";
  if (e instanceof CloudError && e.status === 404) return SM.no_shared_save;
  return e instanceof CloudError ? errorText(e) : "This shared save could not be opened.";
}

/**
 * Opens a shared save (SAVE-128, SAVE-129): its card for the author's name,
 * then its file, made into a new campaign of the player's own. The caller
 * keeps the copy as a Manual save and opens it like any other.
 */
export async function fetchSharedCopy(
  api: CloudApi,
  typed: string,
  ctx: { rng: Rng; now: number; device: string; platform: Platform },
): Promise<{ header: SaveHeader; bytes: Uint8Array; path: string }> {
  const code = shareCode(typed);
  if (!code) throw new CloudError(404, "no_shared_save", SM.no_shared_save);
  const card = await api.sharedCard(code);
  const bytes = await api.sharedFile(code);
  readHeader(bytes);
  return sharedCopy(bytes, ctx, { code, author: card.author });
}
