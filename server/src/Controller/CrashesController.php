<?php

namespace App\Controller;

use App\Entity\CrashReport;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Validator\Validator\ValidatorInterface;

/**
 * Receives batches of crash reports. Like metrics, the client queues them while offline;
 * unlike metrics they never carry an account, so crash reports stay anonymous.
 */
final class CrashesController
{
    use JsonInput;

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly ValidatorInterface $validator,
    ) {
    }

    #[Route('/api/crashes', name: 'crashes_ingest', methods: ['POST'])]
    public function ingest(Request $request): JsonResponse
    {
        $data = $this->decode($request);
        $optionalText = fn (int $max) => new Assert\Optional([new Assert\Type('string'), new Assert\Length(max: $max)]);
        $errors = $this->validate($this->validator, $data, new Assert\Collection(
            fields: [
                'installId' => [new Assert\NotBlank(), new Assert\Type('string'), new Assert\Length(max: 64)],
                'runtime' => [new Assert\NotNull(), new Assert\Choice(choices: MetricsController::RUNTIMES)],
                'version' => [new Assert\NotBlank(), new Assert\Type('string'), new Assert\Length(max: 32)],
                'crashes' => [
                    new Assert\Type('array'),
                    new Assert\Count(min: 1, max: 20),
                    new Assert\All([new Assert\Collection(
                        fields: [
                            'message' => [new Assert\NotNull(), new Assert\Type('string'), new Assert\Length(max: 500)],
                            'stack' => $optionalText(8000),
                            'kind' => [new Assert\NotNull(), new Assert\Choice(choices: CrashReport::KINDS)],
                            'where' => $optionalText(64),
                            'occurredAt' => [new Assert\NotNull(), new Assert\DateTime(format: \DateTimeInterface::ATOM)],
                            'browser' => $optionalText(64),
                        ],
                    )]),
                ],
            ],
        ));
        if ($errors) {
            return $errors;
        }

        $utc = new \DateTimeZone('UTC');
        foreach ($data['crashes'] as $c) {
            $this->em->persist(new CrashReport(
                $data['installId'],
                $data['runtime'],
                $data['version'],
                $c['kind'],
                $c['message'],
                $c['stack'] ?? null,
                $c['where'] ?? null,
                $c['browser'] ?? null,
                (new \DateTimeImmutable($c['occurredAt']))->setTimezone($utc),
            ));
        }
        $this->em->flush();

        return new JsonResponse(['accepted' => \count($data['crashes'])], Response::HTTP_ACCEPTED);
    }
}
