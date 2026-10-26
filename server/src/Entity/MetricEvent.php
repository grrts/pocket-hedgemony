<?php

namespace App\Entity;

use App\Repository\MetricEventRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

/**
 * One gameplay or business event sent by the client, such as
 * "campaign_started", "turn_ended" or "ad_shown".
 */
#[ORM\Entity(repositoryClass: MetricEventRepository::class)]
#[ORM\Index(name: 'idx_metric_name_time', fields: ['name', 'occurredAt'])]
#[ORM\Index(name: 'idx_metric_time', fields: ['occurredAt'])]
#[ORM\Index(name: 'idx_metric_received', fields: ['receivedAt'])]
class MetricEvent
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid')]
    private Uuid $id;

    #[ORM\Column(type: 'uuid', nullable: true)]
    private ?Uuid $accountId;

    /** Random id the client generates per install, so anonymous players can be counted too. */
    #[ORM\Column(length: 64)]
    private string $installId;

    #[ORM\Column(length: 64)]
    private string $name;

    #[ORM\Column(type: Types::JSON)]
    private array $properties;

    #[ORM\Column(length: 32)]
    private string $runtime;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $occurredAt;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $receivedAt;

    public function __construct(
        string $installId,
        string $name,
        array $properties,
        string $runtime,
        \DateTimeImmutable $occurredAt,
        ?Uuid $accountId = null,
    ) {
        $this->id = Uuid::v7();
        $this->installId = $installId;
        $this->name = $name;
        $this->properties = $properties;
        $this->runtime = $runtime;
        $this->occurredAt = $occurredAt;
        $this->accountId = $accountId;
        $this->receivedAt = new \DateTimeImmutable();
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function getInstallId(): string
    {
        return $this->installId;
    }

    public function getProperties(): array
    {
        return $this->properties;
    }
}
