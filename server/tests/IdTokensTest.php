<?php

namespace App\Tests;

use App\Account\IdToken\AppleIdTokens;
use App\Account\IdToken\GoogleIdTokens;
use App\Account\IdToken\IdTokenVerifier;
use App\Account\IdToken\KeySets;
use App\Account\SignInRefused;
use App\Account\SignInUnavailable;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Cache\Adapter\ArrayAdapter;
use Symfony\Component\Clock\MockClock;
use Symfony\Component\HttpClient\MockHttpClient;
use Symfony\Component\HttpClient\Response\MockResponse;

/** Apple's and Google's ID tokens (SAVE-149, SAVE-150, SAVE-154), with local keys and mocked HTTP. */
final class IdTokensTest extends TestCase
{
    private const NONCE = 'raw-nonce-0123456789';

    private MockClock $clock;
    private int $now;
    /** @var list<string> */
    private array $fetched = [];

    protected function setUp(): void
    {
        $this->clock = new MockClock('2026-10-20 12:00:00');
        $this->now = $this->clock->now()->getTimestamp();
        $this->fetched = [];
    }

    private function http(?callable $answer = null): MockHttpClient
    {
        return new MockHttpClient(function (string $method, string $url, array $options) use ($answer) {
            $this->fetched[] = $url;

            return $answer ? $answer($method, $url, $options) : (new StoreMock())($method, $url, $options);
        });
    }

    private function apple(string $clientIds = 'com.pockethegemony.app,com.pockethegemony.web', ?MockHttpClient $http = null): AppleIdTokens
    {
        return new AppleIdTokens(new IdTokenVerifier(new KeySets($http ?? $this->http(), new ArrayAdapter(), $this->clock), $this->clock, 60), $clientIds);
    }

    private function google(string $clientIds = 'test-web.apps.googleusercontent.com'): GoogleIdTokens
    {
        return new GoogleIdTokens(new IdTokenVerifier(new KeySets($this->http(), new ArrayAdapter(), $this->clock), $this->clock, 60), $clientIds);
    }

    public function testAcceptsAnAppleTokenForTheAppOrTheWebsite(): void
    {
        $apple = $this->apple();
        $who = $apple->verify(TestKeys::token(TestKeys::apple('001234.abcd', self::NONCE, $this->now), 'apple-1'), self::NONCE);
        self::assertSame(['apple', '001234.abcd', null], [$who->provider, $who->subject, $who->name]);
        $web = TestKeys::token(TestKeys::apple('001234.abcd', self::NONCE, $this->now, ['aud' => 'com.pockethegemony.web']), 'apple-1');
        self::assertSame('001234.abcd', $apple->verify($web, self::NONCE)->subject);
        self::assertSame([AppleIdTokens::KEYS], $this->fetched, 'the key set is fetched once and kept');
    }

    public function testAcceptsAGoogleTokenWithItsName(): void
    {
        $who = $this->google()->verify(TestKeys::token(TestKeys::google('1098765', self::NONCE, $this->now), 'google-1'), self::NONCE);
        self::assertSame(['google', '1098765', 'Bertrand'], [$who->provider, $who->subject, $who->name]);
        $bare = TestKeys::token(TestKeys::google('1098765', self::NONCE, $this->now, ['iss' => 'accounts.google.com']), 'google-1');
        self::assertSame('1098765', $this->google()->verify($bare, self::NONCE)->subject);
    }

    /** @return iterable<string, array{array<string, mixed>, string, string}> */
    public static function badApple(): iterable
    {
        yield 'a key not in the set' => [[], 'stranger', 'RS256'];
        yield 'another issuer' => [['iss' => 'https://accounts.google.com'], 'apple-1', 'RS256'];
        yield 'another app' => [['aud' => 'com.someone.else'], 'apple-1', 'RS256'];
        yield 'expired 2 minutes ago' => [['exp' => -120], 'apple-1', 'RS256'];
        yield 'another nonce' => [['nonce' => hash('sha256', 'another')], 'apple-1', 'RS256'];
        yield 'the raw nonce instead of its hash' => [['nonce' => self::NONCE], 'apple-1', 'RS256'];
        yield 'issued in the future' => [['iat' => 600], 'apple-1', 'RS256'];
        yield 'no sub' => [['sub' => ''], 'apple-1', 'RS256'];
        yield 'signed with none' => [[], 'apple-1', 'none'];
        yield 'signed with HS256' => [[], 'apple-1', 'HS256'];
    }

    /** @param array<string, mixed> $over relative times are added to now */
    #[DataProvider('badApple')]
    public function testRefusesAnAppleToken(array $over, string $kid, string $alg): void
    {
        foreach (['exp', 'iat'] as $t) {
            if (isset($over[$t])) {
                $over[$t] += $this->now;
            }
        }
        $this->expectException(SignInRefused::class);
        $this->apple()->verify(TestKeys::token(TestKeys::apple('001234.abcd', self::NONCE, $this->now, $over), $kid, $alg), self::NONCE);
    }

    public function testRefusesATamperedToken(): void
    {
        $token = TestKeys::token(TestKeys::apple('001234.abcd', self::NONCE, $this->now), 'apple-1');
        [$h, , $s] = explode('.', $token);
        $other = TestKeys::b64(json_encode(TestKeys::apple('009999.evil', self::NONCE, $this->now)));
        $this->expectException(SignInRefused::class);
        $this->apple()->verify("{$h}.{$other}.{$s}", self::NONCE);
    }

    public function testRefusesAGoogleTokenForAnotherApp(): void
    {
        $this->expectException(SignInRefused::class);
        $this->google()->verify(TestKeys::token(TestKeys::google('1098765', self::NONCE, $this->now, ['aud' => 'someone-else.apps.googleusercontent.com']), 'google-1'), self::NONCE);
    }

    public function testClocksAMinuteApartAreFine(): void
    {
        $token = TestKeys::token(TestKeys::apple('001234.abcd', self::NONCE, $this->now, ['exp' => $this->now - 30]), 'apple-1');
        self::assertSame('001234.abcd', $this->apple()->verify($token, self::NONCE)->subject);
    }

    public function testAnUnknownKeyFetchesTheSetAgainAtMostEveryFiveMinutes(): void
    {
        $apple = $this->apple();
        $good = fn () => TestKeys::token(TestKeys::apple('001234.abcd', self::NONCE, $this->clock->now()->getTimestamp()), 'apple-1');
        $stranger = fn () => TestKeys::token(TestKeys::apple('001234.abcd', self::NONCE, $this->clock->now()->getTimestamp()), 'stranger');
        $apple->verify($good(), self::NONCE);
        for ($i = 0; $i < 3; ++$i) {
            try {
                $apple->verify($stranger(), self::NONCE);
            } catch (SignInRefused) {
            }
        }
        self::assertCount(1, $this->fetched);
        $this->clock->sleep(301);
        try {
            $apple->verify($stranger(), self::NONCE);
        } catch (SignInRefused) {
        }
        self::assertCount(2, $this->fetched);
    }

    public function testWithoutAClientIdAppleSignInIsOff(): void
    {
        $this->expectException(SignInUnavailable::class);
        $this->apple(' , ')->verify(TestKeys::token(TestKeys::apple('001234.abcd', self::NONCE, $this->now), 'apple-1'), self::NONCE);
    }

    public function testWithoutAClientIdGoogleSignInIsOff(): void
    {
        $this->expectException(SignInUnavailable::class);
        $this->google('')->verify(TestKeys::token(TestKeys::google('1098765', self::NONCE, $this->now), 'google-1'), self::NONCE);
    }

    public function testAppleKeysOutOfReachAreNotARefusal(): void
    {
        $apple = $this->apple(http: $this->http(fn () => new MockResponse('', ['http_code' => 503])));
        $this->expectException(SignInUnavailable::class);
        $apple->verify(TestKeys::token(TestKeys::apple('001234.abcd', self::NONCE, $this->now), 'apple-1'), self::NONCE);
    }

    public function testAJwkBecomesTheSamePublicKey(): void
    {
        $jwk = TestKeys::jwks('apple-1')['keys'][0];
        $expected = openssl_pkey_get_details(TestKeys::private('apple-1'))['key'];
        self::assertSame($expected, KeySets::pem($jwk));
        self::assertNull(KeySets::pem(['kty' => 'EC'] + $jwk));
        self::assertNull(KeySets::pem(['alg' => 'RS512'] + $jwk));
    }
}
