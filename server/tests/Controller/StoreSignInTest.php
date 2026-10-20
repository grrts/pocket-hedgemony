<?php

namespace App\Tests\Controller;

use App\Entity\Account;
use App\Tests\SteamOpenIdTest;
use App\Tests\StoreMock;
use App\Tests\TestKeys;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\Clock\Clock;
use Symfony\Component\Clock\MockClock;
use Symfony\Component\Clock\NativeClock;

/**
 * Signing in with Apple, Google and Steam in the browser: domain/saves/features/store-sign-in.feature
 * (SAVE-149 … SAVE-154). The stores answer from tests/StoreMock.php with keys made by TestKeys.
 */
final class StoreSignInTest extends WebTestCase
{
    private const NONCE = 'nonce-from-the-game-0001';
    private const APPLE_ID = '001234.abcd';
    private const STEAM_ID = '76561198000000003';
    private const APP_RETURN = 'pockethegemony://auth/steam';

    private KernelBrowser $client;
    private EntityManagerInterface $em;
    private MockClock $clock;
    /** @var array<string, array{mixed, mixed}> env values a test changed, to put back */
    private array $env = [];

    protected function setUp(): void
    {
        $this->clock = new MockClock('2026-10-20 12:00:00');
        Clock::set($this->clock);
        $this->client = static::createClient();
        $this->em = static::getContainer()->get(EntityManagerInterface::class);
        $tool = new SchemaTool($this->em);
        $meta = $this->em->getMetadataFactory()->getAllMetadata();
        $tool->dropSchema($meta);
        $tool->createSchema($meta);
        static::getContainer()->get('cache.rate_limiter')->clear();
        StoreMock::$calls = [];
    }

    protected function tearDown(): void
    {
        foreach ($this->env as $name => [$env, $server]) {
            $_ENV[$name] = $env;
            $_SERVER[$name] = $server;
        }
        Clock::set(new NativeClock());
        parent::tearDown();
    }

    /** The server as if its .env left this setting empty (the next request boots it afresh). */
    private function unset(string $name): void
    {
        $this->env[$name] ??= [$_ENV[$name] ?? null, $_SERVER[$name] ?? null];
        $_ENV[$name] = '';
        $_SERVER[$name] = '';
    }

    private function call(string $method, string $url, ?array $body = null, ?string $token = null): array
    {
        $server = ['CONTENT_TYPE' => 'application/json'] + ($token ? ['HTTP_AUTHORIZATION' => 'Bearer '.$token] : []);
        $this->client->request($method, $url, server: $server, content: null === $body ? null : json_encode($body));

        return json_decode($this->client->getResponse()->getContent() ?: 'null', true) ?? [];
    }

    private function now(): int
    {
        return $this->clock->now()->getTimestamp();
    }

    private function appleToken(string $sub = self::APPLE_ID, array $over = [], string $kid = 'apple-1'): string
    {
        return TestKeys::token(TestKeys::apple($sub, self::NONCE, $this->now(), $over), $kid);
    }

    private function signInApple(?string $token = null, ?string $name = 'Bertrand', string $device = 'iPhone'): array
    {
        return $this->call('POST', '/api/sessions', ['appleIdentityToken' => $token ?? $this->appleToken(), 'nonce' => self::NONCE, 'displayName' => $name, 'device' => ['name' => $device, 'platform' => 'ios']]);
    }

    private function signInGoogle(array $over = []): array
    {
        return $this->call('POST', '/api/sessions', ['googleIdToken' => TestKeys::token(TestKeys::google('1098765', self::NONCE, $this->now(), $over), 'google-1'), 'nonce' => self::NONCE, 'device' => ['name' => 'Pixel 8', 'platform' => 'android']]);
    }

    private function signInSteamTicket(string $steamId = '76561198000000001'): array
    {
        return $this->call('POST', '/api/sessions', ['steamTicket' => 'a0'.$steamId, 'displayName' => 'Deck player', 'device' => ['name' => 'Steam Deck', 'platform' => 'steam']]);
    }

    /** Runs Steam in the browser up to the redirect back to the game; returns where the browser went. */
    private function steamInTheBrowser(string $steamId = self::STEAM_ID, string $return = self::APP_RETURN, array $over = []): string
    {
        $start = $this->call('POST', '/api/sessions/steam-openid', ['return' => $return]);
        self::assertResponseIsSuccessful();
        self::assertStringStartsWith('https://steamcommunity.com/openid/login?', $start['url']);
        parse_str((string) parse_url($start['url'], \PHP_URL_QUERY), $q);
        $returnTo = $q['openid_return_to'];
        self::assertStringStartsWith('http://localhost/auth/steam/return?state=', $returnTo);
        self::assertSame('http://localhost/', $q['openid_realm']);

        $answer = SteamOpenIdTest::answer($returnTo, $steamId, $this->clock->now()->modify('-20 seconds')->format('Y-m-d\TH:i:s\Z'), $over);
        $this->client->request('GET', $returnTo.'&'.http_build_query($answer));
        self::assertResponseStatusCodeSame(302);

        return (string) $this->client->getResponse()->headers->get('Location');
    }

    private static function codeIn(string $location): string
    {
        parse_str((string) parse_url($location, \PHP_URL_QUERY), $q);

        return (string) ($q['steamCode'] ?? '');
    }

    private function exchange(string $code): array
    {
        return $this->call('POST', '/api/sessions', ['steamOpenIdCode' => $code, 'device' => ['name' => 'iPhone', 'platform' => 'ios']]);
    }

    public function testTheFirstSignInWithAppleMakesTheAccount(): void
    {
        $data = $this->signInApple();
        self::assertResponseStatusCodeSame(201);
        self::assertTrue($data['created']);
        self::assertSame('Bertrand', $data['account']['displayName']);
        self::assertNull($data['account']['email']);
        self::assertStringStartsWith('pha_', $data['accessToken']);

        // Apple gives the name only the first time; the account keeps it.
        $again = $this->signInApple(name: null, device: 'iPad');
        self::assertResponseStatusCodeSame(200);
        self::assertSame($data['account']['id'], $again['account']['id']);
        self::assertSame('Bertrand', $again['account']['displayName']);
        $card = $this->call('GET', '/api/account', token: $again['accessToken']);
        self::assertSame([['provider' => 'apple', 'label' => self::APPLE_ID]], $card['signIns']);
        self::assertSame([['GET', 'https://appleid.apple.com/auth/keys']], array_slice(StoreMock::$calls, 0, 1));
    }

    public function testGoogleNamesTheAccount(): void
    {
        $data = $this->signInGoogle();
        self::assertResponseStatusCodeSame(201);
        self::assertSame('Bertrand', $data['account']['displayName']);
        $card = $this->call('GET', '/api/account', token: $data['accessToken']);
        self::assertSame([['provider' => 'google', 'label' => '1098765']], $card['signIns']);
    }

    public function testATokenTheServerDoesNotAcceptMakesNoAccount(): void
    {
        foreach ([
            $this->appleToken(over: ['aud' => 'com.someone.else']),
            $this->appleToken(over: ['exp' => $this->now() - 120]),
            $this->appleToken(over: ['iss' => 'https://accounts.google.com']),
            $this->appleToken(kid: 'stranger'),
            $this->appleToken(over: ['nonce' => hash('sha256', 'another')]),
        ] as $token) {
            $data = $this->signInApple($token);
            self::assertResponseStatusCodeSame(401);
            self::assertSame(['error' => 'apple_refused', 'message' => 'Apple did not accept the sign-in.'], $data);
        }
        $data = $this->signInGoogle(['aud' => 'someone-else.apps.googleusercontent.com']);
        self::assertResponseStatusCodeSame(401);
        self::assertSame('Google did not accept the sign-in.', $data['message']);
        self::assertSame(0, $this->em->getRepository(Account::class)->count([]));
    }

    public function testATokenNeedsItsNonce(): void
    {
        $this->call('POST', '/api/sessions', ['appleIdentityToken' => $this->appleToken(), 'device' => ['name' => 'iPhone', 'platform' => 'ios']]);
        self::assertResponseStatusCodeSame(422);
    }

    public function testSteamInTheBrowserSheet(): void
    {
        $location = $this->steamInTheBrowser();
        self::assertStringStartsWith(self::APP_RETURN.'?steamCode=phs_', $location);
        self::assertContains(['POST', 'https://steamcommunity.com/openid/login'], StoreMock::$calls);

        $data = $this->exchange(self::codeIn($location));
        self::assertResponseStatusCodeSame(201);
        self::assertSame('Player', $data['account']['displayName']);
        $card = $this->call('GET', '/api/account', token: $data['accessToken']);
        self::assertSame([['provider' => 'steam', 'label' => self::STEAM_ID]], $card['signIns']);
    }

    public function testSteamInTheBrowserOpensTheAccountTheSteamDeckMade(): void
    {
        $deck = $this->signInSteamTicket(self::STEAM_ID);
        $phone = $this->exchange(self::codeIn($this->steamInTheBrowser()));
        self::assertResponseStatusCodeSame(200);
        self::assertSame($deck['account']['id'], $phone['account']['id']);
    }

    public function testACodeWorksOnceAndForFiveMinutes(): void
    {
        $code = self::codeIn($this->steamInTheBrowser());
        $this->exchange($code);
        self::assertResponseStatusCodeSame(201);
        $data = $this->exchange($code);
        self::assertResponseStatusCodeSame(401);
        self::assertSame('sign_in_expired', $data['error']);

        // Steam's next answer carries a nonce of its own.
        $this->clock->sleep(1);
        $late = self::codeIn($this->steamInTheBrowser('76561198000000004'));
        self::assertNotSame('', $late);
        $this->clock->sleep(6 * 60);
        $this->exchange($late);
        self::assertResponseStatusCodeSame(401);
        $this->exchange('phs_made_up');
        self::assertResponseStatusCodeSame(401);
    }

    public function testTheSameAnswerFromSteamIsTakenOnce(): void
    {
        $start = $this->call('POST', '/api/sessions/steam-openid', ['return' => self::APP_RETURN]);
        parse_str((string) parse_url($start['url'], \PHP_URL_QUERY), $q);
        $url = $q['openid_return_to'].'&'.http_build_query(SteamOpenIdTest::answer($q['openid_return_to'], self::STEAM_ID, '2026-10-20T11:59:50Z'));
        $this->client->request('GET', $url);
        self::assertNotSame('', self::codeIn((string) $this->client->getResponse()->headers->get('Location')));
        $this->client->request('GET', $url);
        self::assertSame(self::APP_RETURN.'?steamError=steam_refused', $this->client->getResponse()->headers->get('Location'));
    }

    public function testAnAnswerSteamDoesNotConfirmSendsNoCode(): void
    {
        $location = $this->steamInTheBrowser(over: ['openid.sig' => 'forged']);
        self::assertSame(self::APP_RETURN.'?steamError=steam_refused', $location);
    }

    public function testTheWebGameComesBackToItsPage(): void
    {
        $location = $this->steamInTheBrowser(return: 'http://localhost:5173/?shared=ABCD');
        self::assertStringStartsWith('http://localhost:5173/?shared=ABCD&steamCode=phs_', $location);
    }

    public function testOnlyTheGamesOwnReturnAddresses(): void
    {
        $data = $this->call('POST', '/api/sessions/steam-openid', ['return' => 'https://evil.example/']);
        self::assertResponseStatusCodeSame(422);
        self::assertSame('return_not_allowed', $data['error']);

        $this->client->request('GET', '/auth/steam/return?state=forged.0000&openid.mode=id_res');
        self::assertResponseStatusCodeSame(400);
        self::assertStringContainsString('Go back to Pocket Hegemony', (string) $this->client->getResponse()->getContent());
    }

    public function testAddingAppleAndGoogleToASteamAccount(): void
    {
        $steam = $this->signInSteamTicket();
        $this->call('POST', '/api/account/sign-ins', ['appleIdentityToken' => $this->appleToken(), 'nonce' => self::NONCE], $steam['accessToken']);
        self::assertResponseStatusCodeSame(201);
        $data = $this->call('POST', '/api/account/sign-ins', ['googleIdToken' => TestKeys::token(TestKeys::google('1098765', self::NONCE, $this->now()), 'google-1'), 'nonce' => self::NONCE], $steam['accessToken']);
        self::assertResponseStatusCodeSame(201);
        self::assertSame(['steam', 'apple', 'google'], array_column($data['signIns'], 'provider'));

        $apple = $this->signInApple();
        self::assertResponseStatusCodeSame(200);
        self::assertSame($steam['account']['id'], $apple['account']['id']);
        self::assertSame($steam['account']['id'], $this->signInGoogle()['account']['id']);

        // Adding the same one again changes nothing; a second Apple id is refused.
        $this->call('POST', '/api/account/sign-ins', ['appleIdentityToken' => $this->appleToken(), 'nonce' => self::NONCE], $steam['accessToken']);
        self::assertResponseStatusCodeSame(200);
        $data = $this->call('POST', '/api/account/sign-ins', ['appleIdentityToken' => $this->appleToken('009999.other'), 'nonce' => self::NONCE], $steam['accessToken']);
        self::assertResponseStatusCodeSame(409);
        self::assertSame('already_has_apple', $data['error']);
    }

    public function testAddingSteamFromTheBrowserToAnAppleAccount(): void
    {
        $apple = $this->signInApple();
        $code = self::codeIn($this->steamInTheBrowser());
        $data = $this->call('POST', '/api/account/sign-ins', ['steamOpenIdCode' => $code], $apple['accessToken']);
        self::assertResponseStatusCodeSame(201);
        self::assertSame(['apple', 'steam'], array_column($data['signIns'], 'provider'));
    }

    public function testAStoreSignInBelongsToOneAccount(): void
    {
        $this->signInApple();
        $other = $this->signInSteamTicket();
        $data = $this->call('POST', '/api/account/sign-ins', ['appleIdentityToken' => $this->appleToken(), 'nonce' => self::NONCE], $other['accessToken']);
        self::assertResponseStatusCodeSame(409);
        self::assertSame('linked_to_another_account', $data['error']);
    }

    public function testWithoutAppleClientIdsSignInWithAppleIsNotAvailable(): void
    {
        $this->unset('APPLE_CLIENT_IDS');
        $data = $this->signInApple();
        self::assertResponseStatusCodeSame(503);
        self::assertSame(['error' => 'apple_unavailable', 'message' => 'Sign in with Apple is not available.'], $data);
        $this->signInGoogle();
        self::assertResponseStatusCodeSame(201);
    }

    public function testWithoutGoogleClientIdsGoogleSignInIsNotAvailable(): void
    {
        $this->unset('GOOGLE_CLIENT_IDS');
        $data = $this->signInGoogle();
        self::assertResponseStatusCodeSame(503);
        self::assertSame(['error' => 'google_unavailable', 'message' => 'Google sign-in is not available.'], $data);
        $this->signInApple();
        self::assertResponseStatusCodeSame(201);
    }

    public function testWithoutReturnAddressesSteamInTheBrowserIsNotAvailable(): void
    {
        $this->unset('SIGN_IN_RETURN_URLS');
        $data = $this->call('POST', '/api/sessions/steam-openid', ['return' => self::APP_RETURN]);
        self::assertResponseStatusCodeSame(503);
        self::assertSame(['error' => 'steam_unavailable', 'message' => 'Steam sign-in is not available.'], $data);
        // Email sign-in keeps working.
        $this->call('POST', '/api/accounts', ['email' => 'player@example.org', 'displayName' => 'Player', 'password' => 'correct horse']);
        $this->call('POST', '/api/sessions', ['email' => 'player@example.org', 'password' => 'correct horse', 'device' => ['name' => 'Browser', 'platform' => 'web']]);
        self::assertResponseIsSuccessful();
    }

    /** The server's numbers are the rules' numbers (packages/rules/data/domain/saves.json). */
    public function testMatchesTheSavesRules(): void
    {
        $rules = json_decode((string) file_get_contents(\dirname(__DIR__, 3).'/packages/rules/data/domain/saves.json'), true);
        $container = static::getContainer();
        self::assertSame($rules['sign_in']['token_leeway_seconds'], $container->getParameter('cloud.sign_in_leeway_seconds'));
        self::assertSame($rules['sign_in']['browser_code_minutes'], $container->getParameter('cloud.sign_in_code_minutes'));
        self::assertStringContainsString($rules['sign_in']['app_return'], (string) ($_ENV['SIGN_IN_RETURN_URLS'] ?? ''));
    }
}
