import type { Titles } from "@ph/engine";

/**
 * What a realm calls its lords and officials (REALM-242): chiefs, beys,
 * daimyo, magistrates. The words come from the snapshot; this is the default
 * before a campaign starts and the capitalised forms for labels.
 */
export const DEFAULT_TITLES: Titles = { lord: "lord", lords: "lords", official: "official", officials: "officials" };

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "a" or "an" before a title. */
export const an = (s: string) => (/^[aeiou]/i.test(s) ? `an ${s}` : `a ${s}`);
