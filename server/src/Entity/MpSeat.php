<?php

namespace App\Entity;

use App\Repository\MpSeatRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/** One human realm of an online game, held by one account (INV-MP-4, INV-MP-5). */
#[ORM\Entity(repositoryClass: MpSeatRepository::class)]
#[ORM\UniqueConstraint(name: 'uniq_mp_seat_realm', fields: ['game', 'realm'])]
#[ORM\UniqueConstraint(name: 'uniq_mp_seat_account', fields: ['game', 'account'])]
#[ORM\Index(name: 'idx_mp_seat_account', fields: ['account'])]
class MpSeat
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private MpGame $game;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Account $account;

    #[ORM\Column(length: 40)]
    private string $realm;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $takenAt;

    /** The account left this started game: it is not in their Your games until they type its code (MP-051). */
    #[ORM\Column]
    private bool $hidden = false;

    public function __construct(MpGame $game, Account $account, string $realm, \DateTimeImmutable $now)
    {
        $this->game = $game;
        $this->account = $account;
        $this->realm = $realm;
        $this->takenAt = $now;
    }

    public function getGame(): MpGame
    {
        return $this->game;
    }

    public function getAccount(): Account
    {
        return $this->account;
    }

    public function getRealm(): string
    {
        return $this->realm;
    }

    public function moveTo(string $realm, \DateTimeImmutable $now): void
    {
        $this->realm = $realm;
        $this->takenAt = $now;
    }

    public function isHidden(): bool
    {
        return $this->hidden;
    }

    public function hide(bool $hidden = true): void
    {
        $this->hidden = $hidden;
    }

    public function isOf(Account $account): bool
    {
        return $this->account->getId()->equals($account->getId());
    }

    public function toArray(Account $viewer): array
    {
        return [
            'realm' => $this->realm,
            'player' => $this->account->getDisplayName(),
            'at' => (int) $this->takenAt->format('Uv'),
            'mine' => $this->isOf($viewer),
        ];
    }
}
