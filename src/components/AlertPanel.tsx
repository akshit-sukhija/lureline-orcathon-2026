import {
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { ScenarioRunResult, SelectedEntity } from '../domain/types';

interface AlertPanelProps {
  runResult: ScenarioRunResult | null;
  selectedEntity: SelectedEntity;
  onSelectEntity: (entity: SelectedEntity) => void;
}

export function AlertPanel({
  runResult,
  selectedEntity,
  onSelectEntity,
}: AlertPanelProps) {
  if (!runResult) {
    return (
      <section
        aria-labelledby="alerts-heading"
        className="bg-[#0f1623] border border-slate-800 rounded-lg p-5 space-y-3"
      >
        <h2
          id="alerts-heading"
          className="text-base font-semibold text-slate-100 flex items-center gap-2"
        >
          <ShieldAlert className="w-4 h-4 text-slate-400" aria-hidden="true" />
          <span>Decoy Interaction Alerts &amp; Uncertainty Flags</span>
        </h2>
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-md p-6 text-center text-sm text-slate-400">
          Workbench is reset. Run a scenario to evaluate decoy detection rules.
        </div>
      </section>
    );
  }

  const { alerts, reconstruction } = runResult;
  const gaps = reconstruction.unresolvedGaps;

  return (
    <section
      aria-labelledby="alerts-heading"
      className="bg-[#0f1623] border border-slate-800 rounded-lg p-5 space-y-4"
    >
      <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
        <div>
          <h2
            id="alerts-heading"
            className="text-base font-semibold text-slate-100 flex items-center gap-2"
          >
            <ShieldAlert
              className={`w-4 h-4 ${
                alerts.length > 0 ? 'text-rose-400' : 'text-emerald-400'
              }`}
              aria-hidden="true"
            />
            <span>Decoy Interaction Alerts ({alerts.length})</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Deterministic alerts require destinationNode.isDecoy === true on a valid topology route.
          </p>
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="bg-slate-900/80 border border-slate-800 rounded-md p-4 flex items-start gap-3">
          <ShieldCheck
            className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <div className="space-y-1 text-xs">
            <div className="font-semibold text-emerald-300">
              Zero Decoy Interaction Alerts Fired
            </div>
            <p className="text-slate-300 leading-relaxed">
              No validated event in this scenario targeted a designated decoy asset. Ordinary asset activity is not flagged as malicious.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {alerts.map((alert) => {
            const isSelected =
              selectedEntity?.kind === 'alert' && selectedEntity.id === alert.id;
            return (
              <button
                key={alert.id}
                type="button"
                onClick={() => onSelectEntity({ kind: 'alert', id: alert.id })}
                aria-label={`Select alert ${alert.id} triggered by event ${alert.supportingEventIds.join(', ')} and rule ${alert.ruleId}`}
                className={`w-full text-left p-3.5 rounded-md border transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-sky-400 ${
                  isSelected
                    ? 'bg-rose-950/35 border-rose-400/90'
                    : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                  <div className="flex items-center gap-2 text-rose-300 font-semibold">
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>{alert.id}</span>
                    <span aria-hidden="true">·</span>
                    <span>Rule: {alert.ruleId}</span>
                  </div>
                  <span className="text-slate-400 tabular-nums">
                    {alert.timestamp.replace('T', ' ').replace('.000Z', ' UTC')}
                  </span>
                </div>

                <div className="mt-1.5 text-sm font-semibold text-slate-100">
                  {alert.ruleName}: {alert.sourceNodeId} → {alert.destinationNodeId}
                </div>

                <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                  {alert.explanation}
                </p>

                <div className="mt-2 pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-xs font-mono text-slate-400">
                  <span>
                    Supporting Event IDs:{' '}
                    <strong className="text-sky-300">
                      {alert.supportingEventIds.join(', ')}
                    </strong>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>Session: {alert.sessionId}</span>
                  <span aria-hidden="true">·</span>
                  <span>Provenance: {alert.provenance}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Unresolved Evidence Gaps Section */}
      <div className="pt-2 border-t border-slate-800/80 space-y-2.5">
        <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          <AlertTriangle
            className={`w-3.5 h-3.5 ${
              gaps.length > 0 ? 'text-amber-400' : 'text-slate-500'
            }`}
            aria-hidden="true"
          />
          <span>
            Unconfirmed Transitions &amp; Missing Evidence ({gaps.length})
          </span>
        </div>

        {gaps.length === 0 ? (
          <div className="text-xs text-slate-400 flex items-center gap-1.5 py-1">
            <CheckCircle2
              className="w-3.5 h-3.5 text-emerald-400 shrink-0"
              aria-hidden="true"
            />
            <span>
              All session transitions in this run are backed by contiguous events and valid topology.
            </span>
          </div>
        ) : (
          <div className="space-y-2">
            {gaps.map((gap) => {
              const isSelected =
                selectedEntity?.kind === 'gap' && selectedEntity.id === gap.id;
              return (
                <button
                  key={gap.id}
                  type="button"
                  onClick={() => onSelectEntity({ kind: 'gap', id: gap.id })}
                  aria-label={`Select unresolved evidence gap ${gap.id} between ${gap.fromNodeId} and ${gap.toNodeId}`}
                  className={`w-full text-left p-3 rounded-md border transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400 ${
                    isSelected
                      ? 'bg-amber-950/35 border-amber-400'
                      : 'bg-slate-900/90 border-amber-800/60 hover:border-amber-600/80'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs font-mono text-amber-300">
                    <span>
                      {gap.id} · {gap.fromNodeId} → {gap.toNodeId}
                    </span>
                    <span>Session: {gap.sessionId}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-200 leading-relaxed">
                    {gap.message}
                  </p>
                  <div className="mt-1.5 text-xs font-mono text-slate-400">
                    Related Event IDs: {gap.relatedEventIds.join(', ')}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
