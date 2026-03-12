import { WordState } from './ebbinghaus';

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

export const getNextWordToReview = (words: WordState[]): WordState | null => {
  if (words.length === 0) return null;
  
  const now = Date.now();
  
  // 1. Find words that are due or new (next_review_time <= now or null)
  const availableWords = words.filter(w => w.next_review_time === null || w.next_review_time <= now);
  
  if (availableWords.length > 0) {
    // Sort by review_count (ascending) first, then by most overdue
    return availableWords.sort((a, b) => {
      if (a.review_count !== b.review_count) {
        return a.review_count - b.review_count;
      }
      const timeA = a.next_review_time === null ? 0 : a.next_review_time;
      const timeB = b.next_review_time === null ? 0 : b.next_review_time;
      return timeA - timeB;
    })[0];
  }
  
  // 2. If no words are due and no new words, allow continuous practice
  // Sort by review_count (ascending) first, then by closest to being due
  const upcomingWords = [...words].sort((a, b) => {
    if (a.review_count !== b.review_count) {
      return a.review_count - b.review_count;
    }
    const timeA = a.next_review_time === null ? 0 : a.next_review_time;
    const timeB = b.next_review_time === null ? 0 : b.next_review_time;
    return timeA - timeB;
  });
  return upcomingWords[0];
};
