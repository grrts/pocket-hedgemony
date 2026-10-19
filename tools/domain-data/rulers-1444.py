"""Builds packages/rules/data/domain/rulers-1444.json: each map realm's ruler in November 1444.

Names and the year each reign began come from the country catalogue's
historical.identity.leadership_1444 (leader, reign); a ruler's age comes from
the catalogue's notes where they give it ("aged 14", "about 29", "born in
1432"), else from BORN below (birth years of well-known rulers). The heir is
named where the notes name one with a birth year. A realm whose record names
no single ruler (a council, a diet, an unknown name) gets null: the game
names a ruler from its own name lists.

Run: python3 tools/domain-data/rulers-1444.py /mnt/project-files/country-catalogue
"""
import glob, json, re, sys

root = sys.argv[1] if len(sys.argv) > 1 else "/mnt/project-files/country-catalogue"
here = "packages/rules/data"
cfg = json.load(open(f"{here}/domain/scenario-setup.json"))["map_to_catalogue"]
nations = json.load(open(f"{here}/world/nations.json"))
cat = {}
for f in glob.glob(f"{root}/countries/*/*.json"):
    d = json.load(open(f))
    cat[d["id"]] = d

TITLES = ["Emperor", "Empress", "King", "Queen", "Sultan", "Khan", "khan", "Duke", "Duchess", "duke", "duchess", "Doge", "Pope", "Despot", "Voivode", "voivode", "Grand Master", "Master", "master",
          "Prince", "prince", "grand prince", "Count", "Margrave", "Elector", "elector", "landgrave", "archbishop", "Rana", "Oba", "Mansa", "Mai", "Sarki", "Shah", "Bey", "Sapa Inka", "taishi", "Swargadeo", "Imam", "Jam"]
NO_ONE = re.compile(r"^(No |Council|Contested|Disputed|Unknown|Uncertain|Veche|Diet|Rector|Garen|Archbishop Evfimy|A Sunni|Buurba|Mahdali|Mansa of Mali|Mai of Bornu)")
# Group records and unnamed rulers (a title alone, chiefs in the plural, "identity unknown").
NO_NAME = re.compile(r"\b(unknown|unnamed|uncertain)\b|^(Collective|Various|Many|Several|None|Clan|Village|Local|Family|House|Band|Hereditary|Town|Drum-group|Tribal|Ksar|Councils|Chwezi|Weroances|Paramount chief|Abba gadaa|Kings of|Governor|Guanartemes|Canton|Nine|Banu Jallab|Kaabu Mansaba)")

# Birth years of rulers the catalogue's notes don't date (general knowledge).
BORN = {
    "france": 1403, "england": 1421, "scotland": 1430, "burgundy": 1396, "brittany": 1414, "provence": 1409, "savoy": 1413,
    "navarre": 1398, "castile": 1405, "aragon": 1396, "naples": 1396, "portugal": 1432, "milan": 1392, "venice": 1373,
    "papal_states": 1383, "austria": 1415, "saxony": 1412, "brandenburg": 1413, "denmark": 1416, "sweden": 1416, "norway": 1416,
    "poland": 1424, "hungary": 1424, "lithuania": 1427, "serbia": 1377, "byzantium": 1392, "ottomans": 1432, "muscovy": 1415,
    "timurids": 1377, "ming": 1427, "korea": 1397, "ethiopia": 1399, "kashmir": 1395, "uzbek_khanate": 1412, "dai_viet": 1441,
    "cologne": 1385, "hesse": 1402, "mecklenburg": 1417, "trebizond": 1403,
}
# Heirs the catalogue's notes name: (name, birth year).
# Titles and names the catalogue's free text doesn't parse cleanly.
OVERRIDE = {
    "savoy": {"name": "Louis I"}, "austria": {"title": "Duke", "name": "Frederick V"}, "luneburg": {"title": "Duke", "name": "Otto IV"},
    "lorraine": {"age": 44}, "poland": {"title": "King", "name": "Władysław III"}, "hungary": {"title": "King", "name": "Władysław I"},
    "lithuania": {"title": "Grand Duke", "name": "Casimir IV"}, "trebizond": {"title": "Emperor", "name": "John IV"},
    "georgia": {"title": "King"}, "shirvan": {"title": "Shirvanshah"}, "mamluks": {"title": "Sultan", "name": "Jaqmaq"},
    "timurids": {"title": "Sultan", "name": "Shah Rukh"}, "ming": {"title": "Emperor", "name": "Zhengtong"},
    "dai_viet": {"title": "Emperor"}, "champa": {"title": "King"}, "lan_xang": {"title": "King", "name": "Chakkaphat"},
    "lan_na": {"title": "King"}, "ayutthaya": {"title": "King"}, "ava": {"title": "King"}, "majapahit": {"title": "Queen"},
    "vijayanagar": {"title": "King"}, "ethiopia": {"title": "Emperor"}, "adal": {"title": "Sultan"}, "nogai": {"title": "Bey", "name": "Waqqas"},
    "mutapa": {"title": "Mutapa", "name": "Nyatsimba Mutota"}, "purepecha": {"title": "Cazonci", "name": "Tangáxoan I"},
    "multan": {"title": "Shaikh", "name": "Yusuf Qureshi"}, "oirat": {"title": "Taishi", "name": "Esen"}, "hesse": {"name": "Louis I"},
    "provence": {"title": "Count"}, "karaman": {"name": "İbrahim II"}, "candar": {"name": "İsmail"}, "dulkadir": {"name": "Süleyman"},
    "uzbek_khanate": {"name": "Abu'l-Khayr"}, "muscovy": {"title": "Grand Prince", "name": "Vasily II"}, "tver": {"title": "Grand Prince"},
    "ryazan": {"title": "Grand Prince"}, "byzantium": {"name": "John VIII"}, "teutonic_order": {"title": "Grand Master"},
    "hadiya": {"title": "Garad", "name": "Mahiko"}, "katsina": {"title": "Sarki", "name": "Sanau"}, "timbuktu_tuareg": {"title": "Chief"},
    "canarian_lordship": {"title": "Lord", "name": "Guillén de las Casas"},
}
HEIRS = {"france": ["Louis", 1423], "burgundy": ["Charles", 1433], "castile": ["Enrique", 1425], "muscovy": ["Ivan", 1440], "ayutthaya": ["Ramesuan", 1431]}


def cid(m):
    if m in cfg:
        return cfg[m]
    return m if m in cat else None


def short(leader):
    """'Charles VII, King of France' → ('King', 'Charles VII')."""
    s = leader.strip()
    title = next((t for t in TITLES if re.search(rf"\b{re.escape(t)}\b", s)), None)
    s = re.sub(r"\s*\([^)]*\)", "", s)
    s = s.split(",")[0].split(";")[0].split(" with ")[0].split(" and ")[0]
    for t in sorted(TITLES, key=len, reverse=True):
        s = re.sub(rf"^{re.escape(t)}\s+", "", s)
    s = re.sub(r"^(Sultan|King|Duke|Doge|Pope|Emperor|Despot|Voivode|Rana|Oba|Grand Master|Swargadeo|Sarki)\s+", "", s)
    s = re.sub(r"\s+'[^']*'|\s+\"[^\"]*\"", "", s).strip()
    return (title.capitalize() if title and title.islower() else title), s


out = {}
for n in nations:
    i = cid(n["id"])
    lead = cat.get(i, {}).get("historical", {}).get("identity", {}).get("leadership_1444") if i else None
    if not lead or not lead.get("leader") or NO_ONE.match(lead["leader"]) or (NO_NAME.search(lead["leader"]) and n["id"] not in OVERRIDE):
        out[n["id"]] = None
        continue
    title, name = short(lead["leader"])
    reign = lead.get("reign") or ""
    m = re.search(r"(1[34]\d\d)", reign)
    since = int(m.group(1)) if m else None
    text = f"{lead['leader']} {lead.get('notes') or ''}"
    age = None
    if n["id"] in BORN:
        age = 1444 - BORN[n["id"]]
    else:
        a = re.search(r"\b(?:aged|about|was)\s+(?:about\s+)?(\d{1,2})\b", text)
        b = re.search(r"born in (1[34]\d\d)", text)
        if a:
            age = int(a.group(1))
        elif b:
            age = 1444 - int(b.group(1))
    if since is not None and since > 1444:
        since = 1444
    rec = {"title": title, "name": name, "since": since, "age": age}
    rec.update(OVERRIDE.get(n["id"], {}))
    if n["id"] in HEIRS:
        h, born = HEIRS[n["id"]]
        rec["heir"] = {"name": h, "age": 1444 - born}
    out[n["id"]] = rec

doc = {
    "$comment": "Each map realm's ruler in November 1444, from the country catalogue's leadership_1444 (name, reign) and its notes; ages of well-known rulers from their birth years. null: the record names no single ruler, and the game names one. Built by tools/domain-data/rulers-1444.py.",
    "rulers": out,
}
json.dump(doc, open(f"{here}/domain/rulers-1444.json", "w"), indent=1, ensure_ascii=False)
print(sum(1 for v in out.values() if v), "named of", len(out))
