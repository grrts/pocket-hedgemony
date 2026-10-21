<?php

namespace App\Controller;

use Doctrine\DBAL\Connection;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * The load balancer's check (docs/deploy.md): 200 while this app server can reach the database,
 * 503 otherwise, so traffic moves to the servers that can. Save storage is left out on purpose:
 * a bucket outage hits every server alike, and taking them all out would also stop the website.
 */
final class HealthController
{
    #[Route('/api/health', name: 'health', methods: ['GET', 'HEAD'])]
    public function __invoke(Connection $db): JsonResponse
    {
        try {
            $db->executeQuery('SELECT 1')->fetchOne();
        } catch (\Throwable) {
            return new JsonResponse(['status' => 'database unreachable'], Response::HTTP_SERVICE_UNAVAILABLE, ['Cache-Control' => 'no-store']);
        }

        return new JsonResponse(['status' => 'ok'], Response::HTTP_OK, ['Cache-Control' => 'no-store']);
    }
}
