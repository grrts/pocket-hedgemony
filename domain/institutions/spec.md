# Institutions (INST)

## 1. Purpose and scope

This context owns the big institutions realms belong to: the Empire, with its Emperor, electors, Diet and reforms,
and the Shogunate in Japan, with its shogun, great houses and the Court. Both are an office held by one ruler over
members who keep their own land; the office is worth as much as its holder's hold over them.

In scope:
- Institutions, their office, holder, members, hold and end.
- The Empire: imperial land, membership, the seats and elections, the Emperor's duties and rights, the Diet and its
  seven reforms, the faith settlements, dissolution.
- The Shogunate: the houses, the shogun's hold and actions, the break into warlord domains, the vacant office and
  the Court's appointment, the oath of the houses, the closed country, the end.
- The Empire card, the Shogunate card, the Institutions row and the Institutions lens's meaning.

Not in scope (owned by …):
- Heads of faith and the Papacy (religion; a separate design on Leroy's list).
- Leagues against a conqueror (diplomacy) and the tributary relation (subjects).
- Government forms and reforms between them (government): this context asks for the shogunate's form changes.
- War aims, wars and peace terms as such (warfare); calls to arms and the reasons count (diplomacy).
- Lords, loyalty and rulers (realm); revolutions (revolutions).

## 2. Sources

1. Institutions design, 18 October 2026: `/mnt/project-files/institutions/institutions-design.md` (Leroy's ask of
   18 Oct: "find and figure out how institutions work (HRE etc.), also take in the shogunate for Japan").
2. Country catalogue: `hre.json` (collective institution), the 128 `imperial_estate` edges, the Ashikaga vassal and
   nominal edges, `japan_imperial_court`.
3. Government spec: shogunate and warlord domain forms, GOV-038 (the shogun loses the capital), D-GOV-1.
4. Religion spec RELG-079 (`peace_of_augsburg`); events `onin_war`, `peace_of_westphalia`, `perry_expedition`,
   `meiji_restoration`, `tokugawa_shogunate_established`.
5. X-19 (how the player uses each feature), X-13 (the map's nations are the realms), D-REVO-17 (rulers are names).

## 3. Ubiquitous language

| Term | Meaning | Not to be confused with |
|---|---|---|
| Institution | A body realms (or great houses) belong to, with an office, a holder, members, hold, reforms and an end | Government form; league |
| Office | The title the institution gives: Emperor, Shogun | Ruler |
| Holder | The realm whose ruler holds the office | Overlord |
| Member | A realm in the Empire; a great house or a warlord domain in the Shogunate | Subject; ally |
| Hold | 0–100, how strong the office is over its members; words Hollow (0–19), Weak (20–49), Firm (50–79), Strong (80–100) | Loyalty; standing |
| Imperial land | The provinces the Empire's members held on 1 January 1444; fixed for the campaign | A member's land today |
| Seat | One vote in the election of the Emperor; seven at the start | Envoy seat |
| Church seat | A seat with no realm (Mainz, Trier) that votes as the head of the Catholic faith prefers | |
| Vacant seat | A seat whose realm ended or left, until the Emperor grants it | |
| Candidate | A member's ruler who may be elected | Pretender |
| Diet | The meeting where every member votes on the Emperor's next reform | |
| Breaker of the Peace | A member that declared war on another member, or refused a court ruling, after the Public Peace | |
| Circle | A group of members (data) that defend each other after the Circles reform | Ring (realm) |
| Contingent | Soldiers a member sends to the Emperor's army after the Imperial Army reform | Retinue |
| Great house | A great lord of the shogun's realm, from the catalogue's shugo houses | Great lord (government, the loyalty reason) |
| The Court | The Imperial Court in Kyoto; part of the Shogunate, never a realm | |
| Court's province | The province holding Kyoto | Capital |
| Summoned | A house whose lord lives at the shogun's capital | Held envoy |
| The break | The shogunate splitting into warlord domains | Revolution |
| Vacant office | The Shogunate while no realm holds the shogunate form | Vacant seat |
| Closed country | The shogun's decision limiting foreign traders and faiths | Embargo |

## 4. Domain model

### Aggregates

**Institution** (identity: `empire` or `shogunate`)
- Holds: office, holder (realm or none), members, hold, passed reforms, last Diet date, seats (Empire), summoned
  houses and closed-country state (Shogunate), ended (date and how).
- INV-INST-1: hold is a whole number from 0 to 100.
- INV-INST-2: the holder is a member (Empire) or the realm with the shogunate form whose capital is the Court's
  province (Shogunate), or none.
- INV-INST-3: a realm holds at most one seat.
- INV-INST-4: reforms pass in the ladder's order; a passed reform is never lost while the institution stands.
- INV-INST-5: an ended institution has no holder, no members and changes nothing.

### Entities and value objects
- **Seat**: name, realm or church or vacant.
- **Election**: candidates, each seat's vote with its reasons, result.
- **Diet**: reform, each member's vote with its reasons, result.
- **Hold record**: this year's gains and losses with their causes.

### Domain services
- **Vote counter**: runs the diplomacy reasons count for a seat or a member on a candidate or a reform.

## 5. Requirements

### 5.1 Institutions in general
- INST-001 The game shall keep two institutions, the Empire and the Shogunate, each with an office, a holder, members,
  hold (0–100, INV-INST-1) and its reforms or actions. [institutions §2]
- INST-002 The game shall name hold by word: Hollow 0–19, Weak 20–49, Firm 50–79, Strong 80–100. [institutions §2]
- INST-003 Each year in January, the game shall add up the year's hold gains and losses for each institution, keep
  them as the hold record and clamp hold to 0–100. [institutions §3, §4]

### 5.2 The Empire: members and imperial land
- INST-010 At the start, the Empire's members shall be the map realms the catalogue holds as imperial estates, active
  or nominal (X-13 match), and its holder Austria, with hold 35. [institutions §3; catalogue imperial_estate]
- INST-011 Imperial land shall be the provinces the members held on 1 January 1444, and shall not change. [institutions §3]
- INST-012 A realm whose capital lies in imperial land may join when the Emperor admits it (an envoy ask decided by
  the reasons count); a member shall leave when its capital leaves imperial land, it becomes the subject of a
  non-member, or it ends. [institutions §3]

### 5.3 The Empire: seats and elections
- INST-020 The Empire shall have seven seats at the start: Cologne, Bohemia, Palatinate, Saxony and Brandenburg held
  by their realms, and the church seats Mainz and Trier. [institutions §3; hre.json]
- INST-021 A church seat shall vote for the candidate the head of the Catholic faith holds the highest standing
  toward, and for the sitting house if there is no head of that faith. [institutions §3]
- INST-022 When a seat's realm ends or leaves the Empire, the seat shall stand vacant until the Emperor grants it to a
  member without a seat (INV-INST-3). [institutions §3]
- INST-023 When the Emperor's realm gets a new ruler, leaves the Empire or ends, the Empire shall hold an election;
  until rulers change in the game, it shall hold one every 25 years. [institutions §3; D-REVO-17]
- INST-024 The candidates shall be the three members with the most soldiers and every member whose ruler stands for
  the crown, of the Empire's faith (Catholic until `peace_of_westphalia`, then any member's faith). [institutions §3]
- INST-025 Each seat shall vote for the candidate it rates highest by the reasons count (standing, same faith, the
  sitting house, the candidate's strength, ties such as *Sought our vote*, war with it); most votes win, a tie goes
  to the sitting house, then to more soldiers. [institutions §3; diplomacy reasons count]
- INST-026 *Seek their vote* shall be an envoy mission to an elector's court that costs a gift and leaves the tie
  *Sought our vote* (+15, fading over 10 years). [institutions §3]

### 5.4 The Empire: the Emperor
- INST-030 When a non-member declares war on a member or holds imperial land in a war, the Emperor shall be called to
  defend it by a call to arms; answering gives hold +10, refusing or not answering gives hold −15 and the wrong
  *Left us to our fate* toward the Emperor from the attacked member and every elector. [institutions §3]
- INST-031 While a non-member holds imperial land, the Emperor shall hold the war aim *Restore imperial land* on it.
  [institutions §3]
- INST-032 Each month the Emperor shall receive 1 gold per member times hold ÷ 100, until the Common Tax passes.
  [institutions §3]
- INST-033 The yearly hold count shall add +2 when no member is at war with another and no non-member holds imperial
  land, −3 for each war between members, −2 for each imperial province a non-member holds (at most −10), −5 for each
  member that left, and −1 for each member whose faith is not the Emperor's (halved after `peace_of_augsburg`, none
  after `peace_of_westphalia`). [institutions §3]
- INST-034 The Emperor shall be bound by every reform like any member. [institutions §3]

### 5.5 The Empire: the Diet and reforms
- INST-040 The Emperor may call the Diet while hold is 50 or more, at most once every 5 years, on the next reform of
  the ladder: Public Peace, Imperial Court, Circles, Common Tax, Imperial Army, Hereditary Crown, One Realm.
  [institutions §3]
- INST-041 Every member shall vote yes or no by the reasons count (the reform's base, hold ÷ 10, standing toward the
  Emperor, same faith, a non-member holding imperial land next to it, its size against the Emperor's); electors'
  votes count twice; over half the votes pass it; passing spends 30 hold and failing 10. [institutions §3]
- INST-042 After Public Peace, a member that declares war on another member shall be a Breaker of the Peace: the
  Emperor and every member hold a war aim on it and the Emperor is called to defend the victim. [institutions §3]
- INST-043 After Imperial Court, a member with a war aim on another member's province may take it to court; the court
  rules by the reasons count (the aim, both sides' standing toward the Emperor, hold); a ruling for the plaintiff
  moves the province with no war, and refusing a ruling makes the refuser a Breaker of the Peace. [institutions §3]
- INST-044 After Circles, when a non-member declares war on a member, every member of the same circle shall join the
  defence. [institutions §3]
- INST-045 After Common Tax, every member shall pay 5 % of its tax to the Emperor each month in place of INST-032.
  [institutions §3]
- INST-046 After Imperial Army, in a war to defend the Empire the Emperor shall command a contingent of 10 % of each
  member's soldiers, raised for the war and sent home with the peace. [institutions §3]
- INST-047 After Hereditary Crown, the Emperor's heir shall take the crown and no election is held. [institutions §3]
- INST-048 One Realm shall need the six reforms before it and hold 80; when it passes, every other member's ruler
  becomes a great lord of the Emperor with his land, Wavering, and the Empire ends. [institutions §3]

### 5.6 The Empire: faith and the end
- INST-050 After `peace_of_westphalia`, an eighth seat shall go to the largest member without a seat. [institutions §3]
- INST-051 The Empire shall be dissolved when hold has stood at 0 for 5 years in a row, or when a non-member that won
  a war against the Emperor from era IV takes the peace term *Dissolve the Empire*; every member becomes a free
  realm and every imperial war aim ends. [institutions §3]

### 5.7 The Shogunate
- INST-060 At the start, the Shogunate's holder shall be Japan, its members Japan's great houses, and its hold 30.
  [institutions §4]
- INST-061 The yearly hold count shall add +3 when no house is In revolt, −5 for each house In revolt, −10 while the
  realm has no adult heir, −3 while the shogun is at war and over half his houses are Wavering or worse, and +1 for
  each summoned house. [institutions §4]
- INST-062 Each season, every great house shall count *The shogun's hold* in its loyalty: +1 step at Firm or Strong,
  none at Weak, −1 at Hollow. [institutions §4]
- INST-063 While hold is Firm or better, the shogun may summon a house: its lord's wealth falls by 10 % a year and he
  cannot join a rising; the summons ends when released or when hold falls below Firm. [institutions §4]
- INST-064 The shogun may confirm a house's land once per lord per ruler, for one loyalty step and 5 hold.
  [institutions §4]
- INST-065 At a season's end with hold 0, or when the shogun loses the Court's province (GOV-038), the Shogunate shall
  break: each great house becomes a warlord domain with its land, the shogun keeps his royal provinces as a warlord
  domain, and the event `onin_war` fires if it has not. [institutions §4; GOV-038]
- INST-066 While the office is vacant, every warlord domain whose capital is in Japan shall be a member; a member that
  holds the Court's province and owns or holds as subjects over half of Japan's land provinces may ask the Court, and
  then takes the warlord domain → shogunate reform at no gold, with hold 40. [institutions §4]
- INST-067 When a shogun is appointed, every other member shall answer *Swear to the shogun* by the reasons count
  (soldiers against his, hold, standing): one that swears becomes his great house with its land, Wavering; one that
  refuses stays a realm and the shogun holds the war aim *Bring to heel* on it. [institutions §4]
- INST-068 From era III, while hold is Firm or better, the shogun may close the country: foreign traders trade only at
  one port he names, foreign faiths send no missionaries in, and hold gains +2 a year; it ends when he lifts it or
  `perry_expedition` fires. [institutions §4]
- INST-069 The Shogunate shall end when its holder leaves the shogunate form by reform or by revolution; from era V,
  while hold is Weak or Hollow and the ports were forced open, the revolutions context may open the restoration for
  the Court. [institutions §4; D-GOV-1]

### 5.8 How the player uses it
- INST-080 Where: your own country card's Diplomacy tab shows an **Institutions** row, one line per institution you
  belong to (name, holder, hold with its word, your role: Emperor, Elector, Member, Shogun, House), and a member's
  country card shows a small badge (Empire, Elector, Shogun); each opens the institution's card. Grouping: one card
  per institution holds everything about it. Overview: this row and the Institutions lens. [X-19; institutions §5]
- INST-081 The Empire card shall have a header (Emperor's banner, ruler and since when; the hold bar with number and
  word; your role) and four folds: **Election** (each seat and whom it would vote for today, the tally in words and
  numbers, *Stand for the crown*, and a tap on a seat that opens its reasons list with *Seek their vote*);
  **Reforms** (the ladder with passed ones ticked, the next one's effect in one line, its hold cost and the forecast
  tally, *Call the Diet* for the Emperor or why not, and *Vote yes* / *Vote no* while a Diet sits); **Members**
  (banner, provinces, faith, seat, and badges for a war between members, Breaker of the Peace and imperial land held
  by outsiders; a tap opens the country card); **Hold** (the year's gains and losses as a gain and lose fold-out).
  [X-19; institutions §5]
- INST-082 The Shogunate card shall have a header (shogun, hold), **Houses** (each great house with lord, land,
  loyalty and *Summon* or *Confirm*, or each member realm while the office is vacant), **The Court** (who holds
  Kyoto, *Ask the Court* when you qualify, *Close the country* or *Open the ports*), **Hold**, and while hold is Weak
  or lower a warning line "At hold 0 the houses break away". [X-19; institutions §5]
- INST-083 An election, a sitting Diet, a call to defend the Empire, a court ruling and a request to swear to the
  shogun shall arrive as answer cards in the dispatches and on Needs attention with two 44-point buttons; silence on
  a Diet vote counts as no, on a defence call as a refusal, on an oath as a refusal. [X-19; DIPL-214]
- INST-084 The Institutions lens shall colour the holder gold, members light gold, seats with a mark, imperial land
  held by a non-member hatched, and Japan by house while whole and by member realm while broken; it reads with
  patterns as well as colours. [X-19; institutions §5]
- INST-085 Phone: the cards shall be side sheets in the Wide layout and bottom sheets in the Tall layout, inside the
  safe areas; every fold header, row and button at least 44 points high; tallies in words and numbers, never by
  colour alone; reasons open on tap, nothing needs hover. [X-19; institutions §5]

## 6. Commands

| Command | Who issues it | Preconditions | Result | Events emitted |
|---|---|---|---|---|
| `StandForCrown(realm, on)` | player / AI | Member | Candidate or not | — |
| `SeekVote(realm, seat)` | player / AI | Free envoy seat, gold for the gift | Tie on arrival | `VoteSought` |
| `AnswerImperialDefence(realm, war, yes)` | player / AI (Emperor) | A defence call stands | Joins the war or not; hold | `ImperialDefenceAnswered` |
| `GrantSeat(emperor, seat, member)` | player / AI | Seat vacant; member without seat | Seat held | `SeatGranted` |
| `AdmitMember(emperor, realm)` | player / AI | Capital in imperial land | Envoy ask | `MemberJoined` |
| `CallDiet(emperor)` | player / AI | Hold ≥ 50; 5 years since last | Diet sits a month | `DietCalled` |
| `VoteInDiet(member, yes)` | player / AI | Diet sitting | Vote kept | — |
| `TakeToCourt(member, aim)` | player / AI | Imperial Court passed; aim on a member | Ruling | `CourtRuled` |
| `SummonHouse(shogun, lord)` / `ReleaseHouse` | player / AI | Hold Firm or better | Summoned or not | — |
| `ConfirmHouse(shogun, lord)` | player / AI | Not yet confirmed this ruler | Loyalty, hold | — |
| `AskTheCourt(realm)` | player / AI | INST-066 | Shogun appointed | `ShogunAppointed` |
| `SwearToShogun(realm, yes)` | player / AI | Oath asked | Becomes a house, or war aim | `HouseSwore` |
| `CloseCountry(shogun, port)` / `OpenPorts` | player / AI | INST-068 | Closed or not | `CountryClosed` |

## 7. Domain events

| Event | When | Payload | Consumed by (context) |
|---|---|---|---|
| `EmperorElected` | An election ends | realm, votes | realm, diplomacy, game-shell |
| `DietCalled` / `ReformPassed` / `ReformFailed` | Diet | reform, votes | diplomacy, warfare, game-shell |
| `BreakerOfThePeace` | INST-042, INST-043 | realm | warfare, diplomacy |
| `CourtRuled` | INST-043 | province, from, to | province, warfare |
| `ImperialDefenceCalled` / `ImperialDefenceAnswered` | INST-030 | war, emperor, yes | diplomacy, warfare |
| `MemberJoined` / `MemberLeft` | INST-012 | realm | map-presentation |
| `EmpireEnded` | INST-048, INST-051 | how | realm, diplomacy, events |
| `ShogunateBroke` | INST-065 | houses → realms | government, realm, events |
| `ShogunAppointed` / `HouseSwore` | INST-066, INST-067 | realm | government, realm |
| `CountryClosed` / `PortsOpened` | INST-068 | port | trade, religion |

## 8. Policies (reactions to other contexts)

- When a war is declared (warfare), then check INST-030, INST-042 and INST-044.
- When a peace moves provinces (warfare), then update members (INST-012) and imperial land held by outsiders.
- When a realm gets a new ruler (realm), then hold an election if it is the Emperor's (INST-023).
- When `peace_of_augsburg` or `peace_of_westphalia` fires (events), then apply INST-033 and INST-050.
- When the shogun loses the capital (government GOV-038), then break the shogunate (INST-065).
- When `perry_expedition` fires (events), then open the ports (INST-068).

## 9. Each turn

In the turn where a new month begins: Emperor's dues or Common Tax (INST-032, INST-045), Diet and election answers
due. Where a new season begins: the houses' hold reason (INST-062), the break check (INST-065). Where a new year
begins: the hold count (INST-003). The steps run after diplomacy and government and before warfare's monthly steps,
because they read standing and forms and add war aims.

## 10. Configuration

| Key | Meaning | Value in the design | Placeholder? | Config file |
|---|---|---|---|---|
| `hold.words` | Hollow, Weak, Firm, Strong bands | 0, 20, 50, 80 | yes | institutions.json |
| `empire.hold_start` | Hold in 1444 | 35 | yes | institutions.json |
| `empire.election_years_without_rulers` | Election period until rulers die | 25 | yes | institutions.json |
| `empire.seek_vote.tie` | *Sought our vote* tie and fade | +15, 10 years | yes | institutions.json |
| `empire.defence.answer` / `refuse` | Hold for a defence call | +10 / −15 | yes | institutions.json |
| `empire.dues_per_member` | Monthly gold per member × hold ÷ 100 | 1 | yes | institutions.json |
| `empire.hold_year` | Peace, member war, outsider land, leaver, faith | +2, −3, −2 (max −10), −5, −1 | yes | institutions.json |
| `empire.diet` | Min hold, years between, pass and fail cost | 50, 5, 30, 10 | yes | institutions.json |
| `empire.common_tax` | Share of tax | 5 % | yes | institutions.json |
| `empire.contingent` | Share of soldiers | 10 % | yes | institutions.json |
| `empire.one_realm_hold` | Hold needed | 80 | yes | institutions.json |
| `empire.dissolve_years_at_zero` / `dissolve_min_era` | End | 5 / IV | yes | institutions.json |
| `shogunate.hold_start` / `appointed_hold` | Hold | 30 / 40 | yes | institutions.json |
| `shogunate.hold_year` | No revolt, per revolt, no heir, unhappy war, summoned | +3, −5, −10, −3, +1 | yes | institutions.json |
| `shogunate.summon_wealth_loss` | Per year | 10 % | yes | institutions.json |
| `shogunate.confirm_cost` | Hold | 5 | yes | institutions.json |
| `shogunate.closed_country` | Min era, hold per year | III, +2 | yes | institutions.json |

## 11. Seams

| Other context | Direction | Pattern | What crosses |
|---|---|---|---|
| diplomacy | upstream | Customer–Supplier | Reasons count, envoy missions (*Seek their vote*, admit), calls to arms, ties and wrongs |
| warfare | downstream | Customer–Supplier | War aims *Restore imperial land*, Breaker of the Peace, *Bring to heel*; peace term *Dissolve the Empire*; contingents; circle defence |
| government | upstream | Partnership | Shogunate and warlord domain forms; GOV-038 break; the warlord domain → shogunate reform |
| realm | upstream | Customer–Supplier | Rulers and heirs, lords as great houses, loyalty reasons, soldiers |
| religion | upstream | Conformist | Faiths, the head of the Catholic faith, RELG-079 |
| events | upstream | Published Language | `peace_of_augsburg`, `peace_of_westphalia`, `onin_war`, `perry_expedition`, `meiji_restoration` |
| revolutions | downstream | Customer–Supplier | The restoration for the Court |
| trade | downstream | Customer–Supplier | Closed country's one port |
| scenario-setup | upstream | Conformist | 1444 members, seats, houses, imperial land |
| map-presentation | downstream | Published Language | Institutions lens |
| game-shell | downstream | Customer–Supplier | Institutions row, cards, answer cards, Needs attention |

## 12. AI

- An AI Emperor answers a defence call when its reasons count says yes (its soldiers with the members' against the
  attacker's); calls the Diet when the forecast tally passes.
- AI members and seats vote by the reasons count (INST-025, INST-041); an AI member with a war aim on a member takes
  it to court when the forecast ruling is for it.
- An AI member stands for the crown when it is among the three strongest members; the sitting Emperor's house always
  stands (built in slice 1: the holder is always a candidate).
- An AI defendant hands a province over on a ruling unless it has more soldiers than the Emperor and the plaintiff together; the player's ruling waits a month on an answer card and silence hands it over (built in slice 2).
- The imperial contingent is raised as a fresh army at the Emperor's capital, sized from each member's soldiers as others see them; the members' own levies are not drawn down (slice 2 default).
- An AI realm accepts *Dissolve the Empire* on the white-peace rule: when over half its voices want peace.
- An AI shogun summons the least loyal houses first while hold allows, and confirms Wavering houses.

## 13. Open questions and contradictions

- OQ-INST-1: The X-13 match of catalogue imperial estates to map realms (Bavaria, Württemberg, Hamburg, Pomerania, Switzerland, Modena are split or renamed in the catalogue): the data list decides; it needs one pass of review.
- OQ-INST-2: The ten circles on a 137-realm map: which map realms sit in which circle (data). Slice 2 default: the historical circles matched to the map members (Austrian, Bavarian, Swabian, Upper Rhenish, Electoral Rhenish, Lower Saxon, Upper Saxon); Bohemia, Switzerland and the Italian members sit in none.
- OQ-INST-3: Which great houses Japan starts with as lords depends on the realm data's great-house list (D-REALM-10); the shogunate needs at least the 22 shugo houses of the catalogue.
- OQ-INST-4: The heads of faith design may give the Papacy powers over the Emperor (crowning); the church seats then read that design.

## 14. Traceability

| Requirement | Feature file | Scenario |
|---|---|---|
| INST-001 … INST-003 | hold.feature | Hold words; the yearly count |
| INST-010 … INST-012 | empire-members.feature | Members in 1444; imperial land; joining and leaving |
| INST-020 … INST-026 | imperial-election.feature | Seats; church seats; vacant seats; an election; seeking a vote |
| INST-030 … INST-034 | emperor.feature | Defend the Empire; restore land; dues; hold |
| INST-040 … INST-048 | imperial-reforms.feature | The Diet; each reform |
| INST-050, INST-051 | empire-end.feature | Westphalia seat; dissolution |
| INST-060 … INST-069 | shogunate.feature | Houses, hold, summons, the break, the Court, the oath, closed country, end |
| INST-080 … INST-085 | institution-screens.feature | The row, the cards, answer cards, lens, phone |
