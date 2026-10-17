@context-events
Feature: Modifiers
  As the game
  I want named, timed bundles of stat changes with decay and stacking
  So that events have lasting, readable consequences

  @EVT-051 @EVT-052 @placeholder
  Scenario Outline: Decay over the duration
    # config: modifier_rules.exponential_half_life_share
    Given a modifier of magnitude 10 lasting 20 years with decay "<decay>"
    When 10 years have passed
    Then its magnitude is <magnitude>

    Examples:
      | decay       | magnitude |
      | none        | 10        |
      | linear      | 5         |
      | exponential | 5         |

  @EVT-051
  Scenario: A permanent modifier
    Given the modifier "age_regiment_system" lasts 0 years
    When it is applied
    Then it never expires

  @EVT-051 @EVT-052 @placeholder
  Scenario Outline: Stacking
    # config: modifier_rules.default_stacking, modifier_rules.max_stacks
    Given a modifier with stacking "<stacking>" is already on a country
    When it is applied <times> more times
    Then the country has <result>

    Examples:
      | stacking | times | result                                    |
      | none     | 1     | one copy, unchanged                       |
      | refresh  | 1     | one copy with its duration restarted      |
      | stack    | 1     | two copies                                |
      | stack    | 5     | three copies, the most allowed            |

  @EVT-052
  Scenario: A modifier with no stacking named refreshes
    Given a modifier names no stacking rule
    When it is applied twice
    Then the second application restarts its duration

  @EVT-053
  Scenario Outline: How changes apply
    Given a modifier with the change "<change>" is active
    When a year passes
    Then <result>

    Examples:
      | change              | result                                                   |
      | stability: -1       | stability is 1 lower while the modifier is active        |
      | prestige: 5         | prestige rises by 5 each year                            |
      | income: -15%        | income is scaled down by 15 percent                      |
      | population: -5%     | 5 percent of the population is removed that year         |
      | population_growth: 1| the yearly growth rate changes by 1                      |

  @EVT-053
  Scenario: A region-scoped modifier on a country hits all its provinces
    Given a region-scoped modifier is applied to the country "France"
    When it takes effect
    Then every province of "France" has the modifier
