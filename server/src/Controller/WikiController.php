<?php

namespace App\Controller;

use App\Service\Wiki;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Attribute\Route;

/**
 * The wiki at /wiki: every page of docs/wiki, with the Home page's groups as the sidebar,
 * each page's sections as its contents, and a search box (see App\Service\Wiki).
 */
#[Route('/wiki', format: 'html')]
final class WikiController extends AbstractController
{
    public function __construct(private readonly Wiki $wiki)
    {
    }

    #[Route('', name: 'wiki', methods: ['GET'])]
    public function home(): Response
    {
        return $this->show('Home');
    }

    #[Route('/search', name: 'wiki_search', methods: ['GET'])]
    public function search(Request $request): Response
    {
        $q = mb_substr(trim((string) $request->query->get('q', '')), 0, 100);

        return $this->render('wiki/search.html.twig', ['q' => $q, 'hits' => $this->wiki->search($q), 'nav' => $this->nav()]);
    }

    #[Route('/{slug}', name: 'wiki_page', requirements: ['slug' => '[A-Za-z0-9][A-Za-z0-9-]*'], methods: ['GET'])]
    public function page(string $slug): Response
    {
        if ('Home' === $slug) {
            return $this->redirectToRoute('wiki', status: Response::HTTP_MOVED_PERMANENTLY);
        }
        if (!$this->wiki->page($slug)) {
            $name = $this->wiki->canonical($slug) ?? throw new NotFoundHttpException('No wiki page '.$slug);

            return $this->redirectToRoute('wiki_page', ['slug' => $name], Response::HTTP_MOVED_PERMANENTLY);
        }

        return $this->show($slug);
    }

    private function show(string $slug): Response
    {
        return $this->render('wiki/page.html.twig', [
            'slug' => $slug,
            'page' => $this->wiki->page($slug),
            'html' => $this->wiki->html($slug),
            'nav' => $this->nav(),
        ]);
    }

    /** @return list<array{title: string, pages: list<array{slug: string, title: string}>}> */
    private function nav(): array
    {
        return array_map(fn ($group) => [
            'title' => $group['title'],
            'pages' => array_map(fn ($slug) => ['slug' => $slug, 'title' => $this->wiki->page($slug)['title']], $group['pages']),
        ], $this->wiki->nav());
    }
}
