<?php

namespace App\Tests\Controller;

use App\Account\Registration;
use App\Entity\Account;
use App\Entity\CrashReport;
use App\Entity\MetricEvent;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

final class StatsTest extends WebTestCase
{
    private KernelBrowser $client;

    protected function setUp(): void
    {
        $this->client = static::createClient();
        $em = $this->em();
        $tool = new SchemaTool($em);
        $meta = $em->getMetadataFactory()->getAllMetadata();
        $tool->dropSchema($meta);
        $tool->createSchema($meta);
    }

    private function em(): EntityManagerInterface
    {
        return static::getContainer()->get(EntityManagerInterface::class);
    }

    private function signIn(string $name, bool $moderator): void
    {
        $account = static::getContainer()->get(Registration::class)->register(strtolower($name).'@example.com', $name, 'correct horse');
        if ($moderator) {
            $account->addRole('ROLE_MODERATOR');
        }
        $this->em()->flush();
        $this->client->loginUser($this->em()->find(Account::class, $account->getId()), 'main');
    }

    private function event(string $install, string $name, array $properties = [], string $runtime = 'web', string $when = '-1 day'): void
    {
        $this->em()->persist(new MetricEvent($install, $name, $properties, $runtime, new \DateTimeImmutable($when)));
    }

    public function testGuestsAndPlayersAreKeptOut(): void
    {
        $this->client->request('GET', '/stats');
        self::assertResponseRedirects();

        $this->signIn('Player', false);
        $this->client->request('GET', '/stats');
        self::assertResponseStatusCodeSame(403);
    }

    public function testShowsTheNumbersToModerators(): void
    {
        $this->event('a', 'session_started');
        $this->event('a', 'turn_ended', ['turn' => 3]);
        $this->event('a', 'turn_ended', ['turn' => 7]);
        $this->event('b', 'session_started', runtime: 'capacitor-ios');
        $this->event('b', 'turn_ended', ['turn' => 1], 'capacitor-ios');
        $this->event('c', 'turn_ended', ['turn' => '40']);
        $this->event('a', 'tutorial_step', ['chapter' => 'basics', 'step' => 2]);
        $this->event('b', 'tutorial_step', ['chapter' => 'basics', 'step' => 2], 'capacitor-ios');
        $this->event('b', 'tutorial_step', ['chapter' => 'basics', 'step' => 10], 'capacitor-ios');
        $this->event('old', 'session_started', when: '-60 days');
        $this->em()->persist(new CrashReport('a', 'web', '0.9.3', 'rejection', 'Province 12 has no owner', "Error\n at f (x.js:1:2)", 'province', null, new \DateTimeImmutable('-2 days')));
        $this->em()->persist(new CrashReport('b', 'web', '0.9.4', 'rejection', 'Province 7 has no owner', "Error\n at f (x.js:1:2)", 'province', null, new \DateTimeImmutable('-1 day')));
        $this->em()->flush();
        $this->signIn('Mira', true);

        $page = $this->client->request('GET', '/stats?days=7');
        self::assertResponseIsSuccessful();
        self::assertSelectorTextContains('h1', 'Stats');
        self::assertSelectorTextContains('a[aria-current=page].btn', '7 days');
        self::assertSame('2', $page->filter('#daily + p + .table-scroll tbody tr')->eq(1)->filter('td')->eq(2)->text());
        self::assertStringContainsString('2 new installs', $page->filter('#daily + p')->text());

        $turns = $page->filter('#stop + p + .table-scroll tbody tr')->each(fn ($row) => $row->filter('td')->eq(1)->text());
        self::assertSame(['1', '0', '1', '0', '0', '0', '0'], $turns);

        $tutorial = $page->filter('#tutorial + p + .table-scroll tbody tr')->each(fn ($row) => implode(' ', $row->filter('td')->each(fn ($td) => $td->text())));
        self::assertSame(['basics 2 2', 'basics 10 1'], $tutorial);

        $crash = $page->filter('#crashes + p + .table-scroll tbody tr');
        self::assertCount(1, $crash);
        self::assertSame(['2', '2'], [$crash->filter('td')->eq(0)->text(), $crash->filter('td')->eq(1)->text()]);
        self::assertSame('0.9.4', $crash->filter('td')->eq(3)->text());
        self::assertStringContainsString('Province 7 has no owner', $crash->filter('summary')->text());

        $this->client->request('GET', '/stats?days=13');
        self::assertSelectorTextContains('a[aria-current=page].btn', '30 days');
    }
}
