<?php

namespace App\Tests\Controller;

use App\Account\CombineTokens;
use App\Entity\Account;
use App\Entity\Entitlement;
use App\Entity\Topic;
use App\Tests\SaveBuilder;
use App\Tests\StoreMock;
use App\Tests\TestKeys;
use PHPUnit\Framework\Attributes\DataProvider;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\Clock\Clock;
use Symfony\Component\Clock\MockClock;
use Symfony\Component\Clock\NativeClock;
use Symfony\Component\Filesystem\Filesystem;

/**
 * Combining two accounts and removing a sign-in: domain/saves/features/combine-accounts.feature
 * (SAVE-186 … SAVE-193). "Leroy" signs in with Steam on the Deck and stays; "Bertrand" signed in with
 * Apple on the iPhone before the two were linked.
 */
final class CombineAccountsTest extends WebTestCase
{
    private const NONCE = 'nonce-from-the-game-0001';
    private const APPLE_ID = '001234.abcd';
    private const LEROY_STEAM = '76561198000000001';

    private KernelBrowser $client;
    private MockClock $clock;
    /** @var array{token: string, deviceToken: string, id: string} */
    private array $leroy;
    /** @var array{token: string, deviceToken: string, id: string} */
    private array $bertrand;

    protected function setUp(): void
    {
        $this->clock = new MockClock('2026-10-20 12:00:00');
        Clock::set($this->clock);
        $this->client = static::createClient();
        $em = $this->em();
        $tool = new SchemaTool($em);
        $meta = $em->getMetadataFactory()->getAllMetadata();
        $tool->dropSchema($meta);
        $tool->createSchema($meta);
        static::getContainer()->get('cache.rate_limiter')->clear();
        (new Filesystem())->remove($this->savesDir());
        StoreMock::$calls = [];
        $this->leroy = $this->session($this->call('POST', '/api/sessions', ['steamTicket' => 'a0'.self::LEROY_STEAM, 'displayName' => 'Leroy', 'device' => ['name' => 'Steam Deck', 'platform' => 'steam']]));
        $this->bertrand = $this->session($this->call('POST', '/api/sessions', ['appleIdentityToken' => $this->appleToken(), 'nonce' => self::NONCE, 'displayName' => 'Bertrand', 'device' => ['name' => 'iPhone', 'platform' => 'ios']]));
    }

    protected function tearDown(): void
    {
        Clock::set(new NativeClock());
        parent::tearDown();
    }

    private function em(): EntityManagerInterface
    {
        return static::getContainer()->get(EntityManagerInterface::class);
    }

    private function savesDir(): string
    {
        return static::getContainer()->getParameter('kernel.project_dir').'/var/saves/test';
    }

    private function session(array $data): array
    {
        self::assertResponseIsSuccessful();

        return ['token' => $data['accessToken'], 'deviceToken' => $data['deviceToken'], 'id' => $data['account']['id']];
    }

    private function call(string $method, string $url, ?array $body = null, ?string $token = null): array
    {
        $server = ['CONTENT_TYPE' => 'application/json'] + ($token ? ['HTTP_AUTHORIZATION' => 'Bearer '.$token] : []);
        $this->client->request($method, $url, server: $server, content: null === $body ? null : json_encode($body));

        return json_decode($this->client->getResponse()->getContent() ?: 'null', true) ?? [];
    }

    private function appleToken(): string
    {
        return TestKeys::token(TestKeys::apple(self::APPLE_ID, self::NONCE, $this->clock->now()->getTimestamp()), 'apple-1');
    }

    private function upload(string $token, array $header): array
    {
        $this->client->request('PUT', '/api/saves/'.$header['saveId'], server: ['CONTENT_TYPE' => 'application/octet-stream', 'HTTP_AUTHORIZATION' => 'Bearer '.$token], content: SaveBuilder::build($header));

        return json_decode($this->client->getResponse()->getContent() ?: 'null', true) ?? [];
    }

    /** Leroy adds the Apple sign-in that is Bertrand's; returns the refusal with the offer. */
    private function addApple(): array
    {
        $data = $this->call('POST', '/api/account/sign-ins', ['appleIdentityToken' => $this->appleToken(), 'nonce' => self::NONCE], $this->leroy['token']);
        self::assertResponseStatusCodeSame(409);
        self::assertSame('linked_to_another_account', $data['error']);

        return $data['combine'];
    }

    private function merge(string $combineToken, ?string $token = null): array
    {
        return $this->call('POST', '/api/account/merge', ['combineToken' => $combineToken], $token ?? $this->leroy['token']);
    }

    private function entitle(string $accountId, string $store, string $reference, string $status): void
    {
        $em = $this->em();
        $em->persist(new Entitlement($em->find(Account::class, $accountId), $store, 'full_game', $reference, $status, $this->clock->now()));
        $em->flush();
        $em->clear();
    }

    private function share(string $token): array
    {
        $data = $this->call('POST', '/api/shared-saves', [
            'file' => base64_encode(SaveBuilder::build(['saveId' => 'to-share', 'name' => 'Castile, May 1492', 'playerNation' => 'CAS'])),
            'title' => 'Castile, May 1492', 'note' => '', 'realm' => 'Castile', 'purpose' => 'help',
        ], $token);
        self::assertResponseStatusCodeSame(201);

        return $data;
    }

    public function testASignInOfAnotherAccountOffersToCombine(): void
    {
        $this->upload($this->bertrand['token'], ['saveId' => 'b1']);
        $this->upload($this->bertrand['token'], ['saveId' => 'b2']);
        $this->share($this->bertrand['token']);
        $this->entitle($this->bertrand['id'], Entitlement::APPLE, '2000000123456789', Entitlement::ACTIVE);

        $offer = $this->addApple();
        self::assertSame('apple', $offer['signIn']);
        self::assertSame('Bertrand', $offer['account']['displayName']);
        self::assertSame(2, $offer['account']['saves']);
        self::assertSame(1, $offer['account']['sharedSaves']);
        self::assertSame(['apple'], $offer['account']['purchases']);
        self::assertFalse($offer['account']['storageFull']);
        self::assertNull($offer['blockedBy']);
        self::assertNotEmpty($offer['token']);
        // Nothing moved yet: the offer is only an offer.
        self::assertCount(2, $this->call('GET', '/api/saves', token: $this->bertrand['token'])['saves']);
    }

    public function testCombiningMovesEverythingToTheAccountThePlayerIsIn(): void
    {
        $this->upload($this->leroy['token'], ['saveId' => 'l1', 'campaignId' => 'leroy-camp']);
        $this->upload($this->bertrand['token'], ['saveId' => 'b1', 'campaignId' => 'bert-camp']);
        $shared = $this->share($this->bertrand['token']);
        $this->entitle($this->bertrand['id'], Entitlement::APPLE, '2000000123456789', Entitlement::ACTIVE);

        $data = $this->merge($this->addApple()['token']);
        self::assertResponseIsSuccessful();
        self::assertSame($this->leroy['id'], $data['id']);
        self::assertSame('Leroy', $data['displayName']);
        self::assertSame('Bertrand', $data['combined']['displayName']);
        self::assertSame(['signIns' => 1, 'devices' => 1, 'saves' => 1, 'sharedSaves' => 1, 'purchases' => 1], array_diff_key($data['combined'], ['displayName' => 0]));
        self::assertEqualsCanonicalizing(['steam', 'apple'], array_column($data['signIns'], 'provider'));
        self::assertEqualsCanonicalizing(['Steam Deck', 'iPhone'], array_column($data['devices'], 'name'));

        // The saves and their bytes are the staying account's now.
        $saves = $this->call('GET', '/api/saves', token: $this->leroy['token'])['saves'];
        self::assertEqualsCanonicalizing(['l1', 'b1'], array_column($saves, 'saveId'));
        self::assertFileExists($this->savesDir().'/'.$this->leroy['id'].'/bert-camp/b1.phsave');
        self::assertFileDoesNotExist($this->savesDir().'/'.$this->bertrand['id'].'/bert-camp/b1.phsave');
        $this->client->request('GET', '/api/saves/b1', server: ['HTTP_AUTHORIZATION' => 'Bearer '.$this->leroy['token']]);
        self::assertResponseIsSuccessful();

        // Shared saves, purchases and the community topic came along; the emptied account is gone.
        $em = $this->em();
        $em->clear();
        self::assertNull($em->find(Account::class, $this->bertrand['id']));
        self::assertSame([$shared['code']], array_column($this->call('GET', '/api/shared-saves', token: $this->leroy['token'])['shared'], 'code'));
        self::assertSame('Leroy', $em->find(Topic::class, $shared['save']['topicId'])->getAuthor()->getDisplayName());
        $apple = $this->call('GET', '/api/entitlements/apple', token: $this->leroy['token']);
        self::assertSame('active', $apple['status']);

        // Signing in with Apple now opens the staying account.
        $again = $this->call('POST', '/api/sessions', ['appleIdentityToken' => $this->appleToken(), 'nonce' => self::NONCE, 'device' => ['name' => 'iPad', 'platform' => 'ios']]);
        self::assertSame($this->leroy['id'], $again['account']['id']);
    }

    public function testTheOtherAccountsDevicesLearnOfItOnTheirNextSync(): void
    {
        $this->upload($this->leroy['token'], ['saveId' => 'l1']);
        $deckCursor = $this->call('GET', '/api/saves', token: $this->leroy['token'])['cursor'];
        $this->upload($this->bertrand['token'], ['saveId' => 'b1']);
        $phoneCursor = $this->call('GET', '/api/saves', token: $this->bertrand['token'])['cursor'];

        $this->merge($this->addApple()['token']);
        self::assertResponseIsSuccessful();

        // The iPhone stays signed in, now in Leroy's account; its next sync starts over with the saves of both.
        $first = $this->call('GET', '/api/saves?since='.$phoneCursor, token: $this->bertrand['token']);
        self::assertResponseIsSuccessful();
        self::assertTrue($first['reset']);
        self::assertEqualsCanonicalizing(['l1', 'b1'], array_column($first['saves'], 'saveId'));
        $next = $this->call('GET', '/api/saves?since='.$first['cursor'], token: $this->bertrand['token']);
        self::assertArrayNotHasKey('reset', $next);
        self::assertSame([], $next['saves']);
        $refreshed = $this->call('POST', '/api/sessions/refresh', ['deviceToken' => $this->bertrand['deviceToken']]);
        self::assertSame(['id' => $this->leroy['id'], 'displayName' => 'Leroy'], array_intersect_key($refreshed['account'], ['id' => 0, 'displayName' => 0]));

        // The Deck's next sync from its own cursor brings the save that moved.
        $deck = $this->call('GET', '/api/saves?since='.$deckCursor, token: $this->leroy['token']);
        self::assertArrayNotHasKey('reset', $deck);
        self::assertSame(['b1'], array_column($deck['saves'], 'saveId'));
    }

    public function testAnOldOrAlteredOfferCombinesNothing(): void
    {
        $token = $this->addApple()['token'];

        $this->merge($token.'0');
        self::assertResponseStatusCodeSame(422);
        $data = $this->merge($token, $this->bertrand['token']);
        self::assertSame('combine_expired', $data['error']);
        $this->clock->sleep(11 * 60);
        $data = $this->merge($token);
        self::assertSame('combine_expired', $data['error']);
        self::assertSame('The offer to combine ran out. Add the sign-in again.', $data['message']);
        self::assertNotNull($this->em()->find(Account::class, $this->bertrand['id']));

        // A fresh offer combines once; sent again, there is nothing left to combine.
        $fresh = $this->addApple()['token'];
        $this->merge($fresh);
        self::assertResponseIsSuccessful();
        $data = $this->merge($fresh);
        self::assertResponseStatusCodeSame(410);
        self::assertSame('nothing_to_combine', $data['error']);
    }

    public function testTwoSignInsOfOneStoreAreNotCombined(): void
    {
        $this->call('POST', '/api/account/sign-ins', ['steamTicket' => 'a076561198000000002'], $this->bertrand['token']);
        self::assertResponseStatusCodeSame(201);

        $offer = $this->addApple();
        self::assertSame('steam', $offer['blockedBy']);
        self::assertArrayNotHasKey('token', $offer);
        self::assertSame('Both accounts have a Steam sign-in. Remove one of them, then add this sign-in again.', $offer['message']);

        // Even with a token, the server refuses.
        $em = $this->em();
        $token = static::getContainer()->get(CombineTokens::class)->issue($em->find(Account::class, $this->leroy['id']), $em->find(Account::class, $this->bertrand['id']));
        $data = $this->merge($token);
        self::assertResponseStatusCodeSame(409);
        self::assertSame('both_have_steam', $data['error']);
        self::assertNotNull($this->em()->find(Account::class, $this->bertrand['id']));
    }

    public function testTheSameCampaignOnBothAccountsKeepsEverySave(): void
    {
        $this->upload($this->leroy['token'], ['saveId' => 'a']);
        $this->upload($this->leroy['token'], ['saveId' => 'shared']);
        $this->call('DELETE', '/api/saves/shared', token: $this->leroy['token']);
        $this->upload($this->bertrand['token'], ['saveId' => 'b']);
        $this->upload($this->bertrand['token'], ['saveId' => 'shared']);
        $bytes = file_get_contents($this->savesDir().'/'.$this->bertrand['id'].'/camp-1/shared.phsave');

        $this->merge($this->addApple()['token']);
        self::assertResponseIsSuccessful();

        $listing = $this->call('GET', '/api/saves', token: $this->leroy['token']);
        self::assertEqualsCanonicalizing(['a', 'b', 'shared'], array_column($listing['saves'], 'saveId'));
        self::assertSame([], $listing['tombstones']);
        $this->client->request('GET', '/api/saves/shared', server: ['HTTP_AUTHORIZATION' => 'Bearer '.$this->leroy['token']]);
        self::assertSame($bytes, $this->client->getResponse()->getContent());
    }

    public function testTwoIronmanHeadsForOneCampaign(): void
    {
        $iron = ['campaignId' => 'iron', 'kind' => 'ironman', 'ironman' => true];
        $this->upload($this->leroy['token'], ['saveId' => 'i2', 'savedAt' => 1792400000000] + $iron);
        $this->upload($this->bertrand['token'], ['saveId' => 'j2', 'savedAt' => 1792500000000] + $iron);

        $this->merge($this->addApple()['token']);
        self::assertResponseIsSuccessful();

        $data = $this->upload($this->leroy['token'], ['saveId' => 'i3', 'parent' => 'i2'] + $iron);
        self::assertResponseStatusCodeSame(409);
        self::assertSame(['not_the_newest', 'j2'], [$data['error'], $data['head']]);
        $this->upload($this->leroy['token'], ['saveId' => 'j3', 'parent' => 'j2'] + $iron);
        self::assertResponseStatusCodeSame(201);
    }

    #[DataProvider('purchases')]
    public function testTwoPurchasesOnOneStore(string $leroy, string $bertrand, string $kept, string $status): void
    {
        $this->entitle($this->leroy['id'], Entitlement::APPLE, 'leroy-txn', $leroy);
        $this->entitle($this->bertrand['id'], Entitlement::APPLE, 'bertrand-txn', $bertrand);

        $data = $this->merge($this->addApple()['token']);
        self::assertResponseIsSuccessful();

        $rows = $this->em()->getRepository(Entitlement::class)->findBy(['store' => Entitlement::APPLE]);
        self::assertCount(1, $rows);
        self::assertSame([$this->leroy['id'], $kept, $status], [$rows[0]->getAccount()->getId()->toRfc4122(), $rows[0]->getReference(), $rows[0]->getStatus()]);
        self::assertSame('bertrand-txn' === $kept ? 1 : 0, $data['combined']['purchases']);
    }

    public static function purchases(): iterable
    {
        yield 'active beats refunded' => [Entitlement::REFUNDED, Entitlement::ACTIVE, 'bertrand-txn', Entitlement::ACTIVE];
        yield 'active beats revoked' => [Entitlement::ACTIVE, Entitlement::REVOKED, 'leroy-txn', Entitlement::ACTIVE];
        yield 'a tie keeps the staying account\'s' => [Entitlement::ACTIVE, Entitlement::ACTIVE, 'leroy-txn', Entitlement::ACTIVE];
        yield 'refunded beats revoked' => [Entitlement::REVOKED, Entitlement::REFUNDED, 'bertrand-txn', Entitlement::REFUNDED];
    }

    public function testCombiningOverTheQuotaKeepsEverySave(): void
    {
        $this->upload($this->leroy['token'], ['saveId' => 'l1']);
        $this->upload($this->bertrand['token'], ['saveId' => 'b1']);
        $this->em()->getConnection()->executeStatement('UPDATE cloud_save SET size = 150 * 1024 * 1024');

        $offer = $this->addApple();
        self::assertTrue($offer['account']['storageFull']);
        $this->merge($offer['token']);
        self::assertResponseIsSuccessful();

        self::assertCount(2, $this->call('GET', '/api/saves', token: $this->leroy['token'])['saves']);
        $data = $this->upload($this->leroy['token'], ['saveId' => 'next']);
        self::assertResponseStatusCodeSame(507);
        self::assertSame('quota_full', $data['error']);
    }

    public function testAnEmailOfAnotherAccountOffersToCombineOnlyWithItsPassword(): void
    {
        $this->call('POST', '/api/accounts', ['email' => 'mia@example.org', 'displayName' => 'Mia', 'password' => 'correct horse']);
        self::assertResponseStatusCodeSame(201);

        $wrong = $this->call('POST', '/api/account/sign-ins', ['email' => 'mia@example.org', 'password' => 'wrong horse!'], $this->leroy['token']);
        self::assertResponseStatusCodeSame(409);
        self::assertSame('linked_to_another_account', $wrong['error']);
        self::assertArrayNotHasKey('combine', $wrong);

        $right = $this->call('POST', '/api/account/sign-ins', ['email' => 'mia@example.org', 'password' => 'correct horse'], $this->leroy['token']);
        self::assertSame('Mia', $right['combine']['account']['displayName']);
        self::assertSame('email', $right['combine']['signIn']);
        $this->merge($right['combine']['token']);
        self::assertResponseIsSuccessful();

        $session = $this->call('POST', '/api/sessions', ['email' => 'mia@example.org', 'password' => 'correct horse', 'device' => ['name' => 'Laptop', 'platform' => 'web']]);
        self::assertSame($this->leroy['id'], $session['account']['id']);
    }

    public function testEmailTriesCountTowardTheSignInLimit(): void
    {
        $this->call('POST', '/api/accounts', ['email' => 'mia@example.org', 'displayName' => 'Mia', 'password' => 'correct horse']);
        for ($i = 0; $i < 5; ++$i) {
            $this->call('POST', '/api/account/sign-ins', ['email' => 'mia@example.org', 'password' => 'wrong horse!'], $this->leroy['token']);
        }
        $data = $this->call('POST', '/api/account/sign-ins', ['email' => 'mia@example.org', 'password' => 'correct horse'], $this->leroy['token']);
        self::assertResponseStatusCodeSame(429);
        self::assertSame('too_many_tries', $data['error']);
    }

    public function testRemovingASignInNeverTheLast(): void
    {
        $this->call('POST', '/api/account/sign-ins', ['email' => 'leroy@example.org', 'password' => 'correct horse'], $this->leroy['token']);
        self::assertResponseStatusCodeSame(201);

        $data = $this->call('DELETE', '/api/account/sign-ins/email', token: $this->leroy['token']);
        self::assertResponseIsSuccessful();
        self::assertSame(['steam'], array_column($data['signIns'], 'provider'));
        // The device stays signed in.
        $this->call('GET', '/api/account', token: $this->leroy['token']);
        self::assertResponseIsSuccessful();

        $data = $this->call('DELETE', '/api/account/sign-ins/steam', token: $this->leroy['token']);
        self::assertResponseStatusCodeSame(409);
        self::assertSame('last_sign_in', $data['error']);
        $this->call('DELETE', '/api/account/sign-ins/apple', token: $this->leroy['token']);
        self::assertResponseStatusCodeSame(404);

        // The email is free again, and the store sign-in that was removed can open a new account of its own.
        $this->call('POST', '/api/account/sign-ins', ['email' => 'leroy@example.org', 'password' => 'correct horse'], $this->leroy['token']);
        self::assertResponseStatusCodeSame(201);
        $this->call('DELETE', '/api/account/sign-ins/steam', token: $this->leroy['token']);
        self::assertResponseIsSuccessful();
        $fresh = $this->call('POST', '/api/sessions', ['steamTicket' => 'a0'.self::LEROY_STEAM, 'device' => ['name' => 'Steam Deck', 'platform' => 'steam']]);
        self::assertTrue($fresh['created']);
        self::assertNotSame($this->leroy['id'], $fresh['account']['id']);
    }

    /** The server's number is the rules' number (packages/rules/data/domain/saves.json `sign_in.combine_minutes`). */
    public function testMatchesTheSavesRules(): void
    {
        $rules = json_decode((string) file_get_contents(\dirname(__DIR__, 3).'/packages/rules/data/domain/saves.json'), true);
        self::assertSame($rules['sign_in']['combine_minutes'], static::getContainer()->getParameter('cloud.sign_in_combine_minutes'));
    }
}
