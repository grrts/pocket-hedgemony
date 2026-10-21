<?php

namespace App\Account;

use App\Entity\Identity;
use App\Purchases\Apple\AppleJws;
use Psr\Clock\ClockInterface;
use Psr\Log\LoggerInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Contracts\HttpClient\Exception\ExceptionInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * Apple's refresh token for a Sign in with Apple (SAVE-203, SAVE-204, D-SAVE-25): taken once, at sign-in,
 * from the authorization code Apple's sheet gives the game, so deleting the account (or removing the Apple
 * sign-in) can revoke it from any device, as Apple requires. Both calls carry a client secret, a short
 * ES256 token the server signs with its Sign in with Apple key (team id, key id and the `.p8` key, a path
 * from server/ or an absolute one). Without the key nothing is exchanged or revoked; neither call ever
 * stops a sign-in or a deletion.
 */
final class AppleTokens
{
    public const TOKEN = 'https://appleid.apple.com/auth/token';
    public const REVOKE = 'https://appleid.apple.com/auth/revoke';
    public const AUDIENCE = 'https://appleid.apple.com';

    public function __construct(
        private readonly HttpClientInterface $http,
        private readonly ClockInterface $clock,
        private readonly LoggerInterface $logger,
        #[Autowire('%env(APPLE_TEAM_ID)%')] private readonly string $teamId,
        #[Autowire('%env(APPLE_SIGN_IN_KEY_ID)%')] private readonly string $keyId,
        #[Autowire('%env(APPLE_SIGN_IN_KEY)%')] private readonly string $keyPath,
        #[Autowire('%env(APPLE_SIGN_IN_REDIRECT_URI)%')] private readonly string $redirectUri,
        #[Autowire('%env(APPLE_BUNDLE_ID)%')] private readonly string $bundleId,
        #[Autowire('%kernel.project_dir%')] private readonly string $projectDir,
    ) {
    }

    public function available(): bool
    {
        return '' !== $this->teamId && '' !== $this->keyId && null !== $this->key();
    }

    /**
     * Exchanges the authorization code for Apple's refresh token, or null when there is no key or Apple
     * says no. `$clientId` is the identity token's audience: the app's bundle id, or the website's
     * Services ID, which also names the address its sign-in came back to.
     */
    public function exchange(string $code, string $clientId): ?string
    {
        if (!$this->available()) {
            return null;
        }
        $body = ['client_id' => $clientId, 'client_secret' => $this->clientSecret($clientId), 'code' => $code, 'grant_type' => 'authorization_code'];
        // The website's sign-in names the address it came back to; the app's does not.
        if ('' !== $this->redirectUri && $clientId !== $this->bundleId) {
            $body['redirect_uri'] = $this->redirectUri;
        }
        try {
            $data = $this->http->request('POST', self::TOKEN, ['body' => $body])->toArray();
        } catch (ExceptionInterface $e) {
            $this->logger->warning('Apple did not exchange the authorization code: {why}', ['why' => $e->getMessage()]);

            return null;
        }

        return \is_string($data['refresh_token'] ?? null) ? $data['refresh_token'] : null;
    }

    /** Revokes the token kept with an Apple sign-in; false when there is none, no key, or Apple says no. */
    public function revoke(Identity $identity): bool
    {
        $token = $identity->getAppleRefreshToken();
        $clientId = $identity->getAppleClientId();
        if (null === $token || null === $clientId || !$this->available()) {
            return false;
        }
        try {
            $this->http->request('POST', self::REVOKE, ['body' => [
                'client_id' => $clientId,
                'client_secret' => $this->clientSecret($clientId),
                'token' => $token,
                'token_type_hint' => 'refresh_token',
            ]])->getContent();
        } catch (ExceptionInterface $e) {
            $this->logger->warning('Apple did not revoke the token: {why}', ['why' => $e->getMessage()]);

            return false;
        }

        return true;
    }

    /** The client secret Apple asks for: ES256 over the team, the client id and five minutes of life. */
    private function clientSecret(string $clientId): string
    {
        $now = $this->clock->now()->getTimestamp();
        $part = static fn (array $data) => self::b64((string) json_encode($data));
        $signing = $part(['alg' => 'ES256', 'kid' => $this->keyId]).'.'.$part(['iss' => $this->teamId, 'iat' => $now, 'exp' => $now + 300, 'aud' => self::AUDIENCE, 'sub' => $clientId]);
        openssl_sign($signing, $der, $this->key(), \OPENSSL_ALGO_SHA256);

        return $signing.'.'.self::b64(AppleJws::rawSignature($der));
    }

    private static function b64(string $bytes): string
    {
        return rtrim(strtr(base64_encode($bytes), '+/', '-_'), '=');
    }

    private function key(): ?\OpenSSLAsymmetricKey
    {
        if ('' === $this->keyPath) {
            return null;
        }
        $path = str_starts_with($this->keyPath, '/') ? $this->keyPath : $this->projectDir.'/'.$this->keyPath;
        $pem = is_file($path) ? file_get_contents($path) : false;

        return false === $pem ? null : (openssl_pkey_get_private($pem) ?: null);
    }
}
