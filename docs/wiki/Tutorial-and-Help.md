# Tutorial and help

Pocket Hegemony teaches itself in four layers: a short tutorial campaign, "The Year of Varna", played as the Ottomans from spring 1444 to 1447; guided first turns for your first real campaign; a Needs attention list that tells you what needs you; and tooltips, "Why?" and the Almanac, which explain every number in the game. You can skip any of it, and nothing in the game is locked behind it.

## How it works

### The principles

- **Teach by doing.** Every lesson is something you do on the real map with the real screens. No slideshow, and no tutorial-only screens the real game does not have, apart from the tutorial's own pacing tools and its note.
- **One idea per step.** Each step names one thing to look at or one thing to do, in one or two short lines.
- **Short sessions.** Chapters last about 5 minutes. Close the app mid-chapter and you come back to the same step.
- **Never trap.** Every step and every chapter can be skipped, and you can leave the tutorial at any time.
- **Same lesson on every device.** Each step is written once, with button tokens that become the right prompt for touch, mouse and keyboard, or controller.
- **Teach 1444 first.** The tutorial teaches the game as it starts. Systems that only matter later are taught through New entries on the Needs attention list and the Almanac, not through tutorial chapters for later eras.
- **Our own words.** No tutorial text, character name or screen name comes from other strategy games.

If you skip the tutorial and the guided turns, you still get the Needs attention list, tooltips, "Why?" and the Almanac.

### The Year of Varna

The tutorial is played as the Ottomans, from April 1444 to 1447, in ten chapters. It keeps history's own dates and never moves an event to suit the lesson plan. The Ottomans are in the free tier, so the whole tutorial works without a purchase on every store and in the Steam demo. Each chapter starts from its own fixed chapter save, so you can play or replay any chapter on its own.

| # | Chapter | Date | Turns | What it teaches | Done when |
|---|---|---|---|---|---|
| 0 | The map | April 1444 | 0 | Pan and zoom through world, region and local view; select a province; open its card; switch lenses (Food, then Faith); find the capital, the Straits and Varna | You have opened Edirne's province card and seen the Food and Faith lenses |
| 1 | A month at a time | April to June 1444 | 3 | Country card; gold and food at a glance; End turn; the turn report; the first event (Hungary offers a ten-year peace at Edirne: accept or refuse) | The peace event is answered and the turn report read |
| 2 | A boy on the throne | July to August 1444 | 3 | Ruler and heirs; Murad's abdication; why a child ruler and a new reign make lords waver; the lords Evrenos, Mihal and Turahan; what a lord wants; royal provinces and lords' lands; hiring an official; tax rates | An official is placed, and one wavering lord has been given his want, a gift, or left alone (each is fine; the turn report shows the result) |
| 3 | Bread and castles | August to October 1444 | 1 plus Advance | Food lives in provinces; castles collect and spread it; reach rings; the Food policy screen and presets; the harvest; ends when news comes that the crusaders broke the peace | A preset is chosen, the harvest turn played, and one hungry province's "Why?" opened |
| 4 | Men under arms | October 1444 | 3 | The crusade, its league and its Defend the faith aim; the Faith policy choice for the Orthodox; ferrying troops over the Bosporus; the levy in Thrace; levies against trained regiments; the Janissaries and how they were raised; calling the lords' riders; recalling Murad (history's choice) or making an official Marshal; standing orders | An army of levies, lords' riders and Janissaries stands with a commander |
| 5 | Varna | October to November 1444 | 4 to 6 | Marching and days to cross; the food reserve; seeing the enemy (the crusade first as a rumour); a battle against Hunyadi; what the faith choice changed; terms; peace voices; making peace | Peace is signed (losing the battle is allowed; the chapter adapts) |
| 6 | Schools and inventions | 1445 | 2 plus Advance | Madrasas, students and scholars; schools have a faith; a served, protected community on a Faith line; choosing what to study; every student is a recruit the army cannot raise | An invention is chosen and you have seen the recruit pool shrink |
| 7 | The Janissaries' pay | 1446 | 3 to 4 | A rising of unpaid soldiers in Edirne; the rebellion card; the five answers (grant, talk, bribe, wait, attack); then Murad takes the throne back, or Mehmed rules on | The rising ends by any means |
| 8 | The wall at Corinth | November to December 1446 | 4 to 6 | Declaring a war yourself; marching into the Morea; besieging the Hexamilion month by month; storming with guns; terms | The wall falls or terms are agreed |
| 9 | Your realm now | 1447 | none | A one-screen recap with Almanac links; keep playing these Ottomans or start a new campaign | You pick one |

In all, about 30 to 40 turns and 45 to 50 minutes, in sessions of about 5 minutes.

**History and your choices.** When your choices differ from history, the chapter carries on from what actually happened, as a real campaign would. When the next chapter starts, its chapter save puts the world back on its historical course, and its opening card says so in one line. Every scripted event keeps the event tree's history block with its sources. The recruiting, battle and siege lessons use their own Ottoman set of worked numbers, made the same way as the French worked examples.

### Pacing tools

- **Advance to…** runs several turns in a row to a named date and shows one combined turn report.
- **Input focus.** During a "do" step only the controls on the step's allowed list respond; everything else is dimmed, not hidden. **Free look**, a small button, lifts the focus for that step.
- **Quiet world.** While the tutorial runs, every computer war against the Ottomans except the scripted ones is held back, and so is every computer war in the Balkans and western Anatolia (Karaman included).
- **Battle at watch speed.** The Varna battle always opens the battle screen, slowed to one bell every 3 seconds.

### The tutorial scenario

The tutorial is one scenario file holding its start state, world rules, scripted events, chapter saves and steps. It starts from the normal 1444 setup, with overrides only where the tutorial needs them: Murad II as ruler and Mehmed as heir; Çandarlı Halil as grand vizier; the Evrenos, Mihal and Turahan families as lords, one of them wavering; one royal province in Anatolia with no official; a fixed seed; the Christian sipahis' lord card (Wavering); and the Orthodox row of the Faith policy set to Restricted. The 1444 map already gives the Ottomans Edirne and Varna and Byzantium the Morea.

The computer is steered: Hungary marches on Varna in chapter 5 with Hunyadi commanding, and the Morea accepts terms after the wall falls. The scripted events are the Edirne–Szeged peace, Murad's abdication, the crusade breaking the peace (which starts the league and grants Defend the faith), Murad's recall, and the Janissary pay rising with Murad's return. Each is marked tutorial only and never fires in a real campaign.

Chapter saves are rebuilt by a tool whenever rules change, by playing the previous chapter's recommended path in the engine; they are never edited by hand. The same chapter save and the same orders always give the same result. A CI test plays each chapter's recommended path from its save and checks it reaches "Done when".

### Going off script

| If you… | Then… |
|---|---|
| Refused the peace in chapter 1 | Hungary stays at war, the quiet world keeps its armies home until chapter 5, and chapter 4's event reads "The war you chose resumes" instead of "The crusaders break the peace" |
| Lose at Varna | The step changes to "Your army broke. Fall back behind the walls of Edirne and call the levy." Hungary offers terms after failing to take one castle in two months, so the chapter still ends in peace |
| Ignored the wavering lord | His loyalty drops, and in chapter 7 his riders do not come when the rising starts |
| Sit idle on a "do" step | After 8 seconds the pointer pulses on the target again; after 20 the note adds "Stuck? Skip this step." |
| Are short of gold at a chapter's start | A Genoese or Venetian banking house fills the gap with a scripted loan, shown as a real debt line |
| Fail the storm in chapter 8 | The siege carries on month by month until the wall is breached or the Morea offers terms |

### The Varna crusade

The crusade is built on the real [Religion](Religion), [Diplomacy](Diplomacy), [Warfare](Warfare) and [Troop movement](Troop-Movement) rules.

- **Chapter 0.** After the Food lens you switch to the Faith lens: Rumelia shows as Orthodox under a Sunni realm, hatched where a community is 30 % or more, with the line "Most of your people in Rumelia are Orthodox Christians. You rule them as a Sunni sultan."
- **The league.** When the crusaders break the peace on chapter 3's last turn, a scripted event starts a crusading league against the Ottomans regardless of the usual threshold: Hungary, Poland, Wallachia and the Papal States as members, with Venice and Burgundy sending fleets. The country card shows "League against the Ottomans: 4 members, 31,000 soldiers". The event grants the league the Defend the faith aim itself (a Restricted policy alone would not qualify), and the war screen shows the aim, its cause and one linked line on why this aim and not Take land. Tapping a league member opens its reasons (Same faith +10 between Catholic members; "Our ally's war aim is our concern"), the same screen used for your own alliances.
- **The faith choice (chapter 4).** When the league calls on the sultan's Christian subjects to rise, the vizier opens the Faith policy screen at the Orthodox row, and you choose:

| Choice | What follows |
|---|---|
| Keep it Restricted | The faith tax keeps paying for the war, and the Christian sipahis stay Wavering, so they do not bring their riders when called |
| Tolerate it | The Christian sipahis steady to Loyal and their riders come to Varna; Pious Sunni lords waver once (the Orthodox are more than 10 % of the realm); the faith tax ends |

  Persecute is shown dimmed, with a note that it would give every Orthodox neighbour the Defend the faith aim and grow the crusade.
- **The Straits.** While the crusaders' fleet holds the Dardanelles, the crossing shows as closed with the fleet's banner on it, so you send Murad's Anatolian troops over the Bosporus ferry: 2 days, plus a day per 10,000 men.
- **After Varna**, the turn report shows the battle's result together with the faith choice: how many Christian sipahis rode at Varna, or why they stayed home. Peace with Hungary ends the league's war; the league ends when its starting event closes; Hungary's loss of its king comes through the event tree as a succession.
- **Chapter 6** opens a Rumelian province's Faith line, showing the Orthodox community as "served, Restricted, protected: no grievance", with "Why?" linking to the religion page. The madrasa in Edirne is Sunni.

The tutorial calls the crusade what it was, frames neither side's holy war as the right one, rewards no harm, and counts Varna's dead on both sides the same way.

### The Janissaries

In chapter 4, after the Janissaries join the army, a step opens their regiment card and the "Why?" on its men. The recruits line reads "Boys taken from Christian families in Rumelia (the devshirme), and war captives." Tapping it moves the camera to the Rumelian provinces the corps drew from. Then one illustrated vignette card, in the style of an event and marked narrative only, shows three panels: officials arriving in a village, the boy's years of training, and the soldier he becomes, remembered in his village. It has only Continue and Read more; no option gives you anything. The step ends on a Rumelian province card whose People line shows the boys taken and whose grievances show *Sons taken*, with its Orthodox lords one step lower in loyalty, and the vizier's line "The corps is strong. This is what it costs the villages that fill it." The Almanac's entry is sourced from the catalogue's Ottoman record and standard histories, with no invented numbers.

The tutorial also proposes (not a rule yet) how the devshirme could work in a real campaign for a realm with the *Kapıkulu household* birthright: a collection every 5 years, a *Sons taken* grievance for 10 years, lords wavering, families leaving as refugees, and one lever, ending it, after which the corps refills from paid volunteers at a higher cost.

### Steps and how they look

Each step has an id, a kind, its text (a string key), an anchor, an allowed list, a done condition, whether the guide's face shows, and a length limit of 140 characters.

| Kind | Ends when |
|---|---|
| look | You confirm, or tap anywhere; never auto-advanced |
| do | Its condition is met; there is no Next button |
| choose | You make any choice; the next step reacts to which |
| watch | What it plays (a turn, a battle) ends; it can be paused |

Text tokens: `{btn:…}` becomes the prompt for your current input; `{ui:…}` the screen's name in bold with its icon; `{stat:…}` the stat's icon and name linked to the Almanac; `{place:…}` and `{lord:…}` a linked name that moves the camera there.

The step note is a parchment strip at the bottom edge, never over the target, moving to the top when the target is low, and at most a third of the screen tall. A spotlight with a gold edge sits on the anchor, and the rest of the screen dims to 50 % (not black). The guide's face is the grand vizier Çandarlı Halil, and he appears only in the tutorial. A counter shows the steps of the chapter ("2 / 6"). In the tutorial, the pause menu gains Skip this chapter, Chapter list and Leave the tutorial.

### Guided first turns

If you skipped the tutorial, or when you start your first real campaign after finishing it, a goals list sits under the top bar for the first in-game year:

| Goal | Opens | Done when |
|---|---|---|
| Look over your realm | Country card | Opened |
| Choose how your castles share food | Food policy | A preset or setting chosen |
| Check your lords | Lords list | Opened |
| Put an official in every royal province | Officials | No royal province without one, or dismissed |
| Choose what your scholars study | Research | An invention chosen |
| Know your neighbours | The realms around you, from the country card | Opened |
| End your first turn | End turn | Pressed |

The list folds into a single icon with a count and never covers the map. Each goal's Show me runs the matching tutorial steps in your current campaign, without the tutorial's scenario overrides. Goals adapt to the realm: a realm with no lords skips "Check your lords", and a pastoral realm's food goal will read "Choose how your herds are shared" once herds are designed. Closing the list for good from its own menu hides it for good.

### Needs attention

There is no advisor in a real campaign; the vizier belongs to the tutorial. Instead, the Needs attention list holds one-line entries, each with a Go there button that moves the camera or opens the screen. Entries come in three kinds, Warnings first, then Opportunities, then New.

| Kind | Check | Example line |
|---|---|---|
| Warning | A province's store will reach zero before the next harvest | "Sofia will run out of bread by March." |
| Warning | An army's food reserve is under 15 days | "Murad's army has twelve days of food left." |
| Warning | A lord turns Wavering or Disloyal | "Turahan Bey grows cold toward you. He wants a war on the Morea." |
| Warning | Pay owed to soldiers | "Your soldiers have not been paid for two months." |
| Warning | Gold runs out in under three turns at this rate | "At this pace the treasury is empty by June." |
| Warning | A harvest is near and many farmers are levied | "Five thousand farmers are under arms with the harvest three weeks away." |
| Warning | Grievances pass the rising threshold | "Talk of rising in Edirne." |
| Warning | A royal province has no official | "Bursa pays half its taxes without an official." |
| Opportunity | A neighbour's disloyal lord borders you | "A lord across the border may be won over." |
| Opportunity | Grain sells high and a castle has surplus | "Grain sells high in Venice; Edirne has more than it can hold." |
| New | The first war, siege, battle, rising, famine or plague | One line, linked to the Almanac |
| New | The first invention of a new era; a new age begins | One line on what changes |

All checks live in one config file and are read each turn after that turn's simulation; in the tutorial the same checks drive the vizier's notes. An entry leaves when its cause ends or you dismiss it, and a dismissed entry does not return before its check's cooldown ends (a province's famine warning at most once a year). Long-press, right-click or the info button on an entry offers "Don't list this kind again". The End turn button shows a small count of warnings, and the turn report links to the list rather than repeating it. Each later system adds its own warnings and first-time moments as its design lists them.

### Tooltips, "Why?" and linked words

- **Tooltip:** the stat's name and one line on what it is. Long-press on touch, hover after the settings delay with a mouse, or focus then the info button on a controller.
- **"Why?":** the full gain and lose list with this month's numbers and an Almanac link. Tap or click the number, or focus then confirm. Every number on every card has a "Why?"; a lint test checks that every stat key has a tooltip line and an Almanac entry.
- **Linked words:** the first time a game term appears in a text (event options, tooltips, the Needs attention list, the turn report), it is linked to its Almanac entry with a dotted underline. A glossary file maps each term and its plurals per language.

### The Almanac

The in-game encyclopedia, fully offline, opened from the pause menu, any link or any "Why?". It uses the same parchment, ribbons and pixel icons as the cards, takes its numbers from config (so a balance patch updates it), and is searchable with a text box, or a letter wheel on a controller.

| Section | Contents | How it is written |
|---|---|---|
| How to play | One page per system, matching the chapters, each with Practice this (opens that chapter) | By hand, short |
| Stats | What each stat is, its gain and lose list, which screens show it | Generated from config, with a hand-written opening line |
| Inventions | Each invention, what it needs, what it unlocks | Generated from research data |
| Troops and commanders | Arms, kinds, commander styles, by era | Generated from warfare data |
| Ground | The 22 tile types and their effects on troops, buildings and people | Generated from terrain data |
| Realms | Every country met so far: short history, strengths | Generated from the catalogue; hidden until met |
| Events seen | Events fired in this campaign, with their history block | Generated from the event tree |

Loading-screen tips come from a `tips` list that links each tip to its Almanac entry, chosen from what you have not opened yet.

### Inputs

The game tracks the last input you touched and swaps every prompt live, even mid-step. Controller glyphs come by family (Xbox, PlayStation, Steam Controller and Steam Deck, a generic set), and from Steam Input on Steam. With a controller, every panel is navigable with the d-pad, focus starts on the button the step wants, and the spotlight follows focus. The tutorial needs no text entry. Chapter 0 has a different script per input, asking you to try each camera action once; later chapters use one script with tokens.

| Action | Touch | Mouse and keyboard | Controller (proposal) |
|---|---|---|---|
| Pan the map | Drag | Drag, or WASD and arrows | Left stick moves the cursor; the map follows at the edge |
| Zoom | Pinch; double-tap to zoom in | Wheel; + and − | Right stick up and down |
| Select | Tap | Click | A / Cross |
| Back, close | Close button | Esc, right-click on a panel | B / Circle |
| Info | Long-press | Hover; I | Y / Triangle |
| Action menu | Action menu button on the selection | Right-click; Space | X / Square |
| Move an army | Tap army, tap Move, tap target | Select, right-click target | Select, X for Move, cursor to target, A |
| Cycle my armies | Tap the army count in the top bar | Tab | LB and RB |
| Cycle lenses | Lens button, then pick | L | LT and RT |
| Country card | The realm's pennant in the top bar | C | View / Share |
| End turn | Hourglass, lower right | Enter | Hold Menu / Options for half a second |
| Pause menu | Menu button | Esc with nothing open | Menu / Options, short press |
| Skip a tutorial step | Skip step on the note | Skip step on the note | Hold B / Circle for one second |

### Starting, skipping and returning

On first launch, after the title, the game asks "New to Pocket Hegemony?" with Play the tutorial (recommended), Guided campaign and I know the way. The main menu has a chapter list with a tick on each chapter done, and any chapter can be played at any time. Tutorial progress (chapters done, the current step, muted kinds, first-time entries seen) is kept apart from campaign saves.

At the end of chapter 9, "Keep ruling the Ottomans" turns the tutorial save into a normal campaign: the quiet world lifts, scripted events stop, the vizier's notes give way to the Needs attention list, and the save is marked "began as the tutorial", so it is not ironman. The tutorial earns no achievements.

### Accessibility and language

The note's text follows the UI scale and may take up to two lines more at the largest size. The chapter 0 lens lesson uses the Food lens, whose hungry provinces also carry the hunger icon, so it works without telling colours apart. With reduced motion on, the hand does not bob and the spotlight does not pulse, and the Varna battle can be skipped to its result like any battle. All tutorial, Needs attention and Almanac text lives in string tables with keys, tokens stay inside the strings, and the step length check runs per language.

### Measuring

Only with your consent, the game sends one event per tutorial step reached, skipped or finished, and per Needs attention entry followed or muted, and nothing else. Offline, these are queued and dropped after 30 days.

## What you see

- The step note, spotlight, vizier's face and step counter; Free look; the Advance to… ribbon.
- The tutorial lines in the pause menu, and the chapter list with ticks in the main menu.
- The "New to Pocket Hegemony?" question on first launch.
- The goals list under the top bar, folding to an icon.
- The Needs attention list with Go there, and the warning count on End turn.
- Tooltips, "Why?" breakdowns, dotted-underline linked words.
- The Almanac with its seven sections and search.

## How it connects

- [Screens and navigation](Screens-and-Navigation): the Attention screen and where it opens, the first-launch question, the Tutorial entry and chapter list, pause-menu lines, loading tips, the End turn count.
- [Saving](Saving): progress and mutes stored apart and synced, read-only chapter saves, the "began as the tutorial" mark.
- [Settings](Settings): tooltip delay, Tutorial hints, "Reset tutorial and hints", reduced motion, UI scale.
- [Achievements](Achievements): tutorial saves are never ironman, so the tutorial earns none.
- [Music and sound](Music-and-Sound): sounds for steps, the vizier's note and new warnings.
- [The 1444 start](The-1444-Start): the normal 1444 setup and the Ottoman catalogue record.
- [Historical events](Historical-Events): event format, history blocks, tutorial-only and narrative-only events.
- [Religion](Religion), [Diplomacy](Diplomacy), [Warfare](Warfare), [Troop movement](Troop-Movement): the crusade lesson.
- [Recruiting](Recruiting): levy, regiments, the Janissaries, the recruit pool, the devshirme proposal.
- [Your realm](Your-Realm) and [Provinces](Provinces): country and province cards, food, lords, officials, tax, grievances.
- [Map and lenses](Map-and-Lenses): zoom levels, the Food and Faith lenses, the hunger icon, the camera.
- [Research](Research): choosing an invention, eras, the Inventions section.
- [Rebellions](Rebellions): the rising, the rebellion card and its five answers.
- [National strengths](National-Strengths): the *Kapıkulu household* birthright; strengths in the Realms section.
- [Subjects](Subjects): Serbia returned and the Morea's tribute, in the next pass.
- [How a turn works](Time-and-Turns): checks run after each turn; Advance to… runs several turns.

## Numbers

All are provisional placeholders unless they come from another system.

| Key | Value |
|---|---|
| Chapter length | about 5 minutes |
| Tutorial total | about 30 to 40 turns, 45 to 50 minutes |
| Watch speed (Varna) | one bell every 3 seconds |
| Idle pulse / idle skip hint | 8 s / 20 s |
| `max_chars` (step text) | 140 |
| Spotlight dim | 50 % |
| Note height | at most a third of the screen |
| Faith hatching | 30 % or more (from religion) |
| Bosporus ferry | 2 days plus 1 day per 10,000 men (from troop movement) |
| League line | 4 members, 31,000 soldiers |
| Same faith reason | +10 (from diplomacy) |
| Hungary offers terms after | two months failing to take a castle |
| Goals period | the first in-game year |
| Army food warning | under 15 days |
| Gold warning | under three turns |
| Check cooldown | for example famine at most once a year |
| Skip step hold / End turn hold (controller) | 1 s / 0.5 s (proposals) |
| Measuring retention offline | 30 days |
| Devshirme interval / *Sons taken* length | 5 years / 10 years (proposals) |

## Still open

- **OQ-TUT-1:** this design's Needs attention (three kinds, Go there, Opportunities) and the screen flow's Attention screen (two groups, Show, "never what to do") differ.
- **OQ-TUT-2:** a mock-up labels the guide "The Chancellor", but the guide is the grand vizier.
- **OQ-TUT-3:** off-script consequences cross chapters, but each chapter resets the world to its historical course; which wins in sequence?
- **OQ-TUT-4:** a reference to warnings "always listed" in the turn report points at a section that does not exist.
- **OQ-TUT-5:** the "New to Pocket Hegemony?" question is not in the screen flow, and the encyclopedia has two names.
- **OQ-TUT-6:** the saves design does not yet cover tutorial progress, mutes, chapter saves or the "began as the tutorial" mark.
- **OQ-TUT-7:** the sounds the tutorial asks for do not all exist in the sound effects design.
- **OQ-TUT-8:** the devshirme in a real campaign needs recruiting and the sensitive-history thread to decide, and touches age ratings.
- **OQ-TUT-9:** the scripted Varna crusade and abdication are not yet real events, and there is no "grant a war aim" effect.
- **OQ-TUT-10:** the next pass should add an envoy step and the subject steps.
- **OQ-TUT-11:** the Ottoman worked numbers for recruiting, battle and siege lessons do not exist yet.
- **OQ-TUT-12:** whether Advance to… becomes a real-game feature, the final controller column, and consent for measuring are all owned elsewhere.
- **OQ-TUT-13:** Settings' "Detailed tooltips" overlaps "Why?", and "Tutorial hints" has no defined effect here.
- **OQ-TUT-14:** a reference points at the wrong gap list item for the free tier; no conflict in substance.
- **OQ-TUT-15:** herds rules are not designed, and lenses besides Food need a pattern or icon besides colour.

## For developers

- Spec: [`domain/onboarding/spec.md`](https://github.com/grrts/pocket-hedgemony/blob/claude/domain-specs-bdd-ebdpmx/domain/onboarding/spec.md), requirement code **TUT** (TUT-001 to TUT-115).
- Features: `domain/onboarding/features/` (first-launch-and-layers, tutorial-chapters, varna-crusade, janissaries, pacing-tools, off-script, step-script, guided-first-turns, needs-attention, tooltips-and-why, almanac, inputs, skipping-and-returning, accessibility, measuring).
- Code: not written yet. It will live in `packages/engine/src/domain/onboarding/`.
