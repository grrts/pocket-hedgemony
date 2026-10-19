# Everyday events data

Every value in the game's everyday events config, exactly as the game reads it. This page is made from `packages/rules/data/domain/events-everyday.json` each time the config changes, so it always matches the game. How these values are used is explained on [Historical Events](Historical-Events).

Keys are written as in the config file. Shares are fractions (0.25 is 25 %), and values marked (provisional) are placeholders that may still change in balancing. Inventions are shown by id and name; see [Research data](Data-Research#inventions).

> Everyday events (domain/events/spec.md §5.22, EVT-115 to EVT-128; feedback 152). Small choices about the realm's own people and stores, drawn from what the game already holds: its officials, lords, ruler and heir, and food stores, and plague reaching a province of the player's (EVT-130: not drawn; plague fires it). Each realm draws one every \`months\_between\` months (a range), never while the player has an event waiting; the player's realm never draws the same event again within \`rest\_years\` (EVT-134). \`where\` limits an event to realms in those regions or wider regions (exploration-regions.json), \`from\` and \`to\` to those years (EVT-133). \`weight\` is how often an event is drawn among the ones that can happen; \`needs\` names what it is about. Options list their effects in the engine's small vocabulary (gold, loyalty, official, lands, heir, heir\_risk, food\_back, new\_lord, quarantine, care; and for an event about a province, EVT-135: food in months of eating, people and recruits as a share, light\_tax in years); \`ai\` weights the AI's pick; \`needs\` on an option hides it when the realm lacks what it asks. \`{words}\` in braces are filled with the names of who and where. Every number is a placeholder for balance.

| Key | Value |
|---|---|
| `months_between` | 2, 4 |
| `rest_years` | 20 |
| `first_within_months` | 4 |

## Food

| Key | Value |
|---|---|
| `min_store_months` | 3 |
| `min_store` | 2 |

## Events

### Official dies

| Key | Value |
|---|---|
| `weight` | 2 |
| `needs` | official |
| `title` | Death of {official} |
| `text` | {official}, your {type} at {province}, has died after {years} years in the post. His clerks wait to hear who will take his seat. |

#### Options

| id | name | ai | effects | needs |
|---|---|---|---|---|
| deputy | Raise his deputy | 3 | (official: new) |  |
| seasoned | Send for a seasoned man | 1 | (gold: -25), (official: seasoned) |  |
| kin | Give the post to {lord2}'s kinsman | 2 | (official: new), (loyalty: office\_at\_court; who: lord2) | lord2 |

### Lord dies

| Key | Value |
|---|---|
| `weight` | 2 |
| `needs` | lord |
| `title` | Death of {lord} |
| `text` | {lord} of the house of {house} has died. His son {son} asks you to confirm him in his father's lands ({lands}). |

#### Options

| id | name | ai | effects |
|---|---|---|---|
| confirm | Confirm {son} | 4 | (new\_lord: yes) |
| relief | Ask a fee for his lands | 2 | (new\_lord: yes), (gold: 20), (loyalty: heavy\_taxes; who: lord) |
| take | Take his lands for the crown | 1 | (lands: crown), (loyalty: land\_seized\_from\_another; who: other\_lords) |

### Lord slighted

| Key | Value |
|---|---|
| `weight` | 2 |
| `needs` | lord\_not\_disloyal |
| `title` | {lord} feels slighted |
| `text` | {lord} of the house of {house} was seated below a lesser man at your table, and talks against you in his hall. |

#### Options

| id | name | ai | effects | needs |
|---|---|---|---|---|
| gift | Send him a gift | 2 | (gold: -10) |  |
| office | Give him an office at court | 2 | (loyalty: land\_seized\_from\_another; who: lord2) | lord2 |
| ignore | Let him sulk | 1 | (loyalty: slighted\_at\_court; who: lord) |  |

### Lord praises

| Key | Value |
|---|---|
| `weight` | 2 |
| `needs` | lord\_not\_loyal |
| `title` | {lord} speaks well of you |
| `text` | {lord} of the house of {house} has been heard praising your rule in his hall. A word from you now could win him over. |

#### Options

| id | name | ai | effects |
|---|---|---|---|
| reward | Reward him with gold | 3 | (gold: -10), (loyalty: gift\_of\_gold; who: lord) |
| thank | Thank him | 1 | none |

### Lords quarrel

| Key | Value |
|---|---|
| `weight` | 2 |
| `needs` | two\_lords |
| `title` | {lord} and {lord2} quarrel |
| `text` | {lord} and {lord2} both claim a mill and its meadows on the edge of their lands, and each asks you to judge for him. |

#### Options

| id | name | ai | effects |
|---|---|---|---|
| first | Judge for {lord} | 2 | (loyalty: want\_granted; who: lord), (loyalty: land\_seized\_from\_him; who: lord2) |
| second | Judge for {lord2} | 2 | (loyalty: want\_granted; who: lord2), (loyalty: land\_seized\_from\_him; who: lord) |
| fine | Fine them both and keep the mill | 1 | (gold: 15), (loyalty: heavy\_taxes; who: lord), (loyalty: heavy\_taxes; who: lord2) |

### Lord hurt

| Key | Value |
|---|---|
| `weight` | 1 |
| `needs` | lord |
| `title` | {lord} is hurt |
| `text` | {lord} of the house of {house} fell from his horse while hunting and lies in his hall with a broken leg. |

#### Options

| id | name | ai | effects |
|---|---|---|---|
| physician | Send your own physician | 2 | (gold: -10), (loyalty: gift\_of\_gold; who: lord) |
| prayers | Send your prayers | 2 | none |

### Child born

| Key | Value |
|---|---|
| `weight` | 2 |
| `needs` | ruler\_fertile |
| `title` | A child is born |
| `text` | A {child} is born to {ruler}, and named {childName}. The bells ring in every town of the realm. |

#### Options

| id | name | ai | effects | needs |
|---|---|---|---|---|
| feast | Hold a great feast | 2 | (heir: child), (gold: -15), (loyalty: gift\_of\_gold; who: least\_loyal\_lords; count: 2) |  |
| match | Promise the child to {lord2}'s house | 2 | (heir: child), (loyalty: marriage\_into\_ruling\_house; who: lord2) | lord2 |
| quiet | Give thanks quietly | 1 | (heir: child) |  |

### Heir ill

| Key | Value |
|---|---|
| `weight` | 1 |
| `needs` | young\_heir |
| `title` | {heir} falls ill |
| `text` | Your heir {heir}, aged {heirAge}, is burning with fever. The court physicians shake their heads. |

#### Options

| id | name | ai | effects |
|---|---|---|---|
| doctors | Pay the best physicians | 3 | (gold: -20) |
| pray | Trust in prayer | 1 | (heir\_risk: 0.3) |

### Grain rots

| Key | Value |
|---|---|
| `weight` | 2 |
| `needs` | store |
| `loss` | 0.4 |
| `title` | Grain rots at {province} |
| `text` | Damp has got into the granaries at {province}. The keepers have thrown out {loss} months of grain. |

#### Options

| id | name | ai | effects | needs |
|---|---|---|---|---|
| buy | Buy grain from merchants | 2 | (gold: -15), (food\_back: 0.5) |  |
| requisition | Take grain from {lord2}'s barns | 1 | (food\_back: 0.5), (loyalty: grain\_requisitioned; who: lord2) | lord2 |
| bear | Bear the loss | 2 | none |  |

### Granary fire

| Key | Value |
|---|---|
| `weight` | 1 |
| `needs` | store |
| `loss` | 0.5 |
| `title` | Fire in the granary at {province} |
| `text` | A fire in the night has burned half of {province}'s granary: {loss} months of grain are lost. |

#### Options

| id | name | ai | effects | needs |
|---|---|---|---|---|
| buy | Buy grain from merchants | 2 | (gold: -20), (food\_back: 0.5) |  |
| requisition | Take grain from {lord2}'s barns | 1 | (food\_back: 0.5), (loyalty: grain\_requisitioned; who: lord2) | lord2 |
| bear | Bear the loss | 2 | none |  |

### Plague reaches

| Key | Value |
|---|---|
| `weight` | 0 |
| `needs` | plague |
| `title` | Plague at {province} |
| `text` | Men are falling sick at {province}: fever, black swellings, death in three days. The townsfolk die first. What will you do? |

#### Options

| id | name | ai | effects |
|---|---|---|---|
| close | Close the province | 1 | (quarantine: yes) |
| physicians | Send physicians and burn the sick houses | 1 | (gold: -20), (care: yes) |
| open | Keep the roads open | 1 | none |

### Rats

| Key | Value |
|---|---|
| `weight` | 1 |
| `needs` | store |
| `loss` | 0.3 |
| `title` | Rats in the stores at {province} |
| `text` | Rats have overrun the stores at {province} and spoiled {loss} months of grain. |

#### Options

| id | name | ai | effects |
|---|---|---|---|
| buy | Buy grain from merchants | 2 | (gold: -10), (food\_back: 0.5) |
| bear | Bear the loss | 2 | none |

### Good harvest

| Key | Value |
|---|---|
| `weight` | 2 |
| `needs` | province |
| `title` | A rich harvest at {province} |
| `text` | The barns at {province} are full to the rafters, and the reeves say they have not seen such a year in living memory. |

#### Options

| id | name | ai | effects | needs |
|---|---|---|---|---|
| store | Fill the granaries | 2 | (food: 2) |  |
| sell | Sell the surplus | 2 | (gold: 15) |  |
| feast | Give a harvest feast | 1 | (food: 1), (loyalty: gift\_of\_gold; who: lord2) | lord2 |

### Hail

| Key | Value |
|---|---|
| `weight` | 1 |
| `needs` | province |
| `title` | Hail at {province} |
| `text` | A storm of hail has flattened the standing corn at {province}. The villagers ask how they are to pay this year's tax. |

#### Options

| id | name | ai | effects |
|---|---|---|---|
| remit | Lighten their tax for a year | 2 | (light\_tax: 1) |
| grain | Send them grain | 1 | (gold: -15), (food: 1) |
| nothing | The tax stands | 1 | (people: -0.01) |

### Bandits

| Key | Value |
|---|---|
| `weight` | 2 |
| `needs` | province |
| `title` | Bandits near {province} |
| `text` | A band of outlaws holds the woods on the road to {province}. Carters go armed, and some no longer go at all. |

#### Options

| id | name | ai | effects | needs |
|---|---|---|---|---|
| hunt | Send men to hunt them down | 2 | (gold: -10), (recruits: -0.1) |  |
| lord | Ask {lord2} to clear the road | 2 | (loyalty: want\_granted; who: lord2), (people: -0.005) | lord2 |
| ignore | Leave them be | 1 | (people: -0.015) |  |

### Bridge falls

| Key | Value |
|---|---|
| `weight` | 1 |
| `needs` | province |
| `title` | The bridge at {province} falls |
| `text` | Spring floods have carried away the old bridge at {province}. Traders now wait days for the ferry. |

#### Options

| id | name | ai | effects |
|---|---|---|---|
| stone | Build it again in stone | 2 | (gold: -25), (people: 0.01) |
| ferry | Make do with the ferry | 1 | (people: -0.01) |

### Town fire

| Key | Value |
|---|---|
| `weight` | 1 |
| `needs` | province |
| `title` | Fire in {province} |
| `text` | A fire that began in a baker's oven has burned a whole quarter of the town of {province}. |

#### Options

| id | name | ai | effects |
|---|---|---|---|
| stone | Rebuild in stone, at your cost | 1 | (gold: -25), (people: 0.005) |
| relief | Feed the homeless | 2 | (gold: -10), (people: -0.01) |
| leave | Let the townsfolk rebuild | 1 | (people: -0.02) |

### Flood

| Key | Value |
|---|---|
| `weight` | 1 |
| `needs` | province |
| `title` | The river floods at {province} |
| `text` | The river has burst its banks at {province}, drowning fields and filling cellars with mud. |

#### Options

| id | name | ai | effects |
|---|---|---|---|
| dykes | Pay for new dykes | 2 | (gold: -20), (food: -0.5) |
| wait | Wait for the waters to fall | 2 | (food: -1), (people: -0.005) |

### Scholar

| Key | Value |
|---|---|
| `weight` | 1 |
| `needs` | capital |
| `title` | A scholar comes to court |
| `text` | A learned man, driven from his own land, asks leave to teach at {province} under your protection. |

#### Options

| id | name | ai | effects |
|---|---|---|---|
| patron | Become his patron | 1 | (gold: -20), (people: 0.01) |
| refuse | Send him on his way | 2 | none |

### Market charter

| Key | Value |
|---|---|
| `weight` | 2 |
| `needs` | lord\_land |
| `title` | {lord} asks for a market |
| `text` | {lord} of the house of {house} asks your leave to hold a weekly market at {province}, and to take its tolls. |

#### Options

| id | name | ai | effects |
|---|---|---|---|
| grant | Grant the charter | 3 | (loyalty: want\_granted; who: lord), (people: 0.01) |
| crown | Hold the market for the crown | 1 | (gold: 10), (loyalty: slighted\_at\_court; who: lord) |
| refuse | Refuse | 1 | (loyalty: slighted\_at\_court; who: lord) |

### Walls without leave

| Key | Value |
|---|---|
| `weight` | 1 |
| `needs` | lord\_land |
| `title` | {lord} raises walls |
| `text` | {lord} of the house of {house} is building walls and towers at {province} without asking your leave. |

#### Options

| id | name | ai | effects |
|---|---|---|---|
| allow | Let him build | 2 | (loyalty: want\_granted; who: lord) |
| fine | Fine him for it | 1 | (gold: 15), (loyalty: heavy\_taxes; who: lord) |
| pull\_down | Order them pulled down | 1 | (loyalty: slighted\_at\_court; who: lord) |

### Skimming official

| Key | Value |
|---|---|
| `weight` | 1 |
| `needs` | official |
| `title` | Your official at {province} is skimming |
| `text` | Merchants complain that {official}, your {type} at {province}, keeps back part of the tolls for himself. |

#### Options

| id | name | ai | effects |
|---|---|---|---|
| dismiss | Dismiss him | 1 | (official: new) |
| fine | Make him pay it back | 2 | (gold: 15) |
| ignore | Look the other way | 1 | (people: -0.01) |

### Veterans

| Key | Value |
|---|---|
| `weight` | 1 |
| `needs` | province |
| `title` | Old soldiers at {province} |
| `text` | Old soldiers with nowhere to go have gathered at {province}, asking for land to farm. |

#### Options

| id | name | ai | effects |
|---|---|---|---|
| land | Give them land | 2 | (gold: -10), (recruits: 0.15) |
| send\_away | Send them away | 1 | (people: -0.005) |

### Wolves

| Key | Value |
|---|---|
| `weight` | 1 |
| `needs` | province |
| `title` | Wolves at {province} |
| `text` | A hard winter has driven wolves down from the hills at {province}. They take sheep, and a shepherd boy is missing. |

#### Options

| id | name | ai | effects | needs |
|---|---|---|---|---|
| bounty | Pay a bounty on every pelt | 2 | (gold: -5) |  |
| hunt | Ask {lord2} to hunt them | 2 | (loyalty: want\_granted; who: lord2) | lord2 |
| ignore | Let the shepherds deal with it | 1 | (food: -0.5) |  |

### Tutor

| Key | Value |
|---|---|
| `weight` | 1 |
| `needs` | young\_heir |
| `title` | A tutor for {heir} |
| `text` | Your heir {heir}, aged {heirAge}, is old enough for lessons. Who shall teach the child? |

#### Options

| id | name | ai | effects | needs |
|---|---|---|---|---|
| learned | Hire the most learned man you can find | 2 | (gold: -20) |  |
| lord | Send the child to {lord2}'s household | 2 | (loyalty: office\_at\_court; who: lord2) | lord2 |
| priests | Leave it to the priests | 1 | none |  |

### Omen

| Key | Value |
|---|---|
| `weight` | 1 |
| `needs` | capital |
| `title` | A comet over {province} |
| `text` | A star with a burning tail hangs over {province} night after night. The people whisper that it foretells the death of kings. |

#### Options

| id | name | ai | effects |
|---|---|---|---|
| good | Proclaim it a good omen | 2 | (gold: -10), (loyalty: want\_granted; who: least\_loyal\_lords; count: 1) |
| silence | Say nothing | 2 | none |

### Silver found

| Key | Value |
|---|---|
| `weight` | 1 |
| `needs` | province |
| `title` | Silver at {province} |
| `text` | A shepherd at {province} has found a seam of silver ore in a gully. Miners are already gathering. |

#### Options

| id | name | ai | effects | needs |
|---|---|---|---|---|
| crown | Open a crown mine | 2 | (gold: -20), (people: 0.025) |  |
| lord | Grant it to {lord2} | 2 | (loyalty: want\_granted; who: lord2), (people: 0.01) | lord2 |
| leave | Let the miners dig as they will | 1 | (people: 0.005) |  |

### Pilgrims

| Key | Value |
|---|---|
| `weight` | 1 |
| `needs` | province |
| `title` | Pilgrims at {province} |
| `text` | Word of a holy relic at {province} has spread, and pilgrims crowd the roads. The innkeepers grow rich. |

#### Options

| id | name | ai | effects |
|---|---|---|---|
| shrine | Build a shrine | 2 | (gold: -15), (people: 0.015) |
| toll | Toll the pilgrims | 1 | (gold: 10) |
| nothing | Let them come | 1 | (people: 0.005) |

### Tournament

| Key | Value |
|---|---|
| `weight` | 1 |
| `needs` | lord |
| `where` | europe |
| `to` | 1600 |
| `title` | A tournament |
| `text` | {lord} and the young men of your lords' houses beg you to hold a tournament, with jousting and a feast. |

#### Options

| id | name | ai | effects |
|---|---|---|---|
| hold | Hold a great tournament | 2 | (gold: -20), (loyalty: gift\_of\_gold; who: least\_loyal\_lords; count: 2) |
| refuse | There are better uses for gold | 1 | (loyalty: slighted\_at\_court; who: lord) |

### Guilds quarrel

| Key | Value |
|---|---|
| `weight` | 1 |
| `needs` | province |
| `where` | europe, middle\_east, north\_africa |
| `to` | 1800 |
| `title` | Guilds quarrel at {province} |
| `text` | The weavers' and dyers' guilds of {province} have come to blows over who may sell cloth in the market. |

#### Options

| id | name | ai | effects |
|---|---|---|---|
| weavers | Judge for the weavers | 2 | (people: 0.005) |
| fine | Fine both guilds | 1 | (gold: 15), (people: -0.01) |
| free | Let anyone sell | 1 | (people: 0.01), (people: -0.002) |

### Printer

| Key | Value |
|---|---|
| `weight` | 1 |
| `needs` | capital |
| `where` | europe |
| `from` | 1460 |
| `to` | 1600 |
| `title` | A printer at {province} |
| `text` | A printer with a press of movable letters asks leave to set up shop at {province}. The scribes say it is the devil's work. |

#### Options

| id | name | ai | effects |
|---|---|---|---|
| welcome | Grant him a privilege | 2 | (gold: -10), (people: 0.015) |
| refuse | Keep to the scribes | 1 | none |

### Witch trials

| Key | Value |
|---|---|
| `weight` | 1 |
| `needs` | province |
| `where` | europe |
| `from` | 1560 |
| `to` | 1700 |
| `title` | Accusations at {province} |
| `text` | After a bad harvest, the people of {province} accuse an old widow of witchcraft, and name others besides. |

#### Options

| id | name | ai | effects |
|---|---|---|---|
| stop | Stop the trials | 1 | (loyalty: slighted\_at\_court; who: lord2) |
| courts | Let the courts decide | 2 | (people: -0.002) |

### Enclosure

| Key | Value |
|---|---|
| `weight` | 1 |
| `needs` | lord\_land |
| `where` | europe |
| `from` | 1550 |
| `to` | 1850 |
| `title` | {lord} fences the commons |
| `text` | {lord} is fencing the common fields at {province} for his sheep. The villagers who grazed them there have nowhere to go. |

#### Options

| id | name | ai | effects |
|---|---|---|---|
| allow | Allow it | 2 | (loyalty: want\_granted; who: lord), (people: 0.015), (people: -0.01) |
| forbid | Forbid it | 1 | (loyalty: slighted\_at\_court; who: lord) |

### Coffee house

| Key | Value |
|---|---|
| `weight` | 1 |
| `needs` | capital |
| `where` | europe, middle\_east |
| `from` | 1550 |
| `to` | 1800 |
| `title` | Coffee houses at {province} |
| `text` | Coffee houses have sprung up all over {province}. Men sit in them for hours, talking of trade and of your government. |

#### Options

| id | name | ai | effects |
|---|---|---|---|
| license | License and tax them | 2 | (gold: 10) |
| ban | Close them | 1 | (people: -0.005) |
| let | Let them be | 1 | (people: 0.005) |

### Railway

| Key | Value |
|---|---|
| `weight` | 2 |
| `needs` | province |
| `from` | 1830 |
| `title` | A railway through {province} |
| `text` | Surveyors ask leave to lay a railway line through {province}, and a grant to help pay for it. |

#### Options

| id | name | ai | effects |
|---|---|---|---|
| fund | Pay part of the cost | 2 | (gold: -40), (people: 0.03) |
| private | Let the company pay its own way | 2 | (people: 0.01) |
| refuse | Refuse | 1 | none |

### Strike

| Key | Value |
|---|---|
| `weight` | 1 |
| `needs` | province |
| `from` | 1820 |
| `title` | A strike at {province} |
| `text` | The mill hands of {province} have walked out, asking for shorter hours and higher pay. |

#### Options

| id | name | ai | effects |
|---|---|---|---|
| concede | Press the owners to give way | 1 | (gold: -15) |
| troops | Send soldiers | 2 | (people: -0.002), (recruits: -0.05) |
| wait | Wait them out | 1 | (people: -0.015) |

### Cholera

| Key | Value |
|---|---|
| `weight` | 1 |
| `needs` | province |
| `from` | 1817 |
| `to` | 1910 |
| `title` | Cholera at {province} |
| `text` | Cholera has broken out in the poor streets of {province}. Doctors blame the bad air; one says it is the water. |

#### Options

| id | name | ai | effects |
|---|---|---|---|
| wells | Close the foul wells | 1 | (gold: -20), (people: -0.003) |
| air | Burn tar against the bad air | 2 | (people: -0.015) |

### Newspaper

| Key | Value |
|---|---|
| `weight` | 1 |
| `needs` | capital |
| `from` | 1780 |
| `title` | A newspaper attacks your ministers |
| `text` | A newspaper at {province} prints, week after week, that your ministers are fools and thieves. It sells very well. |

#### Options

| id | name | ai | effects |
|---|---|---|---|
| buy | Buy the editor | 2 | (gold: -15) |
| close | Close the paper | 1 | (loyalty: slighted\_at\_court; who: least\_loyal\_lords; count: 1) |
| let | Let it print | 1 | none |

### Caravan raided

| Key | Value |
|---|---|
| `weight` | 2 |
| `needs` | province |
| `where` | middle\_east, north\_africa, central\_asia, sahel |
| `title` | A caravan raided near {province} |
| `text` | Raiders fell on a caravan a day's ride from {province}, and the merchants want to know what you will do. |

#### Options

| id | name | ai | effects |
|---|---|---|---|
| escort | Give the caravans an escort | 2 | (gold: -15), (people: 0.01) |
| pay | Pay the tribes to keep the peace | 1 | (gold: -10) |
| ignore | The desert is the desert | 1 | (people: -0.015) |

### Qanat

| Key | Value |
|---|---|
| `weight` | 1 |
| `needs` | province |
| `where` | persia, middle\_east, central\_asia, north\_africa |
| `title` | The water channels at {province} fail |
| `text` | The underground channels that bring water to the fields of {province} have caved in, and the wells are falling. |

#### Options

| id | name | ai | effects |
|---|---|---|---|
| repair | Send diggers to repair them | 2 | (gold: -20) |
| leave | Leave it to the villages | 1 | (food: -1), (people: -0.01) |

### Locusts

| Key | Value |
|---|---|
| `weight` | 1 |
| `needs` | store |
| `loss` | 0.3 |
| `where` | middle\_east, north\_africa, sub\_saharan\_africa, south\_asia |
| `title` | Locusts at {province} |
| `text` | A cloud of locusts darkened the sky over {province} for a day. When it lifted, {loss} months of grain were gone from the fields and stores. |

#### Options

| id | name | ai | effects |
|---|---|---|---|
| buy | Buy grain from merchants | 2 | (gold: -15), (food\_back: 0.5) |
| bear | Bear the loss | 2 | none |

### Endowment

| Key | Value |
|---|---|
| `weight` | 1 |
| `needs` | province |
| `where` | middle\_east, north\_africa, south\_asia, central\_asia |
| `title` | An endowment at {province} |
| `text` | A rich merchant of {province} wishes to leave his shops to a school and a fountain for ever, free of tax. |

#### Options

| id | name | ai | effects |
|---|---|---|---|
| approve | Approve the endowment | 2 | (people: 0.01) |
| tax | Insist the shops pay tax | 1 | (gold: 15) |

### Gold traders

| Key | Value |
|---|---|
| `weight` | 2 |
| `needs` | province |
| `where` | west\_africa, sahel |
| `title` | Gold traders at {province} |
| `text` | Traders from the north have come to {province} with salt and cloth, seeking gold dust. |

#### Options

| id | name | ai | effects |
|---|---|---|---|
| welcome | Welcome them | 2 | (gold: 10), (people: 0.01) |
| tax | Tax them heavily | 1 | (gold: 25), (people: -0.01) |

### Cattle raid

| Key | Value |
|---|---|
| `weight` | 2 |
| `needs` | province |
| `where` | east\_africa, southern\_africa, sahel, central\_africa |
| `title` | Cattle raided at {province} |
| `text` | Raiders from beyond the border have driven off the herds of {province}. The young men want to go after them. |

#### Options

| id | name | ai | effects |
|---|---|---|---|
| raid | Send the young men | 2 | (recruits: -0.1), (food: 0.5) |
| repay | Give the herders cattle of your own | 1 | (gold: -10) |
| let | Let it go | 1 | (food: -1) |

### Rains late

| Key | Value |
|---|---|
| `weight` | 1 |
| `needs` | province |
| `where` | sub\_saharan\_africa, south\_asia, southeast\_asia, andes, mesoamerica |
| `title` | The rains are late at {province} |
| `text` | The rains have not come to {province}, and the sown fields are turning to dust. The priests ask for offerings. |

#### Options

| id | name | ai | effects |
|---|---|---|---|
| offer | Make great offerings | 2 | (gold: -10), (loyalty: want\_granted; who: least\_loyal\_lords; count: 1), (food: -0.5) |
| grain | Send grain from your stores | 1 | (gold: -15) |
| wait | Wait for the rain | 1 | (food: -1) |

### Monsoon fails

| Key | Value |
|---|---|
| `weight` | 1 |
| `needs` | store |
| `loss` | 0.4 |
| `where` | south\_asia, southeast\_asia |
| `title` | The monsoon fails at {province} |
| `text` | The monsoon has failed at {province}. The rice withers in dry paddies, and {loss} months of grain are already eaten. |

#### Options

| id | name | ai | effects | needs |
|---|---|---|---|---|
| buy | Buy rice from merchants | 2 | (gold: -20), (food\_back: 0.5) |  |
| requisition | Take grain from {lord2}'s barns | 1 | (food\_back: 0.5), (loyalty: grain\_requisitioned; who: lord2) | lord2 |
| bear | Bear the loss | 2 | none |  |

### Temple festival

| Key | Value |
|---|---|
| `weight` | 1 |
| `needs` | province |
| `where` | south\_asia, southeast\_asia, east\_asia |
| `title` | A festival at {province} |
| `text` | The great temple festival at {province} draws crowds from far away. The priests ask the crown to pay for the procession. |

#### Options

| id | name | ai | effects |
|---|---|---|---|
| fund | Pay for a splendid procession | 2 | (gold: -15), (loyalty: gift\_of\_gold; who: least\_loyal\_lords; count: 2) |
| modest | Send your blessings | 2 | none |

### Revenue survey

| Key | Value |
|---|---|
| `weight` | 1 |
| `needs` | province |
| `where` | south\_asia, east\_asia |
| `from` | 1500 |
| `title` | A survey of {province} |
| `text` | Your revenue clerks say the land registers of {province} are a generation out of date, and much land pays nothing. |

#### Options

| id | name | ai | effects |
|---|---|---|---|
| survey | Survey every field | 2 | (gold: -20), (people: 0.015), (loyalty: heavy\_taxes; who: lord2) |
| leave | Leave the old registers | 1 | none |

### River dykes

| Key | Value |
|---|---|
| `weight` | 1 |
| `needs` | province |
| `where` | china |
| `title` | The dykes at {province} weaken |
| `text` | The river officials report that the dykes at {province} are rotten, and the next flood may break through. |

#### Options

| id | name | ai | effects |
|---|---|---|---|
| repair | Call out labour to repair them | 2 | (gold: -25) |
| wait | Hope the river stays low | 1 | (people: -0.01), (food: -1) |

### Exam scandal

| Key | Value |
|---|---|
| `weight` | 1 |
| `needs` | official |
| `where` | china, korea, east\_asia |
| `to` | 1905 |
| `title` | Cheating at the examinations |
| `text` | Candidates at {province} were found with answers sewn into their sleeves, and your {type}, {official}, is said to have sold the questions. |

#### Options

| id | name | ai | effects |
|---|---|---|---|
| punish | Dismiss {official} | 2 | (official: new) |
| retake | Hold the examinations again | 1 | (gold: -10) |
| hush | Hush it up | 1 | (people: -0.01) |

### Pirates

| Key | Value |
|---|---|
| `weight` | 1 |
| `needs` | coastal |
| `where` | east\_asia, southeast\_asia, north\_africa, caribbean, europe |
| `to` | 1850 |
| `title` | Pirates off {province} |
| `text` | Pirates have burned fishing boats off {province} and carried away the crews to sell. |

#### Options

| id | name | ai | effects |
|---|---|---|---|
| garrison | Garrison the coast | 2 | (gold: -15), (recruits: -0.05) |
| pay | Pay them to sail elsewhere | 1 | (gold: -10) |
| ignore | The sea is wide | 1 | (people: -0.02) |

### Tea master

| Key | Value |
|---|---|
| `weight` | 1 |
| `needs` | capital |
| `where` | japan, korea, china |
| `from` | 1450 |
| `title` | A tea master at {province} |
| `text` | A famous master of tea and poetry has come to {province}. Your lords would give much to sit at his gatherings. |

#### Options

| id | name | ai | effects |
|---|---|---|---|
| patron | Become his patron | 2 | (gold: -15), (loyalty: gift\_of\_gold; who: least\_loyal\_lords; count: 2) |
| polite | Receive him politely | 1 | none |

### Spice merchants

| Key | Value |
|---|---|
| `weight` | 2 |
| `needs` | coastal |
| `where` | southeast\_asia, south\_asia, east\_africa |
| `title` | Spice ships at {province} |
| `text` | Ships heavy with pepper and cloves have put in at {province}, and their captains ask what dues they must pay. |

#### Options

| id | name | ai | effects |
|---|---|---|---|
| low | Light dues, to bring more ships | 2 | (people: 0.015) |
| high | Heavy dues | 1 | (gold: 20) |

### Ball game

| Key | Value |
|---|---|
| `weight` | 1 |
| `needs` | lord |
| `where` | mesoamerica, central\_america, caribbean |
| `to` | 1550 |
| `title` | The great ball game |
| `text` | {lord} challenges your court's team to the ball game, with feathers, jade and honour wagered on it. |

#### Options

| id | name | ai | effects |
|---|---|---|---|
| host | Host it at your court | 2 | (gold: -10), (loyalty: gift\_of\_gold; who: lord) |
| decline | Decline | 1 | (loyalty: slighted\_at\_court; who: lord) |

### Maize blight

| Key | Value |
|---|---|
| `weight` | 1 |
| `needs` | store |
| `loss` | 0.3 |
| `where` | americas |
| `title` | Blight in the maize at {province} |
| `text` | A blight has blackened the maize at {province}, and {loss} months of grain have rotted on the cob. |

#### Options

| id | name | ai | effects |
|---|---|---|---|
| buy | Buy grain from elsewhere | 2 | (gold: -15), (food\_back: 0.5) |
| bear | Bear the loss | 2 | none |

### Voyagers

| Key | Value |
|---|---|
| `weight` | 1 |
| `needs` | coastal |
| `where` | oceania, southeast\_asia |
| `title` | Voyagers at {province} |
| `text` | Great canoes have come in to {province} from islands far away, bringing new plants and stories. |

#### Options

| id | name | ai | effects |
|---|---|---|---|
| feast | Feast them and trade | 2 | (gold: -10), (people: 0.015) |
| watch | Watch them warily | 1 | none |

### Horse fair

| Key | Value |
|---|---|
| `weight` | 1 |
| `needs` | province |
| `where` | central\_asia, eastern\_europe, russia, persia |
| `title` | A horse fair at {province} |
| `text` | Herders from the steppe have brought thousands of horses to sell at {province}. |

#### Options

| id | name | ai | effects |
|---|---|---|---|
| buy | Buy remounts for your riders | 2 | (gold: -15), (recruits: 0.1) |
| tax | Tax the sales | 1 | (gold: 10) |

### Hard winter

| Key | Value |
|---|---|
| `weight` | 1 |
| `needs` | province |
| `where` | central\_asia, siberia, russia, eastern\_europe, denmark |
| `title` | A hard winter at {province} |
| `text` | Ice and deep snow have lain on {province} since autumn. Animals die in the byres, and the fodder is nearly gone. |

#### Options

| id | name | ai | effects |
|---|---|---|---|
| fodder | Send fodder and grain | 2 | (gold: -15) |
| slaughter | Slaughter the weak animals | 1 | (food: 0.5), (people: -0.01) |
| endure | Endure | 1 | (food: -1), (people: -0.005) |

### Fur tribute

| Key | Value |
|---|---|
| `weight` | 1 |
| `needs` | province |
| `where` | russia, siberia, north\_america |
| `from` | 1450 |
| `title` | Furs from {province} |
| `text` | Trappers bring sable and fox to {province}, more than any year before. The merchants want to buy the whole lot. |

#### Options

| id | name | ai | effects |
|---|---|---|---|
| crown | Take the best for the crown | 2 | (gold: 15) |
| free | Let the merchants trade freely | 1 | (people: 0.015) |
