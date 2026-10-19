import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import catalogue from "../data/domain/scenario-setup-catalogue.json" with { type: "json" };
import cultureDomain from "../data/domain/culture.json" with { type: "json" };
import nations1444 from "../data/scenarios/1444/map-nations.json" with { type: "json" };
import culture1444 from "../data/scenarios/1444/culture-start.json" with { type: "json" };
import provinces1444 from "../data/scenarios/1444/world/provinces.json" with { type: "json" };

// The 1378 scenario (X-25) is built region by region (milestone 10, step 5):
// each region's files live in scenarios/1378/regions/<key>/ with the shapes of
// the 1444 folder. This reads every region present and checks them together,
// so a region added later is covered without editing this file.
const dir = join(import.meta.dirname, "../data/scenarios/1378");
const scenario = JSON.parse(readFileSync(join(dir, "scenario.json"), "utf8"));
const regionsDir = join(dir, "regions");
const present: string[] = existsSync(regionsDir) ? readdirSync(regionsDir).filter((k) => statSync(join(regionsDir, k)).isDirectory()) : [];

type Lonlat = [number, number];
/** An owner-rule selector: the land a rule would pick, for places that must survive a new map. */
type Selector = { countries: string[]; admin1?: string[]; regions?: string[]; bbox?: number[] };
type Region = {
  key: string;
  nations: { id: string; name: string; capital: Lonlat; color?: string }[];
  owners: { nation: string | null; countries: string[]; admin1?: string[]; regions?: string[]; bbox?: number[] }[];
  rulers: Record<string, unknown>;
  relations: { relations: { id: string; source: string; target: string }[]; facts?: { id: string; source: string; target: string }[]; entities?: { id: string; name: string }[] };
  subjects: { subjects: [string, string, string, string, number | null][]; stances?: [string, string, string][] };
  culture: { tongues?: Record<string, { name: string; family: string; way_of_life: string }>; realms: Record<string, { court: string; mix: [string, number][]; local: Record<string, unknown>; faith?: string }> };
  sleeping: { realms: { id: string; name: string; capital: string | Lonlat; home: (string | Lonlat | Selector)[] }[] };
};

const read = (key: string, file: string, empty: unknown) => {
  const path = join(regionsDir, key, file);
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : empty;
};
const regions: Region[] = present.map((key) => ({
  key,
  nations: read(key, "map-nations.json", []),
  owners: read(key, "map-owners.json", []),
  rulers: read(key, "rulers.json", { rulers: {} }).rulers,
  relations: read(key, "relations.json", { relations: [] }),
  subjects: read(key, "subjects.json", { subjects: [] }),
  culture: read(key, "culture-start.json", { realms: {} }),
  sleeping: read(key, "sleeping-realms.json", { realms: [] }),
}));

const nationIds = new Set(regions.flatMap((r) => r.nations.map((n) => n.id)));
const sleepingIds = new Set(regions.flatMap((r) => r.sleeping.realms.map((s) => s.id)));
const entityIds = new Set(regions.flatMap((r) => (r.relations.entities ?? []).map((e) => e.id)));
// While regions are still being built, an owner rule may name a realm another
// region will add (a 1444 map nation or a catalogue record); once all regions
// are in, every owner must be a 1378 map nation.
const complete = scenario.regions.every((k: string) => present.includes(k));
const ownerKnown = (id: string) => nationIds.has(id) || (!complete && (nations1444.some((n) => n.id === id) || id in catalogue.records));
const known = (id: string) => nationIds.has(id) || sleepingIds.has(id) || entityIds.has(id) || id in catalogue.records;
const tongues = new Set([...[...cultureDomain.tongues, ...(cultureDomain.tongues_added ?? [])].map((t) => t.id), ...Object.keys(culture1444.tongues), ...regions.flatMap((r) => Object.keys(r.culture.tongues ?? {}))]);
const provinceIds = new Set((provinces1444 as { id: string }[]).map((p) => p.id));
const isLonlat = (c: unknown) => Array.isArray(c) && c.length === 2 && Math.abs(c[0]) <= 180 && Math.abs(c[1]) <= 90;
const place = (c: string | Lonlat | Selector) =>
  typeof c === "string" ? provinceIds.has(c) : Array.isArray(c) ? isLonlat(c) : Array.isArray(c?.countries) && c.countries.length > 0;

describe("the 1378 scenario (X-25)", () => {
  it("starts on 20 September 1378 in Era I", () => {
    expect(scenario.date).toEqual({ year: 1378, month: 9, day: 20 });
    expect(scenario.eras.start).toBe("I");
  });

  it("holds only the regions it names", () => {
    for (const key of present) expect(scenario.regions).toContain(key);
  });

  it("gives every id to one realm across all regions", () => {
    const seen = new Map<string, string>();
    for (const r of regions)
      for (const id of [...r.nations.map((n) => n.id), ...r.sleeping.realms.map((s) => s.id)]) {
        expect(seen.get(id), `${id} in ${r.key} and ${seen.get(id)}`).toBeUndefined();
        seen.set(id, r.key);
      }
    for (const id of sleepingIds) expect(nationIds.has(id), `${id} is both on the map and asleep`).toBe(false);
  });

  for (const r of regions)
    describe(`region ${r.key}`, () => {
      it("places its map nations and hands them land", () => {
        for (const n of r.nations) {
          expect(n.name, n.id).toBeTruthy();
          expect(isLonlat(n.capital), `${n.id} capital`).toBe(true);
        }
        for (const o of r.owners) {
          if (o.nation !== null) expect(ownerKnown(o.nation), `owner rule for unknown nation ${o.nation}`).toBe(true);
          expect(o.countries.length, `${o.nation} rule names no country`).toBeGreaterThan(0);
          if (o.bbox) expect(o.bbox[0]! < o.bbox[2]! && o.bbox[1]! < o.bbox[3]!, `${o.nation} bbox`).toBe(true);
        }
        const landed = new Set(regions.flatMap((x) => x.owners.map((o) => o.nation)));
        for (const n of r.nations) expect(landed.has(n.id), `${n.id} has no owner rule`).toBe(true);
      });

      it("names a ruler, tongues and a faith for its own realms only", () => {
        for (const id of Object.keys(r.rulers)) expect(nationIds.has(id), `ruler for unknown realm ${id}`).toBe(true);
        for (const [id, c] of Object.entries(r.culture.realms)) {
          expect(nationIds.has(id) || sleepingIds.has(id), `culture for unknown realm ${id}`).toBe(true);
          expect(tongues.has(c.court), `${id} court tongue ${c.court}`).toBe(true);
          for (const [t, share] of c.mix) {
            expect(tongues.has(t), `${id} tongue ${t}`).toBe(true);
            expect(share).toBeGreaterThan(0);
          }
        }
        for (const n of r.nations) expect(n.id in r.rulers, `${n.id} has no ruler entry`).toBe(true);
      });

      it("ties relations and subjects to known realms", () => {
        for (const rel of [...r.relations.relations, ...(r.relations.facts ?? [])]) {
          expect(known(rel.source), `${rel.id}: unknown ${rel.source}`).toBe(true);
          expect(known(rel.target), `${rel.id}: unknown ${rel.target}`).toBe(true);
        }
        for (const [subject, overlord] of r.subjects.subjects) {
          expect(known(subject), `unknown subject ${subject}`).toBe(true);
          expect(known(overlord), `unknown overlord ${overlord}`).toBe(true);
        }
        for (const [a, b] of r.subjects.stances ?? []) expect(known(a) && known(b), `stance ${a}–${b}`).toBe(true);
      });

      it("gives each sleeping realm a capital and home", () => {
        for (const s of r.sleeping.realms) {
          expect(place(s.capital), `${s.id} capital`).toBe(true);
          for (const h of s.home) expect(place(h), `${s.id} home ${h}`).toBe(true);
        }
      });
    });
});
