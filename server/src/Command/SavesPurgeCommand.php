<?php

namespace App\Command;

use App\Repository\CloudSaveRepository;
use App\Saves\SaveObjects;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Clock\ClockInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Style\SymfonyStyle;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

/** Purges the bytes of saves removed more than 30 days ago; the tombstones stay (SAVE-062). Run daily. */
#[AsCommand(name: 'app:saves:purge', description: 'Delete the bytes of cloud saves removed long enough ago')]
final class SavesPurgeCommand
{
    public function __construct(
        private readonly CloudSaveRepository $saves,
        private readonly SaveObjects $objects,
        private readonly EntityManagerInterface $em,
        private readonly ClockInterface $clock,
        #[Autowire('%cloud.tombstone_purge_days%')] private readonly int $days,
    ) {
    }

    public function __invoke(SymfonyStyle $io): int
    {
        $old = $this->saves->purgeable($this->clock->now()->modify("-{$this->days} days"));
        foreach ($old as $save) {
            $this->objects->delete($save->key());
            $save->markPurged();
        }
        $this->em->flush();
        $io->success(\sprintf('Purged %d removed save(s).', \count($old)));

        return Command::SUCCESS;
    }
}
