import { describe, expect, it } from "vitest";
import { loadMapTiles } from "../src/node/mapTiles.ts";
import { loadDefaultRuleset } from "@ph/rules";
import { createWorld, STABILITY, stabilityOf } from "../src/index.ts";
import * as dip from "../src/domain/diplomacy/index.ts";

const rules = loadDefaultRuleset();
const tiles = loadMapTiles(rules);

describe("stability: the weakest of lords, subjects, officials and provinces", () => {
  it("reads every pillar, and the realm stands as its weakest", () => {
    const w = createWorld(rules, 1, tiles);
    const me = w.nationIndex.get("france")!;
    const s = stabilityOf(w, me);
    expect(s.pillars.map((p) => p.key)).toEqual(["lords", "subjects", "officials", "provinces", "treasury"]);
    expect(s.step).toBe(Math.max(...s.pillars.map((p) => p.step)));
    const lords = s.pillars[0]!.counts;
    expect(lords.Loyal! + lords.Wavering! + lords.Disloyal! + lords["In revolt"]!).toBe(new Set(w.lords.flatMap((l, k) => (l.nation === me && w.provinceLord.includes(k) ? [k] : []))).size);
  });

  it("falls to Troubled with a disloyal lord and Crumbling with one in revolt", () => {
    const w = createWorld(rules, 1, tiles);
    const me = w.nationIndex.get("france")!;
    const k = w.lords.findIndex((l, i) => l.nation === me && w.provinceLord.includes(i));
    w.lords[k]!.loyalty = "Disloyal";
    expect(stabilityOf(w, me).pillars[0]!.step).toBe(2);
    w.lords[k]!.loyalty = "In revolt";
    expect(STABILITY[stabilityOf(w, me).step]).toBe("Crumbling");
  });

  it("counts royal provinces whose official's post stands empty", () => {
    const w = createWorld(rules, 1, tiles);
    const me = w.nationIndex.get("france")!;
    const royal: number[] = [];
    for (let p = 0; p < w.provinceCount; p++) if (w.provinceOwner[p] === me && w.provinceLord[p]! < 0) royal.push(p);
    for (const p of royal) w.provinceOfficial[p] = 0;
    expect(stabilityOf(w, me).pillars[2]).toMatchObject({ step: 0, counts: { posts: royal.length, empty: 0 } });
    w.provinceOfficial[royal[0]!] = -1;
    expect(stabilityOf(w, me).pillars[2]!.counts.empty).toBe(1);
    for (const p of royal) w.provinceOfficial[p] = -1;
    expect(stabilityOf(w, me).pillars[2]!.step).toBe(3);
  });

  it("reads subjects' loyalty from their autonomy and stance", () => {
    const w = createWorld(rules, 1, tiles);
    const g = w.diplomacy.graph;
    const overlords = new Set(g.relations.filter((r) => r.type === "subject").map((r) => r.target));
    const ov = w.nationIds.findIndex((id) => overlords.has(id));
    expect(ov).toBeGreaterThanOrEqual(0);
    const subjects = stabilityOf(w, ov).pillars[1]!.counts;
    const total = Object.values(subjects).reduce((t, c) => t + c, 0);
    expect(total).toBe(dip.relations.subjectsOf(g, w.nationIds[ov]!).filter((id) => w.nationIds.includes(id)).length);
  });
});
