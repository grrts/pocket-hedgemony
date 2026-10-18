import defaults from "../config.json" with { type: "json" };

/**
 * Everything the balance runs can be tuned by, in one file (config.json):
 * how long and how often they sample, the lines the checks draw, how the
 * break-the-game bot plays, and the balance model's probes, checks and
 * sweeps. Nothing here changes the game's own rules.
 */
export type SimConfig = typeof defaults;
export type BalanceConfig = SimConfig["balance"];

/** The defaults with any keys of `over` laid on top, deeply (arrays are replaced whole). */
export function simConfig(over: DeepPartial<SimConfig> = {}): SimConfig {
  return merge(structuredClone(defaults), over) as SimConfig;
}

function merge(into: Record<string, unknown>, over: object): Record<string, unknown> {
  for (const [k, v] of Object.entries(over)) {
    const cur = into[k];
    if (v && typeof v === "object" && !Array.isArray(v) && cur && typeof cur === "object" && !Array.isArray(cur)) merge(cur as Record<string, unknown>, v);
    else into[k] = v;
  }
  return into;
}

export type DeepPartial<T> = { [K in keyof T]?: T[K] extends readonly unknown[] ? T[K] : T[K] extends object ? DeepPartial<T[K]> : T[K] };
