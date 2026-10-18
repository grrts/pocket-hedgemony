import { expect } from "vitest";
import * as E from "@ph/engine/domain/events";
import { activeTimedReasons, releaseByEvent, relationByEvent, subjectCountByEvent, type SubjectBond } from "@ph/engine/domain/subjects";
import { steps, type Scenario } from "../src/registry.ts";

/**
 * SUBJ-097: the event-tree keys the subjects context reads and writes, run
 * through the event engine's own effect and condition tables on a tree world.
 */
const { When, Then } = steps("subjects");

const OVERLORD = "overlord";

function world(s: Scenario): E.World {
  s.evWorld ??= E.emptyWorld(1444, 11);
  return s.evWorld;
}
function apply(s: Scenario, effect: Record<string, unknown>): void {
  E.applyEffect(effect as E.Effect, world(s), { roles: {} });
}
function holds(s: Scenario, c: Record<string, unknown>): boolean {
  return E.holds(c as E.Condition, world(s));
}
function bondOf(s: Scenario, subject: string): SubjectBond | undefined {
  return world(s).subjects?.[subject];
}
function vassalize(s: Scenario, target: string, type: string): void {
  apply(s, { vassalize: { who: OVERLORD, target, type } });
}

When("an event uses {string}", (s, key: string) => {
  s.key = key.split(" ")[0];
  switch (s.key) {
    case "vassalize":
      for (const type of ["vassal", "tributary", "colony", "protectorate", "puppet", "dominion"]) vassalize(s, `by_${type}`, type);
      break;
    case "release":
      vassalize(s, "freed", "vassal");
      vassalize(s, "kept", "tributary");
      expect(holds(s, { relation: { who: "freed", other: OVERLORD, type: "subject" } })).toBe(true);
      apply(s, { release: { who: OVERLORD, target: "freed" } });
      // a realm that is not the target's overlord cannot release it
      apply(s, { release: { who: "stranger", target: "kept" } });
      break;
    case "relation":
      vassalize(s, "vassal_realm", "vassal");
      apply(s, { relation: { who: OVERLORD, other: "union_realm", type: "personal_union" } });
      break;
    case "subject_count":
      vassalize(s, "t1", "tributary");
      vassalize(s, "t2", "tributary");
      vassalize(s, "v1", "vassal");
      break;
    case "subject_loyalty":
      vassalize(s, "sweden", "vassal");
      bondOf(s, "sweden")!.loyalty = "wavering";
      break;
    case "add_subject_reason":
      vassalize(s, "sweden", "vassal");
      s.from = E.now(world(s));
      apply(s, { add_subject_reason: { target: "sweden", reason: "lost_war", months: 24 } });
      apply(s, { add_subject_reason: { target: "sweden", reason: "gift" } });
      break;
    case "remove_subject_reason":
      vassalize(s, "sweden", "vassal");
      apply(s, { add_subject_reason: { target: "sweden", reason: "lost_war", months: 24 } });
      apply(s, { add_subject_reason: { target: "sweden", reason: "gift", months: 24 } });
      apply(s, { remove_subject_reason: { target: "sweden", reason: "lost_war" } });
      break;
    case "change_subject_kind":
      vassalize(s, "loosened", "vassal");
      vassalize(s, "tightened", "tributary");
      apply(s, { relation: { who: OVERLORD, other: "crowned", type: "personal_union" } });
      apply(s, { change_subject_kind: { who: OVERLORD, target: "loosened", kind: "loosen" } });
      apply(s, { change_subject_kind: { who: OVERLORD, target: "tightened", kind: "vassal" } });
      apply(s, { change_subject_kind: { who: OVERLORD, target: "crowned", kind: "vassal" } });
      break;
    default:
      throw new Error(`No event key ${key}`);
  }
});

Then("a subject is created of the mapped kind", (s) => {
  // D-SUBJ-16: puppet → Protectorate, dominion → Self-governing colony
  const want: Record<string, [string, string | undefined]> = {
    vassal: ["vassal", undefined],
    tributary: ["tributary", undefined],
    colony: ["colony", "outpost"],
    protectorate: ["protectorate", undefined],
    puppet: ["protectorate", undefined],
    dominion: ["colony", "self_governing"],
  };
  for (const [type, [kind, stage]] of Object.entries(want)) {
    const b = bondOf(s, `by_${type}`)!;
    expect(b.overlord).toBe(OVERLORD);
    expect(b.kind).toBe(kind);
    expect(b.stage).toBe(stage);
    expect(b.loyalty).toBe("loyal");
    expect(holds(s, { relation: { who: `by_${type}`, other: OVERLORD, type: "subject" } })).toBe(true);
  }
});

Then("the subject is released", (s) => {
  expect(bondOf(s, "freed")).toBeUndefined();
  expect(holds(s, { relation: { who: "freed", other: OVERLORD, type: "subject" } })).toBe(false);
  expect(holds(s, { subject_count: { who: OVERLORD, op: "==", value: 1 } })).toBe(true);
  // the stranger's release changed nothing; the overlord's own release frees it as a friend
  expect(bondOf(s, "kept")!.overlord).toBe(OVERLORD);
  expect(releaseByEvent(world(s).subjects!, OVERLORD, "kept")).toEqual({ independent: true, stance: "friendly" });
  expect(bondOf(s, "kept")).toBeUndefined();
});

Then("the Subject relation and its kind are read", (s) => {
  const rel = (who: string, other: string, type: string, kind?: string) => holds(s, { relation: { who, other, type, ...(kind ? { kind } : {}) } });
  expect(rel("vassal_realm", OVERLORD, "subject")).toBe(true);
  expect(rel("vassal_realm", OVERLORD, "subject", "vassal")).toBe(true);
  expect(rel("vassal_realm", OVERLORD, "subject", "tributary")).toBe(false);
  expect(rel(OVERLORD, "vassal_realm", "overlord", "vassal")).toBe(true);
  expect(rel(OVERLORD, "vassal_realm", "subject")).toBe(false);
  expect(rel(OVERLORD, "union_realm", "personal_union", "union")).toBe(true);
  expect(rel("union_realm", OVERLORD, "personal_union", "union")).toBe(true);
  const bonds = world(s).subjects!;
  expect(relationByEvent(bonds, "union_realm", OVERLORD, "subject")).toEqual({ holds: true, kind: "union" });
  expect(relationByEvent(bonds, OVERLORD, "vassal_realm", "overlord")).toEqual({ holds: true, kind: "vassal" });
  expect(relationByEvent(bonds, "vassal_realm", OVERLORD, "personal_union")).toEqual({ holds: false });
});

Then("the number of subjects is read, by reach weights only if asked", (s) => {
  // two Tributaries (0.5 each) and a Vassal (1): three subjects, 2 by reach (config kinds.*.reach_weight)
  expect(holds(s, { subject_count: { who: OVERLORD, op: "==", value: 3 } })).toBe(true);
  expect(holds(s, { subject_count: { who: OVERLORD, op: "==", value: 2, by_reach: true } })).toBe(true);
  expect(holds(s, { subject_count: { who: OVERLORD, op: ">=", value: 3, by_reach: true } })).toBe(false);
  const bonds = world(s).subjects!;
  expect(subjectCountByEvent(bonds, OVERLORD)).toBe(3);
  expect(subjectCountByEvent(bonds, OVERLORD, true)).toBe(2);
  // a subject with a subject of its own weighs more (SUBJ-059)
  apply(s, { vassalize: { who: "v1", target: "sub_sub", type: "vassal" } });
  expect(subjectCountByEvent(world(s).subjects!, OVERLORD, true)).toBeGreaterThan(2);
  expect(holds(s, { subject_count: { who: OVERLORD, op: ">", value: 2, by_reach: true } })).toBe(true);
  expect(holds(s, { subject_count: { who: OVERLORD, op: "==", value: 3 } })).toBe(true);
});

Then("a loyalty step is tested", (s) => {
  const test = (op: string, step: string, target = "sweden") => holds(s, { subject_loyalty: { who: OVERLORD, target, op, step } });
  expect(test("==", "wavering")).toBe(true);
  expect(test(">=", "wavering")).toBe(true);
  expect(test("==", "loyal")).toBe(false);
  expect(test("<=", "disloyal")).toBe(false);
  bondOf(s, "sweden")!.loyalty = "disloyal";
  expect(test("<=", "disloyal")).toBe(true);
  expect(test(">=", "wavering")).toBe(false);
  // a realm that is not its subject passes no loyalty test
  expect(holds(s, { subject_loyalty: { who: "stranger", target: "sweden", op: "<=", step: "loyal" } })).toBe(false);
});

Then("a reason is added by id for the months given", (s) => {
  const b = bondOf(s, "sweden")!;
  const lost = b.reasons.find((r) => r.id === "lost_war")!;
  expect(lost).toMatchObject({ arrow: -1, from: s.from, until: s.from + 24 });
  expect(activeTimedReasons(b, s.from + 23).map((r) => r.id)).toContain("lost_war");
  expect(activeTimedReasons(b, s.from + 24).map((r) => r.id)).not.toContain("lost_war");
  // no months given: the reason's own months from config (gift: 60)
  expect(b.reasons.find((r) => r.id === "gift")).toMatchObject({ arrow: 1, until: s.from + 60 });
});

Then("a reason is removed by id", (s) => {
  const b = bondOf(s, "sweden")!;
  expect(b.reasons.map((r) => r.id)).toEqual(["gift"]);
});

Then("the kind is tightened or loosened", (s) => {
  const loosened = bondOf(s, "loosened")!;
  expect(loosened.kind).toBe("tributary");
  expect(loosened.reasons.find((r) => r.id === "loosened")?.arrow).toBe(2);
  expect(holds(s, { relation: { who: "loosened", other: OVERLORD, type: "subject", kind: "tributary" } })).toBe(true);
  expect(bondOf(s, "tightened")!.kind).toBe("vassal");
  // a Union neither tightens nor loosens (D-SUBJ-15)
  expect(bondOf(s, "crowned")!.kind).toBe("union");
});
