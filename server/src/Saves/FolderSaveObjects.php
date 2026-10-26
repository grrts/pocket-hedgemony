<?php

namespace App\Saves;

use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\Filesystem\Filesystem;

/** Save bytes in a folder (`SAVES_DIR`), written to a temporary file and renamed into place: development, tests and a single server. */
final class FolderSaveObjects implements SaveObjects
{
    private readonly Filesystem $fs;

    public function __construct(#[Autowire('%env(SAVES_DIR)%')] private readonly string $dir)
    {
        $this->fs = new Filesystem();
    }

    public function put(string $key, string $bytes): void
    {
        $this->fs->dumpFile($this->path($key), $bytes);
    }

    public function get(string $key): ?string
    {
        $path = $this->path($key);

        return is_file($path) ? (string) file_get_contents($path) : null;
    }

    public function delete(string $key): void
    {
        $this->fs->remove($this->path($key));
    }

    private function path(string $key): string
    {
        return rtrim($this->dir, '/').'/'.SaveObjectsFactory::checkKey($key);
    }
}
