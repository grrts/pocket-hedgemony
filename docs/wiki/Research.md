# Research

Research is how your country learns. You build schools, fill their seats with young men from the same recruit pool your army draws on, and after five years they graduate as scholars whose work, counted in scholar-years, unlocks new inventions. Every country climbs one shared invention tree that reaches back before 1444, through the Ancient and Medieval eras, and on to the radios and tanks of the 1930s. Not every country starts at the same place on it: some begin the game still missing the plough, the horse or iron, and have to catch up. And every seat you fill is a soldier you didn't raise.

## How it works

### Schools, students and scholars

**Schools** are town buildings with student seats. You get one by building it (gold up front), by a lord or the clergy founding one, or by conquering a town that has one. A school closes if its upkeep isn't paid, and schools are also lost when sacked in war or when a change of religion closes the other faith's schools.

The school types come from the invention tree:

| School | Seats | Unlocked by |
|---|---|---|
| Temple and monastery school | 20 | L1 *Temple and monastery schools* |
| Madrasa | 30 | L2 *Madrasa networks* |
| University | 60 | L7 *Universities* |
| Academy | 100 | L12 *Academies of science* |
| Village schools | every province gets seats | L18 *Mass literacy schooling* |

**Students.** You set how many seats to fill. Students are enrolled from recruits, local recruits filling local seats first, then the realm's. Students are lost by graduating, being called back into the army, famine and plague.

**Graduation.** After **5 years** a student graduates as a scholar, a year sooner where a Schoolmaster official runs the province. A graduate may instead become an **official** of the types his school trains:

| School | Graduates can become |
|---|---|
| Madrasa | Judges or chaplains |
| University | Judges or stewards |
| Academy | Masters of works or wardens |

With G4 *Examination system*, scholars can become officials directly. Official types are described on [Provinces](Provinces).

**Scholars** are gained by graduation, by hiring foreign scholars (gold), and by scholars fleeing war or persecution abroad to you. They are lost to old age, war in their town, persecution (they flee abroad) and being poached by a richer neighbour.

### Progress

Each year, every **scholar gives 1 scholar-year** and every **student 0.2** to your current study. When progress reaches the invention's cost, your country knows it, and the next invention in your **study queue** starts at once (see [What you see](#what-you-see)); you're asked to choose only when the queue is empty. A known invention is never lost. If your schools close, progress on the current study stops, but nothing already known is lost. A country can also gain an invention by stealing it in war.

You study **one invention at a time**, or **two** once you have an academy-level school (L12 *Academies of science*).

### Why war and research don't mix

- Every school seat filled takes one man from the recruit pool the army can raise.
- Schools cost gold every year, from the same treasury that pays soldiers.
- If you call students to arms, the schools empty back into recruits at once, research stops, and those students never become scholars.
- Fighting in a province with a school can sack it and scatter its scholars, who may flee to a peaceful neighbour.

### What an invention costs

Each invention costs scholar-years by its era:

| Era | Years | Cost in scholar-years |
|---|---|---|
| Ancient | before 600 | 10 |
| Medieval | 600 to 1443 | 15 |
| I | 1444 to 1500 | 20 |
| II | 1500 to 1600 | 40 |
| III | 1600 to 1700 | 80 |
| IV | 1700 to 1800 | 150 |
| V | 1800 to 1870 | 250 |
| VI | 1870 to 1914 | 400 |
| VII | 1914 to the end of the campaign (31 August 1939) | 650 |

- **Studying ahead**: an invention from an era later than the current date costs **double for each era ahead**.
- **Spread**: each neighbour or trade partner that already knows an invention makes it **10 % cheaper, up to 60 % off**. A trade partner is a country whose traders deposit or collect in your cities, or yours in theirs (see [Trade](Trade)).

So in 1460, an Era II invention costs 40 × 2 = 80 scholar-years; with three neighbours who know it, 30 % off brings it to 56.

Ancient and Medieval inventions are never ahead of their time, so they always cost 10 or 15, and the spread discount applies to them like any other: a country next to countries that know them catches up fastest. Ox plough with four neighbours who know it costs 10 − 40 % = 6 scholar-years.

### What you may study

You may study any invention whose **parent** you know plus everything listed under **also needs**. Where alternatives are given ("or"), either one is enough. **Contact inventions** open only after a contact event, for example the Atlantic crossing for maize and potatoes, and, for a country of the Americas, first contact with a country from across the ocean for F03 *Riding and pack animals* (see [Without it](#without-it)). Era VIII is out of the game, and Era VII only within the campaign, which ends 31 August 1939.

Some inventions change research itself: L5 *Printing* (inventions spread +20 %, schools cost less), C1 *Paper making* (schools cost less), L4 *Metal movable type* (students cost less), L6 *Humanist learning* and L11 *Experimental science* (scholars +research), L3 *Observatories* (+research for learning and sea inventions), L10 *Spectacles and telescopes* (scholars work into old age), L14 *Encyclopedias* (spread +20 %), L20 *Research laboratories* (research +50 %) and L21 *Radio* (faster spread of news and inventions).

### The tree

There is **one tree**, from the root **Settled life**, which everyone knows. It splits into four **branches** (called boughs before), which every country also knows at the start:

- **R1 Tilling and building**
- **R2 Fire and metal**
- **R3 Counting and records**
- **R4 Boats**

The tree reaches back before 1444 with two **past eras**, **Ancient** (before 600) and **Medieval** (600 to 1443), and then runs through Eras I to VII. Inventions grow era by era, and many need an invention from another branch. The letter in an invention's id only says what it is about (F food, C crafts and industry, T trade, S sea, W war, B building, G government, L learning); it is not a separate tree. Each invention is one config row (`id`, `parent`, `also_needs`, `era`, `unlocks`, `start_regions`), so new inventions such as Andean terrace farming, Ethiopian church schools or Javanese irrigation can be hung anywhere on the tree without code.

The tree holds **187 inventions**: 13 past inventions and 174 from 1444 on. Twenty of them keep ids the event tree uses (marked "event id" below) so events keep working; the event tree's technology and innovation stats read them from the tree. Where another system gives an invention's effect in numbers ([Warfare](Warfare), [Trade](Trade), [Exploration and Colonies](Exploration-and-Colonies)), that system owns the numbers. Nuclear physics and Rocketry are never studied, and the other Era VII inventions stay in play until August 1939 with what they did by then.

#### Before 1444: the past inventions

These 13 are what a country of 1444 may or may not already know. Most countries know them all; the ones that don't start the game behind (see [What each country knows in 1444](#what-each-country-knows-in-1444)). Several Era I inventions now grow from them, as the branch tables below show.

| Id | Invention | Era | Branch | Grows from | Opens | Without it |
|---|---|---|---|---|---|---|
| F01 | Ox plough | Ancient | Tilling and building | the branch | F02 Heavy plough | Farmland harvests one step worse |
| F02 | Heavy plough | Medieval | Tilling and building | F01 Ox plough | F1 Three-field rotation | — |
| F03 | Riding and pack animals | Ancient | Tilling and building | the branch | F11 Horse breeding studs, W1 Composite-bow horse archery, W2 Heavy armoured cavalry, T1 Caravanserai networks | No horse regiments and no camel caravans |
| B01 | Wheel and carts | Ancient | Tilling and building | the branch | F5 Water and wind mills, W4 Wagon fort | Armies carry half the food |
| B02 | Dressed stone | Ancient | Tilling and building | the branch | B1 Stone castles | — |
| C01 | Iron smelting | Ancient | Fire and metal | the branch | C02 Steel forging, C2 Blast furnace, W6 Pike squares | Regiments fight 20 % weaker |
| C02 | Steel forging | Medieval | Fire and metal | C01 Iron smelting | W2 Heavy armoured cavalry | — |
| C03 | Gunpowder | Medieval | Fire and metal | the branch | W3 Bombards | — |
| G01 | Writing | Ancient | Counting and records | the branch | G1 Written law codes, L1 Temple and monastery schools, L2 Madrasa networks, C1 Paper making, L01 Positional numbers | — |
| T01 | Coinage | Ancient | Counting and records | the branch | T2 Double-entry bookkeeping, T4 Paper money | — |
| L01 | Positional numbers | Medieval | Counting and records | G01 Writing | T2 Double-entry bookkeeping | — |
| S01 | Sail | Ancient | Boats | the branch | S1 Magnetic compass and sea charts, S2 Lateen and junk rigging, S02 Sternpost rudder, T5 Monsoon sailing calendars | — |
| S02 | Sternpost rudder | Medieval | Boats | S01 Sail | S4 Carrack and caravel | — |

#### Without it

Four past inventions hold a country below the 1444 baseline while it lacks them. Countries that know them play exactly as before; only the laggards change. All four numbers are placeholders for balancing.

- **Without F01 Ox plough**, your farmland harvests one step worse.
- **Without F03 Riding and pack animals**, you raise no horse regiments (light cavalry, horse archers, knights and lancers, camel riders) and send no camel caravans. For a country of the Americas, F03 can't even be studied until first contact with a country from across the ocean; in the game that happens when such a country comes to own land bordering yours.
- **Without B01 Wheel and carts**, your armies carry half the food.
- **Without C01 Iron smelting**, your regiments fight 20 % weaker.

The other nine past inventions only open later ones.

The "Known in 1444 by" column in the tables below is a history note on who knew each invention at the time. What your country actually starts with is set by its start group (see [What each country knows in 1444](#what-each-country-knows-in-1444)).

#### Tilling and building (R1)

| Id | Invention | Era | Grows from | Also needs | Unlocks | Known in 1444 by |
|---|---|---|---|---|---|---|
| B1 | Stone castles | I | B02 Dressed stone |  | Castles | Most settled realms |
| B5 | Bastion fortification (event id) | II | B1 Stone castles | W3 Bombards | Castles resist guns |  |
| B6 | Star forts | II | B5 Bastion fortification |  | Strong castles; sieges take far longer |  |
| B7 | Siege parallels | III | B6 Star forts |  | Attackers take castles faster |  |
| B2 | Roads and post stations | I | the branch |  | Grain and armies move faster; officials run +1 province close to the capital | Ming, Ottoman, Inca, Mali trade roads |
| B3 | Grand canals | I | B2 Roads and post stations |  | River-and-canal grain transport | China |
| B8 | Canal locks | III | B3 Grand canals |  | Canals across hills |  |
| W10 | Supply magazines | III | B2 Roads and post stations |  | Armies far from home don't starve |  |
| B9 | Turnpike roads | IV | B2 Roads and post stations |  | Faster grain and armies |  |
| B4 | Earthwork ring forts | I | the branch |  | Cheap forts | West Africa (e.g. Benin walls), Polynesia |
| F1 | Three-field rotation | I | F02 Heavy plough |  | +1 harvest step on farmland | Most of Europe |
| F7 | Ever-normal granaries | I | F1 Three-field rotation or F2 Wet-rice terracing |  | Granaries hold 50 % more and rot less | China, Korea |
| F12 | Fodder crops (clover, turnips) | III | F1 Three-field rotation |  | Horses eat half the grain; +1 harvest step |  |
| F13 | Selective livestock breeding | IV | F12 Fodder crops (clover, turnips) | F11 Horse breeding studs | Herds grow faster |  |
| F14 | Seed drill | IV | F12 Fodder crops (clover, turnips) |  | +1 harvest step |  |
| F15 | Four-field rotation | IV | F12 Fodder crops (clover, turnips) |  | No fallow year: +1 harvest step |  |
| F2 | Wet-rice terracing | I | the branch |  | Two harvests a year on irrigated rice land | East and Southeast Asia |
| F3 | Qanat and canal irrigation | I | the branch |  | Dry provinces harvest at normal | Iran, Central Asia, North Africa, Andes |
| F10 | Sugar and spice plantations | II | F3 Qanat and canal irrigation |  | New trade goods (event tree's harm rules apply: no forced labour bonus) |  |
| F4 | Fish salting and drying | I | the branch |  | Fish keeps for a year; coastal grain store +20 % | Coasts worldwide |
| F5 | Water and wind mills | I | the branch | B01 Wheel and carts | Grain into flour cheaply: +gold per farmland province | Europe, Middle East, China |
| F8 | Polder drainage | II | F5 Water and wind mills |  | Turn marsh provinces into farmland | Low Countries |
| F6 | Chinampa and raised fields | I | the branch |  | Marsh and lake provinces farm well | Mexico basin, Andes lakes |
| F11 | Horse breeding studs | II | F03 Riding and pack animals |  | +Horses per grassland province | Steppe, Arabia, Iberia |
| F9 | Maize, potato and cassava (contact) | II | the branch |  | A failed harvest becomes poor; more people per farmland | Americas |

#### Fire and metal (R2)

| Id | Invention | Era | Grows from | Also needs | Unlocks | Known in 1444 by |
|---|---|---|---|---|---|---|
| C1 | Paper making | I | the branch | G01 Writing | Schools cost less | Worldwide except Americas and Oceania |
| L4 | Metal movable type | I | C1 Paper making |  | Books spread: students cost less | Korea |
| L5 | Printing (event id) | I | C1 Paper making |  | Inventions spread +20 %; schools cost less |  |
| L6 | Humanist learning (event id) | I | L5 Printing or L2 Madrasa networks |  | Scholars +research |  |
| T4 | Paper money | I | C1 Paper making | T01 Coinage | Print gold (risk of price rises) | China (Ming notes, heavily devalued by 1444) |
| C2 | Blast furnace | I | C01 Iron smelting |  | +iron: guns and tools cheaper | China, parts of Europe |
| W3 | Bombards | I | C2 Blast furnace | C03 Gunpowder | Siege guns: castles fall faster | Ottoman, Western Europe, China |
| W5 | Gunpowder infantry (event id) | I | W3 Bombards |  | Hand-gun infantry | Ottoman, Ming, parts of Europe |
| W7 | Pike and shot | II | W5 Gunpowder infantry | W6 Pike squares | Mixed infantry: foot +strength |  |
| W11 | Flintlock and bayonet | III | W7 Pike and shot |  | Pikes obsolete; foot +strength |  |
| W9 | Volley fire drill | II | W5 Gunpowder infantry |  | Gun infantry +strength |  |
| W8 | Field artillery | II | W3 Bombards |  | Guns in battle |  |
| C10 | Gunpowder mills | II | C2 Blast furnace |  | Guns cost less to raise |  |
| S6 | Ship-mounted cannon | II | C10 Gunpowder mills | S4 Carrack and caravel | Warships with guns |  |
| S8 | Turtle and armoured ships | II | S6 Ship-mounted cannon |  | Coastal defence ships |  |
| C6 | Mining pumps and shafts | II | C2 Blast furnace |  | +output from mines; silver and gold mines | Central Europe |
| C7 | Mercury silver refining | II | C6 Mining pumps and shafts |  | Double silver from silver mines |  |
| C12 | Coke smelting | IV | C6 Mining pumps and shafts | C2 Blast furnace | Iron without forests |  |
| B10 | Iron bridges | IV | C12 Coke smelting |  | Cross rivers anywhere |  |
| C13 | Steam power (event id) | IV | C12 Coke smelting | L11 experimental_science | Pumps, then engines |  |
| C14 | Mechanized textiles (event id) | IV | C13 Steam power | C8 Putting-out workshops | Factories: big +gold in cloth provinces |  |
| C15 | Machine tools | V | C13 Steam power |  | Needed for rifles, reapers, engines |  |
| F17 | Mechanical reaper | V | C15 Machine tools | F14 Seed drill | Fewer farmers per harvest: more recruits |  |
| W16 | Rifled musket | V | C15 Machine tools |  | Foot +strength; more Fallen |  |
| W17 | Breech-loading rifle | V | W16 Rifled musket |  | Foot +strength |  |
| C18 | Bessemer steel | VI | C15 Machine tools | C12 Coke smelting | Cheap steel: guns, ships, rails |  |
| S14 | Ironclads | V | C18 Bessemer steel | S13 Steamships | Wooden fleets obsolete |  |
| B13 | Reinforced concrete | VI | C18 Bessemer steel |  | Strong forts, dams |  |
| B14 | Hydroelectric dams | VI | B13 Reinforced concrete | C19 electrification | Power and irrigation |  |
| C19 | Electrification (event id) | VI | C18 Bessemer steel | T14 telegraphy | Factories and towns +gold |  |
| L20 | Research laboratories | VI | C19 Electrification | L12 Academies of science | Research +50 % |  |
| L23 | Nuclear physics | VII (to 1939?) | L20 Research laboratories |  | Unlocks nuclear power and propulsion |  |
| L24 | Rocketry | VII (to 1939?) | L20 Research laboratories | C20 chemical_industry | Unlocks missiles and satellites |  |
| C21 | Assembly line | VII (to 1939?) | C19 Electrification |  | Factories double output |  |
| C22 | Motor and air transport (event id) | VII (to 1939?) | C21 Assembly line |  | Trucks, tractors, aircraft |  |
| B15 | Highways | VII (to 1939?) | C22 Motor and air transport | B13 Reinforced concrete | Trucks move everything |  |
| B16 | Airfields | VII (to 1939?) | C22 Motor and air transport |  | Air routes and air bases |  |
| F21 | Tractors | VII (to 1939?) | C22 Motor and air transport |  | Many fewer farmers: +recruits and +students |  |
| S18 | Aircraft carriers | VII (to 1939?) | C22 Motor and air transport | S16 Dreadnought battleships | Fleets strike from the air |  |
| W21 | Tanks | VII (to 1939?) | C22 Motor and air transport | W19 Machine gun | Break trench lines |  |
| W22 | Military aircraft | VII (to 1939?) | C22 Motor and air transport |  | Scout and bomb |  |
| L21 | Radio | VII (to 1939?) | C19 Electrification | L16 Electricity studies | Faster spread of news and inventions |  |
| S19 | Radar | VII (to 1939?) | L21 Radio | C19 electrification | Fleets see far |  |
| W23 | Field radio | VII (to 1939?) | L21 Radio |  | Armies coordinate |  |
| C20 | Chemical industry (event id) | VI | C18 Bessemer steel | L15 Chemistry | Fertilizer, dyes, explosives |  |
| F19 | Chemical fertilizer | VI | C20 Chemical industry |  | +2 harvest steps |  |
| F22 | Hybrid seeds | VII (to 1939?) | F19 Chemical fertilizer |  | +1 harvest step |  |
| S15 | Torpedo boats | VI | C20 Chemical industry | S14 Ironclads | Small navies threaten big ones |  |
| S17 | Submarines | VI | S15 Torpedo boats | C19 electrification | Blockade by stealth |  |
| W20 | Smokeless powder | VI | C20 Chemical industry |  | Guns +range |  |
| C23 | Plastics | VII (to 1939?) | C20 Chemical industry |  | +gold from industry |  |
| S16 | Dreadnought battleships | VI | C18 Bessemer steel | S14 Ironclads | Strongest warships |  |
| W19 | Machine gun | VI | C18 Bessemer steel | W17 Breech-loading rifle | Defence +strength; huge Fallen |  |
| C16 | Railways (event id) | V | C13 Steam power | C12 Coke smelting | Move grain and armies far faster |  |
| T14 | Telegraphy (event id) | V | C16 Railways | L16 Electricity studies | Instant prices; officials run +1 province |  |
| W18 | Railway mobilization | VI | C16 Railways | W15 Mass conscription | Whole army raised in weeks |  |
| S13 | Steamships | V | C13 Steam power | S10 Naval dockyards | Ships ignore wind; faster trade |  |
| F16 | Guano and imported fertilizer | V | S13 Steamships | F15 Four-field rotation | +1 harvest step for 30 years, then needs F19 |  |
| F20 | Refrigerated shipping | VI | S13 Steamships | F18 Canned food | Sell grain and meat overseas |  |
| W13 | Light field artillery | IV | C12 Coke smelting | W8 Field artillery | Guns move with the army |  |
| C17 | Gas lighting | V | C12 Coke smelting |  | Towns grow; schools work longer |  |
| C3 | Porcelain kilns | I | the branch |  | Porcelain trade good | China, Korea, Vietnam |
| C4 | Silk and cotton weaving | I | the branch |  | Cloth trade good | Asia, Middle East |
| C8 | Putting-out workshops | II | C4 Silk and cotton weaving |  | Cloth provinces +gold |  |
| C11 | Manufactories | III | C8 Putting-out workshops |  | A new building: +gold, needs officials |  |
| S10 | Naval dockyards | III | C11 Manufactories | S7 Galleon | Ships cheaper to build and keep |  |
| S12 | Copper sheathing | IV | S10 Naval dockyards |  | Ships rot slower |  |
| C5 | Glass and lenses | I | the branch |  | Needed for spectacles and telescopes | Venice, Middle East |
| C9 | Clockmaking | II | C5 Glass and lenses |  | Needed for chronometer |  |
| S11 | Marine chronometer | IV | C9 Clockmaking | S5 ocean_navigation | Fewer ships lost on long voyages |  |
| L10 | Spectacles and telescopes | II | C5 Glass and lenses |  | Scholars work into old age |  |
| W1 | Composite-bow horse archery | I | the branch | F03 Riding and pack animals | Strong horse archers | Steppe, Iran, Ottoman, North India |
| W2 | Heavy armoured cavalry | I | C02 Steel forging | F03 Riding and pack animals | Knights and lancers | Europe, India, Middle East |
| W4 | Wagon fort | I | the branch | B01 Wheel and carts | Defensive wagons and hand guns | Bohemia, Hungary, Muscovy, Ming |
| W6 | Pike squares | I | the branch | C01 Iron smelting | Foot that stops horse | Swiss, Scots |

#### Counting and records (R3)

| Id | Invention | Era | Grows from | Also needs | Unlocks | Known in 1444 by |
|---|---|---|---|---|---|---|
| G1 | Written law codes | I | G01 Writing |  | One official runs 1 province | Most states |
| G3 | Tax registers | I | G1 Written law codes |  | Royal provinces pay +10 % | Ming, Ottoman, Venice |
| G7 | Venal offices | II | G3 Tax registers |  | Sell offices for gold (officials worse) |  |
| G9 | Professional bureaucracy | III | G3 Tax registers |  | Officials cost less; each runs 2 provinces |  |
| G10 | Census | III | G9 Professional bureaucracy |  | Recruits and taxes counted correctly: +10 % |  |
| G12 | Statistical bureau | IV | G10 Census |  | See every province's harvest early |  |
| G18 | Planned economy | VII (to 1939?) | G12 Statistical bureau |  | Factories directed by the state |  |
| G11 | Postal service | III | G9 Professional bureaucracy | B2 Roads and post stations | Officials run +1 province further from the capital |  |
| W12 | Standing regiments | III | G9 Professional bureaucracy |  | Soldiers who stay: no losses from disbanding |  |
| W14 | Army divisions | IV | W12 Standing regiments |  | Armies split and join faster |  |
| W15 | Mass conscription | V | W14 Army divisions | G10 Census | +recruits from all provinces |  |
| G13 | Rational legal codes | IV | G9 Professional bureaucracy | L6 humanist_learning | Lords' trials cause less anger |  |
| G14 | Written constitution | IV | G13 Rational legal codes |  | New government forms |  |
| G4 | Examination system | I | G1 Written law codes | C1 Paper making | Scholars can become officials directly | China, Korea, Vietnam |
| G5 | Royal chancery | I | G1 Written law codes |  | Envoys +1 | Many monarchies |
| G8 | Resident ambassadors | II | G5 Royal chancery |  | Envoys +1; see others' armies | Italian states |
| G2 | Feudal grants | I | the branch |  | Create lords by granting fiefs | Europe, Japan, India |
| G6 | Quipu and knot records | I | the branch |  | Tax registers without writing | Inca |
| L1 | Temple and monastery schools | I | G01 Writing or G6 Quipu and knot records |  | School type with 20 seats | Most settled realms |
| L7 | Universities | II | L1 Temple and monastery schools or L2 Madrasa networks, L5 printing |  | School type with 60 seats |  |
| L8 | Anatomy | II | L7 Universities |  | Fewer Fallen from wounds |  |
| L11 | Experimental science (event id) | III | L7 Universities | L10 Spectacles and telescopes | Scholars +research; unlocks steam and chemistry |  |
| L12 | Academies of science | III | L11 Experimental science |  | School type with 100 seats; study two inventions at once |  |
| L14 | Encyclopedias | IV | L12 Academies of science | L5 printing | Inventions spread +20 % |  |
| L18 | Mass literacy schooling (event id) | V | L14 Encyclopedias | G10 Census | Village schools: every province gets seats |  |
| G16 | Civil service exams | V | L18 Mass literacy schooling | G9 Professional bureaucracy | Officials run 3 provinces |  |
| L13 | Microscope | III | L11 Experimental science | L10 Spectacles and telescopes | Needed for germ theory |  |
| L17 | Vaccination and sanitation (event id) | V | L13 Microscope | L9 Variolation | Plague and smallpox deaths fall |  |
| L19 | Germ theory and antiseptics | VI | L17 Vaccination and sanitation | L13 Microscope | Far fewer Fallen from disease |  |
| L22 | Antibiotics | VII (to 1939?) | L19 Germ theory and antiseptics | C20 chemical_industry | Few deaths from infection |  |
| L15 | Chemistry | IV | L11 Experimental science |  | Needed for chemical industry |  |
| L16 | Electricity studies | IV | L11 Experimental science |  | Needed for telegraphy |  |
| B11 | Sewers and clean water | V | L11 Experimental science | B8 Canal locks | Fewer plague deaths in towns |  |
| B12 | Tenements and city planning | V | B11 Sewers and clean water |  | Towns hold more people |  |
| F18 | Canned food | V | L11 Experimental science | F4 Fish salting and drying | Armies carry 6 months of food |  |
| L2 | Madrasa networks | I | G01 Writing |  | School type with 30 seats | Islamic world |
| L3 | Observatories | I | L2 Madrasa networks |  | +research for Learning and Sea inventions | Timurid Samarkand, Ming, Maragha tradition |
| T1 | Caravanserai networks | I | the branch | F03 Riding and pack animals | Caravans lose less on long routes | Middle East, Central Asia, Sahel |
| T2 | Double-entry bookkeeping | I | T01 Coinage | L01 Positional numbers | Merchants earn +10 % | Italian cities |
| T3 | Bills of exchange | I | T2 Double-entry bookkeeping |  | Move gold without carrying it; loans cheaper | Italy, Low Countries, Hanse |
| T6 | Merchant fairs and exchanges | II | T3 Bills of exchange |  | +1 merchant slot |  |
| T8 | Licensed trading companies | II | T6 Merchant fairs and exchanges | S5 ocean_navigation | Trading posts overseas; +1 colonial governor slot |  |
| T7 | Deposit banks | II | T3 Bills of exchange |  | Debt interest −20 % |  |
| T10 | Public debt markets (event id) | III | T7 Deposit banks |  | Borrow much more at lower interest |  |
| T12 | Central bank | IV | T10 Public debt markets |  | Debt interest −30 %; default is rarer |  |
| T13 | Commodity exchanges | IV | T12 Central bank | T6 Merchant fairs and exchanges | See and trade grain prices across markets |  |
| G15 | Income tax | V | T12 Central bank | G10 Census | Tax from towns and industry |  |
| G17 | Social insurance | VI | G15 Income tax |  | Fewer revolts in towns |  |
| G19 | Welfare state | VII (to 1939?) | G17 Social insurance |  | Famines and revolts rare |  |
| T16 | Postal savings and mass banking | VI | T12 Central bank |  | +gold from people |  |
| T9 | Joint stock finance (event id) | III | T7 Deposit banks | T8 Licensed trading companies | Companies that fund fleets and colonies; +1 colonial governor slot |  |
| T11 | Marine insurance | III | T9 Joint stock finance |  | Ships lost cost less |  |
| T15 | Limited-liability companies | V | T9 Joint stock finance |  | Industry grows faster |  |
| T5 | Monsoon sailing calendars | I | the branch | S01 Sail | Indian Ocean trade ships safer | Swahili coast, Gujarat, Arabia, Malay world |
| L9 | Variolation | II | the branch |  | Fewer smallpox deaths | China, Ottoman, West Africa, India |

#### Boats (R4)

| Id | Invention | Era | Grows from | Also needs | Unlocks | Known in 1444 by |
|---|---|---|---|---|---|---|
| S1 | Magnetic compass and sea charts | I | S01 Sail |  | Ships may leave the coast | Mediterranean, China, Indian Ocean |
| S4 | Carrack and caravel | I | S1 Magnetic compass and sea charts | S2 Lateen and junk rigging, S02 Sternpost rudder | Ocean-going ships | Portugal, Castile, Genoa, Venice |
| S5 | Ocean navigation (event id) | II | S4 Carrack and caravel |  | Cross oceans; opens colonies with 2 colonial governor slots  |  |
| S7 | Galleon | II | S5 Ocean navigation | S6 Ship-mounted cannon | Strong trade and war ships |  |
| S9 | Line-of-battle tactics | III | S7 Galleon |  | Warships +strength in fleets |  |
| S2 | Lateen and junk rigging | I | S01 Sail |  | Better trade ships | Mediterranean, Indian Ocean, China |
| S3 | Outrigger voyaging | I | the branch |  | Long canoe voyages between islands | Pacific, Malay world |


#### Out of the game: Era VIII

These 12 Era VIII inventions are in the tree's data but never studied: L25 Computing, C24 Automation, B17 Prefab housing, G20 Digital government, S21 Satellite navigation, T18 Electronic banking, T19 Internet, W24 Guided missiles, F23 Green revolution agriculture, F24 Drip irrigation, S20 Nuclear propulsion, T17 Container shipping.

### What each country knows in 1444

Every one of the 137 nations on the map belongs to exactly one of **20 start groups**. A country starts knowing the root, the four branches, its group's past inventions and its group's Era I and II inventions, plus a few additions or minus a few removals of its own. Nothing else is known, and no study is under way on the first turn.

| Start group | For example | Past inventions known (of 13) | Era I and II inventions known | Standing in 1444 |
|---|---|---|---|---|
| Latin Christendom | England, France, Castile, Venice, Austria, Poland (45 realms) | all 13 | B1, F1, F4, F5, C1, C2, W2, W3, G1, G2, G5, L1, S1 | Era I |
| Orthodox Europe | Byzantium, Muscovy, Novgorod, Serbia, Georgia (13) | all but L01 | B1, F1, F4, F5, C1, C2, W2, G1, G2, G5, L1 | Era I |
| Islamic heartlands | Ottomans, Mamluks, Timurids, Granada, Morocco (16) | all but F02 | B1, C1, C2, C4, F3, F4, F5, G1, G5, L1, L2, T1, W1, W2 | Era I |
| Settled khanates | Kazan, Crimea, Uzbek Khanate | F01, F03, B01, B02, C01, G01, T01 | B1, C1, G1, L1, L2, T1, W1, F11 | Ancient |
| Steppe hordes | Great Horde, Nogai, Oirat, Mongols, Jurchens (6) | F03, B01, C01, G01 | G1, W1, F11 | Ancient |
| Himalaya | Tibet | F01, F03, B01, B02, C01, G01, T01 | B1, C1, G1, G5, L1 | Ancient |
| South Asia | Delhi, Bengal, Bahmanis, Vijayanagar, Gujarat (14) | all but F02 | B1, C1, C2, C4, F4, F5, G1, G2, G5, L1, W1, W2, L9 | Era I |
| China | Ming | all 13 | B1, B2, B3, C1, C2, C3, C4, F2, F4, F5, F7, G1, G3, G4, L1, L2, L3, L5, T4, W3, W4, W5, S1, S2, L9 | Era I |
| Korea | Korea | all 13 | B1, C1, C2, C3, F2, F4, F5, F7, G1, G3, G4, G5, L1, L4, L5, S1, S2, W3 | Era I |
| Japan | Japan | all but F02, C03 | B1, C1, C2, C4, F2, F4, F5, G1, G2, G5, L1, S1, S2, W2 | Era I |
| Mainland Southeast Asia | Dai Viet, Ayutthaya, Khmer, Ava, Pegu (8) | all but F02, L01, S02 | B1, C1, C2, C4, F2, F4, G1, G5, L1 | Medieval or Era I, by realm |
| Maritime Southeast Asia | Majapahit, Malacca, Brunei | all but F02, L01, S02 | C1, C4, F2, F4, G1, G5, L1, S2, S3, T5 | Era I |
| Christian Horn | Ethiopia | F01, F03, B02, C01, G01 | B1, C1, G1, G5, L1 | Ancient |
| Swahili and Somali coast | Adal, Ajuran, Kilwa | F03, B02, C01, G01, T01, S01 | C1, F4, G1, L1, L2, S2, T5 | Ancient |
| Sahel empires | Mali, Songhai, Jolof, Kano, Kanem-Bornu | F03, C01, G01 | B4, C1, F4, G1, L1, L2, T1, L9 | Ancient |
| Volta kingdoms | Mossi | F03, C01 | B4 | Ancient |
| Forest and plateau Africa | Benin, Kongo, Mutapa | C01 | B4, F4 | Ancient |
| Mesoamerica | Aztecs, Zapotec, Maya, Purépecha | B02, G01 | F4, G1, L1, F9 | Ancient |
| Andes | Inca, Chimú, Muisca | B02, S01 | F3, F4, G6, F9 | Ancient |
| North American peoples | Iroquois, Huron, Cherokee, Creek, Pueblo | none | F4, F9 | Ancient |

On top of its group, a country may know a few more inventions or a few fewer. For example, Venice also knows Double-entry bookkeeping, Bills of exchange, Glass and lenses, Tax registers and Lateen and junk rigging; Portugal and Castile have the Carrack and caravel; the Ottomans also know roads, tax registers, the compass and rigging, bombards, gunpowder infantry, glass and variolation; the Inca also know stone castles, roads, raised fields and temple schools; Scotland and Switzerland know Pike squares; Muisca lack Dressed stone and Sail, and the Purépecha lack Writing, Written law codes and Temple and monastery schools.

A start set is always **complete**: every invention in it has its parent (or one of its alternatives) and everything it also needs in the same set, and the game's data check refuses a set that isn't.

So in 1444 the Latin, Orthodox, Islamic, South Asian and East Asian countries stand in Era I with 23 to 38 inventions, maritime Southeast Asia in Era I with 21, and mainland Southeast Asia is split between Medieval and Era I. The khanates, hordes, Tibet, Ethiopia, the Swahili coast and the Sahel stand in Ancient with 7 to 15. Forest Africa stands in Ancient with 3 or 4 (iron but no horses), and Mesoamerica, the Andes and North America in Ancient with 2 to 10, without iron or horses. No African country south of the Sahara starts with B1 *Stone castles*: they defend with B4 earthworks until they learn dressed stone.

**Standing.** Your standing is the latest era, from Ancient on, of which you know at least a quarter of the inventions, and a quarter of every earlier era's too. Ancient is the floor: no country stands lower. If your standing is earlier than the era of today's date, you are **behind the times** by the eras in between: a country standing in Ancient in 1444 is behind the times by 2 eras. Standing changes nothing by itself; it tells you, and the AI, how far behind a country is.

See [The 1444 Start](The-1444-Start).

### Research elsewhere

- The event tree's literacy stat reads your scholars and schools per thousand people.
- Your inventions known, each weighted by its era cost, make up the **Technology** win score on [Your Realm](Your-Realm).

### Each month

A turn is one week. These steps run once a month, in the turn in which a new month begins.

| Cadence | What happens |
|---|---|
| Monthly | Progress from scholars and students is added; if it reaches the cost, the invention is learned and the next queued study starts (you choose only when the queue is empty) |
| Yearly | Student cohorts age and 5-year cohorts graduate; scholars age; spread discounts are worked out again with trade partners |
| At each era boundary | The cost of studying ahead changes |

Progress moves every month by a twelfth of the yearly rate, and an invention is known in the month it is paid for. With two studies, each gets half.

### The AI

An isolationist AI fills its schools and avoids war; a hegemon seeker keeps its recruits for the army instead of students. Every AI country studies the invention it can study that costs it least right now (ties go by id), fills every empty seat while at peace and none at war, and calls its students to arms only when it is at war with no recruits left. A country behind the times therefore studies its missing past inventions first, since they cost least. The AI picks one study at a time and keeps no queue.

## What you see

Everything about research and schools is in one place: the **Research** tab of your country card (called Learning before; tap your realm's name or flag, then Research). Studying all happens on one screen: the queue, the tree and the invention you've picked sit together. **Schools** is one button in the tab's header.

- **The overview.** At the top: your scholars, students, scholar-years a year, how many of the tree's inventions you know, and the era with your standing: "Era I · abreast of the times", or "Ancient · behind the times by 2 eras · 9 past inventions to catch up". Tap the catch-up line to open the tree at the first one. When nothing is studied, the card says so in red.
- **The queue strip.** Along the top: your current study (two with an academy) with its progress bar and the time left, then up to **5** queued inventions in order, each a chip with its time. Tap a chip to show it in the tree; drag it, or use its **◀** and **▶** buttons, to change the order; **✕** takes it out. When a study is learned, the first queued invention whose needs you now know starts at once, with nothing lost. A queued invention whose needs aren't met when its turn comes is skipped, stays in the queue and is marked waiting.
- **The tree.** The whole tree as one picture: the root *Settled life* at the left, then a column for each era (**Ancient**, **Medieval**, **I** to **VII**), with the era headings pinned along the top and today's era marked **Now**. The four branches are four bands across the picture, each with its name pinned at the left edge. Lines run from each invention to the ones that grow from it, across bands too; the "also needs" lines are drawn only for the invention you've picked, highlighted. Each invention reads as known (✓), being studied, can be studied (◆) or locked. Queued inventions carry their place number (1 to 5), and when you pick an invention whose needs you don't know yet, the path to it is highlighted, so you see in the tree what the queue would study. Drag inside the frame to move around.
  - **Close up** shows named inventions; **Whole tree** fits the full tree in the frame, each invention a dot in its state's colour, so you see at a glance how far each branch reaches. Switch with the **Whole tree / Close up** button or by pinching inside the frame; tap a place in the Whole tree to go Close up there.
  - Above the tree, chips jump to what matters and open its sheet: **My study**, **Can study ◆ n** (each tap goes to the next one) and, while you lack any past invention, **Catch up n** (each tap goes to the next past invention you can study).
- **The sheet.** The invention you've picked (or, with nothing picked, your current study): what it does, what it grows from and what it also needs (each marked ✓ or ✗; tap one to jump to it), its cost in scholar-years, about how long it takes at your pace, how many neighbours already know it (each makes it cheaper) and whether it is ahead of its time. A past invention's sheet also says what it opens and what you lack without it. The sheet has one action that fits:
  - **Study now** when nothing is being studied;
  - **Add to queue** when you know its needs, or they are queued ahead of it;
  - **Queue the path** when you don't: it lists the missing steps in an order you can study them, then the invention, with the total scholar-years and time, before you tap. If the path would make the queue longer than 5, the sheet says so and queues none of it.

  A known invention has no action. Study now never drops progress; to replace a study under way, the sheet offers **Switch to this study** and says how many scholar-years you would lose.
- **Schools.** Your students: the **−5** and **+5** buttons set how many seats to fill. Each student is a man the army can't raise: more students fill from your recruit pools at once, fewer go back to them. **In need of soldiers?** folds out **Call students to arms**, which empties every school back into recruits at once; research stops until you fill seats again, and those students never become scholars. Then each school, where it is (tap to see the province) and its students, schools being founded with the months until they open, and their upkeep a year, also shown as the **Schools** line of the Treasury. **Found a school** opens the list of your towns without a school: a temple school costs 60 gold and opens after 12 months (a madrasa, with 30 seats, if you know Madrasa networks). You need Temple and monastery schools or Madrasa networks.

**On a phone.** Where the tab is at least 500 points wide (Wide), the sheet stands beside the tree and the branch names sit in a pinned column. On a narrower screen (Tall), the queue strip, the tree and the sheet stack: the strip scrolls sideways inside itself, the branch names shrink to a coloured strip with the branch's first letter, and the sheet slides up from the bottom when you pick something and closes with its own **✕**. Everything stays inside the safe areas, every chip, node and button is at least 44 points, nothing needs hover, and the page never scrolls sideways.

Elsewhere:

- The **General** tab of your country card has a **Research** line, "Studying Three-field rotation · 40 % · scholars 6", that opens the tab.
- Another country's card shows its standing, how many inventions it knows and what it studies, and how many inventions it knows that you don't: those are the ones it makes cheaper for you as a neighbour or trade partner.
- The nation picker at the start of a campaign shows each country's standing next to its name ("Starts in Ancient", "Starts in Era I"), so you know a country starts behind before you choose it.
- When you learn an invention and your queue is empty, an alert says "Learned X. Choose the next study." with **Open**. While nothing is studied, one alert asks you to choose. With something queued, the next study simply starts.
- A commander's **Train** list offers only the troop types your realm knows; the rest are named with a button to the Research tab (pikes need Pike squares, knights Heavy armoured cavalry).

### In the game now

Research plays one study at a time, with a queue of up to 5 behind it. Every country starts with a school in its capital (a madrasa where it knows Madrasa networks, else a temple school), half its seats filled and a few scholars, so research moves from the first month. The tree reaches back to the Ancient and Medieval eras, every country starts from its start group, and the four penalties for lacking a past invention are in: worse harvests without the Ox plough, no horse regiments or camel caravans without Riding and pack animals, half the food carried without Wheel and carts, weaker regiments without Iron smelting. Inventions already change harvests (Three-field rotation and later farming inventions make each harvest a band better), which troop types can be trained, and the troop cap (Standing regiments, Mass conscription, Railway mobilization). Castles and roads follow with buildings. Not yet in the game: the academy's second study, stealing and sacking in war, poaching, foreign scholars and the Atlantic crossing for maize and potatoes; the other effects are shown as text.

## How it connects

- [Your Realm](Your-Realm): gold for school upkeep, the recruit pool for students, war and peace; research returns inventions for the Technology score.
- [Provinces](Provinces): schools, students and scholars per province, the Schoolmaster, graduates as officials; research sends unlocks for buildings, tile changes, harvest steps, roads and castles.
- [Buildings](Buildings): school buildings and their steps; new buildings hang on invention ids.
- [Trade](Trade): trade partners for spread; trade rewrites the T-branch effects.
- [Warfare](Warfare): W, B and S inventions and their numbers; war sacks schools; stealing inventions; without Iron smelting regiments fight weaker, without Riding and pack animals no horse regiments.
- [Recruiting](Recruiting): W12, W15 and W18 recruiting effects.
- [Exploration and Colonies](Exploration-and-Colonies): S4, S5, T8 and T9 colonial governor slots; contact events open contact inventions.
- [Naval](Naval): sea inventions and ship types.
- [Troop Movement](Troop-Movement): B2, B9 and railways as road factors; without Wheel and carts armies carry half the food.
- [Diplomacy](Diplomacy): G5 and G8 envoys.
- [Government](Government): G9, G14 and other inventions as reform requirements.
- [Culture](Culture): same-family neighbours count double toward the spread cap (asked, not adopted).
- [Religion](Religion): a change of faith closes the other faith's schools.
- [National Strengths](National-Strengths): levers on invention cost and inventions known.
- [Historical Events](Historical-Events): event ids for technology and innovation, literacy, contact events.
- [The 1444 Start](The-1444-Start): start inventions per country.
- [Time and Turns](Time-and-Turns): the date for eras and studying ahead; the campaign end.

## Numbers

All research numbers except the era dates are placeholders. The design names no config file, so key names other than the invention row fields are the spec's proposals.

| Value | Config key | Design value | Provisional? |
|---|---|---|---|
| Cost by era | `research.era_cost` | Ancient 10, Medieval 15, I 20, II 40, III 80, IV 150, V 250, VI 400, VII 650 (VIII 1000) | Yes |
| Era dates | `research.era_dates` | Ancient before 600, Medieval 600, 1444, 1500, 1600, 1700, 1800, 1870, 1914 (cut 31 August 1939) | No |
| Studying ahead | `research.ahead_multiplier` | ×2 per era | Yes |
| Spread per neighbour or partner | `research.spread_per_partner` | 10 % | Yes |
| Spread cap | `research.spread_cap` | 60 % | Yes |
| Scholar rate | `research.scholar_rate` | 1 scholar-year a year | Yes |
| Student rate | `research.student_rate` | 0.2 scholar-years a year | Yes |
| Years to graduate | `research.graduation_years` | 5 | Yes |
| Studies with an academy | `research.studies_with_academy` | 2 | Yes |
| Seats per school | `research.school_seats` | 20 / 30 / 60 / 100 | Yes |
| The tree | `inventions[]` | 187 rows (13 past, 174 from 1444) | Era costs are placeholders |
| Study queue | `research.queue_length` | 5 inventions after the current study | Yes |
| Standing share | `research.standing_share` | 25 % of an era's inventions (and of every earlier era's) | Yes |
| Without a past invention | `research.without` | F01 −1 harvest step; F03 no horse regiments and no camel caravans; B01 half the food carried; C01 regiments −20 % strength | Yes |
| Start groups | `research.start_groups` | 20 groups, each with its realms, past inventions and Era I and II inventions | Yes |
| Per-realm start changes | `research.start_add`, `research.start_remove` | Inventions added to or removed from a realm's group set | Yes |

## Decided since the first draft

- Research moves monthly; two studies split it evenly, and one academy anywhere is enough for both.
- Ironclads grow from Steamships.
- The trade inventions take the trade design's effects; T8 and T9 also give a colonial governor slot.
- L18 gives 10 village-school seats in each province without a school. Schools cost 2, 4 or 6 gold a year by step.
- Occupying an enemy province with an open school steals 10 % of a study the enemy knows. A battle there sacks the school with a 25 % chance, and half its scholars flee.
- Spread inventions raise the discount per neighbour from 10 % to 12 %, 14 % and 16 %, still capped at 60 %.
- Starting inventions first came from region labels (Ming and Korea also starting with printing); since 18 October they come from start groups (below).
- Every country starts with one school in its capital, half full, and 5 scholars (2 where it knows no school type).
- The AI studies the cheapest invention open to it, fills its seats in peace and empties them only at war with no recruits left.
- Guano's harvest bonus lasts 30 years, then ends.
- With the Examination system, any working scholar can be made an official of any kind.
- **One tree reaching back before 1444** (18 October): the tree is drawn as one picture with the branches as bands and a Whole tree zoom, never one branch at a time. Two eras before 1444, Ancient and Medieval, add 13 past inventions that Era I inventions now need. A country that lacks one plays below the 1444 baseline, so countries that know them play exactly as before and only the laggards change.
- **Start groups** (18 October): starting by region labels gave thin, uneven sets (France knew 12 inventions, Kongo knew stone castles), so every nation now belongs to one of 20 start groups with complete sets, plus its own additions and removals, and its standing names how far behind it starts. Penalties, costs and the standing share are placeholders; the Hordes, African start and tribal designs may tune their groups.
- **A study queue on one screen** (18 October): the tab split the tree from the action, and each invention ended in an alert and a fresh choice. Now one screen holds the queue strip, the tree and the picked invention's sheet; a queue of 5 carries on by itself, and Queue the path gets every step to a far invention in one tap. The AI still chooses one study at a time.

## Still open

Nothing. Every question about research has been decided; numbers marked as placeholders are tuned during balancing.


## For developers

- Spec: [`domain/research/spec.md`](https://github.com/grrts/pocket-hedgemony/blob/claude/domain-specs-bdd-ebdpmx/domain/research/spec.md), requirement code **RSCH** (RSCH-001 to RSCH-111, with the full invention list in section 5.8, the past eras in 5.10, the one screen and the queue in 5.10a and the start groups in 5.11; how the player uses it is RSCH-084 to RSCH-090, RSCH-100 to RSCH-106 and RSCH-107 to RSCH-111; decisions D-RSCH-21 and D-RSCH-22).
- Features: `domain/research/features/` (schools-and-students, research-progress, war-and-research, cost-and-eligibility, invention-tree, starting-knowledge, research-readers, past-eras, start-groups, study-queue).
- Code: rules code for this context goes in `packages/engine/src/domain/research/`, balance numbers and the tree in `packages/rules/data/domain/research.json`. The turn's wiring is `packages/engine/src/research.ts` (`knows(world, n, id)` for other systems), the Research tab `apps/client/src/ui/learning.ts`.
