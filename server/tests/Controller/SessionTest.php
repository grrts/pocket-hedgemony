<?php

namespace App\Tests\Controller;

use App\Entity\Account;
use App\Entity\Device;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\Clock\Clock;
use Symfony\Component\Clock\MockClock;

/** Signing the game in: domain/saves/features/sign-in.feature (SAVE-112 … SAVE-118). */
final class SessionTest extends WebTestCase
{
    private const STEAM_ID = '76561198000000001';

    private KernelBrowser $client;
    private EntityManagerInterface $em;
    private MockClock $clock;

    protected function setUp(): void
    {
        $this->clock = new MockClock('2026-10-19 12:00:00');
        Clock::set($this->clock);
        $this->client = static::createClient();
        $this->em = static::getContainer()->get(EntityManagerInterface::class);
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

    private function call(string $method, string $url, ?array $body = null, ?string $token = null): array
    {
        $server = ['CONTENT_TYPE' => 'application/json'] + ($token ? ['HTTP_AUTHORIZATION' => 'Bearer '.$token] : []);
        $this->client->request($method, $url, server: $server, content: null === $body ? null : json_encode($body));

        return json_decode($this->client->getResponse()->getContent() ?: 'null', true) ?? [];
    }

    private function register(string $email = 'player@example.org', string $password = 'correct horse'): void
    {
        $this->call('POST', '/api/accounts', ['email' => $email, 'displayName' => 'Player', 'password' => $password]);
        self::assertResponseStatusCodeSame(201);
    }

    private function signInEmail(string $device = 'Pixel 8', string $password = 'correct horse'): array
    {
        return $this->call('POST', '/api/sessions', ['email' => 'Player@Example.org', 'password' => $password, 'device' => ['name' => $device, 'platform' => 'android']]);
    }

    private function signInSteam(string $steamId = self::STEAM_ID, string $device = 'Steam Deck', ?string $name = 'Bertrand'): array
    {
        return $this->call('POST', '/api/sessions', ['steamTicket' => 'a0'.$steamId, 'displayName' => $name, 'device' => ['name' => $device, 'platform' => 'steam']]);
    }

    public function testEmailSignInReturnsThePairAndKeepsOnlyHashes(): void
    {
        $this->register();
        $data = $this->signInEmail();
        self::assertResponseIsSuccessful();
        self::assertFalse($data['created']);
        self::assertSame(900, $data['accessTokenExpiresIn']);
        self::assertStringStartsWith('pha_', $data['accessToken']);
        self::assertStringStartsWith('phd_', $data['deviceToken']);
        self::assertSame('player@example.org', $data['account']['email']);

        $device = $this->em->getRepository(Device::class)->find($data['deviceId']);
        $row = $this->em->getConnection()->fetchAssociative('SELECT * FROM device');
        self::assertNotNull($device);
        self::assertNotContains($data['accessToken'], $row);
        self::assertNotContains($data['deviceToken'], $row);
        self::assertSame(hash('sha256', $data['deviceToken']), $row['device_token_hash']);
    }

    public function testWrongPasswordIsRefused(): void
    {
        $this->register();
        $data = $this->signInEmail(password: 'wrong horse');
        self::assertResponseStatusCodeSame(401);
        self::assertSame('wrong_email_or_password', $data['error']);
    }

    public function testFiveWrongPasswordsLockTheAddress(): void
    {
        $this->register();
        for ($i = 0; $i < 5; ++$i) {
            $this->signInEmail(password: 'wrong horse');
            self::assertResponseStatusCodeSame(401);
        }
        $data = $this->signInEmail();
        self::assertResponseStatusCodeSame(429);
        self::assertSame('too_many_tries', $data['error']);
    }

    public function testTheFirstSteamSignInMakesTheAccount(): void
    {
        $data = $this->signInSteam();
        self::assertResponseStatusCodeSame(201);
        self::assertTrue($data['created']);
        self::assertSame('Bertrand', $data['account']['displayName']);
        self::assertNull($data['account']['email']);

        $again = $this->signInSteam(device: 'Gaming PC');
        self::assertResponseStatusCodeSame(200);
        self::assertFalse($again['created']);
        self::assertSame($data['account']['id'], $again['account']['id']);

        $account = $this->call('GET', '/api/account', token: $again['accessToken']);
        self::assertSame([['provider' => 'steam', 'label' => self::STEAM_ID]], $account['signIns']);
        self::assertEqualsCanonicalizing(['Steam Deck', 'Gaming PC'], array_column($account['devices'], 'name'));
        self::assertSame([false, true], array_column($account['devices'], 'current'));
    }

    public function testASteamNameThatDoesNotFitBecomesPlayer(): void
    {
        $data = $this->signInSteam(name: 'x');
        self::assertSame('Player', $data['account']['displayName']);
    }

    public function testASteamTicketSteamRefusesMakesNoAccount(): void
    {
        $data = $this->call('POST', '/api/sessions', ['steamTicket' => 'bad0', 'device' => ['name' => 'Deck', 'platform' => 'steam']]);
        self::assertResponseStatusCodeSame(401);
        self::assertSame('steam_refused', $data['error']);
        self::assertSame('Steam did not accept the sign-in.', $data['message']);
        self::assertSame(0, $this->em->getRepository(Account::class)->count([]));
    }

    public function testRefreshTurnsTheDeviceTokenOver(): void
    {
        $first = $this->signInSteam();
        $next = $this->call('POST', '/api/sessions/refresh', ['deviceToken' => $first['deviceToken']]);
        self::assertResponseIsSuccessful();
        self::assertNotSame($first['deviceToken'], $next['deviceToken']);
        self::assertNotSame($first['accessToken'], $next['accessToken']);
        self::assertSame($first['deviceId'], $next['deviceId']);

        $this->call('POST', '/api/sessions/refresh', ['deviceToken' => $first['deviceToken']]);
        self::assertResponseStatusCodeSame(401);
        $this->call('GET', '/api/account', token: $first['accessToken']);
        self::assertResponseStatusCodeSame(401);
        $this->call('GET', '/api/account', token: $next['accessToken']);
        self::assertResponseIsSuccessful();
    }

    public function testTheAccessTokenLastsFifteenMinutes(): void
    {
        $data = $this->signInSteam();
        $this->clock->sleep(14 * 60);
        $this->call('GET', '/api/account', token: $data['accessToken']);
        self::assertResponseIsSuccessful();
        $this->clock->sleep(60);
        $answer = $this->call('GET', '/api/account', token: $data['accessToken']);
        self::assertResponseStatusCodeSame(401);
        self::assertSame('invalid_token', $answer['error']);
    }

    public function testTheAccountNeedsASignIn(): void
    {
        $data = $this->call('GET', '/api/account');
        self::assertResponseStatusCodeSame(401);
        self::assertSame('sign_in_needed', $data['error']);
    }

    public function testSigningOutAnotherDeviceEndsItAtOnce(): void
    {
        $deck = $this->signInSteam(device: 'Steam Deck');
        $phone = $this->signInSteam(device: 'Pixel 8');
        $this->call('DELETE', '/api/devices/'.$phone['deviceId'], token: $deck['accessToken']);
        self::assertResponseStatusCodeSame(204);

        $this->call('GET', '/api/account', token: $phone['accessToken']);
        self::assertResponseStatusCodeSame(401);
        $this->call('POST', '/api/sessions/refresh', ['deviceToken' => $phone['deviceToken']]);
        self::assertResponseStatusCodeSame(401);
        $account = $this->call('GET', '/api/account', token: $deck['accessToken']);
        self::assertSame(['Steam Deck'], array_column($account['devices'], 'name'));
    }

    public function testADeviceOfAnotherAccountCannotBeSignedOut(): void
    {
        $mine = $this->signInSteam();
        $theirs = $this->signInSteam(steamId: '76561198000000002');
        $this->call('DELETE', '/api/devices/'.$theirs['deviceId'], token: $mine['accessToken']);
        self::assertResponseStatusCodeSame(404);
    }

    public function testOneAccountHoldsSteamAndEmail(): void
    {
        $steam = $this->signInSteam();
        $data = $this->call('POST', '/api/account/sign-ins', ['email' => 'player@example.org', 'password' => 'correct horse'], $steam['accessToken']);
        self::assertResponseStatusCodeSame(201);
        self::assertSame(['email', 'steam'], array_column($data['signIns'], 'provider'));

        $email = $this->signInEmail();
        self::assertResponseIsSuccessful();
        self::assertSame($steam['account']['id'], $email['account']['id']);
    }

    public function testASteamAccountBelongsToOneAccount(): void
    {
        $this->signInSteam();
        $this->register();
        $email = $this->signInEmail();
        $data = $this->call('POST', '/api/account/sign-ins', ['steamTicket' => 'a0'.self::STEAM_ID], $email['accessToken']);
        self::assertResponseStatusCodeSame(409);
        self::assertSame('linked_to_another_account', $data['error']);
    }

    public function testAnEmailBelongsToOneAccount(): void
    {
        $this->register();
        $steam = $this->signInSteam();
        $data = $this->call('POST', '/api/account/sign-ins', ['email' => 'player@example.org', 'password' => 'another horse'], $steam['accessToken']);
        self::assertResponseStatusCodeSame(409);
        self::assertSame('linked_to_another_account', $data['error']);
    }

    public function testRejectsAnUnknownPlatform(): void
    {
        $this->call('POST', '/api/sessions', ['steamTicket' => 'a0'.self::STEAM_ID, 'device' => ['name' => 'Fridge', 'platform' => 'fridge']]);
        self::assertResponseStatusCodeSame(422);
    }

    /** The server's numbers are the rules' numbers (packages/rules/data/domain/saves.json). */
    public function testMatchesTheSavesRules(): void
    {
        $rules = json_decode((string) file_get_contents(\dirname(__DIR__, 3).'/packages/rules/data/domain/saves.json'), true);
        $container = static::getContainer();
        self::assertSame($rules['cloud']['server']['access_token_minutes'], $container->getParameter('cloud.access_token_minutes'));
        self::assertSame($rules['sign_in']['steam_ticket_identity'], $container->getParameter('cloud.steam_ticket_identity'));
    }
}
