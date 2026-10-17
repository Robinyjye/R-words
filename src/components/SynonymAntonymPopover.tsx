import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ArrowLeftRight, Loader2, Sparkles, Database, Volume2 } from 'lucide-react';
import { WordState } from '../utils/word';
import { findSynonymsAndAntonymsInLibrary, fetchDatamuseSynAnt } from '../utils/thesaurus';
import { speakWordAndExample } from '../utils/audio';

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

  // Map of root_core -> root_meaning across all words for comprehensive lookups
  const rootMeaningsMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const w of allWords) {
      if (w.root_core && w.root_meaning) {
        map.set(w.root_core.toLowerCase().trim(), w.root_meaning.trim());
      }
    }
    return map;
  }, [allWords]);

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

      {/* Floating Hover Card - positioned on the right and shifted downward so it stays below the main word */}
      {isOpen && (
        <div 
          className="absolute left-full top-[-6px] ml-3.5 w-76 sm:w-88 z-50 animate-in fade-in zoom-in-95 duration-150 pointer-events-auto"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Invisible hover bridge to prevent mouseleave when moving across the gap */}
          <div className="absolute -left-4 top-0 w-4 h-full pointer-events-auto" />

          {/* Small left-pointing triangle arrow directed at the icon */}
          <div className="w-2.5 h-2.5 bg-zinc-900 border-l border-b border-zinc-700/70 rotate-45 absolute -left-1.5 top-[14px] shadow-sm z-10" />

          <div className="relative bg-zinc-900/95 border border-zinc-700/70 rounded-2xl shadow-2xl backdrop-blur-md p-3.5 text-left text-xs text-zinc-100 ring-1 ring-white/5">
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
                  {searchResult.synonyms.map((item) => {
                    const rootMeaning = item.root_meaning || (item.root_core ? rootMeaningsMap.get(item.root_core.toLowerCase().trim()) : '') || '';

                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          speakWordAndExample(item.word, item.example_sentence);
                        }}
                        className="flex items-baseline gap-2 p-1.5 rounded-lg bg-zinc-800/60 hover:bg-emerald-500/10 border border-zinc-700/40 hover:border-emerald-500/30 transition-all cursor-pointer group/item"
                        title="点击朗读单词和例句"
                      >
                        <span className="font-mono font-bold text-white group-hover/item:text-emerald-300 shrink-0">
                          {item.word}
                        </span>
                        {item.part_of_speech && (
                          <span className="text-[10px] font-mono text-emerald-400/80 shrink-0">
                            {item.part_of_speech}
                          </span>
                        )}
                        <span className="text-zinc-300 text-[11px] flex-1 truncate">
                          {item.meaning}
                        </span>

                        {/* Root tag with title showing root meaning */}
                        {item.root_core && (
                          <span
                            className="inline-flex items-center font-mono text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 shrink-0 font-medium cursor-default"
                            title={rootMeaning || undefined}
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                          >
                            {item.root_core}
                          </span>
                        )}

                        <Volume2 size={12} className="text-zinc-600 group-hover/item:text-emerald-400 shrink-0 self-center transition-colors" />
                      </div>
                    );
                  })}
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
                  {searchResult.antonyms.map((item) => {
                    const rootMeaning = item.root_meaning || (item.root_core ? rootMeaningsMap.get(item.root_core.toLowerCase().trim()) : '') || '';

                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          speakWordAndExample(item.word, item.example_sentence);
                        }}
                        className="flex items-baseline gap-2 p-1.5 rounded-lg bg-zinc-800/60 hover:bg-rose-500/10 border border-zinc-700/40 hover:border-rose-500/30 transition-all cursor-pointer group/item"
                        title="点击朗读单词和例句"
                      >
                        <span className="font-mono font-bold text-white group-hover/item:text-rose-300 shrink-0">
                          {item.word}
                        </span>
                        {item.part_of_speech && (
                          <span className="text-[10px] font-mono text-rose-400/80 shrink-0">
                            {item.part_of_speech}
                          </span>
                        )}
                        <span className="text-zinc-300 text-[11px] flex-1 truncate">
                          {item.meaning}
                        </span>

                        {/* Root tag with title showing root meaning */}
                        {item.root_core && (
                          <span
                            className="inline-flex items-center font-mono text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 shrink-0 font-medium cursor-default"
                            title={rootMeaning || undefined}
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                          >
                            {item.root_core}
                          </span>
                        )}

                        <Volume2 size={12} className="text-zinc-600 group-hover/item:text-rose-400 shrink-0 self-center transition-colors" />
                      </div>
                    );
                  })}
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
                <Sparkles size={10} className="text-sky-400" />
                <span>支持中英文义与同义词林检索</span>
              </span>
              <span className="text-zinc-400 flex items-center gap-1">
                <Volume2 size={10} className="text-zinc-400" />
                <span>点击单词朗读单词和例句</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
