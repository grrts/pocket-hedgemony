@context-culture
Feature: Seeing tongues
  As a player
  I want tongue dots on the cards, a Peoples screen and a Tongue lens
  So that I can see who my people are and which way they drift

  @CULT-080 @CULT-081
  Scenario: The province card's Tongue line
    Given the country "France" has the court tongue "French"
    And the province "Troyes" is 94 % French and 6 % Flemish
    When the player looks at the province card of "Troyes"
    Then it shows "Tongue French 94 % · Flemish 6 %"
    And "French" has a green dot and "Flemish" a red dot
    When the player taps the Tongue line
    Then it shows this year's drift, that it pulls toward "French", and why

  @CULT-080
  Scenario Outline: Dot colours
    When a tongue of the realm is shown on the province card
    Then a tongue that is <relation> shows a <colour> dot

    Examples:
      | relation       | colour |
      | kin            | green  |
      | cousin         | yellow |
      | stranger       | red    |
      | trading people | grey   |

  @CULT-082 @CULT-083
  Scenario: The Peoples screen of France
    Given the realm of "France" holds French, Occitan, Breton, Flemish, Basque and Jewish people
    When the player taps the Tongue line of the country card of "France"
    Then the Peoples screen opens with the Tongue policy "Teach"
    And it lists, largest first:
      | tongue  | people | relation | where     | notes                                      |
      | French  | 6.9 m  | kin      | 38 prov   |                                            |
      | Occitan | 1.6 m  | cousin   | 9 prov    | homeland, 2 grievances, drifting to French |
      | Breton  | 0.5 m  | stranger | 3 prov    | homeland, Foreign rule, 1 lord             |
      | Flemish | 0.4 m  | stranger | 4 prov    | homeland, Foreign rule                     |
      | Basque  | 0.1 m  | stranger | 1 prov    | homeland, Own-tongue charter               |
      | Jewish  | 0.02 m | trading  | 6 towns   | +10 % trade in Paris, Lyon                 |

  @CULT-083
  Scenario: Many tongues fold by family
    Given the realm of "Ottomans" holds 40 tongues in 9 families
    When the player opens the Peoples screen
    Then the tongues are grouped by family, folded shut

  @CULT-084
  Scenario: Tap and long-press a row
    Given the Peoples screen of "France" is open
    When the player taps the row "Breton"
    Then the Breton provinces light up on the map
    When the player long-presses the row "Breton"
    Then it shows the Breton lords, officials and any rising

  @CULT-085
  Scenario Outline: The Tongue lens
    Given the Tongue lens is on
    When the map is at <zoom>
    Then provinces are coloured by <colouring>

    Examples:
      | zoom                              | colouring                                   |
      | far zoom                          | family                                      |
      | regional zoom                     | tongue                                      |
      | any zoom with the realm toggle on | kin, cousin or stranger for the player's realm |

  @CULT-085
  Scenario: Homelands of peoples without a country are outlined
    Given the Breton people have no country
    When the Tongue lens is on
    Then the Breton homeland is outlined
