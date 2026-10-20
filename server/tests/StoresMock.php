<?php

namespace App\Tests;

use App\Purchases\Google\GooglePlay;
use App\Purchases\SteamOwnership;
use Symfony\Component\HttpClient\Response\MockResponse;

/**
 * The stores' Web APIs as the purchase tests see them, never the real ones (SAVE-173, SAVE-175, SAVE-177):
 * Steam's CheckAppOwnership, Google's OAuth token endpoint (which checks the service account's JWT against
 * the key StoreKeys made) and the Play Developer API. A test sets what each store knows in the static
 * fields and reads back the calls made. SteamMock hands every call it does not answer itself to this.
 */
final class StoresMock
{
    /** @var array<string, bool> SteamID → owns the full game */
    public static array $steamOwners = [];
    public static bool $steamDown = false;
    /** @var array<string, array<string, mixed>> purchase token → Play's ProductPurchase */
    public static array $play = [];
    /** @var list<array<string, mixed>> Play's voided purchases list */
    public static array $voided = [];
    /** @var list<string> "METHOD url" of every call */
    public static array $calls = [];

    public static function reset(): void
    {
        self::$steamOwners = [];
        self::$steamDown = false;
        self::$play = [];
        self::$voided = [];
        self::$calls = [];
    }

    /** How many calls went to a URL starting with this. */
    public static function count(string $prefix): int
    {
        return \count(array_filter(self::$calls, static fn (string $c) => str_contains($c, ' '.$prefix)));
    }

    public static function handles(string $url): bool
    {
        return str_starts_with($url, SteamOwnership::URL) || str_starts_with($url, GooglePlay::TOKEN_URL) || str_starts_with($url, GooglePlay::API);
    }

    /** @param array<string, mixed> $options */
    public function __invoke(string $method, string $url, array $options = []): MockResponse
    {
        self::$calls[] = $method.' '.$url;
        if (str_starts_with($url, SteamOwnership::URL)) {
            return $this->steam($url);
        }
        if (str_starts_with($url, GooglePlay::TOKEN_URL)) {
            return $this->token((string) ($options['body'] ?? ''));
        }
        if (str_starts_with($url, GooglePlay::API)) {
            $auth = implode("\n", array_map(static fn ($h) => (string) $h, (array) ($options['headers'] ?? [])));
            if (!str_contains($auth, 'Authorization: Bearer ya29.test-access')) {
                return new MockResponse('{"error":{"code":401,"message":"Request had invalid authentication credentials."}}', ['http_code' => 401]);
            }

            return $this->play($method, $url);
        }
        throw new \LogicException("Unexpected HTTP call in a test: {$method} {$url}");
    }

    private function steam(string $url): MockResponse
    {
        if (self::$steamDown) {
            return new MockResponse('', ['http_code' => 503]);
        }
        parse_str((string) parse_url($url, \PHP_URL_QUERY), $q);
        if ('test-key' !== ($q['key'] ?? null)) {
            return new MockResponse('<html>Forbidden</html>', ['http_code' => 403]);
        }
        $id = (string) ($q['steamid'] ?? '');
        $owns = self::$steamOwners[$id] ?? false;

        return new MockResponse(json_encode(['appownership' => [
            'ownsapp' => $owns, 'permanent' => $owns, 'timestamp' => '2026-10-01T10:00:00Z', 'ownersteamid' => $owns ? $id : '0', 'sitelicense' => false, 'result' => 'OK',
        ]]));
    }

    /** Google's token endpoint: the JWT must be signed by the service account's key, for our scope and audience. */
    private function token(string $body): MockResponse
    {
        parse_str($body, $form);
        $jwt = explode('.', (string) ($form['assertion'] ?? ''));
        $refuse = new MockResponse('{"error":"invalid_grant"}', ['http_code' => 400]);
        if ('urn:ietf:params:oauth:grant-type:jwt-bearer' !== ($form['grant_type'] ?? null) || 3 !== \count($jwt)) {
            return $refuse;
        }
        $public = openssl_pkey_get_details(StoreKeys::googleKey())['key'];
        $sig = base64_decode(strtr($jwt[2], '-_', '+/'), true);
        if (1 !== openssl_verify($jwt[0].'.'.$jwt[1], (string) $sig, $public, \OPENSSL_ALGO_SHA256)) {
            return $refuse;
        }
        $claims = json_decode((string) base64_decode(strtr($jwt[1], '-_', '+/'), true), true);
        if (StoreKeys::CLIENT_EMAIL !== ($claims['iss'] ?? null) || GooglePlay::SCOPE !== ($claims['scope'] ?? null) || GooglePlay::TOKEN_URL !== ($claims['aud'] ?? null)) {
            return $refuse;
        }

        return new MockResponse(json_encode(['access_token' => 'ya29.test-access', 'expires_in' => 3599, 'token_type' => 'Bearer']));
    }

    private function play(string $method, string $url): MockResponse
    {
        $path = substr($url, \strlen(GooglePlay::API));
        $package = rawurlencode(StoreKeys::PACKAGE);
        if (1 === preg_match('#^'.preg_quote($package, '#').'/purchases/voidedpurchases\?#', $path)) {
            return new MockResponse(json_encode(['voidedPurchases' => self::$voided]));
        }
        if (1 !== preg_match('#^'.preg_quote($package, '#').'/purchases/products/full_game/tokens/([^/:]+)(:acknowledge)?$#', $path, $m)) {
            return new MockResponse('{"error":{"code":404,"message":"Not found"}}', ['http_code' => 404]);
        }
        $token = rawurldecode($m[1]);
        if (!isset(self::$play[$token])) {
            return new MockResponse('{"error":{"code":400,"message":"The purchase token is no longer valid."}}', ['http_code' => 400]);
        }
        if ('POST' === $method && ':acknowledge' === ($m[2] ?? '')) {
            self::$play[$token]['acknowledgementState'] = 1;

            return new MockResponse('', ['http_code' => 204]);
        }

        return new MockResponse(json_encode(self::$play[$token] + ['kind' => 'androidpublisher#productPurchase', 'purchaseToken' => $token]));
    }

    /** A purchased full game as Play reports it. */
    public static function playPurchase(string $orderId, array $over = []): array
    {
        return $over + [
            'purchaseTimeMillis' => '1760900000000',
            'purchaseState' => 0,
            'consumptionState' => 0,
            'orderId' => $orderId,
            'acknowledgementState' => 0,
            'productId' => 'full_game',
            'quantity' => 1,
            'regionCode' => 'NL',
        ];
    }
}
