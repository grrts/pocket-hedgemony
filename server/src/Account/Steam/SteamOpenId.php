<?php

namespace App\Account\Steam;

use App\Account\SignInRefused;
use App\Account\SignInUnavailable;
use App\Account\StoreIdentity;
use App\Entity\Identity;
use Psr\Clock\ClockInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Contracts\HttpClient\Exception\ExceptionInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * Steam sign-in in a browser (SAVE-151, SAVE-152): Steam's OpenID 2.0 provider. The game asks for
 * Steam's address, Steam sends the browser back to us, and we check Steam's answer with Steam
 * itself (`check_authentication`) before trusting the SteamID in it. The game's return addresses
 * are listed in SIGN_IN_RETURN_URLS; without any, Steam in the browser is off (SAVE-154).
 */
final class SteamOpenId
{
    public const LOGIN = 'https://steamcommunity.com/openid/login';
    public const NS = 'http://specs.openid.net/auth/2.0';
    private const SELECT = 'http://specs.openid.net/auth/2.0/identifier_select';
    private const CLAIMED = '#^https://steamcommunity\.com/openid/id/(\d{17})$#';
    /** What Steam must have signed for the answer to mean anything. */
    private const MUST_SIGN = ['op_endpoint', 'claimed_id', 'identity', 'return_to', 'response_nonce', 'assoc_handle'];

    /** @var list<string> */
    private readonly array $returns;

    public function __construct(
        private readonly HttpClientInterface $http,
        private readonly ClockInterface $clock,
        #[Autowire('%env(SIGN_IN_RETURN_URLS)%')] string $returns,
        #[Autowire('%kernel.secret%')] private readonly string $secret,
        #[Autowire('%cloud.sign_in_code_minutes%')] private readonly int $minutes,
    ) {
        $this->returns = array_values(array_filter(array_map('trim', explode(',', $returns)), static fn (string $s) => '' !== $s));
    }

    public function available(): bool
    {
        return [] !== $this->returns;
    }

    /** Whether the game may be sent back to this address: one on the list, query and fragment aside. */
    public function allows(string $return): bool
    {
        $bare = preg_replace('/[?#].*$/s', '', $return) ?? '';

        return '' !== $bare && \in_array($bare, $this->returns, true);
    }

    /** The return address, signed, to ride through Steam in our return_to (SAVE-152). */
    public function state(string $return): string
    {
        $data = rtrim(strtr(base64_encode($return), '+/', '-_'), '=');

        return $data.'.'.substr(hash_hmac('sha256', 'steam-openid|'.$data, $this->secret), 0, 32);
    }

    /** The return address a state carries, or null when it was not signed by us or is no longer allowed. */
    public function returnOf(string $state): ?string
    {
        $parts = explode('.', $state);
        if (2 !== \count($parts) || !hash_equals(substr(hash_hmac('sha256', 'steam-openid|'.$parts[0], $this->secret), 0, 32), $parts[1])) {
            return null;
        }
        $return = base64_decode(strtr($parts[0], '-_', '+/'), true);

        return \is_string($return) && $this->allows($return) ? $return : null;
    }

    /** Steam's sign-in page, coming back to $returnTo; $realm is our own origin. */
    public function loginUrl(string $returnTo, string $realm): string
    {
        return self::LOGIN.'?'.http_build_query([
            'openid.ns' => self::NS,
            'openid.mode' => 'checkid_setup',
            'openid.return_to' => $returnTo,
            'openid.realm' => $realm,
            'openid.identity' => self::SELECT,
            'openid.claimed_id' => self::SELECT,
        ]);
    }

    /**
     * Checks Steam's answer (the `openid.*` fields of the request to our return address) and
     * returns who Steam says the player is, and Steam's response nonce.
     *
     * @param array<string, string> $answer
     *
     * @return array{StoreIdentity, string}
     *
     * @throws SignInRefused     when the answer fails a check or Steam does not confirm it
     * @throws SignInUnavailable when Steam cannot be reached
     */
    public function verify(array $answer, string $returnTo): array
    {
        $get = static fn (string $k): string => (string) ($answer['openid.'.$k] ?? '');
        if (self::NS !== $get('ns') || 'id_res' !== $get('mode')) {
            throw new SignInRefused('Steam did not sign the player in.');
        }
        if (self::LOGIN !== $get('op_endpoint') || $returnTo !== $get('return_to')) {
            throw new SignInRefused('The answer names another endpoint or return address.');
        }
        if ($get('claimed_id') !== $get('identity') || 1 !== preg_match(self::CLAIMED, $get('claimed_id'), $m)) {
            throw new SignInRefused('The claimed id is not a Steam community id.');
        }
        $signed = explode(',', $get('signed'));
        if ([] !== array_diff(self::MUST_SIGN, $signed) || '' === $get('sig')) {
            throw new SignInRefused('Steam did not sign every field that matters.');
        }
        $nonce = $get('response_nonce');
        $at = 1 === preg_match('/^(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ)/', $nonce, $t) ? \DateTimeImmutable::createFromFormat('Y-m-d\TH:i:s\Z', $t[1], new \DateTimeZone('UTC')) : false;
        $age = false === $at ? null : $this->clock->now()->getTimestamp() - $at->getTimestamp();
        if (null === $age || $age > $this->minutes * 60 || $age < -60 || \strlen($nonce) > 191) {
            throw new SignInRefused('The response nonce is too old.');
        }

        $check = [];
        foreach ($answer as $k => $v) {
            if (str_starts_with($k, 'openid.')) {
                $check[$k] = $v;
            }
        }
        $check['openid.mode'] = 'check_authentication';
        try {
            $response = $this->http->request('POST', self::LOGIN, ['body' => $check, 'timeout' => 10]);
            $status = $response->getStatusCode();
            $body = $response->getContent(false);
        } catch (ExceptionInterface $e) {
            throw new SignInUnavailable('Steam could not be reached.', previous: $e);
        }
        if ($status >= 500) {
            throw new SignInUnavailable("Steam answered {$status}.");
        }
        // The answer is key-value form: one "key:value" per line.
        $fields = [];
        foreach (preg_split('/\r?\n/', $body) ?: [] as $line) {
            $pair = explode(':', $line, 2);
            if (2 === \count($pair)) {
                $fields[trim($pair[0])] = trim($pair[1]);
            }
        }
        if (200 !== $status || 'true' !== ($fields['is_valid'] ?? null)) {
            throw new SignInRefused('Steam did not confirm the answer.');
        }

        return [new StoreIdentity(Identity::STEAM, $m[1]), $nonce];
    }
}
