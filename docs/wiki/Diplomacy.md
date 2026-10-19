# Diplomacy

Diplomacy is how countries deal with each other short of fighting, and how they get into and out of wars. You send envoys (your own officials) to other courts, and every request is answered by a plain list of reasons with numbers that the other side adds up: over zero is yes. There is no preview and no hidden score; the answer arrives a month after it is given, with every reason spelled out, so you can see why and try again differently.

## How it works

### How two countries stand

Two countries stand toward each other in one of **nine relation types**: Alliance, Friendly, Neutral, Rival, Hostile, At War, Subject, Overlord and Truce. Overlord is never stored; it is read from the other end of a Subject record. Each pair has three independent **slots**:

- **Hierarchy**: Subject (and so Overlord).
- **State**: at most one of At War, Truce or Alliance per pair.
- **Stance**: one of Friendly, Neutral, Rival or Hostile for each direction, so A can be Friendly toward B while B is Rival toward A.

When no stance is stored, the **implied stance** applies: Hostile at war, Friendly when allied, otherwise Neutral. A missing pair just means nothing is recorded; it is never read as a historical claim of neutrality, and no alliance, subject or rivalry is guessed from friendliness, influence or neighbourhood. A country has at most one direct overlord; chains of subjects are allowed, cycles are not. Every Rival names a **contested object** (a throne, province, trade city, route, sphere or office).

| Type | Effects | Ends by |
|---|---|---|
| Alliance | +50 line; an ally can't be attacked until the alliance is broken | breaking, declaring war, making a subject, a country destroyed; never expires |
| Friendly | +30 line | insult, rivalry, war, decay after 240 months unrefreshed |
| Neutral | none | any stance change |
| Rival | −30 line; AI war target; wars against it please your lords | dropping it, the object resolved; lasts at least 120 months |
| Hostile | −75 line; blocks alliances; border-raid events (0.02 a month) | improving relations, decay to Rival after 120 months |
| At War | −100 line; trade between the pair stops | peace |
| Subject | owned by [Subjects](Subjects) | independence won, release, annexation |
| Truce | −10 line; no war until it expires | expiry, breaking it, an alliance, making a subject |

Some combinations can't exist together: for example an Alliance can't sit with a Neutral, Hostile, At War, Subject or Truce, and At War can't sit with Friendly, Neutral, Alliance, Subject or Truce. A few are allowed only with a note (allies who compete over a contested object, a disloyal subject, a subject competing with its overlord). When effects happen together the order is At War, Truce, Subject, Alliance, Hostile, Rival, Friendly, Neutral, and a newer relation made in play wins over an older one unless the action's own conditions block it. Relations made in play are marked `gameplay` and never written back into the start data. **Diplomatic facts** (royal marriage, dynastic claim, territorial claim, trade agreement, secondary tribute, shared ruler, membership, religious authority, and the new protection pledge) only feed reasons; they never create or block a relation.

**The relation actions** move a pair between types:

- **Declare war** needs no Alliance and no Truce with the target, and you can't declare on your own overlord (a subject uses an independence war) or on your own subject (an overlord annexes or releases). It ends Friendly and Neutral stances, creates At War, and sets Hostile where no stance was stored.
- **Independence war** ends the Subject relation, makes both Hostile, and restores the subject if the overlord wins.
- **Make peace** ends the war, makes implied Hostile stances real, and creates a Truce (or a Subject when that is a term). **White peace** creates a Truce and turns Hostile into Rival, the contested object still open.
- **Extend truce** needs both sides; **break truce** ends it and makes both Hostile; at expiry a truce ends silently, leaving any stance.
- **Form alliance** needs no Hostile stance either way, no war and no subject tie, and ends any Truce or Neutral. **Break alliance** ends it with a penalty.
- **Make subject** ends any Alliance, Truce, war and Neutral; **release subject** makes both Friendly.
- **Set rival** needs a contested object; **insult** makes the stance Hostile; **improve relations** moves one step from Hostile to Rival to Neutral to Friendly.
- A war between other countries never rewrites a subject relation. A destroyed country loses all its relations.

The start dataset holds 503 relations and 128 facts (reference date 20 September 1378), with each Catholic realm's obedience to the Pope in Rome or the Pope in Avignon, and is checked before play. Wars already under way include England against France, Venice against Genoa and its allies, Mamai's Horde against Moscow, Lithuania against the Teutonic and Livonian Orders, Champa against Dai Viet and Ming against the Northern Yuan. The 1444 checkpoint keeps its own 280 relations and 19 facts.

### Envoys

Every envoy is an **official** sent abroad, and the province he ran is run as if it had no official until he comes back. Countries without officials (chiefdoms, stateless societies) send a lord or elder instead, and a lord away over 12 months loses a step of loyalty.

| Envoy seats | |
|---|---|
| Start | 1 |
| Realm of more than 10 provinces | +1 (lost at 10 or fewer; residents beyond your seats are then recalled, newest first, while missions finish) |
| G5 Royal chancery | +1 (never lost) |
| G8 Resident ambassadors | +1 (never lost) |
| A national strength | may add 1 |

Seats are a hard limit on envoys abroad. An envoy's official type helps with what it suits:

| Official type | Better at | Bonus |
|---|---|---|
| Judge | peace offers, demands, sworn peace | +10 |
| Customs officer | trade pacts, passage | +10 |
| Chaplain | marriages with a ruler of the same faith; anything asked of a same-faith country | +10 |
| Steward, Tax collector | gifts and loans | the gift counts 25 % more |
| Marshal, Warden, Muster master | alliances and calls to arms | +10 |
| Schoolmaster | marriages; courting a foreign lord | +10 |
| Master of works | nothing extra | 0 |

An envoy with 10 years served adds +5 more, and one resident at a court for 5 years adds +5 to anything asked of it.

**The road.** Envoys travel the army route graph at 2 days per crossing unit (three times march pace), using naval sea times for sea legs. Arrival, one month at court and return are worked out once when sent. A land route through a country at war with you, or one that denied you passage, goes by sea or not at all. Once both countries know T14 telegraphy, a mission is decided the turn it is sent without the envoy leaving home (the answer still comes a month later); marriages and residents still travel.

**Missions and residents.** An envoy carries exactly one task: a **mission** (one action to one court, decided on arrival, then home) or a **residence**. With G8 an envoy can stay **resident** at one court until recalled. A resident adds the tie *Resident envoy* +5 each season up to +30 (fading over 5 years after he leaves), shows you that country's soldiers, its treasury to the nearest 100 gold and its lords' loyalty, carries any mission there with no travel, and warns you a month ahead when that country is about to declare war on you or your allies. A **courtesy visit** goes, stays a month, comes back, and leaves the tie *Courtesy visit* +15 fading over 5 years.

**Envoys held or lost.** If host and sender go to war, the envoy is held until the peace returns him. A demand refused by a Hostile country holds the envoy 1 time in 10, which gives you the war aim *Punish*. A resident flees home if the country falls to rebels. If the official dies of old age on the road, the seat frees and the mission fails. The envoy carrying a peace is never held.

### The ledger and standing

For each country you have dealt with, your realm keeps a **ledger** of named ties and wrongs, each with a weight and a fade time or condition. Its total is your **standing** on a scale of −200 to +200, the same number the event tree calls `opinion`. The stance or state counts as one line (Alliance +50, Friendly +30, Neutral 0, Rival −30, Hostile −75, At War −100, Truce −10). A ledger holds at most 12 entries; beyond that the smallest merge into "Old matters". A fading entry shrinks in equal yearly steps to zero.

**Ties:**

| Tie | Weight | Lasts |
|---|---|---|
| Married houses | +15 each, up to +30 (era IV: +10) | while the marriage lives |
| Gift | +1 per 5 gold, up to +30 per gift (era VII: half) | fades over 10 years |
| Courtesy visit | +15 | fades over 5 years |
| Resident envoy | +5 a season, up to +30 | while resident, then fades over 5 years |
| Fought side by side | +15 | fades over 20 years |
| Answered our call | +20 | fades over 20 years |
| Share a rival | +15 | while true |
| Same faith | +10 | while true |
| Same culture group | +5 | while true |
| Trade pact | +10 | while in force |
| Pledged to protect us | +15 | while in force |
| Freed us | +40 | fades over 30 years |
| Event ties | as the event says | default 10-year fade |

**Wrongs:**

| Wrong | Weight | Lasts |
|---|---|---|
| Took our land | −10 per province | fades over 20 years |
| Broke a truce with us / broke our alliance | −40 | fades over 30 years |
| Abandoned us (refused a defensive call) | −30 | fades over 30 years |
| Insulted us | −20 | fades over 10 years |
| Threatened us | −15 | fades over 10 years |
| Holds a claim on our land or throne | −20 | while the claim stands |
| Courted our lord (if discovered) | −25 | fades over 10 years |
| Embargo against us | −15 | while in force |
| Different faith, where the faiths are hostile | −10 to −25 | while true |
| Notorious deed | −10 × notoriety added | fades over 30 years |
| Stirred revolt in our land | −50 | fades over 20 years |

Standing shows as a word: **Close** (+100 or more), **Warm** (+30 to +99), **Cool** (−29 to +29), **Cold** (−30 to −99), **Bitter** (−100 or less), with the ledger one tap away.

Two world-wide counts from [Your-Realm](Your-Realm) also act as reasons. Each **Oath broken** in the last 30 years is −10 in every count that relies on your word (alliances, pacts, sworn peace, pledges, marriages). **Lands taken** in the last 20 years drives leagues and is a reason in your neighbours' alliance counts.

### The reasons count

Every yes or no is decided the same way: the asked country lists its reasons, each with a number, and answers yes only when the total is over zero. The answer arrives as a **letter** a month after it is given, yes or no with the full reasons list. Before you send, each ask the reasons decide shows one word on its button: **Likely** when its count as it stands this month is +15 or more, **Unlikely** at −15 or less, and **Unsure** between. No numbers are shown, and the count is made again when the envoy arrives, so much can change on the way. A courtesy visit and a gift always land and show no word. Beyond the word you can judge from what you can see: the ledger, the stance, and the other side's soldiers (exact with a resident, otherwise an estimate).

Every count holds:

- the action's negative **base**, which says how big the ask is;
- standing ÷ 4;
- −10 per Oath broken if the action relies on your word;
- the envoy's type and years-served reason;
- the asked country's personality (−30 to +30 by action);
- its ruler's traits (Pious +10 to anything asked by the same faith, Warlike −10 to sworn peace, Greedy +10 to anything with a gift);
- a national strength where it says so.

**Strength** is soldiers under arms, with allies who would come counted at half. An ask that binds them to you (alliance, pledge, protection) adds *You are stronger than us* +10 per full multiple up to +40, or *We are stronger than you* −10 per full multiple up to −40. A demand adds *We cannot beat you* +15 per full multiple beyond 1 up to +60, and *We have strong friends* minus half of that when their allies would defend them. A country already at war adds −30 to any new commitment unless it is against the same enemy.

**Other common reasons:** *Too far to matter* −15 with no shared border and no shared neighbour, and *Very far* −15 more when an envoy needs over 60 days; *We share an enemy* +25 when both are at war with the same country; *You threaten our frontier* −5 for each province in your Lands taken that borders them; *We already have allies* −10 for each of their alliances beyond two. Each action adds at most two reasons of its own.

**Hungary asks Venice, 11 November 1444** (on the 1444 checkpoint world). Hungary and Venice are both at war with the Ottomans; Venice is allied with Florence, a hegemon seeker with high negotiation. Venice's standing toward Hungary is +10 (Same faith). Venice with half its allies has between 1 and 2 times Hungary's soldiers. Hungary's envoy is a Judge with 7 years served.

| Reason | Number |
|---|---|
| Base (alliance) | −40 |
| Standing ÷ 4 | +2 |
| We share an enemy (Ottomans) | +25 |
| We are stronger than you | −10 |
| We already have allies | 0 |
| Hegemon seeker: alliance with a stronger | 0 |
| Negotiation high | +10 |
| **Total** | **−13: no** |

Hungary then sends Venice a gift of 100 gold, raising standing to +30, and sends a Marshal instead. The total becomes +2, the answer is yes, and Hungary and Venice are allied.

### The actions

| Action | How | Needs | Base | What happens |
|---|---|---|---|---|
| Propose alliance | envoy | no war; neither side Hostile; no subject tie | −40 | Alliance (replaces a Truce) |
| Call to arms | instant, answer a month later | an Alliance, Pledge or League | −20 defensive / −50 offensive | they join your war, or refuse |
| Break alliance | instant | an Alliance | | ends it; Oath broken; *Broke our alliance* |
| Arrange marriage | envoy | an unmarried heir or child on each side | −15 | marriage fact; *Married houses*; a chance at a claim |
| Demand | envoy | a war aim against them, or a Rival or Hostile stance | −60 | they give it, or you gain a war aim |
| Ask for passage | envoy | G8; no war | −10 | your armies may cross for 2 years |
| Trade pact | envoy | no war | −10 | their border opens to your traders |
| Embargo | instant | no war | | their border closes to your traders |
| Pledge protection | instant | not at war; not your subject | | you promise to defend them |
| Swear peace | envoy | no war | −20 | a Truce of 10 years without a war |
| Offer overlordship | envoy | see below | −80 | a subject by agreement |
| Ask for protection | envoy | see below | −10 | a subject by agreement |
| Court a lord | envoy | a foreign Wavering or Disloyal lord | | his loyalty drops; he may defect with his land |
| Send gift | envoy | gold | | tie *Gift* |
| Courtesy visit | envoy | | | tie *Courtesy visit* |
| Make resident | envoy | G8 | | tie *Resident envoy*; sight of their court |
| Insult | instant | | | *Insulted us*; Hostile |
| Declare rival | instant | a contested object | | Rival stance |
| Fund rebels | envoy, secret | 1 % of their yearly income each month; not your ally or subject; a revolution brewing there | | their revolution breaks out sooner |
| Lift embargo, stop funding, mark or unmark a mobilisation pact | instant | | | free |
| Withdraw a pledge | instant | a pledge | | Oath broken |
| Drop a rival | instant | the rival has stood 10 years | | Rival ends |
| Recall a resident | instant | a resident (an envoy on a mission can't be recalled) | | he comes home |

**Alliances and calls to arms.** When war is declared on you, your allies get defensive calls, except in your own independence war or a war you provoked by a refused demand. An ally who **refuses a defensive call** breaks the alliance, takes an Oath broken, and gets *Abandoned us* in your ledger. Refusing an **offensive call** breaks nothing; the ally just stays out. A call's count adds *Our ally's war aim is our concern* +30 (the target is their Rival or Hostile, or the aim frees their people or faith), *We are at war already* −30, and *The enemy is far stronger* −10 per full multiple up to −40. Calls go out instantly and are answered a month later. An ally keeps its own armies and its own peace voices and is named in the peace so it gets the truce too. When over half its own peace voices say peace it may make a **separate peace**; that is no Oath broken, but you lose the tie *Answered our call*. Joining when asked gives *Answered our call* +20; fighting on the same side gives *Fought side by side* +15.

**Marriages and pretenders.** A marriage needs an unmarried heir, son or daughter on each side, and for houses of hostile faiths the religion rule on tolerance. Its count adds *Their house is greater* +10 (your realm has more people) and *A marriage already binds us* −10 per existing marriage. While a marriage lives, when either ruler dies without a direct heir the other house gets a 1 in 10 chance per marriage of a claim: a dynastic claim fact and a **pretender** at that court. Pretenders also come from exiles of a lost succession war or revolt, and from events; a pretender gives the war aim *Seat a pretender*, and his claim passes to his heir or lapses. When a ruler dies with no heir at all and your house holds the strongest claim (most marriages, then the closest), the realm passes to your ruler as a personal union for [Subjects](Subjects), and each Wavering or Disloyal lord of the inherited realm rolls to rise for a local claimant.

**Demands** are the step before war. Each names exactly one demand with its need met:

| Demand | Needs | War aim on refusal |
|---|---|---|
| Hand over a province | a border with it, or a claim | Take land (that province) |
| Pay tribute | a border | Tribute |
| Recognise our pretender | a pretender at your court | Seat a pretender |
| Release a subject | they have a subject | Break a subject |
| Tolerate our faith in a named province | the persecution flag on a province bordering you | Defend the faith |
| Apologise and pay | they broke an oath to you or insulted you | Punish |
| Expel an envoy / cut an alliance | they host your enemy's resident, or are allied with your Rival | Punish |

A demand's count adds *We cannot beat you*, *We have strong friends*, and *It's our heartland* −30 for a province with their capital or of their own culture. If they give in you get exactly what was asked with no war and no truce, and they record *Threatened us*. If they refuse you gain the matching war aim for 5 years, and the war that follows counts as **provoked** by them: your non-Warlike lords don't waver, your allies' offensive calls get *They refused a fair demand* +20, and their allies get no defensive call at all.

**Passage.** Your armies may enter a foreign country only if you are at war, it is your subject or ally, or it granted passage. From G8 you can ask for passage by envoy (base −10, *You are marching on our friend* −40, *You are marching on our enemy* +20); before G8 a country at peace is closed to your armies unless it is an ally or subject. Passage lasts 2 years and the granting side can revoke it any time without an Oath broken. A country that refused or revoked your passage blocks your envoys over its land for 2 years. An army that enters without passage commits an act of war: the owner may declare with the aim *Punish* that turn, and its allies' defensive calls count as answered to a war started by the intruder.

**Trade pacts and embargoes.** A trade pact waives tolls and extra fees for both sides' traders, records the trade agreement fact and adds *Trade pact* +10 both ways, ending with war or when either side cancels. An embargo (instant) bars both sides' traders from each other's land and ports, closes paths through the embargoing country, and adds *Embargo against us* −15.

**Pledges and sworn peace.** A pledge is a one-way promise to defend a country; it gives them *Pledged to protect us* +15. If they are attacked you get a defensive call as if allied, and refusing is an Oath broken. **Swear peace** (base −20, *We fear you* +10 per multiple, *We want your land* −30 if they claim your land) creates a 10-year Truce without a war; breaking it is an Oath broken and *Broke a truce with us*.

**Subjects by agreement.** *Offer overlordship* (base −80) adds *We need a protector* +20 per neighbour Hostile toward them or claiming them, *You already protect us* +20 with a pledge, and *We are proud* −10 per castle of theirs beyond two; on yes, [Subjects](Subjects) makes them a Tributary. *Ask for protection* (base −10) asks a stronger country to take you as a subject; on yes you become a Tributary, or a Vassal if you asked for that.

**Courting a foreign lord.** An envoy can work on a foreign Wavering or Disloyal lord: each season he stays, the lord's loyalty to his own ruler drops a step, unless his ruler pays him more or wins a battle he fought in. A Disloyal lord who borders you and has been courted for a year defects with his lands, and his old ruler gains *Take land* for them. Each season there is a 1 in 4 chance of discovery, which adds *Courted our lord* and sends the envoy home.

**Gifts, insults and rivals.** A gift of any amount adds *Gift* (+1 per 5 gold, up to +30, fading over 10 years). An insult makes the insulted side Hostile toward you (ending any friendship between you), adds *Insulted us*, raises a loyalty step for each of your Warlike lords whose Want is a war with them, and gives them *Punish*. Declaring a rival needs a named contested object.

**Funding rebels** pays for a revolution that is already brewing in another country (its revolution card shows at least one sign). It needs a free envoy seat and a target that is not your ally or subject, and costs 1 % of the target's yearly income every month. Nobody is told, not even when you stop. While you pay, that country's revolution breaks out sooner. You can also fund an émigré pretender court the same way. Each month there is a 3 in 100 chance of being caught: the envoy is held and funding stops, the target records *Stirred revolt in our land* −50 (fading over 20 years) and gains *Punish* against you for 5 years, and you learn it a month later. If the revolution wins, the new regime records *Backed our revolution* +25 toward you, unless it hates your form of rule.

### War aims

A war aim is held from things in the world:

| War aim | Held when | Lasts |
|---|---|---|
| Take land (named provinces) | you held them in the last 50 years; a pretender of yours claims them; they are a homeland of your culture; a lord's Want names them; they refused your demand for them; a lord defected from you with them | while the reason holds; a refused demand gives 5 years |
| Seat a pretender | a pretender to their throne is at your court, including an émigré court | while the pretender lives |
| Tribute | you border them and they refused a tribute demand; or you border them and have 3 times their soldiers | 5 years / while true |
| Free a people | their land holds a homeland of a culture with no country, yours or accepted by you | while true |
| Break a subject (the war is on the overlord) | they have a subject Hostile toward them or that asked you for help | while true |
| Defend the faith | the persecution flag on a province bordering you; or they refused your tolerance demand | while true |
| Punish | they broke an oath to you, insulted you, held your envoy, entered without passage, refused *Apologise and pay*, or were caught funding rebels in your land | 5 years |
| Raid | nothing | always |
| No aim | nothing | always |

Events and national strengths can grant other aims for a stated time. What each aim wins at the peace is set by [Warfare](Warfare).

### Declaring war

You declare war, and offer or ask for peace, from the **Diplomacy tab** of the other country's card.

A declaration needs a target and exactly one aim you hold. Any Alliance, Truce or Pledge with the target must be broken first, each an Oath broken. The same turn, offensive calls go to your allies, defensive calls to the target's allies and pledgers, both sides' subjects come in by their kind (a Union joins at once, a Vassal or Protectorate is called and answers by its loyalty, a March joins when the enemy borders it, a Tributary or Colony stays out), and members of a league against you are brought in; answers arrive a month later. The aim is shown to every country, and for a war with no aim every neighbour of yours records *Threatened us*. A Union, Colony or Protectorate can't declare war, and a Vassal can't declare war on its overlord's allies; they join their overlord's wars or start an independence war. A realm under a regency may fight only defensive wars and Raids.

**Hungary prepares to declare war on the Ottomans.** Hungary holds the aim Take land for Nikopol from the Want of its lord John Hunyadi. The declaration sheet shows the aim "Take land: Nikopol" and its source, Wallachia and the Papal States as called on Hungary's side, Serbia as an Ottoman tributary that does not join, and how many of Hungary's voices lean to peace. It does not show how the called countries will answer. It offers *Send a demand first* and *Declare*.

### Peace and truces

Computer players offer you peace by the same rules they use among themselves: when over half their peace voices want it, or when they are worn out. Their offer arrives in your turn report, waits under Waiting for you and marks their Diplomacy tab until you answer it or put it off.

A signed peace starts a truce of **5 years, plus 5 more** if it moved provinces or made a subject; a white peace gives 5 years. Both sides may agree to extend a truce. From era III, when three or more countries are on each side, one envoy can carry a single **many-sided peace** that every warring country signs at once, each by its own peace voices; before that each pair makes its own peace.

### Leagues against a conqueror

Once a year, for each country X whose Lands taken (last 20 years) reaches the era's **league threshold** (8 in eras I to III, 6 in IV and V, 4 in VI and VII), every country that borders X or a province X took in the last 20 years, and is not X's ally, subject or overlord and not at war with X, makes the count *Join a league against X*:

| Reason | Number |
|---|---|
| Base | −30 |
| Their standing toward X | − standing ÷ 4 |
| X took our land | +10 per province |
| X's Lands taken | +3 per province |
| X could crush us alone | balancers +10 per multiple; bandwagoners −10 per multiple |
| Others already in the league | +5 per member |
| Same faith as X | −10 |

When at least two say yes, the league forms, named after X ("League against Venice"). If X declares war on any member, every member gets a defensive call; a member who refuses leaves with no Oath broken. Members owe nothing else and are protected against nobody but X. X sees the league, its members and their soldiers on its country card. The league dissolves when X's Lands taken falls below half the threshold, or X makes a peace that gives provinces back to members. Events can also start a league regardless of the threshold; such a league ends only by event or by a peace that gives provinces back.

### Eras

| Era | Change |
|---|---|
| I the start (1378) to 1500 | envoys only travel; residents only with G8 (the Italian states start with it); marriages the strongest tie |
| II 1500 to 1600 | G8 spreads; residents give sight of other courts |
| III 1600 to 1700 | many-sided peace, or earlier if the event `peace_of_westphalia` fires |
| IV 1700 to 1800 | league threshold 8 to 6; *Married houses* +10 |
| V 1800 to 1870 | T14 telegraphy makes missions instant between telegraph countries (marriages and residents still travel) |
| VI 1870 to 1914 | **mobilisation pacts**: either ally can mark or unmark an alliance as a pact: a defensive call is then answered automatically, shown to the player as an event, and offensive calls between the partners get +10; league threshold 4 |
| VII 1914 to 1939 | gifts count half; the campaign ends 31 August 1939 |

A revolution can add its own reason row, for example *Different form of rule* −20 with monarchies in every count for a set time.

### Events

An event's `opinion` effect adds an event tie or wrong named after the event, fading over 10 years unless it says otherwise. `trust` is read as 100 − 10 × Oaths broken (never below 0), and an effect lowering it adds an Oath broken. `notoriety` is 5 × Lands taken plus the notoriety events added that has not yet faded (each point fades over 30 years), capped at 100; adding notoriety n adds *Notorious deed* −10 × n with every country that shares a border, a sea zone or a trade pact with the actor. A league started by an event needs no minimum number of members and ends only by event or by a peace that gives provinces back. An event setting a `relation` (alliance, truce, rivalry, war, trade pact, embargo, guarantee, non-aggression) runs the matching action with its conditions. Three new effects are asked for: `war_aim`, `league` and `pretender`.

### The computer players

The AI decides with exactly the same counts, adding rows for its **posture** and **negotiation level**:

| Posture | Seeks | Reason rows |
|---|---|---|
| Mixed | nothing in particular | none |
| Bandwagoner | alliance with the strongest neighbour | +20 alliances with a stronger country; +20 *Ask for protection*; −10 per multiple to leagues against the strong |
| Opportunist | gains when others are weak | +20 joining the side with more soldiers; −20 defensive calls against a stronger enemy; courts lords; Oaths broken count −5 in its own reckoning |
| Isolationist | to be left alone | −30 alliances and calls; +20 sworn peace and trade pacts; −20 passage |
| Balancer | stop any one power growing | +10 per multiple to leagues against the strong; +20 alliances against the strongest neighbour |
| Client seeker | a protector | +30 *Offer overlordship* and pledges from a stronger, Warm country |
| Hegemon seeker | domination | makes demands; −20 alliances with a stronger country; offers pledges and overlordship to small neighbours |

Negotiation level adds very high +15 (and gifts count 25 % more), high +10, moderate 0, low −10, very low −20. Each month an AI with a free seat scores up to 5 candidate actions per free seat toward countries in its horizon (neighbours, neighbours' neighbours, anyone it has a relation or fact with, its rivals' enemies), estimates the other side's count with only what a player could see, sends the best one over zero, and sends a gift first when the best is a close no (−20 or better). It tries a demand before war unless it is an Opportunist and the target's armies are away. Opportunists and hegemon seekers fund rebels in a rival's provinces that already have two or more grievances.

### Arms and fear

Every month each country weighs each neighbour it does not count as a friend (friends are its allies, its overlord and its subjects) against its own side: its men under arms, the levies it can still call and its lords' men, with its friends counting half. A neighbour 1.5 times as strong makes it **Wary**; 2.5 times as strong makes it **Threatened**. There is no rivalry: fear is measured again each month and goes as soon as the balance changes.

A computer country at peace keeps a **standing army**: a quarter of its troop cap, or half the largest force of an unfriendly neighbour if that is more, times 1.5 when Wary and 2 when Threatened. It never keeps more than a share of its cap (a half, 0.7 Wary, 0.9 Threatened) or more than a share of its income can pay. Under that it calls up to 3,000 men a month where its garrisons already stand; over it, levies whose free months are over go home, smallest first. At war it calls men in every royal province it holds, up to a quarter of its cap a month, within three quarters of its income. At war or Threatened it borrows up to three months of its army's pay, and counts what lenders would give toward its war chest.

You see who fears you under **Name abroad** (*Neighbours who fear you*, with how many times their side you are), and on a country's diplomacy card a line says whether it is Wary or Threatened of you and whom else it fears. When a neighbour comes to feel Threatened by you, the news says so once.

### Each month

Answer letters from last month are delivered; envoys arriving this month have their asks counted; rebel funding is charged and the caught chance rolled; at each season's end resident ties grow and courting rolls happen; truces, passages and timed war aims expire and envoys return; the AI acts. Once a year ledgers fade, leagues are checked and relations decay.

## What you see

- **The diplomacy map mode**: every country coloured by its relation to you: your colour for you and your subjects; blue for allies and light blue for pledges; green and pale green for Close and Warm; grey for Cool or nothing recorded; orange for Cold or Rival; red for Hostile, Bitter or at war (hatched at war); a red border for a league against you. Envoys on the road appear as small riders with a dotted line, and a crossed-sword icon marks countries you hold a war aim against (regional zoom only).
- **The country diplomacy card**: their standing toward you and your stance, ties and wrongs, relations, your war aims on them, the last answer with a *Why?* button for the full reasons, and action buttons that show no prediction. In landscape it sits to the right of the map.
- **The envoy picker**: which official goes, the days on the road, and which province loses its official meanwhile.
- **The envoys strip**: each seat as free, on the road (destination and days) or resident (court).
- **The declare sheet**: the *Price of war* (who is called against you and how, the neighbours alarmed, the lords who will waver, a truce broken, your pay at war, the most one peace can take), and the aim the war is declared with (the best fitting aim you hold, or *No aim* in red), above *Confirm*; see [Warfare](Warfare#the-price-of-war).
- **Your name abroad**: your own Diplomacy tab opens with it. Any league against you comes first, with each member and its soldiers; then your **notoriety** as a word (*Trusted* under 25, *Watched* from 25, *Feared* from 50, *Hated* from 75), and your **Lands taken** in the last 20 years as a bar against the era's league threshold ("6 of 8 before a league"). Notoriety is 5 for each land taken plus notorious deeds, fading over 30 years; courts trust you less for it (less willing to ally, marry or pledge) and are readier to join a league against you. Land taken also leaves the wrong *Grabbed land near us* with the realms that border it. Every row opens its reason on a tap.
- **The war card** for each war you fight, with both sides' peace voices; see [Warfare](Warfare#the-price-of-war).
- **Answer letters**, and the country card line "Envoys n of m abroad" and "Leagues against you".

### Envoys in the game today

The first part of statecraft is in the playable build: envoys, alliances, marriages, courtesy visits and gifts. Demands, subjects and passage come next.

- **Where**: open another realm's card and its **Diplomacy** tab. At the top is what they think of you: the word (Warm, Cool and so on), the number, and every line of their ledger with its weight. Below that is your envoy on the way there, if any, and their last answer; tap **Why?** to see every reason they counted and the total.
- **Sending an envoy**: under *Send an envoy* you see how many of your envoys are free, then four missions. Each is a button with one line on what it does, or a greyed button that says why not: you are at war, an envoy is already on the way, every seat is taken, you are already allies, a subject tie, they are hostile, your houses are married already, or you lack the gold.
  - *Propose an alliance*: they say yes only if their reasons add up above nothing.
  - *Arrange a marriage*: married houses think better of each other (+15), and a marriage can bring a claim on their throne or their whole crown (see [Subjects](Subjects), personal unions).
  - *Courtesy visit*: always welcome, +15 fading over 5 years.
  - *Send a gift*: 30 gold, +30 fading over 10 years.
- **How long it takes**: the envoy rides to their capital (two days per unit of distance), stays at court a month, and the answer reaches you the month after. While he is away his seat is taken. Most realms have one seat, and one more with over 10 provinces.
- **Your own overview**: your realm card's Diplomacy tab lists your envoys abroad (where, why, and when they arrive or come home) and the last eight answers, each with its *Why?*. Answers also arrive in the News with a scroll.
- **Ending an alliance**: *End the alliance* on an ally's tab. It is an Oath broken: they remember it (−40, fading over 20 years), and other courts trust you less.
- **Courting a lord**: tap a province of another realm, open its lord from *Governed by* (*Lord*), and if he is Wavering or Disloyal, *Court him*. One of your envoys stays at his court: each season he loses a step unless his ruler wins him back, and once Disloyal for a year with land next to yours he comes over with it (his old ruler remembers *Took our land*). Each season there is 1 in 4 they find out: *Courted our lord* (−25, fading over 10 years) and your envoy comes home. Your courting envoys are listed with your envoys abroad, and *Recall your envoy* frees the seat. Realms court the lords and subjects of neighbours they hold as rivals or hostile.
- **The other realms** send envoys too: once a year each court picks the neighbour that thinks best of it and weighs an alliance and a marriage there, and sends the best ask its count says yes to, or a gift first when it is close. You see the alliances and marriages they make in the News.
- **For now** an envoy is not a named official, so no province loses its official while he is away; every realm counts two unmarried children; and the royal marriages already made on the start day count from the start. Envoys, letters and alliances are kept in your save.

### Demands in the game today

- **Where**: under the envoys on another realm's **Diplomacy** tab, *Make a demand* (not while you are at war with them).
- **What you can demand**: *Demand tribute*, or *Demand* a province of theirs on your border (one button each, their capital marked). A demand needs a reason: a war aim on them (for example, sharing a border with three times their soldiers gives you *Tribute*) or a Rival or Hostile stance toward them. If you can't, the tab says why.
- **How they answer**: your envoy carries it like any mission, and their answer comes back with a *Why?*. They start at −60 and give in only when they cannot beat you (+15 for each time over their soldiers, up to +60), minus half that if their allies would defend them, and −30 if you ask for their capital. What they think of you counts too, so a gift first can tip it.
- **If they give in**: the province is yours at once, with no war and no truce; or they become your **tributary** and send you 15 in 100 of their tax and trade every month, shown as *Tribute* in your Treasury tab and on their card. A tributary stays out of your wars; see [Subjects](Subjects) for its loyalty and the tribute level.
- **If they refuse**: you hold a war aim on them for 5 years, and a war you start over it brings their allies no call to arms. Either way they remember the threat (−15, fading over 10 years).
- **The other realms** demand too: before a realm goes to war on a neighbour it first demands tribute or a border province, and fights only if refused. For now they make demands only of each other, not of you.

## How it connects

- [Your-Realm](Your-Realm): officials, ruler, heirs, marriages, lords and their loyalty and Wants, soldiers, Oaths broken and Lands taken.
- [Provinces](Provinces): a province loses its official while he is an envoy.
- [Research](Research): G5, G8 and T14.
- [Warfare](Warfare): war aims, calls, declarations, peace voices, peace terms, truce length and held envoys.
- [Subjects](Subjects): subject records and kinds, subjects by agreement, inherited unions.
- [Troop-Movement](Troop-Movement): passage per pair and the route graph envoys travel.
- [Naval](Naval): sea travel times for envoys.
- [World-Map](World-Map): borders, neighbours and routes.
- [Trade](Trade): trade pacts, embargoes, and war stopping trade.
- [Rebellions](Rebellions): Foreign agitators and Foreign meddling, armed rebels, countries fallen to rebels.
- [Revolutions](Revolutions): funding as a revolution sign, émigré pretenders, the *Different form of rule* row.
- [Religion](Religion): same faith, hostile faiths, tolerance for marriages, persecution.
- [Culture](Culture): culture groups, homelands, accepted cultures.
- [Government](Government): the officials cap and regencies.
- [National-Strengths](National-Strengths): extra reasons, seats and unique war aims.
- [Historical-Events](Historical-Events): opinion, trust, notoriety, relations, and the new effects.
- [The 1378 Start](The-1378-Start): the 1378 relations, AI personalities, Italian states with G8.
- [Time-and-Turns](Time-and-Turns), [Map and Map Modes](Map-and-Lenses), [Screens-and-Navigation](Screens-and-Navigation): turn order, the map mode, cards and letters.

## Numbers

Every value the game uses, made from its config so it always matches the game: [Diplomacy data](Data-Diplomacy). How they combine: [Formulas](Formulas).

All numbers live in `diplomacy-rules.json` (or `relation-rules.json` for relation types) and are **placeholders**, except the answer rules, which are decided.

| Key | Value |
|---|---|
| `envoys.seats.*` | base 1; +1 above 10 provinces; G5 +1, G8 +1 |
| `envoys.lord_loyalty_step_lost_if_mission_months_over` | 12 |
| `envoys.days_per_crossing_unit`, `months_at_court` | 2, 1 |
| `envoys.instant_if_both_know` / `instant_excludes` | T14; marriage, resident |
| `envoys.official_type_bonus.*`, `years_served_bonus`, `resident_years_bonus` | +10 (gift ×1.25); +5 at 10 years; +5 at 5 years |
| `envoys.held.refused_demand_by_hostile_chance` | 0.1 |
| `ledger.max_entries_per_pair`, `ledger.stance_lines`, `ledger.standing_words` | 12; +50 … −100, −10; 100 / 30 / −29 / −99 |
| `ledger.ties.*` / `ledger.wrongs.*` | the tables above |
| `reasons.standing_divisor`, `per_oath_broken` | 4, −10 |
| `reasons.strength.*`, `distance.*`, `share_an_enemy`, `frontier_threat_per_province`, `allies_beyond_free` | as above |
| `actions.*.base` | alliance −40, calls −20/−50, marriage −15, demand −60, passage −10, trade pact −10, sworn peace −20, overlordship −80, protection −10 |
| `actions.arrange_marriage` claim chance | 0.1 |
| `actions.court_lord.*` | a step a season; 12 months; discovery 0.25 |
| `actions.fund_rebels.*` | 10/25/50 gold; caught 0.1 / 0.2 / 0.05; Punish 5 years; meddling 12 months |
| `actions.ask_passage` | 24 months |
| `actions.swear_peace.truce_months` | 120 |
| `war_aims.*` | 50 years; 5 years; ×3 soldiers; regency defensive and raid |
| `truce.*` | 60 + 60 months; white 60 |
| `leagues.*` | yearly; thresholds 8/8/8/6/6/4/4; count rows above; 2 members; dissolves below half |
| `answers.delay_months` / `preview_before_sending` | 1 / false (decided) |
| `answers.hint.likely_from` / `answers.hint.unlikely_to` | +15 / −15 (the one-word hint before asking) |
| `types.friendly.duration.decay_months` | 240 |
| `types.rival.duration.min_months_before_change` | 120 |
| `types.hostile.duration.decay_months` | 120 |
| `types.at_war.duration.war_exhaustion_peace_months` | 60 (the AI is forced to accept peace) |
| `types.truce.duration.default_months` | 60 |
| `modifiers.hostile.border_raid_chance_per_month` | 0.02 |

## Still open

Nothing. Every question is decided; numbers marked as placeholders in the data may still be tuned.

## For developers

- Spec: `domain/diplomacy/spec.md` in the game repository, requirement code **DIPL** (DIPL-001 to DIPL-194).
- Features: `domain/diplomacy/features/`, 23 files including `relation-model.feature`, `relation-actions.feature`, `envoys.feature`, `reasons-count.feature` (Hungary and Venice), `declaring-war.feature`, `leagues.feature` and `funding-rebels.feature`.
- Reference implementation of relation actions: `country-relations/tools/relations_engine.py`, with `country-relations/tests/test_rules.py` (27 tests) as the shared contract; config in `diplomacy-rules.json` and `country-relations/config/relation-rules.json`.
- Code: `packages/engine/src/domain/diplomacy/` (`rules.ts`, `dates.ts`), with numbers in `packages/rules/data/domain/diplomacy.json` and the relations at the start in `packages/rules/data/scenarios/1378/relations.json` (the 1444 checkpoint's in `scenarios/1444/relations.json`).
