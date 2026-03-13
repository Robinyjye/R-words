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

export const getNextWordToReview = (words: WordState[], isDictationMode: boolean = false): WordState | null => {
  if (words.length === 0) return null;
  
  // Sequential mode: Find the first word that is not completed in the current mode
  const nextWord = words.find(w => 
    isDictationMode ? !w.is_completed_dictation : !w.is_completed_normal
  );
  
  return nextWord || null;
};
