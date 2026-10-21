<?php

namespace App\Tests\Purchases;

use App\Purchases\Google\GooglePlay;
use App\Purchases\PurchaseRefused;
use App\Purchases\SteamOwnership;
use App\Purchases\StoreUnavailable;
use App\Tests\StoreKeys;
use App\Tests\StoresMock;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Clock\MockClock;
use Symfony\Component\HttpClient\MockHttpClient;

/** Steam's ownership check and the Play Developer API against StoresMock (SAVE-173, SAVE-175, SAVE-178). */
final class StoreClientsTest extends TestCase
{
    private const STEAM_ID = '76561198000000001';

    protected function setUp(): void
    {
        StoresMock::reset();
        StoreKeys::install(\dirname(__DIR__, 2));
    }

    private function play(string $package = StoreKeys::PACKAGE, string $account = 'var/test-stores/google-service-account.json', ?MockClock $clock = null): GooglePlay
    {
        return new GooglePlay(new MockHttpClient(new StoresMock()), $clock ?? new MockClock(), $package, $account, 'full_game', \dirname(__DIR__, 2));
    }

    public function testSteamSaysWhoOwnsTheFullGame(): void
    {
        StoresMock::$steamOwners = [self::STEAM_ID => true];
        $steam = new SteamOwnership(new MockHttpClient(new StoresMock()), 'test-key', '3000000');
        self::assertTrue($steam->check(self::STEAM_ID));
        self::assertFalse($steam->check('76561198000000002'));
        self::assertSame(self::STEAM_ID.':3000000', $steam->reference(self::STEAM_ID));
        self::assertStringContainsString('appid=3000000', StoresMock::$calls[0]);
    }

    public function testAWrongKeyOrAnOutageIsNotANo(): void
    {
        $this->expectException(StoreUnavailable::class);
        (new SteamOwnership(new MockHttpClient(new StoresMock()), 'wrong-key', '3000000'))->check(self::STEAM_ID);
    }

    public function testWithoutAKeySteamPurchasesAreUnavailable(): void
    {
        $this->expectExceptionMessage('Steam purchases are not available on this server.');
        (new SteamOwnership(new MockHttpClient(new StoresMock()), '', '3000000'))->check(self::STEAM_ID);
    }

    public function testPlayReadsAPurchaseSignedInAsTheServiceAccount(): void
    {
        StoresMock::$play['tok-purchased-1'] = StoresMock::playPurchase('GPA.1234-5678-9012-34567', ['obfuscatedExternalAccountId' => 'abc']);
        $p = $this->play()->purchase('tok-purchased-1');
        self::assertSame(['google', 'full_game', 'GPA.1234-5678-9012-34567', 'active', 'abc', hash('sha256', 'tok-purchased-1'), false], [$p->store, $p->product, $p->reference, $p->status, $p->accountTag, $p->tokenHash, $p->acknowledged]);
        self::assertSame(1, StoresMock::count(GooglePlay::TOKEN_URL));
    }

    public function testTheAccessTokenIsKeptUntilNearItsEnd(): void
    {
        StoresMock::$play['tok-purchased-1'] = StoresMock::playPurchase('GPA.1');
        $clock = new MockClock('2026-10-19 12:00:00');
        $play = $this->play(clock: $clock);
        $play->purchase('tok-purchased-1');
        $play->purchase('tok-purchased-1');
        self::assertSame(1, StoresMock::count(GooglePlay::TOKEN_URL));
        $clock->modify('+1 hour');
        $play->purchase('tok-purchased-1');
        self::assertSame(2, StoresMock::count(GooglePlay::TOKEN_URL));
    }

    public function testPendingCanceledAndUnknownPurchases(): void
    {
        StoresMock::$play['tok-pending-1'] = StoresMock::playPurchase('GPA.2', ['purchaseState' => 2]);
        StoresMock::$play['tok-canceled-1'] = StoresMock::playPurchase('GPA.3', ['purchaseState' => 1]);
        self::assertSame('pending', $this->play()->purchase('tok-pending-1')->status);
        self::assertSame('refunded', $this->play()->purchase('tok-canceled-1')->status);
        $this->expectException(PurchaseRefused::class);
        $this->play()->purchase('tok-nobody-knows');
    }

    public function testAcknowledging(): void
    {
        StoresMock::$play['tok-purchased-1'] = StoresMock::playPurchase('GPA.1');
        self::assertTrue($this->play()->acknowledge('tok-purchased-1'));
        self::assertSame(1, StoresMock::$play['tok-purchased-1']['acknowledgementState']);
    }

    public function testTheVoidedList(): void
    {
        StoresMock::$voided = [['purchaseToken' => 'tok-1', 'orderId' => 'GPA.1', 'voidedTimeMillis' => '1760900000000']];
        self::assertSame([['token' => 'tok-1', 'orderId' => 'GPA.1']], $this->play()->voided(new \DateTimeImmutable('-3 days')));
    }

    public function testWithoutTheSettingsGooglePlayIsUnavailable(): void
    {
        foreach ([$this->play(package: ''), $this->play(account: ''), $this->play(account: 'var/test-stores/none.json'), $this->play(account: '{"client_email": 1}')] as $play) {
            try {
                $play->assertAvailable();
                self::fail('Available');
            } catch (StoreUnavailable $e) {
                self::assertSame('Google Play purchases are not available on this server.', $e->getMessage());
            }
        }
        self::assertSame([], StoresMock::$calls);
    }

    public function testTheServiceAccountMayBeGivenAsJson(): void
    {
        StoresMock::$play['tok-purchased-1'] = StoresMock::playPurchase('GPA.1');
        $json = (string) file_get_contents(\dirname(__DIR__, 2).'/var/test-stores/google-service-account.json');
        self::assertSame('active', $this->play(account: $json)->purchase('tok-purchased-1')->status);
    }
}
