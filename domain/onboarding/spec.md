# Onboarding (TUT)

## 1. Purpose and scope

This context decides how a new player learns Pocket Hegemony on a phone, with a mouse and keyboard, or with a
controller. It owns four layers: the tutorial campaign "The Year of Varna" (the Ottomans, spring 1444 to
1447), guided first turns, the content of the Needs attention list, and tooltips, "Why?" and the Almanac
(the in-game encyclopedia). It also owns the tutorial's pacing tools, its scenario file and step script, the
lesson actions per input, tutorial progress, and the measuring of tutorial use.

**In scope**
- Onboarding principles (teach by doing, one idea per step, short sessions, never trap, same lesson on every
  device, explain why a number moved, teach 1444 first).
- The ten tutorial chapters (0–9), their dates, turns, lessons and "Done when" conditions; going off script.
- Pacing tools: Advance to…, Input focus with Free look, Quiet world, Battle at watch speed.
- The tutorial scenario file (start state, world rules, scripted `tutorial_only` events, chapter saves, steps).
- The Varna crusade lesson on the religion, diplomacy, warfare and troop movement rules; the Janissary lesson.
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
| Tutorial campaign | "The Year of Varna": ten short chapters as the Ottomans, spring 1444 to 1447 | Guided first turns |
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
| Battle at watch speed | The Varna battle always opens the battle screen, slowed to one bell every 3 seconds | |
| Guide face | The grand vizier, Çandarlı Halil; appears only in the tutorial | An advisor (there is none after the tutorial) |
| Guided first turns | A goals list under the top bar for the first in-game year of a campaign | Tutorial |
| Goal | One entry of guided first turns: opens one screen once and ticks off | Achievement |
| Show me | A goal's button that runs the matching tutorial steps in the current campaign, without scenario overrides | Go there |
| Needs attention | The list of what needs the player: Warnings, Opportunities and New entries, each with Go there | Turn report (what happened) |
| Check | A config rule read each turn after the simulation that adds a Needs attention entry | |
| Warning | Something bad will happen soon unless the player acts; listed first | |
| Opportunity | Something good the player can take now | |
| New entry | A system shows up for the first time in this campaign; links to its Almanac page | |
| Mute a kind | "Don't list this kind again" for one kind of entry | Dismiss (one entry) |
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
- Start state: the normal 1444 setup with overrides only where the tutorial needs them: Murad II ruler,
  Mehmed heir; Çandarlı Halil grand vizier; Evrenos, Mihal and Turahan families as lords, one wavering; one
  royal province in Anatolia with no official; a fixed seed; the Christian sipahis' lord card (Wavering); the
  Orthodox row of the Faith policy set to Restricted. The 1444 map already gives the Ottomans Edirne and
  Varna and Byzantium the Morea (`owners-1444.json`).
- World rules: quiet-world regions and dates; forced AI personalities (Hungary marches on Varna in chapter 5
  with Hunyadi commanding; Hungary offers terms after failing to take one castle in two months if Varna was
  lost; the Morea accepts terms after the wall falls).
- Scripted events (event tree format, `tutorial_only: true`, keeping the event tree's `history` block with
  sources): the Edirne–Szeged peace; Murad's abdication; the crusade breaking the peace (starts the league and
  grants Defend the faith); Murad's recall; the Janissary pay rising and Murad's return.
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
| 0 | The map | April 1444 | 0 | Pan and zoom through world, region and local view; select a province; open its card; switch a lens (Food, then Faith); find the capital, the Straits and Varna | The player has opened Edirne's province card and seen the Food and Faith lenses |
| 1 | A month at a time | April – June 1444 | 3 | Country card; gold and food at a glance; End turn; the turn report; the first event (Hungary offers a ten-year peace at Edirne; accept or refuse) | The peace event is answered and the turn report is read |
| 2 | A boy on the throne | July – August 1444 | 3 | Ruler and heirs; Murad's abdication event; why a child ruler and new reign make lords waver; the lords list (Evrenos, Mihal, Turahan); what a lord wants; royal provinces versus lords' lands; hiring an official for a province with none; tax rates | An official is placed, and one wavering lord has been given his want, given a gift, or left alone (each fine; the turn report shows the result) |
| 3 | Bread and castles | August – October 1444 | 1 + advance | Food lives in provinces; castles collect and spread it; reach rings; the Food policy screen and presets; the harvest; ends when news arrives that the crusaders broke the peace | A preset is chosen, the harvest turn is played, and the player opens one hungry province's "Why?" |
| 4 | Men under arms | October 1444 | 3 | The crusade declared, its league and its Defend the faith aim; the Faith policy choice for the Orthodox; ferrying troops over the Bosporus; the levy screen in Thrace; levies versus trained regiments; the Janissaries as a standing regiment and how they were raised; calling the lords' riders; an event to recall Murad (history's choice) or give command to an official made Marshal; standing orders | An army of levies, lords' riders and Janissaries stands with a commander |
| 5 | Varna | October – November 1444 | 4–6 | Marching and days to cross; the food reserve; seeing the enemy (the crusade first as a rumour); a battle against Hunyadi on the battle screen; after the battle, including what the faith choice changed; terms; peace voices; making peace | Peace is signed (losing the battle is allowed; the chapter adapts) |
| 6 | Schools and inventions | 1445 | 2 + advance | Madrasas, students and scholars; schools have a faith; a served, protected community on a province's Faith line; choosing what to study; every student is a recruit the army can't raise | An invention is chosen and the player has seen the recruit pool shrink |
| 7 | The Janissaries' pay | 1446 | 3–4 | A rising of unpaid soldiers in Edirne; the rebellion card; the five answers (grant, talk, bribe, wait, attack); then an event: Murad takes the throne back, or Mehmed rules on | The rising ends by any means |
| 8 | The wall at Corinth | November – December 1446 | 4–6 | Declaring a war yourself; marching into the Morea; laying siege to the Hexamilion; the siege month by month; storming with guns; terms | The wall falls or terms are agreed |
| 9 | Your realm now | 1447 | — | One-screen recap with Almanac links; keep playing these Ottomans or start a new campaign | The player picks one |

Total: about 30 to 40 turns and 45 to 50 minutes, in sessions of about 5 minutes.

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
| Warning | Gold will run out in under three turns at this rate | "At this pace the treasury is empty by June." | Country stats 2 |
| Warning | A harvest is near and many farmers are levied | "Five thousand farmers are under arms with the harvest three weeks away." | Recruiting 2.1 |
| Warning | Grievances in a province pass the rising threshold | "Talk of rising in Edirne." | Rebellions 2.1 |
| Warning | A royal province has no official | "Bursa pays half its taxes without an official." | Country stats 4 |
| Opportunity | A neighbour's lord is disloyal and borders you | "A lord across the border may be won over." | Country stats 5.3 |
| Opportunity | Grain price is high and a castle has surplus | "Grain sells high in Venice; Edirne has more than it can hold." | Country stats 3.3 |
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

- **Devshirme in a campaign** (to recruiting and the sensitive-history thread): runs while a realm holds the
  *Kapıkulu household* birthright; no action to take more boys or collect sooner; a collection every 5 years
  (config); boys taken shown on each province's People line; a new grievance *Sons taken* for 10 years in each
  province collected from; Orthodox and Catholic lords there waver one step; a share of families leave as
  refugees; the one lever is to end it, after which the corps refills from paid volunteers at a higher gold
  cost; history: collections faded in the 1600s, corps abolished in 1826 (`tanzimat` event); Ottoman AIs keep
  it until the event tree's history ends it.
- **Next pass** (still open): chapter 1 envoy step (the Edirne peace talks); chapter 1 shows Serbia returned
  to its ruler under the peace on the subjects screen; chapter 8 subject step (the Morea's tribute).

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
- TUT-011 The onboarding context shall run the tutorial as the Ottomans from April 1444 to 1447 in ten chapters (0–9), keeping history's own dates and moving no event to fit the lesson plan. [tutorial §3, §3.2, §13 settled]
- TUT-012 The onboarding context shall start each chapter from its own fixed chapter save, so it can be played or replayed alone. [tutorial §3.2]
- TUT-013 When a chapter's Done-when condition is met, the onboarding context shall mark the chapter done, for each chapter as listed in §4. [tutorial §3.2]
- TUT-014 When the player's choices differ from history, the onboarding context shall carry the chapter on from what happened, as a real campaign would. [tutorial §3.2 History]
- TUT-015 When the next chapter starts, the onboarding context shall put the world back on its historical course through that chapter's save and say so in one line on its opening card. [tutorial §3.2 History]
- TUT-016 The onboarding context shall keep the event tree's `history` block with sources on every scripted event. [tutorial §3.2, §3.4]
- TUT-017 The onboarding context shall use the Ottomans as the tutorial nation, which are in the free tier, so the whole tutorial works without a purchase on every store and in the Steam demo. [tutorial §3.1, §9; gap-lists List 1 item 2]
- TUT-018 The onboarding context shall use its own Ottoman set of numbers for the recruiting, battle and siege lessons, made the same way as the French worked examples. [tutorial §3.1 Cost]

### Pacing tools
- TUT-019 Where the tutorial offers Advance to…, the onboarding context shall run several turns in a row to a named date and show one combined turn report. [tutorial §3.3]
- TUT-020 While a `do` step is shown, the onboarding context shall let only the controls on the step's `allow` list respond and dim everything else without hiding it. [tutorial §3.3, §3.8]
- TUT-021 When the player presses Free look, the onboarding context shall lift the input focus for that step. [tutorial §3.3]
- TUT-022 While the tutorial runs, the onboarding context shall hold back every AI war against the Ottomans except the scripted ones, and every AI war in the Balkans and western Anatolia (Karaman included). [tutorial §3.3, §3.4]
- TUT-023 When the Varna battle starts, the onboarding context shall always open the battle screen, slowed to one bell every 3 seconds. [tutorial §3.3]

### Scenario file
- TUT-024 The onboarding context shall hold the tutorial as data in one scenario file: start state, world rules, scripted events, chapter saves and steps. [tutorial §3.4]
- TUT-025 The onboarding context shall start from the normal 1444 setup with overrides only where the tutorial needs them (ruler, heir, grand vizier, the three lord families with one wavering, one Anatolian royal province with no official, a fixed seed, the Christian sipahis' lord card, the Orthodox row set to Restricted). [tutorial §3.4, §3.6]
- TUT-026 The onboarding context shall mark every scripted event `tutorial_only: true` so it never fires in a real campaign. [tutorial §3.4]
- TUT-027 The onboarding context shall force AI personalities so that Hungary marches on Varna in chapter 5 with Hunyadi commanding and the Morea accepts terms after the wall falls. [tutorial §3.4]
- TUT-028 When rules change, the onboarding context shall rebuild every chapter save with a tool by playing the previous chapter's recommended path, never editing a save by hand. [tutorial §3.4]
- TUT-029 The onboarding context shall have a CI test that plays each chapter's recommended path from its chapter save and checks it reaches Done when. [tutorial §3.4]

### Off script
- TUT-030 If the player refused the peace in chapter 1, then the onboarding context shall keep Hungary at war while the quiet world keeps its armies home until chapter 5, and the chapter 4 event shall read "The war you chose resumes" instead of "The crusaders break the peace". [tutorial §3.5]
- TUT-031 If the player loses at Varna, then the onboarding context shall change the step to "Your army broke. Fall back behind the walls of Edirne and call the levy.", and Hungary shall offer terms after failing to take one castle in two months, so the chapter still ends in peace. [tutorial §3.5]
- TUT-032 If the player ignored the wavering lord, then the onboarding context shall let his loyalty drop and, in chapter 7, his riders shall not come when the rising starts. [tutorial §3.5]
- TUT-033 If the player is idle on a `do` step for 8 seconds, then the pointer shall pulse on the target again; after 20 seconds the note shall add "Stuck? {btn:skip_step} to skip this step." [tutorial §3.5]
- TUT-034 If the player is short of the gold a chapter needs at its start, then the onboarding context shall fill the gap with a scripted loan from a Genoese or Venetian banking house, shown as a real debt line. [tutorial §3.5]
- TUT-035 If the storm fails in chapter 8, then the siege shall carry on month by month until the wall is breached or the Morea offers terms. [tutorial §3.5]

### Varna crusade on the religion system
- TUT-036 The onboarding context shall build the Varna crusade on the full religion system, the event-started leagues, the war aims and strait crossings already designed. [tutorial §3.6]
- TUT-037 When the crusaders break the peace (chapter 3's last turn), the scripted event shall start a crusading league against the Ottomans regardless of the usual threshold, with Hungary, Poland, Wallachia and the Papal States as members and Venice and Burgundy sending fleets; the country card shall show "League against the Ottomans: 4 members, 31,000 soldiers". [tutorial §3.6]
- TUT-038 When the war is declared, the crusade event shall grant the league the Defend the faith aim itself (a Restricted policy does not qualify), and the war screen shall show the aim, its cause and one linked line explaining why this aim and not Take land. [tutorial §3.6]
- TUT-039 When the player taps a league member, the onboarding context shall open that member's reasons (Same faith +10 between Catholic members; "Our ally's war aim is our concern"), the same screen used for the player's own alliances. [tutorial §3.6]
- TUT-040 While the crusaders' fleet holds the Dardanelles, the crossing shall show as closed with the fleet's banner on it. [tutorial §3.6]
- TUT-041 In chapter 0, after the Food lens, the onboarding context shall have the player switch to the Faith lens, showing Rumelia as Orthodox under a Sunni realm with hatching where a community is 30 % or more, with the line "Most of your people in Rumelia are Orthodox Christians. You rule them as a Sunni sultan." [tutorial §3.6]
- TUT-042 In chapter 4, when the league calls on the sultan's Christian subjects to rise, the vizier shall open the Faith policy screen at the Orthodox row set to Restricted and the player shall choose between Keep it Restricted and Tolerate it. [tutorial §3.6]
- TUT-043 When the player keeps the Orthodox Restricted, the faith tax keeps paying for the war and the Christian sipahis stay at Wavering, so they don't bring their retinue when called. [tutorial §3.6]
- TUT-044 When the player tolerates the Orthodox, the Christian sipahis steady to Loyal and their riders come to Varna, Pious Sunni lords waver once (Orthodox are more than 10 % of the realm), and the faith tax ends. [tutorial §3.6]
- TUT-045 While the tutorial runs, the onboarding context shall show Persecute on the Faith policy screen dimmed, with a note that it would give every Orthodox neighbour the Defend the faith aim and grow the crusade. [tutorial §3.6]
- TUT-046 In chapter 4 the onboarding context shall have the player send Murad's Anatolian troops over the Bosporus ferry (2 days, plus a day per 10,000 men) because the Dardanelles are closed. [tutorial §3.6, §3.4]
- TUT-047 After Varna, the turn report shall show the battle's result together with the faith choice (how many Christian sipahis rode at Varna, or why they stayed home); peace with Hungary ends the league's war; the league ends when its starting event closes; Hungary's loss of its king comes through the event tree as a succession. [tutorial §3.6]
- TUT-048 In chapter 6 one step shall open a Rumelian province's Faith line, showing the Orthodox community as "served, Restricted, protected: no grievance", with "Why?" linking to the Almanac's religion page; the madrasa in Edirne is Sunni. [tutorial §3.6]
- TUT-049 The onboarding context shall call the crusade what it was, frame neither side's holy war as the right one, reward no harm, and count Varna's dead on both sides the same way in the turn report. [tutorial §3.6]

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
- TUT-069 The onboarding context shall adapt goals to the realm: a realm with no lords skips "Check your lords"; a pastoral realm's food goal reads "Choose how your herds are shared" once the herds rules are designed. [tutorial §4]
- TUT-070 When the player closes the goals list for good from its own menu, the onboarding context shall not show it again. [tutorial §4]

### Needs attention
- TUT-071 The onboarding context shall give no advisor voice in a real campaign; the vizier's face and notes belong to the tutorial only. [tutorial §5, §13 settled]
- TUT-072 The onboarding context shall fill the Needs attention list with entries of one line each, with a Go there button that moves the camera to the place or opens the screen. [tutorial §5.1]
- TUT-073 The onboarding context shall list entries of three kinds — Warnings first, then Opportunities, then New. [tutorial §5.1]
- TUT-074 When a system shows up for the first time in a campaign (first war, siege, battle, rising, famine, plague; first invention of a new era; a new age), the onboarding context shall add a New entry linking to its Almanac page. [tutorial §5.1, §5.2]
- TUT-075 When an entry's cause ends or the player dismisses it, the onboarding context shall remove it. [tutorial §5.1]
- TUT-076 When the player long-presses, right-clicks or presses {btn:info} on an entry and picks "Don't list this kind again", the onboarding context shall mute that kind. [tutorial §5.1]
- TUT-077 The onboarding context shall keep all checks in one config file and read them each turn after that turn's simulation. [tutorial §5.2]
- TUT-078 While in the tutorial, the onboarding context shall drive the vizier's notes from the same checks. [tutorial §2, §5.2]
- TUT-079 When a check's condition holds, the onboarding context shall add its entry, for each check listed in §4. [tutorial §5.2]
- TUT-080 The onboarding context shall show on the End turn button a small count of the warnings on the list. [tutorial §5.3]
- TUT-081 The onboarding context shall have the turn report link to the list instead of repeating it. [tutorial §5.3]
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
- TUT-100 The onboarding context shall use the action mapping in §4 for the tutorial's actions, with the controller column as a proposal to the input scheme thread. [tutorial §8.2]
- TUT-101 While a controller is used, every panel shall be navigable with the d-pad, focus shall start on the button the current step wants, and the spotlight shall follow the focused element. [tutorial §8.2]
- TUT-102 The tutorial shall need no text entry. [tutorial §8.2]
- TUT-103 The onboarding context shall give chapter 0 a different script per input, asking the player to try each camera action once; every later chapter uses one script with tokens. [tutorial §8.3]

### Starting, skipping and returning
- TUT-104 When the game is launched for the first time, after the title screen, the onboarding context shall ask "New to Pocket Hegemony?" with Play the tutorial (recommended), Guided campaign and I know the way. [tutorial §9]
- TUT-105 The onboarding context shall offer a chapter list in the main menu with a tick on each chapter done, and let any chapter be played at any time. [tutorial §9]
- TUT-106 The onboarding context shall keep tutorial progress (chapters done, muted Needs attention kinds, first-time entries seen) apart from campaign saves. [tutorial §9]
- TUT-107 When the player picks "Keep ruling the Ottomans" at the end of chapter 9, the onboarding context shall turn the tutorial save into a normal campaign save: the quiet world lifts, scripted events stop, the vizier's notes give way to the Needs attention list, and the save is marked "began as the tutorial" so it is not ironman. [tutorial §9]
- TUT-108 The onboarding context shall award no achievements in the tutorial. [tutorial §12, §13 settled]

### Accessibility and language
- TUT-109 The onboarding context shall size the tutorial note's text with the UI scale setting, letting the note take up to two lines more at the largest size. [tutorial §10]
- TUT-110 The onboarding context shall teach the chapter 0 lens step with the Food lens, whose hungry provinces also carry the hunger icon, so the lesson works without telling colours apart. [tutorial §10]
- TUT-111 Where reduced motion is on, the onboarding context shall not bob the hand or pulse the spotlight, and the Varna battle can be skipped to the result like any battle. [tutorial §3.9, §10]
- TUT-112 The onboarding context shall never auto-advance a `look` step and shall let `watch` steps be paused. [tutorial §10]
- TUT-113 The onboarding context shall keep all tutorial, Needs attention and Almanac text in string tables with keys, keeping tokens in the string, and run the step length lint per language. [tutorial §3.8, §10]

### Measuring
- TUT-114 Where the player has consented, the onboarding context shall send one event per tutorial step reached, skipped or finished, and per Needs attention entry followed or muted, and nothing else. [tutorial §11]
- TUT-115 While offline, the onboarding context shall queue measuring events and drop them after 30 days. [tutorial §11]

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
| GoThere(entry) | Player | Entry on list | Camera moves or screen opens | AttentionEntryFollowed |
| DismissEntry(entry) | Player | Entry on list | Entry removed; cooldown starts | AttentionEntryRemoved |
| MuteKind(kind) | Player | Entry on list | Kind muted | AttentionKindMuted |
| OpenWhy(stat) | Player | A number on a card | Why? shown | — |
| OpenAlmanac(entry) / SearchAlmanac(text) | Player | — | Entry or results shown | — |
| RunAttentionChecks | System (after each turn's simulation) | — | Entries added or removed | AttentionEntryAdded, AttentionEntryRemoved, FirstTimeSystemSeen |

## 7. Domain events

| Event | When | Payload | Consumed by |
|---|---|---|---|
| StepShown | A step appears | chapter, step id, kind | audio (`ui_hint`), measuring |
| StepCompleted / StepSkipped | A step ends | chapter, step id | audio, measuring |
| ChapterStarted / ChapterCompleted / ChapterSkipped | — | chapter | saves (progress), game-shell (chapter list ticks) |
| TutorialLeft | Player leaves | chapter, step | saves |
| TutorialConvertedToCampaign | Keep ruling the Ottomans | save id | saves (mark "began as the tutorial"), achievements (not ironman) |
| AttentionEntryAdded | A check holds | kind, line, place/screen | game-shell (Attention screen, End turn count), audio (new-warning sound) |
| AttentionEntryRemoved | Cause ended or dismissed | entry | game-shell |
| AttentionKindMuted | Player mutes a kind | kind | saves (progress), measuring |
| AttentionEntryFollowed | Go there pressed | entry | measuring |
| FirstTimeSystemSeen | First war, siege, etc. | system | saves (seen list) |
| GoalCompleted | A goal is ticked | goal | game-shell |

## 8. Policies (reactions to other contexts)

- When time-and-turns finishes a turn's simulation, then run every Needs attention check.
- When realm reports a province store reaching zero before the next harvest, a lord turning Wavering or
  Disloyal, gold running out in under three turns, a royal province with no official, a neighbour's
  disloyal bordering lord, or grain price high with a castle surplus, then add the matching entry.
- When warfare reports an army's food reserve under 15 days or pay owed, then add a Warning.
- When recruiting reports many farmers levied with the harvest near, then add a Warning.
- When rebellions report grievances past the rising threshold, then add a Warning.
- When warfare, rebellions or province report the first war, siege, battle, rising, famine or plague of the
  campaign, or research/events report the first invention of a new era or a new age, then add a New entry.
- When events fires a scripted `tutorial_only` event in the tutorial, then show its step(s).
- When saves reports "Reset tutorial and hints" (from settings), then clear progress, mutes and seen entries.

## 9. Monthly turn

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
| watch speed | Varna battle bell pace | one bell every 3 seconds | yes | tutorial scenario |
| idle pulse | Seconds idle before the pointer pulses | 8 | yes | tutorial scenario |
| idle skip hint | Seconds idle before "Stuck?" | 20 | yes | tutorial scenario |
| `max_chars` | Step text limit | 140 | yes | step script |
| spotlight dim | Dim of the rest of the screen | 50 % | yes | tutorial UI |
| note height | Max share of screen height | one third | yes | tutorial UI |
| faith hatching | Community share shown hatched on the Faith lens | 30 % or more | from religion | religion config |
| Bosporus ferry | Crossing time | 2 days + 1 day per 10,000 men | from troop movement | troop-movement config |
| league line | League shown on the country card | 4 members, 31,000 soldiers | yes | tutorial scenario |
| Same faith reason | Reason weight between Catholic members | +10 | from diplomacy | diplomacy config |
| Hungary terms | Offers terms after failing to take one castle in | two months | yes | tutorial scenario |
| goals period | Guided first turns visible for | first in-game year | yes | onboarding config |
| checks | Every Needs attention check, threshold, line, source | §4 table | yes | one checks config file |
| army food warning | Reserve threshold | under 15 days | yes | checks config |
| gold warning | Turns of gold left | under three turns | yes | checks config |
| check cooldown | Per-check return time after dismiss | e.g. famine: at most once a year | yes | checks config |
| skip step hold | Controller hold time | B / Circle for one second | proposal | input scheme |
| End turn hold | Controller hold time | Menu / Options half a second | proposal | input scheme |
| measuring retention | Offline queue life | 30 days | yes | onboarding config |
| devshirme interval (proposal) | Collections | every 5 years | yes (proposal) | recruiting config |
| *Sons taken* duration (proposal) | Grievance length | 10 years | yes (proposal) | rebellions/recruiting config |
| `tips` | Loading-screen tips linked to Almanac entries | list | — | tips config |
| glossary | Terms and plurals per language | file | — | localisation |

## 11. Seams

| Other context | Direction | Pattern | What crosses |
|---|---|---|---|
| game-shell | upstream | Partnership | Attention screen and where it opens; first-launch question; Tutorial menu entry and chapter list; three pause-menu lines; loading-screen tips; turn report link; End turn count |
| saves | upstream | Customer–Supplier | Tutorial progress and mutes stored apart and synced; chapter saves shipped read-only; converting a tutorial save into a campaign save marked "began as the tutorial" |
| settings | upstream | Conformist | Tooltip delay; Tutorial hints; "Reset tutorial and hints"; reduced motion; UI scale |
| achievements | downstream | Published Language | Tutorial saves are never ironman, so the tutorial earns none |
| audio | downstream | Customer–Supplier | Step shown / completed, vizier's note, new-warning sound requests |
| scenario-setup | upstream | Conformist | Normal 1444 setup, `owners-1444.json`, the Ottoman catalogue record (dates, lords, Hunyadi) |
| events | upstream | Customer–Supplier | Event format, `history` block, `tutorial_only`, `narrative_only`; asks the event tree for the Varna crusade and the abdication as real events, and an effect that grants a war aim |
| religion | upstream | Conformist | Faith policy screen, Restricted/Tolerated/Persecuted, protected communities, Faith lens, schools' faith, Pious lords |
| diplomacy | upstream | Conformist | Event-started leagues, reasons count, member reasons screen |
| warfare | upstream | Conformist | Defend the faith aim, battles, battle screen, sieges, storming, terms, peace voices, army food reserve, pay owed |
| troop-movement | upstream | Conformist | Strait crossings, Bosporus ferry, closed Dardanelles, days to cross |
| recruiting | upstream / downstream | Customer–Supplier | Levy, regiments, Janissaries, recruit pool, Marshal; receives the devshirme proposal |
| realm | upstream | Conformist | Country card, food policy, lords and loyalty, officials, tax, gold, schools |
| province | upstream | Conformist | Province card, People line, grievances, local store, hunger |
| map-presentation | upstream | Conformist | Zoom levels, lenses (Food, Faith), hunger icon, camera |
| research | upstream | Conformist | Choosing an invention, eras, Inventions Almanac section |
| rebellions | upstream | Conformist | Rising, rebellion card, five answers, grievances, *Sons taken* proposal |
| national-strengths | upstream | Conformist | *Kapıkulu household* birthright; Realms Almanac strengths |
| subjects | upstream | Conformist | Next pass: Serbia returned, the Morea's tribute |
| time-and-turns | upstream | Conformist | Checks run after each turn's simulation; Advance to… runs several turns |
| world-map | upstream | Conformist | Terrain data for the Ground section (22 tile types) |

## 12. AI

- The tutorial forces AI personalities: Hungary marches on Varna in chapter 5 with Hunyadi commanding; if the
  player lost at Varna, Hungary offers terms after failing to take one castle in two months; the Morea accepts
  terms after the wall falls.
- The quiet world holds back AI wars against the Ottomans (except scripted ones) and in the Balkans and
  western Anatolia (Karaman included).
- Proposal (not a rule here): Ottoman AIs keep the devshirme until the event tree's history ends it.

## 13. Open questions and contradictions

- **OQ-TUT-1** The Attention screen: this design lists three kinds (Warnings, Opportunities, New) with "Go there" and "Don't list this kind again"; the screen flow's G9 (owner of the screen) has two groups (Warnings, Waiting for you), a "Show" button, muting per item or per kind with unmute, and says it "says what is wrong, never what to do about it", which sits badly with Opportunities lines such as "A lord across the border may be won over". Names differ too ("Needs attention" vs "Attention"). Blocks: TUT-072 to TUT-083.
- **OQ-TUT-2** The step mock-up (§3.9) labels the face "The Chancellor", but the text says the face is the grand vizier Çandarlı Halil. Blocks: art and string keys.
- **OQ-TUT-3** Off-script consequences cross chapters (refused peace changes chapter 4's event line; an ignored wavering lord's riders stay home in chapter 7), but each chapter starts from a fixed save that puts the world back on its historical course. Which wins when chapters are played in sequence? Blocks: TUT-012, TUT-015, TUT-030, TUT-032.
- **OQ-TUT-4** §12 asks the turn report thread for "warnings always listed there (5.4)", but there is no section 5.4, and §5.3 says the turn report links to the list instead of repeating it. Blocks: TUT-081.
- **OQ-TUT-5** The first-launch question "New to Pocket Hegemony?" (§9) does not appear in the screen flow, which instead shows a Tutorial main-menu entry that moves under More once finished. The "Encyclopedia" of the screen flow is this design's "Almanac". Blocks: TUT-104, naming.
- **OQ-TUT-6** The saves design does not mention tutorial progress, Needs attention mutes, read-only chapter saves or the "began as the tutorial" mark. Blocks: TUT-004, TUT-106, TUT-107.
- **OQ-TUT-7** Sounds: this design asks for a step chime, a completion tick, the vizier's note and a new-warning sound, "ducked under music like stingers". The sound effects design gives only `ui_hint` (and `notify_alert` for "advisor hints", though there is no advisor after the tutorial), has no completion tick, and effects do not duck music. Blocks: audio for steps.
- **OQ-TUT-8** The devshirme in a real campaign (§3.7 proposal) needs the recruiting and sensitive-history threads to adopt or change it; it also affects age ratings. (§13.1)
- **OQ-TUT-9** Scripted events are not yet in the event tree; the event tree should add the Varna crusade and the abdication as real events, and an effect that grants a war aim (religion §18). Blocks: TUT-037, TUT-038.
- **OQ-TUT-10** Next pass (§13.2): fold in diplomacy (envoy step in chapter 1) and subjects (Serbia returned in chapter 1; the Morea's tribute in chapter 8).
- **OQ-TUT-11** The Ottoman worked-example numbers for recruiting, battle and siege lessons don't exist yet (only French ones). Blocks: TUT-018 and chapter saves.
- **OQ-TUT-12** Whether Advance to… becomes a real-game feature belongs to the turn report thread (gap list 2, item 7). The controller column of §8.2 waits on the input scheme thread. The privacy thread (consent for measuring) has no design yet.
- **OQ-TUT-13** Settings has a "Detailed tooltips" switch (off by default) that "shows the full breakdown of each number", which overlaps with "Why?" (always one tap away here), and a "Tutorial hints" switch whose effect this design does not define. Blocks: TUT-084 to TUT-086.
- **OQ-TUT-14** Free tier reference: the design cites "gap list 3, item 2" for the free tier; the decision is in gap list 1, item 2 (Ottomans and France). No conflict in substance.
- **OQ-TUT-15** Herds rules for pastoral realms are not designed (goal text "Choose how your herds are shared"). The accessibility thread should give every lens the tutorial uses a pattern or icon besides colour (only Food's hunger icon is given; Faith uses hatching at 30 %+).

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
