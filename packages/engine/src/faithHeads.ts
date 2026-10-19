import { isHuman } from "./humans.ts";
import type { World } from "./world.ts";
import { declaringAim, type News } from "./war.ts";
import * as dip from "./domain/diplomacy/index.ts";
import * as relg from "./domain/religion/index.ts";
import { FAITH_IDS, NO_FAITH, SLOTS } from "./peoples.ts";
import { loyaltyStep } from "./lords.ts";

/**
 * Heads of the faith in the game (religion §5.17, RELG-139 to RELG-156):
 * patrons of the Pope, the Ecumenical Patriarch, the Catholicos and the
 * Dalai Lama, the Caliph, the conclave, censure of wars between fellow
 * believers, the patron's call to defend a holy place and Raise our own
 * patriarch. The rules are domain/religion/faithHeads.ts; this file maps the
 * world onto them each month and when a war is declared. Every effect is a
 * tie or wrong in the diplomacy ledger, a war aim, a call to arms, an oath
 * broken, a lord's step or a preacher: there is no meter.
 */

const H = relg.heads;
const FH = H.FH;

export interface Censure {
  /** The censured realm, the head and the war (diplomacy's war id). */
  nation: number;
  head: string;
  war: string;
  target: number;
  /** The target's provinces when the war began: a peace that leaves none of them with the censured realm ends the censure at once (RELG-151). */
  taken: number[];
  /** Month the censure began, the month its war ended, and the month it ends ("YYYY-MM"). */
  start: string;
  ended?: string;
  until?: string;
}

export interface Conclave {
  monthsLeft: number;
  /** Gold each realm has sent (design gold, by nation index). */
  gold: Record<number, number>;
  opened: string;
}

export interface FaithHeadsState {
  /** Patron of each head by head id: nation index, -1 none. The Caliph's patron is the Caliph. */
  patron: Record<string, number>;
  /** The patron's state faith when he became patron, for Betrayed the faith (RELG-148). */
  patronFaith: Record<string, string>;
  /** Who owned each seat, and its owner's overlord or the owner, when last looked at (RELG-140, RELG-144). */
  seatOwner: Record<string, number>;
  seatHolder: Record<string, number>;
  /** Whom the patron's tie points at now, so a new patron moves it. */
  favoured: Record<string, number>;
  /** Heads that exist from a date or an event and have come (the Dalai Lama, RELG-154). */
  created: string[];
  /** The holder of Mecca and Medina when the Caliph claimed them (RELG-141). */
  caliphHeld: number;
  conclave: Conclave | null;
  censures: Censure[];
  /** Orthodox realms that raised their own patriarch (RELG-152). */
  ownPatriarch: number[];
  /** Wars already looked at for censure and the patron's call. */
  seenWars: string[];
}

export function createFaithHeadsState(N: number): { faithHeads: FaithHeadsState; nationServes: Uint8Array } {
  return {
    faithHeads: { patron: {}, patronFaith: {}, seatOwner: {}, seatHolder: {}, favoured: {}, created: [], caliphHeld: -1, conclave: null, censures: [], ownPatriarch: [], seenWars: [] },
    nationServes: new Uint8Array(N * FAITH_IDS.length),
  };
}

// ---------------------------------------------------------------- reading the world

const monthNow = (world: World): string => `${world.date.year}-${String(world.date.month).padStart(2, "0")}`;
const addYears = (month: string, years: number): string => `${Number(month.slice(0, 4)) + years}${month.slice(4)}`;
const name = (world: World, n: number): string => world.rules.nations[n]!.name;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** A realm's state faith id, "" when it has none. */
export function faithOf(world: World, n: number): string {
  const f = n >= 0 ? world.nationStateFaith[n]! : NO_FAITH;
  return f === NO_FAITH ? "" : FAITH_IDS[f]!;
}

function overlordOf(world: World, n: number): number {
  const o = dip.relations.overlord(world.diplomacy.graph, world.nationIds[n]!);
  const k = o ? world.nationIndex.get(o) : undefined;
  return k === undefined ? -1 : k;
}

/** The map provinces of a seat or holy place. */
function seatProvinces(world: World, seat: string): number[] {
  const ids = (FH.seat_provinces as Record<string, string[]>)[seat] ?? [];
  return ids.map((id) => world.provinceIndex.get(id) ?? -1).filter((p) => p >= 0);
}

/** The first province of each seat, for the map's seat icons. */
export function seatProvince(world: World, h: relg.heads.Head): number {
  return seatProvinces(world, h.seat)[0] ?? -1;
}

/** Owner of every province of a seat, -1 when it is split or unowned. */
export function seatOwner(world: World, h: relg.heads.Head): number {
  const ps = seatProvinces(world, h.seat);
  if (!ps.length) return -1;
  const o = world.provinceOwner[ps[0]!]!;
  return ps.every((p) => world.provinceOwner[p] === o) ? o : -1;
}

/** The seat's owner's overlord, else its owner (RELG-140). */
export function seatHolder(world: World, h: relg.heads.Head): number {
  const o = seatOwner(world, h);
  if (o < 0) return -1;
  const ov = overlordOf(world, o);
  return ov >= 0 ? ov : o;
}

/** The heads that exist now. */
export function liveHeads(world: World): relg.heads.Head[] {
  return H.heads().filter((h) => (h.from === undefined ? true : world.faithHeads.created.includes(h.id)));
}

/** Whether a realm's church is headed by its crown (RELG-139, RELG-152). */
export function headsItsChurch(world: World, n: number): boolean {
  return H.crownHeaded(faithOf(world, n), world.faithHeads.ownPatriarch.includes(n));
}

/** The patron of a head, -1 none. */
export const patronOf = (world: World, id: string): number => world.faithHeads.patron[id] ?? -1;

/** The Caliph, -1 none. */
export const caliph = (world: World): number => patronOf(world, "caliph");

/** The faith's head that a realm's patronage of gives ties: the head of its own faith whose patron it is, or null. */
function headFavouring(world: World, n: number): relg.heads.Head | null {
  return liveHeads(world).find((h) => patronOf(world, h.id) === n && faithOf(world, n) === h.faith) ?? null;
}

/** Preachers the heads give a realm: one as patron of its own faith's head, one for its own patriarch (RELG-146, RELG-152). */
export function headPreachers(world: World, n: number): number {
  return (headFavouring(world, n) ? FH.patron.preachers : 0) + (world.faithHeads.ownPatriarch.includes(n) ? FH.own_patriarch.preachers : 0);
}

/** The realm's censures still running. */
export function censuresOf(world: World, n: number): Censure[] {
  const now = monthNow(world);
  return world.faithHeads.censures.filter((c) => c.nation === n && (!c.until || now < c.until));
}

/** Realms of a faith, but one. */
function realmsOf(world: World, faith: string, but = -1): number[] {
  const out: number[] = [];
  for (let n = 0; n < world.nationCount; n++) if (n !== but && !world.nationGone[n] && faithOf(world, n) === faith) out.push(n);
  return out;
}

/** Cardinals: one per Catholic house of worship at step 3 or more (RELG-142; stand-in: a house in a province of at least the config's people). */
export function cardinals(world: World, n: number): number {
  const cat = FAITH_IDS.indexOf("catholic");
  const min = FH.conclave.cardinal_stand_in_min_people;
  let k = 0;
  for (let p = 0; p < world.provinceCount; p++) {
    if (world.provinceOwner[p] !== n || world.provincePopulation[p]! < min) continue;
    for (let s = 0; s < SLOTS; s++) if (world.provinceHouses[p * SLOTS + s] === cat) k++;
  }
  return k * FH.conclave.cardinals_per_house_step3;
}

/** Design gold in the treasury's gold. */
export const treasuryGold = (world: World, gold: number): number => gold * world.rules.defines.works.goldScale;

// ---------------------------------------------------------------- the start

/** The heads in 1444 (RELG-153): the held seats follow their owners, the Pope has no patron, the Mamluks hold the Caliph's claim. */
export function seedFaithHeads(world: World): void {
  const st = world.faithHeads;
  st.seenWars = world.diplomacy.wars.map((w) => w.id);
  for (const h of liveHeads(world)) {
    st.seatOwner[h.id] = seatOwner(world, h);
    st.seatHolder[h.id] = seatHolder(world, h);
    if (h.way === "held") setPatron(world, h, st.seatHolder[h.id]!);
    else st.patron[h.id] = -1;
  }
  const c = world.nationIndex.get(FH.start_1444.caliph);
  const ch = H.headById("caliph")!;
  if (c !== undefined && faithOf(world, c) === "sunni") {
    setPatron(world, ch, c);
    st.caliphHeld = seatHolder(world, ch);
  }
  syncFavour(world);
}

function setPatron(world: World, h: relg.heads.Head, n: number): void {
  world.faithHeads.patron[h.id] = n;
  if (n >= 0) world.faithHeads.patronFaith[h.id] = faithOf(world, n);
  else delete world.faithHeads.patronFaith[h.id];
}

// ---------------------------------------------------------------- each month

/**
 * The monthly step: the Dalai Lama comes in 1578; seats that changed hands
 * move the patron and leave Seized or Freed the seat; the Caliph who lost
 * Mecca and Medina is Caliph no more; a patron who changed faith betrayed
 * it; a sitting conclave counts its month; censures whose war has ended
 * begin to fade; new wars are looked at; the AI takes what is offered; and
 * the patron's tie and the served communities follow who is patron.
 */
export function monthlyFaithHeads(world: World, news: News[]): void {
  const st = world.faithHeads;
  const dalai = H.headById("dalai_lama");
  if (dalai && !st.created.includes(dalai.id) && world.date.year >= (dalai.from ?? 0)) createHead(world, dalai, seatHolder(world, dalai), news);
  for (let n = 0; n < world.nationCount; n++) if (world.nationGone[n]) for (const [id, p] of Object.entries(st.patron)) if (p === n) setPatron(world, H.headById(id)!, -1);
  for (const h of liveHeads(world)) seatChanges(world, h, news);
  betrayals(world, news);
  if (st.conclave && --st.conclave.monthsLeft <= 0) closeConclave(world, news);
  censureUpkeep(world, news);
  faithHeadsWars(world, news);
  aiFaithHeads(world, news);
  syncFavour(world);
}

function createHead(world: World, h: relg.heads.Head, patron: number, news: News[]): void {
  const st = world.faithHeads;
  st.created.push(h.id);
  st.seatOwner[h.id] = seatOwner(world, h);
  st.seatHolder[h.id] = seatHolder(world, h);
  setPatron(world, h, patron);
  const all = realmsOf(world, h.faith);
  news.push({ kind: "event", text: `${cap(h.name)} is named${patron >= 0 ? `, with ${name(world, patron)} as patron` : ""}.`, nations: patron >= 0 ? [patron, ...all] : all });
}

/** A seat that changed owner or overlord (RELG-140, RELG-143, RELG-144), and the Caliph's hold (RELG-141). */
function seatChanges(world: World, h: relg.heads.Head, news: News[]): void {
  const st = world.faithHeads;
  const owner = seatOwner(world, h);
  const holder = seatHolder(world, h);
  const was = st.seatOwner[h.id] ?? -1;
  if (owner !== was && owner >= 0 && was >= 0) {
    // Taken from a fellow believer: Seized the seat; from another faith by one of the head's faith: Freed the seat.
    const loserFaith = faithOf(world, was);
    if (loserFaith === h.faith || faithOf(world, owner) === h.faith) {
      const e = H.seatTaken(h.faith, loserFaith);
      for (const r of realmsOf(world, h.faith, owner)) dip.addEntry(world.diplomacy, world.nationIds[r]!, world.nationIds[owner]!, { key: `${e.key}_seat_${h.id}`, name: e.name, weight: e.weight, fadeYears: e.fadeYears });
      news.push({ kind: "event", text: `${name(world, owner)} ${e.key === "seized" ? "seizes" : "frees"} the seat of ${h.name}.`, nations: [owner, was, ...realmsOf(world, h.faith)] });
    }
  }
  if (h.way === "held" && holder !== (st.seatHolder[h.id] ?? -1)) {
    setPatron(world, h, holder);
    if (holder >= 0) news.push({ kind: "event", text: `${name(world, holder)} is now patron of ${h.name}.`, nations: [holder] });
  }
  if (h.way === "chosen" && owner >= 0 && owner !== world.nationIndex.get(h.seatRealm ?? "") && holder !== patronOf(world, h.id)) {
    // Rome held by another realm: no conclave, and its holder is the Pope's patron (RELG-143).
    setPatron(world, h, holder);
    st.conclave = null;
    news.push({ kind: "event", text: `${name(world, holder)} holds Rome and so the Pope.`, nations: [holder] });
  }
  if (h.way === "claimed" && patronOf(world, h.id) >= 0 && holder !== st.caliphHeld) {
    const c = patronOf(world, h.id);
    setPatron(world, h, -1);
    st.caliphHeld = -1;
    news.push({ kind: "event", text: `${name(world, c)} no longer holds Mecca and Medina, and is Caliph no more.`, nations: [c, ...realmsOf(world, h.faith)] });
  }
  st.seatOwner[h.id] = owner;
  st.seatHolder[h.id] = holder;
}

/** A patron whose state faith changed betrayed it (RELG-148): the wrong with every realm of the old faith; a chosen or claimed head drops him, a held seat keeps him as patron of another faith. */
function betrayals(world: World, news: News[]): void {
  const st = world.faithHeads;
  for (const h of liveHeads(world)) {
    const p = patronOf(world, h.id);
    if (p < 0 || st.patronFaith[h.id] !== h.faith || faithOf(world, p) === h.faith) continue;
    const b = FH.betrayed;
    for (const r of realmsOf(world, h.faith, p)) dip.addEntry(world.diplomacy, world.nationIds[r]!, world.nationIds[p]!, { key: "betrayed_the_faith", name: b.name, weight: b.weight, fadeYears: b.fade_years });
    if (h.way === "held") st.patronFaith[h.id] = faithOf(world, p);
    else setPatron(world, h, -1);
    news.push({ kind: "event", text: `${name(world, p)} has betrayed the faith: ${h.name} has no patron in it.`, nations: [p, ...realmsOf(world, h.faith)] });
  }
}

/** The patron's tie, *The <head> favours us*, from every realm of the faith, and the communities a patron of another faith serves (RELG-145, RELG-146). */
export function syncFavour(world: World): void {
  const st = world.faithHeads;
  const d = world.diplomacy;
  const F = FAITH_IDS.length;
  world.nationServes.fill(0);
  for (const h of liveHeads(world)) {
    const key = `favours_${h.id}`;
    const p = patronOf(world, h.id);
    const gets = p >= 0 ? H.patronGets(faithOf(world, p), h) : null;
    const target = gets && gets.tie > 0 ? p : -1;
    if (gets?.servesCommunities) world.nationServes[p * F + FAITH_IDS.indexOf(h.faith)] = 1;
    const old = st.favoured[h.id] ?? -1;
    for (let r = 0; r < world.nationCount; r++) {
      if (old >= 0 && old !== target) dip.removeEntries(d, world.nationIds[r]!, world.nationIds[old]!, key);
      if (target < 0 || r === target) continue;
      const should = !world.nationGone[r] && faithOf(world, r) === h.faith;
      const has = (d.ledgers[dip.key(world.nationIds[r]!, world.nationIds[target]!)] ?? []).some((e) => e.key === key);
      if (should && !has) dip.addEntry(d, world.nationIds[r]!, world.nationIds[target]!, { key, name: H.favourName(h), weight: gets!.tie });
      else if (!should && has) dip.removeEntries(d, world.nationIds[r]!, world.nationIds[target]!, key);
    }
    st.favoured[h.id] = target;
  }
}

// ---------------------------------------------------------------- the conclave

/** The ruler of the Papal States died: a conclave sits for a month, unless Rome is held by another realm (RELG-142, RELG-143). */
export function rulerDied(world: World, n: number, news: News[]): void {
  const pope = H.headById("pope");
  if (!pope || world.nationIds[n] !== pope.seatRealm || seatOwner(world, pope) !== n) return;
  world.faithHeads.conclave = { monthsLeft: FH.conclave.months, gold: {}, opened: monthNow(world) };
  setPatron(world, pope, -1);
  aiConclaveGold(world);
  news.push({ kind: "event", text: `The Pope is dead. A conclave sits for ${FH.conclave.months} month${FH.conclave.months === 1 ? "" : "s"}: open your Peoples tab to send gold.`, nations: realmsOf(world, "catholic") });
}

/** The conclave's rows: every Catholic realm with a cardinal or gold, most votes first. */
export function conclaveEntries(world: World): (relg.heads.ConclaveEntry & { n: number })[] {
  const c = world.faithHeads.conclave;
  const out: (relg.heads.ConclaveEntry & { n: number })[] = [];
  const papal = world.nationIndex.get(H.headById("pope")?.seatRealm ?? "");
  for (const n of realmsOf(world, "catholic")) {
    if (n === papal) continue;
    const gold = c?.gold[n] ?? 0;
    const k = cardinals(world, n);
    if (k > 0 || gold > 0) out.push({ realm: world.nationIds[n]!, n, cardinals: k, gold });
  }
  return out;
}

function closeConclave(world: World, news: News[]): void {
  const pope = H.headById("pope")!;
  const result = H.conclaveResult(conclaveEntries(world));
  world.faithHeads.conclave = null;
  const p = result.patron ? world.nationIndex.get(result.patron)! : -1;
  setPatron(world, pope, p);
  news.push({ kind: "event", text: p >= 0 ? `The conclave has chosen a Pope: ${name(world, p)} is his patron, with ${result.votes[result.patron!]} votes to Rome's ${result.votes.rome}.` : `The conclave has chosen an Italian Pope: Rome's ${result.votes.rome} votes held, and he has no patron.`, nations: realmsOf(world, "catholic") });
}

/** Why realm n can't send gold to the conclave now, or null (SendConclaveGold). */
export function whyNotConclaveGold(world: World, n: number, gold: number): string | null {
  const c = world.faithHeads.conclave;
  if (!c) return "No conclave sits";
  if (faithOf(world, n) !== "catholic") return "Only a Catholic realm sends gold to the conclave";
  const step = FH.conclave.gold_per_vote;
  if (!Number.isInteger(gold / step) || gold === 0) return `Gold goes in steps of ${step}`;
  const sent = (c.gold[n] ?? 0) + gold;
  if (sent < 0) return "You have sent no gold to take back";
  if (gold > 0 && Math.floor(sent / step) > cardinals(world, n) * FH.conclave.gold_votes_max_share_of_cardinals) return "No more gold votes than you have cardinals";
  if (gold > 0 && world.nationTreasury[n]! < treasuryGold(world, gold)) return "Not enough gold";
  return null;
}

/** Sends (or, with a negative amount, takes back before the count) gold to the conclave, in steps of 100. */
export function sendConclaveGold(world: World, n: number, gold: number): string | null {
  const why = whyNotConclaveGold(world, n, gold);
  if (why) return why;
  const c = world.faithHeads.conclave!;
  c.gold[n] = (c.gold[n] ?? 0) + gold;
  world.nationTreasury[n] = world.nationTreasury[n]! - treasuryGold(world, gold);
  return null;
}

/** The AI sends gold when it is Catholic and at peace and that gold could win it and it can spare it (RELG-156). */
function aiConclaveGold(world: World): void {
  const entries = conclaveEntries(world);
  for (const e of entries) {
    if (isHuman(world, e.n) || dip.warOf(world.diplomacy, e.realm)) continue;
    const need = H.goldToWin(conclaveEntries(world), e.realm);
    if (need === null || need === 0) continue;
    const spare = world.nationTreasury[e.n]! - world.nationMonthlyIncome[e.n]! * FH.conclave.ai_spare_months_of_income;
    if (treasuryGold(world, need) <= spare) sendConclaveGold(world, e.n, need);
  }
}

// ---------------------------------------------------------------- wars: censure and the patron's call

/** Wars declared since last looked at: the head censures a war for gain on a fellow believer, and the patron is called to defend a holy place (RELG-147, RELG-149). */
export function faithHeadsWars(world: World, news: News[]): void {
  const st = world.faithHeads;
  const d = world.diplomacy;
  const seen = new Set(st.seenWars);
  for (const war of d.wars) {
    if (seen.has(war.id)) continue;
    const a = world.nationIndex.get(war.declarer);
    const b = world.nationIndex.get(war.target);
    if (a === undefined || b === undefined) continue;
    const head = censureOf(world, a, b, war.aim);
    if (head) censure(world, a, b, war, head, news);
    patronCall(world, a, b, war);
  }
  st.seenWars = d.wars.map((w) => w.id);
}

/** The head who would censure a war of a on b with this aim, or null (RELG-149). */
export function censureOf(world: World, a: number, b: number, aim: string): relg.heads.Head | null {
  const h = H.censuringHead({ attackerFaith: faithOf(world, a), targetFaith: faithOf(world, b), aim, attackerOwnPatriarch: world.faithHeads.ownPatriarch.includes(a) });
  return h && liveHeads(world).includes(h) ? h : null;
}

/** What a censure would cost a before he declares (RELG-137): the head, the wrong, how many realms hold it and the Punish aim, and the lords who waver. */
export function censurePreview(world: World, a: number, b: number, aim = "no_aim"): { head: string; wrong: string; weight: number; realms: number; lords: number; fadeYears: number } | null {
  const h = censureOf(world, a, b, aim);
  if (!h) return null;
  return { head: h.name, wrong: H.censureName(h), weight: FH.censure.weight, realms: realmsOf(world, h.faith, a).length, lords: world.lords.filter((l) => l.nation === a && !l.gone).length, fadeYears: FH.censure.fade_years };
}

function censure(world: World, a: number, b: number, war: dip.War, h: relg.heads.Head, news: News[]): void {
  const d = world.diplomacy;
  const wrong = H.censureName(h);
  const taken: number[] = [];
  for (let p = 0; p < world.provinceCount; p++) if (world.provinceOwner[p] === b) taken.push(p);
  world.faithHeads.censures.push({ nation: a, head: h.id, war: war.id, target: b, taken, start: monthNow(world) });
  // Held while the war lasts, fading after the peace (RELG-150).
  for (const r of realmsOf(world, h.faith, a)) {
    dip.addEntry(d, world.nationIds[r]!, world.nationIds[a]!, { key: `censured_${h.id}`, name: wrong, weight: FH.censure.weight });
    d.aims.push({ holder: world.nationIds[r]!, target: world.nationIds[a]!, aim: "punish", source: wrong });
  }
  world.lords.forEach((l, k) => l.nation === a && !l.gone && loyaltyStep(world, k, FH.censure.lord_cause, news));
  news.push({ kind: "event", text: `${cap(h.name)} censures ${name(world, a)} for its war on ${name(world, b)}: every ${relgName(h.faith)} realm holds ${wrong} and may punish it.`, nations: [a, b, ...realmsOf(world, h.faith)] });
}

const relgName = (f: string) => f.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

/** A censure whose war has ended fades: at once when the peace gave back every province taken in it, else over the fade years (RELG-150, RELG-151). */
function censureUpkeep(world: World, news: News[]): void {
  const d = world.diplomacy;
  const st = world.faithHeads;
  const now = monthNow(world);
  for (const c of st.censures) {
    if (c.ended || d.wars.some((w) => w.id === c.war)) continue;
    c.ended = now;
    const kept = c.taken.filter((p) => world.provinceOwner[p] === c.nation).length;
    c.until = H.censureEndsAtPeace(kept) ? now : addYears(now, FH.censure.fade_years);
    const h = H.headById(c.head)!;
    const wrong = H.censureName(h);
    for (const [k, list] of Object.entries(d.ledgers)) {
      if (!k.endsWith(`>${world.nationIds[c.nation]}`)) continue;
      for (const e of list) if (e.key === `censured_${h.id}` && e.fadeYears === undefined) Object.assign(e, { fadeYears: FH.censure.fade_years, created: now, base: e.weight });
    }
    const mine = (aim: dip.WarAim) => aim.target === world.nationIds[c.nation] && aim.aim === "punish" && aim.source === wrong && !aim.until;
    if (kept === 0) d.aims = d.aims.filter((aim) => !mine(aim));
    else for (const aim of d.aims) if (mine(aim)) aim.until = c.until;
    if (isHuman(world, c.nation)) news.push({ kind: "event", text: kept === 0 ? `${cap(h.name)} lifts his censure: you gave back all you took.` : `${cap(h.name)}'s censure lasts until ${c.until}, while its wrong fades.`, nations: [c.nation] });
  }
  st.censures = st.censures.filter((c) => !c.until || now < c.until);
}

/** A realm of another faith attacks a holder of one of the faith's holy places: its patron is called to defend it; refusing breaks an oath (RELG-147). */
function patronCall(world: World, a: number, b: number, war: dip.War): void {
  const d = world.diplomacy;
  const faith = faithOf(world, b);
  const h = liveHeads(world).find((x) => x.faith === faith);
  if (!h || faithOf(world, a) === faith) return;
  const p = patronOf(world, h.id);
  if (p < 0 || p === a || p === b || faithOf(world, p) !== faith) return;
  if (!holdsHolyPlace(world, b, faith)) return;
  const pid = world.nationIds[p]!;
  if (war.attackers.includes(pid) || war.defenders.includes(pid) || d.calls.some((c) => c.war === war.id && c.called === pid)) return;
  d.seq++;
  const issued = dip.monthOf(d.date);
  d.calls.push({ id: `call${d.seq}`, caller: war.target, called: pid, against: war.declarer, kind: "defensive", via: "pledge", war: war.id, issued, answerOn: dip.addMonths(issued, 1) });
}

/** Does realm n hold a holy place of this faith. */
export function holdsHolyPlace(world: World, n: number, faith: string): boolean {
  const map = FH.holy_place_provinces as Record<string, string>;
  return relg.holyPlaces([], world.date.year).some((hp) => hp.faiths.includes(faith) && world.provinceOwner[world.provinceIndex.get(map[hp.id] ?? "") ?? -1] === n);
}

// ---------------------------------------------------------------- decisions

/** Why realm n can't claim the caliphate now, or null (RELG-141). */
export function whyNotClaimCaliphate(world: World, n: number): string | null {
  const h = H.headById("caliph")!;
  const c = caliph(world);
  return H.whyNotClaimCaliphate({ faith: faithOf(world, n), holdsSeat: seatHolder(world, h) === n, caliph: c >= 0 ? world.nationIds[c]! : null, self: world.nationIds[n]! });
}

export function claimCaliphate(world: World, n: number, news: News[]): string | null {
  const why = whyNotClaimCaliphate(world, n);
  if (why) return why;
  const h = H.headById("caliph")!;
  setPatron(world, h, n);
  world.faithHeads.caliphHeld = seatHolder(world, h);
  syncFavour(world);
  news.push({ kind: "event", text: `${name(world, n)} claims the caliphate: its ruler is the Caliph.`, nations: [n, ...realmsOf(world, "sunni")] });
  return null;
}

/** Why realm n can't raise its own patriarch now, or null (RELG-152). */
export function whyNotOwnPatriarch(world: World, n: number): string | null {
  const h = H.headById("ecumenical_patriarch")!;
  const owner = seatOwner(world, h);
  const capital = world.provinceIndex.get(world.rules.nations[n]!.capital);
  const orth = FAITH_IDS.indexOf("orthodox");
  let house = false;
  if (capital !== undefined && world.provinceOwner[capital] === n) for (let s = 0; s < SLOTS; s++) if (world.provinceHouses[capital * SLOTS + s] === orth) house = true;
  return H.whyNotOwnPatriarch({ faith: faithOf(world, n), raised: world.faithHeads.ownPatriarch.includes(n), capitalHouse: house, constantinopleFaith: owner >= 0 ? faithOf(world, owner) : null, gold: world.nationTreasury[n]!, cost: treasuryGold(world, FH.own_patriarch.gold) });
}

export function raiseOwnPatriarch(world: World, n: number, news: News[]): string | null {
  const why = whyNotOwnPatriarch(world, n);
  if (why) return why;
  world.nationTreasury[n] = world.nationTreasury[n]! - treasuryGold(world, FH.own_patriarch.gold);
  world.faithHeads.ownPatriarch.push(n);
  news.push({ kind: "event", text: `${name(world, n)} raises its own patriarch: its crown now heads its church.`, nations: [n, ...realmsOf(world, "orthodox")] });
  return null;
}

/** The AI claims the caliphate and raises its own patriarch whenever offered (RELG-156). */
function aiFaithHeads(world: World, news: News[]): void {
  for (let n = 0; n < world.nationCount; n++) {
    if (isHuman(world, n) || world.nationGone[n]) continue;
    const f = faithOf(world, n);
    if (f === "sunni" && !whyNotClaimCaliphate(world, n)) claimCaliphate(world, n, news);
    if (f === "orthodox" && !whyNotOwnPatriarch(world, n)) raiseOwnPatriarch(world, n, news);
  }
}

/** The event tree's chooser of `altan_khan_and_the_dalai_lama` becomes the Dalai Lama's first patron (RELG-154). */
export function headEventChosen(world: World, event: string, chooser: number, news: News[]): void {
  const h = H.heads().find((x) => x.createdByEvent === event);
  if (!h || chooser < 0) return;
  if (world.faithHeads.created.includes(h.id)) setPatron(world, h, chooser);
  else createHead(world, h, chooser, news);
  syncFavour(world);
}

/** The event tree's condition `faith_head_patron`: is this realm the patron of this head. */
export function isHeadPatron(world: World, head: string, n: number): boolean {
  return n >= 0 && patronOf(world, head) === n;
}

/** The event tree's effect `faith_head_patron`: set a head's patron. */
export function setHeadPatron(world: World, head: string, n: number): void {
  const h = H.headById(head);
  if (!h) return;
  if (h.from !== undefined && !world.faithHeads.created.includes(h.id)) world.faithHeads.created.push(h.id);
  setPatron(world, h, n);
  syncFavour(world);
}

// ---------------------------------------------------------------- what the screens show

export interface HeadCard {
  faith: string;
  /** How the faith is led. */
  leadership: "head" | "crown" | "none";
  /** One line for a crown-headed church or a faith with no head. */
  line: string;
  head?: string;
  title?: string;
  way?: relg.heads.HeadWay;
  seat?: string;
  seatProvince?: number;
  holder?: number;
  patron?: number;
  gets: string[];
  owes: string[];
  /** The one action open now, or the reason it is not. */
  action?: { kind: "conclave" | "caliphate" | "patriarch"; label: string; why: string | null };
  conclave?: { monthsLeft: number; rome: number; rows: { n: number; cardinals: number; gold: number; goldVotes: number; votes: number }[]; mine: { cardinals: number; gold: number; step: number; stepGold: number; canMore: string | null; canLess: string | null } | null };
}

/** The Head of the faith card for a faith, as realm n sees it (RELG-135, RELG-136). */
export function headCard(world: World, faith: string, n: number): HeadCard {
  const own = n >= 0 && world.faithHeads.ownPatriarch.includes(n) && faithOf(world, n) === faith;
  const lead = H.leadership(faith, own);
  const fname = relgName(faith);
  if (lead === "crown") return { faith, leadership: "crown", line: own ? "Your church has its own patriarch: your crown heads it, and no head above you can censure you." : `The crown heads each ${fname} church: no head above it can censure it, and none gives a patron's tie.`, gets: [], owes: [] };
  const h = H.headOf(faith);
  if (!h || !liveHeads(world).includes(h)) {
    const reason = h ? `${cap(h.name)} comes in ${h.from}` : H.noHeadReason(faith);
    return { faith, leadership: "none", line: `${fname} has no single head: ${reason}.`, gets: [], owes: [] };
  }
  const patron = patronOf(world, h.id);
  const seatNames = (FH.seat_provinces as Record<string, string[]>)[h.seat] ?? [];
  const seatName = relg.holyPlaces([], world.date.year).find((x) => x.id === h.seat)?.name ?? h.seat;
  const card: HeadCard = {
    faith,
    leadership: "head",
    line: "",
    head: h.id,
    title: cap(h.name),
    way: h.way,
    seat: seatName,
    seatProvince: seatNames.length ? (world.provinceIndex.get(seatNames[0]!) ?? -1) : -1,
    holder: seatOwner(world, h),
    patron,
    gets: [`${H.favourName(h)}: +${FH.patron.tie} with every ${fname} realm`, `${FH.patron.preachers} more ${fname} preacher`, "No rival patron while he is"],
    owes: ["A call to arms when another faith attacks a holder of its holy places; refusing breaks an oath", `${FH.betrayed.name} (${FH.betrayed.weight}) if he changes faith`, ...(h.way === "chosen" ? ["Gold to the conclave to win it"] : h.way === "claimed" ? ["Holding Mecca and Medina, which every Sunni ruler wants"] : [])],
  };
  if (h.way === "chosen") {
    const c = world.faithHeads.conclave;
    card.action = { kind: "conclave", label: "Send gold to the conclave", why: n >= 0 ? whyNotConclaveGold(world, n, FH.conclave.gold_per_vote) : "Not your faith" };
    if (c) {
      const entries = conclaveEntries(world);
      const res = H.conclaveResult(entries);
      const rows = entries.map((e) => ({ n: e.n, cardinals: e.cardinals, gold: e.gold, goldVotes: H.goldVotes(e.cardinals, e.gold), votes: res.votes[e.realm]! })).sort((x, y) => y.votes - x.votes);
      const top = rows.slice(0, 3);
      const me = rows.find((r) => r.n === n);
      if (me && !top.includes(me)) top.push(me);
      const step = FH.conclave.gold_per_vote;
      card.conclave = {
        monthsLeft: c.monthsLeft,
        rome: res.votes.rome!,
        rows: top,
        mine: n >= 0 && faithOf(world, n) === "catholic" ? { cardinals: cardinals(world, n), gold: c.gold[n] ?? 0, step, stepGold: treasuryGold(world, step), canMore: whyNotConclaveGold(world, n, step), canLess: whyNotConclaveGold(world, n, -step) } : null,
      };
    }
  } else if (h.way === "claimed") card.action = { kind: "caliphate", label: "Claim the caliphate", why: n >= 0 ? whyNotClaimCaliphate(world, n) : "Not your faith" };
  else if (faith === "orthodox") card.action = { kind: "patriarch", label: `Raise our own patriarch (${Math.round(treasuryGold(world, FH.own_patriarch.gold))} gold)`, why: n >= 0 ? whyNotOwnPatriarch(world, n) : "Not your faith" };
  if (faithOf(world, n) !== faith && card.action) card.action.why = "Not your faith";
  return card;
}

/** The badge on a realm's Faith line (RELG-138): Censured outranks the rest. */
export function faithBadge(world: World, n: number): { text: string; warn: boolean } | null {
  const c = censuresOf(world, n)[0];
  if (c) return { text: "Censured", warn: true };
  if (caliph(world) === n) return { text: "Caliph", warn: false };
  const h = liveHeads(world).find((x) => x.way !== "claimed" && patronOf(world, x.id) === n);
  if (h) return { text: `Patron of ${h.name}`, warn: false };
  if (headsItsChurch(world, n)) return { text: "Heads its church", warn: false };
  return null;
}

export interface FaithHeadsView {
  /** Each head that exists: its seat province for the map's seat icon. */
  seats: { head: string; faith: string; name: string; seat: string; province: number; patron: number }[];
  /** Badge of each realm's Faith line, by nation index. */
  badges: ({ text: string; warn: boolean } | null)[];
  /** The player's state faith's card. */
  card: HeadCard | null;
  /** Every live head's card as the player sees it, read-only for other faiths (the Faiths map mode's seats). */
  cards: Record<string, HeadCard>;
  /** What declaring war on each realm would cost the player in censure (RELG-137), by nation index. */
  censure: Record<number, NonNullable<ReturnType<typeof censurePreview>>>;
}

export function faithHeadsView(world: World, player: number): FaithHeadsView {
  const heads = liveHeads(world);
  const censure: FaithHeadsView["censure"] = {};
  if (player >= 0) for (let b = 0; b < world.nationCount; b++) {
    if (b === player || world.nationGone[b] || faithOf(world, b) !== faithOf(world, player)) continue;
    // Only a war on a fellow believer is censured (RELG-149). Priced with the aim the declare sheet will declare with (WAR-229).
    const c = censurePreview(world, player, b, declaringAim(world, player, b).aim);
    if (c) censure[b] = c;
  }
  return {
    seats: heads.map((h) => ({ head: h.id, faith: h.faith, name: cap(h.name), seat: relg.holyPlaces([], world.date.year).find((x) => x.id === h.seat)?.name ?? h.seat, province: seatProvince(world, h), patron: patronOf(world, h.id) })),
    badges: world.nationIds.map((_, n) => faithBadge(world, n)),
    card: player >= 0 && faithOf(world, player) ? headCard(world, faithOf(world, player), player) : null,
    cards: Object.fromEntries(heads.map((h) => [h.id, headCard(world, h.faith, player)])),
    censure,
  };
}

// ---------------------------------------------------------------- saves

export type SavedFaithHeads = Omit<FaithHeadsState, "patron" | "seatOwner" | "seatHolder" | "favoured" | "caliphHeld" | "conclave" | "censures" | "ownPatriarch"> & {
  patron: Record<string, string | null>;
  seatOwner: Record<string, string | null>;
  seatHolder: Record<string, string | null>;
  favoured: Record<string, string | null>;
  caliphHeld: string | null;
  conclave: { monthsLeft: number; gold: Record<string, number>; opened: string } | null;
  censures: (Omit<Censure, "nation" | "target" | "taken"> & { nation: string; target: string; taken: string[] })[];
  ownPatriarch: string[];
};

/** The heads' state for a save, by realm and province id (RELG-155). */
export function saveFaithHeads(world: World): SavedFaithHeads {
  const st = world.faithHeads;
  const id = (n: number) => (n >= 0 ? world.nationIds[n]! : null);
  const ids = (r: Record<string, number>) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, id(v)]));
  return {
    patron: ids(st.patron),
    patronFaith: { ...st.patronFaith },
    seatOwner: ids(st.seatOwner),
    seatHolder: ids(st.seatHolder),
    favoured: ids(st.favoured),
    created: [...st.created],
    caliphHeld: id(st.caliphHeld),
    conclave: st.conclave ? { monthsLeft: st.conclave.monthsLeft, opened: st.conclave.opened, gold: Object.fromEntries(Object.entries(st.conclave.gold).map(([n, g]) => [world.nationIds[Number(n)]!, g])) } : null,
    censures: st.censures.map((c) => ({ ...c, nation: world.nationIds[c.nation]!, target: world.nationIds[c.target]!, taken: c.taken.map((p) => world.provinceIds[p]!) })),
    ownPatriarch: st.ownPatriarch.map((n) => world.nationIds[n]!),
    seenWars: [...st.seenWars],
  };
}

/** Restores the heads; a save from before them keeps the 1444 heads, with today's wars counted as seen. */
export function restoreFaithHeads(world: World, s: SavedFaithHeads | undefined): void {
  const st = world.faithHeads;
  if (!s) {
    Object.assign(st, createFaithHeadsState(world.nationCount).faithHeads);
    seedFaithHeads(world);
    return;
  }
  const n = (id: string | null) => (id === null ? -1 : (world.nationIndex.get(id) ?? -1));
  const ns = (r: Record<string, string | null>) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, n(v)]));
  st.patron = ns(s.patron);
  st.patronFaith = { ...s.patronFaith };
  st.seatOwner = ns(s.seatOwner);
  st.seatHolder = ns(s.seatHolder);
  st.favoured = ns(s.favoured);
  st.created = [...s.created];
  st.caliphHeld = n(s.caliphHeld);
  st.conclave = s.conclave ? { monthsLeft: s.conclave.monthsLeft, opened: s.conclave.opened, gold: Object.fromEntries(Object.entries(s.conclave.gold).flatMap(([k, g]) => (n(k) >= 0 ? [[n(k), g]] : []))) } : null;
  st.censures = s.censures.flatMap((c) => (n(c.nation) >= 0 && n(c.target) >= 0 ? [{ ...c, nation: n(c.nation), target: n(c.target), taken: c.taken.map((p) => world.provinceIndex.get(p) ?? -1).filter((p) => p >= 0) }] : []));
  st.ownPatriarch = s.ownPatriarch.map(n).filter((x) => x >= 0);
  st.seenWars = [...s.seenWars];
  syncFavour(world);
}
