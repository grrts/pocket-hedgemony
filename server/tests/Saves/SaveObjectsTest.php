<?php

namespace App\Tests\Saves;

use App\Saves\FolderSaveObjects;
use App\Saves\S3SaveObjects;
use App\Saves\SaveObjectsFactory;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpClient\MockHttpClient;
use Symfony\Component\HttpClient\Response\MockResponse;

/** Where save bytes live (docs/deploy.md): the folder, the S3 bucket, and the setting that picks one. */
final class SaveObjectsTest extends TestCase
{
    private const KEY = 'acc1/camp1/save1.phsave';

    /** @var list<array{method: string, url: string, body: string}> */
    private array $requests = [];

    private function factory(string $bucket, MockHttpClient $http, string $endpoint = 'https://s3.example.test', string $prefix = 'saves'): SaveObjectsFactory
    {
        return new SaveObjectsFactory(sys_get_temp_dir().'/ph-saves-'.getmypid(), $bucket, $prefix, 'auto', $endpoint, 'key-id', 'secret', true, $http);
    }

    /** @param list<MockResponse> $responses */
    private function s3(array $responses): S3SaveObjects
    {
        $http = new MockHttpClient(function (string $method, string $url, array $options) use (&$responses) {
            $body = $options['body'] ?? '';
            $this->requests[] = ['method' => $method, 'url' => $url, 'body' => \is_string($body) ? $body : implode('', iterator_to_array((fn () => yield from $body())()))];

            return array_shift($responses);
        });
        $objects = $this->factory('ph-bucket', $http)->create();
        self::assertInstanceOf(S3SaveObjects::class, $objects);

        return $objects;
    }

    public function testNoBucketKeepsSavesInTheFolder(): void
    {
        $objects = $this->factory('', new MockHttpClient())->create();
        self::assertInstanceOf(FolderSaveObjects::class, $objects);

        $objects->put(self::KEY, 'PHSV bytes');
        self::assertSame('PHSV bytes', $objects->get(self::KEY));
        $objects->delete(self::KEY);
        self::assertNull($objects->get(self::KEY));
    }

    public function testPutWritesTheObjectUnderThePrefix(): void
    {
        $this->s3([new MockResponse('', ['http_code' => 200])])->put(self::KEY, 'PHSV bytes');

        self::assertSame('PUT', $this->requests[0]['method']);
        self::assertSame('https://s3.example.test/ph-bucket/saves/acc1/camp1/save1.phsave', $this->requests[0]['url']);
        self::assertSame('PHSV bytes', $this->requests[0]['body']);
    }

    public function testGetReadsTheObject(): void
    {
        $bytes = $this->s3([new MockResponse('PHSV bytes', ['http_code' => 200])])->get(self::KEY);

        self::assertSame('PHSV bytes', $bytes);
        self::assertSame('GET', $this->requests[0]['method']);
    }

    public function testGetOfAMissingObjectIsNull(): void
    {
        $missing = '<?xml version="1.0" encoding="UTF-8"?><Error><Code>NoSuchKey</Code><Message>The specified key does not exist.</Message></Error>';

        self::assertNull($this->s3([new MockResponse($missing, ['http_code' => 404, 'response_headers' => ['content-type' => 'application/xml']])])->get(self::KEY));
    }

    public function testDeleteRemovesTheObject(): void
    {
        $this->s3([new MockResponse('', ['http_code' => 204])])->delete(self::KEY);

        self::assertSame('DELETE', $this->requests[0]['method']);
        self::assertSame('https://s3.example.test/ph-bucket/saves/acc1/camp1/save1.phsave', $this->requests[0]['url']);
    }

    public function testAnOutageIsNotTakenForAMissingSave(): void
    {
        $this->expectException(\Throwable::class);
        $this->s3([new MockResponse('', ['http_code' => 503])])->get(self::KEY);
    }

    public function testKeysCannotLeaveThePrefix(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->s3([])->put('../other/x.phsave', 'bytes');
    }
}
