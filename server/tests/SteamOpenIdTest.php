<?php

namespace App\Tests;

use App\Account\SignInRefused;
use App\Account\SignInUnavailable;
use App\Account\Steam\SteamOpenId;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Clock\MockClock;
use Symfony\Component\HttpClient\MockHttpClient;
use Symfony\Component\HttpClient\Response\MockResponse;

/** Steam's OpenID 2.0 sign-in in the browser (SAVE-151, SAVE-152, SAVE-154), with mocked HTTP. */
final class SteamOpenIdTest extends TestCase
{
    private const RETURN_TO = 'https://api.test/auth/steam/return?state=abc';

    private MockClock $clock;

    protected function setUp(): void
    {
        $this->clock = new MockClock('2026-10-20 12:00:00');
    }

    private function openId(string $returns = 'pockethegemony://auth/steam,https://play.test/', ?MockHttpClient $http = null): SteamOpenId
    {
        return new SteamOpenId($http ?? new MockHttpClient(new StoreMock()), $this->clock, $returns, 'secret', 5);
    }

    /** Steam's answer as it comes back to the return address. */
    public static function answer(string $returnTo, string $steamId = '76561198000000003', string $nonceAt = '2026-10-20T11:59:00Z', array $over = []): array
    {
        return $over + [
            'openid.ns' => SteamOpenId::NS,
            'openid.mode' => 'id_res',
            'openid.op_endpoint' => SteamOpenId::LOGIN,
            'openid.claimed_id' => 'https://steamcommunity.com/openid/id/'.$steamId,
            'openid.identity' => 'https://steamcommunity.com/openid/id/'.$steamId,
            'openid.return_to' => $returnTo,
            'openid.response_nonce' => $nonceAt.'Xy3kPq',
            'openid.assoc_handle' => '1234567890',
            'openid.signed' => 'signed,op_endpoint,claimed_id,identity,return_to,response_nonce,assoc_handle',
            'openid.sig' => 'good-sig',
        ];
    }

    public function testTheLoginAddressAsksSteamToPickTheAccount(): void
    {
        parse_str((string) parse_url($this->openId()->loginUrl(self::RETURN_TO, 'https://api.test/'), \PHP_URL_QUERY), $q);
        self::assertSame('checkid_setup', $q['openid_mode']);
        self::assertSame(self::RETURN_TO, $q['openid_return_to']);
        self::assertSame('https://api.test/', $q['openid_realm']);
        self::assertSame('http://specs.openid.net/auth/2.0/identifier_select', $q['openid_claimed_id']);
    }

    public function testReadsTheSteamIdOnceSteamConfirmsIt(): void
    {
        [$who, $nonce] = $this->openId()->verify(self::answer(self::RETURN_TO), self::RETURN_TO);
        self::assertSame(['steam', '76561198000000003'], [$who->provider, $who->subject]);
        self::assertSame('2026-10-20T11:59:00ZXy3kPq', $nonce);
    }

    /** @return iterable<string, array{array<string, string>}> */
    public static function badAnswers(): iterable
    {
        yield 'not confirmed by Steam' => [['openid.sig' => 'forged']];
        yield 'another return address' => [['openid.return_to' => 'https://evil.test/auth/steam/return?state=abc']];
        yield 'another endpoint' => [['openid.op_endpoint' => 'https://evil.test/openid/login']];
        yield 'not a Steam community id' => [['openid.claimed_id' => 'https://evil.test/openid/id/76561198000000003', 'openid.identity' => 'https://evil.test/openid/id/76561198000000003']];
        yield 'claimed id and identity differ' => [['openid.identity' => 'https://steamcommunity.com/openid/id/76561198000000004']];
        yield 'the return address not signed' => [['openid.signed' => 'signed,op_endpoint,claimed_id,identity,response_nonce,assoc_handle']];
        yield 'cancelled' => [['openid.mode' => 'cancel']];
        yield 'a nonce older than 5 minutes' => [['openid.response_nonce' => '2026-10-20T11:54:00Zabc']];
        yield 'a nonce with no time' => [['openid.response_nonce' => 'abc']];
    }

    /** @param array<string, string> $over */
    #[DataProvider('badAnswers')]
    public function testRefusesAnAnswer(array $over): void
    {
        $this->expectException(SignInRefused::class);
        $this->openId()->verify(self::answer(self::RETURN_TO, over: $over), self::RETURN_TO);
    }

    public function testSteamOutOfReachIsNotARefusal(): void
    {
        $openId = $this->openId(http: new MockHttpClient(new MockResponse('', ['http_code' => 502])));
        $this->expectException(SignInUnavailable::class);
        $openId->verify(self::answer(self::RETURN_TO), self::RETURN_TO);
    }

    public function testOnlyTheGamesReturnAddresses(): void
    {
        $openId = $this->openId();
        self::assertTrue($openId->available());
        self::assertTrue($openId->allows('pockethegemony://auth/steam'));
        self::assertTrue($openId->allows('https://play.test/?shared=abc'));
        self::assertFalse($openId->allows('https://play.test.evil/'));
        self::assertFalse($openId->allows('https://evil.test/'));
        self::assertFalse($this->openId('')->available());
    }

    public function testTheStateCarriesTheReturnAddressSigned(): void
    {
        $openId = $this->openId();
        $state = $openId->state('https://play.test/');
        self::assertSame('https://play.test/', $openId->returnOf($state));
        [$data] = explode('.', $openId->state('https://evil.test/'));
        self::assertNull($openId->returnOf($data.'.'.explode('.', $state)[1]));
        self::assertNull($openId->returnOf('nonsense'));
        // A state signed for an address that is no longer listed leads nowhere.
        self::assertNull($this->openId('pockethegemony://auth/steam')->returnOf($state));
    }
}
