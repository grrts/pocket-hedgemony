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

    /** A game whose host left before it started is over for everyone (MP-028, MP-041). */
    public function isEnded(): bool
    {
        return null === $this->host && !$this->isStarted();
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
    public function start(array $realms, \DateTimeImmutable $now): void
    {
        sort($realms);
        $this->humans = $realms;
        $this->startedAt = $now;
        $this->touch($now);
    }

    public function end(\DateTimeImmutable $now): void
    {
        $this->host = null;
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
        ];
    }
}
