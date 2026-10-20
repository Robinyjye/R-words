import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  TrendingUp, 
  Clock, 
  Timer, 
  Brain, 
  Flame, 
  Calendar, 
  Award, 
  CheckCircle2, 
  Layers, 
  ShieldCheck, 
  Activity,
  Sparkles,
  Milestone,
  ArrowUpRight,
  LineChart as LineChartIcon
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  ComposedChart, 
  Area, 
  XAxis, 
  YAxis, 
  ResponsiveContainer, 
  Tooltip, 
  Cell, 
  CartesianGrid, 
  Legend 
} from 'recharts';
import { WordState } from '../utils/word';
import { isWordDue } from '../utils/storage';

interface DailyStat {
  count: number; // words
  minutes?: number; // learning minutes
  seconds?: number; // learning seconds
  masteredCount?: number; // words mastered
}

interface Stats {
  totalCount: number;
  totalMinutes?: number;
  totalSeconds?: number;
  daily: { [date: string]: DailyStat };
}

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: Stats;
  words?: WordState[];
}

interface TrendPoint {
  label: string;
  shortLabel: string;
  fullPeriod: string;
  cumulativeMastered: number;
  newMastered: number;
  reviewCount: number;
  studyMinutes: number;
  startDate: string;
  endDate: string;
}

const formatLocalDate = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const CustomTrendTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0]?.payload as TrendPoint;
    if (!data) return null;
    return (
      <div className="bg-zinc-950/95 border border-zinc-800 p-3.5 rounded-2xl shadow-2xl backdrop-blur-md text-xs space-y-2 min-w-[210px]">
        <div className="font-semibold text-zinc-300 pb-1.5 border-b border-zinc-800/80 flex items-center justify-between gap-2">
          <span className="truncate">{data.fullPeriod}</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
            {data.shortLabel}
          </span>
        </div>
        <div className="space-y-1.5 pt-0.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
              累计掌握总量:
            </span>
            <span className="font-mono font-bold text-emerald-400 text-sm">
              {data.cumulativeMastered} <span className="text-[10px] font-normal text-zinc-500">词</span>
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]" />
              当期新增掌握:
            </span>
            <span className="font-mono font-bold text-amber-400 text-sm">
              +{data.newMastered} <span className="text-[10px] font-normal text-zinc-500">词</span>
            </span>
          </div>
          {data.reviewCount > 0 && (
            <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-zinc-900">
              <span className="flex items-center gap-1 text-zinc-500">
                <Activity size={12} className="text-cyan-400" />
                复习记忆频次:
              </span>
              <span className="font-mono text-zinc-300">
                {data.reviewCount} 词次
              </span>
            </div>
          )}
          {data.studyMinutes > 0 && (
            <div className="flex items-center justify-between text-[11px] text-zinc-400">
              <span className="flex items-center gap-1 text-zinc-500">
                <Clock size={12} className="text-amber-400" />
                有效学习时长:
              </span>
              <span className="font-mono text-zinc-300">
                {data.studyMinutes} 分钟
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export function StatsModal({ isOpen, onClose, stats, words = [] }: StatsModalProps) {
  const heatmapContainerRef = useRef<HTMLDivElement>(null);
  const [selectedDay, setSelectedDay] = useState<{
    date: string;
    count: number;
    minutes: number;
  } | null>(null);

  // Mastered words trend controls
  const [trendPeriod, setTrendPeriod] = useState<'week' | 'month' | 'day'>('week');
  const [trendMetric, setTrendMetric] = useState<'both' | 'cumulative' | 'new'>('both');

  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => today.toISOString().split('T')[0], [today]);
  const todayStats = stats.daily[todayStr] || { count: 0, minutes: 0, seconds: 0 };

  // Mastered words calculation & date distribution
  const masteredWords = useMemo(() => {
    return words.filter(w => w.is_mastered === true || w.listName === 'Mastered Words');
  }, [words]);
  const totalMasteredCount = masteredWords.length;
  const totalWordsCount = words.length;

  // Track words mastered by date
  const wordsMasteredByDate = useMemo(() => {
    const map: Record<string, number> = {};
    const unassigned: WordState[] = [];

    masteredWords.forEach(w => {
      let dStr: string | null = null;
      if (w.mastered_time) {
        dStr = formatLocalDate(new Date(w.mastered_time));
      } else if (w.last_review_time) {
        dStr = formatLocalDate(new Date(w.last_review_time));
      }

      if (dStr) {
        map[dStr] = (map[dStr] || 0) + 1;
      } else {
        unassigned.push(w);
      }
    });

    // Also factor in stats.daily[dateStr]?.masteredCount
    Object.keys(stats.daily || {}).forEach(dateStr => {
      const explicit = stats.daily[dateStr]?.masteredCount || 0;
      if (explicit > (map[dateStr] || 0)) {
        map[dateStr] = explicit;
      }
    });

    // If there are unassigned words without timestamp, spread them gracefully
    // over active learning days, or place on todayStr
    if (unassigned.length > 0) {
      const activeDates = Object.keys(stats.daily || {})
        .filter(d => (stats.daily[d]?.count || 0) > 0)
        .sort();

      if (activeDates.length > 0) {
        unassigned.forEach((_, idx) => {
          const targetDate = activeDates[idx % activeDates.length];
          map[targetDate] = (map[targetDate] || 0) + 1;
        });
      } else {
        map[todayStr] = (map[todayStr] || 0) + unassigned.length;
      }
    }

    return map;
  }, [masteredWords, stats.daily, todayStr]);

  const getMasteredInRange = useCallback((startDateStr: string, endDateStr: string) => {
    let count = 0;
    Object.keys(wordsMasteredByDate).forEach(d => {
      if (d >= startDateStr && d <= endDateStr) {
        count += wordsMasteredByDate[d];
      }
    });
    return count;
  }, [wordsMasteredByDate]);

  const getMasteredBefore = useCallback((endDateStr: string) => {
    let count = 0;
    Object.keys(wordsMasteredByDate).forEach(d => {
      if (d <= endDateStr) {
        count += wordsMasteredByDate[d];
      }
    });
    return count;
  }, [wordsMasteredByDate]);

  // Weekly trend points (Last 8 weeks)
  const weeklyTrendData = useMemo(() => {
    const points: TrendPoint[] = [];
    const now = new Date();
    const dayOfWeek = (now.getDay() + 6) % 7; // Monday = 0, Sunday = 6
    const thisMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);

    let runningCum = 0;

    for (let i = 7; i >= 0; i--) {
      const weekMonday = new Date(thisMonday.getFullYear(), thisMonday.getMonth(), thisMonday.getDate() - (i * 7));
      const weekSunday = new Date(weekMonday.getFullYear(), weekMonday.getMonth(), weekMonday.getDate() + 6);

      const startStr = formatLocalDate(weekMonday);
      const endStr = formatLocalDate(weekSunday);

      let reviews = 0;
      let minutes = 0;
      const cur = new Date(weekMonday);
      while (cur <= weekSunday) {
        const curStr = formatLocalDate(cur);
        const dayStat = stats.daily[curStr];
        if (dayStat) {
          reviews += dayStat.count || 0;
          const sec = dayStat.seconds ?? (dayStat.minutes ? dayStat.minutes * 60 : 0);
          minutes += sec > 0 ? Math.round(sec / 60) : (dayStat.count > 0 ? Math.round(dayStat.count * 0.8) : 0);
        }
        cur.setDate(cur.getDate() + 1);
      }

      const newThisPeriod = getMasteredInRange(startStr, endStr);
      const cumBefore = getMasteredBefore(endStr);
      runningCum = Math.max(runningCum, cumBefore);

      const isCurrentWeek = i === 0;
      const weekNum = 8 - i;
      const startDisplay = `${weekMonday.getMonth() + 1}/${weekMonday.getDate()}`;
      const endDisplay = `${weekSunday.getMonth() + 1}/${weekSunday.getDate()}`;
      const label = isCurrentWeek ? '本周' : `第${weekNum}周 (${startDisplay})`;
      const shortLabel = isCurrentWeek ? '本周' : `${startDisplay}`;
      const fullPeriod = `${startStr} ~ ${endStr}${isCurrentWeek ? ' (当前周)' : ''}`;

      points.push({
        label,
        shortLabel,
        fullPeriod,
        cumulativeMastered: runningCum,
        newMastered: newThisPeriod,
        reviewCount: reviews,
        studyMinutes: minutes,
        startDate: startStr,
        endDate: endStr,
      });
    }

    if (points.length > 0 && points[points.length - 1].cumulativeMastered < totalMasteredCount) {
      points[points.length - 1].cumulativeMastered = totalMasteredCount;
    }

    return points;
  }, [wordsMasteredByDate, stats.daily, totalMasteredCount, getMasteredInRange, getMasteredBefore]);

  // Monthly trend points (Last 6 months)
  const monthlyTrendData = useMemo(() => {
    const points: TrendPoint[] = [];
    const now = new Date();
    let runningCum = 0;

    for (let i = 5; i >= 0; i--) {
      const year = now.getFullYear();
      const monthIndex = now.getMonth() - i;
      const targetDate = new Date(year, monthIndex, 1);
      const actualYear = targetDate.getFullYear();
      const actualMonth = targetDate.getMonth();

      const start = new Date(actualYear, actualMonth, 1);
      const end = new Date(actualYear, actualMonth + 1, 0);

      const startStr = formatLocalDate(start);
      const endStr = formatLocalDate(end);

      let reviews = 0;
      let minutes = 0;
      const cur = new Date(start);
      while (cur <= end) {
        const curStr = formatLocalDate(cur);
        const dayStat = stats.daily[curStr];
        if (dayStat) {
          reviews += dayStat.count || 0;
          const sec = dayStat.seconds ?? (dayStat.minutes ? dayStat.minutes * 60 : 0);
          minutes += sec > 0 ? Math.round(sec / 60) : (dayStat.count > 0 ? Math.round(dayStat.count * 0.8) : 0);
        }
        cur.setDate(cur.getDate() + 1);
      }

      const newThisPeriod = getMasteredInRange(startStr, endStr);
      const cumBefore = getMasteredBefore(endStr);
      runningCum = Math.max(runningCum, cumBefore);

      const isCurrentMonth = i === 0;
      const label = isCurrentMonth ? '本月' : `${actualMonth + 1}月`;
      const shortLabel = isCurrentMonth ? '本月' : `${actualMonth + 1}月`;
      const fullPeriod = `${actualYear}年${actualMonth + 1}月${isCurrentMonth ? ' (当前月)' : ''}`;

      points.push({
        label,
        shortLabel,
        fullPeriod,
        cumulativeMastered: runningCum,
        newMastered: newThisPeriod,
        reviewCount: reviews,
        studyMinutes: minutes,
        startDate: startStr,
        endDate: endStr,
      });
    }

    if (points.length > 0 && points[points.length - 1].cumulativeMastered < totalMasteredCount) {
      points[points.length - 1].cumulativeMastered = totalMasteredCount;
    }

    return points;
  }, [wordsMasteredByDate, stats.daily, totalMasteredCount, getMasteredInRange, getMasteredBefore]);

  // Daily 30-day trend points
  const dailyTrendData = useMemo(() => {
    const points: TrendPoint[] = [];
    let runningCum = 0;

    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = formatLocalDate(d);
      const displayDate = d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });

      const dayStat = stats.daily[dateStr];
      const reviews = dayStat?.count || 0;
      const sec = dayStat?.seconds ?? (dayStat?.minutes ? dayStat.minutes * 60 : 0);
      const minutes = sec > 0 ? Math.round(sec / 60) : (reviews > 0 ? Math.round(reviews * 0.8) : 0);

      const newThisPeriod = wordsMasteredByDate[dateStr] || 0;
      const cumBefore = getMasteredBefore(dateStr);
      runningCum = Math.max(runningCum, cumBefore);

      const isToday = i === 0;
      points.push({
        label: isToday ? '今天' : displayDate,
        shortLabel: displayDate,
        fullPeriod: dateStr + (isToday ? ' (今日)' : ''),
        cumulativeMastered: runningCum,
        newMastered: newThisPeriod,
        reviewCount: reviews,
        studyMinutes: minutes,
        startDate: dateStr,
        endDate: dateStr,
      });
    }

    if (points.length > 0 && points[points.length - 1].cumulativeMastered < totalMasteredCount) {
      points[points.length - 1].cumulativeMastered = totalMasteredCount;
    }

    return points;
  }, [wordsMasteredByDate, stats.daily, totalMasteredCount, getMasteredBefore]);

  const currentTrendData = useMemo(() => {
    if (trendPeriod === 'week') return weeklyTrendData;
    if (trendPeriod === 'month') return monthlyTrendData;
    return dailyTrendData;
  }, [trendPeriod, weeklyTrendData, monthlyTrendData, dailyTrendData]);

  const progressSummary = useMemo(() => {
    const currentPoint = currentTrendData[currentTrendData.length - 1] || { cumulativeMastered: 0, newMastered: 0 };
    const prevPoint = currentTrendData[currentTrendData.length - 2] || { cumulativeMastered: 0, newMastered: 0 };

    const currentPeriodNew = currentPoint.newMastered;
    const previousPeriodNew = prevPoint.newMastered;
    const diffFromPrev = currentPeriodNew - previousPeriodNew;

    const totalNewInWindow = currentTrendData.reduce((acc, p) => acc + p.newMastered, 0);
    const avgVelocity = currentTrendData.length > 0
      ? (totalNewInWindow / currentTrendData.length).toFixed(1)
      : '0';

    const masteryRate = totalWordsCount > 0
      ? ((totalMasteredCount / totalWordsCount) * 100).toFixed(1)
      : '0';

    let feedbackText = '稳扎稳打 · 抗遗忘转化中';
    let feedbackEmoji = '🌱';
    if (totalMasteredCount >= 50 || currentPeriodNew >= 15) {
      feedbackText = '极速突破 · 长期记忆成网';
      feedbackEmoji = '🚀';
    } else if (totalMasteredCount >= 10 || currentPeriodNew >= 5) {
      feedbackText = '稳健精进 · 形成飞轮效应';
      feedbackEmoji = '🔥';
    } else if (totalMasteredCount > 0) {
      feedbackText = '初露锋芒 · 迈出关键一步';
      feedbackEmoji = '✨';
    }

    return {
      totalMastered: totalMasteredCount,
      masteryRate,
      currentPeriodNew,
      diffFromPrev,
      avgVelocity,
      feedbackText,
      feedbackEmoji,
      periodUnit: trendPeriod === 'week' ? '周' : (trendPeriod === 'month' ? '月' : '天'),
    };
  }, [currentTrendData, totalMasteredCount, totalWordsCount, trendPeriod]);

  useEffect(() => {
    if (isOpen && heatmapContainerRef.current) {
      const timer = setTimeout(() => {
        if (heatmapContainerRef.current) {
          heatmapContainerRef.current.scrollLeft = heatmapContainerRef.current.scrollWidth;
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Calculate learning time in minutes & hours
  const todayTrackedSec = todayStats.seconds ?? (todayStats.minutes ? todayStats.minutes * 60 : 0);
  const todayMinutes = todayTrackedSec > 0
    ? Math.max(1, Math.round(todayTrackedSec / 60))
    : (todayStats.count > 0 ? Math.max(1, Math.round(todayStats.count * 0.8)) : 0);

  const totalTrackedSec = stats.totalSeconds ?? (stats.totalMinutes ? stats.totalMinutes * 60 : 0);
  const totalMinutes = totalTrackedSec > 0
    ? Math.max(todayMinutes, Math.round(totalTrackedSec / 60))
    : (stats.totalCount > 0 ? Math.max(todayMinutes, Math.round(stats.totalCount * 0.8)) : 0);

  const totalHours = useMemo(() => {
    if (totalMinutes <= 0) return '0';
    const hours = totalMinutes / 60;
    if (hours < 0.1) return '0.1';
    return Number(hours.toFixed(1)).toString();
  }, [totalMinutes]);

  // Prepare data for the bar chart (last 30 days)
  const barChartData = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      const dateStr = d.toISOString().split('T')[0];
      return {
        date: dateStr,
        displayDate: d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }),
        count: stats.daily[dateStr]?.count || 0,
      };
    });
  }, [stats.daily]);

  // Prepare data for the annual heatmap (last 52 full weeks = ~364/365 days)
  const heatmapData = useMemo(() => {
    const data = [];
    const end = new Date();
    // Align to Saturday to keep a complete 7-row grid
    const dayOfWeek = end.getDay();
    end.setDate(end.getDate() + (6 - dayOfWeek));

    const start = new Date(end);
    start.setDate(start.getDate() - (52 * 7) + 1);

    const current = new Date(start);
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      const dayData = stats.daily[dateStr];
      const count = dayData?.count || 0;
      const sec = dayData?.seconds ?? (dayData?.minutes ? dayData.minutes * 60 : 0);
      const minutes = sec > 0 ? Math.round(sec / 60) : (count > 0 ? Math.round(count * 0.8) : 0);

      data.push({
        date: dateStr,
        count,
        minutes,
        dayOfWeek: current.getDay(),
        month: current.getMonth(),
        isToday: dateStr === todayStr,
      });
      current.setDate(current.getDate() + 1);
    }
    return data;
  }, [stats.daily, todayStr]);

  // Heatmap color intensity based on daily memorization and Ebbinghaus consolidation workload
  const getIntensity = (count: number) => {
    if (count === 0) return 'bg-zinc-800/40 border-zinc-800/20';
    if (count < 5) return 'bg-emerald-950/70 border-emerald-900/40 text-emerald-300';
    if (count < 15) return 'bg-emerald-800/70 border-emerald-700/60 text-emerald-200';
    if (count < 30) return 'bg-emerald-600 border-emerald-500/80 text-white';
    return 'bg-emerald-400 border-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.4)] text-zinc-950 font-bold';
  };

  const monthLabels = useMemo(() => {
    const labels: { label: string; index: number }[] = [];
    let lastMonth = -1;
    heatmapData.forEach((d, i) => {
      if (d.dayOfWeek === 0) {
        const date = new Date(d.date);
        const month = date.getMonth();
        if (month !== lastMonth) {
          labels.push({
            label: date.toLocaleDateString('zh-CN', { month: 'short' }),
            index: Math.floor(i / 7),
          });
          lastMonth = month;
        }
      }
    });
    return labels;
  }, [heatmapData]);

  // Learning Habit Analytics: Streaks, Best Days, and Habit Consistency
  const habitStats = useMemo(() => {
    const activeDates = new Set(
      Object.keys(stats.daily || {}).filter(date => {
        const d = stats.daily[date];
        return (d.count > 0) || ((d.seconds || 0) > 0) || ((d.minutes || 0) > 0);
      })
    );

    // Calculate current streak
    let currentStreak = 0;
    const checkDate = new Date();
    // Check if studied today, if not check starting from yesterday
    const todayKey = checkDate.toISOString().split('T')[0];
    if (!activeDates.has(todayKey)) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (true) {
      const key = checkDate.toISOString().split('T')[0];
      if (activeDates.has(key)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    // Calculate max streak across all heatmap days
    let maxStreak = 0;
    let tempStreak = 0;
    heatmapData.forEach(d => {
      if (d.count > 0 || d.minutes > 0) {
        tempStreak++;
        if (tempStreak > maxStreak) maxStreak = tempStreak;
      } else {
        tempStreak = 0;
      }
    });

    // Day of week distribution (0: Sun to 6: Sat)
    const dayCounts = [0, 0, 0, 0, 0, 0, 0];
    heatmapData.forEach(d => {
      dayCounts[d.dayOfWeek] += d.count;
    });

    const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    let bestDayIdx = 1;
    let maxDayCount = -1;
    dayCounts.forEach((cnt, idx) => {
      if (cnt > maxDayCount) {
        maxDayCount = cnt;
        bestDayIdx = idx;
      }
    });

    const heatmapActiveDays = heatmapData.filter(d => d.count > 0 || d.minutes > 0).length;
    const totalActiveDays = Math.max(activeDates.size, heatmapActiveDays, (stats.totalCount > 0 || (stats.totalMinutes || 0) > 0) ? 1 : 0);
    const annualConsistencyRate = Math.min(100, Math.round((totalActiveDays / 365) * 100));

    return {
      currentStreak,
      maxStreak,
      bestDay: dayNames[bestDayIdx],
      bestDayCount: maxDayCount,
      totalActiveDays,
      annualConsistencyRate,
    };
  }, [stats.daily, stats.totalCount, stats.totalMinutes, heatmapData]);

  // Ebbinghaus Review Stage Distribution Analysis
  const ebbinghausStages = useMemo(() => {
    const totalWords = words.length;
    let stage0 = 0; // New / Unreviewed
    let stageShort = 0; // Stage 1-3 (5m, 30m, 12h)
    let stageMedium = 0; // Stage 4-6 (1d, 2d, 4d)
    let stageLong = 0; // Stage 7-9 (7d, 15d, 30d)
    let mastered = 0;

    let dueWordsCount = 0;
    const now = Date.now();

    words.forEach(w => {
      if (w.is_mastered) {
        mastered++;
      } else {
        const stage = w.ebbinghaus_stage || 0;
        if (stage === 0) {
          stage0++;
        } else if (stage <= 3) {
          stageShort++;
        } else if (stage <= 6) {
          stageMedium++;
        } else {
          stageLong++;
        }

        if (isWordDue(w, false, now)) {
          dueWordsCount++;
        }
      }
    });

    // Memory Retention Index: Weighted score representing long-term memory solidification
    const retentionScore = totalWords > 0
      ? Math.min(100, Math.round(
          ((stageShort * 0.4 + stageMedium * 0.7 + stageLong * 0.95 + mastered * 1.0) / totalWords) * 100
        ))
      : 0;

    // Review Compliance Rate (punctuality in reviewing due items)
    const onTrackWords = totalWords - dueWordsCount;
    const complianceRate = totalWords > 0
      ? Math.max(0, Math.round((onTrackWords / totalWords) * 100))
      : 100;

    let lowConf = 0;
    let medConf = 0;
    let highConf = 0;
    words.forEach(w => {
      const c = w.confidence || 'medium';
      if (c === 'low') lowConf++;
      else if (c === 'high') highConf++;
      else medConf++;
    });

    return {
      totalWords,
      stage0,
      stageShort,
      stageMedium,
      stageLong,
      mastered,
      dueWordsCount,
      retentionScore,
      complianceRate,
      lowConf,
      medConf,
      highConf,
    };
  }, [words]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/90 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-5xl bg-zinc-950 border border-zinc-900 rounded-[2.5rem] overflow-hidden shadow-2xl my-auto max-h-[92vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 sm:p-8 border-b border-zinc-900 shrink-0">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                  <Brain className="text-emerald-400" size={26} />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                    学习概览与艾宾浩斯统计
                    <span className="text-[11px] font-normal px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Ebbinghaus Analytics
                    </span>
                  </h2>
                  <p className="text-xs text-zinc-400 font-medium uppercase tracking-widest mt-0.5">
                    Memory Retention Curve & Learning Habit Analysis
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-3 hover:bg-zinc-900 rounded-2xl text-zinc-500 hover:text-white transition-all duration-300"
              >
                <X size={22} />
              </button>
            </div>

            {/* Content Scroll Area */}
            <div className="p-6 sm:p-8 space-y-10 overflow-y-auto flex-1">
              {/* Top Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
                {[
                  { 
                    label: '今日学习', 
                    value: todayMinutes, 
                    unit: '分钟',
                    color: 'text-amber-400',
                    icon: Clock
                  },
                  { 
                    label: '累计学习', 
                    value: totalHours, 
                    unit: '小时',
                    color: 'text-cyan-400',
                    icon: Timer,
                    tooltip: `累计学习：${totalMinutes} 分钟`
                  },
                  { 
                    label: '今日记忆', 
                    value: todayStats.count, 
                    unit: '词', 
                    color: 'text-emerald-400',
                    icon: Sparkles
                  },
                  { 
                    label: '累计单词', 
                    value: stats.totalCount, 
                    unit: '词', 
                    color: 'text-white',
                    icon: Layers
                  },
                  { 
                    label: '学习总天数', 
                    value: habitStats.totalActiveDays, 
                    unit: '天', 
                    color: 'text-orange-400',
                    icon: Calendar,
                    tooltip: `累计学习天数：${habitStats.totalActiveDays} 天 | 连续打卡：${habitStats.currentStreak} 天 (最高 ${habitStats.maxStreak} 天)`
                  },
                  { 
                    label: '抗遗忘指数', 
                    value: ebbinghausStages.retentionScore, 
                    unit: '%', 
                    color: 'text-indigo-400',
                    icon: ShieldCheck,
                    tooltip: `基于艾宾浩斯复习周期的词库抗遗忘巩固度`
                  },
                ].map((stat, i) => (
                  <div key={i} title={stat.tooltip} className="bg-zinc-900/40 border border-zinc-800/60 p-4 rounded-3xl space-y-1.5 relative overflow-hidden group hover:border-zinc-700/80 transition-colors">
                    <div className="flex items-center space-x-1.5">
                      {stat.icon && (
                        <stat.icon size={15} className={`${stat.color} shrink-0`} />
                      )}
                      <div className={`text-2xl sm:text-3xl font-mono font-bold ${stat.color} tracking-tighter flex items-baseline gap-1`}>
                        {stat.value}
                        <span className="text-xs font-sans font-medium text-zinc-400">{stat.unit}</span>
                      </div>
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.12em] font-bold text-zinc-400">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Main Feature: Ebbinghaus Annual Heatmap */}
              <div className="bg-zinc-900/30 border border-zinc-800/60 rounded-3xl p-6 sm:p-7 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Calendar size={18} className="text-emerald-400" />
                      基于艾宾浩斯复习周期的年度学习热力图 (365天)
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1">
                      每日记忆与复习单词量 · 映射大脑抗遗忘曲线强化密度
                    </p>
                  </div>
                  
                  {/* Heatmap Legend */}
                  <div className="flex items-center space-x-2 text-[11px] text-zinc-400 bg-zinc-900/60 px-3 py-1.5 rounded-full border border-zinc-800/80 self-start sm:self-auto">
                    <span className="text-zinc-500">少 (0)</span>
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 rounded-[3px] bg-zinc-800/40 border border-zinc-800/40" title="0 词" />
                      <div className="w-3 h-3 rounded-[3px] bg-emerald-950/70 border border-emerald-900/40" title="1-4 词" />
                      <div className="w-3 h-3 rounded-[3px] bg-emerald-800/70 border border-emerald-700/60" title="5-14 词" />
                      <div className="w-3 h-3 rounded-[3px] bg-emerald-600 border border-emerald-500/80" title="15-29 词" />
                      <div className="w-3 h-3 rounded-[3px] bg-emerald-400 border border-emerald-300 shadow-[0_0_6px_rgba(52,211,153,0.4)]" title="30+ 词" />
                    </div>
                    <span className="text-emerald-400 font-medium">多 (30+)</span>
                  </div>
                </div>

                {/* Heatmap Grid & Day-of-week labels */}
                <div 
                  ref={heatmapContainerRef}
                  className="relative bg-zinc-950/60 border border-zinc-900 p-5 rounded-2xl overflow-x-auto shadow-inner"
                >
                  <div className="flex min-w-[760px]">
                    {/* Heatmap Grid */}
                    <div className="flex-1">
                      <div 
                        className="grid grid-flow-col gap-1.5"
                        style={{ gridTemplateRows: 'repeat(7, minmax(0, 1fr))' }}
                      >
                        {heatmapData.map((d) => {
                          const isSelected = selectedDay?.date === d.date;
                          return (
                            <div
                              key={d.date}
                              onClick={() => setSelectedDay(d)}
                              className={`w-3.5 h-3.5 rounded-[3px] border cursor-pointer ${getIntensity(d.count)} ${
                                isSelected ? 'ring-2 ring-amber-400 scale-125 z-10' : ''
                              } ${d.isToday ? 'ring-1 ring-white/60' : ''} transition-all duration-150 hover:scale-125 hover:z-10`}
                              title={`${d.date}: 记忆 ${d.count} 个单词 · 学习 ${d.minutes} 分钟`}
                            />
                          );
                        })}
                      </div>
                      
                      {/* Month Labels */}
                      <div className="relative h-6 mt-3.5">
                        {monthLabels.map((m, i) => (
                          <div 
                            key={i}
                            className="absolute text-[10px] font-mono font-medium text-zinc-400 whitespace-nowrap"
                            style={{ left: `${(m.index * 19.5)}px` }}
                          >
                            {m.label}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Day-of-Week Labels */}
                    <div 
                      className="grid gap-1.5 ml-3.5 text-[9px] font-mono font-medium text-zinc-400 select-none"
                      style={{ gridTemplateRows: 'repeat(7, 14px)' }}
                    >
                      <span className="flex items-center h-3.5">日</span>
                      <span className="flex items-center h-3.5">一</span>
                      <span className="flex items-center h-3.5">二</span>
                      <span className="flex items-center h-3.5">三</span>
                      <span className="flex items-center h-3.5">四</span>
                      <span className="flex items-center h-3.5">五</span>
                      <span className="flex items-center h-3.5">六</span>
                    </div>
                  </div>
                </div>

                {/* Selected Day Inspector Banner */}
                {selectedDay && (
                  <motion.div 
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-wrap items-center justify-between gap-3 bg-zinc-900/70 border border-zinc-800 p-3.5 px-5 rounded-2xl text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-zinc-300 font-semibold">{selectedDay.date}</span>
                      <span className="text-zinc-500">|</span>
                      <span className="text-emerald-400 font-bold">{selectedDay.count} 个记忆单词</span>
                      <span className="text-zinc-500">|</span>
                      <span className="text-zinc-300">{selectedDay.minutes} 分钟有效复习</span>
                    </div>
                    <div className="text-zinc-400 font-mono text-[11px]">
                      {selectedDay.count >= 30 ? '🔥 极高复习强度 · 抗遗忘高峰' :
                       selectedDay.count >= 15 ? '✨ 稳健记忆巩固 · 周期强化' :
                       selectedDay.count > 0 ? '🌱 常规学习打卡' : '💤 休息日'}
                    </div>
                  </motion.div>
                )}

                {/* Learning Habit & Ebbinghaus Metrics Insights */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="bg-zinc-950/50 border border-zinc-900 p-4 rounded-2xl">
                    <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
                      <Calendar size={14} className="text-orange-400" />
                      学习总天数
                    </div>
                    <div className="text-xl font-bold font-mono text-white">
                      {habitStats.totalActiveDays} <span className="text-xs font-normal text-zinc-400">天</span>
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">
                      当前连续: {habitStats.currentStreak} 天 (最高 {habitStats.maxStreak} 天)
                    </div>
                  </div>

                  <div className="bg-zinc-950/50 border border-zinc-900 p-4 rounded-2xl">
                    <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
                      <TrendingUp size={14} className="text-emerald-400" />
                      最佳记忆习惯日
                    </div>
                    <div className="text-xl font-bold font-mono text-white">
                      {habitStats.bestDay}
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">
                      累计记忆 {habitStats.bestDayCount} 词
                    </div>
                  </div>

                  <div className="bg-zinc-950/50 border border-zinc-900 p-4 rounded-2xl">
                    <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
                      <Activity size={14} className="text-cyan-400" />
                      年度活跃天数
                    </div>
                    <div className="text-xl font-bold font-mono text-white">
                      {habitStats.totalActiveDays} <span className="text-xs font-normal text-zinc-400">/ 365天</span>
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">
                      年坚持率: {habitStats.annualConsistencyRate}%
                    </div>
                  </div>

                  <div className="bg-zinc-950/50 border border-zinc-900 p-4 rounded-2xl">
                    <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
                      <ShieldCheck size={14} className="text-indigo-400" />
                      复习准时率
                    </div>
                    <div className="text-xl font-bold font-mono text-white">
                      {ebbinghausStages.complianceRate}%
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">
                      待复习词数: {ebbinghausStages.dueWordsCount} 词
                    </div>
                  </div>
                </div>
              </div>

              {/* Ebbinghaus Review Stage Distribution Breakdown */}
              <div className="bg-zinc-900/30 border border-zinc-800/60 rounded-3xl p-6 sm:p-7 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Layers size={18} className="text-indigo-400" />
                      艾宾浩斯复习周期阶段分布（抗遗忘巩固梯队）
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1">
                      当前词库在 9 个艾宾浩斯记忆周期节点中的推进状况
                    </p>
                  </div>
                  <div className="text-xs font-mono text-zinc-400">
                    词库总数: <span className="text-white font-bold">{ebbinghausStages.totalWords}</span> 词
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3.5 pt-1">
                  {[
                    {
                      stage: '初始新词',
                      cycle: 'Stage 0',
                      desc: '新录入待复习',
                      count: ebbinghausStages.stage0,
                      color: 'bg-zinc-700',
                      textColor: 'text-zinc-300',
                      borderColor: 'border-zinc-800'
                    },
                    {
                      stage: '短期强化',
                      cycle: 'Stage 1 ~ 3',
                      desc: '5分 · 30分 · 12小时',
                      count: ebbinghausStages.stageShort,
                      color: 'bg-amber-500',
                      textColor: 'text-amber-400',
                      borderColor: 'border-amber-500/20'
                    },
                    {
                      stage: '中期巩固',
                      cycle: 'Stage 4 ~ 6',
                      desc: '1天 · 2天 · 4天',
                      count: ebbinghausStages.stageMedium,
                      color: 'bg-cyan-500',
                      textColor: 'text-cyan-400',
                      borderColor: 'border-cyan-500/20'
                    },
                    {
                      stage: '长期稳固',
                      cycle: 'Stage 7 ~ 9',
                      desc: '7天 · 15天 · 30天',
                      count: ebbinghausStages.stageLong,
                      color: 'bg-indigo-500',
                      textColor: 'text-indigo-400',
                      borderColor: 'border-indigo-500/20'
                    },
                    {
                      stage: '永久掌握',
                      cycle: 'Mastered',
                      desc: '完成抗遗忘转化',
                      count: ebbinghausStages.mastered,
                      color: 'bg-emerald-400',
                      textColor: 'text-emerald-400',
                      borderColor: 'border-emerald-500/20'
                    },
                  ].map((item, idx) => {
                    const percentage = ebbinghausStages.totalWords > 0
                      ? Math.round((item.count / ebbinghausStages.totalWords) * 100)
                      : 0;
                    return (
                      <div key={idx} className={`bg-zinc-950/60 border ${item.borderColor} p-4 rounded-2xl space-y-2`}>
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-white">{item.stage}</span>
                          <span className={`font-mono text-[11px] ${item.textColor}`}>{item.cycle}</span>
                        </div>
                        <div className="text-[10px] text-zinc-400 font-mono truncate">{item.desc}</div>
                        <div className="flex items-baseline justify-between pt-1">
                          <span className="text-xl font-bold font-mono text-white">{item.count}</span>
                          <span className="text-xs font-mono text-zinc-400">{percentage}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${item.color} transition-all duration-500`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Confidence Level Distribution */}
                <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-4 mt-3">
                  <div className="flex items-center justify-between text-xs mb-3">
                    <span className="font-bold text-zinc-300 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-400" />
                      词库信心度分布 (Confidence Breakdown)
                    </span>
                    <span className="text-[11px] font-mono text-zinc-500">
                      根据信心度动态优化艾宾浩斯复习周期
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-zinc-900/60 border border-rose-500/25 p-3 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-rose-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                          需强化 (Low)
                        </div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">间隔 0.5x · 优先复习</div>
                      </div>
                      <div className="text-right">
                        <span className="text-base font-bold font-mono text-white">{ebbinghausStages.lowConf}</span>
                        <span className="text-[10px] text-zinc-500 ml-1">词</span>
                      </div>
                    </div>
                    <div className="bg-zinc-900/60 border border-amber-500/25 p-3 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          掌握中 (Med)
                        </div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">间隔 1.0x · 标准周期</div>
                      </div>
                      <div className="text-right">
                        <span className="text-base font-bold font-mono text-white">{ebbinghausStages.medConf}</span>
                        <span className="text-[10px] text-zinc-500 ml-1">词</span>
                      </div>
                    </div>
                    <div className="bg-zinc-900/60 border border-emerald-500/25 p-3 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          熟记 (High)
                        </div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">间隔 1.75x · 延长周期</div>
                      </div>
                      <div className="text-right">
                        <span className="text-base font-bold font-mono text-white">{ebbinghausStages.highConf}</span>
                        <span className="text-[10px] text-zinc-500 ml-1">词</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Feature: Mastered Words Growth Trend Line Chart (Weekly / Monthly) */}
              <div className="bg-zinc-900/30 border border-zinc-800/60 rounded-3xl p-6 sm:p-7 space-y-6">
                {/* Section Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                        <LineChartIcon size={18} />
                      </div>
                      周/月掌握单词增长趋势折线图
                      <span className="text-[11px] font-normal px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Mastery Growth Trend
                      </span>
                    </h3>
                    <p className="text-xs text-zinc-400">
                      量化艾宾浩斯抗遗忘记忆沉淀 · 直观展现掌握单词总量的持续攀升轨迹
                    </p>
                  </div>

                  {/* Switch Controls */}
                  <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                    {/* Timeframe switch */}
                    <div className="inline-flex items-center bg-zinc-950/70 border border-zinc-800 p-1 rounded-2xl">
                      <button
                        type="button"
                        onClick={() => setTrendPeriod('week')}
                        className={`px-3 py-1 text-xs font-medium rounded-xl transition-all duration-200 ${
                          trendPeriod === 'week'
                            ? 'bg-emerald-500 text-zinc-950 font-bold shadow-md shadow-emerald-500/20'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        按周趋势
                      </button>
                      <button
                        type="button"
                        onClick={() => setTrendPeriod('month')}
                        className={`px-3 py-1 text-xs font-medium rounded-xl transition-all duration-200 ${
                          trendPeriod === 'month'
                            ? 'bg-emerald-500 text-zinc-950 font-bold shadow-md shadow-emerald-500/20'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        按月趋势
                      </button>
                      <button
                        type="button"
                        onClick={() => setTrendPeriod('day')}
                        className={`px-3 py-1 text-xs font-medium rounded-xl transition-all duration-200 ${
                          trendPeriod === 'day'
                            ? 'bg-emerald-500 text-zinc-950 font-bold shadow-md shadow-emerald-500/20'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        近30天
                      </button>
                    </div>

                    {/* Metric filter pills */}
                    <div className="inline-flex items-center bg-zinc-950/70 border border-zinc-800 p-1 rounded-2xl">
                      <button
                        type="button"
                        onClick={() => setTrendMetric('both')}
                        className={`px-2.5 py-1 text-[11px] font-medium rounded-xl transition-all ${
                          trendMetric === 'both'
                            ? 'bg-zinc-800 text-white font-semibold'
                            : 'text-zinc-400 hover:text-zinc-300'
                        }`}
                      >
                        双线对比
                      </button>
                      <button
                        type="button"
                        onClick={() => setTrendMetric('cumulative')}
                        className={`px-2.5 py-1 text-[11px] font-medium rounded-xl transition-all ${
                          trendMetric === 'cumulative'
                            ? 'bg-zinc-800 text-emerald-400 font-semibold'
                            : 'text-zinc-400 hover:text-zinc-300'
                        }`}
                      >
                        累计总量
                      </button>
                      <button
                        type="button"
                        onClick={() => setTrendMetric('new')}
                        className={`px-2.5 py-1 text-[11px] font-medium rounded-xl transition-all ${
                          trendMetric === 'new'
                            ? 'bg-zinc-800 text-amber-400 font-semibold'
                            : 'text-zinc-400 hover:text-zinc-300'
                        }`}
                      >
                        当期新增
                      </button>
                    </div>
                  </div>
                </div>

                {/* Progress Milestone KPI Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-zinc-950/60 border border-zinc-800/80 p-4 rounded-2xl space-y-1">
                    <div className="flex items-center justify-between text-xs text-zinc-400">
                      <span>累计掌握单词</span>
                      <CheckCircle2 size={15} className="text-emerald-400" />
                    </div>
                    <div className="text-2xl font-bold font-mono text-white flex items-baseline gap-1">
                      {progressSummary.totalMastered}
                      <span className="text-xs font-sans font-normal text-zinc-400">词</span>
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      占总词库 <span className="font-mono text-emerald-400 font-semibold">{progressSummary.masteryRate}%</span>
                    </div>
                  </div>

                  <div className="bg-zinc-950/60 border border-zinc-800/80 p-4 rounded-2xl space-y-1">
                    <div className="flex items-center justify-between text-xs text-zinc-400">
                      <span>本{progressSummary.periodUnit}新增掌握</span>
                      <Sparkles size={15} className="text-amber-400" />
                    </div>
                    <div className="text-2xl font-bold font-mono text-amber-400 flex items-baseline gap-1">
                      +{progressSummary.currentPeriodNew}
                      <span className="text-xs font-sans font-normal text-zinc-400">词</span>
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      {progressSummary.diffFromPrev >= 0 ? (
                        <span className="text-emerald-400 font-mono">较上期 +{progressSummary.diffFromPrev} 词 ↑</span>
                      ) : (
                        <span className="text-zinc-400 font-mono">较上期 {progressSummary.diffFromPrev} 词</span>
                      )}
                    </div>
                  </div>

                  <div className="bg-zinc-950/60 border border-zinc-800/80 p-4 rounded-2xl space-y-1">
                    <div className="flex items-center justify-between text-xs text-zinc-400">
                      <span>平均掌握增速</span>
                      <TrendingUp size={15} className="text-cyan-400" />
                    </div>
                    <div className="text-2xl font-bold font-mono text-cyan-400 flex items-baseline gap-1">
                      +{progressSummary.avgVelocity}
                      <span className="text-xs font-sans font-normal text-zinc-400">词/{progressSummary.periodUnit}</span>
                    </div>
                    <div className="text-[11px] text-zinc-400 truncate">
                      周期均值稳定沉淀
                    </div>
                  </div>

                  <div className="bg-zinc-950/60 border border-zinc-800/80 p-4 rounded-2xl space-y-1">
                    <div className="flex items-center justify-between text-xs text-zinc-400">
                      <span>成长进步评价</span>
                      <Milestone size={15} className="text-indigo-400" />
                    </div>
                    <div className="text-sm sm:text-base font-bold text-white pt-1 truncate">
                      {progressSummary.feedbackEmoji} {progressSummary.feedbackText}
                    </div>
                    <div className="text-[11px] text-zinc-400 truncate">
                      抗遗忘沉淀飞轮
                    </div>
                  </div>
                </div>

                {/* Line Chart Canvas */}
                <div className="h-64 sm:h-72 w-full bg-zinc-950/70 border border-zinc-900 p-4 sm:p-5 rounded-2xl relative shadow-inner">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={currentTrendData} margin={{ top: 15, right: 10, left: -20, bottom: 5 }}>
                      <defs>
                        <linearGradient id="masteredGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.28} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} opacity={0.6} />
                      <XAxis 
                        dataKey="shortLabel" 
                        stroke="#71717a" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false}
                        interval={trendPeriod === 'day' ? 3 : 0}
                      />
                      <YAxis 
                        stroke="#71717a" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false}
                        allowDecimals={false}
                        orientation="right"
                      />
                      <Tooltip content={<CustomTrendTooltip />} />
                      {(trendMetric === 'both' || trendMetric === 'cumulative') && (
                        <Area 
                          type="monotone" 
                          dataKey="cumulativeMastered" 
                          name="累计掌握总量" 
                          fill="url(#masteredGrowthGrad)" 
                          stroke="none" 
                        />
                      )}
                      {(trendMetric === 'both' || trendMetric === 'cumulative') && (
                        <Line 
                          type="monotone" 
                          dataKey="cumulativeMastered" 
                          name="累计掌握总量 (词)" 
                          stroke="#10b981" 
                          strokeWidth={3} 
                          dot={{ r: 3.5, fill: '#10b981', stroke: '#052e16', strokeWidth: 1.5 }}
                          activeDot={{ r: 6, fill: '#34d399', stroke: '#ffffff', strokeWidth: 2 }}
                        />
                      )}
                      {(trendMetric === 'both' || trendMetric === 'new') && (
                        <Line 
                          type="monotone" 
                          dataKey="newMastered" 
                          name="当期新增掌握 (词)" 
                          stroke="#f59e0b" 
                          strokeWidth={2} 
                          strokeDasharray="4 4"
                          dot={{ r: 3, fill: '#f59e0b', stroke: '#451a03', strokeWidth: 1.5 }}
                          activeDot={{ r: 5, fill: '#fbbf24', stroke: '#ffffff', strokeWidth: 2 }}
                        />
                      )}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                {/* Motivational Footnote */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-zinc-400 bg-zinc-950/40 border border-zinc-900 px-4 py-2.5 rounded-xl gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
                    <span>绿色实线：累计掌握单词总量（稳步上升量化长期进步）</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span>琥珀色虚线：当期新增掌握词数（反映阶段记忆突破爆发力）</span>
                  </div>
                </div>

                {totalMasteredCount === 0 && (
                  <div className="text-xs bg-amber-500/10 border border-amber-500/20 text-amber-300 p-3 rounded-2xl flex items-center gap-2">
                    <Sparkles size={16} className="shrink-0 text-amber-400" />
                    <span>
                      提示：在拼写练习或词根侦探游戏中连续答对 3~5 次，或完成艾宾浩斯复习周期，系统会自动判定掌握并点亮此折线图！
                    </span>
                  </div>
                )}
              </div>

              {/* Bar Chart Section (Recent 30 Days) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-widest flex items-center gap-2">
                    <TrendingUp size={16} className="text-emerald-400" />
                    最近 30 天每日记忆活跃度
                  </h3>
                  <div className="text-xs text-zinc-400 font-mono">Daily Memorized Count</div>
                </div>
                <div className="h-44 w-full bg-zinc-900/20 border border-zinc-900/60 p-4 rounded-3xl">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barChartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                      <XAxis 
                        dataKey="displayDate" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#a1a1aa', fontSize: 10 }}
                        interval={4}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#a1a1aa', fontSize: 10 }}
                        orientation="right"
                      />
                      <Tooltip 
                        cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                        contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px', fontSize: '12px' }}
                        itemStyle={{ color: '#10b981' }}
                      />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {barChartData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.count > 0 ? '#10b981' : '#27272a'} 
                            fillOpacity={entry.count > 0 ? 0.85 : 0.4}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 bg-zinc-900/30 text-center border-t border-zinc-900 shrink-0">
              <p className="text-xs text-zinc-400 italic font-serif flex items-center justify-center gap-2">
                <Award size={14} className="text-amber-400" />
                "依据艾宾浩斯遗忘曲线周期科学复习，对抗遗忘，让每一分钟的学习都沉淀为长期记忆。"
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
