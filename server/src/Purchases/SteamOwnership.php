<?php

namespace App\Purchases;

use App\Entity\Entitlement;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Contracts\HttpClient\Exception\ExceptionInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * Whether a SteamID owns the full game (SAVE-173): ISteamUser/CheckAppOwnership on the partner host, with
 * our publisher Web API key, for the full game's app id (`STEAM_APP_ID`). A refund shows as not owned;
 * the demo is another app id and never counts.
 */
final class SteamOwnership
{
    public const URL = 'https://partner.steam-api.com/ISteamUser/CheckAppOwnership/v2/';

    public function __construct(
        private readonly HttpClientInterface $http,
        #[Autowire('%env(STEAM_WEB_API_KEY)%')] private readonly string $key,
        #[Autowire('%env(STEAM_APP_ID)%')] private readonly string $appId,
    ) {
    }

    /** @throws StoreUnavailable without a key or app id (SAVE-178) */
    public function assertAvailable(): void
    {
        StoreUnavailable::unlessSet(Entitlement::STEAM, $this->key, $this->appId);
    }

    /** @throws StoreUnavailable without a key or app id, or while Steam cannot be reached */
    public function check(string $steamId): bool
    {
        $this->assertAvailable();
        try {
            $response = $this->http->request('GET', self::URL, ['query' => [
                'key' => $this->key,
                'steamid' => $steamId,
                'appid' => $this->appId,
            ], 'timeout' => 10]);
            $status = $response->getStatusCode();
            $data = $status < 300 ? $response->toArray(false) : [];
        } catch (ExceptionInterface $e) {
            throw new StoreUnavailable(Entitlement::STEAM, true, $e);
        }
        $own = $data['appownership'] ?? null;
        if (!\is_array($own) || 'OK' !== ($own['result'] ?? null)) {
            // A wrong key answers 403, an outage 5xx: neither says the player does not own the game.
            throw new StoreUnavailable(Entitlement::STEAM, true);
        }

        return true === $own['ownsapp'];
    }

    /** The reference a Steam entitlement is kept under: the SteamID and the full game's app id. */
    public function reference(string $steamId): string
    {
        return $steamId.':'.$this->appId;
    }
}
