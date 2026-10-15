<?php

namespace App\Controller;

use App\Entity\Account;
use App\Repository\AccountRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Validator\Validator\ValidatorInterface;

final class AccountController
{
    use JsonInput;

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly AccountRepository $accounts,
        private readonly UserPasswordHasherInterface $hasher,
        private readonly ValidatorInterface $validator,
    ) {
    }

    #[Route('/api/accounts', name: 'account_register', methods: ['POST'])]
    public function register(Request $request): JsonResponse
    {
        $data = $this->decode($request);
        $errors = $this->validate($this->validator, $data, new Assert\Collection([
            'email' => [new Assert\NotBlank(), new Assert\Email(), new Assert\Length(max: 180)],
            'displayName' => [new Assert\NotBlank(), new Assert\Length(min: 2, max: 40)],
            'password' => [new Assert\NotBlank(), new Assert\Length(min: 8, max: 200)],
        ]));
        if ($errors) {
            return $errors;
        }

        if ($this->accounts->findOneBy(['email' => mb_strtolower(trim($data['email']))])) {
            return new JsonResponse(['error' => 'email_taken'], Response::HTTP_CONFLICT);
        }

        $account = new Account($data['email'], $data['displayName']);
        $account->setPassword($this->hasher->hashPassword($account, $data['password']));
        $this->em->persist($account);
        $this->em->flush();

        return new JsonResponse([
            'id' => $account->getId()->toRfc4122(),
            'email' => $account->getEmail(),
            'displayName' => $account->getDisplayName(),
            'adsRemoved' => $account->hasAdsRemoved(),
        ], Response::HTTP_CREATED);
    }
}
