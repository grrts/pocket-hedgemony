# Revolutions

Revolutions are the great upheavals that change how a country plays: the Dutch Revolt, the Glorious Revolution, the French Revolution, the Meiji Restoration and 32 more. You see one coming on a card that lists its warning signs and how to ease them, you choose how your ruler answers when it breaks out, and the outcome leaves behind a regime: a package of new rules, new buttons and actions you can no longer take.

## How it works

A revolution is not a separate event system. It is an ordinary [historical event](Historical-Events) with one extra block that holds its requirements, signs, sparks, stances and regimes. The fighting itself, when there is any, is a tagged rising handled by [Rebellions](Rebellions).

### Requirements, signs and sparks

- **Requirements** are hard conditions: who, when, and what kind of state. The French Revolution requires a monarchy. Requirements are never shown as signs. If they do not hold, you never see the card, so you are never shown a revolution that cannot happen to you. Venice, a merchant republic, never sees the French Revolution card even with debt above 2,000 gold.
- **Signs** are visible conditions, each with a label and an ease hint. A revolution needs a number of them lit to break out (`need`) and turns its card amber at a lower number (`warn_at`). The French Revolution breaks out at 4 of 6 signs and warns at 3.
- **Sparks** multiply the monthly chance once the revolution is ready. For France these are a volcanic winter (×2) and a revolution abroad that won (×1.5). Every revolution also gets the spark "Foreign gold backs the movement" (×2) while a rival is funding it.

Signs read numbers you already read elsewhere: grievances in provinces, class shares, your lords' loyalty and land, debt, stability, faith and ideology shares, and lost wars. Four conditions were added for this:

| Condition | What it measures | Example |
|---|---|---|
| grievance | The share of a country's (or area's or region's) provinces that have a given grievance | France has 10 provinces; 2 are hungry, so "hungry at least 0.2" is true, 1 would not be |
| class_share | The share of a country's people in one class (farmers, herders, woodsmen, miners, seafolk, craftsmen, market folk, clergy, clerks, scholars, homeless) | 12 % of Russians are craftsmen, so "craftsmen at least 0.1" is true |
| lords | Land share held by lords rather than officials, the number of lords Wavering or worse, Disloyal or worse, or the count | France with 10 provinces, 4 held by lords: land share 0.4 |
| war_lost | Whether a country made peace on the losing side (gave land, paid, or was made a subject) within a number of years | Russia lost and gave land 1 year ago: true within 3 years; 5 years ago: false |

The game compiles each revolution's trigger as "all requirements, plus at least `need` of the signs", and adds one selection modifier per spark, so the card and the trigger always agree. A revolution keeps the availability window of the event it extends and never happens outside its era or period window: with every sign lit in 1890, the French Revolution (available 1750 to 1880) still cannot break out. The armistices of 1918 keep their existing trigger instead of a sign checklist.

### Stages

Each revolution moves through stages for each country.

| Stage | What it means |
|---|---|
| Quiet | Requirements unmet, or no sign lit |
| Brewing | Requirements met, fewer than `need` signs lit |
| Ready | The trigger is true. The event rolls each month by its mean wait times its sparks. The card is red: "may break out any month" |
| Outbreak | The event fires with its text and stance options |
| Struggle | The option's effects apply. For Fight, a tagged rising appears on the map with its camps |
| Settlement | A banner says who won, and the won or crushed effects apply |
| Aftermath | The regime applies; waves, émigrés and reactions abroad follow |

A revolution never fires in the same month its last needed sign lights. It rolls through the normal selection from the next month on, so you always get at least a month with a red card to act. If you ease a sign so that fewer than `need` are lit, the roll stops: opening the castle stores in France so that "Bread is short in a fifth of the realm" goes dark drops it back to Brewing.

### Stances

Every revolution event offers two to four options, each tagged with a stance.

| Stance | What happens |
|---|---|
| Lead | The regime applies at once with no rising. The lords and clergy the regime hurts may rise as the old order camp. |
| Bend | A milder regime or a set of reforms applies and some signs end. If enough stay lit, the revolution comes back. |
| Fight | A rising tagged with the revolution is raised. If it wins, the option's "rising won" effects apply; if it is crushed, its "rising crushed" effects apply. A crushed rising leaves *Bloodshed* grievances and the signs stay lit, so it comes back unless you ease them. |
| Path | The event's chooser picks a path, and its regimes apply to the countries the option names. |

A regime on an option can be delayed by a number of years. Each family gives the options their labels; the liberal and national family uses "Proclaim the new order", "Grant a constitution" and "Restore order". Before the French Revolution breaks out you can open "What happens if it breaks out": "Proclaim the new order" leads to the revolutionary republic, "Grant a constitution" to crown and assembly plus emancipation, and "Restore order" to a rising that ends in the revolutionary republic if it wins or in reaction if it is crushed.

### Camps

When a Fight stance raises a rising, the family's camps decide who joins each side, replacing the rebellions join table for that rising only. The revolution camp draws from classes by a monthly join share, plus the lords and the army desertion its family names. In the old order camp, loyal lords send retinues to the ruler and clergy calm their provinces. While the revolution camp holds a province's castle, that province counts as risen. Strength, marching, sieges and melting away follow [Rebellions](Rebellions) unchanged.

Revolution camp join shares per class, per month:

| Family | Who joins |
|---|---|
| Faith | homeless 0.30, farmers 0.10, clergy 0.30, craftsmen 0.08, market folk 0.08, only of the movement's faith |
| Estates and towns | homeless 0.20, market folk 0.15, craftsmen 0.12, clerks 0.10, scholars 0.05, farmers 0.03 |
| Liberal and national | homeless 0.30, scholars 0.25, clerks 0.15, craftsmen 0.12, market folk 0.10, farmers 0.04 (0.10 if hungry) |
| Freedom | homeless 0.30, farmers 0.30, craftsmen 0.10, market folk 0.10 |
| Peasant and agrarian | homeless 0.30, farmers 0.15, herders 0.10, woodsmen 0.08, miners 0.08, craftsmen 0.04 |
| From above | none (old order: clergy 0.10, farmers 0.02) |
| Homeland | homeless 0.20, herders 0.10, woodsmen 0.08, farmers 0.06, only of the region's culture |
| War and want | homeless 0.30, craftsmen 0.20, seafolk 0.10, miners 0.15, farmers 0.08, scholars 0.10, clerks 0.05 |
| Restorations | none (the returning pretender's backers) |

Each family also has its own lords and army rules. In the faith family, lords of the movement's faith who are Wavering or worse join, and soldiers of that faith desert at 5 % a month. In war and want, soldiers mutiny at 10 % a month while war weariness is above 14.

### Stopped, not solved

A revolution stopped by Bend, by a crushed rising, or by a Path that applies no regime is re-armed. Its card stays up marked "Stopped, not solved". For a grace period of 3 years it cannot break out. After that, whenever `need` signs are lit again it can break out through the normal selection with its sparks. If the lit signs fall below `need`, it is disarmed; there is no fixed cooldown to wait out. When it returns it is the same event with the same stances, so a ruler who bent once may fight or lead the second time. A revolution that applied a regime (that won) never re-arms. A re-arming revolution may fire again even if its event is otherwise one-time.

### Regimes

A regime is the package of rules an outcome leaves behind: form of rule, ruler, lords, church, faith, tongue, levy, land, towns, trade, research, decrees, locks, grievances ended and added, flags, reactions abroad, risks and a one-line "loop" that sums up how it plays.

- **Form.** The regime sets the form of rule from the [Government](Government) forms. `keep` leaves the form as it is; `old_form` restores the form held before the last revolutionary regime, which the game remembers. A revolution can grant a form before its era. Crown and assembly gives a constitutional monarchy, or a diet monarchy if the country lacks G14 Written constitution.
- **Numbers come from the form.** A regime never sets its own caps on officials or lords.
- **One at a time.** A country holds one regime, plus add-on regimes that stack on top (emancipation).
- **Ruler.** Kept; deposed (the ruler and heirs go abroad as pretenders); replaced (the rising's leader rules); or elected.
- **Locks.** An action the regime takes away shows greyed out with "Locked by the revolution". The lockable actions are grant fief, sell title, seize land, call the lords, hire companies, crushing taxes, revoke charter, massacre and persecute.
- **Grievances.** A regime ends some grievances and adds others. A revolutionary republic ends *Harsh lord* and *Wrong faith* and adds *Broken charter*.
- **Flags.** `revolutionary_regime`, `emigre_court` and `reaction_regime` are set by regimes; the first is cleared when another regime replaces it.
- **Reaction.** While a country holds the reaction regime, the revolution needs one sign fewer for 20 years.

The 33 regimes:

| Regime | Form | Ruler | Decrees | Risk in short |
|---|---|---|---|---|
| League of the faithful | holy rule | replaced | call the faithful | wars of conquest need half the temple elders |
| Order state | holy rule | replaced | convert by decree | a lost battle the ruler leads makes every chief waver |
| Reformist caliphate | holy rule | replaced | appoint a governor, call the faithful | far governors drift after 30 years |
| Heavenly kingdom | holy rule | replaced | sacred treasury, open the granaries | a split roll each decade |
| Mahdiyya | holy rule | replaced | call the faithful, sacred treasury, gather the tribes | the Mahdi may die; famine risk doubles |
| Town league | diet monarchy | kept | ask the towns, call the assembly | towns refuse far wars |
| Estates republic | merchant republic | elected | sell bonds, charter a company, ask the towns | a stadholder event |
| Commonwealth | constitutional republic | deposed | army council, sell church lands | generals ×2; the Protector may end it |
| Crown and assembly | constitutional monarchy (diet monarchy before G14) | kept | call the assembly, sell bonds | 3 refused votes in 10 years: a coup |
| Court absolutism | absolute monarchy | kept | summon to court, intendants | a child ruler or regency sparks a lords' rising |
| Princes' compact | elective monarchy | kept | none | any crisis is a lords' rising |
| Federal republic | constitutional republic | elected | call the assembly, open the frontier | a separatist sign from one region's wares |
| Revolutionary republic | constitutional republic | deposed | levy en masse, sell church lands, revolutionary tribunal | generals ×2 |
| Free republic | constitutional republic | replaced | arm the people, divide the estates | trade income halves while unrecognised |
| Creole republic | constitutional republic | elected | general's pact, call the assembly | a general seizes the presidency |
| Parliamentary republic | constitutional republic | deposed | call the assembly, sell bonds | extremist risings in a crisis |
| Committee rule | constitutional monarchy with an army power base | kept | officers to the provinces, call the assembly | other tongues' separatist signs come faster |
| Warlord republic | constitutional republic | elected | buy a warlord, general's pact | warlords fight each other |
| Secular republic | party state | elected | script and schools, sell church lands | a faith rising sign for 20 years |
| Agrarian reform | keep | kept | divide the estates | landowners fund risings for 20 years |
| New dynasty | keep | replaced | open the granaries | old heirs are pretenders for 50 years |
| Peasant directorates | keep | kept | local directorates | dissolving leaves *Broken charter* in every risen province |
| Emancipation (add-on) | none | none | none | lords waver one step at once |
| Swarajya | household realm | replaced | protection tribute, garrison hill forts | may become a confederation |
| Khalsa raj | absolute monarchy | replaced | hire drill masters, summon to court | councils may rule at the ruler's death |
| Misl confederacy | confederation | elected | protection tribute | 10 years without war: a chief may turn Disloyal |
| Service state | absolute monarchy | kept | ranks for service, missions abroad | an old-order rising within 10 years |
| Restoration state | constitutional monarchy | kept | abolish domains, missions abroad | retainers rise once within 10 years |
| Military kingdom | keep | kept | call the age regiment | discontent in a long peace |
| Regional armies | keep | kept | raise a provincial army | governors become warlords |
| Soviet state | party state | deposed | requisition grain, revolutionary tribunal, levy en masse, divide the estates | civil war; famine if requisition meets a failed harvest |
| Reaction | keep | kept | censorship | revolution needs one sign fewer for 20 years |
| Restored monarchy | the old form | replaced | none | revoking charters can re-fire the revolution |

The locks, grievance changes, flags, reactions abroad and the full lords, church, faith, tongue, levy, land, towns, trade and research lines of each regime are in the data.

### Decrees

Each decree a regime unlocks becomes one button on the country card or a province card, with a cost and a limit. Every decree costs something you feel (stability, a grievance, a lord turning Disloyal, scholars fleeing). A decree is a trade-off, not a free bonus.

| Decree | Card | Cost | Limit |
|---|---|---|---|
| Call the faithful | country | 1 stability | once every 5 years |
| Convert by decree | province | gold by the province's people | one province at a time |
| Appoint a governor | province | a gold gift | when a governor dies or is removed |
| Sacred treasury | country | each province's surplus food | each harvest |
| Open the granaries | province | castle store food | any time |
| Ask the towns | country | a town charter promise | once every 3 years |
| Call the assembly | country | one season | any time |
| Sell bonds | country | interest each year | up to the loan limit |
| Charter a company | country | gold and two merchants | one per ocean |
| Army council | country | none | any time |
| Sell church lands | country | clergy and Pious lords waver | once |
| Levy en masse | country | *Conscription* everywhere for 3 years | while at war |
| Revolutionary tribunal | country | *Bloodshed* in the provinces of those tried | any time |
| Arm the people | country | tools and old weapons only | defensive wars |
| Divide the estates | province | the lord or owner turns Disloyal | one province a season |
| Open the frontier | country | Indigenous homelands get *Foreign rule* and a resistance | any time |
| General's pact | country | provinces granted | any time |
| Summon to court | country | gold for the court each year | any time |
| Intendants | province | an official's wage | one per lord |
| Censorship | country | scholars −10 % a year while on | toggle |
| Local directorates | province | no tax rise there | risen provinces only |
| Abolish domains | country | pensions: each lord's yearly income for 20 years | once |
| Missions abroad | country | gold and two scholars | once every 10 years |
| Ranks for service | country | none | toggle |
| Call the age regiment | country | births −10 % while serving | one age set at a time |
| Officers to the provinces | country | commanders taken from the army | any time |
| Buy a warlord | country | gold by the warlord's army | any time |
| Requisition grain | country | *Requisitioned* in every farming province | each harvest |
| Script and schools | country | research −25 % for 5 years | once |
| Raise a provincial army | province | the official becomes a lord with a retinue | any time |
| Gather the tribes | province | the province loses a third of its people; its lord's retinue moves | once every 5 years |
| Protection tribute | province | the owner's opinion −20 | neighbouring provinces only |
| Garrison hill forts | province | gold for each fort's three officers | hill and mountain provinces |
| Hire drill masters | country | gold each year; Proud lords waver | up to 3 at once |

### Aftermath

**Waves.** A won revolution spreads its family's idea.

| Family | Wave |
|---|---|
| Estates and towns | parliamentarism +0.03 to neighbours |
| Liberal and national | liberalism +0.05 to neighbours |
| Freedom | abolitionism +0.10 to the region |
| Faith | a faith wave (0.05, neighbours) through [Religion](Religion) |
| War and want | socialism +0.05 to the region |
| Peasant and agrarian | *Neighbour in revolt* grievances in neighbours |
| Homeland | *Foreign rule* grievances in neighbouring provinces held by distant empires |
| From above, Restorations | none |

**Émigré courts.** When a regime deposes the ruler, the old dynasty lives on abroad as a pretender. Rivals can fund it, and it is who the restoration event looks for.

**Counter-revolution.** When a regime's reaction abroad names it, monarchies get an opinion malus and a reason to fight for a number of years (revolutionary republic: −50 and 25 years), through [Diplomacy](Diplomacy)'s "Different form of rule −20" reason and a counter-revolution war reason.

**Generals.** In a republic born in revolution whose risk says so, the chance of a general growing too big doubles ([Warfare](Warfare)). A winning general can switch the regime to court absolutism or a military kingdom.

**Restoration.** When signs such as a lost war, broken charters or a weak regime add up in a country with an émigré court, the restoration of the old order can fire, bringing back the old form and clearing the revolutionary flags.

### Funding a revolution abroad

You can secretly fund a revolution in another country when its card there is at least Brewing; you only see that card where you have a diplomat. While you fund it:

- you pay gold every month, 1 % of the target's yearly income;
- the target gets the "Foreign gold backs the movement" spark (×2), and if it becomes a rising, its camp's join shares are multiplied by 1.5;
- each month there is a 3 % chance you are caught, plus 1 % while the target is at peace and 1 % more if officials run at least half of its provinces.

This is the same *Fund rebels* action diplomacy offers; there is only one.

If you are caught, the funding ends, the target gets the opinion reason "Funded a revolution against us" and a reason to fight you, and the card names you. If a funded revolution wins, the new regime starts at +25 opinion of you, unless it is hostile to your form of rule.

### The 36 revolutions

Each revolution belongs to one of 9 families and inherits its cause, camps, stance labels and wave, which it can override. Its country is bound through the event's role selector, so another country that fits can get the card instead. If its signs never light within its window, it never fires: history is not forced. Ordinary peasant risings, pretender wars and separatist revolts stay in [Rebellions](Rebellions), reforms without a struggle are ordinary events, and coups belong to [Warfare](Warfare).

| Revolution | Years | Family | Breaks out at |
|---|---|---|---|
| The Kaga league | 1488 to 1580 | Faith | 3 of 5 |
| Rise of the Safavids | 1501 to 1510 | Faith | 3 of 5 |
| Founding of the Khalsa | 1699 | Faith | 2 of 5 |
| Futa Jallon jihad | 1725 to 1750 | Faith | 2 of 3 |
| Sokoto jihad | 1804 to 1812 | Faith | 3 of 5 |
| Taiping Rebellion | 1850 to 1864 | Faith | 3 of 5 |
| Mahdist state in Sudan | 1881 to 1898 | Faith | 3 of 5 |
| Revolt of the Comuneros | 1520 to 1521 | Estates and towns | 3 of 5 |
| Dutch Revolt | 1568 to 1648 | Estates and towns | 2 of 5 |
| Wars of the Three Kingdoms | 1639 to 1651 | Estates and towns | 3 of 5 |
| The Fronde | 1648 to 1653 | Estates and towns | 3 of 6 |
| Glorious Revolution | 1688 to 1689 | Estates and towns | 2 of 3 |
| Restoration of the Stuart monarchy | 1660 | Restorations | 2 of 3 |
| American Revolution | 1775 to 1783 | Liberal and national | 3 of 6 |
| French Revolution | 1789 to 1799 | Liberal and national | 4 of 6 |
| Spanish American wars of independence | 1810 to 1826 | Liberal and national | 1 of 4 |
| Revolutions of 1848 | 1848 to 1849 | Liberal and national | 2 of 4 |
| Iranian constitutional revolution | 1905 to 1911 | Liberal and national | 3 of 5 |
| Young Turk Revolution | 1908 | Liberal and national | 1 of 3 |
| Xinhai Revolution | 1911 to 1912 | Liberal and national | 3 of 4 |
| Egyptian revolution of 1919 | 1919 to 1922 | Liberal and national | 3 of 5 |
| Haitian Revolution | 1791 to 1804 | Freedom | 1 of 4 |
| Shivaji's coronation | 1674 | Homeland | 2 of 5 |
| Ranjit Singh's Sikh Empire | 1799 to 1849 | Homeland | 2 of 5 |
| Fall of Beijing and the Qing conquest | 1644 | Peasant and agrarian | 3 of 5 |
| The Tay Son uprising | 1771 to 1802 | Peasant and agrarian | 3 of 5 |
| The Donghak peasant revolution | 1894 to 1895 | Peasant and agrarian | 3 of 5 |
| Mexican Revolution | 1910 to 1920 | Peasant and agrarian | 2 of 3 |
| Petrine reforms | 1689 to 1725 | From above | 1 of 4 |
| Rise of the Zulu kingdom | 1816 to 1828 | From above | 1 of 2 |
| Meiji Restoration | 1867 to 1871 | From above | 3 of 4 |
| The Kemalist reforms | 1922 to 1934 | From above | 2 of 3 |
| The revolution of 1905 | 1905 to 1907 | War and want | 3 of 6 |
| Russian Revolution | 1917 | War and want | 3 of 5 |
| Armistices of 1918 | 1918 | War and want | its existing trigger |
| Restoration of the old dynasty | 1660 to 1815 | Restorations | 2 of 5 |

Ten of these are new events (the Kaga league, the Comuneros, the Fronde, the Iranian and Egyptian revolutions, Tay Son, Donghak, the Kemalist reforms, 1905 and the restoration of the old dynasty); the other 26 extend events already in the tree.

The family stance labels (lead / bend / fight):

| Family | Labels |
|---|---|
| Faith | Take up the new teaching / Tolerate the movement / Suppress it |
| Estates and towns | Share power / Grant charters / Break them |
| Liberal and national | Proclaim the new order / Grant a constitution / Restore order |
| Freedom | Abolish and free / Grant autonomy / Send an army |
| Peasant and agrarian | Divide the land / Cut taxes and open the granaries / Crush the bands |
| From above | Start the reforms / Reform the army only / Keep the old ways |
| Homeland | Grant the region its own crown / Give its leader high rank / Send the imperial army |
| War and want | Hand power to the councils / Promise an assembly / Send in the troops |
| Restorations | Recall the dynasty / Restore with a charter / Defend the revolution |

### The computer

- When its card is amber or red, a computer country eases signs using their ease hints, choosing by personality: a pious ruler eases faith signs first, a miserly one avoids cutting taxes.
- When a revolution fires, it weights historical options ×3, Fight by its army strength against the rising's expected size, and Lead higher when the ruler's ideology matches the cause.
- A computer country with an émigré court that is a rival of the revolutionary state funds its pretender abroad.
- A computer monarchy stronger than a revolutionary state uses the counter-revolution reason.
- It funds revolutions in non-allied rivals whose cards are amber or red.

## What you see

- **The revolution card** on the country screen, about 40 characters wide to fit a phone. For France in 1789 it reads "FRENCH REVOLUTION", brewing, "Breaks out at 4 of 6 signs", with the lit signs first ("Debt above 2,000 gold", "A quarter want a constitution", "The crown is distrusted"), each with how to ease it ("Cut court and army; tax lords"), and the sparks with their multipliers. The bar is neutral, amber at `warn_at` and red at `need`.
- **"What happens if it breaks out"** opens the stances and the regime each leads to.
- **Banners.** When a revolution breaks out or ends in another country, a one-line banner ("Revolution in France: the Bastille has fallen") appears, but only for neighbours, rivals and Great Powers. Tapping it opens that country's card.
- **The revolution lens** shades provinces by how many of the revolution's province-level signs they meet and hatches risen provinces in the revolution's colour.
- **The regime card** on the government screen shows the regime's loop line, its decrees as buttons and its locks greyed out.

### In the game today

The 36 historical revolutions read ideologies, legitimacy and ages the game does not track yet, so the first slice gives every realm one revolution of its own, built from the two oldest families. A monarchy with no hunger has an **Estates and towns** revolution (as the Fronde and the Comuneros); a realm that is hungry, or not a monarchy, has a **Peasant and agrarian** one (as the Tay Son and Donghak risings).

- **Signs** (3 of 6 to break out, amber at 2): *Heavy taxes* in a quarter of the realm; *Hungry* in a fifth; a tenth rioting or plotting; two or more lords Wavering or worse; debt above a year's income; rebels holding your land, or rebels who won against you in the last 5 years. Under the reaction regime one sign fewer is enough, for 20 years.
- **Breaking out**: a red card breaks out on a roll of 1 in 12 a month, 1 in 6 while two or more lords are Disloyal, never in the month it turned red and never within 3 years of the last revolution, Bend or crushed rising.
- **Where you see it**: the Stability plaque in the top bar carries a mark while a revolution brews (amber) or may break out (red); tap it for the General tab, where the Revolution block under the four pillars lists the lit signs first, each with a button to the tab that eases it, and folds out what each answer would do.
- **When it breaks out**: a full-screen card asks how you answer, and End turn waits for it.
  - Estates: **Share power** makes you a diet monarchy (League of towns, crushing taxes locked); **Grant charters** fixes the tax at light for 10 years wherever it is heavy, and the revolution is stopped, not solved; **Break them** raises a town rising in your most restless province.
  - Agrarian: **Divide the land** (Land to the villages: no more fiefs granted, every lord loses a loyalty step); **Cut taxes and open the granaries** (light tax for 10 years where it is heavy, castle granaries opened where people are hungry; stopped, not solved); **Crush the bands** raises a hunger rising.
- **The struggle**: the rising plays as any other on the map. If it wins, an estates revolution makes you a merchant republic with an elected ruler; an agrarian one puts the rising's leader on your throne, your house goes abroad as pretenders, every lord wavers and tax stays light for 10 years. If it is beaten, starves or is bribed away, the Reaction follows: bloodshed where they rose, and the revolution comes back sooner. If you grant or talk out its demand, it is stopped, not solved.
- **Rebels who win**: an ordinary rising that wins against you lights the rebels sign, and if your card is then red, or the rebels took your capital's castle, the revolution has won at once.
- **Government tab**: the regime under your form, its loop line and since when, your ruler, the form before the revolution, and its locks greyed out. Locked orders are refused with "locked by the revolution".
- **Other realms**: computer realms go through the same rules and pick Fight, Bend or Lead by weight, Fight more often when their armies outnumber the rising. A neighbour's revolution is a line in your Dispatches.

## How it connects

- [Historical events](Historical-Events): revolutions are events; this adds four conditions, the regime and lock effects, two new effect tiers and four flags (not merged yet).
- [Rebellions](Rebellions): Fight raises a tagged rising; camps replace the join table; won and crushed hooks.
- [Government](Government): regimes set forms, in any era, and restore the old form.
- [Diplomacy](Diplomacy): "Different form of rule", the counter-revolution reason, and the funding action.
- [Subjects](Subjects): settler colonies going independent through a Disloyal colony.
- [Culture](Culture): nationalism thresholds read by liberal and national signs; regimes can set the court tongue.
- [Religion](Religion): the faith wave, and church events that follow a revolutionary regime.
- [National strengths](National-Strengths): a won revolution may shed a burden or grant a legacy (a hook only).
- [Warfare](Warfare): generals growing too big, and a winning general switching the regime.
- [Provinces](Provinces): grievances and class shares feed the signs; regimes end and add grievances.
- [Your realm](Your-Realm): lords' loyalty and land, stability and debt; locks on fiefs and titles.
- [Research](Research): G14 Written constitution decides the crown and assembly form.
- [Map and lenses](Map-and-Lenses): the revolution lens.
- [Screens and navigation](Screens-and-Navigation): banner, card and regime card.
- [Music and sound](Music-and-Sound): the revolution music tag.

### Each month

The game evaluates requirements and signs for every revolution and country and sets stages and card colours; for Ready revolutions the events system rolls the selection; re-arm grace periods tick; funding is charged and the caught chance is rolled; delayed regimes apply; decree limits tick.

## Numbers

Every balance value here is a provisional placeholder.

| Key | Value |
|---|---|
| `revolutions.<id>.signs.need` | per revolution (the "breaks out at" column) |
| `revolutions.<id>.signs.warn_at` | per revolution |
| `revolutions.<id>.sparks[].mult` | per revolution |
| Event `selection.mean_years` | per event |
| `rearm.grace_years` | 3 years |
| `families.<id>.camps.revolution.joins` | the join table above |
| `families.<id>.wave.amount` | the wave table above |
| `counter_revolution.years` | 25 years (proposed) |
| `counter_revolution.opinion` | −50 (proposed) |
| `generals.too_big_mult` | ×2 (proposed) |
| `emigre.funding_per_year` | not given yet |
| `foreign_backing.mult` | 2 |
| `foreign_backing.joins_mult` | 1.5 |
| `foreign_backing.cost` | 1 % of the target's yearly income a month |
| `foreign_backing.catch_chance` | 3 % a month |
| `foreign_backing.win_opinion` | +25 |
| `reaction.need_reduction` | 1 sign for 20 years |

## Settled details

- A revolution's rising starts as a rising, not a great revolt. Its size comes from the event and the province's recruits, split between the camps.
- Signs read real numbers: debt in gold, grievance counts, lords' loyalty and school seats. "Integration strain" is the share of your provinces with *Foreign rule*.
- American-style colony revolutions read whether the colony is disloyal to its overlord.
- Regimes do not grant or remove national strengths.
- Counter-revolution: monarchies' opinion falls by 50 and they hold a reason to fight for 25 years, unless the regime sets its own values. It replaces the usual "different form of rule" penalty instead of adding to it.
- Restorations happen only through their own events: the restoration of the old order (1660 to 1815) and the émigré events.
- A wave is a one-off change in the realms bordering the revolution's country and in its region. Faith waves use religion's faith wave.
- When a revolution sets a regime, the regime decides the form of rule. Crown and assembly keeps its form later on.
- The armistices of 1918 are one-time events with no revolution card.
- A decree whose cost is part of its effect shows that effect as its cost.
- Revolutions "from above" are decisions you are offered; nobody rises.
- The catch-chance additions for peace and officials are provisional and may still be tuned.

## Still open

- Seven new historical sources still need to be checked by a person.

## For developers

- Spec: [`domain/revolutions/spec.md`](https://github.com/grrts/pocket-hedgemony/blob/claude/domain-specs-bdd-ebdpmx/domain/revolutions/spec.md).
- Features: `domain/revolutions/features/` (revolution-card, stages, signs-and-trigger, stances, camps, rearm, regimes, decrees, aftermath, funding-abroad, catalogue, revolution-ai, revolution-ui, data-build).
- Code: `packages/engine/src/domain/revolutions/`, with its numbers in `packages/rules/data/domain/revolutions.json`.
- Data lives in the revolutions design (`revolutions/data/`: families, reference, decrees, regimes, revolutions, additions). The offline build validates the layer, merges it into a scratch copy of the event tree, runs the event tree validator, and writes the catalogue, runtime JSON and the event tree patch without ever editing the tree itself. Current result: 0 layer errors; the merged tree has 0 errors and the same 21 warnings.
