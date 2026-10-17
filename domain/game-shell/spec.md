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
  other in-campaign screens (battle viewer, siege view, peace table, map lens picker, confirmation).
- How a campaign ends: game over (E1), campaign end (E2), final result (E3), and the victory conditions as far
  as they reach the screen flow.
- Interruptions: leaving and coming back (R1), purchases, the failure screen (X1).
- Layout by window shape (only the navigation rules), touch sizes, phones in landscape only.
- Navigation by input: Back on each device, touch gestures, controller action sets and focus, keyboard and mouse.
- The free tier on screen: the one start-screen ad's placement, the Full game ribbon, padlocks and the return
  from the unlock flow.
- The screen list with ids (section 9 of screen flow) that music, sound and code key on.

Not in scope (owned by …):
- Save slots, autosave, ironman, cloud saves, what the Load list holds → `saves`.
- Every setting and its values, the Settings screen itself → `settings`.
- Map rendering, zoom levels and what each zoom shows, map lenses → `map-presentation`.
- The achievement list and the achievement screen's content → `achievements`.
- Tutorial campaign, tips text, encyclopedia, first-time hints → `onboarding`.
- Interface and world sounds, music tracks → `audio`.
- Nation picker contents and game options in detail (gap list 2, item 2) → `scenario-setup` (no design yet).
- Unlock and purchase screens (gap list 2, item 5): no design yet.
- What the turn report says (gap list 2, item 7): no design yet.
- Ledger and final result content (gap list 2, item 8): no design yet.
- Full button map for every device (gap list 2, item 9): no design yet; `settings` holds the default layouts.
- Battle rules, the before-the-battle choices and the battle viewer's content → `warfare`.
- Events and their options → `events`. Peace terms → `warfare` / `diplomacy`.
- The order of the systems in a month and the ability to pause it at a battle → `time-and-turns`.

## 2. Sources

Newest decision first.

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
| Fold away | Shrinking a card back to its name tab | Closing a card |
| Fold-out | A gain-and-lose list opened inside a card | A new screen |
| Realm book (G3) | One full screen with up to six tabs for realm-wide screens | A card |
| Modal | A screen that needs an answer before anything else (event, peace offer, confirmation, game menu) | A card |
| Decide later | What Back means on a modal where putting off the answer is allowed | Answering |
| Game menu (G4) | The in-campaign menu (not a pause screen; the game is turn-based) | Main menu (S4); "pause menu" in other designs means this |
| End turn | The hourglass button that ends the player's month | Turn report |
| Badge | The count on End turn: items on the Attention screen; with unanswered events, the event count on the scroll icon | Attention bell |
| Attention screen (G9) | The one list of warnings and items waiting for the player; says what is wrong, never what to do | Turn report; an advisor (none exists); "Needs attention" in the tutorial design |
| Attention bell | The bell next to the date that lights when the Attention screen holds a warning | Badge |
| Warning | An Attention line saying something bad is coming or happening | A waiting item |
| Waiting item | An Attention line for something that needs the player (unanswered event, peace offer, idle army …) | A warning |
| Mute | Silencing one Attention line, or every line of its kind | Deleting it |
| Turn in progress (G5) | The map while the month is worked out, orders frozen | Loading |
| Before-the-battle card | The first card of the battle viewer when the turn stops for a player battle | Result card |
| Result card | The battle viewer's last card: who won, men lost, the one-line reason, Carry on | Turn report |
| Carry on | Resume the stopped turn | Skip to result |
| Turn report (G8) | Short list of what happened this turn | Attention screen |
| Unsaved turns | Turns played since the last save the player made | — |
| Game over (E1) | The player's realm no longer exists | Campaign end |
| Campaign end (E2) | The end date is reached or a victory condition fires | Game over |
| Final result (E3) | Ledger comparison, final outcome and achievements of this campaign | Game over card |
| Play on | After game over, continuing as another realm on the current map | Playing past the end date (not allowed) |
| Shape | The window class used for layout: Short wide, Tall, Large, Far | A device profile (settings) |
| Action set | A controller mapping per layer, in Steam Input terms | A key binding |
| First focus | The element focused when a screen opens, for controller and keyboard | — |
| Tip | One line from the tips table shown on the loading screen | A tooltip |
| Free tier | The free mobile download and the Steam demo, with a limited choice of countries | The full game |
| Full game ribbon | The small ribbon on the main menu in the free tier that leads to Unlock | The ad card |

## 4. Domain model

### Aggregates

**ScreenStack** (one per running app)
- Identity: the app session.
- Holds: the ordered list of open screens (`id`, kind, first focus, scroll and camera position per screen);
  the current shape; the last input device; whether a campaign is loaded.
- INV-SHELL-1: Back always removes exactly the top screen, except where the screen list says otherwise
  (map → opens game menu; main menu → Tap to start; title on Android → leaves the app; battle in a turn → Skip
  to result; modals that do not allow "decide later").
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
- Holds: phase (orders, in progress, stopped at battle, events, report), unanswered events in date order,
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

### 5.2 Boot and first run

- SHELL-008: When the game starts cold, the game shell shall show the boot screen (the pixel logo on parchment with the hourglass turning) while the map, sprites and engine worker load, with no studio logos and no video. [screen-flow §3 S1]
- SHELL-009: Where the game runs on iOS or Android, the native launch screen shall show the same logo as the boot screen. [screen-flow §3 S1]
- SHELL-010: If loading finishes in under 0.6 s, then the game shell shall still hold the boot screen for 0.6 s; otherwise it shall stay only as long as loading takes. [screen-flow §3 S1; placeholder]
- SHELL-011: If loading fails (a missing file, or the worker won't start and the main-thread fallback also fails), then the game shell shall show the failure screen X1. [screen-flow §3 S1]
- SHELL-012: When the game runs for the first time, the game shell shall show the first-run questions before the title, each as one card with one choice, and shall not show them again. [screen-flow §3 S2]
- SHELL-013: If the device language is not one the game has, then the game shell shall ask for the language on a first-run card; otherwise it shall use the device language silently, changeable in Settings. [screen-flow §3 S2]
- SHELL-014: Where something is collected that needs consent (crash reports, metrics, the free mobile tier's ad), the game shell shall show the consent card whose content the privacy plan decides; where nothing on a store needs consent, the card shall not appear there. [screen-flow §3 S2]
- SHELL-015: The game shell shall ask for no account sign-in in the first-run path or anywhere before play, and the game shall play offline. [screen-flow §3 S2]

### 5.3 Title and main menu

- SHELL-016: The title screen shall show the real map at world zoom drifting slowly across a region, drawn by the map renderer; while a campaign is in progress it shall drift over the player's realm in its current borders, read from the latest save's summary rather than the whole save. [screen-flow §3 S3, §10.5]
- SHELL-017: When the title screen receives any touch, click, key or controller button, the game shell shall treat it as Tap to start and the `title` track shall start. [screen-flow §3 S3]
- SHELL-018: The title screen shall show a small settings cog that opens Settings straight away, a ✕ that quits on desktop only, and the version number in a corner. [screen-flow §3 S3]
- SHELL-019: When the player taps to start, the "Tap to start" line shall fold open into the main menu in the same place on the same screen, and Back from the main menu shall return to "Tap to start". [screen-flow §3 S4]
- SHELL-020: While a campaign exists, the main menu shall show Continue, labelled with the realm's banner, name and in-game date ("France · May 1503"), which goes to Loading with the newest save. [screen-flow §3 S4]
- SHELL-021: The main menu shall always show New campaign, which goes to S5. [screen-flow §3 S4]
- SHELL-022: While any save exists, the main menu shall show Load, which goes to S6. [screen-flow §3 S4]
- SHELL-023: The main menu shall always show Tutorial, which goes to the tutorial's start, and shall move it under More once the tutorial is finished. [screen-flow §3 S4]
- SHELL-024: The main menu shall always show More, which holds Settings, Achievements, Encyclopedia, Unlock (Buy the full game in the Steam demo) and Credits. [screen-flow §3 S4, §2]
- SHELL-025: Where the game runs on desktop or Steam, the main menu shall show Quit, which closes the game; phones shall have no Quit. [screen-flow §3 S4]
- SHELL-026: When the main menu opens, focus shall start on Continue when it exists, otherwise on New campaign. [screen-flow §3 S4; see OQ-SHELL-3]
- SHELL-027: The main menu's first entry shall be large and wax-red, and the rest paper buttons in the existing art style. [screen-flow §3 S4]
- SHELL-028: Where the free mobile tier keeps its one ad, the game shell shall show it only as a single framed card in the corner opposite the menu on the main menu; it shall never cover a button, animate or play sound; it shall never appear on the loading screen, in a campaign, in the game menu or on the end screens; it shall not appear in the very first session; any purchase shall remove it for good; and it shall never appear in the Steam demo. [screen-flow §3 S4]
- SHELL-029: Where the game is the free tier, the main menu shall show a small "Full game" ribbon that leads to Unlock, never as a pop-up. [screen-flow §3 S4]

### 5.4 New campaign, load and loading

- SHELL-030: The new campaign screen shall hold three steps on one screen with a step strip at the top ("Realm · Options · Begin"), and Back shall move one step back. [screen-flow §3 S5]
- SHELL-031: Step 1 shall let the player choose a realm on the map at world zoom, with filters (region, difficulty, free or locked) and a short list of suggested realms; tapping a realm shall show its card with its strengths at a glance. [screen-flow §3 S5]
- SHELL-032: When a realm is locked, its card shall show a padlock and a button to the Unlock screen, and coming back from a purchase shall return to step 1 with that realm still chosen. [screen-flow §3 S5, §6 Purchases]
- SHELL-033: Step 2 shall offer difficulty, AI temper, fog, historical or free events, ironman, and the end date, with presets that fill the whole step. [screen-flow §3 S5]
- SHELL-034: Step 3 shall show a summary card (banner, ruler, capital, start date, options) and one big Begin button. [screen-flow §3 S5]
- SHELL-035: When the player presses Quick start on step 1, the game shell shall skip to Begin with the last options used and the realm the player last tapped, or the first suggested realm. [screen-flow §3 S5]
- SHELL-036: When the player presses Back on step 1, the game shell shall return to the main menu without asking. [screen-flow §3 S5]
- SHELL-037: While the new campaign screen is open, the `nation_select` track shall play, its lead voice changing with the highlighted realm. [screen-flow §3 S5]
- SHELL-038: The Load screen shall list saves newest first, each with banner, realm, in-game date, real date saved and an autosave or ironman mark, and tapping one shall show its card with Load and Delete. [screen-flow §3 S6; see OQ-SHELL-4]
- SHELL-039: When the player loads a save from the main menu, the game shell shall go to Loading with no confirmation. [screen-flow §3 S6]
- SHELL-040: When the player loads from the game menu while the current campaign has unsaved turns, the game shell shall first ask "Leave <date> unsaved? · Save first · Leave · Cancel". [screen-flow §3 S6, §4.5]
- SHELL-041: The loading screen shall show a tip from the one tips table in the config, tagged by era, region and whether it is for new players, picking one that fits the realm and date; tapping or pressing left and right shall show another. [screen-flow §3 S7]
- SHELL-042: The loading screen's bar shall show the real loading steps ("Reading the save", "Drawing the borders", "Waking the courts") rather than a fake timer. [screen-flow §3 S7]
- SHELL-043: When loading finishes, the game shell shall go straight to the map without asking for a tap, but shall keep a tip on screen for at least 2 s after it appeared before fading. [screen-flow §3 S7; placeholder]
- SHELL-044: While the loading screen is shown, the `load_resume` track shall play. [screen-flow §3 S7]

### 5.5 Layers, map and cards

- SHELL-045: The game shell shall treat in-campaign screens as four layers: the map (Back opens the game menu), cards (closed by Back, ✕, tapping empty map or folding away), full screens (Back or ✕ returns to whatever was below) and modals (closed only by their own buttons; Back means "decide later" where that is allowed). [screen-flow §4.1]
- SHELL-046: When a card opens another card, the game shell shall stack it on the card stack, show a "Back to <name>" button at the bottom of the card for the card below, and clear the card stack when the player taps empty map. [screen-flow §4.1]
- SHELL-047: The map's top bar shall show the realm name and banner (opening the country card), the date, gold with its monthly change, and levies; on a phone it shall hold at most five plaques and move the rest into the country card. [screen-flow §4.2]
- SHELL-048: The map's tool column at the right edge shall hold map lens, go to capital, and Realm book. [screen-flow §4.2]
- SHELL-049: The End turn button (the hourglass, lower right) shall carry a badge counting the items on the Attention screen, and tapping the badge or pressing the controller's "next" button shall open the Attention screen. [screen-flow §4.2]
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
- SHELL-065: The game menu shall hold, in order: Return to the map (focused first), Save, Load, Settings, Encyclopedia, Achievements, Exit to main menu, and Quit (desktop and Steam only). [screen-flow §4.5]
- SHELL-066: While the campaign is ironman, the game menu's Save entry shall read "Save and quit". [screen-flow §4.5]
- SHELL-067: When the player picks Settings in the game menu, Settings shall open as an overlay and return to the game menu when closed. [screen-flow §4.5]
- SHELL-068: When the player picks Exit to main menu or Quit, the game shell shall ask only if there are unsaved turns; while the campaign is ironman it shall save and exit without asking. [screen-flow §4.5]

### 5.8 The turn

- SHELL-069: When the player taps End turn and no event is unanswered, the game shell shall end the turn with one tap, showing a confirmation only if Settings turns it on. [screen-flow §4.6]
- SHELL-070: While any event is unanswered, the End turn button shall show the event's scroll icon with the count instead of the hourglass, and tapping it shall open the first unanswered event instead of ending the turn. [screen-flow §4.6, decided 16 Oct]
- SHELL-071: While the turn is in progress, the map shall stay visible and can be panned and zoomed, orders shall be frozen, the hourglass shall turn, armies shall march along their routes and borders shall change as the worker's results arrive. [screen-flow §4.6 G5]
- SHELL-072: If a turn takes longer than 1.5 s, then the game shell shall show a small parchment strip saying what is being worked out ("The courts of Europe deliberate…"). [screen-flow §4.6 G5; placeholder]
- SHELL-073: When the player ends the turn, a save shall be taken just before the turn runs, so the app being killed mid-turn loses nothing. [screen-flow §4.6 G5; see OQ-SHELL-5]
- SHELL-074: When the turn reaches a battle that the player's armies or fleets fight, the turn shall stop, the map shall fly to the battle, and the battle viewer shall open on a before-the-battle card showing both armies, their commanders, the ground and this army's standing orders, which can be changed there for this one battle. [screen-flow §4.6 G6, decided 16 Oct]
- SHELL-075: When the player presses Fight, the battle shall play bell by bell; when the player presses Skip to result at any moment, it shall jump to the end; either way the battle shall end on its result card (who won, men lost, the one-line reason) with Carry on. [screen-flow §4.6 G6]
- SHELL-076: When the player presses Carry on, the turn shall resume until the next player battle or the end of the turn, with battles coming in the order they happen within the month. [screen-flow §4.6 G6]
- SHELL-077: When realms other than the player's fight a battle, the turn shall not stop; the battle shall appear on the map and, if it matters to the player, in the turn report. [screen-flow §4.6 G6]
- SHELL-078: The game shell shall keep every battle watchable again from the turn report and the Chronicle tab. [screen-flow §4.6 G6, §4.7]
- SHELL-079: If the app goes to the background while the turn is stopped at a battle, then it shall come back to the same battle; if the app was killed, the pre-turn save shall replay the month to that battle with the same result. [screen-flow §4.6 G6]
- SHELL-080: When events arise, they shall open one at a time as a modal card (picture, text, two or three options, each option showing its effects on tap or focus), queued in date order. [screen-flow §4.6 G7]
- SHELL-081: When the player presses Look at the map on an event, the event shall shrink into the badge on End turn so the player can check something before answering. [screen-flow §4.6 G7]
- SHELL-082: When the turn ends and something worth reporting happened, the turn report shall slide in from the edge as a card listing what happened, each line jumping to its place on the map or its card, and shall close on the first map tap; if nothing worth reporting happened, only the date in the top bar shall change. [screen-flow §4.6 G8]

### 5.9 Attention screen

- SHELL-083: The Attention screen shall open from the bell in the top bar, the badge on End turn, the controller's "next" button, and the End turn question, as a card over the map. [screen-flow §4.6 G9]
- SHELL-084: The Attention screen shall list its lines in two groups, Warnings then Waiting for you, most urgent first. [screen-flow §4.6 G9]
- SHELL-085: Warnings shall cover things bad that are coming or happening (for example famine in a province within two months, pay owed to an army, an army hungry, a castle breached, a rising brewing, peace voices passing half against you, a ruler without an heir), and Waiting for you shall cover events not yet answered, peace offers, idle armies and fleets, empty research or school slots and unspent levies. [screen-flow §4.6 G9]
- SHELL-086: Each Attention line shall have an icon, one sentence and a Show button that jumps to its place on the map or its card, and Back from there shall return to the Attention screen. [screen-flow §4.6 G9]
- SHELL-087: When the player mutes a line (by long press or by a button on the line), the game shell shall silence that item or every item of its kind, list muted kinds at the bottom, and let them be unmuted. [screen-flow §4.6 G9]
- SHELL-088: Where Settings turns on the End turn confirmation, the question shall name the count of open warnings ("3 warnings wait for you · Look · End turn anyway"), and warnings shall never block the turn. [screen-flow §4.6 G9]
- SHELL-089: The Attention screen shall say what is wrong and never what to do; its warnings and their thresholds shall live in one config table, to which each system's design adds its own lines. [screen-flow §4.6 G9]

### 5.10 Other in-campaign screens

- SHELL-090: When the player presses Back in the battle viewer during a stopped turn, it shall mean Skip to result; in a replay, Back shall return where the replay was opened. [screen-flow §4.7, §9]
- SHELL-091: The siege view shall be a full screen opened from a besieged castle at local zoom or from its card, and Back shall return to the map at the castle. [screen-flow §4.7]
- SHELL-092: The peace table shall be a modal opened from the Abroad tab, an enemy's country card, or an incoming offer, returning where it was opened; an incoming offer shall not be dismissable, only answered or put off one turn. [screen-flow §4.7]
- SHELL-093: The map lens picker shall be a small pop-over from the tool column returning to the map, and a confirmation shall be a small modal for destructive actions only, returning to the screen below unchanged. [screen-flow §4.7]

### 5.11 How a campaign ends

- SHELL-094: When the player's realm no longer exists (annexed, every province lost, or a successor rule ends it), the game shell shall show game over: the map zooms out over the old borders while the `game_over` track plays, and a card says how it ended in one line with the date ("Burgundy was divided between France and the Empire · 1477") and the realm's highs (largest size, years lasted, battles won). [screen-flow §5 E1]
- SHELL-095: The game over card shall offer Look back (the Chronicle, read only), Play on as another realm (any realm on the current map) and Main menu. [screen-flow §5 E1]
- SHELL-096: Play on as another realm shall be allowed in every campaign including ironman, shall end achievements for that campaign, shall say so on the button before it is pressed ("Achievements end for this campaign"), and shall not be undoable. [screen-flow §5 E1, decided 16 Oct; achievements v1.1]
- SHELL-097: When the end date is reached (default 31 August 1939) or a victory condition fires, the game shell shall show the final wrap-up event or events as normal event cards, then a closing sequence of the map at world zoom stepping through the player's borders by era with the `campaign_end` track, then the final result. [screen-flow §5 E2; gap-lists campaign span]
- SHELL-098: When a player wins by world domination or by leading in the Economy, Power or Technology score, a victory condition shall fire and lead to campaign end. [gap-lists List 1 item 1, decided 16 Oct; see OQ-SHELL-1]
- SHELL-099: The final result screen shall show the ledger comparison and final outcome, the achievements earned in this campaign, and Main menu or Credits. [screen-flow §5 E3]
- SHELL-100: The game shell shall offer no "play on" past the end date, and the end date shall be the one chosen when the campaign started (S5 step 2). [screen-flow §5 E2]

### 5.12 Interruptions

- SHELL-101: When the app goes to the background (home button, a call, the screen locks), the game shell shall save if anything changed since the last save and suspend sound. [screen-flow §6 R1; see OQ-SHELL-5]
- SHELL-102: When the app comes back while still in memory, or a Steam Deck resumes from suspend, the game shell shall return straight to the exact screen, scroll and camera without the title, and `load_resume` shall play. [screen-flow §6 R1]
- SHELL-103: When the app was closed by the system while in the background, the next start shall be a cold start with Continue pointing at that save, and after loading the map shall show a one-line strip "Picked up where you left off". [screen-flow §6 R1]
- SHELL-104: If a turn was running when the app went to the background, then the worker shall pause with the app and the turn shall carry on when it returns; if the app was killed, the pre-turn save shall be used. [screen-flow §6 R1]
- SHELL-105: When the unlock flow ends, it shall return to where it was opened (the realm picker with the bought realm chosen, or the menu); a failed or cancelled purchase shall return to the same place with no extra message beyond what the store shows. [screen-flow §6 Purchases]
- SHELL-106: If there is no connection when the unlock flow is used, then it shall show "No connection: try again later" and block nothing else. [screen-flow §6 Purchases]
- SHELL-107: If a failure occurs that the game cannot recover from on its own (the engine worker crashes, a save won't read), then the game shell shall show one failure screen that says what failed in plain words and offers Restore the last autosave, Main menu and, where a crash reporter is approved, Send a report, and shall never show a stack trace. [screen-flow §6 X1]

### 5.13 Layout by window shape

- SHELL-108: While the window is a phone in landscape (height under 500 css px), the game shell shall use the Short wide layout: map first, cards as side sheets on the left, the Realm book's tabs as a left icon rail and the top bar as one thin row. [screen-flow §7.1; placeholder]
- SHELL-109: While the window is a tablet in portrait or a desktop window taller than wide (never a phone), the game shell shall use the Tall layout: cards as bottom sheets, the Realm book's tabs as a bottom icon row, and the tool column on the right edge above the End turn button. [screen-flow §7.1]
- SHELL-110: While the window is a tablet in landscape, a desktop window or a Steam Deck (1280 × 800), the game shell shall use the Large layout: side sheets with a fixed width, menus centred with a maximum width, nothing stretched edge to edge. [screen-flow §7.1]
- SHELL-111: While the game runs on a TV or Steam Machine (chosen in Settings or detected from a TV output), the game shell shall use the Far layout: the Large layout with UI scale raised so body text is about 1/30 of screen height, thicker focus frames, and nothing in the outer 5 % of the screen. [screen-flow §7.1; placeholder]
- SHELL-112: The game shell shall keep the system safe areas (notches, rounded corners, the home indicator) clear of buttons in every shape. [screen-flow §7.1]
- SHELL-113: Where the device is a phone, the game shall play in landscape only on every screen, menus included, and a phone held upright shall show the notice "Turn your phone sideways"; tablets and desktop windows shall use whichever shape they are in, including Tall during a campaign. [screen-flow §7.2, decided 16 Oct]
- SHELL-114: The game shell shall make every tap target at least 44 × 44 points with 8 points between neighbours. [screen-flow §7.3; placeholder]
- SHELL-115: The game shell shall never place a button that ends the turn or loses something (End turn, Delete save, Exit to main menu) next to a frequent button or at the very edge where a phone case or grip covers it. [screen-flow §7.3]
- SHELL-116: The game shell shall place the End turn button and the game menu button at opposite corners. [screen-flow §7.3]

### 5.14 Navigation by input

- SHELL-117: The game shell shall map Back to the system back button or gesture on Android; the on-screen Back or ✕ on iOS, with an edge swipe on full screens only and never over the map; Esc on a keyboard; B (east button) on a controller; and the on-screen Back or ✕ or mouse button 4 with a mouse. [screen-flow §8.1]
- SHELL-118: When the player presses Back on the map with nothing open, the game menu shall open; on the main menu Back shall return to "Tap to start"; on Android, Back on "Tap to start" shall leave the app. [screen-flow §8.1]
- SHELL-119: On the map, touch shall work as: tap selects a province, army or castle and shows its name tab; drag pans; pinch zooms; long press shows what is under the finger without selecting it; tapping an army then a province gives a march order, and tapping the army's own province halts it. [screen-flow §8.2]
- SHELL-120: On cards, the book and menus, touch shall work as: tap presses; drag scrolls; pinch does nothing; long press shows the item's explanation (the same text a tooltip shows on desktop). Long press shall never do anything that cannot also be reached by tap; it only explains. [screen-flow §8.2]
- SHELL-121: The game shell shall define one controller action set per layer: Shell (S1–S7, Settings, Achievements), Map (G1), Card (G2), Book (G3), Modal (events, confirmations, game menu) and Battle (battle viewer), each with the needs listed in screen flow §8.3. [screen-flow §8.3; see OQ-SHELL-8]
- SHELL-122: In the Map action set, the game shell shall offer a free cursor on the left stick that snaps gently to provinces, armies and castles, pan on the right stick, zoom on the triggers, select, context actions, next army or next waiting item, open the Realm book, open the game menu, and End turn held for half a second. [screen-flow §8.3; placeholder; see OQ-SHELL-7]
- SHELL-123: While a controller or keyboard is in use, focus shall always be visible as the gold frame used for the chosen map lens, every screen shall have its defined first focus, and the focus order shall follow reading order. [screen-flow §8.3]
- SHELL-124: The game shell shall hold the screen list of screen flow §9 (id, kind, first focus, Back target, music, owner of content) as the single catalogue that code, music and sound key on. [screen-flow §9]
- SHELL-125: While a Steam Controller or Steam Deck trackpad is in use, it shall act as a mouse on the map through Steam Input and the game shall show the mouse pointer; otherwise it shall show the stick cursor. [screen-flow §8.3]
- SHELL-126: The game shell shall show button prompts matching the last device used (no prompts for touch, the controller's own glyphs for Xbox, PlayStation, Steam or Switch-style controllers, keys for a keyboard), switching at once when the device changes. [screen-flow §8.3]
- SHELL-127: Where a text field exists, it shall use the platform's on-screen keyboard (Steam's on the Deck and in Big Picture, the system keyboard on phones) and shall have a filled-in default so it can be confirmed without typing. [screen-flow §8.3]
- SHELL-128: With a mouse, the game shell shall work like touch with hover added, hover showing what long press shows; with a keyboard it shall use Esc for Back, Enter to select, Tab and arrows to move focus, and a key for End turn. [screen-flow §8.4]

## 6. Commands

| Command | Who issues it | Preconditions | Result | Events emitted |
|---|---|---|---|---|
| TapToStart | player | Title showing | Main menu folds open; `title` track starts | `TitleDismissed` |
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
| AnswerEvent | player | Event modal open | Option chosen (events) | `EventAnswered` |
| LookAtMap | player | Event modal open | Event shrinks into the End turn badge | — |
| FightBattle / SkipToResult | player | Turn stopped at a player battle | Battle plays bell by bell / jumps to result | — |
| ChangeStandingOrdersForBattle | player | Before-the-battle card | Standing orders for this battle changed (warfare) | `BattleOrdersChanged` |
| CarryOn | player | Result card showing | Turn resumes | `TurnResumed` |
| OpenAttention | player | Map | Attention card opens | `ScreenOpened(attention)` |
| MuteAttentionLine / UnmuteKind | player | Attention open | Line or kind muted / unmuted | `AttentionMuteChanged` |
| PlayOnAsAnotherRealm | player | Game over card | Player takes another realm; achievements end | `PlayedOnAsAnotherRealm` |
| RestoreLastAutosave | player | X1 showing | Load of the last automatic save | `CampaignLoadRequested` |
| SendReport | player | X1 showing; crash reporter approved | Report sent (privacy) | `ReportSent` |

All commands are screen commands issued by the player only; the AI issues none in this context. The game
orders that some of them carry (end turn, event answers, battle orders) are owned by the gameplay contexts and
sent as data.

## 7. Domain events

| Event | When | Payload | Consumed by (context) |
|---|---|---|---|
| `ScreenOpened` / `ScreenClosed` | A screen enters or leaves the stack | screen id, tab (realm book) | audio (screen rules 5.2, `diplomacy` mood on Abroad), onboarding |
| `TitleDismissed` | Tap to start | — | audio (sound may start) |
| `FirstRunAnswered` | A first-run card answered | language or consent value | settings |
| `CampaignStarted` | Begin pressed | realm, options | scenario-setup, saves, time-and-turns |
| `CampaignLoadRequested` | Continue, Load, Restore the last autosave | save id | saves |
| `SaveDeleteRequested` | Delete confirmed | save id | saves |
| `EndTurnPressed` | End turn accepted | — | time-and-turns, saves (pre-turn save) |
| `TurnResumed` | Carry on | battle id | time-and-turns |
| `EventAnswered` | Event option chosen | event id, option | events |
| `BattleOrdersChanged` | Orders changed on the before-the-battle card | army, orders | warfare |
| `AttentionMuteChanged` | Mute or unmute | item or kind | onboarding (stores mutes), saves |
| `PlayedOnAsAnotherRealm` | Play on chosen | new realm | achievements, saves |
| `CampaignLeft` | Exit to main menu or Quit | — | saves |
| `AppBackgrounded` / `AppResumed` | Platform lifecycle | — | saves, audio |
| `ReportSent` | Send a report | — | (privacy, not designed) |

## 8. Policies (reactions to other contexts)

- When `time-and-turns` reaches a battle the player's armies or fleets fight, the shell stops the turn, flies the
  map there and opens the before-the-battle card (SHELL-074).
- When `time-and-turns` finishes the month, the shell shows queued events (G7), then the turn report (G8).
- When `events` raises an event for the player, the shell queues it in date order and counts it on End turn.
- When any system posts a warning or waiting item, the shell adds it to the Attention list unless its kind is
  muted, and lights the bell for warnings.
- When `realm` (or warfare, diplomacy) reports that the player's realm no longer exists, the shell shows game
  over (E1).
- When `time-and-turns` reports the end date, or the victory rules report a winner, the shell runs campaign end
  (E2, E3).
- When `saves` reports a save that won't read, or the engine worker crashes, the shell shows X1.
- When `saves` reports a locked nation's save, the shell opens the unlock screen (saves §6.1).
- When `settings` changes the shape (Far layout / device profile), text size or UI scale, the shell relays out
  without restart.

## 9. Monthly turn

The shell does no simulation. Per turn, on screen:
1. Orders phase: map live; End turn blocked while events are unanswered.
2. End turn pressed: (optional confirmation) → pre-turn save taken (saves) → G5 with orders frozen.
3. For each player battle in order within the month: stop, before-the-battle card, Fight or Skip to result,
   result card, Carry on. Requires `time-and-turns` to pause the month at each player battle and resume.
4. Events (G7) one at a time in date order.
5. Turn report (G8), if anything worth reporting.
6. Attention list and badge refreshed; next orders phase.

## 10. Configuration

All numbers in screen flow are placeholders "for one interface config file" (no file name given).

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
| `shell.controller_end_turn_hold` | End turn hold on a controller | 0.5 s | yes | interface config |
| `shell.campaign_end_date_default` | Default end date | 31 August 1939 | no (decided) | campaign rules |
| `attention.*` | Warnings and thresholds | one table; first lines from warfare 14 | yes | one config table (unnamed) |
| `tips.*` | Loading tips with era, region, new-player tags | written by the tutorial thread | — | tips table |

## 11. Seams

| Other context | Direction | Pattern | What crosses |
|---|---|---|---|
| saves | upstream | Customer–Supplier | Newest save and its header summary (Continue label, title background), Load list, pre-turn and background saves, ironman flag, locked-nation check, damaged-save failures |
| settings | upstream | Customer–Supplier | Confirm End turn, turn report opening, shape/profile and Far layout, UI scale and text size, button prompts, hold actions; Settings overlay opens from the shell |
| time-and-turns | upstream | Customer–Supplier | End of month, pause at each player battle and resume (Carry on), end date reached |
| warfare | upstream | Customer–Supplier | Battle viewer content, before-the-battle card and standing orders, result card, siege view, peace table, notifications for the turn report and Attention |
| events | upstream | Conformist | Events with two or three options, queued in date order; wrap-up events at campaign end |
| map-presentation | upstream | Customer–Supplier | Map rendering, zoom levels, lenses, title background, camera moves (Show on map) |
| onboarding | partnership | Partnership | Tips table, encyclopedia, tutorial start, first-launch "New to Pocket Hegemony?" question, Attention list (tutorial's "Needs attention") and its mutes |
| achievements | downstream | Customer–Supplier | Play on as another realm ends achievements; final result shows earned achievements; Achievements screen placement |
| audio | downstream | Published Language | Screen ids (screen list) and Realm book tab for music screen rules and moods; suspend and resume sound |
| scenario-setup | upstream | Customer–Supplier | Realms, suggested realms, filters, strengths at a glance, start date, campaign options and presets |
| realm | upstream | Conformist | Country card, top bar values (gold, levies), realm no longer exists, realm highs |
| province | upstream | Conformist | Province card, Tax screen, gain-and-lose lists |
| recruiting | upstream | Conformist | Levy and commission screens in the Army tab and from province cards |
| diplomacy | upstream | Conformist | Abroad tab contents, peace offers waiting |
| research | upstream | Conformist | Learning tab, empty research or school slots for Attention |

Changes screen flow asks of other files (§11), and whether they were taken in:
- Music 5.1 / 5.2 use the screen ids, add `loading` and `realm_book` (Abroad) — adopted (music README §4.1, §5.2).
- Warfare 7.15: the turn stops on a before-the-battle card with Fight / Skip to result and a result card with Carry on — not adopted: warfare 7.15 still describes a battle report with a Watch button after the month (OQ-SHELL-2).
- Turn order (gap list 1 item 20): the month must pause at each player battle and resume — owned by time-and-turns; today's engine `endTurn` runs a whole month in one call (OQ-SHELL-23).
- Warfare 14 and province stats 14 notifications feed G8 and G9 — pending the turn report design (OQ-SHELL-22).
- Tutorial: no advisor after the tutorial; Attention screen takes its place — adopted, but named "Needs attention" with different groups (OQ-SHELL-15).
- Achievements: play on after game over ends achievements — adopted (achievements v1.1).
- Recruiting 2.1, country stats 3.3, province stats 8: Levy, Food policy and Tax screens live in the Realm book and are reachable from cards — not checked here; recorded for those contexts.
- Today's build: keep phone landscape lock; let tablets rotate (the `~ipad` key still locks iPads); boot-time realm chooser becomes S5 step 1; phone province card becomes a side sheet; Realm book and game menu buttons join the HUD (OQ-SHELL-19).

Changes other designs ask of screen flow:
- Saves §9: Continue on the title (adopted), Save and Load in the pause menu (adopted), the Load screen grouped by campaign (not adopted, OQ-SHELL-4), the ironman choice on new game (adopted), "Send a report" in the pause menu (not adopted, OQ-SHELL-11).
- Settings §8: Settings overlay from the More menu, the cog and the game menu (adopted); Big screen uses Far layout (adopted); Campaign rules in the pause menu (not adopted, OQ-SHELL-11).
- Tutorial §12: first-launch question, tutorial lines in the pause menu, Tutorial entry with chapter list (not adopted, OQ-SHELL-3, OQ-SHELL-11).
- Achievements: the pause menu and new game screen show whether the campaign can earn achievements (not adopted, OQ-SHELL-11).

## 12. AI

None. Computer players never use the shell. The only rule touching them: battles between other realms never
stop the turn (SHELL-077).

## 13. Open questions and contradictions

- OQ-SHELL-1: **Victory conditions.** Gap lists decided (16 Oct) that a campaign is won by world domination or by leading the Economy, Power or Technology score, but how each score is measured, what counts as world domination and when the scores are judged (presumably at the end date) are not designed. Screen flow E2 was written before the decision ("if gap list 1, item 1 chooses one"). Open: does world domination end the campaign early; can a score lead fire before the end date; what E3's "final outcome" says for a loss. Blocks SHELL-097, SHELL-098, SHELL-099.
- OQ-SHELL-2: **Battle stop vs warfare 7.15.** Screen flow G6 (decided 16 Oct): the turn stops when it reaches each player battle, on a before-the-battle card with changeable standing orders, Fight and Skip to result. Warfare 7.15 still says battles are resolved when the month ends and the turn stops on a battle report with a Watch button. Gap lists List 1 item 3 still calls it unsettled. Also open: whether the player has any other choice on the before-the-battle card (screen flow defers to warfare). Blocks SHELL-074–076.
- OQ-SHELL-3: **Main menu first focus and first-launch question.** Screen flow S4 says focus starts "on Continue when it exists, otherwise on New campaign (tutorial not done) or New campaign", which reads as a slip (Tutorial was probably meant when the tutorial is not done). The tutorial design (§9) also adds a first-launch question "New to Pocket Hegemony?" (Play the tutorial / Guided campaign / I know the way) after the title, and a Tutorial entry with a chapter list; screen flow S2 does not have it, and "Guided campaign" has no place in S5.
- OQ-SHELL-4: **Load screen shape.** Screen flow S6 lists saves newest first with banner, realm, dates and an autosave or ironman mark. The saves design (§2.1, §9) lists campaigns first (banner, nation, date, turn, play time, map crop) and a campaign's saves inside, each marked with the device that made it, plus a "Sign in to sync" prompt. Screen flow did not take this in.
- OQ-SHELL-5: **Which save the shell relies on.** Screen flow speaks of "an autosave taken just before the turn runs" (G5), "autosave if anything changed" on backgrounding (R1) and "Restore the last autosave" (X1). The saves design's autosave is the rotating one on the player's interval (default every 12 turns), and protection comes from the Resume save (written after every End turn) plus the orders journal (written on backgrounding). The shell's wording needs mapping to the Resume save, or the saves design needs a pre-turn save.
- OQ-SHELL-6: **Unanswered events and the End turn question.** Screen flow: unanswered events block End turn and the button opens the first one. Settings §5.3: "Unanswered events always ask" and the question names "3 warnings, 2 events wait for you". These disagree on whether events can ever be passed with "End turn anyway". Screen flow's decision (16 Oct) is taken here.
- OQ-SHELL-7: **End turn hold time on a controller.** Screen flow §8.3: held for half a second. Settings §5.4: View button, hold 1 s (`hold_seconds: 1.0`). Keyboard Enter: hold 0.5 s. Also which button is the controller's "next" that opens Attention (settings maps notifications to d-pad left/right and the turn report to View).
- OQ-SHELL-8: **Controller action sets.** Screen flow §8.3 defines six (Shell, Map, Card, Book, Modal, Battle); settings §6.3 declares three (Map, Menu, Battle) plus a Text layer.
- OQ-SHELL-9: **March order by touch.** Screen flow §8.2: tap an army, then a province gives the order. Settings §5.4 (right-click off): "tap army, tap province, confirm", with a confirm step.
- OQ-SHELL-10: **Long press.** Screen flow §8.2: long press only explains. Settings: long-press shows "a tooltip or the action menu" and resets a settings row (the only per-row reset on touch); the Attention mute uses long press but also has a button.
- OQ-SHELL-11: **Game menu entries.** G4 lists eight entries. Other designs ask for more: Campaign rules (settings §2), Send a report (saves §7), three tutorial lines during the tutorial (tutorial §12), whether the campaign can still earn achievements (achievements). Also, in ironman the saves design forbids Load of earlier points, but G4's Load entry is not restricted.
- OQ-SHELL-12: **Settings from the title: overlay or full screen.** Screen list: `settings` is an Overlay. Settings §2: "Title screen: Settings button (full screen)".
- OQ-SHELL-13: **First-run questions.** S2 has two (language, consent). Settings §2 adds a third on the Big screen profile ("Is this text easy to read?" Smaller / Fine / Bigger).
- OQ-SHELL-14: **Campaign options wording.** S5 says "AI temper"; gap lists and settings say "AI aggression". The allowed range of the end date (only the default 31 August 1939 is given; anything after is out of scope) and the music-era rule (settings §4.3) are not in S5.
- OQ-SHELL-15: **Attention vs "Needs attention".** The tutorial design calls the screen "Needs attention", with a "Go there" button and opportunities and first-time "New" entries; screen flow has two groups (Warnings, Waiting for you) and a Show button. Where mutes are stored (tutorial: in tutorial progress, owned by saves) is not in the saves design. The encyclopedia is called "Almanac" in the tutorial design.
- OQ-SHELL-16: **Free tier and store screens.** The unlock and purchase screens (gap list 2, item 5) are not designed; whether the free mobile tier keeps its one ad is open (List 3, item 2); free realms are the Ottomans and France. What other limits the Steam demo has is open.
- OQ-SHELL-17: **Game over cause "a successor rule ends it".** No design defines the successor rule.
- OQ-SHELL-18: **Left-handed layout.** Settings "Main hand: Left" mirrors the End turn button to the left; screen flow fixes End turn lower right and the game menu upper left at opposite corners. Whether the game menu button moves too is not said.
- OQ-SHELL-19: **Tablet rotation in today's build.** `apps/mobile/scripts/landscape.mjs` still locks iPads (`~ipad`), so the Tall layout is unreachable on tablets until the build change lands.
- OQ-SHELL-20: **Shape vs device profile thresholds.** Short wide is "height under 500 css px"; the settings Phone profile is "short side under 600 CSS px". A phone with a short side of 500–599 px gets the Phone profile but not the Short wide shape; the Tall shape "never phones" is defined by device, not by window.
- OQ-SHELL-21: **Final result for non-ironman campaigns.** E3 shows "achievements earned in this campaign", but achievements are ironman-only (achievements v1.1), so most campaigns show none. Whether E3 says so is open.
- OQ-SHELL-22: **Owner designs not yet written.** Turn report contents (gap list 2, item 7), ledger and final result (item 8), new game setup details (item 2), input scheme (item 9), credits (item 15) and the privacy plan (List 3, item 7) are all referenced but missing; their screens are placed here only.
- OQ-SHELL-23: **Pausing the month.** The engine's `endTurn` today processes a whole month in one call; G6 needs the month to stop at each player battle and resume, and replay to that battle deterministically after a kill. Owned by time-and-turns.
- OQ-SHELL-24: **Battle viewer controls.** Settings maps the battle view as A pause/play, B skip to result, X replay last bell, Y commander's line, Menu leave; screen flow's Battle action set has Fight and Carry on, which the settings layout does not name.

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
| SHELL-028 | title-and-main-menu.feature | The one ad in the free mobile tier |
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
| SHELL-057 | map-and-cards.feature | Fold away and reopen |
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
| SHELL-073 | turn-flow.feature | A save is taken just before the turn runs |
| SHELL-074 | turn-flow.feature | The turn stops for each player battle |
| SHELL-075 | turn-flow.feature | Fight or skip, then the result card |
| SHELL-075 | turn-flow.feature | Skip to result at any moment |
| SHELL-076 | turn-flow.feature | Carry on to the next battle in month order |
| SHELL-077 | turn-flow.feature | Other realms' battles never stop the turn |
| SHELL-078 | turn-flow.feature | Every battle can be watched again |
| SHELL-079 | turn-flow.feature | Interrupted at a battle |
| SHELL-080 | turn-flow.feature | Events one at a time in date order |
| SHELL-081 | turn-flow.feature | Look at the map before answering |
| SHELL-082 | turn-flow.feature | Turn report |
| SHELL-082 | turn-flow.feature | The turn report closes on the first map tap |
| SHELL-083 | attention.feature | Ways to open Attention |
| SHELL-084 | attention.feature | Lines fall into two groups |
| SHELL-084 | attention.feature | Warnings come first, most urgent first |
| SHELL-085 | attention.feature | Lines fall into two groups |
| SHELL-086 | attention.feature | Show jumps and Back returns |
| SHELL-087 | attention.feature | Muting lines |
| SHELL-087 | attention.feature | Unmuting a kind |
| SHELL-088 | attention.feature | The End turn question names the warnings but never blocks |
| SHELL-089 | attention.feature | Attention says what is wrong, not what to do |
| SHELL-090 | in-campaign-screens.feature | Back in the battle viewer |
| SHELL-091 | in-campaign-screens.feature | Siege view |
| SHELL-092 | in-campaign-screens.feature | Peace table |
| SHELL-092 | in-campaign-screens.feature | Incoming peace offers must be answered or put off |
| SHELL-093 | in-campaign-screens.feature | Lens picker and confirmations |
| SHELL-094 | campaign-end.feature | Game over when the realm no longer exists |
| SHELL-094 | campaign-end.feature | The game over line names what happened |
| SHELL-095 | campaign-end.feature | Choices after game over |
| SHELL-096 | campaign-end.feature | Playing on ends achievements, ironman included |
| SHELL-097 | campaign-end.feature | Reaching the end date |
| SHELL-098 | campaign-end.feature | A victory condition ends the campaign |
| SHELL-099 | campaign-end.feature | Final result |
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
| SHELL-120 | navigation-by-input.feature | Touch on cards, the book and menus |
| SHELL-120 | navigation-by-input.feature | Long press only explains |
| SHELL-121 | navigation-by-input.feature | One controller action set per layer |
| SHELL-122 | navigation-by-input.feature | The map with a controller |
| SHELL-123 | navigation-by-input.feature | Focus is always visible |
| SHELL-123 | screen-list.feature | The screen catalogue |
| SHELL-124 | screen-list.feature | The screen catalogue |
| SHELL-125 | navigation-by-input.feature | Trackpads act as a mouse |
| SHELL-126 | navigation-by-input.feature | Button prompts follow the last device |
| SHELL-126 | navigation-by-input.feature | Switching device switches prompts at once |
| SHELL-127 | navigation-by-input.feature | Text entry without a keyboard |
| SHELL-128 | navigation-by-input.feature | Mouse and keyboard |
