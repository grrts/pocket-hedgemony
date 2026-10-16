# Religion (RELG)

## 1. Purpose and scope

Religion decides which faiths exist and how they relate, how the faith mix of each province changes (pulls,
hold, drift), what faith buildings do for the mix and for communities, how a realm with several faiths is run
(communities, the Faith policy screen, expulsion, the Inquisition, lords and faith), preachers, changing the state
faith, holy places, the one rule per faith, faith waves and the religion events, and what religion offers other
systems.

**In scope**
- The faith list (event tree `religions` + hussite, jain, asian_traditional), families, the relations layered /
  rooted / kin.
- The faith mix: pulls, hold, the yearly move, small shares, hidden believers.
- The religion rules on faith buildings (pull, serving, take-over, tithes); not the buildings themselves.
- Communities, served / unserved, the four faith policies, *Wrong faith* and *Persecuted* triggers, expulsion,
  the Inquisition, the faith steps of lords' loyalty.
- Preachers, the *Allow preachers* leave (as a fact; the action is diplomacy's), adopting a faith, cuius regio.
- Holy places, faith-specific rules, faith waves, the ten new events and the patches, the 1444 starting mix.

**Not in scope (owned by …)**
- Faith buildings' list, costs, slots, jobs (buildings 7.5); clergy class, officials, charters and grievance
  storage (province); lords and loyalty mechanics (realm); risings and sparks (rebellions); war aims (warfare);
  opinion and the *Allow preachers* action (diplomacy); theocratic forms (government); church heads such as the
  Pope (the "big institutions" gap); events engine and vocabulary (events); culture (separate on purpose).

## 2. Sources

Newest decision first.
1. `religion/religion-design.md` §19 (16 October): four defaults kept — community 10 %, *Wrong faith* at a third unserved, faith tax +25 %, mix moves 3 % a year.
2. `religion/religion-design.md` version 1, all sections 1–19 (including §18 "Changes needed in other files").
3. `religion/config/religion.yaml` version 1.
4. `religion/event-tree-additions/` README, `religion-events.yaml`, `patches.yaml`, vocabulary, enums, entities, modifiers additions (as additions to the event tree; not merged).
5. `religion/build/catalogue-faiths-report.md`.
6. Read for seams only: buildings-design 7.5, province-stats 10.4 and 12.1, event-tree `data/enums.yaml`, government v2, culture v1.

## 3. Ubiquitous language

| Term | Meaning | Not to be confused with |
|---|---|---|
| Faith | One id of the faith list (catholic, sunni, hindu …) with a local display name from the catalogue | Faith family |
| Faith family | christian, islamic, indic, buddhist, east_asian, jewish, traditional, none | Culture family |
| State faith | The realm's one Established faith (the ruler's faith) | Majority faith |
| Faith mix | Up to three faiths per province, as shares of its people | Tongue mix |
| Pull | A faith's yearly sum of visible causes in a province (buildings, preachers, schools, capital, lord, traders, waves, policy) | Culture's pull tongue |
| Hold | A faith's resistance to change: share × 4 (× 8 if rooted) | — |
| Target share | (hold + pull) ÷ (all holds + all pulls) | Settled share (pull ÷ all pulls) |
| Layered | Faiths living in the same people at once: shinto, mahayana, confucian_ritual, daoist; a traditional faith with any faith after 100 years together | — |
| Rooted | The five traditional faiths: no house needed, hold ×2, sacred places | — |
| Kin faith | A faith of the same family | Culture's kin |
| Community | A faith with at least 10 % of a province's people | — |
| Served / unserved | A community with / without its own (or kin, or none needed) house and a Tolerated or Restricted policy | — |
| Faith policy | Per faith per realm: Established, Tolerated, Restricted, Persecuted | Tongue policy |
| Faith tax | Restricted: that faith's share of tax is 25 % higher | — |
| *Wrong faith* | Grievance redefined by religion (see RELG-046) | — |
| *Persecuted* | New grievance, counts as two | — |
| Hidden believers | A persecuted faith's 2 % floor for 100 years after its houses close | — |
| Expel | One-off decision on a Persecuted faith | A policy |
| Inquisition | Decision for Catholic monarchies | — |
| Take-over | Converting another faith's house: pull flips, property's gold paid, spark, lords waver | Building a new house |
| Tithes | 1 gold a year per 10,000 people of a faith to that faith's clergy purse | — |
| Preacher | Named agent of the state faith sent to one province | Monk/missionary (buildings wording) |
| *Allow preachers* | Diplomacy action: a foreign ruler's leave | — |
| Holy place | Named province in config with faiths | — |
| Faith wave | Temporary source of pull from an event, carried by carriers and spreading by rings | `spread` (one-off shift) |
| Carrier | What gives a wave pull in a province: presses, schools, towns, traders, rule, army, preachers | — |
| Cuius regio | After `peace_of_augsburg`, Empire rulers switch Catholic ↔ Protestant without the capital test | — |

## 4. Domain model

### Aggregates

**FaithCatalogue** (reference data, config `faiths`, `relations`)
- INV-RELG-1: faith ids are the event tree's `religions` plus hussite, jain, asian_traditional.
- INV-RELG-2: every faith has one family; `secular` has family none and no houses.

**ProvinceFaith** (identity: province id; storage of the top three is province's)
- Holds: up to three faiths and shares; houses per faith (three small numbers); the stationed preacher (one id);
  hidden-believer timers; years each traditional faith has shared the province (for layering).
- INV-RELG-3: at most three faiths; shares sum to 1.
- INV-RELG-4: a faith under 1 % with no house of its own is removed, except a persecuted faith under its hidden-believer floor.
- INV-RELG-5: a fourth faith enters only by replacing the smallest, and only if larger.

**RealmFaith** (identity: country id)
- Holds: state faith, one policy row per faith present (at most about a dozen), preacher list, holy places held,
  Inquisition flag, last adopt-by-decision date, per-faith clergy purses, the realm choice of close or take over for Persecuted faiths.
- INV-RELG-6: exactly one faith is Established.
- INV-RELG-7: a secular state's other rows are only Tolerated or Restricted.
- INV-RELG-8: no adopt-by-decision within 30 years of the last one.

**FaithWave** (identity: wave id; global, usually fewer than five active, config max 8)
- Holds: faith, from, carriers, pull, reach per year, limit, end (years or period), set of provinces reached.

**HolyPlace** (reference + holder derived from province owner)

### Entities and value objects
- **Pull** (value): a list of named sources and amounts, shown on the card.
- **Preacher** (entity): faith, location, years in province, leave status.
- **FaithPolicy** (value): established | tolerated | restricted | persecuted.

### Domain services
- **MixService**: yearly pulls, hold, target, 3 % move, small shares.
- **CommunityService**: communities, served/unserved, grievance triggers.
- **PolicyService**: policy rows, next-new-year timing, sparks, flags.
- **WaveService**: grows waves once a year, adds pull per carrier.
- **StartMixService**: 1444 mix from `catalogue-faiths.json` and region overrides.

## 5. Requirements

### 5.1 Faiths and relations
- RELG-001 The religion system shall use the event tree's `religions` list plus `hussite`, `jain` and `asian_traditional` as faith ids. [religion §2.1; enums-additions]
- RELG-002 The religion system shall give each faith one family: christian (catholic, protestant, anglican, orthodox, oriental_christian, hussite), islamic (sunni, shia, ibadi), indic (hindu, sikh, jain), buddhist (theravada, mahayana, vajrayana), east_asian (shinto, confucian_ritual, daoist), jewish, traditional (indigenous_american, african_traditional, pacific_traditional, siberian_steppe_traditional, asian_traditional), none (secular). [religion §2.1; config faiths]
- RELG-003 The religion system shall show each faith by the catalogue's local name while the engine uses the faith id. [religion §2.1]
- RELG-004 The religion system shall keep Yazidi, Druze and Zoroastrian communities only as named minorities in the catalogue, not as faith ids. [religion §2.1]
- RELG-005 The religion system shall treat shinto, mahayana, confucian_ritual and daoist as layered with each other, and each traditional faith as layered with any faith once they have shared a province for 100 years. [religion §2.2; config relations]
- RELG-006 Where two faiths are layered, the religion system shall give a layered community no *Wrong faith* under a ruler of a faith it layers with, and shall not let the two pull against each other. [religion §2.2]
- RELG-007 The religion system shall treat the five traditional faiths as rooted: served without a house, hold ×2, and where a quarter or more of the people their sacred places count as one house of worship (pull 1). [religion §2.2; config mix.rooted_*]
- RELG-008 The religion system shall let a kin faith's house serve a community under 20 %. [religion §2.2, §5.1; config relations.kin_serves_community_below]

### 5.2 The faith mix
- RELG-009 When a year ends, the religion system shall work out every faith's pull in every province as the sum of the sources present. [religion §3.1, §14]
- RELG-010 The religion system shall give pull for a faith building of that faith that is at least half filled with clergy as set per building and step, and half that for a fallow one. [religion §3.1, §4; config pull.fallow_multiplier]
- RELG-011 The religion system shall give 2 pull for each preacher of the faith stationed in the province. [religion §3.1, §6]
- RELG-012 The religion system shall give 0.5 pull for each school of the faith (temple school, madrasa, monastery or cathedral school, seminary). [religion §3.1]
- RELG-013 The religion system shall give 1 pull to the ruler's faith in the ruler's capital province. [religion §3.1]
- RELG-014 The religion system shall give 0.5 pull to a lord's faith in a province he holds. [religion §3.1]
- RELG-015 The religion system shall give sunni, shia and ibadi 0.5 pull for every 100 traders passing from markets where that faith is the majority, up to 2. [religion §3.1; config pull.traders_*]
- RELG-016 While a faith wave covers a province, the religion system shall add the wave's pull per carrier there. [religion §3.1, §10.2]
- RELG-017 Where another faith is Restricted in a province, the religion system shall give the ruler's faith 1 more pull there. [religion §3.1, §5.2]
- RELG-018 Where a Chaplain official serves, the religion system shall double the ruler's faith pull from houses and preachers. [religion §3.1]
- RELG-019 Where another faith is Persecuted in a province, the religion system shall double the ruler's faith pull there. [religion §3.1, §5.2]
- RELG-020 The religion system shall give each faith a hold of its share times 4, or times 8 for a rooted faith. [religion §3.2; config mix.hold_per_share]
- RELG-021 When a year ends, the religion system shall set each faith's target share to (its hold + its pull) ÷ (all holds + all pulls in the province) and move its share 3 % of the way toward the target. [religion §3.2, §19]
- RELG-022 If no faith in a province has any pull, then the religion system shall keep the province's mix unchanged. [religion §3.2]
- RELG-023 If a faith falls under 1 % in a province and has no house of its own there, then the religion system shall remove it from the province. [religion §3.2]
- RELG-024 When a fourth faith arrives in a province, the religion system shall let it replace the smallest of the three only if it is larger. [religion §3.2]
- RELG-025 While fewer than 100 years have passed since a Persecuted faith's houses in a province were closed, the religion system shall keep that faith at 2 % or more there (hidden believers), unless an Inquisition removes the floor. [religion §3.2, §5.4]
- RELG-026 When refugees, settlers, migrants or soldiers settling at home move, the religion system shall shift the mix by their headcount at once, outside the pulls. [religion §3.2]
- RELG-027 The religion system shall show every change on the Faith line with a named reason (each pull source listed). [religion §1, §3.2]

### 5.3 Faith buildings
- RELG-028 The religion system shall give a house of worship 1 / 1.5 / 2 pull at step 1 / 2 / 3, and a landmark step 4 house 3 pull in its province and 0.5 in every province of its owner's realm within 3 rings. [religion §4; config pull.house_steps, pull.landmark_house]
- RELG-029 The religion system shall let a house of worship be built for any faith present, not only the ruler's. [religion §4]
- RELG-030 The religion system shall give a minority house of worship 0.5 pull and let it serve its community, and require a community of a tenth of the people or a *Faith tolerance* charter to build it. [religion §4; config houses.minority_house_needs_share]
- RELG-031 The religion system shall give a monastery 1 pull and let it serve its community; once it has seats it also counts as a school of its faith (0.5 more). [religion §4]
- RELG-032 The religion system shall give a religious school 0.5 pull and no serving. [religion §4]
- RELG-033 The religion system shall give a pilgrimage shrine (only at holy places) 1 pull and let it serve its community. [religion §4]
- RELG-034 When a house of worship is converted to another faith (a take-over), the religion system shall charge half the cost of building it, flip its pull to the new faith, pay its clergy's property gold into the treasury (twice for monastic land), raise an "insult to faith" spark in that province, and make lords of the old faith waver one step. [religion §4; config houses.take_over_*, convert_cost_share_of_build]
- RELG-035 The religion system shall allow converting a house at any time. [religion §4]
- RELG-036 When a year ends, the religion system shall pay each faith's clergy in the realm 1 gold for every 10,000 people of that faith into that faith's purse, which they spend on a house in every town of their faith first. [religion §4; config houses.tithe_gold_per_10000_people]
- RELG-037 While a faith is Restricted, the religion system shall let its clergy keep their houses but build no new ones. [religion §4, §5.2]
- RELG-038 When a faith becomes Persecuted, the religion system shall seize its clergy's purse. [religion §4]
- RELG-039 When a preacher has spent 10 years in a province with no house of his faith, the religion system shall found a step-1 house of his faith there. [religion §4, §6; config houses.preacher_founds_house_after_years]
- RELG-040 The religion system shall remove a house's pull when it is burned or sacked with its town, closed or converted under a Persecuted policy or a change of state faith; and halve it while it lacks clergy (fallow). [religion §4]
- RELG-041 The religion system shall make faith buildings, almshouses and hospitals the clergy's work places, and clergy the pool for preachers and Chaplains; whether clergy marry follows the faith (`clergy_marry`). [religion §4, §9; config faiths]

### 5.4 Communities and the Faith policy screen
- RELG-042 The religion system shall make every faith with at least 10 % of a province's people a community there. [religion §5.1, §19]
- RELG-043 The religion system shall count a community of a faith other than the ruler's as served when its faith is Tolerated or Restricted and it has a house of its own faith in the province, or of a kin faith if it is under 20 %, or needs none because it is rooted or layered. [religion §5.1]
- RELG-044 The religion system shall count a community as unserved when it has no such house or its faith is Persecuted. [religion §5.1]
- RELG-045 The religion system shall keep one policy row per faith present in the realm, with exactly one Established faith (the state faith). [religion §5.2]
- RELG-046 The religion system shall give *Wrong faith* to a province where a community of a faith other than the ruler's is a third or more of the people and is unserved, or is Restricted where it is the majority (unless protected). [religion §18, §19; config communities.wrong_faith_min_share]
- RELG-047 When a community's house is built and its faith Tolerated or Restricted, it converts, or a *Faith tolerance* charter is granted, the religion system shall end its *Wrong faith*. [religion §18]
- RELG-048 While a faith is Tolerated, the religion system shall keep its houses and let its clergy build new ones, at normal tax. [religion §5.2]
- RELG-049 When the realm tolerates a faith of 10 % or more of the realm, the religion system shall make Pious and clergy lords of the state faith waver once. [religion §5.2, §5.5]
- RELG-050 While a faith is Restricted, the religion system shall raise its share of the tax by 25 % (faith tax) and give the state faith +1 pull in every province it lives in. [religion §5.2, §19]
- RELG-051 When a faith is set to Restricted, the religion system shall make its lords waver one step; when set to Persecuted, two steps (disloyal). [religion §5.2, §5.5; config policies]
- RELG-052 While a faith is Persecuted, the religion system shall close its houses or hand them to the state faith (the realm's choice), take no tax from it, give the grievance *Persecuted* (counting as two) in every province where it is 10 % or more, double the state faith's pull where it lives, and set the engine flag `religious_persecution_active`. [religion §5.2]
- RELG-053 While a faith is Persecuted, the religion system shall make 2 % of its people flee each year as refugees, craftsmen and scholars first. [religion §5.2; config policies.persecuted.flee_per_year]
- RELG-054 While a faith is Persecuted, the religion system shall give every ruler of that faith on the realm's border the *Defend the faith* war aim against the realm. [religion §5.2]
- RELG-055 When the policy of a faith is changed, the religion system shall apply the change at the next New Year. [religion §5.2; config policies.change_takes_effect]
- RELG-056 When a faith is moved one step toward Persecuted, the religion system shall raise a spark for faith risings in the provinces where it lives; a step back is not a spark. [religion §5.2]
- RELG-057 Where a *Faith tolerance* charter stands, the religion system shall treat that faith as Tolerated in that province whatever the realm row says. [religion §5.2]
- RELG-058 When a *Persecuted* faith's policy changes away from Persecuted, the religion system shall end the *Persecuted* grievance. [religion §18]

### 5.5 Expulsion and Inquisition
- RELG-059 The religion system shall offer *Expel* as a one-off decision only on a Persecuted faith. [religion §5.3]
- RELG-060 When a faith is expelled, the religion system shall, within a year, send 70 % of its people out as refugees to the nearest realm where it is Established or Tolerated, keeping their class if a slot is free there; the rest convert or hide (hidden-believer floor still applies). [religion §5.3; config expulsion]
- RELG-061 When a faith is expelled, the religion system shall give the expelling realm its houses and the gold of its property, end that faith's *Persecuted* grievance, and give *Bloodshed* in every province it lived in. [religion §5.3]
- RELG-062 If an expulsion would leave the expelling realm better off in people or skills, then the religion system shall not allow that gain; the host realm gains both. [religion §5.3]
- RELG-063 The religion system shall offer the Inquisition decision only to monarchies whose Established faith is Catholic, and set the flag `inquisition_established`. [religion §5.4; config inquisition.allowed_for]
- RELG-064 While an Inquisition runs, the religion system shall charge its gold upkeep each year, remove the hidden-believer floor, add +1 state-faith pull in every province with a Restricted or Persecuted community, and make 1 % of the scholars and craftsmen in those provinces leave each year. [religion §5.4; config inquisition]
- RELG-065 The religion system shall let an Inquisition be closed again. [religion §5.4]

### 5.6 Lords and faith
- RELG-066 The religion system shall make a lord lose one loyalty step when his faith is set to Restricted (two for Persecuted), when he is Pious or clergy of the state faith and the realm tolerates a faith of 10 % or more of the realm, or when the state faith changes away from his. [religion §5.5]
- RELG-067 The religion system shall make a lord gain one loyalty step when the ruler builds or pays for a house of his faith in his land, when he is Pious or clergy of the state faith and the ruler takes over another faith's houses, or when the state faith changes to his. [religion §5.5]

### 5.7 Preachers
- RELG-068 The religion system shall give a realm one preacher of the state faith for each monastery or religious school of the state faith, one for every 5 houses of the state faith, one for each holy place held of its faith, and those granted by events and some inventions. [religion §4, §6, §8; config preachers]
- RELG-069 When a preacher is sent to a province, the religion system shall have him travel like an envoy and, once there, add 2 pull for the state faith each year. [religion §6]
- RELG-070 The religion system shall let a preacher go to the realm's own provinces, to a subject's provinces without permission, to a foreign realm with its ruler's leave (*Allow preachers*), or to a foreign realm without leave. [religion §6]
- RELG-071 While a preacher is in a foreign realm without leave, the religion system shall let that ruler expel or execute him each year; when that happens, it shall set `missionary_persecution` and give the sender the *Defend the faith* war aim. [religion §6; config preachers.foreign_without_leave_expel_chance_per_year]
- RELG-072 The religion system shall lose a preacher when he is killed or expelled abroad, recalled, or the state faith changes (all of them go). [religion §6]
- RELG-073 Where a faith rising is led by a preacher, the religion system shall treat a preacher of a Persecuted faith inside the realm as that rising's leader (it spreads twice as fast, rebellions 2.4). [religion §6]

### 5.8 Changing the state faith
- RELG-074 The religion system shall offer the decision *Adopt a faith* when that faith is at least 30 % of the capital province's people, or 40 % or more of the realm, or an event offers it. [religion §7; config state_faith_change]
- RELG-075 When a realm adopts a faith, the religion system shall at once make the old Established faith Tolerated (changeable from the next New Year), remove every preacher of the old faith, start with no preachers of the new faith until its houses exist, and move lords' loyalty as in RELG-066/067. [religion §7]
- RELG-076 When a realm adopts a faith, the religion system shall let the player keep the old faith's houses (serving it as a community) or take them over (pull flips, property gold paid, twice for Catholic and Orthodox monastic land, an "insult to faith" spark where each is taken). [religion §7]
- RELG-077 When a realm adopts a new state faith, the religion system shall let it close the other faith's schools or keep them. [religion §11]
- RELG-078 If a realm adopted a faith by decision less than 30 years ago, then the religion system shall refuse another adoption by decision; events are not limited. [religion §7; config state_faith_change.cooldown_years]
- RELG-079 After the event `peace_of_augsburg`, the religion system shall let rulers inside the Empire switch between Catholic and Protestant without the capital-share test. [religion §7]

### 5.9 Holy places
- RELG-080 The religion system shall keep a config list of holy places, each with its faiths, province and 1444 holder. [religion §8; config holy_places]
- RELG-081 While a realm holds a holy place and shares its faith, the religion system shall give it +1 preacher, the pilgrimage shrine there, and 200 more traders passing through it each year. [religion §8; config holy_place_effects.same_faith]
- RELG-082 While a realm holds a holy place of a faith it does not share, the religion system shall let every ruler of that faith use *Defend the faith* against it with that province as the prize. [religion §8, §11]
- RELG-083 Where a holder of another faith Tolerates the holy place's faith and has a house of that faith there, the religion system shall still bring the pilgrim traders. [religion §8; config holy_place_effects.pilgrims_still_come_if]
- RELG-084 The religion system shall make Amritsar appear as a holy place only when `sikh_panth_founded` has fired (from 1577). [religion §8; config]
- RELG-085 The religion system shall mark the holy place where each church head sits (Pope, Ecumenical Patriarch, a Caliph's claim, Dalai Lama from 1578) for the big-institutions design, and give church heads no rules here. [religion §8]

### 5.10 What each faith does differently
- RELG-086 Where the faith is Catholic, the religion system shall make clergy not marry, pay double gold for taking over Catholic monastic land, and offer the Inquisition. [religion §9]
- RELG-087 Where the faith is Protestant, the religion system shall add 0.5 pull for Protestant for each press and each school in the province, and let clergy marry. [religion §9; config faith_rules.print_and_school_pull]
- RELG-088 Where the state faith is Anglican, the religion system shall never make clergy lords waver over faith policy. [religion §9]
- RELG-089 The religion system shall make Hussite kin of Protestant once the Reformation starts, and at the end of the Reformation period (by 1620) merge its shares into Protestant, or into Catholic in provinces with no Protestant house. [religion §9; config faith_rules.merges_into_protestant]
- RELG-090 Where the ruler is Sunni, Shia or Ibadi, the religion system shall give a served Restricted community no *Wrong faith* even where it is the majority (protected communities). [religion §9]
- RELG-091 The religion system shall make a step-3 Hindu temple draw 150 traders a year. [religion §9]
- RELG-092 The religion system shall make each Sikh gurdwara shelter 1,000 homeless like an almshouse. [religion §9]
- RELG-093 The religion system shall make each Theravada house of worship give 20 student seats, like a small temple school. [religion §9]
- RELG-094 The religion system shall let a Vajrayana step-3 house or monastery be granted as a lord's land, its abbot being the lord. [religion §9]
- RELG-095 The religion system shall give `secular` no houses, allow a secular state only Tolerated or Restricted policies for other faiths, and after 1850 give `secular` 0.5 pull from each school in towns with factories and mass schooling. [religion §9; config faith_rules.secular_state]
- RELG-096 The religion system shall make Orthodox take-overs pay double for monastic land. [religion §7; config faiths.orthodox rules monastic_land]

### 5.11 Faith waves and events
- RELG-097 When an event applies `faith_wave`, the religion system shall start a wave with its id, faith, `from`, carriers, pull per carrier, reach per year, limit, and an end after `years` or with `until_period`. [religion §10.2; vocabulary-additions]
- RELG-098 When a year ends, the religion system shall grow each active wave outward by its reach per year in rings of provinces, never past its limit, and add its pull per carrier in each province reached. [religion §10.2, §14]
- RELG-099 The religion system shall count carriers as: presses (per press), schools (per school), towns (per town of market-town size or bigger), traders (per 100 passing), rule (province owned by the wave's `from` country), army (province where an army of `from` stands or passed this year), preachers (per preacher of that faith, added to his usual pull). [religion §10.2; config waves]
- RELG-100 The religion system shall never convert anyone by a wave alone; a wave only adds pull. [religion §10.2]
- RELG-101 The religion system shall provide the conditions `faith_policy`, `holds_holy_place`, `faith_wave_active` and the effects `faith_wave`, `faith_policy`, `preachers` to the event tree. [religion §18; vocabulary-additions]
- RELG-102 When an event applies `faith_policy`, the religion system shall set that row (tolerated, restricted or persecuted); Established is set only with the `religion` effect. [vocabulary-additions]
- RELG-103 When an event applies `preachers`, the religion system shall give the country that many extra preachers of the faith (default its state faith) for the years given (0 = permanent). [vocabulary-additions]
- RELG-104 The religion system shall read every `religion` and `religion_share` condition directly from the mix and the state faith, and let `spread` shift a share at once as now. [religion §11]
- RELG-105 The religion system shall set the engine flags `religious_persecution_active` (Persecuted), `missionary_persecution` (preacher killed or expelled) and `inquisition_established` (Inquisition). [religion §18]
- RELG-106 The religion system shall supply the ten new events and the six wave patches (protestant_reformation, council_of_trent, safavid_rise, sikh_panth_founded, futa_jallon_jihad, sokoto_jihad) to the event tree as additions in its own format. [religion §10.4, §18; event-tree-additions]

### 5.12 The start in 1444
- RELG-107 The religion system shall give each country its ruler's faith from `build/catalogue-faiths.json` (961 of 963 records), and each province the mix of the record that owns it, adjusted by the region overrides in config. [religion §2.3; config start]
- RELG-108 Where the people's majority faith differs from the ruler's, the religion system shall give the ruler's faith a 15 % share (court, garrison and town); a community not otherwise sized starts at 5 %. [config start]

### 5.13 Other systems' uses
- RELG-109 The religion system shall give faith risings the demand that their faith be Tolerated in the provinces they hold, or a house of worship there (a smaller demand rebels accept in a Talk). [religion §11, §18]
- RELG-110 The religion system shall open *Defend the faith* also when a neighbour Persecutes your faith in a province bordering yours, when your preacher is killed or expelled, and when a holy place of your faith is held by another faith. [religion §11]
- RELG-111 The religion system shall give schools a faith, and drive persecuted scholars abroad. [religion §11]
- RELG-112 The religion system shall supply diplomacy the facts "same faith" (better starting opinion) and the *Allow preachers* leave. [religion §11]
- RELG-113 The religion system shall count the country card's Faith % as the share of people of the state faith or a faith layered with it, and list Preachers among Abroad. [religion §1, §18]
- RELG-114 The religion system shall keep faith and tongue as two separate mixes and two separate grievances. [religion §11]
- RELG-115 The religion system shall have no faith meter, piety, fervour or unity score and no "convert province" button. [religion intro, §17]

### 5.14 What the player sees
- RELG-116 The religion system shall show the province card's Faith line with each faith's share and trend, and on tapping, the pulls this year per faith with their sources, each community's state, and how fast the mix is moving. [religion §1]
- RELG-117 The religion system shall show the country card's Faith row (state faith, %, other faiths, preachers, holy places) and open the Faith policy screen when tapped. [religion §1]
- RELG-118 The religion system shall colour the Faith lens at world zoom by majority faith, hatched where another faith's community is 30 % or more, with holy place icons; show houses as town sprites, preachers as walking figures and waves as a spreading tint at region zoom; and the Faith line at local zoom. [religion §12]

### 5.15 AI
- RELG-119 The religion system shall make the AI build a house of the state faith wherever that faith is below half, if gold allows, and a minority's house when that community has *Wrong faith* and its lords are wavering. [religion §13; config ai]
- RELG-120 The religion system shall make the AI tolerate any faith above 20 % of the realm unless zealous; zealous rulers restrict, and persecute only after an event or a war of religion. [religion §13]
- RELG-121 The religion system shall make the AI send preachers first to its own provinces where the state faith is under half, then abroad where it has leave. [religion §13]
- RELG-122 The religion system shall make the AI adopt a new faith only when an event offers it or the faith is above 60 % of the realm. [religion §13]

## 6. Commands

| Command | Who | Preconditions | Result | Events emitted |
|---|---|---|---|---|
| `SetFaithPolicy(country, faith, policy)` | player / AI / event | Faith present; not Established; secular state: only Tolerated/Restricted | Takes effect next New Year | `FaithPolicyChanged` |
| `SetPersecutedHouses(country, close|take_over)` | player / AI | — | Realm choice for Persecuted houses | — |
| `Expel(country, faith)` | player / AI | Faith Persecuted | 70 % leave within a year | `FaithExpelled` |
| `EstablishInquisition(country)` / `CloseInquisition` | player / AI | Catholic monarchy | Flag set / cleared | `InquisitionChanged` |
| `ConvertHouse(country, house, faith)` | player / AI | Own house | Take-over | `HouseTakenOver` |
| `BuildFaithBuilding(...)` | player / AI / clergy / lords | buildings' rules; minority house needs 10 % or charter | Building | (buildings) |
| `SendPreacher(country, preacher, province)` | player / AI | Preacher of state faith | Travels like envoy | `PreacherArrived` |
| `RecallPreacher` | player / AI | — | Preacher lost to the list | — |
| `AdoptFaith(country, faith, keep|take_over, schools keep|close)` | player / AI / event | Offer conditions; cooldown | State faith changes | `StateFaithChanged` |
| `ExpelForeignPreacher(country, preacher)` | player / AI | Foreign preacher without leave | Expelled or executed | `PreacherExpelled` |

## 7. Domain events

| Event | When | Payload | Consumed by |
|---|---|---|---|
| `FaithMixChanged` | Yearly move, movement, spread | province, shares | province, realm, events, map-presentation |
| `FaithPolicyChanged` | At New Year after a change | country, faith, old, new | province (grievances), realm (lords), rebellions (spark), warfare (war aim), events (flag) |
| `PersecutionSpark` | One step toward Persecuted | country, faith, provinces | rebellions |
| `HouseTakenOver` | Take-over | house, old, new faith, gold | rebellions (insult spark), realm (lords), treasury |
| `FaithExpelled` | Expel | country, faith, refugees, hosts | province (refugees), culture (trading peoples), rebellions (*Bloodshed*) |
| `StateFaithChanged` | Adopt | country, old, new | realm, audio?, events, government (reformed faith), diplomacy |
| `PreacherExpelled` | Foreign ruler acts | sender, host | warfare (war aim), events (flag) |
| `HolyPlaceChangedHands` | Owner change of a holy place | place, old, new holder | warfare, events, big institutions |
| `FaithWaveStarted` / `Ended` | Event effect / end | wave | events, map-presentation |
| `FlagSet` | §5.11 | flag id, country | events |

## 8. Policies (reactions to other contexts)
- When a province changes owner (warfare / diplomacy), then RELG recomputes holy places held and the ruler-faith pulls.
- When an event applies `religion`, `spread`, `faith_wave`, `faith_policy` or `preachers` (events), then RELG applies it.
- When refugees, settlers, migrants or soldiers move (province), then RELG shifts the mix by headcount.
- When a building is built, burned, sacked or loses clergy (buildings / province), then RELG updates pulls and served status.
- When a period ends (events: `p_protestant_reformation`, by 1620), then RELG merges Hussite shares.
- When `peace_of_augsburg` fires, then RELG enables cuius regio.
- When a revolutionary regime seizes church land or ends the state faith (revolutions), then the religion events `revolution_and_the_church` and `separation_of_church_and_state` may follow (their requirements may read `revolutionary_regime`).
- When diplomacy grants *Allow preachers*, then RELG marks the preacher's leave.

## 9. Monthly turn
- Yearly (at the same time as traders and trade balance, province stats 17): pulls, hold, the 3 % move, small shares, hidden-believer timers, tithes, persecution flight (2 %), Inquisition flight (1 %), wave growth, preacher founding timers, Hussite merge check.
- At New Year: pending faith-policy changes take effect.
- Monthly: preacher travel (as envoys), expulsion progress (within 12 months).
- Reads first: province population and classes, buildings and clergy, traders passing (trade), owners and lords (realm), active periods (events).

## 10. Configuration

All numbers are first-pass placeholders (religion.yaml header) except the four defaults kept on 16 October (still config values).

| Key | Meaning | Value in the design | Placeholder? | Config file |
|---|---|---|---|---|
| `faiths.<id>` | family, house names, clergy_marry, carried_by_trade, rooted, layered, rules | per faith | yes | religion.yaml |
| `relations.layered_group` | shinto, mahayana, confucian_ritual, daoist | | yes | religion.yaml |
| `relations.traditional_layers_after_years` | 100 | | yes | religion.yaml |
| `relations.kin_serves_community_below` | 0.20 | | yes | religion.yaml |
| `mix.max_faiths_per_province` | 3 | | no (storage) | religion.yaml |
| `mix.drift_per_year` | 0.03 | kept 16 Oct | yes | religion.yaml |
| `mix.hold_per_share` / `rooted_hold_per_share` | 4 / 8 | | yes | religion.yaml |
| `mix.rooted_sacred_places_pull` / `_min_share` | 1 / 0.25 | | yes | religion.yaml |
| `mix.vanish_below` | 0.01 | | yes | religion.yaml |
| `mix.hidden_believers_floor` / `_years` | 0.02 / 100 | | yes | religion.yaml |
| `pull.house_steps` | [1, 1.5, 2] | | yes | religion.yaml |
| `pull.landmark_house` | here 3, rings 3, there 0.5 | | yes | religion.yaml |
| `pull.minority_house`, `monastery`, `pilgrimage_shrine` | 0.5, 1, 1 | | yes | religion.yaml |
| `pull.fallow_multiplier` | 0.5 | | yes | religion.yaml |
| `pull.preacher`, `school_of_faith`, `capital`, `lord_of_faith` | 2, 0.5, 1, 0.5 | | yes | religion.yaml |
| `pull.traders_per_100` / `traders_max` | 0.5 / 2 | | yes | religion.yaml |
| `pull.restricted_escape_tax`, `chaplain_multiplier`, `persecution_multiplier`, `inquisition` | 1, 2, 2, 1 | | yes | religion.yaml |
| `houses.minority_house_needs_share` | 0.10 | | yes | religion.yaml |
| `houses.preacher_per_monastery_or_religious_school` | 1 | | yes | religion.yaml |
| `houses.tithe_gold_per_10000_people` | 1 | | yes | religion.yaml |
| `houses.community_founds_own_house` | min_share 0.20, every_years 20 | not in design (OQ-RELG-6) | yes | religion.yaml |
| `houses.preacher_founds_house_after_years` | 10 | | yes | religion.yaml |
| `houses.convert_cost_share_of_build` | 0.5 | | yes | religion.yaml |
| `houses.take_over_gold` | per_step 20, monastic_land_multiplier 2 | | yes | religion.yaml |
| `houses.take_over_spark` / `take_over_old_faith_lords` | insult_to_faith / −1 | | yes | religion.yaml |
| `communities.min_share` | 0.10 | kept 16 Oct | yes | religion.yaml |
| `communities.wrong_faith_min_share` | 0.33 | kept 16 Oct | yes | religion.yaml |
| `policies.tolerated.pious_lords_waver_if_faith_share_of_realm` | 0.10 | | yes | religion.yaml |
| `policies.restricted` | faith_tax 0.25 (kept 16 Oct), new_houses false, wrong_faith_where_majority true, lords −1 | | yes | religion.yaml |
| `policies.persecuted` | close_or_take_over, flee 0.02, grievance persecuted weight 2, lords −2, flag, war aim | | yes | religion.yaml |
| `policies.change_takes_effect` / `harsher_step_is_spark` | next_new_year / true | | yes | religion.yaml |
| `expulsion` | leave_share 0.70, within_months 12, bloodshed true | | yes | religion.yaml |
| `inquisition` | allowed_for catholic + [monarchy, elective_monarchy, constitutional_monarchy]; upkeep 10 gold/year; skilled leave 0.01; flag; removes floor | | yes | religion.yaml |
| `preachers` | per_houses_of_state_faith 5, per_holy_place_held 1, upkeep 1 gold/year, expel chance 0.25/year, flag | | yes | religion.yaml |
| `state_faith_change` | capital 0.30, realm 0.40, cooldown 30, cuius regio after peace_of_augsburg for catholic/protestant | | yes | religion.yaml |
| `lords` | +1 / −1 / +1 / −1 / +1 | | yes | religion.yaml |
| `faith_rules.*` | print_and_school 0.5/0.5; monastic ×2; crown heads church; Hussite merge (latest 1620, else catholic); protected communities; temple town 150; langar 1000; monastery school 20; lama lords; secular (after 1850, 0.5, needs mass_literacy_schooling) | | yes | religion.yaml |
| `holy_places[]` | 16 places with faiths, province, 1444 holder | | yes | religion.yaml |
| `holy_place_effects` | same faith: preachers 1, pilgrims 200; other faith: war aim; pilgrims still come if tolerated + house | | yes | religion.yaml |
| `waves` | carriers list; town_min_size market_town; max_active 8 | | yes | religion.yaml |
| `ai` | build below 0.5; tolerate above 0.20; zealous restrict; persecute only after event or religious war; adopt above 0.60 | | yes | religion.yaml |
| `start` | source catalogue-faiths.json; ruler faith share 0.15; community default 0.05; 8 region overrides | | yes | religion.yaml |

## 11. Seams

| Other context | Direction | Pattern | What crosses |
|---|---|---|---|
| province | partnership | Shared Kernel | Faith mix (top three), clergy class, Chaplain, *Faith tolerance* charter, *Wrong faith* (redefined) and *Persecuted* grievances, refugees and settlers; §18 changes to 4.3, 6.5, 12.1 |
| buildings | upstream | Customer–Supplier | Faith buildings 7.5 (house of worship steps, minority house, monastery, religious school, pilgrimage shrine), converting (5.4), burning (5.3), who builds (6.1, 6.2), landmarks (8); RELG supplies pull and serving rules |
| realm | downstream | Customer–Supplier | Faith % and Preachers on the country card; lords' faith loyalty steps; tax (faith tax); treasury gold from take-overs |
| rebellions | downstream | Customer–Supplier | Sparks (harsher policy step, insult to faith), faith risings' demand, preachers as leaders, *Bloodshed* |
| warfare | downstream | Customer–Supplier | *Defend the faith* openings (persecution on border, preacher killed, holy place held) |
| diplomacy | downstream | Published Language | *Allow preachers* leave; same faith opinion; preachers travel like envoys |
| events | partnership | Published Language | Faith ids (+3), `religion`/`religion_share`, new conditions and effects, faith waves, flags, 10 new events, 6 patches, periods |
| government | downstream | Customer–Supplier | State faith, clergy lords, holy places held as facts; "ruler takes a reformed faith"; Inquisition limited to monarchies |
| culture | partnership | Partnership | Trading peoples of another faith; persecution/expulsion moves them; separate mixes |
| trade | partnership | Customer–Supplier | Traders passing feed Islamic pull; pilgrims count as traders passing (+200); Hindu temple +150 traders; refugees carry crafts |
| research | downstream | Customer–Supplier | Schools have a faith; persecuted scholars leave; presses for Protestant pull and waves |
| recruiting | downstream | Conformist | Chaplain commander's "Beloved" trait reads the army's faith share |
| subjects | downstream | Conformist | Preachers enter subjects without permission |
| revolutions | upstream | Customer–Supplier | Faith revolutions use `faith_wave`; regimes may lead to religion's church events |
| scenario-setup | downstream | Published Language | 1444 ruler faith and province mix |
| map-presentation | downstream | Published Language | Faith lens, sprites, preachers, wave tint |
| time-and-turns | upstream | Conformist | Yearly slot with traders and trade balance; New Year policy changes |

## 12. AI

RELG-119 to RELG-122: houses where the state faith is below half (gold allowing) and a minority's house when it has
*Wrong faith* and wavering lords; tolerate any faith above 20 % unless zealous (zealous restrict; persecute only
after an event or a war of religion); preachers first to own provinces under half, then abroad with leave; adopt
only when an event offers or above 60 % of the realm. Event options carry `ai: {base: n}` weights (event tree).

## 13. Open questions and contradictions

- **OQ-RELG-1** *Wrong faith* threshold: §5.2 gives Tolerated faiths *Wrong faith* "where unserved" (communities start at 10 %), while §18 and the 16 Oct defaults say a third. This spec follows the later decision (a third); confirm that unserved communities from 10 % to a third take no grievance.
- **OQ-RELG-2** Units of hold: "share × 4" only gives the stated speed (half the distance in about 40 years) if shares are fractions (0–1). Confirm. Also the East Bengal example's "target" (Sunni 54 %, Hindu 31 %, traditional 15 %) is the settled point (pulls only), not the yearly formula's target, which includes hold.
- **OQ-RELG-3** The province card example in §1 does not follow the rules: Protestant pull "Reformation wave (2 presses), 1 church = 4.0" would be 3 + 1.5 = 4.5 (or 5.5 with the Protestant press rule), and "about 1 point a year" is far more than the 3 % move gives (about 0.2 points). Which numbers are right?
- **OQ-RELG-4** Expulsion: design and config say 70 % leave; the event `expulsion_of_the_moriscos` moves 90 %.
- **OQ-RELG-5** `court_conversion_islam` tests `religion_share where: $ruler ≥ 0.3` (realm), while its note and the Adopt rule speak of the capital being a third Muslim; `court_conversion_christian` uses 15 % Protestant.
- **OQ-RELG-6** Config `houses.community_founds_own_house {min_share 0.20, every_years 20}` has no rule in the design.
- **OQ-RELG-7** Config-only numbers with no design text: Inquisition upkeep 10 gold (design: "as a court with officials"), preacher upkeep 1 gold a year, foreign preacher expel chance 0.25 a year, take-over gold 20 per step, waves max_active 8.
- **OQ-RELG-8** Inquisition: "monarchies" are given as event-tree values `[monarchy, elective_monarchy, constitutional_monarchy]`; government v2 has 27 forms. Which forms qualify?
- **OQ-RELG-9** Government's reform "the ruler takes a reformed faith" (prince-bishopric/order → feudal realm) is not a term here. Which faith changes count?
- **OQ-RELG-10** §18 changes not adopted: province-stats 12.1 still defines *Wrong faith* as "Most people don't share the ruler's faith" and has no *Persecuted*; 4.3 and 6.5 not updated; country-stats 4 and 5.5; rebellions 2.3/5.1; warfare 10.1; event-tree `enums.yaml` lacks hussite, jain, asian_traditional; vocabulary, events, patches and flags not merged.
- **OQ-RELG-11** The religion events' effects use stats `stability`, `legitimacy`, `unrest`, `income`, `trade_power`, `literacy` (event-tree modifiers), which this design's "count what you can point at" rule and the country stats may not have. How do they map?
- **OQ-RELG-12** Catalogue mapping: 3 texts unmapped ("Messianic movements (Hurufiyya, Nurbakhshiyya)", "Mixed", "Unknown"), 2 records (wokou, guanahatabey) with no state faith, and 2 records mapped to `minor_other`, which is not a faith id.
- **OQ-RELG-13** Persecuted houses "closed, or taken over (you choose per realm)": one choice for the realm, or per Persecuted faith?
- **OQ-RELG-14** Hussite merge: "at the end of the Reformation period (by 1620)" — config `merge_at_end_of: p_protestant_reformation, merge_latest_year: 1620`. If the period ends after 1620, which wins (assumed the earlier)?
- **OQ-RELG-15** Secular pull: design needs "towns with factories and mass schooling"; config needs innovation `mass_literacy_schooling` and has no factory condition.
- **OQ-RELG-16** Amritsar: config `earliest: 1577`, buildings 7.5 "from the 1580s". The Temple of the Tooth "follows the relic to Kandy (1590s)": by which event or rule?
- **OQ-RELG-17** Fourth faith arriving replaces the smallest only if larger; culture's fourth tongue replaces the smallest always. One storage rule, two behaviours.
- **OQ-RELG-18** Buildings 7.5 says monks "travel out from here as missionaries" and "pulling one [minority house] down is persecution"; religion uses preachers and a policy. Align wording.
- **OQ-RELG-19** "Adopt a faith … you start with none [preachers] of the new faith until houses of it exist" vs preachers from monasteries, schools and holy places: are holy-place and event preachers also withheld?
- **OQ-RELG-20** Holy place provinces are names to be bound when the catalogue is mapped onto the map (gap list item 25); not yet bound.
- **OQ-RELG-21** Tolerated lords waver "once when you tolerate a faith of 10 % or more of the realm": does a faith that grows past 10 % while already Tolerated trigger it?
- **OQ-RELG-22** "Some inventions" give preachers (§6): which is not stated.
- **OQ-RELG-23** Holy places held by the Sharifs "under the Mamluks" (config holder mamluk): who holds Mecca when the subject and overlord differ?

## 14. Traceability

| Requirement | Feature file | Scenario |
|---|---|---|
| RELG-001 … RELG-008 | faiths.feature | Faith list; families; local names; layered; rooted; kin |
| RELG-009 … RELG-027 | faith-mix.feature | Pull sources; hold; East Bengal; no pull no change; small shares; fourth faith; hidden believers; movers |
| RELG-028 … RELG-041 | faith-buildings.feature | Pull per building; minority house; take-over; tithes; preacher founds house; losing pull; clergy |
| RELG-042 … RELG-058 | communities-and-policy.feature | Communities; served; Wrong faith; policies; timing; sparks; charter |
| RELG-059 … RELG-065 | expulsion-and-inquisition.feature | Expulsion; Inquisition |
| RELG-066, RELG-067 | communities-and-policy.feature | Lords and faith |
| RELG-068 … RELG-073 | preachers.feature | Counting preachers; sending; leave; losing |
| RELG-074 … RELG-079 | state-faith.feature | Adopt; keep or take over; cooldown; cuius regio |
| RELG-080 … RELG-085 | holy-places.feature | Holy places |
| RELG-086 … RELG-096 | faith-rules.feature | One rule per faith |
| RELG-097 … RELG-106 | faith-waves-and-events.feature | Waves; carriers; vocabulary; flags; new events |
| RELG-107, RELG-108 | faiths.feature | Start in 1444 |
| RELG-109 … RELG-115 | religion-uses.feature | Risings; war aims; schools; diplomacy; Faith %; separation; no meters |
| RELG-116 … RELG-118 | religion-view.feature | Cards; lens |
| RELG-119 … RELG-122 | religion-ai.feature | AI |
