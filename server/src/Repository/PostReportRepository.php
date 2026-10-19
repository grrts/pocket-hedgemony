<?php

namespace App\Repository;

use App\Entity\Post;
use App\Entity\PostReport;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<PostReport>
 */
class PostReportRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, PostReport::class);
    }

    /**
     * Open reports, one entry per reported post, the oldest report first.
     *
     * @return list<array{post: Post, reports: list<PostReport>}>
     */
    public function openByPost(int $limit = 100): array
    {
        $reports = $this->createQueryBuilder('r')
            ->addSelect('p', 't', 'a', 'u')
            ->join('r.post', 'p')
            ->join('p.topic', 't')
            ->join('p.author', 'a')
            ->join('r.reporter', 'u')
            ->where('r.resolvedAt IS NULL')
            ->orderBy('r.id', 'ASC')
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();
        $byPost = [];
        foreach ($reports as $report) {
            $id = $report->getPost()->getId();
            $byPost[$id] ??= ['post' => $report->getPost(), 'reports' => []];
            $byPost[$id]['reports'][] = $report;
        }

        return array_values($byPost);
    }

    public function countOpen(): int
    {
        return (int) $this->createQueryBuilder('r')
            ->select('COUNT(DISTINCT r.post)')
            ->where('r.resolvedAt IS NULL')
            ->getQuery()
            ->getSingleScalarResult();
    }

    /** Closes every open report on the post (a moderator hid it, or found nothing wrong). */
    public function resolveFor(Post $post): void
    {
        foreach ($this->findBy(['post' => $post, 'resolvedAt' => null]) as $report) {
            $report->resolve();
        }
    }
}
