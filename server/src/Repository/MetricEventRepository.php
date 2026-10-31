<?php

namespace App\Repository;

use App\Entity\MetricEvent;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\DBAL\Platforms\SQLitePlatform;
use Doctrine\ORM\AbstractQuery;
use Doctrine\Persistence\ManagerRegistry;

/**
 * The aggregations behind the moderators' stats page work on SQLite (dev, tests) and
 * PostgreSQL (production). JSON properties are read in PHP rather than with each
 * database's own JSON functions.
 *
 * @extends ServiceEntityRepository<MetricEvent>
 */
class MetricEventRepository extends ServiceEntityRepository
{
    /** The "where players stop" buckets: label => highest turn in the bucket (null: no upper bound). */
    public const TURN_BUCKETS = ['1' => 1, '2–5' => 5, '6–10' => 10, '11–25' => 25, '26–50' => 50, '51–100' => 100, 'over 100' => null];

    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, MetricEvent::class);
    }

    /**
     * Distinct installs that sent anything, per day (Y-m-d) since a moment.
     *
     * @return array<string, int>
     */
    public function dailyActiveInstalls(\DateTimeImmutable $since): array
    {
        $conn = $this->getEntityManager()->getConnection();
        $day = $conn->getDatabasePlatform() instanceof SQLitePlatform ? 'DATE(occurred_at)' : 'CAST(occurred_at AS DATE)';
        $rows = $conn->fetchAllKeyValue(
            "SELECT {$day} AS day, COUNT(DISTINCT install_id) FROM metric_event WHERE occurred_at >= ? GROUP BY {$day} ORDER BY day",
            [$since->format('Y-m-d H:i:s')],
        );

        return array_map('intval', $rows);
    }

    /**
     * Installs whose first ever session_started falls on or after a moment, per day (Y-m-d).
     *
     * @return array<string, int>
     */
    public function newInstallsPerDay(\DateTimeImmutable $since): array
    {
        $rows = $this->createQueryBuilder('e')
            ->select('e.installId', 'MIN(e.occurredAt) AS first')
            ->where("e.name = 'session_started'")
            ->groupBy('e.installId')
            ->having('MIN(e.occurredAt) >= :since')
            ->setParameter('since', $since)
            ->getQuery()
            ->getArrayResult();
        $days = [];
        foreach ($rows as $row) {
            $day = substr((string) $row['first'], 0, 10);
            $days[$day] = ($days[$day] ?? 0) + 1;
        }
        ksort($days);

        return $days;
    }

    /**
     * Events since a moment by name, most frequent first.
     *
     * @return list<array{name: string, events: int, installs: int}>
     */
    public function countsByName(\DateTimeImmutable $since): array
    {
        $rows = $this->createQueryBuilder('e')
            ->select('e.name AS name', 'COUNT(e.id) AS events', 'COUNT(DISTINCT e.installId) AS installs')
            ->where('e.occurredAt >= :since')
            ->setParameter('since', $since)
            ->groupBy('e.name')
            ->orderBy('events', 'DESC')
            ->addOrderBy('e.name')
            ->getQuery()
            ->getArrayResult();

        return array_map(fn (array $r) => ['name' => $r['name'], 'events' => (int) $r['events'], 'installs' => (int) $r['installs']], $rows);
    }

    /**
     * Installs and events since a moment per runtime (web, electron, …), most installs first.
     *
     * @return list<array{runtime: string, events: int, installs: int}>
     */
    public function runtimeSplit(\DateTimeImmutable $since): array
    {
        $rows = $this->createQueryBuilder('e')
            ->select('e.runtime AS runtime', 'COUNT(e.id) AS events', 'COUNT(DISTINCT e.installId) AS installs')
            ->where('e.occurredAt >= :since')
            ->setParameter('since', $since)
            ->groupBy('e.runtime')
            ->orderBy('installs', 'DESC')
            ->getQuery()
            ->getArrayResult();

        return array_map(fn (array $r) => ['runtime' => $r['runtime'], 'events' => (int) $r['events'], 'installs' => (int) $r['installs']], $rows);
    }

    /**
     * Where players stop: each install's highest `turn` in its turn_ended events since a
     * moment, counted per bucket of TURN_BUCKETS (every bucket present, zero or not).
     *
     * @return array<string, int>
     */
    public function highestTurnBuckets(\DateTimeImmutable $since): array
    {
        $highest = [];
        foreach ($this->propertiesOf('turn_ended', $since) as [$install, $properties]) {
            $turn = $properties['turn'] ?? null;
            if (\is_int($turn) && $turn >= 1 && $turn > ($highest[$install] ?? 0)) {
                $highest[$install] = $turn;
            }
        }
        $buckets = array_fill_keys(array_keys(self::TURN_BUCKETS), 0);
        foreach ($highest as $turn) {
            foreach (self::TURN_BUCKETS as $label => $max) {
                if (null === $max || $turn <= $max) {
                    ++$buckets[$label];
                    break;
                }
            }
        }

        return $buckets;
    }

    /**
     * The tutorial funnel: distinct installs that reached each chapter and step of their
     * tutorial_step events since a moment, in natural chapter and step order.
     *
     * @return list<array{chapter: string, step: string, installs: int}>
     */
    public function tutorialFunnel(\DateTimeImmutable $since): array
    {
        $seen = [];
        foreach ($this->propertiesOf('tutorial_step', $since) as [$install, $properties]) {
            $chapter = $properties['chapter'] ?? null;
            $step = $properties['step'] ?? null;
            if (\is_scalar($chapter) && \is_scalar($step)) {
                $seen[(string) $chapter][(string) $step][$install] = true;
            }
        }
        uksort($seen, 'strnatcmp');
        $funnel = [];
        foreach ($seen as $chapter => $steps) {
            uksort($steps, 'strnatcmp');
            foreach ($steps as $step => $installs) {
                $funnel[] = ['chapter' => (string) $chapter, 'step' => (string) $step, 'installs' => \count($installs)];
            }
        }

        return $funnel;
    }

    /** Deletes the events received before a moment; returns how many. */
    public function purgeBefore(\DateTimeImmutable $before): int
    {
        return $this->createQueryBuilder('e')
            ->delete()
            ->where('e.receivedAt < :before')
            ->setParameter('before', $before)
            ->getQuery()
            ->execute();
    }

    /**
     * The install id and properties of every event with a name since a moment.
     *
     * @return iterable<array{string, array}>
     */
    private function propertiesOf(string $name, \DateTimeImmutable $since): iterable
    {
        $rows = $this->createQueryBuilder('e')
            ->select('e.installId AS installId', 'e.properties AS properties')
            ->where('e.name = :name AND e.occurredAt >= :since')
            ->setParameter('name', $name)
            ->setParameter('since', $since)
            ->getQuery()
            ->toIterable([], AbstractQuery::HYDRATE_ARRAY);
        foreach ($rows as $row) {
            $properties = \is_string($row['properties']) ? json_decode($row['properties'], true) : $row['properties'];
            if (\is_array($properties)) {
                yield [$row['installId'], $properties];
            }
        }
    }
}
