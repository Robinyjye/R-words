import { WordState } from './word';

/**
 * Calculate Levenshtein distance between two strings
 */
export function levenshteinDistance(a: string, b: string): number {
  const an = a ? a.length : 0;
  const bn = b ? b.length : 0;
  if (an === 0) return bn;
  if (bn === 0) return an;

  const matrix: number[][] = Array.from({ length: bn + 1 }, () => new Array(an + 1));
  for (let i = 0; i <= an; ++i) matrix[0][i] = i;
  for (let j = 0; j <= bn; ++j) matrix[j][0] = j;

  for (let j = 1; j <= bn; ++j) {
    for (let i = 1; i <= an; ++i) {
      if (a[i - 1] === b[j - 1]) {
        matrix[j][i] = matrix[j - 1][i - 1];
      } else {
        matrix[j][i] = Math.min(
          matrix[j - 1][i - 1] + 1, // substitution
          matrix[j][i - 1] + 1,     // insertion
          matrix[j - 1][i] + 1      // deletion
        );
      }
    }
  }
  return matrix[bn][an];
}

export interface SearchMatch {
  word: WordState;
  score: number;
}

/**
 * Retrieve and rank similar / matching words from the local vocabulary library
 */
export function searchSimilarWords(words: WordState[], query: string, limit = 8): WordState[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const scored: SearchMatch[] = [];
  const seenWords = new Set<string>();

  for (const w of words) {
    if (!w.word) continue;
    const key = w.word.toLowerCase();
    if (seenWords.has(key)) continue;

    const wText = key;
    const meaningText = (w.meaning || '').toLowerCase();
    const rootText = (w.root_core || '').toLowerCase().replace(/[^a-zA-Z]/g, '');

    let score = -1;

    // 1. Exact match
    if (wText === q) {
      score = 100;
    }
    // 2. Starts with query (prefix match)
    else if (wText.startsWith(q)) {
      score = 80 - Math.min(20, wText.length - q.length);
    }
    // 3. Substring match
    else if (wText.includes(q)) {
      score = 60 - Math.min(15, wText.indexOf(q));
    }
    // 4. Root match
    else if (rootText && (rootText === q || rootText.startsWith(q))) {
      score = 50;
    }
    // 5. Meaning match (Chinese keyword search)
    else if (meaningText.includes(q)) {
      score = 45;
    }
    // 6. Fuzzy edit distance for spelling mistakes (e.g. typing disect -> matches dissect)
    else if (q.length >= 3) {
      const dist = levenshteinDistance(wText, q);
      const maxAllowedDist = q.length <= 4 ? 1 : 2;
      if (dist <= maxAllowedDist) {
        score = 30 - dist * 8;
      }
    }

    if (score > 0) {
      scored.push({ word: w, score });
      seenWords.add(key);
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(item => item.word);
}
