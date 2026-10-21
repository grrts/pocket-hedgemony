<?php

namespace App\Command;

use App\Repository\CrashReportRepository;
use App\Repository\MetricEventRepository;
use Psr\Clock\ClockInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Style\SymfonyStyle;

/** Deletes crash reports after 90 days and usage events after 13 months, counted from when the server received them. Run daily. */
#[AsCommand(name: 'app:crashes:purge', description: 'Delete crash reports and usage events past their retention', aliases: ['crashes:purge'])]
final class CrashesPurgeCommand
{
    public const CRASH_DAYS = 90;
    public const METRIC_MONTHS = 13;

    public function __construct(
        private readonly CrashReportRepository $crashes,
        private readonly MetricEventRepository $metrics,
        private readonly ClockInterface $clock,
    ) {
    }

    public function __invoke(SymfonyStyle $io): int
    {
        $now = \DateTimeImmutable::createFromInterface($this->clock->now());
        $crashes = $this->crashes->purgeBefore($now->modify(\sprintf('-%d days', self::CRASH_DAYS)));
        $events = $this->metrics->purgeBefore($now->modify(\sprintf('-%d months', self::METRIC_MONTHS)));
        $io->success(\sprintf('Purged %d crash report(s) and %d usage event(s).', $crashes, $events));

        return Command::SUCCESS;
    }
}
