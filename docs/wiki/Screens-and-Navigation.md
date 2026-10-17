# Screens and navigation

This page covers every screen of Pocket Hegemony, from the boot logo to the final result of a campaign, and how you move between them with touch, mouse, keyboard or controller. The idea is simple: in a campaign the map is home, everything else opens over it and closes back onto it, and one Back action always takes you one step back.

## How it works

### The principles

- **The map is home.** While a campaign is loaded, every screen is either a card over the map or a full screen that closes back onto the map. The map is never unloaded.
- **One stack, one Back.** All screens live on one stack. The system back gesture, the on-screen Back button, Esc and the controller's B button all pop the top of it.
- **Never more than three steps from the map.**
- **Two taps to play.** From a cold start with a campaign in progress you reach your map with Tap to start, then Continue.
- **Ask only when something is lost.** First-run questions appear only once. Confirmations appear only where you would lose something (leaving without saving, overwriting a save).
- **Layout by shape, not by device.** Screens follow the shape of the window.
- **Every input works everywhere.** Every screen works with only a controller and with only touch. Nothing exists only as a hover or only as a long press.

### Starting the game

**Boot.** A cold start shows the pixel logo on parchment with the hourglass turning while the map, sprites and engine load. No studio logos, no video. On iOS and Android the native launch screen shows the same logo. If loading takes under 0.6 seconds the boot screen still stays 0.6 seconds; otherwise it stays only as long as loading takes. If loading fails (a missing file, or the engine worker will not start and the fallback also fails), you get the failure screen.

**First run.** The first time the game runs, it asks its first-run questions before the title, each as one card with one choice, and never again. If your device language is one the game has, it is used silently (you can change it in [Settings](Settings)); otherwise a card asks. Where something needs consent (crash reports, metrics, the free mobile tier's ad), a consent card appears; where nothing on a store needs consent, it does not. The game never asks you to sign in before play, and it plays offline.

**Title.** The real map at world zoom drifts slowly across a region. With a campaign in progress, it drifts over your realm in its current borders, read from the latest save's summary rather than the whole save. Any touch, click, key or button counts as Tap to start and starts the title music. A small cog opens Settings straight away, a ✕ quits (desktop only) and the version number sits in a corner.

**Main menu.** "Tap to start" folds open into the main menu in the same place; Back returns to "Tap to start".

| Entry | When it shows | Where it goes |
|---|---|---|
| Continue | While a campaign exists, labelled with banner, realm and date ("France · May 1503") | Loading with the newest save |
| New campaign | Always | New campaign |
| Load | While any save exists | Load |
| Tutorial | Always; moves under More once the tutorial is finished | The tutorial's start |
| More | Always | Settings, Achievements, Encyclopedia, Unlock (Buy the full game in the Steam demo), Credits |
| Quit | Desktop and Steam only; phones have none | Closes the game |

Focus starts on Continue when it exists, otherwise on New campaign. The first entry is large and wax-red; the rest are paper buttons.

**The free tier.** The free mobile download and the Steam demo show a small "Full game" ribbon on the main menu that leads to Unlock, never as a pop-up. Where the free mobile tier keeps its one ad, it is a single framed card in the corner opposite the menu, only on the main menu. It never covers a button, animates or plays sound; it never appears on the loading screen, in a campaign, in the game menu or on the end screens; it does not appear in the very first session; any purchase removes it for good; and it never appears in the Steam demo. The free countries are the Ottomans and France.

### New campaign

One screen in three steps, with a strip at the top ("Realm · Options · Begin"). Back moves one step back, and from step 1 returns to the main menu without asking. The nation select music plays, its lead voice changing with the highlighted realm.

1. **Realm.** Choose a realm on the map at world zoom, with filters (region, difficulty, free or locked) and a short list of suggested realms. Tapping a realm shows its card with its strengths at a glance. A locked realm shows a padlock and a button to Unlock; coming back from a purchase returns you to step 1 with that realm still chosen. Quick start skips straight to Begin with the last options used and the realm you last tapped (or the first suggested one).
2. **Options.** Difficulty, AI temper, fog, historical or free events, ironman, and the end date, with presets that fill the whole step.
3. **Begin.** A summary card (banner, ruler, capital, start date, options) and one big Begin button.

### Load and loading

The Load screen lists saves newest first, each with banner, realm, in-game date, the real date saved and an autosave or ironman mark. Tapping one shows its card with Load and Delete. Loading from the main menu needs no confirmation. Loading from the game menu with unsaved turns first asks "Leave <date> unsaved? · Save first · Leave · Cancel".

The loading screen shows a tip from the one tips table, picked to fit your realm and date (tips are tagged by era, region and whether they are for new players). Tap, or press left and right, for another. The bar shows the real loading steps ("Reading the save", "Drawing the borders", "Waking the courts"), not a fake timer. When loading finishes, the game goes straight to the map without asking for a tap, but keeps a tip on screen at least 2 seconds after it appeared. The load-and-resume music plays.

### The four layers of a campaign

| Layer | Examples | How it closes |
|---|---|---|
| Map | Home | Back opens the game menu |
| Cards | Province, army, commander, country, lord, castle, rebellion, sea zone | Back, ✕, tapping empty map, or folding away |
| Full screens | Realm book, levy, Food policy, Tax, battle viewer | Back or ✕ returns to whatever was below |
| Modals | Event, peace offer, confirmation, game menu | Only their own buttons; Back means "decide later" where that is allowed |

A modal accepts no input to the screens below until it is answered or put off.

### The map

- **Top bar:** realm name and banner (opens the country card), the date, gold with its monthly change, and levies. On a phone it holds at most five plaques; the rest move into the country card.
- **Tool column** on the right edge: map lens, go to capital, and Realm book.
- **End turn** (the hourglass, lower right) carries a badge counting the items on the Attention screen. Tapping the badge, or the controller's "next" button, opens the Attention screen.
- **Attention bell** next to the date lights while the Attention screen holds a warning, and opens it. It is the only place the game warns you; there is no advisor.
- **Game menu button**, a small three-line icon in the upper left next to the banner.
- The local zoom's tile-row view is still the map, not a separate screen.

### Cards

A tap on the map only selects; the thing's name appears on a tab in the lower left. Tapping the tab, or tapping the thing again, opens its card. Folding a card away shrinks it back to that tab. When a card opens another card (a province, then its owner's country, then a commander), they stack, and a "Back to <name>" button at the bottom names the card below. Tapping empty map clears the stack. A line that "opens its gain and lose list" opens it inside the card as a fold-out, not as a new screen.

How a card sits depends on the shape:

| Shape | Card |
|---|---|
| Short wide (phone landscape) | Full height on the left 45 % of the screen; the map stays live on the right, recentred so the selected thing is not hidden |
| Tall | A bottom sheet at 55 % height, dragged up to full height or down to a peek strip |
| Large | A side sheet 380 px wide at UI scale 1 |

### The Realm book

One full screen with up to six tabs. It opens on the tab you last used. A new system adds a section inside a tab, never a seventh tab.

| Tab | What it holds |
|---|---|
| Realm | Country card in full, ruler and family, lords, government |
| Treasury | Treasury, Tax screen, Food policy screen, trade |
| Army | All armies and fleets, commanders, levy, commission, troop cap |
| Abroad | Diplomacy, relations, subjects, wars and peace voices |
| Learning | Schools, research tree, religion and culture |
| Chronicle | Past turn reports, event log, battle reports, ledger |

The tabs are a narrow left rail of icons in Short wide, a row of icons along the bottom in Tall, and icon and name on a left rail in Large. Show on map (on a screen that points at an army or province) closes the book, moves the camera and opens that card; Back returns to the book on the same tab and scroll position. A book screen opened from a card (Levy from a province card) stacks on the card, and Back returns to the card.

### The game menu

The game menu opens from its button, from Back on an empty map, from Esc, or from the controller's Menu button. It is a modal over the dimmed map: a menu, not a pause screen, because the game is turn-based. In order: Return to the map (focused first), Save, Load, Settings, Encyclopedia, Achievements, Exit to main menu, and Quit (desktop and Steam only). In ironman, Save reads "Save and quit". Settings opens as an overlay and returns to the game menu. Exit and Quit ask only if there are unsaved turns; in ironman they save and exit without asking.

### The turn

1. **Orders.** The map is live. End turn ends the turn with one tap, with a confirmation only if Settings turns it on. While any event is unanswered, End turn shows the event's scroll icon with the count instead of the hourglass, and tapping it opens the first unanswered event instead of ending the turn.
2. **Turn in progress.** A save is taken just before the turn runs, so killing the app mid-turn loses nothing. The map stays visible and can be panned and zoomed, orders are frozen, the hourglass turns, armies march along their routes and borders change as results arrive. If a turn takes longer than 1.5 seconds, a small parchment strip says what is being worked out ("The courts of Europe deliberate…").
3. **Battles.** When the turn reaches a battle your armies or fleets fight, it stops, the map flies there, and the battle viewer opens on a before-the-battle card showing both armies, their commanders, the ground and this army's standing orders, which you can change there for this battle. Fight plays it bell by bell; Skip to result jumps to the end at any moment. Either way it ends on a result card (who won, men lost, the one-line reason) with Carry on, which resumes the turn until the next of your battles, in the order they happen in the month. Battles between other realms never stop the turn; they appear on the map and, if they matter to you, in the turn report. Every battle can be watched again from the turn report and the Chronicle.
4. **Events** open one at a time as modal cards (picture, text, two or three options, each showing its effects on tap or focus), in date order. Look at the map shrinks the event into the badge on End turn so you can check something first. Nothing ever answers an event for you. See [Historical events](Historical-Events).
5. **Turn report.** If something worth reporting happened, it slides in from the edge as a card. Each line jumps to its place on the map or its card, and it closes on the first map tap. If nothing happened, only the date changes.
6. The Attention list and badge refresh, and the next orders phase begins.

If the app goes to the background while the turn is stopped at a battle, it comes back to the same battle. If the app was killed, the pre-turn save replays the month to that battle with the same result.

### The Attention screen

The one list of warnings and of things waiting for you. It opens from the bell, the badge, the controller's "next" button and the End turn question, as a card over the map.

| Group | Examples |
|---|---|
| Warnings | Famine in a province within two months, pay owed to an army, an army hungry, a castle breached, a rising brewing, peace voices passing half against you, a ruler without an heir |
| Waiting for you | Events not yet answered, peace offers, idle armies and fleets, empty research or school slots, unspent levies |

Lines are listed most urgent first. Each has an icon, one sentence and a Show button that jumps to its place on the map or its card; Back returns to the Attention screen. You can mute a line, or every line of its kind, by long press or a button on the line; muted kinds are listed at the bottom and can be unmuted. The screen says what is wrong, never what to do. Its warnings and thresholds live in one config table to which each system adds its own lines. If Settings turns on the End turn confirmation, it names the count ("3 warnings wait for you · Look · End turn anyway"). Warnings never block the turn.

### Other screens in a campaign

- **Battle viewer:** during a stopped turn, Back means Skip to result; in a replay, Back returns to where the replay was opened.
- **Siege view:** a full screen opened from a besieged castle at local zoom or from its card; Back returns to the map at the castle.
- **Peace table:** a modal opened from the Abroad tab, an enemy's country card or an incoming offer, returning where it was opened. An incoming offer cannot be dismissed, only answered or put off one turn.
- **Map lens picker:** a small pop-over from the tool column.
- **Confirmation:** a small modal for destructive actions only, returning to the screen below unchanged.

### How a campaign ends

**Game over.** When your realm no longer exists (annexed, every province lost, or a successor rule ends it), the map zooms out over the old borders while the game over music plays, and a card says how it ended in one line with the date ("Burgundy was divided between France and the Empire · 1477") and your realm's highs: largest size, years lasted, battles won. It offers Look back (the Chronicle, read only), Play on as another realm (any realm on the current map) and Main menu. Play on is allowed in every campaign, ironman included, but it ends achievements for that campaign, says so on the button before you press it ("Achievements end for this campaign"), and cannot be undone.

**Campaign end.** When the end date is reached (31 August 1939 by default, or the date chosen at the start) or a victory condition fires, the final wrap-up events appear as normal event cards, then a closing sequence steps through your borders era by era at world zoom with the campaign end music, then the final result. A campaign is won by world domination or by leading in the Economy, Power or Technology score. There is no playing on past the end date.

**Final result.** The ledger comparison and final outcome, the achievements earned in this campaign, and Main menu or Credits.

### Interruptions

- **Going to the background** (home button, a call, the screen locks) saves if anything changed since the last save, and suspends sound.
- **Coming back** while still in memory, or a Steam Deck resuming from suspend, returns to the exact screen, scroll and camera without the title, with the load-and-resume music.
- **Killed in the background:** the next start is a cold start with Continue pointing at that save, and after loading the map shows "Picked up where you left off".
- **A running turn** pauses with the app and carries on when it returns; if the app was killed, the pre-turn save is used.
- **Purchases:** when the unlock flow ends it returns to where it was opened (the realm picker with the bought realm chosen, or the menu). A failed or cancelled purchase returns to the same place with no extra message beyond the store's. With no connection it says "No connection: try again later" and blocks nothing else.
- **Failure screen:** when something fails that the game cannot recover from (the engine crashes, a save will not read), one screen says what failed in plain words and offers Restore the last autosave, Main menu and, where a crash reporter is approved, Send a report. Never a stack trace.

### Layout by window shape

| Shape | When | Layout |
|---|---|---|
| Short wide | A phone in landscape (height under 500 css px) | Map first, cards as side sheets on the left, Realm book tabs as a left icon rail, top bar one thin row |
| Tall | A tablet in portrait, or a desktop window taller than wide (never a phone) | Cards as bottom sheets, Realm book tabs as a bottom row, tool column on the right above End turn |
| Large | A tablet in landscape, a desktop window, a Steam Deck (1280 × 800) | Side sheets with a fixed width, menus centred with a maximum width, nothing stretched edge to edge |
| Far | A TV or Steam Machine (chosen in Settings or detected) | Large with UI scale raised so body text is about 1/30 of screen height, thicker focus frames, nothing in the outer 5 % |

Phones play in landscape only, on every screen including menus; a phone held upright shows "Turn your phone sideways". Tablets and desktop windows use whichever shape they are in, including Tall during a campaign. Safe areas (notches, rounded corners, the home indicator) stay clear of buttons. Every tap target is at least 44 × 44 points with 8 points between neighbours. A button that ends the turn or loses something (End turn, Delete save, Exit to main menu) is never next to a frequent button or at the very edge where a case or grip covers it. End turn and the game menu button sit at opposite corners.

### Navigation by input

**Back on each device.** Android: the system back button or gesture. iOS: the on-screen Back or ✕, with an edge swipe on full screens only, never over the map. Keyboard: Esc. Controller: B (the east button). Mouse: the on-screen Back or ✕, or mouse button 4. Back on the map with nothing open opens the game menu; on the main menu it returns to "Tap to start"; on Android, Back on "Tap to start" leaves the app.

**Touch on the map.** Tap selects a province, army or castle and shows its name tab; drag pans; pinch zooms; long press shows what is under your finger without selecting it. Tapping an army and then a province gives a march order; tapping the army's own province halts it.

**Touch on cards, the book and menus.** Tap presses; drag scrolls; pinch does nothing; long press shows the item's explanation (the same text as a desktop tooltip). Long press only explains; it never does anything you cannot also reach by tap.

**Controller.** There is one action set per layer: Shell (boot to loading, Settings, Achievements), Map, Card, Book, Modal (events, confirmations, game menu) and Battle. In the Map set: a free cursor on the left stick that snaps gently to provinces, armies and castles, pan on the right stick, zoom on the triggers, select, context actions, next army or next waiting item, open the Realm book, open the game menu, and End turn held for half a second. A Steam Controller or Steam Deck trackpad acts as a mouse on the map and shows the pointer; otherwise the stick cursor shows.

**Focus.** While a controller or keyboard is in use, exactly one element has focus, drawn with the gold frame used for the chosen map lens. Every screen has its own first focus, and focus order follows reading order.

**Prompts and text.** Button prompts match the last device used: none for touch, the controller's own glyphs for Xbox, PlayStation, Steam or Switch-style controllers, keys for a keyboard, switching at once when the device changes. Text fields use the platform's on-screen keyboard and have a filled-in default so you can confirm without typing.

**Mouse and keyboard.** A mouse works like touch with hover added; hover shows what long press shows. A keyboard uses Esc for Back, Enter to select, Tab and arrows to move focus, and a key for End turn.

## What you see

The screen list is the single catalogue that code, music and sound key on:

| Screen id | Kind | First focus | Back goes to | Music |
|---|---|---|---|---|
| boot | Full | none | none | none |
| first_run | Full | the only choice | none, it must be answered | none |
| title | Full | Tap to start | leaves the app on Android | title |
| main_menu | Same screen | Continue | title | title |
| new_campaign | Full | first suggested realm | previous step, then main menu | nation_select |
| load | Full | newest save | where opened | unchanged |
| loading | Full | tip arrows | none | load_resume |
| settings | Overlay | first setting | where opened | unchanged |
| achievements | Full | first achievement | where opened | unchanged |
| encyclopedia | Full | search or first entry | where opened | unchanged |
| unlock | Full | Buy | where opened | unchanged |
| credits | Full | Back | main menu or final result | credits |
| map | Home | your capital or last army | opens the game menu | game music |
| card | Sheet | first line | previous card or map | unchanged |
| realm_book | Full | last tab's first item | map | unchanged; diplomacy mood on Abroad |
| game_menu | Modal | Return to the map | map | unchanged |
| turn | Overlay | none | none | unchanged |
| battle | Full | Fight before, Carry on after | Skip to result during a turn; where opened for a replay | war tracks |
| siege | Full | Back | map | war_siege |
| event | Modal | historical option | badge on End turn | stinger only |
| peace | Modal | first term | where opened | unchanged |
| turn_report | Sheet | first line | map | unchanged |
| attention | Sheet | first warning | map | unchanged |
| game_over | Full | Look back | none | game_over |
| campaign_end | Full | Skip | none | campaign_end |
| final_result | Full | Main menu | main menu | campaign_end |
| error | Full | Restore the last autosave | main menu | none |

## How it connects

- [Saving](Saving): the newest save and its summary, the Load list, pre-turn and background saves, ironman, damaged saves.
- [Settings](Settings): End turn confirmation, shape and Far layout, UI scale and text size, prompts, hold actions; the Settings overlay.
- [How a turn works](Time-and-Turns): end of month, pausing at each of your battles and resuming, the end date.
- [Warfare](Warfare): battle viewer, before-the-battle card, result card, siege view, peace table.
- [Historical events](Historical-Events): event cards in date order and the wrap-up events.
- [Map and lenses](Map-and-Lenses): map rendering, zoom levels, lenses, the title background, camera moves.
- [Tutorial and help](Tutorial-and-Help): tips, the encyclopedia, the tutorial start and the Attention list.
- [Achievements](Achievements): play on ends achievements; the final result shows them.
- [Music and sound](Music-and-Sound): screen ids and Realm book tabs drive music; sound suspends and resumes.
- [The 1444 start](The-1444-Start): realms, suggested realms, filters, campaign options and presets.
- [Your realm](Your-Realm), [Provinces](Provinces), [Recruiting](Recruiting), [Diplomacy](Diplomacy), [Research](Research): the cards and Realm book screens they fill.

The computer players never use these screens.

## Numbers

All are provisional values for one interface config file that has not been named yet, unless marked.

| Key | Value |
|---|---|
| `shell.boot_min_seconds` | 0.6 s |
| `shell.tip_min_seconds` | 2 s |
| `shell.turn_strip_after_seconds` | 1.5 s |
| `shell.card_phone_width` | 45 % of the screen |
| `shell.card_tall_height` | 55 % |
| `shell.card_large_width` | 380 px at UI scale 1 |
| `shell.short_wide_max_height` | under 500 css px |
| `shell.large_reference` | 1280 × 800 (a device, not a placeholder) |
| `shell.far_body_text` | about 1/30 of screen height |
| `shell.far_overscan` | outer 5 % |
| `shell.top_bar_max_plaques_phone` | 5 |
| `shell.realm_book_max_tabs` | 6 (a rule) |
| `shell.max_steps_from_map` | 3 (a rule) |
| `shell.tap_target_min` | 44 × 44 points |
| `shell.tap_target_gap` | 8 points |
| `shell.controller_end_turn_hold` | 0.5 s |
| `shell.campaign_end_date_default` | 31 August 1939 (decided) |
| `attention.*` | one table of warnings and thresholds |
| `tips.*` | the tips table |

## Still open

- **OQ-SHELL-1:** victory conditions are decided in outline only: how scores are measured, what world domination is, and when they are judged.
- **OQ-SHELL-2:** the battle stop on a before-the-battle card is not yet adopted by warfare, which still describes a battle report after the month.
- **OQ-SHELL-3:** the main menu's first focus wording looks like a slip, and the tutorial's "New to Pocket Hegemony?" question has no place in the first run yet.
- **OQ-SHELL-4:** saves wants the Load screen grouped by campaign; this flow lists saves newest first.
- **OQ-SHELL-5:** the "save before the turn" this flow relies on needs mapping to the saves design's Resume save and orders journal.
- **OQ-SHELL-6:** settings says unanswered events can be passed with "End turn anyway"; this flow says they block. This flow's decision is taken here.
- **OQ-SHELL-7:** the End turn hold time on a controller (0.5 s here, 1 s in settings) and which button is "next".
- **OQ-SHELL-8:** six controller action sets here, three plus a text layer in settings.
- **OQ-SHELL-9:** whether a touch march order needs a confirm step.
- **OQ-SHELL-10:** whether long press only explains, or also opens an action menu and resets a setting.
- **OQ-SHELL-11:** other designs ask for more game menu entries, and ironman's Load entry is not restricted.
- **OQ-SHELL-12:** Settings from the title as an overlay or a full screen.
- **OQ-SHELL-13:** settings adds a third first-run question on the Big screen profile.
- **OQ-SHELL-14:** "AI temper" against "AI aggression", the allowed end date range, and the music-era option.
- **OQ-SHELL-15:** the tutorial's "Needs attention" against this Attention screen, and where mutes are stored.
- **OQ-SHELL-16:** unlock and purchase screens are not designed, and whether the free mobile tier keeps its ad is open.
- **OQ-SHELL-17:** no design defines the "successor rule" that can end a realm.
- **OQ-SHELL-18:** whether a left-handed layout moves the game menu button too.
- **OQ-SHELL-19:** today's build still locks iPads to landscape, so Tall is unreachable on tablets.
- **OQ-SHELL-20:** the Short wide threshold (500 px) and the settings Phone profile (600 px) do not match.
- **OQ-SHELL-21:** achievements are ironman-only, so most final results show none; whether the screen says so.
- **OQ-SHELL-22:** turn report, ledger, new game setup, input scheme, credits and privacy designs are referenced but not written.
- **OQ-SHELL-23:** the engine runs a whole month in one call today; it must stop at each of your battles and resume.
- **OQ-SHELL-24:** the battle viewer controls in settings and in this flow do not match.

## For developers

- Spec: [`domain/game-shell/spec.md`](https://github.com/grrts/pocket-hedgemony/blob/claude/domain-specs-bdd-ebdpmx/domain/game-shell/spec.md), requirement code **SHELL** (SHELL-001 to SHELL-128).
- Features: `domain/game-shell/features/` (boot-and-first-run, title-and-main-menu, new-campaign, load-and-loading, map-and-cards, realm-book, game-menu, turn-flow, attention, in-campaign-screens, campaign-end, interruptions, layout-by-shape, navigation-by-input, screen-list).
- Code: no domain module yet; it will live in `packages/engine/src/domain/game-shell/`. Today's client is in `apps/client`, and the phone landscape lock in `apps/mobile/scripts/landscape.mjs`.
