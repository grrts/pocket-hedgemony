import defaults from "../config.json" with { type: "json" };

/**
 * Everything the balance runs can be tuned by, in one file (config.json):
 * how long and how often they sample, the lines the checks draw, and how the
 * break-the-game bot plays. Nothing here changes the game's own rules.
 */
export type SimConfig = typeof defaults;

/** The defaults with any keys of `over` laid on top, a section at a time. */
export function simConfig(over: DeepPartial<SimConfig> = {}): SimConfig {
  const out = structuredClone(defaults) as SimConfig;
  for (const key of Object.keys(over) as (keyof SimConfig)[]) Object.assign(out[key], over[key]);
  return out;
}

export type DeepPartial<T> = { [K in keyof T]?: T[K] extends readonly unknown[] ? T[K] : T[K] extends object ? DeepPartial<T[K]> : T[K] };
