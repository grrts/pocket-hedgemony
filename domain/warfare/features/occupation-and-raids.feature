@context-warfare
Feature: Occupation and raids
  As a player
  I want to hold enemy land by taking its castles, or burn and loot it with horse
  So that occupied land is what I can demand at the peace table, and herding peoples can make war pay

  # Config keys: warfare.occupation.hold_season, warfare.raid.loot_per_riders

  @WAR-175
  Scenario Outline: Occupying a province
    Given the province "<province>" of "France" <castle>
    When an army of "Burgundy" <action>
    Then "<province>" is occupied by "Burgundy"
    And "Burgundy" gets its tax, recruits, food and trade

    Examples:
      | province  | castle               | action                                   |
      | Troyes    | has a castle         | takes its castle                         |
      | Reims     | has no castle        | holds it for a season                    |

  @WAR-175
  Scenario: The lord of an occupied province wavers toward the occupier
    Given the lord "Duke of Bourbon" holds a province of "France"
    When "Burgundy" occupies that province
    Then the lord "Duke of Bourbon" wavers toward "Burgundy"

  @WAR-176 @placeholder
  Scenario: A horse raid burns and loots
    Given a horse-only army of 2000 riders of "Crimea" with orders Raid in an enemy province
    When a week passes
    Then it burns one tile
    And it takes gold from market and town, and herds and horses from pasture, up to 40 loads
    And it moves on without besieging or occupying

  @WAR-176
  Scenario: Castles can sally against raiders
    Given a raiding army in a province with an enemy castle
    When the week is played
    Then the castle's garrison may sally against it

  @WAR-176
  Scenario: A raiding army can't besiege
    Given a horse-only army with orders Raid in a province with an enemy castle
    When the week is played
    Then it cannot besiege or occupy
