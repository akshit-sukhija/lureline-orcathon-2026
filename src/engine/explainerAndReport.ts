import { ScenarioRunResult } from '../domain/types';

export interface InvestigationReportPayload {
  reportVersion: '1.0.0';
  simulationDisclaimer: string;
  exportedAt: string;
  scenario: {
    id: string;
    code: string;
    title: string;
    subtitle: string;
    category: string;
    description: string;
    analystObjective: string;
  };
  summary: {
    headline: string;
    observedFacts: string[];
    confirmedPathSummary: string;
    uncertaintySummary: string;
    benchmarkTakeaway: string;
  };
  validation: {
    duplicatePolicyFormula: string;
    validEventCount: number;
    validEventIds: string[];
    deduplicatedEventCount: number;
    deduplicatedEventIds: string[];
    rejectedEventCount: number;
    rejectedEventIds: string[];
    issues: {
      eventId: string;
      kind: string;
      reason: string;
      duplicateOfEventId?: string;
    }[];
  };
  alerts: {
    id: string;
    ruleId: string;
    ruleName: string;
    severity: string;
    supportingEventIds: string[];
    sessionId: string;
    sourceNodeId: string;
    destinationNodeId: string;
    timestamp: string;
    explanation: string;
    confidenceLimitations: string;
    provenance: 'synthetic';
  }[];
  reconstructedEdges: {
    edgeKey: string;
    sourceNodeId: string;
    destinationNodeId: string;
    topologyEdgeId: string | null;
    supportingEventIds: string[];
    priorChainEventIds: string[];
    sessionIds: string[];
    evidenceType: string;
    explanation: string;
    limitations: string;
    provenance: 'synthetic';
  }[];
  unresolvedGaps: {
    id: string;
    sessionId: string;
    fromNodeId: string;
    toNodeId: string;
    kind: string;
    relatedEventIds: string[];
    message: string;
    unresolvedQuestion: string;
  }[];
  benchmark: {
    syntheticDisclaimer: string;
    groundTruthEdgeKeys: string[];
    comparisonSummary: string;
    lureline: {
      tpCount: number;
      fpCount: number;
      fnCount: number;
      precision: number | null;
      recall: number | null;
      precisionExplanation: string;
      recallExplanation: string;
      truePositives: string[];
      falsePositives: string[];
      falseNegatives: string[];
    };
    naiveBaseline: {
      tpCount: number;
      fpCount: number;
      fnCount: number;
      precision: number | null;
      recall: number | null;
      precisionExplanation: string;
      recallExplanation: string;
      truePositives: string[];
      falsePositives: string[];
      falseNegatives: string[];
    };
  };
}

/**
 * Builds a structured, deterministic JSON report from the active ScenarioRunResult.
 * Returns null safely if runResult is null (e.g. when the workbench is reset).
 */
export function buildInvestigationReportPayload(
  runResult: ScenarioRunResult | null,
  exportedAt: string = new Date().toISOString()
): InvestigationReportPayload | null {
  if (!runResult) {
    return null;
  }

  const {
    scenario,
    validation,
    alerts,
    reconstruction,
    benchmark,
    deterministicSummary,
  } = runResult;

  return {
    reportVersion: '1.0.0',
    simulationDisclaimer:
      'SIMULATION LAB · Synthetic events only · No live network monitoring.',
    exportedAt,
    scenario: {
      id: scenario.id,
      code: scenario.code,
      title: scenario.title,
      subtitle: scenario.subtitle,
      category: scenario.category,
      description: scenario.description,
      analystObjective: scenario.analystObjective,
    },
    summary: {
      headline: deterministicSummary.headline,
      observedFacts: [...deterministicSummary.observedFacts],
      confirmedPathSummary: deterministicSummary.confirmedPathSummary,
      uncertaintySummary: deterministicSummary.uncertaintySummary,
      benchmarkTakeaway: deterministicSummary.benchmarkTakeaway,
    },
    validation: {
      duplicatePolicyFormula: validation.duplicatePolicyFormula,
      validEventCount: validation.validEvents.length,
      validEventIds: validation.validEvents.map((e) => e.id),
      deduplicatedEventCount: validation.deduplicatedEvents.length,
      deduplicatedEventIds: validation.deduplicatedEvents.map((e) => e.id),
      rejectedEventCount: validation.rejectedEvents.length,
      rejectedEventIds: validation.rejectedEvents.map((e) => e.id),
      issues: validation.issues.map((i) => ({
        eventId: i.eventId,
        kind: i.kind,
        reason: i.reason,
        ...(i.duplicateOfEventId
          ? { duplicateOfEventId: i.duplicateOfEventId }
          : {}),
      })),
    },
    alerts: alerts.map((a) => ({
      id: a.id,
      ruleId: a.ruleId,
      ruleName: a.ruleName,
      severity: a.severity,
      supportingEventIds: [...a.supportingEventIds],
      sessionId: a.sessionId,
      sourceNodeId: a.sourceNodeId,
      destinationNodeId: a.destinationNodeId,
      timestamp: a.timestamp,
      explanation: a.explanation,
      confidenceLimitations: a.confidenceLimitations,
      provenance: a.provenance,
    })),
    reconstructedEdges: reconstruction.predictedEdges.map((e) => ({
      edgeKey: e.edgeKey,
      sourceNodeId: e.sourceNodeId,
      destinationNodeId: e.destinationNodeId,
      topologyEdgeId: e.topologyEdgeId,
      supportingEventIds: [...e.supportingEventIds],
      priorChainEventIds: [...e.priorChainEventIds],
      sessionIds: [...e.sessionIds],
      evidenceType: e.evidenceType,
      explanation: e.explanation,
      limitations: e.limitations,
      provenance: e.provenance,
    })),
    unresolvedGaps: reconstruction.unresolvedGaps.map((g) => ({
      id: g.id,
      sessionId: g.sessionId,
      fromNodeId: g.fromNodeId,
      toNodeId: g.toNodeId,
      kind: g.kind,
      relatedEventIds: [...g.relatedEventIds],
      message: g.message,
      unresolvedQuestion: g.unresolvedQuestion,
    })),
    benchmark: {
      syntheticDisclaimer: benchmark.syntheticDisclaimer,
      groundTruthEdgeKeys: [...benchmark.groundTruthEdgeKeys],
      comparisonSummary: benchmark.comparisonSummary,
      lureline: {
        tpCount: benchmark.lureline.tpCount,
        fpCount: benchmark.lureline.fpCount,
        fnCount: benchmark.lureline.fnCount,
        precision: benchmark.lureline.precision,
        recall: benchmark.lureline.recall,
        precisionExplanation: benchmark.lureline.precisionExplanation,
        recallExplanation: benchmark.lureline.recallExplanation,
        truePositives: [...benchmark.lureline.truePositives],
        falsePositives: [...benchmark.lureline.falsePositives],
        falseNegatives: [...benchmark.lureline.falseNegatives],
      },
      naiveBaseline: {
        tpCount: benchmark.naiveBaseline.tpCount,
        fpCount: benchmark.naiveBaseline.fpCount,
        fnCount: benchmark.naiveBaseline.fnCount,
        precision: benchmark.naiveBaseline.precision,
        recall: benchmark.naiveBaseline.recall,
        precisionExplanation: benchmark.naiveBaseline.precisionExplanation,
        recallExplanation: benchmark.naiveBaseline.recallExplanation,
        truePositives: [...benchmark.naiveBaseline.truePositives],
        falsePositives: [...benchmark.naiveBaseline.falsePositives],
        falseNegatives: [...benchmark.naiveBaseline.falseNegatives],
      },
    },
  };
}

/**
 * Generates a deterministic plain-English explanation strictly from the current ScenarioRunResult.
 * Used as a guaranteed fallback if the Gemini API is unconfigured, offline, or returns an error.
 */
export function generateDeterministicExplanation(
  runResult: ScenarioRunResult,
  customQuestion?: string
): string {
  const { scenario, alerts, reconstruction, validation, benchmark } = runResult;

  const alertLines =
    alerts.length === 0
      ? '- No decoy alerts fired: Zero validated events targeted a designated decoy node (`isDecoy === true`) on a permitted topology route.'
      : alerts
          .map(
            (a) =>
              `- Alert ${a.id} (${a.ruleId} — ${a.ruleName}): Fired because supporting event(s) [${a.supportingEventIds.join(
                ', '
              )}] in session "${a.sessionId}" connected from ${a.sourceNodeId} to designated decoy asset ${a.destinationNodeId}.`
          )
          .join('\n');

  const edgeLines =
    reconstruction.predictedEdges.length === 0
      ? '- No network connections were confirmed.'
      : reconstruction.predictedEdges
          .map(
            (e) =>
              `- Confirmed Edge ${e.edgeKey}: Backed by supporting event(s) [${e.supportingEventIds.join(
                ', '
              )}] and topology route ${e.topologyEdgeId ?? 'N/A'} (${
                e.evidenceType
              }).`
          )
          .join('\n');

  const gapLines =
    reconstruction.unresolvedGaps.length === 0
      ? '- Zero unconfirmed transitions: All observed session hops were sequentially continuous and matched permitted network topology.'
      : reconstruction.unresolvedGaps
          .map(
            (g) =>
              `- Unconfirmed Connection ${g.fromNodeId} → ${g.toNodeId} (${g.id}, session "${g.sessionId}"): ${g.message} [Related Events: ${g.relatedEventIds.join(
                ', '
              )}]`
          )
          .join('\n');

  const questionAnswer = customQuestion?.trim()
    ? `\n5. Focused Response to "${customQuestion.trim()}":\n- Based strictly on ${
        scenario.code
      }'s ${validation.validEvents.length} validated synthetic events (${
        validation.deduplicatedEvents.length
      } duplicate(s) removed), Lureline confirmed ${
        reconstruction.predictedEdges.length
      } edge(s) and recorded ${
        reconstruction.unresolvedGaps.length
      } unresolved gap(s). Benchmark Precision: ${
        benchmark.lureline.precision !== null
          ? `${(benchmark.lureline.precision * 100).toFixed(1)}%`
          : 'N/A'
      }, Recall: ${
        benchmark.lureline.recall !== null
          ? `${(benchmark.lureline.recall * 100).toFixed(1)}%`
          : 'N/A'
      }.`
    : '';

  return [
    `[SYNTHETIC DATA EXPLANATION · ${scenario.code}: ${scenario.title}]`,
    '',
    '1. Why Decoy Alerts Fired:',
    alertLines,
    '',
    '2. Connections with Direct Supporting Evidence:',
    edgeLines,
    '',
    '3. Unconfirmed Connections & Missing Evidence:',
    gapLines,
    '',
    '4. Investigation & Synthetic Scope Limitations:',
    `- All ${validation.validEvents.length} validated event records carry provenance="synthetic".`,
    '- Unresolved gaps reduce path certainty; Lureline never fabricates missing intermediate hops or confirms topology-violating spoofs.',
    '- Benchmark metrics evaluate reconstruction against controlled synthetic ground truth and do not represent live network intrusion detection performance.',
    questionAnswer,
  ]
    .filter((line) => line !== undefined)
    .join('\n');
}
