<?php

namespace App\Entity;

use App\Repository\SaveChangeRepository;
use Doctrine\ORM\Mapping as ORM;

/**
 * One entry of the change log behind "changes since the cursor" (SAVE-064): a save uploaded or
 * removed. The cursor is the id of the last entry a device has seen.
 */
#[ORM\Entity(repositoryClass: SaveChangeRepository::class)]
#[ORM\Index(name: 'idx_save_change_account', fields: ['account', 'id'])]
class SaveChange
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Account $account;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private CloudSave $save;

    public function __construct(Account $account, CloudSave $save)
    {
        $this->account = $account;
        $this->save = $save;
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getSave(): CloudSave
    {
        return $this->save;
    }
}
