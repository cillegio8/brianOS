import React, { useEffect, useState } from 'react';
import GraphView from '@/components/GraphView';

// Extend D3's SimulationNodeDatum to include our custom properties from shared types
import { SimulationNode } from '@/components/GraphView';
interface ProjectNode {
  id: string;
  type: 'project';
  status: 'active' | 'done' | 'stalled';
  frequency: number;
}

interface WeekNode {
  id: string;
  type: 'week';
  frequency: number;
}

type GraphNode = PersonNode | ProjectNode | WeekNode;
interface GraphLink {
  source: string;
  target: string;
  strength: number;
}

// Network clustering types
type NetworkCluster = {
  name: string;
  nodes: string[];
  type: 'team' | 'project-group' | 'time-period';
};

// Gap analysis types
type GapAnalysis = {
  missingConnections: {
    source: string;
    target: string;
    importance: number;
    suggestion: string;
  }[];
  inactiveProjects: {
    id: string;
    lastActivity: string;
    risk: 'high' | 'medium' | 'low';
  }[];
  unconnectedPeople: {
    id: string;
    lastConnection: string | null;
  }[];
};

export default function GraphPage() {
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[], links: GraphLink[] }>({ nodes: [], links: [] });
  const [filters, setFilters] = useState({
    people: true,
    projects: true,
    weeks: true,
    minFrequency: 1,
    timeRangeStart: '',
    timeRangeEnd: ''
  });
  const [clusters, setClusters] = useState<NetworkCluster[]>([]);
  const [gapAnalysis, setGapAnalysis] = useState<GapAnalysis | null>(null);
  const [queryResults, setQueryResults] = useState<{ nodes: GraphNode[], links: GraphLink[] } | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);
  const [highlightedConnections, setHighlightedConnections] = useState<string[]>([]);
  const [activeView, setActiveView] = useState<'graph' | 'list' | 'clustering'>('graph');
  
  // Effect to identify clusters in the data
  useEffect(() => {
    const calculatedClusters = identifyNetworkClusters(graphData, 2);
    setClusters(calculatedClusters);
  }, [graphData.nodes, graphData.links]);
  
  // Effect to identify potential gaps in the data
  useEffect(() => {
    const gapAnalysis = analyzeGaps(graphData, clusters);
    setGapAnalysis(gapAnalysis);
  }, [graphData, clusters]);
  const [gapAnalysis, setGapAnalysis] = useState<GapAnalysis | null>(null);
  const [queryResults, setQueryResults] = useState<{ nodes: GraphNode[], links: GraphLink[] } | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);
  const [highlightedConnections, setHighlightedConnections] = useState<string[]>([]);

  // Fetch graph data from API
  useEffect(() => {
    async function fetchGraphData() {
      try {
        const response = await fetch('/api/graph-data');
        if (!response.ok) throw new Error('Failed to fetch graph data');
        const data = await response.json();
        setGraphData(data);
      } catch (error) {
        console.error('Error fetching graph data:', error);
      }
    }

    fetchGraphData();
  }, []);

  // Filter nodes based on selected criteria
  const filteredNodes = graphData.nodes.filter(node => {
    // Apply type filters
    if (node.type === 'person' && !filters.people) return false;
    if (node.type === 'project' && !filters.projects) return false;
    if (node.type === 'week' && !filters.weeks) return false;
    
    // Apply frequency filter
    if (node.frequency < filters.minFrequency) return false;
    
    // Apply time range filter (weeks)
    if (node.type === 'week') {
      if (filters.timeRangeStart && node.id < filters.timeRangeStart) return false;
      if (filters.timeRangeEnd && node.id > filters.timeRangeEnd) return false;
    }
    
    return true;
  });

  // Filter links to only include those connected to filtered nodes
  const filteredLinks = graphData.links.filter(link => 
    filteredNodes.some(node => node.id === link.source) && 
    filteredNodes.some(node => node.id === link.target)
  );

  const handleNodeClick = (node: GraphNode) => {
    // Handle node click - could open a detail panel or trigger a search
    console.log('Node clicked:', node);
    alert(`Clicked on ${node.id} (${node.type})\nFrequency: ${node.frequency}`);
  };

  const toggleFilter = (filterType: 'people' | 'projects' | 'weeks') => {
    setFilters(prev => ({ ...prev, [filterType]: !prev[filterType] }));
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Interactive Knowledge Graph</h1>
      
      {/* Filter Controls */}
      <div className="mb-4 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Filters</h2>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="people-filter"
              checked={filters.people}
              onChange={() => toggleFilter('people')}
              className="mr-2"
            />
            <label htmlFor="people-filter">People</label>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="projects-filter"
              checked={filters.projects}
              onChange={() => toggleFilter('projects')}
              className="mr-2"
            />
            <label htmlFor="projects-filter">Projects</label>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="weeks-filter"
              checked={filters.weeks}
              onChange={() => toggleFilter('weeks')}
              className="mr-2"
            />
            <label htmlFor="weeks-filter">Weeks</label>
          </div>
          
          <div className="flex items-center">
            <label htmlFor="min-frequency" className="mr-2">Min Frequency:</label>
            <input
              type="number"
              id="min-frequency"
              min="1"
              value={filters.minFrequency}
              onChange={(e) => setFilters(prev => ({ ...prev, minFrequency: parseInt(e.target.value) || 1 }))}
              className="w-16 p-1 border rounded"
            />
          </div>
          
          <div className="flex items-center">
            <label htmlFor="time-range-start" className="mr-2">Time Range:</label>
            <input
              type="date"
              id="time-range-start"
              value={filters.timeRangeStart}
              onChange={(e) => setFilters(prev => ({ ...prev, timeRangeStart: e.target.value }))}
              className="mr-2 p-1 border rounded"
            />
            <input
              type="date"
              id="time-range-end"
              value={filters.timeRangeEnd}
              onChange={(e) => setFilters(prev => ({ ...prev, timeRangeEnd: e.target.value }))}
              className="p-1 border rounded"
            />
          </div>
        </div>
      </div>
      
      {/* Graph Visualization */}
      <GraphView 
        data={{ 
          nodes: filteredNodes, 
          links: filteredLinks 
        }} 
        onNodeClick={handleNodeClick} 
      />
      
      {/* Visualization Controls */}
      <div className="mt-4 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Visualization Controls</h2>
        <div className="flex flex-wrap gap-4">
          <button className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">
            Center View
          </button>
          <button className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">
            Zoom In
          </button>
          <button className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">
            Zoom Out
          </button>
          <button className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">
            Show Legend
          </button>
        </div>
      </div>
    </div>
  );
}