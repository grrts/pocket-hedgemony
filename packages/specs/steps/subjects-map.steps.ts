// Subjects on the map at world zoom (SUBJ-093). The ties come from the scenario's
// bonds (s.bonds, a Map<string, SubjectBond> made by the steps in subjects.steps.ts,
// such as `"Brittany" is a subject of "France"`).
import { expect } from "vitest";
import { worldZoomLook, type SubjectBond, type WorldZoomLook } from "@ph/engine/domain/subjects";
import { steps, type Scenario } from "../src/registry.ts";

const { When, Then } = steps("subjects");

/** The direct overlord of a realm in this scenario, or null when it is nobody's subject. */
function overlordOf(s: Scenario): (realm: string) => string | null {
  const all: Map<string, SubjectBond> = s.bonds ?? new Map();
  return (realm) => (all.get(realm) ?? all.get(realm.toLowerCase()))?.overlord ?? null;
}

function look(s: Scenario, realm: string): WorldZoomLook {
  expect(s.zoom, "the map is not at world zoom").toBe("world");
  return worldZoomLook(realm, overlordOf(s));
}

When("the map is at world zoom", (s) => {
  s.zoom = "world";
});

Then(/^"([^"]+)" is drawn in the colour of "([^"]+)" with a (\d+)-pixel diagonal hatch in its own colour$/, (s, realm: string, overlord: string, px: string) => {
  const l = look(s, realm);
  expect(l.fill).toBe(overlord);
  expect(l.hatch).toBe(realm);
  expect(l.hatchPx).toBe(Number(px));
});

Then("the border between {string} and {string} is dotted", (s, a: string, b: string) => {
  expect(look(s, a).borderWith(b)).toBe("dotted");
  expect(look(s, b).borderWith(a)).toBe("dotted");
});

Then("{string} is hatched in the colour of {string} only", (s, realm: string, overlord: string) => {
  const l = look(s, realm);
  // Washed in the direct overlord's colour, one hatch in its own colour; the top overlord's colour never shows.
  expect(l.fill).toBe(overlord);
  expect(l.hatch).toBe(realm);
  const top = overlordOf(s)(overlord);
  if (top) expect([l.fill, l.hatch]).not.toContain(top);
});
