# Research

Research is how your country learns. You build schools, fill their seats with young men from the same recruit pool your army draws on, and after five years they graduate as scholars whose work, counted in scholar-years, unlocks new inventions. Every country climbs one shared invention tree that grows from a single root in 1444 to the radios and tanks of the 1930s, and every seat you fill is a soldier you didn't raise.

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

Each year, every **scholar gives 1 scholar-year** and every **student 0.2** to your current study. When progress reaches the invention's cost, your country knows it, and you choose the next study. A known invention is never lost. If your schools close, progress on the current study stops, but nothing already known is lost. A country can also gain an invention by stealing it in war.

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

### What you may study

You may study any invention whose **parent** you know plus everything listed under **also needs**. Where alternatives are given ("or"), either one is enough. **Contact inventions** open only after a contact event, for example the Atlantic crossing for maize and potatoes. Era VIII is out of the game, and Era VII only within the campaign, which ends 31 August 1939.

Some inventions change research itself: L5 *Printing* (inventions spread +20 %, schools cost less), C1 *Paper making* (schools cost less), L4 *Metal movable type* (students cost less), L6 *Humanist learning* and L11 *Experimental science* (scholars +research), L3 *Observatories* (+research for learning and sea inventions), L10 *Spectacles and telescopes* (scholars work into old age), L14 *Encyclopedias* (spread +20 %), L20 *Research laboratories* (research +50 %) and L21 *Radio* (faster spread of news and inventions).

### The tree

There is **one tree**, from the root **Settled life**, which everyone knows. It splits into four **boughs**, which every country also knows at the start:

- **R1 Tilling and building**
- **R2 Fire and metal**
- **R3 Counting and records**
- **R4 Boats**

Inventions branch era by era, and many need an invention from another bough. The letter in an invention's id only says what it is about (F food, C crafts and industry, T trade, S sea, W war, B building, G government, L learning); it is not a separate tree. Each invention is one config row (`id`, `parent`, `also_needs`, `era`, `unlocks`, `start_regions`), so new inventions such as Andean terrace farming, Ethiopian church schools or Javanese irrigation can be hung on any branch without code.

The tree holds **174 inventions**. Twenty of them keep ids the event tree uses (marked "event id" below) so events keep working; the event tree's technology and innovation stats read them from the tree. Where another system gives an invention's effect in numbers ([Warfare](Warfare), [Trade](Trade), [Exploration and Colonies](Exploration-and-Colonies)), that system owns the numbers. Nuclear physics and Rocketry are never studied, and the other Era VII inventions stay in play until August 1939 with what they did by then.

#### Tilling and building (R1)

| Id | Invention | Era | Grows from | Also needs | Unlocks | Known in 1444 by |
|---|---|---|---|---|---|---|
| B1 | Stone castles | I | the bough |  | Castles | Most settled realms |
| B5 | Bastion fortification (event id) | II | B1 Stone castles | W3 Bombards | Castles resist guns |  |
| B6 | Star forts | II | B5 Bastion fortification |  | Strong castles; sieges take far longer |  |
| B7 | Siege parallels | III | B6 Star forts |  | Attackers take castles faster |  |
| B2 | Roads and post stations | I | the bough |  | Grain and armies move faster; officials run +1 province close to the capital | Ming, Ottoman, Inca, Mali trade roads |
| B3 | Grand canals | I | B2 Roads and post stations |  | River-and-canal grain transport | China |
| B8 | Canal locks | III | B3 Grand canals |  | Canals across hills |  |
| W10 | Supply magazines | III | B2 Roads and post stations |  | Armies far from home don't starve |  |
| B9 | Turnpike roads | IV | B2 Roads and post stations |  | Faster grain and armies |  |
| B4 | Earthwork ring forts | I | the bough |  | Cheap forts | West Africa (e.g. Benin walls), Polynesia |
| F1 | Three-field rotation | I | the bough |  | +1 harvest step on farmland | Most of Europe |
| F7 | Ever-normal granaries | I | F1 Three-field rotation or F2 Wet-rice terracing |  | Granaries hold 50 % more and rot less | China, Korea |
| F12 | Fodder crops (clover, turnips) | III | F1 Three-field rotation |  | Horses eat half the grain; +1 harvest step |  |
| F13 | Selective livestock breeding | IV | F12 Fodder crops (clover, turnips) | F11 Horse breeding studs | Herds grow faster |  |
| F14 | Seed drill | IV | F12 Fodder crops (clover, turnips) |  | +1 harvest step |  |
| F15 | Four-field rotation | IV | F12 Fodder crops (clover, turnips) |  | No fallow year: +1 harvest step |  |
| F2 | Wet-rice terracing | I | the bough |  | Two harvests a year on irrigated rice land | East and Southeast Asia |
| F3 | Qanat and canal irrigation | I | the bough |  | Dry provinces harvest at normal | Iran, Central Asia, North Africa, Andes |
| F10 | Sugar and spice plantations | II | F3 Qanat and canal irrigation |  | New trade goods (event tree's harm rules apply: no forced labour bonus) |  |
| F4 | Fish salting and drying | I | the bough |  | Fish keeps for a year; coastal grain store +20 % | Coasts worldwide |
| F5 | Water and wind mills | I | the bough |  | Grain into flour cheaply: +gold per farmland province | Europe, Middle East, China |
| F8 | Polder drainage | II | F5 Water and wind mills |  | Turn marsh provinces into farmland | Low Countries |
| F6 | Chinampa and raised fields | I | the bough |  | Marsh and lake provinces farm well | Mexico basin, Andes lakes |
| F11 | Horse breeding studs | II | the bough |  | +Horses per grassland province | Steppe, Arabia, Iberia |
| F9 | Maize, potato and cassava (contact) | II | the bough |  | A failed harvest becomes poor; more people per farmland | Americas |

#### Fire and metal (R2)

| Id | Invention | Era | Grows from | Also needs | Unlocks | Known in 1444 by |
|---|---|---|---|---|---|---|
| C1 | Paper making | I | the bough |  | Schools cost less | Worldwide except Americas and Oceania |
| L4 | Metal movable type | I | C1 Paper making |  | Books spread: students cost less | Korea |
| L5 | Printing (event id) | I | C1 Paper making |  | Inventions spread +20 %; schools cost less |  |
| L6 | Humanist learning (event id) | I | L5 Printing or L2 Madrasa networks |  | Scholars +research |  |
| T4 | Paper money | I | C1 Paper making |  | Print gold (risk of price rises) | China (Ming notes, heavily devalued by 1444) |
| C2 | Blast furnace | I | the bough |  | +iron: guns and tools cheaper | China, parts of Europe |
| W3 | Bombards | I | C2 Blast furnace |  | Siege guns: castles fall faster | Ottoman, Western Europe, China |
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
| C3 | Porcelain kilns | I | the bough |  | Porcelain trade good | China, Korea, Vietnam |
| C4 | Silk and cotton weaving | I | the bough |  | Cloth trade good | Asia, Middle East |
| C8 | Putting-out workshops | II | C4 Silk and cotton weaving |  | Cloth provinces +gold |  |
| C11 | Manufactories | III | C8 Putting-out workshops |  | A new building: +gold, needs officials |  |
| S10 | Naval dockyards | III | C11 Manufactories | S7 Galleon | Ships cheaper to build and keep |  |
| S12 | Copper sheathing | IV | S10 Naval dockyards |  | Ships rot slower |  |
| C5 | Glass and lenses | I | the bough |  | Needed for spectacles and telescopes | Venice, Middle East |
| C9 | Clockmaking | II | C5 Glass and lenses |  | Needed for chronometer |  |
| S11 | Marine chronometer | IV | C9 Clockmaking | S5 ocean_navigation | Fewer ships lost on long voyages |  |
| L10 | Spectacles and telescopes | II | C5 Glass and lenses |  | Scholars work into old age |  |
| W1 | Composite-bow horse archery | I | the bough |  | Strong horse archers | Steppe, Iran, Ottoman, North India |
| W2 | Heavy armoured cavalry | I | the bough |  | Knights and lancers | Europe, India, Middle East |
| W4 | Wagon fort | I | the bough |  | Defensive wagons and hand guns | Bohemia, Hungary, Muscovy, Ming |
| W6 | Pike squares | I | the bough |  | Foot that stops horse | Swiss, Scots |

#### Counting and records (R3)

| Id | Invention | Era | Grows from | Also needs | Unlocks | Known in 1444 by |
|---|---|---|---|---|---|---|
| G1 | Written law codes | I | the bough |  | One official runs 1 province | Most states |
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
| G2 | Feudal grants | I | the bough |  | Create lords by granting fiefs | Europe, Japan, India |
| G6 | Quipu and knot records | I | the bough |  | Tax registers without writing | Inca |
| L1 | Temple and monastery schools | I | the bough |  | School type with 20 seats | Most settled realms |
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
| L2 | Madrasa networks | I | the bough |  | School type with 30 seats | Islamic world |
| L3 | Observatories | I | L2 Madrasa networks |  | +research for Learning and Sea inventions | Timurid Samarkand, Ming, Maragha tradition |
| T1 | Caravanserai networks | I | the bough |  | Caravans lose less on long routes | Middle East, Central Asia, Sahel |
| T2 | Double-entry bookkeeping | I | the bough |  | Merchants earn +10 % | Italian cities |
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
| T5 | Monsoon sailing calendars | I | the bough |  | Indian Ocean trade ships safer | Swahili coast, Gujarat, Arabia, Malay world |
| L9 | Variolation | II | the bough |  | Fewer smallpox deaths | China, Ottoman, West Africa, India |

#### Boats (R4)

| Id | Invention | Era | Grows from | Also needs | Unlocks | Known in 1444 by |
|---|---|---|---|---|---|---|
| S1 | Magnetic compass and sea charts | I | the bough |  | Ships may leave the coast | Mediterranean, China, Indian Ocean |
| S4 | Carrack and caravel | I | S1 Magnetic compass and sea charts | S2 Lateen and junk rigging | Ocean-going ships | Portugal, Castile, Genoa, Venice |
| S5 | Ocean navigation (event id) | II | S4 Carrack and caravel |  | Cross oceans; opens colonies with 2 colonial governor slots  |  |
| S7 | Galleon | II | S5 Ocean navigation | S6 Ship-mounted cannon | Strong trade and war ships |  |
| S9 | Line-of-battle tactics | III | S7 Galleon |  | Warships +strength in fleets |  |
| S2 | Lateen and junk rigging | I | the bough |  | Better trade ships | Mediterranean, Indian Ocean, China |
| S3 | Outrigger voyaging | I | the bough |  | Long canoe voyages between islands | Pacific, Malay world |


#### Out of the game: Era VIII

These 12 Era VIII inventions are in the tree's data but never studied: L25 Computing, C24 Automation, B17 Prefab housing, G20 Digital government, S21 Satellite navigation, T18 Electronic banking, T19 Internet, W24 Guided missiles, F23 Green revolution agriculture, F24 Drip irrigation, S20 Nuclear propulsion, T17 Container shipping.

### What each country knows in 1444

Every country starts knowing the root and the four boughs. It also knows the inventions it historically knew: the "Known in 1444 by" column says who typically knows each one, and the catalogue's institutional development and region decide the exact set. For example, East Asian courts know printing and the examination system, Iberians have ocean ships under way, and Timurid lands have observatories. See [The 1444 Start](The-1444-Start).

### Research elsewhere

- The event tree's literacy stat reads your scholars and schools per thousand people.
- Your inventions known, each weighted by its era cost, make up the **Technology** win score on [Your Realm](Your-Realm).

### Each month

A turn is one week. These steps run once a month, in the turn in which a new month begins.

| Cadence | What happens |
|---|---|
| Monthly | Progress from scholars and students is added; if it reaches the cost, the invention is learned and you choose the next study |
| Yearly | Student cohorts age and 5-year cohorts graduate; scholars age; spread discounts are worked out again with trade partners |
| At each era boundary | The cost of studying ahead changes |

Progress moves every month by a twelfth of the yearly rate, and an invention is known in the month it is paid for. With two studies, each gets half.

### The AI

An isolationist AI fills its schools and avoids war; a hegemon seeker keeps its recruits for the army instead of students. Every AI country studies the invention it can study that costs it least right now (ties go by id), fills every empty seat while at peace and none at war, and calls its students to arms only when it is at war with no recruits left.

## What you see

Everything about research and schools is in one place: the **Learning** tab of your country card (tap your realm's name or flag, then Learning).

- **The overview.** At the top: what your scholars study now, a progress bar, its scholar-years and about how long is left at your current pace, then your scholars, students, scholar-years a year and how many of the tree's inventions you know. When nothing is studied, the card says so in red.

Below it the tab has two parts:

- **Tree.** The invention tree, one bough at a time: tap **Tilling and building**, **Fire and metal**, **Counting and records** or **Boats** (each tab says how many of its inventions you know and how many you can study). The bough sits at the left and each era is a column; lines run from each invention to the ones that grow from it, dashed for an extra need. Drag inside the frame to move around. Inventions are green with ✓ when known, gold with ◆ when you can study them, darker gold while being studied, and grey with a dashed edge when locked.
  Tap an invention to see its sheet: what it does, what it grows from and what it also needs (each marked ✓ or ✗; tap one to jump to it). Only an invention marked ◆ has a **Study this** button, with its cost in scholar-years, about how long it takes at your pace, how many neighbours already know it (each makes it cheaper) and whether it is ahead of its time (double cost per era ahead). A locked invention tells you what to learn first. Choosing another study while one is under way drops the progress on it: the button then reads **Switch to this study**, and the sheet says how much you would lose.
- **Schools.** Your students: the **−5** and **+5** buttons set how many seats to fill. Each student is a man the army can't raise: more students fill from your recruit pools at once, fewer go back to them. **In need of soldiers?** folds out **Call students to arms**, which empties every school back into recruits at once; research stops until you fill seats again, and those students never become scholars. Then each school, where it is (tap to see the province) and its students, schools being founded with the months until they open, and their upkeep a year, also shown as the **Schools** line of the Treasury. **Found a school** opens the list of your towns without a school: a temple school costs 60 gold and opens after 12 months (a madrasa, with 30 seats, if you know Madrasa networks). You need Temple and monastery schools or Madrasa networks.

Elsewhere:

- The **General** tab of your country card has a **Learning** line, "Studying Three-field rotation · 40 % · scholars 6", that opens the tab. Another country's card shows how many inventions it knows and what it studies.
- When you learn an invention an alert says so, with **Open** to choose the next study. While nothing is studied, one alert asks you to choose.
- A commander's **Train** list offers only the arms your realm knows; the rest are named with a button to the Learning tab (pikes need Pike squares, knights Heavy armoured cavalry).

### In the game now

The first slice of research (milestone 4) plays one study at a time. Every country starts with a school in its capital (a madrasa where it knows Madrasa networks, else a temple school), half its seats filled and a few scholars, so research moves from the first month. Inventions already change: harvests (Three-field rotation and later farming inventions make each harvest a band better), which arms can be trained, and the troop cap (Standing regiments, Mass conscription, Railway mobilization). Castles and roads follow with buildings. Not yet in the game: the academy's second study, stealing and sacking in war, poaching, foreign scholars and contact inventions such as maize and potatoes; the other effects are shown as text.

## How it connects

- [Your Realm](Your-Realm): gold for school upkeep, the recruit pool for students, war and peace; research returns inventions for the Technology score.
- [Provinces](Provinces): schools, students and scholars per province, the Schoolmaster, graduates as officials; research sends unlocks for buildings, tile changes, harvest steps, roads and castles.
- [Buildings](Buildings): school buildings and their steps; new buildings hang on invention ids.
- [Trade](Trade): trade partners for spread; trade rewrites the T-branch effects.
- [Warfare](Warfare): W, B and S inventions and their numbers; war sacks schools; stealing inventions.
- [Recruiting](Recruiting): W12, W15 and W18 recruiting effects.
- [Exploration and Colonies](Exploration-and-Colonies): S4, S5, T8 and T9 colonial governor slots; contact events open contact inventions.
- [Naval](Naval): sea inventions and ship types.
- [Troop Movement](Troop-Movement): B2, B9 and railways as road factors.
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
| Cost by era | `research.era_cost` | I 20, II 40, III 80, IV 150, V 250, VI 400, VII 650 (VIII 1000) | Yes |
| Era dates | `research.era_dates` | 1444, 1500, 1600, 1700, 1800, 1870, 1914 (cut 31 August 1939) | No |
| Studying ahead | `research.ahead_multiplier` | ×2 per era | Yes |
| Spread per neighbour or partner | `research.spread_per_partner` | 10 % | Yes |
| Spread cap | `research.spread_cap` | 60 % | Yes |
| Scholar rate | `research.scholar_rate` | 1 scholar-year a year | Yes |
| Student rate | `research.student_rate` | 0.2 scholar-years a year | Yes |
| Years to graduate | `research.graduation_years` | 5 | Yes |
| Studies with an academy | `research.studies_with_academy` | 2 | Yes |
| Seats per school | `research.school_seats` | 20 / 30 / 60 / 100 | Yes |
| The tree | `inventions[]` | 174 rows | Era costs are placeholders |

## Decided since the first draft

- Research moves monthly; two studies split it evenly, and one academy anywhere is enough for both.
- Ironclads grow from Steamships.
- The trade inventions take the trade design's effects; T8 and T9 also give a colonial governor slot.
- L18 gives 10 village-school seats in each province without a school. Schools cost 2, 4 or 6 gold a year by step.
- Occupying an enemy province with an open school steals 10 % of a study the enemy knows. A battle there sacks the school with a 25 % chance, and half its scholars flee.
- Spread inventions raise the discount per neighbour from 10 % to 12 %, 14 % and 16 %, still capped at 60 %.
- Your starting inventions come from your region; Ming and Korea also start with printing.
- Every country starts with one school in its capital, half full, and 5 scholars (2 where it knows no school type).
- The AI studies the cheapest invention open to it, fills its seats in peace and empties them only at war with no recruits left.
- Guano's harvest bonus lasts 30 years, then ends.
- With the Examination system, any working scholar can be made an official of any kind.

## Still open

Nothing. Every question about research has been decided; numbers marked as placeholders are tuned during balancing.


## For developers

- Spec: [`domain/research/spec.md`](https://github.com/grrts/pocket-hedgemony/blob/claude/domain-specs-bdd-ebdpmx/domain/research/spec.md), requirement code **RSCH** (RSCH-001 to RSCH-090, with the full invention list in section 5.8; how the player uses it is RSCH-084 to RSCH-090).
- Features: `domain/research/features/` (schools-and-students, research-progress, war-and-research, cost-and-eligibility, invention-tree, starting-knowledge, research-readers).
- Code: rules code for this context goes in `packages/engine/src/domain/research/`, balance numbers and the tree in `packages/rules/data/domain/research.json`. The turn's wiring is `packages/engine/src/research.ts` (`knows(world, n, id)` for other systems), the Learning tab `apps/client/src/ui/learning.ts`.
