*Copied from the project files (`start-date/checkpoints/`, 19 Oct 2026) for the history check (`packages/sim/src/history.ts`, BAL-031); this copy is now the one the game reads. `packages/rules/data/domain/chronicle.json` lists their turning points for the Chronicle and must agree with them (`packages/sim/test/history.test.ts`).*

# History checkpoints

These are snapshots of the real world on fixed dates. A headless run from the 1378 start is compared with them to
measure how far a campaign has moved from history (`../plan-1378.md` §2). They are reference data only, and the game never
pulls a realm back toward them.

| File | Date | Why this date |
|---|---|---|
| `1378.json` | 20 Sep 1378 | The start: the Western Schism begins |
| `1405.json` | 18 Feb 1405 | Timur dies; Ankara and the sack of Delhi are behind |
| `1420.json` | 21 May 1420 | Treaty of Troyes; Constance over, Hussites risen, Ming moving to Beijing |
| `1444.json` | 11 Nov 1444 | The main reference: the day after Varna, the date of today's map and catalogue |
| `1500.json` | 1 Jan 1500 | Era II begins: after Granada, Columbus and da Gama |
| `1600.json` | 1 Jan 1600 | Era III begins: the Habsburg and Ottoman peak, the Mughals, Japan near unification |
| `1715.json` | 1 Jan 1715 | After Utrecht and Rastatt: the European balance, Qing and the late Mughals |
| `1815.json` | 9 Jun 1815 | The Final Act of Vienna: after Napoleon, the Americas breaking free |
| `1914.json` | 28 Jun 1914 | Sarajevo: the empires on the eve of the war |

`key-places.json` lists 146 places, each a point with longitude and latitude. Every checkpoint names their
holders, and the check maps each point to the map province that contains it.

## File format

```json
{
  "date": "1405-02-18",
  "label": "Death of Timur",
  "why": "One sentence on why this date is a checkpoint.",
  "realms": [
    {
      "id": "ottomans",
      "name": "Ottoman Sultanate",
      "rank": "great_power | major | minor",
      "capital": {"name": "Edirne", "at": [26.56, 41.68]},
      "overlord": null,
      "ruler": "Süleyman Çelebi (in Rumelia; Interregnum)",
      "catalogue_id": "ottoman",
      "note": "Optional short note on its state at this date."
    }
  ],
  "great_powers": ["ming", "timurids", "ottomans"],
  "key_places": {"constantinople": {"holder": "byzantium", "confidence": "high", "note": "optional"}},
  "since_previous": {
    "formed": ["ids of realms that appeared since the previous checkpoint"],
    "ended": ["ids of realms gone since the previous checkpoint"],
    "first_listed": ["ids of realms that already existed at the previous checkpoint but were not listed there"],
    "events": [{"key": "battle_of_ankara", "name": "Battle of Ankara", "date": "1402-07-20", "event_tree_id": null}]
  },
  "tolerance": {"key_places_match_share": 0.8},
  "sources": ["Short citations of the general works relied on"],
  "open_questions": ["Anything uncertain or disputed"]
}
```

Rules:
- **Realm ids.** Use the map nation id where one exists (`tools/mapgen/nations-1444.json` in the repository,
  for example `ottomans`, `mamluks`, `timurids`). Otherwise use the catalogue id (`country-catalogue/build/catalogue.json`).
  Otherwise use a new lowercase snake_case English id. A continuing state keeps one id in every checkpoint
  (`ids.json` lists the ids, their years and merged aliases). A realm listed at one checkpoint stays listed
  until it ends, and `python3 check_ids.py` must print nothing.
- **Realms listed.** List every realm that holds a key place, every great or major power, and the realms
  named in the plan for that era. A checkpoint lists roughly 60 to 150 realms. It is not the full catalogue.
- **Key places.** Give a holder for every place in `key-places.json`. When nobody holds it as a state, the holder
  is `null` with a note (for example "Guanche chiefdoms, no state"). A holder is whoever governs the place.
  When a place is a vassal's, name the vassal and give its overlord in its realm entry.
- **Tolerance.** This is the share of key places that must match in a run (provisional): 1405 0.8,
  1420 0.75, 1444 0.7, 1500 0.6, 1600 0.5, 1715 0.4, 1815 0.35, 1914 0.3. The start (1378) has no tolerance,
  because it is the start itself.
- **History only.** No game statistics and no invented numbers. Uncertain holders get `confidence: "low"` and a
  note. Nothing is copied from commercial games.
