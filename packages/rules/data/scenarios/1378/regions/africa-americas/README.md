# 1378 start: Africa and the Americas

The world on 20 September 1378 for the catalogue regions af_north_sahara, af_west, af_northeast_east, af_central_south, am_mesoamerica_caribbean, am_north and am_south (milestone 10, step 5). The files have the 1444 scenario's names and formats and hold only these regions; the merge step joins the region fragments into the 1378 scenario. Nothing here is read by the game yet, so the 1444 start is unchanged.

Built by `python3 tools/domain-data/start-1378-africa-americas.py /mnt/project-files` from the 1444 files. The script's tables hold every change and its reason, from `start-date/research/africa-americas.md` and the calls in `research/decisions.md`. Edit the script and re-run it rather than editing these files.

## What changes from 1444

- **Maghreb.** Two Marinid sultans: Fez (`morocco`) and the new `marinid_marrakesh`. Tlemcen is sovereign and holds Algiers (low confidence). Tunis is smaller, and Tripoli has its local lords.
- **West Africa.** Mali is at its 14th-century extent (Timbuktu, Walata, Gao), with its capital at Niani. Songhai is Mali's tributary downstream of Gao. Kanem's capital is Njimi, at war with the Bulala.
- **The Horn and the coast.** The new `ifat` takes the 1444 Adal land and the escarpment east of Shewa, at war with Ethiopia. `mogadishu` and `great_zimbabwe` become map nations (decision 3). Mogadishu takes the city from `ajuran`, which keeps the southern Somali interior from the middle Shabelle (low confidence).
- **Mesoamerica.** The new `tepanecs` hold the Basin of Mexico. The Mexica (`aztecs`) hold only Tenochtitlan as their tributary. The new `huexotzinco` leads the Puebla valley. Pátzcuaro is the Purépecha seat, and Mayapan is the League's.
- **Andes.** Cusco is one lordship of its basin. The new `chanka` hold Andahuaylas and Ayacucho, and Chimor holds Lambayeque (decision 7). The Muisca seat is Bacatá (decision 4).
- **Asleep until they form** (`sleeping-realms.json`, 27 realms): Adal, Kongo, Mutapa (its capital moved north to Zvongombe), Torwa, Kaffa, Aïr, the Niger-bend Tuareg, Masina, the Canarian lordship, Bougie, Debdou, the Hintata, Loango, the four Great Lakes kingdoms after Kitara, Mandara, Coosa, Cherokee and Creek (decision 6), and the six Yucatec kuchkabalob (Maní, Sotuta, Cupul, Ecab, Chetumal and Ah Canul), which wake when Mayapan falls c.1441 (decision 2). The map has five provinces on the peninsula, so some kuchkabalob share one until the map is finer. Mississippian chiefdoms grow into the Cherokee and Creek land.

## Fields the merge step resolves

Province ids change whenever any region's borders change, so this fragment gives places by coordinates:
- `sleeping-realms.json` gives `capital` as (lon, lat) and `home` as owner-rule selectors, where 1444 has province ids. It also adds `forms_about` and `why`.
- `relations.json` declares in `entities` the 1378 realms that are neither map nations nor catalogue records (Xaltocan, the Aïr Tuareg and others).
- `ports.json` towns carry `lat` and `lon` from `naval/data/ports-1444.json`, and `province_1444` only as a hint.
- `map-nations.json` entries may carry a `note` (display text, ignored by mapgen).
- `map-to-catalogue.json` lists the map ids whose 1378 catalogue record has another id.

The owner rules cover only these regions' countries. Other regions' rules must not hand out this land, for example the 1444 Portuguese Ceuta rule.

## Map check

A test build with tools/mapgen (the 1444 rules elsewhere, this fragment here) gives every capital its own province. 28 of the 32 key places in these regions match `checkpoints/1378.json`. The four that don't are the Cape, Boston and Quebec (held by peoples that the checkpoint counts as no state, as in 1444) and Quito (Quitu-Cara has no map nation). Two map points are moved a province over, because the map is too coarse for two seats so close together: Azcapotzalco moves into the México province, which leaves the federal district to Tenochtitlan, and Ifat's seat moves east of the escarpment. Songhai's Kukiya lies in Mali's Gao province, so Songhai's map point is in Tillabéri.
