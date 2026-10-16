@context-audio
Feature: How effects change with era and region
  As a player
  I want the interface to sound the same in every century while armies sound like their era
  So that the controls stay learnable and battles tell me who is ahead

  @AUD-064
  Scenario Outline: Fixed sounds never change
    Given the date is <date>
    When the player taps a button
    Then "ui_tap" sounds the same as in 1444

    Examples:
      | date |
      | 1444-11-11 |
      | 1939-08-01 |

  @AUD-065 @AUD-068
  Scenario Outline: Turn chimes follow the music era with the same notes
    Given the music era is <era>
    When the player presses End turn
    Then "turn_end" plays motif notes 1 – 5 with <arrangement>

    Examples:
      | era | arrangement |
      | I | a 12.5 % duty doubling and no bell |
      | II | one arpeggio step added |
      | III | two arpeggio steps added |

  # The Era V W2 swell uses a music voice (OQ-AUD-1).
  @AUD-068 @open-question
  Scenario: Era V turn chime
    Given the music era is V
    When the player presses End turn
    Then "turn_end" adds a short W2 swell under the chime

  @AUD-066 @placeholder
  Scenario Outline: Army sounds follow the army's own era
    Given an army whose inventions put it in warfare era <era>
    When it shoots in battle
    Then the sound is "<sound>"

    Examples:
      | era | sound |
      | I | battle_shoot_bow |
      | III | battle_shoot_matchlock |
      | IV | battle_shoot_volley |
      | VI | battle_shoot_rifle |
      | VII | battle_shoot_mg |

  @AUD-066
  Scenario: Two eras on one field
    Given a battle in 1879 between an army of warfare era V with breech-loaders and an army of warfare era I with spears and shields
    Then one side's volley sounds like breech-loaders
    And the other side sounds like spears and shields

  @AUD-066
  Scenario Outline: Marching by army era
    Given an army of warfare era <era> marches with the camera following at local zoom
    Then "army_march_loop" uses <steps>

    Examples:
      | era | steps |
      | I | a frame drum and loose steps |
      | IV | a field drum and measured steps |
      | V | a snare and boots |
      | VII | an engine drone when the army has motor transport |

  @AUD-067
  Scenario Outline: Palette sounds
    Given the player's palette is "west_africa"
    When "<sound>" plays
    Then it uses the "west_africa" <part>

    Examples:
      | sound | part |
      | turn_ready | wavetable and tuning table on S3 |
      | diplo_accepted | lead wavetable for the court horn |

  @AUD-067
  Scenario: Battle sounds don't follow culture
    Given two armies of the same warfare era and troop type from different palettes
    Then their shooting sounds are the same

  @AUD-069
  Scenario: Nothing beyond 1939
    Given the effects catalogue
    Then no sound variant exists for warfare era VIII or music era VI
