import type { Ruleset } from "@ph/rules";
import { hashWorld } from "../../hash.ts";
import { Rng } from "../../rng.ts";
import type { Order } from "../../turn.ts";
import { createArmyPool, createWorld, type World } from "../../world.ts";
import { base64, encodePng, fnv1a } from "./bytes.ts";
import { packChunk, savesConfig, unpackChunk, type CampaignOptions, type RawChunk } from "./format.ts";

/**
 * The world at a turn boundary as chunks, and back (save-system §4.3): one
 * chunk per system with its own version; only changing state, never what
 * comes from the build (adjacency, terrain, water, rivers, shapes); typed
 * arrays indexed through the `ids` chunk so a later build can map them.
 */

const V = savesConfig.format.chunk_versions;

/** What the save holds besides the world itself. */
export interface SavedGame {
  playerNation: string;
  options: CampaignOptions;
  /** Orders queued so far (only a Resume save carries them, SAVE-044). */
  orders?: readonly Order[];
  /** Events fired, flags, pending choices and cooldowns; owned by the events context. */
  events?: EventsState;
  /** The realm timeline for the ledger and end screens. */
  history?: unknown[];
}

export interface EventsState {
  fired: string[];
  flags: string[];
  pending: string[];
  cooldowns: Record<string, number>;
}

const EMPTY_EVENTS: EventsState = { fired: [], flags: [], pending: [], cooldowns: {} };

/** Chunks for the world plus what goes with it. `orders` is added only when given. */
export function worldChunks(world: World, game: SavedGame): RawChunk[] {
  const a = world.armies;
  const live: number[] = [];
  for (let i = 0; i < a.count; i++) if (a.alive[i]) live.push(i);
  const routes: number[] = [];
  const routeLen: number[] = [];
  const marched: number[] = [];
  const marchedLen: number[] = [];
  for (const s of live) {
    routes.push(...a.route[s]!);
    routeLen.push(a.route[s]!.length);
    marched.push(...a.marched[s]!);
    marchedLen.push(a.marched[s]!.length);
  }
  const pick = <T extends Int16Array | Int32Array | Float32Array | Float64Array>(src: T, make: (n: number) => T): T => {
    const out = make(live.length);
    live.forEach((slot, k) => (out[k] = src[slot]!));
    return out;
  };
  const chunks = [
    packChunk("core", V.core, {
      meta: { turn: world.turn, date: world.date, options: game.options, playerNation: game.playerNation },
      arrays: { rng: new Uint32Array(world.rng.state) },
    }),
    packChunk("ids", V.ids, { meta: { provinces: world.provinceIds, nations: world.nationIds, commanders: world.commanderIds }, arrays: {} }),
    packChunk("provinces", V.provinces, {
      meta: {},
      arrays: { owner: world.provinceOwner, population: world.provincePopulation, wealth: world.provinceWealth },
    }),
    packChunk("nations", V.nations, {
      meta: {},
      arrays: {
        treasury: world.nationTreasury,
        levies: world.nationLevies,
        maxLevies: world.nationMaxLevies,
        monthlyIncome: world.nationMonthlyIncome,
        commanderOwner: world.commanderOwner,
      },
    }),
    packChunk("armies", V.armies, {
      meta: { count: a.count },
      arrays: {
        slot: Int32Array.from(live),
        owner: pick(a.owner, (n) => new Int16Array(n)),
        location: pick(a.location, (n) => new Int32Array(n)),
        men: pick(a.men, (n) => new Int32Array(n)),
        commander: pick(a.commander, (n) => new Int32Array(n)),
        horse: pick(a.horse, (n) => new Int32Array(n)),
        food: pick(a.food, (n) => new Float64Array(n)),
        progress: pick(a.progress, (n) => new Float32Array(n)),
        routeLen: Int32Array.from(routeLen),
        route: Int32Array.from(routes),
        marchedLen: Int32Array.from(marchedLen),
        marched: Int32Array.from(marched),
      },
    }),
    packChunk("events", V.events, { meta: { ...(game.events ?? EMPTY_EVENTS) }, arrays: {} }),
    packChunk("history", V.history, { meta: { timeline: game.history ?? [] }, arrays: {} }),
  ];
  if (game.orders) {
    // Province targets go by id, so a later build can still place them (INV-SAVE-9).
    const orders = game.orders.map((o) => (o.type === "move" ? { ...o, to: world.provinceIds[o.to] ?? null } : o));
    chunks.push(packChunk("orders", V.orders, { meta: { orders }, arrays: {} }));
  }
  return chunks;
}

/** How a build that differs from the save's maps it (SAVE-047, SAVE-048). */
export interface MappingTables {
  /** Old province id → new ids with shares of the people (written by tools/mapgen). */
  renames?: Record<string, { id: string; share: number }[]>;
  /** Dropped nation id → the nation that takes its place. */
  nations?: Record<string, string>;
}

export interface RestoredGame {
  world: World;
  game: SavedGame & { orders: Order[] };
  /** Problems that are not errors (a dropped nation with no table entry …). */
  warnings: string[];
  /** Build provinces the save did not know, given the rules' starting values. */
  defaulted: string[];
}

/**
 * Rebuilds the world from its chunks on top of `rules`. Provinces, nations and
 * commanders are matched by id through the `ids` chunk; fields missing from an
 * older chunk keep the value the rules give.
 */
export function restoreWorld(chunks: Map<string, RawChunk>, rules: Ruleset, tables: MappingTables = {}): RestoredGame {
  const need = (id: string) => {
    const c = chunks.get(id);
    if (!c) throw new Error(`save has no ${id} chunk`);
    return unpackChunk(c);
  };
  const core = need("core");
  const ids = need("ids").meta as { provinces: string[]; nations: string[]; commanders: string[] };
  const prov = need("provinces").arrays;
  const nat = need("nations").arrays;
  const arm = need("armies");
  const warnings: string[] = [];

  const world = createWorld(rules, 0);
  const meta = core.meta as { turn: number; date: { year: number; month: number; day?: number }; options: CampaignOptions; playerNation: string };
  world.turn = meta.turn;
  // The whole date, with its day when the engine keeps one (X-18 weekly turns).
  world.date = { ...meta.date } as typeof world.date;
  world.rng = new Rng(core.arrays.rng as Uint32Array);

  // Nations: by id, then the nation table, else gone with a warning.
  const nationMap = ids.nations.map((id) => {
    const direct = world.nationIndex.get(id);
    if (direct !== undefined) return direct;
    const to = tables.nations?.[id];
    if (to !== undefined && world.nationIndex.has(to)) return world.nationIndex.get(to)!;
    warnings.push(`nation ${id} is not in this build; its provinces become unowned`);
    return -1;
  });

  // Provinces: by id, then the rename table with shares.
  const provinceTargets = ids.provinces.map((id): { index: number; share: number }[] => {
    const direct = world.provinceIndex.get(id);
    if (direct !== undefined) return [{ index: direct, share: 1 }];
    const parts = tables.renames?.[id] ?? [];
    return parts.filter((p) => world.provinceIndex.has(p.id)).map((p) => ({ index: world.provinceIndex.get(p.id)!, share: p.share }));
  });
  const covered = new Uint8Array(world.provinceCount);
  const bestShare = new Float64Array(world.provinceCount);
  const population = new Float64Array(world.provinceCount);
  provinceTargets.forEach((targets, old) => {
    for (const t of targets) {
      if (!covered[t.index]) population[t.index] = 0;
      covered[t.index] = 1;
      if (prov.population) population[t.index] = population[t.index]! + prov.population[old]! * t.share;
      if (t.share >= bestShare[t.index]!) {
        bestShare[t.index] = t.share;
        if (prov.owner) {
          const o = prov.owner[old]!;
          world.provinceOwner[t.index] = o < 0 ? -1 : nationMap[o]!;
        }
        if (prov.wealth) world.provinceWealth[t.index] = prov.wealth[old]!;
      }
    }
  });
  const defaulted: string[] = [];
  for (let p = 0; p < world.provinceCount; p++) {
    if (covered[p] && prov.population) world.provincePopulation[p] = population[p]!;
    if (!covered[p]) defaulted.push(world.provinceIds[p]!);
  }

  // Nation fields by id; fields an older chunk lacks keep the rules' values.
  ids.nations.forEach((id, old) => {
    const n = world.nationIndex.get(id);
    if (n === undefined) return;
    if (nat.treasury) world.nationTreasury[n] = nat.treasury[old]!;
    if (nat.levies) world.nationLevies[n] = nat.levies[old]!;
    if (nat.maxLevies) world.nationMaxLevies[n] = nat.maxLevies[old]!;
    if (nat.monthlyIncome) world.nationMonthlyIncome[n] = nat.monthlyIncome[old]!;
  });
  const commanderMap = ids.commanders.map((id) => world.commanderIds.indexOf(id));
  if (nat.commanderOwner) {
    ids.commanders.forEach((_, old) => {
      const c = commanderMap[old]!;
      if (c >= 0) {
        const o = nat.commanderOwner![old]!;
        world.commanderOwner[c] = o < 0 ? -1 : nationMap[o]!;
      }
    });
  }

  // Armies: the live ones back in their own slots, so queued orders still name them.
  const A = arm.arrays;
  const count = (arm.meta as { count: number }).count;
  const pool = createArmyPool(Math.max(16, count));
  pool.count = count;
  const mapProvince = (old: number) => provinceTargets[old]?.[0]?.index ?? -1;
  let ro = 0;
  let mo = 0;
  const slots = A.slot!;
  for (let k = 0; k < slots.length; k++) {
    const slot = slots[k]!;
    const routeLen = A.routeLen![k]!;
    const marchedLen = A.marchedLen![k]!;
    const route = Array.from(A.route!.subarray(ro, ro + routeLen), mapProvince).filter((p) => p >= 0);
    const marched = Array.from(A.marched!.subarray(mo, mo + marchedLen), mapProvince).filter((p) => p >= 0);
    ro += routeLen;
    mo += marchedLen;
    const owner = nationMap[A.owner![k]!]!;
    const location = mapProvince(A.location![k]!);
    if (owner < 0 || location < 0) {
      warnings.push(`army in slot ${slot} has no owner or place in this build and is dropped`);
      continue;
    }
    pool.alive[slot] = 1;
    pool.owner[slot] = owner;
    pool.location[slot] = location;
    pool.men[slot] = A.men![k]!;
    const cmd = A.commander![k]!;
    pool.commander[slot] = cmd < 0 ? -1 : commanderMap[cmd]!;
    pool.horse[slot] = A.horse![k]!;
    pool.food[slot] = A.food![k]!;
    pool.progress[slot] = A.progress![k]!;
    pool.route[slot] = route;
    pool.marched[slot] = marched;
  }
  world.armies = pool;

  const events = chunks.has("events") ? (unpackChunk(chunks.get("events")!).meta as unknown as EventsState) : { ...EMPTY_EVENTS };
  const history = chunks.has("history") ? ((unpackChunk(chunks.get("history")!).meta.timeline as unknown[]) ?? []) : [];
  const orders: Order[] = [];
  if (chunks.has("orders")) {
    const saved = unpackChunk(chunks.get("orders")!).meta.orders as { type: "move"; army: number; to: string | null }[];
    for (const o of saved) {
      const to = o.to === null ? undefined : world.provinceIndex.get(o.to);
      if (to !== undefined) orders.push({ type: o.type, army: o.army, to });
    }
  }
  return {
    world,
    game: { playerNation: meta.playerNation, options: meta.options, orders, events, history },
    warnings,
    defaulted,
  };
}

// ---------------------------------------------------------------- hashes of the build

const hashes = new WeakMap<Ruleset, { rules: string; map: string }>();

function buildHashes(rules: Ruleset): { rules: string; map: string } {
  let h = hashes.get(rules);
  if (!h) {
    h = {
      rules: fnv1a(JSON.stringify({ defines: rules.defines, units: rules.units, nations: rules.nations })),
      map: fnv1a(JSON.stringify(rules.provinces.map((p) => [p.id, p.terrain, p.neighbors, p.river ?? false]))),
    };
    hashes.set(rules, h);
  }
  return h;
}

/** `rulesHash` of a build: defines, units and nations. */
export function rulesHash(rules: Ruleset): string {
  return buildHashes(rules).rules;
}

/** `mapHash` of a build: province ids, ground and borders. */
export function mapHash(rules: Ruleset): string {
  return buildHashes(rules).map;
}

/** `hashWorld()` of the state exactly as a save holds it (SAVE-039). */
export function savedWorldHash(chunks: readonly RawChunk[], rules: Ruleset): string {
  return hashWorld(restoreWorld(new Map(chunks.map((c) => [c.id, c])), rules).world);
}

// ---------------------------------------------------------------- the thumbnail

/** A 96 × 64 crop of the map around the player's realm, as a base64 PNG (the Load list's map crop). */
export function thumbnail(world: World, playerNation: string): string {
  const { width, height } = savesConfig.format.thumbnail;
  const rgb = new Uint8Array(width * height * 3).fill(40);
  const provs = world.rules.provinces;
  const me = world.nationIndex.get(playerNation) ?? -1;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  provs.forEach((p, i) => {
    if (world.provinceOwner[i] !== me || p.x === undefined || p.y === undefined) return;
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  });
  if (minX === Infinity) return base64(encodePng(width, height, rgb));
  const span = Math.max((maxX - minX) / width, (maxY - minY) / height, 1) * 1.5;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const colours = world.rules.nations.map((n) => {
    const v = parseInt(n.color.slice(1), 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255] as const;
  });
  provs.forEach((p, i) => {
    if (p.x === undefined || p.y === undefined) return;
    const x = Math.floor((p.x - cx) / span + width / 2);
    const y = Math.floor((p.y - cy) / span + height / 2);
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const o = world.provinceOwner[i]!;
    const c = world.provinceWater[i] ? ([30, 60, 110] as const) : o >= 0 ? colours[o]! : ([150, 140, 110] as const);
    rgb.set(c, (y * width + x) * 3);
  });
  return base64(encodePng(width, height, rgb));
}
