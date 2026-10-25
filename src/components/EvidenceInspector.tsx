import {
  AlertTriangle,
  FileSearch,
  HelpCircle,
  Link2,
  Server,
  ShieldAlert,
} from 'lucide-react';
import {
  DetectionRule,
  NetworkEdge,
  NetworkNode,
  ScenarioRunResult,
  SelectedEntity,
} from '../domain/types';

interface EvidenceInspectorProps {
  runResult: ScenarioRunResult | null;
  nodes: NetworkNode[];
  topologyEdges: NetworkEdge[];
  rules: DetectionRule[];
  selectedEntity: SelectedEntity;
  onSelectEntity: (entity: SelectedEntity) => void;
}

export function EvidenceInspector({
  runResult,
  nodes,
  topologyEdges,
  rules,
  selectedEntity,
  onSelectEntity,
}: EvidenceInspectorProps) {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const ruleMap = new Map(rules.map((r) => [r.id, r]));
  const topoMap = new Map(topologyEdges.map((e) => [e.id, e]));

  if (!runResult || !selectedEntity) {
    return (
      <section
        id="evidence-inspector"
        aria-labelledby="evidence-inspector-heading"
        className="bg-[#0f1623] border border-slate-800 rounded-lg p-5 space-y-3"
      >
        <h2
          id="evidence-inspector-heading"
          className="text-base font-semibold text-slate-100 flex items-center gap-2"
        >
          <FileSearch className="w-4 h-4 text-sky-400" aria-hidden="true" />
          <span>Shared Evidence &amp; Provenance Inspector</span>
        </h2>
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-md p-6 text-center text-sm text-slate-400">
          {!runResult
            ? 'Workbench is reset. Run a scenario and select an alert, graph edge, gap, node, or event row to inspect its provenance.'
            : 'Select any graph node, reconstructed edge, alert, unresolved gap, or ledger event row to inspect its supporting evidence.'}
        </div>
      </section>
    );
  }

  const allEvents = [
    ...runResult.validation.validEvents,
    ...runResult.validation.deduplicatedEvents,
    ...runResult.validation.rejectedEvents,
  ];
  const eventMap = new Map(allEvents.map((e) => [e.id, e]));

  // Render content depending on selectedEntity.kind
  if (selectedEntity.kind === 'alert') {
    const alert = runResult.alerts.find((a) => a.id === selectedEntity.id);
    if (!alert) {
      return null;
    }
    const rule = ruleMap.get(alert.ruleId);

    return (
      <section
        id="evidence-inspector"
        aria-labelledby="evidence-inspector-heading"
        className="bg-[#0f1623] border border-slate-800 rounded-lg p-5 space-y-4"
      >
        <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <h2
            id="evidence-inspector-heading"
            className="text-base font-semibold text-slate-100 flex items-center gap-2"
          >
            <ShieldAlert className="w-4 h-4 text-rose-400" aria-hidden="true" />
            <span>Evidence Inspector · Alert {alert.id}</span>
          </h2>
          <span className="text-xs font-mono text-slate-400">
            Provenance: {alert.provenance}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="bg-slate-900/90 border border-slate-800 rounded-md p-3 space-y-1">
            <div className="text-slate-400">Fired Detection Rule</div>
            <div className="font-mono font-semibold text-rose-300">
              {alert.ruleId} — {alert.ruleName}
            </div>
            {rule && (
              <div className="font-mono text-slate-400 pt-1">
                Condition: {rule.logicSummary}
              </div>
            )}
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-md p-3 space-y-1">
            <div className="text-slate-400">Supporting Event IDs</div>
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              {alert.supportingEventIds.map((evId) => (
                <button
                  key={evId}
                  type="button"
                  onClick={() => onSelectEntity({ kind: 'event', id: evId })}
                  className="px-2 py-1 font-mono text-xs bg-sky-950/80 hover:bg-sky-900 border border-sky-500/60 text-sky-200 rounded cursor-pointer"
                >
                  Inspect {evId}
                </button>
              ))}
            </div>
            <div className="text-slate-400 pt-1 font-mono">
              Session: {alert.sessionId} · Transition: {alert.sourceNodeId} →{' '}
              {alert.destinationNodeId}
            </div>
          </div>
        </div>

        <div className="space-y-2 text-xs">
          <div className="font-semibold text-slate-200">
            Plain-Language Rule &amp; Provenance Explanation
          </div>
          <p className="text-slate-300 leading-relaxed bg-slate-900/60 border border-slate-800/80 rounded p-3">
            {alert.explanation}
          </p>
        </div>

        <div className="space-y-1.5 text-xs">
          <div className="font-semibold text-amber-300 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Confidence Limitations &amp; Scope Boundary</span>
          </div>
          <p className="text-slate-300 leading-relaxed bg-slate-900/60 border border-slate-800/80 rounded p-3">
            {alert.confidenceLimitations}
          </p>
        </div>
      </section>
    );
  }

  if (selectedEntity.kind === 'edge') {
    const edge = runResult.reconstruction.predictedEdges.find(
      (e) => e.edgeKey === selectedEntity.edgeKey
    );
    if (!edge) {
      return null;
    }
    const topo = edge.topologyEdgeId ? topoMap.get(edge.topologyEdgeId) : null;

    return (
      <section
        id="evidence-inspector"
        aria-labelledby="evidence-inspector-heading"
        className="bg-[#0f1623] border border-slate-800 rounded-lg p-5 space-y-4"
      >
        <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <h2
            id="evidence-inspector-heading"
            className="text-base font-semibold text-slate-100 flex items-center gap-2"
          >
            <Link2 className="w-4 h-4 text-sky-400" aria-hidden="true" />
            <span>Evidence Inspector · Confirmed Edge {edge.edgeKey}</span>
          </h2>
          <span className="text-xs font-mono text-slate-400">
            Provenance: {edge.provenance}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="bg-slate-900/90 border border-slate-800 rounded-md p-3 space-y-1">
            <div className="text-slate-400">Direct Supporting Event IDs</div>
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              {edge.supportingEventIds.map((evId) => (
                <button
                  key={evId}
                  type="button"
                  onClick={() => onSelectEntity({ kind: 'event', id: evId })}
                  className="px-2 py-1 font-mono text-xs bg-sky-950/80 hover:bg-sky-900 border border-sky-500/60 text-sky-200 rounded cursor-pointer"
                >
                  Inspect {evId}
                </button>
              ))}
            </div>
            {edge.priorChainEventIds.length > 0 && (
              <div className="text-slate-400 pt-1.5 font-mono">
                Upstream Chain Events: {edge.priorChainEventIds.join(', ')}
              </div>
            )}
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-md p-3 space-y-1">
            <div className="text-slate-400">Topology &amp; Continuity Rule</div>
            <div className="font-mono font-semibold text-sky-300">
              {topo
                ? `${topo.id} (${topo.protocol})`
                : 'Validated Network Route'}
            </div>
            <div className="font-mono text-slate-400 pt-0.5">
              Evidence Classification: {edge.evidenceType}
            </div>
            <div className="font-mono text-slate-400">
              Sessions: {edge.sessionIds.join(', ')}
            </div>
          </div>
        </div>

        <div className="space-y-1.5 text-xs">
          <div className="font-semibold text-slate-200">
            Edge Reconstruction Justification
          </div>
          <p className="text-slate-300 leading-relaxed bg-slate-900/60 border border-slate-800/80 rounded p-3">
            {edge.explanation}
          </p>
        </div>

        <div className="space-y-1.5 text-xs">
          <div className="font-semibold text-amber-300">
            Confidence Limitations
          </div>
          <p className="text-slate-300 leading-relaxed bg-slate-900/60 border border-slate-800/80 rounded p-3">
            {edge.limitations}
          </p>
        </div>
      </section>
    );
  }

  if (selectedEntity.kind === 'gap') {
    const gap = runResult.reconstruction.unresolvedGaps.find(
      (g) => g.id === selectedEntity.id
    );
    if (!gap) {
      return null;
    }

    return (
      <section
        id="evidence-inspector"
        aria-labelledby="evidence-inspector-heading"
        className="bg-[#0f1623] border border-slate-800 rounded-lg p-5 space-y-4"
      >
        <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <h2
            id="evidence-inspector-heading"
            className="text-base font-semibold text-amber-300 flex items-center gap-2"
          >
            <HelpCircle className="w-4 h-4 text-amber-400" aria-hidden="true" />
            <span>
              Evidence Inspector · Unresolved Gap {gap.id} ({gap.fromNodeId} →{' '}
              {gap.toNodeId})
            </span>
          </h2>
          <span className="text-xs font-mono text-amber-300">
            UNCONFIRMED CONNECTION
          </span>
        </div>

        <div className="bg-amber-950/30 border border-amber-700/70 rounded-md p-3.5 text-xs space-y-2">
          <div className="font-semibold text-amber-200">
            Determination: Insufficient evidence to confirm this connection.
          </div>
          <p className="text-slate-200 leading-relaxed">{gap.message}</p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-slate-400 font-mono">
              Surrounding Event IDs:
            </span>
            {gap.relatedEventIds.map((evId) => (
              <button
                key={evId}
                type="button"
                onClick={() => onSelectEntity({ kind: 'event', id: evId })}
                className="px-2 py-0.5 font-mono text-xs bg-slate-900 border border-amber-500/60 text-amber-200 rounded cursor-pointer"
              >
                Inspect {evId}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5 text-xs">
          <div className="font-semibold text-slate-200">
            Unresolved Analyst Question
          </div>
          <p className="text-slate-300 leading-relaxed bg-slate-900/60 border border-slate-800/80 rounded p-3">
            {gap.unresolvedQuestion}
          </p>
        </div>
      </section>
    );
  }

  if (selectedEntity.kind === 'event') {
    const ev = eventMap.get(selectedEntity.id);
    if (!ev) {
      return null;
    }
    const matchingAlert = runResult.alerts.find((a) =>
      a.supportingEventIds.includes(ev.id)
    );
    const dupIssue = runResult.validation.issues.find(
      (i) => i.eventId === ev.id
    );
    const edgeKey = `${ev.sourceNodeId}->${ev.destinationNodeId}`;
    const matchingEdge = runResult.reconstruction.predictedEdges.find(
      (e) => e.edgeKey === edgeKey && e.supportingEventIds.includes(ev.id)
    );

    return (
      <section
        id="evidence-inspector"
        aria-labelledby="evidence-inspector-heading"
        className="bg-[#0f1623] border border-slate-800 rounded-lg p-5 space-y-4"
      >
        <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <h2
            id="evidence-inspector-heading"
            className="text-base font-semibold text-slate-100 flex items-center gap-2"
          >
            <FileSearch className="w-4 h-4 text-sky-400" aria-hidden="true" />
            <span>Evidence Inspector · Event Record {ev.id}</span>
          </h2>
          <span className="text-xs font-mono text-slate-400">
            Provenance: {ev.provenance}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
          <div className="bg-slate-900/90 border border-slate-800 rounded p-3 space-y-1">
            <div className="text-slate-400 font-sans">Event &amp; Session</div>
            <div className="text-slate-100 font-semibold">{ev.id}</div>
            <div className="text-slate-400">Session: {ev.sessionId}</div>
            <div className="text-slate-400 tabular-nums">{ev.timestamp}</div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded p-3 space-y-1">
            <div className="text-slate-400 font-sans">Observed Transition</div>
            <div className="text-sky-300 font-semibold">
              {ev.sourceNodeId} → {ev.destinationNodeId}
            </div>
            <div className="text-slate-400">Type: {ev.eventType}</div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded p-3 space-y-1">
            <div className="text-slate-400 font-sans">Pipeline Disposition</div>
            {dupIssue ? (
              <div className="text-amber-300 font-semibold">
                Filtered ({dupIssue.kind}): {dupIssue.reason}
              </div>
            ) : matchingAlert ? (
              <div className="text-rose-300 font-semibold">
                Triggered Alert {matchingAlert.id} ({matchingAlert.ruleId})
              </div>
            ) : matchingEdge ? (
              <div className="text-emerald-300 font-semibold">
                Supports Edge {matchingEdge.edgeKey}
              </div>
            ) : (
              <div className="text-amber-300 font-semibold">
                Unconfirmed Transition (Insufficient Evidence / Spoof)
              </div>
            )}
          </div>
        </div>

        <div className="space-y-1.5 text-xs">
          <div className="font-semibold text-slate-200">
            Synthetic Record Description
          </div>
          <p className="text-slate-300 leading-relaxed bg-slate-900/60 border border-slate-800/80 rounded p-3">
            {ev.description}
          </p>
        </div>
      </section>
    );
  }

  // selectedEntity.kind === 'node'
  const node = nodeMap.get(selectedEntity.id);
  if (!node) {
    return null;
  }
  const nodeEvents = runResult.validation.validEvents.filter(
    (e) => e.sourceNodeId === node.id || e.destinationNodeId === node.id
  );
  const nodeAlerts = runResult.alerts.filter(
    (a) => a.sourceNodeId === node.id || a.destinationNodeId === node.id
  );

  return (
    <section
      id="evidence-inspector"
      aria-labelledby="evidence-inspector-heading"
      className="bg-[#0f1623] border border-slate-800 rounded-lg p-5 space-y-4"
    >
      <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
        <h2
          id="evidence-inspector-heading"
          className="text-base font-semibold text-slate-100 flex items-center gap-2"
        >
          <Server className="w-4 h-4 text-sky-400" aria-hidden="true" />
          <span>
            Evidence Inspector · Node {node.label} ({node.id})
          </span>
        </h2>
        <span
          className={`text-xs font-mono font-semibold ${
            node.isDecoy ? 'text-amber-300' : 'text-slate-400'
          }`}
        >
          {node.isDecoy ? 'DESIGNATED DECOY ASSET' : 'ORDINARY NETWORK ASSET'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="bg-slate-900/90 border border-slate-800 rounded p-3 space-y-1 font-mono">
          <div className="text-slate-400 font-sans">Host Metadata</div>
          <div className="text-slate-200">Hostname: {node.hostname}</div>
          <div className="text-slate-200">IP: {node.ipAddress}</div>
          <div className="text-slate-400">Zone: {node.zone}</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded p-3 space-y-1">
          <div className="text-slate-400">Observed Activity in Current Run</div>
          <div className="font-mono text-slate-200">
            Validated Events Touching Node: {nodeEvents.length}
          </div>
          <div className="font-mono text-slate-200">
            Decoy Alerts Touching Node: {nodeAlerts.length}
          </div>
          {nodeEvents.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {nodeEvents.map((ev) => (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => onSelectEntity({ kind: 'event', id: ev.id })}
                  className="px-2 py-0.5 font-mono text-xs bg-slate-800 hover:bg-slate-700 text-sky-300 rounded cursor-pointer"
                >
                  {ev.id}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 border border-slate-800/80 rounded p-3">
        {node.description}
      </p>
    </section>
  );
}
