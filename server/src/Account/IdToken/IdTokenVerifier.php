<?php

namespace App\Account\IdToken;

use App\Account\SignInRefused;
use App\Account\SignInUnavailable;
use Psr\Clock\ClockInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * Checks an OpenID Connect ID token, the kind Apple and Google hand the game (SAVE-149, SAVE-150):
 * a JWT signed with RS256 by a key in the store's key set, from the store's issuer, for one of our
 * client ids, not expired, and carrying the SHA-256 of the nonce the game sends with it (D-SAVE-22).
 * Only RS256 is taken, whatever the token's header asks for.
 */
final class IdTokenVerifier
{
    public function __construct(
        private readonly KeySets $keySets,
        private readonly ClockInterface $clock,
        #[Autowire('%cloud.sign_in_leeway_seconds%')] private readonly int $leeway,
    ) {
    }

    /**
     * @param list<string> $issuers
     * @param list<string> $audiences
     *
     * @return array<string, mixed> the token's claims
     *
     * @throws SignInRefused     when the token fails any check
     * @throws SignInUnavailable when the key set cannot be fetched
     */
    public function verify(string $token, string $keysUrl, array $issuers, array $audiences, string $nonce): array
    {
        $parts = explode('.', $token);
        if (3 !== \count($parts) || \strlen($token) > 8192) {
            throw new SignInRefused('Not a JWT.');
        }
        [$h, $p, $s] = $parts;
        $header = self::json($h);
        $claims = self::json($p);
        $signature = KeySets::base64url($s);
        if (null === $header || null === $claims || null === $signature || '' === $signature) {
            throw new SignInRefused('The token cannot be read.');
        }
        if ('RS256' !== ($header['alg'] ?? null) || !\is_string($header['kid'] ?? null)) {
            throw new SignInRefused('The token is not signed with RS256.');
        }
        $pem = $this->keySets->key($keysUrl, $header['kid']);
        if (null === $pem || 1 !== openssl_verify("{$h}.{$p}", $signature, $pem, \OPENSSL_ALGO_SHA256)) {
            throw new SignInRefused('The signature does not match the store\'s keys.');
        }

        if (!\in_array($claims['iss'] ?? null, $issuers, true)) {
            throw new SignInRefused('The token comes from another issuer.');
        }
        $aud = $claims['aud'] ?? null;
        $aud = \is_string($aud) ? [$aud] : (\is_array($aud) ? $aud : []);
        if ([] === array_intersect($aud, $audiences)) {
            throw new SignInRefused('The token is for another app.');
        }
        $now = $this->clock->now()->getTimestamp();
        if (!\is_int($claims['exp'] ?? null) || $claims['exp'] + $this->leeway <= $now) {
            throw new SignInRefused('The token has expired.');
        }
        if (isset($claims['iat']) && (!\is_int($claims['iat']) || $claims['iat'] - $this->leeway > $now)) {
            throw new SignInRefused('The token was issued in the future.');
        }
        if (isset($claims['nbf']) && (!\is_int($claims['nbf']) || $claims['nbf'] - $this->leeway > $now)) {
            throw new SignInRefused('The token is not valid yet.');
        }
        if ('' === $nonce || !\is_string($claims['nonce'] ?? null) || !hash_equals(hash('sha256', $nonce), $claims['nonce'])) {
            throw new SignInRefused('The nonce does not match.');
        }
        $sub = $claims['sub'] ?? null;
        if (!\is_string($sub) || '' === $sub || \strlen($sub) > 191) {
            throw new SignInRefused('The token names no one.');
        }

        return $claims;
    }

    /** @return array<string, mixed>|null */
    private static function json(string $part): ?array
    {
        $bytes = KeySets::base64url($part);
        if (null === $bytes) {
            return null;
        }
        try {
            $data = json_decode($bytes, true, 8, \JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return null;
        }

        return \is_array($data) && !array_is_list($data) ? $data : null;
    }
}
