<?php

namespace App\Tests;

use App\Account\Steam\SteamRefused;
use App\Account\Steam\SteamUnavailable;
use App\Account\Steam\SteamWebApi;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpClient\MockHttpClient;
use Symfony\Component\HttpClient\Response\MockResponse;

final class SteamWebApiTest extends TestCase
{
    public function testWithoutAKeySteamSignInIsOff(): void
    {
        $api = new SteamWebApi(new MockHttpClient(new SteamMock()), '', '480', 'pockethegemony');
        $this->expectException(SteamUnavailable::class);
        $api->steamIdFor('a076561198000000001');
    }

    public function testReadsTheSteamIdFromSteamsAnswer(): void
    {
        $api = new SteamWebApi(new MockHttpClient(new SteamMock()), 'test-key', '480', 'pockethegemony');
        self::assertSame('76561198000000001', $api->steamIdFor('a076561198000000001'));
    }

    public function testRefusesWhatSteamRefuses(): void
    {
        $api = new SteamWebApi(new MockHttpClient(new SteamMock()), 'test-key', '480', 'pockethegemony');
        $this->expectException(SteamRefused::class);
        $api->steamIdFor('bad0');
    }

    public function testASteamOutageIsNotARefusal(): void
    {
        $api = new SteamWebApi(new MockHttpClient(new MockResponse('', ['http_code' => 503])), 'test-key', '480', 'pockethegemony');
        $this->expectException(SteamUnavailable::class);
        $api->steamIdFor('a076561198000000001');
    }
}
