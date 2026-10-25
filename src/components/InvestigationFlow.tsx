import { Activity, ArrowRight, CheckCircle2, CircleDot, ShieldAlert, Workflow } from 'lucide-react';
import { ScenarioDefinition, ScenarioRunResult } from '../domain/types';

interface InvestigationFlowProps {
  selectedScenario: ScenarioDefinition;
  runResult: ScenarioRunResult | null;
  isReset: boolean;
}

function percent(value: number | null | undefined): string {
  return value == null ? 'N/A' : `${(value * 100).toFixed(0)}%`;
}

export function InvestigationFlow({ selectedScenario, runResult, isReset }: InvestigationFlowProps) {
  const validCount = runResult?.validation.validEvents.length ?? 0;
  const rawCount = selectedScenario.events.length;
  const alertCount = runResult?.alerts.length ?? 0;
  const edgeCount = runResult?.reconstruction.predictedEdges.length ?? 0;
  const gapCount = runResult?.reconstruction.unresolvedGaps.length ?? 0;
  const precision = runResult?.benchmark.lureline.precision;
  const recall = runResult?.benchmark.lureline.recall;

  const steps = [
    { key: 'events', number: '01', title: 'Sample events', value: String(rawCount), unit: 'records', detail: 'Synthetic scenario input', state: isReset ? 'ready' : 'complete', icon: Activity },
    { key: 'validate', number: '02', title: 'Validate', value: isReset ? '—' : String(validCount), unit: 'valid events', detail: isReset ? 'Waiting for a run' : `${runResult?.validation.deduplicatedEvents.length ?? 0} duplicates removed · ${runResult?.validation.rejectedEvents.length ?? 0} rejected`, state: isReset ? 'idle' : 'complete', icon: CheckCircle2 },
    { key: 'detect', number: '03', title: 'Detect decoys', value: isReset ? '—' : String(alertCount), unit: 'alerts', detail: isReset ? 'Rule-based checks' : alertCount ? 'Decoy interaction flagged' : 'No decoy interaction', state: isReset ? 'idle' : alertCount ? 'warning' : 'complete', icon: ShieldAlert },
    { key: 'reconstruct', number: '04', title: 'Reconstruct path', value: isReset ? '—' : String(edgeCount), unit: 'confirmed edges', detail: isReset ? 'Evidence-backed only' : gapCount ? `${gapCount} evidence gap${gapCount === 1 ? '' : 's'} remain` : 'No unresolved gaps', state: isReset ? 'idle' : gapCount ? 'warning' : 'complete', icon: Workflow },
    { key: 'evaluate', number: '05', title: 'Evaluate', value: isReset ? '—' : `${percent(precision)} / ${percent(recall)}`, unit: 'precision / recall', detail: isReset ? 'Metrics appear after run' : 'Compared with scenario ground truth', state: isReset ? 'idle' : 'complete', icon: CircleDot },
  ] as const;

  return (
    <section className="lureline-flow-card" aria-labelledby="flow-heading">
      <div className="lureline-flow-header">
        <div>
          <div className="lureline-section-kicker"><span /> ANALYSIS PIPELINE</div>
          <h2 id="flow-heading">From event to evidence</h2>
          <p>Five transparent steps. Every count below comes from the selected scenario's actual results.</p>
        </div>
        <div className="lureline-flow-tag"><Workflow size={14} aria-hidden="true" /> Deterministic engine</div>
      </div>
      <div className="lureline-flow-steps">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div className="lureline-flow-step-wrap" key={step.key}>
              <article className={`lureline-flow-step flow-${step.state}`} aria-label={`${step.title}: ${step.value} ${step.unit}`}>
                <div className="lureline-flow-step-top">
                  <span className="lureline-flow-number">{step.number}</span>
                  <span className="lureline-flow-icon"><Icon size={17} aria-hidden="true" /></span>
                </div>
                <h3>{step.title}</h3>
                <div className="lureline-flow-value" key={`${step.key}-${step.value}`}>{step.value}</div>
                <div className="lureline-flow-unit">{step.unit}</div>
                <p>{step.detail}</p>
                <div className="lureline-flow-state"><span />{step.state === 'complete' ? 'COMPLETE' : step.state === 'warning' ? 'REVIEW' : step.state === 'ready' ? 'READY' : 'AWAITING RUN'}</div>
              </article>
              {index < steps.length - 1 && <div className="lureline-flow-connector" aria-hidden="true"><ArrowRight size={15} /></div>}
            </div>
          );
        })}
      </div>
      <div className="lureline-flow-footnote">
        <ShieldAlert size={14} aria-hidden="true" />
        Synthetic data only. An unresolved connection stays unconfirmed; the engine never invents a missing hop.
      </div>
    </section>
  );
}
