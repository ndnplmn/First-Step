/**
 * Computes Jaccard similarity on content words (>3 chars) between two strings.
 * Used to detect semantically equivalent therapist questions even when phrased differently.
 */
export function isSimilarQuestion(a: string, b: string): boolean {
  const contentWords = (s: string): Set<string> =>
    new Set(
      s.toLowerCase()
       .replace(/[¿?¡!.,;:()"«»]/g, '')
       .split(/\s+/)
       .filter(w => w.length > 3)
    );

  const wa = contentWords(a);
  const wb = contentWords(b);
  if (wa.size === 0 || wb.size === 0) return false;

  let shared = 0;
  wa.forEach(w => { if (wb.has(w)) shared++; });

  // Jaccard: intersection / union
  const jaccard = shared / (wa.size + wb.size - shared);
  return jaccard > 0.38;
}
