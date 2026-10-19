# Government data

Every value in the game's government config, exactly as the game reads it. This page is made from `packages/rules/data/domain/government.json` each time the config changes, so it always matches the game. How these values are used is explained on [Government](Government).

Keys are written as in the config file. Shares are fractions (0.25 is 25 %), and values marked (provisional) are placeholders that may still change in balancing. Inventions are shown by id and name; see [Research data](Data-Research#inventions).

> From government/config/government.yaml (version 2) and start-forms.yaml. Every number is a placeholder for balancing.

| Key | Value |
|---|---|
| `colonial_governors_count_against_officials_cap` | no |
| `revolution_ignores_era` | yes |
| `admin_capacity_officials_per_point` (provisional) | 1 |

## Over cap

| Name | grievance | when | slips per lord over | order |
|---|---|---|---|---|
| officials | grasping\_officials |  |  |  |
| lords |  | new\_year | 1 | lowest\_loyalty, most\_provinces |
| reform |  |  |  | lowest\_loyalty, most\_provinces |

## Great lord

| Name | provinces min | provinces max | down reasons |
|---|---|---|---|
| 1 | 4 | 7 | 1 |
| 2 | 8 | 999 | 2 |

## Subject reach start

| Key | Value |
|---|---|
| `very_low` | 2 |
| `low` | 3 |
| `moderate` | 5 |
| `high` | 7 |
| `very_high` | 9 |

## Start

| Key | Value |
|---|---|
| `form` | historical, from config/start-forms.yaml |
| `lords` | the catalogue's historical houses; a country with one province starts with none |

## Buildings

| Name | officials | lords | note | landmark step 4 | needs | forms |
|---|---|---|---|---|---|---|
| palace | 6, 10, 16 | 2, 4, 6 | by step | officials: (forbidden\_city: 24; topkapi: 20); lords: 6 |  |  |
| seat | 2, 4 |  | by step; any number, one per province (D-GOV-10) |  |  |  |
| chancery | 4 |  |  |  | [G3 Tax registers](Data-Research#inventions) |  |
| court\_of\_law |  | 2 |  |  | [G1 Written law codes](Data-Research#inventions) |  |
| diet\_hall |  | 3 |  |  |  | feudal\_realm, diet\_monarchy, elective\_monarchy, confederation |
| hostage\_residence |  | 3 |  |  |  | household\_realm, tribute\_empire, horde, warlord\_domain, shogunate |
| examination\_hall | 4 |  |  |  | [G4 Examination system](Data-Research#inventions) |  |
| parliament\_house | 6 |  |  |  | [G14 Written constitution](Data-Research#inventions) |  |

## Forms

| Name | family | officials | lords | subject reach | colonial range | succession | event tree | next | self run |
|---|---|---|---|---|---|---|---|---|---|
| feudal\_realm | house | 6 | 8 | 0 | 20 | eldest\_heir | monarchy | diet\_monarchy, absolute\_monarchy, elective\_monarchy |  |
| diet\_monarchy | house | 8 | 10 | 0 | 20 | eldest\_heir | monarchy | absolute\_monarchy, constitutional\_monarchy |  |
| household\_realm | house | 10 | 4 | 1 | 10 | strongest\_son | monarchy | absolute\_monarchy, bureaucratic\_empire |  |
| bureaucratic\_empire | house | 20 | 2 | 1 | 10 | named\_heir | monarchy | constitutional\_monarchy |  |
| elective\_monarchy | house | 4 | 12 | -1 | 10 | lords\_elect | elective\_monarchy | feudal\_realm, diet\_monarchy |  |
| absolute\_monarchy | house | 16 | 4 | 1 | 20 | eldest\_heir | monarchy | constitutional\_monarchy |  |
| constitutional\_monarchy | house | 24 | 4 | 1 | 30 | eldest\_heir | constitutional\_monarchy | constitutional\_republic |  |
| city\_commune | citizens | 8 | 4 | -1 | 10 | council\_picks | republic | merchant\_republic, feudal\_realm, constitutional\_republic |  |
| merchant\_republic | citizens | 10 | 4 | 1 | 30 | council\_picks | merchant\_republic | city\_commune, feudal\_realm, constitutional\_republic |  |
| peasant\_commune | citizens | 4 | 1 | -2 | 0 | assembly\_picks | republic | city\_commune, constitutional\_republic |  |
| constitutional\_republic | citizens | 24 | 0 | 0 | 30 | elections | republic | constitutional\_monarchy |  |
| prince\_bishopric | faith | 6 | 3 | -1 | 5 | chapter\_elects | theocracy | feudal\_realm |  |
| military\_order | faith | 8 | 4 | 0 | 15 | brothers\_elect | theocracy | feudal\_realm |  |
| holy\_rule | faith | 6 | 4 | 0 | 5 | clergy\_choose | theocracy | household\_realm |  |
| clan\_council | kin | 0 | 0 | -2 | 0 | elders\_choose | tribal | chiefdom, confederation | yes |
| chiefdom | kin | 2 | 3 | -1 | 0 | chosen\_from\_lineage | tribal | paramount\_chiefdom | yes |
| paramount\_chiefdom | kin | 4 | 6 | 0 | 5 | chosen\_from\_lineage | monarchy | tribute\_empire, feudal\_realm, household\_realm |  |
| tribute\_empire | kin | 6 | 12 | 3 | 5 | royal\_kin\_choose | monarchy | household\_realm, bureaucratic\_empire |  |
| horde | kin | 2 | 10 | 2 | 0 | eldest\_of\_house | nomadic\_empire | household\_realm, confederation |  |
| confederation | kin | 2 | 10 | -1 | 0 | members\_rotate | confederation | feudal\_realm, constitutional\_republic |  |
| warlord\_domain | warriors | 4 | 6 | 0 | 5 | heir\_or\_adopted | monarchy | shogunate, feudal\_realm |  |
| shogunate | warriors | 8 | 14 | 3 | 10 | heir\_or\_adopted | monarchy | warlord\_domain, constitutional\_monarchy |  |
| soldier\_emirs | warriors | 10 | 6 | 1 | 10 | emirs\_choose | monarchy | household\_realm |  |
| military\_junta | warriors | 20 | 2 | 0 | 15 | generals\_choose | military\_junta | constitutional\_republic |  |
| party\_state | modern | 30 | 0 | 2 | 20 | party\_chooses | one\_party\_state | constitutional\_republic |  |
| company\_rule | modern | 8 | 4 | 2 | 40 | owners\_appoint | company | colonial\_government |  |
| colonial\_government | modern | 6 | 4 | none | 15 | overlord\_appoints | colonial\_administration | none |  |

## Reforms

| Name | from | to | needs | gold | lords slip | helped by | automatic |
|---|---|---|---|---|---|---|---|
| 1 | clan\_council | chiefdom | 5 or more provinces | 0 | 0 |  |  |
| 2 | clan\_council | confederation | allied with 2 neighbours of the same people | 0 | 0 |  |  |
| 3 | chiefdom | paramount\_chiefdom | 8 or more provinces | 50 | 1 |  |  |
| 4 | paramount\_chiefdom | tribute\_empire | 3 or more subjects | 100 | 1 |  |  |
| 5 | paramount\_chiefdom | feudal\_realm | G2 Feudal grants | 100 | 1 |  |  |
| 6 | paramount\_chiefdom | household\_realm | G1 Written law codes | 100 | 2 |  |  |
| 7 | tribute\_empire | household\_realm | G3 Tax registers or G6 Quipu | 150 | 2 |  |  |
| 8 | tribute\_empire | bureaucratic\_empire | G4 Examination system | 200 | 3 |  |  |
| 9 | horde | household\_realm | a palace in a town | 150 | 2 | [G3 Tax registers](Data-Research#inventions), [L7 Universities](Data-Research#inventions) |  |
| 10 | horde | confederation | no adult heir | 0 | 0 |  | yes |
| 11 | feudal\_realm | diet\_monarchy | a diet hall | 100 | 0 |  |  |
| 12 | feudal\_realm | elective\_monarchy | the ruling line dies out | 0 | 0 |  | yes |
| 13 | feudal\_realm, diet\_monarchy | absolute\_monarchy | G9 Professional bureaucracy, W12 Standing regiments | 300 | 3 |  |  |
| 14 | diet\_monarchy, absolute\_monarchy, bureaucratic\_empire | constitutional\_monarchy | G14 Written constitution, a parliament house | 200 | 1 |  |  |
| 15 | elective\_monarchy | feudal\_realm | the same house elected 3 times running | 100 | 2 |  |  |
| 16 | elective\_monarchy | diet\_monarchy | a diet hall | 100 | 1 |  |  |
| 17 | household\_realm | absolute\_monarchy | G9 Professional bureaucracy, W12 Standing regiments | 250 | 2 |  |  |
| 18 | household\_realm | bureaucratic\_empire | G9 Professional bureaucracy, an examination hall | 250 | 2 |  |  |
| 19 | city\_commune | merchant\_republic | 4 or more traders abroad | 100 | 1 |  |  |
| 20 | city\_commune, merchant\_republic | feudal\_realm | one family led the city 3 times running | 150 | 2 |  |  |
| 21 | merchant\_republic | city\_commune | trade in debt 3 years running | 0 | 1 |  | yes |
| 22 | peasant\_commune | city\_commune | a city in the realm | 50 | 0 |  |  |
| 23 | city\_commune, merchant\_republic, peasant\_commune | constitutional\_republic | G14 Written constitution, a parliament house | 150 | 0 |  |  |
| 24 | prince\_bishopric, military\_order | feudal\_realm | the ruler takes a reformed faith (religion design) | 100 | 2 |  |  |
| 25 | holy\_rule | household\_realm | one family chose the ruler 3 times running | 150 | 1 |  |  |
| 26 | warlord\_domain | shogunate | holds the imperial capital, 8 or more lords | 150 | 1 |  |  |
| 27 | warlord\_domain | feudal\_realm | G1 Written law codes | 100 | 2 |  |  |
| 28 | shogunate | warlord\_domain | the shogun loses the capital | 0 | 0 |  | yes |
| 29 | shogunate | constitutional\_monarchy | G14 Written constitution, a parliament house | 250 | 4 |  |  |
| 30 | soldier\_emirs | household\_realm | one emir's family held the throne 3 reigns | 150 | 2 |  |  |
| 31 | confederation | feudal\_realm | one member holds over half the land | 150 | 3 |  |  |
| 32 | constitutional\_monarchy | constitutional\_republic | the ruler deposed or abdicates | 0 | 0 |  | yes |
| 33 | constitutional\_republic | constitutional\_monarchy | a king invited by parliament | 0 | 0 |  | yes |
| 34 | company\_rule | colonial\_government | the crown takes over | 0 | 1 |  | yes |

## Event tree map

| Name | set | keep if in | before G14 |
|---|---|---|---|
| monarchy | feudal\_realm | feudal\_realm, diet\_monarchy, household\_realm, elective\_monarchy, bureaucratic\_empire, absolute\_monarchy, constitutional\_monarchy, paramount\_chiefdom, tribute\_empire, warlord\_domain, shogunate, soldier\_emirs |  |
| elective\_monarchy | elective\_monarchy |  |  |
| theocracy | holy\_rule | prince\_bishopric, military\_order, holy\_rule |  |
| republic | constitutional\_republic | city\_commune, merchant\_republic, peasant\_commune, constitutional\_republic | city\_commune |
| merchant\_republic | merchant\_republic |  |  |
| tribal | chiefdom | clan\_council, chiefdom |  |
| confederation | confederation |  |  |
| nomadic\_empire | horde |  |  |
| company | company\_rule |  |  |
| colonial\_administration | colonial\_government |  |  |
| constitutional\_monarchy | constitutional\_monarchy |  |  |
| liberal\_democracy | constitutional\_republic |  |  |
| one\_party\_state | party\_state |  |  |
| communist | party\_state |  |  |
| fascist | party\_state |  |  |
| military\_junta | military\_junta |  |  |

## Start forms

| Key | Value |
|---|---|
| `default` | chiefdom |

### Kingdom by region

| Key | Value |
|---|---|
| `eu_` | feudal\_realm |
| `as_anatolia_caucasus` | feudal\_realm |
| `as_levant_egypt_arabia` | household\_realm |
| `as_iran_transoxiana` | household\_realm |
| `as_south_asia_` | feudal\_realm |
| `as_china_inner_asia` | feudal\_realm |
| `as_steppe_siberia` | horde |
| `as_japan_korea` | warlord\_domain |
| `af_north_sahara` | household\_realm |
| `af_` | paramount\_chiefdom |
| `am_` | paramount\_chiefdom |
| `oc_` | paramount\_chiefdom |

#### As se asia 

| Key | Value |
|---|---|
| `tier_a_b` | tribute\_empire |
| `tier_c` | paramount\_chiefdom |

### Entity type

| Key | Value |
|---|---|
| `empire` | household\_realm |
| `grand_duchy` | feudal\_realm |
| `duchy` | feudal\_realm |
| `principality` | feudal\_realm |
| `county` | feudal\_realm |
| `margraviate` | feudal\_realm |
| `landgraviate` | feudal\_realm |
| `electorate` | feudal\_realm |
| `lordship` | feudal\_realm |
| `despotate` | feudal\_realm |
| `voivodeship` | feudal\_realm |
| `prince_bishopric` | prince\_bishopric |
| `prince_archbishopric` | prince\_bishopric |
| `imperial_abbey` | prince\_bishopric |
| `theocracy` | holy\_rule |
| `imamate` | holy\_rule |
| `sharifate` | holy\_rule |
| `military_order` | military\_order |
| `republic` | city\_commune |
| `city_state` | city\_commune |
| `free_imperial_city` | city\_commune |
| `merchant_republic` | merchant\_republic |
| `peasant_republic` | peasant\_commune |
| `league` | confederation |
| `confederation` | confederation |
| `supranational_institution` | confederation |
| `tribal_confederation` | confederation |
| `ayllu_federation` | confederation |
| `sultanate` | household\_realm |
| `emirate` | household\_realm |
| `beylik` | household\_realm |
| `atabegate` | household\_realm |
| `khanate` | horde |
| `horde` | horde |
| `nomadic_confederation` | horde |
| `sheikhdom` | chiefdom |
| `chiefdom` | chiefdom |
| `cacicazgo` | chiefdom |
| `tusi_chieftaincy` | chiefdom |
| `paramount_chiefdom` | paramount\_chiefdom |
| `altepetl` | paramount\_chiefdom |
| `kuchkabal` | paramount\_chiefdom |
| `rajahnate` | paramount\_chiefdom |
| `hueyaltepetl` | tribute\_empire |
| `mandala_polity` | tribute\_empire |
| `stateless_society` | clan\_council |
| `segmentary_lineage_society` | clan\_council |
| `iwi_network` | clan\_council |
| `shugo_domain` | warlord\_domain |
| `shogunate` | shogunate |
| `colonial_possession` | colonial\_government |
| `trading_post` | colonial\_government |

### Text rules

| Name | match | form | skip types | only types |
|---|---|---|---|---|
| 1 | ecclesiastic\|bishop\|archbishop\|abbey\|abbot | prince\_bishopric | theocracy |  |
| 2 | elective monarchy\|elective kingship\|elected king\|elective personal union | elective\_monarchy |  |  |
| 3 | merchant republic\|merchant oligarch | merchant\_republic |  | republic, city\_state, free\_imperial\_city, merchant\_republic, other |
| 4 | military order\|order province\|knightly order | military\_order |  |  |
| 5 | sufi order\|monastic\|religious corporation\|temple | holy\_rule |  | other, theocracy |
| 6 | bureaucratic | bureaucratic\_empire |  |  |
| 7 | patrimonial | household\_realm |  |  |
| 8 | military companies\|raiding bands\|loyalist band\|military lordship\|warrior house | warlord\_domain |  | other |
| 9 | acephalous\|communit\|village\|lineage organisation\|lineage-based\|suku\|bands\|communal\|council\|assembly\|decentralised | clan\_council |  | other |
| 10 | chief\|señor\|senor\|headman | chiefdom |  | other |
| 11 | lordship\|seigneur\|baron\|magnate\|princely\|appanage\|eristav\|malik\|governorship\|kingship\|kingdom\|monarch\|saopha\|warrior house | feudal\_realm |  | other |
| 12 | dependency\|governorate\|regional administration | colonial\_government |  | other |

### Overrides

| Name | form | why |
|---|---|---|
| ottoman | household\_realm | palace servants (kul), timar grants, open succession among sons |
| muscovy | household\_realm | grand prince's household and boyars; appanages and service lands |
| timurid\_empire | household\_realm | appanages for princes, household amirs |
| delhi | household\_realm | iqta grants to amirs |
| vijayanagara | household\_realm | nayaka service grants (amaram) from the raya |
| bahmani | household\_realm | tarafdar governors on service |
| safaviyya | holy\_rule | a Sufi order before it became a dynasty (1501) |
| ming | bureaucratic\_empire | examination officials, Six Ministries |
| joseon | bureaucratic\_empire | examination officials (yangban) |
| dai\_viet | bureaucratic\_empire | Le dynasty examinations and Chinese-style ministries |
| mamluk | soldier\_emirs | bought soldiers rule; emirs choose the sultan |
| venice | merchant\_republic | patriciate, doge for life |
| genoa | merchant\_republic | merchant alberghi, doge |
| ragusa | merchant\_republic | patrician councils, rector |
| lubeck | merchant\_republic | council of merchant families, head of the Hanse |
| hamburg | merchant\_republic | merchant council |
| hanseatic\_league | confederation | league of towns (an institution) |
| florence | city\_commune | guild republic under Medici influence |
| novgorod | city\_commune | veche republic with a posadnik and archbishop |
| pskov | city\_commune | veche republic |
| england | diet\_monarchy | Parliament grants taxes |
| aragon | diet\_monarchy | Cortes of each realm of the crown |
| aragon\_kingdom | diet\_monarchy | Cortes of Aragon |
| catalonia | diet\_monarchy | Corts and the Generalitat |
| valencia | diet\_monarchy | Corts of Valencia |
| poland | elective\_monarchy | Jagiellonian kings elected by the lords |
| hungary | elective\_monarchy | diet elects the king; regency of Hunyadi |
| bohemia | elective\_monarchy | estates elect; interregnum |
| swiss\_confederation | confederation | diet of cantons |
| uri | peasant\_commune | Landsgemeinde |
| schwyz | peasant\_commune | Landsgemeinde |
| unterwalden | peasant\_commune | Landsgemeinde |
| glarus | peasant\_commune | Landsgemeinde |
| appenzell | peasant\_commune | Landsgemeinde |
| dithmarschen | peasant\_commune | farmers' republic |
| iceland | peasant\_commune | Althing under the crown |
| haudenosaunee | confederation | league council of nations |
| ashikaga | shogunate | military government over shugo houses |
| japan\_imperial\_court | holy\_rule | court monarchy whose power is ritual and appointment |
| honganji\_temples | holy\_rule | self-governing temple corporations |
| inca | tribute\_empire | kept kuraka lords give labour and loyalty |
| tenochtitlan | tribute\_empire | tribute provinces of the Triple Alliance |
| triple\_alliance | tribute\_empire | hegemonic tribute alliance |
| texcoco | tribute\_empire | partner in the Triple Alliance |
| chimor | tribute\_empire | coastal kingdom holding valley lords |
| purepecha | tribute\_empire | tribute state ruled from Tzintzuntzan |
| mali | tribute\_empire | mansa over clans and tributary rulers |
| songhai | paramount\_chiefdom | Sunni kingship before its expansion (1464) |
| bornu | household\_realm | Sayfawa mai with titled officials |
| ethiopia | feudal\_realm | Solomonic emperor with rases and a moving royal camp |
| kongo | paramount\_chiefdom | mani Kongo chosen by electors from the royal kin |
| majapahit | tribute\_empire | mandala over tributary courts |
| ayutthaya | tribute\_empire | mandala; sakdina ranks being set up |
| papal\_states | holy\_rule | the pope chosen by cardinals |
| teutonic\_order | military\_order | Grand Master and commanderies |
| livonian\_order | military\_order | Landmeister and commanderies |
| knights\_hospitaller | military\_order | Grand Master at Rhodes |
| great\_horde | horde | Jochid khans and begs |
| crimea | horde | Giray khan with four clan beys |
| kazan | horde | Chinggisid khan with clan beys over a settled Bulgar-Tatar base (GOV-067) |
| northern\_yuan | horde | Chinggisid khan and taishi |
| oirat | horde | clan league under a taishi |
| hre | elective\_monarchy | electors choose the king; an institution over member realms |
| council\_of\_basel | holy\_rule | church council claiming authority over the pope |
| neuchatel | feudal\_realm | a county |
| idrisid\_sharifs\_fez | holy\_rule | sharifian lineage with religious standing |
| kandy | feudal\_realm | local aristocracy under a king |
| silesia | confederation | duchies under the Bohemian crown |
| bavarian\_minor\_estates | feudal\_realm | small lordships |
| franconian\_minor\_estates | feudal\_realm | small lordships |
| swabian\_minor\_estates | feudal\_realm | small lordships |
| upper\_rhine\_minor\_estates | feudal\_realm | small lordships |
| ryukyu | feudal\_realm | Sho kings over island lords (aji) |
| qara\_qoyunlu | horde | Turkmen tribal confederation under a ruling clan |
| aq\_qoyunlu | horde | Turkmen tribal confederation under a ruling clan |
| nogai | horde | Bey-led horde of the Nogai steppe (GOV-067) |

## Succession names

| Key | Value |
|---|---|
| `eldest_heir` | eldest heir |
| `strongest_son` | strongest son |
| `named_heir` | named heir |
| `lords_elect` | lords elect |
| `council_picks` | council picks |
| `assembly_picks` | assembly picks |
| `elections` | elections |
| `chapter_elects` | chapter elects |
| `brothers_elect` | brothers elect |
| `clergy_choose` | clergy choose |
| `elders_choose` | elders choose |
| `chosen_from_lineage` | chosen from the chief's lineage |
| `royal_kin_choose` | royal kin choose |
| `eldest_of_house` | eldest of the house |
| `members_rotate` | members take turns |
| `heir_or_adopted` | heir or adopted son |
| `emirs_choose` | emirs choose |
| `generals_choose` | generals choose |
| `party_chooses` | the party chooses |
| `owners_appoint` | owners appoint |
| `overlord_appoints` | overlord appoints |

## Ai

| Key | Value |
|---|---|
| `reform_month` (provisional) | 1 |
| `reform_gold_reserve_factor` (provisional) | 2 |

## Riders line

> GOV-077: the horde's edge and its end, on the Government tab of a realm in these forms

| Key | Value |
|---|---|
| `forms` | horde |

### Fades against

| Name | invention | label |
|---|---|---|
| 1 | [W8 Field artillery](Data-Research#inventions) | field guns |
| 2 | [W11 Flintlock and bayonet](Data-Research#inventions) | flintlocks |
