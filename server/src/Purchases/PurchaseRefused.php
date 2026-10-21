<?php

namespace App\Purchases;

/**
 * A proof of purchase the server does not accept: `$reason` is the error word the game gets
 * (`bad_signature`, `wrong_app`, `wrong_product`, `sandbox`, `not_found`, `other_account` …).
 */
final class PurchaseRefused extends \RuntimeException
{
    public const OTHER_ACCOUNT = 'This purchase is on another Pocket Hegemony account.';

    public function __construct(public readonly string $reason, string $message)
    {
        parent::__construct($message);
    }
}
