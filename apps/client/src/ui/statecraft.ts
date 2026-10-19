import type { StatecraftView } from "@ph/engine";
import { icon } from "../art/ui.ts";

/**
 * Statecraft on the realm card's Diplomacy tab (milestone 5, DIPL-197 to
 * DIPL-208): for another realm, what it thinks of you and why, and the
 * envoys you can send it, each a 44-point button with what it does or why
 * not; for your own realm, your envoys abroad and the answers that came
 * back, each with the reasons the court counted behind a tap.
 */

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const monthText = (iso: string) => {
  const [y, m] = iso.split("-").map(Number);
  return `${m ? MONTHS[m - 1] + " " : ""}${y}`;
};
const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

/** The missions in the engine's ENVOY_ACTIONS order: the button and what it does. */
const MISSIONS: { action: string; label: string; does: (v: StatecraftView) => string }[] = [
  { action: "propose_alliance", label: "Propose an alliance", does: () => "Allies answer each other's calls to arms. They say yes only if their reasons add up above nothing." },
  { action: "arrange_marriage", label: "Arrange a marriage", does: () => "Married houses think better of each other (+15). When a ruler dies without a son the other house may gain a claim, and if their line dies out their crown passes to the house most married into it." },
  { action: "courtesy_visit", label: "Courtesy visit", does: () => "Always welcome: +15 standing with them, fading over 5 years." },
  { action: "send_gift", label: "Send a gift", does: (v) => `${v.giftGold} gold: +30 standing with them, fading over 10 years.` },
  { action: "offer_overlordship", label: "Offer overlordship", does: () => "If they say yes they become your tributary: 15 in 100 of their income each month, and you owe them defence. A small realm with threats around it is most willing." },
  { action: "ask_protection", label: "Ask for protection", does: () => "If they say yes you become their vassal: they defend you, you send them 10 in 100 of your taxes and answer their calls to arms." },
];

export const missionName = (action: string): string =>
  ({ propose_alliance: "propose an alliance", arrange_marriage: "arrange a marriage", courtesy_visit: "pay a courtesy visit", send_gift: "bring a gift", demand: "make a demand", offer_overlordship: "offer overlordship", ask_protection: "ask for protection" })[action] ?? action.replace(/_/g, " ");

/** One action as a tile of the Diplomacy tab's grid (DIPL-227): the 44-point button, and under it what it does or why not. */
const tile = (button: string, hint: string) => `<div class="mission">${button}<p class="hint">${hint}</p></div>`;
const why = (w: string) => `${esc(w.charAt(0).toUpperCase() + w.slice(1))}.`;

/** The reasons a court counted, as a tap-to-open list (DIPL-081, the Why? letter). */
function reasonsHtml(l: StatecraftView["letters"][number]): string {
  if (!l.reasons.length) return "";
  return `<details class="why"><summary>Why?</summary><dl class="facts">${l.reasons.map((r) => `<dt>${esc(r.name)}</dt><dd>${signed(r.number)}</dd>`).join("")}${l.total !== undefined ? `<dt><b>All told</b></dt><dd><b>${signed(l.total)}</b></dd>` : ""}</dl></details>`;
}

/** Another realm's statecraft: standing and its reasons, an envoy on the way, the last answer, and the missions to send. */
export function realmStatecraft(v: StatecraftView | null, r: number, allied: boolean, atWar: boolean, realmButton: (n: number) => string = () => ""): string {
  const realm = v?.realms[r];
  if (!v || !realm) return "";
  const envoy = v.envoys.find((e) => e.target === r);
  const letter = v.letters.find((l) => l.from === r);
  const standing = `<h3 class="sub">What they think of you</h3>
    <p><b>${esc(realm.word)}</b> (${signed(realm.standing)})${realm.married ? " · your houses are married" : ""}</p>
    ${crownsLine(v, r, realm.married)}
    ${realm.lines.length ? `<dl class="facts">${realm.lines.map((x) => `<dt>${esc(x.name)}</dt><dd>${signed(x.weight)}</dd>`).join("")}</dl>` : `<p class="hint">You have had no dealings with them yet.</p>`}
    ${fearHtml(realm.fears, v.me, realmButton)}`;
  const away = envoy
    ? `<p>${icon("scroll", 1)} Your envoy ${envoy.status === "road" ? `rides to ${missionName(envoy.action)}; he reaches their court in ${monthText(envoy.arrival)}` : envoy.status === "court" ? `is at their court to ${missionName(envoy.action)}` : "is on his way home"}.</p>`
    : "";
  const last = letter ? `<div class="call framed-soft"><p>${icon("scroll", 1)} ${esc(letter.text)} <small>(${monthText(letter.month)})</small></p>${reasonsHtml(letter)}</div>` : "";
  const missions = atWar
    ? `<p class="hint">No envoys go to a court you are at war with, except to make peace.</p>`
    : `<h3 class="sub">Send an envoy</h3>
    <p class="hint">${v.free} of your ${v.seats} envoy${v.seats === 1 ? "" : "s"} free. An envoy rides to their court, stays a month, and their answer reaches you a month after.</p>
    <div class="missions">${MISSIONS.map((m, k) => {
      const not = realm.why[k] ?? null;
      return not === null
        ? tile(`<button class="wax" data-envoy="${m.action}">${icon("scroll", 1)}${m.label}</button>`, esc(m.does(v)))
        : tile(`<button class="paper" disabled>${m.label}</button>`, why(not));
    }).join("")}${allied ? tile(`<button class="paper" data-break-alliance="${r}">End the alliance</button>`, "An oath broken: they will remember it (−40, fading over 20 years), and other courts trust you less.") : ""}</div>`;
  return `${standing}${away}${last}${missions}${atWar ? "" : courtSubjectHtml(v, r)}${atWar ? "" : demandsHtml(realm.demands)}`;
}

/** Whom a realm fears this month (DIPL-232): you first, as a line with its reason, then the neighbours it fears besides you. */
export function fearHtml(fears: StatecraftView["realms"][number]["fears"], me: number, realmButton: (n: number) => string): string {
  if (!fears?.length) return "";
  const word = (l: string) => (l === "threatened" ? "Threatened" : "Wary");
  const you = fears.find((f) => f.nation === me);
  const others = fears.filter((f) => f.nation !== me);
  const mine = you
    ? `<p class="fear ${you.level}">${icon("swords", 1)} <b>${word(you.level)} of you</b>: your strength is ${you.ratio.toFixed(1)} times their side's. They keep more men under arms against you${you.level === "threatened" ? " and borrow to pay them" : ""}.</p>`
    : "";
  const rest = others.length ? `<p class="fear">${icon("swords", 1)} They fear ${others.map((f) => `${realmButton(f.nation)} <small>(${word(f.level)})</small>`).join(", ")}.</p>` : "";
  return mine + rest;
}

const COURT_DOES = "Each season there is 1 in 4 that they find out: they will hold it against you (−25, fading over 10 years) and send him home.";

/** Court their loyalty, on another realm's subject (DIPL-215, DIPL-218, DIPL-220). */
function courtSubjectHtml(v: StatecraftView, r: number): string {
  const c = v.courting;
  if (!c || !(r in c.subjects)) return "";
  const mine = c.mine.find((x) => x.target === r && x.lord === null);
  const not = c.subjects[r] ?? null;
  return `<h3 class="sub">Court their loyalty</h3>
    ${mine ? `<p>${icon("scroll", 1)} Your envoy has courted them since ${monthText(mine.since)}: they count <i>Courted</i> (−1) against their overlord.</p>` : ""}
    <div class="missions">${mine
      ? tile(`<button class="paper" data-court-subject="${r}" data-recall="1">Recall your envoy</button>`, "He comes home and his seat is free again.")
      : not === null
        ? tile(`<button class="wax" data-court-subject="${r}">${icon("scroll", 1)}Court their loyalty</button>`, `One of your envoys stays at their court working against their overlord: they count Courted (−1), and a Disloyal subject may rise. ${COURT_DOES}`)
        : tile(`<button class="paper" disabled>Court their loyalty</button>`, why(not))}</div>`;
}

/** Court him, on a foreign lord's screen (DIPL-215, DIPL-216, DIPL-220). */
export function courtLordHtml(v: StatecraftView | null, k: number, realm: number): string {
  const c = v?.courting;
  if (!c || !(k in c.lords)) return "";
  const mine = c.mine.find((x) => x.lord === k);
  const why = c.lords[k] ?? null;
  return `<h3 class="sub">Court him</h3>
    ${mine
      ? `<p>${icon("scroll", 1)} Your envoy has courted him since ${monthText(mine.since)}.</p><button class="paper" data-court-lord="${k}" data-realm="${realm}" data-recall="1">Recall your envoy</button><p class="hint">He comes home and his seat is free again.</p>`
      : why === null
        ? `<button class="wax" data-court-lord="${k}" data-realm="${realm}">${icon("scroll", 2)}Court him</button><p class="hint">One of your envoys stays at his court: he loses a step of loyalty each season unless his ruler wins him back, and once Disloyal for a year with land next to yours he comes over to you with it. ${COURT_DOES}</p>`
        : `<button class="paper" disabled>Court him</button><p class="hint">${esc(why.charAt(0).toUpperCase() + why.slice(1))}.</p>`}`;
}

/** Marriage and claims toward another realm (SUBJ-130): the paths to its crown. */
function crownsLine(v: StatecraftView, r: number, married: boolean): string {
  const claim = v.house?.claims.find((c) => c.throne === r);
  const parts = [
    married ? "If their line dies out, their crown may pass to your ruler (the house most married into theirs inherits)." : "",
    claim ? `Your house claims their throne${claim.until ? ` until ${monthText(claim.until)}` : ""}.` : "",
  ].filter(Boolean);
  return parts.length ? `<p>${icon("crown", 1)} ${parts.join(" ")}</p>` : "";
}

/** Make a demand (DIPL-111 to DIPL-114): tribute and their border provinces, each a 44-point button, or why none can be made. */
function demandsHtml(d: StatecraftView["realms"][number]["demands"]): string {
  const head = `<h3 class="sub">Make a demand</h3>
    <p class="hint">A threat carried by an envoy. They think worse of you whatever they answer (−15, fading over 10 years). If they refuse, you hold a war aim on them for 5 years, and a war you start over it brings their allies no call. They give in only when they cannot beat you.</p>`;
  if (d.why) return `${head}<p class="hint">${why(d.why)}</p>`;
  const tribute =
    d.tribute === null
      ? tile(`<button class="wax" data-demand="pay_tribute">${icon("crown", 1)}Demand tribute</button>`, "They become your tributary and send you 15 in 100 of their tax and trade each month. A tributary stays out of your wars.")
      : tile(`<button class="paper" disabled>Demand tribute</button>`, why(d.tribute));
  const provinces = d.provinces.length
    ? `<p class="hint">Or demand a province on your border; giving up their capital counts against it (−30).</p><div class="missions">${d.provinces
        .slice(0, 8)
        .map((p) => `<button class="paper" data-demand="hand_over_province" data-province="${p.province}">Demand ${esc(p.name)}${p.capital ? " (their capital)" : ""}</button>`)
        .join("")}</div>`
    : "";
  return `${head}<div class="missions">${tribute}</div>${provinces}`;
}

/** Your own statecraft: envoys abroad and the answers of the last two years. */
export function myStatecraft(v: StatecraftView | null, realmButton: (n: number) => string): string {
  if (!v) return "";
  return `<h3 class="sub">Envoys</h3>
    <p>${v.free} of ${v.seats} free. <span class="hint">More come with more than 10 provinces and with inventions.</span></p>
    ${v.envoys.length ? v.envoys.map((e) => `<p>${icon("scroll", 1)} ${realmButton(e.target)} <small>${e.status === "road" ? `to ${missionName(e.action)}, there in ${monthText(e.arrival)}` : e.status === "court" ? `at court, to ${missionName(e.action)}` : `coming home${e.home ? ` in ${monthText(e.home)}` : ""}`}</small></p>`).join("") : `<p class="hint">Open another realm to send an envoy there.</p>`}
    ${(v.courting?.mine ?? []).map((c) => `<p>${icon("scroll", 1)} ${realmButton(c.target)} <small>at court, courting ${c.lordName ? esc(c.lordName) : "their loyalty to their overlord"} since ${monthText(c.since)}</small></p>`).join("")}
    ${v.letters.length ? `<h3 class="sub">Answers</h3>${v.letters.slice(0, 8).map((l) => `<div class="letter"><p>${esc(l.text)} <small>(${monthText(l.month)})</small></p>${reasonsHtml(l)}</div>`).join("")}` : ""}`;
}

/** Your house (SUBJ-130): the houses married into yours and your claims, every path to another crown in one place. */
export function myHouse(v: StatecraftView | null, realmButton: (n: number) => string): string {
  const h = v?.house;
  if (!h) return "";
  return `<h3 class="sub">Your house</h3>
    ${h.married.length ? `<p class="hint">Married into your house. If one of their lines dies out, their crown may pass to your ruler.</p><div class="house-row">${h.married.map((n) => realmButton(n)).join("")}</div>` : `<p class="hint">No house is married into yours. Send an envoy to arrange a marriage: a marriage can bring a claim on a throne, or a whole crown.</p>`}
    ${h.claims.length ? `<p class="hint">Your claims on other thrones:</p>${h.claims.map((c) => `<div class="house-row">${realmButton(c.throne)} <small>${c.until ? `until ${monthText(c.until)}` : "for life"}</small></div>`).join("")}` : ""}`;
}

type SubjectRow = NonNullable<StatecraftView["subjects"]>["subjects"][number];

const TRIBUTE: { level: string; label: string; does: string }[] = [
  { level: "none", label: "None", does: "They pay nothing." },
  { level: "light", label: "Light", does: "Half the share; they like it (+1)." },
  { level: "normal", label: "Normal", does: "The type's share." },
  { level: "heavy", label: "Heavy", does: "One and a half times; they resent it (−1)." },
  { level: "crushing", label: "Crushing", does: "Twice the share; they hate it (−2)." },
];

const pct = (share: number) => `${Math.round(share * 100)} in 100`;
const loyaltyClass = (l: string) => `loyalty-${l.toLowerCase().replace(/ /g, "-")}`;

/** Loyalty reasons as named badges, up or down, with no hidden number (SUBJ-029). */
function reasonBadges(r: SubjectRow): string {
  return `<div class="badges">${r.reasons
    .slice()
    .sort((a, b) => b.arrow - a.arrow)
    .map((x) => `<span class="badge ${x.arrow > 0 ? "up" : "down"}">${x.arrow > 0 ? "▲".repeat(x.arrow) : "▼".repeat(-x.arrow)} ${esc(x.label)}</span>`)
    .join("")}</div>`;
}

/** The subjects list on your Diplomacy tab (SUBJ-091): reach, tribute, one row per subject, worst first; the row opens its realm. */
export function mySubjects(v: StatecraftView | null, realmButton: (n: number) => string): string {
  const s = v?.subjects;
  if (!s) return "";
  const over = overlordCard(v, realmButton);
  if (!s.subjects.length) return over;
  return `${over}<h3 class="sub">Subjects</h3>
    <p>Subject limit: ${s.used} of ${s.reach} used · ${icon("coin", 1)} ${Math.round(s.gold)} gold a month in tribute</p>
    ${s.used > s.reach ? `<p class="hint">Over your subject limit: every subject is Stretched thin (−1), the furthest more.</p>` : ""}
    ${s.subjects
      .map((r) => `<div class="subject-row">${realmButton(r.subject)} <small>${esc(r.kindName)} · <b class="${loyaltyClass(r.loyalty)}">${esc(r.loyalty)}</b> · ▲${r.up} ▼${r.down} · pays ${Math.round(r.pays)}${r.worst ? ` · worst: ${esc(r.worst)}` : ""}</small></div>`)
      .join("")}
    <p class="hint">Open a subject to set its tribute, send a gift, loosen or release it. Loyalty is counted each season: two more up than down raises it a step, two more down lowers it.</p>`;
}

/** The subject's head in the lord card's frame (SUBJ-092, SUBJ-137): its kind, ruler and loyalty, then its realm. */
function subjectHead(r: SubjectRow, name: string, realmButton?: (n: number) => string): string {
  const f = r.realm;
  return `<div class="person-card subject-head"><span class="crest" aria-hidden="true">${KIND_CREST[r.kind] ?? "♜"}</span>
      <div><p><b>${esc(name)}</b> · ${esc(r.kindName)}</p>${f.ruler ? `<p>${esc(f.ruler)}</p>` : ""}<p><b class="${loyaltyClass(r.loyalty)}">${esc(r.loyalty)}</b> · ▲${r.up} ▼${r.down}</p></div>
    </div>
    <dl class="facts">
      <dt>Provinces</dt><dd>${f.provinces}</dd>
      <dt>Army</dt><dd>${f.army.toLocaleString("en")} men</dd>
      <dt>Treasury</dt><dd>${f.treasury.toLocaleString("en")} gold</dd>
      <dt>Its own subjects</dt><dd>${f.ownSubjects.length && realmButton ? f.ownSubjects.map(realmButton).join(" ") : "none"}</dd>
    </dl>`;
}

const KIND_CREST: Record<string, string> = { vassal: "🛡", tributary: "📦", union: "👑", march: "⚔", colony: "⚓", protectorate: "☂" };

type OverlordRow = NonNullable<NonNullable<StatecraftView["subjects"]>["overlord"]>;

/**
 * The player's own card seen from below (SUBJ-131, SUBJ-140): the same badges
 * its overlord reads, then its choices, each a 44-point row with what it does
 * or why not now.
 */
export function overlordCard(v: StatecraftView | null, realmButton: (n: number) => string): string {
  const o: OverlordRow | null | undefined = v?.subjects?.overlord;
  if (!o) return "";
  const b = o.below;
  const choice = (id: string) => b.choices.find((c) => c.id === id)!;
  const btn = (id: string, label: string, cls: string, does: string) => {
    const not = choice(id).locked;
    return not === null ? tile(`<button class="${cls}" data-subject-choice="${id}">${label}</button>`, esc(does)) : tile(`<button class="${cls}" disabled>${label}</button>`, why(not));
  };
  const backers = b.backers.length ? `<div class="house-row">${b.backers.map(realmButton).join("")}</div><p class="hint">They are rivals of your overlord, at peace and as strong: the first would join your rising.</p>` : `<p class="hint">${esc(choice("seek_backer").locked ?? "")}.</p>`;
  const wars = b.wars.length
    ? b.wars.map((w) => `<p>${icon("swords", 1)} At war with ${w.enemies.map(realmButton).join(" ")} <small>${Math.round(w.peaceShare * 100)} in 100 of their voices want peace${w.peaceShare > 0.5 ? ": the moment to rise" : ""}</small></p>`).join("")
    : `<p class="hint">They are at peace. A war that goes badly for them, with over half their voices for peace, is the moment to rise.</p>`;
  return `<h3 class="sub">Your overlord</h3>
    <p>${realmButton(o.overlord)} <small>You are its ${esc(o.kindName.toLowerCase())}, <b class="${loyaltyClass(o.loyalty)}">${esc(o.loyalty)}</b>; you send it ${Math.round(o.pays)} gold a month. ${esc(o.fights)}</small></p>
    ${reasonBadges(o)}
    <p class="hint">These are the reasons your overlord sees. Two more down than up at a season's end and you grow a step less loyal; a Disloyal subject pays nothing and may rise.</p>
    <h3 class="sub">Your choices</h3>
    <div class="missions">
      ${o.withholding ? btn("pay", `${icon("coin", 1)}Pay tribute again`, "wax", "Your tribute flows again and they owe you defence; the Withholds tribute reason ends.") : btn("stop_paying", `${icon("coin", 1)}Stop paying`, "paper", "You keep your tribute, but you grow Disloyal a step at a time, a season at a time (Withholds tribute −2).")}
      ${btn("ask_loosen", "Ask to loosen", "paper", "An envoy asks politely: they agree when cautious or over their reach. You become their tributary: 15 in 100 of your income, out of their wars (+2 for 10 years).")}
    </div>
    <h3 class="sub">Find a backer</h3>
    ${backers}
    <h3 class="sub">Their wars</h3>
    ${wars}
    <h3 class="sub">Marry into their house</h3>
    <p class="hint">${b.married ? "Your houses are married: if their line dies out, their crown may pass to your ruler, and they become your union." : "Your houses are not married. Married into theirs, your ruler may inherit their crown if their line dies out."} <i>Arrange a marriage</i> is on their card.</p>
    <div class="house-row">${realmButton(o.overlord)}</div>
    ${o.loyalty === "Disloyal" ? `<button class="wax" data-rise>${icon("swords", 1)}Rise for independence</button><p class="hint">You declare war on your overlord${b.backers.length ? ", and your backer joins you" : ""}. Win, or end it without giving up land, and you are free; lose land in the peace and you are made its subject again, one kind tighter. Outgrow them and win, and you can make them your subject.</p>` : `<p class="hint">Only a Disloyal subject can rise against its overlord.</p>`}`;
}

/** A subject's card on its realm's Diplomacy tab (SUBJ-092, SUBJ-048): loyalty and reasons, what it pays, how it comes to war, and the overlord's actions. */
export function subjectCard(v: StatecraftView | null, r: number, realmButton?: (n: number) => string, name = ""): string {
  const row = v?.subjects?.subjects.find((x) => x.subject === r);
  if (!row) return "";
  const btn = (act: string, label: string, not: string | null, does: string) =>
    not === null ? tile(`<button class="paper" data-subject-act="${act}">${label}</button>`, esc(does)) : tile(`<button class="paper" disabled>${label}</button>`, why(not));
  const union = row.kind === "union";
  return `<h3 class="sub">Your ${esc(row.kindName.toLowerCase())}</h3>
    ${subjectHead(row, name, realmButton)}
    ${union ? `<p class="hint">${icon("crown", 1)} Your ruler wears their crown too: one ruler for both realms, their lords and laws their own.</p>` : ""}
    <p>They send you ${Math.round(row.pays)} gold a month (${pct(row.share)} of their ${row.kind === "vassal" ? "taxes" : "income"}). ${esc(row.fights)}</p>
    ${reasonBadges(row)}
    ${row.reasons.some((x) => x.label === "Courted") ? `<p class="hint">${row.courtedBy.length && realmButton ? `Courted by ${row.courtedBy.map(realmButton).join(" ")}: a foreign envoy works on them at their court.` : "A foreign envoy courts them at their court. Station a resident there to see whose."}</p>` : ""}
    <h3 class="sub">Tribute</h3>
    <div class="choices tribute">${TRIBUTE.map((t) => `<button class="${t.level === row.tribute ? "wax" : "paper"}" data-subject-act="tribute" data-level="${t.level}" ${t.level === row.tribute ? "disabled" : ""}>${t.label}</button>`).join("")}</div>
    <p class="hint">${esc(TRIBUTE.find((t) => t.level === row.tribute)!.does)} A Wavering subject pays half; a Disloyal one pays nothing and refuses your calls.</p>
    <div class="missions">
      ${btn("gift", `${icon("coin", 1)}Send a gift`, row.why.gift, `${row.giftCost} gold, six months of their income: +1 loyalty for 5 years.`)}
      ${btn("loosen", "Loosen to tributary", row.why.loosen, "They become a tributary: they pay 15 in 100 of their income, stay out of your wars, and like it (+2 for 10 years).")}
      ${btn("release", "Release", row.why.release, "They go free as your friend.")}
    </div>
    <h3 class="sub">Their heir</h3>
    ${row.hostage ? `<p>${icon("crown", 1)} Their heir lives at your court as a hostage (+1 loyalty) and goes home in ${monthText(row.hostage.until)}.</p>` : ""}
    <div class="missions">
      ${row.hostage ? btn("send_heir_home", "Send the heir home", row.why.send_heir_home, "He goes home now; they lose the +1.") : btn("hostage", `${icon("crown", 1)}Take a hostage`, row.why.hostage, "Their heir comes to live at your court: +1 loyalty for as long as you hold him (20 years, or until you send him home).")}
    </div>
    <h3 class="sub">Your envoys at their court</h3>
    ${row.work ? `<p>${icon("scroll", 1)} Your envoy is ${row.work.action === "fold_in" ? "folding them into your realm" : "tightening them to a vassal"}: ${row.work.monthsLeft} month${row.work.monthsLeft === 1 ? "" : "s"} to go${row.work.action === "fold_in" ? ", as long as they stay Loyal" : ""}.</p>` : ""}
    <div class="missions">
      ${row.resident ? btn("recall", "Recall your resident", row.why.recall, "Your envoy comes home; they lose the +1.") : btn("resident", `${icon("scroll", 1)}Station a resident`, row.why.resident, "One of your envoys stays at their court: +1 loyalty, and you see their true army.")}
      ${row.kind === "tributary" ? btn("tighten", "Tighten to vassal", row.why.tighten, "One envoy for 6 months; they then pay 10 in 100 of their taxes and answer your calls. A Wavering tributary refuses and drops a step.") : ""}
      ${row.kind !== "tributary" && !union ? btn("fold_in", `${icon("crown", 1)}Fold into your realm`, row.why.fold_in, "One envoy for a month per province. Their land becomes yours, held by their ruler as one of your lords, and the country leaves the map.") : ""}
      ${union ? btn("merge", `${icon("crown", 1)}Merge the crowns`, row.why.merge, "At once: their provinces join your realm as they are held, their lords serve you with the loyalty they have, and the country leaves the map.") : ""}
    </div>`;
}

type AskRow = StatecraftView["asks"][number];

/** What an ask at your court is, and what agreeing and refusing do, in the card's words (DIPL-214). */
function askWords(a: AskRow): { asks: string; yes: string; no: string; agree: string } {
  switch (a.action) {
    case "demand":
      return a.kind === "pay_tribute"
        ? { asks: "demands that you pay tribute", agree: "Give in", yes: "You become their tributary: 15 in 100 of your tax and trade each month, with no war.", no: "They hold a war aim on you for 5 years, and if they attack over it your allies get no call." }
        : {
            asks: `demands ${a.province ? `${a.province.name}${a.province.capital ? ", your capital" : ""}` : "a province"}`,
            agree: "Give in",
            yes: "The province is theirs at once, with no war; you will remember it (Took our land).",
            no: "They hold a war aim on it for 5 years, and if they attack over it your allies get no call.",
          };
    case "propose_alliance":
      return { asks: "proposes an alliance", agree: "Agree", yes: "Allies answer each other's calls to arms; refusing a defensive call breaks it.", no: "Nothing changes between you." };
    case "arrange_marriage":
      return { asks: "proposes a royal marriage", agree: "Agree", yes: "Married houses think better of each other (+15). A marriage can bring a claim on a throne, and a crown whose line dies out.", no: "Nothing changes between you." };
    case "offer_overlordship":
      return { asks: "offers to take you under its protection", agree: "Agree", yes: "You become their tributary: they defend you, you send them 15 in 100 of your income each month.", no: "Nothing changes between you." };
    case "ask_protection":
      return { asks: "asks for your protection", agree: "Agree", yes: "They become your tributary: 15 in 100 of their income each month, and you owe them defence.", no: "Nothing changes between you." };
    default:
      return { asks: `asks you to ${missionName(a.action)}`, agree: "Agree", yes: "", no: "" };
  }
}

/** An envoy waiting at your court, as an answer card with Agree or Give in, and Refuse (DIPL-214). */
export function askCard(a: AskRow, realmButton: (n: number) => string): string {
  const w = askWords(a);
  return `<div class="call framed-soft">
    <p>${icon("scroll", 2)} An envoy of ${realmButton(a.from)} ${esc(w.asks)}.</p>
    <dl class="facts ask-terms"><dt>${w.agree}</dt><dd>${esc(w.yes)}</dd><dt>Refuse</dt><dd>${esc(w.no)}</dd></dl>
    <p class="hint">He waits at your court until ${monthText(a.until)}; no answer by then is a refusal.</p>
    <div class="choices"><button class="${a.action === "demand" ? "paper" : "wax"}" data-ask="${esc(a.id)}" data-yes="1">${w.agree}</button><button class="${a.action === "demand" ? "wax" : "paper"}" data-ask="${esc(a.id)}" data-yes="0">Refuse</button></div>
  </div>`;
}
