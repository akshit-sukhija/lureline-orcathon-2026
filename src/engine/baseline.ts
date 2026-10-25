import {
  ReconstructedEdge,
  ReconstructionResult,
  SessionTimelineGroup,
  SimulatedEvent,
} from '../domain/types';

/**
 * Naive Baseline comparator.
 * Intentionally simplistic: connects each event's source→destination and bridges
 * consecutive events within each session after deterministic timestamp sorting,
 * WITHOUT verifying network topology rules or requiring explicit continuity evidence.
 */
export function runNaiveBaseline(
  validEvents: readonly SimulatedEvent[]
): ReconstructionResult {
  const eventsBySession = new Map<string, SimulatedEvent[]>();
  for (const ev of validEvents) {
    const list = eventsBySession.get(ev.sessionId) ?? [];
    list.push(ev);
    eventsBySession.set(ev.sessionId, list);
  }

  const edgeAccumulator = new Map<string, ReconstructedEdge>();
  const sessionGroups: SessionTimelineGroup[] = [];

  const addOrUpdateBaselineEdge = (
    sourceNodeId: string,
    destinationNodeId: string,
    sessionId: string,
    supportingEventIds: string[],
    timestamp: string,
    explanation: string
  ) => {
    const edgeKey = `${sourceNodeId}->${destinationNodeId}`;
    const existing = edgeAccumulator.get(edgeKey);
    if (existing) {
      if (!existing.sessionIds.includes(sessionId)) {
        existing.sessionIds.push(sessionId);
      }
      for (const id of supportingEventIds) {
        if (!existing.supportingEventIds.includes(id)) {
          existing.supportingEventIds.push(id);
        }
      }
      if (timestamp > existing.lastSeenTimestamp) {
        existing.lastSeenTimestamp = timestamp;
      }
    } else {
      edgeAccumulator.set(edgeKey, {
        edgeKey,
        sourceNodeId,
        destinationNodeId,
        sessionIds: [sessionId],
        supportingEventIds: [...supportingEventIds],
        priorChainEventIds: [],
        topologyEdgeId: null,
        evidenceType: 'naive-unverified-consecutive',
        explanation,
        limitations:
          'Naive baseline connects consecutive session events without checking allowed topology or missing telemetry.',
        firstSeenTimestamp: timestamp,
        lastSeenTimestamp: timestamp,
        provenance: 'synthetic',
      });
    }
    return edgeKey;
  };

  for (const [sessionId, sessionEvents] of eventsBySession.entries()) {
    const visitedInSession = new Set<string>();
    const confirmedEdgeKeys: string[] = [];

    for (let i = 0; i < sessionEvents.length; i++) {
      const ev = sessionEvents[i];

      // If this is not the first event in the session and its sourceNodeId was not
      // previously reached in the session, naively bridge from previous event's destinationNodeId
      if (i > 0 && !visitedInSession.has(ev.sourceNodeId)) {
        const prevEv = sessionEvents[i - 1];
        if (prevEv.destinationNodeId !== ev.sourceNodeId) {
          const bridgeKey = addOrUpdateBaselineEdge(
            prevEv.destinationNodeId,
            ev.sourceNodeId,
            sessionId,
            [prevEv.id, ev.id],
            ev.timestamp,
            `Naive baseline consecutive bridge between ${prevEv.id} (${prevEv.destinationNodeId}) and ${ev.id} (${ev.sourceNodeId}) in session "${sessionId}" without direct event evidence.`
          );
          if (!confirmedEdgeKeys.includes(bridgeKey)) {
            confirmedEdgeKeys.push(bridgeKey);
          }
        }
      }

      const directKey = addOrUpdateBaselineEdge(
        ev.sourceNodeId,
        ev.destinationNodeId,
        sessionId,
        [ev.id],
        ev.timestamp,
        `Naive baseline direct edge from event ${ev.id} without topology verification.`
      );
      if (!confirmedEdgeKeys.includes(directKey)) {
        confirmedEdgeKeys.push(directKey);
      }

      visitedInSession.add(ev.sourceNodeId);
      visitedInSession.add(ev.destinationNodeId);
    }

    sessionGroups.push({
      sessionId,
      events: sessionEvents,
      confirmedEdgeKeys,
      unresolvedGaps: [],
      hasDecoyInteraction: false,
    });
  }

  const predictedEdges = Array.from(edgeAccumulator.values());
  const predictedEdgeKeys = predictedEdges.map((e) => e.edgeKey);

  return {
    methodName: 'Naive Baseline',
    predictedEdges,
    predictedEdgeKeys,
    unresolvedGaps: [],
    sessionGroups,
  };
}
