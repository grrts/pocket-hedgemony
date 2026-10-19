<?php

namespace App\Account;

use App\Entity\Device;

/** What a sign-in or a refresh hands the device; the plain tokens exist only here. */
final class IssuedTokens
{
    public function __construct(
        public readonly Device $device,
        public readonly string $accessToken,
        public readonly int $accessExpiresIn,
        public readonly string $deviceToken,
    ) {
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'accessToken' => $this->accessToken,
            'accessTokenExpiresIn' => $this->accessExpiresIn,
            'deviceToken' => $this->deviceToken,
            'deviceId' => $this->device->getId()->toRfc4122(),
        ];
    }
}
