<?php

namespace App\Controller;

use App\Account\SignInCodes;
use App\Account\SignInRefused;
use App\Account\SignInUnavailable;
use App\Account\Steam\SteamOpenId;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Validator\Validator\ValidatorInterface;

/**
 * Steam sign-in on phones and the web (SAVE-151, SAVE-152): the game asks for Steam's address,
 * opens it in the browser sheet (or the same tab), and Steam comes back to /auth/steam/return,
 * which checks the answer and sends the browser back to the game with a one-time code.
 */
final class SteamBrowserController
{
    use JsonInput;

    public function __construct(
        private readonly SteamOpenId $openId,
        private readonly SignInCodes $codes,
        private readonly UrlGeneratorInterface $urls,
        private readonly ValidatorInterface $validator,
    ) {
    }

    #[Route('/api/sessions/steam-openid', name: 'session_steam_openid', methods: ['POST'])]
    public function start(Request $request): JsonResponse
    {
        $data = $this->decode($request);
        if ($errors = $this->validate($this->validator, $data, new Assert\Collection([
            'return' => [new Assert\NotBlank(), new Assert\Type('string'), new Assert\Length(max: 500)],
        ]))) {
            return $errors;
        }
        if (!$this->openId->available()) {
            return new JsonResponse(['error' => 'steam_unavailable', 'message' => 'Steam sign-in is not available.'], Response::HTTP_SERVICE_UNAVAILABLE);
        }
        if (!$this->openId->allows($data['return'])) {
            return new JsonResponse(['error' => 'return_not_allowed', 'message' => 'The game cannot be sent back there.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }
        $returnTo = $this->urls->generate('auth_steam_return', ['state' => $this->openId->state($data['return'])], UrlGeneratorInterface::ABSOLUTE_URL);

        return new JsonResponse(['url' => $this->openId->loginUrl($returnTo, $request->getSchemeAndHttpHost().'/')]);
    }

    #[Route('/auth/steam/return', name: 'auth_steam_return', methods: ['GET'])]
    public function return(Request $request): Response
    {
        $state = (string) $request->query->get('state', '');
        $return = $this->openId->returnOf($state);
        if (null === $return) {
            return new Response(
                '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Sign-in expired</title><p>This Steam sign-in link is not valid any more. Go back to Pocket Hegemony and try again.</p>',
                Response::HTTP_BAD_REQUEST,
                ['Content-Type' => 'text/html; charset=UTF-8', 'Cache-Control' => 'no-store'],
            );
        }
        $returnTo = $this->urls->generate('auth_steam_return', ['state' => $state], UrlGeneratorInterface::ABSOLUTE_URL);
        try {
            [$identity, $nonce] = $this->openId->verify(self::openIdFields($request), $returnTo);
            $code = $this->codes->issue($identity, $nonce);
            $back = null === $code ? ['steamError' => 'steam_refused'] : ['steamCode' => $code];
        } catch (SignInRefused) {
            $back = ['steamError' => 'steam_refused'];
        } catch (SignInUnavailable) {
            $back = ['steamError' => 'steam_unavailable'];
        }
        $url = preg_replace('/#.*$/s', '', $return).(str_contains($return, '?') ? '&' : '?').http_build_query($back);
        $response = new RedirectResponse($url);
        $response->headers->set('Cache-Control', 'no-store');
        $response->headers->set('Referrer-Policy', 'no-referrer');

        return $response;
    }

    /**
     * The `openid.*` fields as Steam sent them. PHP turns the dots of query names into underscores,
     * so they are read from the raw query string.
     *
     * @return array<string, string>
     */
    private static function openIdFields(Request $request): array
    {
        $fields = [];
        foreach (explode('&', (string) $request->server->get('QUERY_STRING', '')) as $pair) {
            [$key, $value] = array_pad(explode('=', $pair, 2), 2, '');
            $key = urldecode($key);
            if (str_starts_with($key, 'openid.')) {
                $fields[$key] = urldecode($value);
            }
        }

        return $fields;
    }
}
