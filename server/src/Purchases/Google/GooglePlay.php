<?php

namespace App\Purchases\Google;

use App\Entity\Entitlement;
use App\Purchases\PurchaseRefused;
use App\Purchases\StorePurchase;
use App\Purchases\StoreUnavailable;
use Psr\Clock\ClockInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Contracts\HttpClient\Exception\ExceptionInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * Google Play purchases (SAVE-175, SAVE-177): the Play Developer API, signed in as our service account
 * (`GOOGLE_PLAY_SERVICE_ACCOUNT`, the key file's JSON or its path). The account's access token comes from
 * a JWT it signs itself (RS256 with openssl), so no Google library is needed. Without the package name or
 * the service account, Google Play purchases are not available (SAVE-178).
 */
final class GooglePlay
{
    public const API = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/';
    public const SCOPE = 'https://www.googleapis.com/auth/androidpublisher';
    public const TOKEN_URL = 'https://oauth2.googleapis.com/token';

    /** Play's purchase states (ProductPurchase.purchaseState). */
    private const PURCHASED = 0;
    private const CANCELED = 1;

    /** @var array{client_email: string, private_key: string, private_key_id?: string, token_uri?: string}|null */
    private ?array $key = null;
    private ?string $accessToken = null;
    private int $accessUntil = 0;

    public function __construct(
        private readonly HttpClientInterface $http,
        private readonly ClockInterface $clock,
        #[Autowire('%env(GOOGLE_PLAY_PACKAGE_NAME)%')] private readonly string $packageName,
        #[Autowire('%env(GOOGLE_PLAY_SERVICE_ACCOUNT)%')] private readonly string $serviceAccount,
        #[Autowire('%env(GOOGLE_PLAY_PRODUCT_ID)%')] private readonly string $productId,
        #[Autowire('%kernel.project_dir%')] private readonly string $projectDir,
    ) {
    }

    public function packageName(): string
    {
        return $this->packageName;
    }

    /** @throws StoreUnavailable when the package name or the service account is not set or not readable */
    public function assertAvailable(): void
    {
        $this->key();
    }

    /** The `obfuscatedAccountId` the game sets on a purchase for this account (SAVE-172): a SHA-256 of its id. */
    public static function accountTag(string $accountId): string
    {
        return hash('sha256', $accountId);
    }

    /**
     * `purchases.products.get` for the full game (SAVE-175).
     *
     * @throws PurchaseRefused  `not_found` for a token Play does not know
     * @throws StoreUnavailable while Play cannot be reached
     */
    public function purchase(string $token): StorePurchase
    {
        if (1 !== preg_match('/^[A-Za-z0-9._:\-]{8,512}$/', $token)) {
            throw new PurchaseRefused('not_found', 'Google Play does not know this purchase.');
        }
        [$status, $data] = $this->call('GET', $this->tokenUrl($token));
        if (\in_array($status, [400, 404, 410], true)) {
            throw new PurchaseRefused('not_found', 'Google Play does not know this purchase.');
        }
        if ($status >= 300) {
            throw new StoreUnavailable(Entitlement::GOOGLE, true);
        }
        $state = $data['purchaseState'] ?? null;
        $status = match ($state) {
            self::PURCHASED => Entitlement::ACTIVE,
            self::CANCELED => Entitlement::REFUNDED,
            default => StorePurchase::PENDING,
        };
        $hash = hash('sha256', $token);
        $order = \is_string($data['orderId'] ?? null) && '' !== $data['orderId'] ? $data['orderId'] : 'token:'.$hash;
        $tag = \is_string($data['obfuscatedExternalAccountId'] ?? null) && '' !== $data['obfuscatedExternalAccountId'] ? $data['obfuscatedExternalAccountId'] : null;

        return new StorePurchase(
            Entitlement::GOOGLE,
            $this->productId,
            $order,
            $status,
            $tag,
            $hash,
            0 === ($data['purchaseType'] ?? null) ? 'test' : null,
            1 === ($data['acknowledgementState'] ?? null),
        );
    }

    /** `purchases.products.acknowledge`: Play refunds a purchase not acknowledged within 3 days (SAVE-175). */
    public function acknowledge(string $token): bool
    {
        try {
            [$status] = $this->call('POST', $this->tokenUrl($token).':acknowledge', []);
        } catch (StoreUnavailable) {
            return false;
        }

        return $status < 300;
    }

    /**
     * The voided purchases list since a time (SAVE-177), page by page.
     *
     * @return list<array{token: string, orderId: ?string}>
     */
    public function voided(\DateTimeImmutable $since, int $maxPages = 20): array
    {
        $out = [];
        $page = null;
        for ($i = 0; $i < $maxPages; ++$i) {
            $query = ['startTime' => (string) ($since->getTimestamp() * 1000), 'type' => '0'] + (null === $page ? [] : ['token' => $page]);
            [$status, $data] = $this->call('GET', self::API.rawurlencode($this->packageName).'/purchases/voidedpurchases?'.http_build_query($query));
            if ($status >= 300) {
                throw new StoreUnavailable(Entitlement::GOOGLE, true);
            }
            foreach ($data['voidedPurchases'] ?? [] as $v) {
                if (\is_array($v) && \is_string($v['purchaseToken'] ?? null)) {
                    $out[] = ['token' => $v['purchaseToken'], 'orderId' => \is_string($v['orderId'] ?? null) ? $v['orderId'] : null];
                }
            }
            $page = $data['tokenPagination']['nextPageToken'] ?? null;
            if (!\is_string($page) || '' === $page) {
                break;
            }
        }

        return $out;
    }

    private function tokenUrl(string $token): string
    {
        return self::API.rawurlencode($this->packageName).'/purchases/products/'.rawurlencode($this->productId).'/tokens/'.rawurlencode($token);
    }

    /**
     * @param array<string, mixed>|null $json
     *
     * @return array{int, array<string, mixed>}
     */
    private function call(string $method, string $url, ?array $json = null): array
    {
        $bearer = $this->bearer();
        try {
            $response = $this->http->request($method, $url, ['auth_bearer' => $bearer, 'timeout' => 10] + (null === $json ? [] : ['json' => (object) $json]));
            $status = $response->getStatusCode();
            $content = $response->getContent(false);
        } catch (ExceptionInterface $e) {
            throw new StoreUnavailable(Entitlement::GOOGLE, true, $e);
        }
        $data = '' === $content ? [] : json_decode($content, true);

        return [$status, \is_array($data) ? $data : []];
    }

    /** The service account's access token: a JWT it signs, traded at Google's token endpoint, kept until near its end. */
    private function bearer(): string
    {
        $key = $this->key();
        $now = $this->clock->now()->getTimestamp();
        if (null !== $this->accessToken && $now < $this->accessUntil) {
            return $this->accessToken;
        }
        $tokenUri = $key['token_uri'] ?? self::TOKEN_URL;
        $header = ['alg' => 'RS256', 'typ' => 'JWT'] + (isset($key['private_key_id']) ? ['kid' => $key['private_key_id']] : []);
        $claims = ['iss' => $key['client_email'], 'scope' => self::SCOPE, 'aud' => $tokenUri, 'iat' => $now, 'exp' => $now + 3600];
        $input = self::b64(json_encode($header, \JSON_THROW_ON_ERROR)).'.'.self::b64(json_encode($claims, \JSON_THROW_ON_ERROR));
        if (!openssl_sign($input, $signature, $key['private_key'], \OPENSSL_ALGO_SHA256)) {
            throw new StoreUnavailable(Entitlement::GOOGLE);
        }
        try {
            $response = $this->http->request('POST', $tokenUri, ['body' => [
                'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion' => $input.'.'.self::b64($signature),
            ], 'timeout' => 10]);
            $data = $response->getStatusCode() < 300 ? $response->toArray(false) : [];
        } catch (ExceptionInterface $e) {
            throw new StoreUnavailable(Entitlement::GOOGLE, true, $e);
        }
        if (!\is_string($data['access_token'] ?? null)) {
            throw new StoreUnavailable(Entitlement::GOOGLE, true);
        }
        $this->accessToken = $data['access_token'];
        $this->accessUntil = $now + max(60, (int) ($data['expires_in'] ?? 3600) - 60);

        return $this->accessToken;
    }

    /** @return array{client_email: string, private_key: string, private_key_id?: string, token_uri?: string} */
    private function key(): array
    {
        if (null !== $this->key) {
            return $this->key;
        }
        StoreUnavailable::unlessSet(Entitlement::GOOGLE, $this->packageName, $this->serviceAccount, $this->productId);
        $text = trim($this->serviceAccount);
        if (!str_starts_with($text, '{')) {
            $path = str_starts_with($text, '/') ? $text : $this->projectDir.'/'.$text;
            $text = is_file($path) ? (string) file_get_contents($path) : '';
        }
        $key = json_decode($text, true);
        if (!\is_array($key) || !\is_string($key['client_email'] ?? null) || !\is_string($key['private_key'] ?? null)) {
            throw new StoreUnavailable(Entitlement::GOOGLE);
        }

        return $this->key = $key;
    }

    private static function b64(string $bytes): string
    {
        return rtrim(strtr(base64_encode($bytes), '+/', '-_'), '=');
    }
}
