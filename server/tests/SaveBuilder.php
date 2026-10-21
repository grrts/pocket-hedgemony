<?php

namespace App\Tests;

/** Writes `.phsave` files the way packages/engine/src/domain/saves/format.ts does, for tests. */
final class SaveBuilder
{
    /** @param array<string, mixed> $header overrides of the default header */
    public static function build(array $header = [], int $padding = 200): string
    {
        $header += [
            'saveId' => 'save-1', 'campaignId' => 'camp-1', 'kind' => 'manual', 'name' => 'Portugal, March 1512',
            'savedAt' => 1792400000000, 'device' => 'Steam Deck', 'platform' => 'desktop', 'gameVersion' => '0.1.0',
            'formatVersion' => 1, 'rulesHash' => '00000000', 'mapHash' => '00000000', 'turn' => 12,
            'date' => ['y' => 1512, 'm' => 3], 'playerNation' => 'POR', 'ironman' => false, 'playSeconds' => 600,
            'worldHash' => '00000000', 'thumbnail' => '', 'modified' => false,
        ];
        $json = json_encode($header, \JSON_UNESCAPED_SLASHES | \JSON_UNESCAPED_UNICODE);
        // Random bytes keep the chunk near its padding size after deflate.
        $chunks = ['core' => gzdeflate(random_bytes($padding)), 'ids' => gzdeflate('ids')];
        $offset = 4 + 2 + 4 + \strlen($json) + 2 + array_sum(array_map(fn ($id) => 1 + \strlen($id) + 14, array_keys($chunks)));
        $table = pack('v', \count($chunks));
        foreach ($chunks as $id => $data) {
            $table .= \chr(\strlen($id)).$id.pack('vVVV', 1, $offset, \strlen($data), crc32($data));
            $offset += \strlen($data);
        }

        return 'PHSV'.pack('vV', 1, \strlen($json)).$json.$table.implode('', $chunks);
    }
}
