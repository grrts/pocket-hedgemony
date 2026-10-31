<?php

namespace App\Entity;

use App\Repository\SignInCodeRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * A one-time code that carries a browser sign-in back to the game (SAVE-151): made when Steam's
 * answer passed every check, exchanged once at POST /api/sessions. Only the code's hash is kept.
 * The row also keeps Steam's response nonce, unique, so the same answer is never taken twice.
 */
#[ORM\Entity(repositoryClass: SignInCodeRepository::class)]
#[ORM\UniqueConstraint(name: 'uniq_sign_in_code', fields: ['codeHash'])]
#[ORM\UniqueConstraint(name: 'uniq_sign_in_nonce', fields: ['responseNonce'])]
#[ORM\Index(name: 'idx_sign_in_code_expires', fields: ['expiresAt'])]
class SignInCode
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 64)]
    private string $codeHash;

    #[ORM\Column(length: 16)]
    private string $provider;

    #[ORM\Column(length: 191)]
    private string $subject;

    #[ORM\Column(length: 191)]
    private string $responseNonce;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $expiresAt;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $usedAt = null;

    public function __construct(string $codeHash, string $provider, string $subject, string $responseNonce, \DateTimeImmutable $expiresAt)
    {
        $this->codeHash = $codeHash;
        $this->provider = $provider;
        $this->subject = $subject;
        $this->responseNonce = $responseNonce;
        $this->expiresAt = $expiresAt;
    }

    public function getProvider(): string
    {
        return $this->provider;
    }

    public function getSubject(): string
    {
        return $this->subject;
    }

    public function getUsedAt(): ?\DateTimeImmutable
    {
        return $this->usedAt;
    }
}
