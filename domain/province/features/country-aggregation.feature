@context-province
Feature: Provinces add up to the country card
  As a player
  I want the country card to be the sum of its provinces
  So that every country number can be traced to the land

  @PROV-260
  Scenario Outline: Country stats are sums over provinces
    Given the country "France" holds its provinces
    When the game works out the province's stats
    Then the country stat "<stat>" is the sum of <sum>

    Examples:
      | stat                        | sum                                                   |
      | Gold income                 | tax reaching you plus trade income over all provinces |
      | People                      | people plus refugees                                  |
      | Recruits                    | recruits here in royal provinces only                 |
      | Food                        | local stores and castle stores                        |
      | Hungry                      | provinces with the "Hungry" grievance                 |
      | Horses                      | horse studs and ranches                               |
      | Ships                       | ships built at shipyards and based at harbours        |
      | Castles                     | castle buildings                                      |
      | Faith                       | the people-weighted faith mix                         |
      | Language                    | the people-weighted language mix                      |
      | In revolt                   | provinces with riots or rebels                        |
      | Schools, Students, Scholars | school buildings, students here and scholars here     |
      | Officials                   | your officials in royal provinces and seats           |

  @PROV-260
  Scenario: Lords' recruits and officials stay on their own cards
    Given the lord "Philip of Burgundy" holds "Dijon" with 900 recruits and 2 officials of his own
    When the game works out the province's stats
    Then the country "France" counts none of those recruits
    And none of those officials
