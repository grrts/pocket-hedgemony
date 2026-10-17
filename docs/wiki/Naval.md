# Naval

Naval is how your realm gets ships to sea and keeps them there. Ships need ports, and ports need sailors: you muster sailors from a port's people, buy ships only where their crew already waits, put an official in command as admiral, and then keep the fleet paid, supplied and repaired while it sails with the winds. The size of your fleet is always tied to the seafaring people you can put aboard.

## How it works

### Ports

A **port** is a province with a harbour on a shore tile. Only a port can muster sailors, buy ships (other than small craft) and give berths. A coastal province without a harbour is a **plain shore**: seafolk fish from the beach, small craft can be launched and armies can land, but no ship can be bought, berthed or crewed there. Any realm can make a new port by building a harbour on a shore tile it holds.

| Harbour step | Berths | What it allows |
|---|---|---|
| 1 Harbour | 10 | mustering, buying, resupply |
| 2 Port | 25 | also refit and hiring foreign crews |
| 3 Great port | 50 | also coaling for steamships and later ships |

| Shipyard step | Slipways | Builds |
|---|---|---|
| 1 Slipway yard | 1 | galleys, and faster, every hull that needs no slipway |
| 2 Shipyard | 2 | also carracks, armed carracks, galleons, turtle ships and fluyts |
| 3 Naval dockyard | 2 | also ships of the line, then ironclads and later hulls |
| 4 Venetian Arsenal | 3 | builds as a naval dockyard from the start |

Each ship takes one **berth**; a ship of the line or larger takes two. Galleys, cogs and small craft can be **drawn up** on the beach in a port, taking no berth but rotting at the anchorage rate. Ships beyond a port's berths ride at the **anchorage**, where they can resupply but not refit, and rot and face storms as if at sea. A **lighthouse** halves storm losses in its sea zone. Ships crewed in port at a **naval base** cost upkeep and food but no wages.

A harbour burned in a raid or sacked with the town falls a step, and one whose slots are under half filled goes fallow with half its berths. A shipyard that is burned, has no timber in reach or has its slots under half filled stops its slipways.

**Ports in 1444.** 317 historical port towns (32 great ports, 110 ports, 162 small harbours and 13 canoe landings, 53 with a shipyard) are placed into the province under them, or the nearest coastal province within about 80 km. Each province takes the highest tier among its towns and a shipyard if any town had one. At the start a great port gets harbour 2; a port gets harbour 2, or harbour 1 where the town is smaller than the market town harbour 2 needs; a small harbour gets harbour 1; and a **canoe landing** (the trading towns of the Americas, Atlantic Africa and Mozambique) gets no harbour, extra seafolk and small craft only. A shipyard starts at step 1, or step 2 where its holder knows S4 Carrack and caravel, and Venice has the Arsenal. Melos and Malé fall on no land of the current map and wait until the map gains small islands.

### Sailors

Sailors are people, counted one by one. Mustering turns people of a port province into sailors; each leaves their class and their home slot stays empty until released. Every sailor counts the same toward a crew.

**Mustering.** *Muster sailors* is offered on a port, or on the country card for several ports at once, with one slider, only for provinces with a harbour. Of a province's fighting-age men (a quarter of its people), a muster can call 2 in 3 of the seafolk, 1 in 3 of the homeless and 1 in 20 of every other class, seafolk first. Sailors come from the same people as the levy, so a man at sea can't be levied and the levy pool shows the sailors already gone. A muster pays a gold bounty for signing on, lowers the province's fish for the seafolk away, and has the sailors ready in that port after a muster time.

**Waiting in port.** Each sailor in port eats 1 ration a month from the province store and is paid 0.1 gold. After 6 months with no ship being built for them, 1 in 10 drift back to their slots each month.

**The Lagos muster.** Lagos has 4,600 seafolk and 1,150 fighting-age men, of whom about 770 can go to sea. Portugal musters 75 sailors: it pays 4 gold of bounty, Lagos loses 5 % of its fish while they serve, and the 75 are sailors in port at Lagos when the muster is ready. Each month they eat 75 rations from the Lagos store and cost 7.5 gold in wages.

**Other sources:**

- **Foreign crews**: at harbour 2 or better you can hire sailors from a seafaring people whose ships call there. They arrive as sailors in that port, cost twice the wage and leave when unpaid.
- **Lords**: a loyal lord with a port musters his own sailors by the same rules and brings his ships when called; his ships and crews stay his.
- **Prisoners**: a captured ship's sailors can be taken into service; 1 in 4 desert at the first port friendly to them.
- **Pressing**: with S9 Line-of-battle tactics you can take seafolk men in a port without the bounty, giving the province the *Pressed* grievance for a year.

Sailors move by road to another of your ports at levy marching pace, eating on the way, or aboard any ship with room as passengers. When a crew is paid off (a ship laid up or a fleet disbanded) its sailors walk home and refill the emptiest slots of their own province, and come back homeless where others have filled those slots.

**What going to sea gives and takes:**

- A province whose men have served 2 years or more at sea gets +10 % fish and +10 % traders by sea for 10 years.
- A fifth of the wages of sailors in port is spent in that port as trade for its market folk.
- While sailors are away their fishery, harbour or shipyard slots stay empty; a fishery under half filled is fallow with no fish. A muster that takes the seafolk a shipyard needs stops its slipways.
- A province that loses more than a tenth of its seafolk at sea within 5 years has fewer births for 10 years and the *Lost at sea* grievance for 2 years.

### Buying ships

To order a ship you need, in the **same port**, enough sailors in port for its crew, a free slipway of the step the hull needs (or only the harbour for small hulls), and the gold and timber, paid when you order. The crew is assigned to the hull at once and helps build it alongside the shipyard's own seafolk. No crew in port, no ship. You can only buy types your realm has unlocked in the S bough (and the exploration unlock for exploration ships).

At Lagos, with 60 sailors in port, a free slipway at shipyard step 2 and S4 known, Portugal orders a carrack: it pays 60 gold and 12 timber at once, the 60 sailors are assigned to the hull, and Lagos has 0 sailors in port. With only 20 sailors the order is refused, because a carrack needs a crew of 60.

Every type belongs to one **family**, which sets its supply: trade and military ships carry 15 zones, galleys 6, and exploration ships 60 plus a hold of colony stores.

| Ship | Family | Unlocked by | Built at | Crew | Gold | Timber | Months | Upkeep a month | Hold | Purse |
|---|---|---|---|---|---|---|---|---|---|---|
| Fishing boat, canoe or raft | Small craft | known | any shore | 6 | 2 | 0 | 1 | 0 | | |
| War canoe fleet | Military | S3 | any shore | 100 | 10 | 2 | 2 | 0.5 | | |
| Voyaging canoe (100 rations of stores) | Exploration | S3 | any shore with seafolk | 20 | 5 | 1 | 1 | 0.5 | | |
| Cog, junk or dhow | Trade | known | harbour or slipway | 30 | 25 | 6 | 3 | 1 | ×2 | 30 |
| Caravel | Exploration | S4 + exploration unlock | harbour or slipway | 25 | 25 | 4 | 3 | 1 | | |
| Galley | Military | known | shipyard 1 | 180 (150 row) | 40 | 6 | 4 | 2 | ×2 | 25 |
| Carrack | Trade | S4 | shipyard 2 | 60 | 60 | 12 | 6 | 3 | ×3 | 50 |
| Armed carrack | Military | S6 | shipyard 2 | 120 | 120 | 14 | 7 | 5 | | |
| Galleon | Military | S7 | shipyard 2 | 200 | 200 | 20 | 9 | 8 | ×3 | 60 |
| Fluyt | Trade | S7 | shipyard 2 | 20 | 40 | 10 | 4 | 1.5 | ×4 | 70 |
| Turtle ship | Military | S8 | shipyard 2 | 120 | 150 | 12 | 8 | 6 | | |
| Ship of the line | Military | S9 | shipyard 3 | 600 | 600 | 60 | 18 | 25 | | |
| Steamer | Trade | S13 | shipyard 3 | 40 | 200 | 20 + 40 iron | 8 | 3 + coal | ×6 | 150 |
| Ironclads, dreadnoughts, submarines, carriers | Military | S14 to S18 | shipyard 3 | not given | | steel and coal or oil | | | | |

Hold and purse are the [Trade](Trade) design's numbers.

- A port with no slipway can build cogs, junks, dhows and caravels on its harbour, one at a time, taking half as many months again. With slipways they take the table's months, as many at once as there are slipways.
- The cog type follows the sea: cog in Europe, junk in East and Southeast Asia, dhow in the Indian Ocean and Red Sea.
- Ships that shoot (the armed carrack and later) need their guns, cast or bought as for gun crews, and powder for each voyage.
- A blockaded port keeps mustering and building, but nothing leaves without a battle. An enemy who takes the port gets every hull on its slipways.
- **Buying abroad**: in a foreign great port with a shipyard, at peace with you and with its owner's agreement, you can order a hull on the seller's slipway at 1.5 times the gold, with your crew waiting there paid double.
- **Small craft** can be bought on any shore tile with seafolk, harbour or not. Each has 6 sailors, carries 10 men or a load of goods along coastal zones only, can land an army on any shore, and serves as the fishery's boats. They never fight a sea battle, and a zone with an enemy war fleet is closed to them. With S3 Outrigger voyaging, small craft can cross ocean zones and you can build war canoe fleets and voyaging canoes on any beach.
- Ships also come by capture with a prize crew, from a loyal lord for the time of his service, from hired privateers or corsairs (ship, crew and commander for a season), and from events (a treasure fleet, a gift from a sea power, a salvaged wreck).

### Fleets and ships

Ships at sea or ready to sail are grouped into **fleets** of one admiral and any number of ships. A fleet sails at the pace of its slowest ship and enters only zones every ship may enter. Each ship keeps its crew, hull, supply and age.

The **hull** goes sound, worn, leaking, wrecked. It drops a step for battle hits, every 6 months at sea, in storms, and from rot while laid up or in port. A worn ship sails as normal; a leaking ship sails at half speed and loses a step in each storm; a wrecked ship can only limp to the nearest port and sinks at the next storm. In a berth that allows refit, a worn hull is made sound in a month and a leaking one in 3 months, twice as fast with a shipyard.

A ship short of crew fights in proportion to its crew share and needs more days per zone (100 of 200 is half strength and twice the days). Below a quarter of its crew it can't leave port.

### Admirals

A fleet of warships or troop carriers can't leave port without an admiral, though such ships can still defend the port in its own zone. Trade ships sail with no admiral on the routes trade gives them.

An official is commissioned as admiral by the same act as an army commander in [Recruiting](Recruiting): he leaves the province he ran (left, another official moved in, a deputy named or the lord next door asked) and returns to a province of your choice when released. Years served in a port province count double. A large fleet can have up to two **vice-admirals**, officials or lords, each leading part of the line. An admiral takes the realm's current sea style.

| Skill | At sea |
|---|---|
| Might | +5 % hits per point for ships in his part of the line; +10 % per point for soldiers and crew he leads in boarding |
| Cunning | orders per bell, sight of enemy fleets one zone further, slipping away at night, −5 % days per zone per point |
| Logistics | −10 % storm losses per point; at 3 or more every tenth zone sailed uses no supply |

Skills rise and fall by the [Warfare](Warfare) rules with sea victories counting as victories, and +1 Logistics for every 3 years at sea without losing a ship to a storm.

| Official type | Might / Cunning / Logistics | Trait offered |
|---|---|---|
| Customs officer | 0 / 3 / 1 | Careful |
| Warden | 2 / 1 / 1 | Steady |
| Steward | 0 / 1 / 3 | Careful |
| Muster master | 1 / 1 / 2 | Beloved (crews desert half as often) |
| Tax collector | 0 / 2 / 1 | Greedy (keeps a tenth of prizes) |
| Judge | 1 / 2 / 0 | Cruel (captured crews hanged; enemy merchant crews surrender faster) |
| Master of works | 0 / 1 / 2 | none (his fleet's hulls refit twice as fast in any berth) |
| Chaplain, schoolmaster | 0 / 1 / 1 | none |
| Marshal | 2 / 2 / 1 | any |

**Rui Vaz of Lagos.** Rui Vaz is a customs officer who ran the port province of Lagos for 9 years. Commissioned as admiral, his 9 years in a port count as 18, so he starts with Might 0, Cunning 5 and Logistics 1, and is offered the trait Careful.

Others can lead a fleet too: the ruler or an heir (if lost at sea or captured, a succession crisis), a lord (his own ships, or the realm's if loyal; a proud lord won't sail under an official admiral), a hired privateer or corsair for a season (leaves when unpaid, may raid neutral shipping and drag you into a war), or in realms with no officials a chief or elder.

### Keeping ships

| State | Crew | Costs | Hull loses a step |
|---|---|---|---|
| At sea | full, paid 0.2 gold a month each | upkeep, supply used | every 6 months |
| In port, crewed | full, paid 0.1 gold and 1 ration a month each from the port's province | upkeep | every 3 years |
| Laid up | none | a tenth of upkeep | every 2 years |

Laying a ship up releases its crew. Fitting it out again needs its crew as sailors in that port and takes a month. A ship left laid up for 10 years is wrecked.

**Docking.** A fleet can dock in ports of your realm, your lords, your subjects and your allies (resupply paid in food), of countries you are not at war with and not rivals (resupply paid in gold), and not in ports of an enemy or a rival. Each zone of supply refilled costs per ship crew ÷ 10 rations of the province's food in a friendly port, or crew ÷ 100 gold to the port's owner in a neutral one. Resupply fills every ship in one day, only as far as the province's food goes. Hulls are refitted only in a berth at harbour 2 or better or at any shipyard, at the upkeep cost in friendly ports and 1.5 times that elsewhere.

**Supply at sea.** A ship uses 1 supply for every zone it sails, and while holding one zone (blockading, hunting, waiting) 1 supply every step-days. Only exploration ships enter uncharted zones, and their colony stores (caravel 300 rations, voyaging canoe 100) are kept apart from supply and loaded when docking. A ship out of supply loses 1 in 10 of its crew for each zone it sails and fights at no more than half strength until it docks.

### Sailing

Fleets are movers on the same map and clock as armies (see [Troop-Movement](Troop-Movement)); they may enter sea zones and port provinces through their harbour. Coastal zones are about 150 km across, ocean zones about 300 km.

| Ship | Days per coastal zone | Days per ocean zone |
|---|---|---|
| Galley | 1 | not allowed |
| Small craft and war canoes | 1 | 2 (S3 only) |
| Cog, junk, dhow | 2 | 3 |
| Caravel | 1.5 | 2 |
| Carrack, armed carrack, galleon, turtle ship | 2 | 2 |
| Ship of the line | 2 | 2 |
| Steamships and later | 1 | 1 |

- **Reach**: without S1 Magnetic compass and sea charts, ships keep to coastal zones; with S1 they can go up to 3 ocean zones from a coast; with S5 Ocean navigation, any ocean zone. Galleys never enter ocean zones. Junks and dhows count as ocean-going in their own monsoon seas from the start (T5 Monsoon sailing calendars).
- **Winds**: each sea has a wind calendar by month. Sailing with the wind halves days per zone; against it doubles them. Steamships ignore wind.
- **Storms** come in each zone's storm season, as warfare sets.
- **Ice**: Baltic and White Sea zones freeze in winter; no fleet may enter, and a fleet caught there is iced into the nearest port.
- **Carrying an army**: its food reserve counts as loads, each horse as the room of 4 men and each gun as 20. An army carried by small craft keeps to coastal zones and never passes an enemy war fleet.

### Against an enemy at sea

Sea battles follow warfare's bell rules on at most 3 sectors. On top of them:

- Each ship fights with the share of its crew aboard.
- When an admiral gives a **Close** order or a galley rams, its soldiers aboard fight the enemy ship's crew and soldiers by the land bell rules on a single sector, and the ship whose defenders break is taken.
- A ship taken, or one that strikes to a stronger fleet in a hunt, becomes the winner's if a **prize crew** of at least a quarter of its crew is put aboard from the fleet; otherwise it is burned. Its own crew become prisoners or prize crew.
- When a ship sinks, a third of its crew swim ashore or are picked up by the winner as prisoners, and the rest drown.
- An enemy fleet in a port's zone blockades the port. An army that takes a port province's castle takes every ship there that has not sailed and the hulls on its slipways.

**Pirates.** Each pirate coast in config (the wokou in the East China Sea, Barbary and Aegean corsairs, the Orang Laut in the Malacca strait, the Caribbean later) has a pirate fleet with no country, hunting trade ships in its home zones and one zone beyond. Each season in which trade ships passed and no warship hunted there, it gains a ship; ships taken or sunk are removed. Burning its base ends the fleet until trade brings it back. Where a pirate people is also a catalogue record (wokou, Orang Laut), the same fleet can belong to a lord or be hired.

### The computer players

Sea powers (Venice, Genoa, Portugal, the Hanse towns, Hormuz, Malacca, Ryukyu) keep a share of their seafolk at sea, buy trade ships first and warships when a rival's fleet grows. Land powers lay up their few ships in peace and fit them out when a war starts across water. Every AI keeps a customs officer in each great port it holds, so it has admirals to commission. AI fleets plan with the same zone graph and wind calendar. A peaceful AI fleet more than 10 zones from the player's realm and ports runs no fleet AI; its voyage is resolved as a day count. Fleets move once a day using a cached shortest path per ship class, research step and month, recomputed only when research or a port changes.

### Each day and each month

Each day of the day loop fleets take their step and use supply, and storms, ice, docking, resupply and battles happen on their day. Each month: pay wages and upkeep and feed sailors (unpaid crews desert and foreign crews leave); sailors waiting over 6 months drift home; hulls advance and finished ships launch; rot, the 10-year wreck and refits apply; a fifth of in-port wages is spent in the port; province effects update. Each season pirate fleets grow or stay. Each year ships age and admirals may gain Logistics.

## What you see

- **World zoom**: ports as anchor dots in the owner's colour (larger for great ports); fleets as one ship sprite with a count.
- **Region zoom**: berths used and free, slipways with hulls building, fleets with the admiral's banner and course line in days.
- **The port card** (province zoom): sailors in port, berths, slipways, ships by state, and the *Muster sailors* and *Buy ship* commands.
- **The Sea lens**: ports shaded by sailors who can still be called, fleets at sea, the month's winds, and the zones a fleet can enter.
- **The muster preview**: who is taken by class, the bounty, fish lost and when they are ready.

## How it connects

- [Buildings](Buildings): harbour, shipyard, lighthouse and naval base; naval supplies their berths, slipways and the `start_ports` table.
- [Warfare](Warfare): ship strength and room, sea battle bell rules, blockade, carry, hunt, escort, storms, commander skills and prisoners.
- [Troop-Movement](Troop-Movement): the mover model, day loop, planner, boarding and landing.
- [Recruiting](Recruiting): the levy's people, commissioning officials and the empty province.
- [Provinces](Provinces): seafolk and classes, slots, fisheries, food stores, officials, plague; receives Pressed and Lost at sea.
- [Your-Realm](Your-Realm): the Ships stat, lords, ruler and heirs.
- [Research](Research): the S bough and T5 monsoon seas.
- [Trade](Trade): trade ships, hold and purse, ports as route ends, pirates and blockades.
- [Exploration-and-Colonies](Exploration-and-Colonies): exploration ships, the charted map and colonial governors carried aboard.
- [Diplomacy](Diplomacy): war, peace, rivals and allies set docking rights; consent to sell hulls; privateers.
- [Subjects](Subjects): subject ports are friendly docking.
- [World-Map](World-Map): about 4,700 sea zones, shore tiles and adjacency.
- [The-1444-Start](The-1444-Start): starting harbours and shipyards, canoe landings.
- [Map-and-Lenses](Map-and-Lenses): ports, fleets and the Sea lens.
- [Time-and-Turns](Time-and-Turns): the day loop and monthly steps.
- [Historical-Events](Historical-Events): ships from events.
- [Government](Government): realms with no officials lead fleets by chiefs or elders.

## Numbers

All values are **placeholders** in one naval config file (keys proposed by the spec; the design names only the file).

| Key | Value |
|---|---|
| `naval.berths_by_harbour_step` | 10 / 25 / 50 |
| `naval.slipways_by_shipyard_step` | 1 / 2 / 2 (Arsenal 3) |
| `naval.berths_per_large_ship` | 2 |
| `naval.muster_share` | seafolk 2/3, homeless 1/3, others 1/20 |
| `naval.bounty_per_sailor`, `naval.muster_time` | not given (examples: 4 gold for 75; 2 weeks) |
| `naval.wage_in_port` / `wage_at_sea` | 0.1 / 0.2 gold a month |
| `naval.ration_in_port` | 1 |
| `naval.foreign_wage_multiplier` | 2 |
| `naval.drift_home_after_months` / rate | 6 / 1 in 10 a month |
| `naval.prize_crew_desertion` | 1 in 4 |
| `naval.pressed_grievance_years` | 1 |
| `naval.skilled_service_years` / bonus / duration | 2; +10 % fish and traders by sea; 10 years |
| `naval.wages_spent_ashore` | a fifth |
| `naval.widows_threshold` | over a tenth in 5 years; births 10 years; grievance 2 years |
| `naval.harbour_build_months_multiplier`, `naval.abroad_price_multiplier` | 1.5, 1.5 |
| `naval.supply_by_family` | trade 15, military 15, galleys 6, exploration 60 |
| `naval.colony_stores` | caravel 300, voyaging canoe 100 |
| `naval.refit_months` | 1 / 3, halved with a shipyard |
| `naval.rot` | at sea 6 months, in port 3 years, laid up 2 years |
| `naval.laid_up_wreck_years`, `laid_up_upkeep_share`, `fit_out_months` | 10, a tenth, 1 |
| `naval.min_crew_to_sail` | a quarter |
| `naval.resupply_food_per_zone` / `resupply_gold_per_zone` | crew ÷ 10 / crew ÷ 100 |
| `naval.refit_cost_foreign_multiplier` | 1.5 |
| `naval.out_of_supply_crew_loss` / `strength_cap` | 1 in 10 per zone / half |
| `naval.wind_multiplier` | 0.5 / 2 |
| `naval.ocean_reach_with_s1` | 3 |
| `naval.admiral.*` | Might +5 % / +10 %; Cunning −5 % days; Logistics −10 % storms, free tenth zone at 3+; +1 per 3 storm-free years; port years ×2; 2 vice-admirals |
| `naval.prize_crew_share`, `naval.sunk_survivors_share` | a quarter, a third |
| `naval.pirate_reach` | 1 zone |
| `naval.lighthouse_storm_factor` | a half |
| `naval.small_craft` | 6 sailors; 10 men or a load |
| `naval.room.horse` / `gun` | 4 / 20 men |
| `naval.ai.fleet_ai_radius_zones` | 10 |
| `naval.ships`, `naval.step_days`, `naval.admirals_by_official` | the tables above |

Ports data: `naval/data/ports-1444.tsv` (hand-edited) and the generated `ports-1444.json` and `start-ports.json`, made by `naval/tools/place_ports.py`.

## Still open

- **OQ-NAVY-1**: berths and slipways per step need balancing with trade's ship numbers.
- **OQ-NAVY-2**: the seafolk share (2 in 3) may make small coastal realms' fleets too big.
- **OQ-NAVY-3**: whether women can be admirals and sailors.
- **OQ-NAVY-4**: ships of the line need S9, but shipyard step 3 needs S10.
- **OQ-NAVY-5**: warfare has not taken in naval's ship rows, families, crews and admirals.
- **OQ-NAVY-6**: how battle hits turn into hull steps, and where repairs happen.
- **OQ-NAVY-7**: how the different storm rules combine, and what a lighthouse covers.
- **OQ-NAVY-8**: trade and naval disagree on which ships can trade and their upkeep.
- **OQ-NAVY-9**: Pressed and Lost at sea are not in the province grievance list.
- **OQ-NAVY-10**: canoe landings' extra seafolk have no amount.
- **OQ-NAVY-11**: recruiting has not adopted sailors in the levy pool or the admiral commission.
- **OQ-NAVY-12**: country stats lacks Sailors and Admirals rows.
- **OQ-NAVY-13**: diplomacy doesn't cover docking, selling hulls or privateers.
- **OQ-NAVY-14**: the bounty, muster time and fish-lost rules are given only by example.
- **OQ-NAVY-15**: the admiral's commission cost and pay are only in an example.
- **OQ-NAVY-16**: whether ocean ships need harbour 3.
- **OQ-NAVY-17**: what a naval base saves (wages in port or at sea).
- **OQ-NAVY-18**: whether under-crewing slows a ship proportionally or by a flat ×2.
- **OQ-NAVY-19**: small craft's family, supply and where they can be built.
- **OQ-NAVY-20**: what "their own monsoon seas" are for junks and dhows.
- **OQ-NAVY-21**: later ships have no numbers, and S18 carriers may be after 1939.
- **OQ-NAVY-22**: which foreign crews call where, and how many.
- **OQ-NAVY-23**: pirate season length, starting size, zones and base rule.
- **OQ-NAVY-24**: whether a colonial governor can be an admiral.
- **OQ-NAVY-25**: the share of seafolk sea-power AIs keep at sea.
- **OQ-NAVY-26**: subjects' asks ("your sea route", a colony's defence, an overseas trade empire).
- **OQ-NAVY-27**: some ports share a province and need the placer rerun when provinces split.
- **OQ-NAVY-28**: whose store pays for docking in a subject's or lord's port.
- **OQ-NAVY-29**: whether seafolk are taken first or by share.

## For developers

- Spec: `domain/naval/spec.md` in the game repository, requirement code **NAVY** (NAVY-001 to NAVY-117).
- Features: `domain/naval/features/`, including `ports.feature`, `sailors.feature` (the Lagos muster), `buying-ships.feature`, `admirals.feature` (Rui Vaz of Lagos), `sailing.feature` and `sea-combat.feature`.
- Code: there is no `packages/engine/src/domain/naval/` yet. The port placer is `naval/tools/place_ports.py` in the designs.
