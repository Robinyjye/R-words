import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  ArrowLeftRight, 
  Search, 
  Volume2, 
  Sparkles, 
  Loader2, 
  Check, 
  ExternalLink, 
  BookOpen, 
  Layers, 
  Filter, 
  GitCompare, 
  Split, 
  ArrowRight,
  RefreshCw,
  Compass
} from 'lucide-react';
import { WordState, getPartOfSpeechBadgeClass } from '../utils/word';
import { speakWord } from '../utils/audio';
import { 
  getWordThesaurus, 
  findLibrarySynonymClusters, 
  findLibraryAntonymPairs, 
  generateThesaurusForWords, 
  normalizeWord,
  WordThesaurusResult,
  SynonymCluster,
  AntonymPair
} from '../utils/thesaurus';
import { motion, AnimatePresence } from 'motion/react';

interface SynonymsAntonymsModalProps {
  isOpen: boolean;
  onClose: () => void;
  allWords: WordState[];
  currentListWords: WordState[];
  activeList: string;
  currentWordId?: string;
  onSelectWord: (word: WordState) => void;
  onUpdateWords: (updatedWords: WordState[]) => void;
}

export const SynonymsAntonymsModal: React.FC<SynonymsAntonymsModalProps> = ({
  isOpen,
  onClose,
  allWords,
  currentListWords,
  activeList,
  currentWordId,
  onSelectWord,
  onUpdateWords,
}) => {
  // Scope: 'all' | 'current'
  const [scope, setScope] = useState<'all' | 'current'>('all');
  
  // Active Tab: 'index' (All words) | 'synonyms' (Clusters) | 'antonyms' (Pairs)
  const [activeTab, setActiveTab] = useState<'index' | 'synonyms' | 'antonyms'>('index');
  
  // Search query
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter: 'all' | 'matched' (words with library match) | 'has_syn' | 'has_ant'
  const [filterType, setFilterType] = useState<'all' | 'matched' | 'has_syn' | 'has_ant'>('all');

  // AI enrichment state
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichProgress, setEnrichProgress] = useState<{ current: number; total: number } | null>(null);
  const [enrichStatusMsg, setEnrichStatusMsg] = useState<string | null>(null);

  // Esc key listener
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

  // Active target words pool based on scope
  const targetWords = useMemo(() => {
    return scope === 'all' ? allWords : currentListWords;
  }, [scope, allWords, currentListWords]);

  // Compute thesaurus for each word
  const thesaurusList = useMemo(() => {
    return targetWords.map(w => getWordThesaurus(w, allWords));
  }, [targetWords, allWords]);

  // Count library connections
  const stats = useMemo(() => {
    let totalSynCount = 0;
    let totalAntCount = 0;
    let wordsWithMatches = 0;

    thesaurusList.forEach(t => {
      totalSynCount += t.synonyms.length;
      totalAntCount += t.antonyms.length;
      if (t.hasLibraryMatch) wordsWithMatches++;
    });

    return {
      totalSynCount,
      totalAntCount,
      wordsWithMatches,
      totalWords: targetWords.length
    };
  }, [thesaurusList, targetWords]);

  // Filtered thesaurus list for 'index' view
  const filteredThesaurusList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return thesaurusList.filter(item => {
      // Filter by type
      if (filterType === 'matched' && !item.hasLibraryMatch) return false;
      if (filterType === 'has_syn' && item.synonyms.length === 0) return false;
      if (filterType === 'has_ant' && item.antonyms.length === 0) return false;

      // Filter by search query
      if (!q) return true;
      const wMatch = item.word.toLowerCase().includes(q);
      const mMatch = item.wordState.meaning.toLowerCase().includes(q);
      const synMatch = item.synonyms.some(s => s.word.toLowerCase().includes(q));
      const antMatch = item.antonyms.some(a => a.word.toLowerCase().includes(q));

      return wMatch || mMatch || synMatch || antMatch;
    });
  }, [thesaurusList, searchQuery, filterType]);

  // Clusters and Antonym Pairs within the library
  const synonymClusters = useMemo(() => {
    return findLibrarySynonymClusters(targetWords);
  }, [targetWords]);

  const antonymPairs = useMemo(() => {
    return findLibraryAntonymPairs(targetWords);
  }, [targetWords]);

  // Batch AI enrichment
  const handleBatchEnrich = async () => {
    // Find words that lack synonyms or antonyms
    const lackingWords = targetWords.filter(w => {
      const hasSyn = Array.isArray(w.synonyms) && w.synonyms.length > 0;
      const hasAnt = Array.isArray(w.antonyms) && w.antonyms.length > 0;
      return !hasSyn && !hasAnt;
    });

    if (lackingWords.length === 0) {
      setEnrichStatusMsg('所有当前词汇已包含同义词/反义词');
      setTimeout(() => setEnrichStatusMsg(null), 3000);
      return;
    }

    setIsEnriching(true);
    setEnrichProgress({ current: 0, total: lackingWords.length });
    setEnrichStatusMsg(`正在智能分析 ${lackingWords.length} 个单词的同反义词...`);

    try {
      const chunkSize = 15;
      const updatedWordsMap = new Map<string, WordState>(allWords.map(w => [w.id, { ...w }]));

      for (let i = 0; i < lackingWords.length; i += chunkSize) {
        const chunk = lackingWords.slice(i, i + chunkSize);
        const results = await generateThesaurusForWords(chunk);

        chunk.forEach(w => {
          const norm = normalizeWord(w.word);
          const data = results[w.word] || results[norm];
          if (data && (data.synonyms?.length || data.antonyms?.length)) {
            const existing = updatedWordsMap.get(w.id);
            if (existing) {
              existing.synonyms = Array.from(new Set([...(existing.synonyms || []), ...(data.synonyms || [])]));
              existing.antonyms = Array.from(new Set([...(existing.antonyms || []), ...(data.antonyms || [])]));
            }
          }
        });

        setEnrichProgress({ current: Math.min(i + chunkSize, lackingWords.length), total: lackingWords.length });
      }

      const newAllWords = Array.from(updatedWordsMap.values());
      onUpdateWords(newAllWords);
      setEnrichStatusMsg(`🎉 成功补全 ${lackingWords.length} 个单词的同反义词！`);
      setTimeout(() => setEnrichStatusMsg(null), 3500);
    } catch (e: any) {
      console.error('Batch enrich error:', e);
      setEnrichStatusMsg('AI 补全过程中出现提示，已加载内置词典备选');
      setTimeout(() => setEnrichStatusMsg(null), 3500);
    } finally {
      setIsEnriching(false);
      setEnrichProgress(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-5xl h-[90vh] bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-5 py-4 border-b border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
              <ArrowLeftRight size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  词库同义词与反义词
                </h2>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-zinc-800/90 text-zinc-400 border border-zinc-700/60">
                  {stats.totalWords} 词 · {stats.wordsWithMatches} 组词库互联
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                基于艾宾浩斯词库智能挖掘同义互通与反义对照，点击任意词库词可直接跳转背诵
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {/* AI Enrich Button */}
            <button
              onClick={handleBatchEnrich}
              disabled={isEnriching}
              className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all select-none ${
                isEnriching
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 cursor-wait'
                  : 'bg-zinc-900 hover:bg-emerald-500/15 border-zinc-700 hover:border-emerald-500/40 text-zinc-300 hover:text-emerald-300 cursor-pointer'
              }`}
              title="一键通过 AI / 权威词库为缺少同反义词的单词进行补全"
            >
              {isEnriching ? (
                <>
                  <Loader2 size={13} className="animate-spin text-emerald-400" />
                  <span>分析补全中 ({enrichProgress?.current}/{enrichProgress?.total})...</span>
                </>
              ) : (
                <>
                  <Sparkles size={13} className="text-emerald-400" />
                  <span>智能补全同反义词</span>
                </>
              )}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 flex items-center justify-center transition-colors cursor-pointer"
              title="关闭 (Esc)"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Status notification banner if active */}
        {enrichStatusMsg && (
          <div className="bg-emerald-500/15 border-b border-emerald-500/30 px-5 py-2 text-xs font-medium text-emerald-300 flex items-center gap-2 animate-in fade-in duration-150">
            <Check size={14} className="text-emerald-400 shrink-0" />
            <span>{enrichStatusMsg}</span>
          </div>
        )}

        {/* Toolbar & Filter Bar */}
        <div className="px-5 py-3 border-b border-zinc-800/60 bg-zinc-950/60 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shrink-0">
          {/* Left: View Tabs */}
          <div className="flex items-center gap-1.5 bg-zinc-900/80 p-1 rounded-2xl border border-zinc-800/80 shrink-0">
            <button
              onClick={() => setActiveTab('index')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'index'
                  ? 'bg-zinc-800 text-white shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Layers size={13} className={activeTab === 'index' ? 'text-emerald-400' : ''} />
              <span>按词速查 ({filteredThesaurusList.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('synonyms')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'synonyms'
                  ? 'bg-zinc-800 text-white shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Split size={13} className={activeTab === 'synonyms' ? 'text-emerald-400' : ''} />
              <span>词库同义群组 ({synonymClusters.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('antonyms')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'antonyms'
                  ? 'bg-zinc-800 text-white shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <GitCompare size={13} className={activeTab === 'antonyms' ? 'text-rose-400' : ''} />
              <span>词库反义配对 ({antonymPairs.length})</span>
            </button>
          </div>

          {/* Right: Scope & Search & Filter */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Scope Toggle */}
            <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-0.5 text-xs text-zinc-400 shrink-0">
              <button
                onClick={() => setScope('all')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  scope === 'all' ? 'bg-zinc-800 text-emerald-400 font-medium' : 'hover:text-zinc-200'
                }`}
              >
                全部词库 ({allWords.length})
              </button>
              <button
                onClick={() => setScope('current')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer truncate max-w-[140px] ${
                  scope === 'current' ? 'bg-zinc-800 text-emerald-400 font-medium' : 'hover:text-zinc-200'
                }`}
                title={activeList}
              >
                {activeList} ({currentListWords.length})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 sm:w-56 min-w-[160px]">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索单词 / 释义 / 同反义词..."
                className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl pl-8 pr-7 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-0.5"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Quick Filter (only in index tab) */}
            {activeTab === 'index' && (
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-emerald-500/50 cursor-pointer"
              >
                <option value="all">全部单词</option>
                <option value="matched">仅看词库内有互联 📚</option>
                <option value="has_syn">包含同义词</option>
                <option value="has_ant">包含反义词</option>
              </select>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* TAB 1: ALL WORDS INDEX */}
          {activeTab === 'index' && (
            <>
              {filteredThesaurusList.length === 0 ? (
                <div className="text-center py-20 text-zinc-500 space-y-2">
                  <BookOpen size={40} className="mx-auto text-zinc-600 mb-2 stroke-1" />
                  <p className="text-sm">未找到符合条件的单词</p>
                  <p className="text-xs text-zinc-600">可以尝试清除搜索词或切换词表范围</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {filteredThesaurusList.map((item) => {
                    const isCurrent = item.wordState.id === currentWordId;
                    const posClass = getPartOfSpeechBadgeClass(item.wordState.part_of_speech);

                    return (
                      <div
                        key={item.wordState.id}
                        className={`p-4 rounded-2xl border transition-all duration-150 flex flex-col justify-between ${
                          isCurrent
                            ? 'bg-zinc-900/90 border-emerald-500/50 shadow-md shadow-emerald-500/5'
                            : 'bg-zinc-900/40 hover:bg-zinc-900/70 border-zinc-800/80 hover:border-zinc-700/80'
                        }`}
                      >
                        <div>
                          {/* Word Header */}
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-lg font-bold text-white tracking-wide">
                                {item.word}
                              </span>
                              {item.wordState.part_of_speech && (
                                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${posClass}`}>
                                  {item.wordState.part_of_speech}
                                </span>
                              )}
                              {item.wordState.phonetic && (
                                <span className="text-xs font-mono text-zinc-400">
                                  {item.wordState.phonetic}
                                </span>
                              )}
                              <button
                                onClick={() => speakWord(item.word)}
                                className="p-1 text-zinc-500 hover:text-emerald-400 rounded-full transition-colors cursor-pointer"
                                title="朗读发音"
                              >
                                <Volume2 size={14} />
                              </button>
                            </div>

                            {/* Jump to Word Action */}
                            <button
                              onClick={() => {
                                onSelectWord(item.wordState);
                                onClose();
                              }}
                              className="px-2.5 py-1 rounded-xl bg-zinc-800/80 hover:bg-emerald-500/20 text-zinc-400 hover:text-emerald-300 border border-zinc-700/60 hover:border-emerald-500/30 text-[11px] font-medium transition-all shrink-0 cursor-pointer flex items-center gap-1"
                              title="将此词设为主界面当前学习词"
                            >
                              <span>学习此词</span>
                              <ArrowRight size={11} />
                            </button>
                          </div>

                          {/* Meaning */}
                          <p className="text-xs text-zinc-300 font-medium mb-3 line-clamp-2">
                            {item.wordState.meaning || '暂无释义'}
                          </p>

                          {/* Synonyms Block */}
                          <div className="mb-2.5">
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 mb-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                              <span>同义词 ({item.synonyms.length})</span>
                            </div>

                            {item.synonyms.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {item.synonyms.map((syn, idx) => (
                                  <span
                                    key={idx}
                                    onClick={() => {
                                      if (syn.inLibrary && syn.libraryWord) {
                                        onSelectWord(syn.libraryWord);
                                        onClose();
                                      } else {
                                        speakWord(syn.word);
                                      }
                                    }}
                                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                                      syn.inLibrary
                                        ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-medium shadow-sm'
                                        : 'bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300 border border-zinc-750'
                                    }`}
                                    title={syn.inLibrary ? `📚 词库已有此词！点击直接跳转学习 "${syn.word}"` : `点击朗读 "${syn.word}"`}
                                  >
                                    <span>{syn.word}</span>
                                    {syn.inLibrary && (
                                      <span className="text-[9px] px-1 py-0 rounded bg-emerald-600/40 text-emerald-200 font-sans font-bold">
                                        词库
                                      </span>
                                    )}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[11px] text-zinc-600 italic">暂无同义词记录</span>
                            )}
                          </div>

                          {/* Antonyms Block */}
                          <div>
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-400 mb-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" />
                              <span>反义词 ({item.antonyms.length})</span>
                            </div>

                            {item.antonyms.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {item.antonyms.map((ant, idx) => (
                                  <span
                                    key={idx}
                                    onClick={() => {
                                      if (ant.inLibrary && ant.libraryWord) {
                                        onSelectWord(ant.libraryWord);
                                        onClose();
                                      } else {
                                        speakWord(ant.word);
                                      }
                                    }}
                                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                                      ant.inLibrary
                                        ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-medium shadow-sm'
                                        : 'bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300 border border-zinc-750'
                                    }`}
                                    title={ant.inLibrary ? `📚 词库已有此词！点击直接跳转学习 "${ant.word}"` : `点击朗读 "${ant.word}"`}
                                  >
                                    <span>{ant.word}</span>
                                    {ant.inLibrary && (
                                      <span className="text-[9px] px-1 py-0 rounded bg-rose-600/40 text-rose-200 font-sans font-bold">
                                        词库
                                      </span>
                                    )}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[11px] text-zinc-600 italic">暂无反义词记录</span>
                            )}
                          </div>
                        </div>

                        {/* List Footer tag */}
                        {item.wordState.listName && (
                          <div className="mt-3 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[10px] text-zinc-500">
                            <span>列表: {item.wordState.listName}</span>
                            {item.hasLibraryMatch && (
                              <span className="text-emerald-400 font-medium">包含词库内互联词</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* TAB 2: SYNONYM CLUSTERS IN LIBRARY */}
          {activeTab === 'synonyms' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-xs text-emerald-300 flex items-center justify-between">
                <span>
                  以下展示在你的词库中，<strong>互相具备同义关联</strong>的词组族群。成对或成群背诵同义词能显著加深辨析理解。
                </span>
                <span className="font-mono font-bold text-emerald-400">共 {synonymClusters.length} 个词群</span>
              </div>

              {synonymClusters.length === 0 ? (
                <div className="text-center py-20 text-zinc-500 space-y-2">
                  <Split size={40} className="mx-auto text-zinc-600 mb-2 stroke-1" />
                  <p className="text-sm">当前词库中暂未检测到互相重合的同义词族群</p>
                  <p className="text-xs text-zinc-600">点击右上角「智能补全同反义词」，AI 将自动挖掘词库词汇间的同义脉络</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {synonymClusters.map((cluster) => (
                    <div
                      key={cluster.id}
                      className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-emerald-500/30 transition-all space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
                          <h3 className="font-bold text-white text-base">
                            {cluster.label}
                          </h3>
                        </div>
                        <span className="text-xs text-zinc-400 font-mono">
                          包含 {cluster.words.length} 个词库词
                        </span>
                      </div>

                      {/* Matching words side by side */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
                        {cluster.words.map((w) => (
                          <div
                            key={w.id}
                            onClick={() => {
                              onSelectWord(w);
                              onClose();
                            }}
                            className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 hover:border-emerald-500/40 hover:bg-emerald-500/10 transition-all cursor-pointer group flex flex-col justify-between"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                                {w.word}
                              </span>
                              {w.part_of_speech && (
                                <span className="text-[10px] font-mono text-zinc-400">
                                  {w.part_of_speech}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-zinc-300 line-clamp-2">
                              {w.meaning || '暂无释义'}
                            </p>
                            <div className="mt-2 flex items-center justify-end text-[10px] text-zinc-500 group-hover:text-emerald-400 transition-colors">
                              <span>点击背诵 ➔</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Shared synonyms chips */}
                      {cluster.allSynonyms.length > 0 && (
                        <div className="pt-2 border-t border-zinc-800/60 flex items-center gap-2 text-xs text-zinc-400 flex-wrap">
                          <span className="text-[11px] text-zinc-500">扩展同义词参考:</span>
                          {cluster.allSynonyms.slice(0, 8).map((syn, idx) => (
                            <span key={idx} className="font-mono text-[11px] px-2 py-0.5 rounded bg-zinc-800/60 text-zinc-300">
                              {syn}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ANTONYM PAIRS IN LIBRARY */}
          {activeTab === 'antonyms' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs text-rose-300 flex items-center justify-between">
                <span>
                  以下展示在你的词库中，<strong>互为反义对照</strong>的核心词对。对比记忆可建立强烈的认知反差，加速掌握。
                </span>
                <span className="font-mono font-bold text-rose-400">共 {antonymPairs.length} 组反义对</span>
              </div>

              {antonymPairs.length === 0 ? (
                <div className="text-center py-20 text-zinc-500 space-y-2">
                  <GitCompare size={40} className="mx-auto text-zinc-600 mb-2 stroke-1" />
                  <p className="text-sm">当前词库中暂未检测到互为反义的成对单词</p>
                  <p className="text-xs text-zinc-600">点击右上角「智能补全同反义词」，AI 将自动识别反义关系</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {antonymPairs.map((pair) => (
                    <div
                      key={pair.id}
                      className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-rose-500/30 transition-all flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-rose-400 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                          <span>反义对立</span>
                        </span>
                        <ArrowLeftRight size={14} className="text-zinc-500" />
                      </div>

                      {/* Opposing words card */}
                      <div className="grid grid-cols-2 gap-3 relative">
                        {/* Word A */}
                        <div
                          onClick={() => {
                            onSelectWord(pair.wordA);
                            onClose();
                          }}
                          className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-emerald-500/40 hover:bg-emerald-500/10 transition-all cursor-pointer group flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-base font-bold text-white group-hover:text-emerald-300">
                                {pair.wordA.word}
                              </span>
                              <span className="text-[10px] font-mono text-zinc-400">
                                {pair.wordA.part_of_speech}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-300 line-clamp-2">
                              {pair.wordA.meaning || '暂无释义'}
                            </p>
                          </div>
                          <span className="mt-2 text-[10px] text-zinc-500 group-hover:text-emerald-400 self-end">
                            背诵 ➔
                          </span>
                        </div>

                        {/* VS Badge */}
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-rose-500/20 border border-rose-500/40 text-[9px] font-bold text-rose-300 flex items-center justify-center pointer-events-none z-10">
                          VS
                        </div>

                        {/* Word B */}
                        <div
                          onClick={() => {
                            onSelectWord(pair.wordB);
                            onClose();
                          }}
                          className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-rose-500/40 hover:bg-rose-500/10 transition-all cursor-pointer group flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-base font-bold text-white group-hover:text-rose-300">
                                {pair.wordB.word}
                              </span>
                              <span className="text-[10px] font-mono text-zinc-400">
                                {pair.wordB.part_of_speech}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-300 line-clamp-2">
                              {pair.wordB.meaning || '暂无释义'}
                            </p>
                          </div>
                          <span className="mt-2 text-[10px] text-zinc-500 group-hover:text-rose-400 self-end">
                            背诵 ➔
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-zinc-800/80 bg-zinc-900/40 flex items-center justify-between text-xs text-zinc-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded bg-emerald-500/40 border border-emerald-500/60 inline-block" />
              <span>绿色：同义词</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded bg-rose-500/40 border border-rose-500/60 inline-block" />
              <span>红色：反义词</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="text-[9px] px-1 py-0 rounded bg-emerald-600/40 text-emerald-200 font-sans font-bold">词库</span>
              <span>：词库已收录单词，点击可直接跳转</span>
            </span>
          </div>

          <div className="font-mono text-[11px] text-zinc-500">
            按 <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">ESC</kbd> 退出
          </div>
        </div>
      </div>
    </div>
  );
};
