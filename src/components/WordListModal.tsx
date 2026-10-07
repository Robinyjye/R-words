import React, { useState, useMemo, useEffect } from 'react';
import { X, Volume2, Search, ArrowRight, BookOpen, Undo2, CheckCircle2, Eye, EyeOff, Layers, Database } from 'lucide-react';
import { WordState } from '../utils/word';
import { speakWord } from '../utils/audio';

interface WordListModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeList: string;
  allWords: WordState[];
  currentListWords: WordState[];
  onSelectWord: (word: WordState) => void;
  onReturnWord: (word: WordState) => void;
}

export const WordListModal: React.FC<WordListModalProps> = ({
  isOpen,
  onClose,
  activeList,
  allWords,
  currentListWords,
  onSelectWord,
  onReturnWord,
}) => {
  // Tabs: 'current' | 'mastered' | 'all'
  const [activeTab, setActiveTab] = useState<'current' | 'mastered' | 'all'>(() => {
    return activeList === 'Mastered Words' ? 'mastered' : 'current';
  });

  const [search, setSearch] = useState('');
  // User explicitly asked: "但不要显示词义", default is false!
  const [showMeanings, setShowMeanings] = useState(false);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

  // Reset tab when activeList changes
  useEffect(() => {
    if (activeList === 'Mastered Words') {
      setActiveTab('mastered');
    }
  }, [activeList]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const masteredWords = useMemo(() => {
    return allWords.filter(w => w.is_mastered === true || w.listName === 'Mastered Words');
  }, [allWords]);

  // Source list depending on active tab
  const tabWords = useMemo(() => {
    switch (activeTab) {
      case 'mastered':
        return masteredWords;
      case 'all':
        return allWords;
      case 'current':
      default:
        return currentListWords;
    }
  }, [activeTab, masteredWords, allWords, currentListWords]);

  // Filtered by search
  const displayedWords = useMemo(() => {
    if (!search.trim()) return tabWords;
    const q = search.trim().toLowerCase();
    return tabWords.filter(w =>
      w.word.toLowerCase().includes(q) ||
      (showMeanings && w.meaning && w.meaning.toLowerCase().includes(q))
    );
  }, [tabWords, search, showMeanings]);

  if (!isOpen) return null;

  const toggleRevealSingle = (id: string) => {
    setRevealedIds(prev => {
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
        className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-3xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-zinc-800/80 bg-zinc-900/40 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
                <Database size={20} />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  <span>单词列表速览</span>
                  <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                    纯词自测模式
                  </span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  默认隐藏词义，专为快速检验英文辨识与一键返回重练设计
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

          {/* Navigation Tabs */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-zinc-900">
            <div className="flex items-center space-x-1.5 bg-zinc-900/90 p-1 rounded-2xl border border-zinc-800/80 text-xs font-medium">
              <button
                type="button"
                onClick={() => { setActiveTab('current'); setSearch(''); }}
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
                onClick={() => { setActiveTab('mastered'); setSearch(''); }}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                  activeTab === 'mastered'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-emerald-400'
                }`}
              >
                <CheckCircle2 size={13} />
                <span>已掌握单词</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-zinc-950/60 text-emerald-300 font-bold">
                  {masteredWords.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('all'); setSearch(''); }}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                  activeTab === 'all'
                    ? 'bg-zinc-800 text-white font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Layers size={13} />
                <span>全部词库</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-zinc-950/60 text-zinc-300">
                  {allWords.length}
                </span>
              </button>
            </div>

            {/* Global Meaning Peek Toggle */}
            <button
              type="button"
              onClick={() => setShowMeanings(!showMeanings)}
              className={`px-3 py-1.5 rounded-xl border text-xs transition-colors flex items-center gap-1.5 ${
                showMeanings
                  ? 'border-indigo-500/50 bg-indigo-500/15 text-indigo-300'
                  : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
              }`}
              title={showMeanings ? "点击隐藏所有词义" : "点击显示所有词义"}
            >
              {showMeanings ? <EyeOff size={13} /> : <Eye size={13} />}
              <span>{showMeanings ? '已显释义' : '隐藏释义 (默认)'}</span>
            </button>
          </div>
        </div>

        {/* Search bar inside modal */}
        <div className="px-5 sm:px-6 py-2.5 border-b border-zinc-900 bg-zinc-950/60">
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`在 ${activeTab === 'mastered' ? '已掌握单词' : activeTab === 'all' ? '全部词库' : activeList} 中快速筛选...`}
              className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
            />
          </div>
        </div>

        {/* Word List Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2.5 divide-y divide-zinc-900/60">
          {displayedWords.length === 0 ? (
            <div className="text-center py-16 px-4 space-y-3">
              <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
                <BookOpen size={24} />
              </div>
              <h4 className="text-sm font-semibold text-zinc-300">
                {search ? '未搜索到符合条件的单词' : activeTab === 'mastered' ? '暂无已掌握单词' : '该列表中暂无单词'}
              </h4>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                {activeTab === 'mastered'
                  ? '在背词页面点击对勾图标，或在 Word Game 中连对 6 次，即可将单词标记为已掌握。'
                  : '可通过导入数据或从其它列表中切换单词进行练习。'}
              </p>
            </div>
          ) : (
            displayedWords.map((item, index) => {
              const isMastered = item.is_mastered === true || item.listName === 'Mastered Words';
              const targetOriginalList = (item.previousListName && item.previousListName !== 'Mastered Words')
                ? item.previousListName
                : 'Default List';
              const isMeaningRevealed = showMeanings || revealedIds.has(item.id);

              return (
                <div
                  key={item.id}
                  className="pt-2.5 first:pt-0 p-3.5 rounded-2xl bg-zinc-900/40 border border-zinc-850 hover:border-zinc-700/80 hover:bg-zinc-900/70 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-mono text-zinc-600 font-semibold select-none">
                        #{index + 1}
                      </span>

                      {/* Word Name */}
                      <span className="text-base font-bold font-mono text-white group-hover:text-emerald-300 transition-colors tracking-wide">
                        {item.word}
                      </span>

                      {item.phonetic && (
                        <span className="text-xs font-mono text-zinc-500">
                          {item.phonetic}
                        </span>
                      )}

                      {item.part_of_speech && (
                        <span className="text-[11px] font-mono px-1.5 py-0.5 rounded-md bg-zinc-800/80 text-zinc-400">
                          {item.part_of_speech}
                        </span>
                      )}

                      {/* Audio Pronounce Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          speakWord(item.word);
                        }}
                        className="p-1 text-zinc-500 hover:text-emerald-400 hover:bg-zinc-800 rounded-full transition-colors"
                        title="朗读单词"
                      >
                        <Volume2 size={14} />
                      </button>

                      {/* Mastered status badge */}
                      {isMastered && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                          <CheckCircle2 size={10} />
                          已掌握
                        </span>
                      )}

                      {/* Affix / Root tags preview */}
                      {item.root_core && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                          词根: {item.root_core}
                        </span>
                      )}

                      {/* Target Original List tag */}
                      {isMastered && (
                        <span className="text-[10px] text-amber-400/90 font-mono bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                          原列表: {targetOriginalList}
                        </span>
                      )}
                    </div>

                    {/* Meaning (Hidden by default, can be toggled) */}
                    {isMeaningRevealed ? (
                      <div className="text-xs text-zinc-300 font-medium pl-0.5 pt-0.5 animate-in fade-in duration-150">
                        {item.meaning}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-[11px] text-zinc-500">
                        <span className="italic">词义已隐藏</span>
                        <button
                          type="button"
                          onClick={() => toggleRevealSingle(item.id)}
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
                        title={`一键原路退回至 "${targetOriginalList}" 列表重新练习`}
                      >
                        <Undo2 size={13} className="text-amber-400" />
                        <span>一键返回</span>
                      </button>
                    )}

                    {/* 进入背诵 / 学习 */}
                    <button
                      type="button"
                      onClick={() => {
                        onSelectWord(item);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-emerald-600/30 text-zinc-300 hover:text-emerald-300 text-xs font-medium transition-all flex items-center gap-1 shadow-sm active:scale-95"
                      title="在主界面卡片中学习该单词"
                    >
                      <span>背诵</span>
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
