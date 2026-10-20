<?php

namespace App\Tests;

use App\Account\IdToken\AppleIdTokens;
use App\Account\IdToken\GoogleIdTokens;
use App\Account\Steam\SteamOpenId;
use App\Account\Steam\SteamWebApi;
use Symfony\Component\HttpClient\Response\MockResponse;

/**
 * Every store as the tests see it: Steam's ticket check (SteamMock), Apple's and Google's key sets
 * (the local TestKeys "apple-1" and "google-1"), and Steam's OpenID check_authentication, which
 * confirms an answer whose signature is "good-sig". Every other call fails the test.
 */
final class StoreMock
{
    /** @var list<array{string, string}> every call made, for the tests to look at */
    public static array $calls = [];

    public function __invoke(string $method, string $url, array $options = []): MockResponse
    {
        self::$calls[] = [$method, $url];
        if (str_starts_with($url, SteamWebApi::URL)) {
            return (new SteamMock())($method, $url);
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
