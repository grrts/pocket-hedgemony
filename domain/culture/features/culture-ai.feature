@context-culture
Feature: Culture choices of the AI
  As an AI country
  I want to set my Language policy and use culture levers by my personality
  So that computer realms behave like the history the catalogue describes

  @CULT-090
  Scenario Outline: Language policy by personality
    Given the AI country "Testland" has the personality "<personality>"
    And the AI country "Testland" <printing> printing
    When it chooses its Language policy
    Then its Language policy is "<policy>"

    Examples:
      | personality     | printing      | policy |
      | hegemon seeker  | does not have | Teach  |
      | hegemon seeker  | has           | Impose |
      | expansionist    | has           | Impose |
      | isolationist    | has           | Let be |
      | mercantile      | does not have | Let be |
      | opportunist     | has           | Teach  |
      | zealot          | has           | Teach  |

  @CULT-091
  Scenario Outline: Levers by personality
    Given the AI country "Testland" has the personality "<personality>"
    Then it uses <lever>

    Examples:
      | personality    | lever                                                                         |
      | expansionist   | settlers into conquered border provinces                                     |
      | hegemon seeker | the war aim "Gather our kin" after 1789                                       |
      | isolationist   | "Own language" charters to keep foreign peoples calm                                  |
      | mercantile     | a welcome for trading peoples                                                 |
      | opportunist    | "Free a people" against neighbours with foreign homelands in revolt         |
      | zealot         | expulsion of trading peoples of another faith                                 |
