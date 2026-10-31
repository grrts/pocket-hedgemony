<?php

namespace App\Tests\Controller;

use App\Purchases\Google\GooglePlay;
use App\Purchases\SteamOwnership;
use App\Tests\StoreKeys;
use App\Tests\StoresMock;

/** The full game on each store: domain/saves/features/purchases.feature (SAVE-170 … SAVE-175, SAVE-178). */
final class PurchasesTest extends StoreTestCase
{
    public function testSteamOwnershipIsCheckedAtMostDaily(): void
    {
        StoresMock::$steamOwners[self::STEAM_ID] = true;
        [$token, $id] = $this->steamPlayer();
        $answer = $this->call('GET', '/api/entitlements/steam', token: $token);
        self::assertResponseIsSuccessful();
        self::assertSame(['store' => 'steam', 'fullGame' => true, 'status' => 'active', 'checkedAt' => '2026-10-19T12:00:00+00:00', 'accountTag' => null], $answer);
        self::assertSame(self::STEAM_ID.':480', $this->row($id, 'steam')->getReference());
        self::assertSame(1, StoresMock::count(SteamOwnership::URL));

        $this->clock->modify('+2 hours');
        [$token] = $this->steamPlayer();
        self::assertSame('active', $this->call('GET', '/api/entitlements/steam', token: $token)['status']);
        self::assertSame(1, StoresMock::count(SteamOwnership::URL));

        // Refunded on Steam: a day later the check sees it.
        StoresMock::$steamOwners[self::STEAM_ID] = false;
        $this->clock->modify('+23 hours');
        [$token] = $this->steamPlayer();
        $answer = $this->call('GET', '/api/entitlements/steam', token: $token);
        self::assertSame(2, StoresMock::count(SteamOwnership::URL));
        self::assertSame(['fullGame' => false, 'status' => 'refunded'], array_intersect_key($answer, ['fullGame' => 1, 'status' => 1]));
    }

    public function testRestoreOnSteamChecksAtOnce(): void
    {
        [$token] = $this->steamPlayer();
        self::assertSame('none', $this->call('GET', '/api/entitlements/steam', token: $token)['status']);
        StoresMock::$steamOwners[self::STEAM_ID] = true;
        self::assertSame('active', $this->call('POST', '/api/purchases', ['store' => 'steam'], $token)['status']);
        self::assertSame(2, StoresMock::count(SteamOwnership::URL));
    }

    public function testWhileSteamIsDownTheLastAnswerStands(): void
    {
        StoresMock::$steamOwners[self::STEAM_ID] = true;
        [$token] = $this->steamPlayer();
        $this->call('GET', '/api/entitlements/steam', token: $token);
        StoresMock::$steamDown = true;
        $this->clock->modify('+2 days');
        [$token] = $this->steamPlayer();
        self::assertSame('active', $this->call('GET', '/api/entitlements/steam', token: $token)['status']);
        self::assertResponseIsSuccessful();
    }

    public function testAnAccountWithoutSteamHasNoSteamEntitlement(): void
    {
        [$token] = $this->phonePlayer();
        self::assertSame('none', $this->call('GET', '/api/entitlements/steam', token: $token)['status']);
        self::assertSame(0, StoresMock::count(SteamOwnership::URL));
    }

    public function testAnAppStorePurchaseUnlocksOnlyTheAppStore(): void
    {
        [$token, $id] = $this->phonePlayer();
        self::assertSame($id, $this->call('GET', '/api/entitlements/apple', token: $token)['accountTag']);
        $answer = $this->call('POST', '/api/purchases', ['store' => 'apple', 'signedTransaction' => StoreKeys::transaction(['appAccountToken' => $id])], $token);
        self::assertResponseIsSuccessful();
        self::assertTrue($answer['fullGame']);
        self::assertSame('active', $this->call('GET', '/api/entitlements/apple', token: $token)['status']);
        // Cross-buy is per store (SAVE-170).
        $google = $this->call('GET', '/api/entitlements/google', token: $token);
        self::assertSame(['fullGame' => false, 'status' => 'none', 'accountTag' => hash('sha256', $id)], array_intersect_key($google, ['fullGame' => 1, 'status' => 1, 'accountTag' => 1]));
        $row = $this->row($id, 'apple');
        self::assertSame(['2000000123456789', 'Production', 'full_game'], [$row->getReference(), $row->getEnvironment(), $row->getProduct()]);
    }

    public function testOnePurchaseBelongsToOneAccount(): void
    {
        [$a, $aId] = $this->phonePlayer('a@example.org');
        [$b, $bId] = $this->phonePlayer('b@example.org');
        $this->call('POST', '/api/purchases', ['store' => 'apple', 'signedTransaction' => StoreKeys::transaction()], $a);
        $refused = $this->call('POST', '/api/purchases', ['store' => 'apple', 'signedTransaction' => StoreKeys::transaction()], $b);
        self::assertResponseStatusCodeSame(409);
        self::assertSame(['error' => 'other_account', 'message' => 'This purchase is on another Pocket Hegemony account.'], $refused);
        self::assertNull($this->row($bId, 'apple'));
        self::assertTrue($this->row($aId, 'apple')->isActive());
        // A purchase made for another account's appAccountToken is refused too.
        $this->call('POST', '/api/purchases', ['store' => 'apple', 'signedTransaction' => StoreKeys::transaction(['originalTransactionId' => '2000000999', 'appAccountToken' => $aId])], $b);
        self::assertResponseStatusCodeSame(409);
    }

    public function testATransactionNotSignedByAppleChangesNothing(): void
    {
        [$token, $id] = $this->phonePlayer();
        $answer = $this->call('POST', '/api/purchases', ['store' => 'apple', 'signedTransaction' => StoreKeys::transaction([], 'other')], $token);
        self::assertResponseStatusCodeSame(422);
        self::assertSame('bad_signature', $answer['error']);
        self::assertNull($this->row($id, 'apple'));
    }

    public function testARevokedTransactionLocks(): void
    {
        [$token] = $this->phonePlayer();
        $answer = $this->call('POST', '/api/purchases', ['store' => 'apple', 'signedTransaction' => StoreKeys::transaction(['revocationDate' => time() * 1000])], $token);
        self::assertSame(['fullGame' => false, 'status' => 'revoked'], array_intersect_key($answer, ['fullGame' => 1, 'status' => 1]));
    }

    public function testANewPurchaseAfterARefundTakesItsPlace(): void
    {
        [$token, $id] = $this->phonePlayer();
        $this->call('POST', '/api/purchases', ['store' => 'apple', 'signedTransaction' => StoreKeys::transaction(['revocationDate' => time() * 1000])], $token);
        $answer = $this->call('POST', '/api/purchases', ['store' => 'apple', 'signedTransaction' => StoreKeys::transaction(['originalTransactionId' => '2000000777'])], $token);
        self::assertSame('active', $answer['status']);
        self::assertSame('2000000777', $this->row($id, 'apple')->getReference());
        // An active purchase is never replaced by a revoked one.
        $this->call('POST', '/api/purchases', ['store' => 'apple', 'signedTransaction' => StoreKeys::transaction(['originalTransactionId' => '2000000888', 'revocationDate' => time() * 1000])], $token);
        self::assertSame('2000000777', $this->row($id, 'apple')->getReference());
    }

    public function testAGooglePlayPurchaseIsReadAndAcknowledged(): void
    {
        [$token, $id] = $this->phonePlayer(platform: 'android');
        StoresMock::$play['tok-full-game-1'] = StoresMock::playPurchase('GPA.3300-0000-0000-00001', ['obfuscatedExternalAccountId' => hash('sha256', $id)]);
        $answer = $this->call('POST', '/api/purchases', ['store' => 'google', 'purchaseToken' => 'tok-full-game-1'], $token);
        self::assertResponseIsSuccessful();
        self::assertSame(['fullGame' => true, 'status' => 'active'], array_intersect_key($answer, ['fullGame' => 1, 'status' => 1]));
        self::assertSame(1, StoresMock::$play['tok-full-game-1']['acknowledgementState']);
        $row = $this->row($id, 'google');
        self::assertSame(['GPA.3300-0000-0000-00001', hash('sha256', 'tok-full-game-1')], [$row->getReference(), $row->getTokenHash()]);
        // Sent again (Restore purchases): nothing more to acknowledge.
        $this->call('POST', '/api/purchases', ['store' => 'google', 'purchaseToken' => 'tok-full-game-1'], $token);
        self::assertSame(1, StoresMock::count(GooglePlay::API.rawurlencode(StoreKeys::PACKAGE).'/purchases/products/full_game/tokens/tok-full-game-1:acknowledge'));
    }

    public function testAPendingPlayPaymentDoesNotUnlock(): void
    {
        [$token, $id] = $this->phonePlayer(platform: 'android');
        StoresMock::$play['tok-pending-1'] = StoresMock::playPurchase('GPA.2', ['purchaseState' => 2]);
        $answer = $this->call('POST', '/api/purchases', ['store' => 'google', 'purchaseToken' => 'tok-pending-1'], $token);
        self::assertSame(['fullGame' => false, 'status' => 'pending'], array_intersect_key($answer, ['fullGame' => 1, 'status' => 1]));
        self::assertNull($this->row($id, 'google'));
        self::assertSame(0, StoresMock::$play['tok-pending-1']['acknowledgementState']);
    }

    public function testATokenPlayDoesNotKnowOrForAnotherAccount(): void
    {
        [$token] = $this->phonePlayer(platform: 'android');
        self::assertSame('not_found', $this->call('POST', '/api/purchases', ['store' => 'google', 'purchaseToken' => 'tok-nobody-knows'], $token)['error']);
        self::assertResponseStatusCodeSame(422);
        StoresMock::$play['tok-other-1'] = StoresMock::playPurchase('GPA.9', ['obfuscatedExternalAccountId' => hash('sha256', 'someone else')]);
        self::assertSame('other_account', $this->call('POST', '/api/purchases', ['store' => 'google', 'purchaseToken' => 'tok-other-1'], $token)['error']);
        self::assertResponseStatusCodeSame(409);
    }

    public function testAStoreWithoutItsSettingsIsUnavailable(): void
    {
        $before = [$_ENV['GOOGLE_PLAY_SERVICE_ACCOUNT'] ?? null, $_SERVER['GOOGLE_PLAY_SERVICE_ACCOUNT'] ?? null];
        $_ENV['GOOGLE_PLAY_SERVICE_ACCOUNT'] = $_SERVER['GOOGLE_PLAY_SERVICE_ACCOUNT'] = '';
        try {
            $this->boot();
            [$token] = $this->steamPlayer();
            $answer = $this->call('GET', '/api/entitlements/google', token: $token);
            self::assertResponseStatusCodeSame(503);
            self::assertSame(['error' => 'store_unavailable', 'message' => 'Google Play purchases are not available on this server.'], $answer);
            $this->call('POST', '/api/purchases', ['store' => 'google', 'purchaseToken' => 'tok-full-game-1'], $token);
            self::assertResponseStatusCodeSame(503);
            // The other stores, sign-in and saves keep working.
            $this->call('GET', '/api/entitlements/steam', token: $token);
            self::assertResponseIsSuccessful();
            $this->call('GET', '/api/saves', token: $token);
            self::assertResponseIsSuccessful();
        } finally {
            [$_ENV['GOOGLE_PLAY_SERVICE_ACCOUNT'], $_SERVER['GOOGLE_PLAY_SERVICE_ACCOUNT']] = $before;
        }
    }

    public function testTheGameMustBeSignedInAndNameAStore(): void
    {
        $this->call('GET', '/api/entitlements/apple');
        self::assertResponseStatusCodeSame(401);
        [$token] = $this->phonePlayer();
        $this->call('POST', '/api/purchases', ['store' => 'apple'], $token);
        self::assertResponseStatusCodeSame(422);
    }

    /** The server's numbers are the rules' numbers (packages/rules/data/domain/saves.json). */
    public function testTheNumbersMatchTheRules(): void
    {
        $rules = json_decode((string) file_get_contents(\dirname(__DIR__, 3).'/packages/rules/data/domain/saves.json'), true)['purchases'];
        self::assertSame($rules['steam_recheck_hours'], static::getContainer()->getParameter('cloud.purchases.steam_recheck_hours'));
        self::assertSame($rules['stores'], \App\Entity\Entitlement::STORES);
        self::assertSame($rules['messages']['other_account'], \App\Purchases\PurchaseRefused::OTHER_ACCOUNT);
        self::assertSame($rules['product_id'], static::getContainer()->getParameter('env(APPLE_PRODUCT_ID)'));
        self::assertSame($rules['product_id'], static::getContainer()->getParameter('env(GOOGLE_PLAY_PRODUCT_ID)'));
    }
}
