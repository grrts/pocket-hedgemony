<?php

namespace App\Repository;

use App\Entity\Post;
use App\Entity\Topic;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\ORM\QueryBuilder;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Post>
 */
class PostRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Post::class);
    }

    /** @return list<Post> oldest first */
    public function inTopic(Topic $topic, bool $withHidden, int $offset, int $limit): array
    {
        return $this->visible($topic, $withHidden)
            ->addSelect('a')
            ->join('p.author', 'a')
            ->orderBy('p.id', 'ASC')
            ->setFirstResult($offset)
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();
    }

    public function countIn(Topic $topic, bool $withHidden): int
    {
        return (int) $this->visible($topic, $withHidden)->select('COUNT(p.id)')->getQuery()->getSingleScalarResult();
    }

    /** How many posts come before this one in its topic, as this reader sees the topic. */
    public function countBefore(Post $post, bool $withHidden): int
    {
        return (int) $this->visible($post->getTopic(), $withHidden)
            ->select('COUNT(p.id)')
            ->andWhere('p.id < :id')
            ->setParameter('id', $post->getId())
            ->getQuery()
            ->getSingleScalarResult();
    }

    /** The topic's first post, hidden or not. */
    public function openingPost(Topic $topic): ?Post
    {
        return $this->visible($topic, true)->orderBy('p.id', 'ASC')->setMaxResults(1)->getQuery()->getOneOrNullResult();
    }

    /**
     * Visible posts per topic id.
     *
     * @param list<Topic> $topics
     *
     * @return array<int, int>
     */
    public function countsFor(array $topics): array
    {
        if (!$topics) {
            return [];
        }
        $rows = $this->createQueryBuilder('p')
            ->select('IDENTITY(p.topic) AS topic', 'COUNT(p.id) AS posts')
            ->where('p.topic IN (:topics)')
            ->andWhere('p.hidden = false')
            ->setParameter('topics', $topics)
            ->groupBy('p.topic')
            ->getQuery()
            ->getArrayResult();

        return array_column(array_map(fn ($r) => ['t' => (int) $r['topic'], 'n' => (int) $r['posts']], $rows), 'n', 't');
    }

    private function visible(Topic $topic, bool $withHidden): QueryBuilder
    {
        $qb = $this->createQueryBuilder('p')->where('p.topic = :topic')->setParameter('topic', $topic);
        if (!$withHidden) {
            $qb->andWhere('p.hidden = false');
        }

        return $qb;
    }
}
