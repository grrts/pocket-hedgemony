<?php

namespace App\EventSubscriber;

use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\Event\ResponseEvent;
use Symfony\Component\HttpKernel\KernelEvents;

/**
 * The game runs on origins the API doesn't share (app://game in Electron,
 * capacitor://localhost on iOS, https://localhost on Android), so /api
 * answers CORS for the origins listed in CORS_ALLOW_ORIGINS.
 */
final class CorsSubscriber implements EventSubscriberInterface
{
    /** @var list<string> */
    private array $allowed;

    public function __construct(#[Autowire('%env(CORS_ALLOW_ORIGINS)%')] string $allowedOrigins)
    {
        $this->allowed = array_values(array_filter(array_map('trim', explode(',', $allowedOrigins))));
    }

    public static function getSubscribedEvents(): array
    {
        return [
            KernelEvents::REQUEST => ['onRequest', 250],
            KernelEvents::RESPONSE => 'onResponse',
        ];
    }

    public function onRequest(RequestEvent $event): void
    {
        $request = $event->getRequest();
        if ($event->isMainRequest() && 'OPTIONS' === $request->getMethod() && $this->allowedOrigin($request->headers->get('Origin'))) {
            $event->setResponse(new Response(status: Response::HTTP_NO_CONTENT));
        }
    }

    public function onResponse(ResponseEvent $event): void
    {
        $request = $event->getRequest();
        $origin = $this->allowedOrigin($request->headers->get('Origin'));
        if (!$event->isMainRequest() || null === $origin || !str_starts_with($request->getPathInfo(), '/api/')) {
            return;
        }
        $headers = $event->getResponse()->headers;
        $headers->set('Access-Control-Allow-Origin', $origin);
        $headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        $headers->set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        $headers->set('Access-Control-Max-Age', '3600');
        $headers->set('Vary', 'Origin');
    }

    private function allowedOrigin(?string $origin): ?string
    {
        return null !== $origin && \in_array($origin, $this->allowed, true) ? $origin : null;
    }
}
