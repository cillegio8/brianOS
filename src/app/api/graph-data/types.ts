import * as d3 from 'd3';

// Type definitions for our graph data
export interface SimulationNode extends d3.SimulationNodeDatum {
  id: string;
  type: 'person' | 'project' | 'week';
  frequency: number;
  status?: 'active' | 'done' | 'stalled';
}

// Link type with D3 integration
export interface Link extends d3.SimulationLinkDatum<SimulationNode> {
  strength: number;
}

// Graph data structure
export interface GraphData {
  nodes: SimulationNode[];
  links: Link[];
}

// Network clustering types
export interface NetworkCluster {
  name: string;
  nodes: string[];
  type: 'team' | 'project-group' | 'time-period';
}