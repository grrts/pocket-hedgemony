<?php

namespace App\Repository;

use App\Entity\Account;
use App\Entity\CloudSave;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<CloudSave>
 */
class CloudSaveRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, CloudSave::class);
    }

    /** How many saves the account keeps and their bytes, tombstones left out (SAVE-069). */
    public function usage(Account $account): array
    {
        $row = $this->createQueryBuilder('s')
            ->select('COUNT(s.id) AS saves, COALESCE(SUM(s.size), 0) AS bytes')
            ->where('s.account = :account AND s.deletedAt IS NULL')
            ->setParameter('account', $account->getId(), 'uuid')
            ->getQuery()->getSingleResult();

        return ['saves' => (int) $row['saves'], 'bytes' => (int) $row['bytes']];
    }

    /** @return list<CloudSave> tombstones whose bytes are older than the purge time (SAVE-062) */
    public function purgeable(\DateTimeImmutable $before): array
    {
        return $this->createQueryBuilder('s')
            ->where('s.deletedAt IS NOT NULL AND s.deletedAt < :before AND s.purged = false')
            ->setParameter('before', $before)
            ->getQuery()->getResult();
    }
}
