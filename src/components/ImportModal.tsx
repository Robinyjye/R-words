import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import * as mammoth from 'mammoth';
import { WordState } from '../utils/word';
import { enrichWords } from '../utils/gemini';
import { Upload, X, FileText, ClipboardPaste, Loader2 } from 'lucide-react';

interface ImportModalProps {
  onImport: (words: WordState[]) => void;
  onClose: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ onImport, onClose }) => {
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'file' | 'paste'>('file');
  const [pasteContent, setPasteContent] = useState('');
  const [listName, setListName] = useState('');
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichProgress, setEnrichProgress] = useState<{ current: number; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    
    // Auto-fill list name from file name if empty
    if (!listName.trim()) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      setListName(nameWithoutExt);
    }

    if (file.name.endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          processImportedData(Array.isArray(json) ? json : [json]);
        } catch (err) {
          setError('Invalid JSON file format.');
        }
      };
      reader.readAsText(file);
    } else if (file.name.endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            setError('Error parsing CSV file.');
            return;
          }
          processImportedData(results.data);
        },
      });
    } else if (file.name.endsWith('.docx')) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const arrayBuffer = event.target?.result as ArrayBuffer;
          const result = await mammoth.extractRawText({ arrayBuffer });
          const text = result.value;
          const words = text.match(/[a-zA-Z-]+/g);
          if (words && words.length > 0) {
            const uniqueWords = Array.from(new Set(words.map(w => w.toLowerCase())));
            processImportedData(uniqueWords.map(w => ({ word: w })));
          } else {
            setError('Could not extract any valid English words from the Word document.');
          }
        } catch (err) {
          setError('Error parsing Word document.');
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      // Fallback for plain text files (.txt)
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const words = text.match(/[a-zA-Z-]+/g);
        if (words && words.length > 0) {
          const uniqueWords = Array.from(new Set(words.map(w => w.toLowerCase())));
          processImportedData(uniqueWords.map(w => ({ word: w })));
        } else {
          setError('Could not extract any valid English words from the text file.');
        }
      };
      reader.readAsText(file);
    }
  };

  const handlePasteSubmit = () => {
    if (!pasteContent.trim()) {
      setError('Please paste some content first.');
      return;
    }
    
    setError(null);
    
    // Try parsing as JSON first
    try {
      const json = JSON.parse(pasteContent);
      processImportedData(Array.isArray(json) ? json : [json]);
      return;
    } catch (err) {}

    // Fallback to parsing as CSV
    Papa.parse(pasteContent, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        // If it doesn't look like a valid CSV with a 'word' column, treat as raw text
        if (results.errors.length > 0 || !results.meta.fields?.includes('word')) {
          // Extract words using regex
          const words = pasteContent.match(/[a-zA-Z-]+/g);
          if (words && words.length > 0) {
            // Remove duplicates
            const uniqueWords = Array.from(new Set(words.map(w => w.toLowerCase())));
            processImportedData(uniqueWords.map(w => ({ word: w })));
          } else {
            setError('Could not extract any valid English words from the text.');
          }
          return;
        }
        processImportedData(results.data);
      },
    });
  };

  const processImportedData = async (data: any[]) => {
    setIsEnriching(true);
    setError(null);
    
    const finalListName = listName.trim() || 'Default List';
    
    try {
      const validWords: WordState[] = [];
      const wordsToEnrich: string[] = [];
      
      for (const item of data) {
        if (item.word && typeof item.word === 'string') {
          const wordStr = item.word.trim();
          if (!wordStr) continue;
          
          const wordObj: WordState = {
            id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
            listName: finalListName,
            word: wordStr,
            part_of_speech: item.part_of_speech || '',
            phonetic: item.phonetic || '',
            root: item.root || '',
            meaning: item.meaning || '',
            example_sentence: item.example_sentence || '',
            review_count: 0,
            last_review_time: null,
            is_completed_normal: false,
            is_completed_dictation: false,
          };

          if (!wordObj.meaning || !wordObj.example_sentence) {
            wordsToEnrich.push(wordStr);
          }
          validWords.push(wordObj);
        }
      }

      if (validWords.length === 0) {
        setError('No valid words found. Ensure your data has a "word" field or is a list of words.');
        setIsEnriching(false);
        return;
      }

      if (wordsToEnrich.length > 0) {
        setEnrichProgress({ current: 0, total: wordsToEnrich.length });
        const enrichedDataMap = new Map<string, any>();
        const chunkSize = 50; // Increased chunk size for faster processing
        
        const chunks: string[][] = [];
        for (let i = 0; i < wordsToEnrich.length; i += chunkSize) {
          chunks.push(wordsToEnrich.slice(i, i + chunkSize));
        }

        let completedWords = 0;
        const processChunk = async (chunk: string[]) => {
          try {
            const enrichedChunk = await enrichWords(chunk);
            for (const item of enrichedChunk) {
              enrichedDataMap.set(item.word.toLowerCase(), item);
            }
          } catch (err) {
            console.error("Error enriching chunk:", err);
          } finally {
            completedWords += chunk.length;
            setEnrichProgress({ current: Math.min(completedWords, wordsToEnrich.length), total: wordsToEnrich.length });
          }
        };

        // Process chunks in parallel with a concurrency limit of 3
        const concurrencyLimit = 3;
        for (let i = 0; i < chunks.length; i += concurrencyLimit) {
          const batch = chunks.slice(i, i + concurrencyLimit);
          await Promise.all(batch.map(processChunk));
        }

        // Merge back
        for (const wordObj of validWords) {
          if (!wordObj.meaning || !wordObj.example_sentence) {
            const enriched = enrichedDataMap.get(wordObj.word.toLowerCase());
            if (enriched) {
              wordObj.part_of_speech = enriched.part_of_speech || wordObj.part_of_speech;
              wordObj.phonetic = enriched.phonetic || wordObj.phonetic;
              wordObj.root = enriched.root || wordObj.root;
              wordObj.meaning = enriched.meaning || wordObj.meaning;
              wordObj.example_sentence = enriched.example_sentence || wordObj.example_sentence;
            }
          }
        }
      }

      onImport(validWords);
    } catch (err: any) {
      setError(err.message || 'An error occurred while processing words.');
    } finally {
      setIsEnriching(false);
      setEnrichProgress(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
        <button 
          onClick={onClose}
          disabled={isEnriching}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
        >
          <X size={20} />
        </button>
        
        <h2 className="text-xl font-medium text-white mb-4">Import Words</h2>
        
        <p className="text-sm text-zinc-400 mb-6">
          Upload a file or paste text containing your vocabulary. If you only provide the words, our AI will automatically fetch their meanings, part of speech, roots, and example sentences!
        </p>

        <div className="mb-6">
          <label className="block text-sm font-medium text-zinc-400 mb-2">List Name (Optional)</label>
          <input 
            type="text" 
            value={listName}
            onChange={(e) => setListName(e.target.value)}
            disabled={isEnriching}
            placeholder="e.g., TOEFL Core, Chapter 1..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-300 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 disabled:opacity-50"
          />
        </div>

        <div className="flex space-x-2 mb-6 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
          <button 
            onClick={() => { setActiveTab('file'); setError(null); }} 
            disabled={isEnriching}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 ${activeTab === 'file' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <FileText size={16} />
            <span>File Upload</span>
          </button>
          <button 
            onClick={() => { setActiveTab('paste'); setError(null); }} 
            disabled={isEnriching}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 ${activeTab === 'paste' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <ClipboardPaste size={16} />
            <span>Paste Text</span>
          </button>
        </div>

        {activeTab === 'file' ? (
          <div 
            className={`border-2 border-dashed border-zinc-700 rounded-xl p-8 flex flex-col items-center justify-center transition-all ${isEnriching ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-emerald-500/50 hover:bg-zinc-800/50'}`}
            onClick={() => !isEnriching && fileInputRef.current?.click()}
          >
            <Upload className="text-zinc-500 mb-3" size={32} />
            <span className="text-zinc-300 font-medium">Click to select file</span>
            <span className="text-zinc-500 text-xs mt-1">.json, .csv, .txt, or .docx</span>
            <input 
              type="file" 
              ref={fileInputRef}
              className="hidden" 
              accept=".json,.csv,.txt,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileUpload}
              disabled={isEnriching}
            />
          </div>
        ) : (
          <div className="flex flex-col space-y-3">
            <textarea
              value={pasteContent}
              onChange={(e) => setPasteContent(e.target.value)}
              disabled={isEnriching}
              placeholder="Paste your words here...&#10;&#10;apple&#10;banana&#10;cherry"
              className="w-full h-40 bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-300 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 resize-none font-mono placeholder:text-zinc-700 disabled:opacity-50"
            />
            <button
              onClick={handlePasteSubmit}
              disabled={isEnriching}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {isEnriching ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  <span>
                    {enrichProgress 
                      ? `AI is fetching word details (${enrichProgress.current}/${enrichProgress.total})...` 
                      : 'AI is fetching word details...'}
                  </span>
                </>
              ) : (
                <span>Import Pasted Text</span>
              )}
            </button>
          </div>
        )}

        {isEnriching && activeTab === 'file' && (
          <div className="mt-4 flex items-center justify-center space-x-2 text-emerald-400 text-sm font-medium">
            <Loader2 className="animate-spin" size={16} />
            <span>
              {enrichProgress 
                ? `AI is fetching word details (${enrichProgress.current}/${enrichProgress.total})...` 
                : 'AI is fetching word details...'}
            </span>
          </div>
        )}

        {error && !isEnriching && (
          <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-sm">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};
