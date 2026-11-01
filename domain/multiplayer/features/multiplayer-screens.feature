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

  @MP-083
  Scenario: The host picks the turn limit in the lobby
    Given "Leroy" hosts a game
    Then the lobby card shows No limit, 5 min, 1 hour and 1 day, with No limit picked
    When they tap 5 min
    Then 5 min is picked and the card says a realm whose orders are late does nothing that week
    And the other players see no turn limit buttons

  @MP-083
  Scenario: Handing a realm to the AI takes a second tap
    Given the host opens the Players card
    When they tap To the AI on Ana's row
    Then the button reads "Tap again" and a line says Ana cannot come back to the realm
    When they tap it again
    Then the row reads "played by the AI"
    And Ana's device goes back to the start screen saying their realm was handed to the AI

  @MP-073
  Scenario: The Players plaque counts down
    Given an online campaign with a turn limit of 1 hour
    Then the Players plaque shows the time left, counting down

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
