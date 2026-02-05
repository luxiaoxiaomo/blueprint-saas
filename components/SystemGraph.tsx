
import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { SystemModel, Entity, RelationType, Module, GraphNode, GraphLink, FunctionalPoint } from '../types';
import { Zap, History, RefreshCcw, UserCheck, ChevronDown, ChevronRight, Database, LayoutGrid, Box, X, Maximize2, Minimize2, Layers, MousePointer2, Filter, Search, CheckSquare, Square, ChevronUp, CheckCircle2, Focus } from 'lucide-react';

const ATTR_HEIGHT = 28;
const NODE_WIDTH = 180;
const HEADER_HEIGHT = 48;
const CARDINALITY_OFFSET = 60; 

const KEY_PATH = "M7 11a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 8a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm14.7-13.3a1 1 0 0 0-1.4 0L12.4 13.6a7 7 0 0 0-1.8-1.1l7-7 1.4 1.4-1.4 1.4 1.4 1.4-1.4-1.4 1.4 1.4-2.8 2.8-1.4-1.4-1.4 1.4 2.8 2.8z";

interface SystemGraphProps {
  model: SystemModel;
  onDeletePoint: (pointId: string) => void;
  initialModuleId: string | null;
  initialPointId: string | null;
  onSceneSelect: (moduleId: string | null, pointId: string | null) => void;
  selectedModuleIds: Set<string>;
  setSelectedModuleIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  selectedPointIds: Set<string>;
  setSelectedPointIds: React.Dispatch<React.SetStateAction<Set<string>>>;
}

const SystemGraph: React.FC<SystemGraphProps> = ({ 
  model, 
  selectedModuleIds,
  setSelectedModuleIds,
  selectedPointIds,
  setSelectedPointIds
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, undefined> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const lastNodesRef = useRef<GraphNode[]>([]);
  
  const [expandedEntityIds, setExpandedEntityIds] = useState<Set<string>>(new Set());
  const [highlightedLinkId, setHighlightedLinkId] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(true);
  const [isLegendOpen, setIsLegendOpen] = useState(true);
  const [filterSearch, setFilterSearch] = useState('');

  const legendItems = [
    { type: 'Realtime', label: '实时关联', color: '#1d4ed8', dark: '#1e3a8a', light: '#dbeafe', icon: Zap, dash: '0' },
    { type: 'Snapshot', label: '数据快照', color: '#c2410c', dark: '#7c2d12', light: '#ffedd5', icon: History, dash: '6,3' },
    { type: 'Async', label: '异步同步', color: '#6d28d9', dark: '#4c1d95', light: '#f3e8ff', icon: RefreshCcw, dash: '6,3' },
    { type: 'InitialEditable', label: '初始带出', color: '#15803d', dark: '#064e3b', light: '#dcfce7', icon: UserCheck, dash: '0' },
  ];

  const flattenedModules = useMemo(() => {
    const list: Module[] = [];
    const recurse = (mods: Module[]) => {
      if (!mods || !Array.isArray(mods)) return;
      mods.forEach(m => {
        list.push(m);
        if (m.children) recurse(m.children);
      });
    };
    recurse(model?.modules || []);
    return list;
  }, [model?.modules]);

  const allPointIds = useMemo(() => 
    flattenedModules.flatMap(m => (m.functionalPoints || []).map(p => p.id))
  , [flattenedModules]);

  const { filteredNodes, filteredLinks } = useMemo(() => {
    const isAllSelected = selectedPointIds.size === allPointIds.length && allPointIds.length > 0;
    const showAll = (selectedPointIds.size === 0 && selectedModuleIds.size === 0) || isAllSelected;
    
    const allInvolvedPoints = new Set<string>();
    selectedPointIds.forEach(id => allInvolvedPoints.add(id));
    
    const combinedEntityIds = showAll 
      ? new Set((model?.entities || []).map(e => e.id))
      : new Set(flattenedModules
          .flatMap(m => m.functionalPoints || [])
          .filter(p => allInvolvedPoints.has(p.id))
          .flatMap(p => [
            ...(p.involvedAttributes || []).map(ia => ia.entityId),
            ...(p.entityUsages || []).map(u => u.entityId)
          ])
        );
    
    const nodes: GraphNode[] = (model?.entities || []).filter(e => combinedEntityIds.has(e.id)).map(e => {
        const existing = lastNodesRef.current.find(prev => prev.id === e.id);
        return { 
            id: e.id, 
            name: e.name, 
            entity: e,
            x: existing?.x,
            y: existing?.y,
            fx: existing?.fx,
            fy: existing?.fy
        };
    });

    const rawLinks: any[] = [];
    (model?.entities || []).forEach(entity => {
      if (!combinedEntityIds.has(entity.id)) return;
      (entity.attributes || []).forEach(attr => {
        if (attr.isRelation && attr.relations && attr.relations.length > 0) {
          attr.relations.forEach(rel => {
            if (rel.relatedEntityId && combinedEntityIds.has(rel.relatedEntityId)) {
              const shouldShow = showAll || (rel.functionalPointId && allInvolvedPoints.has(rel.functionalPointId));
              if (shouldShow) {
                rawLinks.push({
                  id: `${entity.id}-${attr.id}-${rel.relatedEntityId}-${rel.id}`,
                  source: entity.id, 
                  target: rel.relatedEntityId, 
                  type: rel.relationType || 'Realtime',
                  cardinality: rel.cardinality || '1:1', 
                  label: attr.name, 
                  sourceAttrId: attr.id,
                  targetAttrId: rel.relatedAttributeId
                });
              }
            }
          });
        }
      });
    });

    const linkGroups: Record<string, any[]> = {};
    rawLinks.forEach(link => {
      const pair = [link.source, link.target].sort().join('-');
      if (!linkGroups[pair]) linkGroups[pair] = [];
      link.linkIndex = linkGroups[pair].length; 
      linkGroups[pair].push(link);
    });
    rawLinks.forEach(link => { 
      const pair = [link.source, link.target].sort().join('-'); 
      link.linkCount = linkGroups[pair].length; 
    });

    lastNodesRef.current = nodes;
    return { filteredNodes: nodes, filteredLinks: rawLinks };
  }, [model, selectedPointIds, selectedModuleIds, flattenedModules, allPointIds]);

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    let container = svg.select<SVGGElement>('.main-container');
    if (container.empty()) {
      container = svg.append('g').attr('class', 'main-container');
      const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 4])
        .on('zoom', (event) => container.attr('transform', event.transform));
      svg.call(zoom as any);
      zoomRef.current = zoom;

      const defs = svg.append('defs');
      legendItems.forEach(item => {
        defs.append('marker')
          .attr('id', `arrowhead-highlight-${item.type}`)
          .attr('viewBox', '0 -5 10 10').attr('refX', 9).attr('refY', 0).attr('orient', 'auto')
          .attr('markerWidth', 6).attr('markerHeight', 6).append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', item.dark);
      });
      defs.append('marker')
        .attr('id', 'arrowhead').attr('viewBox', '0 -5 10 10').attr('refX', 9).attr('refY', 0).attr('orient', 'auto')
        .attr('markerWidth', 5).attr('markerHeight', 5).append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', '#94a3b8');

      container.append('g').attr('class', 'links-layer');
      container.append('g').attr('class', 'labels-layer');
      container.append('g').attr('class', 'nodes-layer');
    }

    if (!simulationRef.current) {
      simulationRef.current = d3.forceSimulation<GraphNode>()
        .force('link', d3.forceLink().id((d: any) => d.id).distance(220).strength(0.3))
        .force('charge', d3.forceManyBody().strength(-800))
        .force('center', d3.forceCenter(width / 2, height / 2).strength(0.02))
        .force('collision', d3.forceCollide().radius(110).strength(0.7)); 
    }

    const sim = simulationRef.current;
    sim.nodes(filteredNodes);
    (sim.force('link') as d3.ForceLink<GraphNode, any>).links(filteredLinks);
    sim.alpha(0.3).restart();

    const nodesLayer = container.select('.nodes-layer');
    const node = nodesLayer.selectAll<SVGGElement, GraphNode>('.node')
      .data(filteredNodes, d => d.id)
      .join(
        enter => {
          const g = enter.append('g').attr('class', 'node').style('cursor', 'pointer');
          g.append('rect').attr('class', 'node-bg shadow-sm').attr('width', NODE_WIDTH).attr('rx', 12).attr('fill', 'white');
          const header = g.append('g').attr('class', 'node-header');
          header.append('rect').attr('width', NODE_WIDTH).attr('height', HEADER_HEIGHT).attr('rx', 12).attr('fill', 'transparent');
          header.append('text').attr('class', 'node-title').attr('x', 16).attr('y', 28).attr('font-weight', '800').attr('font-size', '13px');
          g.append('foreignObject').attr('class', 'node-attr-container').attr('x', 0).attr('y', HEADER_HEIGHT).attr('width', NODE_WIDTH).style('pointer-events', 'auto')
            .append('xhtml:div').attr('class', 'attr-list flex flex-col px-2 pb-2');
          
          header.on('click', (event, d: any) => {
            event.stopPropagation();
            setExpandedEntityIds(prev => {
              const next = new Set(prev);
              const isExpanding = !next.has(d.id);
              if (isExpanding) {
                next.add(d.id);
                d.fx = d.x; d.fy = d.y;
              } else {
                next.delete(d.id);
                d.fx = null; d.fy = null;
                setHighlightedLinkId(current => {
                  if (!current) return null;
                  const link = filteredLinks.find(l => l.id === current);
                  if (link && (link.source.id === d.id || link.target.id === d.id)) {
                    return null;
                  }
                  return current;
                });
              }
              return next;
            });
            sim.alpha(0.01).restart();
          });

          g.call(d3.drag<any, any>()
            .on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.1).restart(); d.fx = d.x; d.fy = d.y; })
            .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
            .on('end', (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = d.x; d.fy = d.y; }));
          
          return g;
        }
      );

    const linksLayer = container.select('.links-layer');
    const linkPath = linksLayer.selectAll<SVGPathElement, GraphLink>('.link-line')
      .data(filteredLinks, d => d.id)
      .join(enter => enter.append('path').attr('class', 'link-line').attr('fill', 'none').style('cursor', 'pointer'));

    const labelsLayer = container.select('.labels-layer');
    const cardStart = labelsLayer.selectAll<SVGTextElement, GraphLink>('.card-start')
      .data(filteredLinks, d => d.id)
      .join(enter => enter.append('text').attr('class', 'card-start').attr('font-size', '10px').attr('font-weight', '900').attr('paint-order', 'stroke').attr('stroke', 'white').attr('stroke-width', '3px').attr('text-anchor', 'middle'));
    
    const cardEnd = labelsLayer.selectAll<SVGTextElement, GraphLink>('.card-end')
      .data(filteredLinks, d => d.id)
      .join(enter => enter.append('text').attr('class', 'card-end').attr('font-size', '10px').attr('font-weight', '900').attr('paint-order', 'stroke').attr('stroke', 'white').attr('stroke-width', '3px').attr('text-anchor', 'middle'));

    sim.on('tick', () => {
      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
      
      linkPath.attr('d', (d: any) => { 
        const sExpanded = expandedEntityIds.has(d.source.id); 
        const tExpanded = expandedEntityIds.has(d.target.id); 
        
        let sIdealX = d.source.x + NODE_WIDTH / 2;
        let sIdealY = d.source.y + HEADER_HEIGHT / 2;
        let tIdealX = d.target.x + NODE_WIDTH / 2;
        let tIdealY = d.target.y + HEADER_HEIGHT / 2;

        if (sExpanded && d.sourceAttrId) { 
          const idx = (d.source.entity.attributes || []).findIndex((a: any) => a.id === d.sourceAttrId); 
          if (idx !== -1) sIdealY = d.source.y + HEADER_HEIGHT + idx * ATTR_HEIGHT + ATTR_HEIGHT / 2; 
        } 
        if (tExpanded && d.targetAttrId) { 
          const idx = (d.target.entity.attributes || []).findIndex((a: any) => a.id === d.targetAttrId); 
          if (idx !== -1) tIdealY = d.target.y + HEADER_HEIGHT + idx * ATTR_HEIGHT + ATTR_HEIGHT / 2; 
        }

        const sX = tIdealX > sIdealX ? d.source.x + NODE_WIDTH : d.source.x;
        const sY = sIdealY;
        const tX = sIdealX > tIdealX ? d.target.x + NODE_WIDTH : d.target.x;
        const tY = tIdealY;

        const dx = tX - sX, dy = tY - sY, dist = Math.sqrt(dx * dx + dy * dy) || 1; 
        if (d.linkCount > 1) { 
          const midX = (sX + tX) / 2, midY = (sY + tY) / 2, curve = 30 * (d.linkIndex - (d.linkCount - 1) / 2), cpX = midX - (dy / dist) * curve, cpY = midY + (dx / dist) * curve; 
          return `M${sX},${sY} Q${cpX},${cpY} ${tX},${tY}`; 
        } 
        return `M${sX},${sY} L${tX},${tY}`; 
      });

      cardStart.each(function(d: any, i: number) {
        const p = linkPath.nodes().find(n => (d3.select(n).datum() as any).id === d.id);
        if (!p) return;
        try { const tL = p.getTotalLength(); if (tL > 0) { const pt = p.getPointAtLength(Math.min(tL * 0.2, CARDINALITY_OFFSET)); d3.select(this).attr('x', pt.x).attr('y', pt.y - 8).text(d.cardinality.split(':')[0]); } } catch (e) { }
      });

      cardEnd.each(function(d: any, i: number) {
        const p = linkPath.nodes().find(n => (d3.select(n).datum() as any).id === d.id);
        if (!p) return;
        try { const tL = p.getTotalLength(); if (tL > 0) { const pt = p.getPointAtLength(tL - Math.min(tL * 0.2, CARDINALITY_OFFSET)); d3.select(this).attr('x', pt.x).attr('y', pt.y - 8).text(d.cardinality.split(':')[1]); } } catch (e) { }
      });
    });

  }, [filteredNodes, filteredLinks, expandedEntityIds]);

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    
    svg.selectAll<SVGGElement, GraphNode>('.node').each(function(d) {
      const isExpanded = expandedEntityIds.has(d.id);
      const nodeG = d3.select(this);
      
      nodeG.select('.node-bg')
        .attr('height', isExpanded ? HEADER_HEIGHT + (d.entity.attributes || []).length * ATTR_HEIGHT + 8 : HEADER_HEIGHT)
        .attr('stroke', isExpanded ? '#3b82f6' : '#e2e8f0')
        .attr('stroke-width', isExpanded ? 2 : 1)
        .attr('fill', 'white');
      
      nodeG.select('.node-title').attr('fill', isExpanded ? '#1e40af' : '#334155').text(d.name);

      const foreign = nodeG.select<SVGForeignObjectElement>('.node-attr-container')
        .attr('height', isExpanded ? (d.entity.attributes || []).length * ATTR_HEIGHT + 10 : 0);
      
      const attrList = foreign.select('.attr-list');
      attrList.selectAll('div').remove();

      if (isExpanded) {
        attrList.selectAll('div').data(d.entity.attributes || []).enter().append('xhtml:div')
          .attr('class', (a: any) => { 
            const link = highlightedLinkId ? filteredLinks.find(l => l.id === highlightedLinkId) : null; 
            const isP = link && (link.source.id === d.id && link.sourceAttrId === a.id); 
            const isS = link && (link.target.id === d.id && link.targetAttrId === a.id); 
            const base = "flex items-center justify-between px-2 rounded-lg mb-1 h-[24px] cursor-pointer transition-all border "; 
            if (isP) return base + "text-white shadow-md font-black"; 
            if (isS) return base + "shadow-sm font-bold"; 
            return base + (a.isRelation ? 'bg-blue-50/50 border-blue-100/50 hover:bg-blue-100 hover:border-blue-200' : 'bg-transparent border-transparent'); 
          })
          .style('background-color', (a: any) => { 
            const link = highlightedLinkId ? filteredLinks.find(l => l.id === highlightedLinkId) : null; 
            if (link && link.source.id === d.id && link.sourceAttrId === a.id) return legendItems.find(it => it.type === link.type)?.dark || '#1e293b'; 
            if (link && link.target.id === d.id && link.targetAttrId === a.id) return legendItems.find(it => it.type === link.type)?.light || '#f1f5f9'; 
            return null; 
          })
          .style('color', (a: any) => { 
            const link = highlightedLinkId ? filteredLinks.find(l => l.id === highlightedLinkId) : null; 
            if (link && link.source.id === d.id && link.sourceAttrId === a.id) return '#ffffff'; 
            if (link && link.target.id === d.id && link.targetAttrId === a.id) return legendItems.find(it => it.type === link.type)?.color || '#1e293b'; 
            return null; 
          })
          .on('click', (event, a: any) => { 
            event.stopPropagation(); 
            if (!a.isRelation) return; 
            const link = filteredLinks.find(l => (l.source.id === d.id && l.sourceAttrId === a.id)); 
            if (link) { 
              setHighlightedLinkId(prev => prev === link.id ? null : link.id); 
              if (link.target.id && !expandedEntityIds.has(link.target.id)) setExpandedEntityIds(prev => new Set([...prev, link.target.id])); 
            } 
          })
          .html((a: any) => `<div class="flex items-center gap-1.5 overflow-hidden">${a.isUnique ? `<span class="flex items-center"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="${KEY_PATH}"/></svg></span>` : ''}${a.isRelation ? '<span class="flex items-center"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></span>' : ''}<span class="text-[10px] font-bold truncate">${a.name}</span></div><span class="text-[8px] font-black uppercase opacity-60">${(a.type || '').slice(0, 2)}</span>`);
      }
    });

    svg.selectAll<SVGPathElement, GraphLink>('.link-line')
      .attr('stroke', (d: any) => { 
        const item = legendItems.find(i => i.type === d.type); 
        return d.id === highlightedLinkId ? (item?.dark || '#1e293b') : (item?.color || '#94a3b8'); 
      })
      .attr('stroke-width', (d: any) => d.id === highlightedLinkId ? 4 : 2)
      .attr('stroke-dasharray', (d: any) => {
        const item = legendItems.find(i => i.type === d.type);
        return (item?.dash === '0') ? null : item?.dash;
      })
      .attr('marker-end', (d: any) => d.id === highlightedLinkId ? `url(#arrowhead-highlight-${d.type})` : 'url(#arrowhead)');

    svg.selectAll('.card-start').attr('fill', (d: any) => highlightedLinkId === d.id ? (legendItems.find(i => i.type === d.type)?.dark || '#1e293b') : '#64748b');
    svg.selectAll('.card-end').attr('fill', (d: any) => highlightedLinkId === d.id ? (legendItems.find(i => i.type === d.type)?.dark || '#1e293b') : '#64748b');

    if (simulationRef.current) {
      simulationRef.current.force('collision', d3.forceCollide().radius((d: any) => expandedEntityIds.has(d.id) ? 140 : 110));
      simulationRef.current.alpha(0.01).restart();
    }
  }, [expandedEntityIds, highlightedLinkId, filteredLinks]);

  const handleExpandAll = () => {
    filteredNodes.forEach(n => { n.fx = n.x; n.fy = n.y; });
    setExpandedEntityIds(new Set(filteredNodes.map(n => n.id)));
  };
  
  const handleCollapseAll = () => {
    filteredNodes.forEach(n => { n.fx = null; n.fy = null; });
    setExpandedEntityIds(new Set());
    setHighlightedLinkId(null);
    if (simulationRef.current) simulationRef.current.alpha(0.3).restart();
  };

  const handleConvergeAndOverview = () => {
    if (!simulationRef.current || !svgRef.current || !zoomRef.current) return;
    
    const sim = simulationRef.current;
    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // 1. 解锁所有节点坐标
    filteredNodes.forEach(n => { n.fx = null; n.fy = null; });
    
    const linkForce = sim.force('link') as d3.ForceLink<GraphNode, any>;
    const chargeForce = sim.force('charge') as d3.ForceManyBody<GraphNode>;
    const centerForce = sim.force('center') as d3.ForceCenter<GraphNode>;
    const collisionForce = sim.force('collision') as d3.ForceCollide<GraphNode>;

    // 2. 强力聚合策略
    // 设置连接力距离为 0，且强度拉满，吸引关联节点
    linkForce.distance(0).strength(0.4); 
    // 将电荷力设为正值 (200)，将其从“排斥”变为“吸引”，确保零散节点也能被吸入集群
    chargeForce.strength(200).distanceMax(2000); 
    // 极大增强中心引力，将所有漂浮节点暴力拉回视口中心
    centerForce.strength(0.85).x(width / 2).y(height / 2);
    // 精确设定碰撞半径：180 宽的卡片 (半径 90) + 20px 间距 (半径 10) = 100
    // 这样当节点被吸引到极限时，会自动停留在 20px 的位置
    collisionForce.radius(100).strength(1);
    
    // 设置更缓慢的衰减，给予物理引擎足够的时间处理孤立节点的移动
    sim.alphaDecay(0.01).alpha(1).restart();

    // 3. 相机平滑拉远
    const scale = 0.35; 
    const transform = d3.zoomIdentity
      .translate(width / 2, height / 2) 
      .scale(scale) 
      .translate(-width / 2, -height / 2); 
    
    svg.transition()
      .duration(2000)
      .ease(d3.easeCubicInOut)
      .call(zoomRef.current.transform, transform);

    // 4. 4秒后逐渐恢复正常的系统蓝图布局参数
    setTimeout(() => {
      sim.alphaDecay(0.0228); // 恢复默认衰减
      linkForce.distance(220).strength(0.3);
      chargeForce.strength(-800);
      centerForce.strength(0.02);
      collisionForce.radius(110);
      sim.alpha(0.3).restart();
    }, 4500);
  };

  const selectAllPoints = () => {
    setSelectedPointIds(new Set(allPointIds));
    setSelectedModuleIds(new Set(flattenedModules.map(m => m.id)));
  };

  const clearAllPoints = () => {
    setSelectedPointIds(new Set());
    setSelectedModuleIds(new Set());
  };

  const toggleModule = (module: Module) => {
    const pointIds = flattenedModules.filter(m => m.id === module.id || (module.children || []).some(c => c.id === m.id)).flatMap(m => (m.functionalPoints || []).map(p => p.id));
    const nextModules = new Set(selectedModuleIds);
    const nextPoints = new Set(selectedPointIds);
    if (nextModules.has(module.id)) {
      nextModules.delete(module.id);
      pointIds.forEach(id => nextPoints.delete(id));
    } else {
      nextModules.add(module.id);
      pointIds.forEach(id => nextPoints.add(id));
    }
    setSelectedModuleIds(nextModules);
    setSelectedPointIds(nextPoints);
  };

  const togglePoint = (pointId: string) => {
    const next = new Set(selectedPointIds);
    if (next.has(pointId)) next.delete(pointId);
    else next.add(pointId);
    setSelectedPointIds(next);
  };

  const renderFilterTree = (mods: Module[], depth = 0) => {
    return mods.filter(m => filterSearch === '' || m.name.includes(filterSearch) || (m.functionalPoints || []).some(p => p.name.includes(filterSearch))).map(m => {
      const isSelected = selectedModuleIds.has(m.id);
      const mPoints = (m.functionalPoints || []).map(p => p.id);
      const hasPartialPoints = mPoints.some(id => selectedPointIds.has(id));
      return (
        <div key={m.id} className="space-y-1">
          <div onClick={() => toggleModule(m)} className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-all ${isSelected ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-600'}`} style={{ marginLeft: `${depth * 12}px` }}>
            {isSelected ? <CheckSquare size={16} className="text-blue-600" /> : (hasPartialPoints ? <CheckSquare size={16} className="text-blue-300" /> : <Square size={16} className="text-slate-300" />)}
            <span className="text-xs font-black truncate">{m.name}</span>
          </div>
          {(m.functionalPoints || []).filter(p => filterSearch === '' || p.name.includes(filterSearch)).map(p => (
            <div key={p.id} onClick={() => togglePoint(p.id)} className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-all ${selectedPointIds.has(p.id) ? 'bg-orange-50 text-orange-700' : 'hover:bg-slate-50 text-slate-500'}`} style={{ marginLeft: `${(depth + 1) * 12 + 8}px` }}>
              {selectedPointIds.has(p.id) ? <CheckSquare size={14} className="text-orange-600" /> : <Square size={14} className="text-slate-300" />}
              <span className="text-[11px] font-bold truncate">{p.name}</span>
            </div>
          ))}
          {m.children && m.children.length > 0 && renderFilterTree(m.children, depth + 1)}
        </div>
      );
    });
  };

  return (
    <div className="w-full h-full relative overflow-hidden bg-slate-50/50">
      <div className="absolute top-6 left-6 z-10 flex flex-col gap-4">
        <div className="bg-white/95 backdrop-blur-xl border border-slate-200 p-5 rounded-[2.5rem] shadow-xl max-w-sm flex flex-col">
           <div className="flex items-center justify-between mb-4">
             <div className="flex items-center gap-3">
               <div className="bg-blue-600 p-2.5 rounded-2xl shadow-lg shadow-blue-100"><Layers className="w-5 h-5 text-white" /></div>
               <div>
                 <h3 className="font-black text-slate-800 uppercase tracking-tight text-sm">场景筛选器</h3>
                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Blueprint Filter</p>
               </div>
             </div>
             <button onClick={() => setIsFilterOpen(!isFilterOpen)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
               {isFilterOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
             </button>
           </div>
           {isFilterOpen && (
             <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
               <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="text" value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)} placeholder="搜索模块或场景..." className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:ring-4 focus:ring-blue-100 transition-all" /></div>
               <div className="max-h-80 overflow-y-auto pr-2 space-y-1 scrollbar-thin">{renderFilterTree(model.modules)}</div>
               <div className="pt-2 flex gap-2">
                 <button onClick={clearAllPoints} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase transition-all">重置筛选</button>
                 <button onClick={selectAllPoints} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase transition-all shadow-lg shadow-blue-100">全选</button>
               </div>
             </div>
           )}
        </div>
      </div>
      <div className="absolute top-6 right-6 z-10 flex gap-4">
        <div className="bg-white/90 backdrop-blur-xl border border-slate-200 p-3 rounded-2xl shadow-xl flex gap-2">
           <button onClick={handleConvergeAndOverview} className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400 hover:text-blue-600 active:scale-95" title="聚合并概览全局"><Focus size={18} /></button>
           <div className="w-px h-4 bg-slate-100 self-center mx-1" />
           <button onClick={handleExpandAll} className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400 hover:text-blue-600" title="展开所有实体"><Maximize2 size={18} /></button>
           <button onClick={handleCollapseAll} className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400 hover:text-blue-600" title="收起所有实体"><Minimize2 size={18} /></button>
        </div>
      </div>
      <div className="absolute bottom-6 right-6 z-10">
        <div className="bg-white/90 backdrop-blur-xl border border-slate-200 p-4 rounded-[2rem] shadow-xl min-w-[200px] flex flex-col gap-3">
          <div onClick={() => setIsLegendOpen(!isLegendOpen)} className="flex items-center justify-between cursor-pointer group">
            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><MousePointer2 size={12} className="text-blue-500" /> 关系图例</h5>
            <div className="text-slate-300 group-hover:text-blue-500 transition-colors">{isLegendOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}</div>
          </div>
          {isLegendOpen && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
              {legendItems.map(item => (
                <div key={item.type} className="flex items-center gap-3">
                  <div className="w-10 h-0.5 relative" style={{ background: item.dash === '0' ? item.color : 'transparent' }}>
                    {item.dash !== '0' && <div className="absolute inset-0 flex gap-1"><div className="h-full w-2" style={{ background: item.color }} /><div className="h-full w-2" style={{ background: item.color }} /><div className="h-full w-2" style={{ background: item.color }} /></div>}
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 border-t-[4px] border-b-[4px] border-l-[6px] border-t-transparent border-b-transparent" style={{ borderLeftColor: item.color }} />
                  </div>
                  <span className="text-[11px] font-black text-slate-700">{item.label}</span>
                </div>
              ))}
              <div className="pt-2 border-t border-slate-100"><p className="text-[9px] text-slate-400 font-bold leading-relaxed italic">* 虚线表示非硬性耦合的逻辑依赖<br/>* 实线表示强关联的实时引用</p></div>
            </div>
          )}
        </div>
      </div>
      {filteredNodes.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-slate-300">
           <LayoutGrid size={64} className="opacity-10 mb-6" />
           <p className="font-black text-sm uppercase tracking-widest text-center px-10 leading-loose">当前筛选条件下无关联实体<br/><span className="text-xs font-bold opacity-60">请尝试在左上角调整筛选范围或重置</span></p>
           <button onClick={selectAllPoints} className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">显示全部资产</button>
        </div>
      ) : (
        <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
      )}
    </div>
  );
};

export default SystemGraph;
