<?php

namespace App\Tests;

use App\Purchases\Apple\AppleJws;

/**
 * Keys and certificates the store tests make for themselves, so no test needs a real store or a real key:
 * an App Store chain (a root, an intermediate and a leaf with Apple's marker extensions, all P-256), a second
 * chain under another root, and a Google service account key (RSA). The root and the service account file are
 * written under var/test-stores/, where .env.test points APPLE_ROOT_CERTIFICATE and GOOGLE_PLAY_SERVICE_ACCOUNT.
 */
final class StoreKeys
{
    public const BUNDLE_ID = 'com.pockethegemony.app';
    public const PACKAGE = 'com.pockethegemony.app';
    public const CLIENT_EMAIL = 'play-purchases@pocket-hegemony-test.iam.gserviceaccount.com';

    /** @var array<string, array{key: \OpenSSLAsymmetricKey, x5c: list<string>}> */
    private static array $chains = [];
    private static ?\OpenSSLAsymmetricKey $google = null;

    /** Writes the trusted root and the service account file for the kernel to read. */
    public static function install(string $projectDir): void
    {
        $dir = $projectDir.'/var/test-stores';
        if (!is_dir($dir)) {
            mkdir($dir, 0777, true);
        }
        file_put_contents($dir.'/apple-root.cer', base64_decode(self::chain('apple')['x5c'][2], true));
        openssl_pkey_export(self::googleKey(), $pem);
        file_put_contents($dir.'/google-service-account.json', json_encode([
            'type' => 'service_account',
            'project_id' => 'pocket-hegemony-test',
            'private_key_id' => 'test-key-1',
            'private_key' => $pem,
            'client_email' => self::CLIENT_EMAIL,
            'token_uri' => 'https://oauth2.googleapis.com/token',
        ]));
    }

    public static function rootDer(string $which = 'apple'): string
    {
        return (string) base64_decode(self::chain($which)['x5c'][2], true);
    }

    /**
     * A JWS as the App Store signs it. `$chain` "apple" leads to the trusted root, "other" to another root,
     * "unmarked" to the trusted root through certificates without Apple's markers.
     *
     * @param array<string, mixed> $payload
     */
    public static function appleSign(array $payload, string $chain = 'apple'): string
    {
        $c = self::chain($chain);
        $header = self::b64(json_encode(['alg' => 'ES256', 'x5c' => $c['x5c']], \JSON_THROW_ON_ERROR));
        $body = self::b64(json_encode($payload, \JSON_THROW_ON_ERROR));
        openssl_sign($header.'.'.$body, $der, $c['key'], \OPENSSL_ALGO_SHA256);

        return $header.'.'.$body.'.'.self::b64(AppleJws::rawSignature($der));
    }

    /** A StoreKit 2 transaction for the full game, signed now, with the fields given on top. */
    public static function transaction(array $over = [], string $chain = 'apple'): string
    {
        $now = time() * 1000;

        return self::appleSign($over + [
            'transactionId' => $over['originalTransactionId'] ?? '2000000123456789',
            'originalTransactionId' => '2000000123456789',
            'bundleId' => self::BUNDLE_ID,
            'productId' => 'full_game',
            'purchaseDate' => $now - 60_000,
            'originalPurchaseDate' => $now - 60_000,
            'quantity' => 1,
            'type' => 'Non-Consumable',
            'inAppOwnershipType' => 'PURCHASED',
            'signedDate' => $now,
            'environment' => 'Production',
        ], $chain);
    }

    /** An App Store Server Notification V2 about one transaction. */
    public static function notification(string $type, string $signedTransaction, array $data = [], string $chain = 'apple'): string
    {
        return self::appleSign([
            'notificationType' => $type,
            'notificationUUID' => bin2hex(random_bytes(16)),
            'version' => '2.0',
            'signedDate' => time() * 1000,
            'data' => $data + ['bundleId' => self::BUNDLE_ID, 'environment' => 'Production', 'signedTransactionInfo' => $signedTransaction],
        ], $chain);
    }

    public static function googleKey(): \OpenSSLAsymmetricKey
    {
        return self::$google ??= openssl_pkey_new(['private_key_type' => \OPENSSL_KEYTYPE_RSA, 'private_key_bits' => 2048]);
    }

    /** @return array{key: \OpenSSLAsymmetricKey, x5c: list<string>} */
    private static function chain(string $which): array
    {
        if (isset(self::$chains[$which])) {
            return self::$chains[$which];
        }
        $marked = 'unmarked' !== $which;
        $cnf = tempnam(sys_get_temp_dir(), 'ph-openssl');
        file_put_contents($cnf, implode("\n", [
            '[req]', 'distinguished_name = dn', '[dn]',
            '[root]', 'basicConstraints = critical,CA:TRUE', 'keyUsage = critical,keyCertSign,cRLSign',
            '[inter]', 'basicConstraints = critical,CA:TRUE,pathlen:0', 'keyUsage = critical,keyCertSign,cRLSign', ...($marked ? [AppleJws::INTERMEDIATE_OID.' = ASN1:NULL'] : []),
            '[leaf]', 'basicConstraints = critical,CA:FALSE', 'keyUsage = critical,digitalSignature', ...($marked ? [AppleJws::LEAF_OID.' = ASN1:NULL'] : []),
            '',
        ]));
        $opts = static fn (string $ext) => ['config' => $cnf, 'digest_alg' => 'sha256', 'x509_extensions' => $ext];
        $key = static fn () => openssl_pkey_new(['private_key_type' => \OPENSSL_KEYTYPE_EC, 'curve_name' => 'prime256v1']);
        // The unmarked chain hangs under the trusted root, so only the missing markers can refuse it.
        if ('other' === $which) {
            $rootKey = $key();
            $root = openssl_csr_sign(openssl_csr_new(['commonName' => 'Not Apple Root CA'], $rootKey, $opts('root')), null, $rootKey, 3650, $opts('root'), 1);
        } else {
            $trusted = self::$chains['apple:root'] ?? null;
            if (null === $trusted) {
                $rootKey = $key();
                $root = openssl_csr_sign(openssl_csr_new(['commonName' => 'Test Apple Root CA - G3'], $rootKey, $opts('root')), null, $rootKey, 3650, $opts('root'), 1);
                openssl_x509_export($root, $rootPem);
                self::$chains['apple:root'] = ['key' => $rootKey, 'x5c' => [self::der($rootPem)]];
            } else {
                $rootKey = $trusted['key'];
                $root = self::pem($trusted['x5c'][0]);
            }
        }
        $interKey = $key();
        $inter = openssl_csr_sign(openssl_csr_new(['commonName' => 'Test Apple Worldwide Developer Relations'], $interKey, $opts('inter')), $root, $rootKey, 3650, $opts('inter'), 2);
        $leafKey = $key();
        $leaf = openssl_csr_sign(openssl_csr_new(['commonName' => 'Test Prod ECC Mac App Store and iTunes Store Receipt Signing'], $leafKey, $opts('leaf')), $inter, $interKey, 3650, $opts('leaf'), 3);
        unlink($cnf);
        openssl_x509_export($leaf, $leafPem);
        openssl_x509_export($inter, $interPem);
        openssl_x509_export($root, $rootPem);

        return self::$chains[$which] = ['key' => $leafKey, 'x5c' => [self::der($leafPem), self::der($interPem), self::der($rootPem)]];
    }

    private static function der(string $pem): string
    {
        return (string) preg_replace('/-----[A-Z ]+-----|\s+/', '', $pem);
    }

    private static function pem(string $b64): string
    {
        return "-----BEGIN CERTIFICATE-----\n".chunk_split($b64, 64, "\n")."-----END CERTIFICATE-----\n";
    }

    private static function b64(string $bytes): string
    {
        return rtrim(strtr(base64_encode($bytes), '+/', '-_'), '=');
    }
}
