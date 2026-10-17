import type { Snapshot } from "@ph/engine";
import { musicEra, paletteOf, type MusicFacts, type Palette } from "@ph/engine/domain/audio";

/**
 * What the music director needs to know (AUD-037), read from a snapshot and
 * from what the client has seen this campaign. Facts the game doesn't model
 * yet (peace voices, periods, event chains) are left out, so their states
 * never hold.
 */

/** What the client remembers between snapshots for the director. */
export interface FactMemory {
  /** Day numbers of the player's battles, by battle id. */
  battles: Map<number, number>;
  /** A battle of the player's was fought during the turn now playing. */
  battleThisTurn: boolean;
  /** Year the player's last war ended, or the campaign began. */
  peaceSince: number;
}

export const newFactMemory = (year: number): FactMemory => ({ battles: new Map(), battleThisTurn: false, peaceSince: year });

const dayNumber = (y: number, m: number, d: number) => Date.UTC(y, m - 1, d) / 864e5;
/** Day number of a date like `1444-11` or `1444-11-11`. */
function isoDay(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return dayNumber(y!, m ?? 1, d ?? 1);
}

/** Wars the player is fighting. */
export function playerWars(s: Snapshot): Snapshot["wars"] {
  const me = s.playerNation;
  return s.wars.filter((w) => w.attackers.includes(me) || w.defenders.includes(me));
}

/** Notes the player's battles in a snapshot, and peace when the last war ends. */
export function remember(mem: FactMemory, s: Snapshot): void {
  const today = dayNumber(s.date.year, s.date.month, s.date.day ?? 1);
  for (const b of s.battles) {
    if (!b.player) continue;
    if (!mem.battles.has(b.id)) mem.battles.set(b.id, today);
    mem.battleThisTurn = true;
  }
  if (!playerWars(s).length && mem.peaceSince < 0) mem.peaceSince = s.date.year;
  if (playerWars(s).length) mem.peaceSince = -1;
}

export function musicFacts(s: Snapshot, capital: number, mem: FactMemory): MusicFacts {
  const me = s.playerNation;
  const today = dayNumber(s.date.year, s.date.month, s.date.day ?? 1);
  const wars = playerWars(s);
  const enemies = new Set(wars.flatMap((w) => (w.attackers.includes(me) ? w.defenders : w.attackers)));
  const warStart = wars.length ? Math.max(...wars.map((w) => isoDay(w.start))) : Infinity;
  const battleDays = [...mem.battles.values()];
  let mine = 0;
  let plotting = 0;
  for (let p = 0; p < s.provinceOwner.length; p++) {
    if (s.provinceOwner[p] !== me) continue;
    mine++;
    if (s.provinceMood[p]! >= 3) plotting++;
  }
  const income = s.nationMonthlyIncome[me] ?? 0;
  const near = nearestEnemy(s, enemies);
  return {
    era: musicEra({ year: s.date.year, month: s.date.month, day: s.date.day ?? 1 }) ?? "I",
    screen: "map",
    atWar: wars.length > 0,
    capitalOccupied: capital >= 0 && s.provinceOccupier[capital]! >= 0,
    siegeActive: s.sieges.some((x) => x.by === me || s.provinceOwner[x.province] === me),
    fieldBattlesLast3: battleDays.filter((d) => today - d <= 91).length,
    ...(wars.length ? { monthsSinceDeclaration: Math.floor((today - warStart) / 30.44) } : {}),
    battlesFought: wars.length ? battleDays.filter((d) => d >= warStart).length : 0,
    unrestProvinceShare: mine ? plotting / mine : 0,
    lords: s.lords.filter((l) => l.nation === me),
    treasuryTrend: income > 0.05 ? "rising" : income < -0.05 ? "falling" : "steady",
    yearsAtPeace: wars.length || mem.peaceSince < 0 ? 0 : s.date.year - mem.peaceSince,
    ...(near !== undefined ? { armyNearEnemy: near } : {}),
    battleThisTurn: mem.battleThisTurn,
  };
}

/** Rough provinces between the player's nearest army and an enemy army (0 = fighting it). */
function nearestEnemy(s: Snapshot, enemies: Set<number>): number | undefined {
  const a = s.armies;
  const w = s.tileWidth;
  let best = Infinity;
  for (let i = 0; i < a.id.length; i++) {
    if (a.owner[i] !== s.playerNation) continue;
    if (a.battle[i]! >= 0) return 0;
    const x = a.tile[i]! % w;
    const y = Math.floor(a.tile[i]! / w);
    for (let j = 0; j < a.id.length; j++) {
      if (!enemies.has(a.owner[j]!)) continue;
      best = Math.min(best, Math.hypot(a.tile[j]! % w - x, Math.floor(a.tile[j]! / w) - y));
    }
  }
  // A province is about 40 map pixels across in Europe.
  return best === Infinity ? undefined : Math.round(best / 40);
}

/** Primary culture group of each name culture (names.json), for the music palette (AUD-018). */
const CULTURE_GROUP: Record<string, string> = {
  ...Object.fromEntries(["french", "breton", "occitan", "castilian", "catalan", "basque", "portuguese", "italian", "venetian", "neapolitan", "latin_church", "rhodes_hospitaller"].map((c) => [c, "latin"])),
  ...Object.fromEntries(["english", "scottish", "irish", "german", "swiss", "low_german", "dutch", "nordic", "baltic_order"].map((c) => [c, "germanic"])),
  ...Object.fromEntries(["czech", "polish", "russian", "south_slavic"].map((c) => [c, "slavic"])),
  ...Object.fromEntries(["greek", "cypriot", "albanian", "georgian", "romanian", "lithuanian"].map((c) => [c, "hellenic"])),
  hungarian: "uralic",
  ...Object.fromEntries(["turkish", "turkmen", "tatar"].map((c) => [c, "turkic"])),
  ...Object.fromEntries(["arab", "mamluk"].map((c) => [c, "arab"])),
  persian: "iranian",
  maghrebi: "berber",
  mongol: "mongolic",
  jurchen: "tungusic",
  ...Object.fromEntries(["hindustani", "rajput", "bengali", "kashmiri", "oriya", "assamese", "deccani"].map((c) => [c, "indo_aryan"])),
  ...Object.fromEntries(["telugu_kannada", "gond"].map((c) => [c, "dravidian"])),
  ...Object.fromEntries(["tibetan", "burmese"].map((c) => [c, "tibeto_burman"])),
  chinese: "sinitic",
  japanese: "japonic",
  korean: "koreanic",
  ...Object.fromEntries(["vietnamese", "khmer"].map((c) => [c, "austroasiatic"])),
  tai: "tai",
  ...Object.fromEntries(["cham", "malay", "javanese"].map((c) => [c, "austronesian"])),
  ...Object.fromEntries(["west_african", "wolof", "voltaic"].map((c) => [c, "mande"])),
  hausa_kanuri: "hausa_fulani",
  edo: "yoruba_edo",
  ethiopian: "semitic_ethiopian",
  somali: "cushitic",
  ...Object.fromEntries(["swahili", "shona", "kongo"].map((c) => [c, "bantu"])),
  ...Object.fromEntries(["nahua", "purepecha", "zapotec"].map((c) => [c, "nahua"])),
  maya: "maya",
  ...Object.fromEntries(["quechua", "muisca"].map((c) => [c, "andean"])),
  ...Object.fromEntries(["iroquoian", "southeastern", "pueblo"].map((c) => [c, "iroquoian"])),
};

/** The player's music palette from their culture and capital (AUD-018, AUD-019); Western Europe when unknown. */
export function playerPalette(culture: string | undefined, capitalLongitude: number): Palette {
  return paletteOf(CULTURE_GROUP[culture ?? ""] ?? "latin", capitalLongitude) ?? ("europe_west" as Palette);
}
