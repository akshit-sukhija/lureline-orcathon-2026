import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DETECTION_RULES,
  NETWORK_NODES,
  NETWORK_TOPOLOGY_EDGES,
  SCENARIOS,
  SCENARIO_GROUND_TRUTH,
} from '../data/scenarios';
import { validateAndDeduplicateEvents } from '../engine/validateEvents';
import { reconstructPaths } from '../engine/reconstruct';
import { computeMethodMetrics } from '../engine/evaluate';
import { executeScenario } from '../engine/runScenario';
import {
  buildInvestigationReportPayload,
  generateDeterministicExplanation,
} from '../engine/explainerAndReport';
import { SimulatedEvent } from '../domain/types';

test('Scenario A — Confirmed decoy interaction flags exact event and rule with full path provenance', () => {
  const scenarioA = SCENARIOS.find((s) => s.code === 'SCENARIO-A');
  assert.ok(scenarioA, 'Scenario A must exist');

  const result = executeScenario(scenarioA);

  // 1. Alert verification
  assert.equal(result.alerts.length, 1, 'Expected exactly 1 decoy alert in Scenario A');
  const alert = result.alerts[0];
  assert.deepEqual(alert.supportingEventIds, ['EVT-A-003']);
  assert.equal(alert.ruleId, 'RULE-DECOY-DEST-01');
  assert.equal(alert.destinationNodeId, 'decoy-db-01');
  assert.equal(alert.provenance, 'synthetic');

  const eventIds = new Set(result.validation.validEvents.map((e) => e.id));
  const ruleIds = new Set(DETECTION_RULES.map((r) => r.id));
  assert.ok(eventIds.has(alert.supportingEventIds[0]));
  assert.ok(ruleIds.has(alert.ruleId));

  // 2. Reconstructed edges verification
  assert.deepEqual(result.reconstruction.predictedEdgeKeys, [
    'workstation-04->jump-host-01',
    'jump-host-01->app-srv-02',
    'app-srv-02->decoy-db-01',
  ]);
  assert.equal(result.reconstruction.unresolvedGaps.length, 0);

  for (const edge of result.reconstruction.predictedEdges) {
    assert.ok(edge.supportingEventIds.length > 0, `Edge ${edge.edgeKey} must cite supporting event IDs`);
    assert.ok(edge.topologyEdgeId !== null, `Edge ${edge.edgeKey} must reference a valid topology link`);
  }

  // 3. Benchmark verification
  assert.equal(result.benchmark.lureline.tpCount, 3);
  assert.equal(result.benchmark.lureline.fpCount, 0);
  assert.equal(result.benchmark.lureline.fnCount, 0);
  assert.equal(result.benchmark.lureline.precision, 1);
  assert.equal(result.benchmark.lureline.recall, 1);
});

test('Scenario B — Normal activity produces zero decoy alerts and reconstructs ordinary paths accurately', () => {
  const scenarioB = SCENARIOS.find((s) => s.code === 'SCENARIO-B');
  assert.ok(scenarioB, 'Scenario B must exist');

  const result = executeScenario(scenarioB);

  assert.equal(result.alerts.length, 0, 'Normal activity must not fire any decoy alert');
  assert.equal(result.reconstruction.unresolvedGaps.length, 0);
  assert.deepEqual(result.reconstruction.predictedEdgeKeys, [
    'workstation-04->jump-host-01',
    'jump-host-01->app-srv-02',
    'workstation-04->fileshare-01',
  ]);
  assert.equal(result.reconstruction.sessionGroups.length, 2, 'Two normal sessions should remain distinct');
  assert.equal(result.benchmark.lureline.precision, 1);
  assert.equal(result.benchmark.lureline.recall, 1);
});

test('Scenario C — Incomplete evidence refuses to fabricate missing hop and reports explicit uncertainty', () => {
  const scenarioC = SCENARIOS.find((s) => s.code === 'SCENARIO-C');
  assert.ok(scenarioC, 'Scenario C must exist');

  const result = executeScenario(scenarioC);

  assert.ok(
    !result.reconstruction.predictedEdgeKeys.includes('jump-host-01->app-srv-02'),
    'Lureline must never fabricate the missing intermediate edge'
  );
  assert.deepEqual(result.reconstruction.predictedEdgeKeys, [
    'workstation-04->jump-host-01',
    'app-srv-02->decoy-cred-vault',
  ]);

  assert.equal(result.reconstruction.unresolvedGaps.length, 1);
  const gap = result.reconstruction.unresolvedGaps[0];
  assert.equal(gap.fromNodeId, 'jump-host-01');
  assert.equal(gap.toNodeId, 'app-srv-02');
  assert.ok(
    gap.message.includes('Insufficient evidence to confirm this connection.'),
    'Gap message must explicitly state "Insufficient evidence to confirm this connection."'
  );

  assert.equal(result.benchmark.lureline.tpCount, 2);
  assert.equal(result.benchmark.lureline.fpCount, 0);
  assert.equal(result.benchmark.lureline.fnCount, 1);
  assert.deepEqual(result.benchmark.lureline.falseNegatives, ['jump-host-01->app-srv-02']);

  assert.equal(result.benchmark.naiveBaseline.tpCount, 3);
  assert.equal(result.benchmark.naiveBaseline.fnCount, 0);
  assert.ok(
    (result.benchmark.naiveBaseline.recall ?? 0) > (result.benchmark.lureline.recall ?? 0),
    'Benchmark honestly reflects when Naive Baseline has higher recall due to consecutive guessing'
  );
});

test('Scenario D — Deduplication, deterministic timestamp+ID ordering, session isolation, continuity gap, and spoof rejection', () => {
  const scenarioD = SCENARIOS.find((s) => s.code === 'SCENARIO-D');
  assert.ok(scenarioD, 'Scenario D must exist');

  const result = executeScenario(scenarioD);

  // 1. Deduplication check
  assert.equal(result.validation.deduplicatedEvents.length, 1);
  assert.equal(result.validation.deduplicatedEvents[0].id, 'EVT-D-003-DUP');

  // 2. Deterministic timestamp + event ID tie-breaker ordering
  const orderedIds = result.validation.validEvents.map((e) => e.id);
  assert.deepEqual(orderedIds, [
    'EVT-D-001',
    'EVT-D-002A',
    'EVT-D-002B',
    'EVT-D-003',
    'EVT-D-SPOOF',
  ]);

  // 3. Session isolation: sess-d-backup-88 must never be linked with sess-d-probe-01 despite identical timestamp
  assert.equal(result.reconstruction.sessionGroups.length, 2);
  const backupSession = result.reconstruction.sessionGroups.find(
    (s) => s.sessionId === 'sess-d-backup-88'
  );
  assert.ok(backupSession);
  assert.deepEqual(backupSession.confirmedEdgeKeys, ['workstation-04->fileshare-01']);

  // 4. Spoofed non-topological edge fileshare-01->decoy-db-01 rejected by Lureline,
  // and non-continuous jump from app-srv-02 (EVT-D-002A destination) back to jump-host-01 (EVT-D-003 source)
  // recorded as an explicit continuity gap rather than falsely treated as contiguous.
  assert.ok(
    !result.reconstruction.predictedEdgeKeys.includes('fileshare-01->decoy-db-01'),
    'Lureline must reject non-topological spoofed edge'
  );
  assert.ok(
    !result.reconstruction.predictedEdgeKeys.includes('app-srv-02->jump-host-01'),
    'Lureline must never invent an unsupported bridge edge between app-srv-02 and jump-host-01'
  );
  assert.equal(result.reconstruction.unresolvedGaps.length, 2);
  assert.equal(result.reconstruction.unresolvedGaps[0].kind, 'missing_intermediate_hop');
  assert.equal(result.reconstruction.unresolvedGaps[0].fromNodeId, 'app-srv-02');
  assert.equal(result.reconstruction.unresolvedGaps[0].toNodeId, 'jump-host-01');
  assert.equal(result.reconstruction.unresolvedGaps[1].kind, 'invalid_topology_transition');

  // 5. Lureline achieves 100% precision (0 FP), while Naive Baseline suffers 2 FPs
  assert.equal(result.benchmark.lureline.tpCount, 4);
  assert.equal(result.benchmark.lureline.fpCount, 0);
  assert.equal(result.benchmark.lureline.precision, 1);

  assert.equal(result.benchmark.naiveBaseline.fpCount, 2);
  assert.ok((result.benchmark.naiveBaseline.precision ?? 1) < 1);
});

test('Regression: Previously visited source or earlier destination node does not falsely prove continuity from immediately preceding confirmed destination', () => {
  // Case A: Node visited only as initial sourceNodeId (workstation-04) is reused after session moved to jump-host-01
  const reusedOriginEvents: SimulatedEvent[] = [
    {
      id: 'REG-001',
      scenarioId: 'reg-test',
      timestamp: '2026-10-25T14:00:00.000Z',
      sessionId: 'sess-reg-1',
      sourceNodeId: 'workstation-04',
      destinationNodeId: 'jump-host-01',
      eventType: 'SSH_SESSION_OPEN',
      description: 'Hop 1: workstation-04 -> jump-host-01',
      provenance: 'synthetic',
    },
    {
      id: 'REG-002',
      scenarioId: 'reg-test',
      timestamp: '2026-10-25T14:00:10.000Z',
      sessionId: 'sess-reg-1',
      sourceNodeId: 'workstation-04',
      destinationNodeId: 'fileshare-01',
      eventType: 'SMB_SHARE_MOUNT',
      description: 'Hop 2: originates from workstation-04 while preceding confirmed destination was jump-host-01',
      provenance: 'synthetic',
    },
  ];

  const reconOrigin = reconstructPaths(
    reusedOriginEvents,
    NETWORK_NODES,
    NETWORK_TOPOLOGY_EDGES
  );

  // Must record an explicit UnresolvedGap from jump-host-01 to workstation-04
  assert.equal(reconOrigin.unresolvedGaps.length, 1);
  assert.equal(reconOrigin.unresolvedGaps[0].fromNodeId, 'jump-host-01');
  assert.equal(reconOrigin.unresolvedGaps[0].toNodeId, 'workstation-04');
  assert.ok(
    reconOrigin.unresolvedGaps[0].message.includes(
      'Insufficient evidence to confirm this connection.'
    )
  );

  // Second edge must be classified as observed-isolated-segment, NOT observed-contiguous-chain
  const secondEdge = reconOrigin.predictedEdges.find(
    (e) => e.edgeKey === 'workstation-04->fileshare-01'
  );
  assert.ok(secondEdge);
  assert.equal(secondEdge.evidenceType, 'observed-isolated-segment');
  assert.deepEqual(secondEdge.priorChainEventIds, []);

  // Must never invent jump-host-01->workstation-04
  assert.ok(!reconOrigin.predictedEdgeKeys.includes('jump-host-01->workstation-04'));
});

test('Zero-denominator handling in evaluation metrics returns null (N/A) safely', () => {
  const emptyReconstruction = reconstructPaths([], NETWORK_NODES, NETWORK_TOPOLOGY_EDGES);

  const metricsNoPred = computeMethodMetrics('Empty Predictor', emptyReconstruction, [
    'workstation-04->jump-host-01',
    'jump-host-01->app-srv-02',
  ]);
  assert.equal(metricsNoPred.precision, null);
  assert.ok(metricsNoPred.precisionExplanation.includes('N/A'));
  assert.equal(metricsNoPred.recall, 0);

  const metricsBothZero = computeMethodMetrics('Zero Both', emptyReconstruction, []);
  assert.equal(metricsBothZero.precision, null);
  assert.equal(metricsBothZero.recall, null);
  assert.ok(metricsBothZero.precisionExplanation.includes('N/A'));
  assert.ok(metricsBothZero.recallExplanation.includes('N/A'));
});

test('Validation rejects malformed fields, unknown nodes, and self-loops deterministically', () => {
  const malformedEvents: SimulatedEvent[] = [
    {
      id: 'BAD-NODE',
      scenarioId: 'test',
      timestamp: '2026-10-25T12:00:00.000Z',
      sessionId: 'sess-1',
      sourceNodeId: 'unknown-host-99',
      destinationNodeId: 'jump-host-01',
      eventType: 'SSH_SESSION_OPEN',
      description: 'Unknown source node',
      provenance: 'synthetic',
    },
    {
      id: 'SELF-LOOP',
      scenarioId: 'test',
      timestamp: '2026-10-25T12:00:01.000Z',
      sessionId: 'sess-1',
      sourceNodeId: 'jump-host-01',
      destinationNodeId: 'jump-host-01',
      eventType: 'SSH_SESSION_OPEN',
      description: 'Self loop node',
      provenance: 'synthetic',
    },
  ];

  const validation = validateAndDeduplicateEvents(malformedEvents, NETWORK_NODES);
  assert.equal(validation.validEvents.length, 0);
  assert.equal(validation.rejectedEvents.length, 2);
  assert.equal(validation.issues.length, 2);
});

test('Download Report payload builder and deterministic explainer produce valid, truthful structures', () => {
  // 1. Null state handled safely
  assert.equal(buildInvestigationReportPayload(null), null);

  // 2. Verify report payload and deterministic explanation across all 4 scenarios
  for (const scenario of SCENARIOS) {
    const runResult = executeScenario(scenario);
    const fixedTime = '2026-10-25T15:00:00.000Z';
    const report = buildInvestigationReportPayload(runResult, fixedTime);
    assert.ok(report);

    // Must be cleanly JSON-serializable and parseable
    const serialized = JSON.stringify(report, null, 2);
    const parsed = JSON.parse(serialized);
    assert.equal(parsed.scenario.id, scenario.id);
    assert.equal(parsed.scenario.code, scenario.code);
    assert.equal(parsed.exportedAt, fixedTime);
    assert.equal(parsed.alerts.length, runResult.alerts.length);
    assert.equal(
      parsed.reconstructedEdges.length,
      runResult.reconstruction.predictedEdges.length
    );
    assert.equal(
      parsed.unresolvedGaps.length,
      runResult.reconstruction.unresolvedGaps.length
    );

    // Verify deterministic explanation references actual computed facts without fabricating
    const explanation = generateDeterministicExplanation(
      runResult,
      'Summarize the evidence and limitations'
    );
    assert.ok(explanation.includes(scenario.code));
    assert.ok(explanation.includes('provenance="synthetic"'));
    for (const alert of runResult.alerts) {
      assert.ok(explanation.includes(alert.id));
      assert.ok(explanation.includes(alert.ruleId));
    }
    for (const edge of runResult.reconstruction.predictedEdges) {
      assert.ok(explanation.includes(edge.edgeKey));
    }
  }
});

test('Deterministic reruns and identical inputs for Lureline and Naive Baseline', () => {
  for (const scenario of SCENARIOS) {
    const run1 = executeScenario(scenario);
    const run2 = executeScenario(scenario);
    assert.deepEqual(run1, run2, `Rerunning ${scenario.code} must produce identical canonical state`);

    const reconEventIds = run1.reconstruction.sessionGroups.flatMap((g) =>
      g.events.map((e) => e.id)
    );
    const baseEventIds = run1.baseline.sessionGroups.flatMap((g) =>
      g.events.map((e) => e.id)
    );
    assert.deepEqual(reconEventIds, baseEventIds);
    assert.ok(SCENARIO_GROUND_TRUTH[scenario.id], 'Ground truth exists in isolated map');
  }
});
