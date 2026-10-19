<?php

namespace App\Entity;

use App\Repository\IronmanHeadRepository;
use Doctrine\ORM\Mapping as ORM;

/** The newest ironman save of a campaign (SAVE-063, INV-SAVE-15): the one line every device must follow. */
#[ORM\Entity(repositoryClass: IronmanHeadRepository::class)]
#[ORM\UniqueConstraint(name: 'uniq_ironman_head', fields: ['account', 'campaignId'])]
class IronmanHead
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Account $account;

    #[ORM\Column(length: 64)]
    private string $campaignId;

    #[ORM\Column(length: 64)]
    private string $saveId;

    public function __construct(Account $account, string $campaignId, string $saveId)
    {
        $this->account = $account;
        $this->campaignId = $campaignId;
        $this->saveId = $saveId;
    }

    public function getSaveId(): string
    {
        return $this->saveId;
    }

    public function moveTo(string $saveId): void
    {
        $this->saveId = $saveId;
    }
}
