import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { loadDefaultRuleset } from "@ph/rules";
import { createWorld } from "../src/index.ts";
import { effectInPlay } from "../src/heritage.ts";
import * as ns from "../src/domain/national-strengths/index.ts";

/**
 * The ambitions written beside the heritage build (X-27, HER-014, HER-090):
 * ids unique, only conditions the game reads, every place, area, event,
 * invention and earlier ambition they name known, and every legacy within
 * its budget with a lever the game applies.
 */

const D = new URL("../../rules/data/domain/", import.meta.url);
const read = (f: string) => JSON.parse(readFileSync(new URL(f, D), "utf8"));
const FILES = ["common-west", "east-africa", "asia-americas"].map((f) => read(`ambitions/${f}.json`));
const existing = read("national-strengths-realms.json").realms as Record<string, { heritage?: { ambitions: { id: string; legacy: { id: string } }[] } }>;
const evPlaces = read("events-places.json").places as Record<string, unknown>;
const gaz = read("national-strengths-places.json");
const events = read("events-campaign.json").events as Record<string, unknown>;
const inventions = new Set((read("research.json").inventions as { id: string }[]).map((i) => i.id));
const mapSetup = read("scenario-setup-map.json");

type Amb = { id: string; name: string; theme: string; text: string; historical: boolean; window?: [number, number]; requires?: unknown; goal: unknown; fail?: unknown; legacy: { id: string; name: string; great?: boolean; text: string; effects: ns.Effect[] } };
const all: { realm: string | null; a: Amb }[] = FILES.flatMap((file) => [
  ...((file.common ?? []) as Amb[]).map((a) => ({ realm: null, a })),
  ...Object.entries(file.realms as Record<string, Amb[]>).flatMap(([realm, list]) => list.map((a) => ({ realm, a }))),
]);

const TYPES = new Set(["all", "any", "not", "count", "owns", "holds_place", "relation", "exists", "independent", "at_war", "borders", "knows", "stat", "date", "event", "heritage", "coastal"]);
const THINGS = new Set(["provinces", "royal_provinces", "officials", "castles", "soldiers", "gold", "debt", "lords", "loyal_lords", "allies", "subjects", "schools", "scholars", "victories", ...["market", "granary", "mine", "ranch", "harbour", "farm", "fishery", "road", "castle", "quarry"].map((b) => `building:${b}`)]);
const PLACES = new Set([...Object.keys(gaz.places), ...mapSetup.nations.map((n: { name: string }) => n.name), ...(mapSetup.ports as string[][]).map((p) => p[0])]);
const TARGETS = new Set([...Object.keys(evPlaces), ...Object.keys(gaz.areas), ...Object.keys(gaz.provinces)]);

function leaves(c: unknown, out: [string, any][] = []): [string, any][] {
  if (!c || typeof c !== "object") return out;
  const [k, v] = Object.entries(c as object)[0]!;
  out.push([k, v]);
  if (k === "all" || k === "any") (v as unknown[]).forEach((x) => leaves(x, out));
  if (k === "not") leaves(v, out);
  return out;
}

const rules = loadDefaultRuleset();
const w = createWorld(rules, 1);
const g = w.heritage!;
const provinces = w.rules.provinces.map((p) => ({ id: p.id, ...(p.x !== undefined && p.y !== undefined ? { x: p.x, y: p.y } : {}), terrain: p.terrain }));
const boundCache = new Map<string, boolean>();
const bound = (name: string) => {
  if (!boundCache.has(name)) boundCache.set(name, ns.bindPlace(name, provinces) !== null);
  return boundCache.get(name);
};
const catalogueIds = new Set<string>(read("events-places.json").aliases ? Object.values(read("events-places.json").aliases) : []);
for (const id of g.ids) catalogueIds.add(id);
// Realms the 1444 map does not hold: of the 1378 start, or founded by an event the ambition requires.
const OTHER_START = ["avignon_papacy", "visconti_pavia", "riga", "foix", "ottoman", "kazakh_khanate"];

describe("the ambitions written beside the heritage build (X-27)", () => {
  it("has unique ids, also against the existing ambitions", () => {
    const seen = new Set<string>();
    for (const r of Object.values(existing)) for (const a of r.heritage?.ambitions ?? []) (seen.add(a.id), seen.add(a.legacy.id));
    const dup: string[] = [];
    for (const { a } of all) for (const id of [a.id, a.legacy.id]) (seen.has(id) ? dup.push(id) : seen.add(id));
    expect(dup).toEqual([]);
  });

  it("names ids by realm and has every field", () => {
    const bad: string[] = [];
    for (const { realm, a } of all) {
      const pre = realm ? `${realm}_` : "common_";
      if (!a.id.startsWith(pre) || !a.legacy.id.startsWith(pre)) bad.push(`${a.id} prefix`);
      if (realm && !existing[realm]) bad.push(`${realm} not a map realm`);
      if (!["land", "sea", "trade", "faith", "crown", "learning", "survival", "wealth"].includes(a.theme)) bad.push(`${a.id} theme`);
      if (!a.name || !a.text || !a.legacy.name || !a.legacy.text || typeof a.historical !== "boolean") bad.push(`${a.id} fields`);
      if (realm === null && (a.historical || !a.requires)) bad.push(`${a.id} common must be unhistorical with requires`);
    }
    expect(bad).toEqual([]);
  });

  it("uses only conditions the game reads, with references that exist", () => {
    const bad: string[] = [];
    const ids = new Set(all.map(({ a }) => a.id));
    for (const { realm, a } of all)
      for (const c of [a.requires, a.goal, a.fail])
        for (const [k, v] of leaves(c)) {
          if (!TYPES.has(k)) bad.push(`${a.id}: type ${k}`);
          if (k === "count") {
            if (!THINGS.has(v.thing)) bad.push(`${a.id}: thing ${v.thing}`);
            if (v.who !== "this") bad.push(`${a.id}: count who`);
            if (typeof v.value === "string" && !/^start[*+]\d+(\.\d+)?$/.test(v.value)) bad.push(`${a.id}: value ${v.value}`);
          }
          if (k === "owns" && !TARGETS.has(v.where)) bad.push(`${a.id}: owns ${v.where}`);
          if (k === "owns" && v.min_share !== undefined && !(v.min_share > 0 && v.min_share <= 1)) bad.push(`${a.id}: share`);
          if (k === "holds_place" && !PLACES.has(v.place)) bad.push(`${a.id}: place ${v.place}`);
          if (k === "holds_place" && !bound(v.place)) bad.push(`${a.id}: place ${v.place} unbound`);
          if (k === "event" && !(v.id in events)) bad.push(`${a.id}: event ${v.id}`);
          if (k === "knows" && !inventions.has(v.invention)) bad.push(`${a.id}: invention ${v.invention}`);
          if (k === "heritage") {
            const known = ids.has(v.id) || (realm && existing[realm]?.heritage?.ambitions.some((x) => x.id === v.id));
            if (!known) bad.push(`${a.id}: heritage ${v.id}`);
            if (realm === null && !v.id.startsWith("common_")) bad.push(`${a.id}: common chains to ${v.id}`);
          }
          if (k === "stat" && v.stat !== "stability") bad.push(`${a.id}: stat ${v.stat}`);
          for (const who of [v?.who, v?.other])
            if (["relation", "exists", "at_war", "borders", "heritage"].includes(k) && who && who !== "this" && !catalogueIds.has(who) && !OTHER_START.includes(who)) bad.push(`${a.id}: realm ${who}`);
        }
    expect(bad).toEqual([]);
  });

  it("keeps every legacy within its budget, with a lever in play", () => {
    const bad: string[] = [];
    for (const { a } of all) {
      const pts = ns.effectsPoints(a.legacy.effects);
      const budget = ns.partBudget(a.legacy.great ? "great_legacy" : "legacy");
      if (ns.outsideBudget(pts, budget)) bad.push(`${a.id}: ${pts.toFixed(2)} vs ${budget}`);
      if (!a.legacy.effects.some((e) => effectInPlay(e as never))) bad.push(`${a.id}: no lever in play`);
      for (const e of a.legacy.effects) if (!(e.lever in (read("national-strengths.json").levers as object))) bad.push(`${a.id}: lever ${e.lever}`);
    }
    expect(bad).toEqual([]);
  });

  it("joins each realm's pool, the common ones every realm's", () => {
    const portugal = g.realms[w.nationIndex.get("portugal")!]!;
    const all = [...portugal.pool, ...portugal.waitingForAge, ...portugal.ambitions.map((a) => a.item)].map((a) => a.id);
    expect(all).toContain("portugal_beyond_the_cape");
    for (const { realm, a } of FILES.flatMap((f) => [...(f.common ?? []).map((a: Amb) => ({ realm: null, a })), ...((f.realms.portugal ?? []) as Amb[]).map((a) => ({ realm: "portugal", a }))])) {
      void realm;
      expect(all).toContain(a.id);
    }
  });
});
