# Culture

Culture in Pocket Hegemony is about **tongue**: the people a person belongs to, the speech they share and the land they see as their own. Every person has a tongue, every country has one court tongue, and everyone in your realm is kin, cousin, stranger or a trading people to that court. Each year tongues slowly drift, and you steer that drift with your Tongue policy, your schools and your officials.

## How it works

### Tongues and families

Every person has a tongue, and every tongue belongs to exactly one family. There are only these two levels, family and tongue, with no sub-tongues. The game has about 600 tongues in 43 families. The families are the event tree's 39 culture groups plus four added ones: celtic, baltic, caucasian and hebrew.

| Tongue | Family |
|---|---|
| French | latin |
| Occitan | latin |
| Breton | celtic |
| Mandinka | mande |
| Swahili | bantu |
| Lithuanian | baltic |
| Georgian, Armenian | caucasian |
| Jewish | hebrew |
| Criollo | creole_atlantic |

The world's catalogue has 1,468 culture strings. They are mapped onto tongues once, folding only near-duplicates (so "Jews" and "Jewish communities" both become Jewish, "Swabians" become High German and "Westphalians" Low German). The original string stays as the tongue's local name in tooltips, and any string that can't be mapped goes on a review list. Tongues are kept apart where history turns on the split: French and Occitan, Castilian and Catalan, Great Russian and Ruthenian, High German and Low German. Regional peoples stay separate until a nation-building event merges them.

Each tongue has an id, a name, a family, a homeland (the provinces it sees as its own), a way of life (settled, herding, forest, seafaring or trading) and a diaspora flag. Some also have a tongue they merge into or split into. For example, Castilian is a settled latin tongue that splits to Criollo, Dyula is a trading diaspora, and Tuscan merges into Italian.

There is no culture meter, no "cultural power" and no list of accepted cultures. What matters is simply who your people are and how they relate to your court.

### The court tongue

Every country has one court tongue: the tongue of the ruler's house and court. At the start it is the first culture in the country's catalogue record, so France starts with French.

When a dynasty of another tongue takes the throne, by conquest, inheritance, marriage or a lord's revolt, the court tongue becomes that dynasty's tongue. If a French dynasty took England, French would become England's court tongue and French people would be kin to England. The game then works out again who is kin and which lords share the court tongue, and the music palette changes from the next track.

### Kin, cousins, strangers and trading peoples

Everyone in your realm has one relation to your court:

| Relation | Who | Counts toward Tongue % | Dot |
|---|---|---|---|
| Kin | People of your court tongue | 1 | green |
| Cousin | Another tongue of the same family | 0.5 | yellow |
| Stranger | A tongue of another family | 0 | red |
| Trading people | A diaspora tongue | 0 | grey |

For France, French people are kin, Occitans are cousins, and Bretons and Flemings are strangers.

**Tongue %** on your country card is the share of the realm's people who are kin, plus half of the cousins. It is worked out whenever you open the card and is never stored.

*Worked example.* France holds 6.9 million French, 1.6 million Occitan, 0.5 million Breton, 0.4 million Flemish, 0.1 million Basque and 0.02 million Jewish people. That is 6.9 kin plus half of 1.6 cousins, so 7.7 out of 9.52 million, and the Tongue % is 81.

A trading people is never a stranger when grievances are worked out: a Jewish community in Paris gives no *Foreign rule*. They don't count toward Tongue % either. Before nationalism rises, *Foreign rule* only comes from strangers' homelands, never cousins'. While nationalism in a province is under 0.3, French-ruled Brittany has *Foreign rule* but Toulouse, the Occitan homeland, does not.

### Drift

Once a year, after births and deaths, people in every province drift a little toward one tongue: the province's **pull tongue**.

**Which tongue pulls.** The court tongue pulls if the province has been held 20 years or more and is governed by any of your officials (whatever his own tongue) or by a lord of the court tongue. Otherwise the province's majority tongue pulls.

| Rennes (mostly Breton) held | Governed by | Pull tongue |
|---|---|---|
| 20 years | a royal official | French |
| 25 years | a French lord | French |
| 25 years | a Breton lord | Breton |
| 19 years | a royal official | Breton |

So in a province held only 5 years, like Kent with its English majority, a Norman minority melts into English.

**How fast.** People already of the pull tongue don't move. Everyone else moves toward it at a base rate of 0.5 % a year, times every multiplier that applies:

| Condition | Multiplier |
|---|---|
| Town classes (craftsmen, market folk, clerks, scholars) | × 2 |
| Cousins of the pull tongue | × 2 |
| A school teaching in the pull tongue | × 1.5 |
| A Schoolmaster official serving in the province | × 2 |
| Tongue policy Let be / Teach / Impose | × 0.5 / × 1 / × 2 |
| The province is the drifting tongue's homeland | × 0.5 |
| A herding, forest or seafaring tongue in its own kind of land (see below) | × 0.5 |
| A trading people | × 0.25 |
| The province's nationalism is 0.3 or more | × 0.25 |
| Each of printing, mass schooling, newspapers and railways | × 1.25 |
| An *Own tongue* charter (drift toward the court tongue) | stops it |

A school of another tongue counts for that tongue instead. A school teaching a learned tongue, Latin or Classical Arabic, speeds no one's drift, because nobody grows up speaking it.

**Own kind of land.** Herding peoples are at home on grassland and drylands (the steppe), forest peoples in forest and jungle, and seafaring peoples in any province on the sea. There they drift at half speed.

So if France has printing and railways, Flemish farmers drift at 0.5 % × 1.25 × 1.25, which is 1.5625 times the base.

*Worked example: Troyes.* France has the court tongue French and the policy Teach. Troyes is 94 % French and 6 % Flemish, has been French for 200 years, is run by a royal official, and has a school teaching in French. At the end of the year French pulls. The Flemish drift at 0.5 % × 1.5 for the school × 1 for Teach = 0.75 %, about 32 people. No French people move. If a Schoolmaster also served there, the rate would double to 1.5 %.

**Small and new tongues.** A province holds at most three tongues. A tongue that falls below 1 % is removed (if Troyes ends a year with 0.9 % Flemish, Flemish is gone). When a fourth tongue arrives, it gets in only if it is larger than the smallest of the three; whichever group is smallest then joins the majority. If Riga is Latvian 60 %, German 30 % and Russian 10 % and Swedes as many as 15 % of Riga arrive, Swedish replaces Russian and the Russians join the Latvians. If only 5 % arrive, the Swedes join the Latvians instead. Faiths work the same way.

### People on the move

When people move, they carry their tongue into the new province's mix. That covers settlers, refugees, the homeless, soldiers coming home and event migrations.

- Settlers can carry the court tongue into any of your own provinces with free tiles, not only colonies. Castilian settlers can go to Toledo.
- Refugees count in the mix once they have stayed 2 years, like Andalusi refugees in Fez.
- Homeless people drifting next door bring their tongue, like Galicians into Leon.
- Soldiers coming home rejoin their home tongue.

### Tongue policy

Each country has one realm-wide **Tongue policy**: Let be, Teach or Impose. Teach is the default, and you can override it for any single province. For example, France can keep Teach but set Bayonne to Let be, so drift toward French there is halved.

- **Let be** halves drift toward the court.
- **Teach** keeps drift at its base and makes schools teaching in the court tongue cost 10 % more upkeep.
- **Impose** doubles drift. It gives the grievance *Banned tongue* in every province where most people are strangers, and in cousin-majority provinces once nationalism there is 0.3 or more. When you switch to it, lords of the affected tongues waver one step, stranger lords first. That happens once: keeping Impose costs no more loyalty.

Impose needs the *Printing* invention, unless your country has the **chancery tradition**. In 1444 that is Ming, Joseon, Castile and the Ottomans, who can Impose from the start. Your form of government doesn't matter: a confederation can Impose and an absolute monarchy can Let be.

*Worked example.* Castile has the chancery tradition. Granada is mostly Andalusi Arabic (strangers) and Barcelona mostly Catalan (cousins) with nationalism 0.1. When Castile sets Impose, Granada gets *Banned tongue* and Barcelona does not, and the Andalusi lord Zegri wavers a step, just this once. If nationalism in Barcelona later reaches 0.3, Barcelona gets *Banned tongue* too.

*Banned tongue* ends in a province when the policy there becomes Let be or Teach, when an *Own tongue* charter is granted, or when the majority becomes kin.

### The Own tongue charter and other levers

The **Own tongue** charter means the local tongue is used in courts and schools. Where it stands:

- *Foreign rule* and *Banned tongue* end in that province.
- Officials there must be of the local tongue.
- Drift toward the court tongue stops (Basque people in Bayonne stay Basque).

The ruler can grant it, or the province's lords, its towns or a homeland rising can demand it. Revoking it gives *Broken charter*, as for any charter.

Two other levers help. A lord of the local tongue holding a homeland province ends *Foreign rule* there, because his tongue is the people's. And when the ruler marries into a local house, that house's lords count as kin for loyalty.

### Officials and lords

Officials have a tongue too: the tongue of the province where they were hired (an official hired in Breton Rennes is Breton), or of the school they graduated from. You can hire officials of any tongue in your realm.

| Official serving among | Years to full effect |
|---|---|
| Kin | 5 |
| Cousins | 7 |
| Strangers | 10 |
| His own tongue | 5 |

An official of the local tongue in a stranger province keeps *Banned tongue* away there, even under Impose; *Foreign rule* stays. A Breton official in Rennes spares it the *Banned tongue*.

A province's tongue doesn't change how many officials and lords your government can support. A stranger province costs you only through the longer time your officials need there.

Lords: a kin lord (or a lord of a house your ruler married into) has "shares your tongue" among his reasons to grow loyal, a stranger lord starts one step lower, and a cousin lord has neither.

### Order and war

- A homeland rising draws 8 % of everyone of that tongue. While nationalism in the homeland is under 0.5 it demands self-rule; at 0.5 or more it demands a new country.
- Defenders of the homeland tongue, rebels included, get +10 % in rough ground: locals know the land.
- A garrison captain of another tongue than his ruler can be bribed. A Breton captain serving a French king can be bribed; an Occitan one can't until nationalism rises.
- The war aim **Free a people** opens on a stranger homeland, or on a cousin homeland once nationalism there is 0.3 or more. Rennes (Breton, stranger) is open at nationalism 0; Toulouse (Occitan, cousin) opens only at 0.3.
- From the age of revolutions, the war aim **Gather our kin** (a diplomacy war aim) is offered on a province whose majority is your court tongue but held by another country, and taking it gives no *Foreign rule*. In 1820, Piedmont with the court tongue Italian can take Italian Venetia from Austria this way. In 1700 the war aim isn't offered yet.
- From the age of revolutions, the **National levy**: kin provinces with nationalism 0.5 or more refill recruits 25 % faster, and stranger provinces 25 % slower.

### Trade, research and diplomacy

- Where a trading people is at least 2 % of a province with a market, trade value there rises 10 % and you may have one extra trader from that tongue. If they are persecuted or expelled, the bonus ends and they go as refugees to a neighbour, who gains it.
- A neighbour of the same family counts double toward the 60 % research cap for inventions known by neighbours and trade partners.
- Foreign scholars settle first in realms of their own family.
- Rulers of the same family start one step warmer, and of the same court tongue two. After nationalism, a country holding many people of your court tongue is a natural rival.

### Tongues through history

**Spread.** When an event spreads a family into some provinces, the leading tongue of that family rises there, or a tongue set per region in config. If Valencia has Catalan 60 % and Castilian 10 % and an event spreads the latin family there, Catalan rises. The Oromo migrations spread the cushitic family into the Ethiopian highlands, so Oromo rises in each province there.

Every 5 years the game runs three checks of its own.

**The court goes native.** If your court tongue has been under 20 % of your people for 50 years and one other tongue is over half, the event *The court goes native* is raised. For example, Qing with the Manchu court and a Han majority. You choose:

- *Take their tongue*: the majority tongue becomes the court tongue, lords of the old tongue waver a step, and the old tongue's people become cousins or strangers (Manchu people become strangers to Qing).
- *Keep ours*: nothing changes and the check runs again in 25 years (raised in 1700, it comes back in 1725).

France, with French at 72 % of its people, never sees it.

**New tongues abroad.** When settlers of one tongue have been the majority for 100 years in a map region on another continent than their court, their tongue there splits into a new creole tongue, which counts as a cousin to the old court and gets no *Foreign rule* at once. Settlers on the court's own continent, or for fewer than 100 years, keep their tongue.

| Settlers | Region | Court | New tongue |
|---|---|---|---|
| Castilian | Mesoamerica | Castile | Criollo |
| Portuguese | Brazil | Portugal | Brazilian |
| English | North America | England | Anglo-American |
| Dutch | Southern Africa | Holland | Afrikaans |

**Nationalism.** Culture reads each province's nationalism support from the event tree and never sets it.

- At 0.3 or more, cousins there count as strangers: *Foreign rule* in their homeland, all drift there × 0.25, and *Free a people* opens. With Piedmont's Tuscan court, Neapolitans in Naples at 0.3 become strangers.
- At 0.5 or more, homeland risings demand a new country, and a released country takes the catalogue record for that people. If none fits, a new country is made, named after the tongue, with that tongue at court and the same form of government as the country it broke from. A winning Breton rising in Rennes releases a country with the catalogue's Breton record.

**Merging tongues.** A nation-building event can merge named tongues into their national tongue. A nation state, meaning a country whose court tongue is a national tongue such as Italian or German, that has kept Impose for 50 years merges the regional tongues that belong to its national tongue, without an event. Italy with an Italian court merges Tuscan and Lombard after 50 years; after 45 it hasn't yet, and Savoy with its French court never does.

**For event writers.** Culture provides the event effects `tongue_spread`, `set_court_tongue`, `merge_tongues` and `move_people` (people of the tongue leave as refugees and settle elsewhere), and the triggers `court_tongue`, `tongue_share`, `kin_of`, `cousin_of` and `stranger_to`.

### The computer players

AI countries pick their Tongue policy by personality, using the same rules as you:

| Personality | Tongue policy | Levers |
|---|---|---|
| Hegemon seeker, expansionist | Teach, then Impose once they have printing | Settlers into conquered border provinces; *Gather our kin* after 1789 |
| Isolationist, mercantile | Let be | *Own tongue* charters; welcome trading peoples |
| Opportunist | Teach | *Free a people* against neighbours with stranger homelands in revolt |
| Zealot | Teach | Expel trading peoples of another faith |

### When it happens

Culture doesn't run monthly. Drift runs once a year in every province after births and deaths. The three history checks run every 5 years. Tongue % and the Peoples screen are worked out when you open them. Policy changes, charters and event effects happen at once.

## What you see

- **Province card, Tongue line**: up to three tongues with shares, each with a coloured dot (green kin, yellow cousin, red stranger, grey trading people), for example "Tongue French 94 % · Flemish 6 %". Tap it to see this year's drift, which way it pulls and why.
- **Country card, Tongue line**: your Tongue %. Tap it to open the Peoples screen.
- **The Peoples screen**: one row per tongue in your realm, largest first, with its people, relation, provinces, and notes such as homeland, grievances, lords, charter and drift. The Tongue policy selector sits on top. A big realm (the Ottomans hold 40 tongues in 9 families) groups the rows by family, folded shut. Tap a row to light its provinces on the map; long-press to see its lords, its officials and any rising.

For France the screen reads:

| Tongue | People | Relation | Where | Notes |
|---|---|---|---|---|
| French | 6.9 m | kin | 38 prov | |
| Occitan | 1.6 m | cousin | 9 prov | homeland, 2 grievances, drifting to French |
| Breton | 0.5 m | stranger | 3 prov | homeland, Foreign rule, 1 lord |
| Flemish | 0.4 m | stranger | 4 prov | homeland, Foreign rule |
| Basque | 0.1 m | stranger | 1 prov | homeland, Own-tongue charter |
| Jewish | 0.02 m | trading | 6 towns | +10 % trade in Paris, Lyon |

- **The Tongue lens**: provinces coloured by family at far zoom and by tongue at regional zoom, with a toggle to kin, cousin and stranger colours for your realm. Homelands of peoples without a country are outlined.

## How it connects

- [Provinces](Provinces): stores the tongue mix, homeland, years held, officials, the *Own tongue* charter and the grievances; moves settlers, refugees and soldiers.
- [Your-Realm](Your-Realm): Tongue % on the country card, lords' loyalty steps, and dynasty changes.
- [Government](Government): no form limits your Tongue policy, and a province's tongue doesn't weigh on the caps; a released country keeps the form of the country it left.
- [Religion](Religion): the same shapes (mix, buildings, charter) and the persecution or expulsion of trading peoples.
- [Buildings](Buildings): schools carry a teaching tongue; Teach raises their upkeep 10 %.
- [Research](Research): printing for Impose, four inventions speeding drift, family neighbours and scholars.
- [Historical-Events](Historical-Events): families, spread, nationalism support, the new effects and triggers, migrations.
- [Rebellions](Rebellions): homeland risings and demands for *Own tongue* charters.
- [Warfare](Warfare): garrison bribes and locals know the land.
- [Diplomacy](Diplomacy): family warmth, natural rivals, marriages, and the war aims *Free a people* and *Gather our kin*.
- [Recruiting](Recruiting): the National levy refill.
- [Trade](Trade): trading peoples' trade value and extra trader.
- [Subjects](Subjects): a subject of your court tongue folds in faster; a stranger subject's independence war draws its people.
- [National-Strengths](National-Strengths): tongue-based strengths such as the chancery tradition.
- [Revolutions](Revolutions): creole tongues and nationalism as signs; regimes set the court tongue.
- [Naval](Naval): seafaring tongues drift slowly on the coast; sailors keep their tongue.
- [Music-and-Sound](Music-and-Sound): the music palette follows the court tongue's family.
- [Map-and-Lenses](Map-and-Lenses): the Tongue lens, dots and outlines.
- [The-1444-Start](The-1444-Start): court tongues and each province's starting tongues.
- [Time-and-Turns](Time-and-Turns): the yearly drift slot and the 5-yearly checks.

## Numbers

All numbers are **provisional** and still being balanced, except the four added families, the chancery-tradition list and the learned tongues, which are decided.

| Key | Value |
|---|---|
| `families_added` | celtic, baltic, caucasian, hebrew (decided) |
| `relation.*.tongue_share_weight` | kin 1.0, cousin 0.5, stranger 0.0, trading 0.0 |
| `relation.*.foreign_rule` | cousin false, stranger true, trading false |
| `relation.cousin.drift_multiplier` | 2.0 |
| `drift.base_rate_per_year` | 0.005 |
| `drift.court_pull_needs_years_held` | 20 |
| `drift.court_pull_needs` | own official, lord of the court tongue |
| `drift.drop_below_share` | 0.01 |
| `drift.multipliers.*` | town 2.0, school 1.5, schoolmaster 2.0, homeland 0.5, way of life 0.5, diaspora 0.25, nationalism 0.25, own-tongue charter 0.0, each invention 1.25 |
| `policy.let_be/teach/impose.drift` | 0.5 / 1.0 / 2.0 |
| `policy.teach.school_upkeep` | 1.10 |
| `policy.impose` | *Banned tongue*, stranger lords waver 1, needs printing or chancery tradition |
| `start_flag_chancery_tradition` | ming, joseon, castile, ottoman (decided) |
| `officials.years_to_full_effect` | kin 5, cousin 7, stranger 10, local tongue 5 |
| `effects.trading_people` | min share 0.02, needs a market, trade value 0.10, 1 extra trader |
| `effects.family_neighbour_research_weight` | 2.0 |
| `effects.national_levy` | nationalism 0.5, kin 1.25, stranger 0.75, from the age of revolutions |
| `nationalism.cousins_become_strangers_at` | 0.3 |
| `nationalism.homeland_demands_country_at` | 0.5 |
| `engine_events.court_goes_native` | court share below 0.20 for 50 years, other tongue above 0.5, recheck 25 years |
| `engine_events.new_tongue_abroad` | 100 years of settler majority, on another continent |
| `engine_events.merge_without_event` | Impose for 50 years, nation states only |
| `engine_events.check_every_years` | 5 |
| `risings.homeland_draw` | 0.08 |
| `refugees.settle_after_years` | 2 |
| `drift.way_of_life_lands` | herding: grassland, drylands; forest: forest, jungle; seafaring: on the sea |
| `schools.learned_tongues` | Latin, Classical Arabic (decided) |
| `family_default_by_region` | sample: cushitic in the Ethiopian highlands to Oromo; latin in Iberia and the Americas to Castilian |
| `tongues[]` | a sample of 28 so far; the full list is about 600 |


## Still open

Nothing about culture is waiting on a design decision. The numbers above are still being balanced.

## For developers

- Spec: `domain/culture/spec.md` in the game repository; its section 13 lists every decision with its reason.
- Features: `domain/culture/features/`: `tongues-and-relations.feature` (families, court tongue, Tongue % for France), `drift.feature` (Troyes, pull tongue, multipliers, lands, the fourth tongue), `tongue-policy.feature`, `culture-effects.feature`, `culture-history.feature`, `peoples-screen.feature` and `culture-ai.feature`.
- Code: `packages/engine/src/domain/culture/`, with its numbers in `packages/rules/data/domain/culture.json`.
