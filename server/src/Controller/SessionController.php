<?php

namespace App\Controller;

use App\Account\AccountCombiner;
use App\Account\CombineTokens;
use App\Account\IdToken\AppleIdTokens;
use App\Account\IdToken\GoogleIdTokens;
use App\Account\Registration;
use App\Account\SignInCodes;
use App\Account\SignInRefused;
use App\Account\SignInUnavailable;
use App\Account\StoreIdentity;
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
 * Signing the game in (domain/saves/spec.md SAVE-057, SAVE-112 … SAVE-118, SAVE-149 … SAVE-154):
 * with email and password, a Steam ticket, a Steam browser code, an Apple identity token or a
 * Google ID token; refreshing the tokens, the account's sign-ins and devices, signing a device out, and
 * combining two accounts and removing a sign-in (SAVE-186 … SAVE-193).
 */
final class SessionController
{
    use JsonInput;

    /** The store sign-ins, by the field that carries each one's proof. */
    private const STORE_PROOFS = ['steamTicket', 'steamOpenIdCode', 'appleIdentityToken', 'googleIdToken'];

    /** What each store's sign-in answers when the server is not set up for it or the store is out of reach (SAVE-118, SAVE-154). */
    private const UNAVAILABLE = [
        Identity::STEAM => 'Steam sign-in is not available.',
        Identity::APPLE => 'Sign in with Apple is not available.',
        Identity::GOOGLE => 'Google sign-in is not available.',
    ];

    private const LINKED = 'This sign-in already belongs to another Pocket Hegemony account.';

    /** What each store's sign-in answers when the store or our checks say no. */
    private const REFUSED = [
        Identity::STEAM => 'Steam did not accept the sign-in.',
        Identity::APPLE => 'Apple did not accept the sign-in.',
        Identity::GOOGLE => 'Google did not accept the sign-in.',
    ];

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
        private readonly AppleIdTokens $apple,
        private readonly GoogleIdTokens $google,
        private readonly SignInCodes $codes,
        private readonly ClockInterface $clock,
        private readonly RateLimiterFactoryInterface $apiSignInLimiter,
        private readonly AccountCombiner $combiner,
        private readonly CombineTokens $combineTokens,
    ) {
    }

    /**
     * The refusal of a sign-in that belongs to another account, with the offer to combine (SAVE-186):
     * what the other account holds, whether a store both hold blocks it (SAVE-188), and the token.
     */
    private function offer(Account $account, Account $other, string $provider): JsonResponse
    {
        $about = $this->combiner->describe($account, $other);
        $blocked = $about['blockedBy'];
        unset($about['blockedBy']);

        return new JsonResponse([
            'error' => 'linked_to_another_account',
            'message' => self::LINKED,
            'combine' => ['signIn' => $provider, 'account' => $about, 'blockedBy' => $blocked]
                + (null === $blocked ? ['token' => $this->combineTokens->issue($account, $other)] : ['message' => self::bothHave($blocked)]),
        ], Response::HTTP_CONFLICT);
    }

    /** Why two accounts that both hold one store's sign-in are not combined (SAVE-188). */
    private static function bothHave(string $kind): string
    {
        $name = ['steam' => 'a Steam sign-in', 'apple' => 'a Sign in with Apple', 'google' => 'a Google sign-in', 'email' => 'an email sign-in'][$kind] ?? 'that sign-in';

        return "Both accounts have {$name}. Remove one of them, then add this sign-in again.";
    }

    #[Route('/api/sessions', name: 'session_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $data = $this->decode($request);
        $device = new Assert\Collection([
            'name' => [new Assert\NotBlank(), new Assert\Type('string'), new Assert\Length(max: 60)],
            'platform' => [new Assert\NotBlank(), new Assert\Choice(choices: Device::PLATFORMS)],
        ]);
        $proof = self::proofIn($data);
        $errors = $this->validate($this->validator, $data, null !== $proof
            ? new Assert\Collection(self::proofFields($proof) + [
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
        if (null !== $proof) {
            $who = $this->storeIdentity($proof, $data);
            if ($who instanceof JsonResponse) {
                return $who;
            }
            $identity = $this->identities->findOneBy(['provider' => $who->provider, 'subject' => $who->subject]);
            if (null === $identity) {
                // The account is named with the name the store gives (Google), else the one the game passes (Steam, Apple).
                $account = new Account(null, self::displayNameOr($who->name ?? $data['displayName'] ?? null));
                $this->em->persist($account);
                $this->em->persist(new Identity($account, $who->provider, $who->subject, $this->clock->now()));
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
        return new JsonResponse($this->card($account, $request));
    }

    /** @return array<string, mixed> the account card's sign-ins and devices */
    private function card(Account $account, Request $request): array
    {
        $current = $request->attributes->get('_device');
        $devices = $this->devices->findBy(['account' => $account, 'signedOutAt' => null], ['lastSeenAt' => 'DESC']);

        return $this->accountJson($account) + [
            'signIns' => $this->signIns($account),
            'devices' => array_map(fn (Device $d) => [
                'id' => $d->getId()->toRfc4122(),
                'name' => $d->getName(),
                'platform' => $d->getPlatform(),
                'lastSeenAt' => $d->getLastSeenAt()->format(\DATE_ATOM),
                'current' => $current instanceof Device && $current->getId()->equals($d->getId()),
            ], $devices),
        ];
    }

    /** Adds a sign-in to the signed-in account: a store sign-in, or email and password (SAVE-112, SAVE-153). */
    #[Route('/api/account/sign-ins', name: 'account_add_sign_in', methods: ['POST'])]
    #[IsGranted('ROLE_PLAYER')]
    public function addSignIn(#[CurrentUser] Account $account, Request $request): JsonResponse
    {
        $data = $this->decode($request);
        $proof = self::proofIn($data);
        if (null !== $proof) {
            if ($errors = $this->validate($this->validator, $data, new Assert\Collection(self::proofFields($proof)))) {
                return $errors;
            }
            $who = $this->storeIdentity($proof, $data);
            if ($who instanceof JsonResponse) {
                return $who;
            }
            $existing = $this->identities->findOneBy(['provider' => $who->provider, 'subject' => $who->subject]);
            if (null !== $existing) {
                return $existing->getAccount() === $account
                    ? new JsonResponse(['signIns' => $this->signIns($account)])
                    : $this->offer($account, $existing->getAccount(), $who->provider);
            }
            if (null !== $this->identities->findOneBy(['account' => $account, 'provider' => $who->provider])) {
                return new JsonResponse(['error' => 'already_has_'.$who->provider], Response::HTTP_CONFLICT);
            }
            $this->em->persist(new Identity($account, $who->provider, $who->subject, $this->clock->now()));
        } else {
            $constraint = Registration::constraint();
            unset($constraint->fields['displayName']);
            if ($errors = $this->validate($this->validator, $data, $constraint)) {
                return $errors;
            }
            if (null !== $account->getEmail()) {
                return new JsonResponse(['error' => 'already_has_email'], Response::HTTP_CONFLICT);
            }
            $owner = $this->accounts->findOneBy(['email' => mb_strtolower(trim($data['email']))]);
            if (null !== $owner) {
                // The offer to combine comes only with that account's password, and the tries count as sign-ins (SAVE-186, SAVE-117).
                $limiter = $this->apiSignInLimiter->create(mb_strtolower(trim($data['email'])).'|'.($request->getClientIp() ?? 'unknown'));
                if (!$limiter->consume()->isAccepted()) {
                    return new JsonResponse(['error' => 'too_many_tries'], Response::HTTP_TOO_MANY_REQUESTS);
                }
                if ('' === $owner->getPassword() || !$this->hasher->isPasswordValid($owner, $data['password'])) {
                    return new JsonResponse(['error' => 'linked_to_another_account', 'message' => self::LINKED], Response::HTTP_CONFLICT);
                }
                $limiter->reset();

                return $this->offer($account, $owner, 'email');
            }
            $account->setEmail($data['email']);
            $account->setPassword($this->hasher->hashPassword($account, $data['password']));
        }
        $this->em->flush();

        return new JsonResponse(['signIns' => $this->signIns($account)], Response::HTTP_CREATED);
    }

    /**
     * Combines the account the offer named with this one (SAVE-187 … SAVE-192): the token from the
     * refusal of SAVE-186 is the proof the player passed the other account's sign-in.
     */
    #[Route('/api/account/merge', name: 'account_merge', methods: ['POST'])]
    #[IsGranted('ROLE_PLAYER')]
    public function merge(#[CurrentUser] Account $account, Request $request): JsonResponse
    {
        $data = $this->decode($request);
        $offer = \is_string($data['combineToken'] ?? null) ? $this->combineTokens->read($data['combineToken']) : null;
        if (null === $offer || $offer['staying'] !== $account->getId()->toRfc4122()) {
            return new JsonResponse(['error' => 'combine_expired', 'message' => 'The offer to combine ran out. Add the sign-in again.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }
        $other = $this->accounts->find($offer['other']);
        if (null === $other || $other === $account) {
            return new JsonResponse(['error' => 'nothing_to_combine', 'message' => 'That account is already combined or gone.'], Response::HTTP_GONE);
        }
        if (null !== ($both = $this->combiner->blockedBy($account, $other))) {
            return new JsonResponse(['error' => 'both_have_'.$both, 'message' => self::bothHave($both)], Response::HTTP_CONFLICT);
        }
        $name = $other->getDisplayName();
        $id = $account->getId();
        $moved = $this->combiner->combine($account, $other);
        // The combiner cleared what the entity manager held; the account is read again.
        $account = $this->accounts->find($id);

        return new JsonResponse($this->card($account, $request) + ['combined' => ['displayName' => $name] + $moved]);
    }

    /** Removes one sign-in while another remains (SAVE-193). */
    #[Route('/api/account/sign-ins/{provider}', name: 'account_remove_sign_in', requirements: ['provider' => 'steam|apple|google|email'], methods: ['DELETE'])]
    #[IsGranted('ROLE_PLAYER')]
    public function removeSignIn(#[CurrentUser] Account $account, string $provider): JsonResponse
    {
        $held = $this->combiner->signInKinds($account);
        if (!\in_array($provider, $held, true)) {
            return new JsonResponse(['error' => 'not_found', 'message' => 'This account has no such sign-in.'], Response::HTTP_NOT_FOUND);
        }
        if (\count($held) < 2) {
            return new JsonResponse(['error' => 'last_sign_in', 'message' => 'An account keeps at least one sign-in.'], Response::HTTP_CONFLICT);
        }
        if ('email' === $provider) {
            $account->removeEmail();
        } else {
            $this->em->remove($this->identities->findOneBy(['account' => $account, 'provider' => $provider]));
        }
        $this->em->flush();

        return new JsonResponse(['signIns' => $this->signIns($account)]);
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

    /** The store sign-in a request carries, by its proof's field, or null for email and password. */
    private static function proofIn(array $data): ?string
    {
        foreach (self::STORE_PROOFS as $field) {
            if (\array_key_exists($field, $data)) {
                return $field;
            }
        }

        return null;
    }

    /** @return array<string, mixed> the fields each store's proof is made of */
    private static function proofFields(string $proof): array
    {
        $text = [new Assert\NotBlank(), new Assert\Type('string'), new Assert\Length(max: 8192)];

        return match ($proof) {
            'appleIdentityToken', 'googleIdToken' => [$proof => $text, 'nonce' => [new Assert\NotBlank(), new Assert\Type('string'), new Assert\Length(max: 200)]],
            default => [$proof => $text],
        };
    }

    /** Who the store says the player is, or the answer to send when it says no or cannot be asked. */
    private function storeIdentity(string $proof, array $data): StoreIdentity|JsonResponse
    {
        $provider = match ($proof) {
            'appleIdentityToken' => Identity::APPLE,
            'googleIdToken' => Identity::GOOGLE,
            default => Identity::STEAM,
        };
        try {
            switch ($proof) {
                case 'steamTicket':
                    return new StoreIdentity(Identity::STEAM, $this->steam->steamIdFor($data['steamTicket']));
                case 'steamOpenIdCode':
                    return $this->codes->redeem($data['steamOpenIdCode'], Identity::STEAM)
                        ?? new JsonResponse(['error' => 'sign_in_expired', 'message' => 'The sign-in took too long or was used already. Try again.'], Response::HTTP_UNAUTHORIZED);
                case 'appleIdentityToken':
                    return $this->apple->verify($data['appleIdentityToken'], $data['nonce']);
                default:
                    return $this->google->verify($data['googleIdToken'], $data['nonce']);
            }
        } catch (SteamUnavailable|SignInUnavailable) {
            return new JsonResponse(['error' => $provider.'_unavailable', 'message' => self::UNAVAILABLE[$provider]], Response::HTTP_SERVICE_UNAVAILABLE);
        } catch (SteamRefused|SignInRefused) {
            return new JsonResponse(['error' => $provider.'_refused', 'message' => self::REFUSED[$provider]], Response::HTTP_UNAUTHORIZED);
        }
    }

    /** The name the store or the game gives, when it fits the community's rule for names (2 to 40 characters). */
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
