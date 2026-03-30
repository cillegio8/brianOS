import { NextRequest } from 'next/server';
export type { SimulationNode, Link, GraphData, NetworkCluster };

// Function to identify network clusters using adjacency and depth-first search
export const identifyNetworkClusters = (
  graphData: { nodes: SimulationNode[], links: Link[] },
  depth: number = 2
): NetworkCluster[] => {
  if (graphData.nodes.length === 0) return [];
  
  const clusters: NetworkCluster[] = [];
  const visited = new Set<string>();
  
  // Build adjacency list
  const adjacency = new Map<string, Set<string>>();
  graphData.nodes.forEach(node => {
    adjacency.set(node.id, new Set<string>());
  });
  
  // Populate adjacency list with bidirectional connections
  graphData.links.forEach(link => {
    if (adjacency.has(link.source)) {
      adjacency.get(link.source)!.add(link.target);
    }
    if (adjacency.has(link.target)) {
      adjacency.get(link.target)!.add(link.source);
    }
  });
  
  // Depth-first search to find connected components
  const dfs = (nodeId: string, clusterId: string, currentDepth: number): Set<string> => {
    const clusterNodes = new Set<string>();
    
    // Stack for DFS
    const stack: [string, number][] = [[nodeId, currentDepth]];
    
    while (stack.length > 0) {
      const [currentId, currentDepth] = stack.pop()!;
      
      if (visited.has(currentId)) continue;
      visited.add(currentId);
      
      clusterNodes.add(currentId);
      
      if (currentDepth > 0) {
        // Explore connections
        adjacency.get(currentId)?.forEach(neighbor => {
          if (!visited.has(neighbor)) {
            stack.push([neighbor, currentDepth - 1]);
          }
        });
      }
    }
    
    return clusterNodes;
  };
  
  let clusterId = 1;
  
  // Find connected components
  for (const node of graphData.nodes) {
    if (!visited.has(node.id)) {
      const clusterNodes = [...dfs(node.id, `cluster-${clusterId++}`)];
      const personCount = graphData.nodes.filter(n => n.type === 'person' && clusterNodes.includes(n.id)).length;
      const projectCount = graphData.nodes.filter(n => n.type === 'project' && clusterNodes.includes(n.id)).length;
      const weekCount = graphData.nodes.filter(n => n.type === 'week' && clusterNodes.includes(n.id)).length;
      
      // Determine cluster type based on majority
      let clusterType: 'team' | 'project-group' | 'time-period' = 'project-group';
      if (personCount > projectCount && personCount > weekCount) {
        clusterType = 'team';
      } else if (weekCount > projectCount && weekCount > personCount) {
        clusterType = 'time-period';
      }
      
      clusters.push({
        name: `Network Cluster ${clusterId++}`,
        nodes: [...clusterNodes],
        type: clusterType
      });
    }
  }
  
  return clusters;
};

// Function to analyze gaps in the data
export const analyzeGaps = (graphData: { nodes: SimulationNode[], links: Link[] }, clusters: NetworkCluster[]) => {
  const missingConnections = [];
  const inactiveProjects = [];
  const unconnectedPeople = [];
  
  const now = new Date();
  const threeWeeksAgo = new Date();
  threeWeeksAgo.setDate(now.getDate() - 21); // 3 weeks ago
  
  // Find connections with low strength
  for (const link of graphData.links) {
    if (link.strength < 0.35) { // Arbitrary low strength threshold
      missingConnections.push({
        source: link.source,
        target: link.target,
        importance: (1 - link.strength) * 100, // Calculate importance
        suggestion: `Consider connecting ${link.source} and ${link.target} more`
      });
    }
  }
  
  // Find projects with no recent activity
  for (const node of graphData.nodes) {
    if (node.type === 'project') {
      const lastActivity = new Date(node.id); // Project ID as date for mock data
      
      if (lastActivity < threeWeeksAgo) {
        inactiveProjects.push({
          id: node.id,
          lastActivity: lastActivity.toISOString().slice(0, 10),
          risk: 'high'
        });
      }
    }
  }
  
  // Find people with no connections
  const people = graphData.nodes.filter(n => n.type === 'person');
  
  // Find people with weak connections
  for (const person of people) {
    const connections = graphData.links.filter(link => link.source === person.id || link.target === person.id);
    const avgStrength = connections.length > 0
      ? connections.reduce((sum, link) => sum + link.strength, 0) / connections.length
      : 0;
    
    if (connections.length === 0 || avgStrength < 0.5) {
      unconnectedPeople.push({
        id: person.id,
        lastConnection: connections.length === 0
          ? 'none'
          : 'a while'
      });
    }
  }
  
  // Sort by risk
  return {
    missingConnections,
    inactiveProjects: inactiveProjects.sort((a, b) => ['high', 'medium', 'low'].indexOf(b.risk) - ['high', 'medium', 'low'].indexOf(a.risk)),
    unconnectedPeople
  };
};

// Function to highlight connections for a specific node
export const highlightConnections = (nodeId: string, links: Link[]): string[] => {
  return links.reduce<string[]>((acc, link) => {
    if (link.target === nodeId || link.source === nodeId) {
      acc.push(link.source, link.target);
    }
    return acc;
  }, []);
};

// Function to find shortest path between two nodes
export const getShortestPath = (links: Link[], startId: string, endId: string) => {
  if (startId === endId) return [];
  
  const visited = new Set<string>();
  const queue: [string, { path: string[] }][] = [[startId, { path: [] }]];
  
  while (queue.length > 0) {
    const [currentId, { path }] = queue.shift()!;
    
    if (visited.has(currentId)) continue;
    visited.add(currentId);
    
    if (currentId === endId) {
      return [...path, currentId];
    }
    
    // Add connections to queue
    links
      .filter(link => link.source === currentId || link.target === currentId)
      .forEach(link => {
        const nextId = link.target === currentId ? link.source : link.target;
        if (!visited.has(nextId)) {
          queue.push([nextId, { path: [...path, currentId] }]);
        }
      });
  }
  
  return []; // No path found
};