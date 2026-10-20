<?php

namespace App\Purchases;

use App\Entity\Entitlement;

/**
 * A store whose settings are not set on this server (SAVE-178), or one that cannot be reached just now
 * (`$unreachable`). Either way the other stores, sign-in and saves keep working.
 */
final class StoreUnavailable extends \RuntimeException
{
    public const NAMES = [Entitlement::STEAM => 'Steam', Entitlement::APPLE => 'App Store', Entitlement::GOOGLE => 'Google Play'];

    public function __construct(public readonly string $store, public readonly bool $unreachable = false, ?\Throwable $previous = null)
    {
        $name = self::NAMES[$store] ?? $store;
        parent::__construct($unreachable ? "{$name} cannot be reached just now. Try again later." : "{$name} purchases are not available on this server.", previous: $previous);
    }

    /** The settings a store needs; it is unavailable while any is empty. */
    public static function unlessSet(string $store, string ...$settings): void
    {
        foreach ($settings as $value) {
            if ('' === trim($value)) {
                throw new self($store);
            }
        }
    }
}
