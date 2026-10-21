<?php

namespace App\Controller;

use App\Entity\MetricEvent;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Validator\Validator\ValidatorInterface;

/**
 * Receives batches of client events. The client queues events while offline
 * and sends them in batches, so one request carries up to 100 events.
 */
final class MetricsController
{
    use JsonInput;

    public const RUNTIMES = ['web', 'electron', 'capacitor-ios', 'capacitor-android'];

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly ValidatorInterface $validator,
    ) {
    }

    #[Route('/api/metrics', name: 'metrics_ingest', methods: ['POST'])]
    public function ingest(Request $request): JsonResponse
    {
        $data = $this->decode($request);
        $errors = $this->validate($this->validator, $data, new Assert\Collection(
            fields: [
                'installId' => [new Assert\NotBlank(), new Assert\Length(max: 64)],
                'runtime' => [new Assert\Choice(choices: self::RUNTIMES)],
                'accountId' => new Assert\Optional([new Assert\Uuid()]),
                'events' => [
                    new Assert\Type('array'),
                    new Assert\Count(min: 1, max: 100),
                    new Assert\All([new Assert\Collection(
                        fields: [
                            'name' => [new Assert\Regex('/^[a-z0-9_]{1,64}$/')],
                            'occurredAt' => [new Assert\DateTime(format: \DateTimeInterface::ATOM)],
                            'properties' => new Assert\Optional([new Assert\Type('array')]),
                        ],
                    )]),
                ],
            ],
        ));
        if ($errors) {
            return $errors;
        }

        $accountId = isset($data['accountId']) ? Uuid::fromString($data['accountId']) : null;
        foreach ($data['events'] as $e) {
            $this->em->persist(new MetricEvent(
                $data['installId'],
                $e['name'],
                $e['properties'] ?? [],
                $data['runtime'],
                new \DateTimeImmutable($e['occurredAt']),
                $accountId,
            ));
        }
        $this->em->flush();

        return new JsonResponse(['accepted' => \count($data['events'])], Response::HTTP_ACCEPTED);
    }
}
