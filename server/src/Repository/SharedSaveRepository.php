<?php

namespace App\Repository;

use App\Entity\Account;
use App\Entity\Post;
use App\Entity\SharedSave;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<SharedSave>
 */
class SharedSaveRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, SharedSave::class);
    }

    public function findByCode(string $code): ?SharedSave
    {
        return $this->findOneBy(['code' => SharedSave::normalise($code)]);
    }

    /** The shared saves an account keeps, removed ones left out, newest first (SAVE-126, SAVE-135). */
    public function ofAccount(Account $account): array
    {
        return $this->createQueryBuilder('s')
            ->addSelect('p', 't')
            ->join('s.post', 'p')
            ->join('p.topic', 't')
            ->where('s.account = :account AND s.removedAt IS NULL')
            ->setParameter('account', $account->getId(), 'uuid')
            ->orderBy('s.createdAt', 'DESC')
            ->addOrderBy('s.id', 'DESC')
            ->getQuery()->getResult();
    }

    public function countOf(Account $account): int
    {
        return (int) $this->createQueryBuilder('s')
            ->select('COUNT(s.id)')
            ->where('s.account = :account AND s.removedAt IS NULL')
            ->setParameter('account', $account->getId(), 'uuid')
            ->getQuery()->getSingleScalarResult();
    }

    /**
     * The saves that came with these posts, by post id, for the topic page's save cards (SAVE-134).
     *
     * @param iterable<Post> $posts
     *
     * @return array<int, SharedSave>
     */
    public function byPost(iterable $posts): array
    {
        $ids = [];
        foreach ($posts as $post) {
            $ids[] = $post->getId();
        }
        if (!$ids) {
            return [];
        }
        $out = [];
        foreach ($this->createQueryBuilder('s')->where('s.post IN (:ids)')->setParameter('ids', $ids)->getQuery()->getResult() as $save) {
            $out[$save->getPost()->getId()] = $save;
        }

        return $out;
    }
}
