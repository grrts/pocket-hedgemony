<?php

namespace App\Entity;

use App\Repository\CrashReportRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

/**
 * One uncaught error, unhandled rejection or worker failure the client caught and sent.
 * Anonymous: it carries the install id but never an account. Crashes with the same
 * fingerprint are the same bug, so the stats page groups by it.
 */
#[ORM\Entity(repositoryClass: CrashReportRepository::class)]
#[ORM\Index(name: 'idx_crash_fingerprint_time', fields: ['fingerprint', 'occurredAt'])]
#[ORM\Index(name: 'idx_crash_received', fields: ['receivedAt'])]
class CrashReport
{
    public const KINDS = ['error', 'rejection', 'worker'];

    #[ORM\Id]
    #[ORM\Column(type: 'uuid')]
    private Uuid $id;

    #[ORM\Column(length: 64)]
    private string $installId;

    #[ORM\Column(length: 32)]
    private string $runtime;

    #[ORM\Column(length: 32)]
    private string $version;

    #[ORM\Column(length: 16)]
    private string $kind;

    #[ORM\Column(type: Types::TEXT)]
    private string $message;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $stack;

    /** Where in the game it happened, such as a screen id. ("where" is an SQL keyword, hence the column name.) */
    #[ORM\Column(name: 'location', length: 64, nullable: true)]
    private ?string $where;

    #[ORM\Column(length: 64, nullable: true)]
    private ?string $browser;

    #[ORM\Column(length: 40)]
    private string $fingerprint;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $occurredAt;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $receivedAt;

    public function __construct(
        string $installId,
        string $runtime,
        string $version,
        string $kind,
        string $message,
        ?string $stack,
        ?string $where,
        ?string $browser,
        \DateTimeImmutable $occurredAt,
    ) {
        $this->id = Uuid::v7();
        $this->installId = $installId;
        $this->runtime = $runtime;
        $this->version = $version;
        $this->kind = $kind;
        $this->message = $message;
        $this->stack = $stack;
        $this->where = $where;
        $this->browser = $browser;
        $this->occurredAt = $occurredAt;
        $this->fingerprint = self::fingerprint($kind, $message, $stack);
        $this->receivedAt = new \DateTimeImmutable();
    }

    /**
     * sha1 of the kind, the message with every run of digits replaced by '#', and the
     * first stack line that names a file (file.ext:line), so "Province 12 missing" and
     * "Province 7 missing" thrown from the same place count as one bug.
     */
    public static function fingerprint(string $kind, string $message, ?string $stack): string
    {
        $frame = '';
        foreach (preg_split('/\R/', $stack ?? '') as $line) {
            if (preg_match('/[\w.-]+\.[a-z]{1,5}(\?\S*)?:\d+/i', $line)) {
                $frame = trim($line);
                break;
            }
        }

        return sha1($kind."\n".preg_replace('/\d+/', '#', $message)."\n".$frame);
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getInstallId(): string
    {
        return $this->installId;
    }

    public function getRuntime(): string
    {
        return $this->runtime;
    }

    public function getVersion(): string
    {
        return $this->version;
    }

    public function getKind(): string
    {
        return $this->kind;
    }

    public function getMessage(): string
    {
        return $this->message;
    }

    public function getStack(): ?string
    {
        return $this->stack;
    }

    public function getWhere(): ?string
    {
        return $this->where;
    }

    public function getBrowser(): ?string
    {
        return $this->browser;
    }

    public function getFingerprint(): string
    {
        return $this->fingerprint;
    }

    public function getOccurredAt(): \DateTimeImmutable
    {
        return $this->occurredAt;
    }
}
