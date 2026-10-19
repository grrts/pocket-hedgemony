@context-multiplayer
Feature: Online games on our server
  As a signed-in player
  I want to host a game, share its code and play it from my own device
  So that friends anywhere play one campaign with me

  Background:
    Given the account "Leroy" is signed in on a phone
    And the account "Ana" is signed in on a laptop

  @MP-020 @MP-021
  Scenario: Online play needs the account
    Given the player is not signed in
    When they open Online
    Then they are asked to sign in with the Account card
    And Host a game and Join a game wait until they are

  @MP-022
  Scenario: Hosting makes a code
    When "Leroy" hosts a game as "Castile"
    Then the game has a five-letter code without the letters I and O
    And "Leroy" holds the seat of "Castile"

  @MP-023 @MP-024
  Scenario Outline: A game is found only by its code
    Given "Leroy" hosted the game "KTRVW"
    When "Ana" types "<typed>"
    Then <result>

    Examples:
      | typed   | result                     |
      | KTRVW   | they find the game         |
      | ktr vw  | they find the game         |
      | KTRVX   | they are told there is no such game |
      | KT      | they are told a code is four or five letters |

  @MP-025 @MP-026
  Scenario: Seats
    Given "Leroy" hosted the game "KTRVW" as "Castile"
    When "Ana" takes "Castile"
    Then they are told "Castile" is taken
    When "Ana" takes "Portugal"
    Then they hold the seat of "Portugal"
    When "Ana" takes "Aragon"
    Then they hold the seat of "Aragon" and "Portugal" is free

  @MP-028
  Scenario: The host leaving ends a game that has not started
    Given "Ana" sits in Leroy's game before it starts
    When "Leroy" leaves the game
    Then the game ends for "Ana"

  @MP-029 @MP-030 @MP-027
  Scenario: Only the host starts, with two or more realms
    Given "Leroy" hosted a game as "Castile" and "Ana" sits as "Portugal"
    When "Ana" starts the game
    Then they are refused
    When "Leroy" starts the game
    Then the human realms are "Castile" and "Portugal"
    And a third account can no longer sit down

  @MP-032 @MP-033
  Scenario: A week's orders are kept once
    Given the game has started
    When "Ana" sends their orders for week 0
    And they send the same orders for week 0 again
    Then nothing changes
    When they send different orders for week 0
    Then they are refused
    When they send orders for week 1 before "Leroy" sent week 0
    Then they are refused

  @MP-033
  Scenario: Nobody sends another realm's orders
    When "Ana" sends orders for "Castile"
    Then they are refused

  @MP-034
  Scenario: Devices that disagree are found out
    When "Leroy" and "Ana" send week 3 with different week-start hashes
    Then the game is out of step from week 3 on both devices

  @MP-035 @MP-036
  Scenario: Asking again costs nothing when nothing changed
    Given "Ana" read the game at its latest version
    When they ask again with that version
    Then the server answers "not changed"

  @MP-038
  Scenario: Coming back to a game
    Given "Ana" closed the game during week 6
    When they open it from Your games on their laptop
    Then weeks 0 to 5 are played again at once, a day at a time
    And they plan week 6

  @MP-050 @MP-074
  Scenario: Your games
    Given "Ana" sits in two games and one waits on their orders
    When they open the Multiplayer dialog on any device signed in to their account
    Then both games are listed, newest activity first
    And the one waiting on them is marked

  @MP-051
  Scenario: Leaving a started game hides it
    When "Ana" leaves a started game from the Players card
    Then it is no longer in their Your games
    When they type its code again
    Then it is back

  @MP-039 @MP-040 @placeholder
  Scenario: Limits
    When an account sends more than multiplayer.writes_per_10_minutes writes in ten minutes
    Then the server refuses the rest until the window moves
    And a week's orders larger than multiplayer.max_orders_kb KB are refused

  @MP-041
  Scenario: A deleted account leaves its games
    Given "Ana" sits in a game that has not started
    When "Ana" deletes their account
    Then their realm is free
