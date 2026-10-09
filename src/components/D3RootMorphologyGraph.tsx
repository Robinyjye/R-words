import React, { useEffect, useRef, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { Volume2, ArrowRight, Sparkles, ZoomIn, ZoomOut, RotateCcw, Maximize2, Layers } from 'lucide-react';
import { WordState } from '../utils/word';
import { speakWord } from '../utils/audio';

interface D3RootMorphologyGraphProps {
  rootCore: string;
  rootMeaning?: string;
  words: WordState[];
  currentWordId?: string;
  onSelectWord: (word: WordState) => void;
}

export const D3RootMorphologyGraph: React.FC<D3RootMorphologyGraphProps> = ({
  rootCore,
  rootMeaning,
  words,
  currentWordId,
  onSelectWord,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [hoveredWordId, setHoveredWordId] = useState<string | null>(null);
  const [selectedWord, setSelectedWord] = useState<WordState | null>(null);

  // Clean root core
  const cleanRoot = useMemo(() => {
    return rootCore.trim().replace(/^[-+]+|[-+]+$/g, '');
  }, [rootCore]);

  // Build morphology data structure for each word
  const morphologyData = useMemo(() => {
    return words.map(w => {
      const hasPrefix = Boolean(w.prefix && w.prefix.trim());
      const hasSuffix = Boolean(w.suffix && w.suffix.trim());

      const prefixText = hasPrefix ? w.prefix!.trim() : null;
      const prefixMeaning = w.prefix_meaning ? w.prefix_meaning.trim() : null;

      const suffixText = hasSuffix ? w.suffix!.trim() : null;
      const suffixMeaning = w.suffix_meaning ? w.suffix_meaning.trim() : null;

      return {
        wordItem: w,
        id: w.id,
        word: w.word,
        meaning: w.meaning,
        phonetic: w.phonetic,
        part_of_speech: w.part_of_speech,
        prefix: prefixText,
        prefixMeaning,
        root: cleanRoot,
        rootMeaning: w.root_meaning || rootMeaning,
        suffix: suffixText,
        suffixMeaning,
      };
    });
  }, [words, cleanRoot, rootMeaning]);

  // Render D3 Graph
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || morphologyData.length === 0) return;

    const containerWidth = containerRef.current.clientWidth || 720;
    const count = morphologyData.length;

    // Compact layout metrics:
    // Tight row height for maximum density & beauty
    const rowHeight = count <= 3 ? 72 : count <= 6 ? 62 : 56;
    const topPadding = 42;
    const bottomPadding = 32;
    const graphHeight = Math.max(260, topPadding + count * rowHeight + bottomPadding);

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Node Dimensions
    const prefixW = 94;
    const prefixH = 42;

    const rootW = 126;
    const rootH = 54;

    const suffixW = 106;
    const suffixH = 42;

    const wordW = 224;
    const wordH = 50;

    const hasAnyPrefix = morphologyData.some(d => d.prefix);

    // Dynamic horizontal spacing based on container width
    const colPrefixX = hasAnyPrefix ? 58 : 0;
    const colRootX = hasAnyPrefix ? 200 : 88;
    const colSuffixX = hasAnyPrefix ? 356 : 265;
    const colWordX = hasAnyPrefix ? 560 : 475;

    const graphWidth = Math.max(containerWidth, hasAnyPrefix ? 695 : 610);

    svg
      .attr('viewBox', `0 0 ${graphWidth} ${graphHeight}`)
      .attr('width', '100%')
      .attr('height', graphHeight)
      .style('cursor', 'grab');

    // Defs for gradients, filters, and markers
    const defs = svg.append('defs');

    // Blue Arrow Marker (for Root -> Suffix)
    defs
      .append('marker')
      .attr('id', 'arrow-blue')
      .attr('viewBox', '0 -4 8 8')
      .attr('refX', 7)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-3.5L7,0L0,3.5')
      .attr('fill', '#3b82f6');

    // Emerald Arrow Marker (for Suffix -> Word)
    defs
      .append('marker')
      .attr('id', 'arrow-emerald')
      .attr('viewBox', '0 -4 8 8')
      .attr('refX', 7)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-3.5L7,0L0,3.5')
      .attr('fill', '#10b981');

    // Sky Arrow Marker (for Prefix -> Root)
    defs
      .append('marker')
      .attr('id', 'arrow-sky')
      .attr('viewBox', '0 -4 8 8')
      .attr('refX', 7)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-3.5L7,0L0,3.5')
      .attr('fill', '#38bdf8');

    // Active Highlight Arrow Marker
    defs
      .append('marker')
      .attr('id', 'arrow-active')
      .attr('viewBox', '0 -4 8 8')
      .attr('refX', 7)
      .attr('refY', 0)
      .attr('markerWidth', 7)
      .attr('markerHeight', 7)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-3.5L7,0L0,3.5')
      .attr('fill', '#34d399');

    // Node Glow & Drop Shadow
    const filter = defs
      .append('filter')
      .attr('id', 'soft-shadow')
      .attr('x', '-15%')
      .attr('y', '-15%')
      .attr('width', '130%')
      .attr('height', '130%');
    filter
      .append('feDropShadow')
      .attr('dx', '0')
      .attr('dy', '3')
      .attr('stdDeviation', '4')
      .attr('flood-color', '#000000')
      .attr('flood-opacity', '0.45');

    // Root glow filter
    const rootFilter = defs
      .append('filter')
      .attr('id', 'root-glow')
      .attr('x', '-20%')
      .attr('y', '-20%')
      .attr('width', '140%')
      .attr('height', '140%');
    rootFilter
      .append('feDropShadow')
      .attr('dx', '0')
      .attr('dy', '2')
      .attr('stdDeviation', '6')
      .attr('flood-color', '#2563eb')
      .attr('flood-opacity', '0.4');

    // Gradients
    // Root Gradient (Vibrant Sapphire)
    const rootGrad = defs
      .append('linearGradient')
      .attr('id', 'rootLinearGrad')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '100%');
    rootGrad.append('stop').attr('offset', '0%').attr('stop-color', '#2563eb');
    rootGrad.append('stop').attr('offset', '100%').attr('stop-color', '#1d4ed8');

    // Suffix Gradient (Matching user image 2 blue box)
    const suffixGrad = defs
      .append('linearGradient')
      .attr('id', 'suffixLinearGrad')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '100%');
    suffixGrad.append('stop').attr('offset', '0%').attr('stop-color', '#2563eb');
    suffixGrad.append('stop').attr('offset', '100%').attr('stop-color', '#1e40af');

    // Prefix Gradient (Slate Sky)
    const prefixGrad = defs
      .append('linearGradient')
      .attr('id', 'prefixLinearGrad')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '100%');
    prefixGrad.append('stop').attr('offset', '0%').attr('stop-color', '#1e293b');
    prefixGrad.append('stop').attr('offset', '100%').attr('stop-color', '#0f172a');

    // Word Gradient
    const wordGrad = defs
      .append('linearGradient')
      .attr('id', 'wordLinearGrad')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '100%');
    wordGrad.append('stop').attr('offset', '0%').attr('stop-color', '#18181b');
    wordGrad.append('stop').attr('offset', '100%').attr('stop-color', '#09090b');

    // Active Word Gradient
    const wordActiveGrad = defs
      .append('linearGradient')
      .attr('id', 'wordActiveGrad')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '100%');
    wordActiveGrad.append('stop').attr('offset', '0%').attr('stop-color', '#1e1b4b');
    wordActiveGrad.append('stop').attr('offset', '100%').attr('stop-color', '#0f172a');

    // Main Zoom Group
    const g = svg.append('g').attr('class', 'main-flow-container');

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.65, 2.2])
      .on('zoom', event => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);
    zoomBehaviorRef.current = zoom;

    // Calculate Y for each row
    const rowYList = morphologyData.map((_, i) => topPadding + i * rowHeight + rowHeight / 2);
    // Root Center Y is the exact vertical median of all rows
    const rootCenterY = (rowYList[0] + rowYList[rowYList.length - 1]) / 2;

    // --- 1. Draw Links (Curves) with distributed anchor points ---
    const linksGroup = g.append('g').attr('class', 'links-group');

    morphologyData.forEach((d, idx) => {
      const rowY = rowYList[idx];
      const isHighlighted = hoveredWordId === d.id;

      // Distributed anchor on Root's right edge (so lines never crowd into a single point!)
      const spreadFactor = count > 1 ? (idx - (count - 1) / 2) / ((count - 1) / 2) : 0;
      const rootRightAnchorY = rootCenterY + spreadFactor * (rootH * 0.38);
      const rootLeftAnchorY = rootCenterY + spreadFactor * (rootH * 0.38);

      // Prefix -> Root
      if (d.prefix) {
        const pStartX = colPrefixX + prefixW / 2;
        const pStartY = rowY;
        const rTargetX = colRootX - rootW / 2;
        const rTargetY = rootLeftAnchorY;

        const pathPtoR = d3.path();
        pathPtoR.moveTo(pStartX, pStartY);
        const midX1 = (pStartX + rTargetX) / 2;
        pathPtoR.bezierCurveTo(midX1, pStartY, midX1, rTargetY, rTargetX, rTargetY);

        linksGroup
          .append('path')
          .attr('class', `link-p-${d.id}`)
          .attr('d', pathPtoR.toString())
          .attr('fill', 'none')
          .attr('stroke', isHighlighted ? '#38bdf8' : '#38bdf8')
          .attr('stroke-width', isHighlighted ? 2.2 : 1.4)
          .attr('stroke-opacity', isHighlighted ? 1 : hoveredWordId ? 0.25 : 0.65)
          .attr('stroke-dasharray', '3,3')
          .attr('marker-end', isHighlighted ? 'url(#arrow-sky)' : 'url(#arrow-sky)');
      }

      // Root -> Suffix (or direct to Word)
      const rStartX = colRootX + rootW / 2;
      const rStartY = rootRightAnchorY;

      if (d.suffix) {
        const sTargetX = colSuffixX - suffixW / 2;
        const sTargetY = rowY;

        const pathRtoS = d3.path();
        pathRtoS.moveTo(rStartX, rStartY);
        const midX2 = (rStartX + sTargetX) / 2;
        pathRtoS.bezierCurveTo(midX2, rStartY, midX2, sTargetY, sTargetX, sTargetY);

        linksGroup
          .append('path')
          .attr('class', `link-r-${d.id}`)
          .attr('d', pathRtoS.toString())
          .attr('fill', 'none')
          .attr('stroke', isHighlighted ? '#60a5fa' : '#3b82f6')
          .attr('stroke-width', isHighlighted ? 2.5 : 1.6)
          .attr('stroke-opacity', isHighlighted ? 1 : hoveredWordId ? 0.25 : 0.75)
          .attr('marker-end', isHighlighted ? 'url(#arrow-blue)' : 'url(#arrow-blue)');

        // Suffix -> Word (Horizontal direct link)
        const sStartX = colSuffixX + suffixW / 2;
        const sStartY = rowY;
        const wTargetX = colWordX - wordW / 2;
        const wTargetY = rowY;

        linksGroup
          .append('line')
          .attr('class', `link-w-${d.id}`)
          .attr('x1', sStartX)
          .attr('y1', sStartY)
          .attr('x2', wTargetX)
          .attr('y2', wTargetY)
          .attr('stroke', isHighlighted ? '#34d399' : '#10b981')
          .attr('stroke-width', isHighlighted ? 2.2 : 1.5)
          .attr('stroke-opacity', isHighlighted ? 1 : hoveredWordId ? 0.25 : 0.7)
          .attr('marker-end', isHighlighted ? 'url(#arrow-active)' : 'url(#arrow-emerald)');
      } else {
        // Direct Root -> Word
        const wTargetX = colWordX - wordW / 2;
        const wTargetY = rowY;

        const pathRtoW = d3.path();
        pathRtoW.moveTo(rStartX, rStartY);
        const midX3 = (rStartX + wTargetX) / 2;
        pathRtoW.bezierCurveTo(midX3, rStartY, midX3, wTargetY, wTargetX, wTargetY);

        linksGroup
          .append('path')
          .attr('class', `link-w-${d.id}`)
          .attr('d', pathRtoW.toString())
          .attr('fill', 'none')
          .attr('stroke', isHighlighted ? '#34d399' : '#10b981')
          .attr('stroke-width', isHighlighted ? 2.5 : 1.6)
          .attr('stroke-opacity', isHighlighted ? 1 : hoveredWordId ? 0.25 : 0.75)
          .attr('marker-end', isHighlighted ? 'url(#arrow-active)' : 'url(#arrow-emerald)');
      }
    });

    // --- 2. Draw Root Node (Centered and High Impact) ---
    const rootG = g
      .append('g')
      .attr('class', 'root-node-group')
      .attr('transform', `translate(${colRootX},${rootCenterY})`)
      .attr('filter', 'url(#root-glow)');

    // Root Card Body
    rootG
      .append('rect')
      .attr('x', -rootW / 2)
      .attr('y', -rootH / 2)
      .attr('width', rootW)
      .attr('height', rootH)
      .attr('rx', 10)
      .attr('ry', 10)
      .attr('fill', 'url(#rootLinearGrad)')
      .attr('stroke', '#60a5fa')
      .attr('stroke-width', 2);

    // Pill Tag: 核心词根
    rootG
      .append('rect')
      .attr('x', -27)
      .attr('y', -rootH / 2 - 9)
      .attr('width', 54)
      .attr('height', 17)
      .attr('rx', 8.5)
      .attr('ry', 8.5)
      .attr('fill', '#172554')
      .attr('stroke', '#93c5fd')
      .attr('stroke-width', 1);

    rootG
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('y', -rootH / 2 + 3)
      .attr('fill', '#dbeafe')
      .attr('font-size', '9.5px')
      .attr('font-weight', 'bold')
      .attr('font-family', 'sans-serif')
      .text('核心词根');

    // Root Core text
    rootG
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('y', rootMeaning ? -2 : 5)
      .attr('fill', '#ffffff')
      .attr('font-size', '16px')
      .attr('font-weight', 'bold')
      .attr('font-family', 'ui-monospace, monospace')
      .text(cleanRoot);

    // Root Meaning
    if (rootMeaning) {
      rootG
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('y', 16)
        .attr('fill', '#bfdbfe')
        .attr('font-size', '13px')
        .attr('font-weight', '500')
        .attr('font-family', 'sans-serif')
        .text(rootMeaning.length > 8 ? rootMeaning.slice(0, 7) + '..' : rootMeaning);
    }

    // --- 3. Draw Nodes for Each Word Row ---
    const nodesGroup = g.append('g').attr('class', 'nodes-group');

    morphologyData.forEach((d, idx) => {
      const rowY = rowYList[idx];
      const isCurrent = d.id === currentWordId;
      const isHighlighted = hoveredWordId === d.id;

      // === Prefix Node ===
      if (d.prefix) {
        const prefixG = nodesGroup
          .append('g')
          .attr('transform', `translate(${colPrefixX},${rowY})`)
          .attr('filter', 'url(#soft-shadow)')
          .attr('cursor', 'pointer')
          .on('mouseenter', () => setHoveredWordId(d.id))
          .on('mouseleave', () => setHoveredWordId(null));

        prefixG
          .append('rect')
          .attr('x', -prefixW / 2)
          .attr('y', -prefixH / 2)
          .attr('width', prefixW)
          .attr('height', prefixH)
          .attr('rx', 7)
          .attr('ry', 7)
          .attr('fill', 'url(#prefixLinearGrad)')
          .attr('stroke', isHighlighted ? '#38bdf8' : '#0284c7')
          .attr('stroke-width', isHighlighted ? 1.8 : 1.2);

        prefixG
          .append('text')
          .attr('text-anchor', 'middle')
          .attr('y', d.prefixMeaning ? -3 : 5)
          .attr('fill', '#38bdf8')
          .attr('font-size', '14px')
          .attr('font-weight', 'bold')
          .attr('font-family', 'ui-monospace, monospace')
          .text(d.prefix);

        if (d.prefixMeaning) {
          prefixG
            .append('text')
            .attr('text-anchor', 'middle')
            .attr('y', 13)
            .attr('fill', '#94a3b8')
            .attr('font-size', '12px')
            .attr('font-family', 'sans-serif')
            .text(d.prefixMeaning.length > 7 ? d.prefixMeaning.slice(0, 6) + '..' : d.prefixMeaning);
        }
      }

      // === Suffix Node (Refined Blue Card matching user image) ===
      if (d.suffix) {
        const suffixG = nodesGroup
          .append('g')
          .attr('transform', `translate(${colSuffixX},${rowY})`)
          .attr('filter', 'url(#soft-shadow)')
          .attr('cursor', 'pointer')
          .on('mouseenter', () => setHoveredWordId(d.id))
          .on('mouseleave', () => setHoveredWordId(null));

        suffixG
          .append('rect')
          .attr('x', -suffixW / 2)
          .attr('y', -suffixH / 2)
          .attr('width', suffixW)
          .attr('height', suffixH)
          .attr('rx', 7)
          .attr('ry', 7)
          .attr('fill', 'url(#suffixLinearGrad)')
          .attr('stroke', isHighlighted ? '#93c5fd' : '#60a5fa')
          .attr('stroke-width', isHighlighted ? 2 : 1.3);

        suffixG
          .append('text')
          .attr('text-anchor', 'middle')
          .attr('y', d.suffixMeaning ? -3 : 5)
          .attr('fill', '#ffffff')
          .attr('font-size', '14px')
          .attr('font-weight', 'bold')
          .attr('font-family', 'ui-monospace, monospace')
          .text(d.suffix);

        if (d.suffixMeaning) {
          suffixG
            .append('text')
            .attr('text-anchor', 'middle')
            .attr('y', 13)
            .attr('fill', '#bfdbfe')
            .attr('font-size', '12px')
            .attr('font-family', 'sans-serif')
            .text(d.suffixMeaning.length > 7 ? d.suffixMeaning.slice(0, 6) + '..' : d.suffixMeaning);
        }
      }

      // === Word Card Node (Compact, Sleek, Interactive) ===
      const wordG = nodesGroup
        .append('g')
        .attr('transform', `translate(${colWordX},${rowY})`)
        .attr('filter', 'url(#soft-shadow)')
        .attr('cursor', 'pointer')
        .on('mouseenter', () => setHoveredWordId(d.id))
        .on('mouseleave', () => setHoveredWordId(null))
        .on('click', () => {
          setSelectedWord(d.wordItem);
          speakWord(d.word);
        });

      // Background rect
      wordG
        .append('rect')
        .attr('x', -wordW / 2)
        .attr('y', -wordH / 2)
        .attr('width', wordW)
        .attr('height', wordH)
        .attr('rx', 8.5)
        .attr('ry', 8.5)
        .attr('fill', isCurrent ? 'url(#wordActiveGrad)' : 'url(#wordLinearGrad)')
        .attr('stroke', isHighlighted ? '#34d399' : isCurrent ? '#818cf8' : '#27272a')
        .attr('stroke-width', isHighlighted ? 2 : isCurrent ? 1.6 : 1);

      // Line 1: Word + Part of speech (Phonetic removed as requested)
      const textGroup = wordG.append('g').attr('transform', `translate(${-wordW / 2 + 12}, 0)`);

      // Word Title (15px)
      textGroup
        .append('text')
        .attr('y', -7)
        .attr('fill', isHighlighted ? '#a7f3d0' : '#ffffff')
        .attr('font-size', '15px')
        .attr('font-weight', 'bold')
        .attr('font-family', 'ui-monospace, monospace')
        .text(d.word);

      // Part of speech only (No phonetic)
      if (d.part_of_speech) {
        textGroup
          .append('text')
          .attr('x', d.word.length * 9.2 + 6)
          .attr('y', -7)
          .attr('fill', '#94a3b8')
          .attr('font-size', '11.5px')
          .attr('font-family', 'ui-monospace, monospace')
          .text(d.part_of_speech);
      }

      // Line 2: Meaning (Chinese font size increased to 13px)
      if (d.meaning) {
        textGroup
          .append('text')
          .attr('y', 13)
          .attr('fill', isHighlighted ? '#34d399' : '#10b981')
          .attr('font-size', '13px')
          .attr('font-weight', '500')
          .attr('font-family', 'sans-serif')
          .text(d.meaning.length > 15 ? d.meaning.slice(0, 14) + '...' : d.meaning);
      }

      // Audio Speaker Button on the right
      const speakerBtn = wordG
        .append('g')
        .attr('transform', `translate(${wordW / 2 - 18}, 0)`)
        .attr('cursor', 'pointer')
        .on('click', (e) => {
          e.stopPropagation();
          speakWord(d.word);
        });

      speakerBtn
        .append('circle')
        .attr('r', 11)
        .attr('fill', isHighlighted ? '#18181b' : '#27272a')
        .attr('stroke', isHighlighted ? '#10b981' : '#3f3f46')
        .attr('stroke-width', 0.8);

      speakerBtn
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('y', 3.5)
        .attr('font-size', '9.5px')
        .text('🔊');
    });

    // Fit Initial View smoothly
    const fitScale = Math.min(1.05, (containerWidth - 20) / graphWidth);
    const initialTransform = d3.zoomIdentity.scale(fitScale).translate(10, 5);
    svg.call(zoom.transform, initialTransform);
  }, [morphologyData, cleanRoot, rootMeaning, currentWordId, hoveredWordId]);

  // Zoom controls
  const handleZoom = (factor: number) => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(200)
      .call(zoomBehaviorRef.current.scaleBy, factor);
  };

  const handleResetZoom = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(250)
      .call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
  };

  return (
    <div className="space-y-2.5">
      {/* Top Diagram Header & Compact Controls */}
      <div className="flex items-center justify-between gap-3 text-xs bg-zinc-900/40 px-3 py-2 rounded-2xl border border-zinc-800/70 flex-wrap">
        <div className="flex items-center gap-2.5">
          <span className="font-semibold text-zinc-200 flex items-center gap-1.5 text-xs">
            <Sparkles size={13} className="text-indigo-400" />
            构词逻辑拓扑流图
          </span>
          <div className="flex items-center gap-2 text-[10px] text-zinc-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-blue-600 inline-block" /> 核心/后缀
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-slate-800 border border-sky-400 inline-block" /> 前缀
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-zinc-950 border border-emerald-500 inline-block" /> 派生单词
            </span>
          </div>
        </div>

        {/* Compact Tool Buttons */}
        <div className="flex items-center gap-1 bg-zinc-950/80 p-0.5 rounded-xl border border-zinc-800">
          <button
            type="button"
            onClick={() => handleZoom(1.15)}
            className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
            title="放大"
          >
            <ZoomIn size={12} />
          </button>
          <button
            type="button"
            onClick={() => handleZoom(0.85)}
            className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
            title="缩小"
          >
            <ZoomOut size={12} />
          </button>
          <button
            type="button"
            onClick={handleResetZoom}
            className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
            title="重置"
          >
            <RotateCcw size={12} />
          </button>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div
        ref={containerRef}
        className="relative bg-zinc-950/95 border border-zinc-800/90 rounded-2xl overflow-hidden shadow-2xl min-h-[280px] flex items-center justify-center"
      >
        <svg ref={svgRef} className="block w-full h-full select-none" />

        {/* Hint text */}
        <div className="absolute bottom-2 left-3 text-[10px] text-zinc-600 font-mono pointer-events-none select-none">
          可平移缩放 · 悬浮高亮链路 · 点击单词发音
        </div>
      </div>

      {/* Selected Word Quick Action Bar */}
      {selectedWord && (
        <div className="p-2.5 px-3.5 bg-zinc-900/80 border border-zinc-800 rounded-2xl flex items-center justify-between gap-3 animate-in fade-in duration-150 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono font-bold text-white text-sm">
              {selectedWord.word}
            </span>
            {selectedWord.phonetic && (
              <span className="text-[11px] text-zinc-500 font-mono">
                {selectedWord.phonetic}
              </span>
            )}
            <span className="text-[11px] text-emerald-400 font-medium truncate max-w-sm">
              {selectedWord.meaning}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => speakWord(selectedWord.word)}
              className="p-1 text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 rounded-full transition-colors"
              title="朗读"
            >
              <Volume2 size={14} />
            </button>
            <button
              type="button"
              onClick={() => onSelectWord(selectedWord)}
              className="px-2.5 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1 active:scale-95"
            >
              <span>切换学习</span>
              <ArrowRight size={11} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
