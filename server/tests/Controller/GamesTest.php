<?php

namespace App\Tests\Controller;

use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\Clock\Clock;
use Symfony\Component\Clock\MockClock;
use Symfony\Component\Clock\NativeClock;

/** The online game table: domain/multiplayer/features/online-games.feature (MP-020 … MP-051). */
final class GamesTest extends WebTestCase
{
    private KernelBrowser $client;
    private MockClock $clock;
    private string $leroy;
    private string $ana;

    protected function setUp(): void
    {
        $this->clock = new MockClock('2026-10-19 12:00:00');
        Clock::set($this->clock);
        $this->client = static::createClient();
        $em = static::getContainer()->get(EntityManagerInterface::class);
        $tool = new SchemaTool($em);
        $meta = $em->getMetadataFactory()->getAllMetadata();
        $tool->dropSchema($meta);
        $tool->createSchema($meta);
        static::getContainer()->get('cache.rate_limiter')->clear();
        $this->leroy = $this->signIn('76561198000000001', 'Phone');
        $this->ana = $this->signIn('76561198000000002', 'Laptop');
    }

    protected function tearDown(): void
    {
        Clock::set(new NativeClock());
        parent::tearDown();
    }

    private function signIn(string $steamId, string $device): string
    {
        $this->client->request('POST', '/api/sessions', server: ['CONTENT_TYPE' => 'application/json'], content: json_encode(['steamTicket' => 'a0'.$steamId, 'device' => ['name' => $device, 'platform' => 'steam']]));

        return json_decode($this->client->getResponse()->getContent(), true)['accessToken'];
    }

    private function call(string $method, string $url, string $token, mixed $body = null, array $headers = []): array
    {
        $this->client->request($method, $url, server: ['CONTENT_TYPE' => 'application/json', 'HTTP_AUTHORIZATION' => 'Bearer '.$token] + $headers, content: null === $body ? null : json_encode($body));

        return json_decode($this->client->getResponse()->getContent() ?: 'null', true) ?? [];
    }

    private function orders(int $nation, int $n = 1): array
    {
        return ['nation' => $nation, 'orders' => array_fill(0, $n, ['type' => 'move', 'army' => 3, 'to' => 120]), 'created' => [[]]];
    }

    /** Leroy hosts as Castile, Ana sits as Portugal, Leroy starts: the code. */
    private function started(): string
    {
        $code = $this->call('POST', '/api/games', $this->leroy, ['realm' => 'castile'])['game']['code'];
        $this->call('PUT', "/api/games/$code/seats/portugal", $this->ana);
        $this->call('POST', "/api/games/$code/start", $this->leroy);
        self::assertResponseIsSuccessful();

        return $code;
    }

    public function testOnlinePlayNeedsTheAccount(): void
    {
        $this->client->request('POST', '/api/games', server: ['CONTENT_TYPE' => 'application/json'], content: '{"realm":"castile"}');
        self::assertResponseStatusCodeSame(401);
    }

    public function testHostingMakesACodeAndSeatsTheHost(): void
    {
        $data = $this->call('POST', '/api/games', $this->leroy, ['realm' => 'castile']);
        self::assertResponseStatusCodeSame(201);
        self::assertMatchesRegularExpression('/^[A-HJ-NP-Z]{5}$/', $data['game']['code']);
        self::assertSame('castile', $data['game']['host']);
        self::assertFalse($data['game']['started']);
        self::assertIsInt($data['game']['seed']);
        self::assertCount(1, $data['seats']);
        self::assertSame(['realm' => 'castile', 'mine' => true], array_intersect_key($data['seats'][0], ['realm' => 1, 'mine' => 1]));
        self::assertNotSame('', $data['seats'][0]['player']);
    }

    public function testAGameIsFoundOnlyByItsCode(): void
    {
        $code = $this->call('POST', '/api/games', $this->leroy, ['realm' => 'castile'])['game']['code'];
        $data = $this->call('GET', "/api/games/$code", $this->ana);
        self::assertResponseIsSuccessful();
        self::assertSame($code, $data['game']['code']);
        self::assertFalse($data['seats'][0]['mine']);

        $this->call('GET', '/api/games/'.('AAAAA' === $code ? 'BBBBB' : 'AAAAA'), $this->ana);
        self::assertResponseStatusCodeSame(404);
        // No call lists other accounts' games: Ana's own list is empty.
        self::assertSame([], $this->call('GET', '/api/games', $this->ana)['games']);
    }

    public function testSeats(): void
    {
        $code = $this->call('POST', '/api/games', $this->leroy, ['realm' => 'castile'])['game']['code'];
        $data = $this->call('PUT', "/api/games/$code/seats/castile", $this->ana);
        self::assertResponseStatusCodeSame(409);
        self::assertSame('taken', $data['error']);

        $data = $this->call('PUT', "/api/games/$code/seats/portugal", $this->ana);
        self::assertResponseIsSuccessful();
        self::assertSame(['castile', 'portugal'], array_column($data['seats'], 'realm'));

        $data = $this->call('PUT', "/api/games/$code/seats/aragon", $this->ana);
        self::assertSame(['castile', 'aragon'], array_column($data['seats'], 'realm'), 'the seat moves; Portugal is free');
    }

    public function testTheHostLeavingEndsAGameThatHasNotStarted(): void
    {
        $code = $this->call('POST', '/api/games', $this->leroy, ['realm' => 'castile'])['game']['code'];
        $this->call('PUT', "/api/games/$code/seats/portugal", $this->ana);
        $this->call('DELETE', "/api/games/$code/seats/mine", $this->ana);
        self::assertResponseStatusCodeSame(204);
        self::assertCount(1, $this->call('GET', "/api/games/$code", $this->leroy)['seats']);

        $this->call('PUT', "/api/games/$code/seats/portugal", $this->ana);
        $this->call('DELETE', "/api/games/$code/seats/mine", $this->leroy);
        $this->call('GET', "/api/games/$code", $this->ana);
        self::assertResponseStatusCodeSame(404);
    }

    public function testOnlyTheHostStartsWithTwoOrMoreRealms(): void
    {
        $code = $this->call('POST', '/api/games', $this->leroy, ['realm' => 'castile'])['game']['code'];
        self::assertSame('too_few', $this->call('POST', "/api/games/$code/start", $this->leroy)['error']);
        $this->call('PUT', "/api/games/$code/seats/portugal", $this->ana);
        self::assertSame('not_host', $this->call('POST', "/api/games/$code/start", $this->ana)['error']);
        self::assertResponseStatusCodeSame(403);

        $data = $this->call('POST', "/api/games/$code/start", $this->leroy);
        self::assertTrue($data['game']['started']);
        self::assertSame(['castile', 'portugal'], $data['game']['humans']);

        $third = $this->signIn('76561198000000003', 'Tablet');
        self::assertSame('started', $this->call('PUT', "/api/games/$code/seats/aragon", $third)['error']);
    }

    public function testAGameHoldsAtMostEightSeats(): void
    {
        $code = $this->call('POST', '/api/games', $this->leroy, ['realm' => 'r0'])['game']['code'];
        for ($i = 1; $i <= 8; ++$i) {
            $token = $this->signIn('7656119800000010'.$i, "Device $i");
            $this->call('PUT', "/api/games/$code/seats/r$i", $token);
            self::assertResponseStatusCodeSame($i < 8 ? 200 : 409);
        }
    }

    public function testAWeeksOrdersAreKeptOnce(): void
    {
        $code = $this->started();
        $send = fn (string $token, string $realm, int $week, array $orders, string $hash = 'ab12cd34') => $this->call('PUT', "/api/games/$code/weeks/$week", $token, ['realm' => $realm, 'orders' => $orders, 'hash' => $hash]);

        $send($this->ana, 'portugal', 0, $this->orders(2));
        self::assertResponseStatusCodeSame(201);
        $send($this->ana, 'portugal', 0, $this->orders(2));
        self::assertResponseStatusCodeSame(200, 'the same orders again change nothing');
        self::assertSame('already_sent', $send($this->ana, 'portugal', 0, $this->orders(2, 3))['error']);
        self::assertSame('not_this_week', $send($this->ana, 'portugal', 1, $this->orders(2))['error'], 'Leroy has not sent week 0');

        $send($this->leroy, 'castile', 0, $this->orders(1));
        self::assertResponseStatusCodeSame(201);
        $send($this->ana, 'portugal', 1, $this->orders(2));
        self::assertResponseStatusCodeSame(201);

        $weeks = $this->call('GET', "/api/games/$code", $this->leroy)['weeks'];
        self::assertSame([[0, 'castile'], [0, 'portugal'], [1, 'portugal']], array_map(fn ($w) => [$w['week'], $w['realm']], $weeks));
        self::assertSame($this->orders(2), $weeks[1]['orders']);
        self::assertCount(1, $this->call('GET', "/api/games/$code?since=1", $this->leroy)['weeks']);
    }

    public function testNobodySendsAnotherRealmsOrders(): void
    {
        $code = $this->started();
        $data = $this->call('PUT', "/api/games/$code/weeks/0", $this->ana, ['realm' => 'castile', 'orders' => $this->orders(1), 'hash' => 'ab12cd34']);
        self::assertResponseStatusCodeSame(403);
        self::assertSame('not_your_realm', $data['error']);
    }

    public function testOrdersWaitForTheStart(): void
    {
        $code = $this->call('POST', '/api/games', $this->leroy, ['realm' => 'castile'])['game']['code'];
        $data = $this->call('PUT', "/api/games/$code/weeks/0", $this->leroy, ['realm' => 'castile', 'orders' => $this->orders(1), 'hash' => '']);
        self::assertSame('not_started', $data['error']);
    }

    public function testOrdersFromOutsideTheGameAreNotShown(): void
    {
        $code = $this->started();
        $this->call('PUT', "/api/games/$code/weeks/0", $this->ana, ['realm' => 'portugal', 'orders' => $this->orders(2), 'hash' => 'ab12cd34']);
        $third = $this->signIn('76561198000000003', 'Tablet');
        $data = $this->call('GET', "/api/games/$code", $third);
        self::assertCount(2, $data['seats']);
        self::assertSame([], $data['weeks']);
    }

    public function testDevicesThatDisagreeAreFoundOut(): void
    {
        $code = $this->started();
        $this->call('PUT', "/api/games/$code/weeks/0", $this->leroy, ['realm' => 'castile', 'orders' => $this->orders(1), 'hash' => 'aaaa0000']);
        self::assertNull($this->call('GET', "/api/games/$code", $this->ana)['game']['outOfStep']);
        $data = $this->call('PUT', "/api/games/$code/weeks/0", $this->ana, ['realm' => 'portugal', 'orders' => $this->orders(2), 'hash' => 'bbbb1111']);
        self::assertSame(0, $data['game']['outOfStep']);
    }

    public function testAskingAgainCostsNothingWhenNothingChanged(): void
    {
        $code = $this->started();
        $this->call('GET', "/api/games/$code", $this->ana);
        $etag = $this->client->getResponse()->headers->get('ETag');
        self::assertNotNull($etag);
        $this->call('GET', "/api/games/$code", $this->ana, headers: ['HTTP_IF_NONE_MATCH' => $etag]);
        self::assertResponseStatusCodeSame(304);

        $this->call('PUT', "/api/games/$code/weeks/0", $this->leroy, ['realm' => 'castile', 'orders' => $this->orders(1), 'hash' => 'ab12cd34']);
        $data = $this->call('GET', "/api/games/$code", $this->ana, headers: ['HTTP_IF_NONE_MATCH' => $etag]);
        self::assertResponseIsSuccessful();
        self::assertCount(1, $data['weeks']);
    }

    public function testYourGames(): void
    {
        $one = $this->started();
        $this->clock->sleep(60);
        $two = $this->call('POST', '/api/games', $this->leroy, ['realm' => 'france'])['game']['code'];
        $this->call('PUT', "/api/games/$two/seats/burgundy", $this->ana);
        $this->clock->sleep(60);
        $this->call('PUT', "/api/games/$one/weeks/0", $this->leroy, ['realm' => 'castile', 'orders' => $this->orders(1), 'hash' => 'ab12cd34']);

        $games = $this->call('GET', '/api/games', $this->ana)['games'];
        self::assertSame([$one, $two], array_column($games, 'code'), 'newest activity first');
        self::assertSame(['realm' => 'portugal', 'started' => true, 'week' => 0, 'waitingOn' => ['portugal'], 'yourMove' => true], array_diff_key($games[0], ['code' => 1]));
        self::assertSame(['realm' => 'burgundy', 'started' => false, 'week' => null, 'waitingOn' => [], 'yourMove' => false], array_diff_key($games[1], ['code' => 1]));

        $mine = $this->call('GET', '/api/games', $this->leroy)['games'];
        self::assertFalse($mine[0]['yourMove']);
    }

    public function testLeavingAStartedGameHidesItUntilTheCodeIsTypedAgain(): void
    {
        $code = $this->started();
        $this->call('DELETE', "/api/games/$code/seats/mine", $this->ana);
        self::assertSame([], $this->call('GET', '/api/games', $this->ana)['games']);
        self::assertSame(['castile', 'portugal'], $this->call('GET', "/api/games/$code", $this->leroy)['game']['humans'], 'the realm stays in the game');

        $this->call('PUT', "/api/games/$code/seats/portugal", $this->ana);
        self::assertResponseIsSuccessful();
        self::assertSame([$code], array_column($this->call('GET', '/api/games', $this->ana)['games'], 'code'));
    }

    public function testWritesAreLimited(): void
    {
        $code = $this->call('POST', '/api/games', $this->leroy, ['realm' => 'castile'])['game']['code'];
        for ($i = 0; $i < 300; ++$i) {
            $this->call('PUT', "/api/games/$code/seats/r".($i % 2), $this->leroy);
        }
        $data = $this->call('PUT', "/api/games/$code/seats/castile", $this->leroy);
        self::assertResponseStatusCodeSame(429);
        self::assertSame('rate_limited', $data['error']);
    }

    public function testOrdersTooLargeAreRefused(): void
    {
        $code = $this->started();
        $this->call('PUT', "/api/games/$code/weeks/0", $this->ana, ['realm' => 'portugal', 'orders' => $this->orders(2, 8000), 'hash' => 'ab12cd34']);
        self::assertResponseStatusCodeSame(413);
    }
}
