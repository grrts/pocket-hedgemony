<?php

namespace App\Repository;

use App\Entity\CrashReport;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<CrashReport>
 */
class CrashReportRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, CrashReport::class);
    }

    /**
     * The most frequent bugs since a moment, most crashes first: per fingerprint the number
     * of crashes, of installs that hit it, when it last happened, and the latest report.
     *
     * @return list<array{fingerprint: string, crashes: int, installs: int, lastSeen: \DateTimeImmutable, latest: CrashReport}>
     */
    public function topFingerprints(\DateTimeImmutable $since, int $limit = 20): array
    {
        $rows = $this->createQueryBuilder('c')
            ->select('c.fingerprint AS fingerprint', 'COUNT(c.id) AS crashes', 'COUNT(DISTINCT c.installId) AS installs', 'MAX(c.occurredAt) AS lastSeen')
            ->where('c.occurredAt >= :since')
            ->setParameter('since', $since)
            ->groupBy('c.fingerprint')
            ->orderBy('crashes', 'DESC')
            ->addOrderBy('lastSeen', 'DESC')
            ->setMaxResults($limit)
            ->getQuery()
            ->getArrayResult();

        $top = [];
        foreach ($rows as $row) {
            $top[] = [
                'fingerprint' => $row['fingerprint'],
                'crashes' => (int) $row['crashes'],
                'installs' => (int) $row['installs'],
                'lastSeen' => new \DateTimeImmutable($row['lastSeen']),
                'latest' => $this->findOneBy(['fingerprint' => $row['fingerprint']], ['occurredAt' => 'DESC']),
            ];
        }

        return $top;
    }

    /** Deletes the reports received before a moment; returns how many. */
    public function purgeBefore(\DateTimeImmutable $before): int
    {
        return $this->createQueryBuilder('c')
            ->delete()
            ->where('c.receivedAt < :before')
            ->setParameter('before', $before)
            ->getQuery()
            ->execute();
    }
}
