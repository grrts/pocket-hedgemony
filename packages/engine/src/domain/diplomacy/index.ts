/**
 * Diplomacy (DIPL): the relation model, envoys, the ledger and standing, the
 * reasons count, the diplomatic actions, war aims, truces, leagues and the AI.
 * Pure and deterministic; numbers come from rules/data/domain/diplomacy.json.
 */
export * from "./dates.ts";
export { config, dataset1444, type DiplomacyConfig } from "./rules.ts";
export * as relations from "./relations.ts";
export { RuleError, type RelationGraph, type RelationRecord, type FactRecord, type Report } from "./relations.ts";
export * from "./model.ts";
export * from "./reasons.ts";
export * from "./actions.ts";
export * from "./ai.ts";
