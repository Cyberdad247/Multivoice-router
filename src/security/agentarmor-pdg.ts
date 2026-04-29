export type IntegrityLabel = 'HIGH_INTEGRITY' | 'LOW_INTEGRITY' | 'UNKNOWN';
export type PdgNodeKind = 'source' | 'transform' | 'sink' | 'control';

export interface PdgNode {
  id: string;
  kind: PdgNodeKind;
  label: string;
  integrity: IntegrityLabel;
}

export interface PdgEdge {
  from: string;
  to: string;
  type: 'data_flow' | 'control_flow';
}

export interface AgentArmorGraph {
  nodes: PdgNode[];
  edges: PdgEdge[];
}

export interface AgentArmorPolicyResult {
  allowed: boolean;
  violations: string[];
  graph: AgentArmorGraph;
}

const SENSITIVE_SINKS = ['shell_command', 'file_delete', 'file_write', 'payment', 'publish', 'credential_access'];

export function buildPromptDependencyGraph(input: {
  sourceLabel: string;
  sourceIntegrity: IntegrityLabel;
  transforms?: string[];
  sink: string;
}): AgentArmorGraph {
  const nodes: PdgNode[] = [
    { id: 'source', kind: 'source', label: input.sourceLabel, integrity: input.sourceIntegrity }
  ];
  const edges: PdgEdge[] = [];

  let previous = 'source';
  (input.transforms || []).forEach((label, index) => {
    const id = `transform_${index}`;
    nodes.push({ id, kind: 'transform', label, integrity: input.sourceIntegrity });
    edges.push({ from: previous, to: id, type: 'data_flow' });
    previous = id;
  });

  nodes.push({ id: 'sink', kind: 'sink', label: input.sink, integrity: 'HIGH_INTEGRITY' });
  edges.push({ from: previous, to: 'sink', type: 'data_flow' });

  return { nodes, edges };
}

export function enforceAgentArmor(graph: AgentArmorGraph): AgentArmorPolicyResult {
  const violations: string[] = [];
  const source = graph.nodes.find(n => n.kind === 'source');
  const sink = graph.nodes.find(n => n.kind === 'sink');

  if (source?.integrity === 'LOW_INTEGRITY' && sink && SENSITIVE_SINKS.includes(sink.label)) {
    violations.push(`LOW_INTEGRITY source cannot flow into sensitive sink: ${sink.label}`);
  }

  return {
    allowed: violations.length === 0,
    violations,
    graph
  };
}
