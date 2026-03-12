export const REVIEW_INTERVALS = [
  5 * 60 * 1000, // 5 mins
  30 * 60 * 1000, // 30 mins
  12 * 60 * 60 * 1000, // 12 hours
  24 * 60 * 60 * 1000, // 1 day
  2 * 24 * 60 * 60 * 1000, // 2 days
  4 * 24 * 60 * 60 * 1000, // 4 days
  7 * 24 * 60 * 60 * 1000, // 7 days
  15 * 24 * 60 * 60 * 1000, // 15 days
];

export interface WordData {
  word: string;
  part_of_speech: string;
  root: string;
  meaning: string;
  example_sentence?: string;
}

export interface WordState extends WordData {
  id: string;
  listName?: string;
  review_count: number;
  last_review_time: number | null;
  next_review_time: number | null;
}

export const calculateNextReviewTime = (reviewCount: number, currentTime: number): number => {
  const index = Math.min(reviewCount, REVIEW_INTERVALS.length - 1);
  const interval = REVIEW_INTERVALS[index];
  return currentTime + interval;
};
