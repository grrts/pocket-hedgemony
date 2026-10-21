# Achievements data

Every value in the game's achievements config, exactly as the game reads it. This page is made from `packages/rules/data/domain/achievements.json` each time the config changes, so it always matches the game. How these values are used is explained on [Achievements](Achievements).

Keys are written as in the config file. Shares are fractions (0.25 is 25 %), and values marked (provisional) are placeholders that may still change in balancing. Inventions are shown by id and name; see [Research data](Data-Research#inventions).

> Achievements (domain/achievements/spec.md). tiers and achievements copied from achievements/achievements.yaml, with the harvest ladder (D-ACH-16) and the 1378 start's rows (D-ACH-17) (config v1; the YAML key 'on' renamed 'moment', D-ACH-6; every test number is a placeholder). limits, moments, progress, stores, icons and toast from achievements-design.md sections 2, 5, 6, 7, 8 and 9. narrative\_only\_events: event ids marked depiction narrative\_only in event-tree/data/events (read for ACH-005).

| Key | Value |
|---|---|
| `moments` | turn\_end, year\_end, harvest, spring\_start, date, battle\_end, sea\_battle\_end, siege\_end, war\_end, rebellion\_end, relation\_changed, province\_gained, invention\_done, regiment\_trained, lord\_created, charter\_granted, loan\_closed, style\_adopted, colony\_founded, contact\_made, fleet\_home, food\_policy\_changed, event\_choice, event\_end, succession\_plus\_12\_months, campaign\_end, castle\_gained |
| `eligibility_flags` | ironman\_unbroken, cheat\_marked, switched\_country |
| `cheats` | debug, editor, free play |
| `harvest_ladder` | failed, poor, normal, good, bumper |
| `era_ladder` | I, II, III, IV, V, VI, VII, VIII |
| `narrative_only_events` | algerian\_civil\_war, algerian\_war, angolan\_war\_of\_independence, apartheid\_established, armenian\_genocide, atomic\_bombings, banda\_conquest, bangladesh\_liberation\_war, baptist\_war, bengal\_famine\_1943, brazilian\_abolition, brazilian\_end\_of\_slave\_trade, british\_emancipation, chilean\_coup\_1973, dzungar\_genocide, end\_of\_cuban\_slave\_trade, fall\_of\_saigon, first\_cholera\_pandemic, founding\_of\_israel\_and\_nakba, guatemalan\_genocide, haitian\_revolution, herero\_and\_nama\_genocide, holocaust, huaynaputina\_eruption, indian\_independence\_and\_partition, indian\_removal\_act, laki\_eruption, mau\_mau\_uprising, mendana\_voyages, palmares\_quilombo, rwandan\_genocide, september\_11\_attacks, sugar\_revolution\_barbados, tambora\_eruption, tupac\_amaru\_rebellion, wounded\_knee |

## Limits

| Key | Value |
|---|---|
| `max_achievements` | 100 |
| `max_points_each` | 40 |
| `points_multiple` | 5 |
| `max_points_total` | 1000 |
| `reserve_slots_min` | 10 |
| `reserve_points_min` | 100 |
| `name_max` | 24 |
| `text_max` | 100 |
| `launch_count` | 80 |
| `launch_points` | 810 |

## Progress

| Key | Value |
|---|---|
| `google_steps_above` | 10000 |
| `steam_popups_pct` | 25, 50, 75 |

### Google step size

| Key | Value |
|---|---|
| `people` | 10000 |
| `gold` | 10 |

## Tiers

| Key | Value |
|---|---|
| `copper` | 5 |
| `silver` | 10 |
| `gold` | 20 |
| `crown` | 40 |

## Achievements

| id | name | text | category | tier | scope | moment | test | refs | more |
|---|---|---|---|---|---|---|---|---|---|
| first\_harvest | First Harvest | Bring in your first autumn harvest. | first\_steps | copper | campaign | harvest | harvests\_seen: 1 | country-stats 3.1 | ladder: harvests |
| food\_policy\_set | Set the Table | Pick a Food policy preset or set your own. | first\_steps | copper | campaign | food\_policy\_changed | food\_policy\_changed: yes | country-stats 3.3 |  |
| first\_regiment | Mustered | Call the levy and train your first regiment. | first\_steps | copper | campaign | regiment\_trained | regiments\_trained: 1 | recruiting 1, recruiting 4 |  |
| first\_invention | Ink and Candle | Finish your first invention. | first\_steps | copper | campaign | invention\_done | inventions\_done: 1 | country-stats 7.3 |  |
| first\_castle | Stone upon Stone | Build or take a castle. | first\_steps | copper | campaign | castle\_gained | castles\_gained: 1 | warfare 8.1 |  |
| first\_alliance | A Letter Sealed | Make an alliance with another realm. | first\_steps | copper | campaign | relation\_changed | relation\_formed: alliance | relation-types Alliance |  |
| first\_peace | Ink on the Treaty | End a war with a peace you signed. | first\_steps | copper | campaign | war\_end | war\_ended\_by: peace\_treaty; player\_signed: yes | warfare 10.4 |  |
| first\_year | A Year in the Ledger | Play twelve months in one campaign. | first\_steps | copper | campaign | turn\_end | months\_played: 12 | none |  |
| full\_granaries | Full Granaries | Rule 10+ provinces for five years without one going hungry. | realm | silver | campaign | turn\_end | provinces\_min: 10; months\_no\_hungry\_province: 60 | country-stats 3.1, province-stats 6.2 | progress: (stat: months\_no\_hungry\_province; target: 60) |
| famine\_averted | Famine Relief | Let famine relief save a starving province from any famine deaths that year. | realm | copper | campaign | year\_end | famine\_rule\_released\_to\_province: yes; famine\_deaths\_in\_that\_province: 0 | country-stats 3.3, province-stats 6.2 |  |
| seven\_good\_harvests | Seven Fat Years | Have a good or bumper harvest in your capital seven years running. | realm | copper | campaign | harvest | capital\_harvest\_at\_least: good; years\_in\_a\_row: 7 | country-stats 3.1 | progress: (stat: capital\_good\_harvest\_streak; target: 7) |
| debt\_repaid | Clean Books | Pay back a loan of 1,000 gold or more in full. | realm | copper | campaign | loan\_closed | loan\_size\_min: 1000; closed\_by: repaid | country-stats 2 |  |
| treasury\_10000 | Counting House | Hold 10,000 gold in your treasury at once. | realm | silver | campaign | turn\_end | gold\_min: 10000 | country-stats 2 | progress: (stat: gold; target: 10000) |
| people\_10m | Many Hearths | Rule 10 million people. | realm | silver | campaign | turn\_end | people\_min: 10000000 | country-stats 4 | progress: (stat: people; target: 10000000) |
| trade\_hub\_held | Where Roads Meet | Own a province with a trade hub. | realm | copper | campaign | province\_gained | owns\_trade\_hub: 1 | province-stats 7, event-tree geography trade\_hubs |  |
| castle\_reach\_3 | Long Reach | Have one castle feed three rings of provinces. | realm | copper | campaign | turn\_end | any\_castle\_reach\_min: 3 | country-stats 3.2 |  |
| harvests\_10 | Ten Harvests | Bring in 10 province harvests, counted across all your campaigns. | realm | copper | lifetime | harvest | provinces\_harvested\_min: 10 | country-stats 3.1 | ladder: harvests; progress: (stat: provinces\_harvested; target: 10) |
| harvests\_100 | A Hundred Harvests | Bring in 100 province harvests, counted across all your campaigns. | realm | silver | lifetime | harvest | provinces\_harvested\_min: 100 | country-stats 3.1 | ladder: harvests; progress: (stat: provinces\_harvested; target: 100) |
| harvests\_1000 | A Thousand Harvests | Bring in 1,000 province harvests, counted across all your campaigns. | realm | gold | lifetime | harvest | provinces\_harvested\_min: 1000 | country-stats 3.1 | ladder: harvests; progress: (stat: provinces\_harvested; target: 1000) |
| harvests\_10000 | Ten Thousand Harvests | Bring in 10,000 province harvests, counted across all your campaigns. | realm | crown | lifetime | harvest | provinces\_harvested\_min: 10000 | country-stats 3.1 | ladder: harvests; progress: (stat: provinces\_harvested; target: 10000) |
| lord\_raised | Raised Up | Make a new lord. | lords | copper | campaign | lord\_created | lords\_created: 1 | country-stats 5.3 |  |
| all\_lords\_loyal | Not One Waverer | Have 10 or more named lords, every one of them loyal. | lords | silver | campaign | turn\_end | lords\_min: 10; lords\_wavering: 0; lords\_disloyal: 0 | country-stats 5.5 |  |
| officials\_30 | A Clerk in Every Town | Run 30 royal provinces through your officials. | lords | copper | campaign | turn\_end | royal\_provinces\_with\_official\_min: 30 | province-stats 10.2 | progress: (stat: royal\_provinces\_with\_official; target: 30) |
| charters\_5 | Chartered Towns | Grant charters to five provinces. | lords | copper | campaign | charter\_granted | charters\_in\_force\_min: 5 | province-stats 10.4 | progress: (stat: charters\_in\_force; target: 5) |
| long\_reign | Long Live the Ruler | Keep one ruler on the throne for 40 years. | lords | copper | campaign | year\_end | ruler\_years\_min: 40 | country-stats 8 |  |
| peaceful\_succession | The Crown Passes | See an heir take the throne with no revolt in the year after. | lords | copper | campaign | succession\_plus\_12\_months | new\_rebellions\_since\_succession: 0 | country-stats 8, rebellions 2.2 |  |
| schools\_5 | Halls of Learning | Run five schools at once. | learning | copper | campaign | turn\_end | schools\_min: 5 | country-stats 7.1 |  |
| scholars\_100 | A Hundred Pens | Have 100 scholars at work. | learning | copper | campaign | turn\_end | scholars\_min: 100 | country-stats 7.1 | progress: (stat: scholars; target: 100) |
| quiet\_years | Quiet Years | Finish 10 inventions in a row without going to war. | learning | silver | campaign | invention\_done | inventions\_since\_last\_war\_min: 10 | country-stats 7.2 | progress: (stat: inventions\_since\_last\_war; target: 10) |
| first\_in\_world | First in the World | Be the first realm anywhere to finish an invention of Era III or later. | learning | silver | campaign | invention\_done | invention\_era\_min: III; first\_in\_world: yes | research-tree Rules |  |
| era\_iv\_invention | Age of Reason's Tools | Finish an invention of Era IV. | learning | copper | campaign | invention\_done | invention\_era\_min: IV | research-tree Rules |  |
| era\_vi\_invention | Steam and Wire | Finish an invention of Era VI. | learning | silver | campaign | invention\_done | invention\_era\_min: VI | research-tree Rules |  |
| whole\_tree | The Whole Tree | Know every invention that can be learned before 1939. | learning | crown | campaign | invention\_done | inventions\_known\_all\_in\_scope: yes | research-tree, gap-lists 22 | progress: (stat: inventions\_known\_in\_scope; target: in\_scope\_count) |
| outnumbered\_win | Fewer, Better | Win a battle when the enemy has twice your men. | war | silver | campaign | battle\_end | player\_won: yes; enemy\_to\_player\_men\_ratio\_min: 2 | warfare 7 |  |
| castle\_by\_terms | Open the Gates | Take a castle by terms, without storming it. | war | copper | campaign | siege\_end | siege\_result: terms | warfare 8.5 |  |
| castle\_by\_storm | Over the Walls | Take a castle by storm. | war | copper | campaign | siege\_end | siege\_result: stormed | warfare 8.4 |  |
| castle\_by\_gold | A Purse at the Gate | Take a castle with gold instead of steel. | war | copper | campaign | siege\_end | siege\_result: bought | warfare 8.6 |  |
| wintered\_well | Wintered Well | Keep an army of 10,000 in winter quarters and lose under 5% of it. | war | copper | campaign | spring\_start | army\_men\_min: 10000; winter\_quarters: yes; winter\_loss\_share\_max: 0.05 | warfare 6.6 |  |
| marshal\_victory | The Marshal | Win a battle led by a Marshal you commissioned. | war | copper | campaign | battle\_end | player\_won: yes; commander\_kind: marshal | recruiting 7.2 |  |
| style\_adopted | A New Way of War | Adopt a commander style from another people. | war | silver | campaign | style\_adopted | styles\_adopted: 1 | warfare-styles 2.2 |  |
| defend\_every\_province | Not One Field | Win a defensive war against a realm twice your size and lose no province. | war | gold | campaign | war\_end | player\_role: defender; player\_won: yes; enemy\_to\_player\_people\_ratio\_min: 2; provinces\_lost: 0 | warfare 10.5 |  |
| sea\_battle\_won | Master of the Swell | Win a sea battle. | sea | copper | campaign | sea\_battle\_end | player\_won: yes | warfare 11.2 |  |
| trade\_ships\_100 | Merchant Fleet | Have 100 trade ships. | sea | silver | campaign | turn\_end | trade\_ships\_min: 100 | country-stats 6 | progress: (stat: trade\_ships; target: 100) |
| ocean\_crossed | Beyond the Horizon | Sail a fleet across an ocean and bring it home. | sea | copper | campaign | fleet\_home | fleet\_crossed\_ocean\_and\_returned: yes | gap-lists 14, gap-lists 15 |  |
| first\_contact | Strangers on the Shore | Meet a realm from another macro-region by sea. | sea | copper | campaign | contact\_made | contact\_by: sea; other\_macro\_region: yes | gap-lists 14, event-tree geography |  |
| colony\_by\_treaty | Treaty on the Shore | Found a colony by agreement with the people already living there. | sea | silver | campaign | colony\_founded | founded\_with\_consent\_of\_local\_people: yes | province-stats 12.3 |  |
| around\_the\_world | All the Way Round | Sail one fleet around the whole world. | sea | gold | campaign | fleet\_home | fleet\_circumnavigated: yes | gap-lists 14 |  |
| demand\_granted | Heard Them Out | End a rebellion by granting what the rebels asked for. | order | copper | campaign | rebellion\_end | ended\_by: demand\_granted | rebellions 5.1 |  |
| great\_revolt\_beaten | The Realm Holds | Survive a great revolt and keep your throne. | order | silver | campaign | rebellion\_end | severity: great\_revolt; rebels\_won: no | rebellions 4.1, rebellions 6 |  |
| quiet\_land | A Quiet Land | Rule 20+ provinces for 25 years with no riot or revolt anywhere. | order | gold | campaign | turn\_end | provinces\_min: 20; months\_no\_unrest\_tier: 300 | rebellions 4.1 | progress: (stat: months\_no\_unrest\_tier; target: 300) |
| allies\_3 | Friends in Many Courts | Hold three alliances at once. | abroad | copper | campaign | relation\_changed | alliances\_min: 3 | relation-types Alliance |  |
| rival\_to\_ally | Old Grudges Buried | Turn a rival into an ally. | abroad | silver | campaign | relation\_changed | relation\_from: rival; relation\_to: alliance; same\_partner: yes | relation-types |  |
| oath\_kept\_century | My Word Is Iron | Play 100 years without breaking an oath. | abroad | silver | campaign | year\_end | years\_played\_min: 100; oaths\_broken: 0 | country-stats 9 | progress: (stat: years\_without\_broken\_oath; target: 100) |
| independence\_won | Our Own Banner | Start as a subject and win your freedom. | abroad | silver | campaign | relation\_changed | started\_as\_subject: yes; subject\_of\_anyone: no | relation-types Subject, gap-lists 7 | full game: yes |
| tribute\_5 | Tribute Roads | Have five subjects paying you tribute. | abroad | silver | campaign | turn\_end | tributaries\_min: 5 | country-stats 9, gap-lists 7 |  |
| history\_kept | As It Was Written | Choose the historical option in 25 events in one campaign. | history | copper | campaign | event\_choice | historical\_choices\_min: 25 | event-tree trigger model | progress: (stat: historical\_choices; target: 25) |
| history\_rewritten | Another Ending | Choose a non-historical option in 10 major events in one campaign. | history | silver | campaign | event\_choice | nonhistorical\_choices\_in\_major\_events\_min: 10 | event-tree importance, event-tree choices | progress: (stat: nonhistorical\_major\_choices; target: 10) |
| paths\_not\_taken | Paths Not Taken | Across all your games, pick 50 different non-historical event options. | history | gold | lifetime | event\_choice | distinct\_nonhistorical\_options\_min: 50 | event-tree choices | progress: (stat: distinct\_nonhistorical\_options; target: 50) |
| kulikovo\_free | Free of the Khan | Face the khan's horde at Kulikovo and be no one's subject on 1 January 1400. | history | silver | campaign | date | date: 1400-01-01; event\_role: (event: battle\_of\_kulikovo; role: prince); subject\_of\_anyone: no | event-tree battle\_of\_kulikovo, event-tree tokhtamysh\_burns\_moscow, relation-types Subject | full game: yes |
| kosovo\_free | Blackbird Field | Face the sultan at Kosovo and be no one's subject on 1 January 1400. | history | silver | campaign | date | date: 1400-01-01; event\_role: (event: battle\_of\_kosovo; role: prince); subject\_of\_anyone: no | event-tree battle\_of\_kosovo, relation-types Subject | full game: yes |
| ankara\_weathered | The Storm Passes | Meet the conqueror's army at Ankara and be no one's subject at the end of 1405. | history | silver | campaign | date | date: 1405-12-31; event\_role: (event: battle\_of\_ankara; role: sultan); subject\_of\_anyone: no | event-tree battle\_of\_ankara, event-tree death\_of\_timur, relation-types Subject |  |
| walls\_held\_1453 | The Walls Held | Hold Constantinople through 1460 as the realm that defends it. | history | gold | campaign | date | date: 1460-12-31; event\_role: (event: fall\_of\_constantinople; role: defender); owns: city:constantinople | event-tree fall\_of\_constantinople | full game: yes |
| timurid\_heirs | The Conqueror's Heirs | As the realm the conqueror leaves behind, keep Samarkand through 1507. | history | gold | campaign | date | date: 1507-12-31; event\_role: (event: death\_of\_timur; role: empire); owns: city:samarkand | event-tree death\_of\_timur, event-tree shaybanid\_conquest\_of\_transoxiana | full game: yes |
| four\_quarters\_hold | The Four Quarters Hold | As the Andean empire, keep Cusco and stay free through 1600. | history | gold | campaign | date | date: 1600-12-31; event\_role: (event: inca\_expansion; role: any); owns: city:cusco; subject\_of\_anyone: no | event-tree inca\_expansion, event-tree spanish\_conquest\_of\_the\_inca | full game: yes |
| never\_colonised | Unconquered | In Africa, Asia, the Americas or Oceania, reach 1914 with your capital never taken from outside. | history | gold | campaign | date | date: 1914-01-01; start\_macro\_region\_not: europe; capital\_never\_occupied\_by\_other\_macro\_region: yes | event-tree geography, event-tree agency |  |
| printing\_early | The Presses Roll | Bring printing to your realm before 1470. | history | copper | campaign | invention\_done | invention: printing; before: 1470-01-01 | event-tree printing\_press\_spreads, research-tree |  |
| abolition\_early | Chains Broken | Abolish slavery in your realm before 1800. | history | silver | campaign | event\_choice | realm\_flag\_set: slavery\_abolished; before: 1800-01-01 | event-tree british\_emancipation, event-tree brazilian\_abolition, event-tree principle 4 |  |
| kept\_out\_great\_war | Stayed Home | Rule 50+ provinces and stay out of the First World War. | history | silver | campaign | event\_end | event: world\_war\_i; provinces\_min: 50; at\_war\_during\_event: no | event-tree world\_war\_i |  |
| crash\_weathered | Weathered the Crash | Get through the Great Depression without defaulting. | history | copper | campaign | event\_end | event: great\_depression; affected: yes; defaulted\_during\_event: no | event-tree great\_depression, country-stats 2 |  |
| japan\_whole\_1600 | One Island Realm | Own every province of Japan before 1600. | history | gold | campaign | province\_gained | owns\_all: region:japan; before: 1600-01-01 | event-tree p\_sengoku\_and\_unification |  |
| sahel\_whole\_1600 | Lord of the River Bend | Own every province of the Niger Bend before 1600. | history | gold | campaign | province\_gained | owns\_all: area:niger\_bend; before: 1600-01-01 | event-tree p\_songhai\_and\_sahel |  |
| reach\_1444 | The Old Start | Reach 11 November 1444, the day after Varna, where the game once began. | campaign | copper | campaign | date | date: 1444-11-11 | decisions X-25 |  |
| reach\_1500 | New Century | Reach the year 1500. | campaign | copper | campaign | date | date: 1500-01-01 | none |  |
| reach\_1700 | Three Centuries On | Reach the year 1700. | campaign | copper | campaign | date | date: 1700-01-01 | none |  |
| reach\_1900 | The New Machine Age | Reach the year 1900. | campaign | silver | campaign | date | date: 1900-01-01 | none |  |
| campaign\_complete | The Long Road | Play a campaign to its last day. | campaign | crown | campaign | campaign\_end | reached\_end\_date: yes | gap-lists decisions campaign span |  |
| from\_one\_hall | From One Hall | Start with a single province and come to own 50. | campaign | gold | campaign | province\_gained | start\_provinces\_max: 1; provinces\_min: 50 | none | progress: (stat: provinces; target: 50); full game: yes |
| decentralised\_1500 | Many Tents, One People | Play a decentralised people until 1500. | campaign | copper | campaign | date | date: 1500-01-01; start\_polity\_kind: decentralised | country-catalogue playable kinds | full game: yes |
| many\_crowns | Many Crowns | Across your games, play 10 different realms for 10 years each. | campaign | copper | lifetime | year\_end | distinct\_realms\_played\_10\_years\_min: 10 | none | progress: (stat: distinct\_realms\_played\_10\_years; target: 10); full game: yes |
| every\_macro\_region | Crowns of the World | Across your games, play 10 years in each of six world regions. | campaign | silver | lifetime | year\_end | distinct\_world\_regions\_played\_10\_years\_min: 6 | event-tree geography | progress: (stat: distinct\_world\_regions\_played\_10\_years; target: 6); full game: yes |
