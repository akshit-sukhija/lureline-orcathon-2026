import {
  Activity,
  BookOpen,
  Play,
  RotateCcw,
  ShieldCheck,
  StepForward,
  Workflow,
} from 'lucide-react';
import { ScenarioDefinition, ScenarioRunResult } from '../domain/types';

export type WorkbenchSection = 'investigation' | 'evidence' | 'activity' | 'results';

interface IncidentHeaderProps {
  scenarios: ScenarioDefinition[];
  selectedScenario: ScenarioDefinition;
  runResult: ScenarioRunResult | null;
  isReset: boolean;
  runCount: number;
  replayStepCount: number | null;
  activeSection: WorkbenchSection;
  onNavigate: (section: WorkbenchSection) => void;
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
  activeSection,
  onNavigate,
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
    { id: 'investigation', label: 'Investigate', description: 'Scenario & path', icon: Workflow },
    { id: 'evidence', label: 'Evidence', description: 'Inspect findings', icon: ShieldCheck },
    { id: 'activity', label: 'Activity log', description: 'Raw event records', icon: Activity },
    { id: 'results', label: 'Results', description: 'Report & evaluation', icon: BookOpen },
  ] as const;

  const metrics = [
    { label: 'Validated events', value: isReset ? '—' : String(validEventsCount), detail: isReset ? 'Run a scenario' : `of ${selectedScenario.events.length} records`, tone: 'cyan' },
    { label: 'Duplicates removed', value: isReset ? '—' : String(dupCount), detail: isReset ? 'No run yet' : 'Stable identity checks', tone: 'violet' },
    { label: 'Decoy alerts', value: isReset ? '—' : String(alertsCount), detail: isReset ? 'No run yet' : alertsCount ? 'Interaction detected' : 'No decoy hit', tone: !isReset && alertsCount ? 'rose' : 'mint' },
    { label: 'Confirmed edges', value: isReset ? '—' : String(confirmedEdgesCount), detail: isReset ? 'No run yet' : 'Event + topology backed', tone: 'cyan' },
    { label: 'Evidence gaps', value: isReset ? '—' : String(unresolvedGapsCount), detail: isReset ? 'No run yet' : unresolvedGapsCount ? 'Need more evidence' : 'None found', tone: !isReset && unresolvedGapsCount ? 'amber' : 'mint' },
  ] as const;

  return (
    <div className="lureline-header">
      <header className="lureline-topbar">
        <a href="#top" className="lureline-brand" aria-label="Lureline home" onClick={() => onNavigate('investigation')}>
          <span className="lureline-brand-mark"><Workflow size={20} aria-hidden="true" /></span>
          <span>Lureline<span className="lureline-brand-dot">.</span><small>DECEPTION INTELLIGENCE</small></span>
        </a>
        <nav aria-label="Workbench sections" className="lureline-nav">
          {navItems.map(({ id, label, description, icon: Icon }) => (
            <button
              type="button"
              key={id}
              className={`lureline-nav-item ${activeSection === id ? 'is-active' : ''}`}
              aria-current={activeSection === id ? 'page' : undefined}
              onClick={() => onNavigate(id)}
              title={description}
            >
              <Icon size={15} aria-hidden="true" />{label}
            </button>
          ))}
        </nav>
        <div className="lureline-top-actions">
          <span className="lureline-live-label"><span /> SYNTHETIC LAB</span>
          <button type="button" onClick={onRunScenario} className="lureline-primary-button">
            <Play size={15} fill="currentColor" aria-hidden="true" />
            {isReset ? 'Run scenario' : 'Run again'}
          </button>
        </div>
      </header>

      <section className="lureline-hero" aria-labelledby="scenario-heading">
        <div className="lureline-hero-copy">
          <div className="lureline-eyebrow"><span>INVESTIGATION WORKSPACE</span><i />{selectedScenario.code}<i />{selectedScenario.category}</div>
          <h1 id="scenario-heading">{selectedScenario.title.replace(/^Scenario [A-D]\s*[—-]\s*/, '')}</h1>
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
            return (
              <button key={scenario.id} type="button" onClick={() => onSelectScenario(scenario.id)} aria-pressed={active} className={active ? 'active' : ''}>
                <span>{scenario.code.replace('SCENARIO-', '')}</span><small>{scenario.category}</small>
              </button>
            );
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
            <div className="lureline-metric-value" key={`${metric.label}-${metric.value}-${runCount}`}>{metric.value}</div>
            <div className="lureline-metric-detail">{metric.detail}</div>
            <div className="lureline-metric-glow" aria-hidden="true" />
          </article>
        ))}
      </section>
    </div>
  );
}
