<?php

namespace App\Tests\Controller;

use App\Tests\SaveBuilder;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Symfony\Bundle\FrameworkBundle\Console\Application;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\Clock\Clock;
use Symfony\Component\Clock\MockClock;
use Symfony\Component\Clock\NativeClock;
use Symfony\Component\Console\Tester\CommandTester;
use Symfony\Component\Filesystem\Filesystem;

/** Cloud saves on the server: domain/saves/features/cloud-sync.feature (SAVE-061 … SAVE-070). */
final class SavesTest extends WebTestCase
{
    private KernelBrowser $client;
    private MockClock $clock;
    private string $token;

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
        (new Filesystem())->remove(static::getContainer()->getParameter('kernel.project_dir').'/var/saves/test');
        $this->token = $this->signIn('76561198000000001');
    }

    protected function tearDown(): void
    {
        Clock::set(new NativeClock());
        parent::tearDown();
    }

    private function signIn(string $steamId, string $device = 'Steam Deck'): string
    {
        $this->client->request('POST', '/api/sessions', server: ['CONTENT_TYPE' => 'application/json'], content: json_encode(['steamTicket' => 'a0'.$steamId, 'device' => ['name' => $device, 'platform' => 'steam']]));

        return json_decode($this->client->getResponse()->getContent(), true)['accessToken'];
    }

    private function call(string $method, string $url, ?string $body = null, ?string $token = null, string $type = 'application/octet-stream'): array
    {
        $this->client->request($method, $url, server: ['CONTENT_TYPE' => $type, 'HTTP_AUTHORIZATION' => 'Bearer '.($token ?? $this->token)], content: $body);

        return json_decode($this->client->getResponse()->getContent() ?: 'null', true) ?? [];
    }

    private function upload(array $header = [], ?string $token = null, int $padding = 200): array
    {
        $bytes = SaveBuilder::build($header, $padding);

        return $this->call('PUT', '/api/saves/'.($header['saveId'] ?? 'save-1'), $bytes, $token);
    }

    public function testASaveGoesUpAndComesBack(): void
    {
        $bytes = SaveBuilder::build();
        $data = $this->call('PUT', '/api/saves/save-1', $bytes);
        self::assertResponseStatusCodeSame(201);
        self::assertSame('Portugal, March 1512', $data['save']['name']);
        self::assertSame(['y' => 1512, 'm' => 3], $data['save']['date']);
        self::assertSame(1, $data['usage']['saves']);

        $this->client->request('GET', '/api/saves/save-1', server: ['HTTP_AUTHORIZATION' => 'Bearer '.$this->token]);
        self::assertResponseIsSuccessful();
        self::assertSame($bytes, $this->client->getResponse()->getContent());
    }

    public function testReadsASaveTheEngineWrote(): void
    {
        $bytes = (string) file_get_contents(\dirname(__DIR__).'/fixtures/engine-manual.phsave');
        $data = $this->call('PUT', '/api/saves/engine-fixture-1', $bytes);
        self::assertResponseStatusCodeSame(201);
        self::assertSame('Castile, May 1492', $data['save']['name']);
        self::assertSame('CAS', $data['save']['nation']);
        self::assertSame(42, $data['save']['turn']);
    }

    public function testTheBytesLiveOutsideTheDatabaseUnderTheirKey(): void
    {
        $this->upload();
        $em = static::getContainer()->get(EntityManagerInterface::class);
        $row = $em->getConnection()->fetchAssociative('SELECT * FROM cloud_save');
        self::assertArrayNotHasKey('bytes', $row);
        $files = glob(static::getContainer()->getParameter('kernel.project_dir').'/var/saves/test/*/camp-1/save-1.phsave');
        self::assertCount(1, $files);
        self::assertMatchesRegularExpression('~/[0-9a-f-]{36}/camp-1/save-1\.phsave$~', $files[0]);
    }

    public function testUploadsAreWriteOnce(): void
    {
        $bytes = SaveBuilder::build();
        $this->call('PUT', '/api/saves/save-1', $bytes);
        $this->call('PUT', '/api/saves/save-1', $bytes);
        self::assertResponseStatusCodeSame(200);

        $data = $this->upload();
        self::assertResponseStatusCodeSame(409);
        self::assertSame('save_id_exists', $data['error']);
    }

    public function testTheServerChecksEachUpload(): void
    {
        $this->call('PUT', '/api/saves/save-1', 'GIF89a not a save');
        self::assertSame('wrong_magic', json_decode($this->client->getResponse()->getContent(), true)['error']);

        $bytes = SaveBuilder::build();
        $damaged = substr($bytes, 0, -1).\chr(\ord($bytes[-1]) ^ 0xFF);
        $data = $this->call('PUT', '/api/saves/save-1', $damaged);
        self::assertResponseStatusCodeSame(422);
        self::assertSame('damaged', $data['error']);

        $data = $this->call('PUT', '/api/saves/save-1', substr($bytes, 0, 40));
        self::assertSame('damaged', $data['error']);

        $data = $this->call('PUT', '/api/saves/other-id', $bytes);
        self::assertSame('header_differs', $data['error']);

        $data = $this->upload(['kind' => 'sideways']);
        self::assertSame('bad_header', $data['error']);
    }

    public function testASaveOverTwoMegabytesIsRefused(): void
    {
        $data = $this->upload(padding: 2 * 1024 * 1024 + 10);
        self::assertResponseStatusCodeSame(413);
        self::assertSame('too_big', $data['error']);
    }

    public function testChangesSinceTheCursor(): void
    {
        $this->upload(['saveId' => 'a']);
        $this->upload(['saveId' => 'b']);
        $first = $this->call('GET', '/api/saves');
        self::assertSame(['a', 'b'], array_column($first['saves'], 'saveId'));
        self::assertSame([], $first['tombstones']);

        $this->upload(['saveId' => 'c']);
        $this->call('DELETE', '/api/saves/a');
        self::assertResponseStatusCodeSame(204);
        $next = $this->call('GET', '/api/saves?since='.$first['cursor']);
        self::assertSame(['c'], array_column($next['saves'], 'saveId'));
        self::assertSame(['a'], array_column($next['tombstones'], 'saveId'));

        $none = $this->call('GET', '/api/saves?since='.$next['cursor']);
        self::assertSame([[], [], $next['cursor']], [$none['saves'], $none['tombstones'], $none['cursor']]);

        $this->call('GET', '/api/saves/a');
        self::assertResponseStatusCodeSame(404);
    }

    public function testDeletingACampaignRemovesEverySave(): void
    {
        $this->upload(['saveId' => 'a', 'campaignId' => 'one']);
        $this->upload(['saveId' => 'b', 'campaignId' => 'one']);
        $this->upload(['saveId' => 'c', 'campaignId' => 'two']);
        $data = $this->call('DELETE', '/api/campaigns/one');
        self::assertSame(2, $data['removed']);
        $all = $this->call('GET', '/api/saves');
        self::assertSame(['c'], array_column($all['saves'], 'saveId'));
        self::assertEqualsCanonicalizing(['a', 'b'], array_column($all['tombstones'], 'saveId'));
    }

    public function testAccountsSeeOnlyTheirOwnSaves(): void
    {
        $this->upload();
        $other = $this->signIn('76561198000000002');
        self::assertSame([], $this->call('GET', '/api/saves', token: $other)['saves']);
        $this->call('GET', '/api/saves/save-1', token: $other);
        self::assertResponseStatusCodeSame(404);
        $this->upload(token: $other);
        self::assertResponseStatusCodeSame(201);
    }

    public function testTheQuotaRefusesAndNeverDrops(): void
    {
        $this->upload(['saveId' => 'big']);
        $em = static::getContainer()->get(EntityManagerInterface::class);
        $em->getConnection()->executeStatement('UPDATE cloud_save SET size = 200 * 1024 * 1024 - 100');
        $data = $this->upload(['saveId' => 'next']);
        self::assertResponseStatusCodeSame(507);
        self::assertSame('quota_full', $data['error']);
        self::assertSame(['big'], array_column($this->call('GET', '/api/saves')['saves'], 'saveId'));
    }

    public function testTheIronmanLineHasOneHead(): void
    {
        $this->upload(['saveId' => 'i1', 'campaignId' => 'iron', 'kind' => 'ironman', 'ironman' => true]);
        self::assertResponseStatusCodeSame(201);
        $this->upload(['saveId' => 'i2', 'campaignId' => 'iron', 'kind' => 'ironman', 'ironman' => true, 'parent' => 'i1']);
        self::assertResponseStatusCodeSame(201);
        $data = $this->upload(['saveId' => 'i2b', 'campaignId' => 'iron', 'kind' => 'ironman', 'ironman' => true, 'parent' => 'i1']);
        self::assertResponseStatusCodeSame(409);
        self::assertSame(['not_the_newest', 'i2'], [$data['error'], $data['head']]);

        $claim = fn (string $id, ?string $parent) => $this->call('POST', '/api/campaigns/iron/ironman-head', json_encode(['saveId' => $id, 'parent' => $parent]), type: 'application/json');
        self::assertSame('not_the_newest', $claim('i3', 'i1')['error']);
        self::assertSame('i3', $claim('i3', 'i2')['head']);
    }

    public function testUploadsAreRateLimited(): void
    {
        for ($i = 0; $i < 120; ++$i) {
            $this->call('PUT', '/api/saves/x', 'not a save');
        }
        $data = $this->call('PUT', '/api/saves/x', 'not a save');
        self::assertResponseStatusCodeSame(429);
        self::assertSame('rate_limited', $data['error']);
    }

    public function testSavesNeedASignIn(): void
    {
        $this->client->request('GET', '/api/saves');
        self::assertResponseStatusCodeSame(401);
    }

    public function testRemovedSavesArePurgedAfterThirtyDays(): void
    {
        $this->upload(['saveId' => 'old']);
        $this->upload(['saveId' => 'new']);
        $this->call('DELETE', '/api/saves/old');
        $this->clock->sleep(29 * 86400);
        $this->call('DELETE', '/api/saves/new');
        $this->clock->sleep(2 * 86400);

        $tester = new CommandTester((new Application(static::$kernel))->find('app:saves:purge'));
        $tester->execute([]);
        self::assertStringContainsString('Purged 1 removed save(s).', $tester->getDisplay());
        $files = glob(static::getContainer()->getParameter('kernel.project_dir').'/var/saves/test/*/camp-1/*.phsave');
        self::assertSame(['new.phsave'], array_map('basename', $files));
    }

    /** The server's numbers are the rules' numbers (packages/rules/data/domain/saves.json). */
    public function testMatchesTheSavesRules(): void
    {
        $server = json_decode((string) file_get_contents(\dirname(__DIR__, 3).'/packages/rules/data/domain/saves.json'), true)['cloud']['server'];
        $c = static::getContainer();
        foreach (['max_save_mb', 'quota_saves', 'quota_mb', 'tombstone_purge_days'] as $key) {
            self::assertSame($server[$key], $c->getParameter('cloud.'.$key), $key);
        }
    }
}
