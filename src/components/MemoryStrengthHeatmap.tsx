import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { WordState } from '../utils/word';
import { Sparkles, Activity, Layers, Calendar, Info } from 'lucide-react';

interface DailyStat {
  count: number;
  minutes?: number;
  seconds?: number;
}

interface Stats {
  totalCount: number;
  totalMinutes?: number;
  totalSeconds?: number;
  daily: { [date: string]: DailyStat };
}

interface MemoryStrengthHeatmapProps {
  words: WordState[];
  stats: Stats;
}

interface CellData {
  dateStr: string;
  displayDate: string;
  stageKey: string;
  stageLabel: string;
  stageInterval: string;
  count: number;
  sampleWords: string[];
}

const DETAILED_STAGES = [
  { id: 'mastered', label: '永久掌握', interval: 'Mastered', color: '#10b981' },
  { id: 'stage9', label: 'Stage 9', interval: '30 天', color: '#06b6d4' },
  { id: 'stage8', label: 'Stage 8', interval: '15 天', color: '#0ea5e9' },
  { id: 'stage7', label: 'Stage 7', interval: '7 天', color: '#3b82f6' },
  { id: 'stage6', label: 'Stage 6', interval: '4 天', color: '#6366f1' },
  { id: 'stage5', label: 'Stage 5', interval: '2 天', color: '#8b5cf6' },
  { id: 'stage4', label: 'Stage 4', interval: '1 天', color: '#a855f7' },
  { id: 'stage3', label: 'Stage 3', interval: '12 小时', color: '#ec4899' },
  { id: 'stage2', label: 'Stage 2', interval: '30 分钟', color: '#f59e0b' },
  { id: 'stage1', label: 'Stage 1', interval: '5 分钟', color: '#eab308' },
  { id: 'stage0', label: 'Stage 0', interval: '初始新词', color: '#71717a' },
];

const GROUPED_STAGES = [
  { id: 'mastered', label: '永久掌握 (Mastered)', interval: '抗遗忘转化', color: '#10b981' },
  { id: 'long', label: '长期稳固 (Stage 7~9)', interval: '7 ~ 30 天', color: '#3b82f6' },
  { id: 'medium', label: '中期巩固 (Stage 4~6)', interval: '1 ~ 4 天', color: '#8b5cf6' },
  { id: 'short', label: '短期强化 (Stage 1~3)', interval: '5分 ~ 12小时', color: '#f59e0b' },
  { id: 'stage0', label: '初始新词 (Stage 0)', interval: '新录入待复习', color: '#71717a' },
];

export const MemoryStrengthHeatmap: React.FC<MemoryStrengthHeatmapProps> = ({ words, stats }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [daysRange, setDaysRange] = useState<14 | 30 | 60>(30);
  const [viewMode, setViewMode] = useState<'grouped' | 'detailed'>('detailed');
  const [hoveredCell, setHoveredCell] = useState<CellData | null>(null);

  // Generate date array
  const dateList = useMemo(() => {
    const list = [];
    const today = new Date();
    for (let i = daysRange - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const displayDate = d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
      list.push({ dateStr, displayDate });
    }
    return list;
  }, [daysRange]);

  // Aggregate word count by date and stage
  const { heatmapData, maxCellCount, totalReviewsInRange } = useMemo(() => {
    const stageDefs = viewMode === 'detailed' ? DETAILED_STAGES : GROUPED_STAGES;
    const cellMap: Record<string, { count: number; sampleWords: string[] }> = {};

    // Map each word to its review date
    words.forEach(w => {
      let stageKey = 'stage0';
      const s = w.ebbinghaus_stage || 0;
      const isMastered = w.is_mastered === true || w.listName === 'Mastered Words';

      if (isMastered) {
        stageKey = 'mastered';
      } else if (viewMode === 'detailed') {
        stageKey = `stage${Math.min(9, Math.max(0, s))}`;
      } else {
        if (s === 0) stageKey = 'stage0';
        else if (s <= 3) stageKey = 'short';
        else if (s <= 6) stageKey = 'medium';
        else stageKey = 'long';
      }

      if (w.last_review_time) {
        const dStr = new Date(w.last_review_time).toISOString().split('T')[0];
        const key = `${dStr}_${stageKey}`;
        if (!cellMap[key]) cellMap[key] = { count: 0, sampleWords: [] };
        cellMap[key].count++;
        if (cellMap[key].sampleWords.length < 5) {
          cellMap[key].sampleWords.push(w.word);
        }
      }
    });

    // Also support days recorded in stats.daily
    dateList.forEach(({ dateStr }) => {
      const dailyCount = stats.daily[dateStr]?.count || 0;
      if (dailyCount > 0) {
        // If words weren't directly timestamped on that date, ensure daily activity is reflected
        const existingDailyWordsCount = stageDefs.reduce((acc, st) => {
          return acc + (cellMap[`${dateStr}_${st.id}`]?.count || 0);
        }, 0);

        if (existingDailyWordsCount === 0) {
          // Spread into short/medium stages
          const fallbackStage = viewMode === 'detailed' ? 'stage1' : 'short';
          const key = `${dateStr}_${fallbackStage}`;
          if (!cellMap[key]) cellMap[key] = { count: 0, sampleWords: [] };
          cellMap[key].count = dailyCount;
        }
      }
    });

    let maxVal = 0;
    let totalInRange = 0;
    const data: CellData[] = [];

    dateList.forEach(({ dateStr, displayDate }) => {
      stageDefs.forEach(st => {
        const key = `${dateStr}_${st.id}`;
        const entry = cellMap[key] || { count: 0, sampleWords: [] };
        if (entry.count > maxVal) maxVal = entry.count;
        totalInRange += entry.count;

        data.push({
          dateStr,
          displayDate,
          stageKey: st.id,
          stageLabel: st.label,
          stageInterval: st.interval,
          count: entry.count,
          sampleWords: entry.sampleWords
        });
      });
    });

    return { heatmapData: data, maxCellCount: maxVal, totalReviewsInRange: totalInRange };
  }, [words, stats.daily, dateList, viewMode]);

  // D3 rendering
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const containerWidth = containerRef.current.clientWidth || 800;
    const margin = {
      top: 25,
      right: 20,
      bottom: 45,
      left: viewMode === 'detailed' ? 95 : 175
    };

    const width = containerWidth;
    const stageDefs = viewMode === 'detailed' ? DETAILED_STAGES : GROUPED_STAGES;
    const rowHeight = viewMode === 'detailed' ? 26 : 38;
    const height = margin.top + margin.bottom + stageDefs.length * rowHeight;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    svg
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    // X Scale (Dates)
    const xDates = dateList.map(d => d.dateStr);
    const xScale = d3
      .scaleBand()
      .domain(xDates)
      .range([margin.left, width - margin.right])
      .padding(0.12);

    // Y Scale (Stages)
    const yStages = stageDefs.map(s => s.id);
    const yScale = d3
      .scaleBand()
      .domain(yStages)
      .range([margin.top, height - margin.bottom])
      .padding(0.12);

    // Color Scale: sophisticated dark mode viridis / emerald palette
    const maxVal = Math.max(maxCellCount, 1);
    const colorScale = d3
      .scaleSequential((t: number) => {
        // Custom vibrant high-contrast dark palette:
        // low: deep indigo-cyan, mid: emerald, high: bright mint/gold
        return d3.interpolateRgbBasis([
          '#092b2d', // very dark teal
          '#065f46', // emerald-800
          '#059669', // emerald-600
          '#10b981', // emerald-500
          '#34d399', // emerald-400
          '#6ee7b7', // emerald-300
          '#a7f3d0'  // emerald-200
        ])(t);
      })
      .domain([1, maxVal]);

    const g = svg.append('g');

    // Draw Heatmap Cells
    const cellGroups = g
      .selectAll<SVGGElement, CellData>('g.cell')
      .data(heatmapData)
      .enter()
      .append('g')
      .attr('class', 'cell');

    cellGroups
      .append('rect')
      .attr('x', (d: CellData) => xScale(d.dateStr) || 0)
      .attr('y', (d: CellData) => yScale(d.stageKey) || 0)
      .attr('width', xScale.bandwidth())
      .attr('height', yScale.bandwidth())
      .attr('rx', 4)
      .attr('ry', 4)
      .attr('fill', (d: CellData) => {
        if (d.count === 0) return '#18181b'; // zinc-900 for empty
        return colorScale(d.count);
      })
      .attr('stroke', (d: CellData) => {
        if (d.count === 0) return '#27272a'; // zinc-800
        return '#047857';
      })
      .attr('stroke-width', 0.8)
      .style('cursor', 'pointer')
      .style('transition', 'transform 0.15s ease, filter 0.15s ease')
      .on('mouseenter', function (event, d: CellData) {
        d3.select(this)
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 1.8)
          .style('filter', 'brightness(1.25) drop-shadow(0 2px 6px rgba(16, 185, 129, 0.4))');
        setHoveredCell(d);
      })
      .on('mouseleave', function (event, d: CellData) {
        d3.select(this)
          .attr('stroke', d.count === 0 ? '#27272a' : '#047857')
          .attr('stroke-width', 0.8)
          .style('filter', 'none');
      });

    // Optional numbers on cells if wide enough and count > 0
    if (xScale.bandwidth() >= 24) {
      cellGroups
        .filter((d: CellData) => d.count > 0)
        .append('text')
        .attr('x', (d: CellData) => (xScale(d.dateStr) || 0) + xScale.bandwidth() / 2)
        .attr('y', (d: CellData) => (yScale(d.stageKey) || 0) + yScale.bandwidth() / 2 + 3)
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('font-weight', 'bold')
        .attr('font-family', 'monospace')
        .attr('fill', (d: CellData) => (d.count >= maxVal * 0.6 ? '#064e3b' : '#ecfdf5'))
        .attr('pointer-events', 'none')
        .text((d: CellData) => d.count);
    }

    // Y Axis (Stages)
    const yAxisGroup = svg.append('g').attr('class', 'y-axis');

    stageDefs.forEach(st => {
      const yPos = (yScale(st.id) || 0) + yScale.bandwidth() / 2;
      const rowG = yAxisGroup.append('g').attr('transform', `translate(${margin.left - 10}, ${yPos})`);

      // Stage label
      rowG
        .append('text')
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'central')
        .attr('font-size', '11px')
        .attr('font-weight', st.id === 'mastered' ? 'bold' : '500')
        .attr('fill', st.id === 'mastered' ? '#34d399' : '#d4d4d8')
        .text(st.label);

      // Sub-interval label
      if (viewMode === 'detailed') {
        rowG
          .append('text')
          .attr('x', -55)
          .attr('text-anchor', 'end')
          .attr('dominant-baseline', 'central')
          .attr('font-size', '9px')
          .attr('font-family', 'monospace')
          .attr('fill', '#71717a')
          .text(st.interval);
      }
    });

    // X Axis (Time)
    const xAxisGroup = svg
      .append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0, ${height - margin.bottom + 8})`);

    // Determine tick interval
    const step = daysRange === 60 ? 6 : daysRange === 30 ? 3 : 2;

    dateList.forEach((d, idx) => {
      if (idx % step === 0 || idx === dateList.length - 1) {
        const xPos = (xScale(d.dateStr) || 0) + xScale.bandwidth() / 2;
        const tickG = xAxisGroup.append('g').attr('transform', `translate(${xPos}, 0)`);

        tickG
          .append('line')
          .attr('y1', 0)
          .attr('y2', 4)
          .attr('stroke', '#3f3f46');

        tickG
          .append('text')
          .attr('y', 15)
          .attr('text-anchor', 'middle')
          .attr('font-size', '10px')
          .attr('font-family', 'monospace')
          .attr('fill', idx === dateList.length - 1 ? '#34d399' : '#a1a1aa')
          .attr('font-weight', idx === dateList.length - 1 ? 'bold' : 'normal')
          .text(idx === dateList.length - 1 ? '今天' : d.displayDate);
      }
    });

    // Draw horizontal grid divider guides
    stageDefs.forEach(st => {
      const yPos = (yScale(st.id) || 0) + yScale.bandwidth();
      svg
        .append('line')
        .attr('x1', margin.left)
        .attr('x2', width - margin.right)
        .attr('y1', yPos + (yScale.step() - yScale.bandwidth()) / 2)
        .attr('y2', yPos + (yScale.step() - yScale.bandwidth()) / 2)
        .attr('stroke', '#27272a')
        .attr('stroke-dasharray', '2,3')
        .attr('stroke-width', 0.5)
        .attr('opacity', 0.6);
    });
  }, [heatmapData, maxCellCount, dateList, viewMode, daysRange]);

  return (
    <div className="bg-zinc-900/30 border border-zinc-800/80 rounded-3xl p-5 sm:p-7 space-y-5">
      {/* Chart Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Activity size={18} className="text-emerald-400" />
            <span>单词记忆强度阶段热力图</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              D3.js Heatmap
            </span>
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            横轴为时间，纵轴为艾宾浩斯复习阶段，直观呈现不同抗遗忘梯队的记忆沉淀与稳固轨迹
          </p>
        </div>

        {/* View toggles */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          {/* Detailed / Grouped toggle */}
          <div className="flex items-center bg-zinc-950/80 p-0.5 rounded-xl border border-zinc-800">
            <button
              type="button"
              onClick={() => setViewMode('detailed')}
              className={`px-2.5 py-1 rounded-lg transition-all text-xs font-medium ${
                viewMode === 'detailed'
                  ? 'bg-zinc-800 text-emerald-400 font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              11 级阶段
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grouped')}
              className={`px-2.5 py-1 rounded-lg transition-all text-xs font-medium ${
                viewMode === 'grouped'
                  ? 'bg-zinc-800 text-emerald-400 font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              5 层概览
            </button>
          </div>

          {/* Date range toggle */}
          <div className="flex items-center bg-zinc-950/80 p-0.5 rounded-xl border border-zinc-800">
            {[14, 30, 60].map(days => (
              <button
                key={days}
                type="button"
                onClick={() => setDaysRange(days as any)}
                className={`px-2.5 py-1 rounded-lg transition-all text-xs font-medium ${
                  daysRange === days
                    ? 'bg-zinc-800 text-white font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {days}天
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SVG Container with horizontal scroll if needed */}
      <div
        ref={containerRef}
        className="w-full overflow-x-auto relative min-h-[320px] bg-zinc-950/70 border border-zinc-900 rounded-2xl p-2"
      >
        <svg ref={svgRef} className="w-full block" />

        {/* Floating Tooltip Banner when hovering cell */}
        {hoveredCell && (
          <div className="absolute top-3 right-4 bg-zinc-900/95 border border-emerald-500/30 backdrop-blur-md rounded-xl p-3 shadow-xl max-w-xs animate-in fade-in duration-150 pointer-events-none z-10 text-xs space-y-1.5">
            <div className="flex items-center justify-between gap-3 border-b border-zinc-800 pb-1">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Calendar size={12} className="text-emerald-400" />
                {hoveredCell.dateStr}
              </span>
              <span className="font-mono text-emerald-400 font-bold">
                {hoveredCell.count} 词
              </span>
            </div>
            <div className="text-zinc-300 flex items-center justify-between">
              <span className="text-zinc-400">复习阶段:</span>
              <span className="font-semibold">{hoveredCell.stageLabel}</span>
            </div>
            <div className="text-zinc-400 flex items-center justify-between text-[11px]">
              <span>周期标准:</span>
              <span className="font-mono text-zinc-300">{hoveredCell.stageInterval}</span>
            </div>
            {hoveredCell.sampleWords.length > 0 && (
              <div className="pt-1 border-t border-zinc-800 text-[11px]">
                <span className="text-zinc-500 block mb-0.5">代表单词:</span>
                <div className="flex flex-wrap gap-1 text-zinc-200 font-mono">
                  {hoveredCell.sampleWords.map((w, idx) => (
                    <span key={idx} className="bg-zinc-800 px-1.5 py-0.2 rounded text-[10px]">
                      {w}
                    </span>
                  ))}
                  {hoveredCell.count > hoveredCell.sampleWords.length && (
                    <span className="text-zinc-500 text-[10px]">
                      +{hoveredCell.count - hoveredCell.sampleWords.length} ...
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Heatmap Legend & Interpretation Notes */}
      <div className="flex items-center justify-between flex-wrap gap-4 pt-1 text-xs text-zinc-400 border-t border-zinc-900">
        {/* Color scale gradient bar */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-zinc-500">记忆密度:</span>
          <div className="flex items-center gap-1 font-mono text-[10px] text-zinc-400">
            <span>0</span>
            <div className="w-2.5 h-2.5 rounded bg-zinc-900 border border-zinc-800" />
            <div className="w-2.5 h-2.5 rounded bg-emerald-950" />
            <div className="w-2.5 h-2.5 rounded bg-emerald-800" />
            <div className="w-2.5 h-2.5 rounded bg-emerald-600" />
            <div className="w-2.5 h-2.5 rounded bg-emerald-400" />
            <div className="w-2.5 h-2.5 rounded bg-emerald-200" />
            <span>{maxCellCount > 0 ? `${maxCellCount} 词` : '1+'}</span>
          </div>
        </div>

        {/* Explanation tip */}
        <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
          <Info size={12} className="text-indigo-400 shrink-0" />
          <span>纵轴自下而上代表记忆巩固深度，颜色越亮说明该阶段沉淀单词越多</span>
        </div>
      </div>
    </div>
  );
};
