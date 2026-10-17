@context-warfare
Feature: The war AI
  As an AI country
  I want to use the same counts, orders and peace voices as the player, set by my personality
  So that the player can read exactly why an enemy fights, waits or talks

  @WAR-194 @open-question
  # OQ-WAR-14: how free-text military doctrine maps to standing orders and styles
  Scenario: Personality sets standing orders and starting styles
    Given the AI country "Castile" with its catalogue military doctrine and risk tolerance
    When the AI plans its turn
    Then its armies' retreat ratio and attack or wait come from its personality
    And the styles its commanders start with come from its personality

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
  Scenario: Personality sets whether it besieges or raids
    Given an AI country at war
    When the AI plans its turn
    Then whether its armies besiege or raid comes from its personality

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
