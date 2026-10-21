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
use App\Repository\AccountRepository;
use App\Repository\CloudSaveRepository;
use App\Repository\SharedSaveRepository;
use App\Saves\SaveObjects;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Uid\Uuid;

/**
 * Deleting an account (domain/saves SAVE-198 … SAVE-201, D-SAVE-25): its cloud saves, shared saves,
 * sign-ins and devices go in one transaction, and the bytes after it commits, so a failure leaves the
 * account whole. What stays names no one: the purchase records, without the account, and the community
 * posts, under "Deleted player".
 */
final class AccountDeletion
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly AccountRepository $accounts,
        private readonly CloudSaveRepository $saves,
        private readonly SharedSaveRepository $shared,
        private readonly SaveObjects $objects,
    ) {
    }

    /** @return array<string, int> what went, by kind, for the log */
    public function delete(Account $account): array
    {
        $keys = [];
        $gone = $this->em->wrapInTransaction(function () use ($account, &$keys) {
            return $this->remove($account, $keys);
        });
        foreach ($keys as $key) {
            $this->objects->delete($key);
        }

        return $gone;
    }

    /**
     * @param list<string> $keys the bytes to remove once committed
     *
     * @return array<string, int>
     */
    private function remove(Account $account, array &$keys): array
    {
        $id = $account->getId();
        $gone = ['saves' => 0, 'sharedSaves' => 0, 'signIns' => \count($this->em->getRepository(Identity::class)->findBy(['account' => $account])) + (null === $account->getEmail() ? 0 : 1)];

        foreach ($this->saves->findBy(['account' => $account]) as $save) {
            if (!$save->isPurged()) {
                $keys[] = $save->key();
            }
            if (!$save->isDeleted()) {
                ++$gone['saves'];
            }
        }
        foreach ($this->shared->findBy(['account' => $account]) as $save) {
            $keys[] = $save->key();
            if (!$save->isRemoved()) {
                ++$gone['sharedSaves'];
            }
        }

        // What stays names no one: the purchase records lose the account, the posts go to "Deleted player".
        $this->update(Entitlement::class, 'account', null, $id);
        $this->em->createQuery('UPDATE '.MetricEvent::class.' m SET m.accountId = NULL WHERE m.accountId = :id')
            ->setParameter('id', $id, 'uuid')->execute();
        $deleted = $this->deletedPlayer();
        foreach ([[Topic::class, 'author'], [Topic::class, 'lastPoster'], [Post::class, 'author']] as [$entity, $field]) {
            $this->update($entity, $field, $deleted->getId(), $id);
        }

        foreach ([[PostReport::class, 'reporter'], [SaveChange::class, 'account'], [IronmanHead::class, 'account'], [CloudSave::class, 'account'], [SharedSave::class, 'account'], [Device::class, 'account'], [Identity::class, 'account']] as [$entity, $field]) {
            $this->em->createQuery("DELETE FROM {$entity} e WHERE e.{$field} = :id")->setParameter('id', $id, 'uuid')->execute();
        }
        // The bulk queries bypassed the loaded rows: clear first, then the account itself goes.
        $this->em->clear();
        $this->em->createQuery('DELETE FROM '.Account::class.' a WHERE a.id = :id')->setParameter('id', $id, 'uuid')->execute();

        return $gone;
    }

    private function update(string $entity, string $field, ?Uuid $to, Uuid $from): void
    {
        $query = $this->em->createQuery("UPDATE {$entity} e SET e.{$field} = ".(null === $to ? 'NULL' : ':to')." WHERE e.{$field} = :from")
            ->setParameter('from', $from, 'uuid');
        if (null !== $to) {
            $query->setParameter('to', $to, 'uuid');
        }
        $query->execute();
    }

    /** The one account the posts of deleted accounts are shown under, made the first time it is needed. */
    private function deletedPlayer(): Account
    {
        $account = $this->accounts->find(Account::DELETED_PLAYER_ID);
        if (null === $account) {
            $account = Account::deletedPlayer();
            $this->em->persist($account);
            $this->em->flush();
        }

        return $account;
    }
}
