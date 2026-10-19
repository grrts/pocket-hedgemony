# Research data

Every value in the game's research config, exactly as the game reads it. This page is made from `packages/rules/data/domain/research.json` each time the config changes, so it always matches the game. How these values are used is explained on [Research](Research).

Keys are written as in the config file. Shares are fractions (0.25 is 25 %), and values marked (provisional) are placeholders that may still change in balancing. Inventions are shown by id and name; see [Research data](Data-Research#inventions).

> Research (domain/research/spec.md). Era costs, rates and seats are placeholders from the research tree and country stats v3 section 7. Inventions are the 174 rows of the tree (research-tree.md), one config row each. The 13 past inventions of eras A and M come first (RSCH-092); start groups decide each map nation's knowledge at the start (RSCH-098). Era I runs from the start (1378 at the earliest) to 1500; \`starts\` holds what differs for a start other than 11 November 1444 (RSCH-114), and \`era\_pace\` paces Era I to the start (RSCH-113).

| Key | Value |
|---|---|
| `eras` | A, M, I, II, III, IV, V, VI, VII, VIII |
| `out_of_scope_eras` | VIII |
| `ahead_multiplier` (provisional) | 2 |
| `spread_per_partner_pct` (provisional) | 10 |
| `spread_cap_pct` (provisional) | 60 |
| `scholar_rate` (provisional) | 1 |
| `student_rate` (provisional) | 0.2 |
| `graduation_years` (provisional) | 5 |
| `schoolmaster_years_sooner` | 1 |
| `studies_with_academy` | 2 |
| `academy_level_schools` | academy |
| `school_gained_by` | build, lord\_founds, clergy\_founds, conquest |
| `dropped_inventions` | [L23 Nuclear physics](Data-Research#inventions), [L24 Rocketry](Data-Research#inventions) |
| `research_months_per_year` (provisional) | 12 |
| `second_study_share` (provisional) | 0.5 |
| `village_school_seats` (provisional) | 10 |
| `steal_share_of_cost` (provisional) | 0.1 |
| `sack_chance_pct` (provisional) | 25 |
| `sack_scholars_flee_share` (provisional) | 0.5 |
| `poach_gold_ratio` (provisional) | 2 |
| `poach_one_in` (provisional) | 20 |
| `old_age_one_in` (provisional) | 30 |
| `past_eras` | A, M |
| `standing_share` (provisional) | 0.25 |
| `queue_length` (provisional) | 5 |
| `behind_discount_pct_per_era` (provisional) | 25 |
| `behind_discount_cap_pct` (provisional) | 50 |
| `cost_floor_share` (provisional) | 0.2 |

## Inventions

| id | name | era | parent | or parents | also needs | unlocks | start regions | effects | more |
|---|---|---|---|---|---|---|---|---|---|
| F01 | Ox plough | A | R1 | none | none | Farmland at the harvest of the start; opens the Heavy plough | none |  | without: Farmland harvests one step worse |
| F02 | Heavy plough | M | [F01 Ox plough](Data-Research#inventions) | none | none | Opens Three-field rotation | none |  |  |
| F03 | Riding and pack animals | A | R1 | none | none | Horse regiments and camel caravans; opens horse studs, horse archery, heavy cavalry and caravanserais | none |  | without: No horse regiments and no camel caravans |
| B01 | Wheel and carts | A | R1 | none | none | Armies carry their full food; opens mills and the wagon fort | none |  | without: Armies carry half the food |
| B02 | Dressed stone | A | R1 | none | none | Opens Stone castles | none |  |  |
| C01 | Iron smelting | A | R2 | none | none | Iron weapons: regiments at full strength; opens Steel forging, the Blast furnace and Pike squares | none |  | without: Regiments fight 20 % weaker |
| C02 | Steel forging | M | [C01 Iron smelting](Data-Research#inventions) | none | none | Opens Heavy armoured cavalry | none |  |  |
| C03 | Gunpowder | M | R2 | none | none | Opens Bombards | none |  |  |
| G01 | Writing | A | R3 | none | none | Opens Written law codes, schools, madrasas, Paper making and Positional numbers | none |  |  |
| T01 | Coinage | A | R3 | none | none | Opens Double-entry bookkeeping and Paper money | none |  |  |
| L01 | Positional numbers | M | [G01 Writing](Data-Research#inventions) | none | none | Opens Double-entry bookkeeping | none |  |  |
| S01 | Sail | A | R4 | none | none | Opens the compass, rigging, the Sternpost rudder and monsoon sailing | none |  |  |
| S02 | Sternpost rudder | M | [S01 Sail](Data-Research#inventions) | none | none | Opens the Carrack and caravel | none |  |  |
| B1 | Stone castles | I | [B02 Dressed stone](Data-Research#inventions) | none | none | Castles | Most settled realms | buildings: castle |  |
| B5 | bastion\_fortification | II | [B1 Stone castles](Data-Research#inventions) | none | [W3 Bombards](Data-Research#inventions) | Castles resist guns | none |  | event id: bastion\_fortification |
| B6 | Star forts | II | [B5 bastion\_fortification](Data-Research#inventions) | none | none | Strong castles; sieges take far longer | none |  |  |
| B7 | Siege parallels | III | [B6 Star forts](Data-Research#inventions) | none | none | Attackers take castles faster | none |  |  |
| B2 | Roads and post stations | I | R1 | none | none | Grain and armies move faster; officials run +1 province close to the capital | Ming, Ottoman, Inca, Mali trade roads | faster: grain, armies; official\_reach: 1 |  |
| B3 | Grand canals | I | [B2 Roads and post stations](Data-Research#inventions) | none | none | River-and-canal grain transport | China |  |  |
| B8 | Canal locks | III | [B3 Grand canals](Data-Research#inventions) | none | none | Canals across hills | none |  |  |
| W10 | Supply magazines | III | [B2 Roads and post stations](Data-Research#inventions) | none | none | Armies far from home don't starve | none |  |  |
| B9 | Turnpike roads | IV | [B2 Roads and post stations](Data-Research#inventions) | none | none | Faster grain and armies | none | faster: grain, armies |  |
| B4 | Earthwork ring forts | I | R1 | none | none | Cheap forts | West Africa (e.g. Benin walls), Polynesia |  |  |
| F1 | Three-field rotation | I | [F02 Heavy plough](Data-Research#inventions) | none | none | +1 harvest step on farmland | Most of Europe | harvest\_steps: 1 |  |
| F7 | Ever-normal granaries | I | [F1 Three-field rotation](Data-Research#inventions) | [F2 Wet-rice terracing](Data-Research#inventions) | none | Granaries hold 50 % more and rot less | China, Korea | granary\_pct: 50 |  |
| F12 | Fodder crops (clover, turnips) | III | [F1 Three-field rotation](Data-Research#inventions) | none | none | Horses eat half the grain; +1 harvest step | none | harvest\_steps: 1 |  |
| F13 | Selective livestock breeding | IV | [F12 Fodder crops (clover, turnips)](Data-Research#inventions) | none | [F11 Horse breeding studs](Data-Research#inventions) | Herds grow faster | none |  |  |
| F14 | Seed drill | IV | [F12 Fodder crops (clover, turnips)](Data-Research#inventions) | none | none | +1 harvest step | none | harvest\_steps: 1 |  |
| F15 | Four-field rotation | IV | [F12 Fodder crops (clover, turnips)](Data-Research#inventions) | none | none | No fallow year: +1 harvest step | none | harvest\_steps: 1 |  |
| F2 | Wet-rice terracing | I | R1 | none | none | Two harvests a year on irrigated rice land | East and Southeast Asia | harvests\_per\_year\_irrigated\_rice: 2 |  |
| F3 | Qanat and canal irrigation | I | R1 | none | none | Dry provinces harvest at normal | Iran, Central Asia, North Africa, Andes |  |  |
| F10 | Sugar and spice plantations | II | [F3 Qanat and canal irrigation](Data-Research#inventions) | none | none | New trade goods (event tree's harm rules apply: no forced labour bonus) | none |  |  |
| F4 | Fish salting and drying | I | R1 | none | none | Fish keeps for a year; coastal grain store +20 % | Coasts worldwide | coastal\_grain\_store\_pct: 20; salting: yes |  |
| F5 | Water and wind mills | I | R1 | none | [B01 Wheel and carts](Data-Research#inventions) | Grain into flour cheaply: +gold per farmland province | Europe, Middle East, China |  |  |
| F8 | Polder drainage | II | [F5 Water and wind mills](Data-Research#inventions) | none | none | Turn marsh provinces into farmland | Low Countries |  |  |
| F6 | Chinampa and raised fields | I | R1 | none | none | Marsh and lake provinces farm well | Mexico basin, Andes lakes |  |  |
| F11 | Horse breeding studs | II | [F03 Riding and pack animals](Data-Research#inventions) | none | none | +Horses per grassland province | Steppe, Arabia, Iberia |  |  |
| F9 | Maize, potato and cassava | II | R1 | none | none | A failed harvest becomes poor; more people per farmland | Americas | failed\_harvest\_becomes: poor | contact: atlantic\_crossing |
| C1 | Paper making | I | R2 | none | [G01 Writing](Data-Research#inventions) | Schools cost less | Worldwide except Americas and Oceania | school\_upkeep\_pct: -10 |  |
| L4 | Metal movable type | I | [C1 Paper making](Data-Research#inventions) | none | none | Books spread: students cost less | Korea | school\_upkeep\_pct: -10 |  |
| L5 | printing | I | [C1 Paper making](Data-Research#inventions) | none | none | Inventions spread +20 %; schools cost less | none | spread\_pct: 20; school\_upkeep\_pct: -10 | event id: printing |
| L6 | humanist\_learning | I | [L5 printing](Data-Research#inventions) | [L2 Madrasa networks](Data-Research#inventions) | none | Scholars +research | none | research\_pct: 10 | event id: humanist\_learning |
| T4 | Paper money | I | [C1 Paper making](Data-Research#inventions) | none | [T01 Coinage](Data-Research#inventions) | Print gold (risk of price rises) | China (Ming notes, heavily devalued by 1444) |  |  |
| C2 | Blast furnace | I | [C01 Iron smelting](Data-Research#inventions) | none | none | +iron: guns and tools cheaper | China, parts of Europe |  |  |
| W3 | Bombards | I | [C2 Blast furnace](Data-Research#inventions) | none | [C03 Gunpowder](Data-Research#inventions) | Siege guns: castles fall faster | Ottoman, Western Europe, China |  |  |
| W5 | gunpowder\_infantry | I | [W3 Bombards](Data-Research#inventions) | none | none | Hand-gun infantry | Ottoman, Ming, parts of Europe |  | event id: gunpowder\_infantry |
| W7 | Pike and shot | II | [W5 gunpowder\_infantry](Data-Research#inventions) | none | [W6 Pike squares](Data-Research#inventions) | Mixed infantry: foot +strength | none |  |  |
| W11 | Flintlock and bayonet | III | [W7 Pike and shot](Data-Research#inventions) | none | none | Pikes obsolete; foot +strength | none |  |  |
| W9 | Volley fire drill | II | [W5 gunpowder\_infantry](Data-Research#inventions) | none | none | Gun infantry +strength | none |  |  |
| W8 | Field artillery | II | [W3 Bombards](Data-Research#inventions) | none | none | Guns in battle | none |  |  |
| C10 | Gunpowder mills | II | [C2 Blast furnace](Data-Research#inventions) | none | none | Guns cost less to raise | none |  |  |
| S6 | Ship-mounted cannon | II | [C10 Gunpowder mills](Data-Research#inventions) | none | [S4 Carrack and caravel](Data-Research#inventions) | Warships with guns | none |  |  |
| S8 | Turtle and armoured ships | II | [S6 Ship-mounted cannon](Data-Research#inventions) | none | none | Coastal defence ships | none |  |  |
| C6 | Mining pumps and shafts | II | [C2 Blast furnace](Data-Research#inventions) | none | none | +output from mines; silver and gold mines | Central Europe |  |  |
| C7 | Mercury silver refining | II | [C6 Mining pumps and shafts](Data-Research#inventions) | none | none | Double silver from silver mines | none |  |  |
| C12 | Coke smelting | IV | [C6 Mining pumps and shafts](Data-Research#inventions) | none | [C2 Blast furnace](Data-Research#inventions) | Iron without forests | none |  |  |
| B10 | Iron bridges | IV | [C12 Coke smelting](Data-Research#inventions) | none | none | Cross rivers anywhere | none |  |  |
| C13 | steam\_power | IV | [C12 Coke smelting](Data-Research#inventions) | none | [L11 experimental\_science](Data-Research#inventions) | Pumps, then engines | none |  | event id: steam\_power |
| C14 | mechanized\_textiles | IV | [C13 steam\_power](Data-Research#inventions) | none | [C8 Putting-out workshops](Data-Research#inventions) | Factories: big +gold in cloth provinces | none |  | event id: mechanized\_textiles |
| C15 | Machine tools | V | [C13 steam\_power](Data-Research#inventions) | none | none | Needed for rifles, reapers, engines | none |  |  |
| F17 | Mechanical reaper | V | [C15 Machine tools](Data-Research#inventions) | none | [F14 Seed drill](Data-Research#inventions) | Fewer farmers per harvest: more recruits | none |  |  |
| W16 | Rifled musket | V | [C15 Machine tools](Data-Research#inventions) | none | none | Foot +strength; more Fallen | none |  |  |
| W17 | Breech-loading rifle | V | [W16 Rifled musket](Data-Research#inventions) | none | none | Foot +strength | none |  |  |
| C18 | Bessemer steel | VI | [C15 Machine tools](Data-Research#inventions) | none | [C12 Coke smelting](Data-Research#inventions) | Cheap steel: guns, ships, rails | none |  |  |
| S14 | Ironclads | V | [S13 Steamships](Data-Research#inventions) | none | none | Wooden fleets obsolete | none |  |  |
| B13 | Reinforced concrete | VI | [C18 Bessemer steel](Data-Research#inventions) | none | none | Strong forts, dams | none |  |  |
| B14 | Hydroelectric dams | VI | [B13 Reinforced concrete](Data-Research#inventions) | none | [C19 electrification](Data-Research#inventions) | Power and irrigation | none |  |  |
| C19 | electrification | VI | [C18 Bessemer steel](Data-Research#inventions) | none | [T14 telegraphy](Data-Research#inventions) | Factories and towns +gold | none |  | event id: electrification |
| L20 | Research laboratories | VI | [C19 electrification](Data-Research#inventions) | none | [L12 Academies of science](Data-Research#inventions) | Research +50 % | none | research\_pct: 50 |  |
| L23 | Nuclear physics | VII | [L20 Research laboratories](Data-Research#inventions) | none | none | Unlocks nuclear power and propulsion | none |  |  |
| L24 | Rocketry | VII | [L20 Research laboratories](Data-Research#inventions) | none | [C20 chemical\_industry](Data-Research#inventions) | Unlocks missiles and satellites | none |  |  |
| L25 | computing | VIII | [L20 Research laboratories](Data-Research#inventions) | none | [C19 electrification](Data-Research#inventions) | Research +50 %; officials +1 province | none |  | event id: computing |
| C24 | Automation | VIII | [L25 computing](Data-Research#inventions) | none | [C21 Assembly line](Data-Research#inventions) | Fewer workers: +recruits and +students | none |  |  |
| B17 | Prefab housing | VIII | [C24 Automation](Data-Research#inventions) | none | [B13 Reinforced concrete](Data-Research#inventions) | Towns grow fast | none |  |  |
| G20 | Digital government | VIII | [L25 computing](Data-Research#inventions) | none | none | Officials run 5 provinces | none | provinces\_per\_official: 5 |  |
| S21 | Satellite navigation | VIII | [L25 computing](Data-Research#inventions) | none | [L24 Rocketry](Data-Research#inventions) | No ships lost to navigation | none |  |  |
| T18 | Electronic banking | VIII | [L25 computing](Data-Research#inventions) | none | none | Merchants and officials +20 % | none |  |  |
| T19 | internet | VIII | [L25 computing](Data-Research#inventions) | none | [T18 Electronic banking](Data-Research#inventions) | Inventions spread at double speed | none |  | event id: internet |
| W24 | Guided missiles | VIII | [L25 computing](Data-Research#inventions) | none | [L24 Rocketry](Data-Research#inventions) | Strike from far away | none |  |  |
| C21 | Assembly line | VII | [C19 electrification](Data-Research#inventions) | none | none | Factories double output | none |  |  |
| C22 | motor\_and\_air\_transport | VII | [C21 Assembly line](Data-Research#inventions) | none | none | Trucks, tractors and aircraft, as built by 1939 | none |  | event id: motor\_and\_air\_transport |
| B15 | Highways | VII | [C22 motor\_and\_air\_transport](Data-Research#inventions) | none | [B13 Reinforced concrete](Data-Research#inventions) | Trucks move everything | none |  |  |
| B16 | Airfields | VII | [C22 motor\_and\_air\_transport](Data-Research#inventions) | none | none | Air routes and air bases | none |  |  |
| F21 | Tractors | VII | [C22 motor\_and\_air\_transport](Data-Research#inventions) | none | none | Many fewer farmers: +recruits and +students | none |  |  |
| F23 | green\_revolution\_agriculture | VIII | [F21 Tractors](Data-Research#inventions) | none | [F22 Hybrid seeds](Data-Research#inventions) | Famines nearly end | none |  | event id: green\_revolution\_agriculture |
| F24 | Drip irrigation | VIII | [F23 green\_revolution\_agriculture](Data-Research#inventions) | none | [F3 Qanat and canal irrigation](Data-Research#inventions) | Dry provinces harvest at good | none |  |  |
| S18 | Aircraft carriers | VII | [C22 motor\_and\_air\_transport](Data-Research#inventions) | none | [S16 Dreadnought battleships](Data-Research#inventions) | Fleets strike from the air | none |  |  |
| S20 | Nuclear propulsion | VIII | [S18 Aircraft carriers](Data-Research#inventions) | none | [L23 Nuclear physics](Data-Research#inventions) | Ships go years without port | none |  |  |
| W21 | Tanks | VII | [C22 motor\_and\_air\_transport](Data-Research#inventions) | none | [W19 Machine gun](Data-Research#inventions) | Break trench lines | none |  |  |
| W22 | Military aircraft | VII | [C22 motor\_and\_air\_transport](Data-Research#inventions) | none | none | Scout and bomb | none |  |  |
| T17 | Container shipping | VIII | [C21 Assembly line](Data-Research#inventions) | none | [S13 Steamships](Data-Research#inventions) | Trade ships carry 5× | none |  |  |
| L21 | Radio | VII | [C19 electrification](Data-Research#inventions) | none | [L16 Electricity studies](Data-Research#inventions) | Faster spread of news and inventions | none | spread\_pct: 20 |  |
| S19 | Radar | VII | [L21 Radio](Data-Research#inventions) | none | [C19 electrification](Data-Research#inventions) | Fleets see far | none |  |  |
| W23 | Field radio | VII | [L21 Radio](Data-Research#inventions) | none | none | Armies coordinate | none |  |  |
| C20 | chemical\_industry | VI | [C18 Bessemer steel](Data-Research#inventions) | none | [L15 Chemistry](Data-Research#inventions) | Fertilizer, dyes, explosives | none |  | event id: chemical\_industry |
| F19 | Chemical fertilizer | VI | [C20 chemical\_industry](Data-Research#inventions) | none | none | +2 harvest steps | none | harvest\_steps: 2 |  |
| F22 | Hybrid seeds | VII | [F19 Chemical fertilizer](Data-Research#inventions) | none | none | +1 harvest step | none | harvest\_steps: 1 |  |
| S15 | Torpedo boats | VI | [C20 chemical\_industry](Data-Research#inventions) | none | [S14 Ironclads](Data-Research#inventions) | Small navies threaten big ones | none |  |  |
| S17 | Submarines | VI | [S15 Torpedo boats](Data-Research#inventions) | none | [C19 electrification](Data-Research#inventions) | Blockade by stealth | none |  |  |
| W20 | Smokeless powder | VI | [C20 chemical\_industry](Data-Research#inventions) | none | none | Guns +range | none |  |  |
| C23 | Plastics | VII | [C20 chemical\_industry](Data-Research#inventions) | none | none | +gold from industry | none |  |  |
| S16 | Dreadnought battleships | VI | [C18 Bessemer steel](Data-Research#inventions) | none | [S14 Ironclads](Data-Research#inventions) | Strongest warships | none |  |  |
| W19 | Machine gun | VI | [C18 Bessemer steel](Data-Research#inventions) | none | [W17 Breech-loading rifle](Data-Research#inventions) | Defence +strength; huge Fallen | none |  |  |
| C16 | railways | V | [C13 steam\_power](Data-Research#inventions) | none | [C12 Coke smelting](Data-Research#inventions) | Move grain and armies far faster | none | faster: grain, armies | event id: railways |
| T14 | telegraphy | V | [C16 railways](Data-Research#inventions) | none | [L16 Electricity studies](Data-Research#inventions) | Instant prices; officials run +1 province | none | official\_reach: 1 | event id: telegraphy |
| W18 | Railway mobilization | VI | [C16 railways](Data-Research#inventions) | none | [W15 Mass conscription](Data-Research#inventions) | Whole army raised in weeks | none |  |  |
| S13 | Steamships | V | [C13 steam\_power](Data-Research#inventions) | none | [S10 Naval dockyards](Data-Research#inventions) | Ships ignore wind; faster trade | none |  |  |
| F16 | Guano and imported fertilizer | V | [S13 Steamships](Data-Research#inventions) | none | [F15 Four-field rotation](Data-Research#inventions) | +1 harvest step for 30 years | none | harvest\_steps: 1; harvest\_steps\_years: 30 |  |
| F20 | Refrigerated shipping | VI | [S13 Steamships](Data-Research#inventions) | none | [F18 Canned food](Data-Research#inventions) | Sell grain and meat overseas | none |  |  |
| W13 | Light field artillery | IV | [C12 Coke smelting](Data-Research#inventions) | none | [W8 Field artillery](Data-Research#inventions) | Guns move with the army | none |  |  |
| C17 | Gas lighting | V | [C12 Coke smelting](Data-Research#inventions) | none | none | Towns grow; schools work longer | none |  |  |
| C3 | Porcelain kilns | I | R2 | none | none | Porcelain trade good | China, Korea, Vietnam |  |  |
| C4 | Silk and cotton weaving | I | R2 | none | none | Cloth trade good | Asia, Middle East |  |  |
| C8 | Putting-out workshops | II | [C4 Silk and cotton weaving](Data-Research#inventions) | none | none | Cloth provinces +gold | none |  |  |
| C11 | Manufactories | III | [C8 Putting-out workshops](Data-Research#inventions) | none | none | A new building: +gold, needs officials | none |  |  |
| S10 | Naval dockyards | III | [C11 Manufactories](Data-Research#inventions) | none | [S7 Galleon](Data-Research#inventions) | Ships cheaper to build and keep | none |  |  |
| S12 | Copper sheathing | IV | [S10 Naval dockyards](Data-Research#inventions) | none | none | Ships rot slower | none |  |  |
| C5 | Glass and lenses | I | R2 | none | none | Needed for spectacles and telescopes | Venice, Middle East |  |  |
| C9 | Clockmaking | II | [C5 Glass and lenses](Data-Research#inventions) | none | none | Needed for chronometer | none |  |  |
| S11 | Marine chronometer | IV | [C9 Clockmaking](Data-Research#inventions) | none | [S5 ocean\_navigation](Data-Research#inventions) | Fewer ships lost on long voyages | none |  |  |
| L10 | Spectacles and telescopes | II | [C5 Glass and lenses](Data-Research#inventions) | none | none | Scholars work into old age | none | old\_age\_one\_in: 60 |  |
| W1 | Composite-bow horse archery | I | R2 | none | [F03 Riding and pack animals](Data-Research#inventions) | Strong horse archers | Steppe, Iran, Ottoman, North India |  |  |
| W2 | Heavy armoured cavalry | I | [C02 Steel forging](Data-Research#inventions) | none | [F03 Riding and pack animals](Data-Research#inventions) | Knights and lancers | Europe, India, Middle East |  |  |
| W4 | Wagon fort | I | R2 | none | [B01 Wheel and carts](Data-Research#inventions) | Defensive wagons and hand guns | Bohemia, Hungary, Muscovy, Ming |  |  |
| W6 | Pike squares | I | R2 | none | [C01 Iron smelting](Data-Research#inventions) | Foot that stops horse | Swiss, Scots |  |  |
| G1 | Written law codes | I | [G01 Writing](Data-Research#inventions) | none | none | One official runs 1 province | Most states | provinces\_per\_official: 1 |  |
| G3 | Tax registers | I | [G1 Written law codes](Data-Research#inventions) | none | none | Royal provinces pay +10 % (only with a chancery) | Ming, Ottoman, Venice | royal\_tax\_pct: 10; needs\_building: chancery |  |
| G7 | Venal offices | II | [G3 Tax registers](Data-Research#inventions) | none | none | Sell offices for gold (officials worse) | none |  |  |
| G9 | Professional bureaucracy | III | [G3 Tax registers](Data-Research#inventions) | none | none | Officials cost less; each runs 2 provinces | none | provinces\_per\_official: 2; officials\_cost\_less: yes |  |
| G10 | Census | III | [G9 Professional bureaucracy](Data-Research#inventions) | none | none | Recruits and taxes counted correctly: +10 % (only with a chancery) | none | needs\_building: chancery; recruits\_pct: 10; tax\_pct: 10 |  |
| G12 | Statistical bureau | IV | [G10 Census](Data-Research#inventions) | none | none | See every province's harvest early | none |  |  |
| G18 | Planned economy | VII | [G12 Statistical bureau](Data-Research#inventions) | none | none | Factories directed by the state | none |  |  |
| G11 | Postal service | III | [G9 Professional bureaucracy](Data-Research#inventions) | none | [B2 Roads and post stations](Data-Research#inventions) | Officials run +1 province further from the capital | none | official\_reach: 1 |  |
| W12 | Standing regiments | III | [G9 Professional bureaucracy](Data-Research#inventions) | none | none | Soldiers who stay: no losses from disbanding; troop cap +0.5 % of people | none | troop\_cap\_pct\_of\_people: 0.5 |  |
| W14 | Army divisions | IV | [W12 Standing regiments](Data-Research#inventions) | none | none | Armies split and join faster | none |  |  |
| W15 | Mass conscription | V | [W14 Army divisions](Data-Research#inventions) | none | [G10 Census](Data-Research#inventions) | +50 % recruits from all provinces | none | recruits\_pct: 50 |  |
| G13 | Rational legal codes | IV | [G9 Professional bureaucracy](Data-Research#inventions) | none | [L6 humanist\_learning](Data-Research#inventions) | Lords' trials cause less anger | none |  |  |
| G14 | Written constitution | IV | [G13 Rational legal codes](Data-Research#inventions) | none | none | New government forms | none |  |  |
| G4 | Examination system | I | [G1 Written law codes](Data-Research#inventions) | none | [C1 Paper making](Data-Research#inventions) | Scholars can become officials directly | China, Korea, Vietnam | scholars\_become\_officials: yes |  |
| G5 | Royal chancery | I | [G1 Written law codes](Data-Research#inventions) | none | none | Envoys +1 | Many monarchies | envoys: 1 |  |
| G8 | Resident ambassadors | II | [G5 Royal chancery](Data-Research#inventions) | none | none | Envoys +1; see others' armies; may ask for passage | Italian states | envoys: 1; ask\_passage: yes |  |
| G2 | Feudal grants | I | R3 | none | none | Create lords by granting fiefs | Europe, Japan, India |  |  |
| G6 | Quipu and knot records | I | R3 | none | none | Tax registers without writing | Inca |  |  |
| L1 | Temple and monastery schools | I | [G01 Writing](Data-Research#inventions) | [G6 Quipu and knot records](Data-Research#inventions) | none | School type with 20 seats | Most settled realms | school: temple\_or\_monastery\_school |  |
| L7 | Universities | II | [L1 Temple and monastery schools](Data-Research#inventions) | [L2 Madrasa networks](Data-Research#inventions), [L5 printing](Data-Research#inventions) | none | School type with 60 seats | none | school: university |  |
| L8 | Anatomy | II | [L7 Universities](Data-Research#inventions) | none | none | Fewer Fallen from wounds | none |  |  |
| L11 | experimental\_science | III | [L7 Universities](Data-Research#inventions) | none | [L10 Spectacles and telescopes](Data-Research#inventions) | Scholars +research; unlocks steam and chemistry | none | research\_pct: 10 | event id: experimental\_science |
| L12 | Academies of science | III | [L11 experimental\_science](Data-Research#inventions) | none | none | School type with 100 seats; study two inventions at once | none | school: academy; studies: 2 |  |
| L14 | Encyclopedias | IV | [L12 Academies of science](Data-Research#inventions) | none | [L5 printing](Data-Research#inventions) | Inventions spread +20 % | none | spread\_pct: 20 |  |
| L18 | mass\_literacy\_schooling | V | [L14 Encyclopedias](Data-Research#inventions) | none | [G10 Census](Data-Research#inventions) | Village schools: every province gets seats | none | village\_schools: yes | event id: mass\_literacy\_schooling |
| G16 | Civil service exams | V | [L18 mass\_literacy\_schooling](Data-Research#inventions) | none | [G9 Professional bureaucracy](Data-Research#inventions) | Officials run 3 provinces | none | provinces\_per\_official: 3 |  |
| L13 | Microscope | III | [L11 experimental\_science](Data-Research#inventions) | none | [L10 Spectacles and telescopes](Data-Research#inventions) | Needed for germ theory | none |  |  |
| L17 | vaccination\_and\_sanitation | V | [L13 Microscope](Data-Research#inventions) | none | [L9 Variolation](Data-Research#inventions) | Plague and smallpox deaths fall | none |  | event id: vaccination\_and\_sanitation |
| L19 | Germ theory and antiseptics | VI | [L17 vaccination\_and\_sanitation](Data-Research#inventions) | none | [L13 Microscope](Data-Research#inventions) | Far fewer Fallen from disease | none |  |  |
| L22 | Antibiotics | VII | [L19 Germ theory and antiseptics](Data-Research#inventions) | none | [C20 chemical\_industry](Data-Research#inventions) | Few deaths from infection | none |  |  |
| L15 | Chemistry | IV | [L11 experimental\_science](Data-Research#inventions) | none | none | Needed for chemical industry | none |  |  |
| L16 | Electricity studies | IV | [L11 experimental\_science](Data-Research#inventions) | none | none | Needed for telegraphy | none |  |  |
| B11 | Sewers and clean water | V | [L11 experimental\_science](Data-Research#inventions) | none | [B8 Canal locks](Data-Research#inventions) | Fewer plague deaths in towns | none |  |  |
| B12 | Tenements and city planning | V | [B11 Sewers and clean water](Data-Research#inventions) | none | none | Towns hold more people | none |  |  |
| F18 | Canned food | V | [L11 experimental\_science](Data-Research#inventions) | none | [F4 Fish salting and drying](Data-Research#inventions) | Armies carry 6 months of food | none |  |  |
| L2 | Madrasa networks | I | [G01 Writing](Data-Research#inventions) | none | none | School type with 30 seats | Islamic world | school: madrasa |  |
| L3 | Observatories | I | [L2 Madrasa networks](Data-Research#inventions) | none | none | +research for Learning and Sea inventions | Timurid Samarkand, Ming, Maragha tradition | research\_pct\_for\_letters: (L: 20; S: 20) |  |
| T1 | Caravanserai networks | I | R3 | none | [F03 Riding and pack animals](Data-Research#inventions) | Camel caravans; land traders lose their purse to bandits half as often | Middle East, Central Asia, Sahel | bandit\_loss\_pct: -50 |  |
| T2 | Double-entry bookkeeping | I | [T01 Coinage](Data-Research#inventions) | none | [L01 Positional numbers](Data-Research#inventions) | Collections +10 % | Italian cities | collections\_pct: 10 |  |
| T3 | Bills of exchange | I | [T2 Double-entry bookkeeping](Data-Research#inventions) | none | none | Deposit abroad; move gold without carrying it; loans cheaper | Italy, Low Countries, Hanse | deposit\_abroad: yes |  |
| T6 | Merchant fairs and exchanges | II | [T3 Bills of exchange](Data-Research#inventions) | none | none | Market step 2 (yearly fair) can be built; every market serves +2 visits a month | none | buildings: yearly fair; market\_visits: 2 |  |
| T8 | Licensed trading companies | II | [T6 Merchant fairs and exchanges](Data-Research#inventions) | none | [S5 ocean\_navigation](Data-Research#inventions) | Trading posts overseas count as cities and can found traders; +1 colonial governor slot | none | colonial\_governor\_slots: 1; trading\_posts\_count\_as\_cities: yes |  |
| T7 | Deposit banks | II | [T3 Bills of exchange](Data-Research#inventions) | none | none | Debt interest −20 % | none | debt\_interest\_pct: -20 |  |
| T10 | public\_debt\_markets | III | [T7 Deposit banks](Data-Research#inventions) | none | none | Borrow much more at lower interest | none |  | event id: public\_debt\_markets |
| T12 | Central bank | IV | [T10 public\_debt\_markets](Data-Research#inventions) | none | none | Debt interest −30 %; default is rarer | none | debt\_interest\_pct: -30 |  |
| T13 | Commodity exchanges | IV | [T12 Central bank](Data-Research#inventions) | none | [T6 Merchant fairs and exchanges](Data-Research#inventions) | See every known province's trade value and ratio | none | see\_all\_trade: yes |  |
| G15 | Income tax | V | [T12 Central bank](Data-Research#inventions) | none | [G10 Census](Data-Research#inventions) | Tax from towns and industry | none |  |  |
| G17 | Social insurance | VI | [G15 Income tax](Data-Research#inventions) | none | none | Fewer revolts in towns | none |  |  |
| G19 | Welfare state | VII | [G17 Social insurance](Data-Research#inventions) | none | none | Famines and revolts rare | none |  |  |
| T16 | Postal savings and mass banking | VI | [T12 Central bank](Data-Research#inventions) | none | none | +gold from people | none |  |  |
| T9 | joint\_stock\_finance | III | [T7 Deposit banks](Data-Research#inventions) | none | [T8 Licensed trading companies](Data-Research#inventions) | Trade ships cost 25 % less to buy; +1 colonial governor slot | none | colonial\_governor\_slots: 1; trade\_ship\_cost\_pct: -25 | event id: joint\_stock\_finance |
| T11 | Marine insurance | III | [T9 joint\_stock\_finance](Data-Research#inventions) | none | none | Half the purse of a lost ship is refunded | none | lost\_purse\_refund\_pct: 50 |  |
| T15 | Limited-liability companies | V | [T9 joint\_stock\_finance](Data-Research#inventions) | none | none | Industry grows faster | none |  |  |
| T5 | Monsoon sailing calendars | I | R3 | none | [S01 Sail](Data-Research#inventions) | Storm losses for trade ships in the Indian Ocean halved | Swahili coast, Gujarat, Arabia, Malay world | indian\_ocean\_storm\_loss\_pct: -50 |  |
| L9 | Variolation | II | R3 | none | none | Fewer smallpox deaths | China, Ottoman, West Africa, India |  |  |
| S1 | Magnetic compass and sea charts | I | [S01 Sail](Data-Research#inventions) | none | none | Ships may leave the coast | Mediterranean, China, Indian Ocean |  |  |
| S4 | Carrack and caravel | I | [S1 Magnetic compass and sea charts](Data-Research#inventions) | none | [S2 Lateen and junk rigging](Data-Research#inventions), [S02 Sternpost rudder](Data-Research#inventions) | Ocean-going ships | Portugal, Castile, Genoa, Venice |  |  |
| S5 | ocean\_navigation | II | [S4 Carrack and caravel](Data-Research#inventions) | none | none | Cross oceans; opens colonies with 2 colonial governor slots (see \[exploration-design.md\](../exploration/exploration-design.md)) | none | cross\_oceans: yes; colonial\_governor\_slots: 2 | event id: ocean\_navigation |
| S7 | Galleon | II | [S5 ocean\_navigation](Data-Research#inventions) | none | [S6 Ship-mounted cannon](Data-Research#inventions) | Strong trade and war ships | none |  |  |
| S9 | Line-of-battle tactics | III | [S7 Galleon](Data-Research#inventions) | none | none | Warships +strength in fleets | none |  |  |
| S2 | Lateen and junk rigging | I | [S01 Sail](Data-Research#inventions) | none | none | Better trade ships: trade ships' hold +0.5 | Mediterranean, Indian Ocean, China | trade\_ship\_hold: 0.5 |  |
| S3 | Outrigger voyaging | I | R4 | none | none | Long canoe voyages between islands | Pacific, Malay world |  |  |

## Era cost (provisional)

| Key | Value |
|---|---|
| `A` | 10 |
| `M` | 15 |
| `I` | 20 |
| `II` | 40 |
| `III` | 80 |
| `IV` | 150 |
| `V` | 250 |
| `VI` | 400 |
| `VII` | 650 |
| `VIII` | 1000 |

## Era dates

| Key | Value |
|---|---|
| `A` | -3000 |
| `M` | 600 |
| `I` | 1378 |
| `II` | 1500 |
| `III` | 1600 |
| `IV` | 1700 |
| `V` | 1800 |
| `VI` | 1870 |
| `VII` | 1914 |
| `VIII` | 1960 |

## Root

| Key | Value |
|---|---|
| `id` | R0 |
| `name` | Settled life |

## Boughs

| id | name |
|---|---|
| R1 | Tilling and building |
| R2 | Fire and metal |
| R3 | Counting and records |
| R4 | Boats |

## Era pace (provisional)

> Era I pacing (RSCH-113): Era I's cost per invention is multiplied by (the year Era II begins - the campaign's start year) / reference\_years, never below 1. A 1444 start is x1, a 1378 start about x2.18. Provisional: the balance model tunes it.

| Key | Value |
|---|---|
| `era` | I |
| `reference_years` | 56 |

## Campaign end

| Key | Value |
|---|---|
| `year` | 1939 |
| `month` | 8 |
| `day` | 31 |

## School seats (provisional)

| Key | Value |
|---|---|
| `temple_or_monastery_school` | 20 |
| `madrasa` | 30 |
| `university` | 60 |
| `academy` | 100 |

## School invention

| Key | Value |
|---|---|
| `temple_or_monastery_school` | [L1 Temple and monastery schools](Data-Research#inventions) |
| `madrasa` | [L2 Madrasa networks](Data-Research#inventions) |
| `university` | [L7 Universities](Data-Research#inventions) |
| `academy` | [L12 Academies of science](Data-Research#inventions) |

## Graduate official types

| Key | Value |
|---|---|
| `madrasa` | judge, chaplain |
| `university` | judge, steward |
| `academy` | master of works, warden |

## School lost by

| Key | Value |
|---|---|
| `upkeep_unpaid` | closed |
| `sacked` | lost |
| `religious_change` | closed |

## Students

| Key | Value |
|---|---|
| `gained_by` | enrolled |
| `lost_by` | graduated, called\_to\_arms, famine, plague |

## Scholars

| Key | Value |
|---|---|
| `gained_by` | graduated, hired\_foreign, fled\_to\_you |
| `lost_by` | old\_age, war\_in\_town, persecution, poached |

## School upkeep (provisional)

| Key | Value |
|---|---|
| `temple_or_monastery_school` | 2 |
| `madrasa` | 4 |
| `university` | 4 |
| `academy` | 6 |

## Ai

| Key | Value |
|---|---|
| `study` | cheapest\_eligible |
| `fill_seats_in_peace` | yes |
| `fill_seats_at_war` | no |

## Era names

| Key | Value |
|---|---|
| `A` | Ancient |
| `M` | Medieval |

## Regional contacts

- invention: [F03 Riding and pack animals](Data-Research#inventions); contact: across\_the\_ocean; groups: mesoamerica, andes, north\_america

## Without (provisional)

| Name | harvest steps | no arms | no caravans | food carried pct | strength pct |
|---|---|---|---|---|---|
| F01 | -1 |  |  |  |  |
| F03 |  | light horse, horse archers, knights and lancers, camel riders | yes |  |  |
| B01 |  |  |  | 50 |  |
| C01 |  |  |  |  | -20 |

## Start groups (provisional)

| Name | realms | past | inventions |
|---|---|---|---|
| latin | england, scotland, ireland, france, burgundy, brittany, provence, savoy, lorraine, navarre, castile, aragon, portugal, milan, venice, genoa, florence, modena, papal\_states, naples, austria, bohemia, bavaria, wurttemberg, palatinate, cologne, hesse, saxony, brandenburg, luneburg, hamburg, mecklenburg, pomerania, switzerland, teutonic\_order, livonian\_order, denmark, sweden, norway, poland, lithuania, hungary, ragusa, cyprus, knights\_of\_rhodes, canarian\_lordship | [F01 Ox plough](Data-Research#inventions), [F02 Heavy plough](Data-Research#inventions), [F03 Riding and pack animals](Data-Research#inventions), [B01 Wheel and carts](Data-Research#inventions), [B02 Dressed stone](Data-Research#inventions), [C01 Iron smelting](Data-Research#inventions), [C02 Steel forging](Data-Research#inventions), [C03 Gunpowder](Data-Research#inventions), [G01 Writing](Data-Research#inventions), [T01 Coinage](Data-Research#inventions), [L01 Positional numbers](Data-Research#inventions), [S01 Sail](Data-Research#inventions), [S02 Sternpost rudder](Data-Research#inventions) | [B1 Stone castles](Data-Research#inventions), [F1 Three-field rotation](Data-Research#inventions), [F4 Fish salting and drying](Data-Research#inventions), [F5 Water and wind mills](Data-Research#inventions), [C1 Paper making](Data-Research#inventions), [C2 Blast furnace](Data-Research#inventions), [W2 Heavy armoured cavalry](Data-Research#inventions), [W3 Bombards](Data-Research#inventions), [G1 Written law codes](Data-Research#inventions), [G2 Feudal grants](Data-Research#inventions), [G5 Royal chancery](Data-Research#inventions), [L1 Temple and monastery schools](Data-Research#inventions), [S1 Magnetic compass and sea charts](Data-Research#inventions) |
| orthodox | byzantium, moldavia, wallachia, serbia, bosnia, albania, georgia, trebizond, muscovy, novgorod, pskov, tver, ryazan | [F01 Ox plough](Data-Research#inventions), [F02 Heavy plough](Data-Research#inventions), [F03 Riding and pack animals](Data-Research#inventions), [B01 Wheel and carts](Data-Research#inventions), [B02 Dressed stone](Data-Research#inventions), [C01 Iron smelting](Data-Research#inventions), [C02 Steel forging](Data-Research#inventions), [C03 Gunpowder](Data-Research#inventions), [G01 Writing](Data-Research#inventions), [T01 Coinage](Data-Research#inventions), [S01 Sail](Data-Research#inventions), [S02 Sternpost rudder](Data-Research#inventions) | [B1 Stone castles](Data-Research#inventions), [F1 Three-field rotation](Data-Research#inventions), [F4 Fish salting and drying](Data-Research#inventions), [F5 Water and wind mills](Data-Research#inventions), [C1 Paper making](Data-Research#inventions), [C2 Blast furnace](Data-Research#inventions), [W2 Heavy armoured cavalry](Data-Research#inventions), [G1 Written law codes](Data-Research#inventions), [G2 Feudal grants](Data-Research#inventions), [G5 Royal chancery](Data-Research#inventions), [L1 Temple and monastery schools](Data-Research#inventions) |
| islamic | ottomans, karaman, candar, dulkadir, aq\_qoyunlu, qara\_qoyunlu, shirvan, mamluks, hejaz, yemen, oman, timurids, granada, morocco, tlemcen, tunis | [F01 Ox plough](Data-Research#inventions), [F03 Riding and pack animals](Data-Research#inventions), [B01 Wheel and carts](Data-Research#inventions), [B02 Dressed stone](Data-Research#inventions), [C01 Iron smelting](Data-Research#inventions), [C02 Steel forging](Data-Research#inventions), [C03 Gunpowder](Data-Research#inventions), [G01 Writing](Data-Research#inventions), [T01 Coinage](Data-Research#inventions), [L01 Positional numbers](Data-Research#inventions), [S01 Sail](Data-Research#inventions), [S02 Sternpost rudder](Data-Research#inventions) | [B1 Stone castles](Data-Research#inventions), [C1 Paper making](Data-Research#inventions), [C2 Blast furnace](Data-Research#inventions), [C4 Silk and cotton weaving](Data-Research#inventions), [F3 Qanat and canal irrigation](Data-Research#inventions), [F4 Fish salting and drying](Data-Research#inventions), [F5 Water and wind mills](Data-Research#inventions), [G1 Written law codes](Data-Research#inventions), [G5 Royal chancery](Data-Research#inventions), [L1 Temple and monastery schools](Data-Research#inventions), [L2 Madrasa networks](Data-Research#inventions), [T1 Caravanserai networks](Data-Research#inventions), [W1 Composite-bow horse archery](Data-Research#inventions), [W2 Heavy armoured cavalry](Data-Research#inventions) |
| khanates | kazan, crimea, uzbek\_khanate | [F01 Ox plough](Data-Research#inventions), [F02 Heavy plough](Data-Research#inventions), [F03 Riding and pack animals](Data-Research#inventions), [B01 Wheel and carts](Data-Research#inventions), [B02 Dressed stone](Data-Research#inventions), [C01 Iron smelting](Data-Research#inventions), [G01 Writing](Data-Research#inventions), [T01 Coinage](Data-Research#inventions), [L01 Positional numbers](Data-Research#inventions) | [C1 Paper making](Data-Research#inventions), [G1 Written law codes](Data-Research#inventions), [L1 Temple and monastery schools](Data-Research#inventions), [L2 Madrasa networks](Data-Research#inventions), [T1 Caravanserai networks](Data-Research#inventions), [W1 Composite-bow horse archery](Data-Research#inventions), [F11 Horse breeding studs](Data-Research#inventions) |
| hordes | great\_horde, nogai, moghulistan, oirat, mongols, jurchens | [F01 Ox plough](Data-Research#inventions), [F02 Heavy plough](Data-Research#inventions), [F03 Riding and pack animals](Data-Research#inventions), [B01 Wheel and carts](Data-Research#inventions), [C01 Iron smelting](Data-Research#inventions), [G01 Writing](Data-Research#inventions), [L01 Positional numbers](Data-Research#inventions) | [G1 Written law codes](Data-Research#inventions), [L1 Temple and monastery schools](Data-Research#inventions), [W1 Composite-bow horse archery](Data-Research#inventions), [F11 Horse breeding studs](Data-Research#inventions) |
| himalaya | tibet | [F01 Ox plough](Data-Research#inventions), [F03 Riding and pack animals](Data-Research#inventions), [B01 Wheel and carts](Data-Research#inventions), [B02 Dressed stone](Data-Research#inventions), [C01 Iron smelting](Data-Research#inventions), [G01 Writing](Data-Research#inventions), [T01 Coinage](Data-Research#inventions) | [B1 Stone castles](Data-Research#inventions), [C1 Paper making](Data-Research#inventions), [G1 Written law codes](Data-Research#inventions), [G5 Royal chancery](Data-Research#inventions), [L1 Temple and monastery schools](Data-Research#inventions) |
| south\_asia | delhi, jaunpur, bengal, bahmanis, vijayanagar, gujarat, malwa, mewar, orissa, gondwana, kashmir, multan, sindh, ahom | [F01 Ox plough](Data-Research#inventions), [F03 Riding and pack animals](Data-Research#inventions), [B01 Wheel and carts](Data-Research#inventions), [B02 Dressed stone](Data-Research#inventions), [C01 Iron smelting](Data-Research#inventions), [C02 Steel forging](Data-Research#inventions), [C03 Gunpowder](Data-Research#inventions), [G01 Writing](Data-Research#inventions), [T01 Coinage](Data-Research#inventions), [L01 Positional numbers](Data-Research#inventions), [S01 Sail](Data-Research#inventions), [S02 Sternpost rudder](Data-Research#inventions) | [B1 Stone castles](Data-Research#inventions), [C1 Paper making](Data-Research#inventions), [C2 Blast furnace](Data-Research#inventions), [C4 Silk and cotton weaving](Data-Research#inventions), [F4 Fish salting and drying](Data-Research#inventions), [F5 Water and wind mills](Data-Research#inventions), [G1 Written law codes](Data-Research#inventions), [G2 Feudal grants](Data-Research#inventions), [G5 Royal chancery](Data-Research#inventions), [L1 Temple and monastery schools](Data-Research#inventions), [W1 Composite-bow horse archery](Data-Research#inventions), [W2 Heavy armoured cavalry](Data-Research#inventions), [L9 Variolation](Data-Research#inventions) |
| china | ming | [F01 Ox plough](Data-Research#inventions), [F02 Heavy plough](Data-Research#inventions), [F03 Riding and pack animals](Data-Research#inventions), [B01 Wheel and carts](Data-Research#inventions), [B02 Dressed stone](Data-Research#inventions), [C01 Iron smelting](Data-Research#inventions), [C02 Steel forging](Data-Research#inventions), [C03 Gunpowder](Data-Research#inventions), [G01 Writing](Data-Research#inventions), [T01 Coinage](Data-Research#inventions), [L01 Positional numbers](Data-Research#inventions), [S01 Sail](Data-Research#inventions), [S02 Sternpost rudder](Data-Research#inventions) | [B1 Stone castles](Data-Research#inventions), [B2 Roads and post stations](Data-Research#inventions), [B3 Grand canals](Data-Research#inventions), [C1 Paper making](Data-Research#inventions), [C2 Blast furnace](Data-Research#inventions), [C3 Porcelain kilns](Data-Research#inventions), [C4 Silk and cotton weaving](Data-Research#inventions), [F2 Wet-rice terracing](Data-Research#inventions), [F4 Fish salting and drying](Data-Research#inventions), [F5 Water and wind mills](Data-Research#inventions), [F7 Ever-normal granaries](Data-Research#inventions), [G1 Written law codes](Data-Research#inventions), [G3 Tax registers](Data-Research#inventions), [G4 Examination system](Data-Research#inventions), [L1 Temple and monastery schools](Data-Research#inventions), [L2 Madrasa networks](Data-Research#inventions), [L3 Observatories](Data-Research#inventions), [L5 printing](Data-Research#inventions), [T4 Paper money](Data-Research#inventions), [W3 Bombards](Data-Research#inventions), [W4 Wagon fort](Data-Research#inventions), [W5 gunpowder\_infantry](Data-Research#inventions), [S1 Magnetic compass and sea charts](Data-Research#inventions), [S2 Lateen and junk rigging](Data-Research#inventions), [L9 Variolation](Data-Research#inventions) |
| korea | korea | [F01 Ox plough](Data-Research#inventions), [F02 Heavy plough](Data-Research#inventions), [F03 Riding and pack animals](Data-Research#inventions), [B01 Wheel and carts](Data-Research#inventions), [B02 Dressed stone](Data-Research#inventions), [C01 Iron smelting](Data-Research#inventions), [C02 Steel forging](Data-Research#inventions), [C03 Gunpowder](Data-Research#inventions), [G01 Writing](Data-Research#inventions), [T01 Coinage](Data-Research#inventions), [L01 Positional numbers](Data-Research#inventions), [S01 Sail](Data-Research#inventions), [S02 Sternpost rudder](Data-Research#inventions) | [B1 Stone castles](Data-Research#inventions), [C1 Paper making](Data-Research#inventions), [C2 Blast furnace](Data-Research#inventions), [C3 Porcelain kilns](Data-Research#inventions), [F2 Wet-rice terracing](Data-Research#inventions), [F4 Fish salting and drying](Data-Research#inventions), [F5 Water and wind mills](Data-Research#inventions), [F7 Ever-normal granaries](Data-Research#inventions), [G1 Written law codes](Data-Research#inventions), [G3 Tax registers](Data-Research#inventions), [G4 Examination system](Data-Research#inventions), [G5 Royal chancery](Data-Research#inventions), [L1 Temple and monastery schools](Data-Research#inventions), [L4 Metal movable type](Data-Research#inventions), [L5 printing](Data-Research#inventions), [S1 Magnetic compass and sea charts](Data-Research#inventions), [S2 Lateen and junk rigging](Data-Research#inventions), [W3 Bombards](Data-Research#inventions) |
| japan | japan | [F01 Ox plough](Data-Research#inventions), [F03 Riding and pack animals](Data-Research#inventions), [B01 Wheel and carts](Data-Research#inventions), [B02 Dressed stone](Data-Research#inventions), [C01 Iron smelting](Data-Research#inventions), [C02 Steel forging](Data-Research#inventions), [G01 Writing](Data-Research#inventions), [T01 Coinage](Data-Research#inventions), [L01 Positional numbers](Data-Research#inventions), [S01 Sail](Data-Research#inventions), [S02 Sternpost rudder](Data-Research#inventions) | [B1 Stone castles](Data-Research#inventions), [C1 Paper making](Data-Research#inventions), [C2 Blast furnace](Data-Research#inventions), [C4 Silk and cotton weaving](Data-Research#inventions), [F2 Wet-rice terracing](Data-Research#inventions), [F4 Fish salting and drying](Data-Research#inventions), [F5 Water and wind mills](Data-Research#inventions), [G1 Written law codes](Data-Research#inventions), [G2 Feudal grants](Data-Research#inventions), [G5 Royal chancery](Data-Research#inventions), [L1 Temple and monastery schools](Data-Research#inventions), [S1 Magnetic compass and sea charts](Data-Research#inventions), [S2 Lateen and junk rigging](Data-Research#inventions), [W2 Heavy armoured cavalry](Data-Research#inventions) |
| se\_mainland | dai\_viet, champa, lan\_xang, lan\_na, ayutthaya, khmer, ava, pegu | [F01 Ox plough](Data-Research#inventions), [F03 Riding and pack animals](Data-Research#inventions), [B01 Wheel and carts](Data-Research#inventions), [B02 Dressed stone](Data-Research#inventions), [C01 Iron smelting](Data-Research#inventions), [C02 Steel forging](Data-Research#inventions), [C03 Gunpowder](Data-Research#inventions), [G01 Writing](Data-Research#inventions), [T01 Coinage](Data-Research#inventions), [S01 Sail](Data-Research#inventions) | [B1 Stone castles](Data-Research#inventions), [C1 Paper making](Data-Research#inventions), [C2 Blast furnace](Data-Research#inventions), [C4 Silk and cotton weaving](Data-Research#inventions), [F2 Wet-rice terracing](Data-Research#inventions), [F4 Fish salting and drying](Data-Research#inventions), [G1 Written law codes](Data-Research#inventions), [G5 Royal chancery](Data-Research#inventions), [L1 Temple and monastery schools](Data-Research#inventions) |
| se\_maritime | majapahit, malacca, brunei | [F01 Ox plough](Data-Research#inventions), [F03 Riding and pack animals](Data-Research#inventions), [B01 Wheel and carts](Data-Research#inventions), [B02 Dressed stone](Data-Research#inventions), [C01 Iron smelting](Data-Research#inventions), [C02 Steel forging](Data-Research#inventions), [C03 Gunpowder](Data-Research#inventions), [G01 Writing](Data-Research#inventions), [T01 Coinage](Data-Research#inventions), [S01 Sail](Data-Research#inventions) | [C1 Paper making](Data-Research#inventions), [C4 Silk and cotton weaving](Data-Research#inventions), [F2 Wet-rice terracing](Data-Research#inventions), [F4 Fish salting and drying](Data-Research#inventions), [G1 Written law codes](Data-Research#inventions), [G5 Royal chancery](Data-Research#inventions), [L1 Temple and monastery schools](Data-Research#inventions), [S2 Lateen and junk rigging](Data-Research#inventions), [S3 Outrigger voyaging](Data-Research#inventions), [T5 Monsoon sailing calendars](Data-Research#inventions) |
| horn | ethiopia, kaffa, hadiya, oromo | [F01 Ox plough](Data-Research#inventions), [F03 Riding and pack animals](Data-Research#inventions), [B02 Dressed stone](Data-Research#inventions), [C01 Iron smelting](Data-Research#inventions), [G01 Writing](Data-Research#inventions) | [B1 Stone castles](Data-Research#inventions), [C1 Paper making](Data-Research#inventions), [G1 Written law codes](Data-Research#inventions), [G5 Royal chancery](Data-Research#inventions), [L1 Temple and monastery schools](Data-Research#inventions) |
| swahili\_somali | adal, ajuran, kilwa, mombasa, zanzibar, sofala, comoros, warsangali, afar\_dankali, beja, madagascar\_north\_trading\_towns | [F03 Riding and pack animals](Data-Research#inventions), [B02 Dressed stone](Data-Research#inventions), [C01 Iron smelting](Data-Research#inventions), [G01 Writing](Data-Research#inventions), [T01 Coinage](Data-Research#inventions), [S01 Sail](Data-Research#inventions) | [C1 Paper making](Data-Research#inventions), [F4 Fish salting and drying](Data-Research#inventions), [G1 Written law codes](Data-Research#inventions), [L1 Temple and monastery schools](Data-Research#inventions), [L2 Madrasa networks](Data-Research#inventions), [S2 Lateen and junk rigging](Data-Research#inventions), [T5 Monsoon sailing calendars](Data-Research#inventions) |
| sahel | mali, songhai, jolof, kano, kanem\_bornu, air\_agadez, bulala, katsina, timbuktu\_tuareg, biram, gobir, zamfara, zazzau, takrur\_futa\_toro, darfur\_tunjur, kaabu, sine, fezzan, mzab, touggourt\_ouargla, tuat, sanhaja\_zenaga, tuareg\_kel\_ajjer, tubu\_teda | [F03 Riding and pack animals](Data-Research#inventions), [C01 Iron smelting](Data-Research#inventions), [G01 Writing](Data-Research#inventions) | [B4 Earthwork ring forts](Data-Research#inventions), [C1 Paper making](Data-Research#inventions), [F4 Fish salting and drying](Data-Research#inventions), [G1 Written law codes](Data-Research#inventions), [L1 Temple and monastery schools](Data-Research#inventions), [L2 Madrasa networks](Data-Research#inventions), [T1 Caravanserai networks](Data-Research#inventions), [L9 Variolation](Data-Research#inventions) |
| volta | mossi, bono, dagbon, borgu, voltaic\_stateless\_societies, mande\_kafus | [F03 Riding and pack animals](Data-Research#inventions), [C01 Iron smelting](Data-Research#inventions) | [B4 Earthwork ring forts](Data-Research#inventions) |
| forest\_africa | benin, kongo, mutapa, loango, tio, oyo, allada\_tado, igala, ijebu, kwararafa, akan\_forest, cross\_river\_societies, igbo\_societies, ijaw\_delta, middle\_belt\_societies, upper\_guinea\_coast, windward\_coast\_peoples, ankole, buganda, karagwe, kitara, rwanda, madagascar\_coast, madagascar\_highlands, khoikhoi, san, kunene\_peoples, equatorial\_forest\_societies, maasai\_kenya\_highlands, makua\_lomwe, delagoa\_lowland\_chiefdoms, nguni, sotho\_tswana, thulamela, tonga\_zambezi, luba, lake\_malawi\_peoples, mbundu\_chiefdoms, ovimbundu\_central\_angola, kwango\_kasai\_societies, gran\_canaria, tenerife\_menceyatos, la\_palma | [C01 Iron smelting](Data-Research#inventions) | [B4 Earthwork ring forts](Data-Research#inventions), [F4 Fish salting and drying](Data-Research#inventions) |
| mesoamerica | aztecs, zapotec, maya, purepecha | [B02 Dressed stone](Data-Research#inventions), [G01 Writing](Data-Research#inventions) | [F4 Fish salting and drying](Data-Research#inventions), [G1 Written law codes](Data-Research#inventions), [L1 Temple and monastery schools](Data-Research#inventions), [F9 Maize, potato and cassava](Data-Research#inventions) |
| andes | inca, chimu, muisca | [B02 Dressed stone](Data-Research#inventions), [S01 Sail](Data-Research#inventions) | [F3 Qanat and canal irrigation](Data-Research#inventions), [F4 Fish salting and drying](Data-Research#inventions), [G6 Quipu and knot records](Data-Research#inventions), [F9 Maize, potato and cassava](Data-Research#inventions) |
| north\_america | iroquois, huron, cherokee, creek, pueblo, apalachee, calusa, caddo, casqui\_pacaha, chumash, coast\_salish, cofitachequi, fort\_ancient, hopi, lenape, mandan\_hidatsa, natchez\_plaquemine, neutral\_erie, ojibwe\_anishinaabe, oneota, oodham, pacific\_northwest, pawnee\_plains\_villagers, powhatan\_precursors, southern\_new\_england\_algonquians, st\_lawrence\_iroquoians, timucua, tlingit\_haida, wakashan | none | [F4 Fish salting and drying](Data-Research#inventions), [F9 Maize, potato and cassava](Data-Research#inventions) |

## Start add (provisional)

| Key | Value |
|---|---|
| `adal` | [F01 Ox plough](Data-Research#inventions) |
| `ajuran` | [B1 Stone castles](Data-Research#inventions) |
| `aragon` | [S2 Lateen and junk rigging](Data-Research#inventions), [T2 Double-entry bookkeeping](Data-Research#inventions), [T3 Bills of exchange](Data-Research#inventions) |
| `ayutthaya` | [S2 Lateen and junk rigging](Data-Research#inventions) |
| `aztecs` | [F6 Chinampa and raised fields](Data-Research#inventions) |
| `bahmanis` | [L2 Madrasa networks](Data-Research#inventions) |
| `bengal` | [L2 Madrasa networks](Data-Research#inventions), [S1 Magnetic compass and sea charts](Data-Research#inventions), [S2 Lateen and junk rigging](Data-Research#inventions) |
| `benin` | [L9 Variolation](Data-Research#inventions) |
| `bohemia` | [W4 Wagon fort](Data-Research#inventions) |
| `brunei` | [L2 Madrasa networks](Data-Research#inventions) |
| `burgundy` | [T2 Double-entry bookkeeping](Data-Research#inventions), [T3 Bills of exchange](Data-Research#inventions), [F8 Polder drainage](Data-Research#inventions) |
| `byzantium` | [L01 Positional numbers](Data-Research#inventions), [S1 Magnetic compass and sea charts](Data-Research#inventions), [S2 Lateen and junk rigging](Data-Research#inventions), [G3 Tax registers](Data-Research#inventions), [T2 Double-entry bookkeeping](Data-Research#inventions) |
| `castile` | [S2 Lateen and junk rigging](Data-Research#inventions), [S4 Carrack and caravel](Data-Research#inventions), [F11 Horse breeding studs](Data-Research#inventions) |
| `champa` | [S2 Lateen and junk rigging](Data-Research#inventions) |
| `cologne` | [T2 Double-entry bookkeeping](Data-Research#inventions), [T3 Bills of exchange](Data-Research#inventions) |
| `cyprus` | [S2 Lateen and junk rigging](Data-Research#inventions) |
| `dai_viet` | [C3 Porcelain kilns](Data-Research#inventions), [G4 Examination system](Data-Research#inventions), [W3 Bombards](Data-Research#inventions) |
| `delhi` | [L2 Madrasa networks](Data-Research#inventions) |
| `florence` | [T2 Double-entry bookkeeping](Data-Research#inventions), [T3 Bills of exchange](Data-Research#inventions) |
| `genoa` | [T2 Double-entry bookkeeping](Data-Research#inventions), [T3 Bills of exchange](Data-Research#inventions), [S2 Lateen and junk rigging](Data-Research#inventions), [S4 Carrack and caravel](Data-Research#inventions) |
| `granada` | [S1 Magnetic compass and sea charts](Data-Research#inventions), [S2 Lateen and junk rigging](Data-Research#inventions) |
| `great_horde` | [L2 Madrasa networks](Data-Research#inventions) |
| `gujarat` | [L2 Madrasa networks](Data-Research#inventions), [S1 Magnetic compass and sea charts](Data-Research#inventions), [S2 Lateen and junk rigging](Data-Research#inventions), [T5 Monsoon sailing calendars](Data-Research#inventions) |
| `hamburg` | [T2 Double-entry bookkeeping](Data-Research#inventions), [T3 Bills of exchange](Data-Research#inventions) |
| `hejaz` | [F11 Horse breeding studs](Data-Research#inventions) |
| `hungary` | [W4 Wagon fort](Data-Research#inventions) |
| `inca` | [B1 Stone castles](Data-Research#inventions), [B2 Roads and post stations](Data-Research#inventions), [F6 Chinampa and raised fields](Data-Research#inventions), [L1 Temple and monastery schools](Data-Research#inventions) |
| `jaunpur` | [L2 Madrasa networks](Data-Research#inventions) |
| `jurchens` | [F01 Ox plough](Data-Research#inventions) |
| `kashmir` | [L2 Madrasa networks](Data-Research#inventions) |
| `kilwa` | [B1 Stone castles](Data-Research#inventions) |
| `knights_of_rhodes` | [S2 Lateen and junk rigging](Data-Research#inventions) |
| `luneburg` | [T2 Double-entry bookkeeping](Data-Research#inventions), [T3 Bills of exchange](Data-Research#inventions) |
| `majapahit` | [B1 Stone castles](Data-Research#inventions) |
| `malacca` | [L2 Madrasa networks](Data-Research#inventions) |
| `mali` | [B2 Roads and post stations](Data-Research#inventions) |
| `malwa` | [L2 Madrasa networks](Data-Research#inventions) |
| `mamluks` | [C5 Glass and lenses](Data-Research#inventions), [S1 Magnetic compass and sea charts](Data-Research#inventions), [S2 Lateen and junk rigging](Data-Research#inventions), [T2 Double-entry bookkeeping](Data-Research#inventions), [F11 Horse breeding studs](Data-Research#inventions) |
| `maya` | [L01 Positional numbers](Data-Research#inventions) |
| `milan` | [T2 Double-entry bookkeeping](Data-Research#inventions), [T3 Bills of exchange](Data-Research#inventions) |
| `modena` | [T2 Double-entry bookkeeping](Data-Research#inventions) |
| `morocco` | [S1 Magnetic compass and sea charts](Data-Research#inventions), [S2 Lateen and junk rigging](Data-Research#inventions) |
| `multan` | [L2 Madrasa networks](Data-Research#inventions) |
| `muscovy` | [W4 Wagon fort](Data-Research#inventions) |
| `mutapa` | [B02 Dressed stone](Data-Research#inventions) |
| `naples` | [S2 Lateen and junk rigging](Data-Research#inventions) |
| `navarre` | [F11 Horse breeding studs](Data-Research#inventions) |
| `nogai` | [L2 Madrasa networks](Data-Research#inventions) |
| `oman` | [T5 Monsoon sailing calendars](Data-Research#inventions), [S1 Magnetic compass and sea charts](Data-Research#inventions), [S2 Lateen and junk rigging](Data-Research#inventions), [F11 Horse breeding studs](Data-Research#inventions) |
| `ottomans` | [B2 Roads and post stations](Data-Research#inventions), [G3 Tax registers](Data-Research#inventions), [S1 Magnetic compass and sea charts](Data-Research#inventions), [S2 Lateen and junk rigging](Data-Research#inventions), [W3 Bombards](Data-Research#inventions), [W5 gunpowder\_infantry](Data-Research#inventions), [C5 Glass and lenses](Data-Research#inventions), [L9 Variolation](Data-Research#inventions) |
| `papal_states` | [T2 Double-entry bookkeeping](Data-Research#inventions) |
| `pegu` | [S2 Lateen and junk rigging](Data-Research#inventions), [T5 Monsoon sailing calendars](Data-Research#inventions) |
| `portugal` | [S2 Lateen and junk rigging](Data-Research#inventions), [S4 Carrack and caravel](Data-Research#inventions) |
| `provence` | [S2 Lateen and junk rigging](Data-Research#inventions) |
| `pueblo` | [B02 Dressed stone](Data-Research#inventions), [F3 Qanat and canal irrigation](Data-Research#inventions) |
| `ragusa` | [T2 Double-entry bookkeeping](Data-Research#inventions), [S2 Lateen and junk rigging](Data-Research#inventions) |
| `scotland` | [W6 Pike squares](Data-Research#inventions) |
| `sindh` | [L2 Madrasa networks](Data-Research#inventions) |
| `switzerland` | [W6 Pike squares](Data-Research#inventions) |
| `timurids` | [L3 Observatories](Data-Research#inventions), [W3 Bombards](Data-Research#inventions) |
| `tunis` | [S1 Magnetic compass and sea charts](Data-Research#inventions), [S2 Lateen and junk rigging](Data-Research#inventions) |
| `venice` | [T2 Double-entry bookkeeping](Data-Research#inventions), [T3 Bills of exchange](Data-Research#inventions), [C5 Glass and lenses](Data-Research#inventions), [G3 Tax registers](Data-Research#inventions), [S2 Lateen and junk rigging](Data-Research#inventions) |
| `vijayanagar` | [S1 Magnetic compass and sea charts](Data-Research#inventions), [S2 Lateen and junk rigging](Data-Research#inventions), [T5 Monsoon sailing calendars](Data-Research#inventions) |
| `yemen` | [T5 Monsoon sailing calendars](Data-Research#inventions), [S1 Magnetic compass and sea charts](Data-Research#inventions), [S2 Lateen and junk rigging](Data-Research#inventions), [F11 Horse breeding studs](Data-Research#inventions) |

## Start remove (provisional)

| Key | Value |
|---|---|
| `chimu` | [G6 Quipu and knot records](Data-Research#inventions) |
| `gondwana` | [C03 Gunpowder](Data-Research#inventions) |
| `muisca` | [B02 Dressed stone](Data-Research#inventions), [S01 Sail](Data-Research#inventions) |
| `purepecha` | [G01 Writing](Data-Research#inventions), [G1 Written law codes](Data-Research#inventions), [L1 Temple and monastery schools](Data-Research#inventions) |

## Starts (provisional)

### 1378

> The 20 September 1378 start (plan-1378 section 3.2, D-RSCH-23). Applied only to a campaign that starts in 1378, on top of start\_groups, start\_add and start\_remove. join puts a realm in a group for this start, ids not yet on the map included (each is checked once it is a map nation); add and remove change a realm's set for this start.

| Name | jalayirids | hormuz | timurids | morea | padua | pisa | visconti pavia | sicily | flanders | more |
|---|---|---|---|---|---|---|---|---|---|---|
| date |  |  |  |  |  |  |  |  |  | year: 1378; month: 9; day: 20 |
| join | islamic | islamic | khanates | orthodox | latin | latin | latin | latin | latin | muzaffarids: islamic; kartids: islamic; sarbadars: islamic; germiyan: islamic; aydin: islamic; mentese: islamic; saruhan: islamic; hamid: islamic; eretnids: islamic; white horde: hordes; naghachu: hordes; sufids: khanates; bulgaria tarnovo: orthodox; bulgaria vidin: orthodox; dobruja: orthodox; brankovic: orthodox; zeta: orthodox; suzdal nizhny: orthodox; achaea: latin; athens: latin; verona: latin; oristano: latin; brabant: latin; holland: latin; saxe wittenberg: latin; lubeck: latin; riga: latin; cologne city: latin; avignon papacy: latin; yunnan yuan: china; japan southern court: japan; kamakura kubo: japan; ryukyu: japan; hokuzan: japan; nanzan: japan; calicut: south\_asia; kotte: south\_asia; nepal malla: south\_asia; sukhothai: se\_mainland; singapura: se\_maritime; tondo: se\_maritime; ternate: se\_maritime; ifat: swahili\_somali; mogadishu: swahili\_somali; great zimbabwe: forest\_africa; tepanecs: mesoamerica; quitu cara: andes |
| add | [L3 Observatories](Data-Research#inventions) | [T5 Monsoon sailing calendars](Data-Research#inventions), [S1 Magnetic compass and sea charts](Data-Research#inventions), [S2 Lateen and junk rigging](Data-Research#inventions), [F11 Horse breeding studs](Data-Research#inventions) |  | [L01 Positional numbers](Data-Research#inventions), [S1 Magnetic compass and sea charts](Data-Research#inventions), [S2 Lateen and junk rigging](Data-Research#inventions) | [T2 Double-entry bookkeeping](Data-Research#inventions) | [T2 Double-entry bookkeeping](Data-Research#inventions), [T3 Bills of exchange](Data-Research#inventions), [S2 Lateen and junk rigging](Data-Research#inventions) | [T2 Double-entry bookkeeping](Data-Research#inventions), [T3 Bills of exchange](Data-Research#inventions) | [S2 Lateen and junk rigging](Data-Research#inventions) | [T2 Double-entry bookkeeping](Data-Research#inventions), [T3 Bills of exchange](Data-Research#inventions), [F8 Polder drainage](Data-Research#inventions) | brabant: [T2 Double-entry bookkeeping](Data-Research#inventions), [T3 Bills of exchange](Data-Research#inventions); holland: [F8 Polder drainage](Data-Research#inventions); lubeck: [T2 Double-entry bookkeeping](Data-Research#inventions), [T3 Bills of exchange](Data-Research#inventions); cologne city: [T2 Double-entry bookkeeping](Data-Research#inventions), [T3 Bills of exchange](Data-Research#inventions); avignon papacy: [T2 Double-entry bookkeeping](Data-Research#inventions); calicut: [S1 Magnetic compass and sea charts](Data-Research#inventions), [S2 Lateen and junk rigging](Data-Research#inventions), [T5 Monsoon sailing calendars](Data-Research#inventions); great zimbabwe: [B02 Dressed stone](Data-Research#inventions) |
| remove |  |  | [L3 Observatories](Data-Research#inventions), [W3 Bombards](Data-Research#inventions) |  |  |  |  |  |  | yunnan yuan: [G3 Tax registers](Data-Research#inventions); ottomans: [W3 Bombards](Data-Research#inventions), [W5 gunpowder\_infantry](Data-Research#inventions), [G3 Tax registers](Data-Research#inventions); bohemia: [W4 Wagon fort](Data-Research#inventions); hungary: [W4 Wagon fort](Data-Research#inventions); portugal: [S4 Carrack and caravel](Data-Research#inventions); castile: [S4 Carrack and caravel](Data-Research#inventions); ming: [G3 Tax registers](Data-Research#inventions) |
