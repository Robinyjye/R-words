export type ConfidenceLevel = 'low' | 'medium' | 'high';

export interface WordData {
  word: string;
  part_of_speech: string;
  phonetic?: string;
  prefix?: string;
  prefix_meaning?: string;
  root_core?: string;
  root_meaning?: string;
  suffix?: string;
  suffix_meaning?: string;
  meaning: string;
  phrase?: string;
  example_sentence?: string;
  synonyms?: string | string[];
  antonyms?: string | string[];
  confidence?: ConfidenceLevel;
}

export interface WordState extends WordData {
  id: string;
  listName?: string;
  previousListName?: string;
  review_count: number;
  last_review_time: number | null;
  has_error?: boolean;
  is_completed_normal?: boolean;
  is_completed_dictation?: boolean;
  ebbinghaus_stage?: number; // 0 to N
  is_mastered?: boolean;
  mastered_time?: number | null;
  game_correct_streak?: number;
  peek_penalty?: boolean;
  dictation_correct_streak?: number;
}

export const getPartOfSpeechBadgeClass = (pos?: string): string => {
  if (!pos) return 'bg-sky-500/20 text-sky-300 border-sky-500/35';
  const p = pos.trim().toLowerCase();
  if (p.startsWith('v') || p.includes('动词')) {
    return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/35';
  }
  if (p.startsWith('n') || p.includes('名词')) {
    return 'bg-sky-500/20 text-sky-300 border-sky-500/35';
  }
  if (p.startsWith('adj') || p.includes('形容词')) {
    return 'bg-amber-500/20 text-amber-300 border-amber-500/35';
  }
  if (p.startsWith('adv') || p.includes('副词')) {
    return 'bg-purple-500/20 text-purple-300 border-purple-500/35';
  }
  return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/35';
};
