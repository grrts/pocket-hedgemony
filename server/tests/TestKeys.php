<?php

namespace App\Tests;

/**
 * RSA keys made on this machine for the tests, standing in for Apple's and Google's: StoreMock
 * serves their public halves as each store's key set, and token() signs ID tokens with them. A
 * third key ("stranger") is in no key set. Nothing here ever reaches the real stores.
 */
final class TestKeys
{
    /** @var array<string, \OpenSSLAsymmetricKey> */
    private static array $keys = [];

    public static function private(string $kid): \OpenSSLAsymmetricKey
    {
        return self::$keys[$kid] ??= openssl_pkey_new(['private_key_bits' => 2048, 'private_key_type' => \OPENSSL_KEYTYPE_RSA]);
    }

    /** @return array<string, mixed> the store's key set (JWKS) with these key ids */
    public static function jwks(string ...$kids): array
    {
        $keys = [];
        foreach ($kids as $kid) {
            $rsa = openssl_pkey_get_details(self::private($kid))['rsa'];
            $keys[] = ['kty' => 'RSA', 'kid' => $kid, 'use' => 'sig', 'alg' => 'RS256', 'n' => self::b64($rsa['n']), 'e' => self::b64($rsa['e'])];
        }

        return ['keys' => $keys];
    }

    /** A JWT with these claims, signed RS256 by the key $kid (or with the header's alg as given). */
    public static function token(array $claims, string $kid, string $alg = 'RS256'): string
    {
        $head = self::b64(json_encode(['alg' => $alg, 'kid' => $kid, 'typ' => 'JWT']));
        $body = self::b64(json_encode($claims));
        if ('RS256' !== $alg) {
            return "{$head}.{$body}.";
        }
        openssl_sign("{$head}.{$body}", $signature, self::private($kid), \OPENSSL_ALGO_SHA256);

        return "{$head}.{$body}.".self::b64($signature);
    }

    /** Claims as Apple would give them for our app, at $now. */
    public static function apple(string $sub, string $nonce, int $now, array $over = []): array
    {
        return $over + ['iss' => 'https://appleid.apple.com', 'aud' => 'com.pockethegemony.app', 'exp' => $now + 600, 'iat' => $now, 'sub' => $sub, 'nonce' => hash('sha256', $nonce), 'nonce_supported' => true];
    }

    /** Claims as Google would give them for our web client, at $now. */
    public static function google(string $sub, string $nonce, int $now, array $over = []): array
    {
        return $over + ['iss' => 'https://accounts.google.com', 'aud' => 'test-web.apps.googleusercontent.com', 'azp' => 'test-android.apps.googleusercontent.com', 'exp' => $now + 3600, 'iat' => $now, 'sub' => $sub, 'name' => 'Bertrand', 'nonce' => hash('sha256', $nonce)];
    }

    public static function b64(string $bytes): string
    {
        return rtrim(strtr(base64_encode($bytes), '+/', '-_'), '=');
    }
}
