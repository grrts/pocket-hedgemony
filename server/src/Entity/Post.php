<?php

namespace App\Entity;

use App\Repository\PostRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/** A post in a community topic: plain text, shown with its line breaks and links. */
#[ORM\Entity(repositoryClass: PostRepository::class)]
#[ORM\Table(name: 'community_post')]
#[ORM\Index(name: 'idx_post_topic', fields: ['topic', 'hidden', 'id'])]
class Post
{
    public const BODY_MIN = 2;
    public const BODY_MAX = 10000;
    /** How long authors may edit their post; moderators always may. */
    public const EDIT_WINDOW = 'PT30M';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Topic $topic;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    private Account $author;

    #[ORM\Column(type: Types::TEXT)]
    private string $body;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $editedAt = null;

    #[ORM\Column]
    private bool $hidden = false;

    public function __construct(Topic $topic, Account $author, string $body)
    {
        $this->topic = $topic;
        $this->author = $author;
        $this->body = $body;
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getTopic(): Topic
    {
        return $this->topic;
    }

    public function getAuthor(): Account
    {
        return $this->author;
    }

    public function getBody(): string
    {
        return $this->body;
    }

    public function edit(string $body): void
    {
        if ($body !== $this->body) {
            $this->body = $body;
            $this->editedAt = new \DateTimeImmutable();
        }
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getEditedAt(): ?\DateTimeImmutable
    {
        return $this->editedAt;
    }

    public function isHidden(): bool
    {
        return $this->hidden;
    }

    public function setHidden(bool $hidden): void
    {
        $this->hidden = $hidden;
    }

    /** Whether this account may edit the post now: its author within 30 minutes, or a moderator. */
    public function canBeEditedBy(?Account $account, ?\DateTimeImmutable $now = null): bool
    {
        if (null === $account) {
            return false;
        }
        if ($account->isModerator()) {
            return true;
        }

        return $account->getId()->equals($this->author->getId())
            && !$this->hidden
            && !$this->topic->isLocked()
            && ($now ?? new \DateTimeImmutable()) < $this->createdAt->add(new \DateInterval(self::EDIT_WINDOW));
    }
}
