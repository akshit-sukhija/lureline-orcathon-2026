import {
  DETECTION_RULES,
  NETWORK_NODES,
  NETWORK_TOPOLOGY_EDGES,
  SCENARIO_GROUND_TRUTH,
} from '../data/scenarios';
import {
  DetectionRule,
  NetworkEdge,
  NetworkNode,
  ScenarioDefinition,
  ScenarioRunResult,
} from '../domain/types';
import { runNaiveBaseline } from './baseline';
import { detectDecoyInteractions } from './detect';
import { evaluateBenchmark } from './evaluate';
import { reconstructPaths } from './reconstruct';
import { validateAndDeduplicateEvents } from './validateEvents';

/**
 * Executes the full deterministic Lureline pipeline for a given scenario.
 * Returns one canonical ScenarioRunResult that drives all UI views, KPIs,
 * alerts, graph edges, ledger rows, and benchmark comparisons.
 */
export function executeScenario(
  scenario: ScenarioDefinition,
  customNodes: readonly NetworkNode[] = NETWORK_NODES,
  customTopology: readonly NetworkEdge[] = NETWORK_TOPOLOGY_EDGES,
  customRules: readonly DetectionRule[] = DETECTION_RULES
): ScenarioRunResult {
  // Step 1: Validate, sort deterministically, and deduplicate
  const validation = validateAndDeduplicateEvents(scenario.events, customNodes);

  // Step 2: Run deterministic decoy detection rules on valid events
  const alerts = detectDecoyInteractions(
    validation.validEvents,
    customNodes,
    customTopology,
    customRules
  );

  // Step 3: Run evidence-backed path reconstruction (no access to ground truth)
  const reconstruction = reconstructPaths(
    validation.validEvents,
    customNodes,
    customTopology
  );

  // Step 4: Run Naive Baseline on the exact same validated event list
  const baseline = runNaiveBaseline(validation.validEvents);

  // Step 5: Evaluate both methods against isolated ground-truth metadata
  const groundTruth = SCENARIO_GROUND_TRUTH[scenario.id]?.expectedEdgeKeys ?? [];
  const benchmark = evaluateBenchmark(
    scenario.id,
    reconstruction,
    baseline,
    groundTruth
  );

  // Step 6: Compute deterministic, plain-language investigation summary (no LLM)
  const rawCount = scenario.events.length;
  const validCount = validation.validEvents.length;
  const dupCount = validation.deduplicatedEvents.length;
  const rejectedCount = validation.rejectedEvents.length;
  const sessionCount = reconstruction.sessionGroups.length;
  const alertCount = alerts.length;
  const edgeCount = reconstruction.predictedEdges.length;
  const gapCount = reconstruction.unresolvedGaps.length;

  const headline =
    alertCount > 0
      ? `${alertCount} synthetic decoy alert${
          alertCount === 1 ? '' : 's'
        } detected across ${sessionCount} session${
          sessionCount === 1 ? '' : 's'
        }; ${edgeCount} evidence-supported path edge${
          edgeCount === 1 ? '' : 's'
        } reconstructed${
          gapCount > 0
            ? ` with ${gapCount} unresolved evidence gap${gapCount === 1 ? '' : 's'}`
            : ''
        }.`
      : `Zero decoy interaction alerts fired across ${validCount} validated synthetic event${
          validCount === 1 ? '' : 's'
        } in ${sessionCount} session${
          sessionCount === 1 ? '' : 's'
        }; ${edgeCount} ordinary path edge${
          edgeCount === 1 ? '' : 's'
        } confirmed.`;

  const observedFacts: string[] = [
    `Ingested ${rawCount} raw synthetic record${
      rawCount === 1 ? '' : 's'
    }: retained ${validCount} valid ordered event${
      validCount === 1 ? '' : 's'
    }, eliminated ${dupCount} exact duplicate${
      dupCount === 1 ? '' : 's'
    }, and rejected ${rejectedCount} malformed/invalid record${
      rejectedCount === 1 ? '' : 's'
    }.`,
    `Isolated activity into ${sessionCount} distinct session${
      sessionCount === 1 ? '' : 's'
    } (${reconstruction.sessionGroups.map((s) => s.sessionId).join(', ') || 'none'}).`,
    alertCount > 0
      ? `Decoy detection flagged ${alerts
          .map((a) => `${a.supportingEventIds.join(', ')} via ${a.ruleId}`)
          .join('; ')}.`
      : 'No event targeted a node configured with isDecoy=true on a valid topology route.',
  ];

  const confirmedPathSummary =
    edgeCount > 0
      ? `Confirmed ${edgeCount} directed edge${
          edgeCount === 1 ? '' : 's'
        } backed by event IDs and topology: ${reconstruction.predictedEdges
          .map((e) => `${e.edgeKey} [${e.supportingEventIds.join(', ')}]`)
          .join('; ')}.`
      : 'No confirmed path edges could be reconstructed from the current event set.';

  const uncertaintySummary =
    gapCount > 0
      ? `${gapCount} connection${
          gapCount === 1 ? ' remains' : 's remain'
        } unconfirmed: ${reconstruction.unresolvedGaps
          .map((g) => `${g.fromNodeId} → ${g.toNodeId} (${g.message})`)
          .join(' ')}`
      : 'All observed session transitions satisfied topology and session continuity checks without missing intermediate hops.';

  const benchmarkTakeaway = benchmark.comparisonSummary;

  return {
    scenario,
    validation,
    alerts,
    reconstruction,
    baseline,
    benchmark,
    deterministicSummary: {
      headline,
      observedFacts,
      confirmedPathSummary,
      uncertaintySummary,
      benchmarkTakeaway,
    },
  };
}
