/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useState } from 'react';
import { AlertPanel } from './components/AlertPanel';
import { BenchmarkPanel } from './components/BenchmarkPanel';
import { EventLedger } from './components/EventLedger';
import { EvidenceInspector } from './components/EvidenceInspector';
import { IncidentHeader, type WorkbenchSection } from './components/IncidentHeader';
import { InvestigationFlow } from './components/InvestigationFlow';
import { InvestigationSummary } from './components/InvestigationSummary';
import { NetworkGraph } from './components/NetworkGraph';
import { SimulationNotice } from './components/SimulationNotice';
import { useInvestigation } from './state/useInvestigation';

export default function App() {
  const {
    scenarios,
    nodes,
    topologyEdges,
    rules,
    selectedScenario,
    isReset,
    runCount,
    replayStepCount,
    runResult,
    selectedEntity,
    setSelectedEntity,
    selectScenario,
    runOrRerunScenario,
    resetWorkbench,
    stepReplayForward,
    sessionFilter,
    setSessionFilter,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    sortOrder,
    setSortOrder,
    showDeduplicatedInLedger,
    setShowDeduplicatedInLedger,
  } = useInvestigation();

  const [activeSection, setActiveSection] = useState<WorkbenchSection>('investigation');

  const eventLedger = (
    <EventLedger
      runResult={runResult}
      selectedEntity={selectedEntity}
      onSelectEntity={setSelectedEntity}
      sessionFilter={sessionFilter}
      onChangeSessionFilter={setSessionFilter}
      statusFilter={statusFilter}
      onChangeStatusFilter={setStatusFilter}
      searchQuery={searchQuery}
      onChangeSearchQuery={setSearchQuery}
      sortOrder={sortOrder}
      onChangeSortOrder={setSortOrder}
      showDeduplicated={showDeduplicatedInLedger}
      onToggleShowDeduplicated={setShowDeduplicatedInLedger}
    />
  );

  const networkGraph = (
    <NetworkGraph
      nodes={nodes}
      topologyEdges={topologyEdges}
      runResult={runResult}
      selectedEntity={selectedEntity}
      onSelectEntity={setSelectedEntity}
    />
  );

  const evidenceInspector = (
    <EvidenceInspector
      runResult={runResult}
      nodes={nodes}
      topologyEdges={topologyEdges}
      rules={rules}
      selectedEntity={selectedEntity}
      onSelectEntity={setSelectedEntity}
    />
  );

  return (
    <div id="top" className="lureline-app min-h-screen bg-[#0b0f17] text-slate-200 flex flex-col">
      <SimulationNotice />

      <IncidentHeader
        scenarios={scenarios}
        selectedScenario={selectedScenario}
        runResult={runResult}
        isReset={isReset}
        runCount={runCount}
        replayStepCount={replayStepCount}
        activeSection={activeSection}
        onNavigate={setActiveSection}
        onSelectScenario={selectScenario}
        onRunScenario={runOrRerunScenario}
        onStepReplay={stepReplayForward}
        onResetWorkbench={resetWorkbench}
      />

      <main className="lureline-main flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {activeSection === 'investigation' && (
          <div className="lureline-page-content space-y-5">
            <InvestigationFlow selectedScenario={selectedScenario} runResult={runResult} isReset={isReset} />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              <div className="lg:col-span-8 min-w-0">{networkGraph}</div>
              <div className="lg:col-span-4 min-w-0"><AlertPanel runResult={runResult} selectedEntity={selectedEntity} onSelectEntity={setSelectedEntity} /></div>
            </div>
            {!runResult && (
              <div className="lureline-empty-hint">
                <span className="lureline-empty-icon">01</span>
                <div><strong>Start with a sample investigation</strong><p>Choose Scenario A, then select “Run scenario”. The diagram and metrics update from the scenario results.</p></div>
              </div>
            )}
          </div>
        )}

        {activeSection === 'evidence' && (
          <div className="lureline-page-content space-y-5">
            <div className="lureline-page-heading"><span className="lureline-section-kicker"><span /> EVIDENCE REVIEW</span><h2>Inspect why the result was produced</h2><p>Select a node, edge, alert or event to inspect the exact supporting records and limitations.</p></div>
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
              <div className="xl:col-span-7 min-w-0">{networkGraph}</div>
              <div className="xl:col-span-5 min-w-0">{evidenceInspector}</div>
            </div>
          </div>
        )}

        {activeSection === 'activity' && (
          <div className="lureline-page-content space-y-5">
            <div className="lureline-page-heading"><span className="lureline-section-kicker"><span /> EVENT EXPLORER</span><h2>Activity log</h2><p>Search, sort and filter the selected scenario’s synthetic event records. Selecting a row connects it to the shared evidence inspector state.</p></div>
            {eventLedger}
          </div>
        )}

        {activeSection === 'results' && (
          <div className="lureline-page-content space-y-5">
            <div className="lureline-page-heading"><span className="lureline-section-kicker"><span /> FINDINGS &amp; EVALUATION</span><h2>Results you can explain</h2><p>Review the evidence-backed summary, download the JSON report, optionally request an AI explanation, and compare the methods against the scenario’s synthetic ground truth.</p></div>
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
              <div className="xl:col-span-7 min-w-0"><BenchmarkPanel runResult={runResult} onSelectEntity={setSelectedEntity} /></div>
              <div className="xl:col-span-5 min-w-0"><InvestigationSummary runResult={runResult} /></div>
            </div>
          </div>
        )}
      </main>

      <footer className="lureline-footer border-t border-slate-800/80 bg-[#090d14] px-4 sm:px-6 py-4 text-xs text-slate-400">
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>Lureline · ORCATHON 2026 · Evidence-first cyber deception demo</div>
          <div className="font-mono text-slate-500">SIMULATION LAB · Synthetic events only · No live network monitoring</div>
        </div>
      </footer>
    </div>
  );
}
