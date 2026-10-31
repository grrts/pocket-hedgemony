<?php

namespace App\Tests\Controller;

use App\Entity\CrashReport;
use App\Entity\MetricEvent;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Symfony\Bundle\FrameworkBundle\Console\Application;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\Console\Tester\CommandTester;

final class CrashesTest extends WebTestCase
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

    private function postJson(string $url, array $body): array
    {
        $this->client->request('POST', $url, server: ['CONTENT_TYPE' => 'application/json'], content: json_encode($body));

        return json_decode($this->client->getResponse()->getContent(), true) ?? [];
    }

    private function crash(string $message, string $stack = "Error\n    at loadProvince (https://play.example/assets/index-abc.js:1:2345)"): array
    {
        return ['message' => $message, 'stack' => $stack, 'kind' => 'error', 'where' => 'province', 'occurredAt' => '2026-10-15T20:00:00+02:00', 'browser' => 'Chrome 141'];
    }

    public function testStoresABatchOfCrashes(): void
    {
        $data = $this->postJson('/api/crashes', [
            'installId' => 'install-1',
            'runtime' => 'web',
            'version' => '0.9.3',
            'crashes' => [
                $this->crash('Province 12 has no owner'),
                ['message' => 'Worker died', 'kind' => 'worker', 'occurredAt' => '2026-10-15T20:00:01+00:00'],
            ],
        ]);
        self::assertResponseStatusCodeSame(202);
        self::assertSame(2, $data['accepted']);

        $crashes = $this->em->getRepository(CrashReport::class)->findBy([], ['kind' => 'ASC']);
        self::assertCount(2, $crashes);
        self::assertSame('Province 12 has no owner', $crashes[0]->getMessage());
        self::assertSame('province', $crashes[0]->getWhere());
        self::assertSame('0.9.3', $crashes[0]->getVersion());
        self::assertSame('2026-10-15 18:00:00', $crashes[0]->getOccurredAt()->format('Y-m-d H:i:s'));
        self::assertNull($crashes[1]->getStack());
    }

    public function testRefusesABadBatch(): void
    {
        $data = $this->postJson('/api/crashes', [
            'installId' => 'install-1',
            'runtime' => 'playstation',
            'accountId' => '0199f3c2-0000-7000-8000-000000000000',
            'crashes' => [['message' => str_repeat('x', 501), 'kind' => 'panic', 'occurredAt' => 'yesterday']],
        ]);
        self::assertResponseStatusCodeSame(422);
        self::assertEqualsCanonicalizing(
            ['[runtime]', '[version]', '[accountId]', '[crashes][0][message]', '[crashes][0][kind]', '[crashes][0][occurredAt]'],
            array_column($data['details'], 'field'),
        );

        $this->postJson('/api/crashes', ['installId' => 'install-1', 'runtime' => 'web', 'version' => '1', 'crashes' => []]);
        self::assertResponseStatusCodeSame(422);
        self::assertSame(0, $this->em->getRepository(CrashReport::class)->count([]));
    }

    public function testFingerprintIgnoresDigitsInTheMessage(): void
    {
        $this->postJson('/api/crashes', [
            'installId' => 'install-1',
            'runtime' => 'electron',
            'version' => '0.9.3',
            'crashes' => [
                $this->crash('Province 12 has no owner'),
                $this->crash('Province 7 has no owner'),
                $this->crash('Province 7 has no owner', "Error\n    at drawMap (https://play.example/assets/map-def.js:9:10)"),
            ],
        ]);
        self::assertResponseStatusCodeSame(202);

        $prints = array_map(fn (CrashReport $c) => $c->getFingerprint(), $this->em->getRepository(CrashReport::class)->findAll());
        self::assertCount(2, array_unique($prints));
        self::assertSame(
            CrashReport::fingerprint('error', 'Province 1 has no owner', "Error\n    at loadProvince (https://play.example/assets/index-abc.js:1:2345)"),
            CrashReport::fingerprint('error', 'Province 99 has no owner', "TypeError: x\n    at loadProvince (https://play.example/assets/index-abc.js:1:2345)\n    at other (b.js:3:4)"),
        );
    }

    public function testAnswersCorsLikeTheMetrics(): void
    {
        $this->client->request('OPTIONS', '/api/crashes', server: ['HTTP_ORIGIN' => 'capacitor://localhost']);
        self::assertResponseStatusCodeSame(204);
        self::assertResponseHeaderSame('Access-Control-Allow-Origin', 'capacitor://localhost');
    }

    public function testPurgesOldCrashesAndEvents(): void
    {
        $this->em->persist(new CrashReport('i', 'web', '1', 'error', 'old', null, null, null, new \DateTimeImmutable()));
        $this->em->persist(new CrashReport('i', 'web', '1', 'error', 'new', null, null, null, new \DateTimeImmutable()));
        $this->em->persist(new MetricEvent('i', 'old_event', [], 'web', new \DateTimeImmutable()));
        $this->em->persist(new MetricEvent('i', 'new_event', [], 'web', new \DateTimeImmutable()));
        $this->em->flush();
        $conn = $this->em->getConnection();
        $conn->executeStatement("UPDATE crash_report SET received_at = ? WHERE message = 'old'", [(new \DateTimeImmutable('-91 days'))->format('Y-m-d H:i:s')]);
        $conn->executeStatement("UPDATE crash_report SET received_at = ? WHERE message = 'new'", [(new \DateTimeImmutable('-89 days'))->format('Y-m-d H:i:s')]);
        $conn->executeStatement("UPDATE metric_event SET received_at = ? WHERE name = 'old_event'", [(new \DateTimeImmutable('-14 months'))->format('Y-m-d H:i:s')]);
        $conn->executeStatement("UPDATE metric_event SET received_at = ? WHERE name = 'new_event'", [(new \DateTimeImmutable('-12 months'))->format('Y-m-d H:i:s')]);

        $command = new CommandTester((new Application(self::$kernel))->find('crashes:purge'));
        $command->execute([]);
        $command->assertCommandIsSuccessful();
        self::assertStringContainsString('1 crash report(s) and 1 usage event(s)', $command->getDisplay());
        self::assertSame(['new'], $conn->fetchFirstColumn('SELECT message FROM crash_report'));
        self::assertSame(['new_event'], $conn->fetchFirstColumn('SELECT name FROM metric_event'));
    }
}
