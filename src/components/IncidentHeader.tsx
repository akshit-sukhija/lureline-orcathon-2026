import { Play, RotateCcw, StepForward } from 'lucide-react';
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
  const confirmedEdgesCount =
    runResult?.reconstruction.predictedEdges.length ?? 0;
  const unresolvedGapsCount =
    runResult?.reconstruction.unresolvedGaps.length ?? 0;

  return (
    <div className="border-b border-slate-800 bg-[#0d131f]">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="max-w-[1440px] mx-auto flex items-center justify-between gap-8 px-4 sm:px-6 py-3.5 border-b border-slate-800/80">
        <a
          href="#top"
          className="text-lg font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0"
        >
          Lureline
        </a>

        <nav
          aria-label="Workbench sections"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400"
        >
          <a
            href="#network-topology"
            className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
          >
            Topology &amp; Path
          </a>
          <a
            href="#evidence-inspector"
            className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
          >
            Evidence Inspector
          </a>
          <a
            href="#event-ledger"
            className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
          >
            Event Ledger
          </a>
          <a
            href="#benchmark-comparison"
            className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
          >
            Benchmark Evaluation
          </a>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onRunScenario}
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
          >
            <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
            <span>{isReset ? 'Run Scenario' : 'Rerun Scenario'}</span>
          </button>
        </div>
      </header>

      {/* Scenario Selector & Execution Controls */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-5 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono">
              <span className="text-sky-400 font-semibold">
                {selectedScenario.code}
              </span>
              <span aria-hidden="true">·</span>
              <span>ID: {selectedScenario.id}</span>
              <span aria-hidden="true">·</span>
              <span>{selectedScenario.category}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">
                {isReset
                  ? 'State: Reset (Idle)'
                  : replayStepCount !== null
                  ? `State: Step Replay (${replayStepCount} / ${selectedScenario.events.length} raw events)`
                  : `State: Executed (Run #${runCount})`}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
              {selectedScenario.title}
            </h1>
          </div>

          {/* Interactive Scenario Switcher & Replay/Reset Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <div
              role="group"
              aria-label="Select investigation scenario"
              className="flex flex-wrap items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg"
            >
              {scenarios.map((scen) => {
                const isActive = scen.id === selectedScenario.id;
                return (
                  <button
                    key={scen.id}
                    type="button"
                    onClick={() => onSelectScenario(scen.id)}
                    aria-pressed={isActive}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-sky-400 ${
                      isActive
                        ? 'bg-slate-800 text-sky-300 border border-slate-700'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {scen.code}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={onStepReplay}
              className="px-3.5 py-2 text-xs font-medium text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-sky-400"
              title="Step through raw synthetic events one by one"
            >
              <StepForward className="w-3.5 h-3.5" aria-hidden="true" />
              <span>
                {replayStepCount === null
                  ? 'Step Replay'
                  : `Next Event (${replayStepCount}/${selectedScenario.events.length})`}
              </span>
            </button>

            <button
              type="button"
              onClick={onResetWorkbench}
              disabled={isReset}
              className="px-3.5 py-2 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none border border-slate-700 rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-sky-400"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Reset Workbench</span>
            </button>
          </div>
        </div>

        {/* Scenario Description & Analyst Objective */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-2 border-t border-slate-800/80 text-sm">
          <div className="lg:col-span-7 space-y-1">
            <div className="text-xs font-medium text-slate-400">
              Scenario Context
            </div>
            <p className="text-slate-300 leading-relaxed">
              {selectedScenario.description}
            </p>
          </div>
          <div className="lg:col-span-5 space-y-1">
            <div className="text-xs font-medium text-slate-400">
              Verification Objective
            </div>
            <p className="text-slate-300 leading-relaxed">
              {selectedScenario.analystObjective}
            </p>
          </div>
        </div>

        {/* Canonical KPI Strip (derived strictly from current runResult) */}
        <div
          aria-label="Canonical Scenario Metrics"
          className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2"
        >
          <div className="bg-slate-900/90 border border-slate-800 rounded-md px-4 py-3">
            <div className="text-xs text-slate-400">Validated Events</div>
            <div className="mt-1 text-xl font-bold font-mono tabular-nums text-slate-100">
              {isReset ? '—' : validEventsCount}
            </div>
            <div className="mt-0.5 text-xs text-slate-500 font-mono tabular-nums">
              {isReset
                ? 'Workbench idle'
                : `of ${selectedScenario.events.length} raw records`}
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-md px-4 py-3">
            <div className="text-xs text-slate-400">Duplicates Filtered</div>
            <div className="mt-1 text-xl font-bold font-mono tabular-nums text-slate-100">
              {isReset ? '—' : dupCount}
            </div>
            <div className="mt-0.5 text-xs text-slate-500">
              {isReset ? 'Workbench idle' : 'Stable identity key policy'}
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-md px-4 py-3">
            <div className="text-xs text-slate-400">Decoy Alerts Fired</div>
            <div
              className={`mt-1 text-xl font-bold font-mono tabular-nums ${
                !isReset && alertsCount > 0 ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {isReset ? '—' : alertsCount}
            </div>
            <div className="mt-0.5 text-xs text-slate-500">
              {isReset
                ? 'Workbench idle'
                : alertsCount > 0
                ? 'Decoy destination matched'
                : 'No decoy destination'}
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-md px-4 py-3">
            <div className="text-xs text-slate-400">Confirmed Path Edges</div>
            <div className="mt-1 text-xl font-bold font-mono tabular-nums text-sky-400">
              {isReset ? '—' : confirmedEdgesCount}
            </div>
            <div className="mt-0.5 text-xs text-slate-500">
              {isReset ? 'Workbench idle' : 'Event + topology backed'}
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-md px-4 py-3">
            <div className="text-xs text-slate-400">Unresolved Evidence Gaps</div>
            <div
              className={`mt-1 text-xl font-bold font-mono tabular-nums ${
                !isReset && unresolvedGapsCount > 0
                  ? 'text-amber-400'
                  : 'text-slate-200'
              }`}
            >
              {isReset ? '—' : unresolvedGapsCount}
            </div>
            <div className="mt-0.5 text-xs text-slate-500">
              {isReset
                ? 'Workbench idle'
                : unresolvedGapsCount > 0
                ? 'Unconfirmed transitions'
                : 'No missing links'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
