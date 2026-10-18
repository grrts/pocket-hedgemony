import type { NameAbroadView, PeaceVoices, PriceOfWar, PriceOfWarCall, Snapshot, Titles } from "@ph/engine";
import { icon } from "../art/ui.ts";

/**
 * The price of war as the player sees it (X-21, X-19): the declare sheet's
 * Price of war block (WAR-229, WAR-232), the war card on the Diplomacy tab
 * (WAR-230), the peace-voices bar on the top bar's war plaque (WAR-231), and
 * the Your name abroad card (DIPL-225, DIPL-226). Pure HTML builders; main.ts
 * wires the taps.
 *
 * Every line is a 44-point row that opens its reason on a tap (a <details>),
 * never on hover; a line that hurts is red and carries a "!" mark, so colour is
 * never the only sign; every bar carries its number as text.
 */

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const fmt = (n: number) => Math.round(n).toLocaleString("en-GB");
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/** "1460-03" or "1460-03-01" → "March 1460". */
export const monthText = (iso: string) => {
  const [y, m] = iso.split("-").map(Number);
  return `${m ? MONTHS[m - 1] + " " : ""}${y}`;
};
const plural = (n: number, one: string, many = `${one}s`) => `${fmt(n)} ${n === 1 ? one : many}`;
const pct = (share: number) => Math.round(Math.max(0, Math.min(1, share)) * 100);

/** A war aim as the player reads it (the diplomacy spec's war-aim table). */
export const aimName = (aim: string): string =>
  ({
    take_land: "Take land",
    seat_pretender: "Seat a pretender",
    tribute: "Tribute",
    free_people: "Free a people",
    break_subject: "Break a subject",
    defend_faith: "Defend the faith",
    punish: "Punish",
    raid: "Raid",
    no_aim: "No aim",
    defensive: "Defence",
  })[aim] ?? aim.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

/** The red "!" a line that hurts carries beside its colour. */
const HURT = `<span class="hurt-mark" aria-label="Costs you">!</span>`;

/**
 * One row of a price or a war card: a 44-point summary that opens its reason
 * on a tap. `hurt` marks it red with the "!".
 */
export function reasonRow(what: string, value: string, reason: string, hurt = false, extra = ""): string {
  return `<details class="pow-line${hurt ? " hurt" : ""}"><summary>${hurt ? HURT : `<span class="calm-mark" aria-hidden="true"></span>`}<span class="what">${what}</span><span class="value">${value}</span></summary>${extra}<p class="hint">${reason}</p></details>`;
}

/** How a realm comes into the war, as a word, and why. */
const VIA: Record<PriceOfWarCall["via"], { word: string; why: (them: string) => string }> = {
  alliance: { word: "ally", why: (t) => `Allied to ${t}: an ally answers a call to arms against whoever declares on it.` },
  pledge: { word: "pledge", why: (t) => `Pledged to protect ${t}: a protector is called when the realm it shields is attacked.` },
  league: { word: "league", why: () => "In a league against you: every member is called into any war you declare, whoever you declare on." },
  subject: { word: "subject", why: (t) => `A subject of ${t} that fights at its overlord's call.` },
};

/** Gold to one decimal. */
const gold = (g: number) => (Math.abs(g) >= 100 ? fmt(g) : g.toFixed(1));

export interface DeclareSheetInput {
  /** The realm declared on. */
  target: number;
  /** The engine's Price of war for it (WAR-229); null when the engine prices no war on it (nothing to show but the terms). */
  price: PriceOfWar | null;
  name: (n: number) => string;
  /** What the player's realm calls its lords (REALM-242): "lords", "boyars", "beys". */
  titles: Titles;
  /** The player's gold a month, to mark war pay that outruns it. */
  income: number;
  /** The player's name abroad, for the link to its card (DIPL-225). */
  nameAbroad: NameAbroadView | null;
  /** The player's realm, for the link. */
  me: number;
  /** The faith head's censure warning, already built (faithHeads.ts), shown above Confirm; "" for none. */
  censure: string;
}

/** The Price of war block (WAR-229): each line a row that opens its reason, hurting lines red. */
export function priceOfWarHtml(p: PriceOfWar, o: Pick<DeclareSheetInput, "name" | "titles" | "income">): string {
  const them = esc(o.name(p.target));
  const rows: string[] = [];
  // Who will be called against you, each with soldiers and how.
  if (p.against.length) {
    for (const c of p.against) {
      rows.push(reasonRow(`Against you: ${esc(o.name(c.nation))}`, `${VIA[c.via].word} · ${fmt(c.soldiers)} soldiers`, VIA[c.via].why(them), true));
    }
  } else rows.push(reasonRow("Against you", `only ${them}`, `No ally, protector, league or subject of ${them} is called into the war.`));
  for (const c of p.friends) rows.push(reasonRow(`With you: ${esc(o.name(c.nation))}`, `ally · ${fmt(c.soldiers)} soldiers`, "Your ally is called to your side and is likely to answer: it is at peace and at least half as strong as the realm you declare on."));
  const behind = p.theirSide > p.ourSide;
  rows.push(
    reasonRow(
      "Your side and theirs",
      `${fmt(p.ourSide)} to ${fmt(p.theirSide)} soldiers`,
      "Men under arms and levies at home: you with the allies who will answer, they with everyone called against you and every member of a league against you.",
      behind,
    ),
  );
  if (p.noAim && p.threatened.length) {
    const names = p.threatened.map((n) => esc(o.name(n)));
    rows.push(
      reasonRow(
        "Neighbours alarmed",
        `${plural(p.threatened.length, "realm")} will hold <em>Threatened us</em>`,
        `A war with no aim alarms everyone near you. These realms will hold the wrong <em>Threatened us</em> toward you: ${names.join(", ")}.`,
        true,
      ),
    );
  }
  if (p.noAim && p.waveringLords > 0) {
    const word = p.waveringLords === 1 ? o.titles.lord : o.titles.lords;
    rows.push(reasonRow(`Your ${esc(o.titles.lords)}`, `${fmt(p.waveringLords)} ${esc(word)} will waver`, `You hold no fitting aim against ${them}: when you take land in this war, every one of your ${esc(o.titles.lords)} who isn't Warlike drops a step of loyalty.`, true));
  }
  if (p.truce) {
    rows.push(
      reasonRow(
        "A truce broken",
        p.truce.until ? `holds until ${monthText(p.truce.until)}` : "a truce holds",
        `You swore peace with ${them}. Declaring breaks the truce: an oath broken, which every ${esc(o.titles.lord)} of yours takes badly (each wavers a step) and other realms remember.`,
        true,
      ),
    );
  }
  rows.push(
    reasonRow(
      "Pay at war",
      `${gold(p.monthlyPay)} gold a month`,
      `What your armies as they stand draw each month at war. Levies are paid from their first month at war, not after three free months as in peace.${p.monthlyPay > o.income ? " That is more than your realm takes in." : ""}`,
      p.monthlyPay > o.income,
    ),
  );
  rows.push(
    reasonRow(
      "One peace takes",
      `at most ${fmt(p.maxCeded)} of their ${plural(p.targetProvinces, "province")}`,
      "A single peace can take at most a third of a realm's provinces, rounded up, and its capital only with its last province. Swallowing a realm takes several wars.",
    ),
  );
  return `<section class="price-of-war"><h3 class="sub">Price of war</h3>${rows.join("")}</section>`;
}

/**
 * The declare sheet (WAR-229, WAR-232): the Price of war on the left and the
 * terms on the right in the Wide layout, one scrolling column in the Tall
 * one, and Confirm pinned at the foot inside the safe area. Confirm carries
 * `data-break-truce` when the war breaks a truce.
 */
export function declareSheetHtml(o: DeclareSheetInput): string {
  const p = o.price;
  const them = esc(o.name(o.target));
  const aim = p && !p.noAim ? "Your best aim" : "No aim";
  const terms = `<section class="declare-terms">
      <h3 class="sub">Terms</h3>
      ${reasonRow(
        "Aim",
        aim,
        p?.noAim ?? true
          ? `You hold no aim against ${them}. A war with no aim alarms your neighbours and costs your lords' loyalty when you take land; a war aim (from a demand they refused, land you held, a pretender) makes it a war they understand.`
          : "The best aim you hold against them: a war they understand.",
        p?.noAim ?? true,
      )}
      ${o.censure}
      ${o.nameAbroad ? `<button class="paper name-abroad-link" data-realm="${o.me}" data-realm-open="diplomacy">${icon("crown", 1)}Your name abroad: <b>${o.nameAbroad.word}</b></button>` : ""}
      <p class="hint">Calls to arms go out at once and are answered within a month. Peace is offered from ${them}'s Diplomacy tab.</p>
    </section>`;
  const price = p ? priceOfWarHtml(p, o) : `<section class="price-of-war"><h3 class="sub">Price of war</h3><p class="hint">Nothing is known of what this war would cost.</p></section>`;
  const truce = !!p?.truce;
  return `<div class="declare-sheet">
    <div class="declare-cols">${price}${terms}</div>
    <div class="declare-confirm">
      <button class="paper" data-declare-back>Back</button>
      <button class="wax" data-declare-confirm="${o.target}"${truce ? ` data-break-truce="1"` : ""}>${icon("swords", 1)}${truce ? "Break the truce and declare war" : `Declare war on ${them}`}</button>
    </div>
  </div>`;
}

/** The player's side of a war: their war leader's peace voices, and the enemy's. */
export function sidesOf(w: Snapshot["wars"][number], me: number): { ours: PeaceVoices; theirs: PeaceVoices; attacker: boolean } | null {
  if (!w.peace) return null;
  const attacker = w.attackers.includes(me);
  const v = w.peace.voices;
  return attacker ? { ours: v.attacker, theirs: v.defender, attacker } : { ours: v.defender, theirs: v.attacker, attacker };
}

/** Amber past a third, red past half (WAR-231). */
export const voiceLevel = (share: number) => (share > 0.5 ? "red" : share > 1 / 3 ? "amber" : "calm");

/** A peace-voices bar with its half mark and its number as text (WAR-230). */
function voicesBar(v: PeaceVoices, label: string): string {
  const n = pct(v.share);
  const state = v.refused ? "refused an obliged peace" : v.obliged ? "must take a fair peace" : "";
  return `<div class="voices-row">
    <span class="what">${label}</span>
    <span class="peace-bar ${voiceLevel(v.share)}" role="img" aria-label="${n} in 100 say peace"><i style="width:${n}%"></i><b class="half" aria-hidden="true"></b></span>
    <span class="value">${n} in 100${state ? ` · ${HURT}${state}` : ""}</span>
  </div>`;
}

export interface WarCardInput {
  name: (n: number) => string;
  /** Provinces of the enemy your side occupies, and of yours they occupy. */
  taken: number;
  lost: number;
  provinceName: (p: number) => string;
  titles: Titles;
  /** Years a war must last before lords tire of it (WAR-223, `warfare.peace.long_war_years`). */
  longWarYears?: number;
}

/**
 * The war card (WAR-230): the aim, both sides' peace voices as bars with the
 * half mark, months at war and the long-war mark, provinces occupied each way,
 * and the most one peace can take now.
 */
export function warCardHtml(w: Snapshot["wars"][number], me: number, o: WarCardInput): string {
  const attacker = w.attackers.includes(me);
  const ours = attacker ? w.attackers : w.defenders;
  const theirs = attacker ? w.defenders : w.attackers;
  const enemy = theirs[0]!;
  const names = (l: number[]) => l.map((n) => esc(o.name(n))).join(", ");
  const head = `<h4 class="war-title">${icon("swords", 1)}War with ${esc(o.name(enemy))} <small>since ${monthText(w.start)}</small></h4>`;
  const p = w.peace;
  if (!p) return `<section class="war-card framed-soft" data-war-card="${esc(w.id)}">${head}<p>With you: ${names(ours)}. Against you: ${names(theirs)}.</p></section>`;
  const sides = sidesOf(w, me)!;
  const longYears = o.longWarYears ?? 2;
  const aim = `${aimName(p.aim)}${p.aimProvince !== undefined ? `: ${esc(o.provinceName(p.aimProvince))}` : ""}`;
  // What one peace can take from the enemy leader now, and from yours.
  const fromThem = attacker ? p.cede.defender : p.cede.attacker;
  const fromUs = attacker ? p.cede.attacker : p.cede.defender;
  const mine = sides.ours.nation === me;
  const rows = [
    reasonRow("Aim", aim, attacker ? (p.aim === "no_aim" ? `You declared with no aim: your ${esc(o.titles.lords)} who aren't Warlike waver when you take land.` : "The aim you declared with: land it names counts as a fitting aim.") : "The aim they declared on you with.", attacker && p.aim === "no_aim"),
    `<details class="pow-line voices${sides.ours.share > 1 / 3 ? " hurt" : ""}"><summary>${sides.ours.share > 1 / 3 ? HURT : `<span class="calm-mark" aria-hidden="true"></span>`}<span class="what">Peace voices</span><span class="value">${pct(sides.ours.share)} to ${pct(sides.theirs.share)} in 100</span></summary>
      ${voicesBar(sides.ours, mine ? "Yours" : esc(o.name(sides.ours.nation)))}
      ${voicesBar(sides.theirs, esc(o.name(sides.theirs.nation)))}
      <p class="hint">Each war leader's ${esc(o.titles.lords)}, royal provinces and capital each have a voice. Yours: ${fmt(sides.ours.peace)} say peace, ${fmt(sides.ours.war)} war, ${fmt(sides.ours.none)} nothing; the fallen and a Warlike ruler weigh in. Past half, the ruler must take a peace that asks only for occupied land and gold; refusing costs a step of every ${esc(o.titles.lord)}'s loyalty each season and levies desert twice as fast.</p>
    </details>`,
    reasonRow("At war", `${plural(p.months, "month")}${p.longWar ? ` · ${HURT}a long war` : ""}`, p.longWar ? `Past ${longYears} years your ${esc(o.titles.lords)} who aren't Warlike, and whose Want the aim doesn't name, all say peace.` : `After ${longYears} years it becomes a long war: ${esc(o.titles.lords)} who aren't Warlike tire of it and say peace.`, p.longWar),
    reasonRow("Occupied", `you hold ${fmt(o.taken)} of theirs · they hold ${fmt(o.lost)} of yours`, "Occupied provinces pay their occupier half their tax and no trade, and a peace may take them.", o.lost > o.taken),
    reasonRow("One peace takes now", `${fmt(Math.min(fromThem.now, fromThem.max))} of theirs (most ${fmt(fromThem.max)} of ${fmt(fromThem.of)}) · ${fmt(Math.min(fromUs.now, fromUs.max))} of yours`, "A peace can take only provinces the taker occupies, and at most a third of the loser's provinces, rounded up; the capital only with the last one.", fromUs.now > 0),
  ];
  return `<section class="war-card framed-soft" data-war-card="${esc(w.id)}">${head}
    <p class="sides"><small>${ours.length > 1 ? `With you: ${names(ours.filter((n) => n !== me))} · ` : ""}Against you: ${names(theirs)}</small></p>
    ${rows.join("")}
  </section>`;
}

/** The war plaque's bars (WAR-231): each war's peace voices for your side, amber past a third, red past half, with the number. */
export function warPlaqueBars(wars: Snapshot["wars"], me: number): string {
  return wars
    .map((w) => sidesOf(w, me))
    .filter((x): x is NonNullable<typeof x> => !!x)
    .map((x) => {
      const n = pct(x.ours.share);
      return `<span class="plaque-voices ${voiceLevel(x.ours.share)}" role="img" aria-label="${n} in 100 of your voices say peace"><span class="peace-bar small"><i style="width:${n}%"></i><b class="half" aria-hidden="true"></b></span><small>${n}</small></span>`;
    })
    .join("");
}

/**
 * The Your name abroad card (DIPL-225, DIPL-226): any league against you
 * first, then notoriety as a word and Lands taken as a bar against the
 * league threshold.
 */
export function nameAbroadHtml(v: NameAbroadView, name: (n: number) => string): string {
  const leagues = v.leagues.map((l) => {
    const soldiers = l.members.reduce((t, m) => t + m.soldiers, 0);
    const list = `<ul class="league-members">${l.members.map((m) => `<li><button class="realm-link" data-realm="${m.nation}" data-realm-open="diplomacy"><b>${esc(name(m.nation))}</b></button><span>${fmt(m.soldiers)} soldiers</span></li>`).join("")}</ul>`;
    return `<details class="pow-line hurt league" open><summary>${HURT}<span class="what">League against you</span><span class="value">${plural(l.members.length, "realm")} · ${fmt(soldiers)} soldiers</span></summary>${list}<p class="hint">Neighbours of the land you took joined against you. Every member is called into any war you declare, on whoever you declare it.</p></details>`;
  });
  const fill = v.threshold > 0 ? Math.min(100, (v.landsTaken / v.threshold) * 100) : 0;
  const over = v.landsTaken >= v.threshold;
  const landsBar = `<span class="lands-bar${over ? " red" : v.landsTaken * 4 >= v.threshold * 3 ? " amber" : ""}" role="img" aria-label="${v.landsTaken} of ${v.threshold}"><i style="width:${fill.toFixed(0)}%"></i></span>`;
  const lands = `<details class="pow-line lands${over ? " hurt" : ""}"><summary>${over ? HURT : `<span class="calm-mark" aria-hidden="true"></span>`}<span class="what">Lands taken (20 years)</span>${landsBar}<span class="value">${over ? `${v.landsTaken} of ${v.threshold}: a league may form` : `${v.landsTaken} of ${v.threshold} before a league`}</span></summary><p class="hint">Provinces you took in the last 20 years and still hold. At ${v.threshold} in this era, the realms that border you or the land you took may join a league against you each new year. Land fades from the count after 20 years.</p></details>`;
  const noto = reasonRow(
    "Notoriety",
    `<b>${v.word}</b> <small>(${Math.round(v.notoriety)})</small>`,
    "Trusted under 25, Watched from 25, Feared from 50, Hated from 75. Each land taken adds 5, and notorious deeds add more, fading over 30 years. Every court counts it: less willing to ally with you, marry into your house or pledge to you, more willing to join a league against you.",
    v.notoriety >= 50,
  );
  return `<section class="name-abroad framed-soft" id="name-abroad">
    <h3 class="sub">Your name abroad</h3>
    ${leagues.join("")}${noto}${lands}
  </section>`;
}
