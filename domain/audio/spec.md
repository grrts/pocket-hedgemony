# Audio (AUD)

## 1. Purpose and scope

This context decides every sound the game makes: the background music (sub-area **Music**) and every sound
that is not music (sub-area **Effects**: interface, frame, turn, map, armies and fleets, battle, siege, sea,
economy, realm and diplomacy, events and notifications, and the ambience bed). Both run on the same virtual
sound chip, PH-5, in the same AudioWorklet, under the same mobile rules.

**In scope**
- The PH-5 chip: music voices (P1, P2, T, W, N, and W2 from Era V) and the effects bank (S1, S2, S3), their
  rules, mixer, low-pass and pan limits, CPU budget.
- The Hegemony motif.
- Music eras, the twelve regional palettes, the track list (47 loops, 21 stingers), the music director (inputs,
  priority stack, state thresholds, transitions, peace rotation, war layers, zoom mix).
- The effects catalogue (129 sounds), era and region rules for effects, the turn results player, voices and
  priority, cooldown, variation, pan, distance and zoom, the ambience beds.
- Who owns which moment (music stinger vs effect), ducking, loudness.
- Data formats (MML tracks, `.sfx` sounds), the build checks, `music.yaml` and `sfx.yaml`, event `music:` and
  `sfx:` tags.
- Platform behaviour (first tap, background, silent switch, haptics, latency, fallback synth).
- Audio accessibility (visual partner, captions, mono, no meaning only in pitch, reduced intensity).
- Cultural care, care around harm, originality.
- Tools, production milestones, who writes the music, quality gates.

**Not in scope (owned by …)**
- The settings screen, setting ids and where settings sync (settings). This context states the audio settings it needs and their defaults.
- Screen ids, the screen list, the splash, pause menu and when screens open (game-shell).
- The moments that trigger sounds: turns (time-and-turns), battles and sieges (warfare), sea battles (naval),
  events and their tags (events), discovery (exploration), alliances and envoys (diplomacy), rulers and
  stability (realm), rebellions (rebellions), revolutions (revolutions), culture groups (culture).
- Controller rumble (input scheme thread; no context folder yet).
- Accessibility as a whole (gap list 2, item 10).

## 2. Sources

Newest decision first.

1. `sound-effects/README.md` §15 Decisions (16 Oct 2026): own effect voices; ambience off by default; haptics on by default on phones; interface taps on by default; captions off by default, on automatically when sound is off; no voices anywhere.
2. `music-design/README.md` §10 (decided 16 Oct): composer = in-house by Claude in MML (§9); era basis = calendar, technology option kept in config but off; ambience off by default (owned by sound effects §5.12); rival theme yes (`war_declared` in the attacker's palette).
3. `music-design/README.md` §1–§9 (first draft 16 Oct, trimmed the same day to 1444 – 31 Aug 1939).
4. `music-design/music-config.example.yaml`.
5. `sound-effects/README.md` §1–§14 and `sfx-config.example.yaml`.
6. `planning/gap-lists.md` "Decisions already made" (campaign span; "Music: you only ask for good music and sound effects; who writes them is open to us"; List 1 item 5 lists "Music 10" as still open — superseded by music §10).
7. Cross-checked, not owned: `settings/settings-design.md` §5.2 and `settings.example.yaml` audio rows; `screen-flow/screen-flow-design.md` §9 screen list; `tutorial/tutorial-design.md` §12; `achievements/achievements-design.md` §8; `warfare/warfare-design.md` (no single war score); `country-stats/country-stats-design.md` (stability mapped to loyal lords and provinces in revolt).

## 3. Ubiquitous language

| Term | Meaning | Not to be confused with |
|---|---|---|
| PH-5 | The small virtual sound chip, synthesized at runtime, that plays all music and effects | A sample player |
| Music voice | P1, P2 (pulse), T (4-bit stepped triangle, on/off only), W (32-sample 4-bit wavetable), N (noise); W2 a second wavetable from Era V | Effect voice |
| Effect voice | S1 (pulse), S2 (noise), S3 (stepped triangle or 4-bit wavetable); the effects bank | Music voice |
| Tuning table | Cents per scale degree stored per track, for neutral intervals, slendro, pelog, seven-equal and others | 12-tone notes |
| Hegemony motif | Five notes, degrees 1 – 5 – 4 – 5 – 1↑, long–short–short–long–long | A stinger |
| Music era | One of five bands (I–V) taken from the game year (calendar basis) | Warfare era (I–VII), research era, an age |
| Age | An event-tree age (`ages.yaml`); ages overlap and add stingers and era themes on top | Music era |
| Palette | One of twelve regional sound sets chosen by the player's primary culture group: scales, tuning tables, rhythms, wavetables, lead voice | Culture group |
| Track | A loop (60–150 s) with an intro (2–8 s), possibly with era variants and intensity layers | Stinger |
| Era variant | An arrangement of the same melody and harmony with the current era's tempo, percussion pattern and wavetables | A separate track |
| Intensity layer | Up to three layers of a war track that fade in and out at bar lines | Mix level |
| Stinger | A short music piece (3–10 s) played over or between tracks; not a state | An effect |
| Music state | The one state the director holds, chosen by the highest-priority rule that holds | Screen |
| Music director | Main-thread logic that picks the music state and track from turn results and UI state; never runs in the engine | The engine |
| Peace rotation | How peace tracks are picked to avoid fatigue | |
| Zoom mix | Mix change by zoom level (not a track change) | |
| Ambience bed | A 4–12 s loop of noise and occasional wavetable notes chosen by the terrain under the camera; off by default | Music |
| Sound (effect) | A short program of 60 Hz ticks for one to three effect voices, id `<group>_<name>` | Stinger |
| Alias | A catalogue row that only points to another sound (`army_order_invalid`, `econ_cant_afford` → `ui_error`) | |
| Priority (Pri) | 1 (highest) to 5 (lowest); used by voice stealing, the busy-turn filter and ducking | Music priority stack |
| Turn results player | Plays at most 5 effect sounds when a new turn is shown | |
| Fixed / game-year era / army era | The three ways a sound may change over time | |
| Visual partner | The toast, icon flash or animation every sound must have | |
| Caption | A small edge-of-screen text for an off-screen sound, toward where it came from | |
| Ducking | Lowering one bus while another sound plays | Muting |
| MML | Music Macro Language: the text format tracks are written in | |
| `.sfx` | The text format sounds are written in | |

## 4. Domain model

### Aggregates

**SoundChip (PH-5)** (identity: the audio engine instance)
- Music voices P1, P2, T, W, N (+ W2 from Era V); effect voices S1, S2, S3; master low-pass ~9 kHz; pan ≤ 30 %
  off centre per voice; buses master, music, effects, ambience.
- INV-AUD-1: at most five music voices at once (six with W2 from Era V); at most three effect voices at once.
- INV-AUD-2: effects never take a music voice.
- INV-AUD-3: no samples of real instruments, no recorded real-world audio, no reverb tails, no chords on one voice.
- INV-AUD-4: echo is a single tap of 60–250 ms (music); in effects only for large sounds.

**MusicDirector** (identity: the client session)
- Holds: current music state, track, layers, time in state, last 3 tracks played, camera dwell, palette, era.
- INV-AUD-5: the director changes state only at turn end or on a screen change.
- INV-AUD-6: the director never runs inside the engine, so it cannot affect determinism.
- INV-AUD-7: no track among the last 3 is picked again in peace rotation.
- INV-AUD-8: a state is held at least 45 s (config).

**EffectsMixer** (identity: the client session)
- Holds: playing sounds with priority and voices, per-sound cooldowns, the turn results queue.
- INV-AUD-9: a new sound takes a busy voice only from a lower-priority sound; otherwise it is dropped.
- INV-AUD-10: the same sound id doesn't restart within its cooldown.

**TrackLibrary** and **SoundCatalogue** (identity: build)
- Every MML track and `.sfx` sound, compiled to JSON, checked by the build.
- INV-AUD-11: every track quotes the Hegemony motif at least once.
- INV-AUD-12: every sound is under 2 s (ambience exempt) and uses at most three voices; every `ui_` sound is longer than 10 ms.
- INV-AUD-13: every sound has a visual partner named with it.
- INV-AUD-14: every id the directors name exists; every era variant a troop type needs exists.

### Value objects

**Music eras** (calendar basis; config `eras`)

| Era | Years | Ages that open in it | Style |
|---|---|---|---|
| I | 1444 – 1519 | Gunpowder Empires, Exploration | Drones, modal monophony with a second voice, frame drums, 60–90 bpm |
| II | 1520 – 1649 | Reformations, Atlantic Empires | Two-part counterpoint, dance rhythms in 3, plucked-string wavetables |
| III | 1650 – 1789 | Crisis and Absolutism | Walking bass, ornamented leads, harpsichord-like arpeggios, formal marches |
| IV | 1790 – 1869 | Revolutions, Industrialization | Bigger dynamics, dotted marches, folk-song melodies, first syncopation |
| V | 1870 – 31 Aug 1939 | Imperialism, World Wars | W2 voice: brass and string swells, snare rolls, ragtime and early-jazz rhythm |

**Palettes** (README §3.3; config `palettes`)

| # | Palette (config id) | Culture groups | Starting idioms |
|---|---|---|---|
| 1 | Western and Central Europe (`europe_west`) | latin, germanic | Church modes, drone fifths, bransle and pavane rhythms; later tonal marches |
| 2 | Eastern Europe and the Balkans (`europe_east`) | slavic, hellenic, uralic | Uneven meters (7/8, 9/8), minor with raised 4th, call-and-response, bell-like W |
| 3 | Middle East and North Africa (`mena`) | arab, turkic (west), iranian, berber, semitic | Maqam and dastgah tuning tables, long slides on P1, 10/8 and 6/8 cycles on N, plucked lute W |
| 4 | Steppe and Inner Asia (`steppe`) | turkic (east), mongolic, tungusic | Pentatonic, drone plus overtone-like duty sweeps, galloping 6/8 |
| 5 | South Asia (`south_asia`) | indo_aryan, dravidian, tibeto_burman | Drone on T and W, raga-like rules per track, tala cycles of 7, 10, 16 on N |
| 6 | East Asia (`east_asia`) | sinitic, japonic, koreanic | Anhemitonic pentatonic, sparse textures, plucked zither W; Japan and Korea own tuning variants |
| 7 | Southeast Asia (`southeast_asia`) | tai, austroasiatic, austronesian | Interlocking P1/P2, slendro and pelog tables, metallophone W, gong-cycle structure on T |
| 8 | West Africa and the Sahel (`west_africa`) | mande, akan, yoruba_edo, hausa_fulani | 3-over-2 on N and P2, harp-lute W ostinato, talking-drum-like bends |
| 9 | East, Central and Southern Africa (`africa_east_south`) | bantu, nilotic, cushitic, semitic_ethiopian, khoisan | Interlocking thumb-piano W, hocket, Ethiopian qenet modes as tuning tables |
| 10 | The Americas, Indigenous (`americas`) | nahua, maya, andean, tupi_guarani, algonquian, iroquoian | Pentatonic and tritonic, flute-like P1 at 12.5 %, frame and log drums; Andean and Mesoamerican variants |
| 11 | Oceania (`oceania`) | polynesian, melanesian, aboriginal_australian | Chant-like narrow melody, body percussion on N, drone on T |
| 12 | Atlantic and creole (`atlantic_creole`) | atlantic_creole, any colonial nation founded after 1500 | Blend of palettes 1, 8, 10 by culture mix; habanera, later swing |

Config split: turkic → `mena` if the nation's capital is west of longitude 55, otherwise `steppe`.

**Track list** (47 loops, 21 stingers)
- Interface and frame (6): `title` (screens `title`, `main_menu`; full motif, era-neutral, all five voices);
  `nation_select` (`new_campaign`; calm; lead timbre follows the highlighted nation's palette, same notes);
  `load_resume` (`loading` and returning to the app; 6 s intro then the normal pick); `game_over` (nation
  annexed; slow, unresolved, ends on motif degree 4); `campaign_end` (end date, 31 Aug 1939 by default; title
  theme in late Era V style then the motif in the player's palette); `credits` (medley of motif quotes from
  every palette).
- Peace regional (24): `peace_<palette>_<early|late>`; early written for Eras I–III, late for IV–V; era
  arrangement variants give 60 palette × era combinations.
- Peace era themes (5): `era_1` … `era_5`, shared by all nations, between palettes; play once in full after an era change.
- Situations and moods (7): `diplomacy` (realm book open on its Diplomacy section; single quiet layer; regional W lead);
  `prosperity` (brighter variant of the palette's track key); `unrest` (base + drone; second layer when rebels
  are in the field); `crisis` (disaster, plague, famine or succession crisis chain active; low pulses,
  irregular noise, no melody until resolved); `revolution` (revolution period touching the player, Era IV on;
  fast march, rising sequence, ends with the motif inverted); `exploration` (explorers or colonists active and
  camera on open ocean; light P1 over surf-like N, slow); `world_war` (0.6 of the 8 great powers at war, Era V
  on; replaces `war_campaign`; heavier, W2 brass).
- War (5, layered): `war_mobilize` (drum ostinato; + bass); `war_campaign` (main theme; + counter-melody when a
  player army is within reach of an enemy; + full percussion when a battle is fought this turn); `war_siege`
  (slow pulse; + tension sequence as the siege nears the end); `war_naval` (wave-like P2 arpeggio; + lead; +
  percussion); `war_losing` (minor-key reprise of `war_campaign`; + drone). War percussion by era (frame drum →
  field drum → snare and bass drum → mechanized, noise-heavy); lead follows the palette.
- Stingers (21): `age_<age_id>` × 9 (one per age up to the Age of World Wars, ending on the motif);
  `war_declared` (by or on the player; in the attacker's palette when a rival declares on the player);
  `battle_won`, `battle_lost`; `war_won`, `war_lost` (peace with a gain or a loss); `discovery`; `innovation`;
  `ruler_new`; `alliance`; `event_good`, `event_bad`, `event_major`.

**Music priority stack** (README §5.2)
1. Screen rules: `title` + `main_menu` → `title`; `new_campaign` → `nation_select`; `loading` → `load_resume`;
   `game_over`; `campaign_end`; `credits`; `battle` → war tracks; `siege` → `war_siege`; screens marked
   "unchanged" keep the current state.
2. Losing war: `war_losing`.
3. Active war: `world_war` > `war_naval` > `war_siege` > `war_campaign` > `war_mobilize`.
4. Crisis: `revolution` > `crisis` > `unrest`.
5. Screen moods: `diplomacy` (realm book on its Diplomacy section).
6. Good times: `prosperity`, `exploration`.
7. Peace rotation.

**Effects catalogue** (129 counted sounds in 12 groups; aliases and the silent `turn_autosave` listed, not counted)

| id | When | Voices | Length | Pri |
|---|---|---|---|---|
| `ui_tap` | Any button, card, list row | S1 | 40 ms | 3 |
| `ui_tap_soft` | Tabs, chips, slider steps | S1 | 25 ms | 4 |
| `ui_back` | Back, close a panel | S1 | 60 ms | 3 |
| `ui_confirm` | Confirm a choice that costs something (motif 1–5) | S1 | 120 ms | 2 |
| `ui_cancel` | Cancel in a dialog | S1 | 80 ms | 3 |
| `ui_error` | Tap that can't be done | S1 + S2 | 150 ms | 2 |
| `ui_toggle_on` / `ui_toggle_off` | Switches, lens on and off | S1 | 50 ms | 4 |
| `ui_panel_open` / `ui_panel_close` | Cards and sheets slide in and out | S2 | 90 ms | 4 |
| `ui_tab` | Tab change inside a card | S1 | 30 ms | 4 |
| `ui_scroll_tick` | Each scroll wheel or picker step; at most one per 40 ms | S3 | 15 ms | 5 |
| `ui_slider` | Dragging a slider; pitch rises with value | S1 | 20 ms per step | 5 |
| `ui_drag_pick` / `ui_drag_drop` | Picking up / dropping (a company between armies) | S3 | 60 ms | 3 |
| `ui_text_key` | On-screen keyboard | S2 | 10 ms | 5 |
| `ui_tooltip` | Long-press tooltip opens (never played, D-AUD-12) | S1 | 30 ms | 5 |
| `ui_hint` | A tutorial or advisor hint appears | S1 + S3 | 300 ms | 2 |
| `ui_achievement` | An achievement unlocks (motif on bells) | S1 + S3 | 900 ms | 2 |
| `ui_save` | Manual save | S3 | 200 ms | 4 |
| `ui_purchase` | A store unlock completes | S1 + S3 | 700 ms | 1 |
| `frame_logo` | Splash logo | S1 + S2 + S3 | 1.2 s | 1 |
| `frame_start` | "Tap to start" | S1 + S3 | 400 ms | 1 |
| `frame_nation_pick` | Nation highlighted on the picker (its palette) | S3 | 150 ms | 3 |
| `frame_campaign_begin` | Confirm nation and start | S1 + S2 + S3 | 1.0 s | 1 |
| `frame_pause` / `frame_resume` | Pause menu opens / closes; music ducks 6 dB while paused | S1 | 80 ms | 3 |
| `turn_end` | Player taps End turn (motif 1–5, palette wavetable) | S1 + S3 | 350 ms | 1 |
| `turn_working` | Engine still computing after 600 ms; 1 tick per 500 ms | S2 | loop | 4 |
| `turn_ready` | New turn ready (motif 4–5–1↑) | S1 + S3 | 500 ms | 1 |
| `turn_month_new_year` | The turn that starts January (`turn_ready` + bell) | S3 | 600 ms | 2 |
| `turn_report_open` | Turn report opens | S2 | 120 ms | 4 |
| `turn_autosave` (not counted) | Autosave finished | none | silent | — |
| `map_select_province` | Tap a province; knock pitch by terrain group | S3 | 50 ms | 3 |
| `map_select_own` | Tap an own province | S3 | 60 ms | 3 |
| `map_zoom_step` | Crossing a zoom level; one per level crossed | S1 | 40 ms | 5 |
| `map_lens` | A lens is picked | S1 + S2 | 120 ms | 4 |
| `map_overview` | Overview button opens the world view | S2 | 150 ms | 4 |
| `map_fog_reveal` | Parchment lifts over newly known land | S2 | 400 ms | 3 |
| `map_ping` | Camera jumps to a notification's place | S1 | 100 ms | 3 |
| `map_border_change` | Province changes hands on screen; rising if gained by player, falling if lost; silent otherwise | S3 | 200 ms | 3 |
| `army_select` | Select an army (horse adds clop, guns a wheel creak) | S2 + S3 | 150 ms | 2 |
| `army_order_move` | Confirm a march order | S2 + S3 | 300 ms | 2 |
| `army_order_invalid` (alias) | Route can't be taken → `ui_error` | | | |
| `army_march_loop` | Camera follows a marching army at local zoom | S2 + S3 | loop | 4 |
| `army_arrive` | Army ends its march | S3 | 150 ms | 3 |
| `army_split` / `army_merge` | Split or merge | S3 | 120 ms | 3 |
| `army_levy_call` | Calling the levy (horn on palette lead wavetable) | S1 + S2 | 600 ms | 2 |
| `army_lords_call` | Calling the lords | S1 + S3 | 600 ms | 2 |
| `army_hire` | Hiring companies | S1 + S3 | 400 ms | 2 |
| `army_trained` | Regiment finishes training | S3 | 300 ms | 3 |
| `army_disband` | Disband | S2 | 300 ms | 3 |
| `army_hungry` | Army food reserve low; repeats only when worse | S1 | 300 ms | 2 |
| `army_winter_quarters` | Army goes into winter quarters | S2 | 400 ms | 4 |
| `fleet_select` / `fleet_order_move` | Select or move a fleet | S2 + S3 | 200 ms | 2 |
| `battle_start` | Battle begins and screen opens (attacker's horn first) | S1 + S2 + S3 | 1.0 s | 1 |
| `battle_bell` | Each bell begins; last bell of the day two strikes | S3 | 200 ms | 2 |
| `battle_order` | Commander's order line appears | S1 | 80 ms | 4 |
| `battle_shoot_bow` | Archers (eras I–II) | S2 | 400 ms | 3 |
| `battle_shoot_crossbow` | Crossbows | S2 + S3 | 300 ms | 3 |
| `battle_shoot_matchlock` | Hand guns, arquebuses (II–III) | S2 | 500 ms | 3 |
| `battle_shoot_volley` | Flintlock line volley (IV–V) | S2 | 400 ms | 3 |
| `battle_shoot_rifle` | Breech-loaders and rifles (V–VI) | S2 | 500 ms | 3 |
| `battle_shoot_mg` | Machine guns (VI–VII), ~10 per second | S2 | 600 ms | 3 |
| `battle_gun` | Field guns and bombards fire | S2 + S3 | 600 ms | 2 |
| `battle_shell` | Era VI–VII bombardment lands (no falling whistle) | S2 + S3 | 800 ms | 2 |
| `battle_charge_horse` | Shock horse charge | S2 + S3 | 700 ms | 2 |
| `battle_charge_foot` | Foot charges, pikes, bayonets | S2 + S1 | 600 ms | 2 |
| `battle_melee` | Melee in a sector | S2 + S3 | 500 ms | 3 |
| `battle_brace` | Sector braces, charge fails | S3 | 300 ms | 3 |
| `battle_sector_lost` | Sector won by one side (falling if player's side lost, rising if won) | S1 | 300 ms | 2 |
| `battle_rout` | Company or army breaks (+ falling horn for whole army) | S2 + S1 | 800 ms | 1 |
| `battle_air` | Era VII aircraft | S2 | 800 ms | 3 |
| `siege_begin` | Siege laid | S2 + S3 | 600 ms | 2 |
| `siege_closed` | Castle closed | S3 | 300 ms | 3 |
| `siege_bombard` | Guns add shot this month | S2 + S3 | 600 ms | 3 |
| `siege_mining` | Mining this month | S3 | 500 ms | 4 |
| `siege_breach` | A breach opens | S2 + S3 | 900 ms | 1 |
| `siege_repair` | Garrison closes a breach | S3 | 400 ms | 3 |
| `siege_sally` | Garrison sallies | S2 + S3 | 600 ms | 2 |
| `siege_storm` | Storming begins | S1 + S2 + S3 | 1.0 s | 1 |
| `siege_terms` | Terms offered or asked | S1 | 600 ms | 2 |
| `siege_fall` | Castle taken (lower bell for the player's own castle) | S3 | 600 ms | 2 |
| `sea_battle_start` | Sea battle | S1 + S2 + S3 | 1.0 s | 1 |
| `sea_broadside` | Ships fire | S2 + S3 | 700 ms | 2 |
| `sea_sink` | A ship sinks | S2 + S3 | 900 ms | 2 |
| `sea_blockade` | Blockade set or broken | S1 | 300 ms | 3 |
| `sea_landing` | Troops land from ships | S2 + S3 | 500 ms | 3 |
| `econ_income` | Turn report shows income (once per turn) | S1 | 150 ms | 3 |
| `econ_income_big` | Record income or windfall event | S1 + S3 | 400 ms | 2 |
| `econ_spend` | Gold spent | S1 | 120 ms | 3 |
| `econ_cant_afford` (alias) | Not enough gold → `ui_error` | | | |
| `econ_debt` | Treasury below zero or loan taken | S1 | 400 ms | 2 |
| `econ_build_start` | Building ordered | S3 | 300 ms | 3 |
| `econ_build_done` | Building finishes | S3 | 400 ms | 3 |
| `econ_trade` | Trader sets out or route opens | S1 + S2 | 300 ms | 3 |
| `econ_harvest` | Harvest month report (rising if good, falling if famine looms) | S1 | 300 ms | 3 |
| `realm_research_pick` | Choosing what scholars study | S1 + S3 | 200 ms | 3 |
| `realm_law` | Law, policy or reform set | S3 | 400 ms | 2 |
| `realm_ruler_dies` | Ruler dies; then `ruler_new` stinger | S3 | 1.2 s | 1 |
| `realm_heir_born` | Heir born | S3 | 500 ms | 3 |
| `realm_stability_up` / `realm_stability_down` | A lord's loyalty steps up / down (D-AUD-2) | S1 | 200 ms | 3 |
| `realm_unrest` | Province unrest crosses a threshold | S2 + S1 | 400 ms | 2 |
| `realm_rising` | Rebels rise | S2 + S3 | 900 ms | 1 |
| `realm_fire` | Burned homes, plunder, scorched earth (quiet, sombre) | S2 | 600 ms | 3 |
| `realm_plague` | Outbreak reaches a player province | S3 | 800 ms | 2 |
| `diplo_envoy_sent` | Envoy or offer sent | S2 + S1 | 300 ms | 3 |
| `diplo_accepted` / `diplo_refused` | Answer comes back (court horn, palette lead) | S1 | 300 ms | 2 |
| `diplo_peace_signed` | Peace signed (before the music stinger) | S3 + S2 | 500 ms | 2 |
| `event_open` | Event card opens (music event stinger over it) | S2 | 250 ms | 2 |
| `event_choice` | Option picked | S1 + S3 | 200 ms | 2 |
| `event_chain_next` | Event follows an earlier choice | S2 | 250 ms | 2 |
| `notify_ping` | Routine notification | S1 | 80 ms | 4 |
| `notify_alert` | Urgent (army in danger, castle closed, pay owed) | S1 | 200 ms | 2 |
| `notify_war` | War notification away from the front | S1 + S2 | 300 ms | 2 |
| `notify_battle_far` | Player's battle starts off screen | S2 + S3 | 400 ms | 2 |
| `notify_diplo` | Diplomatic message | S1 | 200 ms | 3 |
| `notify_batch` | More than four notifications in one turn | S1 | 300 ms | 3 |
| `amb_sea_coast` | Coastal sea: surf in slow swells | noise, occasional wavetable notes | 4–12 s loop | — |
| `amb_sea_ocean` | Open ocean: wind, long low swells | noise, occasional wavetable notes | 4–12 s loop | — |
| `amb_wind_plain` | Plains, steppe, drylands | noise, occasional wavetable notes | 4–12 s loop | — |
| `amb_forest` | Forest, taiga | noise, occasional wavetable notes | 4–12 s loop | — |
| `amb_jungle` | Jungle, rainforest | noise, occasional wavetable notes | 4–12 s loop | — |
| `amb_desert` | Desert | noise, occasional wavetable notes | 4–12 s loop | — |
| `amb_mountain` | Hills and mountains | noise, occasional wavetable notes | 4–12 s loop | — |
| `amb_marsh` | Marsh | noise, occasional wavetable notes | 4–12 s loop | — |
| `amb_town` | Big settlement at local zoom; factory whistle from era V | noise, occasional wavetable notes | 4–12 s loop | — |
| `amb_war_front` | Province with active siege or battle at local zoom | noise, occasional wavetable notes | 4–12 s loop | — |

Group counts: ui 21, frame 6, turn 5, map 8, army/fleet 15, battle 18, siege 10, sea 5, econ 8, realm/diplo 14, event/notify 9, amb 10 = 129.

**Moment ownership** (effects §7.1)

| Moment | Music | Effects |
|---|---|---|
| War declared | `war_declared` | nothing |
| Battle result | `battle_won` / `battle_lost` | `battle_rout` before it, then silent |
| Peace signed | `war_won` / `war_lost` | `diplo_peace_signed` first |
| Invention adopted | `innovation` | nothing |
| Discovery | `discovery` | `map_fog_reveal` when the land appears on screen |
| New ruler | `ruler_new` | `realm_ruler_dies` first if the old ruler died |
| Event popup | `event_good` / `event_bad` / `event_major` | `event_open` |
| Age begins | `age_<id>` | nothing |

**Haptics** (phones; Capacitor Haptics): `ui_error` light, `turn_ready` light, `battle_start` medium, `siege_breach` medium, `realm_ruler_dies` heavy (once).

**Effect era variants**: turn chimes (game-year era): Era I 12.5 % duty doubling and no bell; each later era adds one arpeggio step; Era V adds a short sustained swell on S3 (D-AUD-1); the notes never change. Marching (army era): I–II frame drum and loose steps; III–IV field drum and measured steps; V–VI snare and boots; VII engine drone on noise with motor transport. Shooting by config `military_bands`: bow I–II, crossbow I–II, matchlock II–III, volley IV–V, rifle V–VI, mg VI–VII.

### Domain services
- **Synth** (AudioWorklet; fallback OscillatorNode with PeriodicWave and a looping noise buffer).
- **Scheduler** (main thread, ~100 ms lookahead) for music and map/battle sounds; **direct path** for UI sounds.
- **MusicDirector**, **EffectsMixer**, **TurnResultsPlayer**, **AmbienceSelector**.
- **Build compiler** for MML and `.sfx` with checks.

## 5. Requirements

### Originality and sound character (both)
- AUD-001 The audio context shall use only original music, with no melody, track name or soundtrack structure from Europa Universalis or any other commercial game, no national anthems and no modern copyrighted songs; public-domain folk tunes may inspire an idiom only, with every melody newly written. [music intro]
- AUD-002 The audio context shall make every effect original and synthesized, with no samples, no sound from another game and no recorded real-world audio. [sfx intro]
- AUD-003 The audio context shall synthesize every effect at runtime on the PH-5 chip, and play the music's own written tunes from note data on the sampled period instruments of D-AUD-16; the only audio files it ships are those instrument packs (one pack of single notes per instrument), never a recorded piece of music. [music §2, §7.1; sfx §3; D-AUD-16]

### PH-5 music voices
- AUD-004 The audio context shall play music on five voices at most: P1 and P2 (pulse, duty 12.5/25/50/75 %, 16-step volume envelope, vibrato, pitch slide), T (4-bit stepped triangle, on/off only), W (32-sample 4-bit wavetable, swappable per pattern) and N (noise, long and short LFSR, envelope). [music §2]
- AUD-005 While the music era is V, the audio context shall allow one optional sixth music voice, a second wavetable W2 for brass and string sections. [music §2; config eras.bands V extra_voice]
- AUD-006 The audio context shall fake chords with arpeggios and never play chords on one voice. [music §2]
- AUD-007 The audio context shall store a tuning table (cents per scale degree) per track. [music §2]
- AUD-008 The audio context shall allow pitch slides, vibrato, duty sweeps, volume envelopes, one short echo (one tap, 60–250 ms, used sparingly) and per-voice pan up to 30 % off centre, and shall not allow samples other than the instrument packs (D-AUD-16), reverb tails or more voices. [music §2; D-AUD-16]
- AUD-009 The audio context shall place bass lines an octave higher than a console would and keep the triangle's stepped shape, so bass is heard on phone speakers that can't reproduce much below about 200 Hz. [music §2]
- AUD-010 The audio context shall apply a gentle low-pass around 9 kHz to the master mix. [music §2; config mix.master_lowpass_hz]

### Hegemony motif
- AUD-011 The audio context shall quote the Hegemony motif (degrees 1 – 5 – 4 – 5 – 1↑, long–short–short–long–long) at least once in every track. [music §3.1]
- AUD-012 The `title` track shall state the motif plainly, and every age stinger shall end on it. [music §3.1, §4.6]
- AUD-013 The `turn_end` effect shall play motif notes 1 – 5 and the `turn_ready` effect shall answer with notes 4 – 5 – 1↑. [sfx §1, §5.3]

### Music eras
- AUD-014 The audio context shall pick the music era from the game year using the bands I from the start (1378)–1519, II 1520–1649, III 1650–1789, IV 1790–1869, V 1870–31 August 1939. [music §3.2; config eras; plan-1378 §3.1]
- AUD-015 The audio context shall take era boundaries from configuration. [music §3.2]
- AUD-016 The audio context shall use the calendar as the only era basis in play, keeping the technology basis in config, turned off and not offered as a campaign rule (D-AUD-4). [music §3.2, §10.2; config eras.basis]
- AUD-017 The audio context shall play no music for ages that fall after the campaign end (Decolonization, Cold War, Globalization) and have no era after V; music stops at the campaign end. [music §3.2; config eras.campaign_end]

### Palettes
- AUD-018 The audio context shall pick one of twelve palettes from the player's primary culture group as in the palette table. [music §3.3; config palettes]
- AUD-019 The audio context shall map the turkic culture group to `mena` when the nation's capital is west of longitude 55, otherwise to `steppe`. [config palettes.split]
- AUD-020 Where a colonial nation was founded after 1500, the audio context shall use the single Atlantic and creole palette (`atlantic_creole`), with no blend (D-AUD-11). [music §3.3]
- AUD-021 When a nation's primary culture changes, the audio context shall change its palette from the next track on. [music §3.3]

### Track list
- AUD-022 The audio context shall make loops 60–150 s long with intros of 2–8 s and stingers of 3–10 s, and play each loop one or two times before the next pick. [music §4]
- AUD-023 The audio context shall play the six interface and frame tracks on their screens: `title` on `title` and `main_menu`, `nation_select` on `new_campaign`, `load_resume` on `loading` and when coming back to the app, `game_over` on `game_over`, `campaign_end` on `campaign_end`, `credits` on `credits`. [music §4.1, §5.2]
- AUD-024 While the `new_campaign` screen highlights a nation, `nation_select` shall swap its lead timbre to that nation's palette (same notes, swapped W wavetable and tuning). [music §4.1]
- AUD-025 When `load_resume` plays, the audio context shall play its 6 s intro then hand over to the normal pick. [music §4.1]
- AUD-026 The audio context shall provide two peace tracks per palette, `peace_<palette>_early` (written for Eras I–III) and `peace_<palette>_late` (Eras IV–V), each stored once with era arrangement variants (melody and harmony stay; tempo, percussion and wavetables follow the current era). [music §4.2]
- AUD-027 The audio context shall provide one era theme per era (`era_1` … `era_5`), shared by all nations. [music §4.3]
- AUD-028 The audio context shall provide the seven situation tracks `diplomacy`, `prosperity`, `unrest`, `crisis`, `revolution`, `exploration` and `world_war`, each played while its condition holds. [music §4.4]
- AUD-029 While rebels are in the field, `unrest` shall add its second layer. [music §4.4]
- AUD-030 The audio context shall provide the five layered war tracks `war_mobilize`, `war_campaign`, `war_siege`, `war_naval` and `war_losing`, with layers fading in and out at bar lines. [music §4.5]
- AUD-031 While the player is at war, `war_campaign` shall add layer 2 when a player army is within 2 provinces of an enemy and layer 3 when a battle is fought this turn. [music §4.5; config war_layers]
- AUD-032 The audio context shall change war percussion with the era (frame drum → field drum → snare and bass drum → mechanized, noise-heavy) and let the lead follow the palette. [music §4.5]
- AUD-033 The audio context shall provide the 21 stingers: nine `age_<age_id>`, `war_declared`, `battle_won`, `battle_lost`, `war_won`, `war_lost`, `discovery`, `innovation`, `ruler_new`, `alliance`, `event_good`, `event_bad`, `event_major`, each played on its moment; a peace with neither gain nor loss (white peace) plays no stinger (D-AUD-10). [music §4.6]
- AUD-034 When a rival declares war on the player, `war_declared` shall play in the attacker's palette. [music §4.6, §10.4]
- AUD-035 The audio context shall ship 47 loops (6 + 24 + 5 + 7 + 5) and 21 stingers in the first release. [music §4.6]

### Music director
- AUD-036 The audio context shall run the music director on the main thread from each turn's results and UI state, never inside the engine. [music §5.1]
- AUD-037 The music director shall read the UI (screen id, realm book tab, camera region and zoom, foreground or background), the player nation (primary culture group, at war, war trend, armies near enemies, sieges, battles this turn, capital occupied, lords' loyalty, unrest share, treasury trend) and the world (game year, active ages, periods and event chains with music tags, great powers at war) (D-AUD-2). [music §5.1]
- AUD-038 The music director shall keep one music state, chosen by the highest-priority rule that holds in the priority stack. [music §5.2]
- AUD-039 While a screen marked "unchanged" in the screen list is open, the music director shall keep the current state. [music §5.2]
- AUD-040 The music director shall enter each state when its threshold holds, using the thresholds in `music.yaml` `states`: `war_losing` over 0.5 of the player's peace voices accepting the enemy's terms or the capital occupied; `unrest` 0.25 of provinces Plotting or Risen; `prosperity` 10 years at peace, treasury rising, no Disloyal lord and at least half Loyal; `world_war` 0.6 of the 8 great powers at war from Era V (D-AUD-2). [music §5.2, §6.2; config states]
- AUD-041 The audio context shall play stingers on top of the music, ducking it by 6 dB, or in the gap between two tracks; a stinger is never a state. [music §5.2, §5.3]
- AUD-042 The music director shall decide a state change only at turn end or on a screen change. [music §5.3]
- AUD-043 When the state changes, the music director shall wait for the next bar line (war, crisis) or the next phrase end (peace, at most 8 bars) and crossfade over one bar; layer changes fade over one bar. [music §5.3]
- AUD-044 The music director shall hold a state at least 45 s; a war that lasts one turn still gets its stinger. [music §5.3]
- AUD-045 When the state goes down in priority (war ends, crisis ends), the music director shall play the matching stinger, then 3–6 s of silence, then the new state from its intro. [music §5.3]
- AUD-046 When the state goes up in priority (war starts), the music director shall cut in at the next bar. [music §5.3]
- AUD-047 When an event popup opens, the audio context shall play its stinger and duck the music under it without changing state. [music §5.3]

### Peace rotation
- AUD-048 While in peace rotation, the music director shall pick with weights own palette 60 %, era theme 20 %, the palette of the region the camera has looked at for the last 20 s at regional zoom 15 %, a neighbour's palette 5 %. [music §5.4; config rotation]
- AUD-049 The music director shall apply "you hear where you look" only at track changes, never mid-track. [music §5.4]
- AUD-050 The music director shall never repeat any of the last 3 tracks. [music §5.4]
- AUD-051 The music director shall play each peace track 1–2 loops, then 10–40 s of silence before the next. [music §5.4]
- AUD-052 The music director shall choose a track's era variant when the track starts. [music §5.4]
- AUD-053 When an era changes, the next peace track shall be that era's theme, in full, preceded by the age stinger that caused the change. [music §5.4]
- AUD-054 Where the variety setting is "own palette only" (the default, D-AUD-3), the music director shall pick only from the player's own palette. [music §7.3]

### Zoom mix
- AUD-055 Where zoom mix is on, the audio context shall play the full arrangement at world view and, at local zoom, drop percussion 3 dB and bring the lead forward (+1 dB). [music §5.5; config zoom_mix]
- AUD-056 Where zoom mix is on and the camera is over a battle province in wartime at local zoom, `war_campaign` layer 3 shall come in even between battles. [music §5.5]

### Effects bank
- AUD-057 The audio context shall give effects their own bank of three voices — S1 (pulse, duty 12.5/25/50/75 %, 16-step envelope, pitch sweep, arpeggio up to 4 steps), S2 (noise, long and short LFSR, 16-step envelope, noise-pitch sweep), S3 (stepped triangle or 4-bit wavetable per sound) — beside the music's voices. [sfx §3, §15.1]
- AUD-058 The audio context shall never let an effect take a music voice. [sfx §3, §15.1]
- AUD-059 The audio context shall run each effect as a short program ticked at 60 Hz, each tick setting pitch, volume, duty or noise mode per voice. [sfx §3, §9.1]
- AUD-060 The audio context shall let S3 use any music wavetable. [sfx §3]
- AUD-061 The audio context shall route effects to their own bus with its own volume, the same 9 kHz low-pass and the same 30 % maximum pan as the music. [sfx §3]
- AUD-062 The audio context shall keep every effect under 2 s (most under 300 ms) except ambience, with no reverb tails, and the one-tap echo for large sounds only. [sfx §1, §2.3]
- AUD-063 The audio context shall put nothing important below 200 Hz in effects; cannon thump comes from a noise burst and a fast pitch drop that starts high. [sfx §2.5]

### Era and region for effects
- AUD-064 The audio context shall keep fixed sounds (taps, toggles, errors, scrolls, the map) the same in every year. [sfx §4.1]
- AUD-065 The audio context shall change game-year sounds (turn chimes, notification pings, the event scroll) with the music era, by small changes only. [sfx §4.1; config era.turn_chimes]
- AUD-066 The audio context shall change army sounds (marching, shooting, guns, charges, sieges, ships) with the warfare era of the army's own inventions (I–VII), so two armies of different eras on one field sound different. [sfx §4.1; config era.military]
- AUD-067 The audio context shall give the palette's wavetable and tuning only to the effects on the config `palette_sounds` list (the turn chimes, the court horn, `army_levy_call`, `diplo_accepted`, `diplo_refused`, `notify_diplo`, `frame_nation_pick`) (D-AUD-7); all other effects are shared, and battle sounds differ by era and troop type, not culture. [sfx §4.2]
- AUD-068 The audio context shall vary the turn chimes by era without changing their notes: Era I a 12.5 % duty doubling and no bell, each later era one more arpeggio step, Era V a short sustained swell on S3, never on a music voice (D-AUD-1). [sfx §5.3]
- AUD-069 The audio context shall stop the effects catalogue at warfare era VII and music era V, with nothing for 1945 onward. [sfx §4.1]

### The catalogue
- AUD-070 The audio context shall provide the 129 effects of the catalogue, ids `<group>_<name>`, each played on its moment as listed. [sfx §5]
- AUD-071 The audio context shall give no effect to a moment the music marks with a stinger. [sfx §5, §7.1]
- AUD-072 When an autosave finishes, the audio context shall play nothing. [sfx §5.3, §14]
- AUD-073 When the engine is still computing 600 ms after End turn, the audio context shall tick `turn_working` every 500 ms until the turn is ready, and never on fast turns. [sfx §5.3; config turn_working]
- AUD-074 When a province changes hands on screen and neither side is the player, `map_border_change` shall be silent. [sfx §5.4]
- AUD-075 When an army's food reserve runs low, `army_hungry` shall repeat only when it gets worse. [sfx §5.5; config cooldown_ms.army_hungry]
- AUD-076 While the battle screen plays at normal speed, the audio context shall follow the order of a bell (orders, shooting, charges, melee, breaking), one sound per bell step from the sector closest to the screen centre, other sectors only if a voice is free. [sfx §5.6; config battle_screen]
- AUD-077 When the player skips ahead in a battle replay (a running battle cannot be skipped, X-1), the audio context shall play only `battle_start`, `battle_rout` and the music stinger. [sfx §5.6]
- AUD-078 The audio context shall give plunder and razing `realm_fire` at low volume and no bright sound. [sfx §5.7, §11]

### Ambience
- AUD-079 Where ambience is on, the audio context shall play the bed chosen by what is under the camera at regional or local zoom, one of the ten `amb_` beds, each a 4–12 s loop of noise and occasional wavetable notes. [sfx §5.12]
- AUD-080 The audio context shall keep ambience off by default; the player turns it on in the Sound card or Settings → Audio. [sfx §5.12, §15.2; music §10.3; D-AUD-17, D-AUD-18]
- AUD-081 The audio context shall not simulate weather beds; in winter months the plain and forest beds are windier. [sfx §5.12]
- AUD-082 Where ambience is on, it shall play under the map at its full level in the silences between tracks and about 10 dB lower under a playing track. [music §5.4; sfx §5.12; D-AUD-17]

### Many things at once
- AUD-083 When a new turn is shown, the turn results player shall play at most 5 effect sounds, 150 ms apart: first things that happened to the player's armies, castles or ruler (highest priority first), then things in view; everything else is shown without sound. [sfx §6.1; config turn_results]
- AUD-084 When five or more notifications arrive in one turn, the audio context shall play `notify_batch` instead of their own sounds. [sfx §6.1, §5.11; config batch_threshold]
- AUD-085 If a new sound needs a voice and none is free, then it shall take the voice of the lowest-priority sound playing if that is lower than its own; otherwise it is dropped. [sfx §6.2; config priority]
- AUD-086 The audio context shall not restart the same sound id within its cooldown (default 50 ms; scroll ticks 40 ms; sliders 20 ms; alerts 2 s; unrest 5 s). [sfx §6.2; config cooldown_ms]
- AUD-087 The audio context shall vary repeating sounds by up to ±1 semitone and a new noise seed, except sounds that carry meaning by pitch (the never-vary list). [sfx §6.2; config variation]
- AUD-088 The audio context shall pan a map sound by its screen position up to 30 %, lower it linearly with distance from the screen centre (edge volume 0.4) and mute it beyond the visible area; `notify_` sounds always play centred and are never muted. [sfx §6.3; config distance]
- AUD-089 The audio context shall play from the map, at world zoom only notifications; at regional zoom also army orders, battle starts, siege breaches, sea battle starts and map sounds; at local zoom everything. [sfx §6.3; config zoom]

### Living with the music
- AUD-090 When the music has a stinger for a moment, the audio context shall not mark the same moment with an effect, except that effects may lead in to a stinger, never playing over its tune. [sfx §7.1]
- AUD-091 While a stinger plays, the audio context shall drop effects of priority 3 to 5 and duck effects of priority 1 and 2 by 4 dB. [sfx §7.2; config ducking]
- AUD-092 The audio context shall let effects duck music only for the six listed sounds (`battle_start`, `siege_breach`, `siege_storm`, `realm_rising`, `realm_ruler_dies`, `sea_battle_start`), by 4 dB for their length; no other sound ducks music, whatever its length (D-AUD-8). [sfx §7.2; config ducking.effects_duck_music]
- AUD-093 The audio context shall duck the ambience bed by 6 dB under any effect of priority 1 or 2 and dip it under the track (AUD-082) over 2 s when a music track starts, bringing it back when the track ends. [sfx §7.2; D-AUD-17]
- AUD-094 While the game menu is open, the audio context shall leave the music unchanged (no duck; `pause_music_db` is dropped, D-AUD-8). [sfx §5.2, §14]
- AUD-095 The audio context shall mix a `ui_tap` about 6 dB below the music's average and let a priority 1 sound peak about 3 dB above it, with the whole mix at −16 LUFS. [sfx §7.3; config mix.target_loudness_lufs]
- AUD-096 When several achievements unlock in one turn, `ui_achievement` shall play once. [sfx §14]

### Data and configuration
- AUD-097 The audio context shall write tracks as MML text, one file per track, in `packages/rules/data/music/tracks/`, compiled to JSON (patterns, order list, loop point, layers, era variants). [music §6.1]
- AUD-098 When tracks are built, the build shall check the voice budget, range per voice, loop length, that the motif appears, and that every id the selector names exists. [music §6.1]
- AUD-099 The audio context shall write each sound as a text block in `packages/rules/data/audio/sfx/<group>.sfx`, compiled to JSON by the same build step. [sfx §9.1]
- AUD-100 When sounds are built, the build shall fail if a sound uses more than three voices, is 2 s or longer (ambience exempt), is named by the director but missing, lacks an era variant a troop type needs, is a `ui_` sound of 10 ms or less, or has no notification or animation named with it. [sfx §9.1, §10]
- AUD-101 The audio context shall keep every number the music director uses in `music.yaml` and every number the effects mixer and director use in `sfx.yaml`, so balancing needs no code change. [music §6.2; sfx §9.2]
- AUD-102 Where an event carries an optional `music:` tag (`event_good`, `event_bad`, `event_major`, `crisis`, `revolution`) or `sfx:` tag, the audio context shall use it. [music §6.2; sfx §9.2]
- AUD-103 The audio context shall map game events to sound ids through the `bindings` table in `sfx.yaml`. [config bindings]

### Engine and platform
- AUD-104 The audio context shall run the PH-5 voices in an AudioWorklet at the device sample rate, fed by a main-thread lookahead scheduler about 100 ms ahead. [music §7.2]
- AUD-105 If the AudioWorklet can't start, then the audio context shall build the same voices from OscillatorNode with PeriodicWave and a looping noise buffer. [music §7.2]
- AUD-106 The audio context shall stay under 2 % of one core on a mid-range phone with music and effects on, checked by the smoke test extended with a music-on run. [music §7.2; sfx §3]
- AUD-107 The audio context shall start audio on the first tap, using the title screen's "Tap to start" as that gesture. [music §7.3; sfx §8]
- AUD-108 If the game cold-starts on mobile, then `frame_logo` shall not play (the splash is silent) and the first sound is `frame_start`; desktop and Steam builds play `frame_logo`. [sfx §8]
- AUD-109 When the app goes to the background or the tab is hidden, the audio context shall suspend the AudioContext (stopping music and effects) and, on return, resume with `load_resume`; on desktop it keeps playing instead while the `play_in_background` setting is on (default off) (D-AUD-9). [music §7.3; sfx §8]
- AUD-110 When the player returns from the background, notifications that arrived while away shall play no sound. [sfx §8]
- AUD-111 The audio context shall use the native "ambient" audio session on iOS, which mixes with the player's other audio apps (`mix_with_other_apps`, default on) and respects the ring/silent switch, with effects following the same session as music (D-AUD-9). [music §7.3; sfx §8]
- AUD-112 Where the device is a phone and haptics are on, the audio context shall give a vibration on the five moments (all five light: `ui_error`, `turn_ready`, `battle_start`, `siege_breach`, `realm_ruler_dies` once; D-AUD-12), on by default, never on desktop, and working with sound off. [sfx §8, §15.3; config haptics]
- AUD-113 The audio context shall start interface sounds within one audio block of the tap (about 3 ms at 128 samples) by a direct message to the worklet, and send map and battle sounds through the scheduler so they line up with animation. [sfx §8; config latency]
- AUD-114 The audio context shall provide the audio settings: master, music, effects and ambience volumes; music on/off (off fully suspends the synth); variety; zoom mix; ambience on/off; interface sounds on/off; haptics; mono; sound captions; reduced intensity. [music §7.3; sfx §14]
- AUD-115 The audio context shall default master volume to 0.8, music volume to 0.7, effects to 0.8 and ambience to 0.5 (when on), interface sounds on, haptics on (phones) and the variety to "own palette only" (D-AUD-3, D-AUD-9). [sfx §7.3, §15; config buses, defaults]

### Accessibility
- AUD-116 The audio context shall give every sound a visual partner (toast, icon flash or animation), so the game is fully playable muted. [sfx §2.2, §10]
- AUD-117 Where sound captions are on, off-screen sounds shall show a small caption at the screen edge toward where they came from (for example "Battle at Troyes" with crossed swords). [sfx §10]
- AUD-118 The audio context shall keep captions off by default and turn them on automatically when the player turns sound off. [sfx §15.5; config captions auto]
- AUD-119 Where mono audio is on, the audio context shall turn pan off. [sfx §10]
- AUD-120 The audio context shall tell rising and falling pairs (gain and loss) apart by rhythm or timbre as well as pitch. [sfx §10]
- AUD-121 Where reduced intensity is on, the audio context shall remove the echo, soften priority 1 sounds by 4 dB and turn off the machine-gun stutter and sharp attacks. [sfx §10]

### Care
- AUD-122 The audio context shall describe musical features in palettes, not ethnic stereotypes, using no "generic exotic" scale shared across unrelated traditions. [music §8]
- AUD-123 The audio context shall have each palette's tracks reviewed by a musician or scholar of that tradition before release, and name them in the credits. [music §8, §9]
- AUD-124 The audio context shall not write music for colonized peoples as an "enemy" or "primitive" side, and shall give Indigenous and African palettes the same development across all five eras as European ones. [music §8]
- AUD-125 When an event marked `depiction: narrative_only` fires, the audio context shall play no stinger at all (D-AUD-11). [music §8]
- AUD-126 The audio context shall never give plunder, razing, massacres, enslavement or `narrative_only` events coins, chimes, fanfares or any rising, rewarding sound (only `realm_fire` or a single low bell at most), and plunder shall add gold silently. [sfx §2.7, §11]
- AUD-127 The audio context shall give colonial conquest no distinct "victory" sound and sound Indigenous and African arms by era and type with the same quality as anyone's. [sfx §11]
- AUD-128 The audio context shall sound era VII machine guns, shells and gas at a distance without exaggeration, with no screams, no voices of the wounded and no speech or crowd recordings anywhere; "shout" sounds are pulse sweeps. [sfx §11, §15.6]

### Tools and production
- AUD-129 The audio context shall provide `/music.html` listing every track with any palette, era variant and layer toggled and live voice usage, with an Effects tab listing every sound by group with any era variant, live voice use and a "busy turn" button firing 40 battle results at once. [music §7.4; sfx §9.3]
- AUD-130 The audio context shall provide a render script that bounces any track or sound (or the whole catalogue) to WAV. [music §7.4; sfx §9.3]
- AUD-131 The audio context shall show on the diagnostics line the current music state, track, layer and why it was chosen, and the last five effects, which were dropped and why. [music §7.4; sfx §9.3]
- AUD-132 The audio context shall have the music written in-house by Claude in MML, each track shipped with a rendered MP3 that Leroy approves by ear before it goes in the game (a failing track is reworked, not shipped), plus the palette culture reviews. [music §9]
- AUD-133 If M1's tracks don't pass the listening gate, then an outside chiptune composer shall be commissioned for the `title` theme and the motif only, keeping the rest in-house. [music §9]
- AUD-134 The audio context shall build music and effects together in milestones M1/S1 to M4/S4 as listed in §10. [music §9; sfx §13]

### Decisions of this pass
- AUD-135 When onboarding reports a step shown, a step finished or a new Needs attention warning, the audio context shall play `ui_hint`, `ui_confirm` or `notify_alert`, with no sound for the vizier's note and no music duck. [D-AUD-6]
- AUD-136 While several of the player's battles run at once (X-1), the audio context shall play battle bell-step effects only for the battle shown in the battle view, and switch them when the player switches battles. [X-1]
- AUD-137 With turns one week long (X-18), the audio context shall play `turn_end` and `turn_ready` every turn, and shall play the month, season and year cues (`turn_month_new_year`, the era theme, the yearly checks' sounds) once, in the turn in which that month, season or year begins. [X-18]

### How the player uses it
- AUD-138 The audio context shall put every sound setting the player needs while playing in one Sound card, opened from the speaker button in the side tools beside the map mode button and the commanders: what is playing now and why the director chose it, master volume, music on/off with its volume, effects volume, and button sounds on/off; the full list of AUD-114 stays in Settings → Audio. [X-19; playtest 17 Oct "pull music and sounds forward"]
- AUD-139 The speaker button shall show at a glance whether music is off (a struck speaker) or on, so the state needs no card opened. [X-19]
- AUD-140 The Sound card shall work on a phone in landscape: one column of 44-point rows (sliders, toggles), inside the safe areas, fitting a 375-point-high screen without scrolling, and nothing that needs hover. [X-19]
- AUD-141 Until the MML track build (AUD-097) and the AudioWorklet synth (AUD-104) exist, the client shall synthesize the chip's tracks and effects in the page into sample buffers, a track at a time between frames, and stand a written track in for any track id of the list not yet written (palette peace tracks share one tune per half of the eras, played in each palette's tuning, key and wavetable). [D-AUD-13]
- AUD-142 Sound settings shall be kept on the device (Device group, SET-023), never in a save. [SET-023]
- AUD-143 The client shall play the music, not the effects, on softened voices: the pulse, bass and wavetable voices band-limited with their upper harmonics rolled off and smooth (not 16-step) envelopes, a pad voice that holds each bar's chord, tuned drums (falling-pitch skins, a woodblock, brushed and breathy noise) in place of raw noise bursts, a low-pass at 6 kHz and a small hall; a loop's hall tail wraps into its start so it repeats without a seam. The effects stay on the chip voices of AUD-057. [D-AUD-14; playtest 17 Oct, feedback 79]
- AUD-145 The client shall play every music voice on its palette's band of sampled instruments (D-AUD-16): the lead (P1) on the band's lead, or its war lead on war tracks and battle stingers; the answer (P2), the regional voice (W), the bass (T) and the held chords (S) on theirs; a part that asks for its own timbre (a horn, an organ) on the instrument standing for it; the kick, boom and wood drums on sampled taiko, timpani and woodblock, with the snare and crash staying synthesized. A note takes the nearest sample and is retuned to its pitch, so each palette's tuning table plays true; bowed, blown and sung notes held past their sample loop its middle. [D-AUD-16]
- AUD-146 The client shall fetch a palette's instrument packs before the first track of that palette and keep them for the visit; a pack that can't be fetched or decoded plays its parts on the soft chip voices of AUD-143, so the music never stops for a missing file. [D-AUD-16; AUD-111]
- AUD-147 The More card of the start screen shall credit the instruments: "Music played on the Fluid R3 GM soundfont by Frank Wen (CC BY 3.0)." [D-AUD-16]
- AUD-148 The client shall synthesize each ambience bed as a 12-second stereo loop, in a worker where the browser allows one: wind as moving bands of noise with gusts, surf in swells, birds as quick gliding whistles, cicadas, frogs, a town's murmur with a bell and a smith's hammer, and far thumps and clangs at a war front, under a gentle low-pass so nothing hisses. It shall pick the bed each second from the province in the middle of the map, with regional zoom from 2 and local zoom from 8, and a big settlement being a capital or a province of at least 100,000 people; a new bed crosses over the old one in 2 s. The Sound card shall carry an Ambience row (volume and On/Off) beside Effects, and Settings → Audio its two rows. [D-AUD-17; AUD-138]
- AUD-144 The written tunes shall be harmony first: every bar has a chord, the lead lands on a note of it on the beat, the bass walks the chord roots and fifths, and peace tunes use chords on degrees 1, 3, 4 and 5 only, so they stay consonant in every palette. A held chord drops any note within a semitone or a tritone of a lower one in the palette's tuning. [D-AUD-15; feedback 79]

## 6. Commands

| Command | Who issues it | Preconditions | Result | Events emitted |
|---|---|---|---|---|
| StartAudio | Player (first tap) | Audio context not started | AudioContext started | AudioStarted |
| SuspendAudio / ResumeAudio | System (app background / foreground) | — | Context suspended / resumed with `load_resume` | — |
| EvaluateMusicState | System (turn end, screen change) | — | State and track chosen per priority stack | MusicStateChanged |
| PlayStinger(id, palette) | System | Moment with a stinger | Stinger over or between tracks, music ducked | — |
| PlaySound(id, position) | System (bindings) | Sound exists; cooldown passed; zoom and distance allow | Sound plays or is dropped | SoundDropped (diagnostics) |
| PlayTurnResults(results) | System (new turn shown) | — | Up to 5 sounds or `notify_batch` | — |
| SetAudioSetting(key, value) | Player (settings) | — | Bus or switch updated live | — |
| Haptic(moment) | System | Phone, haptics on | Vibration | — |
| BuildAudio | Developer | — | Tracks and sounds compiled and checked | — |

## 7. Domain events

| Event | When | Payload | Consumed by |
|---|---|---|---|
| MusicStateChanged | Director picks a new state | state, track, reason | diagnostics |
| AudioStarted | First tap | — | game-shell (splash/title sound) |
| SoundDropped | No voice, cooldown, stinger ducking | id, reason | diagnostics |
| CaptionShown | Off-screen sound with captions on | text, direction | game-shell |

## 8. Policies (reactions to other contexts)

- When game-shell changes screen, then evaluate the music state (screen rules first).
- When time-and-turns ends a turn, then evaluate the music state and play the turn results.
- When warfare declares a war involving the player, then play `war_declared` (attacker's palette if a rival declared on the player); when a battle result is shown, `battle_rout` then `battle_won`/`battle_lost`; when peace is signed, `diplo_peace_signed` then `war_won`/`war_lost`.
- When warfare reports battle bells, charges, melee, routs, siege steps, then play the matching effect per §5 rules.
- When naval reports a sea battle, broadside, sinking, blockade or landing, then play the `sea_` sound.
- When events opens an event, then play `event_open` and the event's music stinger (from its tag); for `narrative_only` no stinger (D-AUD-11).
- When events starts an age, then play `age_<id>`; when the era changes, queue the era theme in full.
- When research reports an invention adopted, then play `innovation`.
- When exploration reports a discovery, then play `discovery` and `map_fog_reveal` when land appears on screen.
- When realm reports a ruler's death, then play `realm_ruler_dies` then `ruler_new`; a new ruler or government without death → `ruler_new`.
- When diplomacy reports an alliance or major treaty signed, then play `alliance`.
- When culture reports a change of primary culture, then change the palette from the next track.
- When achievements reports AchievementUnlocked, then play `ui_achievement` once per turn.
- When onboarding shows a tutorial step or hint, then play `ui_hint`.
- When saves completes a manual save, then play `ui_save`; an autosave plays nothing.
- When settings change an audio setting, then apply it live.

## 9. Each turn

1. Read (after every simulation step and the turn report are ready): the player's war state, war trend,
   battles and sieges this turn, capital occupied, unrest share, lords' loyalty, treasury trend, active ages,
   periods and chains with music tags, game year (era), culture group.
2. Evaluate the music state; schedule the transition at the next bar or phrase.
3. Play the turn results (≤ 5 sounds, 150 ms apart, or `notify_batch`).
4. `turn_ready` (or `turn_month_new_year` in January).
Audio runs on the client main thread and never feeds back into the engine.

## 10. Configuration

| Key | Meaning | Value in the design | Placeholder? | Config file |
|---|---|---|---|---|
| `eras.basis` | calendar or technology | calendar | no (decided) | music.yaml |
| `eras.bands` | Era start years | I 1378 (the start), II 1520, III 1650, IV 1790, V 1870 (W2) | yes ("design values for a first pass") | music.yaml |
| `eras.campaign_end` | Music stops | 1939-08-31 | no | music.yaml |
| `palettes.*` | Culture group → palette | as palette table | yes | music.yaml |
| `palettes.split.turkic` | Longitude split | west of 55 → mena, else steppe | yes | music.yaml |
| `states.war_losing` | Share of peace voices accepting the enemy's terms above / capital occupied | 0.5 / true | yes | music.yaml |
| `states.world_war` | Great powers (8 with most provinces) at war share, min era | 8, 0.6, V | yes | music.yaml |
| `states.war_naval` | Naval battle share in the last 5 months (X-18) | 0.6 | yes | music.yaml |
| `states.war_siege` | Siege active, field battles in the last 3 months (X-18) | true, 0 | yes | music.yaml |
| `states.war_mobilize` | Months since declaration max (X-18), battles fought | 2, 0 | yes | music.yaml |
| `states.revolution` | Period tag, touches player, min era | revolution, true, IV | yes | music.yaml |
| `states.crisis` | Event chain tag | crisis | yes | music.yaml |
| `states.unrest` | Share of provinces Plotting or Risen | 0.25 | yes | music.yaml |
| `states.prosperity` | No Disloyal lord, Loyal share at least, treasury trend, years at peace | true, 0.5, rising, 10 | yes | music.yaml |
| `states.exploration` | Explorers active, camera over | true, ocean | yes | music.yaml |
| `transitions.min_seconds_in_state` | Min time in state | 45 | yes | music.yaml |
| `transitions.boundary` | Up / down | bar / phrase | yes | music.yaml |
| `transitions.max_phrase_wait_bars` | Phrase wait | 8 | yes | music.yaml |
| `transitions.crossfade_bars` | Crossfade | 1 | yes | music.yaml |
| `transitions.silence_after_stinger_seconds` | Silence after a down stinger | 3–6 | yes | music.yaml |
| `transitions.stinger_duck_db` | Music duck under stinger | −6 | yes | music.yaml |
| `rotation.weights` | Own, era theme, camera, neighbour | 0.60, 0.20, 0.15, 0.05 | yes | music.yaml |
| `rotation.camera_dwell_seconds` / `camera_min_zoom` | Look time / zoom | 20 / regional | yes | music.yaml |
| `rotation.no_repeat_last` | Tracks not repeated | 3 | yes | music.yaml |
| `rotation.loops_per_track` | Loops | 1–2 | yes | music.yaml |
| `rotation.silence_between_seconds` | Silence | 10–40 | yes | music.yaml |
| `rotation.era_change_plays_theme` | Era theme after change | true | yes | music.yaml |
| `war_layers.war_campaign` | Layer 2 / layer 3 conditions | within 2 provinces / battle this turn | yes | music.yaml |
| `war_layers.layer_fade_bars` | Layer fade | 1 | yes | music.yaml |
| `zoom_mix` | enabled; local percussion, lead; battle province layer 3 | true; −3 dB, +1 dB; true | yes | music.yaml |
| `mix.master_lowpass_hz` | Low-pass | 9000 | yes | music.yaml / sfx.yaml `bank.lowpass_hz` |
| `mix.max_pan` | Pan limit | 0.3 | yes | both |
| `mix.target_loudness_lufs` | Loudness | −16 | yes | music.yaml |
| `defaults.music_volume` / `sfx_volume` | Defaults | 0.7 / 0.8 | yes | music.yaml |
| `defaults.variety` | Variety | own_palette (D-AUD-3) | no (decided) | music.yaml |
| `defaults.ambience` | Ambience | false | no (decided) | music.yaml |
| `bank.voices` / `tick_hz` / `max_length_ms` | S1–S3, 60, 2000 | — | yes | sfx.yaml |
| `buses` | master 0.8, music 0.7, effects 0.8, ambience 0.5, ui_sounds true, ambience_on false, haptics true, mono false, captions auto, reduced_intensity false | — | yes | sfx.yaml |
| `era.ui` / `turn_chimes` / `military` | fixed / music_era / army_inventions | — | no | sfx.yaml |
| `era.military_bands` | bow I–II, crossbow I–II, matchlock II–III, volley IV–V, rifle V–VI, mg VI–VII | — | yes | sfx.yaml |
| `palette_sounds` | turn_end, turn_ready, turn_month_new_year, army_levy_call, diplo_accepted, diplo_refused, notify_diplo, frame_nation_pick | — | yes | sfx.yaml |
| `priority.defaults_by_group` | ui 3, frame 1, turn 1, map 3, army 2, fleet 2, battle 3, siege 3, sea 3, econ 3, realm 2, diplo 2, event 2, notify 3 | — | yes | sfx.yaml |
| `priority.steal_only_if_lower` | Voice stealing rule | true | no | sfx.yaml |
| `cooldown_ms` | default 50, ui_scroll_tick 40, ui_slider 20, notify_alert 2000, army_hungry once_per_worsening, realm_unrest 5000 | — | yes | sfx.yaml |
| `variation` | pitch ±1 semitone, reseed noise, never_vary list | — | yes | sfx.yaml |
| `turn_results` | max 5, spacing 150 ms, order, batch threshold 5 | — | yes | sfx.yaml |
| `turn_working` | start after 600 ms, tick 500 ms | — | yes | sfx.yaml |
| `zoom` | world [notify]; regional [notify, army_orders, battle_start, siege_breach, sea_battle_start, map]; local all | — | yes | sfx.yaml |
| `distance` | linear, edge 0.4, offscreen mute | — | yes | sfx.yaml |
| `ducking` | during stinger drop ≤3 / duck −4 dB; effects duck music only for the listed six, −4 dB (D-AUD-8); no pause duck; ambience −6 dB under pri ≥2; ambience fade 2 s | — | yes | sfx.yaml |
| `battle_screen` | 1 sound per bell step, nearest centre, extra if voice free, on replay skip [battle_start, battle_rout] | — | yes | sfx.yaml |
| `haptics` | all five light: ui_error, turn_ready, battle_start, siege_breach, realm_ruler_dies (D-AUD-12) | — | no (decided) | sfx.yaml |
| `latency` | ui direct, map scheduled | — | no | sfx.yaml |
| `bindings` | game event → sound id (turn.end_pressed → turn_end … hint.shown → ui_hint) | — | — | sfx.yaml |
| Music length targets | loop 60–150 s, intro 2–8 s, stinger 3–10 s | — | yes | design |
| CPU budget | < 2 % of one core, mid-range phone | — | yes | design |

Production milestones: M1/S1 proof of sound (PH-5 synth, scheduler, `/music.html`, MML compiler, `title`,
`peace_europe_early`, `peace_mena_early`, `war_campaign` with 3 layers, `war_declared`, `battle_won`,
`battle_lost`; SFX bank, direct path, `.sfx` compiler, Effects tab, all `ui_` and `turn_` sounds,
`econ_income`, `econ_spend`, `map_select_province`); M2/S2 playable loop (director, `music.yaml`, event
tags, mobile behaviour, `nation_select`, `diplomacy`, `crisis`, `war_mobilize`, `war_losing`, `era_1`,
`era_2`; priorities, cooldowns, turn results, ducking, `sfx.yaml`, haptics, `frame_`, `notify_`, `event_`,
army orders, `battle_start`, `battle_rout`); M3/S3 the world (early tracks for all palettes, remaining war
and mood tracks, first five age stingers; battle set era I–IV, siege, sea, economy, realm, diplomacy); M4/S4
the centuries (late tracks, era themes 3–5, remaining age stingers, era matrix, cultural reviews; era V–VII
variants, ambience, captions, reduced intensity, loudness pass).

## 11. Seams

| Other context | Direction | Pattern | What crosses |
|---|---|---|---|
| game-shell | upstream | Published Language | Screen ids and their music column ("unchanged", stinger only), realm book tab, pause, splash/"Tap to start", toasts and captions shown |
| settings | upstream | Conformist | Audio settings values (volumes, switches, variety, zoom mix, ambience, haptics, mono, captions, reduced intensity, mix with other apps) |
| time-and-turns | upstream | Conformist | Turn end, turn ready, game year (music era), January |
| map-presentation | upstream | Conformist | Camera position, region and zoom level, what is on screen |
| world-map | upstream | Conformist | Terrain under the camera (ambience, province knock pitch), ocean vs coast |
| culture | upstream | Conformist | Player's primary culture group and its changes; culture mix |
| scenario-setup | upstream | Conformist | Capital longitude (turkic split), colonial nation founding date |
| warfare | upstream | Published Language | War declared, war trend, capital occupied, battles and bells, sectors, routs, sieges, army era from inventions, troop types |
| naval | upstream | Published Language | Sea battles, broadsides, sinkings, blockades, landings, fleet orders |
| troop-movement | upstream | Published Language | March orders, arrival, winter quarters |
| recruiting | upstream | Published Language | Levy called, lords called, hiring, regiment trained, disband |
| realm | upstream | Published Language | Ruler death and new ruler, heir born, lords' loyalty and its steps (D-AUD-2), treasury, income, debt, laws |
| province | upstream | Published Language | Harvest report, plague outbreak, unrest threshold |
| rebellions | upstream | Published Language | Rising, rebels in the field, unrest share |
| revolutions | upstream | Published Language | Revolution period touching the player |
| events | upstream | Published Language | Event opened, chain next, choice, `music:` and `sfx:` tags, `narrative_only`, ages |
| research | upstream | Published Language | Invention adopted, research pick, tech for technology era basis |
| exploration | upstream | Published Language | Discovery, explorers and colonists active, fog revealed |
| diplomacy | upstream | Published Language | Alliance or major treaty, envoy sent, answers, diplomatic messages, the 8 great powers (most provinces) and whether they are at war (D-AUD-2) |
| buildings | upstream | Published Language | Building ordered / finished |
| trade | upstream | Published Language | Trader sets out, route opens |
| achievements | upstream | Published Language | AchievementUnlocked → `ui_achievement` |
| onboarding | upstream | Customer–Supplier | Step/hint shown → `ui_hint`; requested step chime, completion tick, new-warning sound |
| saves | upstream | Published Language | Manual save → `ui_save`; autosave silent |

## 12. AI

None. Audio reacts to the player's view and nation only; computer players hear nothing. (`war_declared` uses the attacking AI's palette.)

## 13. Decisions and open questions

- **D-AUD-1** (was OQ-AUD-1) Era V turn chime: the Era V "swell" is played on effects voice S3 as a short sustained note; it never takes music voice W2. Effects never take a music voice.
- **D-AUD-2** (was OQ-AUD-2) Music state inputs: `war_losing` holds while more than half (0.5) of the player's peace voices would accept the enemy's terms, or the player's capital is occupied; the war trend is that share's change since last month. `unrest` holds while 25 % or more of the player's provinces are Plotting or Risen (X-9); the stability clause is dropped. `prosperity` holds at peace for 10 years with a rising treasury, no Disloyal lord and at least half the lords Loyal. `realm_stability_up` / `realm_stability_down` play when one of the player's lords steps up or down in loyalty. `world_war` holds from Era V while 0.6 of the great powers are at war, the great powers being the 8 countries with the most provinces (provisional). "World tension" is not read. There is no war score and no stability stat, so the director reads what exists.
- **D-AUD-3** (was OQ-AUD-3) Variety default: `own_palette` ("My palette only"). Settings owns defaults, and the example yaml is changed to match.
- **D-AUD-4** (was OQ-AUD-4) Era basis: the calendar is the only era basis in play; `era_basis: technology` stays in config, off, and is not offered as a campaign rule. One basis is simpler and needs nothing from research.
- **D-AUD-5** (was OQ-AUD-5) Stale notes: music §10 (16 Oct) is used; the gap list item and the sfx §15 note are stale. The latest decision wins.
- **D-AUD-6** (was OQ-AUD-6) Tutorial sounds: step appears `ui_hint`, step finished `ui_confirm`, new Needs attention warning `notify_alert`, no sound for the vizier's note; none of them duck music. Existing catalogue sounds only.
- **D-AUD-7** (was OQ-AUD-7) Palette-taking effects: the config `palette_sounds` list governs (the turn chimes, the court horn, `army_levy_call` and `frame_nation_pick`). The list is the one place the engine reads.
- **D-AUD-8** (was OQ-AUD-8) Ducking: only the listed six effects duck music; the length rule is only how they were chosen and is not applied to other sounds. The game menu (`frame_pause`) does not duck music; `pause_music_db` is dropped. An explicit list is simpler than a rule with exceptions.
- **D-AUD-9** (was OQ-AUD-9) Platform audio: on iOS the game uses the native "ambient" audio session, which respects the silent switch and mixes with other apps; `mix_with_other_apps` defaults to on. On desktop the settings switch `play_in_background` (default off) is honoured; web always suspends when hidden. Master volume defaults to 0.8. The device check of the iOS session is part of the release device test.
- **D-AUD-10** (was OQ-AUD-10) White peace: a peace with no gain and no loss plays no stinger. Nothing new is added.
- **D-AUD-11** (was OQ-AUD-11) Palettes: there is no blend; Atlantic and creole nations use the single `atlantic_creole` palette. The turkic split by capital longitude 55 (west `mena`, otherwise `steppe`) stays in config. A `narrative_only` major event plays no stinger, so there is no "sombre" variant. Simplest rules that need no new tracks.
- **D-AUD-12** (was OQ-AUD-12) Catalogue defaults: `ui_tooltip` is never played (no setting turns it on); all five haptic moments are "light" (§15.3 is later); the `final_result` screen plays `campaign_end`. The later decision and the screen list win.
- **D-AUD-13** (17 Oct, Leroy: pull music and sound forward for playtesting) The music and effects are built ahead of their milestones in a first cut: the director, 16 written tracks (title, two peace tunes per half of the eras, prosperity, diplomacy, the five war and situation tracks with layers, six stingers) and 30 effects, synthesized in the page (AUD-141). The worklet, the MML build, ambience, captions, haptics and the full catalogue follow in their milestones; the palette tunings are drafts awaiting review (OQ-AUD-13).
- **D-AUD-14** (17 Oct, Leroy: "its not really nice to listen to, it sounds like noise mostly"; the effects are fine) The music leaves the strict PH-5 chip rules of AUD-004 that made it harsh: square and narrow pulses buzzed, the 16-step envelopes and stepped triangle crackled, and the noise voice ticked on most beats. The music keeps the voice roles (P1, P2, T, W, N), the tunes, the motif and the palettes, and plays them soft (AUD-143), with a pad voice holding chords and a small hall where AUD-004 and §2 forbid reverb tails. Measured on the first tracks, spectral flatness (how much of the sound is noise) falls from about 0.36 to under 0.08 and the brightness centre from about 3 kHz to about 1 kHz. The effects keep the chip sound unchanged. The worklet synth (AUD-104) follows this decision when it is built.
- **D-AUD-15** (18 Oct, feedback 79, second pass) The soft voices fixed the sound but not the writing: tunes ignored their chords (in the early peace tune about a fifth of the time two voices rubbed a semitone or tritone apart, up to 46 % in major palettes, where a chord on degree 7 is diminished), the bass's "fifth" was a tritone on some roots, narrow 12.5 % pulses buzzed, and `b6` and `b7` in minor tunes sounded the wrong notes. The tunes are rewritten harmony first (AUD-144) with the motif kept: the title gets eight bars, the early peace tune a pastoral and a dance, the late one a march, and the war, siege and crisis tracks follow their chords. Clashes fall to about 5 % of the time (passing notes) in every palette, and the lead sits on its chord more than 95 % of the time.
- **D-AUD-16** (19 Oct, Leroy chose "Real instruments" after the play-hook review, `research/play-hook.md`) The music, reworked twice on chip voices (D-AUD-14, D-AUD-15), still sounded like noise, and EU4's hold comes partly from a score on real instruments. Our own tunes, the motif and the music director stay, but every music voice plays on sampled period instruments (AUD-145), one band per palette: Western Europe recorder, flute and lute (nylon guitar), Eastern Europe fiddle and dulcimer, the Middle East oboe and qanun (koto) with the shawm in war, the Steppe fiddle and dombra (shamisen), South Asia flute and sitar, East Asia shakuhachi and koto, Southeast Asia flute and gambang (marimba), West Africa kora (harp) and balafon (marimba), East and Southern Africa flute and mbira (kalimba), the Americas pan flute and ocarina, Oceania flute and marimba, the Atlantic fiddle and banjo; cello and a string section under all of them, a choir under the title, trumpets, horns or shawms leading in war. The notes come from the Fluid R3 GM soundfont (Frank Wen, CC BY 3.0, credited by AUD-147), cut by `tools/music-samples` into 27 packs of 2 to 15 notes (3.6 MB in all, about 1 MB a palette). It overturns "no samples, no audio files" for the music only (AUD-003, AUD-008); the effects keep the chip (AUD-002).
- **D-AUD-17** (19 Oct, Leroy chose "Real instruments", which put the map ambience on by default with it) EU4's map is never silent. The ambience bed goes on by default (AUD-080) and plays under the music, about 10 dB down, and at full level in the silences between tracks (AUD-082, AUD-093), where before it was off and heard only in the silences. The beds stay synthesized (AUD-148). A device that saved the old default gets ambience on once.
- **D-AUD-18** (31 Oct, Leroy: "The wind and water sound effects are annoying") Ambience goes back to off by default (AUD-080), reversing that part of D-AUD-17. Wind and sea are the beds heard over most of the map, so a quieter bed would still be heard almost everywhere; off keeps the map quiet and the beds one tap away on the Sound card's Ambience row and in Settings → Audio, where the player who wants them gets them as D-AUD-17 built them. A device that got ambience on by default or by D-AUD-17's one-time switch gets it off once; a player who turns it on again keeps it on.
- **OQ-AUD-13** Palette reviewers and listening approval (release task): each palette needs a paid reviewer of its tradition, and every track needs Leroy's listening approval, before release.

## 14. Traceability

| Requirement | Feature file | Scenario |
|---|---|---|
| AUD-001, AUD-002, AUD-122 | — | Content and review rules (checked at the listening and culture gates, AUD-132) |
| AUD-003 … AUD-010 | sound-chip.feature | all scenarios |
| AUD-011 … AUD-013 | motif.feature | all scenarios |
| AUD-014 … AUD-021 | eras-and-palettes.feature | all scenarios |
| AUD-022 … AUD-035 | track-list.feature | all scenarios |
| AUD-036 … AUD-047 | music-director.feature | all scenarios |
| AUD-048 … AUD-054 | peace-rotation.feature | all scenarios |
| AUD-055, AUD-056 | peace-rotation.feature | Zoom mix scenarios |
| AUD-057 … AUD-063 | sound-chip.feature | effects bank scenarios |
| AUD-064 … AUD-069 | effects-era-and-region.feature | all scenarios |
| AUD-070 … AUD-078 | effects-catalogue.feature | all scenarios |
| AUD-079 … AUD-082 | ambience.feature | all scenarios |
| AUD-083 … AUD-089 | busy-turns-and-mixing.feature | all scenarios |
| AUD-090 … AUD-096 | music-and-effects-together.feature | all scenarios |
| AUD-097 … AUD-103 | audio-data-build.feature | all scenarios |
| AUD-104 … AUD-115 | platform-behaviour.feature | all scenarios |
| AUD-116 … AUD-121 | audio-accessibility.feature | all scenarios |
| AUD-123 … AUD-128 | care.feature | all scenarios |
| AUD-129 … AUD-131 | audio-data-build.feature | Tools scenarios |
| AUD-132 … AUD-134 | — | Production process, not game behaviour (milestones listed in §10) |
| AUD-135 | music-and-effects-together.feature | Tutorial and Needs attention sounds |
| AUD-136 | busy-turns-and-mixing.feature | Only the battle on screen is heard |
| AUD-137 | effects-era-and-region.feature | Weekly turns and the new year chime |
| AUD-138 … AUD-144 | — | Client screens and synth; checked by apps/client/scripts/sound-shots.mjs and src/audio/audio.test.ts |
| AUD-145 … AUD-147 | — | Sampled instruments; checked by apps/client/src/audio/samples.test.ts |
| AUD-148 | — | Ambience beds in the client; checked by apps/client/src/audio/ambience.test.ts |
