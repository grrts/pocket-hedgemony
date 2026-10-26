<?php

namespace App\Saves;

use AsyncAws\S3\S3Client;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * Picks where save bytes live (SAVE-061, docs/deploy.md): S3-compatible storage once `S3_BUCKET` is
 * set, otherwise the folder `SAVES_DIR`. Several app servers need the bucket; a folder is only seen
 * by the server that wrote it.
 */
final class SaveObjectsFactory
{
    public function __construct(
        #[Autowire('%env(SAVES_DIR)%')] private readonly string $dir,
        #[Autowire('%env(S3_BUCKET)%')] private readonly string $bucket,
        #[Autowire('%env(S3_PREFIX)%')] private readonly string $prefix,
        #[Autowire('%env(S3_REGION)%')] private readonly string $region,
        #[Autowire('%env(S3_ENDPOINT)%')] private readonly string $endpoint,
        #[Autowire('%env(S3_ACCESS_KEY_ID)%')] private readonly string $accessKeyId,
        #[Autowire('%env(S3_SECRET_ACCESS_KEY)%')] #[\SensitiveParameter] private readonly string $secretAccessKey,
        #[Autowire('%env(bool:S3_PATH_STYLE)%')] private readonly bool $pathStyle,
        private readonly HttpClientInterface $http,
    ) {
    }

    public function create(): SaveObjects
    {
        if ('' === $this->bucket) {
            return new FolderSaveObjects($this->dir);
        }
        $config = [
            'region' => '' === $this->region ? 'us-east-1' : $this->region,
            'pathStyleEndpoint' => $this->pathStyle ? 'true' : 'false',
            // R2, B2 and MinIO don't all take AWS's chunked signing; one signed body works everywhere.
            'sendChunkedBody' => 'false',
        ];
        if ('' !== $this->endpoint) {
            $config['endpoint'] = $this->endpoint;
        }
        // Without keys the client falls back to AWS's own chain (instance role, AWS_* variables).
        if ('' !== $this->accessKeyId) {
            $config['accessKeyId'] = $this->accessKeyId;
            $config['accessKeySecret'] = $this->secretAccessKey;
        }

        return new S3SaveObjects(new S3Client($config, null, $this->http), $this->bucket, $this->prefix);
    }

    /** A key as SaveObjects documents it, so no key can reach outside its folder or prefix. */
    public static function checkKey(string $key): string
    {
        if (1 !== preg_match('~^[A-Za-z0-9_-]+(/[A-Za-z0-9_-]+)*\.phsave$~', $key)) {
            throw new \InvalidArgumentException("Not a save key: {$key}");
        }

        return $key;
    }
}
