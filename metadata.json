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
}

export interface WordState extends WordData {
  id: string;
  listName?: string;
  review_count: number;
  last_review_time: number | null;
  has_error?: boolean;
  is_completed_normal?: boolean;
  is_completed_dictation?: boolean;
  ebbinghaus_stage?: number; // 0 to N
  is_mastered?: boolean;
}
