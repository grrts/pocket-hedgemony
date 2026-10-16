@context-revolutions
Feature: Revolutions on the phone
  As a player
  I want banners, a revolution lens and a regime card
  So that I notice revolutions abroad, see where one will start, and know my new rules

  @REVO-075
  Scenario Outline: Banners only for countries that matter to me
    Given the player's country is "England"
    And "France" is <relation> of "England"
    When a revolution breaks out in "France"
    Then the banner "Revolution in France: the Bastille has fallen" <shown>

    Examples:
      | relation        | shown           |
      | a neighbour     | is shown        |
      | a rival         | is shown        |
      | a Great Power   | is shown        |
      | none of these   | is not shown    |

  @REVO-075
  Scenario: Tapping the banner opens the card
    Given the banner about the revolution in "France" is shown
    When the player taps it
    Then the revolution card of "France" opens

  @REVO-076
  Scenario: The revolution lens shows where the fire will start
    Given the revolution "french_revolution" has province-level signs
    When the player turns on the revolution lens
    Then each province is shaded by how many of those signs it meets
    And risen provinces are hatched in the revolution's colour

  @REVO-077
  Scenario: The regime card on the government screen
    Given the country "France" holds the regime "revolutionary_republic"
    When the player opens the government screen
    Then it shows the line "You must run every province with officials and can arm the whole nation, while every king wants you gone."
    And the decrees "levy_en_masse", "sell_church_lands" and "revolutionary_tribunal" are buttons
    And "grant_fief", "sell_title" and "call_the_lords" are greyed out with "Locked by the revolution"
