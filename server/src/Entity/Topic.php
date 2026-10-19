<?php

namespace App\Entity;

use App\Repository\TopicRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\String\Slugger\AsciiSlugger;

/** A community topic: a title on one board, and its posts (the first is the opening post). */
#[ORM\Entity(repositoryClass: TopicRepository::class)]
#[ORM\Table(name: 'community_topic')]
#[ORM\Index(name: 'idx_topic_board_activity', fields: ['board', 'hidden', 'lastActivityAt'])]
#[ORM\Index(name: 'idx_topic_activity', fields: ['hidden', 'lastActivityAt'])]
class Topic
{
    public const TITLE_MIN = 3;
    public const TITLE_MAX = 120;

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 40)]
    private string $board;

    #[ORM\Column(length: self::TITLE_MAX)]
    private string $title;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    private Account $author;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    /** When the latest post was written; boards list their topics by it. */
    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $lastActivityAt;

    /** Who wrote the latest post. */
    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    private Account $lastPoster;

    #[ORM\Column]
    private bool $locked = false;

    #[ORM\Column]
    private bool $hidden = false;

    public function __construct(string $board, string $title, Account $author)
    {
        $this->board = $board;
        $this->title = $title;
        $this->author = $author;
        $this->createdAt = new \DateTimeImmutable();
        $this->lastActivityAt = $this->createdAt;
        $this->lastPoster = $author;
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getBoard(): string
    {
        return $this->board;
    }

    public function getTitle(): string
    {
        return $this->title;
    }

    public function setTitle(string $title): void
    {
        $this->title = $title;
    }

    public function getAuthor(): Account
    {
        return $this->author;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getLastActivityAt(): \DateTimeImmutable
    {
        return $this->lastActivityAt;
    }

    public function getLastPoster(): Account
    {
        return $this->lastPoster;
    }

    public function touch(Post $post): void
    {
        $this->lastActivityAt = $post->getCreatedAt();
        $this->lastPoster = $post->getAuthor();
    }

    public function isLocked(): bool
    {
        return $this->locked;
    }

    public function setLocked(bool $locked): void
    {
        $this->locked = $locked;
    }

    public function isHidden(): bool
    {
        return $this->hidden;
    }

    public function setHidden(bool $hidden): void
    {
        $this->hidden = $hidden;
    }

    /** The address slug, made from the title (the id alone finds the topic). */
    public function getSlug(): string
    {
        $slug = (new AsciiSlugger())->slug($this->title)->lower()->truncate(60)->trim('-')->toString();

        return '' === $slug ? 'topic' : $slug;
    }
}
