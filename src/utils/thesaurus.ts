import { WordState } from './word';

// Built-in high frequency antonym pairs
const BUILTIN_ANTONYM_PAIRS: [string, string][] = [
  ['good', 'bad'],
  ['accept', 'reject'],
  ['agree', 'disagree'],
  ['increase', 'decrease'],
  ['ascend', 'descend'],
  ['advance', 'retreat'],
  ['optimistic', 'pessimistic'],
  ['active', 'passive'],
  ['public', 'private'],
  ['include', 'exclude'],
  ['ancient', 'modern'],
  ['simple', 'complex'],
  ['admit', 'deny'],
  ['permanent', 'temporary'],
  ['foreign', 'domestic'],
  ['success', 'failure'],
  ['major', 'minor'],
  ['normal', 'abnormal'],
  ['legal', 'illegal'],
  ['moral', 'immoral'],
  ['rational', 'irrational'],
  ['visible', 'invisible'],
  ['equal', 'unequal'],
  ['equality', 'inequality'],
  ['egalitarian', 'elitist'],
  ['egalitarian', 'hierarchical'],
  ['superior', 'inferior'],
  ['abstract', 'concrete'],
  ['abundant', 'scarce'],
  ['rigid', 'flexible'],
  ['transparent', 'opaque'],
  ['mandatory', 'optional'],
  ['explicit', 'implicit'],
  ['voluntary', 'involuntary'],
  ['permanent', 'transient'],
  ['synthetic', 'natural'],
  ['vertical', 'horizontal'],
  ['urban', 'rural'],
  ['literal', 'figurative'],
  ['dynamic', 'static'],
  ['convergent', 'divergent'],
  ['homogenous', 'heterogeneous'],
  ['objective', 'subjective'],
  ['defend', 'attack'],
  ['praise', 'criticize'],
  ['calm', 'anxious'],
  ['cautious', 'reckless'],
  ['polite', 'rude'],
  ['brave', 'cowardly'],
  ['generous', 'selfish'],
  ['proud', 'humble'],
  ['broad', 'narrow'],
  ['deep', 'shallow'],
  ['bright', 'dim'],
  ['smooth', 'rough'],
  ['sharp', 'dull'],
  ['empty', 'full'],
  ['loose', 'tight'],
  ['true', 'false'],
  ['strong', 'weak'],
  ['heavy', 'light'],
  ['early', 'late'],
  ['fast', 'slow'],
  ['hard', 'soft'],
  ['hot', 'cold'],
  ['clean', 'dirty'],
  ['cheap', 'expensive'],
  ['rich', 'poor'],
  ['happy', 'sad'],
  ['beautiful', 'ugly'],
  ['healthy', 'sick'],
  ['clever', 'foolish'],
  ['innocent', 'guilty'],
  ['victory', 'defeat'],
  ['peace', 'war'],
  ['love', 'hate'],
  ['friend', 'enemy'],
  ['question', 'answer'],
  ['problem', 'solution'],
  ['cause', 'effect'],
  ['theory', 'practice'],
  ['input', 'output'],
  ['import', 'export'],
  ['expand', 'contract'],
  ['construct', 'destruct'],
  ['encourage', 'discourage'],
  ['allow', 'forbid'],
  ['permit', 'prohibit'],
  ['create', 'destroy'],
  ['strengthen', 'weaken'],
  ['combine', 'separate'],
  ['attach', 'detach'],
  ['connect', 'disconnect'],
  ['confirm', 'refute'],
  ['confirm', 'deny'],
  ['validate', 'invalidate'],
  ['approve', 'disapprove'],
  ['reward', 'punish'],
  ['protect', 'harm'],
  ['benefit', 'detriment'],
  ['advantage', 'disadvantage'],
  ['rebuttal', 'concession'],
  ['rebuttal', 'confirmation'],
  ['rebuttal', 'endorsement'],
  ['refutation', 'confirmation'],
  ['refutation', 'proof'],
  ['similar', 'dissimilar'],
  ['similarity', 'difference'],
  ['similarity', 'disparity'],
  ['disparities', 'similarities'],
  ['disparity', 'equality'],
  ['disparity', 'similarity'],
  ['parity', 'disparity'],
  ['order', 'disorder'],
  ['patient', 'impatient'],
  ['honest', 'dishonest'],
  ['responsible', 'irresponsible'],
  ['stable', 'unstable'],
  ['symmetry', 'asymmetry'],
  ['lock', 'unlock'],
  ['safe', 'dangerous'],
  ['generous', 'stingy'],
  ['innocent', 'culpable'],
  ['guilty', 'innocent'],
  ['frequent', 'rare'],
  ['positive', 'negative'],
  ['maximum', 'minimum'],
  ['optimum', 'worst'],
  ['unity', 'division'],
  ['harmony', 'discord'],
  ['freedom', 'slavery'],
  ['liberty', 'tyranny'],
  ['peaceful', 'hostile'],
  ['friendly', 'hostile']
];

// Built-in high frequency synonym groups
const BUILTIN_SYNONYM_GROUPS: string[][] = [
  ['fair', 'equal', 'equitable', 'impartial', 'unbiased', 'just', 'objective', 'egalitarian'],
  ['rebuttal', 'refutation', 'counterargument', 'disproof', 'rebut', 'counter', 'denial'],
  ['refute', 'rebut', 'disprove', 'contradict', 'contest', 'dispute', 'debunk', 'confute'],
  ['disparity', 'difference', 'discrepancy', 'inequality', 'imbalance', 'variance', 'divergence'],
  ['disparities', 'differences', 'discrepancies', 'inequalities', 'imbalances'],
  ['huge', 'enormous', 'gigantic', 'immense', 'vast', 'colossal', 'massive', 'tremendous'],
  ['small', 'tiny', 'minute', 'miniature', 'petty', 'compact', 'little', 'diminutive'],
  ['happy', 'glad', 'cheerful', 'joyful', 'delighted', 'content', 'pleased', 'ecstatic', 'elated'],
  ['sad', 'sorrowful', 'dejected', 'depressed', 'miserable', 'gloomy', 'mournful', 'melancholy'],
  ['smart', 'intelligent', 'clever', 'bright', 'brilliant', 'wise', 'sharp', 'astute', 'shrewd'],
  ['brave', 'courageous', 'bold', 'fearless', 'daring', 'valiant', 'heroic', 'dauntless'],
  ['strange', 'weird', 'odd', 'bizarre', 'peculiar', 'unusual', 'abnormal', 'eccentric'],
  ['calm', 'peaceful', 'serene', 'tranquil', 'quiet', 'placid', 'composed'],
  ['fast', 'quick', 'rapid', 'swift', 'speedy', 'brisk', 'prompt', 'fleet'],
  ['hard', 'difficult', 'tough', 'arduous', 'strenuous', 'challenging', 'laborious'],
  ['simple', 'easy', 'effortless', 'plain', 'straightforward', 'uncomplicated'],
  ['begin', 'start', 'commence', 'initiate', 'launch', 'embark', 'originate'],
  ['end', 'finish', 'conclude', 'terminate', 'cease', 'halt', 'finalize'],
  ['help', 'assist', 'aid', 'support', 'facilitate', 'succor', 'serve'],
  ['hurt', 'harm', 'injure', 'damage', 'impair', 'wound', 'spoil'],
  ['show', 'display', 'exhibit', 'reveal', 'demonstrate', 'indicate', 'manifest', 'disclose'],
  ['hide', 'conceal', 'mask', 'obscure', 'cover', 'veil', 'disguise', 'cloak'],
  ['improve', 'enhance', 'boost', 'elevate', 'upgrade', 'refine', 'ameliorate'],
  ['worsen', 'deteriorate', 'decline', 'degrade', 'degenerate', 'decay'],
  ['rich', 'wealthy', 'affluent', 'prosperous', 'opulent', 'well-off'],
  ['poor', 'impoverished', 'destitute', 'needy', 'penniless', 'indigent'],
  ['praise', 'laud', 'commend', 'acclaim', 'extol', 'applaud', 'eulogize'],
  ['blame', 'criticize', 'condemn', 'censure', 'reproach', 'rebuke', 'denounce'],
  ['destroy', 'demolish', 'ruin', 'wreck', 'devastate', 'eradicate', 'obliterate'],
  ['build', 'construct', 'erect', 'assemble', 'fabricate', 'establish', 'create'],
  ['stop', 'prevent', 'hinder', 'hamper', 'impede', 'inhibit', 'thwart'],
  ['clear', 'lucid', 'transparent', 'distinct', 'apparent', 'evident', 'obvious'],
  ['vague', 'ambiguous', 'obscure', 'unclear', 'indistinct', 'nebulous', 'hazy'],
  ['important', 'significant', 'crucial', 'vital', 'essential', 'critical', 'pivotal'],
  ['trivial', 'insignificant', 'minor', 'negligible', 'petty', 'frivolous'],
  ['rich', 'wealthy', 'affluent', 'prosperous'],
  ['stubborn', 'obstinate', 'tenacious', 'persistent', 'unyielding', 'intractable'],
  ['hesitant', 'reluctant', 'indecisive', 'doubtful', 'vacillating', 'tentative'],
  ['abundant', 'plentiful', 'ample', 'copious', 'profuse', 'lavish'],
  ['scarce', 'rare', 'sparse', 'meager', 'scant', 'deficient'],
  ['accurate', 'precise', 'exact', 'correct', 'faultless', 'flawless'],
  ['doubt', 'suspect', 'question', 'distrust', 'mistrust', 'discredit'],
  ['believe', 'trust', 'credit', 'accept', 'rely', 'confide']
];

// Negative prefixes for antonym derivation
const NEGATIVE_PREFIXES = ['un', 'in', 'im', 'il', 'ir', 'dis', 'non', 'anti', 'a', 'mis', 'mal', 'counter'];

// In-memory cache for API results
const datamuseCache = new Map<string, { syn: Set<string>; ant: Set<string> }>();

// Load / persist API cache
function getStoredCache(word: string): { syn: Set<string>; ant: Set<string> } | null {
  const key = word.toLowerCase();
  if (datamuseCache.has(key)) {
    return datamuseCache.get(key)!;
  }
  try {
    const raw = localStorage.getItem(`synant_cache_${key}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      const data = {
        syn: new Set<string>(parsed.syn || []),
        ant: new Set<string>(parsed.ant || [])
      };
      datamuseCache.set(key, data);
      return data;
    }
  } catch (e) {
    // ignore
  }
  return null;
}

function storeCache(word: string, data: { syn: Set<string>; ant: Set<string> }) {
  const key = word.toLowerCase();
  datamuseCache.set(key, data);
  try {
    localStorage.setItem(
      `synant_cache_${key}`,
      JSON.stringify({
        syn: Array.from(data.syn),
        ant: Array.from(data.ant)
      })
    );
  } catch (e) {
    // ignore
  }
}

/**
 * Fetch synonyms and antonyms from Datamuse API asynchronously
 */
export async function fetchDatamuseSynAnt(word: string): Promise<{ syn: Set<string>; ant: Set<string> }> {
  const cleanWord = word.trim().toLowerCase();
  if (!cleanWord) return { syn: new Set(), ant: new Set() };

  const cached = getStoredCache(cleanWord);
  if (cached) return cached;

  const synSet = new Set<string>();
  const antSet = new Set<string>();

  try {
    const [synRes, antRes, mlRes] = await Promise.all([
      fetch(`https://api.datamuse.com/words?rel_syn=${encodeURIComponent(cleanWord)}&max=40`).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(`https://api.datamuse.com/words?rel_ant=${encodeURIComponent(cleanWord)}&max=40`).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(`https://api.datamuse.com/words?ml=${encodeURIComponent(cleanWord)}&max=25`).then(r => r.ok ? r.json() : []).catch(() => [])
    ]);

    if (Array.isArray(synRes)) {
      for (const item of synRes) {
        if (item.word) synSet.add(item.word.toLowerCase());
      }
    }
    if (Array.isArray(antRes)) {
      for (const item of antRes) {
        if (item.word) antSet.add(item.word.toLowerCase());
      }
    }
    // High-confidence 'means-like' can contribute to synonyms
    if (Array.isArray(mlRes)) {
      for (const item of mlRes) {
        if (item.word && item.score && item.score > 50000 && !antSet.has(item.word.toLowerCase())) {
          synSet.add(item.word.toLowerCase());
        }
      }
    }
  } catch (err) {
    console.warn('Failed to fetch from Datamuse', err);
  }

  const result = { syn: synSet, ant: antSet };
  storeCache(cleanWord, result);
  return result;
}

/**
 * Clean and normalize words for comparison (remove punctuation, lowercased, lemmatized approximation)
 */
function normalizeWord(w: string): string {
  return w.trim().toLowerCase().replace(/[^a-z]/g, '');
}

/**
 * Check if wordA and wordB have prefix opposition (e.g., equal vs unequal)
 */
function checkPrefixOpposition(wordA: string, wordB: string): boolean {
  const a = normalizeWord(wordA);
  const b = normalizeWord(wordB);
  if (a === b || !a || !b) return false;

  for (const prefix of NEGATIVE_PREFIXES) {
    if (a.startsWith(prefix) && a.slice(prefix.length) === b) {
      return true;
    }
    if (b.startsWith(prefix) && b.slice(prefix.length) === a) {
      return true;
    }
  }
  return false;
}

/**
 * Extract keywords from Chinese meaning
 */
function extractChineseKeywords(meaning?: string): string[] {
  if (!meaning) return [];
  // Split on punctuation
  const segments = meaning.split(/[,，;；/、\s\n[\]()（）]+/);
  const keywords: string[] = [];
  for (const seg of segments) {
    const clean = seg.replace(/^[a-z]+\.\s*/i, '').trim(); // remove pos tag like "adj."
    if (clean.length >= 2) {
      keywords.push(clean);
    }
  }
  return keywords;
}

/**
 * Check if two Chinese definitions have strong keyword overlap
 */
function checkChineseMeaningOverlap(meaningA?: string, meaningB?: string): boolean {
  if (!meaningA || !meaningB) return false;
  const kwA = extractChineseKeywords(meaningA);
  const kwB = extractChineseKeywords(meaningB);
  if (kwA.length === 0 || kwB.length === 0) return false;

  for (const a of kwA) {
    for (const b of kwB) {
      if (a === b) return true;
      if (a.length >= 3 && b.length >= 3 && (a.includes(b) || b.includes(a))) return true;
    }
  }
  return false;
}

/**
 * Check Chinese meaning for antonym markers (e.g. "不..." vs affirmative)
 */
function checkChineseAntonymOpposition(meaningA?: string, meaningB?: string): boolean {
  if (!meaningA || !meaningB) return false;
  const kwA = extractChineseKeywords(meaningA);
  const kwB = extractChineseKeywords(meaningB);

  for (const a of kwA) {
    for (const b of kwB) {
      if (a === `不${b}` || b === `不${a}` || a === `非${b}` || b === `非${a}` || a === `无${b}` || b === `无${a}`) {
        return true;
      }
    }
  }
  return false;
}

export interface SearchSynAntResult {
  synonyms: WordState[];
  antonyms: WordState[];
  totalSearched: number;
}

/**
 * Main search function:
 * Searches across ALL words in the user's library (`allWords`) for synonyms and antonyms of `targetWord`.
 * Supports:
 * 1. Explicit properties on targetWord or items in allWords (synonyms / antonyms field)
 * 2. Datamuse API (cached / fetched)
 * 3. Built-in thesaurus pairs & groups
 * 4. Prefix opposition (un-, in-, dis- etc.)
 * 5. Chinese meaning keywords overlap & negation markers
 */
export function findSynonymsAndAntonymsInLibrary(
  targetWord: WordState,
  allWords: WordState[],
  apiData?: { syn: Set<string>; ant: Set<string> } | null
): SearchSynAntResult {
  const targetClean = normalizeWord(targetWord.word);
  if (!targetClean || allWords.length === 0) {
    return { synonyms: [], antonyms: [], totalSearched: allWords.length };
  }

  const synSet = new Set<string>();
  const antSet = new Set<string>();

  // 1. Incorporate API data if available
  if (apiData) {
    apiData.syn.forEach(w => synSet.add(normalizeWord(w)));
    apiData.ant.forEach(w => antSet.add(normalizeWord(w)));
  }

  // Also check stored cache synchronously
  const cached = getStoredCache(targetClean);
  if (cached) {
    cached.syn.forEach(w => synSet.add(normalizeWord(w)));
    cached.ant.forEach(w => antSet.add(normalizeWord(w)));
  }

  // 2. Built-in antonym pairs
  for (const [w1, w2] of BUILTIN_ANTONYM_PAIRS) {
    const n1 = normalizeWord(w1);
    const n2 = normalizeWord(w2);
    if (n1 === targetClean) antSet.add(n2);
    if (n2 === targetClean) antSet.add(n1);
  }

  // 3. Built-in synonym groups
  for (const group of BUILTIN_SYNONYM_GROUPS) {
    const normalizedGroup = group.map(w => normalizeWord(w));
    if (normalizedGroup.includes(targetClean)) {
      for (const w of normalizedGroup) {
        if (w !== targetClean) {
          synSet.add(w);
        }
      }
    }
  }

  // 4. Target word explicit fields
  const targetExplicitSyns = typeof (targetWord as any).synonyms === 'string' 
    ? ((targetWord as any).synonyms as string).split(/[,，/、\s]+/).map(normalizeWord).filter(Boolean)
    : Array.isArray((targetWord as any).synonyms) ? (targetWord as any).synonyms.map(normalizeWord) : [];
  targetExplicitSyns.forEach((w: string) => synSet.add(w));

  const targetExplicitAnts = typeof (targetWord as any).antonyms === 'string'
    ? ((targetWord as any).antonyms as string).split(/[,，/、\s]+/).map(normalizeWord).filter(Boolean)
    : Array.isArray((targetWord as any).antonyms) ? (targetWord as any).antonyms.map(normalizeWord) : [];
  targetExplicitAnts.forEach((w: string) => antSet.add(w));

  // Result collections (deduped by normalized word)
  const matchedSynonyms: WordState[] = [];
  const matchedAntonyms: WordState[] = [];
  const seenSyn = new Set<string>();
  const seenAnt = new Set<string>();

  for (const candidate of allWords) {
    if (!candidate.word) continue;
    const candClean = normalizeWord(candidate.word);
    // Do not match the word itself
    if (candClean === targetClean) continue;

    // Check candidate explicit fields
    const candExplicitSyns = typeof (candidate as any).synonyms === 'string'
      ? ((candidate as any).synonyms as string).split(/[,，/、\s]+/).map(normalizeWord).filter(Boolean)
      : Array.isArray((candidate as any).synonyms) ? (candidate as any).synonyms.map(normalizeWord) : [];
    
    const candExplicitAnts = typeof (candidate as any).antonyms === 'string'
      ? ((candidate as any).antonyms as string).split(/[,，/、\s]+/).map(normalizeWord).filter(Boolean)
      : Array.isArray((candidate as any).antonyms) ? (candidate as any).antonyms.map(normalizeWord) : [];

    // Is it an Antonym?
    let isAnt = false;
    if (antSet.has(candClean)) {
      isAnt = true;
    } else if (candExplicitAnts.includes(targetClean)) {
      isAnt = true;
    } else if (checkPrefixOpposition(targetWord.word, candidate.word)) {
      isAnt = true;
    } else if (checkChineseAntonymOpposition(targetWord.meaning, candidate.meaning)) {
      isAnt = true;
    }

    if (isAnt) {
      if (!seenAnt.has(candClean)) {
        seenAnt.add(candClean);
        matchedAntonyms.push(candidate);
      }
      continue; // If it's an antonym, don't classify as synonym
    }

    // Is it a Synonym?
    let isSyn = false;
    if (synSet.has(candClean)) {
      isSyn = true;
    } else if (candExplicitSyns.includes(targetClean)) {
      isSyn = true;
    } else if (checkChineseMeaningOverlap(targetWord.meaning, candidate.meaning)) {
      // If parts of speech match or one is missing, and meanings overlap
      const posA = (targetWord.part_of_speech || '').trim().toLowerCase();
      const posB = (candidate.part_of_speech || '').trim().toLowerCase();
      if (!posA || !posB || posA === posB || (posA[0] === posB[0])) {
        isSyn = true;
      }
    }

    if (isSyn) {
      if (!seenSyn.has(candClean)) {
        seenSyn.add(candClean);
        matchedSynonyms.push(candidate);
      }
    }
  }

  return {
    synonyms: matchedSynonyms,
    antonyms: matchedAntonyms,
    totalSearched: allWords.length
  };
}
