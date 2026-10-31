<?php

namespace App\Entity;

use App\Repository\EntitlementRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * One account's full game purchase on one store (SAVE-171, D-SAVE-23): the design's `purchase` table,
 * kept as one row per account and store. The store reference (SteamID and app id, Apple's original
 * transaction id, Google's order id) belongs to one account only, so one purchase is never claimed twice.
 * Cross-buy is per store: a row unlocks the full game only on its own store (SAVE-170).
 * When its account is deleted the row stays as the record of the sale, with no account (SAVE-199),
 * until a new account restores the purchase and takes it (SAVE-202).
 */
#[ORM\Entity(repositoryClass: EntitlementRepository::class)]
#[ORM\UniqueConstraint(name: 'uniq_entitlement_account_store', fields: ['account', 'store'])]
#[ORM\UniqueConstraint(name: 'uniq_entitlement_reference', fields: ['store', 'reference'])]
#[ORM\Index(name: 'idx_entitlement_token', fields: ['tokenHash'])]
class Entitlement
{
    public const STEAM = 'steam';
    public const APPLE = 'apple';
    public const GOOGLE = 'google';
    public const STORES = [self::STEAM, self::APPLE, self::GOOGLE];

    public const ACTIVE = 'active';
    public const REFUNDED = 'refunded';
    public const REVOKED = 'revoked';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?Account $account;

    #[ORM\Column(length: 16)]
    private string $store;

    #[ORM\Column(length: 64)]
    private string $product;

    #[ORM\Column(length: 191)]
    private string $reference;

    /** Google Play only: SHA-256 of the purchase token, which voided notifications name. */
    #[ORM\Column(length: 64, nullable: true)]
    private ?string $tokenHash = null;

    #[ORM\Column(length: 16)]
    private string $status;

    /** The store's environment: `Production` or `Sandbox` on the App Store, `test` for a Play licence tester. */
    #[ORM\Column(length: 16, nullable: true)]
    private ?string $environment = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $firstVerifiedAt;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $lastCheckedAt;

    public function __construct(Account $account, string $store, string $product, string $reference, string $status, \DateTimeImmutable $now)
    {
        $this->account = $account;
        $this->store = $store;
        $this->product = $product;
        $this->reference = $reference;
        $this->status = $status;
        $this->firstVerifiedAt = $now;
        $this->lastCheckedAt = $now;
    }

    /** Null once the account was deleted: the purchase record that stays (SAVE-199). */
    public function getAccount(): ?Account
    {
        return $this->account;
    }

    /** A purchase record without an account goes to the account that restores the purchase (SAVE-202). */
    public function claim(Account $account): void
    {
        $this->account = $account;
    }

    public function getStore(): string
    {
        return $this->store;
    }

    public function getProduct(): string
    {
        return $this->product;
    }

    public function getReference(): string
    {
        return $this->reference;
    }

    public function getTokenHash(): ?string
    {
        return $this->tokenHash;
    }

    public function getStatus(): string
    {
        return $this->status;
    }

    public function isActive(): bool
    {
        return self::ACTIVE === $this->status;
    }

    public function getEnvironment(): ?string
    {
        return $this->environment;
    }

    public function getFirstVerifiedAt(): \DateTimeImmutable
    {
        return $this->firstVerifiedAt;
    }

    public function getLastCheckedAt(): \DateTimeImmutable
    {
        return $this->lastCheckedAt;
    }

    /** A purchase the store just confirmed: a new one after a refund takes the old one's place. */
    public function confirm(string $reference, string $status, ?string $tokenHash, ?string $environment, \DateTimeImmutable $now): void
    {
        if ($reference !== $this->reference) {
            $this->firstVerifiedAt = $now;
        }
        $this->reference = $reference;
        $this->status = $status;
        $this->tokenHash = $tokenHash;
        $this->environment = $environment;
        $this->lastCheckedAt = $now;
    }

    public function mark(string $status, \DateTimeImmutable $now): void
    {
        $this->status = $status;
        $this->lastCheckedAt = $now;
    }

    public function checked(\DateTimeImmutable $now): void
    {
        $this->lastCheckedAt = $now;
    }
}
