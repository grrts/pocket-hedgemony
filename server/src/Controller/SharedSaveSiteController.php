<?php

namespace App\Controller;

use App\Entity\Account;
use App\Repository\SharedSaveRepository;
use App\Saves\SaveObjects;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Clock\ClockInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * A shared save on the website (SAVE-127, SAVE-131, SAVE-135): its short link `/s/<code>`
 * leads to the post it came with, `/s/<code>.phsave` downloads it, and the player who
 * shared it removes it from the You page.
 */
final class SharedSaveSiteController extends AbstractController
{
    public function __construct(
        private readonly SharedSaveRepository $shared,
        private readonly SaveObjects $objects,
        private readonly EntityManagerInterface $em,
        private readonly ClockInterface $clock,
    ) {
    }

    #[Route('/s/{code}', name: 'shared_save_page', requirements: ['code' => '[A-Za-z0-9-]{8,9}'], methods: ['GET'])]
    public function page(string $code): Response
    {
        $save = $this->shared->findByCode($code);
        if (null === $save || $save->getTopic()->isHidden() || $save->getPost()->isHidden()) {
            throw new NotFoundHttpException(SharedSavesController::NOT_FOUND);
        }

        return $this->redirectToRoute('community_post', ['id' => $save->getPost()->getId()]);
    }

    #[Route('/s/{code}.phsave', name: 'shared_save_download', requirements: ['code' => '[A-Za-z0-9-]{8,9}'], methods: ['GET'])]
    public function download(string $code): Response
    {
        $save = $this->shared->findByCode($code);
        $bytes = null !== $save && $save->isPlayable() ? $this->objects->get($save->key()) : null;
        if (null === $bytes) {
            throw new NotFoundHttpException(SharedSavesController::NOT_FOUND);
        }

        return SharedSavesController::download($save, $bytes);
    }

    #[Route('/community/s/{code}/remove', name: 'community_shared_remove', requirements: ['code' => '[A-Za-z0-9-]{8,9}'], methods: ['POST'], format: 'html')]
    #[IsGranted('ROLE_PLAYER')]
    public function remove(Request $request, string $code): Response
    {
        if (!$this->isCsrfTokenValid('community-post', (string) $request->request->get('_token'))) {
            return $this->render('community/expired.html.twig', [], new Response(status: Response::HTTP_FORBIDDEN));
        }
        $account = $this->getUser();
        $save = $this->shared->findByCode($code);
        if (!$account instanceof Account || null === $save || !$save->getAccount()->getId()->equals($account->getId())) {
            throw new AccessDeniedHttpException('Only the player who shared a save removes it.');
        }
        if (!$save->isRemoved()) {
            SharedSavesController::removeSave($save, $this->objects, $this->clock->now());
            $this->em->flush();
            $this->addFlash('notice', 'The shared save "'.$save->getTitle().'" was removed. Its topic stays.');
        }

        return $this->redirectToRoute('community_you', status: Response::HTTP_SEE_OTHER);
    }
}
