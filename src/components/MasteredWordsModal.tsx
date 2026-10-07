import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle2, Volume2, Search, ArrowRight, BookOpen } from 'lucide-react';
import { WordState } from '../utils/word';

interface MasteredWordsModalProps {
  isOpen: boolean;
  onClose: () => void;
  listName: string;
  masteredWords: WordState[];
  onSelectWord: (word: WordState) => void;
  onUnmasterWord: (word: WordState) => void;
  onSpeakWord: (word: string, example?: string) => void;
}

export const MasteredWordsModal: React.FC<MasteredWordsModalProps> = ({
  isOpen,
  onClose,
  listName,
  masteredWords,
  onSelectWord,
  onUnmasterWord,
  onSpeakWord
}) => {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return masteredWords;
    const q = search.trim().toLowerCase();
    return masteredWords.filter(w => 
      w.word.toLowerCase().includes(q) || 
      w.meaning.toLowerCase().includes(q)
    );
  }, [masteredWords, search]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-zinc-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  <span>已掌握单词清单</span>
                  <span className="text-xs font-mono font-normal px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                    {masteredWords.length} 词
                  </span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  当前列表：<span className="text-zinc-200 font-medium">{listName}</span>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Search bar inside modal */}
          {masteredWords.length > 0 && (
            <div className="px-6 py-3 border-b border-zinc-800/60 bg-zinc-950/40">
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="在已掌握单词中搜索..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
                />
              </div>
            </div>
          )}

          {/* List Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            {masteredWords.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="w-16 h-16 rounded-full bg-zinc-800/60 border border-zinc-700/60 flex items-center justify-center mx-auto mb-4 text-zinc-500">
                  <BookOpen size={28} />
                </div>
                <h4 className="text-base font-semibold text-zinc-300 mb-1">
                  当前列表暂无已掌握单词
                </h4>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  在背词或拼写练习时，点击单词下方的对勾图标（✓）或在 Word Game 连对 6 次，即可标记为已掌握。单词将完整保留在当前列表中。
                </p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 text-sm">
                未搜索到符合条件的已掌握单词
              </div>
            ) : (
              filtered.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700 transition-all flex items-center justify-between group"
                >
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-base font-bold text-white tracking-wide">
                        {item.word}
                      </span>
                      {item.part_of_speech && (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                          {item.part_of_speech}
                        </span>
                      )}
                      {item.phonetic && (
                        <span className="text-xs font-mono text-zinc-500">
                          {item.phonetic}
                        </span>
                      )}
                      <button
                        onClick={() => onSpeakWord(item.word, item.example_sentence)}
                        className="p-1 text-zinc-500 hover:text-emerald-400 rounded-full transition-colors"
                        title="朗读发音"
                      >
                        <Volume2 size={14} />
                      </button>
                    </div>
                    <p className="text-sm text-zinc-300 truncate">
                      {item.meaning}
                    </p>
                    {item.example_sentence && (
                      <p className="text-xs text-zinc-500 italic truncate mt-0.5">
                        "{item.example_sentence}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => onSelectWord(item)}
                      className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-emerald-600/20 hover:text-emerald-300 text-zinc-300 text-xs font-medium transition-colors flex items-center gap-1"
                      title="在主界面查看该单词"
                    >
                      <span>学习</span>
                      <ArrowRight size={13} />
                    </button>
                    <button
                      onClick={() => onUnmasterWord(item)}
                      className="px-3 py-1.5 rounded-xl bg-zinc-800/60 hover:bg-rose-500/20 hover:text-rose-300 text-zinc-400 text-xs font-medium transition-colors"
                      title="取消已掌握标记"
                    >
                      取消标记
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-zinc-800/80 bg-zinc-950/50 flex justify-between items-center text-xs text-zinc-500 px-6">
            <span>点击单词右侧可快速定位或取消标记</span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl transition-colors font-medium"
            >
              关闭
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
