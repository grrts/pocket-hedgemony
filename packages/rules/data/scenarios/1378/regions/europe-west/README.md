# The 1378 start: western Europe, the Empire, Italy and the Nordic realms

This folder is the `europe-west` part of the 1378 scenario (X-25, milestone 10 step 5): the British Isles, France,
Iberia, the Low Countries and Rhineland, the northern and southern Empire, Italy and Scandinavia on 20 September 1378.
It was built from `start-date/research/europe-west.md`, `research/decisions.md` and `checkpoints/1378.json` in the
project files, with the 1444 scenario as the template for every file's shape.

**What is here:** 72 map nations, 171 owner rules, 3 sleeping realms (Spain, the Dutch Republic, Glyndŵr's Wales),
a ruler and tongues for every map nation, 184 relations and 44 facts on the start day, the Schism obedience of
180 Catholic realms and records (`relations.json` → `obedience`: `rome`, `avignon` or `null` while undecided),
68 subject records and 120 port towns.

**Map scale.** Map provinces in western Europe are about 15,000–20,000 km², so realms smaller than that (Jülich,
Berg, Werle, Lübeck, Mantua, Lucca and the like) stay catalogue records with relations and subject rows but no land.
Two map capitals in one province break the map generator, so a few capitals are moved to a nearby residence
(Brandenburg at Berlin, Mainz at Eltville, Trier at Koblenz, and Venice at Mestre, since the lagoon point fell into Padua's province when the regions were joined); the notes below say where.

**Owner rules** are ordered enclaves first (land a western realm holds abroad: Venice's Crete, Negroponte, Modon,
Coron and Tenedos; Genoa's Corsica, Chios, Famagusta and Crimean coast; Habsburg Alsace; Norway's Orkney), then the
southern Empire and Nordic lands, Iberia and Italy, the British Isles and France, and the Low Countries and northern
Empire. A few home rules name a realm another region defines (`hungary` for Burgenland and Prekmurje, `poland` for
the Częstochowa corner, `novgorod` for North Karelia, `morocco` for Ceuta and Melilla).

**Goals:** each realm's historical goals with their reasons are in `goals.json` (plan-1378 §2, EVT-100)
(step 6); the generated `world/` comes when all four regions are joined and the map generator is run.

The notes below are the calls made in each part, with confidence, kept for the source pass.

## British Isles and France


### Map nations (12)
england, scotland, ireland, france, burgundy, brittany (these six keep their 1444 ids), anjou, berry, bourbon, foix, armagnac, franche_comte (new).
- **provence is not a map nation.** The integration chose that its land goes to `naples` (Iberia+Italy part). `provence` stays a catalogue record: a personal-union subject of naples, avignon obedience, a shared_ruler fact.
- **franche_comte** is Margaret of France, holding Artois and the County of Burgundy until 9 May 1382. The research's checkpoint fix #2 says these are not Flanders' lands. So Pas-de-Calais, Doubs, Jura and Haute-Saône go to franche_comte, not flanders (high). Capital Dole, as the research gives.
- **ireland** means the Gaelic and Gaelicised lords. Its capital is Dungannon, the O'Neill seat (my pick; 1444 used Kilkenny, and Cashel lies in Ormond's English-held land). Medium.
- Kept as catalogue records with no land, as in 1444: lordship_of_the_isles, douglas_earldom, alencon (about half of Orne), albret, dauphine (royal land), the Comtat, Orange, free_companies (castles below map size), the Irish earls.

### Owner rules: choices and confidence
- England in Ireland: Dublin, Meath, Westmeath, Louth, Kildare, Kilkenny and South Tipperary (Ormond, loyal), plus the coast of the Ulster earldom (bbox in Down and Antrim). Medium. The rest of Ireland goes to `ireland`.
- Orkney and Shetland go to `norway` (Nordic part): the earldom is vacant under a royal captain. High.
- The Scottish border stays Scottish. The English hold only castles there (Roxburgh, Jedburgh, Lochmaben). Berwick is in Northumberland, so it falls to England anyway.
- England in France: Gironde, Landes, Labourd (bbox) and the 1444 Calais bbox. Brest and Cherbourg get tiny bboxes that are below map size, so their ports carry them. Calais lies inside the Pas-de-Calais province, so it shows only as a port (the same as in 1444).
- Foix holds Béarn (Pyrénées-Atlantiques), Ariège, Hautes-Pyrénées (Bigorre, medium-low) and Andorra. Armagnac holds Gers and Aveyron (Rodez, medium).
- Anjou holds Anjou, Touraine and Maine. Whether Louis I still held Maine is low confidence in the research; most sources say he did. Berry holds Cher, Indre, Puy-de-Dôme, Cantal, Vienne, Deux-Sèvres and Vendée. Bourbon holds Allier. Burgundy holds only Côte-d'Or and Saône-et-Loire: Yonne (Auxerre, bought by the crown in 1370), Somme and Haute-Marne are royal.
- Brittany holds the Bretagne region plus Loire-Atlantique. Nantes counts as ducal, as the checkpoint's low-confidence reading has it.
- Hautes-Alpes is Dauphiné, so it goes to france. In 1444 it was Provence's.
- Vaucluse goes to naples. The Comtat and Orange are below map size.
- Forez (Loire) goes to france. It passes to Bourbon only later (low).
- Corsica and Monaco are left out for Iberia+Italy. The France catch-all bbox ends at 8.3°E, which leaves Corsica out. The Monaco port is left out too.
- No rule covers overseas FRA (Guyane, the Antilles, Réunion, Mayotte), as in 1444.
- owners-enclave.json is empty. All the land my realms hold outside home lies in FRA, which is my home country.

### Cross-region issues (other parts' realms named in FRA)
- `flanders` gets Nord (Lille, Douai, Orchies, returned in 1369), Nièvre (Nevers) and Ardennes (Rethel). Ardennes is medium.
- `lorraine` gets Meurthe-et-Moselle, Vosges, Moselle and **Meuse**. Meuse is really the Duchy of Bar (Robert I), a separate realm in 1378. If the Low Countries part makes `bar` a map nation, change that rule.
- `austria` gets Haut-Rhin (Habsburg Sundgau). `palatinate` gets Bas-Rhin, **low**: this follows 1444, but in 1378 the strongest lord there is the Bishop of Strasbourg (landgrave of Lower Alsace since 1359). The Southern Empire and Low Countries parts should confirm or override.
- `savoy` gets Savoie, Haute-Savoie and Ain (Bresse, Bugey, Gex). `aragon` gets Pyrénées-Orientales. `navarre` gets Basse-Navarre (bbox). `naples` gets Provence and Nice (Nice stays Provençal until 1388).
- Angevin Piedmont (Cuneo, Angevin until 1382) is not written. It is for Iberia+Italy if they want it.
- I wrote no subject rows for Flanders (vassal of France), Andorra (fief of Foix) or Naples. Their subject records belong to other parts.

### Relations and obedience
- The France–Navarre relation is `at_war` (France seized the Norman counties and Montpellier in Apr–Jun 1378). Medium: the research leaves open whether only hostility fits.
- The England–Scotland truce of 1369 expires on 2 Feb 1384 (medium on the exact day).
- Black rent is a `secondary_tribute` fact from lordship_of_ireland to leinster_kavanagh and gaelic_leinster_midlands, as in 1444, and is not a subject relation.
- Obedience: England, Ireland and the Gaelic lords are rome (the Gaelic lords are low confidence). Scotland and its magnates are avignon. France, its princes, Brittany (medium) and Franche-Comté (low) are avignon. **Foix is null**: Fébus never clearly took a side.
- New source ids that need entries: src_fr_sumption_hyw3, src_ncmh6, src_fr_autrand_charles_v, src_fr_tucoo_chala_febus.

### Rulers: uncertain points
- England's heir is given as John of Gaunt, heir presumptive under Edward III's entail of 1376. By primogeniture it would be the Mortimers. Medium.
- Armagnac: John II's age is about 45 (low). Joanna I's age (52) no longer matters, since provence has no ruler entry.

### Sleeping realm
- `wales_glyndwr` (Wales). Its capital is Harlech [-4.11, 52.86], with an empty home list. It was born in 1400 and has no 1444 record. The research recommends it as a sleeping formable.
- orleans, nevers and ecorcheurs are formable catalogue records, not 1444 map nations, so they are not listed as sleeping realms.

## Iberia and Italy


### Map nations (24)
castile, aragon, portugal, navarre, granada, savoy, milan, visconti_pavia, venice, genoa, florence,
modena (named "Ferrara", the Este), papal_states, naples, sicily, oristano (named "Arborea"), verona, padua,
pisa, aquileia, montferrat, bologna, siena, perugia.

- **Arborea uses the checkpoint id `oristano`**, not `arborea` (the brief prefers the checkpoint id; the research does the same).
- **Bologna, Siena, Perugia and Montferrat are map nations** because each holds about a province (the Bologna,
  Siena+Grosseto, Perugia and Monferrato areas) (medium). Bologna and Perugia are also `vassal`/`very_high` subjects
  of `papal_states`, which follows 1444's convention for Bologna.
- Kept as catalogue records with no map land: mantua, lucca, saluzzo, urbino, rimini, forli, camerino, ancona,
  faenza, san_marino and the groups. Their land falls into the neighbouring rules: Mantova goes to `milan` (the
  Lombardia catch-all), Lucca and Massa-Carrara go to `florence`, Cuneo goes to `savoy`, Pesaro e Urbino and the
  Romagna go to `papal_states`. Each of these is too small for a province.
- **Castile's capital is Toledo** (the 1444 value). The checkpoint says Burgos; the court moved around (the research
  recommends one consistent id). **Aragon's capital is Barcelona** (checkpoint; the king lives there), not 1444's Zaragoza.
- **Provence is not defined here.** Its land belongs to `naples` (Joanna I, personal union). The France part writes the
  FRA land rule, which should name `naples`. If it defines `provence` after all, the Nice port holder and Naples'
  occitan culture share need changing. The checkpoint gives Marseille to `naples`.
- Colours: I kept 1444's colours where 1444 set one, gave new nations distinct muted colours, and left the rest to the generator.

### Owner rules: choices and confidence
- Visconti split (medium; the exact towns are uncertain in the research). Gian Galeazzo (`visconti_pavia`) gets Pavia,
  Novara, Vercelli, Biella, Ossola, Como, Varese, Sondrio, Piacenza, Alessandria and Asti. Bernabò (`milan`) gets
  Milano, Monza, Lecco, Bergamo, Brescia, Cremona, Lodi, Mantova (catch-all), Parma and Reggio. Biella goes to the
  Visconti side under the Bishop of Vercelli; it passes to Savoy in 1379 (low). Asti goes to `visconti_pavia` (low, as
  in the research).
- Montferrat is a Piemonte bbox [7.85,44.5,8.65,45.25] placed after Asti. Its capital Casale is always given to it.
- Trentino-Alto Adige and Belluno go to **`austria`**. Belluno is Feltre-Belluno under Leopold III since 1373 (medium).
  Neither nation is mine; the Southern Empire part owns `austria`.
- Friuli (Udine, Pordenone, Gorizia) goes to `aquileia`. The County of Gorizia proper is a Southern Empire matter; it is
  too small for a province.
- Trieste goes to `venice` (Venetian since 1369; it revolts to the Patriarch in 1380). Rovigo (the Polesine) goes to `modena`.
- Sardinia: Cagliari goes to `aragon`; the rest, Sassari included, goes to `oristano` (high). Alghero's port is still
  given to `aragon`.
- Arezzo goes to `florence`, which is an anachronism: Arezzo is Florentine only from 1384 (low).
- Granada gets Granada, Málaga and Almería, plus a Campo de Gibraltar bbox and GIB (Gibraltar since 1374, Algeciras).
- **Ceuta and Melilla (ESP) go to `morocco`**, the Marinids. This is a cross-region nation id inside my home rules;
  the Africa part owns `morocco`. The Canaries, Madeira and the Azores are null. The Funchal port holder is null:
  Madeira is uninhabited in 1378.
- Lombardy's Ticino lands (Bellinzona, Lugano) are Visconti but lie in CHE, so I wrote no rule for them. Savoy's Vaud,
  lower Valais and Genevois are also in CHE: **the Southern Empire part should give CHE Vaud and the lower Valais
  to `savoy`**. Savoy's French lands (Savoie, Haute-Savoie, Bresse and Bugey in Ain) and Aragon's Roussillon and
  Cerdagne belong to the British+France part, which should name `savoy` and `aragon`. Navarre's Ultrapuertos (Basse-Navarre)
  also belongs to that part (`navarre`).

### Enclaves
- Genoa: Corsica (FRA Corse; contested by Arrigo della Rocca, medium), Monaco (MCO), Chios (bbox), Famagusta (bbox,
  CYP/CYN), and the south and east Crimean coast with Caffa, Soldaia, Cembalo and Vosporo (UKR/RUS bbox).
- Venice: Crete (Kriti), Negroponte (Euboea bbox inside Stereá Elláda), Modon and Coron (bbox), Tenedos (bbox), Istria
  (HRV Istarska) and the Capodistria-Pirano coast (SVN bbox). Dalmatia is Hungarian, so I wrote no rule for it.
- Naples: Corfu (bbox in Ionioi Nisoi; Angevin until 1386, which the coordinator confirmed).
- Left out because they are smaller than a province: Pera (Genoese, inside the Istanbul capital province), Tana (Venetian
  and Genoese), the Cyclades (the Sanudo/dalle Carceri duchy and the Ghisi are vassals, not Venice itself) and Amastris.
  The Tana port holder is `venice`. Chios, Gazaria and Genoa's Aegean colonies are 1444 colony subjects of genoa; I gave
  that land directly to `genoa` and did **not** list those records as subjects, so the East part should not either, or
  the joiner should drop one of the two.

### Relations
- Ids use 1444's catalogue ids, so the Este appear as **`ferrara`** in relations and subjects (as in 1444; the engine
  maps modena to ferrara), but as `modena` in rulers, culture and obedience.
- A relation between my realm and a foreign one always has my realm as its source, so its id may differ from the one
  another part writes for the same pair (england–castile, england–portugal, england–navarre, france–castile,
  france–navarre, hungary–venice/genoa/padua, cyprus–venice/genoa, morocco–granada, foix–andorra, dauphine–saluzzo,
  austria/bavaria–milan marriages). **The joiner should dedupe by the unordered pair plus the type.**
- I left out the Peace of Almazán as a `truce`: it was a peace, so Castile–Aragon is `rival` with royal-marriage facts.
  Granada–Morocco is `friendly`: the research calls it a protectorate, which has no 1444 type.
- I did not model the Empire's nominal suzerainty over Italy (1444 does not either). Sicily held of Naples and the Pope
  is nominal only and is not a subject. Provence–Naples as a personal union is the France part's edge, if it defines provence.
- Not included: Lancaster's claim to Castile (source `england`) and Anjou's claim to Majorca (source `anjou`).
- Obedience: savoy, naples and saluzzo are `avignon` (they declare in autumn 1378). Castile, Aragon, Navarre, Portugal,
  Sicily, Arborea, Montferrat and Sardinia are null (undecided). All other Italians are `rome`.

### Uncertain values
- Ages: Andrea Contarini about 78, Hugh III about 41, the heirs Azzone Visconti (10) and John of Montferrat (16) are
  medium. Guarco, Gambacorta, the della Scala brothers and Marquard have no age.
- Hawkwood is given to `florence`: he is between Bernabò's and Florence's service in 1378 (medium).
- The Florentine gonfaloniere for Sep–Oct 1378 is unknown, so the ruler is "Minor-guild regime".
- New tongues: `sicilian` and `sardinian` (latin, settled).
- No sleeping realms: every 1444 map nation of my area exists in 1378. The catalogue formables (asti, monaco,
  piombino, sforza_marche, braganza, taranto, pesaro, faenza) are left to the catalogue.

## Low Countries, Rhineland and northern Empire


### Map nations (25)
flanders, holland, brabant, luxembourg, guelders, liege, utrecht, friesland, lorraine, mainz, trier, cologne, munster, palatinate, hesse, saxony, saxe_wittenberg, brandenburg, luneburg, brunswick_gottingen, bremen, hamburg, holstein, mecklenburg, pomerania.

**How the map is cut.** Provinces are cut from admin1 units grouped by owner. Units over about 19k km² are split by k-means, and small pieces merge. For example, Schleswig-Holstein stays one province, while Niedersachsen becomes about 4. Two capitals in one province break mapgen (the second takes the province), so I placed capitals to avoid that:
- **brandenburg** has its capital at Berlin, not Tangermünde (the checkpoint's residence). Tangermünde and Wittenberg would both sit in Sachsen-Anhalt and could share a piece. Medium confidence that this matters.
- **palatinate** keeps the 1444 capital [8.14, 49.35] (Neustadt) rather than Heidelberg. Heidelberg lies in Baden-Württemberg, near wurttemberg's capital. An enclave rule gives the Palatine part of north Baden to palatinate.
- **mainz** has its capital at Eltville, the archbishops' 14th-century residence in Hessen. Mainz city was a free city until 1462.
- **trier** has its capital at Koblenz (Ehrenbreitstein), which keeps it apart from Luxembourg and Neustadt.
- **luneburg** has its capital at Celle, where the dukes went after leaving Lüneburg town in 1371.
- **bremen** (the prince-archbishopric) has its capital at Bremervörde. It also holds the Bremen admin1 and the port of Bremen; bremen_city stays a catalogue record.

**Not map nations** (they stay catalogue records):
- **lubeck**: its capital would fall in holstein's single Schleswig-Holstein province.
- **cologne_city**: Cologne and Bonn are 25 km apart.
- Also werle, julich, berg, cleves, mark, namur, arkel, magdeburg, oldenburg and the bishoprics.
- **Key-place mismatch:** the checkpoint gives Lübeck to `lubeck` and Cologne to `cologne_city`. At this granularity the map shows them as holstein's and cologne's. The integrator could force a split if key places must match.

**Choices about who holds what:**
- **friesland** is made a map nation ("Frisia", ruler null). It covers the Frisian freedom: NLD Friesland and Groningen, plus the East Frisian coast. It needs to exist so that Stavoren and Emden have a holder and the land is not left unowned. tom Brok (east_frisia) and Groningen stay records. Confidence medium.
- **brunswick_gottingen** (Otto the Evil) holds the Welf south: Göttingen plus the Wolfenbüttel lands he rules as regent. brunswick_wolfenbuttel stays a record, linked by a `shared_ruler` fact and a rival relation. The research leaves open whether his regency ended in 1381 or 1384.
- **munster** is added so that Westphalia and the Emsland have a holder. **cologne** keeps the Rhineland and the Sauerland (the Duchy of Westphalia).
- **lorraine** holds the Saarland (its German bailiwick at Wallerfangen and Saarbrücken's area). I do not define bar as a map nation.
- **liege** holds BEL Namur as well; the County of Namur is a record.

### Owner rules
- The **Lusatias go to bohemia**, as the coordinator asked. These two rules in owners-home name another part's realm.
- **Enclaves:**
  - palatinate in north Baden (Baden-Württemberg) and in the Upper Palatinate (Bayern).
  - pomerania in POL Pomeranian west of Pomerelia (Słupsk), the Stolp lands.
  - Each matches only a province centred in its bbox, so with the current cut they probably match nothing.
- **Straubing:** I wrote no rule, because the Southern part writes holland for it, as the coordinator said. North Schleswig in DNK is written as holstein by the Southern+Nordic part. Both ids are my map nations.
- **Neumark** (POL Lubusz, north) goes to brandenburg. The research's Southern section gives the Neumark to gorlitz_duchy (John of Görlitz). That division only takes effect at Charles IV's death on 29 Nov 1378, so on the start day it is still Brandenburg's. Confidence medium.
- **Holland's provinces:** Hainaut (BEL) is not joined to the rest of Holland, so it will merge into a neighbouring piece. Its rule then gives holland the province if Hainaut is the larger part.

### Rulers and other uncertain facts
- **brandenburg:** Sigismund, aged 10, as in the checkpoint. The research says Wenceslaus was formally margrave until 29 Nov 1378 (medium).
- **liege and utrecht** both list Arnold of Horne. He was moved to Liège but still holds Utrecht's revenue until Florence of Wevelinkhoven takes possession (Nov 1379). Florence is still bishop of munster on the start day.
- **guelders:** William I of Jülich, aged 14, whose father acts for him. The succession war against Mathilda and John of Blois is an at_war relation with `french_minor_lordships`, where the research puts the Blois party. Who held which Guelders towns on the day is unknown.
- **holland:** Albert as Regent for William V.
- **brabant:** Joanna (with Wenceslaus). Brabant and Luxembourg are linked by a `shared_ruler` fact, not as subjects.
- **Ages:** I left them null where the birth year is uncertain.
- **Subjects:**
  - Under 1444 conventions, imperial estates are not subjects.
  - brandenburg is an appanage of bohemia (high autonomy, 1373).
  - flanders is a vassal of france (very_high).
  - Records listed as subjects: ghent, hainaut, arkel, bar, vaudemont, soest, schwarzburg and harz_thuringian_counties.
- **Playable subjects:** 1444's list for these regions, without the formables calenberg and thuringia, plus the new records julich, berg, namur and werle.

### Schism obedience
I followed the research tables. lorraine, bar, vaudemont, metz and toul_verdun are Avignon. brabant, luxembourg, mainz, namur, cambrai and erfurt are null. Everything else is Rome.

### Culture
- **New tongue `frisian`** (germanic, settled). Frisia's court and people, plus 5% of holstein (North Frisians).
- **Copied tongues:** sorbian, polish and danish are copied exactly from the 1444 culture-start tongues, because culture.json lacks them. Other parts may define the same ids, so dedupe them when joining.
- **saxe_wittenberg** has Low German as its court and main tongue (low confidence).

### Sleeping realms
dutch_republic only, with capital [4.9, 52.37] (Amsterdam). It comes from 1444's sleeping list. Every 1444 map nation in this area continues in 1378. The formables julich_berg (1423), palatine_cadet_lines (1410), calenberg (1432) and thuringia (1382) are left for step 6.

### Cross-region items
- These belong to other parts' realms, so I left them for those parts:
  - burgundy's claim on Flanders (France part).
  - bohemia's claim on Luxembourg (Southern part).
- **Lübeck port** has holder holstein, as a consequence of the map granularity. Historically Lübeck is a free city.
- **Upper Palatinate:** the Southern part should know that palatinate holds it (not bavaria).

## Southern Empire and the Nordic realms

Built from europe-west.md (Southern Empire, Nordic sections), decisions.md and checkpoints/1378.json. Source id used in relations: `res_europe_west_1378`.

### Map nations (11)
austria, bohemia, moravia, bavaria, wurttemberg, burgraviate_of_nuremberg, salzburg, switzerland, denmark, norway, sweden.
- austria is one realm (Albert III and Leopold III jointly; Neuberg partition 25 Sep 1379 is an event). Tyrol, the Vorlande, Carniola and Habsburg Istria are inside it.
- moravia (Jobst) is a map nation and an appanage subject of bohemia (Moravia is more than one province of land). Medium.
- salzburg is a map nation because the brief lists it. It is under a province of land, so drop it to a catalogue record if the map is too crowded.
- switzerland keeps the checkpoint capital (Lucerne, a convention) rather than 1444's Bern. In relations it is `swiss_confederation`, as in 1444, because relations are keyed by catalogue id (scenario-setup map_to_catalogue).
- Capitals: denmark Vordingborg (checkpoint, medium); bavaria Munich (Landshut is the senior seat); burgraviate Cadolzburg.
- No commanders: there is no famous 1378 field commander in these realms.

### Sleeping realms: none
Every 1444 map nation in these regions exists in 1378. The formables born 1379-1444 are not 1444 map nations, so they are only noted here: bavaria_landshut, bavaria_ingolstadt, bavaria_munich (1392), wurttemberg_urach and wurttemberg_stuttgart (1442), ansbach and kulmbach (1398), tyrol (1406), alsace_habsburg (1444), appenzell (1403), palatinate_neumarkt and palatinate_mosbach (1410), tabor (1420), podebrady_landfriede (c.1440), council_of_basel (1431), kalmar_union (1397; should sit over the three kingdoms, not replace them), gotland (1437/39).

### Owner rules: calls and confidence
- Home rules name foreign map nations where land in my home countries belongs to another realm (the brief asks for all land to be covered). Those ids must exist in the joined file: hungary (Burgenland, Prekmurje), venice (Koper, Izola, Piran), visconti_pavia (Ticino: Como's district, which is Gian Galeazzo's half in the research; medium), savoy (Vaud, Geneva, Valais: Savoy holds Vaud and the Lower Valais, the bishop of Sion is a Savoyard; medium), poland (Częstochowa corner of POL Silesian), palatinate (Upper Palatinate around Amberg, and Heidelberg in Baden-Württemberg), holland (Straubing-Bavaria), holstein (North Schleswig in DNK, per decisions.md), novgorod (FIN North Karelia, the Karelian side of the Nöteborg line; low-medium).
- Habsburg land in CHE is folded into austria: Aargau, Thurgau, Schaffhausen, Glarus, Fribourg, and the Basel/Jura and St. Gallen/Appenzell lands (bishop of Basel, abbot of St. Gallen; Leopold holds the Kleinbasel pledge). Graubünden also goes to austria (League of God's House and the bishop of Chur have no map nation; the Lower Engadine was Tyrolean). Low. Solothurn and Neuchâtel are folded into switzerland (Bern's neighbours). Low.
- Bayern: Franconia goes to burgraviate_of_nuremberg, which takes in the land of Würzburg, Bamberg and Nuremberg city as well (low; these are catalogue-only realms). Habsburg Burgau goes to austria (medium). Bavarian Swabia goes to bavaria, which holds the Lower Swabian Landvogtei from Aug 1378. Innviertel and Kufstein/Kitzbühel (now AUT) go to bavaria (high).
- Baden-Württemberg: Breisgau goes to austria. Baden, Ulm and the Swabian cities are folded into wurttemberg (low).
- Enclaves: Orkney and Shetland go to norway (Orkney earldom vacant until 2 Aug 1379; 1444 gave them to scotland). Austria takes Gorizia county (as instructed, medium; Count Meinhard VI is really separate), Pordenone (Habsburg since 1278), inner Istria/Pazin (1374) and Upper Alsace with Belfort (Habsburg landgraviate; 1444 gave Upper Alsace to palatinate). Following the coordinator, Trentino-Alto Adige and Belluno are left to the Italy part, which writes them as austria.
- Halland is all Danish (northern Halland's holder is low confidence), and so are Gotland and Scania. The Scanian castles are pledged to the Hanse (Stralsund 1370-1385). That is a fact and a relation, not land. Bohuslän and Jämtland go to norway.
- Åland: 1444 used the code ALD and the brief says ALA, so both are listed. Greenland (GRL) is not in the admin1 index, and 1444 gave it no owner, so there is no rule. The Herjolfsnes port is held by norway.

### Cross-region notes
- **Lusatia is Bohemian.** Upper Lusatia (DEU Sachsen, written by the Northern Empire part) and Lower Lusatia (DEU Brandenburg, around Cottbus) are Bohemian crown land in 1378. Their owner rules should name `bohemia`. The Görlitz district is John of Görlitz's appanage (gorlitz_duchy, subject of bohemia).
- Northern Lubusz (the Neumark) is not covered here. Only southern, Silesian Lubusz is bohemia.
- `brandenburg` under `bohemia` (vassal, 1373): its source is brandenburg, so the Northern Empire part writes it. It is not in my subjects.json.
- `orkney` under `norway`: its source is orkney (British part). The earldom is vacant on the start day, so the subject relation should start 1379.
- Mutual edges with the Northern Empire that may be duplicated: denmark–mecklenburg rival, denmark–holstein rival, sweden–mecklenburg friendly. Dedupe by pair. The Mecklenburg claim to the Danish throne is a fact the Northern Empire part writes, with mecklenburg as source.
- Ports: Flensburg (held by schleswig in 1444) goes to holstein. Trieste goes to venice (Venetian 1369-80; Habsburg only from 1382). Malmö stays denmark, but its castle is a Hanseatic pledge.

### Left out or simplified
- sapmi tribute (to norway, sweden and novgorod) is not a subject row, as in 1444, to avoid three overlords. schleswig is not a realm until 1386 (decisions.md).
- The vassalage of schleswig to denmark is nominal and left out. The Gotland claim of sweden is put in the denmark–sweden rival explanation.
- The Swabian league members (ulm, augsburg, constance) are written as alliances with swabian_league_cities. Appenzell is left out because it sleeps. Toggenburg and kyburg_burgdorf (small new records in the research) are not written. They could be notes on bern and the Swiss lords.
- Austria is not a party to the War of Chioggia on the start day. Its gain of Treviso in 1381 is a later event.
- Obedience: every map nation is set to rome (all recognise Urban VI on the start day; Leopold's lands go to Avignon only in winter 1379-80, after Neuberg).
- Ages: Jobst (b. 1351), Prokop (c.1354), Eric of Mecklenburg (c.1365) and Albert of Sweden (c.1338) are medium. Salzburg's archbishop has no age.
- Sweden's court tongue is kept as swedish under the Mecklenburg king. Its mix adds 3% low_german for the German burghers and castellans.

