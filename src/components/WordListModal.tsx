import React, { useState, useMemo, useEffect } from 'react';
import { X, Volume2, ArrowRight, ArrowLeftRight, BookOpen, Undo2, CheckCircle2, Eye, EyeOff, Layers, Database, Clock, RotateCcw, Search } from 'lucide-react';
import { WordState, getPartOfSpeechBadgeClass } from '../utils/word';
import { speakWord, speakWordAndExample } from '../utils/audio';

interface WordListModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeList: string;
  allWords: WordState[];
  currentListWords: WordState[];
  onSelectWord: (word: WordState) => void;
  onReturnWord: (word: WordState) => void;
  onOpenSynonymsModal?: () => void;
}

export const WordListModal: React.FC<WordListModalProps> = ({
  isOpen,
  onClose,
  activeList,
  allWords,
  currentListWords,
  onSelectWord,
  onReturnWord,
  onOpenSynonymsModal,
}) => {
  // Tabs: 'current' | 'mastered'
  const [activeTab, setActiveTab] = useState<'current' | 'mastered'>(() => {
    return activeList === 'Mastered Words' ? 'mastered' : 'current';
  });

  // User explicitly asked: "但不要显示词义", default is false!
  const [showMeanings, setShowMeanings] = useState(false);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

  // Search input query
  const [searchQuery, setSearchQuery] = useState('');

  // Hide word mode (看中忆英)
  const [hideWord, setHideWord] = useState(false);
  const [revealedWordIds, setRevealedWordIds] = useState<Set<string>>(new Set());
  const [activeWordId, setActiveWordId] = useState<string | null>(null);

  // Reset tab when activeList changes
  useEffect(() => {
    if (activeList === 'Mastered Words') {
      setActiveTab('mastered');
    }
  }, [activeList]);

  // Reset revealed states on tab switch
  useEffect(() => {
    setRevealedIds(new Set());
    setRevealedWordIds(new Set());
    setActiveWordId(null);
  }, [activeTab]);

  // Handle ESC key to close and Space key to remove word occlusion
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
        return;
      }

      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        // Remove word occlusion (把单词的遮挡拿掉)
        if (hideWord) {
          if (activeWordId && !revealedWordIds.has(activeWordId)) {
            setRevealedWordIds(prev => {
              const next = new Set(prev);
              next.add(activeWordId);
              return next;
            });
          } else {
            setHideWord(false);
          }
        } else {
          setHideWord(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, hideWord, activeWordId, revealedWordIds]);

  // Mastered words that were transferred specifically from the current active list
  const currentListMasteredWords = useMemo(() => {
    if (activeList === 'Mastered Words') {
      return allWords.filter(w => w.is_mastered === true || w.listName === 'Mastered Words');
    }
    return allWords.filter(w => {
      const isMastered = w.is_mastered === true || w.listName === 'Mastered Words';
      if (!isMastered) return false;
      return w.previousListName === activeList || (!w.previousListName && w.listName === activeList);
    });
  }, [allWords, activeList]);

  // All mastered words across the entire library
  const allMasteredWords = useMemo(() => {
    return allWords.filter(w => w.is_mastered === true || w.listName === 'Mastered Words');
  }, [allWords]);

  const [masteredScope, setMasteredScope] = useState<'current' | 'all'>('current');

  // Source list depending on active tab
  const tabWords = useMemo(() => {
    switch (activeTab) {
      case 'mastered':
        return masteredScope === 'all' ? allMasteredWords : currentListMasteredWords;
      case 'all':
        return allWords;
      case 'current':
      default:
        return currentListWords;
    }
  }, [activeTab, masteredScope, allMasteredWords, currentListMasteredWords, allWords, currentListWords]);

  // Words displayed in current tab, filtered by search query
  const displayedWords = useMemo(() => {
    if (!searchQuery.trim()) {
      return tabWords;
    }
    const q = searchQuery.trim().toLowerCase();
    return tabWords.filter(w => {
      const matchWord = w.word.toLowerCase().includes(q);
      const matchMeaning = !!(w.meaning && w.meaning.toLowerCase().includes(q));
      const matchRoot = !!(w.root_core && w.root_core.toLowerCase().includes(q));
      return matchWord || matchMeaning || matchRoot;
    });
  }, [tabWords, searchQuery]);

  // Map of root_core -> root_meaning across all words for comprehensive lookups
  const rootMeaningsMap = useMemo(() => {
    const map = new Map<string, string>();
    allWords.forEach(w => {
      if (w.root_core && w.root_meaning) {
        map.set(w.root_core.toLowerCase().trim(), w.root_meaning.trim());
      }
    });
    return map;
  }, [allWords]);

  // Ebbinghaus statistics for the current tab list (Image 2)
  const ebbinghausStats = useMemo(() => {
    const total = tabWords.length;
    let stage0 = 0;
    let stageShort = 0; // Stage 1 ~ 3
    let stageMedium = 0; // Stage 4 ~ 6
    let stageLong = 0; // Stage 7 ~ 9

    tabWords.forEach(w => {
      const stage = w.ebbinghaus_stage || 0;
      if (stage === 0) {
        stage0++;
      } else if (stage >= 1 && stage <= 3) {
        stageShort++;
      } else if (stage >= 4 && stage <= 6) {
        stageMedium++;
      } else {
        stageLong++;
      }
    });

    return {
      total,
      stage0: {
        count: stage0,
        percentage: total > 0 ? Math.round((stage0 / total) * 100) : 0,
      },
      stageShort: {
        count: stageShort,
        percentage: total > 0 ? Math.round((stageShort / total) * 100) : 0,
      },
      stageMedium: {
        count: stageMedium,
        percentage: total > 0 ? Math.round((stageMedium / total) * 100) : 0,
      },
      stageLong: {
        count: stageLong,
        percentage: total > 0 ? Math.round((stageLong / total) * 100) : 0,
      },
    };
  }, [tabWords]);

  if (!isOpen) return null;

  const toggleRevealSingle = (id: string) => {
    setRevealedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleRevealWord = (id: string) => {
    setRevealedWordIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3 sm:px-6 sm:py-3.5 border-b border-zinc-800/80 bg-zinc-900/40 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
                <Database size={20} />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  <span>单词列表速览</span>
                  <span className={`text-xs font-mono font-medium px-2 py-0.5 rounded-full border ${
                    hideWord 
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                  }`}>
                    {hideWord ? '看中忆英模式' : '纯词自测模式'}
                  </span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {hideWord 
                    ? '已隐藏英文单词，通过看中文释义回想英文加强记忆'
                    : '默认隐藏词义，专为快速检验英文辨识与一键返回重练设计'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors shrink-0"
              title="关闭 (ESC)"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation Tabs, Search Box, and Display Toggles */}
          <div className="flex items-center justify-between flex-wrap gap-2.5 pt-1 border-t border-zinc-900">
            {/* Tabs */}
            <div className="flex items-center space-x-1.5 bg-zinc-900/90 p-1 rounded-2xl border border-zinc-800/80 text-xs font-medium shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('current')}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                  activeTab === 'current'
                    ? 'bg-zinc-800 text-white font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span>当前列表 ({activeList})</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-zinc-950/60 text-zinc-300">
                  {currentListWords.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('mastered'); setMasteredScope('current'); }}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                  activeTab === 'mastered'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-emerald-400'
                }`}
              >
                <CheckCircle2 size={13} />
                <span>已掌握单词</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-zinc-950/60 text-emerald-300 font-bold">
                  {currentListMasteredWords.length}
                </span>
              </button>
            </div>

            {/* Search Box */}
            <div className="relative flex-1 min-w-[140px] max-w-xs">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="在列表中查找单词..."
                className="w-full pl-8 pr-7 py-1.5 bg-zinc-900/90 hover:bg-zinc-900 focus:bg-zinc-950 border border-zinc-800 focus:border-zinc-700 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-0.5 rounded-full"
                  title="清除检索"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Right Action Toggles */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Hide Word Toggle (看中忆英) */}
              <button
                type="button"
                onClick={() => {
                  const next = !hideWord;
                  setHideWord(next);
                  if (next) {
                    setShowMeanings(true);
                  }
                  setRevealedWordIds(new Set());
                }}
                className={`px-3 py-1.5 rounded-xl border text-xs transition-colors flex items-center gap-1.5 ${
                  hideWord
                    ? 'border-amber-500/50 bg-amber-500/15 text-amber-300 font-bold'
                    : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
                }`}
              >
                {hideWord ? <EyeOff size={13} className="text-amber-400" /> : <Eye size={13} />}
                <span>{hideWord ? '已隐藏单词 (空格显示)' : '隐藏单词 (空格)'}</span>
              </button>

              {/* Global Meaning Peek Toggle */}
              <button
                type="button"
                onClick={() => {
                  if (hideWord) setHideWord(false);
                  setShowMeanings(!showMeanings);
                }}
                className={`px-3 py-1.5 rounded-xl border text-xs transition-colors flex items-center gap-1.5 ${
                  showMeanings && !hideWord
                    ? 'border-indigo-500/50 bg-indigo-500/15 text-indigo-300 font-semibold'
                    : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
                }`}
              >
                {showMeanings && !hideWord ? <EyeOff size={13} /> : <Eye size={13} />}
                <span>{showMeanings && !hideWord ? '已显释义' : '隐藏释义 (默认)'}</span>
              </button>

              {/* Synonyms & Antonyms Button */}
              {onOpenSynonymsModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSynonymsModal();
                  }}
                  className="px-2.5 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-emerald-500/15 hover:border-emerald-500/40 text-zinc-400 hover:text-emerald-300 text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="查看词库同义词与反义词"
                >
                  <ArrowLeftRight size={13} className="text-emerald-400" />
                  <span>同反义词</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Minimized Ebbinghaus Stage Summary */}
        <div className="px-4 sm:px-6 py-2 bg-zinc-950/80 border-b border-zinc-900/80">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {/* Card 1: 初始新词 */}
            <div className="bg-zinc-900/60 border border-zinc-800/80 px-2.5 py-1.5 rounded-xl flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 shrink-0" />
                <span className="font-semibold text-zinc-300 truncate text-[11px]">初始新词</span>
                <span className="font-mono text-[10px] text-zinc-500 hidden md:inline">S0</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 font-mono">
                <span className="font-bold text-white text-xs">{ebbinghausStats.stage0.count}</span>
                <span className="text-[10px] text-zinc-500 font-normal">({ebbinghausStats.stage0.percentage}%)</span>
              </div>
            </div>

            {/* Card 2: 短期强化 */}
            <div className="bg-zinc-900/60 border border-amber-500/20 px-2.5 py-1.5 rounded-xl flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                <span className="font-semibold text-amber-300 truncate text-[11px]">短期强化</span>
                <span className="font-mono text-[10px] text-amber-400/70 hidden md:inline">S1-3</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 font-mono">
                <span className="font-bold text-white text-xs">{ebbinghausStats.stageShort.count}</span>
                <span className="text-[10px] text-amber-400/80 font-normal">({ebbinghausStats.stageShort.percentage}%)</span>
              </div>
            </div>

            {/* Card 3: 中期巩固 */}
            <div className="bg-zinc-900/60 border border-cyan-500/20 px-2.5 py-1.5 rounded-xl flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                <span className="font-semibold text-cyan-300 truncate text-[11px]">中期巩固</span>
                <span className="font-mono text-[10px] text-cyan-400/70 hidden md:inline">S4-6</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 font-mono">
                <span className="font-bold text-white text-xs">{ebbinghausStats.stageMedium.count}</span>
                <span className="text-[10px] text-cyan-400/80 font-normal">({ebbinghausStats.stageMedium.percentage}%)</span>
              </div>
            </div>

            {/* Card 4: 长期稳固 */}
            <div className="bg-zinc-900/60 border border-indigo-500/20 px-2.5 py-1.5 rounded-xl flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                <span className="font-semibold text-indigo-300 truncate text-[11px]">长期稳固</span>
                <span className="font-mono text-[10px] text-indigo-400/70 hidden md:inline">S7-9</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 font-mono">
                <span className="font-bold text-white text-xs">{ebbinghausStats.stageLong.count}</span>
                <span className="text-[10px] text-indigo-400/80 font-normal">({ebbinghausStats.stageLong.percentage}%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mastered scope filter inside modal (only shown when on mastered tab) */}
        {activeTab === 'mastered' && activeList !== 'Mastered Words' && allMasteredWords.length > 0 && (
          <div className="px-4 sm:px-6 py-2 border-b border-zinc-900 bg-zinc-950/60 flex items-center justify-between gap-2 flex-wrap text-xs">
            <div className="flex items-center gap-1 bg-zinc-900/90 p-0.5 rounded-xl border border-zinc-800">
              <button
                type="button"
                onClick={() => setMasteredScope('current')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  masteredScope === 'current'
                    ? 'bg-zinc-800 text-emerald-400 font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                从「{activeList}」转移已掌握 ({currentListMasteredWords.length})
              </button>
              <button
                type="button"
                onClick={() => setMasteredScope('all')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  masteredScope === 'all'
                    ? 'bg-zinc-800 text-white font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                全库所有已掌握 ({allMasteredWords.length})
              </button>
            </div>
            <span className="text-[11px] text-zinc-500 font-sans">
              {masteredScope === 'current' ? `当前仅查看从「${activeList}」转移的单词` : '正在查看全库所有已掌握单词'}
            </span>
          </div>
        )}

        {/* Word List Content - Compact padding to display as many words as possible */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-2 divide-y divide-zinc-900/60">
          {displayedWords.length === 0 ? (
            <div className="text-center py-16 px-4 space-y-3">
              <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
                {searchQuery ? <Search size={24} /> : <BookOpen size={24} />}
              </div>
              <h4 className="text-sm font-semibold text-zinc-300">
                {searchQuery
                  ? `未找到与 "${searchQuery}" 匹配的单词`
                  : (activeTab === 'mastered' 
                      ? (masteredScope === 'current' ? `当前列表「${activeList}」暂无已转移掌握的单词` : '暂无已掌握单词') 
                      : '该列表中暂无单词')}
              </h4>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-emerald-400 hover:underline cursor-pointer"
                  >
                    清除检索关键词
                  </button>
                ) : (
                  activeTab === 'mastered'
                    ? (masteredScope === 'current' 
                        ? `当从「${activeList}」完成掌握时会显示在此处，可在此一键退回原列表重练。`
                        : '在背词页面点击对勾图标，或在 Word Game 中连对 6 次，即可将单词标记为已掌握。')
                    : '可通过导入数据或从其它列表中切换单词进行练习。'
                )}
              </p>
            </div>
          ) : (
            displayedWords.map((item, index) => {
              const isMastered = item.is_mastered === true || item.listName === 'Mastered Words';
              const targetOriginalList = (item.previousListName && item.previousListName !== 'Mastered Words')
                ? item.previousListName
                : 'Default List';
              const isWordRevealed = !hideWord || revealedWordIds.has(item.id);
              const isMeaningRevealed = hideWord ? true : (showMeanings || revealedIds.has(item.id));
              const rootMeaning = item.root_meaning || (item.root_core ? rootMeaningsMap.get(item.root_core.toLowerCase().trim()) : '') || '';

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    setActiveWordId(item.id);
                    speakWordAndExample(item.word, item.example_sentence);
                  }}
                  className={`pt-2.5 first:pt-0 p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group cursor-pointer active:scale-[0.998] ${
                    activeWordId === item.id
                      ? 'bg-zinc-850 border-emerald-500/40 ring-1 ring-emerald-500/30 shadow-lg'
                      : 'bg-zinc-900/40 border-zinc-855 hover:border-zinc-700/80 hover:bg-zinc-900/80'
                  }`}
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-mono text-zinc-600 font-semibold select-none">
                        #{index + 1}
                      </span>

                      {/* Word Name (Hidden if hideWord is true and not revealed) */}
                      {!isWordRevealed ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleRevealWord(item.id);
                          }}
                          className="px-2.5 py-0.5 rounded-lg bg-zinc-800/90 hover:bg-zinc-700 text-zinc-400 hover:text-amber-300 font-mono text-sm border border-zinc-700/60 transition-all flex items-center gap-1.5 cursor-pointer group shadow-inner"
                        >
                          <span className="tracking-widest select-none">••••••••</span>
                          <span className="text-[10px] text-zinc-500 group-hover:text-amber-300 font-sans">偷看 (空格)</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="text-base font-bold font-mono text-white group-hover:text-emerald-300 transition-colors tracking-wide">
                            {item.word}
                          </span>
                          {hideWord && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleRevealWord(item.id);
                              }}
                              className="text-[10px] text-zinc-500 hover:text-zinc-300 font-sans underline cursor-pointer"
                            >
                              遮挡
                            </button>
                          )}
                        </div>
                      )}

                      {item.phonetic && isWordRevealed && (
                        <span className="text-xs font-mono text-zinc-500">
                          {item.phonetic}
                        </span>
                      )}

                      {item.part_of_speech && (
                        <span className={`text-[11px] font-mono px-2 py-0.5 rounded-md border font-semibold ${getPartOfSpeechBadgeClass(item.part_of_speech)}`}>
                          {item.part_of_speech}
                        </span>
                      )}

                      {/* Audio Pronounce Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          speakWordAndExample(item.word, item.example_sentence);
                        }}
                        className="p-1 text-zinc-500 hover:text-emerald-400 hover:bg-zinc-800 rounded-full transition-colors"
                      >
                        <Volume2 size={14} />
                      </button>

                      {/* Practice count badge (练习次数) */}
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full border transition-colors ${
                          (item.review_count || 0) > 0
                            ? 'bg-amber-500/10 text-amber-300 border-amber-500/25 font-semibold'
                            : 'bg-zinc-800/60 text-zinc-500 border-zinc-700/40'
                        }`}
                      >
                        <Clock size={10} className={(item.review_count || 0) > 0 ? 'text-amber-400' : 'text-zinc-500'} />
                        <span>练习 {item.review_count || 0} 次</span>
                      </span>

                      {/* Ebbinghaus stage badge */}
                      {item.ebbinghaus_stage !== undefined && item.ebbinghaus_stage > 0 && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-zinc-800/70 text-zinc-300 border border-zinc-700/50">
                          Stage {item.ebbinghaus_stage}
                        </span>
                      )}

                      {/* Mastered status badge */}
                      {isMastered && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                          <CheckCircle2 size={10} />
                          已掌握
                        </span>
                      )}

                      {/* Affix / Root tags preview with hover meaning tooltip */}
                      {item.root_core && isWordRevealed && (
                        <div 
                          className="relative group/root inline-flex items-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span 
                            className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 transition-all cursor-default flex items-center gap-1 select-none"
                          >
                            <span>词根: {item.root_core}</span>
                          </span>

                          {/* Floating Tooltip appearing at bottom-right (右下方) */}
                          <div className="absolute top-full left-0 mt-1.5 hidden group-hover/root:flex flex-col items-start z-30 pointer-events-none animate-in fade-in duration-150">
                            <div className="w-2 h-2 bg-zinc-900 border-l border-t border-indigo-500/40 rotate-45 ml-3 -mb-1 z-10" />
                            <div className="bg-zinc-900/95 text-white border border-indigo-500/40 px-3 py-1.5 rounded-xl shadow-2xl text-xs whitespace-nowrap flex items-center gap-1.5 font-sans backdrop-blur-md">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                              <span className="font-mono font-bold text-indigo-300">{item.root_core}</span>
                              <span className="text-zinc-500">:</span>
                              <span className="font-medium text-zinc-100">
                                {rootMeaning || '暂无释义'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Target Original List tag */}
                      {isMastered && (
                        <span className="text-[10px] text-amber-400/90 font-mono bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                          原列表: {targetOriginalList}
                        </span>
                      )}
                    </div>

                    {/* Meaning */}
                    {isMeaningRevealed ? (
                      <div className="space-y-1 pt-0.5 animate-in fade-in duration-150 text-left">
                        <div className="text-xs text-zinc-200 font-medium text-left">
                          {item.meaning}
                        </div>
                        {item.phrase && isWordRevealed && (
                          <div className="text-xs text-emerald-400/90 font-medium flex items-center gap-1.5 text-left">
                            <span className="text-[11px] text-zinc-500 font-sans font-normal shrink-0">搭配:</span>
                            <span>{item.phrase}</span>
                          </div>
                        )}
                        {item.example_sentence && isWordRevealed && (
                          <div className="text-xs text-zinc-300 italic flex items-start gap-1.5 leading-relaxed text-left group/ex">
                            <span className="text-[11px] text-zinc-500 font-sans not-italic font-normal shrink-0">例句:</span>
                            <span className="flex-1 text-zinc-200">"{item.example_sentence}"</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                speakWord(item.example_sentence!);
                              }}
                              className="p-1 text-zinc-500 hover:text-emerald-400 hover:bg-zinc-800 rounded-full transition-colors shrink-0 -mt-0.5"
                            >
                              <Volume2 size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-[11px] text-zinc-500">
                        <span className="italic">词义与例句已隐藏</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleRevealSingle(item.id);
                          }}
                          className="hover:text-zinc-300 text-zinc-600 underline text-[10px] ml-1 cursor-pointer"
                        >
                          点击偷看
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Actions on right */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {/* 一键返回原来的 (One-click return to original list) */}
                    {isMastered && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onReturnWord(item);
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 hover:text-amber-200 border border-amber-500/30 hover:border-amber-500/50 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                      >
                        <Undo2 size={13} className="text-amber-400" />
                        <span>一键返回</span>
                      </button>
                    )}

                    {/* 切换学习 */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectWord(item);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-emerald-600/30 text-zinc-300 hover:text-emerald-300 text-xs font-medium transition-all flex items-center gap-1 shadow-sm active:scale-95"
                    >
                      <span>切换学习</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-zinc-900 bg-zinc-950/80 flex items-center justify-between text-xs text-zinc-500 font-mono">
          <span>共显示 {displayedWords.length} 个单词 · 点击「一键返回」即可退回原列表重练</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl transition-colors font-medium font-sans"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
