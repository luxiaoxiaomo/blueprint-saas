
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { SystemModel, GapReport } from '../types';

interface GapGraphProps {
  report: GapReport;
  sourceModel: SystemModel;
  targetModel: SystemModel;
}

const GapGraph: React.FC<GapGraphProps> = ({ report, sourceModel, targetModel }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const container = svg.append('g');
    const zoom = d3.zoom<SVGSVGElement, unknown>().on('zoom', (e) => container.attr('transform', e.transform));
    svg.call(zoom as any);

    // Build nodes: Source entities on the left, Target entities on the right
    const nodes: any[] = [];
    
    // Track involved entities from the report
    const involvedSourceEntityNames = new Set(report.entityComparisons.map(ec => ec.sourceEntityName));
    const involvedTargetEntityNames = new Set(report.entityComparisons.map(ec => ec.targetEntityName).filter(Boolean));
    
    const sourceEntitiesToDisplay = sourceModel.entities.filter(e => involvedSourceEntityNames.has(e.name));
    const targetEntitiesToDisplay = targetModel.entities.filter(e => involvedTargetEntityNames.has(e.name));

    sourceEntitiesToDisplay.forEach((e, i) => {
      nodes.push({ id: `s-${e.id}`, name: e.name, type: 'source', x: width * 0.25, y: (i + 1) * (height / (sourceEntitiesToDisplay.length + 1)) });
    });

    targetEntitiesToDisplay.forEach((e, i) => {
      nodes.push({ id: `t-${e.id}`, name: e.name, type: 'target', x: width * 0.75, y: (i + 1) * (height / (targetEntitiesToDisplay.length + 1)) });
    });

    // Build links based on entity comparisons
    const links: any[] = [];
    report.entityComparisons.forEach(ec => {
      const sEnt = sourceModel.entities.find(e => e.name === ec.sourceEntityName);
      const tEnt = targetModel.entities.find(e => e.name === ec.targetEntityName);
      if (sEnt && tEnt) {
        links.push({
          source: `s-${sEnt.id}`,
          target: `t-${tEnt.id}`,
          status: ec.status,
          gapCount: ec.attributeGaps.length
        });
      }
    });

    // Draw link paths
    container.append('g')
      .selectAll('path')
      .data(links)
      .enter().append('path')
      .attr('d', (d: any) => {
        const s = nodes.find(n => n.id === d.source);
        const t = nodes.find(n => n.id === d.target);
        if (!s || !t) return '';
        return d3.linkHorizontal()({ source: [s.x + 80, s.y], target: [t.x - 80, t.y] } as any);
      })
      .attr('fill', 'none')
      .attr('stroke', (d: any) => {
        if (d.status === 'conflict') return '#ef4444';
        if (d.status === 'matched') return '#10b981';
        return '#f59e0b';
      })
      .attr('stroke-width', (d: any) => d.gapCount > 0 ? 3 : 1)
      .attr('stroke-dasharray', (d: any) => d.status === 'conflict' ? '5,5' : '0');

    // Draw node groups
    const nodeGroups = container.append('g')
      .selectAll('g')
      .data(nodes)
      .enter().append('g')
      .attr('transform', d => `translate(${d.x},${d.y})`);

    nodeGroups.append('rect')
      .attr('x', -80)
      .attr('y', -20)
      .attr('width', 160)
      .attr('height', 40)
      .attr('rx', 12)
      .attr('fill', 'white')
      .attr('stroke', d => d.type === 'source' ? '#3b82f6' : '#10b981')
      .attr('stroke-width', 2);

    nodeGroups.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .attr('fill', '#334155')
      .text(d => d.name);

    nodeGroups.append('text')
      .attr('y', -30)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('font-weight', 'black')
      .attr('fill', d => d.type === 'source' ? '#3b82f6' : '#10b981')
      .attr('class', 'uppercase tracking-tighter')
      .text(d => d.type === 'source' ? '发送方实体' : '接收方实体');

  }, [report, sourceModel, targetModel]);

  return <svg ref={svgRef} className="w-full h-full bg-slate-50/20" />;
};

export default GapGraph;
