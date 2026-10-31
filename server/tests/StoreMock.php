<?php

namespace App\Tests;

use App\Account\AppleTokens;
use App\Account\IdToken\AppleIdTokens;
use App\Purchases\Apple\AppleJws;
use App\Account\IdToken\GoogleIdTokens;
use App\Account\Steam\SteamOpenId;
use App\Account\Steam\SteamWebApi;
use Symfony\Component\HttpClient\Response\MockResponse;

/**
 * Every store as the tests see it: Steam's ticket check (SteamMock), the purchase checks (StoresMock), Apple's and Google's key sets
 * (the local TestKeys "apple-1" and "google-1"), and Steam's OpenID check_authentication, which
 * confirms an answer whose signature is "good-sig". Every other call fails the test.
 */
final class StoreMock
{
    /** @var list<array{string, string}> every call made, for the tests to look at */
    public static array $calls = [];

    /** @var list<array<string, string>> the bodies of the calls to Apple's token and revoke endpoints (SAVE-203, SAVE-204) */
    public static array $apple = [];

    /** While true, Apple's revoke endpoint fails. */
    public static bool $appleDown = false;

    public function __invoke(string $method, string $url, array $options = []): MockResponse
    {
        self::$calls[] = [$method, $url];
        // The purchase checks' store calls (Steam ownership, App Store, Google Play) answer from StoresMock.
        if (StoresMock::handles($url)) {
            return (new StoresMock())($method, $url, $options);
        }
        if (str_starts_with($url, SteamWebApi::URL)) {
            return (new SteamMock())($method, $url);
        }
        if (AppleTokens::TOKEN === $url || AppleTokens::REVOKE === $url) {
            return self::apple($url, self::form($options['body'] ?? ''));
        }
        if (AppleIdTokens::KEYS === $url) {
            return self::json(TestKeys::jwks('apple-1'));
        }
        if (GoogleIdTokens::KEYS === $url) {
            return self::json(TestKeys::jwks('google-1'));
        }
        if (SteamOpenId::LOGIN === $url && 'POST' === $method) {
            $fields = self::form($options['body'] ?? '');
            $valid = 'check_authentication' === ($fields['openid.mode'] ?? null) && 'good-sig' === ($fields['openid.sig'] ?? null);

            return new MockResponse("ns:http://specs.openid.net/auth/2.0\nis_valid:".($valid ? 'true' : 'false')."\n");
        }
        throw new \LogicException("Unexpected HTTP call in a test: {$method} {$url}");
    }

    /** Apple's token and revoke endpoints: the client secret must be signed with the server's key for its client id. */
    private static function apple(string $url, array $body): MockResponse
    {
        self::$apple[] = ['url' => $url] + $body;
        [$h, $p, $sig] = explode('.', $body['client_secret'] ?? '..') + ['', '', ''];
        $claims = json_decode((string) base64_decode(strtr($p, '-_', '+/')), true) ?? [];
        $public = openssl_pkey_get_details(StoreKeys::appleSignInKey())['key'];
        $signed = 1 === openssl_verify($h.'.'.$p, AppleJws::derSignature((string) base64_decode(strtr($sig, '-_', '+/'))), $public, \OPENSSL_ALGO_SHA256);
        if (!$signed || 'TEAM123456' !== ($claims['iss'] ?? null) || ($claims['sub'] ?? null) !== ($body['client_id'] ?? '')) {
            return new MockResponse('{"error":"invalid_client"}', ['http_code' => 400]);
        }
        if (AppleTokens::REVOKE === $url) {
            return new MockResponse('', ['http_code' => self::$appleDown ? 503 : 200]);
        }
        if ('apple-code-good' !== ($body['code'] ?? null)) {
            return new MockResponse('{"error":"invalid_grant"}', ['http_code' => 400]);
        }

        return self::json(['access_token' => 'a', 'token_type' => 'Bearer', 'expires_in' => 3600, 'refresh_token' => 'apple-refresh-1', 'id_token' => 'x']);
    }

    private static function json(array $data): MockResponse
    {
        return new MockResponse(json_encode($data), ['response_headers' => ['content-type' => 'application/json', 'cache-control' => 'public, max-age=3600']]);
    }

    /** A form body, keeping the dots in names that parse_str would turn into underscores. */
    private static function form(mixed $body): array
    {
        if (\is_array($body)) {
            return $body;
        }
        $fields = [];
        foreach (explode('&', (string) $body) as $pair) {
            [$k, $v] = array_pad(explode('=', $pair, 2), 2, '');
            $fields[urldecode($k)] = urldecode($v);
        }

        return $fields;
    }
}
