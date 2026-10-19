<?php

namespace App\Saves;

/**
 * Where save bytes live, never in the database (SAVE-061): keys are
 * `<accountId>/<campaignId>/<saveId>.phsave`. Development and tests use a folder on disk;
 * the hosted server will put the same keys in S3-compatible storage.
 */
interface SaveObjects
{
    public function put(string $key, string $bytes): void;

    public function get(string $key): ?string;

    public function delete(string $key): void;
}
