import type { EmpireView, HouseView, SeatView, ShogunateView } from "@ph/engine";
import { EMPIRE_FOLDS, INSTITUTIONS_KEY, SHOGUNATE_FOLDS, SILENCE, empireBadge, institutionRow } from "@ph/engine/domain/institutions";
import { icon } from "../art/ui.ts";

/**
 * The institutions on screen (INST-080 to INST-085, the Empire and the
 * Shogunate): the Institutions row on the player's own Diplomacy tab, the badge
 * on a member's country card, the Empire card with its four folds (the Diet and
 * its reforms, the Imperial Court), the Shogunate card with its three (the
 * houses, the Court, hold), their answer cards in the News and the key of the
 * Institutions map mode. The words come
 * from the institutions context (screens.ts); this file lays them out as
 * 44-point rows and buttons that open on tap.
 */

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : "±0");

/** What the card needs of the rest of the client: realm names, links and banners, months and faiths in words. */
export interface InstitutionsUi {
  name: (n: number) => string;
  /** The realm's banner, large for the card's header; and its small pennant for a row. */
  banner: (n: number) => string;
  pennant: (n: number) => string;
  month: (iso: string) => string;
  faith: (id: string) => string;
  /** A province's name, by index. */
  province: (p: number) => string;
}

/** Which of the Empire card's folds are open and which seat's reasons show; kept between redraws. */
export const empireUi = { open: new Set<string>(["Election"]), seat: null as string | null };

/** The tally in words and numbers: "Bavaria 4 · Austria 2 · Saxony 1". */
export const tallyText = (v: EmpireView, ui: InstitutionsUi) => v.tally.map((t) => `${esc(ui.name(t.candidate))} ${t.votes}`).join(" · ");

/** INST-080: the Institutions row on the player's own Diplomacy tab, one 44-point line per institution they belong to. */
export function institutionsRows(v: EmpireView | null, sh: ShogunateView | null, ui: InstitutionsUi): string {
  const rows: string[] = [];
  if (v && v.role && !v.ended) {
    const text = institutionRow({ name: v.name, office: "Emperor", holder: v.emperor >= 0 ? ui.name(v.emperor) : "none", hold: v.hold, role: v.role });
    rows.push(`<button class="paper institution-row" data-empire-open>${icon("crown", 1)}<span>${esc(text)}</span></button>`);
  }
  if (sh && sh.role && !sh.ended) {
    const text = institutionRow({ name: sh.name, office: "Shogun", holder: sh.shogun >= 0 ? ui.name(sh.shogun) : "vacant", hold: sh.hold, role: sh.role });
    rows.push(`<button class="paper institution-row" data-shogunate-open>${icon("crown", 1)}<span>${esc(text)}</span></button>`);
  }
  return rows.length ? `<h3 class="sub">Institutions</h3>${rows.join("")}` : "";
}

/** INST-080: the badge on a member's country card (Emperor, Elector, Empire); it opens the Empire card. */
export function empireBadgeHtml(v: EmpireView | null, realm: number): string {
  if (!v || v.ended) return "";
  const role = v.emperor === realm ? "Emperor" : v.seats.some((s) => s.realm === realm) ? "Elector" : v.members.some((m) => m.realm === realm) ? "Member" : null;
  const word = empireBadge(role);
  return word ? `<button class="paper empire-badge" data-empire-open title="Opens the Empire card">${icon("crown", 1)}${word}</button>` : "";
}

/** INST-080: the Shogun badge on the shogun's country card; it opens the Shogunate card. */
export function shogunBadgeHtml(v: ShogunateView | null, realm: number): string {
  return v && !v.ended && v.shogun >= 0 && v.shogun === realm ? `<button class="paper empire-badge" data-shogunate-open title="Opens the Shogunate card">${icon("crown", 1)}Shogun</button>` : "";
}

/** The hold bar: the number and its word, never colour alone (INST-085). */
const holdBar = (v: { hold: number; word: string }) =>
  `<div class="hold-bar" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${v.hold}" aria-label="Hold ${v.hold}, ${v.word}"><i style="width:${v.hold}%"></i><span>Hold ${v.hold} · ${v.word}</span></div>`;

const fold = (name: string, summary: string, body: string, open = empireUi.open) =>
  `<details class="inst-fold" data-fold="${name}"${open.has(name) ? " open" : ""}><summary><b>${name}</b><small>${summary}</small></summary><div class="inst-body">${body}</div></details>`;

/** INST-081: the Empire card: header, then the folds Election, Reforms, Members and Hold. */
export function empireCard(v: EmpireView, ui: InstitutionsUi): string {
  const header = `<div class="realm-card empire-head">
      ${v.emperor >= 0 ? ui.banner(v.emperor) : ""}
      <p><b>Emperor: ${v.emperor >= 0 ? esc(ui.name(v.emperor)) : "none"}</b><br>
      ${v.ruler ? `${esc(v.ruler)} · ` : ""}crown held since ${esc(ui.month(v.since))}<br>
      <b>You:</b> ${v.role ?? "not a member"}</p>
    </div>
    ${holdBar(v)}
    ${v.ended ? `<p class="hint">The Empire ended in ${esc(ui.month(v.ended.date))}: ${esc(v.ended.how)}.</p>` : ""}`;
  const [election, reforms, members, hold] = EMPIRE_FOLDS;
  return `${header}
    ${fold(election, v.election ? "an election sits" : tallyText(v, ui), electionFold(v, ui))}
    ${fold(reforms, reformsSummary(v), reformsFold(v, ui))}
    ${fold(members, `${v.members.length} members${breakers(v) ? ` · ${breakers(v)} Breaker${breakers(v) === 1 ? "" : "s"} of the Peace` : ""}`, membersFold(v, ui))}
    ${fold(hold, `${v.hold} · ${v.word}`, holdFold(v))}`;
}

function seatRow(v: EmpireView, s: SeatView, ui: InstitutionsUi): string {
  // A realm's seat is named after it; only a seat granted to another realm names its holder.
  const who = s.church ? "church seat" : s.vacant ? "vacant" : ui.name(s.realm) === s.name ? "" : esc(ui.name(s.realm));
  const vote = s.vote >= 0 ? `votes for <b>${esc(ui.name(s.vote))}</b>` : "no vote";
  const tap = s.realm >= 0;
  const open = tap && empireUi.seat === s.name;
  const row = tap
    ? `<button class="paper seat-row${open ? " on" : ""}" data-seat="${esc(s.name)}" aria-expanded="${open}"><span><b>${esc(s.name)}</b> <small>${who}</small></span><span>${vote}</span></button>`
    : `<div class="seat-row plain"><span><b>${esc(s.name)}</b> <small>${who}</small></span><span>${vote}</span></div>`;
  return row + (open ? seatReasons(v, s, ui) : "") + (s.vacant && v.role === "Emperor" ? grantPicker(v, s, ui) : "");
}

/** A seat's reasons for each candidate, best first, and Seek their vote or why not (INST-025, INST-026). */
function seatReasons(v: EmpireView, s: SeatView, ui: InstitutionsUi): string {
  return `<div class="seat-reasons framed-soft">
    ${s.reasons
      .map(
        (r) => `<p class="cand"><b>${esc(ui.name(r.candidate))}</b> <span>${signed(r.total)}</span></p>
      <dl class="facts">${r.rows.map((x) => `<dt>${esc(x.name)}</dt><dd>${signed(x.number)}</dd>`).join("")}</dl>`,
      )
      .join("")}
    ${s.seekWhyNot ? `<p class="hint">Seek their vote: ${esc(s.seekWhyNot)}.</p>` : `<button class="wax" data-seek-vote="${s.realm}">Seek their vote</button><p class="hint">An envoy with a gift: they think better of your claim to the crown (+15, fading over 10 years).</p>`}
  </div>`;
}

/** The Emperor grants a vacant seat to a member without one (INST-022). */
function grantPicker(v: EmpireView, s: SeatView, ui: InstitutionsUi): string {
  const free = v.members.filter((m) => !m.seat);
  return free.length ? `<div class="grant"><p class="hint">Grant the seat of ${esc(s.name)} to:</p><div class="choices">${free.map((m) => `<button class="paper" data-grant-seat="${esc(s.name)}" data-grant-realm="${m.realm}">${esc(ui.name(m.realm))}</button>`).join("")}</div></div>` : "";
}

function electionFold(v: EmpireView, ui: InstitutionsUi): string {
  const mySeat = hasOwnSeat(v);
  return `${v.election ? `<p><b>An election sits:</b> ${esc(v.election.why)} The votes are counted in ${esc(ui.month(v.election.ends))}.</p>` : ""}
    <p><b>Today's tally:</b> ${tallyText(v, ui) || "no candidates"}</p>
    <p class="hint">Candidates: ${v.candidates.map((c) => esc(ui.name(c))).join(", ")}. Most votes win; a tie keeps the sitting house.</p>
    ${v.election && mySeat ? voteButtons(v, ui) : ""}
    <div class="seats">${v.seats.map((s) => seatRow(v, s, ui)).join("")}</div>
    <p class="hint">Tap a seat to see why it votes as it does.</p>
    ${v.role ? `<button class="paper stand${v.standing ? " on" : ""}" data-stand="${v.standing ? 0 : 1}" aria-pressed="${v.standing}">${icon("crown", 1)}${v.standing ? "You stand for the crown: tap to withdraw" : "Stand for the crown"}</button>` : ""}
    ${v.role === "Emperor" && v.admittable.length ? `<h4>Ask to join</h4><p class="hint">Realms whose capital lies in imperial land.</p><div class="choices">${v.admittable.map((n) => `<button class="paper" data-admit="${n}">${esc(ui.name(n))}</button>`).join("")}</div>` : ""}`;
}

/** The player's seat's vote while an election sits: one button per candidate (silence: the seat votes by its reasons). */
export function voteButtons(v: EmpireView, ui: InstitutionsUi): string {
  if (!v.election) return "";
  return `<div class="choices">${v.candidates
    .map((c) => `<button class="${v.election!.playerVote === c ? "wax" : "paper"}" data-empire-vote="${c}" aria-pressed="${v.election!.playerVote === c}">Vote for ${esc(ui.name(c))}</button>`)
    .join("")}</div><p class="hint">If you don't vote, ${SILENCE.election}.</p>`;
}

/** "12 yes to 10 no — it would pass": over half the votes pass a reform (INST-041). */
const forecastText = (yes: number, no: number, sitting: boolean) =>
  `${yes} yes to ${no} no — it ${yes > no ? (sitting ? "passes" : "would pass") : sitting ? "fails" : "would fail"}`;

const breakers = (v: EmpireView) => v.members.filter((m) => m.breaker).length;

function reformsSummary(v: EmpireView): string {
  const r = v.reforms;
  if (r.diet) return `the Diet sits on the ${r.diet.name}`;
  const n = r.ladder.filter((x) => x.passed).length;
  return n ? `${n} of ${r.ladder.length} passed` : "none passed yet";
}

/** INST-081: the ladder of seven, the next reform with its cost and forecast, the Diet while it sits, and the Imperial Court. */
function reformsFold(v: EmpireView, ui: InstitutionsUi): string {
  const r = v.reforms;
  const at = r.diet?.reform ?? r.next?.id;
  const ladder = `<ol class="ladder">${r.ladder
    .map((x) => {
      const mark = x.passed ? "passed" : x.id === at ? (r.diet ? "the Diet sits" : "next") : "";
      return `<li class="${x.passed ? "passed" : x.id === at ? "next" : ""}"><span class="tick" aria-hidden="true">${x.passed ? "✓" : ""}</span><span>${esc(x.name)}${mark ? ` <small>${mark}</small>` : ""}</span></li>`;
    })
    .join("")}</ol>`;
  return `${ladder}
    ${r.diet ? dietSitting(v, ui) : r.next ? nextReform(v) : `<p class="hint">${v.ended ? "The Empire has ended." : "Every reform has passed."}</p>`}
    ${r.contingents.length ? `<p>Imperial contingents in the field: <b>${r.contingents.reduce((t, c) => t + c.men, 0).toLocaleString("en")} men</b>, sent home with the peace.</p>` : ""}
    ${courtList(v, ui)}`;
}

/** The next reform: what it does, what it costs and how the Diet would vote today; Call the Diet for the Emperor, or why not. */
function nextReform(v: EmpireView): string {
  const n = v.reforms.next!;
  return `<div class="reform-next framed-soft">
    <p><b>Next: ${esc(n.name)}.</b> ${esc(n.effect)}</p>
    <p>Hold: <b>−${n.passCost}</b> if it passes, <b>−${n.failCost}</b> if it fails.</p>
    <p><b>Forecast:</b> ${forecastText(n.yes, n.no, false)}. <small>Electors' votes count twice.</small></p>
    ${n.whyNot ? `<p class="hint">Call the Diet: ${esc(n.whyNot)}.</p>` : `<button class="wax wide" data-call-diet>${icon("scroll", 1)}Call the Diet</button><p class="hint">The members vote for a month; you may call it once every 5 years.</p>`}
  </div>`;
}

/** A sitting Diet: the reform, when the votes are counted, today's tally and the player's Vote yes / Vote no. */
function dietSitting(v: EmpireView, ui: InstitutionsUi): string {
  const d = v.reforms.diet!;
  const effect = v.reforms.ladder.find((x) => x.id === d.reform)?.effect ?? "";
  return `<div class="reform-next framed-soft">
    <p><b>The Diet sits on the ${esc(d.name)}.</b> ${esc(effect)}</p>
    <p>The votes are counted in ${esc(ui.month(d.ends))}. <b>Today:</b> ${forecastText(d.yes, d.no, false)}.</p>
    ${v.role ? dietButtons(v) : ""}
  </div>`;
}

/** Vote yes / Vote no, the chosen one shown as chosen (silence counts as no, INST-083). */
function dietButtons(v: EmpireView): string {
  const mine = v.reforms.diet!.playerVote;
  const b = (yes: boolean) => {
    const on = mine === (yes ? "yes" : "no");
    return `<button class="${on ? "wax" : "paper"}" data-diet-vote="${yes ? 1 : 0}" aria-pressed="${on}">${on ? "✓ " : ""}Vote ${yes ? "yes" : "no"}</button>`;
  };
  return `<div class="choices two">${b(true)}${b(false)}</div><p class="hint">${mine ? `You vote ${mine}; tap the other to change it.` : `If you don't vote, your vote counts as ${SILENCE.diet}.`}</p>`;
}

/** INST-043: the player's land war aims on members, each with Take to court, once the Imperial Court has passed. */
function courtList(v: EmpireView, ui: InstitutionsUi): string {
  const c = v.reforms.court;
  if (!c.length || !v.reforms.ladder.find((x) => x.id === "imperial_court")?.passed) return "";
  return `<h4>Take to court</h4>
    <p class="hint">The Imperial Court rules on your claim instead of a war; one who refuses its ruling is a Breaker of the Peace.</p>
    <div class="court-rows">${c
      .map(
        (x) => `<div class="court-row"><span><b>${esc(ui.province(x.province))}</b><small>of ${esc(ui.name(x.realm))} · ${esc(x.source)}</small></span><button class="paper" data-court-realm="${x.realm}" data-court-province="${x.province}">Take to court</button></div>`,
      )
      .join("")}</div>`;
}

function membersFold(v: EmpireView, ui: InstitutionsUi): string {
  return `<div class="members">${v.members
    .map((m) => {
      const badges = [m.realm === v.emperor ? "Emperor" : "", m.seat ? `Seat: ${m.seat}` : "", m.breaker ? "Breaker of the Peace" : "", m.atWarWithMember ? "At war with a member" : "", m.landHeld ? `Land held by outsiders (${m.landHeld})` : ""].filter(Boolean);
      return `<button class="paper member-row" data-realm="${m.realm}">${ui.pennant(m.realm)}<span><b>${esc(ui.name(m.realm))}</b><small>${m.provinces} province${m.provinces === 1 ? "" : "s"} · ${esc(ui.faith(m.faith))}${m.circle ? ` · ${esc(m.circle)} Circle` : ""}</small>${badges.length ? `<span class="badges">${badges.map((b) => `<em class="badge${/war|outsiders|Breaker/.test(b) ? " down" : ""}">${esc(b)}</em>`).join("")}</span>` : ""}</span></button>`;
    })
    .join("")}</div>`;
}

const lines = (title: string, rows: { cause: string; number: number }[]) =>
  rows.length ? `<details class="inst-fold small"><summary><b>${title}</b><small>${signed(rows.reduce((t, r) => t + r.number, 0))}</small></summary><dl class="facts">${rows.map((r) => `<dt>${esc(r.cause)}</dt><dd>${signed(r.number)}</dd>`).join("")}</dl></details>` : "";

function holdFold(v: EmpireView): string {
  const gain = v.year.filter((l) => l.number > 0), lose = v.year.filter((l) => l.number < 0);
  return `${holdBar(v)}
    <p class="hint">Hold is how strong the office is over the members: Hollow under 20, Weak under 50, Firm under 80, then Strong. It is counted each January.</p>
    <h4>This year so far</h4>
    ${gain.length || lose.length ? lines("Gains", gain) + lines("Losses", lose) : `<p class="hint">Nothing yet; peace in the Empire adds 2 in January.</p>`}
    ${v.record.length ? `<h4>Last year's count</h4>${lines("Gains", v.record.filter((l) => l.number > 0))}${lines("Losses", v.record.filter((l) => l.number < 0))}` : ""}
    ${v.reforms.zeroYears ? `<p><b>Hold has stood at 0 for ${v.reforms.zeroYears} year${v.reforms.zeroYears === 1 ? "" : "s"}:</b> at 5 in a row the Empire dissolves.</p>` : ""}
    <p>Dues to the Emperor: <b>${v.dues.toFixed(1)} gold a month</b> (1 per member, times hold ÷ 100), in the Emperor's tribute line.</p>`;
}

/** Whether the player holds a seat (the view marks their own seat's Seek button). */
const hasOwnSeat = (v: EmpireView) => v.seats.some((s) => s.seekWhyNot === "your own seat");

/** INST-083: the election's answer card in the News, while the player holds a seat. */
export function electionAnswerCard(v: EmpireView | null, ui: InstitutionsUi): string {
  if (!v?.election || !hasOwnSeat(v)) return "";
  return `<div class="call framed-soft empire-ask">
    <p>${icon("crown", 2)}<span><b>The Empire elects its Emperor:</b> ${esc(v.election.why)}</span></p>
    ${voteButtons(v, ui)}
    <button class="paper" data-empire-open>Open the Empire card</button>
  </div>`;
}

/** INST-083: the sitting Diet's answer card in the News, while the player is a member and has not voted. */
export function dietAnswerCard(v: EmpireView | null, ui: InstitutionsUi): string {
  const d = v?.reforms.diet;
  if (!v || !d || !v.role || d.playerVote) return "";
  return `<div class="call framed-soft empire-ask">
    <p>${icon("scroll", 2)}<span><b>The Diet sits on the ${esc(d.name)}:</b> ${esc(v.reforms.ladder.find((x) => x.id === d.reform)?.effect ?? "")} The votes are counted in ${esc(ui.month(d.ends))}; today ${forecastText(d.yes, d.no, false)}.</span></p>
    ${dietButtons(v)}
    <button class="paper" data-empire-open>Open the Empire card</button>
  </div>`;
}

/** INST-043, INST-083: a ruling of the Imperial Court against the player, to hand the province over or refuse. */
export function rulingAnswerCards(v: EmpireView | null, ui: InstitutionsUi): string {
  if (!v) return "";
  return v.reforms.rulings
    .map(
      (r) => `<div class="call framed-soft empire-ask">
    <p>${icon("crown", 2)}<span><b>The Imperial Court rules you hand ${esc(ui.province(r.province))} to ${esc(ui.name(r.plaintiff))}.</b> Answer by ${esc(ui.month(r.answerOn))}.</span></p>
    <div class="choices two"><button class="wax" data-ruling="${esc(r.id)}" data-yes="1">Hand it over</button><button class="paper" data-ruling="${esc(r.id)}" data-yes="0">Refuse</button></div>
    <p class="hint">Refusing makes you a Breaker of the Peace: the Emperor and every member may make war on you. If you don't answer, it is handed over.</p>
  </div>`,
    )
    .join("");
}

/** How many of the Empire's answer cards wait on the player (the News plaque's count). */
export function empireAsks(v: EmpireView | null): number {
  if (!v || v.ended) return 0;
  return (v.reforms.diet && v.role && !v.reforms.diet.playerVote ? 1 : 0) + v.reforms.rulings.length + (v.election && hasOwnSeat(v) && v.election.playerVote < 0 ? 1 : 0);
}

// ---------------------------------------------------------------- the Shogunate (INST-082, INST-083)

/** Which of the Shogunate card's folds are open and whether the port picker shows; kept between redraws. */
export const shogunateUi = { open: new Set<string>(["Houses"]), picking: false };

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;
/** Houses Wavering or worse: the ones the shogun's hold has to win back. */
const shaky = (v: ShogunateView) => v.houses.filter((h) => h.loyalty !== "Loyal").length;

/** INST-082: the Shogunate card: header with the warning line while hold is Weak or lower, then the folds Houses, The Court and Hold. */
export function shogunateCard(v: ShogunateView, ui: InstitutionsUi): string {
  const held = v.shogun >= 0;
  const header = `<div class="realm-card empire-head">
      ${held ? ui.banner(v.shogun) : ""}
      <p><b>Shogun: ${held ? esc(ui.name(v.shogun)) : "the office stands vacant"}</b><br>
      ${held ? `${v.ruler ? `${esc(v.ruler)} · ` : ""}in office since ${esc(ui.month(v.since))}` : v.broke ? `The Shogunate broke in ${esc(ui.month(v.broke))}` : ""}<br>
      <b>You:</b> ${v.role ?? "not a member"}</p>
    </div>
    ${held ? holdBar(v) : ""}
    ${v.warning && !v.ended ? `<p class="warn shogun-warn">${icon("swords", 1)}<span>${esc(v.warning)}: at a season's end with hold 0, or if the shogun loses the Court's province, each house rules its own land.</span></p>` : ""}
    ${v.ended ? `<p class="hint">The Shogunate ended in ${esc(ui.month(v.ended.date))}: ${esc(v.ended.how)}.</p>` : !held ? `<p class="hint">Japan has broken into warlord domains. A member that holds the Court's province and over half of Japan's land may ask the Court to make it shogun.</p>` : ""}`;
  if (v.ended) return header;
  const [houses, court, hold] = SHOGUNATE_FOLDS;
  const open = shogunateUi.open;
  return `${header}
    ${fold(houses, held ? `${plural(v.houses.length, "great house")}${shaky(v) ? ` · ${shaky(v)} wavering or worse` : " · all loyal"}` : plural(v.members.length, "member realm"), held ? housesFold(v) : membersOfJapan(v, ui), open)}
    ${fold(court, `${v.court.province >= 0 ? esc(ui.province(v.court.province)) : "Kyoto"}: ${v.court.holder >= 0 ? esc(ui.name(v.court.holder)) : "no one"}${v.closed ? " · the country is closed" : ""}`, courtFold(v, ui), open)}
    ${held ? fold(hold, `${v.hold} · ${v.word}`, shogunHoldFold(v), open) : ""}`;
}

/** A great house: lord, house, land, loyalty in words, wealth below 100 %, and the shogun's Summon or Release and Confirm, each with why not. */
function houseRow(v: ShogunateView, h: HouseView): string {
  const shogun = v.role === "Shogun";
  const facts = [plural(h.provinces, "province"), h.loyalty, h.wealth < 100 ? `wealth ${h.wealth} %` : "", h.summoned ? "at the capital" : ""].filter(Boolean).join(" · ");
  const summon = h.summoned
    ? `<button class="paper" data-house-release="${h.lord}">Release</button>`
    : `<button class="paper" data-house-summon="${h.lord}"${h.summonWhyNot ? " disabled" : ""}>Summon</button>`;
  const confirm = `<button class="paper" data-house-confirm="${h.lord}"${h.confirmWhyNot ? " disabled" : ""}>Confirm</button>`;
  const why = [!h.summoned && h.summonWhyNot ? `Summon: ${h.summonWhyNot}.` : "", h.confirmWhyNot ? `Confirm: ${h.confirmWhyNot}.` : ""].filter(Boolean).join(" ");
  return `<div class="house-row framed-soft">
    <button class="paper house-lord" data-lord-open="${h.lord}"><span><b>${esc(h.house)}</b> <small>${esc(h.name.replace(h.house, "").trim() || h.name)}</small></span><small>${esc(facts)}</small></button>
    ${shogun ? `<div class="choices two">${summon}${confirm}</div>${why ? `<p class="hint">${esc(why)}</p>` : ""}` : ""}
  </div>`;
}

function housesFold(v: ShogunateView): string {
  return `<div class="houses">${v.houses.map((h) => houseRow(v, h)).join("")}</div>
    ${v.role === "Shogun" ? `<p class="hint">Summon: the house waits at your capital, cannot join a rising and loses a tenth of its wealth a year; hold +1 a year each, while hold is Firm or better. Confirm: once per lord per ruler, the house grows a step more loyal for 5 hold.</p>` : ""}
    <p class="hint">Tap a house to open its lord's card.</p>`;
}

/** While the office is vacant: each member realm with how many of Japan's provinces it holds; a tap opens its country card. */
function membersOfJapan(v: ShogunateView, ui: InstitutionsUi): string {
  if (!v.members.length) return `<p class="hint">No warlord domain has its capital in Japan.</p>`;
  return `<div class="members">${[...v.members]
    .sort((a, b) => b.provinces - a.provinces)
    .map((m) => `<button class="paper member-row" data-realm="${m.realm}">${ui.pennant(m.realm)}<span><b>${esc(ui.name(m.realm))}</b><small>holds ${plural(m.provinces, "province")} of Japan${m.realm === v.court.holder ? " · holds the Court" : ""}</small></span></button>`)
    .join("")}</div>`;
}

/** INST-066, INST-068: who holds Kyoto, Ask the Court or why not, and the shogun's Close the country (with its port) or Open the ports. */
function courtFold(v: ShogunateView, ui: InstitutionsUi): string {
  const where = v.court.province >= 0 ? esc(ui.province(v.court.province)) : "Kyoto";
  const holder = v.court.holder >= 0 ? `<button class="paper member-row" data-realm="${v.court.holder}">${ui.pennant(v.court.holder)}<span><b>${esc(ui.name(v.court.holder))}</b><small>holds ${where}, the Court's province</small></span></button>` : `<p>No one holds ${where}.</p>`;
  const ask =
    v.shogun >= 0
      ? ""
      : v.askWhyNot
        ? `<p class="hint">Ask the Court: ${esc(v.askWhyNot)}.</p>`
        : `<button class="wax wide" data-ask-court>${icon("crown", 1)}Ask the Court</button><p class="hint">The Court makes you shogun: you take the shogunate at no gold, with hold 40, and every other member is asked to swear to you.</p>`;
  return `${holder}${ask}${v.role === "Shogun" ? closedCountry(v, ui) : v.closed ? `<p>The country is closed: foreign traders trade only at ${esc(ui.province(v.closed.port))}.</p>` : ""}`;
}

function closedCountry(v: ShogunateView, ui: InstitutionsUi): string {
  if (v.closed) return `<h4>The closed country</h4><p>Foreign traders trade only at <b>${esc(ui.province(v.closed.port))}</b>; foreign faiths send no missionaries in; hold +2 a year.</p><button class="paper wide" data-open-ports>Open the ports</button>`;
  const head = `<h4>Close the country</h4><p class="hint">Foreign traders would trade only at the one port you name, foreign faiths send no missionaries in, and hold gains 2 a year, until you open the ports.</p>`;
  if (v.closeWhyNot) return `${head}<p class="hint">Close the country: ${esc(v.closeWhyNot)}.</p>`;
  if (!v.ports.length) return `${head}<p class="hint">Close the country: you hold no port to keep open.</p>`;
  return `${head}<button class="${shogunateUi.picking ? "paper on" : "wax"} wide" data-close-pick aria-expanded="${shogunateUi.picking}">Close the country</button>
    ${shogunateUi.picking ? `<p class="hint">Which port stays open to foreign traders?</p><div class="choices">${v.ports.map((p) => `<button class="paper" data-close-port="${p}">${esc(ui.province(p))}</button>`).join("")}</div>` : ""}`;
}

function shogunHoldFold(v: ShogunateView): string {
  const gain = v.year.filter((l) => l.number > 0), lose = v.year.filter((l) => l.number < 0);
  return `${holdBar(v)}
    <p class="hint">Hold is how strong the shogun is over the houses: Hollow under 20, Weak under 50, Firm under 80, then Strong. It is counted each January; each season the houses read it, warming at Firm or Strong and cooling at Hollow.</p>
    <h4>This year so far</h4>
    ${gain.length || lose.length ? lines("Gains", gain) + lines("Losses", lose) : `<p class="hint">Nothing yet; with no house in revolt, hold gains 3 in January.</p>`}
    ${v.record.length ? `<h4>Last year's count</h4>${lines("Gains", v.record.filter((l) => l.number > 0))}${lines("Losses", v.record.filter((l) => l.number < 0))}` : ""}`;
}

/** INST-083: the oath's answer card in the News: Swear or Refuse, the reasons count on tap; silence is a refusal. */
export function oathAnswerCard(v: ShogunateView | null, ui: InstitutionsUi): string {
  const o = v?.oath;
  if (!v || !o) return "";
  return `<div class="call framed-soft empire-ask oath-ask">
    <p>${icon("crown", 2)}<span><b>Swear to the shogun:</b> the Court has made ${esc(ui.name(o.shogun))} Shogun and asks you to swear. Sworn, your realm becomes one of its great houses with its land, Wavering; refusing, you stay a realm and the shogun may bring you to heel. Answer by ${esc(ui.month(o.ends))}.</span></p>
    <div class="choices two"><button class="wax" data-oath="1">Swear</button><button class="paper" data-oath="0">Refuse</button></div>
    <details class="inst-fold small"><summary><b>Your reasons</b><small>${signed(o.total)} · ${o.total > 0 ? "they say swear" : "they say refuse"}</small></summary><div class="inst-body"><dl class="facts">${o.reasons.map((r) => `<dt>${esc(r.name)}</dt><dd>${signed(r.number)}</dd>`).join("")}</dl></div></details>
    <p class="hint">If you don't answer, it counts as a ${SILENCE.oath}.</p>
    <button class="paper" data-shogunate-open>Open the Shogunate card</button>
  </div>`;
}

/** How many of the Shogunate's answer cards wait on the player (the News plaque's count). */
export const shogunateAsks = (v: ShogunateView | null): number => (v?.oath && !v.ended ? 1 : 0);

/** INST-084: the Institutions map mode's key, each colour with its pattern in words. */
export function institutionsKey(colours: Record<string, string>, pattern: (colour: string) => string = () => ""): string {
  const sw = (k: (typeof INSTITUTIONS_KEY)[number]) => `<i class="swatch${k.pattern === "hatched" ? " hatched" : k.pattern === "seat mark" ? " seat" : k.pattern === "house border" ? " house" : ""}" style="background:${colours[k.colour] ?? "#ccc"};${pattern(k.colour)}"></i>`;
  return `<div class="lens-key">
    ${INSTITUTIONS_KEY.map((k) => `<span>${sw(k)}${k.what} <small>(${k.colour}, ${k.pattern})</small></span>`).join("")}
    <p>Electors and the Shogun carry a crown mark when zoomed in; a dashed border and a pattern of small crosses set each great house of Japan apart. Tap a member for the Empire card, Japan for the Shogunate card.</p>
  </div>`;
}
