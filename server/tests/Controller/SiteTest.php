<?php

namespace App\Tests\Controller;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

final class SiteTest extends WebTestCase
{
    private const SETTINGS = ['PLAY_URL', 'STORE_APP_STORE_URL', 'STORE_GOOGLE_PLAY_URL', 'STORE_STEAM_URL', 'SUPPORT_EMAIL'];

    /** @var array<string, mixed> the settings as they were before the test */
    private array $saved = [];

    protected function setUp(): void
    {
        foreach (self::SETTINGS as $name) {
            $this->saved[$name] = $_ENV[$name] ?? null;
        }
    }

    protected function tearDown(): void
    {
        foreach ($this->saved as $name => $value) {
            $this->set($name, $value ?? '');
        }
        parent::tearDown();
    }

    public function testTheLandingPageSellsTheGame(): void
    {
        $client = static::createClient();
        $crawler = $client->request('GET', '/');

        self::assertResponseIsSuccessful();
        self::assertSelectorTextContains('h1', 'Pocket Hegemony');
        self::assertSelectorTextContains('.pitch', '1378 to 1939');
        self::assertSelectorExists('link[href="/site/home.css"]');
        self::assertGreaterThanOrEqual(4, $crawler->filter('section.feature')->count());
        self::assertGreaterThanOrEqual(4, $crawler->filter('.feature img[src^="/site/shots/"]')->count());
        self::assertSelectorTextContains('.plays', 'One week per turn');
        self::assertSelectorExists('.closing');
    }

    public function testEveryScreenshotOnThePagesExists(): void
    {
        $client = static::createClient();
        $public = \dirname(__DIR__, 2).'/public';
        foreach (['/', '/press'] as $url) {
            $crawler = $client->request('GET', $url);
            $images = $crawler->filter('img[src^="/site/"]')->each(fn ($img) => (string) $img->attr('src'));
            self::assertNotEmpty($images);
            foreach ($images as $src) {
                self::assertFileExists($public.$src, "$url shows the missing image $src");
            }
        }
    }

    public function testWithoutAPlayAddressItSaysComingSoonAndShowsNoStores(): void
    {
        foreach (self::SETTINGS as $name) {
            $this->set($name, '');
        }
        $client = static::createClient();
        $crawler = $client->request('GET', '/');

        self::assertResponseIsSuccessful();
        self::assertSelectorNotExists('a.play');
        self::assertSelectorTextContains('.hero .soon', 'Coming soon');
        self::assertSelectorNotExists('.btn.store');
        self::assertSame(0, $crawler->filter('.bar-nav a.btn.wax')->count());
    }

    public function testThePlayAndStoreButtonsAppearOnceTheirAddressesAreSet(): void
    {
        $this->set('PLAY_URL', 'https://play.example.test/');
        $this->set('STORE_APP_STORE_URL', 'https://apps.example.test/ph');
        $this->set('STORE_GOOGLE_PLAY_URL', '');
        $this->set('STORE_STEAM_URL', 'https://steam.example.test/ph');
        $client = static::createClient();
        $crawler = $client->request('GET', '/');

        self::assertResponseIsSuccessful();
        self::assertSelectorNotExists('.soon');
        self::assertSelectorTextContains('.hero a.play', 'Play free in your browser');
        self::assertSame('https://play.example.test/', $crawler->filter('.hero a.play')->attr('href'));
        self::assertSame('https://apps.example.test/ph', $crawler->filter('.hero [data-store="app-store"]')->attr('href'));
        self::assertSame('https://steam.example.test/ph', $crawler->filter('.hero [data-store="steam"]')->attr('href'));
        self::assertSelectorNotExists('[data-store="google-play"]');
    }

    public function testEveryWikiLinkOnTheSiteLeadsToAPage(): void
    {
        $client = static::createClient();
        $links = [];
        foreach (['/', '/press', '/privacy'] as $url) {
            $crawler = $client->request('GET', $url);
            self::assertResponseIsSuccessful();
            foreach ($crawler->filter('a[href^="/wiki"]')->each(fn ($a) => (string) $a->attr('href')) as $href) {
                $links[$href] = $url;
            }
        }
        self::assertGreaterThanOrEqual(8, \count($links));
        foreach ($links as $href => $from) {
            $client->request('GET', $href);
            self::assertSame(200, $client->getResponse()->getStatusCode(), "$from links to $href, which does not open a page");
        }
    }

    public function testThePressKitHasTheFactsAndDownloads(): void
    {
        $client = static::createClient();
        $crawler = $client->request('GET', '/press');

        self::assertResponseIsSuccessful();
        self::assertSelectorTextContains('title', 'Press kit');
        self::assertSelectorTextContains('.facts', '20 September 1378 to 31 August 1939');
        self::assertSelectorExists('#short');
        self::assertSelectorExists('#long');
        self::assertGreaterThanOrEqual(6, $crawler->filter('.downloads a[download][href$=".webp"]')->count());
        self::assertSelectorExists('.downloads a[download][href="/site/shots/logo.png"]');
    }

    public function testThePrivacyPolicySaysWhatTheServerStores(): void
    {
        $this->set('SUPPORT_EMAIL', '');
        $client = static::createClient();
        $crawler = $client->request('GET', '/privacy');

        self::assertResponseIsSuccessful();
        foreach (['email address', 'display name', 'one-way hash', 'date the account was made', 'ads removed', 'random number', 'sets no cookies'] as $text) {
            self::assertStringContainsString($text, $crawler->filter('.prose')->text());
        }
        self::assertSelectorNotExists('a[href^="mailto:"]');
    }

    public function testTheSupportAddressShowsOnlyWhenSet(): void
    {
        $this->set('SUPPORT_EMAIL', 'help@example.test');
        $client = static::createClient();

        $client->request('GET', '/privacy');
        self::assertSelectorExists('.prose a[href="mailto:help@example.test"]');
        $client->request('GET', '/press');
        self::assertSelectorExists('.facts a[href="mailto:help@example.test"]');
    }

    public function testTheFooterLinksEveryPage(): void
    {
        $client = static::createClient();
        $crawler = $client->request('GET', '/wiki');

        $footer = $crawler->filter('.foot a')->each(fn ($a) => (string) $a->attr('href'));
        self::assertContains('/press', $footer);
        self::assertContains('/privacy', $footer);
        self::assertSelectorExists('.bar a.brand[href="/"]');
    }

    private function set(string $name, string $value): void
    {
        $_ENV[$name] = $value;
        $_SERVER[$name] = $value;
    }
}
