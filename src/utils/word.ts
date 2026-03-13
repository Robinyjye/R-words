export interface WordData {
  word: string;
  part_of_speech: string;
  phonetic?: string;
  root: string;
  meaning: string;
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
}
