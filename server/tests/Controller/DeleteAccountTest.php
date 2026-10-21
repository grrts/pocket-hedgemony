<?php

namespace App\Tests\Controller;

use App\Entity\Account;
use App\Entity\CloudSave;
use App\Entity\Device;
use App\Entity\Entitlement;
use App\Entity\Identity;
use App\Entity\MetricEvent;
use App\Entity\Post;
use App\Entity\PostReport;
use App\Entity\SharedSave;
use App\Entity\Topic;
use App\Tests\SaveBuilder;
use App\Tests\StoreKeys;
use Symfony\Component\Filesystem\Filesystem;
use Symfony\Component\Uid\Uuid;

/**
 * Deleting the account: domain/saves/features/delete-account.feature (SAVE-198 … SAVE-202). "Leroy" signs
 * in with Steam on the Deck and with email on the phone, keeps cloud saves, shares one, buys the full game
 * on the App Store and writes in the community; then deletes the account.
 */
final class DeleteAccountTest extends StoreTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        (new Filesystem())->remove($this->savesDir());
    }

    private function savesDir(): string
    {
        return static::getContainer()->getParameter('kernel.project_dir').'/var/saves/test';
    }

    private function upload(string $token, array $header): void
    {
        $this->client->request('PUT', '/api/saves/'.$header['saveId'], server: ['CONTENT_TYPE' => 'application/octet-stream', 'HTTP_AUTHORIZATION' => 'Bearer '.$token], content: SaveBuilder::build($header));
        self::assertResponseIsSuccessful();
    }

    /** @return array<string, mixed> the share's answer */
    private function share(string $token): array
    {
        $data = $this->call('POST', '/api/shared-saves', [
            'file' => base64_encode(SaveBuilder::build(['saveId' => 'to-share', 'name' => 'Castile, May 1492', 'playerNation' => 'CAS'])),
            'title' => 'Castile, May 1492', 'note' => '', 'realm' => 'Castile', 'purpose' => 'help',
        ], $token);
        self::assertResponseStatusCodeSame(201);

        return $data;
    }

    /** Everything of the feature's Background: returns the Deck's and the phone's tokens, the account id and the share. */
    private function leroy(): array
    {
        [$deck, $id] = $this->steamPlayer();
        $this->call('POST', '/api/account/sign-ins', ['email' => 'leroy@example.org', 'password' => 'correct horse'], $deck);
        self::assertResponseStatusCodeSame(201);
        $phone = $this->call('POST', '/api/sessions', ['email' => 'leroy@example.org', 'password' => 'correct horse', 'device' => ['name' => 'Phone', 'platform' => 'ios']])['accessToken'];
        $this->upload($deck, ['saveId' => 's1', 'campaignId' => 'c1']);
        $this->upload($deck, ['saveId' => 's2', 'campaignId' => 'c1']);
        $shared = $this->share($deck);
        $this->call('POST', '/api/purchases', ['store' => 'apple', 'signedTransaction' => StoreKeys::transaction(['appAccountToken' => $id])], $phone);
        self::assertResponseIsSuccessful();

        return [$deck, $phone, $id, $shared];
    }

    private function rows(string $entity): int
    {
        return $this->em->getRepository($entity)->count([]);
    }

    public function testDeletingTheAccountRemovesEverythingThatIsThePlayers(): void
    {
        [$deck, $phone, $id, $shared] = $this->leroy();
        $files = fn () => is_dir($this->savesDir()) ? iterator_count(new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($this->savesDir(), \FilesystemIterator::SKIP_DOTS))) : 0;
        self::assertSame(3, $files());

        $this->call('DELETE', '/api/account', null, $phone);
        self::assertResponseStatusCodeSame(204);

        $this->em->clear();
        self::assertNull($this->em->find(Account::class, $id));
        foreach ([Identity::class, Device::class, CloudSave::class, SharedSave::class] as $entity) {
            self::assertSame(0, $this->rows($entity), $entity);
        }
        self::assertSame(0, $files(), 'the bytes of every cloud save and shared save are gone');
        // Every device is signed out at once, the one that asked and the other.
        foreach ([$deck, $phone] as $token) {
            $this->call('GET', '/api/saves', null, $token);
            self::assertResponseStatusCodeSame(401);
        }
        $this->call('GET', '/api/shared-saves/'.$shared['code']);
        self::assertResponseStatusCodeSame(404);
        // The email and the Steam account are free again: signing in makes a new, empty account.
        $this->call('POST', '/api/sessions', ['email' => 'leroy@example.org', 'password' => 'correct horse', 'device' => ['name' => 'Phone', 'platform' => 'ios']]);
        self::assertResponseStatusCodeSame(401);
        [, $again] = $this->steamPlayer();
        self::assertNotSame($id, $again);
    }

    public function testTheGameMustBeSignedIn(): void
    {
        $this->call('DELETE', '/api/account');
        self::assertResponseStatusCodeSame(401);
    }

    public function testThePurchaseRecordStaysWithoutTheAccount(): void
    {
        [, $phone] = $this->leroy();
        $this->call('DELETE', '/api/account', null, $phone);

        $this->em->clear();
        $record = $this->em->getRepository(Entitlement::class)->findOneBy(['store' => 'apple']);
        self::assertNotNull($record);
        self::assertNull($record->getAccount());
        self::assertTrue($record->isActive());

        // The store's notifications still reach it.
        $this->call('POST', '/api/stores/apple/notifications', ['signedPayload' => StoreKeys::notification('REFUND', StoreKeys::transaction(['revocationDate' => time() * 1000]))]);
        self::assertResponseIsSuccessful();
        $this->em->clear();
        self::assertSame('refunded', $this->em->getRepository(Entitlement::class)->findOneBy(['store' => 'apple'])->getStatus());
    }

    public function testCommunityPostsStayUnderDeletedPlayer(): void
    {
        [, $phone, $id, $shared] = $this->leroy();
        [, $bertrandId] = $this->phonePlayer('bertrand@example.org');
        $leroy = $this->em->find(Account::class, $id);
        $bertrand = $this->em->find(Account::class, $bertrandId);
        $topic = new Topic('general', 'Portugal by 1500?', $leroy);
        $this->em->persist($topic);
        $this->em->persist(new Post($topic, $leroy, 'Is it possible?'));
        $reply = new Post($topic, $bertrand, 'Yes.');
        $this->em->persist($reply);
        $this->em->persist(new PostReport($reply, $leroy, 'Too short'));
        $this->em->persist(new MetricEvent('install-1', 'campaign_started', [], 'web', new \DateTimeImmutable(), Uuid::fromString($id)));
        $this->em->flush();
        $topicId = $topic->getId();

        $this->call('DELETE', '/api/account', null, $phone);
        self::assertResponseStatusCodeSame(204);

        $this->em->clear();
        $topic = $this->em->find(Topic::class, $topicId);
        self::assertSame(Account::DELETED_PLAYER_NAME, $topic->getAuthor()->getDisplayName());
        $authors = array_map(fn (Post $p) => $p->getAuthor()->getDisplayName(), $this->em->getRepository(Post::class)->findBy(['topic' => $topic], ['id' => 'ASC']));
        self::assertSame([Account::DELETED_PLAYER_NAME, 'Player'], $authors);
        // The topic the shared save came with stays, without the save.
        self::assertNotNull($this->em->find(Topic::class, $shared['save']['topicId']));
        self::assertSame(0, $this->rows(PostReport::class));
        self::assertSame([['accountId' => null]], $this->em->createQuery('SELECT m.accountId FROM '.MetricEvent::class.' m')->getScalarResult());

        // "Deleted player" holds no way in, and a second deletion uses the same one.
        $deleted = $this->em->find(Account::class, Account::DELETED_PLAYER_ID);
        self::assertNull($deleted->getEmail());
        self::assertSame([], $this->em->getRepository(Identity::class)->findBy(['account' => $deleted]));
        $this->em->persist(new Post($topic, $this->em->find(Account::class, $bertrandId), 'Thanks.'));
        $this->em->flush();
        $token = $this->call('POST', '/api/sessions', ['email' => 'bertrand@example.org', 'password' => 'correct horse', 'device' => ['name' => 'Phone', 'platform' => 'ios']])['accessToken'];
        $this->call('DELETE', '/api/account', null, $token);
        self::assertResponseStatusCodeSame(204);
        $this->em->clear();
        self::assertSame(1, $this->rows(Account::class), 'only Deleted player is left');
    }

    public function testANewAccountRestoresThePurchaseOfADeletedOne(): void
    {
        [, $phone, $oldId] = $this->leroy();
        $this->call('DELETE', '/api/account', null, $phone);
        [$token, $id] = $this->phonePlayer('leroy.again@example.org');

        // Restore purchases sends the same transaction, still tagged with the deleted account's id.
        $answer = $this->call('POST', '/api/purchases', ['store' => 'apple', 'signedTransaction' => StoreKeys::transaction(['appAccountToken' => $oldId])], $token);
        self::assertResponseIsSuccessful();
        self::assertTrue($answer['fullGame']);
        self::assertSame(1, $this->rows(Entitlement::class), 'the same record, now with the new account');
        self::assertTrue($this->row($id, 'apple')->isActive());

        // Once claimed it is that account's: a third account is refused as before.
        [$third] = $this->phonePlayer('third@example.org');
        $refused = $this->call('POST', '/api/purchases', ['store' => 'apple', 'signedTransaction' => StoreKeys::transaction()], $third);
        self::assertSame('other_account', $refused['error']);
    }

    public function testARecordDoesNotReplaceAnActivePurchase(): void
    {
        [, $phone] = $this->leroy();
        $this->call('DELETE', '/api/account', null, $phone);
        [$token, $id] = $this->phonePlayer('leroy.again@example.org');
        $this->call('POST', '/api/purchases', ['store' => 'apple', 'signedTransaction' => StoreKeys::transaction(['originalTransactionId' => '2000000999', 'appAccountToken' => $id])], $token);

        $this->call('POST', '/api/purchases', ['store' => 'apple', 'signedTransaction' => StoreKeys::transaction()], $token);
        self::assertResponseIsSuccessful();
        self::assertSame('2000000999', $this->row($id, 'apple')->getReference());
        self::assertSame(2, $this->rows(Entitlement::class), 'the old record stays as it was');
    }
}
