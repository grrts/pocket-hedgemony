# Research (RSCH)

## 1. Purpose and scope

Research decides how a country learns: schools with student seats, students taken from the recruit pool, scholars
who graduate from them, scholar-years of progress, and the one invention tree that every country climbs from a single
root. It also decides what may be studied, what it costs, how knowledge spreads from neighbours and trade partners,
what each country knows at the start, and which inventions are in scope for a campaign that ends on 31 August 1939.

**In scope**
- Schools, students, scholars and research as stats (country stats §7.1).
- Why war and research don't mix (§7.2).
- How research works (§7.3) and the research tree rules (research-tree "Rules").
- The full tree: every invention, its parent, extra needs, era, unlocks and start regions (research-tree "The tree").
- Scope cut: Era VIII out; Era VII cut at 1939 (gap-lists items 22 and decisions).
- The two eras before the start (Ancient and Medieval), each realm's start group and its standing (Leroy, 18 Oct; D-RSCH-21).
- Era I from the start (1378 at the earliest) to 1500, its pacing, and the start sets of a 1378 start (Leroy, 18 Oct; D-RSCH-23).

**Not in scope (owned by …)**
- What each invention does in another system where that system gives the numbers: warfare §12 (W, B, S), trade §11
  (T, S), exploration §4 (S5, T8, T9 colonial governor slots), buildings (buildings hung on ids), recruiting (W12, W15,
  W18), province (harvest steps, tile changes, school buildings' job slots).
- The school as a building (cost, upkeep, steps, job slots): **buildings** and **province**.
- The recruit pool itself: **realm** and **province**; officials and their types: **province**.
- The Technology win score: **realm** (built from inventions known weighted by era cost).

## 2. Sources

Newest decision first.
0. Leroy, 18 Oct 2026 (start date): campaign start 20 September 1378; stretch Era I back to the start (1378–1500) and keep the tree as it is (`start-date/plan-1378.md` §3.2, D-RSCH-23).
0. Leroy, 18 Oct 2026 (project chat): one single tree, reaching further into the past so some countries start behind; design each kingdom's starting technologies (D-RSCH-21).
1. `planning/gap-lists.md` (16 Oct 2026): decisions (campaign to 31 August 1939; research Era VIII and the 1939–1960 part
   of Era VII out of scope; multiplayer-friendly) and item 22 (drop Era VIII, cut Era VII at 1939, scholar-year costs
   are placeholders).
2. `trade/trade-design.md` v2 §9, §11, §14 (T-branch effects); `exploration/exploration-design.md` §4.1–4.2, §9;
   `diplomacy/diplomacy-design.md` §18; `buildings/buildings-design.md` §18; `warfare/warfare-design.md` §12, §18;
   `warfare/warfare-eras.md` §8; `culture/culture-design.md` (ideas travel in a shared speech).
3. `country-stats/research-tree.md` (rules and the tree, 174 inventions).
4. `country-stats/country-stats-design.md` version 3 §7 (schools and research), §11 (`tech_*`, `innovation`, `literacy`),
   §12 (Technology score).
5. `province-stats/province-stats-design.md` §6.6 (students and scholars here), §10.2 (graduates as officials, Schoolmaster).

## 3. Ubiquitous language

| Term | Meaning | Not to be confused with |
|---|---|---|
| School | A town building with student seats: temple and monastery school, madrasa, university, academy, later colleges and village schools | Scholar slot (province job slot) |
| Seat | Room for one student in a school | Job slot |
| Student | A young man taken from recruits to fill a seat; graduates after 5 years | Scholar |
| Scholar | A graduate working in schools and court; produces most research | Official |
| Scholar-year | One scholar's research for one year; the unit of invention cost | Gold |
| Invention | One node of the tree: a real, datable technique or institution | Technology score |
| Root | *Settled life*, known by everyone | Branch |
| Branch (was Bough) | One of the four first branches, known by every country at the start: R1 Tilling and building, R2 Fire and metal, R3 Counting and records, R4 Boats; drawn as a band of the one tree, never as a separate tree (RSCH-100) | Era |
| Parent | The invention a node grows from; must be known to study it | Also needs |
| Also needs | Extra inventions, possibly from another branch, that must also be known | Parent |
| "or" | Either listed invention is enough | |
| Era | Ancient (before 600) and Medieval (600–1377) before the start, then I from the start (1378 at the earliest) to 1500, II 1500–1600, III 1600–1700, IV 1700–1800, V 1800–1870, VI 1870–1914, VII 1914–1960 (cut at 1939), VIII 1960 on (out of scope) | Age (event tree) |
| Studying ahead | Studying an invention of an era later than the current date | |
| Spread | Discount from neighbours and trade partners who already know an invention | |
| Trade partner | A country whose traders deposit in, or collect in, your cities or yours in theirs (trade §9) | Ally |
| Contact invention (⇄) | An invention that opens only after a contact event | |
| Event-tree invention (★) | One of the 20 inventions whose ids the event tree already uses | |
| Past invention | An invention of the Ancient or Medieval era, known before the start: part of the baseline at the start that some realms lack | Era I invention |
| Without it | What lacking a past invention costs a realm, below the baseline at the start (RSCH-094) | Unlock |
| Start block | What differs for a campaign that starts on another date than 11 November 1444: the groups realms join and each realm's additions and removals (RSCH-114) | Start group |
| Era I pacing | Era I's cost per invention scaled to the share of Era I the campaign plays (RSCH-113) | Studying ahead |
| Start group | The set of realms that start with the same knowledge (§5.11) | Culture group, start label |
| Standing | The latest era of which a realm knows a quarter of the inventions, every earlier era too (RSCH-097) | Technology score |
| Behind the times | Standing earlier than the era of the current date | |
| Academy-level school | A school of the academy type (L12) or better, allowing two studies at once | |

## 4. Domain model

### Aggregates

**Research programme** (identity: country)
Holds: known inventions; current study (one, or two with an academy-level school) and progress in scholar-years;
seats to fill (player setting); students (per school, with years enrolled); scholars.
- INV-RSCH-1: a known invention is never lost.
- INV-RSCH-2: at most one study at a time, two once the country has an academy-level school.
- INV-RSCH-3: an invention can be studied only if its parent (or one of its "or" alternatives) and all its "also needs" are known, and, for a contact invention, its contact event has happened.
- INV-RSCH-4: every country knows the root and the four branches.
- INV-RSCH-5: Era VIII inventions are never studied; Era VII inventions only within the campaign (to 31 August 1939).

**Invention tree** (identity: one tree; config)
Holds: one row per invention with `id`, `parent`, `also_needs`, `era`, `unlocks`, `start_regions`.
- INV-RSCH-6: the tree is a single tree from one root; every invention has one parent (or alternatives) on the tree.
- INV-RSCH-7: the 20 ★ ids are unchanged so events keep working.
- INV-RSCH-8: every map nation belongs to exactly one start group, and every start set is complete (RSCH-098, RSCH-099).

### Entities and value objects
- **School** (entity, in a province): type and seats, students enrolled, open or closed.
- **Student cohort** (value): count, year enrolled, province.
- **Scholar** (counted per province).
- **Invention row** (value).
- **Era cost table** (value).

### Domain services
- **Research accrual**: scholars × 1 + students × 0.2 scholar-years per year into the current study.
- **Cost calculator**: era cost × 2 per era ahead × (1 − spread discount, capped at 60 %).
- **Eligibility checker**: parent, "or", also needs, contact, scope.
- **Graduation**: students to scholars after 5 years (sooner under a Schoolmaster), or to officials.

## 5. Requirements

### 5.1 Schools, students, scholars
- RSCH-001: Schools shall be town buildings with student seats (temple and monastery schools, madrasas, universities, academies, and later colleges), gained by building them (gold up front), a lord or the clergy founding one, or conquering a town that has one. [country-stats §7.1]
- RSCH-002: If a school's upkeep is not paid, then it shall close; schools are also lost when sacked in war or when a religious change closes the other faith's schools. [§7.1]
- RSCH-003: School types shall come from the tree: temple and monastery school 20 seats (L1), madrasa 30 (L2), university 60 (L7), academy 100 (L12); with L18 every province without a school gets 10 village-school seats (RSCH-070). There are no other school types. [research-tree L1, L2, L7, L12, L18, D-RSCH-9]
- RSCH-004: The player shall set how many seats to fill; students are enrolled from recruits, local recruits filling local seats first, then the realm's. [§7.1, province §6.6]
- RSCH-005: Students shall be lost by graduating, being called back into the army, famine and plague. [§7.1]
- RSCH-006: After 5 years a student shall graduate as a scholar (a year sooner where a Schoolmaster official runs the province). [§7.1, province §10.2]
- RSCH-007: A graduate may become an official instead of a scholar, of the types his school trains (madrasa: judges and chaplains; university: judges and stewards; academy: masters of works and wardens); with G4 *Examination system* a working scholar can become an official of any type directly (RSCH-081). [§7.1, province §10.2, research-tree G4, D-RSCH-17]
- RSCH-008: Scholars shall be gained by graduation, hiring foreign scholars (gold), and scholars fleeing war or persecution abroad to you; and lost by old age, war in their town, persecution (they flee abroad) and being poached by a richer neighbour. [§7.1]

### 5.2 Research progress
- RSCH-010: Each scholar shall give 1 scholar-year a year and each student 0.2 to the current study, a twelfth of it each month (RSCH-067). [§7.3, D-RSCH-6]
- RSCH-011: When progress reaches the invention's cost, the country shall know the invention. [§7.1, §7.3]
- RSCH-012: When schools close, progress on the current study shall stop; nothing already known is lost. [§7.1]
- RSCH-013: A country shall be able to gain progress by stealing an invention in war, as RSCH-071 states. [§7.1, D-RSCH-10]
- RSCH-014: A country shall study one invention at a time, two once it has an academy-level school anywhere in the realm (RSCH-068). [§7.3, research-tree L12, D-RSCH-7]

### 5.3 War and research
- RSCH-020: Every school seat filled shall take one man from the recruit pool the army can raise. [§7.2]
- RSCH-021: Schools shall cost gold every year, from the same treasury that pays soldiers, at the school building's upkeep (RSCH-070). [§7.2, D-RSCH-9]
- RSCH-022: When the player calls students to arms, the schools shall empty back into recruits at once, research shall stop, and those students shall never become scholars. [§7.2]
- RSCH-023: Fighting in a province with a school shall be able to sack it and scatter its scholars, who may flee to a peaceful neighbour (RSCH-072). [§7.2, D-RSCH-10]

### 5.4 Cost, eligibility and spread
- RSCH-030: Each invention shall cost scholar-years by era: I 20, II 40, III 80, IV 150, V 250, VI 400, VII 650 (VIII 1000, out of scope). [research-tree Rules]
- RSCH-031: Studying an invention from an era later than the current date shall cost double for each era ahead. [research-tree Rules]
- RSCH-032: Eras shall be dated I from the start to 1500 (1378–1500; a campaign that starts in 1444 plays 1444–1500 of it), II 1500–1600, III 1600–1700, IV 1700–1800, V 1800–1870, VI 1870–1914, VII 1914 to the campaign's end (31 August 1939). [research-tree Rules, gap-lists, D-RSCH-23]
- RSCH-033: A country shall be able to study any invention whose parent it knows plus everything listed under "also needs"; where "or" is given, either one is enough. [research-tree Rules]
- RSCH-034: Each neighbour or trade partner that already knows an invention shall make it 10 % cheaper, up to 60 % off. A neighbour is a country owning a province that borders one of yours by land. [research-tree Rules, §7.3, D-RSCH-8]
- RSCH-035: Contact inventions (⇄) shall open only after a contact event, for example the Atlantic crossing for maize and potatoes. [research-tree Rules]
- RSCH-036: Inventions that change research itself shall apply: L5 *printing* (inventions spread +20 %, schools cost less), C1 *Paper making* (schools cost less), L4 *Metal movable type* (students cost less), L6 and L11 (scholars +research), L3 *Observatories* (+research for Learning and Sea inventions), L10 (scholars work into old age), L14 *Encyclopedias* (spread +20 %), L20 *Research laboratories* (research +50 %), L21 *Radio* (faster spread of news and inventions), with the numbers of RSCH-069 and RSCH-074. [research-tree, D-RSCH-8, D-RSCH-12]

### 5.5 The tree
- RSCH-040: The tree shall be one tree from the root *Settled life*, splitting into four branches (R1 Tilling and building, R2 Fire and metal, R3 Counting and records, R4 Boats), with inventions branching era by era and many needing an invention from another branch. [research-tree intro]
- RSCH-041: The letter in an invention id (F, C, T, S, W, B, G, L) shall only describe what it is about and shall not form a separate tree. [research-tree intro]
- RSCH-042: The tree shall hold the 174 inventions of §5.8, each unlocking what its row says, and the 13 past inventions of RSCH-092: 187 rows. [research-tree, D-RSCH-21]
- RSCH-043: The 20 ★ inventions shall keep their ids so the event tree keeps working; the event tree's `tech_*` and `innovation` read inventions from the tree. [research-tree intro, country-stats §11]
- RSCH-044: Each invention shall be one config row with `id`, `parent`, `also_needs`, `era`, `unlocks` and `start_regions`, and new inventions (e.g. Andean terrace farming, Ethiopian church schools, Javanese irrigation) can be hung on any branch without code. [research-tree Rules]
- RSCH-045: The 12 Era VIII inventions shall be out of scope and never studied; of Era VII, L23 and L24 shall never be studied and the other 16 may be studied until 31 August 1939 (RSCH-062, RSCH-063). [gap-lists decisions, item 22, X-14, D-RSCH-1, D-RSCH-2]

### 5.6 Start
- RSCH-050: At the start every country shall know the root and the four boughs. [research-tree Rules]
- RSCH-051: *(Replaced by RSCH-098, built 18 Oct, D-RSCH-21.)* At the start each country shall also know the inventions it historically knew: "start:" names who typically knows each in 1444, and the catalogue's `institutional_development` and region decide the exact set (e.g. East Asian courts printing and the examination system, Iberians ocean ships under way, Timurid lands observatories), worked out as RSCH-076 states. [research-tree Rules, §7.3, §10, D-RSCH-11]

### 5.7 Reading research elsewhere
- RSCH-060: The event tree's `literacy` shall read scholars and schools per thousand people. [country-stats §11]
- RSCH-061: Research shall supply the inventions known, each with its era cost, to the realm's Technology score. [country-stats §12]

### 5.8 The full invention list

Each row is one config row. "Parent" R1–R4 means the branch. "Or parent" lists alternatives that can stand for the
parent. "Scope" applies the 16 Oct campaign span decision. Effect texts are the tree's; where another design gives the
effect in numbers (warfare §12, trade §11, exploration §4) that design owns the numbers; the rows carry trade v2's T-branch
effects (D-RSCH-4) and the edits of D-RSCH-5. Era VII rows are in play until 31 August 1939 with effects trimmed to what
they did by then; L23 and L24 are dropped (D-RSCH-1).

| Id | Name | Era | Branch | Parent | Or parent | Also needs | Unlocks | Start (who typically knows it in 1444) | Event tree ★ | Contact ⇄ | Scope |
|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | Stone castles | I | R1 | R1 | — | — | Castles | Most settled realms |  |  | in scope |
| B5 | bastion_fortification | II | R1 | B1 | — | W3 Bombards | Castles resist guns | — | ★ |  | in scope |
| B6 | Star forts | II | R1 | B5 | — | — | Strong castles; sieges take far longer | — |  |  | in scope |
| B7 | Siege parallels | III | R1 | B6 | — | — | Attackers take castles faster | — |  |  | in scope |
| B2 | Roads and post stations | I | R1 | R1 | — | — | Grain and armies move faster; officials run +1 province close to the capital | Ming, Ottoman, Inca, Mali trade roads |  |  | in scope |
| B3 | Grand canals | I | R1 | B2 | — | — | River-and-canal grain transport | China |  |  | in scope |
| B8 | Canal locks | III | R1 | B3 | — | — | Canals across hills | — |  |  | in scope |
| W10 | Supply magazines | III | R1 | B2 | — | — | Armies far from home don't starve | — |  |  | in scope |
| B9 | Turnpike roads | IV | R1 | B2 | — | — | Faster grain and armies | — |  |  | in scope |
| B4 | Earthwork ring forts | I | R1 | R1 | — | — | Cheap forts | West Africa (e.g. Benin walls), Polynesia |  |  | in scope |
| F1 | Three-field rotation | I | R1 | R1 | — | — | +1 harvest step on farmland | Most of Europe |  |  | in scope |
| F7 | Ever-normal granaries | I | R1 | F1 | F2 Wet-rice terracing | — | Granaries hold 50 % more and rot less | China, Korea |  |  | in scope |
| F12 | Fodder crops (clover, turnips) | III | R1 | F1 | — | — | Horses eat half the grain; +1 harvest step | — |  |  | in scope |
| F13 | Selective livestock breeding | IV | R1 | F12 | — | F11 Horse breeding studs | Herds grow faster | — |  |  | in scope |
| F14 | Seed drill | IV | R1 | F12 | — | — | +1 harvest step | — |  |  | in scope |
| F15 | Four-field rotation | IV | R1 | F12 | — | — | No fallow year: +1 harvest step | — |  |  | in scope |
| F2 | Wet-rice terracing | I | R1 | R1 | — | — | Two harvests a year on irrigated rice land | East and Southeast Asia |  |  | in scope |
| F3 | Qanat and canal irrigation | I | R1 | R1 | — | — | Dry provinces harvest at normal | Iran, Central Asia, North Africa, Andes |  |  | in scope |
| F10 | Sugar and spice plantations | II | R1 | F3 | — | — | New trade goods (event tree's harm rules apply: no forced labour bonus) | — |  |  | in scope |
| F4 | Fish salting and drying | I | R1 | R1 | — | — | Fish keeps for a year; coastal grain store +20 % | Coasts worldwide |  |  | in scope |
| F5 | Water and wind mills | I | R1 | R1 | — | — | Grain into flour cheaply: +gold per farmland province | Europe, Middle East, China |  |  | in scope |
| F8 | Polder drainage | II | R1 | F5 | — | — | Turn marsh provinces into farmland | Low Countries |  |  | in scope |
| F6 | Chinampa and raised fields | I | R1 | R1 | — | — | Marsh and lake provinces farm well | Mexico basin, Andes lakes |  |  | in scope |
| F11 | Horse breeding studs | II | R1 | R1 | — | — | +Horses per grassland province | Steppe, Arabia, Iberia |  |  | in scope |
| F9 | Maize, potato and cassava | II | R1 | R1 | — | — | A failed harvest becomes poor; more people per farmland | Americas |  | ⇄ | in scope |
| C1 | Paper making | I | R2 | R2 | — | — | School upkeep −10 % | Worldwide except Americas and Oceania |  |  | in scope |
| L4 | Metal movable type | I | R2 | C1 | — | — | Books spread: school upkeep −10 % | Korea |  |  | in scope |
| L5 | printing | I | R2 | C1 | — | — | Inventions spread +20 % (12 % per partner); school upkeep −10 % | — | ★ |  | in scope |
| L6 | humanist_learning | I | R2 | L5 | L2 Madrasa networks | — | Scholars: research +10 % | — | ★ |  | in scope |
| T4 | Paper money | I | R2 | C1 | — | — | Print gold (risk of price rises) | China (Ming notes, heavily devalued by 1444) |  |  | in scope |
| C2 | Blast furnace | I | R2 | R2 | — | — | +iron: guns and tools cheaper | China, parts of Europe |  |  | in scope |
| W3 | Bombards | I | R2 | C2 | — | — | Siege guns: castles fall faster | Ottoman, Western Europe, China |  |  | in scope |
| W5 | gunpowder_infantry | I | R2 | W3 | — | — | Hand-gun infantry | Ottoman, Ming, parts of Europe | ★ |  | in scope |
| W7 | Pike and shot | II | R2 | W5 | — | W6 Pike squares | Mixed infantry: foot +strength | — |  |  | in scope |
| W11 | Flintlock and bayonet | III | R2 | W7 | — | — | Pikes obsolete; foot +strength | — |  |  | in scope |
| W9 | Volley fire drill | II | R2 | W5 | — | — | Gun infantry +strength | — |  |  | in scope |
| W8 | Field artillery | II | R2 | W3 | — | — | Guns in battle | — |  |  | in scope |
| C10 | Gunpowder mills | II | R2 | C2 | — | — | Guns cost less to raise | — |  |  | in scope |
| S6 | Ship-mounted cannon | II | R2 | C10 | — | S4 Carrack and caravel | Warships with guns | — |  |  | in scope |
| S8 | Turtle and armoured ships | II | R2 | S6 | — | — | Coastal defence ships | — |  |  | in scope |
| C6 | Mining pumps and shafts | II | R2 | C2 | — | — | +output from mines; silver and gold mines | Central Europe |  |  | in scope |
| C7 | Mercury silver refining | II | R2 | C6 | — | — | Double silver from silver mines | — |  |  | in scope |
| C12 | Coke smelting | IV | R2 | C6 | — | C2 Blast furnace | Iron without forests | — |  |  | in scope |
| B10 | Iron bridges | IV | R2 | C12 | — | — | Cross rivers anywhere | — |  |  | in scope |
| C13 | steam_power | IV | R2 | C12 | — | L11 experimental_science | Pumps, then engines | — | ★ |  | in scope |
| C14 | mechanized_textiles | IV | R2 | C13 | — | C8 Putting-out workshops | Factories: big +gold in cloth provinces | — | ★ |  | in scope |
| C15 | Machine tools | V | R2 | C13 | — | — | Needed for rifles, reapers, engines | — |  |  | in scope |
| F17 | Mechanical reaper | V | R2 | C15 | — | F14 Seed drill | Fewer farmers per harvest: more recruits | — |  |  | in scope |
| W16 | Rifled musket | V | R2 | C15 | — | — | Foot +strength; more Fallen | — |  |  | in scope |
| W17 | Breech-loading rifle | V | R2 | W16 | — | — | Foot +strength | — |  |  | in scope |
| C18 | Bessemer steel | VI | R2 | C15 | — | C12 Coke smelting | Cheap steel: guns, ships, rails | — |  |  | in scope |
| S14 | Ironclads | V | R2 | S13 | — | — | Wooden fleets obsolete | — |  |  | in scope |
| B13 | Reinforced concrete | VI | R2 | C18 | — | — | Strong forts, dams | — |  |  | in scope |
| B14 | Hydroelectric dams | VI | R2 | B13 | — | C19 electrification | Power and irrigation | — |  |  | in scope |
| C19 | electrification | VI | R2 | C18 | — | T14 telegraphy | Factories and towns +gold | — | ★ |  | in scope |
| L20 | Research laboratories | VI | R2 | C19 | — | L12 Academies of science | Research +50 % | — |  |  | in scope |
| L23 | Nuclear physics | VII | R2 | L20 | — | — | Unlocks nuclear power and propulsion | — |  |  | dropped (D-RSCH-1) |
| L24 | Rocketry | VII | R2 | L20 | — | C20 chemical_industry | Unlocks missiles and satellites | — |  |  | dropped (D-RSCH-1) |
| L25 | computing | VIII | R2 | L20 | — | C19 electrification | Research +50 %; officials +1 province | — | ★ |  | out of scope (Era VIII) |
| C24 | Automation | VIII | R2 | L25 | — | C21 Assembly line | Fewer workers: +recruits and +students | — |  |  | out of scope (Era VIII) |
| B17 | Prefab housing | VIII | R2 | C24 | — | B13 Reinforced concrete | Towns grow fast | — |  |  | out of scope (Era VIII) |
| G20 | Digital government | VIII | R2 | L25 | — | — | Officials run 5 provinces | — |  |  | out of scope (Era VIII) |
| S21 | Satellite navigation | VIII | R2 | L25 | — | L24 Rocketry | No ships lost to navigation | — |  |  | out of scope (Era VIII) |
| T18 | Electronic banking | VIII | R2 | L25 | — | — | Merchants and officials +20 % | — |  |  | out of scope (Era VIII) |
| T19 | internet | VIII | R2 | L25 | — | T18 Electronic banking | Inventions spread at double speed | — | ★ |  | out of scope (Era VIII) |
| W24 | Guided missiles | VIII | R2 | L25 | — | L24 Rocketry | Strike from far away | — |  |  | out of scope (Era VIII) |
| C21 | Assembly line | VII | R2 | C19 | — | — | Factories double output | — |  |  | Era VII, until 31 Aug 1939 (D-RSCH-1) |
| C22 | motor_and_air_transport | VII | R2 | C21 | — | — | Trucks, tractors, aircraft | — | ★ |  | Era VII, until 31 Aug 1939 (D-RSCH-1) |
| B15 | Highways | VII | R2 | C22 | — | B13 Reinforced concrete | Trucks move everything | — |  |  | Era VII, until 31 Aug 1939 (D-RSCH-1) |
| B16 | Airfields | VII | R2 | C22 | — | — | Air routes and air bases | — |  |  | Era VII, until 31 Aug 1939 (D-RSCH-1) |
| F21 | Tractors | VII | R2 | C22 | — | — | Many fewer farmers: +recruits and +students | — |  |  | Era VII, until 31 Aug 1939 (D-RSCH-1) |
| F23 | green_revolution_agriculture | VIII | R2 | F21 | — | F22 Hybrid seeds | Famines nearly end | — | ★ |  | out of scope (Era VIII) |
| F24 | Drip irrigation | VIII | R2 | F23 | — | F3 Qanat and canal irrigation | Dry provinces harvest at good | — |  |  | out of scope (Era VIII) |
| S18 | Aircraft carriers | VII | R2 | C22 | — | S16 Dreadnought battleships | Fleets strike from the air | — |  |  | Era VII, until 31 Aug 1939 (D-RSCH-1) |
| S20 | Nuclear propulsion | VIII | R2 | S18 | — | L23 Nuclear physics | Ships go years without port | — |  |  | out of scope (Era VIII) |
| W21 | Tanks | VII | R2 | C22 | — | W19 Machine gun | Break trench lines | — |  |  | Era VII, until 31 Aug 1939 (D-RSCH-1) |
| W22 | Military aircraft | VII | R2 | C22 | — | — | Scout and bomb | — |  |  | Era VII, until 31 Aug 1939 (D-RSCH-1) |
| T17 | Container shipping | VIII | R2 | C21 | — | S13 Steamships | Trade ships carry 5× | — |  |  | out of scope (Era VIII) |
| L21 | Radio | VII | R2 | C19 | — | L16 Electricity studies | Inventions spread +20 % | — |  |  | Era VII, until 31 Aug 1939 (D-RSCH-1) |
| S19 | Radar | VII | R2 | L21 | — | C19 electrification | Fleets see far | — |  |  | Era VII, until 31 Aug 1939 (D-RSCH-1) |
| W23 | Field radio | VII | R2 | L21 | — | — | Armies coordinate | — |  |  | Era VII, until 31 Aug 1939 (D-RSCH-1) |
| C20 | chemical_industry | VI | R2 | C18 | — | L15 Chemistry | Fertilizer, dyes, explosives | — | ★ |  | in scope |
| F19 | Chemical fertilizer | VI | R2 | C20 | — | — | +2 harvest steps | — |  |  | in scope |
| F22 | Hybrid seeds | VII | R2 | F19 | — | — | +1 harvest step | — |  |  | Era VII, until 31 Aug 1939 (D-RSCH-1) |
| S15 | Torpedo boats | VI | R2 | C20 | — | S14 Ironclads | Small navies threaten big ones | — |  |  | in scope |
| S17 | Submarines | VI | R2 | S15 | — | C19 electrification | Blockade by stealth | — |  |  | in scope |
| W20 | Smokeless powder | VI | R2 | C20 | — | — | Guns +range | — |  |  | in scope |
| C23 | Plastics | VII | R2 | C20 | — | — | +gold from industry | — |  |  | Era VII, until 31 Aug 1939 (D-RSCH-1) |
| S16 | Dreadnought battleships | VI | R2 | C18 | — | S14 Ironclads | Strongest warships | — |  |  | in scope |
| W19 | Machine gun | VI | R2 | C18 | — | W17 Breech-loading rifle | Defence +strength; huge Fallen | — |  |  | in scope |
| C16 | railways | V | R2 | C13 | — | C12 Coke smelting | Move grain and armies far faster | — | ★ |  | in scope |
| T14 | telegraphy | V | R2 | C16 | — | L16 Electricity studies | Instant prices; officials run +1 province | — | ★ |  | in scope |
| W18 | Railway mobilization | VI | R2 | C16 | — | W15 Mass conscription | Whole army raised in weeks | — |  |  | in scope |
| S13 | Steamships | V | R2 | C13 | — | S10 Naval dockyards | Ships ignore wind; faster trade | — |  |  | in scope |
| F16 | Guano and imported fertilizer | V | R2 | S13 | — | F15 Four-field rotation | +1 harvest step for 30 years | — |  |  | in scope |
| F20 | Refrigerated shipping | VI | R2 | S13 | — | F18 Canned food | Sell grain and meat overseas | — |  |  | in scope |
| W13 | Light field artillery | IV | R2 | C12 | — | W8 Field artillery | Guns move with the army | — |  |  | in scope |
| C17 | Gas lighting | V | R2 | C12 | — | — | Towns grow; schools work longer | — |  |  | in scope |
| C3 | Porcelain kilns | I | R2 | R2 | — | — | Porcelain trade good | China, Korea, Vietnam |  |  | in scope |
| C4 | Silk and cotton weaving | I | R2 | R2 | — | — | Cloth trade good | Asia, Middle East |  |  | in scope |
| C8 | Putting-out workshops | II | R2 | C4 | — | — | Cloth provinces +gold | — |  |  | in scope |
| C11 | Manufactories | III | R2 | C8 | — | — | A new building: +gold, needs officials | — |  |  | in scope |
| S10 | Naval dockyards | III | R2 | C11 | — | S7 Galleon | Ships cheaper to build and keep | — |  |  | in scope |
| S12 | Copper sheathing | IV | R2 | S10 | — | — | Ships rot slower | — |  |  | in scope |
| C5 | Glass and lenses | I | R2 | R2 | — | — | Needed for spectacles and telescopes | Venice, Middle East |  |  | in scope |
| C9 | Clockmaking | II | R2 | C5 | — | — | Needed for chronometer | — |  |  | in scope |
| S11 | Marine chronometer | IV | R2 | C9 | — | S5 ocean_navigation | Fewer ships lost on long voyages | — |  |  | in scope |
| L10 | Spectacles and telescopes | II | R2 | C5 | — | — | Scholars work into old age: 1 in 60 lost a year instead of 1 in 30 | — |  |  | in scope |
| W1 | Composite-bow horse archery | I | R2 | R2 | — | — | Strong horse archers | Steppe, Iran, Ottoman, North India |  |  | in scope |
| W2 | Heavy armoured cavalry | I | R2 | R2 | — | — | Knights and lancers | Europe, India, Middle East |  |  | in scope |
| W4 | Wagon fort | I | R2 | R2 | — | — | Defensive wagons and hand guns | Bohemia, Hungary, Muscovy, Ming |  |  | in scope |
| W6 | Pike squares | I | R2 | R2 | — | — | Foot that stops horse | Swiss, Scots |  |  | in scope |
| G1 | Written law codes | I | R3 | R3 | — | — | One official runs 1 province | Most states |  |  | in scope |
| G3 | Tax registers | I | R3 | G1 | — | — | Royal provinces pay +10 % (only with a chancery) | Ming, Ottoman, Venice |  |  | in scope |
| G7 | Venal offices | II | R3 | G3 | — | — | Sell offices for gold (officials worse) | — |  |  | in scope |
| G9 | Professional bureaucracy | III | R3 | G3 | — | — | Officials cost less; each runs 2 provinces | — |  |  | in scope |
| G10 | Census | III | R3 | G9 | — | — | Recruits and taxes counted correctly: +10 % (only with a chancery) | — |  |  | in scope |
| G12 | Statistical bureau | IV | R3 | G10 | — | — | See every province's harvest early | — |  |  | in scope |
| G18 | Planned economy | VII | R3 | G12 | — | — | Factories directed by the state | — |  |  | Era VII, until 31 Aug 1939 (D-RSCH-1) |
| G11 | Postal service | III | R3 | G9 | — | B2 Roads and post stations | Officials run +1 province further from the capital | — |  |  | in scope |
| W12 | Standing regiments | III | R3 | G9 | — | — | Soldiers who stay: no losses from disbanding; troop cap +0.5 % of people | — |  |  | in scope |
| W14 | Army divisions | IV | R3 | W12 | — | — | Armies split and join faster | — |  |  | in scope |
| W15 | Mass conscription | V | R3 | W14 | — | G10 Census | +50 % recruits from all provinces | — |  |  | in scope |
| G13 | Rational legal codes | IV | R3 | G9 | — | L6 humanist_learning | Lords' trials cause less anger | — |  |  | in scope |
| G14 | Written constitution | IV | R3 | G13 | — | — | New government forms | — |  |  | in scope |
| G4 | Examination system | I | R3 | G1 | — | C1 Paper making | Scholars can become officials directly | China, Korea, Vietnam |  |  | in scope |
| G5 | Royal chancery | I | R3 | G1 | — | — | Envoys +1 | Many monarchies |  |  | in scope |
| G8 | Resident ambassadors | II | R3 | G5 | — | — | Envoys +1; see others' armies; may ask for passage | Italian states |  |  | in scope |
| G2 | Feudal grants | I | R3 | R3 | — | — | Create lords by granting fiefs | Europe, Japan, India |  |  | in scope |
| G6 | Quipu and knot records | I | R3 | R3 | — | — | Tax registers without writing | Inca |  |  | in scope |
| L1 | Temple and monastery schools | I | R3 | R3 | — | — | School type with 20 seats | Most settled realms |  |  | in scope |
| L7 | Universities | II | R3 | L1 | L2 Madrasa networks, L5 printing | — | School type with 60 seats | — |  |  | in scope |
| L8 | Anatomy | II | R3 | L7 | — | — | Fewer Fallen from wounds | — |  |  | in scope |
| L11 | experimental_science | III | R3 | L7 | — | L10 Spectacles and telescopes | Scholars: research +10 %; unlocks steam and chemistry | — | ★ |  | in scope |
| L12 | Academies of science | III | R3 | L11 | — | — | School type with 100 seats; study two inventions at once | — |  |  | in scope |
| L14 | Encyclopedias | IV | R3 | L12 | — | L5 printing | Inventions spread +20 % | — |  |  | in scope |
| L18 | mass_literacy_schooling | V | R3 | L14 | — | G10 Census | Village schools: 10 seats in every province without a school | — | ★ |  | in scope |
| G16 | Civil service exams | V | R3 | L18 | — | G9 Professional bureaucracy | Officials run 3 provinces | — |  |  | in scope |
| L13 | Microscope | III | R3 | L11 | — | L10 Spectacles and telescopes | Needed for germ theory | — |  |  | in scope |
| L17 | vaccination_and_sanitation | V | R3 | L13 | — | L9 Variolation | Plague and smallpox deaths fall | — | ★ |  | in scope |
| L19 | Germ theory and antiseptics | VI | R3 | L17 | — | L13 Microscope | Far fewer Fallen from disease | — |  |  | in scope |
| L22 | Antibiotics | VII | R3 | L19 | — | C20 chemical_industry | Few deaths from infection | — |  |  | Era VII, until 31 Aug 1939 (D-RSCH-1) |
| L15 | Chemistry | IV | R3 | L11 | — | — | Needed for chemical industry | — |  |  | in scope |
| L16 | Electricity studies | IV | R3 | L11 | — | — | Needed for telegraphy | — |  |  | in scope |
| B11 | Sewers and clean water | V | R3 | L11 | — | B8 Canal locks | Fewer plague deaths in towns | — |  |  | in scope |
| B12 | Tenements and city planning | V | R3 | B11 | — | — | Towns hold more people | — |  |  | in scope |
| F18 | Canned food | V | R3 | L11 | — | F4 Fish salting and drying | Armies carry 6 months of food | — |  |  | in scope |
| L2 | Madrasa networks | I | R3 | R3 | — | — | School type with 30 seats | Islamic world |  |  | in scope |
| L3 | Observatories | I | R3 | L2 | — | — | +20 % research for Learning and Sea inventions | Timurid Samarkand, Ming, Maragha tradition |  |  | in scope |
| T1 | Caravanserai networks | I | R3 | R3 | — | — | Camel caravans; land traders lose their purse to bandits half as often | Middle East, Central Asia, Sahel |  |  | in scope |
| T2 | Double-entry bookkeeping | I | R3 | R3 | — | — | Collections +10 % | Italian cities |  |  | in scope |
| T3 | Bills of exchange | I | R3 | T2 | — | — | Deposit abroad; move gold without carrying it; loans cheaper | Italy, Low Countries, Hanse |  |  | in scope |
| T6 | Merchant fairs and exchanges | II | R3 | T3 | — | — | Market step 2 (yearly fair) can be built; every market serves +2 visits a month | — |  |  | in scope |
| T8 | Licensed trading companies | II | R3 | T6 | — | S5 ocean_navigation | Trading posts overseas count as cities and can found traders; +1 colonial governor slot | — |  |  | in scope |
| T7 | Deposit banks | II | R3 | T3 | — | — | Debt interest −20 % | — |  |  | in scope |
| T10 | public_debt_markets | III | R3 | T7 | — | — | Borrow much more at lower interest | — | ★ |  | in scope |
| T12 | Central bank | IV | R3 | T10 | — | — | Debt interest −30 %; default is rarer | — |  |  | in scope |
| T13 | Commodity exchanges | IV | R3 | T12 | — | T6 Merchant fairs and exchanges | See every known province's trade value and ratio | — |  |  | in scope |
| G15 | Income tax | V | R3 | T12 | — | G10 Census | Tax from towns and industry | — |  |  | in scope |
| G17 | Social insurance | VI | R3 | G15 | — | — | Fewer revolts in towns | — |  |  | in scope |
| G19 | Welfare state | VII | R3 | G17 | — | — | Famines and revolts rare | — |  |  | Era VII, until 31 Aug 1939 (D-RSCH-1) |
| T16 | Postal savings and mass banking | VI | R3 | T12 | — | — | +gold from people | — |  |  | in scope |
| T9 | joint_stock_finance | III | R3 | T7 | — | T8 Licensed trading companies | Trade ships cost 25 % less to buy; +1 colonial governor slot | — | ★ |  | in scope |
| T11 | Marine insurance | III | R3 | T9 | — | — | Half the purse of a lost ship is refunded | — |  |  | in scope |
| T15 | Limited-liability companies | V | R3 | T9 | — | — | Industry grows faster | — |  |  | in scope |
| T5 | Monsoon sailing calendars | I | R3 | R3 | — | — | Storm losses for trade ships in the Indian Ocean halved | Swahili coast, Gujarat, Arabia, Malay world |  |  | in scope |
| L9 | Variolation | II | R3 | R3 | — | — | Fewer smallpox deaths | China, Ottoman, West Africa, India |  |  | in scope |
| S1 | Magnetic compass and sea charts | I | R4 | R4 | — | — | Ships may leave the coast | Mediterranean, China, Indian Ocean |  |  | in scope |
| S4 | Carrack and caravel | I | R4 | S1 | — | S2 Lateen and junk rigging | Ocean-going ships | Portugal, Castile, Genoa, Venice |  |  | in scope |
| S5 | ocean_navigation | II | R4 | S4 | — | — | Cross oceans; opens colonies with 2 colonial governor slots (see [exploration-design.md](../exploration/exploration-design.md)) | — | ★ |  | in scope |
| S7 | Galleon | II | R4 | S5 | — | S6 Ship-mounted cannon | Strong trade and war ships | — |  |  | in scope |
| S9 | Line-of-battle tactics | III | R4 | S7 | — | — | Warships +strength in fleets | — |  |  | in scope |
| S2 | Lateen and junk rigging | I | R4 | R4 | — | — | Better trade ships: trade ships' hold +0.5 | Mediterranean, Indian Ocean, China |  |  | in scope |
| S3 | Outrigger voyaging | I | R4 | R4 | — | — | Long canoe voyages between islands | Pacific, Malay world |  |  | in scope |

### 5.9 Decided rules (17 October 2026)
- RSCH-062: Of the 18 Era VII inventions, L23 *Nuclear physics* and L24 *Rocketry* shall never be studied; the other 16 shall be studied as any invention until 31 August 1939, with effects trimmed to what they did by 1939, and no invention shall be studied after that date. [X-14, D-RSCH-1]
- RSCH-063: Era VIII rows, the three ★ ones (L25, T19, F23) included, shall stay in the tree config with their ids but shall never be studied; events that read them are dropped. [X-14, D-RSCH-2]
- RSCH-064: S14 *Ironclads* (era V) shall grow from S13 *Steamships* with no other needs. [D-RSCH-3]
- RSCH-065: The T-branch and S2 shall have trade v2's effects: T1 camel caravans and half the bandit losses, T2 collections +10 %, T3 deposit abroad, T5 Indian Ocean storm losses halved, T6 the yearly fair and +2 market visits a month, T8 trading posts overseas count as cities and found traders, T9 trade ships 25 % cheaper, T11 half a lost ship's purse refunded, T13 every known province's trade value and ratio seen, S2 trade ships' hold +0.5; T8 and T9 shall each also give +1 colonial governor slot. [trade §11, X-6, D-RSCH-4]
- RSCH-066: G8 shall also let a country ask for passage; G3 and G10 shall take effect only while the realm has a chancery; W15 shall give +50 % recruits and W12 a troop cap of +0.5 % of people. There is no staff college: academy graduates are the commanders' school. [diplomacy §18, buildings §18, warfare §12, X-7, D-RSCH-5]
- RSCH-067: Each monthly research step shall add a twelfth of the year's scholar-years to the current study or studies, and an invention shall be known in the month its progress reaches its cost. [X-2, D-RSCH-6]
- RSCH-068: With two studies, each shall get half the scholar-years; one open academy anywhere in the realm shall be enough for two studies. [D-RSCH-7]
- RSCH-069: L5, L14 and L21 shall each raise the discount per neighbour or trade partner by a fifth of the base (10 % → 12 % → 14 % → 16 %); the 60 % cap shall not change, and a neighbour of the same language family shall count once like any other. [D-RSCH-8]
- RSCH-070: With L18 each province without a school shall have 10 village-school seats, which cost no upkeep. School upkeep shall be a temple or monastery school 2 gold a year, a madrasa or university 4, an academy 6. [D-RSCH-9]
- RSCH-071: When a country occupies an enemy province with an open school, each of its current studies that the enemy knows shall gain 10 % of its cost before discounts, once per province per war. [D-RSCH-10]
- RSCH-072: When a battle is fought in a province with an open school, the school shall be sacked (lost) with a chance of 25 %; then half the province's scholars flee to the first peaceful neighbouring country in nation-index order, or are lost when none is at peace. [D-RSCH-10]
- RSCH-073: Each January, the richest neighbour with at least twice a country's gold shall poach 1 in 20 of its scholars. [D-RSCH-10]
- RSCH-074: L6 and L11 shall each give +10 % research, L20 +50 %, L3 +20 % toward Learning (L) and Sea (S) inventions; C1, L4 and L5 shall each make school upkeep 10 % lower. [D-RSCH-12]
- RSCH-075: Each January a country shall lose 1 in 30 of its scholars to old age, 1 in 60 once it knows L10. [D-RSCH-12]
- RSCH-076: *(Replaced by RSCH-098, built 18 Oct, D-RSCH-21.)* A map nation shall start knowing the root, the four boughs, every invention whose start regions name a group the research data puts it in, the extra inventions the data lists for it (Ming and Korea: L5 printing), and everything those need; `institutional_development` is not used, and no study starts with progress. [D-RSCH-11]
- RSCH-077: F9 shall open for a country when exploration reports its Atlantic crossing; the countries of the Americas know it from the start. [D-RSCH-13]
- RSCH-078: The AI shall study the eligible invention that costs it least now, ties by id; it shall fill every empty seat while at peace and none while at war, and call students to arms only while at war with no recruits left. [D-RSCH-14]
- RSCH-079: Students shall be taken from recruits and graduates counted as scholars without a sex; whether a scholar named to a role is a woman shall be the realm's women-in-roles roll. [D-RSCH-15]
- RSCH-080: F16's harvest step shall last 30 years from the year it was learned and then end; F19 gives its own steps. [D-RSCH-16]
- RSCH-081: Without G4 only a new graduate may be made an official, and only of his school's types; with G4 a working scholar may be made an official of any type at any time. [D-RSCH-17]
- RSCH-082: At the start each realm shall have one school in its capital (a madrasa where it knows L2, else a temple or monastery school, founded by the clergy where it knows neither L1 nor L2), half its seats filled with students taken from recruits in cohorts enrolled over the last five years, and 5 scholars (2 where it knows neither L1 nor L2). [D-RSCH-18]
- RSCH-083: The player shall found a school in a town of theirs (25,000 people or more, or the capital) that has none, for the temple school's gold and months (buildings `school` step 1: 60 gold, 12 months; a madrasa where the realm knows L2); it opens when the months have passed. Choosing another study shall drop the progress on the current one. [D-RSCH-19]

### How the player uses it
- RSCH-084: *(The branch tabs of the Tree part are replaced by RSCH-100 to RSCH-106, D-RSCH-21.)* The player shall find research in a Research tab of their own country card (Realm book → Learning). It opens on an overview: the current study with a progress bar, its scholar-years and the time left at the current pace, then one line with scholars, students, scholar-years a year, how many of the tree's inventions are known and the current era (or "Nothing is being studied" and where to choose). Below it the tab has two parts, Tree and Schools. **Tree** draws the invention tree one branch at a time (a tab per branch, each with how many of its inventions are known and how many can be studied): the branch at the left, a column per era, each invention on a line from its parent, an "also needs" in the same branch as a dashed line; every invention reads as known, being studied, can be studied (◆) or locked. Tapping an invention opens its sheet: what it does, what it grows from and what it also needs (each marked known or not, and tapping one shows it in the tree), and its one action. Only an invention that can be studied (RSCH-033) has a Study button, with its cost in scholar-years, the time at the realm's pace, the neighbours who know it and whether it is ahead of its time; a locked one says what to learn first and has no button. **Schools** holds the students (a stepper of 44-point buttons, five seats a step, saying each student is a man the army can't raise), Call students to arms in a fold that says what it costs, the schools, and Found a school, opening a list of the towns where one can go with its gold and months. [X-19, D-RSCH-20]
- RSCH-085: Everything about research and schools shall sit in that one tab; elsewhere the game only points to it (the commander's Train list names the arms not yet known with a button to the Research tab). [X-19]
- RSCH-086: Before a Study button would drop progress on the current study, the invention's sheet shall say how many scholar-years would be lost, and the button shall read Switch to this study. [X-19, D-RSCH-19, D-RSCH-20]
- RSCH-087: The schools' upkeep shall be its own line of the Treasury ledger (Schools). [X-19, RSCH-021]
- RSCH-088: The General tab of the player's country card shall carry one line, "Studying X · N % · scholars S" (or "Nothing studied · choose what to study"), that opens the Research tab; another realm's card shall show how many inventions it knows and what it studies. [X-19]
- RSCH-089: *(With a queue, only when the queue is empty: RSCH-108.)* When the player's realm learns an invention, an alert shall say "Learned X. Choose the next study." with an Open button to the Research tab; while nothing is studied, one alert shall ask the player to choose (at the start and after each invention), the same way. [X-19]
- RSCH-090: The Research tab shall work on a phone in landscape and in the Tall layout: inside the safe areas, every button, tree node and fold at least 44 points tall, nothing that needs hover, and the page never scrolling sideways; the tree scrolls by dragging inside its own frame, and where the tab is at least 500 points wide the invention's sheet stands beside the tree, otherwise above it. [X-19, SHELL-108, SHELL-109, SHELL-114, D-RSCH-20]

### 5.10 One tree that reaches back before the start (18 October 2026, Leroy)

Leroy: the game must have one single tree, not a tree split in four, and the tree must reach further into the past
so that some countries start on the back foot. These rules replace the bough-by-bough drawing of RSCH-084 and the
start sets of RSCH-051 and RSCH-076 (D-RSCH-21). Nothing already in the tree changes id, and the 20 ★ ids stay.

**Two eras before the start**
- RSCH-091: The tree shall have two eras before Era I: **Ancient** (`A`, before 600) and **Medieval** (`M`, 600 to 1377). Their inventions are the **past inventions**, known before the start: what a realm at the start may or may not already know. Era I begins at the start (1378 at the earliest), so nothing is renumbered when the campaign starts in 1378. [Leroy 18 Oct, D-RSCH-21, D-RSCH-23]
- RSCH-092: The tree shall hold these 13 past inventions, one config row each like any other (RSCH-044), bringing it to 187 rows:

| Id | Name | Era | Bough | Parent | Also needs | What it opens | Without it (RSCH-094) |
|---|---|---|---|---|---|---|---|
| F01 | Ox plough | A | R1 | R1 | — | F02 | Farmland harvests one step worse |
| F02 | Heavy plough | M | R1 | F01 | — | F1 Three-field rotation | — |
| F03 | Riding and pack animals | A | R1 | R1 | — | F11, W1, W2, T1 | No horse regiments and no camel caravans |
| B01 | Wheel and carts | A | R1 | R1 | — | F5 mills, W4 wagon fort | Armies carry half the food |
| B02 | Dressed stone | A | R1 | R1 | — | B1 Stone castles | — |
| C01 | Iron smelting | A | R2 | R2 | — | C02, C2 Blast furnace, W6 | Regiments fight 20 % weaker |
| C02 | Steel forging | M | R2 | C01 | — | W2 Heavy armoured cavalry | — |
| C03 | Gunpowder | M | R2 | R2 | — | W3 Bombards | — |
| G01 | Writing | A | R3 | R3 | — | G1 Written law codes, L1, L2, C1 Paper making, L01 | — |
| T01 | Coinage | A | R3 | R3 | — | T2 Double-entry bookkeeping, T4 Paper money | — |
| L01 | Positional numbers | M | R3 | G01 | — | T2 Double-entry bookkeeping | — |
| S01 | Sail | A | R4 | R4 | — | S1 compass, S2 rigging, S02, T5 | — |
| S02 | Sternpost rudder | M | R4 | S01 | — | S4 Carrack and caravel | — |

- RSCH-093: These Era I and II rows shall take new needs from the past inventions, everything else in their rows unchanged: B1 parent B02; F1 parent F02; F5 also needs B01; F11 parent F03; C1 also needs G01; C2 parent C01; W1 also needs F03; W2 parent C02 and also needs F03; W3 also needs C03; W4 also needs B01; W6 also needs C01; G1 parent G01; L1 parent G01 or G6 *Quipu and knot records*; L2 parent G01; T1 also needs F03; T2 parent T01 and also needs L01; T4 also needs T01; T5 also needs S01; S1 and S2 parent S01; S4 also needs S02. [D-RSCH-21]
- RSCH-094: A past invention a realm lacks shall hold it below the baseline at the start, so realms that know it play exactly as now: without F01 its farmland harvests one step worse (province owns the step); without F03 it raises no horse regiments and sends no camel caravans (recruiting, warfare and trade own these); without B01 its armies carry half the food (troop-movement owns the carrying); without C01 its regiments fight 20 % weaker (warfare owns the strength). The other past inventions only open later ones. @placeholder [D-RSCH-21]
- RSCH-095: A past invention shall cost Ancient 10 and Medieval 15 scholar-years before discounts, is never studied ahead, is cheaper for lying behind the times (RSCH-112), and takes the spread discount from neighbours and trade partners like any invention (RSCH-034), so a realm next to realms that know it catches up fastest. @placeholder [D-RSCH-21]
- RSCH-096: For a realm of the Americas, F03 *Riding and pack animals* shall be a contact invention: it opens when exploration reports that realm's first contact with a realm from across the ocean, as F9 opens with the Atlantic crossing (RSCH-077). [D-RSCH-21]

**Standing**
- RSCH-097: A realm's **standing** shall be the latest era, from Ancient on, for which it knows at least a quarter of that era's inventions in scope and a quarter of every earlier era's (Ancient is the floor). A realm whose standing is earlier than the era of the current date is **behind the times** by the eras between. The standing is read by realm, AI and the Hordes design; it changes nothing by itself. @placeholder [D-RSCH-21]

**Starting knowledge**
- RSCH-098: Every map nation shall belong to exactly one **start group** (§5.11). It starts knowing the root, the four boughs, its group's past inventions and Era I and II inventions, plus its own additions, minus its own removals; nothing else, and no study under way. Start labels (`start_regions`) stay on the rows as history notes and no longer decide the start. [D-RSCH-21]
- RSCH-099: A start set shall be complete: every invention in it has its parent (or an alternative) and everything it also needs in the same set; a data check refuses a start set that is not. [D-RSCH-21]

### 5.10a Tree, queue and selection on one screen (18 October 2026, Leroy, feedback 113)

- RSCH-107: The Learning tab shall open on one screen holding the tree, the study queue and what is selected together; Schools is a second part reached by one button in the tab's header, so studying never needs a second part. The queue sits as a strip along the top: the current study (two with an academy) with its progress bar and time left, then the queued inventions in order, each a 44-point chip with its time; the selected invention's sheet stands beside the tree (500 points wide or more) or below the queue strip, otherwise; with nothing picked, the sheet shows the current study. [Leroy 18 Oct, feedback 113, X-19]
- RSCH-108: A realm shall keep a **study queue** of up to 5 inventions after its current study. When a study is learned, the first queued invention whose needs are now known becomes the current study at once, with no progress lost and no alert asking to choose; the "choose the next study" alert of RSCH-089 comes only when the queue is empty. A queued invention whose needs are no longer met when its turn comes is skipped and stays in the queue, marked waiting. @placeholder [feedback 113, D-RSCH-22]
- RSCH-109: An invention's sheet shall carry one action that fits it: Study now (nothing being studied), Add to queue (its needs are known or queued ahead of it), or Queue the path (its needs are not yet met: the missing needs, in an order that can be studied, then the invention, with the total scholar-years and time shown before the tap); a known invention has no action. Study now never drops progress; replacing the current study stays the explicit Switch to this study of RSCH-086. If the path would make the queue longer than 5, the sheet says so and queues none of it. [feedback 113, D-RSCH-22]
- RSCH-110: In the tree, queued inventions shall carry their place number (1 to 5) and a path being considered (the picked invention's missing needs) shall be drawn highlighted, so the player sees in the tree what the queue will study. In the queue strip, tapping a chip selects it in the tree; dragging a chip (or its ◀ ▶ buttons, 44 points each) changes the order, and ✕ removes it. [feedback 113, X-19]
- RSCH-111: In the Tall layout the screen stacks the queue strip (scrolling sideways inside itself only), the tree frame, and the sheet as a panel that slides up from the bottom when something is picked and closes with its own ✕; nothing scrolls the page sideways and every chip and button is at least 44 points. [feedback 113, X-19, RSCH-106]

### 5.11 Start groups (18 October 2026)

The start of every one of the 237 map nations (the African and tribal realms added by SETUP-060 and TRIBE-002 joined the groups their neighbours start in, X-20). The standing column is what RSCH-097 gives with these sets.
Past inventions by id (RSCH-092); Era I and II by the ids of §5.8. The Hordes, African start and tribal designs
may move realms between groups or change a group's set; this table is the data they change.

| Group | Realms | Past inventions known (of 13) | Era I and II inventions known | Standing at the 1444 start |
|---|---|---|---|---|
| Latin Christendom (`latin`) | england, scotland, ireland, france, burgundy, brittany, provence, savoy, lorraine, navarre, castile, aragon, portugal, milan, venice, genoa, florence, modena, papal_states, naples, austria, bohemia, bavaria, wurttemberg, palatinate, cologne, hesse, saxony, brandenburg, luneburg, hamburg, mecklenburg, pomerania, switzerland, teutonic_order, livonian_order, denmark, sweden, norway, poland, lithuania, hungary, ragusa, cyprus, knights_of_rhodes, canarian_lordship | all 13 | B1, F1, F4, F5, C1, C2, W2, W3, G1, G2, G5, L1, S1 | Era I |
| Orthodox Europe (`orthodox`) | byzantium, moldavia, wallachia, serbia, bosnia, albania, georgia, trebizond, muscovy, novgorod, pskov, tver, ryazan | all but L01 | B1, F1, F4, F5, C1, C2, W2, G1, G2, G5, L1 | Era I |
| Islamic heartlands (`islamic`) | ottomans, karaman, candar, dulkadir, aq_qoyunlu, qara_qoyunlu, shirvan, mamluks, hejaz, yemen, oman, timurids, granada, morocco, tlemcen, tunis | all but F02 | B1, C1, C2, C4, F3, F4, F5, G1, G5, L1, L2, T1, W1, W2 | Era I |
| Settled khanates (`khanates`) | kazan, crimea, uzbek_khanate | F01, F02, F03, B01, B02, C01, G01, T01, L01 | C1, G1, L1, L2, T1, W1, F11 | Medieval |
| Steppe hordes (`hordes`) | great_horde, nogai, moghulistan, oirat, mongols, jurchens | F01, F02, F03, B01, C01, G01, L01 | G1, L1, W1, F11 | Medieval |
| Himalaya (`himalaya`) | tibet | F01, F03, B01, B02, C01, G01, T01 | B1, C1, G1, G5, L1 | Ancient |
| South Asia (`south_asia`) | delhi, jaunpur, bengal, bahmanis, vijayanagar, gujarat, malwa, mewar, orissa, gondwana, kashmir, multan, sindh, ahom | all but F02 | B1, C1, C2, C4, F4, F5, G1, G2, G5, L1, W1, W2, L9 | Era I |
| China (`china`) | ming | all 13 | B1, B2, B3, C1, C2, C3, C4, F2, F4, F5, F7, G1, G3, G4, L1, L2, L3, L5, T4, W3, W4, W5, S1, S2, L9 | Era I |
| Korea (`korea`) | korea | all 13 | B1, C1, C2, C3, F2, F4, F5, F7, G1, G3, G4, G5, L1, L4, L5, S1, S2, W3 | Era I |
| Japan (`japan`) | japan | all but F02, C03 | B1, C1, C2, C4, F2, F4, F5, G1, G2, G5, L1, S1, S2, W2 | Era I |
| Mainland Southeast Asia (`se_mainland`) | dai_viet, champa, lan_xang, lan_na, ayutthaya, khmer, ava, pegu | all but F02, L01, S02 | B1, C1, C2, C4, F2, F4, G1, G5, L1 | Medieval / Era I |
| Maritime Southeast Asia (`se_maritime`) | majapahit, malacca, brunei | all but F02, L01, S02 | C1, C4, F2, F4, G1, G5, L1, S2, S3, T5 | Era I |
| Christian Horn (`horn`) | ethiopia, kaffa, hadiya, oromo | F01, F03, B02, C01, G01 | B1, C1, G1, G5, L1 | Ancient |
| Swahili and Somali coast (`swahili_somali`) | adal, ajuran, kilwa, mombasa, zanzibar, sofala, comoros, warsangali, afar_dankali, beja, madagascar_north_trading_towns | F03, B02, C01, G01, T01, S01 | C1, F4, G1, L1, L2, S2, T5 | Ancient |
| Sahel empires (`sahel`) | mali, songhai, jolof, kano, kanem_bornu, air_agadez, bulala, katsina, timbuktu_tuareg, biram, gobir, zamfara, zazzau, takrur_futa_toro, darfur_tunjur, kaabu, sine, fezzan, mzab, touggourt_ouargla, tuat, sanhaja_zenaga, tuareg_kel_ajjer, tubu_teda | F03, C01, G01 | B4, C1, F4, G1, L1, L2, T1, L9 | Ancient |
| Volta kingdoms (`volta`) | mossi, bono, dagbon, borgu, voltaic_stateless_societies, mande_kafus | F03, C01 | B4 | Ancient |
| Forest and plateau Africa (`forest_africa`) | benin, kongo, mutapa, loango, tio, oyo, allada_tado, igala, ijebu, kwararafa, akan_forest, cross_river_societies, igbo_societies, ijaw_delta, middle_belt_societies, upper_guinea_coast, windward_coast_peoples, ankole, buganda, karagwe, kitara, rwanda, madagascar_coast, madagascar_highlands, khoikhoi, san, kunene_peoples, equatorial_forest_societies, maasai_kenya_highlands, makua_lomwe, delagoa_lowland_chiefdoms, nguni, sotho_tswana, thulamela, tonga_zambezi, luba, lake_malawi_peoples, mbundu_chiefdoms, ovimbundu_central_angola, kwango_kasai_societies, gran_canaria, tenerife_menceyatos, la_palma | C01 | B4, F4 | Ancient |
| Mesoamerica (`mesoamerica`) | aztecs, zapotec, maya, purepecha | B02, G01 | F4, G1, L1, F9 | Ancient |
| Andes (`andes`) | inca, chimu, muisca | B02, S01 | F3, F4, G6, F9 | Ancient |
| North American peoples (`north_america`) | iroquois, huron, cherokee, creek, pueblo, apalachee, calusa, caddo, casqui_pacaha, chumash, coast_salish, cofitachequi, fort_ancient, hopi, lenape, mandan_hidatsa, natchez_plaquemine, neutral_erie, ojibwe_anishinaabe, oneota, oodham, pacific_northwest, pawnee_plains_villagers, powhatan_precursors, southern_new_england_algonquians, st_lawrence_iroquoians, timucua, tlingit_haida, wakashan | none | F4, F9 | Ancient |

| Realm | Also knows | Does not know |
|---|---|---|
| adal | F01 | — |
| ajuran | B1 | — |
| aragon | S2, T2, T3 | — |
| ayutthaya | S2 | — |
| aztecs | F6 | — |
| bahmanis | L2 | — |
| bengal | L2, S1, S2 | — |
| benin | L9 | — |
| bohemia | W4 | — |
| brunei | L2 | — |
| burgundy | T2, T3, F8 | — |
| byzantium | L01, S1, S2, G3, T2 | — |
| castile | S2, S4, F11 | — |
| champa | S2 | — |
| chimu | — | G6 |
| cologne | T2, T3 | — |
| cyprus | S2 | — |
| dai_viet | C3, G4, W3 | — |
| delhi | L2 | — |
| florence | T2, T3 | — |
| genoa | T2, T3, S2, S4 | — |
| gondwana | — | C03 |
| great_horde | L2 | — |
| granada | S1, S2 | — |
| gujarat | L2, S1, S2, T5 | — |
| hamburg | T2, T3 | — |
| hejaz | F11 | — |
| hungary | W4 | — |
| inca | B1, B2, F6, L1 | — |
| jaunpur | L2 | — |
| jurchens | F01 | — |
| kashmir | L2 | — |
| kilwa | B1 | — |
| knights_of_rhodes | S2 | — |
| luneburg | T2, T3 | — |
| majapahit | B1 | — |
| malacca | L2 | — |
| mali | B2 | — |
| malwa | L2 | — |
| mamluks | C5, S1, S2, T2, F11 | — |
| maya | L01 | — |
| milan | T2, T3 | — |
| modena | T2 | — |
| morocco | S1, S2 | — |
| muisca | — | B02, S01 |
| multan | L2 | — |
| muscovy | W4 | — |
| mutapa | B02 | — |
| naples | S2 | — |
| navarre | F11 | — |
| nogai | L2 | — |
| oman | T5, S1, S2, F11 | — |
| ottomans | B2, G3, S1, S2, W3, W5, C5, L9 | — |
| papal_states | T2 | — |
| pegu | S2, T5 | — |
| portugal | S2, S4 | — |
| provence | S2 | — |
| pueblo | B02, F3 | — |
| purepecha | — | G01, G1, L1 |
| ragusa | T2, S2 | — |
| scotland | W6 | — |
| sindh | L2 | — |
| switzerland | W6 | — |
| timurids | L3, W3 | — |
| tunis | S1, S2 | — |
| venice | T2, T3, C5, G3, S2 | — |
| vijayanagar | S1, S2, T5 | — |
| yemen | T5, S1, S2, F11 | — |

What the groups give in 1444: Latin, Orthodox, Islamic, South Asian and East Asian realms stand in Era I with 23 to
38 inventions, maritime Southeast Asia in Era I with 21, and mainland Southeast Asia is split between Medieval and Era I; the khanates and hordes stand in Medieval with 11 to 16,
one era level below their settled neighbours outside the horse line (government GOV-068); Tibet, the Horn,
the Swahili coast and the Sahel stand in Ancient with 7 to 15; Forest Africa stands in Ancient with 3 or 4 (iron but no
horses), and Mesoamerica, the Andes and North America in Ancient with 2 to 10, without iron or horses. No African realm south of the Sahara starts with B1 *Stone
castles*: they defend with B4 earthworks until they learn dressed stone.

**The 1378 start (RSCH-114, RSCH-115).** A campaign that starts on 20 September 1378 uses the groups and sets
above with the 1378 block of `research.starts`. The realms of 1378 that are not yet map nations join the group of
their neighbours (ids from `start-date/checkpoints/1378.json`); a realm already in a group keeps it unless a join
moves it. Lithuania keeps `latin` inventions (its pagan faith is religion's work). The Golden Horde
(`great_horde`) stays in `hordes`, Goryeo stays `korea` and Mayapan (`maya`) stays `mesoamerica`.

| Group | Realms that join it in 1378 | Standing at the 1378 start |
|---|---|---|
| `latin` | achaea, athens, padua, verona, pisa, visconti_pavia, oristano, sicily, flanders, brabant, holland, saxe_wittenberg, lubeck, riga, cologne_city, avignon_papacy | Era I (26 to 29 inventions) |
| `orthodox` | bulgaria_tarnovo, bulgaria_vidin, dobruja, brankovic, zeta, morea, suzdal_nizhny | Era I (23 to 26) |
| `islamic` | jalayirids, muzaffarids, kartids, sarbadars, hormuz, germiyan, aydin, mentese, saruhan, hamid, eretnids | Era I (26 to 30) |
| `khanates` | timurids (moves from `islamic`: Timur's Chagatai ulus), sufids (Khwarazm) | Medieval (16) |
| `hordes` | white_horde, naghachu (Naghachu's Manchuria, by its Mongol neighbours) | Medieval (11) |
| `china` | yunnan_yuan (the Yuan prince of Yunnan, by its Chinese neighbours) | Era I (37) |
| `japan` | japan_southern_court, kamakura_kubo, ryukyu, hokuzan, nanzan (the Ryukyu kingdoms by their nearest settled neighbour) | Era I (25) |
| `south_asia` | calicut, kotte, nepal_malla | Era I (25 to 28) |
| `se_mainland` | sukhothai | Medieval (19) |
| `se_maritime` | singapura, tondo, ternate | Medieval (20) |
| `swahili_somali` | ifat, mogadishu | Ancient (13) |
| `forest_africa` | great_zimbabwe | Ancient (4) |
| `mesoamerica` | tepanecs | Ancient (6) |
| `andes` | quitu_cara | Ancient (6) |

| Realm (1378) | Also knows | Does not know | Why |
|---|---|---|---|
| ottomans | — | W3, W5, G3 | No bombards or handguns yet; the registers come later |
| bohemia, hungary | — | W4 | The wagon fort is Hussite, from the 1420s |
| portugal, castile | — | S4 | The ocean caravel is learned in the 1430s; Genoa keeps its carrack |
| timurids | — | L3, W3 | Ulugh Beg's observatory comes in the 1420s; W3 also needs C2 and C03, which the khanates lack, so it goes too |
| ming, yunnan_yuan | — | G3 | The Yellow Registers become a Hongwu event (1381) |
| jalayirids | L3 | — | The Maragha tradition |
| hormuz | T5, S1, S2, F11 | — | As Oman |
| calicut | S1, S2, T5 | — | As Vijayanagar |
| morea | L01, S1, S2 | — | As Byzantium |
| flanders | T2, T3, F8 | — | As Burgundy |
| brabant, cologne_city, lubeck, visconti_pavia | T2, T3 | — | As Cologne, Hamburg and Milan |
| pisa | T2, T3, S2 | — | As Genoa |
| holland | F8 | — | Polders |
| padua, avignon_papacy | T2 | — | As Modena and the Papal States |
| sicily | S2 | — | As Naples |
| great_zimbabwe | B02 | — | As Mutapa: dressed stone |

Every 1378 set is complete (RSCH-099): the removals take nothing that another invention in the same set needs,
since no realm's set holds what grows from W3, W4, W5, S4, L3 or G3. Florence does **not** start knowing L6
*Humanist learning*: L6 grows from L5 *printing* or L2 *Madrasa networks*, and Florence knows neither in 1378, so
the set would not be complete. Its head start (Salutati is chancellor) waits for a bridge event or a call by
Leroy (OQ-RSCH-23). Europe has no W5 in 1444 either, so "Europe doesn't know it" changes no set. By RSCH-097 the
1378 sets stand as in 1444 for every realm on both maps, except Timur's realm, which stands in Medieval with the
khanates instead of Era I. The horse line (government GOV-068) and the horde Technology share (GOV-069) are for
government to measure again.

### 5.12 Behind the times (18 October 2026, D-GOV-19)

- RSCH-112: Every realm shall pay less for an invention of an era earlier than the current date: 25 % less for each era it lies behind, at most 50 % off (`research.behind_discount_pct_per_era` 25, `research.behind_discount_cap_pct` 50), applied after the cost by era and before the spread from neighbours and trade partners (RSCH-034); an invention never costs less than a fifth of its era cost (`research.cost_floor_share` 0.2). The past eras count like any other: in 1450 an Ancient invention is two eras behind and a Medieval one, one. What the world already knows is cheap to learn and what is new still costs full price, so a realm that starts behind (hordes, African and American starts) catches up. The research AI's rule (RSCH-078) then studies these first. @placeholder [Leroy 18 Oct; government GOV-070; D-GOV-19]

### 5.13 Era I from the start, and a start in 1378 (18 October 2026, Leroy, D-RSCH-23)

Leroy chose to start the campaign on 20 September 1378 and to stretch Era I back to the start, keeping the tree as
it is. Medieval now ends in 1377, past inventions stay known before the start, and no id changes. A campaign that
starts on 11 November 1444 plays exactly as before: its Era I pace is ×1 and no start block applies.

- RSCH-113: Era I's cost per invention shall be multiplied by the share of Era I the campaign plays: the years from the campaign's start year to 1500, over the 56 of a 1444 start, never below 1 (`research.era_pace`: era I, `reference_years` 56). A 1444 start pays ×1, a 1378 start about ×2.18 (43.6 scholar-years for an Era I invention before discounts), so a typical realm still reaches Era II around 1500. The pace scales the era cost everywhere it is used for that campaign (studying ahead, behind the times, the cost floor and stealing in war); other eras and the Technology score's weights do not change. The balance model tunes the rule. @placeholder [plan-1378 §3.2, D-RSCH-23]
- RSCH-114: A campaign that starts on another date than 11 November 1444 shall apply that date's **start block** from the research data (`research.starts`, keyed by the start year) on top of the start groups: the groups its realms join (a join wins over the 1444 group), then each realm's additions and removals after its 1444 ones. A start without a block is the 1444 start. A block may name realms that are not yet map nations; each is checked as a map nation only once the map has it. Every set it gives shall be complete (RSCH-099). [plan-1378 §3.2, D-RSCH-23]
- RSCH-115: The 1378 block shall give the sets of the 1378 table in §5.11: the Ottomans know neither W3 *Bombards* nor W5 *Gunpowder infantry* nor G3 *Tax registers*; Europe keeps W3 and has no W5, and Ming keeps W3, W5 and W4; Bohemia and Hungary do not know W4 *Wagon fort*; Portugal and Castile do not know S4 *Carrack and caravel*, which Genoa keeps (Venice has no S4 in the 1444 sets either, so nothing changes for it); Timur's realm does not know L3 *Observatories* and the Jalayirids do (the Maragha tradition); Ming does not know G3 (the Yellow Registers come as a Hongwu event in 1381, later); Goryeo (`korea`) keeps L4 *Metal movable type*. [plan-1378 §3.2, D-RSCH-23]

**How the player uses it.** Nothing in the screens changes except the era dates they show: the Learning tab's era
headings and "Now" mark, and the standing lines, read Era I from the start (1378–1500 in a 1378 campaign). The
higher Era I cost shows in each invention's cost and time, as any cost does (RSCH-084, RSCH-100).

### How the player uses the one tree
- RSCH-100: The Tree part of the Learning tab shall draw the whole tree as one picture, never one bough at a time: the root *Settled life* at the left, then a column per era (Ancient, Medieval, I to VII), and the four boughs as four horizontal bands of the same picture, each with its name pinned at the left edge while the tree scrolls. The era headings stay pinned along the top, the era of the current date marked "Now". Parent lines are always drawn, across bands too; an "also needs" line, in any band, is drawn only for the picked invention, highlighted, and its sheet lists them. This replaces the bough tabs of RSCH-084. [Leroy 18 Oct, X-19]
- RSCH-101: The tree shall have two zoom levels: **Close up**, with named 44-point nodes, and **Whole tree**, where the full tree fits the frame, each invention a dot in its state's colour and each band and era labelled, so the player sees at a glance how far each bough reaches. A Whole tree / Close up button and a pinch inside the frame switch levels; tapping a place in the Whole tree opens Close up there. [X-19]
- RSCH-102: Above the tree a row of 44-point chips shall jump to what matters, opening its sheet: "My study", "Can study ◆ n" (each tap the next one), and, while the realm lacks any, "Catch up n" (each tap the next past invention it can study). [X-19]
- RSCH-103: The Learning overview shall show the realm's standing next to the era: "Era I · abreast of the times", or "Ancient · behind the times by 2 eras · 9 past inventions to catch up", which opens the tree at the first one. A past invention's sheet says what it opens and its "Without it" line (RSCH-094). [X-19]
- RSCH-104: Another realm's country card shall show its standing and how many inventions it knows that the player's realm does not; those are the ones it makes cheaper as a neighbour or trade partner (RSCH-034). [X-19]
- RSCH-105: The nation picker at the start of a campaign shall show each realm's standing ("Starts in Ancient", "Starts in Era I") next to its name, so the player knows a realm starts behind before choosing it; the game shell places it. [X-19]
- RSCH-106: The one tree shall work on a phone in landscape and in the Tall layout: inside the safe areas; the tree frame takes the tab's full width; in Wide the band names sit in a pinned column, in Tall (under 500 points wide) they shrink to a coloured strip with the bough's first letter; nodes, chips and the zoom button at least 44 points; dragging scrolls inside the frame and the page never scrolls sideways; nothing needs hover; the sheet stands beside the tree where the tab is at least 500 points wide, otherwise above it (RSCH-090). [X-19, SHELL-108, SHELL-109, SHELL-114]

## 6. Commands

| Command | Who issues it | Preconditions | Result | Events emitted |
|---|---|---|---|---|
| SetStudy(invention) | player / AI | Eligible (parent, or, also needs, contact, scope) | Becomes the current study | StudyChanged |
| SetQueue(inventions) | player / AI | At most 5; each eligible once those before it are known | Replaces the study queue | QueueChanged |
| SetSecondStudy(invention) | player / AI | Has an academy-level school; eligible | Second study set | StudyChanged |
| SetSeatsToFill(school or realm, n) | player / AI | n ≤ seats; recruits available | Students enrolled from recruits | StudentsEnrolled |
| CallStudentsToArms() | player / AI | Students enrolled | Schools emptied into recruits; research stops | StudentsCalledToArms |
| HireForeignScholar() | player / AI | Gold | Scholar added | ScholarHired |
| MakeScholarOfficial(scholar, type) | player / AI | Knows G4 | Scholar becomes an official of any type | OfficialTrained |
| ChooseGraduatePath(graduate, scholar / official type) | player / AI | Graduation; type allowed by school | Scholar or official | StudentsGraduated, OfficialTrained |

## 7. Domain events

| Event | When | Payload | Consumed by |
|---|---|---|---|
| InventionLearned | Progress reaches cost; stolen; start | country, invention | province (unlocks), buildings, warfare, trade, exploration, diplomacy, government, realm (Technology score), events |
| StudyChanged | Command; next queued study starts | country, invention(s) | AI, game-shell |
| QueueChanged | SetQueue | country, inventions | game-shell |
| StudentsEnrolled / StudentsCalledToArms | Commands | country, count | realm (recruits), province |
| StudentsGraduated | After 5 years | country, count, path | realm, province (officials) |
| SchoolSacked / SchoolClosed | War, unpaid upkeep, religious change | province, school | province, buildings |
| ScholarsFled | War, persecution, poaching | from, to, count | province (receiver) |

## 8. Policies (reactions to other contexts)

- When warfare reports fighting in a province with a school, then the school may be sacked and its scholars scatter, possibly fleeing to a peaceful neighbour.
- When realm reports school upkeep unpaid, then close the school and stop progress if no school is open.
- When religion reports a change of state faith, then the other faith's schools may close.
- When trade reports a trade partner (traders depositing or collecting in each other's cities), then count it for spread.
- When exploration or events report a contact event, then open the matching contact inventions.
- When province reports famine or plague, then lose students and scholars there.
- When warfare reports an occupied enemy province with an open school, then each current study the enemy knows gains 10 % of its cost, once per province per war (RSCH-071).
- A neighbour of the same language family counts once, like any other neighbour (D-RSCH-8: culture's request to count it double is not taken).

## 9. Monthly step

A turn is one week (X-18). The steps below are monthly: they run once, in the turn in which a new month begins.

Reads first: schools open (province, buildings), upkeep paid (realm), recruits (realm), war state (warfare), neighbours and trade partners (map, trade), date (time-and-turns).
1. Add a twelfth of the year's progress from scholars and students, split evenly between two studies (RSCH-067, RSCH-068).
2. If progress reaches cost, emit InventionLearned; the next study must be chosen.
Each January: student cohorts age; 5-year cohorts graduate; scholars are lost to old age (RSCH-075) and poaching (RSCH-073); spread discounts recomputed with trade partners. School upkeep is paid with the realm's treasury step.
On era boundaries (by date): costs of studying ahead change.

## 10. Configuration

| Key | Meaning | Value in the design | Placeholder? | Config file |
|---|---|---|---|---|
| research.era_cost | Scholar-years by era | A 10, M 15, I 20, II 40, III 80, IV 150, V 250, VI 400, VII 650, VIII 1000 | yes | research config |
| research.era_dates | Era start years | A before 600, M 600, I 1378 (the start; a 1444 start begins in it), II 1500, III 1600, IV 1700, V 1800, VI 1870, VII 1914 (cut 31 Aug 1939), VIII 1960 | no | research config |
| research.ahead_multiplier | Cost per era ahead | ×2 | yes | research config |
| research.spread_per_partner | Discount per neighbour or trade partner | 10 % | yes | research config |
| research.spread_cap | Maximum discount | 60 % | yes | research config |
| research.scholar_rate | Scholar-years per scholar per year | 1 | yes | research config |
| research.student_rate | Scholar-years per student per year | 0.2 | yes | research config |
| research.graduation_years | Years to graduate | 5 | yes | research config |
| research.studies_with_academy | Studies at once with academy-level school | 2 | yes | research config |
| research.school_seats | Seats per school type | temple/monastery 20, madrasa 30, university 60, academy 100 | yes | research config / buildings config |
| inventions[] | One row per invention: `id`, `parent`, `also_needs`, `era`, `unlocks`, `start_regions` | 174 rows (§5.8) and 13 past rows (RSCH-092) | era costs placeholder | research tree config |
| dropped_inventions | Era VII inventions never studied | L23, L24 | no | research.json |
| research_months_per_year | Monthly steps a year's progress is split over | 12 | yes | research.json |
| second_study_share | Share of scholar-years each of two studies gets | 0.5 | yes | research.json |
| village_school_seats | Seats per province without a school, with L18 | 10 | yes | research.json |
| school_upkeep | Gold a year per school type | temple 2, madrasa 4, university 4, academy 6 | yes | research.json |
| steal_share_of_cost | Progress gained by occupying an enemy school | 10 % of cost | yes | research.json |
| sack_chance_pct, sack_scholars_flee_share | Sack chance and share of scholars who flee | 25 %, half | yes | research.json |
| poach_gold_ratio, poach_one_in | Gold ratio for poaching, share poached | 2×, 1 in 20 | yes | research.json |
| old_age_one_in | Scholars lost to old age a year | 1 in 30 (1 in 60 with L10) | yes | research.json |
| start_groups | Per group: members, past inventions, Era I and II inventions (§5.11) | 20 groups | yes | research.json |
| start_add, start_remove | Per realm: inventions added to or removed from its group's set (§5.11) | table | yes | research.json |
| without | What lacking F01, F03, B01, C01 costs (RSCH-094) | F01 −1 harvest step; F03 no horse regiments or caravans; B01 half the food carried; C01 −20 % strength | yes | research.json |
| queue_length | Inventions a study queue holds after the current study | 5 | yes | research.json |
| standing_share | Share of an era's inventions that gives standing in it | 0.25 | yes | research.json |
| behind_discount_pct_per_era / behind_discount_cap_pct / cost_floor_share | Cheaper for an era behind the date (RSCH-112) | 25 % per era / 50 % / a fifth of the era cost | yes | research.json |
| regional_contacts | Inventions that open only on a contact for the realms of some start groups | F03 on first contact across the ocean for mesoamerica, andes and north_america (RSCH-096); F9's contact stays on its row (RSCH-077) | no | research.json |
| past_eras, era_names | The eras before the start and their names | A Ancient, M Medieval | no | research.json |
| era_pace | Era I pacing: the era it paces and the years of a 1444 start's Era I (RSCH-113) | era I, `reference_years` 56 | yes | research.json |
| starts | Start blocks by start year: date, `join`, `add`, `remove` (RSCH-114, the 1378 table of §5.11) | 1378 | yes | research.json |

The file is `packages/rules/data/domain/research.json`; its `_provisional` list names the provisional values.

## 11. Seams

| Other context | Direction | Pattern | What crosses |
|---|---|---|---|
| realm | upstream | Customer–Supplier | Gold for school upkeep, the recruit pool for students, war and peace state; research returns inventions known for the Technology score |
| province | upstream | Customer–Supplier | Schools, students and scholars per province, Schoolmaster, graduates becoming officials by school type; research sends unlocks (buildings, tile changes, harvest steps, roads, castles) |
| buildings | upstream | Customer–Supplier | School buildings and their steps; the chancery that G3 and G10 need; buildings hang new buildings on invention ids |
| trade | upstream | Customer–Supplier | Trade partners for spread; the T-branch carries trade v2's effects (D-RSCH-4) |
| warfare | downstream | Customer–Supplier | W, B, S inventions and their numbers (warfare §12); battles roll the sack (RSCH-072); occupations steal progress (RSCH-071) |
| recruiting | downstream | Customer–Supplier | W12, W15, W18 recruiting effects |
| exploration | downstream | Partnership | S4, S5, T8, T9 colonial governor slots (T8 and T9 keep +1 each); the Atlantic crossing contact event opens F9 (D-RSCH-13) |
| naval | downstream | Customer–Supplier | S inventions and ship types |
| troop-movement | downstream | Customer–Supplier | B2, B9 and railways as road factors |
| diplomacy | downstream | Customer–Supplier | G5, G8 envoys; G8 asking for passage (D-RSCH-5) |
| government | downstream | Customer–Supplier | G9, G14 and other ids as reform requirements |
| culture | upstream | Customer–Supplier | Nothing for spread: same-family neighbours count once (D-RSCH-8) |
| religion | upstream | Customer–Supplier | A change of faith closes the other faith's schools |
| national-strengths | upstream | Conformist | `invention_cost_pct`, `knows` levers |
| events | upstream | Anti-Corruption Layer | ★ ids for `tech_*`/`innovation`; `literacy`; contact events |
| scenario-setup | upstream | Customer–Supplier | Map nations; each belongs to one start group in the research data (RSCH-098, D-RSCH-21) |
| warfare, recruiting | downstream | Customer–Supplier | Without C01 regiments fight 20 % weaker; without F03 no horse regiments (RSCH-094) |
| troop-movement | downstream | Customer–Supplier | Without B01 armies carry half the food (RSCH-094) |
| province | downstream | Customer–Supplier | Without F01 farmland harvests one step worse (RSCH-094) |
| game-shell | downstream | Customer–Supplier | Each realm's standing for the nation picker and country cards (RSCH-104, RSCH-105) |
| time-and-turns | upstream | Conformist | Current date for eras and studying ahead; campaign end 31 August 1939 |

## 12. AI

- An isolationist AI fills its schools and avoids war; a hegemon seeker keeps recruits for the army instead of students (country stats §11).
- A realm behind the times studies its missing past inventions first, since they cost least (RSCH-095, RSCH-078).
- The AI studies the eligible invention that costs it least now, ties by id; it fills every seat in peace, none at war, and calls students to arms only at war with no recruits left (RSCH-078, D-RSCH-14).

## 13. Decisions and open questions

- **D-RSCH-1** (was OQ-RSCH-1) Era VII at 1939: of the 18 Era VII inventions, L23 *Nuclear physics* and L24 *Rocketry* are dropped (never studied); the other 16 stay in play until 31 August 1939 with their effects trimmed to what they did by 1939 (C22 gives trucks, tractors and aircraft as built by then); the Era VII cost stays 650 scholar-years. X-14 settles it.
- **D-RSCH-2** (was OQ-RSCH-2) Era VIII ★ inventions: the 12 Era VIII rows, L25, T19 and F23 included, stay in the tree config with their ids so the tree keeps its 174 rows and 20 ★ ids, but they are never studied and the events that read them are dropped. X-14 drops everything after 1939, and keeping the rows costs nothing.
- **D-RSCH-3** (was OQ-RSCH-3) Ironclads: S14 stays era V and grows from S13 *Steamships* with no other needs; C18 is no longer its parent. A wrong parent is the smaller fix, and ironclads came before cheap steel.
- **D-RSCH-4** (was OQ-RSCH-4) T-branch effects: the T-branch and S2 take trade v2 §11's effects word for word (T1, T2, T3, T5, T6, T8, T9, T11, T13, S2), and T8 and T9 also keep exploration's +1 colonial governor slot each. X-6 settles it.
- **D-RSCH-5** (was OQ-RSCH-5) Other tree edits: G8 also lets a country ask for passage; G3 and G10 work only while the realm has a chancery; buildings hang on the ids buildings names; W15 gives +50 % recruits and W12 a troop cap of +0.5 % of people (warfare §12's numbers). No staff college is added: X-7 already makes academy graduates commanders. Each edit is a later design's text on an existing rule, and a new school type would be a new mechanic.
- **D-RSCH-6** (was OQ-RSCH-6) Monthly progress: each monthly research step adds a twelfth of the yearly scholar-years, and an invention is known in the month its progress reaches its cost. Research runs once a month, in the turn a new month begins (X-2, X-18), so progress should move every month.
- **D-RSCH-7** (was OQ-RSCH-7) Two studies: each gets half the scholar-years, and one open academy anywhere in the realm is enough. An even split needs no extra setting.
- **D-RSCH-8** (was OQ-RSCH-8) Spread modifiers: L5, L14 and L21 each raise the discount per neighbour or trade partner by a fifth (10 % → 12 % → 14 % → 16 %); the 60 % cap stays; a neighbour is a country owning a province that borders one of yours by land; a same-family neighbour counts once (culture's double count is not taken). "+20 % spread" read as a bigger step per partner keeps one number to change, and the double count would be a second rule.
- **D-RSCH-9** (was OQ-RSCH-9) Seats and upkeep: L18 gives 10 village-school seats to each province without a school, with no upkeep; there are no colleges or staff colleges beyond the four school types; school upkeep is 2 gold a year for a temple or monastery school, 4 for a madrasa or university, 6 for an academy (inside the buildings design's 2–6 learning range). Provisional numbers inside ranges the designs already give.
- **D-RSCH-10** (was OQ-RSCH-10) Stealing, sacking, fleeing and poaching: occupying an enemy province with an open school gives each current study the enemy knows 10 % of its cost, once per province per war; a battle in a province with an open school sacks it with a 25 % chance, and half that province's scholars flee to the first peaceful neighbour in nation-index order (lost if none); each January the richest neighbour with at least twice your gold poaches 1 in 20 of your scholars. These are the design's own causes, each given one provisional number and a deterministic target.
- **D-RSCH-11** (was OQ-RSCH-11) Start sets: research data maps each start label ("Ottoman", "Most of Europe", "Indian Ocean" …) to map nations, plus a short extra list (Ming and Korea know L5 printing); a nation knows every invention whose label covers it and everything those need. `institutional_development` is not used, and no study starts with progress. A data table is the simplest rule that keeps the tree's own "start:" column as the source.
- **D-RSCH-12** (was OQ-RSCH-12) Research effects in numbers: L6 and L11 +10 % research each, L20 +50 %, L3 +20 % toward Learning and Sea inventions; C1, L4 and L5 each make school upkeep 10 % lower; scholars are lost to old age at 1 in 30 a year, 1 in 60 with L10. Other unquantified effects take the number of the context that owns them. Provisional values for balancing.
- **D-RSCH-13** (was OQ-RSCH-13) Contact inventions: F9 is the only one; it opens when exploration reports the country's Atlantic crossing, and the countries of the Americas know it from the start. Exploration already owns crossings.
- **D-RSCH-14** (was OQ-RSCH-14) AI: the AI studies the eligible invention that costs it least now (ties by id), fills every empty seat in peace and none at war, and calls students to arms only at war with no recruits left. The simplest rule that follows the AI notes of country stats §11.
- **D-RSCH-15** (was OQ-RSCH-15) Women scholars: students come from recruits and graduates are counted without a sex; whether a scholar named to a role is a woman is the realm's women-in-roles roll (realm). No second pipeline is needed.
- **D-RSCH-16** (was OQ-RSCH-16) Guano: F16's +1 harvest step lasts 30 years from the year it is learned and then simply ends; F19 gives its own +2. The plain reading of "for 30 years".
- **D-RSCH-17** (was OQ-RSCH-17) Examination system: without G4 only a new graduate may be made an official, of his school's types; with G4 a working scholar may be made an official of any type at any time. That is the one thing G4 adds to the general rule.
- **D-RSCH-18** (17 Oct, milestone 4) Starting schools and scholars: the designs give none, so every realm starts with one school in its capital (a madrasa with L2, else a temple or monastery school, founded by the clergy where it knows neither L1 nor L2), half its seats filled with cohorts of the last five years, and 5 scholars (2 without L1 or L2). Research then moves from 1444 for every realm and graduations come every January, while no realm begins ahead of what it knows.
- **D-RSCH-19** (17 Oct, milestone 4, first slice) Founding schools and switching studies: a school is founded from the Research tab in a town (25,000 people, the map's town size, or the capital) for buildings' temple-school step (60 gold, 12 months, taken as treasury gold), a madrasa where the realm knows L2 since buildings gives that step no cost; choosing another study drops the progress on the old one. One study at a time; the academy's second study, stealing, sacking, poaching, foreign scholars and contact events wait for later slices. The simplest rules that let the player act now; the buildings context will take schools into its build list.
- **D-RSCH-20** (17 Oct, Leroy's feedback 88) The Research tab shows the tree: the first tab listed the inventions open to study by era, which hid the tree and read as if any invention could be picked, among too many controls. Now the tab is an overview plus two parts, Tree (drawn branch by branch; Study only on an invention whose needs are known, a locked one saying what to learn first) and Schools (seats, students to arms, schools, founding). The rules of what may be studied are unchanged (RSCH-031, RSCH-033).
- **D-RSCH-21** (18 Oct, Leroy) One tree reaching back before 1444, and start groups: Leroy asked for one single tree, not the four branch tabs, reaching further into the past so some countries start behind, and for each kingdom's starting technologies. The tree is now drawn as one picture with the branches as bands and a whole-tree zoom (RSCH-100 to RSCH-106); two eras before 1444 add 13 past inventions that Era I rows now need (RSCH-091 to RSCH-096); a realm that lacks one plays below the 1444 baseline, so realms that know them play exactly as today and only the laggards change. Start labels gave thin, uneven sets (France knew 12 inventions, Kongo knew stone castles), so every map nation now belongs to one of 20 start groups with complete sets (RSCH-098, RSCH-099, §5.11), and a realm's standing names how far behind it starts (RSCH-097). Penalties, costs and the standing share are provisional for the balancing model; the Hordes, African start and tribal designs tune their groups.
- **D-RSCH-22** (18 Oct, Leroy's feedback 113) Tree, queue and selection on one screen: the Research tab still split the tree from the action, and a realm could only hold one study, so each invention ended in an alert and a fresh choice. Now one screen holds the queue strip, the tree and the selected invention's sheet (RSCH-107, RSCH-111); a queue of 5 carries on by itself (RSCH-108); Queue the path lets the player tap a far invention and get every step to it (RSCH-109); the tree shows queue places (RSCH-110). The AI keeps choosing one study at a time (RSCH-078). The queue length is provisional.
- **D-RSCH-23** (18 Oct, Leroy; plan-1378 §3.2) Era I from the start, and the 1378 sets: the campaign will start on 20 September 1378, and Leroy chose to stretch Era I back to the start (1378–1500) and keep the tree as it is, over a new playable era from 1378 to 1444. Medieval now runs 600–1377, past inventions stay known before the start, and nothing is renumbered (RSCH-032, RSCH-091). Era I gets 122 years instead of 56, so its cost per invention scales by the share of Era I the campaign plays, ×1 from 1444 and about ×2.18 from 1378 (RSCH-113): the simplest rule that leaves a 1444 start unchanged, provisional for the balance model. A 1378 start adds a start block on top of the 1444 groups (RSCH-114, RSCH-115, the 1378 table of §5.11); the game still starts on 11 November 1444 until the scenario moves it, and the scenario will then name the start the block is read from.
- **OQ-RSCH-23** Florence's head start in humanist learning (plan-1378 §3.2): L6 needs L5 or L2, which Florence lacks in 1378, so knowing it would break RSCH-099. A bridge event (Salutati) or a tree change is for Leroy to choose.

## 14. Traceability

Every requirement has at least one scenario. The invention list (§5.8) is checked as a whole by RSCH-042 and by sampled rows; each row is config data.

| Requirement | Feature file | Scenario |
|---|---|---|
| RSCH-001 | schools-and-students.feature | Schools are gained |
| RSCH-002 | schools-and-students.feature | Schools are lost |
| RSCH-003 | schools-and-students.feature | School types and seats come from the tree |
| RSCH-003 | schools-and-students.feature | Mass schooling gives every province seats |
| RSCH-004 | schools-and-students.feature | The player sets how many seats to fill |
| RSCH-005 | schools-and-students.feature | Students are lost |
| RSCH-006 | schools-and-students.feature | Students graduate after five years |
| RSCH-007 | schools-and-students.feature | A graduate may become an official |
| RSCH-007 | schools-and-students.feature | The examination system makes scholars officials directly |
| RSCH-008 | schools-and-students.feature | Scholars come and go |
| RSCH-010 | research-progress.feature | France studies Bastion forts |
| RSCH-011 | research-progress.feature | France studies Bastion forts |
| RSCH-012 | research-progress.feature | Closed schools stop progress but keep what is known |
| RSCH-013 | research-progress.feature | Stealing an invention in war |
| RSCH-014 | research-progress.feature | One study at a time, two with an academy |
| RSCH-020 | war-and-research.feature | Every seat is a man the army can't raise |
| RSCH-021 | war-and-research.feature | Schools cost gold every year |
| RSCH-022 | war-and-research.feature | Calling students to arms |
| RSCH-023 | war-and-research.feature | War damages schools |
| RSCH-030 | cost-and-eligibility.feature | Cost by era |
| RSCH-031 | cost-and-eligibility.feature | Studying ahead costs double per era |
| RSCH-032 | cost-and-eligibility.feature | Studying ahead costs double per era |
| RSCH-033 | cost-and-eligibility.feature | Parent, also needs and "or" |
| RSCH-034 | cost-and-eligibility.feature | Spread from neighbours and trade partners |
| RSCH-035 | cost-and-eligibility.feature | Contact inventions need a contact event |
| RSCH-036 | cost-and-eligibility.feature | Inventions that change research itself |
| RSCH-040 | invention-tree.feature | One root, four branches, letters are only labels |
| RSCH-041 | invention-tree.feature | One root, four branches, letters are only labels |
| RSCH-042 | invention-tree.feature | The tree holds 174 inventions |
| RSCH-042 | invention-tree.feature | Inventions unlock what their row says |
| RSCH-043 | invention-tree.feature | Event-tree inventions keep their ids |
| RSCH-044 | invention-tree.feature | A new invention is one config row |
| RSCH-045 | invention-tree.feature | Scope of eras |
| RSCH-050 | starting-knowledge.feature | Everyone knows the root and the branches |
| RSCH-051 | starting-knowledge.feature | Historical starting inventions |
| RSCH-060 | research-readers.feature | Literacy reads scholars and schools per thousand people |
| RSCH-061 | research-readers.feature | The Technology score reads inventions weighted by era cost |
| RSCH-036 | cost-and-eligibility.feature | Spread inventions add up but the cap stays |
| RSCH-062 | invention-tree.feature | Scope of eras; Nothing is studied after the campaign ends |
| RSCH-063 | invention-tree.feature | Era VIII rows stay in the tree but are never studied |
| RSCH-064 | invention-tree.feature | Ironclads grow from steamships |
| RSCH-065 | invention-tree.feature | The T-branch does what trade says |
| RSCH-066 | invention-tree.feature | Other designs' edits to the tree; Tax registers need a chancery |
| RSCH-067 | research-progress.feature | France studies Bastion forts |
| RSCH-068 | research-progress.feature | Two studies share the scholar-years evenly |
| RSCH-069 | cost-and-eligibility.feature | Spread inventions add up but the cap stays |
| RSCH-070 | schools-and-students.feature | Mass schooling gives every province seats |
| RSCH-070 | war-and-research.feature | Schools cost gold every year |
| RSCH-071 | research-progress.feature | Stealing an invention in war |
| RSCH-072 | war-and-research.feature | A sacked school scatters half its scholars |
| RSCH-073 | war-and-research.feature | A richer neighbour poaches scholars each January |
| RSCH-074 | cost-and-eligibility.feature | Inventions that change research itself |
| RSCH-075 | war-and-research.feature | Scholars grow old |
| RSCH-076 | starting-knowledge.feature | Historical starting inventions; Starting knowledge brings what it needs, but no progress |
| RSCH-077 | cost-and-eligibility.feature | The Atlantic crossing comes from exploration |
| RSCH-078 | war-and-research.feature | What the AI studies and how it fills seats |
| RSCH-079 | schools-and-students.feature | Students do not choose who becomes a woman scholar |
| RSCH-080 | war-and-research.feature | Guano lasts thirty years |
| RSCH-081 | schools-and-students.feature | Who may be made an official |
| RSCH-084 … RSCH-090 | — | Client screens; checked by apps/client/scripts/research-shots.mjs (tap targets, no sideways scroll) |
| RSCH-082, RSCH-083 | — | Wiring of the first slice; checked by packages/engine/test/research.test.ts |
| RSCH-091, RSCH-092, RSCH-093, RSCH-095 | past-eras.feature | Two eras before 1444; Past inventions open the Era I rows; A past invention is cheap and spreads |
| RSCH-094 | past-eras.feature | Without a past invention a realm plays below the baseline |
| RSCH-096 | past-eras.feature | Horses reach the Americas only by contact |
| RSCH-112 | government hordes.feature | Inventions from an earlier era cost less; Behind the times and spread from neighbours add up |
| RSCH-097 | past-eras.feature | Standing |
| RSCH-098, RSCH-099 | start-groups.feature | Every realm starts from its group; Start sets are complete; Who starts behind |
| RSCH-100 … RSCH-106 | — | Client screens; checked by apps/client/scripts/research-shots.mjs and apps/client/src/ui/learning.test.ts (one picture, zoom, tap targets, no sideways scroll) |
| RSCH-032, RSCH-091 | past-eras.feature | Era I runs from the start |
| RSCH-113 | start-1378.feature | Era I is paced to the start |
| RSCH-114 | start-1378.feature | The realms of 1378 join start groups; A 1444 start has no block; 1378 start sets are complete |
| RSCH-115 | start-1378.feature | What a realm knows in 1378 |
| RSCH-097 | start-1378.feature | Standing in 1378 |
| RSCH-108, RSCH-109 | study-queue.feature | The next queued study starts by itself; Queue the path; A full queue takes no path |
| RSCH-107, RSCH-110, RSCH-111 | — | Client screens; checked by apps/client/scripts/research-shots.mjs |
