<?php

namespace App\Tests;

use App\Account\Steam\SteamWebApi;
use Symfony\Component\HttpClient\Response\MockResponse;

/**
 * Steam's AuthenticateUserTicket as the tests see it: the ticket "a0" followed by a SteamID64
 * stands for that player; a ticket starting with "bad" is refused. Every other call fails the test.
 */
final class SteamMock
{
    public function __invoke(string $method, string $url): MockResponse
    {
        if (!str_starts_with($url, SteamWebApi::URL)) {
            throw new \LogicException("Unexpected HTTP call in a test: {$method} {$url}");
        }
        parse_str((string) parse_url($url, \PHP_URL_QUERY), $query);
        $ticket = (string) ($query['ticket'] ?? '');
        if ('test-key' !== ($query['key'] ?? null) || 'pockethegemony' !== ($query['identity'] ?? null)) {
            return new MockResponse('{"response":{"error":{"errorcode":3,"errordesc":"Invalid parameter"}}}');
        }
        if (str_starts_with($ticket, 'a0') && 1 === preg_match('/^\d{17}$/', substr($ticket, 2))) {
            $id = substr($ticket, 2);

            return new MockResponse(json_encode(['response' => ['params' => [
                'result' => 'OK', 'steamid' => $id, 'ownersteamid' => $id, 'vacbanned' => false, 'publisherbanned' => false,
            ]]]));
        }

        return new MockResponse('{"response":{"error":{"errorcode":101,"errordesc":"Invalid ticket"}}}');
    }
}
