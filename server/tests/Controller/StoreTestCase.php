<?php

namespace App\Tests\Controller;

use App\Entity\Entitlement;
use App\Tests\StoreKeys;
use App\Tests\StoresMock;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\Clock\Clock;
use Symfony\Component\Clock\MockClock;

/** What the purchase tests share: a fresh database, the stores' mocks, and signing players in. */
abstract class StoreTestCase extends WebTestCase
{
    protected const STEAM_ID = '76561198000000001';

    protected KernelBrowser $client;
    protected EntityManagerInterface $em;
    protected MockClock $clock;

    protected function setUp(): void
    {
        $this->clock = new MockClock('2026-10-19 12:00:00');
        Clock::set($this->clock);
        StoresMock::reset();
        StoreKeys::install(\dirname(__DIR__, 2));
        $this->boot();
        $tool = new SchemaTool($this->em);
        $meta = $this->em->getMetadataFactory()->getAllMetadata();
        $tool->dropSchema($meta);
        $tool->createSchema($meta);
        static::getContainer()->get('cache.rate_limiter')->clear();
    }

    protected function tearDown(): void
    {
        Clock::set(new \Symfony\Component\Clock\NativeClock());
        parent::tearDown();
    }

    protected function boot(): void
    {
        self::ensureKernelShutdown();
        $this->client = static::createClient();
        $this->em = static::getContainer()->get(EntityManagerInterface::class);
    }

    /** @return array<string, mixed> */
    protected function call(string $method, string $url, ?array $body = null, ?string $token = null): array
    {
        $server = ['CONTENT_TYPE' => 'application/json'] + ($token ? ['HTTP_AUTHORIZATION' => 'Bearer '.$token] : []);
        $this->client->request($method, $url, server: $server, content: null === $body ? null : json_encode($body));

        return json_decode($this->client->getResponse()->getContent() ?: 'null', true) ?? [];
    }

    /** Signs in with Steam; returns the access token and the account id. */
    protected function steamPlayer(string $steamId = self::STEAM_ID): array
    {
        $r = $this->call('POST', '/api/sessions', ['steamTicket' => 'a0'.$steamId, 'displayName' => 'Bertrand', 'device' => ['name' => 'Steam Deck', 'platform' => 'steam']]);

        return [$r['accessToken'], $r['account']['id']];
    }

    /** Makes an email account and signs it in on a phone; returns the access token and the account id. */
    protected function phonePlayer(string $email = 'player@example.org', string $platform = 'ios'): array
    {
        $this->call('POST', '/api/accounts', ['email' => $email, 'displayName' => 'Player', 'password' => 'correct horse']);
        $r = $this->call('POST', '/api/sessions', ['email' => $email, 'password' => 'correct horse', 'device' => ['name' => 'Phone', 'platform' => $platform]]);

        return [$r['accessToken'], $r['account']['id']];
    }

    /** The account's entitlement row on a store, as the database holds it. */
    protected function row(string $accountId, string $store): ?Entitlement
    {
        $this->em->clear();

        return $this->em->getRepository(Entitlement::class)->findOneBy(['account' => $accountId, 'store' => $store]);
    }
}
