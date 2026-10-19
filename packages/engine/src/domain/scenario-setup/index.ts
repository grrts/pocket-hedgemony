/**
 * Scenario setup (SETUP): the 1444 start. The country catalogue as the source
 * of entities, start forms of government, country and province starting
 * values, the 1444 map setup of today's build, and playable realms and
 * campaign rules. Config: packages/rules/data/domain/scenario-setup.json, with
 * generated rows in scenario-setup-catalogue.json and scenario-setup-map.json
 * (tools/domain-data/extract_scenario_setup.py).
 */
export * from "./catalogue.ts";
export * from "./map.ts";
export * from "./start.ts";
export * from "./campaign.ts";
export * from "./picker.ts";
