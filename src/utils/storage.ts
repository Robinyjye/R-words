import { WordState, ConfidenceLevel } from './word';

const STORAGE_KEY = 'ebbinghaus_typing_words';

export const loadWords = (): WordState[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to load words', e);
    return [];
  }
};

export const saveWords = (words: WordState[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
  } catch (e) {
    console.error('Failed to save words', e);
  }
};

// Ebbinghaus intervals in milliseconds
export const EBBINGHAUS_INTERVALS = [
  0,                  // Stage 0: New word
  5 * 60 * 1000,      // Stage 1: 5 mins
  30 * 60 * 1000,     // Stage 2: 30 mins
  12 * 60 * 60 * 1000, // Stage 3: 12 hours
  24 * 60 * 60 * 1000, // Stage 4: 1 day
  2 * 24 * 60 * 60 * 1000, // Stage 5: 2 days
  4 * 24 * 60 * 60 * 1000, // Stage 6: 4 days
  7 * 24 * 60 * 60 * 1000, // Stage 7: 7 days
  15 * 24 * 60 * 60 * 1000, // Stage 8: 15 days
  30 * 24 * 60 * 60 * 1000  // Stage 9: 30 days
];

// Confidence level multipliers for Ebbinghaus intervals:
// - 'low': 0.5x interval (cuts waiting time in half -> reviews 2x more frequently)
// - 'medium' (default): 1.0x interval (standard curve)
// - 'high': 1.75x interval (longer interval for firmly mastered words)
export const CONFIDENCE_INTERVAL_MULTIPLIERS: Record<ConfidenceLevel, number> = {
  low: 0.5,
  medium: 1.0,
  high: 1.75
};

export const getEffectiveInterval = (w: WordState, stage: number): number => {
  const baseInterval = EBBINGHAUS_INTERVALS[stage] || EBBINGHAUS_INTERVALS[EBBINGHAUS_INTERVALS.length - 1];
  if (baseInterval === 0) return 0;
  const conf = w.confidence || 'medium';
  const multiplier = CONFIDENCE_INTERVAL_MULTIPLIERS[conf] ?? 1.0;
  return Math.round(baseInterval * multiplier);
};

export const getConfidencePriorityWeight = (confidence?: ConfidenceLevel): number => {
  if (confidence === 'low') return 3; // Highest priority
  if (confidence === 'high') return 1; // Lowest priority
  return 2; // medium default
};

export const isWordDue = (w: WordState, isDictationMode: boolean, now: number): boolean => {
  if (w.is_mastered) return false;
  const stage = w.ebbinghaus_stage || 0;
  if (stage === 0) return true; 
  
  const lastReview = w.last_review_time || 0;
  const interval = getEffectiveInterval(w, stage);
  
  return (now - lastReview >= interval);
};

export const getNextWordToReview = (
  words: WordState[], 
  isDictationMode: boolean = false,
  isEbbinghausMode: boolean = false,
  includeMastered: boolean = false
): WordState | null => {
  if (words.length === 0) return null;
  
  if (isEbbinghausMode) {
    const now = Date.now();
    
    // 1. Find words that are due for review (using confidence-adjusted interval)
    const dueWords = words.filter(w => {
      if (includeMastered) {
        const stage = w.ebbinghaus_stage || 0;
        if (stage === 0) return true;
        const lastReview = w.last_review_time || 0;
        const interval = getEffectiveInterval(w, stage);
        return (now - lastReview >= interval);
      }
      return isWordDue(w, isDictationMode, now);
    });

    if (dueWords.length > 0) {
      return dueWords.sort((a, b) => {
        // 1. Error words always first
        if (a.has_error && !b.has_error) return -1;
        if (!a.has_error && b.has_error) return 1;

        const stageA = a.ebbinghaus_stage || 0;
        const stageB = b.ebbinghaus_stage || 0;
        
        // 2. Prioritize reviews (stage > 0) over new words (stage === 0)
        if (stageA > 0 && stageB === 0) return -1;
        if (stageA === 0 && stageB > 0) return 1;
        
        // 3. Prioritize by confidence: 'low' (weight 3) > 'medium' (2) > 'high' (1)
        const confWeightA = getConfidencePriorityWeight(a.confidence);
        const confWeightB = getConfidencePriorityWeight(b.confidence);
        if (confWeightA !== confWeightB) {
          return confWeightB - confWeightA;
        }

        // 4. If both are reviews at the same confidence level, prioritize higher overdue ratio
        if (stageA > 0 && stageB > 0) {
          const intervalA = Math.max(1, getEffectiveInterval(a, stageA));
          const intervalB = Math.max(1, getEffectiveInterval(b, stageB));
          const overdueRatioA = (now - (a.last_review_time || 0)) / intervalA;
          const overdueRatioB = (now - (b.last_review_time || 0)) / intervalB;
          if (Math.abs(overdueRatioB - overdueRatioA) > 0.05) {
            return overdueRatioB - overdueRatioA;
          }
          if (stageA !== stageB) return stageA - stageB;
          return (a.last_review_time || 0) - (b.last_review_time || 0);
        }
        
        // 5. Default timestamp order
        return (a.last_review_time || 0) - (b.last_review_time || 0);
      })[0];
    }
    return null;
  }

  // Sequential mode: Find the first word that is not completed in the current mode
  const nextWord = words.find(w => 
    (includeMastered || !w.is_mastered) && (isDictationMode ? !w.is_completed_dictation : !w.is_completed_normal)
  );
  
  return nextWord || null;
};
