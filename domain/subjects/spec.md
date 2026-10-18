# Subjects and overlords (SUBJ)

## 1. Purpose and scope

This context decides what types of subject exist, what a subject and its overlord owe each other, how loyal a
subject is and why, and how a subject is made, tightened, loosened, folded into the realm, released or lost.
It sees all land on one **ladder of rule**: royal land, lord's land, subject realm, independent.

**In scope**
- The ladder of rule and the one rule that separates a lord from a subject.
- Six subject types, what each pays, fights, keeps and is owed; ties (Kin, Held of the Church, Held in fief,
  Second master, Hostage at court); colony stages.
- Mapping the relations data's eight `subject_kind` values and the event tree's `vassalize` types onto the six.
- Subject loyalty: four steps, reasons, the seasonal count, starting loyalty in 1444.
- Overlord actions (set tribute, grain tribute, call to war, gift, resident, lend an official, hostage,
  marriage, tighten, loosen, fold in, release, depose), raising a lord to a subject.
- Obligations both ways (defence, march stipend, union wars, quarrels between subjects).
- The subject limit and subjects with subjects.
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
- Lord capacity and the government's change to the subject limit: **government**.
- War aims, peace voices, peace terms, calling lords: **warfare**.
- Grievances such as *Foreign rule*, risings of lords: **rebellions**.
- What "same faith", persecution, "same people" and "accepted" mean: **religion**, **culture**.
- Settler independence event chain: **revolutions**. Sea routes: **naval**. Trade privileges: **trade**.
- Colonial provinces and charters: **exploration** and **province**.
- The Empire, the Church and leagues as institutions: gap list item 8 (no context).

## 2. Sources

Newest decision first.
1. `subjects/subjects-design.md` version 1, including "Decided (16 Oct)" (section 16: subject limit separate from
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
| Type (was Type) | Vassal, Tributary, Union, March, Colony, Protectorate. Config keys still say type | The relations data's eight `subject_kind` values |
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
| Drift | A type's permanent down reason | |
| Subject limit (was Subject reach) | How many subjects a ruler can watch over; from government. Config keys still say reach | Lord capacity |
| Stretched thin | The down reason when subjects exceed the subject limit | |
| Master of others | The −3 reason of a subject holding subjects | |
| Raise (a lord) | Make a great lord a subject realm | |
| Fold in | Make a subject's ruler one of your lords, its country gone from the map | Annex by conquest |
| Merge the crowns | Folding in a Union | |
| Tighten / Loosen | Change the type one notch toward obligation / freedom | |
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
- Holds: overlord, type, ties, colony stage (colonies), tribute level and form (gold / grain), loyalty step,
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
- Holds: subject limit, subject limit used (by weights), list of subjects ordered by loyalty, tribute totals.
- INV-SUBJ-8: Subject limit used = sum of each subject's weight (2.1, ties, 6.1).

### Entities and value objects

**Types** (design 2.1; config `kinds`)

| | Vassal | Tributary | Union | March | Colony | Protectorate |
|---|---|---|---|---|---|---|
| Icon | shield | chest | two crowns | watchtower | anchor | key |
| Pays you | 10 % of its taxes | 15 % of its income, in gold or grain | 5 % | Nothing | 25 % plus its trade goods flow home first | 10 % |
| Fights for you | When called, by loyalty, like a lord | Never | Always, if Loyal or Wavering | Only in wars on its own frontier; raids your enemies there | Defends itself only | When called |
| Own diplomacy | Yes, but no wars or alliances against you or your allies | Yes, fully | No: your envoys speak for it | Yes, but no alliances | No | No |
| Own subjects | Yes | Yes | Yes | No | No | No |
| You owe it | Defence when attacked | Defence when attacked by anyone but you | Defence; one ruler for both | A yearly stipend of gold or titles | Defence; ships on its sea route | Defence |
| Subject limit weight | 1 | ½ | 1 | ½ | 1 | 1 |
| Drift | none | −1 | none | −1 | none | −1 |
| Fold in | Yes | No: tighten to vassal first | Yes, as *Merge the crowns* | Yes | Yes, into royal land | Yes |
| 1444 examples | Brittany under France; shugo houses under the Ashikaga; Romagna lords under the Pope | Joseon, Ryukyu, Dai Viet to the Ming; Serbia, Byzantium to the Ottomans; Granada to Castile | Sweden, Norway under Denmark; Sicily, Sardinia under Aragon | Jurchen and Tusi commanderies on the Ming frontier | Genoese Chios and Gazaria; Portuguese Ceuta | Bukhara under Russia; Indian princely states under the Company (event tree) |

**Ties** (2.3; config `ties`)

| Tie | Set when | Effect |
|---|---|---|
| Kin | The subject's ruler is of your ruling house (appanages) | +1 loyalty reason; if your line dies out, its ruler has a claim to your throne |
| Held of the Church | The overlord is a religious head (the Pope's fiefs) | Pays a token only (config 1 %), never fights (config); breaking the tie is a *Defend the faith* matter for others of that faith |
| Held in fief | A sovereign kingdom holds its crown from someone else | Pays a token only (1 %), never called to war; counts ½ toward the subject limit |
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
| Common enemy: you both have the same rival | +1 | Stretched thin (over the subject limit) | −1, and −1 more per subject beyond the limit to the furthest |
| Long held: under you 30+ years | +1 | Far away: no land path through your realm or theirs and no sea route of yours | −1 |
| Light tribute | +1 | Outgrown: more provinces than you, or than its type allows (Vassal: half of yours) | −1 |
| Given a crown (raised while Wavering), 10 years | +1 | Master of others | −3 |
| Loosened, 10 years | +2 | Hostile stance toward you / Rival stance | −2 / −1 |
| | | Type's drift (Tributary, March, Protectorate) | −1 |
| | | Force used on another subject, 5 years | −1 |
| | | Another subject deposed, 5 years | −1 |
| | | Doctrine of lapse used on another subject, 10 years | −1 |
| | | Refused a call again, 12 months | −1 |
| | | Missed march stipend, 12 months | −1 |
| | | You left another subject alone, 5 years | −1 |
| | | Two quarrelling subjects forbidden, 5 years | −1 |

**Tribute levels**: none ×0, light ×0.5, normal ×1, heavy ×1.5, crushing ×2 (of the type's share).

**Subject limit by catalogue `administrative_capacity`**: very low 2, low 3, moderate 5, high 7, very high 9.

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
- **Subject limit counter**: weights of all direct subjects, including 6.1 multipliers.
- **Fold-in planner**: checks requirements and names the first missing one (locked button).

## 5. Requirements

### 5.1 The ladder of rule

- SUBJ-001 The subjects context shall place every piece of land on one rung of the ladder of rule: royal land, lord's land, subject realm, or independent. [subjects 1]
- SUBJ-002 The subjects context shall treat a country as a subject only when it has its own country on the map with its own treasury, army, lords and diplomacy; a lord is a card inside a realm. [subjects 1]
- SUBJ-003 When the game starts, the subjects context shall turn any catalogue subject that is not its own map nation into a lord of its overlord, filling the lord card from the catalogue's history. [subjects 1]

### 5.2 Types

- SUBJ-004 The subjects context shall know six types of subject, each with its icon: Vassal (shield), Tributary (chest), Union (two crowns), March (watchtower), Colony (anchor), Protectorate (key). [subjects 2]
- SUBJ-005 The subjects context shall make each type pay its overlord the share of the Types table (Vassal 10 % of its taxes, Tributary 15 % of its income, Union 5 %, March nothing, Colony 25 % with its trade goods flowing home first, Protectorate 10 %), multiplied by the tribute level. [subjects 2.1, 4; config `kinds.*.pays_share`, `tribute_levels`]
- SUBJ-006 The subjects context shall pay the share from the subject's treasury each month, so a poor subject pays little. [subjects 2.1]
- SUBJ-007 Where tribute is taken in grain, the subjects context shall deliver it to the overlord's nearest castle, where it counts toward Food. [subjects 2.1, 4]
- SUBJ-008 The subjects context shall bring each type into its overlord's wars as the Types table says: Vassal when called by loyalty, Tributary never, Union always if Loyal or Wavering, March only in wars on its own frontier (raiding the enemy there), Colony defending itself only, Protectorate when called. [subjects 2.1]
- SUBJ-009 The subjects context shall limit each type's own diplomacy as the Types table says: Vassal no wars or alliances against the overlord or its allies; Tributary full; Union none (the overlord's envoys speak for it); March no alliances; Colony and Protectorate none. [subjects 2.1]
- SUBJ-010 If a March, Colony or Protectorate would gain a subject of its own, then the subjects context shall refuse it. [subjects 2.1]
- SUBJ-011 The subjects context shall bind the overlord to what it owes each type: defence (Vassal, Union, Colony, Protectorate), defence against anyone but itself (Tributary), one ruler for both (Union), a yearly stipend (March), ships on the sea route (Colony). [subjects 2.1]
- SUBJ-012 The subjects context shall give each Tributary, March and Protectorate a permanent drift reason of −1. [subjects 2.1, 3.1]
- SUBJ-013 Where the era is before VI, the subjects context shall allow a Protectorate only to an overseas trade empire from era IV. [subjects 2, 16 decided]

### 5.3 Mapping the data

- SUBJ-014 When the 1444 relations are loaded, the subjects context shall map `subject_kind` vassal → Vassal, fief → Vassal with *Held of the Church* (overlord a religious head) or *Held in fief*, appanage → Vassal with *Kin*, tributary → Tributary, personal_union → Union, frontier_commandery → March, colony → Colony, and estate → a lord of its crown, never a separate country. [subjects 2.2; config `mapping_1444.relations_subject_kind`]
- SUBJ-015 When an event creates a subject, the subjects context shall map event `vassalize` types vassal, tributary and colony to the same names, protectorate and puppet to Protectorate, dominion to Colony at Self-governing, and the `personal_union` relation to Union. [subjects 2.2; config `mapping_1444.event_vassalize_type`]
- SUBJ-016 The subjects context shall start 1444 with 135 subjects from the 167 Subject records (32 estates becoming lords): 83 vassals, 31 tributaries, 9 unions, 7 marches and 5 colonies, fewer if the map mapping turns small vassals into lords. [subjects 2.2]

### 5.4 Ties

- SUBJ-017 While a subject's ruler is of the overlord's ruling house (*Kin*), the subjects context shall give it +1 loyalty reason, and if the overlord's line dies out, give its ruler a claim to the overlord's throne. [subjects 2.3]
- SUBJ-018 While a subject is *Held of the Church*, the subjects context shall have it pay only a token and never fight for its overlord. [subjects 2.3; config `ties.held_of_the_church`; D-SUBJ-13]
- SUBJ-019 While a subject is *Held in fief*, the subjects context shall have it pay only a token, never call it to war, and count it ½ toward the subject limit. [subjects 2.3]
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
- SUBJ-034 The subjects context shall give *Outgrown* when the subject has more provinces than its overlord, or more than its type allows (a Vassal: more than half of the overlord's). [subjects 3.1]
- SUBJ-035 When an event adds or removes a reason by id, or adds a named one-off reason with its own arrow, the subjects context shall apply it for the stated months. [subjects 3.1, 11.1]
- SUBJ-036 When the 1444 scenario starts, the subjects context shall set loyalty from the dataset's autonomy (very low, low, moderate → Loyal; high, very high → Wavering), one step lower if the subject is Hostile toward its overlord in the data, and apply reasons from the first season. [subjects 3.2; config `start_1444_by_autonomy`]

### 5.7 Overlord actions

- SUBJ-037 When the overlord sets tribute to none, light, normal, heavy or crushing, the subjects context shall pay ×0, ×0.5, ×1, ×1.5 or ×2 of the type's share, giving light an up reason and heavy (−1) and crushing (−2) down reasons. [subjects 4, 3.1; config `tribute_levels`]
- SUBJ-038 When the overlord calls a subject to war, the subjects context shall answer as a lord would (warfare 3.2) by its loyalty and type; tributaries are never called. [subjects 4]
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
- SUBJ-051 When a lord is raised, the subjects context shall take him off the lord capacity and put him on the subject limit; his land leaves the realm, the overlord gets a share instead of half his taxes, and he may make his own friends abroad. [subjects 4.1, 6]

### 5.9 Obligations both ways

- SUBJ-052 When anyone but the overlord attacks a subject the overlord owes defence, the subjects context shall call the overlord as if it were the subject's ally; refusing gives the overlord an Oath broken, the subject *You left it alone*, and every other subject −1 for 5 years. [subjects 5, 3.1]
- SUBJ-053 Each year a March's stipend is missed, the subjects context shall give that March −1. [subjects 5; config `reasons.missed_stipend`]
- SUBJ-054 While a Union shares the overlord's ruler, the subjects context shall make every war of that ruler the Union's war and add the Union's lords' peace voices to the overlord's. [subjects 5]
- SUBJ-055 If two subjects of one overlord are at odds, then the subjects context shall forbid them to fight without the overlord's leave and let the overlord pick a side (the loser's loyalty drops one step) or forbid it (both −1 for 5 years). [subjects 5]

### 5.10 Subject limit

- SUBJ-056 The subjects context shall read the subject limit from the government context, starting from the catalogue's `administrative_capacity` (very low 2, low 3, moderate 5, high 7, very high 9), as a number separate from lord capacity. [subjects 6, 16 decided; config `reach_by_administrative_capacity`]
- SUBJ-057 The subjects context shall count each direct subject by its type's weight (Tributary and March ½, Held in fief ½, others 1). [subjects 2.1, 2.3, 6]
- SUBJ-058 While the subject limit used exceeds the subject limit, the subjects context shall give every subject *Stretched thin* −1, and −1 more to each of the N furthest subjects, N being the subject limit used beyond the limit, rounded up. [subjects 6; config `reasons.stretched_thin`; D-SUBJ-7]
- SUBJ-059 The subjects context shall count a subject that holds subjects at 3 times its type's weight plus 1 for each of its own subjects. [subjects 6.1; config `subjects_with_subjects`]
- SUBJ-060 While a subject holds subjects of its own, the subjects context shall give it *Master of others* −3. [subjects 6.1]
- SUBJ-061 The subjects context shall let only the direct overlord act on a subject; a subject's subjects count nothing toward the overlord's subject limit and pay it nothing. [subjects 6.1]
- SUBJ-062 When a subject releases its own subjects (as a peace term or as a condition of a gift or marriage), the subjects context shall remove *Master of others*. [subjects 6.1]
- SUBJ-063 When a subject is folded in or falls, the subjects context shall make its subjects step up to the overlord, keeping their loyalty. [subjects 6.1, 7]

### 5.11 Folding in

- SUBJ-064 When the overlord folds in a subject, the subjects context shall require: Loyal for the last 10 years, a subject for 20 years or more, a land path or the overlord's sea route to it, room for one more lord in lord capacity, and a type other than Tributary or Self-governing colony. [subjects 7; config `fold_in`]
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
- SUBJ-078 When the overlord wins an independence war, the subjects context shall let the peace restore the subject one type tighter, or fold it in at once if it shares a border, ignoring the year requirements. [subjects 8.2]
- SUBJ-079 When the subject wins an independence war, the subjects context shall make it independent with a Hostile stance toward the old overlord. [subjects 8.2]
- SUBJ-080 When a Disloyal subject that borders a rival of its overlord asks to change masters and it fits within the rival's subject limit, the subjects context shall make it the rival's subject of the same type, and the old overlord and the rival turn Hostile toward each other. [subjects 8.3; D-SUBJ-11]
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
- SUBJ-090 When an event uses `vassalize`, `create_country … subject_of` or `relation: personal_union`, the subjects context shall create the subject of the type it names (mapped by SUBJ-015), and a created country is a Colony at Self-governing unless the event names another type. [subjects 9, 11.1]

### 5.14 On screen

- SUBJ-091 The subjects list (a tab on the country card) shall show the subject limit used of the limit, monthly tribute in gold and grain, and one row per subject with its type icon, loyalty, up and down arrow counts, what it pays and its worst reason, sorted by loyalty, worst first. [subjects 10.1]
- SUBJ-092 The subject card shall use the lord card's frame and show type, ruler, provinces, army, treasury, its own subjects, loyalty with its reasons, what it pays and how it comes when called, and the action buttons. [subjects 10.2]
- SUBJ-093 At world zoom, the map shall show a subject in its direct overlord's colour with a 2-pixel diagonal hatch in its own colour and a dotted border with the overlord, never stacking two hatches. [subjects 10.3, 6.1]
- SUBJ-094 At region zoom, the map shall put the type's icon on the subject's capital with its frame tinted by loyalty (green, yellow, orange, red). [subjects 10.3]
- SUBJ-095 The subjects lens shall colour the player's subjects by loyalty and draw a line to each Courted subject from the courting country's capital. [subjects 10.3]
- SUBJ-096 When the player long-presses a subject on the map (touch) or selects it and presses the card button (controller), the game shall open its card. [subjects 10.3]

### 5.15 Events

- SUBJ-097 The subjects context shall read and write the event-tree keys `vassalize`, `release`, `relation {subject | overlord | personal_union}`, `subject_count` (by subject limit weights only if the event says so), `create_country … subject_of` and the `doctrine_of_lapse` flag, and the new keys `subject_loyalty`, `add_subject_reason` / `remove_subject_reason` and `change_subject_kind`. [subjects 11.1]

How the player uses it (X-19): there is no new screen. An event that makes, loosens, tightens or releases a subject, or adds or lifts a reason, says so in words on its event card before the player chooses ("Navarre becomes a subject of you", "Sweden: loyalty reason “You lost a war” for 36 months"); a subject made or freed and a kind changed arrive in the dispatches. The change then shows where every subject change shows: the *Subjects* list and the subject's card on the Diplomacy tabs (kind, reason badges) and the *Subjects* lens at a glance. Phone: the event card's effect lines wrap in the Wide and Tall layouts like its other lines; nothing needs hover. The game's own bonds are the truth: `subject_loyalty` reads the bond's loyalty, `subject_count by_reach` its reach weights.

### 5.16 AI

- SUBJ-098 Where an AI is an overlord, the subjects context shall have it fold in Loyal subjects when lord capacity allows and its personality likes centralising, loosen a Disloyal subject when at war elsewhere, station residents on its biggest Wavering subjects, and never let its subject limit overflow by more than 1. [subjects 11.2]
- SUBJ-099 Where an AI is a subject, the subjects context shall have a Disloyal one look for a backer; an opportunist rises the moment its overlord is losing a war; a cautious one waits for a backer and its neighbours. [subjects 11.2]
- SUBJ-100 Where an AI is a rival, the subjects context shall have it send envoys to court its rivals' Wavering subjects and pick *Break a subject* against the overlord with the most Disloyal subjects. [subjects 11.2]
- SUBJ-101 The subjects context shall work out loyalty once a season per subject from cached reasons. [subjects 11.2]

### 5.17 Playing as a subject

- SUBJ-102 Where the player plays a subject, the subjects context shall show the player its own card from below with the same badges, and let it pay and be protected, stop paying, find a backer, wait for the overlord's bad war, or marry into the overlord's house to inherit its crown (a union can run either way). [subjects 13]
- SUBJ-103 When a Loyal subject sends an envoy to ask politely for a looser type, the subjects context shall grant it if the overlord's AI is cautious or over its subject limit. [subjects 13]
- SUBJ-104 When a subject wins its independence war, the subjects context shall let it make its old overlord its own subject in the same peace if voices allow. [subjects 13]
- SUBJ-105 The subjects context shall let every playable subject in the catalogue (218) be played from the start. [subjects 13, 16 decided]

### 5.18 Configuration

- SUBJ-106 The subjects context shall read every number from `config/subject-rules.json` (placeholders), and changing balance shall never touch the rules or the 1444 data. [subjects 15]
- SUBJ-107 When the overlord folds in or deposes a subject by force, or restores a subject after winning its independence war, the subjects context shall give every other subject *Force used* −1 for 5 years. [subjects 14 example; config `reasons.force_used_on_other_subject`; D-SUBJ-9]
- SUBJ-108 When a lord is raised, the subjects context shall let the overlord pick Vassal, or March if the lord's land borders a foreign realm. [subjects 4.1; D-SUBJ-14]
- SUBJ-109 When a subject's ruler dies without an heir, the subjects context shall apply SUBJ-071 and SUBJ-072 and ignore foreign marriage claims (diplomacy 6.2). [subjects 7.1; D-SUBJ-22]
- SUBJ-110 The subjects context shall stop the seasonal count at Disloyal; a subject goes In revolt only by SUBJ-076. [subjects 3.1, 8.2; D-SUBJ-24]

### 5.19 Subjects in the game today

The first game slice of subjects (milestone 5, D-SUBJ-26) runs the types, loyalty, tribute and four overlord actions on every subject tie in the diplomacy graph. Folding in, tightening, residents, hostages, risings and independence wars come in later slices.

- SUBJ-111 Each month every subject shall send its overlord its type's share times the tribute level times what its loyalty pays (Loyal all, Wavering half, Disloyal nothing): a Vassal out of its taxes, every other type out of its tax and trade, shown as the *Tribute* line of both treasuries' ledgers. [SUBJ-005, SUBJ-026, SUBJ-037; D-SUBJ-26]
- SUBJ-112 Each subject tie shall carry its bond (type, loyalty, tribute level, timed reasons) in the save; a 1444 subject starts from its data's autonomy and stance (SUBJ-036), and a subject the game makes (a demand given in to, an agreement) starts Loyal and held from that month. [SUBJ-036, SUBJ-065]
- SUBJ-113 At the end of March, June, September and December each subject's reasons shall be counted and move its loyalty by SUBJ-030 and SUBJ-031, from what the game knows: soldiers, provinces, people (the realms' court languages), faith (the realms' state faiths; *Different faith* is worse where the overlord persecutes the subject's faith), stance, a common enemy, its own subjects, tribute level, gifts, type's drift and *Stretched thin* against the overlord's reach from its catalogue administrative capacity (SUBJ-056; moderate, 5, when unknown); the player hears when its subjects' or its own loyalty moves. [SUBJ-030 … SUBJ-034, SUBJ-056, SUBJ-058; D-SUBJ-26, D-SUBJ-28]
- SUBJ-114 A Vassal or Protectorate called to its overlord's war shall answer by its loyalty, and a Disloyal one refuses; a Union joins unless Disloyal and a Tributary is never called (D-DIPL-10). [SUBJ-008, SUBJ-028, SUBJ-038]
- SUBJ-115 The overlord shall be able to set the tribute level, send a gift (six months of the subject's income, +1 for 5 years), loosen a Vassal or Protectorate to a Tributary (+2 for 10 years) and release a subject (free and Friendly); each unavailable action names why. AI overlords loosen a Disloyal subject while at war. [SUBJ-037, SUBJ-039, SUBJ-045, SUBJ-046, SUBJ-048, SUBJ-098]
- SUBJ-116 A realm shall be able to send an envoy to *Offer overlordship* to a smaller realm, or to *Ask for protection* of a larger one, when neither has an overlord or alliance with the other; a yes makes the smaller realm a Tributary, or a Vassal when it asked. Once a year an AI court weighs offering overlordship to the neighbour that thinks best of it, within its reach plus 1. [SUBJ-086, SUBJ-098; DIPL-197]

- SUBJ-118 The overlord shall be able to station one of its envoys as a resident at a subject's court (+1 loyalty) and recall him; the resident takes an envoy seat, and a resident recalled for want of seats loses the reason. [SUBJ-040; D-SUBJ-27]
- SUBJ-119 The overlord shall be able to tighten a Loyal Tributary: one envoy at its court for 6 months, after which it is a Vassal; a Wavering tributary refuses and drops a step. [SUBJ-044]
- SUBJ-120 The overlord shall be able to fold in a subject by SUBJ-064, judging the path as a shared land border and lord room as its lords holding land against its government's lords cap: one envoy at its court for a month per province, stopping if the subject is no longer Loyal. When it completes, the subject's provinces join the overlord's realm held by one new lord of the subject's house (its own lords' land merged into his), its subjects step up to the overlord, and the country leaves the map. AI overlords that like centralising (a third of realms) fold in one Loyal subject at a time. [SUBJ-063, SUBJ-064, SUBJ-066, SUBJ-067, SUBJ-098; D-SUBJ-27]
- SUBJ-121 A Disloyal subject shall be able to rise: the tie ends, both turn Hostile and it declares its independence war on its old overlord (the overlord's allies called as for any war). An AI subject rises at a season's end when its overlord is at war elsewhere with over half its voices for peace, or when a stronger rival or hostile realm of its overlord at peace borders it; Disloyal subjects of the same overlord that border it rise with it. [SUBJ-074 … SUBJ-077, SUBJ-099; D-SUBJ-27]
- SUBJ-122 When the independence war's peace has the subject give up land, the overlord shall take it back one type tighter, Wavering, and every other subject of that overlord gets *Force used*; any other peace leaves it free and Hostile. [SUBJ-078, SUBJ-079, SUBJ-107]
- SUBJ-123 The overlord shall be able to take a hostage from a Loyal or Wavering subject (*Hostage at court*, +1 loyalty) and send the heir home; the heir goes home by himself after 20 years, standing in for his father's death. [SUBJ-021, SUBJ-042; D-SUBJ-29]
- SUBJ-124 When an AI subject rises with a backer, the backer shall join the independence war on the subject's side against the overlord, if it is still at peace. [SUBJ-074, SUBJ-077; D-SUBJ-29]
- SUBJ-125 The map shall have a *Subjects* lens: the player's realm in its own colour, each of its subjects by loyalty (Loyal green, Wavering amber, Disloyal red), its own overlord in purple and every other realm grey, with a key that names the colours and the subject limit used; tapping a realm opens its Diplomacy tab. [SUBJ-095; D-SUBJ-29]

#### How the player uses it: subjects
- SUBJ-117 Where: the player's own realm card, Diplomacy tab, *Subjects*: the subject limit used of the limit and the month's tribute, then one 44-point row per subject (worst loyalty first) with type, loyalty, up and down arrows, what it pays and its worst reason; tapping the realm opens the subject's own Diplomacy tab, where *Your vassal* (or tributary, …) shows its loyalty, every reason as a named badge, what it pays and how it comes to war, five tribute buttons and *Send a gift*, *Loosen to tributary* and *Release*, each with what it does or why not. Under them *Their heir*: *Take a hostage*, or *Send the heir home* with the month he goes home by himself. Then *Your envoys at their court*: *Station a resident* (or *Recall*), *Tighten to vassal* for a tributary and *Fold into your realm* for the rest, with the months left while an envoy works there. A realm that is someone's subject sees *Your overlord* with its own badges, and *Rise for independence* once it is Disloyal. *Offer overlordship* and *Ask for protection* sit with the other envoy missions. Grouping and overview: everything about subjects sits on the Diplomacy tabs; the *Subjects* map lens shows every subject's loyalty at a glance; the realm card's Stability plaque shows the subjects pillar at a glance and opens the Diplomacy tab; the Treasury tab's *Tribute* line totals what they pay. Phone: rows, badges and tribute buttons wrap in the Tall layout, every button at least 44 points, nothing that needs hover. [X-19, SUBJ-091, SUBJ-092]

### 5.20 Personal unions in the game (milestone 5)
Crowns now pass by marriage and unions can be merged (D-SUBJ-30). Rulers don't age in the game yet, so a yearly roll stands in for a ruler dying without an heir.

- SUBJ-126 Each January every realm but the player's shall roll for its ruler dying without a direct heir (1 in 50). When he does, each marriage of his house gives the other house a 1 in 10 chance of a claim: a `dynastic_claim` and a pretender at that house's court, who claims the throne for 20 years. [DIPL-107, DIPL-108; D-SUBJ-30; config `crowns.heirless_per_year`, `crowns.claim_years`]
- SUBJ-127 One such death in 4 leaves no heir at all. Then the realm passes as a Union to the ruler of the house married most often into it, held Loyal from that month, when the inheriting realm answers to no overlord, neither is at war, and the realm has no overlord of its own; the pretenders to that throne at the inheritor's court go home. Unmarried, it picks a new ruler and nothing changes. [DIPL-110, SUBJ-087; D-SUBJ-30; config `crowns.no_heir_share`]
- SUBJ-128 When the ruler of a Loyal Vassal or Union dies with no heir at all, its overlord shall inherit it at once: a Vassal is folded in (SUBJ-120 without its waits or envoy) and a Union's crowns are merged (SUBJ-129). [SUBJ-071; D-SUBJ-22]
- SUBJ-129 The overlord shall be able to merge the crowns of a Union 50 years in union and Loyal: its provinces join the realm, its lords become the overlord's lords keeping their loyalty, its royal land becomes the overlord's royal land, its own subjects step up to the overlord, and the country leaves the map. A Union cannot be folded in; merging is how its land joins. AI overlords that like centralising merge a Union as soon as it is ready. [SUBJ-070, SUBJ-063, SUBJ-098; D-SUBJ-30]

#### How the player uses it: personal unions
- SUBJ-130 Where: on another realm's card, Diplomacy tab, *What they think of you* says when your houses are married and that their crown may pass to you if their line dies out, and names your claim on their throne with the year it lapses. *Arrange a marriage* says the same in its line. On your own Diplomacy tab, *Your house* lists the houses married to yours (each a realm button) and your claims with the year each lapses, so the player sees every path to a crown in one place; a realm button opens that realm. A Union's card under *Your union* shows *Merge the crowns* in place of *Fold into your realm*: one 44-point button with what it does, or why not yet (the years in union so far of 50, or that they must be Loyal). An inherited crown, a claim gained or lapsed, and a merge arrive in the News with a crown icon, and the Union then appears in the *Subjects* list with its two-crowns type. Grouping and overview: marriages, claims and unions sit on the Diplomacy tabs with the rest of statecraft and subjects; *Your house* is the at-a-glance overview of marriages and claims, the *Subjects* list and lens of unions. Phone: the sections are rows of realm buttons and text that wrap in the Wide and Tall layouts, every button at least 44 points high, nothing that needs hover. [X-19, SUBJ-117, DIPL-202]

### 5.21 Playing as a subject in the game (milestone 5)
The 218 playable subjects get their side of the tie (D-SUBJ-31): the card seen from below, withholding tribute, backers, asking to loosen, turning the tables in the independence peace, and inheriting the overlord's crown.

- SUBJ-131 Where the player is someone's subject, the game shall show its own card from below with the same named badges its overlord sees, and its choices: pay and be protected, stop paying, find a backer, wait for the overlord's bad war, marry into the overlord's house, ask to loosen (Loyal) and rise (Disloyal), each with what it does or why not now. [SUBJ-102, SUBJ-103, SUBJ-121; D-SUBJ-31]
- SUBJ-132 While a subject withholds its tribute, it shall pay its overlord nothing, count *Withholds tribute* (−2), and at each season's end step one toward Disloyal (never twice the same way within 12 months, as the count); paying again ends the reason. [SUBJ-102, SUBJ-031; D-SUBJ-31; config `reasons.withholds_tribute`]
- SUBJ-133 The realms that would back the player are judged as for an AI subject (D-SUBJ-27): a rival or hostile realm of the overlord at peace, bordering the subject and at least as strong as the overlord; when the player rises, the first of them joins its independence war. [SUBJ-074, SUBJ-124; D-SUBJ-31]
- SUBJ-134 When a Loyal subject asks to loosen, its AI overlord shall grant it when cautious (its catalogue unrest risk or exposure to outside threats is high or very high) or over its reach: a Vassal or Protectorate becomes a Tributary with *Loosened* (+2 for 10 years); refused, nothing changes. [SUBJ-103, SUBJ-046; D-SUBJ-31]
- SUBJ-135 When a subject that has outgrown its overlord (more provinces) ends its independence war as a war leader with over three quarters of the overlord's peace voices wanting peace, it shall be able to make peace with *Make them your subject*: the old overlord becomes its Vassal if they share a land border, else its Tributary, held Loyal from that month. [SUBJ-104, SUBJ-083, SUBJ-112; D-SUBJ-31]
- SUBJ-136 When an overlord's line dies out and the house married most often into it is its own subject's, the subject shall inherit the crown: the tie ends and the old overlord becomes the heir's Union (a union runs either way). [SUBJ-102, SUBJ-127; D-SUBJ-31]
- SUBJ-137 The subject card shall use the lord card's frame and show the kind, the ruler as the 1444 catalogue names him (title, name, age where his birth year is known, house), provinces, army, treasury and its own subjects, above the loyalty, payments and buttons; the subjects list header reads reach used of reach and the month's tribute in gold (and grain when any). [SUBJ-091, SUBJ-092; D-SUBJ-31]
- SUBJ-138 When the player long-presses a realm on the map for the Settings long-press time, the game shall open that realm's card at its Diplomacy tab, where a subject's card sits; a controller's card button does the same once controllers are supported. [SUBJ-096, SET-080; D-SUBJ-31]
- SUBJ-139 An AI realm courting its rivals' subjects shall turn first to the rival overlord with the most Disloyal subjects, and a Wavering subject there; that overlord is the one it backs a rising against with *Break a subject*. [SUBJ-100, DIPL-219; D-SUBJ-31]

#### How the player uses it: playing as a subject
- SUBJ-140 Where: a subject player opens its own realm card, Diplomacy tab, *Your overlord* (or taps its overlord's realm button there, whose Diplomacy tab shows the same card): the overlord's realm button, the kind and loyalty, what it pays a month and every reason as a named badge, the same badges the overlord sees. Under them *Your choices*, one 44-point row each: *Pay tribute* or *Stop paying* (with what happens: Disloyal step by step, a season at a time), *Ask to loosen* (Loyal only, with whether they would agree and why), *Find a backer* (the realms that would back you as realm buttons, or why none would), *Their wars* (their wars and how many of their voices want peace, the moment to rise), *Marry into their house* (married or not, and a button to their card where *Arrange a marriage* sits) and *Rise for independence* once Disloyal, naming the backer who would join. During the independence war the peace buttons add *Make them your subject* when you have outgrown them, with why not until enough of their voices want peace. Grouping and overview: everything about your tie sits in that one card; the realm card's Stability plaque and the *Subjects* lens (your overlord in purple) show it at a glance, and season changes and the overlord's answers arrive in the dispatches. On the map a long-press on any realm opens its card at the Diplomacy tab; at world zoom a subject wears its overlord's colour with a fine hatch of its own, so the player sees which realms answer to whom without opening anything. Phone: the rows and badges wrap in the Wide and Tall layouts inside the safe areas, every button at least 44 points, the long-press needs no hover and a short tap still picks the province. [X-19, SUBJ-117, SUBJ-131 … SUBJ-139]

## 6. Commands

| Command | Who | Preconditions | Result | Events emitted |
|---|---|---|---|---|
| SetTribute(subject, level) | player / AI overlord | direct subject | new level | SubjectTributeSet |
| SetTributeForm(subject, gold / grain) | player / AI overlord | direct subject | form | SubjectTributeSet |
| CallSubjectToWar(subject, war) | player / AI / system | at war | answer by loyalty and type | SubjectCalled |
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
| RaiseLord(lord, type) | overlord | ≥ 3 provinces, Loyal/Wavering | new subject country | LordRaised |
| FrontierGrant(chief, gift) | overlord | border, not anyone's subject | March | SubjectCreated |
| CharterColony(provinces) | overlord | colonial provinces in one distant region | Colony | SubjectCreated |
| JudgeQuarrel(subject A, subject B, side / forbid) | overlord | two subjects at odds | loser −1 step / both −1 | SubjectQuarrelJudged |
| SeekBacker(country) | Disloyal subject | Disloyal | backer agreed | BackerFound |
| ChangeMasters(rival) | Disloyal subject | borders a rival of overlord | new overlord if accepted | SubjectChangedMasters |
| AskToLoosen | subject | Loyal; envoy | looser type if granted | SubjectKindChanged |
| PayStipend(march) | overlord | March | stipend paid | StipendPaid |
| AdvanceSubjectSeason | system | season end | loyalty steps | SubjectLoyaltyChanged |

## 7. Domain events

| Event | When | Payload | Consumed by |
|---|---|---|---|
| SubjectCreated | any way of 9 | subject, overlord, type, ties | diplomacy (relation), map-presentation, events |
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

- When **diplomacy** reports SubjectByAgreementAgreed, then subjects creates the subject with an allowed type.
- When **diplomacy** reports CrownInherited, then subjects creates a Union (SUBJ-087).
- When **warfare** reports a peace with *Become a subject*, *Tribute*, *Seat a pretender* or a won independence
  war, then SUBJ-078, SUBJ-079, SUBJ-083 … SUBJ-085, SUBJ-104 apply.
- When **warfare** reports a war lost by the overlord, then *You lost a war* applies for 10 years.
- When **realm** reports a new ruler on the overlord's throne, then *New ruler* applies for 5 years; when a
  subject's ruler dies without an heir, SUBJ-071 … SUBJ-073 apply.
- When **diplomacy** reports a foreign envoy resident or courting at a subject's court, then *Courted* applies.
- When **government** changes the subject limit or lord capacity, then the subject limit and fold-in checks are re-run.
- When **religion** or **culture** change a ruler's faith or culture or accepted cultures, then the faith and
  people reasons are re-read.
- When **events** use the subject keys, then SUBJ-035, SUBJ-090, SUBJ-097 apply.
- When **province** / **exploration** add colonial provinces, then colony stages are re-checked.

## 9. Monthly steps

A turn is one week (X-18). The steps below run in the turn in which a new month begins; season-end steps in the
turn in which a new season begins, yearly steps in the turn in which 1 January falls.

Reads first: relations (diplomacy), soldiers (realm/recruiting), treasury (realm), era (time-and-turns), subject limit
and lord capacity (government).
1. Each month: pay tribute from each subject's treasury by type, level, loyalty and form (SUBJ-005 … SUBJ-007).
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
| diplomacy | upstream | Customer–Supplier | Subject relation records, types, `make_subject`, `release_subject`, `independence_war`, envoys, marriages, protection asks, courting, crowns inherited |
| diplomacy (decided) | partnership | Customer–Supplier | Diplomacy maps relation types onto the six types through `mapping_1444` and reads `fights` / `own_diplomacy` from here (X-8); its counts decide asks by agreement and this context picks the type (D-SUBJ-4); Break a subject targets the overlord (D-SUBJ-6) |
| realm | upstream | Partnership | Lords and loyalty steps (same four steps), lord card frame, ruler, heirs, soldiers, treasury, Oaths broken, Food from grain tribute, raised lords and folded-in rulers as lords |
| government | upstream | Customer–Supplier | Subject limit (base + form), lord capacity; government sets no limits on types (D-SUBJ-19) |
| warfare | upstream | Partnership | Calls to war by loyalty, *Break a subject* and *Independence* aims, peace terms *Become a subject* / *Tribute* / *Seat a pretender*, peace voices of unions, overlord losing |
| province | downstream | Customer–Supplier | Royal land from folded colonies, charters from merged crowns, subject ruler as governance, lent officials |
| rebellions | downstream | Customer–Supplier | *Foreign rule* grievance, lord rising with land as counterpart |
| religion | upstream | Conformist | Same faith, persecution, *Held of the Church* |
| culture | upstream | Conformist | Same people, accepted cultures |
| national-strengths | upstream | Open Host Service | Changes to the subject limit, drift or types (Ming tributary weights, Ottoman fold-in of tributaries) |
| revolutions | downstream | Customer–Supplier | Settler independence trigger; `change_subject_kind` and `release` by revolution |
| naval | upstream | Conformist | Sea route for *Far away*, colonies and fold-in path; colony defence by sea |
| trade | downstream | Customer–Supplier | Colony trade goods flow home; overseas trade empire definition; tributary toll proposal |
| exploration | upstream | Customer–Supplier | Colonial provinces chartered into a Colony |
| events | upstream | Published Language | `vassalize`, `release`, `relation`, `subject_count`, `create_country … subject_of`, `doctrine_of_lapse`, new keys |
| scenario-setup | upstream | Published Language | 1444 subject records, autonomy, start dates, which catalogue subjects are map nations, `administrative_capacity`, playable subjects |
| map-presentation | downstream | Published Language | Hatch, dotted border, type icon and loyalty tint, subjects lens |
| game-shell | downstream | Published Language | Subjects list tab, subject card, long-press / controller |
| time-and-turns | upstream | Conformist | Week turn (X-18), month, season, year, era; X-2 order: subjects before government and diplomacy (D-SUBJ-20) |

## 12. AI

- As overlord: folds in Loyal subjects when lord capacity allows and its personality likes centralising;
  loosens a Disloyal subject when at war elsewhere; stations residents on its biggest Wavering subjects; never
  lets its subject limit overflow by more than 1 (SUBJ-098).
- As subject: a Disloyal AI seeks a backer; an opportunist rises the moment the overlord is losing; a cautious
  one waits for a backer and its neighbours (SUBJ-099).
- As a rival: courts rivals' Wavering subjects; picks *Break a subject* against the overlord with the most
  Disloyal subjects (SUBJ-100).
- Answers a Loyal subject's polite ask to loosen when cautious or over its subject limit (SUBJ-103).
- Loyalty once a season from cached reasons (SUBJ-101).

## 13. Decisions and open questions

- **D-SUBJ-1** (was OQ-SUBJ-1) Types in wars and diplomacy: the six types are the only types. A Vassal or Protectorate comes when called, by loyalty. A March fights only on its own frontier. A Union always comes if Loyal or Wavering. A Tributary never comes and a Colony only defends itself. Union, Colony and Protectorate have no own diplomacy. The eight relation types are mapped onto the six in `mapping_1444`. X-8 decides it.
- **D-SUBJ-2** (was OQ-SUBJ-2) Shares: this design's shares win (pays_share by type and tie), with no manpower share; the old restlessness keys become loyalty reasons. X-8 decides it.
- **D-SUBJ-3** (was OQ-SUBJ-3) Estates: estates are lords of the realm, not subjects; the mapping turns `estate` into a lord when the game loads, and the relations dataset itself is left as it is. X-8 decides it.
- **D-SUBJ-4** (was OQ-SUBJ-4) Making a subject by agreement: diplomacy's counts decide (*Offer overlordship* base −80, *Ask for protection* base −10). On a yes this context makes a Tributary, or a Vassal when the small country asked. One count for every ask.
- **D-SUBJ-5** (was OQ-SUBJ-5) Envoy work: Tighten, Fold in and Station a resident take an envoy's time; *Courted* comes from a foreign envoy stationed at the subject's court. A subject's ask to loosen and the 20-year tributary offer are decided by this design's own rules, without a count. They reuse envoys and need no new action.
- **D-SUBJ-6** (was OQ-SUBJ-6) *Break a subject*: the war is declared on the overlord, who is the defender; the subject answers by its type and loyalty, and the winner chooses to free or take it. It agrees with D-DIPL-8.
- **D-SUBJ-7** (was OQ-SUBJ-7) Stretched thin: every subject takes −1, and the N furthest subjects take −1 more each, where N is the subject limit used beyond the limit, rounded up. It matches the example ("hits the four furthest away").
- **D-SUBJ-8** (was OQ-SUBJ-8) France example: the Dauphiné has 3 provinces (one envoy for 3 months); Brittany is ▲3 ▼3 in step 4 and the list and card follow it. The example's own step wins.
- **D-SUBJ-9** (was OQ-SUBJ-9) Armagnac and force used: Armagnac rises by an event (an event may start a rising). *Force used* (−1 for 5 years) goes to every other subject when the overlord folds in or deposes a subject by force, or restores one after winning its independence war. It is the config reason, used where force is used.
- **D-SUBJ-10** (was OQ-SUBJ-10) Gift and reasons: a gift costs 6 months of the subject's income (provisional). *Common enemy* is a shared Rival stance only. *Far away* means no land border and no sea route, where a sea route is both holding coastal provinces on a linked sea. These are the simplest readings.
- **D-SUBJ-11** (was OQ-SUBJ-11) Changing masters: the rival accepts when the subject fits within its subject limit (the player chooses for the player's realm). The old overlord and the new master both turn Hostile toward each other. No new count is needed.
- **D-SUBJ-12** (was OQ-SUBJ-12) Release: the released country becomes independent and Friendly; no reasons change for anyone, and the *Courted* clause is dropped. It was undefined and adds nothing.
- **D-SUBJ-13** (was OQ-SUBJ-13) Held of the Church: the "Defend the faith matter" clause is dropped; Defend the faith comes only from persecution (diplomacy 7.1). One source for the aim.
- **D-SUBJ-14** (was OQ-SUBJ-14) Raised lords: a Loyal raised lord gets no extra reason, and a Wavering one gets *Given a crown* +1 for 10 years. The overlord picks the type: Vassal, or March when the lord's land borders a foreign realm. It is the design's text.
- **D-SUBJ-15** (was OQ-SUBJ-15) Tighten and loosen: only Tributary → Vassal can be tightened. A Vassal or Protectorate loosens only to Tributary, and Colony, March and Union cannot change by tightening. It matches config `tighten.order`.
- **D-SUBJ-16** (was OQ-SUBJ-16) Event keys: `subject_loyalty`, `add_subject_reason`, `remove_subject_reason` and `change_subject_kind` are adopted here, and `vassalize` maps dominion → Self-governing colony and puppet → Protectorate. The events context adds the words to its vocabulary.
- **D-SUBJ-17** (was OQ-SUBJ-17) *Become a subject*: the winner picks the type, and *Subjects* in country stats means all six types. It follows from X-8.
- **D-SUBJ-18** (was OQ-SUBJ-18) Overseas trade empire: colonies or trade posts in 2 or more regions other than the capital's (provisional, `protectorate.overseas_trade_empire_min_regions`). It is the design's own proposal.
- **D-SUBJ-19** (was OQ-SUBJ-19) Government limits on types: not adopted; any form may hold any type its era allows. That is the simpler rule.
- **D-SUBJ-20** (was OQ-SUBJ-20) Month order: X-2 decides it. Subjects runs before government and diplomacy; seasons end in March, June, September and December.
- **D-SUBJ-21** (was OQ-SUBJ-21) Kalmar: Sweden is a Union of Denmark, Wavering in 1444; events carry it to Disloyal. The data agrees.
- **D-SUBJ-22** (was OQ-SUBJ-22) Heirless subject rulers: the overlord's rule wins for its own subjects (a Loyal Vassal or Union is inherited by the overlord); foreign marriage claims don't apply to a subject. A subject's crown is its overlord's matter.
- **D-SUBJ-23** (was OQ-SUBJ-23) Colonies: "mostly settlers" means more than 50 % settler people; settlers in a Settled colony become a peace voice. Outposts stay Loyal and have no count; the seasonal count starts at Settled. These are the simplest readings.
- **D-SUBJ-24** (was OQ-SUBJ-24) In revolt: the seasonal count stops at Disloyal; a subject goes In revolt only by the conditions of 8.2 (a backer, the overlord losing, or an event). It keeps risings deliberate.
- **D-SUBJ-25** (was OQ-SUBJ-25) Reason names: "Official lent" (+1), "Hostage harmed" (−2) and "Force used" (−1). Kin and Hostage at court are separate ties and stack (+2). Each reason is named once.
- **D-SUBJ-26** First game slice of subjects (milestone 5, provisional): every realm has a subject limit of 5 (moderate) until the catalogue's administrative capacity is read; faith and *Far away* give no reasons yet (no faith data, no distance rule); grain tribute, residents, hostages, tightening, folding in, risings and the subjects lens wait for their slices. A subject's loyalty is counted only at season ends, so the turn stays cheap.
- **D-SUBJ-27** Second game slice of subjects (milestone 5, provisional): residents, tightening and folding in use an envoy that stays at the subject's court with the status of a resident, so it takes a seat like any envoy; folding in needs a shared land border (no sea routes yet); a folded-in subject's army disbands and its treasury is lost, since lords hold no retinue or wealth in the game yet; *Foreign rule* waits for culture and faith. Backers are judged, not bargained for: a rival or hostile realm of the overlord at peace, bordering the subject and at least as strong as the overlord, counts as willing, but does not join the war yet (D-SUBJ-29 brings it in).
- **D-SUBJ-28** Reach and belief for subjects (provisional): each realm's subject limit comes from its catalogue administrative capacity by SUBJ-056 (very low 2 … very high 9), moderate (5) where the catalogue has no assessment, with no government-form change yet. *Same people* compares the two realms' court languages and *Same faith* or *Different faith* their state faiths from the 1444 seed, falling back to the name books where a realm has no court language; *Far away* still waits for a distance rule.
- **D-SUBJ-29** Hostages, backers and the lens (provisional): rulers don't age or die in the game yet, so a held heir goes home after 20 years (or when sent home), with no harm rule; the backer an AI subject is judged to have (D-SUBJ-27) joins its independence war at once, with no bargaining; the player as a subject rises alone. The *Subjects* lens draws no courting lines, since no realm courts another's subjects yet.
- **D-SUBJ-30** Personal unions in the game (provisional): rulers don't age or die yet, so each January a realm's ruler dies without a direct heir at 1 in 50, and one such death in 4 leaves no heir at all; the player's own ruler is spared until rulers and heirs are simulated, so the player inherits but is never inherited. A claim's pretender lives 20 years. The strongest claim is the house with most marriages into the dead ruler's (the first married on a tie), and the inheritance waits for peace on both sides. The Wavering and Disloyal lords' succession war and the charter for the merged laws wait for lords' risings and laws; merging is at once, with no envoy.
- **D-SUBJ-31** Playing as a subject in the game (provisional): withholding tribute steps loyalty down at season ends through the count's own 12-month rule, and shows as *Withholds tribute* (−2); the player's backers are judged like an AI subject's and the first joins its rising (replacing "the player as a subject rises alone" in D-SUBJ-29); an AI overlord is cautious when its catalogue unrest risk or outside-threat exposure is high or very high, as AI personalities aren't in the game yet; turning the tables uses the *Become a subject* term's three quarters of peace voices (SUBJ-083) and holds the old overlord Loyal like any subject the game makes (SUBJ-112); rulers' names and houses come from the catalogue's 1444 leadership, with an age only where a birth year is known; a controller's card button waits for controller support, and the long-press is the touch way in.

## 14. Traceability

<!-- TRACE -->
| Requirement | Feature file | Scenario |
|---|---|---|
| SUBJ-001 | ladder-and-kinds.feature | Every piece of land sits on one rung |
| SUBJ-002 | ladder-and-kinds.feature | Subject or lord |
| SUBJ-003 | ladder-and-kinds.feature | A catalogue subject that is not a map nation starts as a lord |
| SUBJ-004 | ladder-and-kinds.feature | Six types and their icons |
| SUBJ-005 | ladder-and-kinds.feature | What each type pays at normal tribute |
| SUBJ-005 | ladder-and-kinds.feature | A colony's trade goods flow home first |
| SUBJ-006 | ladder-and-kinds.feature | What each type pays at normal tribute |
| SUBJ-007 | ladder-and-kinds.feature | Tribute in grain |
| SUBJ-008 | ladder-and-kinds.feature | Who fights for the overlord |
| SUBJ-009 | ladder-and-kinds.feature | Own diplomacy by type |
| SUBJ-010 | ladder-and-kinds.feature | Who may hold subjects of its own |
| SUBJ-011 | ladder-and-kinds.feature | What the overlord owes |
| SUBJ-012 | ladder-and-kinds.feature | A type's drift |
| SUBJ-013 | ladder-and-kinds.feature | When protectorates are allowed |
| SUBJ-014 | data-mapping.feature | Relations types |
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
| SUBJ-056 | subject-reach.feature | Subject limit from administrative capacity |
| SUBJ-056 | subject-reach.feature | The subject limit and lord capacity are separate numbers |
| SUBJ-057 | subject-reach.feature | The Ming's tributaries and marches |
| SUBJ-058 | france-1444-1453.feature | The start |
| SUBJ-058 | subject-reach.feature | Over the subject limit |
| SUBJ-059 | subject-reach.feature | Naples takes 4 of the Pope's subject limit |
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
| SUBJ-111 … SUBJ-116 | — | Engine: packages/engine/test/subjects.test.ts (1444 bonds, payments by type and loyalty, season count, gift, loosen and release, agreements, save) |
| SUBJ-118 … SUBJ-122 | — | Engine: packages/engine/test/subjects.test.ts (tighten, fold in, rise and the independence peace, AI risings) |
| SUBJ-123, SUBJ-124 | — | Engine: packages/engine/test/subjects.test.ts (hostage, backer joins) |
| SUBJ-125 | — | Presentation: apps/client/src/main.ts, Subjects lens |
| SUBJ-126 … SUBJ-129 | — | Engine: packages/engine/test/crowns.test.ts (claims, crowns inherited, heirless subjects, merging the crowns) |
| SUBJ-130 | — | Presentation: apps/client/src/ui/statecraft.ts, Your house and the union card |
| SUBJ-113 (reach, faith) | — | Engine: packages/engine/test/subjects.test.ts (reach from administrative capacity, faith and language reasons) |
| SUBJ-117 | — | Presentation: apps/client/src/ui/statecraft.ts, Subjects and the subject card |
| SUBJ-131 … SUBJ-136, SUBJ-139 | — | Engine: packages/engine/test/subjects.test.ts (withholding, backers, asking to loosen, turning the tables, inheriting the overlord, AI rival) |
| SUBJ-137, SUBJ-138, SUBJ-140 | — | Presentation: apps/client/src/ui/statecraft.ts (card from below, subject card), apps/client/src/map/mapView.ts (long-press) |
