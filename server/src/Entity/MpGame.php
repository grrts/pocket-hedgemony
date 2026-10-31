<?php

namespace App\Entity;

use App\Repository\MpGameRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * An online multiplayer game (domain/multiplayer/spec.md, INV-MP-1 … INV-MP-3): found only by its
 * code. The world is never kept here: every device makes it from the seed and the human realms and
 * plays the same weeks, so the table holds only the seats and each week's orders.
 */
#[ORM\Entity(repositoryClass: MpGameRepository::class)]
#[ORM\UniqueConstraint(name: 'uniq_mp_game_code', fields: ['code'])]
class MpGame
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 8)]
    private string $code;

    #[ORM\Column(type: Types::BIGINT)]
    private string $seed;

    /** Null once the host's account is gone (MP-041): a game not yet started then ends. */
    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?Account $host;

    #[ORM\Column(length: 40)]
    private string $hostRealm;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $startedAt = null;

    /** @var list<string> the realms in play, fixed at start (INV-MP-2) */
    #[ORM\Column(type: Types::JSON)]
    private array $humans = [];

    /**
     * Changes on every change, so a device that has it is told "not changed" (MP-036). Only
     * MpGameRepository::bump() moves it, in the database, so two writes at once never share a version.
     */
    #[ORM\Column]
    private int $version = 1;

    /** Last time anything happened, for Your games' order (MP-050). */
    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $activeAt;

    /** Seconds a week stays open for orders, chosen by the host at the start; null for no limit (MP-080). */
    #[ORM\Column(nullable: true)]
    private ?int $turnLimit = null;

    /** When the week the table is on opened: the start, then each time a week was complete (MP-080). */
    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $weekOpenedAt = null;

    /** @var array<string, int> realms handed to the AI, with the week from which the AI plays them (MP-081) */
    #[ORM\Column(type: Types::JSON)]
    private array $dropped = [];

    /** The first week two devices sent different week-start hashes for (MP-034). */
    #[ORM\Column(nullable: true)]
    private ?int $outOfStep = null;

    public function __construct(string $code, int $seed, Account $host, string $hostRealm, \DateTimeImmutable $now)
    {
        $this->code = $code;
        $this->seed = (string) $seed;
        $this->host = $host;
        $this->hostRealm = $hostRealm;
        $this->createdAt = $now;
        $this->activeAt = $now;
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getCode(): string
    {
        return $this->code;
    }

    public function getHost(): ?Account
    {
        return $this->host;
    }

    public function isHost(Account $account): bool
    {
        return null !== $this->host && $this->host->getId()->equals($account->getId());
    }

    public function isStarted(): bool
    {
        return null !== $this->startedAt;
    }

    /** A game with nobody left to hand the host's part to is over for everyone (MP-028, MP-082). */
    public function isEnded(): bool
    {
        return null === $this->host;
    }

    public function getHostRealm(): string
    {
        return $this->hostRealm;
    }

    public function getTurnLimit(): ?int
    {
        return $this->turnLimit;
    }

    public function getWeekOpenedAt(): ?\DateTimeImmutable
    {
        return $this->weekOpenedAt;
    }

    /** @return array<string, int> */
    public function getDropped(): array
    {
        return $this->dropped;
    }

    /**
     * The realms people still play in `week`: a realm handed to the AI from week w is the AI's from w on.
     *
     * @return list<string>
     */
    public function activeIn(int $week): array
    {
        return array_values(array_filter($this->humans, fn (string $r) => !isset($this->dropped[$r]) || $week < $this->dropped[$r]));
    }

    public function drop(string $realm, int $week, \DateTimeImmutable $now): void
    {
        $this->dropped[$realm] = $week;
        $this->touch($now);
    }

    /** The host's part passes to another seat, or the game ends when there is none (MP-082). */
    public function handOver(?Account $to, ?string $realm, \DateTimeImmutable $now): void
    {
        $this->host = $to;
        if (null !== $realm) {
            $this->hostRealm = $realm;
        }
        $this->touch($now);
    }

    /** @return list<string> */
    public function getHumans(): array
    {
        return $this->humans;
    }

    public function getVersion(): int
    {
        return $this->version;
    }

    public function getOutOfStep(): ?int
    {
        return $this->outOfStep;
    }

    /** @param list<string> $realms */
    public function start(array $realms, ?int $turnLimit, \DateTimeImmutable $now): void
    {
        sort($realms);
        $this->humans = $realms;
        $this->startedAt = $now;
        $this->turnLimit = $turnLimit;
        $this->weekOpenedAt = $now;
        $this->touch($now);
    }

    public function moveHostRealm(string $realm): void
    {
        $this->hostRealm = $realm;
    }

    public function markOutOfStep(int $week): void
    {
        if (null === $this->outOfStep || $week < $this->outOfStep) {
            $this->outOfStep = $week;
        }
    }

    public function touch(\DateTimeImmutable $now): void
    {
        $this->activeAt = $now;
    }

    public function toArray(): array
    {
        return [
            'code' => $this->code,
            'seed' => (int) $this->seed,
            'host' => $this->hostRealm,
            'created' => (int) $this->createdAt->format('Uv'),
            'humans' => $this->humans,
            'started' => $this->isStarted(),
            'ended' => $this->isEnded(),
            'version' => $this->version,
            'outOfStep' => $this->outOfStep,
            'turnLimit' => $this->turnLimit,
            'weekOpened' => null === $this->weekOpenedAt ? null : (int) $this->weekOpenedAt->format('Uv'),
            'dropped' => (object) $this->dropped,
        ];
    }
}
