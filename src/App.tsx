/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { WordState } from './utils/word';
import { loadWords, saveWords, getNextWordToReview } from './utils/storage';
import { playKeystrokeSound, playSuccessSound, speakWord } from './utils/audio';
import { ImportModal } from './components/ImportModal';
import { Database, CheckCircle2, Clock, ChevronDown, Pencil, Trash2, Volume2, Headphones, ArrowLeft, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';

export default function App() {
  const [words, setWords] = useState<WordState[]>([]);
  const [currentWord, setCurrentWord] = useState<WordState | null>(null);
  const [input, setInput] = useState('');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [isDictationMode, setIsDictationMode] = useState(() => {
    return localStorage.getItem('ebbinghaus_dictation_mode') === 'true';
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

  // Modals state
  const [listToRename, setListToRename] = useState<string | null>(null);
  const [newListName, setNewListName] = useState('');
  const [listToDelete, setListToDelete] = useState<string | null>(null);

  // Load words on mount
  useEffect(() => {
    const loadedWords = loadWords();
    setWords(loadedWords);
  }, []);

  const lists = useMemo(() => {
    const uniqueLists = Array.from(new Set(words.map(w => w.listName || 'Default List')));
    if (uniqueLists.length === 0) return ['Default List'];
    return uniqueLists;
  }, [words]);

  const filteredWords = useMemo(() => {
    return words.filter(w => (w.listName || 'Default List') === activeList);
  }, [words, activeList]);

  const currentWordId = currentWord?.id;

  // Update current word when words change or transition finishes
  useEffect(() => {
    if (!isTransitioning) {
      if (filteredWords.length > 0) {
        // Prevent auto-jumping if the current word is still valid
        const isCurrentWordStillValid = currentWordId && filteredWords.some(w => 
          w.id === currentWordId && (isViewingHistory || (isDictationMode ? !w.is_completed_dictation : !w.is_completed_normal))
        );

        if (isCurrentWordStillValid) {
          return;
        }

        const next = getNextWordToReview(filteredWords, isDictationMode);
        
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
            speakWord(next.word);
          }
          setCurrentWord(next);
        } else {
          setCurrentWord(null);
        }
      } else {
        setCurrentWord(null);
      }
    }
  }, [filteredWords, isTransitioning, currentWordId, isViewingHistory, isDictationMode]);

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
      speakWord(prevWord.word);
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

      // Ignore modifier keys
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      // Handle arrow keys for navigation
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleBack();
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
        playKeystrokeSound();
        return;
      }

      // Handle Space to read example sentence
      if (e.key === ' ') {
        const targetWord = currentWord.word;
        // If the next character to type is NOT a space, trigger speech
        if (targetWord[input.length] !== ' ') {
          e.preventDefault();
          if (currentWord.example_sentence) {
            speakWord(currentWord.example_sentence);
          } else {
            speakWord(currentWord.word);
          }
          return;
        }
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
          playKeystrokeSound();
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
    };

    const updatedWords = words.map(w => w.id === currentWord.id ? updatedWord : w);
    setWords(updatedWords);
    saveWords(updatedWords);

    // Pause before next word
    setTimeout(() => {
      setIsTransitioning(false);
      setInput('');
      setIsViewingHistory(false);
    }, 500);
  }, [currentWord, words, isDictationMode, hasError, isHinted, filteredWords]);

  const handleResetList = () => {
    const updatedWords = words.map(w => {
      const isInActiveList = (w.listName || 'Default List') === activeList;
      if (isInActiveList) {
        return { ...w, is_completed_normal: false, is_completed_dictation: false, has_error: false };
      }
      return w;
    });
    setWords(updatedWords);
    saveWords(updatedWords);
    setCurrentWord(null);
    setInput('');
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
    const completed = filteredWords.filter(w => isDictationMode ? w.is_completed_dictation : w.is_completed_normal).length;
    return Math.round((completed / filteredWords.length) * 100);
  }, [filteredWords, isDictationMode]);

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

  const handleImport = (importedWords: WordState[]) => {
    // Merge with existing words, avoiding duplicates by word text
    const existingWordsMap = new Map<string, WordState>(words.map(w => [w.word.toLowerCase(), w]));
    
    let newCount = 0;
    for (const w of importedWords) {
      if (!existingWordsMap.has(w.word.toLowerCase())) {
        existingWordsMap.set(w.word.toLowerCase(), w);
        newCount++;
      } else {
        // Update existing word with new details if it was re-imported
        const existing = existingWordsMap.get(w.word.toLowerCase())!;
        existingWordsMap.set(w.word.toLowerCase(), { 
          ...existing, 
          ...w,
          // Keep the existing progress if it was already practiced
          review_count: existing.review_count,
          last_review_time: existing.last_review_time,
          is_completed_normal: existing.is_completed_normal,
          is_completed_dictation: existing.is_completed_dictation,
          has_error: existing.has_error
        });
      }
    }

    const mergedWords = Array.from(existingWordsMap.values());
    setWords(mergedWords);
    saveWords(mergedWords);
    
    if (importedWords.length > 0) {
      const newListName = importedWords[0].listName || 'Default List';
      setActiveList(newListName);
    }
    
    setShowImport(false);
    showToast(`导入成功，新增了 ${newCount} 个单词。`);
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
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-zinc-400">
              <Database size={18} />
              <span className="text-sm font-medium tracking-wide uppercase">
                {filteredWords.length} Words
              </span>
            </div>
            
            {/* List Selector */}
            {words.length > 0 && (
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <select 
                    value={activeList}
                    onChange={(e) => setActiveList(e.target.value)}
                    className="appearance-none bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm rounded-lg pl-3 pr-8 py-1.5 focus:outline-none focus:border-emerald-500/50 cursor-pointer"
                  >
                    {lists.map(list => (
                      <option key={list} value={list}>{list}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                </div>
                
                {activeList && (
                  <div className="flex items-center space-x-1">
                    <button 
                      onClick={handleResetList}
                      className="p-1.5 text-zinc-500 hover:text-amber-400 hover:bg-zinc-900 rounded-md transition-colors"
                      title="Reset List Progress"
                    >
                      <Clock size={14} />
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
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Progress</span>
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
                    title="Previous word"
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
                  title="Skip to next word"
                  tabIndex={-1}
                >
                  <ArrowRight size={24} />
                </button>
                {isDictationMode ? (
                  <div className="flex flex-col items-center">
                    {!isHinted ? (
                      <div 
                        className="flex justify-center items-center h-[72px] md:h-[96px] cursor-pointer text-emerald-500 hover:text-emerald-400 transition-colors"
                        onClick={(e) => {
                          e.preventDefault();
                          setIsHinted(true);
                          speakWord(currentWord.word);
                        }}
                        title="Click to reveal word & listen"
                      >
                        <Headphones size={64} />
                      </div>
                    ) : (
                      <motion.h1 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-4xl md:text-5xl font-medium tracking-tight text-emerald-500 h-[72px] md:h-[96px] flex items-center justify-center"
                      >
                        {currentWord.word}
                      </motion.h1>
                    )}
                  </div>
                ) : (
                  <h1 className="text-7xl md:text-8xl font-medium tracking-tight text-white">
                    {currentWord.word}
                  </h1>
                )}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handleDeleteCurrentWord();
                  }}
                  className="absolute bottom-2 -right-12 p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-400/10 rounded-full transition-colors focus:outline-none"
                  title="Delete this word"
                  tabIndex={-1}
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Auxiliary Info */}
              <div className="flex flex-col items-center space-y-3 mb-12">
                <div className="flex items-center space-x-2">
                  {currentWord.part_of_speech && (
                    <span className="text-xs font-mono lowercase tracking-widest text-emerald-400/80 bg-emerald-400/10 px-3 py-1 rounded-full">
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
                      speakWord(currentWord.word);
                    }}
                    className="p-1.5 text-zinc-500 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-full transition-colors focus:outline-none"
                    title="Listen to pronunciation"
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
                {currentWord.root && (
                  <p className="text-sm text-zinc-500 font-mono">
                    {currentWord.root}
                  </p>
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
                      title="Listen to example sentence"
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
                  <CheckCircle2 className="text-emerald-500 mx-auto mb-6" size={64} />
                  <h2 className="text-3xl font-bold text-white mb-2">Congratulations!</h2>
                  <p className="text-zinc-400 mb-10">You have finished all words in <span className="text-white font-medium">"{activeList}"</span>.</p>
                  
                  <div className="flex flex-col space-y-3">
                    {sessionErrors.size > 0 && (
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
        />
      )}

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

      <div className="fixed bottom-4 right-6 text-[10px] text-zinc-600/60 font-mono pointer-events-none select-none">
        Rev 1.1 Designed by robin.yj.ye@gmail.com in Mar 2026
      </div>
    </div>
  );
}
