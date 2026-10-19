"""Builds the Africa and Americas fragment of the 1378 start (X-25, milestone 10 step 5).

Writes packages/rules/data/scenarios/1378/regions/africa-americas/: the same
files as the 1444 scenario folder, holding only the realms, borders and
relations of the seven catalogue regions af_north_sahara, af_west,
af_northeast_east, af_central_south, am_mesoamerica_caribbean, am_north and
am_south. The merge step joins the region fragments into the 1378 scenario.

The 1444 files are the starting point. Everything this script changes for
20 September 1378 is in the tables below, each with its reason; the reasons
come from /mnt/project-files/start-date/research/africa-americas.md and the
calls in research/decisions.md. Coordinates are [lon, lat]. Where the map is
too coarse for a historical seat (two seats in one province), the map point
is moved into the neighbouring province and the note says so.

Run: python3 tools/domain-data/start-1378-africa-americas.py [/mnt/project-files]
"""
import copy, json, os, sys

files = sys.argv[1] if len(sys.argv) > 1 else "/mnt/project-files"
here = "packages/rules/data"
src = f"{here}/scenarios/1444"
out = f"{here}/scenarios/1378/regions/africa-americas"
REGIONS = {"af_north_sahara", "af_west", "af_northeast_east", "af_central_south", "am_mesoamerica_caribbean", "am_north", "am_south"}
DATE = "1378-09-20"

load = lambda p: json.load(open(p, encoding="utf-8"))
catalogue = load(f"{files}/country-catalogue/build/catalogue.json")["records"]
region = {i: r["meta"]["region"] for i, r in catalogue.items()}
naval_ports = load(f"{files}/naval/data/ports-1444.json")["ports"]

# Map nations whose id is not their 1378 catalogue record (the merge step's map_to_catalogue).
MAP_TO_CATALOGUE = {
    "tunis": "hafsid", "mossi": "mossi_ouagadougou", "kanem_bornu": "bornu", "aztecs": "tenochtitlan",
    "zapotec": "zaachila", "maya": "maya", "chimu": "chimor", "muisca": "muisca_bacata",
    "iroquois": "haudenosaunee", "huron": "wendat", "pueblo": "pueblo_rio_grande",
    "tepanecs": "tepanecs", "ifat": "ifat", "marinid_marrakesh": "marinid_marrakesh",
}
cat_id = lambda n: MAP_TO_CATALOGUE.get(n, n)
# 1444 map nations of these regions that belong to another region's fragment.
OTHER_REGIONS = {"granada", "hejaz", "yemen"}


def mine(nation):
    lon, lat = nation["capital"]
    if nation["id"] in OTHER_REGIONS:
        return False
    return lon < -30 or (lat < 37.5 and -20 < lon < 52 and not (lon > 24.5 and lat > 21.5))


nations_1444 = [n for n in load(f"{src}/map-nations.json") if mine(n)]
by_id = {n["id"]: n for n in nations_1444}

# ── Map nations ──────────────────────────────────────────────────────────────

# Not yet born on 20 Sep 1378: they leave the map and sleep until they form (X-25, SETUP-080).
# id: (year it forms, why, the 1444 record's capital or a new one for the blueprint)
SLEEPING = {
    "adal": (1415, "The Walashma heirs refound Ifat's state in the east after Sa'ad ad-Din II falls at Zeila.", None),
    "kongo": (1390, "Lukeni lua Nimi takes the Mbanza Kongo area with Mbata's alliance (traditional date).", None),
    "mutapa": (1430, "Mutota moves north from Great Zimbabwe and conquers the Dande (traditional).", [31.0, -16.5]),
    "torwa": (1420, "Khami rises in the south-west as Great Zimbabwe fades (c.1400-1450, disputed).", None),
    "ajuran": (1420, "An inland Shabelle power; it holds Mogadishu's hinterland only in the 15th century (low confidence).", None),
    "kaffa": (1390, "The Minjo dynasty founds Kaffa among the Gonga chiefdoms (traditional).", None),
    "air_agadez": (1405, "The Aïr confederations found a sultanate; its seat moves to Agadez c.1430.", None),
    "timbuktu_tuareg": (1433, "Akil's Tuareg take Timbuktu from a weakened Mali.", None),
    "massina_fulbe": (1400, "Fulbe ardos settle Masina in the inland delta.", None),
    "canarian_lordship": (1402, "Béthencourt and Gadifer conquer Lanzarote and Fuerteventura for Castile (1402-05).", None),
    "bougie": (1435, "A Hafsid prince holds Bougie against Tunis after Abu Faris dies (could be an event instead).", None),
    "debdou": (1430, "The Banu Urtajjen make Debdou a lordship of their own (could be an event instead).", None),
    "hintata_marrakesh": (1420, "The Hintata take Marrakesh as Marinid rule in the south collapses (no firm date).", None),
    "loango": (1420, "The Maloango unite the Vili polities of the coast (late 14th-15th c., disputed).", None),
    "buganda": (1450, "Great Lakes kingdom of tradition; dating is oral, the research leans to later than 1378.", None),
    "ankole": (1500, "Hinda dynasty, usually placed after the Chwezi.", None),
    "karagwe": (1500, "Hinda dynasty, usually placed after the Chwezi.", None),
    "rwanda": (1450, "Nyiginya dating is disputed (15th-17th c.).", None),
    "mandara": (1450, "Probably not yet a kingdom; Fra Mauro names it c.1450.", None),
    "coosa": (1400, "The Coosa paramountcy at Little Egypt forms after Etowah's fall (c.1400-1500, disputed).", None),
    "cherokee": (1600, "The Cherokee coalesce as a nation long after 1444; Mississippian chiefdoms hold the land (decision 6).", None),
    "creek": (1600, "The Creek Confederacy coalesces long after 1444; Mississippian chiefdoms hold the land (decision 6).", None),
}
SLEEPING_NAMES = {"adal": "Adal Sultanate", "kongo": "Kingdom of Kongo", "mutapa": "Mutapa", "torwa": "Torwa", "ajuran": "Ajuran", "kaffa": "Kaffa",
                  "air_agadez": "Aïr Sultanate", "timbuktu_tuareg": "Tuareg of the Niger bend", "massina_fulbe": "Fulbe of Masina",
                  "canarian_lordship": "Lordship of the Canary Islands", "bougie": "Bougie", "debdou": "Debdou", "hintata_marrakesh": "Hintata of Marrakesh",
                  "loango": "Loango", "buganda": "Buganda", "ankole": "Ankole", "karagwe": "Karagwe", "rwanda": "Rwanda", "mandara": "Mandara",
                  "coosa": "Coosa", "cherokee": "Cherokee", "creek": "Creek"}
# Where each sleeping realm wakes, as owner rules (the merge step resolves them to provinces).
SLEEPING_HOME = {
    "adal": [{"countries": ["DJI", "SOL", "ETH"], "bbox": [41, 8, 46, 12.5]}],
    "kongo": [{"countries": ["AGO", "COD", "COG"], "bbox": [12, -8.5, 16, -4]}],
    "mutapa": [{"countries": ["ZWE"], "bbox": [29, -18.5, 33, -15.5]}],
    "torwa": [{"countries": ["ZWE"], "bbox": [26, -22.5, 29.8, -18]}],
    "ajuran": [{"countries": ["SOM"], "bbox": [41, -1.7, 44.5, 6]}],
    "kaffa": [{"countries": ["ETH"], "bbox": [35.5, 5.7, 36.5, 6.7]}],
    "air_agadez": [{"countries": ["NER"], "bbox": [5.5, 16.5, 9.5, 21]}],
    "timbuktu_tuareg": [{"countries": ["MLI"], "bbox": [-2.5, 16.7, -1.5, 17.7]}],
    "massina_fulbe": [{"countries": ["MLI"], "bbox": [-5.5, 13.8, -3, 15.2]}],
    "canarian_lordship": [{"countries": ["ESP"], "bbox": [-14.5, 27.9, -13.2, 29.5]}],
    "bougie": [{"countries": ["DZA"], "bbox": [4.5, 36, 6.5, 37]}],
    "debdou": [{"countries": ["MAR"], "bbox": [-3.5, 33.5, -2, 34.6]}],
    "hintata_marrakesh": [{"countries": ["MAR"], "bbox": [-8.5, 31, -7, 32.3]}],
    "loango": [{"countries": ["COG"], "bbox": [11, -4.6, 13, -2.5]}],
    "buganda": [{"countries": ["UGA"], "bbox": [31.5, -0.5, 33.5, 1.5]}],
    "ankole": [{"countries": ["UGA"], "bbox": [30, -1.2, 31.5, 0]}],
    "karagwe": [{"countries": ["TZA"], "bbox": [30.5, -2.8, 32, -1]}],
    "rwanda": [{"countries": ["RWA", "COD"], "bbox": [28, -3.5, 31, -1]}],
    "mandara": [{"countries": ["CMR", "NGA"], "bbox": [13.4, 10.4, 14.4, 11.4]}],
    "coosa": [{"countries": ["USA"], "admin1": ["Georgia"], "bbox": [-85.6, 33.5, -83.5, 35]}],
    "cherokee": [{"countries": ["USA"], "admin1": ["Tennessee", "North Carolina"], "bbox": [-86, 34.5, -82, 36.7]}],
    "creek": [{"countries": ["USA"], "admin1": ["Alabama", "Georgia"]}],
}
SLEEPING_COLORS = ["#a05a2c", "#6b8e23", "#8b4513", "#b8860b", "#2e8b57", "#9a6b3c", "#c2b280", "#5f7f9f", "#7c5c8c", "#a0522d", "#4f7942",
                   "#8f6f3f", "#6a5acd", "#b07c4f", "#3f6f6f", "#9c7a3c", "#7f8f5f", "#a76f5f", "#5c7c4c", "#8a7a5a", "#c47a3a", "#6f8faf"]

# Changes to map nations that stay: new names, capitals, armies and commanders on the start day.
# Armies are provisional, like the 1444 ones (REALM-196).
CHANGED = {
    "morocco": {"name": "Morocco", "army": 3000, "note": "Marinid sultan Abu al-Abbas Ahmad at Fez, raised with Granadan backing; holds Ceuta, Tangier and Sijilmasa. The south is the rival sultan's."},
    "tunis": {"note": "Abu al-Abbas Ahmad II, still reuniting the Hafsid lands; the Jarid towns are folded in as unruly subjects. No Tripoli and no hold on Tlemcen."},
    "tripoli_regency": {"name": "Tripoli (local lords)", "land": [{"countries": ["LBY"], "bbox": [11, 31, 16, 33.5]}],
                        "note": "Tripoli held by a local lineage (usually given as the Banu Ammar, to be checked) under nominal Hafsid suzerainty until Abu Faris retakes it c.1401."},
    "mali": {"capital": [-8.4, 11.37], "army": 12000, "capitalFrom": "Niani (the 1378 checkpoint's site; the capital's site is disputed)",
             "commanders": [{"name": "Mari Djata", "might": 3, "cunning": 2, "logistics": 2}],
             "note": "Mansa Musa II, with power in the hands of the vizier Mari Djata; far larger than in 1444, holding Timbuktu, Walata, Gao and the Sahel."},
    "songhai": {"capital": [1.45, 14.2], "capitalFrom": "Kukiya (map point in the Tillabéri country downstream; the site itself lies in the province of Gao, which Mali holds)",
                "note": "The Sunni of Kukiya, a restive tributary of Mali; Gao has a Malian governor."},
    "kanem_bornu": {"name": "Kanem", "capital": [15.3, 14.25], "capitalFrom": "Njimi in Kanem (the 1378 checkpoint)",
                    "note": "The Sayfawa still rule from Njimi, but the Bulala are killing mai after mai; the move west of Lake Chad comes in the 1380s."},
    "mossi": {"note": "Mossi raiding states probably exist (the Tarikh has Mossi sacking Timbuktu in the 1330s); low confidence."},
    "ethiopia": {"note": "Newaya Maryam, with a moving royal camp in Shewa; at war with Ifat, whose revolt pulls at the Muslim tributaries."},
    "darfur_tunjur": {"name": "Darfur (Daju)", "note": "Darfur under the Daju kings of tradition; the Tunjur take over in the 15th century."},
    "kilwa": {"note": "Mahdali sultanate past its early 14th-century peak; holds Sofala and the gold trade."},
    "kakongo": {"name": "Vungu and Kakongo", "note": "The Vungu-linked chiefdoms north of the Congo, remembered as the founders' home of Kongo; low confidence."},
    "kitara": {"note": "Bigo and Ntusi earthworks flourish; the only Great Lakes kingdom on the 1378 map."},
    "aztecs": {"name": "Mexica", "army": 2000, "commanders": [{"name": "Acamapichtli", "might": 2, "cunning": 2, "logistics": 1}],
               "note": "Acamapichtli's Tenochtitlan, a small island city paying tribute to Azcapotzalco; its men fight the Tepanec wars."},
    "purepecha": {"name": "Pátzcuaro", "capital": [-101.61, 19.51], "capitalFrom": "Pátzcuaro (research E: Tzintzuntzan is too early)",
                  "note": "Tariácuri's Uacúsecha lordship at Pátzcuaro, still fighting the lords of Curínguaro and the lake islands; low confidence."},
    "zapotec": {"capital": [-96.75, 16.95], "capitalFrom": "Zaachila", "note": "The leading Zapotec kingdom of the Valley of Oaxaca; ruler unknown."},
    "maya": {"name": "Mayapan", "capital": [-89.46, 20.63], "capitalFrom": "Mayapan (the League's seat)",
             "note": "The League of Mayapan under Cocom dominance; the member lords live in the city. It falls c.1441 (decision 2)."},
    "inca": {"name": "Cusco", "army": 4000, "commanders": [],
             "note": "The Kingdom of Cusco, one lordship of the basin among rivals (Ayarmaca, Pinahua, Mohina, Cuyo); the Chanka war is c.1438 (decision 1, Rowe)."},
    "chimu": {"note": "Chimor at Chan Chan, which has taken Lambayeque by the start (decision 7)."},
    "muisca": {"capital": [-74.07, 4.71], "capitalFrom": "Bacatá (decision 4)", "note": "The Muisca chiefdoms of the Bogotá savanna; the zipa paramountcy comes c.1450."},
    "iroquois": {"note": "The five nations before the League, which is founded later (decision 5)."},
    "huron": {"note": "Ancestral Wendat villages on the north shore of Lake Ontario; the confederacy comes c.1440."},
    "oodham": {"name": "Hohokam platform-mound towns", "note": "The Classic Hohokam order of the Civano phase still stands; it collapses c.1450."},
    "great_zimbabwe": {"grows": False, "capitalFrom": "Great Zimbabwe", "note": "The plateau state near its height (decision 3); the gold goes to the coast through Kilwa's Sofala."},
    "mogadishu": {"grows": False, "capitalFrom": "Mogadishu", "note": "City sultanate on the Benadir coast, sultan unknown (decision 3)."},
}

# New map nations (research B and decisions 3).
NEW = [
    {"id": "marinid_marrakesh", "name": "Marrakesh", "capital": [-7.99, 31.63], "army": 2000,
     "note": "The rival Marinid sultan Abd al-Rahman holds Marrakesh and the south (1374 to 1382/86)."},
    {"id": "ifat", "name": "Ifat", "capital": [40.45, 10.15], "army": 3000,
     "capitalFrom": "Ifat (map point east of the escarpment; the old seat at [39.85, 10.1] lies in the Amhara province, which stays Ethiopia's)",
     "note": "The Walashma sultanate of Ifat, in revolt against Ethiopia; its centre is moving east and Zeila is its port."},
    {"id": "tepanecs", "name": "Tepanecs", "capital": [-99.2, 19.56], "army": 6000,
     "capitalFrom": "Azcapotzalco (map point just north in the México country, so that Tenochtitlan keeps the federal district's province)",
     "note": "Tezozómoc's Azcapotzalco, hegemon of the Basin of Mexico; the Mexica are its tributaries."},
    {"id": "huexotzinco", "name": "Huexotzinco", "capital": [-98.41, 19.16],
     "note": "The leading altepetl of the Puebla valley, holding sway over Cholula and stronger than Tlaxcala."},
    {"id": "chanka", "name": "Chanka", "capital": [-73.38, -13.66],
     "note": "The Chanka confederation of Andahuaylas, sovereign and pressing the Quichua; Cusco's rival across the Apurímac (decision 3)."},
]

# ── Owner rules (first match wins; growing realms' own land is checked first) ─

OWNERS = [
    # Maghreb: two Marinid sultans, a sovereign Tlemcen, a smaller Hafsid realm.
    {"nation": "tunis", "countries": ["TUN"]},
    {"nation": "tunis", "countries": ["DZA"], "bbox": [3.5, 33, 9, 37.5]},
    {"nation": "tlemcen", "countries": ["DZA"], "bbox": [-2.2, 33, 3.5, 37]},  # with Algiers (Zayyanid in the 1370s, low confidence)
    {"nation": "marinid_marrakesh", "countries": ["MAR"], "bbox": [-10, 29, -5.6, 32.3]},
    {"nation": "morocco", "countries": ["MAR"], "bbox": [-10, 29, -1, 36]},
    # West Africa: Mali at its 14th-century extent, Songhai downstream of Gao.
    {"nation": "songhai", "countries": ["NER"], "bbox": [0, 13, 4, 15.6]},
    {"nation": "mali", "countries": ["MLI"], "bbox": [-12.5, 10, 4.5, 18.5]},
    {"nation": "mali", "countries": ["MRT"], "bbox": [-11, 15.5, -5, 18.5]},
    {"nation": "mali", "countries": ["GIN", "SEN", "GMB"], "bbox": [-12.5, 10, -5, 15.5]},
    {"nation": "jolof", "countries": ["SEN"], "bbox": [-17.5, 14.3, -14, 16.7]},
    {"nation": "mossi", "countries": ["BFA"], "bbox": [-3, 11, 1, 14]},
    {"nation": "kano", "countries": ["NGA"], "bbox": [7, 10.5, 10, 13.5]},
    {"nation": "kanem_bornu", "countries": ["NGA", "NER", "TCD", "CMR"], "bbox": [11, 10, 16, 15]},
    {"nation": "benin", "countries": ["NGA"], "bbox": [4.5, 5.5, 7, 7.5]},
    # The Horn: Ifat takes the 1444 Adal land and the escarpment east of Shewa.
    {"nation": "ifat", "countries": ["DJI", "SOL", "ETH"], "bbox": [41, 8, 46, 12.5]},
    {"nation": "ifat", "countries": ["ETH"], "bbox": [39.6, 9.4, 41, 11]},
    {"nation": "ethiopia", "countries": ["ETH", "ERI"], "bbox": [35, 6, 41, 16]},
    {"nation": "mogadishu", "countries": ["SOM"], "bbox": [44.6, 1.6, 46.2, 3.2]},
    {"nation": "kilwa", "countries": ["TZA", "KEN"], "bbox": [38.5, -10.5, 41, -4]},
    {"nation": "great_zimbabwe", "countries": ["ZWE"]},
    # Mesoamerica: the Tepanecs hold the Basin; the Mexica only their island city.
    {"nation": "aztecs", "countries": ["MEX"], "admin1": ["Distrito Federal"]},
    {"nation": "tepanecs", "countries": ["MEX"], "admin1": ["México"]},
    {"nation": "huexotzinco", "countries": ["MEX"], "admin1": ["Puebla", "Tlaxcala"]},
    {"nation": "purepecha", "countries": ["MEX"], "admin1": ["Michoacán"], "bbox": [-102, 19, -100, 20.5]},
    {"nation": "zapotec", "countries": ["MEX"], "admin1": ["Oaxaca"]},
    {"nation": "maya", "countries": ["MEX"], "admin1": ["Yucatán", "Campeche", "Quintana Roo"]},
    # Andes: a small Cusco, the Chanka west of the Apurímac, Chimor on the north coast.
    {"nation": "inca", "countries": ["PER"], "admin1": ["Cusco"], "bbox": [-72.5, -15, -70, -13.2]},
    {"nation": "chanka", "countries": ["PER"], "admin1": ["Apurímac", "Ayacucho"]},
    {"nation": "chimu", "countries": ["PER"], "admin1": ["La Libertad", "Lambayeque"]},
    {"nation": "muisca", "countries": ["COL"], "admin1": ["Cundinamarca"]},
    # North America: no Cherokee or Creek yet; the Mississippian chiefdoms grow into their land.
    {"nation": "iroquois", "countries": ["USA"], "admin1": ["New York"]},
    {"nation": "huron", "countries": ["CAN"], "admin1": ["Ontario"], "bbox": [-82, 42, -78, 46]},
    {"nation": "pueblo", "countries": ["USA"], "admin1": ["New Mexico"], "bbox": [-109, 33, -105, 37]},
]

nations = []
for n in nations_1444:
    if n["id"] in SLEEPING:
        continue
    m = copy.deepcopy(n)
    for k, v in CHANGED.get(n["id"], {}).items():
        if k == "grows" and v is False:
            m.pop("grows", None)
        elif k == "commanders" and not v:
            m.pop("commanders", None)
        else:
            m[k] = v
    if n["id"] == "aztecs":
        m.pop("color", None)  # the 1444 Triple Alliance colour goes to the Tepanecs
    nations.append(m)
NEW[2]["color"] = "#6abe30"
nations += NEW
ids = {n["id"] for n in nations}
for r in OWNERS:
    assert r["nation"] in ids, r
for k in CHANGED:
    assert k in ids, k

# ── Rulers on 20 Sep 1378 (REALM-233). null: the game names one. ──────────────

RULERS = {
    "morocco": {"title": "Sultan", "name": "Abu al-Abbas Ahmad", "since": 1374, "age": None},
    "marinid_marrakesh": {"title": "Sultan", "name": "Abd al-Rahman ibn Abi Ifellusen", "since": 1374, "age": None},
    "tlemcen": {"title": "Sultan", "name": "Abu Hammu Musa II", "since": 1359, "age": 55},
    "tunis": {"title": "Sultan", "name": "Abu al-Abbas Ahmad II", "since": 1370, "age": 49},
    "mali": {"title": "Mansa", "name": "Musa II", "since": 1374, "age": None},
    "kano": {"title": "Sarki", "name": "Yaji I", "since": 1349, "age": None},
    "ethiopia": {"title": "Emperor", "name": "Newaya Maryam", "since": 1372, "age": None},
    "ifat": {"title": "Sultan", "name": "Haqq ad-Din II", "since": None, "age": None},
    "tepanecs": {"title": "Tlatoani", "name": "Tezozómoc", "since": 1367, "age": None},
    "aztecs": {"title": "Tlatoani", "name": "Acamapichtli", "since": 1375, "age": None},
    "purepecha": {"title": "Lord", "name": "Tariácuri", "since": None, "age": None},
}
# Rulers of 1444 that do not reign in 1378 (all others in these regions are null in both years).
NOT_YET = {"katsina", "hadiya", "benin", "inca", "purepecha"}
rulers_1444 = load(f"{src}/rulers.json")["rulers"]
rulers = {}
for n in nations:
    i = n["id"]
    if i in RULERS:
        rulers[i] = RULERS[i]
    elif i in rulers_1444 and rulers_1444[i] is not None and i not in NOT_YET:
        raise SystemExit(f"{i}: the 1444 ruler {rulers_1444[i]['name']} needs a 1378 answer")
    else:
        rulers[i] = None

# ── Tongues and faiths (CULT-094) ────────────────────────────────────────────

culture_1444 = load(f"{src}/culture-start.json")
NEW_CULTURE = {
    "marinid_marrakesh": {"court": "zenata", "mix": [["masmuda", 0.55], ["maghrebi_arabic", 0.3], ["zenata", 0.15]], "local": {"masmuda": "Masmuda Berbers of the Atlas and the Haouz", "maghrebi_arabic": "Arabic-speaking townspeople of Marrakesh and Arab tribes of the plains", "zenata": "Zenata of the Marinid house"}},
    "ifat": {"court": "harla", "mix": [["harla", 0.4], ["afar", 0.3], ["somali", 0.3]], "local": {"harla": "Argobba and Harla of the Ifat escarpment and the Harar plateau", "afar": "Afar", "somali": "Somali of Zeila's hinterland"}},
    "tepanecs": {"court": "nahua", "mix": [["nahua", 0.75], ["otomi", 0.25]], "local": {"nahua": "Tepanec and other Nahua", "otomi": "Otomi and Mazahua"}},
    "huexotzinco": {"court": "nahua", "mix": [["nahua", 0.9], ["otomi", 0.1]], "local": {"nahua": "Nahua of the Puebla-Tlaxcala valley", "otomi": "Otomi"}},
    "chanka": {"court": "quechua", "mix": [["quechua", 1]], "local": {"quechua": "Chanka and the Quichua of Andahuaylas"}},
    "great_zimbabwe": {"court": "shona", "mix": [["shona", 1]], "local": {"shona": "Shona (Karanga)"}},
    "mogadishu": {"court": "somali", "mix": [["somali", 0.8], ["swahili", 0.2]], "local": {"somali": "Benadiri and Somali", "swahili": "Swahili-speaking traders"}},
}
CHANGED_CULTURE = {
    "aztecs": {"court": "nahua", "mix": [["nahua", 1]], "local": {"nahua": "Mexica"}},
    "inca": {"court": "quechua", "mix": [["quechua", 1]], "local": {"quechua": "Inca and the Cusco-basin Quechua"}},
    "kanem_bornu": {"court": "kanuri", "mix": [["kanuri", 0.8], ["tubu", 0.1], ["kotoko", 0.1]], "local": {"kanuri": "Kanembu and Kanuri", "tubu": "Tubu", "kotoko": "Sao-descended populations"}},
    "darfur_tunjur": {"court": "fur", "mix": [["fur", 0.75], ["zaghawa", 0.25]], "local": {"fur": "Fur and the Daju ruling house", "zaghawa": "Zaghawa"}},
}
realms_culture = {}
for n in nations:
    i = n["id"]
    c = CHANGED_CULTURE.get(i) or NEW_CULTURE.get(i) or culture_1444["realms"].get(i)
    if c is not None:
        realms_culture[i] = c
culture_rules = load(f"{here}/domain/culture.json")
known_tongues = {t["id"] for t in culture_rules["tongues"] + culture_rules.get("tongues_added", [])} | set(culture_1444["tongues"])
for i, c in realms_culture.items():
    for t in [c["court"], *(t for t, _ in c["mix"])]:
        assert t in known_tongues, (i, t)
used = {t for c in realms_culture.values() for t, _ in c["mix"]} | {c["court"] for c in realms_culture.values()}
tongues = {t: v for t, v in culture_1444["tongues"].items() if t in used}

# ── Relations on 20 Sep 1378 (research §C), by catalogue id ──────────────────

CONF = {"confirmed": "high", "probable": "medium", "uncertain": "low", "disputed": "low"}
R = []  # (type, source, target, start, certainty, explanation, extra)


def rel(t, a, b, start, cert, why, **extra):
    R.append((t, a, b, start, cert, why, extra))


def subj(a, overlord, kind, autonomy, start, cert, why):
    rel("subject", a, overlord, start, cert, why, subject_kind=kind, autonomy=autonomy)


# Maghreb
rel("rival", "hafsid", "tlemcen", "13th c.", "probable", "Old rivals for the central Maghreb; Hafsid suzerainty over Tlemcen comes only in the 1420s.")
subj("tripoli_regency", "hafsid", "tributary", "very_high", "c.1370", "uncertain", "Local lords hold Tripoli under nominal Hafsid suzerainty until Abu Faris retakes it c.1401.")
subj("hilali_sulaymi_arabs", "hafsid", "tributary", "very_high", "11th c.", "probable", "The Arab sections hold tax grants for service and back rival princes when Tunis is weak.")
rel("rival", "hafsid", "aragon", "13th c.", "probable", "Corsairs and the coast: Sicily and Aragon covet Djerba (Sicilian attack 1388).")
rel("alliance", "granada", "morocco", "1374", "probable", "Muhammad V raised Abu al-Abbas to the throne at Fez and holds the Marinid pretenders; Granada is the senior partner.")
rel("at_war", "morocco", "marinid_marrakesh", "1374", "probable", "Two Marinid sultans divide Morocco after 1374; Fez takes Marrakesh in 1382/83 or 1386.")
rel("rival", "morocco", "tlemcen", "13th c.", "confirmed", "The Marinids attack Tlemcen again in 1384 and 1389.")
rel("hostile", "beni_hassan_maqil", "morocco", "14th c.", "probable", "Ma'qil Arabs raid the Marinid south, and serve Fez or Tlemcen for pay when it suits them.")
rel("hostile", "beni_hassan_maqil", "sanhaja_zenaga", "14th c.", "probable", "The Banu Hassan push into the western Sahara.")
rel("hostile", "tuareg_kel_ajjer", "fezzan", None, "uncertain", "Tuareg raids on the Fezzan oases.")
subj("siwa", "mamluk", "tributary", "very_high", "13th c.", "probable", "Siwa under nominal Mamluk rule.")
# West Africa
subj("timbuktu", "mali", "vassal", "moderate", "1320s", "probable", "Timbuktu is governed by a Timbuktu-koi appointed by Mali; the Tuareg take it only c.1433.")
subj("walata", "mali", "vassal", "moderate", "13th c.", "probable", "A Malian farba governs Walata (Ibn Battuta, 1352).")
subj("songhai", "mali", "tributary", "high", "14th c.", "uncertain", "Gao has a Malian governor and the Sunni of Kukiya are restive tributaries; independence comes c.1400.")
rel("at_war", "mali", "air_tuareg", "1370s", "uncertain", "Mari Djata campaigns against Takedda in the 1370s (Ibn Khaldun); the state of the war in September 1378 is unknown.")
rel("hostile", "timbuktu_tuareg", "mali", "14th c.", "probable", "Niger-bend Tuareg raid the Malian Sahel; they are nomads, not yet a polity.")
rel("hostile", "mossi_ouagadougou", "mali", "1330s", "uncertain", "Mossi raids on the Niger bend and Masina, if the Mossi states exist.")
subj("kaabu", "mali", "vassal", "high", "13th c.", "probable", "Mali's western province under the Nyancho, more tightly tied to Mali than in 1444.")
subj("gambia_mandinka_kingdoms", "mali", "tributary", "high", "14th c.", "probable", "The Mandinka kingdoms of the Gambia pay Mali.")
subj("diara", "mali", "tributary", "high", None, "uncertain", "Diara in the Kingui pays Mali.")
subj("bambuk", "mali", "tributary", "very_high", None, "uncertain", "The Bambuk gold fields under nominal Malian rule.")
subj("djenne", "mali", "tributary", "very_high", None, "disputed", "Whether Mali ever ruled Djenné is disputed (the Tarikh says no).")
subj("mande_kafus", "mali", "tributary", "very_high", "13th c.", "probable", "The local kafus of the Mande heartland under Malian overlordship.")
for w in ("waalo", "kayor", "baol"):
    subj(w, "jolof", "vassal", "high", "14th c.", "probable", "A Wolof kingdom under the Buurba Jolof.")
subj("sine", "jolof", "tributary", "high", None, "disputed", "Jolof's claim to Serer tribute is disputed in Serer tradition.")
rel("rival", "jolof", "takrur_futa_toro", None, "uncertain", "Contested lands between Jolof's and Mali's spheres on the middle Senegal.")
subj("southern_rivers_peoples", "kaabu", "tributary", "very_high", None, "probable", "Kaabu takes tribute from the Southern Rivers.")
rel("at_war", "bornu", "bulala", "c.1376", "confirmed", "The Bulala kill mai after mai of the Sayfawa (c.1376-82) and take Kanem in the 1380s.")
subj("tubu_teda", "bornu", "tributary", "very_high", "13th c.", "uncertain", "Kanem's hold on Kawar and the Bilma salt route is fading.")
rel("rival", "kano", "katsina", None, "uncertain", "The two Hausa kingdoms compete for the same caravans.")
rel("hostile", "air_tuareg", "gobir", None, "uncertain", "Tuareg pressure pushes Gobir south (tradition).")
rel("rival", "benin", "igala", None, "uncertain", "Neighbouring kingdoms on the lower Niger, if Igala already exists.")
rel("rival", "nupe", "oyo", None, "uncertain", "Old neighbours on the middle Niger.")
# Northeast and East Africa
rel("at_war", "ethiopia", "ifat", "1370s", "probable", "Ifat's revolt under Haqq ad-Din II; the Solomonic kings have fought the Walashma since 1332.")
for t in ("hadiya", "dawaro", "bale", "damot"):
    subj(t, "ethiopia", "tributary", "high", "1320s" if t == "hadiya" else "14th c.", "confirmed" if t == "hadiya" else "probable",
         "A tributary of Ethiopia since Amda Seyon; Ifat's revolt pulls at it." if t != "damot" else "Damot pays gold tribute to Ethiopia.")
subj("sidama_omotic_kingdoms", "ethiopia", "tributary", "very_high", None, "uncertain", "Nominal tribute from the southern kingdoms.")
subj("medri_bahri", "ethiopia", "vassal", "very_high", "14th c.", "probable", "The chiefs of Hamasien and Serae owe allegiance; the Bahr Negash office comes c.1448.")
rel("rival", "ethiopia", "mamluk", "1350s", "uncertain", "Pressure over the Copts and the metropolitan sent from Alexandria; it flares under Dawit I.")
rel("alliance", "ifat", "afar_dankali", None, "uncertain", "Afar sultanates fight alongside Ifat.")
rel("alliance", "ifat", "warsangali", None, "uncertain", "Northern Somali clans fight alongside Ifat.")
subj("dahlak", "rasulid_yemen", "tributary", "very_high", None, "uncertain", "The island sultanate is tied to a still-strong Rasulid Yemen.")
rel("rival", "malindi", "mombasa", None, "uncertain", "Rivalry documented by 1498 and inferred earlier.")
rel("rival", "pate", "lamu", None, "uncertain", "Neighbouring towns of the Lamu archipelago.")
subj("sofala", "kilwa", "vassal", "high", "early 14th c.", "probable", "Kilwa's hold on Sofala and the plateau gold trade is at its height.")
subj("mafia", "kilwa", "vassal", "moderate", None, "uncertain", "Mafia in Kilwa's orbit.")
subj("mozambique_island", "kilwa", "tributary", "very_high", None, "uncertain", "Only inferred, from 1498 evidence.")
subj("manyika", "great_zimbabwe", "tributary", "very_high", None, "uncertain", "Plausible plateau hegemony; no direct evidence.")
subj("dotawo", "mamluk", "tributary", "high", "1365", "probable", "The Mamluks restored the Makurian king at Daw after the coup of 1365.")
rel("hostile", "juhayna_arabs", "dotawo", "1365", "probable", "The Banu Ja'd took Dongola in 1365 and press Makuria.")
rel("hostile", "juhayna_arabs", "alodia", "14th c.", "probable", "Arab migrations press the fading Christian kingdom.")
rel("at_war", "mamluk", "banu_kanz", "1360s", "probable", "Mamluk punitive campaigns against the Awlad al-Kanz near Aswan.")
rel("alliance", "kakongo", "ngoyo", None, "uncertain", "The ritual tie through Vungu.")
# Mesoamerica
subj("tenochtitlan", "tepanecs", "tributary", "high", "c.1325", "probable", "The Mexica pay Azcapotzalco tribute and fight its wars; it ends in 1428.")
subj("tlatelolco", "tepanecs", "vassal", "high", "c.1372", "probable", "Tlatelolco's tlatoani Cuacuauhpitzahuac is Tezozómoc's son.")
rel("rival", "tepanecs", "texcoco", "14th c.", "probable", "Azcapotzalco and Texcoco contest Basin leadership and the Chichimec title; war comes 1414-18.")
rel("at_war", "tenochtitlan", "chalco", "c.1376", "uncertain", "Chimalpahin dates a flower-war phase from 1376 and open war from 1384; the Mexica fight in the Tepanec interest.")
rel("rival", "tepanecs", "chalco", "1370s", "uncertain", "The Tepanecs back the Mexica campaigns against Chalco.")
rel("rival", "tepanecs", "xaltocan", "14th c.", "probable", "Cuauhtitlan's old enemy; the Tepanecs conquer Xaltocan c.1395.")
rel("hostile", "tenochtitlan", "southern_basin_altepetl", "1380s", "uncertain", "Acamapichtli's Mexica take Xochimilco, Cuitlahuac and Mixquic for the Tepanecs.")
rel("rival", "huexotzinco", "tlaxcala", "14th c.", "probable", "Huexotzinco is the stronger of the two.")
subj("cholula", "huexotzinco", "tributary", "very_high", "c.1359", "uncertain", "The chronicles say Huexotzinco took Cholula.")
rel("rival", "zaachila", "mixteca_alta", None, "probable", "Rivals for the Valley of Oaxaca, with marriage ties.")
rel("rival", "zaachila", "tututepec", None, "uncertain", "Rivals in Oaxaca.")
rel("alliance", "kiche", "kaqchikel", "14th c.", "probable", "The Kaqchikel are allies and junior partners of the K'iche', not yet vassals.")
rel("alliance", "kiche", "eastern_highland_maya", None, "uncertain", "Rabinal is a K'iche' ally in the Popol Vuh.")
rel("rival", "kiche", "tzutujil", None, "uncertain", "Rivals for the Atitlán basin and the Pacific cacao.")
rel("rival", "nicarao", "chorotega", None, "probable", "Holds only if the Nicarao are already there.")
rel("rival", "cuzcatlan", "lenca", None, "uncertain", "Neighbours on the Pipil frontier.")
# South and North America
rel("rival", "inca", "ayarmaca", "1300s", "uncertain", "Chronicle wars and truces sealed by marriage.")
rel("rival", "inca", "cusco_basin_lordships", "1300s", "uncertain", "Raiding and absorption, with some marriage ties (Huayllacan).")
rel("rival", "inca", "chanka", None, "uncertain", "Neighbours across the Apurímac; the war comes c.1438.")
rel("rival", "colla", "lupaca", None, "probable", "Wars for the Titicaca basin.")
rel("hostile", "chibcha_other", "muisca_bacata", None, "uncertain", "Panche raids on the Muisca frontier.")
rel("rival", "tupinamba", "tapuia_je", None, "uncertain", "Projected back from the 1500s.")
rel("rival", "carib_mainland", "arawak_guianas", None, "uncertain", "Projected back from the 1500s.")
rel("hostile", "chaco_peoples", "charcas_qaraqara", None, "uncertain", "Weaker than in 1444: the Chiriguano are not yet formed.")
rel("rival", "haudenosaunee", "wendat", None, "uncertain", "Palisaded towns on both sides.")
rel("rival", "haudenosaunee", "st_lawrence_iroquoians", None, "uncertain", "Iroquoian neighbours at war.")
rel("rival", "apalachee", "timucua", None, "probable", "Neighbouring chiefdoms of north Florida.")
rel("rival", "cofitachequi", "southeast_interior_other", "1300s", "probable", "The middle Savannah valley is emptying.")
rel("rival", "mandan_hidatsa", "pawnee_plains_villagers", "1300s", "probable", "Middle Missouri against Coalescent villagers (Crow Creek, c.1325).")
rel("hostile", "greenland_inuit", "norse_greenland", "1300s", "disputed", "The annals record a skraeling attack in 1379.")
rel("rival", "inuit_thule", "dene", None, "uncertain", "Projected back.")
rel("rival", "inuit_thule", "innu_cree", None, "uncertain", "Projected back.")

FACTS = [
    ("trade_agreement", "hafsid", "genoa", "13th c.", "confirmed", "Trade treaties renewed through the period."),
    ("trade_agreement", "hafsid", "venice", "13th c.", "confirmed", "Venetian trade at Tunis."),
    ("trade_agreement", "hafsid", "aragon", "13th c.", "probable", "Trade alongside corsair rivalry."),
    ("trade_agreement", "tuat", "tlemcen", "14th c.", "probable", "The gold route from the Niger to Tlemcen."),
    ("trade_agreement", "mali", "tlemcen", "14th c.", "probable", "The Maqqari merchant house of Tlemcen trades with Walata."),
    ("trade_agreement", "fezzan", "bornu", "13th c.", "probable", "The Fezzan route; Kanem's old overlordship is fading."),
    ("trade_agreement", "bornu", "mamluk", "13th c.", "probable", "Mai Uthman b. Idris writes to Barquq c.1391 about Arab raiders."),
    ("trade_agreement", "aragon", "gran_canaria", "1351", "probable", "Majorcan voyages and the Telde mission, to c.1393."),
    ("dynastic_claim", "castile", "eastern_canary_chiefdoms", "1344", "probable", "Luis de la Cerda's papal grant of the Canaries."),
    ("dynastic_claim", "portugal", "eastern_canary_chiefdoms", "1345", "probable", "Afonso IV's letter to the Pope claiming the islands."),
    ("dynastic_claim", "mali", "jolof", "1360s", "uncertain", "Mali's slipping overlordship of the Wolof."),
    ("dynastic_claim", "ethiopia", "ifat", "1320s", "confirmed", "Amda Seyon made the Walashma tributary; Ethiopia treats Ifat as a rebel tributary."),
    ("dynastic_claim", "ifat", "hadiya", None, "uncertain", "Ifat seeks to rally the Muslim tributaries."),
    ("dynastic_claim", "ifat", "dawaro", None, "uncertain", "Ifat seeks to rally the Muslim tributaries."),
    ("dynastic_claim", "hafsid", "jarid_oasis_lords", "1370", "probable", "Abu al-Abbas's campaigns of c.1379-81 bring the Jarid towns to heel."),
    ("trade_agreement", "ifat", "rasulid_yemen", None, "probable", "Through Zeila to Aden."),
    ("trade_agreement", "kilwa", "comoros", None, "probable", "The Kilwa network."),
    ("trade_agreement", "kilwa", "madagascar_north_trading_towns", None, "probable", "The Mahilaka era."),
    ("trade_agreement", "great_zimbabwe", "sofala", "13th c.", "probable", "Plateau gold to the coast, at its height."),
    ("trade_agreement", "tonga_zambezi", "kilwa", "14th c.", "uncertain", "Ingombe Ilede's trade."),
    ("trade_agreement", "manyika", "sofala", None, "probable", "Eastern Shona gold to Sofala."),
    ("trade_agreement", "makua_lomwe", "swahili_lesser_towns", None, "uncertain", "Repointed from the anachronistic Angoche."),
    ("trade_agreement", "djenne", "begho", "14th c.", "probable", "The Dyula gold route."),
    ("trade_agreement", "begho", "bono", "14th c.", "probable", "The Dyula gold route."),
    ("religious_authority", "benin", "ife", None, "probable", "Ife's ritual primacy over Yoruba and Benin kingship."),
    ("religious_authority", "oyo", "ife", None, "probable", "Ife's ritual primacy over Yoruba kingship."),
    ("religious_authority", "igbo_societies", "nri", None, "probable", "Nri's ritual authority among the Igbo."),
    ("royal_marriage", "kaabu", "sine", "14th c.", "uncertain", "The Guelowar tie."),
    ("royal_marriage", "tenochtitlan", "southern_basin_altepetl", "c.1375", "probable", "Acamapichtli's Culhua (Toltec) descent."),
    ("trade_agreement", "maya", "acalan", None, "probable", "Coastal canoe trade around the peninsula."),
    ("trade_agreement", "acalan", "potonchan", None, "probable", "Chontal trade."),
    ("trade_agreement", "maya", "potonchan", None, "uncertain", "Canul mercenaries came from Tabasco."),
    ("trade_agreement", "chimor", "manta_huancavilca", None, "probable", "Spondylus shell."),
    ("trade_agreement", "chincha", "manta_huancavilca", None, "uncertain", "Sea trade, with the same doubt as 1444."),
    ("trade_agreement", "pueblo_rio_grande", "plains_nomads", None, "probable", "Corn for bison products."),
    ("trade_agreement", "zuni", "hopi", None, "probable", "Pueblo exchange."),
    ("trade_agreement", "pueblo_rio_grande", "zuni", None, "probable", "Pueblo exchange."),
    ("trade_agreement", "mandan_hidatsa", "plains_nomads", None, "probable", "Missouri villages and the hunters."),
    ("trade_agreement", "caddo", "pawnee_plains_villagers", None, "uncertain", "Plains trade."),
    ("trade_agreement", "greenland_inuit", "norse_greenland", "1300s", "probable", "Active in 1378 (lapsing by 1444)."),
]

relations = []
for t, a, b, start, cert, why, extra in R:
    r = {"id": f"r_{a}__{b}__{t}", "type": t, "source": a, "target": b, "direction": "directed" if t == "subject" else "mutual"}
    r.update(extra)
    r.update({"start_date": start, "origin": "historical_start", "locked": False, "explanation": why, "confidence": CONF[cert], "source_ids": []})
    relations.append(r)
facts = [{"id": f"f_{a}__{b}__{t}", "fact": t, "source": a, "target": b, "direction": "directed" if t in ("dynastic_claim", "religious_authority") else "mutual",
          "start_date": start, "explanation": why, "confidence": CONF[cert], "source_ids": []} for t, a, b, start, cert, why in FACTS]
assert len({r["id"] for r in relations}) == len(relations)

# ── Subjects (the subjects context's view of the same relations) ─────────────

sub_1444 = load(f"{src}/subjects.json")
subjects = [[r["source"], r["target"], r["subject_kind"], r["autonomy"], r["start_date"]] for r in relations if r["type"] == "subject"]
stances = [[r["source"], r["target"], r["type"]] for r in relations if r["type"] in ("hostile", "rival")]
playable = sorted({p for p in sub_1444["playable_subjects"] if region.get(p) in REGIONS} - set(SLEEPING) - {"portuguese_ceuta"})
subj_rulers_1444 = load(f"{src}/subjects-rulers.json")["rulers"]
SUBJ_RULERS = {
    "tripoli_regency": {"ruler": "Lord of Tripoli", "house": "Banu Ammar (to be checked)"},
    "timbuktu": {"ruler": "Timbuktu-koi", "house": "Appointed by Mali"},
    "walata": {"ruler": "Farba of Walata", "house": "Appointed by Mali"},
    "songhai": {"ruler": "A Sunni of Kukiya", "house": "Sunni (Sonni) dynasty"},
    "tenochtitlan": {"ruler": "Tlatoani Acamapichtli", "house": "Mexica royal house (Culhua descent)"},
    "tlatelolco": {"ruler": "Tlatoani Cuacuauhpitzahuac", "house": "Tepanec royal house"},
    "medri_bahri": {"ruler": "Chiefs of Hamasien and Serae", "house": "Highland chiefs"},
    "kaabu": {"ruler": "Kaabu Mansaba", "house": "Nyancho"},
    "hadiya": {"ruler": "Garad of Hadiya", "house": "Hadiya garads"},
    "dotawo": {"ruler": "King of Makuria at Daw", "house": "Makurian royal house"},
}
subject_rulers = {}
for s in subjects:
    i = s[0]
    if i in SUBJ_RULERS:
        subject_rulers[i] = SUBJ_RULERS[i]
    elif i in subj_rulers_1444:
        subject_rulers[i] = subj_rulers_1444[i]

# ── Ports (NAVY-013): the 1444 towns of these regions with their 1378 holders ─

PORT_HOLDER = {
    "Ceuta": "morocco", "Zeila": "ifat", "Merca": "mogadishu", "Bougie": "hafsid", "Algiers": "tlemcen",
    "San Sebastián de La Gomera": "eastern_canary_chiefdoms", "Soyo (Mpinda)": "lower_congo_chiefdoms",
    "Loango Bay": "kakongo", "Chetumal": "maya", "Champotón": "maya",
}
port_names = {t["name"] for t in load(f"{src}/ports.json")["towns"] if region.get(t["holder"]) in REGIONS}
towns = []
for p in naval_ports:
    if p["name"] not in port_names:
        continue
    t = {k: p[k] for k in ("name", "lat", "lon", "holder", "tier", "shipyard", "source", "note")}
    t["holder"] = PORT_HOLDER.get(p["name"], p["holder"])
    t["province_1444"] = p["province"]
    towns.append(t)
assert len(towns) == len(port_names), port_names - {t["name"] for t in towns}

# ── Sleeping realms (SETUP-080, X-25) ─────────────────────────────────────────

sleeping = []
for k, (i, (year, why, capital)) in enumerate(SLEEPING.items()):
    n = by_id[i]
    sleeping.append({"id": i, "name": SLEEPING_NAMES[i], "color": n.get("color") or SLEEPING_COLORS[k], "capital_at": capital or n["capital"],
                     "home_rules": SLEEPING_HOME[i], "tree": [i], "forms_about": year, "why": why})

# ── Write ────────────────────────────────────────────────────────────────────

os.makedirs(out, exist_ok=True)


def write(name, data):
    with open(f"{out}/{name}", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
        f.write("\n")


BASIS = "From start-date/research/africa-americas.md and research/decisions.md; built by tools/domain-data/start-1378-africa-americas.py from the 1444 files."
write("map-nations.json", nations)
write("map-owners.json", OWNERS)
write("rulers.json", {"$comment": f"Each map realm's ruler on 20 September 1378 in Africa and the Americas. null: no ruler is known by name, and the game names one. {BASIS}", "rulers": rulers})
write("culture-start.json", {"$comment": f"Court tongues and the people's tongues of the map realms of Africa and the Americas on 20 September 1378 (CULT-094); shares are provisional. {BASIS}",
                             "_provisional": ["realms.*.mix"], "tongues": tongues, "realms": realms_culture})
write("relations.json", {"schema_version": "1.0", "reference_date": DATE,
                         "description": f"Relations between entities of Africa and the Americas on 20 September 1378, keyed by country-catalogue ids (new records use the research's proposed ids: ifat, marinid_marrakesh, tepanecs, maya, air_tuareg, eastern_canary_chiefdoms, jarid_oasis_lords, lower_congo_chiefdoms, xaltocan, southern_basin_altepetl, ayarmaca, cusco_basin_lordships). Confidence: high = confirmed, medium = probable, low = uncertain or disputed. {BASIS}",
                         "rules_file": "../config/relation-rules.json", "relations": relations, "facts": facts})
write("subjects.json", {"$comment": f"Subject records on 20 September 1378 for Africa and the Americas as the subjects context reads them: [subject, overlord, kind, autonomy, start]; stances: hostile and rival relations. {BASIS}",
                        "subjects": subjects, "stances": stances, "religious_heads": [], "playable_subjects": playable})
write("subjects-rulers.json", {"$comment": f"Rulers of the subjects above on 20 September 1378. {BASIS}", "rulers": dict(sorted(subject_rulers.items()))})
write("ports.json", {"source": f"The 1444 towns of naval/data/ports-1444.json in these regions with their holders on 20 September 1378. province_1444 is a hint only: the merge step places each town by lat and lon on the 1378 map. {BASIS}",
                     "towns": towns, "not_placed": []})
write("sleeping-realms.json", {"_doc": f"Realms of Africa and the Americas born between 1379 and 1444, or later, that the 1444 map shows: listed from the start and asleep until they form (SETUP-080, X-25). capital_at and home_rules are resolved to provinces by the merge step. {BASIS}",
                               "realms": sleeping})
write("map-to-catalogue.json", {"$comment": "Map nations of this fragment whose id is not their 1378 catalogue record.", "map_to_catalogue": MAP_TO_CATALOGUE})
print(f"{len(nations)} map nations, {len(OWNERS)} owner rules, {len(relations)} relations, {len(facts)} facts, {len(subjects)} subjects, {len(towns)} ports, {len(sleeping)} sleeping realms")
