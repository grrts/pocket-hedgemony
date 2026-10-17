@context-warfare
Feature: The war AI
  As an AI country
  I want to use the same counts, orders and peace voices as the player, set by my personality
  So that the player can read exactly why an enemy fights, waits or talks

  @WAR-194 @placeholder
  Scenario Outline: Risk tolerance sets standing orders
    Given the AI country "<country>" has the risk tolerance "<risk>"
    When the AI plans its turn
    Then its armies' standing order is "<order>" and they retreat if outnumbered "<ratio>"

    Examples:
      | country  | risk   | order  | ratio  |
      | Savoy    | low    | wait   | 1 to 1 |
      | Castile  | medium | attack | 3 to 2 |
      | Ottomans | high   | attack | 2 to 1 |

  @WAR-194
  Scenario: Starting styles come from the style catalogue
    Given the AI country "Castile" has the risk tolerance "medium"
    When the AI plans its turn
    Then its new commanders can start with the style "A la jineta"

  @WAR-195
  Scenario Outline: Personality sets which kinds it raises
    Given the AI country "<country>"
    When the AI plans its turn
    Then it raises mainly <kinds>

    Examples:
      | country | kinds                                             |
      | Castile | noble retinues and frontier light horse           |
      | Venice  | hired companies                                   |

  @WAR-195
  Scenario Outline: Personality sets whether it besieges or raids
    Given the AI country "<country>" has the risk tolerance "<risk>"
    And its army is <army>
    When the AI plans its turn
    Then its army <does>

    Examples:
      | country  | risk   | army          | does     |
      | Ottomans | high   | horse only    | raids    |
      | Ottomans | high   | foot and horse | besieges |
      | Castile  | medium | horse only    | besieges |

  @WAR-196 @placeholder
  Scenario Outline: Risk sets when the AI talks peace
    Given the AI country "<country>" has the personality "<personality>"
    When the AI plans its turn
    Then it offers peace when <share>

    Examples:
      | country  | personality    | share                                   |
      | Savoy    | low risk       | a third of its voices say peace         |
      | Ottomans | hegemon seeker | it is forced by its peace voices        |

  @WAR-197
  Scenario: The AI doesn't cheat on food
    Given the AI country "Burgundy" plans a march into France
    When the AI plans its turn
    Then it reads the same forage limits, food reserves and peace voices the player sees
