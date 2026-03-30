import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';

// Extend D3's SimulationNodeDatum to include our custom properties
export interface SimulationNode extends d3.SimulationNodeDatum {
  id: string;
  type: 'person' | 'project' | 'week';
  frequency: number;
  status?: string;
}

// Update Link to use SimulationLinkDatum with correct typing
interface Link extends d3.SimulationLinkDatum<SimulationNode> {
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
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const width = window.innerWidth * 0.9;
    const height = window.innerHeight * 0.8;

    svg.attr('width', width).attr('height', height);

    // Clear previous content
    svg.selectAll('*').remove();

    // Create zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.1, 4]).on('zoom', (event) => {
      g.attr('transform', event.transform);
    });
    
    svg.call(zoom);

    const g = svg.append('g');

    // Create force simulation
    const simulation = d3.forceSimulation<SimulationNode, Link>(data.nodes)
      .force('link', d3.forceLink<Link, SimulationNode>().id(d => d.id).distance(150))
      .force('charge', d3.forceManyBody<SimulationNode>().strength(-400))
      .force('center', d3.forceCenter<SimulationNode>(width / 2, height / 2));

    // Draw links
    const link = g.append('g')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .selectAll('line')
      .data(data.links)
      .join('line')
      .attr('stroke-width', d => Math.sqrt(d.strength * 2 + 1));

    // Draw nodes
    const node = g.append('g')
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .selectAll('g')
      .data(data.nodes)
      .join('g')
      .call(drag(simulation));

    // Create node shapes and colors
    node.append('circle')
      .attr('r', d => Math.max(8, Math.log(d.frequency + 1) * 5))
      .attr('fill', d => {
        if (d.type === 'project') {
          return d.status === 'done' ? '#28a745' : d.status === 'active' ? '#0366d6' : '#e67e22';
        }
        return d.type === 'person' ? '#6f42c1' : '#17a2b8';
      })
      .on('click', (event, d) => {
        event.stopPropagation();
        onNodeClick(d);
      });

    // Add labels
    node.append('text')
      .attr('x', 10)
      .attr('y', 4)
      .attr('fill', '#333')
      .text(d => d.id)
      .style('pointer-events', 'none')
      .attr('font-size', '12px');

    // Handle dragging
    function drag(simulation: d3.Simulation<SimulationNode, Link>) {
      return d3.drag<SVGGElement, SimulationNode>()
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
        });
    }

    // Update positions on each tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x || 0)
        .attr('y1', d => d.source.y || 0)
        .attr('x2', d => d.target.x || 0)
        .attr('y2', d => d.target.y || 0);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [data, onNodeClick]);

  return <svg ref={svgRef} style={{ width: '100%', height: '80vh' }} />;
};

export default GraphView;