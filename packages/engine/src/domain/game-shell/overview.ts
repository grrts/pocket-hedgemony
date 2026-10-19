/**
 * The Realm book's Overview (SHELL-170, SHELL-171): one tile for each other
 * section with its key number, a short note and a mark when something there
 * waits on the player; a tap opens the page that holds it. Pure: the client
 * passes the counts, nothing here reads the simulation.
 */
import { SHELL } from "./stack.ts";

export interface OverviewInput {
  gold: number;
  perMonth: number;
  /** Provinces with less than a month of food, and those running low. */
  hungry: number;
  low: number;
  provinces: number;
  people: number;
  /** Taken provinces still to fill (PROV-340), risings in the realm, beaten risings waiting for a verdict. */
  newLands: number;
  risings: number;
  verdicts: number;
  /** Settlers or asks waiting on a tribal realm's Hunting grounds (TRIBE-027). */
  huntWaits: number;
  armies: number;
  men: number;
  fleets: number;
  wars: number;
  allies: number;
  subjects: number;
  /** A peace offer or an envoy waiting for an answer (SHELL-141). */
  answerWaits: boolean;
  study: { name: string; pct: number } | null;
  /** Faith or language under half, which brings risings (REALM-238). */
  beliefLow: boolean;
}

export interface OverviewTile {
  section: string;
  /** The page a tap opens. */
  page: string;
  line: string;
  note: string;
  /** What waits on the player, or null. */
  needs: string | null;
}

const num = (n: number) => Math.round(n).toLocaleString("en-GB");
const plural = (n: number, one: string, many = `${one}s`) => `${num(n)} ${n === 1 ? one : many}`;
const signed = (n: number) => `${n < 0 ? "−" : "+"}${Math.abs(n).toFixed(1)}`;

function tile(section: string, v: OverviewInput): OverviewTile {
  switch (section) {
    case "Economy":
      return {
        section,
        page: v.hungry || v.low ? "Food" : "Treasury",
        line: `${num(v.gold)} gold · ${signed(v.perMonth)} a month`,
        note: v.low ? `${plural(v.low, "province")} running low on food` : v.hungry ? "" : "All provinces fed",
        needs: v.hungry ? `${plural(v.hungry, "province")} hungry` : v.perMonth < 0 ? "Losing gold each month" : null,
      };
    case "Lands": {
      const needs = v.newLands
        ? `${plural(v.newLands, "new land")} to fill`
        : v.verdicts
          ? `${plural(v.verdicts, "beaten rising")} to judge`
          : v.risings
            ? `${plural(v.risings, "uprising")}`
            : v.huntWaits
              ? "Settlers wait on your grounds"
              : null;
      return {
        section,
        page: v.newLands ? "Officials" : v.verdicts || v.risings ? "Provinces" : v.huntWaits ? "Hunting grounds" : "Provinces",
        line: plural(v.provinces, "province"),
        note: `${num(v.people)} people`,
        needs,
      };
    }
    case "Military":
      return { section, page: "Army", line: `${plural(v.armies, "army", "armies")} · ${num(v.men)} men`, note: v.fleets ? plural(v.fleets, "fleet") : "No fleets", needs: null };
    case "Diplomacy":
      return {
        section,
        page: "Diplomacy",
        line: v.wars ? `At war with ${plural(v.wars, "realm")}` : "At peace",
        note: [v.allies ? plural(v.allies, "ally", "allies") : "No allies", v.subjects ? plural(v.subjects, "subject") : ""].filter(Boolean).join(" · "),
        needs: v.answerWaits ? "An answer waits" : null,
      };
    case "Research":
      return {
        section,
        page: v.study && v.beliefLow ? "Peoples" : "Research",
        line: v.study ? `${v.study.name} · ${Math.floor(v.study.pct)} %` : "Nothing studied",
        note: v.study ? "Studying" : "",
        needs: !v.study ? "Choose what to study" : v.beliefLow ? "Faith or language low" : null,
      };
    default:
      throw new Error(`No overview tile for ${section}`);
  }
}

/** The Overview's tiles, one per section after Realm, in the book's order (SHELL-170). */
export function realmOverview(v: OverviewInput): OverviewTile[] {
  return SHELL.realmOverview.tiles.map((s) => tile(s, v));
}
