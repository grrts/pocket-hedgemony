# Settings

Settings let you shape how Pocket Hegemony looks, sounds and handles on your device, from interface scale and colour vision to controller buttons and battery use. They never change the rules, balance or the computer players: anything that would is a campaign rule, chosen when you start a new game. Most settings pick sensible defaults from the kind of device you play on, apply at once, and follow you between devices if you sign in.

## Where you find it

Open Settings from the game menu (the three-line button at the top left of the map, or `Esc`) or from the start screen. Sections are on the left and their rows on the right; in a tall window the sections come first. Each row says what it does under its name, a red dot marks a value you changed, and a long press on the name (or a right-click) puts it back. Reset this section is at the end of each section.

What the game has built so far:

- **Gameplay**: Tutorial hints (with how many of the six are done) and Reset tutorial and hints; Achievement toasts; Autosave and Autosaves kept per campaign; Turn playback speed (1×, 2×, 4×: how fast the week plays out after End turn) and Battle playback speed.
- **Graphics**: Battery saver (Off, Auto, On) and the knobs it moves: Frame rate cap, Sharpness and Animations. Rows it moves say "Set by Battery saver". Auto follows your device's battery where the browser reports it.
- **Audio**: Master, Music on or off and its volume, Effects volume and Interface sounds. The speaker button's Sound card changes the same settings.
- **Accessibility**: Colour vision (Default, Red-weak, Green-weak, Blue-weak, No colour), with a sample of four neighbouring realms and a map mode's ramp in the chosen mode under it; Patterns on map modes; Text size (Normal, Large, Larger) for the cards, menus and alerts. A colour vision change redraws the map, the armies and routes and the map mode's key at once.

Other rows join the screen as the game builds what they do.

## How it works

### The principles

- **Data, not code.** Every setting is one entry in `settings.yaml`, with its section, type, options, default per device profile, platforms and how it applies. Adding or moving a setting, or changing a default, needs no code change, and the Settings screen is built from that file in its order.
- **A profile gives every default.** On first launch the game picks a device profile and takes every default from it.
- **Changes apply at once.** A change applies immediately with a preview behind the open panel; there is no Apply button. The only exception is Display mode, which asks "Keep this display?" and reverts after 15 seconds.
- **Every input works.** Every row works with touch, mouse, keyboard and controller. No slider needs a drag and no row needs hover: sliders step with the d-pad or arrow keys and accept a tap at a position.
- **Nothing lost.** Opening Settings in a campaign loses nothing, and closing it returns you to the exact map spot.
- **Never the simulation.** Settings never change rules, balance or AI.

### Where Settings opens

Settings opens as an overlay, from the cog on the title screen and from More. In a campaign, the game menu opens Settings over the dimmed map; Settings holds Campaign rules as a read-only section listing the rules the campaign started with. There is no separate pause menu. `Esc` or the Menu button opens the game menu. On Steam, the Controller section has a button that opens Steam's own binding panel.

There is no settings wizard. On first launch, only these questions appear, and only when needed, each on one screen: the language (only when the system language is not supported); crash reports and usage statistics (when the privacy design requires consent); and "Is this text easy to read?" with Smaller, Fine and Bigger (Big screen profile only).

### The Settings screen

In a landscape window (on every device) the section list is on the left, the section's rows on the right, and a one-line description of the focused row at the bottom. In a tall window (tablets in portrait, tall desktop windows) the section list comes first and a section's rows open full screen on tap, with Back to return. Phones are landscape only.

The nine sections, in order: Gameplay, Graphics, Audio, Controls, Accessibility, Language, Account and cloud saves, Privacy, About.

Each row shows its name, its current value, and a small "changed" dot when the value differs from the profile default. A long press on a row only explains it; right-click or X on a row resets it to its profile default. Each section ends with Reset this section, and About has Reset all settings.

With a controller: LB and RB switch sections, the d-pad moves between rows, A changes or opens, d-pad left and right step a value, B goes back, X resets the row, and Y shows the long description.

### Device profiles

| Profile | Detected when |
|---|---|
| Phone | Mobile app with the screen's short side under 600 CSS px |
| Tablet | Mobile app with the short side 600 CSS px or more |
| Steam Deck | Steam reports it is running on a Steam Deck |
| Big screen | Steam is in Big Picture mode, on a Steam Machine, or on a TV-class display |
| Desktop | Desktop app or the web otherwise |

Changing Graphics → Device profile reloads every default you have not changed yourself. Connecting a controller on any profile adds controller prompts and focus outlines without switching profile.

Per-profile defaults (every other setting has one default for all profiles):

| Setting | Phone | Tablet | Desktop | Steam Deck | Big screen |
|---|---|---|---|---|---|
| Interface scale | Auto | Auto | 100 % | 112 % | 175 % |
| Text size | Normal | Normal | Normal | Normal | Large |
| Display mode | n/a | n/a | Windowed | Fullscreen | Fullscreen |
| Frame rate cap | 60 | 60 | Display rate | 60 | 60 |
| Battery saver | Auto | Auto | Off | Auto | Off |
| Sharpness | Balanced | Balanced | Native | Native | Native |
| Map detail | Medium | High | High | High | High |
| Touch target size | Large | Normal | n/a | Normal | n/a |
| Screen margins | 0 | 0 | 0 | 0 | 5 %, calibration offered once |
| Edge scrolling | n/a | n/a | On in fullscreen | Off | Off |
| Controller cursor speed | n/a | n/a | Medium | Medium | Slow |

Big screen uses the [Far layout](Screens-and-Navigation): 175 % scale with Large text puts body text at about 35 px on a 1080p TV, and the 5 % margin keeps everything out of the overscan band. Auto interface scale picks the largest step at which a 360 × 640 CSS px layout still fits (small phones 100 %, large ones up to 125 %).

### Storage and sync

Every setting belongs to one of two groups:

| Group | What is in it | Synced? |
|---|---|---|
| Device | Graphics, audio volumes, screen margins, controller deadzones, battery saver | No, stays on this device |
| Personal | Gameplay, accessibility, language, key bindings, hint switches | Yes, across your devices |

They live in two small JSON files, `settings-device.json` and `settings-personal.json`, each with a version number. While you are signed in to a Pocket Hegemony account, the personal file syncs through the account on every platform and across stores, the newest change winning setting by setting. Without an account, each store's free backup carries them: Steam Auto-Cloud on the personal file next to the save folder; iOS device backup and Android Auto Backup restore both files on a new device (no live sync); nothing on the web.

The files are kept in the app's user data folder on desktop and Steam, in the mobile app's preferences on iOS and Android, and in `localStorage` on the web. On reading, unknown keys are dropped, invalid values fall back to the profile default, and a broken file never stops the game from starting. When a file's version goes up, small migration steps rename or convert keys. Settings are never stored inside a campaign save, so loading any save never changes anyone's settings. Moving from the free tier to the full game keeps your settings.

### Campaign rules

These are chosen on the new game screen, saved in the campaign, and shown read-only in Settings, under Campaign rules:

- difficulty (Easy, Normal or Hard; what each changes is in [The 1378 start](The-1378-Start#difficulty));
- AI temper;
- fog of war;
- historical, plausible or free events (plausible by default);
- ironman (achievements only count in ironman);
- the campaign end date (default 31 August 1939);
- whether music eras follow the calendar or technology.

The map mode menu's "Hide unexplored lands" stays a display switch, because it only hides unknown lands visually. It would become a campaign rule only if fog ever hid information the computer uses.

In this build the campaign rules are difficulty, events, fog of war, ironman and the end date, chosen on the *Rules of the campaign* card ([The 1378 start](The-1378-Start#campaign-rules)), and the game menu shows them read-only in one line under the date. With fog of war off, "Hide unexplored lands" gives way to a line saying every land is shown. While an ironman campaign is played, Settings hides Autosave and Autosaves kept.

### Graphics

| Setting | Options | Default | Notes |
|---|---|---|---|
| Device profile | Phone, Tablet, Desktop, Steam Deck, Big screen | detected | |
| Display mode (desktop) | Windowed, Fullscreen | per profile | Fullscreen is borderless at the display's own resolution; no resolution list; reverts after 15 s unless kept |
| Interface scale | Auto, 75, 88, 100, 112, 125, 150, 175, 200 % | per profile | Panels, cards, icons and text scale together in eighths to keep pixel art on near-whole multiples |
| Pixel scaling | Crisp, Smooth | Crisp | Crisp snaps art to whole pixels and may leave a margin; Smooth fills exactly and blurs edges slightly |
| Sharpness | Native, Balanced, Battery | per profile | The map draws with up to 3 (Native), 2 (Balanced) or 1 (Battery) screen pixels per CSS pixel; applies on the next map redraw |
| Frame rate cap | 30, 60, 120, Display rate | per profile | When nothing moves the map does not redraw at all |
| Battery saver | Off, Auto, On | per profile | See below |
| Map detail | Low, Medium, High | per profile | Low: no 8 × 8 close-in tiles, no surf, no forest blending. Medium: 8 × 8 tiles and still water. High: everything |
| Animations | Full, Reduced, Off | Full | Water, marching columns, flags, smoke and battle motion; Off shows battle results as still frames |
| Keep screen awake during the AI turn (mobile) | On, Off | On | |
| Screen margins (desktop, Steam) | 0 to 10 % in 1 % steps | 0 (Big screen 5 %) | A calibration screen of four corner marks pulled in with the stick |
| Show performance line | Off, FPS, Full diagnostics | Off | The existing diagnostics line moves here |

**Battery saver.** On sets a 30 fps cap, Battery sharpness, reduced animations, map redraws only on change, and fewer music voices. It never touches the computer players: their turn has the same budget on every device. Auto turns it on when the device reports battery saving (iOS Low Power Mode, Android Battery Saver, or a Steam Deck on battery under 20 %).

**The four performance knobs** are Sharpness, Frame rate cap, Map detail and Animations. Battery saver moves them all at once.

| | Sharpness | Frame cap | Map detail | Animations |
|---|---|---|---|---|
| Cheapest | Battery (1×) | 30 | Low | Off |
| Phone default | Balanced (up to 2×) | 60 | Medium | Full |
| Richest | Native (up to 3×) | Display rate | High | Full |

Performance targets are measured at the phone defaults and checked once with Battery saver on.

### Audio

There are three buses, each with its own volume: **Music** (tracks and stingers), **Effects** (world and interface sounds: taps, the End turn chime, marching, battle, siege, coins) and **Ambience** (the bed between peace tracks and under the map).

| Setting | Options | Default |
|---|---|---|
| Master volume | 0 to 100 % in 5 % steps | 80 % |
| Music volume | 0 to 100 % | 70 % |
| Music | On, Off (Off fully suspends the synth) | On |
| Music variety | My palette only, All palettes | My palette only |
| Zoom mix (the mix follows the zoom level) | On, Off | On |
| Effects volume | 0 to 100 % | 80 % |
| Interface sounds (Off silences taps and panels, keeps world effects) | On, Off | On |
| Ambience | On, Off | Off |
| Ambience volume (greyed while Ambience is off) | 0 to 100 % | 50 % |
| Haptics (mobile; light vibrations on five moments, never on desktop) | On, Off | On on phones |
| Play sound in the background (desktop, web) | On, Off | Off |
| Let other apps' audio play (mobile; applies on restart) | On, Off | On |
| Sound captions | On, Off | Off |
| Reduced intensity | On, Off | Off |
| Mono audio | On, Off | Off |

On mobile the game always goes silent in the background. With "Let other apps' audio play" on, if other audio is playing at launch, game music starts muted and effects play over it, respecting the iPhone silent switch. Sound captions turn on by themselves when Master or every bus is set to 0 or off; off-screen sounds then show a small caption at the screen edge toward where they came from ("Battle at Troyes"). Reduced intensity means no echo, the most important sounds 4 dB softer, and no sharp attacks.

Some switches appear in two sections but are one setting, so changing one changes the other: Haptics (Audio and Controls), and Sound captions, Reduced intensity and Mono audio (Audio and Accessibility).

### Gameplay

| Setting | Options | Default |
|---|---|---|
| Autosave | Every month, Every 6 months, Every 12 months (each January), Off | Every 12 months |
| Autosaves kept per campaign | 1, 3, 5 | 3 |
| Confirm End turn | Off, When the Attention screen has lines, Always | Off |
| Battle playback speed | 1×, 2×, 4× (one 4-hour battle step takes half a second at 1×) | 1× |
| Open the turn report | Every turn, When something important happened, Never | When something important happened |
| Jump to events (the camera glides to the event's province) | On, Off | On |
| Tooltips (hover after the delay, long press, or Y on a controller) | On, Off | On |
| Tooltip delay (desktop, web) | Instant, Short 0.3 s, Long 0.8 s | Short |
| Detailed tooltips (the full breakdown, "+12 from the market, −3 from the war tax") | On, Off | Off |
| Tutorial hints, and the action "Reset tutorial and hints" | On, Off | On |
| Achievement toasts (Off hides the toast; achievements still unlock) | On, Off | On |
| Place names | Historical, Modern | Historical |
| Date format | 20 September 1378, 20 Sep 1378, 20.09.1378, 1378-09-20 | follows the language |

Autosave Off stops only the rotating autosaves, never the Resume save (see [Saving](Saving)). In an ironman campaign both autosave rows are hidden. When Confirm End turn asks, the question names the count ("3 warnings, 2 events wait for you · Look · End turn anyway"). Your battles never stop the turn and can't be skipped; they slow the week to 4-hour steps while they run, and that is not a setting. Turns are weeks, so the autosave goes by the calendar, never more than once a month. When events are still unanswered, End turn opens the first one instead of asking. There is no advisor row; muting a kind of warning happens on the Attention screen. Historical place names change with date and owner (Constantinople becomes Istanbul in Ottoman hands); no historical name list is planned, so both options show today's region names.

### Controls

**Touch** (mobile, and touch screens on desktop):

| Setting | Options | Default |
|---|---|---|
| Main hand (Left moves the action bar and End turn to the left and the game menu button to the right) | Right, Left | Right |
| Long-press time | Short 0.3 s, Medium 0.5 s, Long 0.8 s | Medium |
| Double-tap to zoom | On, Off | On |
| Pan and zoom speed | Slow, Medium, Fast | Medium |

**Mouse and keyboard** (desktop, web):

| Setting | Options | Default |
|---|---|---|
| Right-click gives orders | On, Off | On |
| Wheel zoom | Toward the cursor, Toward the centre | Toward the cursor |
| Edge scrolling | On, Off, On in fullscreen | per profile |
| Pan speed for keys and edge | Slow, Medium, Fast | Medium |

With Right-click on, left-click selects an army and right-click on a province marches it; with it off, you use the touch flow (tap army, tap province; there is no confirm step). The touch flow always works too. Any action can be rebound, with two keys per action; a conflict asks "Also bound to X, swap?".

Default keys:

| Action | Keys |
|---|---|
| Pan | W A S D or the arrow keys |
| Zoom | wheel, `+` / `−`, `Q` / `E` |
| End turn | `Enter` (hold 0.5 s, or press twice when Hold actions is off) |
| Game menu | `Esc` |
| Map modes (realms, terrain, people, wealth, walls, food) | `1` to `6`, `Tab` cycles |
| Next / previous army | `.` / `,` |
| Next notification | `N` |
| Turn report | `R` |
| Jump to capital | `Home` |
| Ledger | `L` |

**Controller:**

| Setting | Options | Default |
|---|---|---|
| Button prompts | Auto, Xbox, PlayStation, Nintendo, Steam Controller, Steam Deck | Auto (the last controller used) |
| Confirm button (swaps confirm and back) | Bottom (A / ✕), Right (B / ○) | Bottom; Right when a Nintendo layout is detected |
| Cursor speed | Slow, Medium, Fast | per profile |
| Cursor acceleration | On, Off | On |
| Snap to provinces (the cursor slows over a province's centre and its armies, so a stick can hit small provinces in the Holy Roman Empire) | Off, Light, Strong | Light |
| Stick deadzone (not shown on Steam) | 5 to 30 % | 12 % |
| Vibration | Off, Light, Full | Light |
| Gyro cursor (Steam Controller, Deck, PlayStation) | Off, While touching the right trackpad or stick, Always | Off |
| Hold to open the action menu | Hold, Tap | Hold |

On Steam, prompts come from Steam Input so they match your own bindings, rebinding happens in Steam's own panel ("Open Steam controller settings"), and the in-game rebind list, deadzone and gyro rows hide. Off Steam (iOS, Android, web, non-Steam desktop), controllers come through the Gamepad API and the in-game rebind list and deadzone row appear; the gyro row shows only where the platform reports motion.

Default controller layout (Xbox names):

| Input | Map | Menus and panels | Battle view |
|---|---|---|---|
| Left stick | map cursor | move focus | |
| Right stick | pan | scroll | pan |
| LT / RT | zoom out / in | previous / next page | slower / faster |
| A | select | confirm | change standing orders |
| B | deselect, back | back | leave the battle view |
| X | action menu | reset row | order a retreat |
| Y | info card | long description | commander's line |
| LB / RB | previous / next army | previous / next tab | previous / next running battle |
| D-pad up / down | cycle map modes | move focus | |
| D-pad left / right | previous / next notification | step a value | |
| View | turn report; hold 0.5 s for End turn | | |
| Menu | game menu | close the panel | game menu |
| Left stick click | jump to capital | | |
| Right stick click | recentre on the selection | | |

The official Steam Input configuration for the Steam Controller and Steam Deck adds: the right trackpad as a mouse-like cursor with momentum; the left trackpad for panning, with a click zooming to the province under the cursor; back grips for previous and next notification and for the ledger and turn report; and gyro off by default, offered as "aim while touching the right trackpad". On Steam the game declares three action sets (Map, Menu, Battle) plus a Text layer for the on-screen keyboard, and ships official configurations for the Steam Controller, Steam Deck, Xbox, PlayStation and Nintendo controllers.

### Accessibility

| Setting | Options | Default |
|---|---|---|
| Colour vision | Default, Red-weak, Green-weak, Blue-weak, No colour | Default |
| Patterns on map modes | On, Off | Off (On with No colour) |
| Borders | Normal, Thick, High contrast | Normal |
| Text size | Normal (17 px), Large (20 px), Larger (24 px), before interface scale | per profile |
| Font | Pixel, Plain | Pixel |
| High contrast panels | On, Off | Off |
| Touch target size | Normal (44 points), Large (56 points) | per profile |
| Reduced motion | Follow system, On, Off | Follow system |
| No flashes | On, Off | Off |
| Hold actions | On, Off | On |
| Screen reader support | Follow system | |

- **Colour vision** swaps nation colours to a second assignment from the same 32-colour palette, chosen so neighbours stay distinguishable for that vision type, and each map mode's colour ramp to a safe one (blue to orange instead of red to green). No colour uses greys with patterns. Every mode keeps the map's season colours (snow, spring green, autumn gold, the wet season) apart: the colour-blind modes shift them with the safe ramp and No colour uses tile patterns. Seasons cannot be switched off.
- **Patterns on map modes** adds hatching, dots and stripes by band, so a map mode reads without colour.
- In the colour-blind modes the realms keep a colour near their own where they can, but never one their neighbours can't be told from by that kind of colour vision. Map modes that ran red to green (Food, Diplomacy, Subjects, Exploration) run orange for bad or hostile and blue for good or friendly, and the ramps (People, Wealth, Trade) run pale orange to dark blue, lighter to darker, so they also read in grey. With No colour every realm is a grey with a pattern of its own beside its neighbours.
- **High contrast borders** draw nation borders in black and white ink two art pixels wide.
- **Text size**: panels reflow and cards grow taller, not smaller.
- **Plain font** replaces the pixel font and the blackletter titles with a clear, openly licensed sans such as Atkinson Hyperlegible.
- **High contrast panels**: solid backgrounds instead of parchment, stronger outlines, no text over patterns.
- **Reduced motion**: camera cuts instead of glides, no screen shake, and Animations drop to Reduced. It follows the system setting by default.
- **No flashes** removes cannon flashes, lightning and white flashes on battle results.
- **Hold actions** off replaces every "hold to" (End turn, the action menu) with "press twice".
- **Screen reader support**: menus, panels and cards carry labels for VoiceOver, TalkBack and Narrator. The map itself is not narrated, but the selected province's card is.

When a setting drives others (Battery saver, Reduced motion, Colour vision "No colour"), each driven row shows "Set by <setting>" and can still be changed by hand.

### Language

- **Language:** the launch list; default is the system language if supported, otherwise English. Interface text changes live; event and catalogue text reload on the next panel open. A language in a non-Latin script joins the list only once the localisation design has a font for it, because the pixel font covers Latin only.
- **Number format:** follows the language, 1,000.5, 1.000,5 or 1 000,5.

### Account, privacy and about

- **Account:** Sign in or Create account; when signed in, your email and Sign out. Default signed out, never a wall before playing. The Load screen's "Sign in to sync" opens the same flow.
- While signed in: **Cloud saves** (On by default, syncing saves and personal settings), **Sync on Wi-Fi only** (Off by default), the list of signed-in devices each with Sign out, and **Delete account and saves** with a confirmation (also reachable from Privacy).
- **Privacy:** Send crash reports and Send anonymous usage statistics (asked on first launch), and, in the free mobile tier only if the ad stays, Ad consent, which reopens the consent form.
- **About:** version and build number, Restore purchases (which Apple requires to be reachable), Credits and licences, Reset all settings, and Copy diagnostics (the diagnostics line and your settings on the clipboard for support).

### Platform notes

- **Steam Deck:** body text about 19 px at 112 % (17 px at 100 %) at 1280 × 800; starts fullscreen with Deck glyphs; Settings needs no mouse or keyboard anywhere; naming a save calls Steam's floating gamepad keyboard.
- **Big screen:** 175 % scale and Large text (the same physical size at 4K), a slow cursor, a 5 % margin with the calibration screen, focus outlines always on.
- **Safe areas** (notch, home bar, camera hole) are always respected; this is not a setting.
- **Android:** the back gesture behaves like B or `Esc`: it closes the top panel, then opens the game menu, and never quits the game from the map without asking.
- **iOS:** the silent switch and "Let other apps' audio play" use the native ambient audio session.

### The settings file format

Each entry in `settings.yaml` carries an `id` (`section.name`, also the key in the settings files), `section`, `type` (choice, toggle, slider, binding, action), `options`, `default`, `default_by_profile`, `platforms`, `hide_on` (rows Steam Input owns), `applies` (live, view, restart), `sync` (device or personal) and optionally `sets_when_on`. A slider adds `min`, `max` and `step`; an action is a button such as Reset or Restore purchases. Names and descriptions are string keys (`settings.<id>.name`, `settings.<id>.desc`), never text in the file.

### Tests

- A smoke test opens Settings on each profile, steps through every row with the keyboard only, and fails if focus is lost or a row cannot be reached.
- A schema test checks that `settings.yaml` loads, every default is one of its options, and every string key exists in English.
- The accessibility checks include screenshots of the map in each colour vision mode run through a colour-blindness simulator.
- On a Steam Deck, every row must be reachable with the built-in controls and legible at arm's length.

## What you see

The Settings screen with its nine sections, the changed dot, per-row and per-section reset, the "Keep this display?" question, the calibration screen, "Set by …" on driven rows, and the read-only Campaign rules section.

## How it connects

- [Saving](Saving): the autosave values, the Cloud saves row, Wi-Fi only, account and devices; personal settings ride the same account sync and store backups.
- [Screens and navigation](Screens-and-Navigation): where Settings opens, Confirm End turn, the turn report, the Far layout, scale and text size, prompts, hold actions, main hand, Android back.
- [Music and sound](Music-and-Sound): buses, volumes, music variety, zoom mix, ambience, haptics, captions, reduced intensity, mono and background play.
- [Map and Map Modes](Map-and-Lenses): sharpness, map detail, animations, frame cap, colour vision, borders, patterns, place names and the parchment switch.
- [Tutorial and help](Tutorial-and-Help): tutorial hints and their reset, tooltips and their delay, detailed tooltips.
- [Achievements](Achievements): the toast switch; achievements only count in ironman.
- [The 1378 start](The-1378-Start): the campaign rules shown read-only.
- [How a turn works](Time-and-Turns): Keep screen awake during the computer players' turn.
- [Warfare](Warfare): battle playback speed and battle view controls.
- [Historical events](Historical-Events): Jump to events.

Settings have no part in the monthly turn.

## Numbers

From `settings.yaml`. These are settled values, not placeholders, unless noted.

| Key | Value |
|---|---|
| `constants.battery_auto_threshold` | 0.20 |
| `constants.display_revert_seconds` | 15 |
| `constants.interface_scale_auto_min_layout` | 360 × 640 CSS px |
| `graphics.interface_scale.options` | auto, 75, 88, 100, 112, 125, 150, 175, 200 |
| `graphics.sharpness` | Native ≤ 3, Balanced ≤ 2, Battery 1 |
| `graphics.battery_saver.sets_when_on` | frame cap 30, sharpness battery, animations reduced, worker budget low |
| `graphics.screen_margins` | 0 to 10 %, step 1, Big screen 5 |
| `audio.master` / `music_volume` / `effects_volume` / `ambience_volume` | 80 / 70 / 80 / 50 |
| `gameplay.tooltip_delay` | instant, 0.3 s, 0.8 s |
| `gameplay.battle_speed` | 1, 2, 4 |
| `controls.long_press` | 0.3 / 0.5 / 0.8 s |
| `controls.keys.end_turn` | Enter, hold 0.5 s |
| `controls.deadzone` | 5 to 30 %, default 12 |
| `controls.pad.map.end_turn.hold_seconds` | 0.5 |
| `accessibility.text_size.body_px` | 17 / 20 / 24 |
| `accessibility.touch_targets.points` | 44 / 56 |
| Interface sounds level (sound effects config) | about 6 dB under the music |
| Steam Deck and Big screen body text | about 19 px and 35 px, still to check against Valve's guidance |

## Still open

- Privacy and consent rows, the store screens and Restore purchases, and the Big screen and Steam Deck text sizes need a store and Valve Steamworks check before release.

## For developers

- Spec: [`domain/settings/spec.md`](https://github.com/grrts/pocket-hedgemony/blob/claude/domain-specs-bdd-ebdpmx/domain/settings/spec.md), requirement code **SET** (SET-001 to SET-130).
- Features: `domain/settings/features/` (settings-screen, device-profiles, storage-and-sync, campaign-rules, graphics, audio, gameplay, controls, accessibility, language-account-about, platform-notes, settings-data).
- Code: `packages/engine/src/domain/settings/`, data in `packages/rules/data/domain/settings.json`. The example file is `settings/settings.example.yaml` in the designs. Today's client caps the device-pixel ratio at 2 in `apps/client/src/map/mapView.ts` (to become Sharpness) and shows the diagnostics line (to move behind Show performance line). The smoke test extends `pnpm --filter @ph/client smoke`.
