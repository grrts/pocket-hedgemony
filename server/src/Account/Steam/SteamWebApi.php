<?php

namespace App\Account\Steam;

use Symfony\Component\DependencyInjection\Attribute\AsAlias;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Contracts\HttpClient\Exception\ExceptionInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * Steam's own check of a ticket from `GetAuthTicketForWebApi`: ISteamUserAuth/AuthenticateUserTicket
 * on the partner host, with our publisher Web API key. Without a key, Steam sign-in is off (SAVE-118).
 */
#[AsAlias(SteamTickets::class)]
final class SteamWebApi implements SteamTickets
{
    public const URL = 'https://partner.steam-api.com/ISteamUserAuth/AuthenticateUserTicket/v1/';

    public function __construct(
        private readonly HttpClientInterface $http,
        #[Autowire('%env(STEAM_WEB_API_KEY)%')] private readonly string $key,
        #[Autowire('%env(STEAM_APP_ID)%')] private readonly string $appId,
        #[Autowire('%cloud.steam_ticket_identity%')] private readonly string $identity,
    ) {
    }

    public function steamIdFor(string $ticket): string
    {
        if ('' === $this->key || '' === $this->appId) {
            throw new SteamUnavailable('No Steam key is configured.');
        }
        if (1 !== preg_match('/^[0-9a-fA-F]{2,4096}$/', $ticket)) {
            throw new SteamRefused('The ticket is not hex.');
        }
        try {
            $response = $this->http->request('GET', self::URL, ['query' => [
                'key' => $this->key,
                'appid' => $this->appId,
                'ticket' => $ticket,
                'identity' => $this->identity,
            ], 'timeout' => 10]);
            $status = $response->getStatusCode();
            $data = $response->toArray(false);
        } catch (ExceptionInterface $e) {
            throw new SteamUnavailable('Steam could not be reached.', previous: $e);
        }
        if ($status >= 500) {
            throw new SteamUnavailable("Steam answered {$status}.");
        }
        $params = $data['response']['params'] ?? null;
        $steamId = \is_array($params) && 'OK' === ($params['result'] ?? null) ? (string) ($params['steamid'] ?? '') : '';
        if (1 !== preg_match('/^\d{17}$/', $steamId)) {
            throw new SteamRefused((string) ($data['response']['error']['errordesc'] ?? 'Steam did not accept the ticket.'));
        }

        return $steamId;
    }
}
