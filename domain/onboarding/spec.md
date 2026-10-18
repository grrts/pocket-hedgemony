# Onboarding (TUT)

## 1. Purpose and scope

This context decides how a new player learns Pocket Hegemony on a phone, with a mouse and keyboard, or with a
controller. It owns four layers: the tutorial campaign "The Year of Varna" (the Ottomans, 11 November 1444
to 1447), guided first turns, the content of the Needs attention list, and tooltips, "Why?" and the Almanac
(the in-game encyclopedia). It also owns the tutorial's pacing tools, its scenario file and step script, the
lesson actions per input, tutorial progress, and the measuring of tutorial use.

**In scope**
- Onboarding principles (teach by doing, one idea per step, short sessions, never trap, same lesson on every
  device, explain why a number moved, teach 1444 first).
- The ten tutorial chapters (0–9), their dates, turns, lessons and "Done when" conditions; going off script.
- Pacing tools: Advance to…, Input focus with Free look, Quiet world, Battle at watch speed.
- The tutorial scenario file (start state, world rules, scripted `tutorial_only` events, chapter saves, steps).
- The lesson on the crusade after Varna on the religion, diplomacy, warfare and troop movement rules; the Janissary lesson.
- Step script format, step kinds, text tokens, the look of a step (note, spotlight, face, counter), the
  tutorial's pause-menu lines.
- Guided first turns (goals list).
- What goes on the Needs attention list: kinds, checks, removal, muting, cooldowns.
- Tooltips, "Why?", linked words, the Almanac's sections, search and tips list.
- Lesson actions per input and prompt swapping.
- Starting, skipping, returning, continuing the tutorial save as a campaign.
- Tutorial accessibility and translation rules; consent-only measuring.

**Not in scope (owned by …)**
- The Needs attention / Attention screen itself, where it opens, the first-launch question's place in the flow,
  the main menu, the pause menu, loading screen (game-shell).
- Where tutorial progress and mutes are stored, chapter saves shipping read-only, ironman (saves).
- Tooltip delay, "Reset tutorial and hints", reduced motion, UI scale (settings).
- Achievements (achievements): the tutorial earns none.
- Sounds for steps and hints (audio).
- Final input mapping and glyph sets (input scheme thread, gap list 2, item 9: no context folder yet).
- Whether Advance to… is a real-game feature; the turn report (game-shell / turn report thread).
- The devshirme in a real campaign (recruiting; sensitive-history thread). This design only proposes it.
- The art (pointing hand sprite, vizier portrait, spotlight edge), localisation string tables and glossary
  file (art list, localisation threads).
- Every system's rules that lessons use (realm, province, recruiting, warfare, troop-movement, religion,
  diplomacy, research, rebellions, events).

## 2. Sources

Newest decision first.

1. `tutorial/tutorial-design.md` v5 (16 Oct 2026): "Changes since version 4" (3.7 Janissaries shown); v4
   (Varna crusade on religion design, Straits on troop movement); v3 (full religion system, no advisor after
   the tutorial, Needs attention screen, no achievements); v2 (Ottomans 1444–1447, history's dates).
2. `tutorial/tutorial-design.md` §13 "Settled (16 Oct)" and "Still open".
3. `tutorial/tutorial-design.md` §1–§12.
4. `planning/gap-lists.md` "Decisions already made" (span; free tier Ottomans and France, List 1 item 2;
   List 2 item 6 Onboarding).
5. Cross-checked, not owned: `screen-flow/screen-flow-design.md` G9 Attention, S4 Main menu, screen list §9;
   `settings/settings-design.md` gameplay rows; `save-system`; `sound-effects/README.md` §14;
   `achievements/achievements-design.md` §5.2, §10.

## 3. Ubiquitous language

| Term | Meaning | Not to be confused with |
|---|---|---|
| Tutorial campaign | "The Year of Varna": ten short chapters as the Ottomans, 11 November 1444 to 1447 | Guided first turns |
| Chapter | One lesson of about 5 minutes, started from its own fixed chapter save | A turn |
| Chapter save | A save per chapter made by playing the previous chapter's recommended path in the engine; rebuilt by a tool, never hand-edited; shipped read-only | A campaign save |
| Step | One entry of the step script: one thing to look at or do, in one or two short lines | A turn |
| Step kind | `look` (ends on confirm or a tap anywhere), `do` (ends when its condition is met; no Next), `choose` (ends on any choice; next step reacts), `watch` (plays a turn or battle; ends when it does) | |
| Note | The parchment strip at the bottom edge (or top) that holds a step's text, the face and the counter | Tooltip |
| Spotlight | The cut-out with a gold edge over a step's anchor; the rest is dimmed to 50 % | |
| Anchor | What a step's pointer and spotlight sit on | |
| Input focus | During a `do` step, only the controls on the step's `allow` list respond; the rest is dimmed, not hidden | Focus navigation (controller) |
| Free look | A small button that lifts the input focus for the step | |
| Advance to… | Tutorial-only ribbon that runs several turns to a named date and shows one combined turn report | End turn |
| Quiet world | Scenario rule that holds back AI wars against the Ottomans except scripted ones, and AI wars in the Balkans and western Anatolia (Karaman included) | |
| Battle at watch speed | The chapter 5 border clash at Giurgiu always opens the battle screen, slowed to one bell every 3 seconds | |
| Guide face | The grand vizier, Çandarlı Halil; appears only in the tutorial | An advisor (there is none after the tutorial) |
| Guided first turns | A goals list under the top bar for the first in-game year of a campaign | Tutorial |
| Goal | One entry of guided first turns: opens one screen once and ticks off | Achievement |
| Show me | A goal's button that runs the matching tutorial steps in the current campaign, without scenario overrides | Show (Needs attention) |
| Needs attention | The game shell's screen of what needs the player: Warnings, then Waiting for you (opportunities, then New entries), each line with a Show button (D-TUT-1) | Turn report (what happened) |
| Check | A config rule read each turn after the simulation that adds a Needs attention entry | |
| Warning | Something bad will happen soon unless the player acts; listed first | |
| Opportunity | Something good the player can take now, stated as a fact; listed under Waiting for you | |
| New entry | A system shows up for the first time in this campaign; links to its Almanac page | |
| Mute a kind | "Don't list this kind again" for one kind of entry; undone in Settings | Mute this (one entry) |
| Tooltip | The stat's name and one line on what it is | Why? |
| Why? | The full gain and lose list with this month's numbers and an Almanac link | |
| Linked word | A game term linked to its Almanac entry the first time it appears in a text | |
| Almanac | Offline in-game encyclopedia: How to play, Stats, Inventions, Troops and commanders, Ground, Realms, Events seen | Event tree |
| Practice this | Almanac How-to-play button that opens the matching chapter | |
| Tips list | `tips` list linking each loading-screen tip to its Almanac entry | |
| Button token | `{btn:…}` text token that becomes the prompt for the player's current input | |
| "Began as the tutorial" | Mark on a tutorial save continued as a campaign; such a save is not ironman | |
| Devshirme | The historical collection of Christian boys for the Janissary corps; shown in chapter 4 as a `narrative_only` vignette | A recruiting action |

## 4. Domain model

### Aggregates

**TutorialScenario** (identity: the scenario file)
- Start state: the normal 11 November 1444 setup (X-5, D-TUT-9), with Mehmed II (12) on the throne and Murad II
  retired at Manisa as in the catalogue, and overrides only where the tutorial needs them: Çandarlı Halil grand vizier; Evrenos, Mihal and Turahan families as lords, one wavering; one
  royal province in Anatolia with no official; a fixed seed; the Christian sipahis' lord card (Wavering); the
  Orthodox row of the Faith policy set to Restricted; the crusade league's war still open, with the league
  holding the Defend the faith aim from the start. The 1444 map already gives the Ottomans Edirne and
  Varna and Byzantium the Morea (`owners-1444.json`).
- World rules: quiet-world regions and dates; forced AI personalities (Hungary crosses the Danube at Giurgiu in
  chapter 5 with Hunyadi commanding; Hungary offers terms after failing to take one castle in two months if
  the border clash was lost; the Morea accepts terms after the wall falls).
- Scripted events (event tree format, `tutorial_only: true`, keeping the event tree's `history` block with
  sources; they stay in the tutorial scenario file, D-TUT-9): Murad goes back to Manisa (November 1444); the
  crusaders' fleet on the Danube (summer 1445); the Janissary pay rising and Murad's return (1446).
- Chapter saves 0–9, steps (the script).
- INV-TUT-1: scripted events with `tutorial_only: true` never fire in a real campaign.
- INV-TUT-2: no event is moved off its historical date.
- INV-TUT-3: chapter saves are rebuilt by a tool from the recommended path, never edited by hand.
- INV-TUT-4: the same chapter save and the same orders always give the same result (engine determinism).

**TutorialProgress** (identity: the player profile; stored by saves, apart from campaign saves)
- Holds: chapters done; the current chapter and step (to resume mid-chapter); muted Needs attention kinds;
  first-time entries already seen; goals list closed for good or not.
- INV-TUT-5: closing the app mid-chapter brings the player back to the same step.

**StepScript** (identity: chapter)
- Steps with `id`, `kind`, `text` (string key), `anchor`, `allow`, `done`, `guide_face`, `max_chars` (140).
- INV-TUT-6: every step text fits 140 characters per language (lint).
- INV-TUT-7: every step and every chapter can be skipped.

**NeedsAttentionList** (identity: campaign)
- Entries (kind, line, place or screen, cause), muted kinds, per-check cooldowns.
- INV-TUT-8: warnings come first.
- INV-TUT-9: an entry leaves when its cause ends or the player dismisses it.

**GoalsList** (identity: campaign; first in-game year only)
- Goals with done state; folded or open; closed for good.

**Almanac** (identity: game version and campaign)
- Sections and entries; generated parts read config; Realms hidden until met; Events seen per campaign.
- INV-TUT-10: Almanac numbers come from config.
- INV-TUT-11: every stat key has a tooltip line and an Almanac entry (lint).

### Entities and value objects

- **Chapter** (entity): number, name, date span, approximate turns, lessons, Done-when condition.

| # | Chapter | Date | Turns | Teaches | Done when |
|---|---|---|---|---|---|
| 0 | The map | November 1444 | 0 | Pan and zoom through world, region and local view; select a province; open its card; switch a lens (Food, then Faith); find the capital, the Straits and Varna | The player has opened Edirne's province card and seen the Food and Faith lenses |
| 1 | A month at a time | November 1444 – January 1445 | 3 | Country card; gold and food at a glance; End turn; the turn report; the first event (Murad goes back to Manisa; let him go, or ask him to stay this winter) | The Manisa event is answered and the turn report is read |
| 2 | A boy on the throne | February – April 1445 | 3 | Ruler and heirs; why a child ruler and new reign make lords waver; the lords list (Evrenos, Mihal, Turahan); what a lord wants; royal provinces versus lords' lands; hiring an official for a province with none; tax rates | An official is placed, and one wavering lord has been given his want, given a gift, or left alone (each fine; the turn report shows the result) |
| 3 | Bread and castles | May – September 1445 | 1 + advance | Food lives in provinces; castles collect and spread it; reach rings; the Food policy screen and presets; the September harvest; ends when news arrives that the crusaders' fleet is on the Danube | A preset is chosen, the harvest turn is played, and the player opens one hungry province's "Why?" |
| 4 | Men under arms | September 1445 | 3 | The crusade still at war, its league and its Defend the faith aim; the Faith policy choice for the Orthodox; ferrying troops over the Bosporus; the levy screen in Thrace; levies versus trained regiments; the Janissaries as a standing regiment and how they were raised; calling the lords' riders; giving command to an official made Marshal (X-7); standing orders | An army of levies, lords' riders and Janissaries stands with a commander |
| 5 | The Danube frontier | October – November 1445 | 4–6 | Marching and days to cross; the food reserve; seeing the enemy (the crusade first as a rumour); a small border clash with Hunyadi's crossing at Giurgiu, on the battle screen; after the battle, including what the faith choice changed; terms; peace voices; making peace | Peace is signed (losing the battle is allowed; the chapter adapts) |
| 6 | Schools and inventions | early 1446 | 2 + advance | Madrasas, students and scholars; schools have a faith; a served, protected community on a province's Faith line; choosing what to study; every student is a recruit the army can't raise | An invention is chosen and the player has seen the recruit pool shrink |
| 7 | The Janissaries' pay | 1446 | 3–4 | A rising of unpaid soldiers in Edirne; the rebellion card; the five answers (grant, talk, bribe, wait, attack); then an event: Murad takes the throne back, or Mehmed rules on | The rising ends by any means |
| 8 | The wall at Corinth | November – December 1446 | 4–6 | Declaring a war yourself; marching into the Morea; laying siege to the Hexamilion; the siege month by month; storming with guns; terms | The wall falls or terms are agreed |
| 9 | Your realm now | 1447 | — | One-screen recap with Almanac links; keep playing these Ottomans or start a new campaign | The player picks one |

Total: about 30 to 40 turns and 45 to 50 minutes, in sessions of about 5 minutes. Under X-18 a turn is one week: the Turns column counts weekly End turn presses, and each chapter uses Advance to… to cover the rest of its date span, so the chapter dates and lengths stay as listed. Durations in months (the goals list's first in-game year, cooldowns) stay in months.

- **Step** (entity): as in the script format.
- **Text token** (value): `{btn:confirm}` and other actions → the current input's prompt; `{ui:food_policy}` →
  the screen's name in bold plus icon; `{stat:gold}` → stat icon and name linked to its Almanac entry;
  `{place:edirne}`, `{lord:turahan}` → the name, linked; tapping moves the camera there.
- **Goal** (value): Look over your realm (Country card; opened); Choose how your castles share food (Food
  policy; a preset or setting chosen); Check your lords (lords list; opened); Put an official in every royal
  province (Officials; no royal province without one, or dismissed); Choose what your scholars study
  (Research; an invention chosen); Know your neighbours (the realms around you, from the country card;
  opened); End your first turn (End turn; pressed).
- **Check** (value): kind, condition, line, source, cooldown. Design examples:

| Kind | Check | Line | Source |
|---|---|---|---|
| Warning | A province's local store will reach zero before the next harvest | "Sofia will run out of bread by March." | Country stats 3 |
| Warning | An army's food reserve is under 15 days | "Murad's army has twelve days of food left." | Warfare 6 |
| Warning | A lord turns Wavering or Disloyal | "Turahan Bey grows cold toward you. He wants a war on the Morea." | Country stats 5.5 |
| Warning | Pay owed to soldiers | "Your soldiers have not been paid for two months." | Warfare 3.4 |
| Warning | Gold will run out in under three months at this rate (X-18: measured by the date) | "At this pace the treasury is empty by June." | Country stats 2 |
| Warning | A harvest is near and many farmers are levied | "Five thousand farmers are under arms with the harvest three weeks away." | Recruiting 2.1 |
| Warning | Grievances in a province pass the rising threshold | "Talk of rising in Edirne." | Rebellions 2.1 |
| Warning | A royal province has no official | "Bursa pays half its taxes without an official." | Country stats 4 |
| Opportunity | A neighbour's lord is disloyal and borders you | "A lord across the border may be won over." | Country stats 5.3 |
| Opportunity | A castle has more grain than it can hold (sell the surplus to the treasury, X-6) | "Edirne has more than it can hold." | Country stats 3.3 |
| New | First war, siege, battle, rising, famine or plague | One line, linked to the Almanac | Warfare 7, 8, 10; rebellions; province stats 6.2, 12.2 |
| New | First invention of a new era; a new age begins | One line on what changes | Research tree; event tree |

- **Almanac section** (value):

| Section | Contents | Written how |
|---|---|---|
| How to play | One page per system, matching the chapters, each with Practice this | By hand, short |
| Stats | Per stat: what it is, gain and lose list, which screens show it | Generated from the designs' tables (in config), hand-written opening line |
| Inventions | Each invention, what it needs, what it unlocks | Generated from research tree data |
| Troops and commanders | Arms, kinds, commander styles, by era | Generated from warfare data |
| Ground | The 22 tile types and their effects on troops, buildings and people | Generated from terrain data |
| Realms | Every catalogue country met so far: short history, strengths once designed | Generated from the catalogue; hidden until met |
| Events seen | Events fired in this campaign with their `history` block | Generated from the event tree |

- **Input action** (value), touch / mouse and keyboard / controller (proposal):

| Action | Touch | Mouse and keyboard | Controller (proposal) |
|---|---|---|---|
| Pan the map | Drag | Drag, or WASD and arrows | Left stick moves the cursor; map follows at the edge |
| Zoom | Pinch; double-tap to zoom in | Wheel; + and − | Right stick up and down |
| Select | Tap | Click | A / Cross |
| Back, close | Close button | Esc, right-click on a panel | B / Circle |
| Info | Long-press | Hover; I | Y / Triangle |
| Action menu | Action menu button on the selection | Right-click; Space | X / Square |
| Move an army | Tap army, tap Move, tap target | Select, right-click target | Select, X / Square for Move, cursor to target, A / Cross |
| Cycle my armies | Tap the army count in the top bar | Tab | LB and RB / L1 and R1 |
| Cycle lenses | Lens button, then pick | L | LT and RT / L2 and R2 |
| Country card | Realm's pennant in the top bar | C | View / Share |
| End turn | Hourglass button, lower right | Enter | Hold Menu / Options for half a second |
| Pause menu | Menu button | Esc with nothing open | Menu / Options, short press |
| Skip a tutorial step | Skip step on the note | Skip step on the note | Hold B / Circle for one second |

### Proposals to other contexts (not rules here)

- **Devshirme in a campaign** (declined, D-TUT-8: it stays narrative only in the tutorial): runs while a realm holds the
  *Kapıkulu household* birthright; no action to take more boys or collect sooner; a collection every 5 years
  (config); boys taken shown on each province's People line; a new grievance *Sons taken* for 10 years in each
  province collected from; Orthodox and Catholic lords there waver one step; a share of families leave as
  refugees; the one lever is to end it, after which the corps refills from paid volunteers at a higher gold
  cost; history: collections faded in the 1600s, corps abolished in 1826 (`tanzimat` event); Ottoman AIs keep
  it until the event tree's history ends it.
- **Next pass**: no diplomacy or subject steps are added (D-TUT-10).

### Domain services

- **StepRunner**: shows a step, applies input focus, waits for its end condition, handles idle hints and skip.
- **AttentionChecker**: reads every check after each turn's simulation; in the tutorial drives the vizier's notes.
- **PromptResolver**: turns button tokens into the prompts for the last input used.
- **AlmanacGenerator**: builds generated sections from config and data.

## 5. Requirements

### Principles
- TUT-001 The onboarding context shall teach every lesson as an action the player takes on the real map with the real screens, with no slideshow and no tutorial-only UI the real game doesn't have (except the tutorial's own pacing tools and note). [tutorial §1.1, §3.3]
- TUT-002 The onboarding context shall make each step name one thing to look at or one thing to do, in one or two short lines. [tutorial §1.2]
- TUT-003 The onboarding context shall split the tutorial into chapters of about 5 minutes each. [tutorial §1.3]
- TUT-004 When a player who closed the app mid-chapter returns, the onboarding context shall resume at the same step. [tutorial §1.3]
- TUT-005 The onboarding context shall let every step and every chapter be skipped and the whole tutorial be left at any time, and shall lock nothing in the game behind it. [tutorial §1.4]
- TUT-006 The onboarding context shall write each step once, with button tokens that become the right prompt for touch, mouse and keyboard, or controller. [tutorial §1.5]
- TUT-007 The onboarding context shall teach the 1444 game in the tutorial and teach systems that only matter later through New entries on the Needs attention list and the Almanac, with no tutorial chapters for later eras. [tutorial §1.7, §13 settled]
- TUT-008 The onboarding context shall use no tutorial text, character name or screen name from Europa Universalis IV or other Paradox games. [tutorial intro]

### Layers
- TUT-009 The onboarding context shall provide four layers: the tutorial campaign, guided first turns, the Needs attention list, and tooltips with "Why?" and the Almanac. [tutorial §2]
- TUT-010 While a player has skipped the tutorial and guided turns, the onboarding context shall still provide the Needs attention list, tooltips, "Why?" and the Almanac. [tutorial §2]

### Tutorial campaign
- TUT-011 The onboarding context shall run the tutorial as the Ottomans from 11 November 1444 (X-5) to 1447 in ten chapters (0–9), keeping history's own dates and moving no event to fit the lesson plan. [tutorial §3, §3.2, §13 settled]
- TUT-012 The onboarding context shall start each chapter from its own fixed chapter save, so it can be played or replayed alone. [tutorial §3.2]
- TUT-013 When a chapter's Done-when condition is met, the onboarding context shall mark the chapter done, for each chapter as listed in §4. [tutorial §3.2]
- TUT-014 When the player's choices differ from history, the onboarding context shall carry the chapter on from what happened, as a real campaign would. [tutorial §3.2 History]
- TUT-015 When the next chapter starts, the onboarding context shall put the world back on its historical course through that chapter's save, carrying no off-script choice over (D-TUT-3), and say so in one line on its opening card. [tutorial §3.2 History]
- TUT-016 The onboarding context shall keep the event tree's `history` block with sources on every scripted event. [tutorial §3.2, §3.4]
- TUT-017 The onboarding context shall use the Ottomans as the tutorial nation, which are in the free tier, so the whole tutorial works without a purchase on every store and in the Steam demo. [tutorial §3.1, §9; gap-lists List 1 item 2]
- TUT-018 The onboarding context shall use its own Ottoman set of numbers for the recruiting, battle and siege lessons (`ottoman_examples`, provisional: 1,000 Janissaries, 4,000 levies, 2,000 lords' riders, a crusader army of 16,000, the Hexamilion holding 2 months), made the same way as the French worked examples (D-TUT-11). [tutorial §3.1 Cost]

### Pacing tools
- TUT-019 Where the tutorial offers Advance to…, the onboarding context shall run several weekly turns in a row (X-18) to a named date and show one combined turn report; every chapter whose date span is longer than its turns offers it. [tutorial §3.3]
- TUT-020 While a `do` step is shown, the onboarding context shall let only the controls on the step's `allow` list respond and dim everything else without hiding it. [tutorial §3.3, §3.8]
- TUT-021 When the player presses Free look, the onboarding context shall lift the input focus for that step. [tutorial §3.3]
- TUT-022 While the tutorial runs, the onboarding context shall hold back every AI war against the Ottomans except the scripted ones, and every AI war in the Balkans and western Anatolia (Karaman included). [tutorial §3.3, §3.4]
- TUT-023 When the chapter 5 border clash at Giurgiu starts, the onboarding context shall always open the battle screen, slowed to one bell every 3 seconds. [tutorial §3.3]

### Scenario file
- TUT-024 The onboarding context shall hold the tutorial as data in one scenario file: start state, world rules, scripted events, chapter saves and steps. [tutorial §3.4]
- TUT-025 The onboarding context shall start from the normal 11 November 1444 setup, with Mehmed II as ruler and Murad II retired as in the catalogue, and overrides only where the tutorial needs them (grand vizier, the crusade war left open, the three lord families with one wavering, one Anatolian royal province with no official, a fixed seed, the Christian sipahis' lord card, the Orthodox row set to Restricted). [tutorial §3.4, §3.6]
- TUT-026 The onboarding context shall mark every scripted event `tutorial_only: true` so it never fires in a real campaign. [tutorial §3.4]
- TUT-027 The onboarding context shall force AI personalities so that Hungary crosses the Danube at Giurgiu in chapter 5 with Hunyadi commanding and the Morea accepts terms after the wall falls. [tutorial §3.4]
- TUT-028 When rules change, the onboarding context shall rebuild every chapter save with a tool by playing the previous chapter's recommended path, never editing a save by hand. [tutorial §3.4]
- TUT-029 The onboarding context shall have a CI test that plays each chapter's recommended path from its chapter save and checks it reaches Done when. [tutorial §3.4]

### Off script
- TUT-030 If the player asks Murad to stay in chapter 1, then the onboarding context shall keep Murad at Edirne as a commander for the rest of chapter 1 only; chapter 2 starts from its chapter save with Murad back at Manisa (D-TUT-3). [tutorial §3.5]
- TUT-031 If the player loses the border clash at Giurgiu, then the onboarding context shall change the step to "Your army broke. Fall back behind the walls of Edirne and call the levy.", and Hungary shall offer terms after failing to take one castle in two months, so the chapter still ends in peace. [tutorial §3.5]
- TUT-032 If the player ignored the wavering lord, then the onboarding context shall let his loyalty drop one step within chapter 2 and show it in the turn report; chapter 7 starts from its chapter save, where his riders come as in history (D-TUT-3). [tutorial §3.5]
- TUT-033 If the player is idle on a `do` step for 8 seconds, then the pointer shall pulse on the target again; after 20 seconds the note shall add "Stuck? {btn:skip_step} to skip this step." [tutorial §3.5]
- TUT-034 If the player is short of the gold a chapter needs at its start, then the onboarding context shall fill the gap with a scripted loan from a Genoese or Venetian banking house, shown as a real debt line. [tutorial §3.5]
- TUT-035 If the storm fails in chapter 8, then the siege shall carry on month by month until the wall is breached or the Morea offers terms. [tutorial §3.5]

### The crusade after Varna on the religion system
- TUT-036 The onboarding context shall build the crusade lesson (the crusade broken at Varna, still at war in 1445) on the full religion system, the event-started leagues, the war aims and strait crossings already designed. [tutorial §3.6]
- TUT-037 The tutorial's start state shall hold the crusading league against the Ottomans still at war (regardless of the usual threshold), with Hungary, Wallachia and the Papal States as members and Venice and Burgundy sending fleets; when the news of the crusaders' fleet on the Danube arrives (chapter 3's last turn), the country card shall show "League against the Ottomans: 3 members, 24,000 soldiers" (soldiers provisional). [tutorial §3.6]
- TUT-038 The start state shall give the league the Defend the faith aim from the start (a Restricted policy does not qualify, and no event grants it, D-TUT-9), and the war screen shall show the aim, its cause and one linked line explaining why this aim and not Take land. [tutorial §3.6]
- TUT-039 When the player taps a league member, the onboarding context shall open that member's reasons (Same faith +10 between Catholic members; "Our ally's war aim is our concern"), the same screen used for the player's own alliances. [tutorial §3.6]
- TUT-040 While the crusaders' fleet holds the Dardanelles, the crossing shall show as closed with the fleet's banner on it. [tutorial §3.6]
- TUT-041 In chapter 0, after the Food lens, the onboarding context shall have the player switch to the Faith lens, showing Rumelia as Orthodox under a Sunni realm with hatching where a community is 30 % or more, with the line "Most of your people in Rumelia are Orthodox Christians. You rule them as a Sunni sultan." [tutorial §3.6]
- TUT-042 In chapter 4, when the league calls on the sultan's Christian subjects to rise, the vizier shall open the Faith policy screen at the Orthodox row set to Restricted and the player shall choose between Keep it Restricted and Tolerate it. [tutorial §3.6]
- TUT-043 When the player keeps the Orthodox Restricted, the faith tax keeps paying for the war and the Christian sipahis stay at Wavering, so they don't bring their retinue when called. [tutorial §3.6]
- TUT-044 When the player tolerates the Orthodox, the Christian sipahis steady to Loyal and their riders come to the Danube, Pious Sunni lords waver once (Orthodox are more than 10 % of the realm), and the faith tax ends. [tutorial §3.6]
- TUT-045 While the tutorial runs, the onboarding context shall show Persecute on the Faith policy screen dimmed, with a note that it would give every Orthodox neighbour the Defend the faith aim and grow the crusade. [tutorial §3.6]
- TUT-046 In chapter 4 the onboarding context shall have the player send the Anatolian troops over the Bosporus ferry (2 days, plus a day per 10,000 men) because the Dardanelles are closed. [tutorial §3.6, §3.4]
- TUT-047 After the border clash, the turn report shall show the battle's result together with the faith choice (how many Christian sipahis rode at Giurgiu, or why they stayed home); peace with Hungary ends the league's war, and the league ends with it. [tutorial §3.6]
- TUT-048 In chapter 6 one step shall open a Rumelian province's Faith line, showing the Orthodox community as "served, Restricted, protected: no grievance", with "Why?" linking to the Almanac's religion page; the madrasa in Edirne is Sunni. [tutorial §3.6]
- TUT-049 The onboarding context shall call the crusade what it was, frame neither side's holy war as the right one, reward no harm, and count the border clash's dead on both sides the same way in the turn report. [tutorial §3.6]

### The Janissaries
- TUT-050 In chapter 4, after the Janissaries join the army, a step shall open the Janissary regiment's card and the "Why?" on its men, whose recruits line reads "Boys taken from Christian families in Rumelia (the devshirme), and war captives."; tapping it moves the camera to the Rumelian provinces the corps drew from. [tutorial §3.7]
- TUT-051 The onboarding context shall then show one illustrated vignette card in the event screen's style, marked `depiction: narrative_only`, with three panels (officials arriving in a village; the boy's years of training; the soldier he becomes, remembered in his village) and only Continue and Read more (Almanac); no option gives the player anything. [tutorial §3.7]
- TUT-052 The step shall end on a Rumelian province's card whose People line shows the boys taken and whose grievances show *Sons taken*, with the province's Orthodox lords one step lower in loyalty and the vizier's line "The corps is strong. This is what it costs the villages that fill it." [tutorial §3.7]
- TUT-053 The onboarding context shall source the Almanac's devshirme entry from the catalogue's Ottoman record and standard histories, with no invented numbers. [tutorial §3.7]

### Step script and look
- TUT-054 The onboarding context shall store each step with `id`, `kind`, `text` (string key), `anchor`, `allow`, `done`, `guide_face` and `max_chars`. [tutorial §3.8]
- TUT-055 When a `look` step is shown, the onboarding context shall end it on {btn:confirm} or a tap anywhere. [tutorial §3.8]
- TUT-056 When a `do` step's condition is met, the onboarding context shall end it, offering no Next button. [tutorial §3.8]
- TUT-057 When the player makes any choice on a `choose` step, the onboarding context shall end it and the next step shall react to which choice was made. [tutorial §3.8]
- TUT-058 When what a `watch` step plays (a turn, a battle) ends, the onboarding context shall end the step. [tutorial §3.8]
- TUT-059 The onboarding context shall replace text tokens: `{btn:…}` with the current input's prompt, `{ui:…}` with the screen's name in bold and its icon, `{stat:…}` with the stat's icon and name linked to its Almanac entry, `{place:…}` and `{lord:…}` with the linked name that moves the camera there. [tutorial §3.8]
- TUT-060 The onboarding context shall show the step note as a parchment strip at the bottom edge, never over the target, moving to the top when the target is low, and at most a third of the screen height. [tutorial §3.9]
- TUT-061 The onboarding context shall dim the rest of the screen to 50 % (not black) around the spotlight. [tutorial §3.9]
- TUT-062 The onboarding context shall show the grand vizier Çandarlı Halil as the guide face, only in the tutorial. [tutorial §3.9, §5]
- TUT-063 The onboarding context shall show a counter of steps in the current chapter (for example "2 / 6"). [tutorial §3.9]
- TUT-064 While in the tutorial, the pause menu shall gain three lines: Skip this chapter, Chapter list, Leave the tutorial. [tutorial §3.9]

### Guided first turns
- TUT-065 Where a player skipped the tutorial, or starts the first real campaign after finishing it, the onboarding context shall show the goals list under the top bar for the first in-game year. [tutorial §4]
- TUT-066 When a goal's done condition is met, the onboarding context shall tick it off, for each of the seven goals in §4. [tutorial §4]
- TUT-067 The onboarding context shall let the goals list fold into a single icon with a count, never covering the map. [tutorial §4]
- TUT-068 When the player presses a goal's Show me, the onboarding context shall run the matching tutorial steps (the same script entries) in the current campaign, without the scenario overrides. [tutorial §4]
- TUT-069 The onboarding context shall adapt goals to the realm: a realm with no lords skips "Check your lords"; a pastoral realm keeps the normal food goal "Choose how your castles share food" (D-TUT-15). [tutorial §4]
- TUT-070 When the player closes the goals list for good from its own menu, the onboarding context shall not show it again. [tutorial §4]

### Needs attention
- TUT-071 The onboarding context shall give no advisor voice in a real campaign; the vizier's face and notes belong to the tutorial only. [tutorial §5, §13 settled]
- TUT-072 The onboarding context shall fill the game shell's Needs attention screen with entries of one line each, with a Show button that moves the camera to the place or opens the screen (D-TUT-1). [tutorial §5.1]
- TUT-073 The onboarding context shall list entries in two groups: Warnings first, then Waiting for you, which holds opportunities and then New entries (D-TUT-1). [tutorial §5.1]
- TUT-074 When a system shows up for the first time in a campaign (first war, siege, battle, rising, famine, plague; first invention of a new era; a new age), the onboarding context shall add a New entry linking to its Almanac page. [tutorial §5.1, §5.2]
- TUT-075 When an entry's cause ends or the player dismisses it, the onboarding context shall remove it. [tutorial §5.1]
- TUT-076 When the player long-presses, right-clicks or presses {btn:info} on an entry and picks "Don't list this kind again", the onboarding context shall mute that kind (the shell's mute buttons, D-TUT-1). [tutorial §5.1]
- TUT-077 The onboarding context shall keep all checks in one config file and read them each turn after that turn's simulation. [tutorial §5.2]
- TUT-078 While in the tutorial, the onboarding context shall drive the vizier's notes from the same checks. [tutorial §2, §5.2]
- TUT-079 When a check's condition holds, the onboarding context shall add its entry, for each check listed in §4. [tutorial §5.2]
- TUT-080 The onboarding context shall show on the End turn button a small count of the warnings on the list. [tutorial §5.3]
- TUT-081 The onboarding context shall have the turn report show one line "Needs attention (n)" that opens the list, instead of repeating it (D-TUT-4). [tutorial §5.3]
- TUT-082 When an entry has been dismissed, the onboarding context shall not bring it back before its check's cooldown ends (a province's famine warning at most once a year). [tutorial §5.3]
- TUT-083 The onboarding context shall collect each later system's warnings and first-time moments as those designs list them. [tutorial §5.2, §12]

### Tooltips and "Why?"
- TUT-084 The onboarding context shall show a tooltip (the stat's name and one line on what it is) on long-press (touch), hover after the settings delay (mouse), or focus then {btn:info} (controller). [tutorial §6.1]
- TUT-085 The onboarding context shall open "Why?" (the full gain and lose list with this month's numbers and an Almanac link) on tap or click of the number, or focus then {btn:confirm}. [tutorial §6.1]
- TUT-086 The onboarding context shall give every number on every card a "Why?" ("no number without a Why?"). [tutorial §6.1]
- TUT-087 The onboarding context shall run a lint test over the UI string tables that checks every stat key has a tooltip line and an Almanac entry. [tutorial §6.1]
- TUT-088 The onboarding context shall link a game term to its Almanac entry the first time it appears in a text (event options, tooltips, the Needs attention list, the turn report), with a dotted underline, opened by tap, click or {btn:info}. [tutorial §6.2]
- TUT-089 The onboarding context shall map each term and its plurals per language in a glossary file. [tutorial §6.2]

### The Almanac
- TUT-090 The onboarding context shall provide an offline Almanac opened from the pause menu, from any link and from any "Why?". [tutorial §7]
- TUT-091 The Almanac shall hold the sections How to play, Stats, Inventions, Troops and commanders, Ground, Realms and Events seen, written as listed in §4. [tutorial §7]
- TUT-092 When the player presses Practice this on a How-to-play page, the onboarding context shall open that page's tutorial chapter. [tutorial §7]
- TUT-093 While a catalogue country has not been met, the Almanac shall hide its Realms entry. [tutorial §7]
- TUT-094 The Almanac shall be searchable with a text box; on a controller, with a letter wheel, never the full keyboard. [tutorial §7, §8.2]
- TUT-095 The Almanac shall use the same art and layout as the cards: parchment, ribbons, pixel icons. [tutorial §7]
- TUT-096 The Almanac shall take its numbers from config, so a balance patch updates it without rewriting. [tutorial §7]
- TUT-097 The onboarding context shall draw loading-screen tips from a `tips` list that links each tip to its Almanac entry, choosing tips by what the player hasn't opened yet. [tutorial §7]

### Inputs
- TUT-098 The onboarding context shall track the last input the player touched and swap every prompt live, mid-step. [tutorial §8.1]
- TUT-099 The onboarding context shall show controller glyphs by family (Xbox, PlayStation, Steam Controller and Steam Deck, a generic set), and Steam Input's own glyphs on Steam. [tutorial §8.1]
- TUT-100 The onboarding context shall use the action mapping in §4 for the tutorial's actions, including the controller column the game shell adopted: End turn is Menu / Options held half a second, and skipping a step is B / Circle held one second (D-TUT-12). [tutorial §8.2]
- TUT-101 While a controller is used, every panel shall be navigable with the d-pad, focus shall start on the button the current step wants, and the spotlight shall follow the focused element. [tutorial §8.2]
- TUT-102 The tutorial shall need no text entry. [tutorial §8.2]
- TUT-103 The onboarding context shall give chapter 0 a different script per input, asking the player to try each camera action once; every later chapter uses one script with tokens. [tutorial §8.3]

### Starting, skipping and returning
- TUT-104 When the game is launched for the first time, after the first Tap to start, the game shell shall ask (SHELL-131, D-TUT-5) "New to Pocket Hegemony?" with Play the tutorial (recommended), Guided campaign and I know the way. [tutorial §9]
- TUT-105 The onboarding context shall offer a chapter list in the main menu with a tick on each chapter done, and let any chapter be played at any time. [tutorial §9]
- TUT-106 The onboarding context shall keep tutorial progress (chapters done, muted Needs attention kinds, first-time entries seen) in the save, and ship chapter saves read-only (X-16, D-TUT-6). [tutorial §9]
- TUT-107 When the player picks "Keep ruling the Ottomans" at the end of chapter 9, the onboarding context shall turn the tutorial save into a normal campaign save: the quiet world lifts, scripted events stop, the vizier's notes give way to the Needs attention list, and the save header gets `began_as_tutorial` so it is not ironman (X-16). [tutorial §9]
- TUT-108 The onboarding context shall award no achievements in the tutorial. [tutorial §12, §13 settled]

### Accessibility and language
- TUT-109 The onboarding context shall size the tutorial note's text with the UI scale setting, letting the note take up to two lines more at the largest size. [tutorial §10]
- TUT-110 The onboarding context shall teach the chapter 0 lens step with the Food lens, whose hungry provinces also carry the hunger icon, so the lesson works without telling colours apart. [tutorial §10]
- TUT-111 Where reduced motion is on, the onboarding context shall not bob the hand or pulse the spotlight, and the chapter 5 border clash can be skipped to the result like any battle. [tutorial §3.9, §10]
- TUT-112 The onboarding context shall never auto-advance a `look` step and shall let `watch` steps be paused. [tutorial §10]
- TUT-113 The onboarding context shall keep all tutorial, Needs attention and Almanac text in string tables with keys, keeping tokens in the string, and run the step length lint per language. [tutorial §3.8, §10]

### Measuring
- TUT-114 Where the player said yes to "tutorial step counts" on the game shell's consent card (D-TUT-12), the onboarding context shall send one event per tutorial step reached, skipped or finished, and per Needs attention entry followed or muted, and nothing else. [tutorial §11]
- TUT-115 While offline, the onboarding context shall queue measuring events and drop them after 30 days. [tutorial §11]

### Decisions of this pass
- TUT-116 When a step appears, the onboarding context shall request `ui_hint`; when a step is finished, `ui_confirm`; when a new Warning is added to Needs attention, `notify_alert`; the vizier's note has no sound of its own, and none of these duck music. [D-TUT-7]
- TUT-117 While the "Detailed tooltips" setting is on, the onboarding context shall show the "Why?" list inside the tooltip; while it is off (the default), the tooltip shows the name and one line. [D-TUT-13]
- TUT-118 While the "Tutorial hints" setting is off, the onboarding context shall not show the guided first-turns goals list; it is on by default. [D-TUT-13]
- TUT-119 The onboarding context shall label the step note's face "The Grand Vizier". [D-TUT-2]
- TUT-120 When the player picks "Mute this" on an entry, the onboarding context shall stop listing that one item; every mute can be undone in Settings. [D-TUT-1]

### First-campaign hints (Leroy, 18 October 2026)
- TUT-121 Where the setting "Tutorial hints" is on, the onboarding context shall show first-campaign hints one at a time, each naming one first action and pointing at the card or button to tap for it, in this order: pick a realm, move an army, end the turn, recruit, build, send an envoy (`first_hints`). [Leroy 18 Oct; D-TUT-16]
- TUT-122 When the player does a hint's action, in any order and wherever they do it, the onboarding context shall tick that hint off and show the next open one; an order the game refuses ticks nothing. [D-TUT-16]
- TUT-123 When the player dismisses a hint, the onboarding context shall tick it off without the action and show the next open one. [D-TUT-16]
- TUT-124 The onboarding context shall keep which hints are done between campaigns and visits: open hints carry over to the next campaign, and once every hint is done none is shown again. [D-TUT-16]
- TUT-125 When the player turns "Tutorial hints" off, from Settings or from the hint itself, the onboarding context shall hide the hints at once and keep which are done; turned on again, it shows the next open hint, and "Reset tutorial and hints" opens every hint again. [D-TUT-13, D-TUT-16]
- TUT-126 While an event card, the game menu or one of its screens (Save, Load, Settings) is open, or a turn plays, the onboarding context shall hold the hint back, and show it again when the map is the player's. [D-TUT-16]

#### How the player uses it: first-campaign hints
- TUT-127 Where: a parchment note along the bottom of the screen says in one line what to tap, and a brass ring pulses around that button or card ("Choose a realm" around the realm list; Commanders, then a commander, then the map for a march; End turn; the Garrison tab, then Recruit; the Build tab, then Build; a neighbour's Diplomacy tab, then an envoy's mission). The note follows the player's taps: once the Garrison tab is open the ring moves to Recruit. When the thing to tap is not on screen, the note's Show me opens the card that holds it (the capital's Garrison or Build tab, the nearest neighbour's Diplomacy tab, the Commanders list). Its × dismisses that one hint; Stop hints turns the setting off. [X-19]
- TUT-128 Grouping: one note, one hint at a time, never two; the switch and "Reset tutorial and hints" sit together in Settings under Gameplay, the one screen for the game's settings, which the cog in the side tools and the game menu both open. [X-19, SET-071]
- TUT-129 Overview: the note's counter ("3 / 6") and the Settings row ("3 of 6 done") show at a glance how far the player has come. [X-19]
- TUT-130 Phone: in landscape (Wide and Tall layouts, inside the safe areas) the note sits along the bottom between the overview button and End turn and moves under the top bar when the ring is low on the screen, so it never covers what it points at; it takes at most a third of the screen's height, its buttons are at least 44 points, the ring takes no taps so the button under it works as ever, the ring stands still where reduced motion is on, and nothing needs hover. In portrait a phone shows the turn-sideways notice over everything, the note included. [X-19, TUT-060, TUT-111]

## 6. Commands

| Command | Who issues it | Preconditions | Result | Events emitted |
|---|---|---|---|---|
| StartTutorial | Player | — | Chapter 0 (or the saved step) starts | ChapterStarted, StepShown |
| StartChapter(n) | Player (chapter list, Practice this) | — | Chapter n's save loads | ChapterStarted |
| CompleteStep | System | Step's end condition met | Next step shown | StepCompleted, StepShown |
| SkipStep | Player | In a step | Next step shown | StepSkipped |
| SkipChapter | Player (pause menu) | In the tutorial | Next chapter's save loads | ChapterSkipped |
| LeaveTutorial | Player (pause menu) | In the tutorial | Back to the menu; progress kept | TutorialLeft |
| AdvanceTo(date) | Player | Tutorial, ribbon offered | Turns run to the date; one combined report | TurnsAdvanced |
| FreeLook | Player | `do` step | Input focus lifted for the step | — |
| KeepRulingOttomans | Player | Chapter 9 | Tutorial save becomes a campaign save, "began as the tutorial", not ironman | TutorialConvertedToCampaign |
| AnswerFirstLaunch(choice) | Player | First launch | Tutorial / guided campaign / normal campaign | — |
| ShowMe(goal) | Player | Goals list visible | Matching steps run in this campaign | StepShown |
| CloseGoalsList(forGood) | Player | Goals list visible | Folded or closed for good | — |
| Show(entry) | Player | Entry on list | Camera moves or screen opens | AttentionEntryFollowed |
| DismissEntry(entry) | Player | Entry on list | Entry removed; cooldown starts | AttentionEntryRemoved |
| MuteKind(kind) / MuteItem(entry) | Player | Entry on list | Kind or item muted | AttentionKindMuted |
| OpenWhy(stat) | Player | A number on a card | Why? shown | — |
| OpenAlmanac(entry) / SearchAlmanac(text) | Player | — | Entry or results shown | — |
| RunAttentionChecks | System (after each turn's simulation) | — | Entries added or removed | AttentionEntryAdded, AttentionEntryRemoved, FirstTimeSystemSeen |

## 7. Domain events

| Event | When | Payload | Consumed by |
|---|---|---|---|
| StepShown | A step appears | chapter, step id, kind | audio (`ui_hint`), measuring |
| StepCompleted / StepSkipped | A step ends | chapter, step id | audio (`ui_confirm` on completed), measuring |
| ChapterStarted / ChapterCompleted / ChapterSkipped | — | chapter | saves (progress), game-shell (chapter list ticks) |
| TutorialLeft | Player leaves | chapter, step | saves |
| TutorialConvertedToCampaign | Keep ruling the Ottomans | save id | saves (mark "began as the tutorial"), achievements (not ironman) |
| AttentionEntryAdded | A check holds | kind, line, place/screen | game-shell (Needs attention screen, End turn count), audio (`notify_alert` for a new Warning) |
| AttentionEntryRemoved | Cause ended or dismissed | entry | game-shell |
| AttentionKindMuted | Player mutes a kind | kind | saves (progress), measuring |
| AttentionEntryFollowed | Show pressed | entry | measuring |
| FirstTimeSystemSeen | First war, siege, etc. | system | saves (seen list) |
| GoalCompleted | A goal is ticked | goal | game-shell |

## 8. Policies (reactions to other contexts)

- When time-and-turns finishes a turn's simulation, then run every Needs attention check.
- When realm reports a province store reaching zero before the next harvest, a lord turning Wavering or
  Disloyal, gold running out in under three months, a royal province with no official, a neighbour's
  disloyal bordering lord, or a castle with more grain than it can hold, then add the matching entry.
- When warfare reports an army's food reserve under 15 days or pay owed, then add a Warning.
- When recruiting reports many farmers levied with the harvest near, then add a Warning.
- When rebellions report grievances past the rising threshold, then add a Warning.
- When warfare, rebellions or province report the first war, siege, battle, rising, famine or plague of the
  campaign, or research/events report the first invention of a new era or a new age, then add a New entry.
- When events fires a scripted `tutorial_only` event in the tutorial, then show its step(s).
- When saves reports "Reset tutorial and hints" (from settings), then clear progress, mutes and seen entries.

## 9. Each turn

1. Read: the end-of-turn state of every context the checks read (after the simulation).
2. Run every check in the config; add, keep or remove entries; apply cooldowns and muted kinds.
3. Update the End turn warning count; the turn report links to the list.
4. In the tutorial: drive the vizier's notes from the same checks; advance `watch` steps; on Advance to…,
   repeat the turn until the named date and show one combined turn report.
5. Guided first turns: visible only during the first in-game year.

## 10. Configuration

| Key | Meaning | Value in the design | Placeholder? | Config file |
|---|---|---|---|---|
| chapter length | Target minutes per chapter | about 5 | yes | tutorial scenario |
| tutorial total | Turns / minutes | about 30–40 turns, 45–50 minutes | yes | tutorial scenario |
| chapter turns | Approximate turns per chapter | see §4 table | yes | tutorial scenario |
| watch speed | Chapter 5 battle bell pace | one bell every 3 seconds | yes | tutorial scenario |
| idle pulse | Seconds idle before the pointer pulses | 8 | yes | tutorial scenario |
| idle skip hint | Seconds idle before "Stuck?" | 20 | yes | tutorial scenario |
| `max_chars` | Step text limit | 140 | yes | step script |
| spotlight dim | Dim of the rest of the screen | 50 % | yes | tutorial UI |
| note height | Max share of screen height | one third | yes | tutorial UI |
| faith hatching | Community share shown hatched on the Faith lens | 30 % or more | from religion | religion config |
| Bosporus ferry | Crossing time | 2 days + 1 day per 10,000 men | from troop movement | troop-movement config |
| league line | League shown on the country card | 3 members, 24,000 soldiers | yes | tutorial scenario |
| `ottoman_examples` | Ottoman worked-example numbers (D-TUT-11) | Janissaries 1,000; levies 4,000; riders 2,000; crusader army 16,000; Hexamilion 2 months | yes | tutorial scenario |
| Same faith reason | Reason weight between Catholic members | +10 | from diplomacy | diplomacy config |
| Hungary terms | Offers terms after failing to take one castle in | two months | yes | tutorial scenario |
| goals period | Guided first turns visible for | first in-game year | yes | onboarding config |
| `first_hints` | First-campaign hints: id, line, the action that ticks it, in order (D-TUT-16) | six hints: realm, move, end turn, recruit, build, envoy | no | onboarding config |
| checks | Every Needs attention check, threshold, line, source | §4 table | yes | one checks config file |
| army food warning | Reserve threshold | under 15 days | yes | checks config |
| gold warning | Months of gold left (`under_months`) | under three months | yes | checks config |
| check cooldown | Per-check return time after dismiss | e.g. famine: at most once a year | yes | checks config |
| skip step hold | Controller hold time | B / Circle for one second | yes | onboarding config |
| End turn hold | Controller hold time | Menu / Options half a second | from game-shell (D-SHELL-7) | game-shell config |
| measuring retention | Offline queue life | 30 days | yes | onboarding config |
| `tips` | Loading-screen tips linked to Almanac entries | list | — | tips config |
| glossary | Terms and plurals per language | file | — | localisation |

## 11. Seams

| Other context | Direction | Pattern | What crosses |
|---|---|---|---|
| game-shell | upstream | Partnership | The Needs attention screen (two groups, Show, mute buttons, D-TUT-1) and where it opens; first-launch question; Tutorial menu entry and chapter list; three pause-menu lines; loading-screen tips; turn report link; End turn count |
| saves | upstream | Customer–Supplier | Tutorial progress and mutes stored in the save (X-16); chapter saves shipped read-only; converting a tutorial save into a campaign save with `began_as_tutorial` in the header |
| settings | upstream | Conformist | Tooltip delay; Detailed tooltips (Why? in the tooltip) and Tutorial hints (goals list), D-TUT-13; "Reset tutorial and hints"; reduced motion; UI scale |
| achievements | downstream | Published Language | Tutorial saves are never ironman, so the tutorial earns none |
| audio | downstream | Customer–Supplier | `ui_hint` on step shown, `ui_confirm` on step completed, `notify_alert` on a new Warning; no ducking (D-TUT-7) |
| scenario-setup | upstream | Conformist | Normal 1444 setup, `owners-1444.json`, the Ottoman catalogue record (dates, lords, Hunyadi) |
| events | upstream | Customer–Supplier | Event format, `history` block, `tutorial_only`, `narrative_only`; scripted events stay in the tutorial scenario file and the league's aim comes from the start state (D-TUT-9) |
| religion | upstream | Conformist | Faith policy screen, Restricted/Tolerated/Persecuted, protected communities, Faith lens, schools' faith, Pious lords |
| diplomacy | upstream | Conformist | Event-started leagues, reasons count, member reasons screen |
| warfare | upstream | Conformist | Defend the faith aim, battles, battle screen, sieges, storming, terms, peace voices, army food reserve, pay owed |
| troop-movement | upstream | Conformist | Strait crossings, Bosporus ferry, closed Dardanelles, days to cross |
| recruiting | upstream | Conformist | Levy, regiments, Janissaries, recruit pool, Marshal (the devshirme stays tutorial narrative, D-TUT-8) |
| realm | upstream | Conformist | Country card, food policy, lords and loyalty, officials, tax, gold, schools |
| province | upstream | Conformist | Province card, People line, grievances, local store, hunger |
| map-presentation | upstream | Conformist | Zoom levels, lenses (Food, Faith), hunger icon, camera |
| research | upstream | Conformist | Choosing an invention, eras, Inventions Almanac section |
| rebellions | upstream | Conformist | Rising, rebellion card, five answers, grievances |
| national-strengths | upstream | Conformist | *Kapıkulu household* birthright; Realms Almanac strengths |
| subjects | — | — | Nothing crosses; no subject steps (D-TUT-10) |
| time-and-turns | upstream | Conformist | Checks run after each turn's simulation; Advance to… runs several turns |
| world-map | upstream | Conformist | Terrain data for the Ground section (22 tile types) |

## 12. AI

- The tutorial forces AI personalities: Hungary crosses the Danube at Giurgiu in chapter 5 with Hunyadi
  commanding; if the player lost the border clash, Hungary offers terms after failing to take one castle in two months; the Morea accepts
  terms after the wall falls.
- The quiet world holds back AI wars against the Ottomans (except scripted ones) and in the Balkans and
  western Anatolia (Karaman included).
- Proposal (not a rule here): Ottoman AIs keep the devshirme until the event tree's history ends it.

## 13. Decisions and open questions

- **D-TUT-1** (was OQ-TUT-1) Needs attention screen: the game shell's single screen (D-SHELL-15) is used: titled "Needs attention", two groups, **Warnings** first and **Waiting for you** second (opportunities, then new systems), each line with a **Show** button that opens the place or screen, and mutes "Mute this" (one item) and "Don't list this kind again" (one kind), undone in Settings. Opportunity lines state a fact ("A lord across the border may be won over."), never an order. One screen and one wording across the game is simpler than two.
- **D-TUT-2** (was OQ-TUT-2) Guide face label: the step note labels the face "The Grand Vizier" (Çandarlı Halil); "The Chancellor" is dropped. The text already says he is the grand vizier.
- **D-TUT-3** (was OQ-TUT-3) Off-script versus chapter saves: the chapter save wins. Each chapter starts from its fixed save, so an off-script choice plays out inside its own chapter only; nothing carries into a later chapter. Fixed saves are the simpler rule and keep every chapter replayable from the list.
- **D-TUT-4** (was OQ-TUT-4) Turn report and warnings: the turn report shows a "Needs attention (n)" line that opens the list; it never repeats the warnings. There is no "5.4" section to follow, and §5.3 already says so.
- **D-TUT-5** (was OQ-TUT-5) First launch and naming: the first-launch question "New to Pocket Hegemony?" is shown once, after the first Tap to start (D-SHELL-3, SHELL-131), with "Start the tutorial" and "I know the genre"; the Tutorial main-menu entry stays and moves under More once finished. The reference book is called the **Almanac** everywhere. The shell already adopted both.
- **D-TUT-6** (was OQ-TUT-6) Saves: X-16 applies. Tutorial progress and Needs attention mutes are stored in the save, chapter saves are read-only, and a campaign kept after the tutorial carries `began_as_tutorial`. Cross-context decision X-16.
- **D-TUT-7** (was OQ-TUT-7) Sounds: a step appearing plays `ui_hint`, a step finished plays `ui_confirm`, a new warning in Needs attention plays `notify_alert`; the vizier's note has no sound of its own, and none of these duck music (D-AUD-6). Existing catalogue sounds only; no new sound.
- **D-TUT-8** (was OQ-TUT-8) Devshirme: it stays narrative only in the tutorial (vignette, recruits line, Almanac entry) and is not a campaign mechanic. Adding it would be a new mechanic.
- **D-TUT-9** (was OQ-TUT-9) Scripted events and the start date: the tutorial's scripted events stay in the tutorial scenario file, not in the event tree. Under X-5 the tutorial starts on **11 November 1444**, the day after Varna, with Mehmed II (12) on the throne and Murad II retired at Manisa; the crusade war is still open from the start and the Defend the faith aim is held from the start, so no event grants it. The peace, abdication and crusade-breaks-the-peace events are dropped; chapter 1 opens with "Murad goes back to Manisa", chapter 4 with "The crusaders' fleet on the Danube" (summer 1445), and chapter 7 keeps the Janissary pay rising and Murad's return (1446). Varna is never re-fought: it lies in the past, and the tutorial teaches its aftermath (the crusade broken, Murad's return, Janissary pay, the Danube frontier). Chapter 5, "The Danube frontier", is a small border clash with the crusaders' crossing at Giurgiu in autumn 1445, where the crusade's Danube campaign really fought; it is never named Varna. Cross-context decision X-5; no new mechanic.
- **D-TUT-10** (was OQ-TUT-10) Diplomacy and subjects steps: none are added; the ten chapters stay as they are. Adding steps is outside this pass and the chapters already fit five minutes each.
- **D-TUT-11** (was OQ-TUT-11) Ottoman example numbers: provisional numbers go in `onboarding.json` under `ottoman_examples` (1,000 Janissaries, 4,000 levies, 2,000 lords' riders; crusader army 16,000; Hexamilion wall 2 months), listed in `_provisional`. Missing numbers get a provisional value.
- **D-TUT-12** (was OQ-TUT-12) Advance to…, controller column, consent: Advance to… stays a tutorial-only tool. The controller column is the shell's: End turn is Menu held 0.5 s (D-SHELL-7), skip a step is B / Circle held 1 s. Measuring runs only when the player said yes to "tutorial step counts" on the shell's consent card (D-SHELL-22). No new real-game feature; the shell settled the inputs and consent.
- **D-TUT-13** (was OQ-TUT-13) Detailed tooltips and Tutorial hints: "Detailed tooltips" (off by default) puts the "Why?" list inside the tooltip itself; "Why?" stays one tap away either way. "Tutorial hints" (on by default) shows or hides the guided first-turns goals list. Each switch gets one clear job.
- **D-TUT-14** (was OQ-TUT-14) Free tier reference: the source is gap list 1, item 2 (Ottomans and France). Only the citation was wrong.
- **D-TUT-15** (was OQ-TUT-15) Pastoral realms and lens marks: a pastoral realm gets the normal food goal "Choose how your castles share food"; the herds text is dropped. The tutorial's two lenses keep their non-colour marks (Food: hunger icon; Faith: hatching at 30 % or more). No herds rules exist, and both lenses already have marks.
- **D-TUT-16** First-campaign hints (Leroy, 18 October 2026): before the goals list and the tutorial are built, the first campaign carries six one-line hints that point at the card or button to tap: pick a realm, move an army, end the turn, recruit, build, send an envoy. They are the first slice of guided first turns (§4), not a tutorial chapter: real screens, no scenario, no vizier. "Tutorial hints" switches them with the goals list, so the switch still has one job: the first-campaign guidance. Which hints are done is the player's, not the save's, so a second campaign does not teach them again.

No onboarding question stays open.

## 14. Traceability

| Requirement | Feature file | Scenario |
|---|---|---|
| TUT-001, TUT-002, TUT-003 | step-script.feature | Steps teach one thing on the real screens |
| TUT-004 | skipping-and-returning.feature | Coming back mid-chapter |
| TUT-005 | skipping-and-returning.feature | Skip a step / chapter / leave |
| TUT-006 | inputs.feature | Tokens become prompts |
| TUT-007 | needs-attention.feature | Later systems are taught by New entries |
| TUT-008 | — | Content rule checked by review |
| TUT-009, TUT-010 | first-launch-and-layers.feature | Layers left after skipping everything |
| TUT-011 … TUT-018 | tutorial-chapters.feature | chapter outline, history scenarios |
| TUT-019 … TUT-023 | pacing-tools.feature | all scenarios |
| TUT-024 … TUT-029 | tutorial-chapters.feature | scenario file scenarios |
| TUT-030 … TUT-035 | off-script.feature | all scenarios |
| TUT-036 … TUT-049 | varna-crusade.feature | all scenarios |
| TUT-050 … TUT-053 | janissaries.feature | all scenarios |
| TUT-054 … TUT-064 | step-script.feature | all scenarios |
| TUT-065 … TUT-070 | guided-first-turns.feature | all scenarios |
| TUT-071 … TUT-083 | needs-attention.feature | all scenarios |
| TUT-084 … TUT-089 | tooltips-and-why.feature | all scenarios |
| TUT-090 … TUT-097 | almanac.feature | all scenarios |
| TUT-098 … TUT-103 | inputs.feature | all scenarios |
| TUT-104 … TUT-108 | first-launch-and-layers.feature, skipping-and-returning.feature | first launch, keep ruling, no achievements |
| TUT-109 … TUT-113 | accessibility.feature | all scenarios |
| TUT-114, TUT-115 | measuring.feature | all scenarios |
| TUT-116 | step-script.feature | Steps and warnings play existing sounds |
| TUT-117 | tooltips-and-why.feature | Detailed tooltips put the Why? list in the tooltip |
| TUT-118 | guided-first-turns.feature | Tutorial hints switch the goals list |
| TUT-119 | step-script.feature | The guide face is labelled The Grand Vizier |
| TUT-120 | needs-attention.feature | Mute one item |
| TUT-121 … TUT-126 | first-campaign-hints.feature | all scenarios |
| TUT-127 … TUT-130 | first-campaign-hints.feature | How the player uses it (presentation, checked on a phone in landscape) |
