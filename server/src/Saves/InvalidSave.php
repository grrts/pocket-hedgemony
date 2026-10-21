<?php

namespace App\Saves;

/** Why an uploaded file was refused (SAVE-068); `problem` is the API's error code. */
final class InvalidSave extends \RuntimeException
{
    public function __construct(public readonly string $problem, string $message)
    {
        parent::__construct($message);
    }
}
