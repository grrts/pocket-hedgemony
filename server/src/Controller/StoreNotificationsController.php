<?php

namespace App\Controller;

use App\Entity\Entitlement;
use App\Purchases\Entitlements;
use App\Purchases\PurchaseRefused;
use App\Purchases\StoreUnavailable;
use Psr\Log\LoggerInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * The stores tell the server about refunds and revocations (domain/saves SAVE-176, SAVE-177):
 * App Store Server Notifications V2, and Google Play's real-time developer notifications pushed by Pub/Sub.
 * Neither needs a signed-in player; each is trusted only once it passes its own check.
 */
final class StoreNotificationsController
{
    public function __construct(
        private readonly Entitlements $entitlements,
        private readonly LoggerInterface $logger,
        #[Autowire('%env(GOOGLE_PUBSUB_PUSH_TOKEN)%')] private readonly string $pushToken,
    ) {
    }

    #[Route('/api/stores/apple/notifications', name: 'store_apple_notifications', methods: ['POST'])]
    public function apple(Request $request): Response
    {
        $data = json_decode($request->getContent(), true);
        $signed = \is_array($data) && \is_string($data['signedPayload'] ?? null) ? $data['signedPayload'] : '';
        try {
            $done = $this->entitlements->appleNotification($signed);
        } catch (StoreUnavailable $e) {
            return self::unavailable($e);
        } catch (PurchaseRefused $e) {
            $this->logger->warning('App Store notification refused: {why}', ['why' => $e->getMessage()]);

            return new JsonResponse(['error' => $e->reason], Response::HTTP_BAD_REQUEST);
        }
        $this->logger->info('App Store notification: {done}', ['done' => $done]);

        return new JsonResponse(['done' => $done]);
    }

    #[Route('/api/stores/google/notifications', name: 'store_google_notifications', methods: ['POST'])]
    public function google(Request $request): Response
    {
        if ('' === trim($this->pushToken)) {
            return self::unavailable(new StoreUnavailable(Entitlement::GOOGLE));
        }
        if (!hash_equals($this->pushToken, (string) $request->query->get('token', ''))) {
            return new JsonResponse(['error' => 'forbidden'], Response::HTTP_FORBIDDEN);
        }
        $push = json_decode($request->getContent(), true);
        $text = \is_array($push) && \is_string($push['message']['data'] ?? null) ? base64_decode($push['message']['data'], true) : false;
        $notification = false === $text ? null : json_decode($text, true);
        if (!\is_array($notification)) {
            // Pub/Sub would resend it for ever; a push nobody can read is dropped with a note in the log.
            $this->logger->warning('Google Play notification not readable');

            return new Response(status: Response::HTTP_NO_CONTENT);
        }
        try {
            $done = $this->entitlements->googleNotification($notification);
        } catch (StoreUnavailable $e) {
            // Play could not be reached: an error makes Pub/Sub send it again later.
            return self::unavailable($e);
        } catch (PurchaseRefused $e) {
            $this->logger->warning('Google Play notification refused: {why}', ['why' => $e->getMessage()]);

            return new JsonResponse(['error' => $e->reason], Response::HTTP_FORBIDDEN);
        }
        $this->logger->info('Google Play notification: {done}', ['done' => $done]);

        return new Response(status: Response::HTTP_NO_CONTENT);
    }

    private static function unavailable(StoreUnavailable $e): JsonResponse
    {
        return new JsonResponse(['error' => $e->unreachable ? 'store_unreachable' : 'store_unavailable', 'message' => $e->getMessage()], Response::HTTP_SERVICE_UNAVAILABLE);
    }
}
