<?php

namespace App\Entity;

use App\Repository\PostReportRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/** A player telling the moderators a post breaks the rules. Open until a moderator hides the post or dismisses it. */
#[ORM\Entity(repositoryClass: PostReportRepository::class)]
#[ORM\Table(name: 'community_report')]
#[ORM\UniqueConstraint(name: 'uniq_report_post_reporter', fields: ['post', 'reporter'])]
#[ORM\Index(name: 'idx_report_open', fields: ['resolvedAt'])]
class PostReport
{
    public const REASON_MAX = 500;

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Post $post;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    private Account $reporter;

    #[ORM\Column(length: self::REASON_MAX)]
    private string $reason;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $resolvedAt = null;

    public function __construct(Post $post, Account $reporter, string $reason)
    {
        $this->post = $post;
        $this->reporter = $reporter;
        $this->reason = $reason;
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getPost(): Post
    {
        return $this->post;
    }

    public function getReporter(): Account
    {
        return $this->reporter;
    }

    public function getReason(): string
    {
        return $this->reason;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function isResolved(): bool
    {
        return null !== $this->resolvedAt;
    }

    public function resolve(): void
    {
        $this->resolvedAt ??= new \DateTimeImmutable();
    }
}
