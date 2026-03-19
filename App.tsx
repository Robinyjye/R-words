import React, { useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';

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
  const heatmapContainerRef = useRef<HTMLDivElement>(null);
  const today = new Date();

  useEffect(() => {
    if (isOpen && heatmapContainerRef.current) {
      // Use a small timeout to ensure the layout is finished and the container is rendered
      const timer = setTimeout(() => {
        if (heatmapContainerRef.current) {
          heatmapContainerRef.current.scrollLeft = heatmapContainerRef.current.scrollWidth;
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);
  const todayStr = today.toISOString().split('T')[0];
  const todayStats = stats.daily[todayStr] || { count: 0 };

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

  // Prepare data for the heatmap (last 365 days)
  const heatmapData = useMemo(() => {
    const data = [];
    const end = new Date();
    // Adjust to end on the last Saturday to make the grid look nice
    const dayOfWeek = end.getDay();
    end.setDate(end.getDate() + (6 - dayOfWeek));

    const start = new Date(end);
    start.setDate(start.getDate() - (52 * 7) + 1);

    const current = new Date(start);
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      data.push({
        date: dateStr,
        count: stats.daily[dateStr]?.count || 0,
        dayOfWeek: current.getDay(),
        month: current.getMonth(),
      });
      current.setDate(current.getDate() + 1);
    }
    return data;
  }, [stats.daily]);

  const getIntensity = (count: number) => {
    if (count === 0) return 'bg-zinc-800/40';
    if (count < 5) return 'bg-emerald-900/30';
    if (count < 15) return 'bg-emerald-700/50';
    if (count < 30) return 'bg-emerald-500/70';
    return 'bg-emerald-400';
  };

  const monthLabels = useMemo(() => {
    const labels: { label: string; index: number }[] = [];
    let lastMonth = -1;
    heatmapData.forEach((d, i) => {
      if (d.dayOfWeek === 0) { // Only check at the start of a week
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

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
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
            className="relative w-full max-w-4xl bg-zinc-950 border border-zinc-900 rounded-[2rem] overflow-hidden shadow-2xl my-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-8 border-b border-zinc-900">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-emerald-500/10 rounded-2xl">
                  <TrendingUp className="text-emerald-500" size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">学习概览</h2>
                  <p className="text-xs text-zinc-400 font-medium uppercase tracking-widest mt-0.5">Statistics & Activity</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-3 hover:bg-zinc-900 rounded-2xl text-zinc-500 hover:text-white transition-all duration-300"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-8 space-y-12">
              {/* Top Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                {[
                  { label: '今日单词', value: todayStats.count, color: 'text-emerald-400' },
                  { label: '累计单词', value: stats.totalCount, color: 'text-white' },
                  { label: '练习天数', value: Object.values(stats.daily).filter(d => d.count > 0).length, color: 'text-white' },
                  { label: '单日最高', value: Math.max(...Object.values(stats.daily).map(d => d.count), 0), color: 'text-white' },
                ].map((stat, i) => (
                  <div key={i} className="bg-zinc-900/40 border border-zinc-800/50 p-6 rounded-3xl space-y-1">
                    <div className={`text-3xl font-mono font-bold ${stat.color} tracking-tighter`}>
                      {stat.value}
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-400">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Bar Chart Section */}
              <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-widest">最近 30 天趋势</h3>
                  <div className="text-xs text-zinc-400 font-mono">Daily Word Count</div>
                </div>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <XAxis 
                        dataKey="displayDate" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#d4d4d8', fontSize: 10 }}
                        interval={4}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#d4d4d8', fontSize: 10 }}
                        orientation="right"
                      />
                      <Tooltip 
                        cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                        contentStyle={{ backgroundColor: '#09090b', border: '1px solid #18181b', borderRadius: '12px', fontSize: '12px' }}
                        itemStyle={{ color: '#10b981' }}
                      />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {barChartData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.count > 0 ? '#10b981' : '#18181b'} 
                            fillOpacity={entry.count > 0 ? 0.8 : 0.3}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Heatmap Section */}
              <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-widest">
                    最近一年记录 <span className="text-emerald-500 ml-2">{stats.totalCount} 单词</span>
                  </h3>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] text-zinc-300">Less</span>
                    <div className="flex space-x-1">
                      <div className="w-2.5 h-2.5 rounded-sm bg-zinc-800/40" />
                      <div className="w-2.5 h-2.5 rounded-sm bg-emerald-900/30" />
                      <div className="w-2.5 h-2.5 rounded-sm bg-emerald-700/50" />
                      <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500/70" />
                      <div className="w-2.5 h-2.5 rounded-sm bg-emerald-400" />
                    </div>
                    <span className="text-[10px] text-zinc-300">More</span>
                  </div>
                </div>
                
                <div 
                  ref={heatmapContainerRef}
                  className="relative bg-zinc-900/20 border border-zinc-900/50 p-6 rounded-3xl overflow-x-auto"
                >
                  <div className="flex">
                    {/* Heatmap Grid */}
                    <div className="flex-1">
                      <div 
                        className="grid grid-flow-col gap-1.5"
                        style={{ gridTemplateRows: 'repeat(7, minmax(0, 1fr))' }}
                      >
                        {heatmapData.map((d, i) => (
                          <motion.div
                            key={d.date}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.001 }}
                            className={`w-3 h-3 rounded-[3px] ${getIntensity(d.count)} transition-all duration-500 hover:ring-2 hover:ring-emerald-500/50`}
                            title={`${d.date}: ${d.count} words`}
                          />
                        ))}
                      </div>
                      
                      {/* Month Labels */}
                      <div className="relative h-6 mt-4">
                        {monthLabels.map((m, i) => (
                          <div 
                            key={i}
                            className="absolute text-[10px] font-bold text-zinc-300 whitespace-nowrap"
                            style={{ left: `${(m.index * 18.5)}px` }}
                          >
                            {m.label}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Day Labels (Right side like image) */}
                    <div 
                      className="grid gap-1.5 ml-4 text-[8px] font-bold text-zinc-300"
                      style={{ gridTemplateRows: 'repeat(7, 12px)' }}
                    >
                      <span className="flex items-center h-3">日</span>
                      <span className="flex items-center h-3">一</span>
                      <span className="flex items-center h-3">二</span>
                      <span className="flex items-center h-3">三</span>
                      <span className="flex items-center h-3">四</span>
                      <span className="flex items-center h-3">五</span>
                      <span className="flex items-center h-3">六</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-8 bg-zinc-900/20 text-center border-t border-zinc-900">
              <p className="text-xs text-zinc-400 italic font-serif">
                "Small steps every day lead to big results over time."
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
