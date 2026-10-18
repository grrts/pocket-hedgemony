@context-religion
Feature: Heads of the faith
  As a ruler
  I want to know who leads my faith, how I can win his favour or take his place, and what that gives and costs
  So that the faith's head is a prize worth wanting and a brake on wars between fellow believers

  Background:
    Given the date is 1444-11-11

  Rule: The player finds the head of the faith in one card

    @RELG-135
    Scenario: The Head of the faith card for a Catholic realm
      Given the country "Castile" is catholic
      When the player opens the Peoples tab
      Then under the faith cards there is a "Head of the faith" card naming "the Pope", the seat "Rome", its holder "Papal States" and the patron "none"
      And it lists what the patron gets and what he owes
      And its action button "Send gold to the conclave" is disabled with the reason "No conclave sits"

    @RELG-135
    Scenario: A faith with no head says so
      Given the country "Vijayanagara" is hindu
      When the player opens the Peoples tab
      Then the "Head of the faith" card says "Hindu has no single head" with the reason

    @RELG-136 @placeholder
    Scenario: A conclave on the card
      # config keys: faith_heads.conclave.gold_per_vote, faith_heads.conclave.months
      Given the ruler of "Papal States" has died
      Then a dispatch says a conclave sits for 1 month
      And the "Head of the faith" card lists the top three realms by votes and then the player's, one row each with cardinals and gold votes
      And the player sends gold in steps of 100

    @RELG-137
    Scenario: The cost of a censure is shown before the war
      Given the country "Aragon" is catholic
      And the country "Genoa" is catholic
      When the player of "Aragon" opens the declare war view on "Genoa" with the war aim "Take land"
      Then before confirming it lists "The Pope will censure this war" with the wrong, the number of catholic realms that will hold it, the lords who will waver and the "Punish" aim for every catholic realm

    @RELG-138
    Scenario Outline: The badge on the Faith line
      Given the country "<country>" <state>
      Then the Faith line on its General tab shows the badge "<badge>"

      Examples:
        | country  | state                                | badge                           |
        | Ottomans | holds Mecca and Medina as Caliph     | Caliph                          |
        | France   | is the Pope's patron                 | Patron of the Pope              |
        | England  | is anglican                          | Heads its church                |
        | Aragon   | is censured                          | Censured                        |

  Rule: Who leads each faith

    @RELG-139
    Scenario Outline: Heads, seats and ways
      Then the faith "<faith>" has <head>

      Examples:
        | faith              | head                                                       |
        | catholic           | the head "the Pope" chosen at "Rome"                       |
        | orthodox           | the head "the Ecumenical Patriarch" held at "Constantinople" |
        | oriental_christian | the head "the Catholicos" held at "Echmiadzin"             |
        | sunni              | the head "the Caliph" held at "Mecca and Medina"           |
        | vajrayana          | the head "the Dalai Lama" held at "Lhasa" from 1578        |
        | anglican           | a crown-headed church                                      |
        | protestant         | a crown-headed church                                      |
        | shia               | no head                                                    |
        | hindu              | no head                                                    |
        | theravada          | no head                                                    |

    @RELG-140
    Scenario: The overlord of a seat's owner is the patron
      Given the country "Tibet" owns "Lhasa" and is a subject of "Qing"
      And the date is 1720-01-01
      Then the patron of "the Dalai Lama" is "Qing"

    @RELG-141 @RELG-140
    Scenario: Claiming the caliphate
      Given the date is 1517-06-01
      And the country "Ottomans" is sunni and is the overlord of "Hejaz"
      And no ruler is Caliph
      When "Ottomans" takes the decision "Claim the caliphate"
      Then the ruler of "Ottomans" is the Caliph
      When "Ottomans" no longer holds "Mecca and Medina" directly or as overlord
      Then no ruler is Caliph

    @RELG-142 @placeholder
    Scenario Outline: The conclave
      # config keys: faith_heads.conclave.cardinals_per_house_step3, gold_per_vote, gold_votes_max_share_of_cardinals, rome_votes
      Given the ruler of "Papal States" has died
      And the country "France" has <fr_houses> catholic houses of worship at step 3 or more and sends <fr_gold> gold
      And the country "Castile" has <ca_houses> catholic houses of worship at step 3 or more and sends <ca_gold> gold
      When the conclave closes
      Then the votes are France <fr_votes>, Castile <ca_votes> and Rome 10
      And the patron of "the Pope" is "<patron>"

      Examples:
        | fr_houses | fr_gold | ca_houses | ca_gold | fr_votes | ca_votes | patron |
        | 6         | 0       | 4         | 0       | 6        | 4        | none   |
        | 6         | 500     | 4         | 0       | 11       | 4        | France |
        | 6         | 900     | 4         | 400     | 12       | 8        | France |
        | 3         | 300     | 7         | 300     | 6        | 10       | none   |
        | 3         | 300     | 8         | 400     | 6        | 12       | Castile |

    @RELG-143
    Scenario: Rome held by another realm
      Given the country "Italy" owns "Rome"
      And the country "Papal States" does not exist
      When the Pope dies
      Then no conclave sits
      And the patron of "the Pope" is "Italy"

    @RELG-144 @placeholder
    Scenario Outline: Taking a seat by war
      # config keys: faith_heads.seized, faith_heads.freed
      Given the country "<taker>" takes "<seat>" by war from the country "<loser>"
      Then every <faith> realm holds the <entry> "<name>" of <weight> toward "<taker>", fading over 20 years

      Examples:
        | taker    | seat           | loser        | faith    | entry | name             | weight |
        | Italy    | Rome           | Papal States | catholic | wrong | Seized the seat  | -20    |
        | Russia   | Constantinople | Ottomans     | orthodox | tie   | Freed the seat   | 20     |

    @RELG-145
    Scenario: A patron of another faith
      Given the date is 1460-01-01
      And the country "Ottomans" owns "Constantinople"
      Then the patron of "the Ecumenical Patriarch" is "Ottomans"
      And "Ottomans" gets no patron's tie and no extra preacher
      And every orthodox community in "Ottomans" counts as served

  Rule: What the patron gets and owes

    @RELG-146 @placeholder
    Scenario: The patron's tie and preacher
      # config keys: faith_heads.patron.tie, faith_heads.patron.preachers
      Given the country "France" is the Pope's patron
      Then every catholic realm holds the tie "The Pope favours us" of 15 toward "France"
      And "France" has 1 more catholic preacher

    @RELG-147
    Scenario: The patron is called to defend a holy place
      Given the country "France" is the Pope's patron
      And the country "Castile" is catholic and owns "Santiago de Compostela"
      When the country "Granada" declares war on "Castile"
      Then "France" receives a defensive call to arms in that war
      When "France" refuses the call
      Then "France" has one more oath broken

    @RELG-148 @placeholder
    Scenario: Betraying the faith
      # config keys: faith_heads.betrayed
      Given the country "England" is the Pope's patron
      When "England" adopts the faith "anglican"
      Then the Pope has no patron
      And every catholic realm holds the wrong "Betrayed the faith" of -30 toward "England", fading over 30 years

  Rule: Censure is the head's check on war between fellow believers

    @RELG-149
    Scenario Outline: Which wars are censured
      Given the country "<attacker>" is <faith>
      And the country "<target>" is <faith>
      When "<attacker>" declares war on "<target>" with the war aim "<aim>"
      Then "<attacker>" is <censured>

      Examples:
        | attacker | target   | faith      | aim               | censured        |
        | Aragon   | Genoa    | catholic   | Take land         | censured        |
        | Aragon   | Genoa    | catholic   | Tribute           | censured        |
        | Aragon   | Genoa    | catholic   | Seat a pretender  | not censured    |
        | Aragon   | Genoa    | catholic   | Punish            | not censured    |
        | Muscovy  | Novgorod | orthodox   | Take land         | censured        |
        | Sweden   | Denmark  | protestant | Take land         | not censured    |
        | Vijayanagara | Bahmanis | hindu  | Take land         | not censured    |

    @RELG-150 @placeholder
    Scenario: What a censure costs
      # config keys: faith_heads.censure.weight, faith_heads.censure.fade_years
      Given the country "Aragon" is censured by the Pope in its war on "Genoa"
      Then every catholic realm holds the wrong "Censured by the Pope" of -25 toward "Aragon" while the war lasts
      And every catholic lord of "Aragon" wavers one step
      And every catholic realm holds the war aim "Punish" against "Aragon"
      And a catholic ally of "Aragon" may refuse its call without an oath broken

    @RELG-151
    Scenario Outline: How a censure ends
      Given the country "Aragon" is censured by the Pope in its war on "Genoa"
      And "Aragon" is the Pope's patron
      When the war ends with a peace that <terms>
      Then the censure <ends>
      And "Aragon" is still the Pope's patron

      Examples:
        | terms                                   | ends                                         |
        | gives back every province taken in it   | ends at once and its wrong fades over 10 years |
        | keeps one province taken in it          | lasts until its wrong has faded over 10 years  |

  Rule: The Orthodox way out

    @RELG-152 @placeholder
    Scenario: Raising our own patriarch
      # config keys: faith_heads.own_patriarch.gold, faith_heads.own_patriarch.preachers
      Given the date is 1589-01-01
      And the country "Russia" is orthodox with a step-4 orthodox house of worship in its capital
      And the country "Ottomans" owns "Constantinople"
      When "Russia" takes the decision "Raise our own patriarch" for 200 gold
      Then the church of "Russia" is crown-headed
      And "Russia" has 1 more orthodox preacher
      And "Russia" can no longer be censured by the Ecumenical Patriarch
      And the decision is not offered to "Russia" again

  Rule: The heads in time

    @RELG-153
    Scenario: The heads in 1444
      When a campaign starts in 1444
      Then the Pope has no patron
      And "Savoy" follows the Pope
      And the patron of "the Ecumenical Patriarch" is "Byzantium"
      And the patron of "the Catholicos" is "Qara Qoyunlu"
      And the Caliph's claim is held by "Mamluks"

    @RELG-154
    Scenario: The Dalai Lama from 1578
      Given the date is 1577-12-31
      Then there is no Dalai Lama
      When the event "altan_khan_and_the_dalai_lama" fires with the chooser "Tumed"
      Then the patron of "the Dalai Lama" is "Tumed"
      When the owner of "Lhasa" changes
      Then the patron of "the Dalai Lama" follows the new owner of "Lhasa" or its overlord

    @RELG-155
    Scenario: The heads are saved
      Given the country "France" is the Pope's patron
      And a conclave sits
      And the country "Aragon" is censured by the Pope
      When the game is saved and loaded
      Then the patrons, the Caliph, the conclave's votes, the censures and the own patriarchs are the same

    @RELG-156
    Scenario: The AI and the heads
      Given the country "France" is catholic, not at war, and could win the conclave with gold it can spare
      When a conclave sits
      Then the AI of "France" sends that gold
      And an AI offered "Claim the caliphate" or "Raise our own patriarch" takes it
      And an AI weighing a war that would be censured counts the censure's wrong and aim among its reasons
