<?php

namespace App\Account;

use App\Entity\Account;
use App\Entity\Device;
use App\Repository\DeviceRepository;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Clock\ClockInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * The game's tokens (SAVE-114 … SAVE-116): every way of signing in ends in the same pair, a
 * short-lived access token and a device token that lasts until the device is signed out. Only
 * their SHA-256 hashes are stored.
 */
final class Tokens
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly DeviceRepository $devices,
        private readonly ClockInterface $clock,
        #[Autowire('%cloud.access_token_minutes%')] private readonly int $accessMinutes,
    ) {
    }

    public static function hash(string $token): string
    {
        return hash('sha256', $token);
    }

    /** Signs a new device in and returns its tokens. */
    public function issue(Account $account, string $deviceName, string $platform): IssuedTokens
    {
        $device = new Device($account, $deviceName, $platform, $this->clock->now());
        $this->em->persist($device);

        return $this->turnOver($device);
    }

    /** Swaps a device token for a new pair; the old one is refused from then on (SAVE-115). */
    public function refresh(string $deviceToken): ?IssuedTokens
    {
        $device = $this->devices->findOneBy(['deviceTokenHash' => self::hash($deviceToken)]);
        if (null === $device || $device->isSignedOut()) {
            return null;
        }

        return $this->turnOver($device);
    }

    /** The device an access token belongs to, while it is valid and the device signed in. */
    public function deviceFor(string $accessToken): ?Device
    {
        $device = $this->devices->findOneBy(['accessTokenHash' => self::hash($accessToken)]);
        $now = $this->clock->now();
        if (null === $device || $device->isSignedOut() || $device->accessExpiresAt() <= $now) {
            return null;
        }

        return $device;
    }

    public function signOut(Device $device): void
    {
        $device->signOut($this->clock->now());
        $this->em->flush();
    }

    private function turnOver(Device $device): IssuedTokens
    {
        $now = $this->clock->now();
        $deviceToken = 'phd_'.bin2hex(random_bytes(32));
        $accessToken = 'pha_'.bin2hex(random_bytes(32));
        $device->rotate(self::hash($deviceToken), self::hash($accessToken), $now->modify("+{$this->accessMinutes} minutes"), $now);
        $this->em->flush();

        return new IssuedTokens($device, $accessToken, $this->accessMinutes * 60, $deviceToken);
    }
}
