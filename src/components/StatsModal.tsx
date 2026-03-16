import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Clock, BookOpen, Calendar, TrendingUp } from 'lucide-react';

interface DailyStat {
  count: number; // words
}

interface Stats {
  totalCount: number;
  daily: { [date: string]: DailyStat };
}

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: Stats;
}

export function StatsModal({ isOpen, onClose, stats }: StatsModalProps) {
  const today = new Date().toISOString().split('T')[0];
  const todayStats = stats.daily[today] || { count: 0 };

  // Generate last 60 days for the heatmap
  const heatmapDays = Array.from({ length: 70 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (69 - i));
    return d.toISOString().split('T')[0];
  });

  const getIntensity = (count: number) => {
    if (count === 0) return 'bg-zinc-800/50';
    if (count < 5) return 'bg-emerald-900/40';
    if (count < 15) return 'bg-emerald-700/60';
    if (count < 30) return 'bg-emerald-500/80';
    return 'bg-emerald-400';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-bottom border-zinc-800">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <TrendingUp className="text-white" size={20} />
                </div>
                <h2 className="text-xl font-bold text-white tracking-tight">练习统计</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-zinc-900 rounded-full text-zinc-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-10">
              {/* Top Stats Grid */}
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-1">
                  <div className="text-3xl font-mono font-bold text-white tracking-tighter">
                    {todayStats.count}
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500">今日单词</div>
                </div>
                <div className="space-y-1">
                  <div className="text-3xl font-mono font-bold text-white tracking-tighter">
                    {stats.totalCount}
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500">累计单词</div>
                </div>
              </div>

              {/* Heatmap Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500">练习活跃度</div>
                  <div className="flex items-center space-x-1">
                    <span className="text-[10px] text-zinc-600">Less</span>
                    <div className="w-2 h-2 rounded-sm bg-zinc-800/50" />
                    <div className="w-2 h-2 rounded-sm bg-emerald-900/40" />
                    <div className="w-2 h-2 rounded-sm bg-emerald-700/60" />
                    <div className="w-2 h-2 rounded-sm bg-emerald-500/80" />
                    <div className="w-2 h-2 rounded-sm bg-emerald-400" />
                    <span className="text-[10px] text-zinc-600">More</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-10 gap-2">
                  {heatmapDays.map((date) => {
                    const dayStat = stats.daily[date] || { count: 0 };
                    return (
                      <motion.div
                        key={date}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`aspect-square rounded-md ${getIntensity(dayStat.count)} transition-colors duration-500`}
                        title={`${date}: ${dayStat.count} words`}
                      />
                    );
                  })}
                </div>
                
                <div className="flex justify-between text-[10px] font-medium text-zinc-600 px-1">
                  <span>{new Date(heatmapDays[0]).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}</span>
                  <span>{new Date(heatmapDays[35]).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}</span>
                  <span>今天</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 bg-zinc-900/30 text-center">
              <p className="text-xs text-zinc-500 italic font-serif">
                "Consistency is the key to mastery."
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
