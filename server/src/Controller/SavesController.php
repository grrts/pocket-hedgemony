<?php

namespace App\Controller;

use App\Entity\Account;
use App\Entity\CloudSave;
use App\Entity\Device;
use App\Entity\IronmanHead;
use App\Entity\SaveChange;
use App\Repository\CloudSaveRepository;
use App\Repository\IronmanHeadRepository;
use App\Repository\SaveChangeRepository;
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
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Cloud saves (domain/saves/spec.md SAVE-061 … SAVE-070): the six calls of SAVE-063, as
 * packages/engine/src/domain/saves/cloud.ts models them. The server stores bytes as given and
 * never drops a save on its own.
 */
#[IsGranted('ROLE_PLAYER')]
final class SavesController
{
    use JsonInput;

    private const ID = '[A-Za-z0-9_-]{1,64}';
    private const CHANGES_PER_PAGE = 500;

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly CloudSaveRepository $saves,
        private readonly SaveChangeRepository $changes,
        private readonly IronmanHeadRepository $heads,
        private readonly SaveObjects $objects,
        private readonly ClockInterface $clock,
        private readonly RateLimiterFactoryInterface $apiSavesLimiter,
        #[Autowire('%cloud.max_save_mb%')] private readonly int $maxSaveMb,
        #[Autowire('%cloud.quota_saves%')] private readonly int $quotaSaves,
        #[Autowire('%cloud.quota_mb%')] private readonly int $quotaMb,
    ) {
    }

    /** Headers and tombstones changed since the cursor, and the new cursor (SAVE-064). */
    #[Route('/api/saves', name: 'saves_changes', methods: ['GET'])]
    public function changes(#[CurrentUser] Account $account, Request $request): JsonResponse
    {
        $cursor = max(0, $request->query->getInt('since'));
        // A device that came over from a combined account starts the change log over (SAVE-192).
        $device = $request->attributes->get('_device');
        $reset = $device instanceof Device && $device->takeMoved();
        if ($reset) {
            $cursor = 0;
            $this->em->flush();
        }
        $page = $this->changes->since($account, $cursor, self::CHANGES_PER_PAGE);
        $saves = $tombstones = [];
        foreach ($page as $change) {
            $save = $change->getSave();
            $cursor = $change->getId();
            unset($saves[$save->getSaveId()], $tombstones[$save->getSaveId()]);
            if ($save->isDeleted()) {
                $tombstones[$save->getSaveId()] = ['saveId' => $save->getSaveId(), 'deletedAt' => $save->getDeletedAt()->format(\DATE_ATOM)];
            } else {
                $saves[$save->getSaveId()] = $save->toArray();
            }
        }

        return new JsonResponse([
            'saves' => array_values($saves),
            'tombstones' => array_values($tombstones),
            'cursor' => $cursor,
            'more' => \count($page) === self::CHANGES_PER_PAGE,
            'usage' => $this->usageJson($account),
        ] + ($reset ? ['reset' => true] : []));
    }

    /** Uploads one save; write-once, checked, within the quota (SAVE-063, SAVE-068, SAVE-069). */
    #[Route('/api/saves/{saveId}', name: 'saves_put', requirements: ['saveId' => self::ID], methods: ['PUT'])]
    public function put(#[CurrentUser] Account $account, Request $request, string $saveId): JsonResponse
    {
        if ($limited = $this->limited($account, $request)) {
            return $limited;
        }
        $bytes = $request->getContent();
        if (\strlen($bytes) > $this->maxSaveMb * 1024 * 1024) {
            return self::error('too_big', "A save may be at most {$this->maxSaveMb} MB.", Response::HTTP_REQUEST_ENTITY_TOO_LARGE);
        }
        try {
            $file = SaveFile::parse($bytes);
            $row = $file->row();
        } catch (InvalidSave $e) {
            return self::error($e->problem, $e->getMessage(), Response::HTTP_UNPROCESSABLE_ENTITY);
        }
        if ($row['saveId'] !== $saveId) {
            return self::error('header_differs', 'The save id in the address is not the one in the header.', Response::HTTP_UNPROCESSABLE_ENTITY);
        }
        $sha = hash('sha256', $bytes);

        $existing = $this->saves->findOneBy(['account' => $account, 'saveId' => $saveId]);
        if (null !== $existing) {
            return $existing->getSha256() === $sha && !$existing->isDeleted()
                ? new JsonResponse(['save' => $existing->toArray(), 'usage' => $this->usageJson($account)])
                : self::error('save_id_exists', 'A different save already has this id.', Response::HTTP_CONFLICT);
        }

        $usage = $this->saves->usage($account);
        if ($usage['saves'] + 1 > $this->quotaSaves || $usage['bytes'] + $file->size > $this->quotaMb * 1024 * 1024) {
            return new JsonResponse(['error' => 'quota_full', 'message' => 'Your cloud storage is full. Delete old saves to make room.', 'usage' => $this->usageJson($account)], Response::HTTP_INSUFFICIENT_STORAGE);
        }

        if ('ironman' === $row['kind']) {
            $head = $this->heads->findOneBy(['account' => $account, 'campaignId' => $row['campaignId']]);
            if (null !== $head && $head->getSaveId() !== $row['parent']) {
                return new JsonResponse(['error' => 'not_the_newest', 'message' => 'This ironman campaign has a newer save. Load it first.', 'head' => $head->getSaveId()], Response::HTTP_CONFLICT);
            }
            $head ? $head->moveTo($saveId) : $this->em->persist(new IronmanHead($account, $row['campaignId'], $saveId));
        }

        $save = new CloudSave($account, $row, $file->size, $sha, $this->clock->now());
        $this->objects->put($save->key(), $bytes);
        $this->em->persist($save);
        $this->em->persist(new SaveChange($account, $save));
        $this->em->flush();

        return new JsonResponse(['save' => $save->toArray(), 'usage' => $this->usageJson($account)], Response::HTTP_CREATED);
    }

    /** The bytes of one save, fetched when it is opened (SAVE-064). */
    #[Route('/api/saves/{saveId}', name: 'saves_get', requirements: ['saveId' => self::ID], methods: ['GET'])]
    public function get(#[CurrentUser] Account $account, string $saveId): Response
    {
        $save = $this->saves->findOneBy(['account' => $account, 'saveId' => $saveId]);
        $bytes = null === $save || $save->isDeleted() ? null : $this->objects->get($save->key());
        if (null === $bytes) {
            return self::error('not_found', 'There is no such save.', Response::HTTP_NOT_FOUND);
        }

        return new Response($bytes, Response::HTTP_OK, [
            'Content-Type' => 'application/octet-stream',
            'Content-Disposition' => 'attachment; filename="'.$saveId.'.phsave"',
            'Cache-Control' => 'private, no-store',
        ]);
    }

    /** Removes one save, leaving a tombstone for the other devices (SAVE-062). */
    #[Route('/api/saves/{saveId}', name: 'saves_delete', requirements: ['saveId' => self::ID], methods: ['DELETE'])]
    public function delete(#[CurrentUser] Account $account, string $saveId): Response
    {
        $save = $this->saves->findOneBy(['account' => $account, 'saveId' => $saveId]);
        if (null === $save) {
            return self::error('not_found', 'There is no such save.', Response::HTTP_NOT_FOUND);
        }
        $this->tombstone($account, $save);
        $this->em->flush();

        return new Response(status: Response::HTTP_NO_CONTENT);
    }

    /** Removes every save of a campaign (SAVE-056, INV-SAVE-4). */
    #[Route('/api/campaigns/{campaignId}', name: 'campaign_delete', requirements: ['campaignId' => self::ID], methods: ['DELETE'])]
    public function deleteCampaign(#[CurrentUser] Account $account, string $campaignId): JsonResponse
    {
        $removed = 0;
        foreach ($this->saves->findBy(['account' => $account, 'campaignId' => $campaignId]) as $save) {
            $removed += $this->tombstone($account, $save) ? 1 : 0;
        }
        $head = $this->heads->findOneBy(['account' => $account, 'campaignId' => $campaignId]);
        if (null !== $head) {
            $this->em->remove($head);
        }
        $this->em->flush();

        return new JsonResponse(['removed' => $removed]);
    }

    /** Claims the ironman line for a save if its parent is still the head (SAVE-063, INV-SAVE-15). */
    #[Route('/api/campaigns/{campaignId}/ironman-head', name: 'campaign_ironman_head', requirements: ['campaignId' => self::ID], methods: ['POST'])]
    public function claimHead(#[CurrentUser] Account $account, Request $request, string $campaignId): JsonResponse
    {
        $data = $this->decode($request);
        $saveId = $data['saveId'] ?? null;
        $parent = $data['parent'] ?? null;
        if (!\is_string($saveId) || 1 !== preg_match('/^'.self::ID.'$/', $saveId) || (null !== $parent && !\is_string($parent))) {
            return self::error('invalid_input', 'Send saveId and, after the first, parent.', Response::HTTP_UNPROCESSABLE_ENTITY);
        }
        $head = $this->heads->findOneBy(['account' => $account, 'campaignId' => $campaignId]);
        if (null !== $head && $head->getSaveId() !== $parent && $head->getSaveId() !== $saveId) {
            return new JsonResponse(['error' => 'not_the_newest', 'message' => 'This ironman campaign has a newer save. Load it first.', 'head' => $head->getSaveId()], Response::HTTP_CONFLICT);
        }
        $head ? $head->moveTo($saveId) : $this->em->persist(new IronmanHead($account, $campaignId, $saveId));
        $this->em->flush();

        return new JsonResponse(['head' => $saveId]);
    }

    private function tombstone(Account $account, CloudSave $save): bool
    {
        if ($save->isDeleted()) {
            return false;
        }
        $save->delete($this->clock->now());
        $this->em->persist(new SaveChange($account, $save));

        return true;
    }

    /** Uploads per account and per device (SAVE-070). */
    private function limited(Account $account, Request $request): ?JsonResponse
    {
        $device = $request->attributes->get('_device');
        $keys = ['account:'.$account->getId()->toRfc4122()];
        if ($device instanceof Device) {
            $keys[] = 'device:'.$device->getId()->toRfc4122();
        }
        foreach ($keys as $key) {
            if (!$this->apiSavesLimiter->create($key)->consume()->isAccepted()) {
                return self::error('rate_limited', 'Too many uploads. The game will try again shortly.', Response::HTTP_TOO_MANY_REQUESTS);
            }
        }

        return null;
    }

    private function usageJson(Account $account): array
    {
        $usage = $this->saves->usage($account);

        return $usage + ['quotaSaves' => $this->quotaSaves, 'quotaBytes' => $this->quotaMb * 1024 * 1024];
    }

    private static function error(string $code, string $message, int $status): JsonResponse
    {
        return new JsonResponse(['error' => $code, 'message' => $message], $status);
    }
}
