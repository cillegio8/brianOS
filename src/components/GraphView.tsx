'use client';

import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';

// Extend D3's SimulationNodeDatum to include our custom properties
export interface SimulationNode extends d3.SimulationNodeDatum {
  id: string;
  type: 'person' | 'project' | 'week';
  frequency: number;
  status?: 'active' | 'done' | 'stalled';
}

// Update Link to use SimulationLinkDatum with correct typing
export interface Link extends d3.SimulationLinkDatum<SimulationNode> {
  strength: number;
}

interface GraphData {
  nodes: SimulationNode[];
  links: Link[];
}

interface GraphViewProps {
  data: GraphData;
  onNodeClick: (node: SimulationNode) => void;
}

const GraphView: React.FC<GraphViewProps> = ({ data, onNodeClick }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const gRef = useRef<SVGGElement | null>(null);
  const [simulation, setSimulation] = useState<d3.Simulation<SimulationNode, Link> | null>(null);

  // Initialize simulation and graphics
  useEffect(() => {
    if (!svgRef.current) return;
    
    const width = window.innerWidth * 0.9;
    const height = window.innerHeight * 0.8;
    
    // Create SVG element
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .call(d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 4])
        .on('zoom', (event) => {
          if (gRef.current) {
            d3.select(gRef.current).attr('transform', event.transform);
          }
        })
      );
    
    // Clear previous graphics
    svg.selectAll('g').remove();
    gRef.current = svg.append('g').node();

    // Create force simulation
    const newSimulation = d3.forceSimulation<SimulationNode, Link>(data.nodes)
      .force('link', d3.forceLink<SimulationNode>().id(d => d.id).distance(150))
      .force('charge', d3.forceManyBody<SimulationNode>().strength(-400))
      .force('center', d3.forceCenter<SimulationNode>(width / 2, height / 2));
    
    setSimulation(newSimulation);
    
    // Draw links
    const linkGroup = d3.select(gRef.current)
      .selectAll('line')
      .data(data.links)
      .join('line');
    
    linkGroup
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', d => Math.sqrt(d.strength * 2 + 1));
    
    // Draw nodes
    const nodeGroup = d3.select(gRef.current)
      .selectAll('g.nodes')
      .data(data.nodes)
      .join('g');
    
    // Add drag behavior to nodes
    nodeGroup
      .call(d3.drag<SVGGElement, SimulationNode>()
        .on('start', (event, d) => {
          if (newSimulation) {
            if (!event.active) newSimulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          }
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (newSimulation) {
            if (!event.active) newSimulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }
        })
      );
    
    // Node visuals
    nodeGroup.selectAll('circle')
      .data(data.nodes, d => d.id)
      .join('circle')
      .attr('r', d => Math.max(8, Math.log(d.frequency + 1) * 5))
      .attr('fill', d => {
        if (d.type === 'project') {
          if (d.status === 'done') return '#28a745';
          if (d.status === 'active') return '#0366d6';
          return '#e67e22';
        }
        return d.type === 'person' ? '#6f42c1' : '#17a2b8';
      })
      .on('click', (event, d) => {
        event.stopPropagation();
        onNodeClick(d);
      });
    
    // Add labels
    nodeGroup.selectAll('text')
      .data(data.nodes, d => d.id)
      .join('text')
      .attr('x', 10)
      .attr('y', 4)
      .attr('fill', '#333')
      .text(d => d.id)
      .style('pointer-events', 'none')
      .attr('font-size', '12px');
    
    // Position updates
    if (simulation) {
      simulation.stop();
    }
    newSimulation.on('tick', () => {
      linkGroup
        .attr('x1', d => d.source?.x || 0)
        .attr('y1', d => d.source?.y || 0)
        .attr('x2', d => d.target?.x || 0)
        .attr('y2', d => d.target?.y || 0);
      
      nodeGroup.attr('transform', d => `translate(${d.x},${d.y})`);
    });
    
    setSimulation(newSimulation);
    
    // Cleanup
    return () => {
      if (newSimulation) newSimulation.stop();
    };
  }, [data, onNodeClick]);
  
  // Initial drawing effect
  useEffect(() => {
    if (!gRef.current) return;
    
    // Update links with new data
    const linkGroup = d3.select(gRef.current).selectAll('line');
    linkGroup
      .attr('stroke-width', d => d.strength);
    
    // Update node positions with animation
    const nodeGroup = d3.select(gRef.current).selectAll('circle');
    nodeGroup.attr('r', d => d.frequency);
    
  }, [data.links, data.nodes]);  

  return <svg ref={svgRef} style={{ width: '100%', height: '80vh' }} />;
};

export default GraphView;