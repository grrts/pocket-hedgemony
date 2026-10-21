<?php

namespace App\Command;

use App\Account\Registration;
use App\Entity\Post;
use App\Entity\PostReport;
use App\Entity\Topic;
use App\Repository\AccountRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Style\SymfonyStyle;
use Symfony\Component\DependencyInjection\Attribute\When;

/**
 * Dev only: fills the community with demo players and topics, to look at the pages.
 * Every demo account's password is "demo-password"; mod@example.com is a moderator.
 */
#[When('dev')]
#[AsCommand(name: 'app:community:demo', description: 'Dev only: seed the community with demo topics')]
final class CommunityDemoCommand
{
    public function __construct(
        private readonly Registration $registration,
        private readonly AccountRepository $accounts,
        private readonly EntityManagerInterface $em,
    ) {
    }

    public function __invoke(SymfonyStyle $io): int
    {
        $people = [];
        foreach (['Mehmed the Builder' => 'mehmed', 'Jadwiga' => 'jadwiga', 'Hanseatic Hans' => 'hans', 'Admiral Zheng' => 'zheng', 'Moderator Mira' => 'mod'] as $name => $user) {
            $email = $user.'@example.com';
            $people[$user] = $this->accounts->findOneBy(['email' => $email]) ?? $this->registration->register($email, $name, 'demo-password');
        }
        $people['mod']->addRole('ROLE_MODERATOR');

        $topics = [
            ['strategy', 'Holding Constantinople as the Ottomans by 1460', 'mehmed', [
                ['mehmed', "Took me four tries, but here's what worked.\n\nBuild a second siege train before you march, and keep a fleet in the Bosporus so the Greeks can't be resupplied from the sea. The walls fall in about eleven weeks if you keep both trains fed.\n\nAnyone managed it faster?"],
                ['jadwiga', 'Eleven weeks is good. I lost my whole army to disease outside the walls the first time, so bring food carts.'],
                ['zheng', "The fleet trick is the key part. Blockade first, then the siege. See https://pockethegemony.example/wiki/Sieges for the numbers."],
            ]],
            ['bugs', 'Fleet stuck in the Øresund after a storm', 'hans', [
                ['hans', "Steps:\n1. Sail a fleet from Lübeck to Bergen.\n2. A storm hits on the way.\n3. The fleet stays in the strait and won't take new orders.\n\nExpected it to keep going. Saved game attached on the Discord."],
                ['mod', 'Thanks, that is a clear report. Passed it on.'],
            ]],
            ['ideas', 'Let me name my provinces', 'jadwiga', [
                ['jadwiga', 'It would be lovely to rename a province once you have held it for fifty years.'],
            ]],
            ['general', 'What nation are you playing this week?', 'zheng', [
                ['zheng', 'Ming here, trying to keep the treasure fleets going past 1450.'],
                ['mehmed', 'Ottomans, of course.'],
                ['hans', 'Lübeck. Trade or nothing.'],
                ['jadwiga', 'Poland-Lithuania. The Teutonic Order will fall.'],
            ]],
            ['strategy', 'A merchant republic that never goes to war', 'hans', [
                ['hans', 'Is it possible to win as Venice without fighting? I have been buying my way out of every war so far.'],
            ]],
            ['general', 'Welcome to the community!', 'mod', [
                ['mod', "Hello, and welcome. Be kind, keep to the subject of the board, and report posts that break the rules.\n\nThe wiki answers most rules questions: https://pockethegemony.example/wiki"],
            ]],
        ];
        // A long thread, to see the pages of a topic.
        $openings = ['Dutch trade first, then the navy.', 'Castile: take Granada in the first ten years.', 'Muscovy, march east and never stop.', 'Portugal, straight for the spice islands.', 'Burgundy, marry well and wait.'];
        $long = [['zheng', 'Post your best opening moves, one nation per reply.']];
        foreach (range(1, 24) as $i) {
            $long[] = [array_keys($people)[$i % 4], $openings[$i % 5].' (Try '.$i.')'];
        }
        array_unshift($topics, ['strategy', 'Your best opening moves', 'zheng', $long]);
        $minutes = 60 * 24 * 6;
        $reported = null;
        foreach ($topics as [$board, $title, $author, $posts]) {
            $topic = new Topic($board, $title, $people[$author]);
            $this->em->persist($topic);
            foreach ($posts as [$who, $body]) {
                $post = new Post($topic, $people[$who], $body);
                $this->setCreated($post, $minutes);
                $minutes -= 97;
                $topic->touch($post);
                $this->em->persist($post);
                $reported ??= 'jadwiga' === $who ? $post : null;
            }
            $this->setCreated($topic, $minutes + 97 * \count($posts));
        }
        $this->em->persist(new PostReport($reported, $people['hans'], 'This feels a bit rude to people who play Constantinople differently.'));
        $this->em->flush();
        $io->success('Seeded the community. Sign in as mod@example.com / demo-password to moderate.');

        return Command::SUCCESS;
    }

    private function setCreated(Topic|Post $entity, int $minutesAgo): void
    {
        (new \ReflectionProperty($entity, 'createdAt'))->setValue($entity, new \DateTimeImmutable('-'.$minutesAgo.' minutes'));
    }
}
