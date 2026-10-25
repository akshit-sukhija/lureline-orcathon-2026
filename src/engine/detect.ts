import {
  Alert,
  DetectionRule,
  NetworkEdge,
  NetworkNode,
  SimulatedEvent,
} from '../domain/types';

/**
 * Pure deterministic decoy interaction detector.
 * Evaluates validated synthetic events against registered nodes, topology, and detection rules.
 * Every alert references an existing event ID and rule ID with a plain-language explanation.
 */
export function detectDecoyInteractions(
  validEvents: readonly SimulatedEvent[],
  nodes: readonly NetworkNode[],
  topologyEdges: readonly NetworkEdge[],
  rules: readonly DetectionRule[]
): Alert[] {
  const nodeMap = new Map<string, NetworkNode>(nodes.map((n) => [n.id, n]));
  const ruleMap = new Map<string, DetectionRule>(rules.map((r) => [r.id, r]));
  const validTopologySet = new Set(
    topologyEdges.map((e) => `${e.sourceNodeId}->${e.destinationNodeId}`)
  );

  const alerts: Alert[] = [];
  let alertSequence = 1;

  for (const event of validEvents) {
    const destNode = nodeMap.get(event.destinationNodeId);
    const sourceNode = nodeMap.get(event.sourceNodeId);
    if (!destNode || !sourceNode) {
      continue;
    }

    // Only flag decoy interactions when destination node is explicitly configured as a decoy
    if (!destNode.isDecoy) {
      continue;
    }

    const edgeKey = `${event.sourceNodeId}->${event.destinationNodeId}`;
    const isTopologyAllowed = validTopologySet.has(edgeKey);

    // Do not raise a confirmed decoy interaction alert on an impossible topology spoof;
    // reconstruction will report it as an unconfirmed/rejected transition.
    if (!isTopologyAllowed || event.eventType === 'SPOOFED_TELEMETRY') {
      continue;
    }

    const targetRuleId =
      event.eventType === 'CANARY_VAULT_READ'
        ? 'RULE-DECOY-CANARY-02'
        : 'RULE-DECOY-DEST-01';

    const rule = ruleMap.get(targetRuleId) ?? rules[0];
    if (!rule) {
      continue;
    }

    const alertId = `ALT-${event.scenarioId.split('-')[1]?.toUpperCase() || 'SIM'}-${String(
      alertSequence
    ).padStart(3, '0')}`;
    alertSequence += 1;

    alerts.push({
      id: alertId,
      scenarioId: event.scenarioId,
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      supportingEventIds: [event.id],
      sessionId: event.sessionId,
      sourceNodeId: event.sourceNodeId,
      destinationNodeId: event.destinationNodeId,
      timestamp: event.timestamp,
      explanation: `Event ${event.id} in session "${event.sessionId}" targeted "${destNode.label}" (${destNode.id}), which is explicitly configured as a decoy asset in the network registry. Triggered rule ${rule.id} (${rule.name}) via ${event.eventType} from "${sourceNode.label}" (${sourceNode.id}).`,
      confidenceLimitations:
        'Synthetic alert confirms only that a simulated event record targeted a designated decoy node. It does not establish real-world compromise, actor identity, or upstream path completeness without inspecting session reconstruction.',
      provenance: 'synthetic',
    });
  }

  return alerts;
}
