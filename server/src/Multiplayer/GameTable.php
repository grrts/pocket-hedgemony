<?php

namespace App\Multiplayer;

use App\Entity\Account;
use App\Entity\MpGame;
use App\Entity\MpSeat;
use App\Entity\MpWeek;
use App\Repository\MpGameRepository;
use App\Repository\MpSeatRepository;
use App\Repository\MpWeekRepository;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Clock\ClockInterface;

/**
 * The rules of an online game's table that more than one call needs (domain/multiplayer MP-032,
 * MP-080 … MP-083): which week the table is on and whom it waits on, closing a week whose time ran
 * out, handing a realm to the AI, and passing the host's part on. The callers flush.
 */
final class GameTable
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly MpGameRepository $games,
        private readonly MpSeatRepository $seats,
        private readonly MpWeekRepository $weeks,
        private readonly ClockInterface $clock,
    ) {
    }

    /**
     * The week the table is on and the realms it still waits on: the newest week anyone sent, or the one
     * after it once every realm still played by a person has sent it. Week 0 before any week is sent
     * (INV-MP-7).
     *
     * @return array{0: int, 1: list<string>}
     */
    public function week(MpGame $game): array
    {
        if (!$game->isStarted()) {
            return [0, []];
        }
        $last = $this->weeks->createQueryBuilder('w')->select('MAX(w.week)')->where('w.game = :g')->setParameter('g', $game)->getQuery()->getSingleScalarResult();
        $week = null === $last ? 0 : (int) $last;
        $waiting = $this->waitingIn($game, $week);
        if ([] === $waiting && null !== $last) {
            ++$week;
            $waiting = $this->waitingIn($game, $week);
        }

        return [$week, $waiting];
    }

    /** @return list<string> */
    private function waitingIn(MpGame $game, int $week): array
    {
        $sent = array_map(static fn (MpWeek $w) => $w->getRealm(), $this->weeks->findBy(['game' => $game, 'week' => $week]));

        return array_values(array_diff($game->activeIn($week), $sent));
    }

    /**
     * When the week's time has run out, the realms that sent nothing play it on no orders, and the next
     * week opens (MP-080). Only one call closes a week: the week's opening time is claimed in the
     * database first, so two devices asking at once never both write the empty orders.
     */
    public function closeIfLate(MpGame $game): bool
    {
        $limit = $game->getTurnLimit();
        $opened = $game->getWeekOpenedAt();
        $now = $this->clock->now();
        if (!$game->isStarted() || $game->isEnded() || null === $limit || null === $opened || $opened->modify("+$limit seconds") > $now) {
            return false;
        }
        [$week, $waiting] = $this->week($game);
        if ([] === $waiting) {
            return false;
        }
        $claimed = $this->em->createQuery('UPDATE '.MpGame::class.' g SET g.weekOpenedAt = :now WHERE g.id = :id AND g.weekOpenedAt = :opened')
            ->setParameter('now', $now, 'datetime_immutable')->setParameter('opened', $opened, 'datetime_immutable')->setParameter('id', $game->getId())
            ->execute();
        if (1 !== $claimed) {
            $this->em->refresh($game);

            return false;
        }
        foreach ($waiting as $realm) {
            $this->em->persist(MpWeek::skippedFor($game, $realm, $week, $now));
        }
        $game->touch($now);
        $this->em->flush();
        $this->games->bump($game);

        return true;
    }

    /** After a week's orders, or a realm handed to the AI: a week now complete opens the next (MP-080). */
    public function weekMayHaveClosed(MpGame $game, int $before): void
    {
        [$week] = $this->week($game);
        if ($week > $before) {
            $this->em->createQuery('UPDATE '.MpGame::class.' g SET g.weekOpenedAt = :now WHERE g.id = :id')
                ->setParameter('now', $this->clock->now(), 'datetime_immutable')->setParameter('id', $game->getId())->execute();
            $this->em->refresh($game);
        }
    }

    /**
     * Hands a realm to the AI from the week the table is on: its orders are no longer waited for, and
     * every device plays it as a computer realm from that week (MP-081). The host's part passes on when
     * it was the host's realm (MP-082).
     */
    public function drop(MpGame $game, string $realm): void
    {
        $now = $this->clock->now();
        [$week] = $this->week($game);
        $game->drop($realm, $week, $now);
        $seat = $this->seats->findOneBy(['game' => $game, 'realm' => $realm]);
        $seat?->hide();
        if ($game->getHostRealm() === $realm) {
            $this->handOver($game, $seat?->getAccount());
        }
        $this->em->flush();
        $this->weekMayHaveClosed($game, $week);
    }

    /**
     * The host's part goes to the player who sat down first among those still playing, or the game
     * ends when nobody is left (MP-082).
     */
    public function handOver(MpGame $game, ?Account $leaving): void
    {
        $next = null;
        foreach ($this->seats->findBy(['game' => $game], ['takenAt' => 'ASC', 'id' => 'ASC']) as $seat) {
            $playing = !$game->isStarted() || \in_array($seat->getRealm(), $game->activeIn(\PHP_INT_MAX), true);
            if ($playing && (null === $leaving || !$seat->isOf($leaving))) {
                $next = $seat;
                break;
            }
        }
        $game->handOver($next?->getAccount(), $next?->getRealm(), $this->clock->now());
    }

    /**
     * An account that is deleted leaves every game (MP-041): before the start its seat goes, after it
     * its realm goes to the AI; the host's part passes on either way.
     */
    public function forget(Account $account): void
    {
        foreach ($this->seats->findBy(['account' => $account]) as $seat) {
            $this->leaveSeat($seat);
        }
        $this->em->flush();
    }

    /** Leaving a game for good: the seat before the start, the realm to the AI after it. */
    public function leaveSeat(MpSeat $seat): void
    {
        $game = $seat->getGame();
        if ($game->isEnded()) {
            return;
        }
        if ($game->isStarted()) {
            if (\in_array($seat->getRealm(), $game->activeIn(\PHP_INT_MAX), true)) {
                $this->drop($game, $seat->getRealm());
            }

            return;
        }
        if ($game->isHost($seat->getAccount())) {
            $this->handOver($game, $seat->getAccount());
        }
        $this->em->remove($seat);
        $game->touch($this->clock->now());
    }
}
