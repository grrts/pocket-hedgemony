@context-multiplayer
Feature: Multiplayer screens
  As a player on a phone in landscape
  I want to find, start and follow a multiplayer game in a few taps
  So that playing together is as easy as a game of one

  @MP-070
  Scenario: The Multiplayer dialog
    When the player taps Multiplayer on the start screen
    Then the dialog shows Pass and play, Online with Host a game and Join a game, and Your games

  @MP-071 @MP-076
  Scenario: Hosting from the realm chooser
    When the player taps Host a game and taps "Castile" on the map
    Then the lobby card shows the code large with "Others open Multiplayer and type this code"

  @MP-072
  Scenario: One place per subject
    Then games are in the Multiplayer dialog
    And one game before it starts is in the lobby card, with the players' names and realms
    And one game while it runs is in the Players card, with Leave

  @MP-073
  Scenario: The Players plaque
    Given an online campaign with three human realms where one has pressed Ready
    Then the top bar shows three pennants, one lit, and "1/3"
    When the player taps the plaque
    Then the Players card opens

  @MP-075
  Scenario Outline: Phone in landscape
    Given a <device> in landscape
    Then the dialog, lobby card, Players card and cover fit inside the safe areas
    And every button and the code field are at least 44 points tall

    Examples:
      | device    |
      | Pixel 7   |
      | iPad Pro  |

  @MP-077
  Scenario Outline: A refused write says why
    When joining fails because <reason>
    Then the player reads "<message>"

    Examples:
      | reason                       | message                                                     |
      | the realm is taken           | Castile is taken in game KTRVW: choose another realm.        |
      | the game has started         | Game KTRVW has already started without you.                 |
      | there is no such game        | No game KTRVW. Check the code with its host.                 |
      | the server cannot be reached | Can't reach the server. Check the connection and try again. |
