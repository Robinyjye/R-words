/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { WordState, calculateNextReviewTime } from './utils/ebbinghaus';
import { loadWords, saveWords, getNextWordToReview } from './utils/storage';
import { playKeystrokeSound, playSuccessSound, speakWord } from './utils/audio';
import { ImportModal } from './components/ImportModal';
import { Database, CheckCircle2, Clock, ChevronDown, Pencil, Trash2, Volume2, Headphones, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
    return localStorage.getItem('ebbinghaus_active_list') || 'All Words';
  });
  
  const [history, setHistory] = useState<string[]>([]);
  const [isViewingHistory, setIsViewingHistory] = useState(false);
  
  useEffect(() => {
    localStorage.setItem('ebbinghaus_active_list', activeList);
    setHistory([]);
    setIsViewingHistory(false);
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
    return ['All Words', ...uniqueLists];
  }, [words]);

  const filteredWords = useMemo(() => {
    if (activeList === 'All Words') return words;
    return words.filter(w => (w.listName || 'Default List') === activeList);
  }, [words, activeList]);

  const currentWordId = currentWord?.id;

  // Update current word when words change or transition finishes
  useEffect(() => {
    if (!isTransitioning) {
      if (filteredWords.length > 0) {
        // Prevent auto-jumping if the current word is still valid and needs review
        const isCurrentWordStillValid = currentWordId && filteredWords.some(w => 
          w.id === currentWordId && 
          (isViewingHistory || w.next_review_time === null || w.next_review_time <= Date.now())
        );

        if (isCurrentWordStillValid) {
          return;
        }

        const next = getNextWordToReview(filteredWords);
        if (next && next.id !== currentWordId) {
          if (currentWordId && !isViewingHistory) {
            setHistory(prev => {
              if (prev[prev.length - 1] === currentWordId) return prev;
              return [...prev, currentWordId];
            });
          }
          setCurrentWord(next);
          setInput('');
          setIsViewingHistory(false);
          // Speak the word when it appears
          speakWord(next.word);
        } else if (!next) {
          setCurrentWord(null);
        }
      } else {
        setCurrentWord(null);
      }
    }
  }, [filteredWords, isTransitioning, currentWordId, isViewingHistory]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!currentWord || isTransitioning || showImport || listToRename || listToDelete) return;

      // Ignore modifier keys
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      // Handle backspace
      if (e.key === 'Backspace') {
        setInput(prev => prev.slice(0, -1));
        playKeystrokeSound();
        return;
      }

      // Handle letter input (only allow letters and spaces/hyphens if they are in the word)
      if (e.key.length === 1) {
        const targetWord = currentWord.word;
        
        // Only accept input if we haven't typed the full word yet
        if (input.length < targetWord.length) {
          setInput(prev => prev + e.key);
          playKeystrokeSound();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentWord, input, isTransitioning, showImport, listToRename, listToDelete]);

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
    const updatedWord: WordState = {
      ...currentWord,
      review_count: currentWord.review_count + 1,
      last_review_time: now,
      next_review_time: calculateNextReviewTime(currentWord.review_count, now),
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
  }, [currentWord, words]);

  const handleBack = useCallback(() => {
    let newHistory = [...history];
    let prevWord;
    
    while (newHistory.length > 0 && !prevWord) {
      const prevId = newHistory.pop();
      prevWord = words.find(w => w.id === prevId);
    }
    
    setHistory(newHistory);
    
    if (prevWord) {
      setIsViewingHistory(true);
      setCurrentWord(prevWord);
      setInput('');
      speakWord(prevWord.word);
    }
  }, [history, words]);

  const handleImport = (importedWords: WordState[]) => {
    // Merge with existing words, avoiding duplicates by word text
    const existingWordsMap = new Map(words.map(w => [w.word.toLowerCase(), w]));
    
    let newCount = 0;
    for (const w of importedWords) {
      if (!existingWordsMap.has(w.word.toLowerCase())) {
        existingWordsMap.set(w.word.toLowerCase(), w);
        newCount++;
      } else {
        // Update existing word to the new list name if it was re-imported
        const existing = existingWordsMap.get(w.word.toLowerCase())!;
        existingWordsMap.set(w.word.toLowerCase(), { ...existing, listName: w.listName });
      }
    }

    const mergedWords = Array.from(existingWordsMap.values());
    setWords(mergedWords);
    saveWords(mergedWords);
    
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
    setActiveList('All Words');
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
      <header className="p-6 flex justify-between items-center">
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
              
              {activeList !== 'All Words' && (
                <div className="flex items-center space-x-1">
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
                {isDictationMode ? (
                  <div 
                    className="flex justify-center items-center h-[72px] md:h-[96px] cursor-pointer text-emerald-500 hover:text-emerald-400 transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      speakWord(currentWord.word);
                    }}
                    title="Listen again"
                  >
                    <Headphones size={64} />
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
                    <span className="text-xs font-mono uppercase tracking-widest text-emerald-400/80 bg-emerald-400/10 px-3 py-1 rounded-full">
                      {currentWord.part_of_speech}
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
                  <p className="text-sm text-zinc-400 italic mt-2 max-w-lg">
                    "{isDictationMode 
                      ? currentWord.example_sentence.replace(new RegExp(currentWord.word, 'gi'), '___')
                      : currentWord.example_sentence}"
                  </p>
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
              <CheckCircle2 className="text-emerald-500 mb-4" size={48} />
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
        Rev 1.0 Designed by robin.yj.ye@gmail.com in Mar 2026
      </div>
    </div>
  );
}
