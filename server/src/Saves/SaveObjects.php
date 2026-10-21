<?php

namespace App\Saves;

/**
 * Where save bytes live, never in the database (SAVE-061): keys are
 * `<accountId>/<campaignId>/<saveId>.phsave`. Development and tests use a folder on disk
 * (FolderSaveObjects); the hosted server puts the same keys in S3-compatible storage
 * (S3SaveObjects). SaveObjectsFactory picks one from the settings (docs/deploy.md).
 */
interface SaveObjects
{
    public function put(string $key, string $bytes): void;

    public function get(string $key): ?string;

    public function delete(string $key): void;
}
