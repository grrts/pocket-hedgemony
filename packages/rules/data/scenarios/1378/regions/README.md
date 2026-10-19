# The 1378 scenario, by region

Each folder here is one region's part of the 1378 start (X-25, milestone 10 step 5): `europe-west`, `east`, `asia` and `africa-americas`. A region writes only its own folder, so the four can be built side by side.

Every file is optional and has the shape of its 1444 counterpart in `scenarios/1444/`:

| File | Shape |
|---|---|
| `map-nations.json` | array of `{ id, name, capital: [lon, lat], color?, commanders?, army? }` |
| `map-owners.json` | array of owner rules `{ nation, countries, regions?, bbox? }`, scoped by ISO country so the regions' order does not matter |
| `rulers.json` | `{ rulers: { <nation>: { title, name, since, age, heir? } \| null } }` |
| `culture-start.json` | `{ tongues: { <new tongue>: { name, family, way_of_life } }, realms: { <nation>: { court, mix, local, faith? } } }`; tongues already in the 1444 file need not be repeated |
| `relations.json` | `{ relations: [...], facts: [...], entities?: [{ id, name }] }` in the 1444 shape; `entities` names 1378 realms that are neither on the map nor in the catalogue |
| `subjects.json` | `{ subjects: [[subject, overlord, kind, autonomy, start]], stances: [[a, b, stance]] }` |
| `sleeping-realms.json` | `{ realms: [{ id, name, color?, capital, home, tree? }] }`: realms not yet born on the start day; places are 1444 province ids or `[lon, lat]` |
| `README.md` | what the region covers, its sources and its confidence |

`packages/rules/test/scenario-1378.test.ts` reads every folder here and checks them together: ids unique across regions, every owner rule, ruler and tongue tied to a known realm, and relations and subjects naming known realms (map nations, sleeping realms, catalogue records or declared entities).
