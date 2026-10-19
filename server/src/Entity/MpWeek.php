<?php

namespace App\Entity;

use App\Repository\MpWeekRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * One realm's orders for one week, as the engine's PlayerOrders in JSON, with the world's hash at the
 * start of that week on the device that sent them. Written once (INV-MP-6).
 */
#[ORM\Entity(repositoryClass: MpWeekRepository::class)]
#[ORM\UniqueConstraint(name: 'uniq_mp_week', fields: ['game', 'realm', 'week'])]
#[ORM\Index(name: 'idx_mp_week_game', fields: ['game', 'week'])]
class MpWeek
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private MpGame $game;

    #[ORM\Column(length: 40)]
    private string $realm;

    #[ORM\Column]
    private int $week;

    /** Kept as sent; only the devices read it. */
    #[ORM\Column(type: Types::TEXT)]
    private string $orders;

    #[ORM\Column(length: 64)]
    private string $hash;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $sentAt;

    public function __construct(MpGame $game, string $realm, int $week, string $orders, string $hash, \DateTimeImmutable $now)
    {
        $this->game = $game;
        $this->realm = $realm;
        $this->week = $week;
        $this->orders = $orders;
        $this->hash = $hash;
        $this->sentAt = $now;
    }

    public function getRealm(): string
    {
        return $this->realm;
    }

    public function getWeek(): int
    {
        return $this->week;
    }

    public function getOrders(): string
    {
        return $this->orders;
    }

    public function getHash(): string
    {
        return $this->hash;
    }

    public function toArray(): array
    {
        return ['week' => $this->week, 'realm' => $this->realm, 'orders' => json_decode($this->orders, true), 'hash' => $this->hash];
    }
}
