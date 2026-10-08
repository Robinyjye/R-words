import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { Volume2, Sparkles, ArrowRight, CheckCircle2, RotateCcw, ZoomIn, ZoomOut, Layers, Info } from 'lucide-react';
import { WordState } from '../utils/word';
import { speakWord } from '../utils/audio';

interface RootRelationshipGraphProps {
  rootCore: string;
  rootMeaning?: string;
  currentWordId?: string;
  matchingWords: WordState[];
  onSelectWord: (word: WordState) => void;
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  type: 'root' | 'prefix' | 'word';
  label: string;
  sublabel?: string;
  meaning?: string;
  radius: number;
  wordData?: WordState;
  isCurrent?: boolean;
  isMastered?: boolean;
  prefix?: string;
  prefixMeaning?: string;
  suffix?: string;
  suffixMeaning?: string;
  color: string;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  relationType: 'root-to-prefix' | 'prefix-to-word' | 'root-to-word';
  label?: string;
}

export const RootRelationshipGraph: React.FC<RootRelationshipGraphProps> = ({
  rootCore,
  rootMeaning,
  currentWordId,
  matchingWords,
  onSelectWord,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  // Auto-select current word node on mount if available
  useEffect(() => {
    const cur = matchingWords.find(w => w.id === currentWordId);
    if (cur) {
      setSelectedNode({
        id: `word-${cur.id}`,
        type: 'word',
        label: cur.word,
        meaning: cur.meaning,
        radius: 26,
        wordData: cur,
        isCurrent: true,
        isMastered: cur.is_mastered,
        prefix: cur.prefix,
        prefixMeaning: cur.prefix_meaning,
        suffix: cur.suffix,
        suffixMeaning: cur.suffix_meaning,
        color: '#f59e0b',
      });
    }
  }, [currentWordId, matchingWords]);

  // Construct nodes and links based on root and morphological derivation
  const { nodes, links } = useMemo(() => {
    const nodeList: GraphNode[] = [];
    const linkList: GraphLink[] = [];

    // 1. Center Root Node
    const rootNodeId = `root-${rootCore}`;
    nodeList.push({
      id: rootNodeId,
      type: 'root',
      label: rootCore,
      sublabel: rootMeaning || '核心词根',
      radius: 34,
      color: '#6366f1', // Indigo
    });

    // 2. Group words by prefixes
    const prefixMap = new Map<string, { prefix: string; meaning: string; words: WordState[] }>();
    const noPrefixWords: WordState[] = [];

    matchingWords.forEach(w => {
      if (w.prefix && w.prefix.trim()) {
        const cleanP = w.prefix.trim();
        const existing = prefixMap.get(cleanP);
        if (existing) {
          existing.words.push(w);
        } else {
          prefixMap.set(cleanP, {
            prefix: cleanP,
            meaning: w.prefix_meaning?.trim() || '',
            words: [w],
          });
        }
      } else {
        noPrefixWords.push(w);
      }
    });

    // 3. Create prefix nodes if multiple words share a prefix, or if clean prefix branch
    prefixMap.forEach(({ prefix, meaning, words: pWords }) => {
      const prefixNodeId = `prefix-${prefix}`;

      nodeList.push({
        id: prefixNodeId,
        type: 'prefix',
        label: `${prefix}`,
        sublabel: meaning || '前缀',
        radius: 20,
        color: '#06b6d4', // Cyan
      });

      // Link root -> prefix
      linkList.push({
        source: rootNodeId,
        target: prefixNodeId,
        relationType: 'root-to-prefix',
        label: '+ 派生前缀',
      });

      // Link prefix -> each word
      pWords.forEach(w => {
        const isCur = w.id === currentWordId;
        const isMas = !!w.is_mastered;
        const wordNodeId = `word-${w.id}`;

        nodeList.push({
          id: wordNodeId,
          type: 'word',
          label: w.word,
          meaning: w.meaning,
          radius: isCur ? 26 : 22,
          wordData: w,
          isCurrent: isCur,
          isMastered: isMas,
          prefix: w.prefix,
          prefixMeaning: w.prefix_meaning,
          suffix: w.suffix,
          suffixMeaning: w.suffix_meaning,
          color: isCur ? '#f59e0b' : isMas ? '#10b981' : '#a855f7',
        });

        linkList.push({
          source: prefixNodeId,
          target: wordNodeId,
          relationType: 'prefix-to-word',
          label: w.suffix ? `+ ${w.suffix}` : undefined,
        });
      });
    });

    // 4. Create direct word nodes for words without prefix
    noPrefixWords.forEach(w => {
      const isCur = w.id === currentWordId;
      const isMas = !!w.is_mastered;
      const wordNodeId = `word-${w.id}`;

      nodeList.push({
        id: wordNodeId,
        type: 'word',
        label: w.word,
        meaning: w.meaning,
        radius: isCur ? 26 : 22,
        wordData: w,
        isCurrent: isCur,
        isMastered: isMas,
        prefix: w.prefix,
        prefixMeaning: w.prefix_meaning,
        suffix: w.suffix,
        suffixMeaning: w.suffix_meaning,
        color: isCur ? '#f59e0b' : isMas ? '#10b981' : '#a855f7',
      });

      linkList.push({
        source: rootNodeId,
        target: wordNodeId,
        relationType: 'root-to-word',
        label: w.suffix ? `+ ${w.suffix}` : '基词派生',
      });
    });

    return { nodes: nodeList, links: linkList };
  }, [rootCore, rootMeaning, matchingWords, currentWordId]);

  // Main D3 Rendering Effect
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || 640;
    const height = container.clientHeight || 480;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous render

    // Definition of filters (glow, shadow) and markers
    const defs = svg.append('defs');

    // Glow filter
    const glowFilter = defs.append('filter')
      .attr('id', 'glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');

    glowFilter.append('feGaussianBlur')
      .attr('stdDeviation', '4')
      .attr('result', 'coloredBlur');

    const feMerge = glowFilter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Marker arrows for directional derivation
    defs.append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 22)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-4L8,0L0,4')
      .attr('fill', 'rgba(148, 163, 184, 0.4)');

    // Zoom container group
    const g = svg.append('g').attr('class', 'graph-main');

    // Setup zoom behavior
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.4, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    zoomBehaviorRef.current = zoomBehavior;
    svg.call(zoomBehavior);

    // Deep copy data for simulation
    const simNodes: GraphNode[] = nodes.map(d => ({ ...d }));
    const simLinks: GraphLink[] = links.map(d => ({ ...d }));

    // Setup force simulation
    const simulation = d3.forceSimulation<GraphNode>(simNodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(simLinks)
        .id(d => d.id)
        .distance(d => {
          if (d.relationType === 'root-to-prefix') return 110;
          if (d.relationType === 'prefix-to-word') return 80;
          return 120;
        })
      )
      .force('charge', d3.forceManyBody().strength(-380))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide<GraphNode>().radius(d => d.radius + 18).iterations(3));

    // Render Links
    const linkGroup = g.append('g').attr('class', 'links');
    const link = linkGroup.selectAll<SVGLineElement, GraphLink>('line')
      .data(simLinks)
      .enter()
      .append('line')
      .attr('stroke', d => {
        if (d.relationType === 'root-to-prefix') return 'rgba(99, 102, 241, 0.4)';
        return 'rgba(148, 163, 184, 0.25)';
      })
      .attr('stroke-width', d => d.relationType === 'root-to-prefix' ? 2 : 1.5)
      .attr('stroke-dasharray', d => d.relationType === 'root-to-prefix' ? '4,3' : 'none');

    // Render Link Labels
    const linkText = linkGroup.selectAll<SVGTextElement, GraphLink>('text')
      .data(simLinks.filter(l => l.label))
      .enter()
      .append('text')
      .attr('font-size', '9px')
      .attr('font-family', 'monospace')
      .attr('fill', 'rgba(148, 163, 184, 0.6)')
      .attr('text-anchor', 'middle')
      .text(d => d.label || '');

    // Render Nodes
    const nodeGroup = g.append('g').attr('class', 'nodes');
    const node = nodeGroup.selectAll<SVGGElement, GraphNode>('g')
      .data(simNodes)
      .enter()
      .append('g')
      .attr('class', 'node-item')
      .attr('cursor', 'pointer')
      .call(
        d3.drag<SVGGElement, GraphNode>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      )
      .on('click', (event, d) => {
        event.stopPropagation();
        setSelectedNode(d);
      });

    // Highlight rings for Current Word (Pulsing Amber)
    node.filter(d => !!d.isCurrent)
      .append('circle')
      .attr('r', d => d.radius + 6)
      .attr('fill', 'none')
      .attr('stroke', '#f59e0b')
      .attr('stroke-width', 2)
      .attr('opacity', 0.8)
      .attr('stroke-dasharray', '3,3')
      .attr('filter', 'url(#glow)');

    // Highlight rings for Root node (Glowing Indigo)
    node.filter(d => d.type === 'root')
      .append('circle')
      .attr('r', d => d.radius + 5)
      .attr('fill', 'none')
      .attr('stroke', '#818cf8')
      .attr('stroke-width', 2)
      .attr('opacity', 0.6)
      .attr('filter', 'url(#glow)');

    // Main circle of the node
    node.append('circle')
      .attr('r', d => d.radius)
      .attr('fill', d => {
        if (d.type === 'root') return '#312e81'; // dark indigo
        if (d.type === 'prefix') return '#164e63'; // dark cyan
        if (d.isCurrent) return '#78350f'; // dark amber
        if (d.isMastered) return '#064e3b'; // dark emerald
        return '#3b0764'; // dark purple
      })
      .attr('stroke', d => d.color)
      .attr('stroke-width', d => (d.isCurrent || d.type === 'root') ? 2.5 : 1.5);

    // Node Icons / Badges
    node.filter(d => !!d.isMastered)
      .append('text')
      .attr('x', d => d.radius - 4)
      .attr('y', d => -d.radius + 4)
      .attr('font-size', '10px')
      .attr('fill', '#34d399')
      .text('✓');

    // Label 1: Main name (word or root or prefix)
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', d => {
        if (d.type === 'root' || d.sublabel || (d.meaning && d.type === 'word')) return '-3px';
        return '4px';
      })
      .attr('font-size', d => {
        if (d.type === 'root') return '12px';
        if (d.type === 'prefix') return '11px';
        return '11px';
      })
      .attr('font-weight', 'bold')
      .attr('font-family', 'monospace')
      .attr('fill', '#ffffff')
      .text(d => {
        if (d.label.length > 10) return d.label.substring(0, 9) + '…';
        return d.label;
      });

    // Label 2: Subtitle / Meaning
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '11px')
      .attr('font-size', '8.5px')
      .attr('fill', 'rgba(226, 232, 240, 0.7)')
      .text(d => {
        if (d.sublabel) {
          return d.sublabel.length > 7 ? d.sublabel.substring(0, 6) + '…' : d.sublabel;
        }
        if (d.meaning) {
          const firstMeaning = d.meaning.split(/[,，;；]/)[0];
          return firstMeaning.length > 6 ? firstMeaning.substring(0, 5) + '…' : firstMeaning;
        }
        return '';
      });

    // Tooltip on node hover
    node.append('title')
      .text(d => {
        if (d.type === 'root') return `【中心词根】${d.label}: ${d.sublabel || ''}`;
        if (d.type === 'prefix') return `【派生前缀】${d.label} (${d.sublabel || ''})`;
        return `【${d.isCurrent ? '当前单词' : '同根词'}】${d.label}\n释义: ${d.meaning || ''}`;
      });

    // Tick update loop
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as GraphNode).x || 0)
        .attr('y1', d => (d.source as GraphNode).y || 0)
        .attr('x2', d => (d.target as GraphNode).x || 0)
        .attr('y2', d => (d.target as GraphNode).y || 0);

      linkText
        .attr('x', d => (((d.source as GraphNode).x || 0) + ((d.target as GraphNode).x || 0)) / 2)
        .attr('y', d => (((d.source as GraphNode).y || 0) + ((d.target as GraphNode).y || 0)) / 2 - 2);

      node.attr('transform', d => `translate(${d.x || 0},${d.y || 0})`);
    });

    // Reset view to center on initial render
    svg.on('click', () => {
      // clicking background keeps selection or deselects
    });

    return () => {
      simulation.stop();
    };
  }, [nodes, links]);

  // Controls for zoom
  const handleZoomIn = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current).transition().duration(250).call(zoomBehaviorRef.current.scaleBy, 1.25);
  };

  const handleZoomOut = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current).transition().duration(250).call(zoomBehaviorRef.current.scaleBy, 0.8);
  };

  const handleResetZoom = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current).transition().duration(350).call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
  };

  return (
    <div className="relative w-full h-[520px] flex flex-col bg-zinc-950 rounded-2xl overflow-hidden select-none border border-zinc-900">
      {/* Top Overlay Legend & Status */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 flex-wrap pointer-events-none">
        <div className="bg-zinc-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-zinc-800 text-[11px] font-mono text-zinc-300 flex items-center gap-3 pointer-events-auto shadow-md">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/50"></span>
            <span>词根: {rootCore}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
            <span>前缀衍生</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            <span>当前单词</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span>
            <span>同根词汇</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <span>已掌握</span>
          </div>
        </div>
      </div>

      {/* Floating Canvas Controls */}
      <div className="absolute top-3 right-3 z-10 flex items-center space-x-1.5 bg-zinc-900/90 backdrop-blur-md p-1 rounded-xl border border-zinc-800 shadow-md">
        <button
          type="button"
          onClick={handleZoomIn}
          className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          title="放大"
        >
          <ZoomIn size={15} />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          title="缩小"
        >
          <ZoomOut size={15} />
        </button>
        <button
          type="button"
          onClick={handleResetZoom}
          className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          title="重置居中"
        >
          <RotateCcw size={14} />
        </button>
      </div>

      {/* D3 SVG Container */}
      <div ref={containerRef} className="flex-1 w-full h-full cursor-grab active:cursor-grabbing">
        <svg ref={svgRef} className="w-full h-full block" />
      </div>

      {/* Node Inspector Drawer at Bottom */}
      <div className="p-3.5 px-4 bg-zinc-900/95 border-t border-zinc-800 backdrop-blur-md flex items-center justify-between gap-4 z-10 min-h-[64px]">
        {selectedNode && selectedNode.type === 'word' && selectedNode.wordData ? (
          <div className="flex items-center justify-between gap-4 w-full animate-in fade-in duration-150">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-base font-bold font-mono text-white">
                    {selectedNode.wordData.word}
                  </span>
                  {selectedNode.wordData.phonetic && (
                    <span className="text-xs font-mono text-zinc-400">
                      {selectedNode.wordData.phonetic}
                    </span>
                  )}
                  {selectedNode.wordData.part_of_speech && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                      {selectedNode.wordData.part_of_speech}
                    </span>
                  )}
                  {selectedNode.isCurrent && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      当前学习
                    </span>
                  )}
                  {selectedNode.isMastered && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-0.5">
                      <CheckCircle2 size={10} /> 已掌握
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => speakWord(selectedNode.wordData!.word)}
                    className="p-1 text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 rounded-full transition-colors"
                    title="发音"
                  >
                    <Volume2 size={14} />
                  </button>
                </div>

                <div className="text-xs text-zinc-300 truncate">
                  {selectedNode.wordData.meaning}
                </div>

                {/* Morphological Breakdown Logic */}
                <div className="text-[11px] font-mono text-zinc-400 flex items-center gap-1">
                  <span className="text-zinc-500">构词逻辑:</span>
                  {selectedNode.prefix && (
                    <span className="text-cyan-400">{selectedNode.prefix} ({selectedNode.prefixMeaning})</span>
                  )}
                  {selectedNode.prefix && <span>+</span>}
                  <span className="text-indigo-400 font-bold">{rootCore} ({rootMeaning})</span>
                  {selectedNode.suffix && <span>+</span>}
                  {selectedNode.suffix && (
                    <span className="text-purple-400">{selectedNode.suffix} ({selectedNode.suffixMeaning})</span>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onSelectWord(selectedNode.wordData!)}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/30 flex items-center gap-1.5 shrink-0 active:scale-95"
            >
              <span>切换背诵</span>
              <ArrowRight size={13} />
            </button>
          </div>
        ) : selectedNode && selectedNode.type === 'root' ? (
          <div className="flex items-center gap-3 text-xs text-zinc-300">
            <Sparkles size={16} className="text-indigo-400" />
            <div>
              <span className="font-bold text-white font-mono">{rootCore}</span>：
              <span>{rootMeaning || '词根核心'} · 共聚类衍生 {matchingWords.length} 个单词，点击任意单词节点可查看详细构词脉络与一键切换学习</span>
            </div>
          </div>
        ) : selectedNode && selectedNode.type === 'prefix' ? (
          <div className="flex items-center gap-3 text-xs text-zinc-300">
            <Layers size={16} className="text-cyan-400" />
            <div>
              <span className="font-bold text-white font-mono">{selectedNode.label}</span> 前缀分支：
              <span>含义为「{selectedNode.sublabel}」，可串联该分支下的衍生派生词汇</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Info size={14} className="text-zinc-500" />
            <span>点击图中任意节点查看构词语义详情，拖拽可调整力导向布局，滚轮可缩放画布</span>
          </div>
        )}
      </div>
    </div>
  );
};
