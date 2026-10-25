import {
  NetworkEdge,
  NetworkNode,
  ReconstructedEdge,
  ReconstructionResult,
  SessionTimelineGroup,
  SimulatedEvent,
  UnresolvedGap,
} from '../domain/types';

/**
 * Evidence-backed path reconstruction engine for Lureline.
 *
 * Core Invariants:
 * 1. Never accesses ground truth.
 * 2. Strictly isolates sessions: events from different sessions are never linked.
 * 3. Every confirmed edge must have both:
 *    (a) at least one supporting event ID, and
 *    (b) a valid network topology link.
 * 4. If a session exhibits a discontinuity (a subsequent event originates from a node
 *    never previously reached in that session) or a non-topological transition, the engine
 *    does NOT invent the missing edge; it records an explicit UnresolvedGap stating
 *    "Insufficient evidence to confirm this connection."
 */
export function reconstructPaths(
  validEvents: readonly SimulatedEvent[],
  nodes: readonly NetworkNode[],
  topologyEdges: readonly NetworkEdge[]
): ReconstructionResult {
  const nodeMap = new Map<string, NetworkNode>(nodes.map((n) => [n.id, n]));
  const topologyByKey = new Map<string, NetworkEdge>(
    topologyEdges.map((edge) => [
      `${edge.sourceNodeId}->${edge.destinationNodeId}`,
      edge,
    ])
  );

  // Group events by sessionId while preserving the deterministic sort order
  const eventsBySession = new Map<string, SimulatedEvent[]>();
  for (const ev of validEvents) {
    const list = eventsBySession.get(ev.sessionId) ?? [];
    list.push(ev);
    eventsBySession.set(ev.sessionId, list);
  }

  const edgeAccumulator = new Map<string, ReconstructedEdge>();
  const unresolvedGaps: UnresolvedGap[] = [];
  const sessionGroups: SessionTimelineGroup[] = [];
  let gapCounter = 1;

  for (const [sessionId, sessionEvents] of eventsBySession.entries()) {
    const visitedNodes = new Set<string>();
    const eventIdsReachingNode = new Map<string, string[]>();
    let lastConfirmedNodeId: string | null = null;
    let lastConfirmedEventId: string | null = null;

    const sessionConfirmedEdgeKeys: string[] = [];
    const sessionGaps: UnresolvedGap[] = [];
    let hasDecoyInteraction = false;

    for (let i = 0; i < sessionEvents.length; i++) {
      const ev = sessionEvents[i];
      const edgeKey = `${ev.sourceNodeId}->${ev.destinationNodeId}`;
      const topoEdge = topologyByKey.get(edgeKey);
      const sourceNode = nodeMap.get(ev.sourceNodeId);
      const destNode = nodeMap.get(ev.destinationNodeId);

      // 1. Check topology validity
      if (!topoEdge || ev.eventType === 'SPOOFED_TELEMETRY') {
        const gap: UnresolvedGap = {
          id: `GAP-${String(gapCounter++).padStart(3, '0')}`,
          sessionId,
          fromNodeId: ev.sourceNodeId,
          toNodeId: ev.destinationNodeId,
          relatedEventIds: [ev.id],
          kind: 'invalid_topology_transition',
          message: `Insufficient evidence to confirm this connection. Event ${ev.id} claims traversal ${ev.sourceNodeId} → ${ev.destinationNodeId}, which violates defined network topology or carries spoofed telemetry markers.`,
          unresolvedQuestion: `How did session "${sessionId}" report activity from ${
            sourceNode?.label ?? ev.sourceNodeId
          } to ${
            destNode?.label ?? ev.destinationNodeId
          } when no permitted network route exists between those segments?`,
        };
        unresolvedGaps.push(gap);
        sessionGaps.push(gap);
        continue;
      }

      // 2. Check session continuity for hops after the first confirmed event
      const isFirstConfirmedInSession = visitedNodes.size === 0;
      const wasSourceVisitedInSession = visitedNodes.has(ev.sourceNodeId);

      if (!isFirstConfirmedInSession && !wasSourceVisitedInSession && lastConfirmedNodeId) {
        // Missing intermediate link between lastConfirmedNodeId and ev.sourceNodeId!
        // Do NOT invent an edge between lastConfirmedNodeId and ev.sourceNodeId.
        const missingGap: UnresolvedGap = {
          id: `GAP-${String(gapCounter++).padStart(3, '0')}`,
          sessionId,
          fromNodeId: lastConfirmedNodeId,
          toNodeId: ev.sourceNodeId,
          relatedEventIds: lastConfirmedEventId
            ? [lastConfirmedEventId, ev.id]
            : [ev.id],
          kind: 'missing_intermediate_hop',
          message: `Insufficient evidence to confirm this connection. Session "${sessionId}" was last observed at ${lastConfirmedNodeId} (${
            lastConfirmedEventId ?? 'prior event'
          }) and subsequently originated from ${ev.sourceNodeId} (${
            ev.id
          }), with no supporting event record confirming traversal from ${lastConfirmedNodeId} to ${ev.sourceNodeId}.`,
          unresolvedQuestion: `Which intermediate event or relay allowed session "${sessionId}" to move from ${
            nodeMap.get(lastConfirmedNodeId)?.label ?? lastConfirmedNodeId
          } to ${sourceNode?.label ?? ev.sourceNodeId}?`,
        };
        unresolvedGaps.push(missingGap);
        sessionGaps.push(missingGap);
      }

      const priorChainEvents = eventIdsReachingNode.get(ev.sourceNodeId) ?? [];
      const evidenceType = isFirstConfirmedInSession
        ? 'observed-session-origin'
        : wasSourceVisitedInSession
        ? 'observed-contiguous-chain'
        : 'observed-isolated-segment';

      const explanation =
        evidenceType === 'observed-contiguous-chain'
          ? `Confirmed contiguous hop in session "${sessionId}": supported directly by event ${
              ev.id
            } on valid route ${topoEdge.id} (${topoEdge.protocol}), continuing from prior session arrival via ${priorChainEvents.join(
              ', '
            )}.`
          : evidenceType === 'observed-session-origin'
          ? `Confirmed initial session entry hop in session "${sessionId}": directly supported by event ${ev.id} on valid route ${topoEdge.id} (${topoEdge.protocol}).`
          : `Observed isolated segment in session "${sessionId}": directly supported by event ${ev.id} on valid route ${topoEdge.id}, but preceded by an unconfirmed upstream telemetry gap into ${ev.sourceNodeId}.`;

      const limitations =
        evidenceType === 'observed-isolated-segment'
          ? `Upstream arrival at ${ev.sourceNodeId} within session "${sessionId}" is unconfirmed due to missing intermediate telemetry. Synthetic record only.`
          : 'Supported by deterministic synthetic telemetry and allowed topology rules; does not prove real-world host compromise.';

      const existing = edgeAccumulator.get(edgeKey);
      if (existing) {
        if (!existing.sessionIds.includes(sessionId)) {
          existing.sessionIds.push(sessionId);
        }
        if (!existing.supportingEventIds.includes(ev.id)) {
          existing.supportingEventIds.push(ev.id);
        }
        for (const pId of priorChainEvents) {
          if (!existing.priorChainEventIds.includes(pId)) {
            existing.priorChainEventIds.push(pId);
          }
        }
        if (ev.timestamp > existing.lastSeenTimestamp) {
          existing.lastSeenTimestamp = ev.timestamp;
        }
      } else {
        edgeAccumulator.set(edgeKey, {
          edgeKey,
          sourceNodeId: ev.sourceNodeId,
          destinationNodeId: ev.destinationNodeId,
          sessionIds: [sessionId],
          supportingEventIds: [ev.id],
          priorChainEventIds: [...priorChainEvents],
          topologyEdgeId: topoEdge.id,
          evidenceType,
          explanation,
          limitations,
          firstSeenTimestamp: ev.timestamp,
          lastSeenTimestamp: ev.timestamp,
          provenance: 'synthetic',
        });
      }

      if (!sessionConfirmedEdgeKeys.includes(edgeKey)) {
        sessionConfirmedEdgeKeys.push(edgeKey);
      }

      if (destNode?.isDecoy) {
        hasDecoyInteraction = true;
      }

      // Mark source and destination as visited in this session
      visitedNodes.add(ev.sourceNodeId);
      visitedNodes.add(ev.destinationNodeId);
      const reachingDest = eventIdsReachingNode.get(ev.destinationNodeId) ?? [];
      if (!reachingDest.includes(ev.id)) {
        reachingDest.push(ev.id);
      }
      eventIdsReachingNode.set(ev.destinationNodeId, reachingDest);

      lastConfirmedNodeId = ev.destinationNodeId;
      lastConfirmedEventId = ev.id;
    }

    sessionGroups.push({
      sessionId,
      events: sessionEvents,
      confirmedEdgeKeys: sessionConfirmedEdgeKeys,
      unresolvedGaps: sessionGaps,
      hasDecoyInteraction,
    });
  }

  const predictedEdges = Array.from(edgeAccumulator.values());
  const predictedEdgeKeys = predictedEdges.map((e) => e.edgeKey);

  return {
    methodName: 'Lureline Evidence-Backed',
    predictedEdges,
    predictedEdgeKeys,
    unresolvedGaps,
    sessionGroups,
  };
}
