<?php

namespace App\Purchases\Apple;

use App\Entity\Entitlement;
use App\Purchases\PurchaseRefused;
use App\Purchases\StorePurchase;
use App\Purchases\StoreUnavailable;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * App Store purchases (SAVE-174, SAVE-176): the StoreKit 2 signed transaction the game sends, and the
 * App Store Server Notifications V2 Apple posts. Every JWS is checked with AppleJws against the Apple root
 * this server is given (`APPLE_ROOT_CERTIFICATE`), then for our bundle id, product and environment.
 * Without a bundle id or a root certificate, App Store purchases are not available (SAVE-178).
 */
final class AppStore
{
    public const PRODUCTION = 'Production';
    public const SANDBOX = 'Sandbox';

    private ?AppleJws $jws = null;

    public function __construct(
        #[Autowire('%env(APPLE_BUNDLE_ID)%')] private readonly string $bundleId,
        #[Autowire('%env(APPLE_ROOT_CERTIFICATE)%')] private readonly string $rootCertificate,
        #[Autowire('%env(APPLE_PRODUCT_ID)%')] private readonly string $productId,
        #[Autowire('%env(bool:APPLE_ACCEPT_SANDBOX)%')] private readonly bool $acceptSandbox,
        #[Autowire('%env(APPLE_APP_APPLE_ID)%')] private readonly string $appAppleId,
        #[Autowire('%kernel.project_dir%')] private readonly string $projectDir,
    ) {
    }

    /** @throws StoreUnavailable when the bundle id or the root certificate is not set or not readable */
    public function assertAvailable(): void
    {
        $this->verifier();
    }

    /**
     * A signed transaction for the full game, checked (SAVE-174).
     *
     * @throws PurchaseRefused
     */
    public function transaction(string $signedTransaction): StorePurchase
    {
        $tx = $this->verifiedTransaction($signedTransaction);
        if ($this->productId !== ($tx['productId'] ?? null)) {
            throw new PurchaseRefused('wrong_product', 'The transaction is not for the full game.');
        }

        return $this->purchase($tx);
    }

    /**
     * A notification's type and subtype, and the full game's purchase it is about, if it is about one (SAVE-176).
     *
     * @return array{type: string, subtype: ?string, purchase: ?StorePurchase}
     *
     * @throws PurchaseRefused
     */
    public function notification(string $signedPayload): array
    {
        $payload = $this->verifier()->verify($signedPayload);
        $data = \is_array($payload['data'] ?? null) ? $payload['data'] : [];
        // A test notification also names the app; one for another app is refused like a forged one.
        if ($this->bundleId !== ($data['bundleId'] ?? null)) {
            throw new PurchaseRefused('wrong_app', 'The notification is for another app.');
        }
        if ('' !== $this->appAppleId && isset($data['appAppleId']) && (string) $data['appAppleId'] !== $this->appAppleId) {
            throw new PurchaseRefused('wrong_app', 'The notification is for another app.');
        }
        $this->checkEnvironment($data['environment'] ?? null);
        $purchase = null;
        if (\is_string($data['signedTransactionInfo'] ?? null)) {
            $tx = $this->verifiedTransaction($data['signedTransactionInfo']);
            if ($this->productId === ($tx['productId'] ?? null)) {
                $purchase = $this->purchase($tx);
            }
        }

        return ['type' => (string) ($payload['notificationType'] ?? ''), 'subtype' => isset($payload['subtype']) ? (string) $payload['subtype'] : null, 'purchase' => $purchase];
    }

    /** @return array<string, mixed> */
    private function verifiedTransaction(string $jws): array
    {
        $tx = $this->verifier()->verify($jws);
        if ($this->bundleId !== ($tx['bundleId'] ?? null)) {
            throw new PurchaseRefused('wrong_app', 'The transaction is for another app.');
        }
        $this->checkEnvironment($tx['environment'] ?? null);
        if (!\is_string($tx['originalTransactionId'] ?? null) || '' === $tx['originalTransactionId']) {
            throw new PurchaseRefused('bad_signature', 'The transaction has no original transaction id.');
        }

        return $tx;
    }

    private function checkEnvironment(mixed $environment): void
    {
        if (self::PRODUCTION === $environment || (self::SANDBOX === $environment && $this->acceptSandbox)) {
            return;
        }
        throw new PurchaseRefused('sandbox', 'This server does not accept test purchases.');
    }

    /** @param array<string, mixed> $tx */
    private function purchase(array $tx): StorePurchase
    {
        $tag = \is_string($tx['appAccountToken'] ?? null) && '' !== $tx['appAccountToken'] ? strtolower($tx['appAccountToken']) : null;

        return new StorePurchase(
            Entitlement::APPLE,
            $this->productId,
            $tx['originalTransactionId'],
            isset($tx['revocationDate']) ? Entitlement::REVOKED : Entitlement::ACTIVE,
            $tag,
            null,
            (string) $tx['environment'],
        );
    }

    private function verifier(): AppleJws
    {
        if (null !== $this->jws) {
            return $this->jws;
        }
        StoreUnavailable::unlessSet(Entitlement::APPLE, $this->bundleId, $this->rootCertificate, $this->productId);
        $path = str_starts_with($this->rootCertificate, '/') ? $this->rootCertificate : $this->projectDir.'/'.$this->rootCertificate;
        $bytes = is_file($path) ? file_get_contents($path) : false;
        if (false === $bytes || '' === $bytes) {
            throw new StoreUnavailable(Entitlement::APPLE);
        }

        return $this->jws = new AppleJws(AppleJws::readCertificate($bytes));
    }
}
