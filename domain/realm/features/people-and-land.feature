@context-realm
Feature: People and land
  As a player
  I want people, provinces, officials, faith, language and revolts counted for the realm
  So that I see how much I hold and how well it is run

  @REALM-060
  Scenario Outline: People grow and shrink
    Given the country "France" has 9.5 m people
    When <cause>
    Then its people are <direction>

    Examples:
      | cause                                              | direction |
      | its provinces grow fed and at peace                | more      |
      | migrants flee famine abroad into France            | more      |
      | it conquers a province                             | more      |
      | famine strikes                                     | fewer     |
      | plague strikes                                     | fewer     |
      | war kills its people                               | fewer     |
      | refugees leave                                     | fewer     |
      | a forced migration event strikes                   | fewer     |

  @REALM-061
  Scenario Outline: Provinces are gained and lost
    Given the country "France" holds 52 provinces
    When <cause>
    Then the country "France" holds <count> provinces

    Examples:
      | cause                                         | count |
      | it conquers one                               | 53    |
      | it inherits one                               | 53    |
      | it buys one                                   | 53    |
      | a lord joins it with his one province         | 53    |
      | it founds a colony                            | 53    |
      | it cedes one in a peace                       | 51    |
      | a lord defects with his one province          | 51    |
      | a revolt breaks one away                      | 51    |

  @REALM-062
  Scenario Outline: Royal provinces
    Given the country "France" has 18 royal provinces
    When <cause>
    Then the country "France" has <count> royal provinces

    Examples:
      | cause                                                  | count |
      | a lord's line holding one province dies out            | 19    |
      | it seizes one province from a lord                     | 19    |
      | it conquers a province and keeps it                    | 19    |
      | it grants one province as a fief                       | 17    |

  @REALM-063
  Scenario Outline: Officials are hired, trained and lost
    Given the country "France" has 40 officials
    When <cause>
    Then the country "France" has <count> officials

    Examples:
      | cause                                     | count |
      | it hires one for gold up front            | 41    |
      | a school graduates one                    | 41    |
      | it dismisses one                          | 39    |
      | it leaves wages unpaid and one leaves     | 39    |
      | war in a province kills its official      | 39    |

  @REALM-064 @placeholder
  Scenario: A royal province without an official pays half
    Given the royal province "Troyes" has no official
    When its tax and recruits are collected
    Then it pays half its taxes
    And gives half its recruits

  @REALM-065
  Scenario: A low faith share brings religious revolts
    Given the country "France" has a low faith share
    When the realm's provinces are checked for revolt
    Then religious revolts are more likely
    And clergy lords waver

  @REALM-065
  Scenario Outline: Faith rises and falls
    Given the country "France" has 96 % faith
    When <cause>
    Then its faith share is <direction>

    Examples:
      | cause                                      | direction |
      | missionaries and clergy work over time      | higher    |
      | schools of its faith teach                  | higher    |
      | migrants of its faith arrive                | higher    |
      | a conversion event                          | higher    |
      | it conquers people of another faith         | lower     |
      | a reformation spreads                       | lower     |
      | foreign missionaries arrive                 | lower     |

  @REALM-066
  Scenario Outline: Language rises and falls
    Given the country "France" has 71 % language
    When <cause>
    Then its language share is <direction>

    Examples:
      | cause                                         | direction |
      | provinces held long and well assimilate        | higher    |
      | settlers move in                               | higher    |
      | schools teach in its language                    | higher    |
      | it conquers people of another language           | lower     |
      | migrants of another language arrive              | lower     |
      | a separatist movement spreads                  | lower     |

  @REALM-066
  Scenario: A low language share brings separatists and slower officials
    Given the country "Castile" has a low language share
    When the realm's provinces are checked for revolt
    Then separatist revolts are more likely
    And its officials work more slowly

  @REALM-067
  Scenario Outline: In revolt
    Given the country "France" has 2 provinces in revolt
    When <cause>
    Then its count in revolt is <direction>

    Examples:
      | cause                                   | direction |
      | it sets heavy taxes                     | higher    |
      | famine strikes                          | higher    |
      | disloyal lords stir                     | higher    |
      | it loses a war                          | higher    |
      | it defeats the rebels                   | lower     |
      | it gives in to their demands            | lower     |
      | it lowers taxes                         | lower     |
      | it feeds the hungry provinces           | lower     |

  @REALM-067
  Scenario: Revolt spreads to neighbours
    Given the province "Troyes" is in revolt
    When the month ends
    Then its neighbours may be drawn into revolt
    And the country loses taxes and recruits from "Troyes"

  @REALM-063 @REALM-169
  Scenario Outline: How many provinces one official runs
    Given the country "France" knows <inventions>
    When it works out how many officials its 18 royal provinces need
    Then one official runs <per> provinces and it needs <needed> officials

    Examples:
      | inventions              | per | needed |
      | G1                      | 1   | 18     |
      | G1 and B2               | 2   | 9      |
      | G1, G9 and G11          | 3   | 6      |
      | G1, G9, G16, B2 and T14 | 5   | 4      |
