
import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { SystemModel, Module, FunctionalPoint } from '../types';
import { Network, ArrowRightCircle, Box } from 'lucide-react';

interface FunctionNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  moduleName: string;
  moduleId: string;
  point: FunctionalPoint;
}

interface FunctionLink extends d3.SimulationLinkDatum<FunctionNode> {
  source: any;
  target: any;
}

const FunctionGraph: React.FC<{ model: SystemModel }> = ({ model }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<FunctionNode, undefined> | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const { nodes, links } = useMemo(() => {
    const nodeMap = new Map<string, FunctionNode>();
    const linkList: FunctionLink[] = [];

    const recurse = (mods: Module[]) => {
      mods.forEach(m => {
        (m.functionalPoints || []).forEach(p => {
          nodeMap.set(p.id, {
            id: p.id,
            name: p.name,
            moduleName: m.name,
            moduleId: m.id,
            point: p
          });
        });
        if (m.children) recurse(m.children);
      });
    };
    recurse(model.modules || []);

    nodeMap.forEach(node => {
      (node.point.references || []).forEach(refId => {
        if (nodeMap.has(refId)) {
          linkList.push({ source: node.id, target: refId });
        }
      });
    });

    return { nodes: Array.from(nodeMap.values()), links: linkList };
  }, [model]);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const container = svg.append('g').attr('class', 'main-container');
    const zoom = d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.1, 4]).on('zoom', (event) => container.attr('transform', event.transform));
    svg.call(zoom as any);

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(150).strength(0.5))
      .force('charge', d3.forceManyBody().strength(-150).distanceMax(500))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(90))
      .alphaDecay(0.03) 
      .velocityDecay(0.4);

    simulationRef.current = simulation;

    const defs = svg.append('defs');
    const markerConfig = (id: string, color: string, size: number) => {
      defs.append('marker').attr('id', id).attr('viewBox', '0 -5 10 10').attr('refX', 30).attr('refY', 0).attr('orient', 'auto').attr('markerWidth', size).attr('markerHeight', size)
        .append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', color);
    };

    markerConfig('arrow-default', '#cbd5e1', 6);
    markerConfig('arrow-out', '#3b82f6', 8);
    markerConfig('arrow-in', '#f97316', 8);

    const linkLayer = container.append('g').attr('class', 'link-layer');
    const link = linkLayer.selectAll('.link-path').data(links).enter().append('path').attr('class', 'link-path').attr('fill', 'none').attr('stroke', '#cbd5e1').attr('stroke-width', 2).attr('stroke-dasharray', '8,4').attr('marker-end', 'url(#arrow-default)');

    const nodeLayer = container.append('g').attr('class', 'node-layer');
    const node = nodeLayer.selectAll('.node').data(nodes).enter().append('g').attr('class', 'node')
      .on('mouseenter', (event, d) => setHoveredNodeId(d.id)).on('mouseleave', () => setHoveredNodeId(null))
      .call(d3.drag<any, any>().on('start', (e, d) => { if (!e.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; }).on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; }).on('end', (e, d) => { if (!e.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; }));

    node.append('circle').attr('r', 32).attr('fill', 'transparent').attr('class', 'status-ring');
    node.append('circle').attr('r', 24).attr('fill', 'white').attr('stroke', (d: any) => d3.schemeTableau10[nodes.indexOf(d) % 10]).attr('stroke-width', 2.5).attr('class', 'node-circle shadow-sm');

    const label = node.append('g').attr('class', 'pointer-events-none');
    label.append('text').attr('y', 45).attr('text-anchor', 'middle').attr('class', 'font-black fill-slate-800').style('font-size', '12px').text(d => d.name);
    label.append('text').attr('y', 60).attr('text-anchor', 'middle').attr('class', 'font-bold fill-slate-400').style('font-size', '10px').text(d => d.moduleName);

    simulation.on('tick', () => {
      link.attr('d', (d: any) => `M${d.source.x},${d.source.y}L${d.target.x},${d.target.y}`);
      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    const fitView = () => {
      const bounds = container.node()?.getBBox();
      if (!bounds || bounds.width === 0) return;
      const scale = Math.min(0.9, 0.8 / Math.max(bounds.width / width, bounds.height / height));
      const tx = width / 2 - scale * (bounds.x + bounds.width / 2);
      const ty = height / 2 - scale * (bounds.y + bounds.height / 2);
      svg.transition().duration(1000).call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
    };

    setTimeout(fitView, 1200);

  }, [nodes, links]);

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    if (hoveredNodeId) {
      svg.selectAll('.node').style('opacity', (d: any) => d.id === hoveredNodeId || links.some(l => l.source.id === hoveredNodeId && l.target.id === d.id) || links.some(l => l.target.id === hoveredNodeId && l.source.id === d.id) ? 1 : 0.2);
      svg.selectAll('.status-ring').attr('stroke', (d: any) => { if (d.id === hoveredNodeId) return '#3b82f6'; if (links.some(l => l.source.id === hoveredNodeId && l.target.id === d.id)) return '#60a5fa'; if (links.some(l => l.target.id === hoveredNodeId && l.source.id === d.id)) return '#fb923c'; return 'transparent'; }).attr('stroke-width', 3).attr('stroke-dasharray', '4,2');
      svg.selectAll('.link-path').attr('stroke', (l: any) => { if (l.source.id === hoveredNodeId) return '#3b82f6'; if (l.target.id === hoveredNodeId) return '#f97316'; return '#e2e8f0'; }).attr('stroke-width', (l: any) => (l.source.id === hoveredNodeId || l.target.id === hoveredNodeId) ? 3 : 1).attr('stroke-dasharray', (l: any) => (l.source.id === hoveredNodeId || l.target.id === hoveredNodeId) ? null : '8,4').attr('marker-end', (l: any) => { if (l.source.id === hoveredNodeId) return 'url(#arrow-out)'; if (l.target.id === hoveredNodeId) return 'url(#arrow-in)'; return 'url(#arrow-default)'; }).style('opacity', (l: any) => (l.source.id === hoveredNodeId || l.target.id === hoveredNodeId) ? 1 : 0.1);
    } else {
      svg.selectAll('.node').style('opacity', 1);
      svg.selectAll('.status-ring').attr('stroke', 'transparent');
      svg.selectAll('.link-path').attr('stroke', '#cbd5e1').attr('stroke-width', 2).attr('stroke-dasharray', '8,4').attr('marker-end', 'url(#arrow-default)').style('opacity', 1);
    }
  }, [hoveredNodeId, links]);

  return (
    <div className="relative w-full h-full bg-slate-50 flex flex-col overflow-hidden">
      <div className="absolute top-6 left-6 z-10 pointer-events-none">
        <div className="bg-white/90 backdrop-blur-xl border border-slate-200 p-5 rounded-[2rem] shadow-xl pointer-events-auto max-w-sm">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl"><Network className="w-5 h-5 text-white" /></div>
            <div>
              <h3 className="font-black text-slate-800 uppercase tracking-tight text-sm">功能引用拓扑图</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Dependency Structure</p>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 left-6 z-10 pointer-events-none">
        <div className="bg-white/90 backdrop-blur-xl border border-slate-200 p-5 rounded-[2rem] shadow-xl pointer-events-auto min-w-[200px]">
          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
            <ArrowRightCircle size={12} className="text-blue-500" /> 关系图例
          </h5>
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="w-10 h-0.5 bg-blue-500 rounded-full relative"><div className="absolute -right-1 -top-[3px] border-t-4 border-b-4 border-l-[6px] border-l-blue-500 border-t-transparent border-b-transparent" /></div>
              <span className="text-[11px] font-black text-slate-700">引用的功能 (上游)</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-0.5 bg-orange-500 rounded-full relative"><div className="absolute -right-1 -top-[3px] border-t-4 border-b-4 border-l-[6px] border-l-orange-500 border-t-transparent border-b-transparent" /></div>
              <span className="text-[11px] font-black text-slate-700">被引用的功能 (下游)</span>
            </div>
            <div className="h-px bg-slate-100 my-2" />
            <p className="text-[9px] font-bold text-slate-400">悬停查看节点及其直接调用链路</p>
          </div>
        </div>
      </div>

      <div className="flex-1">
        {nodes.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-6">
            <div className="bg-white p-12 rounded-[4rem] shadow-sm border border-slate-100 flex flex-col items-center max-w-sm text-center">
              <div className="bg-slate-50 p-6 rounded-full mb-6"><Box className="w-12 h-12 text-slate-200" /></div>
              <p className="font-black text-lg text-slate-800 tracking-tight">暂无功能拓扑</p>
              <p className="text-sm text-slate-400 mt-2 font-medium">请在功能模块中建立相互依赖引用关系。</p>
            </div>
          </div>
        ) : (
          <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing"></svg>
        )}
      </div>
    </div>
  );
};

export default FunctionGraph;
