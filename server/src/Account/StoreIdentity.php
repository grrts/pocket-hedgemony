<?php

namespace App\Account;

/** Who a store says the player is: its own id for them, and the name it gives, if any. */
final class StoreIdentity
{
    public function __construct(
        public readonly string $provider,
        public readonly string $subject,
        public readonly ?string $name = null,
    ) {
    }
}
