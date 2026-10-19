<?php

namespace App\Community;

/**
 * Posts and titles are plain text: stored as typed (tidied), shown escaped, with their
 * paragraphs and line breaks, and with http(s) addresses turned into nofollow links.
 */
final class PlainText
{
    private const URL = '~\bhttps?://[^\s<>"\'`]+~iu';

    /** Unifies line endings, drops control characters, trims, and keeps at most one blank line in a row. */
    public static function clean(string $text, bool $singleLine = false): string
    {
        $text = str_replace(["\r\n", "\r"], "\n", mb_scrub($text, 'UTF-8'));
        // Control characters and the bidi overrides that could flip the text around them.
        $text = preg_replace('/[^\P{Cc}\n\t]+|[\x{202A}-\x{202E}\x{2066}-\x{2069}]+/u', '', $text) ?? '';
        $text = str_replace("\t", '    ', $text);
        if ($singleLine) {
            return trim(preg_replace('/\s+/u', ' ', $text) ?? '');
        }
        $text = preg_replace('/[ ]+$/m', '', $text) ?? '';

        return trim(preg_replace("/\n{3,}/", "\n\n", $text) ?? '', "\n ");
    }

    public static function length(string $text): int
    {
        return mb_strlen($text);
    }

    /** Safe HTML: <p> per paragraph, <br> per line break, links for http(s) addresses. */
    public static function toHtml(string $text): string
    {
        $paragraphs = preg_split("/\n{2,}/", self::clean($text)) ?: [];
        $html = '';
        foreach ($paragraphs as $paragraph) {
            if ('' !== $paragraph) {
                $html .= '<p>'.str_replace("\n", "<br>\n", self::linkify($paragraph)).'</p>';
            }
        }

        return $html;
    }

    private static function linkify(string $text): string
    {
        $out = '';
        $at = 0;
        preg_match_all(self::URL, $text, $matches, \PREG_OFFSET_CAPTURE);
        foreach ($matches[0] as [$url, $offset]) {
            // Punctuation that ends a sentence is not part of the address, nor an unmatched ")".
            $url = rtrim($url, '.,;:!?\'"');
            while (str_ends_with($url, ')') && substr_count($url, '(') < substr_count($url, ')')) {
                $url = rtrim(substr($url, 0, -1), '.,;:!?\'"');
            }
            $out .= self::escape(substr($text, $at, $offset - $at));
            $out .= '<a href="'.self::escape($url).'" rel="nofollow ugc noopener">'.self::escape($url).'</a>';
            $at = $offset + \strlen($url);
        }

        return $out.self::escape(substr($text, $at));
    }

    private static function escape(string $text): string
    {
        return htmlspecialchars($text, \ENT_QUOTES | \ENT_SUBSTITUTE | \ENT_HTML5, 'UTF-8');
    }
}
