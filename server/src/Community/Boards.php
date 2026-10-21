<?php

namespace App\Community;

use Symfony\Component\DependencyInjection\Attribute\Autowire;

/** The community's boards, fixed in config/packages/community.yaml. */
final class Boards
{
    /** @var array<string, array{slug: string, name: string, description: string, icon: string}> */
    private array $boards = [];

    /** @param list<array{slug: string, name: string, description: string, icon: string}> $boards */
    public function __construct(#[Autowire('%community.boards%')] array $boards)
    {
        foreach ($boards as $board) {
            $this->boards[$board['slug']] = $board;
        }
    }

    /** @return list<array{slug: string, name: string, description: string, icon: string}> */
    public function all(): array
    {
        return array_values($this->boards);
    }

    /** @return array{slug: string, name: string, description: string, icon: string}|null */
    public function get(string $slug): ?array
    {
        return $this->boards[$slug] ?? null;
    }
}
