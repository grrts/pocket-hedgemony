# 1378 start: South, East and Southeast Asia

The world of 20 September 1378 (X-25) for the catalogue regions `as_south_asia_north`, `as_south_asia_south`,
`as_se_asia_mainland`, `as_se_asia_maritime`, `as_china_inner_asia` and `as_japan_korea`, built from
`start-date/research/asia.md` and `research/decisions.md` (milestone 10, plan step 5). Each region of the 1378
scenario lives in its own folder under `regions/`; a later merge step concatenates them into the scenario's files
and generates its `world/`. The game still starts in 1444 until the switch-over (plan step 7).

| File | Same shape as | What it holds |
|---|---|---|
| `map-nations.json` | `1444/map-nations.json` | 42 map nations, with the checkpoint's capitals (`checkpoints/1378.json`) |
| `map-owners.json` | `1444/map-owners.json` | Owner rules for these regions' modern countries only; first match wins inside the fragment |
| `rulers.json` | `1444/rulers.json` | Each map nation's ruler on the start day |
| `culture-start.json` | `1444/culture-start.json` | Court tongue, people's tongues and, where it differs from the record, faith; 7 new tongues |
| `relations.json` | `1444/relations.json` | 119 relations and 14 facts of the start day, keyed by catalogue ids |
| `subjects.json` | `1444/subjects.json` | Subjects and stances derived from `relations.json` |
| `subjects-rulers.json` | `1444/subjects-rulers.json` | The ruler of every catalogue record in these regions that exists on the start day, and of the 11 new records |
| `sleeping-realms.json` | `1444/world/sleeping-realms.json` | Sleeping realms, with the capital as [lon, lat] and the home as owner-rule selectors, because province ids change when the 1378 world is generated |

## What changes from 1444

- **Not yet born, so sleeping:** `oirat` (1388), `jaunpur` (1394), `malwa` (c.1401), `gujarat` (c.1407), `multan`
  (1438) and `malacca` (c.1400). Their land goes to the Northern Yuan (`mongols`), Delhi and, for Malacca's coast,
  nobody.
- **New map nations:** `yunnan_yuan`, `dali_duan`, `naghachu`, `japan_southern_court`, `sukhothai` (Ayutthaya's
  vassal), `mrauk_u` (Arakan at Launggyet, Ava's tributary), `martaban`, `myaungmya`, `sunda`, `samudra_pasai`,
  `singapura`, `nepal_malla`, `rachakonda`, `kondavidu_reddi`, `kotte` (the Kingdom of Gampola) and `jaffna`.
- **Other form, same id** (the research's one-id convention): `korea` is Goryeo at Gaegyeong, `mongols` the
  Northern Yuan, `japan` the Ashikaga shogunate of the Northern Court, `orissa` Eastern Ganga Odisha, `kotte`
  Gampola, `mrauk_u` Launggyet Arakan. Ming rules from Nanjing; Delhi is Firuz Shah's Tughlaq sultanate, holding
  the Punjab, the Doab, Awadh, Bihar, Gujarat and Malwa; the Bahmanis rule from Gulbarga and the Velamas of
  Rachakonda hold Telangana; Majapahit also holds Palembang; Khmer holds Angkor and the lower Khorat plateau.
- **Wars on the start day:** Champa–Đại Việt, Ming–Northern Yuan, Ming–Naghachu, the two courts of Japan,
  Imagawa–Kikuchi, Hosokawa–Kōno and Pegu–Martaban.

## For the merge step

- Order: these owner rules touch only CHN, HKG, MAC, MNG, KOR, PRK, JPN, IND, PAK, KAS, NPL, BGD, LKA, VNM, KHM,
  LAO, THA, MMR, MYS, SGP, BRN and IDN. Xinjiang west of 86°E is left to the steppe region's Moghulistan rule;
  Afghanistan and the rest of Pakistan (Baluchistan, K.P.) are not in this fragment.
- `relations.json` names two realms of other regions (`hormuz`, `mamluk`) for cross-region pairs; drop a pair
  the other region also records.
- A trial build of the world with these rules in place of 1444's Asian rules ran clean (no capital in the sea or
  in another realm), giving Ming 204 provinces, Delhi 66 and the Northern Yuan 62.
- `subjects.json` and `subjects-rulers.json` leave out the catalogue-wide `religious_heads` and
  `playable_subjects`.
- Ports (`ports.json`) need the generated world's provinces, so they come with the merge.
