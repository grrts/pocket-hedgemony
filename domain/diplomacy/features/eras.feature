@context-diplomacy
Feature: Diplomacy through the eras
  As the game
  I want a few diplomatic rules to change with eras, inventions and events
  So that diplomacy runs from embassies and marriages in 1444 to the alliance blocs of 1914

  @DIPL-165
  Scenario: Era I: no residents except the Italian states
    Given the era is "I"
    When the game evaluates it
    Then only countries that know "G8" may make residents
    And the Italian states start knowing "G8"

  @DIPL-166
  Scenario: The Peace of Westphalia unlocks many-sided peace early
    Given the era is "II"
    When the event "peace_of_westphalia" fires
    Then many-sided peace is available

  @DIPL-167 @placeholder
  Scenario Outline: Married houses weigh less from era IV
    # config: eras.IV.ties.married_houses
    Given the era is "<era>"
    And the houses of "A" and "B" are bound by 1 living marriage
    When the game evaluates it
    Then the tie "Married houses" weighs <weight>

    Examples:
      | era | weight |
      | III | 15     |
      | IV  | 10     |

  @DIPL-157 @placeholder
  Scenario Outline: The league threshold falls
    # config: leagues.threshold_by_era
    Given the era is "<era>"
    When the game evaluates it
    Then the league threshold is <threshold> provinces

    Examples:
      | era | threshold |
      | I   | 8         |
      | II  | 8         |
      | III | 8         |
      | IV  | 6         |
      | V   | 6         |
      | VI  | 4         |
      | VII | 4         |

  @DIPL-168 @placeholder
  Scenario: Offensive calls between pact partners
    # config: eras.VI.pact_offensive_call_bonus
    Given the date is "1914-07"
    And the allies "Germany" and "Austria-Hungary" share a mobilisation pact
    When the country "Germany" sends an offensive call to "Austria-Hungary"
    Then the call holds +10 for the pact

  @DIPL-169
  Scenario: A mobilisation pact answers a defensive call by itself
    Given the date is "1914-07"
    And the allies "Germany" and "Austria-Hungary" have marked their alliance as a mobilisation pact
    And the player plays "Germany"
    When the country "Russia" declares war on "Austria-Hungary"
    Then the defensive call to "Germany" is answered yes with no reasons count
    And the player gets the event "Our pact partner is attacked: we mobilise" saying "Germany" has joined the war

  @DIPL-169
  Scenario: Mobilisation pacts need era VI
    Given the era is "V"
    When the allies "A" and "B" mark their alliance as a mobilisation pact
    Then the order is refused

  @DIPL-170 @placeholder
  Scenario: Era VII gifts count half
    # config: eras.VII.ties.gift
    Given the era is "VII"
    When the country "A" sends the country "B" a gift of 100 gold
    Then the ledger of "B" toward "A" gains "Gift" at +10

  @DIPL-171
  Scenario: A revolution adds a reason row
    Given the country "France" became a revolutionary republic by a revolution
    When the monarchy "Austria" counts any ask of "France"
    Then the count holds "Different form of rule" at -20 for the time the revolution sets
