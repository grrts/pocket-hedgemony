<?php

namespace App\Controller;

use App\Account\Registration;
use App\Account\Steam\SteamRefused;
use App\Account\Steam\SteamTickets;
use App\Account\Steam\SteamUnavailable;
use App\Account\Tokens;
use App\Entity\Account;
use App\Entity\Device;
use App\Entity\Identity;
use App\Repository\AccountRepository;
use App\Repository\DeviceRepository;
use App\Repository\IdentityRepository;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Clock\ClockInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\RateLimiter\RateLimiterFactoryInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Validator\Validator\ValidatorInterface;

/**
 * Signing the game in (domain/saves/spec.md SAVE-057, SAVE-112 … SAVE-118): with email and
 * password or with a Steam ticket, refreshing the tokens, the account's sign-ins and devices,
 * and signing a device out.
 */
final class SessionController
{
    use JsonInput;

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly AccountRepository $accounts,
        private readonly IdentityRepository $identities,
        private readonly DeviceRepository $devices,
        private readonly Registration $registration,
        private readonly UserPasswordHasherInterface $hasher,
        private readonly ValidatorInterface $validator,
        private readonly Tokens $tokens,
        private readonly SteamTickets $steam,
        private readonly ClockInterface $clock,
        private readonly RateLimiterFactoryInterface $apiSignInLimiter,
    ) {
    }

    #[Route('/api/sessions', name: 'session_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $data = $this->decode($request);
        $device = new Assert\Collection([
            'name' => [new Assert\NotBlank(), new Assert\Type('string'), new Assert\Length(max: 60)],
            'platform' => [new Assert\NotBlank(), new Assert\Choice(choices: Device::PLATFORMS)],
        ]);
        $steam = \array_key_exists('steamTicket', $data);
        $errors = $this->validate($this->validator, $data, $steam
            ? new Assert\Collection([
                'steamTicket' => [new Assert\NotBlank(), new Assert\Type('string')],
                'displayName' => new Assert\Optional([new Assert\Type('string')]),
                'device' => $device,
            ])
            : new Assert\Collection([
                'email' => [new Assert\NotBlank(), new Assert\Type('string')],
                'password' => [new Assert\NotBlank(), new Assert\Type('string')],
                'device' => $device,
            ]));
        if ($errors) {
            return $errors;
        }

        $created = false;
        if ($steam) {
            $steamId = $this->steamId($data['steamTicket']);
            if ($steamId instanceof JsonResponse) {
                return $steamId;
            }
            $identity = $this->identities->findOneBy(['provider' => Identity::STEAM, 'subject' => $steamId]);
            if (null === $identity) {
                $account = new Account(null, self::displayNameOr($data['displayName'] ?? null));
                $this->em->persist($account);
                $this->em->persist(new Identity($account, Identity::STEAM, $steamId, $this->clock->now()));
                $created = true;
            } else {
                $account = $identity->getAccount();
            }
        } else {
            $email = mb_strtolower(trim($data['email']));
            $limiter = $this->apiSignInLimiter->create($email.'|'.($request->getClientIp() ?? 'unknown'));
            if (!$limiter->consume()->isAccepted()) {
                return new JsonResponse(['error' => 'too_many_tries'], Response::HTTP_TOO_MANY_REQUESTS);
            }
            $account = $this->accounts->findOneBy(['email' => $email]);
            if (null === $account || '' === $account->getPassword() || !$this->hasher->isPasswordValid($account, $data['password'])) {
                return new JsonResponse(['error' => 'wrong_email_or_password'], Response::HTTP_UNAUTHORIZED);
            }
            $limiter->reset();
        }

        $issued = $this->tokens->issue($account, trim($data['device']['name']), $data['device']['platform']);

        return new JsonResponse($issued->toArray() + ['created' => $created, 'account' => $this->accountJson($account)], $created ? Response::HTTP_CREATED : Response::HTTP_OK);
    }

    #[Route('/api/sessions/refresh', name: 'session_refresh', methods: ['POST'])]
    public function refresh(Request $request): JsonResponse
    {
        $data = $this->decode($request);
        $issued = \is_string($data['deviceToken'] ?? null) ? $this->tokens->refresh($data['deviceToken']) : null;
        if (null === $issued) {
            return new JsonResponse(['error' => 'invalid_token'], Response::HTTP_UNAUTHORIZED);
        }

        return new JsonResponse($issued->toArray() + ['account' => $this->accountJson($issued->device->getAccount())]);
    }

    /** The account card: sign-ins and devices (accounts-design §3). */
    #[Route('/api/account', name: 'account_show', methods: ['GET'])]
    #[IsGranted('ROLE_PLAYER')]
    public function show(#[CurrentUser] Account $account, Request $request): JsonResponse
    {
        $current = $request->attributes->get('_device');
        $devices = $this->devices->findBy(['account' => $account, 'signedOutAt' => null], ['lastSeenAt' => 'DESC']);

        return new JsonResponse($this->accountJson($account) + [
            'signIns' => $this->signIns($account),
            'devices' => array_map(fn (Device $d) => [
                'id' => $d->getId()->toRfc4122(),
                'name' => $d->getName(),
                'platform' => $d->getPlatform(),
                'lastSeenAt' => $d->getLastSeenAt()->format(\DATE_ATOM),
                'current' => $current instanceof Device && $current->getId()->equals($d->getId()),
            ], $devices),
        ]);
    }

    /** Adds a sign-in to the signed-in account: a Steam account, or email and password (SAVE-112). */
    #[Route('/api/account/sign-ins', name: 'account_add_sign_in', methods: ['POST'])]
    #[IsGranted('ROLE_PLAYER')]
    public function addSignIn(#[CurrentUser] Account $account, Request $request): JsonResponse
    {
        $data = $this->decode($request);
        if (\array_key_exists('steamTicket', $data)) {
            if ($errors = $this->validate($this->validator, $data, new Assert\Collection(['steamTicket' => [new Assert\NotBlank(), new Assert\Type('string')]]))) {
                return $errors;
            }
            $steamId = $this->steamId($data['steamTicket']);
            if ($steamId instanceof JsonResponse) {
                return $steamId;
            }
            $existing = $this->identities->findOneBy(['provider' => Identity::STEAM, 'subject' => $steamId]);
            if (null !== $existing) {
                return $existing->getAccount() === $account
                    ? new JsonResponse(['signIns' => $this->signIns($account)])
                    : new JsonResponse(['error' => 'linked_to_another_account'], Response::HTTP_CONFLICT);
            }
            if (null !== $this->identities->findOneBy(['account' => $account, 'provider' => Identity::STEAM])) {
                return new JsonResponse(['error' => 'already_has_steam'], Response::HTTP_CONFLICT);
            }
            $this->em->persist(new Identity($account, Identity::STEAM, $steamId, $this->clock->now()));
        } else {
            $constraint = Registration::constraint();
            unset($constraint->fields['displayName']);
            if ($errors = $this->validate($this->validator, $data, $constraint)) {
                return $errors;
            }
            if (null !== $account->getEmail()) {
                return new JsonResponse(['error' => 'already_has_email'], Response::HTTP_CONFLICT);
            }
            if ($this->registration->isEmailTaken($data['email'])) {
                return new JsonResponse(['error' => 'linked_to_another_account'], Response::HTTP_CONFLICT);
            }
            $account->setEmail($data['email']);
            $account->setPassword($this->hasher->hashPassword($account, $data['password']));
        }
        $this->em->flush();

        return new JsonResponse(['signIns' => $this->signIns($account)], Response::HTTP_CREATED);
    }

    /** Signs a device out, this one or another of the account's (SAVE-116). */
    #[Route('/api/devices/{id}', name: 'device_sign_out', requirements: ['id' => '[0-9a-f-]{36}'], methods: ['DELETE'])]
    #[IsGranted('ROLE_PLAYER')]
    public function signOut(#[CurrentUser] Account $account, string $id): Response
    {
        $device = $this->devices->find($id);
        if (null === $device || $device->getAccount() !== $account || $device->isSignedOut()) {
            return new JsonResponse(['error' => 'not_found'], Response::HTTP_NOT_FOUND);
        }
        $this->tokens->signOut($device);

        return new Response(status: Response::HTTP_NO_CONTENT);
    }

    /** The SteamID a ticket stands for, or the answer to send when Steam says no. */
    private function steamId(string $ticket): string|JsonResponse
    {
        try {
            return $this->steam->steamIdFor($ticket);
        } catch (SteamUnavailable) {
            return new JsonResponse(['error' => 'steam_unavailable', 'message' => 'Steam sign-in is not available.'], Response::HTTP_SERVICE_UNAVAILABLE);
        } catch (SteamRefused) {
            return new JsonResponse(['error' => 'steam_refused', 'message' => 'Steam did not accept the sign-in.'], Response::HTTP_UNAUTHORIZED);
        }
    }

    /** The player's Steam name when it fits the community's rule for names (2 to 40 characters). */
    private static function displayNameOr(mixed $name): string
    {
        $name = \is_string($name) ? trim(preg_replace('/\s+/u', ' ', $name) ?? '') : '';

        return mb_strlen($name) >= 2 && mb_strlen($name) <= 40 ? $name : 'Player';
    }

    /** @return array<string, mixed> */
    private function accountJson(Account $account): array
    {
        return [
            'id' => $account->getId()->toRfc4122(),
            'displayName' => $account->getDisplayName(),
            'email' => $account->getEmail(),
        ];
    }

    /** @return list<array{provider: string, label: string}> */
    private function signIns(Account $account): array
    {
        $list = null === $account->getEmail() ? [] : [['provider' => 'email', 'label' => $account->getEmail()]];
        foreach ($this->identities->findBy(['account' => $account], ['createdAt' => 'ASC']) as $identity) {
            $list[] = ['provider' => $identity->getProvider(), 'label' => $identity->getSubject()];
        }

        return $list;
    }
}
