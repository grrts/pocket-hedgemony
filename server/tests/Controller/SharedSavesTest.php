<?php

namespace App\Tests\Controller;

use App\Account\Registration;
use App\Entity\Account;
use App\Entity\SharedSave;
use App\Entity\Topic;
use App\Saves\SaveFile;
use App\Tests\SaveBuilder;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\Filesystem\Filesystem;

/** Saves shared with the community: domain/saves/features/shared-saves.feature (SAVE-124 … SAVE-136). */
final class SharedSavesTest extends WebTestCase
{
    private KernelBrowser $client;
    private string $token;

    protected function setUp(): void
    {
        $this->client = static::createClient();
        $em = $this->em();
        $tool = new SchemaTool($em);
        $meta = $em->getMetadataFactory()->getAllMetadata();
        $tool->dropSchema($meta);
        $tool->createSchema($meta);
        static::getContainer()->get('cache.rate_limiter')->clear();
        (new Filesystem())->remove(static::getContainer()->getParameter('kernel.project_dir').'/var/saves/test');
        $this->token = $this->signIn('Leroy');
    }

    private function em(): EntityManagerInterface
    {
        return static::getContainer()->get(EntityManagerInterface::class);
    }

    /** Makes the account and signs the game in with it; returns the access token. */
    private function signIn(string $name): string
    {
        static::getContainer()->get(Registration::class)->register(strtolower($name).'@example.com', $name, 'correct horse');
        $this->client->request('POST', '/api/sessions', server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
            'email' => strtolower($name).'@example.com', 'password' => 'correct horse', 'device' => ['name' => 'Steam Deck', 'platform' => 'steam'],
        ]));

        return json_decode($this->client->getResponse()->getContent(), true)['accessToken'];
    }

    private function call(string $method, string $url, ?array $body = null, string|false|null $token = null): array
    {
        $server = ['CONTENT_TYPE' => 'application/json'];
        if (false !== $token) {
            $server['HTTP_AUTHORIZATION'] = 'Bearer '.($token ?? $this->token);
        }
        $this->client->request($method, $url, server: $server, content: null === $body ? null : json_encode($body));

        return json_decode($this->client->getResponse()->getContent() ?: 'null', true) ?? [];
    }

    private function share(array $header = [], string $purpose = 'help', array $extra = [], ?string $token = null): array
    {
        return $this->call('POST', '/api/shared-saves', [
            'file' => base64_encode(SaveBuilder::build($header + ['name' => 'Castile, May 1492', 'playerNation' => 'CAS', 'date' => ['y' => 1492, 'm' => 5], 'turn' => 12, 'playSeconds' => 12000])),
            'title' => 'Castile, May 1492',
            'note' => '',
            'realm' => 'Castile',
            'purpose' => $purpose,
        ] + $extra, $token);
    }

    private function anonymous(string $method, string $url): void
    {
        $this->client->request($method, $url);
    }

    public function testSharingOpensATopicOnTheBoardThePurposePicks(): void
    {
        foreach (['show' => 'strategy', 'help' => 'saves', 'broke' => 'bugs'] as $purpose => $board) {
            $data = $this->share(purpose: $purpose);
            self::assertResponseStatusCodeSame(201);
            self::assertMatchesRegularExpression('/^[A-HJ-NP-Z2-9]{8}$/', $data['code']);
            self::assertSame(substr($data['code'], 0, 4).'-'.substr($data['code'], 4), $data['shownCode']);
            self::assertStringEndsWith('/s/'.$data['code'], $data['link']);
            $topic = $this->em()->find(Topic::class, $data['save']['topicId']);
            self::assertSame($board, $topic->getBoard());
            self::assertSame('Castile, May 1492', $topic->getTitle());
            self::assertSame('Leroy', $topic->getAuthor()->getDisplayName());
        }
    }

    public function testTheCopyDropsTheDeviceNameAndKeepsTheChunks(): void
    {
        $data = $this->share(['device' => 'Leroy\'s Steam Deck']);
        $this->anonymous('GET', '/api/shared-saves/'.$data['code'].'/file');
        self::assertResponseIsSuccessful();
        $bytes = $this->client->getResponse()->getContent();
        $file = SaveFile::parse($bytes);
        self::assertSame('', $file->header['device']);
        self::assertSame('Castile, May 1492', $file->header['name']);
        self::assertStringNotContainsString('Steam Deck', $bytes);
    }

    public function testADamagedFileIsNotShared(): void
    {
        $bytes = SaveBuilder::build();
        $bytes[\strlen($bytes) - 3] = \chr(\ord($bytes[\strlen($bytes) - 3]) ^ 0xFF);
        $data = $this->call('POST', '/api/shared-saves', ['file' => base64_encode($bytes), 'title' => 'Broken', 'note' => '', 'purpose' => 'broke']);
        self::assertResponseStatusCodeSame(422);
        self::assertSame('damaged', $data['error']);
        self::assertSame(0, $this->em()->getRepository(Topic::class)->count([]));
    }

    public function testSharingNeedsTheAccount(): void
    {
        $this->client->request('POST', '/api/shared-saves', server: ['CONTENT_TYPE' => 'application/json'], content: '{}');
        self::assertResponseStatusCodeSame(401);
    }

    public function testSharedSavesHaveTheirOwnLimitAndLeaveTheQuotaAlone(): void
    {
        $this->share();
        self::assertResponseStatusCodeSame(201);
        $changes = $this->call('GET', '/api/saves');
        self::assertSame(0, $changes['usage']['saves']);

        // The limit on shared saves, with the community's topic limit out of the way.
        $em = $this->em();
        $account = $em->getRepository(Account::class)->findOneBy(['email' => 'leroy@example.com']);
        $post = $em->getRepository(SharedSave::class)->findAll()[0]->getPost();
        for ($i = 1; $i < 50; ++$i) {
            $em->persist(new SharedSave(SharedSave::newCode(), $account, $post, 'Filler '.$i, ['name' => 'x', 'nation' => 'CAS', 'realm' => 'Castile', 'year' => 1492, 'month' => 5, 'turn' => 1, 'playSeconds' => 0, 'gameVersion' => '0.1.0', 'ironman' => false, 'modified' => false, 'thumbnail' => ''], 100, new \DateTimeImmutable()));
        }
        $em->flush();
        $data = $this->share();
        self::assertResponseStatusCodeSame(409);
        self::assertSame('too_many_shared', $data['error']);
    }

    public function testTheCardAndTheFileCountPlays(): void
    {
        $code = $this->share(['ironman' => true, 'modified' => true])['code'];
        $card = $this->call('GET', '/api/shared-saves/'.strtolower(substr($code, 0, 4)).'-'.substr($code, 4), token: false)['save'];
        self::assertResponseIsSuccessful();
        self::assertSame('Leroy', $card['author']);
        self::assertSame('Castile', $card['realm']);
        self::assertSame(['y' => 1492, 'm' => 5], $card['date']);
        self::assertSame(12, $card['turn']);
        self::assertSame(12000, $card['playSeconds']);
        self::assertSame('0.1.0', $card['gameVersion']);
        self::assertTrue($card['ironman']);
        self::assertTrue($card['modified']);
        self::assertSame(0, $card['plays']);

        $this->anonymous('GET', '/api/shared-saves/'.$code.'/file');
        $this->anonymous('GET', '/api/shared-saves/'.$code.'/file');
        self::assertSame(2, $this->call('GET', '/api/shared-saves/'.$code, token: false)['save']['plays']);
    }

    public function testTheTopicShowsTheSaveCard(): void
    {
        $data = $this->share(['ironman' => true]);
        $this->anonymous('GET', '/s/'.$data['code']);
        self::assertResponseRedirects();
        $this->client->followRedirects();
        $crawler = $this->client->request('GET', '/s/'.$data['code']);
        self::assertResponseIsSuccessful();
        self::assertSelectorTextContains('.save-card .save-title', 'Castile, May 1492');
        self::assertSelectorTextContains('.save-card .save-facts', 'Castile · May 1492 · week 13 · 3 h 20 min played · version 0.1.0');
        self::assertSelectorTextContains('.save-card', 'Was ironman: opens as a normal campaign');
        self::assertSelectorTextContains('.save-card .save-code', $data['shownCode']);
        self::assertSame('/s/'.$data['code'].'.phsave', $crawler->filter('.save-card a[download]')->attr('href'));
        self::assertSelectorTextContains('.post-body', 'Shared from the game: Castile, May 1492.');

        $this->client->request('GET', '/s/'.$data['code'].'.phsave');
        self::assertResponseIsSuccessful();
        self::assertStringStartsWith('PHSV', $this->client->getResponse()->getContent());
        // Downloading from the website is not a play from the game.
        self::assertSame(0, $this->call('GET', '/api/shared-saves/'.$data['code'], token: false)['save']['plays']);
    }

    public function testAHiddenTopicTakesItsSaveAway(): void
    {
        $data = $this->share();
        $this->em()->find(Topic::class, $data['save']['topicId'])->setHidden(true);
        $this->em()->flush();
        foreach (['/api/shared-saves/'.$data['code'], '/api/shared-saves/'.$data['code'].'/file'] as $url) {
            $answer = $this->call('GET', $url, token: false);
            self::assertResponseStatusCodeSame(404);
            self::assertSame('There is no shared save with this code.', $answer['message']);
        }
        $this->anonymous('GET', '/s/'.$data['code'].'.phsave');
        self::assertResponseStatusCodeSame(404);
    }

    public function testSharingBackIntoTheOriginalTopic(): void
    {
        $original = $this->share();
        $other = $this->signIn('Bertrand');
        $reply = $this->share(['saveId' => 'copy-1', 'campaignId' => 'camp-2', 'sharedFrom' => ['code' => $original['code'], 'author' => 'Leroy']], 'reply', ['title' => 'Castile, saved'], $other);
        self::assertResponseStatusCodeSame(201);
        self::assertSame($original['save']['topicId'], $reply['save']['topicId']);
        self::assertNotSame($original['save']['postId'], $reply['save']['postId']);
        self::assertSame(1, $this->em()->getRepository(Topic::class)->count([]));

        $this->client->followRedirects();
        $crawler = $this->client->request('GET', '/s/'.$reply['code']);
        self::assertSame(2, $crawler->filter('.post .save-card')->count());
    }

    public function testALockedTopicTakesNoReply(): void
    {
        $original = $this->share();
        $this->em()->find(Topic::class, $original['save']['topicId'])->setLocked(true);
        $this->em()->flush();
        $answer = $this->share(['sharedFrom' => ['code' => $original['code'], 'author' => 'Leroy']], 'reply', token: $this->signIn('Bertrand'));
        self::assertResponseStatusCodeSame(403);
        self::assertSame('This topic is locked: nobody can reply to it.', $answer['message']);
    }

    public function testRemovingASharedSave(): void
    {
        $data = $this->share();
        $other = $this->signIn('Bertrand');
        $this->call('DELETE', '/api/shared-saves/'.$data['code'], token: $other);
        self::assertResponseStatusCodeSame(404);

        self::assertCount(1, $this->call('GET', '/api/shared-saves')['shared']);
        $this->call('DELETE', '/api/shared-saves/'.$data['code']);
        self::assertResponseStatusCodeSame(204);
        self::assertCount(0, $this->call('GET', '/api/shared-saves')['shared']);
        $this->call('GET', '/api/shared-saves/'.$data['code'], token: false);
        self::assertResponseStatusCodeSame(404);
        self::assertSame([], glob(static::getContainer()->getParameter('kernel.project_dir').'/var/saves/test/shared/*'));

        // The topic stays, its card saying the save was removed.
        $this->client->followRedirects();
        $this->client->request('GET', '/community/p/'.$data['save']['postId']);
        self::assertSelectorTextContains('.save-card', 'The player who shared this save removed it.');
    }

    public function testTheYouPageListsTheSharedSavesWithRemove(): void
    {
        $data = $this->share();
        $this->anonymous('GET', '/api/shared-saves/'.$data['code'].'/file');
        $account = $this->em()->getRepository(Account::class)->findOneBy(['email' => 'leroy@example.com']);
        $this->client->loginUser($account, 'main');
        $crawler = $this->client->request('GET', '/community/you');
        self::assertSelectorTextContains('.shared-list', 'Castile, May 1492');
        self::assertSelectorTextContains('.shared-list', 'Played 1 time');

        $this->client->submit($crawler->filter('.shared-remove form')->form());
        self::assertResponseRedirects('/community/you');
        $this->client->followRedirect();
        self::assertSelectorTextContains('.c-notice', 'was removed');
        self::assertSelectorNotExists('.shared-list');
    }

    /** The server's numbers are the rules' numbers (packages/rules/data/domain/saves.json). */
    public function testMatchesTheSavesRules(): void
    {
        $shared = json_decode((string) file_get_contents(\dirname(__DIR__, 3).'/packages/rules/data/domain/saves.json'), true)['cloud']['shared'];
        $c = static::getContainer();
        self::assertSame($shared['max_per_account'], $c->getParameter('cloud.shared_max_per_account'));
        self::assertSame($shared['boards'], $c->getParameter('cloud.shared_boards'));
        self::assertSame($shared['code_length'], \strlen(SharedSave::newCode()));
    }
}
