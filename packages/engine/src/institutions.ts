import type { World } from "./world.ts";
import type { News } from "./war.ts";
import { answerCall, controller, strength } from "./war.ts";
import { ensureRoute } from "./statecraft.ts";
import { FAITH_IDS } from "./peoples.ts";
import * as dip from "./domain/diplomacy/index.ts";
import * as inst from "./domain/institutions/index.ts";

/**
 * The Empire in the game (institutions slice 1, INST-001 to INST-034,
 * INST-080, INST-081, INST-083 to INST-085): the members and imperial land
 * of 1444, the seats and their elections, the Emperor's defence calls, the
 * war aim on outsiders holding imperial land, the dues and the yearly hold
 * count. The rules are the institutions context's (domain/institutions);
 * this file maps the world onto them, as rebels.ts does for rebellions.
 */

const E = inst.institutionsConfig.empire;
const rel = dip.relations;

export interface InstitutionsState {
  /** The Empire, null in a world without its members (a test map). */
  empire: inst.Empire | null;
}

export const createInstitutionsState = (): InstitutionsState => ({ empire: null });

const name = (world: World, n: number) => world.rules.nations[n]!.name;
const nameOf = (world: World, id: string) => world.rules.nations[world.nationIndex.get(id) ?? -1]?.name ?? id;
const idx = (world: World, id: string) => world.nationIndex.get(id) ?? -1;
const date = (world: World) => world.diplomacy.date;

/** The realm's state faith id, or null. */
export function faithOf(world: World, id: string): string | null {
  const n = idx(world, id);
  if (n < 0) return null;
  return FAITH_IDS[world.nationStateFaith[n]!] ?? null;
}

const rulerOf = (world: World) => (id: string) => {
  const n = idx(world, id);
  return n >= 0 ? (world.rulers[n]?.name ?? "") : "";
};

/** What the vote counter reads of the realms: soldiers as others see them (men in the field and levies at home), and faiths. */
export function realmsOf(world: World): inst.Realms {
  return { soldiers: (id) => (idx(world, id) >= 0 && !world.nationGone[idx(world, id)] ? strength(world, idx(world, id)) : 0), faith: (id) => faithOf(world, id) };
}

/** The head of the Catholic faith (the map's Papal States), null when gone (INST-021, OQ-INST-4). */
export function headOfFaith(world: World): string | null {
  const n = idx(world, E.head_of_faith);
  return n >= 0 && !world.nationGone[n] ? E.head_of_faith : null;
}

/** Whether an event of the tree has fired (`peace_of_augsburg`, `peace_of_westphalia`). */
export function eventFired(world: World, id: string): boolean {
  return !!world.events?.state.world.history.some((h) => h.event === id) || world.diplomacy.flags.includes(id);
}

/** The Empire of 1444 (INST-010, INST-011, INST-020), after the rulers are seeded. */
export function seedInstitutions(world: World): void {
  const land = new Map<number, string[]>();
  for (let p = 0; p < world.provinceCount; p++) {
    const o = world.provinceOwner[p]!;
    if (o >= 0 && !world.provinceWater[p]) land.set(o, [...(land.get(o) ?? []), world.provinceIds[p]!]);
  }
  const holder = idx(world, E.holder_1444);
  if (holder < 0) return;
  world.empire = inst.startEmpire({ date: date(world), onMap: (id) => idx(world, id) >= 0, landOf: (id) => land.get(idx(world, id)) ?? [], rulerOf: rulerOf(world) });
}

// ---------------------------------------------------------------- the monthly step

/**
 * The monthly institutions step (spec §9), after diplomacy and government:
 * members who must leave, the election, the Emperor's defence calls and
 * their answers, the war aim on outsiders holding imperial land, and in
 * January the year's hold count. The dues come in with the ledger.
 */
export function monthlyInstitutions(world: World, news: News[]): void {
  const e = world.empire;
  if (!e || e.ended) return;
  membership(world, e, news);
  election(world, e, news);
  defenceCalls(world, e, news);
  lapseDefence(world, e, news);
  restoreAims(world, e);
  if (world.date.month === 1) yearCount(world, e, news);
}

function membership(world: World, e: inst.Empire, news: News[]): void {
  for (const id of [...e.members]) {
    const n = idx(world, id);
    const why = inst.mustLeave(e, id, { capital: world.rules.nations[n]?.capital ?? "", overlord: rel.overlord(world.diplomacy.graph, id) ?? null, gone: n < 0 || world.nationGone[n] === 1 });
    if (!why) continue;
    const seat = inst.seatOf(e, id);
    inst.leave(e, id);
    const what = why === "ended" ? `${nameOf(world, id)} is no more, and so no longer a member of the Empire.` : `${nameOf(world, id)} leaves the Empire: it ${why}.`;
    news.push({ kind: "crown", text: `${what}${seat ? ` The seat of ${seat.name} stands vacant.` : ""}`, nations: [n, idx(world, e.holder ?? "")].filter((x) => x >= 0) });
  }
}

function election(world: World, e: inst.Empire, news: News[]): void {
  const r = realmsOf(world);
  const west = eventFired(world, "peace_of_westphalia");
  if (e.election && dip.monthOf(date(world)) >= e.election.ends) {
    const was = e.holder;
    const out = inst.endElection(world.diplomacy, e, r, headOfFaith(world), rulerOf(world), world.player >= 0 ? world.nationIds[world.player] : undefined);
    if (out?.winner) {
      const t = inst.tally(out.votes, Object.values(out.votes).filter((v, i, a) => a.indexOf(v) === i));
      const words = t.map((x) => `${nameOf(world, x.candidate)} ${x.votes}`).join(" · ");
      news.push({ kind: "crown", text: out.changed ? `The seats elect ${nameOf(world, out.winner)} Emperor (${words}).` : `The seats keep the crown with ${nameOf(world, out.winner)} (${words}).`, nations: [...new Set([out.winner, was ?? "", ...e.members])].map((x) => idx(world, x)).filter((x) => x >= 0), major: true });
    }
    return;
  }
  const why = inst.electionDue(e, date(world), rulerOf(world));
  if (!why) return;
  const el = inst.callElection(e, date(world), why, r, west);
  if (el) news.push({ kind: "crown", text: `An election for the Empire: ${why} Candidates: ${el.candidates.map((c) => nameOf(world, c)).join(", ")}.`, nations: e.members.map((m) => idx(world, m)).filter((x) => x >= 0), begins: true });
}

/** INST-030: a war a non-member declared on a member, or one in which a non-member holds a member's imperial land, calls the Emperor. */
export function defenceCalls(world: World, e: inst.Empire, news: News[]): void {
  if (!e.holder) return;
  const d = world.diplomacy;
  const emperor = e.holder;
  const call = (war: dip.War, member: string, attacker: string) => {
    if (war.attackers.includes(emperor) || war.defenders.includes(emperor)) return;
    if (d.calls.some((c) => c.war === war.id && c.called === emperor)) return;
    const c = dip.issueOutsideCall(d, war, member, emperor, attacker, "empire");
    if (!c) return;
    c.answerOn = dip.addMonths(dip.monthOf(d.date), E.defence.answer_months);
    e.defence.push({ member, war: war.id, attacker, call: c.id });
    news.push({ kind: "call", text: `${nameOf(world, attacker)} attacks ${nameOf(world, member)}, a member of the Empire: the Emperor is called to defend it.`, nations: [idx(world, emperor), idx(world, member), idx(world, attacker)].filter((x) => x >= 0) });
  };
  for (const war of d.wars) {
    const member = inst.defenceNeeded(e, war);
    if (member) call(war, member, war.declarer);
  }
  // A non-member holding a member's imperial land in a war calls the Emperor too.
  for (const p of e.imperialLand) {
    const k = world.provinceIndex.get(p);
    if (k === undefined) continue;
    const owner = world.provinceOwner[k]!, occ = world.provinceOccupier[k]!;
    if (owner < 0 || occ < 0) continue;
    const member = world.nationIds[owner]!, outsider = world.nationIds[occ]!;
    if (!inst.isMember(e, member) || inst.isMember(e, outsider) || member === emperor) continue;
    const war = d.wars.find((w) => (w.attackers.includes(member) && w.defenders.includes(outsider)) || (w.defenders.includes(member) && w.attackers.includes(outsider)));
    if (war) call(war, member, outsider);
  }
  answered(world, e, news);
}

/** Calls the Emperor has answered, yes or no, land on hold and ledgers (INST-030). */
function answered(world: World, e: inst.Empire, news: News[]): void {
  const d = world.diplomacy;
  for (const x of [...e.defence]) {
    const c = d.calls.find((k) => k.id === x.call);
    if (!c || !d.wars.some((w) => w.id === x.war)) {
      e.defence = e.defence.filter((y) => y !== x);
      continue;
    }
    if (!c.answer) continue;
    inst.defenceAnswered(d, e, x.member, c.answer === "yes");
    if (c.answer === "no") news.push({ kind: "crown", text: `The Emperor leaves ${nameOf(world, x.member)} to its fate: the Empire's hold falls by ${-E.defence.refuse}.`, nations: [idx(world, e.holder ?? ""), idx(world, x.member)].filter((y) => y >= 0) });
  }
}

/** INST-083: silence on a defence call counts as a refusal once its month has passed. */
function lapseDefence(world: World, e: inst.Empire, news: News[]): void {
  const d = world.diplomacy;
  const now = dip.monthOf(d.date);
  for (const x of [...e.defence]) {
    const c = d.calls.find((k) => k.id === x.call);
    if (c && !c.answer && c.answerOn <= now) answerCall(world, c, false, news);
  }
  answered(world, e, news);
}

/** The AI Emperor answers a defence call when his soldiers with the member's are a match for the attacker's (spec §12). */
export function aiAnswersDefence(world: World, call: dip.Call): boolean {
  const ours = strength(world, idx(world, call.called)) + strength(world, idx(world, call.caller));
  return ours >= strength(world, idx(world, call.against));
}

/** INST-031: the Emperor holds *Restore imperial land* on every outsider holding imperial land. */
function restoreAims(world: World, e: inst.Empire): void {
  const d = world.diplomacy;
  d.aims = d.aims.filter((a) => a.aim !== "restore_imperial_land");
  if (!e.holder) return;
  for (const [outsider, provinces] of outsidersOf(world, e)) {
    if (outsider === e.holder) continue;
    for (const p of provinces) d.aims.push({ holder: e.holder, target: outsider, aim: "restore_imperial_land", province: p, source: "imperial land held by an outsider" });
  }
}

function outsidersOf(world: World, e: inst.Empire): Map<string, string[]> {
  return inst.outsiders(e, (p) => {
    const k = world.provinceIndex.get(p);
    if (k === undefined) return null;
    const h = controller(world, k);
    return h >= 0 ? world.nationIds[h]! : null;
  });
}

/** Wars between two members running now, as pairs (each pair once). */
function memberWars(world: World, e: inst.Empire): [string, string][] {
  const out = new Map<string, [string, string]>();
  for (const r of world.diplomacy.graph.relations) {
    if (r.type !== "at_war" || !inst.isMember(e, r.source) || !inst.isMember(e, r.target)) continue;
    out.set(dip.pairKey(r.source, r.target), [r.source, r.target].sort() as [string, string]);
  }
  return [...out.values()];
}

/** INST-003, INST-033: the year's hold count in January. */
function yearCount(world: World, e: inst.Empire, news: News[]): void {
  const emperorFaith = e.holder ? faithOf(world, e.holder) : null;
  const facts: inst.YearFacts = {
    memberWars: memberWars(world, e).map(([a, b]) => [nameOf(world, a), nameOf(world, b)]),
    outsiderProvinces: [...outsidersOf(world, e).values()].reduce((t, l) => t + l.length, 0),
    otherFaith: e.members.filter((m) => faithOf(world, m) !== emperorFaith).length,
    augsburg: eventFired(world, "peace_of_augsburg"),
    westphalia: eventFired(world, "peace_of_westphalia"),
  };
  const was = e.hold;
  inst.countYear(e, inst.yearLines(e, facts));
  if (world.player >= 0 && inst.isMember(e, world.nationIds[world.player]!) && e.hold !== was) {
    news.push({ kind: "crown", text: `The Empire's hold ${e.hold > was ? "grows" : "falls"} to ${e.hold} (${inst.holdWord(e.hold)}) over the year.`, nations: [world.player] });
  }
}

/** INST-032: the dues the Emperor collects this month, for the ledger's tribute line. */
export function empireDues(world: World, n: number): number {
  const e = world.empire;
  return e && e.holder === world.nationIds[n] ? inst.dues(e) : 0;
}

// ---------------------------------------------------------------- orders

export type EmpireOrder =
  /** Stand for the crown, or stop (StandForCrown). */
  | { type: "empire"; do: "stand"; on: boolean }
  /** The player's seat's vote in a sitting election. */
  | { type: "empire"; do: "vote"; candidate: number }
  /** Send an envoy with a gift to seek a seat's vote (SeekVote, INST-026). */
  | { type: "empire"; do: "seekVote"; realm: number }
  /** The Emperor grants a vacant seat to a member (GrantSeat, INST-022). */
  | { type: "empire"; do: "grantSeat"; seat: string; realm: number }
  /** The Emperor asks a realm with its capital in imperial land to join (AdmitMember, INST-012). */
  | { type: "empire"; do: "admit"; realm: number };

export function empireOrder(world: World, n: number, o: EmpireOrder, news: News[]): string | null {
  const e = world.empire;
  if (!e || e.ended) return "there is no Empire";
  const me = world.nationIds[n]!;
  switch (o.do) {
    case "stand":
      return inst.standForCrown(e, me, o.on);
    case "vote": {
      if (!e.election) return "no election sits";
      if (!inst.seatOf(e, me)) return "you hold no seat";
      const c = world.nationIds[o.candidate];
      if (!c || !e.election.candidates.includes(c)) return "not a candidate";
      e.election.playerVote = c;
      return null;
    }
    case "seekVote":
      return seekVote(world, n, o.realm);
    case "grantSeat": {
      if (e.holder !== me) return "only the Emperor grants seats";
      const id = world.nationIds[o.realm];
      if (!id) return "no such realm";
      const why = inst.grantSeat(e, o.seat, id);
      if (!why) news.push({ kind: "crown", text: `The Emperor grants the seat of ${o.seat} to ${name(world, o.realm)}.`, nations: [n, o.realm] });
      return why;
    }
    case "admit":
      return admit(world, n, o.realm, news);
  }
}

/** Why realm n can't seek the vote of the seat held by realm t now, or null. */
export function whyNotSeekVote(world: World, n: number, t: number): string | null {
  const e = world.empire;
  if (!e || e.ended) return "there is no Empire";
  const me = world.nationIds[n], them = world.nationIds[t];
  if (!me || !them || n === t) return "no such realm";
  if (!inst.isMember(e, me)) return "only members may stand for the crown";
  if (!inst.seatOf(e, them)) return "they hold no seat";
  const d = world.diplomacy;
  if (d.envoys.some((x) => x.country === me && x.target === them && (x.status === "road" || x.status === "court"))) return "an envoy is already on the way";
  if (dip.freeSeats(d, me) <= 0) return "no free envoy: every seat is taken";
  if (rel.has(d.graph, "at_war", me, them)) return "you are at war";
  if (world.nationTreasury[n]! < E.seek_vote.gift_gold) return `needs ${E.seek_vote.gift_gold} gold for the gift`;
  return null;
}

/** INST-026: an envoy with a gift to an elector's court; on arrival the tie *Sought our vote*. */
export function seekVote(world: World, n: number, t: number): string | null {
  const why = whyNotSeekVote(world, n, t);
  if (why) return why;
  ensureRoute(world, n, t);
  const tie = { key: "sought_our_vote", name: "Sought our vote", weight: E.seek_vote.tie, fadeYears: E.seek_vote.fade_years };
  try {
    dip.sendEnvoy(world.diplomacy, { country: world.nationIds[n]!, target: world.nationIds[t]!, action: "seek_vote", ask: { tie } });
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
  world.nationTreasury[n] = world.nationTreasury[n]! - E.seek_vote.gift_gold;
  return null;
}

/** INST-012: the Emperor asks a realm whose capital lies in imperial land to join; it answers by the reasons count. */
export function admit(world: World, n: number, t: number, news: News[]): string | null {
  const e = world.empire!;
  const me = world.nationIds[n]!, them = world.nationIds[t];
  if (e.holder !== me) return "only the Emperor admits members";
  if (!them) return "no such realm";
  const why = inst.whyNotAdmit(e, them, world.rules.nations[t]!.capital);
  if (why) return why;
  const count = inst.admitCount(world.diplomacy, e, them, (id) => faithOf(world, id));
  if (count.yes) inst.join(e, them);
  news.push({ kind: "crown", text: count.yes ? `${name(world, t)} joins the Empire.` : `${name(world, t)} declines to join the Empire.`, nations: [n, t] });
  return null;
}

// ---------------------------------------------------------------- the view (INST-080, INST-081, INST-084)

export interface SeatView {
  name: string;
  /** The realm that holds it, −1 for a church or vacant seat. */
  realm: number;
  church: boolean;
  vacant: boolean;
  /** The candidate it would vote for today, −1 = none. */
  vote: number;
  /** Its reasons for each candidate (realm seats), best first. */
  reasons: { candidate: number; total: number; rows: { name: string; number: number }[] }[];
  /** Why the player can't seek this seat's vote, or null. */
  seekWhyNot: string | null;
}

export interface MemberView {
  realm: number;
  provinces: number;
  faith: string;
  seat: string | null;
  atWarWithMember: boolean;
  /** Imperial provinces of this member held by outsiders. */
  landHeld: number;
}

export interface EmpireView {
  name: string;
  emperor: number;
  ruler: string;
  since: string;
  hold: number;
  word: string;
  /** The player's role, or null when not a member. */
  role: "Emperor" | "Elector" | "Member" | null;
  standing: boolean;
  seats: SeatView[];
  candidates: number[];
  /** Today's tally, most votes first, in words and numbers. */
  tally: { candidate: number; votes: number }[];
  election: { why: string; ends: string; playerVote: number } | null;
  members: MemberView[];
  /** This year's gains and losses so far, and last year's record. */
  year: inst.HoldLine[];
  record: inst.HoldLine[];
  dues: number;
  /** The Emperor's open defence calls. */
  defence: { member: number; attacker: number; call: string }[];
  /** Realms whose capital lies in imperial land and that are not members (the Emperor may admit them). */
  admittable: number[];
  ended: { date: string; how: string } | null;
}

/** The Empire card's view, for the player (INST-081). */
export function empireView(world: World, player: number): EmpireView | null {
  const e = world.empire;
  if (!e) return null;
  const d = world.diplomacy;
  const r = realmsOf(world);
  const me = player >= 0 ? world.nationIds[player]! : "";
  const cands = e.election ? e.election.candidates : inst.candidates(e, r, eventFired(world, "peace_of_westphalia"));
  const head = headOfFaith(world);
  const v = inst.votes(d, e, cands, r, head, me && e.election?.playerVote ? { realm: me, vote: e.election.playerVote } : undefined);
  const provinces = new Int32Array(world.nationCount);
  for (let p = 0; p < world.provinceCount; p++) if (world.provinceOwner[p]! >= 0) provinces[world.provinceOwner[p]!]!++;
  const held = new Map<string, number>();
  for (const [, ps] of outsidersOf(world, e)) for (const p of ps) {
    const o = world.provinceOwner[world.provinceIndex.get(p)!]!;
    if (o >= 0) held.set(world.nationIds[o]!, (held.get(world.nationIds[o]!) ?? 0) + 1);
  }
  const wars = memberWars(world, e);
  const admittable: number[] = [];
  if (e.holder === me) for (let n = 0; n < world.nationCount; n++) if (!world.nationGone[n] && !inst.whyNotAdmit(e, world.nationIds[n]!, world.rules.nations[n]!.capital)) admittable.push(n);
  return {
    name: E.name,
    emperor: e.holder ? idx(world, e.holder) : -1,
    ruler: e.holder ? rulerOf(world)(e.holder) : "",
    since: e.since,
    hold: e.hold,
    word: inst.holdWord(e.hold),
    role: me ? inst.roleOf(e, me) : null,
    standing: e.standing.includes(me),
    seats: e.seats.map((s) => ({
      name: s.name,
      realm: s.realm ? idx(world, s.realm) : -1,
      church: s.church,
      vacant: inst.vacant(s),
      vote: v[s.name] ? idx(world, v[s.name]!) : -1,
      reasons: s.realm
        ? cands
            .map((c) => {
              const rows = inst.seatReasons(d, e, s.realm!, c, r);
              return { candidate: idx(world, c), total: rows.reduce((t, x) => t + x.number, 0), rows: rows.map((x) => ({ name: x.name, number: x.number })) };
            })
            .sort((a, b) => b.total - a.total)
        : [],
      seekWhyNot: s.realm && player >= 0 ? (s.realm === me ? "your own seat" : whyNotSeekVote(world, player, idx(world, s.realm))) : "a church seat follows the head of the faith",
    })),
    candidates: cands.map((c) => idx(world, c)),
    tally: inst.tally(v, cands).map((x) => ({ candidate: idx(world, x.candidate), votes: x.votes })),
    election: e.election ? { why: e.election.why, ends: e.election.ends, playerVote: e.election.playerVote ? idx(world, e.election.playerVote) : -1 } : null,
    members: e.members.map((m) => {
      const n = idx(world, m);
      return { realm: n, provinces: n >= 0 ? provinces[n]! : 0, faith: faithOf(world, m) ?? "", seat: inst.seatOf(e, m)?.name ?? null, atWarWithMember: wars.some(([a, b]) => a === m || b === m), landHeld: held.get(m) ?? 0 };
    }),
    year: e.year.filter((l) => l.number),
    record: e.record,
    dues: inst.dues(e),
    defence: e.defence.map((x) => ({ member: idx(world, x.member), attacker: idx(world, x.attacker), call: x.call })),
    admittable,
    ended: e.ended,
  };
}

/** The Institutions map mode (INST-084): per realm 0 none, 1 member, 2 elector, 3 Emperor; per province 1 when imperial land is held by an outsider. */
export function institutionsLens(world: World): { realm: Uint8Array; outsiderLand: Uint8Array } {
  const realm = new Uint8Array(world.nationCount);
  const outsiderLand = new Uint8Array(world.provinceCount);
  const e = world.empire;
  if (!e || e.ended) return { realm, outsiderLand };
  for (const m of e.members) {
    const n = idx(world, m);
    if (n >= 0) realm[n] = m === e.holder ? 3 : inst.seatOf(e, m) ? 2 : 1;
  }
  for (const [, ps] of outsidersOf(world, e)) for (const p of ps) outsiderLand[world.provinceIndex.get(p)!] = 1;
  return { realm, outsiderLand };
}

// ---------------------------------------------------------------- saves and the hash

export function saveInstitutions(world: World): { empire: inst.Empire | null } {
  return { empire: world.empire ? structuredClone(world.empire) : null };
}

export function restoreInstitutions(world: World, saved: { empire: inst.Empire | null } | undefined): void {
  if (saved) world.empire = saved.empire ? structuredClone(saved.empire) : null;
}

export function institutionsHashData(world: World): Float64Array {
  const e = world.empire;
  if (!e) return new Float64Array(0);
  return new Float64Array([e.hold, e.members.length, e.seats.filter((s) => s.realm).length, e.election ? 1 : 0, e.defence.length, e.holder ? idx(world, e.holder) : -1, e.left, e.year.length]);
}
