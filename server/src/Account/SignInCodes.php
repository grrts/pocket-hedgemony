<?php

namespace App\Account;

use App\Entity\SignInCode;
use App\Repository\SignInCodeRepository;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Clock\ClockInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * The one-time codes that carry a browser sign-in back to the game (SAVE-151, D-SAVE-22): each
 * lasts a few minutes and is exchanged once, marked used in a single UPDATE so two exchanges of
 * the same code cannot both win.
 */
final class SignInCodes
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly SignInCodeRepository $codes,
        private readonly ClockInterface $clock,
        #[Autowire('%cloud.sign_in_code_minutes%')] private readonly int $minutes,
    ) {
    }

    /** A new code for this sign-in, or null when the store's response nonce was used before. */
    public function issue(StoreIdentity $identity, string $responseNonce): ?string
    {
        $now = $this->clock->now();
        // Rows a day past their end are of no more use: a nonce that old is refused by its age.
        $this->em->createQuery('DELETE FROM '.SignInCode::class.' c WHERE c.expiresAt < :old')
            ->setParameter('old', $now->modify('-1 day'))
            ->execute();
        if (null !== $this->codes->findOneBy(['responseNonce' => $responseNonce])) {
            return null;
        }
        $code = 'phs_'.bin2hex(random_bytes(24));
        $this->em->persist(new SignInCode(Tokens::hash($code), $identity->provider, $identity->subject, $responseNonce, $now->modify("+{$this->minutes} minutes")));
        $this->em->flush();

        return $code;
    }

    /** Who the code stands for, once; null when it is unknown, used, expired or for another store. */
    public function redeem(string $code, string $provider): ?StoreIdentity
    {
        $now = $this->clock->now();
        $hash = Tokens::hash($code);
        $won = $this->em->createQuery('UPDATE '.SignInCode::class.' c SET c.usedAt = :now WHERE c.codeHash = :hash AND c.provider = :provider AND c.usedAt IS NULL AND c.expiresAt > :now')
            ->setParameters(['now' => $now, 'hash' => $hash, 'provider' => $provider])
            ->execute();
        if (1 !== $won) {
            return null;
        }
        $row = $this->codes->findOneBy(['codeHash' => $hash]);

        return null === $row ? null : new StoreIdentity($row->getProvider(), $row->getSubject());
    }
}
