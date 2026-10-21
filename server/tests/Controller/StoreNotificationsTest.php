<?php

namespace App\Tests\Controller;

use App\Tests\StoreKeys;
use App\Tests\StoresMock;
use PHPUnit\Framework\Attributes\DataProvider;
use Symfony\Bundle\FrameworkBundle\Console\Application;
use Symfony\Component\Console\Tester\CommandTester;

/** The stores' refund and revocation notices: purchases.feature (SAVE-176, SAVE-177). */
final class StoreNotificationsTest extends StoreTestCase
{
    /** An account with an active App Store purchase; returns its id. */
    private function applePurchase(): string
    {
        [$token, $id] = $this->phonePlayer();
        $this->call('POST', '/api/purchases', ['store' => 'apple', 'signedTransaction' => StoreKeys::transaction()], $token);
        self::assertResponseIsSuccessful();

        return $id;
    }

    /** An account with an active Google Play purchase for the token "tok-full-game-1"; returns its id. */
    private function playPurchase(): string
    {
        [$token, $id] = $this->phonePlayer(platform: 'android');
        StoresMock::$play['tok-full-game-1'] = StoresMock::playPurchase('GPA.3300-0000-0000-00001');
        $this->call('POST', '/api/purchases', ['store' => 'google', 'purchaseToken' => 'tok-full-game-1'], $token);
        self::assertResponseIsSuccessful();

        return $id;
    }

    /** @param array<string, mixed> $notification */
    private function push(array $notification, ?string $pushToken = 'test-push-token'): void
    {
        $body = ['message' => ['data' => base64_encode((string) json_encode($notification)), 'messageId' => '1', 'publishTime' => '2026-10-19T12:00:00Z'], 'subscription' => 'projects/p/subscriptions/play'];
        $this->call('POST', '/api/stores/google/notifications'.(null === $pushToken ? '' : '?token='.$pushToken), $body);
    }

    /** @return iterable<string, array{string, string}> */
    public static function appleTypes(): iterable
    {
        yield 'refund' => ['REFUND', 'refunded'];
        yield 'revoke (Family Sharing ended)' => ['REVOKE', 'revoked'];
    }

    #[DataProvider('appleTypes')]
    public function testAppleNotificationsMarkThePurchase(string $type, string $status): void
    {
        $id = $this->applePurchase();
        $this->call('POST', '/api/stores/apple/notifications', ['signedPayload' => StoreKeys::notification($type, StoreKeys::transaction(['revocationDate' => time() * 1000]))]);
        self::assertResponseIsSuccessful();
        self::assertSame($status, $this->row($id, 'apple')->getStatus());

        $this->call('POST', '/api/stores/apple/notifications', ['signedPayload' => StoreKeys::notification('REFUND_REVERSED', StoreKeys::transaction())]);
        self::assertSame('active', $this->row($id, 'apple')->getStatus());
    }

    public function testANotificationNotSignedByAppleIsRefused(): void
    {
        $id = $this->applePurchase();
        $this->call('POST', '/api/stores/apple/notifications', ['signedPayload' => StoreKeys::notification('REFUND', StoreKeys::transaction(), [], 'other')]);
        self::assertResponseStatusCodeSame(400);
        // A genuine notice wrapping a forged transaction is refused as well.
        $this->call('POST', '/api/stores/apple/notifications', ['signedPayload' => StoreKeys::notification('REFUND', StoreKeys::transaction([], 'other'))]);
        self::assertResponseStatusCodeSame(400);
        $this->call('POST', '/api/stores/apple/notifications', ['signedPayload' => StoreKeys::notification('REFUND', StoreKeys::transaction(), ['bundleId' => 'com.example.other'])]);
        self::assertResponseStatusCodeSame(400);
        $this->call('POST', '/api/stores/apple/notifications', ['nothing' => true]);
        self::assertResponseStatusCodeSame(400);
        self::assertSame('active', $this->row($id, 'apple')->getStatus());
    }

    public function testANotificationAboutAPurchaseTheServerDoesNotHold(): void
    {
        $answer = $this->call('POST', '/api/stores/apple/notifications', ['signedPayload' => StoreKeys::notification('REFUND', StoreKeys::transaction(['originalTransactionId' => '2000000555']))]);
        self::assertResponseIsSuccessful();
        self::assertSame(['done' => 'nothing'], $answer);
    }

    public function testAOneTimeChargeForASignedInPlayerIsRecorded(): void
    {
        [, $id] = $this->phonePlayer();
        $this->call('POST', '/api/stores/apple/notifications', ['signedPayload' => StoreKeys::notification('ONE_TIME_CHARGE', StoreKeys::transaction(['appAccountToken' => $id]))]);
        self::assertResponseIsSuccessful();
        self::assertTrue($this->row($id, 'apple')->isActive());
    }

    public function testAVoidedPlayPurchaseIsRefunded(): void
    {
        $id = $this->playPurchase();
        $this->push(['version' => '1.0', 'packageName' => StoreKeys::PACKAGE, 'eventTimeMillis' => '1760900000000', 'voidedPurchaseNotification' => [
            'purchaseToken' => 'tok-full-game-1', 'orderId' => 'GPA.3300-0000-0000-00001', 'productType' => 2, 'refundType' => 1,
        ]]);
        self::assertResponseStatusCodeSame(204);
        self::assertSame('refunded', $this->row($id, 'google')->getStatus());
    }

    public function testAPushWithoutThePushTokenOrForAnotherAppIsRefused(): void
    {
        $id = $this->playPurchase();
        $voided = ['version' => '1.0', 'packageName' => StoreKeys::PACKAGE, 'voidedPurchaseNotification' => ['purchaseToken' => 'tok-full-game-1', 'orderId' => 'GPA.1', 'productType' => 2]];
        $this->push($voided, null);
        self::assertResponseStatusCodeSame(403);
        $this->push($voided, 'guessed');
        self::assertResponseStatusCodeSame(403);
        $this->push(['packageName' => 'com.example.other'] + $voided);
        self::assertResponseStatusCodeSame(403);
        self::assertTrue($this->row($id, 'google')->isActive());
    }

    public function testAOneTimeProductNotificationReadsThePurchaseAgain(): void
    {
        $id = $this->playPurchase();
        StoresMock::$play['tok-full-game-1']['purchaseState'] = 1;
        $this->push(['version' => '1.0', 'packageName' => StoreKeys::PACKAGE, 'oneTimeProductNotification' => ['version' => '1.0', 'notificationType' => 2, 'purchaseToken' => 'tok-full-game-1', 'sku' => 'full_game']]);
        self::assertResponseStatusCodeSame(204);
        self::assertSame('refunded', $this->row($id, 'google')->getStatus());
    }

    public function testTestAndUnknownPushesAreAccepted(): void
    {
        $this->push(['version' => '1.0', 'packageName' => StoreKeys::PACKAGE, 'testNotification' => ['version' => '1.0']]);
        self::assertResponseStatusCodeSame(204);
        $this->push(['version' => '1.0', 'packageName' => StoreKeys::PACKAGE, 'voidedPurchaseNotification' => ['purchaseToken' => 'tok-unknown', 'orderId' => 'GPA.0']]);
        self::assertResponseStatusCodeSame(204);
        $this->call('POST', '/api/stores/google/notifications?token=test-push-token', ['message' => ['data' => '%%%']]);
        self::assertResponseStatusCodeSame(204);
    }

    public function testTheDailyCommandReadsTheVoidedList(): void
    {
        $id = $this->playPurchase();
        StoresMock::$voided = [['purchaseToken' => 'tok-full-game-1', 'orderId' => 'GPA.3300-0000-0000-00001', 'voidedTimeMillis' => '1760900000000']];
        $tester = new CommandTester((new Application(self::$kernel))->find('app:stores:google-voided'));
        self::assertSame(0, $tester->execute([]));
        self::assertStringContainsString('1 marked refunded', $tester->getDisplay());
        self::assertSame('refunded', $this->row($id, 'google')->getStatus());
    }
}
