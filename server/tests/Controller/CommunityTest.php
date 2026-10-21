<?php

namespace App\Tests\Controller;

use App\Account\Registration;
use App\Entity\Account;
use App\Entity\Post;
use App\Entity\PostReport;
use App\Entity\Topic;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Symfony\Bundle\FrameworkBundle\Console\Application;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\Console\Tester\CommandTester;

final class CommunityTest extends WebTestCase
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
        static::getContainer()->get('cache.rate_limiter')->clear();
    }

    private function em(): EntityManagerInterface
    {
        return static::getContainer()->get(EntityManagerInterface::class);
    }

    private function account(string $name, bool $moderator = false): Account
    {
        $account = static::getContainer()->get(Registration::class)->register(strtolower($name).'@example.com', $name, 'correct horse');
        if ($moderator) {
            $account->addRole('ROLE_MODERATOR');
            $this->em()->flush();
        }

        return $account;
    }

    /** A topic with its opening post and any replies, written straight to the database. */
    private function topic(Account $author, string $title = 'Holding Constantinople', string $board = 'strategy', array $replies = []): Topic
    {
        $em = $this->em();
        $topic = new Topic($board, $title, $author);
        $em->persist($topic);
        $em->persist(new Post($topic, $author, 'Build a second siege train first.'));
        foreach ($replies as $body) {
            $em->persist($post = new Post($topic, $author, $body));
            $topic->touch($post);
        }
        $em->flush();

        return $topic;
    }

    private function signIn(Account $account): void
    {
        $this->client->loginUser($this->em()->find(Account::class, $account->getId()), 'main');
    }

    private function topicUrl(Topic $topic): string
    {
        return '/community/t/'.$topic->getId().'-'.$topic->getSlug();
    }

    /** A valid CSRF token for the community's post forms, read from the new-topic page. */
    private function postToken(): string
    {
        return $this->client->request('GET', '/community/new')->filter('input[name=_token]')->attr('value');
    }

    private function rows(string $entity): int
    {
        $this->em()->clear();

        return $this->em()->getRepository($entity)->count([]);
    }

    public function testGuestsReadEveryBoardAndTopic(): void
    {
        $jadwiga = $this->account('Jadwiga');
        $topic = $this->topic($jadwiga, replies: ['Bring food carts.']);
        $hidden = $this->topic($jadwiga, 'A hidden topic');
        $hidden->setHidden(true);
        $this->em()->flush();

        $crawler = $this->client->request('GET', '/community');
        self::assertResponseIsSuccessful();
        self::assertSame(5, $crawler->filter('.board')->count());
        self::assertSelectorTextContains('.boards', 'Strategy and campaign stories');
        self::assertSelectorTextContains('.boards', '1 topic · 2 posts');
        self::assertSelectorTextContains('.topics', 'Holding Constantinople');
        self::assertSelectorTextNotContains('.topics', 'A hidden topic');
        self::assertResponseNotHasCookie('ph_session');

        $this->client->request('GET', '/community/strategy');
        self::assertResponseIsSuccessful();
        self::assertSelectorTextContains('.topics', '1 reply');

        $this->client->request('GET', '/community/t/'.$topic->getId());
        self::assertResponseRedirects($this->topicUrl($topic), 301);
        $crawler = $this->client->request('GET', $this->topicUrl($topic));
        self::assertResponseIsSuccessful();
        self::assertSame(2, $crawler->filter('.post')->count());
        self::assertSelectorNotExists('#reply-body');
        self::assertSelectorExists('.reply a[href^="/community/join"]');

        $this->client->request('GET', $this->topicUrl($hidden));
        self::assertResponseStatusCodeSame(404);
        $this->client->request('GET', '/community/nowhere');
        self::assertResponseStatusCodeSame(404);
        $this->client->request('GET', '/community/new');
        self::assertResponseRedirects('/community/signin');
    }

    public function testSignsUpWithTheSameRulesAsTheApi(): void
    {
        $crawler = $this->client->request('GET', '/community/join');
        $this->client->submit($crawler->selectButton('Join')->form(), ['displayName' => 'M', 'email' => 'nope', 'password' => 'short']);
        self::assertResponseStatusCodeSame(422);
        self::assertSelectorExists('#displayName-error');
        self::assertSelectorExists('#email-error');
        self::assertSelectorExists('#password-error');

        $crawler = $this->client->request('GET', '/community/join');
        $this->client->submit($crawler->selectButton('Join')->form(), ['displayName' => 'Mehmed', 'email' => 'Mehmed@Example.com', 'password' => 'correct horse']);
        self::assertResponseRedirects('/community', 303);
        $this->client->followRedirect();
        self::assertSelectorTextContains('.bar-you', 'Mehmed');
        $account = $this->em()->getRepository(Account::class)->findOneBy(['email' => 'mehmed@example.com']);
        self::assertSame(['ROLE_PLAYER'], $account->getRoles());

        // The same email cannot sign up twice, on the website or through the API.
        $this->client->request('POST', '/api/accounts', server: ['CONTENT_TYPE' => 'application/json'], content: json_encode(['email' => 'mehmed@example.com', 'displayName' => 'Again', 'password' => 'correct horse']));
        self::assertResponseStatusCodeSame(409);
    }

    public function testRateLimitsSignUpsPerAddress(): void
    {
        foreach (range(1, 4) as $i) {
            $this->client->getCookieJar()->clear();
            $crawler = $this->client->request('GET', '/community/join');
            $this->client->submit($crawler->selectButton('Join')->form(), ['displayName' => 'Player '.$i, 'email' => "p$i@example.com", 'password' => 'correct horse']);
        }
        self::assertResponseStatusCodeSame(429);
        self::assertSame(3, $this->rows(Account::class));
    }

    public function testSignsInWithEmailAndPassword(): void
    {
        $this->account('Jadwiga');

        $crawler = $this->client->request('GET', '/community/signin');
        $this->client->submit($crawler->selectButton('Sign in')->form(), ['email' => 'jadwiga@example.com', 'password' => 'wrong password']);
        self::assertResponseRedirects('/community/signin');
        $this->client->followRedirect();
        self::assertSelectorTextContains('.field-error', 'do not match');

        $crawler = $this->client->request('GET', '/community/signin');
        $this->client->submit($crawler->selectButton('Sign in')->form(), ['email' => 'jadwiga@example.com', 'password' => 'correct horse']);
        self::assertResponseRedirects('/community');
        $this->client->followRedirect();
        self::assertSelectorTextContains('.bar-you', 'Jadwiga');

        // Signing out is a form with a token on the player's own page.
        $crawler = $this->client->request('GET', '/community/you');
        $this->client->submit($crawler->selectButton('Sign out')->form());
        $this->client->followRedirect();
        self::assertSelectorNotExists('.bar-you');
        self::assertSelectorExists('.bar-nav a[href="/community/signin"]');
    }

    public function testPostsATopicAndAReplyAsPlainText(): void
    {
        $this->signIn($this->account('Hans'));

        $crawler = $this->client->request('GET', '/community/new?board=ideas');
        self::assertResponseIsSuccessful();
        $this->client->submit($crawler->selectButton('Post topic')->form(), ['title' => '  Name   my provinces ', 'body' => "Let me rename them.\r\n\r\n\r\n\r\nPlease!"]);
        $topic = $this->em()->getRepository(Topic::class)->findOneBy([]);
        self::assertSame('Name my provinces', $topic->getTitle());
        self::assertSame('ideas', $topic->getBoard());
        self::assertResponseRedirects($this->topicUrl($topic), 303);

        $crawler = $this->client->followRedirect();
        self::assertSelectorTextContains('h1', 'Name my provinces');
        self::assertSame(2, $crawler->filter('.post-body p')->count());
        $this->client->submit($crawler->selectButton('Post reply')->form(), ['body' => "<script>alert(1)</script>\nSee https://example.com/a?b=1&c=2."]);
        $post = $this->em()->getRepository(Post::class)->findOneBy([], ['id' => 'DESC']);
        self::assertResponseRedirects($this->topicUrl($topic).'#p'.$post->getId(), 303);

        $this->client->followRedirect();
        $html = $this->client->getResponse()->getContent();
        self::assertStringContainsString('&lt;script&gt;alert(1)&lt;/script&gt;<br>', $html);
        self::assertStringContainsString('<a href="https://example.com/a?b=1&amp;c=2" rel="nofollow ugc noopener">https://example.com/a?b=1&amp;c=2</a>.', $html);
        self::assertStringNotContainsString('<script>alert', $html);

        // Too short and too long are refused, with the text kept.
        $crawler = $this->client->request('GET', $this->topicUrl($topic));
        $this->client->submit($crawler->selectButton('Post reply')->form(), ['body' => str_repeat('a', Post::BODY_MAX + 1)]);
        self::assertResponseStatusCodeSame(422);
        self::assertSelectorTextContains('#body-error', 'Keep it under');
        self::assertSame(2, $this->rows(Post::class));
    }

    public function testAuthorsEditTheirPostsForThirtyMinutes(): void
    {
        $hans = $this->account('Hans');
        $topic = $this->topic($hans);
        $post = $this->em()->getRepository(Post::class)->findOneBy(['topic' => $topic]);
        $this->signIn($hans);

        $crawler = $this->client->request('GET', '/community/p/'.$post->getId().'/edit');
        $this->client->submit($crawler->selectButton('Save')->form(), ['title' => 'Holding Constantinople in 1453', 'body' => 'Two siege trains.']);
        self::assertResponseRedirects();
        $this->em()->clear();
        $post = $this->em()->find(Post::class, $post->getId());
        self::assertSame('Two siege trains.', $post->getBody());
        self::assertNotNull($post->getEditedAt());
        self::assertSame('Holding Constantinople in 1453', $post->getTopic()->getTitle());

        (new \ReflectionProperty(Post::class, 'createdAt'))->setValue($post, new \DateTimeImmutable('-31 minutes'));
        $this->em()->flush();
        $this->client->request('GET', '/community/p/'.$post->getId().'/edit');
        self::assertResponseStatusCodeSame(403);

        // Someone else cannot edit it at all.
        $this->signIn($this->account('Jadwiga'));
        $this->client->request('GET', '/community/p/'.$post->getId().'/edit');
        self::assertResponseStatusCodeSame(403);
    }

    public function testRejectsFormsWithoutAValidCsrfToken(): void
    {
        $topic = $this->topic($this->account('Hans'));
        $this->signIn($this->account('Jadwiga'));

        $this->client->request('POST', '/community/t/'.$topic->getId().'/reply', ['_token' => 'forged', 'body' => 'Hello there']);
        self::assertResponseStatusCodeSame(403);
        self::assertSelectorTextContains('#body-error', 'expired');
        $this->client->request('POST', '/community/new', ['_token' => 'forged', 'board' => 'general', 'title' => 'Forged', 'body' => 'Hello there']);
        self::assertResponseStatusCodeSame(403);
        self::assertSame(1, $this->rows(Post::class));
        self::assertSame(1, $this->rows(Topic::class));

        $this->client->getCookieJar()->clear();
        $this->client->request('POST', '/community/join', ['_token' => 'forged', 'displayName' => 'Forger', 'email' => 'forger@example.com', 'password' => 'correct horse']);
        self::assertResponseStatusCodeSame(403);
        $this->client->request('POST', '/community/signin', ['_csrf_token' => 'forged', 'email' => 'hans@example.com', 'password' => 'correct horse']);
        $this->client->followRedirect();
        self::assertSelectorTextContains('.field-error', 'open too long');
        self::assertSelectorNotExists('.bar-you');
    }

    public function testRateLimitsReplies(): void
    {
        $topic = $this->topic($this->account('Hans'));
        $this->signIn($this->account('Jadwiga'));
        $token = $this->postToken();

        foreach (range(1, 10) as $i) {
            $this->client->request('POST', '/community/t/'.$topic->getId().'/reply', ['_token' => $token, 'body' => 'Reply number '.$i]);
            self::assertResponseRedirects();
        }
        $this->client->request('POST', '/community/t/'.$topic->getId().'/reply', ['_token' => $token, 'body' => 'One too many']);
        self::assertResponseStatusCodeSame(429);
        self::assertSelectorTextContains('#body-error', 'Wait a little');
        self::assertSelectorTextContains('#reply-body', 'One too many');
        self::assertSame(11, $this->rows(Post::class));
    }

    public function testLockedTopicsRefuseReplies(): void
    {
        $topic = $this->topic($this->account('Hans'));
        $topic->setLocked(true);
        $this->em()->flush();
        $this->signIn($this->account('Jadwiga'));
        $token = $this->postToken();

        $this->client->request('GET', $this->topicUrl($topic));
        self::assertSelectorTextContains('.badge.lock', 'Locked');
        self::assertSelectorTextContains('.locked-note', 'locked');
        self::assertSelectorNotExists('#reply-body');

        $this->client->request('POST', '/community/t/'.$topic->getId().'/reply', ['_token' => $token, 'body' => 'Let me in']);
        self::assertResponseStatusCodeSame(403);
        self::assertSame(1, $this->rows(Post::class));
    }

    public function testModeratorsHideAndLock(): void
    {
        $hans = $this->account('Hans');
        $topic = $this->topic($hans, replies: ['Something rude']);
        $this->signIn($this->account('Jadwiga'));
        $this->client->request('GET', $this->topicUrl($topic));
        self::assertSelectorNotExists('.mod-tools');
        $this->client->request('POST', '/community/t/'.$topic->getId().'/lock', ['_token' => 'x', 'locked' => 1]);
        self::assertResponseStatusCodeSame(403);

        $this->signIn($this->account('Mira', moderator: true));
        $crawler = $this->client->request('GET', $this->topicUrl($topic));
        $this->client->submit($crawler->selectButton('Lock topic')->form());
        $crawler = $this->client->followRedirect();
        self::assertSelectorTextContains('.badge.lock', 'Locked');
        // A moderator may still reply to a locked topic.
        self::assertSelectorExists('#reply-body');

        $this->client->submit($crawler->filter('#p'.$this->lastPostId())->selectButton('Hide')->form());
        $this->client->followRedirect();
        self::assertSelectorTextContains('.post.is-hidden .hidden-note', 'Hidden by a moderator');

        // Guests see neither the hidden post nor, once hidden, the topic.
        $this->client->getCookieJar()->clear();
        $crawler = $this->client->request('GET', $this->topicUrl($topic));
        self::assertSame(1, $crawler->filter('.post')->count());
        self::assertStringNotContainsString('Something rude', $this->client->getResponse()->getContent());
        self::assertSelectorTextContains('.reply', 'locked');
        $this->client->request('GET', '/community/p/'.$this->lastPostId());
        self::assertResponseStatusCodeSame(404);

        $this->signIn($this->em()->getRepository(Account::class)->findOneBy(['email' => 'mira@example.com']));
        $crawler = $this->client->request('GET', $this->topicUrl($topic));
        $this->client->submit($crawler->selectButton('Hide topic')->form());
        $this->client->getCookieJar()->clear();
        $this->client->request('GET', $this->topicUrl($topic));
        self::assertResponseStatusCodeSame(404);
        $this->client->request('GET', '/community');
        self::assertSelectorTextContains('.boards', '0 topics');
    }

    public function testReportsReachTheModerators(): void
    {
        $hans = $this->account('Hans');
        $topic = $this->topic($hans, replies: ['Something rude']);
        $jadwiga = $this->account('Jadwiga');
        $this->signIn($jadwiga);

        $crawler = $this->client->request('GET', '/community/p/'.$this->lastPostId().'/report');
        $this->client->submit($crawler->selectButton('Report post')->form(), ['reason' => 'Rude to new players']);
        self::assertResponseRedirects();
        $this->client->followRedirect();
        self::assertSelectorTextContains('.c-notice', 'moderators will look');
        $this->client->request('GET', '/community/p/'.$this->lastPostId().'/report');
        self::assertSelectorTextContains('.sheet', 'reported this post already');
        $this->client->request('GET', '/community/reports');
        self::assertResponseStatusCodeSame(403);

        $this->signIn($this->account('Mira', moderator: true));
        $this->client->request('GET', '/community');
        self::assertSelectorTextContains('.c-head-actions .count', '1');
        $crawler = $this->client->request('GET', '/community/reports');
        self::assertSelectorTextContains('.report', 'Something rude');
        self::assertSelectorTextContains('.reasons', 'Rude to new players');
        $this->client->submit($crawler->selectButton('Dismiss')->form());
        $this->client->followRedirect();
        self::assertSelectorTextContains('.empty', 'No open reports');
        self::assertTrue($this->em()->getRepository(PostReport::class)->findOneBy([])->isResolved());
    }

    public function testModeratorCommandGrantsAndRemovesTheRole(): void
    {
        $this->account('Mira');
        $command = new CommandTester((new Application(self::$kernel))->find('app:community:moderator'));

        $command->execute(['email' => 'MIRA@example.com']);
        $command->assertCommandIsSuccessful();
        $this->em()->clear();
        self::assertContains('ROLE_MODERATOR', $this->em()->getRepository(Account::class)->findOneBy(['email' => 'mira@example.com'])->getRoles());

        $command->execute(['email' => 'mira@example.com', '--remove' => true]);
        $this->em()->clear();
        self::assertSame(['ROLE_PLAYER'], $this->em()->getRepository(Account::class)->findOneBy(['email' => 'mira@example.com'])->getRoles());

        self::assertSame(1, $command->execute(['email' => 'nobody@example.com']));
    }

    private function lastPostId(): int
    {
        $this->em()->clear();

        return $this->em()->getRepository(Post::class)->findOneBy([], ['id' => 'DESC'])->getId();
    }
}
