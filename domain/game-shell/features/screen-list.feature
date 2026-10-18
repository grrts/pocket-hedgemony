@context-game-shell
Feature: Screen list
  As the game
  I want every screen to have an id, a kind, a first focus, a Back target and its music
  So that code, music and sound effects key on the same names

  @SHELL-124 @SHELL-123
  Scenario Outline: The screen catalogue
    Given the screen "<id>" is defined
    When the screen "<id>" opens
    Then its kind is "<kind>"
    And its first focus is "<first focus>"
    And Back goes to "<back>"
    And its music is "<music>"

    Examples:
      | id            | kind        | first focus                         | back                                      | music                         |
      | boot          | Full        | none                                | none                                      | none                          |
      | first_run     | Full        | the only choice                     | none, it must be answered                 | none                          |
      | title         | Full        | Play                                | leaves the app on Android                 | title                         |
      | main_menu     | Same screen | Play                                | leaves the app on Android                 | title                         |
      | new_campaign  | Full        | first suggested realm               | previous step, then main_menu             | nation_select                 |
      | load          | Full        | newest save                         | where opened                              | unchanged                     |
      | loading       | Full        | tip arrows                          | none                                      | load_resume                   |
      | settings      | Overlay     | first setting                       | where opened                              | unchanged                     |
      | achievements  | Full        | first achievement                   | where opened                              | unchanged                     |
      | almanac       | Full        | search or first entry               | where opened                              | unchanged                     |
      | unlock        | Full        | Buy                                 | where opened                              | unchanged                     |
      | credits       | Full        | Back                                | main_menu or final_result                 | credits                       |
      | map           | Home        | your capital or last army           | opens game_menu                           | game music                    |
      | card          | Sheet       | first line                          | previous card or map                      | unchanged                     |
      | realm_book    | Full        | last tab's first item               | map                                       | unchanged; diplomacy mood on Abroad |
      | game_menu     | Modal       | Return to the map                   | map                                       | unchanged                     |
      | turn          | Overlay     | none                                | none                                      | unchanged                     |
      | battle        | Full        | Retreat while it runs, Carry on after | back to the map while battles run (they keep running); where opened for a replay | war tracks      |
      | siege         | Full        | Back                                | map                                       | war_siege                     |
      | event         | Modal       | historical option                   | badge on End turn                         | stinger only                  |
      | peace         | Modal       | first term                          | where opened                              | unchanged                     |
      | turn_report   | Sheet       | first line                          | map                                       | unchanged                     |
      | attention     | Sheet       | first warning                       | map                                       | unchanged                     |
      | game_over     | Full        | Look back                           | none                                      | game_over                     |
      | campaign_end  | Full        | Skip                                | none                                      | campaign_end                  |
      | final_result  | Full        | Main menu                           | main_menu                                 | campaign_end                  |
      | error         | Full        | Restore the last save               | main_menu                                 | none                          |
