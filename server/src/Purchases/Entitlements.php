<?php

namespace App\Purchases;

use App\Entity\Account;
use App\Entity\Entitlement;
use App\Entity\Identity;
use App\Purchases\Apple\AppStore;
use App\Purchases\Google\GooglePlay;
use App\Repository\AccountRepository;
use App\Repository\EntitlementRepository;
use App\Repository\IdentityRepository;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Clock\ClockInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\Uid\Uuid;

/**
 * The full game's purchases on each store (domain/saves SAVE-170 … SAVE-177, D-SAVE-23): one entitlement
 * per account and store, what the game is told about its store, the proofs it sends, and what the stores'
 * notifications change. Cross-buy is per store: nothing here lets one store's purchase answer for another.
 */
final class Entitlements
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly EntitlementRepository $entitlements,
        private readonly IdentityRepository $identities,
        private readonly AccountRepository $accounts,
        private readonly SteamOwnership $steam,
        private readonly AppStore $appStore,
        private readonly GooglePlay $play,
        private readonly ClockInterface $clock,
        #[Autowire('%cloud.purchases.steam_recheck_hours%')] private readonly int $steamRecheckHours,
    ) {
    }

    /**
     * `GET /api/entitlements/{store}` (SAVE-172): the Steam answer is checked with Steam when it is older
     * than a day (SAVE-173); the phones' answers are what the server holds.
     *
     * @return array<string, mixed>
     *
     * @throws StoreUnavailable
     */
    public function answer(Account $account, string $store): array
    {
        $this->assertAvailable($store);
        if (Entitlement::STEAM === $store) {
            return $this->json($account, $store, $this->checkSteam($account, false));
        }

        return $this->json($account, $store, $this->find($account, $store));
    }

    /**
     * `POST /api/purchases`: a StoreKit 2 signed transaction, a Play purchase token, or (Steam) a fresh check.
     *
     * @param array<string, mixed> $proof
     *
     * @return array<string, mixed>
     *
     * @throws StoreUnavailable|PurchaseRefused
     */
    public function submit(Account $account, string $store, array $proof): array
    {
        $this->assertAvailable($store);
        if (Entitlement::STEAM === $store) {
            return $this->json($account, $store, $this->checkSteam($account, true));
        }
        if (Entitlement::APPLE === $store) {
            $purchase = $this->appStore->transaction((string) ($proof['signedTransaction'] ?? ''));

            return $this->json($account, $store, $this->record($account, $purchase), $purchase->status);
        }
        $token = (string) ($proof['purchaseToken'] ?? '');
        $purchase = $this->play->purchase($token);
        $row = $this->record($account, $purchase);
        // Play refunds a purchase nobody acknowledged within 3 days; the game acknowledges too, when offline-first.
        if (Entitlement::ACTIVE === $purchase->status && !$purchase->acknowledged) {
            $this->play->acknowledge($token);
        }

        return $this->json($account, $store, $row, $purchase->status);
    }

    /** The tag the store's purchase carries for this account (SAVE-172): Apple's `appAccountToken`, Play's `obfuscatedAccountId`. */
    public function accountTag(Account $account, string $store): ?string
    {
        return match ($store) {
            Entitlement::APPLE => $account->getId()->toRfc4122(),
            Entitlement::GOOGLE => GooglePlay::accountTag($account->getId()->toRfc4122()),
            default => null,
        };
    }

    /**
     * An App Store Server Notification V2 (SAVE-176); returns what it changed, for the log.
     *
     * @throws StoreUnavailable|PurchaseRefused when it does not pass the check
     */
    public function appleNotification(string $signedPayload): string
    {
        $n = $this->appStore->notification($signedPayload);
        $purchase = $n['purchase'];
        if (null === $purchase) {
            return 'nothing';
        }
        $row = $this->entitlements->findOneBy(['store' => Entitlement::APPLE, 'reference' => $purchase->reference]);
        $now = $this->clock->now();
        $status = match ($n['type']) {
            'REFUND' => Entitlement::REFUNDED,
            'REVOKE' => Entitlement::REVOKED,
            'REFUND_REVERSED', 'ONE_TIME_CHARGE' => Entitlement::ACTIVE,
            default => null,
        };
        if (null === $status) {
            return 'nothing';
        }
        if (null !== $row) {
            $row->mark($status, $now);
            $this->em->flush();

            return $status;
        }
        // A purchase made while signed in carries the account id; one the server never saw is recorded then.
        if ('ONE_TIME_CHARGE' === $n['type'] && null !== $purchase->accountTag && Uuid::isValid($purchase->accountTag)) {
            $account = $this->accounts->find($purchase->accountTag);
            if (null !== $account) {
                $this->record($account, $purchase);

                return 'recorded';
            }
        }

        return 'nothing';
    }

    /**
     * A Google Play real-time developer notification, already read from the Pub/Sub push (SAVE-177).
     *
     * @param array<string, mixed> $notification
     *
     * @throws StoreUnavailable|PurchaseRefused
     */
    public function googleNotification(array $notification): string
    {
        if ($this->play->packageName() !== ($notification['packageName'] ?? null)) {
            throw new PurchaseRefused('wrong_app', 'The notification is for another app.');
        }
        $voided = $notification['voidedPurchaseNotification'] ?? null;
        if (\is_array($voided) && \is_string($voided['purchaseToken'] ?? null)) {
            return $this->voided($voided['purchaseToken'], \is_string($voided['orderId'] ?? null) ? $voided['orderId'] : null) ? Entitlement::REFUNDED : 'nothing';
        }
        $oneTime = $notification['oneTimeProductNotification'] ?? null;
        if (\is_array($oneTime) && \is_string($oneTime['purchaseToken'] ?? null)) {
            $row = $this->entitlements->findOneBy(['store' => Entitlement::GOOGLE, 'tokenHash' => hash('sha256', $oneTime['purchaseToken'])]);
            if (null === $row) {
                return 'nothing';
            }
            try {
                $purchase = $this->play->purchase($oneTime['purchaseToken']);
            } catch (PurchaseRefused) {
                return 'nothing';
            }
            if (StorePurchase::PENDING !== $purchase->status) {
                $row->mark($purchase->status, $this->clock->now());
                $this->em->flush();
            }

            return $row->getStatus();
        }

        return 'nothing';
    }

    /** Marks refunded the Play entitlement a voided purchase names, by its token or its order (SAVE-177). */
    public function voided(string $token, ?string $orderId): bool
    {
        $row = $this->entitlements->findOneBy(['store' => Entitlement::GOOGLE, 'tokenHash' => hash('sha256', $token)])
            ?? (null === $orderId ? null : $this->entitlements->findOneBy(['store' => Entitlement::GOOGLE, 'reference' => $orderId]));
        if (null === $row) {
            return false;
        }
        $row->mark(Entitlement::REFUNDED, $this->clock->now());
        $this->em->flush();

        return true;
    }

    /** @throws StoreUnavailable when the store's settings are not set (SAVE-178) */
    public function assertAvailable(string $store): void
    {
        match ($store) {
            Entitlement::STEAM => $this->steam->assertAvailable(),
            Entitlement::APPLE => $this->appStore->assertAvailable(),
            Entitlement::GOOGLE => $this->play->assertAvailable(),
            default => throw new \InvalidArgumentException("Unknown store {$store}"),
        };
    }

    /** CheckAppOwnership for the account's SteamID, at most once in the recheck window unless forced (SAVE-173). */
    private function checkSteam(Account $account, bool $force): ?Entitlement
    {
        $identity = $this->identities->findOneBy(['account' => $account, 'provider' => Identity::STEAM]);
        if (null === $identity) {
            return null;
        }
        $row = $this->find($account, Entitlement::STEAM);
        $now = $this->clock->now();
        if (!$force && null !== $row && $row->getLastCheckedAt() > $now->modify("-{$this->steamRecheckHours} hours")) {
            return $row;
        }
        try {
            $owns = $this->steam->check($identity->getSubject());
        } catch (StoreUnavailable $e) {
            // Steam cannot be reached: the last answer stands.
            if ($e->unreachable && null !== $row) {
                return $row;
            }
            throw $e;
        }
        if ($owns) {
            return $this->record($account, new StorePurchase(Entitlement::STEAM, 'full_game', $this->steam->reference($identity->getSubject()), Entitlement::ACTIVE));
        }
        if (null !== $row) {
            $row->mark(Entitlement::REFUNDED, $now);
            $this->em->flush();
        }

        return $row;
    }

    /**
     * Records what a store confirmed. A purchase another account holds is refused (SAVE-171); a pending one
     * is not kept; a new purchase takes the place of a refunded one, and an active one is never replaced by
     * a worse one.
     *
     * @throws PurchaseRefused
     */
    private function record(Account $account, StorePurchase $purchase): ?Entitlement
    {
        $expected = $this->accountTag($account, $purchase->store);
        if (null !== $purchase->accountTag && null !== $expected && !hash_equals($expected, $purchase->accountTag)) {
            throw new PurchaseRefused('other_account', PurchaseRefused::OTHER_ACCOUNT);
        }
        $held = $this->entitlements->findOneBy(['store' => $purchase->store, 'reference' => $purchase->reference]);
        if (null !== $held && $held->getAccount() !== $account) {
            throw new PurchaseRefused('other_account', PurchaseRefused::OTHER_ACCOUNT);
        }
        $mine = $this->find($account, $purchase->store);
        if (StorePurchase::PENDING === $purchase->status) {
            return $mine;
        }
        $now = $this->clock->now();
        if (null === $mine) {
            $mine = new Entitlement($account, $purchase->store, $purchase->product, $purchase->reference, $purchase->status, $now);
            $mine->confirm($purchase->reference, $purchase->status, $purchase->tokenHash, $purchase->environment, $now);
            $this->em->persist($mine);
        } elseif ($mine->getReference() === $purchase->reference || !$mine->isActive()) {
            $mine->confirm($purchase->reference, $purchase->status, $purchase->tokenHash, $purchase->environment, $now);
        } else {
            // Bought twice on one store (two store accounts): the active one stays.
            $mine->checked($now);
        }
        $this->em->flush();

        return $mine;
    }

    private function find(Account $account, string $store): ?Entitlement
    {
        return $this->entitlements->findOneBy(['account' => $account, 'store' => $store]);
    }

    /** @return array<string, mixed> */
    private function json(Account $account, string $store, ?Entitlement $row, ?string $purchaseStatus = null): array
    {
        $status = StorePurchase::PENDING === $purchaseStatus && (null === $row || !$row->isActive()) ? StorePurchase::PENDING : ($row?->getStatus() ?? 'none');

        return [
            'store' => $store,
            'fullGame' => Entitlement::ACTIVE === $status,
            'status' => $status,
            'checkedAt' => $row?->getLastCheckedAt()->format(\DATE_ATOM),
            'accountTag' => $this->accountTag($account, $store),
        ];
    }
}
