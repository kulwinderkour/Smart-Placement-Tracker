/**
 * Text utilities for displaying scraped/unstructured content.
 *
 * The backend /jobs/external endpoint already sanitizes. These helpers are
 * defensive for the legacy direct-Arbeitnow path and any other third-party
 * source the frontend still hits directly (e.g. JSearch client-side).
 *
 * Why DOMParser over regex:
 *   Regex can't parse nested/malformed HTML. DOMParser is the browser-native,
 *   safe way to get textContent without executing scripts (parseFromString
 *   with 'text/html' is inert — no <script> execution, no network fetches).
 */

const DEFAULT_FALLBACK = 'No description available.';

export function stripHtml(input?: string | null): string {
  if (!input) return '';
  try {
    const doc = new DOMParser().parseFromString(input, 'text/html');
    return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
  } catch {
    // Fallback if DOMParser is unavailable (SSR, non-browser envs).
    return input.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
}

export function truncateAtWord(text: string, maxLen = 220, ellipsis = '…'): string {
  if (!text || text.length <= maxLen) return text;
  const slice = text.slice(0, maxLen);
  const lastSpace = slice.lastIndexOf(' ');
  return (lastSpace > 0 ? slice.slice(0, lastSpace) : slice) + ellipsis;
}

/**
 * Single entry point for card-preview descriptions. Handles:
 *   - null/undefined  -> fallback text
 *   - raw HTML        -> stripped to plaintext
 *   - over-long text  -> word-boundary truncation with ellipsis
 */
export function cleanDescription(
  input?: string | null,
  maxLen = 220,
  fallback: string = DEFAULT_FALLBACK,
): string {
  const stripped = stripHtml(input);
  if (!stripped) return fallback;
  return truncateAtWord(stripped, maxLen);
}
