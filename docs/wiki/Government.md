# Government

Government decides how your country is ruled and how many people can run it. Your **government form** (one of 27, from a feudal realm to a party state) sets how many officials and lords you can support, how far your colonies can reach, how many subjects you can watch over and how the next ruler is chosen. You change form by reform, or it is changed for you by a revolution, a coup, a lost capital or an event.

## How it works

### The two caps

Every country has two caps:

- **Officials cap** = the form's officials + the officials your buildings give (+ any national strength).
- **Lords cap** = the form's lords + the lords your buildings give (+ any national strength).

Both show as "x of y". Every lord counts exactly 1 toward the lords cap, however many provinces he holds. While you are within both caps nothing happens.

**Over the officials cap**, the province of each official over the cap gets the grievance *Grasping officials*, newest hires first. It goes away when you are back within the cap.

**Over the lords cap**, at each New Year one lord loses a loyalty step for each lord over the cap, lowest loyalty first, then the lord with the most provinces.

**Great lords.** A lord's size affects only his loyalty: a lord with 4 to 7 provinces has one permanent down reason *Great lord*, and one with 8 or more has two.

### Buildings that raise the caps

| Building | Officials | Lords | Needs |
|---|---|---|---|
| Palace, step 1 / 2 / 3 | 6 / 10 / 16 | 2 / 4 / 6 | |
| Seat, step 1 / 2 (one per town) | 2 / 4 each | | step 2 needs G11 |
| Chancery | 4 | | G3 Tax registers |
| Court of law | | 2 | G1 Written law codes |
| Diet hall | | 3 | feudal realm, diet monarchy, elective monarchy or confederation only |
| Hostage residence | | 3 | household realm, tribute empire, horde, warlord domain or shogunate only |
| Examination hall | 4 | | G4 Examination system |
| Parliament house | 6 | | G14 Written constitution |

The buildings themselves (cost, slot, jobs) belong to [Buildings](Buildings).

**France in 1444** is a feudal realm with a palace at step 2, 3 seats at step 1 and a court of law. Its officials cap is 22 (form 6, palace 10, three seats 6) and its lords cap 14 (form 8, palace 4, court of law 2). With 18 officials and 11 lords, the government card reads "Officials 18 of 22" and "Lords 11 of 14", within both caps. **The Ottomans**, a household realm with a palace at step 2, a chancery, 4 seats at step 1 and a hostage residence, have an officials cap of 32 and a lords cap of 11.

### The 27 forms

Each form sets the officials and lords it supports, a change to subject reach, its colonial range in sea zones, its succession, and the forms it can reform into next.

| Form | Family | Officials | Lords | Subject reach | Colonial range | Succession | Next forms |
|---|---|---|---|---|---|---|---|
| Feudal realm | house | 6 | 8 | 0 | 20 | eldest heir | diet, absolute, elective |
| Diet monarchy | house | 8 | 10 | 0 | 20 | eldest heir | absolute, constitutional monarchy |
| Household realm | house | 10 | 4 | +1 | 10 | strongest son | absolute, bureaucratic |
| Bureaucratic empire | house | 20 | 2 | +1 | 10 | named heir | constitutional monarchy |
| Elective monarchy | house | 4 | 12 | −1 | 10 | lords elect | feudal, diet |
| Absolute monarchy | house | 16 | 4 | +1 | 20 | eldest heir | constitutional monarchy |
| Constitutional monarchy | house | 24 | 4 | +1 | 30 | eldest heir | constitutional republic |
| City commune | citizens | 8 | 4 | −1 | 10 | council picks | merchant republic, feudal, constitutional republic |
| Merchant republic | citizens | 10 | 4 | +1 | 30 | council picks | city commune, feudal, constitutional republic |
| Peasant commune | citizens | 4 | 1 | −2 | 0 | assembly picks | city commune, constitutional republic |
| Constitutional republic | citizens | 24 | 0 | 0 | 30 | elections | constitutional monarchy |
| Prince-bishopric | faith | 6 | 3 | −1 | 5 | chapter elects | feudal |
| Military order | faith | 8 | 4 | 0 | 15 | brothers elect | feudal |
| Holy rule | faith | 6 | 4 | 0 | 5 | clergy choose | household |
| Clan council | kin | 0 | 0 | −2 | 0 | elders choose | chiefdom, confederation (self-run) |
| Chiefdom | kin | 2 | 3 | −1 | 0 | chosen from the chief's lineage | paramount chiefdom (self-run) |
| Paramount chiefdom | kin | 4 | 6 | 0 | 5 | chosen from the chief's lineage | tribute empire, feudal, household |
| Tribute empire | kin | 6 | 12 | +3 | 5 | royal kin choose | household, bureaucratic |
| Horde | kin | 2 | 10 | +2 | 0 | eldest of the house | household, confederation |
| Confederation | kin | 2 | 10 | −1 | 0 | members take turns | feudal, constitutional republic |
| Warlord domain | warriors | 4 | 6 | 0 | 5 | heir or adopted son | shogunate, feudal |
| Shogunate | warriors | 8 | 14 | +3 | 10 | heir or adopted son | warlord domain, constitutional monarchy |
| Soldier emirs | warriors | 10 | 6 | +1 | 10 | emirs choose | household |
| Military junta | warriors | 20 | 2 | 0 | 15 | generals choose | constitutional republic |
| Party state | modern | 30 | 0 | +2 | 20 | the party chooses | constitutional republic |
| Company rule | modern | 8 | 4 | +2 | 40 | owners appoint | colonial government |
| Colonial government | modern | 6 | 4 | none | 15 | overlord appoints | |

- **Subject reach** starts from the catalogue's administrative capacity (very low 2, low 3, moderate 5, high 7, very high 9) and the form adds or takes away. A colonial government has none and can't hold subjects. See [Subjects](Subjects).
- **Colonial range** is how many sea zones from your nearest port or colony you may found a colony. See [Exploration-and-Colonies](Exploration-and-Colonies).
- **Self-run forms**: under a clan council or chiefdom, provinces of your own people need no official, so *Ungoverned* never appears there; provinces of another people still need one.
- A colonial governor holding a governor slot doesn't count toward the officials cap; once his colony is founded he counts as its official.

### Reforms

A reform changes your form to one of its next forms. It needs every listed item, costs gold from the treasury, and makes some lords lose a loyalty step. If a need isn't met or the treasury is short, the reform is refused. Once it passes, both caps, subject reach, colonial range and succession follow the new form. This is the full list:

| From | To | Needs | Gold | Lords slip |
|---|---|---|---|---|
| Clan council | Chiefdom | 5 or more provinces | 0 | 0 |
| Clan council | Confederation | allied with 2 neighbours of the same people | 0 | 0 |
| Chiefdom | Paramount chiefdom | 8 or more provinces | 50 | 1 |
| Paramount chiefdom | Tribute empire | 3 or more subjects | 100 | 1 |
| Paramount chiefdom | Feudal realm | G2 Feudal grants | 100 | 1 |
| Paramount chiefdom | Household realm | G1 Written law codes | 100 | 2 |
| Tribute empire | Household realm | G3 Tax registers or G6 Quipu | 150 | 2 |
| Tribute empire | Bureaucratic empire | G4 Examination system | 200 | 3 |
| Horde | Household realm | a palace in a town | 150 | 2 |
| Horde | Confederation | no adult heir | 0 | 0 |
| Feudal realm | Diet monarchy | a diet hall | 100 | 0 |
| Feudal realm | Elective monarchy | the ruling line dies out | 0 | 0 |
| Feudal realm or Diet monarchy | Absolute monarchy | G9 Professional bureaucracy and W12 Standing regiments | 300 | 3 |
| Diet monarchy, Absolute monarchy or Bureaucratic empire | Constitutional monarchy | G14 Written constitution and a parliament house | 200 | 1 |
| Elective monarchy | Feudal realm | the same house elected 3 times running | 100 | 2 |
| Elective monarchy | Diet monarchy | a diet hall | 100 | 1 |
| Household realm | Absolute monarchy | G9 and W12 | 250 | 2 |
| Household realm | Bureaucratic empire | G9 and an examination hall | 250 | 2 |
| City commune | Merchant republic | 4 or more traders abroad | 100 | 1 |
| City commune or Merchant republic | Feudal realm | one family led the city 3 times running | 150 | 2 |
| Merchant republic | City commune | trade in debt 3 years running | 0 | 1 |
| Peasant commune | City commune | a city in the realm | 50 | 0 |
| City commune, Merchant republic or Peasant commune | Constitutional republic | G14 and a parliament house | 150 | 0 |
| Prince-bishopric or Military order | Feudal realm | the ruler takes a reformed faith | 100 | 2 |
| Holy rule | Household realm | one family chose the ruler 3 times running | 150 | 1 |
| Warlord domain | Shogunate | holds the imperial capital and 8 or more lords | 150 | 1 |
| Warlord domain | Feudal realm | G1 Written law codes | 100 | 2 |
| Shogunate | Warlord domain | the shogun loses the capital | 0 | 0 |
| Shogunate | Constitutional monarchy | G14 and a parliament house | 250 | 4 |
| Soldier emirs | Household realm | one emir's family held the throne 3 reigns | 150 | 2 |
| Confederation | Feudal realm | one member holds over half the land | 150 | 3 |
| Constitutional monarchy | Constitutional republic | the ruler deposed or abdicates | 0 | 0 |

### Changes without a reform

- A **revolution** or a won *New ideas* rising sets a form directly, even one that normally belongs to a later era. A country that reforms still needs the listed items, whatever revolutions have done elsewhere.
- A successful **army coup** makes the country a military junta.
- A **shogunate** whose shogun loses the capital breaks into warlord domains.
- An **event** that sets one of the event tree's 16 `government` values sets the matching form, unless the current form already fits that value, in which case nothing changes. A `republic` event on a country without G14 gives a city commune instead of a constitutional republic. An event changing `admin_capacity` applies to the officials cap.

| Event value | Form set (examples) |
|---|---|
| monarchy | a feudal realm; kept as is by fitting house forms such as household realm or paramount chiefdom |
| elective_monarchy | elective monarchy |
| theocracy | holy rule; kept by a prince-bishopric |
| republic | city commune (constitutional republic with G14); kept by a peasant commune |
| merchant_republic | merchant republic |
| tribal | chiefdom; kept by a clan council |
| confederation | confederation |
| nomadic_empire | horde |
| company | company rule |
| colonial_administration | colonial government |
| constitutional_monarchy | constitutional monarchy |
| liberal_democracy | constitutional republic |
| one_party_state, communist, fascist | party state |
| military_junta | military junta |

### The start in 1444

Each catalogue record gets its start form by the first rule that applies: a hand-set override (75 of them), then text rules on the catalogue's government form text in order (some only for certain entity types, some skipping them), then for kingdoms a rule by region (in Southeast Asia tier A and B kingdoms become tribute empires and tier C paramount chiefdoms; a kingdom in a region with no rule becomes a feudal realm), then the entity type table, then the default chiefdom. Nobody starts as an absolute monarchy, constitutional monarchy, constitutional republic, military junta, party state or company rule. Each country starts with the catalogue's historical houses as lords (none if it has only one province), and its caps come from its start form and its start buildings.

### The computer players

No AI rules are designed for government yet. The AI uses the same Reform command as the player.

### Each month

Each month the caps are recomputed after buildings and hiring, and *Grasping officials* is applied or lifted. At New Year, lords over the cap slip. Reforms resolve when ordered.

## What you see

- **The government card**: the form and the ruler; each cap as "x of y" with its parts (the form and each building); subjects as "x of y"; the next forms with each need shown met or not; and a Reform action.

## How it connects

- [Buildings](Buildings): which cap buildings stand and at what step.
- [Provinces](Provinces): officials hired, *Grasping officials*, self-run provinces and *Ungoverned*.
- [Your-Realm](Your-Realm): lords, their provinces and loyalty, the treasury, and succession by form.
- [Subjects](Subjects): subject reach and its change by form.
- [Exploration-and-Colonies](Exploration-and-Colonies): colonial range and colonial governors.
- [Revolutions](Revolutions): regimes set forms, era ignored.
- [Rebellions](Rebellions): a won *New ideas* rising sets a form.
- [Historical-Events](Historical-Events): the 16 event-tree values and `admin_capacity`.
- [Research](Research): G1, G2, G3, G4, G6, G9, G11, G14 and W12 as needs.
- [National-Strengths](National-Strengths): additions to caps (for example +2 officials for Venice).
- [Religion](Religion): a ruler taking a reformed faith opens the faith forms' reform.
- [Culture](Culture): who counts as "own people" for self-run forms.
- [Warfare](Warfare): army coups and the shogun's capital.
- [Trade](Trade): traders abroad and trade debt as reform needs.
- [Diplomacy](Diplomacy): alliances with neighbours as a need.
- [The-1444-Start](The-1444-Start): start forms and lords.
- [Map-and-Lenses](Map-and-Lenses): the government card.

## Numbers

All numbers are **placeholders** in `government/config/government.yaml` (and `start-forms.yaml`), except `revolution_ignores_era`, which is decided.

| Key | Value |
|---|---|
| `colonial_governors_count_against_officials_cap` | false |
| `over_cap.officials.grievance` | grasping_officials |
| `over_cap.lords.when` / `slips_per_lord_over` / `order` | New Year; 1; lowest loyalty, then most provinces |
| `great_lord` | 4 to 7 provinces: 1 reason; 8+: 2 |
| `subject_reach_start` | 2 / 3 / 5 / 7 / 9 |
| `buildings.palace` | officials 6/10/16, lords 2/4/6 |
| `buildings.seat` | 2/4 officials, one per town |
| `buildings.chancery`, `court_of_law`, `diet_hall`, `hostage_residence`, `examination_hall`, `parliament_house` | 4 officials; 2 lords; 3 lords; 3 lords; 4 officials; 6 officials |
| `forms.<id>` | the forms table |
| `reforms[]` | the reforms table |
| `revolution_ignores_era` | true (decided) |
| `event_tree_map.<value>` | set, keep_if_in, before_G14 |
| start-form rules | 75 overrides, text rules, kingdom by region, entity type, default chiefdom |

## Still open

- **OQ-GOV-1**: the design says any monarchy or republic can reform to a constitutional form; the config allows only some.
- **OQ-GOV-2**: three next-form links have no reform row.
- **OQ-GOV-3**: whether condition-based reforms (line dies out, no adult heir, capital lost) happen automatically.
- **OQ-GOV-4**: which lords slip when a reform passes.
- **OQ-GOV-5**: culture's 1.5 weight for stranger provinces has no place in the caps.
- **OQ-GOV-6**: culture's proposal that forms limit tongue policies.
- **OQ-GOV-7**: province, country stats and the gap list haven't taken in *Grasping officials*, *Great lord* and succession by form.
- **OQ-GOV-8**: some event mappings would turn an elective or constitutional monarchy into a feudal realm.
- **OQ-GOV-9**: the form before a revolution must be remembered for restorations; power bases no longer exist.
- **OQ-GOV-10**: seats per town or per province, and landmark palaces at step 4.
- **OQ-GOV-11**: whether an event's `admin_capacity` adds to or replaces the cap, and for how long.
- **OQ-GOV-12**: no AI behaviour is designed.
- **OQ-GOV-13**: who counts as "own people" for self-run forms.
- **OQ-GOV-14**: what "a reformed faith" means.
- **OQ-GOV-15**: which forms count as monarchies for the Inquisition.
- **OQ-GOV-16**: what happens to subjects when an event sets colonial government.
- **OQ-GOV-17**: what "newest hire" means for graduates and inherited officials.

## For developers

- Spec: `domain/government/spec.md` in the game repository, requirement code **GOV** (GOV-001 to GOV-049).
- Features: `domain/government/features/`: `caps.feature` (France and the Ottomans in 1444), `cap-buildings.feature`, `forms.feature`, `reforms.feature` (every reform row), `form-changes.feature` and `start-forms.feature`.
- Code: `packages/engine/src/domain/government/index.ts`, with numbers in `packages/rules/data/domain/government.json` and start records in `packages/rules/data/domain/government-start-records.json`. The start-form tool is `government/tools/assign_start_forms.py` in the designs.
