<?php

namespace App\Controller;

use App\Community\Boards;
use App\Community\PlainText;
use App\Entity\Account;
use App\Entity\Post;
use App\Entity\SharedSave;
use App\Entity\Topic;
use App\Repository\SharedSaveRepository;
use App\Saves\InvalidSave;
use App\Saves\SaveFile;
use App\Saves\SaveObjects;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Clock\ClockInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\RateLimiter\RateLimiterFactoryInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Saves shared with the community (domain/saves/spec.md SAVE-124 … SAVE-131): the game posts
 * one save, the server checks it, drops its device name, keeps the bytes under
 * `shared/<code>.phsave` and opens the topic (or the reply) as the player. Anyone may read a
 * shared save's card and fetch its file; only the player who shared it removes it.
 */
final class SharedSavesController
{
    use JsonInput;

    public const NOT_FOUND = 'There is no shared save with this code.';
    private const PURPOSES = ['show', 'help', 'broke', 'reply'];
    private const THUMBNAIL_MAX = 65536;

    /** @param array<string, string> $boardOf what each purpose posts to (SAVE-125) */
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly SharedSaveRepository $shared,
        private readonly SaveObjects $objects,
        private readonly Boards $boards,
        private readonly ClockInterface $clock,
        private readonly UrlGeneratorInterface $urls,
        private readonly RateLimiterFactoryInterface $communityTopicLimiter,
        private readonly RateLimiterFactoryInterface $communityPostLimiter,
        #[Autowire('%cloud.max_save_mb%')] private readonly int $maxSaveMb,
        #[Autowire('%cloud.shared_max_per_account%')] private readonly int $maxShared,
        #[Autowire('%cloud.shared_boards%')] private readonly array $boardOf,
    ) {
    }

    /** Shares one save: the file (base64), a title, an optional note and what it is for (SAVE-125, SAVE-130). */
    #[Route('/api/shared-saves', name: 'shared_saves_create', methods: ['POST'])]
    #[IsGranted('ROLE_PLAYER')]
    public function create(#[CurrentUser] Account $account, Request $request): JsonResponse
    {
        $data = $this->decode($request);
        $purpose = $data['purpose'] ?? null;
        if (!\in_array($purpose, self::PURPOSES, true) || !\is_string($data['file'] ?? null) || !\is_string($data['title'] ?? null) || !\is_string($data['note'] ?? '') || !\is_string($data['realm'] ?? '')) {
            return self::error('invalid_input', 'Send the file, a title, a note and what it is for (show, help, broke or reply).', Response::HTTP_UNPROCESSABLE_ENTITY);
        }
        $title = PlainText::clean($data['title'], singleLine: true);
        $note = PlainText::clean($data['note'] ?? '');
        if (PlainText::length($title) < Topic::TITLE_MIN || PlainText::length($title) > Topic::TITLE_MAX) {
            return self::error('invalid_input', 'Give it a title of '.Topic::TITLE_MIN.' to '.Topic::TITLE_MAX.' characters.', Response::HTTP_UNPROCESSABLE_ENTITY);
        }
        if (PlainText::length($note) > Post::BODY_MAX) {
            return self::error('invalid_input', 'Keep the note under '.number_format(Post::BODY_MAX).' characters.', Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $bytes = base64_decode($data['file'], true);
        if (false === $bytes) {
            return self::error('invalid_input', 'The file must be sent as base64.', Response::HTTP_UNPROCESSABLE_ENTITY);
        }
        if (\strlen($bytes) > $this->maxSaveMb * 1024 * 1024) {
            return self::error('too_big', "A save may be at most {$this->maxSaveMb} MB.", Response::HTTP_REQUEST_ENTITY_TOO_LARGE);
        }
        // The same checks as any upload (SAVE-068).
        try {
            $file = SaveFile::parse($bytes);
            $row = $file->row();
        } catch (InvalidSave $e) {
            return self::error($e->problem, $e->getMessage(), Response::HTTP_UNPROCESSABLE_ENTITY);
        }
        if ($this->shared->countOf($account) >= $this->maxShared) {
            return self::error('too_many_shared', "You can keep {$this->maxShared} shared saves. Remove one to share another.", Response::HTTP_CONFLICT);
        }

        // Where it goes: a reply in the original's topic, or a new topic on the purpose's board.
        $topic = null;
        if ('reply' === $purpose) {
            $from = $file->header['sharedFrom']['code'] ?? null;
            $original = \is_string($from) ? $this->shared->findByCode($from) : null;
            $topic = $original?->getTopic();
            if (null === $topic || $topic->isHidden() || !$this->boards->get($topic->getBoard())) {
                return self::error('no_topic', 'The topic this campaign came from is gone. Share it as a new topic.', Response::HTTP_NOT_FOUND);
            }
            if ($topic->isLocked() && !$account->isModerator()) {
                return self::error('topic_locked', 'This topic is locked: nobody can reply to it.', Response::HTTP_FORBIDDEN);
            }
        }
        $limiter = null === $topic ? $this->communityTopicLimiter : $this->communityPostLimiter;
        if (!$limiter->create($account->getId()->toRfc4122())->consume()->isAccepted()) {
            return self::error('rate_limited', 'You have shared a lot in the last while. Try again later.', Response::HTTP_TOO_MANY_REQUESTS);
        }

        $body = '' !== $note ? $note : 'Shared from the game: '.$title.'.';
        if (PlainText::length($body) < Post::BODY_MIN) {
            $body = 'Shared from the game: '.$title.'.';
        }
        if (null === $topic) {
            $topic = new Topic($this->boardOf[$purpose], $title, $account);
            $this->em->persist($topic);
        }
        $post = new Post($topic, $account, $body);
        $topic->touch($post);
        $this->em->persist($post);

        // The public copy carries no device name (INV-SAVE-17).
        $header = $file->header;
        $header['device'] = '';
        $public = SaveFile::withHeader($bytes, $header);
        $code = $this->freeCode();
        $thumbnail = \is_string($header['thumbnail'] ?? null) && \strlen($header['thumbnail']) <= self::THUMBNAIL_MAX && 1 === preg_match('~^[A-Za-z0-9+/=]*$~', $header['thumbnail']) ? $header['thumbnail'] : '';
        $save = new SharedSave($code, $account, $post, $title, [
            'name' => $row['name'],
            'nation' => $row['nation'],
            'realm' => mb_substr(PlainText::clean($data['realm'] ?? '', singleLine: true), 0, 60) ?: $row['nation'],
            'year' => $row['year'],
            'month' => $row['month'],
            'turn' => $row['turn'],
            'playSeconds' => \is_int($header['playSeconds'] ?? null) ? max(0, $header['playSeconds']) : 0,
            'gameVersion' => $row['gameVersion'],
            'ironman' => $row['ironman'],
            'modified' => true === ($header['modified'] ?? false),
            'thumbnail' => $thumbnail,
        ], \strlen($public), $this->clock->now());
        $this->objects->put($save->key(), $public);
        $this->em->persist($save);
        $this->em->flush();

        return new JsonResponse([
            'code' => $code,
            'shownCode' => $save->getShownCode(),
            'link' => $this->urls->generate('shared_save_page', ['code' => $code], UrlGeneratorInterface::ABSOLUTE_URL),
            'topicUrl' => $this->urls->generate('community_topic', ['id' => $topic->getId(), 'slug' => $topic->getSlug()], UrlGeneratorInterface::ABSOLUTE_URL).'#p'.$post->getId(),
            'save' => $save->toArray(),
        ], Response::HTTP_CREATED);
    }

    /** The saves the player shared, with how often each was played (SAVE-135). */
    #[Route('/api/shared-saves', name: 'shared_saves_mine', methods: ['GET'])]
    #[IsGranted('ROLE_PLAYER')]
    public function mine(#[CurrentUser] Account $account): JsonResponse
    {
        return new JsonResponse([
            'shared' => array_map(fn (SharedSave $s) => $s->toArray() + [
                'topicUrl' => $this->urls->generate('community_topic', ['id' => $s->getTopic()->getId(), 'slug' => $s->getTopic()->getSlug()], UrlGeneratorInterface::ABSOLUTE_URL).'#p'.$s->getPost()->getId(),
            ], $this->shared->ofAccount($account)),
            'max' => $this->maxShared,
        ]);
    }

    /** One shared save's card (SAVE-127). */
    #[Route('/api/shared-saves/{code}', name: 'shared_saves_card', requirements: ['code' => '[A-Za-z0-9-]{8,9}'], methods: ['GET'])]
    public function card(string $code): JsonResponse
    {
        $save = $this->shared->findByCode($code);
        if (null === $save || !$save->isPlayable()) {
            return self::error('no_shared_save', self::NOT_FOUND, Response::HTTP_NOT_FOUND);
        }

        return new JsonResponse(['save' => $save->toArray()]);
    }

    /** The file, for the game's Play this save; each fetch counts a play (SAVE-127). */
    #[Route('/api/shared-saves/{code}/file', name: 'shared_saves_file', requirements: ['code' => '[A-Za-z0-9-]{8,9}'], methods: ['GET'])]
    public function file(string $code): Response
    {
        $save = $this->shared->findByCode($code);
        $bytes = null !== $save && $save->isPlayable() ? $this->objects->get($save->key()) : null;
        if (null === $bytes) {
            return self::error('no_shared_save', self::NOT_FOUND, Response::HTTP_NOT_FOUND);
        }
        $save->played();
        $this->em->flush();

        return self::download($save, $bytes);
    }

    /** Removes a shared save; only the player who shared it may (SAVE-131). */
    #[Route('/api/shared-saves/{code}', name: 'shared_saves_remove', requirements: ['code' => '[A-Za-z0-9-]{8,9}'], methods: ['DELETE'])]
    #[IsGranted('ROLE_PLAYER')]
    public function remove(#[CurrentUser] Account $account, string $code): Response
    {
        $save = $this->shared->findByCode($code);
        if (null === $save || $save->isRemoved() || !$save->getAccount()->getId()->equals($account->getId())) {
            return self::error('no_shared_save', self::NOT_FOUND, Response::HTTP_NOT_FOUND);
        }
        self::removeSave($save, $this->objects, $this->clock->now());
        $this->em->flush();

        return new Response(status: Response::HTTP_NO_CONTENT);
    }

    public static function removeSave(SharedSave $save, SaveObjects $objects, \DateTimeImmutable $now): void
    {
        $save->remove($now);
        $objects->delete($save->key());
    }

    public static function download(SharedSave $save, string $bytes): Response
    {
        $name = trim(preg_replace('/[^A-Za-z0-9]+/', '-', $save->getTitle()) ?? '', '-') ?: 'shared-save';

        return new Response($bytes, Response::HTTP_OK, [
            'Content-Type' => 'application/octet-stream',
            'Content-Disposition' => 'attachment; filename="'.$name.'-'.$save->getCode().'.phsave"',
            'Cache-Control' => 'no-store',
        ]);
    }

    private function freeCode(): string
    {
        do {
            $code = SharedSave::newCode();
        } while (null !== $this->shared->findOneBy(['code' => $code]));

        return $code;
    }

    private static function error(string $code, string $message, int $status): JsonResponse
    {
        return new JsonResponse(['error' => $code, 'message' => $message], $status);
    }
}
