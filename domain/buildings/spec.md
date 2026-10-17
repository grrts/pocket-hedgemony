# Buildings (BLD)

## 1. Purpose and scope

This context owns the **building list** of Pocket Hegemony (1444 to 31 August 1939) and the rules for how a realm
builds, keeps, upgrades, converts and loses the buildings on its provinces' tiles, town slots and ring works. Every
other context that needs a building finds it here, and asks for a new one here.

**In scope**
- What a building is (its fields) and where it can stand: land tiles, shore tiles, the castle tile, town slots, ring works.
- Town slots by town size, the capital's extra slot, and the limits per province, per faith per town and per realm.
- Building costs (gold, materials, labourers, months), the ground multiplier, materials and their reach, building crews.
- Sites: how many run at once, seasons, war, cancelling.
- Steps and upgrades; converting one building into another.
- Upkeep (paid monthly), condition (sound, neglected, damaged, ruined), repair and rebuilding, how buildings are lost.
- Owners (crown, lord, clergy, town, merchant house or company, the people) and how non-crown builders choose.
- Buildings the people put up themselves (village works, craft buildings appearing).
- The full building catalogue (sections 7.1–7.10 of the design), landmarks, regional names and sprites, the unique
  variants (stored in the buildings data, D-BLD-16).
- The build sheet, the building card, the Works screen, the Works and Jobs lenses, building notifications.
- The five event-tree building effects and the old province-stat mapping onto buildings.
- The AI's building choices, starting buildings, and the per-building data kept for speed on a phone.

**Not in scope (owned by …)**
- Tile uses, tile states (burned, fallow), the ground table, wares made, classes, homeless and overflow: **province**.
- Trade value, trade ratio, traders, routes and the trade weight of each building: **trade**.
- Faith-mix numbers, how much a minority house of worship calms, seizing church property, holy-place list: **religion**.
- Ships, sailors, berths in use, captains, the 1444 port list contents: **naval**.
- The numbers of officials and lords each rule building adds, government forms and reforms: **government**.
- What castles do in sieges, plunder, raids, the arms store, storms: **warfare**. Training room use: **recruiting**.
- What roads, bridges and canals do to marching: **troop-movement**.
- Unique-strength mechanics and budgets: **national-strengths**.
- The global turn order: **time-and-turns**. Event authoring: **events**.

## 2. Sources

Newest decision first.
1. `buildings/buildings-design.md` (version 1), §19 decisions of 16 October: construction paid up front, upkeep monthly;
   landmarks are real historical buildings only (1444–1939).
2. `buildings/buildings-design.md` §0–§18 (all sections).
3. `buildings/buildings-config.example.yaml` (shape and placeholder numbers).
4. Read for seams and contradictions only: `trade/trade-design.md` v2 (§4.2, §11, §14), `government/government-design.md`
   §2.1, `province-stats/province-stats-design.md` §4, §7, §10.2, `naval/naval-design.md`, `planning/gap-lists.md`
   (decisions, List 1 items 20–21, List 2 items 7 and 13).

## 3. Ubiquitous language

| Term | Meaning | Not to be confused with |
|---|---|---|
| Building | One thing standing on a tile, a town slot or as a ring work, with type, place, step, owner, jobs, makes, needs, condition, upkeep | A landmark (a named building, one step above its type) |
| Place | The tile, town slot or ring-works position a building stands on | A province |
| Land tile | Fields, pasture, woods, marsh or waste tile; holds one land building fitting its use | Shore tile |
| Shore tile | A tile on coast, lake or navigable river (1 to 3 per such province); holds one shore building | Land tile |
| Castle tile | The tile holding the province's one castle; the granary is part of the castle | Town tile |
| Town slot | A place for a town building; count set by town size | Tile |
| Ring works | Works that belong to the whole province and take no tile or slot (road, canal, town walls, wells and drains, dykes, watchtower line); one of each per province, with steps | Town slot |
| Step | How far a building has been upgraded (1 to 3; castles and a few others more) | Era |
| Site | A building or upgrade under construction on one place | A building |
| Crew | The labourers a site needs for its months (config per building) | Garrison, job slots |
| Master of works | A province official that adds one site of each kind and halves months | A lord |
| Materials | Timber, stone, bricks, earth, iron, steel, concrete | Wares in general |
| Reach (materials) | The province itself, a province of the realm one ring away, or further along roads and rivers | Trade route |
| Ground multiplier | Factor on gold and months by ground: farmland ×1, hills ×1.25, mountains ×2, jungle ×2 | Building output factor |
| Upkeep | Gold the owner pays each month (shown as a yearly total; a twelfth each month) | Construction cost |
| Condition | Sound, neglected, damaged or ruined | Step |
| Neglected | Works at half; caused by unpaid upkeep or a shrinking town | Damaged |
| Damaged | Works at half and nothing in its first season; repaired at half cost | Ruined |
| Ruined | Works not at all; rebuilt at half cost or cleared | Demolished (removed by its owner) |
| Owner | Crown, lord, clergy, town, merchant house or trading company, or the people (commons) | Ruler |
| Commons | The people as owner; their buildings have no upkeep | Homeless |
| Village works | Step-1 farm, ranch, fishery or lumber camp the people build themselves | Craft buildings appearing |
| Converting | Turning a building into another of the same kind (crop, faith, trade, product, slighting) | Upgrading |
| Slighting | Pulling a castle down to a ruin so no rebel or rival can use it | Demolishing |
| Landmark | A real, named building that stood in or after 1444, a step above its type, with one effect of its own | Unique variant |
| Variant (look) | A building's regional or faith name and sprite; effect unchanged | Unique variant |
| Unique variant | A country's or people's version of one building that changes one number or adds one line; stored in the buildings data | Look variant |
| Works screen | The realm-wide list of sites, needs and advice | Province card |
| Advice | Up to five yearly building suggestions on the Works screen | AI building rule |
| Batch order | An order to build one thing everywhere it fits | Build all advised |

## 4. Domain model

### Aggregates

**Building** (identity: province + place)
- Holds: type, place, step, owner, filled jobs, condition, years neglected, crop or product or faith (where the type has one).
- INV-BLD-1: A land tile, a shore tile and a town slot each hold at most one building; a province holds at most one castle.
- INV-BLD-2: A building's step is between 1 and its type's highest step; a building that falls below step 1 is ruined.
- INV-BLD-3: Filled jobs never exceed the step's job slots, and all filled jobs are of the building's one class.
- INV-BLD-4: Condition is exactly one of sound, neglected, damaged, ruined.
- INV-BLD-5: A building with a per-province, per-faith-per-town or per-realm limit never exceeds that limit.
- INV-BLD-6: Commons-owned buildings carry no upkeep.
- Stored per building: type, step, owner, condition, filled jobs (five small numbers).

**Site** (identity: province + place; kept in a realm-level list)
- Holds: place, type, target step, months left, crew assigned, crew needed, materials secured, owner.
- INV-BLD-7: One site per place at a time.
- INV-BLD-8: At most one land site and one town site per province for the crown (one more of each with a master of
  works); lords' sites do not count toward the crown's.
- INV-BLD-9: A site with no crew does not advance.

**Province building set** (identity: province)
- Holds: town slots available (from town size, +1 in the capital), buildings by place, ring works with steps.
- INV-BLD-10: Town buildings beyond the current slot count are neglected.
- INV-BLD-11: Ring works: one of each kind per province.

### Entities and value objects
- **BuildingType** (config entry): `id`, `place`, `class`, `jobs` by step, `makes`, `needs`, `unlocked_by` by step,
  `cost` by step (gold, materials, months, crew), `upkeep` by step, `limit`, `variants`, `effects`.
- **Cost** value: gold, materials (loads by material), months, crew.
- **Material** value: id, made by, bought price, special rules (far multiplier, counts as stone, era).
- **Landmark** (config `landmarks`): id, province, present in 1444 or founding event, building type and step, effect.
- **Owner** value: crown | lord(id) | clergy(faith) | town(province) | company(id) | commons.
- **Condition** value with neglect-year counter and damaged-season flag.

### Building catalogue (step-1 values on farmland; all numbers placeholders, config `buildings`)

Food and land (§7.1)
| Building | Place | Jobs | Makes / does | Needs | Unlocked by | Cost |
|---|---|---|---|---|---|---|
| Farm | Fields | 12,000 farmers | Grain (food), or a crop instead: flax, hemp, cotton, dye plants, later tobacco where the ground allows | | Start | 30 g · 10 timber · 6 mo |
| step 2 Mill farm | | +0 | +25 % gold from its grain | A river or windy ground | F5 Water and wind mills | 40 g · 20 timber · 8 mo |
| step 3 Enclosed farm | | −3,000 farmers (they overflow) | +1 harvest step | | F15 Four-field rotation | 60 g · 20 timber · 12 mo |
| Rice paddy | Fields on wet ground or by a shore | 18,000 farmers | Rice, two harvests a year | Shore or irrigation in the province | F2 Wet-rice terracing | 40 g · 10 timber · 12 mo |
| Terrace | Fields on hills or mountains | 12,000 farmers | Grain at the farmland rate | | F2, or Andean start | 50 g · 20 stone · 24 mo |
| Raised fields | Marsh | 12,000 farmers | Grain; the marsh stays marsh | | F6 Chinampa and raised fields | 40 g · 10 timber · 18 mo |
| Plantation | Fields on tropical ground | 12,000 farmers | Sugar, spices, cotton, tobacco, coffee, cocoa | No forced-labour bonus, ever | F10 Sugar and spice plantations | 80 g · 20 timber · 24 mo |
| Grove | Fields on warm ground | 6,000 farmers | By region: grapes (vineyard), olive oil, dates (food), silk (mulberry), tea | 3 years to bear after built | Start | 40 g · 10 timber · 12 mo, +3 years |
| Ranch | Pasture | 3,000 herders | Herds (food), wool, hides | | Start | 20 g · 10 timber · 4 mo |
| Horse stud | Pasture | 3,000 herders | Horses; camels on desert ground; elephants in South and Southeast Asian forests (tamed, not bred) | | F11 Horse breeding studs; elephant stables start in their regions | 60 g · 20 timber · 12 mo |
| Irrigation works | Waste or drylands fields | 1,500 farmers | The tile works as fields | | F3 Qanat and canal irrigation | 60 g · 20 stone · 24 mo |
| Monastery | Fields | 300 clergy and 6,000 farmers | Grain at farm rate; makes clergy; 20 student seats with L1; missionaries travel out | A faith with monks or nuns | Start | 90 g · 40 stone · 36 mo |

Extraction and materials (§7.2)
| Building | Place | Jobs | Makes | Needs | Unlocked by | Cost |
|---|---|---|---|---|---|---|
| Lumber camp | Woods | 1,500 woodsmen | Timber; furs in boreal woods | Woods regrow at a rate; cutting faster wears the tile | Start | 10 g · 4 mo |
| Mine | Waste, hills or mountains with a seam | 6,000 miners | Silver, gold, iron, copper, tin, salt, saltpetre, gems; coal from era IV | Timber; seams left | Start; step 2 Shaft mine C6 (+50 % output, deeper seams); step 3 Steam-pumped mine C13 | 60 g · 20 timber · 12 mo |
| Quarry | Waste, hills or mountains | 3,000 miners | Stone; marble in named places (Carrara, Makrana) | | Start | 20 g · 10 timber · 6 mo |
| Saltworks | Shore on a dry or warm coast | 1,500 miners | Salt | | Start | 20 g · 10 timber · 6 mo |
| Saltpetre works | Town slot | 900 craftsmen | Saltpetre for the powder mill | A ranch or horse stud in the province | W3 Bombards | 30 g · 10 timber · 6 mo |

Crafts and industry (§7.3, all in town slots)
| Building | Jobs | Makes | Needs | Unlocked by | Steps |
|---|---|---|---|---|---|
| Loom house | 1,500 craftsmen | Cloth from wool, linen from flax, silk cloth from silk, cotton cloth from cotton | That raw ware | Start | 2 Draper's hall (+900 jobs, dyes its cloth, needs dyes) · 3 Weaving manufactory (C11, +1,500 jobs, needs an official in the province) |
| Forge | 1,500 craftsmen | Tools and arms from iron | Iron, charcoal (timber) | Start | 2 Bloomery works (C2, double iron use and output) · 3 Iron works (C12, no timber) |
| Kiln | 1,500 craftsmen | Pottery, bricks; porcelain where the know-how is (C3) | Clay (anywhere), timber | Start | 2 Brickworks (double bricks) · 3 Porcelain works (C3) |
| Tannery | 1,500 craftsmen | Leather from hides | Hides | Start | 2 Saddlery (light horse train a month faster in the province) |
| Brewery or winery | 900 craftsmen | Beer, wine, spirits | Grain or grapes | Start | 2 Distillery (spirits, which keep and travel) |
| Press | 900 craftsmen | Books | Paper | L5 printing, or L4 Metal movable type | 2 Printing house (books for the realm's schools: schools in reach cost less) |
| Paper mill | 900 craftsmen | Paper from rags or bamboo | Flax or linen; or woods | C1 Paper making | |
| Powder mill | 900 craftsmen | Powder | Saltpetre, charcoal | W3 Bombards; step 2 C10 Gunpowder mills (double output) | |
| Gun foundry | 900 craftsmen | Guns for gun crews and ships | Copper and tin (bronze) or iron | W3 Bombards | 2 Cannon works (C2, iron guns, cheaper) |
| Factory | 6,000 craftsmen | A product: textile mill, iron and steel works, engine works, cannery (F18), chemical works (C20), cement works (B13); does the work of several craft buildings; makes Smoke | Coal or water power; the product's raw ware | C14 mechanized_textiles (textile mill); C18 Bessemer steel (steel); others by their invention | 2 Powered factory (C19, +50 % output) · 3 Assembly plant (C21, double output) |
| Power station | 900 craftsmen | Power for the province's factories; step-2 factories need it | Coal, or a river (hydroelectric, B14) | C19 electrification | |

Loom house step 1 cost (config): 35 g · 10 timber · 6 mo, crew 1,000; Draper's hall 80 g · 20 bricks · 8 mo; Weaving
manufactory 160 g · 40 stone · 18 mo.

Trade (§7.4; rules owned by trade)
| Building | Place | Jobs | Does for trade | Needs | Unlocked by | Cost |
|---|---|---|---|---|---|---|
| Market | Town slot | 1,500 / 2,400 / 3,000 market folk | 1 weekly market: trade endpoint · 2 yearly fair: traders hired here, draws traders from further · 3 trading house: traders start with more goods, bills of exchange | Village or bigger; step 2 market charter and market town; step 3 town | Start; step 3 T3 Bills of exchange | 40 g · 10 timber · 6 mo; 100 g · 30 stone · 12 mo; 200 g · 40 stone · 18 mo |
| Caravanserai (khan, funduq, tambo) | Town slot | 900 market folk | Rest stop: carried trade value grows faster while traders rest | A road | Start; T1 doubles its room | 40 g · 20 stone · 12 mo |
| Warehouse | Town slot | 900 market folk | Stores the town's wares between seasons | Market | Start | 30 g · 20 timber · 6 mo |
| Counting house | Town slot | 600 market folk | Traders draw treasury gold here; a merchant house can lend gold here | Market step 2 | T2 Double-entry bookkeeping | 60 g · 10 stone · 6 mo |
| Trading post | Coast or river abroad, by treaty, or a colony | 300 market folk | A market without a town: a trade endpoint abroad | A treaty or a colony | Start; overseas T8 | 60 g · 20 timber · 6 mo |
| Bank | Town slot | 900 market folk | Loans from own townsfolk at lower interest; holds deposits | City or bigger | T7 Deposit banks | 150 g · 30 stone · 12 mo |

Faith (§7.5; rules owned by religion)
| Building | Place | Jobs | Does | Needs | Unlocked by | Cost |
|---|---|---|---|---|---|---|
| House of worship (church, mosque, temple, shrine, synagogue, gurdwara) | Town slot, one per faith per town | 600 / 1,200 / 2,000 clergy | Turns the faith mix toward its faith; steps chapel/prayer hall/shrine · church/mosque/temple · cathedral/great mosque/great temple | Step 3: city or bigger | Start | 40 g · 20 stone · 12 mo; step 3 300 g · 200 stone · 120 mo |
| Minority house of worship | Town slot | 300 clergy | Keeps that faith's people calm instead of spreading it | Faith ≥ a tenth of the province, or a Faith tolerance charter | Start | 40 g · 20 stone · 12 mo |
| Monastery | Fields tile | 300 clergy, 6,000 farmers | Makes clergy; school with L1; missionaries | A faith with monastics | Start | 90 g · 40 stone · 36 mo |
| Pilgrimage shrine | Named holy places only | 600 clergy | Draws pilgrims, who travel like traders and count as traders passing | The place | Start, or the faith's event | Not built |
| Religious school (temple school, madrasa, yeshiva, Confucian academy) | Town slot | Scholars | Trains clergy and officials of the faith's kinds | | L1, L2 | As school |

Holy places named: Mecca and Medina, Rome, Jerusalem, Constantinople, Santiago, Echmiadzin, Aksum, Varanasi, Bodh Gaya,
Lhasa, Mount Wutai, Qufu, Ise, Karbala, the Temple of the Tooth (Kotte in 1444, Kandy later), Amritsar from the 1580s.

Learning and health (§7.6)
| Building | Place | Jobs | Does | Needs | Unlocked by | Cost |
|---|---|---|---|---|---|---|
| School | Town slot | Scholars, from graduates only | Student seats: 1 temple or monastery school 20 · 2 madrasa 30 or university 60 · 3 academy 100 | Market town or bigger | L1; L2 or L7; L12 | 60 g · 20 stone · 12 mo |
| Library | Town slot | 300 scholars | Students graduate a year sooner; a sacked town's scholars don't all flee | School step 2 | L5 printing | 80 g · 20 stone · 12 mo |
| Observatory | Outside the town, no slot | 300 scholars | Scholars here work at double rate on Boats inventions | School | L3 Observatories | 120 g · 40 stone · 24 mo |
| Hospital (bimaristan) | Town slot | 600 clergy, or physicians from L8 | Town classes die 0.5 % slower; plague spreads slower | | Start | 60 g · 20 stone · 12 mo |
| Wells and drains | Ring works | | Plague deaths in town halved; town can grow a size bigger before shanty camps | | B11 Sewers and clean water | 200 g · 60 stone · 36 mo |
| Almshouse | Town slot | 600 clergy | Shelters 3,000 homeless | | Start | 30 g · 10 stone · 6 mo |

Rule (§7.7; officials and lords numbers owned by government)
| Building | Place | Jobs | Officials | Lords | Also does | Needs | Cost |
|---|---|---|---|---|---|---|---|
| Palace (palace, kremlin, saray; ordu tent-city moves with the ruler) | Capital's extra slot | 600 clerks | +6 / +10 / +16 | +2 / +4 / +6 | Landless lords live here as courtiers | Start | 100 g · 60 stone · 24 mo |
| Seat (governor's hall) | Town slot, one per province | 300 clerks plus its official | +2 / +4 | | Surrounding provinces count Days to capital to the seat | Start; step 2 G11 Postal service | 60 g · 20 stone · 12 mo |
| Chancery | Capital, town slot | 300 clerks | +4 | | Tax registers (G3) and census (G10) take effect once it stands | G3 Tax registers | 80 g · 20 stone · 12 mo |
| Court of law | Town slot | 300 clerks | | +2 | A lord tried here, with a judge in the province, doesn't turn his whole house disloyal | G1 Written law codes | 50 g · 20 stone · 12 mo |
| Diet hall (cortes, sejm, diet, council hall) | Capital, town slot | 300 clerks | | +3 | Lords and towns meet; reform to diet monarchy needs one | Feudal, diet, elective or confederation forms | 100 g · 40 stone · 18 mo |
| Hostage residence | Capital, town slot | 300 clerks | | +3 | Lords' heirs live at court as guarantees | Household, tribute, horde, warlord or shogunate forms | 60 g · 20 stone · 12 mo |
| Examination hall | Capital or a seat, town slot | 300 scholars | +4 | | Graduates sit exams to become officials; reform to bureaucratic empire needs one | G4 Examination system | 120 g · 40 stone · 18 mo |
| Parliament house | Capital, town slot | 600 clerks | +6 | | Reform to a constitutional form needs one | G14 Written constitution | 250 g · 100 stone · 36 mo |
| Mint | Capital or a seat | 300 craftsmen | | | Turns silver and gold wares into coin at full value instead of selling them | Start | 80 g · 20 stone · 12 mo |

War (§7.8)
| Building | Place | Jobs | Does | Needs | Unlocked by | Cost |
|---|---|---|---|---|---|---|
| Castle | Castle tile | Garrison | Steps: earthwork ring fort, stone castle, bastion fort, star fort, concrete fortress | | B4; B1; B5; B6; B13 | Earthwork 60 g · 40 timber · 12 mo; stone 300 g · 200 stone · 36 mo; bastion 600 g · 400 stone · 48 mo; star 900 g · 600 stone · 60 mo; (config) concrete 1,200 g · 300 concrete · 36 mo |
| — granary | Part of the castle | | Castle store size and rot | | Start; bigger with F7 | 30 g · 20 timber · 6 mo |
| Town walls | Ring works | | Raids and rebels can't loot town buildings without storming; plunder ruins 1 in 6 town buildings instead of 1 in 3; steps palisade, stone walls, bastioned walls (B5) | | Start | Palisade 30 g · 40 timber · 6 mo; stone 200 g · 150 stone · 36 mo |
| Drill yard | Town slot | | Training room 1,500 men of any arm; step 2 barracks (W12): room 4,000, standing regiments housed there don't give Soldiers quartered | Town or bigger | Start; W12 Standing regiments | 40 g · 20 timber · 6 mo |
| Arsenal | Town slot | 300 craftsmen | Arms and powder stores don't spoil while kept here; without one they lose a tenth a year | | Start | 60 g · 30 stone · 12 mo |
| Watchtower line | Ring works, border provinces | | Enemy armies seen one province further away; raids spotted a season ahead | | Start | 20 g · 20 stone · 6 mo |
| Airfield | Fields tile | | Era VII aircraft base | | B16 Airfields | 150 g · 40 concrete · 6 mo |

Ports and the sea (§7.9; rules owned by naval)
| Building | Place | Jobs | Does | Needs | Unlocked by | Cost |
|---|---|---|---|---|---|---|
| Harbour | Shore tile | 1,500 / 3,000 / 4,500 seafolk | 1 harbour: the province is a port, 10 berths, sailors raised here, small hulls built without a shipyard · 2 port: 25 berths, fleets refit · 3 great port: 50 berths, ocean ships and steamships (coal) | Step 2 market town or bigger | Start; step 3 S13 Steamships | 40 g · 20 timber · 12 mo |
| Shipyard | Shore tile with a harbour in the province | 3,000 / 4,500 / 6,000 seafolk | Slipways 1 / 2 / 2 (Venetian Arsenal 3); ships bought and built here, crewed by sailors in port; fleets refit · 1 slipway yard (galleys, cogs, boats) · 2 shipyard (carracks, galleons) · 3 naval dockyard (ships of the line, then ironclads with steel) | Timber; a harbour | Start; step 2 S4 Carrack and caravel; step 3 S10 Naval dockyards | 60 g · 40 timber · 12 mo |
| Fishery | Shore | 3,000 seafolk | Fish (food); makes seafolk, who become sailors | | Start | 15 g · 10 timber · 4 mo |
| Lighthouse | Shore tile | 100 seafolk | Ships in the next sea zone lose half as many to storms; sea traders prefer its harbour | Stone | Start | 60 g · 40 stone · 18 mo |
| Naval base | Shore tile with a great port | 600 seafolk | Fleets based here keep crews in peace without pay at sea; sea battles next to it reinforce its side from the port | A great port | S10 | 200 g · 100 stone · 24 mo |

Works across the province (§7.10)
| Work | Place | Does | Unlocked by | Cost |
|---|---|---|---|---|
| Road | Ring works; steps track · road · paved road · turnpike · railway | Faster armies, food and traders; fewer days to capital | B2; B9; C16 | Road 40 g · 20 stone · 12 mo; paved 120 g · 80 stone · 24 mo; railway 300 g · 100 steel · 24 mo |
| Bridge | Shore tile on a river | A toll point; armies cross without the river penalty | Start; B10 iron bridges on any river | 40 g · 40 stone · 18 mo |
| Canal | Ring works | Adds a river to the province | B3; B8 Canal locks for hills | 400 g · 100 stone · 60 mo, 6,000 labourers |
| Dykes | Ring works, marsh and coastal lowland provinces | Floods can't turn fields to marsh; with F8 marsh tiles can be drained | Start in the Low Countries and the Po valley; F8 elsewhere | 100 g · 60 stone · 36 mo |
| Rail station | Town slot | Grain and armies move by rail | C16 railways | 150 g · 40 steel · 12 mo |
| Telegraph office | Town slot | Days to capital count as 1 for orders and market prices | T14 telegraphy | 60 g · 10 iron · 6 mo |

### Landmarks (§8; config `landmarks`, more than these 15)
| Landmark | Place | In 1444? | Type | Its own effect |
|---|---|---|---|---|
| Hagia Sophia | Constantinople | Yes (church; mosque after the 1453 conversion event) | House of worship, step 4 | Its faith's houses of worship in every province in reach of the capital turn the faith mix twice as fast |
| Forbidden City | Beijing | Yes (finished 1420) | Palace, step 4 | +24 officials; lords at court never waver |
| Alhambra | Granada | Yes | Palace, step 3 | Granada's castle counts one step higher |
| Great Mosque of Djenné | Djenné | Yes (earth) | House of worship, step 4 | No grievance from the doubled earth upkeep; traders passing +20 % in the replastering season |
| Sankore Mosque and its schools | Timbuktu | Yes | School, step 3 | Scholars from any Muslim realm may settle here |
| Masjid al-Haram | Mecca | Yes | Pilgrimage shrine, step 4 | Pilgrims passing: the largest in the world |
| St Peter's Basilica | Rome | No (founded 1506 by event) | House of worship, step 4 | While being built, realms of its faith can be asked for gifts toward it (an event Reformation events can read) |
| Topkapı Palace | Constantinople | No (1459, by event) | Palace, step 4 | +20 officials; the capital's seat runs two provinces |
| Ulugh Beg Observatory | Samarkand | Yes (destroyed 1449 by event, historically) | Observatory, step 3 | Boats and Counting inventions 20 % cheaper for its owner |
| Kremlin | Moscow | Yes (white stone; brick walls 1485–95 by event) | Castle, step 3 | Palace and castle share one tile |
| Templo Mayor | Tenochtitlan | Yes | House of worship, step 4 | Lords of the Triple Alliance gain loyalty when the realm wins a war |
| Coricancha | Cusco | Yes | House of worship, step 4 | Every province linked to Cusco by road counts one day closer |
| Angkor | Angkor | Yes (court left around 1431) | House of worship, step 4, neglected | Upkeep can be paid to bring it back to sound; restoring it is a decision with its own event |
| Venetian Arsenal | Venice | Yes | Shipyard, step 4 | 3 slipways |
| Taj Mahal | Agra | No (1632, by event) | Landmark tomb, own type | Traders passing in Agra +30 % |

### Domain services
- **CostCalculator**: step cost × ground multiplier (gold, months), materials unchanged; crew; master-of-works factor.
- **MaterialSourcing**: own province → realm province in reach → bought at the province's price.
- **CrewAssignment**: homeless first, then every class by share; returns crews when done.
- **ConditionKeeper**: monthly upkeep payment, neglect counting, step loss, damage and repair.
- **BuildAdvisor**: yearly advice (at most five) from empty tiles, homeless and unused wares.
- **AIBuilder**: one province per country per month, first fitting rule.

## 5. Requirements

### 5.1 What a building is
- BLD-001 The buildings context shall give every building a type, place, step, owner, jobs (slots and filled), makes, needs, condition and upkeep. [buildings §1]
- BLD-002 The buildings context shall give each building one class of job slots; filled slots make wares and empty slots make nothing. [buildings §0, §1]
- BLD-003 The buildings context shall let a building have steps 1 to 3, and castles and roads 5. [buildings §1, D-BLD-4]
- BLD-004 When the player taps a building, the game shall open its card showing every field with its gain and lose list, the next step's gain and cost, and Upgrade, Demolish and Close actions. [buildings §1]
- BLD-005 The buildings context shall give each building one effect at most besides jobs and wares, and shall never give a flat percentage to a country. [buildings intro, §17]

### 5.2 Places, slots and limits
- BLD-006 The buildings context shall allow one land building on each land tile (fields, pasture, woods, marsh, waste), of a kind that fits the tile use. [buildings §2.1]
- BLD-007 The buildings context shall allow one shore building on each shore tile: fishery, saltworks, harbour, shipyard, bridge or lighthouse (also naval base). [buildings §2.1, §7.9]
- BLD-008 The buildings context shall allow one castle per province on its castle tile, with its granary as a part of the castle and not a second building. [buildings §2.1]
- BLD-009 The buildings context shall give each town the number of town slots of its town size: hamlet 1, village 2, market town 4, town 6, city 9, great city 12. [buildings §2.2]
- BLD-010 The buildings context shall hold ring works (road, canal, town walls, wells and drains, dykes, watchtower line) as one of each per province, with steps, taking no tile or slot. [buildings §2.1, §7.6, §7.8, §7.10]
- BLD-011 When a town shrinks below its building count, the buildings context shall keep the buildings and mark the extra ones neglected until the town grows back; the player chooses which on a prompt and the AI drops the newest. [buildings §2.2]
- BLD-012 The buildings context shall give the capital one extra town slot, held for the palace. [buildings §2.2]
- BLD-013 The buildings context shall place town walls and landmarks that stand outside the town (a monastery, an observatory) without using a town slot. [buildings §2.2, §7.6]
- BLD-014 The buildings context shall allow at most one per province of: market, seat, school, mint, drill yard, arsenal, hospital, bank, harbour, shipyard, lighthouse, rail station, power station. [buildings §2.3]
- BLD-015 The buildings context shall allow at most one house of worship per faith per town. [buildings §2.3]
- BLD-016 The buildings context shall allow at most one per realm, in the capital, of: palace, chancery, diet hall, hostage residence, parliament house. [buildings §2.3]
- BLD-017 The buildings context shall allow as many ware-making buildings (farms, ranches, mines, loom houses, forges and the rest) as there are fitting places. [buildings §2.3]

### 5.3 The build sheet and costs
- BLD-018 When the player taps an empty tile, empty town slot or Build on the province card, the game shall show the build sheet listing each fitting building with jobs, what it makes, cost and months already multiplied by the ground. [buildings §3.1]
- BLD-019 If a building's needs are not met, then the build sheet shall show its row greyed with what it is missing (an invention, a town size). [buildings §3.1]
- BLD-020 The build sheet shall show a "why here" line with the province's homeless and how the tile is worked. [buildings §3.1]
- BLD-021 The buildings context shall cost every building and step in gold, materials, labourers and months. [buildings §3.2]
- BLD-022 When a site starts, the owner shall pay its gold up front from the owner's treasury (crown, lord's wealth, clergy's, town's). [buildings §3.2, §19.1]
- BLD-023 The buildings context shall multiply gold and months, not materials, by the ground: farmland ×1, hills ×1.25, mountains ×2, jungle ×2. [buildings §3.2]
- BLD-024 When a build is cancelled, the buildings context shall refund half the gold and the materials not yet used. [buildings §3.2]

### 5.4 Materials
- BLD-025 The buildings context shall take materials from the province's own wares first, then from any realm province in reach, then buy them at the province's price. [buildings §3.2, §3.3]
- BLD-026 The buildings context shall count reach as the province itself, a realm province one ring away, or further along roads and rivers. [buildings §3.3]
- BLD-027 The buildings context shall buy materials at the config prices: timber 0.5, stone 0.5, bricks 0.8, iron 2, steel and concrete 3 gold a load. [buildings §3.3]
- BLD-028 If a province is more than 3 provinces from any quarry, then the buildings context shall charge twice the stone price. [buildings §3.3]
- BLD-029 The buildings context shall accept bricks in place of stone, one for one. [buildings §3.3]
- BLD-030 Where a province is drylands, desert or savanna, the buildings context shall allow earth, free and made on site, in place of stone, and shall double that building's upkeep. [buildings §3.3]
- BLD-031 The buildings context shall make iron available as a material from era IV and steel and concrete from era VI. [buildings §3.3]
- BLD-032 If no trade route touches a province, then the buildings context shall make bought materials 25 % dearer there than their base price. [buildings §3.3, X-6, D-BLD-2]

### 5.5 Labourers
- BLD-033 The buildings context shall give every site a crew size from config (for example 500 for a farm, 3,000 for a stone castle, 6,000 for a canal). [buildings §3.4]
- BLD-034 When a site takes its crew, the buildings context shall take the province's homeless first; while they work they are fed, steal nothing and do not count toward the homeless trouble. [buildings §3.4]
- BLD-035 If there are not enough homeless, then the buildings context shall take the rest from every class by its share, leaving their slots empty while they build. [buildings §3.4]
- BLD-036 While a site has half its crew, the buildings context shall take twice the months; while it has no crew, the site shall stop. [buildings §3.4]
- BLD-037 When a site is done, the buildings context shall move crew from the homeless into the new building's job slots if they fit the class, and return the rest to being homeless (other classes go back to their slots). [buildings §3.4]

### 5.6 Sites
- BLD-038 The buildings context shall run one site per place at a time. [buildings §3.5]
- BLD-039 The buildings context shall let the crown run two sites per province at once, one on the land and one in the town. [buildings §3.5]
- BLD-040 Where a province has a master of works official, the buildings context shall add one more land and one more town site and halve the months. [buildings §3.5]
- BLD-041 The buildings context shall let lords run their own sites in their own provinces with their own gold, without using the crown's sites. [buildings §3.5]
- BLD-042 While it is the coldest month of a cold climate or the wettest month of a monsoon climate (config by climate), the buildings context shall stop sites on the land. [buildings §3.5]
- BLD-043 While an enemy army is in a province, the buildings context shall stop every site there. [buildings §3.5]
- BLD-044 While a province is occupied, the buildings context shall stop its sites and let the occupier loot their materials. [buildings §3.5]
- BLD-045 When a town is sacked, the buildings context shall remove its town site. [buildings §3.5]

### 5.7 How buildings are gained
- BLD-046 The buildings context shall let a building be gained by building it, by a lord, the clergy or a town building it, by the people building it, by conquest (with its owners if they stay), by an event, or from the start of the game. [buildings §3.6]

### 5.8 Steps and upgrades
- BLD-047 The buildings context shall give each step its own gold, materials and months. [buildings §4]
- BLD-048 While a building is being upgraded, the buildings context shall keep it working at its old step, except a castle, whose walls count one step lower during the work. [buildings §4]
- BLD-049 If a step's needs (invention, town size, nearby building, charter) are not met, then the buildings context shall not allow that upgrade. [buildings §4]
- BLD-050 When a building has 10 years of neglect, is sacked or hit by an earthquake, the buildings context shall take it down one step, and a step-1 building that falls shall become ruined. [buildings §4, §5.2]
- BLD-051 The buildings context shall define the market's steps as weekly market (1,500 market folk, village or bigger), yearly fair (2,400, market charter and market town) and trading house (3,000, T3 and town or bigger). [buildings §4, §7.4]

### 5.9 Upkeep
- BLD-052 The buildings context shall make each building's owner pay its upkeep every month, a twelfth of the yearly figure. [buildings §5.1, §19.1]
- BLD-053 The buildings context shall set upkeep by group from config: farms, ranches, fisheries, lumber camps 0–0.5; mines, quarries, craft buildings, markets 0.5–2; schools, hospitals, almshouses 2–6; castles 3 (earthwork) to 20 (star fort), more with a garrison; landmarks and the palace 5–30 gold a year. [buildings §5.1]
- BLD-054 The buildings context shall charge houses of worship's upkeep to the clergy, unless the crown takes it over. [buildings §5.1]
- BLD-055 The game shall show the sum of building upkeep on the Treasury card's Upkeep line. [buildings §5.1, §18]

### 5.10 Condition
- BLD-056 While a building is sound, the buildings context shall have it work at full. [buildings §5.2]
- BLD-057 When a building's upkeep goes unpaid in a month, or its town shrinks below it, the buildings context shall make it neglected, working at half. [buildings §5.2]
- BLD-058 When a neglected building's upkeep has been paid again for a full season (3 months), the buildings context shall make it sound. [buildings §5.2]
- BLD-059 When a building is damaged by fire, flood, earthquake, a siege breach (castle) or a bad raid, the buildings context shall have it work at half and make nothing in its first season. [buildings §5.2]
- BLD-060 When a damaged building is repaired, the buildings context shall charge half the gold, half the materials and half the months. [buildings §5.2]
- BLD-061 When a tile is burned, a town building is plundered, a castle is razed, or a step-1 building has 10 years of neglect, the buildings context shall make it ruined, making nothing. [buildings §5.2]
- BLD-062 The buildings context shall let a ruined building be rebuilt at half cost, or cleared for something else. [buildings §5.2]
- BLD-063 While a province is at peace, the buildings context shall let burned (ruined) land buildings rebuild by themselves, one a year; town buildings shall need an owner to pay. [buildings §5.2]

### 5.11 How buildings are lost or damaged
- BLD-064 When foraging or looting armies pass, the buildings context shall burn land buildings tile by tile. [buildings §5.3]
- BLD-065 When a raid hits a province, the buildings context shall damage one building, or ruin it if the raid is big; town walls shall stop raids reaching town buildings. [buildings §5.3, §7.8]
- BLD-066 When a town is plundered, the buildings context shall ruin 1 in 3 of its town buildings, or 1 in 6 with town walls at any step, the palisade included. [buildings §5.3, §7.8, D-BLD-12]
- BLD-067 While rebels hold a province, the buildings context shall let them loot one town building a season, the market first. [buildings §5.3]
- BLD-068 The buildings context shall roll a town fire each year in towns of timber, more likely in big towns and shanty camps and less where most buildings are stone or brick, damaging one to three town buildings. [buildings §5.3]
- BLD-069 When a flood hits a river or marsh province, the buildings context shall damage land buildings on shore and marsh tiles; a dyke broken in war shall turn fields to marsh. [buildings §5.3]
- BLD-070 When an earthquake event hits a quake region (config by region), the buildings context shall damage one building in three and take castles a step down. [buildings §5.3]
- BLD-071 When an owner demolishes a building, the buildings context shall return a quarter of its materials and overflow its workers. [buildings §5.3]
- BLD-072 When a peace treaty demands it, the buildings context shall demolish the named castles. [buildings §5.3]
- BLD-073 When a tile changes use (woods cleared, town growing over fields), the buildings context shall end the building that no longer fits. [buildings §5.3]
- BLD-074 When a mine's seam runs out, the buildings context shall close the mine. [buildings §5.3]

### 5.12 Converting
- BLD-075 When the owner changes a farm's crop (grain, flax, cotton, dyes), the buildings context shall make the change in one season at no cost. [buildings §5.4]
- BLD-076 The buildings context shall let a house of worship be given to another faith, when and at the cost in grievances the religion context sets. [buildings §5.4]
- BLD-077 The buildings context shall let a craft building change its trade, and a factory its product, at half the cost of building the new one. [buildings §5.4, §7.3]
- BLD-078 When a castle is slighted, the buildings context shall leave a ruin that rebuilds at half cost. [buildings §5.4]

### 5.13 Owners
- BLD-079 The buildings context shall make a building's owner pay its upkeep and decide its upgrades, demolition and conversion. [buildings §0, §6.1]
- BLD-080 When the crown pays for a building in a lord's province, the buildings context shall make the lord its owner and raise his loyalty one step. [buildings §6.1]
- BLD-081 When a lord defects, the buildings context shall let his buildings go with him; when his line dies out or his land is seized, they shall come to the crown. [buildings §6.1]
- BLD-082 The buildings context shall let the clergy build and own houses of worship, monasteries, almshouses, hospitals and church schools with their own wealth. [buildings §6.1]
- BLD-083 Where a town has a Town law charter, the buildings context shall let it build and own markets, walls, guild halls and bridges, which the crown can't demolish or seize without breaking the charter. [buildings §6.1]
- BLD-084 Where a merchant house or company has a Mining right or company charter (T8, T9), the buildings context shall let it build and own mines, warehouses, trading houses, plantations and overseas posts, keeping half their output. [buildings §6.1]
- BLD-085 The buildings context shall let the commons own basic land buildings with no upkeep; if the crown demolishes one, then the province shall gain a Burned homes grievance. [buildings §6.1]
- BLD-086 The buildings context shall have lords choose what to build by trait (Builder most; Greedy markets and mines; Pious houses of worship and monasteries; Warlike castles and drill yards), their wealth and what their provinces lack. [buildings §6.2]
- BLD-087 The buildings context shall have the clergy build a house of worship in every town of their faith first, then monasteries, almshouses where there are homeless, hospitals in plague years, and schools, by the faith's share in the province. [buildings §6.2]
- BLD-088 The buildings context shall have chartered towns build market steps, walls, a bridge, then craft buildings, by their traders and wealth. [buildings §6.2]
- BLD-089 The buildings context shall have companies build warehouses and trading houses on their routes and mines and plantations they hold rights to, by trade value. [buildings §6.2]

### 5.14 What the people build
- BLD-090 When a year ends in a province at peace for 5 years, with more than 3 months of food in store and homeless or full slots, the buildings context shall roll a chance (config, 20 %) to place a step-1 farm, ranch, fishery or lumber camp on an empty matching tile, owned by the commons. [buildings §6.3]
- BLD-091 When a town has a market, homeless people, the raw ware nearby and a trade ratio of at least 30 %, the buildings context shall each year give a 1 in 10 chance that a loom house, tannery, kiln or brewery appears, owned by the town or the commons; craftsmen fleeing persecution abroad can found one. [buildings §6.3, trade §9, D-BLD-15]

### 5.15 Building catalogue rules
- BLD-092 The buildings config shall define every building in the catalogue of section 4 with its place, jobs, makes, needs, unlocks and cost by step. [buildings §7]
- BLD-093 While a farm grows a crop other than grain, the buildings context shall make it feed nobody, and the province card shall warn when a crop change would leave the province short of food. [buildings §7.1]
- BLD-094 When a grove is built, the buildings context shall have it bear only 3 years later. [buildings §7.1]
- BLD-095 The buildings context shall never give a plantation a forced-labour bonus. [buildings §7.1]
- BLD-096 The buildings context shall have a monastery make grain at the farm rate, make clergy in the province and give 20 student seats with L1. [buildings §7.1, §7.5]
- BLD-097 The buildings context shall let a saltpetre works stand only in a province with a ranch or horse stud. [buildings §7.2]
- BLD-098 The buildings context shall let a weaving manufactory work only with an official in the province. [buildings §7.3]
- BLD-099 The buildings context shall let a printing house make schools in reach cheaper. [buildings §7.3]
- BLD-100 The buildings context shall have a factory make Smoke, and step-2 factories need a power station in the province. [buildings §7.3]
- BLD-101 The buildings context shall give the market, caravanserai, warehouse, counting house, trading post and bank the trade roles of §7.4 as flags the trade context reads. [buildings §7.4, §12.2]
- BLD-102 The buildings context shall let a minority house of worship be built only where its faith has at least a tenth of the province or a Faith tolerance charter, and it shall calm that faith instead of spreading it. [buildings §7.5]
- BLD-103 The buildings context shall place pilgrimage shrines only at named holy places, present at the start or founded by event, never from the build sheet; pilgrims shall count as traders passing. [buildings §7.5]
- BLD-104 The buildings context shall move each faith in a province by its own houses of worship; pulling down a minority house of worship shall be persecution. [buildings §7.5, §16]
- BLD-105 The buildings context shall give a school student seats by step (20; 30 madrasa or 60 university; 100 academy), staffed by scholars from graduates only, in a market town or bigger. [buildings §7.6]
- BLD-106 The buildings context shall have a library make students graduate a year sooner and keep a sacked town's scholars from all fleeing. [buildings §7.6]
- BLD-107 The buildings context shall have an observatory double scholars' rate on Boats inventions. [buildings §7.6]
- BLD-108 The buildings context shall have a hospital make town classes die 0.5 % slower and slow plague. [buildings §7.6]
- BLD-109 The buildings context shall have wells and drains halve plague deaths in town and let the town grow one size bigger before shanty camps. [buildings §7.6]
- BLD-110 The buildings context shall have an almshouse shelter 3,000 homeless. [buildings §7.6]
- BLD-111 The buildings context shall add each rule building's officials and lords (numbers owned by government) to the realm's caps. [buildings §7.7]
- BLD-112 The buildings context shall have a chancery be the building in which tax registers (G3) and the census (G10) take effect. [buildings §7.7, §18]
- BLD-113 The buildings context shall have a mint turn silver and gold wares into coin at full value instead of selling them. [buildings §7.7]
- BLD-114 The buildings context shall have a drill yard give 1,500 training room (any arm), and its barracks step 4,000 with no Soldiers quartered for standing regiments housed there. [buildings §7.8]
- BLD-115 If a realm keeps arms and powder stores without an arsenal, then they shall lose a tenth a year. [buildings §7.8]
- BLD-116 The buildings context shall have a watchtower line show enemy armies one province further away and spot raids a season ahead. [buildings §7.8]
- BLD-117 The buildings context shall have a harbour make the province a port with 10 / 25 / 50 berths by step, raise sailors from its people and let small hulls be built without a shipyard. [buildings §7.9]
- BLD-118 The buildings context shall have a shipyard give 1 / 2 / 2 slipways by step (the Venetian Arsenal 3), where ships are bought and built and crewed by sailors in port. [buildings §7.9]
- BLD-119 The buildings context shall have a lighthouse halve storm losses in the next sea zone. [buildings §7.9]
- BLD-120 The buildings context shall have a naval base keep based fleets' crews in peace without pay at sea and reinforce its side in sea battles next to it. [buildings §7.9]
- BLD-121 The buildings context shall build roads, bridges, canals, dykes, rail stations and telegraph offices with the same costs as any building; their travel effects belong to troop-movement and warfare. [buildings §7.10]
- BLD-122 The buildings context shall have a telegraph office count Days to capital as 1 for orders and market prices in its province. [buildings §7.10]
- BLD-123 The buildings context shall have dykes stop floods turning fields to marsh, and with F8 let marsh tiles be drained. [buildings §7.10]

### 5.16 Landmarks and variants
- BLD-124 The buildings context shall treat a landmark as its building type at the top step, marked as a landmark, with one effect of its own, written as a count. [buildings §8, D-BLD-5]
- BLD-125 The buildings context shall never offer a landmark on the build sheet; landmarks are on the map at the start or founded by an event when its historical requirements are met. [buildings §8]
- BLD-126 The buildings context shall include only real historical landmarks that stood or were built between 1444 and 1939; an event may found one elsewhere or not at all, but no invented landmark. [buildings §19.4]
- BLD-127 The buildings context shall apply each landmark's own effect as listed in the landmark table. [buildings §8]
- BLD-128 The game shall show landmarks as a small icon on their province at world zoom, each with its own sprite at local zoom. [buildings §8, §11.1]
- BLD-129 The buildings context shall give a building the same effect everywhere, with its name and sprite chosen by the province's region and faith (config `variants`). [buildings §9.1]
- BLD-130 The buildings context shall store the unique variants (Külliye, Kontor, Qollqa line, Polder mill, Ever-normal granary, Funduq quarter) in its data by country or culture, each changing one number or adding one line. [buildings §9.2, D-BLD-16]

### 5.17 Eras
- BLD-131 The buildings context shall offer on the build sheet only buildings and steps whose unlock (start, invention, government form, region) the realm has. [buildings §7, §10]

### 5.18 Screens and notifications
- BLD-132 The game shall show buildings by zoom: nothing but landmarks at world; castle, town size, harbour anchor, a hammer on provinces with a site and a cracked icon for neglected or damaged at region; each building's sprite and step, scaffolding and ash at local. [buildings §11.1]
- BLD-133 The game shall offer a Works lens (sites green, neglected or damaged amber, ruined red) and a Jobs lens (empty job slots against homeless). [buildings §11.1]
- BLD-134 The game shall offer a realm Works screen listing sites (progress, crew), needs (neglected, ruined, with Pay and Rebuild) and advice, with the realm's yearly upkeep and site count. [buildings §11.2]
- BLD-135 When a year begins, the buildings context shall work out at most five advice lines from empty tiles, homeless people and wares that arrive unused. [buildings §11.2]
- BLD-136 When the player orders Build all advised, the buildings context shall queue every suggestion that fits the gold set aside. [buildings §11.2]
- BLD-137 When the player gives a batch order, the buildings context shall build that one thing everywhere it fits. [buildings §11.2]
- BLD-138 The turn report shall carry one line per finished building, one per building lost, and one in the month upkeep first goes unpaid. [buildings §11.3]

### 5.19 Events
- BLD-139 When an event applies `add_building: {type, step, owner}`, the buildings context shall place it on a fitting empty tile or slot, or if none, raise the province's least-filled building a step. [buildings §12.1]
- BLD-140 When an event applies `remove_building: {type}`, the buildings context shall ruin it. [buildings §12.1]
- BLD-141 When an event applies `damage_buildings: {share}`, the buildings context shall damage that share of the province's buildings. [buildings §12.1]
- BLD-142 When an event applies `building_step: {type, change}`, the buildings context shall move that building up or down a step. [buildings §12.1]
- BLD-143 The buildings context shall answer the condition `has_building: {type, step}`. [buildings §12.1]
- BLD-144 When an event applies the old province stats, the buildings context shall map `prosperity +2` to two fitting buildings, `fort_level +1` to a castle step, `infrastructure +1` to a road step and `industry +1` to a factory. [buildings §12.1]

### 5.20 The AI
- BLD-145 The AI shall build by the same rules and costs as the player. [buildings §13]
- BLD-146 Each month, each AI country shall check one province in turn and pick at most one building there by the first fitting rule: repair; food for a hungry province; a building for homeless over 5 %; a craft building for an unused raw ware; castle step or walls on a frontier expecting war; faith or trade gaps; otherwise its personality. [buildings §13]
- BLD-147 If building would leave the AI with less than a year's upkeep in reserve, or the site can't be crewed, then the AI shall not start it. [buildings §13]

### 5.21 Starting buildings and data
- BLD-148 When a campaign starts, the buildings context shall place buildings from the map's wealth (1: a farm or ranch on a third of tiles; 10: every tile built and town buildings at step 2). [buildings §15.2]
- BLD-149 When a campaign starts, the buildings context shall set town size from population and fill town slots by a regional template. [buildings §15.2]
- BLD-150 When a campaign starts, the buildings context shall set houses of worship's faith, lords' buildings and landmarks from the country catalogue, and allowed buildings and steps from start inventions. [buildings §15.2]
- BLD-151 When a campaign starts, the buildings context shall place harbours and shipyards with their steps from the naval context's start-ports list (236 provinces). [buildings §7.9, §15.2] (D-BLD-8)
- BLD-152 When a campaign starts, the buildings context shall place fixed mines, named markets and landmarks from the event-tree geography anchors (Potosí from 1545 by event, Kutná Hora, Falun; Bruges, Champagne fairs, Malacca). [buildings §15.2]
- BLD-153 The buildings context shall store five small numbers per building (type, step, owner, condition, filled jobs), keep sites in one realm-level list, and work out output and upkeep monthly and advice yearly. [buildings §15.3]
- BLD-154 The buildings config shall hold every building as one entry, so adding a building is adding an entry and adding a step is adding a row. [buildings §15.1]

### 5.22 Decided rules (17 October 2026)
- BLD-155 Troyes shall start in 1444 as a town with 6 town slots. [D-BLD-1]
- BLD-156 A master of works shall add one more of each, halve the months and make the gold 25 % less. [province §10.2, D-BLD-3]
- BLD-157 Roads shall have five steps: track (known at the start, half a road's cost), road and paved road (B2), turnpike (B9, 1.5 × paved road), railway (C16). [D-BLD-13]
- BLD-158 Building market step 2 (yearly fair) shall need T6 and a market charter; yearly fairs standing in 1444 stay. [trade §11, D-TRADE-3, D-BLD-6]
- BLD-159 The caravanserai shall give land traders +25 % weight and stop bandits; the counting house shall let foreign traders deposit with bills of exchange. [trade §14, D-BLD-7]
- BLD-160 A burned tile shall rebuild itself free, one a year in peace; paying half a farm's cost rebuilds one within a season. [D-BLD-21]
- BLD-161 A town shall burn with a chance of 1 % a year (+0.5 % per size above town); a raid of 2,000 men or more is big. [D-BLD-17]

### 5.23 The build queue (Leroy, 17 October 2026)
- BLD-162 When the player orders a build in a province whose sites of that kind are all busy, or whose queue already holds builds, the buildings context shall put it at the back of that province's build queue instead of refusing it. [F-39]
- BLD-163 The buildings context shall hold at most `sites.queue_max` (10) builds in a province's queue, and shall refuse a build that could not start there even once the running sites are done (an unlock, a need, a limit, no place). [F-39]
- BLD-164 When a site finishes, the buildings context shall start the oldest queued builds of that province that now have a free site and the gold, paying for each only as it starts; a build that has to wait keeps its place, and one that can no longer be built there is taken off with a line in the turn report. [F-39]
- BLD-165 The buildings context shall let the player cancel a queued build, with nothing to refund, and move it earlier or later in its province's queue. [F-39]

#### How the player uses it: the build queue
- BLD-166 Where: the player taps a province, then its Build tab, and taps a building on the build sheet; with a site free it starts, otherwise the row says "Queued" and the build joins the queue, and the sheet says why a build can't be queued at all. [F-39; X-19]
- BLD-167 Grouping: the Build tab shows the sites running with their months left, and under them the queue, one row per build with its cost and months and buttons to move it up or down or cancel it. [F-39; X-19]
- BLD-168 Overview: the realm's Works overview lists every province with a site or a queue, with its counts and the next build to finish; tapping one opens that province's Build tab. [F-39; X-19]
- BLD-169 Phone: in landscape the queue rows are at least 48 points tall, the move and cancel buttons at least 44 × 44 with 8 points between them, and nothing needs hover. [F-39; X-19]

## 6. Commands

| Command | Who issues it | Preconditions | Result | Events emitted |
|---|---|---|---|---|
| StartBuilding(province, place, type, crop/product?) | player / AI / lord / clergy / town / company | Place empty and fitting; unlock known; needs met; limit not reached; a free site of that kind; owner can pay gold | Gold paid; site created; crew assigned; materials sourced | SiteStarted |
| UpgradeBuilding(building) | owner | Next step exists and unlocked; needs met; free site | Site for the next step; building works at old step (castle one lower) | SiteStarted |
| CancelSite(site) | owner | Site running | Half gold and unused materials refunded; crew returned | SiteCancelled |
| QueueBuilding(province, type, place?) | player | Could start once running sites are done; queue under 10 | Starts now if a site is free and the queue is empty, else waits in the province's queue | SiteStarted or BuildQueued |
| CancelQueued(build) / MoveQueued(build, earlier or later) | player | Build is queued | Taken off, nothing paid; or moved within its province's queue | — |
| RepairBuilding(building) | owner | Damaged | Half gold, materials, months | SiteStarted |
| RebuildBuilding(building) | owner | Ruined | Half cost site | SiteStarted |
| ClearRuin(building) | owner | Ruined | Place empty | BuildingRemoved |
| DemolishBuilding(building) | owner | Not protected by a charter (town) or accepting Burned homes (commons) | Quarter materials back; workers overflow | BuildingDemolished |
| ConvertBuilding(building, to) | owner | Same kind (crop, faith, trade, product) | Crop free in a season; trade/product at half cost; faith per religion | BuildingConverted |
| SlightCastle(castle) | owner | Castle stands | Castle ruined | BuildingRuined |
| PayUpkeep(province) | player | Neglected buildings | Upkeep paid | — |
| ChooseNeglected(province, buildings) | player | Town shrank | Chosen buildings neglected | BuildingNeglected |
| BuildAllAdvised(gold set aside) | player | Advice exists | Advice queued within gold | SiteStarted × n |
| BatchOrder(type, filter) | player | — | Site everywhere it fits | SiteStarted × n |
| TakeOverClergyUpkeep(building) | player | Clergy-owned house of worship | Crown pays its upkeep | — |

## 7. Domain events

| Event | When | Payload | Consumed by |
|---|---|---|---|
| SiteStarted | A site begins | province, place, type, step, owner, crew, months | game-shell (Works), province (crew leaves homeless/slots) |
| SiteStopped / SiteResumed | Season, enemy army, occupation, no crew | site, reason | game-shell |
| SiteCancelled | Cancel | site, refund | realm |
| BuildQueued / BuildLeftQueue | A build waits for a site; a queued build can no longer be built | province, type, step, reason | game-shell (Build tab, turn report) |
| BuildingCompleted | Site finishes | building, step, job slots | province (slots open before overflow), game-shell (turn report), achievements |
| BuildingStepChanged | Up or down a step | building, from, to | government, warfare, naval, trade |
| BuildingNeglected | Upkeep unpaid or town shrank | building | game-shell (turn report line), map-presentation |
| BuildingDamaged / BuildingRuined | Causes in 5.11 | building, cause | province, trade, game-shell |
| BuildingDemolished | Owner demolishes | building, materials returned | province (overflow), province (Burned homes) |
| BuildingConverted | Conversion | building, from, to | religion, trade |
| BuildingOwnerChanged | Defection, seizure, conquest | building, from, to | realm, government |
| UpkeepUnpaid | First month unpaid | realm, amount | game-shell, realm |
| LandmarkFounded | Event founds a landmark | landmark, province | map-presentation, national-strengths |

## 8. Policies (reactions to other contexts)

- When **province** reports a town size change, then recompute town slots; mark extra buildings neglected (BLD-011).
- When **province** reports a tile burned (foraging, looting), then the land building on it is ruined (BLD-061, BLD-064).
- When **province** reports a tile change of use, then end the building that no longer fits (BLD-073).
- When **province** reports a seam exhausted, then close the mine (BLD-074).
- When **warfare** reports a raid, plunder, sack, siege breach, razing or occupation, then damage, ruin, stop sites or remove the town site (BLD-044, BLD-045, BLD-059, BLD-065, BLD-066).
- When **warfare** or **diplomacy** applies a peace term demanding castles demolished, then demolish them (BLD-072).
- When **rebellions** report rebels holding a province, then loot one town building a season, market first (BLD-067).
- When **events** apply a building effect, then apply BLD-139..144; when an earthquake or flood event fires, BLD-069/070.
- When **realm** reports a lord defecting, his line dying out or his land seized, then change building owners (BLD-081).
- When **realm** cannot pay upkeep, then neglect (BLD-057).
- When **religion** converts a house of worship (Hagia Sophia 1453), then change its faith (BLD-076).
- When **research** grants an invention, then new buildings or steps appear on the build sheet (BLD-131).

## 9. Monthly step

A turn is one week (X-18). The steps below are monthly: they run once, in the turn in which a new month begins.

Each month (reads first: treasury gold from realm; homeless and classes from province; armies and occupation from warfare;
season and climate from time-and-turns):
1. Upkeep is paid by each owner or goes unpaid (neglect starts; neglect cleared after 3 paid months).
2. Sites advance: crews checked, materials sourced, months counted (stopped by season or enemy army).
3. Finished buildings open their job slots **before** overflow runs (province 6.3).
4. AI: each country checks one province.
Each season: farms, groves and fisheries make food; damaged buildings' first-season penalty ends; rebels loot.
Each year: wares made; neglect years counted (step loss at 10); village works and craft buildings appearing; town fire
roll; burned tiles rebuild one a year in peace; Works advice worked out. The global order is time-and-turns' (gap-lists
List 1 item 20).

## 10. Configuration

All in one buildings config file; all values placeholders for balancing.

| Key | Meaning | Value in the design | Placeholder? | Config file |
|---|---|---|---|---|
| `materials.timber.price` | Bought timber | 0.5 g a load | yes | buildings-config |
| `materials.stone.price`, `far_price_multiplier`, `far_after_rings` | Stone price, far from quarry | 0.5; ×2; more than 3 provinces | yes | buildings-config |
| `materials.bricks.price`, `counts_as` | Bricks | 0.8; stone | yes | buildings-config |
| `materials.earth.grounds`, `upkeep_multiplier` | Earth instead of stone | drylands, desert, savanna; ×2 | yes | buildings-config |
| `materials.iron.price`, `from_era` | Iron | 2; IV | yes | buildings-config |
| `materials.steel.price` / `concrete.price`, `from_era` | Steel, concrete | 3; VI | yes | buildings-config |
| `town_slots.*` | Slots by town size | 1, 2, 4, 6, 9, 12; capital +1 | yes | buildings-config |
| `sites.per_province` | Crown sites | land 1, town 1 | yes | buildings-config |
| `sites.master_of_works` | Extra sites, months, gold | +1 each; ×0.5 months; ×0.75 gold (config only) | yes | buildings-config |
| `sites.half_crew_months_multiplier` | Half crew | ×2 | yes | buildings-config |
| `sites.cancel_refund` | Cancel refund | 0.5 | yes | buildings-config |
| `sites.stop_months_by_climate` | Stopped months | cold [1], monsoon [7] | yes | buildings-config |
| `condition.neglected_output` | Neglected output | 0.5 | yes | buildings-config |
| `condition.years_neglected_to_lose_step` | Step loss | 10 | yes | buildings-config |
| `condition.repair_cost_share` | Repair | 0.5 | yes | buildings-config |
| `condition.demolish_material_refund` | Demolish refund | 0.25 | yes | buildings-config |
| (design) neglect recovery | Months paid to end neglect | 3 | yes | not yet in config |
| `village_works.chance_per_year`, `needs`, `builds`, `owner` | Village works | 0.20; 5 years peace, 3 months food, homeless or full slots; farm, ranch, fishery, lumber camp; commons | yes | buildings-config |
| `buildings[].steps[].jobs/makes/eats/cost/upkeep/unlocked_by/needs` | Per building and step | Section 4 catalogue | yes | buildings-config |
| `buildings[].steps[].cost.crew` | Crew | farm 500; stone castle 3,000; canal 6,000 | yes | buildings-config |
| `buildings.farm.steps[0].makes.grain` | People fed per worker a year | 1.5 | yes | buildings-config |
| `buildings.quarry.makes.stone` | Stone a year at full jobs | 40 | yes | buildings-config |
| `buildings.loom_house.makes/eats` | Cloth / wool | 30 / 30 | yes | buildings-config |
| `buildings.harbour.steps[].berths` | Berths | 10 / 25 / 50 | yes | buildings-config |
| `buildings.shipyard.steps[].slipways` | Slipways | 1 / 2 / 2 | yes | buildings-config |
| `buildings.shipyard.eats.timber` | Shipyard timber | 20 | yes | buildings-config |
| `buildings.drill_yard.steps[].training_room` | Training room | 1,500 / 4,000 | yes | buildings-config |
| `buildings.palace.steps[]` | Officials / lords (government's numbers) | 6/2, 10/4, 16/6 | yes | buildings-config |
| upkeep groups | Yearly upkeep ranges | §5.9 | yes | buildings-config |
| arsenal spoil | Loss without arsenal | a tenth a year | yes | not yet in config |
| hospital death rate | Slower town deaths | 0.5 % | yes | not yet in config |
| almshouse shelter | Homeless sheltered | 3,000 | yes | not yet in config |
| grove bearing | Years to bear | 3 | yes | buildings-config |
| AI reserve | Reserve before building | one year's upkeep | yes | not yet in config |
| AI homeless trigger | Homeless share | 5 % | yes | not yet in config |
| advice size | Advice lines | at most 5 | yes | not yet in config |
| `landmarks[]` | Landmark entries | 15 listed, more in config | yes | buildings-config |
| `variants` | Regional names and sprites | §9.1 | — | buildings-config |
| `start_ports.file` | 1444 ports | ../naval/data/start-ports.json | — | buildings-config |
| quake regions, fire chance | Damage rolls | not given | yes | not yet in config |

## 11. Seams

| Other context | Direction | Pattern | What crosses |
|---|---|---|---|
| province | upstream | Customer–Supplier | Tiles, tile uses and states, ground multipliers, town size, homeless, classes and overflow, wares made, officials (master of works), charters |
| province | downstream | Customer–Supplier | Job slots, wares made by buildings, crew taken from homeless, Burned homes grievance, Smoke |
| realm | upstream | Customer–Supplier | Treasury gold, lords' wealth and traits, lord loyalty, defections |
| realm | downstream | Published Language | Upkeep sum on the Treasury card; building costs as gold lost |
| research | upstream | Conformist | Invention ids that unlock buildings and steps (F, C, L, G, W, B, S, T ids) |
| trade | downstream | Published Language | Market steps, caravanserai, warehouse, counting house, trading post, bank, harbour flags; building ids for trade weights; craft buildings as wares |
| trade | upstream | Customer–Supplier | Trade ratio floor for crafts appearing; inputs within reach or along a trader's route |
| religion | downstream | Open Host Service | House-of-worship slots per faith, minority house of worship, monasteries, pilgrimage shrines, conversion of a building, clergy as owners |
| religion | upstream | Customer–Supplier | Faith-pull and calm numbers, conversion cost, holy_places list, seizing church property |
| naval | downstream | Customer–Supplier | Harbour (port, berths, sailors), shipyard (slipways), naval base, lighthouse |
| naval | upstream | Conformist | start-ports.json (1444 harbours and shipyards with steps) |
| government | downstream | Customer–Supplier | Palace, seat, chancery, court of law, diet hall, hostage residence, examination hall, parliament house as cap sources and reform requirements |
| government | upstream | Conformist | Officials and lords numbers per building; government forms that unlock diet hall and hostage residence |
| warfare | upstream | Customer–Supplier | Raids, plunder, sacks, occupation, foraging, peace terms demolishing castles |
| warfare | downstream | Customer–Supplier | Castle steps (walls, garrison), town walls, arsenal, watchtower line, airfield, lighthouse |
| recruiting | downstream | Customer–Supplier | Castle and drill-yard training room; barracks |
| troop-movement | downstream | Published Language | Road, bridge, canal steps per province |
| national-strengths | downstream | Open Host Service | Unique variants (§9.2), landmarks as goals, building ids for building_cost_pct and building_unlock |
| events | upstream | Published Language | Five building effects, has_building, old-stat mapping, geography anchors, landmark founding events |
| rebellions | upstream | Customer–Supplier | Rebels loot a town building a season |
| revolutions | downstream | Published Language | has_building counts (factories, rail stations, presses) |
| diplomacy | upstream | Customer–Supplier | Treaties granting a trading post or kontor abroad, demanding castles demolished |
| subjects | upstream | Customer–Supplier | Treaties granting trading posts abroad |
| scenario-setup | upstream | Customer–Supplier | Map wealth, population, catalogue faith, lords, start inventions, regional templates |
| map-presentation | downstream | Published Language | Building sprites by zoom, Works and Jobs lenses, landmark icons |
| game-shell | downstream | Published Language | Works screen, build sheet, building card, turn-report lines |
| time-and-turns | upstream | Conformist | Month, season, year ticks; place of buildings in the turn order |
| world-map | upstream | Conformist | Climate (cold, monsoon), quake regions, rivers, coasts |

Changes the design asks of other files (§18), recorded here; not edited:
- province-stats 4.1/4.3: link here as the full list; 4 intro "gold, materials, labourers and months"; unpaid upkeep →
  neglect; 5.2 add wares stone, grapes, dates, guns, steel, cement (marble a kind of stone); 6.3 classes for the new
  buildings; 6.4 crews don't count toward homeless trouble; 9 and 2.1 dykes as ring works; 4.3 wells and drains as ring
  works and hospital known at start; 14 lenses Works and Jobs. **Not adopted** as of reading (province still lists
  hospital, wells and drains under "later inventions", miners as mines and saltworks only): D-BLD-10.
- recruiting 4.1: drill yard answers open question 2.
- warfare 8.5 (town walls cut plunder share), 2.4 (arsenal), 3.4 or 6.6 (barracks), 11.3 (lighthouses).
- country-stats 2: building upkeep and costs in the Gold row; Treasury card shows upkeep.
- research-tree: new buildings on existing ids; G4 and G14; quarries known at start; G3 and G10 take effect with a chancery.
- event-tree: the five effects of §12.1.

## 12. AI

- Builds by the same rules and costs (BLD-145).
- Each country checks one province a month in turn and picks at most one building by the first fitting rule (BLD-146):
  1 repair ruined or damaged if it can pay; 2 hungry province (Hungry or under 3 months of food): food building on an
  empty fitting tile or a granary at the nearest castle; 3 homeless over 5 %: the building whose class takes most of
  them; 4 raw ware unused: its craft building; 5 frontier province of a country expecting war: castle step or walls;
  6 faith or trade gaps: house of worship where its faith is low, market or caravanserai on a busy path; 7 personality
  (mercantile: markets and harbours; isolationist: schools; hegemon seeker: castles and drill yards).
- Keeps a year's upkeep in reserve and never starts a site it can't crew (BLD-147).
- A shrinking town drops the newest building first (BLD-011).
- Lords, clergy, towns and companies choose as in BLD-086..089.
- Cost on a phone: about 400 small checks a month in a 400-country world.

## 13. Decisions and open questions

- **D-BLD-1** (was OQ-BLD-1) Troyes is a town with 6 slots in 1444. The worked example is the more detailed text.
- **D-BLD-2** (was OQ-BLD-2) Material price: each good has a fixed base price in the rules data; it is 25 % dearer when no trade route touches the province. X-6 settles it.
- **D-BLD-3** (was OQ-BLD-3) Master of works: adds one more of each, halves the months and costs 25 % less gold (0.75). Province 10.2 and the config agree.
- **D-BLD-4** (was OQ-BLD-4) Steps: most buildings have 1 to 3 steps; castles and roads have 5 (earthwork, stone, bastion, star, concrete fortress; track, road, paved road, turnpike, railway). The tables are the detailed text.
- **D-BLD-5** (was OQ-BLD-5) Landmarks stand at their building's top step and are marked as landmarks (Alhambra palace 3, Sankore school 3, Kremlin castle 3, Ulugh Beg observatory 1; Taj Mahal its own type at step 1). No step above the top is needed.
- **D-BLD-6** (was OQ-BLD-6) Yearly fair: building a new one (market step 2) needs T6 and a market charter; fairs standing in 1444 stay; traders can be hired at the start without it. Trade v2 settles T6 (D-TRADE-3, D-RSCH-4).
- **D-BLD-7** (was OQ-BLD-7) Caravanserai and counting house take trade v2's roles: the caravanserai gives land traders +25 % weight and stops bandits; the counting house lets foreign traders deposit with bills of exchange; "room" is dropped. Trade is the later design.
- **D-BLD-8** (was OQ-BLD-8) Ports: `naval/data/ports-1444.json` (the rules' naval-ports-1444 data) is canonical for starting harbours. Trade and naval both use it.
- **D-BLD-9** (was OQ-BLD-9) Palace step 3 (royal city) needs G9, as the config says. Government's reform can require it too.
- **D-BLD-10** (was OQ-BLD-10) Province adopts buildings §18 (D-PROV-9, D-PROV-12): hospital at start, wells, drains and dykes as ring works, miners in quarries, Works and Jobs lenses. The later design.
- **D-BLD-11** (was OQ-BLD-11) A lord's province of yours counts as yours for material reach. Trade treats it the same way.
- **D-BLD-12** (was OQ-BLD-12) A palisade is town walls step 1, so plunder takes 1 in 6 at any town walls step; the example's 1 in 3 is dropped. One rule for all steps.
- **D-BLD-13** (was OQ-BLD-13) Roads: the track is known at the start and costs half a road; road and paved road need B2, turnpike B9 (cost 1.5 × paved road), railway C16. Provisional costs.
- **D-BLD-14** (was OQ-BLD-14) 1444 castles: a realm has the earthwork with B4 and the stone castle with B1, as its research start set gives (D-RSCH-11). The start set decides.
- **D-BLD-15** (was OQ-BLD-15) Crafts appearing: needs trade ratio ≥ 30 % and then has a 1 in 10 chance a year. Trade's threshold plus one provisional number.
- **D-BLD-16** (was OQ-BLD-16) Unique variants are stored in the buildings data (`variants`, by country or culture); national strengths needs no lever. Buildings already holds the list.
- **D-BLD-17** (was OQ-BLD-17) Numbers: town fire 1 % a year (+0.5 % per size above town); quakes 0.2 % a year in the data's quake regions; a raid of 2,000 men or more is big; the AI's busy path is 3 sites under way; the regional slot templates are those in the data; map wealth 2–9 gives one land building per point above 1. Provisional values.
- **D-BLD-18** (was OQ-BLD-18) One seat per province is one per town, since every province has one town. They are the same.
- **D-BLD-19** (was OQ-BLD-19) Restoring Angkor is an event choice owned by events. Events already offers choices.
- **D-BLD-20** (was OQ-BLD-20) Village works rate stays 20 % (provisional); faith-building numbers belong to religion. Balancing finds it in the data.
- **D-BLD-21** (was OQ-BLD-21) Burned tiles: they rebuild by themselves, free, one a year in peace; paying half a farm's cost rebuilds one within a season. The player picks; both rules stay.

## 14. Traceability

| Requirement | Feature file | Scenario |
|---|---|---|
| BLD-001, BLD-004 | building-card.feature | The building card shows every field and the next step |
| BLD-002 | building-card.feature | Empty job slots make nothing |
| BLD-003 | upgrades.feature | Steps a building can reach |
| BLD-005 | building-card.feature | A building gives no flat percentage to the country |
| BLD-006..008 | places-and-slots.feature | One building per place |
| BLD-009, BLD-012 | places-and-slots.feature | Town slots by town size |
| BLD-010, BLD-013 | places-and-slots.feature | Ring works and outside-town buildings take no slot |
| BLD-011 | places-and-slots.feature | A shrinking town neglects its extra buildings |
| BLD-014..017 | places-and-slots.feature | Building limits |
| BLD-018..020 | build-sheet-and-costs.feature | The build sheet in Troyes |
| BLD-021..023 | build-sheet-and-costs.feature | Ground multiplies gold and months but not materials |
| BLD-024 | build-sheet-and-costs.feature | Cancelling a build |
| BLD-025..032 | materials.feature | all scenarios |
| BLD-033..037 | labourers.feature | all scenarios |
| BLD-038..045 | sites.feature | all scenarios |
| BLD-046 | ownership.feature | Ways to gain a building |
| BLD-047..051 | upgrades.feature | all scenarios |
| BLD-052..055 | upkeep-and-condition.feature | Upkeep scenarios |
| BLD-056..063 | upkeep-and-condition.feature | Condition scenarios |
| BLD-064..074 | damage-and-loss.feature | all scenarios |
| BLD-075..078 | converting.feature | all scenarios |
| BLD-079..089 | ownership.feature | all scenarios |
| BLD-090, BLD-091 | people-build.feature | all scenarios |
| BLD-092..123 | building-catalogue.feature | all scenarios |
| BLD-124..130 | landmarks-and-variants.feature | all scenarios |
| BLD-131 | upgrades.feature | Only unlocked buildings are offered |
| BLD-132..138 | works-screen-and-map.feature | all scenarios |
| BLD-139..144 | event-effects.feature | all scenarios |
| BLD-145..147 | ai-building.feature | all scenarios |
| BLD-148..154 | starting-buildings.feature | all scenarios |
| Troyes 1444–1452 | troyes-1444-1452.feature | worked example (many ids) |
| BLD-155 | troyes-1444-1452.feature | Troyes in 1444 |
| BLD-156 | sites.feature | A master of works |
| BLD-157 | upgrades.feature | Road steps |
| BLD-158 | building-catalogue.feature | The yearly fair needs T6 |
| BLD-159 | building-catalogue.feature | Trade buildings take trade's roles |
| BLD-160 | damage-and-loss.feature | Burned tiles rebuild |
| BLD-161 | damage-and-loss.feature | Town fires |
| BLD-161 | damage-and-loss.feature | Big raids |
| BLD-155 | troyes-1444-1452.feature | 1444, the burned field |
| BLD-162 | build-queue.feature | A build waits for a busy site |
| BLD-163 | build-queue.feature | At most ten builds wait in a province |
| BLD-163 | build-queue.feature | A build that could never start is refused |
| BLD-164 | build-queue.feature | The next build starts when a site is done |
| BLD-164 | build-queue.feature | A build that can no longer be built leaves the queue |
| BLD-165 | build-queue.feature | Cancelling and reordering queued builds |
