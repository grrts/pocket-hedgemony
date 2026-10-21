<?php

namespace App\Saves;

use AsyncAws\S3\Exception\NoSuchKeyException;
use AsyncAws\S3\S3Client;

/**
 * Save bytes in an S3-compatible bucket (AWS S3, Cloudflare R2, Backblaze B2, MinIO …), one object
 * per key, so every app server reads the same saves. An optional prefix keeps them apart from
 * anything else in the bucket.
 */
final class S3SaveObjects implements SaveObjects
{
    public function __construct(
        private readonly S3Client $s3,
        private readonly string $bucket,
        private readonly string $prefix = '',
    ) {
    }

    public function put(string $key, string $bytes): void
    {
        $this->s3->putObject([
            'Bucket' => $this->bucket,
            'Key' => $this->path($key),
            'Body' => $bytes,
            'ContentType' => 'application/octet-stream',
        ])->resolve();
    }

    public function get(string $key): ?string
    {
        try {
            return $this->s3->getObject(['Bucket' => $this->bucket, 'Key' => $this->path($key)])->getBody()->getContentAsString();
        } catch (NoSuchKeyException) {
            return null;
        }
    }

    public function delete(string $key): void
    {
        // S3 answers a removed or never-written key the same way, as the folder does.
        $this->s3->deleteObject(['Bucket' => $this->bucket, 'Key' => $this->path($key)])->resolve();
    }

    private function path(string $key): string
    {
        $prefix = trim($this->prefix, '/');

        return ('' === $prefix ? '' : $prefix.'/').SaveObjectsFactory::checkKey($key);
    }
}
