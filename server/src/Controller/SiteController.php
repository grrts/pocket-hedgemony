<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * The website around the wiki: the landing page, the press kit and the privacy policy.
 * Server-rendered Twig, no JavaScript. The Play button and the store buttons come from
 * env vars (Twig globals, see config/packages/twig.yaml) and are hidden while empty.
 */
#[Route(format: 'html')]
final class SiteController extends AbstractController
{
    /** The game screenshots in public/site/shots/, in page order, made by `pnpm --filter @ph/client site-shots`. */
    public const SHOTS = [
        'desktop' => 'The Balkans and Anatolia in autumn 1378, on a desktop screen',
        'map-far' => 'The map zoomed out: the realms around the Ottoman Beylik, with uncharted lands under parchment',
        'map-close' => 'Close in on Edirne: towns, fields, woods, rivers and armies',
        'province' => 'The province card for Edirne',
        'realm' => 'The realm card for the Ottoman Beylik',
        'diplomacy' => 'The diplomacy map mode: friends, rivals and wars',
        'battle' => 'A battle against Karaman, followed on the map',
        'event' => 'A historical event with choices, playing France in autumn 1378',
    ];

    public function __construct(
        #[Autowire('%kernel.project_dir%/public')] private readonly string $public,
    ) {
    }

    #[Route('/', name: 'home', methods: ['GET'])]
    public function home(): Response
    {
        return $this->render('site/home.html.twig', ['shots' => $this->shots()])->setPublic()->setMaxAge(300);
    }

    #[Route('/press', name: 'press', methods: ['GET'])]
    public function press(): Response
    {
        $art = [
            $this->download('/site/shots/logo.png', 'The name in the game\'s title lettering (transparent)'),
            $this->download('/site/shots/crown.png', 'The crown icon, enlarged (transparent)'),
        ];

        return $this->render('site/press.html.twig', [
            'shots' => array_values($this->shots()),
            'art' => array_values(array_filter($art)),
        ])->setPublic()->setMaxAge(3600);
    }

    #[Route('/privacy', name: 'privacy', methods: ['GET'])]
    public function privacy(): Response
    {
        return $this->render('site/privacy.html.twig')->setPublic()->setMaxAge(3600);
    }

    /** @return array<string, array{url: string, name: string, caption: string, size: int, width: int, height: int}> the screenshots that exist, by name */
    private function shots(): array
    {
        $shots = [];
        foreach (self::SHOTS as $name => $caption) {
            if ($file = $this->download("/site/shots/$name.webp", $caption)) {
                $shots[$name] = $file;
            }
        }

        return $shots;
    }

    /** @return array{url: string, name: string, caption: string, size: int, width: int, height: int}|null */
    private function download(string $url, string $caption): ?array
    {
        $path = $this->public.$url;
        if (!is_file($path)) {
            return null;
        }
        [$width, $height] = @getimagesize($path) ?: [0, 0];

        return ['url' => $url, 'name' => basename($url), 'caption' => $caption, 'size' => (int) filesize($path), 'width' => $width, 'height' => $height];
    }
}
