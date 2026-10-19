import scenario from "../data/scenarios/1444/scenario.json" with { type: "json" };
import cultureStart from "../data/scenarios/1444/culture-start.json" with { type: "json" };
import relations from "../data/scenarios/1444/relations.json" with { type: "json" };
import ports from "../data/scenarios/1444/ports.json" with { type: "json" };
import rulers from "../data/scenarios/1444/rulers.json" with { type: "json" };
import subjects from "../data/scenarios/1444/subjects.json" with { type: "json" };
import subjectsRulers from "../data/scenarios/1444/subjects-rulers.json" with { type: "json" };
import type { GameDate } from "./types.ts";

/**
 * The start scenario (X-25): the one place that names the folder the game
 * starts from. Everything that describes the world on the start day is read
 * through here, so moving the start (to 1378, milestone 10) changes this
 * file and its folder, not the engine.
 */
export const START_SCENARIO = scenario;

/** The day every campaign starts on (TIME-005). */
export const START_DATE: Readonly<GameDate & { day: number }> = Object.freeze({ ...scenario.date });

/** The year of the start day, for rules that count from the start. */
export const START_YEAR: number = scenario.date.year;

/** The research era the start falls in, and the eras known before it (RSCH-091). */
export const START_ERAS = scenario.eras;

/** The world on the start day: tongues and faiths, relations, ports, rulers and subjects. */
export { cultureStart as startCulture, relations as startRelations, ports as startPorts, rulers as startRulers, subjects as startSubjects, subjectsRulers as startSubjectsRulers };
