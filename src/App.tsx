/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { WordState } from './utils/word';
import { loadWords, saveWords, getNextWordToReview, isWordDue, EBBINGHAUS_INTERVALS } from './utils/storage';
import { enrichWords } from './utils/gemini';
import { playKeystrokeSound, playSuccessSound, speakWord, speakWordAndExample, playComboSound } from './utils/audio';
import { ImportModal } from './components/ImportModal';
import { StatsModal } from './components/StatsModal';
import { RootDetectiveGame } from './components/RootDetectiveGame';
import { Database, CheckCircle2, Clock, ChevronDown, Pencil, Trash2, Volume2, Headphones, ArrowLeft, ArrowRight, Brain, RotateCcw, Gamepad2, X, Eye, Download, Save, CopyX, BarChart2, Search, BookOpen, Sparkles, Loader2 } from 'lucide-react';
import Papa from 'papaparse';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';

interface DailyStat {
  count: number; // words
}

interface Stats {
  totalCount: number;
  daily: { [date: string]: DailyStat };
}

const renderHighlightedWord = (wordObj: WordState) => {
  const word = wordObj.word;
  const p = (wordObj.prefix || '').replace(/[^a-zA-Z]/g, '').toLowerCase();
  const r = (wordObj.root_core || '').replace(/[^a-zA-Z]/g, '').toLowerCase();
  const s = (wordObj.suffix || '').replace(/[^a-zA-Z]/g, '').toLowerCase();

  if (!p && !r && !s) return word;

  const colors = new Array(word.length).fill('');
  const lowerWord = word.toLowerCase();

  // 1. Prefix
  if (p) {
    if (lowerWord.startsWith(p)) {
      for (let i = 0; i < p.length; i++) colors[i] = 'text-blue-400';
    } else {
      const idx = lowerWord.indexOf(p);
      if (idx !== -1) {
        for (let i = idx; i < idx + p.length; i++) colors[i] = 'text-blue-400';
      }
    }
  }

  // 2. Suffix
  if (s) {
    if (lowerWord.endsWith(s)) {
      for (let i = word.length - s.length; i < word.length; i++) colors[i] = 'text-amber-400';
    } else {
      const idx = lowerWord.lastIndexOf(s);
      if (idx !== -1) {
        for (let i = idx; i < idx + s.length; i++) colors[i] = 'text-amber-400';
      }
    }
  }

  // 3. Root
  if (r) {
    let startSearch = 0;
    if (p && lowerWord.startsWith(p)) startSearch = p.length;
    
    let idx = lowerWord.indexOf(r, startSearch);
    if (idx === -1) idx = lowerWord.indexOf(r);
    
    if (idx !== -1) {
      for (let i = idx; i < idx + r.length; i++) {
        colors[i] = 'text-emerald-400';
      }
    }
  }

  const spans = [];
  let currentSpan = '';
  let currentColor = colors[0];

  for (let i = 0; i < word.length; i++) {
    if (colors[i] === currentColor) {
      currentSpan += word[i];
    } else {
      if (currentSpan) {
        let meaning = null;
        if (currentColor === 'text-emerald-400' && wordObj.root_meaning) {
          meaning = wordObj.root_meaning;
        }

        spans.push(
          <span key={i} className={`${currentColor || ''} relative inline-block`}>
            {currentSpan}
            {meaning && (
              <span className="absolute left-1/2 -translate-x-1/2 top-full mt-2 text-sm text-zinc-400 whitespace-nowrap font-sans font-normal tracking-normal pointer-events-none select-none">
                {meaning}
              </span>
            )}
          </span>
        );
      }
      currentSpan = word[i];
      currentColor = colors[i];
    }
  }
  if (currentSpan) {
    let meaning = null;
    if (currentColor === 'text-emerald-400' && wordObj.root_meaning) {
      meaning = wordObj.root_meaning;
    }

    spans.push(
      <span key="last" className={`${currentColor || ''} relative inline-block`}>
        {currentSpan}
        {meaning && (
          <span className="absolute left-1/2 -translate-x-1/2 top-full mt-2 text-sm text-zinc-400 whitespace-nowrap font-sans font-normal tracking-normal pointer-events-none select-none">
            {meaning}
          </span>
        )}
      </span>
    );
  }

  return <>{spans}</>;
};

export default function App() {
  const [words, setWords] = useState<WordState[]>([]);
  const masteredCount = words.filter(w => w.is_mastered).length;
  const [currentWord, setCurrentWord] = useState<WordState | null>(null);
  const [input, setInput] = useState('');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [isDictationMode, setIsDictationMode] = useState(() => {
    return localStorage.getItem('ebbinghaus_dictation_mode') === 'true';
  });
  const [isEbbinghausMode, setIsEbbinghausMode] = useState(() => {
    return localStorage.getItem('ebbinghaus_mode') === 'true';
  });
  const [activeList, setActiveList] = useState<string>(() => {
    return localStorage.getItem('ebbinghaus_active_list') || 'Default List';
  });
  
  const [history, setHistory] = useState<string[]>([]);
  const [isViewingHistory, setIsViewingHistory] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isHinted, setIsHinted] = useState(false);
  const [sessionErrors, setSessionErrors] = useState<Set<string>>(new Set());
  
  useEffect(() => {
    setHasError(false);
    setIsHinted(false);
  }, [currentWord?.id]);
  
  useEffect(() => {
    localStorage.setItem('ebbinghaus_active_list', activeList);
    setHistory([]);
    setIsViewingHistory(false);
    setSessionErrors(new Set());
  }, [activeList]);

  useEffect(() => {
    localStorage.setItem('ebbinghaus_dictation_mode', isDictationMode.toString());
  }, [isDictationMode]);

  useEffect(() => {
    localStorage.setItem('ebbinghaus_mode', isEbbinghausMode.toString());
  }, [isEbbinghausMode]);

  // Modals state
  const [listToRename, setListToRename] = useState<string | null>(null);
  const [newListName, setNewListName] = useState('');
  const [listToDelete, setListToDelete] = useState<string | null>(null);
  const [isEditingWord, setIsEditingWord] = useState(false);
  const [editingWordData, setEditingWordData] = useState<WordState | null>(null);
  const [isEnrichingEdit, setIsEnrichingEdit] = useState(false);

  // Load words on mount
  useEffect(() => {
    const loadedWords = loadWords();
    setWords(loadedWords);
  }, []);

  // Migration: Ensure all mastered words are in the 'Mastered Words' list
  useEffect(() => {
    if (words.length === 0) return;
    const needsMigration = words.some(w => w.is_mastered && w.listName !== 'Mastered Words');
    if (needsMigration) {
      const migratedWords = words.map(w => 
        w.is_mastered ? { ...w, listName: 'Mastered Words' } : w
      );
      setWords(migratedWords);
      saveWords(migratedWords);
    }
  }, [words]);

  const lists = useMemo(() => {
    const now = Date.now();
    const listMap = new Map<string, boolean>();
    const namesSet = new Set<string>();
    
    words.forEach(w => {
      const name = w.listName || 'Default List';
      namesSet.add(name);
      
      if (listMap.get(name)) return;
      
      const due = isWordDue(w, isDictationMode, now);
      if (due) {
        listMap.set(name, true);
      } else if (!listMap.has(name)) {
        listMap.set(name, false);
      }
    });

    if (masteredCount > 0) {
      namesSet.add('Mastered Words');
    }
    
    // Force "Mastered Words" to be present so user can see it
    namesSet.add('Mastered Words');

    const uniqueNames = Array.from(namesSet);
    if (uniqueNames.length === 0) return [{ name: 'Default List', isDue: false }];
    
    // Sort: Default List first, then alphabetical, Mastered Words last
    uniqueNames.sort((a, b) => {
      if (a === 'Default List') return -1;
      if (b === 'Default List') return 1;
      if (a === 'Mastered Words') return 1;
      if (b === 'Mastered Words') return -1;
      return a.localeCompare(b);
    });

    return uniqueNames.map(name => ({
      name,
      isDue: listMap.get(name) || false
    }));
  }, [words, isDictationMode]);

  const activeListLabel = useMemo(() => {
    const list = lists.find(l => l.name === activeList);
    if (!list) return activeList;
    return `${list.name === 'Mastered Words' ? '✅ ' : (list.isDue ? '🟡 ' : '')}${list.name}`;
  }, [lists, activeList]);

  const filteredWords = useMemo(() => {
    return words.filter(w => (w.listName || 'Default List') === activeList);
  }, [words, activeList]);

  // Game State
  const [isGameMode, setIsGameMode] = useState(false);
  const [playedGameWordIds, setPlayedGameWordIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('playedGameWordIds');
      if (stored) return new Set(JSON.parse(stored));
    } catch (e) {}
    return new Set();
  });
  const [gameWords, setGameWords] = useState<WordState[]>([]);
  const [currentGameIdx, setCurrentGameIdx] = useState(0);
  const [gameInput, setGameInput] = useState<string[]>([]); // Array of characters for the blanks
  const [gameBlanks, setGameBlanks] = useState<number[]>([]); // Indices of the blanks
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [showCombo, setShowCombo] = useState(false);
  const [gameStatus, setGameStatus] = useState<'playing' | 'correct' | 'finished'>('playing');
  const [isPeeking, setIsPeeking] = useState(false);
  const [showRootDetective, setShowRootDetective] = useState(false);

  // Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!searchTerm.trim() || isSearching) return;
    const normalizedTerm = searchTerm.trim();
    
    // Check if word exists
    const existingWord = words.find(w => w.word.toLowerCase() === normalizedTerm.toLowerCase());
    
    if (existingWord) {
      // If word exists, switch to its list and set as current word
      setActiveList(existingWord.listName || 'Default List');
      setCurrentWord(existingWord);
      // If it's already completed (or not due in Ebbinghaus mode), we might want to see it anyway
      let isCompleted = false;
      if (isEbbinghausMode) {
        isCompleted = !isWordDue(existingWord, isDictationMode, Date.now());
      } else {
        isCompleted = isDictationMode ? existingWord.is_completed_dictation : existingWord.is_completed_normal;
      }
      
      if (isCompleted) {
        setIsViewingHistory(true);
      } else {
        setIsViewingHistory(false);
      }
      setInput('');
      setSearchTerm('');
    } else {
      setIsSearching(true);
      try {
        // Fetch word details using AI
        const enriched = await enrichWords([normalizedTerm]);
        const details = enriched[0] || {};
        
        // If word doesn't exist, add to "search records" list
        const newWord: WordState = {
          id: crypto.randomUUID(),
          word: normalizedTerm,
          meaning: details.meaning || '', 
          part_of_speech: details.part_of_speech || '',
          phonetic: details.phonetic || '',
          prefix: details.prefix || '',
          prefix_meaning: details.prefix_meaning || '',
          root_core: details.root_core || '',
          root_meaning: details.root_meaning || '',
          suffix: details.suffix || '',
          suffix_meaning: details.suffix_meaning || '',
          phrase: details.phrase || '',
          example_sentence: details.example_sentence || '',
          review_count: 0,
          last_review_time: 0,
          has_error: false,
          is_completed_normal: false,
          is_completed_dictation: false,
          ebbinghaus_stage: 0,
          listName: 'search records'
        };
        
        const updatedWords = [...words, newWord];
        setWords(updatedWords);
        saveWords(updatedWords);
        setActiveList('search records');
        setCurrentWord(newWord);
        setIsViewingHistory(false);
        setInput('');
        setSearchTerm('');
      } catch (error) {
        console.error("Search enrichment failed:", error);
        // Fallback to empty word if AI fails
        const newWord: WordState = {
          id: crypto.randomUUID(),
          word: normalizedTerm,
          meaning: '', 
          part_of_speech: '',
          prefix: '',
          prefix_meaning: '',
          root_core: '',
          root_meaning: '',
          suffix: '',
          suffix_meaning: '',
          phrase: '',
          example_sentence: '',
          review_count: 0,
          last_review_time: 0,
          has_error: false,
          is_completed_normal: false,
          is_completed_dictation: false,
          ebbinghaus_stage: 0,
          listName: 'search records'
        };
        const updatedWords = [...words, newWord];
        setWords(updatedWords);
        saveWords(updatedWords);
        setActiveList('search records');
        setCurrentWord(newWord);
        setIsViewingHistory(false);
        setInput('');
        setSearchTerm('');
      } finally {
        setIsSearching(false);
      }
    }
  }, [searchTerm, words, isDictationMode, isSearching]);

  // Statistics State
  const [stats, setStats] = useState<Stats>(() => {
    const saved = localStorage.getItem('ebbinghaus_stats');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse stats', e);
      }
    }
    return { totalCount: 0, daily: {} };
  });
  const [showStats, setShowStats] = useState(false);
  const [sessionWordCount, setSessionWordCount] = useState(0);

  // Update stats in localStorage
  useEffect(() => {
    localStorage.setItem('ebbinghaus_stats', JSON.stringify(stats));
  }, [stats]);

  // Trigger effect on every 5 combo with increasing intensity
  useEffect(() => {
    if (combo > 0 && combo % 5 === 0 && gameStatus === 'correct') {
      const milestone = combo / 5;
      const intensity = Math.min(milestone, 5); // Cap intensity scaling for physics stability
      
      // Base particle count increases with combo
      const count = 150 + (milestone * 100);
      
      const defaults = {
        origin: { y: 0.7 },
        zIndex: 1000,
        scalar: 0.7 + (milestone * 0.2), // Particles get slightly larger
      };

      function fire(particleRatio: number, opts: any) {
        confetti({
          ...defaults,
          ...opts,
          particleCount: Math.floor(count * particleRatio)
        });
      }

      // Pattern 1: Side Cannons (Starts at 5)
      if (milestone >= 1) {
        fire(0.25, {
          spread: 26 + (milestone * 5),
          startVelocity: 55 + (milestone * 2),
          origin: { x: 0.2, y: 0.8 }
        });
        fire(0.25, {
          spread: 26 + (milestone * 5),
          startVelocity: 55 + (milestone * 2),
          origin: { x: 0.8, y: 0.8 }
        });
      }

      // Pattern 2: Center Blast (Starts at 10)
      if (milestone >= 2) {
        fire(0.2, {
          spread: 60 + (milestone * 10),
          origin: { x: 0.5, y: 0.7 },
          gravity: 1.2
        });
      }

      // Pattern 3: Wide Shower (Starts at 15)
      if (milestone >= 3) {
        fire(0.35, {
          spread: 100 + (milestone * 20),
          decay: 0.91,
          scalar: 1.2,
          origin: { x: 0.5, y: 0.4 }
        });
      }

      // Pattern 4: Random Bursts (Starts at 20+)
      if (milestone >= 4) {
        const bursts = Math.min(milestone, 8);
        for(let i = 0; i < bursts; i++) {
          setTimeout(() => {
            confetti({
              ...defaults,
              particleCount: 40,
              spread: 360,
              startVelocity: 30,
              origin: { x: Math.random(), y: Math.random() * 0.5 }
            });
          }, i * 100);
        }
      }
    }
  }, [combo, gameStatus]);

  const setupWordGame = useCallback((wordObj: WordState) => {
    const word = wordObj.word;
    const len = word.length;
    
    const indices = Array.from({ length: len }, (_, i) => i);
    // Don't blank spaces or hyphens
    const validIndices = indices.filter(i => /[a-zA-Z]/.test(word[i]));
    
    // Determine how many blanks based on word length
    // At least 2 blanks, or all characters if word is very short
    let numBlanks = Math.max(2, Math.ceil(len * 0.35));
    numBlanks = Math.min(numBlanks, validIndices.length);
    
    const shuffledIndices = [...validIndices].sort(() => Math.random() - 0.5);
    const selectedBlanks = shuffledIndices.slice(0, numBlanks).sort((a, b) => a - b);
    
    setGameBlanks(selectedBlanks);
    setGameInput(new Array(selectedBlanks.length).fill(''));
    setGameStatus('playing');
  }, []);

  const startGame = useCallback(() => {
    if (filteredWords.length === 0) {
      showToast("当前列表没有单词，无法开始游戏。");
      return;
    }

    let availableWords = filteredWords.filter(w => !playedGameWordIds.has(w.id));
    
    if (availableWords.length === 0) {
      showToast("列表中的单词已全部复习完毕，开启新一轮！");
      availableWords = [...filteredWords];
      
      const currentListIds = new Set(filteredWords.map(w => w.id));
      setPlayedGameWordIds(prev => {
        const next = new Set(prev);
        currentListIds.forEach(id => next.delete(id));
        localStorage.setItem('playedGameWordIds', JSON.stringify(Array.from(next)));
        return next;
      });
    }

    // Shuffle and pick up to 20 words
    const shuffled = [...availableWords].sort(() => Math.random() - 0.5).slice(0, 20);
    
    setPlayedGameWordIds(prev => {
      const next = new Set(prev);
      shuffled.forEach(w => next.add(w.id));
      localStorage.setItem('playedGameWordIds', JSON.stringify(Array.from(next)));
      return next;
    });

    setGameWords(shuffled);
    setCurrentGameIdx(0);
    setCombo(0);
    setMaxCombo(0);
    setIsGameMode(true);
    setGameStatus('playing');
    setupWordGame(shuffled[0]);
  }, [filteredWords, playedGameWordIds, setupWordGame]);

  const handleGameInput = useCallback((char: string) => {
    if (gameStatus !== 'playing') return;

    const currentBlankIdx = gameInput.findIndex(val => val === '');
    if (currentBlankIdx === -1) return;

    const targetChar = gameWords[currentGameIdx].word[gameBlanks[currentBlankIdx]];
    
    if (char.toLowerCase() === targetChar.toLowerCase()) {
      // Correct
      const newInput = [...gameInput];
      newInput[currentBlankIdx] = char;
      setGameInput(newInput);
      playKeystrokeSound(char);

      // Check if word is complete
      if (currentBlankIdx === gameBlanks.length - 1) {
        setGameStatus('correct');
        const newCombo = combo + 1;
        const isMilestone = newCombo % 5 === 0;
        setCombo(newCombo);
        setMaxCombo(m => Math.max(m, newCombo));

        setShowCombo(true);
        playComboSound(newCombo);
        speakWordAndExample(gameWords[currentGameIdx].word, gameWords[currentGameIdx].example_sentence);

        // Update stats and word progress
        const now = Date.now();
        const currentWord = gameWords[currentGameIdx];
        const today = new Date().toISOString().split('T')[0];

        setStats(prev => {
          const daily = { ...prev.daily };
          if (!daily[today]) daily[today] = { count: 0 };
          return {
            ...prev,
            totalCount: prev.totalCount + 1,
            daily: {
              ...daily,
              [today]: {
                ...daily[today],
                count: daily[today].count + 1
              }
            }
          };
        });
        setSessionWordCount(prev => prev + 1);

        const updatedWords = words.map(w => 
          w.id === currentWord.id 
            ? { ...w, review_count: w.review_count + 1, last_review_time: now } 
            : w
        );
        setWords(updatedWords);
        saveWords(updatedWords);
        
        const delay = isMilestone ? (2000 + (Math.floor(newCombo / 5) - 1) * 1000) : 1200;
        setTimeout(() => {
          setShowCombo(false);
          const nextIdx = currentGameIdx + 1;
          if (nextIdx < gameWords.length) {
            setCurrentGameIdx(nextIdx);
            setupWordGame(gameWords[nextIdx]);
            setGameStatus('playing');
          } else {
            setGameStatus('finished');
          }
        }, delay);
      }
    } else {
      // Wrong
      setCombo(0);
      // Visual feedback for wrong? Maybe shake?
      playKeystrokeSound(char); // Or a different sound? User asked for mechanical keyboard sound for typing.
    }
  }, [gameStatus, gameInput, gameWords, currentGameIdx, gameBlanks, combo, setupWordGame, words, setWords, saveWords, setStats, setSessionWordCount]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isGameMode || gameStatus !== 'playing') return;
      if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
        handleGameInput(e.key);
      }
      if (e.key === 'Escape') {
        setIsGameMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGameMode, gameStatus, handleGameInput]);

  const currentWordId = currentWord?.id;

  // Update current word when words change or transition finishes
  useEffect(() => {
    if (!isTransitioning) {
      if (filteredWords.length > 0) {
        // Prevent auto-jumping if the current word is still valid
        const isCurrentWordStillValid = currentWordId && filteredWords.some(w => {
          if (w.id !== currentWordId) return false;
          if (isViewingHistory) return true;
          
          if (isEbbinghausMode) {
            return isWordDue(w, isDictationMode, Date.now());
          }
          
          return isDictationMode ? !w.is_completed_dictation : !w.is_completed_normal;
        });

        if (isCurrentWordStillValid) {
          return;
        }

        const next = getNextWordToReview(
          filteredWords, 
          isDictationMode, 
          isEbbinghausMode,
          activeList === 'Mastered Words'
        );
        
        if (next) {
          if (next.id !== currentWordId) {
            if (currentWordId && !isViewingHistory) {
              setHistory(prev => {
                if (prev[prev.length - 1] === currentWordId) return prev;
                return [...prev, currentWordId];
              });
            }
            setInput('');
            setIsViewingHistory(false);
            // Speak the word when it appears
            speakWordAndExample(next.word, next.example_sentence);
          }
          setCurrentWord(next);
        } else {
          setCurrentWord(null);
        }
      } else {
        setCurrentWord(null);
      }
    }
  }, [filteredWords, isTransitioning, currentWordId, isViewingHistory, isDictationMode, isEbbinghausMode]);

  const handleBack = useCallback(() => {
    let newHistory = [...history];
    let prevWord;
    
    while (newHistory.length > 0 && !prevWord) {
      const prevId = newHistory.pop();
      prevWord = filteredWords.find(w => w.id === prevId);
    }
    
    setHistory(newHistory);
    
    if (prevWord) {
      setIsViewingHistory(true);
      setCurrentWord(prevWord);
      setInput('');
      speakWordAndExample(prevWord.word, prevWord.example_sentence);
    }
  }, [history, filteredWords]);

  const handleSkip = useCallback(() => {
    if (!currentWord) return;
    
    setIsTransitioning(true);
    
    if (isViewingHistory) {
      setTimeout(() => {
        setCurrentWord(null);
        setIsTransitioning(false);
        setInput('');
        setIsViewingHistory(false);
      }, 200);
      return;
    }
    
    // Move current word to the end of the list so it appears later
    const updatedWords = [...words];
    const currentIndex = updatedWords.findIndex(w => w.id === currentWord.id);
    if (currentIndex !== -1) {
      const [wordToMove] = updatedWords.splice(currentIndex, 1);
      updatedWords.push(wordToMove);
      setWords(updatedWords);
      saveWords(updatedWords);
    }
    
    setTimeout(() => {
      setHistory(prev => {
        if (prev[prev.length - 1] === currentWord.id) return prev;
        return [...prev, currentWord.id];
      });
      setCurrentWord(null);
      setIsTransitioning(false);
      setInput('');
      setIsViewingHistory(false);
    }, 200);
  }, [currentWord, words, isViewingHistory]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!currentWord || isTransitioning || showImport || listToRename || listToDelete) return;

      // Don't handle keys if user is typing in an input/select
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) return;

      // Ignore modifier keys
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      // Handle arrow keys for navigation
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleBack();
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (currentWord.phrase) {
          speakWord(currentWord.phrase);
        } else {
          speakWord(currentWord.word);
        }
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (currentWord.example_sentence) {
          speakWord(currentWord.example_sentence);
        } else {
          speakWord(currentWord.word);
        }
        return;
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleSkip();
        return;
      }

      // Handle backspace
      if (e.key === 'Backspace') {
        setInput(prev => prev.slice(0, -1));
        playKeystrokeSound(e.key);
        return;
      }

      // Handle Space to read phrase
      if (e.key === ' ') {
        const targetWord = currentWord.word;
        // If the next character to type is NOT a space, trigger speech
        if (targetWord[input.length] !== ' ') {
          e.preventDefault();
          if (currentWord.phrase) {
            speakWord(currentWord.phrase);
          } else {
            speakWord(currentWord.word);
          }
          return;
        }
      }

      // Handle Shift to read example sentence
      if (e.key === 'Shift') {
        e.preventDefault();
        if (currentWord.example_sentence) {
          speakWord(currentWord.example_sentence);
        } else if (currentWord.phrase) {
          speakWord(currentWord.phrase);
        } else {
          speakWord(currentWord.word);
        }
        return;
      }

      // Handle PageDown to read word
      if (e.key === 'PageDown') {
        e.preventDefault();
        speakWordAndExample(currentWord.word, currentWord.example_sentence);
        return;
      }

      // Handle letter input (only allow letters and spaces/hyphens if they are in the word)
      if (e.key.length === 1) {
        const targetWord = currentWord.word;
        
        // Check for error (only in dictation mode)
        if (isDictationMode && e.key !== targetWord[input.length]) {
          setHasError(true);
        }

        // Only accept input if we haven't typed the full word yet
        if (input.length < targetWord.length) {
          setInput(prev => prev + e.key);
          playKeystrokeSound(e.key);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentWord, input, isTransitioning, showImport, listToRename, listToDelete, isDictationMode, handleBack, handleSkip]);

  // Check for completion
  useEffect(() => {
    if (!currentWord || isTransitioning) return;

    if (input === currentWord.word) {
      handleWordComplete();
    }
  }, [input, currentWord, isTransitioning]);

  const handleWordComplete = useCallback(() => {
    if (!currentWord) return;
    
    setIsTransitioning(true);
    playSuccessSound();

    // Update word state
    const now = Date.now();
    const isErrorThisTime = isDictationMode && (hasError || isHinted);
    
    if (isErrorThisTime) {
      setSessionErrors(prev => new Set(prev).add(currentWord.id));
    } else {
      // If completed successfully without error/hint, remove from session errors
      setSessionErrors(prev => {
        if (prev.has(currentWord.id)) {
          const next = new Set(prev);
          next.delete(currentWord.id);
          return next;
        }
        return prev;
      });
    }

    // If we are in review phase (all completed), and this was successful without error/hint, clear has_error
    const allOthersCompleted = filteredWords.every(w => w.id === currentWord.id || (isDictationMode ? w.is_completed_dictation : w.is_completed_normal));
    const shouldClearError = allOthersCompleted && !isErrorThisTime;

    const updatedWord: WordState = {
      ...currentWord,
      review_count: isErrorThisTime ? currentWord.review_count : currentWord.review_count + 1,
      last_review_time: now,
      has_error: shouldClearError ? false : (isErrorThisTime || currentWord.has_error),
      is_completed_normal: isDictationMode ? currentWord.is_completed_normal : true,
      is_completed_dictation: isDictationMode ? true : currentWord.is_completed_dictation,
      ebbinghaus_stage: isErrorThisTime 
        ? Math.max(0, (currentWord.ebbinghaus_stage || 0) - 1) 
        : Math.min(9, (currentWord.ebbinghaus_stage || 0) + 1),
    };

    const updatedWords = words.map(w => w.id === currentWord.id ? updatedWord : w);
    setWords(updatedWords);
    saveWords(updatedWords);

    // Update stats
    const today = new Date().toISOString().split('T')[0];
    setStats(prev => {
      const daily = { ...prev.daily };
      if (!daily[today]) daily[today] = { count: 0 };
      return {
        ...prev,
        totalCount: prev.totalCount + 1,
        daily: {
          ...daily,
          [today]: {
            ...daily[today],
            count: daily[today].count + 1
          }
        }
      };
    });
    setSessionWordCount(prev => prev + 1);

    // Pause before next word
    setTimeout(() => {
      setIsTransitioning(false);
      setInput('');
      setIsViewingHistory(false);
      setHasError(false);
      setIsHinted(false);
    }, 500);
  }, [currentWord, words, isDictationMode, hasError, isHinted, filteredWords]);

  const handleRemoveDuplicates = () => {
    if (words.length === 0) return;
    
    const wordMap = new Map<string, WordState>();
    let removedCount = 0;

    // Sort words so that we keep the one with more progress if duplicates exist
    // Higher ebbinghaus_stage or review_count first
    const sortedWords = [...words].sort((a, b) => {
      if ((b.ebbinghaus_stage || 0) !== (a.ebbinghaus_stage || 0)) {
        return (b.ebbinghaus_stage || 0) - (a.ebbinghaus_stage || 0);
      }
      return (b.review_count || 0) - (a.review_count || 0);
    });

    sortedWords.forEach(w => {
      const key = w.word.toLowerCase().trim();
      if (!wordMap.has(key)) {
        wordMap.set(key, w);
      } else {
        removedCount++;
      }
    });

    if (removedCount === 0) {
      showToast("未发现重复单词。");
      return;
    }

    const uniqueWords = Array.from(wordMap.values());
    setWords(uniqueWords);
    saveWords(uniqueWords);
    
    // If current word was removed, reset it
    if (currentWord && !uniqueWords.some(w => w.id === currentWord.id)) {
      setCurrentWord(null);
      setInput('');
    }
    
    showToast(`清理完成，删除了 ${removedCount} 个重复单词。`);
  };

  const handleUpdateWord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWordData) return;

    const updatedWords = words.map(w => w.id === editingWordData.id ? editingWordData : w);
    setWords(updatedWords);
    saveWords(updatedWords);
    setCurrentWord(editingWordData);
    setIsEditingWord(false);
    setEditingWordData(null);
    showToast(`已更新单词 "${editingWordData.word}"`);
  };

  const handleEnrichEditingWord = async () => {
    if (!editingWordData?.word.trim() || isEnrichingEdit) return;
    setIsEnrichingEdit(true);
    try {
      const enriched = await enrichWords([editingWordData.word.trim()]);
      const details = enriched[0];
      if (details) {
        setEditingWordData({
          ...editingWordData,
          meaning: details.meaning || editingWordData.meaning,
          part_of_speech: details.part_of_speech || editingWordData.part_of_speech,
          phonetic: details.phonetic || editingWordData.phonetic,
          prefix: details.prefix || editingWordData.prefix,
          prefix_meaning: details.prefix_meaning || editingWordData.prefix_meaning,
          root_core: details.root_core || editingWordData.root_core,
          root_meaning: details.root_meaning || editingWordData.root_meaning,
          suffix: details.suffix || editingWordData.suffix,
          suffix_meaning: details.suffix_meaning || editingWordData.suffix_meaning,
          phrase: details.phrase || editingWordData.phrase,
          example_sentence: details.example_sentence || editingWordData.example_sentence,
        });
        showToast(`已通过 AI 更新单词 "${editingWordData.word}" 的详细信息`);
      }
    } catch (error) {
      showToast("AI 更新失败，请检查网络或 API Key");
    } finally {
      setIsEnrichingEdit(false);
    }
  };

  const startReview = () => {
    const updatedWords = words.map(w => {
      if (sessionErrors.has(w.id)) {
        return { 
          ...w, 
          is_completed_normal: isDictationMode ? w.is_completed_normal : false,
          is_completed_dictation: isDictationMode ? false : w.is_completed_dictation
        };
      }
      return w;
    });
    setWords(updatedWords);
    saveWords(updatedWords);
  };

  const resetProgress = () => {
    const updatedWords = words.map(w => {
      if ((w.listName || 'Default List') === activeList) {
        return { ...w, is_completed_normal: false, is_completed_dictation: false, has_error: false };
      }
      return w;
    });
    setWords(updatedWords);
    saveWords(updatedWords);
    setSessionErrors(new Set());
    setCurrentWord(null);
  };

  const progress = useMemo(() => {
    if (filteredWords.length === 0) return 0;
    
    if (isEbbinghausMode) {
      // In Ebbinghaus mode, progress is how many words are NOT due for review
      const now = Date.now();
      
      const notDue = filteredWords.filter(w => {
        if (w.is_mastered && activeList !== 'Mastered Words') return true;
        
        const stage = w.ebbinghaus_stage || 0;
        if (stage === 0) return false;
        
        const lastReview = w.last_review_time || 0;
        const interval = EBBINGHAUS_INTERVALS[stage] || EBBINGHAUS_INTERVALS[EBBINGHAUS_INTERVALS.length - 1];
        return now - lastReview < interval;
      }).length;
      
      return Math.round((notDue / filteredWords.length) * 100);
    }

    const completed = filteredWords.filter(w => isDictationMode ? w.is_completed_dictation : w.is_completed_normal).length;
    return Math.round((completed / filteredWords.length) * 100);
  }, [filteredWords, isDictationMode, isEbbinghausMode, activeList]);

  const triggerFireworks = useCallback(() => {
    const duration = 5 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      // since particles fall down, start a bit higher than random
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
  }, []);

  const lastCompletedRef = React.useRef<string | null>(null);

  useEffect(() => {
    const completionKey = `${activeList}-${progress}`;
    if (!currentWord && filteredWords.length > 0 && progress === 100 && lastCompletedRef.current !== completionKey) {
      triggerFireworks();
      lastCompletedRef.current = completionKey;
    } else if (currentWord) {
      lastCompletedRef.current = null;
    }
  }, [currentWord, filteredWords.length, progress, triggerFireworks, activeList]);

  const handleExport = () => {
    if (words.length === 0) {
      showToast("当前没有单词可以导出。");
      return;
    }

    // Prepare data for export with Chinese headers and Excel formula protection
    const exportData = words.map(({ word, part_of_speech, phonetic, prefix, prefix_meaning, root_core, root_meaning, suffix, suffix_meaning, meaning, phrase, example_sentence, listName }) => {
      // Helper to prevent Excel from interpreting fields starting with -, =, +, @ as formulas
      const sanitize = (val: string | undefined | null) => {
        const s = val || '';
        if (s.startsWith('-') || s.startsWith('=') || s.startsWith('+') || s.startsWith('@')) {
          return `'${s}`;
        }
        return s;
      };

      return {
        '单词': sanitize(word),
        '词性': sanitize(part_of_speech),
        '音标': sanitize(phonetic),
        '前缀': sanitize(prefix),
        '前缀含义': sanitize(prefix_meaning),
        '词根核心': sanitize(root_core),
        '词根含义': sanitize(root_meaning),
        '后缀': sanitize(suffix),
        '后缀含义': sanitize(suffix_meaning),
        '释义': sanitize(meaning),
        '词组': sanitize(phrase),
        '例句': sanitize(example_sentence),
        '列表名称': sanitize(listName)
      };
    });

    const csv = Papa.unparse(exportData);
    // Add BOM for Excel UTF-8 support
    const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `全部单词备份_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`已导出全部 ${words.length} 个单词到本地。`);
  };

  const handleBackup = () => {
    if (words.length === 0) {
      showToast("当前没有数据可以备份。");
      return;
    }

    const backupData = {
      words,
      stats: JSON.parse(localStorage.getItem('ebbinghaus_stats') || '{}'),
      exportDate: new Date().toISOString(),
      version: '1.0'
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `词库全量备份_${new Date().toISOString().split('T')[0]}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`已生成全量备份文件（含学习记录）。`);
  };

  const handleImport = (importedWords: WordState[], importedStats?: Stats) => {
    // Merge with existing words, avoiding duplicates by word text
    const existingWordsMap = new Map<string, WordState>(words.map(w => [w.word.toLowerCase(), w]));
    
    let newCount = 0;
    let updatedCount = 0;
    for (const w of importedWords) {
      if (!existingWordsMap.has(w.word.toLowerCase())) {
        existingWordsMap.set(w.word.toLowerCase(), w);
        newCount++;
      } else {
        // Update existing word with new details if it was re-imported
        const existing = existingWordsMap.get(w.word.toLowerCase())!;
        
        // If the imported word has progress, we might want to use it
        const useImportedProgress = (w.review_count || 0) > (existing.review_count || 0);

        existingWordsMap.set(w.word.toLowerCase(), { 
          ...existing, 
          ...w,
          id: existing.id, // Preserve the original ID
          review_count: useImportedProgress ? w.review_count : existing.review_count,
          last_review_time: useImportedProgress ? w.last_review_time : existing.last_review_time,
          is_completed_normal: useImportedProgress ? w.is_completed_normal : existing.is_completed_normal,
          is_completed_dictation: useImportedProgress ? w.is_completed_dictation : existing.is_completed_dictation,
          ebbinghaus_stage: useImportedProgress ? w.ebbinghaus_stage : (existing.ebbinghaus_stage || 0),
          has_error: existing.has_error
        });
        updatedCount++;
      }
    }

    const mergedWords = Array.from(existingWordsMap.values());
    setWords(mergedWords);
    saveWords(mergedWords);

    // Restore stats if available
    if (importedStats && typeof importedStats === 'object' && !Array.isArray(importedStats)) {
      setStats(prev => {
        const mergedDaily = { ...prev.daily };
        if (importedStats.daily) {
          for (const date in importedStats.daily) {
            if (!mergedDaily[date] || importedStats.daily[date].count > mergedDaily[date].count) {
              mergedDaily[date] = importedStats.daily[date];
            }
          }
        }
        return {
          totalCount: Math.max(prev.totalCount, importedStats.totalCount || 0),
          daily: mergedDaily
        };
      });
    }
    
    if (currentWord) {
      const updatedCurrent = existingWordsMap.get(currentWord.word.toLowerCase());
      if (updatedCurrent) {
        setCurrentWord(updatedCurrent);
      }
    }
    
    if (importedWords.length > 0) {
      const newListName = importedWords[0].listName || 'Default List';
      setActiveList(newListName);
    }
    
    setShowImport(false);
    if (updatedCount > 0) {
      showToast(`导入成功，新增了 ${newCount} 个单词，更新了 ${updatedCount} 个单词。`);
    } else {
      showToast(`导入成功，新增了 ${newCount} 个单词。`);
    }
  };

  const handleRenameList = () => {
    if (!listToRename || !newListName.trim()) return;
    
    const finalNewName = newListName.trim();
    const updatedWords = words.map(w => {
      const currentListName = w.listName || 'Default List';
      if (currentListName === listToRename) {
        return { ...w, listName: finalNewName };
      }
      return w;
    });

    setWords(updatedWords);
    saveWords(updatedWords);
    setActiveList(finalNewName);
    setListToRename(null);
    showToast(`列表已重命名为 "${finalNewName}"`);
  };

  const handleDeleteList = () => {
    if (!listToDelete) return;

    const updatedWords = words.filter(w => (w.listName || 'Default List') !== listToDelete);
    setWords(updatedWords);
    saveWords(updatedWords);
    
    // Find next available list
    const remainingLists = Array.from(new Set(updatedWords.map(w => w.listName || 'Default List')));
    setActiveList(remainingLists[0] || 'Default List');
    
    setListToDelete(null);
    showToast(`列表 "${listToDelete}" 已删除`);
  };

  const handleDeleteCurrentWord = useCallback(() => {
    if (!currentWord) return;
    const updatedWords = words.filter(w => w.id !== currentWord.id);
    setWords(updatedWords);
    saveWords(updatedWords);
    showToast(`已删除单词 "${currentWord.word}"`);
  }, [currentWord, words]);

  const handleMasterWord = useCallback(() => {
    if (!currentWord) return;
    
    setIsTransitioning(true);
    
    const updatedWords = words.map(w => 
      w.id === currentWord.id ? { ...w, is_mastered: true, listName: 'Mastered Words' } : w
    );
    
    setWords(updatedWords);
    saveWords(updatedWords);
    showToast(`已标记 "${currentWord.word}" 为已学会，并移至 "Mastered Words" 列表`);
    
    // Transition to next word manually instead of calling handleSkip to avoid state race
    setTimeout(() => {
      setHistory(prev => {
        if (prev[prev.length - 1] === currentWord.id) return prev;
        return [...prev, currentWord.id];
      });
      setCurrentWord(null);
      setIsTransitioning(false);
      setInput('');
      setIsViewingHistory(false);
    }, 200);
  }, [currentWord, words]);

  const showToast = (msg: string) => {
    setImportMessage(msg);
    setTimeout(() => setImportMessage(null), 3000);
  };

  const renderInputFeedback = () => {
    if (!currentWord) return null;
    
    const target = currentWord.word;
    
    return (
      <div className="flex justify-center space-x-1 mt-8 text-3xl font-mono tracking-widest">
        {target.split('').map((char, i) => {
          const inputChar = input[i];
          let colorClass = 'text-zinc-700'; // Not typed yet
          
          if (inputChar !== undefined) {
            colorClass = inputChar === char ? 'text-emerald-400' : 'text-rose-500';
          }
          
          return (
            <span key={i} className={`${colorClass} transition-colors duration-150`}>
              {inputChar !== undefined ? inputChar : '_'}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-emerald-500/30">
      {/* Header */}
      <header className="p-6 flex flex-col space-y-4">
        <div className="flex justify-between items-center relative">
          <div className="flex items-center space-x-4">
            <div 
              className={`flex items-center space-x-2 transition-colors ${masteredCount > 0 ? 'cursor-pointer hover:opacity-80' : ''}`}
              onClick={() => {
                if (masteredCount > 0) {
                  setActiveList('Mastered Words');
                }
              }}
            >
              <Database size={18} className="text-white" />
              <div className="flex flex-col">
                <span className="text-sm font-bold tracking-wider leading-none mb-1 text-white">
                  total: {masteredCount}/{words.length}
                </span>
                <span className="text-sm font-medium tracking-wide text-zinc-100 leading-none">
                  {filteredWords.length} in list
                </span>
              </div>
            </div>
            
            {/* List Selector */}
            {words.length > 0 && (
              <div className="flex items-center space-x-2">
                <div className="relative inline-grid items-center">
                  <span className="invisible px-3 pr-8 py-1.5 text-sm whitespace-pre col-start-1 row-start-1">
                    {activeListLabel}
                  </span>
                  <select 
                    value={activeList}
                    onChange={(e) => {
                      setActiveList(e.target.value);
                      (e.target as HTMLSelectElement).blur();
                    }}
                    className="col-start-1 row-start-1 w-full h-full appearance-none bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm rounded-lg pl-3 pr-8 py-1.5 focus:outline-none focus:border-emerald-500/50 cursor-pointer"
                  >
                    {lists.map(list => (
                      <option key={list.name} value={list.name}>
                        {list.name === 'Mastered Words' ? '✅ ' : (list.isDue ? '🟡 ' : '')}{list.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                </div>
                
                {activeList && (
                  <div className="flex items-center space-x-1">
                    <button 
                      onClick={handleExport}
                      className="p-1.5 text-zinc-500 hover:text-blue-400 hover:bg-zinc-900 rounded-md transition-colors"
                      title="Download List as CSV (Words only)"
                    >
                      <Download size={14} />
                    </button>
                    <button 
                      onClick={handleBackup}
                      className="p-1.5 text-zinc-500 hover:text-emerald-400 hover:bg-zinc-900 rounded-md transition-colors"
                      title="Full Backup as JSON (Includes learning records)"
                    >
                      <Save size={14} />
                    </button>
                    <button 
                      onClick={handleRemoveDuplicates}
                      className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-zinc-900 rounded-md transition-colors"
                      title="Remove Duplicate Words (Global)"
                    >
                      <CopyX size={14} />
                    </button>
                    <button 
                      onClick={() => {
                        setNewListName(activeList);
                        setListToRename(activeList);
                      }}
                      className="p-1.5 text-zinc-500 hover:text-emerald-400 hover:bg-zinc-900 rounded-md transition-colors"
                      title="Rename List"
                    >
                      <Pencil size={14} />
                    </button>
                    <button 
                      onClick={() => setListToDelete(activeList)}
                      className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-zinc-900 rounded-md transition-colors"
                      title="Delete List"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Search Bar */}
            <div className="w-full max-w-[192px] hidden md:block">
              <div className="relative group">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch();
                    }
                  }}
                  placeholder="Search or add word"
                  className="w-full bg-zinc-900/50 border border-zinc-500 rounded-full py-1.5 pl-4 pr-10 text-sm text-zinc-300 focus:outline-none focus:border-white focus:bg-zinc-900 transition-all"
                />
                <button
                  onClick={handleSearch}
                  disabled={isSearching}
                  className={`absolute right-1 top-1/2 -translate-y-1/2 p-1.5 transition-colors ${
                    isSearching ? 'text-emerald-500 animate-pulse' : 'text-zinc-500 hover:text-emerald-400'
                  }`}
                  title="Search or Add Word"
                >
                  <Search size={16} />
                </button>
              </div>
            </div>
            
            <button
              onClick={() => setIsEbbinghausMode(!isEbbinghausMode)}
              className={`p-2 rounded-full border transition-colors flex items-center justify-center ${
                isEbbinghausMode
                  ? 'border-amber-500 text-amber-400 bg-amber-500/10'
                  : 'border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 hover:bg-zinc-900'
              }`}
              title={isEbbinghausMode ? "Disable Ebbinghaus Mode" : "Enable Ebbinghaus Mode"}
            >
              <Brain size={18} />
            </button>
            <button
              onClick={() => setIsDictationMode(!isDictationMode)}
              className={`p-2 rounded-full border transition-colors flex items-center justify-center ${
                isDictationMode
                  ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                  : 'border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 hover:bg-zinc-900'
              }`}
              title={isDictationMode ? "Disable Dictation Mode" : "Enable Dictation Mode"}
            >
              <Headphones size={18} />
            </button>
            <button
              onClick={() => {
                if (isGameMode) setIsGameMode(false);
                else startGame();
              }}
              className={`p-2 rounded-full border transition-colors flex items-center justify-center ${
                isGameMode
                  ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                  : 'border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 hover:bg-zinc-900'
              }`}
              title="Word Game"
            >
              <Gamepad2 size={18} />
            </button>
            <button
              onClick={() => setShowRootDetective(true)}
              className="p-2 rounded-full border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 hover:bg-zinc-900 transition-colors flex items-center justify-center"
              title="Root Detective"
            >
              <BookOpen size={18} />
            </button>
            <button
              onClick={() => setShowStats(true)}
              className="p-2 rounded-full border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 hover:bg-zinc-900 transition-colors flex items-center justify-center"
              title="Statistics"
            >
              <BarChart2 size={18} />
            </button>
            <button
              onClick={() => setShowImport(true)}
              className="text-sm font-medium text-zinc-400 hover:text-white transition-colors px-4 py-2 rounded-full border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900"
            >
              Import Data
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        {filteredWords.length > 0 && (
          <div className="w-full max-w-3xl mx-auto">
            <div className="flex justify-between items-center mb-1.5 px-1">
              <span className="text-[10px] font-mono tracking-widest text-zinc-500">progress</span>
              <span className="text-[10px] font-mono text-emerald-500">{progress}%</span>
            </div>
            <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-emerald-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 w-full max-w-3xl mx-auto">
        <AnimatePresence mode="wait">
          {currentWord ? (
            <motion.div
              key={currentWord.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="w-full text-center"
            >
              {/* Main Word */}
              <div className="relative inline-block mb-6 min-w-[200px]">
                {history.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleBack();
                    }}
                    className="absolute top-1/2 -translate-y-1/2 -left-16 md:-left-24 p-2 text-zinc-500 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-full transition-colors focus:outline-none"
                    title="Previous word (ArrowLeft)"
                    tabIndex={-1}
                  >
                    <ArrowLeft size={24} />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handleSkip();
                  }}
                  className="absolute top-1/2 -translate-y-1/2 -right-16 md:-right-24 p-2 text-zinc-500 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-full transition-colors focus:outline-none"
                  title="Skip to next word (ArrowRight)"
                  tabIndex={-1}
                >
                  <ArrowRight size={24} />
                </button>
                {isDictationMode ? (
                  <div className="relative flex flex-col items-center justify-center h-[72px] md:h-[96px] w-full px-8">
                    {/* Ghost word to ensure container width matches word width, preventing arrow overlap */}
                    <h1 className="text-4xl md:text-5xl font-medium tracking-tight opacity-0 pointer-events-none select-none whitespace-nowrap">
                      {currentWord.word}
                    </h1>
                    <motion.div 
                      animate={{ 
                        y: isHinted ? -40 : 0,
                        scale: isHinted ? 0.6 : 1,
                        opacity: isHinted ? 0.5 : 1
                      }}
                      className="absolute flex justify-center items-center cursor-pointer text-emerald-500 hover:text-emerald-400 transition-colors z-10"
                      onClick={(e) => {
                        e.preventDefault();
                        if (!isHinted) {
                          setHasError(true);
                          speakWordAndExample(currentWord.word, currentWord.example_sentence);
                        }
                        setIsHinted(!isHinted);
                      }}
                      title={isHinted ? "Click to hide word" : "Click to reveal word & listen"}
                    >
                      <Headphones size={64} />
                    </motion.div>
                    
                    <motion.h1 
                      initial={false}
                      animate={{ 
                        opacity: isHinted ? 1 : 0, 
                        scale: isHinted ? 1 : 0.9,
                        y: isHinted ? 10 : 0
                      }}
                      className="absolute text-4xl md:text-5xl font-medium tracking-tight text-white flex items-center justify-center pointer-events-none whitespace-nowrap"
                    >
                      {renderHighlightedWord(currentWord)}
                    </motion.h1>
                  </div>
                ) : (
                  <h1 className="text-5xl md:text-6xl font-medium tracking-tight text-white">
                    {renderHighlightedWord(currentWord)}
                  </h1>
                )}
              </div>

              {/* Word Actions */}
              <div className="flex justify-center items-center space-x-4 mt-8 mb-8">
                {!currentWord.is_mastered && activeList !== 'Mastered Words' && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleMasterWord();
                    }}
                    className="p-1.5 text-zinc-500 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-full transition-colors focus:outline-none"
                    title="I've mastered this word"
                    tabIndex={-1}
                  >
                    <CheckCircle2 size={14} />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setEditingWordData({ ...currentWord });
                    setIsEditingWord(true);
                  }}
                  className="p-1.5 text-zinc-500 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-full transition-colors focus:outline-none"
                  title="Edit this word"
                  tabIndex={-1}
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handleDeleteCurrentWord();
                  }}
                  className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-400/10 rounded-full transition-colors focus:outline-none"
                  title="Delete this word"
                  tabIndex={-1}
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Auxiliary Info */}
              <div className="flex flex-col items-center space-y-3 mb-12">
                <div className="flex items-center space-x-2">
                  {currentWord.part_of_speech && (
                    <span className="text-xs font-mono lowercase tracking-widest text-white/80 bg-emerald-400/10 px-3 py-1 rounded-full">
                      {currentWord.part_of_speech}
                    </span>
                  )}
                  {currentWord.phonetic && (
                    <span className="text-sm font-mono text-zinc-400">
                      {currentWord.phonetic}
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      speakWordAndExample(currentWord.word, currentWord.example_sentence);
                    }}
                    className="p-1.5 text-zinc-500 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-full transition-colors focus:outline-none"
                    title="Listen to pronunciation (PageDown)"
                    tabIndex={-1}
                  >
                    <Volume2 size={16} />
                  </button>
                </div>
                {currentWord.meaning && (
                  <p className="text-xl text-zinc-300 font-medium">
                    {currentWord.meaning}
                  </p>
                )}
                {(currentWord.prefix || currentWord.root_core || currentWord.suffix) ? (
                  <div className="mt-4 font-mono text-zinc-400 text-sm flex flex-wrap justify-center items-center gap-1">
                    {currentWord.prefix && (
                      <span>{currentWord.prefix} {currentWord.prefix_meaning && `(${currentWord.prefix_meaning})`}</span>
                    )}
                    {currentWord.prefix && (currentWord.root_core || currentWord.suffix) && <span> + </span>}
                    {currentWord.root_core && (
                      <span>{currentWord.root_core} {currentWord.root_meaning && `(${currentWord.root_meaning})`}</span>
                    )}
                    {currentWord.root_core && currentWord.suffix && <span> + </span>}
                    {currentWord.suffix && (
                      <span>{currentWord.suffix} {currentWord.suffix_meaning && `(${currentWord.suffix_meaning})`}</span>
                    )}
                  </div>
                ) : null}
                {currentWord.phrase && (
                  <div className="flex items-center justify-center space-x-2 mt-2">
                    <p className="text-lg text-emerald-400/90 font-medium">
                      {isDictationMode 
                        ? currentWord.phrase.replace(new RegExp(currentWord.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '___')
                        : currentWord.phrase}
                    </p>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        speakWord(currentWord.phrase!);
                      }}
                      className="p-1 text-zinc-500 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-full transition-colors focus:outline-none"
                      title="Listen to phrase (Space / ArrowUp)"
                      tabIndex={-1}
                    >
                      <Volume2 size={14} />
                    </button>
                  </div>
                )}
                {currentWord.example_sentence && (
                  <div className="flex items-start justify-center space-x-2 mt-4 max-w-lg">
                    <p className="text-sm text-zinc-300 italic leading-relaxed">
                      "{isDictationMode 
                        ? currentWord.example_sentence.replace(new RegExp(currentWord.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '___')
                        : currentWord.example_sentence}"
                    </p>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        speakWord(currentWord.example_sentence!);
                      }}
                      className="mt-0.5 p-1 text-zinc-500 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-full transition-colors focus:outline-none flex-shrink-0"
                      title="Listen to example sentence (Shift / ArrowDown)"
                      tabIndex={-1}
                    >
                      <Volume2 size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* Input Feedback */}
              {renderInputFeedback()}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center flex flex-col items-center"
            >
              {filteredWords.length > 0 ? (
                <div className="bg-zinc-900/50 backdrop-blur-xl p-12 rounded-3xl border border-zinc-800 w-full max-w-lg">
                  {isEbbinghausMode ? (
                    <>
                      <Clock className="text-amber-500 mx-auto mb-6" size={64} />
                      <h2 className="text-3xl font-bold text-white mb-2">All Caught Up!</h2>
                      <p className="text-zinc-400 mb-10">No words are due for review based on the Ebbinghaus curve. Come back later or try another list!</p>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="text-emerald-500 mx-auto mb-6" size={64} />
                      <h2 className="text-3xl font-bold text-white mb-2">Congratulations!</h2>
                      <p className="text-zinc-400 mb-10">You have finished all words in <span className="text-white font-medium">"{activeList}"</span>.</p>
                    </>
                  )}
                  
                  <div className="flex flex-col space-y-3">
                    {!isEbbinghausMode && sessionErrors.size > 0 && (
                      <button
                        onClick={startReview}
                        className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-2xl transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                      >
                        Review Errors Now
                      </button>
                    )}
                    <button
                      onClick={resetProgress}
                      className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-2xl transition-all"
                    >
                      Restart List
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <Database className="text-zinc-700 mb-4" size={48} />
                  <h2 className="text-2xl font-medium text-white mb-2">List is empty</h2>
                  <p className="text-zinc-400 mb-8 max-w-md">
                    There are no words in this list. Import some words to start learning!
                  </p>
                  <button
                    onClick={() => setShowImport(true)}
                    className="bg-white text-black px-6 py-3 rounded-full font-medium hover:bg-zinc-200 transition-colors"
                  >
                    Import Words
                  </button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer / Status */}
      <footer className="p-6 flex justify-center">
        {currentWord && (
          <div className="flex items-center space-x-2 text-zinc-600 text-xs font-mono">
            <Clock size={14} />
            <span>Review #{currentWord.review_count}</span>
          </div>
        )}
      </footer>

      {/* Modals & Toasts */}
      {showImport && (
        <ImportModal
          onImport={handleImport}
          onClose={() => setShowImport(false)}
          existingWords={words}
        />
      )}

      <StatsModal
        isOpen={showStats}
        onClose={() => setShowStats(false)}
        stats={stats}
      />

      {/* Rename List Modal */}
      {listToRename && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-medium text-white mb-4">Rename List</h3>
            <input
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-300 focus:outline-none focus:border-emerald-500/50 mb-6"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameList();
                if (e.key === 'Escape') setListToRename(null);
              }}
            />
            <div className="flex space-x-3">
              <button 
                onClick={() => setListToRename(null)} 
                className="flex-1 py-2 rounded-xl text-sm font-medium text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleRenameList} 
                className="flex-1 py-2 rounded-xl text-sm font-medium text-zinc-900 bg-emerald-500 hover:bg-emerald-400 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete List Modal */}
      {listToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-medium text-white mb-2">Delete List</h3>
            <p className="text-sm text-zinc-400 mb-6">
              Are you sure you want to delete <span className="text-white font-medium">"{listToDelete}"</span>? This will remove all words in this list. This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <button 
                onClick={() => setListToDelete(null)} 
                className="flex-1 py-2 rounded-xl text-sm font-medium text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteList} 
                className="flex-1 py-2 rounded-xl text-sm font-medium text-white bg-rose-500 hover:bg-rose-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Word Modal */}
      <AnimatePresence>
        {isEditingWord && editingWordData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">编辑单词</h2>
                <button 
                  onClick={() => setIsEditingWord(false)}
                  className="text-zinc-500 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleUpdateWord} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">单词</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editingWordData.word}
                      onChange={(e) => setEditingWordData({ ...editingWordData, word: e.target.value })}
                      className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-zinc-100 focus:outline-none focus:border-emerald-500/50"
                      required
                    />
                    <button
                      type="button"
                      onClick={handleEnrichEditingWord}
                      disabled={isEnrichingEdit || !editingWordData.word.trim()}
                      className={`px-3 rounded-lg flex items-center justify-center transition-all ${
                        isEnrichingEdit 
                          ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                          : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20'
                      }`}
                      title="AI 自动补全"
                    >
                      {isEnrichingEdit ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">词性</label>
                    <input
                      type="text"
                      value={editingWordData.part_of_speech}
                      onChange={(e) => setEditingWordData({ ...editingWordData, part_of_speech: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-zinc-100 focus:outline-none focus:border-emerald-500/50"
                      placeholder="n. / v. / adj."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">列表名称</label>
                    <input
                      type="text"
                      value={editingWordData.listName || ''}
                      onChange={(e) => setEditingWordData({ ...editingWordData, listName: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-zinc-100 focus:outline-none focus:border-emerald-500/50"
                      placeholder="Default List"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">音标</label>
                    <input
                      type="text"
                      value={editingWordData.phonetic || ''}
                      onChange={(e) => setEditingWordData({ ...editingWordData, phonetic: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-zinc-100 focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>
                  <div className="flex items-center space-x-2 pt-6">
                    <input
                      type="checkbox"
                      id="edit-mastered"
                      checked={editingWordData.is_mastered || false}
                      onChange={(e) => {
                        const isMastered = e.target.checked;
                        setEditingWordData({ 
                          ...editingWordData, 
                          is_mastered: isMastered,
                          listName: isMastered ? 'Mastered Words' : (editingWordData.listName === 'Mastered Words' ? 'Default List' : editingWordData.listName)
                        });
                      }}
                      className="w-4 h-4 bg-zinc-950 border-zinc-800 rounded text-emerald-500 focus:ring-emerald-500/50"
                    />
                    <label htmlFor="edit-mastered" className="text-sm font-medium text-zinc-300 cursor-pointer">已学会</label>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">前缀</label>
                    <input
                      type="text"
                      value={editingWordData.prefix || ''}
                      onChange={(e) => setEditingWordData({ ...editingWordData, prefix: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-zinc-100 focus:outline-none focus:border-emerald-500/50"
                      placeholder="pre-"
                    />
                    <input
                      type="text"
                      value={editingWordData.prefix_meaning || ''}
                      onChange={(e) => setEditingWordData({ ...editingWordData, prefix_meaning: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 mt-1 text-xs text-zinc-400 focus:outline-none focus:border-emerald-500/50"
                      placeholder="前缀含义"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">词根</label>
                    <input
                      type="text"
                      value={editingWordData.root_core || ''}
                      onChange={(e) => setEditingWordData({ ...editingWordData, root_core: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-zinc-100 focus:outline-none focus:border-emerald-500/50"
                      placeholder="dict"
                    />
                    <input
                      type="text"
                      value={editingWordData.root_meaning || ''}
                      onChange={(e) => setEditingWordData({ ...editingWordData, root_meaning: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 mt-1 text-xs text-zinc-400 focus:outline-none focus:border-emerald-500/50"
                      placeholder="词根含义"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">后缀</label>
                    <input
                      type="text"
                      value={editingWordData.suffix || ''}
                      onChange={(e) => setEditingWordData({ ...editingWordData, suffix: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-zinc-100 focus:outline-none focus:border-emerald-500/50"
                      placeholder="-ion"
                    />
                    <input
                      type="text"
                      value={editingWordData.suffix_meaning || ''}
                      onChange={(e) => setEditingWordData({ ...editingWordData, suffix_meaning: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 mt-1 text-xs text-zinc-400 focus:outline-none focus:border-emerald-500/50"
                      placeholder="后缀含义"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">词组</label>
                  <input
                    type="text"
                    value={editingWordData.phrase || ''}
                    onChange={(e) => setEditingWordData({ ...editingWordData, phrase: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-zinc-100 focus:outline-none focus:border-emerald-500/50"
                    placeholder="Common phrase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">释义</label>
                  <textarea
                    value={editingWordData.meaning}
                    onChange={(e) => setEditingWordData({ ...editingWordData, meaning: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-zinc-100 focus:outline-none focus:border-emerald-500/50 h-20 resize-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">例句</label>
                  <textarea
                    value={editingWordData.example_sentence || ''}
                    onChange={(e) => setEditingWordData({ ...editingWordData, example_sentence: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-zinc-100 focus:outline-none focus:border-emerald-500/50 h-20 resize-none"
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsEditingWord(false)}
                    className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-bold transition-colors"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-colors"
                  >
                    保存修改
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {importMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-6 py-3 rounded-full shadow-lg font-medium text-sm z-50"
          >
            {importMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isGameMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-zinc-950 flex flex-col items-center justify-center p-6"
          >
            <button 
              onClick={() => setIsGameMode(false)}
              className="absolute top-8 right-8 p-2 text-zinc-500 hover:text-white transition-colors"
            >
              <X size={32} />
            </button>

            <div className="w-full max-w-3xl text-center">
              {gameStatus === 'finished' ? (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="space-y-6"
                >
                  <Gamepad2 size={80} className="mx-auto text-indigo-500 mb-4" />
                  <h2 className="text-4xl font-bold text-white">游戏结束!</h2>
                  <p className="text-zinc-400 text-xl">太棒了，你完成了所有挑战。</p>
                  <div className="text-6xl font-black text-indigo-400">
                    MAX COMBO: {maxCombo}
                  </div>
                  <button
                    onClick={startGame}
                    className="mt-8 px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-bold transition-colors"
                  >
                    再玩一次
                  </button>
                </motion.div>
              ) : (
                <>
                  <div className="mb-12 max-w-2xl mx-auto">
                    <div className="text-zinc-500 font-mono text-sm mb-2">
                      WORD {currentGameIdx + 1} / {gameWords.length}
                    </div>
                    <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-500 transition-all duration-300"
                        style={{ width: `${((currentGameIdx + 1) / gameWords.length) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="relative pt-20 pb-12 flex flex-col items-center justify-center">
                    <AnimatePresence>
                      {showCombo && combo > 1 && (
                        <motion.div
                          initial={{ scale: 0.5, opacity: 0, y: 20 }}
                          animate={{ 
                            scale: combo % 5 === 0 ? [1, 1.2, 1.1] : 1, 
                            opacity: 1, 
                            y: -80,
                            rotate: combo % 5 === 0 ? [0, -5, 5, 0] : 0
                          }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                          exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.4 } }}
                          className="absolute left-1/2 -translate-x-1/2 pointer-events-none z-10 flex flex-col items-center"
                        >
                          {combo % 5 === 0 && (
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ 
                                opacity: [0, 1, 0.8, 1],
                                scale: [0.9, 1.1, 1],
                              }}
                              transition={{ duration: 0.8 }}
                              className="text-5xl md:text-7xl font-black italic tracking-tighter drop-shadow-2xl text-amber-400 mb-1"
                              style={{
                                textShadow: `0 0 ${Math.min(combo * 2, 60)}px rgba(251, 191, 36, 0.9)`
                              }}
                            >
                              {combo >= 20 ? 'GODLIKE!!' : combo >= 15 ? 'LEGENDARY!' : combo >= 10 ? 'AMAZING!' : 'GREAT!'}
                            </motion.div>
                          )}
                          
                          <div className={`font-bold uppercase tracking-[0.3em] transition-all duration-300 ${
                            combo % 5 === 0 ? 'text-amber-200 text-base' : 'text-indigo-400 text-sm'
                          }`}>
                            {combo} COMBO!
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="text-5xl md:text-7xl font-bold tracking-widest text-white flex justify-center flex-wrap gap-x-2">
                      {gameWords[currentGameIdx]?.word.split('').map((char, i) => {
                        const isBlank = gameBlanks.includes(i);
                        if (isBlank) {
                          const blankIdx = gameBlanks.indexOf(i);
                          const isCurrent = gameInput.findIndex(v => v === '') === blankIdx;
                          return (
                            <span 
                              key={i} 
                              className={`inline-block min-w-[1ch] border-b-4 mx-0.5 transition-all duration-200 ${
                                gameInput[blankIdx] 
                                  ? 'border-indigo-500 text-indigo-400' 
                                  : isCurrent ? 'border-zinc-400' : 'border-zinc-800 text-transparent'
                              }`}
                            >
                              {gameInput[blankIdx] || (isPeeking ? <span className="opacity-30">{char}</span> : ' ')}
                            </span>
                          );
                        }
                        return <span key={i} className="text-zinc-600">{char}</span>;
                      })}
                    </div>
                  </div>

                  <div className="flex justify-center mb-10">
                    <button
                      onMouseDown={() => setIsPeeking(true)}
                      onMouseUp={() => setIsPeeking(false)}
                      onMouseLeave={() => setIsPeeking(false)}
                      onTouchStart={(e) => { e.preventDefault(); setIsPeeking(true); }}
                      onTouchEnd={() => setIsPeeking(false)}
                      className={`p-3 rounded-full transition-all duration-200 ${
                        isPeeking 
                          ? 'bg-indigo-600 text-white scale-95' 
                          : 'bg-zinc-900 text-zinc-500 hover:text-indigo-400 hover:bg-zinc-800'
                      }`}
                      title="Hold to peek"
                    >
                      <Eye size={24} />
                    </button>
                  </div>

                  <div className="mt-0">
                    <p className="text-2xl text-zinc-300 font-medium mb-2">
                      {gameWords[currentGameIdx]?.meaning}
                    </p>
                    <p className="text-zinc-500 font-mono italic">
                      {gameWords[currentGameIdx]?.part_of_speech}
                    </p>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showRootDetective && (
        <RootDetectiveGame 
          words={filteredWords} 
          allWords={words}
          onClose={() => setShowRootDetective(false)} 
        />
      )}

      <div className="fixed bottom-4 right-6 text-[10px] text-zinc-600/60 font-mono pointer-events-none select-none">
        Rev 3.8 Designed by robin.yj.ye@gmail.com in Mar 2026
      </div>
    </div>
  );
}
