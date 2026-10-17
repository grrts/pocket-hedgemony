# Open questions and contradictions (generated)

Every gap or contradiction the domain specs found in the designs, collected from section 13 of each `spec.md` by `pnpm --filter @ph/specs context-map`. Answer them in the design documents; the spec then drops the question.

546 questions across 29 contexts.

## Achievements (achievements)

- **OQ-ACH-1**: `first_castle` uses `on: castle_gained`, which is not in the design's list of moments (§5.1). Add the moment, or test it on `siege_end` + building finished? Blocks: INV-ACH-7, the evaluator's moment list.
- **OQ-ACH-2**: The YAML comment says First steps "each can be earned in the tutorial", but design §1/§5.2 and the tutorial design say the tutorial earns none. The comment looks stale (pre-ironman decision). Blocks: nothing in rules; fix the comment.
- **OQ-ACH-3**: Free tier: design §5.5 says the free countries are "still open", but gap list 1, item 2 decided them: the Ottomans and France. Neither has a single-province start, so by ACH-056 *From One Hall* needs `full_game`, which the YAML lacks. Several more rows also look unearnable with only the Ottomans and France: *Our Own Banner* (start as subject), *Many Tents, One People* (decentralised start), *The Walls Held* (defender of Constantinople), *The Four Quarters Hold* (Andean empire role), possibly *Unconquered* (start macro-region not Europe). This contradicts "every achievement except the two marked `full_game` can be earned with the free countries". Blocks: `full_game` flags, store copy for the free tier.
- **OQ-ACH-4**: Save flags: achievements needs `ironman_unbroken`, `cheat_marked`, `switched_country`; the save design offers `ironman` and a "modified" mark, and recommended "no" to ironman-only (superseded by Leroy's 16 Oct decision). The saves context must adopt the three flags and the player-profile storage for lifetime counters and the demo's local list. Blocks: ACH-034 to ACH-041, ACH-057/058.
- **OQ-ACH-5**: Subjects, diplomacy and exploration now have designs, but the rows written "against stats those designs will define" (*Our Own Banner*, *Tribute Roads*, *Beyond the Horizon*, *Strangers on the Shore*, *All the Way Round*, *Treaty on the Shore*) still point at gap-list items. Their tests (`tributaries_min`, `fleet_home`, `contact_by: sea`, `founded_with_consent_of_local_people`, "macro-region") need checking against those designs. Blocks: those six rows.
- **OQ-ACH-6**: The config key `on` is read as the boolean `true` by YAML 1.1 parsers (for example PyYAML), so the moment field is lost unless quoted or renamed. Blocks: the build step and the evaluator's loader.
- **OQ-ACH-7**: Google Play steps: "targets larger than 10,000 are reported in steps (… gold in tens)", but *Counting House*'s target is exactly 10,000, not larger. Is gold reported in tens or as is? Blocks: ACH-045 for `treasury_10000`.
- **OQ-ACH-8**: Store figures disagree in the sources (Google 1,000 vs 2,000 total points; 200 vs 400 count; Steam's "confidence" check). The design asks to check them again in each console before entering the list. Blocks: final upload, not the rules (we adopt the strictest).
- **OQ-ACH-9**: Names that point at real history (*The Walls Held*, *The Four Quarters Hold*) need a check by whoever reviews the event tree's sensitive content. (design §12.1)
- **OQ-ACH-10**: Compare the list once against EU4's published achievement list before release so nothing is accidentally the same. (design §12.2) Also: the retry interval "every few minutes" and toast sting are not given as numbers.
- **OQ-ACH-11**: *Unconquered*: the text says "In Africa, Asia, the Americas or Oceania … never taken from outside", the test says `start_macro_region_not: europe` and `capital_never_occupied_by_other_macro_region`. Which macro-regions exist (is the Middle East "Asia"?), and does "outside" mean another macro-region or any foreign realm? Blocks: `never_colonised`.
- **OQ-ACH-12**: Tutorial message: the design asks the tutorial to "say that achievements start in a real campaign"; the tutorial design does not include such a line. Blocks: onboarding copy.
- **OQ-ACH-13**: Where the achievements screen opens: design §8 says the title screen and the pause menu; the screen flow places Achievements under the main menu's More and lists the game menu as "Save · Load · Settings · …" without naming Achievements. Blocks: ACH-072.
- **OQ-ACH-14**: How a campaign is won (gap list 1, item 1) is decided but not designed; victory or score achievements wait for it. *The Long Road* only needs the end date.

## Audio (audio)

- **OQ-AUD-1**: The turn chimes' Era V "short W2 swell" (sfx §5.3) uses a music voice, which contradicts "effects never take a music voice" (§3, decision 15.1) and the three-voice effects bank. Blocks: AUD-068.
- **OQ-AUD-2**: The music director reads a war score (`war_losing: war_score_below −40`, "war score trend") and stability (`prosperity`, `unrest`, `realm_stability_up/down`), but warfare says "there is no single war score" (peace voices instead), and country stats map stability to loyal lords and provinces in revolt with no stability stat. "World tension" and "great powers" are not defined anywhere. Blocks: AUD-037, AUD-040, `war_losing`, `prosperity`, `unrest`, `world_war`.
- **OQ-AUD-3**: Music variety default: `music-config.example.yaml` says `all_palettes`; settings (design and yaml) say "My palette only" (`own_palette`). Blocks: AUD-054, AUD-115.
- **OQ-AUD-4**: Era basis: music §3.2 says "a setting can tie them to the player's technology", §10.2 says the option stays in config but off; settings makes it a campaign rule "if that stays a choice". The config defines technology as "average of the player's three tech tracks", which the research design must confirm. Blocks: AUD-016.
- **OQ-AUD-5**: Gap list 1 item 5 lists "Music 10" (era basis, ambience, rivals' themes) as still open, but music §10 decided all three on 16 Oct. The latest decision (music §10) is used; the gap list is stale. Sound effects §15 also says the music design still lists Era VI, `global_tension` and stingers past 1939; the music README no longer does, so that note is stale too.
- **OQ-AUD-6**: Tutorial needs (tutorial §12): a step-appears chime, a step-complete tick, the vizier's note, and a Needs attention new-warning sound, all "ducked under music like stingers". The catalogue has only `ui_hint`; the sound effects design maps "advisor hints such as famine coming" to `notify_alert`, though there is no advisor after the tutorial; and effects do not duck music (except the priority 1 list). Blocks: onboarding audio.
- **OQ-AUD-7**: Palette-taking effects: sfx §4.2 says only the turn chimes and the court horn take the palette, but `army_levy_call` (palette lead wavetable) and `frame_nation_pick` (highlighted nation's palette) also do, as does the config `palette_sounds` list. Blocks: AUD-067.
- **OQ-AUD-8**: Ducking rules: the rule "priority 1 longer than 600 ms ducks music" also matches `frame_logo` (1.2 s), `frame_campaign_begin` (1.0 s) and `ui_purchase` (700 ms), which are not in the listed six. `frame_pause` ducks music 6 dB while paused although it is a priority 3 effect and the `game_menu` screen is "unchanged". Blocks: AUD-092, AUD-094.
- **OQ-AUD-9**: iOS audio session: whether WKWebView's default session or `navigator.audioSession` respects the silent switch and yields to other apps differs by iOS version; a native Capacitor "ambient" category may be needed. Not verified on a device. Settings adds `mix_with_other_apps` (restart) and a desktop `play_in_background` switch, which conflicts with "suspend when hidden" on desktop/web. Settings' master default is 80 % vs `buses.master: 1.0`. Blocks: AUD-109, AUD-111.
- **OQ-AUD-10**: `war_won` / `war_lost` play on "peace signed with a gain or a loss": what plays for a peace with neither (white peace)? Blocks: AUD-033.
- **OQ-AUD-11**: The Atlantic and creole palette "blends palettes 1, 8 and 10 by the nation's culture mix", but no blend rule exists, and the config maps only `creole_atlantic`. The turkic split by capital longitude 55 is only in the config. `event_major` "in a sombre form" is a variant not in the track list. Blocks: AUD-019, AUD-020, AUD-125.
- **OQ-AUD-12**: `ui_tooltip` is "off by default" but no setting turns it on. Haptics decision §15.3 calls all five moments "light" while §8 gives light, medium and heavy. The music director's screen rules don't name `final_result`, which the screen list gives `campaign_end`. Blocks: catalogue defaults.
- **OQ-AUD-13**: Each palette needs a paid reviewer of its tradition before release (music §8, §9 gate 2), and every track needs Leroy's listening approval (gate 1); not yet arranged.

## Buildings (buildings)

- **OQ-BLD-1**: Troyes' town size. Province 1 calls Troyes a market town (4 slots) but lists six town buildings; the worked example reads it as a town (6 slots). Which is the 1444 value? Blocks the Troyes scenarios' starting state.
- **OQ-BLD-2**: Price of bought materials. Buildings §3.3 buys materials "at the province's market price" and makes them dearer "with few traders (province 7.2)". Trade v2 drops Market price and trade balance (trade §14). What price applies, and does trade ratio replace "few traders"? Blocks BLD-025, BLD-032.
- **OQ-BLD-3**: Master of works gold. Config gives `gold_multiplier: 0.75` (matching province 10.2 "cost 25 % less") but buildings §3.5 says only "adds one more of each, and halves the months". Is the gold discount part of the rule?
- **OQ-BLD-4**: Step counts. §1 says steps 1 to 3, "castles and a few others have 4", but the castle has five steps (earthwork, stone, bastion, star, concrete fortress) and roads five (track, road, paved, turnpike, railway). What is the maximum step, and which step numbers do castles use?
- **OQ-BLD-5**: Landmark steps. A landmark is "a step above its building type", yet Alhambra is palace step 3 (palace's top step), Sankore school step 3 (school's top), Kremlin castle step 3, Ulugh Beg an observatory step 3 (observatory has one step), and Taj Mahal "own type". What step does each landmark stand at?
- **OQ-BLD-6**: Yearly fair unlock. Buildings: step 2 unlocked at start, needs a market charter. Trade §11: T6 Merchant fairs and exchanges lets the yearly fair be built. Research tree T6 still says "+1 merchant slot". Which applies? Blocks traders being hired at the start.
- **OQ-BLD-7**: Caravanserai and counting house roles. Buildings: caravanserai makes carried value grow while traders rest and T1 doubles its "room"; counting house lets traders draw treasury gold and a merchant house lend. Trade v2: caravanserai +25 % weight for land traders and stops bandits; T1 gives camel caravans and halves bandit losses; counting house lets foreign traders deposit with bills of exchange. Trade asks buildings to take its roles in (trade §14). Which roles stand? "Room" is undefined.
- **OQ-BLD-8**: 1444 port list. Buildings names `naval/data/start-ports.json` (236 provinces); trade names `naval/data/ports-1444.json`; the naval design names ports-1444.json as route ends. Both files exist. Which is canonical for starting harbours?
- **OQ-BLD-9**: Palace step 3. Design table: palace "Start" for all steps; config: step 3 `royal_city` unlocked by G9. Government ties G9 to the bureaucratic empire reform. Which?
- **OQ-BLD-10**: Province adoption of §18 changes. Province-stats still lists hospital, wells and drains as later inventions (buildings: hospital at start, wells and drains ring works with B11), miners only in mines and saltworks (no quarry), no dykes ring works, no Works and Jobs lenses. Until adopted, the two designs disagree.
- **OQ-BLD-11**: Lords' provinces and material reach. Troyes example buys stone from a quarry "one ring away but in a lord's province". Is a lord's province "a province of yours" for reach (BLD-026)? Trade treats a lord's city as the crown's for deposits.
- **OQ-BLD-12**: Town walls step and plunder. §7.8 gives the 1-in-6 share for town walls at any step; the Troyes example says a palisade still loses 1 in 3. Does the palisade count as town walls for plunder?
- **OQ-BLD-13**: Road step unlocks and costs. Five road steps but three unlock ids (B2; B9; C16) and costs only for road, paved road and railway; the track's status (start? free?) and turnpike cost are missing.
- **OQ-BLD-14**: Castle step unlocks. Earthwork is unlocked by B4 and stone castle by B1, yet era I says the start set has "castle (earthwork or stone)". Which castle steps are known in 1444?
- **OQ-BLD-15**: Crafts appearing. Buildings §6.3 has no trade threshold; trade §9 requires trade ratio ≥ 30 %. Rate "now and then" has no number.
- **OQ-BLD-16**: Unique variants have no home in national strengths. HER levers include only `building_cost_pct` and `building_unlock`; no lever or field carries a building variant (Külliye, Kontor ...). Who decides and stores them?
- **OQ-BLD-17**: Undefined numbers: town fire chance and size scaling, quake regions, "big" raid threshold, the AI's "busy path", "now and then" for craft buildings, the regional slot templates, which tiles get buildings for map wealth 2–9.
- **OQ-BLD-18**: Seat limit wording. Buildings: one seat per province; government 2.1: "one per town". Same thing only if every province has one town. Confirm.
- **OQ-BLD-19**: Angkor "restoring it is a decision". No design defines decisions; which context owns it?
- **OQ-BLD-20**: Village works rate (20 %) needs a balancing pass with start values (design OQ 2). Faith-building numbers belong to religion and the list may change to match it (design OQ 3).
- **OQ-BLD-21**: Burned tiles. Ruined buildings rebuild at half cost (BLD-062); burned tiles rebuild by themselves one a year in peace. When both apply, which wins, and is the self-rebuild free? (Troyes paid 15 g = half a farm to have it done in a season.)

## Culture (culture)

- **OQ-CULT-1**: The 1.5 capacity weight of stranger-majority provinces (5.1, config `capacity_weight`, "read by the government design") has no place in government v2, whose caps count officials and lords, not provinces. Drop it, or turn it into an officials-cap rule?
- **OQ-CULT-2**: "Government types may limit Tongue policies (a nation state can *Impose*; a confederation is always *Let be*)" (§10) and "a nation state with *Impose* for 50 years" (§6.4): government v2 has no such limits and no "nation state" form. Which forms count as a nation state?
- **OQ-CULT-3**: Family count: the design says the event tree has 38 groups (42 with the four added), but `event-tree/data/enums.yaml` lists 39 `culture_groups`; with the four that makes 43. The four new families are not yet in `enums.yaml`.
- **OQ-CULT-4**: Nationalism ×0.25 drift: §3.2 says "nationalism support **of the drifting tongue** in the province", but the event tree's `ideology_support` and §6.4 are per province, not per tongue. Which is read?
- **OQ-CULT-5**: Fourth tongue arriving: culture says it replaces the smallest unconditionally (which joins the majority); religion says a fourth faith replaces the smallest only if larger. Same storage rule, two behaviours.
- **OQ-CULT-6**: "Changes for other files" not adopted yet: province-stats 10.2 (officials' tongue, learning time), 10.4 (*Own tongue* charter), 12.1 (*Banned tongue*; *Foreign rule* currently "a ruler of another tongue", not strangers only), 6.4 (settlers to own provinces); country-stats 4 (Tongue % still "% of people sharing the ruler's culture", cousins not half); warfare 10.1; event-tree vocabulary (verbs and triggers) and enums (families); music 3.3 palettes (proposal: celtic 1, baltic 2, caucasian 2, hebrew 3).
- **OQ-CULT-7**: "Lords of those tongues waver one step" under Impose: once when Impose is set, or each year while it holds? Same for "stranger lords waver first".
- **OQ-CULT-8**: "Kin lords +1 step tendency" and "stranger lords start a step lower": how these map onto the country-stats loyalty reasons (5.5) is not stated.
- **OQ-CULT-9**: Way of life "in its own kind of land (steppe, deep forest, islands)": no mapping from terrain tiles or provinces to these lands is given.
- **OQ-CULT-10**: New tongue abroad: "a region separated from their court by sea" — what "region" is (map region, colony group) and how sea separation is tested are not defined.
- **OQ-CULT-11**: "A local official in a stranger province … stops *Foreign rule* from being made worse by *Banned tongue*": grievances are counts; what "made worse" means is not stated.
- **OQ-CULT-12**: *Gather our kin* is listed both as a war aim "for the diplomacy design" (5.2) and as a warfare 10.1 change (§10 change 5). Which context owns it?
- **OQ-CULT-13**: Config has no keys for the homeland rising draw (8 %), the 2-year refugee settling, or the 5-year engine-check interval, though §9 says all thresholds live in config.
- **OQ-CULT-14**: Trading people and Tongue %: config gives weight 0.0 (they lower Tongue %); the design only says they are never strangers for grievances. Confirm.
- **OQ-CULT-15**: A school "of another tongue (a madrasa in Arabic, a Latin university)" counts for that tongue: Arabic and Latin as tongues are not in the sample tongue list; which tongue ids do such schools carry?
- **OQ-CULT-16**: Released country "takes the catalogue's record for that people, or a generated one if none fits": how a country is generated is not designed.
- **OQ-CULT-17**: The pull tongue condition "governed by your official": does any official of the country count, whatever his tongue (config `own_official`)?

## Diplomacy (diplomacy)

- **OQ-DIPL-1**: How many actions? The design says "Fifteen actions" (intro and section 6), the README says
- **OQ-DIPL-2**: A refused **offensive** call no longer breaks an alliance (diplomacy 6.1, latest), but
- **OQ-DIPL-3**: Truce length. Diplomacy 8 (latest): 5 years +5 if land moved or a subject made, white peace 5;
- **OQ-DIPL-4**: The engine's `insult(a, b)` sets the **insulter's** stance toward the target to Hostile; diplomacy
- **OQ-DIPL-5**: The refused-demand rule says the target's allies' defensive call "loses the +20 bonus to come",
- **OQ-DIPL-6**: relation-rules `modifiers` carries numbers that the reasons count replaced or that use another
- **OQ-DIPL-7**: The proposed relation-rules additions (fact `protection_pledge`; actions `swear_peace`,
- **OQ-DIPL-8**: War aim acquisition differs from warfare 10.1, which was not updated: *Punish* there needs only a
- **OQ-DIPL-9**: War with no aim: warfare 10.1 says it counts Lands taken for every province, lords waver and
- **OQ-DIPL-10**: Subjects joining wars. Diplomacy 7.2 brings subjects in by relation-rules `joins_overlord_wars`
- **OQ-DIPL-11**: Mobilisation pact in era V: the era V row gives offensive calls +10 "if allies share a
- **OQ-DIPL-12**: Envoy's empty province: diplomacy 2.1 runs it "as if it had no official"; country-stats 9 says
- **OQ-DIPL-13**: Seats boundary: a seat is gained at "more than 10 provinces" and lost "below 10". Does a realm of
- **OQ-DIPL-14**: Hungary's seats in the worked example: "2 envoy seats (more than 10 provinces)". G5 Royal chancery
- **OQ-DIPL-15**: Rounding. Standing ÷ 4 and the league's standing ÷ 4 give fractions; the Venice example turns
- **OQ-DIPL-16**: Strength multiples: is a ratio between 1 and 2 one full multiple (Venice example: −10)? At equal
- **OQ-DIPL-17**: Scope of *You threaten our frontier* (5.3, in every count) versus 3.3 ("a reason in alliance
- **OQ-DIPL-18**: Which actions "rely on your word"? 3.3 lists alliances, pacts, sworn peace, pledges, marriages;
- **OQ-DIPL-19**: Ledger details: is standing clamped to −200..+200? Do the state line (Alliance +50) and the
- **OQ-DIPL-20**: Telegraph exceptions: the design keeps marriages and residents travelling; config also excludes
- **OQ-DIPL-21**: "A country that has denied you passage" blocks envoys (2.2). Does a refused passage request count
- **OQ-DIPL-22**: Missing commands: lifting an embargo, withdrawing a pledge, stopping rebel funding, dropping a
- **OQ-DIPL-23**: Rebel funding differs from revolutions 7.1 (decided 16 Oct, same day): caught chance 3 % there
- **OQ-DIPL-24**: Proposed edits not adopted elsewhere: rebellions-design has no *Foreign agitators* or *Foreign
- **OQ-DIPL-25**: Leagues started by an event: do they dissolve by the same rule (Lands taken below half the
- **OQ-DIPL-26**: `notoriety` = 5 × Lands taken + "the weight of Notorious deeds": Notorious deeds are negative
- **OQ-DIPL-27**: The relations README and relation types still say a Rival gives "extra prestige for wars" and that
- **OQ-DIPL-28**: The 1444 dataset disagrees with the catalogue in nine pairs (Soest, Herzegovina, Athens,
- **OQ-DIPL-29**: Envoy speed rests on the planning thread's march pace (6 days per crossing unit), which the gap
- **OQ-DIPL-30**: Fund rebels "Needs an envoy seat" but the target's caught chance depends on who runs the province;
- **OQ-DIPL-31**: Order of the diplomacy steps inside the month (answers before or after warfare's peace, AI
- **OQ-DIPL-32**: Subjects 12 expects envoys to carry *Tighten*, *Fold in*, *Station a resident* and *Offer
- **OQ-DIPL-33**: The war declaration sheet (13.3) shows "Serbia (subject, joins)" on the Ottoman side, but Serbia is a
- **OQ-DIPL-34**: The relation-rules Alliance description says allies "accept calls to arms" and Friendly "ranks the

## Events (events)

- **OQ-EVT-1**: The data still holds 59 events after 31 August 1939 and the Decolonization (window from 1919, start
- **OQ-EVT-2**: Interwar coverage is thin: 10 events start 1918–1939 (wilsonian_moment, armistice_1918,
- **OQ-EVT-3**: The validator's anachronisms (Johor 1511, Hyderabad, Bengal and Awadh 1707, Tahiti 1768,
- **OQ-EVT-4**: The tree's statistics (prosperity, unrest, devastation, control, legitimacy, integration_strain …)
- **OQ-EVT-5**: `rebels` (type, size × manpower_yield), `rebel_thresholds` (unrest 60 / 90), `rebels_active` and
- **OQ-EVT-6**: Schema and data disagree: data puts `duration_years`, `cooldown_years`, `max_occurrences`,
- **OQ-EVT-7**: How many options: the README says two or three, the validator 2 or more, revolutions allow up to
- **OQ-EVT-8**: Balance lets an unanswered decision lapse after 10 years and re-enter the pool; screen-flow (16 Oct)
- **OQ-EVT-9**: Game rules: balance has three alternate history presets plus a "historical lean" rule; screen-flow
- **OQ-EVT-10**: `is_human` changes selection weights for human players. Does this break the multiplayer-friendly
- **OQ-EVT-11**: None of the sibling additions is merged (religion, revolutions, culture, subjects, diplomacy,
- **OQ-EVT-12**: Culture says the event tree has 38 culture groups (42 with its four additions); enums.yaml lists 39.
- **OQ-EVT-13**: Post-1939 values remain in closed lists: innovations computing, green_revolution_agriculture,
- **OQ-EVT-14**: Diplomacy asks for `trust` and `notoriety` to be derived (read-only); statistics.yaml has
- **OQ-EVT-15**: When in the month do age and period checks run ("yearly")? Ages are checked yearly; periods do not
- **OQ-EVT-16**: Religion moves three world-state flags (religious_persecution_active, missionary_persecution,

## Exploration (exploration)

- **OQ-EXPL-1**: First contact and disease when worlds meet are left out on purpose (exploration 10.3; gap 14 lists
- **OQ-EXPL-2**: Colonising land of stateless peoples. Gap-lists (16 Oct, 22:34) still lists it as open ("being
- **OQ-EXPL-3**: Regions outside the gating age. The age gate is one config line, but `age_of_exploration` covers
- **OQ-EXPL-4**: S3 realms. Does the age gate apply to S3 realms too (the unlock is "S4 or S3, and the age")? S3 gives 1
- **OQ-EXPL-5**: "Nearest port or colony" for colonial range: does a colony still being founded count, does a subject's
- **OQ-EXPL-6**: Colonial governor hire cost and yearly wage are not given; where he is hired (which port) is not said
- **OQ-EXPL-7**: The founded colony and subjects: exploration 5.3 says the province becomes the country's with the
- **OQ-EXPL-8**: `colonial_presence` in the event tree counts "provinces held as colonies, protectorates or trading
- **OQ-EXPL-9**: If a country's government form changes while a colony is being founded, or its range shrinks, does the
- **OQ-EXPL-10**: A colonial governor ashore who dies of old age: is the colony lost, or does it go on without him? A
- **OQ-EXPL-11**: Interference: what happens when another country attacks or takes a colony being founded, or the
- **OQ-EXPL-12**: Abandon: what happens to colony food left in the colony, and can the governor be landed elsewhere
- **OQ-EXPL-13**: AI margin of stores "plus a margin" not given. [exploration §8]
- **OQ-EXPL-14**: Pressure roll distribution: "a roll from 0 to twice the average" — whole numbers, uniform? The table's
- **OQ-EXPL-15**: Charts between countries: do allies, subjects or overlords share charted maps, and does conquering or
- **OQ-EXPL-16**: The start charted reach (6 steps of your lands, plus touching sea zones) and the client today
- **OQ-EXPL-17**: Voyages must "leave port with full supply": can a voyage be given to an exploration ship already at
- **OQ-EXPL-18**: Naval 3.3 lists the caravel unlock as "S4 plus the exploration unlock" and the voyaging canoe as S3

## Game shell (game-shell)

- **OQ-SHELL-1**: **Victory conditions.** Gap lists decided (16 Oct) that a campaign is won by world domination or by leading the Economy, Power or Technology score, but how each score is measured, what counts as world domination and when the scores are judged (presumably at the end date) are not designed. Screen flow E2 was written before the decision ("if gap list 1, item 1 chooses one"). Open: does world domination end the campaign early; can a score lead fire before the end date; what E3's "final outcome" says for a loss. Blocks SHELL-097, SHELL-098, SHELL-099.
- **OQ-SHELL-2**: **Battle stop vs warfare 7.15.** Screen flow G6 (decided 16 Oct): the turn stops when it reaches each player battle, on a before-the-battle card with changeable standing orders, Fight and Skip to result. Warfare 7.15 still says battles are resolved when the month ends and the turn stops on a battle report with a Watch button. Gap lists List 1 item 3 still calls it unsettled. Also open: whether the player has any other choice on the before-the-battle card (screen flow defers to warfare). Blocks SHELL-074–076.
- **OQ-SHELL-3**: **Main menu first focus and first-launch question.** Screen flow S4 says focus starts "on Continue when it exists, otherwise on New campaign (tutorial not done) or New campaign", which reads as a slip (Tutorial was probably meant when the tutorial is not done). The tutorial design (§9) also adds a first-launch question "New to Pocket Hegemony?" (Play the tutorial / Guided campaign / I know the way) after the title, and a Tutorial entry with a chapter list; screen flow S2 does not have it, and "Guided campaign" has no place in S5.
- **OQ-SHELL-4**: **Load screen shape.** Screen flow S6 lists saves newest first with banner, realm, dates and an autosave or ironman mark. The saves design (§2.1, §9) lists campaigns first (banner, nation, date, turn, play time, map crop) and a campaign's saves inside, each marked with the device that made it, plus a "Sign in to sync" prompt. Screen flow did not take this in.
- **OQ-SHELL-5**: **Which save the shell relies on.** Screen flow speaks of "an autosave taken just before the turn runs" (G5), "autosave if anything changed" on backgrounding (R1) and "Restore the last autosave" (X1). The saves design's autosave is the rotating one on the player's interval (default every 12 turns), and protection comes from the Resume save (written after every End turn) plus the orders journal (written on backgrounding). The shell's wording needs mapping to the Resume save, or the saves design needs a pre-turn save.
- **OQ-SHELL-6**: **Unanswered events and the End turn question.** Screen flow: unanswered events block End turn and the button opens the first one. Settings §5.3: "Unanswered events always ask" and the question names "3 warnings, 2 events wait for you". These disagree on whether events can ever be passed with "End turn anyway". Screen flow's decision (16 Oct) is taken here.
- **OQ-SHELL-7**: **End turn hold time on a controller.** Screen flow §8.3: held for half a second. Settings §5.4: View button, hold 1 s (`hold_seconds: 1.0`). Keyboard Enter: hold 0.5 s. Also which button is the controller's "next" that opens Attention (settings maps notifications to d-pad left/right and the turn report to View).
- **OQ-SHELL-8**: **Controller action sets.** Screen flow §8.3 defines six (Shell, Map, Card, Book, Modal, Battle); settings §6.3 declares three (Map, Menu, Battle) plus a Text layer.
- **OQ-SHELL-9**: **March order by touch.** Screen flow §8.2: tap an army, then a province gives the order. Settings §5.4 (right-click off): "tap army, tap province, confirm", with a confirm step.
- **OQ-SHELL-10**: **Long press.** Screen flow §8.2: long press only explains. Settings: long-press shows "a tooltip or the action menu" and resets a settings row (the only per-row reset on touch); the Attention mute uses long press but also has a button.
- **OQ-SHELL-11**: **Game menu entries.** G4 lists eight entries. Other designs ask for more: Campaign rules (settings §2), Send a report (saves §7), three tutorial lines during the tutorial (tutorial §12), whether the campaign can still earn achievements (achievements). Also, in ironman the saves design forbids Load of earlier points, but G4's Load entry is not restricted.
- **OQ-SHELL-12**: **Settings from the title: overlay or full screen.** Screen list: `settings` is an Overlay. Settings §2: "Title screen: Settings button (full screen)".
- **OQ-SHELL-13**: **First-run questions.** S2 has two (language, consent). Settings §2 adds a third on the Big screen profile ("Is this text easy to read?" Smaller / Fine / Bigger).
- **OQ-SHELL-14**: **Campaign options wording.** S5 says "AI temper"; gap lists and settings say "AI aggression". The allowed range of the end date (only the default 31 August 1939 is given; anything after is out of scope) and the music-era rule (settings §4.3) are not in S5.
- **OQ-SHELL-15**: **Attention vs "Needs attention".** The tutorial design calls the screen "Needs attention", with a "Go there" button and opportunities and first-time "New" entries; screen flow has two groups (Warnings, Waiting for you) and a Show button. Where mutes are stored (tutorial: in tutorial progress, owned by saves) is not in the saves design. The encyclopedia is called "Almanac" in the tutorial design.
- **OQ-SHELL-16**: **Free tier and store screens.** The unlock and purchase screens (gap list 2, item 5) are not designed; whether the free mobile tier keeps its one ad is open (List 3, item 2); free realms are the Ottomans and France. What other limits the Steam demo has is open.
- **OQ-SHELL-17**: **Game over cause "a successor rule ends it".** No design defines the successor rule.
- **OQ-SHELL-18**: **Left-handed layout.** Settings "Main hand: Left" mirrors the End turn button to the left; screen flow fixes End turn lower right and the game menu upper left at opposite corners. Whether the game menu button moves too is not said.
- **OQ-SHELL-19**: **Tablet rotation in today's build.** `apps/mobile/scripts/landscape.mjs` still locks iPads (`~ipad`), so the Tall layout is unreachable on tablets until the build change lands.
- **OQ-SHELL-20**: **Shape vs device profile thresholds.** Short wide is "height under 500 css px"; the settings Phone profile is "short side under 600 CSS px". A phone with a short side of 500–599 px gets the Phone profile but not the Short wide shape; the Tall shape "never phones" is defined by device, not by window.
- **OQ-SHELL-21**: **Final result for non-ironman campaigns.** E3 shows "achievements earned in this campaign", but achievements are ironman-only (achievements v1.1), so most campaigns show none. Whether E3 says so is open.
- **OQ-SHELL-22**: **Owner designs not yet written.** Turn report contents (gap list 2, item 7), ledger and final result (item 8), new game setup details (item 2), input scheme (item 9), credits (item 15) and the privacy plan (List 3, item 7) are all referenced but missing; their screens are placed here only.
- **OQ-SHELL-23**: **Pausing the month.** The engine's `endTurn` today processes a whole month in one call; G6 needs the month to stop at each player battle and resume, and replay to that battle deterministically after a kill. Owned by time-and-turns.
- **OQ-SHELL-24**: **Battle viewer controls.** Settings maps the battle view as A pause/play, B skip to result, X replay last bell, Y commander's line, Menu leave; screen flow's Battle action set has Fight and Carry on, which the settings layout does not name.

## Government (government)

- **OQ-GOV-1**: Reform to a constitutional form: the design's table says "Any monarchy or republic → constitutional, 150 to 250 gold, 0 to 4 lords", but config allows constitutional monarchy only from diet, absolute and bureaucratic (200 / 1) and shogunate (250 / 4), and constitutional republic from the three citizen forms (150 / 0). Feudal, elective, household, tribute empire, paramount chiefdom and the faith forms cannot reach it directly. This spec follows config ("the full list is in the config"); confirm.
- **OQ-GOV-2**: Three `next` links have no reform row: confederation → constitutional republic, military junta → constitutional republic, party state → constitutional republic. Are they reachable only by revolution/event, or are reform rows missing?
- **OQ-GOV-3**: Several config reform rows are conditions rather than choices, at 0 gold: feudal → elective ("the ruling line dies out"), horde → confederation ("no adult heir"), shogunate → warlord domain ("the shogun loses the capital"), merchant republic → city commune ("trade in debt 3 years running"), constitutional monarchy ↔ republic ("ruler deposed", "king invited"), company → colonial government ("the crown takes over"). Does the change happen automatically when the condition holds, or must the country choose? The design lists the shogunate case as a change "without a reform", config as a reform.
- **OQ-GOV-4**: Which lords lose a step when a reform passes ("some lords")? Lowest loyalty first like the New Year rule, the biggest, or chosen at random?
- **OQ-GOV-5**: Culture design 5.1 / config `officials.capacity_weight` says a stranger-majority province counts as 1.5 provinces toward how many officials and lords the government can support. Government v2 has no province count in either cap. Not adopted; decide whether it is dropped or how it enters the caps.
- **OQ-GOV-6**: Culture design 10 proposes government types limit Tongue policies ("a nation state can Impose; a confederation is always Let be"). Government v2 has no such rule and no "nation state" form.
- **OQ-GOV-7**: "Changes needed elsewhere" not yet adopted: province-stats 12.1 has no *Grasping officials*; country-stats 5.5 has no *Great lord*; country-stats 8.2 still describes an inheritance law fixed by culture and history (including how a lord's land splits), and gap-lists still lists inheritance law as open, while government says succession by form settles it. Which wins, and who decides how a lord's land passes?
- **OQ-GOV-8**: Event mapping `monarchy` keeps ten forms but not elective monarchy, constitutional monarchy or the faith forms, although the design says "any house … monarchy stays as it is"; an elective or constitutional monarchy hit by `monarchy` would become a feudal realm. Likewise `republic` keeps city commune, peasant commune and constitutional republic but not merchant republic. Intended?
- **OQ-GOV-9**: Revolutions' `restored_monarchy` uses `old_form`: GOV must remember the form held before the last revolutionary regime. Not in the government design. Also revolutions' `committee_rule` "adds the army as a power base", but power bases were removed in v2.
- **OQ-GOV-10**: Seat: government says "one per town", buildings 7.7 says "one per province". Buildings landmarks give a palace step 4 (Forbidden City +24 officials, Topkapı +20 officials) but government lists palace steps 1–3 only.
- **OQ-GOV-11**: "`admin_capacity` in events becomes the officials cap": does an event's `admin_capacity` change add to or replace the officials cap, and for how long?
- **OQ-GOV-12**: No AI behaviour is designed for government (when to reform, building cap buildings, handling over-cap).
- **OQ-GOV-13**: Self-run forms: "their own people run their home provinces". Who counts as "own people" (culture's kin only, or cousins too)? Culture is not referenced.
- **OQ-GOV-14**: "A ruler takes a reformed faith" (prince-bishopric/order → feudal) has no definition in the religion design, which has no "reformed faith" term (Protestant? Anglican? any adopted faith?).
- **OQ-GOV-15**: Religion config restricts the Inquisition to governments `[monarchy, elective_monarchy, constitutional_monarchy]` (event-tree values). Which of the 27 forms count as "monarchies" for it is not stated.
- **OQ-GOV-16**: Where an event sets a form with `none` subject reach (colonial government) on a country that holds subjects, what happens to its subjects?
- **OQ-GOV-17**: Over the officials cap: the order is "newest hires first", but officials can also come as graduates or from a dying lord's line (province 10.2). Is "hired" the date they entered service?

## Map presentation (map-presentation)

- **OQ-VIEW-1**: Sharpness against the shading rule.** Settings §5.1 says Sharpness Balanced is "up to 2
- **OQ-VIEW-2**: Lens list not agreed.** Province stats 14 lists ten lenses including Traders passing and Trade
- **OQ-VIEW-3**: Parchment: display, rule or gameplay?** Settings §4.3 keeps "Parchment over unknown lands" as
- **OQ-VIEW-4**: Zoom names.** Province, warfare and troop-movement use World, Region, Local; naval and
- **OQ-VIEW-5**: Zoom boundaries.** No design gives the camera zoom at which World, Region and Local change;
- **OQ-VIEW-6**: Playback and battle stops.** Troop-movement §10.6 plays the month back with half-second
- **OQ-VIEW-7**: New systems' zoom content.** Gap item 29 asks every new system for its zoom table and lens.
- **OQ-VIEW-8**: Budgets on real devices.** Budgets are checked on a CI machine in mobile Chromium with a
- **OQ-VIEW-9**: Battery saver's AI budget.** Settings says Battery saver runs the AI turn "with a smaller
- **OQ-VIEW-10**: Map pixel art scale versus Map detail.** README describes 4 × 4 at middle zoom and 8 × 8 close

## National strengths (national-strengths)

- **OQ-HER-1**: Inherited birthrights. 30 years and accepted culture are proposals; the culture design may set a better rule. [ns §14.1]
- **OQ-HER-2**: Lever count. The design and README say 63 levers; levers.json holds 64 (the build report uses all 64). Which is right?
- **OQ-HER-3**: Size bonus for France. The design says the size bonus is "nothing for Ming, the Ottomans or France", but France's size class is 4.2, and the rules give 0.5 below 4.5 (build report: France bonus 0.5).
- **OQ-HER-4**: Trade levers aimed at dropped rules. `trade_balance_pct` (owner province-stats 7.3, 256 uses) and `traders_passing_pct` (province-stats 7.2, 452 uses) target stats trade v2 drops or turns into a count; `trader_gain_pct` says "each month on its route" but traders collect on entering each province; `trader_count` gives "extra trader units you can field" but trade has no cap on traders. What do these levers change now?
- **OQ-HER-5**: Building levers' owner. `building_cost_pct` and `building_unlock` point at province-stats 4; the buildings design now owns the building list. Building ids must follow the buildings design.
- **OQ-HER-6**: Event-tree stats. The `stat` lever and `stat_points` use legitimacy, stability, prestige, notoriety, admin_capacity, literacy, cohesion, kept for event-tree compatibility. Do these terms conflict with the rule "nothing copied from EU4", and which context owns them?
- **OQ-HER-7**: Unique building variants. Buildings §9.2 offers Külliye, Kontor, Qollqa line, Polder mill, Ever-normal granary and Funduq quarter as a hook "for the national strengths design"; heritage has no lever or field to carry one. Accept, and how?
- **OQ-HER-8**: Example vs authored Portugal. `data/example-portugal.json` (heyday "The Cape route", 3 birthright effects, goal Calicut, 2 legacy effects) differs from the authored entry and design §11 (heyday "Carreira da Índia", 5 birthright effects, "Goa or Calicut", legacy also with harder-hitting carracks). The example also uses a `colonial_presence` condition not among the heritage conditions; is it in the event-tree vocabulary?
- **OQ-HER-9**: Evaluation timing. How often are needs, wakes, stir, goal, fail and shed checked (each month, each day, each year)? Heyday "years awake" and claim "30 years" need a counting unit.
- **OQ-HER-10**: Pool maximum. Design says pools of 4 to 7; config has only minimums. Is 7 a cap for generated pools, and how do age ambitions count?
- **OQ-HER-11**: Envoy reading. Depends on diplomacy stationing envoys at a court for 2 years; does diplomacy have stationed envoys?
- **OQ-HER-12**: AI choices. The AI's rule for which heyday sleeps when a third would wake, and which legacy to let go at six, is not given.
- **OQ-HER-13**: Warmth band edges. Design: under a third cold, under two thirds warm; config: warm from 0.34, hot from 0.67. Exactly 1/3 and 2/3 fall differently. Which?
- **OQ-HER-14**: Mark share. "A third" vs config 0.33; is a mark a legacy that counts toward the 5-legacy cap?
- **OQ-HER-15**: Archetype count. Design says 27 archetypes; the build report lists 26 in use for generated countries. Is one archetype unused by design?
- **OQ-HER-16**: Unbound ids. 273 place names still to bind to map provinces; requested event ids, areas, hubs, sea ids, wares, ships, styles and a religion id are worked around with place names. Heritage conditions can't be checked against the map until bound.
- **OQ-HER-17**: Formed countries' legacies beyond 5. Formed countries keep the forming country's legacies and add the formed country's heritage; if that exceeds 5 legacies or 2 birthrights, which go?

## Naval (naval)

- **OQ-NAVY-1**: Berths and slipways per step (10/25/50; 1/2/2, Arsenal 3) need a balancing pass with trade's ship
- **OQ-NAVY-2**: The seafolk share at sea (2 in 3) is high on purpose; lower it if fleets come out too big for small
- **OQ-NAVY-3**: Women at sea. Naval 14.3 waits on the women question; the 16 Oct decision lets women be rulers, lords
- **OQ-NAVY-4**: Ship of the line needs shipyard 3 and S9 (naval 1.2, 3.3), but buildings 7.9 unlocks shipyard step 3
- **OQ-NAVY-5**: Warfare 11.1 has not adopted naval's asks: no caravel, fluyt or steamer rows; no ship families; crew
- **OQ-NAVY-6**: Damage model: warfare 11.2 counts hits as damage, a ship sinking or taken when hits equal its
- **OQ-NAVY-7**: Storms: warfare 11.3 loses 1 ship in 20 a month in storm season unless in port (reduced by S1, S11,
- **OQ-NAVY-8**: Trade 3.2 vs naval 3.3: trade gives the caravel hold ×1 and purse 20 while naval says the caravel is
- **OQ-NAVY-9**: The grievances *Pressed* and *Lost at sea* are not in province stats 12.1's list. [naval §13; province §12.1]
- **OQ-NAVY-10**: Canoe landings start with "extra seafolk and small craft" but province stats 16 has no such starting
- **OQ-NAVY-11**: Recruiting has not adopted that the levy pool counts sailors already gone, nor named commissioning
- **OQ-NAVY-12**: Country stats 6 *Ships* still reads "building in ports (gold, timber provinces help)"; rows *Sailors*
- **OQ-NAVY-13**: The diplomacy design does not cover docking (peace and no rivalry, no port-access grant), selling
- **OQ-NAVY-14**: Muster numbers missing as rules: the bounty per sailor (examples: 15 gold for 300, 4 for 75), the
- **OQ-NAVY-15**: Admiral commission cost and pay: the Lagos example has "10 gold commission; his wage ×3 at sea",
- **OQ-NAVY-16**: Harbour step 3: naval gives "coaling for steamships and later"; buildings 7.9 says "ocean ships and
- **OQ-NAVY-17**: Naval base: buildings 7.9 reads "keep their crews in peace without pay at sea" and adds port
- **OQ-NAVY-18**: Under-crewing: 4.3 scales days in inverse proportion to crew (half crew, twice the days), 7.1 says
- **OQ-NAVY-19**: Small craft are "Small craft" in the ship table, but 3.2 says every ship type belongs to one of three
- **OQ-NAVY-20**: Junks and dhows are ocean-going "in their own monsoon seas from the start (T5)": does this need T5
- **OQ-NAVY-21**: Later-era ships (ironclads, dreadnoughts, submarines, carriers; S14 to S18) have no crew, cost,
- **OQ-NAVY-22**: Foreign crews: which seafaring peoples call at which ports, and how many sailors can be hired, are
- **OQ-NAVY-23**: Pirates: "season" length, the starting size of each pirate fleet, the pirate coast list's zones, and
- **OQ-NAVY-24**: The official-to-admiral table has no row for the colonial governor (a new official type,
- **OQ-NAVY-25**: Sea-power AI keeps "a share of seafolk always at sea": the share is not given. [naval §11]
- **OQ-NAVY-26**: Subjects asks naval to define "your sea route" (for *Far away*), a colony's defence by sea, and what
- **OQ-NAVY-27**: Map: neighbouring ports share one province (Lübeck, Hamburg, Kiel, Flensburg in
- **OQ-NAVY-28**: Docking in a subject's or lord's port pays food "from that province": the subject's or lord's
- **OQ-NAVY-29**: Muster order: 2.2 says "Seafolk are taken first", but the muster preview shows 300 sailors "taken

## Onboarding (onboarding)

- **OQ-TUT-1**: The Attention screen: this design lists three kinds (Warnings, Opportunities, New) with "Go there" and "Don't list this kind again"; the screen flow's G9 (owner of the screen) has two groups (Warnings, Waiting for you), a "Show" button, muting per item or per kind with unmute, and says it "says what is wrong, never what to do about it", which sits badly with Opportunities lines such as "A lord across the border may be won over". Names differ too ("Needs attention" vs "Attention"). Blocks: TUT-072 to TUT-083.
- **OQ-TUT-2**: The step mock-up (§3.9) labels the face "The Chancellor", but the text says the face is the grand vizier Çandarlı Halil. Blocks: art and string keys.
- **OQ-TUT-3**: Off-script consequences cross chapters (refused peace changes chapter 4's event line; an ignored wavering lord's riders stay home in chapter 7), but each chapter starts from a fixed save that puts the world back on its historical course. Which wins when chapters are played in sequence? Blocks: TUT-012, TUT-015, TUT-030, TUT-032.
- **OQ-TUT-4**: §12 asks the turn report thread for "warnings always listed there (5.4)", but there is no section 5.4, and §5.3 says the turn report links to the list instead of repeating it. Blocks: TUT-081.
- **OQ-TUT-5**: The first-launch question "New to Pocket Hegemony?" (§9) does not appear in the screen flow, which instead shows a Tutorial main-menu entry that moves under More once finished. The "Encyclopedia" of the screen flow is this design's "Almanac". Blocks: TUT-104, naming.
- **OQ-TUT-6**: The saves design does not mention tutorial progress, Needs attention mutes, read-only chapter saves or the "began as the tutorial" mark. Blocks: TUT-004, TUT-106, TUT-107.
- **OQ-TUT-7**: Sounds: this design asks for a step chime, a completion tick, the vizier's note and a new-warning sound, "ducked under music like stingers". The sound effects design gives only `ui_hint` (and `notify_alert` for "advisor hints", though there is no advisor after the tutorial), has no completion tick, and effects do not duck music. Blocks: audio for steps.
- **OQ-TUT-8**: The devshirme in a real campaign (§3.7 proposal) needs the recruiting and sensitive-history threads to adopt or change it; it also affects age ratings. (§13.1)
- **OQ-TUT-9**: Scripted events are not yet in the event tree; the event tree should add the Varna crusade and the abdication as real events, and an effect that grants a war aim (religion §18). Blocks: TUT-037, TUT-038.
- **OQ-TUT-10**: Next pass (§13.2): fold in diplomacy (envoy step in chapter 1) and subjects (Serbia returned in chapter 1; the Morea's tribute in chapter 8).
- **OQ-TUT-11**: The Ottoman worked-example numbers for recruiting, battle and siege lessons don't exist yet (only French ones). Blocks: TUT-018 and chapter saves.
- **OQ-TUT-12**: Whether Advance to… becomes a real-game feature belongs to the turn report thread (gap list 2, item 7). The controller column of §8.2 waits on the input scheme thread. The privacy thread (consent for measuring) has no design yet.
- **OQ-TUT-13**: Settings has a "Detailed tooltips" switch (off by default) that "shows the full breakdown of each number", which overlaps with "Why?" (always one tap away here), and a "Tutorial hints" switch whose effect this design does not define. Blocks: TUT-084 to TUT-086.
- **OQ-TUT-14**: Free tier reference: the design cites "gap list 3, item 2" for the free tier; the decision is in gap list 1, item 2 (Ottomans and France). No conflict in substance.
- **OQ-TUT-15**: Herds rules for pastoral realms are not designed (goal text "Choose how your herds are shared"). The accessibility thread should give every lens the tutorial uses a pattern or icon besides colour (only Food's hunger icon is given; Faith uses hatching at 30 %+).

## Province (province)

- **OQ-PROV-1**: ** Trade v2 replaces province stats §7 and asks for edits the province design has not adopted: the card's Trade line; 4.3 market text; 6.4 "−5 % traders pass through" → "−5 % trade ratio gain"; 10.2 Customs officer "+15 % traders passing" → "+15 % trade ratio gain"; §13 gold income = reaches you + trade income (not trade balances); §15 `trade_access` → trade ratio gain; §17 yearly trader paths replaced. By the latest-decision rule trade v2 wins; the province design text needs the edits. Blocks: PROV-121, PROV-260, Customs officer effect, event mapping of `trade_access`.
- **OQ-PROV-2**: ** Rebels: province §12.1 says 4 or more grievances make rebels and a share of recruits take up arms each month; rebellions §2.1 says 4+ is *Plotting* with a monthly chance to rise (5 %/15 %/30 % for 4/5/6+) and a spark can start a rising at 3. The judge's "rebels need 5 instead of 4" has no counterpart in rebellions. Which governs, and what is the monthly share? Blocks PROV-231, 232, 236.
- **OQ-PROV-3**: ** Upkeep: province §4 says unpaid upkeep for 10 years makes a building fall one step or close, §11 says 10 years without upkeep drops the castle a step; buildings §5.2 says one unpaid month makes it Neglected (works at half) and 10 years neglected drops a step; buildings §18 asks the province to adopt neglect. Not adopted.
- **OQ-PROV-4**: ** Plague updates each week while an outbreak runs (§17), but the game turn is one month (gap-lists). How weekly plague steps run inside a monthly turn is not said.
- **OQ-PROV-5**: ** Muster master and levies: province 6.4 and 10.2 say levies under a muster master take homeless men first; 6.6 says recruits come "more from homeless men". Recruiting asks to drop "homeless first" (every levy takes all classes by share), add a recruit ceiling by class, *Fallen from here*, *Veterans here*, a **Marshal** official type and a **deputy** from clerks. Not adopted.
- **OQ-PROV-6**: ** Grievance list is not updated with other designs' additions: *Grasping officials* (government), *Banned tongue* and *Foreign rule* for strangers only before nationalism (culture), the new *Wrong faith* wording and *Persecuted* counting as two (religion), *Foreign agitators* / *Foreign meddling* (diplomacy, addressed to rebellions). Which list is authoritative?
- **OQ-PROV-7**: ** Colonising stateless peoples' land is still open (gap-lists A.5). Province §12.3 allows colonies in any unowned province on free tiles and forbids land of "any country, tribal countries included"; whether stateless peoples' land is "unowned" is the open point. Also: province settlement steps (none, trading post, settlement, colony) vs subjects' colony stages (Outpost, Settled, Self-governing) and exploration's "settlement at *settlement*" — the mapping between the two ladders is not stated.
- **OQ-PROV-8**: ** Birth and death modifiers are written "+0.5", "−1", "−2" without unit (percentage points of the yearly rate?). The Troyes example (2,800 born, 2,200 dead, "well fed, at peace", 7 months in store) matches the base rates without the +0.5 food and +0.5 peace modifiers; with them births would be about 3,500.
- **OQ-PROV-9**: ** Hospitals, wells and drains: province 4.3 "Later inventions"; buildings §18 says the hospital is known at start and wells and drains become ring works. Not adopted.
- **OQ-PROV-10**: ** Tax timing and losses: tax owed is yearly but turns are monthly (when is it paid?); "every day of travel beyond 5 loses a share" — the share is not given; can a tax collector's +20 % push "reaches you" above tax owed?
- **OQ-PROV-11**: ** Tile count 4–16 "by size on the map": the mapping from map size to count is not given. Town size thresholds in townsfolk (hamlet … great city) are not given except 40,000 for a second tile; "a great city a third" has no number.
- **OQ-PROV-12**: ** Wares list additions not adopted: buildings asks for stone, grapes, dates, guns, steel, cement (marble as stone); national strengths asks for amber, wax and honey, alum. Classes for new buildings (buildings §18 6.3) also not adopted.
- **OQ-PROV-13**: ** Culture asks that officials have a tongue and learn slower among cousins (7 years) and strangers (10 years), and that settlers may go to own provinces with free tiles; not adopted (10.2 says 5 years for all).
- **OQ-PROV-14**: ** Harvest steps: "each is one step better" — what a step does at bumper, and how steps from F19 (+2), F22, F16 (30 years), *Fodder crops* stack, is not said. Food per worker for rice is "1.5, two harvests" — whether per harvest or per year is ambiguous.
- **OQ-PROV-15**: ** Sickness (Low, Medium, High, Heat, Cold), foraging (Rich … Almost none) and fever land steps have no numbers in the design (the code's march defines carry foraging numbers: scenario-setup/warfare to confirm).
- **OQ-PROV-16**: ** Event mapping leaves choices open: `prosperity +2` → "two new buildings that fit" (who picks?), `control −20` → "the official flees, or the road breaks" (which?), and several rows (`trade_good`, `urbanization`, `manpower_yield`, `environmental_degradation`, `culture_share`, `colonial_status`) have no worked effect.
- **OQ-PROV-17**: ** Recruit share per class per year, the homeless drift share, the rebel muster share, and refugee "share" values are not given.
- **OQ-PROV-18**: ** Rebels "a share of the recruits take up arms" vs §6.4 "rebels muster from the homeless first, at twice the rate" — which pool (recruits or homeless) feeds rebels first?
- **OQ-PROV-19**: ** No AI design for tax rates, tolls, charters, officials placement or food at province level; gap-lists item 18 (the AI as a whole) is open.
- **OQ-PROV-20**: ** The province config file and its keys are not named in the design; keys in §10 are proposals.
- **OQ-PROV-21**: ** Tax rate scale: province §8 has five steps including *None*; country stats §2 lists four (light/normal/heavy/crushing). Province §8 says it replaces the country rate; realm must align (see OQ-REALM-8).
- **OQ-PROV-22**: ** The Troyes card shows a tax collector of 6 years, 3 days to Paris, 11 gold owed and 9 reaching you. No rule in §8 or §10.2 loses those 2 gold (a tax collector at full effect should add 20 %). Which rule applies?
- **OQ-PROV-23**: ** Lords' recruits: country stats §5.2 and province §6.6 say a lord keeps his province's recruits as his retinue, but for a lord's province without one of his officials (§10.3: pays him half, *Ungoverned*) the effect on recruits is not stated.
- **OQ-PROV-24**: ** Province §10.2 says "one official runs one province", but country stats §4 says inventions raise how many provinces one official can run, and the research tree gives G1 (1 province), G9 (2), G16 (3), B2 and G11 (+1 near or far from the capital), T14 (+1). Which holds? (Same as OQ-REALM-14.)

## Realm (realm)

- **OQ-REALM-1**: ** Trade v2 (§14) asks country stats to: add "🐫 Traders" to the card; change Gold's "trade from merchants" to "deposits from traders, market fees and tolls"; replace *Merchants* with *Traders* and *Trade ships*; map `trade_access` to starting traders. Not adopted. Trade v2 also drops the rule that a city buys grain through trade, while §3.1 *Grain price* and the Food policy *Surplus: sell on the market* still buy and sell grain on "the nearest market" — which market and price mechanism remains?
- **OQ-REALM-2**: ** Diplomacy §18 asks: rename *Envoys* to **Envoy seats**; add "📯 Envoys n of m abroad" and "⛓ Leagues against you" to the card; add **Pretenders at court**; read `opinion`, `trust`, `notoriety` per diplomacy §11. Not adopted.
- **OQ-REALM-3**: ** Warfare §18 asks: link soldiers' four kinds; commanders from warfare §4; add **Arms store**, **Powder store**, **Prisoners**, **Victories / Defeats**, **Troop cap**; show **Peace voices** on the Enemies line; map `war_weariness` to Fallen and peace voices and `prestige` to Victories. Not adopted. Army refill: warfare says armies at home take what they need from their castle first, then the locals; country stats keeps "Locals only" as default.
- **OQ-REALM-4**: ** Government asks for succession by government form (country stats 8) and a *Great lord* loyalty reason (lords with 4–7 provinces one reason, 8+ two); §8.2 says succession is fixed by culture and history. Not adopted. Government also maps `admin_capacity` to the officials cap, while §11 maps it to Officials.
- **OQ-REALM-5**: ** Gap-lists still lists "Country stats 12: inheritance law" as open (being explained in the planning round); §8.2 now defines it. Is §8.2 the decision?
- **OQ-REALM-6**: ** Win scores: how "soldiers weighted by kind" and commanders are weighted; what "allies-by-marriage" and "settled provinces" are; whether leading at the end date needs the margin; ties and several winners; how often scores are judged; whether the campaign ends or continues on a win. Gap-lists said these were "still to design"; §12 answers part.
- **OQ-REALM-7**: ** Women in roles: base chances and age multipliers are not given; the Age of Decolonization (where chances become close to even) is out of scope (ends 1939); country stats §7.1 says students are "young men taken from recruits" while scholars can be women.
- **OQ-REALM-8**: ** Tax rate scale: country stats §2 lists light/normal/heavy/crushing; province §8 adds *None* and says it replaces the country rate.
- **OQ-REALM-9**: ** Other designs' edits not adopted: religion (Faith = "state faith or a faith layered with it", *Preachers* in Abroad, faith loyalty steps); culture (Tongue % counts cousins as half); subjects (Subjects row reads "Vassals, tributaries, unions, marches, colonies and protectorates"); recruiting (commanders by commissioning an official); buildings (building upkeep in Gold's losses and on the treasury card).
- **OQ-REALM-10**: ** Starting values: the mapping from qualitative assessments to numbers, and the width of the "wider random range" for low confidence, are not given; randomness must be seeded for multiplayer determinism (gap-lists A.4).
- **OQ-REALM-11**: ** Food year: "each autumn" for the whole world (southern hemisphere, monsoon lands) is not discussed; weather odds per region, transfer loss per province, rot per season and the reach of each road step are not given.
- **OQ-REALM-12**: ** Fallen, Oaths broken and Lands taken are defined as "in the last N years" but "each year fades the old count" — a hard window or a gradual fade?
- **OQ-REALM-13**: ** Debt: interest rates, loan sizes, which lenders exist and what "lords lending in exchange for favours" gives are not stated; how "a lord who is owed money gets more demanding" works is not stated.
- **OQ-REALM-14**: ** Officials per province: country stats §4 and the research tree (G1 1, G9 2, G16 3, B2/G11/T14 +1) let one official run several provinces; province §10.2 says one official runs one province.
- **OQ-REALM-15**: ** Realm config file and keys are not named except `women_in_roles` and `age_multipliers`.
- **OQ-REALM-16**: ** No AI rule for food policy, debt, lord handling, fiefs or tax; gap-lists item 18 (the AI as a whole) is open.
- **OQ-REALM-17**: ** Child ruler regency: §8 says "a lord rules for them", §8.1 says a queen mother can be regent; who is picked is not stated.
- **OQ-REALM-18**: ** Commanders "with Might, Cunning and Logistics (from the repo)": warfare asks to replace the repo pointer with warfare §4; commander gain/lose lists differ.

## Rebellions (rebellions)

- **OQ-REBL-1**: Province stats 12.1 says at 4 or more grievances "a share of the recruits take up arms each
- **OQ-REBL-2**: Religion 18 asks rebellions 2.3 and 5.1 to change the faith demand to "their faith Tolerated, or a
- **OQ-REBL-3**: Diplomacy 6.11 and 18 ask rebellions to add the grievances *Foreign agitators* (riots need one
- **OQ-REBL-4**: Revolutions asks rebellions to carry `revolution: <event id>` on a rising, replace the 3.1 join
- **OQ-REBL-5**: The event tree spawns rebels by `type` (peasant, religious, noble, separatist, revolutionary,
- **OQ-REBL-6**: No numbers for: spread chances and each factor; "some gold" for a talk; the bribe price;
- **OQ-REBL-7**: The cause table covers only some grievances. Which cause do *Burned homes*, *Ungoverned*,
- **OQ-REBL-8**: 4.1 makes "the capital's province" a great revolt; 4.3 makes a rising "in or next to the capital"
- **OQ-REBL-9**: When does a disloyal lord choose to revolt (the Lord cause "a disloyal lord's own choice")? Country
- **OQ-REBL-10**: What does a leader's Logistics do for rebels, and what Might and Cunning values do "Cunning,
- **OQ-REBL-11**: Culture 5.2/6.4: homeland risings with nationalism 0.5+ demand a new country, "not self-rule".
- **OQ-REBL-12**: The New ideas cause needs "the event tree's ideology support" and "later eras": which ideology
- **OQ-REBL-13**: Exploration replaces "native uprisings as separate stats and events" with a local aggression roll
- **OQ-REBL-14**: Recruiting says veterans who keep their arms start any rising "armed and drilled". The arms
- **OQ-REBL-15**: Severity *Riot* is "one province, no army"; the step *Riots* is 3 grievances. Is a riot province

## Recruiting (recruiting)

- **OQ-RECR-1**: The fighting-age share (a quarter) and the call shares (4–24 %) decide army size and recovery; they need a balancing pass against the troop cap (warfare 2.5). Recruiting §11.1; gap-lists A5 still lists "Recruiting 11: the levy and call shares" as open. Blocks: final config values.
- **OQ-RECR-2**: Women in the levy. Recruiting §11.2 defers to the country design; gap-lists decided (16 Oct) women can be rulers, lords and commanders following each country's history, but says nothing on the levy. Blocks: fighting-age share per country.
- **OQ-RECR-3**: Muster master refill: recruiting 2.4 says a third of the gap a year (instead of a quarter, i.e. a third faster), but recruiting §10 and province 10.2 say "recruits refill 25 % faster". Which number?
- **OQ-RECR-4**: Warfare has not adopted recruiting §10: warfare 3.1 still has the muster master take homeless first and arms taken at the levy; 2.3 still says levies are "farmers, herders and homeless"; 4.4 still has lord commanders, risen from the ranks, school graduates and exiles as commanders and no commissioned-official row; 3.5 still sends arms back to the store with no Keep/Let-them-keep choice and no soldier settlers. Latest decision is recruiting v3, but warfare v5 owns those sections.
- **OQ-RECR-5**: Province stats has not adopted recruiting §10: 6.6 has no Fallen from here or Veterans here, says recruits refill "a share of every class except clergy and scholars each year, more from homeless men", and says soldiers come home "as homeless and overflow into the emptiest slots" (recruiting 6.2: emptiest slots first, homeless only if none free); 10.2 still has the muster master take homeless first and no Marshal type or deputy.
- **OQ-RECR-6**: Country stats §6 Commanders row has not gained "commissioning an official" (recruiting §10); its gain list is "hiring; a lord or heir taking command; promotion after victory".
- **OQ-RECR-7**: Engine code differs: `runLevies`/`recomputeMaxLevies` keep one realm-wide pool of 4 men per 1,000 people refilling 1/60 a month, not a per-province ceiling by class share refilling a quarter of the gap a year; upkeep is 0.2 gold per 1,000 men a month for all men from the first month (`military.upkeepPerThousandMenPerMonth`), not 0.15 gold per man after 3 free months and pay by arm; `march.rationsPerSoldier` is 2 for every army, also at home (design: 1 at home, 1.5 in camp, 2 on campaign).
- **OQ-RECR-8**: When do the 3 free months start? The worked example says pikes and light horse (3 months) finish "inside the 3 free months", which only holds if the count starts when gathering ends (or if the 2 weeks of gathering are inside the 3 months and training starts at once). Section 4.4 says "knights (9 months) cost 6 months of pay".
- **OQ-RECR-9**: Pay by arm names five groups (foot, gunners, horse, knights, gun crews); it does not say which group archers, hand gunners, pike and shot, musketeers, riflemen, camel riders, horse archers or war elephants belong to.
- **OQ-RECR-10**: The Conscription threshold: is "below a quarter of the ceiling" measured on the pool after the levy (the example "pool left 37 %" divides by the full pool, equal to the ceiling there)? And how do the Fallen (a third) and W15 (a tenth) thresholds combine when both apply?
- **OQ-RECR-11**: Annual rules (refill a quarter of the gap a year, Fallen and Veterans fade a tenth a year, 0.2 % births for 10 years) are run in a monthly update (§9); how they are split per month is not stated. The monthly step order is time-and-turns'.
- **OQ-RECR-12**: W18 Railway mobilization: recruiting says levies gather "in days, not weeks" (no number); research-tree says "whole army raised in weeks"; warfare 2.5 gives W18 +1 % troop cap. Number and wording disagree.
- **OQ-RECR-13**: Students are callable (§2.2 table, §6.2) but no share or rule says how many students a levy takes, or whether students are inside the clergy/scholars 0 share.
- **OQ-RECR-14**: The rice-land (two harvests, two bad seasons) and pastoral (herd growth lost in the spring move) harvest rules give no amounts; season months per climate are "in config" with no values.
- **OQ-RECR-15**: Where levies gather: the levy screen shows "Ready in 2 weeks at Troyes" for a 4-province region levy; warfare 3.1 says each levy gathers in the province's castle or town. Which place is the muster for a region or country levy, and how does it combine with troop-movement 8 "New regiments go to"?
- **OQ-RECR-16**: Generals who grow too big: recruiting says "with 6 victories they ask for land" and "8 victories who led the same regiments 5 years becomes their man"; warfare 4.6 says "standing regiments or hired companies" and does not mention the land request at 6. Does the land request apply to all commanders or only officials?
- **OQ-RECR-17**: Years served "+1 to the type's highest skill": no tie rule for types whose skills tie (Marshal 2/2/2, Muster master and Master of works are clear; Judge Might 1 Cunning 2 is clear; Marshal is tied). "Up to 5" is not said to be the skill cap or the bonus cap.
- **OQ-RECR-18**: A captain's staff is 50, but the number of a captain's staff horses is not given (30 is given for a commander). Whether staff count as men toward forage limit or column size is not stated. The worked example's monthly food (11,500) leaves out the commander's staff (~290).
- **OQ-RECR-19**: The recruiting config file and its key names are not named in the design, and the engine still uses `levies` and `military` blocks in `defines.json`.
- **OQ-RECR-20**: Amounts missing: "a little" lord loyalty and ruler standing per official victory; how a tenth of loot is split among home provinces; how long the 1.5× effect of a returning official with 3+ victories lasts; how much theft and begging fall with homeless taken.
- **OQ-RECR-21**: Seafolk: naval mustering takes seafolk first (2 in 3 of seafolk fighting-age men callable, naval 2) from "the same people as the levy", while recruiting's call share for seafolk is 8 % and calls the ceiling hard ("no levy, war or invention"). Does the naval muster count against the recruiting ceiling, or is it a separate ceiling?
- **OQ-RECR-22**: Gap-lists v2 lists "a barracks building" as an open recruiting question; recruiting v3 and buildings 7.8 have answered it (drill yard, barracks step with W12). The gap list is stale on this point.
- **OQ-RECR-23**: The levy screen counts a class "others" (50 men in Champagne) which is not a class in the 2.2 table; and which provinces a region levy may draw (only royal provinces, as "4 royal provinces" and warfare 3.1 imply, or also lords').
- **OQ-RECR-24**: "Riots halve what you can call": halves the pool, or the ceiling, and for how long?

## Religion (religion)

- **OQ-RELG-1**: *Wrong faith* threshold: §5.2 gives Tolerated faiths *Wrong faith* "where unserved" (communities start at 10 %), while §18 and the 16 Oct defaults say a third. This spec follows the later decision (a third); confirm that unserved communities from 10 % to a third take no grievance.
- **OQ-RELG-2**: Units of hold: "share × 4" only gives the stated speed (half the distance in about 40 years) if shares are fractions (0–1). Confirm. Also the East Bengal example's "target" (Sunni 54 %, Hindu 31 %, traditional 15 %) is the settled point (pulls only), not the yearly formula's target, which includes hold.
- **OQ-RELG-3**: The province card example in §1 does not follow the rules: Protestant pull "Reformation wave (2 presses), 1 church = 4.0" would be 3 + 1.5 = 4.5 (or 5.5 with the Protestant press rule), and "about 1 point a year" is far more than the 3 % move gives (about 0.2 points). Which numbers are right?
- **OQ-RELG-4**: Expulsion: design and config say 70 % leave; the event `expulsion_of_the_moriscos` moves 90 %.
- **OQ-RELG-5**: `court_conversion_islam` tests `religion_share where: $ruler ≥ 0.3` (realm), while its note and the Adopt rule speak of the capital being a third Muslim; `court_conversion_christian` uses 15 % Protestant.
- **OQ-RELG-6**: Config `houses.community_founds_own_house {min_share 0.20, every_years 20}` has no rule in the design.
- **OQ-RELG-7**: Config-only numbers with no design text: Inquisition upkeep 10 gold (design: "as a court with officials"), preacher upkeep 1 gold a year, foreign preacher expel chance 0.25 a year, take-over gold 20 per step, waves max_active 8.
- **OQ-RELG-8**: Inquisition: "monarchies" are given as event-tree values `[monarchy, elective_monarchy, constitutional_monarchy]`; government v2 has 27 forms. Which forms qualify?
- **OQ-RELG-9**: Government's reform "the ruler takes a reformed faith" (prince-bishopric/order → feudal realm) is not a term here. Which faith changes count?
- **OQ-RELG-10**: §18 changes not adopted: province-stats 12.1 still defines *Wrong faith* as "Most people don't share the ruler's faith" and has no *Persecuted*; 4.3 and 6.5 not updated; country-stats 4 and 5.5; rebellions 2.3/5.1; warfare 10.1; event-tree `enums.yaml` lacks hussite, jain, asian_traditional; vocabulary, events, patches and flags not merged.
- **OQ-RELG-11**: The religion events' effects use stats `stability`, `legitimacy`, `unrest`, `income`, `trade_power`, `literacy` (event-tree modifiers), which this design's "count what you can point at" rule and the country stats may not have. How do they map?
- **OQ-RELG-12**: Catalogue mapping: 3 texts unmapped ("Messianic movements (Hurufiyya, Nurbakhshiyya)", "Mixed", "Unknown"), 2 records (wokou, guanahatabey) with no state faith, and 2 records mapped to `minor_other`, which is not a faith id.
- **OQ-RELG-13**: Persecuted houses "closed, or taken over (you choose per realm)": one choice for the realm, or per Persecuted faith?
- **OQ-RELG-14**: Hussite merge: "at the end of the Reformation period (by 1620)" — config `merge_at_end_of: p_protestant_reformation, merge_latest_year: 1620`. If the period ends after 1620, which wins (assumed the earlier)?
- **OQ-RELG-15**: Secular pull: design needs "towns with factories and mass schooling"; config needs innovation `mass_literacy_schooling` and has no factory condition.
- **OQ-RELG-16**: Amritsar: config `earliest: 1577`, buildings 7.5 "from the 1580s". The Temple of the Tooth "follows the relic to Kandy (1590s)": by which event or rule?
- **OQ-RELG-17**: Fourth faith arriving replaces the smallest only if larger; culture's fourth tongue replaces the smallest always. One storage rule, two behaviours.
- **OQ-RELG-18**: Buildings 7.5 says monks "travel out from here as missionaries" and "pulling one [minority house] down is persecution"; religion uses preachers and a policy. Align wording.
- **OQ-RELG-19**: "Adopt a faith … you start with none [preachers] of the new faith until houses of it exist" vs preachers from monasteries, schools and holy places: are holy-place and event preachers also withheld?
- **OQ-RELG-20**: Holy place provinces are names to be bound when the catalogue is mapped onto the map (gap list item 25); not yet bound.
- **OQ-RELG-21**: Tolerated lords waver "once when you tolerate a faith of 10 % or more of the realm": does a faith that grows past 10 % while already Tolerated trigger it?
- **OQ-RELG-22**: "Some inventions" give preachers (§6): which is not stated.
- **OQ-RELG-23**: Holy places held by the Sharifs "under the Mamluks" (config holder mamluk): who holds Mecca when the subject and overlord differ?

## Research (research)

- **OQ-RSCH-1**: ** Era VII is cut at 1939, but the tree dates eras, not inventions. Which of the 18 Era VII inventions (L21 Radio, L22 Antibiotics, L23 Nuclear physics, L24 Rocketry, C21 Assembly line, C22 motor_and_air_transport, C23 Plastics, B15 Highways, B16 Airfields, F21 Tractors, F22 Hybrid seeds, S18 Aircraft carriers, S19 Radar, W21 Tanks, W22 Military aircraft, W23 Field radio, G18 Planned economy, G19 Welfare state) stay in play before 31 August 1939? Their unlock texts (nuclear power, missiles, satellites) point past 1939. Blocks RSCH-045 and the Era VII cost.
- **OQ-RSCH-2**: ** Era VIII is out of scope, yet 3 of the 20 ★ event-tree inventions are Era VIII (L25 computing, T19 internet, F23 green_revolution_agriculture); country stats §11 says all 20 event-tree innovations are in the tree. The events reading them belong to out-of-scope ages; confirm they are dropped. Warfare-eras' proposed Era VIII inventions (Helicopters, Anti-tank and anti-air missiles) are moot.
- **OQ-RSCH-3**: ** S14 *Ironclads* is era V but is placed as a child of C18 *Bessemer steel*, era VI, so it can only be studied after an era VI invention (at double cost before 1870). Wrong parent or wrong era?
- **OQ-RSCH-4**: ** Trade v2 §11 rewrites T-branch effects that the tree has not adopted: T2 "Collections +10 %" (tree: merchants earn +10 %); T6 "market step 2, +2 visits a month" (tree: +1 merchant slot); T8 "trading posts overseas count as cities and can found traders" (tree: trading posts overseas, +1 colonial governor slot); T9 "trade ships cost 25 % less" (tree: companies that fund fleets and colonies, +1 colonial governor slot); T11 "half the purse of a lost ship refunded"; T13 "see every known province's trade value and ratio" (tree: see and trade grain prices); S2 "hold +0.5". Do T8 and T9 keep exploration's colonial governor slot as well?
- **OQ-RSCH-5**: ** Other proposed tree edits not adopted: diplomacy (G8 also unlocks asking for passage); buildings (G3 *Tax registers* and G10 *Census* take effect only with a chancery; new buildings hang on W3, C1, T2, T7, G1, G3, L3, L5, B11, B14, B16, G4, G14); warfare-eras (a **staff college** school type that trains commanders); warfare §12 gives numbers the tree lacks (e.g. W15 recruits +50 %, W12 troop cap +0.5 % of people).
- **OQ-RSCH-6**: ** Research is given per year (1 scholar-year per scholar per year) but turns are monthly; whether progress accrues monthly (1/12) or yearly is not said.
- **OQ-RSCH-7**: ** Two studies at once with an academy-level school: how scholars and students are divided between the two studies, and whether one academy anywhere in the realm suffices, is not said.
- **OQ-RSCH-8**: ** Spread modifiers: L5 and L14 give "inventions spread +20 %", L21 "faster spread", T19 "double speed" (out of scope); whether these raise the 10 % per partner, the 60 % cap, or something else is not said. Culture asks that a neighbour of the same tongue family count double toward the 60 % cap; not adopted. "Neighbour" (bordering country?) is not defined.
- **OQ-RSCH-9**: ** Seats: L18 "every province gets seats" gives no number; country stats §7.1 names "colleges" with no invention; staff college proposed. School upkeep in gold is not given.
- **OQ-RSCH-10**: ** "Stealing it in war", the chance that fighting sacks a school, how scholars flee and how a richer neighbour poaches scholars have no rules or numbers.
- **OQ-RSCH-11**: ** Start sets: the mapping from `institutional_development` and region to known inventions is not given; "Iberians with ocean ships under way" suggests starting progress on a study, which no rule covers.
- **OQ-RSCH-12**: ** Most effects are unquantified ("Scholars +research", "Schools cost less", "+gold", "+recruits"); a balancing pass is needed (gap-lists item 21).
- **OQ-RSCH-13**: ** Contact inventions: only F9 is marked ⇄; which contact events open it (Atlantic crossing example) and who owns them (exploration opens with the Age of Exploration) is not stated.
- **OQ-RSCH-14**: ** No AI rule for choosing studies, filling seats or calling students to arms.
- **OQ-RSCH-15**: ** Students are "young men taken from recruits" while women can be scholars (country stats §8.1); how a woman scholar enters the pipeline is not stated (see OQ-REALM-7).
- **OQ-RSCH-16**: ** F16 *Guano* gives "+1 harvest step for 30 years, then needs F19": what happens after 30 years without F19 is not said.
- **OQ-RSCH-17**: ** Graduates as officials: province §10.2 gives types by school type for any graduate; G4 *Examination system* says "scholars can become officials directly" — what G4 adds beyond the general rule is unclear.

## Revolutions (revolutions)

- **OQ-REVO-1**: Two designs of the same secret action. Revolutions 7.1: gold each month = 1 % of the target's
- **OQ-REVO-2**: Government v2 removed power bases, service grants and forced changes. Regimes still reference them:
- **OQ-REVO-3**: Revolutions 4 says a province where the revolution camp holds the castle counts as "Risen
- **OQ-REVO-4**: Signs read event-tree abstract stats (`stability`, `legitimacy`, `literacy`, `debt`,
- **OQ-REVO-5**: Subjects has not yet added a "colony of who is Disloyal" condition; until then the American and
- **OQ-REVO-6**: National strengths asked which strengths a regime may grant or shed; revolutions leaves it as a hook.
- **OQ-REVO-7**: The seven new sources in additions.yaml are `verified: false`.
- **OQ-REVO-8**: Counter-revolution length and malus: the global config proposes 25 years and −50; regimes give
- **OQ-REVO-9**: "Restorations happen as often as revolutions" has no mechanism or number. The generic
- **OQ-REVO-10**: Wave amounts: is a family wave a one-off share change or yearly, and over what range is
- **OQ-REVO-11**: Merged events keep their old option effects next to `regime` (for example `french_revolution`
- **OQ-REVO-12**: When a country holding `crown_and_assembly` before G14 later gains G14, does its form switch to
- **OQ-REVO-13**: `armistice_1918` keeps its existing trigger (no signs). Does it show a card at all, and how is it
- **OQ-REVO-14**: "Every decree has a cost the player feels" but `army_council`, `table_of_ranks` list cost "None";
- **OQ-REVO-15**: The event tree patch is not merged (event tree still 306 events). Until the event tree's owner
- **OQ-REVO-16**: The `from_above` family says nobody rises: "the ruler starts it as a decision", but its events

## Saves (saves)

- **OQ-SAVE-1**: **Achievement flags.** Achievements v1.1 (16 Oct) makes every achievement ironman-only and asks for three save flags (`ironman_unbroken`, `cheat_marked`, `switched_country`); this supersedes the saves design's recommendation ("no"). The header only has `ironman` and a "modified" mark. The tutorial also asks for a "began as the tutorial" mark. Blocks SAVE-038, SAVE-095.
- **OQ-SAVE-2**: **What is written on backgrounding.** §2.1 and the config write the Resume save (and ironman save) on pause, quit, suspend and background; §3.1 and §5.2 say that on backgrounding only the orders journal is written, because serialising the whole world might not fit in the seconds the OS gives. Both can't be the rule for a mid-turn background.
- **OQ-SAVE-3**: **Screen flow's "autosave".** Screen flow says an autosave is taken just before the turn runs (G5), on backgrounding "if anything changed" (R1), and X1 offers "Restore the last autosave". In this design autosaves are only the rotating interval saves; the pre-turn state is the Resume save plus journal. The wording needs one mapping.
- **OQ-SAVE-4**: **Load screen.** Saves: campaigns first, then their saves, each marked with device. Screen flow S6: a flat list of saves newest first with an autosave or ironman mark. Not reconciled.
- **OQ-SAVE-5**: **Server quota and social sign-in.** 300 saves / 200 MB is a starting point to set once real sizes are measured (§8.6); Sign in with Apple, Google and Steam at launch or after (§8.7).
- **OQ-SAVE-6**: **Settings and tutorial progress storage.** Settings §4.2 says personal settings sync through the same account and store backups and that Steam Auto-Cloud covers `settings-personal.json`; tutorial §9/§12 asks saves to store tutorial progress and Attention mutes apart from saves and sync them. The saves design has no endpoint, file or synced-set entry for either (principle 6 only says they "live elsewhere").
- **OQ-SAVE-7**: **Cheats.** Ironman forbids "console or debug tools"; achievements mention "turning on a cheat" and a `cheat_marked` flag. No design says what cheats or a console exist outside ironman.
- **OQ-SAVE-8**: **Header options.** The header's `options` has difficulty, events and end date; the campaign rules (settings §4.3, screen flow S5) also include AI aggression / AI temper, fog of war and possibly the music-era rule. Not said where those are saved.
- **OQ-SAVE-9**: **Autosave timing.** "Every 12 turns (each January)" fixes the month; for "every 6 turns" the months are not said. Whether an autosave is written in an ironman campaign is implied (settings hide the rows) but not stated by the saves design.
- **OQ-SAVE-10**: **Mid-turn choices and the engine protocol.** Screen flow now stops the month at each player battle, where standing orders can be changed for that battle; the journal holds only orders queued before End turn, so after a kill the replay to the battle is deterministic but choices made at earlier stops in the same month are not recorded. Today's `protocol.ts` also lacks `save`, `load`, `newGame` options and the Resume save in the `endTurn` reply.
- **OQ-SAVE-11**: **Budgets not taken in.** `performance/performance.md` does not list the save budgets of §3.4.
- **OQ-SAVE-12**: **Desktop quit wait (2 s)** is a number in the design but not in the config file.
- **OQ-SAVE-13**: **Steam demo limits.** What limits the demo has (List 3, item 2) and how the header stores them are not designed; the free mobile tier's free nations (the Ottomans and France) are decided.
- **OQ-SAVE-14**: **"Send a report" location.** Saves §7 puts it in the pause menu; screen flow puts it only on the failure screen X1.
- **OQ-SAVE-15**: **Import of an ironman save while offline.** "Import starts it on this device" but the ironman-head check only runs on upload; an import offline followed by play on the old device recreates the split. The design only covers the split prompt.
- **OQ-SAVE-16**: **Ironman exits.** Ironman saves are written "on every exit"; the game menu's "Save and quit" (screen flow) is the only manual path. Whether "Exit to main menu" in ironman and the app being killed mid-turn count as exits is implied, not stated.

## Scenario setup (scenario-setup)

- **OQ-SETUP-1**: Catalogue against the map (gap item 25).** The map has 137 nations; the catalogue 963
- **OQ-SETUP-2**: What becomes a country on the map.** Which representations own provinces: decentralised
- **OQ-SETUP-3**: Which nations are playable at launch (gap item 2).** 274 playable countries, 218 playable
- **OQ-SETUP-4**: Start date against reference day.** Relations and the catalogue describe 11 November 1444
- **OQ-SETUP-5**: Province starting values (gap item 26).** The design names sources but not values for every
- **OQ-SETUP-6**: Assessment levels to numbers.** Country stats 10 maps each assessment to stats but gives no
- **OQ-SETUP-7**: Events option.** New game offers "historical or free events"; the event tree has three
- **OQ-SETUP-8**: Collective institutions.** The 16 collective institution records have no rules (gap item 8
- **OQ-SETUP-9**: Group records.** Group records such as `silesia` and `tusi_group` stand for many polities
- **OQ-SETUP-10**: Two relationship sets.** The catalogue stores 1,126 relationship edges; the relations dataset
- **OQ-SETUP-11**: Flat engine starts.** The engine gives every nation 50 gold and levies from people, while
- **OQ-SETUP-12**: Warm-up and the clock.** The 24-month trader warm-up runs "before the first turn": does it
- **OQ-SETUP-13**: Map capitals and commanders.** Map nations carry capitals as coordinates and commanders with
- **OQ-SETUP-14**: Lords for minor countries.** Lords come from the great houses the catalogue names "for major
- **OQ-SETUP-15**: Province names.** Province names are still modern region names (gap item 25).
- **OQ-SETUP-17**: Map population against the worked examples.** The map gives Aube (Troyes) 305 thousand
- **OQ-SETUP-16**: Coverage and certainty.** 565 records have low overall confidence, 46 are partial and one is

## Settings (settings)

- **OQ-SET-1**: **Battery saver and the AI worker budget.** Battery saver sets `engine.worker_budget: low` ("the AI turn runs with a smaller worker budget"). If the AI has a computing budget per turn (gap lists List 1 item 18), a smaller budget could change AI decisions, which would break principle 6 (settings never change the simulation), determinism, replays from a report and multiplayer. Needs a rule that the budget only changes speed, not results.
- **OQ-SET-2**: **Unanswered events at End turn.** Settings: "Unanswered events always ask" and the question counts events. Screen flow (decided 16 Oct): unanswered events block End turn and the button opens the first one; the question names only warnings.
- **OQ-SET-3**: **Controller End turn.** Settings: View button, hold 1 s; screen flow §8.3: held half a second; keyboard: Enter held 0.5 s. Screen flow's controller "next" button opening Attention has no button in the settings layout (d-pad left/right is next notification, View is the turn report).
- **OQ-SET-4**: **Zoom keys.** The §5.4 table lists zoom in / out as "`+` / `−`, `Q` / `E`" (Q in, E out by position); the yaml binds `zoom_in: ["+", E]`, `zoom_out: ["-", Q]`.
- **OQ-SET-5**: **Action sets.** Settings §6.3 declares three Steam Input action sets (Map, Menu, Battle) plus Text; screen flow §8.3 defines six (Shell, Map, Card, Book, Modal, Battle).
- **OQ-SET-6**: **Platform marks between table and yaml.** Screen margins: table "D, S", yaml `[desktop]`; Touch target size: table n/a on Desktop and Big screen, yaml platforms `[mobile, desktop]`; Restore purchases: yaml `[mobile, desktop]` (Steam has no restore need stated); Haptics "On (phones)" vs yaml default true for mobile (tablets included).
- **OQ-SET-7**: **Long press.** Settings uses long-press to reset a row (the only per-row reset on touch) and to show "a tooltip or the action menu"; screen flow says long press only explains and no action exists only as a long press.
- **OQ-SET-8**: **March order flow.** Settings (right-click off): "tap army, tap province, confirm"; screen flow §8.2: tap an army, then a province, with no confirm step.
- **OQ-SET-9**: **First-launch questions.** Settings has three (language, consent, text readability on Big screen); screen flow S2 has two; the tutorial adds "New to Pocket Hegemony?". Also the language card: settings says "only when the system language isn't supported (falls back to English otherwise)", which reads as both asking and falling back.
- **OQ-SET-10**: **Settings from the title.** Settings §2: "Title screen: Settings button (full screen)"; screen flow: a cog, and Settings under More, shown as an Overlay; settings §8 itself says overlay.
- **OQ-SET-11**: **Pause menu.** Settings adds Campaign rules to the pause menu; screen flow's game menu (G4) does not list it, and screen flow says the game has a game menu, not a pause menu.
- **OQ-SET-12**: **Campaign rules list.** "AI aggression" (settings, gap lists) vs "AI temper" (screen flow S5); the music-era rule depends on music open question 2 (gap lists: Music 10 still open); the saves header stores only difficulty, events and end date.
- **OQ-SET-13**: **Personal settings sync not taken in by saves.** The saves design has no endpoint, synced-set entry or Auto-Cloud entry for `settings-personal.json`; "newest change wins, setting by setting" needs per-setting timestamps that no file format states.
- **OQ-SET-14**: **Profile thresholds vs shapes.** Phone profile: short side under 600 CSS px; game-shell Short wide shape: height under 500 css px. "TV-class display" for Big screen is not defined.
- **OQ-SET-15**: **Auto interface scale.** "A 360 × 640 CSS-px safe layout" is portrait-shaped while phones are landscape only; which way the 360 × 640 box is measured is not said.
- **OQ-SET-16**: **Main hand Left.** Mirrors the End turn button to the left; screen flow requires End turn and the game menu button at opposite corners — whether the game menu button moves right is not said.
- **OQ-SET-17**: **Place names list.** Historical place names need a name list that does not exist; until then both options show today's region names.
- **OQ-SET-18**: **Owner designs missing.** Privacy (consent rows, crash reports), store screens (Restore purchases), turn report ("important"), input scheme, accessibility and localisation designs are referenced but not written; Big screen and Deck numbers are to be checked against Valve's Steamworks post.
- **OQ-SET-19**: **Hint switches and mutes.** Settings puts "hint switches" in the personal group; the tutorial puts Attention mutes and seen first-time entries in tutorial progress owned by saves. Which store holds "Reset tutorial and hints" state is not settled.

## Subjects and overlords (subjects)

- **OQ-SUBJ-1**: Kinds joining wars and own diplomacy disagree with relation-rules `subject_kinds`, which diplomacy
- **OQ-SUBJ-2**: The relations config still holds subject income and manpower shares by its eight kinds (for example
- **OQ-SUBJ-3**: Estates: relations stores 32 estates as subjects that "always" join wars; subjects turns them into
- **OQ-SUBJ-4**: Diplomacy's ask names and acceptance: subjects 9 has "Offer protection (diplomacy design)" with a
- **OQ-SUBJ-5**: Subjects 12 expects envoys to carry Tighten, Fold in, Station a resident and Offer protection, and
- **OQ-SUBJ-6**: *Break a subject*: subjects 8.4 declares it "on your subject" (subject as target, warfare 10.1
- **OQ-SUBJ-7**: Stretched thin in the France example: rule 6 gives *Stretched thin* to every subject and −1 more to
- **OQ-SUBJ-8**: France example step 2: folding in the Dauphiné takes "one envoy for 3 months" (so 3 provinces), and
- **OQ-SUBJ-9**: Armagnac in the example goes from Loyal to Disloyal and then rises; the rising rule (8.2) needs a
- **OQ-SUBJ-10**: Gift "scaled to its income": the scale is not given; *Common enemy* "same rival" — Rival stance only
- **OQ-SUBJ-11**: Change masters (8.3): how the rival "accepts" (a reasons count? automatic?) is not given; and the
- **OQ-SUBJ-12**: Release (4): "its neighbours gain a Courted reason only if your enemies want them" — whose
- **OQ-SUBJ-13**: Held of the Church: "breaking the tie is a *Defend the faith* matter for others of that faith" —
- **OQ-SUBJ-14**: Raised lord counts against reach, but a raised Wavering lord's *Given a crown* is listed as +1 for 10
- **OQ-SUBJ-15**: Tighten "Vassal → Union is not possible"; config `tighten.order` has only tributary → vassal.
- **OQ-SUBJ-16**: Event-tree `vocabulary.yaml` does not yet have `subject_loyalty`, `add_subject_reason`,
- **OQ-SUBJ-17**: Country stats 9 still reads *Subjects* as "Vassal and tributary countries"; warfare 10.4
- **OQ-SUBJ-18**: Overseas trade empire (for era IV protectorates) is left to trade and naval to define (proposal:
- **OQ-SUBJ-19**: Government's optional limits on kinds (a tribal confederation holds only tributaries and marches;
- **OQ-SUBJ-20**: Place of the season count, tribute and risings in the month order (time-and-turns).
- **OQ-SUBJ-21**: Kalmar Union: Sweden's union "is Wavering in 1444 and should fall to Disloyal through events by
- **OQ-SUBJ-22**: Diplomacy's *Married houses* and claims to inherit a crown (diplomacy 6.2: the house with the most
- **OQ-SUBJ-23**: Colonies and the colony stage "mostly settler people" — the share is not given; Settled settlers
- **OQ-SUBJ-24**: Does the seasonal count move a Disloyal subject to In revolt (one step down on −2), or does a subject
- **OQ-SUBJ-25**: Names of some reasons are not given: the +1 for a lent official, the −2 for a harmed hostage, the

## Time and turns (time-and-turns)

- **OQ-TIME-1**: Start date.** The engine starts in March 1444 (`defines.json` `startDate`), the repo README
- **OQ-TIME-2**: Global turn order missing.** Gap list item 20: no design sets the order in which systems run in
- **OQ-TIME-3**: Battles inside the turn.** Three texts disagree: troop-movement §10.6/§15.1 plays the whole
- **OQ-TIME-4**: Weeks in a 30-day month.** Warfare runs army food, hunger, plunder and raids weekly; province
- **OQ-TIME-5**: Seasons.** No design says which months make spring, summer, autumn and winter for seasonal
- **OQ-TIME-6**: Year boundary.** Which month runs the yearly steps (traders, wares, drift, faith, fades)?
- **OQ-TIME-7**: Interrupted turns.** Save-system §3.2: a turn interrupted by backgrounding is "simply processed
- **OQ-TIME-8**: Ages past 1939.** The Age of World Wars has a window to 1960 and forced end 1960, its Second
- **OQ-TIME-9**: Eras.** The research tree still lists Era VII 1914–1960 and Era VIII (gap item 22 not yet
- **OQ-TIME-10**: When victory is judged.** Gap list item 1 asks when scores are judged ("presumably at the end
- **OQ-TIME-11**: Campaign seed.** `newGame` takes a `seed` (save-system §9), country stats 10 asks for a wider
- **OQ-TIME-12**: Several acting nations.** `processTurn` takes one `actingNation`. In what order are the orders
- **OQ-TIME-13**: Order within a day.** When several movers act on the same day (two armies arriving, a fleet
- **OQ-TIME-14**: Engine phases.** Marches before economy before levies, and the date advance last, come from
- **OQ-TIME-15**: Month playback.** Troop-movement §10.6 plays the month at about 1 s per 10 days with a skip

## Trade (trade)

- **OQ-TRADE-1**: Balancing. 3 points per trader, a tenth decay a month and the 0.2 visit share are placeholders, to be tuned (gap-lists List 1 item 21) so a busy 1444 road like Venice–Alexandria sits near 70 %. [trade §17.1]
- **OQ-TRADE-2**: Where a trader may be founded. §1 "a city with a yearly fair"; §2.2 "your city with a market"; §2.3 "market at step 2 or better, or a trading post"; §10.2 "one of your cities with a market"; T8 "overseas trading posts can found traders" while §2.3 already allows trading posts. Which building step is required, and is a trading post enough before T8?
- **OQ-TRADE-3**: Yearly fair unlock. Trade §11: T6 lets the yearly fair be built. Buildings: yearly fair from the start with a market charter. Research tree: T6 "+1 merchant slot". If T6 is needed, no country can hire traders in 1444, yet starting traders exist. Which?
- **OQ-TRADE-4**: Building roles differ from buildings §7.4. Caravanserai: trade +25 % and stops bandits; buildings "carried value grows while resting", T1 doubles its room. Counting house: trade foreign deposits; buildings traders draw treasury gold, merchant houses lend. Warehouse: trade deposits anywhere (asked buildings to agree). Trade asked; buildings not yet changed.
- **OQ-TRADE-5**: Ship trade numbers vs naval. Naval says the caravel is an exploration ship, not a trade ship, and the steamer needs checking against trade 3.2; trade lists caravel ×1 / 20. Is the caravel tradeable?
- **OQ-TRADE-6**: 1444 port list. Trade cites `naval/data/ports-1444.json`; buildings cites `start-ports.json` (236 provinces). Both exist. Which sets the sea ends of routes and the starting ports?
- **OQ-TRADE-7**: Province §7 not yet replaced: province still has Market price, Trade balance, yearly paths. Trade v2 wins by rule, but buildings §3.3 (material price by market price and few traders) and national-strengths levers `trade_balance_pct` (256 uses) and `traders_passing_pct` (452 uses) still target the dropped stats. What do those map to?
- **OQ-TRADE-8**: Closed borders. Trade 7.3 has "Closed borders (if diplomacy has it)"; diplomacy 6.5 has only trade pacts and embargoes. Does it exist?
- **OQ-TRADE-9**: How ratio-gain modifiers combine (customs +15 %, road +10 %, peace +10 %, riots ×0.5, homeless −5 % steps, trade_access): added together or multiplied? "Better road than its neighbours": than all, or than the average?
- **OQ-TRADE-10**: Customs officer "tolls and market fees collected in full" (trade §14) implies they are not collected in full otherwise, but no rule reduces them. What is the reduction without one?
- **OQ-TRADE-11**: Trade ship unpaid upkeep: land traders are lost after 6 months; the design gives no time for trade ships.
- **OQ-TRADE-12**: Crew sources. Land crews come "from the market's job slots", but rail freight takes 120 craftsmen. From where? What if the market has fewer than 50 market folk left?
- **OQ-TRADE-13**: Visibility. T13 lets a country see every known province's value and ratio "not only those your traders have visited", implying a default visibility rule nowhere stated. The route preview uses ratios of unvisited provinces.
- **OQ-TRADE-14**: Lords' traders: do they pay market fees and tolls in the crown's provinces, count as foreign for fees, and can they deposit in royal cities?
- **OQ-TRADE-15**: Percent "traders passing" effects elsewhere. Buildings' Djenné (+20 %) and Taj Mahal (+30 % traders passing), pilgrimage shrine pilgrims "count as traders passing", and HER's `traders_passing_pct`: traders passing is now a count driving ratio gain. Do they add to the count, the gain, or collections?
- **OQ-TRADE-16**: Sea-zone ratio. 13.3 stores a trade ratio per sea zone, but sea zones have nothing to collect and sea lanes lift port provinces. What is a sea zone's ratio used for?
- **OQ-TRADE-17**: Hubs. Config holds Alexandria, Amsterdam, Malacca Strait "and 20 more" with empty province lists; national-strengths asks for more hubs (tabriz, aleppo, volga, bruges/antwerp, seville, genoa, venice). `trade_index` 1444 reference has no value.
- **OQ-TRADE-18**: README still describes version 1 ("each month they collect where they stand"). HER lever `trader_gain_pct` also reads "each month on its route". Both conflict with collect-on-enter (decided 16 Oct).
- **OQ-TRADE-19**: Defining "food surplus" for goods value (what goes to the local store, province 5.1) when the store is full or the province hungry.

## Troop movement (troop-movement)

- **OQ-MOVE-1**: March pace. Troop-movement §3.1 and §15 say 6 days per crossing was decided by Leroy, and the code uses `daysPerCrossing` 6; gap-lists v2 (16 Oct) still lists "the planning thread: march pace (6 days per crossing unit)" as still open. Spec treats 6 as decided; the gap list should be closed.
- **OQ-MOVE-2**: Column penalty. Movement and code: +1 crossing (6 days on open ground); warfare 5.3: "moves one day slower per province". Which is meant?
- **OQ-MOVE-3**: The code's `stepDays`/`planRoute` lack road, season, march order, guns, Cunning, great rivers, bridges, fords, passes, straits and the may-enter rule; river days are a flat `riverCrossingDays` 1 (design: per 10,000 men, ×2 great river, 0 with bridge). Warfare 5.2 also still says "crossing a river shore tile without a bridge adds a day" and computes days as the whole ground's days, not half and half. Design (newer, decided) wins; warfare 5.2 and the code need updating.
- **OQ-MOVE-4**: The code walks each army's whole month in turn; the design needs a day loop for all armies at once (contact, castles stopping on a day, interception). Until built, contact and day-of-arrival rules can't be tested in code.
- **OQ-MOVE-5**: Code-only rules not in the design: an army may get only one move order per turn ("army already moved this turn"); a new order resets progress to 0 (losing days walked toward the next province); progress left over when a route ends is dropped; a move to the army's own province clears the route (design: Halt keeps the rest greyed). Which are intended?
- **OQ-MOVE-6**: Food in code: a month eaten up front, refill from forage wherever the army stops at month end, whatever the owner; design and warfare 6.2: own land refills (castle store first, then locals) along the way, abroad the reserve then plunder, allied and neutral armies share forage by men. Code also ignores ownership for foraging.
- **OQ-MOVE-7**: Passage. Movement 5.3: the planner never routes into a realm without passage ("needs passage from Savoy"). Diplomacy 6.4: "an army that enters without passage is an act of war" (the owner may declare war with aim Punish), which implies entering is possible. Movement §15.2 also leaves "whether a realm can march through a neutral's land at all without asking" to diplomacy; diplomacy says it can't before G8 unless ally or subject.
- **OQ-MOVE-8**: Watching the month. Movement plays the whole month and lets the player replay any battle from its notice; gap-lists A3 says whether a battle pauses the turn is still being settled. The day loop supports either.
- **OQ-MOVE-9**: Which ground does the season factor and the guns factor look at: the province entered, left, or either? The 3.2 table and the Dunois example apply both to the province entered (Troyes→Langres into hills gets guns; Langres→Dijon out of hills does not), but 3.1 does not say so.
- **OQ-MOVE-10**: Great river: "Natural Earth scale ranks 0 to 4" does not say which ranks are great rivers. Fords "count as bridges in summer and autumn": by hemisphere? Floods double river days "for a season": which season?
- **OQ-MOVE-11**: Dunes, glacier and paddies are tile types (terrain.md), but step days use province ground. How does a tile rule apply to a province ("3 crossings instead of 2" also assumes desert's 2 — is it the province's ground value that becomes 3)?
- **OQ-MOVE-12**: Raid. March order Raid ×0.67 (1.5× speed) while warfare 9.2 and movement 9.1 have a raider spend "a week in each province" burning. How do the week and the step days combine?
- **OQ-MOVE-13**: Withdraw before battle: §2.1 says "the weaker side may withdraw first if its commander is more cunning"; §6.1 says each side checks its retreat-if-outnumbered order and goes if its Cunning is higher. Can a stronger side withdraw? Is "trapped" in 6.1 judged including the province it came from?
- **OQ-MOVE-14**: §9.3 says "the three route settings above are the only other choices" but §9.2 lists two settings (Pace and On the way); §2.1 and §5 call "halt when the enemy is seen" a standing order while §9.2 makes it a route setting.
- **OQ-MOVE-15**: Numbers without config keys: join days (1), boarding rate, landing ×2, captured-commander escape Cunning 4, wet-season and winter months, snow-closure months; §13 lists only some keys.
- **OQ-MOVE-16**: "New regiments go to" a rally point (movement 8) vs where levies gather (recruiting 2.1, warfare 3.1: the province's castle or town). Does a levy gather first and then march, and does it need an order? Also naval asks sailors to walk between ports "at levy pace" (naval §11), which this design does not define.
- **OQ-MOVE-17**: Interception "its step to the enemy's province takes fewer days than the enemy has left on its own step": the enemy's remaining days are known only if seen; how does a rumour (scouting) count here?
- **OQ-MOVE-18**: Broken army "doesn't stop for castles of its own side" — and enemy castles on the way? The refuge search "fastest route ... up to 3 provinces": counted in provinces or steps, and may it pass enemy castles?
- **OQ-MOVE-19**: Dunois example: the planner ends at Langres "on day 14", but by the table the first two steps are 6.5 + 7.0 = 13.5 days; the rule for which day an arrival with a fraction counts is not stated (ceil?).
- **OQ-MOVE-20**: Strait ferry requires "a harbour on either side" — on either side (one is enough) or on both sides?

## Warfare (warfare)

- **OQ-WAR-1**: Hits per bell (4 %), break points (25–40 %), the flee share formula and troop cap shares need a
- **OQ-WAR-2**: Does a battle pause the turn? warfare v5 §7.15/§19 say decided (report + Watch, turn stops);
- **OQ-WAR-3**: Guns march penalty: warfare §2.2 "+25 % per gun beyond light field guns" vs troop-movement §3.1
- **OQ-WAR-4**: Big armies: warfare §5.3 "one day slower per province" vs troop-movement §3.1 "+1 crossing"
- **OQ-WAR-5**: River crossing penalty: warfare §7.2 shore sector "−25 % attacking across without a bridge"
- **OQ-WAR-6**: Commander origins: warfare §4.4 (lord commands, risen from the ranks, school graduate, exile) vs
- **OQ-WAR-7**: Country-stats has none of the rows warfare §18 asked for (arms store, powder store, prisoners,
- **OQ-WAR-8**: Terrain *steppe* proposal (+10 % horse) undecided; other proposals adopted only via troop-movement.
- **OQ-WAR-9**: Level thresholds: warfare §7.4 says its table (Drilled 3, Seasoned 6, Elite 12 months) shows era
- **OQ-WAR-10**: Era VI–VII battles last 10 and 30 days, but troop-movement says a battle takes 1 to 3 days and
- **OQ-WAR-11**: W20 Smokeless powder: warfare §7.10 "Ambush companies shoot from woods unseen"; eras §3 lists
- **OQ-WAR-12**: Era VII is cut at 31 August 1939, but Bewegungskrieg (France 1940), Glubokiy boy (1944),
- **OQ-WAR-13**: Staff college (eras §6, §8) and wargames are used for skill growth in eras VI–VII but no school
- **OQ-WAR-14**: The country catalogue lists no starting styles; its `military_doctrine` is free text and
- **OQ-WAR-15**: Break point of trained regiments: recruiting §4.3 says 30 % plus level for a trained regiment,
- **OQ-WAR-16**: War at sea: naval §8 adds a **Close** order (boarding) that is not among warfare §7.6's eight
- **OQ-WAR-17**: Amounts the designs leave out: "normal pay" per man (recruiting gives pay by arm), wagon build
- **OQ-WAR-18**: Ownership of the war-aim effects table and peace-term list: diplomacy v2 claims war aims and
- **OQ-WAR-19**: Storming an earthwork ring fort without a breach is "at double losses": does it stack with the
- **OQ-WAR-20**: Logistics era VI rotation "up to Logistics × 2 sectors" and era VII fuel for tanks and Air:
- **OQ-WAR-21**: Era I Cunning orders (1/2/2) differ from the main formula (1/2/3) and warfare §4.2 says "1 to 3

## World map (world-map)

- **OQ-MAP-1**: Tile type versus ground per province.** A province stores only its ground (11 values). Troop
- **OQ-MAP-2**: Terrain proposals still undecided.** The gap list asks for a yes or no on every proposal.
- **OQ-MAP-3**: Strait crossings are not in the data.** The map's `straits` join *seas*; troop movement needs a
- **OQ-MAP-4**: Navigable river against river province.** Province stats 9 has "whether a navigable river runs
- **OQ-MAP-5**: Great river per province and regions per province.** Troop movement charges twice the river
- **OQ-MAP-6**: Province names.** Province names are modern region names (gap item 25). Historical names are
- **OQ-MAP-7**: Map too coarse in places.** Several ports fall in one province (Lübeck, Hamburg, Kiel and
- **OQ-MAP-8**: Hills and mountains thresholds.** The 25 % / 50 % rule gives 443 hill and 610 mountain
- **OQ-MAP-9**: Mediterranean and steppe as grassland.** terrain.md notes the grassland numbers fit steppe but
- **OQ-MAP-10**: River crossing rule source.** terrain.md says "a day to cross … until bridges exist" (warfare
- **OQ-MAP-12**: Coastal without sea.** 78 provinces are marked coastal but have no sea-zone neighbour (lake
- **OQ-MAP-11**: Province count growth.** Save-system §3.4 expects the world to grow to hold 963 catalogue
