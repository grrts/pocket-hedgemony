<?php

namespace App\Entity;

use App\Repository\CloudSaveRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * A row of the Save table (SAVE-061): the header fields the Load screen needs, never the bytes,
 * which sit in SaveObjects under objectKey(). A removed save keeps its row as a tombstone
 * (SAVE-062) until its bytes are purged.
 */
#[ORM\Entity(repositoryClass: CloudSaveRepository::class)]
#[ORM\Table(name: 'cloud_save')]
#[ORM\UniqueConstraint(name: 'uniq_cloud_save', fields: ['account', 'saveId'])]
#[ORM\Index(name: 'idx_cloud_save_campaign', fields: ['account', 'campaignId'])]
class CloudSave
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Account $account;

    #[ORM\Column(length: 64)]
    private string $saveId;

    #[ORM\Column(length: 64)]
    private string $campaignId;

    #[ORM\Column(length: 16)]
    private string $kind;

    #[ORM\Column(length: 120)]
    private string $name;

    /** Milliseconds since 1970, as the header gives it. */
    #[ORM\Column(type: Types::BIGINT)]
    private string $savedAt;

    #[ORM\Column(length: 60)]
    private string $device;

    #[ORM\Column(length: 16)]
    private string $platform;

    #[ORM\Column(length: 32)]
    private string $gameVersion;

    #[ORM\Column]
    private int $formatVersion;

    #[ORM\Column]
    private int $turn;

    #[ORM\Column]
    private int $year;

    #[ORM\Column]
    private int $month;

    #[ORM\Column(length: 40)]
    private string $nation;

    #[ORM\Column]
    private bool $ironman;

    #[ORM\Column]
    private int $size;

    /** SHA-256 of the bytes, so a repeated upload of the same file is recognised (SAVE-063). */
    #[ORM\Column(length: 64)]
    private string $sha256;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $uploadedAt;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $deletedAt = null;

    #[ORM\Column]
    private bool $purged = false;

    /** @param array{saveId: string, campaignId: string, kind: string, name: string, savedAt: int, device: string, platform: string, gameVersion: string, formatVersion: int, turn: int, year: int, month: int, nation: string, ironman: bool} $row */
    public function __construct(Account $account, array $row, int $size, string $sha256, \DateTimeImmutable $now)
    {
        $this->account = $account;
        $this->saveId = $row['saveId'];
        $this->campaignId = $row['campaignId'];
        $this->kind = $row['kind'];
        $this->name = $row['name'];
        $this->savedAt = (string) $row['savedAt'];
        $this->device = $row['device'];
        $this->platform = $row['platform'];
        $this->gameVersion = $row['gameVersion'];
        $this->formatVersion = $row['formatVersion'];
        $this->turn = $row['turn'];
        $this->year = $row['year'];
        $this->month = $row['month'];
        $this->nation = $row['nation'];
        $this->ironman = $row['ironman'];
        $this->size = $size;
        $this->sha256 = $sha256;
        $this->uploadedAt = $now;
    }

    public static function objectKey(Account $account, string $campaignId, string $saveId): string
    {
        return $account->getId()->toRfc4122().'/'.$campaignId.'/'.$saveId.'.phsave';
    }

    public function key(): string
    {
        return self::objectKey($this->account, $this->campaignId, $this->saveId);
    }

    /** The save moves to the account another was combined into (SAVE-187); its bytes move to the new key(). */
    public function moveTo(Account $account): void
    {
        $this->account = $account;
    }

    public function isPurged(): bool
    {
        return $this->purged;
    }

    /** Milliseconds since 1970, as the header gives it. */
    public function getSavedAt(): int
    {
        return (int) $this->savedAt;
    }

    public function getSaveId(): string
    {
        return $this->saveId;
    }

    public function getCampaignId(): string
    {
        return $this->campaignId;
    }

    public function getSize(): int
    {
        return $this->size;
    }

    public function getSha256(): string
    {
        return $this->sha256;
    }

    public function getDeletedAt(): ?\DateTimeImmutable
    {
        return $this->deletedAt;
    }

    public function isDeleted(): bool
    {
        return null !== $this->deletedAt;
    }

    public function delete(\DateTimeImmutable $now): void
    {
        $this->deletedAt ??= $now;
    }

    public function markPurged(): void
    {
        $this->purged = true;
    }

    /** What `GET /api/saves` lists for the Load screen. */
    public function toArray(): array
    {
        return [
            'saveId' => $this->saveId,
            'campaignId' => $this->campaignId,
            'kind' => $this->kind,
            'name' => $this->name,
            'savedAt' => (int) $this->savedAt,
            'device' => $this->device,
            'platform' => $this->platform,
            'gameVersion' => $this->gameVersion,
            'formatVersion' => $this->formatVersion,
            'turn' => $this->turn,
            'date' => ['y' => $this->year, 'm' => $this->month],
            'nation' => $this->nation,
            'ironman' => $this->ironman,
            'size' => $this->size,
        ];
    }
}
