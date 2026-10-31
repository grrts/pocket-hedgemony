<?php

namespace App\Controller;

use App\Repository\CrashReportRepository;
use App\Repository\MetricEventRepository;
use Psr\Clock\ClockInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * The moderators' read-out of usage statistics and crash reports at /stats: one page,
 * tables only, for the last 7, 30 or 90 days.
 */
#[Route(format: 'html')]
final class StatsController extends AbstractController
{
    public const WINDOWS = [7, 30, 90];
    private const DEFAULT_WINDOW = 30;
    private const TOP_CRASHES = 20;

    public function __construct(
        private readonly MetricEventRepository $metrics,
        private readonly CrashReportRepository $crashes,
        private readonly ClockInterface $clock,
    ) {
    }

    #[Route('/stats', name: 'stats', methods: ['GET'])]
    #[IsGranted('ROLE_MODERATOR')]
    public function stats(Request $request): Response
    {
        $days = $request->query->getInt('days', self::DEFAULT_WINDOW);
        if (!\in_array($days, self::WINDOWS, true)) {
            $days = self::DEFAULT_WINDOW;
        }
        $today = \DateTimeImmutable::createFromInterface($this->clock->now())->setTimezone(new \DateTimeZone('UTC'))->setTime(0, 0);
        $since = $today->modify(\sprintf('-%d days', $days - 1));

        $active = $this->metrics->dailyActiveInstalls($since);
        $new = $this->metrics->newInstallsPerDay($since);
        $daily = [];
        for ($day = $today; $day >= $since; $day = $day->modify('-1 day')) {
            $key = $day->format('Y-m-d');
            $daily[] = ['day' => $day, 'active' => $active[$key] ?? 0, 'new' => $new[$key] ?? 0];
        }

        $response = $this->render('site/stats.html.twig', [
            'days' => $days,
            'windows' => self::WINDOWS,
            'since' => $since,
            'daily' => $daily,
            'new_total' => array_sum($new),
            'events' => $this->metrics->countsByName($since),
            'runtimes' => $this->metrics->runtimeSplit($since),
            'turns' => $this->metrics->highestTurnBuckets($since),
            'tutorial' => $this->metrics->tutorialFunnel($since),
            'crashes' => $this->crashes->topFingerprints($since, self::TOP_CRASHES),
        ]);
        $response->setPrivate();

        return $response;
    }
}
