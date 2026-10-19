#!/usr/bin/env python3
"""Writes packages/rules/data/domain/events-bridge-east.json: the bridge events of
1378 to 1444 for eastern Europe, the Ottomans and the Balkans, the steppe and Iran,
and the Mamluks and the Horn of Africa (plan-1378 §5; milestone 10, step 6).

History is a reference, not a script: every event is conditional, most are
`approximate` (likeliest near their history year when their conditions hold),
and none is forced by its date. Realm ids are the tree's (events-places
aliases: ottoman, mamluk, timurid_empire, golden_horde), otherwise the 1378 map
ids. Places are 1444 province ids, as events-places.json has them.

Sources: start-date/research/east.md (Imber, Fine, Nicol, Inalcik, Manz,
Spuler, Knoll, Martin, Crummey) and africa-americas.md for the Horn; general
scholarship for the Mamluks. Confidence is kept in each event's history block.

    python3 tools/domain-data/build_bridge_east.py
"""
import json
from pathlib import Path

OUT = Path(__file__).resolve().parents[2] / "packages/rules/data/domain/events-bridge-east.json"
AGE = "age_of_schism_and_conquerors"

events: dict = {}
loc: dict = {}


def role(historical, select="fixed", as_=("participant",)):
    sel = select if select == "fixed" else {"condition": select}
    return {"historical": list(historical), "select": sel, "as": list(as_)}


def opt(id, label, chooser, base, effects=None, historical=False, factors=None, allowed=None):
    o = {"id": id, "chooser": chooser}
    if historical:
        o["historical"] = True
    o["ai"] = {"base": base, **({"factors": factors} if factors else {})}
    if allowed:
        o["allowed"] = allowed
    o["effects"] = effects or {}
    return o, label


def ev(id, name, desc, *, regions, roles, earliest, latest, trigger, options, date, confidence="medium",
       disputes=None, mode="approximate", importance="regional", periods=(), effects=None, requires=None,
       invalidated_if=None, selection=None, follow_ups=None, optional=None, execution=None, repeat="one_time",
       exclusive_with=None):
    e = {
        "id": id, "name": name, "ages": [AGE], "periods": list(periods), "regions": list(regions),
        "importance": importance, "roles": roles,
        "availability": {"earliest": earliest, "latest": latest, "mode": mode, "repeat": repeat},
    }
    if requires:
        e["requires"] = requires
    if optional:
        e["optional"] = optional
    e["trigger"] = trigger
    if invalidated_if:
        e["invalidated_if"] = invalidated_if
    e["selection"] = selection or {"mode": "pool", "mean_years": 3}
    if execution:
        e["execution"] = execution
    if exclusive_with:
        e["exclusive_with"] = exclusive_with
    e["options"] = [o for o, _ in options]
    e["effects"] = effects or {}
    if follow_ups:
        e["follow_ups"] = [{"event": f, "delay": list(d), "boost": b} for f, d, b in follow_ups]
    hist = {"date": date, "confidence": confidence}
    if disputes:
        hist["disputes"] = disputes
    e["history"] = hist
    assert id not in events, id
    events[id] = e
    loc[f"event.{id}.name"] = name
    loc[f"event.{id}.desc"] = desc
    for o, label in options:
        loc[f"event.{id}.option.{o['id']}"] = label


# condition helpers
def exists(x): return {"exists": x}
def gone(x): return {"not": {"exists": x}}
def war(a, b): return {"at_war": {"who": a, "other": b}}
def borders(a, b): return {"borders": {"who": a, "other": b}}
def happened(x, within=None):
    p = {"id": x}
    if within is not None:
        p["within_years"] = within
    return {"event": p}
def owns(who, where, share=None):
    p = {"who": who, "where": where}
    if share is not None:
        p["min_share"] = share
    return {"owns": p}
def controls(who, where, share=None):
    p = {"who": who, "where": where}
    if share is not None:
        p["min_share"] = share
    return {"controls": p}
def stat(who, s, op, v): return {"stat": {"who": who, "stat": s, "op": op, "value": v}}
def rel(a, b, t): return {"relation": {"who": a, "other": b, "type": t}}
def flag(who, f): return {"flag": {"who": who, "id": f}}
def ALL(*c): return {"all": list(c)}
def ANY(*c): return {"any": list(c)}
def NOT(c): return {"not": c}

# effect helpers
def st(on, **ch): return {"on": on, "stat": ch}
def mod(on, m, years=None):
    e = {"on": on, "modifier": m}
    if years is not None:
        e["years"] = years
    return e
def setflag(on, f, years=0): return {"set_flag": {"on": on, "id": f, "years": years}}
def transfer(where, frm, to): return {"transfer": {"where": where, "from": frm, "to": to}}
def annex(who, target): return {"annex": {"who": who, "target": target}}
def vassalize(who, target, kind="vassal"): return {"vassalize": {"who": who, "target": target, "type": kind}}
def release(who, target): return {"release": {"who": who, "target": target}}
def relation(a, b, t, on=True): return {"relation": {"who": a, "other": b, "type": t, "set": on}}
def rebels(on, t, size): return {"rebels": {"on": on, "type": t, "size": size}}
def cb(who, against, t, years): return {"casus_belli": {"who": who, "against": against, "type": t, "years": years}}
def warfx(id, att, dfn, goal): return {"war": {"id": id, "attackers": att, "defenders": dfn, "goal": goal}}
def found(entity, where=None, frm=None, subject_of=None):
    p = {"entity": entity}
    if where:
        p["where"] = where
    if frm:
        p["from"] = frm
    if subject_of:
        p["subject_of"] = subject_of
    return {"create_country": p}
def period(start=None, end=None):
    return {"start_period": {"id": start}} if start else {"end_period": {"id": end}}
def fx(immediate=(), long_term=(), delayed=()):
    out = {}
    if immediate:
        out["immediate"] = list(immediate)
    if delayed:
        out["delayed"] = list(delayed)
    if long_term:
        out["long_term"] = list(long_term)
    return out


EU, ME, CA, SA, AF = "europe", "middle_east", "central_asia", "south_asia", "sub_saharan_africa"
OTT, BYZ, HUN, POL, LIT, MUS = "ottoman", "byzantium", "hungary", "poland", "lithuania", "muscovy"
HORDE, WHITE, TIMUR, MAM = "golden_horde", "white_horde", "timurid_empire", "mamluk"

# ---------------------------------------------------------------- North and East

ev("battle_of_kulikovo", "Battle of Kulikovo",
   "Dmitry of Moscow leads the Rus princes across the Don and breaks Mamai's army on Kulikovo Field. The Horde is not overthrown, but Moscow has shown it can beat the Tatars in the open field.",
   regions=[EU, CA], importance="major", periods=["p_muscovite_consolidation"],
   roles={"prince": role([MUS], {"borders": {"who": "this", "other": HORDE}}, ["initiator", "resister"]),
          "khan": role([HORDE], "fixed", ["cost_bearer"])},
   earliest=1378, latest=1400, date="1380-09-08", confidence="high",
   trigger=ALL(exists(HORDE), war("$prince", HORDE)),
   invalidated_if=gone(HORDE),
   options=[opt("stand_at_the_don", "Cross the Don and give battle", "$prince", 65, historical=True,
                effects=fx([st("$prince", prestige=20, legitimacy=5, army_strength="-25%"),
                            st(HORDE, prestige=-20, stability=-1, army_strength="-30%")])),
            opt("hold_the_oka", "Hold the Oka line and wait", "$prince", 35,
                effects=fx([st("$prince", war_weariness=-2), st(HORDE, prestige=-5)]))],
   effects=fx([setflag(HORDE, "horde_humbled", 20)]),
   follow_ups=[("tokhtamysh_unites_horde", (0, 3), 2.0), ("tokhtamysh_burns_moscow", (1, 5), 1.5)])

ev("tokhtamysh_burns_moscow", "Tokhtamysh burns Moscow",
   "Two years after Kulikovo, Tokhtamysh, now khan of the whole Horde, falls on Moscow while Dmitry is away raising troops. The city is taken by a ruse and burned, and Moscow pays the tribute again.",
   regions=[EU, CA], importance="major", periods=["p_muscovite_consolidation"],
   roles={"khan": role([HORDE], "fixed", ["initiator", "beneficiary"]),
          "prince": role([MUS], {"borders": {"who": "this", "other": HORDE}}, ["victim", "cost_bearer"])},
   earliest=1380, latest=1410, date="1382-08-26", confidence="high",
   requires=happened("tokhtamysh_unites_horde"),
   trigger=ALL(exists(HORDE), exists("$prince"), NOT(rel("$prince", HORDE, "subject")),
               stat(HORDE, "stability", ">=", 0)),
   invalidated_if=gone(HORDE),
   options=[opt("submit_and_pay", "Submit and pay the tribute", "$prince", 65, historical=True,
                effects=fx([vassalize(HORDE, "$prince", "tributary"), st("$prince", prestige=-10)])),
            opt("defy_the_khan", "Defy the khan", "$prince", 35,
                factors=[{"if": stat("$prince", "army_strength", ">=", 30), "factor": 2}],
                effects=fx([warfx("war_tokhtamysh_moscow", [HORDE], ["$prince"], "subjugation"),
                            st("$prince", stability=-1)]))],
   effects=fx([mod("area:moscow", "sacked_city"), {"on": "area:moscow", "stat": {"prosperity": -4, "population": "-15%"}},
               st(HORDE, prestige=10, treasury="+10%")]))

ev("death_of_louis_the_great", "Death of Louis the Great",
   "Louis of Hungary and Poland dies without a son. His daughters inherit, Mary in Hungary and, after two years of argument, Jadwiga in Poland. The union of the two crowns ends with him.",
   regions=[EU], importance="major",
   roles={"hungary": role([HUN], "fixed", ["affected"]), "poland": role([POL], "fixed", ["initiator", "beneficiary"])},
   earliest=1378, latest=1420, date="1382-09-10", confidence="high",
   trigger=ALL(exists(HUN), exists(POL), ANY(rel(HUN, POL, "personal_union"), rel(HUN, POL, "alliance")), flag(HUN, "ruler_died")),
   selection={"mode": "immediate"},
   options=[opt("separate_crowns", "Crown a daughter of our own", "$poland", 70, historical=True,
                effects=fx([relation(HUN, POL, "personal_union", False), setflag(POL, "female_succession", 5),
                            st(POL, legitimacy=-10, stability=-1)])),
            opt("keep_the_union", "Accept Mary and Sigismund", "$poland", 30,
                effects=fx([rebels(POL, "noble", "medium"), st(HUN, legitimacy=-5)]))],
   effects=fx([setflag(HUN, "succession_crisis", 5)]),
   follow_ups=[("jadwiga_crowned", (0, 3), 3.0)])

ev("jadwiga_crowned", "Jadwiga crowned King of Poland",
   "The Polish lords take Louis's younger daughter Jadwiga, ten years old, and crown her king in Kraków, so that Poland has its own monarch and a free hand to choose her husband.",
   regions=[EU],
   roles={"kingdom": role([POL], "fixed", ["initiator", "beneficiary"])},
   earliest=1380, latest=1420, date="1384-10-16", confidence="high",
   requires=happened("death_of_louis_the_great"),
   trigger=ALL(exists(POL), NOT(rel(HUN, POL, "personal_union"))),
   options=[opt("crown_jadwiga", "Crown Jadwiga in Kraków", "$kingdom", 75, historical=True,
                effects=fx([st("$kingdom", legitimacy=15, stability=1)])),
            opt("elect_a_piast", "Elect a Piast duke instead", "$kingdom", 25,
                effects=fx([st("$kingdom", legitimacy=5), rebels("$kingdom", "noble", "small")]))],
   follow_ups=[("union_of_krewo", (0, 3), 3.0)])

ev("union_of_krewo", "Union of Krewo",
   "Grand Duke Jogaila of Lithuania promises to be baptised with all his people, to marry Jadwiga and to join his lands to the Polish crown. Poland gains a vast eastern partner, and Lithuania an ally against the Teutonic Order.",
   regions=[EU], importance="major",
   roles={"grand_duke": role([LIT], "fixed", ["initiator", "beneficiary"]),
          "kingdom": role([POL], "fixed", ["participant", "beneficiary"])},
   earliest=1380, latest=1430, date="1385-08-14", confidence="high",
   optional=[{"event": "jadwiga_crowned", "weight": 2.0}],
   trigger=ALL(exists(LIT), exists(POL), borders(LIT, POL), NOT(rel(HUN, POL, "personal_union")),
               NOT(war(LIT, POL)), NOT({"religion": {"who": LIT, "is": "catholic"}})),
   invalidated_if=ANY(gone(LIT), gone(POL)),
   selection={"mode": "decision", "mean_years": 3},
   options=[opt("accept_the_crown", "Take the Polish crown and the Latin faith", "$grand_duke", 65, historical=True,
                effects=fx([relation(POL, LIT, "personal_union"), st(LIT, prestige=15)])),
            opt("marry_into_moscow", "Marry Dmitry's daughter and take the Orthodox rite", "$grand_duke", 25,
                factors=[{"if": exists(MUS), "factor": 1}],
                effects=fx([relation(LIT, MUS, "alliance"), {"religion": {"on": LIT, "set": "orthodox"}}, st(LIT, stability=-1)])),
            opt("stay_pagan", "Keep the old gods and fight on", "$grand_duke", 10,
                effects=fx([mod(LIT, "resistance_spirit", 20)]))],
   follow_ups=[("lithuania_baptised", (0, 3), 3.0), ("ostrow_agreement", (3, 10), 1.5)])

ev("lithuania_baptised", "Baptism of Lithuania",
   "Jogaila, now Władysław II, returns to Vilnius with Polish clergy. The sacred groves are cut, the eternal fire is put out, and the Lithuanians are baptised in crowds. Samogitia holds out until 1413.",
   regions=[EU],
   roles={"grand_duke": role([LIT], "fixed", ["initiator"]),
          "order": role(["teutonic_order"], {"borders": {"who": "this", "other": LIT}}, ["cost_bearer"])},
   earliest=1382, latest=1440, date=[1387, 1413], confidence="high",
   requires=happened("union_of_krewo"),
   trigger=ALL(exists(LIT), NOT({"religion": {"who": LIT, "is": "catholic"}}), rel(POL, LIT, "personal_union")),
   options=[opt("baptise_the_land", "Baptise the land, Samogitia in time", "$grand_duke", 75, historical=True,
                effects=fx([{"religion": {"on": LIT, "set": "catholic"}}, st(LIT, stability=-1, legitimacy=5)],
                           long_term=[{"spread": {"kind": "religion", "id": "catholic", "where": "area:samogitia", "amount": 0.3}}])),
            opt("court_only", "Convert the court and leave the villages be", "$grand_duke", 25,
                effects=fx([{"religion": {"on": LIT, "set": "catholic"}}, rebels(LIT, "religious", "small")]))],
   effects=fx([setflag("$order", "crusade_purpose_lost", 0), st("$order", legitimacy=-10)]))

ev("ostrow_agreement", "Agreement of Ostrów",
   "After a war between the cousins, Jogaila recognises Vytautas as Grand Duke of Lithuania for life under the Polish crown. Lithuania keeps its own ruler and turns its strength east and south.",
   regions=[EU],
   roles={"grand_duke": role([LIT], "fixed", ["initiator", "beneficiary"]), "kingdom": role([POL], "fixed", ["participant"])},
   earliest=1386, latest=1440, date="1392-08-04", confidence="high",
   requires=happened("union_of_krewo"),
   trigger=ALL(rel(POL, LIT, "personal_union"), ANY(stat(LIT, "legitimacy", "<", 60), flag(LIT, "succession_dispute"))),
   options=[opt("vytautas_rules", "Vytautas rules Lithuania for life", "$kingdom", 70, historical=True,
                effects=fx([st(LIT, stability=1, legitimacy=10), st(POL, prestige=-5)])),
            opt("rule_from_krakow", "Rule Lithuania from Kraków", "$kingdom", 30,
                effects=fx([rebels(LIT, "noble", "medium"), st(LIT, stability=-1)]))],
   follow_ups=[("battle_of_vorskla", (2, 10), 1.5), ("battle_of_grunwald", (10, 20), 1.5)])

ev("battle_of_vorskla", "Battle of the Vorskla",
   "Vytautas backs the fallen Tokhtamysh and leads a great army onto the steppe, meaning to rule the Horde through him. Edigu and Temür Qutlugh destroy it on the Vorskla, and Lithuania's push to the Black Sea stops.",
   regions=[EU, CA],
   roles={"grand_duke": role([LIT], {"borders": {"who": "this", "other": HORDE}}, ["initiator", "cost_bearer"]),
          "horde": role([HORDE], "fixed", ["resister", "beneficiary"])},
   earliest=1390, latest=1420, date="1399-08-12", confidence="high",
   requires=happened("battle_of_the_terek"),
   trigger=ALL(exists(HORDE), borders("$grand_duke", HORDE), stat(HORDE, "stability", "<=", 0)),
   invalidated_if=gone(HORDE),
   selection={"mode": "decision", "mean_years": 3},
   options=[opt("march_on_the_steppe", "Ride out for Tokhtamysh", "$grand_duke", 55, historical=True,
                effects=fx([warfx("war_vorskla", ["$grand_duke"], [HORDE], "subjugation"),
                            st("$grand_duke", army_strength="-40%", prestige=-15)])),
            opt("shelter_him_only", "Shelter Tokhtamysh but stay home", "$grand_duke", 45,
                effects=fx([st("$grand_duke", prestige=-5), relation("$grand_duke", HORDE, "rivalry")]))])

ev("battle_of_grunwald", "Battle of Grunwald",
   "Władysław II and Vytautas lead the armies of Poland and Lithuania against the Teutonic Order. Grand Master Ulrich von Jungingen and most of the Order's knights die on the field, though Marienburg holds.",
   regions=[EU], importance="major",
   roles={"king": role([POL], "fixed", ["initiator", "beneficiary"]),
          "grand_duke": role([LIT], "fixed", ["participant", "beneficiary"]),
          "order": role(["teutonic_order"], "fixed", ["cost_bearer"])},
   earliest=1395, latest=1450, date="1410-07-15", confidence="high",
   trigger=ALL(exists("teutonic_order"), rel(POL, LIT, "personal_union"),
               ANY(war(POL, "teutonic_order"), war(LIT, "teutonic_order"))),
   invalidated_if=gone("teutonic_order"),
   options=[opt("besiege_marienburg", "March on Marienburg", "$king", 60, historical=True,
                effects=fx([st("teutonic_order", army_strength="-50%", prestige=-25, stability=-2),
                            st("$king", prestige=25)])),
            opt("take_the_towns", "Take the Prussian towns one by one", "$king", 40,
                effects=fx([st("teutonic_order", army_strength="-40%", prestige=-20), st("$king", prestige=15),
                            cb("$king", "teutonic_order", "reconquest", 20)]))],
   follow_ups=[("peace_of_thorn", (0, 2), 4.0)])

ev("peace_of_thorn", "Peace of Thorn",
   "The Order keeps Prussia but gives Samogitia to Lithuania for the lives of Władysław and Vytautas and pays a heavy ransom. Its treasury never recovers, and the Prussian towns begin to resent its taxes.",
   regions=[EU],
   roles={"order": role(["teutonic_order"], "fixed", ["cost_bearer"]), "grand_duke": role([LIT], "fixed", ["beneficiary"])},
   earliest=1395, latest=1455, date="1411-02-01", confidence="high",
   requires=happened("battle_of_grunwald"),
   trigger=ALL(exists("teutonic_order"), ANY(war(POL, "teutonic_order"), war(LIT, "teutonic_order"))),
   selection={"mode": "immediate"},
   options=[opt("pay_and_cede", "Cede Samogitia and pay the ransom", "$order", 70, historical=True,
                effects=fx([transfer("area:samogitia", "teutonic_order", LIT), st("teutonic_order", treasury="-40%", debt=20),
                            relation(POL, "teutonic_order", "truce"), relation(LIT, "teutonic_order", "truce")])),
            opt("fight_on", "Refuse and hire more mercenaries", "$order", 30,
                effects=fx([st("teutonic_order", debt=40, stability=-1)]))],
   effects=fx([setflag("teutonic_order", "prussian_estates_aggrieved", 40)]),
   follow_ups=[("prussian_confederation", (20, 35), 2.0)])

ev("prussian_confederation", "Prussian Confederation",
   "The towns and knights of Prussia, led by Danzig, Thorn and Elbing, swear a league against the Order's taxes and arbitrary rule. Fourteen years later they rise and offer the land to the King of Poland.",
   regions=[EU],
   roles={"order": role(["teutonic_order"], "fixed", ["cost_bearer"]), "king": role([POL], {"borders": {"who": "this", "other": "teutonic_order"}}, ["beneficiary"])},
   earliest=1411, latest=1460, date="1440-03-14", confidence="high",
   trigger=ALL(exists("teutonic_order"), flag("teutonic_order", "prussian_estates_aggrieved"), stat("teutonic_order", "debt", ">", 10)),
   options=[opt("tolerate_the_league", "Tolerate the league", "$order", 60, historical=True,
                effects=fx([st("teutonic_order", legitimacy=-10)],
                           delayed=[{"after_years": 14, "rebels": {"on": "teutonic_order", "type": "separatist", "size": "large"}}])),
            opt("ban_the_league", "Ban the league and seize its leaders", "$order", 40,
                effects=fx([rebels("teutonic_order", "separatist", "medium"), relation("$king", "teutonic_order", "rivalry")]))])

ev("livonian_confederation", "Livonian Confederation",
   "The Livonian Order, the archbishop of Riga, the bishops of Dorpat and Ösel-Wiek and the towns meet in diets at Walk and bind themselves to keep the peace among themselves and to stand together against outsiders.",
   regions=[EU],
   roles={"order": role(["livonian_order"], "fixed", ["initiator", "beneficiary"]),
          "bishops": role(["riga", "dorpat", "osel_wiek"], {"borders": {"who": "this", "other": "livonian_order"}}, ["participant"])},
   earliest=1400, latest=1480, date=[1419, "1435-12-04"], confidence="medium",
   disputes="The diets begin in 1419; the 1435 Treaty of Walk is the usual founding date.",
   trigger=ALL(exists("livonian_order"), exists("$bishops"), NOT(war("livonian_order", "$bishops")),
               ANY(happened("battle_of_grunwald"), stat("livonian_order", "army_strength", "<", 15))),
   options=[opt("join_the_diet", "Join the diet at Walk", "$bishops", 70, historical=True,
                effects=fx([relation("livonian_order", "$bishops", "alliance"), relation("livonian_order", "$bishops", "non_aggression")])),
            opt("go_it_alone", "Keep our own counsel", "$bishops", 30,
                effects=fx([relation("livonian_order", "$bishops", "rivalry")]))])

ev("muscovite_war_of_succession", "Muscovite War of Succession",
   "Vasily II's right to the throne is challenged by his uncle Yuri of Zvenigorod and then by his cousins Vasily Kosoy and Dmitry Shemyaka. For a quarter of a century Moscow is taken and lost, and Vasily is blinded, before he wins.",
   regions=[EU], importance="major", periods=["p_muscovite_consolidation"],
   roles={"grand_prince": role([MUS], "fixed", ["cost_bearer", "resister"])},
   earliest=1395, latest=1460, date=[1425, 1453], confidence="high",
   trigger=ALL(exists(MUS), ANY(flag(MUS, "ruler_died"), flag(MUS, "regency"), flag(MUS, "succession_dispute"))),
   options=[opt("fight_for_the_throne", "Fight for the throne, by seniority of the son", "$grand_prince", 65, historical=True,
                effects=fx([rebels(MUS, "noble", "large"), mod(MUS, "dynastic_civil_war", 25)],
                           delayed=[{"after_years": 25, "on": MUS, "modifier": "centralizing_reforms"}])),
            opt("grant_galich", "Grant the uncles Galich as their own", "$grand_prince", 35,
                effects=fx([found("galich_shemyaka", where="area:galich", frm=MUS), st(MUS, legitimacy=-10)]))])

ev("upper_hungary_giskra", "Giskra in Upper Hungary",
   "After King Albert dies, Queen Elizabeth hires the Hussite captain Jan Jiskra to hold the north for her infant son. His Bohemian brotherhoods rule the mining towns of Upper Hungary for twenty years against every king.",
   regions=[EU],
   roles={"kingdom": role([HUN], "fixed", ["cost_bearer"])},
   earliest=1420, latest=1470, date=[1440, 1462], confidence="high",
   trigger=ALL(exists(HUN), ANY(flag(HUN, "succession_crisis"), flag(HUN, "succession_dispute")),
               ANY({"period_active": {"id": "p_hussite_wars"}}, stat(HUN, "stability", "<=", -1))),
   options=[opt("let_giskra_hold", "Let the queen's captain hold the north", "$kingdom", 60, historical=True,
                effects=fx([rebels(HUN, "separatist", "medium"), st(HUN, legitimacy=-10)])),
            opt("buy_him_out", "Buy Giskra out with the mining towns' silver", "$kingdom", 40,
                effects=fx([st(HUN, treasury="-25%")]))])

# ---------------------------------------------------------------- Ottomans and Balkans

ev("john_v_restored", "John V restored",
   "John V and his son Manuel escape from Andronikos IV's prison and go to Murad. With Ottoman troops and Venetian ships they retake Constantinople, and Andronikos flees to Genoese Pera with hostages. The price is more tribute and service to the Sultan.",
   regions=[EU, ME], periods=["p_ottoman_expansion"],
   roles={"sultan": role([OTT], {"borders": {"who": "this", "other": BYZ}}, ["initiator", "beneficiary"]),
          "empire": role([BYZ], "fixed", ["affected", "cost_bearer"])},
   earliest=1378, latest=1395, date="1379-07-01", confidence="high",
   trigger=ALL(exists(BYZ), borders("$sultan", BYZ), ANY(flag(BYZ, "succession_dispute"), stat(BYZ, "legitimacy", "<", 60))),
   invalidated_if=gone(BYZ),
   selection={"mode": "decision", "mean_years": 1},
   options=[opt("back_john", "Back John V for higher tribute", "$sultan", 65, historical=True,
                effects=fx([vassalize("$sultan", BYZ, "tributary"), st("$sultan", treasury="+10%"),
                            st(BYZ, legitimacy=10, stability=-1)])),
            opt("keep_andronikos", "Keep Andronikos on the throne", "$sultan", 35,
                effects=fx([st(BYZ, legitimacy=-10), st("$sultan", prestige=5)]))])

ev("ottomans_take_sofia", "Sofia and Niš fall",
   "Lala Şahin Pasha takes Sofia, and three years later the Ottomans storm Niš, opening the Morava road into Lazar's Serbia.",
   regions=[EU], periods=["p_ottoman_expansion"],
   roles={"sultan": role([OTT], {"controls": {"who": "this", "where": "province:sofia"}}, ["initiator", "beneficiary"]),
          "holder": role(["bulgaria_tarnovo", "serbia"], {"owns": {"who": "this", "where": "province:sofia"}}, ["cost_bearer"])},
   earliest=1378, latest=1420, date=[1382, 1386], confidence="medium",
   disputes="Sofia is dated 1382 or 1385.",
   trigger=ALL(owns("$holder", "province:sofia"), war("$sultan", "$holder"), controls("$sultan", "province:sofia")),
   options=[opt("keep_and_settle", "Settle it with timar holders", "$sultan", 70, historical=True,
                effects=fx([transfer("province:sofia", "$holder", "$sultan"), st("$sultan", prestige=10)])),
            opt("raid_and_return", "Raid and return it for tribute", "$sultan", 30,
                effects=fx([vassalize("$sultan", "$holder", "tributary"), st("$sultan", treasury="+10%")]))],
   follow_ups=[("battle_of_kosovo", (0, 8), 2.0)])

ev("battle_of_kosovo", "Battle of Kosovo",
   "Prince Lazar of Serbia, Vuk Branković and a Bosnian force under Vlatko Vuković meet Murad I on the Field of Blackbirds. Both Lazar and Murad die; the Serbs are spent and become Ottoman vassals.",
   regions=[EU], importance="major", periods=["p_ottoman_expansion"],
   roles={"sultan": role([OTT], {"borders": {"who": "this", "other": "serbia"}}, ["initiator", "beneficiary"]),
          "prince": role(["serbia"], "fixed", ["resister", "cost_bearer"])},
   earliest=1378, latest=1430, date="1389-06-15", confidence="high",
   trigger=ALL(exists("serbia"), war("$sultan", "serbia")),
   invalidated_if=gone("serbia"),
   options=[opt("stand_on_the_field", "Stand on the Field of Blackbirds", "$prince", 65, historical=True,
                effects=fx([setflag("$sultan", "ruler_died", 1), setflag("serbia", "ruler_died", 1),
                            st("serbia", army_strength="-60%"), vassalize("$sultan", "serbia", "vassal"),
                            st("$sultan", army_strength="-25%", prestige=10)])),
            opt("call_on_hungary", "Fall back and call on Hungary", "$prince", 35,
                effects=fx([st("serbia", prestige=-10), relation("serbia", HUN, "alliance")]))],
   effects=fx([], long_term=[mod("serbia", "national_grievance", 50)]),
   follow_ups=[("bayezid_accession", (0, 1), 4.0), ("fall_of_tarnovo", (2, 8), 1.5)])

ev("bayezid_accession", "Bayezid's accession",
   "Bayezid is proclaimed sultan in the tent on the battlefield and has his brother Yakub strangled at once, so the army has a single master. Fratricide becomes the house's custom.",
   regions=[EU, ME], periods=["p_ottoman_expansion"],
   roles={"sultan": role([OTT], "fixed", ["initiator"])},
   earliest=1378, latest=1440, date="1389-06-15", confidence="high",
   trigger=ALL(exists(OTT), flag(OTT, "ruler_died")),
   selection={"mode": "immediate"},
   options=[opt("kill_the_brother", "Have the brother killed", "$sultan", 65, historical=True,
                effects=fx([st(OTT, legitimacy=10, stability=1, prestige=-5)])),
            opt("share_the_realm", "Give the brother Anatolia to govern", "$sultan", 35,
                effects=fx([rebels(OTT, "noble", "medium"), st(OTT, legitimacy=-10)]))],
   follow_ups=[("blockade_of_constantinople", (2, 8), 1.5)])

ev("fall_of_tarnovo", "Fall of Tarnovo",
   "Bayezid's army takes Tarnovo after a three-month siege. Patriarch Euthymius is exiled, Ivan Shishman is killed two years later, and the Bulgarian tsardom ends.",
   regions=[EU], periods=["p_ottoman_expansion"],
   roles={"sultan": role([OTT], {"borders": {"who": "this", "other": "bulgaria_tarnovo"}}, ["initiator", "beneficiary"]),
          "tsardom": role(["bulgaria_tarnovo"], "fixed", ["cost_bearer"])},
   earliest=1380, latest=1430, date="1393-07-17", confidence="high",
   trigger=ALL(exists("bulgaria_tarnovo"), ANY(war("$sultan", "bulgaria_tarnovo"), rel("bulgaria_tarnovo", "$sultan", "subject")),
               controls("$sultan", "province:tarnovo")),
   invalidated_if=gone("bulgaria_tarnovo"),
   options=[opt("annex_tarnovo", "Annex the tsardom", "$sultan", 70, historical=True,
                effects=fx([annex("$sultan", "bulgaria_tarnovo"), st("$sultan", prestige=10)])),
            opt("vassal_tsar", "Keep a tsar as vassal", "$sultan", 30,
                effects=fx([vassalize("$sultan", "bulgaria_tarnovo", "vassal")]))],
   follow_ups=[("battle_of_nikopolis", (1, 5), 2.0)])

ev("battle_of_nikopolis", "Battle of Nikopolis",
   "King Sigismund of Hungary leads a crusade of Hungarians, Burgundian and French knights, Hospitallers and Wallachians down the Danube. The French charge ahead and the army is destroyed before Nikopolis; Vidin falls to Bayezid soon after.",
   regions=[EU], importance="major", periods=["p_ottoman_expansion"],
   roles={"crusader": role([HUN], {"borders": {"who": "this", "other": OTT}}, ["initiator", "cost_bearer"]),
          "sultan": role([OTT], "fixed", ["resister", "beneficiary"]),
          "allies": role(["burgundy", "france", "wallachia", "knights_of_rhodes", "venice"], {"relation": {"who": "this", "other": HUN, "type": "alliance"}}, ["participant"])},
   earliest=1385, latest=1430, date="1396-09-25", confidence="high",
   trigger=ALL(exists(OTT), borders("$crusader", OTT), ANY(war("$crusader", OTT), happened("fall_of_tarnovo", 5))),
   selection={"mode": "decision", "mean_years": 3},
   options=[opt("crusade_down_the_danube", "Call the crusade and march", "$crusader", 60, historical=True,
                effects=fx([warfx("war_nikopolis", ["$crusader"], [OTT], "reconquest"), mod("$crusader", "crusading_zeal", 10),
                            st("$crusader", army_strength="-50%", prestige=-20), st(OTT, prestige=20)])),
            opt("hold_the_danube", "Hold the Danube forts", "$crusader", 40,
                effects=fx([mod("$crusader", "defensive_frontier_policy", 20)]))],
   effects=fx([annex(OTT, "bulgaria_vidin")]),
   follow_ups=[("blockade_of_constantinople", (0, 3), 1.5)])

ev("blockade_of_constantinople", "Blockade of Constantinople",
   "Bayezid builds Anadoluhisarı on the Bosporus and blockades Constantinople for eight years. Manuel II tours the courts of Italy, France and England asking for help; the city starves but holds, saved in the end by Timur.",
   regions=[EU, ME], periods=["p_ottoman_expansion"],
   roles={"sultan": role([OTT], {"borders": {"who": "this", "other": BYZ}}, ["initiator"]),
          "empire": role([BYZ], "fixed", ["resister", "victim"])},
   earliest=1385, latest=1440, date=[1394, 1402], confidence="high",
   trigger=ALL(exists(BYZ), owns(BYZ, "province:constantinople"), borders("$sultan", BYZ), stat("$sultan", "stability", ">=", 0)),
   invalidated_if=ANY(gone(BYZ), NOT(owns(BYZ, "province:constantinople"))),
   execution={"duration_years": 8, "cancel_if": ANY(war("$sultan", TIMUR), stat("$sultan", "stability", "<=", -2))},
   options=[opt("seek_the_west", "Hold out and seek help in the West", "$empire", 65, historical=True,
                effects=fx([st(BYZ, prosperity=-3, treasury="-30%", prestige=5), relation(BYZ, "venice", "alliance")])),
            opt("open_the_gates", "Pay whatever the Sultan asks", "$empire", 35,
                effects=fx([vassalize("$sultan", BYZ, "vassal"), st(BYZ, legitimacy=-15, treasury="-40%")]))],
   effects=fx([{"on": "province:constantinople", "stat": {"prosperity": -4, "population": "-20%"}}]),
   follow_ups=[("battle_of_ankara", (0, 8), 1.5)])

ev("battle_of_ankara", "Battle of Ankara",
   "Timur meets Bayezid near Ankara. The Tatar troops and the Anatolian beyliks' men desert to Timur, Bayezid is captured and dies in captivity, and the beyliks are restored. The Ottoman realm splits among his sons.",
   regions=[ME, EU, CA], importance="major", periods=["p_ottoman_expansion", "p_timurs_conquests"],
   roles={"conqueror": role([TIMUR], {"borders": {"who": "this", "other": OTT}}, ["initiator", "beneficiary"]),
          "sultan": role([OTT], "fixed", ["cost_bearer"]),
          "beyliks": role(["germiyan", "aydin", "mentese", "saruhan", "karaman", "candar", "hamid", "teke"], "fixed", ["beneficiary"])},
   earliest=1390, latest=1420, date="1402-07-20", confidence="high",
   trigger=ALL(exists(TIMUR), war("$conqueror", OTT), stat("$conqueror", "army_strength", ">", 30)),
   invalidated_if=gone(TIMUR),
   options=[opt("meet_timur_in_the_field", "Meet Timur in the open field", "$sultan", 60, historical=True,
                effects=fx([setflag(OTT, "ruler_died", 1), setflag(OTT, "succession_dispute", 11),
                            st(OTT, army_strength="-50%", stability=-3, prestige=-30), release(OTT, "$beyliks"),
                            st("$conqueror", prestige=25), period(start="p_ottoman_interregnum")])),
            opt("submit_to_timur", "Submit and send tribute", "$sultan", 40,
                effects=fx([vassalize("$conqueror", OTT, "tributary"), st(OTT, prestige=-20, legitimacy=-10)]))],
   follow_ups=[("mehmed_reunites", (5, 15), 2.0)])

ev("mehmed_reunites", "Mehmed I reunites the realm",
   "After eleven years of war between Bayezid's sons, Mehmed Çelebi defeats his brother Musa at Çamurlu and rules the whole of the Ottoman realm. The Sheikh Bedreddin rising follows soon after.",
   regions=[EU, ME], importance="major", periods=["p_ottoman_interregnum"],
   roles={"sultan": role([OTT], "fixed", ["initiator", "beneficiary"])},
   earliest=1395, latest=1440, date="1413-07-05", confidence="high",
   requires=happened("battle_of_ankara"),
   trigger=ALL(exists(OTT), stat(OTT, "stability", ">=", 0), NOT(war(OTT, TIMUR))),
   options=[opt("restore_the_realm", "Restore the realm and its frontier lords", "$sultan", 70, historical=True,
                effects=fx([st(OTT, stability=1, legitimacy=15), mod(OTT, "new_dynasty_consolidation", 15),
                            period(end="p_ottoman_interregnum")],
                           delayed=[{"after_years": 3, "rebels": {"on": OTT, "type": "religious", "size": "medium"}}])),
            opt("share_with_brothers", "Leave Rumelia to a brother", "$sultan", 30,
                effects=fx([rebels(OTT, "noble", "medium"), period(end="p_ottoman_interregnum")]))])

ev("murad_ii_besieges_constantinople", "Murad II besieges Constantinople",
   "Angered that Manuel II backed the pretender Mustafa, the young Murad II lays siege to Constantinople with cannon for the first time. The walls hold, and a revolt by his brother draws him off.",
   regions=[EU, ME], periods=["p_ottoman_expansion"],
   roles={"sultan": role([OTT], {"borders": {"who": "this", "other": BYZ}}, ["initiator"]),
          "empire": role([BYZ], "fixed", ["resister"])},
   earliest=1405, latest=1450, date="1422-06-10", confidence="high",
   requires=ANY(happened("mehmed_reunites"), happened("blockade_of_constantinople")),
   trigger=ALL(exists(BYZ), owns(BYZ, "province:constantinople"), ANY(flag(OTT, "ruler_died"), flag(OTT, "succession_dispute"), war(OTT, BYZ))),
   invalidated_if=gone(BYZ),
   options=[opt("lift_the_siege", "Lift the siege and crush the rebels", "$sultan", 65, historical=True,
                effects=fx([vassalize("$sultan", BYZ, "tributary"), st(BYZ, treasury="-20%")])),
            opt("press_the_assault", "Press the assault", "$sultan", 35,
                effects=fx([st("$sultan", army_strength="-20%"), rebels("$sultan", "noble", "small")]))])

ev("fall_of_thessaloniki", "Fall of Thessaloniki",
   "The Despot Andronikos had sold the besieged city to Venice in 1423. Seven years on, Murad II storms it and sacks it, ending Venice's attempt to hold a Greek city against the Sultan.",
   regions=[EU], periods=["p_ottoman_expansion"],
   roles={"sultan": role([OTT], {"controls": {"who": "this", "where": "province:thessaloniki", "min_share": 0.5}}, ["initiator", "beneficiary"]),
          "holder": role([BYZ, "venice"], {"owns": {"who": "this", "where": "province:thessaloniki"}}, ["cost_bearer"])},
   earliest=1380, latest=1460, date="1430-03-29", confidence="high",
   disputes="Thessaloniki also surrendered to Murad I in 1387 and was handed back after Ankara; one firing stands for either fall.",
   trigger=ALL(owns("$holder", "province:thessaloniki"), war("$sultan", "$holder"), controls("$sultan", "province:thessaloniki", 0.5)),
   options=[opt("storm_and_sack", "Storm and sack it", "$sultan", 65, historical=True,
                effects=fx([transfer("province:thessaloniki", "$holder", "$sultan"), mod("province:thessaloniki", "sacked_city")])),
            opt("accept_surrender", "Accept its surrender on terms", "$sultan", 35,
                effects=fx([transfer("province:thessaloniki", "$holder", "$sultan"), st("$sultan", prestige=5)]))])

ev("long_campaign", "The Long Campaign",
   "John Hunyadi and King Władysław cross the Balkans in winter, take Niš and Sofia and fight their way to the Zlatitsa pass before the cold turns them back. Murad II, beset in Anatolia, offers a truce.",
   regions=[EU], periods=["p_ottoman_expansion"],
   roles={"crusader": role([HUN, POL], {"borders": {"who": "this", "other": OTT}}, ["initiator"]),
          "sultan": role([OTT], "fixed", ["resister", "cost_bearer"])},
   earliest=1420, latest=1460, date=["1443-10", "1444-01"], confidence="high",
   trigger=ALL(exists(OTT), war("$crusader", OTT), stat("$crusader", "army_strength", ">=", 20),
               ANY(war(OTT, "karaman"), stat(OTT, "stability", "<=", 0))),
   options=[opt("winter_march", "March through the winter", "$crusader", 60, historical=True,
                effects=fx([st("$crusader", prestige=15), st(OTT, prestige=-10), mod("$crusader", "crusading_zeal", 5)])),
            opt("take_the_truce", "Take the Sultan's truce", "$crusader", 40,
                effects=fx([relation("$crusader", OTT, "truce"), st("$crusader", treasury="+10%")]))],
   follow_ups=[("crusade_of_varna", (0, 2), 3.0)])

ev("crusade_of_varna", "Crusade of Varna",
   "Urged on by the papal legate, King Władysław breaks the peace of Edirne-Szeged and marches to the Black Sea with Hunyadi. Murad II returns from retirement, and at Varna the crusade is destroyed and the young king killed.",
   regions=[EU], importance="major", periods=["p_ottoman_expansion"],
   roles={"crusader": role([HUN, POL], {"borders": {"who": "this", "other": OTT}}, ["initiator", "cost_bearer"]),
          "sultan": role([OTT], "fixed", ["resister", "beneficiary"]),
          "allies": role(["wallachia", "venice", "burgundy"], {"relation": {"who": "this", "other": HUN, "type": "alliance"}}, ["participant"])},
   earliest=1425, latest=1465, date="1444-11-10", confidence="high",
   optional=[{"event": "long_campaign", "weight": 2.0}],
   trigger=ALL(exists(OTT), borders("$crusader", OTT), ANY(war("$crusader", OTT), happened("long_campaign", 2)),
               NOT(owns(OTT, "province:constantinople"))),
   selection={"mode": "decision", "mean_years": 4},
   options=[opt("break_the_truce", "Break the truce and march on Varna", "$crusader", 55, historical=True,
                effects=fx([warfx("war_varna", ["$crusader"], [OTT], "reconquest"), mod("$crusader", "crusading_zeal", 10),
                            setflag("$crusader", "ruler_died", 1), st("$crusader", army_strength="-50%", prestige=-20),
                            st(OTT, prestige=20)])),
            opt("keep_the_peace", "Keep the peace of Szeged", "$crusader", 45,
                effects=fx([relation("$crusader", OTT, "truce"), st("$crusader", prestige=-5)]))])

# ---------------------------------------------------------------- Steppe and Iran

ev("tokhtamysh_unites_horde", "Tokhtamysh unites the Horde",
   "With Timur's backing, Tokhtamysh takes the White Horde, then Sarai, and after Kulikovo falls on the beaten Mamai. For the first time in twenty years the Golden Horde has one khan from the Dnieper to the Syr Darya.",
   regions=[CA, EU], importance="major",
   roles={"khan": role([WHITE], "fixed", ["initiator", "beneficiary"]),
          "rival": role([HORDE], "fixed", ["cost_bearer"]),
          "patron": role([TIMUR], {"borders": {"who": "this", "other": WHITE}}, ["participant"])},
   earliest=1378, latest=1400, date=[1378, 1380], confidence="high",
   trigger=ALL(exists(WHITE), exists(HORDE), borders(WHITE, HORDE),
               ANY(flag(HORDE, "horde_humbled"), stat(HORDE, "stability", "<", 0), war(WHITE, HORDE))),
   invalidated_if=ANY(gone(WHITE), gone(HORDE)),
   options=[opt("ride_on_sarai", "Ride on Sarai and the west", "$khan", 70, historical=True,
                effects=fx([annex(HORDE, WHITE), annex(HORDE, "arab_shah_horde"), st(HORDE, stability=2, legitimacy=20, prestige=20),
                            relation(HORDE, TIMUR, "alliance")])),
            opt("stay_east", "Stay on the Syr Darya", "$khan", 30,
                effects=fx([st(WHITE, prestige=-10), relation(WHITE, HORDE, "rivalry")]))],
   follow_ups=[("tokhtamysh_burns_moscow", (1, 4), 2.0), ("battle_of_the_terek", (8, 18), 1.5)])

ev("timur_takes_herat", "Timur takes Herat",
   "Timur summons the Kartid malik Ghiyath al-Din to his court and, when he delays, marches on Herat. The city surrenders, its walls are pulled down, and the Kartids become his vassals before being put to death in 1389.",
   regions=[CA, ME], periods=["p_timurs_conquests"],
   roles={"conqueror": role([TIMUR], {"borders": {"who": "this", "other": "kartids"}}, ["initiator", "beneficiary"]),
          "malik": role(["kartids"], "fixed", ["cost_bearer"])},
   earliest=1378, latest=1400, date="1381-04", confidence="high",
   trigger=ALL(exists("kartids"), borders("$conqueror", "kartids"), stat("$conqueror", "stability", ">=", 0)),
   invalidated_if=gone("kartids"),
   selection={"mode": "decision", "mean_years": 2},
   options=[opt("take_herat", "March on Herat", "$conqueror", 70, historical=True,
                effects=fx([vassalize("$conqueror", "kartids", "vassal"), transfer("area:herat", "kartids", "$conqueror"), st("$conqueror", prestige=15)],
                           delayed=[{"after_years": 8, "annex": {"who": "$conqueror", "target": "kartids"}}])),
            opt("demand_tribute", "Demand tribute only", "$conqueror", 30,
                effects=fx([vassalize("$conqueror", "kartids", "tributary")]))],
   effects=fx([], long_term=[mod("area:herat", "war_devastation_light")]),
   follow_ups=[("timur_three_year_campaign", (3, 8), 2.0)])

ev("timur_three_year_campaign", "Timur's three-year campaign",
   "Timur sweeps west through Iran: Tabriz, Georgia and Armenia, then Isfahan, which rises against his tax collectors and is massacred. Shah Shuja's heirs in Fars submit, and the Jalayirids lose Azerbaijan.",
   regions=[ME, CA], importance="major", periods=["p_timurs_conquests"],
   roles={"conqueror": role([TIMUR], "fixed", ["initiator", "beneficiary"]),
          "jalayir": role(["jalayirids"], "fixed", ["cost_bearer"]),
          "muzaffar": role(["muzaffarids"], {"borders": {"who": "this", "other": "$conqueror"}}, ["victim", "cost_bearer"])},
   earliest=1380, latest=1405, date=[1386, 1388], confidence="high",
   requires=happened("timur_takes_herat"),
   trigger=ALL(exists("jalayirids"), borders("$conqueror", "jalayirids"), stat("$conqueror", "army_strength", ">", 30)),
   invalidated_if=gone(TIMUR),
   options=[opt("spare_none", "Make an example of Isfahan", "$conqueror", 60, historical=True,
                effects=fx([transfer("area:tabriz", "jalayirids", "$conqueror"), vassalize("$conqueror", "$muzaffar", "tributary"),
                            mod("province:isfahan", "sacked_city"), {"on": "province:isfahan", "stat": {"population": "-30%", "prosperity": -6}},
                            st("$conqueror", prestige=20, treasury="+20%")])),
            opt("accept_submission", "Accept the cities' submission", "$conqueror", 40,
                effects=fx([transfer("area:tabriz", "jalayirids", "$conqueror"), vassalize("$conqueror", "$muzaffar", "tributary"),
                            st("$conqueror", prestige=10)]))],
   follow_ups=[("timur_five_year_campaign", (3, 8), 2.0)])

ev("timur_five_year_campaign", "Timur's five-year campaign",
   "Timur returns to Iran, destroys the Muzaffarids, takes Baghdad from Ahmad Jalayir and campaigns through Georgia, the Caucasus and eastern Anatolia.",
   regions=[ME, CA], importance="major", periods=["p_timurs_conquests"],
   roles={"conqueror": role([TIMUR], "fixed", ["initiator", "beneficiary"]),
          "muzaffar": role(["muzaffarids"], "fixed", ["cost_bearer"]),
          "jalayir": role(["jalayirids"], "fixed", ["cost_bearer"])},
   earliest=1385, latest=1405, date=[1392, 1396], confidence="high",
   requires=happened("timur_three_year_campaign"),
   trigger=ALL(exists(TIMUR), ANY(exists("muzaffarids"), exists("jalayirids")), stat(TIMUR, "army_strength", ">", 30)),
   options=[opt("end_the_dynasties", "End the Muzaffarids and take Baghdad", "$conqueror", 65, historical=True,
                effects=fx([annex("$conqueror", "muzaffarids"), transfer("province:baghdad", "jalayirids", "$conqueror"),
                            st("$conqueror", prestige=20)])),
            opt("set_up_governors", "Leave governors and tribute", "$conqueror", 35,
                effects=fx([vassalize("$conqueror", "muzaffarids", "vassal"), vassalize("$conqueror", "jalayirids", "tributary")]))],
   follow_ups=[("battle_of_the_terek", (0, 4), 2.0), ("sack_of_delhi", (2, 6), 1.5)])

ev("battle_of_the_terek", "Battle of the Terek",
   "Tokhtamysh, grown strong, turns on his old patron. Timur crushes him on the Terek, then lays waste to the Horde's cities: New Sarai, Hajji Tarkhan, Tana and Azak burn, and the northern caravan road never recovers.",
   regions=[CA, EU], importance="major", periods=["p_timurs_conquests"],
   roles={"conqueror": role([TIMUR], "fixed", ["initiator", "beneficiary"]),
          "khan": role([HORDE], "fixed", ["cost_bearer"])},
   earliest=1385, latest=1410, date="1395-04-15", confidence="high",
   trigger=ALL(exists(HORDE), war(TIMUR, HORDE)),
   invalidated_if=ANY(gone(HORDE), gone(TIMUR)),
   options=[opt("ruin_the_horde", "Pursue the khan and burn the cities", "$conqueror", 65, historical=True,
                effects=fx([st(HORDE, army_strength="-60%", stability=-3, prestige=-30, treasury="-50%"),
                            mod("province:sarai", "sacked_city"), {"on": "province:sarai", "stat": {"population": "-50%", "prosperity": -8}},
                            setflag(HORDE, "succession_dispute", 20), st("$conqueror", treasury="+25%", prestige=20)])),
            opt("set_a_new_khan", "Set a new khan and go home", "$conqueror", 35,
                effects=fx([st(HORDE, army_strength="-40%", stability=-2), vassalize("$conqueror", HORDE, "tributary")]))],
   follow_ups=[("battle_of_vorskla", (2, 6), 2.0), ("edigu_rules_the_horde", (0, 4), 2.0)])

# Timur in India is the South file's `sack_of_delhi` (events-bridge-south.json).

ev("timur_in_syria", "Timur in Syria",
   "The Mamluks had sheltered Ahmad Jalayir and killed Timur's envoys. Timur takes Aleppo, defeats the young Sultan Faraj and burns Damascus, carrying its craftsmen to Samarkand; on his way home he storms Baghdad again.",
   regions=[ME], importance="major", periods=["p_timurs_conquests"],
   roles={"conqueror": role([TIMUR], {"borders": {"who": "this", "other": MAM}}, ["initiator", "beneficiary"]),
          "sultan": role([MAM], "fixed", ["victim", "cost_bearer"])},
   earliest=1390, latest=1410, date=["1400-10-30", "1401-07-09"], confidence="high",
   trigger=ALL(exists(MAM), war("$conqueror", MAM), stat("$conqueror", "army_strength", ">", 30)),
   invalidated_if=gone(MAM),
   options=[opt("burn_damascus", "Burn Damascus and take its craftsmen", "$conqueror", 65, historical=True,
                effects=fx([mod("province:damascus", "sacked_city"), {"on": "province:damascus", "stat": {"population": "-30%", "prosperity": -8}},
                            st(MAM, prestige=-25, stability=-2, treasury="-30%"), st("$conqueror", prestige=20, treasury="+20%")],
                           long_term=[mod("province:samarkand", "skilled_refugees", 30)])),
            opt("take_homage", "Take the Sultan's homage and coin", "$conqueror", 35,
                effects=fx([vassalize("$conqueror", MAM, "tributary"), st(MAM, prestige=-15)]))])

ev("death_of_timur", "Death of Timur",
   "Timur dies at Otrar on the way to invade Ming China. His chosen heir, his grandson Pir Muhammad, is far away in Kandahar, and his sons and grandsons fight over the empire.",
   regions=[CA, ME], importance="major", periods=["p_timurs_conquests"],
   roles={"empire": role([TIMUR], "fixed", ["affected"])},
   earliest=1395, latest=1420, date="1405-02-18", confidence="high",
   trigger=ALL(exists(TIMUR), flag(TIMUR, "ruler_died")),
   selection={"mode": "immediate"},
   options=[opt("heirs_contest", "Let the heirs contest the throne", "$empire", 65, historical=True,
                effects=fx([setflag(TIMUR, "succession_dispute", 5), rebels(TIMUR, "noble", "large"), st(TIMUR, stability=-2)])),
            opt("march_on_china", "The emirs march on China as he ordered", "$empire", 35,
                effects=fx([st(TIMUR, stability=-1, army_strength="-20%"), relation(TIMUR, "ming", "rivalry")]))],
   effects=fx([period(end="p_timurs_conquests"), period(start="p_timurid_fragmentation")]),
   follow_ups=[("shah_rukh_reunites", (2, 8), 2.0), ("qara_qoyunlu_rise", (0, 6), 1.5)])

ev("shah_rukh_reunites", "Shah Rukh rules from Herat",
   "Timur's youngest son Shah Rukh takes Samarkand from his nephew Khalil Sultan, gives it to his own son Ulugh Beg and rules the empire from Herat as a patron of scholars and builders rather than a conqueror.",
   regions=[CA, ME], periods=["p_timurid_fragmentation"],
   roles={"empire": role([TIMUR], "fixed", ["initiator", "beneficiary"])},
   earliest=1400, latest=1430, date="1409-05", confidence="high",
   requires=happened("death_of_timur"),
   trigger=ALL(exists(TIMUR), stat(TIMUR, "stability", ">=", -1)),
   options=[opt("rule_from_herat", "Rule from Herat; Ulugh Beg in Samarkand", "$empire", 70, historical=True,
                effects=fx([st(TIMUR, stability=2, legitimacy=15), mod("area:herat", "scholarly_centre", 50),
                            mod("province:samarkand", "scholarly_centre", 40)])),
            opt("rule_from_samarkand", "Keep the throne in Samarkand", "$empire", 30,
                effects=fx([st(TIMUR, stability=1, legitimacy=5), rebels(TIMUR, "noble", "small")]))])

ev("edigu_rules_the_horde", "Edigu rules the Horde",
   "The Manghit emir Edigu, never khan himself, makes and unmakes khans for twenty years. He beats Vytautas on the Vorskla and besieges Moscow in 1408, but the Horde's princes never unite again.",
   regions=[CA, EU],
   roles={"horde": role([HORDE], "fixed", ["initiator"]),
          "prince": role([MUS], {"borders": {"who": "this", "other": HORDE}}, ["victim"])},
   earliest=1390, latest=1425, date=[1396, 1419], confidence="high",
   trigger=ALL(exists(HORDE), ANY(happened("battle_of_the_terek"), flag(HORDE, "succession_dispute"))),
   options=[opt("emir_rules", "Let the emir rule through puppet khans", "$horde", 65, historical=True,
                effects=fx([st(HORDE, legitimacy=-15, army_strength="+20%"), setflag(HORDE, "succession_dispute", 25)],
                           delayed=[{"after_years": 10, "on": "$prince", "stat": {"treasury": "-15%"}}])),
            opt("restore_a_khan", "Restore a true khan's authority", "$horde", 35,
                effects=fx([st(HORDE, legitimacy=10, stability=-1), rebels(HORDE, "noble", "medium")]))],
   follow_ups=[("kazan_khanate_founded", (15, 40), 1.5), ("crimean_khanate_founded", (15, 40), 1.5)])

ev("kazan_khanate_founded", "Khanate of Kazan",
   "Ulugh Muhammad, driven from Sarai, settles among the Volga Bulgars and makes Kazan the seat of a new khanate that will raid and trade with Muscovy for a century.",
   regions=[EU, CA], importance="major", periods=["p_muscovite_consolidation"],
   roles={"horde": role([HORDE], "fixed", ["cost_bearer"]),
          "founders": role(["kazan"], "fixed", ["initiator", "beneficiary"])},
   earliest=1410, latest=1480, date=[1438, 1445], confidence="medium",
   disputes="Founded 1438 by some accounts, 1445 by others.",
   trigger=ALL(gone("kazan"), ANY(stat(HORDE, "stability", "<=", 0), flag(HORDE, "succession_dispute")),
               ANY(owns(HORDE, "province:kazan"), owns("volga_bulgaria", "province:kazan"))),
   options=[opt("found_kazan", "Ulugh Muhammad takes Kazan", "$horde", 70, historical=True,
                effects=fx([found("kazan", where="province:kazan"), st(HORDE, prestige=-10)])),
            opt("hold_the_volga", "Hold the Volga for the Horde", "$horde", 30,
                effects=fx([st(HORDE, army_strength="-15%")], delayed=[{"after_years": 5, "rebels": {"on": HORDE, "type": "separatist", "size": "medium"}}]))])

ev("crimean_khanate_founded", "Khanate of Crimea",
   "Hacı Giray, raised in Lithuania, is set up as khan in the Crimea with Vytautas's heirs behind him. The Giray dynasty breaks from the Horde and holds the peninsula until the eighteenth century.",
   regions=[EU, CA], importance="major",
   roles={"horde": role([HORDE], "fixed", ["cost_bearer"]),
          "patron": role([LIT], {"borders": {"who": "this", "other": HORDE}}, ["participant", "beneficiary"])},
   earliest=1410, latest=1480, date="1441", confidence="medium",
   disputes="1441 is common; some date Hacı Giray's independent rule to 1449.",
   trigger=ALL(gone("crimea"), owns(HORDE, "province:crimea"), ANY(stat(HORDE, "stability", "<=", 0), flag(HORDE, "succession_dispute"))),
   options=[opt("back_haci_giray", "Back Hacı Giray in the Crimea", "$patron", 65, historical=True,
                effects=fx([found("crimea", where="province:crimea"), relation("$patron", "crimea", "alliance"), st(HORDE, prestige=-15)])),
            opt("deal_with_the_horde", "Deal with the Horde's khan instead", "$patron", 35,
                effects=fx([relation("$patron", HORDE, "non_aggression")]))])

ev("abul_khayr_uzbeks", "Abu'l-Khayr's Uzbeks",
   "The young Shibanid Abu'l-Khayr is raised khan by the clans east of the Ural, takes Chimgi-Tura and then Old Urgench and Sighnaq. The Uzbek confederation becomes the power of the steppe north of the Syr Darya.",
   regions=[CA], importance="major", periods=["p_timurid_fragmentation"],
   roles={"horde": role([HORDE, WHITE], {"owns": {"who": "this", "where": "province:chimgi_tura"}}, ["cost_bearer"])},
   earliest=1410, latest=1470, date="1428", confidence="high",
   trigger=ALL(gone("uzbek_khanate"), ANY(stat("$horde", "stability", "<=", 0), flag("$horde", "succession_dispute"))),
   options=[opt("raise_the_khan", "The clans raise Abu'l-Khayr", "$horde", 70, historical=True,
                effects=fx([found("uzbek_khanate", where="province:chimgi_tura"), st("$horde", prestige=-10)])),
            opt("hold_the_clans", "Hold the eastern clans by gifts", "$horde", 30,
                effects=fx([st("$horde", treasury="-20%")]))])

ev("qara_qoyunlu_rise", "Rise of the Qara Qoyunlu",
   "Qara Yusuf comes back from Mamluk exile after Timur's death, retakes Tabriz, and in 1410 defeats and kills his old ally Sultan Ahmad Jalayir. The Black Sheep Turkmen rule Azerbaijan and Iraq.",
   regions=[ME], importance="major", periods=["p_timurid_fragmentation"],
   roles={"turkmen": role(["qara_qoyunlu"], "fixed", ["initiator", "beneficiary"]),
          "holder": role([TIMUR, "jalayirids"], {"owns": {"who": "this", "where": "area:tabriz"}}, ["cost_bearer"])},
   earliest=1395, latest=1440, date=[1406, 1410], confidence="high",
   trigger=ALL(exists("qara_qoyunlu"), owns("$holder", "area:tabriz"), ANY(stat("$holder", "stability", "<=", -1), flag("$holder", "succession_dispute"),
               war("qara_qoyunlu", "$holder"))),
   options=[opt("take_tabriz", "Take Tabriz and Baghdad", "$turkmen", 70, historical=True,
                effects=fx([transfer("area:tabriz", "$holder", "qara_qoyunlu"), annex("qara_qoyunlu", "jalayirids"), st("qara_qoyunlu", prestige=20)])),
            opt("serve_the_jalayirids", "Serve Sultan Ahmad as before", "$turkmen", 30,
                effects=fx([vassalize("jalayirids", "qara_qoyunlu", "vassal")]))])

# ---------------------------------------------------------------- Mamluks and the Horn of Africa

ev("barquq_takes_the_throne", "Barquq takes the throne",
   "The Circassian amir Barquq, regent for a child sultan, deposes him and makes himself sultan. A revolt drives him out in 1389, but he returns a year later; from him the Circassian Mamluks rule Egypt and Syria.",
   regions=[ME], importance="regional",
   roles={"sultanate": role([MAM], "fixed", ["initiator", "affected"])},
   earliest=1378, latest=1400, date="1382-11-26", confidence="high",
   trigger=ALL(exists(MAM), ANY(flag(MAM, "regency"), flag(MAM, "ruler_died"), stat(MAM, "legitimacy", "<", 60))),
   options=[opt("crown_barquq", "Barquq takes the sultanate", "$sultanate", 70, historical=True,
                effects=fx([st(MAM, legitimacy=-10, stability=1), mod(MAM, "new_dynasty_consolidation", 10)],
                           delayed=[{"after_years": 7, "rebels": {"on": MAM, "type": "noble", "size": "medium"}}])),
            opt("keep_the_qalawunids", "Keep a Qalawunid on the throne", "$sultanate", 30,
                effects=fx([st(MAM, legitimacy=10, stability=-1), rebels(MAM, "noble", "small")]))])

ev("barsbay_takes_cyprus", "Barsbay humbles Cyprus",
   "After Cypriot pirates raid the Egyptian coast, Sultan Barsbay sends fleets to Cyprus. At Khirokitia King Janus is beaten and taken to Cairo; he is ransomed, and Cyprus pays tribute to the Mamluks thereafter.",
   regions=[ME], importance="regional",
   roles={"sultan": role([MAM], "fixed", ["initiator", "beneficiary"]),
          "kingdom": role(["cyprus"], "fixed", ["cost_bearer"])},
   earliest=1400, latest=1460, date="1426-07-07", confidence="high",
   trigger=ALL(exists("cyprus"), war(MAM, "cyprus"), stat(MAM, "stability", ">=", 0)),
   invalidated_if=gone("cyprus"),
   options=[opt("tribute_and_ransom", "Ransom the king for tribute", "$sultan", 70, historical=True,
                effects=fx([vassalize(MAM, "cyprus", "tributary"), st("cyprus", treasury="-40%", prestige=-20), st(MAM, prestige=15, treasury="+15%")])),
            opt("annex_the_island", "Take the island", "$sultan", 30,
                effects=fx([annex(MAM, "cyprus"), st(MAM, prestige=10)]))])

ev("fall_of_ifat", "Fall of Ifat",
   "The Solomonic kings press the rebel Walashma sultans for a generation. King Yeshaq's army pursues Sa'ad ad-Din II to Zeila, where he is killed; his sons flee to Yemen and Ifat ceases to be.",
   regions=[AF], importance="regional",
   roles={"king": role(["ethiopia"], {"borders": {"who": "this", "other": "ifat"}}, ["initiator", "beneficiary"]),
          "sultan": role(["ifat"], "fixed", ["cost_bearer", "resister"])},
   earliest=1380, latest=1440, date=[1410, 1415], confidence="medium",
   disputes="Sa'ad ad-Din's death is dated c.1403, 1410 or 1415.",
   trigger=ALL(exists("ifat"), war("$king", "ifat"), stat("$king", "army_strength", ">", 0)),
   invalidated_if=gone("ifat"),
   options=[opt("pursue_to_zeila", "Pursue the sultan to Zeila", "$king", 70, historical=True,
                effects=fx([annex("$king", "ifat"), st("$king", prestige=15)])),
            opt("restore_tribute", "Restore him as tributary", "$king", 30,
                effects=fx([vassalize("$king", "ifat", "tributary")]))],
   follow_ups=[("adal_rises", (3, 12), 3.0)])

ev("adal_rises", "Adal rises",
   "The sons of Sa'ad ad-Din return from Yemen and found a new sultanate on the Harar plateau, out of the Ethiopian kings' reach. Adal takes up Ifat's war and the Muslim tributaries look to it.",
   regions=[AF], importance="regional", periods=[],
   roles={"king": role(["ethiopia"], "fixed", ["cost_bearer"])},
   earliest=1395, latest=1460, date=[1415, 1420], confidence="medium",
   requires=happened("fall_of_ifat"),
   trigger=ALL(gone("adal"), gone("ifat")),
   options=[opt("walashma_return", "The Walashma heirs return", "$king", 75, historical=True,
                effects=fx([found("adal", where="area:harar"), relation("ethiopia", "adal", "rivalry")])),
            opt("ethiopian_garrisons", "Ethiopian garrisons hold the plateau", "$king", 25,
                effects=fx([st("ethiopia", army_strength="-10%", treasury="-10%")]))])

ev("dawit_and_the_mamluks", "Dawit I and the Mamluks",
   "King Dawit I campaigns to the edge of Mamluk Upper Egypt to protect the Copts, and the Sultan, wary of the Nile, sends the metropolitan and gifts. A fragment of the True Cross is said to reach Ethiopia in his reign.",
   regions=[AF, ME],
   roles={"king": role(["ethiopia"], "fixed", ["initiator"]), "sultan": role([MAM], "fixed", ["affected"])},
   earliest=1378, latest=1420, date=[1380, 1413], confidence="low",
   disputes="The campaign against Egypt is known mainly from Ethiopian tradition.",
   trigger=ALL(exists("ethiopia"), exists(MAM), stat("ethiopia", "stability", ">=", 0)),
   options=[opt("ride_to_aswan", "Ride north to protect the Copts", "$king", 55, historical=True,
                effects=fx([st("ethiopia", prestige=15), relation("ethiopia", MAM, "rivalry")])),
            opt("send_embassy", "Send an embassy to Cairo", "$king", 45,
                effects=fx([st("ethiopia", legitimacy=5), relation("ethiopia", MAM, "non_aggression")]))])

ev("zara_yaqob_reforms", "Zara Yaqob's reforms",
   "Zara Yaqob, crowned at Aksum, rules the church and the provinces with an iron hand: he settles the Sabbath dispute, punishes heresy, sends envoys to Florence and in 1445 breaks Adal's army at Gomit.",
   regions=[AF], importance="regional",
   roles={"king": role(["ethiopia"], "fixed", ["initiator", "beneficiary"])},
   earliest=1410, latest=1460, date=[1434, 1468], confidence="high",
   trigger=ALL(exists("ethiopia"), ANY(flag("ethiopia", "ruler_died"), stat("ethiopia", "legitimacy", "<", 60))),
   options=[opt("iron_hand", "Rule church and court with an iron hand", "$king", 65, historical=True,
                effects=fx([st("ethiopia", legitimacy=20, stability=1), mod("ethiopia", "centralizing_reforms", 30),
                            rebels("ethiopia", "religious", "small")])),
            opt("gentle_hand", "Rule through the great lords", "$king", 35,
                effects=fx([st("ethiopia", stability=1, legitimacy=5)]))])

# ---------------------------------------------------------------- re-dated campaign events
# From a 1378 start these 1444 events wait for their conditions, not for the
# year 1444 (plan-1378 §5). A bridge event with the id of a campaign event
# replaces it in campaigns that start before 1444, so each is copied here from
# events-campaign.json with only its earliest year moved.
redate = {
    "fall_of_constantinople": {"earliest": 1390, "why": "Bayezid blockaded the city from 1394; the trigger already needs a war, the walls held and the tech."},
    "battle_of_mohacs": {"earliest": 1400, "why": "Needs the Ottomans on Hungary's border at war with it; Nikopolis covers the 1390s."},
    "union_of_lublin": {"earliest": 1386, "why": "Needs the Polish-Lithuanian personal union, which Krewo makes."},
    "ottoman_conquest_of_mamluks": {"earliest": 1400, "why": "Needs an Ottoman-Mamluk war over Syria; the frontier meets after Bayezid takes Malatya and Elbistan."},
    "conquest_of_kazan": {"earliest": 1438, "why": "Kazan is a sleeping realm until it is founded (kazan_khanate_founded)."},
    "kazakh_khanate_founded": {"earliest": 1428, "why": "Needs Abu'l-Khayr's Uzbek khanate (abul_khayr_uzbeks)."},
    "shaybanid_conquest_of_transoxiana": {"earliest": 1428, "why": "Needs the Uzbek khanate on the Timurid border."},
}

places = {
    "province:sofia": ["p1421"],
    "province:tarnovo": ["p1434"],
    "province:thessaloniki": ["p1645", "p1648"],
    "province:sarai": ["p1199"],
    "province:isfahan": ["p2280"],
    "province:baghdad": ["p2262"],
    "province:damascus": ["p2245"],
    "province:crimea": ["p1445"],
    "province:chimgi_tura": ["p681"],
    "area:herat": ["p1989", "p2297"],
    "area:tabriz": ["p1962", "p1965"],
    "area:samogitia": ["p590", "p594"],
    "area:galich": ["p436"],
    "area:harar": ["p3264", "p3265"],
}

entities = {
    "white_horde": "White Horde", "arab_shah_horde": "Arab Shah's Horde", "kartids": "Kartids of Herat",
    "muzaffarids": "Muzaffarids", "jalayirids": "Jalayirids", "qara_qoyunlu": "Qara Qoyunlu",
    "bulgaria_tarnovo": "Bulgaria of Tarnovo", "bulgaria_vidin": "Bulgaria of Vidin", "serbia": "Serbia",
    "germiyan": "Germiyan", "aydin": "Aydın", "mentese": "Menteşe", "saruhan": "Saruhan", "hamid": "Hamid",
    "teke": "Teke", "candar": "Candar", "karaman": "Karaman", "kazan": "Khanate of Kazan", "crimea": "Khanate of Crimea",
    "uzbek_khanate": "Uzbek Khanate", "galich_shemyaka": "Galich", "ifat": "Sultanate of Ifat", "adal": "Adal Sultanate",
    "ethiopia": "Ethiopia", "cyprus": "Cyprus", "teutonic_order": "Teutonic Order", "livonian_order": "Livonian Order",
    "riga": "Archbishopric of Riga", "dorpat": "Bishopric of Dorpat", "osel_wiek": "Bishopric of Ösel-Wiek",
    "volga_bulgaria": "Volga Bulgaria", "knights_of_rhodes": "Knights of Rhodes", "wallachia": "Wallachia",
}

campaign = json.loads((OUT.parent / "events-campaign.json").read_text())["events"]
for cid, r in redate.items():
    e = json.loads(json.dumps(campaign[cid]))
    assert e["availability"]["earliest"] == 1444, cid
    e["availability"]["earliest"] = r["earliest"]
    e["ages"] = [AGE, *e["ages"]] if r["earliest"] < 1460 and AGE not in e["ages"] else e["ages"]
    assert cid not in events, cid
    events[cid] = e

out = {
    "$comment": "Bridge events of 1378 to 1444 for the east: North and East, the Ottomans and the Balkans, the steppe and Iran, the Mamluks and the Horn of Africa (plan-1378 §5; milestone 10 step 6; EVT-090 to EVT-094, D-EVT-21). Generated by tools/domain-data/build_bridge_east.py; edit that script, not this file. History is a reference: every event is conditional, most are approximate, none is forced by its date. Realms are tree ids (events-places.json aliases), places are 1444 province ids. `redated` lists the campaign events copied here with an earlier `earliest` (they waited only for 1444); a bridge event replaces the campaign event of the same id.",
    "events": events,
    "redated": {k: {"earliest": v["earliest"], "was": 1444, "why": v["why"]} for k, v in redate.items()},
    "places": places,
    "localization": loc,
    "entities": entities,
}
OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n")
print(f"{len(events) - len(redate)} events, {len(redate)} re-dated -> {OUT}")
