# Revolutions data

Every value in the game's revolutions config, exactly as the game reads it. This page is made from `packages/rules/data/domain/revolutions.json` each time the config changes, so it always matches the game. How these values are used is explained on [Revolutions](Revolutions).

Keys are written as in the config file. Shares are fractions (0.25 is 25 %), and values marked (provisional) are placeholders that may still change in balancing. Inventions are shown by id and name; see [Research data](Data-Research#inventions).

> Revolutions (domain/revolutions/spec.md): revolutions/generated/runtime/\*.json plus reference.yaml and the balance values of revolutions-design.md section 7 and 12. All numbers are placeholders.

| Key | Value |
|---|---|
| `generals_too_big_mult` | 2 |

## Reference

| Key | Value |
|---|---|
| `classes` | farmers, herders, woodsmen, miners, seafolk, craftsmen, market\_folk, clergy, clerks, scholars, homeless |
| `grievances` | heavy\_taxes, hungry, homeless, soldiers\_quartered, burned\_homes, conscription, foreign\_rule, wrong\_faith, ungoverned, harsh\_lord, broken\_charter, far\_from\_throne, plague, bloodshed, requisitioned, neighbour\_in\_revolt |
| `rising_causes` | hunger, tax, faith, homeland, town, lord, pretender, new\_ideas |
| `lord_loyalty` | loyal, wavering, disloyal, in\_revolt |

### Lord measures

| Key | Value |
|---|---|
| `land_share` | Share (0-1) of the realm's provinces held by lords rather than run by your officials. |
| `wavering_or_worse` | Number of lords whose loyalty is Wavering, Disloyal or In revolt. |
| `disloyal_or_worse` | Number of lords whose loyalty is Disloyal or In revolt. |
| `count` | Number of named lords. |

### Stances

| Key | Value |
|---|---|
| `lead` | Lead it: apply the revolution's regime yourself, now. The old order may rise against you instead. |
| `bend` | Bend: grant part of it. A smaller regime, and the signs ease; it can come back if they return. |
| `fight` | Fight it: the revolution becomes a great revolt. Its result decides the regime. |
| `path` | Not the ruler's choice: which way the revolution itself goes (chosen by its own leaders, or rolled). |

### Actions

| Key | Value |
|---|---|
| `grant_fief` | Grant royal provinces to a new lord (country stats 5.3). |
| `sell_title` | Sell a province to a rich merchant as a fief (country stats 5.3). |
| `seize_land` | Take a lord's land by decree (country stats 5.4). |
| `call_the_lords` | Call lords and their retinues to war (warfare 3.2). |
| `hire_companies` | Hire paid companies (warfare 3.3). |
| `crushing_taxes` | Set a province's tax rate to crushing (province stats 8). |
| `revoke_charter` | Revoke a charter (province stats 10.4). |
| `massacre` | Massacre after beating a rising (rebellions 5.1). |
| `persecute` | Apply a persecution policy to a faith (religion design). |

### Foreign backing

| Key | Value |
|---|---|
| `label` | Foreign gold backs the movement |
| `mult` | 2 |
| `flag` | revolution\_funded |
| `joins_mult` | 1.5 |

### Rearm

| Key | Value |
|---|---|
| `grace_years` | 3 |

## Foreign backing

| Key | Value |
|---|---|
| `cost_share_of_yearly_income` | 0.01 |
| `catch_chance` | 0.03 |
| `catch_at_peace_add` (provisional) | 0.01 |
| `catch_officials_add` (provisional) | 0.01 |
| `catch_officials_share` (provisional) | 0.5 |
| `fundable_stages` | Brewing, Ready |
| `win_opinion` | 25 |

## Counter revolution

| Key | Value |
|---|---|
| `years` (provisional) | 25 |
| `opinion` (provisional) | -50 |

## Reaction

| Key | Value |
|---|---|
| `need_reduction` | 1 |
| `years` | 20 |

## Ai

| Key | Value |
|---|---|
| `historical_mult` | 3 |

## Generals switch to

> revolutions-design 7: a winning general can switch the regime (changes-for-other-designs Warfare).

| Key | Value |
|---|---|
| `regimes` | court\_absolutism, military\_kingdom |

## Camp rules

> families.yaml camps.\*.lords and camps.\*.army lines, transcribed as rules. Loyalty steps: loyal \< wavering \< disloyal \< in\_revolt.

| Name | revolution lords | old order lords | desertion | mutiny |
|---|---|---|---|---|
| faith | (same\_faith: yes; loyalty\_at\_least: wavering) | (other\_faith: yes), (loyalty: loyal) | rate: 0.05; same\_faith: yes |  |
| estates | (loyalty\_at\_least: disloyal; with\_retinue: yes) | (loyalty: loyal) | rate: 0.05; unpaid: yes |  |
| liberal\_national | (loyalty\_at\_least: disloyal; trait: Ambitious) | (loyalty: loyal), (loyalty: wavering) | rate: 0.05; conscripted: yes; war\_weary: yes |  |
| freedom | none | (planter\_or\_settler: yes) | rate: 0.1; colonial\_same\_people: yes |  |
| agrarian | (loyalty\_at\_least: in\_revolt) | (any: yes) | rate: 0.05; from\_farming\_province: yes; hungry: yes |  |
| from\_above | none | (loyalty\_at\_least: disloyal), (loyalty: wavering; traits: Pious, Proud) |  |  |
| homeland | (same\_culture: yes; loyalty\_at\_least: wavering) | (other\_culture: yes), (loyalty: loyal) | rate: 0.05; from\_region: yes |  |
| socialist\_defeat | none | (any: yes) |  | rate: 0.1; war\_weariness\_above: 14 |
| restoration | (emigre: yes), (loyalty: loyal; old\_house: yes) | (gained\_under\_revolution: yes) |  |  |

## Regime on apply

> regimes.yaml risk lines that act at once.

### Emancipation

| Key | Value |
|---|---|
| `lords_waver_steps` | 1 |

## Families

### Faith

| Key | Value |
|---|---|
| `id` | faith |
| `name` | Faith revolutions |
| `idea` | A religious movement takes power and turns its community into the state. |
| `cause` | faith |

#### Camps

| Name | joins | only of faith | lords | army | clergy |
|---|---|---|---|---|---|
| revolution | homeless: 0.3; farmers: 0.1; clergy: 0.3; craftsmen: 0.08; market\_folk: 0.08 | yes | Lords of the movement's faith who are Wavering or worse | Soldiers of the movement's faith desert at 5 % a month |  |
| old\_order |  |  | Lords of other faiths, and every Loyal lord |  | Clergy of the state faith |

#### Stance labels

| Key | Value |
|---|---|
| `lead` | Take up the new teaching |
| `bend` | Tolerate the movement |
| `fight` | Suppress it |

#### Wave

| Key | Value |
|---|---|
| `kind` | religion |
| `amount` | 0.05 |
| `where` | neighbours |

### Estates

| Key | Value |
|---|---|
| `id` | estates |
| `name` | Estates and town revolutions |
| `idea` | Towns, assemblies or great lords force the crown to share power, or lose it. |
| `cause` | town |

#### Camps

| Name | joins | lords | army | clergy |
|---|---|---|---|---|
| revolution | homeless: 0.2; market\_folk: 0.15; craftsmen: 0.12; clerks: 0.1; scholars: 0.05; farmers: 0.03 | Disloyal lords join with their retinues | Unpaid soldiers desert at 5 % a month |  |
| old\_order |  | Loyal lords |  | Clergy of the state faith |

#### Stance labels

| Key | Value |
|---|---|
| `lead` | Share power |
| `bend` | Grant charters |
| `fight` | Break them |

#### Wave

| Key | Value |
|---|---|
| `kind` | ideology |
| `id` | parliamentarism |
| `amount` | 0.03 |
| `where` | neighbours |

### Liberal national

| Key | Value |
|---|---|
| `id` | liberal\_national |
| `name` | Liberal and national revolutions |
| `idea` | Townsfolk and scholars demand a constitution, a nation, or a republic. |
| `cause` | new\_ideas |

#### Camps

| Name | joins | farmers if hungry | lords | army | clergy |
|---|---|---|---|---|---|
| revolution | homeless: 0.3; scholars: 0.25; clerks: 0.15; craftsmen: 0.12; market\_folk: 0.1; farmers: 0.04 | 0.1 | Few: only Disloyal lords with the Ambitious trait | Conscripted soldiers desert at 5 % a month while war weariness is high |  |
| old\_order |  |  | Every Loyal and Wavering lord |  | Clergy of the state faith |

#### Stance labels

| Key | Value |
|---|---|
| `lead` | Proclaim the new order |
| `bend` | Grant a constitution |
| `fight` | Restore order |

#### Wave

| Key | Value |
|---|---|
| `kind` | ideology |
| `id` | liberalism |
| `amount` | 0.05 |
| `where` | neighbours |

### Freedom

| Key | Value |
|---|---|
| `id` | freedom |
| `name` | Freedom revolutions |
| `idea` | Enslaved and colonised people overthrow those who hold them. |
| `cause` | homeland |

#### Camps

| Name | joins | note | lords | army | clergy |
|---|---|---|---|---|---|
| revolution | homeless: 0.3; farmers: 0.3; craftsmen: 0.1; market\_folk: 0.1 | On plantation tiles the farmers are the enslaved workers (event tree population group enslaved\_africans); they join at 30 %. | None | Colonial troops of the same people desert at 10 % a month |  |
| old\_order |  |  | Planters and settler lords |  | Colonial clergy |

#### Stance labels

| Key | Value |
|---|---|
| `lead` | Abolish and free |
| `bend` | Grant autonomy |
| `fight` | Send an army |

#### Wave

| Key | Value |
|---|---|
| `kind` | ideology |
| `id` | abolitionism |
| `amount` | 0.1 |
| `where` | region |

### Agrarian

| Key | Value |
|---|---|
| `id` | agrarian |
| `name` | Peasant and agrarian revolutions |
| `idea` | Farmers rise against lords, tax collectors or a dynasty that has lost the right to rule. |
| `cause` | hunger |

#### Camps

| Name | joins | lords | army | clergy |
|---|---|---|---|---|
| revolution | homeless: 0.3; farmers: 0.15; herders: 0.1; woodsmen: 0.08; miners: 0.08; craftsmen: 0.04 | Only lords in revolt | Soldiers from farming provinces desert at 5 % a month while Hungry |  |
| old\_order |  | Every lord |  | Clergy of the state faith |

#### Stance labels

| Key | Value |
|---|---|
| `lead` | Divide the land |
| `bend` | Cut taxes and open the granaries |
| `fight` | Crush the bands |

#### Wave

| Key | Value |
|---|---|
| `kind` | none |
| `where` | neighbours |
| `note` | Spreads as Neighbour in revolt grievances (rebellions 4.2), not as an ideology. |

### From above

| Key | Value |
|---|---|
| `id` | from\_above |
| `name` | Revolutions from above |
| `idea` | The ruler turns the realm over from the top, and the old order fights back. |
| `cause` | lord |

#### Camps

| Name | joins | note | lords | army |
|---|---|---|---|---|
| revolution | none | Nobody rises for it: the ruler starts it as a decision. |  |  |
| old\_order | clergy: 0.1; farmers: 0.02 |  | Every Disloyal lord, and Wavering lords with the Pious or Proud trait | Old-style units (retinues, guards) may mutiny |

#### Stance labels

| Key | Value |
|---|---|
| `lead` | Start the reforms |
| `bend` | Reform the army only |
| `fight` | Keep the old ways |

#### Wave

| Key | Value |
|---|---|
| `kind` | ideology |
| `amount` | 0 |
| `where` | none |

### Homeland

| Key | Value |
|---|---|
| `id` | homeland |
| `name` | Homeland revolutions |
| `idea` | A region's own warriors throw off a distant empire and crown their own ruler. |
| `cause` | homeland |

#### Camps

| Name | joins | only of culture | lords | army | clergy |
|---|---|---|---|---|---|
| revolution | homeless: 0.2; herders: 0.1; woodsmen: 0.08; farmers: 0.06 | yes | Lords of the region's culture who are Wavering or worse | Soldiers from the region desert at 5 % a month |  |
| old\_order |  |  | Lords of other cultures, and every Loyal lord |  | Clergy of the state faith |

#### Stance labels

| Key | Value |
|---|---|
| `lead` | Grant the region its own crown |
| `bend` | Give its leader high rank |
| `fight` | Send the imperial army |

#### Wave

| Key | Value |
|---|---|
| `kind` | none |
| `where` | neighbours |
| `note` | Spreads as Foreign rule grievances in neighbouring provinces held by distant empires. |

### Socialist defeat

| Key | Value |
|---|---|
| `id` | socialist\_defeat |
| `name` | Revolutions of war and want |
| `idea` | A lost war, hunger in the towns and new socialist ideas bring down the old regime. |
| `cause` | new\_ideas |

#### Camps

| Name | joins | lords | army | clergy |
|---|---|---|---|---|
| revolution | homeless: 0.3; craftsmen: 0.2; seafolk: 0.1; miners: 0.15; farmers: 0.08; scholars: 0.1; clerks: 0.05 | None | Soldiers mutiny at 10 % a month while war weariness is above 14 |  |
| old\_order |  | Every lord | Officers | Clergy of the state faith |

#### Stance labels

| Key | Value |
|---|---|
| `lead` | Hand power to the councils |
| `bend` | Promise an assembly |
| `fight` | Send in the troops |

#### Wave

| Key | Value |
|---|---|
| `kind` | ideology |
| `id` | socialism |
| `amount` | 0.05 |
| `where` | region |

### Restoration

| Key | Value |
|---|---|
| `id` | restoration |
| `name` | Restorations |
| `idea` | The old dynasty comes back after a revolution, but cannot undo all of it. |
| `cause` | pretender |

#### Camps

| Name | joins | lords | note |
|---|---|---|---|
| revolution | none | Émigré lords and Loyal lords of the old house | The returning pretender's backers. |
| old\_order |  | Lords and officials who gained land or office under the revolution |  |

#### Stance labels

| Key | Value |
|---|---|
| `lead` | Recall the dynasty |
| `bend` | Restore with a charter |
| `fight` | Defend the revolution |

#### Wave

| Key | Value |
|---|---|
| `kind` | none |
| `where` | none |

## Regimes

| Name | id | name | form | ruler | lords | flags | abroad | risk | loop | more |
|---|---|---|---|---|---|---|---|---|---|---|
| league\_of\_the\_faithful | league\_of\_the\_faithful | League of the faithful | holy\_rule | replaced | Temple elders replace the lords. Each lord's province passes to the nearest temple of the movement; the elder runs it like a lord but never defects to another country. | revolutionary\_regime | Lords of neighbouring countries fear the example: their opinion of you -30. | With no single ruler, wars of conquest need half the temple elders to agree. | You govern through temples, not lords: cheap, loyal provinces that pay little and fight hard for the faith. | church: Temples of the movement own one farm tile in each province they run.; faith: The movement's faith becomes the state faith. Chaplain effects are doubled.; levy: The faithful answer a call to arms: every class of the state faith can be levied, at the farmers' share.; land: Tax from temple provinces is light and cannot be raised.; decrees: call\_the\_faithful; locks: grant\_fief, sell\_title, crushing\_taxes; grievances end: harsh\_lord |
| qizilbash\_order | qizilbash\_order | Order state | holy\_rule | replaced | Clan chiefs of the order become lords with large retinues. Their loyalty rests on faith in the ruler, not gifts: it drops a step each time the ruler loses a battle they lead. | revolutionary\_regime | Countries of the other branch of the faith get a holy-war reason against you (diplomacy design). | A defeat in a battle the ruler leads makes every chief waver. | Holy-warrior chiefs give you a strong army early, but their faith in the ruler is your stability. | faith: The order's faith becomes the state faith; conversion by decree is open (religion design).; levy: Chiefs' retinues are horse archers and count double in the lords' call.; decrees: convert\_by\_decree; form note: After three reigns of one family the form may reform to household\_realm (government 6.4).; grievances add: wrong\_faith |
| reformist\_caliphate | reformist\_caliphate | Reformist caliphate | holy\_rule | replaced | Lords become appointed governors (emirs). When one dies, the land does not pass to an heir: it returns to you and you appoint a new governor. | revolutionary\_regime | Rulers of the same faith who did not join get a reason to resist; reformers abroad gain 0.05 support. | Appointed governors far from the capital drift toward independence after 30 years. | Lords never found dynasties, so a large realm stays yours, but each death means a new appointment. | church: Mosque schools train judges: judges cost half.; faith: Wrong faith counts as two grievances outside the state faith's provinces until they convert.; decrees: appoint\_emir, call\_the\_faithful; locks: sell\_title; form note: Every governor holds a service grant (government 3.3): the land returns at his death. |
| heavenly\_kingdom | heavenly\_kingdom | Heavenly kingdom | holy\_rule | replaced | Abolished. Their land goes to a common treasury. | revolutionary\_regime | Every neighbour of another faith: opinion -50. | Leaders quarrel: each decade a roll may split the realm between two leaders (a pretender rising). | Food is no longer your limit, but trade and faith become your weak points. | faith: The movement's faith is imposed; other houses of worship are closed (their clergy become homeless).; land: Food above each family's need goes to the sacred treasury each harvest, so castle stores fill fast.; decrees: sacred\_treasury, open\_the\_granaries; locks: grant\_fief, sell\_title; grievances end: harsh\_lord, hungry; grievances add: wrong\_faith; towns: Market folk slots halve: private trade is restricted. |
| mahdiyya | mahdiyya | The Mahdist state | holy\_rule | replaced | Tribal chiefs become emirs of the Ansar banners. The ruler may move whole tribes to the capital to keep them close. | revolutionary\_regime | The old ruler and its overlord: opinion -50 and a reason to fight for 20 years. | The Mahdi may die within a few years (a roll each year); a successor must face the Mahdi's kinsmen as pretenders. Moving tribes empties farmland: famine risk doubles. | A holy army without equal in numbers but with old weapons: you win by masses and faith, and lose to guns. | church: The old law books are burned: the Mahdi's rulings replace the law schools.; faith: Wrong faith for every other teaching, Sufi orders of other paths included.; levy: Every believer can be called to the banners.; decrees: call\_the\_faithful, sacred\_treasury, gather\_the\_tribes; locks: hire\_companies; grievances end: heavy\_taxes, foreign\_rule; trade: Trade with the old ruler's lands is closed; caravans pay the treasury only. |
| town\_league | town\_league | League of towns | diet\_monarchy | kept | Kept, but they cannot take a town's land. | revolutionary\_regime | Other crowns with restless towns: opinion -20. | Towns refuse wars far from home. | Your gold comes from loans and consent, not decree; towns grow fast. | land: Raising a tax rate needs the towns' consent (an assembly vote).; decrees: ask\_the\_towns, call\_the\_assembly; locks: revoke\_charter, crushing\_taxes; grievances end: broken\_charter; towns: Every town gets a town law charter. Towns lend money cheaply. |
| estates\_republic | estates\_republic | Republic of the estates | merchant\_republic | elected | Become merchant houses: same card, but their wants are trade cities, ships and monopolies, and they lend you money. | revolutionary\_regime | Trade cities and other republics: opinion +20. | A war commander from the leading house may try to make the office hereditary (a stadholder event). | You fight with money: loans, paid companies and fleets instead of levies. | levy: Small levy; paid companies are cheaper by a quarter.; decrees: sell\_bonds, charter\_a\_company, ask\_the\_towns; locks: crushing\_taxes; grievances end: broken\_charter; trade: Merchants +2; a chartered company can be founded (company design). |
| commonwealth | commonwealth | Commonwealth of the army | constitutional\_republic | deposed | Lords who fought for the king lose their land to the state; the rest keep it but lose any office. | revolutionary\_regime, emigre\_court | Monarchies: opinion -40; a counter-revolution reason to fight you for 20 years. | Generals who grow too big (warfare 4.6) are twice as likely; a successful one becomes Protector and the regime becomes court\_absolutism or restored\_monarchy. | The army is your government: strong and cheap to keep, but it can take power. | church: Bishops' lands are sold; the minority sects of the state faith get tolerance.; levy: A standing army trained to one model: standing regiments cost a third less and train faster (recruiting 4.5).; decrees: army\_council, sell\_church\_lands; locks: call\_the\_lords |
| crown\_and\_assembly | crown\_and\_assembly | Crown and assembly | constitutional\_monarchy | kept | Kept. Seizing a lord's land needs a trial before the assembly. | revolutionary\_regime | Countries that hold the same regime: opinion +15. | If the assembly refuses three votes in ten years, the ruler may try a coup (a reaction spark). | Every big decision needs consent, and in return money is cheap and the realm is steady. | land: Raising any tax rate, and declaring a war of conquest, need an assembly vote.; decrees: call\_the\_assembly, sell\_bonds; locks: crushing\_taxes; grievances end: broken\_charter; trade: Public debt: interest halved, the loan limit doubled.; form before g14: diet\_monarchy |
| court\_absolutism | court\_absolutism | Absolute monarchy at court | absolute\_monarchy | kept | Lords are drawn to court: their retinues halve, their loyalty falls half as fast, and seizing land makes the others waver one step less. | reaction\_regime | None. | A child ruler or a long regency undoes it: lords leave court (a lords' rising spark). | You win the long game against the lords: fewer retinues, more officials, a richer court. | land: Intendants: your officials may be sent into lords' provinces as overseers.; decrees: summon\_to\_court, intendants |
| princes\_compact | princes\_compact | Compact of the princes | elective\_monarchy | kept | The great lords win: each gets his want, and none can be tried or seized from for 30 years. | none | Rivals may bribe your lords at half price. | Lords' retinues outgrow yours; any new crisis is a lords' rising. | The realm is run for the lords: you rule by bargaining with them. | decrees: none; locks: seize\_land |
| federal\_republic | federal\_republic | Federal republic | constitutional\_republic | elected | There are none: land belongs to farming families and market folk. | revolutionary\_regime | Old colonial powers: opinion -20 for 20 years. | Provinces with different trade goods can quarrel: a separatist sign if one region's wares make up most of the income. | Cheap, self-run provinces and fast settlement, but a weak centre in war. | levy: Militia: farmers can be levied for defence at no gold cost; a standing army needs an assembly vote.; land: Each province elects its own official, free of wages, with a random type.; decrees: call\_the\_assembly, settle\_the\_frontier; locks: grant\_fief, sell\_title, crushing\_taxes; grievances end: harsh\_lord, ungoverned |
| revolutionary\_republic | revolutionary\_republic | Revolutionary republic | constitutional\_republic | deposed | Abolished. Their land returns to the state; the lords go abroad as pretenders (province stats 10.1) and pay rivals to fight you. | revolutionary\_regime, emigre\_court | Every monarchy: opinion -50; they gain a counter-revolution reason to fight you for 25 years. | Generals who grow too big (warfare 4.6) are twice as likely, and a winning one can end the republic. | You must run every province with officials and can arm the whole nation, while every king wants you gone. | church: Church land is seized and sold; house-of-worship slots halve, and the clergy who lose their slots become homeless.; faith: No state faith for faith grievances: Wrong faith ends everywhere; Pious lords and clergy everywhere waver.; levy: The mass levy is open: every class can be called.; decrees: levy\_en\_masse, sell\_church\_lands, revolutionary\_tribunal; locks: grant\_fief, sell\_title, call\_the\_lords; grievances end: harsh\_lord, wrong\_faith; grievances add: broken\_charter; tongue: Schools teach in the state language (culture design): the language mix moves twice as fast toward it. |
| free\_republic | free\_republic | Free republic | constitutional\_republic | replaced | Planters' land is taken by the state and given out as family farms. | revolutionary\_regime | Slave-holding countries: opinion -60 and no trade pacts for 30 years; they may demand payment for recognition (an indemnity event). | Isolation: trade income halves while the old powers refuse to recognise you. | Freedom is defended with every farmer; the old export economy is gone and the world shuns you. | levy: The whole people defend the land: every farmer is a recruit for defensive wars.; land: Everyone held in slavery is free. Plantation tiles stay state estates worked for wages, or are split into family farms (divide\_the\_estates): split tiles lose two thirds of their export wares and grow half again as much food.; decrees: arm\_the\_people, divide\_the\_estates; locks: grant\_fief, sell\_title; grievances end: harsh\_lord |
| creole\_republic | creole\_republic | Republic of the landowners | constitutional\_republic | elected | Big landowners stay as lords; commanders who win battles can become lords too. | revolutionary\_regime | The old crown: a reconquest reason for 15 years. | A commander with a big army may seize the presidency (a pretender rising led by a general). | The republic is held together by pacts with landowners and generals. | decrees: caudillos\_pact, call\_the\_assembly |
| parliamentary\_republic | parliamentary\_republic | Parliamentary republic | constitutional\_republic | deposed | Titles lose their legal privileges; lords keep their land as private owners but no longer govern it (it needs your officials). | revolutionary\_regime, emigre\_court | Other parliamentary countries: opinion +15. | In a crisis (war lost, mass unemployment among craftsmen) extremist risings of left and right both grow. | Officials run the land the lords used to govern, and every big decision goes through the assembly. | land: Tax rates and war need an assembly vote; elections every few years can change the ruling party's priorities (AI personality shifts).; decrees: call\_the\_assembly, sell\_bonds; locks: grant\_fief, sell\_title; grievances end: harsh\_lord; trade: Public debt at the regime's low interest. |
| committee\_rule | committee\_rule | Rule of the committee | constitutional\_monarchy | kept | Kept, but army officers sit beside them. | revolutionary\_regime | None. | Homelands of other languages raise separatist signs faster. | Officers run the provinces and push one nation's language: strong in war, hard on minorities. | decrees: officers\_to\_the\_provinces, call\_the\_assembly; grievances add: foreign\_rule; tongue: The state language is pushed in schools and offices: the language mix moves faster toward it, Foreign rule grows in other homelands.; power base add: army |
| warlord\_republic | warlord\_republic | Republic of the generals | constitutional\_republic | elected | Commanders holding armies in a province become lords of it (warlords). They keep its tax and recruits. | revolutionary\_regime | Foreign powers may back a warlord (a hostile act). | Warlords make war on each other; a strong one may declare himself ruler. | The country is a map of generals: you reunite it by buying, beating or outlasting them. | decrees: buy\_a\_warlord, caudillos\_pact; form note: The form holds no lord weight, so every warlord is over the limit and slips (government 2.3): reunification is a fight against that drift. |
| secular\_republic | secular\_republic | Secular national republic | party\_state | elected | Abolished; old titles have no legal force. | revolutionary\_regime | None. | Pious provinces resist: a faith rising sign for 20 years. | A fast-modernising state built on schools and officials, with the devout provinces against you. | church: Religious courts and schools close; their judges and teachers become state officials or leave.; decrees: script\_and\_schools, sell\_church\_lands; locks: grant\_fief, sell\_title; grievances add: wrong\_faith; tongue: Script and school reform: literacy grows twice as fast for 20 years (culture design).; research: Schools cost a quarter less. |
| agrarian\_reform | agrarian\_reform | Land to the villages | keep | kept | Lords lose their farm tiles; those go to the villages, which pay light tax and need no lord. | revolutionary\_regime | Foreign owners of estates or mines: opinion -30. | Landowners still holding estates fund risings for 20 years. | Farmers are calm and fed, lords are weak, but the export money shrinks. | land: Village tiles: light tax that cannot be raised, Harsh lord ends, food +10 %. Export wares from estate tiles fall by a third.; decrees: divide\_the\_estates; locks: grant\_fief, sell\_title; grievances end: harsh\_lord |
| new\_dynasty | new\_dynasty | New dynasty from the rising | keep | replaced | Every lord starts Wavering. Lords who fought the rising lose their land. | emigre\_court | Tributary overlords may demand recognition (subjects design). | The old dynasty's heirs are pretenders for 50 years. | You start again with a clean slate of grievances, but every lord and the old dynasty test you. | land: Tax is light everywhere for 10 years.; decrees: open\_the\_granaries; grievances end: heavy\_taxes, hungry |
| peasant\_directorates | peasant\_directorates | Peasant directorates | keep | kept | Kept elsewhere; in the risen provinces local directorates run affairs. | none | Neighbours who fear the movement get a reason to send troops 'to restore order' (an intervention hook). | If the directorates are dissolved, every risen province gets Broken charter. | Part of the realm runs itself: calm and cheap, outside your control. | land: Risen provinces are run by a directorate: free, acts as a judge, tax light.; decrees: local\_directorates; grievances end: heavy\_taxes, harsh\_lord; form note: Directorate provinces are self-run (government 3.3) even though the form is not a kin or commune form. |
| emancipation | emancipation | End of bondage |  |  | Lords' farm tiles lose a third of their workers' dues: lords' wealth -30 %. | none | None. | Lords waver one step at once. | Towns and armies gain people; lords lose their hold on the land. | levy: Levy share of farmers +25 %.; land: Farmers may leave for towns: overflow can move to neighbouring provinces' town slots.; grievances end: harsh\_lord; add on: yes |
| swarajya | swarajya | Swarajya (self-rule) | household\_realm | replaced | No new land grants: ministers, officials and fort commanders are paid in gold, not land. A council of eight ministers are your officials. | none | The empire it broke from: opinion -50 and a reason to fight for 30 years. | When the founder's line weakens, the chief minister's office turns hereditary and the generals' houses drift apart: the realm can become a confederation (form confederation). | Raid, don't hold: horsemen collect tribute from neighbours' provinces while hill forts keep your own, and paid officials keep the land the crown's. | levy: Light cavalry and hill infantry; a fleet on the home coast.; decrees: protection\_tribute, garrison\_hill\_forts; locks: grant\_fief, sell\_title |
| khalsa\_raj | khalsa\_raj | Rule of the Khalsa | absolute\_monarchy | replaced | Band chiefs keep land only while they and their horsemen serve in the army. | none | None at first; the company and empires on its borders watch its army. | Everything rests on the ruler: at the ruler's death the army's regimental councils may rule and raise pretenders. | A small realm with a modern army: drilled regiments cost far more than horsemen, and you pay for them by keeping every faith at peace. | faith: Ministers and soldiers of every faith: no Wrong faith grievance anywhere, and persecution is locked.; levy: A standing army of drilled regiments and guns, trained by hired foreign officers, in place of band horsemen.; decrees: hire\_drill\_masters, summon\_to\_court; locks: persecute; grievances end: wrong\_faith |
| misl\_confederacy | misl\_confederacy | Confederacy of the bands | confederation | elected | Each band's chief holds the land its horsemen won. The chiefs meet twice a year at the holy city and choose a war leader. | none | None. | Bands fight each other when there is no common enemy: every 10 years without a war, a roll may make a chief Disloyal. | Many chiefs and fast horsemen: cheap to run and hard to conquer, but no one can make them build or march far. | levy: Fast horsemen only; no siege trains.; decrees: protection\_tribute; locks: grant\_fief, sell\_title |
| service\_state | service\_state | Service state | absolute\_monarchy | kept | Lords must serve: each gives a son as an official or a commander, or loses a province. | none | None. | Old guards and clergy rise once (an old-order rising) within 10 years. | Lords become your officers and officials; you catch up fast and the old guard resents it. | levy: Recruits are drawn by quota from every province (a fixed share), even lords' lands.; decrees: table\_of\_ranks, missions\_abroad; grievances add: conscription; research: Foreign specialists cost half; one research branch of your choice is a third cheaper for 30 years. |
| restoration\_state | restoration\_state | Restored central rule | constitutional\_monarchy | kept | Lords' domains are abolished: their land becomes royal provinces and the lords get a pension (gold each year for 20 years). | revolutionary\_regime | None. | Former retainers of the lords rise once within 10 years (an old-order rising). | You buy out the lords and run everything with officials, conscripts and borrowed knowledge. | levy: Conscription: every class can be levied; standing regiments are the norm.; decrees: abolish\_domains, missions\_abroad; locks: grant\_fief, sell\_title, call\_the\_lords; grievances add: conscription; research: Foreign specialists cost half; research one era behind the leader costs half. |
| military\_kingdom | military\_kingdom | Age-regiment kingdom | keep | kept | Chiefs keep their land but their young men serve the king in age regiments. | none | Neighbours: opinion -20. | Long service with no war breeds discontent among the regiments. | A permanent, drilled army from the people, paid for in births. | levy: Age regiments: a fixed share of young men serve for years; they may not marry while serving (births -10 %).; decrees: call\_the\_age\_regiment |
| regional\_armies | regional\_armies | Provincial armies | keep | kept | Your governors (officials) may raise their own armies; each that does becomes a lord with a retinue. | none | None. | Strong governors grow into warlords if the centre weakens (warlord\_republic follows a dynasty's fall). | The dynasty survives by letting its governors arm, and slowly loses the provinces to them. | decrees: raise\_provincial\_army |
| soviet\_state | soviet\_state | Council state | party\_state | deposed | Abolished, with their land: it goes to the farmers, later to collective farms. | revolutionary\_regime, emigre\_court | Every non-communist country: opinion -60; intervention reason for 5 years. | Civil war against the old order for the first years; famine if grain is requisitioned in a failed harvest. | Everything is run by the state through officials and councils; you can mobilise all of it, at the cost of hunger and isolation. | church: Church land seized; houses of worship close one a year.; levy: Every class can be levied; commissars sit beside commanders (desertion halved).; land: Farms belong to villages, then collectives: for 10 years food -20 %, then +10 %.; decrees: requisition\_grain, revolutionary\_tribunal, levy\_en\_masse, divide\_the\_estates; locks: grant\_fief, sell\_title, call\_the\_lords, hire\_companies; grievances end: harsh\_lord; grievances add: requisitioned; trade: Market folk slots halve; factories belong to the state. |
| reaction | reaction | Reaction | keep | kept | Loyal lords who fought for you gain one province each from the rebels' land. | reaction\_regime | Other crowns: opinion +20. | The signs come back: the revolution's need is one sign lower for 20 years. | Order is back and the lords are pleased, but the ideas are only underground. | decrees: censorship; grievances add: bloodshed |
| restored\_monarchy | restored\_monarchy | Restored monarchy | old\_form | replaced | Émigré lords return and get back half their old land; the rest stays with its new holders. | reaction\_regime | Monarchies: opinion +30; the counter-revolution reason ends. | If the restored ruler revokes the revolution's charters, the revolution can fire again. | The crown is back, but the revolution's land sales and officials remain: a mixed realm. | land: Church land that was sold stays sold.; decrees: none; flags clear: revolutionary\_regime, emigre\_court |

## Decrees

| Name | id | name | card | cost | limit | does |
|---|---|---|---|---|---|---|
| call\_the\_faithful | call\_the\_faithful | Call the faithful | country | No gold; 1 stability | Once every 5 years | Raise a levy of every class of the state faith at twice the farmers' share, at once. They go home after one campaign season. |
| convert\_by\_decree | convert\_by\_decree | Convert by decree | province | Gold by the province's people | One province at a time | Chaplains in the province work three times as fast for 10 years. Provinces of another faith get Wrong faith twice over while it runs. |
| appoint\_emir | appoint\_emir | Appoint a governor | province | Gold gift | When a governor dies or is removed | Choose a new governor (lord) for a returned province from your officials, commanders or a local family. The appointee starts Loyal. |
| sacred\_treasury | sacred\_treasury | Fill the sacred treasury | country | Each province's surplus food | Each harvest | Every province sends its food above the people's need to the castle stores. No province can go Hungry while stores hold, but market folk lose work. |
| open\_the\_granaries | open\_the\_granaries | Open the granaries | province | Castle store food | Any time | Hand castle food to a province: Hungry ends there, and the province calms one step. |
| ask\_the\_towns | ask\_the\_towns | Ask the towns | country | A town charter promise | Once every 3 years | Borrow from the towns at half the usual interest. Refusing their next request costs Broken charter in every town. |
| call\_the\_assembly | call\_the\_assembly | Call the assembly | country | One season | Any time | Put a tax rise or a war of conquest to the assembly. It agrees when fewer than a third of provinces have grievances and the realm is not deep in debt; a yes gives the act without grievance penalties. |
| sell\_bonds | sell\_bonds | Sell bonds | country | Interest each year | Up to the loan limit | Borrow from the public at the regime's low interest rate. |
| charter\_a\_company | charter\_a\_company | Charter a company | country | Gold and two merchants | One per ocean | Found a trading company that buys ships and trading posts with merchant houses' money (company and trade designs). |
| army\_council | army\_council | Army council | country | None | Any time | Let the army decide a policy (war, peace, a purge): the act costs no stability, but generals gain influence and a coup grows more likely. |
| sell\_church\_lands | sell\_church\_lands | Sell church lands | country | Clergy and Pious lords waver | Once | Gold equal to ten years of the state church's tile income; church tiles pass to buyers (market folk and lords). |
| levy\_en\_masse | levy\_en\_masse | Levy of the whole nation | country | Conscription grievance everywhere for 3 years | While at war | Every class can be levied at the farmers' share; the levy screen's caps double for one war. |
| revolutionary\_tribunal | revolutionary\_tribunal | Revolutionary tribunal | country | Bloodshed in the provinces of those tried | Any time | Try disloyal lords, officers or pretenders' backers: they are removed at once. Scholars may flee abroad. |
| arm\_the\_people | arm\_the\_people | Arm the people | country | Tools and old weapons only | Defensive wars | Every farmer becomes a recruit for this war; they fight with locals-know-the-land bonuses in their own provinces. |
| divide\_the\_estates | divide\_the\_estates | Divide the estates | province | The lord or owner of the tiles turns Disloyal | One province a season | Split estate and plantation tiles into family farms: Harsh lord ends, food +, export wares -. |
| settle\_the\_frontier | settle\_the\_frontier | Open the frontier | country | Indigenous homelands get Foreign rule and a resistance (province stats 12.3) | Any time | Homeless and farmers may move to free tiles on the frontier as settlers at no cost. Shown with the harm it does to the people already there. |
| caudillos\_pact | caudillos\_pact | General's pact | country | Provinces granted | Any time | Make a commander a lord over the provinces his army holds, in return for loyalty and his retinue in your wars. |
| summon\_to\_court | summon\_to\_court | Summon to court | country | Gold for the court each year | Any time | Call a lord to live at court: his retinue halves, his loyalty is fixed at Wavering or better while he stays. |
| intendants | intendants | Send an intendant | province | An official's wage | One per lord | Place one of your officials in a lord's province as overseer: you get a quarter of its tax and the official's type effect. |
| censorship | censorship | Censorship | country | Scholars -10 % a year while on | Toggle | New ideas spread half as fast in your realm; presses and schools slow. |
| local\_directorates | local\_directorates | Recognise the directorates | province | No tax rise there | Risen provinces only | Keep a directorate as the province's government: it acts as a free judge and keeps the province calm. |
| abolish\_domains | abolish\_domains | Abolish the domains | country | Pensions: each lord's yearly income, for 20 years | Once | Every lord's land becomes royal land at once; lords become pensioners. Needs officials for every province. |
| missions\_abroad | missions\_abroad | Missions abroad | country | Gold and two scholars | Once every 10 years | Send scholars to a leading country: the next three inventions you research that it already has cost half. |
| table\_of\_ranks | table\_of\_ranks | Ranks for service | country | None | Toggle | Officials and commanders can earn a lordship by service; old lords must serve or lose a province. |
| call\_the\_age\_regiment | call\_the\_age\_regiment | Call an age regiment | country | Births -10 % while serving | One age set at a time | Every young man of one age set joins a standing regiment, already trained. |
| officers\_to\_the\_provinces | officers\_to\_the\_provinces | Officers to the provinces | country | Commanders taken from the army | Any time | Make commanders officials: they run provinces as wardens or muster masters, at no wage. |
| buy\_a\_warlord | buy\_a\_warlord | Buy a warlord | country | Gold, by the warlord's army | Any time | A warlord accepts your rule: his provinces become royal and his men join your army. |
| requisition\_grain | requisition\_grain | Requisition grain | country | Requisitioned grievance in every farming province | Each harvest | Take a share of every village's harvest for the towns and the army. |
| script\_and\_schools | script\_and\_schools | New script and schools | country | Scholars retrain: research -25 % for 5 years | Once | Literacy grows twice as fast for 20 years; old religious schools close. |
| raise\_provincial\_army | raise\_provincial\_army | Let a governor raise an army | province | The official becomes a lord with a retinue | Any time | A governor raises troops from his province at his own cost to fight a rising or an invader. |
| gather\_the\_tribes | gather\_the\_tribes | Gather a tribe at the capital | province | The province loses a third of its people; its lord's retinue moves with them | Once every 5 years | Move a tribe's people to the capital: the capital grows and the tribe's lord serves at court, but the province empties and can go Hungry. |
| protection\_tribute | protection\_tribute | Demand protection tribute | province | The province's owner: opinion -20 | Neighbouring provinces only | Demand a share of a neighbour's province tax each year (a quarter for Maratha chauth, a fifth for Sikh rakhi) in return for not raiding it. If refused, your horsemen raid it: Burned homes there, loot for you. |
| garrison\_hill\_forts | garrison\_hill\_forts | Garrison the hill forts | province | Gold for each fort's three officers | Hill and mountain provinces | Forts in hill and mountain provinces build at half cost and hold sieges twice as long; each counts as a free judge for that province. |
| hire\_drill\_masters | hire\_drill\_masters | Hire foreign drill masters | country | Gold each year; Proud lords waver | Up to 3 at once | Foreign officers train your regiments: new infantry and guns get the drill of the most advanced neighbour you trade with. |

## Revolutions

### Kaga ikko ikki

| Key | Value |
|---|---|
| `family` | faith |
| `country` | $governor |
| `cause` | faith |
| `keep_trigger` | no |

#### Requirements

| Name | period active | owns |
|---|---|---|
| 1 | p\_sengoku\_and\_unification |  |
| 2 |  | who: $governor; where: area:hokuriku; min\_share: 0.5 |

#### Signs

| Key | Value |
|---|---|
| `need` | 3 |
| `warn_at` | 2 |

##### List

| Name | label | ease | if |
|---|---|---|---|
| 1 | The Pure Land teaching has a fifth of Japan | Give the temples land, or make their abbots your lords | ideology: (who: region:japan; id: devotional\_reform; op: \>=; value: 0.2) |
| 2 | Kaga is restless | Lower taxes there; send a judge | stat: (who: area:hokuriku; stat: unrest; op: \>=; value: 35) |
| 3 | Heavy taxes in a third of Kaga | Lower the tax rate | grievance: (who: area:hokuriku; id: heavy\_taxes; op: \>=; value: 0.3) |
| 4 | Two or more lords waver | Win back your lords before the temples do | lords: (who: $governor; measure: wavering\_or\_worse; op: \>=; value: 2) |
| 5 | The governor's house is weak | Raise stability | stat: (who: $governor; stat: stability; op: \<=; value: -1) |

#### Sparks

| Name | label | mult | if | foreign backing |
|---|---|---|---|---|
| 1 | The governor takes men away to fight elsewhere | 3 | at\_war: (who: $governor) |  |
| 2 | A quarrel over the governor's succession | 2 | flag: (who: $governor; id: succession\_dispute) |  |
| 3 | Foreign gold backs the movement | 2 | flag: (who: $governor; id: revolution\_funded) | yes |

#### Stances

| Key | Value |
|---|---|
| `league_rule` | path |
| `suppress_the_league` | fight |
| `tolerate_the_temples` | bend |

#### Camps

| Name | joins | only of faith | lords | army | clergy |
|---|---|---|---|---|---|
| revolution | homeless: 0.3; farmers: 0.1; clergy: 0.3; craftsmen: 0.08; market\_folk: 0.08 | yes | Lords of the movement's faith who are Wavering or worse | Soldiers of the movement's faith desert at 5 % a month |  |
| old\_order |  |  | Lords of other faiths, and every Loyal lord |  | Clergy of the state faith |

#### Wave

| Key | Value |
|---|---|
| `kind` | religion |
| `amount` | 0.05 |
| `where` | neighbours |

#### Rearm

| Key | Value |
|---|---|
| `grace_years` | 3 |
| `after.suppress_the_league` | rising\_crushed |
| `after.tolerate_the_temples` | chosen |

### Safavid rise

| Key | Value |
|---|---|
| `family` | faith |
| `country` | $host\_state |
| `cause` | faith |
| `keep_trigger` | no |

#### Requirements

- exists: $host\_state

#### Signs

| Key | Value |
|---|---|
| `need` | 3 |
| `warn_at` | 2 |

##### List

| Name | label | ease | if |
|---|---|---|---|
| 1 | Qizilbash devotion in Azerbaijan | Patronise the order's rivals; keep its sheikh at court | ideology: (who: area:azerbaijan; id: qizilbash\_messianism; op: \>=; value: 0.3) |
| 2 | The realm is unstable | Raise stability | stat: (who: $host\_state; stat: stability; op: \<=; value: -1) |
| 3 | The ruling house is split over the succession | Settle the succession | flag: (who: $host\_state; id: succession\_crisis) |
| 4 | Two or more lords are disloyal | Win back the clan chiefs | lords: (who: $host\_state; measure: disloyal\_or\_worse; op: \>=; value: 2) |
| 5 | Azerbaijan is restless | Lower taxes there | stat: (who: area:azerbaijan; stat: unrest; op: \>=; value: 30) |

#### Sparks

| Name | label | mult | if | foreign backing |
|---|---|---|---|---|
| 1 | The ruler has just died | 3 | flag: (who: $host\_state; id: ruler\_died) |  |
| 2 | Foreign gold backs the movement | 2 | flag: (who: $host\_state; id: revolution\_funded) | yes |

#### Stances

| Key | Value |
|---|---|
| `impose_twelver_shiism` | path |
| `sufi_ecumenical_state` | path |

#### Camps

| Name | joins | only of faith | lords | army | clergy |
|---|---|---|---|---|---|
| revolution | homeless: 0.3; farmers: 0.1; clergy: 0.3; craftsmen: 0.08; market\_folk: 0.08 | yes | Lords of the movement's faith who are Wavering or worse | Soldiers of the movement's faith desert at 5 % a month |  |
| old\_order |  |  | Lords of other faiths, and every Loyal lord |  | Clergy of the state faith |

#### Wave

| Key | Value |
|---|---|
| `kind` | religion |
| `amount` | 0.05 |
| `where` | neighbours |

#### Rearm

| Key | Value |
|---|---|
| `grace_years` | 3 |
| `after.sufi_ecumenical_state` | chosen |

### Khalsa founded

| Key | Value |
|---|---|
| `family` | faith |
| `country` | $empire |
| `cause` | faith |
| `keep_trigger` | no |

#### Requirements

- religion\_share: (where: area:punjab; religion: sikh; op: \>=; value: 0.05)

#### Signs

| Key | Value |
|---|---|
| `need` | 2 |
| `warn_at` | 1 |

##### List

| Name | label | ease | if |
|---|---|---|---|
| 1 | Other faiths are persecuted in Punjab | End the persecution | flag: (who: area:punjab; id: religious\_persecution\_active) |
| 2 | Religious zeal grips the court | Favour tolerant advisers | ideology: (who: $empire; id: religious\_zeal; op: \>=; value: 0.5) |
| 3 | Wrong faith in a fifth of Punjab | Tolerate Sikh worship; lift the pilgrim taxes | grievance: (who: area:punjab; id: wrong\_faith; op: \>=; value: 0.2) |
| 4 | Hill chiefs and landholders squeeze the villages | Curb the landholders' dues | grievance: (who: area:punjab; id: harsh\_lord; op: \>=; value: 0.3) |
| 5 | Punjab is restless | Lower taxes there; send a judge | stat: (who: area:punjab; stat: unrest; op: \>=; value: 30) |

#### Sparks

| Name | label | mult | if | foreign backing |
|---|---|---|---|---|
| 1 | Your armies are worn out by a long war elsewhere | 1.5 | stat: (who: $empire; stat: war\_weariness; op: \>=; value: 10) |  |
| 2 | Foreign gold backs the movement | 2 | flag: (who: $empire; id: revolution\_funded) | yes |

#### Stances

| Key | Value |
|---|---|
| `khalsa` | path |
| `quietism` | path |

#### Camps

| Name | joins | only of faith | lords | army | clergy |
|---|---|---|---|---|---|
| revolution | homeless: 0.3; farmers: 0.1; clergy: 0.3; craftsmen: 0.08; market\_folk: 0.08 | yes | Lords of the movement's faith who are Wavering or worse | Soldiers of the movement's faith desert at 5 % a month |  |
| old\_order |  |  | Lords of other faiths, and every Loyal lord |  | Clergy of the state faith |

#### Wave

| Key | Value |
|---|---|
| `kind` | religion |
| `amount` | 0.05 |
| `where` | neighbours |

#### Rearm

| Key | Value |
|---|---|
| `grace_years` | 3 |
| `after.khalsa` | chosen |
| `after.quietism` | chosen |

### Futa jallon jihad

| Key | Value |
|---|---|
| `family` | faith |
| `country` | $movement |
| `cause` | faith |
| `keep_trigger` | no |

#### Requirements

- religion\_share: (where: area:futa\_jallon; religion: sunni; op: \>=; value: 0.3)

#### Signs

| Key | Value |
|---|---|
| `need` | 2 |
| `warn_at` | 1 |

##### List

| Name | label | ease | if |
|---|---|---|---|
| 1 | Reformist scholars have a following across West Africa | Invite the scholars into your council | ideology: (who: region:west\_africa; id: islamic\_reformism; op: \>=; value: 0.2) |
| 2 | The highlands are restless | Lower taxes; stop raiding the herders | stat: (who: area:futa\_jallon; stat: unrest; op: \>=; value: 25) |
| 3 | Muslims ruled by rulers of another faith | A faith tolerance charter | grievance: (who: area:futa\_jallon; id: wrong\_faith; op: \>=; value: 0.3) |

#### Sparks

| Name | label | mult | if | foreign backing |
|---|---|---|---|---|
| 1 | Reformist teaching is at its height | 2 | ideology: (who: region:west\_africa; id: islamic\_reformism; op: \>=; value: 0.3) |  |
| 2 | Foreign gold backs the movement | 2 | flag: (who: $movement; id: revolution\_funded) | yes |

#### Stances

| Key | Value |
|---|---|
| `almamate` | path |
| `clerical_network` | path |

#### Camps

| Name | joins | only of faith | lords | army | clergy |
|---|---|---|---|---|---|
| revolution | homeless: 0.3; farmers: 0.1; clergy: 0.3; craftsmen: 0.08; market\_folk: 0.08 | yes | Lords of the movement's faith who are Wavering or worse | Soldiers of the movement's faith desert at 5 % a month |  |
| old\_order |  |  | Lords of other faiths, and every Loyal lord |  | Clergy of the state faith |

#### Wave

| Key | Value |
|---|---|
| `kind` | religion |
| `amount` | 0.05 |
| `where` | neighbours |

#### Rearm

| Key | Value |
|---|---|
| `grace_years` | 3 |
| `after.clerical_network` | chosen |

### Sokoto jihad

| Key | Value |
|---|---|
| `family` | faith |
| `country` | $hausa\_kings |
| `cause` | faith |
| `keep_trigger` | no |

#### Requirements

- exists: hausa\_states

#### Signs

| Key | Value |
|---|---|
| `need` | 3 |
| `warn_at` | 2 |

##### List

| Name | label | ease | if |
|---|---|---|---|
| 1 | Reformist teaching is strong in Hausaland | Bring the reformers into your court | ideology: (who: area:hausaland; id: islamic\_reformism; op: \>=; value: 0.3) |
| 2 | Hausaland is restless | Lower taxes | stat: (who: area:hausaland; stat: unrest; op: \>=; value: 30) |
| 3 | Taxes on herders and markets the reformers call unjust | Cut the cattle and market taxes | grievance: (who: area:hausaland; id: heavy\_taxes; op: \>=; value: 0.3) |
| 4 | Forced service in the kings' wars | End the levy | grievance: (who: area:hausaland; id: conscription; op: \>=; value: 0.2) |
| 5 | A reform state already stands in Futa Jallon | Nothing: it is an example | event: futa\_jallon\_jihad |

#### Sparks

| Name | label | mult | if | foreign backing |
|---|---|---|---|---|
| 1 | The king moves against the reformers' community | 3 | flag: (who: $hausa\_kings; id: religious\_persecution\_active) |  |
| 2 | Foreign gold backs the movement | 2 | flag: (who: $hausa\_kings; id: revolution\_funded) | yes |

#### Stances

| Key | Value |
|---|---|
| `caliphate` | path |
| `reformed_hausa_kingdoms` | path |

#### Camps

| Name | joins | only of faith | lords | army | clergy |
|---|---|---|---|---|---|
| revolution | homeless: 0.3; farmers: 0.1; clergy: 0.3; craftsmen: 0.08; market\_folk: 0.08 | yes | Lords of the movement's faith who are Wavering or worse | Soldiers of the movement's faith desert at 5 % a month |  |
| old\_order |  |  | Lords of other faiths, and every Loyal lord |  | Clergy of the state faith |

#### Wave

| Key | Value |
|---|---|
| `kind` | religion |
| `amount` | 0.05 |
| `where` | neighbours |

#### Rearm

| Key | Value |
|---|---|
| `grace_years` | 3 |
| `after.reformed_hausa_kingdoms` | chosen |

### Taiping rebellion

| Key | Value |
|---|---|
| `family` | faith |
| `country` | $dynasty |
| `cause` | faith |
| `keep_trigger` | no |

#### Requirements

- exists: qing

#### Signs

| Key | Value |
|---|---|
| `need` | 3 |
| `warn_at` | 2 |

##### List

| Name | label | ease | if |
|---|---|---|---|
| 1 | The dynasty's right to rule is doubted | Raise legitimacy | stat: (who: qing; stat: legitimacy; op: \<; value: 40) |
| 2 | The south is restless | Officials and judges in the south | stat: (who: region:south\_china; stat: unrest; op: \>=; value: 45) |
| 3 | Food is short across China | Fill the castle stores; open the granaries | stat: (who: region:china; stat: food\_security; op: \<; value: 0.5) |
| 4 | Defeat by a foreign navy | Nothing now: it has happened | event: first\_opium\_war |
| 5 | Many landless men and disbanded soldiers | New buildings; almshouses; settle them on new land | class\_share: (who: qing; class: homeless; op: \>=; value: 0.08) |

#### Sparks

| Name | label | mult | if | foreign backing |
|---|---|---|---|---|
| 1 | Floods or famine in the south | 2 | grievance: (who: region:south\_china; id: hungry; op: \>=; value: 0.3) |  |
| 2 | Foreign gold backs the movement | 2 | flag: (who: $dynasty; id: revolution\_funded) | yes |

#### Stances

| Key | Value |
|---|---|
| `regional_armies_win` | path |
| `taiping_victory` | path |
| `foreign_backed_suppression` | path |

#### Camps

| Name | joins | only of faith | lords | army | clergy |
|---|---|---|---|---|---|
| revolution | homeless: 0.3; farmers: 0.1; clergy: 0.3; craftsmen: 0.08; market\_folk: 0.08 | yes | Lords of the movement's faith who are Wavering or worse | Soldiers of the movement's faith desert at 5 % a month |  |
| old\_order |  |  | Lords of other faiths, and every Loyal lord |  | Clergy of the state faith |

#### Wave

| Key | Value |
|---|---|
| `kind` | religion |
| `amount` | 0.05 |
| `where` | neighbours |

#### Rearm

| Key | Value |
|---|---|
| `grace_years` | 3 |
| `after` | none |

### Mahdist state

| Key | Value |
|---|---|
| `family` | faith |
| `country` | $ruler |
| `cause` | faith |
| `keep_trigger` | no |

#### Requirements

- owns: (who: $ruler; where: area:sudan)

#### Signs

| Key | Value |
|---|---|
| `need` | 3 |
| `warn_at` | 2 |

##### List

| Name | label | ease | if |
|---|---|---|---|
| 1 | Reformist teaching has a fifth of Sudan | Win over the religious teachers; fund the mosques | ideology: (who: area:sudan; id: islamic\_reformism; op: \>=; value: 0.2) |
| 2 | Sudan is restless | Lower taxes there; send a judge | stat: (who: area:sudan; stat: unrest; op: \>=; value: 40) |
| 3 | Heavy taxes in a third of Sudan | Lower the tax rate; stop collecting arrears by force | grievance: (who: area:sudan; id: heavy\_taxes; op: \>=; value: 0.3) |
| 4 | Foreign governors and officers rule Sudan | Appoint local governors | grievance: (who: area:sudan; id: foreign\_rule; op: \>=; value: 0.3) |
| 5 | Your treasury is bankrupt | Pay down the debt | stat: (who: $ruler; stat: debt; op: \>=; value: 2000) |

#### Sparks

| Name | label | mult | if | foreign backing |
|---|---|---|---|---|
| 1 | You have just lost a war | 2 | war\_lost: (who: $ruler; within\_years: 3) |  |
| 2 | Foreign gold backs the movement | 2 | flag: (who: $ruler; id: revolution\_funded) | yes |

#### Stances

| Key | Value |
|---|---|
| `mahdist_independence` | path |
| `negotiated_autonomy` | bend |

#### Camps

| Name | joins | only of faith | lords | army | clergy |
|---|---|---|---|---|---|
| revolution | homeless: 0.3; farmers: 0.1; clergy: 0.3; craftsmen: 0.08; market\_folk: 0.08 | yes | Lords of the movement's faith who are Wavering or worse | Soldiers of the movement's faith desert at 5 % a month |  |
| old\_order |  |  | Lords of other faiths, and every Loyal lord |  | Clergy of the state faith |

#### Wave

| Key | Value |
|---|---|
| `kind` | religion |
| `amount` | 0.05 |
| `where` | neighbours |

#### Rearm

| Key | Value |
|---|---|
| `grace_years` | 3 |
| `after.negotiated_autonomy` | chosen |

### Comuneros revolt

| Key | Value |
|---|---|
| `family` | estates |
| `country` | $crown |
| `cause` | town |
| `keep_trigger` | no |

#### Requirements

- government: (who: $crown; is: monarchy)

#### Signs

| Key | Value |
|---|---|
| `need` | 3 |
| `warn_at` | 2 |

##### List

| Name | label | ease | if |
|---|---|---|---|
| 1 | A new tax forced through in a quarter of the realm | Lower the rate; ask instead of forcing | grievance: (who: $crown; id: heavy\_taxes; op: \>=; value: 0.25) |
| 2 | A ruler not yet trusted (foreign-born, often away) | Raise legitimacy: stay, marry locally, appoint locals | stat: (who: $crown; stat: legitimacy; op: \<; value: 50) |
| 3 | Strong towns: a tenth of the people are craftsmen | Grant town law charters before they demand them | class\_share: (who: $crown; class: craftsmen; op: \>=; value: 0.1) |
| 4 | The heartland is restless | Officials and judges in the towns | stat: (who: area:old\_castile; stat: unrest; op: \>=; value: 30) |
| 5 | Two or more lords waver | Win back your lords | lords: (who: $crown; measure: wavering\_or\_worse; op: \>=; value: 2) |

#### Sparks

| Name | label | mult | if | foreign backing |
|---|---|---|---|---|
| 1 | A new reign has just begun | 2 | flag: (who: $crown; id: ruler\_died) |  |
| 2 | Foreign gold backs the movement | 2 | flag: (who: $crown; id: revolution\_funded) | yes |

#### Stances

| Key | Value |
|---|---|
| `crushed_at_villalar` | fight |
| `royal_concessions` | bend |
| `junta_takes_power` | path |

#### Camps

| Name | joins | lords | army | clergy |
|---|---|---|---|---|
| revolution | homeless: 0.2; market\_folk: 0.15; craftsmen: 0.12; clerks: 0.1; scholars: 0.05; farmers: 0.03 | Disloyal lords join with their retinues | Unpaid soldiers desert at 5 % a month |  |
| old\_order |  | Loyal lords |  | Clergy of the state faith |

#### Wave

| Key | Value |
|---|---|
| `kind` | ideology |
| `id` | parliamentarism |
| `amount` | 0.03 |
| `where` | neighbours |

#### Rearm

| Key | Value |
|---|---|
| `grace_years` | 3 |
| `after.crushed_at_villalar` | rising\_crushed |
| `after.royal_concessions` | chosen |

### Dutch revolt

| Key | Value |
|---|---|
| `family` | estates |
| `country` | $overlord |
| `cause` | town |
| `keep_trigger` | no |

#### Requirements

| Name | owns | religion share |
|---|---|---|
| 1 | who: $overlord; where: area:low\_countries; min\_share: 0.8 |  |
| 2 |  | where: area:low\_countries; religion: protestant; op: \>=; value: 0.15 |

#### Signs

| Key | Value |
|---|---|
| `need` | 2 |
| `warn_at` | 1 |

##### List

| Name | label | ease | if |
|---|---|---|---|
| 1 | The Low Countries are restless | Lower taxes; keep their charters | stat: (who: area:low\_countries; stat: unrest; op: \>=; value: 40) |
| 2 | Your hold there is weak | Officials; a governor they accept | stat: (who: area:low\_countries; stat: control; op: \<; value: 50) |
| 3 | New taxes without the estates' consent | Ask the estates | grievance: (who: area:low\_countries; id: heavy\_taxes; op: \>=; value: 0.3) |
| 4 | Old privileges revoked | Restore the charters | grievance: (who: area:low\_countries; id: broken\_charter; op: \>=; value: 0.2) |
| 5 | Foreign soldiers quartered in the towns | Withdraw them | grievance: (who: area:low\_countries; id: soldiers\_quartered; op: \>=; value: 0.2) |

#### Sparks

| Name | label | mult | if | foreign backing |
|---|---|---|---|---|
| 1 | An inquisition hunts heretics | 2 | flag: (who: $overlord; id: inquisition\_established) |  |
| 2 | Foreign gold backs the movement | 2 | flag: (who: $overlord; id: revolution\_funded) | yes |

#### Stances

| Key | Value |
|---|---|
| `northern_independence` | path |
| `reconciliation` | bend |
| `crushed` | path |

#### Camps

| Name | joins | lords | army | clergy |
|---|---|---|---|---|
| revolution | homeless: 0.2; market\_folk: 0.15; craftsmen: 0.12; clerks: 0.1; scholars: 0.05; farmers: 0.03 | Disloyal lords join with their retinues | Unpaid soldiers desert at 5 % a month |  |
| old\_order |  | Loyal lords |  | Clergy of the state faith |

#### Wave

| Key | Value |
|---|---|
| `kind` | ideology |
| `id` | parliamentarism |
| `amount` | 0.03 |
| `where` | neighbours |

#### Rearm

| Key | Value |
|---|---|
| `grace_years` | 3 |
| `after.reconciliation` | chosen |
| `after.crushed` | chosen |

### Wars of the three kingdoms

| Key | Value |
|---|---|
| `family` | estates |
| `country` | $crown |
| `cause` | town |
| `keep_trigger` | no |

#### Requirements

- exists: england

#### Signs

| Key | Value |
|---|---|
| `need` | 3 |
| `warn_at` | 2 |

##### List

| Name | label | ease | if |
|---|---|---|---|
| 1 | The treasury is empty | Call the assembly for taxes; cut costs | stat: (who: england; stat: treasury; op: \<; value: 0) |
| 2 | Support for the assembly's rights | Call it regularly; honour its votes | ideology: (who: england; id: parliamentarism; op: \>=; value: 0.3) |
| 3 | The northern kingdom resists the crown's church | Leave its church alone | religion\_share: (where: area:scotland; religion: protestant; op: \>=; value: 0.5) |
| 4 | Taxes raised without consent | Lower them; ask first | grievance: (who: england; id: heavy\_taxes; op: \>=; value: 0.25) |
| 5 | Provinces of another faith under the crown | A faith tolerance charter | grievance: (who: england; id: wrong\_faith; op: \>=; value: 0.1) |

#### Sparks

| Name | label | mult | if | foreign backing |
|---|---|---|---|---|
| 1 | A war forces the crown to ask for money | 3 | at\_war: (who: england) |  |
| 2 | Foreign gold backs the movement | 2 | flag: (who: $crown; id: revolution\_funded) | yes |

#### Stances

| Key | Value |
|---|---|
| `commonwealth` | path |
| `royalist_victory` | path |
| `compromise` | bend |

#### Camps

| Name | joins | lords | army | clergy |
|---|---|---|---|---|
| revolution | homeless: 0.2; market\_folk: 0.15; craftsmen: 0.12; clerks: 0.1; scholars: 0.05; farmers: 0.03 | Disloyal lords join with their retinues | Unpaid soldiers desert at 5 % a month |  |
| old\_order |  | Loyal lords |  | Clergy of the state faith |

#### Wave

| Key | Value |
|---|---|
| `kind` | ideology |
| `id` | parliamentarism |
| `amount` | 0.03 |
| `where` | neighbours |

#### Rearm

| Key | Value |
|---|---|
| `grace_years` | 3 |
| `after.compromise` | chosen |

### Fronde

| Key | Value |
|---|---|
| `family` | estates |
| `country` | $realm |
| `cause` | town |
| `keep_trigger` | no |

#### Requirements

- government: (who: $realm; is: monarchy)

#### Signs

| Key | Value |
|---|---|
| `need` | 3 |
| `warn_at` | 2 |

##### List

| Name | label | ease | if |
|---|---|---|---|
| 1 | A child ruler and a regent's minister | Nothing but time; keep the lords close | flag: (who: $realm; id: regency) |
| 2 | A long foreign war | Make peace | at\_war: (who: $realm) |
| 3 | War taxes in a third of the realm | Lower them | grievance: (who: $realm; id: heavy\_taxes; op: \>=; value: 0.3) |
| 4 | Debt above 1,000 gold | Pay it down | stat: (who: $realm; stat: debt; op: \>=; value: 1000) |
| 5 | Three or more lords waver | Gifts, offices, marriages | lords: (who: $realm; measure: wavering\_or\_worse; op: \>=; value: 3) |
| 6 | The people are tired of war | Make peace | stat: (who: $realm; stat: war\_weariness; op: \>=; value: 10) |

#### Sparks

| Name | label | mult | if | foreign backing |
|---|---|---|---|---|
| 1 | A great lord turns against the court | 2 | lords: (who: $realm; measure: disloyal\_or\_worse; op: \>=; value: 2) |  |
| 2 | Foreign gold backs the movement | 2 | flag: (who: $realm; id: revolution\_funded) | yes |

#### Stances

| Key | Value |
|---|---|
| `royal_victory` | fight |
| `parlement_settlement` | bend |
| `princes_prevail` | path |

#### Camps

| Name | joins | lords | army | clergy |
|---|---|---|---|---|
| revolution | homeless: 0.2; market\_folk: 0.15; craftsmen: 0.12; clerks: 0.1; scholars: 0.05; farmers: 0.03 | Disloyal lords join with their retinues | Unpaid soldiers desert at 5 % a month |  |
| old\_order |  | Loyal lords |  | Clergy of the state faith |

#### Wave

| Key | Value |
|---|---|
| `kind` | ideology |
| `id` | parliamentarism |
| `amount` | 0.03 |
| `where` | neighbours |

#### Rearm

| Key | Value |
|---|---|
| `grace_years` | 3 |
| `after.royal_victory` | rising\_crushed |
| `after.parlement_settlement` | chosen |

### Glorious revolution

| Key | Value |
|---|---|
| `family` | estates |
| `country` | $realm |
| `cause` | town |
| `keep_trigger` | no |

#### Requirements

| Name | religion share | any |
|---|---|---|
| 1 | where: england; religion: protestant; op: \>=; value: 0.8 |  |
| 2 |  | (religion: (who: england; is: catholic)), (flag: (who: england; id: catholic\_heir)) |

#### Signs

| Key | Value |
|---|---|
| `need` | 2 |
| `warn_at` | 1 |

##### List

| Name | label | ease | if |
|---|---|---|---|
| 1 | Support for the assembly's rights | Call it; honour its votes | ideology: (who: england; id: parliamentarism; op: \>=; value: 0.3) |
| 2 | Three or more lords waver | Win back your lords | lords: (who: england; measure: wavering\_or\_worse; op: \>=; value: 3) |
| 3 | Town charters recalled by the crown | Restore them | grievance: (who: england; id: broken\_charter; op: \>=; value: 0.1) |

#### Sparks

| Name | label | mult | if | foreign backing |
|---|---|---|---|---|
| 1 | A foreign prince of the majority faith is ready to come | 2 | exists: $invader |  |
| 2 | Foreign gold backs the movement | 2 | flag: (who: $realm; id: revolution\_funded) | yes |

#### Stances

| Key | Value |
|---|---|
| `constitutional_settlement` | lead |
| `royal_absolutism` | fight |

#### Camps

| Name | joins | lords | army | clergy |
|---|---|---|---|---|
| revolution | homeless: 0.2; market\_folk: 0.15; craftsmen: 0.12; clerks: 0.1; scholars: 0.05; farmers: 0.03 | Disloyal lords join with their retinues | Unpaid soldiers desert at 5 % a month |  |
| old\_order |  | Loyal lords |  | Clergy of the state faith |

#### Wave

| Key | Value |
|---|---|
| `kind` | ideology |
| `id` | parliamentarism |
| `amount` | 0.03 |
| `where` | neighbours |

#### Rearm

| Key | Value |
|---|---|
| `grace_years` | 3 |
| `after.royal_absolutism` | rising\_crushed |

### Restoration of charles ii

| Key | Value |
|---|---|
| `family` | restoration |
| `country` | $realm |
| `cause` | pretender |
| `keep_trigger` | no |

#### Requirements

- government: (who: england; is: republic)

#### Signs

| Key | Value |
|---|---|
| `need` | 2 |
| `warn_at` | 1 |

##### List

| Name | label | ease | if |
|---|---|---|---|
| 1 | The republic's right to rule is doubted | Raise legitimacy | stat: (who: england; stat: legitimacy; op: \<; value: 40) |
| 2 | The republic's leader has just died | Nothing: choose a strong successor | flag: (who: england; id: ruler\_died) |
| 3 | The realm is unstable | Raise stability | stat: (who: england; stat: stability; op: \<=; value: -1) |

#### Sparks

- label: Foreign gold backs the movement; mult: 2; foreign\_backing: yes; if: (flag: (who: $realm; id: revolution\_funded))

#### Stances

| Key | Value |
|---|---|
| `restore` | path |
| `keep_republic` | path |

#### Camps

| Name | joins | lords | note |
|---|---|---|---|
| revolution | none | Émigré lords and Loyal lords of the old house | The returning pretender's backers. |
| old\_order |  | Lords and officials who gained land or office under the revolution |  |

#### Wave

| Key | Value |
|---|---|
| `kind` | none |
| `where` | none |

#### Rearm

| Key | Value |
|---|---|
| `grace_years` | 3 |
| `after.keep_republic` | chosen |

### American revolution

| Key | Value |
|---|---|
| `family` | liberal\_national |
| `country` | $metropole |
| `cause` | new\_ideas |
| `keep_trigger` | no |

#### Requirements

- relation: (who: $colonists; other: $metropole; type: subject)

#### Signs

| Key | Value |
|---|---|
| `need` | 3 |
| `warn_at` | 2 |

##### List

| Name | label | ease | if |
|---|---|---|---|
| 1 | Liberal ideas among the colonists | Give the colonies their own assembly | ideology: (who: $colonists; id: liberalism; op: \>=; value: 0.3) |
| 2 | Settlement beyond the mountains forbidden | Open the frontier (at the cost of the peoples living there) | flag: (who: $metropole; id: proclamation\_line\_1763) |
| 3 | A war debt the colonies are asked to share | Pay it from home | stat: (who: $metropole; stat: debt; op: \>=; value: 1000) |
| 4 | A great colonial war has just been won | Nothing: the colonies no longer need protection | event: seven\_years\_war |
| 5 | New taxes without a colonial vote | Repeal them | grievance: (who: $colonists; id: heavy\_taxes; op: \>=; value: 0.3) |
| 6 | Soldiers quartered in colonial towns | Withdraw them | grievance: (who: $colonists; id: soldiers\_quartered; op: \>=; value: 0.2) |

#### Sparks

| Name | label | mult | if | foreign backing |
|---|---|---|---|---|
| 1 | Troops fire on a crowd | 3 | grievance: (who: $colonists; id: bloodshed; op: \>; value: 0) |  |
| 2 | Foreign gold backs the movement | 2 | flag: (who: $metropole; id: revolution\_funded) | yes |

#### Stances

| Key | Value |
|---|---|
| `independence` | path |
| `conciliation_offer` | bend |
| `rebellion_crushed` | path |

#### Camps

| Name | joins | farmers if hungry | lords | army | clergy |
|---|---|---|---|---|---|
| revolution | homeless: 0.3; scholars: 0.25; clerks: 0.15; craftsmen: 0.12; market\_folk: 0.1; farmers: 0.04 | 0.1 | Few: only Disloyal lords with the Ambitious trait | Conscripted soldiers desert at 5 % a month while war weariness is high |  |
| old\_order |  |  | Every Loyal and Wavering lord |  | Clergy of the state faith |

#### Wave

| Key | Value |
|---|---|
| `kind` | ideology |
| `id` | liberalism |
| `amount` | 0.05 |
| `where` | neighbours |

#### Rearm

| Key | Value |
|---|---|
| `grace_years` | 3 |
| `after.conciliation_offer` | chosen |
| `after.rebellion_crushed` | chosen |

### French revolution

| Key | Value |
|---|---|
| `family` | liberal\_national |
| `country` | $realm |
| `cause` | new\_ideas |
| `keep_trigger` | no |

#### Requirements

- government: (who: $realm; is: monarchy)

#### Signs

| Key | Value |
|---|---|
| `need` | 4 |
| `warn_at` | 3 |

##### List

| Name | label | ease | if |
|---|---|---|---|
| 1 | Debt above 2,000 gold | Cut the court and the army; tax the lords | stat: (who: $realm; stat: debt; op: \>=; value: 2000) |
| 2 | A quarter of the people want a constitution | Grant one before they take it | ideology: (who: $realm; id: liberalism; op: \>=; value: 0.25) |
| 3 | The crown is distrusted | Raise stability or legitimacy | any: ((stat: (who: $realm; stat: stability; op: \<=; value: -1)), (stat: (who: $realm; stat: legitimacy; op: \<; value: 40))) |
| 4 | Bread is short in a fifth of the realm | Open the castle stores; import grain | grievance: (who: $realm; id: hungry; op: \>=; value: 0.2) |
| 5 | Lords still hold a third of the land and its dues | Take land back; end the lords' dues | lords: (who: $realm; measure: land\_share; op: \>=; value: 0.3) |
| 6 | Many readers: pamphlets and clubs | Censorship slows it | stat: (who: $realm; stat: literacy; op: \>=; value: 30) |

#### Sparks

| Name | label | mult | if | foreign backing |
|---|---|---|---|---|
| 1 | A volcanic winter ruins the harvest | 2 | event: laki\_eruption |  |
| 2 | A revolution abroad has just won | 1.5 | event: american\_revolution |  |
| 3 | Foreign gold backs the movement | 2 | flag: (who: $realm; id: revolution\_funded) | yes |

#### Stances

| Key | Value |
|---|---|
| `radical_republic` | lead |
| `constitutional_monarchy` | bend |
| `royal_reaction` | fight |

#### Camps

| Name | joins | farmers if hungry | lords | army | clergy |
|---|---|---|---|---|---|
| revolution | homeless: 0.3; scholars: 0.25; clerks: 0.15; craftsmen: 0.12; market\_folk: 0.1; farmers: 0.04 | 0.1 | Few: only Disloyal lords with the Ambitious trait | Conscripted soldiers desert at 5 % a month while war weariness is high |  |
| old\_order |  |  | Every Loyal and Wavering lord |  | Clergy of the state faith |

#### Wave

| Key | Value |
|---|---|
| `kind` | ideology |
| `id` | liberalism |
| `amount` | 0.05 |
| `where` | neighbours |

#### Rearm

| Key | Value |
|---|---|
| `grace_years` | 3 |
| `after.constitutional_monarchy` | chosen |
| `after.royal_reaction` | rising\_crushed |

### Latin american independence

| Key | Value |
|---|---|
| `family` | liberal\_national |
| `country` | $crown |
| `cause` | new\_ideas |
| `keep_trigger` | no |

#### Requirements

| Name | colonial presence | ideology |
|---|---|---|
| 1 | who: $crown; where: region:south\_america; op: \>=; value: 10 |  |
| 2 |  | who: region:south\_america; id: liberalism; op: \>=; value: 0.2 |

#### Signs

| Key | Value |
|---|---|
| `need` | 1 |
| `warn_at` | 0 |

##### List

| Name | label | ease | if |
|---|---|---|---|
| 1 | The crown is captive or deposed in Europe | Nothing: win the war at home | event: napoleon\_invades\_iberia |
| 2 | The crown's right to rule is doubted | Raise legitimacy | stat: (who: $crown; stat: legitimacy; op: \<; value: 30) |
| 3 | The realm is in turmoil | Raise stability | stat: (who: $crown; stat: stability; op: \<=; value: -2) |
| 4 | A free republic already stands in the Caribbean | Nothing: it is an example | event: haitian\_revolution |

#### Sparks

| Name | label | mult | if | foreign backing |
|---|---|---|---|---|
| 1 | News that the king has fallen | 3 | event: (id: napoleon\_invades\_iberia; within\_years: 3) |  |
| 2 | Foreign gold backs the movement | 2 | flag: (who: $crown; id: revolution\_funded) | yes |

#### Stances

| Key | Value |
|---|---|
| `republican_independence` | path |
| `popular_revolution` | path |
| `cadiz_compromise` | bend |

#### Camps

| Name | joins | farmers if hungry | lords | army | clergy |
|---|---|---|---|---|---|
| revolution | homeless: 0.3; scholars: 0.25; clerks: 0.15; craftsmen: 0.12; market\_folk: 0.1; farmers: 0.04 | 0.1 | Few: only Disloyal lords with the Ambitious trait | Conscripted soldiers desert at 5 % a month while war weariness is high |  |
| old\_order |  |  | Every Loyal and Wavering lord |  | Clergy of the state faith |

#### Wave

| Key | Value |
|---|---|
| `kind` | ideology |
| `id` | liberalism |
| `amount` | 0.05 |
| `where` | neighbours |

#### Rearm

| Key | Value |
|---|---|
| `grace_years` | 3 |
| `after.cadiz_compromise` | chosen |

### Revolutions of 1848

| Key | Value |
|---|---|
| `family` | liberal\_national |
| `country` | $states |
| `cause` | new\_ideas |
| `keep_trigger` | no |

#### Requirements

- count\_countries: (where: region:europe; condition: (ideology: (who: this; id: liberalism; op: \>=; value: 0.3)); op: \>=; value: 3)

#### Signs

| Key | Value |
|---|---|
| `need` | 2 |
| `warn_at` | 1 |

##### List

| Name | label | ease | if |
|---|---|---|---|
| 1 | Food is short across Europe | Fill the stores; import grain | stat: (who: region:europe; stat: food\_security; op: \<; value: 0.6) |
| 2 | A trade crisis: workshops close | Public works; new buildings | flag: (who: global; id: commercial\_crisis) |
| 3 | Famine in the west | Nothing now | event: great\_irish\_famine |
| 4 | Many homeless in the cities | Almshouses; new buildings | class\_share: (who: region:europe; class: homeless; op: \>=; value: 0.08) |

#### Sparks

| Name | label | mult | if | foreign backing |
|---|---|---|---|---|
| 1 | A king falls in a neighbouring capital | 3 | count\_countries: (where: region:europe; condition: (flag: (who: this; id: revolutionary\_regime)); op: \>=; value: 1) |  |
| 2 | Foreign gold backs the movement | 2 | flag: (who: $states; id: revolution\_funded) | yes |

#### Stances

| Key | Value |
|---|---|
| `counter_revolution` | path |
| `liberal_victory` | path |
| `early_german_unification` | path |

#### Camps

| Name | joins | farmers if hungry | lords | army | clergy |
|---|---|---|---|---|---|
| revolution | homeless: 0.3; scholars: 0.25; clerks: 0.15; craftsmen: 0.12; market\_folk: 0.1; farmers: 0.04 | 0.1 | Few: only Disloyal lords with the Ambitious trait | Conscripted soldiers desert at 5 % a month while war weariness is high |  |
| old\_order |  |  | Every Loyal and Wavering lord |  | Clergy of the state faith |

#### Wave

| Key | Value |
|---|---|
| `kind` | ideology |
| `id` | liberalism |
| `amount` | 0.05 |
| `where` | neighbours |

#### Rearm

| Key | Value |
|---|---|
| `grace_years` | 3 |
| `after` | none |

### Iranian constitutional revolution

| Key | Value |
|---|---|
| `family` | liberal\_national |
| `country` | $realm |
| `cause` | new\_ideas |
| `keep_trigger` | no |

#### Requirements

- exists: qajar\_iran

#### Signs

| Key | Value |
|---|---|
| `need` | 3 |
| `warn_at` | 2 |

##### List

| Name | label | ease | if |
|---|---|---|---|
| 1 | Foreign loans and concessions | Pay off the loans; cancel concessions | stat: (who: $realm; stat: debt; op: \>=; value: 1000) |
| 2 | The court's right to rule is doubted | Raise legitimacy | stat: (who: $realm; stat: legitimacy; op: \<; value: 40) |
| 3 | Merchants and clerics want a constitution | Grant a consultative council | ideology: (who: $realm; id: liberalism; op: \>=; value: 0.15) |
| 4 | Heavy taxes in a quarter of the realm | Lower them | grievance: (who: $realm; id: heavy\_taxes; op: \>=; value: 0.25) |
| 5 | Revolution next door | Nothing: it is an example | event: (id: russian\_revolution\_1905; within\_years: 3) |

#### Sparks

| Name | label | mult | if | foreign backing |
|---|---|---|---|---|
| 1 | Bread and sugar prices soar | 2 | grievance: (who: $realm; id: hungry; op: \>=; value: 0.2) |  |
| 2 | Foreign gold backs the movement | 2 | flag: (who: $realm; id: revolution\_funded) | yes |

#### Stances

| Key | Value |
|---|---|
| `constitution_granted` | bend |
| `shah_resists` | fight |

#### Camps

| Name | joins | farmers if hungry | lords | army | clergy |
|---|---|---|---|---|---|
| revolution | homeless: 0.3; scholars: 0.25; clerks: 0.15; craftsmen: 0.12; market\_folk: 0.1; farmers: 0.04 | 0.1 | Few: only Disloyal lords with the Ambitious trait | Conscripted soldiers desert at 5 % a month while war weariness is high |  |
| old\_order |  |  | Every Loyal and Wavering lord |  | Clergy of the state faith |

#### Wave

| Key | Value |
|---|---|
| `kind` | ideology |
| `id` | liberalism |
| `amount` | 0.05 |
| `where` | neighbours |

#### Rearm

| Key | Value |
|---|---|
| `grace_years` | 3 |
| `after.constitution_granted` | chosen |
| `after.shah_resists` | rising\_crushed |

### Young turk revolution

| Key | Value |
|---|---|
| `family` | liberal\_national |
| `country` | $state |
| `cause` | new\_ideas |
| `keep_trigger` | no |

#### Requirements

| Name | exists | ideology |
|---|---|---|
| 1 | ottoman |  |
| 2 |  | who: ottoman; id: nationalism; op: \>=; value: 0.3 |

#### Signs

| Key | Value |
|---|---|
| `need` | 1 |
| `warn_at` | 0 |

##### List

| Name | label | ease | if |
|---|---|---|---|
| 1 | A suspended constitution | Restore it before officers do | event: ottoman\_constitution\_1876 |
| 2 | The sultan's right to rule is doubted | Raise legitimacy | stat: (who: ottoman; stat: legitimacy; op: \<; value: 30) |
| 3 | Risings for independence in the provinces | Beat them, or grant self-rule | rebels\_active: (who: ottoman; type: independence) |

#### Sparks

| Name | label | mult | if | foreign backing |
|---|---|---|---|---|
| 1 | A recent lost war | 2 | war\_lost: (who: ottoman; within\_years: 5) |  |
| 2 | Foreign gold backs the movement | 2 | flag: (who: $state; id: revolution\_funded) | yes |

#### Stances

| Key | Value |
|---|---|
| `committee_rule` | path |
| `liberal_decentralisation` | path |

#### Camps

| Name | joins | farmers if hungry | lords | army | clergy |
|---|---|---|---|---|---|
| revolution | homeless: 0.3; scholars: 0.25; clerks: 0.15; craftsmen: 0.12; market\_folk: 0.1; farmers: 0.04 | 0.1 | Few: only Disloyal lords with the Ambitious trait | Conscripted soldiers desert at 5 % a month while war weariness is high |  |
| old\_order |  |  | Every Loyal and Wavering lord |  | Clergy of the state faith |

#### Wave

| Key | Value |
|---|---|
| `kind` | ideology |
| `id` | liberalism |
| `amount` | 0.05 |
| `where` | neighbours |

#### Rearm

| Key | Value |
|---|---|
| `grace_years` | 3 |
| `after` | none |

### Xinhai revolution

| Key | Value |
|---|---|
| `family` | liberal\_national |
| `country` | $dynasty |
| `cause` | new\_ideas |
| `keep_trigger` | no |

#### Requirements

- exists: qing

#### Signs

| Key | Value |
|---|---|
| `need` | 3 |
| `warn_at` | 2 |

##### List

| Name | label | ease | if |
|---|---|---|---|
| 1 | The dynasty's right to rule is doubted | Raise legitimacy | stat: (who: qing; stat: legitimacy; op: \<; value: 25) |
| 2 | A third of the people want a nation of their own | Grant an assembly; appoint Han officials | ideology: (who: qing; id: nationalism; op: \>=; value: 0.3) |
| 3 | Wars lost to foreign powers | Nothing now | war\_lost: (who: qing; within\_years: 20) |
| 4 | Indemnities and foreign loans | Pay them down | stat: (who: qing; stat: debt; op: \>=; value: 2000) |

#### Sparks

| Name | label | mult | if | foreign backing |
|---|---|---|---|---|
| 1 | An army mutiny in a river city | 3 | rebels\_active: (who: qing; type: revolutionary) |  |
| 2 | Foreign gold backs the movement | 2 | flag: (who: $dynasty; id: revolution\_funded) | yes |

#### Stances

| Key | Value |
|---|---|
| `abdication_and_republic` | lead |
| `constitutional_monarchy` | bend |

#### Camps

| Name | joins | farmers if hungry | lords | army | clergy |
|---|---|---|---|---|---|
| revolution | homeless: 0.3; scholars: 0.25; clerks: 0.15; craftsmen: 0.12; market\_folk: 0.1; farmers: 0.04 | 0.1 | Few: only Disloyal lords with the Ambitious trait | Conscripted soldiers desert at 5 % a month while war weariness is high |  |
| old\_order |  |  | Every Loyal and Wavering lord |  | Clergy of the state faith |

#### Wave

| Key | Value |
|---|---|
| `kind` | ideology |
| `id` | liberalism |
| `amount` | 0.05 |
| `where` | neighbours |

#### Rearm

| Key | Value |
|---|---|
| `grace_years` | 3 |
| `after.constitutional_monarchy` | chosen |

### Egyptian revolution 1919

| Key | Value |
|---|---|
| `family` | liberal\_national |
| `country` | $overlord |
| `cause` | new\_ideas |
| `keep_trigger` | no |

#### Requirements

- relation: (who: egypt; other: $overlord; type: subject)

#### Signs

| Key | Value |
|---|---|
| `need` | 3 |
| `warn_at` | 2 |

##### List

| Name | label | ease | if |
|---|---|---|---|
| 1 | A third of Egyptians want a nation of their own | Promise self-rule | ideology: (who: egypt; id: nationalism; op: \>=; value: 0.3) |
| 2 | Support for ending foreign rule | Promise self-rule | ideology: (who: egypt; id: anticolonialism; op: \>=; value: 0.2) |
| 3 | A world war has just ended with talk of self-determination | Nothing | event: (id: armistice\_1918; within\_years: 3) |
| 4 | Wartime requisitions of grain and men | End them; pay for what was taken | grievance: (who: egypt; id: requisitioned; op: \>=; value: 0.2) |
| 5 | The overlord is tired of war | Nothing | stat: (who: $overlord; stat: war\_weariness; op: \>=; value: 10) |

#### Sparks

| Name | label | mult | if | foreign backing |
|---|---|---|---|---|
| 1 | The movement's leaders are arrested and exiled | 2 | rebels\_active: (who: egypt; type: anticolonial) |  |
| 2 | Foreign gold backs the movement | 2 | flag: (who: $overlord; id: revolution\_funded) | yes |

#### Stances

| Key | Value |
|---|---|
| `independence_with_reserved_points` | bend |
| `hold_by_force` | fight |
| `full_independence` | lead |

#### Camps

| Name | joins | farmers if hungry | lords | army | clergy |
|---|---|---|---|---|---|
| revolution | homeless: 0.3; scholars: 0.25; clerks: 0.15; craftsmen: 0.12; market\_folk: 0.1; farmers: 0.04 | 0.1 | Few: only Disloyal lords with the Ambitious trait | Conscripted soldiers desert at 5 % a month while war weariness is high |  |
| old\_order |  |  | Every Loyal and Wavering lord |  | Clergy of the state faith |

#### Wave

| Key | Value |
|---|---|
| `kind` | ideology |
| `id` | liberalism |
| `amount` | 0.05 |
| `where` | neighbours |

#### Rearm

| Key | Value |
|---|---|
| `grace_years` | 3 |
| `after.independence_with_reserved_points` | chosen |
| `after.hold_by_force` | rising\_crushed |

### Haitian revolution

| Key | Value |
|---|---|
| `family` | freedom |
| `country` | $metropole |
| `cause` | homeland |
| `keep_trigger` | no |

#### Requirements

| Name | colonial presence | period active | stat |
|---|---|---|---|
| 1 | who: $metropole; where: area:saint\_domingue; op: \>=; value: 1 |  |  |
| 2 |  | p\_caribbean\_plantation\_complex |  |
| 3 |  |  | who: area:saint\_domingue; stat: unrest; op: \>=; value: 40 |

#### Signs

| Key | Value |
|---|---|
| `need` | 1 |
| `warn_at` | 0 |

##### List

| Name | label | ease | if |
|---|---|---|---|
| 1 | Revolution in the metropole | Nothing: it has happened | event: french\_revolution |
| 2 | The metropole is in turmoil | Raise stability | stat: (who: $metropole; stat: stability; op: \<=; value: -1) |
| 3 | Talk of rights and liberty in the metropole | None that keeps slavery | ideology: (who: $metropole; id: liberalism; op: \>=; value: 0.3) |
| 4 | Abolitionist ideas reach the islands | Abolish slavery | ideology: (who: region:caribbean; id: abolitionism; op: \>=; value: 0.1) |

#### Sparks

| Name | label | mult | if | foreign backing |
|---|---|---|---|---|
| 1 | The metropole is at war in Europe | 2 | at\_war: (who: $metropole) |  |
| 2 | Foreign gold backs the movement | 2 | flag: (who: $metropole; id: revolution\_funded) | yes |

#### Stances

| Key | Value |
|---|---|
| `independence_and_abolition` | path |
| `autonomy_under_louverture` | path |

#### Camps

| Name | joins | note | lords | army | clergy |
|---|---|---|---|---|---|
| revolution | homeless: 0.3; farmers: 0.3; craftsmen: 0.1; market\_folk: 0.1 | On plantation tiles the farmers are the enslaved workers (event tree population group enslaved\_africans); they join at 30 %. | None | Colonial troops of the same people desert at 10 % a month |  |
| old\_order |  |  | Planters and settler lords |  | Colonial clergy |

#### Wave

| Key | Value |
|---|---|
| `kind` | ideology |
| `id` | abolitionism |
| `amount` | 0.1 |
| `where` | region |

#### Rearm

| Key | Value |
|---|---|
| `grace_years` | 3 |
| `after` | none |

### Shivaji coronation

| Key | Value |
|---|---|
| `family` | homeland |
| `country` | $empire |
| `cause` | homeland |
| `keep_trigger` | no |

#### Requirements

- controls: (who: marathas; where: area:konkan; min\_share: 0.5)

#### Signs

| Key | Value |
|---|---|
| `need` | 2 |
| `warn_at` | 1 |

##### List

| Name | label | ease | if |
|---|---|---|---|
| 1 | Your empire is overstretched | Stop expanding; integrate what you hold | stat: (who: $empire; stat: integration\_strain; op: \>=; value: 40) |
| 2 | The Deccan sultanate is in disorder | Nothing: it is their crisis | stat: (who: $sultanate; stat: stability; op: \<=; value: -1) |
| 3 | Foreign rule in a third of the Deccan | Appoint local governors and commanders | grievance: (who: region:deccan; id: foreign\_rule; op: \>=; value: 0.3) |
| 4 | Wrong faith in a fifth of the Deccan | Tolerate the local faith; lift the pilgrim and poll taxes | grievance: (who: region:deccan; id: wrong\_faith; op: \>=; value: 0.2) |
| 5 | Three of your lords waver | Reward them, or recall them | lords: (who: $empire; measure: wavering\_or\_worse; op: \>=; value: 3) |

#### Sparks

| Name | label | mult | if | foreign backing |
|---|---|---|---|---|
| 1 | Your armies are worn out by a long war elsewhere | 1.5 | stat: (who: $empire; stat: war\_weariness; op: \>=; value: 10) |  |
| 2 | Foreign gold backs the movement | 2 | flag: (who: $empire; id: revolution\_funded) | yes |

#### Stances

| Key | Value |
|---|---|
| `sovereign_coronation` | path |
| `mughal_mansab` | bend |

#### Camps

| Name | joins | only of culture | lords | army | clergy |
|---|---|---|---|---|---|
| revolution | homeless: 0.2; herders: 0.1; woodsmen: 0.08; farmers: 0.06 | yes | Lords of the region's culture who are Wavering or worse | Soldiers from the region desert at 5 % a month |  |
| old\_order |  |  | Lords of other cultures, and every Loyal lord |  | Clergy of the state faith |

#### Wave

| Key | Value |
|---|---|
| `kind` | none |
| `where` | neighbours |
| `note` | Spreads as Foreign rule grievances in neighbouring provinces held by distant empires. |

#### Rearm

| Key | Value |
|---|---|
| `grace_years` | 3 |
| `after.mughal_mansab` | chosen |

### Sikh empire founded

| Key | Value |
|---|---|
| `family` | homeland |
| `country` | $displaced |
| `cause` | homeland |
| `keep_trigger` | no |

#### Requirements

- religion\_share: (where: area:punjab; religion: sikh; op: \>=; value: 0.1)

#### Signs

| Key | Value |
|---|---|
| `need` | 2 |
| `warn_at` | 1 |

##### List

| Name | label | ease | if |
|---|---|---|---|
| 1 | Your hold on Punjab is weak | Officials and forts in Punjab | stat: (who: area:punjab; stat: control; op: \<; value: 40) |
| 2 | Sikh bands rule the villages | Send governors and a garrison | grievance: (who: area:punjab; id: ungoverned; op: \>=; value: 0.3) |
| 3 | Foreign rule in a third of Punjab | Appoint local governors | grievance: (who: area:punjab; id: foreign\_rule; op: \>=; value: 0.3) |
| 4 | A war lost in the last ten years | Nothing now | war\_lost: (who: $displaced; within\_years: 10) |
| 5 | Punjab is restless | Lower taxes there; send a judge | stat: (who: area:punjab; stat: unrest; op: \>=; value: 40) |

#### Sparks

| Name | label | mult | if | foreign backing |
|---|---|---|---|---|
| 1 | Two of your lords waver | 1.5 | lords: (who: $displaced; measure: wavering\_or\_worse; op: \>=; value: 2) |  |
| 2 | Foreign gold backs the movement | 2 | flag: (who: $displaced; id: revolution\_funded) | yes |

#### Stances

| Key | Value |
|---|---|
| `unified_maharajadom` | path |
| `misl_confederacy` | path |

#### Camps

| Name | joins | only of culture | lords | army | clergy |
|---|---|---|---|---|---|
| revolution | homeless: 0.2; herders: 0.1; woodsmen: 0.08; farmers: 0.06 | yes | Lords of the region's culture who are Wavering or worse | Soldiers from the region desert at 5 % a month |  |
| old\_order |  |  | Lords of other cultures, and every Loyal lord |  | Clergy of the state faith |

#### Wave

| Key | Value |
|---|---|
| `kind` | none |
| `where` | neighbours |
| `note` | Spreads as Foreign rule grievances in neighbouring provinces held by distant empires. |

#### Rearm

| Key | Value |
|---|---|
| `grace_years` | 3 |
| `after` | none |

### Fall of beijing 1644

| Key | Value |
|---|---|
| `family` | agrarian |
| `country` | $dynasty |
| `cause` | hunger |
| `keep_trigger` | no |

#### Requirements

- exists: ming

#### Signs

| Key | Value |
|---|---|
| `need` | 3 |
| `warn_at` | 2 |

##### List

| Name | label | ease | if |
|---|---|---|---|
| 1 | Peasant armies are in the field | Beat them; feed their provinces | rebels\_active: (who: ming; type: peasant) |
| 2 | The dynasty's mandate is doubted | Raise legitimacy | stat: (who: ming; stat: legitimacy; op: \<; value: 25) |
| 3 | Cold years and failed harvests | Fill the granaries | stat: (who: global; stat: climate\_anomaly; op: \<=; value: -0.5) |
| 4 | Hunger in a third of the realm | Open the granaries | grievance: (who: ming; id: hungry; op: \>=; value: 0.3) |
| 5 | Unpaid soldiers and courier-station men | Pay them | stat: (who: ming; stat: treasury; op: \<; value: 0) |

#### Sparks

| Name | label | mult | if | foreign backing |
|---|---|---|---|---|
| 1 | The frontier armies are away fighting the Manchus | 2 | at\_war: (who: ming; other: later\_jin) |  |
| 2 | Foreign gold backs the movement | 2 | flag: (who: $dynasty; id: revolution\_funded) | yes |

#### Stances

| Key | Value |
|---|---|
| `qing_enter_beijing` | path |
| `shun_dynasty` | path |

#### Camps

| Name | joins | lords | army | clergy |
|---|---|---|---|---|
| revolution | homeless: 0.3; farmers: 0.15; herders: 0.1; woodsmen: 0.08; miners: 0.08; craftsmen: 0.04 | Only lords in revolt | Soldiers from farming provinces desert at 5 % a month while Hungry |  |
| old\_order |  | Every lord |  | Clergy of the state faith |

#### Wave

| Key | Value |
|---|---|
| `kind` | none |
| `where` | neighbours |
| `note` | Spreads as Neighbour in revolt grievances (rebellions 4.2), not as an ideology. |

#### Rearm

| Key | Value |
|---|---|
| `grace_years` | 3 |
| `after.qing_enter_beijing` | chosen |

### Tay son uprising

| Key | Value |
|---|---|
| `family` | agrarian |
| `country` | $realm |
| `cause` | hunger |
| `keep_trigger` | no |

#### Requirements

- exists: dai\_viet

#### Signs

| Key | Value |
|---|---|
| `need` | 3 |
| `warn_at` | 2 |

##### List

| Name | label | ease | if |
|---|---|---|---|
| 1 | Heavy taxes in a third of the realm | Lower them | grievance: (who: $realm; id: heavy\_taxes; op: \>=; value: 0.3) |
| 2 | Hunger in a fifth of the realm | Open the granaries | grievance: (who: $realm; id: hungry; op: \>=; value: 0.2) |
| 3 | A corrupt regent's rule is despised | Raise legitimacy | stat: (who: $realm; stat: legitimacy; op: \<; value: 40) |
| 4 | Rival lords' houses divide the realm | Win back your lords | lords: (who: $realm; measure: wavering\_or\_worse; op: \>=; value: 2) |
| 5 | Many landless people | New land and buildings | class\_share: (who: $realm; class: homeless; op: \>=; value: 0.08) |

#### Sparks

| Name | label | mult | if | foreign backing |
|---|---|---|---|---|
| 1 | A child ruler and a grasping regent | 2 | flag: (who: $realm; id: regency) |  |
| 2 | Foreign gold backs the movement | 2 | flag: (who: $realm; id: revolution\_funded) | yes |

#### Stances

| Key | Value |
|---|---|
| `tay_son_triumph` | path |
| `lords_crush_the_rising` | fight |
| `tax_relief` | bend |

#### Camps

| Name | joins | lords | army | clergy |
|---|---|---|---|---|
| revolution | homeless: 0.3; farmers: 0.15; herders: 0.1; woodsmen: 0.08; miners: 0.08; craftsmen: 0.04 | Only lords in revolt | Soldiers from farming provinces desert at 5 % a month while Hungry |  |
| old\_order |  | Every lord |  | Clergy of the state faith |

#### Wave

| Key | Value |
|---|---|
| `kind` | none |
| `where` | neighbours |
| `note` | Spreads as Neighbour in revolt grievances (rebellions 4.2), not as an ideology. |

#### Rearm

| Key | Value |
|---|---|
| `grace_years` | 3 |
| `after.lords_crush_the_rising` | rising\_crushed |
| `after.tax_relief` | chosen |

### Donghak revolution

| Key | Value |
|---|---|
| `family` | agrarian |
| `country` | $realm |
| `cause` | hunger |
| `keep_trigger` | no |

#### Requirements

- exists: joseon

#### Signs

| Key | Value |
|---|---|
| `need` | 3 |
| `warn_at` | 2 |

##### List

| Name | label | ease | if |
|---|---|---|---|
| 1 | Officials' extortion in a quarter of the realm | Lower taxes; replace greedy officials | grievance: (who: $realm; id: heavy\_taxes; op: \>=; value: 0.25) |
| 2 | The court's right to rule is doubted | Raise legitimacy | stat: (who: $realm; stat: legitimacy; op: \<; value: 40) |
| 3 | Anger at foreign merchants and soldiers | Limit foreign concessions | ideology: (who: region:korea; id: nationalism; op: \>=; value: 0.15) |
| 4 | The countryside is restless | Judges; tax relief | stat: (who: region:korea; stat: unrest; op: \>=; value: 35) |
| 5 | Hunger in some provinces | Open the granaries | grievance: (who: $realm; id: hungry; op: \>=; value: 0.15) |

#### Sparks

| Name | label | mult | if | foreign backing |
|---|---|---|---|---|
| 1 | The court persecutes the movement | 2 | flag: (who: $realm; id: religious\_persecution\_active) |  |
| 2 | Foreign gold backs the movement | 2 | flag: (who: $realm; id: revolution\_funded) | yes |

#### Stances

| Key | Value |
|---|---|
| `crushed_with_foreign_troops` | fight |
| `jeonju_truce` | bend |
| `peasant_victory` | path |

#### Camps

| Name | joins | lords | army | clergy |
|---|---|---|---|---|
| revolution | homeless: 0.3; farmers: 0.15; herders: 0.1; woodsmen: 0.08; miners: 0.08; craftsmen: 0.04 | Only lords in revolt | Soldiers from farming provinces desert at 5 % a month while Hungry |  |
| old\_order |  | Every lord |  | Clergy of the state faith |

#### Wave

| Key | Value |
|---|---|
| `kind` | none |
| `where` | neighbours |
| `note` | Spreads as Neighbour in revolt grievances (rebellions 4.2), not as an ideology. |

#### Rearm

| Key | Value |
|---|---|
| `grace_years` | 3 |
| `after.crushed_with_foreign_troops` | rising\_crushed |
| `after.jeonju_truce` | chosen |

### Mexican revolution

| Key | Value |
|---|---|
| `family` | agrarian |
| `country` | $regime |
| `cause` | hunger |
| `keep_trigger` | no |

#### Requirements

| Name | exists | stat |
|---|---|---|
| 1 | mexico |  |
| 2 |  | who: mexico; stat: legitimacy; op: \<; value: 40 |

#### Signs

| Key | Value |
|---|---|
| `need` | 2 |
| `warn_at` | 1 |

##### List

| Name | label | ease | if |
|---|---|---|---|
| 1 | Peasant bands are in the field | Return village lands | rebels\_active: (who: mexico; type: peasant) |
| 2 | A third of the people want real elections | Hold them | ideology: (who: mexico; id: liberalism; op: \>=; value: 0.35) |
| 3 | Great estates hold half the land | Divide some estates | lords: (who: mexico; measure: land\_share; op: \>=; value: 0.5) |

#### Sparks

- label: Foreign gold backs the movement; mult: 2; foreign\_backing: yes; if: (flag: (who: $regime; id: revolution\_funded))

#### Stances

| Key | Value |
|---|---|
| `constitution_of_1917` | path |
| `porfirian_restoration` | path |
| `agrarian_revolution_wins` | path |

#### Camps

| Name | joins | lords | army | clergy |
|---|---|---|---|---|
| revolution | homeless: 0.3; farmers: 0.15; herders: 0.1; woodsmen: 0.08; miners: 0.08; craftsmen: 0.04 | Only lords in revolt | Soldiers from farming provinces desert at 5 % a month while Hungry |  |
| old\_order |  | Every lord |  | Clergy of the state faith |

#### Wave

| Key | Value |
|---|---|
| `kind` | none |
| `where` | neighbours |
| `note` | Spreads as Neighbour in revolt grievances (rebellions 4.2), not as an ideology. |

#### Rearm

| Key | Value |
|---|---|
| `grace_years` | 3 |
| `after` | none |

### Petrine reforms

| Key | Value |
|---|---|
| `family` | from\_above |
| `country` | $reformer |
| `cause` | lord |
| `keep_trigger` | no |

#### Requirements

| Name | exists | stat |
|---|---|---|
| 1 | $reformer |  |
| 2 |  | who: $reformer; stat: legitimacy; op: \>=; value: 50 |

#### Signs

| Key | Value |
|---|---|
| `need` | 1 |
| `warn_at` | 0 |

##### List

| Name | label | ease | if |
|---|---|---|---|
| 1 | War with a better-drilled northern rival | (empty) | at\_war: (who: $reformer; other: sweden) |
| 2 | War with the great southern empire | (empty) | at\_war: (who: $reformer; other: ottoman) |
| 3 | The realm is looked down on abroad | (empty) | stat: (who: $reformer; stat: prestige; op: \<; value: 0) |
| 4 | A recent defeat shows the army is behind | (empty) | war\_lost: (who: $reformer; within\_years: 10) |

#### Sparks

- label: Foreign gold backs the movement; mult: 2; foreign\_backing: yes; if: (flag: (who: $reformer; id: revolution\_funded))

#### Stances

| Key | Value |
|---|---|
| `full_westernisation` | lead |
| `limited_military_reform` | bend |

#### Camps

| Name | joins | note | lords | army |
|---|---|---|---|---|
| revolution | none | Nobody rises for it: the ruler starts it as a decision. |  |  |
| old\_order | clergy: 0.1; farmers: 0.02 |  | Every Disloyal lord, and Wavering lords with the Pious or Proud trait | Old-style units (retinues, guards) may mutiny |

#### Wave

| Key | Value |
|---|---|
| `kind` | ideology |
| `amount` | 0 |
| `where` | none |

#### Rearm

| Key | Value |
|---|---|
| `grace_years` | 3 |
| `after.limited_military_reform` | chosen |

### Rise of the zulu kingdom

| Key | Value |
|---|---|
| `family` | from\_above |
| `country` | $kingdom |
| `cause` | lord |
| `keep_trigger` | no |

#### Requirements

- stat: (who: area:zululand; stat: population; op: \>=; value: 100)

#### Signs

| Key | Value |
|---|---|
| `need` | 1 |
| `warn_at` | 0 |

##### List

| Name | label | ease | if |
|---|---|---|---|
| 1 | Drought and competition for land | (empty) | stat: (who: area:zululand; stat: food\_security; op: \<; value: 0.6) |
| 2 | Trade at Delagoa Bay draws rivals | (empty) | trade\_presence: (who: area:zululand; hub: delagoa\_bay; op: \>=; value: 0.1) |

#### Sparks

- label: Foreign gold backs the movement; mult: 2; foreign\_backing: yes; if: (flag: (who: $kingdom; id: revolution\_funded))

#### Stances

| Key | Value |
|---|---|
| `military_kingdom` | lead |
| `confederacy` | bend |

#### Camps

| Name | joins | note | lords | army |
|---|---|---|---|---|
| revolution | none | Nobody rises for it: the ruler starts it as a decision. |  |  |
| old\_order | clergy: 0.1; farmers: 0.02 |  | Every Disloyal lord, and Wavering lords with the Pious or Proud trait | Old-style units (retinues, guards) may mutiny |

#### Wave

| Key | Value |
|---|---|
| `kind` | ideology |
| `amount` | 0 |
| `where` | none |

#### Rearm

| Key | Value |
|---|---|
| `grace_years` | 3 |
| `after.confederacy` | chosen |

### Meiji restoration

| Key | Value |
|---|---|
| `family` | from\_above |
| `country` | $shogunate |
| `cause` | lord |
| `keep_trigger` | no |

#### Requirements

- exists: tokugawa

#### Signs

| Key | Value |
|---|---|
| `need` | 3 |
| `warn_at` | 2 |

##### List

| Name | label | ease | if |
|---|---|---|---|
| 1 | The shogun's right to rule is doubted | Raise legitimacy | stat: (who: tokugawa; stat: legitimacy; op: \<; value: 30) |
| 2 | A quarter of the people put the nation first | Reform before others do | ideology: (who: tokugawa; id: nationalism; op: \>=; value: 0.25) |
| 3 | Foreign warships forced the ports open | Nothing now | event: perry\_expedition |
| 4 | Great domains defy the shogun | Win them back | lords: (who: tokugawa; measure: disloyal\_or\_worse; op: \>=; value: 2) |

#### Sparks

- label: Foreign gold backs the movement; mult: 2; foreign\_backing: yes; if: (flag: (who: $shogunate; id: revolution\_funded))

#### Stances

| Key | Value |
|---|---|
| `centralising_restoration` | path |
| `reformed_shogunate` | path |

#### Camps

| Name | joins | note | lords | army |
|---|---|---|---|---|
| revolution | none | Nobody rises for it: the ruler starts it as a decision. |  |  |
| old\_order | clergy: 0.1; farmers: 0.02 |  | Every Disloyal lord, and Wavering lords with the Pious or Proud trait | Old-style units (retinues, guards) may mutiny |

#### Wave

| Key | Value |
|---|---|
| `kind` | ideology |
| `amount` | 0 |
| `where` | none |

#### Rearm

| Key | Value |
|---|---|
| `grace_years` | 3 |
| `after` | none |

### Kemalist reforms

| Key | Value |
|---|---|
| `family` | from\_above |
| `country` | $realm |
| `cause` | lord |
| `keep_trigger` | no |

#### Requirements

- exists: turkey

#### Signs

| Key | Value |
|---|---|
| `need` | 2 |
| `warn_at` | 1 |

##### List

| Name | label | ease | if |
|---|---|---|---|
| 1 | The founders are trusted after victory | (empty) | stat: (who: turkey; stat: legitimacy; op: \>=; value: 50) |
| 2 | The peace treaty is signed | (empty) | event: treaty\_of\_lausanne |
| 3 | A third of the people put the nation first | (empty) | ideology: (who: turkey; id: nationalism; op: \>=; value: 0.3) |

#### Sparks

- label: Foreign gold backs the movement; mult: 2; foreign\_backing: yes; if: (flag: (who: $realm; id: revolution\_funded))

#### Stances

| Key | Value |
|---|---|
| `secular_reforms` | lead |
| `gradual_reform` | bend |

#### Camps

| Name | joins | note | lords | army |
|---|---|---|---|---|
| revolution | none | Nobody rises for it: the ruler starts it as a decision. |  |  |
| old\_order | clergy: 0.1; farmers: 0.02 |  | Every Disloyal lord, and Wavering lords with the Pious or Proud trait | Old-style units (retinues, guards) may mutiny |

#### Wave

| Key | Value |
|---|---|
| `kind` | ideology |
| `amount` | 0 |
| `where` | none |

#### Rearm

| Key | Value |
|---|---|
| `grace_years` | 3 |
| `after.gradual_reform` | chosen |

### Russian revolution 1905

| Key | Value |
|---|---|
| `family` | socialist\_defeat |
| `country` | $realm |
| `cause` | new\_ideas |
| `keep_trigger` | no |

#### Requirements

- government: (who: $realm; is: monarchy)

#### Signs

| Key | Value |
|---|---|
| `need` | 3 |
| `warn_at` | 2 |

##### List

| Name | label | ease | if |
|---|---|---|---|
| 1 | A war lost in the last three years | Nothing now | war\_lost: (who: $realm; within\_years: 3) |
| 2 | A fifth of the people want a constitution | Grant an assembly | ideology: (who: $realm; id: liberalism; op: \>=; value: 0.2) |
| 3 | Socialist ideas in the factories | Shorter hours; censorship | ideology: (who: $realm; id: socialism; op: \>=; value: 0.1) |
| 4 | Factory workers crowd the cities | Housing: new buildings and almshouses | class\_share: (who: $realm; class: craftsmen; op: \>=; value: 0.1) |
| 5 | Land hunger: lords' estates beside crowded villages | Sell lords' land to farmers | grievance: (who: $realm; id: harsh\_lord; op: \>=; value: 0.3) |
| 6 | The people are tired of war | Make peace | stat: (who: $realm; stat: war\_weariness; op: \>=; value: 10) |

#### Sparks

| Name | label | mult | if | foreign backing |
|---|---|---|---|---|
| 1 | Troops fire on a peaceful march | 3 | grievance: (who: $realm; id: bloodshed; op: \>; value: 0) |  |
| 2 | Foreign gold backs the movement | 2 | flag: (who: $realm; id: revolution\_funded) | yes |

#### Stances

| Key | Value |
|---|---|
| `october_manifesto` | bend |
| `repression_only` | fight |
| `full_constitution` | lead |

#### Camps

| Name | joins | lords | army | clergy |
|---|---|---|---|---|
| revolution | homeless: 0.3; craftsmen: 0.2; seafolk: 0.1; miners: 0.15; farmers: 0.08; scholars: 0.1; clerks: 0.05 | None | Soldiers mutiny at 10 % a month while war weariness is above 14 |  |
| old\_order |  | Every lord | Officers | Clergy of the state faith |

#### Wave

| Key | Value |
|---|---|
| `kind` | ideology |
| `id` | socialism |
| `amount` | 0.05 |
| `where` | region |

#### Rearm

| Key | Value |
|---|---|
| `grace_years` | 3 |
| `after.october_manifesto` | chosen |
| `after.repression_only` | rising\_crushed |

### Russian revolution

| Key | Value |
|---|---|
| `family` | socialist\_defeat |
| `country` | $old\_regime |
| `cause` | new\_ideas |
| `keep_trigger` | no |

#### Requirements

| Name | exists | government |
|---|---|---|
| 1 | russia |  |
| 2 |  | who: russia; is: monarchy |

#### Signs

| Key | Value |
|---|---|
| `need` | 3 |
| `warn_at` | 2 |

##### List

| Name | label | ease | if |
|---|---|---|---|
| 1 | The people are exhausted by war | Make peace | stat: (who: russia; stat: war\_weariness; op: \>=; value: 14) |
| 2 | The crown is despised | Raise legitimacy | stat: (who: russia; stat: legitimacy; op: \<; value: 20) |
| 3 | Communist ideas have a following | Land to the farmers; peace | ideology: (who: russia; id: communism; op: \>=; value: 0.15) |
| 4 | Bread queues in a fifth of the realm | Feed the cities | grievance: (who: russia; id: hungry; op: \>=; value: 0.2) |
| 5 | Conscription has emptied a third of the provinces | Release men from the army | grievance: (who: russia; id: conscription; op: \>=; value: 0.3) |

#### Sparks

| Name | label | mult | if | foreign backing |
|---|---|---|---|---|
| 1 | The ruler took personal command at the front | 2 | flag: (who: russia; id: ruler\_led\_campaign) |  |
| 2 | Foreign gold backs the movement | 2 | flag: (who: $old\_regime; id: revolution\_funded) | yes |

#### Stances

| Key | Value |
|---|---|
| `bolshevik_seizure_of_power` | path |
| `provisional_republic_survives` | path |

#### Camps

| Name | joins | lords | army | clergy |
|---|---|---|---|---|
| revolution | homeless: 0.3; craftsmen: 0.2; seafolk: 0.1; miners: 0.15; farmers: 0.08; scholars: 0.1; clerks: 0.05 | None | Soldiers mutiny at 10 % a month while war weariness is above 14 |  |
| old\_order |  | Every lord | Officers | Clergy of the state faith |

#### Wave

| Key | Value |
|---|---|
| `kind` | ideology |
| `id` | socialism |
| `amount` | 0.05 |
| `where` | region |

#### Rearm

| Key | Value |
|---|---|
| `grace_years` | 3 |
| `after` | none |

### Armistice 1918

| Key | Value |
|---|---|
| `family` | socialist\_defeat |
| `country` | $defeated |
| `cause` | new\_ideas |
| `requirements` | none |
| `signs` | none |
| `keep_trigger` | yes |

#### Sparks

- label: Foreign gold backs the movement; mult: 2; foreign\_backing: yes; if: (flag: (who: $defeated; id: revolution\_funded))

#### Stances

| Key | Value |
|---|---|
| `armistice_and_revolution` | path |
| `fight_on_to_the_frontier` | path |

#### Camps

| Name | joins | lords | army | clergy |
|---|---|---|---|---|
| revolution | homeless: 0.3; craftsmen: 0.2; seafolk: 0.1; miners: 0.15; farmers: 0.08; scholars: 0.1; clerks: 0.05 | None | Soldiers mutiny at 10 % a month while war weariness is above 14 |  |
| old\_order |  | Every lord | Officers | Clergy of the state faith |

#### Wave

| Key | Value |
|---|---|
| `kind` | ideology |
| `id` | socialism |
| `amount` | 0.05 |
| `where` | region |

#### Rearm

| Key | Value |
|---|---|
| `grace_years` | 3 |
| `after.fight_on_to_the_frontier` | chosen |

### Restoration of the old order

| Key | Value |
|---|---|
| `family` | restoration |
| `country` | $realm |
| `cause` | pretender |
| `keep_trigger` | no |

#### Requirements

| Name | flag |
|---|---|
| 1 | who: $realm; id: emigre\_court |
| 2 | who: $realm; id: revolutionary\_regime |

#### Signs

| Key | Value |
|---|---|
| `need` | 2 |
| `warn_at` | 1 |

##### List

| Name | label | ease | if |
|---|---|---|---|
| 1 | The new regime's right to rule is doubted | Raise legitimacy | stat: (who: $realm; stat: legitimacy; op: \<; value: 40) |
| 2 | The realm is unstable | Raise stability | stat: (who: $realm; stat: stability; op: \<=; value: -1) |
| 3 | A war lost in the last two years | Nothing now | war\_lost: (who: $realm; within\_years: 2) |
| 4 | The revolution's leader has just died | Name a strong successor | flag: (who: $realm; id: ruler\_died) |
| 5 | The people are tired of war | Make peace | stat: (who: $realm; stat: war\_weariness; op: \>=; value: 12) |

#### Sparks

| Name | label | mult | if | foreign backing |
|---|---|---|---|---|
| 1 | Foreign armies are on your soil | 3 | at\_war: (who: $realm) |  |
| 2 | Foreign gold backs the movement | 2 | flag: (who: $realm; id: revolution\_funded) | yes |

#### Stances

| Key | Value |
|---|---|
| `restore_the_dynasty` | path |
| `keep_the_new_order` | path |

#### Camps

| Name | joins | lords | note |
|---|---|---|---|
| revolution | none | Émigré lords and Loyal lords of the old house | The returning pretender's backers. |
| old\_order |  | Lords and officials who gained land or office under the revolution |  |

#### Wave

| Key | Value |
|---|---|
| `kind` | none |
| `where` | none |

#### Rearm

| Key | Value |
|---|---|
| `grace_years` | 3 |
| `after.keep_the_new_order` | chosen |

## Wave grievances

> revolutions-design 7 / spec REVO-055: the agrarian and homeland waves spread grievances, not an ideology.

| Name | id | where |
|---|---|---|
| agrarian | neighbour\_in\_revolt | neighbouring provinces |
| homeland | foreign\_rule | neighbouring provinces held by distant empires |

## Decree effects

> decrees.yaml \`does\` and \`cost\` lines of the decrees whose numbers the design gives (all placeholders).

| Name | treasury years of church income | waver | levy share of | levy cap mult | grievance | grievance years | removes loyalty at least | scholars may flee | tiles become | more |
|---|---|---|---|---|---|---|---|---|---|---|
| sell\_church\_lands | 10 | clergy: yes; lord\_trait: Pious |  |  |  |  |  |  |  |  |
| levy\_en\_masse |  |  | farmers | 2 | conscription | 3 |  |  |  |  |
| revolutionary\_tribunal |  |  |  |  | bloodshed |  | disloyal | yes |  |  |
| divide\_the\_estates |  |  |  |  |  |  |  |  | family\_farms | ends: harsh\_lord; food: up; export wares: down; lord turns: disloyal |
| censorship |  |  |  |  |  |  |  |  |  | ideas spread mult: 0.5; scholars per year: -0.1; presses and schools: slow |
| protection\_tribute |  |  |  |  |  |  |  |  |  | tax share: (chauth: 0.25; rakhi: 0.2); owner opinion: -20; refused grievance: burned\_homes |
| call\_the\_assembly |  |  |  |  |  |  |  |  |  | agrees below grievance share: 0.333333; needs not deep in debt: yes |

## Game

> First game slice (D-REVO-17, REVO-082 to REVO-088): every realm's own revolution from the estates and agrarian families. All provisional.

| Key | Value |
|---|---|
| `need` (provisional) | 3 |
| `warn_at` (provisional) | 2 |
| `mean_years` (provisional) | 1 |
| `spark_lords_disloyal` (provisional) | 2 |
| `spark_mult` (provisional) | 2 |
| `grace_years` (provisional) | 3 |
| `bend_light_tax_years` (provisional) | 10 |
| `bend_granary_months` (provisional) | 4 |
| `fight_first_musters` (provisional) | 6 |
| `ai_fight_strong` (provisional) | 1.5 |
| `ai_fight_weak` (provisional) | 0.5 |
| `new_dynasty_light_tax_years` (provisional) | 10 |

### Signs (provisional)

| Key | Value |
|---|---|
| `heavy_taxes_share` | 0.25 |
| `hungry_share` | 0.2 |
| `restless_share` | 0.1 |
| `lords_wavering` | 2 |
| `debt_years_of_income` | 1 |
| `rebels_won_years` | 5 |

### Ai weights (provisional)

| Key | Value |
|---|---|
| `fight` | 50 |
| `bend` | 30 |
| `lead` | 20 |

### Families

| Name | lead | fight won | crushed | cause |
|---|---|---|---|---|
| estates | town\_league | estates\_republic | reaction | Town |
| agrarian | agrarian\_reform | new\_dynasty | reaction | Hunger |
