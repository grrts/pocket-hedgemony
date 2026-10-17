@context-map-presentation
Feature: Reading the map without colour
  As a player with colour-blindness or low vision
  I want lenses, borders and routes that read without relying on colour
  So that a map read by colour is still readable for me

  @VIEW-047
  Scenario Outline: Colour vision modes swap nation colours and lens ramps
    Given the colour vision setting is "<mode>"
    When the map is drawn with the Food lens
    Then nation colours use <colours>
    And the lens uses <ramp>

    Examples:
      | mode             | colours                                      | ramp                         |
      | Default          | the normal assignment                        | its normal ramp              |
      | Green-weak       | a second assignment from the 32-colour palette | a blue to orange ramp      |
      | No colour        | greys                                        | greys with patterns          |

  @VIEW-048
  Scenario: Patterns let a lens read without colour
    Given patterns on lenses are on
    When the map is drawn with the Grievances lens
    Then each band of the lens carries its own hatching, dots or stripes

  @VIEW-049
  Scenario: High contrast borders
    Given the borders setting is "High contrast"
    When the map is drawn
    Then nation borders are black and white ink two art pixels wide

  @VIEW-050
  Scenario Outline: Route food colours carry patterns
    Given a route whose food state is <state>
    When the route is drawn
    Then its line is <pattern>

    Examples:
      | state                 | pattern |
      | covered               | solid   |
      | under half            | dashed  |
      | empty                 | dotted  |

  @VIEW-050
  Scenario: Day counts hide rather than shrink
    Given a route is drawn with day counts
    When the player zooms out past where the counts would be under 10 points tall
    Then the day counts are hidden

  @VIEW-051
  Scenario: The tutorial's Food lens works without telling colours apart
    Given the tutorial asks for the Food lens
    When the map is drawn
    Then hungry provinces also carry the hunger icon
