import React, { useMemo, useState, useEffect } from 'react';
import { X, Volume2, Sparkles, ArrowRight, CheckCircle2, Search, BookOpen, Layers } from 'lucide-react';
import { WordState } from '../utils/word';
import { speakWord } from '../utils/audio';
import { generateExampleSentenceForWord } from '../utils/sentence';

interface SameRootWordsModalProps {
  rootCore: string;
  rootMeaning?: string;
  currentWordId?: string;
  allWords: WordState[];
  onClose: () => void;
  onSelectWord: (word: WordState) => void;
  onUpdateWord?: (word: WordState) => void;
}

export const SameRootWordsModal: React.FC<SameRootWordsModalProps> = ({
  rootCore,
  rootMeaning,
  currentWordId,
  allWords,
  onClose,
  onSelectWord,
  onUpdateWord,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Normalize target root
  const targetClean = useMemo(() => {
    return rootCore.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().trim();
  }, [rootCore]);

  const targetRaw = useMemo(() => {
    return rootCore.toLowerCase().trim();
  }, [rootCore]);

  // Find all words with the exact same root
  const matchingWords = useMemo(() => {
    if (!targetClean && !targetRaw) return [];

    const matches: WordState[] = [];
    const seenIds = new Set<string>();

    allWords.forEach(w => {
      if (!w.root_core) return;
      if (seenIds.has(w.id)) return;

      const rClean = w.root_core.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().trim();
      const rRaw = w.root_core.toLowerCase().trim();

      // Only match if the core root is genuinely the same root
      if (rClean === targetClean || rRaw === targetRaw) {
        matches.push(w);
        seenIds.add(w.id);
      }
    });

    // Put current word first, then sort alphabetically
    return matches.sort((a, b) => {
      if (a.id === currentWordId) return -1;
      if (b.id === currentWordId) return 1;
      return a.word.localeCompare(b.word);
    });
  }, [allWords, targetClean, targetRaw, currentWordId]);

  // Filter by local search term
  const displayedWords = useMemo(() => {
    if (!searchTerm.trim()) return matchingWords;
    const q = searchTerm.toLowerCase().trim();
    return matchingWords.filter(w =>
      w.word.toLowerCase().includes(q) ||
      (w.meaning && w.meaning.toLowerCase().includes(q)) ||
      (w.phrase && w.phrase.toLowerCase().includes(q))
    );
  }, [matchingWords, searchTerm]);

  // Handle generating example sentence on demand
  const handleGenerateSentence = async (wordItem: WordState) => {
    if (generatingIds.has(wordItem.id)) return;
    setGeneratingIds(prev => new Set(prev).add(wordItem.id));
    try {
      const res = await generateExampleSentenceForWord(wordItem.word, wordItem.meaning, wordItem.part_of_speech);
      if (res.example_sentence && onUpdateWord) {
        onUpdateWord({
          ...wordItem,
          example_sentence: res.example_sentence,
          phrase: wordItem.phrase || res.phrase
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGeneratingIds(prev => {
        const next = new Set(prev);
        next.delete(wordItem.id);
        return next;
      });
    }
  };

  // Automatically ensure all displayed words in this modal have example sentences
  useEffect(() => {
    let isCancelled = false;
    displayedWords.forEach(async (w) => {
      if (!w.example_sentence && onUpdateWord) {
        const res = await generateExampleSentenceForWord(w.word, w.meaning, w.part_of_speech);
        if (!isCancelled && res.example_sentence) {
          onUpdateWord({
            ...w,
            example_sentence: res.example_sentence,
            phrase: w.phrase || res.phrase
          });
        }
      }
    });
    return () => {
      isCancelled = true;
    };
  }, [displayedWords, onUpdateWord]);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-zinc-800/80 bg-zinc-900/40 flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-mono font-bold text-base shadow-sm">
                <Sparkles size={14} className="text-indigo-400" />
                词根: {rootCore}
              </span>
              {rootMeaning && (
                <span className="text-zinc-300 text-sm font-medium bg-zinc-800/60 px-2.5 py-1 rounded-xl border border-zinc-700/60">
                  {rootMeaning}
                </span>
              )}
              <span className="text-xs font-mono font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                共 {matchingWords.length} 个单词
              </span>
            </div>
            <p className="text-xs text-zinc-400 flex items-center gap-1 pt-0.5">
              <BookOpen size={12} className="text-zinc-500" />
              点击列表中的单词可直接切换至卡片进行背诵与复习
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors shrink-0"
            title="关闭"
          >
            <X size={18} />
          </button>
        </div>

        {/* Filter / Search within matching words */}
        {matchingWords.length > 5 && (
          <div className="px-5 sm:px-6 pt-3 pb-1 border-b border-zinc-900">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="在同词根列表中搜索单词或释义..."
                className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50"
              />
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            </div>
          </div>
        )}

        {/* Word List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2.5 divide-y divide-zinc-900/60">
          {displayedWords.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <Layers size={36} className="mx-auto text-zinc-600 opacity-60" />
              <p className="text-sm text-zinc-400">
                {searchTerm ? '没有找到符合筛选条件的同词根单词' : `词库中暂未收录更多包含 "${rootCore}" 的单词`}
              </p>
              <p className="text-xs text-zinc-600">
                导入更多相关词汇或使用 AI 丰富词汇库后即可在此串联记忆
              </p>
            </div>
          ) : (
            displayedWords.map((wordItem) => {
              const isCurrent = wordItem.id === currentWordId;

              return (
                <div
                  key={wordItem.id}
                  onClick={() => {
                    onSelectWord(wordItem);
                    onClose();
                  }}
                  className={`pt-2.5 first:pt-0 group p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-start justify-between gap-3 ${
                    isCurrent
                      ? 'bg-indigo-950/20 border-indigo-500/30 hover:border-indigo-500/50 hover:bg-indigo-950/30'
                      : 'bg-zinc-900/40 border-zinc-850 hover:border-zinc-700/80 hover:bg-zinc-900/80'
                  }`}
                >
                  <div className="space-y-1.5 flex-1 min-w-0 text-left">
                    <div className="flex items-center flex-wrap gap-2">
                      <span className="font-mono text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                        {wordItem.word}
                      </span>

                      {wordItem.phonetic && (
                        <span className="text-xs font-mono text-zinc-500">
                          {wordItem.phonetic}
                        </span>
                      )}

                      {wordItem.part_of_speech && (
                        <span className="text-[11px] font-mono px-1.5 py-0.5 rounded-md bg-zinc-800 text-zinc-400">
                          {wordItem.part_of_speech}
                        </span>
                      )}

                      {isCurrent && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          当前单词
                        </span>
                      )}

                      {wordItem.is_mastered && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                          <CheckCircle2 size={10} />
                          已掌握
                        </span>
                      )}

                      {wordItem.listName && (
                        <span className="text-[10px] text-zinc-500 font-sans">
                          [{wordItem.listName}]
                        </span>
                      )}
                    </div>

                    {/* Word Meaning */}
                    <div className="text-xs text-zinc-300 font-medium line-clamp-2">
                      {wordItem.meaning}
                    </div>

                    {/* Affix Breakdown Formula */}
                    {(wordItem.prefix || wordItem.root_core || wordItem.suffix) && (
                      <div className="text-[11px] font-mono text-zinc-400 flex flex-wrap items-center gap-1 pt-0.5">
                        {wordItem.prefix && (
                          <span className="text-blue-400/90">
                            {wordItem.prefix}
                            {wordItem.prefix_meaning ? ` (${wordItem.prefix_meaning})` : ''}
                          </span>
                        )}
                        {wordItem.prefix && (wordItem.root_core || wordItem.suffix) && <span className="text-zinc-600">+</span>}
                        {wordItem.root_core && (
                          <span className="text-indigo-400 font-bold bg-indigo-500/10 px-1 py-0.2 rounded border border-indigo-500/20">
                            {wordItem.root_core}
                            {wordItem.root_meaning ? ` (${wordItem.root_meaning})` : ''}
                          </span>
                        )}
                        {wordItem.root_core && wordItem.suffix && <span className="text-zinc-600">+</span>}
                        {wordItem.suffix && (
                          <span className="text-purple-400/90">
                            {wordItem.suffix}
                            {wordItem.suffix_meaning ? ` (${wordItem.suffix_meaning})` : ''}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Common Phrase & Example Sentence - Strictly Left-Aligned */}
                    {(wordItem.phrase || wordItem.example_sentence || generatingIds.has(wordItem.id)) && (
                      <div className="space-y-1 pt-1 text-left">
                        {/* Common Phrase */}
                        {wordItem.phrase && (
                          <div className="text-xs text-emerald-400/90 font-medium flex items-center gap-1.5 text-left">
                            <span className="text-[11px] text-zinc-500 font-sans font-normal shrink-0">搭配:</span>
                            <span>{wordItem.phrase}</span>
                          </div>
                        )}

                        {/* Example Sentence */}
                        {wordItem.example_sentence ? (
                          <div className="text-xs text-zinc-300 italic flex items-start gap-1.5 leading-relaxed text-left group/ex">
                            <span className="text-[11px] text-zinc-500 font-sans not-italic font-normal shrink-0">例句:</span>
                            <span className="flex-1 text-zinc-200">"{wordItem.example_sentence}"</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                speakWord(wordItem.example_sentence!);
                              }}
                              className="p-1 text-zinc-500 hover:text-emerald-400 hover:bg-zinc-800 rounded-full transition-colors shrink-0 -mt-0.5"
                              title="朗读例句"
                            >
                              <Volume2 size={13} />
                            </button>
                          </div>
                        ) : generatingIds.has(wordItem.id) ? (
                          <div className="text-[11px] text-indigo-400/80 flex items-center gap-1.5 pt-0.5 text-left">
                            <Sparkles size={11} className="animate-spin text-indigo-400 shrink-0" />
                            <span>正在生成真实权威例句...</span>
                          </div>
                        ) : (
                          <div className="pt-0.5 text-left">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleGenerateSentence(wordItem);
                              }}
                              className="inline-flex items-center gap-1 text-[11px] text-indigo-300 hover:text-indigo-200 bg-indigo-500/10 hover:bg-indigo-500/20 px-2 py-0.5 rounded-lg border border-indigo-500/20 transition-colors"
                            >
                              <Sparkles size={11} className="text-indigo-400" />
                              <span>一键生成例句</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions on right */}
                  <div className="flex items-center space-x-2 shrink-0 self-end sm:self-start sm:pt-0.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        speakWord(wordItem.word);
                      }}
                      className="p-2 text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 rounded-full transition-colors"
                      title="朗读单词"
                    >
                      <Volume2 size={15} />
                    </button>

                    <button
                      type="button"
                      className="flex items-center space-x-1 px-2.5 py-1 text-xs font-medium rounded-full bg-zinc-800 text-zinc-300 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm"
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
        <div className="p-3.5 px-6 border-t border-zinc-900 bg-zinc-950/80 flex items-center justify-between text-xs text-zinc-500 font-mono">
          <span>词根串联学习法 · 相同词根聚类巩固</span>
          <span>按 ESC 或点击外部可关闭</span>
        </div>
      </div>
    </div>
  );
};
