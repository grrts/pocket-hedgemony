# Religion

Religion decides which faiths exist, how the faith mix of every province slowly changes, and how you rule a realm where people pray in different ways. Faiths spread through things you can point at on the map: houses of worship, preachers, schools, traders, rulers and lords. You set a policy for each faith, from Established to Persecuted, and every choice has a price in grievances, lords' loyalty, tax and people.

There is no faith meter, piety, fervour or unity score, and no "convert province" button. Every change on the Faith line comes with a named reason.

## How it works

### Faiths and families

The game uses the event tree's list of faiths plus three added ones: hussite, jain and asian_traditional. Each faith belongs to one family:

| Family | Faiths |
|---|---|
| christian | catholic, protestant, anglican, orthodox, oriental_christian, hussite |
| islamic | sunni, shia, ibadi |
| indic | hindu, sikh, jain |
| buddhist | theravada, mahayana, vajrayana |
| east_asian | shinto, confucian_ritual, daoist |
| jewish | jewish |
| traditional | indigenous_american, african_traditional, pacific_traditional, siberian_steppe_traditional, asian_traditional |
| none | secular |

Each faith shows by its local name from the catalogue, while the rules use the faith id. Yazidi, Druze and Zoroastrian communities stay as named minorities in the catalogue rather than faiths of their own.

Faiths relate to each other in three ways:

- **Layered.** Some faiths live in the same people at once. Shinto, mahayana, confucian_ritual and daoist are layered with each other, and a traditional faith becomes layered with any faith once they have shared a province for 100 years. Layered faiths don't pull against each other, and a layered community gets no *Wrong faith* under a ruler of a faith it layers with. So Ming, with a confucian_ritual court and Beijing 30 % mahayana and 30 % daoist with no houses of their own, has no *Wrong faith* there.
- **Rooted.** The five traditional faiths need no house to be served, hold twice as hard (see below), and where they are a quarter or more of the people, their sacred places count as one house of worship (pull 1).
- **Kin.** Faiths of the same family are kin. A kin faith's house can serve a community under 20 %.

### The faith mix

Each province holds up to three faiths, as shares of its people. Once a year, every faith's **pull** is added up from the sources present:

| Source | Pull |
|---|---|
| A house of worship at step 1 / 2 / 3 (at least half filled with clergy) | 1 / 1.5 / 2 |
| The same house when fallow (short of clergy) | half |
| Each preacher of the faith stationed there | 2 |
| Each school of the faith (temple school, madrasa, monastery or cathedral school, seminary) | 0.5 |
| The ruler's faith in the ruler's capital | 1 |
| A lord's faith in a province he holds | 0.5 |
| Sunni, shia and ibadi: per 100 traders passing from markets of that faith | 0.5, up to 2 |
| A faith wave covering the province | the wave's pull per carrier |
| The ruler's faith where another faith is Restricted | +1 |
| The ruler's faith where a Chaplain official serves | pull from houses and preachers doubled |
| The ruler's faith where another faith is Persecuted | doubled |

Each faith also has a **hold**, its resistance to change: its share times 4, or times 8 for a rooted faith.

At the end of the year each faith gets a **target share**: its hold plus its pull, divided by all holds and all pulls in the province. Its share then moves 3 % of the way toward that target. If no faith has any pull, nothing moves.

*Worked example: one year.* A province is half catholic and half protestant. Catholic has 3 pull and protestant 1. Both have a hold of 0.5 × 4 = 2. Catholic's target is (2 + 3) ÷ (2 + 2 + 3 + 1) = 0.625, and its share moves 3 % of the way there, from 0.5 to 0.50375.

Hold slows change but never stops it. A province where one faith has three houses and another has one, with nothing else pulling, ends up about three to one after many years.

*Worked example: East Bengal, 1444 to 1700.* East Bengal is 70 % hindu, 25 % asian_traditional and 5 % sunni, with 2 hindu temples and a sunni lord, under a sunni ruler. The forest is cleared and a mosque is granted on each of 3 new field tiles. Now sunni has 3.5 pull (three mosques and the lord), hindu 2 (two temples) and asian_traditional 1 (its sacred places). The mix settles toward sunni 54 %, hindu 31 % and asian_traditional 15 %. Once asian_traditional falls below a quarter it loses its sacred-places pull, and by about 1700 East Bengal is mostly sunni.

**Small and new faiths.** A faith under 1 % with no house of its own is removed. A fourth faith arriving gets in only if it is larger than the smallest of the three. Then the smallest of the four joins the province's majority faith, so nobody simply vanishes. Languages work the same way.

**Hidden believers.** For 100 years after a Persecuted faith's houses in a province are closed, that faith stays at 2 % or more there, unless an Inquisition removes the floor. If catholic is Persecuted in Japan and its houses in Nagasaki were closed 40 years ago, it stays at 2 %; after 100 years, or with an Inquisition, it may fall lower.

**People on the move.** Refugees, settlers, migrants and soldiers settling at home shift the mix by their headcount at once, outside the pulls.

### Faith buildings

The buildings themselves are described on [Buildings](Buildings). Religion decides what they do for the mix:

| Building | Pull | Serves its community |
|---|---|---|
| House of worship, step 1 / 2 / 3 | 1 / 1.5 / 2 | yes |
| Landmark house (step 4) | 3 in its province, 0.5 in every province of the owner's realm within 3 rings | yes |
| Minority house of worship | 0.5 | yes |
| Monastery | 1, plus 0.5 as a school once it has seats | yes |
| Religious school | 0.5 | no |
| Pilgrimage shrine (holy places only) | 1 | yes |

A house of worship can be built for any faith present, not only yours. A minority house needs a community of a tenth of the people, or a *Faith tolerance* charter.

**Taking over a house.** You can convert a house to another faith at any time. It costs half of building it, its pull flips to the new faith, its clergy's property gold goes to your treasury (twice over for monastic land), an "insult to faith" spark is raised in the province, and lords of the old faith waver one step.

*Worked example.* Anglican England converts a catholic monastery with monastic land in Yorkshire. England pays half its building cost, the pull goes to anglican, the property gold is paid twice over, an "insult to faith" spark rises in Yorkshire, and the catholic lord Percy wavers a step.

**Tithes.** Each year the clergy of each faith get 1 gold for every 10,000 people of that faith into their own purse, which they spend on a house in every town of their faith first. A Restricted faith's clergy keep their houses but can't build new ones. When a faith becomes Persecuted, its purse is seized.

**Preachers found houses.** A preacher who spends 10 years in a province with no house of his faith founds a step-1 house there.

**Losing pull.** A house loses its pull when it is burned or sacked with its town, or closed or converted under a Persecuted policy or a change of state faith. It gives half while it lacks clergy.

**Clergy.** Faith buildings, almshouses and hospitals are where the clergy work, and the clergy are the pool for preachers and Chaplains. Whether clergy marry follows the faith.

### Communities and the Faith policy screen

Any faith with at least 10 % of a province's people is a **community** there. A community of a faith other than yours is **served** when its faith is Tolerated or Restricted and it has a house of its own faith in the province (or of a kin faith if it is under 20 %), or needs none because it is rooted or layered. Otherwise it is **unserved**, and a Persecuted community is always unserved.

You keep one policy row for each faith in your realm. Exactly one is **Established**: your state faith. The others are set to one of:

| Policy | What happens |
|---|---|
| Tolerated | Keeps its houses, its clergy may build new ones, normal tax. If the faith is 10 % or more of the realm, Pious and clergy lords of the state faith waver once. |
| Restricted | Keeps its houses, no new ones. Its share of tax is 25 % higher (faith tax). The state faith gets +1 pull wherever it lives. Its lords waver one step. |
| Persecuted | Its houses are closed or handed to the state faith (your choice for the realm). No tax from it. The grievance *Persecuted*, counting as two, in every province where it is 10 % or more. The state faith's pull is doubled where it lives. 2 % of its people flee each year as refugees, craftsmen and scholars first. Its lords waver two steps. Every ruler of that faith on your border gets the *Defend the faith* war aim against you. The flag `religious_persecution_active` is set. |

A policy change takes effect at the next New Year. Each step toward Persecuted raises a spark for faith risings where that faith lives; a step back is not a spark. A *Faith tolerance* charter makes a faith Tolerated in that province whatever the realm row says. When a faith stops being Persecuted, the *Persecuted* grievance ends.

**Wrong faith.** A province gets *Wrong faith* when a community of another faith is a third or more of the people and unserved, or is Restricted where it is the majority (unless protected; see Islam below).

*Worked example: La Rochelle under catholic France.*

| Protestant share | Policy | House | *Wrong faith*? |
|---|---|---|---|
| 40 % | Tolerated | none | yes |
| 20 % | Tolerated | none | no |
| 40 % | Tolerated | a protestant church | no |
| 60 % | Restricted | a protestant church | yes |
| 40 % | Restricted | a protestant church | no |

*Wrong faith* ends when the community's house is built and its faith is Tolerated or Restricted, when it converts, or when a *Faith tolerance* charter is granted.

### Expulsion and the Inquisition

**Expel** is a one-off decision, offered only on a Persecuted faith. Within a year, 70 % of its people leave as refugees for the nearest realm where it is Established or Tolerated, keeping their class where a slot is free; the rest convert or hide, and the hidden-believer floor still applies. The expelling realm gets the faith's houses and the gold of its property, the *Persecuted* grievance ends, and every province where they lived gets *Bloodshed*. Harm is never rewarded: an expulsion can never leave the expelling realm better off in people or skills; the host realm gains both.

*Worked example: the Alhambra decree.* In 1492, with jewish Persecuted in Castile and the Ottomans the nearest realm that tolerates it, Castile expels the jewish faith. Within a year 70 % leave for the Ottomans, Castile takes their houses and property gold, the *Persecuted* grievance ends, and every province where they lived gets *Bloodshed*.

**The Inquisition** is a decision only for realms ruled by a house (feudal realm, diet monarchy, household realm, bureaucratic empire, elective monarchy, absolute monarchy or constitutional monarchy) whose Established faith is catholic. While it runs it costs gold upkeep each year, removes the hidden-believer floor, adds +1 state-faith pull in every province with a Restricted or Persecuted community, and makes 1 % of the scholars and craftsmen in those provinces leave each year. It sets the flag `inquisition_established`, and you can close it again.

### Lords and faith

| A lord loses one step when | A lord gains one step when |
|---|---|
| His faith is set to Restricted (two steps for Persecuted) | The ruler builds or pays for a house of his faith in his land |
| He is Pious or clergy of the state faith and the realm tolerates a faith of 10 % or more of the realm | He is Pious or clergy of the state faith and the ruler takes over another faith's houses |
| The state faith changes away from his | The state faith changes to his |

### Preachers

Preachers are named agents of your state faith. You get one for each monastery or religious school of the state faith, one for every 5 houses of the state faith, one for each holy place of your faith you hold, plus any granted by events and some inventions.

*Worked example.* Catholic Castile has 2 monasteries, 1 religious school and 10 houses of worship, and holds Santiago de Compostela. That is 3 + 2 + 1 = 6 preachers.

A preacher travels like an envoy and, once there, adds 2 pull for the state faith each year. He can go to your own provinces, to a subject's provinces without asking, to a foreign realm whose ruler has given leave (*Allow preachers*, a diplomacy action), or to a foreign realm without leave. Without leave, that ruler may expel or execute him each year; if so, the flag `missionary_persecution` is set and you get the *Defend the faith* war aim.

You lose a preacher when he is killed or expelled abroad, when you recall him, or when your state faith changes (then all of them go). A preacher of a Persecuted faith inside the realm can lead a faith rising, which then spreads twice as fast.

### Changing the state faith

The decision **Adopt a faith** is offered when that faith is at least 30 % of your capital province, or 40 % or more of the realm, or when an event offers it. When you adopt:

- The old Established faith becomes Tolerated at once (you can change it from the next New Year).
- Every preacher of the old faith is gone, and you have none of the new faith until its houses exist.
- Lords' loyalty moves as in the table above.
- You choose to keep the old faith's houses (serving it as a community) or take them over (pull flips, property gold paid, twice for catholic and orthodox monastic land, and an "insult to faith" spark where each is taken).
- You choose to close the other faith's schools or keep them.

*Worked example.* Catholic Sweden with 3 catholic preachers adopts protestant, takes over the catholic houses and closes catholic schools. Catholic becomes Tolerated, Sweden has no preachers at all until protestant houses exist, the houses become protestant with their pull, the property gold is paid (twice for monastic land), sparks rise where houses were taken, catholic schools close, catholic lords lose a step and protestant lords gain one.

You can't adopt by decision again within 30 years; events aren't limited. After the event `peace_of_augsburg`, rulers inside the Empire can switch between catholic and protestant without the capital test (cuius regio).

### Holy places

Holy places are a fixed list of named provinces, each with its faiths and its 1444 holder:

| Holy place | Faiths | Held in 1444 by |
|---|---|---|
| Rome | catholic | Papal States |
| Jerusalem | catholic, orthodox, oriental_christian, jewish, sunni, shia | Mamluk Sultanate |
| Mecca and Medina | sunni, shia, ibadi | Hejaz (the Sharifs, not their Mamluk overlord) |
| Karbala and Najaf | shia | Qara Qoyunlu |
| Constantinople | orthodox | Byzantium |
| Echmiadzin | oriental_christian | Qara Qoyunlu |
| Aksum | oriental_christian | Ethiopia |
| Varanasi | hindu | Jaunpur |
| Lhasa | vajrayana | Tibet |
| Temple of the Tooth | theravada | Kotte, then Kandy from 1592 |
| Mount Wutai | mahayana | Ming |
| Qufu | confucian_ritual | Ming |
| Ise | shinto | Japan |
| Santiago de Compostela | catholic | Castile |
| Bodh Gaya | theravada, mahayana, vajrayana | Jaunpur |

Amritsar appears as a holy place only once the founding of the Sikh Panth has happened, not before 1577. A holy place is always held by whoever owns its province.

Holding a holy place of your own faith gives +1 preacher, the pilgrimage shrine there and 200 more traders passing through each year. Holding one of a faith you don't share lets every ruler of that faith use *Defend the faith* against you with that province as the prize. Pilgrims still come if you tolerate their faith and keep a house of it there. The holy places where church heads sit (the Pope, the Ecumenical Patriarch, a Caliph's claim, the Dalai Lama from 1578) are marked, and the heads have rules of their own, below.

### Heads of the faith

Five faiths have a head with a seat. Nothing here is a meter: a head works through ties, wrongs, preachers, lords, war aims and calls to arms.

| Head | Faith | Seat | How the patron is chosen |
|---|---|---|---|
| The Pope | catholic | Rome | A conclave when the Pope dies, or whoever holds Rome if the Papal States lose it |
| The Ecumenical Patriarch | orthodox | Constantinople | Whoever holds the seat, or its overlord |
| The Catholicos | oriental_christian | Echmiadzin | Whoever holds the seat, or its overlord |
| The Caliph | sunni | Mecca and Medina | A Sunni ruler who holds both, directly or as overlord, and takes *Claim the caliphate* |
| The Dalai Lama (from 1578) | vajrayana | Lhasa | Whoever chose him in *Altan Khan and the Dalai Lama*, until Lhasa changes hands |

Anglican and Protestant churches are headed by their own crowns, and every other faith has no head.

- **The patron** of a head who shares his faith gets the tie *The Pope favours us* (+15) with every realm of the faith and 1 more preacher. He owes them help: when a ruler of another faith attacks a fellow believer who holds a holy place, the patron gets a call to arms, and refusing it is an oath broken. A patron who changes faith loses the patronage and is *Betrayed the faith* (−30, fading over 30 years) with all of them.
- **A patron of another faith** (the Ottomans in Constantinople, say) gets nothing but this: every community of the head's faith in his realm counts as served.
- **Taking a seat** by war from a fellow believer of the head is *Seized the seat* (−20) with his faith; taking it from a ruler of another faith is *Freed the seat* (+20).
- **The conclave** sits for one month when the Pope dies. Each Catholic realm casts a vote per cardinal and may send gold, 20 gold a vote, up to as many gold votes as it has cardinals. Rome casts 10 votes; if Rome wins or ties, the Pope is Italian and has no patron.
- **Censure.** Declaring war on a ruler of your own faith, to take land, for tribute, to raid or with no aim, brings the head's censure: *Censured by the Pope* (−25) with every realm of the faith while the war lasts and fading over 10 years after, your lords of the faith waver once, and every fellow believer holds the *Punish* aim against you. A peace that gives back everything you took ends it at once. Crown-headed churches are never censured.
- **Raise our own patriarch**, once, for an Orthodox realm with a great Orthodox house in its capital while Constantinople is held by another faith, for 40 gold: its church becomes crown-headed and it gets 1 more preacher.

In 1444 the Pope has no patron, Byzantium is the Ecumenical Patriarch's patron, the Qara Qoyunlu the Catholicos's, and the Mamluks hold the Caliph's claim as overlord of the Hejaz.

### What each faith does differently

| Faith | Its own rule |
|---|---|
| Catholic | Clergy don't marry; taking over monastic land pays double; the Inquisition |
| Protestant | +0.5 pull for each press and each school in the province; clergy marry |
| Anglican (state faith) | The crown heads the church: clergy lords never waver over faith policy |
| Hussite | Kin of protestant once the Reformation starts; at the end of the Reformation period or in 1620, whichever comes first, its shares merge into protestant, or into catholic where there is no protestant house |
| Sunni, shia, ibadi (ruler) | Protected communities: a served Restricted community gets no *Wrong faith* even as the majority |
| Hindu | A step-3 temple draws 150 traders a year |
| Sikh | Each gurdwara shelters 1,000 homeless, like an almshouse |
| Theravada | Each house of worship gives 20 student seats, like a small temple school |
| Vajrayana | A step-3 house or monastery can be granted as a lord's land, its abbot being the lord |
| Orthodox | Taking over monastic land pays double |
| Secular | No houses; a secular state may only Tolerate or Restrict other faiths; after 1850, +0.5 pull from each school in a town with a factory, once the realm has mass schooling |

### Faith waves and events

A **faith wave** is a temporary source of pull started by an event. It starts from a place, grows outward each year by its reach in rings of provinces, never past its limit, and ends after a number of years or with a period. In each province it reaches, it adds its pull for each **carrier** there:

| Carrier | Counts |
|---|---|
| Presses | per press |
| Schools | per school |
| Towns | per town of market-town size or bigger |
| Traders | per 100 passing |
| Rule | the province is owned by the wave's starting country |
| Army | an army of that country stands or passed there this year |
| Preachers | per preacher of that faith, on top of his usual pull |

A wave never converts anyone by itself; it only adds pull.

*Worked example: the Reformation.* When `protestant_reformation` fires with the option to protect the reformer and the reform centre in Saxony, a protestant wave starts from Saxony. It gives 1.5 pull per press, school and market town or bigger in each province reached, spreads half a ring a year, never leaves Europe, and ends with the Reformation period.

Other events also start waves: the catholic renewal after `council_of_trent`, Safavid shiism after `safavid_rise`, the Sikh Panth, the Futa Jallon and Sokoto jihads, and the Mongol conversion to vajrayana after Altan Khan meets the Dalai Lama.

Religion adds ten new events: the princes adopting the Reformation (1525 to 1563), the expulsion of the Moriscos (1609 to 1614), Altan Khan and the Dalai Lama (1578), the jizya reimposed (1679), the Raskol and the Old Believers (1653 to 1667), the revolution and the church (1790 to 1801), the separation of church and state (1905 to 1928), the missionary societies (1792 onward), court conversion to Islam (1444 to 1750) and court conversion to Christianity (1790 to 1914).

For event writers, religion provides the conditions `faith_policy`, `holds_holy_place` and `faith_wave_active`, and the effects `faith_wave`, `faith_policy` (Tolerated, Restricted or Persecuted; Established is set only by `religion`) and `preachers` (extra preachers for some years, or for good with 0). The `religion` and `religion_share` conditions read the mix and the state faith directly, and `spread` still shifts a share at once.

### The start in 1444

Each country gets its ruler's faith from the catalogue, and each province the mix of the record that owns it, adjusted by region overrides. Where the people's majority differs from the ruler's faith, the ruler's faith starts at 15 % (court, garrison and town), as for sunni Delhi over a hindu people, catholic Lithuania over orthodox people, or sunni Mali over african_traditional people. A community not otherwise sized starts at 5 %.

| Region override | Starting mix |
|---|---|
| The Balkans under the Ottomans | orthodox 85 %, sunni 15 % |
| Bohemia | hussite 70 %, catholic 27 %, jewish 3 % |
| Granada | sunni 95 %, jewish 3 %, catholic 2 % |
| The north Java coast | hindu 55 %, sunni 25 %, asian_traditional 20 % |
| Punjab | hindu 55 %, sunni 45 % |
| Persia | sunni 80 %, shia 20 % |
| Egypt | sunni 88 %, oriental_christian 10 %, jewish 2 % |
| Polish towns | 5 % more jewish |

### What religion gives other systems

- Faith risings demand that their faith be Tolerated in the provinces they hold, or a house of worship there (a smaller demand rebels accept in a Talk).
- *Defend the faith* also opens when a neighbour persecutes your faith in a province bordering yours, when your preacher is killed or expelled, and when a holy place of your faith is held by another faith.
- Schools have a faith, and persecution drives scholars abroad.
- Diplomacy gets the fact "same faith" (better starting opinion) and the *Allow preachers* leave.
- Faith and language stay two separate mixes with two separate grievances.

### The computer players

- They build a house of the state faith wherever it is below half, if gold allows, and a minority's house when that community has *Wrong faith* and its lords are wavering.
- They tolerate any faith above 20 % of the realm unless zealous. A zealous ruler restricts, and persecutes only after an event or a war of religion. With jewish at 25 % of the realm, a mercantile AI tolerates it, a zealot restricts it, and a zealot after a war of religion persecutes it.
- They send preachers first to their own provinces where the state faith is under half, then abroad where they have leave.
- They adopt a new faith only when an event offers it or it is above 60 % of the realm.

### When it happens

Once a year, alongside traders and the trade balance: pulls, hold and the 3 % move, small shares, hidden-believer timers, tithes, persecution flight (2 %), Inquisition flight (1 %), wave growth, preachers founding houses and the Hussite merge check. At New Year, pending policy changes take effect. Each month, preachers travel and expulsions progress.

## What you see

- **Province card, Faith line**: each faith's share and whether it is rising or falling. Tap it to see this year's pulls for each faith with their sources, each community's state, and how fast the mix is moving and toward which faith. For example, Rouen at catholic 61 % falling, protestant 37 % rising and jewish 2 % shows the protestant community served by its own church and Tolerated, and the jewish 2 % as below a community with no grievance.
- **Country card, Faith row**: for example "Catholic · 78 % of people · 3 more faiths · 2 preachers · holds no holy place". Tap it to open the **Faith policy screen**, with one row per faith. Preachers are also listed under Abroad.
- **Faith %** is the share of people of the state faith or a faith layered with it. Ming, with 10 % confucian_ritual, 50 % mahayana, 30 % daoist and 10 % asian_traditional not yet layered, has a Faith % of 90.
- **The Faith map mode**: at world zoom, provinces coloured by majority faith, hatched where another faith's community is 30 % or more, with holy-place icons. At region zoom, houses as town sprites, preachers as walking figures and waves as a spreading tint. At local zoom, the Faith line.

### In the game now

Every province starts in 1444 with up to three faiths from its realm's start mix, with area overrides (Hussite Bohemia, Orthodox Balkans under the Ottomans). Communities of a tenth or more start with a house of worship where their faith has one.

- **Province card, Faith line**: each faith's share with ↑ or ↓. Tap it for this year's pulls per faith and their sources (houses, your capital, your policy), each community's state, any grievance, and how many points a year the mix moves toward which faith.
- **Your realm card, Peoples tab**: the state faith, Faith %, and a card per faith in your realm with its share, people and provinces. The state faith is Established; every other faith has three buttons, **Tolerated**, **Restricted** and **Persecuted**, which are your tolerance for that faith. A change is shown as pending and takes effect at New Year; tap the current policy to cancel it.
  - Tolerated: houses stand, normal tax.
  - Restricted: a quarter more tax from its people, no new houses, your faith pulls harder; *Wrong faith* where it is the majority.
  - Persecuted: its houses close at New Year and its people pay no tax, your faith pulls twice as hard; *Persecuted*, which counts as two grievances, wherever it is a tenth or more.
- **The Faiths map mode**: provinces coloured by majority faith, hatched where a second faith holds 30 % or more.
- Faiths move each New Year, a fraction of a point at a time.

- **Head of the faith card**, on the Peoples tab under the faith cards: the head, his seat and who holds it, the patron, what the patron gets and owes, and the one action open now (*Send gold to the conclave* with − and +, *Claim the caliphate*, *Raise our own patriarch*), or why it is not open. The Faith line on every realm's General tab carries a badge: *Patron of the Pope*, *Caliph*, *Heads its church* or a red *Censured*. Before you declare war, the Diplomacy tab warns you if the head will censure it and what it costs. The Faiths map mode marks each seat; tap one, or its button in the key, to open that head's card.
- For now a cardinal is a Catholic house in a province of 300,000 people or more, and a great Orthodox house is any Orthodox house in the capital.

Not in yet: building or paying for houses, preachers, expulsion and the Inquisition, changing the state faith, holy places, lords' faith, faith waves, and the computer players changing their policy.

## How it connects

- [Provinces](Provinces): stores the faith mix, the clergy class, the Chaplain, the *Faith tolerance* charter, *Wrong faith* and *Persecuted*, refugees and settlers.
- [Buildings](Buildings): the faith buildings themselves, converting, burning and who builds; religion supplies their pull and serving.
- [Your-Realm](Your-Realm): Faith % and preachers on the country card, lords' faith loyalty, the faith tax and take-over gold.
- [Rebellions](Rebellions): sparks from harsher policies and take-overs, faith risings' demands, preachers as leaders, *Bloodshed*.
- [Warfare](Warfare): the *Defend the faith* openings.
- [Diplomacy](Diplomacy): *Allow preachers*, same-faith opinion, preachers travelling like envoys.
- [Historical-Events](Historical-Events): faith ids, conditions and effects, waves, flags, the ten new events and the patches.
- [Government](Government): the state faith, clergy lords, holy places, "a reformed faith" and which forms may found an Inquisition.
- [Culture](Culture): trading peoples of another faith, and expulsions moving them; mixes stay separate.
- [Trade](Trade): traders feed Islamic pull; pilgrims add 200 traders; Hindu temples add 150.
- [Research](Research): schools have a faith; presses feed Protestant pull and waves; persecuted scholars leave.
- [Recruiting](Recruiting): a Chaplain commander's "Beloved" trait reads the army's faith share.
- [Subjects](Subjects): preachers enter subjects without permission.
- [Revolutions](Revolutions): faith revolutions use waves; regimes may lead to the church events.
- [The-1444-Start](The-1444-Start): the ruler's faith and each province's starting mix.
- [Map and Map Modes](Map-and-Lenses): the Faith map mode, house sprites, preachers and wave tint.
- [Time-and-Turns](Time-and-Turns): the yearly slot and New Year policy changes.

## Numbers

All numbers are **first-pass placeholders** in `religion.yaml`. Four defaults were kept on 16 October (still config values): communities at 10 %, *Wrong faith* at a third, the 25 % faith tax and the 3 % yearly move. The three-faith limit is a storage limit, not a balance number.

| Key | Value |
|---|---|
| `relations.layered_group` | shinto, mahayana, confucian_ritual, daoist |
| `relations.traditional_layers_after_years` | 100 |
| `relations.kin_serves_community_below` | 0.20 |
| `mix.max_faiths_per_province` | 3 (storage) |
| `mix.drift_per_year` | 0.03 (kept) |
| `mix.hold_per_share` / `rooted_hold_per_share` | 4 / 8 |
| `mix.rooted_sacred_places_pull` / `_min_share` | 1 / 0.25 |
| `mix.vanish_below` | 0.01 |
| `mix.hidden_believers_floor` / `_years` | 0.02 / 100 |
| `pull.house_steps` | 1, 1.5, 2 |
| `pull.landmark_house` | 3 here, 0.5 within 3 rings |
| `pull.minority_house`, `monastery`, `pilgrimage_shrine` | 0.5, 1, 1 |
| `pull.fallow_multiplier` | 0.5 |
| `pull.preacher`, `school_of_faith`, `capital`, `lord_of_faith` | 2, 0.5, 1, 0.5 |
| `pull.traders_per_100` / `traders_max` | 0.5 / 2 |
| `pull.restricted_escape_tax`, `chaplain_multiplier`, `persecution_multiplier`, `inquisition` | 1, 2, 2, 1 |
| `houses.minority_house_needs_share` | 0.10 |
| `houses.tithe_gold_per_10000_people` | 1 |
| `houses.community_founds_own_house` | share 0.20, every 20 years (no design rule) |
| `houses.preacher_founds_house_after_years` | 10 |
| `houses.convert_cost_share_of_build` | 0.5 |
| `houses.take_over_gold` | 20 per step, monastic land × 2 |
| `communities.min_share` | 0.10 (kept) |
| `communities.wrong_faith_min_share` | 0.33 (kept) |
| `policies.restricted` | faith tax 0.25 (kept), no new houses, lords −1 |
| `policies.persecuted` | close or take over, flee 0.02, grievance weight 2, lords −2 |
| `policies.change_takes_effect` | next New Year |
| `expulsion` | 70 % leave within 12 months, *Bloodshed* |
| `inquisition` | catholic monarchies, 10 gold a year, 1 % skilled leave |
| `preachers` | 1 per 5 houses, 1 per holy place, 1 gold a year upkeep, 25 % yearly expel chance abroad |
| `state_faith_change` | capital 0.30, realm 0.40, cooldown 30 years |
| `faith_rules.*` | Protestant 0.5 per press and school, Hussite merge by 1620, temple 150 traders, gurdwara 1,000 homeless, 20 seats, secular after 1850 at 0.5 |
| `holy_places[]` | 16 places |
| `holy_place_effects` | same faith: 1 preacher, 200 pilgrims |
| `waves` | carriers list, towns from market-town size, at most 8 active |
| `ai` | build below 0.5, tolerate above 0.20, adopt above 0.60 |
| `start` | ruler's faith 0.15, community 0.05, 8 region overrides |

## Settled details

- A community of another faith only takes the *Wrong faith* grievance once it is a third of the province or more.
- Expelling a faith moves 70 % of its people, and the expulsion of the Moriscos does the same.
- Court conversion to Islam is offered when your capital province is a third Sunni. Conversion to a Christian faith is offered when 15 % of the realm is Protestant.
- The province card shows exactly what the rules give. In Rouen that is Catholic 3.5, Protestant 5 and Jewish 1, moving about 0.3 points a year toward Protestant.
- Changing to Protestant, Anglican or Hussite from any other faith counts as "the ruler takes a reformed faith".
- When a faith is Persecuted, you choose once for the whole realm whether its houses are closed or taken over.
- Lords of a faith you tolerate waver once, when you set Tolerated while the faith is 10 % or more of the realm. Later growth moves no lord.
- After you adopt a faith, all old-faith preachers leave. New preachers come from the new faith's houses as they appear, while its holy places and events count at once.
- Preachers come from houses, monasteries, religious schools, holy places and events. No invention gives them.
- A few records with no faith start with a fixed one: the Wokou are Mahayana, the Guanahatabey follow an indigenous faith, and the Druze of the Maan and the Yazidi communities count as Sunni.
- Some numbers are provisional and may still be tuned: Inquisition upkeep 10 gold a year, preacher upkeep 1 gold a year, an unwelcome preacher expelled with a 25 % chance a year, take-over cost 20 gold per step, and at most 8 waves at once.

## Still open

Nothing. Every question about religion has been decided.

## For developers

- Spec: `domain/religion/spec.md` in the game repository.
- Features: `domain/religion/features/`: `faiths.feature`, `faith-mix.feature` (one year's move, East Bengal), `faith-buildings.feature`, `communities-and-policy.feature`, `expulsion-and-inquisition.feature` (the Alhambra decree), `preachers.feature`, `state-faith.feature`, `holy-places.feature`, `faith-rules.feature`, `faith-waves-and-events.feature`, `religion-uses.feature`, `religion-view.feature` and `religion-ai.feature`.
- Code: `packages/engine/src/domain/religion/`, with its numbers in `packages/rules/data/domain/religion.json`. The game wiring is `packages/engine/src/peoples.ts`; the panels are `apps/client/src/ui/belief.ts`.
