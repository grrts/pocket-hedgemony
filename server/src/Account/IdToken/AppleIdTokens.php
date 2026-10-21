<?php

namespace App\Account\IdToken;

use App\Account\SignInRefused;
use App\Account\SignInUnavailable;
use App\Account\StoreIdentity;
use App\Entity\Identity;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * Sign in with Apple (SAVE-149): the identity token Apple's sheet gives the game, checked against
 * Apple's keys for our client ids: the app's bundle id and the website's Services ID, comma
 * separated in APPLE_CLIENT_IDS. Without any, Sign in with Apple is off (SAVE-154).
 */
final class AppleIdTokens
{
    public const KEYS = 'https://appleid.apple.com/auth/keys';
    public const ISSUER = 'https://appleid.apple.com';

    /** @var list<string> */
    private readonly array $clientIds;

    public function __construct(
        private readonly IdTokenVerifier $verifier,
        #[Autowire('%env(APPLE_CLIENT_IDS)%')] string $clientIds,
    ) {
        $this->clientIds = self::list($clientIds);
    }

    /**
     * @throws SignInUnavailable when no client id is configured or Apple's keys cannot be fetched
     * @throws SignInRefused     when the token fails a check
     */
    public function verify(string $token, string $nonce): StoreIdentity
    {
        if ([] === $this->clientIds) {
            throw new SignInUnavailable('No Apple client id is configured.');
        }
        $claims = $this->verifier->verify($token, self::KEYS, [self::ISSUER], $this->clientIds, $nonce);

        // Apple puts no name in the token; the game passes the one Apple gives it on the first sign-in.
        return new StoreIdentity(Identity::APPLE, $claims['sub']);
    }

    /** @return list<string> */
    public static function list(string $csv): array
    {
        return array_values(array_filter(array_map('trim', explode(',', $csv)), static fn (string $s) => '' !== $s));
    }
}
