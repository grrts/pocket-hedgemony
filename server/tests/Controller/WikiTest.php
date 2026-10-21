<?php

namespace App\Tests\Controller;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

final class WikiTest extends WebTestCase
{
    public function testShowsTheHomePageWithEveryGroupInTheSidebar(): void
    {
        $client = static::createClient();
        $crawler = $client->request('GET', '/wiki');

        self::assertResponseIsSuccessful();
        self::assertSelectorTextContains('.prose h1', 'Pocket Hegemony wiki');
        self::assertSelectorTextContains('.pages', 'Start here');
        self::assertGreaterThan(20, $crawler->filter('.pages li a')->count());
    }

    public function testShowsAPageWithItsContentsAndLinksBetweenPages(): void
    {
        $client = static::createClient();
        $crawler = $client->request('GET', '/wiki/Trade');

        self::assertResponseIsSuccessful();
        self::assertSelectorTextContains('title', 'Trade');
        self::assertSelectorExists('.pages a.on[href="/wiki/Trade"]');
        self::assertSelectorExists('.toc a[href="#how-it-works"]');
        self::assertSelectorExists('.prose h2#how-it-works');
        self::assertGreaterThan(0, $crawler->filter('.prose a[href^="/wiki/"]')->count());
    }

    public function testShowsTheGamesConfigAsDataPages(): void
    {
        $client = static::createClient();
        $crawler = $client->request('GET', '/wiki/Data-Warfare');

        self::assertResponseIsSuccessful();
        self::assertSelectorTextContains('.prose h1', 'Warfare data');
        self::assertSelectorExists('.prose h2#arms');
        self::assertStringContainsString('levy foot', $crawler->filter('.prose')->text());
        self::assertSelectorExists('.prose a[href="/wiki/Data-Research#inventions"]');

        $crawler = $client->request('GET', '/wiki/Game-Data');
        self::assertResponseIsSuccessful();
        self::assertGreaterThan(20, $crawler->filter('.prose a[href^="/wiki/Data-"]')->count());
    }

    public function testSendsOtherSpellingsToThePage(): void
    {
        $client = static::createClient();
        $client->request('GET', '/wiki/trade');
        self::assertResponseRedirects('/wiki/Trade', 301);

        $client->request('GET', '/wiki/Home');
        self::assertResponseRedirects('/wiki', 301);

        $client->request('GET', '/wiki/No-Such-Page');
        self::assertResponseStatusCodeSame(404);
    }

    public function testAMissingPageGetsTheSitesOwnErrorPage(): void
    {
        $client = static::createClient(['debug' => false]);
        $client->request('GET', '/wiki/No-Such-Page');

        self::assertResponseStatusCodeSame(404);
        self::assertSelectorTextContains('h1', 'Lost at sea');
    }

    public function testSearchFindsPagesByEveryWord(): void
    {
        $client = static::createClient();
        $crawler = $client->request('GET', '/wiki/search?q=siege');

        self::assertResponseIsSuccessful();
        $titles = $crawler->filter('.hits li > a')->each(fn ($a) => $a->text());
        self::assertContains('Warfare', $titles);

        $client->request('GET', '/wiki/search?q=zzqqxx');
        self::assertSelectorTextContains('.sheet', 'No page mentions');
    }

    public function testEveryLinkBetweenWikiPagesLeadsToAPage(): void
    {
        $client = static::createClient();
        $pages = array_map(fn ($f) => basename($f, '.html'), glob(\dirname(__DIR__, 2).'/wiki/pages/*.html'));
        foreach ($pages as $page) {
            $html = (string) file_get_contents(\dirname(__DIR__, 2).'/wiki/pages/'.$page.'.html');
            preg_match_all('#href="/wiki/([A-Za-z0-9-]+)#', $html, $m);
            foreach (array_unique($m[1]) as $target) {
                self::assertContains($target, $pages, "$page links to the missing page $target");
            }
        }
    }
}
