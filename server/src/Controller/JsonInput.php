<?php

namespace App\Controller;

use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\Validator\Constraint;
use Symfony\Component\Validator\Validator\ValidatorInterface;

trait JsonInput
{
    private function decode(Request $request): array
    {
        try {
            $data = json_decode($request->getContent(), true, 32, \JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            throw new BadRequestHttpException('Body must be JSON.');
        }
        if (!\is_array($data)) {
            throw new BadRequestHttpException('Body must be a JSON object.');
        }

        return $data;
    }

    /** Returns a 422 response listing every problem, or null when the input is valid. */
    private function validate(ValidatorInterface $validator, array $data, Constraint $constraint): ?JsonResponse
    {
        $violations = $validator->validate($data, $constraint);
        if (0 === \count($violations)) {
            return null;
        }
        $errors = [];
        foreach ($violations as $v) {
            $errors[] = ['field' => $v->getPropertyPath(), 'message' => $v->getMessage()];
        }

        return new JsonResponse(['error' => 'invalid_input', 'details' => $errors], Response::HTTP_UNPROCESSABLE_ENTITY);
    }
}
