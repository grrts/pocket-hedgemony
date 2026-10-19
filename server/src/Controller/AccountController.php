<?php

namespace App\Controller;

use App\Account\Registration;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Validator\Validator\ValidatorInterface;

final class AccountController
{
    use JsonInput;

    public function __construct(
        private readonly Registration $registration,
        private readonly ValidatorInterface $validator,
    ) {
    }

    #[Route('/api/accounts', name: 'account_register', methods: ['POST'])]
    public function register(Request $request): JsonResponse
    {
        $data = $this->decode($request);
        $errors = $this->validate($this->validator, $data, Registration::constraint());
        if ($errors) {
            return $errors;
        }

        if ($this->registration->isEmailTaken($data['email'])) {
            return new JsonResponse(['error' => 'email_taken'], Response::HTTP_CONFLICT);
        }

        $account = $this->registration->register($data['email'], $data['displayName'], $data['password']);

        return new JsonResponse([
            'id' => $account->getId()->toRfc4122(),
            'email' => $account->getEmail(),
            'displayName' => $account->getDisplayName(),
        ], Response::HTTP_CREATED);
    }
}
