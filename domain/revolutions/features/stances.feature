@context-revolutions
Feature: Stances: Lead, Bend, Fight and the historical path
  As a ruler facing a revolution
  I want to lead it, bend to it, fight it, or see the path it takes
  So that each choice leads to a known regime with a known cost

  @REVO-018 @REVO-025
  Scenario: Every revolution event has two to four tagged options with family labels
    Given the revolution "french_revolution" of the family "liberal_national"
    When the event fires for "France"
    Then it offers between 2 and 4 options
    And the options are labelled "Proclaim the new order", "Grant a constitution" and "Restore order"
    And exactly one option is marked historical

  @REVO-019
  Scenario: Lead applies the regime at once, and the old order may rise
    Given the event "french_revolution" fires for "France"
    When "France" takes the option "radical_republic" with the stance "lead"
    Then the regime "revolutionary_republic" applies to "France" at once
    And no revolution rising is raised
    And the lords and clergy the regime hurts may rise as the old order camp

  @REVO-020
  Scenario: Bend applies a milder regime and some signs end
    Given the event "french_revolution" fires for "France"
    When "France" takes the option "constitutional_monarchy" with the stance "bend"
    Then the regimes "crown_and_assembly" and "emancipation" apply to "France"
    And some signs of "french_revolution" end
    And the revolution "french_revolution" re-arms

  @REVO-021
  Scenario Outline: Fight raises a tagged rising whose end decides the regime
    Given the event "french_revolution" fires for "France"
    And "France" takes the option "royal_reaction" with the stance "fight"
    And a rising tagged "french_revolution" is raised in "France"
    When the tagged rising is <ending>
    Then the regime "<regime>" applies to "France"

    Examples:
      | ending      | regime                 |
      | won         | revolutionary_republic |
      | crushed     | reaction               |

  @REVO-024
  Scenario: A crushed rising leaves Bloodshed and the signs stay lit
    Given a rising tagged "french_revolution" in "France" is crushed
    When the settlement is applied
    Then provinces of "France" get the grievance "Bloodshed"
    And the signs of "french_revolution" that were lit stay lit
    And the revolution "french_revolution" re-arms

  @REVO-022
  Scenario: A path outcome applies regimes to the countries it names (the Kaga league)
    Given the event "kaga_ikko_ikki" fires
    When its chooser picks the option "league_rule" with the stance "path"
    Then the regime "league_of_the_faithful" applies to "ikko_ikki_kaga"

  @REVO-023
  Scenario: A regime can apply years after the option
    Given the event "haitian_revolution" fires
    When its chooser picks the option "independence_and_abolition"
    Then the regime "free_republic" applies to "haiti" 12 years later
