import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ArrowLeftRight, Loader2, Sparkles, Database } from 'lucide-react';
import { WordState } from '../utils/word';
import { findSynonymsAndAntonymsInLibrary, fetchDatamuseSynAnt } from '../utils/thesaurus';

interface SynonymAntonymPopoverProps {
  currentWord: WordState | null;
  allWords: WordState[];
  onSelectWord?: (word: WordState) => void;
}

export const SynonymAntonymPopover: React.FC<SynonymAntonymPopoverProps> = ({
  currentWord,
  allWords,
  onSelectWord,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [apiData, setApiData] = useState<{ syn: Set<string>; ant: Set<string> } | null>(null);
  const [isLoadingApi, setIsLoadingApi] = useState(false);
  const leaveTimerRef = useRef<number | null>(null);

  // Fetch / update API data for the current word
  useEffect(() => {
    if (!currentWord || !isOpen) return;

    let isMounted = true;
    setIsLoadingApi(true);

    fetchDatamuseSynAnt(currentWord.word)
      .then((data) => {
        if (isMounted) {
          setApiData(data);
          setIsLoadingApi(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsLoadingApi(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [currentWord?.word, isOpen]);

  // Compute search result across the entire library
  const searchResult = useMemo(() => {
    if (!currentWord) return { synonyms: [], antonyms: [], totalSearched: 0 };
    return findSynonymsAndAntonymsInLibrary(currentWord, allWords, apiData);
  }, [currentWord, allWords, apiData]);

  const handleMouseEnter = () => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    leaveTimerRef.current = window.setTimeout(() => {
      setIsOpen(false);
    }, 200);
  };

  if (!currentWord) return null;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Icon button matching CheckCircle, Pencil, Trash in size & style */}
      <button
        type="button"
        tabIndex={-1}
        className={`p-1.5 rounded-full transition-all focus:outline-none cursor-pointer ${
          isOpen
            ? 'text-sky-400 bg-sky-400/15 ring-1 ring-sky-400/40'
            : 'text-zinc-500 hover:text-sky-400 hover:bg-sky-400/10'
        }`}
        aria-label="在全部词库搜索近义词和反义词"
      >
        <ArrowLeftRight size={14} />
      </button>

      {/* Floating Hover Card */}
      {isOpen && (
        <div 
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 w-72 sm:w-84 z-50 animate-in fade-in zoom-in-95 duration-150 pointer-events-auto"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="bg-zinc-900/95 border border-zinc-700/70 rounded-2xl shadow-2xl backdrop-blur-md p-3.5 text-left text-xs text-zinc-100 ring-1 ring-white/5">
            {/* Header */}
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-zinc-800">
              <div className="flex items-center gap-1.5 font-medium text-zinc-200">
                <ArrowLeftRight size={13} className="text-sky-400 shrink-0" />
                <span>近义词与反义词检索</span>
                <span className="font-mono text-sky-300 font-bold ml-0.5">
                  [{currentWord.word}]
                </span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-mono bg-zinc-800/80 px-2 py-0.5 rounded-full border border-zinc-700/50">
                <Database size={10} className="text-zinc-400 shrink-0" />
                <span>词库 {allWords.length}</span>
                {isLoadingApi && <Loader2 size={9} className="animate-spin text-sky-400 ml-0.5" />}
              </div>
            </div>

            {/* Synonyms Section */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 font-semibold text-emerald-400 text-[11px] tracking-wide">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>近义词 (Synonyms)</span>
                </div>
                {searchResult.synonyms.length > 0 && (
                  <span className="text-[10px] font-mono text-zinc-400">
                    找到 {searchResult.synonyms.length} 个
                  </span>
                )}
              </div>

              {searchResult.synonyms.length > 0 ? (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {searchResult.synonyms.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => onSelectWord && onSelectWord(item)}
                      className={`flex items-baseline gap-2 p-1.5 rounded-lg bg-zinc-800/60 hover:bg-emerald-500/10 border border-zinc-700/40 hover:border-emerald-500/30 transition-all ${
                        onSelectWord ? 'cursor-pointer group/item' : ''
                      }`}
                    >
                      <span className="font-mono font-bold text-white group-hover/item:text-emerald-300 shrink-0">
                        {item.word}
                      </span>
                      {item.part_of_speech && (
                        <span className="text-[10px] font-mono text-emerald-400/80 shrink-0">
                          {item.part_of_speech}
                        </span>
                      )}
                      <span className="text-zinc-300 text-[11px] flex-1">
                        {item.meaning}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-2 py-1 rounded bg-zinc-950/40 border border-zinc-800/50 text-zinc-400 text-xs italic">
                  无
                </div>
              )}
            </div>

            {/* Antonyms Section */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 font-semibold text-rose-400 text-[11px] tracking-wide">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  <span>反义词 (Antonyms)</span>
                </div>
                {searchResult.antonyms.length > 0 && (
                  <span className="text-[10px] font-mono text-zinc-400">
                    找到 {searchResult.antonyms.length} 个
                  </span>
                )}
              </div>

              {searchResult.antonyms.length > 0 ? (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {searchResult.antonyms.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => onSelectWord && onSelectWord(item)}
                      className={`flex items-baseline gap-2 p-1.5 rounded-lg bg-zinc-800/60 hover:bg-rose-500/10 border border-zinc-700/40 hover:border-rose-500/30 transition-all ${
                        onSelectWord ? 'cursor-pointer group/item' : ''
                      }`}
                    >
                      <span className="font-mono font-bold text-white group-hover/item:text-rose-300 shrink-0">
                        {item.word}
                      </span>
                      {item.part_of_speech && (
                        <span className="text-[10px] font-mono text-rose-400/80 shrink-0">
                          {item.part_of_speech}
                        </span>
                      )}
                      <span className="text-zinc-300 text-[11px] flex-1">
                        {item.meaning}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-2 py-1 rounded bg-zinc-950/40 border border-zinc-800/50 text-zinc-400 text-xs italic">
                  无
                </div>
              )}
            </div>

            {/* Footer tip */}
            <div className="mt-2.5 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[10px] text-zinc-400">
              <span className="flex items-center gap-1">
                <Sparkles size={10} className="text-zinc-400" />
                <span>悬停实时检索全库</span>
              </span>
              {onSelectWord && (
                <span className="text-zinc-400">点击结果可切换单词</span>
              )}
            </div>
          </div>

          {/* Small downward pointing triangle arrow */}
          <div className="w-2.5 h-2.5 bg-zinc-900 border-r border-b border-zinc-700/70 rotate-45 mx-auto -mt-1.5 shadow-sm" />
        </div>
      )}
    </div>
  );
};
