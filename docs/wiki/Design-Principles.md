# Design principles

These are the rules every feature of Pocket Hegemony is designed by. They come from Leroy's direction for the game (decision X-19 in `domain/DECISIONS.md`) and from the screen rules already in the specs. Every new or changed feature is checked against them before it is built.

## Start from how the player uses it

Most of the game is played in the screens and cards over the map, not on the map itself. So every feature starts with three questions: where does the player find it, what do they tap, and what do they see back? If the answer is awkward, too many taps, a hidden button, a result that is hard to read, the design changes before any code is written.

## Group related things together

Each subject has one home: one card, one tab or one screen. The country card, for example, has General, Diplomacy, Trade and Army tabs, so war and peace sit with the rest of diplomacy instead of next to the realm's taxes. A feature never spreads its buttons over several unrelated panels.

## Give the important things an overview

Anything the player has to keep track of gets one place that shows its state at a glance and leads to the detail. The Army list shows every commander and their army, a province's Garrison tab shows its troops without a commander, and Needs attention lists every warning and everything waiting for an answer. A new important feature either adds itself to such an overview or gets its own.

## Check it on a phone

Every feature is checked on a phone held sideways as well as on a desktop window:

- It fits both the Wide and the Tall layout and stays clear of notches and the home indicator.
- Every tap target is at least 44 × 44 points, with 8 points between neighbours.
- Nothing needs hover: what hover shows with a mouse, a long press shows on touch.
- The map stays visible where it can, with cards as side panels or bottom sheets rather than full screens.

## Rules that already hold

- The map is home: everything opens over it and closes back onto it, and one Back always goes one step back ([Screens and navigation](Screens-and-Navigation)).
- Settings never change results: they change how the game looks and sounds, never what happens ([Settings](Settings)).
- The screen says what is wrong, never what to do: warnings inform, they don't play for you.
