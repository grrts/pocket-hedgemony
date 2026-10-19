<?php

namespace App\Tests\Controller;

use App\Entity\MetricEvent;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

final class ApiTest extends WebTestCase
{
    private KernelBrowser $client;
    private EntityManagerInterface $em;

    protected function setUp(): void
    {
        $this->client = static::createClient();
        $this->em = static::getContainer()->get(EntityManagerInterface::class);
        $tool = new SchemaTool($this->em);
        $meta = $this->em->getMetadataFactory()->getAllMetadata();
        $tool->dropSchema($meta);
        $tool->createSchema($meta);
    }

    private function postJson(string $url, array $body, array $server = []): array
    {
        $this->client->request('POST', $url, server: ['CONTENT_TYPE' => 'application/json'] + $server, content: json_encode($body));

        return json_decode($this->client->getResponse()->getContent(), true) ?? [];
    }

    public function testRegistersAnAccountOnce(): void
    {
        $body = ['email' => 'Player@Example.com', 'displayName' => 'Player', 'password' => 'correct horse'];
        $data = $this->postJson('/api/accounts', $body);
        self::assertResponseStatusCodeSame(201);
        self::assertSame('player@example.com', $data['email']);

        $data = $this->postJson('/api/accounts', $body);
        self::assertResponseStatusCodeSame(409);
        self::assertSame('email_taken', $data['error']);
    }

    public function testRejectsInvalidRegistration(): void
    {
        $data = $this->postJson('/api/accounts', ['email' => 'nope', 'displayName' => 'P', 'password' => 'short']);
        self::assertResponseStatusCodeSame(422);
        self::assertEqualsCanonicalizing(
            ['[email]', '[displayName]', '[password]'],
            array_column($data['details'], 'field'),
        );
    }

    public function testStoresMetricEvents(): void
    {
        $data = $this->postJson('/api/metrics', [
            'installId' => 'install-1',
            'runtime' => 'capacitor-android',
            'events' => [
                ['name' => 'campaign_started', 'occurredAt' => '2026-10-15T20:00:00+00:00', 'properties' => ['nation' => 'FRA']],
                ['name' => 'ad_shown', 'occurredAt' => '2026-10-15T20:00:01+00:00'],
            ],
        ]);
        self::assertResponseStatusCodeSame(202);
        self::assertSame(2, $data['accepted']);

        $events = $this->em->getRepository(MetricEvent::class)->findBy([], ['name' => 'ASC']);
        self::assertSame(['ad_shown', 'campaign_started'], array_map(fn (MetricEvent $e) => $e->getName(), $events));
        self::assertSame(['nation' => 'FRA'], $events[1]->getProperties());
    }

    public function testRejectsBadEventNames(): void
    {
        $this->postJson('/api/metrics', [
            'installId' => 'install-1',
            'runtime' => 'web',
            'events' => [['name' => 'DROP TABLE', 'occurredAt' => '2026-10-15T20:00:00+00:00']],
        ]);
        self::assertResponseStatusCodeSame(422);
    }

    public function testAnswersCorsForGameOrigins(): void
    {
        $this->client->request('OPTIONS', '/api/metrics', server: ['HTTP_ORIGIN' => 'capacitor://localhost']);
        self::assertResponseStatusCodeSame(204);
        self::assertResponseHeaderSame('Access-Control-Allow-Origin', 'capacitor://localhost');

        $this->client->request('GET', '/api/health', server: ['HTTP_ORIGIN' => 'https://evil.example']);
        self::assertResponseIsSuccessful();
        self::assertFalse($this->client->getResponse()->headers->has('Access-Control-Allow-Origin'));
    }
}
