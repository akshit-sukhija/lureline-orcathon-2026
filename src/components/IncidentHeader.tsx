import { Play, RotateCcw, StepForward, Activity, ShieldCheck, Workflow, BookOpen } from 'lucide-react';
import { ScenarioDefinition, ScenarioRunResult } from '../domain/types';

interface IncidentHeaderProps {
  scenarios: ScenarioDefinition[];
  selectedScenario: ScenarioDefinition;
  runResult: ScenarioRunResult | null;
  isReset: boolean;
  runCount: number;
  replayStepCount: number | null;
  onSelectScenario: (scenarioId: string) => void;
  onRunScenario: () => void;
  onStepReplay: () => void;
  onResetWorkbench: () => void;
}

export function IncidentHeader({
  scenarios,
  selectedScenario,
  runResult,
  isReset,
  runCount,
  replayStepCount,
  onSelectScenario,
  onRunScenario,
  onStepReplay,
  onResetWorkbench,
}: IncidentHeaderProps) {
  const validEventsCount = runResult?.validation.validEvents.length ?? 0;
  const dupCount = runResult?.validation.deduplicatedEvents.length ?? 0;
  const alertsCount = runResult?.alerts.length ?? 0;
  const confirmedEdgesCount = runResult?.reconstruction.predictedEdges.length ?? 0;
  const unresolvedGapsCount = runResult?.reconstruction.unresolvedGaps.length ?? 0;

  const navItems = [
    { href: '#network-topology', label: 'Topology', icon: Workflow },
    { href: '#evidence-inspector', label: 'Evidence', icon: ShieldCheck },
    { href: '#event-ledger', label: 'Activity', icon: Activity },
    { href: '#benchmark-comparison', label: 'Evaluation', icon: BookOpen },
  ];

  const metrics = [
    { label: 'Validated events', value: validEventsCount, detail: isReset ? 'Idle until run' : `of ${selectedScenario.events.length} raw records`, tone: 'cyan' },
    { label: 'Duplicates filtered', value: dupCount, detail: isReset ? 'No run yet' : 'Stable identity checks', tone: 'violet' },
    { label: 'Decoy alerts', value: alertsCount, detail: isReset ? 'No run yet' : alertsCount ? 'Decoy destination matched' : 'No decoy destination', tone: alertsCount > 0 && !isReset ? 'rose' : 'mint' },
    { label: 'Confirmed edges', value: confirmedEdgesCount, detail: isReset ? 'No run yet' : 'Event + topology backed', tone: 'cyan' },
    { label: 'Evidence gaps', value: unresolvedGapsCount, detail: isReset ? 'No run yet' : unresolvedGapsCount ? 'Unconfirmed transitions' : 'No missing links', tone: unresolvedGapsCount > 0 && !isReset ? 'amber' : 'mint' },
  ] as const;

  return (
    <div className="lureline-header">
      <header className="lureline-topbar">
        <a href="#top" className="lureline-brand" aria-label="Lureline home">
          <span className="lureline-brand-mark"><Workflow size={20} aria-hidden="true" /></span>
          <span>Lureline<span className="lureline-brand-dot">.</span><small>DECEPTION INTELLIGENCE</small></span>
        </a>
        <nav aria-label="Workbench sections" className="lureline-nav">
          {navItems.map(({ href, label, icon: Icon }) => (
            <a href={href} key={href}><Icon size={15} aria-hidden="true" />{label}</a>
          ))}
        </nav>
        <div className="lureline-top-actions">
          <span className="lureline-live-label"><span /> DEMO WORKSPACE</span>
          <button type="button" onClick={onRunScenario} className="lureline-primary-button">
            <Play size={15} fill="currentColor" aria-hidden="true" />
            {isReset ? 'Run scenario' : 'Run again'}
          </button>
        </div>
      </header>

      <section className="lureline-hero" aria-labelledby="scenario-heading">
        <div className="lureline-hero-copy">
          <div className="lureline-eyebrow"><span>INVESTIGATION WORKSPACE</span><i />{selectedScenario.code}<i />{selectedScenario.category}</div>
          <h1 id="scenario-heading">{selectedScenario.title}</h1>
          <p>{selectedScenario.description}</p>
          <div className="lureline-objective"><ShieldCheck size={16} aria-hidden="true" /><span><strong>Objective</strong>{selectedScenario.analystObjective}</span></div>
        </div>
        <div className="lureline-hero-orb" aria-hidden="true">
          <div className="lureline-orb-ring ring-one" /><div className="lureline-orb-ring ring-two" />
          <div className="lureline-orb-core"><Workflow size={44} strokeWidth={1.2} /></div>
          <span className="lureline-orb-chip chip-top">EVIDENCE FIRST</span><span className="lureline-orb-chip chip-bottom">SYNTHETIC LAB</span>
        </div>
      </section>

      <div className="lureline-controls">
        <div className="lureline-scenario-picker" role="group" aria-label="Select investigation scenario">
          {scenarios.map((scenario) => {
            const active = scenario.id === selectedScenario.id;
            return <button key={scenario.id} type="button" onClick={() => onSelectScenario(scenario.id)} aria-pressed={active} className={active ? 'active' : ''}>
              <span>{scenario.code.replace('SCENARIO-', '')}</span><small>{scenario.category}</small>
            </button>;
          })}
        </div>
        <div className="lureline-control-actions">
          <span className="lureline-run-state">{isReset ? 'READY TO RUN' : replayStepCount !== null ? `REPLAY · ${replayStepCount}/${selectedScenario.events.length}` : `RUN #${runCount} · EXECUTED`}</span>
          <button type="button" onClick={onStepReplay} className="lureline-secondary-button"><StepForward size={15} aria-hidden="true" />{replayStepCount === null ? 'Step replay' : 'Next event'}</button>
          <button type="button" onClick={onResetWorkbench} disabled={isReset} className="lureline-secondary-button"><RotateCcw size={15} aria-hidden="true" />Reset</button>
        </div>
      </div>

      <section className="lureline-metrics" aria-label="Current scenario metrics">
        {metrics.map((metric, index) => (
          <article className={`lureline-metric metric-${metric.tone}`} key={metric.label}>
            <div className="lureline-metric-label"><span className="metric-index">0{index + 1}</span>{metric.label}</div>
            <div className="lureline-metric-value">{isReset ? '—' : metric.value}</div>
            <div className="lureline-metric-detail">{metric.detail}</div>
            <div className="lureline-metric-glow" aria-hidden="true" />
          </article>
        ))}
      </section>
    </div>
  );
}
