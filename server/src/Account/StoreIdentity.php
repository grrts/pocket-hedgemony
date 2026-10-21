<?php

namespace App\Account;

/** Who a store says the player is: its own id for them, the name it gives, if any, and the client id the token was for. */
final class StoreIdentity
{
    public function __construct(
        public readonly string $provider,
        public readonly string $subject,
        public readonly ?string $name = null,
        public readonly ?string $clientId = null,
    ) {
    }
}
