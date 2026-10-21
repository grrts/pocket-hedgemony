import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import catalogue from "../data/domain/scenario-setup-catalogue.json" with { type: "json" };
import chronicle from "../data/domain/chronicle.json" with { type: "json" };
import nations1444 from "../data/scenarios/1444/map-nations.json" with { type: "json" };
import type { GoalAim, GoalDef } from "../src/types.ts";

// Every region's historical goals (EVT-100): realms and targets known, aims the
// game can read, windows in years and turning points the Chronicle knows.
const dir = join(import.meta.dirname, "../data/scenarios/1378/regions");
const regions = readdirSync(dir).filter((k) => existsSync(join(dir, k, "map-nations.json")));
const read = (k: string, f: string, empty: unknown) => (existsSync(join(dir, k, f)) ? JSON.parse(readFileSync(join(dir, k, f), "utf8")) : empty);
const known = new Set<string>([
  ...regions.flatMap((k) => (read(k, "map-nations.json", []) as { id: string }[]).map((n) => n.id)),
  ...regions.flatMap((k) => (read(k, "sleeping-realms.json", { realms: [] }).realms as { id: string }[]).map((n) => n.id)),
  ...regions.flatMap((k) => ((read(k, "relations.json", {}).entities ?? []) as { id: string }[]).map((n) => n.id)),
  ...Object.keys(catalogue.records),
  ...nations1444.map((n) => n.id),
]);
const keys = new Set(chronicle.turning_points.map((t) => t.key));
const goals = regions.flatMap((k) => (read(k, "goals.json", { goals: [] }).goals as GoalDef[]).map((g) => ({ region: k, ...g })));

function aimProblems(a: GoalAim | null | undefined): string[] {
  if (!a) return [];
  if (a.kind === "take" || a.kind === "hold") {
    const bad = a.places.filter((p) => !p.name || !Array.isArray(p.at) || Math.abs(p.at[0]) > 180 || Math.abs(p.at[1]) > 90);
    return [...(a.places.length ? [] : ["no places"]), ...bad.map((p) => `bad place ${JSON.stringify(p)}`), ...(a.target && !known.has(a.target) ? [`unknown target ${a.target}`] : [])];
  }
  if (!["subject", "ally", "fight", "free"].includes(a.kind)) return [`bad kind ${(a as { kind: string }).kind}`];
  return known.has(a.target) ? [] : [`unknown target ${a.target}`];
}

describe("the 1378 historical goals (EVT-100)", () => {
  it("every researched region has its goals", () => {
    // arabia is the join's small gap-filler (Hejaz, Yemen, Oman), researched with no goals of its own.
    for (const k of ["east", "europe-west", "asia", "africa-americas"]) expect(read(k, "goals.json", { goals: [] }).goals.length, k).toBeGreaterThan(50);
  });

  it("names known realms, readable aims, windows in years and known turning points", () => {
    const problems = goals.flatMap((g) => {
      const at = `${g.region} ${g.realm}: ${g.goal}`;
      const [from, to] = g.window;
      return [
        ...(known.has(g.realm) ? [] : ["unknown realm"]),
        ...(["weak", "normal", "strong"].includes(g.weight) ? [] : ["bad weight"]),
        ...(Number.isInteger(from) && (to === null || (Number.isInteger(to) && to >= from)) && from >= 1300 ? [] : [`bad window ${g.window}`]),
        ...(g.goal && g.reason ? [] : ["no words"]),
        ...aimProblems(g.aim),
        ...aimProblems(g.alternative),
        ...(g.toward ?? []).filter((k) => !keys.has(k)).map((k) => `unknown turning point ${k}`),
      ].map((p) => `${at}: ${p}`);
    });
    expect(problems).toEqual([]);
  });

  it("most goals give the AI an aim", () => {
    expect(goals.filter((g) => g.aim).length / goals.length).toBeGreaterThan(0.6);
  });
});
