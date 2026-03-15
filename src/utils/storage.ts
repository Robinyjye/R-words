import { WordState } from './word';

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

export const isWordDue = (w: WordState, isDictationMode: boolean, now: number): boolean => {
  const stage = w.ebbinghaus_stage || 0;
  if (stage === 0) return true; 
  
  const lastReview = w.last_review_time || 0;
  const interval = EBBINGHAUS_INTERVALS[stage] || EBBINGHAUS_INTERVALS[EBBINGHAUS_INTERVALS.length - 1];
  const isCompleted = isDictationMode ? w.is_completed_dictation : w.is_completed_normal;
  
  return !isCompleted && (now - lastReview >= interval);
};

export const getNextWordToReview = (
  words: WordState[], 
  isDictationMode: boolean = false,
  isEbbinghausMode: boolean = false
): WordState | null => {
  if (words.length === 0) return null;
  
  if (isEbbinghausMode) {
    const now = Date.now();
    
    // 1. Find words that are due for review
    const dueWords = words.filter(w => isWordDue(w, isDictationMode, now));

    if (dueWords.length > 0) {
      // Sort by stage (higher stage first or lower? usually lower first to reinforce new ones)
      // and then by last review time
      return dueWords.sort((a, b) => {
        const stageA = a.ebbinghaus_stage || 0;
        const stageB = b.ebbinghaus_stage || 0;
        if (stageA !== stageB) return stageA - stageB;
        return (a.last_review_time || 0) - (b.last_review_time || 0);
      })[0];
    }

    // If no words are strictly "due", we could either return null or the next "closest" word
    // The user might want to know there's nothing to review.
    // But for a better UX, if they are in Ebbinghaus mode and everything is done, maybe show a message.
    return null;
  }

  // Sequential mode: Find the first word that is not completed in the current mode
  const nextWord = words.find(w => 
    isDictationMode ? !w.is_completed_dictation : !w.is_completed_normal
  );
  
  return nextWord || null;
};
