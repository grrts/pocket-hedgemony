# Everyday events data

Every value in the game's everyday events config, exactly as the game reads it. This page is made from `packages/rules/data/domain/events-everyday.json` each time the config changes, so it always matches the game. How these values are used is explained on [Historical Events](Historical-Events).

Keys are written as in the config file. Shares are fractions (0.25 is 25 %), and values marked (provisional) are placeholders that may still change in balancing. Inventions are shown by id and name; see [Research data](Data-Research#inventions).

> Everyday events (domain/events/spec.md §5.22, EVT-115 to EVT-128; feedback 152). Small choices about the realm's own people and stores, drawn from what the game already holds: its officials, lords, ruler and heir, and food stores, plague reaching a province of the player's (EVT-130: not drawn; plague fires it), and the death of one of the player's officials, lords, generals or admirals (EVT-122, EVT-123, EVT-132: not drawn; the death of people fires it). Each realm draws one every \`months\_between\` months (a range), never while the player has an event waiting. \`weight\` is how often an event is drawn among the ones that can happen; \`needs\` names what it is about. Options list their effects in the engine's small vocabulary (gold, loyalty, official, lands, heir, heir\_risk, food\_back, new\_lord, quarantine, care, command, home); \`ai\` weights the AI's pick; \`needs\` on an option hides it when the realm lacks what it asks (\`lord2\`: a second lord; \`leaderless\`: the dead commander's men or ships still without a leader). \`{words}\` in braces are filled with the names of who and where. Every number is a placeholder for balance.

| Key | Value |
|---|---|
| `months_between` | 3, 6 |
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
| `weight` | 0 |
| `needs` | death |
| `title` | Death of {dead} |
| `text` | {dead}, your {type} at {province}, has died after {years} years in the post. The seat stands empty, and his clerks wait to hear who will take it. |

#### Options

| id | name | ai | effects | needs |
|---|---|---|---|---|
| deputy | Raise his deputy | 3 | (official: new) |  |
| seasoned | Send for a seasoned man | 1 | (gold: -25), (official: seasoned) |  |
| kin | Give the post to {lord2}'s kinsman | 2 | (official: new), (loyalty: office\_at\_court; who: lord2) | lord2 |

### Lord dies

| Key | Value |
|---|---|
| `weight` | 0 |
| `needs` | death |
| `title` | Death of {dead} |
| `text` | {dead} of the house of {house} has died. His heir {son} has taken his lands ({lands}) and asks you to confirm him in them. |

#### Options

| id | name | ai | effects |
|---|---|---|---|
| confirm | Confirm {son} | 4 | (new\_lord: yes) |
| relief | Ask a fee for his lands | 2 | (new\_lord: yes), (gold: 20), (loyalty: heavy\_taxes; who: lord) |
| take | Take his lands for the crown | 1 | (lands: crown), (loyalty: land\_seized\_from\_another; who: other\_lords) |

### General dies

| Key | Value |
|---|---|
| `weight` | 0 |
| `needs` | death |
| `title` | Death of {dead} |
| `text` | {dead}, your general, has died at {province}. Without him his men take no orders and make for crown land, to stand there as a garrison. His second in command, {second}, asks to lead them in his place. |

#### Options

| id | name | needs | ai | effects |
|---|---|---|---|---|
| second | Give {second} the command | leaderless | 2 | (gold: -15), (command: yes) |
| home | Let them go home |  | 1 | (home: army) |

### Admiral dies

| Key | Value |
|---|---|
| `weight` | 0 |
| `needs` | death |
| `title` | Death of {dead} |
| `text` | {dead}, your admiral, has died at {province}. Without him his ships take no orders and make for the nearest port of yours. His flag captain, {second}, asks to keep the fleet at sea under his own flag. |

#### Options

| id | name | needs | ai | effects |
|---|---|---|---|---|
| second | Give {second} the fleet | leaderless | 2 | (gold: -15), (command: yes) |
| home | Let them sail home |  | 1 | (home: fleet) |

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
