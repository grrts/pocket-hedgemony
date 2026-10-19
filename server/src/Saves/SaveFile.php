<?php

namespace App\Saves;

/**
 * The server's reading of a `.phsave` file (domain/saves/spec.md SAVE-035, SAVE-068): magic "PHSV",
 * a uint16 container version, a uint32 header length, the header as JSON, then a chunk table whose
 * every chunk's CRC-32 is checked. The chunks are never inflated; the server stores bytes as given.
 * The same layout as packages/engine/src/domain/saves/format.ts.
 */
final class SaveFile
{
    public const MAGIC = 'PHSV';

    /** @param array<string, mixed> $header */
    private function __construct(public readonly array $header, public readonly int $size)
    {
    }

    /** @throws InvalidSave */
    public static function parse(string $bytes): self
    {
        $size = \strlen($bytes);
        if ($size < 4 || self::MAGIC !== substr($bytes, 0, 4)) {
            throw new InvalidSave('wrong_magic', 'This is not a Pocket Hegemony save.');
        }
        if ($size < 10) {
            throw new InvalidSave('damaged', 'The file is cut short.');
        }
        $headerLength = unpack('V', $bytes, 6)[1];
        $p = 10 + $headerLength;
        if ($p + 2 > $size) {
            throw new InvalidSave('damaged', 'The file is cut short.');
        }
        try {
            $header = json_decode(substr($bytes, 10, $headerLength), true, 16, \JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            throw new InvalidSave('damaged', 'The header is not readable.');
        }
        if (!\is_array($header)) {
            throw new InvalidSave('damaged', 'The header is not readable.');
        }

        $count = unpack('v', $bytes, $p)[1];
        $p += 2;
        for ($i = 0; $i < $count; ++$i) {
            if ($p + 1 > $size) {
                throw new InvalidSave('damaged', 'The file is cut short.');
            }
            $idLength = \ord($bytes[$p]);
            $p += 1;
            if ($p + $idLength + 14 > $size) {
                throw new InvalidSave('damaged', 'The file is cut short.');
            }
            $id = substr($bytes, $p, $idLength);
            $p += $idLength;
            ['offset' => $offset, 'length' => $length, 'crc' => $crc] = unpack('vversion/Voffset/Vlength/Vcrc', $bytes, $p);
            $p += 14;
            if ($offset + $length > $size) {
                throw new InvalidSave('damaged', 'The file is cut short.');
            }
            if (crc32(substr($bytes, $offset, $length)) !== $crc) {
                throw new InvalidSave('damaged', "Chunk {$id} fails its CRC-32.");
            }
        }

        return new self($header, $size);
    }

    /**
     * The header fields the Save table keeps (SAVE-061), checked for their types.
     *
     * @return array{saveId: string, campaignId: string, kind: string, name: string, savedAt: int, device: string, platform: string, gameVersion: string, formatVersion: int, turn: int, year: int, month: int, nation: string, ironman: bool, parent: ?string}
     *
     * @throws InvalidSave
     */
    public function row(): array
    {
        $h = $this->header;
        $text = fn (string $k, int $max) => \is_string($h[$k] ?? null) && '' !== $h[$k] && mb_strlen($h[$k]) <= $max ? $h[$k] : throw new InvalidSave('bad_header', "The header's {$k} is missing or too long.");
        $int = fn (mixed $v, string $k) => \is_int($v) && $v >= 0 ? $v : throw new InvalidSave('bad_header', "The header's {$k} is not a whole number.");
        $kind = $text('kind', 16);
        if (!\in_array($kind, ['resume', 'autosave', 'manual', 'ironman'], true)) {
            throw new InvalidSave('bad_header', "The header's kind is unknown.");
        }
        foreach (['saveId', 'campaignId'] as $k) {
            if (1 !== preg_match('/^[A-Za-z0-9_-]{1,64}$/', (string) ($h[$k] ?? ''))) {
                throw new InvalidSave('bad_header', "The header's {$k} is not an id.");
            }
        }
        $parent = $h['parent'] ?? null;

        return [
            'saveId' => $h['saveId'],
            'campaignId' => $h['campaignId'],
            'kind' => $kind,
            'name' => $text('name', 120),
            'savedAt' => $int($h['savedAt'] ?? null, 'savedAt'),
            'device' => $text('device', 60),
            'platform' => $text('platform', 16),
            'gameVersion' => $text('gameVersion', 32),
            'formatVersion' => $int($h['formatVersion'] ?? null, 'formatVersion'),
            'turn' => $int($h['turn'] ?? null, 'turn'),
            'year' => $int($h['date']['y'] ?? null, 'date'),
            'month' => $int($h['date']['m'] ?? null, 'date'),
            'nation' => $text('playerNation', 40),
            'ironman' => true === ($h['ironman'] ?? false),
            'parent' => \is_string($parent) && '' !== $parent ? $parent : null,
        ];
    }
}
