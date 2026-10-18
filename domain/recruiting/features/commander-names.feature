@context-recruiting
Feature: Commanders named and ranked in their realm's language
  As a player
  I want my commanders and admirals named and ranked as their own people would have called them
  So that the world feels historical and each realm sounds like itself

  @RECR-121
  Scenario Outline: Names in the realm's language and order
    Given the country "<country>"
    When one of its people is named
    Then the name is in the "<culture>" culture with the family name <order>

    Examples:
      | country  | culture    | order  |
      | castile  | castilian  | last   |
      | hungary  | hungarian  | first  |
      | japan    | japanese   | first  |

  @RECR-122
  Scenario Outline: The rank follows the post
    Given the country "<country>"
    And its commander "<name>"
    When he leads <post>
    Then he is called "<ranked>"

    Examples:
      | country  | name                | post    | ranked                          |
      | portugal | Fernão Coutinho     | a fleet | Almirante Fernão Coutinho       |
      | portugal | Fernão Coutinho     | an army | Marechal Fernão Coutinho        |
      | japan    | Hosokawa Katsumoto  | an army | Hosokawa Katsumoto Taishō       |
      | hungary  | Hunyadi János       | an army | Hunyadi János főkapitány        |
      | ottomans | Mehmed Pasha        | a fleet | Kapudan Mehmed Pasha            |

  @RECR-123
  Scenario: A free company's captain
    Given the free companies for hire in 1444
    Then each captain is ranked in the language of the realm his company gathers in
