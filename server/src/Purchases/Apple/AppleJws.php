<?php

namespace App\Purchases\Apple;

use App\Purchases\PurchaseRefused;

/**
 * Checks a JWS that the App Store signed (SAVE-174): a StoreKit 2 signed transaction or the signed payload of
 * an App Store Server Notification V2. The header must name ES256 and carry an `x5c` chain of three
 * certificates, leaf, intermediate and root; each must be signed by the next, the root must be the Apple
 * root this server is given, the intermediate and the leaf must carry Apple's marker extensions, every
 * certificate must have been valid when the JWS was signed (its `signedDate`), and the signature must check
 * with the leaf's key. Only PHP's openssl extension is used.
 */
final class AppleJws
{
    /** Apple's marker on the intermediate (Apple Worldwide Developer Relations) and on the App Store signing leaf. */
    public const INTERMEDIATE_OID = '1.2.840.113635.100.6.2.1';
    public const LEAF_OID = '1.2.840.113635.100.6.11.1';

    /** @param string $rootDer the trusted root certificate (Apple Root CA - G3), DER */
    public function __construct(private readonly string $rootDer)
    {
    }

    /** Reads a root certificate file in DER (Apple's `.cer`) or PEM. */
    public static function readCertificate(string $bytes): string
    {
        if (1 === preg_match('/-----BEGIN CERTIFICATE-----(.+?)-----END CERTIFICATE-----/s', $bytes, $m)) {
            return (string) base64_decode(preg_replace('/\s+/', '', $m[1]) ?? '', true);
        }

        return $bytes;
    }

    /**
     * @return array<string, mixed> the verified payload
     *
     * @throws PurchaseRefused `bad_signature` when any check fails
     */
    public function verify(string $jws): array
    {
        $parts = explode('.', $jws);
        if (3 !== \count($parts)) {
            throw self::refused('The signed data is not a JWS.');
        }
        [$h, $p, $s] = $parts;
        $header = self::json($h);
        $payload = self::json($p);
        if ('ES256' !== ($header['alg'] ?? null)) {
            throw self::refused('The signature is not ES256.');
        }
        $x5c = $header['x5c'] ?? null;
        if (!\is_array($x5c) || 3 !== \count($x5c) || !array_is_list($x5c)) {
            throw self::refused('The certificate chain is missing.');
        }
        $der = array_map(static fn ($c) => \is_string($c) ? (string) base64_decode($c, true) : '', $x5c);
        if (\in_array('', $der, true)) {
            throw self::refused('The certificate chain is not readable.');
        }
        [$leafDer, $interDer, $rootDer] = $der;
        if (!hash_equals($this->rootDer, $rootDer)) {
            throw self::refused('The chain does not lead to Apple\'s root.');
        }
        $leaf = self::pem($leafDer);
        $inter = self::pem($interDer);
        $root = self::pem($rootDer);
        if (1 !== @openssl_x509_verify($leaf, $inter) || 1 !== @openssl_x509_verify($inter, $root)) {
            throw self::refused('A certificate in the chain is not signed by the next.');
        }
        $leafInfo = @openssl_x509_parse($leaf);
        $interInfo = @openssl_x509_parse($inter);
        $rootInfo = @openssl_x509_parse($root);
        if (!\is_array($leafInfo) || !\is_array($interInfo) || !\is_array($rootInfo)) {
            throw self::refused('A certificate in the chain is not readable.');
        }
        if (!isset($interInfo['extensions'][self::INTERMEDIATE_OID], $leafInfo['extensions'][self::LEAF_OID])) {
            throw self::refused('The chain is not Apple\'s App Store chain.');
        }
        if (!str_contains((string) ($interInfo['extensions']['basicConstraints'] ?? ''), 'CA:TRUE')) {
            throw self::refused('The intermediate certificate is not a CA.');
        }
        // Valid when it was signed, so a restore of an old purchase still checks after the leaf expires.
        $signedAt = \is_int($payload['signedDate'] ?? null) ? intdiv($payload['signedDate'], 1000) : null;
        if (null === $signedAt) {
            throw self::refused('The signed data has no signing date.');
        }
        foreach ([$leafInfo, $interInfo, $rootInfo] as $info) {
            if ($signedAt < (int) $info['validFrom_time_t'] || $signedAt > (int) $info['validTo_time_t']) {
                throw self::refused('A certificate was not valid when the data was signed.');
            }
        }
        $raw = self::base64url($s);
        $key = @openssl_pkey_get_public($leaf);
        if (64 !== \strlen($raw) || false === $key || 1 !== openssl_verify($h.'.'.$p, self::derSignature($raw), $key, \OPENSSL_ALGO_SHA256)) {
            throw self::refused('The signature does not check.');
        }

        return $payload;
    }

    /** A JWS ES256 signature (r and s, 32 bytes each) as the DER sequence openssl reads. */
    public static function derSignature(string $raw): string
    {
        $int = static function (string $n): string {
            $n = ltrim($n, "\x00");
            if ('' === $n || \ord($n[0]) > 0x7F) {
                $n = "\x00".$n;
            }

            return "\x02".\chr(\strlen($n)).$n;
        };
        $seq = $int(substr($raw, 0, 32)).$int(substr($raw, 32, 32));

        return "\x30".\chr(\strlen($seq)).$seq;
    }

    /** The other way round, for tests that sign with openssl: DER to the 64 raw bytes of a JWS. */
    public static function rawSignature(string $der): string
    {
        $offset = 2;
        $out = '';
        for ($i = 0; $i < 2; ++$i) {
            $len = \ord($der[$offset + 1]);
            $out .= str_pad(ltrim(substr($der, $offset + 2, $len), "\x00"), 32, "\x00", \STR_PAD_LEFT);
            $offset += 2 + $len;
        }

        return $out;
    }

    public static function base64url(string $text): string
    {
        return (string) base64_decode(strtr($text, '-_', '+/'), true);
    }

    private static function pem(string $der): string
    {
        return "-----BEGIN CERTIFICATE-----\n".chunk_split(base64_encode($der), 64, "\n")."-----END CERTIFICATE-----\n";
    }

    /** @return array<string, mixed> */
    private static function json(string $part): array
    {
        try {
            $data = json_decode(self::base64url($part), true, 32, \JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            throw self::refused('The signed data is not readable.');
        }
        if (!\is_array($data)) {
            throw self::refused('The signed data is not readable.');
        }

        return $data;
    }

    private static function refused(string $why): PurchaseRefused
    {
        return new PurchaseRefused('bad_signature', 'The App Store\'s signature does not check: '.lcfirst($why));
    }
}
