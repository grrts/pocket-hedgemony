@context-map-presentation
Feature: Drawing the map at each scale
  As a player
  I want the map drawn as terrain and owners far out and as pixel-art tiles close in
  So that I read the world at a glance and see the land up close

  @VIEW-001
  Scenario: Recolouring after a turn only changes the lookup texture
    Given the province id image has been uploaded once
    When a turn changes the owners of 12 provinces
    Then only the province colour lookup texture is updated
    And the id image is not uploaded again

  @VIEW-002
  Scenario: Far out the map shows terrain with the owner washed over it
    Given the camera is zoomed out
    When the map is drawn
    Then each map pixel takes its terrain's colour with hill shading and the owner's colour washed over it
    And the sea is shaded by depth with dithered band edges

  @VIEW-003
  Scenario Outline: Closer in, each map pixel becomes art pixels
    Given the camera is at <zoom> zoom
    When the map is drawn
    Then each map pixel becomes <art> art pixels from the terrain tile atlas

    Examples:
      | zoom   | art   |
      | middle | 4 × 4 |
      | close  | 8 × 8 |

  @VIEW-004
  Scenario: Nation borders are an ink line with the owner's colour inside
    Given the provinces "Aube" of "France" and "Côte-d'Or" of "Burgundy" are neighbours
    When the map is drawn
    Then their border is an ink line with a band of each owner's colour on its side

  @VIEW-005
  Scenario: A repainted tile changes the far map too
    Given the tile type "steppe" is repainted with a paler grass
    When the map is drawn zoomed out
    Then steppe pixels take the new average colour

  @VIEW-006
  Scenario: Rivers are drawn as one clean line
    Given a river traced through the province "Aube"
    When the map is drawn at Region zoom
    Then the river is one line along its traced pixels
