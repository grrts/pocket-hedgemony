@context-saves
Feature: Ironman
  As a player who wants every choice to stand
  I want one unbroken save line per ironman campaign
  So that the campaign cannot be rewound, even across devices

  @SAVE-086
  Scenario Outline: Ironman is chosen at the start and kept
    Given the player begins a campaign with ironman <chosen>
    When the player looks for a way to change ironman later
    Then the campaign stays <state>

    Examples:
      | chosen | state           |
      | on     | ironman         |
      | off    | not ironman     |

  @SAVE-087
  Scenario Outline: What ironman forbids
    Given the campaign as "Castile" is ironman
    When the player tries to <action>
    Then it is not possible

    Examples:
      | action                              |
      | make a manual save                  |
      | load an earlier point               |
      | open a console or debug tool        |

  @SAVE-010
  Scenario: Ironman writes on every exit
    Given the campaign as "Castile" is ironman
    When the player exits to the main menu
    Then the ironman save is written

  @SAVE-088
  Scenario: Export and Import of an ironman save
    Given the ironman campaign as "Castile" is on the "Steam Deck"
    When the player exports it and imports it on the "Pixel 8"
    Then the campaign starts on the "Pixel 8"
    And the copy on the "Steam Deck" is no longer the newest

  @SAVE-089
  Scenario Outline: The ironman head check
    Given the ironman campaign's newest save on the server is "<head>"
    When a device uploads an ironman save whose parent is "<parent>"
    Then <result>

    Examples:
      | head | parent | result                                                       |
      | i7   | i7     | the server accepts it and it becomes the head                |
      | i8   | i7     | the server rejects it and the device is told to load the newer game first |

  @SAVE-090
  Scenario: Two devices played one ironman campaign offline
    Given the ironman campaign was played offline on a "Steam Deck" to June 1530 and on this phone to Feb 1528
    When the server rejects the phone's upload because the line has split
    Then the game asks once "Keep the game from Steam Deck (June 1530) or from this phone (Feb 1528)?"
    And the game from the "Steam Deck" is the recommended option
    When the player picks one
    Then the other line is removed

  @SAVE-091
  Scenario: A damaged ironman save
    Given the ironman save of turn 600 is damaged
    And its backup is turn 599
    When the player continues
    Then the backup of turn 599 is opened
    And the player is told
