/**
 * Converts text to title case, preserving:
 * - Acronyms (2–5 all-caps chars, e.g. "NASA", "WCAG")
 * - Intentional mixed case (e.g. "McCartney")
 * - Hyphenated words (each segment capitalized independently)
 * - Parenthetical segments
 *
 * Does NOT implement editorial title-case connector-word exceptions
 * (e.g. "of", "the" staying lowercase mid-title) — every word is
 * capitalized except where the above preservation rules apply.
 */
export function toTitleCase(text: string): string {
  return text
    .split(' ')
    .map(word => {
      if (!word) return word;
      if (word.includes('-')) {
        return word.split('-').map(p => p ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : p).join('-');
      }
      if (word.includes('(') || word.includes(')')) {
        return word.replace(/^([^(]*)(\([^)]*\))(.*)$/, (_, before, inside, after) =>
          (before ? before.charAt(0).toUpperCase() + before.slice(1).toLowerCase() : '') +
          inside +
          (after ? after.charAt(0).toUpperCase() + after.slice(1).toLowerCase() : '')
        );
      }
      // Preserve acronyms (2–5 all-caps chars)
      if (word === word.toUpperCase() && word.length >= 2 && word.length <= 5) return word;
      // Preserve mixed case (already cased intentionally)
      if (word !== word.toLowerCase() && word !== word.toUpperCase()) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}