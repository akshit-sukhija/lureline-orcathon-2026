/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AlertPanel } from './components/AlertPanel';
import { BenchmarkPanel } from './components/BenchmarkPanel';
import { EventLedger } from './components/EventLedger';
import { EvidenceInspector } from './components/EvidenceInspector';
import { IncidentHeader } from './components/IncidentHeader';
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

  return (
    <div id="top" className="lureline-app min-h-screen bg-[#0b0f17] text-slate-200 flex flex-col">
      {/* Persistent visible simulation notice */}
      <SimulationNotice />

      {/* Top Navigation & Incident Scenario Controls */}
      <IncidentHeader
        scenarios={scenarios}
        selectedScenario={selectedScenario}
        runResult={runResult}
        isReset={isReset}
        runCount={runCount}
        replayStepCount={replayStepCount}
        onSelectScenario={selectScenario}
        onRunScenario={runOrRerunScenario}
        onStepReplay={stepReplayForward}
        onResetWorkbench={resetWorkbench}
      />

      {/* Main Analyst Workbench Viewport */}
      <main className="lureline-main flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Primary Investigation Grid: Network Topology (7 cols) + Alerts & Inspector (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-6">
            <NetworkGraph
              nodes={nodes}
              topologyEdges={topologyEdges}
              runResult={runResult}
              selectedEntity={selectedEntity}
              onSelectEntity={setSelectedEntity}
            />

            <InvestigationSummary runResult={runResult} />
          </div>

          <div className="lg:col-span-5 space-y-6">
            <EvidenceInspector
              runResult={runResult}
              nodes={nodes}
              topologyEdges={topologyEdges}
              rules={rules}
              selectedEntity={selectedEntity}
              onSelectEntity={setSelectedEntity}
            />

            <AlertPanel
              runResult={runResult}
              selectedEntity={selectedEntity}
              onSelectEntity={setSelectedEntity}
            />
          </div>
        </div>

        {/* Full-Width Deterministic Event Ledger */}
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

        {/* Ground-Truth Benchmark & Naive Baseline Comparison */}
        <BenchmarkPanel
          runResult={runResult}
          onSelectEntity={setSelectedEntity}
        />
      </main>

      {/* Restrained Footer */}
      <footer className="lureline-footer border-t border-slate-800/80 bg-[#090d14] px-4 sm:px-6 py-4 text-xs text-slate-400">
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            Lureline · ORCATHON 2026 Cybersecurity &amp; Blockchain Track · Evidence-First Cyber Deception Workbench
          </div>
          <div className="font-mono text-slate-500">
            SIMULATION LAB · Synthetic events only · No live network monitoring
          </div>
        </div>
      </footer>
    </div>
  );
}
