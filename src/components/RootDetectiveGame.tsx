import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { WordState } from '../utils/word';
import { BookOpen, Heart, Zap, Trophy, X, Play, RotateCcw, Home, CheckCircle2, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { playChimeArpeggio, playSnareDrum } from '../utils/audio';

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}

interface RootDetectiveGameProps {
  words: WordState[];
  allWords: WordState[];
  onClose: () => void;
}

type RootItem = {
  type: 'root' | 'prefix' | 'suffix';
  text: string;
  meaning: string;
  exampleWords: { word: string; translation: string }[];
};

type GameState = 'home' | 'quiz' | 'gameover';

export function RootDetectiveGame({ words, allWords, onClose }: RootDetectiveGameProps) {
  const [gameState, setGameState] = useState<GameState>('home');
  const [lives, setLives] = useState(3);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [score, setScore] = useState(0);
  const [currentItem, setCurrentItem] = useState<RootItem | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [questionCount, setQuestionCount] = useState(0);

  // Extract all valid roots, prefixes, suffixes
  const rootItems = useMemo(() => {
    const itemsMap = new Map<string, RootItem>();
    const activeRoots = new Set<string>();

    // Determine which roots are in the current list
    words.forEach(w => {
      if (w.root_core && w.root_meaning) {
        activeRoots.add(`root:${w.root_core.toLowerCase().trim()}`);
      }
      if (w.prefix && w.prefix_meaning) {
        activeRoots.add(`prefix:${w.prefix.toLowerCase().trim()}`);
      }
      if (w.suffix && w.suffix_meaning) {
        activeRoots.add(`suffix:${w.suffix.toLowerCase().trim()}`);
      }
    });

    // Gather example words from ALL words, but only for active roots
    allWords.forEach(w => {
      if (w.root_core && w.root_meaning) {
        const text = w.root_core.toLowerCase().trim();
        const key = `root:${text}`;
        if (activeRoots.has(key)) {
          if (!itemsMap.has(key)) {
            itemsMap.set(key, { type: 'root', text, meaning: w.root_meaning, exampleWords: [{ word: w.word, translation: w.meaning }] });
          } else {
            const item = itemsMap.get(key)!;
            if (!item.exampleWords.find(ex => ex.word === w.word)) {
              item.exampleWords.push({ word: w.word, translation: w.meaning });
            }
          }
        }
      }
      if (w.prefix && w.prefix_meaning) {
        const text = w.prefix.toLowerCase().trim();
        const key = `prefix:${text}`;
        if (activeRoots.has(key)) {
          if (!itemsMap.has(key)) {
            itemsMap.set(key, { type: 'prefix', text, meaning: w.prefix_meaning, exampleWords: [{ word: w.word, translation: w.meaning }] });
          } else {
            const item = itemsMap.get(key)!;
            if (!item.exampleWords.find(ex => ex.word === w.word)) {
              item.exampleWords.push({ word: w.word, translation: w.meaning });
            }
          }
        }
      }
      if (w.suffix && w.suffix_meaning) {
        const text = w.suffix.toLowerCase().trim();
        const key = `suffix:${text}`;
        if (activeRoots.has(key)) {
          if (!itemsMap.has(key)) {
            itemsMap.set(key, { type: 'suffix', text, meaning: w.suffix_meaning, exampleWords: [{ word: w.word, translation: w.meaning }] });
          } else {
            const item = itemsMap.get(key)!;
            if (!item.exampleWords.find(ex => ex.word === w.word)) {
              item.exampleWords.push({ word: w.word, translation: w.meaning });
            }
          }
        }
      }
    });

    // Sort example words by length (shortest first)
    Array.from(itemsMap.values()).forEach(item => {
      item.exampleWords.sort((a, b) => a.word.length - b.word.length);
    });

    return Array.from(itemsMap.values());
  }, [words, allWords]);

  const allMeanings = useMemo(() => {
    const meanings = new Set<string>();
    allWords.forEach(w => {
      if (w.root_meaning) meanings.add(w.root_meaning);
      if (w.prefix_meaning) meanings.add(w.prefix_meaning);
      if (w.suffix_meaning) meanings.add(w.suffix_meaning);
    });
    return Array.from(meanings);
  }, [allWords]);

  const generateQuestion = useCallback(() => {
    if (rootItems.length < 4) {
      return false;
    }

    const randomItem = rootItems[Math.floor(Math.random() * rootItems.length)];
    const correctMeaning = randomItem.meaning;

    // Get 3 random distractors
    const distractors = allMeanings.filter(m => m !== correctMeaning);
    const shuffledDistractors = distractors.sort(() => Math.random() - 0.5).slice(0, 3);
    
    // If we don't have enough distractors, pad with defaults
    const defaultDistractors = ['弯曲 (bend)', '破裂 (break)', '关闭 (close)', '结束, 边界 (end, limit)', '看 (look)', '说 (speak)', '做 (make)', '走 (go)'];
    while (shuffledDistractors.length < 3) {
      const randomDefault = defaultDistractors[Math.floor(Math.random() * defaultDistractors.length)];
      if (!shuffledDistractors.includes(randomDefault) && randomDefault !== correctMeaning) {
        shuffledDistractors.push(randomDefault);
      }
    }

    const finalOptions = [correctMeaning, ...shuffledDistractors].sort(() => Math.random() - 0.5);

    setCurrentItem(randomItem);
    setOptions(finalOptions);
    setSelectedOption(null);
    return true;
  }, [rootItems, allMeanings]);

  const TOTAL_QUESTIONS = Math.min(20, rootItems.length);

  const startGame = () => {
    if (rootItems.length < 4) return;
    setScore(0);
    setLives(3);
    setStreak(0);
    setMaxStreak(0);
    setQuestionCount(0);
    generateQuestion();
    setGameState('quiz');
  };

  const handleOptionClick = (option: string) => {
    if (selectedOption !== null || !currentItem) return;

    setSelectedOption(option);
    const correct = option === currentItem.meaning;

    if (correct) {
      playChimeArpeggio();
      const newStreak = streak + 1;
      setStreak(newStreak);
      setMaxStreak(Math.max(maxStreak, newStreak));
      setScore(score + 10 + newStreak * 2);
      
      if (newStreak > 0 && newStreak % 5 === 0) {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      }
    } else {
      playSnareDrum();
      setStreak(0);
      const newLives = lives - 1;
      setLives(newLives);
      if (newLives <= 0) {
        setTimeout(() => setGameState('gameover'), 1500);
        return;
      }
    }

    setTimeout(() => {
      const nextCount = questionCount + 1;
      if (nextCount >= TOTAL_QUESTIONS) {
        setQuestionCount(nextCount);
        setGameState('gameover');
      } else {
        setQuestionCount(nextCount);
        generateQuestion();
      }
    }, 1500);
  };

  if (rootItems.length < 4) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md w-full relative text-center shadow-xl">
          <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
          <BookOpen size={48} className="mx-auto text-indigo-500 mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">词根侦探</h2>
          <p className="text-slate-500 mb-6">
            当前列表中的词根/词缀数据不足（需要至少4个）。请先导入更多包含词根信息的单词，或切换到其他列表。
          </p>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-medium transition-colors w-full"
          >
            返回
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md h-[600px] bg-slate-50 text-slate-900 font-sans rounded-3xl shadow-xl border border-slate-200 overflow-hidden flex flex-col relative">
        
        {/* Header */}
        <header className="w-full p-4 flex justify-between items-center bg-white border-b border-slate-100 z-10 shrink-0">
          <div 
            className="flex items-center gap-2 font-bold text-lg text-indigo-600 cursor-pointer"
            onClick={() => setGameState('home')}
          >
            <BookOpen className="w-5 h-5" />
            <span>词根侦探</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            {gameState === 'quiz' && (
              <>
                <div className="flex items-center gap-1 text-rose-500 font-semibold">
                  <Heart className="w-4 h-4 fill-current" />
                  <span>{lives}</span>
                </div>
                <div className="flex items-center gap-1 text-amber-500 font-semibold">
                  <Zap className="w-4 h-4 fill-current" />
                  <span>{streak}</span>
                </div>
                <div className="flex items-center gap-1 text-indigo-600 font-semibold">
                  <Trophy className="w-4 h-4" />
                  <span>{score}</span>
                </div>
              </>
            )}
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors ml-2">
              <X size={20} />
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 w-full p-4 flex flex-col justify-center relative overflow-y-auto">
          <AnimatePresence mode="wait">
            
            {/* HOME SCREEN */}
            {gameState === 'home' && (
              <motion.div 
                key="home"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex flex-col items-center text-center gap-6 my-auto"
              >
                <div className="space-y-3">
                  <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto shadow-sm rotate-3">
                    <BookOpen className="w-10 h-10" />
                  </div>
                  <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                    词根侦探
                  </h1>
                  <p className="text-slate-500 max-w-xs mx-auto text-sm">
                    通过游戏化练习，建立肌肉记忆，轻松掌握英语核心词根。
                  </p>
                </div>

                <div className="w-full space-y-3 mt-4">
                  <button 
                    onClick={startGame}
                    className="w-full py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-semibold transition-all active:scale-95 flex items-center justify-center gap-2 shadow-md shadow-indigo-200"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    挑战模式
                  </button>
                </div>
              </motion.div>
            )}

            {/* QUIZ MODE */}
            {gameState === 'quiz' && currentItem && (
              <motion.div 
                key="quiz"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col h-full gap-4"
              >
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 text-center relative overflow-hidden shrink-0">
                  <div className="absolute top-0 left-0 w-full h-1 bg-slate-100">
                    <motion.div 
                      className="h-full bg-indigo-500"
                      animate={{ width: `${((questionCount + (selectedOption ? 1 : 0)) / TOTAL_QUESTIONS) * 100}%` }}
                      transition={{ duration: 0.5, ease: "easeInOut" }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-1 block mt-1">
                    根据{currentItem.type === 'root' ? '词根' : currentItem.type === 'prefix' ? '前缀' : '后缀'}和例词选择含义
                  </span>
                  <h2 className="text-4xl font-black text-slate-800 mb-4">
                    {currentItem.text}
                  </h2>
                  <div className="flex flex-wrap justify-center gap-1.5 max-h-24 overflow-y-auto custom-scrollbar">
                    {currentItem.exampleWords.map((ex, i) => (
                      <span key={i} className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium flex items-center gap-1">
                        <span>{ex.word}</span>
                        {ex.translation && <span className="text-slate-400">({ex.translation})</span>}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid gap-2 overflow-y-auto pb-2">
                  {options.map((option, idx) => {
                    const isSelected = selectedOption === option;
                    const isTarget = option === currentItem.meaning;
                    
                    let buttonClass = "bg-white border-2 border-slate-200 text-slate-700 hover:border-indigo-300";
                    let icon = null;

                    if (selectedOption !== null) {
                      if (isTarget) {
                        buttonClass = "bg-emerald-50 border-emerald-500 text-emerald-700";
                        icon = <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
                      } else if (isSelected) {
                        buttonClass = "bg-rose-50 border-rose-500 text-rose-700";
                        icon = <XCircle className="w-5 h-5 text-rose-500" />;
                      } else {
                        buttonClass = "bg-slate-50 border-slate-200 text-slate-400 opacity-50";
                      }
                    }

                    return (
                      <button
                        key={idx}
                        onClick={() => handleOptionClick(option)}
                        disabled={selectedOption !== null}
                        className={cn(
                          "w-full p-3 rounded-2xl font-semibold text-left transition-all flex items-center justify-between text-sm",
                          buttonClass,
                          selectedOption === null && "active:scale-95"
                        )}
                      >
                        <span>{option}</span>
                        {icon}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* GAME OVER */}
            {gameState === 'gameover' && (
              <motion.div 
                key="gameover"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center text-center gap-5 bg-white p-6 rounded-3xl shadow-xl border border-slate-100 my-auto"
              >
                <div className={cn("w-16 h-16 rounded-full flex items-center justify-center", lives > 0 ? "bg-emerald-100 text-emerald-500" : "bg-rose-100 text-rose-500")}>
                  {lives > 0 ? <Trophy className="w-8 h-8" /> : <Heart className="w-8 h-8" />}
                </div>
                
                <div>
                  <h2 className="text-2xl font-black text-slate-800 mb-1">{lives > 0 ? '挑战成功！' : '挑战结束'}</h2>
                  <p className="text-slate-500 text-sm">{lives > 0 ? '你完成了所有题目！' : '你已经做得很棒了！'}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 w-full">
                  <div className="bg-slate-50 p-3 rounded-2xl">
                    <div className="text-slate-400 text-xs font-semibold mb-1">最终得分</div>
                    <div className="text-2xl font-black text-indigo-600">{score}</div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-2xl">
                    <div className="text-slate-400 text-xs font-semibold mb-1">最高连击</div>
                    <div className="text-2xl font-black text-amber-500">{maxStreak}</div>
                  </div>
                </div>

                <div className="w-full space-y-2 mt-2">
                  <button 
                    onClick={startGame}
                    className="w-full py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-semibold transition-all active:scale-95 flex items-center justify-center gap-2 shadow-md"
                  >
                    <RotateCcw className="w-5 h-5" />
                    再来一局
                  </button>
                  <button 
                    onClick={() => setGameState('home')}
                    className="w-full py-3 px-6 bg-white border-2 border-slate-200 hover:bg-slate-50 text-slate-600 rounded-2xl font-semibold transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Home className="w-5 h-5" />
                    返回主页
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

