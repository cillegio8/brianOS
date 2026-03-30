import { NextResponse } from 'next/server';
import { SimulationNode, Link } from '@/lib/graphUtils';

export async function GET() {
  const nodes: SimulationNode[] = [];
  const links: Link[] = [];

  return NextResponse.json({ nodes, links });
}
