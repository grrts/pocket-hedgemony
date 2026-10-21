# The 1378 scenario, by region

Each folder here is one region's part of the 1378 start (X-25, milestone 10 step 5): `europe-west`, `east`, `asia`, `africa-americas` and `arabia` (a stand-in from the 1444 data). A region writes only its own folder, so the four can be built side by side.

Every file is optional and has the shape of its 1444 counterpart in `scenarios/1444/`:

| File | Shape |
|---|---|
| `map-nations.json` | array of `{ id, name, capital: [lon, lat], color?, commanders?, army? }` |
| `map-owners.json` | array of owner rules `{ nation, countries, admin1?, regions?, bbox? }` (first match wins; `nation: null` leaves land unowned). The regions are joined in the order `scenario.json` lists them, so a rule in a country another region holds must be narrowed by `admin1` or `bbox`, and only the region that holds a country writes a catch-all rule for it |
| `rulers.json` | `{ rulers: { <nation>: { title, name, since, age, heir? } \| null } }` |
| `culture-start.json` | `{ tongues: { <new tongue>: { name, family, way_of_life } }, realms: { <nation>: { court, mix, local, faith? } } }`; tongues already in the 1444 file need not be repeated |
| `relations.json` | `{ relations: [...], facts: [...], entities?: [{ id, name }] }` in the 1444 shape; `entities` names 1378 realms that are neither on the map nor in the catalogue |
| `subjects.json` | `{ subjects: [[subject, overlord, kind, autonomy, start]], stances: [[a, b, stance]] }` |
| `goals.json` | `{ goals: [{ realm, goal, reason, ends_when, window: [from, to \| null], weight, deviation, aim, alternative?, toward? }] }`: each realm's historical goals with the aim the AI weighs (EVT-100, `GoalDef` in `packages/rules/src/types.ts`); checked by `packages/rules/test/goals-1378.test.ts`. When the regions are joined, the scenario's `goals.json` is every region's goals in this order, and `startGoals` (`packages/rules/src/start.ts`) reads it |
| `sleeping-realms.json` | `{ realms: [{ id, name, color?, capital, home, tree? }] }`: realms not yet born on the start day; places are 1444 province ids or `[lon, lat]`; `home` entries may also be owner-rule selectors `{ countries, admin1?, regions?, bbox? }`, which survive a new map |
| `README.md` | what the region covers, its sources and its confidence |

`packages/rules/test/scenario-1378.test.ts` reads every folder here and checks them together: ids unique across regions, every owner rule, ruler and tongue tied to a known realm, and relations and subjects naming known realms (map nations, sleeping realms, catalogue records or declared entities).

## Which region holds which country

Only the holder writes a catch-all owner rule for a country; others narrow theirs by `admin1` or `bbox`.

| Region | Countries (ISO3) |
|---|---|
| `east` | ALB, ARM, AZE, BGR, BIH, BLR, CYN, CYP, ESB, EST, GEO, GRC, HRV, HUN, IRN, IRQ, KAZ, KGZ, KOS, LTU, LVA, MDA, MKD, MNE, POL, ROU, RUS, SRB, SVK, TJK, TKM, TUR, UKR, UZB, WSB, AFG, and the Mamluk lands EGY, ISR, JOR, LBN, PSX, SYR |
| `arabia` | SAU, YEM, OMN, and eastern LBY for the Mamluks (a stand-in from the 1444 data; see its README) |
| `europe-west`, `asia`, `africa-americas` | every other country, by the region their 1444 realms belong to |
