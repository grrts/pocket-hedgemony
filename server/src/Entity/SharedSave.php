<?php

namespace App\Entity;

use App\Repository\SharedSaveRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * A save shared with the community (domain/saves/spec.md SAVE-124 … SAVE-131): a public copy
 * of one save under a share code, attached to the community post it came with. The bytes sit
 * in SaveObjects under key(); the row keeps the header fields its card shows. Separate from
 * the account's cloud saves: it never counts toward their quota.
 */
#[ORM\Entity(repositoryClass: SharedSaveRepository::class)]
#[ORM\Table(name: 'shared_save')]
#[ORM\UniqueConstraint(name: 'uniq_shared_save_code', fields: ['code'])]
#[ORM\Index(name: 'idx_shared_save_account', fields: ['account', 'removedAt'])]
class SharedSave
{
    /** Letters and digits that cannot be mistaken for each other when typed (no 0, O, 1, I). */
    public const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    public const CODE = '[A-HJ-NP-Z2-9]{8}';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 8)]
    private string $code;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Account $account;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Post $post;

    #[ORM\Column(length: 120)]
    private string $title;

    #[ORM\Column(length: 40)]
    private string $nation;

    /** The realm's name as the game shows it ("Castile"); the server has no list of nations. */
    #[ORM\Column(length: 60)]
    private string $realm;

    #[ORM\Column]
    private int $year;

    #[ORM\Column]
    private int $month;

    #[ORM\Column]
    private int $turn;

    #[ORM\Column]
    private int $playSeconds;

    #[ORM\Column(length: 32)]
    private string $gameVersion;

    #[ORM\Column]
    private bool $ironman;

    #[ORM\Column]
    private bool $modified;

    /** The header's 96 × 64 map crop, base64 PNG, or empty. */
    #[ORM\Column(type: Types::TEXT)]
    private string $thumbnail;

    #[ORM\Column]
    private int $size;

    #[ORM\Column]
    private int $plays = 0;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $removedAt = null;

    /** @param array{name: string, nation: string, realm: string, year: int, month: int, turn: int, playSeconds: int, gameVersion: string, ironman: bool, modified: bool, thumbnail: string} $card */
    public function __construct(string $code, Account $account, Post $post, string $title, array $card, int $size, \DateTimeImmutable $now)
    {
        $this->code = $code;
        $this->account = $account;
        $this->post = $post;
        $this->title = $title;
        $this->nation = $card['nation'];
        $this->realm = $card['realm'];
        $this->year = $card['year'];
        $this->month = $card['month'];
        $this->turn = $card['turn'];
        $this->playSeconds = $card['playSeconds'];
        $this->gameVersion = $card['gameVersion'];
        $this->ironman = $card['ironman'];
        $this->modified = $card['modified'];
        $this->thumbnail = $card['thumbnail'];
        $this->size = $size;
        $this->createdAt = $now;
    }

    public static function newCode(): string
    {
        $code = '';
        for ($i = 0; $i < 8; ++$i) {
            $code .= self::ALPHABET[random_int(0, 31)];
        }

        return $code;
    }

    /** A typed code, as the game or a person writes it: any case, with or without the dash. */
    public static function normalise(string $typed): string
    {
        return strtoupper(str_replace(['-', ' '], '', $typed));
    }

    public static function objectKey(string $code): string
    {
        return 'shared/'.$code.'.phsave';
    }

    public function key(): string
    {
        return self::objectKey($this->code);
    }

    public function getCode(): string
    {
        return $this->code;
    }

    /** `K7QX-M2PA`: the code as people read and type it. */
    public function getShownCode(): string
    {
        return substr($this->code, 0, 4).'-'.substr($this->code, 4);
    }

    public function getAccount(): Account
    {
        return $this->account;
    }

    public function getPost(): Post
    {
        return $this->post;
    }

    public function getTopic(): Topic
    {
        return $this->post->getTopic();
    }

    public function getTitle(): string
    {
        return $this->title;
    }

    public function getNation(): string
    {
        return $this->nation;
    }

    public function getRealm(): string
    {
        return $this->realm;
    }

    public function getYear(): int
    {
        return $this->year;
    }

    public function getMonth(): int
    {
        return $this->month;
    }

    public function getTurn(): int
    {
        return $this->turn;
    }

    public function getPlaySeconds(): int
    {
        return $this->playSeconds;
    }

    public function getGameVersion(): string
    {
        return $this->gameVersion;
    }

    public function isIronman(): bool
    {
        return $this->ironman;
    }

    public function isModified(): bool
    {
        return $this->modified;
    }

    public function getThumbnail(): string
    {
        return $this->thumbnail;
    }

    public function getSize(): int
    {
        return $this->size;
    }

    public function getPlays(): int
    {
        return $this->plays;
    }

    public function played(): void
    {
        ++$this->plays;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function isRemoved(): bool
    {
        return null !== $this->removedAt;
    }

    public function remove(\DateTimeImmutable $now): void
    {
        $this->removedAt ??= $now;
    }

    /** Whether anyone may play it: not removed, and its post and topic not hidden (SAVE-127). */
    public function isPlayable(): bool
    {
        return !$this->isRemoved() && !$this->post->isHidden() && !$this->post->getTopic()->isHidden();
    }

    /** "May 1492". */
    public function getDateText(): string
    {
        return (\DateTimeImmutable::createFromFormat('!n', (string) $this->month) ?: new \DateTimeImmutable('2000-01-01'))->format('F').' '.$this->year;
    }

    /** "3 h 20 min", "45 min". */
    public function getPlayTimeText(): string
    {
        $min = intdiv($this->playSeconds, 60);
        $h = intdiv($min, 60);

        return $h > 0 ? $h.' h'.($min % 60 ? ' '.($min % 60).' min' : '') : max(1, $min).' min';
    }

    /** The save card (SAVE-127). */
    public function toArray(): array
    {
        $topic = $this->getTopic();

        return [
            'code' => $this->code,
            'title' => $this->title,
            'author' => $this->account->getDisplayName(),
            'nation' => $this->nation,
            'realm' => $this->realm,
            'date' => ['y' => $this->year, 'm' => $this->month],
            'turn' => $this->turn,
            'playSeconds' => $this->playSeconds,
            'gameVersion' => $this->gameVersion,
            'ironman' => $this->ironman,
            'modified' => $this->modified,
            'thumbnail' => $this->thumbnail,
            'size' => $this->size,
            'plays' => $this->plays,
            'topicId' => $topic->getId(),
            'topicSlug' => $topic->getSlug(),
            'postId' => $this->post->getId(),
            'createdAt' => $this->createdAt->format(\DATE_ATOM),
        ];
    }
}
