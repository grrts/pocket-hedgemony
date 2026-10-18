# Culture

Culture in Pocket Hegemony is about **language**: the people a person belongs to, the speech they share and the land they see as their own. Every person has a language, every country has one court language, and everyone in your realm is of the same language, related, foreign or a trading people to that court. Each year languages slowly drift, and you steer that drift with your Language policy, your schools and your officials.

## How it works

### Languages and families

Every person has a language, and every language belongs to exactly one family. There are only these two levels, family and language, with no sub-languages. The game has about 600 languages in 43 families. The families are the event tree's 39 culture groups plus four added ones: celtic, baltic, caucasian and hebrew.

| Language | Family |
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

The world's catalogue has 1,468 culture strings. They are mapped onto languages once, folding only near-duplicates (so "Jews" and "Jewish communities" both become Jewish, "Swabians" become High German and "Westphalians" Low German). The original string stays as the language's local name in tooltips, and any string that can't be mapped goes on a review list. Languages are kept apart where history turns on the split: French and Occitan, Castilian and Catalan, Great Russian and Ruthenian, High German and Low German. Regional peoples stay separate until a nation-building event merges them.

Each language has an id, a name, a family, a homeland (the provinces it sees as its own), a way of life (settled, herding, forest, seafaring or trading) and a diaspora flag. Some also have a language they merge into or split into. For example, Castilian is a settled latin language that splits to Criollo, Dyula is a trading diaspora, and Tuscan merges into Italian.

There is no culture meter, no "cultural power" and no list of accepted cultures. What matters is simply who your people are and how they relate to your court.

### The court language

Every country has one court language: the language of the ruler's house and court. At the start it is the first culture in the country's catalogue record, so France starts with French.

When a dynasty of another language takes the throne, by conquest, inheritance, marriage or a lord's revolt, the court language becomes that dynasty's language. If a French dynasty took England, French would become England's court language and French people would share England's court language. The game then works out again who is kin and which lords share the court language, and the music palette changes from the next track.

### Same language, related, foreign and trading peoples

Everyone in your realm has one relation to your court:

| Relation | Who | Counts toward Language % | Dot |
|---|---|---|---|
| Same language | People of your court language | 1 | green |
| Related | Another language of the same family | 0.5 | yellow |
| Foreign | A language of another family | 0 | red |
| Trading people | A diaspora language | 0 | grey |

For France, French people share the court language, Occitans are related, and Bretons and Flemings are foreign.

**Language %** on your country card is the share of the realm's people of the same language, plus half of those of a related one. It is worked out whenever you open the card and is never stored.

*Worked example.* France holds 6.9 million French, 1.6 million Occitan, 0.5 million Breton, 0.4 million Flemish, 0.1 million Basque and 0.02 million Jewish people. That is 6.9 of the same language plus half of 1.6 related, so 7.7 out of 9.52 million, and the Language % is 81.

A trading people is never foreign when grievances are worked out: a Jewish community in Paris gives no *Foreign rule*. They don't count toward Language % either. Before nationalism rises, *Foreign rule* only comes from homelands of foreign languages, never from related ones. While nationalism in a province is under 0.3, French-ruled Brittany has *Foreign rule* but Toulouse, the Occitan homeland, does not.

### Drift

Once a year, after births and deaths, people in every province drift a little toward one language: the court's, or the local majority's.

**Which language pulls.** The court language pulls if the province has been held 20 years or more and is governed by any of your officials (whatever his own language) or by a lord of the court language. Otherwise the province's majority language pulls.

| Rennes (mostly Breton) held | Governed by | Drifts toward |
|---|---|---|
| 20 years | a royal official | French |
| 25 years | a French lord | French |
| 25 years | a Breton lord | Breton |
| 19 years | a royal official | Breton |

So in a province held only 5 years, like Kent with its English majority, a Norman minority melts into English.

**How fast.** People who already speak that language don't move. Everyone else moves toward it at a base rate of 0.5 % a year, times every multiplier that applies:

| Condition | Multiplier |
|---|---|
| Town classes (craftsmen, market folk, clerks, scholars) | × 2 |
| Related to the language it drifts toward | × 2 |
| A school teaching in the language it drifts toward | × 1.5 |
| A Schoolmaster official serving in the province | × 2 |
| Language policy Let be / Teach / Impose | × 0.5 / × 1 / × 2 |
| The province is the drifting language's homeland | × 0.5 |
| A herding, forest or seafaring language in its own kind of land (see below) | × 0.5 |
| A trading people | × 0.25 |
| The province's nationalism is 0.3 or more | × 0.25 |
| Each of printing, mass schooling, newspapers and railways | × 1.25 |
| An *Own language* charter (drift toward the court language) | stops it |

A school of another language counts for that language instead. A school teaching a learned language, Latin or Classical Arabic, speeds no one's drift, because nobody grows up speaking it.

**Own kind of land.** Herding peoples are at home on grassland and drylands (the steppe), forest peoples in forest and jungle, and seafaring peoples in any province on the sea. There they drift at half speed.

So if France has printing and railways, Flemish farmers drift at 0.5 % × 1.25 × 1.25, which is 1.5625 times the base.

*Worked example: Troyes.* France has the court language French and the policy Teach. Troyes is 94 % French and 6 % Flemish, has been French for 200 years, is run by a royal official, and has a school teaching in French. At the end of the year French pulls. The Flemish drift at 0.5 % × 1.5 for the school × 1 for Teach = 0.75 %, about 32 people. No French people move. If a Schoolmaster also served there, the rate would double to 1.5 %.

**Small and new languages.** A province holds at most three languages. A language that falls below 1 % is removed (if Troyes ends a year with 0.9 % Flemish, Flemish is gone). When a fourth language arrives, it gets in only if it is larger than the smallest of the three; whichever group is smallest then joins the majority. If Riga is Latvian 60 %, German 30 % and Russian 10 % and Swedes as many as 15 % of Riga arrive, Swedish replaces Russian and the Russians join the Latvians. If only 5 % arrive, the Swedes join the Latvians instead. Faiths work the same way.

### People on the move

When people move, they carry their language into the new province's mix. That covers settlers, refugees, the homeless, soldiers coming home and event migrations.

- Settlers can carry the court language into any of your own provinces with free tiles, not only colonies. Castilian settlers can go to Toledo.
- Refugees count in the mix once they have stayed 2 years, like Andalusi refugees in Fez.
- Homeless people drifting next door bring their language, like Galicians into Leon.
- Soldiers coming home rejoin their home language.

### Language policy

Each country has one realm-wide **Language policy**: Let be, Teach or Impose. Teach is the default, and you can override it for any single province. For example, France can keep Teach but set Bayonne to Let be, so drift toward French there is halved.

- **Let be** halves drift toward the court.
- **Teach** keeps drift at its base and makes schools teaching in the court language cost 10 % more upkeep.
- **Impose** doubles drift. It gives the grievance *Banned language* in every province where most people speak a foreign language, and in provinces where most speak a related language once nationalism there is 0.3 or more. When you switch to it, lords of the affected languages waver one step, foreign-language lords first. That happens once: keeping Impose costs no more loyalty.

Impose needs the *Printing* invention, unless your country has the **chancery tradition**. In 1444 that is Ming, Joseon, Castile and the Ottomans, who can Impose from the start. Your form of government doesn't matter: a confederation can Impose and an absolute monarchy can Let be.

*Worked example.* Castile has the chancery tradition. Granada is mostly Andalusi Arabic (foreign) and Barcelona mostly Catalan (related) with nationalism 0.1. When Castile sets Impose, Granada gets *Banned language* and Barcelona does not, and the Andalusi lord Zegri wavers a step, just this once. If nationalism in Barcelona later reaches 0.3, Barcelona gets *Banned language* too.

*Banned language* ends in a province when the policy there becomes Let be or Teach, when an *Own language* charter is granted, or when the majority comes to speak the court language.

### The Own-language charter and other levers

The **Own language** charter means the local language is used in courts and schools. Where it stands:

- *Foreign rule* and *Banned language* end in that province.
- Officials there must be of the local language.
- Drift toward the court language stops (Basque people in Bayonne stay Basque).

The ruler can grant it, or the province's lords, its towns or a homeland rising can demand it. Revoking it gives *Broken charter*, as for any charter.

Two other levers help. A lord of the local language holding a homeland province ends *Foreign rule* there, because his language is the people's. And when the ruler marries into a local house, that house's lords count as the same language for loyalty.

### Officials and lords

Officials have a language too: the language of the province where they were hired (an official hired in Breton Rennes is Breton), or of the school they graduated from. You can hire officials of any language in your realm.

| Official serving among | Years to full effect |
|---|---|
| Same language | 5 |
| Related | 7 |
| Foreign | 10 |
| His own language | 5 |

An official of the local language in a foreign-language province keeps *Banned language* away there, even under Impose; *Foreign rule* stays. A Breton official in Rennes spares it the *Banned language*.

A province's language doesn't change how many officials and lords your government can support. A foreign-language province costs you only through the longer time your officials need there.

Lords: a same-language lord (or a lord of a house your ruler married into) has "shares your language" among his reasons to grow loyal, a foreign-language lord starts one step lower, and a related-language lord has neither.

### Order and war

- A homeland rising draws 8 % of everyone of that language. While nationalism in the homeland is under 0.5 it demands self-rule; at 0.5 or more it demands a new country.
- Defenders of the homeland language, rebels included, get +10 % in rough ground: locals know the land.
- A garrison captain of another language than his ruler can be bribed. A Breton captain serving a French king can be bribed; an Occitan one can't until nationalism rises.
- The war aim **Free a people** opens on a foreign homeland, or on a related homeland once nationalism there is 0.3 or more. Rennes (Breton, foreign) is open at nationalism 0; Toulouse (Occitan, related) opens only at 0.3.
- From the age of revolutions, the war aim **Gather our kin** (a diplomacy war aim) is offered on a province whose majority is your court language but held by another country, and taking it gives no *Foreign rule*. In 1820, Piedmont with the court language Italian can take Italian Venetia from Austria this way. In 1700 the war aim isn't offered yet.
- From the age of revolutions, the **National levy**: same-language provinces with nationalism 0.5 or more refill recruits 25 % faster, and foreign-language provinces 25 % slower.

### Trade, research and diplomacy

- Where a trading people is at least 2 % of a province with a market, trade value there rises 10 % and you may have one extra trader from that language. If they are persecuted or expelled, the bonus ends and they go as refugees to a neighbour, who gains it.
- A neighbour of the same family counts double toward the 60 % research cap for inventions known by neighbours and trade partners.
- Foreign scholars settle first in realms of their own family.
- Rulers of the same family start one step warmer, and of the same court language two. After nationalism, a country holding many people of your court language is a natural rival.

### Languages through history

**Spread.** When an event spreads a family into some provinces, the leading language of that family rises there, or a language set per region in config. If Valencia has Catalan 60 % and Castilian 10 % and an event spreads the latin family there, Catalan rises. The Oromo migrations spread the cushitic family into the Ethiopian highlands, so Oromo rises in each province there.

Every 5 years the game runs three checks of its own.

**The court goes native.** If your court language has been under 20 % of your people for 50 years and one other language is over half, the event *The court goes native* is raised. For example, Qing with the Manchu court and a Han majority. You choose:

- *Take their language*: the majority language becomes the court language, lords of the old language waver a step, and the old language's people become related or foreign (Manchu people become foreign to Qing).
- *Keep ours*: nothing changes and the check runs again in 25 years (raised in 1700, it comes back in 1725).

France, with French at 72 % of its people, never sees it.

**New languages abroad.** When settlers of one language have been the majority for 100 years in a map region on another continent than their court, their language there splits into a new creole language, which counts as related to the old court and gets no *Foreign rule* at once. Settlers on the court's own continent, or for fewer than 100 years, keep their language.

| Settlers | Region | Court | New language |
|---|---|---|---|
| Castilian | Mesoamerica | Castile | Criollo |
| Portuguese | Brazil | Portugal | Brazilian |
| English | North America | England | Anglo-American |
| Dutch | Southern Africa | Holland | Afrikaans |

**Nationalism.** Culture reads each province's nationalism support from the event tree and never sets it.

- At 0.3 or more, related languages there count as foreign: *Foreign rule* in their homeland, all drift there × 0.25, and *Free a people* opens. With Piedmont's Tuscan court, Neapolitans in Naples at 0.3 become foreign.
- At 0.5 or more, homeland risings demand a new country, and a released country takes the catalogue record for that people. If none fits, a new country is made, named after the language, with that language at court and the same form of government as the country it broke from. A winning Breton rising in Rennes releases a country with the catalogue's Breton record.

**Merging languages.** A nation-building event can merge named languages into their national language. A nation state, meaning a country whose court language is a national language such as Italian or German, that has kept Impose for 50 years merges the regional languages that belong to its national language, without an event. Italy with an Italian court merges Tuscan and Lombard after 50 years; after 45 it hasn't yet, and Savoy with its French court never does.

**For event writers.** Culture provides the event effects `tongue_spread`, `set_court_tongue`, `merge_tongues` and `move_people` (people of the language leave as refugees and settle elsewhere), and the triggers `court_tongue`, `tongue_share`, `kin_of`, `cousin_of` and `stranger_to`.

### The computer players

AI countries pick their Language policy by personality, using the same rules as you:

| Personality | Language policy | Levers |
|---|---|---|
| Hegemon seeker, expansionist | Teach, then Impose once they have printing | Settlers into conquered border provinces; *Gather our kin* after 1789 |
| Isolationist, mercantile | Let be | *Own language* charters; welcome trading peoples |
| Opportunist | Teach | *Free a people* against neighbours with foreign homelands in revolt |
| Zealot | Teach | Expel trading peoples of another faith |

### When it happens

Culture doesn't run monthly. Drift runs once a year in every province after births and deaths. The three history checks run every 5 years. Language % and the Peoples screen are worked out when you open them. Policy changes, charters and event effects happen at once.

## What you see

- **Province card, Language line**: up to three languages with shares, each with a coloured dot (green same language, yellow related, red foreign, grey trading people), for example "Language French 94 % · Flemish 6 %". Tap it to see this year's drift, which way it pulls and why.
- **Country card, Language line**: your Language %. Tap it to open the Peoples screen.
- **The Peoples screen**: one row per language in your realm, largest first, with its people, relation, provinces, and notes such as homeland, grievances, lords, charter and drift. The Language policy selector sits on top. A big realm (the Ottomans hold 40 languages in 9 families) groups the rows by family, folded shut. Tap a row to light its provinces on the map; long-press to see its lords, its officials and any rising.

For France the screen reads:

| Language | People | Relation | Where | Notes |
|---|---|---|---|---|
| French | 6.9 m | same language | 38 prov | |
| Occitan | 1.6 m | related | 9 prov | homeland, 2 grievances, drifting to French |
| Breton | 0.5 m | foreign | 3 prov | homeland, Foreign rule, 1 lord |
| Flemish | 0.4 m | foreign | 4 prov | homeland, Foreign rule |
| Basque | 0.1 m | foreign | 1 prov | homeland, Own-language charter |
| Jewish | 0.02 m | trading | 6 towns | +10 % trade in Paris, Lyon |

- **The Language lens**: provinces coloured by family at far zoom and by language at regional zoom, with a toggle to same language, related and foreign colours for your realm. Homelands of peoples without a country are outlined.

### In the game now

Every province starts in 1444 with up to three languages from its realm's start record: the court language, the realm's main peoples, and and, in some areas, a local language set by the area rather than the realm. The language most people speak in 1444 is the province's homeland.

- **Province card, Language line**: the three languages with their dots. Tap it to open this year's drift: the language it drifts toward, why (yours where you have held it 20 years and govern it through an official or lord, else the local majority) and each group's rate with its reasons. Tap again to close it.
- **Your realm card, Peoples tab** (next to Government): the court language, Language % (the same language plus half of the related ones), one fold per family with a row per language (share, people, relation, provinces, where it is the majority, aggrieved provinces) and the **Language policy** buttons: Let be, Teach (the 1444 default) and Impose. Impose needs Printing or a chancery tradition; until then its button is greyed out and says so. The General tab's Language line opens the tab.
- **Grievances**: *Foreign rule* where most people speak a language foreign to the court in their own homeland, on land taken after 1444 (land you held at the start never has it, or 394 provinces in 13 realms would start aggrieved); *Banned language* where you Impose and most people speak a foreign language.
- **The Languages lens**: each province coloured by the family of the language most speak, with a key of the largest families.
- Drift runs each New Year, so a share moves by a fraction of a point a year: a generation, not a season. There is no list of accepted cultures: who counts as yours comes from same language, related and foreign.

Not in yet: per-province homelands, officials' and lords' own languages, schools and town classes speeding drift, people fleeing, charters, and the computer players changing their policy.

## How it connects

- [Provinces](Provinces): stores the language mix, homeland, years held, officials, the *Own language* charter and the grievances; moves settlers, refugees and soldiers.
- [Your-Realm](Your-Realm): Language % on the country card, lords' loyalty steps, and dynasty changes.
- [Government](Government): no form limits your Language policy, and a province's language doesn't weigh on the caps; a released country keeps the form of the country it left.
- [Religion](Religion): the same shapes (mix, buildings, charter) and the persecution or expulsion of trading peoples.
- [Buildings](Buildings): schools carry a teaching language; Teach raises their upkeep 10 %.
- [Research](Research): printing for Impose, four inventions speeding drift, family neighbours and scholars.
- [Historical-Events](Historical-Events): families, spread, nationalism support, the new effects and triggers, migrations.
- [Rebellions](Rebellions): homeland risings and demands for *Own language* charters.
- [Warfare](Warfare): garrison bribes and locals know the land.
- [Diplomacy](Diplomacy): family warmth, natural rivals, marriages, and the war aims *Free a people* and *Gather our kin*.
- [Recruiting](Recruiting): the National levy refill.
- [Trade](Trade): trading peoples' trade value and extra trader.
- [Subjects](Subjects): a subject of your court language folds in faster; a foreign-language subject's independence war draws its people.
- [National-Strengths](National-Strengths): language-based strengths such as the chancery tradition.
- [Revolutions](Revolutions): creole languages and nationalism as signs; regimes set the court language.
- [Naval](Naval): seafaring languages drift slowly on the coast; sailors keep their language.
- [Music-and-Sound](Music-and-Sound): the music palette follows the court language's family.
- [Map-and-Lenses](Map-and-Lenses): the Language lens, dots and outlines.
- [The-1444-Start](The-1444-Start): court languages and each province's starting languages.
- [Time-and-Turns](Time-and-Turns): the yearly drift slot and the 5-yearly checks.

## Numbers

All numbers are **provisional** and still being balanced, except the four added families, the chancery-tradition list and the learned languages, which are decided.

| Key | Value |
|---|---|
| `families_added` | celtic, baltic, caucasian, hebrew (decided) |
| `relation.*.tongue_share_weight` | kin 1.0, cousin 0.5, stranger 0.0, trading 0.0 |
| `relation.*.foreign_rule` | cousin false, stranger true, trading false |
| `relation.cousin.drift_multiplier` | 2.0 |
| `drift.base_rate_per_year` | 0.005 |
| `drift.court_pull_needs_years_held` | 20 |
| `drift.court_pull_needs` | own official, lord of the court language |
| `drift.drop_below_share` | 0.01 |
| `drift.multipliers.*` | town 2.0, school 1.5, schoolmaster 2.0, homeland 0.5, way of life 0.5, diaspora 0.25, nationalism 0.25, own-language charter 0.0, each invention 1.25 |
| `policy.let_be/teach/impose.drift` | 0.5 / 1.0 / 2.0 |
| `policy.teach.school_upkeep` | 1.10 |
| `policy.impose` | *Banned language*, foreign-language lords waver 1, needs printing or chancery tradition |
| `start_flag_chancery_tradition` | ming, joseon, castile, ottoman (decided) |
| `officials.years_to_full_effect` | kin 5, cousin 7, stranger 10, local language 5 |
| `effects.trading_people` | min share 0.02, needs a market, trade value 0.10, 1 extra trader |
| `effects.family_neighbour_research_weight` | 2.0 |
| `effects.national_levy` | nationalism 0.5, kin 1.25, stranger 0.75, from the age of revolutions |
| `nationalism.cousins_become_strangers_at` | 0.3 |
| `nationalism.homeland_demands_country_at` | 0.5 |
| `engine_events.court_goes_native` | court share below 0.20 for 50 years, other language above 0.5, recheck 25 years |
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
- Features: `domain/culture/features/`: `tongues-and-relations.feature` (families, court language, Language % for France), `drift.feature` (Troyes, the language it drifts toward, multipliers, lands, the fourth language), `tongue-policy.feature`, `culture-effects.feature`, `culture-history.feature`, `peoples-screen.feature` and `culture-ai.feature`.
- Code: `packages/engine/src/domain/culture/`, with its numbers in `packages/rules/data/domain/culture.json` and the 1444 start in `packages/rules/data/domain/culture-start-1444.json`. The game wiring (province arrays, New Year drift, grievances, the snapshot) is `packages/engine/src/peoples.ts`; the panels are `apps/client/src/ui/belief.ts`.
