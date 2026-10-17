@context-subjects
Feature: Subjects on screen
  As a player
  I want a subjects list, a subject card and map marks
  So that I can see and act on my subjects at a glance

  @SUBJ-091
  Scenario: The subjects list of France
    Given "France" uses 7 of 9 reach and receives 42 gold and 6 grain a month in tribute
    When the player opens the subjects tab of the country card
    Then the header reads "SUBJECTS 7 of 9 reach" and "Tribute 42 gold / 6 grain a month"
    And the rows are sorted by loyalty, worst first
    And each row shows the kind icon, name, loyalty, up and down arrow counts, what it pays and its worst reason

  @SUBJ-091
  Scenario: A row shows its worst reason
    Given "Granada" is a Disloyal Tributary with 0 up and 4 down arrows, worst "Different faith"
    When the player opens the subjects tab
    Then the row of "Granada" shows "Disloyal", "▲0 ▼4", "pays 0" and "Different faith"

  @SUBJ-092
  Scenario: The subject card of Brittany
    Given the subject rules are in force
    When the player opens the card of "Brittany"
    Then the card has the lord card's frame
    And it shows "Vassal", Duke Francis I, age 30, House Montfort
    And it shows its provinces, army, treasury and its own subjects
    And it shows its loyalty with each up and down reason
    And it shows what it pays and how it comes when called
    And it shows the buttons Set tribute, Gift, Resident, Marriage, Call to war and Fold in

  @SUBJ-093
  Scenario: World zoom
    Given "Brittany" is a subject of "France"
    When the map is at world zoom
    Then "Brittany" is drawn in the colour of "France" with a 2-pixel diagonal hatch in its own colour
    And the border between "France" and "Brittany" is dotted

  @SUBJ-093
  Scenario: A chain never stacks hatches
    Given "Taranto" is a subject of "Naples", a Vassal of "Papal States"
    When the map is at world zoom
    Then "Taranto" is hatched in the colour of "Naples" only

  @SUBJ-094
  Scenario Outline: Region zoom
    Given the subject "S" is a "<loyalty>" "<kind>"
    When the map is at region zoom
    Then the icon "<icon>" sits on its capital with a <tint> frame

    Examples:
      | kind      | loyalty   | icon   | tint   |
      | Vassal    | Loyal     | shield | green  |
      | Tributary | Wavering  | chest  | yellow |
      | Union     | Disloyal  | two crowns | orange |
      | Vassal    | In revolt | shield | red    |

  @SUBJ-095
  Scenario: The subjects lens
    Given "England" courts "Brittany", a subject of the player's "France"
    When the player opens the subjects lens
    Then the subjects of "France" are coloured by loyalty
    And a line runs from the capital of "England" to "Brittany"

  @SUBJ-096
  Scenario Outline: Opening a subject's card from the map
    Given the player uses <input>
    When the player <gesture> on "Brittany"
    Then the card of "Brittany" opens

    Examples:
      | input        | gesture                                        |
      | touch        | long-presses                                   |
      | a controller | selects it and presses the card button         |
