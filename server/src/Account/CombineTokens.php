<?php

namespace App\Account;

use App\Entity\Account;
use Psr\Clock\ClockInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * The offer to combine two accounts (SAVE-186, D-SAVE-24): proof that the player just passed the other
 * account's sign-in, as an HMAC with the server's secret over the account that stays, the one that goes
 * and when the offer ends. Nothing is stored; a token is good only for the account it names as staying.
 */
final class CombineTokens
{
    public function __construct(
        private readonly ClockInterface $clock,
        #[Autowire('%kernel.secret%')] private readonly string $secret,
        #[Autowire('%cloud.sign_in_combine_minutes%')] private readonly int $minutes,
    ) {
    }

    public function issue(Account $staying, Account $other): string
    {
        $ends = $this->clock->now()->getTimestamp() + $this->minutes * 60;
        $data = $staying->getId()->toRfc4122().'.'.$other->getId()->toRfc4122().'.'.$ends;

        return $data.'.'.$this->mac($data);
    }

    /** @return array{staying: string, other: string}|null the two account ids, or null when it is altered or ran out */
    public function read(string $token): ?array
    {
        $parts = explode('.', $token);
        if (4 !== \count($parts)) {
            return null;
        }
        [$staying, $other, $ends, $mac] = $parts;
        $data = "{$staying}.{$other}.{$ends}";
        if (!hash_equals($this->mac($data), $mac) || !ctype_digit($ends) || (int) $ends <= $this->clock->now()->getTimestamp()) {
            return null;
        }

        return ['staying' => $staying, 'other' => $other];
    }

    private function mac(string $data): string
    {
        return hash_hmac('sha256', 'combine-accounts|'.$data, $this->secret);
    }
}
