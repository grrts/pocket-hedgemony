@context-recruiting
Feature: Standing regiments and lords' retinues
  As a player
  I want to keep trained regiments under arms in peace, and lords to raise their own men
  So that drill is not lost every peace and lords bring retinues by the same rules

  @RECR-055 @placeholder
  Scenario: Signing on a regiment
    Given the country "France" knows invention "W12 Standing regiments"
    And a trained regiment of 1000 "pikes" paid 200 gold a month
    When the regiment is signed on
    Then it stays under arms in peace, keeping its drill and scars
    And it is paid 300 gold a month all year

  @RECR-055
  Scenario: No signing on without W12
    Given the country "France" does not know invention "W12 Standing regiments"
    When the player tries to sign on a trained regiment
    Then the order is refused

  @RECR-056
  Scenario: Signed-on men leave the pool for good
    Given a regiment of 1000 men from "Troyes" is signed on
    Then those 1000 men are gone from the pool of "Troyes" while they serve
    And their slots in "Troyes" stay empty

  @RECR-057
  Scenario Outline: Housing a standing regiment in peace
    Given a standing regiment in peace in province "Troyes"
    And the province "Troyes" <has> a barracks with room for it
    When the month ends
    Then the province "Troyes" <gets> "Soldiers quartered"

    Examples:
      | has          | gets          |
      | has          | does not get  |
      | does not have | gets         |

  @RECR-058
  Scenario: A lord raises his retinue by the same rules
    Given the lord "Duke of Bourbon" holds lands with a castle
    When the lord "Duke of Bourbon" levies and trains his retinue
    Then the levy follows the same call shares from his lands
    And he pays from his own wealth and trains at his own castles

  @RECR-059
  Scenario Outline: A lord's traits decide what he trains
    Given the lord "<lord>" has trait "<trait>"
    When the lord trains his retinue
    Then he trains <arms>

    Examples:
      | lord      | trait   | arms                          |
      | Lord A    | Warlike | knights and armoured foot     |
      | Lord B    | Greedy  | nothing: he keeps levies      |
