<?php

namespace App\Repository;

use App\Entity\Post;
use App\Entity\Topic;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\ORM\QueryBuilder;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Topic>
 */
class TopicRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Topic::class);
    }

    /**
     * Topics newest activity first, on one board or all of them; hidden ones only for moderators.
     *
     * @return list<Topic>
     */
    public function newestActivity(?string $board, bool $withHidden, int $offset, int $limit): array
    {
        return $this->visible($board, $withHidden)
            ->addSelect('a', 'l')
            ->join('t.author', 'a')
            ->join('t.lastPoster', 'l')
            ->orderBy('t.lastActivityAt', 'DESC')
            ->addOrderBy('t.id', 'DESC')
            ->setFirstResult($offset)
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();
    }

    public function countOn(?string $board, bool $withHidden): int
    {
        return (int) $this->visible($board, $withHidden)->select('COUNT(t.id)')->getQuery()->getSingleScalarResult();
    }

    /**
     * Visible topics and posts per board, as the overview shows them to everyone.
     *
     * @return array<string, array{topics: int, posts: int}>
     */
    public function boardCounts(): array
    {
        $rows = $this->createQueryBuilder('t')
            ->select('t.board AS board', 'COUNT(DISTINCT t.id) AS topics', 'COUNT(p.id) AS posts')
            ->leftJoin(Post::class, 'p', 'WITH', 'p.topic = t AND p.hidden = false')
            ->where('t.hidden = false')
            ->groupBy('t.board')
            ->getQuery()
            ->getArrayResult();
        $counts = [];
        foreach ($rows as $row) {
            $counts[$row['board']] = ['topics' => (int) $row['topics'], 'posts' => (int) $row['posts']];
        }

        return $counts;
    }

    private function visible(?string $board, bool $withHidden): QueryBuilder
    {
        $qb = $this->createQueryBuilder('t');
        if (null !== $board) {
            $qb->andWhere('t.board = :board')->setParameter('board', $board);
        }
        if (!$withHidden) {
            $qb->andWhere('t.hidden = false');
        }

        return $qb;
    }
}
