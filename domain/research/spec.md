# Research (RSCH)

## 1. Purpose and scope

Research decides how a country learns: schools with student seats, students taken from the recruit pool, scholars
who graduate from them, scholar-years of progress, and the one invention tree that every country climbs from a single
root. It also decides what may be studied, what it costs, how knowledge spreads from neighbours and trade partners,
what each country knows in 1444, and which inventions are in scope for a campaign that ends on 31 August 1939.

**In scope**
- Schools, students, scholars and research as stats (country stats §7.1).
- Why war and research don't mix (§7.2).
- How research works (§7.3) and the research tree rules (research-tree "Rules").
- The full tree: every invention, its parent, extra needs, era, unlocks and start regions (research-tree "The tree").
- Scope cut: Era VIII out; Era VII cut at 1939 (gap-lists items 22 and decisions).

**Not in scope (owned by …)**
- What each invention does in another system where that system gives the numbers: warfare §12 (W, B, S), trade §11
  (T, S), exploration §4 (S5, T8, T9 colonial governor slots), buildings (buildings hung on ids), recruiting (W12, W15,
  W18), province (harvest steps, tile changes, school buildings' job slots).
- The school as a building (cost, upkeep, steps, job slots): **buildings** and **province**.
- The recruit pool itself: **realm** and **province**; officials and their types: **province**.
- The Technology win score: **realm** (built from inventions known weighted by era cost).

## 2. Sources

Newest decision first.
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
| Root | *Settled life*, known by everyone | Bough |
| Bough | One of the four first branches, known by every country at the start: R1 Tilling and building, R2 Fire and metal, R3 Counting and records, R4 Boats | Era |
| Parent | The invention a node grows from; must be known to study it | Also needs |
| Also needs | Extra inventions, possibly from another bough, that must also be known | Parent |
| "or" | Either listed invention is enough | |
| Era | I 1444–1500, II 1500–1600, III 1600–1700, IV 1700–1800, V 1800–1870, VI 1870–1914, VII 1914–1960 (cut at 1939), VIII 1960 on (out of scope) | Age (event tree) |
| Studying ahead | Studying an invention of an era later than the current date | |
| Spread | Discount from neighbours and trade partners who already know an invention | |
| Trade partner | A country whose traders deposit in, or collect in, your cities or yours in theirs (trade §9) | Ally |
| Contact invention (⇄) | An invention that opens only after a contact event | |
| Event-tree invention (★) | One of the 20 inventions whose ids the event tree already uses | |
| Academy-level school | A school of the academy type (L12) or better, allowing two studies at once | |

## 4. Domain model

### Aggregates

**Research programme** (identity: country)
Holds: known inventions; current study (one, or two with an academy-level school) and progress in scholar-years;
seats to fill (player setting); students (per school, with years enrolled); scholars.
- INV-RSCH-1: a known invention is never lost.
- INV-RSCH-2: at most one study at a time, two once the country has an academy-level school.
- INV-RSCH-3: an invention can be studied only if its parent (or one of its "or" alternatives) and all its "also needs" are known, and, for a contact invention, its contact event has happened.
- INV-RSCH-4: every country knows the root and the four boughs.
- INV-RSCH-5: Era VIII inventions are never studied; Era VII inventions only within the campaign (to 31 August 1939).

**Invention tree** (identity: one tree; config)
Holds: one row per invention with `id`, `parent`, `also_needs`, `era`, `unlocks`, `start_regions`.
- INV-RSCH-6: the tree is a single tree from one root; every invention has one parent (or alternatives) on the tree.
- INV-RSCH-7: the 20 ★ ids are unchanged so events keep working.

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
- RSCH-032: Eras shall be dated I 1444–1500, II 1500–1600, III 1600–1700, IV 1700–1800, V 1800–1870, VI 1870–1914, VII 1914 to the campaign's end (31 August 1939). [research-tree Rules, gap-lists]
- RSCH-033: A country shall be able to study any invention whose parent it knows plus everything listed under "also needs"; where "or" is given, either one is enough. [research-tree Rules]
- RSCH-034: Each neighbour or trade partner that already knows an invention shall make it 10 % cheaper, up to 60 % off. A neighbour is a country owning a province that borders one of yours by land. [research-tree Rules, §7.3, D-RSCH-8]
- RSCH-035: Contact inventions (⇄) shall open only after a contact event, for example the Atlantic crossing for maize and potatoes. [research-tree Rules]
- RSCH-036: Inventions that change research itself shall apply: L5 *printing* (inventions spread +20 %, schools cost less), C1 *Paper making* (schools cost less), L4 *Metal movable type* (students cost less), L6 and L11 (scholars +research), L3 *Observatories* (+research for Learning and Sea inventions), L10 (scholars work into old age), L14 *Encyclopedias* (spread +20 %), L20 *Research laboratories* (research +50 %), L21 *Radio* (faster spread of news and inventions), with the numbers of RSCH-069 and RSCH-074. [research-tree, D-RSCH-8, D-RSCH-12]

### 5.5 The tree
- RSCH-040: The tree shall be one tree from the root *Settled life*, splitting into four boughs (R1 Tilling and building, R2 Fire and metal, R3 Counting and records, R4 Boats), with inventions branching era by era and many needing an invention from another bough. [research-tree intro]
- RSCH-041: The letter in an invention id (F, C, T, S, W, B, G, L) shall only describe what it is about and shall not form a separate tree. [research-tree intro]
- RSCH-042: The tree shall hold the 174 inventions of §5.8, each unlocking what its row says. [research-tree]
- RSCH-043: The 20 ★ inventions shall keep their ids so the event tree keeps working; the event tree's `tech_*` and `innovation` read inventions from the tree. [research-tree intro, country-stats §11]
- RSCH-044: Each invention shall be one config row with `id`, `parent`, `also_needs`, `era`, `unlocks` and `start_regions`, and new inventions (e.g. Andean terrace farming, Ethiopian church schools, Javanese irrigation) can be hung on any branch without code. [research-tree Rules]
- RSCH-045: The 12 Era VIII inventions shall be out of scope and never studied; of Era VII, L23 and L24 shall never be studied and the other 16 may be studied until 31 August 1939 (RSCH-062, RSCH-063). [gap-lists decisions, item 22, X-14, D-RSCH-1, D-RSCH-2]

### 5.6 Start
- RSCH-050: At the start every country shall know the root and the four boughs. [research-tree Rules]
- RSCH-051: At the start each country shall also know the inventions it historically knew: "start:" names who typically knows each in 1444, and the catalogue's `institutional_development` and region decide the exact set (e.g. East Asian courts printing and the examination system, Iberians ocean ships under way, Timurid lands observatories), worked out as RSCH-076 states. [research-tree Rules, §7.3, §10, D-RSCH-11]

### 5.7 Reading research elsewhere
- RSCH-060: The event tree's `literacy` shall read scholars and schools per thousand people. [country-stats §11]
- RSCH-061: Research shall supply the inventions known, each with its era cost, to the realm's Technology score. [country-stats §12]

### 5.8 The full invention list

Each row is one config row. "Parent" R1–R4 means the bough. "Or parent" lists alternatives that can stand for the
parent. "Scope" applies the 16 Oct campaign span decision. Effect texts are the tree's; where another design gives the
effect in numbers (warfare §12, trade §11, exploration §4) that design owns the numbers; the rows carry trade v2's T-branch
effects (D-RSCH-4) and the edits of D-RSCH-5. Era VII rows are in play until 31 August 1939 with effects trimmed to what
they did by then; L23 and L24 are dropped (D-RSCH-1).

| Id | Name | Era | Bough | Parent | Or parent | Also needs | Unlocks | Start (who typically knows it in 1444) | Event tree ★ | Contact ⇄ | Scope |
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
- RSCH-069: L5, L14 and L21 shall each raise the discount per neighbour or trade partner by a fifth of the base (10 % → 12 % → 14 % → 16 %); the 60 % cap shall not change, and a neighbour of the same tongue family shall count once like any other. [D-RSCH-8]
- RSCH-070: With L18 each province without a school shall have 10 village-school seats, which cost no upkeep. School upkeep shall be a temple or monastery school 2 gold a year, a madrasa or university 4, an academy 6. [D-RSCH-9]
- RSCH-071: When a country occupies an enemy province with an open school, each of its current studies that the enemy knows shall gain 10 % of its cost before discounts, once per province per war. [D-RSCH-10]
- RSCH-072: When a battle is fought in a province with an open school, the school shall be sacked (lost) with a chance of 25 %; then half the province's scholars flee to the first peaceful neighbouring country in nation-index order, or are lost when none is at peace. [D-RSCH-10]
- RSCH-073: Each January, the richest neighbour with at least twice a country's gold shall poach 1 in 20 of its scholars. [D-RSCH-10]
- RSCH-074: L6 and L11 shall each give +10 % research, L20 +50 %, L3 +20 % toward Learning (L) and Sea (S) inventions; C1, L4 and L5 shall each make school upkeep 10 % lower. [D-RSCH-12]
- RSCH-075: Each January a country shall lose 1 in 30 of its scholars to old age, 1 in 60 once it knows L10. [D-RSCH-12]
- RSCH-076: A map nation shall start knowing the root, the four boughs, every invention whose start regions name a group the research data puts it in, the extra inventions the data lists for it (Ming and Korea: L5 printing), and everything those need; `institutional_development` is not used, and no study starts with progress. [D-RSCH-11]
- RSCH-077: F9 shall open for a country when exploration reports its Atlantic crossing; the countries of the Americas know it from the start. [D-RSCH-13]
- RSCH-078: The AI shall study the eligible invention that costs it least now, ties by id; it shall fill every empty seat while at peace and none while at war, and call students to arms only while at war with no recruits left. [D-RSCH-14]
- RSCH-079: Students shall be taken from recruits and graduates counted as scholars without a sex; whether a scholar named to a role is a woman shall be the realm's women-in-roles roll. [D-RSCH-15]
- RSCH-080: F16's harvest step shall last 30 years from the year it was learned and then end; F19 gives its own steps. [D-RSCH-16]
- RSCH-081: Without G4 only a new graduate may be made an official, and only of his school's types; with G4 a working scholar may be made an official of any type at any time. [D-RSCH-17]

## 6. Commands

| Command | Who issues it | Preconditions | Result | Events emitted |
|---|---|---|---|---|
| SetStudy(invention) | player / AI | Eligible (parent, or, also needs, contact, scope) | Becomes the current study | StudyChanged |
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
| StudyChanged | Command | country, invention(s) | AI, game-shell |
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
- A neighbour of the same tongue family counts once, like any other neighbour (D-RSCH-8: culture's request to count it double is not taken).

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
| research.era_cost | Scholar-years by era | I 20, II 40, III 80, IV 150, V 250, VI 400, VII 650, VIII 1000 | yes | research config |
| research.era_dates | Era start years | I 1444, II 1500, III 1600, IV 1700, V 1800, VI 1870, VII 1914 (cut 31 Aug 1939), VIII 1960 | no | research config |
| research.ahead_multiplier | Cost per era ahead | ×2 | yes | research config |
| research.spread_per_partner | Discount per neighbour or trade partner | 10 % | yes | research config |
| research.spread_cap | Maximum discount | 60 % | yes | research config |
| research.scholar_rate | Scholar-years per scholar per year | 1 | yes | research config |
| research.student_rate | Scholar-years per student per year | 0.2 | yes | research config |
| research.graduation_years | Years to graduate | 5 | yes | research config |
| research.studies_with_academy | Studies at once with academy-level school | 2 | yes | research config |
| research.school_seats | Seats per school type | temple/monastery 20, madrasa 30, university 60, academy 100 | yes | research config / buildings config |
| inventions[] | One row per invention: `id`, `parent`, `also_needs`, `era`, `unlocks`, `start_regions` | 174 rows (§5.8) | era costs placeholder | research tree config |
| dropped_inventions | Era VII inventions never studied | L23, L24 | no | research.json |
| research_months_per_year | Monthly steps a year's progress is split over | 12 | yes | research.json |
| second_study_share | Share of scholar-years each of two studies gets | 0.5 | yes | research.json |
| village_school_seats | Seats per province without a school, with L18 | 10 | yes | research.json |
| school_upkeep | Gold a year per school type | temple 2, madrasa 4, university 4, academy 6 | yes | research.json |
| steal_share_of_cost | Progress gained by occupying an enemy school | 10 % of cost | yes | research.json |
| sack_chance_pct, sack_scholars_flee_share | Sack chance and share of scholars who flee | 25 %, half | yes | research.json |
| poach_gold_ratio, poach_one_in | Gold ratio for poaching, share poached | 2×, 1 in 20 | yes | research.json |
| old_age_one_in | Scholars lost to old age a year | 1 in 30 (1 in 60 with L10) | yes | research.json |
| start_region_members, start_extra | Which map nations each start label covers; extra start inventions | table | yes | research.json |

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
| scenario-setup | upstream | Customer–Supplier | Map nations; research data maps each start label to nations (D-RSCH-11) |
| time-and-turns | upstream | Conformist | Current date for eras and studying ahead; campaign end 31 August 1939 |

## 12. AI

- An isolationist AI fills its schools and avoids war; a hegemon seeker keeps recruits for the army instead of students (country stats §11).
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
| RSCH-040 | invention-tree.feature | One root, four boughs, letters are only labels |
| RSCH-041 | invention-tree.feature | One root, four boughs, letters are only labels |
| RSCH-042 | invention-tree.feature | The tree holds 174 inventions |
| RSCH-042 | invention-tree.feature | Inventions unlock what their row says |
| RSCH-043 | invention-tree.feature | Event-tree inventions keep their ids |
| RSCH-044 | invention-tree.feature | A new invention is one config row |
| RSCH-045 | invention-tree.feature | Scope of eras |
| RSCH-050 | starting-knowledge.feature | Everyone knows the root and the boughs |
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
