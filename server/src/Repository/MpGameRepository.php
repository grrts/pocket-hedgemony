<?php

namespace App\Repository;

use App\Entity\MpGame;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<MpGame>
 */
class MpGameRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, MpGame::class);
    }

    /** A new version for the game, counted up in the database so two writes at once each get their own (MP-036). */
    public function bump(MpGame $game): void
    {
        $this->getEntityManager()->createQuery('UPDATE '.MpGame::class.' g SET g.version = g.version + 1 WHERE g.id = :id')
            ->setParameter('id', $game->getId())->execute();
        $this->getEntityManager()->refresh($game);
    }
}
