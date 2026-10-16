@context-audio
Feature: Care in music and sound
  As the team
  I want the soundtrack and effects to describe history without praising harm or caricaturing peoples
  So that the game treats every culture with the same respect

  @AUD-123
  Scenario: Palette review before release
    Given the palette "west_africa" has its tracks written
    Then a musician or scholar of that tradition reviews them before release
    And the credits name the reviewer

  @AUD-124
  Scenario: Every palette develops through all eras
    Given the first-release track list
    Then the palettes "americas", "west_africa" and "africa_east_south" have late tracks for Eras IV and V like "europe_west"

  @AUD-125
  Scenario: Narrative-only events get no triumph
    When an event marked "depiction: narrative_only" fires
    Then no triumphant stinger plays
    And only "event_major" plays, in a sombre form

  @AUD-126
  Scenario Outline: Harm never gets a rewarding sound
    When <harm> happens
    Then no coin, chime, fanfare or rising sound plays
    And at most "realm_fire" or a single low bell plays

    Examples:
      | harm |
      | a razing |
      | a massacre event |
      | an enslavement event |

  @AUD-126
  Scenario: Plunder fills the treasury silently
    When the player's army plunders a province
    Then gold is added without "econ_income" or any coin sound

  @AUD-127
  Scenario: Colonial conquest has no victory sound of its own
    When a colonial war ends with the player's win
    Then the same stinger plays as for any other won war

  @AUD-128
  Scenario: No voices anywhere
    Given any sound in the catalogue
    Then it contains no speech, no crowd recording and no cries
    And "shout" sounds are pulse sweeps
