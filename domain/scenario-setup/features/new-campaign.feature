@context-scenario-setup
Feature: Choosing a realm and campaign rules
  As a player
  I want to pick a realm and the rules of my campaign
  So that I start the game I want and the rules stay fixed

  @SETUP-051
  Scenario Outline: The free tier offers the Ottomans and France
    Given the player has not bought the full game
    When the realm picker lists "<realm>"
    Then "<realm>" is <state>

    Examples:
      | realm    | state     |
      | Ottomans | playable  |
      | France   | playable  |
      | Castile  | locked    |

  @SETUP-051
  Scenario: The tutorial is played as the Ottomans
    Given the player starts the tutorial
    When the tutorial campaign begins
    Then the player's realm is the Ottomans

  @SETUP-052
  Scenario: A locked realm leads to Unlock and comes back chosen
    Given the player has not bought the full game
    And the player taps the realm "Portugal"
    When the player buys the full game from its Unlock button
    Then the realm picker returns with "Portugal" chosen and unlocked

  @SETUP-053
  Scenario Outline: The realm picker filters realms on the map
    Given the realm picker at world zoom
    When the player filters by "<filter>"
    Then only realms matching "<filter>" are offered

    Examples:
      | filter           |
      | region           |
      | difficulty       |
      | free or locked   |

  @SETUP-054 @SETUP-055
  Scenario: Campaign rules are set once and shown read-only
    Given the player chooses difficulty, AI temper, fog, historical events, ironman and the end date on the new campaign screen
    When the campaign begins
    Then the rules are saved with the campaign
    And Pause, Campaign rules shows them read-only

  @SETUP-054
  Scenario: A preset fills the whole options step
    Given the new campaign options step
    When the player picks a preset
    Then difficulty, AI temper, fog, events, ironman and end date are all filled

  @SETUP-056
  Scenario: A new game starts from a seed with a new campaign id
    Given the player chose "France" and the default rules
    When the player taps Begin
    Then the engine starts a new game from a seed, the player's nation and the options
    And the campaign gets a new random id

  @SETUP-057
  Scenario Outline: The save header records whether the realm needs the full game
    Given a campaign as "<realm>"
    When it is saved
    Then the header records the nation "<realm>" and that it <needs> the full game

    Examples:
      | realm    | needs         |
      | France   | doesn't need  |
      | Portugal | needs         |

  @SETUP-058
  Scenario: Quick start skips to Begin
    Given the player last tapped "Castile" and used normal difficulty
    When the player taps Quick start
    Then the Begin step shows "Castile" with the last options used
