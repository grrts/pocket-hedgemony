@context-audio
Feature: Music eras and regional palettes
  As a player
  I want the music to change with the centuries and with who I am
  So that 1444 and 1930 sound different, and so do Mali and France

  @AUD-014 @AUD-015 @placeholder
  Scenario Outline: The era follows the calendar
    Given the date is <date>
    Then the music era is <era>

    Examples:
      | date | era |
      | 1444-11-11 | I |
      | 1519-12-01 | I |
      | 1520-01-01 | II |
      | 1650-01-01 | III |
      | 1790-01-01 | IV |
      | 1870-01-01 | V |
      | 1939-08-31 | V |

  @AUD-016
  Scenario: Technology basis is off
    Given the config "eras.basis" is "calendar"
    And the country "Japan" has research far ahead of the calendar
    Then the music era still follows the game year

  @AUD-017
  Scenario: Music stops at the campaign end
    Given the date is 1939-08-31
    Then there is no music era after V
    And no music exists for the Decolonization, Cold War or Globalization ages

  @AUD-018 @placeholder
  Scenario Outline: The primary culture group picks the palette
    Given the player's primary culture group is "<group>"
    Then the palette is "<palette>"

    Examples:
      | group | palette |
      | latin | europe_west |
      | hellenic | europe_east |
      | arab | mena |
      | mongolic | steppe |
      | dravidian | south_asia |
      | japonic | east_asia |
      | austronesian | southeast_asia |
      | mande | west_africa |
      | semitic_ethiopian | africa_east_south |
      | andean | americas |
      | polynesian | oceania |
      | creole_atlantic | atlantic_creole |

  @AUD-019 @placeholder
  Scenario Outline: The turkic group splits by capital
    Given the player's primary culture group is "turkic"
    And the capital lies <side> of longitude 55
    Then the palette is "<palette>"

    Examples:
      | side | palette |
      | west | mena |
      | east | steppe |

  # The blend rule is not designed (OQ-AUD-11).
  @AUD-020 @open-question
  Scenario: A colonial nation founded after 1500
    Given a colonial nation founded in 1620
    Then it uses the Atlantic and creole palette, blending palettes 1, 8 and 10 by its culture mix

  @AUD-021
  Scenario: A culture change takes effect at the next track
    Given the peace track "peace_steppe_early" is playing
    When the player's primary culture group changes to "iranian"
    Then the current track plays on
    And the next track comes from the palette "mena"
