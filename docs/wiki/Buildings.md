# Buildings

Buildings are how your provinces put people to work. Every farm, mine, loom house, church, castle and harbour stands on a tile, a town slot or across the whole province, gives job slots to one class of people, makes something, and costs gold, materials, labourers and months to build and gold every month to keep. This page covers where buildings can go, what they cost, how sites run, upgrades and conversions, upkeep and condition, who owns them, what the people build for themselves, the full catalogue with its landmarks, and the screens for managing it all.

## How it works

### What a building is

Every building has:

| Field | Meaning |
|---|---|
| Type | Farm, loom house, castle … |
| Place | The tile, town slot or ring-works position it stands on |
| Step | How far it has been upgraded: 1 to 3, castles and a few others more |
| Owner | Crown, lord, clergy, town, merchant house or company, or the people |
| Jobs | Slots for **one class**, and how many are filled. Filled slots make wares; empty ones make nothing |
| Makes | What it produces |
| Needs | Wares it eats, and anything that must be nearby |
| Condition | Sound, neglected, damaged or ruined |
| Upkeep | Gold the owner pays every month, shown as a yearly total |

A building has at most one effect besides its jobs and wares, and never gives a flat percentage to a whole country.

### Where buildings go

- **Land tiles** (fields, pasture, woods, marsh, waste) each hold one land building that fits the tile's use.
- **Shore tiles** each hold one shore building: fishery, saltworks, harbour, shipyard, bridge, lighthouse or naval base.
- The **castle tile** holds the province's one castle. Its granary is part of the castle, not a second building.
- **Town slots**, by town size:

| Town size | Hamlet | Village | Market town | Town | City | Great city |
|---|---|---|---|---|---|---|
| Town slots | 1 | 2 | 4 | 6 | 9 | 12 |

The capital gets one extra slot, held for the palace. Town walls and landmarks outside the town (a monastery, an observatory) don't use a slot.

- **Ring works** belong to the whole province and take no tile or slot: road, canal, town walls, wells and drains, dykes and watchtower line. One of each per province, with steps.

If a town shrinks below its building count, the buildings stay but the extra ones are **neglected** until the town grows back. You choose which on a prompt; the AI drops the newest.

**Limits:**

| Limit | Buildings |
|---|---|
| One per province | Market, seat, school, mint, drill yard, arsenal, hospital, bank, harbour, shipyard, lighthouse, rail station, power station |
| One per faith per town | House of worship |
| One per realm, in the capital | Palace, chancery, diet hall, hostage residence, parliament house |
| As many as there are places | Ware-making buildings: farms, ranches, mines, loom houses, forges and the rest |

### What a building costs

Every building and every step costs **gold, materials, labourers and months**.

- The owner pays the **gold up front** when the site starts, from their own treasury (the crown's, a lord's wealth, the clergy's or the town's).
- **Gold and months**, but not materials, are multiplied by the ground: farmland ×1, hills ×1.25, mountains ×2, jungle ×2.
- **Cancelling** refunds half the gold and the materials not yet used.

**Materials** (timber, stone, bricks, earth, iron, steel, concrete) come from the province's own wares first, then from any of your provinces in reach (the province itself, one ring away, or further along roads and rivers), then are bought at the province's price:

| Material | Bought for (gold a load) | Notes |
|---|---|---|
| Timber | 0.5 | |
| Stone | 0.5 | Double price more than 3 provinces from any quarry |
| Bricks | 0.8 | Count as stone, one for one |
| Earth | free, made on site | Instead of stone in drylands, desert or savanna, but the building's upkeep doubles |
| Iron | 2 | From era IV |
| Steel | 3 | From era VI |
| Concrete | 3 | From era VI |

Bought materials are dearer in a province with few traders.

**Labourers.** Every site needs a **crew** (for example 500 for a farm, 3,000 for a stone castle, 6,000 for a canal). The crew comes from the province's **homeless first**; while they work they are fed, steal nothing and don't count toward homeless trouble. If there aren't enough homeless, the rest come from every class by share, leaving their slots empty while they build. With half a crew the site takes twice the months; with none it stops. When the site is done, homeless crew who fit the new building's class move into its slots, the rest go back to being homeless, and other classes return to their slots.

### Sites

- One site per place at a time.
- The crown runs **two sites per province** at once: one on the land, one in the town.
- A **master of works** official adds one more land and one more town site and halves the months.
- **Lords** run their own sites in their own provinces with their own gold, without using the crown's.
- Sites on the land stop in the coldest month of a cold climate and the wettest month of a monsoon climate.
- Every site stops while an enemy army is in the province. While the province is occupied, sites stop and the occupier can loot their materials. A sacked town loses its town site.

Buildings can also be gained by a lord, the clergy, a town or the people building them, by conquest (with their owners if they stay), by an event, or from the start of the game.

### Steps and upgrades

Each step has its own gold, materials and months. While a building is being upgraded it keeps working at its old step, except a castle, whose walls count one step lower during the work. An upgrade isn't allowed until its needs are met (an invention, a town size, a nearby building, a charter).

A building drops **one step** after 10 years of neglect, when sacked, or when hit by an earthquake. A step-1 building that falls becomes ruined.

The **market** shows how steps work: weekly market (1,500 market folk, village or bigger), yearly fair (2,400, needs a market charter and a market town), trading house (3,000, needs T3 *Bills of exchange* and a town or bigger).

### Upkeep and condition

**Upkeep** is paid every month by the owner, a twelfth of the yearly figure:

| Group | Yearly upkeep |
|---|---|
| Farms, ranches, fisheries, lumber camps | 0 to 0.5 gold |
| Mines, quarries, craft buildings, markets | 0.5 to 2 |
| Schools, hospitals, almshouses | 2 to 6 |
| Castles | 3 (earthwork) to 20 (star fort), more with a garrison |
| Landmarks and the palace | 5 to 30 |

The clergy pay for houses of worship unless the crown takes it over. Your total building upkeep shows on the Treasury card's Upkeep line.

**Condition:**

| Condition | How it gets there | Works | Way back |
|---|---|---|---|
| **Sound** | | Fully | |
| **Neglected** | Upkeep unpaid in a month, or the town shrinks below it | At half | Upkeep paid again for a full season (3 months) |
| **Damaged** | Fire, flood, earthquake, a siege breach (castle), a bad raid | At half, and nothing in its first season | Repair at half gold, half materials, half months |
| **Ruined** | Its tile burned, a town building plundered, a castle razed, a step-1 building after 10 years of neglect | Not at all | Rebuild at half cost, or clear it for something else |

In peace, burned (ruined) land buildings rebuild by themselves, one a year; town buildings need an owner to pay.

### How buildings are lost or damaged

- Foraging or looting armies burn land buildings tile by tile.
- A **raid** damages one building, or ruins it if the raid is big. Town walls stop raids reaching town buildings.
- A **plundered town** loses 1 in 3 of its town buildings, or 1 in 6 with town walls.
- **Rebels** holding a province loot one town building a season, the market first.
- A **town fire** is rolled each year in timber towns, more likely in big towns and shanty camps and less where most buildings are stone or brick; it damages one to three town buildings.
- A **flood** in a river or marsh province damages land buildings on shore and marsh tiles; a dyke broken in war turns fields to marsh.
- An **earthquake** event in a quake region damages one building in three and takes castles a step down.
- **Demolishing** returns a quarter of the materials and overflows the workers. A peace treaty can demand named castles be demolished.
- A tile changing use (woods cleared, the town growing over fields) ends the building that no longer fits. A mine closes when its seam runs out.

### Converting

- A farm changes its crop (grain, flax, cotton, dyes) in one season at no cost. While it grows anything but grain it feeds nobody, and the province card warns you if that would leave the province short.
- A house of worship can be given to another faith, when and at the cost in grievances [Religion](Religion) sets.
- A craft building can change its trade, and a factory its product, at half the cost of building the new one.
- **Slighting** pulls a castle down to a ruin (so no rebel or rival can use it), which rebuilds at half cost.

### Owners

The owner pays upkeep and decides upgrades, demolition and conversion.

| Owner | What they build and own |
|---|---|
| **Crown** | Anything. If the crown pays for a building in a lord's province, the lord owns it and his loyalty rises one step |
| **Lord** | By trait: Builder the most; Greedy markets and mines; Pious houses of worship and monasteries; Warlike castles and drill yards; by his wealth and what his provinces lack. His buildings go with him if he defects, and come to the crown if his line dies out or his land is seized |
| **Clergy** | Houses of worship (one in every town of their faith first), then monasteries, almshouses where there are homeless, hospitals in plague years, and church schools, by the faith's share |
| **Town** (with a Town law charter) | Market steps, walls, a bridge, then guild halls and craft buildings, by traders and wealth. The crown can't demolish or seize them without breaking the charter |
| **Merchant house or company** (Mining right or company charter, T8 and T9) | Mines, warehouses, trading houses, plantations and overseas posts, by trade value; keeps half their output |
| **The people (commons)** | Basic land buildings, with no upkeep. Demolishing one gives the province *Burned homes* |

### What the people build themselves

- **Village works**: at the end of each year, in a province at peace for 5 years with more than 3 months of food in store and homeless people or full slots, there is a 20 % chance the people put up a step-1 farm, ranch, fishery or lumber camp on an empty matching tile, owned by the commons.
- **Craft buildings appearing**: now and then a loom house, tannery, kiln or brewery appears in a town with a market, homeless people and the raw ware nearby, owned by the town or the commons. Craftsmen fleeing persecution abroad can found one.

### The catalogue

All numbers are step 1 on farmland and are placeholders. "g" is gold, "mo" months.

**Food and land**

| Building | Place | Jobs | Makes or does | Unlocked by | Cost |
|---|---|---|---|---|---|
| Farm | Fields | 12,000 farmers | Grain, or a crop (flax, hemp, cotton, dye plants, later tobacco) | Start | 30 g, 10 timber, 6 mo |
| Mill farm (step 2) | | +0 | +25 % gold from its grain; needs a river or windy ground | F5 | 40 g, 20 timber, 8 mo |
| Enclosed farm (step 3) | | −3,000 farmers (they overflow) | +1 harvest step | F15 | 60 g, 20 timber, 12 mo |
| Rice paddy | Fields on wet ground or by a shore | 18,000 farmers | Rice, two harvests a year; needs shore or irrigation | F2 | 40 g, 10 timber, 12 mo |
| Terrace | Fields on hills or mountains | 12,000 farmers | Grain at the farmland rate | F2, or Andean start | 50 g, 20 stone, 24 mo |
| Raised fields | Marsh | 12,000 farmers | Grain; the marsh stays marsh | F6 | 40 g, 10 timber, 18 mo |
| Plantation | Fields on tropical ground | 12,000 farmers | Sugar, spices, cotton, tobacco, coffee, cocoa; never a forced-labour bonus | F10 | 80 g, 20 timber, 24 mo |
| Grove | Fields on warm ground | 6,000 farmers | By region: grapes, olive oil, dates, silk, tea; bears 3 years after it is built | Start | 40 g, 10 timber, 12 mo |
| Ranch | Pasture | 3,000 herders | Herds, wool, hides | Start | 20 g, 10 timber, 4 mo |
| Horse stud | Pasture | 3,000 herders | Horses; camels on desert; elephants in South and Southeast Asian forests | F11 (elephant stables at start in their regions) | 60 g, 20 timber, 12 mo |
| Irrigation works | Waste or drylands fields | 1,500 farmers | The tile works as fields | F3 | 60 g, 20 stone, 24 mo |
| Monastery | Fields | 300 clergy and 6,000 farmers | Grain at farm rate; makes clergy; 20 student seats with L1; missionaries; needs a faith with monks or nuns | Start | 90 g, 40 stone, 36 mo |

**Extraction and materials**

| Building | Place | Jobs | Makes | Unlocked by | Cost |
|---|---|---|---|---|---|
| Lumber camp | Woods | 1,500 woodsmen | Timber; furs in boreal woods. Cutting faster than woods regrow wears the tile | Start | 10 g, 4 mo |
| Mine | Waste, hills or mountains with a seam | 6,000 miners | Silver, gold, iron, copper, tin, salt, saltpetre, gems; coal from era IV. Needs timber and seams | Start; step 2 shaft mine C6 (+50 %, deeper seams); step 3 steam-pumped C13 | 60 g, 20 timber, 12 mo |
| Quarry | Waste, hills or mountains | 3,000 miners | Stone (40 a year at full jobs); marble at Carrara and Makrana | Start | 20 g, 10 timber, 6 mo |
| Saltworks | Shore on a dry or warm coast | 1,500 miners | Salt | Start | 20 g, 10 timber, 6 mo |
| Saltpetre works | Town slot | 900 craftsmen | Saltpetre; needs a ranch or horse stud in the province | W3 | 30 g, 10 timber, 6 mo |

**Crafts and industry** (town slots)

| Building | Jobs | Makes, from | Unlocked by | Further steps |
|---|---|---|---|---|
| Loom house | 1,500 craftsmen | Cloth from wool, linen from flax, silk cloth, cotton cloth (30 cloth from 30 wool) | Start (35 g, 10 timber, 6 mo, crew 1,000) | Draper's hall (+900 jobs, dyes its cloth; 80 g, 20 bricks, 8 mo) · Weaving manufactory (C11, +1,500 jobs, needs an official; 160 g, 40 stone, 18 mo) |
| Forge | 1,500 craftsmen | Tools and arms from iron and charcoal | Start | Bloomery works (C2, double) · Iron works (C12, no timber) |
| Kiln | 1,500 craftsmen | Pottery, bricks; porcelain with C3 | Start | Brickworks (double bricks) · Porcelain works (C3) |
| Tannery | 1,500 craftsmen | Leather from hides | Start | Saddlery (light horse train a month faster here) |
| Brewery or winery | 900 craftsmen | Beer, wine, spirits from grain or grapes | Start | Distillery (spirits, which keep and travel) |
| Press | 900 craftsmen | Books from paper | L5 or L4 | Printing house (schools in reach cost less) |
| Paper mill | 900 craftsmen | Paper from rags, flax or linen, or bamboo | C1 | |
| Powder mill | 900 craftsmen | Powder from saltpetre and charcoal | W3; step 2 C10 (double) | |
| Gun foundry | 900 craftsmen | Guns from bronze (copper and tin) or iron | W3 | Cannon works (C2, iron guns, cheaper) |
| Factory | 6,000 craftsmen | One product: textile mill (C14), iron and steel works (C18), engine works, cannery (F18), chemical works (C20), cement works (B13). Does the work of several craft buildings; makes Smoke; needs coal or water power | by product | Powered factory (C19, +50 %, needs a power station) · Assembly plant (C21, double) |
| Power station | 900 craftsmen | Power for the province's factories, from coal or a river (B14) | C19 | |

**Trade** (rules on [Trade](Trade))

| Building | Place | Jobs | Does | Unlocked by | Cost |
|---|---|---|---|---|---|
| Market | Town slot | 1,500 / 2,400 / 3,000 market folk | Weekly market: a trade endpoint · yearly fair: traders hired here, draws from further · trading house: traders start with more goods, bills of exchange | Start; step 3 T3 | 40 g / 100 g, 30 stone, 12 mo / 200 g, 40 stone, 18 mo |
| Caravanserai (khan, funduq, tambo) | Town slot | 900 market folk | Rest stop: carried trade value grows faster; needs a road; T1 doubles its room | Start | 40 g, 20 stone, 12 mo |
| Warehouse | Town slot | 900 market folk | Stores the town's wares between seasons; needs a market | Start | 30 g, 20 timber, 6 mo |
| Counting house | Town slot | 600 market folk | Traders draw treasury gold; a merchant house can lend here; needs market step 2 | T2 | 60 g, 10 stone, 6 mo |
| Trading post | Coast or river abroad, by treaty, or a colony | 300 market folk | A market without a town: a trade endpoint abroad | Start; overseas T8 | 60 g, 20 timber, 6 mo |
| Bank | Town slot, city or bigger | 900 market folk | Loans from your own townsfolk at lower interest; holds deposits | T7 | 150 g, 30 stone, 12 mo |

**Faith** (rules on [Religion](Religion))

| Building | Place | Jobs | Does | Cost |
|---|---|---|---|---|
| House of worship (church, mosque, temple, shrine, synagogue, gurdwara) | Town slot, one per faith per town | 600 / 1,200 / 2,000 clergy | Turns the faith mix toward its faith. Steps: chapel or prayer hall, church or mosque, cathedral or great mosque (city or bigger) | 40 g, 20 stone, 12 mo; step 3 300 g, 200 stone, 120 mo |
| Minority house of worship | Town slot | 300 clergy | Keeps that faith calm instead of spreading it; needs the faith at a tenth of the province or a Faith tolerance charter. Pulling one down is persecution | 40 g, 20 stone, 12 mo |
| Pilgrimage shrine | Named holy places only | 600 clergy | Draws pilgrims, who travel like traders and count as traders passing. Never on the build sheet: at start or founded by event | Not built |
| Religious school (temple school, madrasa, yeshiva, Confucian academy) | Town slot | Scholars | Trains clergy and officials of the faith's kinds | As school |

Holy places: Mecca and Medina, Rome, Jerusalem, Constantinople, Santiago, Echmiadzin, Aksum, Varanasi, Bodh Gaya, Lhasa, Mount Wutai, Qufu, Ise, Karbala, the Temple of the Tooth (Kotte in 1444, Kandy later), and Amritsar from the 1580s.

**Learning and health**

| Building | Place | Jobs | Does | Unlocked by | Cost |
|---|---|---|---|---|---|
| School | Town slot, market town or bigger | Scholars, graduates only | Seats: temple or monastery school 20 · madrasa 30 or university 60 · academy 100 | L1; L2 or L7; L12 | 60 g, 20 stone, 12 mo |
| Library | Town slot | 300 scholars | Students graduate a year sooner; a sacked town's scholars don't all flee; needs school step 2 | L5 | 80 g, 20 stone, 12 mo |
| Observatory | Outside the town | 300 scholars | Scholars here work at double rate on Boats inventions | L3 | 120 g, 40 stone, 24 mo |
| Hospital (bimaristan) | Town slot | 600 clergy, or physicians from L8 | Town classes die 0.5 % slower; plague spreads slower | Start | 60 g, 20 stone, 12 mo |
| Wells and drains | Ring works | | Plague deaths in town halved; the town can grow a size bigger before shanty camps | B11 | 200 g, 60 stone, 36 mo |
| Almshouse | Town slot | 600 clergy | Shelters 3,000 homeless | Start | 30 g, 10 stone, 6 mo |

**Rule** (officials and lords numbers belong to [Government](Government))

| Building | Place | Jobs | Officials / lords | Also does | Cost |
|---|---|---|---|---|---|
| Palace (palace, kremlin, saray; the ordu tent-city moves with the ruler) | Capital's extra slot | 600 clerks | +6 / +10 / +16 officials; +2 / +4 / +6 lords | Landless lords live here as courtiers | 100 g, 60 stone, 24 mo |
| Seat (governor's hall) | Town slot, one per province | 300 clerks plus its official | +2 / +4 officials | Surrounding provinces count days to capital to the seat; step 2 with G11 | 60 g, 20 stone, 12 mo |
| Chancery | Capital | 300 clerks | +4 officials | Tax registers (G3) and census (G10) take effect once it stands | 80 g, 20 stone, 12 mo |
| Court of law | Town slot | 300 clerks | +2 lords | A lord tried here, with a judge in the province, doesn't turn his whole house disloyal; G1 | 50 g, 20 stone, 12 mo |
| Diet hall (cortes, sejm, diet, council hall) | Capital | 300 clerks | +3 lords | Lords and towns meet; needed to reform to diet monarchy; feudal, diet, elective or confederation forms | 100 g, 40 stone, 18 mo |
| Hostage residence | Capital | 300 clerks | +3 lords | Lords' heirs live at court as guarantees; household, tribute, horde, warlord or shogunate forms | 60 g, 20 stone, 12 mo |
| Examination hall | Capital or a seat | 300 scholars | +4 officials | Graduates sit exams to become officials; needed for the bureaucratic empire reform; G4 | 120 g, 40 stone, 18 mo |
| Parliament house | Capital | 600 clerks | +6 officials | Needed to reform to a constitutional form; G14 | 250 g, 100 stone, 36 mo |
| Mint | Capital or a seat | 300 craftsmen | | Turns silver and gold wares into coin at full value instead of selling them | 80 g, 20 stone, 12 mo |

**War**

| Building | Place | Does | Unlocked by | Cost |
|---|---|---|---|---|
| Castle | Castle tile | Steps: earthwork ring fort, stone castle, bastion fort, star fort, concrete fortress | B4; B1; B5; B6; B13 | Earthwork 60 g, 40 timber, 12 mo; stone 300 g, 200 stone, 36 mo; bastion 600 g, 400 stone, 48 mo; star 900 g, 600 stone, 60 mo; concrete 1,200 g, 300 concrete, 36 mo |
| Granary | Part of the castle | Castle store size and rot; bigger with F7 | Start | 30 g, 20 timber, 6 mo |
| Town walls | Ring works | Raids and rebels can't loot town buildings without storming; plunder ruins 1 in 6 instead of 1 in 3. Steps palisade, stone walls, bastioned walls (B5) | Start | Palisade 30 g, 40 timber, 6 mo; stone 200 g, 150 stone, 36 mo |
| Drill yard | Town slot, town or bigger | Training room 1,500 men of any arm; barracks step (W12) 4,000, and standing regiments housed there don't give *Soldiers quartered* | Start; W12 | 40 g, 20 timber, 6 mo |
| Arsenal | Town slot (300 craftsmen) | Arms and powder stores don't spoil here; without one they lose a tenth a year | Start | 60 g, 30 stone, 12 mo |
| Watchtower line | Ring works, border provinces | Enemy armies seen one province further away; raids spotted a season ahead | Start | 20 g, 20 stone, 6 mo |
| Airfield | Fields tile | Era VII aircraft base | B16 | 150 g, 40 concrete, 6 mo |

**Ports and the sea** (rules on [Naval](Naval))

| Building | Place | Jobs | Does | Unlocked by | Cost |
|---|---|---|---|---|---|
| Harbour | Shore tile | 1,500 / 3,000 / 4,500 seafolk | Harbour: the province is a port, 10 berths, sailors raised here, small hulls built without a shipyard · port (market town or bigger): 25 berths, fleets refit · great port: 50 berths, ocean ships and steamships | Start; step 3 S13 | 40 g, 20 timber, 12 mo |
| Shipyard | Shore tile, with a harbour | 3,000 / 4,500 / 6,000 seafolk | Slipways 1 / 2 / 2 (Venetian Arsenal 3): slipway yard (galleys, cogs, boats), shipyard (carracks, galleons), naval dockyard (ships of the line, then ironclads). Eats timber | Start; S4; S10 | 60 g, 40 timber, 12 mo |
| Fishery | Shore | 3,000 seafolk | Fish; makes seafolk, who become sailors | Start | 15 g, 10 timber, 4 mo |
| Lighthouse | Shore tile | 100 seafolk | Ships in the next sea zone lose half as many to storms; sea traders prefer its harbour | Start | 60 g, 40 stone, 18 mo |
| Naval base | Shore tile with a great port | 600 seafolk | Based fleets keep crews in peace without pay at sea; sea battles next to it are reinforced from the port | S10 | 200 g, 100 stone, 24 mo |

**Works across the province** (travel effects belong to [Troop Movement](Troop-Movement) and [Warfare](Warfare))

| Work | Place | Does | Unlocked by | Cost |
|---|---|---|---|---|
| Road | Ring works; track, road, paved road, turnpike, railway | Faster armies, food and traders; fewer days to capital | B2; B9; C16 | Road 40 g, 20 stone, 12 mo; paved 120 g, 80 stone, 24 mo; railway 300 g, 100 steel, 24 mo |
| Bridge | Shore tile on a river | A toll point; armies cross without the river penalty | Start; B10 iron bridges on any river | 40 g, 40 stone, 18 mo |
| Canal | Ring works | Adds a river to the province | B3; B8 for hills | 400 g, 100 stone, 60 mo, 6,000 labourers |
| Dykes | Ring works, marsh and coastal lowland | Floods can't turn fields to marsh; with F8 marsh can be drained | Start in the Low Countries and Po valley; F8 elsewhere | 100 g, 60 stone, 36 mo |
| Rail station | Town slot | Grain and armies move by rail | C16 | 150 g, 40 steel, 12 mo |
| Telegraph office | Town slot | Days to capital count as 1 for orders and market prices | T14 | 60 g, 10 iron, 6 mo |

Only buildings and steps whose unlock (start, invention, government form, region) your realm has appear on the build sheet. See [Research](Research).

### Landmarks

A **landmark** is a real, named building that stood or was built between 1444 and 1939. It counts as a step above its building type and has one effect of its own, written as a count. Landmarks are never on the build sheet: they are on the map at the start or founded by an event when the historical requirements are met. An event may found one elsewhere or not at all, but there are no invented landmarks.

| Landmark | Place | In 1444? | Type | Its own effect |
|---|---|---|---|---|
| Hagia Sophia | Constantinople | Yes (a mosque after the 1453 conversion event) | House of worship, step 4 | Its faith's houses of worship in every province in reach of the capital turn the faith mix twice as fast |
| Forbidden City | Beijing | Yes | Palace, step 4 | +24 officials; lords at court never waver |
| Alhambra | Granada | Yes | Palace, step 3 | Granada's castle counts one step higher |
| Great Mosque of Djenné | Djenné | Yes (earth) | House of worship, step 4 | No grievance from the doubled earth upkeep; traders passing +20 % in the replastering season |
| Sankore Mosque and its schools | Timbuktu | Yes | School, step 3 | Scholars from any Muslim realm may settle here |
| Masjid al-Haram | Mecca | Yes | Pilgrimage shrine, step 4 | The largest pilgrim flow in the world |
| St Peter's Basilica | Rome | No (1506, by event) | House of worship, step 4 | While being built, realms of its faith can be asked for gifts toward it |
| Topkapı Palace | Constantinople | No (1459, by event) | Palace, step 4 | +20 officials; the capital's seat runs two provinces |
| Ulugh Beg Observatory | Samarkand | Yes (destroyed 1449 by event, historically) | Observatory, step 3 | Boats and Counting inventions 20 % cheaper for its owner |
| Kremlin | Moscow | Yes (brick walls 1485 to 1495 by event) | Castle, step 3 | Palace and castle share one tile |
| Templo Mayor | Tenochtitlan | Yes | House of worship, step 4 | Lords of the Triple Alliance gain loyalty when the realm wins a war |
| Coricancha | Cusco | Yes | House of worship, step 4 | Every province linked to Cusco by road counts one day closer |
| Angkor | Angkor | Yes (court left around 1431) | House of worship, step 4, neglected | Upkeep can bring it back to sound; restoring it is a decision with its own event |
| Venetian Arsenal | Venice | Yes | Shipyard, step 4 | 3 slipways |
| Taj Mahal | Agra | No (1632, by event) | Landmark tomb, own type | Traders passing in Agra +30 % |

The config holds more than these 15.

### Regional looks and unique variants

A building has the **same effect everywhere**; only its name and sprite change with the province's region and faith (a caravanserai is a khan, funduq or tambo; a palace a kremlin or saray). Separately, six **unique variants** (Külliye, Kontor, Qollqa line, Polder mill, Ever-normal granary, Funduq quarter) are offered to [National Strengths](National-Strengths), each changing one number or adding one line; that system decides whether to use them.

### Events

Events change buildings with five effects: add a building (placed on a fitting empty tile or slot, or if none, the province's least-filled building goes up a step), remove one (it is ruined), damage a share of the province's buildings, move a building a step up or down, and the condition "has this building at this step". The old province stats map too: prosperity +2 gives two fitting buildings, fort level +1 a castle step, infrastructure +1 a road step, industry +1 a factory.

### Starting buildings

- Buildings follow the map's wealth: wealth 1 has a farm or ranch on a third of its tiles; wealth 10 has every tile built and town buildings at step 2.
- Town size follows population, and town slots fill by a regional template.
- Houses of worship's faith, lords' buildings and landmarks come from the catalogue; allowed buildings and steps from start inventions.
- Harbours and shipyards come from the naval 1444 port list (236 provinces).
- Fixed mines, named markets and landmarks come from event anchors: Potosí (from 1545 by event), Kutná Hora, Falun; Bruges, the Champagne fairs, Malacca.

See [The 1444 Start](The-1444-Start).

### The AI

The AI builds by the same rules and costs. Each month each AI country looks at **one province** in turn and picks at most one building there, by the first rule that fits:

1. Repair a ruined or damaged building, if it can pay.
2. A hungry province (Hungry, or under 3 months of food): a food building on an empty tile, or a granary at the nearest castle.
3. Homeless over 5 %: the building whose class takes most of them.
4. A raw ware going unused: its craft building.
5. A frontier province of a country expecting war: a castle step or walls.
6. Faith or trade gaps: a house of worship where its faith is low; a market or caravanserai on a busy path.
7. Its personality: mercantile builds markets and harbours, isolationist schools, hegemon seeker castles and drill yards.

It keeps a year's upkeep in reserve and never starts a site it can't crew. On a phone this is about 400 small checks a month in a 400-country world.

### Each turn

| Cadence | What happens |
|---|---|
| Monthly | Upkeep paid or unpaid; sites advance; finished buildings open their job slots before overflow runs; the AI checks one province |
| Each season | Farms, groves and fisheries make food; a damaged building's first-season penalty ends; rebels loot |
| Yearly | Wares made; neglect years counted; village works and craft buildings appearing; town fire roll; burned land buildings rebuild one a year in peace; Works advice worked out |

Each building stores just five small numbers (type, step, owner, condition, filled jobs); sites live in one realm-level list.

### Worked example: Troyes, 1444 to 1452

Troyes starts with 12 tiles (4 farms, a burned field, 2 ranches, a lumber camp, an empty woods tile, a fishery on the Seine, the castle and the town), 3,600 homeless, and a town with 6 full slots: a market, 3 loom houses, a church and a school.

1. **1444, the burned field.** You pay 15 gold, half the cost of a farm, to rebuild it in a season instead of waiting a year. 500 homeless form the crew and then move into the farm's slots.
2. **1445, the yearly fair.** No free slot, so you upgrade the market to a yearly fair (a market charter granted; 100 gold, 30 stone, 12 months). Troyes has no quarry; the stone comes from one in the Burgundian hills, one ring away but in a lord's province, so it is bought for 15 gold. The crew of 2,000 is all homeless. The fair takes 900 more market folk, and traders can now be hired here.
3. **1447, the town grows to a city** with 9 slots: a drill yard (40 gold), a warehouse (30 gold) and a fourth loom house (35 gold). Each crew takes the homeless first, leaving 400, under 1 %, and no theft.
4. **1449, the woods tile.** You want a farm, but clearing the woods would leave the lumber camp as the only timber, and the shipyard downriver needs it. You leave the woods and build a quarry on a hills tile of a neighbouring province for 20 gold, so the next castle step needs no bought stone.
5. **1450, Burgundy invades.** The stone castle upgrade site stops; foragers burn 2 fields; the town is besieged and takes honours of war. With only a palisade, plunder would have burned 1 in 3 town buildings; because the town took terms, none burn.
6. **1452, peace.** Troyes has 2 ruined farms rebuilding by themselves, one a year, its fair intact and a castle site to restart. Its upkeep is 7 gold a year against 13 gold of tax reaching the crown.

## What you see

**The building card**, when you tap a building on the tile row:

```
 LOOM HOUSE · Troyes, town slot 3          Step 1 of 3 · owned by the crown
 Jobs      1,500 craftsmen   full
 Makes     30 cloth a year   from 30 wool (20 made here, 10 bought)
 Upkeep    1 gold a year     Condition: sound
 Next step Draper's hall: +900 jobs, dyes cloth (needs dyes)   80 g · 20 bricks · 8 mo
                                         [ Upgrade ] [ Demolish ] [ Close ]
```

Every field opens its gain and lose list.

**The build sheet**, when you tap an empty tile, an empty town slot or Build on the province card:

```
 BUILD · Troyes, fields tile 5                   Ground: farmland (cost ×1.0, output ×1.25)
 Farm            12,000 farmers · grain for 22,500    30 g · 10 timber      · 6 mo
 Vineyard          6,000 farmers · grapes             40 g · 10 timber      · 12 mo
 Monastery          300 clergy + 6,000 farmers        90 g · 40 stone       · 36 mo
 Castle (stone)   garrison 2,000 · tile stops farming 300 g · 200 stone     · 36 mo
 Why here: 3,600 homeless in Troyes · fields tile 5 is worked bare by 3,000 farmers
                                                       [ Cancel ]  [ Build farm ]
```

Costs and months are already multiplied by the ground. A grey row says what is missing (*needs Water and wind mills*, *needs a town of 6 slots*).

**The Works screen**, one screen for the whole realm, opened from the country card:

```
 WORKS · France                                   Upkeep 84 gold a year · 6 sites running
 SITES       Troyes      loom house        4 of 6 months   crew 1,500 (homeless)
             Reims       stone castle     11 of 36 months  crew 2,100 of 3,000
             Bordeaux    harbour → port    2 of 12 months  crew 3,000
 NEEDS       Rouen       3 buildings neglected: upkeep unpaid           [ Pay ]
             Orléans     market ruined by rebels                       [ Rebuild 20 g ]
 ADVICE      Paris       9,400 homeless · a loom house would take 1,500 · wool here
             Lyon        2 empty fields · farmers overflowing · a farm feeds 22,500
                                       [ Build all advised ]  [ Settings ]
```

- **Advice**: at most five suggestions, worked out once a year from empty tiles, homeless people and wares that arrive unused.
- **Build all advised** queues every suggestion that fits the gold you set aside.
- **Batch orders** build one thing everywhere it fits, such as a granary at every castle.

**On the map**: at world zoom only landmarks (a small icon); at region zoom the castle, town size, harbour anchor, a hammer on provinces with a site, and a cracked icon for neglected or damaged buildings; at local zoom each building's sprite and step, with scaffolding and ash. The **Works lens** colours sites green, neglected or damaged amber and ruined red; the **Jobs lens** shows empty job slots against homeless people. See [Map and Lenses](Map-and-Lenses).

**Turn report**: one line per finished building, one per building lost, and one in the month upkeep first goes unpaid.

## How it connects

- [Provinces](Provinces): tiles, uses and states, ground, town size, homeless and classes, wares, the master of works, charters; buildings return job slots, wares, crews and Smoke.
- [Your Realm](Your-Realm): treasury gold, lords' wealth, traits, loyalty and defections; upkeep shows on the Treasury card.
- [Research](Research): invention ids that unlock buildings and steps.
- [Trade](Trade): trade roles of markets, caravanserais, warehouses, counting houses, trading posts, banks and harbours; the trade threshold for crafts appearing.
- [Religion](Religion): houses of worship, minority houses, monasteries, shrines, conversions, clergy as owners.
- [Naval](Naval): harbours, shipyards, naval bases, lighthouses; the 1444 port list.
- [Government](Government): rule buildings as sources of officials and lords caps and reform requirements.
- [Warfare](Warfare): raids, plunder, sacks, occupation, foraging, peace terms; castles, walls, arsenals, watchtowers, airfields.
- [Recruiting](Recruiting): castle and drill-yard training room, barracks.
- [Troop Movement](Troop-Movement): road, bridge and canal steps.
- [National Strengths](National-Strengths): unique variants, landmarks as goals, building cost and unlock levers.
- [Historical Events](Historical-Events): the five building effects, landmark founding events, geography anchors.
- [Rebellions](Rebellions): rebels loot a town building a season.
- [Revolutions](Revolutions): counts of factories, rail stations and presses.
- [Diplomacy](Diplomacy) and [Subjects](Subjects): treaties granting trading posts abroad or demanding castles demolished.
- [The 1444 Start](The-1444-Start): wealth, population, faith, lords, start inventions, regional templates.
- [Map and Lenses](Map-and-Lenses): sprites by zoom, Works and Jobs lenses, landmark icons.
- [Screens and Navigation](Screens-and-Navigation): Works screen, build sheet, building card, turn report lines.
- [Time and Turns](Time-and-Turns): monthly, seasonal and yearly ticks.
- [World Map](World-Map): climate, quake regions, rivers, coasts.

## Numbers

Everything lives in one buildings config file, and every value is a placeholder.

| Value | Config key | Design value |
|---|---|---|
| Timber price | `materials.timber.price` | 0.5 g a load |
| Stone price; far from a quarry | `materials.stone.price`, `far_price_multiplier`, `far_after_rings` | 0.5; ×2; more than 3 provinces |
| Bricks | `materials.bricks.price`, `counts_as` | 0.8; stone |
| Earth | `materials.earth.grounds`, `upkeep_multiplier` | drylands, desert, savanna; ×2 upkeep |
| Iron | `materials.iron.price`, `from_era` | 2; era IV |
| Steel and concrete | `materials.steel.price`, `concrete.price`, `from_era` | 3; era VI |
| Town slots | `town_slots.*` | 1, 2, 4, 6, 9, 12; capital +1 |
| Crown sites | `sites.per_province` | land 1, town 1 |
| Master of works | `sites.master_of_works` | +1 each; ×0.5 months; ×0.75 gold (config only) |
| Half crew | `sites.half_crew_months_multiplier` | ×2 months |
| Cancel refund | `sites.cancel_refund` | 0.5 |
| Stopped months | `sites.stop_months_by_climate` | cold [1], monsoon [7] |
| Neglected output | `condition.neglected_output` | 0.5 |
| Neglect to lose a step | `condition.years_neglected_to_lose_step` | 10 years |
| Repair cost | `condition.repair_cost_share` | 0.5 |
| Demolish refund | `condition.demolish_material_refund` | 0.25 |
| Neglect recovery | not yet in config | 3 months paid |
| Village works | `village_works.chance_per_year` and needs | 20 %; 5 years peace, 3 months food |
| Crew sizes | `buildings[].steps[].cost.crew` | farm 500; stone castle 3,000; canal 6,000 |
| Farm food | `buildings.farm.steps[0].makes.grain` | 1.5 people fed per worker a year |
| Quarry stone | `buildings.quarry.makes.stone` | 40 a year |
| Loom house | `buildings.loom_house.makes/eats` | 30 cloth / 30 wool |
| Harbour berths | `buildings.harbour.steps[].berths` | 10 / 25 / 50 |
| Shipyard slipways; timber | `buildings.shipyard.steps[].slipways`, `eats.timber` | 1 / 2 / 2; 20 |
| Drill yard room | `buildings.drill_yard.steps[].training_room` | 1,500 / 4,000 |
| Palace officials / lords | `buildings.palace.steps[]` | 6/2, 10/4, 16/6 |
| Grove bearing | grove config | 3 years |
| Arsenal spoil, hospital, almshouse, AI reserve, AI homeless trigger, advice size | not yet in config | a tenth a year; 0.5 %; 3,000; a year's upkeep; 5 %; 5 lines |
| Landmarks | `landmarks[]` | 15 listed, more in config |
| Regional looks | `variants` | by region and faith |
| 1444 ports | `start_ports.file` | `../naval/data/start-ports.json` |
| Quake regions, fire chance | not yet in config | not given |

## Still open

- **OQ-BLD-1**: Is Troyes a market town (4 slots) or a town (6 slots) in 1444?
- **OQ-BLD-2**: What price bought materials cost now that trade v2 dropped market prices, and what "few traders" means.
- **OQ-BLD-3**: Is the master of works' 25 % gold discount part of the rule?
- **OQ-BLD-4**: The maximum step: castles and roads have five.
- **OQ-BLD-5**: What step each landmark stands at, when several sit at their type's top step.
- **OQ-BLD-6**: Is the yearly fair available at start with a charter, or only with T6?
- **OQ-BLD-7**: Whether the caravanserai and counting house keep the buildings design's roles or take trade's; "room" is undefined.
- **OQ-BLD-8**: Which 1444 port file is canonical: `start-ports.json` or `ports-1444.json`?
- **OQ-BLD-9**: Is palace step 3 at start or unlocked by G9?
- **OQ-BLD-10**: The province design hasn't adopted the buildings changes (hospital at start, ring works, quarry miners, new lenses).
- **OQ-BLD-11**: Is a lord's province "yours" for material reach?
- **OQ-BLD-12**: Does a palisade count as town walls for plunder?
- **OQ-BLD-13**: Road steps: five steps, three unlocks, and missing costs for the track and turnpike.
- **OQ-BLD-14**: Which castle steps are known in 1444?
- **OQ-BLD-15**: Crafts appearing: trade's 30 % trade ratio floor and how often "now and then" is.
- **OQ-BLD-16**: Unique variants have no home in national strengths yet.
- **OQ-BLD-17**: Fire chance, quake regions, a "big" raid, a "busy path", regional slot templates and buildings for wealth 2 to 9 are not given.
- **OQ-BLD-18**: One seat per province or per town?
- **OQ-BLD-19**: Who owns the "decision" to restore Angkor?
- **OQ-BLD-20**: The 20 % village works rate needs balancing, and faith building numbers may change with religion.
- **OQ-BLD-21**: When a burned land building both rebuilds at half cost and rebuilds itself for free in peace, which applies?

## For developers

- Spec: [`domain/buildings/spec.md`](https://github.com/grrts/pocket-hedgemony/blob/claude/domain-specs-bdd-ebdpmx/domain/buildings/spec.md), requirement code **BLD** (BLD-001 to BLD-154).
- Features: `domain/buildings/features/` (19 files, including `troyes-1444-1452.feature` for the worked example).
- Code: rules code for this context goes in `packages/engine/src/domain/buildings/`, balance numbers in `packages/rules/data/domain/buildings.json`. The design's config shape is `buildings/buildings-config.example.yaml`.
