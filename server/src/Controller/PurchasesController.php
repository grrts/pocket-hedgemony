<?php

namespace App\Controller;

use App\Entity\Account;
use App\Entity\Entitlement;
use App\Purchases\Entitlements;
use App\Purchases\PurchaseRefused;
use App\Purchases\StoreUnavailable;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Validator\Validator\ValidatorInterface;

/**
 * The full game on each store, for the game (domain/saves SAVE-170 … SAVE-175, SAVE-178): "is the full game
 * unlocked on this store?", and the store's proof after Buy or Restore purchases.
 */
final class PurchasesController
{
    use JsonInput;

    public function __construct(
        private readonly Entitlements $entitlements,
        private readonly ValidatorInterface $validator,
    ) {
    }

    #[Route('/api/entitlements/{store}', name: 'entitlement_show', requirements: ['store' => 'steam|apple|google'], methods: ['GET'])]
    #[IsGranted('ROLE_PLAYER')]
    public function show(#[CurrentUser] Account $account, string $store): JsonResponse
    {
        return $this->answer(fn () => $this->entitlements->answer($account, $store));
    }

    #[Route('/api/purchases', name: 'purchase_create', methods: ['POST'])]
    #[IsGranted('ROLE_PLAYER')]
    public function create(#[CurrentUser] Account $account, Request $request): JsonResponse
    {
        $data = $this->decode($request);
        $store = $data['store'] ?? null;
        $proof = match ($store) {
            Entitlement::APPLE => ['signedTransaction' => [new Assert\NotBlank(), new Assert\Type('string'), new Assert\Length(max: 20000)]],
            Entitlement::GOOGLE => ['purchaseToken' => [new Assert\NotBlank(), new Assert\Type('string'), new Assert\Length(max: 512)]],
            default => [],
        };
        $errors = $this->validate($this->validator, $data, new Assert\Collection(['store' => [new Assert\NotBlank(), new Assert\Choice(choices: Entitlement::STORES)]] + $proof));
        if ($errors) {
            return $errors;
        }

        return $this->answer(fn () => $this->entitlements->submit($account, $store, $data));
    }

    /** @param callable(): array<string, mixed> $run */
    private function answer(callable $run): JsonResponse
    {
        try {
            return new JsonResponse($run());
        } catch (StoreUnavailable $e) {
            return new JsonResponse(['error' => $e->unreachable ? 'store_unreachable' : 'store_unavailable', 'message' => $e->getMessage()], Response::HTTP_SERVICE_UNAVAILABLE);
        } catch (PurchaseRefused $e) {
            return new JsonResponse(['error' => $e->reason, 'message' => $e->getMessage()], 'other_account' === $e->reason ? Response::HTTP_CONFLICT : Response::HTTP_UNPROCESSABLE_ENTITY);
        }
    }
}
