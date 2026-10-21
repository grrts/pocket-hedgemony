<?php

namespace App\Command;

use App\Repository\AccountRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\Argument;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Attribute\Option;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Style\SymfonyStyle;

/** Makes an account a community moderator (ROLE_MODERATOR), or takes the role away with --remove. */
#[AsCommand(name: 'app:community:moderator', description: 'Grant or remove the community moderator role')]
final class CommunityModeratorCommand
{
    public function __construct(
        private readonly AccountRepository $accounts,
        private readonly EntityManagerInterface $em,
    ) {
    }

    public function __invoke(
        SymfonyStyle $io,
        #[Argument('The account\'s email address')] string $email,
        #[Option('Take the moderator role away instead')] bool $remove = false,
    ): int {
        $account = $this->accounts->findOneBy(['email' => mb_strtolower(trim($email))]);
        if (!$account) {
            $io->error('No account has the email '.$email.'.');

            return Command::FAILURE;
        }
        $remove ? $account->removeRole('ROLE_MODERATOR') : $account->addRole('ROLE_MODERATOR');
        $this->em->flush();
        $io->success(\sprintf('%s (%s) is %s a moderator.', $account->getDisplayName(), $account->getEmail(), $remove ? 'no longer' : 'now'));

        return Command::SUCCESS;
    }
}
