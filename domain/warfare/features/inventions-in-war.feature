@context-warfare
Feature: Inventions' effects in war
  As a player
  I want each war, castle and road invention to change concrete numbers in battle, siege and supply
  So that research shows up on the battlefield

  # Config keys: warfare.arms, warfare.hits_per_bell, warfare.siege.b7_multiplier, warfare.castles

  @WAR-122 @placeholder @open-question
  # OQ-WAR-11: W20's effect differs between warfare 7.10, warfare-eras and the research tree
  Scenario Outline: W inventions in battle
    Given the country "France" knows "<invention>"
    When the invention effects are applied
    Then in battle <effect>

    Examples:
      | invention                       | effect                                                                       |
      | W1 Composite-bow horse archery  | its Skirmish-approach commanders get +1 order per bell while they have horse archers |
      | W2 Heavy armoured cavalry       | Breakthrough charges deal x2.5 instead of x2                                 |
      | W3 Bombards                     | bombards fight at 5 per gun and Bombardment commanders can exist             |
      | W4 Wagon fort                   | its Entrenchment commanders' dug sectors also block Turn and Drive           |
      | W5 Gunpowder infantry           | its Shot ignores Heavy                                                       |
      | W7 Pike and shot                | its Brace mixed with its own shot no longer takes x1.5 from shooting         |
      | W8 Field artillery              | its field guns reach the neighbouring sectors and Bombardment hits x1.5      |
      | W9 Volley fire drill            | its Shot hits x1.5 in the first bell of each day                             |
      | W10 Supply magazines            | its Shot and guns have +1 bell of ammunition                                 |
      | W11 Flintlock and bayonet       | every foot company becomes Brace and pikes are obsolete                      |
      | W12 Standing regiments          | its standing regiments never drop below level 2                              |
      | W13 Light field artillery       | its guns can Shift with the line and Bombardment keeps the line back only 1 bell |
      | W14 Army divisions              | every commander gets +1 order per bell                                       |
      | W16 Rifled musket               | its riflemen hit 5 % of the front per bell                                   |
      | W17 Breech-loading rifle        | its riflemen hit 6 % of the front per bell                                   |
      | W19 Machine gun                 | shooting from its dug-in sectors is x2 and charges into them always fail     |
      | W20 Smokeless powder            | its Ambush companies can shoot from woods without being spotted              |
      | W21 Tanks                       | it has a Shock arm that ignores dug-in sectors and machine guns              |
      | W22 Military aircraft           | every commander sees hidden companies and aircraft hit any sector or camp    |
      | W23 Field radio                 | every commander gets +1 order per bell and captains give orders in their own sector |

  @WAR-190 @placeholder
  Scenario Outline: B inventions in war
    Given the country "France" knows "<invention>"
    When the invention effects are applied
    Then <effect>

    Examples:
      | invention                     | effect                                                       |
      | B1 Stone castles              | it can have stone castles                                    |
      | B4 Earthwork ring forts       | it can have earthwork ring forts                             |
      | B5 Bastion fortification      | it can have bastion forts, against which bombards are nearly useless |
      | B6 Star forts                 | it can have star forts, against which bombards are nearly useless |
      | B7 Siege parallels            | its shot and mining in sieges are x1.5                        |
      | B2 Roads                      | its roads give the road factor to troop-movement              |

  @WAR-191
  Scenario: Army divisions let armies split and join in a day
    Given the country "France" knows "W14 Army divisions"
    When it splits an army
    Then the split takes a day

  @WAR-192 @placeholder
  Scenario: Mass conscription keeps levies longer
    Given the country "France" knows "W15 Mass conscription"
    And a levy company has been out 7 months
    When the month ends
    Then none of its men go home

  @WAR-193 @placeholder
  Scenario: Military aircraft scout and bomb
    Given the country "France" knows "W22 Military aircraft"
    When the invention effects are applied
    Then its scouts see 4 provinces
    And it can bomb castles with shot and bomb wagons
