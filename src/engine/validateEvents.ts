import {
  NetworkNode,
  SimulatedEvent,
  ValidationIssue,
  ValidationResult,
} from '../domain/types';

export const DUPLICATE_IDENTITY_FORMULA =
  'scenarioId|sessionId|sourceNodeId|destinationNodeId|eventType|timestamp';

/**
 * Computes the documented stable identity key for an event.
 * Never uses fuzzy text matching; uses exact structural fields.
 */
export function computeEventIdentityKey(event: SimulatedEvent): string {
  return [
    event.scenarioId.trim(),
    event.sessionId.trim(),
    event.sourceNodeId.trim(),
    event.destinationNodeId.trim(),
    event.eventType.trim(),
    event.timestamp.trim(),
  ].join('|');
}

/**
 * Deterministic comparator for synthetic events:
 * 1. Primary sort: UTC timestamp ascending
 * 2. Tie-breaker: lexicographical event ID ascending
 */
export function compareEventsDeterministically(
  a: SimulatedEvent,
  b: SimulatedEvent
): number {
  const timeA = Date.parse(a.timestamp);
  const timeB = Date.parse(b.timestamp);
  if (!Number.isNaN(timeA) && !Number.isNaN(timeB) && timeA !== timeB) {
    return timeA - timeB;
  }
  if (a.timestamp !== b.timestamp) {
    return a.timestamp.localeCompare(b.timestamp);
  }
  return a.id.localeCompare(b.id);
}

/**
 * Validates required fields, checks node references against registered network nodes,
 * sorts deterministically, and deduplicates using the documented stable identity key.
 */
export function validateAndDeduplicateEvents(
  rawEvents: readonly SimulatedEvent[],
  nodes: readonly NetworkNode[]
): ValidationResult {
  const nodeIds = new Set(nodes.map((n) => n.id));
  const candidates: SimulatedEvent[] = [];
  const rejectedEvents: SimulatedEvent[] = [];
  const deduplicatedEvents: SimulatedEvent[] = [];
  const issues: ValidationIssue[] = [];

  for (const ev of rawEvents) {
    if (
      !ev ||
      !ev.id?.trim() ||
      !ev.scenarioId?.trim() ||
      !ev.timestamp?.trim() ||
      !ev.sessionId?.trim() ||
      !ev.sourceNodeId?.trim() ||
      !ev.destinationNodeId?.trim() ||
      !ev.eventType?.trim() ||
      ev.provenance !== 'synthetic' ||
      Number.isNaN(Date.parse(ev.timestamp))
    ) {
      rejectedEvents.push(ev);
      issues.push({
        eventId: ev?.id || 'UNKNOWN-ID',
        kind: 'invalid_field',
        reason:
          'Event is missing required fields, has an unparseable ISO timestamp, or lacks synthetic provenance.',
      });
      continue;
    }

    if (!nodeIds.has(ev.sourceNodeId) || !nodeIds.has(ev.destinationNodeId)) {
      rejectedEvents.push(ev);
      issues.push({
        eventId: ev.id,
        kind: 'unknown_node',
        reason: `Event references unregistered node(s): ${ev.sourceNodeId} → ${ev.destinationNodeId}.`,
      });
      continue;
    }

    if (ev.sourceNodeId === ev.destinationNodeId) {
      rejectedEvents.push(ev);
      issues.push({
        eventId: ev.id,
        kind: 'self_loop',
        reason: `Event source and destination are identical (${ev.sourceNodeId}).`,
      });
      continue;
    }

    candidates.push(ev);
  }

  // Sort deterministically by timestamp, then event ID
  const sortedCandidates = [...candidates].sort(compareEventsDeterministically);

  const seenIdentityKeys = new Map<string, string>();
  const validEvents: SimulatedEvent[] = [];

  for (const ev of sortedCandidates) {
    const key = computeEventIdentityKey(ev);
    const existingEventId = seenIdentityKeys.get(key);
    if (existingEventId) {
      deduplicatedEvents.push(ev);
      issues.push({
        eventId: ev.id,
        kind: 'duplicate',
        identityKey: key,
        duplicateOfEventId: existingEventId,
        reason: `Exact duplicate identity key matched earlier canonical event ${existingEventId}.`,
      });
    } else {
      seenIdentityKeys.set(key, ev.id);
      validEvents.push(ev);
    }
  }

  return {
    validEvents,
    deduplicatedEvents,
    rejectedEvents,
    issues,
    duplicatePolicyFormula: DUPLICATE_IDENTITY_FORMULA,
  };
}
