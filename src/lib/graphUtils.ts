import { SimulationNode, Link } from '@/components/GraphView';

export type { SimulationNode, Link };

export type NetworkCluster = {
  name: string;
  nodes: string[];
  type: 'team' | 'project-group' | 'time-period';
};

export type GapAnalysis = {
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

export const identifyNetworkClusters = (
  graphData: { nodes: SimulationNode[], links: Link[] },
  depth: number = 2
): NetworkCluster[] => {
  if (graphData.nodes.length === 0) return [];

  const clusters: NetworkCluster[] = [];
  const visited = new Set<string>();

  const adjacency = new Map<string, Set<string>>();
  graphData.nodes.forEach(node => {
    adjacency.set(node.id, new Set<string>());
  });

  graphData.links.forEach(link => {
    const src = typeof link.source === 'object' ? (link.source as SimulationNode).id : String(link.source);
    const tgt = typeof link.target === 'object' ? (link.target as SimulationNode).id : String(link.target);
    adjacency.get(src)?.add(tgt);
    adjacency.get(tgt)?.add(src);
  });

  const dfs = (nodeId: string): Set<string> => {
    const clusterNodes = new Set<string>();
    const stack: [string, number][] = [[nodeId, depth]];

    while (stack.length > 0) {
      const [currentId, currentDepth] = stack.pop()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);
      clusterNodes.add(currentId);

      if (currentDepth > 0) {
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

  for (const node of graphData.nodes) {
    if (!visited.has(node.id)) {
      const clusterNodes = [...dfs(node.id)];
      const personCount = graphData.nodes.filter(n => n.type === 'person' && clusterNodes.includes(n.id)).length;
      const projectCount = graphData.nodes.filter(n => n.type === 'project' && clusterNodes.includes(n.id)).length;
      const weekCount = graphData.nodes.filter(n => n.type === 'week' && clusterNodes.includes(n.id)).length;

      let clusterType: 'team' | 'project-group' | 'time-period' = 'project-group';
      if (personCount > projectCount && personCount > weekCount) {
        clusterType = 'team';
      } else if (weekCount > projectCount && weekCount > personCount) {
        clusterType = 'time-period';
      }

      clusters.push({ name: `Network Cluster ${clusterId++}`, nodes: clusterNodes, type: clusterType });
    }
  }

  return clusters;
};

export const analyzeGaps = (
  graphData: { nodes: SimulationNode[], links: Link[] },
  clusters: NetworkCluster[]
): GapAnalysis => {
  const missingConnections: GapAnalysis['missingConnections'] = [];
  const inactiveProjects: GapAnalysis['inactiveProjects'] = [];
  const unconnectedPeople: GapAnalysis['unconnectedPeople'] = [];

  const now = new Date();
  const threeWeeksAgo = new Date();
  threeWeeksAgo.setDate(now.getDate() - 21);

  for (const link of graphData.links) {
    if (link.strength < 0.35) {
      const src = typeof link.source === 'object' ? (link.source as SimulationNode).id : String(link.source);
      const tgt = typeof link.target === 'object' ? (link.target as SimulationNode).id : String(link.target);
      missingConnections.push({
        source: src,
        target: tgt,
        importance: (1 - link.strength) * 100,
        suggestion: `Consider connecting ${src} and ${tgt} more`
      });
    }
  }

  for (const node of graphData.nodes) {
    if (node.type === 'project') {
      const lastActivity = new Date(node.id);
      if (lastActivity < threeWeeksAgo) {
        inactiveProjects.push({ id: node.id, lastActivity: lastActivity.toISOString().slice(0, 10), risk: 'high' });
      }
    }
  }

  const people = graphData.nodes.filter(n => n.type === 'person');
  for (const person of people) {
    const connections = graphData.links.filter(link => {
      const src = typeof link.source === 'object' ? (link.source as SimulationNode).id : String(link.source);
      const tgt = typeof link.target === 'object' ? (link.target as SimulationNode).id : String(link.target);
      return src === person.id || tgt === person.id;
    });
    const avgStrength = connections.length > 0
      ? connections.reduce((sum, link) => sum + link.strength, 0) / connections.length
      : 0;

    if (connections.length === 0 || avgStrength < 0.5) {
      unconnectedPeople.push({ id: person.id, lastConnection: connections.length === 0 ? 'none' : 'a while' });
    }
  }

  return {
    missingConnections,
    inactiveProjects: inactiveProjects.sort((a, b) =>
      ['high', 'medium', 'low'].indexOf(a.risk) - ['high', 'medium', 'low'].indexOf(b.risk)
    ),
    unconnectedPeople
  };
};
