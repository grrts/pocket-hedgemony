<?php

namespace App\Tests\Purchases;

use App\Purchases\Apple\AppleJws;
use App\Purchases\Apple\AppStore;
use App\Purchases\PurchaseRefused;
use App\Purchases\StoreUnavailable;
use App\Tests\StoreKeys;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

/** The App Store's signed data, checked against a root and chains the test makes itself (SAVE-174). */
final class AppleJwsTest extends TestCase
{
    private function jws(): AppleJws
    {
        return new AppleJws(StoreKeys::rootDer());
    }

    private function store(string $root = 'var/test-stores/apple-root.cer', bool $sandbox = false, string $bundle = StoreKeys::BUNDLE_ID): AppStore
    {
        StoreKeys::install(\dirname(__DIR__, 2));

        return new AppStore($bundle, $root, 'full_game', $sandbox, '', \dirname(__DIR__, 2));
    }

    public function testAChainToTheTrustedRootChecks(): void
    {
        $payload = $this->jws()->verify(StoreKeys::transaction());
        self::assertSame('full_game', $payload['productId']);
        self::assertSame('2000000123456789', $payload['originalTransactionId']);
    }

    public function testTheRootCanBeGivenAsPemOrDer(): void
    {
        $der = StoreKeys::rootDer();
        $pem = "-----BEGIN CERTIFICATE-----\n".chunk_split(base64_encode($der), 64, "\n")."-----END CERTIFICATE-----\n";
        self::assertSame($der, AppleJws::readCertificate($pem));
        self::assertSame($der, AppleJws::readCertificate($der));
    }

    /** @return iterable<string, array{string, string}> */
    public static function forged(): iterable
    {
        yield 'another root' => ['other', 'does not lead to Apple'];
        yield 'no Apple markers' => ['unmarked', 'not Apple\'s App Store chain'];
    }

    #[DataProvider('forged')]
    public function testAChainThatIsNotApplesIsRefused(string $chain, string $why): void
    {
        $this->expectException(PurchaseRefused::class);
        $this->expectExceptionMessage($why);
        $this->jws()->verify(StoreKeys::transaction([], $chain));
    }

    public function testAChangedPayloadIsRefused(): void
    {
        [$h, , $s] = explode('.', StoreKeys::transaction());
        $other = rtrim(strtr(base64_encode((string) json_encode(['productId' => 'full_game', 'signedDate' => time() * 1000, 'bundleId' => StoreKeys::BUNDLE_ID])), '+/', '-_'), '=');
        $this->expectExceptionMessage('signature does not check');
        $this->jws()->verify($h.'.'.$other.'.'.$s);
    }

    public function testACertificateNotValidWhenItWasSignedIsRefused(): void
    {
        $this->expectExceptionMessage('not valid when the data was signed');
        $this->jws()->verify(StoreKeys::transaction(['signedDate' => (time() + 20 * 365 * 86400) * 1000]));
    }

    public function testOnlyES256IsAccepted(): void
    {
        [, $p, $s] = explode('.', StoreKeys::transaction());
        $h = rtrim(strtr(base64_encode('{"alg":"none"}'), '+/', '-_'), '=');
        $this->expectExceptionMessage('not ES256');
        $this->jws()->verify($h.'.'.$p.'.'.$s);
    }

    public function testSignaturesConvertBothWays(): void
    {
        $key = openssl_pkey_new(['private_key_type' => \OPENSSL_KEYTYPE_EC, 'curve_name' => 'prime256v1']);
        for ($i = 0; $i < 20; ++$i) {
            openssl_sign("message {$i}", $der, $key, \OPENSSL_ALGO_SHA256);
            $raw = AppleJws::rawSignature($der);
            self::assertSame(64, \strlen($raw));
            self::assertSame(1, openssl_verify("message {$i}", AppleJws::derSignature($raw), openssl_pkey_get_details($key)['key'], \OPENSSL_ALGO_SHA256));
        }
    }

    public function testTheStoreReadsTheFullGamesTransaction(): void
    {
        $p = $this->store()->transaction(StoreKeys::transaction(['appAccountToken' => '0199F2A0-0000-7000-8000-000000000001']));
        self::assertSame(['apple', 'full_game', '2000000123456789', 'active', '0199f2a0-0000-7000-8000-000000000001', 'Production'], [$p->store, $p->product, $p->reference, $p->status, $p->accountTag, $p->environment]);
        self::assertSame('revoked', $this->store()->transaction(StoreKeys::transaction(['revocationDate' => time() * 1000]))->status);
    }

    /** @return iterable<string, array{array<string, mixed>, string}> */
    public static function wrongTransactions(): iterable
    {
        yield 'another app' => [['bundleId' => 'com.example.other'], 'wrong_app'];
        yield 'another product' => [['productId' => 'gold_pack'], 'wrong_product'];
        yield 'a test purchase' => [['environment' => 'Sandbox'], 'sandbox'];
    }

    /** @param array<string, mixed> $over */
    #[DataProvider('wrongTransactions')]
    public function testTheStoreRefusesWhatIsNotOurFullGame(array $over, string $reason): void
    {
        try {
            $this->store()->transaction(StoreKeys::transaction($over));
            self::fail('Accepted');
        } catch (PurchaseRefused $e) {
            self::assertSame($reason, $e->reason);
        }
    }

    public function testSandboxOnlyWhereTheServerAcceptsIt(): void
    {
        self::assertSame('Sandbox', $this->store(sandbox: true)->transaction(StoreKeys::transaction(['environment' => 'Sandbox']))->environment);
    }

    public function testWithoutTheSettingsTheAppStoreIsUnavailable(): void
    {
        foreach ([$this->store(bundle: ''), $this->store(root: ''), $this->store(root: 'var/test-stores/missing.cer')] as $store) {
            try {
                $store->assertAvailable();
                self::fail('Available');
            } catch (StoreUnavailable $e) {
                self::assertSame('App Store purchases are not available on this server.', $e->getMessage());
            }
        }
    }
}
