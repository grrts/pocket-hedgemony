<?php

namespace App\Service;

use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * The game's wiki, read from wiki/. Those files are written from docs/wiki/*.md by
 * tools/wiki-export.ts in the repo root, so the website shows the same wiki as the repository.
 */
final class Wiki
{
    /** @var array{nav: list<array{title: string, pages: list<string>}>, pages: array<string, array{title: string, summary: string, headings: list<array{id: string, text: string, level: int}>}>}|null */
    private ?array $index = null;

    public function __construct(#[Autowire('%kernel.project_dir%/wiki')] private readonly string $dir)
    {
    }

    /** @return list<array{title: string, pages: list<string>}> */
    public function nav(): array
    {
        return $this->index()['nav'];
    }

    /** @return array{title: string, summary: string, headings: list<array{id: string, text: string, level: int}>}|null */
    public function page(string $slug): ?array
    {
        return $this->index()['pages'][$slug] ?? null;
    }

    public function html(string $slug): string
    {
        return (string) file_get_contents($this->dir.'/pages/'.$slug.'.html');
    }

    /** The page's real name for a slug typed in another case (/wiki/provinces), or null. */
    public function canonical(string $slug): ?string
    {
        foreach (array_keys($this->index()['pages']) as $name) {
            if (0 === strcasecmp($name, $slug)) {
                return $name;
            }
        }

        return null;
    }

    /**
     * Pages that hold every word of the query, best first: a hit in the title counts most,
     * then in a heading, then how often the words appear. Each hit has a snippet around the
     * first match.
     *
     * @return list<array{slug: string, title: string, snippet: string}>
     */
    public function search(string $query): array
    {
        $words = array_values(array_filter(preg_split('/\s+/u', mb_strtolower(trim($query))) ?: [], fn ($w) => mb_strlen($w) >= 2));
        if (!$words) {
            return [];
        }
        $texts = json_decode((string) file_get_contents($this->dir.'/search.json'), true, 512, \JSON_THROW_ON_ERROR);
        $hits = [];
        foreach ($texts as $slug => $text) {
            $page = $this->page($slug);
            $title = mb_strtolower($page['title']);
            $headings = mb_strtolower(implode(' ', array_column($page['headings'], 'text')));
            $body = mb_strtolower($text);
            $score = 0;
            foreach ($words as $word) {
                $n = mb_substr_count($body, $word) + mb_substr_count($title, $word);
                if (!$n) {
                    continue 2;
                }
                $score += min($n, 20) + (str_contains($title, $word) ? 100 : 0) + (str_contains($headings, $word) ? 20 : 0);
            }
            $hits[] = ['slug' => $slug, 'title' => $page['title'], 'snippet' => $this->snippet($text, $words[0]), 'score' => $score];
        }
        usort($hits, fn ($a, $b) => $b['score'] <=> $a['score']);

        return array_map(fn ($h) => ['slug' => $h['slug'], 'title' => $h['title'], 'snippet' => $h['snippet']], $hits);
    }

    private function snippet(string $text, string $word): string
    {
        $at = mb_stripos($text, $word);
        $from = max(0, (int) $at - 80);
        $snippet = mb_substr($text, $from, 220);

        return ($from > 0 ? '…' : '').trim($snippet).(mb_strlen($text) > $from + 220 ? '…' : '');
    }

    /** @return array{nav: list<array{title: string, pages: list<string>}>, pages: array<string, array{title: string, summary: string, headings: list<array{id: string, text: string, level: int}>}>} */
    private function index(): array
    {
        return $this->index ??= json_decode((string) file_get_contents($this->dir.'/index.json'), true, 512, \JSON_THROW_ON_ERROR);
    }
}
