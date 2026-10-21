<?php

namespace App\Command;

use App\Purchases\Entitlements;
use App\Purchases\Google\GooglePlay;
use App\Purchases\StoreUnavailable;
use Psr\Clock\ClockInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Attribute\Option;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Style\SymfonyStyle;

/**
 * Reads Google Play's voided purchases list and marks those purchases refunded (SAVE-177), in case a
 * real-time notification was missed. Run daily; it looks back over the last days given (Play keeps 30).
 */
#[AsCommand(name: 'app:stores:google-voided', description: 'Mark refunded the Google Play purchases Play lists as voided')]
final class GoogleVoidedCommand
{
    public function __construct(
        private readonly GooglePlay $play,
        private readonly Entitlements $entitlements,
        private readonly ClockInterface $clock,
    ) {
    }

    public function __invoke(SymfonyStyle $io, #[Option(description: 'How many days to look back')] int $days = 3): int
    {
        try {
            $voided = $this->play->voided($this->clock->now()->modify('-'.max(1, min(30, $days)).' days'));
        } catch (StoreUnavailable $e) {
            $io->error($e->getMessage());

            return Command::FAILURE;
        }
        $marked = 0;
        foreach ($voided as $v) {
            $marked += $this->entitlements->voided($v['token'], $v['orderId']) ? 1 : 0;
        }
        $io->success(\sprintf('Play lists %d voided purchase(s); %d marked refunded here.', \count($voided), $marked));

        return Command::SUCCESS;
    }
}
