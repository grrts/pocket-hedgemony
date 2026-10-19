<?php

namespace App\Twig;

use App\Community\PlainText;
use App\Entity\Account;
use Twig\Attribute\AsTwigFilter;

/** Twig filters for the community: posts as safe HTML, and times as "5 min ago". */
final class CommunityExtension
{
    #[AsTwigFilter('plain_text', isSafe: ['html'])]
    public function plainText(string $text): string
    {
        return PlainText::toHtml($text);
    }

    /** One of eight seal colours (CSS .seal-0 to .seal-7), always the same for the same player. */
    #[AsTwigFilter('seal')]
    public function seal(Account $account): int
    {
        return crc32($account->getId()->toRfc4122()) % 8;
    }

    #[AsTwigFilter('ago')]
    public function ago(\DateTimeInterface $when, ?\DateTimeInterface $now = null): string
    {
        $now ??= new \DateTimeImmutable();
        $seconds = $now->getTimestamp() - $when->getTimestamp();
        if ($seconds < 60) {
            return 'just now';
        }
        if ($seconds < 3600) {
            return intdiv($seconds, 60).' min ago';
        }
        if ($seconds < 86400) {
            return intdiv($seconds, 3600).' h ago';
        }
        $days = intdiv($seconds, 86400);
        if ($days < 2) {
            return 'yesterday';
        }
        if ($days < 7) {
            return $days.' days ago';
        }

        return $when->format($when->format('Y') === $now->format('Y') ? 'j M' : 'j M Y');
    }
}
