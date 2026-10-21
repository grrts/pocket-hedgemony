<?php

namespace App\Account;

use App\Entity\Account;
use App\Repository\AccountRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * Creating a game account, with the same rules for the JSON API (POST /api/accounts)
 * and the website's sign-up page (/community/join).
 */
final class Registration
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly AccountRepository $accounts,
        private readonly UserPasswordHasherInterface $hasher,
    ) {
    }

    /** What a sign-up must hold: email, displayName and password. */
    public static function constraint(): Assert\Collection
    {
        return new Assert\Collection([
            'email' => [new Assert\NotBlank(), new Assert\Email(), new Assert\Length(max: 180)],
            'displayName' => [new Assert\NotBlank(), new Assert\Length(min: 2, max: 40)],
            'password' => [new Assert\NotBlank(), new Assert\Length(min: 8, max: 200)],
        ]);
    }

    public function isEmailTaken(string $email): bool
    {
        return null !== $this->accounts->findOneBy(['email' => mb_strtolower(trim($email))]);
    }

    /** Creates the account; the input must have passed constraint() and isEmailTaken(). */
    public function register(string $email, string $displayName, string $password): Account
    {
        $account = new Account($email, $displayName);
        $account->setPassword($this->hasher->hashPassword($account, $password));
        $this->em->persist($account);
        $this->em->flush();

        return $account;
    }
}
