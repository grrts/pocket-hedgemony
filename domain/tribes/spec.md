# Tribes (TRIBE)

## 1. Purpose and scope

This context gives the peoples of North America a real campaign without changing how the game plays. In 1444 the
map holds 24 tribal realms there, the five of the old map (Iroquois 3 provinces, Huron 2, Cherokee 2, Creek 6, Pueblo 3)
and the new tribes of TRIBE-002, with hundreds of American land provinces that no realm owns. A tribe cannot colonise (colonies need ships, S5 and a colonial governor), so it
starts boxed into two or three provinces with empty land all round it, and the only way to grow is war on another
tribe. Two small additions answer that, on top of the rules every realm already plays by:

1. **More tribes.** The peoples the country catalogue records as small polities in 1444 become small realms on the
   map, one or two provinces each, where until now they were reference data only (X-13).
2. **Hunting grounds.** A tribal realm walks a few unowned provinces next to its land. They feed its armies, bring in
   furs, count as its land for neighbours, and after years can be taken in as provinces. Settlers who found a colony
   on them anger the tribe; a colonial power can instead ask for the land.

**In scope**
- Which realms are tribal realms, and which catalogue records become new tribal realms in 1444.
- Hunting grounds: how many, claiming, leaving, what they give, taking them in, losing them.
- A colony founded on a hunting ground, and asking a tribe for the land.
- The tribal AI for hunting grounds, and the screens and map lens for them.

**Not in scope (owned by …)**
- Government forms, self-run provinces and their numbers (government). This spec only reads the form.
- Founding colonies, local aggression and colonial range (exploration). This spec changes one roll and adds one
  check.
- Wrongs, the reasons count and war aims (diplomacy); food, foraging and the ledger (realm); the 1444 owners and the
  catalogue (scenario-setup); fighting styles, among them the *Skulking way of war* (warfare).
- Culture-specific titles (a chief instead of a lord): the plain-English naming work, not a rule.
- Starting inventions of tribal realms: the starting-technologies design (one tree reaching further back).
- Africa's chiefdoms and the steppe hordes: their own designs. The region list (`tribes.regions`) lets them adopt
  these rules by data if they choose to.

## 2. Sources

Newest decision first.
1. Leroy, 18 October 2026 (project chat): "For the tribal and african gameplay, I don't want you to change too much
   in terms of gameplay, but I do want them to feel like they have a chance and they should be able to actually play
   well. Maybe we should introduce more tribes that historically existed? Even if they are really small?"
2. Leroy, 18 October 2026: "design tribal gameplay, for indian tribes" (read as the peoples of North America; the
   Caribbean and South America can join by data, D-TRIBE-1).
3. This design (18 October), which states the rules below; numbers it gives are provisional (DECISIONS rule 4).
4. Read for seams: government §3 and GOV-023/024 (self-run forms, the confederation reform need "allied with 2
   neighbours of the same people"); exploration EXPL-034 to EXPL-040, EXPL-068 and D-EXPL-2 (colonies on land of no
   country); province PROV-250 to PROV-255; diplomacy §5.16 (war aims, *Punish*); realm REALM-218/219 (foraging);
   scenario-setup X-13 and the catalogue's `am_north` records; achievements `colony_by_treaty`; warfare's
   *Skulking way of war*.

## 3. Ubiquitous language

| Term | Meaning | Not to be confused with |
|---|---|---|
| Tribal realm | A realm of the Americas (`tribes.regions`) whose form is clan council, chiefdom or confederation | A people with no country (unowned land) |
| Hunting ground | An unowned land province a tribal realm walks. It stays unowned: no realm owns it | A province the realm owns; a colony |
| Range | A tribal realm's hunting grounds, and how many it may hold ("Hunting grounds n of m") | Colonial range (exploration) |
| Claim | Walking an unowned province for 3 months to make it a hunting ground | A war aim or a dynastic claim |
| Take them in | Turning a hunting ground held 10 years into a province of the realm | Conquest, colony |
| Settlers on our land | The wrong a tribe holds against a realm that founds a colony on its hunting ground | *Settlers* (province people) |
| Ask for the land | A colonial power's request that a tribe give up one hunting ground for gold | A peace term |

## 4. Domain model

### Aggregates

**TribalRange** (identity: realm id)
- Holds: the hunting grounds, each with the date it was claimed; at most one claim under way, with its province and
  the date it ends; the range size from the form.
- INV-TRIBE-1: only a tribal realm holds a range. A realm that stops being one keeps none.
- INV-TRIBE-2: a hunting ground is an unowned land province. A province is a hunting ground of at most one realm.
- INV-TRIBE-3: the number of hunting grounds never exceeds the range size.
- INV-TRIBE-4: every hunting ground touches, by land, a province of the realm or another of its hunting grounds.

### Entities and value objects
- **HuntingGround** (value): province id, claimed on (date).
- **Claim** (value): province id, ends on (date).
- **NewTribe** (value, scenario data): catalogue record id, home point (longitude, latitude), provinces (1 or 2).

### Domain services
- **RangeSizer**: the range size from the form (`tribes.range_size`).
- **StartRanges**: fills each tribal realm's range at the start of a campaign.

## 5. Requirements

### 5.1 Tribal realms and the new tribes of 1444
- TRIBE-001 The tribes system shall treat a realm as a tribal realm while its form is clan council, chiefdom or confederation and its capital lies in a region of `tribes.regions` (North America in this design). [this design; government §3]
- TRIBE-002 When a campaign starts, the game shall make a small realm of every catalogue record of a region in `tribes.new_tribe_regions` whose representation is `decentralized_polity` (not `background_only` or `non_state_actor`), that existed on 11 November 1444 (emerged by 1444 and not yet ended), and that is not already a realm on the map. [Leroy 18 Oct; X-13; D-TRIBE-2]
- TRIBE-003 The game shall place each new tribe from its home point in the scenario data: its capital is the land province at that point, and a tier B record also gets the unowned land neighbour of its capital with the most people, where one is left (`tribes.new_tribe_provinces`: tier B 2, tier C 1). New tribes take land with the new African realms, one province a round in nation order (SETUP-063), and never change how provinces are cut (D-SETUP-19). [this design; D-TRIBE-3]
- TRIBE-004 If a new tribe's home province is already owned on the 1444 map, then the game shall leave that record as reference data, as X-13 does for every record that owns no province. [X-13; D-TRIBE-3]
- TRIBE-005 The game shall give each new tribe its form, tongue, faith, starting numbers and personality by the rules every realm already uses (government start forms, culture and religion starts, scenario-setup assessments, catalogue AI personality). [GOV-043; SETUP]

### 5.2 The range
- TRIBE-006 The tribes system shall set a tribal realm's range size by its form: clan council 2, chiefdom 3, confederation 4 (`tribes.range_size`). [this design]
- TRIBE-007 When a campaign starts, the tribes system shall fill each tribal realm's range with the unowned land provinces nearest its land, most people first, walking out over land one province at a time so every ground touches the realm's land or another ground; realms take their turn in ascending nation index, and a province already taken by an earlier realm is skipped. [this design; X-2 order]
- TRIBE-008 The tribes system shall let a tribal realm claim an unowned land province that touches, by land, its own land or one of its hunting grounds, when its range has a free place, no claim is under way, the province is no one's hunting ground, and no colony is being founded there. [this design]
- TRIBE-009 When a claim has run 3 months (`tribes.claim_months`), the tribes system shall make the province a hunting ground of the claiming realm, dated that day. [this design]
- TRIBE-010 The tribes system shall let a tribal realm leave a hunting ground at any time; a hunting ground left this way can't be claimed again by that realm for 5 years (`tribes.reclaim_years`). [this design]
- TRIBE-011 When a hunting ground gets an owner (a colony founded, a province taken in, a treaty, any other way), the tribes system shall remove it from the range. [INV-TRIBE-2]
- TRIBE-012 When a hunting ground no longer touches the realm's land or another of its grounds, the tribes system shall remove it from the range at the next monthly step. [INV-TRIBE-4]
- TRIBE-013 When a realm stops being a tribal realm (a reform, a revolution, its capital moving), the tribes system shall clear its range at once. A realm with no provinces left has no range. [INV-TRIBE-1]

### 5.3 What a hunting ground gives
- TRIBE-014 Each month, the tribes system shall add 0.5 gold (`tribes.furs_gold`) for each hunting ground to the realm's treasury, on the ledger line *Furs and hides*. [this design]
- TRIBE-015 The realm system shall let an army of a tribal realm, or of its ally, refill its wagons in the realm's hunting grounds as in friendly land, and an army of a realm at war with the tribe refill nothing there, as in enemy land. [REALM-218, REALM-219; this design]
- TRIBE-016 The diplomacy system shall count a realm's hunting grounds as its land when it decides who is a neighbour, so two tribes whose grounds touch are neighbours (and can meet the confederation reform need "allied with 2 neighbours of the same people"). [government §4; this design]
- TRIBE-017 The tribes system shall leave a hunting ground unowned in every other respect: it pays no tax, needs no official, raises no levy, does not count toward world domination, and the people living there stay a people with no country. [this design; X-12; D-EXPL-2]

### 5.4 Taking them in
- TRIBE-018 The tribes system shall let a tribal realm take in a hunting ground it has held 10 years (`tribes.take_in_years`) while the realm is at peace and no colony is being founded there; the province becomes a province of the realm with its people, their tongue and faith. [this design]
- TRIBE-019 When a province is taken in and its largest tongue is the realm's tongue, the government system shall treat it as self-run like the realm's other home provinces; otherwise it needs an official, against the officials cap. [GOV-023, GOV-024]
- TRIBE-020 When a province is taken in, the tribes system shall free its place in the range, so the realm can claim again. [TRIBE-011]

### 5.5 Settlers on our land
- TRIBE-021 When a realm starts founding a colony in a province that is a hunting ground of a tribal realm, the exploration system shall roll the colony's local aggression one step fiercer (Peaceful becomes Wary, Wary Hostile, Hostile Fierce, Fierce stays Fierce). [EXPL-038, EXPL-039; this design]
- TRIBE-022 When a realm starts founding a colony on a tribe's hunting ground, the diplomacy system shall give the tribe the wrong *Settlers on our land* against the founder (−30, fading over 20 years, `tribes.settlers_wrong`) and the war aim *Punish* against it for 10 years (`tribes.settlers_punish_years`). [diplomacy §5.16; this design]
- TRIBE-023 The tribes system shall let a realm ask a tribal realm for one of its hunting grounds, offering gold (`tribes.land_price` 10 gold at the game's gold scale, the player may offer more); the ask is answered by the reasons count a month later like every ask. [diplomacy §5.5; this design]
- TRIBE-024 When a tribe gives up a hunting ground for gold, the tribes system shall pay the tribe, remove the ground from its range, keep the tribe from claiming it again for 10 years, and the next colony the asking realm founds there shall roll Peaceful and count as founded with the consent of the local people (achievement *Treaty on the Shore*). [ACH colony_by_treaty; this design]
- TRIBE-025 The diplomacy system shall add to the reasons count of a tribe asked for land: the gold offered (more is a stronger yes), *Settlers on our land* already held against the asker (no), a Hostile stance (no), and how many grounds the tribe would have left (giving up its last ground is a strong no). [diplomacy §5.5; this design]

### 5.6 How the player uses it
- TRIBE-026 Where: an unowned land province's card shows, under its name, "Hunting ground of the Creek" with the realm's flag, or "Land of a people with no country". On a tribal player's card for a province they may claim, a 44-point button **Claim as hunting ground · 3 months** sits there; when the province can't be claimed the button is greyed and the reason is written under it (no free place, a claim is under way, it is the Cherokee's ground, a colony is being founded). A claim under way shows a bar with the date it ends. On a hunting ground of the player's: **Take them in** (greyed with "held 6 of 10 years" or "not while at war" under it) and **Leave this ground**, which asks to confirm. [X-19]
- TRIBE-027 Grouping and overview: a tribal realm's card has a **Hunting grounds** tab in the Lands group, beside Colonies (the realm card's six sections, UI review of 18 October), holding everything about the range in one place: "Hunting grounds n of m" with a bar, the claim under way, then one row per ground with its people, years held and furs, each row opening the province on the map; a row ready to take in is marked and sorted first; colonies being founded on the realm's grounds are listed at the top in red with Go there. The General tab carries one line, "Hunting grounds n of m · furs x gold a month", that opens the tab. Another tribe's card shows its grounds count and, for a colonial power, **Ask for the land** on that tribe's Diplomacy tab, one row per ground. The tab also lists asks for the realm's land waiting for its answer, with Yes and No and the reasons count; an ask left a month past its answer lapses as a no. A colonial player also finds **Ask for the land** on the province card of a ground. [X-19, F-12]
- TRIBE-028 The map: hunting grounds are drawn at every zoom in their realm's colour as a light diagonal hatch over the land, so the tribes visibly hold the land around them; the political lens and the Charts lens both show it, and a colony being founded on a ground shows its flag over the hatch. The Charts lens marks a coast that is someone's hunting ground in amber instead of green, so a colonial player sees before sailing that settling there angers a tribe. [X-19; EXPL-073]
- TRIBE-029 Founding on a ground: the fleet card's **Colony** section, when its target is a hunting ground, says "Hunting ground of the Creek: settling here angers them" with **Ask for the land** beside *Found colony*. When someone starts founding on the player's ground, a short alert over the map says "Settlers on our land: Castile at Southeast Mississippi" with **Go there**, and the dispatches keep it. [X-19; SHELL-147]
- TRIBE-030 Phone: the tab, the province card buttons and the alert work in the Wide and Tall layouts held sideways and upright: every button at least 44 points high, reasons written under buttons and never only in a hover title, the tab's rows stacked in one column on a narrow panel with no sideways scrolling, and the hatch readable in every colour-vision mode. [X-19; SHELL-108, SHELL-109, SHELL-114]

### 5.7 AI
- TRIBE-031 In each month's step, a tribal AI realm with a free place and no claim under way shall claim the unowned province it may claim with the most people, lowest id on a tie. [this design]
- TRIBE-032 In the turn in which 1 January falls, a tribal AI realm shall take in every ground it may (TRIBE-018), oldest first, while it stays within its officials cap. [this design]
- TRIBE-033 An AI realm that wants to found a colony on a tribe's ground shall first ask for the land at `tribes.land_price` when it holds the gold twice over, and found there only after an answer. [this design]

## 6. Commands

| Command | Who issues it | Preconditions | Result | Events emitted |
|---|---|---|---|---|
| ClaimGround(realm, province) | player / AI | TRIBE-008 | Claim under way for 3 months | ClaimStarted |
| LeaveGround(realm, province) | player / AI | Province is the realm's ground | Ground removed; reclaim barred 5 years | GroundLeft |
| TakeIn(realm, province) | player / AI | TRIBE-018 | Province becomes the realm's | GroundTakenIn |
| AskForLand(asker, tribe, province, gold) | player / AI | Province is the tribe's ground; asker holds the gold | Ask sent; answered a month later | LandAsked |
| AnswerLandAsk(tribe, ask, yes/no) | player / AI | Ask waiting | Gold paid and ground given up, or refused | LandGiven, LandRefused |

## 7. Domain events

| Event | When | Payload | Consumed by |
|---|---|---|---|
| ClaimStarted | A claim begins | realm, province, ends on | map-presentation, game-shell |
| GroundClaimed | A claim ends | realm, province | map-presentation, diplomacy (neighbours) |
| GroundLeft / GroundLost | Left by choice; lost by TRIBE-011 to TRIBE-013 | realm, province, why | map-presentation, diplomacy |
| GroundTakenIn | A ground becomes the realm's | realm, province | province, government, culture, religion |
| SettlersOnOurLand | A colony starts on a ground | tribe, founder, province | diplomacy, exploration, game-shell |
| LandGiven / LandRefused | An ask for land is answered | tribe, asker, province, gold | exploration, achievements, game-shell |

## 8. Policies (reactions to other contexts)

- When exploration reports `ColonyFoundingStarted` in a hunting ground, then raise *Settlers on our land* (TRIBE-021, TRIBE-022) unless the founder was given the land (TRIBE-024).
- When a province gets an owner, then remove it from any range (TRIBE-011).
- When government reports a change of form, or a realm's capital moves, then check TRIBE-001 and clear the range if it no longer holds (TRIBE-013).
- When a war ends, then nothing changes in the ranges: hunting grounds are not a peace term.

## 9. Each turn

Monthly step, after government and before diplomacy (X-2): end claims whose 3 months are up, drop grounds cut off
from the realm (TRIBE-012), pay *Furs and hides*, then the AI claims. Taking in by the AI runs in the turn in which
1 January falls. Foraging in grounds is read by realm's daily refill.

## 10. Configuration

| Key | Meaning | Value in the design | Placeholder? | Config file |
|---|---|---|---|---|
| `tribes.regions` | Regions where a kin realm is a tribal realm | `am_north` | yes | tribes.json |
| `tribes.new_tribe_regions` | Regions whose small polities become realms in 1444 | `am_north` | yes | tribes.json |
| `tribes.new_tribe_provinces` | Provinces a new tribe starts with, by catalogue tier | B 2, C 1 | yes | tribes.json |
| `tribes.new_tribes` | Home point (lon, lat) of each new tribe | one row per record, D-TRIBE-3 | yes | scenario-setup-map.json |
| `tribes.range_size` | Hunting grounds by form | clan council 2, chiefdom 3, confederation 4 | yes | tribes.json |
| `tribes.claim_months` | Months a claim takes | 3 | yes | tribes.json |
| `tribes.reclaim_years` | Years before a ground left can be claimed again | 5 | yes | tribes.json |
| `tribes.furs_gold` | Gold a month per hunting ground | 0.5 | yes | tribes.json |
| `tribes.take_in_years` | Years a ground is held before it can be taken in | 10 | yes | tribes.json |
| `tribes.settlers_wrong` | The wrong *Settlers on our land* | −30, fading over 20 years | yes | tribes.json |
| `tribes.settlers_punish_years` | Years the tribe holds *Punish* against the founder | 10 | yes | tribes.json |
| `tribes.land_price` | Gold the AI offers for one ground, at the game's gold scale | 10 | yes | tribes.json |
| `tribes.region_bounds` | Each region of `tribes.regions` as a box of longitude and latitude, read against a realm's capital | am_north: 170° W to 50° W, 24.5° N to 84° N | yes | tribes.json |
| `tribes.given_reclaim_years` | Years before a ground given up for gold can be claimed again | 10 | yes | tribes.json |
| `tribes.ask` | The reasons count of an ask for land: base, a gold, standing divisor, wrong held, Hostile, one or no ground left, months to answer | −5, +1 (at most +40), 4, −25, −30, −10, −100, 1 | yes | tribes.json |
| `tribes.ai` | The AI asks first while it holds the price this many times over; how long it remembers an answer | 2, 10 years | yes | tribes.json |

## 11. Seams

| Other context | Direction | Pattern | What crosses |
|---|---|---|---|
| government | upstream | Conformist | The form (tribal realm or not); self-run for a province taken in; officials cap |
| scenario-setup | upstream | Customer–Supplier | The catalogue's `am_north` records, their tier, representation and dates; home points; 1444 owners; new tribes become realms (X-13) |
| exploration | partnership | Partnership | Colony founding starts and ends; aggression one step fiercer on a ground; a given ground rolls Peaceful; the Charts lens marks grounds |
| diplomacy | downstream | Customer–Supplier | Wrong *Settlers on our land*, war aim *Punish*; grounds count for neighbours; the ask for land through the reasons count |
| realm | downstream | Customer–Supplier | *Furs and hides* ledger line; refilling wagons in grounds |
| province | downstream | Customer–Supplier | A province taken in, with its people |
| achievements | downstream | Published Language | A colony on given land counts as founded with the consent of the local people |
| map-presentation | downstream | Published Language | Ground hatch, claim bars, the amber coast in Charts |
| game-shell | downstream | Published Language | Hunting grounds tab, province card buttons, the settlers alert |
| time-and-turns | upstream | Conformist | Monthly step place; yearly take-in |

## 12. AI

Tribal AI realms claim the most-peopled province they may each month (TRIBE-031) and take in grounds each January
while within their officials cap (TRIBE-032). Colonial AI realms ask before settling on a ground (TRIBE-033) and
answer asks for land by the reasons count like any ask. All of it goes through the same commands as the player's.

## 13. Decisions and open questions

- **D-TRIBE-1** Which tribes: "Indian tribes" is read as the peoples of North America, where the five tribal realms of the 1444 map sit. The Caribbean, South America and Africa are left to their own designs; `tribes.regions` and `tribes.new_tribe_regions` let them join by data without a new rule.
- **D-TRIBE-2** New tribes (Leroy, 18 Oct, "introduce more tribes that historically existed, even really small"): every `decentralized_polity` record of `am_north` that existed on 11 November 1444 and owns no province becomes a realm. From the catalogue that is 27 at most: Apalachee, Caddo, Calusa, Casqui and Pacaha, Chumash, Coast Salish, Cofitachequi, Coosa, Fort Ancient, Hopi, Lenape, Middle Missouri villagers, Moundville, Natchez, Neutral and Erie, Anishinaabe, Oneota, O'odham, Northwest Coast peoples, Central Plains villagers, Tidewater Algonquians, Southern New England Algonquians, St. Lawrence Iroquoians, Timucua, Tlingit and Haida, Wakashan peoples, Zuni. Records that are peoples rather than polities (`non_state_actor`: Plains hunters, Dene, Innu and Cree …) stay peoples with no country, so open land remains for hunting grounds and colonies. Susquehannock (a people that formed c. 1450) and Paquimé (`background_only`) are left out.
- **D-TRIBE-3** Where they go: each new tribe gets a home point (longitude and latitude of its heartland from its catalogue record) in the scenario data, like the map's capitals. A home province already owned in 1444 (Coosa under the Creek, perhaps Hopi and Zuni under the Pueblo) leaves the record as reference data (TRIBE-004), the simplest rule and the one X-13 already follows.
- **D-TRIBE-4** Keep gameplay as it is (Leroy, 18 Oct): no new resource, no new screen besides one tab, no new war rule. Hunting grounds reuse wrongs, the war aim *Punish*, the reasons count, foraging, self-run provinces and the officials cap. A tribe grows by claiming and taking in at about one province every few years per place in its range, slower than conquest and far slower than a colonial power, but it is never boxed in.
- **D-TRIBE-5** Pueblo: its 1444 form is a city commune (town polities), so it is not a tribal realm and gets no range; the Rio Grande towns grew by farming, not by walking new land. A reform into a tribal form would give it one.
- **D-TRIBE-7** Built 18 October 2026. Tribal regions are read off the map as a box of longitude and latitude per region (`tribes.region_bounds`), since map realms carry no catalogue region; North America is west of 50° W and north of 24.5° N. The asking price and the reasons count's numbers are in `tribes.ask`. "Needs no official" (GOV-023) now holds in a campaign: a clan council or chiefdom's own-people province with no official is not *Ungoverned*.
- **D-TRIBE-6** Hunting grounds stay unowned, so the colony rules (D-EXPL-2, PROV-250) are unchanged: anyone may still settle there, at the price of a fiercer people and an angry tribe, or by asking first.

## 14. Traceability

| Requirement | Feature file | Scenario |
|---|---|---|
| TRIBE-001 | tribal-realms.feature | Which realms are tribal realms |
| TRIBE-002 … TRIBE-005 | tribal-realms.feature | Small polities of 1444 become realms; A home province already owned keeps the record as reference; A new tribe starts like every realm |
| TRIBE-006, TRIBE-007 | hunting-grounds.feature | Range size by form; The Creek's grounds in 1444 |
| TRIBE-008 … TRIBE-013 | hunting-grounds.feature | Claiming a ground; A claim that may not be made; Leaving a ground; A ground that gets an owner; A ground cut off; A realm that stops being tribal |
| TRIBE-014 … TRIBE-017 | hunting-grounds.feature | Furs and hides; Armies in hunting grounds; Grounds make neighbours; A ground stays unowned |
| TRIBE-018 … TRIBE-020 | taking-in.feature | Taking in a ground of the realm's own people; Taking in strangers needs an official; Taking in too soon or at war |
| TRIBE-021 … TRIBE-025 | settlers-on-our-land.feature | A colony on a ground; Asking for the land; The reasons for giving up land |
| TRIBE-026 … TRIBE-030 | hunting-grounds-screens.feature | Province card; Hunting grounds tab; Map hatch and Charts; Founding on a ground; Phone layouts |
| TRIBE-031 … TRIBE-033 | tribal-ai.feature | The AI claims; The AI takes in; A colonial AI asks first |
