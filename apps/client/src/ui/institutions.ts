import type { EmpireView, SeatView } from "@ph/engine";
import { EMPIRE_FOLDS, INSTITUTIONS_KEY, SILENCE, empireBadge, institutionRow } from "@ph/engine/domain/institutions";
import { icon } from "../art/ui.ts";

/**
 * The institutions on screen (INST-080 to INST-085, slice 1: the Empire):
 * the Institutions row on the player's own Diplomacy tab, the badge on a
 * member's country card, the Empire card with its four folds, its answer
 * cards in the News and the key of the Institutions map mode. The words come
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
}

/** Which of the Empire card's folds are open and which seat's reasons show; kept between redraws. */
export const empireUi = { open: new Set<string>(["Election"]), seat: null as string | null };

/** The tally in words and numbers: "Bavaria 4 · Austria 2 · Saxony 1". */
export const tallyText = (v: EmpireView, ui: InstitutionsUi) => v.tally.map((t) => `${esc(ui.name(t.candidate))} ${t.votes}`).join(" · ");

/** INST-080: the Institutions row on the player's own Diplomacy tab, one 44-point line per institution they belong to. */
export function institutionsRows(v: EmpireView | null, ui: InstitutionsUi): string {
  if (!v || !v.role || v.ended) return "";
  const text = institutionRow({ name: v.name, office: "Emperor", holder: v.emperor >= 0 ? ui.name(v.emperor) : "none", hold: v.hold, role: v.role });
  return `<h3 class="sub">Institutions</h3>
    <button class="paper institution-row" data-empire-open>${icon("crown", 1)}<span>${esc(text)}</span></button>`;
}

/** INST-080: the badge on a member's country card (Emperor, Elector, Empire); it opens the Empire card. */
export function empireBadgeHtml(v: EmpireView | null, realm: number): string {
  if (!v || v.ended) return "";
  const role = v.emperor === realm ? "Emperor" : v.seats.some((s) => s.realm === realm) ? "Elector" : v.members.some((m) => m.realm === realm) ? "Member" : null;
  const word = empireBadge(role);
  return word ? `<button class="paper empire-badge" data-empire-open title="Opens the Empire card">${icon("crown", 1)}${word}</button>` : "";
}

/** The hold bar: the number and its word, never colour alone (INST-085). */
const holdBar = (v: EmpireView) =>
  `<div class="hold-bar" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${v.hold}" aria-label="Hold ${v.hold}, ${v.word}"><i style="width:${v.hold}%"></i><span>Hold ${v.hold} · ${v.word}</span></div>`;

const fold = (name: string, summary: string, body: string) =>
  `<details class="inst-fold" data-fold="${name}"${empireUi.open.has(name) ? " open" : ""}><summary><b>${name}</b><small>${summary}</small></summary><div class="inst-body">${body}</div></details>`;

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
    ${fold(reforms, "none passed yet", reformsFold(v))}
    ${fold(members, `${v.members.length} members`, membersFold(v, ui))}
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

const LADDER: [string, string][] = [
  ["Public Peace", "A member that makes war on another member is a Breaker of the Peace: the Emperor and every member may make war on it."],
  ["Imperial Court", "A member may take a claim on another member's province to court instead of going to war."],
  ["Circles", "When an outsider attacks a member, every member of its circle joins the defence."],
  ["Common Tax", "Every member pays the Emperor 5 % of its tax each month, in place of the dues."],
  ["Imperial Army", "In a war to defend the Empire the Emperor commands a tenth of every member's soldiers."],
  ["Hereditary Crown", "The Emperor's heir takes the crown; no more elections."],
  ["One Realm", "The Empire becomes one realm: every other member's ruler becomes a great lord of the Emperor."],
];

function reformsFold(v: EmpireView): string {
  const [next, does] = LADDER[0]!;
  return `<ol class="ladder">${LADDER.map(([n], i) => `<li class="${i === 0 ? "next" : ""}">${icon(i === 0 ? "scroll" : "hourglass", 1)}<span>${n}${i === 0 ? " <small>next</small>" : ""}</span></li>`).join("")}</ol>
    <p><b>Next: ${next}.</b> ${does} Passing it spends 30 hold; failing, 10.</p>
    <p class="hint">The Emperor may call the Diet once hold reaches 50${v.hold >= 50 ? " (it has)" : ` (it is ${v.hold})`}.</p>`;
}

function membersFold(v: EmpireView, ui: InstitutionsUi): string {
  return `<div class="members">${v.members
    .map((m) => {
      const badges = [m.realm === v.emperor ? "Emperor" : "", m.seat ? `Seat: ${m.seat}` : "", m.atWarWithMember ? "At war with a member" : "", m.landHeld ? `Land held by outsiders (${m.landHeld})` : ""].filter(Boolean);
      return `<button class="paper member-row" data-realm="${m.realm}">${ui.pennant(m.realm)}<span><b>${esc(ui.name(m.realm))}</b><small>${m.provinces} province${m.provinces === 1 ? "" : "s"} · ${esc(ui.faith(m.faith))}</small>${badges.length ? `<span class="badges">${badges.map((b) => `<em class="badge${/war|outsiders/.test(b) ? " down" : ""}">${esc(b)}</em>`).join("")}</span>` : ""}</span></button>`;
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
    <p>Dues to the Emperor: <b>${v.dues.toFixed(1)} gold a month</b> (1 per member, times hold ÷ 100), in the Emperor's tribute line.</p>`;
}

/** Whether the player holds a seat (the view marks their own seat's Seek button). */
const hasOwnSeat = (v: EmpireView) => v.seats.some((s) => s.seekWhyNot === "your own seat");

/** INST-083: the election's answer card in the News, while the player holds a seat. */
export function electionAnswerCard(v: EmpireView | null, ui: InstitutionsUi): string {
  if (!v?.election || !hasOwnSeat(v)) return "";
  return `<div class="call framed-soft empire-ask">
    <p>${icon("crown", 2)} <b>The Empire elects its Emperor:</b> ${esc(v.election.why)}</p>
    ${voteButtons(v, ui)}
    <button class="paper" data-empire-open>Open the Empire card</button>
  </div>`;
}

/** INST-084: the Institutions map mode's key, each colour with its pattern in words. */
export function institutionsKey(colours: Record<string, string>): string {
  const sw = (k: (typeof INSTITUTIONS_KEY)[number]) => `<i class="swatch${k.pattern === "hatched" ? " hatched" : k.pattern === "seat mark" ? " seat" : ""}" style="background:${colours[k.colour] ?? "#ccc"}"></i>`;
  return `<div class="lens-key">
    ${INSTITUTIONS_KEY.map((k) => `<span>${sw(k)}${k.what} <small>(${k.colour}, ${k.pattern})</small></span>`).join("")}
    <p>Electors carry a crown mark when zoomed in. Tap a member for the Empire card.</p>
  </div>`;
}
