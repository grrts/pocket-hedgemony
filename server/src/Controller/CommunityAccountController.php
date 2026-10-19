<?php

namespace App\Controller;

use App\Account\Registration;
use App\Entity\Account;
use App\Repository\TopicRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\RateLimiter\RateLimiterFactoryInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\Security\Http\Authentication\AuthenticationUtils;
use Symfony\Component\Validator\Validator\ValidatorInterface;

/**
 * Signing in to the website with the game account (form_login on the main firewall,
 * see config/packages/security.yaml), signing up, signing out, and the player's own page.
 */
#[Route('/community', format: 'html')]
final class CommunityAccountController extends AbstractController
{
    /** Where a "next" address may lead after signing in or up: a page of the site, never another site. */
    public static function isSafeNext(string $next): bool
    {
        return 1 === preg_match('~^/(community|wiki)(?:[/?#][^\s\\\\]*)?$~', $next) && !str_contains($next, '//');
    }

    #[Route('/signin', name: 'community_signin', methods: ['GET', 'POST'])]
    public function signin(Request $request, AuthenticationUtils $auth): Response
    {
        if ($this->getUser()) {
            return $this->redirectToRoute('community');
        }
        $error = $auth->getLastAuthenticationError();
        $next = (string) $request->query->get('next', $request->request->get('next', ''));

        return $this->render('community/signin.html.twig', [
            'email' => $auth->getLastUsername(),
            'error' => match (true) {
                null === $error => null,
                str_contains($error->getMessageKey(), 'Too many') => 'Too many tries. Wait a few minutes, then try again.',
                str_contains($error->getMessageKey(), 'CSRF') => 'The page was open too long. Try again.',
                default => 'That email and password do not match an account.',
            },
            'next' => self::isSafeNext($next) ? $next : '',
        ], new Response(status: $error ? Response::HTTP_UNPROCESSABLE_ENTITY : Response::HTTP_OK));
    }

    #[Route('/join', name: 'community_join', methods: ['GET', 'POST'])]
    public function join(Request $request, Registration $registration, ValidatorInterface $validator, Security $security, RateLimiterFactoryInterface $communityJoinLimiter): Response
    {
        if ($this->getUser()) {
            return $this->redirectToRoute('community');
        }
        $next = (string) $request->query->get('next', $request->request->get('next', ''));
        $next = self::isSafeNext($next) ? $next : '';
        $form = ['email' => '', 'displayName' => '', 'password' => ''];
        $errors = [];
        $status = Response::HTTP_OK;
        if ($request->isMethod('POST')) {
            $form = [
                'email' => trim((string) $request->request->get('email', '')),
                'displayName' => trim((string) $request->request->get('displayName', '')),
                'password' => (string) $request->request->get('password', ''),
            ];
            foreach ($validator->validate($form, Registration::constraint()) as $violation) {
                $errors[trim($violation->getPropertyPath(), '[]')] ??= $violation->getMessage();
            }
            $status = Response::HTTP_UNPROCESSABLE_ENTITY;
            if (!$this->isCsrfTokenValid('join', (string) $request->request->get('_token'))) {
                [$errors['form'], $status] = ['The page was open too long. Send it again.', Response::HTTP_FORBIDDEN];
            } elseif (!$errors && $registration->isEmailTaken($form['email'])) {
                $errors['email'] = 'There is already an account with this email. Sign in instead.';
            } elseif (!$errors && !$communityJoinLimiter->create($request->getClientIp() ?? 'unknown')->consume()->isAccepted()) {
                [$errors['form'], $status] = ['Too many accounts were made from here in the last hour. Try again later.', Response::HTTP_TOO_MANY_REQUESTS];
            }
            if (!$errors) {
                $account = $registration->register($form['email'], $form['displayName'], $form['password']);
                $security->login($account, 'form_login', 'main');

                return $next ? $this->redirect($next, Response::HTTP_SEE_OTHER) : $this->redirectToRoute('community', status: Response::HTTP_SEE_OTHER);
            }
            $form['password'] = '';
        }

        return $this->render('community/join.html.twig', ['form' => $form, 'errors' => $errors, 'next' => $next], new Response(status: $status));
    }

    /** Handled by the firewall's logout (a POST with a CSRF token, from the player's own page). */
    #[Route('/signout', name: 'community_signout', methods: ['POST'])]
    public function signout(): never
    {
        throw new \LogicException('The firewall signs players out.');
    }

    #[Route('/you', name: 'community_you', methods: ['GET'])]
    #[IsGranted('ROLE_PLAYER')]
    public function you(TopicRepository $topics): Response
    {
        $account = $this->getUser();
        \assert($account instanceof Account);

        return $this->render('community/you.html.twig', [
            'account' => $account,
            'topics' => $topics->findBy(['author' => $account, 'hidden' => false], ['lastActivityAt' => 'DESC'], 10),
        ]);
    }
}
