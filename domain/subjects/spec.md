# Subjects and overlords (SUBJ)

## 1. Purpose and scope

This context decides what kinds of subject exist, what a subject and its overlord owe each other, how loyal a
subject is and why, and how a subject is made, tightened, loosened, folded into the realm, released or lost.
It sees all land on one **ladder of rule**: royal land, lord's land, subject realm, independent.

**In scope**
- The ladder of rule and the one rule that separates a lord from a subject.
- Six subject kinds, what each pays, fights, keeps and is owed; ties (Kin, Held of the Church, Held in fief,
  Second master, Hostage at court); colony stages.
- Mapping the relations data's eight `subject_kind` values and the event tree's `vassalize` types onto the six.
- Subject loyalty: four steps, reasons, the seasonal count, starting loyalty in 1444.
- Overlord actions (set tribute, grain tribute, call to war, gift, resident, lend an official, hostage,
  marriage, tighten, loosen, fold in, release, depose), raising a lord to a subject.
- Obligations both ways (defence, march stipend, union wars, quarrels between subjects).
- Subject reach and subjects with subjects.
- Folding in (including colonies, merging crowns, inheritance and the doctrine of lapse).
- Losing subjects: drifting, rising, independence war, changing masters, taken by force, the overlord's fall.
- Ways to make a subject.
- The subjects list, the subject card, subject map display and lens.
- Event keys read and written, the subject AI, playing as a subject.

**Not in scope (owned by …)**
- The Subject relation record, one-overlord and no-cycle rules, `independence_war`, `release_subject`,
  `make_subject` actions: **diplomacy** (relation model).
- Envoys, marriages, protection asks, courting: **diplomacy**.
- Lords, loyalty steps of lords, lord card, taking land back: **realm**.
- Lord capacity and the government's change to subject reach: **government**.
- War aims, peace voices, peace terms, calling lords: **warfare**.
- Grievances such as *Foreign rule*, risings of lords: **rebellions**.
- What "same faith", persecution, "same people" and "accepted" mean: **religion**, **culture**.
- Settler independence event chain: **revolutions**. Sea routes: **naval**. Trade privileges: **trade**.
- Colonial provinces and charters: **exploration** and **province**.
- The Empire, the Church and leagues as institutions: gap list item 8 (no context).

## 2. Sources

Newest decision first.
1. `subjects/subjects-design.md` version 1, including "Decided (16 Oct)" (section 16: subject reach separate from
   lord capacity; every playable subject playable from the start; protectorates from era IV for an overseas trade
   empire and for everyone from era VI; subjects may hold subjects).
2. `subjects/config/subject-rules.json`.
3. `subjects/README.md`.
4. Read for seams: `country-relations/` (relation-types, relation-rules `subject_kinds`, `modifiers.subject`,
   relations-1444 dataset), `diplomacy/diplomacy-design.md` 6.2, 6.7, 7.1, 7.3, `warfare/warfare-design.md` 10,
   `government/government-design.md` 3, `planning/gap-lists.md` "Decisions already made".

## 3. Ubiquitous language

| Term | Meaning | Not to be confused with |
|---|---|---|
| Subject | A country on the map that answers to another country | A lord (a card inside a realm) |
| Overlord | The country a subject answers to | |
| Ladder of rule | Royal land → lord's land → subject realm → independent | |
| Royal land | Land run by your officials | |
| Lord's land | Land run by a named lord inside your realm | |
| Subject realm | Its own country on the map, with its own treasury, army, lords and diplomacy, under you | |
| Kind | Vassal, Tributary, Union, March, Colony, Protectorate | The relations data's eight `subject_kind` values |
| Vassal | A realm held from you by oath: fights for you and pays a share | |
| Tributary | Self-ruled; sends tribute and keeps the peace with you | Tribute peace term (not a subject) |
| Union | A second crown worn by your ruler, with its own lords and laws | |
| March | A border chief holding your titles to guard a frontier | |
| Colony | An overseas dependency run for you by your settlers | A colonial province |
| Protectorate | You run its foreign affairs; it rules itself at home | Pledge of protection (diplomacy) |
| Tie (subject tie) | A label on the subject relation that changes one or two rules: Kin, Held of the Church, Held in fief, Second master, Hostage at court | A diplomacy ledger tie |
| Colony stage | Outpost, Settled, Self-governing | |
| Loyalty step | Loyal, Wavering, Disloyal, In revolt (the lords' steps) | A percentage meter (there is none) |
| Reason (loyalty reason) | A named, visible badge pointing up or down | Diplomacy reasons count |
| Arrow | One unit of a reason's weight | |
| Season | 3 months | |
| Drift | A kind's permanent down reason | |
| Subject reach | How many subjects a ruler can watch over; from government | Lord capacity |
| Stretched thin | The down reason when subjects exceed reach | |
| Master of others | The −3 reason of a subject holding subjects | |
| Raise (a lord) | Make a great lord a subject realm | |
| Fold in | Make a subject's ruler one of your lords, its country gone from the map | Annex by conquest |
| Merge the crowns | Folding in a Union | |
| Tighten / Loosen | Change the kind one notch toward obligation / freedom | |
| Release | Make a subject independent | |
| Depose | Replace a subject's ruler with your candidate | |
| Backer | A country that agrees to declare *Break a subject* when the subject rises | |
| Rise | Move to In revolt: the independence war | |
| Change masters | A Disloyal subject passing to a rival of its overlord | |
| Frontier grant | Giving your titles to a frontier chief: a March | |
| Doctrine of lapse | Event-tree flag: fold in any subject whose ruler dies without a natural heir | |

## 4. Domain model

### Aggregates

**SubjectBond** (identity: the subject country; its Subject relation record lives in diplomacy's relation graph)
- Holds: overlord, kind, ties, colony stage (colonies), tribute level and form (gold / grain), loyalty step,
  active reasons with their expiry, date became subject, years Loyal, history of last step change and direction,
  hostage held, stationed resident, fold-in in progress (envoy, months left).
- INV-SUBJ-1: Exactly one direct overlord (diplomacy INV-DIPL-4).
- INV-SUBJ-2: Loyalty is one of four steps; there is no hidden number.
- INV-SUBJ-3: Loyalty never moves twice in the same direction within 12 months.
- INV-SUBJ-4: A Tributary is never folded in directly; a Self-governing colony is never folded in.
- INV-SUBJ-5: A Protectorate exists only from era VI, or from era IV for an overseas trade empire.
- INV-SUBJ-6: March, Colony and Protectorate hold no subjects of their own.
- INV-SUBJ-7: An overlord acts only on its direct subjects.

**Overlord's subject roster** (identity: overlord country)
- Holds: subject reach, reach used (by weights), list of subjects ordered by loyalty, tribute totals.
- INV-SUBJ-8: Reach used = sum of each subject's weight (2.1, ties, 6.1).

### Entities and value objects

**Kinds** (design 2.1; config `kinds`)

| | Vassal | Tributary | Union | March | Colony | Protectorate |
|---|---|---|---|---|---|---|
| Icon | shield | chest | two crowns | watchtower | anchor | key |
| Pays you | 10 % of its taxes | 15 % of its income, in gold or grain | 5 % | Nothing | 25 % plus its trade goods flow home first | 10 % |
| Fights for you | When called, by loyalty, like a lord | Never | Always, if Loyal or Wavering | Only in wars on its own frontier; raids your enemies there | Defends itself only | When called |
| Own diplomacy | Yes, but no wars or alliances against you or your allies | Yes, fully | No: your envoys speak for it | Yes, but no alliances | No | No |
| Own subjects | Yes | Yes | Yes | No | No | No |
| You owe it | Defence when attacked | Defence when attacked by anyone but you | Defence; one ruler for both | A yearly stipend of gold or titles | Defence; ships on its sea route | Defence |
| Reach weight | 1 | ½ | 1 | ½ | 1 | 1 |
| Drift | none | −1 | none | −1 | none | −1 |
| Fold in | Yes | No: tighten to vassal first | Yes, as *Merge the crowns* | Yes | Yes, into royal land | Yes |
| 1444 examples | Brittany under France; shugo houses under the Ashikaga; Romagna lords under the Pope | Joseon, Ryukyu, Dai Viet to the Ming; Serbia, Byzantium to the Ottomans; Granada to Castile | Sweden, Norway under Denmark; Sicily, Sardinia under Aragon | Jurchen and Tusi commanderies on the Ming frontier | Genoese Chios and Gazaria; Portuguese Ceuta | Bukhara under Russia; Indian princely states under the Company (event tree) |

**Ties** (2.3; config `ties`)

| Tie | Set when | Effect |
|---|---|---|
| Kin | The subject's ruler is of your ruling house (appanages) | +1 loyalty reason; if your line dies out, its ruler has a claim to your throne |
| Held of the Church | The overlord is a religious head (the Pope's fiefs) | Pays a token only (config 1 %), never fights (config); breaking the tie is a *Defend the faith* matter for others of that faith |
| Held in fief | A sovereign kingdom holds its crown from someone else | Pays a token only (1 %), never called to war; counts ½ for reach |
| Second master | It also pays tribute to someone else (`secondary_tribute` fact) | Second master gets a small tribute (config 5 %), no other rights; if the two masters fight, the subject leans to the stronger |
| Hostage at court | You hold its heir | +1 reason; −2 if mistreated or lost |

**Colony stages** (2.4)

| Stage | When | Change |
|---|---|---|
| Outpost | Founded | Pays 25 %, no own army, your governor (an official) runs it |
| Settled | 5+ provinces, mostly settler people | Raises its own militia; its settlers become a voice (can be Wavering) |
| Self-governing | 10+ provinces and 50 years, or an event (`create_country … subject_of`, dominion) | Pays 10 %, keeps its own lords; can no longer be folded in, only released or kept |

**Loyalty steps** (3; config `loyalty.effects`)

| Step | Pays | When called to war | Foreign envoys | Other |
|---|---|---|---|---|
| Loyal | All it owes | Comes at once, whole army | Turns them away | Can be folded in |
| Wavering | Half | Half its army, late; home after 6 months unless the war is on its border | Listens | |
| Disloyal | Nothing | Refuses; each further call is another down reason | Bargains for a backer | Hides its army's size |
| In revolt | Nothing | At war with you: the independence war | | |

**Reasons** (3.1; config `reasons`, weights in arrows)

| Up | Arrow | Down | Arrow |
|---|---|---|---|
| You are much stronger: your soldiers ≥ 3 × theirs | +1 | You are not much stronger: their soldiers ≥ ½ of yours | −1 |
| Same faith as your ruler | +1 | Different faith | −1 (−2 if you persecute it) |
| Same people: its ruler shares your ruler's culture | +1 | Different people, not accepted by your realm | −1 |
| You defended it in the last 20 years | +1 | You left it alone (attacked, you did not join; also an Oath broken), 20 years | −1 |
| Gift of gold in the last 5 years | +1 | Heavy tribute / crushing tribute | −1 / −2 |
| Marriage between your houses | +1 | You lost a war in the last 10 years | −1 |
| Kin or Hostage at court tie | +1 | New ruler on your throne (first 5 years) | −1 |
| Resident at court (one of your envoys) | +1 | Courted: a foreign envoy stationed there working against you | −1 |
| Common enemy: you both have the same rival | +1 | Stretched thin (over reach) | −1, and −1 more per subject beyond reach to the furthest |
| Long held: under you 30+ years | +1 | Far away: no land path through your realm or theirs and no sea route of yours | −1 |
| Light tribute | +1 | Outgrown: more provinces than you, or than its kind allows (Vassal: half of yours) | −1 |
| Given a crown (raised while Wavering), 10 years | +1 | Master of others | −3 |
| Loosened, 10 years | +2 | Hostile stance toward you / Rival stance | −2 / −1 |
| | | Kind's drift (Tributary, March, Protectorate) | −1 |
| | | Force used on another subject, 5 years | −1 |
| | | Another subject deposed, 5 years | −1 |
| | | Doctrine of lapse used on another subject, 10 years | −1 |
| | | Refused a call again, 12 months | −1 |
| | | Missed march stipend, 12 months | −1 |
| | | You left another subject alone, 5 years | −1 |
| | | Two quarrelling subjects forbidden, 5 years | −1 |

**Tribute levels**: none ×0, light ×0.5, normal ×1, heavy ×1.5, crushing ×2 (of the kind's share).

**Reach by catalogue `administrative_capacity`**: very low 2, low 3, moderate 5, high 7, very high 9.

**Mapping** (2.2; config `mapping_1444`)

| Source value | Becomes |
|---|---|
| relations `vassal` | Vassal |
| relations `fief` (Naples from the Pope, Andorra from Foix) | Vassal with *Held of the Church* or *Held in fief* |
| relations `appanage` | Vassal with *Kin* |
| relations `tributary` | Tributary |
| relations `personal_union` | Union |
| relations `frontier_commandery` | March |
| relations `colony` | Colony |
| relations `estate` (Catalonia, Flanders, the Castilian magnates, Moravia …) | A lord of its crown, not a subject |
| event `vassal` / `tributary` / `colony` | Same name |
| event `protectorate`, `puppet` | Protectorate |
| event `dominion` | Colony at Self-governing |
| event `personal_union` relation | Union |

1444 result: 167 Subject records − 32 estates = 135 subjects: 83 vassals (69 + 12 appanages + 2 fiefs),
31 tributaries, 9 unions, 7 marches, 5 colonies (fewer if gap 25 turns small vassals into lords).

**Overlord actions** (4)

| Action | Cost | Effect |
|---|---|---|
| Set tribute (none, light, normal, heavy, crushing) | None | Changes what it pays; light +1, heavy −1, crushing −2 |
| Take tribute in grain | None | Tribute arrives as grain at your nearest castle |
| Call to war | None | As calling a lord, by loyalty; tributaries never called |
| Send a gift | Gold scaled to its income | +1 for 5 years |
| Station a resident | One envoy while it stays | +1; reveals a courting foreign envoy; shows its true army even when Disloyal |
| Lend an official | One official's wages | +1; the official's type effect applies there |
| Take a hostage | Only from a Loyal or Wavering subject, or as a peace term | *Hostage at court* tie; heir returns when its ruler dies; harming him −2 |
| Arrange a marriage | An heir or a princess | Marriage reason; a path to a Union |
| Tighten (Tributary → Vassal only) | One envoy for 6 months; subject Loyal | One notch toward obligation; a Wavering subject refuses and drops a step |
| Loosen (Vassal → Tributary, Protectorate → Tributary) | None | One notch toward freedom; +2 for 10 years |
| Fold in | Section 7 | It becomes one of your lords |
| Release | None | Independent; Friendly toward you |
| Depose its ruler | A pretender of yours to its throne, or its ruler Disloyal | Candidate rules, starts Loyal; every other subject −1 for 5 years; In revolt: win first |

### Domain services
- **Loyalty counter**: each season, sums cached reasons per subject and moves the step.
- **Reach counter**: weights of all direct subjects, including 6.1 multipliers.
- **Fold-in planner**: checks requirements and names the first missing one (locked button).

## 5. Requirements

### 5.1 The ladder of rule

- SUBJ-001 The subjects context shall place every piece of land on one rung of the ladder of rule: royal land, lord's land, subject realm, or independent. [subjects 1]
- SUBJ-002 The subjects context shall treat a country as a subject only when it has its own country on the map with its own treasury, army, lords and diplomacy; a lord is a card inside a realm. [subjects 1]
- SUBJ-003 When the game starts, the subjects context shall turn any catalogue subject that is not its own map nation into a lord of its overlord, filling the lord card from the catalogue's history. [subjects 1]

### 5.2 Kinds

- SUBJ-004 The subjects context shall know six kinds of subject, each with its icon: Vassal (shield), Tributary (chest), Union (two crowns), March (watchtower), Colony (anchor), Protectorate (key). [subjects 2]
- SUBJ-005 The subjects context shall make each kind pay its overlord the share of the Kinds table (Vassal 10 % of its taxes, Tributary 15 % of its income, Union 5 %, March nothing, Colony 25 % with its trade goods flowing home first, Protectorate 10 %), multiplied by the tribute level. [subjects 2.1, 4; config `kinds.*.pays_share`, `tribute_levels`]
- SUBJ-006 The subjects context shall pay the share from the subject's treasury each month, so a poor subject pays little. [subjects 2.1]
- SUBJ-007 Where tribute is taken in grain, the subjects context shall deliver it to the overlord's nearest castle, where it counts toward Food. [subjects 2.1, 4]
- SUBJ-008 The subjects context shall bring each kind into its overlord's wars as the Kinds table says: Vassal when called by loyalty, Tributary never, Union always if Loyal or Wavering, March only in wars on its own frontier (raiding the enemy there), Colony defending itself only, Protectorate when called. [subjects 2.1]
- SUBJ-009 The subjects context shall limit each kind's own diplomacy as the Kinds table says: Vassal no wars or alliances against the overlord or its allies; Tributary full; Union none (the overlord's envoys speak for it); March no alliances; Colony and Protectorate none. [subjects 2.1]
- SUBJ-010 If a March, Colony or Protectorate would gain a subject of its own, then the subjects context shall refuse it. [subjects 2.1]
- SUBJ-011 The subjects context shall bind the overlord to what it owes each kind: defence (Vassal, Union, Colony, Protectorate), defence against anyone but itself (Tributary), one ruler for both (Union), a yearly stipend (March), ships on the sea route (Colony). [subjects 2.1]
- SUBJ-012 The subjects context shall give each Tributary, March and Protectorate a permanent drift reason of −1. [subjects 2.1, 3.1]
- SUBJ-013 Where the era is before VI, the subjects context shall allow a Protectorate only to an overseas trade empire from era IV. [subjects 2, 16 decided]

### 5.3 Mapping the data

- SUBJ-014 When the 1444 relations are loaded, the subjects context shall map `subject_kind` vassal → Vassal, fief → Vassal with *Held of the Church* (overlord a religious head) or *Held in fief*, appanage → Vassal with *Kin*, tributary → Tributary, personal_union → Union, frontier_commandery → March, colony → Colony, and estate → a lord of its crown, never a separate country. [subjects 2.2; config `mapping_1444.relations_subject_kind`]
- SUBJ-015 When an event creates a subject, the subjects context shall map event `vassalize` types vassal, tributary and colony to the same names, protectorate and puppet to Protectorate, dominion to Colony at Self-governing, and the `personal_union` relation to Union. [subjects 2.2; config `mapping_1444.event_vassalize_type`]
- SUBJ-016 The subjects context shall start 1444 with 135 subjects from the 167 Subject records (32 estates becoming lords): 83 vassals, 31 tributaries, 9 unions, 7 marches and 5 colonies, fewer if the map mapping turns small vassals into lords. [subjects 2.2]

### 5.4 Ties

- SUBJ-017 While a subject's ruler is of the overlord's ruling house (*Kin*), the subjects context shall give it +1 loyalty reason, and if the overlord's line dies out, give its ruler a claim to the overlord's throne. [subjects 2.3]
- SUBJ-018 While a subject is *Held of the Church*, the subjects context shall have it pay only a token and never fight for its overlord. [subjects 2.3; config `ties.held_of_the_church`; D-SUBJ-13]
- SUBJ-019 While a subject is *Held in fief*, the subjects context shall have it pay only a token, never call it to war, and count it ½ for reach. [subjects 2.3]
- SUBJ-020 While a subject has a *Second master*, the subjects context shall give the second master a small tribute (5 %) and no other rights, and when the two masters go to war, the subject leans to the stronger. [subjects 2.3; config `ties.second_master`]
- SUBJ-021 While the overlord holds a subject's heir (*Hostage at court*), the subjects context shall give +1 loyalty reason, and −2 if the hostage is mistreated or lost. [subjects 2.3, 4]

### 5.5 Colony stages

- SUBJ-022 When a colony is founded, the subjects context shall make it an Outpost: it pays 25 %, has no army of its own, and the overlord's governor (an official) runs it. [subjects 2.4]
- SUBJ-023 When a colony has 5 or more provinces and more than half of its people are settlers, the subjects context shall make it Settled: it raises its own militia and its settlers become a peace voice that can be Wavering; an Outpost stays Loyal and has no seasonal count. [subjects 2.4; D-SUBJ-23]
- SUBJ-024 When a colony has 10 or more provinces and 50 years, or an event (`create_country … subject_of`, dominion) says so, the subjects context shall make it Self-governing: it pays 10 %, keeps its own lords, and can only be released or kept. [subjects 2.4]
- SUBJ-025 When a Settled or Self-governing colony turns Disloyal, the subjects context shall report the settler-independence trigger to the revolutions context. [subjects 2.4, 12]

### 5.6 Loyalty

- SUBJ-026 The subjects context shall give each subject one of the lords' four loyalty steps, Loyal, Wavering, Disloyal or In revolt, with the effects of the Loyalty steps table. [subjects 3; config `loyalty.effects`]
- SUBJ-027 While a subject is Wavering and called to war, the subjects context shall send half its army, late, and bring it home after 6 months unless the war is on its border. [subjects 3]
- SUBJ-028 While a subject is Disloyal, the subjects context shall refuse its overlord's calls, add a down reason for 12 months for each further call, and hide its army's size from the overlord. [subjects 3; config `reasons.refused_call_again`]
- SUBJ-029 The subjects context shall show loyalty reasons as named, visible badges pointing up or down, with no hidden number. [subjects 3.1]
- SUBJ-030 At the end of every season (3 months), the subjects context shall add a subject's arrows: +2 or more moves loyalty one step up, −2 or less one step down, otherwise it stays. [subjects 3.1; config `loyalty`]
- SUBJ-031 If loyalty moved in one direction less than 12 months ago, then the subjects context shall not move it again in the same direction. [subjects 3.1; config `min_months_between_same_direction_steps`]
- SUBJ-032 The subjects context shall apply the up and down reasons of the Reasons table with their weights and durations. [subjects 3.1; config `reasons`]
- SUBJ-033 The subjects context shall test *You are much stronger* as the overlord's soldiers at least 3 times the subject's, and *You are not much stronger* as the subject's soldiers at least half the overlord's. [subjects 3.1; config]
- SUBJ-034 The subjects context shall give *Outgrown* when the subject has more provinces than its overlord, or more than its kind allows (a Vassal: more than half of the overlord's). [subjects 3.1]
- SUBJ-035 When an event adds or removes a reason by id, or adds a named one-off reason with its own arrow, the subjects context shall apply it for the stated months. [subjects 3.1, 11.1]
- SUBJ-036 When the 1444 scenario starts, the subjects context shall set loyalty from the dataset's autonomy (very low, low, moderate → Loyal; high, very high → Wavering), one step lower if the subject is Hostile toward its overlord in the data, and apply reasons from the first season. [subjects 3.2; config `start_1444_by_autonomy`]

### 5.7 Overlord actions

- SUBJ-037 When the overlord sets tribute to none, light, normal, heavy or crushing, the subjects context shall pay ×0, ×0.5, ×1, ×1.5 or ×2 of the kind's share, giving light an up reason and heavy (−1) and crushing (−2) down reasons. [subjects 4, 3.1; config `tribute_levels`]
- SUBJ-038 When the overlord calls a subject to war, the subjects context shall answer as a lord would (warfare 3.2) by its loyalty and kind; tributaries are never called. [subjects 4]
- SUBJ-039 When the overlord sends a gift (6 months of the subject's income, provisional), the subjects context shall add +1 for 5 years. [subjects 4; config `reasons.gift`, `actions.gift_months_of_income`; D-SUBJ-10]
- SUBJ-040 While the overlord has a resident at a subject's court (one envoy), the subjects context shall add +1, reveal any foreign envoy courting it, and show its true army even when Disloyal. [subjects 4]
- SUBJ-041 When the overlord lends an official to a subject (paying the official's wages), the subjects context shall add +1 and apply the official's type effect in the subject's land. [subjects 4]
- SUBJ-042 When the overlord takes a hostage, the subjects context shall require the subject Loyal or Wavering (or a peace term), add *Hostage at court*, return the heir when the subject's ruler dies, and give −2 if he is harmed. [subjects 4, 2.3]
- SUBJ-043 When a marriage binds the overlord's and the subject's houses, the subjects context shall add the *Marriage* reason and allow a path to a Union when a ruler dies without heirs. [subjects 4]
- SUBJ-044 When the overlord tightens a subject, the subjects context shall allow only Tributary → Vassal, take one envoy for 6 months, and require the subject Loyal; a Wavering subject refuses and drops a step; Vassal → Union is not possible. [subjects 4; config `tighten`]
- SUBJ-045 When the overlord loosens a Vassal or Protectorate, the subjects context shall make it a Tributary at no cost and add +2 for 10 years; Colony, March and Union cannot be loosened or tightened. [subjects 4; config `loosen`, `reasons.loosened`; D-SUBJ-15]
- SUBJ-046 When the overlord releases a subject, the subjects context shall make it independent and Friendly toward the overlord (`release_subject`); no reasons change for anyone. [subjects 4; D-SUBJ-12]
- SUBJ-047 When the overlord deposes a subject's ruler, the subjects context shall require a pretender of the overlord to its throne or its ruler Disloyal (and, if In revolt, a won war first), seat the candidate starting Loyal, and give every other subject −1 for 5 years. [subjects 4; config `reasons.deposed_other_subject`]
- SUBJ-048 The subjects context shall show each overlord action as a button on the subject's card; a locked button names its first missing requirement. [subjects 4, 10.2]

### 5.8 Raising a lord

- SUBJ-049 When the overlord raises a lord who holds at least 3 provinces and is Loyal or Wavering, the subjects context shall make him a Vassal (or a March on a frontier) with his provinces as its own country on the map and his retinue as its army. [subjects 4.1; config `raise_lord`]
- SUBJ-050 When a Wavering lord is raised, the subjects context shall give him *Given a crown* +1 for 10 years. [subjects 4.1]
- SUBJ-051 When a lord is raised, the subjects context shall take him off the lord capacity and put him on subject reach; his land leaves the realm, the overlord gets a share instead of half his taxes, and he may make his own friends abroad. [subjects 4.1, 6]

### 5.9 Obligations both ways

- SUBJ-052 When anyone but the overlord attacks a subject the overlord owes defence, the subjects context shall call the overlord as if it were the subject's ally; refusing gives the overlord an Oath broken, the subject *You left it alone*, and every other subject −1 for 5 years. [subjects 5, 3.1]
- SUBJ-053 Each year a March's stipend is missed, the subjects context shall give that March −1. [subjects 5; config `reasons.missed_stipend`]
- SUBJ-054 While a Union shares the overlord's ruler, the subjects context shall make every war of that ruler the Union's war and add the Union's lords' peace voices to the overlord's. [subjects 5]
- SUBJ-055 If two subjects of one overlord are at odds, then the subjects context shall forbid them to fight without the overlord's leave and let the overlord pick a side (the loser's loyalty drops one step) or forbid it (both −1 for 5 years). [subjects 5]

### 5.10 Subject reach

- SUBJ-056 The subjects context shall read subject reach from the government context, starting from the catalogue's `administrative_capacity` (very low 2, low 3, moderate 5, high 7, very high 9), as a number separate from lord capacity. [subjects 6, 16 decided; config `reach_by_administrative_capacity`]
- SUBJ-057 The subjects context shall count each direct subject by its kind's weight (Tributary and March ½, Held in fief ½, others 1). [subjects 2.1, 2.3, 6]
- SUBJ-058 While reach used exceeds subject reach, the subjects context shall give every subject *Stretched thin* −1, and −1 more to each of the N furthest subjects, N being reach used beyond reach rounded up. [subjects 6; config `reasons.stretched_thin`; D-SUBJ-7]
- SUBJ-059 The subjects context shall count a subject that holds subjects at 3 times its kind's weight plus 1 for each of its own subjects. [subjects 6.1; config `subjects_with_subjects`]
- SUBJ-060 While a subject holds subjects of its own, the subjects context shall give it *Master of others* −3. [subjects 6.1]
- SUBJ-061 The subjects context shall let only the direct overlord act on a subject; a subject's subjects count nothing in the overlord's reach and pay it nothing. [subjects 6.1]
- SUBJ-062 When a subject releases its own subjects (as a peace term or as a condition of a gift or marriage), the subjects context shall remove *Master of others*. [subjects 6.1]
- SUBJ-063 When a subject is folded in or falls, the subjects context shall make its subjects step up to the overlord, keeping their loyalty. [subjects 6.1, 7]

### 5.11 Folding in

- SUBJ-064 When the overlord folds in a subject, the subjects context shall require: Loyal for the last 10 years, a subject for 20 years or more, a land path or the overlord's sea route to it, room for one more lord in lord capacity, and a kind other than Tributary or Self-governing colony. [subjects 7; config `fold_in`]
- SUBJ-065 When the 1444 scenario starts, the subjects context shall count each subject as held since its dataset `start_date` (20 years when unknown), and a subject Loyal in 1444 as Loyal for 10 years. [subjects 7]
- SUBJ-066 While folding in, the subjects context shall keep one envoy at the subject's court for 1 month per province, and if the subject drops to Wavering, stop the folding and bring the envoy home. [subjects 7; config `fold_in.envoy_months_per_province`]
- SUBJ-067 When folding in completes, the subjects context shall remove the subject's country from the map, make its ruler one lord holding all its provinces (its own lords merged into his card), and send its buildings, army (as his retinue) and treasury (as his wealth) with him. [subjects 7]
- SUBJ-068 When folding in completes, the subjects context shall give its provinces *Foreign rule* for 10 years unless it shared the overlord's faith and people. [subjects 7; config `fold_in.foreign_rule_grievance_years`]
- SUBJ-069 When an Outpost or Settled colony is folded in, the subjects context shall make its provinces royal land at once, needing the overlord's officials. [subjects 7]
- SUBJ-070 When a Union is merged (*Merge the crowns*), the subjects context shall require 50 years in union and the junior crown Loyal, join its provinces to the realm, make its lords the overlord's lords one by one keeping their loyalty, and turn the union's laws into a charter in its provinces. [subjects 7; config `kinds.union.merge_requires_years`]
- SUBJ-071 When the ruler of a Loyal Vassal or Union dies without an heir, the subjects context shall let the overlord inherit it and fold it in at once without the 10- and 20-year requirements. [subjects 7.1]
- SUBJ-072 When the ruler of any other subject dies without an heir, the subjects context shall let its lords pick a new ruler, and the overlord may back a candidate with an envoy. [subjects 7.1]
- SUBJ-073 Where the overlord holds the event-tree flag `doctrine_of_lapse`, the subjects context shall fold in any subject whose ruler dies without a natural heir and give every other subject −1 for 10 years. [subjects 7.1; config `reasons.lapse_annexation`]

### 5.12 Losing subjects

- SUBJ-074 While a subject is Disloyal, the subjects context shall stop its payments, refuse calls, and let it bargain with foreign envoys for a backer that agrees to declare *Break a subject* when it rises. [subjects 8.1]
- SUBJ-075 When a Disloyal subject rises, the subjects context shall make every other Disloyal subject of the same overlord that borders it or shares its backer rise too. [subjects 8.1; config `rising.disloyal_neighbours_join`]
- SUBJ-076 When a Disloyal subject has a backer that is at peace and willing, or its overlord is at war elsewhere with over half its peace voices for peace, or an event says so, the subjects context shall make it rise to In revolt. [subjects 8.2; config `rising`]
- SUBJ-077 When a subject rises, the subjects context shall start the independence war (`independence_war`) with the subject's war aim fixed as *Independence* and its backer joining. [subjects 8.2]
- SUBJ-078 When the overlord wins an independence war, the subjects context shall let the peace restore the subject one kind tighter, or fold it in at once if it shares a border, ignoring the year requirements. [subjects 8.2]
- SUBJ-079 When the subject wins an independence war, the subjects context shall make it independent with a Hostile stance toward the old overlord. [subjects 8.2]
- SUBJ-080 When a Disloyal subject that borders a rival of its overlord asks to change masters and it fits within the rival's reach, the subjects context shall make it the rival's subject of the same kind, and the old overlord and the rival turn Hostile toward each other. [subjects 8.3; D-SUBJ-11]
- SUBJ-081 When a country declares *Break a subject* on a subject, the subjects context shall call the subject as defender and its overlord to defend it; if the attacker wins, the attacker chooses in the peace whether the subject goes free or becomes its subject. [subjects 8.4]
- SUBJ-082 When an overlord is destroyed or becomes someone else's subject, the subjects context shall free its Tributaries and Marches, and give its Vassals, Unions and Colonies to whoever took its capital if that country wants them, otherwise free them. [subjects 8.5]

### 5.13 Making a subject

- SUBJ-083 When a peace term *Become a subject* is taken (over three quarters peace voices), the subjects context shall let the winner pick Vassal or Tributary, or Protectorate from era VI (era IV for an overseas trade empire); a distant loser with no land path can only become a Tributary. [subjects 9]
- SUBJ-084 When a 20-year tribute peace term has run, the subjects context shall let the receiver offer the payer Tributary by envoy, which the payer accepts if it is weaker. [subjects 9]
- SUBJ-085 When a war to seat a pretender is won, the subjects context shall let the winner make the realm its Vassal or its ally, the new ruler starting Loyal. [subjects 9]
- SUBJ-086 When diplomacy's count accepts *Offer overlordship* or *Ask for protection*, the subjects context shall make the smaller country a Tributary, or a Vassal if it asked. [subjects 9; diplomacy 6.7; D-SUBJ-4]
- SUBJ-087 When a ruler of a realm inherits another crown after a marriage, the subjects context shall receive the result as a Union. [subjects 9]
- SUBJ-088 When the overlord makes a frontier grant to a frontier chief who is nobody's subject, sharing a border, with a gift, the subjects context shall make the chief a March. [subjects 9]
- SUBJ-089 When a group of the overlord's colonial provinces in one distant region is chartered, the subjects context shall make it one Colony. [subjects 9]
- SUBJ-090 When an event uses `vassalize`, `create_country … subject_of` or `relation: personal_union`, the subjects context shall create the subject of the kind it names (mapped by SUBJ-015), and a created country is a Colony at Self-governing unless the event names another kind. [subjects 9, 11.1]

### 5.14 On screen

- SUBJ-091 The subjects list (a tab on the country card) shall show reach used of reach, monthly tribute in gold and grain, and one row per subject with its kind icon, loyalty, up and down arrow counts, what it pays and its worst reason, sorted by loyalty, worst first. [subjects 10.1]
- SUBJ-092 The subject card shall use the lord card's frame and show kind, ruler, provinces, army, treasury, its own subjects, loyalty with its reasons, what it pays and how it comes when called, and the action buttons. [subjects 10.2]
- SUBJ-093 At world zoom, the map shall show a subject in its direct overlord's colour with a 2-pixel diagonal hatch in its own colour and a dotted border with the overlord, never stacking two hatches. [subjects 10.3, 6.1]
- SUBJ-094 At region zoom, the map shall put the kind's icon on the subject's capital with its frame tinted by loyalty (green, yellow, orange, red). [subjects 10.3]
- SUBJ-095 The subjects lens shall colour the player's subjects by loyalty and draw a line to each Courted subject from the courting country's capital. [subjects 10.3]
- SUBJ-096 When the player long-presses a subject on the map (touch) or selects it and presses the card button (controller), the game shall open its card. [subjects 10.3]

### 5.15 Events

- SUBJ-097 The subjects context shall read and write the event-tree keys `vassalize`, `release`, `relation {subject | overlord | personal_union}`, `subject_count` (by reach weights only if the event says so), `create_country … subject_of` and the `doctrine_of_lapse` flag, and the new keys `subject_loyalty`, `add_subject_reason` / `remove_subject_reason` and `change_subject_kind`. [subjects 11.1]

### 5.16 AI

- SUBJ-098 Where an AI is an overlord, the subjects context shall have it fold in Loyal subjects when lord capacity allows and its personality likes centralising, loosen a Disloyal subject when at war elsewhere, station residents on its biggest Wavering subjects, and never let reach overflow by more than 1. [subjects 11.2]
- SUBJ-099 Where an AI is a subject, the subjects context shall have a Disloyal one look for a backer; an opportunist rises the moment its overlord is losing a war; a cautious one waits for a backer and its neighbours. [subjects 11.2]
- SUBJ-100 Where an AI is a rival, the subjects context shall have it send envoys to court its rivals' Wavering subjects and pick *Break a subject* against the overlord with the most Disloyal subjects. [subjects 11.2]
- SUBJ-101 The subjects context shall work out loyalty once a season per subject from cached reasons. [subjects 11.2]

### 5.17 Playing as a subject

- SUBJ-102 Where the player plays a subject, the subjects context shall show the player its own card from below with the same badges, and let it pay and be protected, stop paying, find a backer, wait for the overlord's bad war, or marry into the overlord's house to inherit its crown (a union can run either way). [subjects 13]
- SUBJ-103 When a Loyal subject sends an envoy to ask politely for a looser kind, the subjects context shall grant it if the overlord's AI is cautious or over reach. [subjects 13]
- SUBJ-104 When a subject wins its independence war, the subjects context shall let it make its old overlord its own subject in the same peace if voices allow. [subjects 13]
- SUBJ-105 The subjects context shall let every playable subject in the catalogue (218) be played from the start. [subjects 13, 16 decided]

### 5.18 Configuration

- SUBJ-106 The subjects context shall read every number from `config/subject-rules.json` (placeholders), and changing balance shall never touch the rules or the 1444 data. [subjects 15]
- SUBJ-107 When the overlord folds in or deposes a subject by force, or restores a subject after winning its independence war, the subjects context shall give every other subject *Force used* −1 for 5 years. [subjects 14 example; config `reasons.force_used_on_other_subject`; D-SUBJ-9]
- SUBJ-108 When a lord is raised, the subjects context shall let the overlord pick Vassal, or March if the lord's land borders a foreign realm. [subjects 4.1; D-SUBJ-14]
- SUBJ-109 When a subject's ruler dies without an heir, the subjects context shall apply SUBJ-071 and SUBJ-072 and ignore foreign marriage claims (diplomacy 6.2). [subjects 7.1; D-SUBJ-22]
- SUBJ-110 The subjects context shall stop the seasonal count at Disloyal; a subject goes In revolt only by SUBJ-076. [subjects 3.1, 8.2; D-SUBJ-24]

## 6. Commands

| Command | Who | Preconditions | Result | Events emitted |
|---|---|---|---|---|
| SetTribute(subject, level) | player / AI overlord | direct subject | new level | SubjectTributeSet |
| SetTributeForm(subject, gold / grain) | player / AI overlord | direct subject | form | SubjectTributeSet |
| CallSubjectToWar(subject, war) | player / AI / system | at war | answer by loyalty and kind | SubjectCalled |
| SendSubjectGift(subject, gold) | overlord | gold | +1 for 5 years | SubjectGiftSent |
| StationResident(subject) | overlord | free envoy | resident | ResidentStationed |
| LendOfficial(subject, official) | overlord | official | lent | OfficialLent |
| TakeHostage(subject) | overlord | Loyal/Wavering or peace term | tie | HostageTaken |
| ArrangeSubjectMarriage | overlord / subject | diplomacy rules | marriage | (diplomacy) MarriageArranged |
| Tighten(subject) | overlord | Tributary, Loyal, free envoy | after 6 months Vassal | SubjectKindChanged / TightenRefused |
| Loosen(subject) | overlord | Vassal or Protectorate | Tributary | SubjectKindChanged |
| FoldIn(subject) | overlord | SUBJ-064 | envoy months; then lord | FoldInStarted, FoldInStopped, SubjectFoldedIn |
| MergeCrowns(union) | overlord | SUBJ-070 | provinces join | SubjectFoldedIn |
| ReleaseSubject(subject) | overlord | direct subject | independent, Friendly | SubjectReleased |
| DeposeRuler(subject, candidate) | overlord | pretender or Disloyal ruler | new ruler Loyal | SubjectRulerDeposed |
| RaiseLord(lord, kind) | overlord | ≥ 3 provinces, Loyal/Wavering | new subject country | LordRaised |
| FrontierGrant(chief, gift) | overlord | border, not anyone's subject | March | SubjectCreated |
| CharterColony(provinces) | overlord | colonial provinces in one distant region | Colony | SubjectCreated |
| JudgeQuarrel(subject A, subject B, side / forbid) | overlord | two subjects at odds | loser −1 step / both −1 | SubjectQuarrelJudged |
| SeekBacker(country) | Disloyal subject | Disloyal | backer agreed | BackerFound |
| ChangeMasters(rival) | Disloyal subject | borders a rival of overlord | new overlord if accepted | SubjectChangedMasters |
| AskToLoosen | subject | Loyal; envoy | looser kind if granted | SubjectKindChanged |
| PayStipend(march) | overlord | March | stipend paid | StipendPaid |
| AdvanceSubjectSeason | system | season end | loyalty steps | SubjectLoyaltyChanged |

## 7. Domain events

| Event | When | Payload | Consumed by |
|---|---|---|---|
| SubjectCreated | any way of 9 | subject, overlord, kind, ties | diplomacy (relation), map-presentation, events |
| SubjectKindChanged | tighten, loosen, event, restore | subject, old, new | diplomacy, map-presentation |
| SubjectLoyaltyChanged | season count | subject, step, reasons | realm (peace voices), events (`subject_loyalty`), map-presentation |
| SubjectTributePaid | monthly | payer, receiver, gold, grain | realm (treasury, Food) |
| SubjectCalled / SubjectAnswered | call to war | subject, war, army share | warfare |
| SubjectRose | rising | subject, backer, joiners | diplomacy (`independence_war`), warfare |
| SubjectFoldedIn | fold-in done | subject, new lord, provinces | realm (new lord), province (royal land / grievance), rebellions (*Foreign rule*), map |
| SubjectReleased | release | subject | diplomacy (`release_subject`) |
| SubjectChangedMasters | change masters | subject, old, new | diplomacy |
| LordRaised | raise | lord, new country | realm, world-map |
| SubjectRulerDeposed | depose | subject, candidate | realm |
| SettlerIndependenceTrigger | Disloyal Settled / Self-governing colony | colony | revolutions |
| OverlordFell | overlord destroyed or subjected | subjects and their fate | diplomacy |

## 8. Policies (reactions to other contexts)

- When **diplomacy** reports SubjectByAgreementAgreed, then subjects creates the subject with an allowed kind.
- When **diplomacy** reports CrownInherited, then subjects creates a Union (SUBJ-087).
- When **warfare** reports a peace with *Become a subject*, *Tribute*, *Seat a pretender* or a won independence
  war, then SUBJ-078, SUBJ-079, SUBJ-083 … SUBJ-085, SUBJ-104 apply.
- When **warfare** reports a war lost by the overlord, then *You lost a war* applies for 10 years.
- When **realm** reports a new ruler on the overlord's throne, then *New ruler* applies for 5 years; when a
  subject's ruler dies without an heir, SUBJ-071 … SUBJ-073 apply.
- When **diplomacy** reports a foreign envoy resident or courting at a subject's court, then *Courted* applies.
- When **government** changes subject reach or lord capacity, then reach and fold-in checks are re-run.
- When **religion** or **culture** change a ruler's faith or culture or accepted cultures, then the faith and
  people reasons are re-read.
- When **events** use the subject keys, then SUBJ-035, SUBJ-090, SUBJ-097 apply.
- When **province** / **exploration** add colonial provinces, then colony stages are re-checked.

## 9. Monthly steps

A turn is one week (X-18). The steps below run in the turn in which a new month begins; season-end steps in the
turn in which a new season begins, yearly steps in the turn in which 1 January falls.

Reads first: relations (diplomacy), soldiers (realm/recruiting), treasury (realm), era (time-and-turns), reach
and lord capacity (government).
1. Each month: pay tribute from each subject's treasury by kind, level, loyalty and form (SUBJ-005 … SUBJ-007).
2. Each month: progress tighten and fold-in envoys; stop a fold-in if the subject is Wavering.
3. Each month: check rising conditions for Disloyal subjects (SUBJ-076) and joint risings.
4. Each season end: recompute reasons and move loyalty (SUBJ-030, SUBJ-031).
5. Each year: march stipend due (SUBJ-053); colony stage checks.
Order relative to warfare and diplomacy follows X-2: subjects, then government, then diplomacy (D-SUBJ-20).

## 10. Configuration

All in `subjects/config/subject-rules.json`; all placeholders.

| Key | Meaning | Value in the design | Placeholder? | Config file |
|---|---|---|---|---|
| `loyalty.steps` | Steps | loyal, wavering, disloyal, in_revolt | rule | subject-rules.json |
| `loyalty.check_every_months` | Season | 3 | yes | subject-rules.json |
| `loyalty.step_up_at` / `step_down_at` | Thresholds | +2 / −2 | yes | subject-rules.json |
| `loyalty.min_months_between_same_direction_steps` | Damping | 12 | yes | subject-rules.json |
| `loyalty.effects.*` | Step effects | pays 1 / 0.5 / 0 / 0; wavering home after 6 months | yes | subject-rules.json |
| `loyalty.start_1444_by_autonomy` | Start | low–moderate Loyal; high–very high Wavering | yes | subject-rules.json |
| `loyalty.start_1444_hostile_stance_steps_down` | | 1 | yes | subject-rules.json |
| `kinds.*.pays_share` | Shares | 0.10, 0.15, 0.05, 0, 0.25, 0.10 | yes | subject-rules.json |
| `kinds.*.reach_weight` | Weights | 1, 0.5, 1, 0.5, 1, 1 | yes | subject-rules.json |
| `kinds.*.drift` | Drift | 0, −1, 0, −1, 0, −1 | yes | subject-rules.json |
| `kinds.union.merge_requires_years` | | 50 | yes | subject-rules.json |
| `kinds.colony.stages` | Stages | settled 5 provinces; self-governing 10 provinces, 50 years, 0.10 | yes | subject-rules.json |
| `kinds.protectorate.min_era` / `min_era_overseas_trade_empire` | | VI / IV | decided | subject-rules.json |
| `ties.*` | Ties | kin +1; church 0.01; fief 0.01, ½ reach; second master 0.05; hostage +1 / −2 | yes | subject-rules.json |
| `reasons.*` | Reasons | Reasons table | yes | subject-rules.json |
| `tribute_levels` | | 0, 0.5, 1, 1.5, 2 | yes | subject-rules.json |
| `reach_by_administrative_capacity` | | 2, 3, 5, 7, 9 | yes | subject-rules.json |
| `raise_lord` | | 3 provinces; loyal, wavering; vassal, march | yes | subject-rules.json |
| `fold_in` | | 10 years loyal; 20 years; path; lord capacity; 1 month per province; 10 years foreign rule; 20 years if unknown | yes | subject-rules.json |
| `tighten` | | 6 months; loyal; −1 step on refusal; tributary → vassal | yes | subject-rules.json |
| `loosen.order` | | vassal → tributary; protectorate → tributary | rule | subject-rules.json |
| `rising` | | backer or overlord losing; 0.5; neighbours join | yes | subject-rules.json |
| `mapping_1444` | | section 4 | rule | subject-rules.json |
| `subjects_with_subjects` | | ×3; +1 per own subject; overlord cannot act | yes | subject-rules.json |

## 11. Seams

| Other context | Direction | Pattern | What crosses |
|---|---|---|---|
| diplomacy | upstream | Customer–Supplier | Subject relation records, kinds, `make_subject`, `release_subject`, `independence_war`, envoys, marriages, protection asks, courting, crowns inherited |
| diplomacy (decided) | partnership | Customer–Supplier | Diplomacy maps relation kinds onto the six kinds through `mapping_1444` and reads `fights` / `own_diplomacy` from here (X-8); its counts decide asks by agreement and this context picks the kind (D-SUBJ-4); Break a subject targets the overlord (D-SUBJ-6) |
| realm | upstream | Partnership | Lords and loyalty steps (same four steps), lord card frame, ruler, heirs, soldiers, treasury, Oaths broken, Food from grain tribute, raised lords and folded-in rulers as lords |
| government | upstream | Customer–Supplier | Subject reach (base + form), lord capacity; government sets no limits on kinds (D-SUBJ-19) |
| warfare | upstream | Partnership | Calls to war by loyalty, *Break a subject* and *Independence* aims, peace terms *Become a subject* / *Tribute* / *Seat a pretender*, peace voices of unions, overlord losing |
| province | downstream | Customer–Supplier | Royal land from folded colonies, charters from merged crowns, subject ruler as governance, lent officials |
| rebellions | downstream | Customer–Supplier | *Foreign rule* grievance, lord rising with land as counterpart |
| religion | upstream | Conformist | Same faith, persecution, *Held of the Church* |
| culture | upstream | Conformist | Same people, accepted cultures |
| national-strengths | upstream | Open Host Service | Changes to reach, drift or kinds (Ming tributary reach, Ottoman fold-in of tributaries) |
| revolutions | downstream | Customer–Supplier | Settler independence trigger; `change_subject_kind` and `release` by revolution |
| naval | upstream | Conformist | Sea route for *Far away*, colonies and fold-in path; colony defence by sea |
| trade | downstream | Customer–Supplier | Colony trade goods flow home; overseas trade empire definition; tributary toll proposal |
| exploration | upstream | Customer–Supplier | Colonial provinces chartered into a Colony |
| events | upstream | Published Language | `vassalize`, `release`, `relation`, `subject_count`, `create_country … subject_of`, `doctrine_of_lapse`, new keys |
| scenario-setup | upstream | Published Language | 1444 subject records, autonomy, start dates, which catalogue subjects are map nations, `administrative_capacity`, playable subjects |
| map-presentation | downstream | Published Language | Hatch, dotted border, kind icon and loyalty tint, subjects lens |
| game-shell | downstream | Published Language | Subjects list tab, subject card, long-press / controller |
| time-and-turns | upstream | Conformist | Week turn (X-18), month, season, year, era; X-2 order: subjects before government and diplomacy (D-SUBJ-20) |

## 12. AI

- As overlord: folds in Loyal subjects when lord capacity allows and its personality likes centralising;
  loosens a Disloyal subject when at war elsewhere; stations residents on its biggest Wavering subjects; never
  lets reach overflow by more than 1 (SUBJ-098).
- As subject: a Disloyal AI seeks a backer; an opportunist rises the moment the overlord is losing; a cautious
  one waits for a backer and its neighbours (SUBJ-099).
- As a rival: courts rivals' Wavering subjects; picks *Break a subject* against the overlord with the most
  Disloyal subjects (SUBJ-100).
- Answers a Loyal subject's polite ask to loosen when cautious or over reach (SUBJ-103).
- Loyalty once a season from cached reasons (SUBJ-101).

## 13. Decisions and open questions

- **D-SUBJ-1** (was OQ-SUBJ-1) Kinds in wars and diplomacy: the six kinds are the only kinds. A Vassal or Protectorate comes when called, by loyalty. A March fights only on its own frontier. A Union always comes if Loyal or Wavering. A Tributary never comes and a Colony only defends itself. Union, Colony and Protectorate have no own diplomacy. The eight relation kinds are mapped onto the six in `mapping_1444`. X-8 decides it.
- **D-SUBJ-2** (was OQ-SUBJ-2) Shares: this design's shares win (pays_share by kind and tie), with no manpower share; the old restlessness keys become loyalty reasons. X-8 decides it.
- **D-SUBJ-3** (was OQ-SUBJ-3) Estates: estates are lords of the realm, not subjects; the mapping turns `estate` into a lord when the game loads, and the relations dataset itself is left as it is. X-8 decides it.
- **D-SUBJ-4** (was OQ-SUBJ-4) Making a subject by agreement: diplomacy's counts decide (*Offer overlordship* base −80, *Ask for protection* base −10). On a yes this context makes a Tributary, or a Vassal when the small country asked. One count for every ask.
- **D-SUBJ-5** (was OQ-SUBJ-5) Envoy work: Tighten, Fold in and Station a resident take an envoy's time; *Courted* comes from a foreign envoy stationed at the subject's court. A subject's ask to loosen and the 20-year tributary offer are decided by this design's own rules, without a count. They reuse envoys and need no new action.
- **D-SUBJ-6** (was OQ-SUBJ-6) *Break a subject*: the war is declared on the overlord, who is the defender; the subject answers by its kind and loyalty, and the winner chooses to free or take it. It agrees with D-DIPL-8.
- **D-SUBJ-7** (was OQ-SUBJ-7) Stretched thin: every subject takes −1, and the N furthest subjects take −1 more each, where N is the reach used beyond reach, rounded up. It matches the example ("hits the four furthest away").
- **D-SUBJ-8** (was OQ-SUBJ-8) France example: the Dauphiné has 3 provinces (one envoy for 3 months); Brittany is ▲3 ▼3 in step 4 and the list and card follow it. The example's own step wins.
- **D-SUBJ-9** (was OQ-SUBJ-9) Armagnac and force used: Armagnac rises by an event (an event may start a rising). *Force used* (−1 for 5 years) goes to every other subject when the overlord folds in or deposes a subject by force, or restores one after winning its independence war. It is the config reason, used where force is used.
- **D-SUBJ-10** (was OQ-SUBJ-10) Gift and reasons: a gift costs 6 months of the subject's income (provisional). *Common enemy* is a shared Rival stance only. *Far away* means no land border and no sea route, where a sea route is both holding coastal provinces on a linked sea. These are the simplest readings.
- **D-SUBJ-11** (was OQ-SUBJ-11) Changing masters: the rival accepts when the subject fits within its reach (the player chooses for the player's realm). The old overlord and the new master both turn Hostile toward each other. No new count is needed.
- **D-SUBJ-12** (was OQ-SUBJ-12) Release: the released country becomes independent and Friendly; no reasons change for anyone, and the *Courted* clause is dropped. It was undefined and adds nothing.
- **D-SUBJ-13** (was OQ-SUBJ-13) Held of the Church: the "Defend the faith matter" clause is dropped; Defend the faith comes only from persecution (diplomacy 7.1). One source for the aim.
- **D-SUBJ-14** (was OQ-SUBJ-14) Raised lords: a Loyal raised lord gets no extra reason, and a Wavering one gets *Given a crown* +1 for 10 years. The overlord picks the kind: Vassal, or March when the lord's land borders a foreign realm. It is the design's text.
- **D-SUBJ-15** (was OQ-SUBJ-15) Tighten and loosen: only Tributary → Vassal can be tightened. A Vassal or Protectorate loosens only to Tributary, and Colony, March and Union cannot change by tightening. It matches config `tighten.order`.
- **D-SUBJ-16** (was OQ-SUBJ-16) Event keys: `subject_loyalty`, `add_subject_reason`, `remove_subject_reason` and `change_subject_kind` are adopted here, and `vassalize` maps dominion → Self-governing colony and puppet → Protectorate. The events context adds the words to its vocabulary.
- **D-SUBJ-17** (was OQ-SUBJ-17) *Become a subject*: the winner picks the kind, and *Subjects* in country stats means all six kinds. It follows from X-8.
- **D-SUBJ-18** (was OQ-SUBJ-18) Overseas trade empire: colonies or trade posts in 2 or more regions other than the capital's (provisional, `protectorate.overseas_trade_empire_min_regions`). It is the design's own proposal.
- **D-SUBJ-19** (was OQ-SUBJ-19) Government limits on kinds: not adopted; any form may hold any kind its era allows. That is the simpler rule.
- **D-SUBJ-20** (was OQ-SUBJ-20) Month order: X-2 decides it. Subjects runs before government and diplomacy; seasons end in March, June, September and December.
- **D-SUBJ-21** (was OQ-SUBJ-21) Kalmar: Sweden is a Union of Denmark, Wavering in 1444; events carry it to Disloyal. The data agrees.
- **D-SUBJ-22** (was OQ-SUBJ-22) Heirless subject rulers: the overlord's rule wins for its own subjects (a Loyal Vassal or Union is inherited by the overlord); foreign marriage claims don't apply to a subject. A subject's crown is its overlord's matter.
- **D-SUBJ-23** (was OQ-SUBJ-23) Colonies: "mostly settlers" means more than 50 % settler people; settlers in a Settled colony become a peace voice. Outposts stay Loyal and have no count; the seasonal count starts at Settled. These are the simplest readings.
- **D-SUBJ-24** (was OQ-SUBJ-24) In revolt: the seasonal count stops at Disloyal; a subject goes In revolt only by the conditions of 8.2 (a backer, the overlord losing, or an event). It keeps risings deliberate.
- **D-SUBJ-25** (was OQ-SUBJ-25) Reason names: "Official lent" (+1), "Hostage harmed" (−2) and "Force used" (−1). Kin and Hostage at court are separate ties and stack (+2). Each reason is named once.

## 14. Traceability

<!-- TRACE -->
| Requirement | Feature file | Scenario |
|---|---|---|
| SUBJ-001 | ladder-and-kinds.feature | Every piece of land sits on one rung |
| SUBJ-002 | ladder-and-kinds.feature | Subject or lord |
| SUBJ-003 | ladder-and-kinds.feature | A catalogue subject that is not a map nation starts as a lord |
| SUBJ-004 | ladder-and-kinds.feature | Six kinds and their icons |
| SUBJ-005 | ladder-and-kinds.feature | What each kind pays at normal tribute |
| SUBJ-005 | ladder-and-kinds.feature | A colony's trade goods flow home first |
| SUBJ-006 | ladder-and-kinds.feature | What each kind pays at normal tribute |
| SUBJ-007 | ladder-and-kinds.feature | Tribute in grain |
| SUBJ-008 | ladder-and-kinds.feature | Who fights for the overlord |
| SUBJ-009 | ladder-and-kinds.feature | Own diplomacy by kind |
| SUBJ-010 | ladder-and-kinds.feature | Who may hold subjects of its own |
| SUBJ-011 | ladder-and-kinds.feature | What the overlord owes |
| SUBJ-012 | ladder-and-kinds.feature | A kind's drift |
| SUBJ-013 | ladder-and-kinds.feature | When protectorates are allowed |
| SUBJ-014 | data-mapping.feature | Relations kinds |
| SUBJ-015 | data-mapping.feature | Event types |
| SUBJ-016 | data-mapping.feature | Subjects in 1444 |
| SUBJ-017 | ties.feature | Kin |
| SUBJ-018 | ties.feature | Held of the Church |
| SUBJ-019 | ties.feature | Held in fief |
| SUBJ-020 | ties.feature | Second master |
| SUBJ-021 | ties.feature | Hostage at court |
| SUBJ-022 | colony-stages.feature | An outpost |
| SUBJ-023 | colony-stages.feature | Settled |
| SUBJ-024 | colony-stages.feature | Self-governing |
| SUBJ-024 | colony-stages.feature | A self-governing colony |
| SUBJ-025 | colony-stages.feature | Settler independence trigger |
| SUBJ-026 | loyalty.feature | What each step does |
| SUBJ-026 | loyalty.feature | Only a Loyal subject can be folded in |
| SUBJ-027 | loyalty.feature | A wavering subject comes half and late |
| SUBJ-028 | loyalty.feature | A disloyal subject refuses and hides its army |
| SUBJ-029 | loyalty.feature | Reasons are visible badges |
| SUBJ-030 | france-1444-1453.feature | Brittany is courted |
| SUBJ-030 | loyalty.feature | The seasonal count |
| SUBJ-031 | loyalty.feature | No two steps the same way within a year |
| SUBJ-032 | loyalty.feature | Up and down reasons |
| SUBJ-033 | loyalty.feature | The strength reasons |
| SUBJ-034 | loyalty.feature | Outgrown |
| SUBJ-035 | loyalty.feature | Events add and remove reasons |
| SUBJ-035 | subject-events.feature | The Kalmar Union breaking |
| SUBJ-036 | france-1444-1453.feature | The start |
| SUBJ-036 | loyalty.feature | Starting loyalty in 1444 |
| SUBJ-037 | france-1444-1453.feature | Armagnac is folded in by force |
| SUBJ-037 | overlord-actions.feature | Setting tribute |
| SUBJ-038 | overlord-actions.feature | Calling a subject to war |
| SUBJ-039 | overlord-actions.feature | A gift |
| SUBJ-040 | france-1444-1453.feature | Brittany is courted |
| SUBJ-040 | overlord-actions.feature | A resident at a subject's court |
| SUBJ-041 | overlord-actions.feature | Lending an official |
| SUBJ-042 | overlord-actions.feature | Taking a hostage |
| SUBJ-042 | overlord-actions.feature | The hostage goes home |
| SUBJ-043 | france-1444-1453.feature | Brittany is courted |
| SUBJ-043 | overlord-actions.feature | A marriage with a subject |
| SUBJ-044 | overlord-actions.feature | Tightening |
| SUBJ-045 | overlord-actions.feature | Loosening |
| SUBJ-046 | overlord-actions.feature | Releasing a subject |
| SUBJ-047 | overlord-actions.feature | Deposing a subject's ruler |
| SUBJ-048 | overlord-actions.feature | A locked button names its first missing requirement |
| SUBJ-049 | raising-lords.feature | Who can be raised |
| SUBJ-049 | raising-lords.feature | What a raised lord becomes |
| SUBJ-050 | raising-lords.feature | Given a crown |
| SUBJ-051 | raising-lords.feature | The trade of raising a lord |
| SUBJ-052 | obligations.feature | Defending a subject |
| SUBJ-053 | obligations.feature | A missed stipend |
| SUBJ-054 | obligations.feature | A union shares its ruler's wars |
| SUBJ-055 | obligations.feature | Two subjects at odds |
| SUBJ-056 | subject-reach.feature | Reach from administrative capacity |
| SUBJ-056 | subject-reach.feature | Reach and lord capacity are separate numbers |
| SUBJ-057 | subject-reach.feature | The Ming's tributaries and marches |
| SUBJ-058 | france-1444-1453.feature | The start |
| SUBJ-058 | subject-reach.feature | Over reach |
| SUBJ-059 | subject-reach.feature | Naples costs the Pope 4 reach |
| SUBJ-060 | subject-reach.feature | Master of others |
| SUBJ-061 | subject-reach.feature | Only the direct overlord acts |
| SUBJ-062 | subject-reach.feature | Breaking the chain |
| SUBJ-063 | subject-reach.feature | Sub-subjects step up |
| SUBJ-064 | folding-in.feature | Requirements to fold in |
| SUBJ-064 | france-1444-1453.feature | Folding in the Dauphiné |
| SUBJ-064 | france-1444-1453.feature | Folding in two small vassals |
| SUBJ-065 | folding-in.feature | Time held in 1444 |
| SUBJ-066 | folding-in.feature | The envoy at court |
| SUBJ-066 | france-1444-1453.feature | Folding in the Dauphiné |
| SUBJ-067 | folding-in.feature | What folding in does |
| SUBJ-067 | france-1444-1453.feature | Folding in the Dauphiné |
| SUBJ-068 | folding-in.feature | Foreign rule |
| SUBJ-069 | folding-in.feature | Folding in a colony |
| SUBJ-070 | folding-in.feature | Merge the crowns |
| SUBJ-071 | folding-in.feature | Inheriting a subject |
| SUBJ-072 | folding-in.feature | Inheriting a subject |
| SUBJ-073 | folding-in.feature | The doctrine of lapse |
| SUBJ-074 | losing-subjects.feature | A disloyal subject drifts away |
| SUBJ-075 | losing-subjects.feature | Disloyal subjects rise together |
| SUBJ-076 | losing-subjects.feature | When a disloyal subject rises |
| SUBJ-077 | losing-subjects.feature | The independence war |
| SUBJ-078 | france-1444-1453.feature | Armagnac is folded in by force |
| SUBJ-078 | losing-subjects.feature | The overlord wins |
| SUBJ-079 | losing-subjects.feature | The subject wins |
| SUBJ-080 | losing-subjects.feature | Changing masters |
| SUBJ-081 | losing-subjects.feature | Taken by force |
| SUBJ-082 | losing-subjects.feature | When the overlord falls |
| SUBJ-083 | making-subjects.feature | Peace term Become a subject |
| SUBJ-084 | making-subjects.feature | After twenty years of tribute |
| SUBJ-085 | making-subjects.feature | Seating a pretender |
| SUBJ-086 | making-subjects.feature | A subject by agreement |
| SUBJ-087 | making-subjects.feature | Inheritance makes a Union |
| SUBJ-088 | making-subjects.feature | Frontier grant |
| SUBJ-089 | making-subjects.feature | Chartering a colony |
| SUBJ-090 | making-subjects.feature | Events make subjects |
| SUBJ-091 | subject-screens.feature | The subjects list of France |
| SUBJ-091 | subject-screens.feature | A row shows its worst reason |
| SUBJ-092 | subject-screens.feature | The subject card of Brittany |
| SUBJ-093 | subject-screens.feature | World zoom |
| SUBJ-093 | subject-screens.feature | A chain never stacks hatches |
| SUBJ-094 | subject-screens.feature | Region zoom |
| SUBJ-095 | subject-screens.feature | The subjects lens |
| SUBJ-096 | subject-screens.feature | Opening a subject's card from the map |
| SUBJ-097 | subject-events.feature | Event keys |
| SUBJ-097 | subject-events.feature | The Kalmar Union breaking |
| SUBJ-098 | subject-ai.feature | The AI as overlord |
| SUBJ-099 | subject-ai.feature | The AI as subject |
| SUBJ-100 | subject-ai.feature | The AI as a rival |
| SUBJ-101 | subject-ai.feature | Loyalty is worked out once a season |
| SUBJ-102 | playing-as-subject.feature | The card from below |
| SUBJ-102 | playing-as-subject.feature | Stopping payment turns a subject disloyal step by step |
| SUBJ-103 | playing-as-subject.feature | Asking to loosen |
| SUBJ-104 | playing-as-subject.feature | The subject becomes the master |
| SUBJ-105 | playing-as-subject.feature | Every playable subject is playable from the start |
| SUBJ-106 | data-mapping.feature | Balance lives in config |
| SUBJ-107 | france-1444-1453.feature | Armagnac is folded in by force |
| SUBJ-108 | raising-lords.feature | What a raised lord becomes |
| SUBJ-109 | folding-in.feature | Inheriting a subject |
| SUBJ-110 | loyalty.feature | The seasonal count |
