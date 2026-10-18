"""Writes packages/rules/data/domain/events-campaign.json from the event tree's bundle.

The campaign's events (EVT-002: none whose history starts after the end date,
no tutorial-only events), every age, period and modifier, and the English names
the event card shows (event name, history summary, option names, entity names). Fields only
the reference layer reads (sources, notes, prerequisite lists) are left out.

    python3 tools/domain-data/extract_event_tree.py /mnt/project-files/event-tree/generated
"""
import json
import sys
from pathlib import Path

END_DATE = "1939-08-31"
EVENT_KEYS = [
    "id", "name", "ages", "periods", "regions", "importance", "depiction", "music", "tutorial_only", "roles",
    "availability", "requires", "optional", "trigger", "invalidated_if", "selection", "execution",
    "exclusive_with", "options", "effects", "follow_ups",
]
AGE_KEYS = ["id", "name", "window", "start", "end", "force_start", "force_end", "regions"]
MODIFIER_KEYS = ["id", "scope", "changes", "years", "decay", "stacking"]
PERIOD_KEYS = ["id", "name", "kind", "ages", "regions", "window", "start", "end", "parent"]


def history_start(date) -> str:
    first = date[0] if isinstance(date, list) else date
    s = str(first)
    return f"{s}-01-01" if len(s) == 4 else s


def strip_notes(x):
    """Drops `note` keys: comments the data writes beside a condition, never part of it."""
    if isinstance(x, list):
        return [strip_notes(i) for i in x if not (isinstance(i, dict) and set(i) == {"note"})]
    if isinstance(x, dict):
        return {k: strip_notes(v) for k, v in x.items() if k != "note"}
    return x


def pick(d: dict, keys: list[str]) -> dict:
    return {k: d[k] for k in keys if k in d and d[k] is not None}


def main(src: Path, out: Path) -> None:
    bundle = json.loads((src / "bundle.json").read_text())
    loc = json.loads((src / "runtime" / "localization.en.json").read_text())
    events = {}
    for e in bundle["events"]:
        if e.get("tutorial_only"):
            continue
        h = e.get("history") or {}
        if h.get("date") is not None and history_start(h["date"]) > END_DATE:
            continue
        ev = strip_notes(pick(e, EVENT_KEYS))
        if h.get("date") is not None:
            ev["history"] = {"date": h["date"]}
        events[e["id"]] = ev
    names = {}
    for eid, e in events.items():
        for k in (f"event.{eid}.name", f"event.{eid}.desc"):
            if k in loc:
                names[k] = loc[k]
        for o in e["options"]:
            k = f"event.{eid}.option.{o['id']}"
            if k in loc:
                names[k] = loc[k]
    data = {
        "ages": [pick(a, AGE_KEYS) for a in bundle["ages"]],
        "periods": [pick(p, PERIOD_KEYS) for p in bundle["periods"]],
        "events": events,
        "modifiers": [pick(m, MODIFIER_KEYS) for m in bundle["modifiers"]],
        "localization": names,
        "entities": {x["id"]: x["name"] for x in bundle["entities"]},
    }
    out.write_text(json.dumps(data, separators=(",", ":"), ensure_ascii=False) + "\n")
    print(f"{len(events)} events, {len(data['ages'])} ages, {len(data['periods'])} periods, {len(data['modifiers'])} modifiers -> {out}")


if __name__ == "__main__":
    root = Path(__file__).resolve().parents[2]
    main(Path(sys.argv[1]), root / "packages/rules/data/domain/events-campaign.json")
