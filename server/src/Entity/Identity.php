<?php

namespace App\Entity;

use App\Repository\IdentityRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * A store sign-in an account holds (SAVE-112): a Steam account today, Apple and Google later.
 * Email and password stay on the account itself.
 */
#[ORM\Entity(repositoryClass: IdentityRepository::class)]
#[ORM\UniqueConstraint(name: 'uniq_identity_subject', fields: ['provider', 'subject'])]
class Identity
{
    public const STEAM = 'steam';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Account $account;

    #[ORM\Column(length: 16)]
    private string $provider;

    /** The store's own id for the player: a SteamID64, Apple's or Google's `sub`. */
    #[ORM\Column(length: 191)]
    private string $subject;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    public function __construct(Account $account, string $provider, string $subject, \DateTimeImmutable $now)
    {
        $this->account = $account;
        $this->provider = $provider;
        $this->subject = $subject;
        $this->createdAt = $now;
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getAccount(): Account
    {
        return $this->account;
    }

    public function getProvider(): string
    {
        return $this->provider;
    }

    public function getSubject(): string
    {
        return $this->subject;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }
}
