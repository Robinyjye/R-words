import React, { useMemo, useRef, useEffect, useState } from 'react';
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
  Sparkles
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { WordState } from '../utils/word';
import { isWordDue } from '../utils/storage';

interface DailyStat {
  count: number; // words
  minutes?: number; // learning minutes
  seconds?: number; // learning seconds
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

export function StatsModal({ isOpen, onClose, stats, words = [] }: StatsModalProps) {
  const heatmapContainerRef = useRef<HTMLDivElement>(null);
  const [selectedDay, setSelectedDay] = useState<{
    date: string;
    count: number;
    minutes: number;
  } | null>(null);

  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => today.toISOString().split('T')[0], [today]);
  const todayStats = stats.daily[todayStr] || { count: 0, minutes: 0, seconds: 0 };

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
              </div>

              {/* Bar Chart Section (Recent 30 Days) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-widest flex items-center gap-2">
                    <TrendingUp size={16} className="text-emerald-400" />
                    最近 30 天记忆趋势
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
