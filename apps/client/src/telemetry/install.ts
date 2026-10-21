import { cloudBase, webKeyValue } from "../cloud/api.ts";
import { detectRuntime } from "../platform.ts";
import { onPrefs, pref, prefs } from "../settings/prefs.ts";
import { GAME_VERSION } from "../version.ts";
import { postJson, Telemetry } from "./telemetry.ts";

/**
 * The game's one Telemetry, set up before anything else runs so a crash at
 * launch is caught too. main.ts tells it who is signed in and what is open.
 */
const hooks: { account: () => string | undefined; where: () => string | undefined } = { account: () => undefined, where: () => undefined };

export const telemetry = new Telemetry({
  base: cloudBase(),
  runtime: detectRuntime(),
  version: GAME_VERSION,
  kv: webKeyValue(),
  stats: () => pref("privacy.usage_stats") === true,
  crashes: () => pref("privacy.crash_reports") === true,
  accountId: () => hooks.account(),
  where: () => {
    try {
      return hooks.where();
    } catch {
      return undefined;
    }
  },
  post: postJson,
  now: () => new Date(),
});

let started = false;
/** One session_started per launch, sent once the player has agreed (at launch, or on the consent card). */
function sessionStarted(): void {
  if (started || pref("privacy.usage_stats") !== true) return;
  started = true;
  telemetry.track("session_started", { profile: prefs.profile, touch: matchMedia("(pointer: coarse)").matches, version: GAME_VERSION });
}

export function setTelemetryHooks(h: Partial<typeof hooks>): void {
  Object.assign(hooks, h);
}

if (telemetry.available) {
  addEventListener("error", (e) => {
    // A script from another origin says only "Script error." with nothing to act on.
    if (!e.error && /^Script error\.?$/.test(e.message)) return;
    telemetry.crash("error", e.error instanceof Error ? e.error.message : e.message, e.error instanceof Error ? e.error.stack : `at ${e.filename}:${e.lineno}:${e.colno}`);
  });
  addEventListener("unhandledrejection", (e) => {
    const r = e.reason as unknown;
    telemetry.crash("rejection", r instanceof Error ? r.message : String(r), r instanceof Error ? r.stack : undefined);
  });
  onPrefs((ids) => {
    if (ids.some((id) => id.startsWith("privacy."))) {
      telemetry.consentChanged();
      sessionStarted();
      void telemetry.flush();
    }
  });
  sessionStarted();
  // Statistics go every few minutes and when the game goes to the background, which on a phone may be the last chance.
  setInterval(() => void telemetry.flush(), 5 * 60_000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void telemetry.flush(true);
  });
  void telemetry.flush();
}
