@context-buildings
Feature: Places, town slots and limits
  As the game
  I want every building to stand on a place that fits it
  So that tiles and towns limit what a province can hold

  @BLD-006 @BLD-007 @BLD-008
  Scenario Outline: One building per place
    Given the province "Troyes" has a <place> with a "<existing>" on it
    When the player tries to build a "<new>" on the same <place>
    Then the build is refused because the place is taken

    Examples:
      | place        | existing  | new      |
      | fields tile  | farm      | vineyard |
      | shore tile   | fishery   | harbour  |
      | castle tile  | castle    | castle   |

  @BLD-006
  Scenario: A land building must fit the tile use
    Given the province "Troyes" has an empty woods tile
    When the player opens the build sheet for the woods tile
    Then the "lumber camp" is offered
    And the "farm" is not offered on the woods tile

  @BLD-008
  Scenario: The granary is part of the castle
    Given the province "Troyes" has a stone castle on its castle tile
    When the player builds a "granary"
    Then the granary is part of the castle and takes no other tile or slot

  @BLD-009 @BLD-012
  Scenario Outline: Town slots by town size
    Given the province "<province>" has a town of size "<size>"
    And the province "<province>" <is_capital> the capital
    When the building rules are applied
    Then the town has <slots> town slots

    Examples:
      | province | size        | is_capital | slots |
      | Langres  | hamlet      | is not     | 1     |
      | Langres  | village     | is not     | 2     |
      | Langres  | market town | is not     | 4     |
      | Troyes   | town        | is not     | 6     |
      | Troyes   | city        | is not     | 9     |
      | Paris    | great city  | is not     | 12    |
      | Paris    | great city  | is         | 13    |

  @BLD-012
  Scenario: The capital's extra slot is held for the palace
    Given the province "Paris" is the capital of the country "France"
    When the player opens the build sheet for the capital's extra slot
    Then only the "palace" can be built there

  @BLD-010 @BLD-013
  Scenario Outline: Ring works and outside-town buildings take no slot
    Given the province "Troyes" has all its town slots full
    When the player builds a "<building>"
    Then no town slot is used

    Examples:
      | building        |
      | town walls      |
      | road            |
      | canal           |
      | wells and drains|
      | watchtower line |
      | observatory     |

  @BLD-010
  Scenario: Only one of each ring work per province
    Given the province "Troyes" has "town walls" at step "palisade"
    When the player tries to build a second "town walls"
    Then the build is refused
    But the player may upgrade the "town walls" to "stone walls"

  @BLD-011
  Scenario Outline: A shrinking town neglects its extra buildings
    Given the province "Troyes" has a city with 9 town buildings
    And the town shrinks to a town of 6 slots
    When the <who> resolves the shrink
    Then 3 town buildings become neglected and are kept
    And the neglected buildings are <chosen>
    And they stay neglected until the town grows back

    Examples:
      | who    | chosen                         |
      | player | the ones chosen on the prompt  |
      | AI     | the 3 newest                   |

  @BLD-014
  Scenario Outline: One per province
    Given the province "Troyes" has a "<building>"
    When the player tries to build a second "<building>" in "Troyes"
    Then the build is refused

    Examples:
      | building      |
      | market        |
      | seat          |
      | school        |
      | mint          |
      | drill yard    |
      | arsenal       |
      | hospital      |
      | bank          |
      | harbour       |
      | shipyard      |
      | lighthouse    |
      | rail station  |
      | power station |

  @BLD-015
  Scenario: One house of worship per faith per town
    Given the province "Constantinople" is a city with a church
    When the player builds a synagogue and a mosque in "Constantinople"
    Then the city has a church, a synagogue and a mosque side by side
    But a second church in "Constantinople" is refused

  @BLD-016
  Scenario Outline: One per realm, in the capital
    Given the country "France" has a "<building>" in its capital "Paris"
    When the player tries to build a "<building>" in "Troyes"
    Then the build is refused

    Examples:
      | building          |
      | palace            |
      | chancery          |
      | diet hall         |
      | hostage residence |
      | parliament house  |

  @BLD-017
  Scenario: Ware buildings are limited only by places
    Given the province "Troyes" has 3 loom houses and 2 free town slots
    When the player builds 2 more loom houses
    Then "Troyes" has 5 loom houses
