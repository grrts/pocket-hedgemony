@context-revolutions
Feature: Decrees
  As a player under a revolutionary regime
  I want the regime's decrees as buttons with a cost and a limit
  So that each regime gives new ways to play, each a trade-off

  @REVO-052 @REVO-054 @placeholder
  Scenario Outline: Decree buttons sit on a card with a cost and a limit
    Given the country holds a regime that unlocks the decree "<decree>"
    When the player opens the <card> card
    Then the button "<decree>" is shown with the cost "<cost>" and the limit "<limit>"

    Examples:
      | decree                    | card     | cost                                           | limit                       |
      | call_the_faithful         | country  | No gold; 1 stability                           | Once every 5 years          |
      | convert_by_decree         | province | Gold by the province's people                  | One province at a time      |
      | appoint_emir              | province | Gold gift                                      | When a governor dies or is removed |
      | sacred_treasury           | country  | Each province's surplus food                   | Each harvest                |
      | open_the_granaries        | province | Castle store food                              | Any time                    |
      | ask_the_towns             | country  | A town charter promise                         | Once every 3 years          |
      | call_the_assembly         | country  | One season                                     | Any time                    |
      | sell_bonds                | country  | Interest each year                             | Up to the loan limit        |
      | charter_a_company         | country  | Gold and two merchants                         | One per ocean               |
      | army_council              | country  | None                                           | Any time                    |
      | sell_church_lands         | country  | Clergy and Pious lords waver                   | Once                        |
      | levy_en_masse             | country  | Conscription grievance everywhere for 3 years  | While at war                |
      | revolutionary_tribunal    | country  | Bloodshed in the provinces of those tried      | Any time                    |
      | arm_the_people            | country  | Tools and old weapons only                     | Defensive wars              |
      | divide_the_estates        | province | The lord or owner of the tiles turns Disloyal  | One province a season       |
      | settle_the_frontier       | country  | Indigenous homelands get Foreign rule and a resistance | Any time            |
      | caudillos_pact            | country  | Provinces granted                              | Any time                    |
      | summon_to_court           | country  | Gold for the court each year                   | Any time                    |
      | intendants                | province | An official's wage                             | One per lord                |
      | censorship                | country  | Scholars -10 % a year while on                 | Toggle                      |
      | local_directorates        | province | No tax rise there                              | Risen provinces only        |
      | abolish_domains           | country  | Pensions: each lord's yearly income, for 20 years | Once                     |
      | missions_abroad           | country  | Gold and two scholars                          | Once every 10 years         |
      | table_of_ranks            | country  | None                                           | Toggle                      |
      | call_the_age_regiment     | country  | Births -10 % while serving                     | One age set at a time       |
      | officers_to_the_provinces | country  | Commanders taken from the army                 | Any time                    |
      | buy_a_warlord             | country  | Gold, by the warlord's army                    | Any time                    |
      | requisition_grain         | country  | Requisitioned grievance in every farming province | Each harvest             |
      | script_and_schools        | country  | Scholars retrain: research -25 % for 5 years   | Once                        |
      | raise_provincial_army     | province | The official becomes a lord with a retinue     | Any time                    |
      | gather_the_tribes         | province | The province loses a third of its people; its lord's retinue moves with them | Once every 5 years |
      | protection_tribute        | province | The province's owner: opinion -20              | Neighbouring provinces only |
      | garrison_hill_forts       | province | Gold for each fort's three officers            | Hill and mountain provinces |
      | hire_drill_masters        | country  | Gold each year; Proud lords waver              | Up to 3 at once             |

  @REVO-053 @REVO-054
  Scenario Outline: A decree is a trade-off
    Given the country holds a regime that unlocks the decree "<decree>"
    When the player uses the decree "<decree>"
    Then <gain>
    And <price>

    Examples:
      | decree               | gain                                                                              | price                                                    |
      | sell_church_lands    | the treasury gains ten years of the state church's tile income                    | the clergy and Pious lords waver                          |
      | levy_en_masse        | every class can be levied at the farmers' share and the levy caps double for one war | every province gets Conscription for 3 years          |
      | revolutionary_tribunal | disloyal lords, officers or pretenders' backers are removed at once            | Bloodshed in the provinces of those tried; scholars may flee abroad |
      | divide_the_estates   | estate and plantation tiles become family farms, Harsh lord ends and food rises    | the lord or owner turns Disloyal and export wares fall   |
      | censorship           | new ideas spread half as fast in the realm                                         | scholars fall 10 % a year and presses and schools slow   |
      | protection_tribute   | a neighbour pays a quarter (chauth) or a fifth (rakhi) of the province's tax each year | the owner's opinion falls 20; a refusal means a raid with Burned homes there |

  @REVO-054
  Scenario: Call the assembly agrees only when the realm is calm and solvent
    Given the country holds the regime "crown_and_assembly"
    And fewer than a third of its provinces have grievances
    And the realm is not deep in debt
    When the player puts a tax rise to the assembly
    Then the assembly agrees
    And the tax rise brings no grievance penalties
