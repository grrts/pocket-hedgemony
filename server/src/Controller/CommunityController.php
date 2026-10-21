<?php

namespace App\Controller;

use App\Community\Boards;
use App\Community\PlainText;
use App\Entity\Account;
use App\Entity\Post;
use App\Entity\PostReport;
use App\Entity\Topic;
use App\Repository\PostReportRepository;
use App\Repository\PostRepository;
use App\Repository\SharedSaveRepository;
use App\Repository\TopicRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\RateLimiter\RateLimiterFactoryInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * The community forum at /community: fixed boards (App\Community\Boards), their
 * topics and posts. Guests read everything that is not hidden; posting needs an account,
 * and moderators (ROLE_MODERATOR) hide and lock things and answer reports.
 */
#[Route('/community', format: 'html')]
final class CommunityController extends AbstractController
{
    public const TOPICS_PER_PAGE = 25;
    public const POSTS_PER_PAGE = 20;
    private const LATEST = 8;
    private const EXPIRED = 'This form was open too long and expired. Send it again.';

    public function __construct(
        private readonly Boards $boards,
        private readonly TopicRepository $topics,
        private readonly PostRepository $posts,
        private readonly PostReportRepository $reports,
        private readonly SharedSaveRepository $sharedSaves,
        private readonly EntityManagerInterface $em,
        private readonly RateLimiterFactoryInterface $communityTopicLimiter,
        private readonly RateLimiterFactoryInterface $communityPostLimiter,
        private readonly RateLimiterFactoryInterface $communityReportLimiter,
    ) {
    }

    #[Route('', name: 'community', methods: ['GET'])]
    public function overview(): Response
    {
        $counts = $this->topics->boardCounts();
        $boards = [];
        foreach ($this->boards->all() as $board) {
            $boards[] = $board + [
                'topics' => $counts[$board['slug']]['topics'] ?? 0,
                'posts' => $counts[$board['slug']]['posts'] ?? 0,
                'latest' => $this->topics->newestActivity($board['slug'], false, 0, 1)[0] ?? null,
            ];
        }
        $latest = $this->topics->newestActivity(null, false, 0, self::LATEST);

        return $this->render('community/overview.html.twig', [
            'boards' => $boards,
            'latest' => $latest,
            'post_counts' => $this->posts->countsFor($latest),
            'open_reports' => $this->isModerator() ? $this->reports->countOpen() : 0,
        ]);
    }

    #[Route('/new', name: 'community_new', methods: ['GET', 'POST'])]
    #[IsGranted('ROLE_PLAYER')]
    public function newTopic(Request $request): Response
    {
        $form = ['board' => (string) $request->query->get('board', ''), 'title' => '', 'body' => ''];
        $errors = [];
        $status = Response::HTTP_OK;
        if ($request->isMethod('POST')) {
            $form = [
                'board' => (string) $request->request->get('board', ''),
                'title' => PlainText::clean((string) $request->request->get('title', ''), singleLine: true),
                'body' => PlainText::clean((string) $request->request->get('body', '')),
            ];
            if (!$this->boards->get($form['board'])) {
                $errors['board'] = 'Choose a board.';
            }
            $errors += $this->titleErrors($form['title']) + $this->bodyErrors($form['body']);
            $status = Response::HTTP_UNPROCESSABLE_ENTITY;
            if (!$this->csrfOk($request, 'community-post')) {
                [$errors['form'], $status] = [self::EXPIRED, Response::HTTP_FORBIDDEN];
            } elseif (!$errors && !$this->communityTopicLimiter->create($this->account()->getId()->toRfc4122())->consume()->isAccepted()) {
                [$errors['form'], $status] = ['You have started a lot of topics in the last hour. Try again later.', Response::HTTP_TOO_MANY_REQUESTS];
            }
            if (!$errors) {
                $topic = new Topic($form['board'], $form['title'], $this->account());
                $post = new Post($topic, $this->account(), $form['body']);
                $this->em->persist($topic);
                $this->em->persist($post);
                $this->em->flush();

                return $this->redirectToTopic($topic);
            }
        }

        return $this->render('community/new_topic.html.twig', ['form' => $form, 'errors' => $errors, 'boards' => $this->boards->all()], new Response(status: $status));
    }

    #[Route('/t/{id}-{slug}', name: 'community_topic', requirements: ['id' => '\d+', 'slug' => '[a-z0-9-]*'], methods: ['GET'])]
    #[Route('/t/{id}', name: 'community_topic_short', requirements: ['id' => '\d+'], defaults: ['slug' => ''], methods: ['GET'])]
    public function topic(Request $request, int $id, string $slug): Response
    {
        $topic = $this->findTopic($id);
        if ($slug !== $topic->getSlug()) {
            return $this->redirectToRoute('community_topic', ['id' => $id, 'slug' => $topic->getSlug()] + array_filter(['page' => $request->query->get('page')]), Response::HTTP_MOVED_PERMANENTLY);
        }

        return $this->renderTopic($topic, $this->pageNumber($request));
    }

    #[Route('/t/{id}/reply', name: 'community_reply', requirements: ['id' => '\d+'], methods: ['POST'])]
    #[IsGranted('ROLE_PLAYER')]
    public function reply(Request $request, int $id): Response
    {
        $topic = $this->findTopic($id);
        $body = PlainText::clean((string) $request->request->get('body', ''));
        $last = $this->lastPage($topic);
        if (!$this->csrfOk($request, 'community-post')) {
            return $this->renderTopic($topic, $last, $body, ['body' => self::EXPIRED], Response::HTTP_FORBIDDEN);
        }
        if ($topic->isLocked() && !$this->isModerator()) {
            return $this->renderTopic($topic, $last, $body, ['body' => 'This topic is locked: nobody can reply to it.'], Response::HTTP_FORBIDDEN);
        }
        if ($errors = $this->bodyErrors($body)) {
            return $this->renderTopic($topic, $last, $body, $errors, Response::HTTP_UNPROCESSABLE_ENTITY);
        }
        if (!$this->communityPostLimiter->create($this->account()->getId()->toRfc4122())->consume()->isAccepted()) {
            return $this->renderTopic($topic, $last, $body, ['body' => 'You have posted a lot in the last few minutes. Wait a little, then send it again.'], Response::HTTP_TOO_MANY_REQUESTS);
        }

        $post = new Post($topic, $this->account(), $body);
        $topic->touch($post);
        $this->em->persist($post);
        $this->em->flush();

        return $this->redirectToPost($post);
    }

    #[Route('/p/{id}', name: 'community_post', requirements: ['id' => '\d+'], methods: ['GET'])]
    public function post(int $id): Response
    {
        return $this->redirectToPost($this->findPost($id));
    }

    #[Route('/p/{id}/edit', name: 'community_edit', requirements: ['id' => '\d+'], methods: ['GET', 'POST'])]
    #[IsGranted('ROLE_PLAYER')]
    public function edit(Request $request, int $id): Response
    {
        $post = $this->findPost($id);
        // Saving gets ten minutes' grace, so an edit begun inside the window is not lost.
        if (!$post->canBeEditedBy($this->account(), new \DateTimeImmutable($request->isMethod('POST') ? '-10 minutes' : 'now'))) {
            throw new AccessDeniedHttpException('Posts can only be edited by their author, for 30 minutes after posting.');
        }
        $opening = $this->posts->openingPost($post->getTopic()) === $post;
        $form = ['title' => $post->getTopic()->getTitle(), 'body' => $post->getBody()];
        $errors = [];
        if ($request->isMethod('POST')) {
            $form = [
                'title' => $opening ? PlainText::clean((string) $request->request->get('title', ''), singleLine: true) : $form['title'],
                'body' => PlainText::clean((string) $request->request->get('body', '')),
            ];
            $errors = ($opening ? $this->titleErrors($form['title']) : []) + $this->bodyErrors($form['body']);
            if (!$this->csrfOk($request, 'community-post')) {
                $errors['form'] = self::EXPIRED;
            }
            if (!$errors) {
                $post->edit($form['body']);
                if ($opening) {
                    $post->getTopic()->setTitle($form['title']);
                }
                $this->em->flush();

                return $this->redirectToPost($post);
            }
        }

        return $this->render('community/edit.html.twig', [
            'post' => $post,
            'topic' => $post->getTopic(),
            'board' => $this->boards->get($post->getTopic()->getBoard()),
            'opening' => $opening,
            'form' => $form,
            'errors' => $errors,
        ], new Response(status: match (true) {
            isset($errors['form']) => Response::HTTP_FORBIDDEN,
            (bool) $errors => Response::HTTP_UNPROCESSABLE_ENTITY,
            default => Response::HTTP_OK,
        }));
    }

    #[Route('/p/{id}/report', name: 'community_report', requirements: ['id' => '\d+'], methods: ['GET', 'POST'])]
    #[IsGranted('ROLE_PLAYER')]
    public function report(Request $request, int $id): Response
    {
        $post = $this->findPost($id);
        $account = $this->account();
        $already = null !== $this->reports->findOneBy(['post' => $post, 'reporter' => $account]);
        $own = $post->getAuthor()->getId()->equals($account->getId());
        $reason = '';
        $errors = [];
        if ($request->isMethod('POST') && !$already && !$own) {
            if ($expired = $this->expired($request, 'community-post')) {
                return $expired;
            }
            $reason = PlainText::clean((string) $request->request->get('reason', ''));
            if (PlainText::length($reason) > PostReport::REASON_MAX) {
                $errors['reason'] = 'Keep it under '.PostReport::REASON_MAX.' characters.';
            } elseif (!$this->communityReportLimiter->create($account->getId()->toRfc4122())->consume()->isAccepted()) {
                $errors['reason'] = 'You have reported a lot of posts in the last hour. Try again later.';
            } else {
                $this->em->persist(new PostReport($post, $account, $reason));
                $this->em->flush();
                $this->addFlash('notice', 'Thank you. The moderators will look at that post.');

                return $this->redirectToPost($post);
            }
        }

        return $this->render('community/report.html.twig', [
            'post' => $post,
            'topic' => $post->getTopic(),
            'board' => $this->boards->get($post->getTopic()->getBoard()),
            'already' => $already,
            'own' => $own,
            'reason' => $reason,
            'errors' => $errors,
        ], new Response(status: $errors ? Response::HTTP_UNPROCESSABLE_ENTITY : Response::HTTP_OK));
    }

    #[Route('/reports', name: 'community_reports', methods: ['GET'])]
    #[IsGranted('ROLE_MODERATOR')]
    public function reports(): Response
    {
        return $this->render('community/reports.html.twig', ['open' => $this->reports->openByPost()]);
    }

    #[Route('/p/{id}/hide', name: 'community_hide_post', requirements: ['id' => '\d+'], methods: ['POST'])]
    #[IsGranted('ROLE_MODERATOR')]
    public function hidePost(Request $request, int $id): Response
    {
        if ($expired = $this->expired($request, 'community-moderate')) {
            return $expired;
        }
        $post = $this->findPost($id);
        $post->setHidden($request->request->getBoolean('hidden'));
        if ($post->isHidden()) {
            $this->reports->resolveFor($post);
        }
        $this->em->flush();

        return $this->back($request, $this->generateUrl('community_post', ['id' => $id]));
    }

    #[Route('/p/{id}/dismiss', name: 'community_dismiss', requirements: ['id' => '\d+'], methods: ['POST'])]
    #[IsGranted('ROLE_MODERATOR')]
    public function dismissReports(Request $request, int $id): Response
    {
        if ($expired = $this->expired($request, 'community-moderate')) {
            return $expired;
        }
        $this->reports->resolveFor($this->findPost($id));
        $this->em->flush();

        return $this->redirectToRoute('community_reports', status: Response::HTTP_SEE_OTHER);
    }

    #[Route('/t/{id}/hide', name: 'community_hide_topic', requirements: ['id' => '\d+'], methods: ['POST'])]
    #[IsGranted('ROLE_MODERATOR')]
    public function hideTopic(Request $request, int $id): Response
    {
        if ($expired = $this->expired($request, 'community-moderate')) {
            return $expired;
        }
        $topic = $this->findTopic($id);
        $topic->setHidden($request->request->getBoolean('hidden'));
        $this->em->flush();

        return $this->redirectToTopic($topic);
    }

    #[Route('/t/{id}/lock', name: 'community_lock_topic', requirements: ['id' => '\d+'], methods: ['POST'])]
    #[IsGranted('ROLE_MODERATOR')]
    public function lockTopic(Request $request, int $id): Response
    {
        if ($expired = $this->expired($request, 'community-moderate')) {
            return $expired;
        }
        $topic = $this->findTopic($id);
        $topic->setLocked($request->request->getBoolean('locked'));
        $this->em->flush();

        return $this->redirectToTopic($topic, $this->lastPage($topic));
    }

    /** Last, so every fixed address above wins over a board slug. */
    #[Route('/{board}', name: 'community_board', requirements: ['board' => '[a-z][a-z0-9-]*'], methods: ['GET'], priority: -10)]
    public function board(Request $request, string $board): Response
    {
        $info = $this->boards->get($board) ?? throw new NotFoundHttpException('No board '.$board);
        $page = $this->pageNumber($request);
        $total = $this->topics->countOn($board, $this->isModerator());
        $pages = max(1, (int) ceil($total / self::TOPICS_PER_PAGE));
        if ($page > $pages) {
            throw new NotFoundHttpException('No such page');
        }
        $topics = $this->topics->newestActivity($board, $this->isModerator(), ($page - 1) * self::TOPICS_PER_PAGE, self::TOPICS_PER_PAGE);

        return $this->render('community/board.html.twig', [
            'board' => $info,
            'topics' => $topics,
            'post_counts' => $this->posts->countsFor($topics),
            'page' => $page,
            'pages' => $pages,
            'total' => $total,
        ]);
    }

    private function renderTopic(Topic $topic, int $page, string $draft = '', array $errors = [], int $status = Response::HTTP_OK): Response
    {
        $mod = $this->isModerator();
        $total = $this->posts->countIn($topic, $mod);
        $pages = max(1, (int) ceil($total / self::POSTS_PER_PAGE));
        if ($page > $pages) {
            throw new NotFoundHttpException('No such page');
        }

        $posts = $this->posts->inTopic($topic, $mod, ($page - 1) * self::POSTS_PER_PAGE, self::POSTS_PER_PAGE);

        return $this->render('community/topic.html.twig', [
            'topic' => $topic,
            'board' => $this->boards->get($topic->getBoard()),
            'posts' => $posts,
            // The save each post came with, shown as its card above the post (SAVE-134).
            'shared' => $this->sharedSaves->byPost($posts),
            'opening_id' => $this->posts->openingPost($topic)?->getId(),
            'page' => $page,
            'pages' => $pages,
            'replies' => max(0, $total - 1),
            'draft' => $draft,
            'errors' => $errors,
        ], new Response(status: $status));
    }

    private function findTopic(int $id): Topic
    {
        $topic = $this->topics->find($id);
        if (!$topic || ($topic->isHidden() && !$this->isModerator()) || !$this->boards->get($topic->getBoard())) {
            throw new NotFoundHttpException('No topic '.$id);
        }

        return $topic;
    }

    private function findPost(int $id): Post
    {
        $post = $this->posts->find($id);
        if (!$post || (($post->isHidden() || $post->getTopic()->isHidden()) && !$this->isModerator())) {
            throw new NotFoundHttpException('No post '.$id);
        }

        return $post;
    }

    private function lastPage(Topic $topic): int
    {
        return max(1, (int) ceil($this->posts->countIn($topic, $this->isModerator()) / self::POSTS_PER_PAGE));
    }

    private function redirectToTopic(Topic $topic, int $page = 1): RedirectResponse
    {
        return $this->redirect($this->topicUrl($topic, $page), Response::HTTP_SEE_OTHER);
    }

    private function redirectToPost(Post $post): RedirectResponse
    {
        $page = intdiv($this->posts->countBefore($post, $this->isModerator()), self::POSTS_PER_PAGE) + 1;

        return $this->redirect($this->topicUrl($post->getTopic(), $page).'#p'.$post->getId(), Response::HTTP_SEE_OTHER);
    }

    private function topicUrl(Topic $topic, int $page): string
    {
        return $this->generateUrl('community_topic', ['id' => $topic->getId(), 'slug' => $topic->getSlug()] + ($page > 1 ? ['page' => $page] : []));
    }

    /** Back to the page a moderator acted from, when it is a community page. */
    private function back(Request $request, string $fallback): RedirectResponse
    {
        $back = (string) $request->request->get('back', '');

        return $this->redirect(CommunityAccountController::isSafeNext($back) ? $back : $fallback, Response::HTTP_SEE_OTHER);
    }

    private function pageNumber(Request $request): int
    {
        $page = $request->query->get('page', '1');

        return ctype_digit((string) $page) && (int) $page >= 1 ? min((int) $page, 100000) : throw new NotFoundHttpException('No such page');
    }

    /** @return array<string, string> */
    private function titleErrors(string $title): array
    {
        $length = PlainText::length($title);

        return match (true) {
            $length < Topic::TITLE_MIN => ['title' => 'Give the topic a title of at least '.Topic::TITLE_MIN.' characters.'],
            $length > Topic::TITLE_MAX => ['title' => 'Keep the title under '.Topic::TITLE_MAX.' characters (it has '.$length.').'],
            default => [],
        };
    }

    /** @return array<string, string> */
    private function bodyErrors(string $body): array
    {
        $length = PlainText::length($body);

        return match (true) {
            $length < Post::BODY_MIN => ['body' => 'Write a little more first.'],
            $length > Post::BODY_MAX => ['body' => 'Keep it under '.number_format(Post::BODY_MAX).' characters (it has '.number_format($length).').'],
            default => [],
        };
    }

    private function csrfOk(Request $request, string $id): bool
    {
        return $this->isCsrfTokenValid($id, (string) $request->request->get('_token'));
    }

    /** A page saying the form expired when its CSRF token is wrong, else null. */
    private function expired(Request $request, string $id): ?Response
    {
        return $this->csrfOk($request, $id) ? null : $this->render('community/expired.html.twig', [], new Response(status: Response::HTTP_FORBIDDEN));
    }

    private function account(): Account
    {
        $user = $this->getUser();

        return $user instanceof Account ? $user : throw new AccessDeniedHttpException();
    }

    private function isModerator(): bool
    {
        return $this->isGranted('ROLE_MODERATOR');
    }
}
