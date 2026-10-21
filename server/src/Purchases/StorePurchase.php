<?php

namespace App\Purchases;

/**
 * What a store said about one purchase, once checked: the reference it is kept under, its status
 * (`active`, `refunded`, `revoked`, or `pending` for a Play payment not through yet), and the account
 * tag it carries (`appAccountToken`, `obfuscatedExternalAccountId`) when the game set one.
 */
final class StorePurchase
{
    public const PENDING = 'pending';

    public function __construct(
        public readonly string $store,
        public readonly string $product,
        public readonly string $reference,
        public readonly string $status,
        public readonly ?string $accountTag = null,
        public readonly ?string $tokenHash = null,
        public readonly ?string $environment = null,
        /** Google Play only: whether the purchase is acknowledged yet. */
        public readonly bool $acknowledged = true,
    ) {
    }
}
