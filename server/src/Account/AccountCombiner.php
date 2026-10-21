<?php

namespace App\Account;

use App\Entity\Account;
use App\Entity\CloudSave;
use App\Entity\Device;
use App\Entity\Entitlement;
use App\Entity\Identity;
use App\Entity\IronmanHead;
use App\Entity\MetricEvent;
use App\Entity\Post;
use App\Entity\PostReport;
use App\Entity\SaveChange;
use App\Entity\SharedSave;
use App\Entity\Topic;
use App\Repository\CloudSaveRepository;
use App\Repository\EntitlementRepository;
use App\Repository\IdentityRepository;
use App\Repository\IronmanHeadRepository;
use App\Repository\SharedSaveRepository;
use App\Saves\SaveObjects;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Clock\ClockInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * Combining two accounts (domain/saves SAVE-186 … SAVE-192, D-SAVE-24), the rules of
 * packages/engine/src/domain/saves/combine.ts: everything of the other account moves to the one the
 * player is in, in one transaction, and the emptied account is deleted. Where both hold the same row,
 * one stays: a save id held by both (the live copy), an ironman head (the newer save's), an entitlement
 * per store (active, then refunded, then revoked). No save is ever dropped to fit the quota.
 */
final class AccountCombiner
{
    /** Active before refunded before revoked (SAVE-190). */
    private const RANK = [Entitlement::ACTIVE => 0, Entitlement::REFUNDED => 1, Entitlement::REVOKED => 2];

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly IdentityRepository $identities,
        private readonly CloudSaveRepository $saves,
        private readonly IronmanHeadRepository $heads,
        private readonly EntitlementRepository $entitlements,
        private readonly SharedSaveRepository $shared,
        private readonly SaveObjects $objects,
        private readonly ClockInterface $clock,
        #[Autowire('%cloud.quota_saves%')] private readonly int $quotaSaves,
        #[Autowire('%cloud.quota_mb%')] private readonly int $quotaMb,
        #[Autowire('%cloud.shared_max_per_account%')] private readonly int $maxShared,
    ) {
    }

    /** @return list<string> the account's ways in: its stores' sign-ins, and `email` (INV-SAVE-21) */
    public function signInKinds(Account $account): array
    {
        $kinds = array_map(fn (Identity $i) => $i->getProvider(), $this->identities->findBy(['account' => $account]));

        return null === $account->getEmail() ? $kinds : [...$kinds, 'email'];
    }

    /** The sign-in both accounts hold, which refuses combining (SAVE-188), or null. */
    public function blockedBy(Account $staying, Account $other): ?string
    {
        $theirs = $this->signInKinds($other);
        foreach ($this->signInKinds($staying) as $kind) {
            if (\in_array($kind, $theirs, true)) {
                return $kind;
            }
        }

        return null;
    }

    /**
     * What the offer tells the player about the other account (SAVE-186, SAVE-191).
     *
     * @return array<string, mixed>
     */
    public function describe(Account $staying, Account $other): array
    {
        $mine = $this->saves->usage($staying);
        $theirs = $this->saves->usage($other);
        $stores = [];
        foreach ($this->entitlements->findBy(['account' => $other]) as $e) {
            if ($e->isActive()) {
                $stores[] = $e->getStore();
            }
        }
        sort($stores);

        return [
            'displayName' => $other->getDisplayName(),
            'saves' => $theirs['saves'],
            'sharedSaves' => $this->shared->countOf($other),
            'purchases' => $stores,
            'storageFull' => $mine['saves'] + $theirs['saves'] > $this->quotaSaves || $mine['bytes'] + $theirs['bytes'] > $this->quotaMb * 1024 * 1024,
            'sharedFull' => $this->shared->countOf($staying) + $this->shared->countOf($other) > $this->maxShared,
            'blockedBy' => $this->blockedBy($staying, $other),
        ];
    }

    /**
     * Moves everything of `$other` to `$staying` and deletes `$other` (SAVE-187). The caller has checked
     * blockedBy() first. The bytes are copied to the staying account's keys before the transaction
     * commits and the old ones removed after it, so a failure leaves the other account whole.
     *
     * @return array<string, int> how much moved, by kind
     */
    public function combine(Account $staying, Account $other): array
    {
        $copied = [];
        $old = [];
        try {
            $moved = $this->em->wrapInTransaction(function () use ($staying, $other, &$copied, &$old) {
                return $this->move($staying, $other, $copied, $old);
            });
        } catch (\Throwable $e) {
            foreach ($copied as $key) {
                $this->objects->delete($key);
            }
            throw $e;
        }
        foreach ($old as $key) {
            $this->objects->delete($key);
        }

        return $moved;
    }

    /**
     * @param list<string> $copied keys written for the staying account
     * @param list<string> $old    keys of the other account to remove once committed
     *
     * @return array<string, int>
     */
    private function move(Account $staying, Account $other, array &$copied, array &$old): array
    {
        $now = $this->clock->now();
        $moved = ['signIns' => 0, 'devices' => 0, 'saves' => 0, 'sharedSaves' => 0, 'purchases' => 0];

        // Sign-ins: the store identities, and email with its password (the email is unique, so it leaves first).
        if (null !== $other->getEmail() && null === $staying->getEmail()) {
            [$email, $password] = [$other->getEmail(), $other->getPassword()];
            $other->removeEmail();
            $this->em->flush();
            $staying->setEmail($email);
            $staying->setPassword($password);
            ++$moved['signIns'];
        }
        $moved['signIns'] += $this->reassign(Identity::class, 'account', $staying, $other);

        // Devices stay signed in, now here; each starts its change log over on its next sync (SAVE-192).
        $moved['devices'] = $this->em->createQuery('UPDATE '.Device::class.' d SET d.account = :to, d.movedAt = :now WHERE d.account = :from')
            ->setParameter('to', $staying->getId(), 'uuid')
            ->setParameter('from', $other->getId(), 'uuid')
            ->setParameter('now', $now, 'datetime_immutable')
            ->execute();

        // Cloud saves: the old change log goes, and every save that moved and is not removed gets a new entry (SAVE-189, SAVE-192).
        $this->em->createQuery('DELETE FROM '.SaveChange::class.' c WHERE c.account = :from')
            ->setParameter('from', $other->getId(), 'uuid')->execute();
        foreach ($this->saves->findBy(['account' => $other]) as $save) {
            $mine = $this->saves->findOneBy(['account' => $staying, 'saveId' => $save->getSaveId()]);
            if (null !== $mine) {
                if (!($mine->isDeleted() && !$save->isDeleted())) {
                    // The same file: the staying account's copy stays.
                    $old[] = $save->key();
                    $this->em->remove($save);
                    continue;
                }
                // Only the other copy is not removed: it takes the removed one's place, and its bytes the same key.
                $this->em->createQuery('DELETE FROM '.SaveChange::class.' c WHERE c.save = :save')->setParameter('save', $mine)->execute();
                $this->em->remove($mine);
                $this->em->flush();
            }
            $from = $save->key();
            $save->moveTo($staying);
            if (!$save->isPurged()) {
                $bytes = $this->objects->get($from);
                if (null !== $bytes) {
                    $this->objects->put($save->key(), $bytes);
                    $copied[] = $save->key();
                    $old[] = $from;
                }
            }
            if (!$save->isDeleted()) {
                $this->em->persist(new SaveChange($staying, $save));
                ++$moved['saves'];
            }
        }
        $this->em->flush();

        // Ironman heads: one per campaign, the newer save's (SAVE-189).
        foreach ($this->heads->findBy(['account' => $other]) as $head) {
            $mine = $this->heads->findOneBy(['account' => $staying, 'campaignId' => $head->getCampaignId()]);
            if (null === $mine) {
                $head->moveAccount($staying);
                continue;
            }
            if ($this->savedAt($staying, $head->getSaveId()) > $this->savedAt($staying, $mine->getSaveId())) {
                $mine->moveTo($head->getSaveId());
            }
            $this->em->remove($head);
        }
        $this->em->flush();

        // Entitlements: one per store (SAVE-190).
        foreach ($this->entitlements->findBy(['account' => $other]) as $theirs) {
            $mine = $this->entitlements->findOneBy(['account' => $staying, 'store' => $theirs->getStore()]);
            if (null !== $mine) {
                if (self::RANK[$theirs->getStatus()] >= self::RANK[$mine->getStatus()]) {
                    $this->em->remove($theirs);
                    $this->em->flush();
                    continue;
                }
                $this->em->remove($mine);
                $this->em->flush();
            }
            ++$moved['purchases'];
        }
        $this->reassign(Entitlement::class, 'account', $staying, $other);

        $moved['sharedSaves'] = $this->reassign(SharedSave::class, 'account', $staying, $other);

        // The community: topics and posts keep their author; a post both reported keeps one report.
        $this->reassign(Topic::class, 'author', $staying, $other);
        $this->reassign(Topic::class, 'lastPoster', $staying, $other);
        $this->reassign(Post::class, 'author', $staying, $other);
        $reported = array_column($this->em->createQuery('SELECT IDENTITY(r.post) AS post FROM '.PostReport::class.' r WHERE r.reporter = :to')
            ->setParameter('to', $staying->getId(), 'uuid')->getScalarResult(), 'post');
        if ($reported) {
            $this->em->createQuery('DELETE FROM '.PostReport::class.' r WHERE r.reporter = :from AND r.post IN (:posts)')
                ->setParameter('from', $other->getId(), 'uuid')
                ->setParameter('posts', $reported)
                ->execute();
        }
        $this->reassign(PostReport::class, 'reporter', $staying, $other);
        $this->em->createQuery('UPDATE '.MetricEvent::class.' m SET m.accountId = :to WHERE m.accountId = :from')
            ->setParameter('to', $staying->getId(), 'uuid')
            ->setParameter('from', $other->getId(), 'uuid')
            ->execute();

        // Everything moved: the emptied account goes. Clear first, as the bulk updates bypassed the loaded rows.
        $this->em->flush();
        $this->em->clear();
        $this->em->createQuery('DELETE FROM '.Account::class.' a WHERE a.id = :id')->setParameter('id', $other->getId(), 'uuid')->execute();

        return $moved;
    }

    private function reassign(string $entity, string $field, Account $staying, Account $other): int
    {
        return $this->em->createQuery("UPDATE {$entity} e SET e.{$field} = :to WHERE e.{$field} = :from")
            ->setParameter('to', $staying->getId(), 'uuid')
            ->setParameter('from', $other->getId(), 'uuid')
            ->execute();
    }

    /** When the save was made, by the header; the save sits on the staying account by now. */
    private function savedAt(Account $staying, string $saveId): int
    {
        return $this->saves->findOneBy(['account' => $staying, 'saveId' => $saveId])?->getSavedAt() ?? 0;
    }
}
