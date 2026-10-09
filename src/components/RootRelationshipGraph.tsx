import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { Volume2, Sparkles, ArrowRight, CheckCircle2, RotateCcw, ZoomIn, ZoomOut, Layers, Info, Link2, GitCompare, BookOpen } from 'lucide-react';
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

  // Identify central word (anchor)
  const centerWord = useMemo(() => {
    if (currentWordId) {
      const found = matchingWords.find(w => w.id === currentWordId);
      if (found) return found;
    }
    return matchingWords[0] || null;
  }, [matchingWords, currentWordId]);

  // Auto-select current word node or center word on mount
  useEffect(() => {
    if (centerWord) {
      setSelectedNode({
        id: `word-${centerWord.id}`,
        type: 'word',
        label: centerWord.word,
        meaning: centerWord.meaning,
        radius: 26,
        wordData: centerWord,
        isCurrent: true,
        isMastered: centerWord.is_mastered,
        prefix: centerWord.prefix,
        prefixMeaning: centerWord.prefix_meaning,
        suffix: centerWord.suffix,
        suffixMeaning: centerWord.suffix_meaning,
        color: '#f59e0b',
      });
    }
  }, [centerWord]);

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
        const isCur = w.id === (centerWord?.id || currentWordId);
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
      const isCur = w.id === (centerWord?.id || currentWordId);
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
  }, [rootCore, rootMeaning, matchingWords, currentWordId, centerWord]);

  // Compute Morphological comparison between center word and clicked node
  const morphologyComparison = useMemo(() => {
    if (!selectedNode || selectedNode.type !== 'word' || !selectedNode.wordData || !centerWord) {
      return null;
    }
    const targetWord = selectedNode.wordData;
    const isSelf = targetWord.id === centerWord.id;

    const cleanPreA = (centerWord.prefix || '').replace(/[^a-zA-Z]/g, '').toLowerCase().trim();
    const cleanPreB = (targetWord.prefix || '').replace(/[^a-zA-Z]/g, '').toLowerCase().trim();
    const hasSamePrefix = !!(cleanPreA && cleanPreB && cleanPreA === cleanPreB);

    const cleanSufA = (centerWord.suffix || '').replace(/[^a-zA-Z]/g, '').toLowerCase().trim();
    const cleanSufB = (targetWord.suffix || '').replace(/[^a-zA-Z]/g, '').toLowerCase().trim();
    const hasSameSuffix = !!(cleanSufA && cleanSufB && cleanSufA === cleanSufB);

    let logicTitle = '';
    let logicBadge = '';
    let logicColor = '';
    let logicDescription = '';

    if (isSelf) {
      logicTitle = `中心基准词: ${centerWord.word}`;
      logicBadge = '中心学习词';
      logicColor = 'text-amber-400 border-amber-500/30 bg-amber-500/10';
      logicDescription = `当前卡片学习词，作为本词根衍生脉络的核心基准点。点击图中的其它单词节点可实时高亮并动态对比构词衍生关系。`;
    } else if (hasSamePrefix && hasSameSuffix) {
      logicTitle = `共享前缀「${targetWord.prefix}」与后缀「${targetWord.suffix}」`;
      logicBadge = '前缀 + 后缀 双重共享';
      logicColor = 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
      logicDescription = `两词具有高度对称的同源构词结构，共享前缀「${targetWord.prefix}」(${targetWord.prefix_meaning || '同前置域'}) 与后缀「${targetWord.suffix}」(${targetWord.suffix_meaning || '同词性'}), 属于同一派生范式。`;
    } else if (hasSamePrefix) {
      logicTitle = `共享前缀「${targetWord.prefix}」`;
      logicBadge = '共享前缀分支';
      logicColor = 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10';
      logicDescription = `两词同属前缀「${targetWord.prefix}」(${targetWord.prefix_meaning || '前缀修饰'}) 衍生分支，在词根「${rootCore}」核心语义之上共享相同的前置派生作用。`;
    } else if (hasSameSuffix) {
      logicTitle = `共享后缀「${targetWord.suffix}」`;
      logicBadge = '共享后缀范畴';
      logicColor = 'text-purple-400 border-purple-500/30 bg-purple-500/10';
      logicDescription = `两词均附加后缀「${targetWord.suffix}」(${targetWord.suffix_meaning || '后缀形态'})，词性特征一致（均为 ${targetWord.part_of_speech || centerWord.part_of_speech || '派生词'}），通过相同后缀语法范畴完成词性塑造。`;
    } else {
      logicTitle = `共享核心词根「${rootCore}」`;
      logicBadge = '同词根派生扩展';
      logicColor = 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10';
      logicDescription = `均以核心词根「${rootCore}」(${rootMeaning || '根义'}) 为语义底座，分别附加不同前后缀（${centerWord.prefix ? `「${centerWord.prefix}」` : '无前缀'} ⟷ ${targetWord.prefix ? `「${targetWord.prefix}」` : '无前缀'}）派生出不同概念。`;
    }

    return {
      isSelf,
      hasSamePrefix,
      hasSameSuffix,
      sharedPrefix: hasSamePrefix ? targetWord.prefix : undefined,
      sharedPrefixMeaning: hasSamePrefix ? targetWord.prefix_meaning : undefined,
      sharedSuffix: hasSameSuffix ? targetWord.suffix : undefined,
      sharedSuffixMeaning: hasSameSuffix ? targetWord.suffix_meaning : undefined,
      logicTitle,
      logicBadge,
      logicColor,
      logicDescription,
      centerWord,
      targetWord,
    };
  }, [selectedNode, centerWord, rootCore, rootMeaning]);

  // Main D3 Rendering Effect
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || 720;
    const height = container.clientHeight || 520;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous render

    // Definition of filters, gradients and markers
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

    // Intense dynamic glow
    const intenseGlow = defs.append('filter')
      .attr('id', 'intenseGlow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
    intenseGlow.append('feGaussianBlur').attr('stdDeviation', '6').attr('result', 'blur');
    const intenseMerge = intenseGlow.append('feMerge');
    intenseMerge.append('feMergeNode').attr('in', 'blur');
    intenseMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Gradient for dynamic logic line
    const grad = defs.append('linearGradient')
      .attr('id', 'dynamicLogicGrad')
      .attr('gradientUnits', 'userSpaceOnUse');
    grad.append('stop').attr('offset', '0%').attr('stop-color', '#38bdf8');
    grad.append('stop').attr('offset', '50%').attr('stop-color', '#818cf8');
    grad.append('stop').attr('offset', '100%').attr('stop-color', '#f59e0b');

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

    // Marker for dynamic connection
    defs.append('marker')
      .attr('id', 'logicArrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 26)
      .attr('refY', 0)
      .attr('markerWidth', 7)
      .attr('markerHeight', 7)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-4L8,0L0,4')
      .attr('fill', '#38bdf8');

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
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2 - 20))
      .force('collide', d3.forceCollide<GraphNode>().radius(d => d.radius + 20).iterations(3));

    // Render Static Links
    const linkGroup = g.append('g').attr('class', 'links');
    const link = linkGroup.selectAll<SVGLineElement, GraphLink>('line')
      .data(simLinks)
      .enter()
      .append('line')
      .attr('class', 'static-link')
      .attr('stroke', d => {
        if (d.relationType === 'root-to-prefix') return 'rgba(99, 102, 241, 0.45)';
        return 'rgba(148, 163, 184, 0.25)';
      })
      .attr('stroke-width', d => d.relationType === 'root-to-prefix' ? 2 : 1.5)
      .attr('stroke-dasharray', d => d.relationType === 'root-to-prefix' ? '4,3' : 'none');

    // Render Link Labels
    const linkText = linkGroup.selectAll<SVGTextElement, GraphLink>('text')
      .data(simLinks.filter(l => l.label))
      .enter()
      .append('text')
      .attr('class', 'static-link-label')
      .attr('font-size', '9px')
      .attr('font-family', 'monospace')
      .attr('fill', 'rgba(148, 163, 184, 0.6)')
      .attr('text-anchor', 'middle')
      .text(d => d.label || '');

    // Dynamic Logic Link Group (drawn between clicked word & center word / root)
    const dynamicGroup = g.append('g').attr('class', 'dynamic-logic-group');
    const dynamicLine = dynamicGroup.append('line')
      .attr('class', 'dynamic-logic-line')
      .attr('stroke', 'url(#dynamicLogicGrad)')
      .attr('stroke-width', 3)
      .attr('stroke-dasharray', '8,4')
      .attr('filter', 'url(#glow)')
      .attr('opacity', 0);

    const dynamicPill = dynamicGroup.append('g')
      .attr('class', 'dynamic-pill')
      .attr('opacity', 0);

    const dynamicPillRect = dynamicPill.append('rect')
      .attr('rx', 8)
      .attr('ry', 8)
      .attr('fill', '#090d16')
      .attr('stroke', '#38bdf8')
      .attr('stroke-width', 1.2)
      .attr('filter', 'url(#glow)');

    const dynamicPillText = dynamicPill.append('text')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace')
      .attr('font-weight', 'bold')
      .attr('fill', '#38bdf8')
      .attr('text-anchor', 'middle')
      .attr('dy', '3px');

    // Render Nodes Group
    const nodeGroup = g.append('g').attr('class', 'nodes');
    const node = nodeGroup.selectAll<SVGGElement, GraphNode>('g')
      .data(simNodes)
      .enter()
      .append('g')
      .attr('class', d => `node-item node-${d.id}`)
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
        simulation.alpha(0.06).restart();
      });

    // Outer Selection Glow Ring for Clicked Node
    node.append('circle')
      .attr('class', 'node-select-ring')
      .attr('r', d => d.radius + 8)
      .attr('fill', 'none')
      .attr('stroke', '#38bdf8')
      .attr('stroke-width', 2.5)
      .attr('opacity', 0)
      .attr('stroke-dasharray', '5,3')
      .attr('filter', 'url(#intenseGlow)');

    // Center Word Highlight Ring (Amber)
    node.filter(d => !!d.isCurrent)
      .append('circle')
      .attr('class', 'node-center-ring')
      .attr('r', d => d.radius + 5)
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

    // Main Circle of the Node
    node.append('circle')
      .attr('class', 'node-main-circle')
      .attr('r', d => d.radius)
      .attr('fill', d => {
        if (d.type === 'root') return '#312e81'; // dark indigo
        if (d.type === 'prefix') return '#164e63'; // dark cyan
        if (d.isCurrent) return '#78350f'; // dark amber
        if (d.isMastered) return '#064e3b'; // dark emerald
        return '#3b0764'; // dark purple
      })
      .attr('stroke', d => d.color)
      .attr('stroke-width', d => (d.isCurrent || d.type === 'root') ? 2.5 : 1.5)
      .attr('transition', 'all 0.2s');

    // Mastered check badge
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
        return `【${d.isCurrent ? '中心词' : '关联词'}】${d.label}\n释义: ${d.meaning || ''}`;
      });

    // Animate dash offset for dynamic flowing link
    let dashOffset = 0;
    const flowTimer = d3.timer(() => {
      dashOffset -= 0.6;
      dynamicLine.attr('stroke-dashoffset', dashOffset);
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

      // Dynamic Logic Line positioning
      if (selectedNode && selectedNode.type === 'word' && selectedNode.wordData) {
        const centerNodeId = centerWord ? `word-${centerWord.id}` : `root-${rootCore}`;
        const sourceSim = simNodes.find(n => n.id === centerNodeId);
        const targetSim = simNodes.find(n => n.id === selectedNode.id);

        if (sourceSim && targetSim && sourceSim.id !== targetSim.id) {
          const x1 = sourceSim.x || 0;
          const y1 = sourceSim.y || 0;
          const x2 = targetSim.x || 0;
          const y2 = targetSim.y || 0;

          dynamicLine
            .attr('x1', x1)
            .attr('y1', y1)
            .attr('x2', x2)
            .attr('y2', y2)
            .attr('opacity', 0.95);

          // Update gradient direction
          grad
            .attr('x1', x1)
            .attr('y1', y1)
            .attr('x2', x2)
            .attr('y2', y2);

          const midX = (x1 + x2) / 2;
          const midY = (y1 + y2) / 2;

          dynamicPill
            .attr('transform', `translate(${midX},${midY})`)
            .attr('opacity', 1);
        } else {
          dynamicLine.attr('opacity', 0);
          dynamicPill.attr('opacity', 0);
        }
      } else {
        dynamicLine.attr('opacity', 0);
        dynamicPill.attr('opacity', 0);
      }
    });

    return () => {
      simulation.stop();
      flowTimer.stop();
    };
  }, [nodes, links, centerWord, rootCore]);

  // Highlight and focus logic update when selectedNode changes
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);

    const selectedId = selectedNode?.id;
    const centerNodeId = centerWord ? `word-${centerWord.id}` : `root-${rootCore}`;
    const rootNodeId = `root-${rootCore}`;

    // Compute badge label for the dynamic line
    let pillTextContent = '';
    if (morphologyComparison && !morphologyComparison.isSelf) {
      if (morphologyComparison.hasSamePrefix) {
        pillTextContent = `🔗 共享前缀「${morphologyComparison.sharedPrefix}」`;
      } else if (morphologyComparison.hasSameSuffix) {
        pillTextContent = `🔗 共享后缀「${morphologyComparison.sharedSuffix}」`;
      } else {
        pillTextContent = `🧬 共享词根「${rootCore}」`;
      }
    }

    const pillText = svg.select('.dynamic-pill text');
    const pillRect = svg.select('.dynamic-pill rect');
    if (pillTextContent) {
      pillText.text(pillTextContent);
      const textNode = pillText.node() as SVGGraphicsElement | null;
      const bbox = textNode ? textNode.getBBox() : { width: 100, height: 16 };
      pillRect
        .attr('width', bbox.width + 16)
        .attr('height', 20)
        .attr('x', -(bbox.width + 16) / 2)
        .attr('y', -10);
    }

    // Update node highlighting
    svg.selectAll<SVGGElement, GraphNode>('.node-item').each(function(d) {
      const g = d3.select(this);
      const isTarget = d.id === selectedId;
      const isCenter = d.id === centerNodeId;
      const isRoot = d.id === rootNodeId;
      const isSharedPrefixNode = morphologyComparison?.hasSamePrefix && d.type === 'prefix' && d.label === morphologyComparison.sharedPrefix;

      const isConnected = isTarget || isCenter || isRoot || isSharedPrefixNode;

      // Selection ring
      g.select('.node-select-ring')
        .attr('opacity', isTarget ? 0.95 : 0)
        .attr('stroke', isTarget && isCenter ? '#f59e0b' : '#38bdf8');

      // Center ring
      g.select('.node-center-ring')
        .attr('opacity', isCenter ? 0.9 : 0);

      // Node opacity dimming
      if (selectedId) {
        if (isConnected) {
          g.attr('opacity', 1);
          g.select('.node-main-circle')
            .attr('stroke-width', (isTarget || isCenter || isRoot) ? 3 : 2);
        } else {
          g.attr('opacity', 0.22);
          g.select('.node-main-circle').attr('stroke-width', 1);
        }
      } else {
        g.attr('opacity', 1);
        g.select('.node-main-circle').attr('stroke-width', d.isCurrent || d.type === 'root' ? 2.5 : 1.5);
      }
    });

    // Update link opacity
    svg.selectAll<SVGLineElement, GraphLink>('.static-link').each(function(d) {
      const l = d3.select(this);
      if (selectedId) {
        const sId = typeof d.source === 'object' ? (d.source as GraphNode).id : d.source;
        const tId = typeof d.target === 'object' ? (d.target as GraphNode).id : d.target;
        const isRelated = sId === selectedId || tId === selectedId || sId === centerNodeId || tId === centerNodeId;

        l.attr('opacity', isRelated ? 0.8 : 0.08)
         .attr('stroke-width', isRelated ? 2.2 : 1.2);
      } else {
        l.attr('opacity', 1)
         .attr('stroke-width', d.relationType === 'root-to-prefix' ? 2 : 1.5);
      }
    });

  }, [selectedNode, centerWord, rootCore, morphologyComparison]);

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
    <div className="relative w-full h-[580px] flex flex-col bg-zinc-950 rounded-2xl overflow-hidden select-none border border-zinc-900 shadow-inner">
      {/* Top Overlay Legend & Status */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 flex-wrap pointer-events-none">
        <div className="bg-zinc-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-zinc-800 text-[11px] font-mono text-zinc-300 flex items-center gap-3 pointer-events-auto shadow-md">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/50"></span>
            <span>核心词根</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 shadow-sm shadow-cyan-500/50"></span>
            <span>派生前缀</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50"></span>
            <span>中心词</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-sm shadow-purple-500/50"></span>
            <span>关联单词</span>
          </div>
        </div>

        {morphologyComparison && (
          <div className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold backdrop-blur-md shadow-md pointer-events-auto flex items-center gap-1.5 animate-in fade-in duration-200 ${morphologyComparison.logicColor}`}>
            <Sparkles size={13} className="shrink-0" />
            <span>{morphologyComparison.logicBadge}</span>
          </div>
        )}
      </div>

      {/* Floating Canvas Controls */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5 pointer-events-auto">
        <button
          type="button"
          onClick={handleZoomIn}
          className="p-2 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-all shadow-md active:scale-95"
          title="放大"
        >
          <ZoomIn size={15} />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          className="p-2 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-all shadow-md active:scale-95"
          title="缩小"
        >
          <ZoomOut size={15} />
        </button>
        <button
          type="button"
          onClick={handleResetZoom}
          className="p-2 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-all shadow-md active:scale-95"
          title="重置视角"
        >
          <RotateCcw size={15} />
        </button>
      </div>

      {/* D3 SVG Container */}
      <div ref={containerRef} className="flex-1 w-full h-full relative overflow-hidden">
        <svg ref={svgRef} className="w-full h-full block" />
      </div>

      {/* Bottom Interactive Morphology Logic Panel */}
      <div className="p-3.5 sm:p-4 bg-zinc-900/95 backdrop-blur-md border-t border-zinc-800/80 z-20 transition-all">
        {morphologyComparison ? (
          <div className="space-y-2.5">
            {/* Top comparison bar */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <GitCompare size={14} className="text-cyan-400" />
                  <span>构词逻辑映射</span>
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold border ${morphologyComparison.logicColor}`}>
                  {morphologyComparison.logicTitle}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onSelectWord(morphologyComparison.targetWord)}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/30 flex items-center gap-1.5 active:scale-95"
                >
                  <span>切换学习「{morphologyComparison.targetWord.word}」</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>

            {/* Comparison Cards: Center Word vs Clicked Associated Word */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
              {/* Center Word Card */}
              <div className="bg-zinc-950/70 border border-zinc-800/80 p-2.5 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                      中心词
                    </span>
                    <span className="text-sm font-bold font-mono text-white">
                      {morphologyComparison.centerWord.word}
                    </span>
                    {morphologyComparison.centerWord.phonetic && (
                      <span className="text-[11px] font-mono text-zinc-500">
                        {morphologyComparison.centerWord.phonetic}
                      </span>
                    )}
                    {morphologyComparison.centerWord.part_of_speech && (
                      <span className="text-[10px] font-mono px-1 rounded bg-zinc-800 text-zinc-400">
                        {morphologyComparison.centerWord.part_of_speech}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => speakWord(morphologyComparison.centerWord.word)}
                    className="p-1 text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 rounded-full transition-colors"
                    title="朗读中心词"
                  >
                    <Volume2 size={13} />
                  </button>
                </div>

                <div className="text-xs text-zinc-300 truncate">
                  {morphologyComparison.centerWord.meaning}
                </div>

                {/* Breakdown */}
                <div className="text-[11px] font-mono text-zinc-400 flex items-center flex-wrap gap-1 pt-0.5">
                  <span className="text-zinc-500 font-sans text-[10px]">拆解:</span>
                  {morphologyComparison.centerWord.prefix ? (
                    <span className={`px-1 py-0.2 rounded ${morphologyComparison.hasSamePrefix ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30' : 'text-zinc-400'}`}>
                      {morphologyComparison.centerWord.prefix}
                    </span>
                  ) : <span className="text-zinc-600">无前缀</span>}
                  <span className="text-zinc-600">+</span>
                  <span className="px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                    {rootCore}
                  </span>
                  <span className="text-zinc-600">+</span>
                  {morphologyComparison.centerWord.suffix ? (
                    <span className={`px-1 py-0.2 rounded ${morphologyComparison.hasSameSuffix ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30' : 'text-zinc-400'}`}>
                      {morphologyComparison.centerWord.suffix}
                    </span>
                  ) : <span className="text-zinc-600">无后缀</span>}
                </div>
              </div>

              {/* Clicked Associated Word Card */}
              <div className="bg-zinc-950/70 border border-zinc-800/80 p-2.5 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                      {morphologyComparison.isSelf ? '已选词' : '关联词'}
                    </span>
                    <span className="text-sm font-bold font-mono text-white">
                      {morphologyComparison.targetWord.word}
                    </span>
                    {morphologyComparison.targetWord.phonetic && (
                      <span className="text-[11px] font-mono text-zinc-500">
                        {morphologyComparison.targetWord.phonetic}
                      </span>
                    )}
                    {morphologyComparison.targetWord.part_of_speech && (
                      <span className="text-[10px] font-mono px-1 rounded bg-zinc-800 text-zinc-400">
                        {morphologyComparison.targetWord.part_of_speech}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => speakWord(morphologyComparison.targetWord.word)}
                    className="p-1 text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 rounded-full transition-colors"
                    title="朗读关联词"
                  >
                    <Volume2 size={13} />
                  </button>
                </div>

                <div className="text-xs text-zinc-300 truncate">
                  {morphologyComparison.targetWord.meaning}
                </div>

                {/* Breakdown */}
                <div className="text-[11px] font-mono text-zinc-400 flex items-center flex-wrap gap-1 pt-0.5">
                  <span className="text-zinc-500 font-sans text-[10px]">拆解:</span>
                  {morphologyComparison.targetWord.prefix ? (
                    <span className={`px-1 py-0.2 rounded ${morphologyComparison.hasSamePrefix ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30' : 'text-zinc-400'}`}>
                      {morphologyComparison.targetWord.prefix}
                    </span>
                  ) : <span className="text-zinc-600">无前缀</span>}
                  <span className="text-zinc-600">+</span>
                  <span className="px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                    {rootCore}
                  </span>
                  <span className="text-zinc-600">+</span>
                  {morphologyComparison.targetWord.suffix ? (
                    <span className={`px-1 py-0.2 rounded ${morphologyComparison.hasSameSuffix ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30' : 'text-zinc-400'}`}>
                      {morphologyComparison.targetWord.suffix}
                    </span>
                  ) : <span className="text-zinc-600">无后缀</span>}
                </div>
              </div>
            </div>

            {/* Description Banner */}
            <p className="text-xs text-zinc-400 leading-relaxed bg-zinc-900/60 p-2 rounded-lg border border-zinc-850">
              <span className="text-zinc-300 font-medium mr-1.5">💡 派生逻辑:</span>
              {morphologyComparison.logicDescription}
            </p>
          </div>
        ) : selectedNode && selectedNode.type === 'root' ? (
          <div className="flex items-center gap-3 text-xs text-zinc-300">
            <Sparkles size={16} className="text-indigo-400 shrink-0" />
            <div>
              <span className="font-bold text-white font-mono">{rootCore}</span>：
              <span>{rootMeaning || '核心词根'} · 共衍生聚类 {matchingWords.length} 个单词。点击图中任意关联单词节点，系统将自动高亮并用连线动态展示构词逻辑。</span>
            </div>
          </div>
        ) : selectedNode && selectedNode.type === 'prefix' ? (
          <div className="flex items-center gap-3 text-xs text-zinc-300">
            <Layers size={16} className="text-cyan-400 shrink-0" />
            <div>
              <span className="font-bold text-white font-mono">{selectedNode.label}</span> 派生前缀分支：
              <span>含义为「{selectedNode.sublabel}」，可串联该分支下的同源单词。点击任意词汇节点可对比分析构词机制。</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Info size={14} className="text-zinc-500 shrink-0" />
            <span>点击图中任意单词节点，将自动高亮并通过流动连线动态展示其与中心词的构词逻辑（如共享前缀/后缀）。</span>
          </div>
        )}
      </div>
    </div>
  );
};
