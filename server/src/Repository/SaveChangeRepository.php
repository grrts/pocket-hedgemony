<?php

namespace App\Repository;

use App\Entity\Account;
use App\Entity\SaveChange;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<SaveChange>
 */
class SaveChangeRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, SaveChange::class);
    }

    /** @return list<SaveChange> the account's changes after the cursor, oldest first */
    public function since(Account $account, int $cursor, int $limit): array
    {
        return $this->createQueryBuilder('c')
            ->addSelect('s')
            ->join('c.save', 's')
            ->where('c.account = :account AND c.id > :cursor')
            ->setParameter('account', $account->getId(), 'uuid')
            ->setParameter('cursor', $cursor)
            ->orderBy('c.id', 'ASC')
            ->setMaxResults($limit)
            ->getQuery()->getResult();
    }
}
