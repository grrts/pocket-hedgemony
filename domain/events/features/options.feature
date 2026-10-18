@context-events
Feature: Options and choice
  As a player or an AI country
  I want events to offer real options, chosen by the role they concern
  So that every event is a decision with a historical path and alternatives

  @EVT-039
  Scenario: Every event offers two to four options with exactly one historical
    Given the event "french_revolution"
    When its options are listed
    Then it has the options "radical_republic", "constitutional_monarchy" and "royal_reaction"
    And only "radical_republic" is marked historical

  @EVT-040
  Scenario: The chooser's controller picks
    Given the event "french_revolution" fires with "$realm" bound to the player's country "France"
    When the options are offered
    Then the player chooses the option

  @EVT-040
  Scenario: No chooser means a weighted roll
    Given the event "rinderpest_epizootic" has the options "epizootic_spreads" with weight 80 and "contained_in_horn" with weight 20 and no chooser
    When the event fires
    Then the option is picked by a roll weighted 80 to 20 before any factors

  @EVT-041
  Scenario: An option is hidden when not allowed
    Given an option of an event has an allowed condition that is false for the chooser
    When the options are offered
    Then that option is not shown

  @EVT-042 @placeholder
  Scenario Outline: Named AI factors
    # config: ai_factors
    Given an AI option has base weight 40 and the factor "<factor>" with multiplier 2
    And for the chooser <situation>
    When the AI weighs its options
    Then the option's weight is <weight>

    Examples:
      | factor        | situation                                                  | weight |
      | at_war        | the country is at war                                      | 80     |
      | at_war        | the country is at peace                                    | 40     |
      | low_treasury  | the treasury is below one year of expenses                 | 80     |
      | high_unrest   | more than half its provinces have 4 or more grievances     | 80     |
      | high_unrest   | half its provinces have 4 or more grievances               | 40     |
      | same_religion | the other party shares the state religion                  | 80     |
      | rival         | the other party is a rival                                 | 80     |
      | great_power   | the country ranks in the top 8 by great power score        | 80     |
      | threatened    | a hostile neighbour has more than 1.5 times its army strength | 80  |

  @EVT-043
  Scenario: Option effects add to event effects
    Given the event "french_revolution" has the event effect "stability -2" on "$realm"
    When "France" picks "constitutional_monarchy"
    Then "France" gets "stability -2" from the event and "stability +1" from the option

  @EVT-044
  Scenario: Nothing answers an event for the player
    Given an event waits for the player's answer
    When the player tries to end the turn
    Then the turn does not end
    And the first unanswered event opens

  @EVT-039
  Scenario: More than four options is a build error
    Given an event offers 5 options
    When the event tree is built
    Then the build reports an error
