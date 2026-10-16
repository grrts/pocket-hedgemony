@context-settings
Feature: Language, account, privacy and about
  As a player
  I want my language, account, privacy and support tools in one place
  So that I can manage them without leaving the game

  @SET-106
  Scenario Outline: Default language
    Given the system language is "<system>"
    And the launch list is "English, French"
    When the game starts for the first time
    Then the language is "<language>"

    Examples:
      | system  | language |
      | French  | French   |
      | Turkish | English  |

  @SET-106
  Scenario: Language applies live
    Given an event card is open
    When the player changes the language
    Then interface text changes at once
    And event and catalogue text change on the next panel open

  @SET-107
  Scenario Outline: Number format
    Given "Number format" is "<format>"
    When the number one thousand and a half is shown
    Then it reads "<text>"

    Examples:
      | format     | text     |
      | 1,000.5    | 1,000.5  |
      | 1.000,5    | 1.000,5  |
      | 1 000,5    | 1 000,5  |

  @SET-108
  Scenario Outline: Scripts need a font first
    Given the language "<language>" is in a <script> script
    And the localisation design <font> a font for it
    When the language list is shown
    Then "<language>" is <listed>

    Examples:
      | language | script    | font      | listed     |
      | French   | Latin     | has       | listed     |
      | Japanese | non-Latin | has not   | not listed |

  @SET-109
  Scenario Outline: Account row
    Given the player is <state>
    When the player opens Account and cloud saves
    Then <shown>
    And nothing blocks play

    Examples:
      | state                                        | shown                                                                 |
      | signed out                                   | "Sign in / Create account" is offered                                 |
      | signed in as "player@example.org"             | the email, Sign out, Cloud saves, Sync on Wi-Fi only, Devices and Delete account and saves are shown |

  @SET-109
  Scenario: The Load screen prompt opens the same flow
    Given the player is signed out
    When the player picks "Sign in to sync" on the Load screen
    Then the same sign-in flow as in Settings opens

  @SET-110 @SET-111
  Scenario Outline: Cloud rows once signed in
    Given the player has just signed in
    When the player opens Account and cloud saves
    Then "<setting>" is "<default>"

    Examples:
      | setting             | default |
      | Cloud saves         | On      |
      | Sync on Wi-Fi only  | Off     |

  @SET-110
  Scenario: Cloud saves carries personal settings
    Given the player is signed in with "Cloud saves" "On"
    When the player changes "Font" to "Plain"
    Then the change syncs with the saves to the player's other devices

  @SET-112
  Scenario: Devices
    Given the player is signed in on a "Steam Deck" and a "Pixel 8"
    When the player opens Devices on the "Pixel 8"
    Then both devices are listed, each with Sign out

  @SET-113
  Scenario Outline: Delete account and saves
    Given the player is signed in
    When the player picks "Delete account and saves" from <place>
    Then a confirmation is asked before anything is deleted

    Examples:
      | place                      |
      | Account and cloud saves    |
      | Privacy                    |

  @SET-114
  Scenario Outline: Privacy rows
    Given the game is <edition>
    When the player opens Privacy
    Then the rows are "<rows>"

    Examples:
      | edition                                       | rows                                                                 |
      | the full game on Steam                        | Send crash reports, Send anonymous usage statistics |
      | the free mobile tier and the ad stays         | Send crash reports, Send anonymous usage statistics, Ad consent |

  @SET-114
  Scenario: Privacy defaults are asked
    Given the privacy design requires consent
    When the game launches for the first time
    Then crash reports and usage statistics are asked, not preset

  @SET-115
  Scenario Outline: About
    Given the player opens About
    When the player picks "<entry>"
    Then <result>

    Examples:
      | entry                | result                                                        |
      | Restore purchases    | the store screen's restore flow opens                         |
      | Credits and licences | the credits open                                              |
      | Reset all settings   | every setting returns to its profile default                  |
      | Copy diagnostics     | the diagnostics line and settings are on the clipboard        |

  @SET-115
  Scenario: Version on About
    Given the game's version and build number are known
    When the player opens About
    Then the version and build number are shown
