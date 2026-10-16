@context-achievements
Feature: Achievement icons
  As a player
  I want crisp pixel-art icons that show what each achievement is about
  So that the list looks like the game on every store

  @ACH-065
  Scenario Outline: The frame shows the tier
    Given an achievement of tier "<tier>"
    Then its icon is drawn at 32 by 32 pixels in the game's palette
    And it has a 2-pixel frame in "<colour>"

    Examples:
      | tier | colour |
      | copper | copper |
      | silver | silver |
      | gold | gold |
      | crown | crown purple-gold |

  @ACH-066
  Scenario Outline: Icons scale by whole numbers
    Given an icon of 32 by 32 pixels
    When it is exported for "<store>"
    Then it is scaled by <factor> with nearest-neighbour to <size> pixels square, without smoothing

    Examples:
      | store | factor | size |
      | Steam | 2 | 64 |
      | Game Center | 16 | 512 |
      | Google Play | 16 | 512 |

  @ACH-067
  Scenario: Steam gets a locked image
    When the icons are exported for "Steam"
    Then each achievement also has a locked image in the grey "unknown land" parchment tones

  @ACH-068
  Scenario: Icons never show a real flag
    Given the achievement "first_harvest"
    Then its icon shows the thing it is about, such as a sheaf of grain
    And it shows no real flag or coat of arms
