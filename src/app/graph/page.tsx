'use client';

import React, { useEffect, useRef, useState } from 'react';
import GraphView, { SimulationNode, Link, GraphViewHandle } from '@/components/GraphView';
import { identifyNetworkClusters, analyzeGaps, NetworkCluster, GapAnalysis } from '@/lib/graphUtils';
import { getClient } from '@/lib/supabase';
import type { Person, Project, Mention } from '@/lib/database.types';

type PersonRow = Pick<Person, 'id' | 'name'>;
type ProjectRow = Pick<Project, 'id' | 'name' | 'status'>;
type MentionRow = Pick<Mention, 'person_id' | 'project_id' | 'week_of'>;

type GraphNode = SimulationNode;
type GraphLink = Link;

async function loadGraphData(): Promise<{ nodes: GraphNode[], links: GraphLink[] }> {
  const supabase = getClient();

  const { data: people } = await supabase.from('people').select('id, name') as { data: PersonRow[] | null };
  const { data: projects } = await supabase.from('projects').select('id, name, status') as { data: ProjectRow[] | null };
  const { data: mentions } = await supabase.from('mentions').select('person_id, project_id, week_of') as { data: MentionRow[] | null };

  if (!people || !projects || !mentions) return { nodes: [], links: [] };

  // Count frequencies
  const personFreq = new Map<string, number>();
  const projectFreq = new Map<string, number>();
  const weekFreq = new Map<string, number>();

  for (const m of mentions) {
    if (m.person_id) personFreq.set(m.person_id, (personFreq.get(m.person_id) ?? 0) + 1);
    if (m.project_id) projectFreq.set(m.project_id, (projectFreq.get(m.project_id) ?? 0) + 1);
    weekFreq.set(m.week_of, (weekFreq.get(m.week_of) ?? 0) + 1);
  }

  // Build nodes
  const nodes: GraphNode[] = [
    ...people.map(p => ({
      id: p.name,
      type: 'person' as const,
      frequency: personFreq.get(p.id) ?? 0,
    })),
    ...projects.map(p => ({
      id: p.name,
      type: 'project' as const,
      frequency: projectFreq.get(p.id) ?? 0,
      status: p.status as 'active' | 'done' | 'stalled',
    })),
    ...Array.from(weekFreq.entries()).map(([week, freq]) => ({
      id: week,
      type: 'week' as const,
      frequency: freq,
    })),
  ];

  // Build id → name maps
  const personName = new Map(people.map(p => [p.id, p.name]));
  const projectName = new Map(projects.map(p => [p.id, p.name]));

  // Count co-occurrences for links
  const linkCount = new Map<string, number>();
  const inc = (a: string, b: string) => {
    const key = [a, b].sort().join('|||');
    linkCount.set(key, (linkCount.get(key) ?? 0) + 1);
  };

  for (const m of mentions) {
    const person = m.person_id ? personName.get(m.person_id) : null;
    const project = m.project_id ? projectName.get(m.project_id) : null;
    if (person && project) inc(person, project);
    if (person) inc(person, m.week_of);
    if (project) inc(project, m.week_of);
  }

  const maxCount = Math.max(1, ...Array.from(linkCount.values()));
  const links: GraphLink[] = Array.from(linkCount.entries()).map(([key, count]) => {
    const [source, target] = key.split('|||');
    return { source, target, strength: count / maxCount };
  });

  return { nodes, links };
}

export default function GraphPage() {
  const graphRef = useRef<GraphViewHandle>(null);
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
  const [showLegend, setShowLegend] = useState(false);

  useEffect(() => {
    const calculatedClusters = identifyNetworkClusters(graphData, 2);
    setClusters(calculatedClusters);
  }, [graphData.nodes, graphData.links]);

  useEffect(() => {
    const result = analyzeGaps(graphData, clusters);
    setGapAnalysis(result);
  }, [graphData, clusters]);

  useEffect(() => {
    loadGraphData().then(setGraphData).catch(err => console.error('Error loading graph data:', err));
  }, []);

  const filteredNodes = graphData.nodes.filter(node => {
    if (node.type === 'person' && !filters.people) return false;
    if (node.type === 'project' && !filters.projects) return false;
    if (node.type === 'week' && !filters.weeks) return false;
    if (node.frequency < filters.minFrequency) return false;
    if (node.type === 'week') {
      if (filters.timeRangeStart && node.id < filters.timeRangeStart) return false;
      if (filters.timeRangeEnd && node.id > filters.timeRangeEnd) return false;
    }
    return true;
  });

  const filteredLinks = graphData.links.filter(link =>
    filteredNodes.some(node => node.id === link.source) &&
    filteredNodes.some(node => node.id === link.target)
  );

  const handleNodeClick = (node: GraphNode) => {
    alert(`${node.id} (${node.type})\nFrequency: ${node.frequency}`);
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
            <input type="checkbox" id="people-filter" checked={filters.people} onChange={() => toggleFilter('people')} className="mr-2" />
            <label htmlFor="people-filter">People</label>
          </div>
          <div className="flex items-center">
            <input type="checkbox" id="projects-filter" checked={filters.projects} onChange={() => toggleFilter('projects')} className="mr-2" />
            <label htmlFor="projects-filter">Projects</label>
          </div>
          <div className="flex items-center">
            <input type="checkbox" id="weeks-filter" checked={filters.weeks} onChange={() => toggleFilter('weeks')} className="mr-2" />
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
            <input type="date" id="time-range-start" value={filters.timeRangeStart} onChange={(e) => setFilters(prev => ({ ...prev, timeRangeStart: e.target.value }))} className="mr-2 p-1 border rounded" />
            <input type="date" id="time-range-end" value={filters.timeRangeEnd} onChange={(e) => setFilters(prev => ({ ...prev, timeRangeEnd: e.target.value }))} className="p-1 border rounded" />
          </div>
        </div>
      </div>

      {/* Graph Visualization */}
      <div className="relative">
        <GraphView ref={graphRef} data={{ nodes: filteredNodes, links: filteredLinks }} onNodeClick={handleNodeClick} />

        {showLegend && (
          <div className="absolute top-4 right-4 bg-white border border-gray-200 rounded-lg p-3 shadow-md text-sm">
            <h3 className="font-semibold mb-2">Legend</h3>
            <div className="flex items-center gap-2 mb-1"><span className="w-3 h-3 rounded-full inline-block" style={{ background: '#6f42c1' }} /> Person</div>
            <div className="flex items-center gap-2 mb-1"><span className="w-3 h-3 rounded-full inline-block" style={{ background: '#0366d6' }} /> Project (active)</div>
            <div className="flex items-center gap-2 mb-1"><span className="w-3 h-3 rounded-full inline-block" style={{ background: '#28a745' }} /> Project (done)</div>
            <div className="flex items-center gap-2 mb-1"><span className="w-3 h-3 rounded-full inline-block" style={{ background: '#e67e22' }} /> Project (stalled)</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full inline-block" style={{ background: '#17a2b8' }} /> Week</div>
          </div>
        )}
      </div>

      {/* Visualization Controls */}
      <div className="mt-4 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Visualization Controls</h2>
        <div className="flex flex-wrap gap-4">
          <button onClick={() => graphRef.current?.center()} className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">
            Center View
          </button>
          <button onClick={() => graphRef.current?.zoomIn()} className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">
            Zoom In
          </button>
          <button onClick={() => graphRef.current?.zoomOut()} className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">
            Zoom Out
          </button>
          <button onClick={() => setShowLegend(v => !v)} className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">
            {showLegend ? 'Hide Legend' : 'Show Legend'}
          </button>
        </div>
      </div>
    </div>
  );
}
