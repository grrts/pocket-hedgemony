#!/usr/bin/env python3
"""Extracts the compact data the scenario-setup and exploration contexts read.

Reads the research files in /mnt/project-files (the country catalogue build, the
map's 1444 nation list, the naval 1444 ports, the event tree's geography) and
writes small JSON files to packages/rules/data/domain/:

  scenario-setup-catalogue.json  one short row per catalogue record, the
                                 inventory's not-included entities, build totals
  scenario-setup-map.json        the map's 1444 nation sources, palette,
                                 settlement regions and the 1444 port list
  exploration-regions.json       the event tree's region tree, the ages' region
                                 lists and the 1444 polities' regions

Run: python3 -I tools/domain-data/extract_scenario_setup.py [project-files-dir]
"""
import json
import pathlib
import sys

import yaml

SRC = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "/mnt/project-files")
ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / "packages/rules/data/domain"

DIMENSIONS = [
    "economic_strength", "manpower_potential", "military_capability", "naval_capability",
    "diplomatic_influence", "trade_access", "political_stability", "administrative_capacity",
    "fiscal_resilience", "institutional_development", "territorial_cohesion", "long_term_potential",
    "unrest_risk", "external_threat_exposure",
]
LEVEL_CODE = {"very_low": "1", "low": "2", "moderate": "3", "high": "4", "very_high": "5", "unknown": "0"}
CONF_CODE = {"low": "l", "medium": "m", "high": "h"}


def write(name, data, comment):
    path = OUT / name
    text = json.dumps({"$comment": comment, **data}, ensure_ascii=False, separators=(",", ":"))
    path.write_text(text + "\n", encoding="utf-8")
    print(f"{path.relative_to(ROOT)}: {len(text) // 1024} KB")


def numeric_paths(o, p, out):
    if isinstance(o, bool):
        return
    if isinstance(o, (int, float)):
        out.add(p)
    elif isinstance(o, dict):
        for k, v in o.items():
            numeric_paths(v, f"{p}.{k}" if p else k, out)
    elif isinstance(o, list):
        for v in o:
            numeric_paths(v, p + "[]", out)


def catalogue():
    build = SRC / "country-catalogue/build"
    cat = json.loads((build / "catalogue.json").read_text())
    stats = json.loads((build / "stats.json").read_text())
    faiths = json.loads((SRC / "religion/build/catalogue-faiths.json").read_text())
    records = {}
    numeric = set()
    eu4_tags = []
    unchecked = []
    personality_keys = {}
    for rid, r in cat["records"].items():
        numeric_paths(r, "", numeric)
        sa = r["gameplay"]["starting_assessment"]
        levels = "".join(LEVEL_CODE[sa[d]["level"]] for d in DIMENSIONS)
        confs = "".join(CONF_CODE.get(sa[d].get("confidence"), "-") for d in DIMENSIONS)
        justified = all(bool(sa[d].get("justification")) for d in DIMENSIONS)
        ap = r["gameplay"]["ai_personality"]
        personality_keys[rid] = sorted(ap.keys())
        f = faiths.get(rid, {})
        if r["meta"].get("eu4_tag") is not None:
            eu4_tags.append(rid)
        if not r["existence"].get("status_1444_check"):
            unchecked.append(rid)
        records[rid] = "|".join([
            r["names"]["common_en"],
            r["meta"]["region"],
            r["meta"]["detail_tier"],
            r["gameplay"]["representation"]["mode"],
            r["confidence"]["overall"],
            levels + confs + ("j" if justified else "-"),
            ",".join(ap.get("expansion", {}).get("modes", [])),
            f.get("state_faith") or "",
            f.get("people_majority") or "",
        ])
    group_notes = {
        rid: " ".join([
            cat["records"][rid]["names"].get("naming_notes", ""),
            cat["records"][rid]["classification"].get("sovereignty_notes", ""),
            cat["records"][rid]["gameplay"]["representation"].get("rationale", ""),
        ])
        for rid in ("silesia", "tusi_group")
    }
    inventory = []
    for f in sorted((SRC / "country-catalogue/inventory").glob("*.json")):
        for e in json.loads(f.read_text())["entities"]:
            if e["inclusion"] == "included":
                continue
            inventory.append([e["id"], e["common_en"], e["inclusion"], 1 if e.get("inclusion_note") else 0, e.get("aliases") or []])
    keys = sorted({k for ks in personality_keys.values() for k in ks})
    write(
        "scenario-setup-catalogue.json",
        {
            "columns": "name|region|tier|representation|confidence|assessments|expansion_modes|state_faith|people_majority; "
                       "assessments = one level digit per dimension, one confidence letter per dimension, then j when "
                       "every dimension has a justification",
            "dimensions": DIMENSIONS,
            "level_codes": {v: k for k, v in LEVEL_CODE.items()},
            "confidence_codes": {v: k for k, v in CONF_CODE.items()},
            "totals": stats["totals"],
            "eu4_tags_set": eu4_tags,
            "records_without_1444_check": unchecked,
            "numeric_paths": sorted(numeric),
            "personality_keys": keys,
            "group_notes": group_notes,
            "records": records,
            "not_included": inventory,
        },
        "Generated by tools/domain-data/extract_scenario_setup.py from country-catalogue/build (catalogue.json, "
        "stats.json), country-catalogue/inventory and religion/build/catalogue-faiths.json. Do not edit by hand.",
    )


def map_setup():
    mapgen = ROOT / "tools/mapgen"
    nations = json.loads((ROOT / "packages/rules/data/scenarios/1444/map-nations.json").read_text())
    config = json.loads((mapgen / "config.json").read_text())
    ports = json.loads((SRC / "naval/data/ports-1444.json").read_text())
    write(
        "scenario-setup-map.json",
        {
            "nations": nations,
            "palette": config["palette"],
            "settlement": config["settlement"],
            "defaultDensity": config["defaultDensity"],
            "defaultWealth": config["defaultWealth"],
            "pxPerDeg": config["pxPerDeg"],
            "ports": [[p["name"], p["tier"], p.get("province"), p.get("holder"), 1 if p.get("shipyard") else 0] for p in ports["ports"]],
        },
        "Generated by tools/domain-data/extract_scenario_setup.py from packages/rules/data/scenarios/1444/map-nations.json, "
        "tools/mapgen/config.json and naval/data/ports-1444.json. Do not edit by hand.",
    )


def regions():
    geo = yaml.safe_load((SRC / "event-tree/data/geography.yaml").read_text())
    ages = yaml.safe_load((SRC / "event-tree/data/ages.yaml").read_text())
    ents = yaml.safe_load((SRC / "event-tree/data/entities.yaml").read_text())["entities"]
    parents = {r["id"]: r["parent"] for r in geo["regions"]}
    macro = [r["id"] for r in geo["regions"] if r.get("macro")]
    polities = {}
    for e in ents:
        if e["kind"] != "polity" or "region" not in e:
            continue
        if any(a <= 1444 and (b is None or b >= 1444) for a, b in e.get("exists", [])):
            polities[e["id"]] = e["region"]
    age_list = ages["ages"] if isinstance(ages, dict) else ages
    write(
        "exploration-regions.json",
        {
            "macro_regions": macro,
            "parents": parents,
            "ages": {a["id"]: {"regions": a.get("regions", []), "earliest_start": a.get("window", {}).get("earliest_start"), "force_start": a.get("force_start"), "force_end": a.get("force_end")} for a in age_list},
            "polities_1444": polities,
        },
        "Generated by tools/domain-data/extract_scenario_setup.py from event-tree/data/geography.yaml, ages.yaml "
        "and entities.yaml. Do not edit by hand.",
    )


if __name__ == "__main__":
    catalogue()
    map_setup()
    regions()
