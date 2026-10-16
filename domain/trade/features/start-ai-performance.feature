@context-trade
Feature: Starting trade, the AI and speed
  As the game
  I want trade running from the first day and AI traders that earn their upkeep
  So that 1444 roads are already busy and play stays fast on a phone

  @TRADE-110 @placeholder
  Scenario Outline: Starting traders by trade access
    Given the country "<country>" has catalogue trade_access "<access>"
    When the campaign starts
    Then "<country>" has <traders> starting traders

    Examples:
      | country  | access    | traders |
      | Venice   | very high | 6       |
      | Portugal | high      | 4       |
      | Hungary  | moderate  | 2       |
      | Oirat    | low       | 1       |
      | Igbo     | unknown   | 0       |

  @TRADE-111
  Scenario Outline: Starting routes
    Given the trade config of the design
    When the campaign starts
    Then "<country>" has the starting route "<route>"

    Examples:
      | country  | route                                                  |
      | Venice   | galley line Venice ▸ Corfu ▸ Candia ▸ Alexandria       |
      | Genoa    | Genoa ▸ Chios ▸ Pera ▸ Caffa                           |
      | Lübeck   | Lübeck ▸ Bergen ▸ Lübeck ▸ Bruges                      |
      | Mali     | camel caravan Timbuktu ▸ Taghaza ▸ Sijilmasa           |
      | Kilwa    | dhow Kilwa ▸ Sofala ▸ Kilwa ▸ Mombasa ▸ Malindi         |
      | Ryukyu   | junk Naha ▸ Fuzhou ▸ Naha ▸ Hakata                     |

  @TRADE-111
  Scenario: Coastal countries start with ships
    Given the country "Portugal" is coastal with ports
    And the country "Hungary" is inland
    When the campaign starts
    Then the starting traders of "Portugal" include trade ships
    And the starting traders of "Hungary" are caravans or barges

  @TRADE-112 @placeholder
  Scenario: Warm-up
    Given the trade config of the design
    When a campaign loads
    Then the starting traders run for 24 months before the first turn
    And the road "Venice ▸ Alexandria" is already busy on 11 Nov 1444

  @TRADE-113 @TRADE-114 @placeholder
  Scenario Outline: AI founding and dismissing
    Given the AI country "Genoa" has <situation>
    When the trade rules are applied
    Then the AI <action>

    Examples:
      | situation                                                     | action                  |
      | an unused loop expecting 1.5 gold a month against 1 upkeep    | founds a trader          |
      | an unused loop expecting 1.1 gold a month against 1 upkeep    | does not found a trader  |
      | a trader whose loop has lost money for 12 months              | dismisses it             |

  @TRADE-113
  Scenario: AI reach
    Given the AI country "Genoa" scores loops
    When the trade rules are applied
    Then caravan loops reach about 12 provinces and ship loops about 40 sea zones

  @TRADE-115 @TRADE-116
  Scenario: AI rerouting and war
    Given the AI country "Genoa" is at war with "Venice"
    When the trade rules are applied
    Then it pulls its traders off roads near the front
    And it uses trade ships as transports if short of carriers
    And it reroutes at once when a route breaks and otherwise once a year

  @TRADE-117
  Scenario: Lazy decay and cached paths
    Given the province "Langres" had a ratio of 50 and no traders for 3 months
    When its ratio is next read
    Then it is 50 × 0.9 × 0.9 × 0.9
    And paths between two cities are cached until something on the path changes
