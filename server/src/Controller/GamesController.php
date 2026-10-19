<?php

namespace App\Controller;

use App\Entity\Account;
use App\Entity\Device;
use App\Entity\MpGame;
use App\Entity\MpSeat;
use App\Entity\MpWeek;
use App\Repository\MpGameRepository;
use App\Repository\MpSeatRepository;
use App\Repository\MpWeekRepository;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Clock\ClockInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\RateLimiter\RateLimiterFactoryInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * The online game table (domain/multiplayer/spec.md MP-020 … MP-051): games found by their code,
 * seats held by accounts, and each week's orders. The server never plays the game: every device
 * makes the same world from the seed and carries out the same orders, so the server only keeps
 * them, refuses what breaks the rules of the table, and notices devices that disagree.
 */
#[IsGranted('ROLE_PLAYER')]
final class GamesController
{
    use JsonInput;

    /** Letters for codes, without I and O, which read as 1 and 0 (MP-022). */
    public const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    private const CODE = '[A-Z]{4,5}';
    private const REALM = '/^[A-Za-z0-9_-]{1,40}$/';
    private const HASH = '/^[0-9a-f]{0,64}$/';
    private const MINE_LIMIT = 50;

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly MpGameRepository $games,
        private readonly MpSeatRepository $seats,
        private readonly MpWeekRepository $weeks,
        private readonly ClockInterface $clock,
        private readonly RateLimiterFactoryInterface $apiGamesLimiter,
        private readonly RateLimiterFactoryInterface $apiGamesReadLimiter,
        #[Autowire('%multiplayer.max_players%')] private readonly int $maxPlayers,
        #[Autowire('%multiplayer.max_orders_kb%')] private readonly int $maxOrdersKb,
    ) {
    }

    /** Hosts a game: a new code, a seed, and the host's seat (MP-022). */
    #[Route('/api/games', name: 'games_host', methods: ['POST'])]
    public function host(#[CurrentUser] Account $account, Request $request): JsonResponse
    {
        if ($limited = $this->limited($account, $request)) {
            return $limited;
        }
        $realm = $this->decode($request)['realm'] ?? null;
        if (!\is_string($realm) || 1 !== preg_match(self::REALM, $realm)) {
            return self::error('invalid_input', 'Send the realm you play.', Response::HTTP_UNPROCESSABLE_ENTITY);
        }
        $now = $this->clock->now();
        $code = $this->newCode();
        if (null === $code) {
            return self::error('no_code', 'No free game code was found. Try again.', Response::HTTP_SERVICE_UNAVAILABLE);
        }
        $game = new MpGame($code, random_int(0, 2 ** 31 - 1), $account, $realm, $now);
        $this->em->persist($game);
        $this->em->persist(new MpSeat($game, $account, $realm, $now));
        $this->em->flush();

        return new JsonResponse($this->table($game, $account, 0), Response::HTTP_CREATED);
    }

    /** The account's games, newest activity first, marking those waiting on its orders (MP-050). */
    #[Route('/api/games', name: 'games_mine', methods: ['GET'])]
    public function mine(#[CurrentUser] Account $account, Request $request): JsonResponse
    {
        if ($limited = $this->limited($account, $request, read: true)) {
            return $limited;
        }
        $mine = $this->seats->createQueryBuilder('s')
            ->join('s.game', 'g')->addSelect('g')
            ->where('s.account = :a')->andWhere('s.hidden = false')
            ->setParameter('a', $account->getId(), 'uuid')
            ->orderBy('g.activeAt', 'DESC')
            ->setMaxResults(self::MINE_LIMIT)
            ->getQuery()->getResult();
        $games = [];
        foreach ($mine as $seat) {
            $game = $seat->getGame();
            if ($game->isEnded()) {
                continue;
            }
            [$week, $waiting] = $this->week($game);
            $games[] = [
                'code' => $game->getCode(),
                'realm' => $seat->getRealm(),
                'started' => $game->isStarted(),
                'week' => $week,
                'waitingOn' => $waiting,
                'yourMove' => $game->isStarted() && \in_array($seat->getRealm(), $waiting, true),
            ];
        }

        return new JsonResponse(['games' => $games]);
    }

    /**
     * The game, its seats and, for a seated account, the week's orders from `since` (MP-035). With
     * If-None-Match the device gets 304 while nothing changed (MP-036).
     */
    #[Route('/api/games/{code}', name: 'games_get', requirements: ['code' => self::CODE], methods: ['GET'])]
    public function get(#[CurrentUser] Account $account, Request $request, string $code): Response
    {
        if ($limited = $this->limited($account, $request, read: true)) {
            return $limited;
        }
        $game = $this->games->findOneBy(['code' => $code]);
        if (null === $game || $game->isEnded()) {
            return self::error('not_found', "No game $code.", Response::HTTP_NOT_FOUND);
        }
        $since = max(0, $request->query->getInt('since'));
        $etag = '"'.$game->getVersion().'-'.$since.'"';
        if (\in_array($etag, $request->getETags(), true)) {
            return new Response(status: Response::HTTP_NOT_MODIFIED, headers: ['ETag' => $etag]);
        }
        $response = new JsonResponse($this->table($game, $account, $since));
        $response->headers->set('ETag', $etag);
        $response->headers->set('Cache-Control', 'private, no-cache');

        return $response;
    }

    /** Sits down on a free realm; a second realm in the same game moves the seat (MP-025 … MP-027, MP-031). */
    #[Route('/api/games/{code}/seats/{realm}', name: 'games_sit', requirements: ['code' => self::CODE], methods: ['PUT'])]
    public function sit(#[CurrentUser] Account $account, Request $request, string $code, string $realm): JsonResponse
    {
        if ($limited = $this->limited($account, $request)) {
            return $limited;
        }
        if (1 !== preg_match(self::REALM, $realm)) {
            return self::error('invalid_input', 'That is not a realm.', Response::HTTP_UNPROCESSABLE_ENTITY);
        }
        $game = $this->games->findOneBy(['code' => $code]);
        if (null === $game || $game->isEnded()) {
            return self::error('not_found', "No game $code.", Response::HTTP_NOT_FOUND);
        }
        $now = $this->clock->now();
        $mine = $this->seats->findOneBy(['game' => $game, 'account' => $account]);
        if ($game->isStarted()) {
            if (null !== $mine && $mine->getRealm() === $realm) {
                // Typing the code of a game left from the Players card brings it back (MP-051).
                $mine->hide(false);
                $this->em->flush();
                $this->games->bump($game);

                return new JsonResponse($this->table($game, $account, 0));
            }

            return self::error('started', "Game $code has already started.", Response::HTTP_CONFLICT);
        }
        $held = $this->seats->findOneBy(['game' => $game, 'realm' => $realm]);
        if (null !== $held && !$held->isOf($account)) {
            return self::error('taken', 'That realm is taken.', Response::HTTP_CONFLICT);
        }
        if (null === $mine) {
            if ($this->seats->count(['game' => $game]) >= $this->maxPlayers) {
                return self::error('full', "Game $code is full.", Response::HTTP_CONFLICT);
            }
            $this->em->persist(new MpSeat($game, $account, $realm, $now));
        } elseif ($mine->getRealm() !== $realm) {
            $mine->moveTo($realm, $now);
            if ($game->isHost($account)) {
                $game->moveHostRealm($realm);
            }
        }
        $game->touch($now);
        $this->em->flush();
        $this->games->bump($game);

        return new JsonResponse($this->table($game, $account, 0));
    }

    /**
     * Leaves: before the start the realm is free again, and the host leaving ends the game (MP-028);
     * after it the game leaves the account's Your games (MP-051).
     */
    #[Route('/api/games/{code}/seats/mine', name: 'games_leave', requirements: ['code' => self::CODE], methods: ['DELETE'], priority: 1)]
    public function leave(#[CurrentUser] Account $account, string $code): Response
    {
        $game = $this->games->findOneBy(['code' => $code]);
        $mine = null === $game ? null : $this->seats->findOneBy(['game' => $game, 'account' => $account]);
        if (null === $game || null === $mine) {
            return new Response(status: Response::HTTP_NO_CONTENT);
        }
        $now = $this->clock->now();
        if ($game->isStarted()) {
            $mine->hide();
        } else {
            if ($game->isHost($account)) {
                $game->end($now);
            }
            $this->em->remove($mine);
            $game->touch($now);
        }
        $this->em->flush();
        $this->games->bump($game);

        return new Response(status: Response::HTTP_NO_CONTENT);
    }

    /** The host starts with the realms seated now, at least two (MP-029, MP-030). */
    #[Route('/api/games/{code}/start', name: 'games_start', requirements: ['code' => self::CODE], methods: ['POST'])]
    public function start(#[CurrentUser] Account $account, Request $request, string $code): JsonResponse
    {
        if ($limited = $this->limited($account, $request)) {
            return $limited;
        }
        $game = $this->games->findOneBy(['code' => $code]);
        if (null === $game || $game->isEnded()) {
            return self::error('not_found', "No game $code.", Response::HTTP_NOT_FOUND);
        }
        if (!$game->isHost($account)) {
            return self::error('not_host', 'Only the host starts the game.', Response::HTTP_FORBIDDEN);
        }
        if ($game->isStarted()) {
            return new JsonResponse($this->table($game, $account, 0));
        }
        $realms = array_map(static fn (MpSeat $s) => $s->getRealm(), $this->seats->findBy(['game' => $game]));
        if (\count($realms) < 2) {
            return self::error('too_few', 'A game needs a second realm.', Response::HTTP_CONFLICT);
        }
        $game->start($realms, $this->clock->now());
        $this->em->flush();
        $this->games->bump($game);

        return new JsonResponse($this->table($game, $account, 0));
    }

    /** A realm's orders for one week, kept once (MP-032 … MP-034, MP-040). */
    #[Route('/api/games/{code}/weeks/{week}', name: 'games_send', requirements: ['code' => self::CODE, 'week' => '\d{1,6}'], methods: ['PUT'])]
    public function send(#[CurrentUser] Account $account, Request $request, string $code, int $week): JsonResponse
    {
        if ($limited = $this->limited($account, $request)) {
            return $limited;
        }
        if (\strlen($request->getContent()) > $this->maxOrdersKb * 1024) {
            return self::error('too_big', "A week's orders may be at most {$this->maxOrdersKb} KB.", Response::HTTP_REQUEST_ENTITY_TOO_LARGE);
        }
        try {
            $data = json_decode($request->getContent(), true, 64, \JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return self::error('invalid_input', 'Body must be JSON.', Response::HTTP_BAD_REQUEST);
        }
        $realm = $data['realm'] ?? null;
        $orders = $data['orders'] ?? null;
        $hash = $data['hash'] ?? '';
        if (!\is_string($realm) || !\is_array($orders) || !\is_array($orders['orders'] ?? null) || !\is_string($hash) || 1 !== preg_match(self::HASH, $hash)) {
            return self::error('invalid_input', 'Send realm, orders and hash.', Response::HTTP_UNPROCESSABLE_ENTITY);
        }
        $game = $this->games->findOneBy(['code' => $code]);
        if (null === $game || $game->isEnded()) {
            return self::error('not_found', "No game $code.", Response::HTTP_NOT_FOUND);
        }
        if (!$game->isStarted()) {
            return self::error('not_started', 'The game has not started.', Response::HTTP_CONFLICT);
        }
        $seat = $this->seats->findOneBy(['game' => $game, 'realm' => $realm]);
        if (null === $seat || !$seat->isOf($account)) {
            return self::error('not_your_realm', 'Only its player sends a realm\'s orders.', Response::HTTP_FORBIDDEN);
        }
        $json = json_encode($orders, \JSON_THROW_ON_ERROR);
        $kept = $this->weeks->findOneBy(['game' => $game, 'realm' => $realm, 'week' => $week]);
        if (null !== $kept) {
            return $kept->getOrders() === $json && $kept->getHash() === $hash
                ? new JsonResponse(['week' => $kept->toArray(), 'game' => $game->toArray()])
                : self::error('already_sent', 'This week\'s orders were already sent.', Response::HTTP_CONFLICT);
        }
        [$current] = $this->week($game);
        if (null !== $current && $week !== $current) {
            return self::error('not_this_week', "The table is on week $current.", Response::HTTP_CONFLICT);
        }
        $now = $this->clock->now();
        foreach ($this->weeks->findBy(['game' => $game, 'week' => $week]) as $other) {
            if ('' !== $hash && '' !== $other->getHash() && $other->getHash() !== $hash) {
                $game->markOutOfStep($week);
            }
        }
        $sent = new MpWeek($game, $realm, $week, $json, $hash, $now);
        $this->em->persist($sent);
        $game->touch($now);
        $this->em->flush();
        $this->games->bump($game);

        return new JsonResponse(['week' => $sent->toArray(), 'game' => $game->toArray()], Response::HTTP_CREATED);
    }

    private function table(MpGame $game, Account $viewer, int $since): array
    {
        $seats = $this->seats->findBy(['game' => $game], ['takenAt' => 'ASC', 'id' => 'ASC']);
        $seated = array_filter($seats, static fn (MpSeat $s) => $s->isOf($viewer));
        $weeks = [];
        if ([] !== $seated) {
            $rows = $this->weeks->createQueryBuilder('w')
                ->where('w.game = :g')->andWhere('w.week >= :since')
                ->setParameter('g', $game)->setParameter('since', $since)
                ->orderBy('w.week')->addOrderBy('w.realm')
                ->getQuery()->getResult();
            $weeks = array_map(static fn (MpWeek $w) => $w->toArray(), $rows);
        }

        return [
            'game' => $game->toArray(),
            'seats' => array_map(static fn (MpSeat $s) => $s->toArray($viewer), $seats),
            'weeks' => $weeks,
        ];
    }

    /**
     * The week the table is on and the realms it waits on: the newest week anyone sent, or the one
     * after it once every realm has sent it. Null before the first week is sent (INV-MP-7).
     *
     * @return array{0: ?int, 1: list<string>}
     */
    private function week(MpGame $game): array
    {
        if (!$game->isStarted()) {
            return [null, []];
        }
        $last = $this->weeks->createQueryBuilder('w')->select('MAX(w.week)')->where('w.game = :g')->setParameter('g', $game)->getQuery()->getSingleScalarResult();
        if (null === $last) {
            return [null, $game->getHumans()];
        }
        $last = (int) $last;
        $sent = array_map(static fn (MpWeek $w) => $w->getRealm(), $this->weeks->findBy(['game' => $game, 'week' => $last]));
        $waiting = array_values(array_diff($game->getHumans(), $sent));

        return [] === $waiting ? [$last + 1, $game->getHumans()] : [$last, $waiting];
    }

    private function newCode(): ?string
    {
        for ($tries = 0; $tries < 20; ++$tries) {
            $code = '';
            for ($i = 0; $i < 5; ++$i) {
                $code .= self::LETTERS[random_int(0, \strlen(self::LETTERS) - 1)];
            }
            if (null === $this->games->findOneBy(['code' => $code])) {
                return $code;
            }
        }

        return null;
    }

    /** Writes per account and per device; reads per account (MP-039). */
    private function limited(Account $account, Request $request, bool $read = false): ?JsonResponse
    {
        $factory = $read ? $this->apiGamesReadLimiter : $this->apiGamesLimiter;
        $keys = ['account:'.$account->getId()->toRfc4122()];
        $device = $request->attributes->get('_device');
        if (!$read && $device instanceof Device) {
            $keys[] = 'device:'.$device->getId()->toRfc4122();
        }
        foreach ($keys as $key) {
            if (!$factory->create($key)->consume()->isAccepted()) {
                return self::error('rate_limited', 'Too many requests. The game will try again shortly.', Response::HTTP_TOO_MANY_REQUESTS);
            }
        }

        return null;
    }

    private static function error(string $code, string $message, int $status): JsonResponse
    {
        return new JsonResponse(['error' => $code, 'message' => $message], $status);
    }
}
