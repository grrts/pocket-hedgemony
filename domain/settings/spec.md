# Settings (SET)

## 1. Purpose and scope

The settings context decides which options the player gets, their values and defaults on each kind of device,
how they apply, where they are stored and synced, and how the Settings screen is built from data. In this
context **screens are the domain**: the Settings screen, its sections and rows.

In scope:
- Where Settings opens, the first-launch questions settings needs, the screen's layout, rows, reset and
  controller navigation.
- Device profiles (Phone, Tablet, Desktop, Steam Deck, Big screen), their detection and per-profile defaults.
- Storage: device and personal groups, the two settings files, sync through the account and store backups,
  reading rules, versioned migration.
- The line between settings and campaign rules (campaign rules shown read-only).
- Every row of Graphics, Audio, Gameplay, Controls (touch, mouse and keyboard, controller), Accessibility,
  Language, Account and cloud saves, Privacy, About; default key and controller layouts.
- Platform notes for Steam Deck, Steam Machine and TV, Steam Input, iOS and Android.
- The performance knobs and Battery saver.
- The `settings.yaml` format, and the tests the settings design asks for.

Not in scope (owned by …):
- What each autosave value means and the account and cloud mechanics → `saves`.
- Where Settings sits in the screen flow, Far layout and window shapes → `game-shell`.
- Campaign rules' meaning and choice at new game → `scenario-setup` (new game setup; no design yet).
- Music and sound behaviour behind the audio rows → `audio`.
- Tutorial hints and "Reset tutorial and hints" content → `onboarding`.
- Which achievements exist and the toast → `achievements`.
- Privacy rows' meaning and consent texts → privacy (List 3, item 7; no design yet).
- Restore purchases flow → store and unlock screens (no design yet).
- Full input scheme (List 2, item 9), accessibility checks (item 10), localisation (item 11): no designs yet.
- Map rendering cost behind Sharpness, Map detail and Animations → `map-presentation`.

## 2. Sources

Newest decision first.

1. `settings/settings-design.md` v2 (16 October 2026), §11 Decisions (phones landscape only; personal settings
   sync between devices; right-click gives orders on desktop with the touch flow always working; a plain font as
   an accessibility option, off by default; ambience off by default; no advisor after the tutorial), and §1–§10.
2. `settings/settings.example.yaml` (every setting in the §9 format).
3. `planning/gap-lists.md` "Decisions already made" (campaign end 31 August 1939 kept as one setting — here a
   campaign rule; business model) and List 2 item 4.
4. Read for seams only: `save-system/README.md` §2.3, §5.2, §5.3; `screen-flow/screen-flow-design.md` §3, §4.5,
   §4.6, §7, §8; `achievements/achievements-design.md` v1.1; `tutorial/tutorial-design.md` §6, §9, §12.
5. Today's code: `apps/client/src/map/mapView.ts` caps the device-pixel ratio at 2 (`Math.min(devicePixelRatio, 2)`);
   the diagnostics line shows in the client today.

## 3. Ubiquitous language

| Term | Meaning | Not to be confused with |
|---|---|---|
| Setting | One option in `settings.yaml` with an id `section.name` | A campaign rule |
| Row | A setting as shown on the Settings screen | A section |
| Section | One of the nine groups: Gameplay, Graphics, Audio, Controls, Accessibility, Language, Account and cloud saves, Privacy, About | A Realm book tab |
| Campaign rule | A choice made at new game and saved in the campaign (difficulty, AI aggression, fog, events, ironman, end date, maybe music era); shown read-only | A setting |
| Device profile | Phone, Tablet, Desktop, Steam Deck or Big screen; detected on first launch; gives every default | A window shape (game-shell) |
| Profile default | A setting's default for the current profile | A value the player changed |
| Changed dot | The small mark on a row whose value differs from the profile default | — |
| Device group | Settings that stay on one device (graphics, audio volumes, screen margins, deadzones, battery saver) | Personal group |
| Personal group | Settings that sync across the player's devices (gameplay, accessibility, language, key bindings, hint switches) | Device group |
| Applies | When a change takes effect: live (at once), view (next map redraw, no restart), restart | — |
| Platform marks | D desktop (Electron), M mobile (iOS and Android), W web, S Steam only | — |
| Bus | One of three audio volumes: Music, Effects, Ambience | A setting |
| Driven row | A row set by another row (`sets_when_on`); shows "Set by …" and can still be changed by hand | — |
| Alias | One switch shown in two sections (haptics, captions, reduced intensity, mono audio) | Two settings |
| Battery saver | The setting that moves the performance knobs to their cheap values at once | Reduced motion |
| Far layout | The game-shell layout the Big screen profile uses | — |
| Calibration screen | Four corner marks pulled in with the stick to set screen margins | — |
| Hold action | An action done by holding (End turn, the action menu); "press twice" when Hold actions is off | — |
| Action set | Steam Input's per-mode mapping (Map, Menu, Battle, plus a Text layer) | Game-shell's six action sets |

## 4. Domain model

### Aggregates

**SettingsCatalogue** (one, loaded from `settings.yaml`)
- Holds every setting definition: id, section, type (choice, toggle, slider, binding, action), options or
  min/max/step, default, `default_by_profile`, platforms, `hide_on`, `applies`, `sync`, `sets_when_on`,
  string keys. Order in the file is the order on screen.
- INV-SET-1: Every default is one of its setting's options (or within min–max).
- INV-SET-2: Every setting's name and description string keys exist in English.
- INV-SET-3: Every setting belongs to exactly one sync group; an alias has no group of its own.

**PlayerSettings** (per device: `settings-device.json`; per player: `settings-personal.json`)
- Holds: the values the player changed, the profile, the `version`.
- INV-SET-4: A value that is not one of its setting's options is never used; the profile default is used instead.
- INV-SET-5: An unknown key is dropped on read.
- INV-SET-6: A broken file never stops the game from starting.
- INV-SET-7: No setting is ever stored inside a campaign save, and no setting changes rules, balance or AI.

**CampaignRules** (owned by the campaign; read here)
- INV-SET-8: Campaign rules are read-only after new game.

### Entities and value objects

- **DeviceProfile** (value): Phone, Tablet, Desktop, Steam Deck, Big screen, with detection rules.
- **SettingValue** (value): choice | toggle | slider number | binding map | action.
- **KeyBinding** (value): action → up to two keys.
- **PadBinding** (value): per action set (map, menu, battle) action → input.

### Domain services

- **ProfileDetector**: picks the profile on first launch.
- **DefaultResolver**: profile default unless the player changed it; applies driven rows.
- **SettingsSync**: personal file through the account (newest change wins, setting by setting) or store backups.
- **SettingsMigrator**: steps between file versions.

## 5. Requirements

### 5.1 Principles

- SET-001: The settings system shall define every setting as one entry in `settings.yaml` (section, type, options, default per device profile, platforms, how it applies), so that adding or moving a setting or changing a default needs no code change, and the client shall build the Settings screen from that file in its order. [settings §1.1, §9]
- SET-002: When the game first launches, the settings system shall pick a device profile and take every default from it. [settings §1.2, §3]
- SET-003: When the player changes a setting, it shall apply at once with a preview behind the open panel and no Apply button; the only exception is Display mode, which asks "Keep this display?" and reverts after 15 seconds. [settings §1.3, §5.1; yaml `constants.display_revert_seconds`]
- SET-004: Every row shall work with touch, mouse, keyboard and controller: no slider that needs a drag, no row that needs hover; sliders shall step with the d-pad or arrow keys and accept a tap at a position. [settings §1.4]
- SET-005: When Settings is opened from the game menu in a campaign, nothing shall be lost, and closing it shall return to the exact map spot. [settings §1.5]
- SET-006: The settings system shall never change rules, balance or AI; anything that does is a campaign rule. [settings §1.6, §4.3]

### 5.2 Where Settings lives and the screen

- SET-007: The title screen's cog and its More menu shall open Settings as an overlay. [settings §2, §8; D-SET-10]
- SET-008: In a campaign, the game menu shall open Settings over the dimmed map, and Settings shall hold Campaign rules, a read-only section listing the rules the campaign was started with. [settings §2, §4.3; D-SET-11]
- SET-009: `Esc` or the Menu button shall open the game menu, from which Settings opens; on Steam, the Controller section shall have a button that opens Steam's own binding panel. [settings §2, §6.3]
- SET-010: When the game first launches, the settings system shall show no settings wizard, and only these questions when needed, each on one screen: the language, only when the system language isn't supported; crash reports and usage statistics, when the privacy design requires consent; and "Is this text easy to read?" with Smaller, Fine and Bigger, on the Big screen profile only. [settings §2; D-SET-9]
- SET-011: While the window is landscape (all devices), the Settings screen shall show the section list on the left, the section's rows on the right, and a one-line description of the focused row at the bottom. [settings §2.1]
- SET-012: While the window is tall (tablets in portrait, tall desktop windows), the Settings screen shall show the section list first, open a section's rows full screen on tap, and return with Back; phones are landscape only. [settings §2.1, §11.1]
- SET-013: The Settings screen shall show its sections in this order: Gameplay, Graphics, Audio, Controls, Accessibility, Language, Account and cloud saves, Privacy, About. [settings §2.1; yaml `sections`]
- SET-014: Each row shall show its name, current value, and a small "changed" dot when the value differs from the profile default. [settings §2.1]
- SET-015: When the player long-presses, right-clicks or presses X on a row, it shall reset to its profile default; each section shall end with Reset this section, and About shall have Reset all settings. [settings §2.1, §5.9]
- SET-016: With a controller, LB / RB shall switch sections, the d-pad shall move between rows, A shall change or open, d-pad left / right shall step a value, B shall go back, X shall reset the row, and Y shall show the long description. [settings §2.1]

### 5.3 Device profiles

- SET-017: The settings system shall detect the profile as: Phone on Capacitor with the screen's short side under 600 CSS px; Tablet on Capacitor with the short side 600 CSS px or more; Steam Deck when Steamworks `IsSteamRunningOnSteamDeck()`; Big screen when Steamworks `IsSteamInBigPictureMode()`, on a Steam Machine, or on a TV-class display; Desktop on Electron or web otherwise. [settings §3]
- SET-018: When the player changes Graphics → Device profile, the settings system shall reload every default that the player hasn't changed themselves. [settings §3, §5.1]
- SET-019: When a controller is connected on any profile, the settings system shall add controller prompts and focus outlines without switching the profile. [settings §3]
- SET-020: The settings system shall use these per-profile defaults (Phone / Tablet / Desktop / Steam Deck / Big screen): Interface scale Auto / Auto / 100 % / 112 % / 175 %; Text size Normal / Normal / Normal / Normal / Large; Display mode n/a / n/a / Windowed / Fullscreen / Fullscreen; Frame rate cap 60 / 60 / Display rate / 60 / 60; Battery saver Auto / Auto / Off / Auto / Off; Sharpness Balanced / Balanced / Native / Native / Native; Map detail Medium / High / High / High / High; Touch target size Large / Normal / n/a / Normal / n/a; Screen margins 0 / 0 / 0 / 0 / 5 % with the calibration screen offered once; Edge scrolling n/a / n/a / On in fullscreen / Off / Off; Controller cursor speed n/a / n/a / Medium / Medium / Slow; every other setting has one default for all profiles. [settings §3.1; yaml `default_by_profile`]
- SET-021: Where the profile is Big screen, the game shall use the game shell's Far layout: 175 % scale with Large text puts body text at about 35 px on a 1080p TV, and the 5 % margin keeps everything out of the overscan band. [settings §3.1, §6.2]
- SET-022: Where Interface scale is Auto, the settings system shall pick the largest scale step at which a 640 × 360 CSS-px safe layout, measured landscape, still fits (D-SET-15) (small phones 100 %, large ones up to 125 %). [settings §3.1; yaml `constants.interface_scale_auto_min_layout`]

### 5.4 Storage and sync

- SET-023: The settings system shall put each setting in one of two groups by its `sync` field: Device (graphics, audio volumes, screen margins, controller deadzones, battery saver), not synced; and Personal (gameplay, accessibility, language, key bindings, hint switches), synced across the player's devices. [settings §4.1, §11.2]
- SET-024: The settings system shall store the groups in two small JSON files, `settings-device.json` and `settings-personal.json`, each with a `version` number. [settings §4.2]
- SET-025: While the player is signed in to a Pocket Hegemony account, `settings-personal.json` shall sync through the account on every platform, across stores, the newest change winning setting by setting. [settings §4.2]
- SET-026: While the player is not signed in, each store's free backup shall carry the settings: Steam Auto-Cloud on `settings-personal.json` next to the save folder; iOS device iCloud backup restoring both files on a new device (no live sync, no iCloud entitlement); Android Auto Backup restoring both on a new phone (no live sync); none on the web. [settings §4.2]
- SET-027: The settings system shall keep the files at `app.getPath("userData")` on Electron and Steam, in Capacitor Preferences on iOS and Android, and in `localStorage` on the web. [settings §4.2]
- SET-028: When reading the files, the settings system shall drop unknown keys, fall back to the profile default for any value that isn't valid, and never stop the game from starting because of a broken file. [settings §4.2]
- SET-029: When a file's `version` goes up, the settings system shall run small migration steps that rename or convert keys. [settings §4.2]
- SET-030: The settings system shall never store settings inside a campaign save, so loading any save never changes anyone's settings; only the campaign rules travel with a save. [settings §4.2]
- SET-031: When the player moves from the free tier to the full game, their settings shall stay. [settings §4.2]

### 5.5 Campaign rules

- SET-032: The settings system shall treat as campaign rules, chosen on the new game screen, saved in the campaign and shown read-only under Settings → Campaign rules: difficulty, AI aggression (shown as "AI temper", D-SET-12), fog of war, historical or free events, ironman (achievements only count in ironman), the campaign end date (default 31 August 1939), and whether music eras follow the calendar or technology if that stays a choice. [settings §4.3; gap-lists campaign span]
- SET-033: The map mode menu's "Hide unexplored lands" toggle shall stay a display switch, since it only hides unknown lands visually; it would become a campaign rule only if fog ever hides information the AI uses. [settings §4.3, recommendation]

### 5.6 Graphics

- SET-034: Graphics shall offer Device profile (Phone, Tablet, Desktop, Steam Deck, Big screen; default detected; live; all platforms; device group). [settings §5.1]
- SET-035: Where the game runs on desktop, Graphics shall offer Display mode (Windowed, Fullscreen; Desktop default Windowed), Fullscreen being borderless at the display's own resolution, with no resolution list; a change asks "Keep this display?" and reverts after 15 s. [settings §5.1]
- SET-036: Graphics shall offer Interface scale (Auto, 75, 88, 100, 112, 125, 150, 175, 200 %; per-profile default), scaling panels, cards, icons and text together in steps of 1/8 to keep the pixel art on near-whole multiples. [settings §5.1]
- SET-037: Graphics shall offer Pixel scaling (Crisp, Smooth; default Crisp): Crisp snaps interface art to whole pixel multiples, possibly leaving a few pixels of margin; Smooth fills the space exactly and lets edges blur slightly. [settings §5.1]
- SET-038: Graphics shall offer Sharpness (Native, Balanced, Battery; per-profile default; applies on view): the map draws with up to the device ratio capped at 3 (Native), up to 2 (Balanced, today's code) or 1 (Battery) screen pixels per CSS pixel, the pixel art staying sharp at all three. [settings §5.1, §8]
- SET-039: Graphics shall offer Frame rate cap (30, 60, 120, Display rate; per-profile default); when nothing moves the map shall not redraw at all, whatever the cap. [settings §5.1]
- SET-040: Graphics shall offer Battery saver (Off, Auto, On; per-profile default): On sets a 30 fps cap, Battery sharpness, reduced animations, map redraws only on change, and fewer music voices, and never changes the AI or any result (X-15); Auto turns it on when the device reports battery saving (iOS Low Power Mode, Android Battery Saver, Steam Deck on battery under 20 %, or a browser that reports its battery under 20 % and not charging; D-SET-21). [settings §5.1, §6.1; yaml `sets_when_on`, `constants.battery_auto_threshold`; D-SET-1]
- SET-041: Graphics shall offer Map detail (Low, Medium, High; per-profile default; applies on view): Low has no 8 × 8 close-in tiles (stays at 4 × 4), no surf and no forest blending; Medium has 8 × 8 tiles and still water; High has everything. [settings §5.1]
- SET-042: Graphics shall offer Animations (Full, Reduced, Off; default Full) for water, marching columns, flags, smoke and battle playback motion; Off shows battle results as still frames; Accessibility's Reduced motion sets it to Reduced or lower. [settings §5.1]
- SET-043: Where the game runs on mobile, Graphics shall offer Keep screen awake during the AI turn (On, Off; default On). [settings §5.1]
- SET-044: Where the game runs on desktop or Steam, Graphics shall offer Screen margins (0–10 % in 1 % steps; default 0, Big screen 5 %) with a calibration screen of four corner marks pulled in with the stick, offered once on the Big screen profile. [settings §5.1, §3.1]
- SET-045: Graphics shall offer Show performance line (Off, FPS, Full diagnostics; default Off), behind which the existing diagnostics line (engine mode, round trip) moves. [settings §5.1, §8]

### 5.7 Audio

- SET-046: The settings system shall give audio three buses with their own volume: Music (music tracks and stingers), Effects (world and interface sounds: taps, the End turn chime, marching, battle, siege, coins) and Ambience (the ambience bed between peace tracks and under the map). [settings §5.2]
- SET-047: Audio shall offer Master volume (0–100 % in 5 % steps; default 80 %). [settings §5.2]
- SET-048: Audio shall offer Music volume (0–100 %; default 70 %). [settings §5.2]
- SET-049: Audio shall offer Music (On, Off; default On); Off fully suspends the synth. [settings §5.2]
- SET-050: Audio shall offer Music variety (My palette only, All palettes; default My palette only) and Zoom mix (On, Off; default On; the mix follows the zoom level). [settings §5.2]
- SET-051: Audio shall offer Effects volume (0–100 %; default 80 %). [settings §5.2]
- SET-052: Audio shall offer Interface sounds (On, Off; default On); Off silences taps and panel sounds but keeps world effects. [settings §5.2]
- SET-053: Audio shall offer Ambience (On, Off; default Off) and Ambience volume (0–100 %; default 50 %), the volume greyed out while Ambience is off. [settings §5.2, §11.5]
- SET-054: Where the game runs on mobile, Audio shall offer Haptics (On, Off; default On on phones) for light vibrations on the five moments in sound effects 8, never on desktop; the same switch shall also appear under Controls → Touch. [settings §5.2, §5.4]
- SET-055: Where the game runs on desktop or web, Audio shall offer Play sound in the background (On, Off; default Off); on mobile the game always goes silent in the background. [settings §5.2]
- SET-056: Where the game runs on mobile, Audio shall offer Let other apps' audio play (On, Off; default On; applies on restart): when On and other audio is playing at launch, game music starts muted and effects play over it, respecting the iPhone silent switch. [settings §5.2, §6.4]
- SET-057: Audio shall offer Sound captions (On, Off; default Off), which turn on by themselves when Master or every bus is set to 0 or off; off-screen sounds then show a small caption at the screen edge toward where they came from ("Battle at Troyes"). [settings §5.2]
- SET-058: Audio shall offer Reduced intensity (On, Off; default Off): no echo, priority 1 sounds 4 dB softer, no sharp attacks. [settings §5.2]
- SET-059: Audio shall offer Mono audio (On, Off; default Off). [settings §5.2]
- SET-060: Where a switch appears in two sections (Haptics in Audio and Controls; Sound captions, Reduced intensity and Mono audio in Audio and Accessibility), it shall be one setting, so changing it in one place changes it in the other. [settings §5.2, §5.5; yaml `alias_of`]

### 5.8 Gameplay

- SET-061: Gameplay shall offer Autosave (Every month, Every 6 months, Every 12 months (each January), Off; default Every 12 months), measured by the date and written at the end of the turn the month begins in; Off turns off rotating autosaves only, never the Resume save. [settings §5.3; saves §2.3; X-18]
- SET-062: Gameplay shall offer Autosaves kept per campaign (1, 3, 5; default 3). [settings §5.3; saves §2.3]
- SET-063: While the campaign is ironman, the Autosave and Autosaves kept rows shall be hidden. [settings §5.3; yaml `hide_when: ironman`]
- SET-064: Gameplay shall offer Confirm End turn (Off, When the Attention screen has lines, Always; default Off); when it asks, the question names the count of warnings ("3 warnings wait for you · Look · End turn anyway"); unanswered events block End turn and open the first one whatever this says. [settings §5.3; screen-flow §4.6; D-SET-2]
- SET-065: Gameplay shall offer Battle playback speed (1×, 2×, 4×; default 1×), one 4-hour step of a running player battle playing back in 0.5 s at 1×, 0.25 s at 2× and 0.125 s at 4×; battles never stop the turn and have no skip, which is not a setting. [settings §5.3; X-1]
- SET-066: Gameplay shall offer Open the turn report (Every turn, When something important happened, Never; default When something important happened), "important" being defined by the turn report design. [settings §5.3]
- SET-067: Gameplay shall offer Jump to events (On, Off; default On): the camera glides to an event's province when its card opens. [settings §5.3]
- SET-068: Gameplay shall offer Tooltips (On, Off; default On): mouse hover after the delay, touch long-press, controller Y on the focused item. [settings §5.3]
- SET-069: Where the game runs on desktop or web, Gameplay shall offer Tooltip delay (Instant, Short 0.3 s, Long 0.8 s; default Short). [settings §5.3]
- SET-070: Gameplay shall offer Detailed tooltips (On, Off; default Off), showing the full breakdown of each number ("+12 from the market, −3 from the war tax"). [settings §5.3]
- SET-071: Gameplay shall offer Tutorial hints (On, Off; default On) and the action "Reset tutorial and hints"; there shall be no advisor row, and muting a kind of warning happens on the Attention screen, not in Settings. [settings §5.3, §11.6]
- SET-072: Gameplay shall offer Achievement toasts (On, Off; default On); Off hides the toast while achievements still unlock. [settings §5.3]
- SET-073: Gameplay shall offer Place names (Historical, Modern; default Historical; applies on view): Historical names change with date and owner (Constantinople becomes Istanbul in Ottoman hands), Modern uses today's names; no historical name list exists (D-MAP-6), so both show today's region names (D-SET-17). [settings §5.3]
- SET-074: Gameplay shall offer Date format (16 October 1444, 16 Oct 1444, 16.10.1444, 1444-10-16; default follows the language). [settings §5.3]

### 5.9 Controls

- SET-075: Where touch is available (mobile, and touch screens on desktop), Controls shall offer Main hand (Right, Left; default Right), Left mirroring the action bar and the End turn button to the left side and moving the game menu button to the right, so the two stay at opposite corners. [settings §5.4; D-SET-16]
- SET-076: Controls shall offer Long-press time (Short 0.3 s, Medium 0.5 s, Long 0.8 s; default Medium), long-press only explaining (a tooltip); no action is long-press only, and resets are done with each section's Reset to defaults. [settings §5.4; D-SET-7]
- SET-077: Controls shall offer Double-tap to zoom (On, Off; default On) and Pan and zoom speed (Slow, Medium, Fast; default Medium). [settings §5.4]
- SET-078: Where the game runs on desktop or web, Controls shall offer Right-click gives orders (On, Off; default On): On selects an army with left-click and marches it with a right-click on a province; Off uses the touch flow (tap army, tap province, with no confirm step); the touch flow always works too. [settings §5.4, §11.3; D-SET-8]
- SET-079: Where the game runs on desktop or web, Controls shall offer Wheel zoom (Toward the cursor, Toward the centre; default Toward the cursor), Edge scrolling (On, Off, On in fullscreen; per-profile default) and Pan speed for keys and edge (Slow, Medium, Fast; default Medium). [settings §5.4]
- SET-080: Where the game runs on desktop or web, Controls shall let the player rebind any action with two keys per action, and a conflict shall ask "Also bound to X, swap?". [settings §5.4]
- SET-081: The default keys shall be: pan W A S D or arrow keys; zoom wheel, `+` / `−`, `Q` / `E`; End turn `Enter`; game menu `Esc`; map lenses 1–6 (realms, terrain, people, wealth, walls, food) `1`–`6` with `Tab` cycling; next / previous army `.` / `,`; next notification `N`; turn report `R`; jump to capital `Home`; ledger `L`. [settings §5.4; yaml `controls.keys`; D-SET-4]
- SET-082: When the player uses the End turn key, the turn shall end on a 0.5 s hold, or on a double press while Hold actions is off. [settings §5.4, §5.5]
- SET-083: Controls shall offer Button prompts (Auto, Xbox, PlayStation, Nintendo, Steam Controller, Steam Deck; default Auto following the last controller used); on Steam the glyphs shall come from Steam Input so they match the player's own bindings. [settings §5.4, §6.3]
- SET-084: Controls shall offer Confirm button (Bottom A / ✕, Right B / ○; default Bottom, Right when a Nintendo layout is detected), which swaps confirm and back. [settings §5.4]
- SET-085: Controls shall offer Cursor speed (Slow, Medium, Fast; per-profile default) for the map cursor on the left stick, and Cursor acceleration (On, Off; default On). [settings §5.4]
- SET-086: Controls shall offer Snap to provinces (Off, Light, Strong; default Light): the cursor slows over a province's centre and its armies, so a stick can hit small provinces in the Holy Roman Empire. [settings §5.4]
- SET-087: Controls shall offer Stick deadzone (5–30 %; default 12 %), not shown on Steam, where Steam Input owns it. [settings §5.4, §6.3]
- SET-088: Controls shall offer Vibration (Off, Light, Full; default Light). [settings §5.4]
- SET-089: Controls shall offer Gyro cursor (Off, While touching the right trackpad / stick, Always; default Off) for the Steam Controller, Deck and PlayStation controllers; on Steam it is set in Steam Input and the row hides; elsewhere it shows only where the platform reports motion. [settings §5.4, §6.3]
- SET-090: Controls shall offer Hold to open the action menu (Hold, Tap; default Hold). [settings §5.4]
- SET-091: Where the game runs on Steam, controller rebinding shall happen in Steam's own panel (`ShowBindingPanel`) through "Open Steam controller settings", and the in-game rebind list shall be hidden; off Steam (iOS, Android, web, non-Steam desktop), controllers shall come through the Gamepad API and the in-game rebind list and deadzone row shall appear. [settings §5.4, §6.3]
- SET-092: The default controller layout (Xbox names) shall be, for Map / Menus and panels / Battle view: left stick map cursor / move focus / unused; right stick pan / scroll / pan; LT / RT zoom out / in, previous / next page, slower / faster playback; A select / confirm / change standing orders; B deselect-back / back / leave the battle view; X action menu / reset row / order a retreat; Y info card / long description / commander's line; LB / RB previous / next army, previous / next tab, previous / next running battle; d-pad up / down cycle lenses, move focus, unused; d-pad left / right previous / next notification, step a value, unused; View turn report and hold 0.5 s End turn, unused, unused; Menu game menu / close the panel / game menu; left stick click jump to capital; right stick click recentre on the selection. [settings §5.4; yaml `controls.pad`; D-SET-3; X-1]
- SET-093: The official Steam Input configuration for the Steam Controller and Steam Deck shall add: right trackpad as a mouse-like cursor with momentum; left trackpad panning, with a click zooming to the province under the cursor; back grips (L4 / R4, L5 / R5) for previous / next notification and for the ledger and turn report; gyro off by default, offered as "aim while touching the right trackpad". [settings §5.4]
- SET-094: Where the game runs on Steam, it shall declare its actions in six action sets, Shell, Map, Card, Book, Modal and Battle, plus a Text layer for the on-screen keyboard, ship official configurations for the Steam Controller, Steam Deck, Xbox, PlayStation and Nintendo controllers, and take button prompts from `GetGlyphPNGForActionOrigin`. [settings §6.3; screen-flow §8.3; D-SET-5]

### 5.10 Accessibility

- SET-095: Accessibility shall offer Colour vision (Default, Red-weak (protan), Green-weak (deutan), Blue-weak (tritan), No colour; default Default), swapping the nation colours to a second assignment from the same 32-colour palette chosen so neighbours stay distinguishable for that vision type, and each lens's colour ramp to a safe ramp (blue to orange instead of red to green); No colour uses greys with patterns. [settings §5.5]
- SET-096: Accessibility shall offer Patterns on lenses (On, Off; default Off, On with No colour): hatching, dots and stripes by band so a lens reads without colour. [settings §5.5]
- SET-097: Accessibility shall offer Borders (Normal, Thick, High contrast; default Normal), High contrast drawing nation borders in black and white ink two art pixels wide. [settings §5.5]
- SET-098: Accessibility shall offer Text size (Normal, Large, Larger; per-profile default), body text 17, 20 and 24 px before interface scale; panels reflow and cards grow taller, not smaller. [settings §5.5]
- SET-099: Accessibility shall offer Font (Pixel, Plain; default Pixel): Plain replaces Pixelify Sans and the blackletter titles (Jacquard 12) with a clear OFL-licensed sans such as Atkinson Hyperlegible. [settings §5.5, §11.4]
- SET-100: Accessibility shall offer High contrast panels (On, Off; default Off): solid panel backgrounds instead of parchment texture, stronger outlines, no text over patterns. [settings §5.5]
- SET-101: Accessibility shall offer Touch target size (Normal, Large; per-profile default), Large raising every tap target from 44 to 56 points. [settings §5.5]
- SET-102: Accessibility shall offer Reduced motion (Follow system, On, Off; default Follow system): On gives camera cuts instead of glides, no screen shake, and drops Animations to Reduced; it reads `prefers-reduced-motion` and the OS setting. [settings §5.5]
- SET-103: Accessibility shall offer No flashes (On, Off; default Off), removing cannon flashes, lightning and white flashes on battle results. [settings §5.5]
- SET-104: Accessibility shall offer Hold actions (On, Off; default On); Off replaces every "hold to" (End turn, the action menu) with "press twice". [settings §5.5]
- SET-105: Accessibility shall offer Screen reader support (Follow system): menus, panels and cards carry labels for VoiceOver, TalkBack and Narrator; the map itself is not narrated, but the selected province's card is; the scope is set by the accessibility design. [settings §5.5]

### 5.11 Language

- SET-106: Language shall offer Language (the launch list; default the system language if supported, else English), applying live to interface text, with event and catalogue text reloading on the next panel open. [settings §5.6]
- SET-107: Language shall offer Number format (Follows the language, 1,000.5, 1.000,5, 1 000,5; default Follows the language). [settings §5.6]
- SET-108: The Language list shall include a language in a non-Latin script only once the localisation design has a font for it, since Pixelify Sans covers Latin only. [settings §5.6]

### 5.12 Account, privacy and about

- SET-109: Account and cloud saves shall offer Account (Sign in / Create account; when signed in, the email and Sign out; default signed out), never as a wall before playing; the Load screen's "Sign in to sync" prompt opens the same flow. [settings §5.7]
- SET-110: While signed in, Account and cloud saves shall offer Cloud saves (On, Off; default On once signed in), syncing saves and personal settings. [settings §5.7]
- SET-111: While signed in, Account and cloud saves shall offer Sync on Wi-Fi only (On, Off; default Off) for metered connections. [settings §5.7]
- SET-112: While signed in, Account and cloud saves shall list the signed-in devices, each with Sign out. [settings §5.7]
- SET-113: While signed in, Account and cloud saves shall offer Delete account and saves, with a confirmation, also reachable from Privacy. [settings §5.7]
- SET-114: Privacy shall offer Send crash reports and Send anonymous usage statistics (On, Off; asked on first launch), and, in the free mobile tier only if the ad stays, Ad consent, which opens the consent form again. [settings §5.8]
- SET-115: About shall show the version and build number, Restore purchases (opening the store screen's restore flow, which Apple requires to be reachable), Credits and licences, Reset all settings, and Copy diagnostics (putting the diagnostics line and settings on the clipboard for support). [settings §5.9]

### 5.13 Platform notes

- SET-116: Where the profile is Steam Deck, body text shall be about 19 px at 112 % (17 px at 100 %) at 1280 × 800, the game shall start fullscreen with Deck glyphs, Settings shall need no mouse or keyboard anywhere, and naming a save shall call Steam's floating gamepad keyboard (`ShowFloatingGamepadTextInput`). [settings §6.1]
- SET-117: Where the profile is Big screen, the game shall use 175 % interface scale and Large text (the same physical size at 4K, since scale works in CSS pixels), a slow cursor, a 5 % screen margin with the calibration screen, and focus outlines always on. [settings §6.2]
- SET-118: The game shall always respect the safe areas (notch, home bar, camera hole); this is not a setting. [settings §6.4]
- SET-119: Where the game runs on Android, the system back gesture shall behave like B / `Esc`: it closes the top panel, then opens the game menu, and never quits the game from the map without asking. [settings §6.4]
- SET-120: Where the game runs on iOS, the silent switch and "Let other apps' audio play" shall use the native "ambient" audio session. [settings §6.4]

### 5.14 Performance knobs

- SET-121: The settings system shall treat Sharpness, Frame rate cap, Map detail and Animations as the four performance knobs (cheapest: Battery 1×, 30, Low, Off; phone default: Balanced ≤ 2×, 60, Medium, Full; richest: Native ≤ 3×, Display rate, High, Full), and Battery saver shall move all of them at once; the shared performance targets shall be measured at the phone defaults and checked once with Battery saver on. [settings §7]

### 5.15 `settings.yaml` format

- SET-122: Each setting entry shall carry `id` (`section.name`, also the key in the settings files), `section`, `type` (choice, toggle, slider, binding, action), `options`, `default`, `default_by_profile`, `platforms` (where the row shows), `hide_on` (for rows Steam Input owns), `applies` (live, view, restart), `sync` (device, personal) and optionally `sets_when_on`. [settings §9; yaml]
- SET-123: A `slider` setting shall add `min`, `max` and `step`, and an `action` setting shall be a button such as Reset or Restore purchases. [settings §9]
- SET-124: Where a setting drives others through `sets_when_on` (Battery saver, Reduced motion, Colour vision "No colour"), each driven row shall show "Set by <setting>" and can still be changed by hand. [settings §9]
- SET-125: Setting names and descriptions shall be string-table keys (`settings.<id>.name`, `settings.<id>.desc`), never text in the file. [settings §9]

### 5.16 Testing

- SET-126: A smoke test (extending `pnpm --filter @ph/client smoke`) shall open Settings on each profile, step through every row with the keyboard only, and fail if focus is ever lost or a row can't be reached. [settings §10]
- SET-127: A schema test shall check that `settings.yaml` loads, every default is one of its options, and every string key exists in English. [settings §10]
- SET-128: The accessibility checks shall include screenshots of the map in each Colour vision mode run through a colour-blindness simulator. [settings §10]
- SET-129: On a Steam Deck, every row shall be reachable with the built-in controls and its text legible at arm's length. [settings §10]
- SET-130: Each Colour vision mode shall keep the map's season palettes (snow, spring green, summer base, autumn gold, wet season) readable: the season palettes are shifted with the mode's ramp, and No colour shows seasons by tile patterns; no setting turns the seasons off. [X-17; X-15]

### 5.17 How the player uses it

- SET-131: Gameplay shall offer Turn playback speed (1×, 2×, 4×; default 1×), one day of the week playing back on the map after End turn in 0.3 s at 1×, 0.15 s at 2× and 0.075 s at 4×; it changes only how fast the week is shown, never what happens in it. [X-19; D-SET-20; design `day_seconds_at_1x`]
- SET-132: Settings shall open from the game menu (the three-line button at the top left of the map's top bar, or Esc), from the cog in the side tools and from the start screen's Settings button, as one full screen over the dimmed map, and close back to where the player was with nothing lost; the Sound card stays the quick way to the volumes while playing (AUD-138), and both change the same settings. [X-19; SET-005, SET-007, SET-008]
- SET-133: Each section shall be one subject: Gameplay holds Tutorial hints with "Reset tutorial and hints" and Achievement toasts, saving (Autosave, Autosaves kept) and playback speed (Turn playback speed, Battle playback speed); Graphics holds Battery saver with the knobs it drives (Frame rate cap, Sharpness, Animations); Audio holds the volumes and switches; Accessibility holds Text size. Until a row's effect is built in the client, the client shall leave that row out rather than show a setting that does nothing, and a section with no built rows shall not be listed. [X-19; D-SET-22]
- SET-134: A row shall show its name, its changed dot, its control and one line saying what it does, under the name, so nothing needs hover; a choice of up to four values shall be a row of buttons, a slider shall take a tap at a position and step by 5, a toggle shall be one On/Off button, and every control shall be at least 44 points high; a long press on a row's name, or the section's Reset this section button, shall put it back to its default. [X-19; SET-004, SET-014, SET-015]
- SET-135: A row driven by Battery saver shall say "Set by Battery saver" under its name, so the state of the battery saving shows on the rows it changes. [X-19; SET-124]
- SET-136: On a phone in landscape the Settings screen shall show the section list as a column on the left and the rows on the right, inside the safe areas, scrolling the rows and never the page; in a tall window it shall show the sections first and open one full screen with Back, as SET-011 and SET-012 say. [X-19; SET-011, SET-012]
- SET-137: Text size shall grow the text of the cards, menus, alerts and Settings (17, 20 and 24 px body text), the top bar keeping its one thin strip so the map keeps the screen, the cards reflowing inside their own width so they grow taller, never wider; the map's own labels are not text size's (map presentation). [X-19; SET-098]

## 6. Commands

| Command | Who issues it | Preconditions | Result | Events emitted |
|---|---|---|---|---|
| ChangeSetting | player | Row shown on this platform and not hidden | Value stored in its group's file, applied live / on view / on restart | `SettingChanged` |
| ResetRow | player | Row differs from profile default | Profile default restored | `SettingChanged` |
| ResetSection / ResetAll | player | — | Every row of the section / all rows back to profile defaults | `SettingChanged` (many) |
| ChangeDeviceProfile | player | — | Untouched defaults reloaded from the new profile | `DeviceProfileChanged` |
| ConfirmDisplayMode | player | Display mode changed | Kept; without it, reverts after 15 s | `SettingChanged` |
| RebindKey | player | Desktop or web | Key bound; conflict asks to swap | `SettingChanged` |
| RebindPad | player | Not on Steam | Button bound | `SettingChanged` |
| OpenSteamBindings | player | On Steam | Steam's binding panel opens | — |
| CalibrateMargins | player | Desktop/Steam | Screen margins set | `SettingChanged` |
| ResetTutorialAndHints | player | — | Tutorial hints reset (onboarding) | `TutorialHintsReset` |
| SignIn / SignOut / SignOutDevice / DeleteAccount | player | — | Passed to saves | (saves events) |
| RestorePurchases | player | Mobile or desktop | Store restore flow opens | — |
| CopyDiagnostics | player | — | Diagnostics line and settings on the clipboard | — |
| DetectProfile | system | First launch | Profile chosen | `DeviceProfileChanged` |
| ApplyBatteryAuto | system | Battery saver Auto; device reports battery saving | Battery saver values applied | `SettingChanged` |

Settings commands never touch the simulation (SET-006), so they are not game orders and are not sent to other players.

## 7. Domain events

| Event | When | Payload | Consumed by (context) |
|---|---|---|---|
| `SettingChanged` | Any value changes | id, value, group | game-shell (layout, prompts, End turn confirmation, turn report), audio (volumes, buses, captions), map-presentation (sharpness, detail, animations, colour vision, borders, place names), onboarding (hints, tooltips), achievements (toasts), saves (autosave, Wi-Fi only) |
| `DeviceProfileChanged` | Profile detected or changed | profile | game-shell (Far layout), all of the above |
| `PersonalSettingsSynced` | Sync brought newer personal values | ids | all consumers above |
| `TutorialHintsReset` | Reset tutorial and hints | — | onboarding |

## 8. Policies (reactions to other contexts)

- When `saves` reports the player signed in, show the signed-in rows and sync `settings-personal.json` through the account.
- When `saves` reports sign-out or account deletion, hide the signed-in rows.
- When a campaign is loaded that is ironman (`saves` / campaign rules), hide Autosave and Autosaves kept.
- When the device reports battery saving and Battery saver is Auto, apply Battery saver; on Steam Deck when on battery under 20 %.
- When the OS reports reduced motion and Reduced motion is Follow system, apply it.
- When Master or every bus is set to 0 or off, turn Sound captions on.
- When a controller connects, add prompts and focus outlines; when a Nintendo layout is detected, default Confirm button to Right.
- When the purchase state changes (free tier to full game), keep all settings.

## 9. Each turn

None. Settings are read when they apply; Battery saver's smaller worker budget and Keep screen awake act during the AI turn but do not take part in its order.

## 10. Configuration

Settings are themselves configuration (`settings.yaml`, example `settings/settings.example.yaml`). The table lists
the constants and the numbers inside rows.

| Key | Meaning | Value in the design | Placeholder? | Config file |
|---|---|---|---|---|
| `constants.battery_auto_threshold` | Steam Deck battery level that turns Battery saver Auto on | 0.20 | no | settings.yaml |
| `constants.display_revert_seconds` | Display mode revert | 15 | no | settings.yaml |
| `constants.interface_scale_auto_min_layout` | Layout that must fit for Auto scale | 360 × 640 CSS px | no | settings.yaml |
| `graphics.interface_scale.options` | Scale steps | auto, 75, 88, 100, 112, 125, 150, 175, 200 | no | settings.yaml |
| `graphics.sharpness` | Pixel ratio caps | Native ≤ 3, Balanced ≤ 2, Battery 1 | no | settings.yaml |
| `graphics.battery_saver.sets_when_on` | Battery saver values | frame_cap 30, sharpness battery, animations reduced (`engine.worker_budget` dropped, D-SET-1) | no | settings.yaml |
| `graphics.screen_margins` | Margin slider | 0–10 %, step 1, Big screen 5 | no | settings.yaml |
| `audio.master` | Master | 0–100 step 5, default 80 | no | settings.yaml |
| `audio.music_volume` | Music | default 70 | no | settings.yaml |
| `audio.effects_volume` | Effects | default 80 | no | settings.yaml |
| `audio.ambience_volume` | Ambience | default 50 | no | settings.yaml |
| (sound effects) | Interface sounds level | about 6 dB under the music | sound effects design | sfx config |
| (sound effects) | Reduced intensity | priority 1 sounds 4 dB softer | sound effects design | sfx config |
| `gameplay.tooltip_delay` | Delays | instant, short 0.3 s, long 0.8 s | no | settings.yaml |
| `gameplay.turn_speed` | Turn playback | 1, 2, 4 (one day 0.3 s at 1×) | yes (`day_seconds_at_1x`) | settings.json |
| `gameplay.battle_speed` | Playback | 1, 2, 4 (one 4-hour step 0.5 s at 1×) | yes (`battle_step_seconds_at_1x`) | settings.json |
| `controls.long_press` | Long-press times | 0.3 / 0.5 / 0.8 s | no | settings.yaml |
| `controls.keys.end_turn` | End turn key | Enter, hold 0.5 s | no | settings.yaml |
| `controls.keys` slots | Keys per action | 2 | no | settings.yaml |
| `controls.deadzone` | Stick deadzone | 5–30 %, default 12 | no | settings.yaml |
| `controls.pad.map.end_turn.hold_seconds` | Controller End turn hold | 1.0 | no | settings.yaml |
| `accessibility.text_size.body_px` | Body text | 17 / 20 / 24 px | no | settings.yaml |
| `accessibility.touch_targets.points` | Tap targets | 44 / 56 points | no | settings.yaml |
| (colour vision) | Palette | second assignment from the same 32-colour palette | no | not in settings.yaml |
| (Steam Deck) | Body text on Deck | ~19 px at 112 % at 1280 × 800 | check against Valve | — |
| (Big screen) | Body text on 1080p TV | ~35 px at 175 % + Large | check against Valve's post | — |

## 11. Seams

| Other context | Direction | Pattern | What crosses |
|---|---|---|---|
| saves | partnership | Partnership | Autosave values (saves defines them, settings shows them), Cloud saves row, Wi-Fi only, account, devices, delete account; personal settings ride the account sync and store backups |
| game-shell | downstream | Customer–Supplier | Where Settings opens, overlay over the game menu, Confirm End turn, turn report opening, Far layout for Big screen, interface scale and text size, prompts, hold actions, main hand, Android back |
| audio | downstream | Customer–Supplier | Buses and volumes, music on/off, variety, zoom mix, interface sounds, ambience, haptics, captions, reduced intensity, mono, background play, mixing with other apps |
| map-presentation | downstream | Customer–Supplier | Sharpness, map detail, animations, frame cap, colour vision ramps and nation colours, borders, patterns, place names, parchment fog display switch |
| onboarding | downstream | Customer–Supplier | Tutorial hints, Reset tutorial and hints, tooltips and their delay, detailed tooltips; reduced motion respected by the spotlight |
| achievements | downstream | Customer–Supplier | Achievement toasts switch; "achievements only count in ironman" (campaign rule) |
| scenario-setup | upstream | Customer–Supplier | Campaign rules list shown read-only |
| time-and-turns | downstream | Customer–Supplier | Keep screen awake during the AI turn; battle playback speed; nothing touches the AI's budget (D-SET-1) |
| warfare | downstream | Conformist | Battle playback speed; battle view controls; no-flashes and animation levels in battle |
| events | downstream | Conformist | Jump to events |

Changes the settings design asks of other designs (§8), and whether they were taken in:
- Music 7.3: its settings list lives in settings §5.2; era following technology becomes a campaign rule if it stays a choice — open on the music side ; it stays a campaign rule (D-SET-12).
- Saves: settings never inside a save (consistent with saves §1.6); personal settings ride account sync and store backups; Auto-Cloud adds `settings-personal.json` — a request to saves to add it to the synced set (D-SET-13). Autosave values and the Cloud saves row taken in as written (consistent).
- Sound effects: taken in as written.
- Screen flow: Settings overlay from the More menu, the cog and the game menu (adopted); Big screen uses Far (adopted).
- Tutorial 12: the advisor row dropped (adopted: tutorial v3 has no advisor after the tutorial).
- Achievements: toast switch (adopted).
- New game setup: the campaign rules list — no design yet.
- Client code: diagnostics line behind "Show performance line"; the device-pixel-ratio cap of 2 in `mapView.ts` becomes Sharpness — not yet done in code.

## 12. AI

None directly. Settings never change AI (SET-006). Battery saver gives the AI turn a smaller worker budget, which
the design says makes turns slower; it no longer touches the AI's budget, which is counted in work steps and the same everywhere (D-SET-1).

## 13. Decisions and open questions

The settings design said "No open questions remain"; these were found against it and its neighbours and are now decided.

- **D-SET-1** (was OQ-SET-1) Battery saver and the AI budget: Battery saver only lowers the frame rate, animation and music voices; the AI's budget is counted in work steps and is the same on every setting, and `engine.worker_budget` is dropped. X-15 settles it.
- **D-SET-2** (was OQ-SET-2) Unanswered events at End turn: unanswered events block End turn and the button opens the first one; the confirmation question names only warnings. Screen flow, decided later, wins.
- **D-SET-3** (was OQ-SET-3) Controller End turn: the View button held 0.5 s ends the turn, like Enter on the keyboard; there is no extra Attention button, Attention is opened from the End turn question's "Look". Screen flow's half second is later, and no new button is added.
- **D-SET-4** (was OQ-SET-4) Zoom keys: the yaml binding governs: `+` or `E` zooms in, `-` or `Q` zooms out. The data is what the game reads.
- **D-SET-5** (was OQ-SET-5) Action sets: screen flow's six sets (Shell, Map, Card, Book, Modal, Battle) plus Text. Screen flow is the later design.
- **D-SET-6** (was OQ-SET-6) Platform marks: the yaml's platform lists govern every row (Screen margins desktop only, Touch target size on mobile and desktop, Restore purchases on mobile and desktop, Haptics on for mobile, tablets included). The data is what the game reads.
- **D-SET-7** (was OQ-SET-7) Long press: a long press only explains; resetting is done with each section's Reset to defaults, and the per-row long-press reset is dropped. Screen flow's rule is the simpler one.
- **D-SET-8** (was OQ-SET-8) March order: tap an army, then a province, with no confirm step. Screen flow is later and simpler.
- **D-SET-9** (was OQ-SET-9) First-launch questions: the language card only when the system language is not supported (otherwise the game uses it, with no card), the consent card, and on Big screen the text readability card; "New to Pocket Hegemony?" belongs to the tutorial. Each card shows only when needed.
- **D-SET-10** (was OQ-SET-10) Settings from the title: Settings opens as an overlay from the title's cog and from More. Settings §8 and screen flow agree on an overlay.
- **D-SET-11** (was OQ-SET-11) Pause menu: there is no pause menu; Settings opens from the game menu, and Campaign rules show read-only as a section inside Settings. Screen flow's game menu is the later design, and nothing is added to it.
- **D-SET-12** (was OQ-SET-12) Campaign rules list: the rule keeps the key `aiAggression` and is shown as "AI temper"; the music-era rule stays a campaign rule; all campaign rules are saved with the campaign. Screen flow's label is later.
- **D-SET-13** (was OQ-SET-13) Personal settings sync: `settings-personal.json` syncs as its own small file and holds a change time per setting, so the newest change wins setting by setting (a request to saves to add it to the synced set). It states the needed timestamps without a new mechanic.
- **D-SET-14** (was OQ-SET-14) Profiles and shapes: the Phone profile is short side under 600 CSS px; game-shell's Short wide shape is a separate layout test; Big screen is the platform's TV mode flag (Steam Big Picture or a console TV mode). Each rule keeps its own job.
- **D-SET-15** (was OQ-SET-15) Auto interface scale: the safe layout box is 640 × 360 CSS px, measured landscape. Phones are landscape only.
- **D-SET-16** (was OQ-SET-16) Main hand Left: End turn moves to the left corner and the game menu button moves to the right, so they stay at opposite corners. It keeps screen flow's rule.
- **D-SET-17** (was OQ-SET-17) Place names: the setting stays as designed, and since no historical name list is added (D-MAP-6), both options show today's region names. Nothing new is added.
- **OQ-SET-18** (release task) Owner designs missing: privacy and consent rows, store screens and Restore purchases, and the Big screen and Deck numbers need a store and Valve Steamworks check.
- **D-SET-19** (was OQ-SET-19) Hint switches and mutes: tutorial progress and Needs attention mutes go into the save, hint switches stay personal settings, and "Reset tutorial and hints" clears both. X-16 settles it.
- **D-SET-20** Turn playback speed is a Gameplay row of its own beside Battle playback speed: the week's playback after End turn is the speed players notice most, and like Battle playback speed it only changes how fast the week is shown (X-15). Leroy asked for a speed setting (17 October 2026 brief).
- **D-SET-21** On the web and on phones without a low-power signal the game can read, Auto counts a battery under the 20 % threshold and not charging as the device saving battery, as for the Steam Deck. Same threshold, one rule.
- **D-SET-22** The client builds the Settings screen from settings.json but lists only the rows whose effect it has built, so no row promises something the game does not do; rows join as their effects are built. A row that does nothing is a poor experience (X-19).

## 14. Traceability

| Requirement | Feature file | Scenario |
|---|---|---|
| SET-001 | settings-data.feature | The screen is built from the file |
| SET-001 | settings-data.feature | Changing a default needs no code change |
| SET-002 | device-profiles.feature | Profile detection on first launch |
| SET-003 | settings-screen.feature | Changes apply at once with a preview |
| SET-003 | settings-screen.feature | Display mode asks to keep |
| SET-004 | settings-screen.feature | Every row works with every input |
| SET-005 | settings-screen.feature | Settings mid-campaign loses nothing |
| SET-006 | campaign-rules.feature | Campaign rules are read-only in the campaign |
| SET-006 | campaign-rules.feature | No setting changes the simulation |
| SET-007 | settings-screen.feature | Settings from the title screen |
| SET-008 | settings-screen.feature | Settings from the game menu, with Campaign rules inside |
| SET-009 | settings-screen.feature | Shortcuts into Settings |
| SET-009 | settings-screen.feature | Steam's own binding panel |
| SET-010 | settings-screen.feature | First-launch questions only when needed |
| SET-010 | settings-screen.feature | Text readability on the Big screen |
| SET-011 | settings-screen.feature | Layout by orientation |
| SET-012 | settings-screen.feature | Layout by orientation |
| SET-013 | settings-screen.feature | Section order |
| SET-014 | settings-screen.feature | The changed dot |
| SET-015 | settings-screen.feature | Resetting a row |
| SET-015 | settings-screen.feature | Resetting a section or everything |
| SET-016 | settings-screen.feature | Controller navigation |
| SET-017 | device-profiles.feature | Profile detection on first launch |
| SET-018 | device-profiles.feature | Changing profile reloads only untouched defaults |
| SET-019 | device-profiles.feature | A controller doesn't switch the profile |
| SET-020 | device-profiles.feature | Defaults by profile |
| SET-020 | device-profiles.feature | The calibration screen is offered once on the Big screen |
| SET-021 | device-profiles.feature | Big screen uses the Far layout |
| SET-022 | device-profiles.feature | Auto interface scale |
| SET-023 | storage-and-sync.feature | Two groups |
| SET-024 | storage-and-sync.feature | Two files with versions |
| SET-025 | storage-and-sync.feature | Signed in, personal settings sync setting by setting |
| SET-026 | storage-and-sync.feature | Not signed in, the store backup carries settings |
| SET-027 | storage-and-sync.feature | Not signed in, the store backup carries settings |
| SET-028 | storage-and-sync.feature | Reading a damaged or old file |
| SET-029 | storage-and-sync.feature | File versions migrate |
| SET-030 | storage-and-sync.feature | Loading a save never changes settings |
| SET-031 | storage-and-sync.feature | Buying the full game keeps settings |
| SET-032 | campaign-rules.feature | Campaign rules are read-only in the campaign |
| SET-032 | campaign-rules.feature | The music era rule is a campaign rule |
| SET-033 | campaign-rules.feature | Parchment fog stays a display switch |
| SET-034 | graphics.feature | Device profile row |
| SET-035 | graphics.feature | Display mode only on desktop |
| SET-035 | graphics.feature | Fullscreen is borderless at the display's resolution |
| SET-035 | settings-screen.feature | Display mode asks to keep |
| SET-036 | graphics.feature | Interface scale |
| SET-037 | graphics.feature | Pixel scaling |
| SET-038 | graphics.feature | Sharpness |
| SET-039 | graphics.feature | Frame rate cap and still maps |
| SET-040 | graphics.feature | Battery saver On |
| SET-040 | graphics.feature | Battery saver Auto |
| SET-041 | graphics.feature | Map detail |
| SET-042 | graphics.feature | Animations |
| SET-043 | graphics.feature | Keep screen awake on mobile |
| SET-044 | graphics.feature | Screen margins and calibration |
| SET-044 | graphics.feature | Screen margins range |
| SET-045 | graphics.feature | Performance line |
| SET-046 | audio.feature | Three buses |
| SET-047 | audio.feature | Volume defaults |
| SET-048 | audio.feature | Volume defaults |
| SET-049 | audio.feature | Music off suspends the synth |
| SET-050 | audio.feature | Music variety and zoom mix defaults |
| SET-051 | audio.feature | Volume defaults |
| SET-052 | audio.feature | Interface sounds off keeps world effects |
| SET-053 | audio.feature | Volume defaults |
| SET-053 | audio.feature | Ambience off by default, its volume greyed while off |
| SET-054 | audio.feature | Haptics on phones only, one switch in two places |
| SET-055 | audio.feature | Sound in the background |
| SET-056 | audio.feature | Other apps' audio |
| SET-056 | audio.feature | Other apps' audio applies on restart |
| SET-057 | audio.feature | Captions turn on when sound is silenced |
| SET-058 | audio.feature | Reduced intensity |
| SET-059 | audio.feature | One switch in Audio and Accessibility |
| SET-060 | audio.feature | Haptics on phones only, one switch in two places |
| SET-060 | audio.feature | One switch in Audio and Accessibility |
| SET-061 | gameplay.feature | Autosave rows |
| SET-061 | gameplay.feature | Autosave off keeps the Resume save |
| SET-062 | gameplay.feature | Autosave rows |
| SET-063 | gameplay.feature | Ironman hides the autosave rows |
| SET-064 | gameplay.feature | Confirm End turn |
| SET-065 | gameplay.feature | Battle playback speed |
| SET-066 | gameplay.feature | Open the turn report |
| SET-067 | gameplay.feature | Jump to events |
| SET-068 | gameplay.feature | Tooltips by input |
| SET-069 | gameplay.feature | Tooltips by input |
| SET-069 | gameplay.feature | Tooltip delay is desktop only |
| SET-070 | gameplay.feature | Detailed tooltips |
| SET-071 | gameplay.feature | Tutorial hints and no advisor |
| SET-072 | gameplay.feature | Achievement toasts off |
| SET-073 | gameplay.feature | Place names |
| SET-073 | gameplay.feature | Until the name list exists |
| SET-074 | gameplay.feature | Date format |
| SET-075 | controls.feature | Main hand |
| SET-076 | controls.feature | Long-press time |
| SET-077 | controls.feature | Touch defaults |
| SET-078 | controls.feature | Right-click gives orders |
| SET-079 | controls.feature | Mouse and keyboard defaults |
| SET-080 | controls.feature | Rebinding with a conflict |
| SET-081 | controls.feature | Default keys |
| SET-082 | controls.feature | The End turn key |
| SET-083 | controls.feature | Button prompts |
| SET-084 | controls.feature | Confirm button |
| SET-084 | controls.feature | Swapping confirm and back |
| SET-085 | controls.feature | Controller defaults |
| SET-086 | controls.feature | Controller defaults |
| SET-086 | controls.feature | Snap to provinces |
| SET-087 | controls.feature | Rows Steam Input owns |
| SET-088 | controls.feature | Controller defaults |
| SET-089 | controls.feature | Rows Steam Input owns |
| SET-089 | controls.feature | Gyro cursor default |
| SET-090 | controls.feature | Controller defaults |
| SET-091 | controls.feature | Rows Steam Input owns |
| SET-091 | settings-screen.feature | Steam's own binding panel |
| SET-092 | controls.feature | Default controller layout |
| SET-093 | controls.feature | Steam Controller and Deck extras |
| SET-094 | controls.feature | Steam Input action sets |
| SET-095 | accessibility.feature | Colour vision |
| SET-096 | accessibility.feature | No colour turns patterns on |
| SET-097 | accessibility.feature | Borders |
| SET-098 | accessibility.feature | Text size |
| SET-099 | accessibility.feature | Font |
| SET-100 | accessibility.feature | High contrast panels |
| SET-101 | accessibility.feature | Touch target size |
| SET-102 | accessibility.feature | Reduced motion |
| SET-103 | accessibility.feature | No flashes |
| SET-104 | accessibility.feature | Hold actions |
| SET-104 | controls.feature | The End turn key |
| SET-105 | accessibility.feature | Screen reader support |
| SET-106 | language-account-about.feature | Default language |
| SET-106 | language-account-about.feature | Language applies live |
| SET-107 | language-account-about.feature | Number format |
| SET-108 | language-account-about.feature | Scripts need a font first |
| SET-109 | language-account-about.feature | Account row |
| SET-109 | language-account-about.feature | The Load screen prompt opens the same flow |
| SET-110 | language-account-about.feature | Cloud rows once signed in |
| SET-110 | language-account-about.feature | Cloud saves carries personal settings |
| SET-111 | language-account-about.feature | Cloud rows once signed in |
| SET-112 | language-account-about.feature | Devices |
| SET-113 | language-account-about.feature | Delete account and saves |
| SET-114 | language-account-about.feature | Privacy rows |
| SET-114 | language-account-about.feature | Privacy defaults are asked |
| SET-115 | language-account-about.feature | About |
| SET-115 | language-account-about.feature | Version on About |
| SET-116 | platform-notes.feature | Steam Deck defaults |
| SET-116 | platform-notes.feature | Naming a save on the Deck |
| SET-117 | platform-notes.feature | Big screen at 1080p and 4K |
| SET-118 | platform-notes.feature | Safe areas are not a setting |
| SET-119 | platform-notes.feature | Android back gesture |
| SET-120 | audio.feature | Other apps' audio |
| SET-120 | platform-notes.feature | The iPhone silent switch |
| SET-121 | platform-notes.feature | Performance knobs and Battery saver |
| SET-121 | platform-notes.feature | Performance targets are measured at phone defaults |
| SET-122 | settings-data.feature | An entry's fields |
| SET-122 | settings-data.feature | Rows hide where Steam Input owns them |
| SET-123 | settings-data.feature | Slider and action entries |
| SET-124 | accessibility.feature | No colour turns patterns on |
| SET-124 | settings-data.feature | Driven rows can still be changed |
| SET-125 | settings-data.feature | Names come from string tables |
| SET-126 | settings-data.feature | Keyboard-only smoke test on every profile |
| SET-127 | settings-data.feature | Schema test |
| SET-128 | settings-data.feature | Colour vision screenshots |
| SET-129 | settings-data.feature | Steam Deck check |
| SET-130 | accessibility.feature | Season palettes stay readable in every colour vision mode |
| SET-131 | gameplay.feature | Turn playback speed |
| SET-132 … SET-137 | — | Client screen; checked by apps/client/scripts/saves-shots.mjs |
