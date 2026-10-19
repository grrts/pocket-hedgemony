import { expect } from "vitest";
import { advance, applyNow, campaignView, createWorld, setPlayer, STEPS_PER_DAY, type World } from "@ph/engine";
import { loadDefaultRuleset } from "@ph/rules";
import { createDayLoop, endCampaign, endTurn, newCampaign, requestSave, campaignOf, scheduleBattle, type Battle, type DayLoop } from "@ph/engine/domain/time-and-turns";
import { battleMarks, recolourUploads, tapTargetMin, visibleMapArea, recentreForCard, type Window } from "@ph/engine/domain/map-presentation";
import {
  ACTIONS,
  REALM_BOOK_TABS,
  sectionOf,
  realmOverview,
  type OverviewInput,
  type OverviewTile,
  SHELL,
  addBookSection,
  adCard,
  applyPreset,
  answerEndTurnQuestion,
  endTurnInAuto,
  answerEvent,
  answerFirstRun,
  appBackgrounded,
  appResumed,
  back,
  backPressesToMap,
  backToLabel,
  badgeCount,
  battleEnds,
  battleFrame,
  beginStep,
  bellLit,
  bootScreen,
  campaignLabel,
  campaignOptions,
  canPlayOnPastEnd,
  cardFrame,
  cardLayout,
  cardView,
  carryOn,
  checkTouchRules,
  classifyShape,
  closingSequence,
  coldStart,
  confirmDestructive,
  continueCampaign,
  cornerOf,
  currentTip,
  desktopInput,
  edgeSwipe,
  endDateReached,
  endTurnButton,
  enterCampaign,
  eventCard,
  failureScreen,
  stepBattles,
  dayDate,
  battleView,
  battleSwitcher,
  switchBattle,
  finalResult,
  finalResultChoice,
  firstFocus,
  focusOrder,
  foldAway,
  foldOut,
  fullGameRibbon,
  gameMenuEntries,
  gameOver,
  gameOverChoice,
  isAttentionKind,
  isScreenId,
  layerOf,
  layoutFor,
  leadVoice,
  loadingFinished,
  longPressOrHoverOnly,
  longTurnStrip,
  lookAtMap,
  startColumn,
  mapAccepts,
  mapDimmed,
  mapHud,
  mapLoaded,
  mapOpensAfter,
  mapPointer,
  mapTouch,
  moreMenu,
  mute,
  nativeLaunchScreen,
  needsSignIn,
  newCampaignBack,
  newProfile,
  newShell,
  nextStep,
  openBookScreenFromCard,
  openCard,
  openGameMenu,
  openLensPicker,
  openLoading,
  openNewCampaign,
  openPeace,
  openRealmBook,
  openScreen,
  openSiege,
  openUnlock,
  oppositeCorners,
  otherTip,
  panelTouch,
  peaceOptions,
  pickGameMenu,
  pickLoad,
  pickedUpStrip,
  playOn,
  playOnButton,
  pop,
  portraitNotice,
  post,
  pressEndTurn,
  prompts,
  purchaseResult,
  push,
  quickStart,
  raiseEvents,
  replaceAll,
  replayBattle,
  restoreLastSave,
  changeBattleOrders,
  actionSet,
  actionSetOffers,
  answerFirstLaunch,
  areOpposite,
  attentionTitle,
  battleButton,
  battleViewButtons,
  checkDomination,
  endDateChoices,
  explainLine,
  firstLaunchQuestion,
  holdButton,
  hudCorners,
  isValidEndDate,
  ledger,
  loadList,
  startFocus,
  muteButtons,
  mutesForSave,
  outcomeOf,
  panelButtons,
  panelLayout,
  PRE_TURN,
  realmLocked,
  saveCard,
  stoppedOnDay,
  unlockScreen,
  type FirstLaunchChoice,
  type RealmScores,
  type SaveSummary,
  routeInput,
  runTurn,
  saveAfterKillDuringTurn,
  screen,
  showOnMap,
  retreat,
  startCampaignEnd,
  stepDone,
  stepStrip,
  tabHolds,
  tapEmptyMap,
  tapNameTab,
  tapOnMap,
  tapRealm,
  firstStartInput,
  openStartScreen,
  openWiki,
  startBackgroundMoves,
  textField,
  startScreen,
  top,
  topBar,
  topCard,
  topId,
  toolColumn,
  turnOf,
  unmuteKind,
  visibleLines,
  type AttentionKind,
  type CampaignSummary,
  type Device,
  type Edition,
  type FrameId,
  type InputDevice,
  type MenuContext,
  type PendingEvent,
  type Platform,
  type PromptDevice,
  type Shell,
  type Tip,
  BATTLE_STEP_MS,
  COUNTRY_CARD_TABS,
  IN_CAMPAIGN_SCREENS,
  WATCH_STEP_MS,
  answerPeaceOffer,
  bannerAt,
  bannerTapBox,
  battleStrip,
  begins,
  countryCardTabs,
  countryTabHolds,
  deskOf,
  dispatchesButton,
  dispatchesView,
  fitsWindow,
  homeCheck,
  homeOf,
  logDispatches,
  openCountryCard,
  openDispatches,
  overviewOf,
  pressKey,
  putOffPeaceOffer,
  screenLayout,
  selectArmy,
  tapAlert,
  waitingForYou,
  watchRound,
  watchedBattleEnds,
  type Tracked,
} from "@ph/engine/domain/game-shell";
import { steps, type Scenario, type Table } from "../src/registry.ts";

const { Given, When, Then } = steps("game-shell");

// ---------------------------------------------------------------------------
// Helpers

const MAY_1503 = { year: 1503, month: 5 };

const PLATFORMS: Record<string, Platform> = {
  iOS: "iOS",
  Android: "Android",
  desktop: "desktop",
  Steam: "Steam",
  "Steam Deck": "Steam Deck",
  "Steam in Big Picture": "Steam",
};

function sh(s: Scenario): Shell {
  s.sh ??= newShell();
  return s.sh;
}

/** A campaign on the map, as Background steps load it. */
function loadCampaign(s: Scenario, realm: string, date = MAY_1503): Shell {
  const shell = s.sh ?? newShell();
  s.sh = shell;
  enterCampaign(shell, { realm, date });
  return shell;
}

function ensureCampaign(s: Scenario): Shell {
  const shell = sh(s);
  if (!mapLoaded(shell)) enterCampaign(shell, { realm: "France", date: MAY_1503 });
  return shell;
}

const acted = (s: Scenario): void => {
  s.acted = true;
};

const SUGGESTED = ["Ottomans", "France", "Castile", "England"];

function defaultDevice(): Device {
  return { language: "English", store: "Steam", collects: [], online: true };
}

function start(s: Scenario): void {
  const shell = sh(s);
  s.profile ??= newProfile();
  s.device ??= defaultDevice();
  s.start = coldStart(shell, s.profile, s.device, { loadSeconds: s.loadSeconds ?? 1, failure: s.failure ?? null, gameLanguages: s.languages ?? ["English", "French"] });
  s.profile = s.start.profile;
  acted(s);
}

/** A day loop for this month with the given battles (France against England unless named). */
function monthLoop(battles: { place: string; day: number; sides?: string[] }[], player = "France"): DayLoop {
  const loop = createDayLoop([], {
    isPlayerBattle: (b) => b.sides.includes(player),
    resolveBattle: (b) => ({ winner: b.sides[0], menLost: { [b.sides[0]!]: 600 + b.day, [b.sides[1]!]: 1400 + b.day }, reason: `${b.sides[0]} held the higher ground` }),
  });
  battles.forEach((b, i) => scheduleBattle(loop, { id: `battle-${i + 1}`, day: b.day, place: b.place, sides: b.sides ?? [player, "England"], movers: [], days: 1 }));
  return loop;
}

function stopAtTroyes(s: Scenario, card: "running" | "result" = "running"): void {
  const shell = ensureCampaign(s);
  s.month = { loop: monthLoop([{ place: "Troyes", day: 5 }]), events: [], report: ["A battle at Troyes"] };
  push(shell, { id: "turn" });
  turnOf(shell).phase = "in progress";
  runTurn(shell, s.month);
  if (card === "result") battleEnds(shell);
}

function expectTop(s: Scenario, id: FrameId): void {
  expect(topId(sh(s))).toBe(id);
}

// ---------------------------------------------------------------------------
// The screen list

Given("the screen {string} is defined", (s, id: string) => {
  expect(isScreenId(id)).toBe(true);
});

When("the screen {string} opens", (s, id: string) => {
  const shell = sh(s);
  if (s.acted) {
    expectTop(s, id as FrameId);
    return;
  }
  s.def = screen(id as FrameId);
  shell.track = "previous track";
  if (id === "loading") {
    s.loading = openLoading(s.tips ?? [], { year: 1444, region: "France", newPlayer: false });
    replaceAll(shell, { id: "loading" });
  } else if (id === "game_menu") openGameMenu(shell);
  else if (id === "attention") push(shell, { id: "attention" });
  else push(shell, { id: id as FrameId });
  acted(s);
});

Then("its kind is {string}", (s, kind: string) => {
  expect(s.def.kind).toBe(kind);
  const layer = layerOf(s.def.id);
  if (kind === "Home") expect(layer).toBe("map");
  if (kind === "Modal") expect(layer).toBe("modal");
  if (kind === "Sheet") expect(layer).toBe("card");
});

Then("its first focus is {string}", (s, focus: string) => {
  expect(s.def.firstFocus).toBe(focus);
  if (focus !== "none") expect(firstFocus(s.def.id, "controller")).toEqual({ element: focus, frame: "gold" });
});

Then("Back goes to {string}", (s, target: string) => expect(s.def.back).toBe(target));

Then("its music is {string}", (s, music: string) => {
  expect(s.def.music).toBe(music);
  const track = sh(s).track;
  if (music === "none") expect(track).toBeNull();
  else if (music.startsWith("unchanged") || music === "stinger only") expect(track).toBe("previous track");
  else expect(track).toBe(music);
});

// ---------------------------------------------------------------------------
// Boot and first run

Given("the game is not running", (s) => {
  s.sh = newShell();
  expect(s.sh.stack).toEqual([]);
});

When("the player starts the game", (s) => start(s));

Then("the screen {string} shows the pixel logo on parchment with the hourglass turning", (s, id: string) => {
  expect(s.start.path[0]).toBe(id);
  expect(bootScreen()).toMatchObject({ logo: "pixel logo on parchment", hourglass: "turning" });
});

Then("no studio logo and no video is shown", (_s) => {
  expect(bootScreen()).toMatchObject({ studioLogos: false, video: false });
});

Then("the screen {string} stays up while the map, sprites and engine worker load", (_s, _id: string) => {
  expect(bootScreen().waitsFor).toEqual(["map", "sprites", "engine worker"]);
});

Given("the game runs on {string}", (s, name: string) => {
  const platform = PLATFORMS[name];
  if (!platform) throw new Error(`platform ${name}`);
  s.platformName = name;
  if (s.sh) {
    s.sh.platform = platform;
  } else s.sh = newShell({ platform });
});

Then("the native launch screen shows the same logo as the screen {string}", (s, id: string) => {
  expect(id).toBe("boot");
  expect(nativeLaunchScreen(sh(s).platform)).toBe(bootScreen().logo);
});

Given("loading takes {float} seconds", (s, seconds: number) => {
  s.loadSeconds = seconds;
});

Then("the screen {string} is shown for {float} seconds", (s, id: string, seconds: number) => {
  expect(s.start.path[0]).toBe(id);
  expect(s.start.bootSeconds).toBeCloseTo(seconds, 5);
});

Given("a needed file is missing", (s) => {
  s.failure = "missing file";
});
Given("the engine worker won't start and the main-thread fallback also fails", (s) => {
  s.failure = "worker and fallback failed";
});

Given("the game runs for the first time", (s) => {
  s.profile = newProfile();
  s.device = defaultDevice();
});

Given("the device language is not one the game has", (s) => {
  s.device.language = "Turkish";
});

When("the screen {string} finishes", (s, id: string) => {
  expect(id).toBe("boot");
  start(s);
});

Then("the screen {string} shows one card with one choice", (s, id: string) => {
  expectTop(s, id as FrameId);
  expect(s.start.cards[0]).toMatchObject({ choices: 1 });
});

Then("the screen {string} follows once every card is answered", (s, id: string) => {
  while (s.start.cards.length) answerFirstRun(s.start, "English");
  // The title opens with its menu already shown (SHELL-149).
  expect(sh(s).stack.map((f) => f.id)).toEqual(id === "title" ? ["title", "main_menu"] : [id]);
  s.profile = s.start.profile;
});

When("the player starts the game a second time", (s) => start(s));

Then("the screen {string} is not shown", (s, id: string) => {
  if (s.start && !s.resumed) expect(s.start.path).not.toContain(id);
  expect(topId(sh(s))).not.toBe(id);
});

Given("the device language is {string}", (s, language: string) => {
  s.device.language = language;
});

Given("the game has the languages {string}", (s, list: string) => {
  s.languages = list.split(",").map((x) => x.trim());
});

Then(/^the language card (is shown|is not shown)$/, (s, shown: string) => {
  expect(s.start.cards.some((c: { question: string }) => c.question === "language")).toBe(shown === "is shown");
});

Then("the game language is {string}", (s, used: string) => {
  if (used === "chosen on card") {
    expect(s.start.profile.language).toBeNull();
    answerFirstRun(s.start, "English");
    expect(s.start.profile.language).toBe("English");
  } else expect(s.start.profile.language).toBe(used);
});

Given("the game runs for the first time on the store {string}", (s, store: string) => {
  s.profile = newProfile();
  s.device = { ...defaultDevice(), store };
});

const COLLECTED: Record<string, string[]> = {
  "tutorial step counts": ["tutorial step counts"],
  "crash reports needing consent": ["crash reports"],
  "nothing that needs consent": [],
};

Given(/^on that store (.+) is collected$/, (s, what: string) => {
  const c = COLLECTED[what];
  if (!c) throw new Error(what);
  s.device.collects = c;
});

Then(/^the consent card (is shown|is not shown)$/, (s, shown: string) => {
  expect(s.start.cards.some((c: { question: string }) => c.question === "consent")).toBe(shown === "is shown");
});

Given("the device is offline", (s) => {
  s.device = { ...(s.device ?? defaultDevice()), online: false };
});

When("the player goes from the screen {string} to the map of a new campaign", (s, from: string) => {
  start(s);
  const shell = sh(s);
  expect(s.start.path[0]).toBe(from);
  while (s.start.cards.length) answerFirstRun(s.start, "English");
  firstStartInput(shell, "touch");
  const nc = openNewCampaign(shell, { suggested: SUGGESTED, lastOptions: ["normal"] });
  quickStart(shell, nc);
  continueCampaign(shell, { realm: nc.realm!, date: { year: 1444, month: 11 }, borders: "1444" });
  loadingFinished(shell);
  s.path = shell.events.filter((e) => e.type === "ScreenOpened").map((e) => String(e.id));
});

Then("no account sign-in is asked at any step", (s) => {
  expect(s.path).toEqual(["boot", "title", "main_menu", "new_campaign", "loading", "map"]);
  expect(needsSignIn(s.path)).toBe(false);
});

Then("the campaign plays offline", (s) => {
  expect(s.device.online).toBe(false);
  expect(mapLoaded(sh(s))).toBe(true);
  expect(sh(s).campaign?.realm).toBe("Ottomans");
});

// ---------------------------------------------------------------------------
// Title and main menu

Given("no campaign is in progress", (s) => {
  s.summary = null;
});

Given("the campaign as {string} in May 1503 is in progress", (s, realm: string) => {
  s.summary = { realm, date: MAY_1503, borders: "May 1503" } satisfies CampaignSummary;
});

/** "the screen X is shown": sets the screen up before any action, checks it after one. */
Then("the screen {string} is shown", (s, id: string) => {
  const shell = sh(s);
  if (s.acted) {
    if (id === "boot" && s.start) expect(s.start.path[0]).toBe("boot");
    else expectTop(s, id as FrameId);
    return;
  }
  if (id === "title") openStartScreen(shell); else if (id === "map") {
    ensureCampaign(s);
    s.hud = mapHud({ width: shell.window.width, height: shell.window.height, shape: shell.shape, safe: s.safe });
  } else if (id === "realm_book") {
    ensureCampaign(s);
    openRealmBook(shell);
  } else if (id === "final_result") {
    ensureCampaign(s);
    s.final = finalResult(shell, { ledger: ["France", "England", "Castile"], outcome: "France leads the ledger", achievements: [] });
  } else replaceAll(shell, { id: id as FrameId });
});

Then("the track {string} starts", (s, track: string) => {
  expect(sh(s).track).toBe(track);
  expect(sh(s).events).toContainEqual({ type: "TitleDismissed" });
});

When("the player presses Back", (s) => {
  const shell = sh(s);
  if (s.nc && topId(shell) === "new_campaign") s.backResult = newCampaignBack(shell, s.nc);
  else s.backResult = back(shell);
  acted(s);
});

Given("a campaign as {string} exists with its newest save in May 1503", (s, realm: string) => {
  s.summary = { realm, date: MAY_1503, borders: "May 1503" } satisfies CampaignSummary;
  s.sh = newShell({ platform: "Android" });
});

When("the player picks {string}", (s, entry: string) => {
  const shell = sh(s);
  acted(s);
  if (s.flq && (s.flq.choices as string[]).includes(entry)) {
    s.flAnswer = answerFirstLaunch(shell, entry as FirstLaunchChoice);
    return;
  }
  const t = topId(shell);
  if (t === "main_menu" || (!t && entry === "New campaign")) {
    if (entry === "Play") playFromStart(s);
    else if (entry === "New campaign") s.nc = openNewCampaign(shell, { suggested: SUGGESTED, lastOptions: s.lastOptions ?? ["normal"] });
    else if (entry === "Wiki") s.wiki = openWiki(shell);
    else throw new Error(`start screen entry ${entry}`);
    return;
  }
  if (t === "map" && SHELL.gameMenu.includes(entry)) openGameMenu(shell);
  if (topId(shell) === "game_menu") {
    s.picked = pickGameMenu(shell, entry);
    return;
  }
  if (t === "confirmation") return answerEndTurnQuestion(shell, entry);
  if (t === "game_over") {
    s.picked = gameOverChoice(shell, entry, ["France", "England", "Castile", "Burgundy"]);
    return;
  }
  if (t === "final_result") return finalResultChoice(shell, entry);
  throw new Error(`Nothing to pick ${entry} from on ${t}`);
});

Then("the screen {string} opens with the newest save", (s, id: string) => {
  expectTop(s, id as FrameId);
  expect(top(sh(s))!.subject).toBe("newest");
  expect(sh(s).events).toContainEqual({ type: "CampaignLoadRequested", save: "newest" });
});

Then("the map of {string} follows", (s, realm: string) => {
  loadingFinished(sh(s));
  expectTop(s, "map");
  expect(sh(s).campaign?.realm).toBe(realm);
});

const MENU_STATES: Record<string, Pick<MenuContext, "campaign" | "saves" | "tutorialFinished">> = {
  "no save exists and the tutorial is not finished": { campaign: null, saves: 0, tutorialFinished: false },
  "a campaign and saves exist and the tutorial is finished": { campaign: { realm: "France", date: MAY_1503, borders: "" }, saves: 3, tutorialFinished: true },
  "a campaign and saves exist and the tutorial is not finished": { campaign: { realm: "France", date: MAY_1503, borders: "" }, saves: 3, tutorialFinished: false },
  "no save exists and the tutorial is finished": { campaign: null, saves: 0, tutorialFinished: true },
};

Given(/^(no save exists|a campaign and saves exist) and the tutorial is (not )?finished$/, (s, saves: string, not: string | undefined) => {
  s.menuState = MENU_STATES[`${saves} and the tutorial is ${not ?? ""}finished`];
  expect(s.menuState).toBeDefined();
});

Given("a campaign exists", (s) => {
  s.menuState = { campaign: { realm: "France", date: MAY_1503, borders: "" }, saves: 1, tutorialFinished: true };
});

When("the main menu is shown", (s) => {
  const shell = sh(s);
  if (s.acted) {
    expectTop(s, "main_menu");
    return;
  }
  openStartScreen(shell);
  s.menu = startColumn({ ...menuStateOf(s), platform: shell.platform, edition: shell.edition });
});

Given("the game is {string}", (s, edition: string) => {
  const e: Edition = edition === "the Steam demo" ? "Steam demo" : edition === "the free mobile tier" ? "free mobile" : "full game";
  s.sh = newShell({ edition: e, platform: e === "free mobile" ? "Android" : "Steam" });
});

Given("the tutorial is finished", (s) => {
  s.tutorialFinished = true;
});

When("the player opens {string} on the start screen", (s, entry: string) => {
  expect(entry).toBe("More");
  s.more = moreMenu(sh(s).edition, s.tutorialFinished === true);
});

Then("{string} holds {string}", (s, entry: string, list: string) => {
  expect(entry).toBe("More");
  expect(s.more.join(", ")).toBe(list);
});

Then("{string} is large and wax-red", (s, entry: string) => {
  expect(s.menu[0]).toMatchObject({ label: entry, style: "large wax-red" });
});

Then("the other entries are paper buttons", (s) => {
  for (const e of s.menu.slice(1)) expect(e.style).toBe("paper");
});

Given(/^the game is the (free tier|Steam demo)$/, (s, which: string) => {
  const edition: Edition = which === "Steam demo" ? "Steam demo" : "free mobile";
  if (s.sh) s.sh.edition = edition;
  else s.sh = newShell({ platform: edition === "free mobile" ? "Android" : "Steam", edition });
});

Then("no ad card is shown", (s) => {
  expect(adCard({ edition: sh(s).edition, screen: String(topId(sh(s)) ?? "main_menu") })).toBeNull();
});

Then("a small {string} ribbon is shown", (s, label: string) => {
  expect(fullGameRibbon(sh(s).edition)).toMatchObject({ label });
  expect(fullGameRibbon("full game")).toBeNull();
});

Then("picking it opens the screen {string}", (s, id: string) => {
  expect(fullGameRibbon(sh(s).edition)!.opens).toBe(id);
  const { flow } = openUnlock(sh(s), { online: true });
  expect(flow).not.toBeNull();
  expectTop(s, id as FrameId);
});

Then("no pop-up about the full game is ever shown", (s) => expect(fullGameRibbon(sh(s).edition)!.popUp).toBe(false));

// ---------------------------------------------------------------------------
// New campaign

Then("the screen {string} shows the step strip {string}", (s, id: string, strip: string) => {
  expectTop(s, id as FrameId);
  expect(stepStrip()).toBe(strip);
});

Then("step {int} {string} is active", (s, step: number, name: string) => {
  expect(s.nc.step).toBe(step);
  expect(top(sh(s))!.step).toBe(step);
  expect(SHELL.newCampaignSteps[step - 1]).toBe(name);
});

When("the player chooses the realm {string} and moves to step 2", (s, realm: string) => {
  tapRealm(sh(s), s.nc, realm);
  nextStep(sh(s), s.nc);
  expect(s.nc.step).toBe(2);
});

Then(/^step (\d) "([^"]+)" is (?:active|shown) with the realm "([^"]+)" still chosen$/, (s, step: string, name: string, realm: string) => {
  expectTop(s, "new_campaign");
  expect(s.nc.step).toBe(Number(step));
  expect(SHELL.newCampaignSteps[Number(step) - 1]).toBe(name);
  expect(s.nc.realm).toBe(realm);
});

Then("the map is shown at world zoom", (s) => expect(sh(s).camera.level).toBe("World"));

Then("filters for region, difficulty, and free or locked are offered", (_s) => {
  expect(SHELL.realmFilters).toEqual(["region", "difficulty", "free or locked"]);
});

Then("a short list of suggested realms is shown", (s) => expect(s.nc.suggested.length).toBeGreaterThan(0));

When("the player taps the realm {string}", (s, realm: string) => {
  s.realmCard = tapRealm(sh(s), s.nc, realm);
  acted(s);
});

Then("the card of {string} shows its strengths at a glance", (s, realm: string) => {
  expect(s.realmCard).toMatchObject({ realm, strengths: "at a glance", padlock: false });
});

Then("the card of {string} shows a padlock and a button to the screen {string}", (s, realm: string, id: string) => {
  expect(s.realmCard).toMatchObject({ realm, padlock: true, unlockButton: true });
  expect(isScreenId(id)).toBe(true);
  expect(() => nextStep(sh(s), s.nc)).toThrow();
});

When("the player buys the full game from the screen {string}", (s, id: string) => {
  const { flow } = openUnlock(sh(s), { realm: s.nc.realm, online: true });
  expectTop(s, id as FrameId);
  s.purchase = purchaseResult(sh(s), flow!, "succeeds", s.profile ?? newProfile());
});

Given("the player has chosen the realm {string}", (s, realm: string) => {
  tapRealm(sh(s), s.nc, realm);
});

When(/^the player moves to step (\d)$/, (s, step: string) => {
  while (s.nc.step < Number(step)) nextStep(sh(s), s.nc);
  acted(s);
});

Then("the options offered are difficulty, AI aggression, fog, historical or free events, ironman, and the end date", (_s) => {
  expect(campaignOptions()).toEqual(["difficulty", "AI aggression", "fog", "historical or free events", "ironman", "end date"]);
});

const PRESET = { difficulty: "normal", "AI aggression": "calm", fog: "on", "historical or free events": "historical", ironman: "off", "end date": "1939-08-31" };

When("the player picks a preset", (s) => {
  s.filled = applyPreset(s.nc, PRESET);
});

Then("the preset fills the whole step", (s) => {
  expect(s.filled).toHaveLength(campaignOptions().length);
  expect(() => applyPreset(s.nc, { difficulty: "hard" })).toThrow();
});

Given("the player has chosen the realm {string} and its options", (s, realm: string) => {
  tapRealm(sh(s), s.nc, realm);
  applyPreset(s.nc, PRESET);
});

Then("a summary card shows the banner, ruler, capital, start date and options", (s) => {
  s.begin = beginStep(s.nc, { banner: "France", ruler: "Charles VII", capital: "Paris", startDate: "1444" });
  expect(Object.keys(s.begin.summary)).toEqual(SHELL.summaryCard);
  expect(s.begin.summary.options).toEqual(Object.values(PRESET));
});

Then("one big {string} button is shown", (s, button: string) => expect(s.begin.button).toBe(button));

Given("the last options used were {string}", (s, options: string) => {
  s.nc.lastOptions = options.split(",").map((o) => o.trim());
});

Given("the player last tapped the realm {string}", (s, realm: string) => {
  tapRealm(sh(s), s.nc, realm);
  s.nc.realm = null;
});

Given("the player has tapped no realm", (s) => {
  expect(s.nc.lastTapped).toBeNull();
});

When("the player presses {string} on step 1", (s, button: string) => {
  expect(button).toBe("Quick start");
  expect(s.nc.step).toBe(1);
  quickStart(sh(s), s.nc);
});

Then("step 3 {string} is shown with the realm {string} and the options {string}", (s, name: string, realm: string, options: string) => {
  expect(name).toBe("Begin");
  expect(s.nc.step).toBe(3);
  expect(top(sh(s))!.step).toBe(3);
  expect(s.nc.realm).toBe(realm === "the first suggested realm" ? s.nc.suggested[0] : realm);
  expect(s.nc.options.join(", ")).toBe(options);
});

When("the player presses Back on step 1", (s) => {
  expect(s.nc.step).toBe(1);
  s.backResult = newCampaignBack(sh(s), s.nc);
  acted(s);
});

Then("no confirmation was asked", (s) => {
  expect(s.backResult).toBe("main menu");
  expect(sh(s).stack.some((f) => f.id === "confirmation")).toBe(false);
});

Then("the track {string} plays", (s, track: string) => expect(sh(s).track).toBe(track));

When("the player highlights the realm {string}", (s, realm: string) => {
  tapRealm(sh(s), s.nc, realm);
});

Then("the track's lead voice changes to the voice of the realm {string}", (s, realm: string) => {
  expect(sh(s).track).toBe("nation_select");
  expect(leadVoice(s.nc)).toBe(realm);
});

// ---------------------------------------------------------------------------
// Load and loading

Given("the screen {string} was opened from the main menu", (s, id: string) => {
  const shell = sh(s);
  replaceAll(shell, { id: "title" });
  push(shell, { id: "main_menu" });
  push(shell, { id: id as FrameId, openedFrom: "main_menu" });
});

Given("the screen {string} was opened from the game menu", (s, id: string) => {
  const shell = ensureCampaign(s);
  openGameMenu(shell);
  pickGameMenu(shell, "Load");
  expectTop(s, id as FrameId);
});

When("the player picks {string} on a save", (s, entry: string) => {
  expect(entry).toBe("Load");
  s.loadResult = pickLoad(sh(s), "save-1");
  acted(s);
});

Then("the screen {string} opens with no confirmation", (s, id: string) => {
  expect(s.loadResult).toEqual({ loading: true });
  expectTop(s, id as FrameId);
});

Then("the screen {string} opens with no question", (s, id: string) => {
  // Load from the game menu (SHELL-068) or Play on the start screen after the first-launch question (SHELL-131).
  if (s.loadResult) expect(s.loadResult).toEqual({ loading: true });
  else expect(s.flq).toBeNull();
  expectTop(s, id as FrameId);
});

Then("the question {string} is shown", (s, question: string) => {
  if (s.endTurn) expect(s.endTurn).toMatchObject({ result: "question", question });
  else expect(s.loadResult).toEqual({ question });
  expectTop(s, "confirmation");
});

Given("the campaign as {string} is at May 1503", (s, realm: string) => {
  loadCampaign(s, realm, MAY_1503);
});

Given(/^the campaign (has|has no) unsaved turns$/, (s, has: string) => {
  ensureCampaign(s).campaign!.unsavedTurns = has === "has" ? 3 : 0;
});

const TIPS: Tip[] = [
  { text: "Tip A for France in the first age", era: "age_of_gunpowder_empires", region: "France" },
  { text: "Tip B for France in the first age", era: "age_of_gunpowder_empires", region: "France" },
  { text: "Tip for the age of world wars", era: "age_of_world_wars", region: "France" },
  { text: "Tip for Japan", era: "age_of_gunpowder_empires", region: "Japan" },
  { text: "Tip for new players", newPlayer: true },
];

Given("the tips table holds tips tagged by era, region and whether they are for new players", (s) => {
  s.tips = TIPS;
});

When("the screen {string} opens for the realm {string} in Spring 1444", (s, id: string, realm: string) => {
  s.loading = openLoading(s.tips, { year: 1444, region: realm, newPlayer: false });
  replaceAll(sh(s), { id: id as FrameId });
});

Then("a tip fitting the realm {string} and the date Spring 1444 is shown", (s, realm: string) => {
  const tip = currentTip(s.loading)!;
  expect(tip.region).toBe(realm);
  expect(tip.era).toBe("age_of_gunpowder_empires");
  s.firstTip = tip;
  expect(s.loading.tips.map((t: Tip) => t.text)).toEqual(["Tip A for France in the first age", "Tip B for France in the first age"]);
});

When("the player presses right", (s) => {
  s.nextTip = otherTip(s.loading, "right");
});

Then("another tip is shown", (s) => {
  expect(s.nextTip).not.toEqual(s.firstTip);
  expect(s.nextTip.region).toBe("France");
});

Given("a save is being loaded", (s) => {
  s.tips = TIPS;
});

Then("the bar names the real steps such as {string}, {string} and {string}", (s, a: string, b: string, c: string) => {
  expect(s.loading.steps).toEqual([a, b, c]);
});

Then("the bar does not follow a fake timer", (s) => {
  expect(s.loading.done).toBe(0);
  expect(stepDone(s.loading)).toEqual({ step: "Reading the save", share: 1 / 3 });
  expect(stepDone(s.loading).share).toBeCloseTo(2 / 3, 5);
});

Given("the current tip appeared {float} seconds ago", (s, seconds: number) => {
  s.tipShown = seconds;
});

When("loading finishes", (s) => {
  s.wait = mapOpensAfter(s.tipShown);
});

Then("the map opens after {float} more seconds without the player tapping", (s, wait: number) => {
  expect(s.wait).toBeCloseTo(wait, 5);
});

// ---------------------------------------------------------------------------
// Map and cards

Given("a campaign as {string} is loaded", (s, realm: string) => {
  loadCampaign(s, realm);
});

When("the player opens the screen {string}", (s, id: string) => {
  const shell = sh(s);
  s.camera = { ...shell.camera };
  if (id === "siege") openSiege(shell, "Orléans");
  else openScreen(shell, id as FrameId);
  acted(s);
});

Then("the screen {string} is a {string} over the map", (s, id: string, kind: string) => {
  const t = top(sh(s))!;
  expect(t.id).toBe(id);
  expect(layerOf(t.id)).toBe(kind);
});

Then("the map stays loaded underneath", (s) => expect(mapLoaded(sh(s))).toBe(true));

When("the player closes the screen {string}", (s, id: string) => {
  expectTop(s, id as FrameId);
  back(sh(s));
});

Then("the screen {string} is shown at the same camera position", (s, id: string) => {
  expectTop(s, id as FrameId);
  const { x, y, zoom } = sh(s).camera;
  expect({ x, y, zoom }).toEqual({ x: s.camera.x, y: s.camera.y, zoom: s.camera.zoom });
});

Given("the player opened the province card of {string}", (s, province: string) => {
  openCard(ensureCampaign(s), { kind: "province", name: province });
});

Given("from it the country card of {string}", (s, country: string) => {
  openCard(sh(s), { kind: "country", name: country });
});

Given("from it the card of a commander", (s) => {
  openCard(sh(s), { kind: "commander", name: "Jean de Dunois" });
});

When("the player counts the Back presses to the map", (s) => {
  s.presses = backPressesToMap(sh(s));
});

Then("the map is at most {int} Back presses away", (s, n: number) => {
  expect(n).toBe(SHELL.maxStepsFromMap);
  expect(s.presses).toBeLessThanOrEqual(n);
  expect(s.presses).toBe(3);
});

Given("the screen of the layer {string} is open", (s, layer: string) => {
  const shell = ensureCampaign(s);
  if (layer === "card") openCard(shell, { kind: "province", name: "Champagne" });
  else if (layer === "full screen") openRealmBook(shell, "Military");
  else if (layer === "modal") {
    raiseEvents(shell, [{ id: "the_maid_of_orleans", date: "1503-05-03", options: ["a", "b"] }]);
    push(shell, { id: "event", subject: "the_maid_of_orleans", decideLater: true });
  }
  s.below = shell.stack.at(-2)?.id;
});

When("the player presses the cross", (s) => {
  s.backResult = back(sh(s));
  acted(s);
});

When("the player taps empty map", (s) => {
  tapEmptyMap(sh(s));
  acted(s);
});

When("the player minimises it", (s) => {
  foldAway(sh(s));
  acted(s);
});

When(/^the player presses Back where deciding later is (allowed|not allowed)$/, (s, allowed: string) => {
  top(sh(s))!.decideLater = allowed === "allowed";
  s.backResult = back(sh(s));
  acted(s);
});

Then("the card closes", (s) => {
  expect(cardFrame(sh(s))).toBeUndefined();
  expectTop(s, "map");
});

Then("the card shrinks to its name tab", (s) => {
  expect(cardView(sh(s))).toMatchObject({ folded: true });
});

Then("the screen below is shown", (s) => expectTop(s, "map"));

Then("the modal is put off", (s) => {
  expect(s.backResult).toBe("put off");
  expectTop(s, "map");
  expect(turnOf(sh(s)).events).toHaveLength(1);
});

Then("the modal stays open", (s) => {
  expect(s.backResult).toBe("stays open");
  expectTop(s, "event");
});

When("the player opens the country card of {string} from it", (s, country: string) => {
  openCard(sh(s), { kind: "country", name: country });
});

Then("the country card of {string} is on top of the card stack", (s, country: string) => {
  expect(topCard(sh(s))).toMatchObject({ kind: "country", name: country });
});

When("the player opens the card of a commander from it", (s) => {
  openCard(sh(s), { kind: "commander", name: "Jean de Dunois" });
});

Then("the commander card shows the button {string}", (s, label: string) => {
  expect(topCard(sh(s))?.kind).toBe("commander");
  expect(backToLabel(sh(s))).toBe(label);
});

Then("the card stack is empty", (s) => expect(cardFrame(sh(s))).toBeUndefined());

Then("the top bar shows the realm name and banner, the date, gold with its monthly change, and levies", (s) => {
  expect(topBar(sh(s)).shown).toEqual(["realm name and banner", "date", "gold with its monthly change", "levies"]);
});

When("the player taps the banner", (s) => {
  openCard(sh(s), { kind: "country", name: sh(s).campaign!.realm });
  acted(s);
});

Then("the country card of {string} opens", (s, country: string) => {
  expect(topCard(sh(s))).toMatchObject({ kind: "country", name: country });
});

/** "the shape is X": sets the shape before any action, checks it after one. */
Then("the shape is {string}", (s, shape: string) => {
  if (s.acted) {
    expect(sh(s).shape).toBe(shape);
    return;
  }
  const shell = sh(s);
  const windows: Record<string, Window> = {
    "Short wide": { width: 844, height: 390, device: "phone" },
    Tall: { width: 820, height: 1180, device: "tablet" },
    Large: { width: 1600, height: 900, device: "desktop" },
    Far: { width: 1920, height: 1080, device: "TV" },
  };
  shell.window = windows[shape]!;
  shell.shape = classifyShape(shell.window);
  expect(shell.shape).toBe(shape);
});

Given("new systems add plaques so that {int} plaques exist", (s, n: number) => {
  s.extraPlaques = Array.from({ length: n - SHELL.topBar.length }, (_, i) => `new plaque ${i + 1}`);
});

When("the top bar is drawn", (s) => {
  s.topBar = topBar(sh(s), s.extraPlaques);
});

Then("the top bar shows {int} plaques", (s, n: number) => expect(s.topBar.shown).toHaveLength(n));
Then("the other {int} move into the country card", (s, n: number) => expect(s.topBar.movedToCountryCard).toHaveLength(n));

When("the screen {string} is drawn", (s, id: string) => {
  expectTop(s, id as FrameId);
  const shell = sh(s);
  s.hud = mapHud({ width: shell.window.width, height: shell.window.height, shape: shell.shape });
});

Then("the tool column at the right edge holds {string}, {string}, {string} and {string}", (s, ...names: string[]) => {
  expect(toolColumn()).toEqual(names);
  for (const name of names) {
    const r = s.hud.find((x: { name: string }) => x.name === name);
    expect(cornerOf(r, sh(s).window.width, sh(s).window.height)).toMatch(/right$/);
  }
});

function postLines(shell: Shell, kinds: AttentionKind[], realm = "France"): void {
  kinds.forEach((kind, i) => post(shell.attention, { id: `line-${i + 1}`, kind, target: { kind: "province", name: `${realm} place ${i + 1}` }, urgency: kinds.length - i }));
}

Given("the Attention screen holds {int} items", (s, n: number) => {
  postLines(sh(s), Array.from({ length: n }, () => "an idle army" as AttentionKind));
});

Then("the End turn button in the lower right shows the hourglass with the badge {int}", (s, n: number) => {
  expect(endTurnButton(sh(s))).toMatchObject({ icon: "hourglass", count: n, corner: "lower right" });
  expect(badgeCount(sh(s).attention)).toBe(n);
});

function openAttentionBy(s: Scenario, how: string): void {
  const shell = sh(s);
  if (how === "presses \"Look\" on the End turn question") {
    shell.settings.confirmEndTurn = "When the Attention screen has lines";
    postLines(shell, ["a rising brewing"], "Hungary");
    expect(pressEndTurn(shell).result).toBe("question");
    answerEndTurnQuestion(shell, "Look");
  } else push(shell, { id: "attention", openedFrom: how });
  acted(s);
}

When(/^the player (taps the badge|taps the badge on End turn|taps the Attention bell|presses the controller's next button|presses "Look" on the End turn question)$/, (s, how: string) => openAttentionBy(s, how));

Given("the Attention screen holds {int} warnings and {int} waiting items", (s, w: number, n: number) => {
  postLines(sh(s), [...Array.from({ length: w }, () => "an army hungry" as AttentionKind), ...Array.from({ length: n }, () => "an idle fleet" as AttentionKind)]);
});

Then(/^the Attention bell next to the date is (lit|not lit)$/, (s, lit: string) => expect(bellLit(sh(s).attention)).toBe(lit === "lit"));

Then("no other place on screen warns the player", (s) => {
  const shell = sh(s);
  expect(topBar(shell).shown.some((p) => /warn/i.test(p))).toBe(false);
  expect(s.hud.some((r: { name: string }) => /warn/i.test(r.name))).toBe(false);
  expect(endTurnButton(shell).count).toBe(badgeCount(shell.attention));
});

Then("a small three-line game menu button is shown in the upper left next to the banner", (s) => {
  const { width, height } = sh(s).window;
  const menu = s.hud.find((r: { name: string }) => r.name === "game menu");
  const banner = s.hud.find((r: { name: string }) => r.name === "banner");
  expect(cornerOf(menu, width, height)).toBe("upper left");
  expect(banner.x).toBeGreaterThan(menu.x);
  expect(banner.y).toBe(menu.y);
});

When("the player zooms to local zoom on {string}", (s, province: string) => {
  s.depth = sh(s).stack.length;
  sh(s).camera = { ...sh(s).camera, on: province, level: "Local" };
});

Then("the tile-row view is shown on the screen {string}", (s, id: string) => {
  expectTop(s, id as FrameId);
  expect(sh(s).camera.level).toBe("Local");
});

Then("no new screen is put on the stack", (s) => expect(sh(s).stack.length).toBe(s.depth));

When("the player opens the province card of {string}", (s, province: string) => {
  openCard(sh(s), { kind: "province", name: province });
  acted(s);
});

Then("the card takes the full height of the left 45 % of the screen", (s) => {
  expect(cardLayout(sh(s))).toMatchObject({ kind: "side sheet", side: "left", widthShare: 0.45, fullHeight: true });
});

Then("the map stays live on the right, recentred so {string} is not hidden", (s, _province: string) => {
  const { width, height } = sh(s).window;
  const v = visibleMapArea(sh(s).shape, width, height);
  expect(v.x + v.w).toBe(width);
  const r = recentreForCard(sh(s).shape, width, height, { x: 100, y: height / 2 });
  expect(r.at.x).toBeGreaterThanOrEqual(v.x);
});

Then("the card is a bottom sheet at 55 % height", (s) => {
  expect(cardLayout(sh(s))).toMatchObject({ kind: "bottom sheet", heightShare: 0.55 });
});

Then("it can be dragged up to full height or down to a peek strip", (s) => {
  expect(cardLayout(sh(s))).toMatchObject({ drag: ["peek strip", "full height"] });
});

Given("the interface scale is {int}", (s, scale: number) => {
  s.uiScale = scale;
});

Then("the card is a side sheet 380 px wide", (s) => {
  expect(layoutFor(sh(s).shape, s.uiScale).card).toMatchObject({ kind: "side sheet", widthPx: 380 });
});

When("the player taps the province {string}", (s, province: string) => {
  s.depth = sh(s).stack.length;
  s.tap = tapOnMap(sh(s), { kind: "province", name: province });
  s.gesture = mapTouch({ tap: province });
  acted(s);
});

Then(/^"([^"]+)" is selected and its name tab appears (?:in the )?lower left$/, (s, province: string) => {
  expect(sh(s).selection?.name).toBe(province);
  expect(s.gesture).toMatchObject({ does: "select", selects: true });
});

Then("no card is open", (s) => expect(cardFrame(sh(s))).toBeUndefined());

When("the player taps the name tab", (s) => {
  tapNameTab(sh(s));
});

When("the player taps the province {string} again", (s, province: string) => {
  tapOnMap(sh(s), { kind: "province", name: province });
});

Then(/^the province card of "([^"]+)" opens( again)?$/, (s, province: string) => {
  expect(cardView(sh(s))).toEqual({ card: { kind: "province", name: province }, folded: false });
});

Given("the province card of {string} is open", (s, province: string) => {
  openCard(ensureCampaign(s), { kind: "province", name: province });
});

When("the player minimises the card", (s) => {
  foldAway(sh(s));
});

Then("only the name tab {string} is shown", (s, name: string) => {
  expect(cardView(sh(s))).toEqual({ card: { kind: "province", name }, folded: true });
});

When("the player opens a line that opens its gain and lose list", (s) => {
  s.depth = sh(s).stack.length;
  foldOut(sh(s), "food");
});

Then("the list folds out inside the card", (s) => expect(topCard(sh(s))?.foldOuts).toEqual(["food"]));

// ---------------------------------------------------------------------------
// Realm book

When("the player opens the Realm book on the tab {string}", (s, tab: string) => {
  openRealmBook(sh(s), tab);
});

Then("the tab {string} holds {string}", (s, tab: string, holds: string) => {
  expect(top(sh(s))).toMatchObject({ id: "realm_book", tab });
  expect(tabHolds(tab).join(", ")).toBe(holds);
});

Given("the player last closed the Realm book on the tab {string}", (s, tab: string) => {
  openRealmBook(sh(s), tab);
  back(sh(s));
});

When("the player opens the Realm book from the tool column", (s) => {
  openRealmBook(sh(s));
});

Then("the tab {string} is shown", (s, tab: string) => {
  const t = top(sh(s))!;
  expect(t.id).toBe("realm_book");
  expect(t.tab).toBe(tab);
});

Given("a new system needs a place in the Realm book", (s) => {
  s.tabs = Object.fromEntries(REALM_BOOK_TABS.map((t) => [t, tabHolds(t)]));
});

When("the system is added", (s) => {
  s.tabsAfter = addBookSection(s.tabs, "Research", "a new system's screen");
  expect(() => addBookSection(s.tabs, "Seventh", "a new system's screen")).toThrow();
});

Then("it adds a section inside one of the six tabs", (s) => {
  expect(s.tabsAfter.Research).toContain("a new system's screen");
});

Then("the Realm book has {int} tabs", (s, n: number) => {
  expect(n).toBe(SHELL.realmBookMaxTabs);
  expect(Object.keys(s.tabsAfter)).toHaveLength(n);
});

When("the player opens the Realm book", (s) => {
  openRealmBook(sh(s));
  s.bookTabs = layoutFor(sh(s).shape).bookTabs;
});

Then("the sections are shown as one row of icons with names under the card's title", (s) => {
  expect(s.bookTabs).toEqual({ place: "top row", narrow: false, names: true });
});

Given("the Realm book is open on the tab {string} scrolled to the army {string}", (s, tab: string, _army: string) => {
  openRealmBook(ensureCampaign(s), tab).scroll = 640;
});

When("the player presses {string} on the army {string}", (s, button: string, army: string) => {
  expect(button).toBe("Show on map");
  showOnMap(sh(s), { kind: "army", name: army });
  s.army = army;
});

Then("the book closes, the camera moves to the army and its card opens", (s) => {
  expect(sh(s).stack.some((f) => f.id === "realm_book")).toBe(false);
  expect(sh(s).camera.on).toBe(s.army);
  expect(topCard(sh(s))).toEqual({ kind: "army", name: s.army });
});

Then("the Realm book is open on the tab {string} at the same scroll position", (s, tab: string) => {
  expect(top(sh(s))).toMatchObject({ id: "realm_book", tab, scroll: 640 });
});

When("the player opens the Levy screen from the card", (s) => {
  openBookScreenFromCard(sh(s), "Levy");
});

Then("the Levy screen is stacked on the province card", (s) => {
  expect(top(sh(s))).toMatchObject({ id: "book_screen", subject: "Levy", openedFrom: "Champagne" });
  expect(sh(s).stack.at(-2)?.id).toBe("card");
});

Then("the province card of {string} is shown", (s, province: string) => {
  expectTop(s, "card");
  expect(topCard(sh(s))).toMatchObject({ kind: "province", name: province });
});

// ---------------------------------------------------------------------------
// Game menu

Given("the screen {string} is shown with nothing open", (s, id: string) => {
  expect(id).toBe("map");
  expectTop(s, "map");
  expect(sh(s).stack).toHaveLength(1);
});

When("the player presses the game menu button", (s) => {
  openGameMenu(sh(s));
  acted(s);
});

When("the player presses Esc", (s) => {
  const shell = sh(s);
  if (!shell.stack.length) {
    ensureCampaign(s);
    openCard(shell, { kind: "province", name: "Champagne" });
  }
  s.desktop = desktopInput("Esc");
  s.backResult = routeInput(shell, "keyboard", "Esc");
  acted(s);
});

When("the player presses the controller's Menu button", (s) => {
  openGameMenu(sh(s));
  acted(s);
});

Then("the screen {string} opens as a modal over the dimmed map", (s, id: string) => {
  expectTop(s, id as FrameId);
  expect(layerOf(id as FrameId)).toBe("modal");
  expect(mapDimmed(sh(s))).toBe(true);
});

Then("the turn is not paused, because nothing runs until End turn", (s) => {
  expect(turnOf(sh(s)).phase).toBe("orders");
  expect(sh(s).stack.some((f) => f.id === "turn")).toBe(false);
});

Then("it shows the entries {string} in order", (s, entries: string) => {
  const c = sh(s).campaign!;
  expect(gameMenuEntries(sh(s).platform, c.ironman, { tutorial: s.tutorialRunning === true, canEarnAchievements: c.canEarnAchievements }).join(", ")).toBe(entries);
});

Then("focus is on {string}", (s, element: string) => {
  // The main menu's and the first-launch question's focus depend on the state (SHELL-026, SHELL-131).
  if (s.focusOverride) {
    expect(s.focusOverride).toBe(element);
    return;
  }
  expect(firstFocus(topId(sh(s))!, "controller")).toEqual({ element, frame: "gold" });
});

Given(/^the campaign (is ironman|is not ironman)$/, (s, which: string) => {
  ensureCampaign(s).campaign!.ironman = which === "is ironman";
});

Then("the Save entry reads {string}", (s, label: string) => {
  expect(gameMenuEntries(sh(s).platform, true)[1]).toBe(label);
  expect(gameMenuEntries(sh(s).platform, sh(s).campaign!.ironman)[1]).toBe(label);
});

Given("the screen {string} is open", (s, id: string) => {
  expect(id).toBe("game_menu");
  openGameMenu(ensureCampaign(s));
});

Then("the screen {string} opens as an overlay", (s, id: string) => {
  expectTop(s, id as FrameId);
  expect(layerOf(id as FrameId)).toBe("overlay");
});

Then("a question about the unsaved turns is shown", (s) => {
  expect(s.picked).toEqual({ asked: "Leave May 1503 unsaved? · Save first · Leave · Cancel" });
  expectTop(s, "confirmation");
});

Then("the main menu is shown without a question", (s) => {
  expect(s.picked).toEqual({ left: true, saved: false });
  expectTop(s, "main_menu");
});

Then("the game saves and the main menu is shown without a question", (s) => {
  expect(s.picked).toEqual({ left: true, saved: true });
  expect(sh(s).events).toContainEqual({ type: "SaveRequested", reason: "ironman exit" });
  expectTop(s, "main_menu");
});

// ---------------------------------------------------------------------------
// The turn

Given("no event is unanswered", (s) => {
  expect(turnOf(ensureCampaign(s)).events).toEqual([]);
});

Given("the setting {string} is {string}", (s, setting: string, value: string) => {
  if (setting === "Main hand") {
    s.mainHand = value;
    return;
  }
  expect(setting).toBe("Confirm End turn");
  sh(s).settings.confirmEndTurn = value as Shell["settings"]["confirmEndTurn"];
});

When("the player taps End turn", (s) => {
  // With Auto turns in play (auto-turns.feature), End turn stops them at the week's end or pauses the week (SHELL-160).
  if (s.auto) {
    if (s.playing && endTurnInAuto(s.auto) === "pause") s.paused = !s.paused;
    return;
  }
  const shell = sh(s);
  s.depth = shell.stack.length;
  s.endTurn = pressEndTurn(shell);
  acted(s);
});

Then("the turn starts with no question", (s) => {
  expect(s.endTurn).toEqual({ result: "turn started" });
  expectTop(s, "turn");
});

Then("a confirmation is shown before the turn starts", (s) => {
  expect(s.endTurn.result).toBe("question");
  expectTop(s, "confirmation");
  expect(turnOf(sh(s)).phase).toBe("orders");
  answerEndTurnQuestion(sh(s), "End turn");
  expectTop(s, "turn");
});

Given("{int} events are unanswered", (s, n: number) => {
  raiseEvents(ensureCampaign(s), Array.from({ length: n }, (_, i) => ({ id: `event-${i + 1}`, date: `1503-05-0${i + 1}`, options: ["yes", "no"] })));
});

Then("the End turn button shows the event scroll icon with the count {int} instead of the hourglass", (s, n: number) => {
  expect(endTurnButton(sh(s))).toMatchObject({ icon: "event scroll", count: n });
});

Then("the first unanswered event opens", (s) => {
  expect(s.endTurn).toEqual({ result: "event opened", event: "event-1" });
  expect(top(sh(s))).toMatchObject({ id: "event", subject: "event-1" });
});

Then("the turn does not start", (s) => {
  expect(turnOf(sh(s)).phase).toBe("orders");
  expect(sh(s).events.some((e) => e.type === "EndTurnPressed")).toBe(false);
});

Then("no event is answered for the player", (s) => {
  expect(turnOf(sh(s)).answered).toEqual([]);
  expect(turnOf(sh(s)).events).toHaveLength(2);
});

Then("the screen {string} is shown over the map", (s, id: string) => {
  expectTop(s, id as FrameId);
  expect(mapLoaded(sh(s))).toBe(true);
  expect(layerOf(id as FrameId)).toBe("overlay");
});

Then("the map can be panned and zoomed", (s) => {
  expect(mapAccepts(sh(s), "pan")).toBe(true);
  expect(mapAccepts(sh(s), "zoom")).toBe(true);
});

Then("no order can be given", (s) => expect(mapAccepts(sh(s), "order")).toBe(false));

Then("the hourglass on End turn turns", (s) => expect(endTurnButton(sh(s))).toMatchObject({ icon: "hourglass", turning: true }));

Then("armies march along their routes and borders change as the worker's results arrive", (s) => {
  const r = recolourUploads({ idImageUploaded: true, ownersBefore: ["France", "England"], ownersAfter: ["France", "France"] });
  expect(r).toEqual({ uploads: ["colour lookup texture"], recoloured: 1 });
  expectTop(s, "turn");
});

Given("the turn takes {float} seconds", (s, seconds: number) => {
  s.turnSeconds = seconds;
});

Then(/^the parchment strip "([^"]+)" (is not shown|is shown after 1\.5 seconds)$/, (s, text: string, shown: string) => {
  const strip = longTurnStrip(s.turnSeconds);
  expect(strip.text).toBe(text);
  expect(strip.shown).toBe(shown !== "is not shown");
  if (strip.shown) expect(strip.after).toBe(1.5);
});

Given("the battle at {string} is running", (s, place: string) => {
  expect(place).toBe("Troyes");
  stopAtTroyes(s);
  expect(battleFrame(sh(s))).toMatchObject({ subject: "Troyes", battleCard: "running" });
});
Given(/^(\d+) steps of 4 hours (?:have passed|pass)$/, (s, n: string) => {
  for (let i = 0; i < Number(n); i++) stepBattles(sh(s));
});
When("the player sets the standing orders for this battle to {string}", (s, orders: string) => {
  changeBattleOrders(sh(s), orders);
});
Then("the battle at {string} fights on with {string}", (s, place: string, orders: string) => {
  expect(battleView(sh(s))).toMatchObject({ place, orders, step: 2 });
  expect(sh(s).events).toContainEqual({ type: "BattleOrdersChanged", battle: "battle-1", orders });
  stepBattles(sh(s));
  expect(battleView(sh(s)).step).toBe(3);
});
Then("no other battle's orders change", (s) => {
  expect(turnOf(sh(s)).running.filter((r) => r.battle.orders && r.battle !== turnOf(sh(s)).battle)).toEqual([]);
});
Then(/^the battle at "([^"]+)" ends with a retreat after (\d+) hours$/, (s, place: string, hours: string) => {
  const r = turnOf(sh(s)).running.find((x) => x.battle.place === place)!;
  expect(r.outcome).toBe("retreated");
  expect(r.step * 4).toBe(Number(hours));
});

When("the player presses {string}", (s, button: string) => {
  const shell = sh(s);
  acted(s);
  switch (button) {
    case "Retreat":
      return retreat(shell);
    case "Carry on":
      return carryOn(shell);
    case "Look at the map":
      s.depth = shell.stack.length;
      return lookAtMap(shell);
    case "Show": {
      const line = visibleLines(shell.attention)[0]!;
      return showOnMap(shell, line.target);
    }
    default:
      throw new Error(`No button ${button}`);
  }
});

Then("the battle ends on its result card showing who won, men lost and the one-line reason", (s) => {
  const f = battleFrame(sh(s))!;
  expect(f.battleCard).toBe("result");
  expect(turnOf(sh(s)).running[0]!.outcome).toBe("ended");
  expect(turnOf(sh(s)).battle?.result).toMatchObject({ winner: "France", menLost: { France: 605, England: 1405 }, reason: "France held the higher ground" });
});

Then("the result card offers {string}", (s, button: string) => {
  expect(battleFrame(sh(s))?.battleCard).toBe("result");
  expect(button).toBe("Carry on");
});

Then("the result card is shown", (s) => expect(battleFrame(sh(s))?.battleCard).toBe("result"));

Given("this month {string} fights at {string} on the 5th and at {string} on the 7th", (s, realm: string, a: string, b: string) => {
  ensureCampaign(s);
  s.month = { loop: monthLoop([{ place: a, day: 5 }, { place: b, day: 7 }], realm), events: [], report: ["Two battles"] };
});

Given("the turn is stopped on the result card at {string}", (s, place: string) => {
  const shell = sh(s);
  push(shell, { id: "turn" });
  turnOf(shell).phase = "in progress";
  runTurn(shell, s.month);
  expect(battleFrame(shell)?.subject).toBe(place);
  battleEnds(shell);
});

Then("the turn resumes in whole days", (s) => expect(sh(s).events).toContainEqual({ type: "TurnResumed", battles: ["battle-1"] }));

Then("the battle at {string} starts on day {int}", (s, place: string, day: number) => {
  expect(battleFrame(sh(s))).toMatchObject({ subject: place, battleCard: "running" });
  expect(sh(s).camera.on).toBe(place);
  expect(turnOf(sh(s)).phase).toBe("battle");
  expect(stoppedOnDay(sh(s))).toBe(day);
});

Given("{string} and {string} fight a battle this month", (s, a: string, b: string) => {
  ensureCampaign(s);
  s.month = { loop: monthLoop([{ place: "Badajoz", day: 3, sides: [a, b] }]), events: [], report: [] };
});

Given(/^the battle (matters|does not matter) to the player$/, (s, matters: string) => {
  if (matters === "matters") s.month.report.push("Castile and Portugal fought at Badajoz");
});

When("the turn runs", (s) => {
  const shell = sh(s);
  push(shell, { id: "turn" });
  turnOf(shell).phase = "in progress";
  runTurn(shell, s.month);
  acted(s);
});

Then("time does not slow for that battle", (s) => {
  expect(battleFrame(sh(s))).toBeUndefined();
  expect(s.month.loop.battles).toHaveLength(1);
  expect(s.month.loop.stoppedAt).toBeNull();
});

Then("the battle appears on the map", (s) => {
  expect(s.month.loop.battles[0].place).toBe("Badajoz");
  expect(battleMarks("World")).toEqual([{ draw: "crossed swords" }]);
});

Then(/^the battle (is listed|is not listed) in the turn report$/, (s, listed: string) => {
  const report = turnOf(sh(s)).report;
  expect(report.some((l: string) => l.includes("Badajoz"))).toBe(listed === "is listed");
  // The report goes into the Dispatches log and never opens by itself (SHELL-147).
  expect(dispatchesView(sh(s)).days.flatMap((d) => d.lines).some((l) => l.includes("Badajoz"))).toBe(listed === "is listed");
  expectTop(s, "map");
});

Given("the battle at {string} was fought last turn", (s, place: string) => {
  stopAtTroyes(s, "result");
  carryOn(sh(s));
  expect(turnOf(sh(s)).fought.map((b) => b.place)).toContain(place);
  if (topId(sh(s)) === "turn_report") pop(sh(s));
});

When(/^the player opens it from (the turn report|the News)$/, (s) => {
  const shell = sh(s);
  push(shell, { id: "turn_report" });
  replayBattle(shell, "Troyes", "turn_report");
});

Then("the screen {string} replays it", (s, id: string) => {
  expect(top(sh(s))).toMatchObject({ id, subject: "Troyes", replay: true });
});

When(/^the app (goes to the background and comes back|is killed and started again)$/, (s, what: string) => {
  const shell = sh(s);
  if (what === "goes to the background and comes back") {
    s.bg = appBackgrounded(shell);
    s.resumed = appResumed(shell, s.bg);
    return;
  }
  // Killed: the Resume save and the orders journal are loaded again and the same month replays to the same battle.
  s.firstResult = turnOf(shell).battle!.result;
  const again = newShell({ platform: shell.platform });
  enterCampaign(again, { realm: "France", date: MAY_1503 });
  push(again, { id: "turn" });
  turnOf(again).phase = "in progress";
  runTurn(again, { loop: monthLoop([{ place: "Troyes", day: 5 }]), events: [], report: [] });
  s.sh = again;
  s.from = saveAfterKillDuringTurn();
});

Then("the running battle at {string} is shown again at the same step", (s, place: string) => {
  expect(battleFrame(sh(s))).toMatchObject({ subject: place, battleCard: "running" });
  expect(battleView(sh(s)).step).toBe(0);
});

Then("the Resume save and the orders journal replay the month to {string} with the same result", (s, place: string) => {
  expect(s.from).toBe("the Resume save and the orders journal");
  expect(battleFrame(sh(s))).toMatchObject({ subject: place, battleCard: "running" });
  expect(turnOf(sh(s)).battle!.result).toEqual(s.firstResult);
});

Given("the turn raised events on 3 May, 11 May and 27 May", (s) => {
  ensureCampaign(s);
  const ev = (day: string): PendingEvent => ({ id: `event of ${day} May`, date: `1503-05-${day}`, options: ["first", "second", "third"], effects: { first: "+10 gold", second: "+1 loyalty", third: "nothing" } });
  s.month = { loop: monthLoop([]), events: [ev("27"), ev("03"), ev("11")], report: [] };
});

When("the turn reaches its events", (s) => {
  const shell = sh(s);
  push(shell, { id: "turn" });
  turnOf(shell).phase = "in progress";
  runTurn(shell, s.month);
});

Then("the event of 3 May opens first as a modal card with a picture, text and two or three options", (s) => {
  const card = eventCard(sh(s))!;
  expect(card.id).toBe("event of 03 May");
  expect(layerOf("event")).toBe("modal");
  expect(card.options.length).toBeGreaterThanOrEqual(2);
  expect(card.options.length).toBeLessThanOrEqual(3);
});

Then("focusing or tapping an option shows its effects", (s) => {
  expect(eventCard(sh(s))!.effects("first")).toBe("+10 gold");
});

When("the player answers it", (s) => answerEvent(sh(s), "first"));

Then("the event of 11 May opens", (s) => expect(eventCard(sh(s))!.id).toBe("event of 11 May"));

Given("an event is open", (s) => {
  const shell = ensureCampaign(s);
  raiseEvents(shell, [{ id: "a_letter_from_rome", date: "1503-05-14", options: ["yes", "no"] }]);
  pressEndTurn(shell);
  expectTop(s, "event");
});

Then("the event shrinks into the badge on End turn", (s) => {
  expectTop(s, "map");
  expect(endTurnButton(sh(s))).toMatchObject({ icon: "event scroll", count: 1 });
});

Then("the map can be used", (s) => {
  expect(mapAccepts(sh(s), "order")).toBe(true);
  expect(sh(s).stack).toHaveLength(1);
});

Then("the event is still unanswered", (s) => {
  expect(turnOf(sh(s)).events.map((e) => e.id)).toEqual(["a_letter_from_rome"]);
  expect(turnOf(sh(s)).answered).toEqual([]);
});

Given(/^the turn (had something worth reporting|had nothing worth reporting)$/, (s, what: string) => {
  ensureCampaign(s);
  s.month = { loop: monthLoop([]), events: [], report: what === "had something worth reporting" ? ["Troyes grew", "A trader reached Venice"] : [] };
});

When("the turn ends", (s) => {
  const shell = sh(s);
  s.dateBefore = { ...shell.campaign!.date };
  push(shell, { id: "turn" });
  turnOf(shell).phase = "in progress";
  runTurn(shell, s.month);
});

Then("the report goes into the Dispatches without opening, each line jumping to its place", (s) => {
  expectTop(s, "map");
  expect(turnOf(sh(s)).report).toHaveLength(2);
  expect(dispatchesView(sh(s)).days[0]!.lines).toEqual(["Troyes grew", "A trader reached Venice"]);
  expect(dispatchesButton(sh(s)).count).toBe(2);
  // Opened from the top bar, the log is a card over the map.
  openDispatches(sh(s));
  expect(layerOf("turn_report")).toBe("card");
});

Then("no turn report opens and only the date in the top bar changes", (s) => {
  expectTop(s, "map");
  // One week later (X-18): the day moves on by 7.
  expect(sh(s).campaign!.date).toEqual(MAY_1503);
  expect(sh(s).campaign!.day).toBe(8);
  expect(s.dateBefore).toEqual(MAY_1503);
});

Given("the turn report is open", (s) => {
  push(ensureCampaign(s), { id: "turn_report" });
});

When("the player taps the map", (s) => tapEmptyMap(sh(s)));

Then("the turn report closes", (s) => expectTop(s, "map"));

// ---------------------------------------------------------------------------
// Attention

Given("a campaign as {string} is loaded in winter 1444", (s, realm: string) => {
  loadCampaign(s, realm, { year: 1444, month: 12 });
});

Then("the screen {string} opens as a card over the map", (s, id: string) => {
  expectTop(s, id as FrameId);
  expect(layerOf(id as FrameId)).toBe("card");
});

Then("the map stays in view", (s) => {
  expect(mapLoaded(sh(s))).toBe(true);
  expect(screen("attention").kind).toBe("Sheet");
});

function attentionKind(item: string): AttentionKind {
  const k = item.replace(/against "[^"]+"$/, "against you");
  if (!isAttentionKind(k)) throw new Error(`Not an Attention kind: ${item}`);
  return k;
}

Given(/^(?!the warning )(.+) applies to "([^"]+)"$/, (s, item: string, realm: string) => {
  const shell = sh(s);
  post(shell.attention, { id: "line", kind: attentionKind(item), target: { kind: "realm", name: realm }, urgency: 1 });
});

Then("a line for it is in the group {string}", (s, group: string) => {
  const lines = visibleLines(sh(s).attention);
  expect(lines).toHaveLength(1);
  expect(lines[0]!.group).toBe(group);
});

Given("{string} has {int} warnings and {int} waiting items", (s, realm: string, w: number, n: number) => {
  const shell = sh(s);
  const kinds: AttentionKind[] = ["an idle army", "a castle breached", "an empty research slot", "a rising brewing", "unspent levies"];
  const urgencies = [1, 2, 5, 7, 3];
  kinds.forEach((kind, i) => post(shell.attention, { id: `l${i}`, kind, target: { kind: "province", name: realm }, urgency: urgencies[i]! }));
  expect(visibleLines(shell.attention).filter((l) => l.group === "Warnings")).toHaveLength(w);
  expect(visibleLines(shell.attention).filter((l) => l.group === "Waiting for you")).toHaveLength(n);
});

Then("the group {string} is above the group {string}", (s, a: string, b: string) => {
  const groups = visibleLines(sh(s).attention).map((l) => l.group);
  expect(groups.lastIndexOf(a as never)).toBeLessThan(groups.indexOf(b as never));
});

Then("within each group the most urgent line is first", (s) => {
  const lines = visibleLines(sh(s).attention);
  expect(lines.map((l) => l.urgency)).toEqual([7, 2, 5, 3, 1]);
});

Given("the screen {string} shows the warning {string} for an army of {string}", (s, id: string, kind: string, realm: string) => {
  const shell = sh(s);
  post(shell.attention, { id: "hungry", kind: kind as AttentionKind, target: { kind: "army", name: `army of ${realm}` }, urgency: 3 });
  push(shell, { id: id as FrameId });
});

Then("the line has an icon, one sentence and a {string} button", (s, button: string) => {
  const line = visibleLines(sh(s).attention)[0]!;
  expect(line.icon).toBe("hunger");
  expect(line.sentence).toBe("An army hungry: army of Hungary");
  expect(line.sentence.split(/[.!?]/).filter((x) => x.trim())).toHaveLength(1);
  expect(line.button).toBe(button);
});

Then("the camera moves to the army and its card opens", (s) => {
  expect(sh(s).camera.on).toBe("army of Hungary");
  expect(topCard(sh(s))).toEqual({ kind: "army", name: "army of Hungary" });
});

const IDLE: AttentionKind = "an idle army";

Given("the screen {string} shows {int} lines of the kind {string}", (s, id: string, n: number, kind: string) => {
  expect(`an ${kind}`).toBe(IDLE);
  const shell = sh(s);
  for (let i = 0; i < n; i++) post(shell.attention, { id: `idle-${i + 1}`, kind: IDLE, target: { kind: "army", name: `army ${i + 1}` }, urgency: 1 });
  push(shell, { id: id as FrameId });
});

When(/^the player mutes one line (by a long press|by the button on the line) for (this item|every item of its kind)$/, (s, _how: string, scope: string) => {
  s.muted = mute(sh(s).attention, "idle-1", scope === "this item" ? "item" : "kind");
});

Then("that line is hidden and the other line of the kind stays", (s) => {
  expect(visibleLines(sh(s).attention).map((l) => l.id)).toEqual(["idle-2"]);
});

Then("both lines are hidden and {string} is listed at the bottom as muted", (s, kind: string) => {
  expect(visibleLines(sh(s).attention)).toEqual([]);
  expect([...sh(s).attention.mutedKinds]).toEqual([`an ${kind}`]);
  expect(s.muted).toEqual({ type: "AttentionMuteChanged", kind: `an ${kind}` });
});

Given("the kind {string} is muted", (s, kind: string) => {
  const shell = sh(s);
  post(shell.attention, { id: "idle-1", kind: `an ${kind}` as AttentionKind, target: { kind: "army", name: "army 1" }, urgency: 1 });
  mute(shell.attention, "idle-1", "kind");
  expect(visibleLines(shell.attention)).toEqual([]);
});

When("the player unmutes {string} from the bottom of the screen {string}", (s, kind: string, id: string) => {
  push(sh(s), { id: id as FrameId });
  unmuteKind(sh(s).attention, `an ${kind}` as AttentionKind);
});

Then("lines of the kind {string} are shown again", (s, kind: string) => {
  expect(visibleLines(sh(s).attention).map((l) => l.kind)).toEqual([`an ${kind}`]);
});

Given("the warnings table in the config defines the warning {string}", (s, kind: string) => {
  expect(isAttentionKind(kind)).toBe(true);
  s.kind = kind;
});

When("the warning applies to {string}", (s, place: string) => {
  post(sh(s).attention, { id: "famine", kind: s.kind, target: { kind: "province", name: place }, urgency: 5 });
});

Then("its line says that famine is coming in {string}", (s, place: string) => {
  const line = visibleLines(sh(s).attention)[0]!;
  expect(line.group).toBe("Warnings");
  expect(line.sentence).toBe(`Famine in a province within two months: ${place}`);
});

Then("the line gives no advice on what to do", (s) => {
  const line = visibleLines(sh(s).attention)[0]!;
  expect(line.sentence).not.toMatch(/\b(should|must|build|buy|send|move|consider|try)\b/i);
});

// ---------------------------------------------------------------------------
// Other in-campaign screens

Given(/^the screen "battle" was opened (by a running player battle|from the turn report as a replay|from the News as a replay)$/, (s, how: string) => {
  if (how === "by a running player battle") return stopAtTroyes(s);
  stopAtTroyes(s, "result");
  carryOn(sh(s));
  const shell = sh(s);
  while (topId(shell) !== "map") pop(shell);
  push(shell, { id: "turn_report" });
  replayBattle(shell, "Troyes", "turn_report");
});

Then("the map is shown and the battle keeps running", (s) => {
  expect(s.backResult).toBe("back to the map");
  expect(battleFrame(sh(s))).toBeUndefined();
  expect(turnOf(sh(s)).running[0]!.outcome).toBeNull();
  stepBattles(sh(s));
  expect(turnOf(sh(s)).running[0]!.step).toBe(1);
});

Then(/^(the turn report|the News) is shown$/, (s) => expectTop(s, "turn_report"));


Given("the castle of {string} is besieged", (s, castle: string) => {
  s.castle = castle;
});

When(/^the player opens the siege view from (the castle at local zoom|the castle's card)$/, (s, from: string) => {
  const shell = sh(s);
  if (from === "the castle's card") openCard(shell, { kind: "castle", name: s.castle });
  else shell.camera = { ...shell.camera, on: `the castle of ${s.castle}`, level: "Local" };
  openSiege(shell, `the castle of ${s.castle}`);
  acted(s);
});

Then("the screen {string} opens as a full screen", (s, id: string) => {
  expectTop(s, id as FrameId);
  expect(layerOf(id as FrameId)).toBe("full screen");
});

Then("the map is shown at the castle of {string}", (s, castle: string) => {
  const shell = sh(s);
  while (topId(shell) === "card") back(shell);
  expectTop(s, "map");
  expect(shell.camera.on).toBe(`the castle of ${castle}`);
});

When(/^the player opens the peace table from (the tab "Diplomacy"|the country card of "England")$/, (s, from: string) => {
  const shell = sh(s);
  if (from === 'the tab "Diplomacy"') openRealmBook(shell, "Diplomacy");
  else openCard(shell, { kind: "country", name: "England" });
  s.peaceFrom = top(shell)!;
  openPeace(shell, from);
  acted(s);
});

Then("the screen {string} opens as a modal", (s, id: string) => {
  expectTop(s, id as FrameId);
  expect(layerOf(id as FrameId)).toBe("modal");
});

Then(/^Back returns to (the tab "Diplomacy"|the country card of "England")$/, (s) => {
  back(sh(s));
  expect(top(sh(s))).toBe(s.peaceFrom);
});

Given("{string} sends a peace offer to {string}", (s, from: string, to: string) => {
  ensureCampaign(s);
  s.offer = { from, to };
});

When("the peace table opens for the offer", (s) => {
  s.peace = openPeace(sh(s), "an incoming offer");
});

Then("the offer cannot be dismissed", (s) => {
  expect(peaceOptions(s.peace)).not.toContain("close");
});

Then("the player can answer it or put it off one turn", (s) => {
  expect(peaceOptions(s.peace)).toEqual(["answer", "put off one turn"]);
  expect(back(sh(s))).toBe("put off");
});

When("the player opens the map mode picker from the tool column", (s) => {
  openLensPicker(sh(s));
});

Then("it is a small pop-over that returns to the map", (s) => {
  expect(screen("lens_picker").kind).toBe("Pop-over");
  back(sh(s));
  expectTop(s, "map");
});

When("the player starts a destructive action", (s) => {
  openRealmBook(sh(s), "Military");
  s.below = { ...top(sh(s))! };
  confirmDestructive(sh(s), "dismiss an army");
});

Then("a small confirmation modal is shown", (s) => {
  expectTop(s, "confirmation");
  expect(layerOf("confirmation")).toBe("modal");
});

When("the player cancels it", (s) => {
  back(sh(s));
});

Then("the screen below is shown unchanged", (s) => expect(top(sh(s))).toEqual(s.below));

// ---------------------------------------------------------------------------
// How a campaign ends

const HIGHS = { largestSize: 41, yearsLasted: 33, battlesWon: 12 };

When(/^("[^"]+" is annexed|"[^"]+" loses every province|"[^"]+" is divided between "[^"]+" and the Empire) in (\d{4})$/, (s, cause: string, year: string) => {
  const realm = sh(s).campaign!.realm;
  // Only the division line is given word for word (SHELL-094); the other causes are shown as stated.
  const divided = cause.match(/^"([^"]+)" is divided between "([^"]+)" and the Empire$/);
  const line = divided ? `${divided[1]} was divided between ${divided[2]} and the Empire` : cause.replaceAll('"', "");
  expect(line).toContain(realm);
  s.over = gameOver(sh(s), { line, year: Number(year) }, HIGHS);
  acted(s);
});

Then("the map zooms out over the old borders of {string}", (s, realm: string) => {
  expect(sh(s).camera).toMatchObject({ level: "World", on: `the old borders of ${realm}` });
});

Then("a card says how it ended in one line with the date {int}", (s, year: number) => {
  expect(s.over.line).not.toContain("\n");
  expect(s.over.line.endsWith(` · ${year}`)).toBe(true);
});

Then("the card shows the realm's largest size, years lasted and battles won", (s) => {
  expect(s.over.highs).toEqual(HIGHS);
});

Then("the game over card reads {string}", (s, line: string) => expect(s.over.line).toBe(line));

Given("the screen {string} is shown for {string}", (s, id: string, realm: string) => {
  expect(id).toBe("game_over");
  loadCampaign(s, realm);
  s.over = gameOver(sh(s), { line: `${realm} was annexed`, year: 1477 }, HIGHS);
});

Then("the News opens read-only", (s) => {
  expect(s.picked).toEqual({ news: "read only" });
  expect(top(sh(s))).toMatchObject({ id: "turn_report", subject: "read only" });
});

Then("the player can pick any realm on the current map", (s) => {
  expect(s.picked).toEqual({ pick: ["France", "England", "Castile"] });
});


Then("the button {string} says {string} before it is pressed", (s, label: string, says: string) => {
  expect(playOnButton()).toEqual({ label, says });
  expect(s.over.choices).toContain(label);
});

When("the player plays on as {string}", (s, realm: string) => {
  s.playOn = playOn(sh(s), realm);
});

Then("the campaign continues as {string}", (s, realm: string) => {
  expect(sh(s).campaign!.realm).toBe(realm);
  expectTop(s, "map");
});

Then("the campaign can no longer earn achievements", (s) => {
  expect(sh(s).campaign!.canEarnAchievements).toBe(false);
  expect(sh(s).events).toContainEqual({ type: "PlayedOnAsAnotherRealm", realm: sh(s).campaign!.realm });
});

Then("the choice cannot be undone", (s) => expect(s.playOn).toEqual({ undoable: false }));

Given("a campaign as {string} with the end date 31 August 1939", (s, realm: string) => {
  loadCampaign(s, realm, { year: 1939, month: 8 });
  expect(sh(s).campaign!.endDate).toBe("1939-08-31");
  s.clock = newCampaign(loadDefaultRuleset(), 1, { endDate: "1939-08-31" });
});

When("the date reaches 31 August 1939", (s) => {
  expect(endDateReached(sh(s), "1939-08-31")).toBe(true);
  expect(endDateReached(sh(s), "1939-08-30")).toBe(false);
  startCampaignEnd(sh(s), [
    { id: "wrap-up: the world in 1939", date: "1939-08-31", options: ["Carry on"] },
    { id: "wrap-up: the realm of France", date: "1939-08-31", options: ["Carry on"] },
  ]);
  endCampaign(s.clock, "end date");
});

Then("the final wrap-up events open as normal event cards", (s) => {
  expect(top(sh(s))).toMatchObject({ id: "event", subject: "wrap-up: the world in 1939" });
  answerEvent(sh(s), "Carry on");
  expect(top(sh(s))).toMatchObject({ id: "event", subject: "wrap-up: the realm of France" });
  answerEvent(sh(s), "Carry on");
});

Then("then the map at world zoom steps through the borders of {string} by era while the track {string} plays", (s, _realm: string, track: string) => {
  const seq = closingSequence(sh(s), ["1444", "1600", "1789", "1914", "1939"]);
  expect(seq).toEqual({ zoom: "World", eras: ["1444", "1600", "1789", "1914", "1939"], track });
});

Then("then the screen {string} opens", (s, id: string) => {
  finalResult(sh(s), { ledger: [], outcome: "", achievements: [] });
  expectTop(s, id as FrameId);
});

Then("the campaign cannot be played past the end date", (s) => {
  expect(canPlayOnPastEnd(sh(s))).toBe(false);
  expect(endTurn(s.clock, 0)).toEqual({ ended: false, reason: "campaign over" });
});

Given("a new campaign is begun with the end date chosen on the options step", (s) => {
  s.clock = newCampaign(loadDefaultRuleset(), 1, { endDate: "1821-05-05" });
});

When("the campaign is loaded later", (s) => {
  const saved = requestSave(s.clock);
  s.loaded = campaignOf(saved, s.clock.rules);
  s.sh = newShell();
  enterCampaign(s.sh, { realm: "France", date: { year: 1444, month: 11 }, endDate: s.loaded.rules.endDate });
});

Then("its end date is the one chosen when it started", (s) => {
  expect(s.loaded.rules.endDate).toBe("1821-05-05");
  expect(sh(s).campaign!.endDate).toBe("1821-05-05");
  expect(Object.isFrozen(s.clock.rules)).toBe(true);
});

Then("it shows the ledger comparison and the final outcome", (s) => {
  expect(s.final.ledger.length).toBeGreaterThan(0);
  expect(s.final.outcome).toBeTruthy();
  expect(s.final.choices).toEqual(["Main menu", "Credits"]);
});

Then("it shows the achievements earned in this campaign", (s) => expect(s.final.achievements).toEqual([]));

// ---------------------------------------------------------------------------
// Interruptions

Given("nothing changed since the last save", (s) => {
  expect(sh(s).campaign!.changedSinceSave).toBe(false);
});

When("the app goes to the background", (s) => {
  s.bg = appBackgrounded(sh(s));
});

Then("no save is written", (s) => {
  expect(s.bg.saved).toBe(false);
  expect(sh(s).events.some((e) => e.type === "SaveRequested")).toBe(false);
});

Then("sound is suspended", (s) => expect(s.bg.soundSuspended).toBe(true));

Given("the player was on the tab {string} of the Realm book scrolled halfway", (s, tab: string) => {
  openRealmBook(sh(s), tab).scroll = 0.5;
  sh(s).camera = { x: 120, y: 80, zoom: 3 };
});

When(/^(the app comes back while still in memory|the Steam Deck resumes from suspend)$/, (s) => {
  const was = appBackgrounded(sh(s));
  sh(s).stack = [];
  s.resumed = appResumed(sh(s), was);
  acted(s);
});

Then("the tab {string} of the Realm book is shown at the same scroll and camera", (s, tab: string) => {
  expect(top(sh(s))).toMatchObject({ id: "realm_book", tab, scroll: 0.5 });
  expect(sh(s).camera).toEqual({ x: 120, y: 80, zoom: 3 });
  expect(s.resumed.titleShown).toBe(false);
});

Given("the app went to the background", (s) => {
  sh(s).campaign!.changedSinceSave = true;
  s.bg = appBackgrounded(sh(s));
  expect(s.bg.saved).toBe(true);
  s.summary = { realm: sh(s).campaign!.realm, date: sh(s).campaign!.date, borders: "background save" };
});

Given("the system closed the app", (s) => {
  s.sh = newShell();
  s.profile = { ...newProfile(), firstRunDone: true };
});

Then("{string} points at the save written when the app went to the background", (s, entry: string) => {
  const menu = startColumn({ campaign: s.summary, saves: 1, tutorialFinished: true, platform: sh(s).platform, edition: sh(s).edition });
  expect(menu[0]).toMatchObject({ label: entry, detail: campaignLabel("Portugal", MAY_1503) });
  expect(s.summary.borders).toBe("background save");
});

When("the player continues", (s) => {
  const shell = sh(s);
  firstStartInput(shell, "touch");
  continueCampaign(shell, s.summary, "background save");
  loadingFinished(shell);
  s.strip = pickedUpStrip();
});

Then("the map shows the strip {string}", (s, text: string) => {
  expectTop(s, "map");
  expect(s.strip).toBe(text);
});

Given("a turn is being worked out", (s) => {
  const shell = sh(s);
  push(shell, { id: "turn" });
  turnOf(shell).phase = "in progress";
});

When("the app goes to the background and is killed and restarted", (s) => {
  s.bg = appBackgrounded(sh(s));
  s.restartFrom = saveAfterKillDuringTurn();
});

Then("the worker paused with the app and the turn carries on", (s) => {
  expect(s.bg.workerPaused).toBe(true);
  expect(s.resumed.turnCarriesOn).toBe(true);
  expectTop(s, "turn");
});

Then("the Resume save and the orders journal are used", (s) => expect(s.restartFrom).toBe("the Resume save and the orders journal"));

Given(/^the unlock flow was opened from (the realm picker on "Castile"|the main menu)$/, (s, place: string) => {
  const shell = sh(s);
  s.profile = { ...newProfile(), sessions: 3, firstRunDone: true };
  replaceAll(shell, { id: "title" });
  push(shell, { id: "main_menu" });
  if (place === "the main menu") {
    s.flow = openUnlock(shell, { online: true }).flow;
  } else {
    s.nc = openNewCampaign(shell, { suggested: SUGGESTED, lastOptions: [] });
    tapRealm(shell, s.nc, "Castile");
    s.flow = openUnlock(shell, { realm: "Castile", online: true }).flow;
  }
  expectTop(s, "unlock");
});

When(/^the purchase (succeeds|is cancelled|fails)$/, (s, outcome: string) => {
  s.purchase = purchaseResult(sh(s), s.flow, outcome as "succeeds" | "is cancelled" | "fails", s.profile);
});

Then(/^(the realm picker on "Castile"|the main menu) is shown again$/, (s, place: string) => {
  expect(s.purchase.at).toBe(place === "the main menu" ? "main_menu" : "new_campaign");
});

Then("the realm {string} is chosen", (s, realm: string) => {
  expect(s.purchase.chosen).toBe(realm);
  expect(s.nc.realm).toBe(realm);
});

Then("every realm is unlocked", (s) => {
  expect(s.profile.purchased).toBe(true);
  expect(sh(s).edition).toBe("full game");
  expect(realmLocked(sh(s).edition, "Castile")).toBe(false);
  expect(fullGameRibbon(sh(s).edition)).toBeNull();
});

Then("no message beyond the store's own is shown", (s) => expect(s.purchase.message).toBeNull());

When("the player opens the unlock flow", (s) => {
  s.depth = sh(s).stack.length;
  s.unlock = openUnlock(sh(s), { online: s.device.online });
});

Then("it shows {string}", (s, message: string) => expect(s.unlock.message).toBe(message));

Then("nothing else in the game is blocked", (s) => {
  expect(sh(s).stack.length).toBe(s.depth);
  expectTop(s, "map");
  expect(mapAccepts(sh(s), "order")).toBe(true);
});

Given(/^(the engine worker crashes|a save won't read)$/, (s, what: string) => {
  s.failureKind = what;
});

Given(/^a crash reporter (is approved|is not approved)$/, (s, approved: string) => {
  s.reporter = approved === "is approved";
});

When("the failure happens", (s) => {
  s.failureScreen = failureScreen(sh(s), s.failureKind, s.reporter);
});

Then("the screen {string} says what failed in plain words", (s, id: string) => {
  expectTop(s, id as FrameId);
  expect(s.failureScreen.says.toLowerCase()).toContain(s.failureKind);
});

Then("it offers {string}", (s, options: string) => {
  if (!s.failureScreen) {
    expect(s.final.choices.join(", ")).toBe(options);
    return;
  }
  expect(s.failureScreen.options.join(", ")).toBe(options);
  restoreLastSave(sh(s));
  expect(sh(s).events).toContainEqual({ type: "CampaignLoadRequested", save: "Resume save" });
});

Then("no stack trace is shown", (s) => {
  expect(s.failureScreen.stackTrace).toBe(false);
  expect(s.failureScreen.says).not.toMatch(/\bat \w+ \(|Error:/);
});

// ---------------------------------------------------------------------------
// Layout by window shape

const LAYOUT_WINDOWS: Record<string, Window> = {
  "a phone in landscape with a height under 500 css px": { width: 844, height: 390, device: "phone" },
  "a tablet in portrait": { width: 820, height: 1180, device: "tablet" },
  "a desktop window taller than wide": { width: 900, height: 1300, device: "desktop" },
  "a tablet in landscape": { width: 1180, height: 820, device: "tablet" },
  "a desktop window wider than tall": { width: 1600, height: 900, device: "desktop" },
  "a Steam Deck at 1280 × 800": { width: 1280, height: 800, device: "Steam Deck" },
  "a TV chosen in Settings": { width: 1920, height: 1080, device: "desktop", farChosen: true },
  "a Steam Machine detected on a TV output": { width: 1920, height: 1080, device: "Steam Machine", tvOutput: true },
};

Given(/^the window is (a .+)$/, (s, name: string) => {
  const w = LAYOUT_WINDOWS[name];
  if (!w) throw new Error(`window ${name}`);
  sh(s).window = w;
});

When("a campaign is shown", (s) => {
  const shell = ensureCampaign(s);
  shell.shape = classifyShape(shell.window);
  s.layout = layoutFor(shell.shape);
  acted(s);
});

Then("the map comes first", (s) => expect(s.layout.mapFirst).toBe(true));
Then("cards are side sheets on the left", (s) => expect(s.layout.card).toMatchObject({ kind: "side sheet", side: "left" }));
Then("the Realm book's sections are one row of icons with names", (s) => expect(s.layout.bookTabs).toMatchObject({ place: "top row", names: true }));
Then("the top bar is one thin row", (s) => expect(s.layout.topBar).toBe("one thin row"));
Then("cards are bottom sheets", (s) => expect(s.layout.card.kind).toBe("bottom sheet"));

Then("the tool column is on the right edge above the End turn button", (s) => {
  expect(s.layout.toolColumn).toBe("right edge above End turn");
  const shell = sh(s);
  const hud = mapHud({ width: shell.window.width, height: shell.window.height, shape: shell.shape });
  const end = hud.find((r) => r.name === "End turn")!;
  for (const name of toolColumn()) {
    const r = hud.find((x) => x.name === name)!;
    expect(r.x).toBe(end.x);
    expect(r.y + r.h).toBeLessThan(end.y);
  }
});

Then("side sheets have a fixed width", (s) => expect(s.layout.card).toMatchObject({ kind: "side sheet", fixedWidth: true }));
Then("menus are centred with a maximum width", (s) => expect(s.layout.menus).toBe("centred, maximum width"));
Then("nothing stretches edge to edge", (s) => expect(s.layout.stretchesEdgeToEdge).toBe(false));

Then("the layout is the Large layout", (s) => {
  const large = layoutFor("Large");
  expect(s.layout.bookTabs).toEqual(large.bookTabs);
  expect(s.layout.menus).toBe(large.menus);
  expect(s.layout.card.kind).toBe("side sheet");
});

Then("the UI scale is raised so body text is about 1\\/30 of the screen height", (s) => {
  expect(s.layout.bodyTextShare).toBeCloseTo(1 / 30, 5);
  expect(s.layout.card).toMatchObject({ raisedScale: true });
});

Then("focus frames are thicker", (s) => expect(s.layout.focusFrame).toBe("thick"));

Then("nothing is drawn in the outer 5 % of the screen", (s) => {
  const shell = sh(s);
  const { width, height } = shell.window;
  expect(s.layout.overscanShare).toBe(0.05);
  for (const r of mapHud({ width, height, shape: shell.shape })) {
    expect(r.x).toBeGreaterThanOrEqual(width * 0.05);
    expect(r.y + r.h).toBeLessThanOrEqual(height * 0.95);
  }
});

const OBSTACLES = {
  "a notch": { top: 0, right: 0, bottom: 0, left: 47 },
  "rounded corners": { top: 12, right: 12, bottom: 12, left: 12 },
  "a home indicator": { top: 0, right: 0, bottom: 34, left: 0 },
};

Given(/^the device has (a notch|rounded corners|a home indicator)$/, (s, obstacle: keyof typeof OBSTACLES) => {
  s.safe = OBSTACLES[obstacle];
});

Then(/^no button is under the (a notch|rounded corners|a home indicator)$/, (s) => {
  const { width, height } = sh(s).window;
  const breaks = checkTouchRules(s.hud, { width, height, safe: s.safe });
  expect(breaks.filter((b) => b.rule === "safe area")).toEqual([]);
});

Given(/^the device is (a phone|a tablet|a desktop window)$/, (s, device: string) => {
  s.device = device;
  const w: Record<string, Window> = {
    "a phone": { width: 844, height: 390, device: "phone" },
    "a tablet": { width: 1180, height: 820, device: "tablet" },
    "a desktop window": { width: 1600, height: 900, device: "desktop" },
  };
  s.sh = newShell({ window: w[device]! });
});

When("it is held upright on the screen {string}", (s, id: string) => {
  const shell = sh(s);
  if (id === "map") ensureCampaign(s);
  else replaceAll(shell, { id: id as FrameId });
  shell.window = { ...shell.window, width: shell.window.height, height: shell.window.width };
  shell.shape = classifyShape(shell.window);
  s.notice = portraitNotice(shell.window);
});

Then("the notice {string} is shown", (s, text: string) => expect(s.notice).toBe(text));

Then("the Tall layout is used", (s) => {
  expect(s.notice).toBeNull();
  expect(sh(s).shape).toBe("Tall");
});

Given("the interface is at its default scale", (s) => {
  s.sh = newShell({ platform: "Android" });
});

When("any screen is shown", (s) => {
  const shell = sh(s);
  s.hud = mapHud({ width: shell.window.width, height: shell.window.height, shape: shell.shape });
});

Then("every tap target is at least 44 × 44 points", (s) => {
  expect(tapTargetMin("Normal")).toBe(44);
  for (const r of s.hud) expect(Math.min(r.w, r.h)).toBeGreaterThanOrEqual(44);
});

Then("neighbouring targets are at least 8 points apart", (s) => {
  const { width, height } = sh(s).window;
  expect(checkTouchRules(s.hud, { width, height }).filter((b) => b.rule === "gap")).toEqual([]);
});

Given('the button "End turn" is shown', (s) => {
  ensureCampaign(s);
});

When('the button "End turn" is laid out', (s) => {
  const shell = sh(s);
  s.hud = mapHud({ width: shell.window.width, height: shell.window.height, shape: shell.shape });
});

Then("it is not next to a frequent button", (s) => {
  const { width, height } = sh(s).window;
  expect(checkTouchRules(s.hud, { width, height }).filter((b) => b.rule === "risky next to frequent")).toEqual([]);
});

Then("it is not at the very edge of the screen", (s) => {
  const { width, height } = sh(s).window;
  expect(checkTouchRules(s.hud, { width, height }).filter((b) => b.rule === "risky at edge")).toEqual([]);
});

Given("a campaign is loaded", (s) => {
  ensureCampaign(s);
});

Then("the End turn button and the game menu button are in opposite corners", (s) => {
  const { width, height } = sh(s).window;
  const end = s.hud.find((r: { name: string }) => r.name === "End turn");
  const menu = s.hud.find((r: { name: string }) => r.name === "game menu");
  expect(oppositeCorners(cornerOf(end, width, height), cornerOf(menu, width, height))).toBe(true);
});

// ---------------------------------------------------------------------------
// Navigation by input

const DEVICES: Record<string, InputDevice> = { touch: "touch", keyboard: "keyboard", controller: "controller", mouse: "mouse" };

Given("the game runs on {string} with {string}", (s, platform: string, device: string) => {
  s.sh = newShell({ platform: PLATFORMS[platform]! });
  s.inputDevice = DEVICES[device];
});

Given("the province card of {string} is open over the map", (s, province: string) => {
  openCard(ensureCampaign(s), { kind: "province", name: province });
});

When("the player uses {string}", (s, input: string) => {
  s.backResult = routeInput(sh(s), s.inputDevice, input);
});

Then("the province card closes", (s) => {
  expect(s.backResult).toBe("popped");
  expectTop(s, "map");
});

When("the player swipes from the left edge", (s) => {
  s.swipe = edgeSwipe(sh(s));
});

Then("the Realm book closes", (s) => {
  expect(s.swipe).toBe("popped");
  expectTop(s, "map");
});

Then("the map pans and nothing closes", (s) => {
  expect(s.swipe).toBe("map pans");
  expectTop(s, "map");
});

Given("the screen {string} is shown with nothing open on it", (s, id: string) => {
  const shell = sh(s);
  if (id === "map") ensureCampaign(s);
  else if (id === "main_menu") {
    replaceAll(shell, { id: "title" });
    push(shell, { id: "main_menu" });
  } else replaceAll(shell, { id: id as FrameId });
});

Then("the app is left", (s) => {
  expect(s.backResult).toBe("left the app");
  expect(sh(s).leftApp).toBe(true);
});

When("the player drags", (s) => {
  s.gesture = cardFrame(sh(s)) ? panelTouch("drag") : mapTouch({ drag: true });
});

When("the player pinches", (s) => {
  s.gesture = cardFrame(sh(s)) ? panelTouch("pinch") : mapTouch({ pinch: true });
});

When("the player long-presses the province {string}", (s, province: string) => {
  s.gesture = mapTouch({ longPress: province });
  s.selectionBefore = sh(s).selection;
});

When(/^the player taps the army "([^"]+)" then (?:the province "([^"]+)"|its own province)$/, (s, army: string, province?: string) => {
  s.gesture = mapTouch({ tapArmy: army, thenProvince: province ?? "Orléans", armyAt: "Orléans" });
});

Then("the map pans", (s) => expect(s.gesture.does).toBe("pan"));
Then("the map zooms", (s) => expect(s.gesture.does).toBe("zoom"));

Then("what is under the finger is shown without selecting it", (s) => {
  expect(s.gesture).toMatchObject({ does: "show under finger", selects: false });
  expect(sh(s).selection).toBe(s.selectionBefore);
});

Then("the army is ordered to march to {string}", (s, province: string) => expect(s.gesture).toMatchObject({ does: "march", target: province }));
Then("the army halts", (s) => expect(s.gesture.does).toBe("halt"));

When("the player taps a button", (s) => {
  s.gesture = panelTouch("tap");
});

When("the player long-presses a stat", (s) => {
  s.gesture = panelTouch("long press");
});

Then("the button is pressed", (s) => expect(s.gesture).toBe("press"));
Then("the card scrolls", (s) => expect(s.gesture).toBe("scroll"));
Then("nothing happens", (s) => expect(s.gesture).toBe("nothing"));

Then("the stat's explanation is shown, the same text as a desktop tooltip", (s) => {
  expect(s.gesture).toBe("explain");
  expect(desktopInput("hover")).toBe("explain");
});

Given("any action the game offers", (s) => {
  s.actions = ACTIONS;
});

When("the player looks for the way to do it", (s) => {
  s.unreachable = s.actions.filter((a: { tap: boolean; controller: boolean }) => !a.tap && !a.controller);
});

Then("it can be reached by tap or by a controller", (s) => expect(s.unreachable).toEqual([]));

Then("no action exists only as a long press or only as a hover", (_s) => expect(longPressOrHoverOnly()).toEqual([]));

Given("a controller is in use", (s) => {
  s.inputDevice = "controller";
});

When("any screen opens", (s) => {
  s.focus = (["main_menu", "map", "game_menu", "attention", "final_result"] as FrameId[]).map((id) => firstFocus(id, s.inputDevice));
});

Then("its defined first focus has the gold focus frame", (s) => {
  for (const f of s.focus) expect(f.frame).toBe("gold");
  expect(s.focus.map((f: { element: string }) => f.element)).toEqual(["Play", "your capital or last army", "Return to the map", "first warning", "Main menu"]);
  expect(firstFocus("map", "touch")).toBeNull();
});

Then("moving focus follows reading order", (_s) => {
  const order = focusOrder([
    { name: "Load", x: 10, y: 80 },
    { name: "Continue", x: 10, y: 0 },
    { name: "New campaign", x: 10, y: 40 },
    { name: "Quit", x: 200, y: 80 },
  ]);
  expect(order.map((e) => e.name)).toEqual(["Continue", "New campaign", "Load", "Quit"]);
});

Given("the game runs on a Steam Deck", (s) => {
  s.sh = newShell({ platform: "Steam Deck" });
});

When(/^the player uses (the right trackpad|the left stick)$/, (s, control: string) => {
  s.pointer = mapPointer(control === "the right trackpad" ? "trackpad" : "stick");
});

Then(/^the map shows (the mouse pointer|the stick cursor)$/, (s, pointer: string) => expect(s.pointer).toBe(pointer));

const PROMPT_DEVICES: Record<string, PromptDevice> = {
  touch: "touch",
  "an Xbox controller": "Xbox",
  "a PlayStation controller": "PlayStation",
  "a Steam Controller": "Steam",
  "a Switch-style controller": "Switch-style",
  "a keyboard": "keyboard",
};

When("the player last used {string}", (s, device: string) => {
  s.prompts = prompts(PROMPT_DEVICES[device]!);
});

Then(/^the prompts shown are (.+)$/, (s, shown: string) => expect(s.prompts).toBe(shown));

Given("the player last used a keyboard", (s) => {
  s.prompts = prompts("keyboard");
});

When("the player presses a button on an Xbox controller", (s) => {
  s.prompts = prompts("Xbox");
});

Then("Xbox glyphs are shown at once", (s) => expect(s.prompts).toBe("Xbox glyphs"));

When("a text field opens", (s) => {
  s.field = textField(s.platformName, "France · May 1503");
});

Then("it has a filled-in default that can be confirmed without typing", (s) => {
  expect(s.field.value).not.toBe("");
  expect(s.field.confirmable).toBe(true);
});

Then(/^typing uses (.+)$/, (s, keyboard: string) => expect(s.field.keyboard).toBe(keyboard));

Given("a mouse and keyboard are in use", (s) => {
  s.inputDevice = "keyboard";
});

When("the player hovers over a stat", (s) => {
  s.desktop = desktopInput("hover");
});
When("the player presses Enter on the focused button", (s) => {
  s.desktop = desktopInput("Enter");
});
When("the player presses Tab", (s) => {
  s.desktop = desktopInput("Tab");
});
When("the player presses the End turn key", (s) => {
  s.desktop = desktopInput("End turn key");
});

Then("the stat's explanation is shown", (s) => expect(s.desktop).toBe("explain"));
Then("Back is done", (s) => {
  expect(s.desktop).toBe("Back");
  expect(s.backResult).toBe("popped");
});
Then("the button is selected", (s) => expect(s.desktop).toBe("select"));
Then("focus moves to the next element", (s) => expect(s.desktop).toBe("next focus"));
Then("End turn is pressed", (s) => expect(s.desktop).toBe("End turn"));


// ---------------------------------------------------------------------------
// Decided 17 October (spec §13, D-SHELL-n)

// Needs attention: mutes, explanations and the title (SHELL-083, SHELL-087, SHELL-088)

When("the player presses {string} on one line", (s, label: string) => {
  const b = muteButtons().find((x) => x.label === label);
  if (!b) throw new Error(`No mute button ${label}`);
  s.muted = mute(sh(s).attention, "idle-1", b.scope);
});

Then("the mutes are kept in the save", (s) => {
  const saved = mutesForSave(sh(s).attention);
  expect(saved.items.length + saved.kinds.length).toBe(1);
  expect(JSON.parse(JSON.stringify(saved))).toEqual(saved);
});

When("the player long-presses one line", (s) => {
  s.explained = explainLine(sh(s).attention.lines[0]!);
  expect(panelTouch("long press")).toBe("explain");
});

Then("its explanation is shown with the buttons {string} and {string}", (s, a: string, b: string) => {
  expect(s.explained.buttons).toEqual([a, b]);
});

Then("the line itself has the same two buttons", (s) => {
  expect(muteButtons().map((b) => b.label)).toEqual(s.explained.buttons);
  expect(longPressOrHoverOnly()).toEqual([]);
});

Then("its title reads {string}", (s, title: string) => {
  expectTop(s, "attention");
  expect(attentionTitle()).toBe(title);
  expect(screen("attention").name).toBe(title);
});

Given("{string} has {int} open warnings", (s, realm: string, n: number) => {
  postLines(sh(s), Array.from({ length: n }, () => "a rising brewing" as AttentionKind), realm);
});

Then("the turn starts", (s) => {
  expectTop(s, "turn");
  expect(turnOf(sh(s)).phase).toBe("in progress");
});

// Winning (SHELL-098, SHELL-099, SHELL-129, SHELL-130)

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

Given("{string} owns or holds as subjects {int} of the world's {int} settled land provinces", (s, realm: string, held: number, settled: number) => {
  expect(sh(s).campaign!.realm).toBe(realm);
  s.held = held;
  s.settled = settled;
});

When(/^the turn of (\w+) (\d{4}) ends$/, (s, month: string, year: string) => {
  const m = MONTHS.indexOf(month) + 1;
  expect(m).toBeGreaterThan(0);
  sh(s).campaign!.date = { year: Number(year), month: m };
  s.won = checkDomination(sh(s), m, s.held, s.settled);
  if (s.won) startCampaignEnd(sh(s), [], "world domination");
  acted(s);
});

Then("the win {string} fires and campaign end starts", (s, win: string) => {
  expect(s.won).toBe(true);
  expect(sh(s).campaign!.wins).toEqual([win]);
  expect(sh(s).events).toContainEqual({ type: "VictoryReached", realm: sh(s).campaign!.realm, win });
  closingSequence(sh(s), ["1444", "1600"]);
  expectTop(s, "campaign_end");
});

Then("no win fires", (s) => {
  expect(s.won).toBe(false);
  expect(sh(s).campaign!.wins ?? []).toEqual([]);
  expectTop(s, "map");
});

Given("a campaign as {string} has won by world domination in January 1700", (s, realm: string) => {
  const shell = loadCampaign(s, realm, { year: 1700, month: 1 });
  expect(checkDomination(shell, 1, 1100, 2000)).toBe(true);
  startCampaignEnd(shell, [], "world domination");
  closingSequence(shell, ["1444", "1700"]);
  s.final = finalResult(shell, { ledger: ["Ottomans"], outcome: "Victory: World domination", achievements: [] });
  acted(s);
});

Then("the campaign can be played until its end date", (s) => {
  expect(canPlayOnPastEnd(sh(s))).toBe(true);
  expect(endDateReached(sh(s), "1700-02-01")).toBe(false);
  expect(sh(s).events).toContainEqual({ type: "KeptPlaying" });
  expect(sh(s).campaign!.wins).toEqual(["World domination"]);
});

Given("at the end date the scores are:", (s, table: string[][]) => {
  const [head, ...rows] = table;
  expect(head).toEqual(["realm", "Economy", "Power", "Technology"]);
  s.scores = rows.map(([realm, e, p, tech]) => ({ realm: realm!, Economy: Number(e), Power: Number(p), Technology: Number(tech) })) satisfies RealmScores[];
});

When("the end date is reached in a campaign as {string}", (s, realm: string) => {
  const shell = loadCampaign(s, realm, { year: 1939, month: 8 });
  expect(endDateReached(shell, "1939-08-31")).toBe(true);
  startCampaignEnd(shell, [], "end date");
  s.outcome = outcomeOf(realm, s.scores, { atEndDate: true });
  s.ledger = ledger(realm, s.scores);
});

Then("the outcome reads {string}", (s, line: string) => expect(s.outcome.line).toBe(line));

Then("the ledger shows {string}", (s, realms: string) => {
  expect(s.ledger.map((r: RealmScores) => r.realm).join(", ")).toBe(realms);
});

Given("a campaign as {string} that is not ironman reaches its end date", (s, realm: string) => {
  const shell = loadCampaign(s, realm, { year: 1939, month: 8 });
  shell.campaign!.ironman = false;
  startCampaignEnd(shell, [], "end date");
});

Then("instead of a list of achievements it reads {string}", (s, line: string) => {
  expect(s.final.achievements).toEqual([]);
  expect(s.final.achievementsLine).toBe(line);
  expect(s.final.choices).toEqual(["Main menu", "Credits"]);
});

// Game menu lines (SHELL-132)

Given("the tutorial is running on {string}", (s, name: string) => {
  const platform = PLATFORMS[name];
  if (!platform) throw new Error(`platform ${name}`);
  sh(s).platform = platform;
  s.tutorialRunning = true;
});

Given("achievements are off for this campaign", (s) => {
  ensureCampaign(s).campaign!.canEarnAchievements = false;
});

// Interruptions (SHELL-101, SHELL-135)

Given("the player has given orders since the last save", (s) => {
  sh(s).campaign!.changedSinceSave = true;
});

Then("the orders journal is written", (s) => {
  expect(s.bg.saved).toBe(true);
  expect(sh(s).events).toContainEqual({ type: "SaveRequested", reason: "background", what: "orders journal" });
});

Then("it offers one purchase, the full game, which unlocks every realm", (s) => {
  expectTop(s, "unlock");
  s.unlockScreen = unlockScreen(sh(s).platform);
  expect(s.unlockScreen).toMatchObject({ purchase: "the full game", unlocks: "every realm" });
});

Then("it shows the store's price and the buttons {string}", (s, buttons: string) => {
  expect(s.unlockScreen.price).toBe("from the store");
  expect(s.unlockScreen.buttons.join(", ")).toBe(buttons);
});

// Load (SHELL-038)

const SAVES: SaveSummary[] = [
  { id: "march-1490", banner: "France", realm: "France", date: { year: 1490, month: 3 }, savedAt: "2026-10-01T20:00", kind: "ironman" },
  { id: "may-1503", banner: "France", realm: "France", date: { year: 1503, month: 5 }, savedAt: "2026-10-15T21:30", kind: "manual" },
  { id: "january-1500", banner: "France", realm: "France", date: { year: 1500, month: 1 }, savedAt: "2026-10-12T19:10", kind: "autosave" },
];

Given(/^saves exist from May 1503, January 1500 \(autosave\) and March 1490 \(ironman\)$/, (s) => {
  s.saves = SAVES;
});

Then("the saves are listed newest first in one list, not grouped by campaign", (s) => {
  expectTop(s, "load");
  s.rows = loadList(s.saves);
  expect(s.rows.map((r: { date: string }) => r.date)).toEqual(["May 1503", "January 1500", "March 1490"]);
  expect(s.rows.every((r: object) => !("campaign" in r))).toBe(true);
});

Then("each save shows its banner, realm, in-game date, real date saved, and an autosave or ironman mark", (s) => {
  expect(s.rows.map((r: { mark: string | null }) => r.mark)).toEqual([null, "autosave", "ironman"]);
  for (const r of s.rows) expect(r).toMatchObject({ banner: "France", realm: "France", savedAt: expect.any(String) });
});

When("the player taps the save from May 1503", (s) => {
  s.card = saveCard(s.rows.find((r: { date: string }) => r.date === "May 1503"));
});

Then("its card shows {string} and {string}", (s, a: string, b: string) => expect(s.card).toEqual([a, b]));

// Controller sets and buttons (SHELL-121, SHELL-122, SHELL-134)

Given("the screen {string} is on top", (s, id: string) => {
  const shell = sh(s);
  if (id === "map") ensureCampaign(s);
  else if (["card", "realm_book", "event", "game_menu", "battle"].includes(id)) {
    ensureCampaign(s);
    openScreen(shell, id as FrameId);
  } else push(shell, { id: id as FrameId });
  s.onTop = id;
});

Then("the action set {string} is active", (s, set: string) => {
  expect(topId(sh(s))).toBe(s.onTop);
  expect(actionSet(s.onTop)).toEqual({ set, textLayer: false });
});

Then("the action set offers {string}", (s, offers: string) => {
  expect(actionSetOffers(actionSet(s.onTop).set).join(", ")).toBe(offers);
});

Then("the action set {string} is active with the Text layer on top", (s, set: string) => {
  expect(s.field.confirmable).toBe(true);
  expect(actionSet(s.onTop, true)).toEqual({ set, textLayer: true });
});

Then("the left stick moves a free cursor that snaps gently to provinces, armies and castles", (_s) => {
  expect(SHELL.mapControls["left stick"]).toBe("free cursor that snaps gently to provinces, armies and castles");
});
Then("the right stick pans", (_s) => expect(SHELL.mapControls["right stick"]).toBe("pan"));
Then("the triggers zoom", (_s) => expect(SHELL.mapControls.triggers).toBe("zoom"));
Then("d-pad right opens the next waiting item", (s) => {
  expect(SHELL.mapControls["d-pad right"]).toBe("next waiting item");
  postLines(sh(s), ["an idle army"]);
  openAttentionBy(s, "presses the controller's next button");
  expectTop(s, "attention");
  pop(sh(s));
  s.acted = false;
});

When(/^the player holds (Menu|Enter) for ([\d.]+) seconds$/, (s, button: string, secs: string) => {
  const device = button === "Menu" ? "controller" : "keyboard";
  s.hold = holdButton(device, Number(secs));
  if (s.hold === "End turn") s.endTurn = pressEndTurn(sh(s));
  else if (s.hold === "game menu") openGameMenu(sh(s));
  acted(s);
});

Then("the turn is ended", (s) => {
  expect(s.hold).toBe("End turn");
  expect(s.endTurn).toEqual({ result: "turn started" });
  expectTop(s, "turn");
});

Then("the game menu opens", (s) => {
  expect(s.hold).toBe("game menu");
  expectTop(s, "game_menu");
});

Then("the focused button is selected", (s) => {
  expect(s.hold).toBe("select");
  expectTop(s, "map");
});

Given(/^the battle viewer shows the (running|result) card (in a running turn|in a replay)$/, (s, card: string, how: string) => {
  s.battleCard = card;
  s.replay = how === "in a replay";
});

When(/^the player presses (A|B|X|Y|LB and RB|Menu)$/, (s, button: string) => {
  s.battleDoes = battleButton(button as "A" | "B" | "X" | "Y" | "LB and RB" | "Menu", s.battleCard, s.replay);
});

Then("the battle does {string}", (s, does: string) => expect(s.battleDoes).toBe(does));

When("the player taps the army {string} at {string} and then the province {string}", (s, army: string, at: string, province: string) => {
  s.gesture = mapTouch({ tapArmy: army, armyAt: at, thenProvince: province });
});

Then("the army is ordered to march to {string} with no confirm step", (s, province: string) => {
  expect(s.gesture).toEqual({ does: "march", target: province, selects: false, confirm: false });
});

// Layout (SHELL-115, SHELL-133)

Given(/^the button "(Delete save|Exit to main menu)" is shown$/, (s, button: string) => {
  s.panel = button === "Delete save" ? panelButtons("save card") : panelButtons("game_menu", sh(s).platform);
  expect(s.panel).toContain(button);
});

When(/^the button "(Delete save|Exit to main menu)" is laid out$/, (s, _button: string) => {
  s.hud = panelLayout(s.panel, sh(s).window);
});

Then(/^the End turn button is in the (\w+ \w+) corner$/, (s, corner: string) => {
  s.corners = hudCorners(s.mainHand ?? "Right");
  expect(s.corners.endTurn).toBe(corner);
});

Then(/^the game menu button is in the (\w+ \w+) corner$/, (s, corner: string) => expect(s.corners.gameMenu).toBe(corner));

Then("the two are in opposite corners", (s) => expect(areOpposite(s.corners.endTurn, s.corners.gameMenu)).toBe(true));

// New campaign (SHELL-033)

Then("the end date can be 31 August of any year from {int} to {int}, 31 August {int} by default", (_s, from: number, to: number, def: number) => {
  const c = endDateChoices();
  expect(c.dates[0]).toBe(`${from}-08-31`);
  expect(c.dates.at(-1)).toBe(`${to}-08-31`);
  expect(c.default).toBe(`${def}-08-31`);
  expect(isValidEndDate(`${from - 1}-08-31`)).toBe(false);
  expect(isValidEndDate(`${to + 1}-08-31`)).toBe(false);
});

// Main menu focus and the first-launch question (SHELL-026, SHELL-131)

Given("no campaign exists", (s) => {
  s.menuState = { campaign: null, saves: 0, tutorialFinished: false };
});

When("the main menu opens", (s) => {
  const shell = sh(s);
  openStartScreen(shell);
  s.focusOverride = startFocus({ ...menuStateOf(s), platform: shell.platform, edition: shell.edition });
  acted(s);
});

Given("the game is launched for the first time and no campaign exists", (s) => {
  openStartScreen(sh(s));
  s.firstLaunch = { asked: false, campaignExists: false };
});

Then("the question {string} is asked with {string}", (s, question: string, choices: string) => {
  s.flq = firstLaunchQuestion(s.firstLaunch);
  expect(s.flq).toMatchObject({ question });
  expect(s.flq.choices.join(", ")).toBe(choices);
  s.focusOverride = s.flq.focus;
});


Then("chapter 0 of the tutorial starts", (s) => {
  expect(s.flAnswer).toEqual({ opens: "tutorial chapter 0", guidedTurns: false });
  expect(sh(s).events).toContainEqual({ type: "FirstLaunchAnswered", choice: "Play the tutorial" });
});

Then(/^the screen "new_campaign" opens with guided first turns (on|off)$/, (s, on: string) => {
  expectTop(s, "new_campaign");
  expect(s.flAnswer).toEqual({ opens: "new_campaign", guidedTurns: on === "on" });
});

Given("the first-launch question was answered", (s) => {
  s.firstLaunch = { asked: true, campaignExists: false };
});

When("the game is started again and the player picks {string}", (s, entry: string) => {
  expect(entry).toBe("Play");
  openStartScreen(sh(s));
  playFromStart(s);
  acted(s);
});

// The turn (SHELL-073, SHELL-074)

Then("the orders journal is closed with the turn's orders before the turn runs", (s) => {
  const types = sh(s).events.map((e) => e.type);
  expect(types.indexOf("OrdersJournalClosed")).toBeGreaterThanOrEqual(0);
  expect(types.indexOf("OrdersJournalClosed")).toBeLessThan(types.indexOf("EndTurnPressed"));
  expect(turnOf(sh(s)).month).toBeNull();
});

Then("the Resume save and the orders journal together hold the world before the turn", (_s) => {
  expect(PRE_TURN).toBe("the Resume save and the orders journal");
  expect(saveAfterKillDuringTurn()).toBe(PRE_TURN);
});

Given(/^this month (a fleet of )?"([^"]+)" fights at "([^"]+)" on the (\d+)(?:st|nd|rd|th)$/, (s, _fleet: string | undefined, realm: string, place: string, day: string) => {
  s.month = { loop: monthLoop([{ place, day: Number(day) }], realm), events: [], report: [`A battle at ${place}`] };
});

Then("the battle starts on day {int}", (s, day: number) => {
  if (!turnOf(sh(s)).month) runTurn(sh(s), s.month);
  expect(turnOf(sh(s)).phase).toBe("battle");
  expect(stoppedOnDay(sh(s))).toBe(day);
});

Then("the map flies to {string}", (s, place: string) => expect(sh(s).camera.on).toBe(place));

Then('the screen "battle" opens on the running battle', (s) => {
  expectTop(s, "battle");
  expect(battleFrame(sh(s))!.battleCard).toBe("running");
  expect(battleFrame(sh(s))!.replay).not.toBe(true);
});

Then("time passes in steps of 4 hours, 6 a day, while it runs", (s) => {
  const v = battleView(sh(s));
  expect(v.steps).toBe(6);
  stepBattles(sh(s));
  expect(battleView(sh(s)).hours).toBe(4);
  expect(turnOf(sh(s)).hoursPassed).toBe(4);
});
Then("the battle view offers {string} and {string}", (s, a: string, b: string) => {
  expect(battleView(sh(s)).buttons).toEqual([a, b]);
  expect(battleViewButtons()).toEqual([a, b]);
});
Then("the battle view offers no way to skip to the result", (s) => {
  expect(battleView(sh(s)).skip).toBe(false);
  expect(battleButton("B", "running", false)).toBe("back to the map");
});
Given(/^this month "([^"]+)" fights at "([^"]+)" and at "([^"]+)" on the (\d+)(?:st|nd|rd|th)$/, (s, realm: string, a: string, b: string, day: string) => {
  ensureCampaign(s);
  s.month = { loop: monthLoop([{ place: a, day: Number(day) }, { place: b, day: Number(day) }], realm), events: [], report: ["Two battles"] };
});
Then("the battle switcher lists {string} and {string}, each with its progress", (s, a: string, b: string) => {
  if (!turnOf(sh(s)).month) runTurn(sh(s), s.month);
  const sw = battleSwitcher(sh(s));
  expect(sw.map((x) => x.place)).toEqual([a, b]);
  expect(sw.map((x) => x.progress)).toEqual(["0 / 6", "0 / 6"]);
  expect(battleView(sh(s)).switcher).not.toBeNull();
});
Then("both battles show progress {string}", (s, progress: string) => {
  expect(battleSwitcher(sh(s)).map((x) => x.progress)).toEqual([progress, progress]);
});
When("the player switches to the battle at {string}", (s, place: string) => {
  const b = battleSwitcher(sh(s)).find((x) => x.place === place)!;
  switchBattle(sh(s), b.id);
});
Then("the battle view shows {string}", (s, place: string) => {
  expect(battleView(sh(s)).place).toBe(place);
  expect(battleSwitcher(sh(s)).find((x) => x.shown)!.place).toBe(place);
});
Then("the battle at {string} is still running", (s, place: string) => {
  expect(turnOf(sh(s)).running.find((x) => x.battle.place === place)!.outcome).toBeNull();
  expect(battleFrame(sh(s))!.battleCard).toBe("running");
});

// A turn is one week (X-18, SHELL-137)
Given(/^a campaign as "([^"]+)" is loaded on (\d+) (\w+) (\d+)$/, (s, realm: string, day: string, month: string, year: string) => {
  loadCampaign(s, realm);
  const c = sh(s).campaign!;
  c.date = { year: Number(year), month: MONTH_NAMES.indexOf(month) + 1 };
  c.day = Number(day);
  expect(dayDate(c.date, c.day)).toBe(`${day} ${month} ${year}`);
});
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
function playWeek(s: Scenario): void {
  const shell = sh(s);
  if (!shell.stack.some((f) => f.id === "turn")) push(shell, { id: "turn" });
  turnOf(shell).phase = "in progress";
  s.weekLoop = monthLoop([]);
  const before = s.weekLoop.day;
  runTurn(shell, { loop: s.weekLoop, events: [], report: [] });
  s.daysPlayed = s.weekLoop.day - before;
}
When("the turn runs to its end", (s) => playWeek(s));
Then("the day loop has played {int} days", (s, n: number) => expect(s.daysPlayed).toBe(n));
Then("the top bar shows {string}", (s, text: string) => {
  const c = sh(s).campaign!;
  expect(dayDate(c.date, c.day!)).toBe(text);
});
When("{int} more turns are played", (s, n: number) => {
  for (let i = 0; i < n; i++) {
    while (topId(sh(s)) !== "map") pop(sh(s));
    playWeek(s);
  }
});

// ---------------------------------------------------------------------------
// The desk over the map: dispatches, alerts, the week waiting at a battle, AI peace offers,
// the country card, picking commanders and Space (SHELL-138..148, playtest feedback)

Given("an AI realm at war with the player offers peace", (s) => {
  ensureCampaign(s);
  s.offer = { id: "peace-1", from: "Burgundy", terms: "white" as const };
  s.month = { loop: monthLoop([]), events: [], report: [], offers: [s.offer] };
});

Then("the offer shows in the turn report and in Waiting for you", (s) => {
  const shell = sh(s);
  expect(turnOf(shell).report).toContain("Burgundy offers peace");
  expect(dispatchesView(shell).waiting).toContain("Burgundy offers peace");
  expect(waitingForYou(shell)).toContain("A peace offer: Burgundy");
  expect(deskOf(shell).alerts).toContainEqual(expect.objectContaining({ text: "Burgundy offers peace.", buttons: ["Answer"] }));
  expect(dispatchesButton(shell)).toMatchObject({ blinks: true, place: "top bar" });
});

Then("the realm's Diplomacy tab is marked until the offer is answered or put off", (s) => {
  const shell = sh(s);
  const marked = (realm: string) => countryCardTabs(shell, realm).find((t) => t.name === "Diplomacy")!.marked;
  expect(marked("Burgundy")).toBe(true);
  expect(marked("France")).toBe(true);
  expect(marked("England")).toBe(false);
  // Put off: the offer still waits in the Dispatches, unmarked until the next turn.
  putOffPeaceOffer(shell, s.offer.id);
  expect(marked("Burgundy")).toBe(false);
  expect(dispatchesView(shell).waiting).toContain("Burgundy offers peace");
  pressEndTurn(shell);
  expect(marked("Burgundy")).toBe(true);
  // Answered: the mark and the Waiting for you line go.
  answerPeaceOffer(shell, s.offer.id, false);
  expect(marked("Burgundy")).toBe(false);
  expect(waitingForYou(shell)).not.toContain("A peace offer: Burgundy");
});

const LAST_WEEK = "1503-05-01";
const THIS_WEEK = "1503-05-08";

Given("the player's realm fought a battle last week", (s) => {
  const shell = ensureCampaign(s);
  shell.campaign!.day = 1;
  logDispatches(shell, [{ day: LAST_WEEK, text: "Your army won the battle at Troyes", mine: true, province: "Troyes" }, { day: LAST_WEEK, text: "England and Scotland make peace", mine: false }]);
  // The player read last week's dispatches.
  openDispatches(shell);
  pop(shell);
  expect(dispatchesButton(shell).count).toBe(0);
});

When("the player ends the turn and the week plays out", (s) => {
  const shell = sh(s);
  s.month = { loop: monthLoop([]), events: [], report: ["The levies of Champagne gather", "A trader reached Venice"] };
  pressEndTurn(shell);
  runTurn(shell, s.month);
});

Then("the Dispatches do not open by themselves", (s) => expectTop(s, "map"));

Then("the Dispatches button counts the new dispatches about the player's realm", (s) => {
  expect(dispatchesButton(sh(s))).toMatchObject({ count: 2, blinks: false });
});

When("the player taps the Dispatches button", (s) => {
  openDispatches(sh(s));
  s.view = dispatchesView(sh(s));
});

Then("this week's dispatches are listed first under their day", (s) => {
  expectTop(s, "turn_report");
  expect(s.view.days[0]).toEqual({ day: THIS_WEEK, lines: ["The levies of Champagne gather", "A trader reached Venice"] });
  expect(dispatchesButton(sh(s)).count).toBe(0);
});

Then("last week's battle is still listed under its day", (s) => {
  expect(s.view.days[1]).toEqual({ day: LAST_WEEK, lines: ["Your army won the battle at Troyes", "England and Scotland make peace"] });
  // The log can show only what concerns the player's realm.
  deskOf(sh(s)).onlyMine = true;
  expect(dispatchesView(sh(s)).days[1]!.lines).toEqual(["Your army won the battle at Troyes"]);
});

Given("the turn is playing", (s) => {
  const shell = ensureCampaign(s);
  pressEndTurn(shell);
  expect(turnOf(shell).phase).toBe("in progress");
  s.camera = { ...shell.camera };
});

When(/^(a battle between the player's army and an enemy|an enemy's siege of the player's castle|the player's siege of an enemy castle) begins in a province$/, (s, what: string) => {
  s.province = "Champagne";
  s.alert = begins(sh(s), { kind: what.startsWith("a battle") ? "battle" : "siege", province: s.province });
});

Then("an alert over the map says so with Go there", (s) => {
  expect(s.alert.buttons).toContain("Go there");
  expect(s.alert.text).toContain(s.province);
  expect(deskOf(sh(s)).alerts).toContain(s.alert);
  expect(deskOf(sh(s)).alerts.length).toBeLessThanOrEqual(SHELL.desk.alertsShown);
});

When("the player taps Go there", (s) => tapAlert(sh(s), s.alert, "Go there"));

Then("the map is centred on that province and the province is selected", (s) => {
  expect(sh(s).camera.on).toBe(s.province);
  expect(sh(s).selection).toEqual({ kind: "province", name: s.province });
});

When("a battle between the player's army and an enemy begins", (s) => {
  s.province = "Champagne";
  s.battle = { place: "Champagne", sides: [{ realm: "France", men: 12000, start: 12000 }, { realm: "England", men: 9000, start: 9000 }], round: 0, rounds: 6 };
  s.alert = begins(sh(s), { kind: "battle", province: s.province });
});

Then("the week pauses and an alert over the map says so with Watch", (s) => {
  const d = deskOf(sh(s));
  expect(d.paused).toBe(true);
  expect(s.alert).toMatchObject({ text: "A battle has begun at Champagne. The week waits.", stays: true });
  expect(s.alert.buttons).toContain("Watch");
  // The map no longer flies there by itself.
  expect(sh(s).camera).toEqual(s.camera);
});

When("the player taps Watch", (s) => tapAlert(sh(s), s.alert, "Watch", s.battle));

Then("the map is centred on the battle and the week plays on more slowly", (s) => {
  const d = deskOf(sh(s));
  expect(sh(s).camera.on).toBe("Champagne");
  expect(d.paused).toBe(false);
  expect(d.stepMs).toBe(WATCH_STEP_MS);
  expect(WATCH_STEP_MS).toBeGreaterThan(BATTLE_STEP_MS);
  // The alert stays until the battle ends.
  expect(d.alerts).toContain(s.alert);
});

Then("a strip over the map shows both realms' men left and the round of the battle", (s) => {
  watchRound(sh(s), [11400, 8100]);
  expect(battleStrip(sh(s))).toMatchObject({ sides: ["France 11400 of 12000", "England 8100 of 9000"], round: "round 1 of 6" });
});

When("the battle ends", (s) => watchedBattleEnds(sh(s), "France won at Champagne: England broke and fled."));

Then("the strip says who won", (s) => {
  expect(battleStrip(sh(s))!.result).toBe("France won at Champagne: England broke and fled.");
  expect(deskOf(sh(s)).alerts).not.toContain(s.alert);
  expect(deskOf(sh(s)).stepMs).toBe(BATTLE_STEP_MS);
});

Given("the camera shows {string}", (s, place: string) => {
  const shell = sh(s);
  shell.camera = { x: 412, y: 236, zoom: 4, on: place, level: "Local" };
  s.camera = { ...shell.camera };
});

When("the player selects an army on the map", (s) => selectArmy(sh(s), "army of Jean de Dunois"));

Then("the camera neither moves nor zooms", (s) => {
  expect(sh(s).selection).toEqual({ kind: "army", name: "army of Jean de Dunois" });
  expect(sh(s).camera).toEqual(s.camera);
});

When("the player opens a country card", (s) => {
  s.card = openCountryCard(sh(s), "Burgundy");
});

Then("it has the tabs General, Diplomacy, Trade and Army in that order", (s) => {
  expect(countryCardTabs(sh(s), "Burgundy").map((t) => t.name)).toEqual(["General", "Diplomacy", "Trade", "Army"]);
  expect(COUNTRY_CARD_TABS).toEqual(["General", "Diplomacy", "Trade", "Army"]);
});

Then("it opens on General", (s) => {
  expect(topCard(sh(s))).toMatchObject({ kind: "realm", name: "Burgundy", tab: "General" });
});

Then("the peace table and declare war open from the Diplomacy tab", (s) => {
  for (const item of ["the peace table", "declare war", "offer peace", "ask for peace"]) expect(homeOf(item)).toBe("Diplomacy");
  expect(countryTabHolds("General")).not.toContain("declare war");
  expect(countryTabHolds("General")).not.toContain("the peace table");
});

When("the player taps a commander in the Army list", (s) => {
  s.camera = { ...sh(s).camera };
  selectArmy(sh(s), "army of La Hire");
});

Then("that commander's army is selected", (s) => {
  expect(sh(s).selection).toEqual({ kind: "army", name: "army of La Hire" });
  expect(sh(s).camera).toEqual(s.camera);
});

Then("army banners take taps of at least 44 points", (s) => {
  const small = { x: 100, y: 100, w: 20, h: 30 };
  const box = bannerTapBox(small);
  expect(box.w).toBeGreaterThanOrEqual(44);
  expect(box.h).toBeGreaterThanOrEqual(44);
  // A tap at the box's edge picks the banner; where two boxes overlap, the nearest banner wins.
  const other = { x: 130, y: 100, w: 20, h: 30 };
  expect(bannerAt([small, other], box.x + 1, box.y + 1)).toBe(small);
  expect(bannerAt([small, other], 138, 115)).toBe(other);
  expect(bannerAt([small, other], 300, 300)).toBeUndefined();
});

When("the player presses Space", (s) => {
  s.spaceOutcome = pressKey(ensureCampaign(s), "Space");
});

Then("the turn ends as if End turn were tapped", (s) => {
  expect(s.spaceOutcome).toEqual({ result: "turn started" });
  expectTop(s, "turn");
});

Then("while a text field has focus, Space types a space and the turn does not end", (s) => {
  const shell = newShell();
  enterCampaign(shell, { realm: "France", date: MAY_1503 });
  expect(pressKey(shell, "Space", true)).toBe("typed");
  expect(turnOf(shell).phase).toBe("orders");
  // The confirmation setting and unanswered events still apply.
  shell.settings.confirmEndTurn = "Always";
  expect(pressKey(shell, "Space")).toMatchObject({ result: "question" });
});

Given("a player-facing feature of the subject {string}", (s, subject: string) => {
  s.home = homeCheck(subject);
});

Then("all its actions and figures are on the Diplomacy tab of the country card", (s) => {
  expect(s.home.home).toBe("Diplomacy");
  for (const item of ["declare war", "offer peace", "ask for peace", "the peace table", "peace offers", "envoys", "standing"]) expect(s.home.items).toContain(item);
  for (const item of s.home.items) expect(homeOf(item)).toBe("Diplomacy");
});

Then("none of them sit on an unrelated panel", (s) => expect(s.home.elsewhere).toEqual([]));

Given("the player has armies, garrison troops and warnings", (s) => {
  s.tracked = ["armies", "garrison troops", "warnings"] satisfies Tracked[];
});

Then("the Army list, each province's Garrison tab and the Needs attention screen show their state at a glance", (s) => {
  const views = (s.tracked as Tracked[]).map(overviewOf);
  expect(views.map((v) => v.overview)).toEqual(["Army list", "Garrison tab", attentionTitle()]);
  for (const v of views) expect(v.shows.length).toBeGreaterThan(0);
  // Anything waiting for an answer has its overview too: the Dispatches.
  expect(overviewOf("waiting for an answer").overview).toBe("Dispatches");
});

Then("each line opens its detail in one tap", (s) => {
  for (const t of s.tracked as Tracked[]) expect(overviewOf(t).taps).toBe(1);
});

Given("a phone held in landscape", (s) => {
  s.window = { width: 844, height: 390, device: "phone" };
  expect(classifyShape(s.window)).toBe("Short wide");
});

When("any in-campaign screen or card opens", (s) => {
  s.layouts = IN_CAMPAIGN_SCREENS.map((id) => ({ id, layer: layerOf(id), breaks: fitsWindow(id, s.window, "Short wide"), layout: screenLayout(id, s.window, "Short wide") }));
  expect(s.layouts.map((l: { id: string }) => l.id)).toEqual(expect.arrayContaining(["card", "realm_book", "battle", "siege", "peace", "attention", "turn_report", "game_menu"]));
});

Then("it fits the window with every tap target at least 44 points and nothing behind the notch or home indicator", (s) => {
  for (const l of s.layouts) {
    expect(l.breaks, l.id).toEqual([]);
    for (const r of l.layout.targets) expect(Math.min(r.w, r.h), `${l.id} ${r.name}`).toBeGreaterThanOrEqual(44);
  }
  // The Tall layout fits as well (a tablet held upright).
  for (const id of IN_CAMPAIGN_SCREENS) expect(fitsWindow(id, { width: 820, height: 1180 }, "Tall", { top: 24, right: 0, bottom: 20, left: 0 }), id).toEqual([]);
});

Then("the map stays visible beside the card where the card allows", (s) => {
  for (const l of s.layouts) {
    if (l.layer === "card" || l.layer === "overlay") expect(l.layout.mapBeside.w, l.id).toBeGreaterThan(s.window.width / 3);
    else expect(l.layout.mapBeside).toBeNull();
  }
});
// The start screen (SHELL-149..158)

/** The campaign, saves and tutorial behind the start screen's column, from the scenario's Givens. */
function menuStateOf(s: any): Pick<MenuContext, "campaign" | "saves" | "tutorialFinished"> {
  if (s.menuState) return s.menuState;
  return s.summary ? { campaign: s.summary, saves: 1, tutorialFinished: true } : { campaign: null, saves: 0, tutorialFinished: false };
}

/** Play: Loading with the newest save, or the first-launch question the first time, or New campaign (SHELL-153). */
function playFromStart(s: any): void {
  const shell = sh(s);
  const play = startColumn({ ...menuStateOf(s), platform: shell.platform, edition: shell.edition })[0]!;
  if (play.target === "loading") return continueCampaign(shell, s.summary);
  s.flq = firstLaunchQuestion(s.firstLaunch ?? { asked: true, campaignExists: false });
  if (!s.flq) s.nc = openNewCampaign(shell, { suggested: SUGGESTED, lastOptions: s.lastOptions ?? ["normal"] });
}

Given("the game has booted and the first-run questions are answered", (s) => {
  s.sh = newShell({ platform: "Android" });
});

When("the start screen opens", (s) => {
  const shell = sh(s);
  if (s.acted) {
    expectTop(s, "main_menu");
    expect(shell.stack.map((f) => f.id)).toEqual(["title", "main_menu"]);
  } else openStartScreen(shell);
  const summary = s.summary ?? (shell.startRealm ? { realm: shell.startRealm, date: MAY_1503, borders: "the latest save's summary" } : null);
  s.startView = startScreen({ platform: shell.platform, edition: shell.edition, summary });
  s.menu = startColumn({ ...menuStateOf(s), platform: shell.platform, edition: shell.edition });
});

Given(/^the start screen is shown( with nothing over it)?$/, (s) => {
  openStartScreen(sh(s));
});

Then("the start screen shows its menu without waiting for a tap", (s) => {
  expect(sh(s).stack.map((f) => f.id)).toEqual(["title", "main_menu"]);
  expect(sh(s).events).not.toContainEqual({ type: "TitleDismissed" });
});

When("the player first touches the start screen", (s) => {
  firstStartInput(sh(s), "touch");
  acted(s);
});

Then(/^the background is the real map at region zoom panning slowly over (.+)$/, (s, region: string) => {
  const bg = s.startView.background;
  expect(bg).toMatchObject({ renderer: "map", zoom: "Region", pan: "slow" });
  if (region === "one of the 1444 regions listed in the start regions") {
    expect(SHELL.start.regions).toContain(bg.over);
    expect(bg.bordersFrom).toBe("1444");
  } else {
    expect(region).toBe(`the realm "${bg.over}" in its borders and season from the latest save's summary`);
    expect(bg.bordersFrom).toBe("the latest save's summary");
  }
});

Then("the background takes no input and runs no simulation", (s) => {
  expect(s.startView.background).toMatchObject({ input: false, simulation: false });
});

Then("the background still pans at Battery saver's frame rate", () => {
  expect(startBackgroundMoves(true)).toBe(true);
});

Then("the column shows {string}", (s, entries: string) => {
  expect(s.menu.map((e: { label: string }) => e.label).join(", ")).toBe(entries);
});

Then("{string} shows the banner of {string} and {string} under it", (s, entry: string, banner: string, label: string) => {
  expect(s.menu[0]).toMatchObject({ label: entry, banner, detail: label });
  expect(campaignLabel(banner, s.summary.date)).toBe(label);
});

Given("no campaign exists and the first-launch question was answered", (s) => {
  s.sh = newShell({ platform: "Android" });
  s.menuState = { campaign: null, saves: 0, tutorialFinished: false };
  s.firstLaunch = { asked: true, campaignExists: false };
});

When("the player picks {string} on the start screen", (s, entry: string) => {
  expect(entry).toBe("Play");
  if (topId(sh(s)) !== "main_menu") openStartScreen(sh(s));
  playFromStart(s);
  acted(s);
});

Then("the icon row shows {string}, each with its name", (s, icons: string) => {
  expect(s.startView.icons.join(", ")).toBe(icons);
});

Then("the system browser opens the wiki address", (s) => {
  expect(s.wiki.url).toBe(SHELL.start.wikiUrl);
  expect(sh(s).events).toContainEqual({ type: "WikiOpened", url: SHELL.start.wikiUrl });
});

Then("the game stays on the start screen", (s) => {
  expect(sh(s).stack.map((f) => f.id)).toEqual(["title", "main_menu"]);
});

Then("the version number is shown in the lower right corner", (s) => expect(s.startView.version).toBe("lower right"));

Then("the {string} ribbon is shown beside the logo", (s, label: string) => {
  expect(s.startView.ribbon).toBe(true);
  expect(fullGameRibbon(sh(s).edition)).toMatchObject({ label });
});

Then("the start screen stays", (s) => {
  expect(s.backResult).toBe("nothing");
  expect(sh(s).stack.map((f) => f.id)).toEqual(["title", "main_menu"]);
});

Then("the background pans over the realm {string}", (s, realm: string) => {
  expect(s.startView.background).toMatchObject({ over: realm, bordersFrom: "the latest save's summary" });
});

Given("a campaign as {string} is being played", (s, realm: string) => {
  loadCampaign(s, realm).campaign!.unsavedTurns = 0;
});

When("the player picks {string} and it is done", (s, entry: string) => {
  const shell = sh(s);
  openGameMenu(shell);
  s.picked = pickGameMenu(shell, entry);
  acted(s);
});

// Campaign end and score in play (SHELL-162 to SHELL-164): the engine's world

const PLAY_RULES = loadDefaultRuleset();

function playWorld(s: Scenario): World {
  return s.playWorld as World;
}

const landOf = (w: World, n: number): number[] => {
  const out: number[] = [];
  for (let p = 0; p < w.provinceCount; p++) if (!w.provinceWater[p] && w.provinceOwner[p] === n) out.push(p);
  return out;
};

Given("a game as {string} begins", (s, realm: string) => {
  const w = createWorld(PLAY_RULES, 1);
  setPlayer(w, w.nationIndex.get(realm)!);
  s.playWorld = w;
});

Given("a game as {string} begins with the end date {string}", (s, realm: string, end: string) => {
  const w = createWorld(PLAY_RULES, 1);
  setPlayer(w, w.nationIndex.get(realm)!);
  w.campaign.endDate = end;
  s.playWorld = w;
});

Then("every realm's card shows its three scores with a rank in each", (s) => {
  const v = campaignView(playWorld(s));
  // A sleeping realm has no card (SETUP-082).
  for (let n = 0; n < playWorld(s).nationCount; n++) for (let k = 0; k < 3; k++) {
    if (playWorld(s).nationAsleep[n]) continue;
    expect(Number.isFinite(v.scores[n * 3 + k])).toBe(true);
    expect(v.ranks[n * 3 + k]).toBeGreaterThan(0);
  }
});

Then("the player's Score card shows Economy as yearly income plus the bank and Power as provinces plus army power", (s) => {
  const m = campaignView(playWorld(s)).mine!;
  expect(Math.abs(m.scores[0] - (m.income + m.bank))).toBeLessThanOrEqual(1);
  expect(Math.abs(m.scores[1] - (m.provinces + m.army))).toBeLessThanOrEqual(1);
  expect(m.provinces).toBeGreaterThan(0);
});

Then("the score ledger lists the five leading realms and the player", (s) => {
  const w = playWorld(s);
  const v = campaignView(w);
  expect(v.ledger.length).toBeGreaterThanOrEqual(5);
  expect(v.ledger.slice(0, 5).every((r, i, a) => i === 0 || a[i - 1]!.ranks.reduce((x, y) => x + y) <= r.ranks.reduce((x, y) => x + y))).toBe(true);
  expect(v.ledger.some((r) => r.nation === w.player)).toBe(true);
});

When("the game plays {int} days", (s, days: number) => {
  advance(playWorld(s), STEPS_PER_DAY * days);
});

When("the game plays into January 1445", (s) => {
  const w = playWorld(s);
  for (let i = 0; i < 60 && !(w.date.year === 1445 && w.date.month === 1); i++) advance(w, STEPS_PER_DAY);
  // The 1st's monthly steps run as its day begins.
  advance(w, STEPS_PER_DAY);
});

When("{string} takes two thirds of the lands of {string} and {string} the rest", (s, a: string, loser: string, b: string) => {
  const w = playWorld(s);
  const [na, nl, nb] = [a, loser, b].map((x) => w.nationIndex.get(x)!);
  landOf(w, nl!).forEach((p, i) => (w.provinceOwner[p] = i % 3 === 0 ? nb! : na!));
});

Given("{string} holds every land province", (s, realm: string) => {
  const w = playWorld(s);
  const n = w.nationIndex.get(realm)!;
  for (let p = 0; p < w.provinceCount; p++) if (!w.provinceWater[p]) w.provinceOwner[p] = n;
});

Then("the end card reads {string}", (s, line: string) => expect(campaignView(playWorld(s)).ending?.headline).toBe(line));

Then("the end card offers {string}", (s, list: string) => expect(campaignView(playWorld(s)).ending?.choices.join(", ")).toBe(list));

Then("the clock no longer runs", (s) => {
  const w = playWorld(s);
  const day = w.day;
  advance(w, STEPS_PER_DAY * 7);
  expect(w.day).toBe(day);
});

When("the player chooses to play on as {string}", (s, realm: string) => {
  const w = playWorld(s);
  expect(applyNow(w, { type: "playOn", nation: w.nationIndex.get(realm)! }, w.player).rejectedOrders).toEqual([]);
});

When("the player chooses to keep playing", (s) => {
  const w = playWorld(s);
  expect(applyNow(w, { type: "keepPlaying" }, w.player).rejectedOrders).toEqual([]);
});

Then("the clock runs again as {string}", (s, realm: string) => {
  const w = playWorld(s);
  expect(w.player).toBe(w.nationIndex.get(realm));
  expect(campaignView(w).ending).toBeNull();
  const day = w.day;
  advance(w, STEPS_PER_DAY);
  expect(w.day).toBe(day + 1);
});

Then("each page of the Realm book sits in exactly one section", () => {
  const pages = REALM_BOOK_TABS.flatMap((t) => tabHolds(t));
  expect(new Set(pages).size).toBe(pages.length);
  for (const page of pages) expect(REALM_BOOK_TABS).toContain(sectionOf(page));
});

Then("the page {string} sits in the section {string}", (_s, page: string, section: string) => {
  expect(sectionOf(page)).toBe(section);
});

// The Realm overview (SHELL-170, SHELL-171)

const OVERVIEW_BASE: OverviewInput = { gold: 0, perMonth: 0, hungry: 0, low: 0, provinces: 1, people: 0, newLands: 0, risings: 0, verdicts: 0, huntWaits: 0, armies: 0, men: 0, fleets: 0, wars: 0, allies: 0, subjects: 0, answerWaits: false, study: { name: "Plough", pct: 10 }, beliefLow: false };

Given("the realm stands as:", (s, table: Table) => {
  const v: OverviewInput = { ...OVERVIEW_BASE };
  for (const [key, value] of table) {
    if (key === "study") {
      const [name, pct] = value!.split(",").map((x) => x.trim());
      v.study = value === "none" ? null : { name: name!, pct: Number(pct) };
    } else if (key === "answerWaits" || key === "beliefLow") v[key] = value === "1";
    else (v as unknown as Record<string, number>)[key!] = Number(value);
  }
  s.overviewInput = v;
});

When("the player opens the Realm book's Overview", (s) => {
  s.tiles = realmOverview(s.overviewInput as OverviewInput);
});

const overviewTile = (s: Scenario, section: string): OverviewTile => {
  const t = (s.tiles as OverviewTile[]).find((x) => x.section === section);
  expect(t, section).toBeDefined();
  return t!;
};

Then("the overview tiles are {string}", (s, list: string) => {
  expect((s.tiles as OverviewTile[]).map((t) => t.section)).toEqual(list.split(", "));
  for (const t of s.tiles as OverviewTile[]) expect(REALM_BOOK_TABS).toContain(t.section);
});

Then("the tile {string} reads {string} with the note {string}", (s, section: string, line: string, note: string) => {
  const t = overviewTile(s, section);
  expect(t.line).toBe(line);
  expect(t.note).toBe(note);
});

Then("no tile is marked", (s) => {
  expect((s.tiles as OverviewTile[]).filter((t) => t.needs)).toEqual([]);
});

Then("the tile {string} is marked {string}", (s, section: string, needs: string) => {
  expect(overviewTile(s, section).needs).toBe(needs);
});

Then("tapping the tile {string} opens the page {string}", (s, section: string, page: string) => {
  const t = overviewTile(s, section);
  expect(t.page).toBe(page);
  expect(sectionOf(t.page)).toBe(section);
});
