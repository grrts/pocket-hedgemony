import scenario1444 from "../data/scenarios/1444/scenario.json" with { type: "json" };
import culture1444 from "../data/scenarios/1444/culture-start.json" with { type: "json" };
import relations1444 from "../data/scenarios/1444/relations.json" with { type: "json" };
import ports1444 from "../data/scenarios/1444/ports.json" with { type: "json" };
import rulers1444 from "../data/scenarios/1444/rulers.json" with { type: "json" };
import subjects1444 from "../data/scenarios/1444/subjects.json" with { type: "json" };
import subjectsRulers1444 from "../data/scenarios/1444/subjects-rulers.json" with { type: "json" };
import goals1444 from "../data/scenarios/1444/goals.json" with { type: "json" };
import map1444 from "../data/scenarios/1444/world/map.json" with { type: "json" };
import nations1444 from "../data/scenarios/1444/world/nations.json" with { type: "json" };
import provinces1444 from "../data/scenarios/1444/world/provinces.json" with { type: "json" };
import sleeping1444 from "../data/scenarios/1444/world/sleeping-realms.json" with { type: "json" };
import scenario1378 from "../data/scenarios/1378/scenario.json" with { type: "json" };
import culture1378 from "../data/scenarios/1378/culture-start.json" with { type: "json" };
import relations1378 from "../data/scenarios/1378/relations.json" with { type: "json" };
import ports1378 from "../data/scenarios/1378/world/ports.json" with { type: "json" };
import rulers1378 from "../data/scenarios/1378/rulers.json" with { type: "json" };
import subjects1378 from "../data/scenarios/1378/subjects.json" with { type: "json" };
import subjectsRulers1378 from "../data/scenarios/1378/subjects-rulers.json" with { type: "json" };
import goals1378 from "../data/scenarios/1378/goals.json" with { type: "json" };
import lords1378 from "../data/scenarios/1378/lords.json" with { type: "json" };
import mapNations1378 from "../data/scenarios/1378/map-nations.json" with { type: "json" };
import mapToCatalogue1378 from "../data/scenarios/1378/map-to-catalogue.json" with { type: "json" };
import map1378 from "../data/scenarios/1378/world/map.json" with { type: "json" };
import nations1378 from "../data/scenarios/1378/world/nations.json" with { type: "json" };
import provinces1378 from "../data/scenarios/1378/world/provinces.json" with { type: "json" };
import sleeping1378 from "../data/scenarios/1378/world/sleeping-realms.json" with { type: "json" };
import report1378 from "../data/scenarios/1378/world/setup-report.json" with { type: "json" };
import from1444 from "../data/scenarios/1378/world/from-1444.json" with { type: "json" };
import setupConfig from "../data/domain/scenario-setup.json" with { type: "json" };
import setupMap from "../data/domain/scenario-setup-map.json" with { type: "json" };
import setupReport from "../data/domain/scenario-setup-report.json" with { type: "json" };
import eventsPlaces from "../data/domain/events-places.json" with { type: "json" };
import worldMap from "../data/domain/world-map.json" with { type: "json" };
import realm from "../data/domain/realm.json" with { type: "json" };
import religion from "../data/domain/religion.json" with { type: "json" };
import institutions from "../data/domain/institutions.json" with { type: "json" };
import type { GameDate, GoalDef, HistoricalLords } from "./types.ts";

/** The bundled start (X-25): new campaigns start on 20 September 1378. */
export const DEFAULT_START = "1378";

/** The main history checkpoint, kept as a playable start for tests and the history check (X-25). */
export const CHECKPOINT_START = "1444";

/**
 * The start the game runs from. New campaigns start in 1378; the 1444
 * checkpoint can be opened behind a dev switch: `?start=1444` (or
 * `#start=1444`) on the page, which the client hands its engine worker as the
 * worker's name `start=1444`, or `PH_START=1444` in Node. The test configs
 * pin `PH_START=1444`, so tests written against the 1444 world keep reading it.
 */
function chosenStart(): string {
  const g = globalThis as { name?: unknown; location?: { search?: string; hash?: string }; sessionStorage?: Storage; process?: { env?: Record<string, string | undefined> }; WorkerGlobalScope?: unknown };
  const pick = (s: unknown) => (typeof s === "string" ? new URLSearchParams(s.replace(/^[?#]/, "")).get("start") : null);
  const id = (g.WorkerGlobalScope !== undefined ? pick(g.name) : (pick(g.location?.search) ?? pick(g.location?.hash) ?? sessionStart(g))) ?? g.process?.env?.PH_START ?? DEFAULT_START;
  return id === CHECKPOINT_START ? CHECKPOINT_START : DEFAULT_START;
}

/** The page's key for a start picked by a save from another start (SAVE-111): the page reopens in it to load that save. */
export const SESSION_START_KEY = "ph-start";

/** Reading `sessionStorage` itself throws in a sandboxed frame without allow-same-origin, so the read is inside the try. */
function sessionStart(g: { sessionStorage?: Storage }): string | null {
  try {
    return g.sessionStorage?.getItem(SESSION_START_KEY) ?? null;
  } catch {
    return null;
  }
}

/** The id of the scenario this run starts from: "1444" or "1378". */
export const START_ID = chosenStart();
const is1378 = START_ID === "1378";

/**
 * The start scenario (X-25): the one place that names the folder the game
 * starts from. Everything that describes the world on the start day is read
 * through here, so the engine never names a year.
 */
export const START_SCENARIO = is1378 ? scenario1378 : scenario1444;

/** The day every campaign starts on (TIME-005). */
export const START_DATE: Readonly<GameDate & { day: number }> = Object.freeze({ ...START_SCENARIO.date });

/** The year of the start day, for rules that count from the start. */
export const START_YEAR: number = START_SCENARIO.date.year;

/** The research era the start falls in, and the eras known before it (RSCH-091). */
export const START_ERAS = START_SCENARIO.eras;

/** The world on the start day: tongues and faiths, relations, ports, rulers and subjects. */
export const startCulture = (is1378 ? culture1378 : culture1444) as typeof culture1444;
export const startRelations = (is1378 ? relations1378 : relations1444) as typeof relations1444;
export const startPorts = (is1378 ? ports1378 : ports1444) as typeof ports1444;
export const startRulers = (is1378 ? rulers1378 : rulers1444) as typeof rulers1444;
export const startSubjects = (is1378 ? subjects1378 : subjects1444) as unknown as typeof subjects1444;
export const startSubjectsRulers = (is1378 ? subjectsRulers1378 : subjectsRulers1444) as typeof subjectsRulers1444;

/** Realms' historical goals on the start day (EVT-100); the 1444 start has none. */
export const startGoals: readonly GoalDef[] = (is1378 ? goals1378 : goals1444).goals as unknown as GoalDef[];

/** Historical lords seated on the start day and the figures events may bring in later (REALM-280); the 1444 start has none. */
export const startLords: HistoricalLords = is1378 ? (lords1378 as unknown as HistoricalLords) : { realms: {}, later: {} };

/** The generated map of the start (tools/mapgen): image metadata, nations, provinces and sleeping realms. */
export const startWorld = {
  map: is1378 ? map1378 : map1444,
  nations: (is1378 ? nations1378 : nations1444) as typeof nations1444,
  provinces: (is1378 ? provinces1378 : provinces1444) as typeof provinces1444,
  sleeping: (is1378 ? sleeping1378 : sleeping1444) as typeof sleeping1444,
};

// The domain rules were written against the 1444 map: some name 1444 provinces,
// and the setup data mirrors the 1444 map nations. The 1378 start rewrites those
// tables in place once, here, before any rule reads them, so the engine keeps
// reading one set of tables whichever start it runs (SETUP-098).
if (is1378) {
  const ids = from1444.provinces as Record<string, string>;
  const remap = (v: unknown): unknown => {
    if (typeof v === "string") return /^p\d+$/.test(v) ? (ids[v] ?? v) : v;
    if (Array.isArray(v)) {
      for (let i = 0; i < v.length; i++) v[i] = remap(v[i]);
      return v;
    }
    if (v && typeof v === "object") for (const k of Object.keys(v)) (v as Record<string, unknown>)[k] = remap((v as Record<string, unknown>)[k]);
    return v;
  };
  for (const table of [eventsPlaces, worldMap, realm, religion, institutions, setupMap.ports]) remap(table);
  setupMap.nations.splice(0, setupMap.nations.length, ...(mapNations1378 as unknown as typeof setupMap.nations));
  Object.assign(setupReport, { left_out: report1378.left_out, grown: report1378.grown });
  Object.assign(setupConfig.map_to_catalogue, mapToCatalogue1378.map_to_catalogue);
}
