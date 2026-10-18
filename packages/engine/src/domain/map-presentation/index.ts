/**
 * Map presentation (VIEW): pure functions that decide what the map draws. Zoom
 * levels and what each shows, rendering by zoom, lenses and their colours,
 * parchment over uncharted places, month playback, map accessibility, and the
 * frame and turn budgets as data a model can check. Nothing here changes the
 * simulation (INV-VIEW-3): every function reads a snapshot and returns marks.
 * Numbers come from packages/rules/data/domain/map-presentation.json; playback
 * speed and food colours are troop-movement's.
 */
import config from "../../../../rules/data/domain/map-presentation.json" with { type: "json" };
import { MOVE, foodColour, type FoodColour } from "../troop-movement/index.ts";
import { STEPS_PER_DAY, hemisphereOf, isWetSeason, seasonOf, turnSpan, type CalendarDay, type WetClimate } from "../time-and-turns/index.ts";

export * from "./layout.ts";
export * from "./onMap.ts";
export * from "./livingMap.ts";

// ---------------------------------------------------------------------------
// Zoom levels and rendering (VIEW-001..006, INV-VIEW-2)

export type Zoom = "World" | "Region" | "Local";
export const ZOOMS = config.zoomLevels as Zoom[];

/** A zoom level by any of the names the designs use ("Province" and "close" are Local, "middle" is Region). */
export function zoomLevel(name: string): Zoom {
  const n = name.trim();
  const hit = ZOOMS.find((z) => z.toLowerCase() === n.toLowerCase());
  if (hit) return hit;
  const alias = (config.zoomAliases as Record<string, string>)[n] ?? (config.zoomAliases as Record<string, string>)[n.toLowerCase()];
  if (alias) return alias as Zoom;
  throw new Error(`Unknown zoom level: ${name}`);
}

export type MapDetail = "Low" | "Medium" | "High";

export interface PixelRendering {
  zoom: Zoom;
  /** Art pixels along one side of a map pixel; null at World zoom (one shaded pixel). */
  artPixels: number | null;
  land: string;
  sea?: string;
  from?: "terrain tile atlas";
  coasts?: string[];
}

/** How a map pixel is drawn at a zoom: terrain with owner wash far out, 4 × 4 then 8 × 8 art pixels closer (VIEW-002, VIEW-003, VIEW-068). */
export function pixelRendering(zoom: Zoom, detail: MapDetail = "High"): PixelRendering {
  if (zoom === "World") return { zoom, artPixels: null, land: config.worldZoomShading.land, sea: config.worldZoomShading.sea };
  const art = zoom === "Region" ? config.artPixelsPerMapPixel.Region : closeInDetail(detail).artPixels;
  return { zoom, artPixels: art, land: "tiles", from: "terrain tile atlas", coasts: ["rounded coasts", "sand", "surf"].filter((c) => c !== "surf" || !closeInDetail(detail).without.includes("surf")) };
}

export interface CloseInDetail {
  artPixels: number;
  without: string[];
  water: "still" | "moving" | null;
  everything: boolean;
}

/** What Map detail draws close in: Low stays at 4 × 4 without surf or forest blending; Medium 8 × 8 with still water; High everything (VIEW-068). */
export function closeInDetail(detail: MapDetail): CloseInDetail {
  const d = config.knobs["Map detail"][detail] as { closeInArtPixels: number; without?: string[]; water?: string; everything?: boolean };
  return { artPixels: d.closeInArtPixels, without: d.without ?? [], water: d.water === "still" ? "still" : d.everything ? "moving" : null, everything: d.everything === true };
}

/** What a turn uploads to the GPU: the id image only the first time, then only the colour lookup texture (VIEW-001). */
export function recolourUploads(o: { idImageUploaded: boolean; ownersBefore: readonly string[]; ownersAfter: readonly string[] }): { uploads: string[]; recoloured: number } {
  let recoloured = 0;
  for (let i = 0; i < o.ownersAfter.length; i++) if (o.ownersBefore[i] !== o.ownersAfter[i]) recoloured++;
  const uploads: string[] = [];
  if (!o.idImageUploaded) uploads.push("province id image");
  if (recoloured > 0 || !o.idImageUploaded) uploads.push("colour lookup texture");
  return { uploads, recoloured };
}

export interface BorderDraw {
  line: string;
  /** The band on each side, in that side's owner colour. */
  bands: { side: string; colour: string }[];
  colours?: string[];
  widthArtPixels?: number;
}

/** A border between two provinces of different owners: an ink line with each owner's colour inside (VIEW-004); High contrast draws black and white two art pixels wide (VIEW-049). */
export function borderBetween(a: { province: string; owner: string }, b: { province: string; owner: string }, borders: "Normal" | "Thick" | "High contrast" = "Normal"): BorderDraw | null {
  if (a.owner === b.owner) return null;
  const bands = [
    { side: a.province, colour: a.owner },
    { side: b.province, colour: b.owner },
  ];
  if (borders === "High contrast") return { line: "ink", bands, colours: config.highContrastBorder.colours, widthArtPixels: config.highContrastBorder.widthArtPixels };
  return { line: config.border.line, bands };
}

export type Rgb = readonly [number, number, number];

/** A tile type's colour on the far map is its art's average colour, so repainting a tile changes the far map (VIEW-005). */
export function averageColour(pixels: readonly Rgb[]): Rgb {
  const sum = [0, 0, 0];
  for (const p of pixels) for (let i = 0; i < 3; i++) sum[i]! += p[i]!;
  const n = Math.max(1, pixels.length);
  return [Math.round(sum[0]! / n), Math.round(sum[1]! / n), Math.round(sum[2]! / n)];
}

/** A river is one clean line along its traced pixels (VIEW-006). */
export function riverLine(traced: readonly (readonly [number, number])[]): { lines: number; points: (readonly [number, number])[] } {
  return { lines: 1, points: [...traced] };
}

// ---------------------------------------------------------------------------
// What each zoom shows (VIEW-007..019)

export interface Mark {
  draw: string;
  [detail: string]: string | number | boolean | string[] | undefined;
}

export interface ProvinceView {
  name: string;
  owner: string;
  hungry?: boolean;
  rioting?: boolean;
  inRevolt?: boolean;
  townSize?: number;
  castle?: boolean;
  roads?: boolean;
  rivers?: boolean;
  burned?: boolean;
  plague?: boolean;
  market?: boolean;
}

/** A province's own marks at a zoom (VIEW-007, VIEW-011, VIEW-016). */
export function provinceMarks(zoom: Zoom, p: ProvinceView): Mark[] {
  if (zoom === "World") {
    const out: Mark[] = [{ draw: "owner colour", owner: p.owner }];
    if (p.inRevolt) out.push({ draw: "revolt icon" });
    else if (p.rioting) out.push({ draw: "riot icon" });
    else if (p.hungry) out.push({ draw: "hunger icon" });
    return out;
  }
  if (zoom === "Region") {
    const out: Mark[] = [];
    if (p.townSize !== undefined) out.push({ draw: "town size", size: p.townSize });
    if (p.castle) out.push({ draw: "castle" }, { draw: "reach rings" });
    if (p.roads) out.push({ draw: "roads" });
    if (p.rivers) out.push({ draw: "rivers" });
    if (p.burned) out.push({ draw: "hatched", why: "burned" });
    if (p.plague) out.push({ draw: "plague" });
    if (p.market) out.push({ draw: "coin" });
    return out;
  }
  return [];
}

/** Busiest trade paths at Region zoom, thicker for more traders (VIEW-011, VIEW-027). */
export function tradePathMarks(zoom: Zoom, paths: readonly { from: string; to: string; traders: number }[]): Mark[] {
  if (zoom !== "Region") return [];
  return [...paths].sort((a, b) => b.traders - a.traders).map((p) => ({ draw: "trade path", from: p.from, to: p.to, thickness: p.traders }));
}

export type Arm = "foot" | "horse" | "guns";

export interface ArmyView {
  owner: string;
  men: number;
  foot?: number;
  horse?: number;
  guns?: number;
  wagons?: boolean;
  marching?: boolean;
  selected?: boolean;
  /** Days of food left in reserve. */
  foodDays?: number;
  rumour?: boolean;
  route?: { days: number[]; monthMarks: number; foodShare: number; stepIcons: string[] };
}

const menText = (n: number): string => n.toLocaleString("en-GB");

/** An army's marks at a zoom (VIEW-008, VIEW-012, VIEW-018). */
export function armyMarks(zoom: Zoom, a: ArmyView): Mark[] {
  if (zoom === "World") {
    const out: Mark[] = [{ draw: "banner", men: menText(a.men), colour: a.owner }];
    if (a.marching) out.push({ draw: "arrow", thickness: a.men, colour: a.owner, dayCounts: false });
    return out;
  }
  if (zoom === "Region") {
    if (a.rumour) return [{ draw: "faded banner" }];
    const arms: Arm[] = (["foot", "horse", "guns"] as const).filter((k) => (a[k] ?? 0) > 0);
    const out: Mark[] = [{ draw: "sprites", arms }];
    if (a.foodDays !== undefined) out.push({ draw: "food bar", days: a.foodDays });
    if (a.selected && a.route) {
      out.push({ draw: "route", dayCounts: true, monthMarks: a.route.monthMarks, foodColour: foodColour(a.route.foodShare), stepIcons: a.route.stepIcons });
    }
    return out;
  }
  // Local: marching columns in proportion to the men of each arm.
  const parts: [string, number][] = [
    ["foot", a.foot ?? 0],
    ["horse", a.horse ?? 0],
    ["guns", a.guns ?? 0],
  ];
  const total = parts.reduce((s, [, n]) => s + n, 0) || 1;
  const out: Mark[] = parts.filter(([, n]) => n > 0).map(([arm, n]) => ({ draw: "column", arm, share: n / total }));
  if (a.wagons) out.push({ draw: "column", arm: "wagons" });
  return out;
}

/** The forage limit shown while an army is dragged over a province, at Region zoom (VIEW-012). */
export function dragMarks(zoom: Zoom, province: string, forageLimit: number): Mark[] {
  return zoom === "Region" ? [{ draw: "forage limit", province, value: forageLimit }] : [];
}

/** A battle: crossed swords on the map, played on the tile row at Local zoom (VIEW-008, VIEW-019). */
export function battleMarks(zoom: Zoom): Mark[] {
  return zoom === "Local" ? [{ draw: "battle on the tile row" }] : [{ draw: "crossed swords" }];
}

/** A besieged castle: a ring far out, the castle tile with its breaches at Local zoom (VIEW-008, VIEW-019). */
export function siegeMarks(zoom: Zoom, breaches: number): Mark[] {
  if (zoom === "Local") return [{ draw: "castle tile", breaches }];
  return [{ draw: "ring" }];
}

/** Ports far out: anchor dots in the owner's colour, larger for great ports (VIEW-009). */
export function portMarks(zoom: Zoom, p: { owner: string; great: boolean }): Mark[] {
  return zoom === "World" ? [{ draw: "anchor dot", colour: p.owner, size: p.great ? "large" : "small" }] : [];
}

/** Fleets: one ship sprite with a count far out; the admiral's banner and a course line in days at Region (VIEW-009, VIEW-013). */
export function fleetMarks(zoom: Zoom, f: { ships: number; admiral?: string; courseDays?: number }): Mark[] {
  if (zoom === "World") return [{ draw: "ship sprite", count: f.ships }];
  if (zoom === "Region") return [{ draw: "admiral's banner", admiral: f.admiral }, { draw: "course line", days: f.courseDays }];
  return [];
}

/** The harbour tile at Region zoom: berths used and free, the slipway with its hulls (VIEW-013). */
export function harbourMarks(zoom: Zoom, h: { berthsUsed: number; berths: number; hullsBuilding: number }): Mark[] {
  if (zoom !== "Region") return [];
  const out: Mark[] = [{ draw: "anchor icon", label: `${h.berthsUsed}/${h.berths}` }];
  if (h.hullsBuilding > 0) out.push({ draw: "slipway icon", hulls: h.hullsBuilding });
  return out;
}

/** Faith at Region zoom: houses of worship, preachers, faith waves (VIEW-014). */
export function faithMarks(zoom: Zoom, f: { houses?: string[]; preachers?: number; waves?: string[] }): Mark[] {
  if (zoom !== "Region") return [];
  const sprites = config.worshipSprites as Record<string, string>;
  const out: Mark[] = (f.houses ?? []).map((h) => {
    const sprite = sprites[h];
    if (!sprite) throw new Error(`No sprite for the house of worship ${h}`);
    return { draw: "sprite", house: h, sprite, in: "town" };
  });
  for (let i = 0; i < (f.preachers ?? 0); i++) out.push({ draw: "walking figure", who: "preacher" });
  for (const source of f.waves ?? []) out.push({ draw: "soft tint", spreadingFrom: source });
  return out;
}

/** Envoys and war aims show from Region zoom; World zoom shows only the diplomacy colours (VIEW-015). */
export function diplomacyMarks(zoom: Zoom, d: { envoys?: number; warAimsAgainst?: string[] }): Mark[] {
  if (zoom !== "Region") return [];
  const out: Mark[] = [];
  for (let i = 0; i < (d.envoys ?? 0); i++) out.push({ draw: "rider", route: "dotted" });
  for (const c of d.warAimsAgainst ?? []) out.push({ draw: "war-aim icon", on: c });
  return out;
}

export type TraderMedium = "land" | "river" | "sea";

/** A trader at Region zoom: caravan, barge or ship icon with a purse bar (VIEW-016). */
export function traderMarks(zoom: Zoom, t: { medium: TraderMedium; purseShare: number }): Mark[] {
  if (zoom !== "Region") return [];
  return [{ draw: "icon", icon: (config.traderIcons as Record<TraderMedium, string>)[t.medium], purseBar: t.purseShare }];
}

/** Exploration far out: voyage paths dotted, colonies being founded as a small flag with a progress ring (VIEW-010). */
export function explorationMarks(zoom: Zoom, e: { voyages?: number; colonies?: number[] }): Mark[] {
  if (zoom !== "World") return [];
  const out: Mark[] = [];
  for (let i = 0; i < (e.voyages ?? 0); i++) out.push({ draw: "voyage path", line: "dotted" });
  for (const progress of e.colonies ?? []) out.push({ draw: "small flag", progressRing: progress });
  return out;
}

/** Colonial range as a faint line on the sea, colonisable provinces with a pale flag, at Region zoom (VIEW-017). */
export function colonialMarks(zoom: Zoom, c: { rangeZones: number; colonisable: string[] }): Mark[] {
  if (zoom !== "Region") return [];
  const out: Mark[] = [];
  if (c.rangeZones > 0) out.push({ draw: "faint line", on: "sea", zones: c.rangeZones });
  for (const p of c.colonisable) out.push({ draw: "pale flag", province: p });
  return out;
}

export interface TileView {
  building?: string;
  burned?: boolean;
  busy?: boolean;
}

/** The tile row at Local zoom as pixel art (VIEW-018). */
export function tileRowMarks(zoom: Zoom, row: { tiles: TileView[]; harbourShips?: number; roadCaravans?: number; riverBarges?: number }): Mark[] {
  if (zoom !== "Local") return [];
  const out: Mark[] = [];
  row.tiles.forEach((t, i) => {
    if (t.burned) out.push({ draw: "ash", tile: i });
    else if (t.building) out.push({ draw: "building sprite", tile: i, building: t.building });
    if (t.busy && !t.burned) out.push({ draw: "workers moving", tile: i });
  });
  for (let i = 0; i < (row.harbourShips ?? 0); i++) out.push({ draw: "ship in the harbour" });
  for (let i = 0; i < (row.roadCaravans ?? 0); i++) out.push({ draw: "caravan on the road" });
  for (let i = 0; i < (row.riverBarges ?? 0); i++) out.push({ draw: "barge on the river" });
  return out;
}

/** A system's map statement: what it shows at each zoom and its lens (VIEW-020). */
export interface ZoomStatement {
  system: string;
  World: string[];
  Region: string[];
  Local: string[];
  lens: string | null;
}

// ---------------------------------------------------------------------------
// Lenses (VIEW-021..031, INV-VIEW-1)

export interface LensDef {
  id: string;
  context: string;
  stat: string;
}
export const LENSES = config.lenses as LensDef[];

export function lens(id: string): LensDef {
  const l = LENSES.find((x) => x.id === id);
  if (!l) throw new Error(`Unknown lens: ${id}`);
  return l;
}

export interface MapView {
  lens: string;
  zoom: Zoom;
  parchment: boolean;
  tongueKin: boolean;
}

export const newMapView = (lensId = "Realms"): MapView => ({ lens: lensId, zoom: "World", parchment: true, tongueKin: false });

/** SetLens: exactly one lens is on at a time (VIEW-021, INV-VIEW-1). Today's "Realms" is the no-lens owner view. */
export function setLens(view: MapView, id: string): { view: MapView; event: { type: "LensChanged"; lens: string } } {
  if (!LENSES.some((l) => l.id === id) && !config.todaysLenses.includes(id)) throw new Error(`Unknown lens: ${id}`);
  return { view: { ...view, lens: id }, event: { type: "LensChanged", lens: id } };
}

/** What a lens colours a province by. */
export const lensColouring = (id: string): string => lens(id).stat;

/** Faith lens: the majority faith's colour, hatched where another faith holds 30 % or more; holy places carry an icon (VIEW-023). */
export function faithLens(p: { majority: string; communities: { faith: string; share: number }[]; holyPlace?: boolean }): { colour: string; hatched: boolean; hatchFaiths: string[]; icon: string | null } {
  const big = p.communities.filter((c) => c.faith !== p.majority && c.share >= config.faithHatchShare);
  return { colour: p.majority, hatched: big.length > 0, hatchFaiths: big.map((c) => c.faith), icon: p.holyPlace ? "holy place" : null };
}

/** Tongue lens: tongue family far out, tongue at Region, or kin / cousin / stranger with the toggle (VIEW-024). */
export function tongueLensColouring(zoom: Zoom, kinToggle: boolean): "tongue family" | "tongue" | "kin, cousin or stranger" {
  if (kinToggle) return "kin, cousin or stranger";
  return zoom === "World" ? "tongue family" : "tongue";
}

/** Homelands of peoples without a country are outlined on the Tongue lens (VIEW-024). */
export function homelandOutlines(peoples: readonly { people: string; homeland: string; hasCountry: boolean }[]): Mark[] {
  return peoples.filter((p) => !p.hasCountry).map((p) => ({ draw: "outline", homeland: p.homeland, people: p.people }));
}

export type RelationToYou = keyof typeof config.diplomacyColours;

/** Diplomacy lens colour for a country by its relation to the player (VIEW-025). */
export function diplomacyLens(relation: RelationToYou, playerColour: string): { colour: string; hatched: boolean } {
  const c = config.diplomacyColours[relation];
  return { colour: c === "own colour" ? playerColour : c, hatched: relation === "at war" };
}

/** Members of a league against the player carry a red border (VIEW-025). */
export function leagueBorders(members: readonly string[]): Mark[] {
  return members.map((m) => ({ draw: "border", country: m, colour: config.leagueAgainstYouBorder }));
}

/** The Sea lens's layers (VIEW-026). */
export function seaLens(o: { ports: { name: string; sailorsLeft: number }[]; fleetsAtSea: number; winds: string[]; enterableZones: string[] }): Mark[] {
  return [
    ...o.ports.map((p) => ({ draw: "port shade", port: p.name, by: "sailors who can still be called", value: p.sailorsLeft })),
    ...Array.from({ length: o.fleetsAtSea }, () => ({ draw: "fleet at sea" })),
    ...o.winds.map((z) => ({ draw: "wind arrow", zone: z })),
    ...o.enterableZones.map((z) => ({ draw: "enterable zone", zone: z })),
  ];
}

/** Trade lenses: ratio colours with the busiest lines; Traders shows only your traders and routes (VIEW-027). */
export function tradeLens(id: "Trade ratio" | "Trade value" | "Traders", o: { traders: { owner: string; route: string[] }[]; player: string; paths: { from: string; to: string; traders: number }[] }): { colourBy: string | null; lines: Mark[]; traders: Mark[] } {
  if (id === "Traders") {
    const mine = o.traders.filter((t) => t.owner === o.player);
    return { colourBy: null, lines: [], traders: mine.map((t) => ({ draw: "trader route", owner: t.owner, route: t.route })) };
  }
  return { colourBy: lens(id).stat, lines: tradePathMarks("Region", o.paths).map((m) => ({ ...m, draw: "busiest line" })), traders: [] };
}

export type WorksState = "building site" | "neglected" | "damaged" | "ruined";

/** Works lens: building sites green, neglected or damaged amber, ruined red; the worst wins (VIEW-028). */
export function worksLens(states: readonly WorksState[]): string | null {
  const c = config.worksColours as Record<WorksState, string>;
  if (states.includes("ruined")) return c.ruined;
  if (states.includes("neglected") || states.includes("damaged")) return c.neglected;
  if (states.includes("building site")) return c["building site"];
  return null;
}

/** Jobs lens: empty job slots against homeless people (VIEW-028). */
export function jobsLens(p: { emptySlots: number; homeless: number }): { colourBy: "slots against homeless"; value: number } {
  return { colourBy: "slots against homeless", value: p.emptySlots - p.homeless };
}

/** Subjects lens: each subject coloured by loyalty, a line from each courting capital (VIEW-029). */
export function subjectsLens(subjects: readonly { name: string; loyalty: string; courtedBy?: { country: string; capital: string } }[]): Mark[] {
  const out: Mark[] = subjects.map((s) => ({ draw: "subject colour", subject: s.name, by: "loyalty", loyalty: s.loyalty }));
  for (const s of subjects) if (s.courtedBy) out.push({ draw: "line", from: s.courtedBy.capital, to: s.name });
  return out;
}

/** Revolution lens: shade by province signs met, hatch risen provinces in the revolution's colour (VIEW-030). */
export function revolutionLens(p: { signsMet: number; signs: number; risen: boolean; colour: string }): { shade: number; hatch: string | null } {
  return { shade: p.signs ? p.signsMet / p.signs : 0, hatch: p.risen ? p.colour : null };
}

/** A hot ambition naming places shimmers faintly over its area, without outlining or naming the target (VIEW-031). */
export function ambitionShimmer(a: { hot: boolean; area: string | null }): { shimmer: string; faint: true; outline: false; label: false } | null {
  return a.hot && a.area ? { shimmer: a.area, faint: true, outline: false, label: false } : null;
}

/** Food lens marks: hungry provinces carry the hunger icon too, so the lens reads without colour (VIEW-051). */
export function foodLensMarks(p: { hungry: boolean; food: number }): Mark[] {
  const out: Mark[] = [{ draw: "lens colour", by: "food", value: p.food }];
  if (p.hungry) out.push({ draw: "hunger icon" });
  return out;
}

// ---------------------------------------------------------------------------
// Parchment (VIEW-032..034)

/** The charted map only grows (VIEW-033). */
export function chart(charted: ReadonlySet<string>, places: Iterable<string>): Set<string> {
  const out = new Set(charted);
  for (const p of places) out.add(p);
  return out;
}

/** A place lies under the parchment when it is uncharted and the display toggle is on (VIEW-032, VIEW-034). */
export function underParchment(place: string, charted: ReadonlySet<string>, parchmentOn = true): boolean {
  return parchmentOn && !charted.has(place);
}

// ---------------------------------------------------------------------------
// Month playback and the turn in progress (VIEW-035..038)

/** Seconds the month takes to play back: days / 10 × replaySecondsPer10Days (VIEW-035). */
export function playbackSeconds(days: number, secondsPer10Days: number = MOVE.replaySecondsPer10Days): number {
  return (days / 10) * secondsPer10Days;
}

export interface PlaybackInput {
  /** Days in the turn: 7, fewer for the last turn (X-18). */
  days: number;
  marches: { army: string; route: string[] }[];
  castleStops: { day: number; castle: string }[];
  /** Battles; a player battle slows each day it runs to six 4-hour steps (X-1). */
  battles: { day: number; place: string; player?: boolean; daysRunning?: number }[];
}

export interface PlaybackCue {
  day: number;
  at: number;
  draw: string;
  place?: string;
  army?: string;
}

/** Days a turn plays back over: its 7 days, fewer for the last turn (X-18). */
export const playbackDays = (first: CalendarDay): number => turnSpan(first).days;

/**
 * The month as timed cues: armies walk their routes, a castle that stops an army rings red
 * on its day, a battle flashes crossed swords (VIEW-036). Each day a player battle runs plays
 * as six 4-hour steps at `playback.battleStepSeconds` each instead of a tenth of a second;
 * there is no pause (X-1). Skip is offered only for a turn with no player battle (VIEW-035).
 */
export function playbackCues(m: PlaybackInput, secondsPer10Days: number = MOVE.replaySecondsPer10Days): { cues: PlaybackCue[]; seconds: number; skip: boolean } {
  const slowed = new Set<number>();
  for (const b of m.battles) if (b.player) for (let d = b.day; d < b.day + (b.daysRunning ?? 1); d++) slowed.add(d);
  const dayLength = (d: number) => (slowed.has(d) ? STEPS_PER_DAY * config.playback.battleStepSeconds : playbackSeconds(1, secondsPer10Days));
  const startOf = (day: number) => {
    let t = 0;
    for (let d = 1; d < day; d++) t += dayLength(d);
    return t;
  };
  const raw: Omit<PlaybackCue, "at">[] = [
    ...m.marches.map((x) => ({ day: 0, draw: "walk route", army: x.army, place: x.route.join(" → ") })),
    ...m.castleStops.map((c) => ({ day: c.day, draw: `castle rings ${config.playback.castleStopRing}`, place: c.castle })),
    ...m.battles.map((b) => ({ day: b.day, draw: config.playback.battleMark, place: b.place })),
  ].sort((a, b) => a.day - b.day);
  const cues = raw.map((c) => ({ ...c, at: c.day ? startOf(c.day) : 0 }));
  return { cues, seconds: startOf(m.days + 1), skip: slowed.size === 0 };
}

/** The battle bar while several player battles run: each with its progress; tapping one follows it (VIEW-071, X-1). */
export function battleBar(running: readonly { id: string; place: string; rounds: number; days: number }[], following: string | null): { id: string; place: string; progress: number; followed: boolean }[] {
  return running.map((b) => ({ id: b.id, place: b.place, progress: Math.min(1, b.rounds / (b.days * STEPS_PER_DAY)), followed: b.id === following }));
}

/** The "what is being worked out" strip for a turn that runs past 1.5 s (VIEW-038, SHELL-072). */
export function turnStrip(turnSeconds: number): { shown: boolean; after: number; text: string } {
  const after = config.turnStrip.afterSeconds;
  return { shown: turnSeconds > after, after, text: config.turnStrip.text };
}

/** While a turn is processed the map pans and zooms and shows results as they arrive; orders wait (VIEW-037). */
export function mapInputWhileProcessing(input: "pan" | "zoom" | "order"): boolean {
  return input !== "order";
}

// ---------------------------------------------------------------------------
// Map accessibility (VIEW-047..051)

export type ColourVision = keyof typeof config.colourVision;

/** Nation colours and lens ramp for a colour vision mode (VIEW-047). */
export function colourVision(mode: ColourVision): { nationColours: string; ramp: string; patterns: boolean; palette: number } {
  const m = config.colourVision[mode];
  return { nationColours: m.nationColours, ramp: m.ramp, patterns: mode === "No colour", palette: config.nationPaletteSize };
}

/** Patterns by band: each band of a lens gets its own hatching, dots or stripes (VIEW-048). */
export function lensBandPatterns(bands: number): string[] {
  const kinds = config.lensPatterns;
  const out: string[] = [];
  for (let i = 0; i < bands; i++) {
    const kind = kinds[i % kinds.length]!;
    const density = Math.floor(i / kinds.length) + 1;
    out.push(density === 1 ? kind : `${kind} ×${density}`);
  }
  return out;
}

/** Route food colours carry a pattern: green solid, yellow dashed, red dotted (VIEW-050). */
export function routeLine(reserveShare: number): { colour: FoodColour; pattern: string } {
  const colour = foodColour(reserveShare);
  return { colour, pattern: (config.routeFoodPatterns as Record<FoodColour, string>)[colour] };
}

/** Day counts hide rather than shrink below 10 points (VIEW-050). */
export function dayCountsShown(pointsTall: number): boolean {
  return pointsTall >= config.dayCountMinPoints;
}

// ---------------------------------------------------------------------------
// Performance budgets and knobs (VIEW-052..069)

export interface Budget {
  measure: string;
  limit: number;
  unit: string;
  bound: "min" | "max";
  checkedBy: "perf" | "bench";
}
export const BUDGETS = config.budgets as Budget[];
export const FRAME_MS: number = config.frameMs;

export function budget(measure: string): Budget {
  const b = BUDGETS.find((x) => x.measure === measure);
  if (!b) throw new Error(`No budget for ${measure}`);
  return b;
}

export const withinBudget = (b: Budget, value: number): boolean => (b.bound === "max" ? value <= b.limit : value >= b.limit);

/** Checks measurements against the budgets; any broken budget fails CI (VIEW-064). */
export function checkBudgets(measured: Record<string, number>): { pass: boolean; broken: string[] } {
  const broken = Object.entries(measured)
    .filter(([m, v]) => !withinBudget(budget(m), v))
    .map(([m]) => m);
  return { pass: broken.length === 0, broken };
}

/** The engine turn budget for a world size (VIEW-058). */
export function turnBudgetMs(provinces: number, nations: number): number {
  return budget(`engine turn, ${provinces} provinces and ${nations} nations`).limit;
}

/** The slowest route plan's budget for a world size (VIEW-063). */
export function routeBudgetMs(provinces: number): number {
  return budget(`slowest route plan, ${provinces} provinces`).limit;
}

/** Where a turn runs: in the worker, on the main thread only when no worker can start (VIEW-060). */
export function turnRunsIn(workerStarts: boolean): "worker" | "main thread" {
  return workerStarts ? "worker" : "main thread";
}

/** Work a frame may never do: read layout, plan routes, walk the province graph, draw text fresh (VIEW-057). */
export const FRAME_FORBIDDEN = ["read layout", "plan route", "walk province graph", "draw text"] as const;

/** What one frame of a pan does: the map quad from its textures, then cached bitmaps for text and sprites (VIEW-057). */
export function panFrameWork(): { task: string; from?: string }[] {
  return [
    { task: "draw map quad", from: "id image and colour lookup texture" },
    { task: "blit labels", from: "cached bitmaps" },
    { task: "blit sprites", from: "cached bitmaps" },
  ];
}

export function forbiddenFrameWork(tasks: readonly { task: string }[]): string[] {
  return tasks.map((t) => t.task).filter((t) => (FRAME_FORBIDDEN as readonly string[]).includes(t));
}

/** Applying the worker's answer: textures updated and one redraw; only open panels re-render (VIEW-061). */
export function applyTurnAnswer(o: { transfer: "typed arrays" | "JSON"; openPanels: string[]; allPanels: string[] }): { redraws: number; rerender: string[]; ok: boolean } {
  return { redraws: 1, rerender: o.allPanels.filter((p) => o.openPanels.includes(p)), ok: o.transfer === "typed arrays" };
}

export type Sharpness = keyof typeof config.knobs.Sharpness;
export type Animations = keyof typeof config.knobs.Animations;
export type FrameCap = 30 | 60 | 120 | "Display rate";

export interface Knobs {
  Sharpness: Sharpness;
  "Frame rate cap": FrameCap;
  "Map detail": MapDetail;
  Animations: Animations;
  redraw: "on change" | "every frame while moving";
}

export const PHONE_DEFAULTS: Knobs = { ...(config.phoneDefaults as Omit<Knobs, "redraw">), redraw: "every frame while moving" };

/** Battery saver moves every knob down at once (VIEW-066); the AI budget is not a display knob (D-VIEW-9). */
export function withBatterySaver(k: Knobs): Knobs {
  const b = config.batterySaver;
  return { ...k, "Frame rate cap": b["Frame rate cap"] as FrameCap, Sharpness: b.Sharpness as Sharpness, Animations: b.Animations as Animations, redraw: "on change" };
}

/** The settings performance targets are measured at: phone defaults, then once with Battery saver (VIEW-065). */
export function measuredKnobs(): Knobs[] {
  return [PHONE_DEFAULTS, withBatterySaver(PHONE_DEFAULTS)];
}

/** Screen pixels per CSS pixel each Sharpness step allows. */
export const sharpnessRatio = (s: Sharpness): number => config.knobs.Sharpness[s];

/** A still map is never redrawn, whatever the frame cap (VIEW-067). */
export function framesRedrawn(o: { seconds: number; cap: FrameCap; displayRate?: number; moving: boolean; changes?: number }): number {
  if (!o.moving) return o.changes ?? 0;
  const fps = o.cap === "Display rate" ? (o.displayRate ?? 60) : o.cap;
  return Math.floor(o.seconds * fps);
}

/** How a battle result is shown for an Animations step: Off shows still frames (VIEW-069). */
export function battleResultMotion(a: Animations): string {
  return config.knobs.Animations[a];
}

// ---------------------------------------------------------------------------
// Decided rules (D-VIEW-1, 2, 5, 7, 9)

/** The AI turn's work-step budget, one per AI realm per turn, the same on every device. */
const AI_WORK_STEPS = 1;

/** The zoom level for a camera zoom: World below 2, Region from 2 to under 4, Local from 4 (VIEW-070, provisional). */
export function zoomForCamera(camera: number): Zoom {
  const b = config.zoomBoundaries;
  if (camera >= b.Local) return "Local";
  if (camera >= b.Region) return "Region";
  return "World";
}

/** Every lens in the picker: the build's six first, then each designed lens once (VIEW-022, D-VIEW-2). */
export function lensPicker(): { lenses: string[]; scrolls: boolean } {
  const out = [...(config.todaysLenses as string[])];
  for (const l of LENSES) if (!out.includes(l.id)) out.push(l.id);
  return { lenses: out, scrolls: config.lensPickerScrollsOnPhone };
}

/** Pixels per CSS pixel: the map canvas always 1, the overlay up to Sharpness's cap (VIEW-054, D-VIEW-1). */
export function canvasRatios(devicePixelRatio: number, s: Sharpness): { map: number; overlay: number } {
  return { map: 1, overlay: Math.min(devicePixelRatio, sharpnessRatio(s)) };
}

/** The map statement of a system that gives no zoom table: its lens at every zoom, its card at Local only (VIEW-020, D-VIEW-7). */
export function defaultZoomStatement(system: string, lensId: string | null): ZoomStatement & { card: Zoom[] } {
  const d = config.noZoomTableDefault;
  const at = (z: Zoom): string[] => (lensId && d.lens.includes(z) ? [`lens ${lensId}`] : []).concat(d.card.includes(z) ? ["card"] : []);
  return { system, World: at("World"), Region: at("Region"), Local: at("Local"), lens: lensId, card: d.card as Zoom[] };
}

/** The AI's turn budget in work steps; no display knob changes it (VIEW-066, D-VIEW-9, X-15). */
export const aiWorkSteps = (_k: Knobs): number => AI_WORK_STEPS;

// ---------------------------------------------------------------------------
// Seasons on the map (X-17)

export type SeasonPalette = "snow" | "spring green" | "base" | "autumn gold" | "wet season";

export interface SeasonProvince {
  latitude: number;
  mountain?: boolean;
  /** The wet-season climate of a dry land, if any. */
  wetClimate?: WetClimate;
}

/**
 * The palette a province's tiles take in a month (VIEW-072): its hemisphere's season;
 * winter snow from 50° toward the pole and on every mountain; spring green; summer the
 * base; autumn gold; a dry land in its wet season shows the wet palette.
 */
export function seasonPalette(p: SeasonProvince, month: number): SeasonPalette {
  if (p.wetClimate && isWetSeason(p.wetClimate, month)) return "wet season";
  const season = seasonOf(hemisphereOf(p.latitude), month);
  const sp = config.seasonPalettes;
  if (season === "winter") return Math.abs(p.latitude) >= sp.snowFromLatitude || p.mountain ? "snow" : "base";
  if (season === "spring") return "spring green";
  if (season === "autumn") return "autumn gold";
  return "base";
}

/** Palettes are swapped once a month per province, never per frame (VIEW-073). */
export function monthPalettes(provinces: readonly (SeasonProvince & { id: string })[], month: number): Map<string, SeasonPalette> {
  return new Map(provinces.map((p) => [p.id, seasonPalette(p, month)]));
}
