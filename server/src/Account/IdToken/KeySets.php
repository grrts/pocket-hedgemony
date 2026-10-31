<?php

namespace App\Account\IdToken;

use App\Account\SignInUnavailable;
use Psr\Cache\CacheItemPoolInterface;
use Psr\Clock\ClockInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Contracts\HttpClient\Exception\ExceptionInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * The stores' public keys (JWKS) that sign their ID tokens: Apple's and Google's (SAVE-149, SAVE-150).
 * A key set is kept as long as the store's Cache-Control says (an hour when it says nothing, a day
 * at most), and fetched again when a token names a key it does not hold, at most every 5 minutes,
 * so tokens naming made-up keys cannot make the server call the store on every try.
 */
final class KeySets
{
    private const DEFAULT_SECONDS = 3600;
    private const MAX_SECONDS = 86400;
    private const REFETCH_SECONDS = 300;

    public function __construct(
        private readonly HttpClientInterface $http,
        #[Autowire(service: 'cache.sign_in_keys')] private readonly CacheItemPoolInterface $cache,
        private readonly ClockInterface $clock,
    ) {
    }

    /**
     * The PEM public key with this id in the key set at $url, or null when the set has none.
     *
     * @throws SignInUnavailable when the key set cannot be fetched
     */
    public function key(string $url, string $kid): ?string
    {
        $item = $this->cache->getItem('jwks_'.hash('sha256', $url));
        $set = $item->isHit() ? $item->get() : null;
        $now = $this->clock->now()->getTimestamp();
        if (\is_array($set)) {
            if (isset($set['keys'][$kid])) {
                return $set['keys'][$kid];
            }
            if ($now - $set['fetchedAt'] < self::REFETCH_SECONDS) {
                return null;
            }
        }
        [$keys, $seconds] = $this->fetch($url);
        $item->set(['fetchedAt' => $now, 'keys' => $keys]);
        $item->expiresAfter($seconds);
        $this->cache->save($item);

        return $keys[$kid] ?? null;
    }

    /** @return array{array<string, string>, int} the keys by id, and how long to keep them */
    private function fetch(string $url): array
    {
        try {
            $response = $this->http->request('GET', $url, ['timeout' => 10]);
            $status = $response->getStatusCode();
            $data = 200 === $status ? $response->toArray(false) : null;
            $cacheControl = $response->getHeaders(false)['cache-control'][0] ?? '';
        } catch (ExceptionInterface $e) {
            throw new SignInUnavailable('The key set could not be fetched.', previous: $e);
        }
        if (!\is_array($data) || !\is_array($data['keys'] ?? null)) {
            throw new SignInUnavailable("The key set answered {$status}.");
        }
        $keys = [];
        foreach ($data['keys'] as $jwk) {
            if (\is_array($jwk) && \is_string($jwk['kid'] ?? null) && null !== ($pem = self::pem($jwk))) {
                $keys[$jwk['kid']] = $pem;
            }
        }
        $seconds = 1 === preg_match('/max-age=(\d+)/', $cacheControl, $m) ? (int) $m[1] : self::DEFAULT_SECONDS;

        return [$keys, max(60, min(self::MAX_SECONDS, $seconds))];
    }

    /**
     * An RSA signing key from its JWK (`kty` RSA, `n`, `e`) as a PEM SubjectPublicKeyInfo, or null
     * for any other kind of key.
     *
     * @param array<string, mixed> $jwk
     */
    public static function pem(array $jwk): ?string
    {
        if ('RSA' !== ($jwk['kty'] ?? null) || !\in_array($jwk['use'] ?? 'sig', ['sig'], true) || !\in_array($jwk['alg'] ?? 'RS256', ['RS256'], true)) {
            return null;
        }
        $n = \is_string($jwk['n'] ?? null) ? self::base64url($jwk['n']) : null;
        $e = \is_string($jwk['e'] ?? null) ? self::base64url($jwk['e']) : null;
        if (null === $n || null === $e || \strlen($n) < 256) {
            return null;
        }
        $rsa = self::der(0x30, self::integer($n).self::integer($e));
        // AlgorithmIdentifier: rsaEncryption (1.2.840.113549.1.1.1) with NULL parameters.
        $algorithm = hex2bin('300d06092a864886f70d0101010500');
        $spki = self::der(0x30, $algorithm.self::der(0x03, "\x00".$rsa));

        return "-----BEGIN PUBLIC KEY-----\n".chunk_split(base64_encode($spki), 64, "\n")."-----END PUBLIC KEY-----\n";
    }

    public static function base64url(string $text): ?string
    {
        if (1 !== preg_match('/^[A-Za-z0-9_-]*$/', $text)) {
            return null;
        }
        $bytes = base64_decode(strtr($text, '-_', '+/'), true);

        return false === $bytes ? null : $bytes;
    }

    private static function integer(string $bytes): string
    {
        $bytes = ltrim($bytes, "\x00");
        if ('' === $bytes || \ord($bytes[0]) > 0x7F) {
            $bytes = "\x00".$bytes;
        }

        return self::der(0x02, $bytes);
    }

    private static function der(int $tag, string $content): string
    {
        $length = \strlen($content);
        if ($length < 0x80) {
            return \chr($tag).\chr($length).$content;
        }
        $len = ltrim(pack('N', $length), "\x00");

        return \chr($tag).\chr(0x80 | \strlen($len)).$len.$content;
    }
}
