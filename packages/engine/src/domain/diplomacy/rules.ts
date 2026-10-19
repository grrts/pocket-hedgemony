import raw from "../../../../rules/data/domain/diplomacy.json" with { type: "json" };
import { startRelations as dataset } from "../../../../rules/src/start.ts";

/** A relation type as the relations rules describe it. */
export interface TypeRule {
  label: string;
  layer: "hierarchy" | "state" | "stance";
  direction: "mutual" | "directed" | "mutual_or_one_way";
  stored: boolean;
  derived_from?: string;
  duration?: {
    kind?: string;
    default_months?: number | null;
    decay_months?: number;
    decays_to?: string;
    min_months_before_change?: number;
    war_exhaustion_peace_months?: number;
    historical_term_overrides_default?: boolean;
  };
}

export interface ActionRule {
  requires?: { no_relation?: string[]; not_subject_of_target?: boolean; not_subject_pair?: boolean; stance_not?: string[]; relation?: string; contested_object?: boolean };
  ends?: string[];
  creates?: string;
  sets_stance?: string;
  sets_stance_if_missing?: string;
  steps?: string[];
}

export interface SubjectKindRule {
  label: string;
  can_conduct_own_diplomacy: boolean;
  joins_overlord_wars: "defensive" | "never" | "always";
}

export interface EntryRule {
  name: string;
  weight?: number;
  max?: number;
  fade_years?: number;
  lasts?: string;
  weight_per_gold?: number;
  weight_per_season?: number;
  fade_years_after?: number;
  weight_per_province?: number;
  weight_per_notoriety?: number;
  weight_range?: [number, number];
  names?: Record<string, string>;
}

/** The diplomacy config: relation rules plus diplomacy rules (all placeholders). */
export interface DiplomacyConfig {
  relations: {
    layers: Record<string, { types: string[] }>;
    default_stance: string;
    implied_stance: Record<string, string>;
    types: Record<string, TypeRule>;
    subject_kinds: Record<string, SubjectKindRule>;
    autonomy_levels: string[];
    compatibility: { rules: { a: string; b: string; result: string; note?: string }[] };
    precedence: { order: string[] };
    actions: Record<string, ActionRule>;
    fact_types: Record<string, unknown>;
    proposed_fact_types: Record<string, unknown>;
    confidence_levels: Record<string, string>;
    origin_values: Record<string, string>;
    modifiers: { hostile: { border_raid_chance_per_month: number }; at_war: { trade_access: number } };
    reference_date: string;
  };
  envoys: {
    seats: { base: number; extra_if_provinces_over: { provinces: number; seats: number }; inventions: Record<string, number> };
    lord_loyalty_step_lost_if_mission_months_over: number;
    days_per_crossing_unit: number;
    months_at_court: number;
    instant_if_both_know: string;
    instant_excludes: string[];
    official_type_bonus: Record<string, { actions: string[]; reason?: number; only_if?: string; gift_multiplier?: number }>;
    years_served_bonus: { at_years: number; reason: number };
    resident_years_bonus: { at_years: number; reason: number };
    resident: { requires_invention: string; war_warning_months: number };
    passage_denied_blocks_months: number;
    held: { refused_demand_by_hostile_chance: number };
  };
  ledger: {
    max_entries_per_pair: number;
    stance_lines: Record<string, number>;
    ties: Record<string, EntryRule>;
    wrongs: Record<string, EntryRule>;
    standing_words: { min: number; word: string }[];
    merged_entry_name: string;
    standing_limit: number;
    resident_envoy_season_months: number;
  };
  reasons: {
    standing_divisor: number;
    per_oath_broken: number;
    relies_on_word: string[];
    strength: {
      allies_counted_at: number;
      binding_asks: string[];
      you_are_stronger_per_multiple: number;
      you_are_stronger_max: number;
      we_are_stronger_per_multiple: number;
      we_are_stronger_max: number;
      cannot_beat_you_per_multiple_beyond_1: number;
      cannot_beat_you_max: number;
      strong_friends_factor: number;
      already_at_war_new_commitment: number;
    };
    distance: { no_shared_border_or_neighbour: number; envoy_days_over: { days: number; reason: number } };
    share_an_enemy: number;
    frontier_threat_per_province: number;
    allies_beyond_free: { free: number; per_extra: number };
    ruler_traits: { pious_same_faith: number; warlike_vs_swear_peace: number; greedy_with_gift: number };
  };
  actions: {
    propose_alliance: { base: number };
    call_to_arms: {
      defensive: { base: number };
      offensive: { base: number };
      aim_is_our_concern: number;
      enemy_stronger_per_multiple: number;
      enemy_stronger_max: number;
      separate_peace_when_peace_voices_over: number;
    };
    arrange_marriage: { base: number; their_house_greater: number; per_existing_marriage: number; claim_chance_per_heirless_death: number };
    demand: { base: number; heartland_province: number; kinds: Record<string, { grants_aim: string }>; on_refusal: { aim_years: number; our_offensive_call_bonus: number; lords_not_warlike_waver: boolean } };
    ask_passage: { base: number; months: number; marching_on_our_friend: number; marching_on_our_enemy: number; requires_invention: string };
    trade_pact: { base: number };
    swear_peace: { base: number; truce_months: number; we_fear_you_per_multiple: number; we_want_your_land: number };
    offer_overlordship: { base: number; need_protector_per_threat: number; already_pledged: number; proud_per_castle_beyond_2: number };
    ask_protection: { base: number };
    court_lord: { requires_lord_loyalty: string[]; loyalty_steps_per_season: number; defect_after_months: number; defect_needs_border: boolean; discovery_chance_per_season: number };
    make_resident: { requires_invention: string };
    fund_rebels: {
      gold_share_of_target_yearly_income: number;
      needs_revolution_signs: number;
      caught_chance_per_month: number;
      on_caught: { aim_years: number };
      flag: string;
    };
  };
  war_aims: { held_province_years: number; refused_demand_years: number; punish_years: number; tribute_by_strength_multiple: number; regency_allows: string[] };
  truce: { base_months: number; extra_months_if_land_or_subject: number; white_peace_months: number };
  leagues: {
    threshold_by_era: Record<string, number>;
    base: number;
    standing_divisor: number;
    took_our_land_per_province: number;
    lands_taken_per_province: number;
    could_crush_us_per_multiple: Record<string, number>;
    per_member: number;
    same_faith: number;
    min_members: number;
    dissolve_below_share_of_threshold: number;
  };
  eras: Record<string, { unlocks?: string[]; or_event?: string; ties?: Record<string, Partial<EntryRule>>; mobilisation_event?: string; pact_offensive_call_bonus?: number }>;
  ai: {
    candidates_per_free_seat: number;
    gift_first_if_total_at_least: number;
    posture: Record<string, Record<string, number | boolean>>;
    negotiation: Record<string, number>;
    /** Notoriety points per reason point in counts made with or against the notorious country (DIPL-223). */
    notoriety_per_reason: number;
    /** Notoriety from which an AI that is not Warlike or a hegemon seeker declares no war (WAR-228, provisional). */
    notoriety_restraint: number;
  };
  event_tree_mapping: {
    opinion: { default_fade_years: number };
    notoriety: { cap: number };
    relation: Record<string, string>;
    new_effects: string[];
  };
  answers: { delay_months: number; preview_before_sending: boolean; hint: { likely_from: number; unlikely_to: number } };
  eras_by_year: { era: string; from: number }[];
  oaths_broken_years: number;
  lands_taken_years: number;
  /** AI arms and fear (DIPL-231 to DIPL-237): standing armies, mobilising at war, borrowing for war, fear of a much stronger neighbour. */
  arms_and_fear: ArmsAndFearRule;
}

/** A value for each fear level. */
export type ByFear = Record<FearWord, number>;
export type FearWord = "calm" | "wary" | "threatened";

export interface ArmsAndFearRule {
  fear: { wary_ratio: number; threatened_ratio: number; ally_weight: number };
  standing: { share_of_cap: number; match_neighbour: number; multiplier: ByFear; max_share_of_cap: ByFear; pay_share_of_income: ByFear; raise_per_month: number; slack: number };
  war: { share_of_cap: number; per_province: number; pay_share_of_income: number };
  borrow: { months_of_pay: number };
  /** F-166: allies against a common fear (DIPL-238, DIPL-239). */
  allies: { same_fear: ByFear; envoy_every_months: number; partners: number };
  /** F-166: walls on the border with the feared realm (DIPL-240). */
  defences: { castle_step: ByFear; reserve_share: ByFear };
  /** F-166: warfare and fortification studies weigh less when afraid (DIPL-241). */
  technology: { warfare_prefix: string; cost_weight: ByFear };
  /** F-166: opportunities and gambles before a declaration (DIPL-242, DIPL-243). */
  opportunity: { at_war_ratio_factor: number; at_war_chance_factor: number; at_war_target_weight: number; gamble_chance: number; gamble_ratio_factor: number; min_ratio: number };
}

export const config = raw as unknown as DiplomacyConfig;

/** The historical 1444 relations dataset (read-only; never written back). */
export interface Dataset {
  reference_date: string;
  relations: Record<string, unknown>[];
  facts: Record<string, unknown>[];
}

export const dataset1444 = dataset as unknown as Dataset;
