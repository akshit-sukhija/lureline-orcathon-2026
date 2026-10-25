/**
 * Core Domain Types for Lureline Cyber Deception Investigation Workbench.
 * Pure TypeScript definitions with zero UI or runtime side-effects.
 */

export type NodeRole = 'ordinary' | 'decoy';

export interface NetworkNode {
  id: string;
  label: string;
  hostname: string;
  ipAddress: string;
  zone: string;
  role: NodeRole;
  isDecoy: boolean;
  description: string;
  /** Fixed 2D coordinates on the 800x420 SVG canvas for deterministic layout */
  x: number;
  y: number;
}

export interface NetworkEdge {
  id: string;
  sourceNodeId: string;
  destinationNodeId: string;
  protocol: string;
  description: string;
}

export type SimulatedEventType =
  | 'SSH_SESSION_OPEN'
  | 'SMB_SHARE_MOUNT'
  | 'API_TOKEN_REQUEST'
  | 'DB_QUERY_EXEC'
  | 'CANARY_VAULT_READ'
  | 'HEARTBEAT_SYNC'
  | 'SPOOFED_TELEMETRY';

export interface SimulatedEvent {
  id: string;
  scenarioId: string;
  /** ISO-8601 UTC timestamp string */
  timestamp: string;
  sessionId: string;
  sourceNodeId: string;
  destinationNodeId: string;
  eventType: SimulatedEventType;
  description: string;
  provenance: 'synthetic';
}

export interface DetectionRule {
  id: string;
  name: string;
  severity: 'high' | 'medium' | 'info';
  description: string;
  logicSummary: string;
}

export interface Alert {
  id: string;
  scenarioId: string;
  ruleId: string;
  ruleName: string;
  severity: 'high' | 'medium' | 'info';
  supportingEventIds: string[];
  sessionId: string;
  sourceNodeId: string;
  destinationNodeId: string;
  timestamp: string;
  explanation: string;
  confidenceLimitations: string;
  provenance: 'synthetic';
}

export interface ValidationIssue {
  eventId: string;
  kind: 'duplicate' | 'invalid_field' | 'unknown_node' | 'self_loop';
  reason: string;
  identityKey?: string;
  duplicateOfEventId?: string;
}

export interface ValidationResult {
  validEvents: SimulatedEvent[];
  deduplicatedEvents: SimulatedEvent[];
  rejectedEvents: SimulatedEvent[];
  issues: ValidationIssue[];
  /** Documented stable key formula used for deduplication */
  duplicatePolicyFormula: string;
}

export type EdgeEvidenceType =
  | 'observed-contiguous-chain'
  | 'observed-session-origin'
  | 'observed-isolated-segment'
  | 'naive-unverified-consecutive';

export interface ReconstructedEdge {
  /** Canonical edge key: `${sourceNodeId}->${destinationNodeId}` */
  edgeKey: string;
  sourceNodeId: string;
  destinationNodeId: string;
  sessionIds: string[];
  supportingEventIds: string[];
  priorChainEventIds: string[];
  topologyEdgeId: string | null;
  evidenceType: EdgeEvidenceType;
  explanation: string;
  limitations: string;
  firstSeenTimestamp: string;
  lastSeenTimestamp: string;
  provenance: 'synthetic';
}

export interface UnresolvedGap {
  id: string;
  sessionId: string;
  fromNodeId: string;
  toNodeId: string;
  relatedEventIds: string[];
  kind: 'missing_intermediate_hop' | 'invalid_topology_transition';
  message: string;
  unresolvedQuestion: string;
}

export interface SessionTimelineGroup {
  sessionId: string;
  events: SimulatedEvent[];
  confirmedEdgeKeys: string[];
  unresolvedGaps: UnresolvedGap[];
  hasDecoyInteraction: boolean;
}

export interface ReconstructionResult {
  methodName: 'Lureline Evidence-Backed' | 'Naive Baseline';
  predictedEdges: ReconstructedEdge[];
  predictedEdgeKeys: string[];
  unresolvedGaps: UnresolvedGap[];
  sessionGroups: SessionTimelineGroup[];
}

export interface EdgeClassification {
  edgeKey: string;
  sourceNodeId: string;
  destinationNodeId: string;
  status: 'true_positive' | 'false_positive' | 'false_negative';
  supportingEventIds: string[];
  note: string;
}

export interface MethodMetrics {
  methodName: string;
  truePositives: string[];
  falsePositives: string[];
  falseNegatives: string[];
  tpCount: number;
  fpCount: number;
  fnCount: number;
  /** Number in [0, 1] or null when TP + FP === 0 */
  precision: number | null;
  /** Number in [0, 1] or null when TP + FN === 0 */
  recall: number | null;
  precisionExplanation: string;
  recallExplanation: string;
  classifications: EdgeClassification[];
}

export interface BenchmarkResult {
  scenarioId: string;
  groundTruthEdgeKeys: string[];
  lureline: MethodMetrics;
  naiveBaseline: MethodMetrics;
  comparisonSummary: string;
  syntheticDisclaimer: string;
}

export interface ScenarioDefinition {
  id: string;
  code: 'SCENARIO-A' | 'SCENARIO-B' | 'SCENARIO-C' | 'SCENARIO-D';
  title: string;
  subtitle: string;
  category: string;
  description: string;
  analystObjective: string;
  expectedBehaviorSummary: string;
  /** Raw synthetic events fed into the pipeline */
  events: SimulatedEvent[];
}

/**
 * Ground truth metadata is stored in a separate structure from ScenarioDefinition
 * so that detection and reconstruction functions cannot accidentally read it.
 */
export interface ScenarioGroundTruth {
  scenarioId: string;
  expectedEdgeKeys: string[];
  expectedDecoyAlertEventIds: string[];
  rationale: string;
}

export interface ScenarioRunResult {
  scenario: ScenarioDefinition;
  validation: ValidationResult;
  alerts: Alert[];
  reconstruction: ReconstructionResult;
  baseline: ReconstructionResult;
  benchmark: BenchmarkResult;
  deterministicSummary: {
    headline: string;
    observedFacts: string[];
    confirmedPathSummary: string;
    uncertaintySummary: string;
    benchmarkTakeaway: string;
  };
}

export type SelectedEntity =
  | { kind: 'event'; id: string }
  | { kind: 'alert'; id: string }
  | { kind: 'edge'; edgeKey: string }
  | { kind: 'node'; id: string }
  | { kind: 'gap'; id: string }
  | null;
