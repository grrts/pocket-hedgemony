<?php

namespace App\Entity;

use App\Repository\AccountRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: AccountRepository::class)]
#[ORM\UniqueConstraint(name: 'uniq_account_email', fields: ['email'])]
class Account implements UserInterface, PasswordAuthenticatedUserInterface
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid')]
    private Uuid $id;

    #[ORM\Column(length: 180)]
    private string $email;

    #[ORM\Column(length: 40)]
    private string $displayName;

    #[ORM\Column]
    private string $password = '';

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;


    /**
     * Roles beyond ROLE_PLAYER, such as ROLE_MODERATOR (granted by app:community:moderator).
     * Nullable so adding the column to a filled table needs nothing but doctrine:schema:update.
     *
     * @var list<string>|null
     */
    #[ORM\Column(type: Types::JSON, nullable: true)]
    private ?array $roles = null;

    public function __construct(string $email, string $displayName)
    {
        $this->id = Uuid::v7();
        $this->email = mb_strtolower(trim($email));
        $this->displayName = trim($displayName);
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getEmail(): string
    {
        return $this->email;
    }

    public function getDisplayName(): string
    {
        return $this->displayName;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getPassword(): string
    {
        return $this->password;
    }

    public function setPassword(string $hash): void
    {
        $this->password = $hash;
    }

    public function getUserIdentifier(): string
    {
        return $this->email;
    }

    public function getRoles(): array
    {
        return array_values(array_unique(['ROLE_PLAYER', ...($this->roles ?? [])]));
    }

    public function addRole(string $role): void
    {
        $this->roles = array_values(array_unique([...($this->roles ?? []), $role]));
    }

    public function removeRole(string $role): void
    {
        $this->roles = array_values(array_diff($this->roles ?? [], [$role])) ?: null;
    }

    public function isModerator(): bool
    {
        return \in_array('ROLE_MODERATOR', $this->getRoles(), true);
    }

    public function eraseCredentials(): void
    {
    }
}
