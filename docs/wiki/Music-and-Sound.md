# Music and sound

Every sound in Pocket Hegemony, music and effects alike, is synthesized live on PH-5, a small virtual 8-bit sound chip, from note data; the game ships no audio files. The music follows history: it changes with the era, sounds like your own corner of the world, swells when war comes and quiets in peace, and every track carries the same five-note Hegemony motif. Effects tell you what just happened without ever stepping on the music, and everything you hear also has something you can see, so the game is fully playable muted.

## How it works

### Original by design

All music is original: no melody, track name or soundtrack structure from any other commercial game, no national anthems and no modern copyrighted songs. Public-domain folk tunes may inspire an idiom, but every melody is newly written. Every effect is synthesized too: no samples, no sound from another game, no recorded real-world audio, and no voices anywhere.

### The PH-5 chip

**Music voices** (at most five at once):

| Voice | What it is |
|---|---|
| P1, P2 | Pulse waves, duty 12.5, 25, 50 or 75 %, 16-step volume envelope, vibrato, pitch slide |
| T | A 4-bit stepped triangle, on or off only |
| W | A 32-sample 4-bit wavetable, swappable per pattern |
| N | Noise, long and short, with an envelope |
| W2 | A second wavetable for brass and string sections, allowed only in music era V |

Chords are faked with arpeggios, never played on one voice. Each track stores a tuning table (cents per scale degree), so neutral intervals, slendro, pelog, seven-equal and other tunings are possible. Allowed: pitch slides, vibrato, duty sweeps, volume envelopes, one short echo (a single tap of 60 to 250 ms, used sparingly) and pan up to 30 % off centre per voice. Not allowed: samples, reverb tails, more voices. Bass lines sit an octave higher than on a console, with the triangle's stepped shape kept, so they are heard on phone speakers that reproduce little below about 200 Hz. A gentle low-pass around 9 kHz smooths the master mix.

**In the game now: the music's soft voices.** The first playtests found the strict chip harsh, "noise mostly" (Leroy, 17 Oct). So the music keeps the voices' roles, its tunes and the motif but plays them soft: the pulses and bass are rounded (their buzzing upper harmonics rolled off), volumes glide instead of stepping, a pad holds each bar's chord under the tune, the drums are tuned skins and a woodblock with only a breath of noise for the snare and cymbal, and a small hall gives the music some room. The effects below keep the chip's sound, which playtesters liked as it is.

**The tunes, rewritten.** The tunes are written chord first: each bar has a chord, the tune lands on one of its notes on the beat, the bass walks the chord's root and fifth, and the regional instrument breaks the chord gently under it. Peace tunes use only chords that sound right in every region's tuning, so a nation's music changes colour, not into clashes. The early peace tune is a pastoral air followed by a dance, the late one a march, and every track still carries the Hegemony motif.

**Effect voices** are a separate bank of three, so an effect never takes a music voice:

| Voice | What it is |
|---|---|
| S1 | Pulse, the four duties, 16-step envelope, pitch sweep, arpeggio up to 4 steps |
| S2 | Noise, long and short, envelope, noise-pitch sweep |
| S3 | Stepped triangle, or any music wavetable, chosen per sound |

Each effect is a short program ticked 60 times a second, each tick setting pitch, volume, duty or noise mode per voice. Effects have their own bus and volume, the same 9 kHz low-pass and 30 % pan limit. Every effect is under 2 seconds (most under 300 ms), except ambience, with no reverb tails and the one-tap echo only for large sounds. Nothing important sits below 200 Hz: a cannon's thump comes from a noise burst and a fast pitch drop that starts high.

### The Hegemony motif

Five notes: scale degrees 1, 5, 4, 5 and the octave above 1, long-short-short-long-long. Every track quotes it at least once. The title track states it plainly, and every age stinger ends on it. When you press End turn, the `turn_end` chime plays notes 1 and 5; when the new turn is ready, `turn_ready` answers with 4, 5 and the high 1.

### Music eras

The era is taken from the game year (the calendar). A technology basis (the average of your three tech tracks) is kept in config but turned off.

| Era | Years | Ages that open in it | Style |
|---|---|---|---|
| I | the start (1378) to 1519 | Schism and Conquerors, Gunpowder Empires, Exploration | Drones, modal melody with a second voice, frame drums, 60 to 90 bpm |
| II | 1520 to 1649 | Reformations, Atlantic Empires | Two-part counterpoint, dance rhythms in 3, plucked-string wavetables |
| III | 1650 to 1789 | Crisis and Absolutism | Walking bass, ornamented leads, harpsichord-like arpeggios, formal marches |
| IV | 1790 to 1869 | Revolutions, Industrialization | Bigger dynamics, dotted marches, folk-song melodies, first syncopation |
| V | 1870 to 31 August 1939 | Imperialism, World Wars | The W2 voice: brass and string swells, snare rolls, ragtime and early-jazz rhythm |

Era boundaries come from configuration. There is no era after V and no music for the ages after the campaign (Decolonization, Cold War, Globalization); music stops at the campaign end.

### Palettes

Your primary culture group picks one of twelve regional palettes: its scales, tuning tables, rhythms, wavetables and lead voice.

| Palette | Culture groups | Starting idioms |
|---|---|---|
| Western and Central Europe | latin, germanic | Church modes, drone fifths, bransle and pavane rhythms; later tonal marches |
| Eastern Europe and the Balkans | slavic, hellenic, uralic | Uneven meters (7/8, 9/8), minor with a raised 4th, call and response, bell-like wavetable |
| Middle East and North Africa | arab, western turkic, iranian, berber, semitic | Maqam and dastgah tuning tables, long slides, 10/8 and 6/8 cycles, plucked lute |
| Steppe and Inner Asia | eastern turkic, mongolic, tungusic | Pentatonic, drone with overtone-like duty sweeps, galloping 6/8 |
| South Asia | indo_aryan, dravidian, tibeto_burman | Drone, raga-like rules per track, tala cycles of 7, 10 and 16 |
| East Asia | sinitic, japonic, koreanic | Anhemitonic pentatonic, sparse textures, plucked zither; Japanese and Korean tuning variants |
| Southeast Asia | tai, austroasiatic, austronesian | Interlocking pulses, slendro and pelog tables, metallophone, gong-cycle structure |
| West Africa and the Sahel | mande, akan, yoruba_edo, hausa_fulani | 3 over 2, harp-lute ostinato, talking-drum-like bends |
| East, Central and Southern Africa | bantu, nilotic, cushitic, semitic_ethiopian, khoisan | Interlocking thumb piano, hocket, Ethiopian qenet modes |
| The Americas, Indigenous | nahua, maya, andean, tupi_guarani, algonquian, iroquoian | Pentatonic and tritonic, flute-like lead, frame and log drums; Andean and Mesoamerican variants |
| Oceania | polynesian, melanesian, aboriginal_australian | Chant-like narrow melody, body percussion, drone |
| Atlantic and creole | atlantic_creole, any colonial nation founded after 1500 | One palette of its own drawing on European, West African and Americas music (no mixing by culture share); habanera, later swing |

The turkic group goes to Middle East and North Africa if the capital lies west of longitude 55, otherwise to the steppe. When your primary culture changes, your palette changes from the next track on.

### The tracks

Loops last 60 to 150 seconds with 2 to 8 second intros, and play once or twice before the next pick. Stingers last 3 to 10 seconds. The first release ships 47 loops and 21 stingers.

| Group | Tracks |
|---|---|
| Interface and frame (6) | `title` (title and main menu; the full motif, era-neutral, all five voices); `nation_select` (new campaign; calm; its lead timbre follows the highlighted realm's palette with the same notes); `load_resume` (loading and coming back to the app; a 6 second intro, then the normal pick); `game_over` (slow, unresolved, ending on motif degree 4); `campaign_end` (the title theme in late era V style, then the motif in your palette); `credits` (a medley of motif quotes from every palette) |
| Peace by palette (24) | `peace_<palette>_early` (written for eras I to III) and `peace_<palette>_late` (eras IV and V). Each is stored once with era arrangements: melody and harmony stay, tempo, percussion and wavetables follow the era, giving 60 palette and era combinations |
| Era themes (5) | `era_1` to `era_5`, shared by all nations |
| Situations and moods (7) | `diplomacy` (Realm book on Abroad; one quiet layer); `prosperity` (a brighter take on your palette); `unrest` (base and drone, plus a second layer while rebels are in the field); `crisis` (disaster, plague, famine or succession crisis; low pulses, irregular noise, no melody until resolved); `revolution` (a revolution period touching you, era IV on; fast march ending on the motif inverted); `exploration` (explorers or colonists active and the camera on open ocean); `world_war` (most great powers at war, era V on; replaces `war_campaign`, heavier, with W2 brass) |
| War, layered (5) | `war_mobilize` (drum ostinato, then bass); `war_campaign` (main theme; a counter-melody when your army is within 2 provinces of an enemy; full percussion when a battle is fought this turn); `war_siege` (slow pulse, plus tension as the siege nears its end); `war_naval` (wave-like arpeggio, lead, percussion); `war_losing` (a minor-key `war_campaign`, plus drone). Layers fade at bar lines. War percussion follows the era (frame drum, field drum, snare and bass drum, then mechanized and noise-heavy); the lead follows your palette |
| Stingers (21) | nine `age_<id>` (one per age up to the World Wars, ending on the motif); `war_declared` (in the attacker's palette when a rival declares on you); `battle_won`, `battle_lost`; `war_won`, `war_lost`; `discovery`; `innovation`; `ruler_new`; `alliance`; `event_good`, `event_bad`, `event_major` |

### The music director

The director runs on the main thread from each turn's results and the screen you are on, never inside the engine, so it cannot affect the simulation. It reads the screen, the Realm book tab, the camera's region and zoom, and whether the app is in the foreground; your nation's culture group, war state and trend, armies near enemies, sieges, battles this turn, an occupied capital, your lords' loyalty, the share of provinces plotting or risen, and the treasury trend; and the world's year, active ages, periods and event chains with music tags, and how many great powers are at war.

It holds one state at a time, chosen by the highest rule that holds:

1. **Screen rules:** title and main menu play `title`; new campaign `nation_select`; loading `load_resume`; game over, campaign end and credits their own tracks; the battle screen war tracks; the siege screen `war_siege`. Screens marked "unchanged" keep the current state.
2. **Losing a war:** `war_losing`.
3. **At war:** `world_war`, then `war_naval`, `war_siege`, `war_campaign`, `war_mobilize`.
4. **Crisis:** `revolution`, then `crisis`, then `unrest`.
5. **Screen moods:** `diplomacy` on the Realm book's Abroad tab.
6. **Good times:** `prosperity`, `exploration`.
7. **Peace rotation.**

**Changing state.** The director only decides at turn end or on a screen change. It waits for the next bar line (war, crisis) or phrase end (peace, at most 8 bars) and crossfades over one bar; layers also fade over one bar. A state is held at least 45 seconds, though even a one-turn war gets its stinger. Going down in priority (a war ends) plays the matching stinger, then 3 to 6 seconds of silence, then the new state from its intro. Going up (a war starts) cuts in at the next bar.

**Stingers** play over the music, ducking it by 6 dB, or in the gap between tracks. A stinger is never a state. An event card plays its stinger and ducks the music without changing state.

**Peace rotation.** Picks are weighted: your own palette 60 %, the era theme 20 %, the palette of the region the camera has looked at for 20 seconds at regional zoom 15 % ("you hear where you look", only at track changes), and a neighbour's palette 5 %. None of the last 3 tracks repeats. Each peace track plays 1 or 2 loops, then 10 to 40 seconds of silence. The era arrangement is chosen when a track starts. When the era changes, the next peace track is that era's theme in full, after the age stinger that caused the change. With variety set to "own palette only", only your palette is picked.

**Zoom mix.** At world view the full arrangement plays; at local zoom percussion drops 3 dB and the lead comes forward 1 dB. Over a battle province in wartime at local zoom, `war_campaign`'s third layer comes in even between battles.

### Who marks which moment

When the music has a stinger for a moment, effects stay out of the way: they may lead in to it, but never play over its tune.

| Moment | Music | Effects |
|---|---|---|
| War declared | `war_declared` | nothing |
| Battle result | `battle_won` / `battle_lost` | `battle_rout` before it, then silence |
| Peace signed | `war_won` / `war_lost` | `diplo_peace_signed` first |
| Invention adopted | `innovation` | nothing |
| Discovery | `discovery` | `map_fog_reveal` when the land appears on screen |
| New ruler | `ruler_new` | `realm_ruler_dies` first if the old ruler died |
| Event card | `event_good` / `event_bad` / `event_major` | `event_open` |
| Age begins | `age_<id>` | nothing |

### Effects through the centuries

- **Fixed** sounds (taps, toggles, errors, scrolls, the map) never change.
- **Game-year** sounds (turn chimes, notification pings, the event scroll) change with the music era, but only slightly. The turn chimes keep their notes: era I has a 12.5 % duty doubling and no bell, each later era adds one arpeggio step, and era V adds a short swell on an effects voice (never a music voice).
- **Army** sounds (marching, shooting, guns, charges, sieges, ships) change with the warfare era of the army's own inventions (I to VII), so two armies of different eras on one field sound different. Marching: frame drum and loose steps in I and II; field drum and measured steps in III and IV; snare and boots in V and VI; an engine drone with motor transport in VII. Shooting: bow and crossbow I to II, matchlock II to III, volley IV to V, rifle V to VI, machine gun VI to VII.
- The turn chimes use your palette's wavetable and tuning, and the court horn your palette's lead. Everything else is shared; battle sounds differ by era and troop type, not culture.
- The catalogue stops at warfare era VII and music era V; there is nothing for 1945 onward.

### The effects catalogue

129 sounds in 12 groups, named `<group>_<name>`, with a priority from 1 (highest) to 5.

| Group (count) | Sounds |
|---|---|
| Interface (21) | `ui_tap`, `ui_tap_soft`, `ui_back`, `ui_confirm` (motif 1 to 5, for choices that cost something), `ui_cancel`, `ui_error`, `ui_toggle_on`/`off`, `ui_panel_open`/`close`, `ui_tab`, `ui_scroll_tick`, `ui_slider` (pitch rises with value), `ui_drag_pick`/`drop`, `ui_text_key`, `ui_tooltip` (off by default), `ui_hint` (a tutorial hint), `ui_achievement` (the motif on bells), `ui_save` (manual save), `ui_purchase` |
| Frame (6) | `frame_logo`, `frame_start` ("Tap to start"), `frame_nation_pick` (in that realm's palette), `frame_campaign_begin`, `frame_pause`/`frame_resume` |
| Turn (5) | `turn_end`, `turn_working` (a tick every 500 ms if the engine is still computing after 600 ms; never on fast turns), `turn_ready`, `turn_month_new_year` (adds a bell in January), `turn_report_open`. An autosave plays nothing |
| Map (8) | `map_select_province` (knock pitched by terrain), `map_select_own`, `map_zoom_step`, `map_lens`, `map_overview`, `map_fog_reveal`, `map_ping`, `map_border_change` (rising if you gain, falling if you lose, silent if neither side is you) |
| Armies and fleets (15) | `army_select` (horse adds a clop, guns a wheel creak), `army_order_move`, `army_march_loop`, `army_arrive`, `army_split`, `army_merge`, `army_levy_call` (a horn on the palette lead), `army_lords_call`, `army_hire`, `army_trained`, `army_disband`, `army_hungry` (repeats only when it gets worse), `army_winter_quarters`, `fleet_select`, `fleet_order_move` |
| Battle (18) | `battle_start` (attacker's horn first), `battle_bell` (two strikes for the day's last bell), `battle_order`, `battle_shoot_bow`, `_crossbow`, `_matchlock`, `_volley`, `_rifle`, `_mg`, `battle_gun`, `battle_shell` (no falling whistle), `battle_charge_horse`, `battle_charge_foot`, `battle_melee`, `battle_brace`, `battle_sector_lost`, `battle_rout`, `battle_air` (era VII) |
| Siege (10) | `siege_begin`, `siege_closed`, `siege_bombard`, `siege_mining`, `siege_breach`, `siege_repair`, `siege_sally`, `siege_storm`, `siege_terms`, `siege_fall` (a lower bell for your own castle) |
| Sea (5) | `sea_battle_start`, `sea_broadside`, `sea_sink`, `sea_blockade`, `sea_landing` |
| Economy (8) | `econ_income` (once per turn), `econ_income_big`, `econ_spend`, `econ_debt`, `econ_build_start`, `econ_build_done`, `econ_trade`, `econ_harvest` (rising if good, falling if famine looms) |
| Realm and diplomacy (14) | `realm_research_pick`, `realm_law`, `realm_ruler_dies`, `realm_heir_born`, `realm_stability_up`/`down` (a lord's loyalty steps up or down), `realm_unrest`, `realm_rising`, `realm_fire` (quiet and sombre), `realm_plague`, `diplo_envoy_sent`, `diplo_accepted`/`refused` (a court horn on the palette lead), `diplo_peace_signed` |
| Events and notifications (9) | `event_open`, `event_choice`, `event_chain_next`, `notify_ping`, `notify_alert` (urgent: army in danger, castle closed, pay owed), `notify_war`, `notify_battle_far`, `notify_diplo`, `notify_batch` |
| Ambience (10) | `amb_sea_coast`, `amb_sea_ocean`, `amb_wind_plain`, `amb_forest`, `amb_jungle`, `amb_desert`, `amb_mountain`, `amb_marsh`, `amb_town` (a factory whistle from era V), `amb_war_front` |

Two aliases point at `ui_error`: `army_order_invalid` and `econ_cant_afford`.

**On the battle screen** at normal speed, sounds follow the order of a bell (orders, shooting, charges, melee, breaking), one per step from the sector nearest the screen centre, other sectors only if a voice is free. Skipping ahead plays only `battle_start`, `battle_rout` and the music stinger.

### Ambience

Ambience is off by default. When on, it plays a bed chosen by what is under the camera at regional or local zoom: one of the ten loops of 4 to 12 seconds, noise with occasional wavetable notes. There is no weather, but in winter months the plain and forest beds are windier. Ambience may fill the silences between peace tracks.

### Many things at once

- **Turn results.** When a new turn is shown, at most 5 effects play, 150 ms apart: first what happened to your armies, castles or ruler (highest priority first), then what is in view. Everything else is shown silently. With five or more notifications in a turn, `notify_batch` plays instead.
- **Voice stealing.** A new sound with no free voice takes the voice of the lowest-priority sound playing, if that is lower than its own; otherwise it is dropped.
- **Cooldowns.** The same sound does not restart within its cooldown: 50 ms by default, 40 ms for scroll ticks, 20 ms for sliders, 2 s for alerts, 5 s for unrest.
- **Variation.** Repeating sounds vary by up to a semitone and a new noise seed, except sounds whose pitch carries meaning.
- **Position.** A map sound is panned by its screen position up to 30 %, gets quieter toward the edge (0.4 at the edge) and is muted off screen. Notifications always play centred and are never muted.
- **Zoom.** At world zoom only notifications play from the map; at regional zoom also army orders, battle starts, siege breaches, sea battle starts and map sounds; at local zoom everything.

### Mixing with the music

- While a stinger plays, effects of priority 3 to 5 are dropped and priority 1 and 2 are ducked 4 dB.
- Effects duck the music only for six sounds (`battle_start`, `siege_breach`, `siege_storm`, `realm_rising`, `realm_ruler_dies`, `sea_battle_start`), by 4 dB for their length. No other sound ducks it, however long.
- Ambience ducks 6 dB under any priority 1 or 2 effect and fades out over 2 s when a music track starts.
- The game menu leaves the music as it is.
- While several of your battles run at once, you hear the battle sounds of the one on screen; switching battles switches the sounds.
- A `ui_tap` sits about 6 dB below the music's average, a priority 1 sound peaks about 3 dB above it, and the whole mix aims at −16 LUFS.
- Several achievements in one turn play `ui_achievement` once.

### Platform behaviour

- PH-5 runs in an AudioWorklet at the device's sample rate, fed by a main-thread scheduler about 100 ms ahead. If the worklet cannot start, the same voices are built from standard oscillators and a looping noise buffer.
- Music and effects together stay under 2 % of one core on a mid-range phone.
- Audio starts on the first tap; the title's "Tap to start" is that tap. A mobile cold start has a silent splash and the first sound is `frame_start`; desktop and Steam play `frame_logo`.
- In the background, or with the tab hidden, sound is suspended, and it resumes with `load_resume`. Notifications that arrived while you were away play no sound.
- On iPhone the game uses the "ambient" audio session: it mixes with your other audio apps and respects the silent switch; effects follow the same session as music. On desktop, "Play in background" (off by default) keeps the sound going when the window is hidden; on the web it always pauses.
- Interface sounds start within one audio block of the tap (about 3 ms) by a direct message to the worklet; map and battle sounds go through the scheduler so they line up with animation.
- **Haptics** on phones (on by default, never on desktop, working with sound off): all light: `ui_error`, `turn_ready`, `battle_start`, `siege_breach`, and `realm_ruler_dies` once.

### The Sound card

The speaker button in the side tools, under the map mode and your commanders, opens the Sound card: what is playing now and why (for example "Mobilizing: war has been declared, the armies gather"), the volume, music on or off with its volume, the effects volume, and button sounds on or off. The speaker shows struck through while music is off, so you can tell without opening it. Sound starts with your first tap, as browsers and phones require, and your choices stay on the device.

In this first cut the game plays the title theme, two peace tunes for each half of the eras in your palette's own tuning and timbre, prosperity, diplomacy, mobilizing, campaign (whose layers join as your armies close on the enemy and fight), siege, a losing war, unrest and crisis, with stingers for war declared, battles won and lost, and wars won and lost. Turns chime at their end and start (the full motif at a new year), taps click, and marches, levies, battles, sieges, famine and unrest each have a sound.

### Settings

Master, music, effects and ambience volumes; music on or off (off fully suspends the synth); variety; zoom mix; ambience on or off; interface sounds on or off; haptics; mono; sound captions; reduced intensity. Defaults: master 0.8, music 0.7, effects 0.8, ambience 0.5 when on, variety "My palette only", interface sounds on, haptics on (phones). The tooltip sound is never played. The rows themselves live in [Settings](Settings).

### Accessibility

- Every sound has a visual partner (a toast, an icon flash or an animation), so the game is fully playable muted.
- **Sound captions** show off-screen sounds as a small caption at the screen edge toward where they came from ("Battle at Troyes" with crossed swords). Off by default, they turn on by themselves when you turn sound off.
- **Mono** turns pan off.
- Rising and falling pairs (gain and loss) differ by rhythm or timbre as well as pitch.
- **Reduced intensity** removes the echo, softens priority 1 sounds by 4 dB, and turns off the machine-gun stutter and sharp attacks.

### Care

- Palettes describe musical features, not ethnic stereotypes, and never use a "generic exotic" scale shared across unrelated traditions. Each palette's tracks are reviewed by a musician or scholar of that tradition before release and credited.
- Colonized peoples are never written as an "enemy" or "primitive" side, and Indigenous and African palettes get the same development across all five eras as European ones.
- A narrative-only event gets no stinger at all.
- A peace with neither gain nor loss plays no stinger.
- Tutorial steps play `ui_hint` when they appear and `ui_confirm` when done, and a new warning plays `notify_alert`; none of them lowers the music.
- Plunder, razing, massacres, enslavement and narrative-only events never get coins, chimes, fanfares or any rising, rewarding sound (at most `realm_fire` or a single low bell), and plunder adds gold silently.
- Colonial conquest has no distinct "victory" sound, and Indigenous and African arms sound by era and type with the same quality as anyone's.
- Era VII machine guns, shells and gas sound at a distance without exaggeration: no screams, no wounded, no speech or crowds anywhere. "Shout" sounds are pulse sweeps.

### How it is made

Tracks are written as MML text, one file per track, in `packages/rules/data/music/tracks/`, compiled to JSON (patterns, order list, loop point, layers, era variants). Sounds are text blocks in `packages/rules/data/audio/sfx/<group>.sfx`, compiled by the same step. The build checks the voice budget, range per voice, loop length, that the motif appears and that every id the director names exists; for sounds it fails on more than three voices, 2 seconds or longer (ambience exempt), a missing named sound, a missing era variant a troop type needs, a `ui_` sound of 10 ms or less, or a sound with no visual partner named. Every number the director and mixer use lives in `music.yaml` and `sfx.yaml`, so balancing needs no code. Events can carry `music:` and `sfx:` tags, and a `bindings` table maps game events to sound ids.

Tools: `/music.html` lists every track with any palette, era variant and layer toggled and live voice use, plus an Effects tab with every sound and a "busy turn" button that fires 40 battle results at once; a render script bounces any track or sound to WAV; and the diagnostics line shows the current music state, track, layer and why it was chosen, and the last five effects with which were dropped and why.

The music is written in-house by Claude in MML. Each track ships with a rendered MP3 that Leroy approves by ear before it goes into the game; a failing track is reworked, not shipped. If the first milestone's tracks fail that gate, an outside chiptune composer is commissioned for the title theme and the motif only.

| Milestone | Music | Effects |
|---|---|---|
| M1 / S1 Proof of sound | Synth, scheduler, `/music.html`, MML compiler, `title`, two early peace tracks, `war_campaign` with 3 layers, three stingers | Effects bank, direct path, `.sfx` compiler, Effects tab, all interface and turn sounds, income, spend, province select |
| M2 / S2 Playable loop | Director, `music.yaml`, event tags, mobile behaviour, nation select, diplomacy, crisis, mobilize, losing, `era_1` and `era_2` | Priorities, cooldowns, turn results, ducking, `sfx.yaml`, haptics, frame, notify and event sounds, army orders, battle start and rout |
| M3 / S3 The world | Early tracks for all palettes, remaining war and mood tracks, the first five age stingers | Battle set eras I to IV, siege, sea, economy, realm, diplomacy |
| M4 / S4 The centuries | Late tracks, era themes 3 to 5, remaining age stingers, the era matrix, cultural reviews | Era V to VII variants, ambience, captions, reduced intensity, loudness pass |

## What you see

Audio has its own visuals only where they partner a sound: captions at the screen edge, toasts and icon flashes. Developers see `/music.html` and the diagnostics line. Everything else (settings rows, screens) belongs to [Settings](Settings) and [Screens and navigation](Screens-and-Navigation).

## How it connects

- [Screens and navigation](Screens-and-Navigation): screen ids and their music column, the Realm book tab, pause, "Tap to start", toasts and captions.
- [Settings](Settings): every audio setting.
- [How a turn works](Time-and-Turns): turn end, turn ready, the game year and January.
- [Map and Map Modes](Map-and-Lenses): camera position, region and zoom, what is on screen, terrain under the camera.
- [Culture](Culture): your primary culture group, its changes and culture mix.
- [The 1444 start](The-1444-Start): capital longitude for the turkic split, colonial founding dates.
- [Warfare](Warfare): war declared, war trend, occupied capital, battles, bells, routs, sieges, army eras and troop types.
- [Naval](Naval): sea battles, broadsides, sinkings, blockades, landings, fleet orders.
- [Troop movement](Troop-Movement): march orders, arrivals, winter quarters.
- [Recruiting](Recruiting): levy, lords, hiring, training, disbanding.
- [Your realm](Your-Realm): ruler deaths and new rulers, heirs, lords' loyalty, treasury, income, debt, laws.
- [Provinces](Provinces): harvest, plague, unrest thresholds.
- [Rebellions](Rebellions) and [Revolutions](Revolutions): risings, rebels in the field, revolutions touching you.
- [Historical events](Historical-Events): event cards, chains, choices, tags, narrative-only events, ages.
- [Research](Research): inventions adopted and research picks.
- [Exploration and colonies](Exploration-and-Colonies): discoveries, explorers and colonists, fog lifting.
- [Diplomacy](Diplomacy): alliances, treaties, envoys and answers.
- [Buildings](Buildings) and [Trade](Trade): buildings ordered and finished, traders and routes.
- [Achievements](Achievements): the unlock sound.
- [Tutorial and help](Tutorial-and-Help): `ui_hint` for steps, and the sounds the tutorial asks for.
- [Saving](Saving): `ui_save` for a manual save; autosave is silent.

Audio never feeds back into the engine, and computer players hear nothing (though `war_declared` uses the attacking computer's palette).

### Each turn

After the simulation and turn report are ready, audio reads your war state, battles and sieges, capital, unrest, lords' loyalty, treasury trend, active ages and tagged chains, the year and your culture group; evaluates the music state and schedules the change; plays the turn results; then `turn_ready` (or `turn_month_new_year` in the turn in which January begins). A turn is one week, so the turn chimes play every week, while month, season and year cues play once, in the turn in which that month, season or year begins.

## Numbers

From `music.yaml` and `sfx.yaml`. Almost all are provisional placeholders; the era basis, campaign end and ambience default are decided.

| Key | Value |
|---|---|
| `eras.basis` | calendar (decided) |
| `eras.bands` | I 1378, II 1520, III 1650, IV 1790, V 1870 |
| `eras.campaign_end` | 1939-08-31 (fixed) |
| `palettes.split.turkic` | west of longitude 55 → Middle East, else steppe |
| `states.war_losing` | more than half your peace voices would accept the enemy's terms, or capital occupied |
| `states.world_war` | 60 % of the 8 great powers (most provinces) at war, era V |
| `states.war_naval` | 60 % of battles at sea in the last 5 months |
| `states.war_siege` | a siege active and no field battle in the last 3 months |
| `states.war_mobilize` | at most 2 months since declaration, no battle yet |
| `states.revolution` | revolution period touching you, era IV on |
| `states.unrest` | 25 % of provinces plotting or risen |
| `states.prosperity` | no disloyal lord and at least half loyal, treasury rising, 10 years at peace |
| `transitions.min_seconds_in_state` | 45 |
| `transitions.max_phrase_wait_bars` / `crossfade_bars` | 8 / 1 |
| `transitions.silence_after_stinger_seconds` | 3 to 6 |
| `transitions.stinger_duck_db` | −6 |
| `rotation.weights` | 0.60, 0.20, 0.15, 0.05 |
| `rotation.camera_dwell_seconds` | 20 |
| `rotation.no_repeat_last` | 3 |
| `rotation.silence_between_seconds` | 10 to 40 |
| `zoom_mix` | −3 dB percussion, +1 dB lead at local zoom |
| `mix.master_lowpass_hz` / `max_pan` / `target_loudness_lufs` | 9000 / 0.3 / −16 |
| `defaults.music_volume` / `sfx_volume` | 0.7 / 0.8 |
| `defaults.ambience` | false (decided) |
| `bank.tick_hz` / `max_length_ms` | 60 / 2000 |
| `buses` | master 0.8, music 0.7, effects 0.8, ambience 0.5 |
| `defaults.variety` | own palette only |
| `priority.defaults_by_group` | ui 3, frame 1, turn 1, map 3, army 2, fleet 2, battle 3, siege 3, sea 3, econ 3, realm 2, diplo 2, event 2, notify 3 |
| `cooldown_ms` | default 50, scroll 40, slider 20, alert 2000, unrest 5000 |
| `turn_results` | max 5, 150 ms apart, batch at 5 |
| `turn_working` | after 600 ms, every 500 ms |
| `distance` | linear, edge 0.4, mute off screen |
| CPU budget | under 2 % of one core on a mid-range phone |

## Still open

- Each palette needs a paid reviewer from its musical tradition, and every track needs Leroy's listening approval, before release.
- The iPhone audio session is to be checked on real devices before release.

## For developers

- Spec: [`domain/audio/spec.md`](https://github.com/grrts/pocket-hedgemony/blob/claude/domain-specs-bdd-ebdpmx/domain/audio/spec.md), requirement code **AUD** (AUD-001 to AUD-137).
- Features: `domain/audio/features/` (sound-chip, motif, eras-and-palettes, track-list, music-director, peace-rotation, effects-catalogue, effects-era-and-region, ambience, busy-turns-and-mixing, music-and-effects-together, platform-behaviour, audio-accessibility, care, audio-data-build).
- Code: `packages/engine/src/domain/audio/` (music, effects, platform); data in `packages/rules/data/domain/audio.json`. The director and synth run on the client, never in the engine. Track and sound data go in `packages/rules/data/music/tracks/` and `packages/rules/data/audio/sfx/`.
