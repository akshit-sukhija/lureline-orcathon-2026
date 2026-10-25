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
 * 4. Sequential continuity requires that a subsequent event's sourceNodeId matches
 *    the immediately preceding confirmed event's destinationNodeId (lastConfirmedNodeId).
 *    A node merely visited earlier in the session (as an earlier source or prior hop)
 *    does NOT prove continuity from the immediately preceding confirmed event.
 * 5. Whenever sequential continuity is broken or a transition violates topology,
 *    the engine never invents a bridge edge; it records an explicit UnresolvedGap
 *    stating "Insufficient evidence to confirm this connection."
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

  // Group events by sessionId while preserving deterministic sort order
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

      // 2. Check strict sequential continuity from the immediately preceding confirmed event
      const isFirstConfirmedInSession = lastConfirmedNodeId === null;
      const isContiguousWithLastConfirmed =
        !isFirstConfirmedInSession && ev.sourceNodeId === lastConfirmedNodeId;

      if (
        !isFirstConfirmedInSession &&
        !isContiguousWithLastConfirmed &&
        lastConfirmedNodeId !== null
      ) {
        // Sequential discontinuity: ev.sourceNodeId does not match the immediately preceding
        // confirmed destination (lastConfirmedNodeId). Even if ev.sourceNodeId was visited
        // earlier in the session, that does not establish how flow moved from lastConfirmedNodeId
        // to ev.sourceNodeId. Never invent a bridge edge; record an explicit UnresolvedGap.
        const missingGap: UnresolvedGap = {
          id: `GAP-${String(gapCounter++).padStart(3, '0')}`,
          sessionId,
          fromNodeId: lastConfirmedNodeId,
          toNodeId: ev.sourceNodeId,
          relatedEventIds: lastConfirmedEventId
            ? [lastConfirmedEventId, ev.id]
            : [ev.id],
          kind: 'missing_intermediate_hop',
          message: `Insufficient evidence to confirm this connection. Session "${sessionId}" was last confirmed at destination ${lastConfirmedNodeId} (${
            lastConfirmedEventId ?? 'prior event'
          }) and next originated from ${ev.sourceNodeId} (${
            ev.id
          }), with no supporting event record confirming traversal from ${lastConfirmedNodeId} to ${ev.sourceNodeId}.`,
          unresolvedQuestion: `Which unrecorded transition or separate branch caused session "${sessionId}" to originate from ${
            sourceNode?.label ?? ev.sourceNodeId
          } immediately after reaching ${
            nodeMap.get(lastConfirmedNodeId)?.label ?? lastConfirmedNodeId
          }?`,
        };
        unresolvedGaps.push(missingGap);
        sessionGaps.push(missingGap);
      }

      const priorChainEvents =
        isContiguousWithLastConfirmed && lastConfirmedEventId
          ? [lastConfirmedEventId]
          : [];

      const evidenceType = isFirstConfirmedInSession
        ? 'observed-session-origin'
        : isContiguousWithLastConfirmed
        ? 'observed-contiguous-chain'
        : 'observed-isolated-segment';

      const explanation =
        evidenceType === 'observed-contiguous-chain'
          ? `Confirmed contiguous hop in session "${sessionId}": supported directly by event ${
              ev.id
            } on valid route ${topoEdge.id} (${
              topoEdge.protocol
            }), continuing directly from immediately preceding confirmed destination ${lastConfirmedNodeId} via ${priorChainEvents.join(
              ', '
            )}.`
          : evidenceType === 'observed-session-origin'
          ? `Confirmed initial session entry hop in session "${sessionId}": directly supported by event ${ev.id} on valid route ${topoEdge.id} (${topoEdge.protocol}).`
          : `Observed non-contiguous segment in session "${sessionId}": directly supported by event ${ev.id} on valid route ${topoEdge.id}, but not sequentially continuous with the immediately preceding confirmed destination (${lastConfirmedNodeId}).`;

      const limitations =
        evidenceType === 'observed-isolated-segment'
          ? `Sequential continuity from preceding destination ${lastConfirmedNodeId} to ${ev.sourceNodeId} within session "${sessionId}" is unconfirmed. Synthetic record only.`
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

      // Advance the sequential session cursor to the newly confirmed destination
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
