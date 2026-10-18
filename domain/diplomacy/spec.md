# Diplomacy (DIPL)

## 1. Purpose and scope

This context decides how countries deal with each other short of fighting, and how they get into and out of
wars. It also owns the **relation model** (the nine relation types, the three slots per pair, the exclusivity
matrix, the relation actions and the 1444 relations dataset), because diplomacy only ever moves a pair between
those types or adds a fact. Diplomacy adds no relation type of its own.

**In scope**
- The relation model: nine relation types, three slots per pair, implied and default stance, exclusivity
  matrix, conflict resolution, diplomatic facts, the relation actions and their `requires` / `ends`, origin
  and dates, the 1444 dataset and its validation.
- Envoys: seats, who an envoy is, the road, missions, residents, envoys held or lost.
- The pair ledger of ties and wrongs, standing and its words, the two world-wide counts (Oaths broken, Lands
  taken) as reasons.
- The reasons count: the one way every yes or no is decided, and the one-month delay of every answer.
- All diplomatic actions (section 6 of the design): alliances and calls to arms, marriages and pretenders,
  demands, passage, trade pacts and embargoes, pledges and sworn peace, subjects by agreement (the asking
  only), courting a foreign lord, gifts and visits, insults and rivals, funding rebels.
- War aims: how a country comes to hold each one; declaring war; who may declare.
- Truce length, the envoy carrying a peace, many-sided peace.
- Leagues against a conqueror.
- Era changes to diplomacy, 1444 to 31 August 1939; mobilisation pacts.
- The mapping of the event tree's `opinion`, `trust`, `notoriety` and `relation` terms, and three new effects.
- The diplomacy AI (posture, negotiation level, what it does each month).
- The diplomacy lens, the country diplomacy card, the envoys strip, the war declaration sheet.

**Not in scope (owned by …)**
- Kinds of subject, loyalty of subjects, folding in, independence wars, what a subject owes: **subjects**.
  Diplomacy only carries the two asks that create a subject by agreement (6.7).
- What war aims win, peace voices, peace terms, battles: **warfare**.
- Faith, tolerance, persecution, which faiths are "same" or "hostile": **religion**.
- Culture groups, accepted cultures, homelands: **culture**.
- Government forms, regency rules beyond the war limit, caps on officials: **government**.
- Lords, loyalty steps of lords, ruler, heirs, the Oaths broken and Lands taken stats themselves: **realm**.
- How armies move through granted land: **troop-movement**. Sea-zone travel times: **naval**.
- Traders, tolls, routes: **trade**. Grievances, riots, armed rebels: **rebellions**. Revolution camps,
  émigré courts: **revolutions**.
- The Empire, the Papacy, the tributary system and the League of Nations as institutions: no context yet
  (gap list item 8).

## 2. Sources

Newest decision first.
1. `diplomacy/diplomacy-design.md` version 2, including "Decided by Leroy (16 Oct)" (no preview, answers a turn
   later; envoys are officials; leagues at a fixed threshold per era; passage unlocked by G8 then asked for;
   funding rebels allowed as a secret action; mobilisation pacts answer automatically, shown as an event),
   sections 1–19.
2. `diplomacy/diplomacy-rules.json` (config sketch; its `$comment` still says "v1").
3. `diplomacy/README.md`.
4. `country-relations/relation-types.md`, `country-relations/config/relation-rules.json`,
   `country-relations/README.md`.
5. `country-relations/gameplay-examples.md` (seven worked examples), `country-relations/tools/relations_engine.py`
   and `country-relations/tests/test_rules.py` (27 tests: the shared contract for the game engine).
6. `country-relations/uncertainty-report.md`, `country-relations/data/relations-1444.json` (280 relations,
   19 facts, reference date 1444-11-11).
7. `planning/gap-lists.md` "Decisions already made" (one month per turn, now one week per turn by X-18; campaign ends 31 August 1939; keep
   designs multiplayer-friendly: deterministic, orders as data).
8. Read for seams only: warfare-design 10, country-stats-design 9 and 10, research-tree (G5, G8, T14),
   troop-movement-design 5.3 and 15, rebellions-design, revolutions-design 7.1, government-design 3,
   event-tree `data/vocabulary.yaml`.

## 3. Ubiquitous language

| Term | Meaning | Not to be confused with |
|---|---|---|
| Relation type | One of nine: Alliance, Friendly, Neutral, Rival, Hostile, At War, Subject, Overlord, Truce | A diplomatic fact |
| Slot | One of three per pair: hierarchy (Subject), state (At War, Truce, Alliance), stance (Friendly, Neutral, Rival, Hostile, one per perspective) | |
| Perspective | One direction of a pair, A toward B | |
| Stance | A country's Friendly / Neutral / Rival / Hostile toward another | Standing (a number) |
| Implied stance | The stance read when none is stored: Hostile at war, Friendly when allied, otherwise the default (Neutral) | A historical claim of neutrality |
| Overlord | The target side of a Subject record; derived, never stored | |
| Diplomatic fact | Optional pair-level record (`royal_marriage`, `dynastic_claim`, `territorial_claim`, `trade_agreement`, `secondary_tribute`, `shared_ruler`, `membership`, `religious_authority`, and the proposed `protection_pledge`) that only feeds modifiers | Relation type |
| Contested object | The named throne, province, trade city, route, sphere or office a rivalry is about | |
| Origin | `historical_start` (dataset) or `gameplay` (made in play) | |
| Envoy | An official (or, for countries without officials, a lord or elder) sent abroad on one mission or as a resident | A trader / merchant |
| Envoy seat | One place for an envoy abroad; the number of seats is the hard limit on missions at once | |
| Mission | One action carried by an envoy to one court; decided on arrival | Residence |
| Resident | An envoy who stays at one court until recalled (needs G8) | Courtesy visit |
| Courtesy visit | An envoy who goes, stays one month and comes back, for a tie | |
| Held | An envoy kept abroad by the host; comes back with the peace | |
| Ledger | Per ordered pair, at most 12 named entries (ties and wrongs) with weight and fade or condition | |
| Tie | A positive ledger entry | Subject tie (a subject relation); a subjects "tie" label (subjects context) |
| Wrong | A negative ledger entry | |
| Standing | The ledger total of one country toward another, −200..+200; the event tree's `opinion` | Stance |
| Standing word | Close, Warm, Cool, Cold, Bitter | |
| Fade | A weight shrinking in equal yearly steps to zero over the stated years | |
| Old matters | The merged entry holding a ledger's smallest entries once it would exceed 12 | |
| Oaths broken | Country stat (last 30 years); −10 in every count that relies on your word | |
| Lands taken | Country stat (last 20 years); drives leagues | |
| Reasons count | The list of named reasons with numbers the asked country adds up; over zero is yes | |
| Base | The negative reason that says how big an ask is | |
| Answer letter | Yes or no with the full reasons list, delivered a month after the answer is given | Preview (there is none) |
| Soldiers under arms | The strength measure (realm stat); allies who would come count at half | |
| Full multiple | The whole number of times one side's soldiers contain the other's | |
| Binding ask | An ask that binds them to you: alliance, pledge, protection (offer overlordship, ask for protection) | |
| Call to arms | A request to an ally, pledger or league member to join a war; defensive or offensive | Calling a lord (warfare) |
| Defensive call / Offensive call | Call when war was declared on you / when you declared | |
| Separate peace | An ally's own peace with the enemy when over half its own peace voices say peace | |
| Pretender | A named relative at a court with a right to another throne | A claim fact alone |
| Demand | A named ask carried by an envoy, the step before war | Peace term |
| Provoked war | A war against a country that refused your demand | |
| Passage | Permission for your armies to cross a country at peace, for 2 years, revocable | Trade access |
| Trade pact | Traders of both pay no tolls and no extra fees in each other's provinces | Peace term "Open the roads" |
| Embargo | Traders of both may not cross each other's land or ports | |
| Pledge (protection pledge) | A one-way promise to defend a country if anyone declares war on it | Alliance |
| Sworn peace | A Truce of 10 years made without a war | Truce after a war |
| Offer overlordship / Ask for protection | The two envoy asks that create a subject by agreement | Pledge protection |
| Court a lord | An envoy working on a foreign Wavering or Disloyal lord | |
| Fund rebels | A secret envoy action paying for a revolution brewing in another country (X-10) | |
| War aim | This game's reason for war (warfare 10.1); held from things in the world | |
| League (against X) | Countries bound to a defensive call against one conqueror X only | Alliance; collective institution |
| League threshold | Lands taken at which a league can form; per era | |
| Mobilisation pact | From era VI, an alliance marked so a defensive call is answered automatically | |
| Many-sided peace | From era III, one peace signed at once by every warring country, each by its own voices | |
| Horizon | The countries an AI considers for its actions | |
| Posture | The catalogue's diplomacy posture: Mixed, Bandwagoner, Opportunist, Isolationist, Balancer, Client seeker, Hegemon seeker | |
| Negotiation level | very high, high, moderate, low, very low (and unknown) | |
| Trust / Notoriety | Event-tree statistics, read-only here, derived from Oaths broken / Lands taken and Notorious deeds | |

## 4. Domain model

### Aggregates

**RelationGraph** (identity: the world; one per game)
- Holds every stored relation record (type, source, target, direction mutual / one_way / directed,
  `subject_kind`, `autonomy`, `start_date`, `expires_on`, `historical_end`, `origin`, `locked`, `note`) and
  every diplomatic fact record.
- INV-DIPL-1: Overlord is never stored.
- INV-DIPL-2: At most one state relation (At War, Truce, Alliance) per unordered pair.
- INV-DIPL-3: At most one stance per perspective; a mutual stance record fills both perspectives.
- INV-DIPL-4: A country has at most one direct overlord; chains allowed; cycles forbidden.
- INV-DIPL-5: No pair holds a combination marked ✗ in the exclusivity matrix; combinations marked N carry a note.
- INV-DIPL-6: No relation of a country with itself.
- INV-DIPL-7: A mutual relation is stored once per pair (not again in reverse); a Subject is stored from the
  subject's side.
- INV-DIPL-8: Every Rival names a contested object.
- INV-DIPL-9: Gameplay records have origin `gameplay` and are never written back into the dataset.

**Envoy corps** (identity: country)
- Holds seats (count), envoys abroad (each: official or lord, type, years served, mission or residence,
  destination, send turn, arrival date, return date, status on road / at court / resident / held).
- INV-DIPL-10: Envoys abroad never exceed envoy seats when an envoy is sent.
- INV-DIPL-11: An envoy carries exactly one mission or one residence.

**Ledger** (identity: ordered pair holder → other)
- Holds named entries (kind tie / wrong, name, weight, fade years or condition, created date).
- INV-DIPL-12: At most 12 entries; the smallest are merged into "Old matters".
- INV-DIPL-13: Standing = sum of entries plus the stance/state line, on the −200..+200 scale.

**League** (identity: target country X)
- Holds members, formed date, origin (threshold or event).
- INV-DIPL-14: A league formed by threshold has at least two members.
- INV-DIPL-15: No member is X's ally, subject or overlord, or at war with X, when it joins.

**Pending answer** (identity: asker, asked, action, turn given)
- Holds the reasons list, the total and the answer; delivered a month after it is given.

### Entities and value objects

**Relation types (relation-types.md)**

| Type | Layer | Direction | Established by | Ended by | Effects |
|---|---|---|---|---|---|
| Alliance | state | mutual | `form_alliance`, peace term | `break_alliance`, `declare_war`, `make_subject`, country destroyed; never expires | Standing line +50; an ally cannot be attacked until the alliance is broken; AI never targets an ally |
| Friendly | stance | mutual or one-way | `improve_relations`, royal marriage, gift, event | `insult`, `set_rival`, `declare_war`, event, decay (240 months) | +30 line |
| Neutral | stance | mutual or one-way | `declare_neutrality`, decay; stored only when documented | any stance change | none |
| Rival | stance | mutual or one-way | `set_rival` (contested object), event, peace leaving a claim open | `drop_rival`, contested object resolved, destruction; minimum 120 months before change | −30 line; AI war target; wars against it please lords (realm) |
| Hostile | stance | mutual or one-way | `insult`, border raid, `break_truce`, event, war ending without reconciliation | `improve_relations`, reconciliation, decay to Rival after 120 months | −75 line; blocks `form_alliance`; border-raid events |
| At War | state | mutual | `declare_war`, joining as ally or subject, `independence_war`, event | `make_peace`, `white_peace`, destruction | −100 line; Hostile implied; trade between the pair stops |
| Subject | hierarchy | directed subject → overlord | peace term, diplomatic vassalisation, inheritance union, event | independence war won, `release_subject`, annexation, overlord destroyed, event | owned by subjects |
| Overlord | hierarchy | derived | — | — | read from Subject |
| Truce | state | mutual | `make_peace`, `white_peace`, sworn peace, event | expiry, `break_truce`, `form_alliance`, `make_subject` | −10 line; war blocked until expiry |

**Exclusivity matrix** (pair-level, regardless of direction; ✗ forbidden, R redundant (warning), N allowed only
with a note, · allowed, slot = only from opposite perspectives)

|  | Alliance | Friendly | Neutral | Rival | Hostile | At War | Subject | Truce |
|---|---|---|---|---|---|---|---|---|
| **Alliance** | | R | ✗ | N | ✗ | ✗ | ✗ | ✗ |
| **Friendly** | R | | slot | slot | slot | ✗ | R | · |
| **Neutral** | ✗ | slot | | slot | slot | ✗ | ✗ | · |
| **Rival** | N | slot | slot | | slot | · | N | · |
| **Hostile** | ✗ | slot | slot | slot | | · | N | · |
| **At War** | ✗ | ✗ | ✗ | · | · | | ✗ | ✗ |
| **Subject** | ✗ | R | ✗ | N | N | ✗ | | ✗ |
| **Truce** | ✗ | · | · | · | · | ✗ | ✗ | |

Notes carried by the rules: Alliance + Rival "allies may compete over a contested object"; Subject + Hostile
"a disloyal subject"; Subject + Rival "a subject competing with its overlord for power"; Subject + At War "a
subject that fights its overlord has left the hierarchy: record the independence war".

**Precedence** (same tick): At War > Truce > Subject > Alliance > Hostile > Rival > Friendly > Neutral.

**Relation actions** (relation-rules.json `actions`, engine behaviour)

| Action | Requires | Ends | Creates / sets |
|---|---|---|---|
| `declare_war` | no Alliance, no Truce; actor not the target's subject; (engine) target not the actor's subject | Friendly, Neutral | At War; Hostile where no stance is stored |
| `independence_war` | actor is a subject | Subject | At War; both Hostile; on overlord victory restore the subject |
| `make_peace` | at war | At War | Truce (or Subject when vassalisation is a term); an implied Hostile becomes an explicit Hostile |
| `white_peace` | at war | At War | Truce; Hostile becomes Rival (note: contested object left open) |
| `extend_truce` | a Truce | — | later `expires_on` |
| `break_truce` | a Truce | Truce | both Hostile; penalty |
| `form_alliance` | no Hostile stance either way, not at war, not a subject pair | Truce, Neutral (and the redundant Friendly) | Alliance |
| `break_alliance` | an Alliance | Alliance | penalty |
| `make_subject` | no other overlord, no cycle | Alliance, Truce, At War, Neutral (and redundant Friendly) | Subject; note when antagonistic |
| `release_subject` | a Subject | Subject | both Friendly |
| `set_rival` | a contested object | Friendly, Neutral | Rival |
| `insult` | — | Friendly | Hostile |
| `improve_relations` | — | — | one step Hostile → Rival → Neutral → Friendly |
| `truce_expires` | — | Truce | — |
| `country_destroyed` | — | all its relations | — |

**Subject kinds in the relation data** (eight values; mapped onto the six subject kinds by the subjects context)

| Kind | Own diplomacy | Joins overlord's wars |
|---|---|---|
| vassal | yes | defensive |
| tributary | yes | never |
| personal_union | no | always |
| estate | no | always |
| appanage | no | always |
| fief | yes | never |
| colony | no | always |
| frontier_commandery | yes | never |

Autonomy levels: very_low, low, moderate, high, very_high.

**Diplomatic facts**: `royal_marriage` (mutual), `dynastic_claim` (claimant → claimed), `territorial_claim`
(claimant → holder), `trade_agreement` (mutual or one-way), `secondary_tribute` (payer → receiver),
`shared_ruler` (mutual; cannot declare war on each other), `membership` (member → institution; owned by the
catalogue hierarchy), `religious_authority` (follower → authority); proposed by diplomacy: `protection_pledge`
(protector → protected).

**Envoy seats**

| Source | Seats |
|---|---|
| Start | 1 |
| Realm of more than 10 provinces | +1 (lost when the realm shrinks below 10) |
| G5 Royal chancery | +1 (never lost) |
| G8 Resident ambassadors | +1 (never lost) |
| A national strength | may add 1 |

**Official type bonus** (a reason in the count)

| Official type | Better at | Bonus |
|---|---|---|
| Judge | Peace offers, demands, sworn peace | +10 |
| Customs officer | Trade pacts, passage | +10 |
| Chaplain | Marriages with a ruler of the same faith; anything asked of a country of the same faith | +10 |
| Steward, Tax collector | Gifts and loans | the gift counts 25 % more |
| Marshal, Warden, Muster master | Alliances and calls to arms | +10 |
| Schoolmaster | Marriages; courting a foreign lord | +10 |
| Master of works | Nothing extra | 0 |

Years served: +5 more at 10 years. Resident at one court for 5 years: +5 to anything asked of that court.

**Ties**

| Tie | Weight | Lasts |
|---|---|---|
| Married houses (a living marriage between the ruling families) | +15 each, up to +30 (era IV: +10) | While the marriage lives |
| Gift | +1 per 5 gold, up to +30 per gift (era VII: half) | Fades over 10 years |
| Courtesy visit | +15 | Fades over 5 years |
| Resident envoy | +5 each season, up to +30 | While resident; then fades over 5 years |
| Fought side by side | +15 | Fades over 20 years |
| Answered our call | +20 | Fades over 20 years |
| Share a rival (both Rival or Hostile toward the same country) | +15 | While true |
| Same faith (religion decides) | +10 | While true |
| Same culture group (culture decides) | +5 | While true |
| Trade pact | +10 | While in force |
| Pledged to protect us | +15 | While in force |
| Freed us (won *Free a people* or *Break a subject* for them) | +40 | Fades over 30 years |
| Event ties | As the event says | As the event says (default 10-year fade) |

**Wrongs**

| Wrong | Weight | Lasts |
|---|---|---|
| Took our land | −10 per province | Fades over 20 years |
| Broke a truce with us / broke our alliance | −40 | Fades over 30 years |
| Abandoned us (refused a defensive call) | −30 | Fades over 30 years |
| Insulted us | −20 | Fades over 10 years |
| Threatened us (a demand made to us, accepted or not; or a no-aim war by a neighbour) | −15 | Fades over 10 years |
| Holds a claim on our land or throne (`territorial_claim` / `dynastic_claim`) | −20 | While the claim stands |
| Courted our lord (if discovered) | −25 | Fades over 10 years |
| Embargo against us | −15 | While in force |
| Different faith, where religion says the faiths are hostile | −10 to −25 | While true |
| Notorious deed | −10 × notoriety added | Fades over 30 years |
| Stirred revolt in our land (rebel funding caught) | −50 | Fades over 20 years |

**Stance / state line**: Alliance +50, Friendly +30, Neutral 0, Rival −30, Hostile −75, At War −100, Truce −10.

**Standing words**: +100 or more Close; +30 to +99 Warm; −29 to +29 Cool; −30 to −99 Cold; −100 or less Bitter.

**Action catalogue** (design section 6 table; the README counts "fourteen actions", the design text "fifteen",
the table has fifteen rows and twenty named actions; the table is canonical, D-DIPL-1)

| # | Action | How | Needs | Base | What happens |
|---|---|---|---|---|---|
| 6.1 | Propose alliance | Envoy | No war between you; neither side Hostile; no subject tie | −40 | Alliance (replaces a Truce) |
| 6.1 | Call to arms | Instant (answer a month later) | An Alliance, a Pledge or a League | −20 defensive / −50 offensive | They join your war, or refuse |
| 6.1 | Break alliance | Instant | An Alliance | — | Ends it; Oath broken; wrong *Broke our alliance* |
| 6.2 | Arrange marriage | Envoy | An unmarried heir or child of the ruling house on each side | −15 | Marriage fact; tie *Married houses*; a chance at a claim later |
| 6.3 | Demand | Envoy | A war aim against them, or a Rival or Hostile stance | −60 | They give it, or you gain a war aim |
| 6.4 | Ask for passage | Envoy | G8; no war between you | −10 | Your armies may cross their land for 2 years |
| 6.5 | Trade pact | Envoy | No war between you | −10 | Their border opens to your traders |
| 6.5 | Embargo | Instant | No war between you | — | Their border closes to your traders |
| 6.6 | Pledge protection | Instant | Not at war with them; they are not your subject | — | You promise to defend them; they get a tie |
| 6.6 | Swear peace | Envoy | No war between you | −20 | A Truce of 10 years without a war |
| 6.7 | Offer overlordship | Envoy | See 6.7 | −80 | A subject relation by agreement |
| 6.7 | Ask for protection | Envoy | See 6.7 | −10 | A subject relation by agreement |
| 6.8 | Court a lord | Envoy | A foreign Wavering or Disloyal lord | — | Lord's loyalty drops; he may defect with his land |
| 6.9 | Send gift | Envoy | Gold | — | Tie *Gift* |
| 6.9 | Courtesy visit | Envoy | — | — | Tie *Courtesy visit* |
| 6.9 | Make resident | Envoy | G8 | — | Tie *Resident envoy*; sight of their court |
| 6.10 | Insult | Instant | — | — | Wrong *Insulted us*; Hostile stance |
| 6.10 | Declare rival | Instant | A contested object | — | Rival stance |
| 6.11 | Fund rebels | Envoy, secret | 1 % of their yearly income each month; not your ally or subject; their revolution card shows a sign | — | Sets `revolution_funded` on them; caught 3 % a month (D-DIPL-23) |

**Demand kinds**

| Demand | Needs | War aim on refusal |
|---|---|---|
| Hand over a province | A border with that province, or a claim on it | Take land (that province) |
| Pay tribute | A border with them | Tribute |
| Recognise our pretender | A pretender to their throne at your court | Seat a pretender |
| Release a subject | They have a subject | Break a subject |
| Tolerate our faith in a named province | Religion's persecution flag on a province bordering you | Defend the faith |
| Apologise and pay | They broke an oath to you or insulted you | Punish |
| Expel an envoy / cut an alliance | They host your enemy's resident, or are allied with your Rival | Punish |

**War aim acquisition** (design 7.1)

| War aim | Held when | Lasts |
|---|---|---|
| Take land (named provinces) | You held them in the last 50 years; a pretender of yours claims them; they are a homeland of your culture; a lord's Want names them; they refused your demand for them; a lord defected from you with them | While the reason holds; a refused demand gives 5 years |
| Seat a pretender | A pretender to their throne is at your court (including an émigré court) | While the pretender lives |
| Tribute | You border them and they refused a tribute demand; or you border them and your soldiers are 3 times theirs | 5 years / while true |
| Free a people | Their land holds a homeland of a culture with no country of its own, and that culture is yours or accepted by you | While true |
| Break a subject | They have a subject that is Hostile toward them or asked you for help | While true |
| Defend the faith | Persecution flag on a province bordering you; or they refused your demand to tolerate it | While true |
| Punish | They broke an oath to you; insulted you; held your envoy; entered your land without passage; refused *Apologise and pay*; you caught them funding rebels in your land | 5 years |
| Raid | Nothing | Always |
| No aim | Nothing | Always (warfare 10.1 penalties) |

**League count** (*Join a league against X*)

| Reason | Number |
|---|---|
| Base | −30 |
| Their standing toward X | − standing ÷ 4 |
| X took our land | +10 per province |
| X's Lands taken | +3 per province |
| X could crush us alone (X's soldiers ÷ ours) | Balancers +10 per multiple; bandwagoners −10 per multiple |
| Others already in the league | +5 per member |
| Same faith as X | −10 |

**Era rows**

| Era | Change |
|---|---|
| I 1444–1500 | Envoys only travel; no residents except the Italian states (start with G8); marriages the strongest tie |
| II 1500–1600 | G8 spreads; residents give sight of other courts |
| III 1600–1700 | Many-sided peace, or earlier if event `peace_of_westphalia` fires |
| IV 1700–1800 | League threshold 8 → 6; *Married houses* +10 |
| V 1800–1870 | T14 telegraphy makes missions between telegraph countries instant; offensive calls +10 if allies share a Mobilisation pact |
| VI 1870–1914 | Mobilisation pacts; league threshold 4 |
| VII 1914–1939 | Gifts count half; League of Nations belongs to gap list item 8; ends 31 August 1939 |

**Posture rows**

| Posture (records) | Seeks | Reason rows |
|---|---|---|
| Mixed (204) | Nothing in particular | None |
| Bandwagoner (198) | Alliance with the strongest neighbour; safety | +20 alliances with a stronger country; +20 *Ask for protection*; −10 per multiple to leagues against the strong |
| Opportunist (156) | Gains when others are weak | +20 joining a war on the side with more soldiers; −20 defensive calls where the enemy is stronger; courts lords; Oaths broken count −5 not −10 in its own reckoning |
| Isolationist (137) | To be left alone | −30 alliances and calls; +20 sworn peace and trade pacts; −20 passage |
| Balancer (118) | Stop any one power growing | +10 per multiple to leagues against the strong; +20 alliances against the strongest neighbour |
| Client seeker (90) | A protector | +30 *Offer overlordship* and pledges from a stronger, Warm country; asks for protection when threatened |
| Hegemon seeker (60) | Domination | Makes demands; −20 alliances with a stronger country; offers pledges and overlordship to small neighbours |

**Negotiation level**: very high +15 to any deal that is not a demand and gifts count 25 % more; high +10;
moderate 0; low −10; very low −20; unknown 0 (config).

### Domain services
- **Relations engine**: applies relation actions with their `requires` and `ends`; the reference implementation
  is `country-relations/tools/relations_engine.py`; `tests/test_rules.py` is the shared contract.
- **Validator**: checks the rules file and any relation set (`tools/validate.py`).
- **Reasons counter**: builds the reasons list for any ask.
- **Route timer**: computes an envoy's arrival and return dates once, when sent, on the army route graph.
- **League checker**: the yearly league check.

## 5. Requirements

### 5.1 Relation model

- DIPL-001 The diplomacy context shall describe how two countries stand with nine relation types (Alliance, Friendly, Neutral, Rival, Hostile, At War, Subject, Overlord, Truce), of which eight are stored and Overlord is always derived from a Subject record read from the other end. [relation-types "Types"; relation-rules `types.overlord`]
- DIPL-002 The diplomacy context shall keep three independent slots per pair: hierarchy (Subject), state (at most one of At War, Truce, Alliance per unordered pair) and stance (at most one of Friendly, Neutral, Rival, Hostile per perspective). [relation-types "The model in one picture"]
- DIPL-003 The diplomacy context shall allow each country at most one direct overlord, allow chains of subjects, and reject any cycle. [relation-types; engine `make_subject`; test_rules `test_two_overlords`, `test_cycle`]
- DIPL-004 The diplomacy context shall store a mutual relation once per pair and a Subject from the subject's side. [relations README "Stored once"]
- DIPL-005 While no stance is stored for a perspective, the diplomacy context shall read the implied stance: Hostile if the pair is at war, Friendly if allied, otherwise the default stance Neutral. [relation-rules `implied_stance`, `default_stance`]
- DIPL-006 The diplomacy context shall treat a missing pair as "nothing recorded", never as a historical claim of neutrality, and shall infer no Alliance from friendliness, no Subject from influence and no Rival from being neighbours. [relations README "Principles"]
- DIPL-007 If a relation set holds a combination marked forbidden in the exclusivity matrix, then the validator shall reject it as an error. [relation-types "Exclusivity matrix"; relation-rules `compatibility`]
- DIPL-008 If a relation set holds a combination marked redundant (Alliance with Friendly, Subject with Friendly), then the validator shall report a warning, not an error. [relation-rules `compatibility`; test_rules `test_alliance_friendly_redundant`]
- DIPL-009 If a relation set holds a combination allowed only with a note (Alliance with Rival, Subject with Hostile, Subject with Rival) without a note, then the validator shall reject it. [relation-rules `compatibility`; test_rules `test_subject_hostile_needs_note`]
- DIPL-010 The diplomacy context shall allow two different stances between the same pair only from opposite perspectives. [relation-types matrix "slot"; test_rules `test_opposite_one_way_stances_are_fine`, `test_two_stances_one_perspective`]
- DIPL-011 If two stored historical records conflict, then the validator shall fail the dataset and shall never fix it silently. [relation-types "Conflict resolution"]
- DIPL-012 When a gameplay action creates a relation that is incompatible with an existing one, the diplomacy context shall let the newer relation win and end the older one, unless the action is blocked by its `requires`. [relation-rules `precedence`]
- DIPL-013 When effects happen in the same tick, the diplomacy context shall resolve them in the order At War > Truce > Subject > Alliance > Hostile > Rival > Friendly > Neutral. [relation-types "Conflict resolution"]
- DIPL-014 If `set_rival` is asked without a named contested object, then the diplomacy context shall refuse it. [relation-types "Rival"; engine `set_rival`]
- DIPL-015 The diplomacy context shall treat diplomatic facts as optional pair-level records that feed modifiers and reasons only and never create or block a relation; membership in collective institutions stays in the catalogue hierarchy. [relation-types "Diplomatic facts"; relation-rules `fact_types`]
- DIPL-016 The diplomacy context shall mark relations made in play with origin `gameplay` and never write them back into the 1444 dataset. [relation-types "Dates and origin"]
- DIPL-017 While a relation is `locked`, the diplomacy context shall let only scripted events change it. [relation-types "Dates and origin"]
- DIPL-018 The validator shall reject a relation whose `start_date` is later than the reference date 1444-11-11, and a truce already expired on the reference date; `expires_on` is enforced for truces only and `historical_end` is reference material, not a timer. [relation-types "Dates and origin"; test_rules `test_expired_truce_on_reference_date`, `test_starts_after_reference_date`]
- DIPL-019 The validator shall reject a stored Overlord record, a relation of a country with itself, a relation stored in the wrong direction for its type, an unknown subject kind, a mutual relation duplicated in reverse, and a one-way stance that conflicts with a mutual one. [test_rules `InvalidData`]
- DIPL-020 The diplomacy context shall accept the historical 1444 dataset (280 relations, 19 facts) as a valid starting state. [test_rules `test_historical_start_is_a_valid_game_state`; relations README]
- DIPL-021 The diplomacy context shall add no relation type of its own; every diplomatic action moves a pair between the nine types through the relations engine's actions, or adds a fact. [diplomacy intro; 3.1]

### 5.2 Relation actions

- DIPL-022 If a country declares war on a country it is allied with or in truce with, or on its own overlord, then the diplomacy context shall refuse the declaration; the pact must first be broken by its own action, and a subject uses an independence war. [relation-rules `actions.declare_war`; gameplay examples 1, 4]
- DIPL-023 If an overlord declares war on its own subject, then the diplomacy context shall refuse it; an overlord ends a subject relation by annexing or releasing it. [engine `declare_war`]
- DIPL-024 When war is declared, the diplomacy context shall end the pair's Friendly and Neutral stances, create At War, and set Hostile for each perspective with no stored stance. [relation-rules `actions.declare_war`; engine]
- DIPL-025 When a subject starts an independence war, the diplomacy context shall end the Subject relation, create At War and set both stances Hostile; if the overlord wins, the subject relation is restored. [relation-rules `actions.independence_war`; gameplay example 3]
- DIPL-026 When peace is made, the diplomacy context shall end At War, turn each implied Hostile stance into a stored Hostile stance, and create a Truce, or a Subject when vassalisation is a term. [relation-rules `actions.make_peace`; engine; gameplay examples 1, 3, 5]
- DIPL-027 When a white peace is made, the diplomacy context shall create a Truce and turn each Hostile stance into Rival with the note that the contested object is still open. [relation-rules `actions.white_peace`; gameplay example 7]
- DIPL-028 When both sides extend a truce, the diplomacy context shall move its expiry later; extending needs an existing Truce. [relation-rules `actions.extend_truce`; gameplay example 2]
- DIPL-029 When a truce is broken, the diplomacy context shall end it and set both stances Hostile. [relation-rules `actions.break_truce`; engine]
- DIPL-030 When a truce's expiry month is reached, the diplomacy context shall end it silently, leaving any stance (for example Rival) in place. [relation-types "Truce"; engine `advance`; gameplay example 2]
- DIPL-031 If either side holds a Hostile stance toward the other, the pair is at war, or one is the other's subject, then the diplomacy context shall refuse `form_alliance`. [relation-rules `actions.form_alliance`; gameplay example 5]
- DIPL-032 When an alliance forms, the diplomacy context shall end any Truce and Neutral stance between the pair and drop the now-redundant Friendly stance. [relation-rules `actions.form_alliance`; engine]
- DIPL-033 When an alliance is broken, the diplomacy context shall end it and apply the alliance-breaking penalty (diplomacy: an Oath broken and the wrong *Broke our alliance*). [relation-rules `actions.break_alliance`; diplomacy 6.1]
- DIPL-034 When a country is made a subject, the diplomacy context shall end any Alliance, Truce, At War and Neutral between the pair, drop a redundant Friendly stance, and add a note when a Hostile or Rival stance is carried into the subject relation. [relation-rules `actions.make_subject`; engine]
- DIPL-035 When a subject is released, the diplomacy context shall end the Subject relation and set both sides Friendly. [relation-rules `actions.release_subject`; gameplay example 6]
- DIPL-036 When a country is insulted, the diplomacy context shall end the Friendly stance and set Hostile. [relation-rules `actions.insult`; diplomacy 6.10]
- DIPL-037 When relations are improved, the diplomacy context shall move the stance one step along Hostile → Rival → Neutral → Friendly. [relation-rules `actions.improve_relations`]
- DIPL-038 When a country is destroyed, the diplomacy context shall end all of its relations. [relation-rules `actions.country_destroyed`]
- DIPL-039 The diplomacy context shall never let a war between other countries rewrite a subject relation. [gameplay example 1]
- DIPL-040 While a stored Friendly stance has not been refreshed for 240 months, the diplomacy context shall let it decay. [relation-rules `types.friendly.duration.decay_months`]
- DIPL-041 The diplomacy context shall keep a Rival stance at least 120 months before it may change. [relation-rules `types.rival.duration.min_months_before_change`]
- DIPL-042 When a Hostile stance has lasted 120 months, the diplomacy context shall decay it to Rival. [relation-rules `types.hostile.duration`]
- DIPL-043 When a war has lasted 60 months of exhaustion, the diplomacy context shall force the AI to accept peace. [relation-rules `types.at_war.duration.war_exhaustion_peace_months`; relation-types "At War"]
- DIPL-044 While a pair is at war, the diplomacy context shall stop trade between them. [relation-types "At War"; relation-rules `modifiers.at_war.trade_access`]
- DIPL-045 While a stance is Hostile, the diplomacy context shall allow border-raid events between the pair at a chance of 0.02 per month. [relation-rules `modifiers.hostile.border_raid_chance_per_month`]
- DIPL-046 Where a dataset truce records its own historical term, the diplomacy context shall keep that term instead of the configured length. [relation-rules `types.truce.duration.historical_term_overrides_default`]

### 5.3 Envoys

- DIPL-047 The diplomacy context shall make every envoy an official sent abroad; the province that official ran is run as if it had no official until the official returns. [diplomacy 2.1; decision 16 Oct]
- DIPL-048 The diplomacy context shall give a country 1 envoy seat, +1 while its realm has more than 10 provinces, +1 for G5 Royal chancery, +1 for G8 Resident ambassadors, and +1 where a national strength says so. [diplomacy 2.1; config `envoys.seats`]
- DIPL-049 When a realm falls to 10 provinces or fewer, the diplomacy context shall remove its size seat; seats from inventions are never lost; when seats fall below envoys abroad, missions finish and residents beyond the seats are recalled, newest first. [diplomacy 2.1; D-DIPL-13]
- DIPL-050 If a country has no free envoy seat, then the diplomacy context shall refuse to send another envoy. [diplomacy 2.1 "the hard limit"]
- DIPL-051 When an envoy carries a mission its official type suits, the diplomacy context shall add the type's reason (+10; Steward and Tax collector make a gift count 25 % more instead; Master of works adds nothing). [diplomacy 2.1; config `official_type_bonus`]
- DIPL-052 When an envoy has served 10 years, the diplomacy context shall add +5 more to the envoy's reason. [diplomacy 2.1, 5.1]
- DIPL-053 When an envoy has been resident at one court for 5 years, the diplomacy context shall add +5 to anything asked of that court. [diplomacy 2.1]
- DIPL-054 Where a country has no officials (chiefdoms, stateless societies), the diplomacy context shall send a lord or elder under the same rules, and if the mission lasts over 12 months the lord's loyalty drops a step. [diplomacy 2.1; config `lord_loyalty_step_lost_if_mission_months_over`]
- DIPL-055 The diplomacy context shall move envoys on the army route graph at 2 days per crossing unit (three times march pace), using the naval sea-zone travel times for sea legs. [diplomacy 2.2]
- DIPL-056 When an envoy is sent on a mission, the diplomacy context shall compute once its arrival (days there), one month at court, and its return (days back). [diplomacy 2.2, 15]
- DIPL-057 If an envoy's land route crosses a country at war with the sender, or one that has denied the sender passage, then the diplomacy context shall route it by sea or not at all. [diplomacy 2.2]
- DIPL-058 While both countries know T14 telegraphy, the diplomacy context shall decide a mission in the turn it is sent without the envoy leaving home, the answer still arriving a month later; marriages and residents (and, by config, courtesy visits) still travel. [diplomacy 2.2; config `instant_excludes`]
- DIPL-059 The diplomacy context shall give each envoy exactly one task: a mission (one action to one country, decided on arrival, then home) or a residence. [diplomacy 2.3]
- DIPL-060 Where a country knows G8 Resident ambassadors, the diplomacy context shall allow it to make an envoy resident at one court until recalled, holding the seat meanwhile. [diplomacy 2.3]
- DIPL-061 While an envoy is resident, the diplomacy context shall add the tie *Resident envoy* +5 each season up to +30, and when the residence ends let it fade over 5 years. [diplomacy 2.3, 3.2]
- DIPL-062 While an envoy is resident, the diplomacy context shall show the sender that country's soldiers, its treasury to the nearest 100 gold and its lords' loyalty. [diplomacy 2.3]
- DIPL-063 While an envoy is resident, the diplomacy context shall let it carry any mission to that court with no travel time. [diplomacy 2.3]
- DIPL-064 While an envoy is resident, the diplomacy context shall warn the sender a month ahead when that country is about to declare war on the sender or the sender's allies. [diplomacy 2.3]
- DIPL-065 When a courtesy visit is made, the diplomacy context shall send the envoy, keep it at court one month, bring it back, and add the tie *Courtesy visit* +15 fading over 5 years. [diplomacy 2.3]
- DIPL-066 When the country hosting an envoy and the sender go to war (either side declaring), the diplomacy context shall hold the envoy until the peace returns it. [diplomacy 2.4]
- DIPL-067 When a demand is refused by a country Hostile to the asker, the diplomacy context shall hold the envoy with a chance of 1 in 10, and on that roll give the asker the war aim *Punish* against them. [diplomacy 2.4]
- DIPL-068 When the country where an envoy is resident falls to rebels, the diplomacy context shall send the envoy home. [diplomacy 2.4]
- DIPL-069 When an envoy's official dies of old age on the road, the diplomacy context shall free the seat and fail the mission. [diplomacy 2.4]
- DIPL-070 The diplomacy context shall never hold the envoy carrying a peace. [diplomacy 8, 2.4]

### 5.4 Ledger and standing

- DIPL-071 The diplomacy context shall keep, for each country and each other country it has dealt with, a ledger of named ties and wrongs, each with a weight and either a fade time or a condition; the ledger total is the standing on the −200..+200 scale, the same number the event tree calls `opinion`. [diplomacy 3.2]
- DIPL-072 The diplomacy context shall include the stance and state as one ledger line with the weights Alliance +50, Friendly +30, Neutral 0, Rival −30, Hostile −75, At War −100, Truce −10. [diplomacy 3.2; relation-rules `modifiers`]
- DIPL-073 The diplomacy context shall add ties with the weights and durations of the Ties table (section 4). [diplomacy 3.2]
- DIPL-074 The diplomacy context shall add wrongs with the weights and durations of the Wrongs table (section 4). [diplomacy 3.2, 6.11]
- DIPL-075 The diplomacy context shall fade an entry by shrinking its weight in equal yearly steps to zero over its stated years. [diplomacy 3.2]
- DIPL-076 If a ledger would hold more than 12 entries for a pair, then the diplomacy context shall merge the smallest entries into one entry "Old matters". [diplomacy 3.2]
- DIPL-077 The diplomacy context shall show standing as a word: +100 or more Close, +30 to +99 Warm, −29 to +29 Cool, −30 to −99 Cold, −100 or less Bitter, with the ledger one tap away. [diplomacy 3.2]
- DIPL-078 The diplomacy context shall count each Oath broken by the asker (last 30 years) as a reason of −10 in every count of an action that relies on the asker's word: alliance, swear peace, marriage, trade pact, offer overlordship. [diplomacy 3.3, 5.1; config `relies_on_word`; D-DIPL-18]
- DIPL-079 The diplomacy context shall use the asker's Lands taken (last 20 years) to drive leagues and as a reason in alliance counts made by the asker's neighbours. [diplomacy 3.3]
- DIPL-080 The diplomacy context shall add to the country card's diplomacy line the counts "Envoys n of m abroad" and "Leagues against you". [diplomacy 4]

### 5.5 The reasons count

- DIPL-081 When an envoy's request is decided, the diplomacy context shall have the asked country list its reasons, each with a number, and answer yes only when the total is over zero. [diplomacy 5]
- DIPL-082 The diplomacy context shall show no prediction of an answer before asking, and shall deliver the answer as a letter (yes or no with the full reasons list and numbers) a month after it is given. [diplomacy 5; decision 16 Oct; config `answers`]
- DIPL-083 The diplomacy context shall let the asker judge beforehand only from what it can see: the ledger, the stance, and the other side's soldiers (exact with a resident envoy, otherwise an estimate). [diplomacy 5]
- DIPL-084 The diplomacy context shall put in every count: the action's negative base; standing ÷ 4; −10 per Oath broken if the action relies on the asker's word; the envoy's type and years-served reason; the asked country's personality (−30 to +30 by action); its ruler's traits (for example Pious +10 to anything asked by the same faith, Warlike −10 to sworn peace, Greedy +10 to anything with a gift); and a national strength where it says so. [diplomacy 5.1]
- DIPL-085 The diplomacy context shall count strength as soldiers under arms, with allies who would come counted at half. [diplomacy 5.2]
- DIPL-086 When an ask binds the asked country to the asker (alliance, pledge, protection), the diplomacy context shall add *You are stronger than us* +10 per full multiple of their soldiers up to +40, or *We are stronger than you* −10 per full multiple up to −40. [diplomacy 5.2]
- DIPL-087 When a demand is counted, the diplomacy context shall add *We cannot beat you* +15 per full multiple of their soldiers beyond 1 up to +60, and *We have strong friends* minus half of that when their allies would defend them. [diplomacy 5.2]
- DIPL-088 While the asked country is already at war, the diplomacy context shall add −30 to anything that adds a new commitment, unless it is against the same enemy. [diplomacy 5.2]
- DIPL-089 The diplomacy context shall add *Too far to matter* −15 when the pair has no shared border and no shared neighbour, and *Very far* −15 more when an envoy needs more than 60 days. [diplomacy 5.3]
- DIPL-090 The diplomacy context shall add *We share an enemy* +25 when both are at war with the same country. [diplomacy 5.3]
- DIPL-091 The diplomacy context shall add *You threaten our frontier* −5 for each province in the asker's Lands taken that borders the asked country, in every count the asked country makes. [diplomacy 5.3; D-DIPL-17]
- DIPL-092 The diplomacy context shall add *We already have allies* −10 for each alliance of the asked country beyond two. [diplomacy 5.3]
- DIPL-093 The diplomacy context shall let each action add at most two reasons of its own to the common reasons; *Offer overlordship* keeps the three of its table, and the strength rows of a demand are the common strength reasons. [diplomacy 5.3, 6.7]

### 5.6 Alliances and calls to arms

- DIPL-094 When a country proposes an alliance, the diplomacy context shall require an envoy, no war between them, neither side Hostile and no subject tie, count it with base −40, and on yes call `form_alliance` (an alliance replaces a Truce). [diplomacy 6, 6.1]
- DIPL-095 When war is declared on a country, the diplomacy context shall send defensive calls to its allies, except in its own independence war or a war it provoked by a refused demand. [diplomacy 6.1]
- DIPL-096 If an ally refuses a defensive call, then the diplomacy context shall break the alliance, give the refuser an Oath broken, and give the caller's ledger the wrong *Abandoned us* toward it. [diplomacy 6.1]
- DIPL-097 If an ally refuses an offensive call, then the diplomacy context shall break nothing and add no tie; the ally simply stays out. [diplomacy 6.1]
- DIPL-098 When a call to arms is counted, the diplomacy context shall use base −20 (defensive) or −50 (offensive), plus *Our ally's war aim is our concern* +30 (target is our Rival or Hostile, or the aim frees our people or faith), *We are at war already* −30, and *The enemy is far stronger* −10 per full multiple of the ally's soldiers the enemy side has, up to −40. [diplomacy 6.1]
- DIPL-099 When a call to arms is issued, the diplomacy context shall send it instantly and deliver the answer a month later. [diplomacy 6, 7.2]
- DIPL-100 While an ally is in a war, the diplomacy context shall leave its armies under its own command, count its own peace voices, and name it in the peace so it gets the truce too. [diplomacy 6.1]
- DIPL-101 When over half of an ally's own peace voices say peace, the diplomacy context shall allow it a separate peace with the enemy; this is not an Oath broken, but the ledger loses the tie *Answered our call*. [diplomacy 6.1; config `separate_peace_when_peace_voices_over`]
- DIPL-102 When an ally joins a war when asked, the diplomacy context shall add the tie *Answered our call* +20; when two countries fight a war on the same side, the tie *Fought side by side* +15. [diplomacy 3.2]
- DIPL-103 When a country breaks an alliance (instant), the diplomacy context shall end it, give the breaker an Oath broken and give the other side the wrong *Broke our alliance* −40. [diplomacy 6, 6.1]

### 5.7 Marriages and pretenders

- DIPL-104 When a marriage is proposed, the diplomacy context shall require an unmarried heir, son or daughter of the ruler on each side, and for ruling houses of hostile faiths the religion context's tolerance rule. [diplomacy 6.2]
- DIPL-105 When a marriage is counted, the diplomacy context shall use base −15 plus *Their house is greater* +10 (the asker's realm has more people) and *A marriage already binds us* −10 per existing marriage. [diplomacy 6.2]
- DIPL-106 When a marriage is agreed, the diplomacy context shall record the `royal_marriage` fact and the tie *Married houses*. [diplomacy 6.2]
- DIPL-107 While a marriage lives, when either ruler dies without a direct heir, the diplomacy context shall give the other house's member a 1 in 10 chance per marriage of a claim to the throne: a `dynastic_claim` fact and a pretender at that house's court. [diplomacy 6.2; config `claim_chance_per_heirless_death`]
- DIPL-108 The diplomacy context shall treat a pretender as a named person at a court, gained from marriages, from exiles fleeing a lost succession war or revolt, and from events; a pretender gives the war aim *Seat a pretender*. [diplomacy 6.2]
- DIPL-109 When a pretender dies, the diplomacy context shall pass the claim to his heir if he has one, otherwise let it lapse. [diplomacy 6.2]
- DIPL-110 When a ruler dies with no heir at all and the asker's house holds the strongest claim (most marriages, then the closest), the diplomacy context shall pass the realm to the asker's ruler, hand the union to the subjects context (`personal_union`), and have each Wavering or Disloyal lord of the inherited realm roll to rise for a local claimant as a succession war. [diplomacy 6.2]

### 5.8 Demands

- DIPL-111 When a demand is made, the diplomacy context shall require an envoy and a war aim against the target or a Rival or Hostile stance, name exactly one demand of the Demand kinds table with its need met, and count it with base −60. [diplomacy 6, 6.3]
- DIPL-112 When a demand is counted, the diplomacy context shall add *We cannot beat you*, *We have strong friends* and, for a province with their capital or of their own culture, *It's our heartland* −30. [diplomacy 6.3]
- DIPL-113 When a demand is given in to, the diplomacy context shall give the asker exactly what was demanded and the target the wrong *Threatened us*, with no war and no truce. [diplomacy 6.3]
- DIPL-114 When a demand is refused, the diplomacy context shall give the asker the matching war aim against the target for 5 years and the target the wrong *Threatened us*. [diplomacy 6.3; config `demand.kinds`]
- DIPL-115 While a war follows a demand the target refused, the diplomacy context shall count it as provoked by the target: the asker's lords who are not Warlike don't waver, the asker's offensive calls get *They refused a fair demand* +20, and the target's allies and pledgers get no defensive call. [diplomacy 6.3; D-DIPL-5]

### 5.9 Passage

- DIPL-116 The diplomacy context shall let a country's armies enter a foreign country only if they are at war, it is the country's subject or ally, or it has granted passage. [diplomacy 6.4]
- DIPL-117 Where a country knows G8 Resident ambassadors, the diplomacy context shall let it ask for passage by envoy (no war between them, base −10, *You are marching on our friend* −40 when the army's likely target is Friendly or allied with them, *You are marching on our enemy* +20); before G8 a country at peace is closed to its armies unless an ally or subject. [diplomacy 6.4; decision 16 Oct]
- DIPL-118 When passage is granted, the diplomacy context shall keep it for 2 years and let the granting side revoke it at any time without an Oath broken; a refused or revoked passage blocks the asker's envoys over that land for 2 years. [diplomacy 2.2, 6.4; D-DIPL-21]
- DIPL-119 If an army enters a country without passage, then the diplomacy context shall treat it as an act of war: the owner may declare war with the aim *Punish* that turn, and the owner's allies' defensive calls count as answered to a war started by the intruder. [diplomacy 6.4]

### 5.10 Trade pacts and embargoes

- DIPL-120 When a trade pact is agreed (envoy, base −10), the diplomacy context shall waive tolls and extra fees for each side's traders in the other's provinces, record the `trade_agreement` fact, add the tie *Trade pact* +10 both ways, and end it with war or when either side cancels. [diplomacy 6.5]
- DIPL-121 When an embargo is declared (instant), the diplomacy context shall bar both sides' traders from each other's land and ports, close paths through the embargoing country's provinces, and add the wrong *Embargo against us* −15 while it is in force. [diplomacy 6.5]

### 5.11 Pledges and sworn peace

- DIPL-122 When a country pledges protection (instant, one way, not at war with them, they are not its subject), the diplomacy context shall record the `protection_pledge` fact and give the protected the tie *Pledged to protect us* +15; the pledge never blocks or creates a relation type. [diplomacy 6.6]
- DIPL-123 When a protected country is attacked, the diplomacy context shall send the pledger a defensive call as if allied, and if it refuses, give it an Oath broken. [diplomacy 6.6]
- DIPL-124 When peace is sworn (envoy, base −20, *We fear you* +10 per multiple of their soldiers, *We want your land* −30 if they have a claim on the asker's land), the diplomacy context shall create a Truce of 10 years with origin `gameplay`. [diplomacy 6.6; config `swear_peace.truce_months`]
- DIPL-125 When a sworn peace is broken, the diplomacy context shall apply `break_truce`: an Oath broken and the wrong *Broke a truce with us*. [diplomacy 6.6]

### 5.12 Subjects by agreement

- DIPL-126 When a country offers overlordship (envoy, base −80), the diplomacy context shall add *We need a protector* +20 per neighbour Hostile toward the asked or holding a claim on it, *You already protect us* +20 with a Pledge, and *We are proud* −10 per castle of theirs beyond two; on yes the subjects context chooses the kind from those it allows for the pair. [diplomacy 6.7]
- DIPL-127 When a country asks a stronger one for protection (envoy, base −10), the diplomacy context shall count it and on yes hand the new subject relation to the subjects context. [diplomacy 6.7]

### 5.13 Courting a foreign lord

- DIPL-128 When an envoy courts a foreign lord, the diplomacy context shall require that lord to be Wavering or Disloyal, and each season the envoy stays drop the lord's loyalty to his own ruler a step, unless his ruler pays him more (a gift to him) or wins a battle he took part in. [diplomacy 6.8]
- DIPL-129 When a Disloyal lord who borders the courting country has been courted for a year, the diplomacy context shall have him defect with his lands, and give his former ruler the war aim *Take land* for those provinces. [diplomacy 6.8]
- DIPL-130 Each season of courting, the diplomacy context shall roll a 1 in 4 chance of discovery; when discovered, the target gains the wrong *Courted our lord* and the envoy is sent home. [diplomacy 6.8]

### 5.14 Gifts, insults and rivals

- DIPL-131 When a gift of any amount of gold is sent by envoy, the diplomacy context shall add the tie *Gift* (+1 per 5 gold, up to +30 per gift, fading over 10 years). [diplomacy 6.9, 3.2]
- DIPL-132 When a country insults another (instant), the diplomacy context shall apply `insult` (the insulted side's stance becomes Hostile), add the wrong *Insulted us*, raise by one loyalty step each Warlike lord of the insulter whose Want is a war with them, and give the insulted the war aim *Punish*. [diplomacy 6.10, 7.1]
- DIPL-133 When a country declares a rival (instant), the diplomacy context shall apply `set_rival` with a named contested object. [diplomacy 6.10]

### 5.15 Funding rebels

- DIPL-134 When a country funds rebels, the diplomacy context shall require a free envoy seat and a target that is not its ally or subject whose revolution card shows at least one sign, charge 1 % of the target's yearly income every month, and tell nobody unless caught, not even when the funding stops. [revolutions 7.1; X-10; D-DIPL-23, D-DIPL-30]
- DIPL-135 While a country is funded, the diplomacy context shall set the flag `revolution_funded` on it for the revolutions context. [revolutions 7.1; X-10]
- DIPL-136 Where the target country has an émigré pretender court (revolutions), the diplomacy context shall allow funding it the same way. [diplomacy 6.11]
- DIPL-137 Each month of funding, the diplomacy context shall roll a chance of being caught of 3 in 100. [X-10]
- DIPL-138 When funding is caught, the diplomacy context shall hold the envoy and stop the funding, give the target the wrong *Stirred revolt in our land* −50 fading over 20 years and the war aim *Punish* for 5 years; the funder learns it a month later. [diplomacy 6.11; X-10]

### 5.16 War aims

- DIPL-139 The diplomacy context shall give a country the war aim *Take land* for named provinces it held in the last 50 years, that a pretender of its claims, that are a homeland of its culture, that a lord's Want names, that refused its demand for them (5 years), or that a lord took when defecting from it. [diplomacy 7.1]
- DIPL-140 The diplomacy context shall give *Seat a pretender* while a pretender to the target's throne lives at the country's court, including an émigré court. [diplomacy 7.1]
- DIPL-141 The diplomacy context shall give *Tribute* for 5 years when a bordering target refused a tribute demand, and while true when the country borders the target and has 3 times its soldiers. [diplomacy 7.1]
- DIPL-142 The diplomacy context shall give *Free a people* while the target's land holds a homeland of a culture with no country of its own that is the country's culture or accepted by it. [diplomacy 7.1]
- DIPL-143 The diplomacy context shall give *Break a subject* against the overlord while it has a subject that is Hostile toward it or asked the country for help. [diplomacy 7.1; D-DIPL-8]
- DIPL-144 The diplomacy context shall give *Defend the faith* while a province bordering the country carries the persecution flag, or after the target refused a demand to tolerate it. [diplomacy 7.1]
- DIPL-145 The diplomacy context shall give *Punish* for 5 years when the target broke an oath to the country, insulted it, held its envoy, entered its land without passage, refused an *Apologise and pay* demand, or was caught funding rebels in its land. [diplomacy 7.1]
- DIPL-146 The diplomacy context shall always allow the aims *Raid* and *No aim*. [diplomacy 7.1]
- DIPL-147 Where an event grants a war aim for a stated time, or a national strength grants an aim only that country has, the diplomacy context shall hold it accordingly. [diplomacy 7.1, 11]

### 5.17 Declaring war

- DIPL-148 When a country declares war, the diplomacy context shall require a target and exactly one aim it holds, and the declaration screen shall show who will be called on each side and how many of the declarer's voices already lean to peace, but not how the called countries will answer. [diplomacy 7.2]
- DIPL-149 If the declarer has an Alliance, Truce or Pledge with the target, then the diplomacy context shall require it to be broken first, each breaking counting as an Oath broken. [diplomacy 7.2]
- DIPL-150 When war is declared, the diplomacy context shall send the same turn offensive calls to the declarer's allies and defensive calls to the target's allies and pledgers, bring in both sides' subjects by their kind (a Union joins, a Vassal or Protectorate is called, a March joins when the enemy borders it, a Tributary or Colony stays out), and bring in members of a league against the declarer; answers arrive a month later. [diplomacy 7.2; X-8; D-DIPL-10]
- DIPL-151 When war is declared, the diplomacy context shall show the aim to every country; for a war with no aim, every neighbour of the declarer gains the wrong *Threatened us*. [diplomacy 7.2]
- DIPL-152 If a subject is a Union, Colony or Protectorate, or a Vassal declaring on its overlord's ally, then the diplomacy context shall refuse its declaration of war. [diplomacy 7.3; X-8; D-DIPL-10]
- DIPL-153 While a country has a regency (child ruler), the diplomacy context shall allow it only defensive wars and *Raid*. [diplomacy 7.3; config `war_aims.regency_allows`]

### 5.18 Peace and truces

- DIPL-154 When a peace is signed, the diplomacy context shall start a truce of 5 years, plus 5 more if the peace moved provinces or made a subject; a white peace gives 5 years. [diplomacy 8; X-11]
- DIPL-155 Where both sides agree, the diplomacy context shall allow `extend_truce` to lengthen a truce. [diplomacy 8]
- DIPL-156 Where many-sided peace is unlocked and three or more countries are on each side, the diplomacy context shall let one envoy carry a single peace that every warring country signs at once, each one's peace voices deciding whether it signs; before that each pair makes its own peace. [diplomacy 8, 10]

### 5.19 Leagues against a conqueror

- DIPL-157 Once a year, for each country X whose Lands taken (last 20 years) is at least the league threshold of the era (8 in eras I–III, 6 in IV–V, 4 in VI–VII), the diplomacy context shall have every country that borders X or a province X took in the last 20 years, and is not X's ally, subject or overlord and not at war with X, make the count *Join a league against X*. [diplomacy 9; config `leagues`]
- DIPL-158 The diplomacy context shall count *Join a league against X* with the reasons of the League count table. [diplomacy 9]
- DIPL-159 When at least two countries say yes, the diplomacy context shall create the league, named after X ("League against Venice"). [diplomacy 9]
- DIPL-160 When X declares war on any league member, the diplomacy context shall call every member defensively; a member that refuses leaves the league with no Oath broken. [diplomacy 9]
- DIPL-161 The diplomacy context shall give league members no protection against anyone but X and no other duty. [diplomacy 9]
- DIPL-162 The diplomacy context shall show X the league, its members and their soldiers on its country card line. [diplomacy 9, 4]
- DIPL-163 When X's Lands taken falls below half the threshold, or X makes a peace that gives provinces back to members, the diplomacy context shall dissolve a league formed by the threshold; a league started by an event ends only by event or by such a peace. [diplomacy 9; D-DIPL-25]
- DIPL-164 When an event starts a league against a named country, the diplomacy context shall create it regardless of the threshold and of the number of members. [diplomacy 9, 11; D-DIPL-25]

### 5.20 Eras

- DIPL-165 While the era is I, the diplomacy context shall allow residents only to countries that know G8 (the Italian states start with it). [diplomacy 10]
- DIPL-166 When era III begins, or earlier when the event `peace_of_westphalia` fires, the diplomacy context shall unlock many-sided peace. [diplomacy 10; config `eras.III`]
- DIPL-167 While the era is IV or later, the diplomacy context shall weigh *Married houses* +10 per marriage. [diplomacy 10; config `eras.IV`]
- DIPL-168 While the era is VI or later, the diplomacy context shall add +10 to offensive calls between allies that share a mobilisation pact. [diplomacy 10; D-DIPL-11]
- DIPL-169 Where two allies have marked their alliance as a mobilisation pact (era VI or later), the diplomacy context shall answer a defensive call between them automatically with no reasons count and deliver it to the player as an event saying their country has joined the war. [diplomacy 10; decision 16 Oct]
- DIPL-170 While the era is VII, the diplomacy context shall count gifts at half. [diplomacy 10; config `eras.VII`]
- DIPL-171 Where a revolution says so, the diplomacy context shall add the revolution's reason row (for example *Different form of rule* −20 with monarchies in every count for a set time). [diplomacy 10]

### 5.21 Events

- DIPL-172 When an event applies an `opinion` effect, the diplomacy context shall add an event tie or wrong named after the event with the given weight, fading over 10 years unless the event says otherwise. [diplomacy 11]
- DIPL-173 The diplomacy context shall expose `trust` read-only as 100 − 10 × Oaths broken, never below 0; an effect that lowers trust adds an Oath broken. [diplomacy 11]
- DIPL-174 The diplomacy context shall expose `notoriety` read-only as 5 × Lands taken + the event notoriety still unfaded, capped at 100; an effect adding notoriety n adds the wrong *Notorious deed* −10 × n with every country that shares a border, a sea zone or a trade pact with the actor, fading over 30 years, and never adds Lands taken. [diplomacy 11; D-DIPL-26]
- DIPL-175 When an event sets a `relation` of type alliance, truce, rivalry, war, trade_pact, embargo, guarantee or non_aggression, the diplomacy context shall apply the matching action (`form_alliance`, sworn peace, `set_rival`, `declare_war`, trade pact, embargo, pledge, sworn peace) with that action's `requires`; an event that needs allies to fight must break the alliance first. [diplomacy 11]
- DIPL-176 When an event uses the new effects `war_aim`, `league` or `pretender`, the diplomacy context shall grant a war aim against a role for a set number of years, start a league against a role, or place a pretender to a role's throne at another role's court. [diplomacy 11]

### 5.22 AI

- DIPL-177 The diplomacy context shall have the AI decide with exactly the counts of section 5, adding its posture's and negotiation level's reason rows (Posture rows and Negotiation level, section 4). [diplomacy 12, 12.1, 12.2]
- DIPL-178 Each month, the diplomacy context shall let an AI country with a free envoy seat score at most 5 candidate actions per free seat toward countries in its horizon (neighbours, neighbours' neighbours, anyone it holds a relation or fact with, the enemies of its rivals). [diplomacy 12.3, 15]
- DIPL-179 When an AI chooses a request, the diplomacy context shall have it estimate the other side's count under the player's limits, send the best request whose estimate is over zero, and send a gift first when the best is a close no (−20 or better). [diplomacy 12.3]
- DIPL-180 Before an AI declares war, the diplomacy context shall have it try a fitting demand first, unless its posture is Opportunist and the target's armies are away. [diplomacy 12.3]
- DIPL-181 When an AI answers a player's request, the diplomacy context shall use exactly the section 5 count, and the player reads those reasons when the answer arrives. [diplomacy 12.3]
- DIPL-182 Where an AI is Opportunist or Hegemon seeker and has a free seat and gold to spare, the diplomacy context shall have it fund the revolution of a Rival whose card shows at least one sign. [diplomacy 12.3; D-DIPL-23]

### 5.23 Screen and lens

- DIPL-183 The diplomacy lens shall colour every country by the viewer's relation: own colour for the viewer and its subjects; blue for allies and light blue for pledged to or by the viewer; green / pale green for Close / Warm; grey for Cool or nothing recorded; orange for Cold or Rival; red for Hostile, Bitter or at war (hatched when at war); a red border for a league against the viewer. [diplomacy 13.1]
- DIPL-184 The diplomacy lens shall show envoys on the road as small riders with a dotted route line, only colours at world zoom, and riders and the war-aim icon (a crossed sword over countries the viewer holds a war aim against) at regional zoom. [diplomacy 13.1]
- DIPL-185 The country diplomacy card shall show standing toward the viewer and the viewer's stance, ties and wrongs, relations, the viewer's war aims on that country, the last answer with a *Why?* button opening the full reasons list, and action buttons that show no prediction. [diplomacy 13.2]
- DIPL-186 When an action button is tapped, the diplomacy screen shall open an envoy picker showing which official, the days on the road, and which province loses its official meanwhile. [diplomacy 13.2]
- DIPL-187 Where the screen is in landscape, the country diplomacy card shall sit on the right of the map instead of covering it. [diplomacy 13.2]
- DIPL-188 The envoys strip shall show each seat as free, on the road (destination and days) or resident (court). [diplomacy 13.2]
- DIPL-189 The war declaration sheet shall show the target, the aim and its source, each side's countries and soldiers with who is called and which subjects join or stay out by their kind, that answers arrive a month later, the declarer's peace voices leaning to peace, and the choices *Send a demand first* and *Declare*. [diplomacy 13.3; D-DIPL-33]

### 5.24 Cost and configuration

- DIPL-190 The diplomacy context shall keep ledgers only for pairs that have dealt with each other, recompute fades once a year, run league checks once a year only for countries over the threshold, and compute an envoy's arrival once when sent. [diplomacy 15]
- DIPL-191 The diplomacy context shall read every number from one config file (`diplomacy-rules.json`, all placeholders), and changing one shall never touch `country-relations/data/relations-1444.json`. [diplomacy 16; relation-types intro]
- DIPL-192 The diplomacy context shall keep standing within −200 and +200. [D-DIPL-19]
- DIPL-193 The diplomacy context shall let a country lift its embargo, stop its rebel funding, and mark or unmark a mobilisation pact (era VI, either ally) at once and at no cost; withdrawing a pledge shall give an Oath broken; a Rival may be dropped once it has stood 10 years; a resident may be recalled at any time, an envoy on a mission may not. [D-DIPL-22]
- DIPL-194 When a funded revolution wins, the diplomacy context shall give the new regime the tie *Backed our revolution* +25 toward each funder, unless the regime is hostile to the funder's form of rule. [revolutions 7.1; X-10]

### Playtest feedback (17 October 2026)
Leroy's playtest feedback (DECISIONS.md, F-1 to F-22). It is the latest decision, so it replaces the requirements it names.

- DIPL-195 The AI shall offer peace to the player by the same rules it uses to make peace between AI realms (peace voices, exhaustion, WAR-196), sending the player an incoming peace offer to answer (game-shell SHELL-092). [F-10]
- DIPL-196 The diplomacy context shall put a country's war and peace actions (declare war, offer or ask peace, open the peace table) on the Diplomacy tab of its country card. [F-11]

### 5.25 Envoys in the game (milestone 5, first slice)
The library's envoys, asks, answers and ledgers now run in the game's month for every realm (D-DIPL-35). This slice wires four missions: propose an alliance, arrange a marriage, a courtesy visit and a gift. Demands follow in 5.26; subjects, passage and the rest in later slices.

- DIPL-197 Each month the game shall give the diplomacy context each realm's soldiers, provinces, gold, gold to spare and capital, move every envoy, enforce seats, fade ledgers, and turn the letters arriving this month into news for the player (their own answers, and other realms' agreements). [DIPL-048, DIPL-055, DIPL-190; D-DIPL-35]
- DIPL-198 A realm may send an envoy to propose an alliance, arrange a marriage, pay a courtesy visit or bring a gift (30 gold, the data's 150 at the game's gold scale) when it is not at war with the target, has no envoy already on the way there, and has a free seat; an alliance is refused at once to allies, to an overlord or subject, or where either side is Hostile, and a marriage to houses already married. The reason is shown in place of the button. [DIPL-048, DIPL-059, DIPL-081; D-DIPL-35]
- DIPL-199 Each month a twelfth of the AI realms with a free seat shall pick the neighbour whose standing toward them is highest and weigh an alliance and a marriage with it, by exactly the section 5 count, and send the best ask whose count is over zero, or a gift first when it is a close no (DIPL-179). [DIPL-178, DIPL-179; D-DIPL-35]
- DIPL-200 The 1444 royal marriages shall count as marriages from the start, and envoys, letters, ledgers and alliances shall be kept in the save. [DIPL-071; D-DIPL-35]
- DIPL-201 A player may end an alliance from the ally's Diplomacy tab; it costs an Oath broken (DIPL-103). [DIPL-103]

#### How the player uses it: envoys and answers
- DIPL-202 Where: another realm's card, Diplomacy tab. It shows, top to bottom, what they think of you (the standing word and number, then each ledger line with its weight), your envoy on the way there and when he arrives, their last answer with a *Why?* that opens the reasons and the total on a tap, and *Send an envoy*: the free seats, then the four missions, each a 44-point button with one line on what it does, or a disabled button with why not. *End the alliance* sits under the missions while you are allied, with its cost. At war the missions give way to the war and peace actions (DIPL-196). Grouping and overview: your own card's Diplomacy tab is the overview, listing your envoys abroad (where, why, when they arrive or come home) and the last eight answers with their *Why?*; answers also arrive in the dispatches with a scroll icon. Phone: the tab fits the side panel in the Wide and Tall layouts, every button and *Why?* at least 44 points high, nothing that needs hover. This replaces the envoy picker of DIPL-186 until officials are sent by name. [X-19, DIPL-185, DIPL-188]

### 5.26 Demands in the game (milestone 5, second slice)
Demands now run in the game for two kinds of the Demand kinds table: *Hand over a province* and *Pay tribute* (D-DIPL-36). The other kinds need pretenders, faith and residents, which come with their contexts.

- DIPL-203 A realm may demand tribute of, or a province from, another realm when it could send an envoy there (DIPL-198), neither is the other's subject or overlord, and it holds a war aim on them other than Raid and No aim or a Rival or Hostile stance toward them; tribute needs a shared border and a target with no overlord, a province must be theirs and border the asker's land. Each reason is shown in place of its button. [DIPL-111; D-DIPL-36]
- DIPL-204 A demand shall be counted when the envoy arrives, from base −60 with *We cannot beat you*, *We have strong friends* and *It's our heartland* −30 for their capital, and answered by letter with its reasons. [DIPL-087, DIPL-111, DIPL-112]
- DIPL-205 When a province demand is given in to, the game shall hand the province to the asker with no war and no truce: its lord, any siege and occupation end, and the giver holds the wrong *Took our land* and a *Take land* aim on it. When a tribute demand is given in to, the target shall become the asker's Tributary. Either way the target holds *Threatened us*. [DIPL-113, DIPL-139; SUBJ-004]
- DIPL-206 Each month a Tributary shall send its overlord 15 % of its tax and trade at normal tribute while Loyal, shown as the *Tribute* line of both treasuries' ledgers; this holds for the Tributaries of 1444 too, and every other kind pays by SUBJ-111. [SUBJ-005, SUBJ-111; D-DIPL-36]
- DIPL-207 When an AI realm would declare war on a neighbour other than the player, it shall first demand tribute, or a border province other than their capital, when it can; it declares only after a demand was refused and waits while one is on its way. [DIPL-180; D-DIPL-36]

#### How the player uses it: demands
- DIPL-208 Where: another realm's card, Diplomacy tab, under the envoys, a *Make a demand* section (hidden at war). It says in one line what a demand costs and risks (*Threatened us*, the war aim on refusal, no calls for their allies), then shows *Demand tribute* with what tribute brings, and *Demand* followed by the province's name, one button for each of their provinces on your border (up to 8, their capital marked). When no demand can be made it shows why in place of the buttons (no envoy free, no reason, a subject tie). The answer comes as a letter with its *Why?*, like any envoy's. Grouping and overview: demands sit with the other envoys on the Diplomacy tab; a tributary's card says what it pays you, and the Treasury tab's *Tribute* line totals it. Phone: every button at least 44 points high in the Wide and Tall layouts, nothing that needs hover. [X-19, DIPL-185]

## 6. Commands

All commands are data, the same for player and AI.

| Command | Who | Preconditions | Result | Events emitted |
|---|---|---|---|---|
| SendEnvoy(action, target, official) | player / AI | free seat; action's needs; route exists (by sea if needed) | envoy on the road, dates fixed | EnvoySent |
| RecallEnvoy(envoy) | player / AI | envoy resident | envoy comes home | EnvoyRecalled |
| ProposeAlliance(target) | player / AI | via SendEnvoy; DIPL-094 | count on arrival | AnswerGiven, AnswerDelivered, AllianceFormed |
| CallToArms(ally, war, kind) | player / AI / system | Alliance, Pledge or League | answer a month later | CallToArmsIssued, CallToArmsAnswered, AllianceBroken, OathBroken |
| BreakAlliance(target) | player / AI | Alliance | ended | AllianceBroken, OathBroken, LedgerEntryAdded |
| MarkMobilisationPact(ally) | player / AI | Alliance; era VI | pact marked | MobilisationPactMarked |
| ArrangeMarriage(target, persons) | player / AI | DIPL-104 | count | MarriageArranged |
| MakeDemand(target, kind, object) | player / AI | DIPL-111 | count | DemandGivenIn / DemandRefused, WarAimGained, EnvoyHeld |
| AskPassage(target) | player / AI | G8; no war | count | PassageGranted |
| RevokePassage(grantee) | player / AI | passage granted | ended | PassageRevoked |
| OfferTradePact(target) / CancelTradePact | player / AI | no war | count / ended | TradePactSigned / TradePactEnded |
| DeclareEmbargo(target) | player / AI | no war | embargo | EmbargoDeclared |
| PledgeProtection(target) | player / AI | not at war; not own subject | pledge fact | ProtectionPledged |
| SwearPeace(target) | player / AI | no war | count | TruceCreated |
| BreakTruce(target) | player / AI | Truce | ended | TruceBroken, OathBroken |
| ExtendTruce(target, months) | player / AI | Truce; both agree | expiry later | TruceExtended |
| OfferOverlordship(target) / AskForProtection(target) | player / AI | DIPL-126/127 | count | SubjectByAgreementAgreed |
| CourtLord(lord) | player / AI | lord Wavering or Disloyal | seasonal effects | LordCourted, LordDefected, CourtingDiscovered |
| SendGift(target, gold) | player / AI | gold | tie | GiftReceived |
| CourtesyVisit(target) | player / AI | — | tie | CourtesyVisitMade |
| MakeResident(target) | player / AI | G8 | residence | ResidentInstalled |
| Insult(target) | player / AI | — | Hostile, wrong | Insulted, WarAimGained |
| DeclareRival(target, contested object) | player / AI | contested object | Rival | RivalDeclared |
| FundRebels(province, gold) / StopFunding | player / AI | DIPL-134 | funding | RebelFundingStarted, RebelFundingCaught |
| DeclareWar(target, aim) | player / AI | aim held; pacts broken; DIPL-152/153 | war | WarDeclared, CallToArmsIssued, LedgerEntryAdded |
| MakeSeparatePeace(enemy) | ally (player / AI) | over half own voices for peace | peace for that ally | SeparatePeaceMade |
| AdvanceDiplomacyMonth | system | — | arrivals, answers, rolls, expiries | see section 9 |
| RunYearlyChecks | system | — | fades, leagues | LeagueFormed, LeagueDissolved |

## 7. Domain events

| Event | When | Payload | Consumed by |
|---|---|---|---|
| EnvoySent | an envoy leaves | country, envoy, official, province left without official, target, action, arrival, return | province (official away), map-presentation |
| EnvoyArrived | arrival date | envoy, court | diplomacy |
| AnswerGiven | a count is made | asker, asked, action, reasons, total, yes/no | diplomacy (delivery) |
| AnswerDelivered | a month after AnswerGiven | the letter | game-shell, events (AI) |
| EnvoyHeld / EnvoyReturned / EnvoyLost | 2.4 cases | envoy, reason | province, realm |
| RelationChanged | any relation action | pair, old, new, origin | all readers of relations (warfare, troop-movement, trade, subjects, map-presentation, events) |
| AllianceFormed / AllianceBroken | 6.1 | pair | warfare, map-presentation |
| OathBroken | a pact broken, a defensive call or pledge refused | country, reason | realm (Oaths broken stat), events (`trust`) |
| LedgerEntryAdded | a tie or wrong added | holder, other, entry | events (`opinion`) |
| CallToArmsIssued / CallToArmsAnswered | 6.1, 7.2, 9 | caller, called, war, kind, answer | warfare |
| MarriageArranged | 6.2 | houses | realm (marriages) |
| PretenderPlaced / ClaimArisen | 6.2 | pretender, court, throne | realm, warfare |
| CrownInherited | 6.2 | realm, new ruler | subjects (union), realm (succession war) |
| DemandGivenIn / DemandRefused | 6.3 | demand | warfare, realm (lords) |
| WarAimGained / WarAimExpired | 7.1 | holder, target, aim, until | warfare |
| PassageGranted / PassageRevoked / PassageExpired | 6.4 | pair, until | troop-movement |
| TrespassWithoutPassage | 6.4 | army owner, country | warfare |
| TradePactSigned / TradePactEnded / EmbargoDeclared | 6.5 | pair | trade |
| ProtectionPledged | 6.6 | protector, protected | warfare |
| TruceCreated / TruceExtended / TruceBroken / TruceExpired | 6.6, 8 | pair, expiry | warfare |
| SubjectByAgreementAgreed | 6.7 | overlord, subject | subjects |
| LordCourted / LordDefected / CourtingDiscovered | 6.8 | lord, courting country | realm, rebellions |
| RebelFundingCaught | 6.11 | funder, target | revolutions |
| WarDeclared | 7.2 | declarer, target, aim, callers | warfare |
| LeagueFormed / LeagueMemberLeft / LeagueDissolved | 9 | X, members | warfare, map-presentation |
| MobilisationTriggered | 10 era VI | pact partners, war | events (shown as an event), warfare |
| WarWarning | resident warning | host, target | game-shell |

## 8. Policies (reactions to other contexts)

- When **warfare** reports a peace signed, then diplomacy creates the truce (DIPL-154), returns held envoys, and
  checks whether the peace returned provinces to league members (DIPL-163).
- When **warfare** reports a war ended for a pair, then diplomacy adds *Fought side by side* for countries on
  the same side (DIPL-102).
- When **warfare** reports a province taken, then diplomacy adds *Took our land* to the loser's ledger and
  **realm** counts Lands taken.
- When **realm** reports a ruler's death, then diplomacy runs claims and inherited crowns (DIPL-107, DIPL-110)
  and passes pretenders' claims (DIPL-109).
- When **realm** reports an official's death on the road, then diplomacy fails the mission (DIPL-069).
- When **rebellions** reports a country fallen to rebels, then its resident envoys flee home (DIPL-068).
- When **research** reports G5, G8 or T14 learned, then seats, residents, passage or instant missions open.
- When **religion** or **culture** change faith or culture, then *Same faith*, *Same culture group* and hostile
  faith entries are re-read.
- When **subjects** reports a subject's kind, then calls and the right to declare war follow it (DIPL-150, DIPL-152).
- When **events** fires an effect on `opinion`, `trust`, `notoriety`, `relation`, `war_aim`, `league` or
  `pretender`, then diplomacy applies DIPL-172 … DIPL-176.
- When **troop-movement** reports an army in a country without passage, then DIPL-119 applies.
- When **time-and-turns** reaches the start of an era, then the era rows apply (DIPL-165 … DIPL-170).

## 9. Monthly steps

Reads first: relations, soldiers under arms (realm/recruiting), lords' loyalty (realm), date and era
(time-and-turns), known inventions (research), borders and routes (world-map).
1. Deliver answer letters given last month (DIPL-082), including call-to-arms answers and caught funding.
2. Envoys whose arrival date falls in this month arrive; their asks are counted (or decided at once with T14);
   answers are stored for next month.
3. Charge monthly rebel funding and roll the caught chance (DIPL-137).
4. At each season end: resident tie +5 (DIPL-061), courting effects and discovery rolls (DIPL-128, DIPL-130).
5. Expire truces, passages and timed war aims; return envoys whose return date has come.
6. AI diplomacy: candidates and sends (DIPL-178 … DIPL-182).
7. Once a year: fade ledgers (DIPL-075), league checks (DIPL-157), relation decays (DIPL-040 … DIPL-042).
The steps run after subjects and government in the global order (X-2, D-DIPL-31).

## 10. Configuration

`diplomacy-rules.json` unless stated. Every number is a placeholder.

| Key | Meaning | Value in the design | Placeholder? | Config file |
|---|---|---|---|---|
| `envoys.seats.base` | Seats at start | 1 | yes | diplomacy-rules.json |
| `envoys.seats.extra_if_provinces_over` | Extra seat above n provinces | 10 provinces → +1 | yes | diplomacy-rules.json |
| `envoys.seats.inventions` | Seats from inventions | G5 +1, G8 +1 | yes | diplomacy-rules.json |
| `envoys.lord_loyalty_step_lost_if_mission_months_over` | Lord envoy loyalty loss | 12 | yes | diplomacy-rules.json |
| `envoys.days_per_crossing_unit` | Envoy speed | 2 | yes | diplomacy-rules.json |
| `envoys.months_at_court` | Time at court | 1 | yes | diplomacy-rules.json |
| `envoys.instant_if_both_know` / `instant_excludes` | Telegraph rule | T14; marriage, resident, courtesy visit | yes | diplomacy-rules.json |
| `envoys.official_type_bonus.*` | Type reasons | +10; gift ×1.25 | yes | diplomacy-rules.json |
| `envoys.years_served_bonus` | Years served | 10 years → +5 | yes | diplomacy-rules.json |
| `envoys.resident_years_bonus` | Resident years | 5 years → +5 | yes | diplomacy-rules.json |
| `envoys.resident.*` | Resident rules | G8; soldiers, treasury to 100, lord loyalty; warning 1 month | yes | diplomacy-rules.json |
| `envoys.held.refused_demand_by_hostile_chance` | Envoy held | 0.1 | yes | diplomacy-rules.json |
| `ledger.max_entries_per_pair` | Ledger cap | 12 | yes | diplomacy-rules.json |
| `ledger.stance_lines` | Stance weights | +50, +30, 0, −30, −75, −100, −10 | yes | diplomacy-rules.json (and relation-rules `modifiers`) |
| `ledger.ties.*` / `ledger.wrongs.*` | Ties and wrongs | section 4 tables | yes | diplomacy-rules.json |
| `ledger.standing_words` | Words | 100 / 30 / −29 / −99 / −200 | yes | diplomacy-rules.json |
| `reasons.standing_divisor` | Standing ÷ | 4 | yes | diplomacy-rules.json |
| `reasons.per_oath_broken` / `relies_on_word` | Oaths | −10; list | yes | diplomacy-rules.json |
| `reasons.strength.*` | Strength reasons | 0.5; ±10 to ±40; +15 to +60; −0.5; −30 | yes | diplomacy-rules.json |
| `reasons.distance.*` | Distance | −15; 60 days → −15 | yes | diplomacy-rules.json |
| `reasons.share_an_enemy` | | +25 | yes | diplomacy-rules.json |
| `reasons.frontier_threat_per_province` | | −5 | yes | diplomacy-rules.json |
| `reasons.allies_beyond_free` | | 2 free; −10 | yes | diplomacy-rules.json |
| `reasons.ruler_traits` | | Pious +10, Warlike −10, Greedy +10 | yes | diplomacy-rules.json |
| `actions.propose_alliance.base` | | −40 | yes | diplomacy-rules.json |
| `actions.call_to_arms.*` | Calls | −20 / −50; +30; −10 to −40; 0.5 | yes | diplomacy-rules.json |
| `actions.arrange_marriage.*` | | −15; +10; −10; 0.1 | yes | diplomacy-rules.json |
| `actions.demand.*` | | −60; −30; 5 years; +20 | yes | diplomacy-rules.json |
| `actions.ask_passage.*` | | −10; 24 months; −40; +20; G8 | yes | diplomacy-rules.json |
| `actions.trade_pact.base` | | −10 | yes | diplomacy-rules.json |
| `actions.swear_peace.*` | | −20; 120 months; +10; −30 | yes | diplomacy-rules.json |
| `actions.offer_overlordship.*` | | −80; +20; +20; −10 | yes | diplomacy-rules.json |
| `actions.ask_protection.base` | | −10 | yes | diplomacy-rules.json |
| `actions.court_lord.*` | | 1 step a season; 12 months; border; 0.25 | yes | diplomacy-rules.json |
| `actions.fund_rebels.*` | | 1 % of the target's yearly income; 1 sign; 0.03; 5 years (X-10) | yes | diplomacy-rules.json |
| `ledger.standing_limit` | | 200 (D-DIPL-19) | yes | diplomacy-rules.json |
| `envoys.passage_denied_blocks_months` | | 24 (D-DIPL-21) | yes | diplomacy-rules.json |
| `eras.VI.pact_offensive_call_bonus` | | 10 (D-DIPL-11) | yes | diplomacy-rules.json |
| `war_aims.*` | | 50 years; 5 years; 5 years; ×3; regency defensive + raid | yes | diplomacy-rules.json |
| `truce.*` | Truce after peace | 60 + 60 months; white 60 | yes | diplomacy-rules.json |
| `leagues.*` | Leagues | yearly; 8/8/8/6/6/4/4; −30; ÷−4; +10; +3; ±10; +5; −10; 2; 0.5 | yes | diplomacy-rules.json |
| `eras.*` | Era rows | section 4 | yes | diplomacy-rules.json |
| `ai.*` | AI | horizon; 5; −20; postures; negotiation | yes | diplomacy-rules.json |
| `event_tree_mapping.*` | Events | section 5.21 | yes | diplomacy-rules.json |
| `answers.delay_months` / `preview_before_sending` | Answers | 1; false | decided | diplomacy-rules.json |
| `default_stance`, `implied_stance` | Stance defaults | neutral; war → hostile, alliance → friendly | game rule | relation-rules.json |
| `types.friendly.duration.decay_months` | | 240 | yes | relation-rules.json |
| `types.rival.duration.min_months_before_change` | | 120 | yes | relation-rules.json |
| `types.hostile.duration.decay_months` | | 120 → rival | yes | relation-rules.json |
| `types.at_war.duration.war_exhaustion_peace_months` | | 60 | yes | relation-rules.json |
| `types.truce.duration.default_months` | | 60 (X-11, D-DIPL-3) | yes | relation-rules.json |
| `modifiers.hostile.border_raid_chance_per_month` | | 0.02 | yes | relation-rules.json |
| `modifiers.*` other keys | AI weights, trade access, fact weights | retired except the stance weights (D-DIPL-6) | yes | relation-rules.json |
| `compatibility`, `precedence`, `actions` | Matrix, order, actions | section 4 | rule | relation-rules.json |
| `subject_kinds`, `autonomy_levels` | Eight kinds, five levels | section 4 | rule | relation-rules.json |

## 11. Seams

| Other context | Direction | Pattern | What crosses |
|---|---|---|---|
| realm | upstream | Customer–Supplier | Province count (seats follow at once, D-DIPL-13), yearly income (funding cost), officials' types and years, ruler, heirs, traits, marriages, lords and their loyalty / Wants, soldiers under arms, Oaths broken and Lands taken stats; diplomacy reports OathBroken, LordDefected, CrownInherited, envoys card line |
| province | downstream | Customer–Supplier | Province loses its official while the envoy is away (it runs as if it had none, D-DIPL-12) |
| research | upstream | Conformist | G5, G8, T14 known |
| warfare | downstream | Partnership | War aims (diplomacy says how held, warfare what winning means), calls to arms, declarations, peace voices, peace terms, truce length, held envoys, separate peace |
| subjects | downstream | Customer–Supplier | Subject relation records (diplomacy stores; kinds mapped onto the six kinds by subjects, X-8); diplomacy uses the subjects kind rules for joining wars and own diplomacy (D-DIPL-10); calls to Vassals and Protectorates are answered by subjects by loyalty; subjects by agreement (count here, kind there, D-DIPL-32); *Break a subject* against the overlord (D-DIPL-8) |
| troop-movement | downstream | Published Language | Passage yes/no per pair, ends the day revoked; route graph and crossing units for envoys |
| naval | upstream | Conformist | Sea-zone travel times for envoys; the sea zones a realm touches (notoriety knowers, D-DIPL-26) |
| world-map | upstream | Conformist | Borders, neighbours, route graph |
| trade | downstream | Published Language | Trade pact (no tolls), embargo (closed paths), war stops trade |
| rebellions | downstream | Customer–Supplier | Country fallen to rebels (residents go home); no funding grievances (D-DIPL-23) |
| revolutions | upstream / downstream | Partnership | Signs lit on the revolution card (funding needs one); diplomacy sets `revolution_funded`; a won revolution gives *Backed our revolution*; émigré pretenders; *Different form of rule* reason row (X-10, D-DIPL-23) |
| religion | upstream | Conformist | Same faith, hostile faiths, tolerance for marriage, persecution flag |
| culture | upstream | Conformist | Same culture group, homelands, accepted cultures |
| government | upstream | Customer–Supplier | Regency; envoys are officials already counted in the cap (D-DIPL-24) |
| national-strengths | upstream | Open Host Service | Extra reason rows, extra seat, unique war aims |
| events | upstream | Published Language | `opinion`, `trust`, `notoriety`, `relation`, new effects `war_aim`, `league`, `pretender`; mobilisation event |
| scenario-setup | upstream | Published Language | relations-1444 dataset, catalogue ids, AI personalities, Italian states with G8 |
| time-and-turns | upstream | Conformist | Week turn, months, seasons, years, eras, turn order (X-2: after subjects and government, D-DIPL-31) |
| map-presentation | downstream | Published Language | Diplomacy lens colours, envoy riders, war-aim icon |
| game-shell | downstream | Published Language | Country diplomacy card, envoy picker, envoys strip, war declaration sheet, answer letters |

## 12. AI

- Uses exactly the section 5 counts; posture and negotiation level add reason rows (DIPL-177).
- Each month with a free seat: up to 5 candidates per free seat within its horizon; estimates under the
  player's limits; sends the best over-zero request; sends a gift first when the best is −20 or better
  (DIPL-178, DIPL-179).
- Tries a demand before war unless Opportunist and the target's armies are away (DIPL-180).
- Answers the player with the same count (DIPL-181).
- Opportunists and hegemon seekers fund the revolution of a Rival whose card shows at least one sign (DIPL-182, D-DIPL-23).
- Postures: Bandwagoners seek the strongest neighbour and ask for protection; Opportunists court lords and
  join the stronger side; Isolationists avoid alliances and calls, favour sworn peace and trade pacts;
  Balancers join leagues against the strong; Client seekers seek a protector; Hegemon seekers make demands and
  offer pledges and overlordship to small neighbours (section 4 Posture rows).
- Relation-level AI weights in relation-rules are retired (D-DIPL-34); only the forced peace after 60 months stays.

## 13. Decisions and open questions

- **D-DIPL-1** (was OQ-DIPL-1) Action count: the section 6 table is canonical; its rows name the command set and "fifteen" or "fourteen" is only a count in prose. One list is simpler than reconciling two numbers.
- **D-DIPL-2** (was OQ-DIPL-2) Refusing an offensive call: breaks nothing and adds no tie or wrong; only a refused defensive call breaks the alliance (Oath broken, *Abandoned us* −30). Diplomacy 6.1 is the latest text.
- **D-DIPL-3** (was OQ-DIPL-3) Truce length: 5 years (60 months), +5 years if land changed hands or a subject was made; a white peace gives 5 years. X-11 decides it.
- **D-DIPL-4** (was OQ-DIPL-4) Insult: the insulted side's stance toward the insulter becomes Hostile, and any Friendly stance between them ends. Diplomacy 6.10 says "their" stance, and the insulted side is the one with the grievance.
- **D-DIPL-5** (was OQ-DIPL-5) Provoked war: when A declares war on B after B refused A's demand, B's allies and pledgers get no defensive call, A's offensive calls get "They refused a fair demand" +20, and A's lords who are not Warlike don't waver. There is no defensive +20 to remove, so the rule becomes "no defensive call".
- **D-DIPL-6** (was OQ-DIPL-6) Old relation-rules modifiers: only the stance weights survive; the call, alliance and trade weights, the rival reward, the truce-breaking costs, the subject restlessness keys, the old casus belli keys, `shared_ruler` and `religious_authority` are retired. The reasons count replaced them.
- **D-DIPL-7** (was OQ-DIPL-7) Relation-rules additions: the fact `protection_pledge` and the actions swear peace, grant passage, revoke passage, embargo, demand and court a lord are adopted in the diplomacy data. The engine already runs them.
- **D-DIPL-8** (was OQ-DIPL-8) Break a subject: the target is the overlord; the aim is held while one of its subjects is Hostile toward it or asked you for help. Diplomacy 7.1 is the latest text, and the subject is freed by beating its master.
- **D-DIPL-9** (was OQ-DIPL-9) War with no aim: both rules apply. Every province taken counts toward Lands taken, lords waver, allies need not join, and every neighbour gains *Threatened us*. The two rules don't conflict.
- **D-DIPL-10** (was OQ-DIPL-10) Subjects in wars: the six subject kinds decide. A Union joins at once. A Vassal or Protectorate is called and answers by loyalty. A March joins when the enemy borders it. A Tributary never joins and a Colony only defends itself. Union, Colony and Protectorate cannot declare war, and a Vassal cannot declare war on its overlord's allies. X-8 decides it.
- **D-DIPL-11** (was OQ-DIPL-11) Pact bonus: +10 to offensive calls between mobilisation pact partners (`eras.VI.pact_offensive_call_bonus`, provisional), from era VI only. Pacts exist only from era VI.
- **D-DIPL-12** (was OQ-DIPL-12) Envoy's empty province: diplomacy 2.1 governs. The province runs as if it had no official, the stat is "Envoy seats", and court officials are not a separate source of envoys. One rule is simpler.
- **D-DIPL-13** (was OQ-DIPL-13) Seat boundary: the size seat is held while the realm has more than 10 provinces (10 is not enough). When seats fall below envoys abroad, missions finish and residents beyond the seats are recalled, newest first. One threshold both ways.
- **D-DIPL-14** (was OQ-DIPL-14) Hungary's seats: the example stands; Hungary does not know G5 in 1444 and has 2 seats. The worked example is the design's own data.
- **D-DIPL-15** (was OQ-DIPL-15) Rounding: divisions round toward zero (+10 ÷ 4 = +2, −10 ÷ 4 = −2). It matches the worked example.
- **D-DIPL-16** (was OQ-DIPL-16) Strength multiples: whole multiples (floor of the ratio), so between 1 and 2 times is one multiple. At equal strength neither reason applies. Allies count at half their soldiers. It matches the Venice example.
- **D-DIPL-17** (was OQ-DIPL-17) *You threaten our frontier*: −5 per province you took that borders the asked country, in every count it makes. Section 5.3 is the fuller rule.
- **D-DIPL-18** (was OQ-DIPL-18) Actions that rely on your word: alliance, swear peace, marriage, trade pact and offer overlordship. Pledge protection is dropped (it has no count), and calls and asks for protection are not included. The config list minus the dead entry.
- **D-DIPL-19** (was OQ-DIPL-19) Ledger details: standing is clamped to −200…+200 (`ledger.standing_limit`, provisional); the state line replaces the implied stance; "smallest" means smallest by size; Old matters does not fade; *Married houses* keeps its +30 cap in era IV. It is the simplest reading.
- **D-DIPL-20** (was OQ-DIPL-20) Telegraph: only marriages and residents still travel, so courtesy visits become instant. The design text wins over the config.
- **D-DIPL-21** (was OQ-DIPL-21) Denied passage: a refused or a revoked passage blocks the asker's envoys over that land for 2 years (`envoys.passage_denied_blocks_months` 24, provisional); never having granted passage is not a denial. A clear trigger and an end.
- **D-DIPL-22** (was OQ-DIPL-22) Missing commands: lifting an embargo, stopping rebel funding and marking or unmarking a mobilisation pact (era VI, either ally) are free and instant. Withdrawing a pledge is an Oath broken. A Rival may be dropped after 10 years. A resident may be recalled at any time, but an envoy on a mission cannot. These reuse rules that already exist.
- **D-DIPL-23** (was OQ-DIPL-23) Rebel funding: one action, *Fund rebels*, on a target whose revolution card shows at least one sign. It costs 1 % of the target's yearly income a month (provisional) and sets `revolution_funded`. It is caught at 3 % a month (provisional): the envoy is held, *Stirred revolt in our land* −50 fading over 20 years, and the target holds Punish for 5 years. If the revolution wins, the new regime holds *Backed our revolution* +25. The province-level grievances are dropped. X-10 decides it.
- **D-DIPL-24** (was OQ-DIPL-24) Edits to other designs: no *Foreign agitators* or *Foreign meddling* grievance (D-DIPL-23); G8 unlocks passage (research data already says so); vocabulary keys `war_aim`, `league`, `pretender` and the derived `trust`/`notoriety` are this context's to define; envoys don't count toward the officials cap (an envoy is an official already counted). Each one only states what this context already does.
- **D-DIPL-25** (was OQ-DIPL-25) Event leagues: no minimum membership and no Lands-taken dissolution; they end only by event or by a peace that gives provinces back to a member. An event league was not made by the threshold.
- **D-DIPL-26** (was OQ-DIPL-26) Notoriety: min(100, 5 × Lands taken + the event notoriety still unfaded, each point fading over 30 years). The countries that know of it are those sharing a border, a sea zone or a trade pact with the actor. The actor's own deeds count as positive numbers.
- **D-DIPL-27** (was OQ-DIPL-27) Old stat words: a Rival's "prestige" becomes "wars against a Rival please your lords", and breaking a truce costs an Oath broken. Both stats already exist in this project.
- **D-DIPL-28** (was OQ-DIPL-28) The 1444 dataset wins over the catalogue for relations, and the engine reads it as it stands. The catalogue and scenario-setup owners reconcile their files. A single source of truth.
- **D-DIPL-29** (was OQ-DIPL-29) Envoy speed: 2 days per crossing unit by land (provisional), naval times by sea. It is the number already in the data.
- **D-DIPL-30** (was OQ-DIPL-30) Stopped funding: when funding stops without being caught, the owner is told nothing. It is a secret action.
- **D-DIPL-31** (was OQ-DIPL-31) Month order: X-2 sets it. Diplomacy runs after subjects and government; answers are given in the month and delivered the next (X-18); AI orders come after the player's.
- **D-DIPL-32** (was OQ-DIPL-32) Subject asks: diplomacy's counts decide *Offer overlordship* and *Ask for protection*; the subjects context then picks the kind (Tributary, or Vassal when the small country asked). Tighten, Fold in and Station a resident use an envoy's time; *Courted* is a foreign envoy stationed at the subject's court. One count for every ask.
- **D-DIPL-33** (was OQ-DIPL-33) The declaration sheet: Serbia is a tributary and does not join; the sheet shows it as "tributary, does not join". X-8 decides it.
- **D-DIPL-34** (was OQ-DIPL-34) Old AI weights: retired; the AI uses only the reasons count. Diplomacy 12 is the latest text.
- **D-DIPL-35** First game slice of envoys (milestone 5, provisional): an envoy is an unnamed "Envoy of" the realm, not a named official, so no province loses its official yet; routes are one land leg of the capitals' map distance ÷ 6; every realm has 2 unmarried children until families exist; the gift is 30 gold; AI courts consider their envoys once a year, asking only the neighbour that thinks best of them, so a large map's month stays cheap; counting a far court's distance stores no route, only a sent envoy does; the library's event log is not kept, letters are kept two years and envoys home a year. Quick defaults so the game can play statecraft now; each is replaced when its context lands.
- **D-DIPL-36** Second game slice, demands (milestone 5, provisional): only *Hand over a province* and *Pay tribute* run; *Pay tribute* given in makes the target a Tributary that pays 15 % of its tax and trade each month (the subjects context's Tributary share, SUBJ-005), and the 1444 Tributaries pay it too; AI realms demand before war only of other AI realms, because answering a demand is not yet on the player's screen; a province given in moves at once when the envoy is answered, and the letter follows a month later. Quick defaults so demands play now.

## 14. Traceability

<!-- TRACE -->
| Requirement | Feature file | Scenario |
|---|---|---|
| DIPL-001 | relation-model.feature | Overlord is read from a Subject record, never stored |
| DIPL-001 | relation-model.feature | A stored Overlord record is rejected |
| DIPL-002 | relation-model.feature | One state relation per pair |
| DIPL-002 | relation-model.feature | Two stances in one perspective are rejected |
| DIPL-003 | relation-actions.feature | A disloyal subject breaks free and changes overlord |
| DIPL-003 | relation-actions.feature | One overlord at a time |
| DIPL-003 | relation-model.feature | A country has one direct overlord |
| DIPL-003 | relation-model.feature | Subject chains are allowed but cycles are not |
| DIPL-004 | relation-model.feature | A mutual relation stored again in reverse is a duplicate |
| DIPL-004 | relation-model.feature | A one-way stance conflicting with a mutual one is rejected |
| DIPL-005 | relation-model.feature | Implied stance when none is stored |
| DIPL-006 | relation-model.feature | A missing pair is not a historical claim |
| DIPL-007 | relation-model.feature | Forbidden combinations of the exclusivity matrix |
| DIPL-008 | relation-model.feature | Redundant combinations only warn |
| DIPL-009 | relation-model.feature | Combinations allowed only with a note |
| DIPL-010 | relation-model.feature | Two stances in one perspective are rejected |
| DIPL-010 | relation-model.feature | Different stances from opposite perspectives are allowed |
| DIPL-011 | relation-model.feature | Conflicting historical records are never silently fixed |
| DIPL-012 | relation-model.feature | The newest action wins unless blocked, and same-tick effects follow precedence |
| DIPL-013 | relation-model.feature | The newest action wins unless blocked, and same-tick effects follow precedence |
| DIPL-013 | relation-model.feature | The precedence order |
| DIPL-014 | gifts-insults-rivals.feature | Declaring a rival needs a contested object |
| DIPL-014 | relation-model.feature | A rivalry needs a contested object |
| DIPL-015 | relation-model.feature | Facts feed reasons and never make or block a relation |
| DIPL-016 | relation-model.feature | Gameplay relations never flow back into the dataset |
| DIPL-017 | relation-model.feature | A locked relation changes only by scripted event |
| DIPL-018 | relation-model.feature | Date checks against the reference date 1444-11-11 |
| DIPL-019 | relation-model.feature | A stored Overlord record is rejected |
| DIPL-019 | relation-model.feature | A mutual relation stored again in reverse is a duplicate |
| DIPL-019 | relation-model.feature | A one-way stance conflicting with a mutual one is rejected |
| DIPL-019 | relation-model.feature | Other invalid records |
| DIPL-020 | relation-model.feature | The historical 1444 start is a valid game state |
| DIPL-021 | relation-model.feature | Diplomacy adds no relation type |
| DIPL-022 | relation-actions.feature | After Varna: peace, a truce, and a broken truce |
| DIPL-022 | relation-actions.feature | You cannot stab an ally without breaking the alliance first |
| DIPL-022 | relation-actions.feature | A subject cannot declare war on its overlord |
| DIPL-023 | relation-actions.feature | An overlord cannot declare war on its own subject |
| DIPL-024 | relation-actions.feature | Declaring war ends friendship and sets hostility where nothing was stored |
| DIPL-025 | relation-actions.feature | A disloyal subject breaks free and changes overlord |
| DIPL-025 | relation-actions.feature | An overlord's victory restores the subject |
| DIPL-026 | relation-actions.feature | After Varna: peace, a truce, and a broken truce |
| DIPL-027 | relation-actions.feature | A white peace cools hostility into rivalry |
| DIPL-028 | relation-actions.feature | Truce of Tours: extension and expiry |
| DIPL-028 | relation-actions.feature | A truce can only be extended if one exists |
| DIPL-029 | relation-actions.feature | After Varna: peace, a truce, and a broken truce |
| DIPL-030 | relation-actions.feature | Truce of Tours: extension and expiry |
| DIPL-031 | relation-actions.feature | Enemies need reconciliation before an alliance |
| DIPL-031 | relation-actions.feature | Alliance is blocked by war or a subject tie |
| DIPL-032 | relation-actions.feature | Enemies need reconciliation before an alliance |
| DIPL-033 | alliances-and-calls.feature | Breaking an alliance |
| DIPL-033 | relation-actions.feature | You cannot stab an ally without breaking the alliance first |
| DIPL-034 | relation-actions.feature | A disloyal subject breaks free and changes overlord |
| DIPL-034 | relation-actions.feature | Subjection carries antagonism with a note |
| DIPL-035 | relation-actions.feature | One overlord at a time |
| DIPL-036 | gifts-insults-rivals.feature | An insult |
| DIPL-036 | relation-actions.feature | An insult sets a Hostile stance and ends friendship |
| DIPL-037 | relation-actions.feature | Enemies need reconciliation before an alliance |
| DIPL-037 | relation-actions.feature | Improving relations moves one step |
| DIPL-038 | relation-actions.feature | A destroyed country loses all relations |
| DIPL-039 | relation-actions.feature | After Varna: peace, a truce, and a broken truce |
| DIPL-040 | relation-actions.feature | Stance durations |
| DIPL-041 | relation-actions.feature | Stance durations |
| DIPL-042 | relation-actions.feature | Stance durations |
| DIPL-043 | relation-actions.feature | The AI is forced to accept peace after long exhaustion |
| DIPL-044 | relation-actions.feature | War stops trade between the pair |
| DIPL-045 | relation-actions.feature | Hostility allows border raids |
| DIPL-046 | relation-actions.feature | A historical truce keeps its recorded term |
| DIPL-047 | envoys.feature | An envoy is an official taken from his province |
| DIPL-048 | envoys.feature | Envoy seats |
| DIPL-049 | envoys.feature | Falling to 10 provinces loses the size seat, not invention seats |
| DIPL-050 | envoys.feature | No free seat, no envoy |
| DIPL-051 | envoys.feature | Official type bonus |
| DIPL-051 | envoys.feature | Stewards and tax collectors make gifts count more |
| DIPL-051 | reasons-count.feature | A gift and a Marshal turn the no into a yes |
| DIPL-052 | envoys.feature | Years served add to the envoy's reason |
| DIPL-053 | envoys.feature | A long resident is trusted at his court |
| DIPL-054 | envoys.feature | Countries without officials send a lord or elder |
| DIPL-055 | envoys.feature | The road: two days per crossing unit and a month at court |
| DIPL-055 | envoys.feature | Sea legs use the naval travel times |
| DIPL-056 | envoys.feature | The road: two days per crossing unit and a month at court |
| DIPL-057 | envoys.feature | Envoys avoid hostile land unless by sea |
| DIPL-058 | envoys.feature | Telegraphy makes missions instant |
| DIPL-059 | envoys.feature | An envoy does one task |
| DIPL-059 | envoys.feature | A mission is decided on arrival and the envoy comes home |
| DIPL-060 | envoys.feature | Residents need G8 |
| DIPL-060 | envoys.feature | The resident tie grows each season and fades after |
| DIPL-061 | envoys.feature | The resident tie grows each season and fades after |
| DIPL-062 | envoys.feature | A resident sees the host's court |
| DIPL-063 | envoys.feature | A resident carries missions without travel |
| DIPL-064 | envoys.feature | A resident warns of war a month ahead |
| DIPL-065 | envoys.feature | A courtesy visit |
| DIPL-066 | envoys.feature | When an envoy is lost |
| DIPL-067 | envoys.feature | A demand refused by a Hostile country may cost the envoy |
| DIPL-068 | envoys.feature | A resident flees a court fallen to rebels |
| DIPL-069 | envoys.feature | When an envoy is lost |
| DIPL-070 | envoys.feature | When an envoy is lost |
| DIPL-070 | peace-and-truces.feature | The envoy carrying a peace is never held |
| DIPL-071 | ledger-and-standing.feature | Venice's standing toward Hungary in 1444 |
| DIPL-072 | ledger-and-standing.feature | Venice's standing toward Hungary in 1444 |
| DIPL-072 | ledger-and-standing.feature | The stance line |
| DIPL-073 | ledger-and-standing.feature | Ties |
| DIPL-073 | ledger-and-standing.feature | Austria's claim weighs on Hungary in 1444 |
| DIPL-074 | ledger-and-standing.feature | Wrongs |
| DIPL-075 | ledger-and-standing.feature | Fading in equal yearly steps |
| DIPL-076 | ledger-and-standing.feature | The ledger holds at most 12 entries |
| DIPL-077 | ledger-and-standing.feature | Standing words |
| DIPL-078 | ledger-and-standing.feature | Oaths broken count against you everywhere |
| DIPL-079 | ledger-and-standing.feature | Lands taken weigh in neighbours' alliance counts |
| DIPL-080 | ledger-and-standing.feature | The country card diplomacy line |
| DIPL-081 | reasons-count.feature | Hungary asks Venice for an alliance and is refused |
| DIPL-081 | reasons-count.feature | A gift and a Marshal turn the no into a yes |
| DIPL-081 | reasons-count.feature | Over zero is yes |
| DIPL-082 | diplomacy-screen.feature | The country diplomacy card of Venice |
| DIPL-082 | reasons-count.feature | No preview, the answer arrives a month after it is given |
| DIPL-082 | reasons-count.feature | Action buttons show no prediction |
| DIPL-083 | reasons-count.feature | What the asker can see before asking |
| DIPL-084 | reasons-count.feature | Hungary asks Venice for an alliance and is refused |
| DIPL-084 | reasons-count.feature | Ruler traits add reasons |
| DIPL-084 | reasons-count.feature | Personality rows stay within -30 to +30 |
| DIPL-085 | reasons-count.feature | Strength in binding asks |
| DIPL-086 | reasons-count.feature | Hungary asks Venice for an alliance and is refused |
| DIPL-086 | reasons-count.feature | Strength in binding asks |
| DIPL-087 | reasons-count.feature | Strength in demands |
| DIPL-088 | reasons-count.feature | Already at war |
| DIPL-089 | reasons-count.feature | Distance |
| DIPL-090 | reasons-count.feature | Hungary asks Venice for an alliance and is refused |
| DIPL-090 | reasons-count.feature | We share an enemy |
| DIPL-091 | reasons-count.feature | You threaten our frontier |
| DIPL-092 | reasons-count.feature | Hungary asks Venice for an alliance and is refused |
| DIPL-092 | reasons-count.feature | We already have allies |
| DIPL-093 | reasons-count.feature | Each action adds at most two reasons of its own |
| DIPL-094 | alliances-and-calls.feature | Proposing an alliance needs peace, no hostility and no subject tie |
| DIPL-094 | alliances-and-calls.feature | An agreed alliance replaces a truce |
| DIPL-095 | alliances-and-calls.feature | Defensive calls go out when you are attacked |
| DIPL-096 | alliances-and-calls.feature | Refusing a defensive call breaks the alliance |
| DIPL-097 | alliances-and-calls.feature | Refusing an offensive call breaks nothing |
| DIPL-098 | alliances-and-calls.feature | The call count |
| DIPL-099 | alliances-and-calls.feature | Defensive calls go out when you are attacked |
| DIPL-099 | alliances-and-calls.feature | Calls are instant and answered a month later |
| DIPL-100 | alliances-and-calls.feature | An ally fights its own war |
| DIPL-101 | alliances-and-calls.feature | A separate peace |
| DIPL-102 | alliances-and-calls.feature | Ties from fighting together |
| DIPL-103 | alliances-and-calls.feature | Breaking an alliance |
| DIPL-104 | marriages-and-pretenders.feature | A marriage needs a free heir or child on each side |
| DIPL-104 | marriages-and-pretenders.feature | Houses of hostile faiths need the tolerance rule |
| DIPL-105 | marriages-and-pretenders.feature | The marriage count's own reasons |
| DIPL-106 | marriages-and-pretenders.feature | A marriage is agreed |
| DIPL-107 | marriages-and-pretenders.feature | A heirless death may raise a claim |
| DIPL-108 | marriages-and-pretenders.feature | Where pretenders come from |
| DIPL-108 | war-aims.feature | Austria holds Seat a pretender against Hungary in 1444 |
| DIPL-109 | marriages-and-pretenders.feature | When a pretender dies |
| DIPL-110 | marriages-and-pretenders.feature | Inheriting a crown |
| DIPL-111 | demands.feature | What a demand needs |
| DIPL-111 | demands.feature | The demand count |
| DIPL-112 | demands.feature | The demand count |
| DIPL-113 | demands.feature | Giving in |
| DIPL-114 | demands.feature | Refusing gives a war aim for 5 years |
| DIPL-115 | demands.feature | A war after a refused demand is provoked by the target |
| DIPL-116 | passage.feature | Who may enter a foreign country |
| DIPL-117 | passage.feature | Asking for passage needs G8 |
| DIPL-117 | passage.feature | The passage count |
| DIPL-118 | passage.feature | Passage lasts two years and may be revoked |
| DIPL-119 | passage.feature | Entering without passage is an act of war |
| DIPL-120 | trade-pacts-and-embargoes.feature | A trade pact |
| DIPL-120 | trade-pacts-and-embargoes.feature | A trade pact ends |
| DIPL-120 | trade-pacts-and-embargoes.feature | Pacts and embargoes need peace |
| DIPL-121 | trade-pacts-and-embargoes.feature | An embargo |
| DIPL-121 | trade-pacts-and-embargoes.feature | Pacts and embargoes need peace |
| DIPL-122 | pledges-and-sworn-peace.feature | Pledging protection |
| DIPL-122 | pledges-and-sworn-peace.feature | A pledge is a fact, not a relation |
| DIPL-123 | pledges-and-sworn-peace.feature | A pledge becomes a defensive call |
| DIPL-124 | pledges-and-sworn-peace.feature | Swearing peace |
| DIPL-124 | pledges-and-sworn-peace.feature | A sworn peace is a ten-year truce |
| DIPL-125 | pledges-and-sworn-peace.feature | Breaking a sworn peace |
| DIPL-126 | subjects-by-agreement.feature | Offering overlordship |
| DIPL-126 | subjects-by-agreement.feature | The subjects context picks the kind |
| DIPL-127 | subjects-by-agreement.feature | Asking a stronger country for protection |
| DIPL-128 | courting-lords.feature | Only Wavering or Disloyal lords can be courted |
| DIPL-128 | courting-lords.feature | Each season the lord's loyalty drops |
| DIPL-129 | courting-lords.feature | A courted Disloyal lord on the border defects |
| DIPL-130 | courting-lords.feature | Courting is discovered |
| DIPL-131 | gifts-insults-rivals.feature | Gifts |
| DIPL-131 | reasons-count.feature | A gift and a Marshal turn the no into a yes |
| DIPL-132 | gifts-insults-rivals.feature | An insult |
| DIPL-133 | gifts-insults-rivals.feature | Declaring a rival needs a contested object |
| DIPL-134 | funding-rebels.feature | What funding needs |
| DIPL-134 | funding-rebels.feature | Funding is secret |
| DIPL-136 | funding-rebels.feature | Funding an émigré pretender |
| DIPL-137 | funding-rebels.feature | The chance of being caught |
| DIPL-138 | funding-rebels.feature | Caught |
| DIPL-139 | war-aims.feature | Holding Take land |
| DIPL-139 | war-aims.feature | Land held too long ago gives no aim |
| DIPL-140 | war-aims.feature | Austria holds Seat a pretender against Hungary in 1444 |
| DIPL-141 | war-aims.feature | Holding Tribute |
| DIPL-142 | war-aims.feature | Holding Free a people |
| DIPL-143 | war-aims.feature | Holding Break a subject against the overlord |
| DIPL-144 | war-aims.feature | Holding Defend the faith |
| DIPL-145 | war-aims.feature | Holding Punish for 5 years |
| DIPL-146 | war-aims.feature | Raid and No aim are always held |
| DIPL-147 | war-aims.feature | Events and national strengths grant aims |
| DIPL-148 | declaring-war.feature | Hungary prepares to declare war on the Ottomans |
| DIPL-148 | declaring-war.feature | A war needs exactly one held aim |
| DIPL-149 | declaring-war.feature | Pacts must be broken first |
| DIPL-150 | declaring-war.feature | Calls go out the same turn |
| DIPL-151 | declaring-war.feature | Everyone sees the aim; a war with no aim threatens the neighbours |
| DIPL-152 | declaring-war.feature | Subjects without their own diplomacy cannot declare war |
| DIPL-153 | declaring-war.feature | A regency fights only defensive wars and raids |
| DIPL-154 | peace-and-truces.feature | Truce length after a peace |
| DIPL-155 | peace-and-truces.feature | Both sides may extend a truce |
| DIPL-156 | peace-and-truces.feature | Many-sided peace |
| DIPL-157 | eras.feature | The league threshold falls |
| DIPL-157 | leagues.feature | Who is asked to join, once a year |
| DIPL-157 | leagues.feature | Who is not asked |
| DIPL-158 | leagues.feature | The league count |
| DIPL-158 | leagues.feature | Bandwagoners are pushed out by strength |
| DIPL-159 | leagues.feature | A league needs two members |
| DIPL-160 | leagues.feature | A league answers only X's attacks |
| DIPL-161 | leagues.feature | A league gives no other protection |
| DIPL-162 | leagues.feature | The conqueror sees the league |
| DIPL-163 | leagues.feature | A league dissolves |
| DIPL-164 | leagues.feature | An event starts a league regardless of the threshold |
| DIPL-165 | envoys.feature | Residents need G8 |
| DIPL-165 | eras.feature | Era I: no residents except the Italian states |
| DIPL-166 | eras.feature | The Peace of Westphalia unlocks many-sided peace early |
| DIPL-166 | peace-and-truces.feature | Many-sided peace |
| DIPL-167 | eras.feature | Married houses weigh less from era IV |
| DIPL-168 | eras.feature | Offensive calls between pact partners |
| DIPL-169 | eras.feature | A mobilisation pact answers a defensive call by itself |
| DIPL-169 | eras.feature | Mobilisation pacts need era VI |
| DIPL-170 | eras.feature | Era VII gifts count half |
| DIPL-171 | eras.feature | A revolution adds a reason row |
| DIPL-172 | event-mapping.feature | Opinion effects become ledger entries |
| DIPL-173 | event-mapping.feature | Trust is derived from oaths broken |
| DIPL-173 | event-mapping.feature | Lowering trust adds an oath broken |
| DIPL-174 | event-mapping.feature | Notoriety is derived and written as a notorious deed |
| DIPL-175 | event-mapping.feature | Relation effects use the engine's actions |
| DIPL-175 | event-mapping.feature | An event cannot make allies fight without breaking the alliance |
| DIPL-176 | event-mapping.feature | New effects |
| DIPL-177 | diplomacy-ai.feature | Posture rows |
| DIPL-177 | diplomacy-ai.feature | Opportunists weigh broken oaths lightly |
| DIPL-177 | diplomacy-ai.feature | Negotiation level |
| DIPL-177 | diplomacy-ai.feature | Very high negotiators value gifts more |
| DIPL-178 | diplomacy-ai.feature | Candidate actions within the horizon |
| DIPL-179 | diplomacy-ai.feature | The AI sends its best estimated yes, or a gift first |
| DIPL-179 | diplomacy-ai.feature | The AI estimates under the player's limits |
| DIPL-180 | diplomacy-ai.feature | A demand before war |
| DIPL-181 | diplomacy-ai.feature | The AI answers the player with the same count |
| DIPL-182 | diplomacy-ai.feature | Who funds rebels |
| DIPL-183 | diplomacy-screen.feature | Lens colours |
| DIPL-183 | diplomacy-screen.feature | A league against you has a red border |
| DIPL-184 | diplomacy-screen.feature | What each zoom shows |
| DIPL-185 | diplomacy-screen.feature | The country diplomacy card of Venice |
| DIPL-185 | diplomacy-screen.feature | Why? opens the reasons |
| DIPL-186 | diplomacy-screen.feature | The envoy picker |
| DIPL-187 | diplomacy-screen.feature | Landscape layout |
| DIPL-188 | diplomacy-screen.feature | The envoys strip |
| DIPL-189 | declaring-war.feature | Hungary prepares to declare war on the Ottomans |
| DIPL-190 | ledger-and-standing.feature | Ledgers only for pairs that have dealt with each other |
| DIPL-190 | ledger-and-standing.feature | Fades are recomputed once a year |
| DIPL-191 | relation-model.feature | Balance numbers live in config, not in the dataset |
| DIPL-049 | envoys.feature | Residents beyond the seats are recalled, newest first |
| DIPL-118 | passage.feature | A refused or revoked passage blocks envoys for 2 years |
| DIPL-134 | funding-rebels.feature | Funding costs 1 % of the target's yearly income a month |
| DIPL-134 | funding-rebels.feature | Stopping the funding is free and tells nobody |
| DIPL-135 | funding-rebels.feature | Funding sets the flag the revolutions read |
| DIPL-150 | declaring-war.feature | Subjects join their overlord's war by their kind |
| DIPL-152 | declaring-war.feature | A vassal cannot declare war on its overlord's ally |
| DIPL-163 | leagues.feature | An event league ends only by event or by a peace |
| DIPL-192 | ledger-and-standing.feature | Standing stays within -200 and +200 |
| DIPL-193 | relation-actions.feature | Small commands that cost nothing |
| DIPL-193 | relation-actions.feature | Withdrawing a pledge is an Oath broken |
| DIPL-193 | relation-actions.feature | A Rival may be dropped after 10 years |
| DIPL-193 | relation-actions.feature | Recalling envoys |
| DIPL-193 | funding-rebels.feature | Stopping the funding is free and tells nobody |
| DIPL-194 | funding-rebels.feature | A funded revolution that wins remembers its backer |
| DIPL-195 | peace-and-truces.feature | The AI offers peace to the player |
| DIPL-196 | diplomacy-screen.feature | War and peace live on the Diplomacy tab |
| DIPL-197 … DIPL-201 | — | Engine: packages/engine/test/statecraft.test.ts (courtesy visit, alliance reasons, gift and refusals, AI marriages, save) |
| DIPL-202 | — | Presentation: apps/client/src/ui/statecraft.ts, the Diplomacy tab |
| DIPL-203 … DIPL-207 | — | Engine: packages/engine/test/statecraft.test.ts (tribute demand, province handed over, AI demands before war) |
| DIPL-208 | — | Presentation: apps/client/src/ui/statecraft.ts, Make a demand |
