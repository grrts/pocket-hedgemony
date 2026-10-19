# Trade

Trade in Pocket Hegemony is carried by units you own and steer: caravans, barges, wagon trains and rail freight on land, and trade ships at sea. You give each trader a route between cities; every province it walks through gets busier, it collects value into its purse in every province it enters, and it empties that purse into your treasury when it reaches a city of your own. You can watch the gold travel home.

## How it works

### The idea in one card

```
 CARAVAN OF TROYES                         France · pack caravan · 50 market folk
 Route   Troyes ▸ Geneva and back                       38 days · repeats
 Now     Langres, day 12 of 19 to Geneva
 Purse   ██████░░░░  6.1 / 10 gold                         deposits at Troyes
 Last    collected 0.6 in Langres · 0.5 at Geneva (after a 0.05 market fee) · toll 0.2 at the Jura pass
 Danger  low (no war on the road; bandits near Dijon: 1 in 20 a month)
 Upkeep  0.5 gold a month
```

1. **Found a trader** in one of your cities with a market.
2. **Set its route** by tapping where it starts and where it goes. The way between them is found for you, through the most populated land.
3. Every province the trader passes **gets busier**: its trade ratio rises, more with more traders, yours and everyone else's.
4. In **every province it enters**, it **collects** a share of that province's trade value, times its trade ratio, into its purse.
5. When it reaches **a city of your own country**, it **deposits** the purse into your treasury.

### Traders and trade ships

Each trader is one unit on the map with a kind, a home city, a crew, a route, a purse, a hold, a position and progress toward the next province. Without a route it goes to its home city.

**Gaining traders:**

- **Found** a land trader in one of your cities with a market, or in a trading post once you know T8. You pay its founding gold up front, and its crew leaves the home province's job slots like a levy.
- **Ships**: buy a ship in a port with enough sailors (see [Naval](Naval)) and set it to Trade, or turn a cog, junk, dhow, carrack or galleon to trade. Caravels cannot trade.
- Capture in war (an army taking a caravan may keep it), a lord's gift, or an event.

**Losing traders:** dismissing one removes it and its crew overflow into the emptiest slots of its home. If a trader's or trade ship's upkeep is unpaid for 6 months, it is lost and its crew leave. A trade ship pressed into war stops trading and keeps its purse until it next reaches one of your ports.

Upkeep is charged every month, even with an empty purse and no route. There is **no cap** on how many traders you run.

**Lords** run their own traders from their own cities with their own wealth. They deposit into the lord's wealth, and you can see them but not steer them.

### Kinds of land trader

| Kind | Era | Moves on | Step days (× army) | Hold | Purse | Crew | Found | Upkeep a month | Needs |
|---|---|---|---|---|---|---|---|---|---|
| Pack caravan | I | Land | ×0.75 | ×1 | 10 | 50 market folk | 15 | 0.5 | A market (yearly fair) |
| Camel caravan | I | Land; desert and drylands at half step days | ×0.75, desert ×0.5 | ×1.5 | 15 | 50 market folk | 20 | 0.6 | T1, or a desert or drylands home (at start in the Middle East, Central Asia and the Sahel) |
| River barge | I | Along its navigable river only | ×0.4 | ×1.5 | 15 | 50 market folk | 15 | 0.4 | A river shore tile at home |
| Wagon train | IV | Land with at least a road | ×0.6 | ×2 | 25 | 80 market folk | 30 | 0.8 | B9 *Turnpike roads* and a paved road or better at home |
| Rail freight | V | Along the railway | rail days | ×6 | 80 | 120 craftsmen | 80 | 2 | A rail station at both ends of each leg |

Land traders move by the same step-day rules as armies on [Troop Movement](Troop-Movement) (ground, road, river, season, passes), times their kind's factor, with no guns, no column penalty and no march orders.

### Trade ships

[Naval](Naval) owns which ships exist, what they cost and their crews; trade gives each trading type its hold, purse and upkeep:

| Ship type | Hold | Purse | Upkeep while trading a month | Notes |
|---|---|---|---|---|
| Cog, junk, dhow | ×2 | 30 | 1 | The trade ship everywhere at the start |
| Merchant galley | ×2 | 25 | 2 | Enclosed seas only |
| Caravel | ×1 | 20 | 1 | Small and fast; more explorer than trader |
| Carrack | ×3 | 50 | 1.5 | Ocean-going |
| Galleon | ×3 | 60 | 2 | Can defend itself |
| Fluyt, merchantman | ×4 | 70 | 1.5 | Cheap crew, can't fight (if naval adds it) |
| Steamer (S13) | ×6 | 150 | 3 | Ignores wind; needs a port with coal on the route |

Ships move by the sea-zone step days, enter **port provinces only**, and collect only on entering a port, never in sea zones. A Venetian galley sailing through the Adriatic to Corfu collects nothing at sea and collects on entering Corfu.

### Trade value

Every province has three numbers: **trade value**, **trade ratio** and **traders passing** (sea zones keep the last two).

```
trade value (gold a month) = goods value × (1 + building weights) / 12
goods value                = wares made in the province this year (loads) × price per load
```

Only wares actually made count: burned and fallow tiles make nothing, and of food only the surplus counts.

| Price tier | Gold a load | Wares |
|---|---|---|
| Staples | 1 | Grain, rice, fish, salt, timber, hides, clay goods |
| Raw | 2 | Wool, flax, cotton, iron, copper, tin, horses, saltpetre, dyes |
| Finished | 5 | Cloth, linen, leather, tools, arms, pottery, beer and wine, paper, powder |
| Luxuries | 10 | Silk, silk cloth, spices, pepper, sugar, tea, coffee, cocoa, tobacco, incense, ivory, porcelain, furs, gems, books |
| Precious | 12 | Silver, gold (silver falls after the event tree's silver flood) |

| Building | Weight | Served visits a month |
|---|---|---|
| No market | | 2 |
| Weekly market | +25 % | 4 |
| Yearly fair | +50 % | 8 |
| Trading house | +100 % | 16 |
| Caravanserai | +25 % for land traders (and stops bandits) | |
| Warehouse | +25 % | |
| Harbour | +25 % for ships (needed to dock) | |
| Counting house | +10 % (foreign deposits) | |
| Bank | +25 % (foreign deposits) | |
| Each working craft building (loom house, forge, kiln, tannery, press, brewery) | +5 % | |

**Troyes**, making 30 cloth and 40 wool a year, with a yearly fair and 3 working loom houses: goods value 30 × 5 + 40 × 2 = 230 gold a year; building weights 0.50 + 3 × 0.05 = 0.65; trade value 230 × 1.65 / 12 ≈ **31.6 gold a month**.

A province with no market (a village like Langres) still has a trade value, gets busier and pays traders who walk through it; it just can't be a route stop.

### Trade ratio: how busy a province is

When the month's day loop ends, every province's ratio (0 to 100 %) updates:

```
gain  = 3 × traders passing × (1 − ratio / 100)
decay = 10 % of the current ratio
new ratio = ratio + gain − decay   (kept between 0 and 100)
```

- **Every trader of every country** counts in traders passing, once in every province it stood in during the month, whether it stopped or walked through.
- A trade ship sailing through a sea zone counts as **half a trader** in every port province on that zone's coast (a sea lane).

Steady ratios: 1 trader a month gives about 23 %; 2 about 37 %; 5 about 60 %; 10 about 75 %; 20 about 86 %. A road nobody uses loses half its ratio in about seven months.

**Ratio gain modifiers:**

| Condition | Gain |
|---|---|
| A customs officer in the province | +15 % |
| Road one step better than every neighbour's | +10 % |
| 10 years of peace | +10 % |
| Riots | −50 % |
| Homeless over 5 % | −5 % for every 5 % homeless |
| Enemy army or siege in the province | no gain that month |
| Plague quarantine | ratio 0, and no trader enters |
| Blockaded port | no ship enters, no sea-lane gain |

The modifiers add together (riots count as −50 %), and the total never drops below no gain.

### Collecting

When a trader **enters** a province, it collects that day:

```
collected = trade value × trade ratio × hold × visit share (0.2) × crowding
```

- It doesn't collect in the province it sets out from, or while it waits somewhere, until it enters another.
- A full purse collects nothing more until it deposits.
- **Market fee**: collecting in another country's province pays that country 10 % of the collection, except with a trade pact. A French caravan collecting 0.55 gold abroad pays a 0.055 fee.
- **Crowding**: each province serves a number of visits a month at full value (2 with no market, 4 weekly market, 8 fair, 16 trading house). After that, each further visit's collection is multiplied by served ÷ visits so far. Geneva, with a fair, serves 8; the twelfth trader that month collects 8/12 of the full amount.

### Routes

- A **stop** must be a **city**: a settlement of city or great-city size, or one with a market or trading post. Troyes with its weekly market can be a stop; Langres, a village with no market, can't; Elmina, a hamlet with a trading post, can.
- A route is **a start and an end**, two different cities. You never draw the way or add stops between them. It runs **there and back** (the default) or **once** (wait at the end for orders).
- The way comes from the shared route planner: fewest days by the trader's step days and where it may enter, **drawn toward the most populated land** (a province's days count for less the more people live there, up to three times the average), avoiding forbidden provinces, and preferring lower tolls when two paths are close (a toll counts as 2 days). Busy land is where the trade is, so a caravan goes through the towns, not around them.
- Every province walked through gets the ratio gain and a collection. A route from Lübeck to Bruges busies the whole coast road in between.

**Route preview**, before you confirm:

```
 Troyes ▸ Geneva and back                           38 days
 Collects in  14 provinces there and back · best: Geneva, Dijon, Troyes
 Expect       about 2.4 gold a month after fees and tolls
 Tolls        Jura pass (Burgundy, low): 0.2 a pass
 Danger       low · bandits near Dijon
 Crowding     Geneva: 6 of 8 visits taken this month
```

**Expect** is the planned collections over one trip there and back at this month's ratios, minus fees and tolls, divided by the trip's months. Provinces you cannot see count as nothing. Red marks show embargoes, quarantines, enemy armies and passes shut by snow.

**When a route breaks** (war, a closed border, quarantine, a snowed pass, a blockade), the route is checked again. A closed way is replaced by a dashed detour if one exists, otherwise the end is skipped. A closed end (war with its owner, an embargo, a quarantine) is skipped, shows red, and the turn report says so once. If both ends are closed, the trader goes to the nearest of your cities, deposits and waits for orders.

### Deposits and trade income

- When a trader enters **any city of your own country**, stop or not, it deposits its **whole purse** into the treasury that day: "Caravan of Troyes brought 6.1 gold to Troyes."
- Depositing in a **lord's city** pays the whole purse to the treasury, with no fee to the lord.
- No deposits in a city of a subject (unless the subjects design says otherwise for a kind of subject), or in one of your cities an enemy occupies.
- With T3 *Bills of exchange*, your traders may deposit in a foreign city with a counting house or bank that you are at peace with, paying 10 % to its owner.

**Trade income** = your traders' deposits + market fees paid to you + tolls at your toll points. It replaces the old trade balance and merchants' earnings on [Your Realm](Your-Realm).

### Who may go where

- Land traders may enter your own, your lords' and your subjects' provinces, and those of countries at peace with you unless closed or embargoed. Trade ships the same, ports only.
- No trader enters a country at war with its owner, its occupied land, or a quarantined province.
- Land traders can cross unclaimed land but collect nothing there unless it has a trading post. They never enter sea zones.
- Trade ships enter only sea zones their country knows.
- Borders at peace need no passage.
- **Tolls**: passing a toll point (bridge, ford, pass, river mouth, strait), a trader pays the owner's rate (none, low or high) from its purse. Rates are set on [Provinces](Provinces).
- **Trade pact**: no market fees and no tolls between the two countries, both ways.
- **Embargo**: the embargoed country's traders can neither enter nor stop in the other's provinces or ports.
- **War** sends traders inside enemy land at once to the nearest own or neutral city, where they may be caught.
- The peace term **Open the roads** (10 years) lets the winner's traders pass the loser's tolls free.
- A tributary's traders pay no tolls in its overlord's cities; a subject's traders deposit into the subject's own treasury.

### Risks

- **Enemy army**: a trader that meets an army at war with its owner loses its purse to the army's owner and is captured (the army's owner may keep it), unless it can step back the way it came that day. By default a trader that sees an enemy army ahead waits a day and goes round.
- **Raids**: an army on Raid takes the purse; the trader escapes half the time.
- **Bandits**: in a province with riots, rebels or homeless over 20 %, each land trader has a 1-in-20 chance a month of its purse being stolen; halved with T1, none where there is a caravanserai or a garrisoned castle.
- **Rebels** holding a province count as an enemy army.
- **Plague**: a trader passing through an outbreak carries it onward.
- **At sea**: a hunting fleet captures trade ships in its zone with their purses, and routes avoid zones where an enemy hunts when they can. Your warships escorting a zone protect your trade ships until the escort is beaten. A ship lost in a storm loses its purse; with T11 *Marine insurance* half is refunded. If naval adds pirates, they act as a hunting fleet with no country.

### What trade does elsewhere

- **Tax**: tax owed in a province rises 1 % for every 4 points of its trade ratio.
- **Crafts appearing**: craft buildings appear by themselves only where the trade ratio is 30 % or more.
- **Inputs**: a building's input ware is supplied if it is made in the province, within reach (one ring, more with roads and rivers), or anywhere on a trader's route that passes through; otherwise the building works at half.
- **Research**: when your traders deposit or collect in another country's cities, that country counts as your trade partner for invention spread (see [Research](Research)).
- **Food is never carried** by traders; hungry cities are fed by castles (see [Your Realm](Your-Realm)).

### Inventions

| Invention | Trade effect |
|---|---|
| T1 Caravanserai networks | Camel caravans; bandit losses halved |
| T2 Double-entry bookkeeping | Collections +10 % |
| T3 Bills of exchange | Deposit abroad |
| T5 Monsoon sailing calendars | Trade ships' Indian Ocean storm losses halved |
| T6 Merchant fairs and exchanges | The yearly fair can be built; every market serves +2 visits a month |
| T8 Licensed trading companies | Overseas trading posts count as cities and can found traders |
| T9 Joint-stock finance | Trade ships cost 25 % less |
| T11 Marine insurance | Half a lost ship's purse refunded |
| T13 Commodity exchanges | Every known province's trade value and ratio visible |
| S2 Lateen and junk rigging | Trade ships' hold +0.5 |
| S13 Steamships | Steamer trade ships |
| B2, turnpikes, railways | Faster land traders |

T17 *Container shipping* is Era VIII and out of the game.

### Events

- `trade_power` of a country changes its traders' collections by the same share for the duration.
- `trade_access` of a province changes its ratio gain by that share (−0.2 means −20 %).
- `world_trade_index` changes every province's trade value by that share.
- `trade_index` reads a country's trade income over the last 12 months as an index against 100 gold a year.
- `trade_presence(who, hub, value)` reads a country's share of all collections in a hub's provinces over the last 12 months.
- `trade_route(from_hub, to_hub, open)` makes a sea passage's zones known to a country for routes, or marks the link closed.
- `trade_good` reads wares made. **Hubs** (Alexandria, Amsterdam, the Malacca Strait and 20 more) are named sets of provinces and sea zones used only by event triggers, never as route targets.

### The start and the warm-up

Each country starts with traders by its catalogue trade access: very high 6, high 4, moderate 2, low 1, very low or unknown 0. Coastal countries with ports get trade ships, inland ones caravans or barges, in the proportion the catalogue's trade routes suggest. Starting routes are seeded from a hand-made list (Venice, Genoa, Lübeck, Florence, Mali and Timbuktu, Kilwa, Calicut and Gujarat, Malacca, Ryukyu). Before the first turn, the starting traders run for **24 months** so busy roads start busy. See [The 1378 Start](The-1378-Start).

### The AI

- Scores possible routes from a trader's home to its own cities and enterable foreign cities within reach (about 12 provinces for caravans, 40 sea zones for ships) by expected gold a month after fees, tolls and crowding, minus upkeep, weighted down by danger.
- Founds a trader when the best unused route beats upkeep by a margin set by its personality (merchant republics found more); dismisses one whose route has lost money for a year.
- Reroutes once a year, and at once when a route breaks.
- At war, pulls traders off roads near the front and uses trade ships as transports if short of carriers.

### Each turn, each month, and keeping it fast

1. **During the day loop** (the 7 days of each weekly turn): traders move; on entering a province they count as passing, collect (with crowding), pay fees and tolls, meet risks, and deposit in your cities.
2. **After the day loop, in the turn a new month begins**: every touched province's and sea zone's ratio updates.
3. Trader upkeep is charged and unpaid months counted.
4. Every turn, the turn report gets one deposits line for the week and lines for problems.

Yearly: trade value is worked out again with the year's wares (and also on events or burned tiles); the AI reroutes and dismisses.

On a phone, each province and sea zone stores only its ratio and traders passing; each trader about 12 small numbers. Paths are cached per city pair and cleared only when something on them changes, and ratios on quiet roads decay lazily (×0.9 for each untouched month).

## What you see

- **The trader card** (above): kind, crew, route and its days there and back, position, purse bar, last collections, fees and tolls, danger and upkeep.
- **Found a trader**: Trade, Found a trader, choose a kind, from a city with a market. Ships are bought on the port screen and switched to Trade.
- **Setting a route**: tap where it starts, then where it goes (another tap moves where it goes), and tap the end again to finish; the preview updates with each tap; then Confirm. You can copy another trader's route.
- **The Trade screen**: every trader and trade ship with kind, route, purse, last deposit, expected gold a month and problems, sortable by gold a month.
- **Turn report**: deposits summed into one line ("Traders brought 23 gold this week"); only problems (robbed, route broken, ship taken) get their own line.
- **On the map**: at world zoom the Trade map mode coloured by trade ratio and the busiest roads and sea lanes; at region zoom thicker roads with more traders, trader icons (caravan, barge, ship) with a purse bar, and a coin on market cities; at local zoom caravans, barges and ships moving. Map modes: **Trade ratio**, **Trade value** and **Traders** (your traders and routes). See [Map and Map Modes](Map-and-Lenses).

### In the game now

Trade runs in the game as a first slice: traders you own walk there and back between two cities, and what they bring home is your **Trade** line in the treasury. The old flat trade sum from a province's wealth is gone.

- **Goods.** Each January every province counts what it makes: the wares of its works (timber and furs, stone, ore, salt, wool and hides), the food it does not eat (as grain), and crafts made by its craftsmen (finished goods, until the loom houses and forges make their own). Priced by tier, with a market's weight added, that is its **trade value** in gold a month. A harbour adds its weight for ships.
- **Trade stops.** A city, or any town with a market, is a stop for caravans and barges; a port with a harbour is a stop for ships.
- **Traders.** Pack caravans, camel caravans (from desert or drylands, or with Caravanserai networks), river barges (on rivers only) and the cog. Each walks its way there and back a month at a time: every province it stands in gets busier, it collects as it enters (10 % to the owner of a foreign province, nothing on unclaimed land) and it empties its purse in every city of yours it reaches. Its upkeep is paid each month; six months unpaid and it is given up.
- **Trade ratio.** Each month a province's ratio rises with the traders passing (a customs officer helps, riots hurt, an enemy or a siege stops it) and loses a tenth. Every 4 points of ratio raise the tax the province owes by 1 %.
- **Your Trade line** is last month's deposits plus market fees paid to you, less your traders' upkeep.
- **At the start** every realm gets its traders by its trade access (Venice six, France four), on hand-made routes where their cities are on the map and otherwise on the best route from each of its best cities, and two years of their walking set the starting ratios.
- **The AI** looks at each trader once a year and finds it a better route when its own pays little or is broken, and founds one more a year where a route pays well, up to twice its starting traders.

Where you find it:

- **The Trade tab** of your realm card, next to Treasury, is the overview of all your trade. **This month**: gold banked so far, gold on the road in your traders' purses, market fees taken, and last month's Trade line after upkeep. **Where the gold comes from**: the provinces your traders collected in, each with its gold a month and a bar, those abroad marked, with the share from abroad and the fees you paid. **Traders**: one row each with its route, purse bar and gold a month after upkeep, a red ! when something is wrong and a gold ★ when it has a better route; a row opens the trader's card. When some could earn more, **Use all better routes** moves each to its best route at once. Then two folds: **Found a trader** and **Busiest cities**.
- **A trader's card**: tap one of your caravans, barges or cogs on the map (close in), or its row in the Trade tab. **Now** says what it is doing ("Walking to Lyon, 3 days") with its purse; **Route** gives From → To, days there and back and about how much it brings a month after upkeep; **Better routes** lists up to three routes from its start or its home that bring at least a fifth more, each with **Use**; **Where its gold comes from** shows the provinces of its last trip there and back; **Last month** what it banked and where. While the card is open its whole way is drawn on the map under any map mode, the way ahead as a trail, the trader in gold brackets and a coin where its gold came from. **Find** centres the map on it.
- **Changing a route**: **Change destination** keeps where it starts; the bar along the bottom of the map offers the three best cities as buttons, and every likely city on the map shows its gold a month over it (the best three starred). Tap a city or a button, check the preview, then **Confirm**. **New route** starts from scratch: tap where it starts, then where it goes. You never draw the way: it is found through the most populated land and drawn on the map, with the preview (days there and back, provinces collected in, about how much a month, the best provinces). **Undo** and **Cancel** are there too.
- **Gold being banked**: from regional zoom in, whatever the map mode, when one of your traders banks its purse in a city a coin drops into the city and its gold rises over it ("+2.4"), a coin clinks and your treasury lifts; a trader collecting glints a little coin. Under the Trade map mode your busiest trade cities twinkle. All of it follows the Animations setting.
- **About how much a month** is worked out as the trader walks: it fills its purse province by province, can't carry more than its purse between your cities, and gets less where many traders already call. It lands close to what traders really bank.
- **The Trade map mode**: provinces coloured by trade ratio, what you don't see in parchment; zoomed in, your traders' ways there and back as dotted lines with each trader and its purse, and a coin on every trade stop.
- **The province card** has a Trade line: value a month, ratio, traders passing and its top goods.
- **The Overview** of your Realm book has an Economy tile with your gold and gold a month; the Trade page sits beside Treasury and Food in the Economy section.

Not yet: tolls, trade pacts and embargoes, bandits and capture on the road, lords' traders, ships other than the cog, copying a route and the "once" mode.

## How it connects

- [Troop Movement](Troop-Movement): the shared mover model, day loop, graph, route planner and step days; trade supplies where traders may enter and stop.
- [Buildings](Buildings): markets, caravanserais, warehouses, counting houses, banks, harbours, trading posts, craft buildings, rail stations and roads; trade gives back weights, served visits and the 30 % floor for crafts.
- [Provinces](Provinces): wares made, food surplus, toll points and rates, customs officers, riots, rebels, homeless, quarantine, plague; trade gives back the ratio (and its tax), traders passing and trade value.
- [Your Realm](Your-Realm): deposits, fees and tolls as trade income; founding gold and upkeep; traders replace merchants.
- [Naval](Naval): ship types, sailors, ports and the port list, sea step days, pirates.
- [Warfare](Warfare): war, armies, raids, sieges, hunting, escorts, blockades, storms, Open the roads, capture.
- [Diplomacy](Diplomacy): trade pacts, embargoes, war and peace.
- [Subjects](Subjects): tributary toll waivers, colony cities as deposit points (proposed).
- [Research](Research): T and S inventions; trade partners for spread.
- [Historical Events](Historical-Events): trade stats, hubs and the silver flood.
- [The 1378 Start](The-1378-Start): starting traders and routes; the warm-up.
- [National Strengths](National-Strengths): trader and toll levers; trade presence conditions.
- [Rebellions](Rebellions): rebels holding provinces act as enemy armies.
- [Map and Map Modes](Map-and-Lenses): Trade map modes, trader icons, road thickness.
- [Screens and Navigation](Screens-and-Navigation): Trade screen, trader card, route preview, turn report lines.
- [Time and Turns](Time-and-Turns): day loop, month end, year.

## Numbers

Every value the game uses, made from its config so it always matches the game: [Trade data](Data-Trade). How they combine: [Formulas](Formulas).

Every trade number is a placeholder, all in the trade config file.

| Value | Config key | Design value |
|---|---|---|
| Ratio gain per trader | `ratio.gain_per_trader` | 3 points |
| Monthly decay | `ratio.decay_share` | 10 % |
| Ratio cap | `ratio.max` | 100 |
| Ship in a sea lane counts as | `ratio.sea_lane_trader_weight` | 0.5 |
| Ratio modifiers | `ratio.modifiers.*` | as in the table above |
| Price tiers | `value.price_per_load.*` | 1, 2, 5, 10, 12 |
| Food counted | `value.traded_food` | surplus only |
| Building weights and served visits | `value.building_weights.*` | as above |
| Visits without a market | `value.serves_without_market` | 2 |
| Visit share | `collect.visit_share` | 0.2 |
| Market fee; with a pact | `collect.foreign_market_fee`, `collect.trade_pact_fee` | 10 %; 0 |
| Bills of exchange fee | `deposit.bills_of_exchange_fee` | 10 % |
| Lord's city to treasury | `deposit.lord_city.to_treasury` | 100 % (decided) |
| Stops: a start and an end | `route.min_stops`, `route.max_stops` | 2 / 2 |
| Default mode | `route.default_mode` | there and back |
| Pull of populous land on the planner; its cap | `route.busy_weight`, `route.busy_cap` | 1; 3 × the average |
| Toll counts as | `route.toll_counts_as_days` | 2 days |
| Bandits | `danger.bandit_chance_per_month`, `danger.bandit_when.homeless_share_over` | 5 %; homeless over 20 % |
| Escape a raid | `danger.raid_trader_escapes` | 50 % |
| T1 bandits; T11 refund | `danger.t1_bandit_chance_factor`, `danger.t11_lost_purse_refund` | ×0.5; 50 % |
| Land kinds; ship numbers; S2 | `land_traders.*`, `sea_traders.*`, `s2_hold_bonus` | tables above; +0.5 |
| Tax from ratio | `effects.tax_per_ratio_points` | +1 % per 4 points |
| Crafts floor | `effects.crafts_appear_min_ratio` | 30 % |
| Missing input | `effects.missing_input_output` | half |
| Unpaid upkeep before a trader is lost | `upkeep.unpaid_months_to_lose` | 6 months |
| Starting traders | `start.traders_by_trade_access` | 6, 4, 2, 1, 0, 0 |
| Warm-up | `start.warmup_months` | 24 |
| AI reach | `ai.caravan_reach_provinces`, `ai.ship_reach_sea_zones` | 12 / 40 |
| AI found margin | `ai.found_margin` | 1.25 (config only) |
| AI reroute and dismiss | `ai.reroute_every_months`, `ai.dismiss_after_losing_months` | 12 / 12 |
| Event mapping and hubs | `event_mapping.*`, `hubs.*` | 10 hubs, reference 100 gold a year |

## How the open points were settled

- **Founding**: you found a land trader in one of your cities with any market (a weekly market is enough), or in a trading post once you know T8. Its crew comes from the home province's job slots of its class; if there are too few people, founding is refused.
- **Yearly fairs**: you need T6 to build a new yearly fair. Fairs that stand at the start stay, so everyone can found traders from the start.
- **Ships**: the caravel explores and cannot trade. Cogs, junks, dhows, galleys, carracks, galleons, fluyts and steamers can, and a trade ship pays its normal naval upkeep. A trade ship whose upkeep goes unpaid for 6 months is lost, like a caravan.
- **Ratio modifiers add up**: customs officer +15 %, a road better than every neighbour's +10 %, 10 years of peace +10 %, riots −50 %, −5 % for each full 5 % of homeless over 5 %, event and heritage bonuses on top. The total never goes below no gain, and an enemy army or siege still stops gain that month.
- **Buildings and heritage that add "traders passing"** (Djenné +20 %, Taj Mahal +30 %, heritage bonuses) add that percentage to ratio gain. A pilgrimage shrine counts as one more trader passing each month.
- **Only an embargo shuts traders out**; there are no closed borders. A customs officer only adds ratio gain; without one you lose nothing.
- **What you can see**: the trade value and ratio of your own provinces and of every province your traders have entered. T13 shows all of them. The route preview counts provinces you cannot see as earning nothing.
- **Lords' traders** pay no fees or tolls in your realm and deposit in any of your cities, into the lord's wealth.
- **Sea zones** have no trade ratio. The world map shows the busiest sea lanes by the ships that sailed through last month.
- **Materials** for buildings cost 25 % more in a province no trade route touches (not a route stop, and no trader passed in the last 12 months).
- **Food surplus** in trade value is the food made this year minus what the people eat, never below zero.
- **Silver** falls from 12 to 6 gold a load after the silver flood.
- **Heritage**: some realms get a bonus on each deposit, on ratio gain, or extra traders at the start.
- **Events** read trade_index as your trade income over the last 12 months against 100 gold a year, and 10 named hubs (Alexandria, Amsterdam, the Malacca Strait, Venice, Genoa, Seville, Bruges and Antwerp, Tabriz, Aleppo and the Volga).
- Many of these numbers (ratio points, decay, visit share, the material markup, hubs, the trade index reference) are first guesses and will be tuned.

## Still open

Nothing in the rules. Balancing is a tuning pass on the numbers above.

## For developers

- Spec: [`domain/trade/spec.md`](https://github.com/grrts/pocket-hedgemony/blob/claude/domain-specs-bdd-ebdpmx/domain/trade/spec.md), requirement code **TRADE** (TRADE-001 to TRADE-128).
- Features: `domain/trade/features/` (traders, trader-kinds, trade-value, trade-ratio, collecting, routes, deposits, access-tolls-diplomacy, risks, trade-effects, trade-screens, trade-research, event-mapping, start-ai-performance).
- Code: rules code for this context goes in `packages/engine/src/domain/trade/`, balance numbers in `packages/rules/data/domain/trade.json`. The design's config shape is `trade/trade-config.example.yaml`.
