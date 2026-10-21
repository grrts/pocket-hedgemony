<?php

namespace App\Tests\Controller;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

/** The load balancer's check (docs/deploy.md). */
final class HealthTest extends WebTestCase
{
    public function testHealthyWhileTheDatabaseAnswers(): void
    {
        $client = static::createClient();
        $client->request('GET', '/api/health');

        self::assertResponseIsSuccessful();
        self::assertSame(['status' => 'ok'], json_decode((string) $client->getResponse()->getContent(), true));
        self::assertResponseHeaderSame('Cache-Control', 'no-store, private');
    }
}
