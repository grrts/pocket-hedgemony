# The 1378 start: the east

Eastern Europe, the Balkans and the Aegean, Anatolia, the Caucasus, the Rus lands, the steppe, Iran and Transoxiana on 20 September 1378 (X-25, milestone 10 step 5). Built from `start-date/research/east.md` (its sources are named there: Fine, Nicol, Imber, Inalcik, Setton, Bosworth, Rowell, Knoll, Engel, Martin, Crummey, Spuler, Manz, Roemer and others), the calls in `start-date/research/decisions.md`, and `start-date/checkpoints/1378.json` with east.md's fixes.

| File | Holds |
|---|---|
| `map-nations.json` | 77 realms owning land on the start day |
| `map-owners.json` | owner rules for the countries `east` holds (see `../README.md`), plus narrowed rules handing land to realms of other regions (Mamluk Cilicia, Angevin Corfu, Silesian Oświęcim) |
| `rulers.json`, `culture-start.json` | each realm's ruler, tongues and faith; Lithuania keeps the new `baltic_traditional` faith |
| `relations.json` | relations and facts on the start day, landless actors as `entities`, and each Catholic realm's `obedience` in the Schism |
| `subjects.json` | subject records and stances |
| `sleeping-realms.json` | realms not yet born (Kazan, Crimea, the Nogai, the Uzbeks, the Mushasha, Herzegovina, the Kastrioti and others) |
| `goals.json` | historical goals with their reasons, for the AI to weigh from step 6 |

Day-one wars: Mamai's Horde against Moscow (after the Vozha), Arta against Ioannina, the Hospitallers against Arta, and the Orders against Lithuania. The Byzantine civil war is one realm, `byzantium` under Andronikos IV, with John V's claim as a fact. Venice and Genoa's colonies come from `europe-west`.

Confidence is marked in each record where the research was unsure. The calls made while building the data follow, by part.


## Balkans, Aegean, Anatolia, Caucasus (1378)

Decisions where east.md was unsure (confidence in brackets):
- Albania (Thopia) capital Krujë, not Durrës; Durrës is in the Durrës admin1 under albania, but the holder on 20 Sep 1378 (Thopia or the Navarrese) is unknown (low).
- Germiyan dowry and Hamid sale not done yet (the chroniclers' 1381 dating): Kütahya stays Germiyan's, and Akşehir/Beyşehir (a bbox in Konya) stays Hamid's (medium). Germiyan and Ottomans are "friendly" while the marriage is being arranged.
- Karaman–Ottoman marriage (Nefise Hatun) put after the start, so no royal_marriage fact (low).
- Kera Tamara with Murad by 1378 (medium): royal_marriage fact ottomans–bulgaria_tarnovo.
- Lazar: no Ottoman tributary tie (disputed); Braničevo/Kučevo (Radič Rastislalić) shown as Hungarian until Lazar takes it in 1379 (low).
- Hungary over Wallachia: subject, autonomy very_high, low confidence (plan §4 lists it; east.md says claimed, not used). Hungary over Bosnia and Zeta: left out (nominal only).
- Thessaloniki, Serres and Chalcidice: byzantium, one realm (faction unclear; medium). Thrace east of the Mesta Ottoman.
- Prilep (Marko) and Velbužd (Dragaš) are Ottoman subjects without map land: their land (MKD outside Skopje/Polog, Kyustendil, Blagoevgrad, Dytiki Makedonia/Kastoria) is drawn Ottoman. Jovan Dragaš taken as dead (medium).
- Berat and Vlorë: Balšić (Komnena's dowry) (medium); Muzaka (Fier) folded into albania (low); Gjirokastër (Zenevisi clans) given to arta (low).
- Vuk Branković holds Kosovo, Raška, Pčinja, Skopje and Polog, plus Berane/Rožaje (medium on Skopje/Prizren).
- Bosnia: Tvrtko holds Herceg Novi (Dračevica), Nikšić, Pljevlja, Bijelo Polje and the upper Drina; Kotor/Tivat Hungarian (medium).
- Heredia captive on the start day (medium): at_war arta–knights_of_rhodes ends 1379.
- Menteşe one ruler, Ahmed Gazi (low); Teke ruler Mehmed Bey (low); Erzincan ruler Pir Hüseyin, `since` null (low); Aq Qoyunlu leader Qutlugh, `since` null (low); Hamid's `since` 1352 and Saruhan's 1362 are rough (low).
- aq_qoyunlu made a small map nation (Bayburt, Tunceli, Bingöl pastures) since the checkpoint fixes allow it and its goal needs a holder (low). Not a sleeping realm.
- Two map nations not in east.md, to fill south-east Anatolia: `artuqids` (Artuqids of Mardin, al-Zahir Majd al-Din Isa from 1376; Mardin, Diyarbakır) (medium) and `hasankeyf` (catalogue record; Batman, Siirt; ruler unknown, null). Kurdish emirates (Bitlis, Hakkari) folded into qara_qoyunlu; Elazığ (Harput), Malatya, Urfa, Adıyaman drawn Mamluk (low).
- Erzurum given to erzincan; Ordu (Hacı Emir) and Samsun (Kubadoğlu, Genoese Simisso) drawn in the Eretnid sphere (low). Kars and Ardahan Georgian (low).
- Caucasus: Armenia's Ararat valley, Syunik and most of Azerbaijan Jalayirid; Lori, Tavush, Shirak and Qazax/Ağstafa/Zaqatala Georgian; Shirvan holds the left bank of the Kura plus Sheki (low on Sheki).
- Corfu drawn for naples (Angevin until 1386); Tocco `epirus` keeps the other Ionian islands; Corinth area to achaea.
- Byzantine enclaves by bbox: Selymbria/Herakleia, Philadelphia, the Burgas coast (Anchialos, Mesembria); they may hit no province centre.
- Ragusa, Lesbos, Knights of Rhodes get land only by bbox; Wallachia's land comes from part B.
- Obedience: Cyprus, Hospitallers (medium), Achaea (Joanna I, Avignon), Tocco (Angevin vassal, Avignon) avignon; Naxos (Venetian), Lesbos (Genoese), Ragusa, Bosnia, Albania (Thopia, low) rome; Athens null (Sicily vs Aragon, both undecided in 1378).

Left out: Venetian and Genoese colonies (west rules); Korykos (an entity subject of Cyprus, no map land); Lesser Armenia's claim (Levon V captive; no record); thasos_imbros (Gattilusio Ainos, background); Kubadoğlu/Taceddinoğlu; sleeping `imereti` (no id exists). Cross-region pairs owned by others (venice–genoa, hungary–genoa) skipped.

## Poland, Lithuania, Hungary, the Baltic and the Rus lands (20 Sep 1378)

18 map nations: hungary, poland, lithuania, teutonic_order, livonian_order, riga, dorpat, osel_wiek, mazovia,
moldavia, smolensk, muscovy, tver, ryazan, suzdal_nizhny, novgorod, pskov, vyatka.
Owner rules also hand land to the ids other parts define: wallachia, dobruja (Romania), great_horde (Budjak in Moldova),
bohemia (Duchy of Oświęcim, a bbox in Lesser Poland).

### Calls made where east.md was unsure
- **Regent of Poland**: the regent in 1378 was Louis's *mother*, Elizabeth
  of Poland (Łokietek's daughter, d. Dec 1380), not his wife Elizabeth of Bosnia. Ruler title says "the queen mother
  Elizabeth governs" (medium; Władysław of Opole is the alternative).
- **Catherine of Hungary** left out (proposal in east.md); Mary is heir of both crowns (age 7).
- **Galicia-Ruthenia** is Hungary's land: UKR L'viv, Ivano-Frankivs'k, Ternopil' and POL Subcarpathian (Przemyśl,
  Sanok) (medium). Poland's claim is a `dynastic_claim` fact on the entity `galicia_ruthenia`.
- **Hungary–Venice** is `hostile`, not `at_war`: decisions.md does not list it as a day-one war and Louis's formal
  entry (1378 or 1379) is unsure. Hungary–Genoa alliance included.
- **Teutonic and Livonian Orders vs Lithuania** are `at_war` (east.md: war active, confirmed; the yearly Reisen).
  decisions.md's list of day-one wars does not name them. Downgrade to `hostile` if that list is meant to be complete.
- **Muscovy** is not a Horde subject: it withholds tribute and is at war with Mamai (law vs fact noted in the
  explanation). Tver, Ryazan, Nizhny-Suzdal and Theodoro are Horde tributaries.
- **Lithuania**: Jogaila as ruler, Kęstutis named in the title as co-ruler; the diarchy stays internal. Jogaila's age
  is left out (birth c.1352-62). Faith `baltic_traditional`.
- **Riga**: the archbishop holds the city and the right bank (Treiden, Kokenhusen, Ronneburg, Lubahn), and
  `riga_city` is his vassal (low; the 1366 settlement is disputed). The Order keeps Wenden and Wolmar by a bbox.
- **Dorpat, Ösel-Wiek** are small map nations (separate lords with land, no confederation yet). Ösel-Wiek's bishop
  was not checked, so its ruler is null; Dorpat's bishop given as Heinrich von Velde (low; Johann Damerow follows
  c.1378-79). Ermland and the Courland bishopric stay landless subjects of the Orders.
- **Mazovia**: capital Czersk; land is the Masovian admin1 north of 51.85°N (Radom stays Polish). Shares for Janusz
  and Siemowit IV before 1381 not modelled.
- **Moldavia**: Suceava, Botoșani, Neamț, Iași, Bacău, Vaslui, Vrancea, Chernivtsi and north Moldova above 47.5°N
  (Bacău, Vaslui and Vrancea low). Galați and central Moldova are unowned. Southern Moldova (Budjak) is given to
  great_horde (low). Petru I's accession taken as 1375.
- **Hungary** holds the Banate of Severin (Mehedinți). Wallachia has the rest of Oltenia and Muntenia, Dobruja
  Constanța and Tulcea.
- **Teutonic Order** holds Klaipėda (Memel) county (medium) and, by bbox, the Chełmno land in Kuyavian-Pomeranian.
- **Rus borders** (low): Tula and Lipetsk go to Ryazan, Kaluga to Moscow, Orel and Kursk to Lithuania, Toropets
  (Tver' bbox) and Nevel and Sebezh (Pskov bbox) to Lithuania, Suzdal (Vladimir bbox) and Ivanovo (Shuya) to
  Nizhny-Suzdal.
- **Vyatka** made a small map nation (Kirov bbox round Khlynov), ruler null (veche of colonists; low confidence on
  structure).
- Yaroslavl, Rostov, Serpukhov, Pronsk, Volhynia, Kyiv, Podolia and Bryansk are landless subjects, as in 1444.
- **Obedience**: every Catholic realm here is "rome" (relations.json `obedience`). Lithuania is pagan and left out.

### Left out
- **Gazaria and Theodoro** are not map nations. On the 1444 map the Crimea is one province, and Mamai's capital
  Solkhat (checkpoint) is about 25 km from Caffa. A Caffa capital would take Mamai's province away. They stay as a
  Genoese colony and a Horde tributary, with relations and goals. The checkpoint's key place `caffa` (holder genoa)
  needs a decision when the map is cut.
- Upper Oka principalities (split between Moscow and Lithuania), Moldavia–Wallachia rivalry (uncertain),
  Novgorod–Pskov rivalry (lapsing), Lithuania–Mamai alliance (only from 1379-80), Novgorod's black tribute.
- Sleeping realms: mazovia_plock, mazovia_warsaw (1381), galich_shemyaka, mozhaysk (1389), vereya_beloozero (1432).
  The Livonian and Prussian confederations and Giskra's Upper Hungary form by events (decisions.md). Kazan, Crimea
  and the other steppe formables are part C's.
- Armies are rough guesses (east.md gives no numbers); commander scores are judgement.

## Iran, Transoxiana, the steppe and Siberia (1378)


### How it joins the other parts
- **Jalayirids in AZE/ARM:** yes. In 1378 the Jalayirids hold Azerbaijan proper and its northern edge: Nakhchivan, Arran/Karabakh (Ganja and Barda'a). The Armenian meliks of Syunik and Karabakh sit under them. Shirvan, north of the Kura, is their tributary. Suggested AZE rule: shirvan north of about 40.3°N, jalayirids for the rest (Nakhchivan included). ARM: Syunik (the south) to jalayirids, low confidence.
- `qara_qoyunlu` gets IRQ Ninawa and Dihok in my rules: Bayram Khwaja round Mosul, low confidence.
- Theodoro/Gothia belongs to part B (east.md part 2). I wrote no rule for it, and none for Caffa, Soldaia or Tana, because west's bboxes come first. My RUS rule gives the rest of Crimea and Sevastopol to great_horde.
- North Caucasus (Dagestan, Chechnya, Ingush, North Ossetia, Kabardin-Balkar, Karachay-Cherkess) falls to my RUS catch-all, `null`. If part A wants alania_ossetia or kazikumukh land there, its rules must come before mine.
- My UKR and RUS catch-alls (great_horde for UKR, null for RUS) assume part B's rules come first. Without them, Lviv, Kiev and the other western admin1s would show as great_horde, and Moscow and Novgorod as null.
- In subjects and relations I used map-nation ids (`timurids`, `mamluks`), not the catalogue's `timurid_empire` and `mamluk`.

### Calls where east.md was unsure (confidence)
- Sighnaq on the start day: Tokhtamysh (`white_horde`), medium-low. Timur-Malik is not modelled. His claim could be added as an internal pretender.
- Sarai and Hajji Tarkhan: `arab_shah_horde` (decisions.md 2), low. He holds the left bank: Astrakhan', Samara, the left-bank parts of Volgograd and Saratov, and West Kazakhstan and Atyrau up to the Yaik. His capital is Sarai al-Jadid. Mamai keeps the right bank and the Pontic steppe.
- The Bulgar emirs hold Kazan, Bulgar and Jukotin as `volga_bulgaria`, a tributary of Moscow (high autonomy), medium. Udmurt and Bashkortostan are left null (groups whose khan is unknown).
- Penza and Mordovia (Tagai's Mokhshi): `great_horde`, low.
- East of the Yaik (Orenburg east, Aqtöbe, Qostanay, Chelyabinsk, Kurgan, Ishim): `white_horde`, low. This is the Shibanid sphere. Tyumen' and the rest of Siberia are null.
- Khuzistan: jalayirids, low. The later Jalayirid rump sits in Khuzistan.
- Ray, Qazvin, Hamadan, Qom and Markazi: jalayirids, low. Semnan and Damghan: astarabad, low.
- Razavi Khorasan: the west (Sabzevar, Turshiz) goes to sarbadars. Tus, Mashhad and Kalat go to kartids, which stand in for the Jauni Qurbani (no record, as east.md recommends). South Khorasan (Quhistan) also goes to kartids, low.
- Kartids also hold the Sarakhs/Tejen strip (TKM Ahal) and the upper Murghab (TKM Mary), low. The rest of Ahal, Mary, Balkan and Mangyshlak is null (Karakum Turkmen). Dehistan goes to astarabad.
- Southern Khwarazm (Khiva, Kath) is Timur's. Tashauz (Old Urgench) and the rest of Karakalpakstan go to sufids.
- Kabul, Ghazni and Bamyan: timurids, low. The Pashtun and Hazara belt and Kafiristan (Kandahar, Zabul, Uruzgan, Paktika, Paktya, Khost, Nangarhar, Kunar, Nuristan) is null. The groups are not map nations.
- Sayram (south of South Kazakhstan) goes to timurids. Otrar, Sauran, Yasi and Sighnaq go to white_horde.
- Makran is null (baluch). Hormozgan goes to muzaffarids. Hormuz has no land here: it is another region's record, and its island is smaller than a province.
- Armies are my own rough guesses; east.md gives no figures (low): Timur 40k, Mamai 30k, Jalayirids 20k, Muzaffarids 20k, White Horde 15k, Moghulistan 15k. Commander ratings for Mamai, Tokhtamysh, Arab Shah, Shah Shuja and Qamar ud-Din are guesses too. Timur's 5/5/4 comes from the brief.
- Rulers: the Badakhshan shah is unknown, so his entry is null. Names with low confidence: Izz al-Din (Lur-i Kuchik), Qutb al-Din Muhammad (Sistan), Pir Ahmad (Lur-i Buzurg, disputed with Hushang) and Hasan (Bulgar, co-emir with Muhammad Sultan). Timur's heir is given as Umar Shaykh (low).
- Mamai–Moscow: at_war from the Vozha (11 Aug 1378). Muscovy stays the Horde's tributary, withholding payment. Timur–Sufids is a rivalry (decisions.md 4).

### Left out
- `rustamdar` gets no land: Mazandaran is a single province. It remains in relations and goals as a catalogue record. The same goes for `biya_pas`: Gilan is a single province.
- `jauni_qurbani` and Mokhshi: no records (east.md recommends background).
- `safaviyya`: it is non-state. The "autonomous region within the jalayirids" link is not a game relation type.
- `hormuz`–muzaffarids tribute, `lur_buzurg` under the Muzaffarids, `white_horde`–`sufids`, `mongols`–`kyrgyz_yenisei` and `great_horde`–`volga_bulgaria`: uncertain or nominal only, so skipped. The Jalayirid–Muzaffarid marriage (low) is skipped too.
- The Lithuania–Mamai alliance (1379-80) is a goal, not a day-one edge.
- Sleeping realms: kazan, crimea, nogai, uzbek_khanate (born on the Tura, capital at Chimgi-Tura, p681) and mushasha. Left out: sayyid_ahmad_horde (east.md: a civil-war pretender, not a standing formable), timurid_fars and timurid_samarkand (Timurid appanages that wake inside timurids, not sleeping realms), and astrakhan and kazakh_khanate (excluded from the catalogue).
- New tongues: mesopotamian_arabic, luri, gilaki, mazandarani and pamiri.
