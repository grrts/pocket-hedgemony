<?php

namespace App\Entity;

use App\Repository\DeviceRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

/**
 * One signed-in device of an account (SAVE-057, SAVE-114 … SAVE-116). Both of its tokens are kept
 * only as SHA-256 hashes; the device token turns over on every refresh.
 */
#[ORM\Entity(repositoryClass: DeviceRepository::class)]
#[ORM\UniqueConstraint(name: 'uniq_device_token', fields: ['deviceTokenHash'])]
#[ORM\UniqueConstraint(name: 'uniq_device_access', fields: ['accessTokenHash'])]
class Device
{
    public const PLATFORMS = ['steam', 'desktop', 'ios', 'android', 'web'];

    #[ORM\Id]
    #[ORM\Column(type: 'uuid')]
    private Uuid $id;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Account $account;

    #[ORM\Column(length: 60)]
    private string $name;

    #[ORM\Column(length: 16)]
    private string $platform;

    #[ORM\Column(length: 64)]
    private string $deviceTokenHash;

    #[ORM\Column(length: 64, nullable: true)]
    private ?string $accessTokenHash = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $accessExpiresAt = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $lastSeenAt;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $signedOutAt = null;

    public function __construct(Account $account, string $name, string $platform, \DateTimeImmutable $now)
    {
        $this->id = Uuid::v7();
        $this->account = $account;
        $this->name = $name;
        $this->platform = $platform;
        $this->deviceTokenHash = '';
        $this->createdAt = $now;
        $this->lastSeenAt = $now;
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getAccount(): Account
    {
        return $this->account;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function getPlatform(): string
    {
        return $this->platform;
    }

    public function getLastSeenAt(): \DateTimeImmutable
    {
        return $this->lastSeenAt;
    }

    public function isSignedOut(): bool
    {
        return null !== $this->signedOutAt;
    }

    public function accessExpiresAt(): ?\DateTimeImmutable
    {
        return $this->accessExpiresAt;
    }

    /** Takes new token hashes: the old device token and access token stop working (SAVE-115). */
    public function rotate(string $deviceTokenHash, string $accessTokenHash, \DateTimeImmutable $accessExpiresAt, \DateTimeImmutable $now): void
    {
        $this->deviceTokenHash = $deviceTokenHash;
        $this->accessTokenHash = $accessTokenHash;
        $this->accessExpiresAt = $accessExpiresAt;
        $this->lastSeenAt = $now;
    }

    public function seen(\DateTimeImmutable $now): void
    {
        $this->lastSeenAt = $now;
    }

    /** Ends both tokens at once (SAVE-116). */
    public function signOut(\DateTimeImmutable $now): void
    {
        $this->signedOutAt = $now;
        $this->accessTokenHash = null;
        $this->accessExpiresAt = null;
    }
}
