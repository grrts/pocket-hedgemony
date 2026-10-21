<?php

namespace App\Entity;

use App\Repository\IdentityRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * A store sign-in an account holds (SAVE-112): a Steam account, an Apple id or a Google id.
 * Email and password stay on the account itself.
 */
#[ORM\Entity(repositoryClass: IdentityRepository::class)]
#[ORM\UniqueConstraint(name: 'uniq_identity_subject', fields: ['provider', 'subject'])]
class Identity
{
    public const STEAM = 'steam';
    public const APPLE = 'apple';
    public const GOOGLE = 'google';
    public const PROVIDERS = [self::STEAM, self::APPLE, self::GOOGLE];

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

    /** Sign in with Apple only: Apple's refresh token, kept so it can be revoked (SAVE-203, SAVE-204). */
    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $appleRefreshToken = null;

    /** The client id Apple issued that token to: the app's bundle id or the website's Services ID. */
    #[ORM\Column(length: 191, nullable: true)]
    private ?string $appleClientId = null;

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

    public function getAppleRefreshToken(): ?string
    {
        return $this->appleRefreshToken;
    }

    public function getAppleClientId(): ?string
    {
        return $this->appleClientId;
    }

    public function keepAppleToken(string $refreshToken, string $clientId): void
    {
        $this->appleRefreshToken = $refreshToken;
        $this->appleClientId = $clientId;
    }
}
