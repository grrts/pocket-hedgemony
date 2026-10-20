<?php

namespace App\Account\IdToken;

use App\Account\SignInRefused;
use App\Account\SignInUnavailable;
use App\Account\StoreIdentity;
use App\Entity\Identity;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * Google sign-in (SAVE-150): the ID token from Android's Credential Manager or Google's web sign-in,
 * checked against Google's keys for our client ids, comma separated in GOOGLE_CLIENT_IDS (the web
 * OAuth client, which the Android app names as its server client, so its tokens carry it too).
 * Without any, Google sign-in is off (SAVE-154).
 */
final class GoogleIdTokens
{
    public const KEYS = 'https://www.googleapis.com/oauth2/v3/certs';
    public const ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];

    /** @var list<string> */
    private readonly array $clientIds;

    public function __construct(
        private readonly IdTokenVerifier $verifier,
        #[Autowire('%env(GOOGLE_CLIENT_IDS)%')] string $clientIds,
    ) {
        $this->clientIds = AppleIdTokens::list($clientIds);
    }

    /**
     * @throws SignInUnavailable when no client id is configured or Google's keys cannot be fetched
     * @throws SignInRefused     when the token fails a check
     */
    public function verify(string $token, string $nonce): StoreIdentity
    {
        if ([] === $this->clientIds) {
            throw new SignInUnavailable('No Google client id is configured.');
        }
        $claims = $this->verifier->verify($token, self::KEYS, self::ISSUERS, $this->clientIds, $nonce);

        return new StoreIdentity(Identity::GOOGLE, $claims['sub'], \is_string($claims['name'] ?? null) ? $claims['name'] : null);
    }
}
