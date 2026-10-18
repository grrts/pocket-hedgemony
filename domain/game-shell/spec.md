# Game shell (SHELL)

## 1. Purpose and scope

The game shell decides which screens exist, how the player moves from one to the next, what each screen
holds at the level of navigation, how Back works on every device, how the campaign ends on screen, what happens
when the app is interrupted, and how screens are laid out by window shape. In this context **screens are the
domain**: the aggregate is the screen stack, and commands are what the player does to move through it.

In scope:
- Cold start: boot (S1), first-run questions (S2), title (S3), main menu (S4), new campaign (S5), load (S6),
  loading with tips (S7).
- In a campaign: the map (G1), cards (G2), the Realm book (G3), the game menu (G4), the turn as seen on screen
  (End turn, G5 turn in progress, G6 battles, G7 events, G8 turn report), the Attention screen (G9), and the
  other in-campaign screens (battle viewer, siege view, peace table, map mode picker, confirmation).
- How a campaign ends: game over (E1), campaign end (E2), final result (E3), and the victory conditions as far
  as they reach the screen flow.
- Interruptions: leaving and coming back (R1), purchases, the failure screen (X1).
- Layout by window shape (only the navigation rules), touch sizes, phones in landscape only.
- Navigation by input: Back on each device, touch gestures, controller action sets and focus, keyboard and mouse.
- The free tier on screen: the Full game ribbon, padlocks, the Unlock screen and the return from the unlock
  flow (no ads, D-SHELL-16).
- The screen list with ids (section 9 of screen flow) that music, sound and code key on.

Not in scope (owned by …):
- Save slots, autosave, ironman, cloud saves, what the Load list holds → `saves`.
- Every setting and its values, the Settings screen itself → `settings`.
- Map rendering, zoom levels and what each zoom shows, map modes → `map-presentation`.
- The achievement list and the achievement screen's content → `achievements`.
- Tutorial campaign, tips text, the Almanac (the in-game encyclopedia), first-time hints, what goes on the
  Needs attention list → `onboarding`.
- Interface and world sounds, music tracks → `audio`.
- Nation picker contents and game options in detail (gap list 2, item 2) → `scenario-setup` (no design yet).
- The notices the turn report lists → each owning context (D-SHELL-22). The score formulas the final result
  shows → `realm` §12 (X-12).
- The full key and button bindings → `settings` (its default layouts); the shell fixes only the actions of
  D-SHELL-7, D-SHELL-8 and D-SHELL-24.
- Battle rules and the battle view's content → `warfare`.
- Events and their options → `events`. Peace terms → `warfare` / `diplomacy`.
- The order of the systems in a month and the 4-hour steps while a player battle runs → `time-and-turns` (X-1, X-2).

## 2. Sources

Newest decision first.

0. `domain/DECISIONS.md` (17 Oct 2026): X-1 (Leroy, 17 Oct: while a player battle runs, time passes in 4-hour steps; no skip; standing orders, Retreat and a battle switcher), X-2 (turn
   order), X-5 (start date 11 November 1444), X-12 (how a campaign is won), X-15 (settings never change
   results), X-16 (save header flags, Needs attention mutes in the save). This spec's own decisions are in §13.
1. `planning/gap-lists.md`, "Decisions already made" and List 1 item 1 (16 Oct): the campaign runs 1444 to a
   default end of 31 August 1939; a campaign is won by world domination or by leading in Economy, Power or
   Technology (still needs a design); business model: paid full game, Steam free demo, free mobile download
   with in-app purchases; free countries the Ottomans and France (List 3 item 2).
2. `screen-flow/screen-flow-design.md` v1, all sections, including the decisions of 16 Oct in §4.6 (unanswered
   events block End turn; the turn stops for every player battle; the Attention screen replaces the advisor),
   §5 E1 (play on after game over ends achievements), §7.2 (phones landscape only), §10 (open questions, all
   decided) and §11 (changes for other files).
3. Read for seams only: `settings/settings-design.md` v2 (§2, §5.3, §5.4, §6.3, §6.4, §8),
   `save-system/README.md` (§2, §6.2, §7, §9), `achievements/achievements-design.md` v1.1 (ironman only),
   `tutorial/tutorial-design.md` (§5, §9, §12), `warfare/warfare-design.md` §7.15, `music-design/README.md`
   §4.1, §5.2.
4. Today's build (`apps/client`, `apps/mobile/scripts/landscape.mjs`): a thin top bar, a tool column, a
   fold-away panel, the End turn button with a badge, phones and iPads locked to landscape.

## 3. Ubiquitous language

| Term | Meaning | Not to be confused with |
|---|---|---|
| Screen | One place the player can be, with an `id` from the screen list (§9 of screen flow) | A card (a kind of screen) |
| Screen stack | The single stack every screen lives on; Back pops its top | A card's stack (a stack of cards inside G2) |
| Back | The one "go one step back" action: system back, on-screen Back or ✕, Esc, controller B, mouse button 4 | Exit to main menu |
| Map (G1) | Home during a campaign; always loaded underneath | The title's drifting map background |
| Card (G2) | One thing on the map (province, army, commander, country, lord, castle, rebellion, sea zone) over part of the screen | A full screen |
| Name tab | The tab in the lower left that shows the selected thing's name; tapping it opens its card | A Realm book tab |
| Minimise (was Fold away) | Shrinking a card back to its name tab | Closing a card |
| Fold-out | A gain-and-lose list opened inside a card | A new screen |
| Realm book (G3) | One full screen with up to six tabs for realm-wide screens | A card |
| Modal | A screen that needs an answer before anything else (event, peace offer, confirmation, game menu) | A card |
| Decide later | What Back means on a modal where putting off the answer is allowed | Answering |
| Game menu (G4) | The in-campaign menu (not a pause screen; the game is turn-based) | Main menu (S4); "pause menu" in other designs means this |
| End turn | The hourglass button that ends the player's month | Turn report |
| Badge | The count on End turn: lines on the Needs attention screen; with unanswered events, the event count on the scroll icon | Attention bell |
| Needs attention screen (G9) | The one list of warnings and items waiting for the player, titled "Needs attention" on screen (screen id `attention`); says what is wrong, never what to do (D-SHELL-15). "Attention screen" in this spec means the same screen | Turn report; an advisor (none exists) |
| Attention bell | The bell next to the date that lights when the Attention screen holds a warning | Badge |
| Warning | An Attention line saying something bad is coming or happening | A waiting item |
| Waiting item | An Attention line for something that needs the player (unanswered event, peace offer, idle army …) | A warning |
| Mute | Silencing one Attention line ("Mute this"), or every line of its kind ("Don't list this kind again") | Deleting it |
| Turn in progress (G5) | The map while the month is worked out, orders frozen | Loading |
| Battle view | The battle viewer while a player battle runs in 4-hour steps: progress, Standing orders, Retreat, and the switcher when several run | Replay |
| Battle switcher | The list of the player's running battles, each with its progress; picking one shows it | |
| Result card | The battle view's last card once every running player battle has ended: who won, men lost, the one-line reason, Carry on | Turn report |
| Carry on | Return the day loop to whole days once every player battle has ended | Retreat |
| Turn report (G8) | Short list of what happened this turn | Attention screen |
| Unsaved turns | Turns played since the last save the player made | — |
| Game over (E1) | The player's realm no longer exists | Campaign end |
| Campaign end (E2) | The end date is reached or the player wins by world domination | Game over |
| World domination | Owning or holding as subjects half of the world's settled land provinces; checked each January, wins at once (X-12) | A score win |
| Score win | Leading the Economy, Power or Technology score when the campaign ends; ties share the win (X-12) | World domination |
| Keep playing | After a world domination win, going on to the end date | Play on (after game over) |
| Final result (E3) | The three scores of the leading realms, the outcome (wins or the player's rank) and achievements of this campaign | Game over card |
| Play on | After game over, continuing as another realm on the current map | Playing past the end date (not allowed) |
| Shape | The window class used for layout: Short wide, Tall, Large, Far | A device profile (settings) |
| Action set | A controller mapping per layer, in Steam Input terms | A key binding |
| First focus | The element focused when a screen opens, for controller and keyboard | — |
| Tip | One line from the tips table shown on the loading screen | A tooltip |
| Free tier | The free mobile download and the Steam demo; both offer only the Ottomans and France, have no ads and no other limit (D-SHELL-16) | The full game |
| Full game ribbon | The small ribbon on the main menu in the free tier that leads to Unlock | A pop-up (there are none) |
| Almanac | The in-game encyclopedia (screen id `almanac`), owned by onboarding | — |
| First-launch question | "New to Pocket Hegemony?", asked once after the first Tap to start | A first-run card |

## 4. Domain model

### Aggregates

**ScreenStack** (one per running app)
- Identity: the app session.
- Holds: the ordered list of open screens (`id`, kind, first focus, scroll and camera position per screen);
  the current shape; the last input device; whether a campaign is loaded.
- INV-SHELL-1: Back always removes exactly the top screen, except where the screen list says otherwise
  (map → opens game menu; main menu → Tap to start; title on Android → leaves the app; running battle → back to
  the map while it keeps running; modals that do not allow "decide later").
- INV-SHELL-2: During a campaign the map is always at the bottom of the stack and is never unloaded.
- INV-SHELL-3: No in-campaign screen is more than three steps from the map.
- INV-SHELL-4: A modal on top accepts no input to the screens below until answered or put off.
- INV-SHELL-5: Exactly one element has focus whenever a controller or keyboard is the last input device, and it
  is drawn with the gold focus frame.

**CardStack** (inside G2)
- Holds the cards opened from one another (province → owner's country → commander) and the folded state.
- INV-SHELL-6: Tapping empty map clears the card stack.
- INV-SHELL-7: The card's "Back to <name>" button always names the card below it.

**TurnSession** (one per player turn on screen)
- Holds: phase (orders, in progress, battle running, events, report), the player battles running and the one shown, unanswered events in date order,
  battles of this month that involve the player in their order within the month, Attention lines.
- INV-SHELL-8: While any event is unanswered, End turn cannot end the turn.
- INV-SHELL-9: While the turn is in progress, no order can be given.
- INV-SHELL-10: Warnings never block End turn.
- INV-SHELL-11: Nothing ever answers an event for the player.

**AttentionList**
- Holds lines in two groups (Warnings, Waiting for you), most urgent first, each with icon, sentence, target;
  the muted items and muted kinds.
- INV-SHELL-12: A muted kind produces no visible line until it is unmuted; muted kinds are always listed at the
  bottom.

### Entities and value objects

- **Screen** (value): `id`, kind (Full, Same screen, Overlay, Sheet, Modal, Home), first focus, Back target,
  music, owner of content. The full list is the screen catalogue in §5 (SHELL-124).
- **Shape** (value): Short wide, Tall, Large, Far.
- **InputDevice** (value): touch, mouse, keyboard, controller (Xbox, PlayStation, Steam, Switch-style glyphs).
- **MenuEntry** (value): label, shown-when condition, target.
- **Tip** (value): text, era tag, region tag, new-player flag.
- **LoadingStep** (value): a real step name ("Reading the save", "Drawing the borders", "Waking the courts").
- **EndingCard** (value): one-line cause, date, realm highs (largest size, years lasted, battles won).
- **Outcome** (value): the wins of the campaign (World domination, Economy, Power, Technology, shared or not)
  or, with none, the player's rank in each score.
- **CampaignSummary** (value, read from the newest save's header): banner, realm name, in-game date, borders.

### Domain services

- **ShapeClassifier**: picks the shape from the window (height, aspect, TV output, Settings choice).
- **TipPicker**: picks a tip matching realm and date.
- **BackRouter**: turns the device's back input into the Back command (INV-SHELL-1).

## 5. Requirements

### 5.1 Principles

- SHELL-001: While a campaign is loaded, the game shell shall show every in-campaign screen either as a card over the map or as a full screen that closes back onto the map, and shall never unload the map. [screen-flow §1.1]
- SHELL-002: The game shell shall keep all screens on one stack, and the system back gesture, the on-screen Back button, Esc and the controller's B button shall each pop the top of the stack. [screen-flow §1.2]
- SHELL-003: The game shell shall place no screen more than three steps from the map. [screen-flow §1.2]
- SHELL-004: When the game is cold-started with a campaign in progress, the game shell shall bring the player to their map in two taps: Tap to start, then Continue. [screen-flow §1.3]
- SHELL-005: The game shell shall show first-run questions only once, and shall show confirmations only where something is lost (leaving without saving, overwriting a save). [screen-flow §1.4]
- SHELL-006: The game shell shall lay out screens by the shape of the window, not by the kind of device. [screen-flow §1.5]
- SHELL-007: The game shell shall make every screen usable with only a controller and with only touch, and no action shall exist only as a hover or only as a long press. [screen-flow §1.6, §8.2]
- SHELL-144: The game shell shall give each subject one home, a card, a tab or a screen, and shall place every action and figure of a feature in the home of its subject, never spread across unrelated panels. [X-19]
- SHELL-145: For each thing the player must keep track of (armies, garrisons, wars, warnings, anything waiting for an answer), the game shell shall offer an overview that shows its state at a glance and leads to the detail in one tap. [X-19]
- SHELL-146: The game shell shall make every screen and card fit a phone held in landscape as well as a desktop window, in both the Wide and Tall layouts, keeping the map visible where the card allows. [X-19; SHELL-006]

### 5.2 Boot and first run

- SHELL-008: When the game starts cold, the game shell shall show the boot screen (the pixel logo on parchment with the hourglass turning) while the map, sprites and engine worker load, with no studio logos and no video. [screen-flow §3 S1]
- SHELL-009: Where the game runs on iOS or Android, the native launch screen shall show the same logo as the boot screen. [screen-flow §3 S1]
- SHELL-010: If loading finishes in under 0.6 s, then the game shell shall still hold the boot screen for 0.6 s; otherwise it shall stay only as long as loading takes. [screen-flow §3 S1; placeholder]
- SHELL-011: If loading fails (a missing file, or the worker won't start and the main-thread fallback also fails), then the game shell shall show the failure screen X1. [screen-flow §3 S1]
- SHELL-012: When the game runs for the first time, the game shell shall show the first-run questions before the title, each as one card with one choice, and shall not show them again. [screen-flow §3 S2]
- SHELL-013: If the device language is not one the game has, then the game shell shall ask for the language on a first-run card; otherwise it shall use the device language silently, changeable in Settings. [screen-flow §3 S2]
- SHELL-014: Where something is collected that needs consent (crash reports, the tutorial's step counts), the game shell shall show one consent card that asks for both, off until the player turns them on; where nothing on a store needs consent, the card shall not appear there. [screen-flow §3 S2; D-SHELL-16, D-SHELL-22]
- SHELL-015: The game shell shall ask for no account sign-in in the first-run path or anywhere before play, and the game shall play offline. [screen-flow §3 S2]

### 5.3 Title and main menu

- SHELL-016: The title screen shall show the real map at world zoom drifting slowly across a region, drawn by the map renderer; while a campaign is in progress it shall drift over the player's realm in its current borders, read from the latest save's summary rather than the whole save. [screen-flow §3 S3, §10.5] *Replaced by SHELL-150 (start screen, 18 Oct): region zoom.*
- SHELL-017: When the title screen receives any touch, click, key or controller button, the game shell shall treat it as Tap to start and the `title` track shall start. [screen-flow §3 S3] *Replaced by SHELL-149: no Tap to start.*
- SHELL-018: The title screen shall show a small settings cog that opens Settings straight away, a ✕ that quits on desktop only, and the version number in a corner. [screen-flow §3 S3] *Replaced by SHELL-154: the cog and Quit move into the icon row.*
- SHELL-019: When the player taps to start, the "Tap to start" line shall fold open into the main menu in the same place on the same screen, and Back from the main menu shall return to "Tap to start". [screen-flow §3 S4] *Replaced by SHELL-149: the menu shows straight away.*
- SHELL-020: While a campaign exists, the main menu shall show Continue, labelled with the realm's banner, name and in-game date ("France · May 1503"), which goes to Loading with the newest save. [screen-flow §3 S4]
- SHELL-021: The main menu shall always show New campaign, which goes to S5. [screen-flow §3 S4]
- SHELL-022: While any save exists, the main menu shall show Load, which goes to S6. [screen-flow §3 S4]
- SHELL-023: The main menu shall always show Tutorial, which opens the tutorial's chapter list, and shall move it under More once the tutorial is finished. [screen-flow §3 S4; tutorial §9; D-SHELL-3]
- SHELL-024: The main menu shall always show More, which holds Settings, Achievements, Almanac, Unlock (Buy the full game in the Steam demo) and Credits. [screen-flow §3 S4, §2]
- SHELL-025: Where the game runs on desktop or Steam, the main menu shall show Quit, which closes the game; phones shall have no Quit. [screen-flow §3 S4]
- SHELL-026: When the main menu opens, focus shall start on Continue when it exists, otherwise on New campaign. [screen-flow §3 S4; D-SHELL-3]
- SHELL-027: The main menu's first entry shall be large and wax-red, and the rest paper buttons in the existing art style. [screen-flow §3 S4]
- SHELL-028: The game shall show no ads in any edition: not on the main menu, the loading screen, in a campaign, the game menu or the end screens. [D-SHELL-16]
- SHELL-029: Where the game is the free tier, the main menu shall show a small "Full game" ribbon that leads to Unlock, never as a pop-up. [screen-flow §3 S4]

### 5.4 New campaign, load and loading

- SHELL-030: The new campaign screen shall hold three steps on one screen with a step strip at the top ("Realm · Options · Begin"), and Back shall move one step back. [screen-flow §3 S5]
- SHELL-031: Step 1 shall let the player choose a realm on the map at world zoom, with filters (region, difficulty, free or locked) and a short list of suggested realms; tapping a realm shall show its card with its strengths at a glance. [screen-flow §3 S5]
- SHELL-032: When a realm is locked, its card shall show a padlock and a button to the Unlock screen, and coming back from a purchase shall return to step 1 with that realm still chosen. [screen-flow §3 S5, §6 Purchases]
- SHELL-033: Step 2 shall offer difficulty, AI aggression, fog, historical or free events, ironman, and the end date, with presets that fill the whole step; the end date is 31 August of a year from 1494 to 1939, 31 August 1939 by default. [screen-flow §3 S5; D-SHELL-14]
- SHELL-034: Step 3 shall show a summary card (banner, ruler, capital, start date, options) and one big Begin button. [screen-flow §3 S5]
- SHELL-035: When the player presses Quick start on step 1, the game shell shall skip to Begin with the last options used and the realm the player last tapped, or the first suggested realm. [screen-flow §3 S5]
- SHELL-036: When the player presses Back on step 1, the game shell shall return to the main menu without asking. [screen-flow §3 S5]
- SHELL-037: While the new campaign screen is open, the `nation_select` track shall play, its lead voice changing with the highlighted realm. [screen-flow §3 S5]
- SHELL-038: The Load screen shall list saves newest first, each with banner, realm, in-game date, real date saved and an autosave or ironman mark, in one flat list (not grouped by campaign), and tapping one shall show its card with Load and Delete. [screen-flow §3 S6; D-SHELL-4]
- SHELL-039: When the player loads a save from the main menu, the game shell shall go to Loading with no confirmation. [screen-flow §3 S6]
- SHELL-040: When the player loads from the game menu while the current campaign has unsaved turns, the game shell shall first ask "Leave <date> unsaved? · Save first · Leave · Cancel". [screen-flow §3 S6, §4.5]
- SHELL-041: The loading screen shall show a tip from the one tips table in the config, tagged by era, region and whether it is for new players, picking one that fits the realm and date; tapping or pressing left and right shall show another. [screen-flow §3 S7]
- SHELL-042: The loading screen's bar shall show the real loading steps ("Reading the save", "Drawing the borders", "Waking the courts") rather than a fake timer, and its rider, road, bar and dots shall keep moving while the game is busy, so the player can see it has not frozen. [screen-flow §3 S7]
- SHELL-043: When loading finishes, the game shell shall go straight to the map without asking for a tap, but shall keep a tip on screen for at least 2 s after it appeared before fading. [screen-flow §3 S7; placeholder]
- SHELL-044: While the loading screen is shown, the `load_resume` track shall play. [screen-flow §3 S7]

### 5.5 Layers, map and cards

- SHELL-045: The game shell shall treat in-campaign screens as four layers: the map (Back opens the game menu), cards (closed by Back, ✕, tapping empty map or minimising), full screens (Back or ✕ returns to whatever was below) and modals (closed only by their own buttons; Back means "decide later" where that is allowed). [screen-flow §4.1]
- SHELL-046: When a card opens another card, the game shell shall stack it on the card stack, show a "Back to <name>" button at the bottom of the card for the card below, and clear the card stack when the player taps empty map. [screen-flow §4.1]
- SHELL-047: The map's top bar shall show the realm name and banner (opening the country card), the date, gold with its monthly change, and levies; on a phone it shall hold at most five plaques and move the rest into the country card. [screen-flow §4.2]
- SHELL-048: The map's tool column at the right edge shall hold map mode, go to capital, and Realm book. [screen-flow §4.2]
- SHELL-049: The End turn button (the hourglass, lower right) shall carry a badge counting the items on the Attention screen, and tapping the badge or pressing the controller's "next" button (d-pad right) shall open the Attention screen. [screen-flow §4.2; D-SHELL-7]
- SHELL-050: The Attention bell next to the date shall light up while the Attention screen holds a warning and shall open it; it shall be the only place the game warns the player. [screen-flow §4.2]
- SHELL-051: The map shall show a game menu button (a small three-line icon) in the upper left next to the banner. [screen-flow §4.2]
- SHELL-052: The local zoom's tile-row view shall remain the map, not a separate screen. [screen-flow §4.2]
- SHELL-053: While the shape is Short wide, a card shall take the full height of the left 45 % of the screen and the map shall stay live on the right, recentred so the selected thing is not hidden. [screen-flow §4.3; placeholder]
- SHELL-054: While the shape is Tall, a card shall be a bottom sheet at 55 % height that can be dragged up to full height or down to a peek strip. [screen-flow §4.3; placeholder]
- SHELL-055: While the shape is Large, a card shall be a side sheet 380 px wide at UI scale 1. [screen-flow §4.3; placeholder]
- SHELL-056: When the player taps something on the map, the game shell shall only select it and show its name on a tab in the lower left; tapping the tab, or tapping the selected thing again, shall open its card. [screen-flow §4.3]
- SHELL-057: When the player folds a card away, it shall shrink back to its name tab, and tapping the tab shall open it again. [screen-flow §4.3]
- SHELL-058: When the player opens a line on a card that the designs say "opens its gain and lose list", the list shall open inside the card as a fold-out, not as a new screen. [screen-flow §4.3]

### 5.6 Realm book

- SHELL-059: The Realm book shall be one full screen with the tabs Realm, Treasury, Army, Abroad, Learning and Chronicle holding the screens listed in screen flow §4.4, and shall open on the tab the player last used. [screen-flow §4.4]
- SHELL-060: The Realm book shall have at most six tabs; a new system shall add a section inside a tab, not a seventh tab. [screen-flow §4.4]
- SHELL-061: The Realm book shall show its tabs as a narrow left rail of icons in the Short wide shape, a row of icons along the bottom in the Tall shape, and icon and name on a left rail in the Large shape. [screen-flow §4.4]
- SHELL-062: When the player presses Show on map on a screen in the book that points at an army or province, the game shell shall close the book, move the camera and open that card, and Back from there shall return to the book on the same tab and scroll position. [screen-flow §4.4]
- SHELL-063: When a book screen is opened from a card (such as Levy from a province card), the game shell shall open the same screen stacked on the card, and Back shall return to the card. [screen-flow §4.4]

### 5.7 Game menu

- SHELL-064: When the player presses the game menu button, presses Back on an empty map, presses Esc, or presses the controller's Menu button, the game shell shall open the game menu as a modal over the dimmed map; it is a menu, not a pause screen. [screen-flow §4.5]
- SHELL-065: The game menu shall hold, in order: Return to the map (focused first), Save, Load, Settings, Almanac, Achievements, Exit to main menu, and Quit (desktop and Steam only). [screen-flow §4.5; D-SHELL-11, D-SHELL-15]
- SHELL-066: While the campaign is ironman, the game menu's Save entry shall read "Save and quit". [screen-flow §4.5]
- SHELL-067: When the player picks Settings in the game menu, Settings shall open as an overlay and return to the game menu when closed. [screen-flow §4.5]
- SHELL-068: When the player picks Exit to main menu or Quit, the game shell shall ask only if there are unsaved turns; while the campaign is ironman it shall save and exit without asking. [screen-flow §4.5]

### 5.8 The turn

- SHELL-069: When the player taps End turn and no event is unanswered, the game shell shall end the turn with one tap, showing a confirmation only if Settings turns it on. [screen-flow §4.6]
- SHELL-070: While any event is unanswered, the End turn button shall show the event's scroll icon with the count instead of the hourglass, and tapping it shall open the first unanswered event instead of ending the turn. [screen-flow §4.6, decided 16 Oct]
- SHELL-071: While the turn is in progress, the map shall stay visible and can be panned and zoomed, orders shall be frozen, the hourglass shall turn, armies shall march along their routes and borders shall change as the worker's results arrive. [screen-flow §4.6 G5]
- SHELL-072: If a turn takes longer than 1.5 s, then the game shell shall show a small parchment strip saying what is being worked out ("The courts of Europe deliberate…"). [screen-flow §4.6 G5; placeholder]
- SHELL-073: When the player ends the turn, the orders journal shall be closed with the turn's orders before the turn runs, so the Resume save and the journal together hold the world before the turn and the app being killed mid-turn loses nothing. [screen-flow §4.6 G5; saves §3.1; D-SHELL-5]
- SHELL-074: When the day loop brings a player army or fleet together with a hostile one, the map shall fly to the battle and the battle view shall open on it, showing both sides, their commanders, the ground, its progress and this battle's standing orders; while it runs, time shall pass in steps of 4 hours (6 a day), and the view shall offer Standing orders and Retreat and no way to skip the result. [screen-flow §4.6 G6; X-1 (17 Oct); D-SHELL-2]
- SHELL-075: While a player battle runs, the game shell shall let the player change its standing orders or order a retreat at any 4-hour step; when every running player battle has ended (a side beaten or retreated), the battle view shall show the result card (who won, men lost, the one-line reason) with Carry on. [screen-flow §4.6 G6; X-1]
- SHELL-076: When the player presses Carry on, the day loop shall go back to whole days until the next player battle or the end of the turn, with battles coming in the order they happen within the month. [screen-flow §4.6 G6; X-1]
- SHELL-077: When realms other than the player's fight a battle, time shall not slow; the battle shall appear on the map and, if it matters to the player, in the turn report. [screen-flow §4.6 G6]
- SHELL-078: The game shell shall keep every battle watchable again from the turn report and the Chronicle tab. [screen-flow §4.6 G6, §4.7]
- SHELL-079: If the app goes to the background while a player battle runs, then it shall come back to the same battle at the same step; if the app was killed, the Resume save and the orders journal shall replay the month to that battle with the same result. [screen-flow §4.6 G6; X-1; D-SHELL-5, D-SHELL-23]
- SHELL-080: When events arise, they shall open one at a time as a modal card (picture, text, two or three options, each option showing its effects on tap or focus), queued in date order. [screen-flow §4.6 G7]
- SHELL-081: When the player presses Look at the map on an event, the event shall shrink into the badge on End turn so the player can check something before answering. [screen-flow §4.6 G7]
- SHELL-082: When the turn ends and something worth reporting happened (a notice an owning context marks for the player's turn report), the turn report shall slide in from the edge as a card listing what happened, each line jumping to its place on the map or its card, and shall close on the first map tap; if nothing worth reporting happened, only the date in the top bar shall change. [screen-flow §4.6 G8; D-SHELL-22] *Replaced in part by SHELL-147 (playtest feedback): the report goes into the Dispatches log and never slides in by itself.*

### 5.9 Attention screen

- SHELL-083: The Attention screen, titled "Needs attention", shall open from the bell in the top bar, the badge on End turn, the controller's "next" button, and the End turn question, as a card over the map. [screen-flow §4.6 G9; D-SHELL-15]
- SHELL-084: The Attention screen shall list its lines in two groups, Warnings then Waiting for you, most urgent first; onboarding's opportunity and New lines go under Waiting for you. [screen-flow §4.6 G9; D-SHELL-15]
- SHELL-085: Warnings shall cover things bad that are coming or happening (for example famine in a province within two months, pay owed to an army, an army hungry, a castle breached, a rising brewing, peace voices passing half against you, a ruler without an heir), and Waiting for you shall cover events not yet answered, peace offers, idle armies and fleets, empty research or school slots and unspent levies. [screen-flow §4.6 G9]
- SHELL-086: Each Attention line shall have an icon, one sentence and a Show button that jumps to its place on the map or its card, and Back from there shall return to the Attention screen. [screen-flow §4.6 G9]
- SHELL-087: When the player mutes a line with the line's own buttons ("Mute this" or "Don't list this kind again", also shown in the explanation a long press opens), the game shell shall silence that item or every item of its kind, list muted kinds at the bottom, let them be unmuted, and keep the mutes in the save. [screen-flow §4.6 G9; X-16; D-SHELL-10, D-SHELL-15]
- SHELL-088: Where Settings turns on the End turn confirmation, the question shall name the count of open warnings ("3 warnings wait for you · Look · End turn anyway"), and warnings shall never block the turn; unanswered events are never counted there, because they block End turn (SHELL-070). [screen-flow §4.6 G9; D-SHELL-6]
- SHELL-089: The Attention screen shall say what is wrong and never what to do; its warnings and their thresholds shall live in one config table, to which each system's design adds its own lines. [screen-flow §4.6 G9]

### 5.10 Other in-campaign screens

- SHELL-090: When the player presses Back in the battle view while player battles run, the game shell shall return to the map while they keep running in 4-hour steps (the switcher reopens the view); in a replay, Back shall return where the replay was opened. [X-1] [screen-flow §4.7, §9]
- SHELL-091: The siege view shall be a full screen opened from a besieged castle at local zoom or from its card, and Back shall return to the map at the castle. [screen-flow §4.7]
- SHELL-092: The peace table shall be a modal opened from the Abroad tab, an enemy's country card, or an incoming offer, returning where it was opened; an incoming offer shall not be dismissable, only answered or put off one turn. [screen-flow §4.7] *Replaced in part by SHELL-140 (the enemy's country card means its Diplomacy tab) (playtest feedback).*
- SHELL-093: The map mode picker shall be a small pop-over from the tool column returning to the map, and a confirmation shall be a small modal for destructive actions only, returning to the screen below unchanged. [screen-flow §4.7]

### 5.11 How a campaign ends

- SHELL-094: When the player's realm no longer exists (annexed, or every province lost), the game shell shall show game over: the map zooms out over the old borders while the `game_over` track plays, and a card says how it ended in one line with the date ("Burgundy was divided between France and the Empire · 1477") and the realm's highs (largest size, years lasted, battles won). [screen-flow §5 E1; D-SHELL-17]
- SHELL-095: The game over card shall offer Look back (the Chronicle, read only), Play on as another realm (any realm on the current map) and Main menu. [screen-flow §5 E1]
- SHELL-096: Play on as another realm shall be allowed in every campaign including ironman, shall end achievements for that campaign, shall say so on the button before it is pressed ("Achievements end for this campaign"), and shall not be undoable. [screen-flow §5 E1, decided 16 Oct; achievements v1.1]
- SHELL-097: When the end date is reached (default 31 August 1939) or the player wins by world domination, the game shell shall show the final wrap-up event or events as normal event cards, then a closing sequence of the map at world zoom stepping through the player's borders by era with the `campaign_end` track, then the final result. [screen-flow §5 E2; gap-lists campaign span; X-12]
- SHELL-098: When a realm wins, by world domination (SHELL-129) or by leading the Economy, Power or Technology score when the campaign ends (SHELL-130), the win shall be shown on the final result; a domination win by the player starts campaign end at once. [gap-lists List 1 item 1, decided 16 Oct; X-12; D-SHELL-1]
- SHELL-099: The final result screen shall show the ledger comparison (the Economy, Power and Technology scores of the player and the five leading realms), the outcome (the wins, or with none the player's rank in each score), the achievements earned in this campaign or, in a campaign that is not ironman, the line "Achievements are earned only in ironman campaigns", and Main menu or Credits. [screen-flow §5 E3; X-12; D-SHELL-1, D-SHELL-21, D-SHELL-22]
- SHELL-100: The game shell shall offer no "play on" past the end date, and the end date shall be the one chosen when the campaign started (S5 step 2). [screen-flow §5 E2; X-14]

### 5.12 Interruptions

- SHELL-101: When the app goes to the background (home button, a call, the screen locks), the game shell shall write the orders journal if any order or answer was given since the last save, and suspend sound. [screen-flow §6 R1; saves §3.1, §5.2; D-SHELL-5]
- SHELL-102: When the app comes back while still in memory, or a Steam Deck resumes from suspend, the game shell shall return straight to the exact screen, scroll and camera without the title, and `load_resume` shall play. [screen-flow §6 R1]
- SHELL-103: When the app was closed by the system while in the background, the next start shall be a cold start with Continue pointing at that save, and after loading the map shall show a one-line strip "Picked up where you left off". [screen-flow §6 R1]
- SHELL-104: If a turn was running when the app went to the background, then the worker shall pause with the app and the turn shall carry on when it returns; if the app was killed, the Resume save and the orders journal shall be used. [screen-flow §6 R1; D-SHELL-5]
- SHELL-105: When the unlock flow ends, it shall return to where it was opened (the realm picker with the bought realm chosen, or the menu); a failed or cancelled purchase shall return to the same place with no extra message beyond what the store shows. [screen-flow §6 Purchases]
- SHELL-106: If there is no connection when the unlock flow is used, then it shall show "No connection: try again later" and block nothing else. [screen-flow §6 Purchases]
- SHELL-107: If a failure occurs that the game cannot recover from on its own (the engine worker crashes, a save won't read), then the game shell shall show one failure screen that says what failed in plain words and offers Restore the last save (the Resume save), Main menu and, where a crash reporter is approved, Send a report, and shall never show a stack trace. [screen-flow §6 X1; D-SHELL-5]

### 5.13 Layout by window shape

- SHELL-108: While the window is a phone in landscape (height under 500 css px), the game shell shall use the Short wide layout: map first, cards as side sheets on the left, the Realm book's tabs as a left icon rail and the top bar as one thin row; the shape follows the window only, while the settings device profile only picks setting defaults. [screen-flow §7.1; placeholder; D-SHELL-20]
- SHELL-109: While the window is a tablet in portrait or a desktop window taller than wide (never a phone), the game shell shall use the Tall layout: cards as bottom sheets, the Realm book's tabs as a bottom icon row, and the tool column on the right edge above the End turn button. [screen-flow §7.1]
- SHELL-110: While the window is a tablet in landscape, a desktop window or a Steam Deck (1280 × 800), the game shell shall use the Large layout: side sheets with a fixed width, menus centred with a maximum width, nothing stretched edge to edge. [screen-flow §7.1]
- SHELL-111: While the game runs on a TV or Steam Machine (chosen in Settings or detected from a TV output), the game shell shall use the Far layout: the Large layout with UI scale raised so body text is about 1/30 of screen height, thicker focus frames, and nothing in the outer 5 % of the screen. [screen-flow §7.1; placeholder]
- SHELL-112: The game shell shall keep the system safe areas (notches, rounded corners, the home indicator) clear of buttons in every shape. [screen-flow §7.1]
- SHELL-113: Where the device is a phone, the game shall play in landscape only on every screen, menus included, and a phone held upright shall show the notice "Turn your phone sideways"; tablets and desktop windows shall use whichever shape they are in, including Tall during a campaign, so tablets are not locked to landscape. [screen-flow §7.2, decided 16 Oct; D-SHELL-19]
- SHELL-114: The game shell shall make every tap target at least 44 × 44 points with 8 points between neighbours. [screen-flow §7.3; placeholder]
- SHELL-115: The game shell shall never place a button that ends the turn or loses something (End turn, Delete save, Exit to main menu) next to a frequent button or at the very edge where a phone case or grip covers it. [screen-flow §7.3]
- SHELL-116: The game shell shall place the End turn button and the game menu button at opposite corners. [screen-flow §7.3; D-SHELL-18]

### 5.14 Navigation by input

- SHELL-117: The game shell shall map Back to the system back button or gesture on Android; the on-screen Back or ✕ on iOS, with an edge swipe on full screens only and never over the map; Esc on a keyboard; B (east button) on a controller; and the on-screen Back or ✕ or mouse button 4 with a mouse. [screen-flow §8.1]
- SHELL-118: When the player presses Back on the map with nothing open, the game menu shall open; on the main menu Back shall return to "Tap to start"; on Android, Back on "Tap to start" shall leave the app. [screen-flow §8.1]
- SHELL-119: On the map, touch shall work as: tap selects a province, army or castle and shows its name tab; drag pans; pinch zooms; long press shows what is under the finger without selecting it; tapping an army then a province gives a march order with no confirm step, and tapping the army's own province halts it. [screen-flow §8.2; D-SHELL-9]
- SHELL-120: On cards, the book and menus, touch shall work as: tap presses; drag scrolls; pinch does nothing; long press shows the item's explanation (the same text a tooltip shows on desktop). Long press shall never do anything that cannot also be reached by tap; it only explains, and any button inside an explanation is also on the item itself. [screen-flow §8.2; D-SHELL-10]
- SHELL-121: The game shell shall use three controller action sets: Map (the map, G1), Battle (the battle viewer) and Menu (every other screen: S1–S7, Settings, Achievements, cards, the Realm book, events, confirmations and the game menu), plus the settings' Text layer while a text field is open; Menu offers move focus, select, back, the bumpers to switch tabs or step through the card stack, and Show on map. [screen-flow §8.3; settings §6.3; D-SHELL-8]
- SHELL-122: In the Map action set, the game shell shall offer a free cursor on the left stick that snaps gently to provinces, armies and castles, pan on the right stick, zoom on the triggers, select, context actions, next army on the bumpers, the next waiting item on d-pad right, open the Realm book, open the game menu with a short press of Menu, and End turn by holding Menu for 0.5 s; on a keyboard, End turn is Enter held for 0.5 s. [screen-flow §8.3; tutorial §8.2; placeholder; D-SHELL-7]
- SHELL-123: While a controller or keyboard is in use, focus shall always be visible as the gold frame used for the chosen map mode, every screen shall have its defined first focus, and the focus order shall follow reading order. [screen-flow §8.3]
- SHELL-124: The game shell shall hold the screen list of screen flow §9 (id, kind, first focus, Back target, music, owner of content) as the single catalogue that code, music and sound key on. [screen-flow §9]
- SHELL-125: While a Steam Controller or Steam Deck trackpad is in use, it shall act as a mouse on the map through Steam Input and the game shall show the mouse pointer; otherwise it shall show the stick cursor. [screen-flow §8.3]
- SHELL-126: The game shell shall show button prompts matching the last device used (no prompts for touch, the controller's own glyphs for Xbox, PlayStation, Steam or Switch-style controllers, keys for a keyboard), switching at once when the device changes. [screen-flow §8.3]
- SHELL-127: Where a text field exists, it shall use the platform's on-screen keyboard (Steam's on the Deck and in Big Picture, the system keyboard on phones) and shall have a filled-in default so it can be confirmed without typing. [screen-flow §8.3]
- SHELL-128: With a mouse, the game shell shall work like touch with hover added, hover showing what long press shows; with a keyboard it shall use Esc for Back, Enter to select, Tab and arrows to move focus, and Enter held for 0.5 s for End turn. [screen-flow §8.4; D-SHELL-7] *Added to by SHELL-143 (playtest feedback): Space also ends the turn.*

### 5.15 Decided 17 October

- SHELL-129: When the January turn's yearly steps find that the player's realm owns or holds as subjects at least half of the world's settled land provinces, the game shell shall show the player's world domination win at once: the campaign end sequence (SHELL-097), then the final result with the outcome "World domination" and a Keep playing choice that returns to the map until the end date. [X-12; D-SHELL-1]
- SHELL-130: When the end date is reached, the game shell shall show as winners every realm that leads the Economy, Power or Technology score (ties share the win, no margin needed), and, if the player won nothing, the player's rank in each score. [X-12; D-SHELL-1]
- SHELL-131: When the player taps to start for the first time and no campaign exists, the game shell shall ask once "New to Pocket Hegemony?" with Play the tutorial (focused), Guided campaign and I know the way, before the main menu; Play the tutorial opens chapter 0, Guided campaign opens New campaign with guided first turns on, and I know the way opens New campaign with them off. [tutorial §9; D-SHELL-3, D-SHELL-13]
- SHELL-132: While the tutorial runs, the game menu shall show Skip this chapter, Chapter list and Leave the tutorial after Return to the map; while the campaign is ironman, the game menu shall not show Load; while the campaign can no longer earn achievements, the Achievements entry shall read "Achievements (off for this campaign)". [tutorial §3.9; saves §4; achievements v1.1; D-SHELL-11]
- SHELL-133: Where the setting Main hand is Left, the game shell shall mirror the corners: End turn lower left and the game menu button upper right, still at opposite corners. [settings §5; D-SHELL-18]
- SHELL-134: In the Battle action set, the game shell shall map A to pause and play while battles run and to Carry on on the result card; B to back to the map (to leave in a replay); X to Retreat (to replay the last round in a replay); Y to the commander's line; LB and RB to switch battle; and Menu to nothing (to leave in a replay). [settings §6.3; screen-flow §8.3; X-1; D-SHELL-24]
- SHELL-135: The Unlock screen shall offer one purchase, the full game, which unlocks every realm and removes the Full game ribbon; it shows the store's price and Buy, and on phones also Restore purchases. [screen-flow §6 Purchases; gap-lists List 1 item 2; D-SHELL-16]
- SHELL-136: While several of the player's battles run at once, the battle view shall show a battle switcher listing each running battle with its progress (rounds fought of rounds it lasts); picking one shows that battle and flies the map there, and Retreat and Standing orders apply to the battle shown. [X-1 (17 Oct); D-SHELL-2]
- SHELL-137: The game shell shall treat each turn as one week: End turn plays 7 days of the day loop, the turn report covers that week, and the top bar shows the date with its day ("11 November 1444"). [X-18 (17 Oct)]

### Playtest feedback (17 October 2026)
Leroy's playtest feedback (DECISIONS.md, F-1 to F-22). It is the latest decision, so it replaces the requirements it names.

- SHELL-138: When the player selects an army or commander on the map, the game shell shall not move or zoom the camera; only panning, zooming and Show on map (SHELL-062) move it. [F-6]
- SHELL-139: The country card shall have tabs, in this order: General (the summary lines of realm REALM-005), Diplomacy, Trade and Army; it opens on General. [F-12]
- SHELL-140: The game shell shall open the peace table and declare war from the Diplomacy tab of a country card, not from its General tab. [F-11]
- SHELL-141: When the AI offers peace to the player, the game shell shall show the offer in the turn report, list it in Waiting for you, and mark the country's Diplomacy tab until it is answered or put off (SHELL-092). [F-10]
- SHELL-142: The game shell shall give army banners tap targets of at least 44 points, select an army when its commander is tapped in the Army list, and let several armies be selected at once (MOVE-127). [F-21]
- SHELL-143: On a keyboard, the game shell shall end the turn when Space is pressed once on the map, exactly as a tap on End turn does (the confirmation setting and unanswered events still apply); Enter held for 0.5 s keeps working, and Space does nothing while a text field has focus. [F-27]
  How the player uses it (SHELL-138 to SHELL-143):
  - Picking commanders. The player taps a commander's banner on the map, or a commander in the Army list (the button over the map that lists the realm's commanders, any number chosen at once). Either one selects the army and the camera stays exactly where the player left it, so the march they plan stays in view; only panning, zooming and a line's map button (Show on map) move it. A banner takes a tap anywhere in a box of at least 44 points around it, and where two boxes overlap the banner nearest the finger wins. The Army list is the overview of the realm's armies: each line names the commander, his men and where he stands, one tap selects.
  - The country card. A realm on the map, its name tab or any realm button opens its country card on General. Every country card starts its tab row with General, Diplomacy, Trade and Army in that order; the player's own card adds its realm-only tabs (Government, Treasury, Learning, Officials and the rest) after these four. General holds the summary lines (REALM-176); Diplomacy holds every war and peace action, declare war, the peace terms and the peace offers from that realm; Trade holds its wealth and trade lines; Army its soldiers, recruits and commanders, and on the player's own card the war room (the Military tab of WAR-214 and REALM-205 is this Army tab).
  - A peace offer from the AI. It arrives with an alert over the map with Answer, and waits at the top of the News under Waiting for you with Make peace, Fight on and Later, and on the realm's Diplomacy tab. Later puts it off until the next turn. While it waits, a dot marks the Diplomacy tab on that realm's card and on the player's own card, and the News button counts it and blinks: the button is the overview of everything waiting for an answer.
  - Space. With a keyboard, Space on the map ends the turn, and while the week plays it pauses and resumes it; the End turn button's label names the key so it is found without hover. In a text field Space only types. Touch and controllers are unchanged.
  - Phone in landscape. The tab row is one row of 44-point tabs that scrolls sideways inside the side sheet (Wide) or the bottom sheet (Tall), the map stays live beside or above the card, and the mark is a dot beside the tab name, never colour alone. Nothing needs hover.
- SHELL-147: The game shell shall keep the turn report as a News log (was Dispatches) that never opens by itself: it opens from the News button in the top bar, keeps the past weeks' news newest first under a heading per day, and can show everything or only what concerns the player's realm; the button shows how many news items about the player's realm came since it was last opened, plus calls to arms and peace offers waiting. When a battle or a siege of the player's begins (the player's armies attack or are attacked, besiege or are besieged), and when a call to arms or a peace offer arrives, the game shell shall show a short alert over the map, under the top bar, with Go there (centres the map on the province and selects it) or Answer (opens the News); alerts go away on their own and everything they say is also in the log. *Replaces the turn report sliding in (SHELL-082).* [F-72]

  How the player uses it: the News button sits in the top bar beside the date and treasury, and a tap opens the log as the one card for news, with calls to arms and offers at the top. The button is the overview: its count and its blinking when something waits say at a glance whether anything needs the player. Alerts stack under the top bar, at most three, clear of the side tools and the End turn button; Go there, Answer and the dismiss cross are 44-point buttons. On a phone in landscape Go there leaves the province card folded so the battle or siege stays in view; in the Wide desktop layout the card opens beside the map. Nothing needs hover.
- SHELL-148: When a battle of the player's begins while the week plays, the game shell shall pause the week and alert "A battle has begun at <province>. The week waits." with Watch; the alert stays until the battle ends. Watch flies the map to the battle, plays on at a slower pace for every 4-hour step while the player watches (`WATCH_STEP_MS` 1.2 s, provisional), and shows a battle strip over the map with both realms, the men each has left against the men they started with, and the round of the rounds the battle lasts; when the battle ends the strip says how. End turn instead plays on without watching. *Changes SHELL-076 to SHELL-079: the map no longer flies to a battle by itself; the week waits for the player.* [F-73]

  How the player uses it: the alert drops in under the top bar and the End turn button shows paused, so the player sees at once that the week waits and why. One tap on Watch (44 points) goes there; the strip sits along the bottom between the overview button and End turn so the fight on the map stays in view in the Wide and Tall layouts, and its cross stops watching. The battle on the map and the strip are the overview of the fight; the News keeps the result. Nothing needs hover.
- SHELL-159: When the player goes from one screen of the panel to another (a province card and its tab, a country card and its tab, a commander, an official, a lord, a fleet, the News or the Achievements), the game shell shall keep the screen left behind on a screen history of at most 20 screens, and a Back button in the card's header shall return to the last one and take it off; a redraw of the same screen (as the week plays) adds nothing, closing the card clears the history, and the device's back gesture does the same as Back while the history holds a screen. *Replaces the "Back to <name>" button of SHELL-046.* [F-119]

  How the player uses it: Back is the arrow at the left of the card's header, beside Minimise and the cross, a 44-point button that shows only while there is somewhere to go back to, so the header itself says whether the player came from another screen. One tap returns to the screen before, on the tab it was left on; tapping again keeps stepping back. On a phone in landscape the three header buttons sit in a row at the right of the title in the Wide and Tall layouts, and the phone's back gesture steps back too. Nothing needs hover.

### Start screen (Leroy, 18 October 2026)
Leroy asked for an actual start screen: a Play button, the moving map zoomed in behind it, Settings and Load on it, and a link to the web wiki. It is the latest decision, so it replaces the title and main menu's "Tap to start" step: the title (S3) and the main menu (S4) become one start screen (screen id `title`, kept so music and sound keep keying on it). The entries of SHELL-020 to SHELL-029 keep their rules except where these say otherwise.

- SHELL-149: When boot (and the first-run questions, SHELL-012) finish, the game shell shall open the start screen with its menu already shown, and shall not wait for a Tap to start. *Replaces SHELL-017 and SHELL-019; the `title` track starts on the first touch, click, key or button anywhere on the start screen, as browsers and phones allow sound only after one.* [Leroy 18 Oct]
- SHELL-150: The start screen's background shall be the real map drawn by the campaign map renderer at region zoom (the zoom that shows provinces, towns and castles, `shell.start_zoom`), panning slowly (`shell.start_pan_speed`) along a path and turning gently at its ends; while a campaign is in progress the path runs over the player's realm in its borders and season from the latest save's summary, otherwise over the 1444 regions listed in `shell.start_regions`, one region per start. The background takes no input, runs no simulation, and is drawn behind a parchment band so the menu stays readable. *Replaces SHELL-016's world zoom.* [Leroy 18 Oct]
- SHELL-151: While Battery saver is on, the start screen's background shall keep panning at Battery saver's lower frame rate rather than stop, since the moving map is the screen's look. [Leroy 18 Oct; settings §3.1]
- SHELL-152: The start screen shall show, in one column: Play (large and wax-red, the first entry and first focus), then New campaign while a campaign is in progress, Load while any save exists, and Tutorial until the tutorial is finished. *Replaces SHELL-020, SHELL-021, SHELL-026 and SHELL-027 where they differ.* [Leroy 18 Oct]
- SHELL-153: While a campaign is in progress, Play shall read "Play" with the realm's banner, name and in-game date under it ("France · May 1503") and go to Loading with the newest save; otherwise Play shall open New campaign, after the first-launch question the first time (SHELL-131). [Leroy 18 Oct; SHELL-004]
- SHELL-154: The start screen shall show under the column one row of icon buttons with their names: Settings (opens Settings as an overlay, D-SHELL-12), Achievements, Wiki, More (Almanac, Credits, Unlock or Buy the full game, and Tutorial once it is finished) and, on desktop and Steam only, Quit. *Replaces SHELL-018's corner cog and ✕ and SHELL-024's More list where they differ.* [Leroy 18 Oct]
- SHELL-155: When the player picks Wiki, the game shell shall open the web wiki at `shell.wiki_url` in the system browser (the Steam overlay browser on Steam), leaving the game on the start screen as it was; when the device is offline the browser says so, and the game asks nothing. [Leroy 18 Oct]
- SHELL-156: The start screen shall show the version number small in the lower right corner and, in the free tier, the Full game ribbon (SHELL-029) beside the logo. [Leroy 18 Oct]
- SHELL-157: When the player presses Back on the start screen with nothing open over it, the game shell shall leave the app on Android and do nothing elsewhere. *Replaces the start-screen part of SHELL-118.* [Leroy 18 Oct]
- SHELL-158: When the player picks Exit to main menu in a campaign, the game shell shall return to the start screen, its background now panning over the realm just left. [Leroy 18 Oct; SHELL-086]

  How the player uses it: the game opens on the start screen, so one tap on Play is the whole way back into a campaign, or into New campaign with none. Everything else sits beside Play in two groups: the column holds the ways into a campaign (Play, New campaign, Load, Tutorial), and the icon row holds the things around play (Settings, Achievements, Wiki, More, Quit), so nothing is spread over other screens. The Play button is the overview: its banner, realm and date say at a glance which campaign waits, and the map panning behind it shows that realm's land. On a phone in landscape (Short wide) the logo sits top left, the column and icon row fill the left third on the parchment band inside the safe areas, and the map pans across the right two thirds; in the Tall layout (a tablet held upright) the logo and map fill the top half and the column and row are centred below; in the Large and Far layouts the column keeps a fixed width on the left. Play is at least 56 points tall, every other entry and icon button at least 44 points with 8 between, each icon button has its name under it, and nothing needs hover. A phone held upright shows "Turn your phone sideways" here too (SHELL-113).

### Auto turns (Leroy, 18 October 2026)
Leroy asked for an auto turn mode for single player that can be paused, and decided that pausing finishes the current week. Auto turns only change when End turn is pressed, never what happens in a week (X-15): the same orders give the same weeks with auto turns on or off.

- SHELL-159: In a single-player campaign the game shell shall offer Auto turns, switched by an Auto button beside End turn (and Shift+Space on a keyboard). While Auto turns are on, each week starts by itself when the one before has finished playing and its saves are written, at the Turn playback speed (SET-131). Auto turns are off whenever a campaign is started or loaded, and are not offered in a campaign with more than one player. [Leroy 18 Oct]
- SHELL-160: While Auto turns are on and a week plays, a tap on End turn or Auto (or Space) shall stop Auto turns at the end of the current week instead of pausing it: the week plays to its end, then no new week starts and the orders phase opens. End turn and Auto show "Stops at the end of this week" until then, and a second tap on Auto before the week ends keeps Auto turns on. With Auto turns off, End turn pauses and resumes the week as before (SHELL-143). [Leroy 18 Oct]
- SHELL-161: Auto turns shall stop by themselves at the end of the week in which any of these happens, and the alert over the map that says what happened is the reason: an event waits for an answer, one of the player's battles or sieges begins, a war is declared on or by the player's realm, a call to arms, a peace offer or an envoy waits for an answer, beaten rebels wait for a verdict, the scholars have nothing to study, or one of the player's armies reaches the end of its march ("Your army has reached <province>." with Go there, said only while Auto turns are on). The pauses a week already makes keep happening at once (an event, a revolution, a battle, SHELL-148). Auto turns also stop before a new week would start while End turn cannot start one (an event or a revolution waiting, or land just taken without a decision, PROV-340), and End turn then opens what blocks it. [Leroy 18 Oct]

  How the player uses it: the Auto button sits right beside End turn in the corner the player's hand is on, the only place that controls time, with a 44-point tap target, the double play mark and the word Auto. Lit, it shows Auto turns are on, and the hourglass turns on End turn as every week plays; while it stops at the end of the week it blinks and says so. The End turn corner is the overview: off, on or stopping is readable there at a glance, and an alert under the top bar says why Auto turns stopped. On a phone in landscape the two buttons stand together above the safe area in the Wide and Tall layouts and keep clear of the alerts and the battle strip; nothing needs hover, and a long press is not needed.

## 6. Commands

| Command | Who issues it | Preconditions | Result | Events emitted |
|---|---|---|---|---|
| TapToStart | player | Title showing | Main menu folds open; `title` track starts | `TitleDismissed` |
| Play | player | Start screen | Loading with the newest save, or New campaign (first-launch question the first time) | `CampaignLoadRequested` or `ScreenOpened(new_campaign)` |
| OpenWiki | player | Start screen | System browser opens `shell.wiki_url`; the game stays on the start screen | — |
| AnswerFirstRunQuestion | player | First run; question card showing | Answer stored; next question or title | `FirstRunAnswered` |
| ContinueCampaign | player | A campaign exists | Loading with the newest save | `CampaignLoadRequested` |
| StartNewCampaign | player | — | S5 step 1 | `ScreenOpened(new_campaign)` |
| ChooseRealm | player | S5 step 1 | Realm highlighted, its card shown | `RealmHighlighted` |
| QuickStart | player | S5 step 1 | S5 step 3 with last options | — |
| SetCampaignOptions | player | S5 step 2 | Options set (preset or each) | — |
| BeginCampaign | player | S5 step 3; realm not locked | Loading, then map | `CampaignStarted` |
| LoadSave | player | A save chosen in S6 | From menu: Loading. From game menu with unsaved turns: question first | `CampaignLoadRequested` |
| DeleteSave | player | Save card open | Confirmation, then save removed (saves) | `SaveDeleteRequested` |
| Back | player | Any screen | Top of stack popped per INV-SHELL-1 | `ScreenClosed` |
| SelectOnMap | player | Map, orders not frozen | Thing selected, name tab shown | `MapSelectionChanged` |
| OpenCard | player | A thing selected | Card opened on the card stack | `ScreenOpened(card)` |
| FoldAwayCard | player | Card open | Card shrinks to tab | — |
| OpenRealmBook | player | Map | Book opens on last tab | `ScreenOpened(realm_book)` |
| ShowOnMap | player | Book screen or Attention line points at a map thing | Book or Attention closes, camera moves, card opens | — |
| OpenGameMenu | player | Map | Game menu over dimmed map | `ScreenOpened(game_menu)` |
| ExitToMainMenu / Quit | player | Game menu | Question if unsaved turns (ironman: save and exit) | `CampaignLeft` |
| EndTurn | player | No unanswered event; not in progress | Turn starts (confirmation if Settings asks) | `EndTurnPressed` |
| SwitchAutoTurns | player | Single-player campaign | Auto turns on (a week starts if none plays), or stopping at the end of the playing week, or off (SHELL-159, SHELL-160) | — |
| AnswerEvent | player | Event modal open | Option chosen (events) | `EventAnswered` |
| LookAtMap | player | Event modal open | Event shrinks into the End turn badge | — |
| Retreat | player | A player battle running | That battle ends with a retreat at this step | `BattleRetreatOrdered` |
| SwitchBattle | player | Several player battles running | The view and the map move to the battle picked | — |
| ChangeStandingOrdersForBattle | player | A player battle running | Standing orders for this battle changed at this step (warfare) | `BattleOrdersChanged` |
| CarryOn | player | Result card showing | Turn resumes | `TurnResumed` |
| OpenAttention | player | Map | Attention card opens | `ScreenOpened(attention)` |
| MuteAttentionLine / UnmuteKind | player | Attention open | Line or kind muted / unmuted | `AttentionMuteChanged` |
| PlayOnAsAnotherRealm | player | Game over card | Player takes another realm; achievements end | `PlayedOnAsAnotherRealm` |
| RestoreLastSave | player | X1 showing | Load of the Resume save and its orders journal | `CampaignLoadRequested` |
| AnswerFirstLaunch | player | First Tap to start, no campaign | Tutorial chapter 0, or New campaign with or without guided first turns | `FirstLaunchAnswered` |
| KeepPlaying | player | Final result after a world domination win | Back to the map until the end date | `KeptPlaying` |
| SendReport | player | X1 showing; crash reporter approved | Report sent (privacy) | `ReportSent` |

All commands are screen commands issued by the player only; the AI issues none in this context. The game
orders that some of them carry (end turn, event answers, battle orders) are owned by the gameplay contexts and
sent as data.

## 7. Domain events

| Event | When | Payload | Consumed by (context) |
|---|---|---|---|
| `ScreenOpened` / `ScreenClosed` | A screen enters or leaves the stack | screen id, tab (realm book) | audio (screen rules 5.2, `diplomacy` mood on Abroad), onboarding |
| `TitleDismissed` | Tap to start; since SHELL-149 the first input on the start screen | — | audio (sound may start) |
| `FirstRunAnswered` | A first-run card answered | language or consent value | settings |
| `CampaignStarted` | Begin pressed | realm, options | scenario-setup, saves, time-and-turns |
| `CampaignLoadRequested` | Continue, Load, Restore the last save | save id | saves |
| `FirstLaunchAnswered` | The first-launch question answered | choice | onboarding |
| `KeptPlaying` | Keep playing after a domination win | — | saves, time-and-turns |
| `SaveDeleteRequested` | Delete confirmed | save id | saves |
| `EndTurnPressed` | End turn accepted | — | time-and-turns, saves (orders journal closed) |
| `TurnResumed` | Carry on | battle ids | time-and-turns |
| `BattleRetreatOrdered` | Retreat pressed | battle, step | warfare, time-and-turns |
| `EventAnswered` | Event option chosen | event id, option | events |
| `BattleOrdersChanged` | Orders changed while the battle runs | battle, orders | warfare |
| `AttentionMuteChanged` | Mute or unmute | item or kind | onboarding, saves (mutes live in the save, X-16) |
| `PlayedOnAsAnotherRealm` | Play on chosen | new realm | achievements, saves |
| `CampaignLeft` | Exit to main menu or Quit | — | saves |
| `AppBackgrounded` / `AppResumed` | Platform lifecycle | — | saves, audio |
| `ReportSent` | Send a report | — | crash reporter (only with consent) |

## 8. Policies (reactions to other contexts)

- When `time-and-turns`' day loop begins a battle the player's armies or fleets fight, the shell flies the map
  there and opens the battle view; time passes in 4-hour steps while it runs (SHELL-074, X-1).
- When `time-and-turns` finishes the month, the shell shows queued events (G7), then the turn report (G8).
- When `events` raises an event for the player, the shell queues it in date order and counts it on End turn.
- When any system posts a warning or waiting item, the shell adds it to the Attention list unless its kind is
  muted, and lights the bell for warnings.
- When `realm` (or warfare, diplomacy) reports that the player's realm no longer exists, the shell shows game
  over (E1).
- When `time-and-turns` reports the end date, the shell runs campaign end (E2, E3) with the score winners from
  `realm` §12 (SHELL-130). When the January turn reports that the player reached world domination, the shell
  runs campaign end at once and offers Keep playing (SHELL-129).
- When `saves` reports a save that won't read, or the engine worker crashes, the shell shows X1.
- When `saves` reports a locked nation's save, the shell opens the unlock screen (saves §6.1).
- When `settings` changes the shape (Far layout / device profile), text size or UI scale, the shell relays out
  without restart.

## 9. Each turn

The shell does no simulation. Per turn, on screen:
1. Orders phase: map live; End turn blocked while events are unanswered.
2. End turn pressed: (optional confirmation) → orders journal closed (saves; the Resume save plus the journal
   are the world before the turn) → G5 with orders frozen.
3. The month plays back as the day loop runs (X-1, X-2). When a player battle begins: battle view, 4-hour
   steps while any player battle runs (Standing orders, Retreat, switcher), result card, Carry on.
4. Events (G7) one at a time in date order.
5. Turn report (G8), if anything worth reporting.
6. Attention list and badge refreshed; next orders phase.
7. In the January turn, after the yearly steps: the world domination check (SHELL-129).

## 10. Configuration

All numbers in screen flow are placeholders "for one interface config file"; that file is
`packages/rules/data/domain/game-shell.json` (layout numbers in `map-presentation.json`), and provisional values
are listed in its `_provisional` array.

| Key | Meaning | Value in the design | Placeholder? | Config file |
|---|---|---|---|---|
| `shell.boot_min_seconds` | Minimum boot screen time | 0.6 s | yes | interface config (unnamed) |
| `shell.tip_min_seconds` | Minimum time a tip stays after it appeared | 2 s | yes | interface config |
| `shell.turn_strip_after_seconds` | When the "deliberate" strip appears | 1.5 s | yes | interface config |
| `shell.card_phone_width` | Card width, Short wide | 45 % of screen | yes | interface config |
| `shell.card_tall_height` | Bottom sheet height, Tall | 55 % | yes | interface config |
| `shell.card_large_width` | Side sheet width, Large | 380 px at UI scale 1 | yes | interface config |
| `shell.short_wide_max_height` | Short wide threshold | height under 500 css px | yes | interface config |
| `shell.large_reference` | Steam Deck window | 1280 × 800 | no (device) | — |
| `shell.far_body_text` | Far layout body text | about 1/30 of screen height | yes | interface config |
| `shell.far_overscan` | Far layout clear band | outer 5 % | yes | interface config |
| `shell.top_bar_max_plaques_phone` | Plaques on a phone's top bar | 5 | yes | interface config |
| `shell.realm_book_max_tabs` | Tabs in the Realm book | 6 | no (rule) | interface config |
| `shell.max_steps_from_map` | Steps from the map | 3 | no (rule) | — |
| `shell.tap_target_min` | Tap target | 44 × 44 points | yes | interface config |
| `shell.tap_target_gap` | Gap between targets | 8 points | yes | interface config |
| `shell.controller_end_turn_hold` | End turn hold on a controller (Menu) and keyboard (Enter) | 0.5 s | yes | game-shell.json `controllerEndTurnHoldSeconds` |
| `shell.end_date_earliest_year` | Earliest end date a campaign may choose (31 August of that year) | 1494 | yes (provisional) | game-shell.json `endDateEarliestYear` |
| `shell.domination_share` | Share of the world's settled land provinces for world domination | 0.5 | no (X-12) | game-shell.json `dominationShare` |
| `shell.ledger_leaders` | Realms beside the player on the final result | 5 | yes (provisional) | game-shell.json `ledgerLeaders` |
| `shell.start_zoom` | Zoom of the start screen's background | region zoom | yes (provisional) | game-shell.json `startZoom` |
| `shell.start_pan_speed` | How fast the start screen's background pans | 6 map pixels a second | yes (provisional) | game-shell.json `startPanSpeed` |
| `shell.start_regions` | 1444 regions the background pans over when no campaign is in progress | Bosporus, Venice and the Adriatic, the Low Countries, the Nile delta, the Kinai, the Ganges delta | yes (provisional) | game-shell.json `startRegions` |
| `shell.wiki_url` | Address of the web wiki | `https://github.com/grrts/pocket-hedgemony/wiki` (placeholder until the wiki in `docs/wiki/` is published on the web) | yes (release task) | game-shell.json `wikiUrl` |
| `shell.campaign_end_date_default` | Default end date | 31 August 1939 | no (decided) | campaign rules |
| `attention.*` | Warnings and thresholds | one table; first lines from warfare 14 | yes | one config table (unnamed) |
| `tips.*` | Loading tips with era, region, new-player tags | written by the tutorial thread | — | tips table |

## 11. Seams

| Other context | Direction | Pattern | What crosses |
|---|---|---|---|
| saves | upstream | Customer–Supplier | Newest save and its header summary (Continue label, title background), Load list (flat, newest first), the Resume save and orders journal (closed at End turn, written on backgrounding), ironman flag, Needs attention mutes and tutorial progress in the save (X-16), locked-nation check, damaged-save failures |
| settings | upstream | Customer–Supplier | Confirm End turn, turn report opening, shape/profile and Far layout, UI scale and text size, button prompts, hold actions; Settings overlay opens from the shell |
| time-and-turns | upstream | Customer–Supplier | The day loop, with 4-hour steps while a player battle runs (X-1, X-2); a request: a way to play one 4-hour step at a time so the shell can wait for the player between steps, end of month, the January turn (domination check), end date reached |
| warfare | upstream | Customer–Supplier | Battle view content (progress, standing orders, Retreat; no skip, X-1), result card, siege view, peace table, notifications for the turn report and Attention |
| events | upstream | Conformist | Events with two or three options, queued in date order; wrap-up events at campaign end |
| map-presentation | upstream | Customer–Supplier | Map rendering, zoom levels, lenses, title background, camera moves (Show on map) |
| onboarding | partnership | Partnership | Tips table, the Almanac, the tutorial's chapter list and its three game menu lines, the first-launch question (SHELL-131), the lines on the Needs attention screen (warnings, opportunities and New entries) |
| achievements | downstream | Customer–Supplier | Play on as another realm ends achievements; final result shows earned achievements; Achievements screen placement |
| audio | downstream | Published Language | Screen ids (screen list) and Realm book tab for music screen rules and moods; suspend and resume sound |
| scenario-setup | upstream | Customer–Supplier | Realms, suggested realms, filters, strengths at a glance, start date, campaign options and presets |
| realm | upstream | Conformist | Country card, top bar values (gold, levies), realm no longer exists, realm highs, the Economy, Power and Technology scores and world domination share (realm §12, X-12) |
| province | upstream | Conformist | Province card, Tax screen, gain-and-lose lists |
| recruiting | upstream | Conformist | Levy and commission screens in the Army tab and from province cards |
| diplomacy | upstream | Conformist | Abroad tab contents, peace offers waiting |
| research | upstream | Conformist | Learning tab, empty research or school slots for Attention |

Changes screen flow asks of other files (§11), and whether they were taken in:
- Music 5.1 / 5.2 use the screen ids, add `loading` and `realm_book` (Abroad) — adopted (music README §4.1, §5.2).
- Warfare 7.15 and screen flow G6: settled by the new X-1 (17 Oct, D-SHELL-2): no before-the-battle card and no skip; the battle runs in 4-hour steps in the battle view.
- Turn order (gap list 1 item 20): settled by X-1 and X-2: the day loop slows to 4-hour steps while a player battle runs and goes back to whole days after (D-SHELL-23).
- Warfare 14 and province stats 14 notifications feed G8 and G9 — adopted: each owning context marks which notices go in the turn report (D-SHELL-22).
- Tutorial: no advisor after the tutorial; Attention screen takes its place — adopted, titled "Needs attention", with screen flow's two groups and Show button (D-SHELL-15).
- Achievements: play on after game over ends achievements — adopted (achievements v1.1).
- Recruiting 2.1, country stats 3.3, province stats 8: Levy, Food policy and Tax screens live in the Realm book and are reachable from cards — not checked here; recorded for those contexts.
- Today's build: keep phone landscape lock; let tablets rotate (the `~ipad` key in `apps/mobile/scripts/landscape.mjs` is to be removed, a request to the game build, D-SHELL-19); boot-time realm chooser becomes S5 step 1; phone province card becomes a side sheet; Realm book and game menu buttons join the HUD.

Changes other designs ask of screen flow:
- Saves §9: Continue on the title (adopted), Save and Load in the pause menu (adopted; Load hidden in ironman, D-SHELL-11), the Load screen grouped by campaign (not adopted, D-SHELL-4), the ironman choice on new game (adopted), "Send a report" in the pause menu (not adopted: only on X1, D-SHELL-11).
- Settings §8: Settings overlay from the More menu, the cog and the game menu (adopted; overlay from the title too, D-SHELL-12); Big screen uses Far layout (adopted); Campaign rules in the pause menu (not adopted: read-only inside Settings, D-SHELL-11).
- Tutorial §12: first-launch question (adopted, SHELL-131), tutorial lines in the pause menu (adopted, SHELL-132), Tutorial entry with chapter list (adopted, SHELL-023).
- Achievements: the pause menu shows whether the campaign can earn achievements (adopted on the Achievements entry, SHELL-132); the new game screen shows it beside the ironman option (D-SHELL-11).

## 12. AI

None. Computer players never use the shell. The only rule touching them: battles between other realms never
stop the turn (SHELL-077).

## 13. Decisions and open questions

Decided on 17 October 2026 under `domain/DECISIONS.md`. No question stays open.

- **D-SHELL-1** (was OQ-SHELL-1) Victory conditions: X-12 applies. World domination is owning or holding as subjects at least half (`dominationShare` 0.5) of the world's settled land provinces, checked in every January turn; when the player reaches it, the campaign end sequence runs at once and the final result offers Keep playing to the end date (SHELL-129). On the end date the realms leading the Economy, Power or Technology score win in that score, ties share, no margin (SHELL-130). With no win, E3's outcome gives the player's rank in each score. The score formulas belong to realm §12. X-12 decides it and drops the "lead by 50 % for 25 years" placeholder.
- **D-SHELL-2** (was OQ-SHELL-2) Battles in the turn: X-1 (Leroy, 17 Oct) applies. When a player battle begins, the battle view opens on it and time passes in 4-hour steps (6 a day) while any player battle runs; the player watches, can change its standing orders or press Retreat at any step, and switches between running battles with the battle switcher, which shows each one's progress; the result cannot be skipped. When every player battle has ended, a result card with Carry on returns the loop to whole days. AI-only battles never slow the game. X-1 is the latest decision.
- **D-SHELL-3** (was OQ-SHELL-3) Main menu first focus and first-launch question: focus starts on Continue when a campaign exists, otherwise on New campaign. The tutorial's first-launch question "New to Pocket Hegemony?" is asked once, after the first Tap to start when no campaign exists, before the main menu (SHELL-131); the Tutorial entry opens the chapter list. The first-launch question already routes new players, so the simpler focus rule is enough.
- **D-SHELL-4** (was OQ-SHELL-4) Load screen shape: one flat list, newest first, each save with banner, realm, in-game date, real date saved and an autosave or ironman mark; no grouping by campaign and no device mark. One list is the simpler screen and keeps every save one tap away.
- **D-SHELL-5** (was OQ-SHELL-5) Which save the shell relies on: screen flow's "pre-turn save" is the saves design's Resume save plus the orders journal; End turn closes the journal with the turn's orders, backgrounding writes the journal only if an order or answer was given since the last save, and X1's button is "Restore the last save" (the Resume save and its journal). The saves design already provides these, so no new save kind is added.
- **D-SHELL-6** (was OQ-SHELL-6) Unanswered events and the End turn question: screen flow's decision of 16 October stands. Unanswered events block End turn and the button opens the first one, so they can never be passed with "End turn anyway"; the question counts warnings only. It is the later decision and the one that never lets an event be answered for the player.
- **D-SHELL-7** (was OQ-SHELL-7) End turn hold: on a controller, holding Menu (Options) for 0.5 s ends the turn and a short press opens the game menu; on a keyboard, Enter held for 0.5 s ends the turn and a short Enter selects. The controller's "next" button is d-pad right: it opens the Needs attention screen and then steps to the next line. One hold time for every device is simpler, and it matches the tutorial's action table.
- **D-SHELL-8** (was OQ-SHELL-8) Controller action sets: three sets, Map, Battle and Menu (every other screen), plus the Text layer, as settings declares. Screen flow's Shell, Card, Book and Modal sets all need the same moves (focus, select, back, bumpers, Show on map), so one Menu set covers them.
- **D-SHELL-9** (was OQ-SHELL-9) March order by touch: tap an army, then a province, with no confirm step. A march order is undone by tapping the army's own province, so a confirm step only adds a tap.
- **D-SHELL-10** (was OQ-SHELL-10) Long press: long press only explains. Where an explanation holds buttons (an Attention line's mutes, a settings row's reset), those buttons are also on the item itself, reachable by tap. This keeps screen flow's rule that no action exists only as a long press.
- **D-SHELL-11** (was OQ-SHELL-11) Game menu entries: the eight entries stay. During the tutorial, Skip this chapter, Chapter list and Leave the tutorial follow Return to the map. In ironman, Load is not shown. The Achievements entry reads "Achievements (off for this campaign)" once the campaign cannot earn them. Campaign rules are shown read-only inside Settings, and Send a report stays on X1 only. The fewest new entries answer every request.
- **D-SHELL-12** (was OQ-SHELL-12) Settings from the title: Settings is an Overlay everywhere, the title included. Settings §8 itself says overlay, and one kind of screen is simpler.
- **D-SHELL-13** (was OQ-SHELL-13) First-run questions: two cards, language and consent. The Big screen readability question is dropped, because the Far layout already sets the UI scale and text size is a setting. The first-launch question of onboarding is not a first-run card; it comes after the title (SHELL-131). Fewer questions before play.
- **D-SHELL-14** (was OQ-SHELL-14) Campaign options: the option is called "AI aggression". The end date is 31 August of any year from 1494 to 1939 (`endDateEarliestYear` 1494, provisional), default 31 August 1939. The music era follows the calendar only (D-AUD-4), so it is not a campaign option. Two designs use "AI aggression", and nothing may be played after 1939 (X-14).
- **D-SHELL-15** (was OQ-SHELL-15) Attention and "Needs attention": one screen, id `attention`, titled "Needs attention" on screen. It keeps screen flow's two groups (Warnings, then Waiting for you) and its Show button; onboarding's opportunity and New lines go under Waiting for you. Lines are muted per item ("Mute this") or per kind ("Don't list this kind again") and can be unmuted, and the mutes are kept in the save (X-16). The encyclopedia is called the Almanac everywhere (screen id `almanac`). X-16 already uses the tutorial's names.
- **D-SHELL-16** (was OQ-SHELL-16) Free tier and store screens: no edition shows ads. The free mobile tier and the Steam demo have the same one limit: only the Ottomans and France can be played. The Unlock screen offers one purchase, the full game, which unlocks every realm; it shows the store's price, Buy and, on phones, Restore purchases (SHELL-135). No ads is the simpler rule, and it removes the ad's consent.
- **D-SHELL-17** (was OQ-SHELL-17) Game over causes: the realm no longer exists only when it is annexed or loses every province; there is no successor rule. No design defines one, and adding it would be a new mechanic.
- **D-SHELL-18** (was OQ-SHELL-18) Left-handed layout: Main hand Left mirrors both corners, End turn lower left and the game menu button upper right, so they stay at opposite corners (SHELL-133). One mirror keeps screen flow's rule.
- **D-SHELL-19** (was OQ-SHELL-19) Tablet rotation: tablets rotate and use the Tall layout when upright; the `~ipad` key in `apps/mobile/scripts/landscape.mjs` is to be removed (a request to the game build). Screen flow decided on 16 October that only phones are landscape-only.
- **D-SHELL-20** (was OQ-SHELL-20) Shape and device profile: the shape follows the window only (Short wide below 500 css px of height), and the device profile only chooses setting defaults, so they need not agree. A phone is landscape-only, so its window is never Tall. It keeps screen flow's principle that layout follows the window, not the device.
- **D-SHELL-21** (was OQ-SHELL-21) Final result outside ironman: E3 shows "Achievements are earned only in ironman campaigns" where the list would be. Achievements are ironman-only (achievements v1.1), so one line saves an empty list.
- **D-SHELL-22** (was OQ-SHELL-22) Missing owner designs: the turn report lists this turn's notices that their owning contexts mark for the player (warfare §14, province §14 and the others), one line each, jumping to its place. The ledger comparison shows the Economy, Power and Technology scores of the player and the five leading realms (`ledgerLeaders` 5, provisional). New game details belong to scenario-setup, and the button bindings to settings' default layouts plus D-SHELL-7, D-SHELL-8 and D-SHELL-24. The credits are one scrolling list read from data. The consent card asks only for crash reports and the tutorial's step counts, both off by default. Each piece reuses something that already exists.
- **D-SHELL-23** (was OQ-SHELL-23) The month on screen: X-1 and X-2 apply. The month runs as time-and-turns' day loop, slows to 4-hour steps while a player battle runs and goes back to whole days on Carry on; after a kill, the Resume save and the orders journal replay the month to the same battle with the same result. Today's one-call `endTurn` is replaced by the day loop. Under X-18 a turn is one week: End turn plays 7 days and the date shows its day (SHELL-137).
- **D-SHELL-24** (was OQ-SHELL-24) Battle view controls: A is pause and play while battles run and Carry on on the result card; B goes back to the map (leave in a replay); X is Retreat (replay the last round in a replay); Y shows the commander's line; LB and RB switch battle; Menu does nothing (leave in a replay) (SHELL-134). This follows X-1: no skip, Retreat and switching at any step.

## 14. Traceability

| Requirement | Feature file | Scenario |
|---|---|---|
| SHELL-001 | map-and-cards.feature | Everything closes back onto the map |
| SHELL-002 | navigation-by-input.feature | Back on each device pops the top of the stack |
| SHELL-003 | map-and-cards.feature | Nothing is more than three steps from the map |
| SHELL-004 | title-and-main-menu.feature | Continue is two taps from a cold start |
| SHELL-005 | boot-and-first-run.feature | First-run questions appear once, before the title |
| SHELL-005 | game-menu.feature | Leaving asks only when turns would be lost |
| SHELL-005 | load-and-loading.feature | Load from the game menu asks only with unsaved turns |
| SHELL-006 | layout-by-shape.feature | Shape follows the window |
| SHELL-007 | navigation-by-input.feature | Touch on cards, the book and menus |
| SHELL-007 | navigation-by-input.feature | Long press only explains |
| SHELL-008 | boot-and-first-run.feature | Boot shows the logo while the game loads |
| SHELL-009 | boot-and-first-run.feature | Native launch screen matches the boot logo |
| SHELL-010 | boot-and-first-run.feature | Boot never flashes |
| SHELL-011 | boot-and-first-run.feature | Loading failure shows the failure screen |
| SHELL-011 | interruptions.feature | Something went wrong |
| SHELL-012 | boot-and-first-run.feature | First-run questions appear once, before the title |
| SHELL-013 | boot-and-first-run.feature | The language card appears only when needed |
| SHELL-014 | boot-and-first-run.feature | The consent card appears only where something needs consent |
| SHELL-015 | boot-and-first-run.feature | No sign-in before play |
| SHELL-016 | title-and-main-menu.feature | Title background drifts over the world map |
| SHELL-017 | title-and-main-menu.feature | Any input counts as Tap to start |
| SHELL-018 | title-and-main-menu.feature | Title corner controls |
| SHELL-019 | title-and-main-menu.feature | The menu is the same screen as the title |
| SHELL-020 | title-and-main-menu.feature | Continue is two taps from a cold start |
| SHELL-020 | title-and-main-menu.feature | Main menu entries |
| SHELL-021 | title-and-main-menu.feature | Main menu entries |
| SHELL-022 | title-and-main-menu.feature | Main menu entries |
| SHELL-023 | title-and-main-menu.feature | Main menu entries |
| SHELL-023 | title-and-main-menu.feature | More holds the secondary screens |
| SHELL-024 | title-and-main-menu.feature | Main menu entries |
| SHELL-024 | title-and-main-menu.feature | More holds the secondary screens |
| SHELL-025 | title-and-main-menu.feature | Main menu entries |
| SHELL-026 | title-and-main-menu.feature | First focus on the main menu |
| SHELL-027 | title-and-main-menu.feature | First entry stands out |
| SHELL-028 | title-and-main-menu.feature | No ads in any edition |
| SHELL-028 | title-and-main-menu.feature | Never an ad in the Steam demo |
| SHELL-029 | title-and-main-menu.feature | Full game ribbon in the free tier |
| SHELL-030 | new-campaign.feature | Three steps with a step strip |
| SHELL-031 | new-campaign.feature | Choosing a realm on the map |
| SHELL-032 | new-campaign.feature | A locked realm leads to Unlock and back |
| SHELL-033 | new-campaign.feature | Options step |
| SHELL-034 | new-campaign.feature | Begin step |
| SHELL-035 | new-campaign.feature | Quick start |
| SHELL-036 | new-campaign.feature | Back from step 1 leaves without asking |
| SHELL-037 | new-campaign.feature | Nation select music |
| SHELL-038 | load-and-loading.feature | Load lists saves newest first |
| SHELL-039 | load-and-loading.feature | Load from the main menu needs no confirmation |
| SHELL-040 | load-and-loading.feature | Load from the game menu asks only with unsaved turns |
| SHELL-041 | load-and-loading.feature | Tips fit the realm and date |
| SHELL-042 | load-and-loading.feature | The bar shows real steps |
| SHELL-043 | load-and-loading.feature | Loading goes straight to the map, but lets a tip be read |
| SHELL-044 | load-and-loading.feature | Loading music |
| SHELL-045 | map-and-cards.feature | How each layer closes |
| SHELL-046 | map-and-cards.feature | Cards stack and empty map clears them |
| SHELL-047 | map-and-cards.feature | Top bar |
| SHELL-047 | map-and-cards.feature | A phone's top bar holds at most five plaques |
| SHELL-048 | map-and-cards.feature | Tool column |
| SHELL-049 | map-and-cards.feature | End turn badge opens Attention |
| SHELL-050 | map-and-cards.feature | The bell lights only for warnings |
| SHELL-051 | map-and-cards.feature | Game menu button |
| SHELL-052 | map-and-cards.feature | The local zoom tile row is still the map |
| SHELL-053 | map-and-cards.feature | Card on a phone in landscape |
| SHELL-054 | map-and-cards.feature | Card in a tall window |
| SHELL-055 | map-and-cards.feature | Card in a large window |
| SHELL-056 | map-and-cards.feature | A tap selects, a second tap opens |
| SHELL-057 | map-and-cards.feature | Minimise and reopen |
| SHELL-058 | map-and-cards.feature | Gain and lose lists fold out inside the card |
| SHELL-059 | realm-book.feature | Tabs and what they hold |
| SHELL-059 | realm-book.feature | The book opens on the last tab used |
| SHELL-060 | realm-book.feature | Never a seventh tab |
| SHELL-061 | realm-book.feature | Tabs by window shape |
| SHELL-062 | realm-book.feature | Show on map and back to the same place |
| SHELL-063 | realm-book.feature | A book screen opened from a card returns to the card |
| SHELL-064 | game-menu.feature | Ways to open the game menu |
| SHELL-065 | game-menu.feature | Game menu entries by platform |
| SHELL-066 | game-menu.feature | Ironman save entry |
| SHELL-067 | game-menu.feature | Settings returns to the game menu |
| SHELL-068 | game-menu.feature | Leaving asks only when turns would be lost |
| SHELL-069 | turn-flow.feature | End turn is one tap unless Settings asks |
| SHELL-070 | turn-flow.feature | Unanswered events block End turn |
| SHELL-071 | turn-flow.feature | Turn in progress keeps the map live but frozen |
| SHELL-072 | turn-flow.feature | A strip for long turns |
| SHELL-073 | turn-flow.feature | The world before the turn is kept before the turn runs |
| SHELL-074 | turn-flow.feature | Time slows to 4-hour steps for a player battle |
| SHELL-074 | turn-flow.feature | A fleet's battle slows time too |
| SHELL-075 | turn-flow.feature | The player watches the battle to its end |
| SHELL-075 | turn-flow.feature | Standing orders change at any step |
| SHELL-075 | turn-flow.feature | Retreat at any step |
| SHELL-076 | turn-flow.feature | Carry on to the next battle in month order |
| SHELL-077 | turn-flow.feature | Other realms' battles never stop the turn |
| SHELL-136 | turn-flow.feature | Several battles at once, with a switcher |
| SHELL-137 | turn-flow.feature | A turn is one week |
| SHELL-078 | turn-flow.feature | Every battle can be watched again |
| SHELL-079 | turn-flow.feature | Interrupted at a battle |
| SHELL-080 | turn-flow.feature | Events one at a time in date order |
| SHELL-081 | turn-flow.feature | Look at the map before answering |
| SHELL-082 | turn-flow.feature | Turn report |
| SHELL-082 | turn-flow.feature | The turn report closes on the first map tap |
| SHELL-083 | attention.feature | Ways to open Attention |
| SHELL-083 | attention.feature | The screen is titled Needs attention |
| SHELL-084 | attention.feature | Lines fall into two groups |
| SHELL-084 | attention.feature | Warnings come first, most urgent first |
| SHELL-085 | attention.feature | Lines fall into two groups |
| SHELL-086 | attention.feature | Show jumps and Back returns |
| SHELL-087 | attention.feature | Muting lines |
| SHELL-087 | attention.feature | Unmuting a kind |
| SHELL-087 | attention.feature | A long press on a line shows the same buttons |
| SHELL-088 | attention.feature | The End turn question names the warnings but never blocks |
| SHELL-089 | attention.feature | Attention says what is wrong, not what to do |
| SHELL-090 | in-campaign-screens.feature | Back in the battle viewer |
| SHELL-091 | in-campaign-screens.feature | Siege view |
| SHELL-092 | in-campaign-screens.feature | Peace table |
| SHELL-092 | in-campaign-screens.feature | Incoming peace offers must be answered or put off |
| SHELL-093 | in-campaign-screens.feature | Map mode picker and confirmations |
| SHELL-094 | campaign-end.feature | Game over when the realm no longer exists |
| SHELL-094 | campaign-end.feature | The game over line names what happened |
| SHELL-095 | campaign-end.feature | Choices after game over |
| SHELL-096 | campaign-end.feature | Playing on ends achievements, ironman included |
| SHELL-097 | campaign-end.feature | Reaching the end date |
| SHELL-098 | campaign-end.feature | World domination wins at once |
| SHELL-098 | campaign-end.feature | Score winners at the end date |
| SHELL-099 | campaign-end.feature | Final result |
| SHELL-099 | campaign-end.feature | Final result outside ironman |
| SHELL-100 | campaign-end.feature | Reaching the end date |
| SHELL-100 | campaign-end.feature | The end date is the one chosen at the start |
| SHELL-101 | interruptions.feature | Going to the background |
| SHELL-101 | interruptions.feature | Nothing changed, nothing saved |
| SHELL-102 | interruptions.feature | Coming back while in memory |
| SHELL-103 | interruptions.feature | Closed by the system in the background |
| SHELL-104 | interruptions.feature | A turn running when the app leaves |
| SHELL-105 | interruptions.feature | The unlock flow returns where it was opened |
| SHELL-105 | new-campaign.feature | A locked realm leads to Unlock and back |
| SHELL-106 | interruptions.feature | Unlock offline |
| SHELL-107 | interruptions.feature | Something went wrong |
| SHELL-108 | layout-by-shape.feature | Shape follows the window |
| SHELL-108 | layout-by-shape.feature | Short wide layout |
| SHELL-109 | layout-by-shape.feature | Shape follows the window |
| SHELL-109 | layout-by-shape.feature | Tall layout |
| SHELL-110 | layout-by-shape.feature | Shape follows the window |
| SHELL-110 | layout-by-shape.feature | Large layout |
| SHELL-111 | layout-by-shape.feature | Shape follows the window |
| SHELL-111 | layout-by-shape.feature | Far layout for TVs |
| SHELL-112 | layout-by-shape.feature | Safe areas stay clear |
| SHELL-113 | layout-by-shape.feature | Phones play in landscape only |
| SHELL-114 | layout-by-shape.feature | Tap targets |
| SHELL-115 | layout-by-shape.feature | Buttons that lose something are kept safe |
| SHELL-116 | layout-by-shape.feature | End turn and game menu at opposite corners |
| SHELL-117 | navigation-by-input.feature | Back on each device pops the top of the stack |
| SHELL-117 | navigation-by-input.feature | iOS edge swipe only on full screens |
| SHELL-118 | navigation-by-input.feature | Back at the ends of the stack |
| SHELL-118 | title-and-main-menu.feature | The menu is the same screen as the title |
| SHELL-119 | navigation-by-input.feature | Touch on the map |
| SHELL-119 | navigation-by-input.feature | A march order by touch needs no confirm |
| SHELL-120 | navigation-by-input.feature | Touch on cards, the book and menus |
| SHELL-120 | navigation-by-input.feature | Long press only explains |
| SHELL-121 | navigation-by-input.feature | Three controller action sets |
| SHELL-121 | navigation-by-input.feature | The Menu set |
| SHELL-121 | navigation-by-input.feature | The Text layer |
| SHELL-122 | navigation-by-input.feature | The map with a controller |
| SHELL-122 | navigation-by-input.feature | End turn on a keyboard |
| SHELL-123 | navigation-by-input.feature | Focus is always visible |
| SHELL-123 | screen-list.feature | The screen catalogue |
| SHELL-124 | screen-list.feature | The screen catalogue |
| SHELL-125 | navigation-by-input.feature | Trackpads act as a mouse |
| SHELL-126 | navigation-by-input.feature | Button prompts follow the last device |
| SHELL-126 | navigation-by-input.feature | Switching device switches prompts at once |
| SHELL-127 | navigation-by-input.feature | Text entry without a keyboard |
| SHELL-128 | navigation-by-input.feature | Mouse and keyboard |
| SHELL-129 | campaign-end.feature | World domination wins at once |
| SHELL-129 | campaign-end.feature | Keep playing after world domination |
| SHELL-130 | campaign-end.feature | Score winners at the end date |
| SHELL-130 | campaign-end.feature | No win shows the player's rank |
| SHELL-131 | title-and-main-menu.feature | The first-launch question |
| SHELL-132 | game-menu.feature | Tutorial lines in the game menu |
| SHELL-132 | game-menu.feature | No Load in ironman |
| SHELL-132 | game-menu.feature | Achievements entry when they are off |
| SHELL-133 | layout-by-shape.feature | Left hand mirrors the corners |
| SHELL-134 | navigation-by-input.feature | The battle viewer with a controller |
| SHELL-135 | interruptions.feature | The Unlock screen |
| SHELL-138 | map-and-cards.feature | Selecting an army keeps the camera still |
| SHELL-139, 140 | map-and-cards.feature | The country card's tabs |
| SHELL-141 | in-campaign-screens.feature | An AI peace offer waits for an answer |
| SHELL-142 | map-and-cards.feature | Picking commanders is easy |
| SHELL-143 | navigation-by-input.feature | Space ends the turn |
| SHELL-147 | in-campaign-screens.feature | The News log keeps past weeks; A battle or siege begins |
| SHELL-148 | in-campaign-screens.feature | The week waits at a battle |
| SHELL-159 | auto-turns.feature | Auto turns play week after week; Auto turns are off after loading |
| SHELL-160 | auto-turns.feature | Pausing finishes the current week; Tapping Auto again keeps it on; End turn pauses as before with Auto turns off |
| SHELL-161 | auto-turns.feature | Auto turns stop by themselves; A blocked End turn stops Auto turns |
| SHELL-149 | start-screen.feature | The start screen opens with its menu shown |
| SHELL-150 | start-screen.feature | The map pans behind the start screen at region zoom |
| SHELL-151 | start-screen.feature | Battery saver keeps the map moving |
| SHELL-152 | start-screen.feature | The column of ways into a campaign |
| SHELL-153 | start-screen.feature | Play continues the campaign in progress; Play with no campaign opens New campaign |
| SHELL-154 | start-screen.feature | The icon row |
| SHELL-155 | start-screen.feature | The Wiki opens in the browser |
| SHELL-156 | start-screen.feature | Version and Full game ribbon |
| SHELL-157 | start-screen.feature | Back on the start screen |
| SHELL-158 | start-screen.feature | Exit to main menu returns to the start screen |
| SHELL-159 | map-and-cards.feature | Back returns to the screen before |
| SHELL-144–146 | layout-by-shape.feature | Each subject has one home; Important things have an overview; Every screen fits a phone in landscape |
